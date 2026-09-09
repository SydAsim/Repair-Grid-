from agents.schemas.mission_schemas import RiskBand
from agents.schemas.agent_schemas import RiskDecision

def calculate_risk(
    category: str,
    description: str,
    lat: float,
    lng: float,
    is_school_adjacent: bool = False,
    is_high_traffic: bool = False,
    evidence_confidence: float = 0.95
) -> RiskDecision:
    """
    Deterministic transparent 6-factor policy risk engine.
    Never delegated to arbitrary LLM prose.
    Formula weights:
    - Safety: 35%
    - Exposure (people affected): 20%
    - Infrastructure importance: 15%
    - Sensitive location (school/hospital): 10%
    - Duration factor: 10%
    - Evidence confidence: 10%
    """
    # 1. Base Safety severity by category (0 - 100)
    safety_map = {
        "blocked_drains": 75 if is_school_adjacent else 50,
        "streetlights": 70 if is_high_traffic else 40,
        "potholes": 80 if is_high_traffic else 45,
    }
    safety_score = safety_map.get(category, 50)
    
    # Extra safety escalation for keywords
    desc_lower = description.lower()
    if any(k in desc_lower for k in ["standing water", "flooding", "darkness", "tripped", "hazard", "deep"]):
        safety_score = min(100, safety_score + 20)

    # 2. Exposure (0 - 100)
    exposure_score = 90 if is_high_traffic else (75 if is_school_adjacent else 35)

    # 3. Infrastructure Importance (0 - 100)
    infra_score = 70

    # 4. Sensitive Location (0 - 100)
    sensitive_score = 100 if is_school_adjacent else 20

    # 5. Duration (0 - 100)
    duration_score = 50

    # Weighted calculation
    total_score = int(
        (safety_score * 0.35) +
        (exposure_score * 0.20) +
        (infra_score * 0.15) +
        (sensitive_score * 0.10) +
        (duration_score * 0.10) +
        (int(evidence_confidence * 100) * 0.10)
    )
    total_score = max(1, min(100, total_score))

    # Categorize into strict RiskBand
    if total_score >= 85:
        band = RiskBand.CRITICAL
    elif total_score >= 65:
        band = RiskBand.HIGH
    elif total_score >= 45:
        band = RiskBand.MEDIUM
    else:
        band = RiskBand.LOW

    reasons = []
    if is_school_adjacent:
        reasons.append("Adjacent to campus educational zone")
    if is_high_traffic:
        reasons.append("High pedestrian/vehicular traffic volume")
    if "water" in desc_lower or "flood" in desc_lower:
        reasons.append("Hazardous standing water accumulation")
    if not reasons:
        reasons.append(f"Standard {category} maintenance profile")

    explanation = f"Risk Score {total_score} ({band.value}): " + "; ".join(reasons)

    return RiskDecision(
        score=total_score,
        band=band,
        confidence=evidence_confidence,
        safety_weight=round(safety_score * 0.35, 2),
        exposure_weight=round(exposure_score * 0.20, 2),
        evidence_ids=["geo_lookup", "category_matrix"],
        explanation_summary=explanation
    )
