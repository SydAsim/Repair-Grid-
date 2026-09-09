from typing import Dict, Any, Optional
from agents.schemas.mission_schemas import RiskBand
from agents.schemas.agent_schemas import GuardianCheckResult

class GuardianPolicy:
    AUTO_CLOSURE_CONFIDENCE_THRESHOLD = 0.90
    AUTO_ASSIGNMENT_CONFIDENCE_THRESHOLD = 0.85
    AUTO_DUPLICATE_CONFIDENCE_THRESHOLD = 0.95

    @classmethod
    def evaluate_mission_assignment(
        cls,
        risk_band: RiskBand,
        worker_match_score: float,
        is_reassignment: bool = False
    ) -> GuardianCheckResult:
        """
        Evaluates whether a worker assignment can occur autonomously.
        """
        # Critical reassignments require human operator approval
        if is_reassignment and risk_band == RiskBand.CRITICAL:
            return GuardianCheckResult(
                action_allowed=False,
                requires_human=True,
                rule_triggered="POLICY_CRITICAL_RESOURCE_REASSIGNMENT",
                policy_reason="Reassignment of technician on CRITICAL mission requires operator sign-off.",
                risk_band=risk_band
            )

        if worker_match_score < cls.AUTO_ASSIGNMENT_CONFIDENCE_THRESHOLD:
            return GuardianCheckResult(
                action_allowed=False,
                requires_human=True,
                rule_triggered="LOW_WORKER_MATCH_THRESHOLD",
                policy_reason=f"Worker fit score ({worker_match_score}) is below auto-dispatch threshold ({cls.AUTO_ASSIGNMENT_CONFIDENCE_THRESHOLD}).",
                risk_band=risk_band
            )

        return GuardianCheckResult(
            action_allowed=True,
            requires_human=False,
            rule_triggered=None,
            policy_reason="Routine assignment permitted within policy guardrails.",
            risk_band=risk_band
        )

    @classmethod
    def evaluate_mission_closure(
        cls,
        risk_band: RiskBand,
        verification_confidence: float,
        condition_improved: bool
    ) -> GuardianCheckResult:
        """
        Evaluates whether a mission can be closed autonomously.
        Crucial Rule: CRITICAL missions may NEVER be closed autonomously!
        """
        if not condition_improved:
            return GuardianCheckResult(
                action_allowed=False,
                requires_human=False,
                rule_triggered="REPAIR_UNVERIFIED",
                policy_reason="Proof-of-repair evidence indicates issue remains unresolved.",
                risk_band=risk_band
            )

        # Rule 1: CRITICAL risk band NEVER auto-closes
        if risk_band == RiskBand.CRITICAL:
            return GuardianCheckResult(
                action_allowed=False,
                requires_human=True,
                rule_triggered="SAFETY_CRITICAL_CLOSURE_NEVER_AUTO",
                policy_reason="CRITICAL safety band missions strictly require operator human review before closure.",
                risk_band=risk_band
            )

        # Rule 2: Low confidence threshold
        if verification_confidence < cls.AUTO_CLOSURE_CONFIDENCE_THRESHOLD:
            return GuardianCheckResult(
                action_allowed=False,
                requires_human=True,
                rule_triggered="CONFIDENCE_BELOW_CLOSURE_THRESHOLD",
                policy_reason=f"Verification confidence ({verification_confidence}) is below required {cls.AUTO_CLOSURE_CONFIDENCE_THRESHOLD} threshold.",
                risk_band=risk_band
            )

        # Safe autonomous closure
        return GuardianCheckResult(
            action_allowed=True,
            requires_human=False,
            rule_triggered=None,
            policy_reason="Routine repair verified with high confidence. Autonomous closure permitted.",
            risk_band=risk_band
        )
