import os
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
    
    # Process image evidence
    evidence_url = req.image_url
    if evidence_url and evidence_url.startswith("data:image/"):
        try:
            import base64
            import boto3
            header, encoded = evidence_url.split(",", 1) if "," in evidence_url else ("", evidence_url)
            image_bytes = base64.b64decode(encoded)
            bucket_name = os.getenv("S3_EVIDENCE_BUCKET", "repairgrid-evidence-011528288924-us-east-1")
            ext = "png" if "png" in header else "webp" if "webp" in header else "jpg"
            file_key = f"reports/{report_id}/before/{uuid.uuid4().hex[:8]}.{ext}"
            
            s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
            s3.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=image_bytes,
                ContentType="image/jpeg" if ext == "jpg" else f"image/{ext}"
            )
            try:
                evidence_url = s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket_name, "Key": file_key},
                    ExpiresIn=604800
                )
            except Exception as sign_err:
                print(f"Presign url error: {sign_err}")
                evidence_url = f"https://{bucket_name}.s3.amazonaws.com/{file_key}"
        except Exception as upload_err:
            print(f"S3 upload error for data URL: {upload_err}")
            evidence_url = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800"

    evidence_refs = [evidence_url] if evidence_url else []
    
    # Calculate simple geohash placeholder for spatial clustering
    lat_prefix = f"{req.lat:.3f}".replace(".", "")
    lng_prefix = f"{req.lng:.3f}".replace(".", "")
    geohash = f"{lat_prefix}_{lng_prefix}"

    reporter_name = req.reporter_name or current_user.name or (
        current_user.email.split("@")[0].replace(".", " ").title() if current_user.email else "Resident"
    )

    report_item = {
        "reportId": report_id,
        "reporterId": current_user.user_id,
        "reporterName": reporter_name,
        "reporterEmail": current_user.email,
        "organizationId": "campus-district-01",
        "category": req.category.value,
        "description": req.description,
        "lat": req.lat,
        "lng": req.lng,
        "locationName": req.location_name or f"{req.lat:.4f}, {req.lng:.4f}",
        "geohash": geohash,
        "status": ReportStatus.PENDING.value,
        "verificationConfidence": 0.0,
        "duplicateOf": None,
        "evidenceRefs": evidence_refs,
        "beforePhoto": evidence_url,
    }

    saved = Database.save_report(report_item)
    Database.record_event(
        mission_id=report_id,
        event_type="REPORT_SUBMITTED",
        actor_type="RESIDENT",
        actor_id=current_user.user_id,
        payload={
            "category": req.category.value,
            "description": req.description,
            "location": saved.get("locationName"),
            "reporterName": reporter_name,
            "status": ReportStatus.PENDING.value
        }
    )
    Database.record_event(
        mission_id=report_id,
        event_type="LOCATION_GEOCODED",
        actor_type="SYSTEM",
        actor_id="AmazonLocationService",
        payload={"lat": req.lat, "lng": req.lng, "address": saved.get("locationName")}
    )

    # Automatically execute Autonomous Mission Pipeline Graph!
    mission_id = None
    try:
        from agents.graphs.main_graph import RepairGridGraph
        graph_state = {
            "report_id": report_id,
            "category": req.category.value,
            "description": req.description,
            "lat": req.lat,
            "lng": req.lng,
            "location": saved.get("locationName"),
            "address": saved.get("locationName"),
            "reporter_name": reporter_name,
            "photo_evidence": evidence_url,
            "evidenceRefs": evidence_refs,
        }
        graph_res = RepairGridGraph.execute(graph_state)
        mission_id = graph_res.get("mission_id")
    except Exception as graph_err:
        print(f"RepairGridGraph execution error: {graph_err}")

    # Fetch updated report state with linked mission and status
    current_saved = Database.get_report(report_id) or saved

    return ReportResponse(
        report_id=current_saved["reportId"],
        reporter_id=current_saved["reporterId"],
        reporter_name=current_saved.get("reporterName", reporter_name),
        organization_id=current_saved["organizationId"],
        category=current_saved["category"],
        description=current_saved["description"],
        lat=current_saved["lat"],
        lng=current_saved["lng"],
        location_name=current_saved.get("locationName"),
        geohash=current_saved["geohash"],
        status=current_saved.get("status", ReportStatus.PENDING.value),
        verification_confidence=current_saved.get("verificationConfidence", 0.0),
        duplicate_of=current_saved.get("duplicateOf"),
        evidence_refs=current_saved.get("evidenceRefs", []),
        before_photo=current_saved.get("beforePhoto") or (current_saved.get("evidenceRefs", [None])[0] if current_saved.get("evidenceRefs") else None),
        after_photo=current_saved.get("afterPhoto") or current_saved.get("proofPhoto"),
        technician_notes=current_saved.get("technicianNotes"),
        controller_approved_at=current_saved.get("controllerApprovedAt"),
        controller_notes=current_saved.get("controllerNotes"),
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
            reporter_name=r.get("reporterName") or current_user.name or (r.get("reporterEmail", "").split("@")[0].title() or "Resident"),
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
            before_photo=r.get("beforePhoto") or (r.get("evidenceRefs", [None])[0] if r.get("evidenceRefs") else None),
            after_photo=r.get("afterPhoto") or r.get("proofPhoto"),
            technician_notes=r.get("technicianNotes"),
            controller_approved_at=r.get("controllerApprovedAt"),
            controller_notes=r.get("controllerNotes"),
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
        reporter_name=report.get("reporterName", "Resident"),
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
        before_photo=report.get("beforePhoto") or (report.get("evidenceRefs", [None])[0] if report.get("evidenceRefs") else None),
        after_photo=report.get("afterPhoto") or report.get("proofPhoto"),
        technician_notes=report.get("technicianNotes"),
        controller_approved_at=report.get("controllerApprovedAt"),
        controller_notes=report.get("controllerNotes"),
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
            title=f"{r['category'].replace('_', ' ').capitalize()} Issue",
            location_name=r.get("locationName"),
            reporter_name=r.get("reporterName"),
            before_photo=r.get("beforePhoto") or (r.get("evidenceRefs", [None])[0] if r.get("evidenceRefs") else None),
            after_photo=r.get("afterPhoto") or r.get("proofPhoto"),
            technician_name=r.get("technicianName"),
            approved_at=r.get("controllerApprovedAt")
        ))
    return items
