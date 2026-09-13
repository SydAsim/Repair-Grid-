import os
import uuid
import boto3
from decimal import Decimal
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

ENABLE_LOCAL_MOCK = os.getenv("ENABLE_LOCAL_AGENT_MOCK", "true").lower() == "true"

def _to_dynamo_item(obj: Any) -> Any:
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: _to_dynamo_item(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        return [_to_dynamo_item(v) for v in obj]
    return obj

def _from_dynamo_item(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    elif isinstance(obj, dict):
        return {k: _from_dynamo_item(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_from_dynamo_item(v) for v in obj]
    return obj

# In-Memory stores for local zero-cloud-spend evaluation
_mock_reports: Dict[str, Dict[str, Any]] = {}
_mock_missions: Dict[str, Dict[str, Any]] = {}
_mock_workers: Dict[str, Dict[str, Any]] = {}
_mock_decisions: Dict[str, Dict[str, Any]] = {}
_mock_events: Dict[str, List[Dict[str, Any]]] = {}
_mock_notifications: Dict[str, Dict[str, Any]] = {}
_mock_users: Dict[str, Dict[str, Any]] = {}

def get_dynamo_resource():
    if not ENABLE_LOCAL_MOCK and os.getenv("AWS_REGION"):
        return boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
    return None

def _sanitize_for_dynamo(data: Any) -> Any:
    if isinstance(data, str):
        if data.startswith("data:image/") and len(data) > 5000:
            return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800"
        return data
    elif isinstance(data, dict):
        return {k: _sanitize_for_dynamo(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_sanitize_for_dynamo(v) for v in data]
    return data

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
            sanitized = _sanitize_for_dynamo(report_data)
            table.put_item(Item=_to_dynamo_item(sanitized))
        else:
            _mock_reports[report_id] = report_data.copy()
        return report_data

    @staticmethod
    def get_report(report_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_REPORTS_TABLE", "RepairGridReports"))
            res = table.get_item(Key={"reportId": report_id})
            item = res.get("Item")
            return _from_dynamo_item(item) if item else None
        return _mock_reports.get(report_id)

    @staticmethod
    def list_reports(limit: int = 50) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_REPORTS_TABLE", "RepairGridReports"))
            res = table.scan(Limit=limit)
            return [_from_dynamo_item(item) for item in res.get("Items", [])]
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
            sanitized = _sanitize_for_dynamo(mission_data)
            table.put_item(Item=_to_dynamo_item(sanitized))
        else:
            _mock_missions[mission_id] = mission_data.copy()
        return mission_data

    @staticmethod
    def get_mission(mission_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_MISSIONS_TABLE", "RepairGridMissions"))
            res = table.get_item(Key={"missionId": mission_id})
            item = res.get("Item")
            return _from_dynamo_item(item) if item else None
        return _mock_missions.get(mission_id)

    @staticmethod
    def list_missions(limit: int = 50) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_MISSIONS_TABLE", "RepairGridMissions"))
            res = table.scan(Limit=limit)
            return [_from_dynamo_item(item) for item in res.get("Items", [])]
        return list(_mock_missions.values())[:limit]

    # --- Workers ---
    @staticmethod
    def save_worker(worker_data: Dict[str, Any]) -> Dict[str, Any]:
        worker_id = worker_data["workerId"]
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            table.put_item(Item=_to_dynamo_item(worker_data))
        else:
            _mock_workers[worker_id] = worker_data.copy()
        return worker_data

    @staticmethod
    def get_worker(worker_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            res = table.get_item(Key={"workerId": worker_id})
            item = res.get("Item")
            return _from_dynamo_item(item) if item else None
        if worker_id in _mock_workers:
            return _mock_workers[worker_id]
        for w in _mock_workers.values():
            if w.get("workerId") == worker_id or w.get("userId") == worker_id or w.get("email") == worker_id:
                return w
        return None

    @staticmethod
    def seed_workers():
        base_workers = [
            {
                "workerId": "wkr_ahmed",
                "userId": "worker-electric-001",
                "displayName": "Ahmed Khan",
                "department": "electrical",
                "skills": ["electrical", "street_lighting", "surface_repair", "drainage", "general_facilities"],
                "zone": "campus_all",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["MASTER_ELECTRICIAN", "SAFETY_LVL3", "CROSS_TRADE_LEAD"],
                "lastLat": 37.7750,
                "lastLng": -122.4192,
            },
            {
                "workerId": "wkr_sarah",
                "userId": "worker-electric-002",
                "displayName": "Sarah Jenkins",
                "department": "electrical",
                "skills": ["electrical", "power_distribution"],
                "zone": "campus_south",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["HIGH_VOLTAGE", "OSHA_10"],
                "lastLat": 37.7745,
                "lastLng": -122.4198,
            },
            {
                "workerId": "wkr_marcus",
                "userId": "worker-plumber-001",
                "displayName": "Marcus Thorne",
                "department": "plumbing_drainage",
                "skills": ["plumbing", "drainage", "water"],
                "zone": "campus_north",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["HYDRAULICS_LVL2", "CONFINED_SPACE"],
                "lastLat": 37.7753,
                "lastLng": -122.4188,
            },
            {
                "workerId": "wkr_elena",
                "userId": "worker-plumber-002",
                "displayName": "Elena Rostova",
                "department": "plumbing_drainage",
                "skills": ["plumbing", "excavation", "drainage"],
                "zone": "campus_east",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["DRAINAGE_SPECIALIST", "EXCAVATION_CERT"],
                "lastLat": 37.7761,
                "lastLng": -122.4176,
            },
            {
                "workerId": "wkr_darius",
                "userId": "worker-road-001",
                "displayName": "Darius Vance",
                "department": "roads",
                "skills": ["roads", "surface_repair", "asphalt"],
                "zone": "campus_all",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["HEAVY_EQUIPMENT", "ASPHALT_SAFETY"],
                "lastLat": 37.7757,
                "lastLng": -122.4182,
            },
            {
                "workerId": "wkr_liam",
                "userId": "worker-general-001",
                "displayName": "Liam O'Connor",
                "department": "facilities",
                "skills": ["general_facilities", "safety_signage"],
                "zone": "campus_all",
                "availability": "AVAILABLE",
                "activeMissionId": None,
                "certifications": ["FACILITIES_MAINT", "FIRST_AID"],
                "lastLat": 37.7764,
                "lastLng": -122.4171,
            },
        ]
        for w in base_workers:
            Database.save_worker(w)

    @staticmethod
    def list_workers() -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_WORKERS_TABLE", "RepairGridWorkers"))
            res = table.scan()
            return [_from_dynamo_item(item) for item in res.get("Items", [])]
        if len(_mock_workers) == 0:
            Database.seed_workers()
        return list(_mock_workers.values())

    # --- User notifications ---
    @staticmethod
    def save_notification(notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist an in-app notification.

        Notifications deliberately target a stable user/worker identifier, never an
        email address. The local store is the development transport; the same
        contract can later be backed by DynamoDB and WebSocket delivery on AWS.
        """
        notification_id = notification_data["notificationId"]
        notification_data.setdefault("createdAt", Database.now_iso())
        notification_data.setdefault("readAt", None)
        notification_data.setdefault("deliveryStatus", "AVAILABLE")
        _mock_notifications[notification_id] = notification_data.copy()
        return notification_data

    @staticmethod
    def create_notification(
        recipient_user_id: str,
        recipient_worker_id: Optional[str],
        notification_type: str,
        title: str,
        message: str,
        mission_id: Optional[str] = None,
        action_url: Optional[str] = None,
        priority: str = "NORMAL",
    ) -> Dict[str, Any]:
        import uuid

        return Database.save_notification({
            "notificationId": f"NTF-{uuid.uuid4().hex[:10].upper()}",
            "recipientUserId": recipient_user_id,
            "recipientWorkerId": recipient_worker_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "missionId": mission_id,
            "actionUrl": action_url,
            "priority": priority,
        })

    @staticmethod
    def list_notifications(
        recipient_user_id: Optional[str] = None,
        recipient_worker_id: Optional[str] = None,
        unread_only: bool = False,
    ) -> List[Dict[str, Any]]:
        items = list(_mock_notifications.values())

        # Synthesize notifications from missions so they persist across all Lambda instances!
        try:
            missions = Database.list_missions(limit=50)
            seen_ids = {item.get("missionId") for item in items if item.get("missionId")}

            for m in missions:
                m_id = m.get("missionId")
                if not m_id or m_id in seen_ids:
                    continue
                m_status = m.get("status", "AWAITING_ACCEPTANCE")
                cat = (m.get("category") or "infrastructure").replace("_", " ").title()
                diag = m.get("aiSummary") or m.get("triageNotes") or f"Amazon Nova diagnosis: {cat} defect verified. Strands matched {m.get('department', 'Electrical')} specialist."

                items.append({
                    "notificationId": f"NTF-{m_id}",
                    "recipientUserId": recipient_user_id or "worker-electric-001",
                    "recipientWorkerId": m.get("assignedWorkerId") or m.get("assignedTechnicianId") or "wkr_ahmed",
                    "type": "MISSION_OFFERED",
                    "title": f"🚨 Dispatch Offer: {m.get('title', f'Repair {cat}')}",
                    "message": f"{m.get('description', 'New assigned civic work order.')}",
                    "missionId": m_id,
                    "actionUrl": f"/worker/missions/{m_id}",
                    "priority": m.get("riskBand", "HIGH"),
                    "photoEvidence": m.get("photoEvidence"),
                    "aiRecommendation": diag,
                    "category": m.get("category", "streetlights"),
                    "location": m.get("location", "Campus Site"),
                    "matchScore": m.get("matchScorePct") or 95,
                    "status": m_status,
                    "createdAt": m.get("createdAt", Database.now_iso()),
                    "readAt": None if m_status in ["AWAITING_ACCEPTANCE", "MISSION_CREATED"] else m.get("updatedAt"),
                    "deliveryStatus": "AVAILABLE" if m_status in ["AWAITING_ACCEPTANCE", "MISSION_CREATED"] else "ACTIONED"
                })
                seen_ids.add(m_id)
        except Exception as e:
            print(f"Error synthesizing notifications from missions: {e}")

        if recipient_user_id or recipient_worker_id:
            items = [
                item for item in items
                if (recipient_user_id and item.get("recipientUserId") == recipient_user_id)
                or (recipient_worker_id and item.get("recipientWorkerId") in [recipient_worker_id, "all", "wkr_ahmed", "worker-electric-001", None])
                or not item.get("recipientWorkerId")
            ]
        if unread_only:
            items = [item for item in items if not item.get("readAt")]
        return sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)

    @staticmethod
    def mark_notification_read(notification_id: str) -> Optional[Dict[str, Any]]:
        item = _mock_notifications.get(notification_id)
        if not item:
            return None
        item["readAt"] = item.get("readAt") or Database.now_iso()
        item["deliveryStatus"] = "READ"
        _mock_notifications[notification_id] = item.copy()
        return item

    @staticmethod
    def mark_mission_notifications_actioned(mission_id: str, worker_id: str) -> None:
        for notification_id, item in list(_mock_notifications.items()):
            if item.get("missionId") == mission_id and item.get("recipientWorkerId") == worker_id:
                item["readAt"] = item.get("readAt") or Database.now_iso()
                item["deliveryStatus"] = "ACTIONED"
                _mock_notifications[notification_id] = item.copy()

    # --- Decisions (HITL) ---
    @staticmethod
    def save_decision(decision_data: Dict[str, Any]) -> Dict[str, Any]:
        decision_id = decision_data["decisionId"]
        if "createdAt" not in decision_data:
            decision_data["createdAt"] = Database.now_iso()
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            table.put_item(Item=_to_dynamo_item(decision_data))
        else:
            _mock_decisions[decision_id] = decision_data.copy()
        return decision_data

    @staticmethod
    def get_decision(decision_id: str) -> Optional[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            res = table.get_item(Key={"decisionId": decision_id})
            item = res.get("Item")
            return _from_dynamo_item(item) if item else None
        return _mock_decisions.get(decision_id)

    @staticmethod
    def list_decisions(status: Optional[str] = None) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_DECISIONS_TABLE", "RepairGridDecisions"))
            res = table.scan()
            items = [_from_dynamo_item(item) for item in res.get("Items", [])]
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
            table.put_item(Item=_to_dynamo_item(event_item))
        else:
            if mission_id not in _mock_events:
                _mock_events[mission_id] = []
            _mock_events[mission_id].append(event_item)

    @staticmethod
    def get_mission_events(identifier: str) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_EVENTS_TABLE", "RepairGridEvents"))
            from boto3.dynamodb.conditions import Key
            res = table.query(KeyConditionExpression=Key("missionId").eq(identifier))
            items = [_from_dynamo_item(item) for item in res.get("Items", [])]
            return sorted(items, key=lambda x: x.get("timestamp", ""))
        
        matched_events = []
        if identifier in _mock_events:
            matched_events.extend(_mock_events[identifier])
        
        # Cross-reference if identifier is a reportId or missionId
        for m_id, m in _mock_missions.items():
            if m.get("reportId") == identifier or identifier in m.get("reportIds", []):
                if m_id != identifier and m_id in _mock_events:
                    for ev in _mock_events[m_id]:
                        if ev not in matched_events:
                            matched_events.append(ev)
        
        matched_events.sort(key=lambda x: x.get("timestamp", ""))
        return matched_events

    @staticmethod
    def list_all_events(limit: int = 100) -> List[Dict[str, Any]]:
        dynamo = get_dynamo_resource()
        if dynamo and not ENABLE_LOCAL_MOCK:
            table = dynamo.Table(os.getenv("DYNAMODB_EVENTS_TABLE", "RepairGridEvents"))
            res = table.scan(Limit=limit)
            items = [_from_dynamo_item(item) for item in res.get("Items", [])]
        else:
            items = []
            for ev_list in _mock_events.values():
                for ev in ev_list:
                    if ev not in items:
                        items.append(ev)
        items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return items[:limit]

    @staticmethod
    def seed_users_if_needed():
        if "resident@repairgrid.demo" not in _mock_users:
            _mock_users["resident@repairgrid.demo"] = {
                "userId": "resident-demo-001",
                "name": "Alex Mercer (Resident)",
                "email": "resident@repairgrid.demo",
                "password": "password123",
                "role": "resident",
                "createdAt": Database.now_iso(),
            }
        if "worker.electric@repairgrid.demo" not in _mock_users:
            _mock_users["worker.electric@repairgrid.demo"] = {
                "userId": "worker-electric-001",
                "workerId": "wkr_ahmed",
                "name": "Ahmed Khan (Electrical Specialist)",
                "email": "worker.electric@repairgrid.demo",
                "password": "password123",
                "role": "field_worker",
                "createdAt": Database.now_iso(),
            }
        if "tech@repairgrid.demo" not in _mock_users:
            _mock_users["tech@repairgrid.demo"] = {
                "userId": "worker-electric-001",
                "workerId": "wkr_ahmed",
                "name": "Ahmed Khan (Field Technician)",
                "email": "tech@repairgrid.demo",
                "password": "password123",
                "role": "field_worker",
                "createdAt": Database.now_iso(),
            }
        if "operator@repairgrid.demo" not in _mock_users:
            _mock_users["operator@repairgrid.demo"] = {
                "userId": "operator-demo-001",
                "name": "Jordan Vance (Chief Dispatch Operator)",
                "email": "operator@repairgrid.demo",
                "password": "password123",
                "role": "operator",
                "createdAt": Database.now_iso(),
            }
        if "admin@repairgrid.demo" not in _mock_users:
            _mock_users["admin@repairgrid.demo"] = {
                "userId": "admin-demo-001",
                "name": "Dr. Evelyn Reed (Municipal Admin)",
                "email": "admin@repairgrid.demo",
                "password": "password123",
                "role": "admin",
                "createdAt": Database.now_iso(),
            }

    @staticmethod
    def save_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        email = user_data["email"].lower().strip()
        if "userId" not in user_data:
            user_data["userId"] = f"res_{uuid.uuid4().hex[:8]}"
        if "createdAt" not in user_data:
            user_data["createdAt"] = Database.now_iso()
        _mock_users[email] = user_data
        return user_data

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        Database.seed_users_if_needed()
        return _mock_users.get(email.lower().strip())

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        Database.seed_users_if_needed()
        for u in _mock_users.values():
            if u.get("userId") == user_id:
                return u
        return None

    @staticmethod
    def list_users() -> List[Dict[str, Any]]:
        Database.seed_users_if_needed()
        return list(_mock_users.values())

    @staticmethod
    def clear_live_data():
        """Clears all live reports, missions, and events without wiping user registrations"""
        global _mock_reports, _mock_missions, _mock_decisions, _mock_events, _mock_notifications
        _mock_reports.clear()
        _mock_missions.clear()
        _mock_decisions.clear()
        _mock_events.clear()
        _mock_notifications.clear()
        for w in _mock_workers.values():
            w["activeMissionId"] = None
            w["availability"] = "AVAILABLE"

    @staticmethod
    def reset_state():
        """Used by demo reset endpoint"""
        global _mock_reports, _mock_missions, _mock_workers, _mock_decisions, _mock_events, _mock_notifications, _mock_users
        _mock_reports.clear()
        _mock_missions.clear()
        _mock_workers.clear()
        _mock_decisions.clear()
        _mock_events.clear()
        _mock_notifications.clear()
        _mock_users.clear()
        Database.seed_users_if_needed()
