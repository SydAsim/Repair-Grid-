import math
from typing import List, Dict, Any, Optional
from agents.schemas.agent_schemas import WorkerMatchResult

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def rank_workers(
    required_skill: str,
    target_lat: float,
    target_lng: float,
    zone: str,
    workers: List[Dict[str, Any]]
) -> List[WorkerMatchResult]:
    """
    Ranks technicians deterministically:
    - Skill match (40%): MUST have required skill, otherwise excluded (0 fit)
    - Availability (25%): AVAILABLE=100%, ASSIGNED=30%, OFF_SHIFT=0%
    - Distance (15%): Scaled 0 to 5 km
    - Active workload (10%): 0 tasks=100%, 1 task=50%
    - Zone match (5%): Same zone=100%, campus_all=80%, other=50%
    - Specialization match (5%)
    """
    results: List[WorkerMatchResult] = []

    for w in workers:
        skills = w.get("skills", [])
        if required_skill not in skills:
            # Worker not qualified for this trade
            continue

        skill_score = 100.0

        # Availability
        avail = w.get("availability", "AVAILABLE")
        avail_score = 100.0 if avail == "AVAILABLE" else (30.0 if avail == "ASSIGNED" else 0.0)

        # Distance
        w_lat = w.get("lastLat", target_lat)
        w_lng = w.get("lastLng", target_lng)
        dist_km = haversine_km(target_lat, target_lng, w_lat, w_lng)
        dist_score = max(0.0, 100.0 - (dist_km * 20.0))

        # Workload
        active_task = 1 if w.get("activeMissionId") else 0
        workload_score = 100.0 if active_task == 0 else 40.0

        # Zone
        w_zone = w.get("zone", "")
        zone_score = 100.0 if w_zone == zone else (80.0 if w_zone == "campus_all" else 50.0)

        total_match = (
            (skill_score * 0.40) +
            (avail_score * 0.25) +
            (dist_score * 0.15) +
            (workload_score * 0.10) +
            (zone_score * 0.05) +
            (5.0) # Base specialization
        )
        total_match = round(min(100.0, total_match) / 100.0, 2)

        reasons = [
            f"Qualified in {required_skill}",
            f"{avail} status",
            f"{dist_km} km from site"
        ]

        results.append(WorkerMatchResult(
            worker_id=w.get("workerId", ""),
            display_name=w.get("displayName", "Technician"),
            match_score=total_match,
            skill_score=skill_score,
            distance_km=dist_km,
            reasons=reasons
        ))

    # Sort descending by match score
    results.sort(key=lambda r: r.match_score, reverse=True)
    return results
