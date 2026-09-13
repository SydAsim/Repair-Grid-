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
        "reporterEmail": current_user.email,
        "organizationId": "campus-district-01",
        "category": req.category.value,
        "description": req.description,
        "lat": req.lat,
        "lng": req.lng,
        "locationName": req.location_name or f"{req.lat:.4f}, {req.lng:.4f}",
        "geohash": geohash,
        "status": ReportStatus.SUBMITTED.value,
        "verificationConfidence": 0.0,
        "duplicateOf": None,
        "evidenceRefs": evidence_refs,
    }

    saved = Database.save_report(report_item)
    Database.record_event(
        mission_id=report_id,
        event_type="REPORT_SUBMITTED",
        actor_type="RESIDENT",
        actor_id=current_user.user_id,
        payload={"category": req.category.value, "description": req.description, "location": saved.get("locationName")}
    )
    Database.record_event(
        mission_id=report_id,
        event_type="LOCATION_GEOCODED",
        actor_type="SYSTEM",
        actor_id="AmazonLocationService",
        payload={"lat": req.lat, "lng": req.lng, "address": saved.get("locationName")}
    )

    # Automatically execute Autonomous Mission Pipeline Graph!
    from agents.graphs.main_graph import RepairGridGraph
    graph_state = {
        "report_id": report_id,
        "category": req.category.value,
        "description": req.description,
        "lat": req.lat,
        "lng": req.lng,
        "location": saved.get("locationName"),
        "address": saved.get("locationName"),
        "photo_evidence": req.image_url,
        "evidenceRefs": evidence_refs,
    }
    graph_res = RepairGridGraph.execute(graph_state)
    mission_id = graph_res.get("mission_id")

    # Fetch updated report state with linked mission and status
    current_saved = Database.get_report(report_id) or saved

    return ReportResponse(
        report_id=current_saved["reportId"],
        reporter_id=current_saved["reporterId"],
        organization_id=current_saved["organizationId"],
        category=current_saved["category"],
        description=current_saved["description"],
        lat=current_saved["lat"],
        lng=current_saved["lng"],
        location_name=current_saved.get("locationName"),
        geohash=current_saved["geohash"],
        # POST acknowledges the resident submission. The linked case may already
        # have progressed synchronously; clients fetch the canonical timeline next.
        status=ReportStatus.SUBMITTED.value,
        verification_confidence=current_saved.get("verificationConfidence", 0.0),
        duplicate_of=current_saved.get("duplicateOf"),
        evidence_refs=current_saved.get("evidenceRefs", []),
        mission_id=current_saved.get("missionId", mission_id),
        created_at=current_saved["createdAt"],
        updated_at=current_saved["updatedAt"]
    )

@router.get("/mine", response_model=List[ReportResponse])
def get_my_reports(current_user: AuthenticatedUser = Depends(get_current_user)):
    all_reports = Database.list_reports(limit=100)
    user_identifiers = {current_user.user_id, current_user.email}
    if current_user.user_id in ("resident-demo-001", "resident-asim-001"):
        user_identifiers.update({"resident-demo-001", "resident-asim-001"})

    user_reports = [
        r for r in all_reports 
        if r.get("reporterId") in user_identifiers or r.get("reporterEmail") == current_user.email
    ]
    user_reports.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    
    return [
        ReportResponse(
            report_id=r["reportId"],
            reporter_id=r["reporterId"],
            organization_id=r["organizationId"],
            category=r["category"],
            description=r["description"],
            lat=r["lat"],
            lng=r["lng"],
            location_name=r.get("locationName"),
            geohash=r["geohash"],
            status=r["status"],
            verification_confidence=r.get("verificationConfidence", 0.0),
            duplicate_of=r.get("duplicateOf"),
            evidence_refs=r.get("evidenceRefs", []),
            mission_id=r.get("missionId"),
            created_at=r["createdAt"],
            updated_at=r["updatedAt"]
        ) for r in user_reports
    ]

@router.get("/{report_id}/events")
def get_report_events(report_id: str):
    events = list(Database.get_mission_events(report_id))
    report = Database.get_report(report_id)
    if report and report.get("missionId"):
        mission_events = Database.get_mission_events(report["missionId"])
        seen = {e.get("eventId") for e in events if e.get("eventId")}
        for me in mission_events:
            if me.get("eventId") not in seen:
                events.append(me)
                seen.add(me.get("eventId"))
    return events

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
        location_name=report.get("locationName"),
        geohash=report["geohash"],
        status=report["status"],
        verification_confidence=report.get("verificationConfidence", 0.0),
        duplicate_of=report.get("duplicateOf"),
        evidence_refs=report.get("evidenceRefs", []),
        mission_id=report.get("missionId"),
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
