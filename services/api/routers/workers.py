from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..middleware.auth import AuthenticatedUser, get_current_user, require_roles
from ..db import Database
from agents.schemas.mission_schemas import (
    MissionDetail, 
    MissionStatus, 
    WorkerCompletionPayload, 
    WorkerOutcome
)

router = APIRouter(prefix="/workers", tags=["Workers"])
missions_router = APIRouter(prefix="/missions", tags=["Worker Missions"])

class WorkerStatusUpdate(BaseModel):
    availability: str = Field(pattern="^(AVAILABLE|ASSIGNED|OFF_SHIFT)$")

class WorkerLocationUpdate(BaseModel):
    lat: float
    lng: float

@router.get("/me")
def get_my_profile(current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))):
    # Lookup worker by userId
    workers = Database.list_workers()
    worker = next((w for w in workers if w.get("userId") == current_user.user_id), None)

    if not worker:
        # Default mock profile for seed/demo user
        worker = {
            "workerId": f"wkr_{current_user.user_id}",
            "userId": current_user.user_id,
            "displayName": current_user.email.split("@")[0].capitalize(),
            "department": "electrical",
            "skills": ["electrical", "street_lighting"],
            "zone": "campus_north",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "lastLat": 37.7749,
            "lastLng": -122.4194,
        }
        Database.save_worker(worker)
    return worker

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

@missions_router.get("/assigned", response_model=List[MissionDetail])
def get_assigned_missions(current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))):
    missions = Database.list_missions(limit=50)
    worker = get_my_profile(current_user)
    worker_id = worker.get("workerId")
    
    assigned = [m for m in missions if m.get("assignedWorkerId") == worker_id or "operator" in current_user.roles]
    return [
        MissionDetail(
            mission_id=m["missionId"],
            organization_id=m["organizationId"],
            report_ids=m.get("reportIds", []),
            category=m["category"],
            title=m["title"],
            priority=m["priority"],
            risk_band=m["riskBand"],
            required_skill=m["requiredSkill"],
            department=m["department"],
            assigned_worker_id=m.get("assignedWorkerId"),
            status=m["status"],
            sla_due_at=m["slaDueAt"],
            requires_human_approval=m.get("requiresHumanApproval", False),
            version=m.get("version", 1),
            created_at=m["createdAt"],
            updated_at=m["updatedAt"]
        ) for m in assigned
    ]

@missions_router.get("/{mission_id}", response_model=MissionDetail)
def get_mission_by_id(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return MissionDetail(
        mission_id=m["missionId"],
        organization_id=m["organizationId"],
        report_ids=m.get("reportIds", []),
        category=m["category"],
        title=m["title"],
        priority=m["priority"],
        risk_band=m["riskBand"],
        required_skill=m["requiredSkill"],
        department=m["department"],
        assigned_worker_id=m.get("assignedWorkerId"),
        status=m["status"],
        sla_due_at=m["slaDueAt"],
        requires_human_approval=m.get("requiresHumanApproval", False),
        version=m.get("version", 1),
        created_at=m["createdAt"],
        updated_at=m["updatedAt"]
    )

@missions_router.post("/{mission_id}/start")
def start_mission(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    m["status"] = MissionStatus.IN_PROGRESS.value
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    Database.record_event(
        mission_id=mission_id,
        event_type="WORKER_ARRIVED",
        actor_type="WORKER",
        actor_id=current_user.user_id,
        payload={"status": "IN_PROGRESS", "notes": "Technician arrived on-site"}
    )
    return {"status": "in_progress", "missionId": mission_id}

@missions_router.post("/{mission_id}/completion")
def submit_mission_completion(
    mission_id: str,
    payload: WorkerCompletionPayload,
    current_user: AuthenticatedUser = Depends(require_roles(["field_worker", "operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    m["status"] = MissionStatus.COMPLETION_SUBMITTED.value
    m["completionPayload"] = payload.model_dump()
    m["version"] = m.get("version", 1) + 1
    Database.save_mission(m)

    Database.record_event(
        mission_id=mission_id,
        event_type="COMPLETION_SUBMITTED",
        actor_type="WORKER",
        actor_id=current_user.user_id,
        payload=payload.model_dump()
    )

    # Dynamic graph re-entry if specialist is required!
    if payload.outcome == WorkerOutcome.REQUIRES_SPECIALIST:
        m["status"] = MissionStatus.REOPENED.value
        m["requiresHumanApproval"] = True
        Database.save_mission(m)
        Database.record_event(
            mission_id=mission_id,
            event_type="SPECIALIST_REQUIRED_REPLAN",
            actor_type="WORKER",
            actor_id=current_user.user_id,
            payload={"reason": payload.notes}
        )
        return {
            "status": "replan_triggered",
            "message": "Specialist requirement registered. Mission re-routed to ResourceAgent for excavation/civil reassignment."
        }

    return {"status": "submitted_for_verification", "missionId": mission_id}
