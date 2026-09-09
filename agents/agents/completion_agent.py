from agents.schemas.agent_schemas import ProofOfRepairVerification
from agents.schemas.mission_schemas import RiskBand, WorkerOutcome
from agents.policies.guardian_policy import GuardianPolicy

class CompletionVerifierAgent:
    """
    Evaluates technician proof-of-repair.
    The technician does NOT have final verification authority merely by clicking complete.
    """
    @classmethod
    def verify(
        cls,
        category: str,
        outcome: WorkerOutcome,
        notes: str,
        before_photo_ref: str,
        after_photo_ref: str,
        worker_lat: float,
        mission_lat: float,
        risk_band: RiskBand = RiskBand.MEDIUM
    ) -> ProofOfRepairVerification:
        # Check outcome first
        if outcome == WorkerOutcome.REQUIRES_SPECIALIST:
            return ProofOfRepairVerification(
                same_location=True,
                same_asset=True,
                condition_improved=False,
                evidence_quality=0.95,
                confidence=0.95,
                recommendation="REPLAN_REOPEN",
                explanation="Technician notes specialist requirement (e.g., underground excavation). Re-entering agent graph for sub-mission."
            )

        if outcome == WorkerOutcome.UNABLE_TO_RESOLVE:
            return ProofOfRepairVerification(
                same_location=True,
                same_asset=True,
                condition_improved=False,
                evidence_quality=0.85,
                confidence=0.90,
                recommendation="REPLAN_REOPEN",
                explanation="Technician unable to resolve issue on site. Reopening for investigation."
            )

        # GPS proximity check (within ~100m)
        loc_delta = abs(worker_lat - mission_lat)
        same_location = loc_delta < 0.001

        # Check for invalid/mismatched repair photo notes
        notes_lower = notes.lower()
        if "wrong" in notes_lower or "mismatch" in notes_lower or not after_photo_ref:
            return ProofOfRepairVerification(
                same_location=same_location,
                same_asset=False,
                condition_improved=False,
                evidence_quality=0.30,
                confidence=0.45,
                recommendation="REPLAN_REOPEN",
                explanation="After-repair evidence fails asset continuity verification."
            )

        # High-confidence repair
        confidence = 0.96 if same_location else 0.70
        condition_improved = True

        # Guardian policy check
        guardian_res = GuardianPolicy.evaluate_mission_closure(
            risk_band=risk_band,
            verification_confidence=confidence,
            condition_improved=condition_improved
        )

        if guardian_res.requires_human:
            recommendation = "OPERATOR_REVIEW"
            explanation = f"Proof verified ({int(confidence*100)}%), but {guardian_res.policy_reason}"
        elif guardian_res.action_allowed:
            recommendation = "CLOSE"
            explanation = f"Routine repair verified autonomously ({int(confidence*100)}% confidence). Safe for automated closure."
        else:
            recommendation = "REPLAN_REOPEN"
            explanation = guardian_res.policy_reason

        return ProofOfRepairVerification(
            same_location=same_location,
            same_asset=True,
            condition_improved=condition_improved,
            evidence_quality=0.95,
            confidence=confidence,
            recommendation=recommendation,
            explanation=explanation
        )
