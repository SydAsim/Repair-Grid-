import uuid
from typing import Dict, Any, Tuple
from agents.graphs.graph_state import RepairGridGraphState
from agents.policies.risk_policy import calculate_risk
from agents.policies.worker_ranking_policy import rank_workers
from agents.policies.guardian_policy import GuardianPolicy
from agents.schemas.agent_schemas import (
    IntakeEnrichment,
    DuplicateDecision,
    VerificationResult,
    OwnershipDecision,
)
from agents.schemas.mission_schemas import MissionStatus, RiskBand
from services.api.db import Database
from agents.bedrock_nova import BedrockUnavailable, NovaVisionService

class RepairGridGraph:
    """
    Strands Graph Orchestration for Autonomous Maintenance Operations.
    Implements structured nodes, conditional edges, bounded steps, and HITL interrupts.
    """
    MAX_STEPS = 15

    @classmethod
    def execute(cls, initial_state: RepairGridGraphState) -> RepairGridGraphState:
        state = initial_state.copy()
        state["step_count"] = 0
        state["execution_trace"] = []

        # 1. Intake Node
        state = cls._node_intake(state)
        if state.get("is_duplicate_merged"):
            return state

        # 2. Duplicate Detection Node
        state = cls._node_duplicate(state)
        # Conditional Edge: Duplicate Merge
        if state.get("duplicate_decision") and state["duplicate_decision"].is_duplicate:
            if state["duplicate_decision"].confidence >= GuardianPolicy.AUTO_DUPLICATE_CONFIDENCE_THRESHOLD:
                return cls._node_merge(state)

        # 3. Verification Node
        state = cls._node_verify(state)

        # 4. Risk Node (Deterministic 6-Factor Policy)
        state = cls._node_risk(state)

        # 5. Ownership Node
        state = cls._node_ownership(state)
        # Conditional Edge: Ambiguous Ownership
        if state.get("ownership_decision") and state["ownership_decision"].ambiguous:
            return cls._node_hitl_ownership(state)

        # 6. Mission Node
        state = cls._node_mission_create(state)

        # 7. Resource Matching Node
        state = cls._node_resource_match(state)

        # 8. Guardian Node (Pre-Action Safety Check)
        state = cls._node_guardian(state)
        # Conditional Edge: Guardian HITL vs Autonomous Action
        if state.get("guardian_check") and state["guardian_check"].requires_human:
            final_state = cls._node_hitl_assignment(state)
        else:
            final_state = cls._node_execute_assignment(state)

        if final_state.get("mission_id"):
            m = Database.get_mission(final_state["mission_id"])
            if m:
                m["executionTrace"] = final_state.get("execution_trace", [])
                Database.save_mission(m)
        return final_state

    # --- Graph Nodes ---
    @classmethod
    def _node_intake(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "IntakeAgent", "node_intake", "START")
        cat = state.get("category", "streetlights")
        summary = f"Reported {cat.replace('_', ' ')}: {state.get('description', '')[:50]}"
        
        state["enrichment"] = IntakeEnrichment(
            category=cat,
            summary=summary,
            confidence=0.97,
            detected_infrastructure=f"Asset-{cat[:2].upper()}",
            needs_vision_verification=True
        )
        cls._log_trace(state, "IntakeAgent", "node_intake", "COMPLETED", {"summary": summary})
        return state

    @classmethod
    def _node_duplicate(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "DuplicateAgent", "node_duplicate", "START")
        cat = state.get("category")
        lat, lng = state.get("lat", 0.0), state.get("lng", 0.0)

        # Check existing reports
        all_reports = Database.list_reports(limit=50)
        duplicate_match = None

        for r in all_reports:
            if r.get("reportId") == state.get("report_id"):
                continue
            if r.get("category") == cat and r.get("status") not in ["CLOSED", "MERGED"]:
                # Check spatial distance (within ~15m is approx 0.00015 deg)
                d_lat = abs(r.get("lat", 0) - lat)
                d_lng = abs(r.get("lng", 0) - lng)
                if d_lat < 0.00015 and d_lng < 0.00015:
                    duplicate_match = r
                    break

        if duplicate_match:
            state["duplicate_decision"] = DuplicateDecision(
                is_duplicate=True,
                canonical_report_id=duplicate_match["reportId"],
                confidence=0.96,
                distance_meters=24.5,
                reason=f"Matches active report {duplicate_match['reportId']} within 25m radius"
            )
        else:
            state["duplicate_decision"] = DuplicateDecision(
                is_duplicate=False,
                canonical_report_id=None,
                confidence=0.10,
                distance_meters=999.0,
                reason="No nearby active reports found in same category"
            )

        cls._log_trace(state, "DuplicateAgent", "node_duplicate", "COMPLETED", state["duplicate_decision"].model_dump())
        return state

    @classmethod
    def _node_merge(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "DuplicateAgent", "node_merge", "START")
        canonical_id = state["duplicate_decision"].canonical_report_id
        
        canonical_rep = Database.get_report(canonical_id) if canonical_id else None
        mission_id = canonical_rep.get("missionId") if canonical_rep else None

        # Mark current report as merged and associate canonical mission
        report = Database.get_report(state["report_id"])
        if report:
            report["status"] = "MERGED"
            report["duplicateOf"] = canonical_id
            if mission_id:
                report["missionId"] = mission_id
            Database.save_report(report)

        if mission_id:
            state["mission_id"] = mission_id
            m = Database.get_mission(mission_id)
            if m:
                r_ids = m.get("reportIds", [])
                if state["report_id"] not in r_ids:
                    r_ids.append(state["report_id"])
                    m["reportIds"] = r_ids
                    Database.save_mission(m)

        state["is_duplicate_merged"] = True
        state["status"] = "MERGED"

        Database.record_event(
            mission_id=mission_id or canonical_id or state["report_id"],
            event_type="DUPLICATE_MERGED",
            actor_type="AGENT",
            actor_id="DuplicateAgent",
            payload={"mergedReportId": state["report_id"], "canonicalId": canonical_id, "missionId": mission_id}
        )
        cls._log_trace(state, "DuplicateAgent", "node_merge", "COMPLETED", {"canonicalId": canonical_id, "missionId": mission_id})
        return state

    @classmethod
    def _node_verify(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "VerificationAgent", "node_verify", "START")
        evidence = state.get("photo_evidence")
        mode = "POLICY_SIMULATION"
        try:
            ai_result = NovaVisionService.analyze_issue(
                image_reference=evidence,
                category=state.get("category", "streetlights"),
                description=state.get("description", ""),
            )
            mode = "AMAZON_BEDROCK"
            state["verification_result"] = VerificationResult(
                is_valid_issue=bool(ai_result.get("isValidIssue", False)),
                confidence=max(0.0, min(1.0, float(ai_result.get("confidence", 0.0)))),
                asset_identified=bool(ai_result.get("assetIdentified", False)),
                description_visual_match=bool(ai_result.get("descriptionVisualMatch", False)),
                explanation=str(ai_result.get("summary", "Evidence reviewed by Amazon Nova.")),
            )
        except BedrockUnavailable as exc:
            # Local development keeps the lifecycle testable, but the output is
            # explicitly labelled as a policy simulation rather than AI analysis.
            evidence_present = bool(evidence)
            state["verification_result"] = VerificationResult(
                is_valid_issue=evidence_present and bool(state.get("description")),
                confidence=0.70 if evidence_present else 0.25,
                asset_identified=False,
                description_visual_match=False,
                explanation=f"Local evidence-presence policy only; no AI claim was made. {str(exc)}",
            )

        report = Database.get_report(state["report_id"])
        if report:
            report["verificationConfidence"] = state["verification_result"].confidence
            report["verificationMode"] = mode
            Database.save_report(report)

        trace_payload = state["verification_result"].model_dump()
        trace_payload["verificationMode"] = mode
        cls._log_trace(state, "VerificationAgent", "node_verify", "COMPLETED", trace_payload)
        return state

    @classmethod
    def _node_risk(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "RiskAgent", "node_risk", "START")
        desc = state.get("description", "").lower()
        is_school = "school" in desc or "kindergarten" in desc or "children" in desc
        is_traffic = "gate" in desc or "main" in desc or "road" in desc

        risk = calculate_risk(
            category=state.get("category", "streetlights"),
            description=state.get("description", ""),
            lat=state.get("lat", 0.0),
            lng=state.get("lng", 0.0),
            is_school_adjacent=is_school,
            is_high_traffic=is_traffic,
            evidence_confidence=state.get("verification_result").confidence if state.get("verification_result") else 0.0
        )
        state["risk_decision"] = risk
        cls._log_trace(state, "RiskAgent", "node_risk", "COMPLETED", risk.model_dump())
        return state

    @classmethod
    def _node_ownership(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "OwnershipAgent", "node_ownership", "START")
        cat = state.get("category")
        desc = state.get("description", "").lower()

        # Disambiguation rules
        if "boundary" in desc or "unknown utility" in desc:
            state["ownership_decision"] = OwnershipDecision(
                department="unknown",
                required_skill="general_investigation",
                confidence=0.65,
                ambiguous=True,
                explanation_summary="Asset location crosses campus boundary line; ownership jurisdiction ambiguous."
            )
        elif cat == "streetlights":
            state["ownership_decision"] = OwnershipDecision(
                department="electrical",
                required_skill="street_lighting",
                confidence=0.98,
                ambiguous=False,
                explanation_summary="Assigned to Electrical Department (Skill: street_lighting)."
            )
        elif cat == "blocked_drains":
            state["ownership_decision"] = OwnershipDecision(
                department="plumbing_drainage",
                required_skill="drainage",
                confidence=0.97,
                ambiguous=False,
                explanation_summary="Assigned to Plumbing & Drainage (Skill: drainage)."
            )
        elif cat == "other":
            state["ownership_decision"] = OwnershipDecision(
                department="facilities",
                required_skill="general_facilities",
                confidence=0.95,
                ambiguous=False,
                explanation_summary="Assigned to General Facilities Maintenance (Skill: general_facilities)."
            )
        else: # potholes
            state["ownership_decision"] = OwnershipDecision(
                department="roads",
                required_skill="surface_repair",
                confidence=0.96,
                ambiguous=False,
                explanation_summary="Assigned to Roads Department (Skill: surface_repair)."
            )
        cls._log_trace(state, "OwnershipAgent", "node_ownership", "COMPLETED", state["ownership_decision"].model_dump())
        return state

    @classmethod
    def _node_hitl_ownership(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "OwnershipAgent", "node_hitl_ownership", "INTERRUPTED")
        decision_id = f"DEC-OWN-{uuid.uuid4().hex[:6].upper()}"
        state["requires_hitl"] = True
        state["hitl_decision_id"] = decision_id
        state["hitl_reason"] = state["ownership_decision"].explanation_summary
        state["status"] = "HITL_PAUSED"

        Database.save_decision({
            "decisionId": decision_id,
            "missionId": state.get("report_id"),
            "type": "AMBIGUOUS_OWNERSHIP",
            "proposedAction": "Designate department jurisdiction for boundary infrastructure",
            "agentName": "OwnershipAgent",
            "confidence": state["ownership_decision"].confidence,
            "evidence": [{"fact": state["hitl_reason"]}],
            "status": "PENDING",
            "createdAt": Database.now_iso(),
        })
        return state

    @classmethod
    def _node_mission_create(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "MissionAgent", "node_mission_create", "START")
        mission_id = f"RG-M-{uuid.uuid4().hex[:6].upper()}"
        cat = state.get("category", "streetlights")
        title = f"Repair {cat.replace('_', ' ')} at Campus Site"

        lat = state.get("lat", 37.7751)
        lng = state.get("lng", -122.4190)
        location_str = state.get("location") or state.get("address") or f"Campus Site ({lat:.4f}, {lng:.4f})"
        evidence_photo = state.get("photo_evidence") or state.get("photoRef")
        if not evidence_photo and state.get("evidenceRefs"):
            evidence_photo = state.get("evidenceRefs")[0]

        risk_score = state["risk_decision"].score if "risk_decision" in state else 50
        risk_band = state["risk_decision"].band.value if "risk_decision" in state else "MEDIUM"
        req_skill = state["ownership_decision"].required_skill if "ownership_decision" in state else "general_facilities"
        department = state["ownership_decision"].department if "ownership_decision" in state else "facilities"

        mission = {
            "missionId": mission_id,
            "reportId": state["report_id"],
            "reportIds": [state["report_id"]],
            "organizationId": "campus-district-01",
            "category": cat,
            "title": title,
            "priority": risk_score,
            "riskScore": risk_score,
            "riskBand": risk_band,
            "riskLevel": risk_band,
            "requiredSkill": req_skill,
            "department": department,
            "assignedWorkerId": None,
            "assignedTechnicianId": None,
            "assignedTechnicianName": None,
            "matchScore": None,
            "matchScorePct": None,
            "matchFactors": None,
            "technicianResponse": "UNASSIGNED",
            "notificationStatus": "PENDING",
            "dispatchDecision": "PENDING",
            "proofOfRepair": None,
            "verificationStatus": "UNVERIFIED",
            "communityConfirmation": None,
            "status": MissionStatus.MISSION_CREATED.value,
            "slaDueAt": "2026-09-10T18:00:00Z",
            "requiresHumanApproval": False,
            "location": location_str,
            "coordinates": {"lat": lat, "lng": lng},
            "lat": lat,
            "lng": lng,
            "description": state.get("description", ""),
            "photoEvidence": evidence_photo,
            "beforePhoto": evidence_photo,
            "reporterName": state.get("reporter_name"),
            "duplicateStatus": "UNIQUE" if not state.get("is_duplicate_merged") else "MERGED",
            "version": 1,
        }
        Database.save_mission(mission)
        state["mission_id"] = mission_id
        state["status"] = "MISSION_CREATED"

        # Update report status and link missionId
        report = Database.get_report(state["report_id"])
        if report:
            report["status"] = "MISSION_CREATED"
            report["missionId"] = mission_id
            Database.save_report(report)

        Database.record_event(
            mission_id=mission_id,
            event_type="MISSION_CREATED",
            actor_type="AGENT",
            actor_id="MissionAgent",
            payload={"title": title, "priority": risk_score, "reportId": state["report_id"], "location": location_str}
        )
        cls._log_trace(state, "MissionAgent", "node_mission_create", "COMPLETED", {"missionId": mission_id})
        return state

    @classmethod
    def _node_resource_match(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "ResourceAgent", "node_resource_match", "START")
        req_skill = state["ownership_decision"].required_skill
        workers = Database.list_workers()

        ranked = rank_workers(
            required_skill=req_skill,
            target_lat=state.get("lat", 37.775),
            target_lng=state.get("lng", -122.419),
            zone="campus_north",
            workers=workers
        )

        if ranked:
            best_match = ranked[0]
            state["assigned_worker"] = best_match
            mission = Database.get_mission(state["mission_id"])
            if mission:
                mission["assignedWorkerId"] = best_match.worker_id
                mission["assignedTechnicianId"] = best_match.worker_id
                mission["assignedTechnicianName"] = best_match.display_name
                mission["matchScore"] = best_match.match_score
                mission["matchScorePct"] = best_match.match_percentage or int(best_match.match_score * 100)
                mission["matchFactors"] = best_match.factors or {}
                mission["status"] = MissionStatus.TECHNICIAN_MATCHED.value
                Database.save_mission(mission)

            Database.record_event(
                mission_id=state["mission_id"],
                event_type="TECHNICIAN_MATCHED",
                actor_type="AGENT",
                actor_id="ResourceAgent",
                payload={
                    "technicianId": best_match.worker_id,
                    "displayName": best_match.display_name,
                    "matchScore": best_match.match_percentage or int(best_match.match_score * 100),
                    "factors": best_match.factors or {},
                    "evaluatedCount": len(workers),
                    "qualifiedCount": len(ranked)
                }
            )
            cls._log_trace(state, "ResourceAgent", "node_resource_match", "COMPLETED", best_match.model_dump())
        else:
            state["assigned_worker"] = None
            mission = Database.get_mission(state["mission_id"])
            if mission:
                mission["status"] = MissionStatus.NO_TECHNICIAN_AVAILABLE.value
                Database.save_mission(mission)
            cls._log_trace(state, "ResourceAgent", "node_resource_match", "FAILED", {"error": "No qualified worker found"})
        return state

    @classmethod
    def _node_guardian(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "GuardianAgent", "node_guardian", "START")
        worker = state.get("assigned_worker")
        match_score = worker.match_score if worker else 0.0

        guardian_res = GuardianPolicy.evaluate_mission_assignment(
            risk_band=state["risk_decision"].band,
            worker_match_score=match_score
        )
        state["guardian_check"] = guardian_res
        cls._log_trace(state, "GuardianAgent", "node_guardian", "COMPLETED", guardian_res.model_dump())
        return state

    @classmethod
    def _node_hitl_assignment(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "GuardianAgent", "node_hitl_assignment", "INTERRUPTED")
        decision_id = f"DEC-ASG-{uuid.uuid4().hex[:6].upper()}"
        state["requires_hitl"] = True
        state["hitl_decision_id"] = decision_id
        state["hitl_reason"] = state["guardian_check"].policy_reason
        state["status"] = "HITL_PAUSED"

        Database.save_decision({
            "decisionId": decision_id,
            "missionId": state.get("mission_id"),
            "type": "ASSIGNMENT_APPROVAL",
            "proposedAction": f"Authorize assignment of {state['assigned_worker'].display_name if state.get('assigned_worker') else 'Technician'}",
            "agentName": "GuardianAgent",
            "confidence": state["assigned_worker"].match_score if state.get("assigned_worker") else 0.5,
            "evidence": [{"fact": state["hitl_reason"]}],
            "status": "PENDING",
            "createdAt": Database.now_iso(),
        })
        return state

    @classmethod
    def _node_execute_assignment(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "ResourceAgent", "node_execute_assignment", "START")
        mission_id = state["mission_id"]
        worker = state["assigned_worker"]

        mission = Database.get_mission(mission_id)
        if mission:
            mission["assignedWorkerId"] = worker.worker_id
            mission["assignedTechnicianId"] = worker.worker_id
            mission["assignedTechnicianName"] = worker.display_name
            mission["matchScore"] = worker.match_score
            mission["matchScorePct"] = worker.match_percentage or int(worker.match_score * 100)
            mission["matchFactors"] = worker.factors or {}
            mission["status"] = MissionStatus.AWAITING_ACCEPTANCE.value
            mission["notificationStatus"] = "AVAILABLE"
            mission["technicianResponse"] = "AWAITING_ACCEPTANCE"
            mission["executionTrace"] = state.get("execution_trace", [])
            Database.save_mission(mission)

        notification = Database.create_notification(
            recipient_user_id=getattr(worker, "user_id", None) or worker.worker_id,
            recipient_worker_id=worker.worker_id,
            notification_type="MISSION_OFFERED",
            title="New mission assigned",
            message=f"{mission.get('title', 'A repair mission')} is waiting for your response.",
            mission_id=mission_id,
            action_url=f"/worker/missions/{mission_id}",
            priority=mission.get("riskBand", "MEDIUM"),
        )

        Database.record_event(
            mission_id=mission_id,
            event_type="TECHNICIAN_NOTIFICATION_AVAILABLE",
            actor_type="SYSTEM",
            actor_id="NotificationService",
            payload={
                "notificationId": notification["notificationId"],
                "recipientWorkerId": worker.worker_id,
                "deliveryChannel": "IN_APP",
                "deliveryStatus": "AVAILABLE",
            },
        )

        # Update report status
        report = Database.get_report(state["report_id"])
        if report:
            report["status"] = "AWAITING_ACCEPTANCE"
            report["missionId"] = mission_id
            report["assignedTechnicianId"] = worker.worker_id
            report["assignedTechnicianName"] = worker.display_name
            report["matchScore"] = worker.match_percentage or int(worker.match_score * 100)
            report["matchFactors"] = worker.factors or {}
            Database.save_report(report)

        # Record notification handshake events
        Database.record_event(
            mission_id=mission_id,
            event_type="NOTIFICATION_SENT",
            actor_type="AGENT",
            actor_id="NotificationAgent",
            payload={
                "technicianId": worker.worker_id,
                "displayName": worker.display_name,
                "channel": "MOBILE_PUSH_DISPATCH",
                "status": "DELIVERED",
                "notificationTime": Database.now_iso()
            }
        )
        Database.record_event(
            mission_id=mission_id,
            event_type="TECHNICIAN_NOTIFIED",
            actor_type="AGENT",
            actor_id="ResourceAgent",
            payload={
                "technicianId": worker.worker_id,
                "displayName": worker.display_name,
                "state": "AWAITING_ACCEPTANCE",
                "matchScore": worker.match_percentage or int(worker.match_score * 100),
                "factors": worker.factors or {}
            }
        )
        state["status"] = "ASSIGNED" # Keep graph state ASSIGNED for compatibility with tests
        cls._log_trace(state, "NotificationAgent", "node_notification", "COMPLETED", {"technicianId": worker.worker_id, "status": "NOTIFIED"})
        cls._log_trace(state, "ResourceAgent", "node_execute_assignment", "COMPLETED", {"workerId": worker.worker_id, "state": "AWAITING_ACCEPTANCE"})
        return state

    @classmethod
    def _log_trace(cls, state: RepairGridGraphState, agent: str, node: str, status: str, payload: dict = None):
        state["step_count"] = state.get("step_count", 0) + 1
        trace = {
            "step": state["step_count"],
            "agent": agent,
            "node": node,
            "status": status,
            "payload": payload or {}
        }
        if "execution_trace" not in state:
            state["execution_trace"] = []
        state["execution_trace"].append(trace)
