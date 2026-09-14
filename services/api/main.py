import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    # Load root .env if it exists
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .routers import uploads, reports, workers, operations, admin, auth

app = FastAPI(
    title="RepairGrid API",
    description="Autonomous Community Maintenance Network Backend & Strands Tool Gateway",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Routers
app.include_router(auth.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(reports.map_router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(workers.missions_router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(operations.decisions_router, prefix="/api")
app.include_router(operations.sim_router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    try:
        from scripts.seed_demo import seed_campus_district
        from services.api.db import ENABLE_LOCAL_MOCK
        seed_campus_district(seed_reports=ENABLE_LOCAL_MOCK)
    except Exception as e:
        print(f"Demo seed warning: {e}")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RepairGrid Autonomous Operations Network",
        "env": os.getenv("APP_ENV", "development"),
        "primary_model": os.getenv("PRIMARY_MODEL", "us.amazon.nova-2-lite-v1:0"),
    }

# AWS Lambda Handler
handler = Mangum(app)
