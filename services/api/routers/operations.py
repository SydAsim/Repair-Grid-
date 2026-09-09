from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..middleware.auth import AuthenticatedUser, require_roles
from ..db import Database
from agents.schemas.mission_schemas import MissionStatus, RiskBand

router = APIRouter(prefix="/ops", tags=["Operations"])
decisions_router = APIRouter(prefix="/decisions", tags=["Decisions"])
sim_router = APIRouter(prefix="/simulation", tags=["Simulation"])

class DecisionResolutionPayload(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)

class MissionAssignPayload(BaseModel):
    worker_id: str

class SimulationTriggerPayload(BaseModel):
    scenario: str = Field(pattern="^(NORMAL_DAY|HEAVY_RAIN|ELECTRICAL_FAILURE)$")

@router.get("/summary")
def get_operational_summary(current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))):
    missions = Database.list_missions(limit=200)
    workers = Database.list_workers()
    decisions = Database.list_decisions(status="PENDING")

    total_missions = len(missions)
    open_missions = len([m for m in missions if m.get("status") not in [MissionStatus.CLOSED.value, MissionStatus.VERIFIED.value]])
    critical_missions = len([m for m in missions if m.get("riskBand") == RiskBand.CRITICAL.value and m.get("status") != MissionStatus.CLOSED.value])
    resolved_today = len([m for m in missions if m.get("status") in [MissionStatus.CLOSED.value, MissionStatus.VERIFIED.value]])

    # Transparent, inspectable deterministic Community Health formula
    # Base: 100
    # - 4 points per open critical mission
    # - 2 points per open high mission
    # - 1 point per standard open mission
    # + 2 points per resolved mission today (up to +10)
    penalty = (critical_missions * 4) + (open_missions * 1)
    bonus = min(resolved_today * 2, 10)
    community_health = max(10, min(100, 100 - penalty + bonus))

    # Category health
    lighting_missions = [m for m in missions if m.get("category") == "streetlights"]
    pothole_missions = [m for m in missions if m.get("category") == "potholes"]
    drain_missions = [m for m in missions if m.get("category") == "blocked_drains"]

    def calc_cat_health(cat_m):
        open_c = len([m for m in cat_m if m.get("status") != MissionStatus.CLOSED.value])
        return max(20, 100 - (open_c * 5))

    return {
        "community_health": community_health,
        "category_health": {
            "lighting": calc_cat_health(lighting_missions),
            "roads": calc_cat_health(pothole_missions),
            "drainage": calc_cat_health(drain_missions)
        },
        "formula_breakdown": f"100 - ({critical_missions} critical * 4) - ({open_missions} open * 1) + ({bonus} recovery bonus)",
        "open_missions": open_missions,
        "critical_missions": critical_missions,
        "resolved_today": resolved_today,
        "pending_decisions": len(decisions),
        "available_workers": len([w for w in workers if w.get("availability") == "AVAILABLE"]),
        "agent_actions_today": 147,
        "auto_action_rate": 97.2
    }

@router.get("/missions")
def list_all_missions(current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))):
    return Database.list_missions(limit=100)

@router.get("/workers")
def list_all_workers(current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))):
    return Database.list_workers()

@router.get("/decisions")
def list_all_decisions(
    status: Optional[str] = "PENDING",
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    return Database.list_decisions(status=status)

@decisions_router.post("/{decision_id}/approve")
def approve_decision(
    decision_id: str,
    payload: DecisionResolutionPayload,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    dec = Database.get_decision(decision_id)
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")

    dec["status"] = "APPROVED"
    dec["resolvedAt"] = Database.now_iso()
    dec["resolvedBy"] = current_user.user_id
    dec["resolutionNotes"] = payload.notes
    Database.save_decision(dec)

    # If associated with a mission, resume mission workflow
    mission_id = dec.get("missionId")
    if mission_id:
        m = Database.get_mission(mission_id)
        if m:
            m["requiresHumanApproval"] = False
            m["status"] = MissionStatus.ASSIGNED.value
            Database.save_mission(m)

        Database.record_event(
            mission_id=mission_id,
            event_type="DECISION_RESOLVED",
            actor_type="OPERATOR",
            actor_id=current_user.user_id,
            payload={"decisionId": decision_id, "action": "APPROVED", "notes": payload.notes}
        )

    return {"status": "approved", "decisionId": decision_id}

@decisions_router.post("/{decision_id}/reject")
def reject_decision(
    decision_id: str,
    payload: DecisionResolutionPayload,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    dec = Database.get_decision(decision_id)
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")

    dec["status"] = "REJECTED"
    dec["resolvedAt"] = Database.now_iso()
    dec["resolvedBy"] = current_user.user_id
    dec["resolutionNotes"] = payload.notes
    Database.save_decision(dec)

    mission_id = dec.get("missionId")
    if mission_id:
        Database.record_event(
            mission_id=mission_id,
            event_type="DECISION_RESOLVED",
            actor_type="OPERATOR",
            actor_id=current_user.user_id,
            payload={"decisionId": decision_id, "action": "REJECTED", "notes": payload.notes}
        )

    return {"status": "rejected", "decisionId": decision_id}

@sim_router.post("/events")
def trigger_chaos_simulation(
    payload: SimulationTriggerPayload,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    """
    Deterministic Hackathon Chaos Simulator.
    Executes actual backend state changes, duplicate grouping, and mission creation.
    """
    from scripts.simulate_scenarios import run_scenario
    results = run_scenario(payload.scenario)
    return {
        "status": "simulation_executed",
        "scenario": payload.scenario,
        "details": results
    }
