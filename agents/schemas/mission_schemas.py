from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MissionStatus(str, Enum):
    # Lifecycle states
    SUBMITTED = "SUBMITTED"
    GEOCODED = "GEOCODED"
    TRIAGED = "TRIAGED"
    DUPLICATE_CHECKED = "DUPLICATE_CHECKED"
    RISK_ASSESSED = "RISK_ASSESSED"
    TECHNICIAN_MATCHED = "TECHNICIAN_MATCHED"
    MATCHED = "MATCHED"
    MISSION_CREATED = "MISSION_CREATED"
    NOTIFICATION_PENDING = "NOTIFICATION_PENDING"
    NOTIFIED = "NOTIFIED"
    AWAITING_ACCEPTANCE = "AWAITING_ACCEPTANCE"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EN_ROUTE = "EN_ROUTE"
    ON_SITE = "ON_SITE"
    REPAIR_IN_PROGRESS = "REPAIR_IN_PROGRESS"
    PROOF_SUBMITTED = "PROOF_SUBMITTED"
    AI_VERIFYING = "AI_VERIFYING"
    VERIFYING = "VERIFYING"
    VERIFIED = "VERIFIED"
    COMMUNITY_CONFIRMATION = "COMMUNITY_CONFIRMATION"
    CLOSED = "CLOSED"

    # Failure / Fallback states
    DUPLICATE = "DUPLICATE"
    DUPLICATE_MERGED = "DUPLICATE_MERGED"
    NO_TECHNICIAN_AVAILABLE = "NO_TECHNICIAN_AVAILABLE"
    TECHNICIAN_REJECTED = "TECHNICIAN_REJECTED"
    NOTIFICATION_FAILED = "NOTIFICATION_FAILED"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    ESCALATED = "ESCALATED"
    CANCELLED = "CANCELLED"
    HITL_PENDING = "HITL_PENDING"

    # Compatibility aliases
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETION_SUBMITTED = "COMPLETION_SUBMITTED"
    REOPENED = "REOPENED"

class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class WorkerOutcome(str, Enum):
    REPAIRED = "REPAIRED"
    TEMPORARY_REPAIR = "TEMPORARY_REPAIR"
    REQUIRES_SPECIALIST = "REQUIRES_SPECIALIST"
    UNABLE_TO_RESOLVE = "UNABLE_TO_RESOLVE"

class MissionCreatePayload(BaseModel):
    title: str
    category: str
    priority: int = Field(ge=1, le=100)
    risk_band: RiskBand
    required_skill: str
    department: str
    report_ids: List[str]
    sla_hours: int = 8
    requires_human_approval: bool = False

class WorkerCompletionPayload(BaseModel):
    outcome: WorkerOutcome
    notes: str = Field(min_length=5, max_length=1000)
    after_photo_ref: str = Field(description="S3 reference to after repair photo")
    materials_used: Optional[List[str]] = []

class MissionDetail(BaseModel):
    mission_id: str
    organization_id: str
    report_ids: List[str]
    category: str
    title: str
    priority: int
    risk_band: RiskBand
    required_skill: str
    department: str
    assigned_worker_id: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    match_score: Optional[float] = None
    match_factors: Optional[Dict[str, Any]] = None
    notification_status: Optional[str] = None
    technician_response: Optional[str] = None
    status: MissionStatus
    sla_due_at: str
    requires_human_approval: bool = False
    location: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    description: Optional[str] = None
    photo_evidence: Optional[str] = None
    risk_score: Optional[int] = None
    proof_of_repair: Optional[Dict[str, Any]] = None
    verification_result: Optional[Dict[str, Any]] = None
    community_confirmation: Optional[Dict[str, Any]] = None
    execution_trace: Optional[List[Dict[str, Any]]] = None
    version: int = 1
    created_at: str
    updated_at: str
