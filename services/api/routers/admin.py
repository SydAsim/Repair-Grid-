from typing import Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..middleware.auth import AuthenticatedUser, require_roles
from ..db import Database

router = APIRouter(prefix="/admin", tags=["Admin"])

class PolicyUpdatePayload(BaseModel):
    auto_duplicate_threshold: float = 0.95
    auto_assignment_threshold: float = 0.90
    auto_closure_threshold: float = 0.90
    safety_critical_auto_close: str = "NEVER"
    critical_resource_reassignment: str = "HUMAN"

_system_policies: Dict[str, Any] = {
    "auto_duplicate_threshold": 0.95,
    "auto_assignment_threshold": 0.90,
    "auto_closure_threshold": 0.90,
    "safety_critical_auto_close": "NEVER",
    "critical_resource_reassignment": "HUMAN",
}

@router.get("/policies")
def get_policies(current_user: AuthenticatedUser = Depends(require_roles(["admin"]))):
    return _system_policies

@router.patch("/policies")
def update_policies(
    payload: PolicyUpdatePayload,
    current_user: AuthenticatedUser = Depends(require_roles(["admin"]))
):
    global _system_policies
    _system_policies.update(payload.model_dump())
    return {"status": "policies_updated", "policies": _system_policies}

@router.post("/demo/seed")
def seed_demo_data(current_user: AuthenticatedUser = Depends(require_roles(["admin", "operator"]))):
    from scripts.seed_demo import seed_campus_district
    count = seed_campus_district()
    return {"status": "demo_district_seeded", "assets_and_workers_created": count}

@router.post("/demo/reset")
def reset_demo_data(current_user: AuthenticatedUser = Depends(require_roles(["admin", "operator"]))):
    Database.reset_state()
    from scripts.seed_demo import seed_campus_district
    seed_campus_district()
    return {"status": "demo_reset_complete", "message": "Demo state reset and Campus District restored"}
