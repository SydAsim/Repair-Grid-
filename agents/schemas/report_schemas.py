from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class ReportCategory(str, Enum):
    STREETLIGHTS = "streetlights"
    POTHOLES = "potholes"
    BLOCKED_DRAINS = "blocked_drains"
    OTHER = "other"

class ReportStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    GEOCODED = "GEOCODED"
    TRIAGED = "TRIAGED"
    DUPLICATE_CHECKED = "DUPLICATE_CHECKED"
    MISSION_CREATED = "MISSION_CREATED"
    AWAITING_ACCEPTANCE = "AWAITING_ACCEPTANCE"
    ACCEPTED = "ACCEPTED"
    EN_ROUTE = "EN_ROUTE"
    ON_SITE = "ON_SITE"
    REPAIR_IN_PROGRESS = "REPAIR_IN_PROGRESS"
    PROOF_SUBMITTED = "PROOF_SUBMITTED"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    VERIFYING = "VERIFYING"
    VERIFIED = "VERIFIED"
    COMMUNITY_CONFIRMATION = "COMMUNITY_CONFIRMATION"
    MERGED = "MERGED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class ReportCreateRequest(BaseModel):
    category: ReportCategory = Field(description="One of streetlights, potholes, or blocked_drains")
    description: str = Field(min_length=5, max_length=1000, description="Citizen problem description")
    lat: float = Field(ge=-90, le=90, description="Latitude of reported problem")
    lng: float = Field(ge=-180, le=180, description="Longitude of reported problem")
    location_name: Optional[str] = Field(None, description="Human readable location address, street, or landmark")
    reporter_name: Optional[str] = Field(None, description="Resident or citizen reporter name")
    image_url: Optional[str] = Field(None, description="S3 presigned uploaded image key or URL")
    voice_note_url: Optional[str] = Field(None, description="Optional voice audio key")

class ResolutionFeedbackRequest(BaseModel):
    feedback: str = Field(pattern="^(FIXED|STILL_BROKEN|UNVERIFIABLE)$")
    comments: Optional[str] = Field(None, max_length=500)

class ReportResponse(BaseModel):
    report_id: str
    reporter_id: str
    reporter_name: Optional[str] = None
    organization_id: str
    category: ReportCategory
    description: str
    lat: float
    lng: float
    location_name: Optional[str] = None
    geohash: str
    status: ReportStatus
    verification_confidence: float = 0.0
    duplicate_of: Optional[str] = None
    evidence_refs: List[str] = []
    before_photo: Optional[str] = None
    after_photo: Optional[str] = None
    technician_notes: Optional[str] = None
    controller_approved_at: Optional[str] = None
    controller_notes: Optional[str] = None
    mission_id: Optional[str] = None
    created_at: str
    updated_at: str

class PublicIssueMapItem(BaseModel):
    id: str
    category: ReportCategory
    status: str
    lat: float
    lng: float
    priority: int
    created_at: str
    title: str
    location_name: Optional[str] = None
    reporter_name: Optional[str] = None
    before_photo: Optional[str] = None
    after_photo: Optional[str] = None
    technician_name: Optional[str] = None
    approved_at: Optional[str] = None
