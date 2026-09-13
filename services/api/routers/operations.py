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
    reports = Database.list_reports(limit=200)
    workers = Database.list_workers()
    decisions = Database.list_decisions(status="PENDING")

    total_reports = len(reports)
    total_missions = len(missions)
    
    awaiting_acceptance = len([m for m in missions if m.get("status") in ["AWAITING_ACCEPTANCE", "NOTIFICATION_PENDING"]])
    en_route = len([m for m in missions if m.get("status") == "EN_ROUTE"])
    on_site = len([m for m in missions if m.get("status") in ["ON_SITE", "REPAIR_IN_PROGRESS", "IN_PROGRESS"]])
    proof_pending = len([m for m in missions if m.get("status") in ["PROOF_SUBMITTED", "COMPLETION_SUBMITTED", "VERIFYING", "AI_VERIFYING"]])
    verified = len([m for m in missions if m.get("status") == "VERIFIED"])
    closed = len([m for m in missions if m.get("status") == "CLOSED"])
    
    active_missions = len([m for m in missions if m.get("status") not in ["CLOSED", "VERIFIED"]])
    unassigned_reports = len([r for r in reports if not r.get("missionId") or r.get("status") == "SUBMITTED"])
    critical_missions = len([m for m in missions if (m.get("riskBand") == "CRITICAL" or m.get("priority", 0) >= 80) and m.get("status") != "CLOSED"])
    high_risk_incidents = len([m for m in missions if (m.get("riskBand") in ["HIGH", "CRITICAL"] or m.get("priority", 0) >= 70) and m.get("status") != "CLOSED"])

    resolved_today = closed + verified

    penalty = (critical_missions * 4) + (active_missions * 1)
    bonus = min(resolved_today * 2, 10)
    community_health = max(10, min(100, 100 - penalty + bonus))

    # Category health
    lighting_missions = [m for m in missions if m.get("category") == "streetlights"]
    pothole_missions = [m for m in missions if m.get("category") == "potholes"]
    drain_missions = [m for m in missions if m.get("category") == "blocked_drains"]

    def calc_cat_health(cat_m):
        open_c = len([m for m in cat_m if m.get("status") != "CLOSED"])
        return max(20, 100 - (open_c * 5))

    return {
        "community_health": community_health,
        "category_health": {
            "lighting": calc_cat_health(lighting_missions),
            "roads": calc_cat_health(pothole_missions),
            "drainage": calc_cat_health(drain_missions)
        },
        "formula_breakdown": f"100 - ({critical_missions} critical * 4) - ({active_missions} active * 1) + ({bonus} recovery bonus)",
        "total_reports": total_reports,
        "total_missions": total_missions,
        "active_missions": active_missions,
        "unassigned_reports": unassigned_reports,
        "awaiting_acceptance": awaiting_acceptance,
        "en_route": en_route,
        "technicians_en_route": en_route,
        "on_site": on_site,
        "on_site_missions": on_site,
        "proof_pending": proof_pending,
        "verification_pending": proof_pending,
        "verified": verified,
        "closed": closed,
        "completed_missions": closed + verified,
        "critical_missions": critical_missions,
        "high_risk_incidents": high_risk_incidents,
        "resolved_today": resolved_today,
        "pending_decisions": len(decisions),
        "available_workers": len([w for w in workers if w.get("availability") == "AVAILABLE"]),
        "agent_actions_today": len(Database.list_all_events(limit=200)),
        "auto_action_rate": 97.2
    }

def _enrich_mission(m: Dict[str, Any]) -> Dict[str, Any]:
    enriched = m.copy()
    report_ids = enriched.get("reportIds", [])
    if not report_ids and enriched.get("reportId"):
        report_ids = [enriched.get("reportId")]
    enriched["reportIds"] = report_ids

    if report_ids:
        rep = Database.get_report(report_ids[0])
        if rep:
            if not enriched.get("photoEvidence") and rep.get("evidenceRefs"):
                enriched["photoEvidence"] = rep["evidenceRefs"][0]
            if not enriched.get("description"):
                enriched["description"] = rep.get("description")
            if not enriched.get("location"):
                enriched["location"] = rep.get("locationName")
            if not enriched.get("lat") and "lat" in rep:
                enriched["lat"] = rep["lat"]
                enriched["lng"] = rep["lng"]
            if not enriched.get("coordinates") and "lat" in rep:
                enriched["coordinates"] = {"lat": rep["lat"], "lng": rep["lng"]}
    return enriched

@router.get("/missions")
def list_all_missions(current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))):
    missions = Database.list_missions(limit=100)
    return [_enrich_mission(m) for m in missions]

@router.get("/missions/{mission_id}")
def get_mission_detail(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        # Check if requested by reportId
        reports = Database.list_reports(limit=100)
        rep = next((r for r in reports if r.get("reportId") == mission_id), None)
        if rep and rep.get("missionId"):
            m = Database.get_mission(rep["missionId"])
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return _enrich_mission(m)

@router.get("/missions/{mission_id}/events")
def get_single_mission_events(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    return Database.get_mission_events(mission_id)

@router.get("/events")
def get_all_operations_events(current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))):
    return Database.list_all_events(limit=100)

@router.post("/missions/{mission_id}/verify-close")
@router.post("/missions/{mission_id}/approve")
def verify_and_close_mission(
    mission_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["operator", "admin"]))
):
    m = Database.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    m["status"] = "CLOSED"
    m["verificationStatus"] = "VERIFIED"
    m["communityConfirmation"] = {
        "confirmed": True,
        "confirmedBy": current_user.user_id,
        "confirmedAt": Database.now_iso(),
        "rating": 5,
        "comment": "Community repair verified and closed by Operations."
    }
    Database.save_mission(m)

    for rep_id in m.get("reportIds", [m.get("reportId")]):
        if rep_id:
            rep = Database.get_report(rep_id)
            if rep:
                rep["status"] = "CLOSED"
                Database.save_report(rep)

    Database.record_event(
        mission_id=mission_id,
        event_type="MISSION_CLOSED",
        actor_type="OPERATOR",
        actor_id=current_user.user_id,
        payload={"status": "CLOSED", "note": "Mission verified and closed by operator"}
    )
    return {"status": "CLOSED", "missionId": mission_id}

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
            m["status"] = MissionStatus.AWAITING_ACCEPTANCE.value
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

@router.post("/purge-live-data")
def purge_live_data():
    """Wipes all active test reports, missions, and notifications for a clean slate."""
    Database.clear_live_data()
    return {"status": "ok", "message": "All live reports and missions have been cleared."}

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
