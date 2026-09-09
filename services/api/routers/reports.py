import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ..middleware.auth import AuthenticatedUser, get_current_user, require_roles
from ..db import Database
from agents.schemas.report_schemas import (
    ReportCreateRequest, 
    ReportResponse, 
    ResolutionFeedbackRequest, 
    PublicIssueMapItem,
    ReportStatus
)

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=ReportResponse)
def create_report(
    req: ReportCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    report_id = f"RG-R-{uuid.uuid4().hex[:6].upper()}"
    evidence_refs = [req.image_url] if req.image_url else []
    
    # Calculate simple geohash placeholder for spatial clustering
    lat_prefix = f"{req.lat:.3f}".replace(".", "")
    lng_prefix = f"{req.lng:.3f}".replace(".", "")
    geohash = f"{lat_prefix}_{lng_prefix}"

    report_item = {
        "reportId": report_id,
        "reporterId": current_user.user_id,
        "organizationId": "campus-district-01",
        "category": req.category.value,
        "description": req.description,
        "lat": req.lat,
        "lng": req.lng,
        "geohash": geohash,
        "status": ReportStatus.SUBMITTED.value,
        "verificationConfidence": 0.0,
        "duplicateOf": None,
        "evidenceRefs": evidence_refs,
    }

    saved = Database.save_report(report_item)
    Database.record_event(
        mission_id=report_id,
        event_type="REPORT_CREATED",
        actor_type="RESIDENT",
        actor_id=current_user.user_id,
        payload={"category": req.category.value, "description": req.description}
    )

    return ReportResponse(
        report_id=saved["reportId"],
        reporter_id=saved["reporterId"],
        organization_id=saved["organizationId"],
        category=saved["category"],
        description=saved["description"],
        lat=saved["lat"],
        lng=saved["lng"],
        geohash=saved["geohash"],
        status=saved["status"],
        verification_confidence=saved["verificationConfidence"],
        duplicate_of=saved["duplicateOf"],
        evidence_refs=saved["evidenceRefs"],
        created_at=saved["createdAt"],
        updated_at=saved["updatedAt"]
    )

@router.get("/mine", response_model=List[ReportResponse])
def get_my_reports(current_user: AuthenticatedUser = Depends(get_current_user)):
    all_reports = Database.list_reports(limit=100)
    user_reports = [r for r in all_reports if r.get("reporterId") == current_user.user_id]
    
    return [
        ReportResponse(
            report_id=r["reportId"],
            reporter_id=r["reporterId"],
            organization_id=r["organizationId"],
            category=r["category"],
            description=r["description"],
            lat=r["lat"],
            lng=r["lng"],
            geohash=r["geohash"],
            status=r["status"],
            verification_confidence=r.get("verificationConfidence", 0.0),
            duplicate_of=r.get("duplicateOf"),
            evidence_refs=r.get("evidenceRefs", []),
            created_at=r["createdAt"],
            updated_at=r["updatedAt"]
        ) for r in user_reports
    ]

@router.get("/{report_id}", response_model=ReportResponse)
def get_report_by_id(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    report = Database.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    is_admin_or_ops = any(r in current_user.roles for r in ["operator", "admin"])
    is_owner = report.get("reporterId") == current_user.user_id

    # Privacy protection: if not owner or operator, redact personal reporterId
    reporter_id = report["reporterId"] if (is_admin_or_ops or is_owner) else "anonymous"

    return ReportResponse(
        report_id=report["reportId"],
        reporter_id=reporter_id,
        organization_id=report["organizationId"],
        category=report["category"],
        description=report["description"],
        lat=report["lat"],
        lng=report["lng"],
        geohash=report["geohash"],
        status=report["status"],
        verification_confidence=report.get("verificationConfidence", 0.0),
        duplicate_of=report.get("duplicateOf"),
        evidence_refs=report.get("evidenceRefs", []),
        created_at=report["createdAt"],
        updated_at=report["updatedAt"]
    )

@router.post("/{report_id}/resolution-feedback")
def submit_resolution_feedback(
    report_id: str,
    feedback: ResolutionFeedbackRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    report = Database.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    Database.record_event(
        mission_id=report_id,
        event_type="RESIDENT_FEEDBACK_SUBMITTED",
        actor_type="RESIDENT",
        actor_id=current_user.user_id,
        payload={"feedback": feedback.feedback, "comments": feedback.comments}
    )

    if feedback.feedback == "STILL_BROKEN":
        report["status"] = ReportStatus.IN_PROGRESS.value
        Database.save_report(report)
        return {"status": "reopened_for_inspection", "message": "Mission flagged for follow-up verification"}
    
    report["status"] = ReportStatus.CLOSED.value
    Database.save_report(report)
    return {"status": "confirmed_closed", "message": "Thank you for confirming the community repair"}

# Public Issues Map
map_router = APIRouter(prefix="/map", tags=["Map"])

@map_router.get("/issues", response_model=List[PublicIssueMapItem])
def get_public_issues():
    reports = Database.list_reports(limit=100)
    items = []
    for r in reports:
        items.append(PublicIssueMapItem(
            id=r["reportId"],
            category=r["category"],
            status=r["status"],
            lat=r["lat"],
            lng=r["lng"],
            priority=50,
            created_at=r["createdAt"],
            title=f"{r['category'].replace('_', ' ').capitalize()} Issue"
        ))
    return items
