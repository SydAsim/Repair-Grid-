import os
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

ENABLE_LOCAL_MOCK = os.getenv("ENABLE_LOCAL_AGENT_MOCK", "true").lower() == "true"

# In-Memory stores for local zero-cloud-spend evaluation
_mock_reports: Dict[str, Dict[str, Any]] = {}
_mock_missions: Dict[str, Dict[str, Any]] = {}
_mock_workers: Dict[str, Dict[str, Any]] = {}
_mock_decisions: Dict[str, Dict[str, Any]] = {}
_mock_events: Dict[str, List[Dict[str, Any]]] = {}

def get_dynamo_resource():
    if not ENABLE_LOCAL_MOCK and os.getenv("AWS_REGION"):
        return boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
    return None

class Database:
    @staticmethod
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    # --- Reports ---
    @staticmethod
    def save_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
        report_id = report_data["reportId"]
        report_data["updatedAt"] = Database.now_iso()
        if "createdAt" not in report_data:
            report_data["createdAt"] = report_data["updatedAt"]

        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_REPORTS_TABLE", "RepairGridReports"))
            table.put_item(Item=report_data)
        else:
            _mock_reports[report_id] = report_data.copy()
        return report_data

    @staticmethod
    def get_report(report_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_REPORTS_TABLE", "RepairGridReports"))
            res = table.get_item(Key={"reportId": report_id})
            return res.get("Item")
        return _mock_reports.get(report_id)

    @staticmethod
    def list_reports(limit: int = 50) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_REPORTS_TABLE", "RepairGridReports"))
            res = table.scan(Limit=limit)
            return res.get("Items", [])
        return list(_mock_reports.values())[:limit]

    # --- Missions ---
    @staticmethod
    def save_mission(mission_data: Dict[str, Any]) -> Dict[str, Any]:
        mission_id = mission_data["missionId"]
        mission_data["updatedAt"] = Database.now_iso()
        if "createdAt" not in mission_data:
            mission_data["createdAt"] = mission_data["updatedAt"]
        if "version" not in mission_data:
            mission_data["version"] = 1

        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_MISSIONS_TABLE", "RepairGridMissions"))
            table.put_item(Item=mission_data)
        else:
            _mock_missions[mission_id] = mission_data.copy()
        return mission_data

    @staticmethod
    def get_mission(mission_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_MISSIONS_TABLE", "RepairGridMissions"))
            res = table.get_item(Key={"missionId": mission_id})
            return res.get("Item")
        return _mock_missions.get(mission_id)

    @staticmethod
    def list_missions(limit: int = 50) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_MISSIONS_TABLE", "RepairGridMissions"))
            res = table.scan(Limit=limit)
            return res.get("Items", [])
        return list(_mock_missions.values())[:limit]

    # --- Workers ---
    @staticmethod
    def save_worker(worker_data: Dict[str, Any]) -> Dict[str, Any]:
        worker_id = worker_data["workerId"]
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            table.put_item(Item=worker_data)
        else:
            _mock_workers[worker_id] = worker_data.copy()
        return worker_data

    @staticmethod
    def get_worker(worker_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            res = table.get_item(Key={"workerId": worker_id})
            return res.get("Item")
        return _mock_workers.get(worker_id)

    @staticmethod
    def list_workers() -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            res = table.scan()
            return res.get("Items", [])
        return list(_mock_workers.values())

    # --- Decisions (HITL) ---
    @staticmethod
    def save_decision(decision_data: Dict[str, Any]) -> Dict[str, Any]:
        decision_id = decision_data["decisionId"]
        if "createdAt" not in decision_data:
            decision_data["createdAt"] = Database.now_iso()
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            table.put_item(Item=decision_data)
        else:
            _mock_decisions[decision_id] = decision_data.copy()
        return decision_data

    @staticmethod
    def get_decision(decision_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            res = table.get_item(Key={"decisionId": decision_id})
            return res.get("Item")
        return _mock_decisions.get(decision_id)

    @staticmethod
    def list_decisions(status: Optional[str] = None) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            res = table.scan()
            items = res.get("Items", [])
        else:
            items = list(_mock_decisions.values())
        if status:
            return [d for d in items if d.get("status") == status]
        return items

    # --- Events (Audit & Strands Telemetry) ---
    @staticmethod
    def record_event(mission_id: str, event_type: str, actor_type: str, actor_id: str, payload: Dict[str, Any]):
        timestamp = Database.now_iso()
        event_id = f"evt_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        event_item = {
            "missionId": mission_id,
            "timestamp#eventId": f"{timestamp}#{event_id}",
            "eventId": event_id,
            "timestamp": timestamp,
            "eventType": event_type,
            "actorType": actor_type,
            "actorId": actor_id,
            "structuredPayload": payload,
        }
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_EVENTS_TABLE", "RepairGridEvents"))
            table.put_item(Item=event_item)
        else:
            if mission_id not in _mock_events:
                _mock_events[mission_id] = []
            _mock_events[mission_id].append(event_item)

    @staticmethod
    def get_mission_events(mission_id: str) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_EVENTS_TABLE", "RepairGridEvents"))
            # query by missionId PK
            from boto3.dynamodb.conditions import Key
            res = table.query(KeyConditionExpression=Key("missionId").eq(mission_id))
            return res.get("Items", [])
        return _mock_events.get(mission_id, [])

    @staticmethod
    def reset_state():
        """Used by demo reset endpoint"""
        global _mock_reports, _mock_missions, _mock_workers, _mock_decisions, _mock_events
        _mock_reports.clear()
        _mock_missions.clear()
        _mock_workers.clear()
        _mock_decisions.clear()
        _mock_events.clear()
