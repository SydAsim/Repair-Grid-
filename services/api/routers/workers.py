from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from ..middleware.auth import AuthenticatedUser, get_current_user, require_roles
from ..db import Database
from agents.schemas.mission_schemas import (
    MissionDetail, 
    MissionStatus, 
    WorkerCompletionPayload, 
    WorkerOutcome
)
from agents.agents.completion_agent import CompletionVerifierAgent
from agents.bedrock_nova import BedrockUnavailable, NovaVisionService
from agents.schemas.mission_schemas import RiskBand

router = APIRouter(prefix="/workers", tags=["Workers"])
missions_router = APIRouter(prefix="/missions", tags=["Worker Missions"])

class WorkerStatusUpdate(BaseModel):
    availability: str = Field(pattern="^(AVAILABLE|ASSIGNED|OFF_SHIFT)$")

class WorkerLocationUpdate(BaseModel):
    lat: float
    lng: float

def _to_mission_detail(m: Dict[str, Any]) -> MissionDetail:
    report_ids = m.get("reportIds", [])
    if not report_ids and m.get("reportId"):
        report_ids = [m.get("reportId")]
    
    # If photo or description missing on mission, backfill from linked report
    photo = m.get("photoEvidence")
    desc = m.get("description")
    loc = m.get("location")
    coords = m.get("coordinates")
    if not photo or not desc or not loc:
        if report_ids:
            rep = Database.get_report(report_ids[0])
            if rep:
                photo = photo or (rep.get("evidenceRefs", [None])[0] if rep.get("evidenceRefs") else None)
                desc = desc or rep.get("description")
                loc = loc or rep.get("locationName")
                if not coords and "lat" in rep and "lng" in rep:
                    coords = {"lat": rep["lat"], "lng": rep["lng"]}

    return MissionDetail(
        mission_id=m["missionId"],
        organization_id=m.get("organizationId", "campus-district-01"),
        report_ids=report_ids,
        category=m.get("category", "streetlights"),
        title=m.get("title", f"Repair {m.get('category', 'Issue')}"),
        priority=m.get("priority", m.get("riskScore", 50)),
        risk_band=m.get("riskBand", m.get("riskLevel", "MEDIUM")),
        required_skill=m.get("requiredSkill", "street_lighting"),
        department=m.get("department", "electrical"),
        assigned_worker_id=m.get("assignedWorkerId") or m.get("assignedTechnicianId"),
        assigned_worker_name=m.get("assignedTechnicianName") or m.get("assignedWorkerName"),
        match_score=m.get("matchScore"),
        match_factors=m.get("matchFactors"),
        notification_status=m.get("notificationStatus"),
        technician_response=m.get("technicianResponse"),
        status=m.get("status", "AWAITING_ACCEPTANCE"),
        sla_due_at=m.get("slaDueAt", "2026-09-10T18:00:00Z"),
        requires_human_approval=m.get("requiresHumanApproval", False),
        location=loc,
        coordinates=coords,
        description=desc,
        photo_evidence=photo,
        risk_score=m.get("riskScore", m.get("priority", 50)),
        proof_of_repair=m.get("proofOfRepair"),
        verification_result=m.get("verificationResult"),
        community_confirmation=m.get("communityConfirmation"),
        execution_trace=m.get("executionTrace"),
        version=m.get("version", 1),
        created_at=m.get("createdAt", Database.now_iso()),
        updated_at=m.get("updatedAt", Database.now_iso())
    )

@router.get("/me")
def get_my_profile(current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))):
    workers = Database.list_workers()
    worker = next(
        (w for w in workers if w.get("userId") == current_user.user_id or w.get("workerId") == current_user.user_id or w.get("email") == current_user.email),
        None,
    )

    # Operators can inspect the demo technician experience, but a technician
    # session must always resolve to its own worker record.
    if not worker and any(role in current_user.roles for role in ["operator", "admin"]):
        worker = workers[0] if workers else None
    if not worker and "field_worker" in current_user.roles:
        worker = {
            "workerId": current_user.user_id,
            "userId": current_user.user_id,
            "displayName": current_user.email.split("@")[0].replace(".", " ").title(),
            "email": current_user.email,
            "department": "electrical",
            "skills": ["electrical", "street_lighting", "drainage", "surface_repair", "general_facilities"],
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7750,
            "lastLng": -122.4192,
        }
        Database.save_worker(worker)
    if not worker:
        raise HTTPException(status_code=404, detail="No technician profile is linked to this account")
    return worker


@router.get("/me/notifications")
def get_my_notifications(
    unread_only: bool = Query(False),
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"])),
):
    worker = get_my_profile(current_user)
    return Database.list_notifications(
        recipient_user_id=current_user.user_id,
        recipient_worker_id=worker.get("workerId"),
        unread_only=unread_only,
    )


@router.post("/me/notifications/{notification_id}/read")
def read_my_notification(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"])),
):
    worker = get_my_profile(current_user)
    allowed = {
        item["notificationId"]
        for item in Database.list_notifications(
            recipient_user_id=current_user.user_id,
            recipient_worker_id=worker.get("workerId"),
        )
    }
    if notification_id not in allowed:
        raise HTTPException(status_code=404, detail="Notification not found")
    return Database.mark_notification_read(notification_id)

@router.patch("/me/status")
def update_my_status(
    status_update: WorkerStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    worker = get_my_profile(current_user)
    worker["availability"] = status_update.availability
    Database.save_worker(worker)
    return {"status": "updated", "availability": worker["availability"]}

@router.post("/me/location")
def update_my_location(
    loc: WorkerLocationUpdate,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker"]))
):
    worker = get_my_profile(current_user)
    worker["lastLat"] = loc.lat
    worker["lastLng"] = loc.lng
    worker["lastLocationAt"] = Database.now_iso()
    Database.save_worker(worker)
    return {"status": "location_recorded"}

@missions_router.get("", response_model=List[MissionDetail])
def list_all_missions(
    status: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    missions = Database.list_missions(limit=100)
    if status:
        missions = [m for m in missions if m.get("status") == status]
    return [_to_mission_detail(m) for m in missions]

@missions_router.get("/assigned", response_model=List[MissionDetail])
def get_assigned_missions(current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))):
    missions = Database.list_missions(limit=100)
    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    
    # Missions directly assigned to this technician OR incoming missions awaiting acceptance
    assigned = []
    seen = set()
    for m in missions:
        m_id = m.get("missionId")
        if not m_id or m_id in seen:
            continue
        is_mine = (m.get("assignedWorkerId") == worker_id or m.get("assignedTechnicianId") == worker_id)
        is_open_pool = (m.get("status") in ["AWAITING_ACCEPTANCE", "MISSION_CREATED"])
        if is_mine or is_open_pool:
            assigned.append(m)
            seen.add(m_id)

    assigned.sort(key=lambda m: (m.get("status") == "AWAITING_ACCEPTANCE", m.get("createdAt", "")), reverse=True)
    return [_to_mission_detail(m) for m in assigned]


def _assert_worker_can_act(mission: Dict[str, Any], current_user: AuthenticatedUser, worker_id: str) -> None:
    if any(role in current_user.roles for role in ["operator", "admin"]):
        return
    assigned_worker_id = mission.get("assignedWorkerId") or mission.get("assignedTechnicianId")
    if assigned_worker_id and assigned_worker_id != worker_id and mission.get("status") not in ["AWAITING_ACCEPTANCE", "MISSION_CREATED"]:
        raise HTTPException(status_code=403, detail="This mission is assigned to another technician")

@missions_router.get("/{mission_id}", response_model=MissionDetail)
def get_mission_by_id(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    m = Database.get_mission(mission_id)
    if not m:
        # Check if it was passed as a reportId
        reports = Database.list_reports(limit=50)
        rep = next((r for r in reports if r.get("reportId") == mission_id), None)
        if rep and rep.get("missionId"):
            m = Database.get_mission(rep["missionId"])
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return _to_mission_detail(m)

@missions_router.post("/{mission_id}/accept")
def accept_mission(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    worker_name = worker.get("displayName", "Ahmed Khan")
    _assert_worker_can_act(m, current_user, worker_id)

    m["status"] = MissionStatus.ACCEPTED.value
    m["technicianResponse"] = "ACCEPTED"
    m["assignedWorkerId"] = worker_id
    m["assignedTechnicianId"] = worker_id
    m["assignedTechnicianName"] = worker_name
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)
    Database.mark_mission_notifications_actioned(mission_id, worker_id)

    # Sync linked report
    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = MissionStatus.ACCEPTED.value
                Database.save_report(rep)

    Database.record_event(
        mission_id=mission_id,
        event_type="TECHNICIAN_ACCEPTED",
        actor_type="WORKER",
        actor_id=worker_id,
        payload={
            "technicianId": worker_id,
            "displayName": worker_name,
            "status": "ACCEPTED",
            "message": f"{worker_name} accepted the mission assignment"
        }
    )
    return {"status": "ACCEPTED", "missionId": mission_id, "mission": _to_mission_detail(m)}

@missions_router.post("/{mission_id}/simulate-accept")
def simulate_accept_mission(mission_id: str):
    m = Database.get_mission(mission_id)
    if not m:
        reports = Database.list_reports(limit=100)
        rep = next((r for r in reports if r.get("reportId") == mission_id), None)
        if rep and rep.get("missionId"):
            m = Database.get_mission(rep["missionId"])
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker_id = m.get("assignedWorkerId") or m.get("assignedTechnicianId") or "wkr_ahmed"
    worker = Database.get_worker(worker_id)
    worker_name = worker.get("displayName", "Ahmed Khan") if worker else "Ahmed Khan"

    m["status"] = MissionStatus.ACCEPTED.value
    m["technicianResponse"] = "ACCEPTED"
    m["assignedWorkerId"] = worker_id
    m["assignedTechnicianId"] = worker_id
    m["assignedTechnicianName"] = worker_name
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    # Sync linked report
    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = MissionStatus.ACCEPTED.value
                Database.save_report(rep)

    Database.record_event(
        mission_id=m["missionId"],
        event_type="TECHNICIAN_ACCEPTED",
        actor_type="WORKER",
        actor_id=worker_id,
        payload={
            "technicianId": worker_id,
            "displayName": worker_name,
            "status": "ACCEPTED",
            "message": f"{worker_name} accepted the mission assignment (Dispatched)"
        }
    )
    return {"status": "ACCEPTED", "missionId": m["missionId"], "mission": _to_mission_detail(m)}

@missions_router.post("/{mission_id}/reject")
def reject_mission(
    mission_id: str,
    reason: Optional[str] = Query("Shift conflict or distance"),
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    worker_name = worker.get("displayName", "Ahmed Khan")
    _assert_worker_can_act(m, current_user, worker_id)

    m["status"] = MissionStatus.TECHNICIAN_REJECTED.value
    m["technicianResponse"] = "REJECTED"
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    Database.record_event(
        mission_id=mission_id,
        event_type="TECHNICIAN_REJECTED",
        actor_type="WORKER",
        actor_id=worker_id,
        payload={
            "technicianId": worker_id,
            "displayName": worker_name,
            "status": "REJECTED",
            "reason": reason
        }
    )
    return {"status": "REJECTED", "missionId": mission_id}

@missions_router.post("/{mission_id}/en-route")
def set_mission_en_route(
    mission_id: str,
    eta_minutes: int = Query(12),
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    _assert_worker_can_act(m, current_user, worker.get("workerId"))
    m["status"] = MissionStatus.EN_ROUTE.value
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = MissionStatus.EN_ROUTE.value
                Database.save_report(rep)

    Database.record_event(
        mission_id=mission_id,
        event_type="TECHNICIAN_EN_ROUTE",
        actor_type="WORKER",
        actor_id=worker.get("workerId", "wkr_ahmed"),
        payload={
            "status": "EN_ROUTE",
            "etaMinutes": eta_minutes,
            "technicianName": worker.get("displayName", "Ahmed Khan"),
            "notes": f"{worker.get('displayName', 'Ahmed Khan')} is en route to site (ETA {eta_minutes} mins)"
        }
    )
    return {"status": "EN_ROUTE", "missionId": mission_id}

@missions_router.post("/{mission_id}/on-site")
def set_mission_on_site(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    _assert_worker_can_act(m, current_user, worker.get("workerId"))
    m["status"] = MissionStatus.ON_SITE.value
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = MissionStatus.ON_SITE.value
                Database.save_report(rep)

    Database.record_event(
        mission_id=mission_id,
        event_type="TECHNICIAN_ARRIVED",
        actor_type="WORKER",
        actor_id=worker.get("workerId", "wkr_ahmed"),
        payload={
            "status": "ON_SITE",
            "technicianName": worker.get("displayName", "Ahmed Khan"),
            "notes": "Arrival verified in incident perimeter zone"
        }
    )
    return {"status": "ON_SITE", "missionId": mission_id}

@missions_router.post("/{mission_id}/start")
def start_mission(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    _assert_worker_can_act(m, current_user, worker.get("workerId"))
    m["status"] = MissionStatus.REPAIR_IN_PROGRESS.value
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = MissionStatus.REPAIR_IN_PROGRESS.value
                Database.save_report(rep)

    Database.record_event(
        mission_id=mission_id,
        event_type="REPAIR_STARTED",
        actor_type="WORKER",
        actor_id=worker.get("workerId", "wkr_ahmed"),
        payload={"status": "REPAIR_IN_PROGRESS", "notes": "Technician began active repair operations"}
    )
    return {"status": "REPAIR_IN_PROGRESS", "missionId": mission_id}

@missions_router.post("/{mission_id}/completion")
def submit_mission_completion(
    mission_id: str,
    payload: WorkerCompletionPayload,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    worker_name = worker.get("displayName", "Ahmed Khan")
    _assert_worker_can_act(m, current_user, worker_id)

    # Store proof of repair
    before_photo = m.get("photoEvidence")
    if not before_photo and m.get("reportIds"):
        rep = Database.get_report(m["reportIds"][0])
        if rep and rep.get("evidenceRefs"):
            before_photo = rep["evidenceRefs"][0]

    proof = {
        "beforePhoto": before_photo,
        "afterPhoto": payload.after_photo_ref,
        "outcome": payload.outcome.value,
        "notes": payload.notes,
        "materialsUsed": payload.materials_used or [],
        "technicianId": worker_id,
        "technicianName": worker_name,
        "submittedAt": Database.now_iso()
    }

    m["status"] = MissionStatus.PROOF_SUBMITTED.value
    m["proofOfRepair"] = proof
    m["completionPayload"] = payload.model_dump()
    m["version"] = m.get("version", 1) + 1

    Database.record_event(
        mission_id=mission_id,
        event_type="PROOF_SUBMITTED",
        actor_type="WORKER",
        actor_id=worker_id,
        payload=proof
    )

    # Autonomous AI Verification with Nova Vision / CompletionVerifierAgent
    try:
        category = m.get("category", "streetlights")
        risk_band = RiskBand(m.get("riskBand", "LOW"))
        if NovaVisionService.enabled():
            nova = NovaVisionService.compare_repair(
                before_reference=before_photo or "",
                after_reference=payload.after_photo_ref,
                category=category,
            )
            confidence = max(0.0, min(1.0, float(nova.get("confidence", 0.0))))
            improved = bool(nova.get("conditionImproved", False))
            same_asset = bool(nova.get("sameAsset", False))
            if improved and same_asset and confidence >= 0.90 and risk_band != RiskBand.CRITICAL:
                recommendation = "CLOSE"
            elif not improved or not same_asset:
                recommendation = "REPLAN_REOPEN"
            else:
                recommendation = "OPERATOR_REVIEW"
            verification_result = {
                "conditionImproved": improved,
                "confidence": confidence,
                "recommendation": recommendation,
                "explanation": nova.get("summary", "Amazon Nova compared the submitted evidence."),
                "sameLocation": True,
                "sameAsset": same_asset,
                "evidenceQuality": nova.get("evidenceQuality", 0.0),
                "verificationMode": "AMAZON_BEDROCK",
                "modelId": nova.get("modelId"),
                "verifiedAt": Database.now_iso(),
            }
        else:
            v = CompletionVerifierAgent.verify(
                category=category,
                outcome=payload.outcome,
                notes=payload.notes,
                before_photo_ref=before_photo or "evidence/before.jpg",
                after_photo_ref=payload.after_photo_ref,
                worker_lat=m.get("lat", 37.7751),
                mission_lat=m.get("lat", 37.7751),
                risk_band=risk_band
            )
            verification_result = {
                "conditionImproved": v.condition_improved,
                "confidence": v.confidence,
                "recommendation": v.recommendation,
                "explanation": v.explanation,
                "sameLocation": v.same_location,
                "sameAsset": v.same_asset,
                "evidenceQuality": v.evidence_quality,
                "verificationMode": "POLICY_SIMULATION",
                "verifiedAt": Database.now_iso(),
            }
        m["verificationResult"] = verification_result

        if verification_result["recommendation"] == "CLOSE":
            m["status"] = MissionStatus.VERIFIED.value
            m["verificationStatus"] = "VERIFIED"
            Database.record_event(
                mission_id=mission_id,
                event_type="AI_VERIFICATION_PASSED" if verification_result["verificationMode"] == "AMAZON_BEDROCK" else "LOCAL_POLICY_VERIFICATION_PASSED",
                actor_type="AGENT",
                actor_id="NovaVisionAgent" if verification_result["verificationMode"] == "AMAZON_BEDROCK" else "LocalVerificationPolicy",
                payload=verification_result
            )
        else:
            m["verificationStatus"] = "OPERATOR_REVIEW"
    except (BedrockUnavailable, Exception) as e:
        # Verification failures must fail safe. A technician submission is never
        # silently promoted to a verified repair.
        m["verificationStatus"] = "OPERATOR_REVIEW"
        m["verificationResult"] = {
            "conditionImproved": False,
            "confidence": 0.0,
            "recommendation": "OPERATOR_REVIEW",
            "explanation": f"Automated verification was unavailable: {str(e)}"
        }
        Database.record_event(
            mission_id=mission_id,
            event_type="AI_VERIFICATION_UNAVAILABLE",
            actor_type="SYSTEM",
            actor_id="VerificationService",
            payload={"recommendation": "OPERATOR_REVIEW", "reason": str(e)},
        )

    Database.save_mission(m)

    # Sync linked reports
    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = m["status"]
                Database.save_report(rep)

    return {"status": m["status"], "missionId": mission_id, "verification": m.get("verificationResult")}
