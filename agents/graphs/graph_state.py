from typing import TypedDict, Optional, List, Dict, Any
from agents.schemas.agent_schemas import (
    IntakeEnrichment,
    DuplicateDecision,
    VerificationResult,
    RiskDecision,
    OwnershipDecision,
    WorkerMatchResult,
    GuardianCheckResult,
)

class RepairGridGraphState(TypedDict, total=False):
    # Ingestion input
    report_id: str
    category: str
    description: str
    lat: float
    lng: float
    image_url: Optional[str]

    # Node enrichment states
    enrichment: Optional[IntakeEnrichment]
    duplicate_decision: Optional[DuplicateDecision]
    verification_result: Optional[VerificationResult]
    risk_decision: Optional[RiskDecision]
    ownership_decision: Optional[OwnershipDecision]

    # Mission & assignment
    mission_id: Optional[str]
    assigned_worker: Optional[WorkerMatchResult]
    guardian_check: Optional[GuardianCheckResult]

    # Human-in-the-Loop interruption
    requires_hitl: bool
    hitl_reason: Optional[str]
    hitl_decision_id: Optional[str]

    # Flow lifecycle
    is_duplicate_merged: bool
    status: str # INTAKE | MERGED | VERIFIED | MISSION_CREATED | ASSIGNED | HITL_PAUSED | CLOSED
    step_count: int
    execution_trace: List[Dict[str, Any]]
