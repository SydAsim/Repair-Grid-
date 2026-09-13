import pytest
from fastapi.testclient import TestClient
from services.api.main import app
from services.api.db import Database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Database.reset_state()
    from scripts.seed_demo import seed_campus_district
    seed_campus_district()

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "RepairGrid" in data["service"]

def test_unauthorized_resident_blocked_from_operations():
    # Resident attempts to access /api/ops/summary
    res = client.get("/api/ops/summary", headers={"X-Mock-Role": "resident"})
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_unauthorized_worker_blocked_from_admin():
    # Field worker attempts to access /api/admin/policies
    res = client.get("/api/admin/policies", headers={"X-Mock-Role": "field_worker"})
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_operator_allowed_access_to_operations():
    res = client.get("/api/ops/summary", headers={"X-Mock-Role": "operator"})
    assert res.status_code == 200
    data = res.json()
    assert "community_health" in data
    assert data["community_health"] >= 0

def test_resident_create_report():
    report_payload = {
        "category": "streetlights",
        "description": "Streetlight fixture broken near East gate.",
        "lat": 37.7751,
        "lng": -122.4190,
        "image_url": "reports/test/before/light.jpg"
    }
    res = client.post("/api/reports", json=report_payload, headers={"X-Mock-Role": "resident", "X-Mock-User-Id": "res-123"})
    assert res.status_code == 200
    data = res.json()
    assert data["report_id"].startswith("RG-R-")
    assert data["category"] == "streetlights"
    assert data["status"] == "SUBMITTED"

def test_chaos_simulator_heavy_rain():
    res = client.post("/api/simulation/events", json={"scenario": "HEAVY_RAIN"}, headers={"X-Mock-Role": "operator"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "simulation_executed"
    assert data["details"]["duplicates_merged"] == 2
    assert data["details"]["hitl_decisions_created"] == 1

def test_full_mission_connected_lifecycle():
    # 1. Resident creates a report
    report_payload = {
        "category": "streetlights",
        "description": "High-voltage street-light flickering outside Science Quad.",
        "lat": 37.7765,
        "lng": -122.4170,
        "location_name": "Science Block Quad",
        "image_url": "reports/test/before/science_light.jpg"
    }
    res = client.post("/api/reports", json=report_payload, headers={"X-Mock-Role": "resident", "X-Mock-User-Id": "res-science-1"})
    assert res.status_code == 200
    report_data = res.json()
    report_id = report_data["report_id"]
    mission_id = report_data["mission_id"]
    assert mission_id is not None
    assert mission_id.startswith("RG-M-")

    # 2. Worker receives assigned mission awaiting acceptance
    missions_res = client.get("/api/missions/assigned", headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert missions_res.status_code == 200
    missions = missions_res.json()
    assigned = next((m for m in missions if m["mission_id"] == mission_id), None)
    assert assigned is not None
    assert assigned["status"] in ["AWAITING_ACCEPTANCE", "ASSIGNED"]
    assert assigned["assigned_worker_id"] == "wkr_ahmed"
    assert assigned["match_score"] >= 0.85
    assert assigned["match_factors"] is not None
    assert "skill" in assigned["match_factors"]
    assert assigned["match_factors"]["skill"] == 40

    # 3. Worker accepts the mission
    accept_res = client.post(f"/api/missions/{mission_id}/accept", headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"

    # 4. Worker marks en route
    en_route_res = client.post(f"/api/missions/{mission_id}/en-route?eta_minutes=10", headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert en_route_res.status_code == 200
    assert en_route_res.json()["status"] == "EN_ROUTE"

    # 5. Worker arrives on site
    on_site_res = client.post(f"/api/missions/{mission_id}/on-site", headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert on_site_res.status_code == 200
    assert on_site_res.json()["status"] == "ON_SITE"

    # 6. Worker starts repair
    start_res = client.post(f"/api/missions/{mission_id}/start", headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "REPAIR_IN_PROGRESS"

    # 7. Worker submits completion proof
    comp_payload = {
        "outcome": "REPAIRED",
        "notes": "Replaced luminaire LED ballast and sealed junction box.",
        "after_photo_ref": "reports/test/after/science_light_fixed.jpg",
        "materials_used": ["LED-BALLAST-40W", "CONDUIT-SEALANT"]
    }
    comp_res = client.post(f"/api/missions/{mission_id}/completion", json=comp_payload, headers={"X-Mock-Role": "field_worker", "X-Mock-User-Id": "wkr_ahmed"})
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] in ["VERIFIED", "PROOF_SUBMITTED"]

    # 8. Operator verifies and closes mission
    close_res = client.post(f"/api/ops/missions/{mission_id}/verify-close", headers={"X-Mock-Role": "operator"})
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 9. Verify event timeline
    events_res = client.get(f"/api/reports/{report_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["eventType"] for e in events]
    assert "REPORT_SUBMITTED" in event_types
    assert "LOCATION_GEOCODED" in event_types
    assert "MISSION_CREATED" in event_types
    assert "TECHNICIAN_NOTIFIED" in event_types
    assert "TECHNICIAN_ACCEPTED" in event_types
    assert "TECHNICIAN_EN_ROUTE" in event_types
    assert "TECHNICIAN_ARRIVED" in event_types
    assert "PROOF_SUBMITTED" in event_types
    assert "MISSION_CLOSED" in event_types
