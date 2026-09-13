import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.api.db import Database
from agents.graphs.main_graph import RepairGridGraph

def run_scenario(scenario: str) -> dict:
    Database.seed_workers()
    if scenario == "HEAVY_RAIN":
        # 1. Primary Drain Report outside Primary School
        r1 = {
            "reportId": "SIM-DR-01",
            "reporterId": "resident-rain-1",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "Storm drain overflowing standing water outside school gate. Water depth exceeds 10cm.",
            "lat": 37.7754,
            "lng": -122.4187,
            "locationName": "Primary School Gate Storm Drain",
            "geohash": "37775_-122418",
            "status": "ASSIGNED",
            "verificationConfidence": 0.98,
            "duplicateOf": None,
            "evidenceRefs": ["https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800"],
        }
        # 2. Duplicate Drain Report within 15m radius
        r2 = {
            "reportId": "SIM-DR-02",
            "reporterId": "resident-rain-2",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "School gate drain completely blocked by leaves and debris. Water overflowing onto pathway.",
            "lat": 37.77542,
            "lng": -122.41869,
            "locationName": "Primary School Gate Walkway",
            "geohash": "37775_-122418",
            "status": "MERGED",
            "verificationConfidence": 0.96,
            "duplicateOf": "SIM-DR-01",
            "evidenceRefs": ["https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800"],
        }
        # 3. Third Duplicate Drain Report
        r3 = {
            "reportId": "SIM-DR-03",
            "reporterId": "resident-rain-3",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "Water backing up near kindergarten playground adjacent to school gate.",
            "lat": 37.77539,
            "lng": -122.41871,
            "locationName": "Kindergarten Playground",
            "geohash": "37775_-122418",
            "status": "MERGED",
            "verificationConfidence": 0.97,
            "duplicateOf": "SIM-DR-01",
            "evidenceRefs": [],
        }
        # 4. Road Damage Report on Engineering Lane
        r4 = {
            "reportId": "SIM-RD-01",
            "reporterId": "resident-driver-1",
            "organizationId": "campus-district-01",
            "category": "potholes",
            "description": "Deep pothole filled with rainwater on Engineering Lane main artery.",
            "lat": 37.7758,
            "lng": -122.4181,
            "locationName": "Engineering Lane Pavement",
            "geohash": "37775_-122418",
            "status": "AWAITING_ACCEPTANCE",
            "verificationConfidence": 0.92,
            "duplicateOf": None,
            "evidenceRefs": ["https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"],
        }

        Database.save_report(r1)
        Database.save_report(r2)
        Database.save_report(r3)
        Database.save_report(r4)

        # Create High-Risk Critical Drain Mission linked to r1, r2, r3
        mission_drain = {
            "missionId": "SIM-M-DRAIN",
            "reportId": "SIM-DR-01",
            "reportIds": ["SIM-DR-01", "SIM-DR-02", "SIM-DR-03"],
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "title": "Clear Primary School Gate Storm Drain (Standing Water)",
            "priority": 95,
            "riskScore": 95,
            "riskBand": "CRITICAL",
            "riskLevel": "CRITICAL",
            "requiredSkill": "drainage",
            "department": "plumbing_drainage",
            "assignedWorkerId": "wkr_marcus",
            "assignedTechnicianId": "wkr_marcus",
            "assignedTechnicianName": "Marcus Thorne",
            "matchScore": 0.96,
            "matchScorePct": 96,
            "matchFactors": {"skill": 40, "distance": 15, "workload": 10, "availability": 15, "coverage": 10, "certification": 6},
            "status": "HITL_PENDING",
            "notificationStatus": "PENDING_APPROVAL",
            "technicianResponse": "UNASSIGNED",
            "slaDueAt": "2026-09-10T12:00:00Z",
            "requiresHumanApproval": True,
            "location": "Primary School Gate Storm Drain",
            "coordinates": {"lat": 37.7754, "lng": -122.4187},
            "lat": 37.7754,
            "lng": -122.4187,
            "description": r1["description"],
            "photoEvidence": r1["evidenceRefs"][0],
            "duplicateStatus": "2_MERGED",
            "version": 1,
        }
        Database.save_mission(mission_drain)

        # Create HITL Decision for Guardian approval
        decision = {
            "decisionId": "DEC-RAIN-001",
            "missionId": "SIM-M-DRAIN",
            "type": "SAFETY_CRITICAL_ESCALATION",
            "proposedAction": "Escalate priority to CRITICAL and dispatch emergency drainage unit",
            "agentName": "GuardianAgent",
            "confidence": 0.96,
            "evidence": [
                {"fact": "School gate location with high child pedestrian traffic (Risk Score: 95)"},
                {"fact": "Standing water depth exceeds 10cm on walkway artery"},
                {"fact": "3 corroborating citizen reports merged autonomously within 25m radius"}
            ],
            "status": "PENDING",
            "createdAt": Database.now_iso(),
        }
        Database.save_decision(decision)

        # Create Road Mission for Engineering Lane
        mission_road = {
            "missionId": "SIM-M-ROAD",
            "reportId": "SIM-RD-01",
            "reportIds": ["SIM-RD-01"],
            "organizationId": "campus-district-01",
            "category": "potholes",
            "title": "Repair Rainwater Pothole — Engineering Lane",
            "priority": 75,
            "riskScore": 75,
            "riskBand": "HIGH",
            "riskLevel": "HIGH",
            "requiredSkill": "surface_repair",
            "department": "roads",
            "assignedWorkerId": "wkr_darius",
            "assignedTechnicianId": "wkr_darius",
            "assignedTechnicianName": "Darius Vance",
            "matchScore": 0.94,
            "matchScorePct": 94,
            "matchFactors": {"skill": 40, "distance": 14, "workload": 10, "availability": 15, "coverage": 9, "certification": 6},
            "status": "AWAITING_ACCEPTANCE",
            "notificationStatus": "NOTIFIED",
            "technicianResponse": "AWAITING_ACCEPTANCE",
            "slaDueAt": "2026-09-10T16:00:00Z",
            "requiresHumanApproval": False,
            "location": "Engineering Lane Pavement",
            "coordinates": {"lat": 37.7758, "lng": -122.4181},
            "lat": 37.7758,
            "lng": -122.4181,
            "description": r4["description"],
            "photoEvidence": r4["evidenceRefs"][0],
            "duplicateStatus": "UNIQUE",
            "version": 1,
        }
        Database.save_mission(mission_road)

        # Record events for audit stream
        Database.record_event("SIM-M-DRAIN", "REPORT_SUBMITTED", "RESIDENT", "resident-rain-1", {"reportId": "SIM-DR-01"})
        Database.record_event("SIM-M-DRAIN", "DUPLICATE_MERGED", "AGENT", "DuplicateAgent", {"mergedReportId": "SIM-DR-02", "canonicalId": "SIM-DR-01"})
        Database.record_event("SIM-M-DRAIN", "DUPLICATE_MERGED", "AGENT", "DuplicateAgent", {"mergedReportId": "SIM-DR-03", "canonicalId": "SIM-DR-01"})
        Database.record_event("SIM-M-DRAIN", "RISK_ASSESSED", "AGENT", "RiskAgent", {"riskScore": 95, "riskBand": "CRITICAL", "reason": "School adjacent standing water"})
        Database.record_event("SIM-M-DRAIN", "HITL_INTERRUPT", "AGENT", "GuardianAgent", {"decisionId": "DEC-RAIN-001", "reason": "Safety threshold exceeded"})
        Database.record_event("SIM-M-ROAD", "REPORT_SUBMITTED", "RESIDENT", "resident-driver-1", {"reportId": "SIM-RD-01"})
        Database.record_event("SIM-M-ROAD", "TECHNICIAN_NOTIFIED", "AGENT", "NotificationAgent", {"technicianId": "wkr_darius", "displayName": "Darius Vance"})

        return {
            "raw_reports_injected": 4,
            "duplicates_merged": 2,
            "canonical_missions_spawned": 2,
            "hitl_decisions_created": 1,
            "critical_missions": 1,
            "primary_mission_id": "SIM-M-DRAIN",
            "secondary_mission_id": "SIM-M-ROAD",
            "summary": "Heavy Rain scenario executed: 3 drain reports collapsed into 1 critical school mission. Guardian triggered Human-in-the-Loop decision."
        }

    elif scenario == "ELECTRICAL_FAILURE":
        r = {
            "reportId": "SIM-LT-01",
            "reporterId": "resident-campus-1",
            "organizationId": "campus-district-01",
            "category": "streetlights",
            "description": "High-voltage street-light fault outside Gate 2 North Gate campus. Exposed electrical conduit near school crossing.",
            "lat": 37.7755,
            "lng": -122.4185,
            "locationName": "North Gate Campus Gate 2",
            "geohash": "37775_-122418",
            "status": "SUBMITTED",
            "verificationConfidence": 0.0,
            "duplicateOf": None,
            "evidenceRefs": ["https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800"],
        }
        Database.save_report(r)
        Database.record_event(
            mission_id="SIM-LT-01",
            event_type="REPORT_SUBMITTED",
            actor_type="RESIDENT",
            actor_id="resident-campus-1",
            payload={"category": "streetlights", "description": r["description"], "location": r["locationName"]}
        )
        res = RepairGridGraph.execute({
            "report_id": "SIM-LT-01",
            "category": "streetlights",
            "description": r["description"],
            "lat": r["lat"],
            "lng": r["lng"],
            "location": r["locationName"],
            "photo_evidence": r["evidenceRefs"][0]
        })
        return {
            "raw_reports_injected": 1,
            "canonical_missions_spawned": 1,
            "mission_id": res.get("mission_id"),
            "summary": f"Electrical failure simulated: corridor fault matched to Ahmed Khan (Mission {res.get('mission_id')})."
        }
    else:
        return {"summary": "Normal operational day simulated. Routine background checks running."}
