import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.api.db import Database

def run_scenario(scenario: str) -> dict:
    if scenario == "HEAVY_RAIN":
        # 1. Primary Drain Report
        r1 = {
            "reportId": "SIM-DR-01",
            "reporterId": "resident-rain-1",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "Storm drain overflowing outside Primary School entrance. Water accumulating on walkway.",
            "lat": 37.7754,
            "lng": -122.4187,
            "geohash": "37775_-122418",
            "status": "ASSIGNED",
            "verificationConfidence": 0.98,
            "duplicateOf": None,
            "evidenceRefs": ["reports/SIM-DR-01/before/drain-standing-water.jpg"],
        }
        # 2. Duplicate Drain Report (Same location & category)
        r2 = {
            "reportId": "SIM-DR-02",
            "reporterId": "resident-rain-2",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "School gate drain completely blocked by leaves and debris.",
            "lat": 37.77542,
            "lng": -122.41869,
            "geohash": "37775_-122418",
            "status": "MERGED",
            "verificationConfidence": 0.96,
            "duplicateOf": "SIM-DR-01",
            "evidenceRefs": ["reports/SIM-DR-02/before/drain-leaves.jpg"],
        }
        # 3. Third Duplicate Drain Report
        r3 = {
            "reportId": "SIM-DR-03",
            "reporterId": "resident-rain-3",
            "organizationId": "campus-district-01",
            "category": "blocked_drains",
            "description": "Water backing up near kindergarten playground.",
            "lat": 37.77539,
            "lng": -122.41871,
            "geohash": "37775_-122418",
            "status": "MERGED",
            "verificationConfidence": 0.97,
            "duplicateOf": "SIM-DR-01",
            "evidenceRefs": [],
        }
        # 4. Road Damage Report
        r4 = {
            "reportId": "SIM-RD-01",
            "reporterId": "resident-driver-1",
            "organizationId": "campus-district-01",
            "category": "potholes",
            "description": "Deep pothole filled with rainwater on Engineering Lane.",
            "lat": 37.7758,
            "lng": -122.4181,
            "geohash": "37775_-122418",
            "status": "ASSIGNED",
            "verificationConfidence": 0.92,
            "duplicateOf": None,
            "evidenceRefs": ["reports/SIM-RD-01/before/pothole-water.jpg"],
        }

        Database.save_report(r1)
        Database.save_report(r2)
        Database.save_report(r3)
        Database.save_report(r4)

        # Create High-Risk Mission with Human Approval Required (School adjacent!)
        mission_drain = {
            "missionId": "SIM-M-DRAIN",
            "organizationId": "campus-district-01",
            "reportIds": ["SIM-DR-01", "SIM-DR-02", "SIM-DR-03"],
            "category": "blocked_drains",
            "title": "Clear Primary School Gate Storm Drain (Standing Water)",
            "priority": 95,
            "riskBand": "CRITICAL",
            "requiredSkill": "drainage",
            "department": "plumbing_drainage",
            "assignedWorkerId": "wkr_marcus",
            "status": "ASSIGNED",
            "slaDueAt": "2026-09-10T12:00:00Z",
            "requiresHumanApproval": True,
            "version": 1,
        }
        Database.save_mission(mission_drain)

        # Create HITL Decision for Guardian approval
        decision = {
            "decisionId": "DEC-RAIN-001",
            "missionId": "SIM-M-DRAIN",
            "type": "SAFETY_CRITICAL_ESCALATION",
            "proposedAction": "Escalate priority to CRITICAL and dispatch emergency suction equipment",
            "agentName": "RiskAgent",
            "confidence": 0.96,
            "evidence": [
                {"fact": "School gate location with high child pedestrian traffic"},
                {"fact": "Standing water depth exceeds 10cm"},
                {"fact": "3 corroborating citizen reports merged autonomously"}
            ],
            "status": "PENDING",
            "createdAt": Database.now_iso(),
        }
        Database.save_decision(decision)

        return {
            "raw_reports_injected": 4,
            "duplicates_merged": 2,
            "canonical_missions_spawned": 2,
            "hitl_decisions_created": 1,
            "critical_missions": 1,
            "summary": "Heavy Rain triggered: 3 drain reports collapsed into 1 critical school mission. Guardian triggered Human-in-the-Loop decision."
        }

    elif scenario == "ELECTRICAL_FAILURE":
        r = {
            "reportId": "SIM-LT-01",
            "reporterId": "resident-campus-1",
            "organizationId": "campus-district-01",
            "category": "streetlights",
            "description": "Entire corridor from Gate 2 to Library completely dark. Multiple lights out.",
            "lat": 37.7755,
            "lng": -122.4185,
            "geohash": "37775_-122418",
            "status": "ASSIGNED",
            "verificationConfidence": 0.99,
            "duplicateOf": None,
            "evidenceRefs": [],
        }
        Database.save_report(r)
        mission = {
            "missionId": "SIM-M-ELEC",
            "organizationId": "campus-district-01",
            "reportIds": ["SIM-LT-01"],
            "category": "streetlights",
            "title": "Substation Feeder Outage — Gate 2 Corridor",
            "priority": 90,
            "riskBand": "HIGH",
            "requiredSkill": "street_lighting",
            "department": "electrical",
            "assignedWorkerId": "wkr_ahmed",
            "status": "ASSIGNED",
            "slaDueAt": "2026-09-10T15:00:00Z",
            "requiresHumanApproval": False,
            "version": 1,
        }
        Database.save_mission(mission)
        return {
            "raw_reports_injected": 1,
            "canonical_missions_spawned": 1,
            "summary": "Electrical failure simulated: corridor streetlight failure assigned to Ahmed."
        }
    else:
        return {"summary": "Normal operational day simulated. Routine background checks running."}
