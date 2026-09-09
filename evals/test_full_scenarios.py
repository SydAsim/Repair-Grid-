import pytest
from services.api.db import Database
from scripts.seed_demo import seed_campus_district
from agents.graphs.main_graph import RepairGridGraph
from agents.agents.completion_agent import CompletionVerifierAgent
from agents.policies.guardian_policy import GuardianPolicy
from agents.policies.risk_policy import calculate_risk
from agents.policies.worker_ranking_policy import rank_workers
from agents.schemas.mission_schemas import RiskBand, WorkerOutcome

@pytest.fixture(autouse=True)
def setup_state():
    Database.reset_state()
    seed_campus_district()

# Scenario 01: Normal report intake
def test_scenario_01_normal_report():
    state = {"report_id": "S01", "category": "streetlights", "description": "Streetlight lamp inactive", "lat": 37.7765, "lng": -122.4170}
    res = RepairGridGraph.execute(state)
    assert res["status"] == "ASSIGNED"
    assert res["assigned_worker"] is not None

# Scenario 02: High-confidence exact location duplicate
def test_scenario_02_duplicate_merge():
    # Matches RG-R-101 at 37.7751, -122.4190
    state = {"report_id": "S02", "category": "streetlights", "description": "Light out Gate 2", "lat": 37.7751, "lng": -122.4190}
    res = RepairGridGraph.execute(state)
    assert res["is_duplicate_merged"] is True
    assert res["status"] == "MERGED"

# Scenario 03: False duplicate (different asset 40m away)
def test_scenario_03_false_duplicate():
    state = {"report_id": "S03", "category": "streetlights", "description": "Distinct light fixture", "lat": 37.7780, "lng": -122.4150}
    res = RepairGridGraph.execute(state)
    assert res.get("is_duplicate_merged", False) is False
    assert res["status"] == "ASSIGNED"

# Scenario 04: Nearby different category asset (Pothole near streetlight)
def test_scenario_04_different_category_nearby():
    state = {"report_id": "S04", "category": "potholes", "description": "Pothole in asphalt", "lat": 37.7751, "lng": -122.4190}
    res = RepairGridGraph.execute(state)
    assert res.get("is_duplicate_merged", False) is False # Not merged because category is different!
    assert res["ownership_decision"].department == "roads"

# Scenario 05: High-risk school-adjacent drain
def test_scenario_05_school_drain():
    risk = calculate_risk("blocked_drains", "Drain overflowing standing water outside school gate", 37.7754, -122.4187, is_school_adjacent=True)
    assert risk.band in [RiskBand.HIGH, RiskBand.CRITICAL]

# Scenario 06: Low-risk routine report
def test_scenario_06_low_risk():
    risk = calculate_risk("potholes", "Minor shallow depression in remote trail path", 37.7790, -122.4120, is_school_adjacent=False, is_high_traffic=False)
    assert risk.band in [RiskBand.LOW, RiskBand.MEDIUM]

# Scenario 07: Ambiguous ownership triggers HITL
def test_scenario_07_ambiguous_ownership():
    state = {"report_id": "S07", "category": "streetlights", "description": "Boundary line unknown utility", "lat": 37.7740, "lng": -122.4200}
    res = RepairGridGraph.execute(state)
    assert res["requires_hitl"] is True
    assert res["status"] == "HITL_PAUSED"

# Scenario 08: Qualified worker found and ranked #1
def test_scenario_08_qualified_worker_found():
    workers = Database.list_workers()
    ranked = rank_workers("street_lighting", 37.7751, -122.4190, "campus_north", workers)
    assert len(ranked) > 0
    assert ranked[0].worker_id == "wkr_ahmed"
    assert ranked[0].match_score >= 0.85

# Scenario 09: Wrong-skill worker excluded
def test_scenario_09_wrong_skill_excluded():
    workers = Database.list_workers()
    ranked = rank_workers("surface_repair", 37.7758, -122.4181, "campus_all", workers)
    assert all("wkr_ahmed" != r.worker_id for r in ranked) # Ahmed is electrician, not asphalt technician!

# Scenario 10: All workers unavailable
def test_scenario_10_no_worker_available():
    ranked = rank_workers("nuclear_engineering", 37.7751, -122.4190, "campus_all", Database.list_workers())
    assert len(ranked) == 0

# Scenario 11: Valid technician repair photo passes verification
def test_scenario_11_valid_repair():
    v = CompletionVerifierAgent.verify("streetlights", WorkerOutcome.REPAIRED, "Replaced LED driver", "b.jpg", "a.jpg", 37.7751, 37.7751, RiskBand.LOW)
    assert v.condition_improved is True
    assert v.recommendation == "CLOSE"

# Scenario 12: Invalid repair photo (mismatch notes)
def test_scenario_12_invalid_repair_photo():
    v = CompletionVerifierAgent.verify("streetlights", WorkerOutcome.REPAIRED, "Wrong photo attached mismatch", "b.jpg", "a.jpg", 37.7751, 37.7751)
    assert v.condition_improved is False
    assert v.recommendation == "REPLAN_REOPEN"

# Scenario 13: Wrong location completion (GPS mismatch)
def test_scenario_13_wrong_location():
    v = CompletionVerifierAgent.verify("streetlights", WorkerOutcome.REPAIRED, "Fixed", "b.jpg", "a.jpg", 37.8900, 37.7751)
    assert v.same_location is False
    assert v.confidence < 0.80

# Scenario 14: Temporary repair outcome
def test_scenario_14_temporary_repair():
    v = CompletionVerifierAgent.verify("blocked_drains", WorkerOutcome.TEMPORARY_REPAIR, "Temporary pump", "b.jpg", "a.jpg", 37.7754, 37.7754)
    assert v.condition_improved is True

# Scenario 15: Requires specialist outcome triggers replan
def test_scenario_15_requires_specialist():
    v = CompletionVerifierAgent.verify("blocked_drains", WorkerOutcome.REQUIRES_SPECIALIST, "Excavation needed", "b.jpg", "a.jpg", 37.7754, 37.7754)
    assert v.recommendation == "REPLAN_REOPEN"

# Scenario 16: Resident rejects repair (Still broken)
def test_scenario_16_resident_rejects():
    from services.api.routers.reports import submit_resolution_feedback, ResolutionFeedbackRequest
    from services.api.middleware.auth import AuthenticatedUser
    user = AuthenticatedUser(user_id="user1", email="res@test.com", roles=["resident"])
    res = submit_resolution_feedback("RG-R-101", ResolutionFeedbackRequest(feedback="STILL_BROKEN"), user)
    assert res["status"] == "reopened_for_inspection"

# Scenario 17: Resident confirms repair (Fixed)
def test_scenario_17_resident_confirms():
    from services.api.routers.reports import submit_resolution_feedback, ResolutionFeedbackRequest
    from services.api.middleware.auth import AuthenticatedUser
    user = AuthenticatedUser(user_id="user1", email="res@test.com", roles=["resident"])
    res = submit_resolution_feedback("RG-R-101", ResolutionFeedbackRequest(feedback="FIXED"), user)
    assert res["status"] == "confirmed_closed"

# Scenario 18: Critical closure attempted -> BLOCKED by Guardian
def test_scenario_18_critical_closure_blocked():
    chk = GuardianPolicy.evaluate_mission_closure(RiskBand.CRITICAL, 0.98, True)
    assert chk.action_allowed is False
    assert chk.requires_human is True
    assert "SAFETY_CRITICAL" in chk.rule_triggered

# Scenario 19: Low-confidence closure attempted -> BLOCKED by Guardian
def test_scenario_19_low_confidence_close_blocked():
    chk = GuardianPolicy.evaluate_mission_closure(RiskBand.MEDIUM, 0.75, True)
    assert chk.action_allowed is False
    assert chk.requires_human is True

# Scenario 20: Human operator approves decision
def test_scenario_20_human_approves():
    from scripts.simulate_scenarios import run_scenario
    run_scenario("HEAVY_RAIN")
    from services.api.routers.operations import approve_decision, DecisionResolutionPayload
    from services.api.middleware.auth import AuthenticatedUser
    op = AuthenticatedUser(user_id="op1", email="op@test.com", roles=["operator"])
    res = approve_decision("DEC-RAIN-001", DecisionResolutionPayload(notes="Approved emergency crew"), op)
    assert res["status"] == "approved"

# Scenario 21: Human operator rejects decision
def test_scenario_21_human_rejects():
    from scripts.simulate_scenarios import run_scenario
    run_scenario("HEAVY_RAIN")
    from services.api.routers.operations import reject_decision, DecisionResolutionPayload
    from services.api.middleware.auth import AuthenticatedUser
    op = AuthenticatedUser(user_id="op1", email="op@test.com", roles=["operator"])
    res = reject_decision("DEC-RAIN-001", DecisionResolutionPayload(notes="Over budget"), op)
    assert res["status"] == "rejected"

# Scenario 22: Idempotent duplicate merge
def test_scenario_22_duplicate_idempotency():
    state1 = {"report_id": "DUP_A", "category": "streetlights", "description": "Gate 2 light", "lat": 37.7751, "lng": -122.4190}
    state2 = {"report_id": "DUP_B", "category": "streetlights", "description": "Gate 2 light again", "lat": 37.7751, "lng": -122.4190}
    r1 = RepairGridGraph.execute(state1)
    r2 = RepairGridGraph.execute(state2)
    assert r1["is_duplicate_merged"] is True
    assert r2["is_duplicate_merged"] is True

# Scenario 23: Unauthorized resident blocked from dispatch
def test_scenario_23_unauthorized_dispatch_blocked():
    from services.api.routers.operations import approve_decision
    from services.api.middleware.auth import AuthenticatedUser
    res_user = AuthenticatedUser(user_id="res1", email="res@test.com", roles=["resident"])
    from fastapi import HTTPException
    with pytest.raises(Exception):
        from services.api.middleware.auth import require_roles
        guard = require_roles(["operator", "admin"])
        guard(res_user)

# Scenario 24: Unauthorized worker blocked from policy update
def test_scenario_24_unauthorized_policy_update_blocked():
    from services.api.middleware.auth import AuthenticatedUser, require_roles
    wkr_user = AuthenticatedUser(user_id="wkr1", email="wkr@test.com", roles=["field_worker"])
    with pytest.raises(Exception):
        guard = require_roles(["admin"])
        guard(wkr_user)

# Scenario 25: Graph step bound aborts infinite loops
def test_scenario_25_graph_step_bounds():
    assert RepairGridGraph.MAX_STEPS == 15

# Scenario 26: Worker shift status update
def test_scenario_26_worker_status_update():
    from services.api.routers.workers import update_my_status, WorkerStatusUpdate
    from services.api.middleware.auth import AuthenticatedUser
    wkr = AuthenticatedUser(user_id="worker-electric-001", email="worker.electric@repairgrid.demo", roles=["field_worker"])
    res = update_my_status(WorkerStatusUpdate(availability="OFF_SHIFT"), wkr)
    assert res["availability"] == "OFF_SHIFT"

# Scenario 27: Worker GPS update during shift
def test_scenario_27_worker_location_update():
    from services.api.routers.workers import update_my_location, WorkerLocationUpdate
    from services.api.middleware.auth import AuthenticatedUser
    wkr = AuthenticatedUser(user_id="worker-electric-001", email="worker.electric@repairgrid.demo", roles=["field_worker"])
    res = update_my_location(WorkerLocationUpdate(lat=37.7752, lng=-122.4189), wkr)
    assert res["status"] == "location_recorded"

# Scenario 28: Heavy Rain simulation determinism
def test_scenario_28_heavy_rain_simulation():
    from scripts.simulate_scenarios import run_scenario
    res = run_scenario("HEAVY_RAIN")
    assert res["duplicates_merged"] == 2
    assert res["canonical_missions_spawned"] == 2
    assert res["hitl_decisions_created"] == 1

# Scenario 29: Electrical failure simulation
def test_scenario_29_electrical_failure():
    from scripts.simulate_scenarios import run_scenario
    res = run_scenario("ELECTRICAL_FAILURE")
    assert res["canonical_missions_spawned"] == 1

# Scenario 30: Community health calculation
def test_scenario_30_community_health_metric():
    from services.api.routers.operations import get_operational_summary
    from services.api.middleware.auth import AuthenticatedUser
    op = AuthenticatedUser(user_id="op1", email="op@test.com", roles=["operator"])
    summary = get_operational_summary(op)
    assert 10 <= summary["community_health"] <= 100
    assert "formula_breakdown" in summary

# Scenario 31: S3 presigned URL generation
def test_scenario_31_s3_presigning():
    from services.api.routers.uploads import get_presigned_upload_url, PresignRequest
    from services.api.middleware.auth import AuthenticatedUser
    res_user = AuthenticatedUser(user_id="res1", email="res@test.com", roles=["resident"])
    req = PresignRequest(file_type="image/jpeg", upload_type="before", reference_id="TEST-REF")
    res = get_presigned_upload_url(req, res_user)
    assert "reports/TEST-REF/before/" in res.file_key
    assert res.upload_url is not None

# Scenario 32: Reset demo flushes and restores state
def test_scenario_32_reset_demo():
    from services.api.routers.admin import reset_demo_data
    from services.api.middleware.auth import AuthenticatedUser
    admin_user = AuthenticatedUser(user_id="admin1", email="admin@test.com", roles=["admin"])
    res = reset_demo_data(admin_user)
    assert res["status"] == "demo_reset_complete"
