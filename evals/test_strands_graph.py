import pytest
from services.api.db import Database
from scripts.seed_demo import seed_campus_district
from agents.graphs.main_graph import RepairGridGraph
from agents.agents.completion_agent import CompletionVerifierAgent
from agents.schemas.mission_schemas import RiskBand, WorkerOutcome

@pytest.fixture(autouse=True)
def init_db():
    Database.reset_state()
    seed_campus_district()

def test_graph_standard_streetlight_assignment():
    state = {
        "report_id": "TEST-R-01",
        "category": "streetlights",
        "description": "Streetlight fixture flickering and dark outside East Gate.",
        "lat": 37.7765, # Science Block coordinates (distinct location)
        "lng": -122.4170,
        "image_url": "reports/TEST-R-01/before/light.jpg"
    }
    # Save report first
    Database.save_report({
        "reportId": state["report_id"],
        "reporterId": "user-test",
        "organizationId": "campus-district-01",
        "category": state["category"],
        "description": state["description"],
        "lat": state["lat"],
        "lng": state["lng"],
        "geohash": "37775_-122419",
        "status": "SUBMITTED",
        "evidenceRefs": [state["image_url"]]
    })

    result = RepairGridGraph.execute(state)
    assert result["status"] == "ASSIGNED"
    assert result["assigned_worker"] is not None
    assert result["assigned_worker"].worker_id == "wkr_ahmed" # Electrical specialist
    assert result["ownership_decision"].department == "electrical"
    assert result["risk_decision"].score >= 40

def test_graph_duplicate_merge():
    # Report 1 already exists at 37.7751, -122.4190 (RG-R-101)
    state = {
        "report_id": "TEST-R-DUP",
        "category": "streetlights",
        "description": "Second report: streetlight outside Gate 2 is not working.",
        "lat": 37.77511, # ~1 meter away
        "lng": -122.41901,
        "image_url": "reports/TEST-R-DUP/before/dup.jpg"
    }
    Database.save_report({
        "reportId": state["report_id"],
        "reporterId": "user-dup",
        "organizationId": "campus-district-01",
        "category": state["category"],
        "description": state["description"],
        "lat": state["lat"],
        "lng": state["lng"],
        "geohash": "37775_-122419",
        "status": "SUBMITTED",
        "evidenceRefs": [state["image_url"]]
    })

    result = RepairGridGraph.execute(state)
    assert result["status"] == "MERGED"
    assert result["is_duplicate_merged"] is True
    assert result["duplicate_decision"].canonical_report_id == "RG-R-101"

def test_graph_school_drain_escalation():
    state = {
        "report_id": "TEST-R-DRAIN",
        "category": "blocked_drains",
        "description": "Primary school storm drain blocked with heavy standing water and hazard for children.",
        "lat": 37.7754,
        "lng": -122.4187,
        "image_url": "reports/TEST-R-DRAIN/before/drain.jpg"
    }
    Database.save_report({
        "reportId": state["report_id"],
        "reporterId": "user-parent",
        "organizationId": "campus-district-01",
        "category": state["category"],
        "description": state["description"],
        "lat": state["lat"],
        "lng": state["lng"],
        "geohash": "37775_-122418",
        "status": "SUBMITTED",
        "evidenceRefs": [state["image_url"]]
    })

    result = RepairGridGraph.execute(state)
    assert result["risk_decision"].band in [RiskBand.HIGH, RiskBand.CRITICAL]
    assert result["ownership_decision"].department == "plumbing_drainage"
    assert result["assigned_worker"].worker_id in ["wkr_marcus", "wkr_elena"]

def test_graph_ambiguous_ownership_pauses_for_hitl():
    state = {
        "report_id": "TEST-R-AMBIG",
        "category": "streetlights",
        "description": "Light pole on municipal boundary with unknown utility marker.",
        "lat": 37.7740,
        "lng": -122.4200,
        "image_url": "reports/TEST-R-AMBIG/before/boundary.jpg"
    }
    Database.save_report({
        "reportId": state["report_id"],
        "reporterId": "user-worker",
        "organizationId": "campus-district-01",
        "category": state["category"],
        "description": state["description"],
        "lat": state["lat"],
        "lng": state["lng"],
        "geohash": "37774_-122420",
        "status": "SUBMITTED",
        "evidenceRefs": [state["image_url"]]
    })

    result = RepairGridGraph.execute(state)
    assert result["status"] == "HITL_PAUSED"
    assert result["requires_hitl"] is True
    assert "DEC-OWN" in result["hitl_decision_id"]

def test_proof_of_repair_routine_close():
    verification = CompletionVerifierAgent.verify(
        category="streetlights",
        outcome=WorkerOutcome.REPAIRED,
        notes="Replaced faulty LED fixture and calibrated sensor. Operational.",
        before_photo_ref="reports/RG-R-101/before/light.jpg",
        after_photo_ref="missions/RG-M-201/completion/repaired-light.jpg",
        worker_lat=37.7751,
        mission_lat=37.7751,
        risk_band=RiskBand.LOW
    )
    assert verification.same_location is True
    assert verification.condition_improved is True
    assert verification.recommendation == "CLOSE"

def test_proof_of_repair_critical_blocked_by_guardian():
    # Critical risk mission must NEVER auto-close!
    verification = CompletionVerifierAgent.verify(
        category="blocked_drains",
        outcome=WorkerOutcome.REPAIRED,
        notes="Cleared debris from storm drain outside kindergarten.",
        before_photo_ref="reports/SIM-DR-01/before/drain.jpg",
        after_photo_ref="missions/SIM-M-DRAIN/completion/clear-drain.jpg",
        worker_lat=37.7754,
        mission_lat=37.7754,
        risk_band=RiskBand.CRITICAL
    )
    assert verification.same_location is True
    assert verification.condition_improved is True
    # Guardian intercepts: must require operator review
    assert verification.recommendation == "OPERATOR_REVIEW"
    assert "CRITICAL" in verification.explanation

def test_proof_of_repair_requires_specialist_replan():
    verification = CompletionVerifierAgent.verify(
        category="blocked_drains",
        outcome=WorkerOutcome.REQUIRES_SPECIALIST,
        notes="Pipe cracked underground, requires hydraulic excavation.",
        before_photo_ref="reports/SIM-DR-01/before/drain.jpg",
        after_photo_ref="",
        worker_lat=37.7754,
        mission_lat=37.7754,
        risk_band=RiskBand.HIGH
    )
    assert verification.recommendation == "REPLAN_REOPEN"
    assert "specialist requirement" in verification.explanation
