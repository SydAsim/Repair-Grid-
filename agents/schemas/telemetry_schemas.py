from typing import Optional, Dict, Any
from pydantic import BaseModel

class AgentActivityEvent(BaseModel):
    event_id: str
    mission_id: Optional[str] = None
    report_id: Optional[str] = None
    agent_name: str
    node: str
    start_time: str
    end_time: str
    duration_seconds: float
    tool_name: Optional[str] = None
    status: str # STARTED | COMPLETED | FAILED | INTERRUPTED
    structured_outcome: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    error: Optional[str] = None
