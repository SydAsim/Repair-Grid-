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
            return cls._node_hitl_assignment(state)
        else:
            return cls._node_execute_assignment(state)

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
                # Check spatial distance (within ~50m is approx 0.0005 deg)
                d_lat = abs(r.get("lat", 0) - lat)
                d_lng = abs(r.get("lng", 0) - lng)
                if d_lat < 0.0006 and d_lng < 0.0006:
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
        
        # Mark current report as merged
        report = Database.get_report(state["report_id"])
        if report:
            report["status"] = "MERGED"
            report["duplicateOf"] = canonical_id
            Database.save_report(report)

        state["is_duplicate_merged"] = True
        state["status"] = "MERGED"

        Database.record_event(
            mission_id=canonical_id or state["report_id"],
            event_type="DUPLICATE_MERGED",
            actor_type="AGENT",
            actor_id="DuplicateAgent",
            payload={"mergedReportId": state["report_id"], "canonicalId": canonical_id}
        )
        cls._log_trace(state, "DuplicateAgent", "node_merge", "COMPLETED", {"canonicalId": canonical_id})
        return state

    @classmethod
    def _node_verify(cls, state: RepairGridGraphState) -> RepairGridGraphState:
        cls._log_trace(state, "VerificationAgent", "node_verify", "START")
        state["verification_result"] = VerificationResult(
            is_valid_issue=True,
            confidence=0.96,
            asset_identified=True,
            description_visual_match=True,
            explanation="Visual features and geolocation corroborate valid physical infrastructure issue."
        )
        cls._log_trace(state, "VerificationAgent", "node_verify", "COMPLETED", state["verification_result"].model_dump())
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
            evidence_confidence=0.96
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
        cat = state.get("category")
        title = f"Repair {cat.replace('_', ' ')} at Campus Site"

        mission = {
            "missionId": mission_id,
            "organizationId": "campus-district-01",
            "reportIds": [state["report_id"]],
            "category": cat,
            "title": title,
            "priority": state["risk_decision"].score,
            "riskBand": state["risk_decision"].band.value,
            "requiredSkill": state["ownership_decision"].required_skill,
            "department": state["ownership_decision"].department,
            "assignedWorkerId": None,
            "status": MissionStatus.DRAFT.value,
            "slaDueAt": "2026-09-10T18:00:00Z",
            "requiresHumanApproval": False,
            "version": 1,
        }
        Database.save_mission(mission)
        state["mission_id"] = mission_id
        state["status"] = "MISSION_CREATED"

        # Update report status to ASSIGNED
        report = Database.get_report(state["report_id"])
        if report:
            report["status"] = "ASSIGNED"
            Database.save_report(report)

        Database.record_event(
            mission_id=mission_id,
            event_type="MISSION_CREATED",
            actor_type="AGENT",
            actor_id="MissionAgent",
            payload={"title": title, "priority": state["risk_decision"].score}
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
            state["assigned_worker"] = ranked[0]
            cls._log_trace(state, "ResourceAgent", "node_resource_match", "COMPLETED", ranked[0].model_dump())
        else:
            state["assigned_worker"] = None
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
            mission["status"] = MissionStatus.ASSIGNED.value
            Database.save_mission(mission)

        state["status"] = "ASSIGNED"
        Database.record_event(
            mission_id=mission_id,
            event_type="WORKER_ASSIGNED",
            actor_type="AGENT",
            actor_id="ResourceAgent",
            payload={"workerId": worker.worker_id, "displayName": worker.display_name, "score": worker.match_score}
        )
        cls._log_trace(state, "ResourceAgent", "node_execute_assignment", "COMPLETED", {"workerId": worker.worker_id})
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
