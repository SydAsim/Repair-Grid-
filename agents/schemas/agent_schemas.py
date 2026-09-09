from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from .mission_schemas import RiskBand

class IntakeEnrichment(BaseModel):
    category: str
    summary: str
    confidence: float = Field(ge=0.0, le=1.0)
    detected_infrastructure: str
    needs_vision_verification: bool = True

class DuplicateDecision(BaseModel):
    is_duplicate: bool
    canonical_report_id: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    distance_meters: float
    reason: str

class VerificationResult(BaseModel):
    is_valid_issue: bool
    confidence: float = Field(ge=0.0, le=1.0)
    asset_identified: bool
    description_visual_match: bool
    explanation: str

class RiskDecision(BaseModel):
    score: int = Field(ge=1, le=100)
    band: RiskBand
    confidence: float = Field(ge=0.0, le=1.0)
    safety_weight: float
    exposure_weight: float
    evidence_ids: List[str]
    explanation_summary: str = Field(description="Safe, user-facing concise operational rationale")

class OwnershipDecision(BaseModel):
    department: str
    required_skill: str
    confidence: float
    ambiguous: bool
    explanation_summary: str

class WorkerMatchResult(BaseModel):
    worker_id: str
    display_name: str
    match_score: float
    skill_score: float
    distance_km: float
    reasons: List[str]

class GuardianCheckResult(BaseModel):
    action_allowed: bool
    requires_human: bool
    rule_triggered: Optional[str] = None
    policy_reason: str
    risk_band: RiskBand

class ProofOfRepairVerification(BaseModel):
    same_location: bool
    same_asset: bool
    condition_improved: bool
    evidence_quality: float
    confidence: float
    recommendation: Literal["CLOSE", "OPERATOR_REVIEW", "REPLAN_REOPEN"]
    explanation: str
