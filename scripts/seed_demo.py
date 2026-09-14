import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.api.db import Database, ENABLE_LOCAL_MOCK

CAMPUS_ASSETS = [
    # Streetlights (Lighting)
    {"id": "AST-LT-01", "name": "North Gate Streetlight 1", "category": "streetlights", "lat": 37.7751, "lng": -122.4190},
    {"id": "AST-LT-02", "name": "University Road Post 4", "category": "streetlights", "lat": 37.7755, "lng": -122.4185},
    {"id": "AST-LT-03", "name": "Library Quad Lamp 2", "category": "streetlights", "lat": 37.7760, "lng": -122.4178},
    {"id": "AST-LT-04", "name": "Science Block Lantern 9", "category": "streetlights", "lat": 37.7765, "lng": -122.4170},
    {"id": "AST-LT-05", "name": "East Walkway Streetlight 12", "category": "streetlights", "lat": 37.7748, "lng": -122.4195},
    # Potholes (Roads)
    {"id": "AST-RD-01", "name": "Gate 2 Entrance Asphalt", "category": "potholes", "lat": 37.7752, "lng": -122.4189},
    {"id": "AST-RD-02", "name": "Engineering Lane Pavement", "category": "potholes", "lat": 37.7758, "lng": -122.4181},
    {"id": "AST-RD-03", "name": "Dormitory Loop Road", "category": "potholes", "lat": 37.7768, "lng": -122.4168},
    # Blocked Drains (Drainage)
    {"id": "AST-DR-01", "name": "Primary School Gate Storm Drain", "category": "blocked_drains", "lat": 37.7754, "lng": -122.4187},
    {"id": "AST-DR-02", "name": "Campus Park Catch Basin", "category": "blocked_drains", "lat": 37.7762, "lng": -122.4175},
    {"id": "AST-DR-03", "name": "Sports Pavilion Gutter", "category": "blocked_drains", "lat": 37.7770, "lng": -122.4165},
]

CAMPUS_WORKERS = [
    {
        "workerId": "wkr_ahmed",
        "userId": "worker-electric-001",
        "displayName": "Ahmed Khan",
        "department": "electrical",
        "skills": ["electrical", "street_lighting"],
        "zone": "campus_north",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7750,
        "lastLng": -122.4192,
    },
    {
        "workerId": "wkr_sarah",
        "userId": "worker-electric-002",
        "displayName": "Sarah Jenkins",
        "department": "electrical",
        "skills": ["electrical", "power_distribution"],
        "zone": "campus_south",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7745,
        "lastLng": -122.4198,
    },
    {
        "workerId": "wkr_marcus",
        "userId": "worker-plumber-001",
        "displayName": "Marcus Thorne",
        "department": "plumbing_drainage",
        "skills": ["plumbing", "drainage", "water"],
        "zone": "campus_north",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7753,
        "lastLng": -122.4188,
    },
    {
        "workerId": "wkr_elena",
        "userId": "worker-plumber-002",
        "displayName": "Elena Rostova",
        "department": "plumbing_drainage",
        "skills": ["plumbing", "excavation", "drainage"],
        "zone": "campus_east",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7761,
        "lastLng": -122.4176,
    },
    {
        "workerId": "wkr_darius",
        "userId": "worker-road-001",
        "displayName": "Darius Vance",
        "department": "roads",
        "skills": ["roads", "surface_repair", "asphalt"],
        "zone": "campus_all",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7757,
        "lastLng": -122.4182,
    },
    {
        "workerId": "wkr_liam",
        "userId": "worker-general-001",
        "displayName": "Liam O'Connor",
        "department": "facilities",
        "skills": ["general_facilities", "safety_signage"],
        "zone": "campus_all",
        "availability": "AVAILABLE",
        "activeMissionId": None,
        "lastLat": 37.7764,
        "lastLng": -122.4171,
    },
]

def seed_campus_district(force: bool = False, seed_reports: bool = None) -> int:
    if seed_reports is None:
        seed_reports = ENABLE_LOCAL_MOCK

    # 1. Seed workers
    for w in CAMPUS_WORKERS:
        Database.save_worker(w)

    if not seed_reports:
        return len(CAMPUS_WORKERS)

    if not force and not ENABLE_LOCAL_MOCK:
        existing = Database.get_report("RG-R-101")
        if existing:
            return 0

    # 2. Seed initial canonical reports & missions if explicitly requested
    sample_report = {
        "reportId": "RG-R-101",
        "reporterId": "resident-asim-001",
        "organizationId": "campus-district-01",
        "category": "streetlights",
        "description": "Streetlight outside Gate 2 has been inactive for three evenings.",
        "lat": 37.7751,
        "lng": -122.4190,
        "geohash": "37775_-122419",
        "status": "ASSIGNED",
        "verificationConfidence": 0.97,
        "duplicateOf": None,
        "evidenceRefs": ["reports/RG-R-101/before/sample-light-1.jpg"],
    }
    Database.save_report(sample_report)

    sample_mission = {
        "missionId": "RG-M-201",
        "organizationId": "campus-district-01",
        "reportIds": ["RG-R-101"],
        "category": "streetlights",
        "title": "Restore lighting at North Gate 2",
        "priority": 85,
        "riskBand": "HIGH",
        "requiredSkill": "street_lighting",
        "department": "electrical",
        "assignedWorkerId": "wkr_ahmed",
        "status": "ASSIGNED",
        "slaDueAt": "2026-09-10T17:00:00Z",
        "requiresHumanApproval": False,
        "version": 1,
    }
    Database.save_mission(sample_mission)

    Database.record_event(
        mission_id="RG-M-201",
        event_type="MISSION_CREATED",
        actor_type="AGENT",
        actor_id="MissionAgent",
        payload={"title": sample_mission["title"], "priority": 85}
    )
    Database.record_event(
        mission_id="RG-M-201",
        event_type="WORKER_ASSIGNED",
        actor_type="AGENT",
        actor_id="ResourceAgent",
        payload={"workerId": "wkr_ahmed", "matchScore": 0.96}
    )

    return len(CAMPUS_ASSETS) + len(CAMPUS_WORKERS)

if __name__ == "__main__":
    count = seed_campus_district()
    print(f"Successfully seeded Campus District with {count} items.")
