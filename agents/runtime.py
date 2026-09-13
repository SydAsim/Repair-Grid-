import os
import json
import logging
from agents.graphs.main_graph import RepairGridGraph

logger = logging.getLogger("agent_runner")
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Strands Agent Runtime Lambda Handler.
    Executes autonomous graph pipeline (intake, duplicate detection, risk scoring,
    resource matching, guardian verification, HITL gates).
    """
    logger.info("AgentRunner invoked with event: %s", json.dumps(event, default=str))

    payload = event
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            try:
                payload = json.loads(body)
            except Exception:
                payload = event
        elif isinstance(body, dict):
            payload = body

    try:
        execution_result = RepairGridGraph.execute(payload)
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(execution_result, default=str)
        }
    except Exception as e:
        logger.error("Agent execution error: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
