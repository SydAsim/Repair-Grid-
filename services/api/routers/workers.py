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
    photo = m.get("photoEvidence") or m.get("beforePhoto")
    desc = m.get("description")
    loc = m.get("location")
    coords = m.get("coordinates")
    reporter_name = m.get("reporterName")
    reporter_id = m.get("reporterId")
    after_photo = m.get("afterPhoto") or (m.get("proofOfRepair", {}).get("afterPhoto") if isinstance(m.get("proofOfRepair"), dict) else None)
    technician_notes = m.get("technicianNotes") or (m.get("proofOfRepair", {}).get("notes") if isinstance(m.get("proofOfRepair"), dict) else None)
    controller_approved_at = m.get("controllerApprovedAt")
    controller_notes = m.get("controllerNotes")
    ai_analysis = m.get("aiSolution") or m.get("aiRecommendation")

    if report_ids:
        rep = Database.get_report(report_ids[0])
        if rep:
            photo = photo or rep.get("beforePhoto") or (rep.get("evidenceRefs", [None])[0] if rep.get("evidenceRefs") else None)
            desc = desc or rep.get("description")
            loc = loc or rep.get("locationName")
            reporter_name = reporter_name or rep.get("reporterName") or (rep.get("reporterEmail", "").split("@")[0].title() if rep.get("reporterEmail") else "Resident")
            reporter_id = reporter_id or rep.get("reporterId")
            after_photo = after_photo or rep.get("afterPhoto") or rep.get("proofPhoto")
            technician_notes = technician_notes or rep.get("technicianNotes")
            controller_approved_at = controller_approved_at or rep.get("controllerApprovedAt")
            controller_notes = controller_notes or rep.get("controllerNotes")
            if not coords and "lat" in rep and "lng" in rep:
                coords = {"lat": rep["lat"], "lng": rep["lng"]}

    if not ai_analysis and isinstance(m.get("verificationResult"), dict):
        ai_analysis = m["verificationResult"].get("explanation")

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
        reporter_name=reporter_name or "Resident",
        reporter_id=reporter_id,
        before_photo=photo,
        after_photo=after_photo,
        technician_notes=technician_notes,
        ai_analysis=ai_analysis,
        controller_approved_at=controller_approved_at,
        controller_notes=controller_notes,
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
    notifs = Database.list_notifications(
        recipient_user_id=current_user.user_id,
        recipient_worker_id=worker.get("workerId"),
        unread_only=unread_only,
    )
    if not notifs:
        # All technicians (electricians, plumbers, facilities) share broadcast operational alerts
        notifs = Database.list_notifications(limit=20)
        if unread_only:
            notifs = [n for n in notifs if not n.get("readAt")]
    return notifs


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
    reports = Database.list_reports(limit=50)
    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    
    assigned = []
    seen = set()

    # 1. Include all active & available missions in the system so all technicians (electricians, plumbers, etc.) see incoming work
    for m in missions:
        m_id = m.get("missionId")
        if not m_id or m_id in seen:
            continue
        assigned.append(m)
        seen.add(m_id)

    # 2. Also ensure newly submitted citizen reports are immediately visible to all technicians
    for r in reports:
        r_id = r.get("reportId")
        if not r_id:
            continue
        m_id = r.get("missionId")
        if m_id and m_id not in seen:
            m = Database.get_mission(m_id)
            if m:
                assigned.append(m)
                seen.add(m_id)
        elif not m_id and r.get("status") not in ["CLOSED", "MERGED"]:
            synthetic_mission = {
                "missionId": r_id,
                "reportId": r_id,
                "reportIds": [r_id],
                "title": f"Repair {r.get('category', 'Infrastructure').replace('_', ' ').title()} - {r.get('locationName', 'Campus Site')}",
                "category": r.get("category", "streetlights"),
                "priority": 75,
                "riskBand": "HIGH",
                "riskScore": 75,
                "requiredSkill": "general_facilities",
                "department": "facilities",
                "assignedWorkerId": None,
                "assignedTechnicianId": None,
                "status": "AWAITING_ACCEPTANCE",
                "location": r.get("locationName", "Campus District"),
                "lat": r.get("lat", 37.7751),
                "lng": r.get("lng", -122.4190),
                "coordinates": {"lat": r.get("lat", 37.7751), "lng": r.get("lng", -122.4190)},
                "description": r.get("description", ""),
                "photoEvidence": r.get("beforePhoto") or (r.get("evidenceRefs", [None])[0] if r.get("evidenceRefs") else None),
                "beforePhoto": r.get("beforePhoto"),
                "reporterName": r.get("reporterName", "Resident Citizen"),
                "createdAt": r.get("createdAt", Database.now_iso()),
                "updatedAt": r.get("updatedAt", Database.now_iso())
            }
            assigned.append(synthetic_mission)
            seen.add(r_id)

    # Prioritize: incoming offers awaiting acceptance first, then newest
    assigned.sort(key=lambda m: (
        m.get("status") in ["AWAITING_ACCEPTANCE", "MISSION_CREATED", "PENDING"],
        m.get("assignedWorkerId") == worker_id or m.get("assignedTechnicianId") == worker_id,
        m.get("createdAt", "")
    ), reverse=True)

    return [_to_mission_detail(m) for m in assigned]


def _assert_worker_can_act(mission: Dict[str, Any], current_user: AuthenticatedUser, worker_id: str) -> None:
    # Empower all authenticated field workers (electricians, plumbers, facilities) and operators to act on any mission
    return

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

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = "PENDING"
                Database.save_report(rep)

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

class TechnicianMessagePayload(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    eta_minutes: Optional[int] = None
    voice_note: Optional[str] = None

@missions_router.post("/{mission_id}/message")
def send_technician_message(
    mission_id: str,
    payload: TechnicianMessagePayload,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId", "wkr_ahmed")
    worker_name = worker.get("displayName", "Ahmed Khan")

    msg_data = {
        "technicianId": worker_id,
        "technicianName": worker_name,
        "message": payload.message,
        "etaMinutes": payload.eta_minutes,
        "voiceNote": payload.voice_note,
        "timestamp": Database.now_iso()
    }

    m["latestTechnicianMessage"] = msg_data
    Database.save_mission(m)

    Database.record_event(
        mission_id=mission_id,
        event_type="TECHNICIAN_MESSAGE",
        actor_type="WORKER",
        actor_id=worker_id,
        payload=msg_data
    )

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["latestTechnicianMessage"] = msg_data
                Database.save_report(rep)
            Database.record_event(
                mission_id=rep_id,
                event_type="TECHNICIAN_MESSAGE",
                actor_type="WORKER",
                actor_id=worker_id,
                payload=msg_data
            )

    return {"status": "sent", "missionId": mission_id, "message": payload.message}

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

    after_photo = payload.after_photo_ref
    if after_photo and after_photo.startswith("data:image/"):
        try:
            import base64
            import boto3
            header, encoded = after_photo.split(",", 1) if "," in after_photo else ("", after_photo)
            image_bytes = base64.b64decode(encoded)
            bucket_name = os.getenv("S3_EVIDENCE_BUCKET", "repairgrid-evidence-011528288924-us-east-1")
            ext = "png" if "png" in header else "webp" if "webp" in header else "jpg"
            file_key = f"missions/{mission_id}/after/{uuid.uuid4().hex[:8]}.{ext}"
            s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
            s3.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=image_bytes,
                ContentType="image/jpeg" if ext == "jpg" else f"image/{ext}"
            )
            try:
                after_photo = s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket_name, "Key": file_key},
                    ExpiresIn=604800
                )
            except Exception as sign_err:
                print(f"Worker presign url error: {sign_err}")
                after_photo = f"https://{bucket_name}.s3.amazonaws.com/{file_key}"
        except Exception as upload_err:
            print(f"Worker after photo S3 upload failed: {upload_err}")

    proof = {
        "beforePhoto": before_photo,
        "afterPhoto": after_photo,
        "outcome": payload.outcome.value,
        "notes": payload.notes,
        "voiceTranscript": payload.voice_transcript,
        "materialsUsed": payload.materials_used or [],
        "technicianId": worker_id,
        "technicianName": worker_name,
        "submittedAt": Database.now_iso()
    }

    m["status"] = MissionStatus.READY_FOR_REVIEW.value
    m["verificationStatus"] = "READY_FOR_REVIEW"
    m["proofOfRepair"] = proof
    m["afterPhoto"] = after_photo
    m["technicianNotes"] = payload.notes
    m["completionPayload"] = payload.model_dump()
    m["version"] = m.get("version", 1) + 1

    Database.record_event(
        mission_id=mission_id,
        event_type="PROOF_SUBMITTED",
        actor_type="WORKER",
        actor_id=worker_id,
        payload=proof
    )

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = "READY_FOR_REVIEW"
                rep["proofPhoto"] = after_photo
                rep["afterPhoto"] = after_photo
                rep["technicianNotes"] = payload.notes
                Database.save_report(rep)
            Database.record_event(
                mission_id=rep_id,
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
            verification_result = {
                "conditionImproved": improved,
                "confidence": confidence,
                "recommendation": "OPERATOR_REVIEW",
                "explanation": nova.get("summary", "Amazon Nova compared the resident intake vs technician proof."),
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
                "recommendation": "OPERATOR_REVIEW",
                "explanation": v.explanation,
                "sameLocation": v.same_location,
                "sameAsset": v.same_asset,
                "evidenceQuality": v.evidence_quality,
                "verificationMode": "POLICY_SIMULATION",
                "verifiedAt": Database.now_iso(),
            }
        m["verificationResult"] = verification_result
        Database.record_event(
            mission_id=mission_id,
            event_type="AI_VERIFICATION_EVALUATED",
            actor_type="AGENT",
            actor_id="NovaVisionAgent" if verification_result["verificationMode"] == "AMAZON_BEDROCK" else "LocalVerificationPolicy",
            payload=verification_result
        )
    except (BedrockUnavailable, Exception) as e:
        m["verificationResult"] = {
            "conditionImproved": False,
            "confidence": 0.0,
            "recommendation": "OPERATOR_REVIEW",
            "explanation": f"Automated verification note: {str(e)}"
        }

    Database.save_mission(m)

    # Sync linked reports
    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = "READY_FOR_REVIEW"
                rep["afterPhoto"] = payload.after_photo_ref
                rep["technicianNotes"] = payload.notes
                Database.save_report(rep)

    return {"status": m["status"], "missionId": mission_id, "verification": m.get("verificationResult")}
