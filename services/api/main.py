import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .routers import uploads, reports, workers, operations, admin

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
app.include_router(uploads.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(reports.map_router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(workers.missions_router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(operations.decisions_router, prefix="/api")
app.include_router(operations.sim_router, prefix="/api")
app.include_router(admin.router, prefix="/api")

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
