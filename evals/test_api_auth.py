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
