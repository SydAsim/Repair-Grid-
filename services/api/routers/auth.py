import re
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..db import Database
from ..middleware.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "resident"
    department: Optional[str] = "electrical"

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    token: str

@router.post("/register", response_model=AuthResponse)
def register_user(req: RegisterRequest):
    name = req.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Full name must be at least 2 characters")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    existing = Database.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    clean_email = req.email.lower().strip()
    prefix = clean_email.split("@")[0].replace(".", "_")

    raw_role = (req.role or "resident").lower()
    if raw_role in ("field_worker", "technician", "worker"):
        canonical_role = "field_worker"
        user_id = f"wkr_{prefix}_{uuid.uuid4().hex[:6]}"
    elif raw_role in ("operator", "mission_control"):
        canonical_role = "operator"
        user_id = f"op_{prefix}_{uuid.uuid4().hex[:6]}"
    else:
        canonical_role = "resident"
        user_id = f"res_{prefix}_{uuid.uuid4().hex[:6]}"

    user_item = {
        "userId": user_id,
        "name": name,
        "email": clean_email,
        "password": req.password,
        "role": canonical_role,
        "createdAt": Database.now_iso()
    }
    Database.save_user(user_item)

    if canonical_role == "field_worker":
        department = req.department or "electrical"
        # Grant primary + multi-trade skills so technician can handle/view all community incident types
        skills = ["electrical", "street_lighting", "drainage", "surface_repair", "general_facilities"]
        Database.save_worker({
            "workerId": user_id,
            "userId": user_id,
            "displayName": name,
            "email": clean_email,
            "department": department,
            "skills": skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7750,
            "lastLng": -122.4192,
        })

    return AuthResponse(
        user_id=user_item["userId"],
        name=user_item["name"],
        email=user_item["email"],
        role=user_item["role"],
        token=f"token-{user_item['userId']}"
    )

@router.post("/login", response_model=AuthResponse)
def login_user(req: LoginRequest):
    Database.seed_users_if_needed()
    clean_email = req.email.lower().strip()
    user = Database.get_user_by_email(clean_email)

    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email. Please register first.")

    is_demo = clean_email in (
        "resident@repairgrid.demo",
        "worker.electric@repairgrid.demo",
        "tech@repairgrid.demo",
        "operator@repairgrid.demo",
        "admin@repairgrid.demo",
    )

    if user.get("password") and user.get("password") != req.password:
        if is_demo and req.password in ("password123", "demo"):
            pass
        else:
            raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    return AuthResponse(
        user_id=user["userId"],
        name=user.get("name", clean_email.split("@")[0]),
        email=user["email"],
        role=user.get("role", "resident"),
        token=f"token-{user['userId']}"
    )

@router.get("/me")
def get_current_user_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    user = Database.get_user_by_id(current_user.user_id) or Database.get_user_by_email(current_user.email)
    name = user.get("name") if user else current_user.email.split("@")[0]
    return {
        "user_id": current_user.user_id,
        "name": name,
        "email": current_user.email,
        "role": current_user.roles[0] if current_user.roles else "resident"
    }
