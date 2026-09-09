from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class MissionStatus(str, Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    ASSIGNED = "ASSIGNED"
    EN_ROUTE = "EN_ROUTE"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETION_SUBMITTED = "COMPLETION_SUBMITTED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"
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
    status: MissionStatus
    sla_due_at: str
    requires_human_approval: bool = False
    version: int = 1
    created_at: str
    updated_at: str
