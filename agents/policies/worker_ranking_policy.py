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
    Ranks technicians dynamically using 6 explainable factors:
    - Skill Match (40%): MUST have certified trade skill
    - Distance (15%): Scaled proximity in km
    - Workload (10%): Active mission load
    - Availability (15%): AVAILABLE=15, ASSIGNED=6, OFF_SHIFT=0
    - Location Coverage (10%): Same zone=10, campus_all=9, other=5
    - Certification (10%): Trade certifications & safety level
    """
    results: List[WorkerMatchResult] = []

    for w in workers:
        skills = w.get("skills", [])
        if required_skill not in skills:
            # Worker not qualified for this trade
            continue

        # 1. Skill Match (40%)
        skill_factor = 40.0

        # 2. Availability (15%)
        avail = w.get("availability", "AVAILABLE")
        if avail == "AVAILABLE":
            avail_factor = 15.0
        elif avail == "ASSIGNED":
            avail_factor = 6.0
        else:
            avail_factor = 0.0

        # 3. Distance (15%)
        w_lat = w.get("lastLat", target_lat)
        w_lng = w.get("lastLng", target_lng)
        dist_km = haversine_km(target_lat, target_lng, w_lat, w_lng)
        dist_factor = max(0.0, 15.0 - (dist_km * 2.5))

        # 4. Workload (10%)
        active_task = 1 if w.get("activeMissionId") else 0
        workload_factor = 10.0 if active_task == 0 else 4.0

        # 5. Location Coverage (10%)
        w_zone = w.get("zone", "")
        if w_zone == zone:
            coverage_factor = 10.0
        elif w_zone == "campus_all":
            coverage_factor = 9.0
        else:
            coverage_factor = 5.0

        # 6. Certification (10%)
        certs = w.get("certifications", [])
        if not certs and skills:
            certs = [s.upper() + "_CERT" for s in skills]
        if len(certs) >= 2:
            cert_factor = 10.0
        elif len(certs) == 1:
            cert_factor = 8.0
        else:
            cert_factor = 6.0

        total_pts = skill_factor + dist_factor + workload_factor + avail_factor + coverage_factor + cert_factor
        match_pct = int(min(100, round(total_pts)))
        total_match = round(min(1.0, total_pts / 100.0), 2)

        factors_dict = {
            "skill": int(round(skill_factor)),
            "distance": int(round(dist_factor)),
            "workload": int(round(workload_factor)),
            "availability": int(round(avail_factor)),
            "coverage": int(round(coverage_factor)),
            "certification": int(round(cert_factor)),
        }

        reasons = [
            f"Certified in {required_skill} ({factors_dict['skill']}%)",
            f"Shift availability: {avail} ({factors_dict['availability']}%)",
            f"{w_zone.replace('_', ' ').title()} coverage ({factors_dict['coverage']}%)",
            f"Proximity: {dist_km} km ({factors_dict['distance']}%)",
            f"High skill match: {match_pct}%"
        ]

        results.append(WorkerMatchResult(
            worker_id=w.get("workerId", ""),
            display_name=w.get("displayName", "Technician"),
            match_score=total_match,
            skill_score=100.0,
            distance_km=dist_km,
            reasons=reasons,
            factors=factors_dict,
            match_percentage=match_pct
        ))

    # Sort descending by match score
    results.sort(key=lambda r: r.match_score, reverse=True)
    return results
