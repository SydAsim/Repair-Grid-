import boto3
import os
from decimal import Decimal

TABLE_NAMES_TO_WIPE = [
    "RepairGridReports",
    "RepairGridMissions",
    "RepairGridDecisions",
    "RepairGridEvents",
    "RepairGridConnections",
]

S3_BUCKET_NAME = os.getenv("S3_EVIDENCE_BUCKET", "repairgrid-evidence-011528288924-us-east-1")
REGION = os.getenv("AWS_REGION", "us-east-1")

dynamodb_client = boto3.client("dynamodb", region_name=REGION)
dynamodb_resource = boto3.resource("dynamodb", region_name=REGION)
s3_client = boto3.client("s3", region_name=REGION)

print(f"============================================================")
print(f"  REPAIRGRID AWS COMPLETE DATA WIPE & RESET UTILITY")
print(f"  Region: {REGION}")
print(f"  S3 Bucket: {S3_BUCKET_NAME}")
print(f"============================================================\n")

# 1. WIPE S3 EVIDENCE BUCKET
print(">>> Step 1: Purging all photos/images in S3 evidence bucket...")
try:
    paginator = s3_client.get_paginator("list_objects_v2")
    deleted_objects = 0
    for page in paginator.paginate(Bucket=S3_BUCKET_NAME):
        contents = page.get("Contents", [])
        if contents:
            delete_entries = [{"Key": obj["Key"]} for obj in contents]
            resp = s3_client.delete_objects(
                Bucket=S3_BUCKET_NAME,
                Delete={"Objects": delete_entries}
            )
            deleted_objects += len(resp.get("Deleted", []))
    print(f"    [S3 SUCCESS] Deleted {deleted_objects} image/evidence objects from '{S3_BUCKET_NAME}'.")
except Exception as e:
    print(f"    [S3 ERROR] Failed purging bucket '{S3_BUCKET_NAME}': {e}")

# 2. WIPE DYNAMODB TABLES
print("\n>>> Step 2: Purging all previous reports, missions, decisions, events, connections...")
for table_name in TABLE_NAMES_TO_WIPE:
    try:
        table_desc = dynamodb_client.describe_table(TableName=table_name)
        key_schema = table_desc["Table"]["KeySchema"]
        key_names = [k["AttributeName"] for k in key_schema]

        table = dynamodb_resource.Table(table_name)
        scan = table.scan()
        items = scan.get("Items", [])
        while "LastEvaluatedKey" in scan:
            scan = table.scan(ExclusiveStartKey=scan["LastEvaluatedKey"])
            items.extend(scan.get("Items", []))

        print(f"    Scanning '{table_name}': found {len(items)} items to purge...")
        with table.batch_writer() as batch:
            for item in items:
                key = {k: item[k] for k in key_names}
                batch.delete_item(Key=key)

        verify_count = table.scan(Select="COUNT")["Count"]
        print(f"    [DDB SUCCESS] '{table_name}' wiped clean. Remaining items: {verify_count}")
    except Exception as e:
        print(f"    [DDB ERROR] Error wiping table '{table_name}': {e}")

# 3. RESET TECHNICIAN / WORKER ACCOUNTS
print("\n>>> Step 3: Resetting all technician accounts in 'RepairGridWorkers'...")
try:
    workers_table = dynamodb_resource.Table("RepairGridWorkers")
    workers_scan = workers_table.scan()
    workers = workers_scan.get("Items", [])
    while "LastEvaluatedKey" in workers_scan:
        workers_scan = workers_table.scan(ExclusiveStartKey=workers_scan["LastEvaluatedKey"])
        workers.extend(workers_scan.get("Items", []))

    print(f"    Found {len(workers)} worker/technician accounts. Resetting to clean AVAILABLE state...")
    universal_skills = ["electrical", "street_lighting", "drainage", "surface_repair", "general_facilities", "plumbing"]

    for w in workers:
        w_id = w["workerId"]
        w["activeMissionId"] = None
        w["availability"] = "AVAILABLE"
        w["skills"] = universal_skills
        w["zone"] = "campus_all"
        workers_table.put_item(Item=w)
        print(f"      - Reset worker: {w_id} ({w.get('displayName', 'Technician')}) -> AVAILABLE, 0 active missions, multi-trade enabled")

    # Ensure canonical baseline workers exist
    BASELINE_WORKERS = [
        {
            "workerId": "wkr_ahmed",
            "userId": "worker-electric-001",
            "displayName": "Ahmed Khan",
            "department": "electrical",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7750,
            "lastLng": -122.4192,
        },
        {
            "workerId": "wkr_sarah",
            "userId": "worker-electric-002",
            "displayName": "Sarah Jenkins",
            "department": "electrical",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7745,
            "lastLng": -122.4198,
        },
        {
            "workerId": "wkr_marcus",
            "userId": "worker-plumber-001",
            "displayName": "Marcus Thorne",
            "department": "plumbing_drainage",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7753,
            "lastLng": -122.4188,
        },
        {
            "workerId": "wkr_elena",
            "userId": "worker-plumber-002",
            "displayName": "Elena Rostova",
            "department": "plumbing_drainage",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7761,
            "lastLng": -122.4176,
        },
        {
            "workerId": "wkr_darius",
            "userId": "worker-road-001",
            "displayName": "Darius Vance",
            "department": "roads",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7757,
            "lastLng": -122.4182,
        },
        {
            "workerId": "wkr_liam",
            "userId": "worker-general-001",
            "displayName": "Liam O'Connor",
            "department": "facilities",
            "skills": universal_skills,
            "zone": "campus_all",
            "availability": "AVAILABLE",
            "activeMissionId": None,
            "certifications": ["MASTER_CERTIFIED", "SAFETY_LVL3"],
            "lastLat": 37.7764,
            "lastLng": -122.4171,
        },
    ]

    for bw in BASELINE_WORKERS:
        clean_bw = {k: Decimal(str(v)) if isinstance(v, float) else v for k, v in bw.items()}
        workers_table.put_item(Item=clean_bw)

    print(f"    [WORKERS SUCCESS] All technician profiles are clean, AVAILABLE, and enabled for all trade categories.")
except Exception as e:
    print(f"    [WORKERS ERROR] Error resetting workers: {e}")

# 4. FINAL VERIFICATION SUMMARY
print("\n>>> Step 4: Final AWS Verification Summary:")
tables_to_verify = TABLE_NAMES_TO_WIPE + ["RepairGridWorkers"]
for t in tables_to_verify:
    cnt = dynamodb_resource.Table(t).scan(Select="COUNT")["Count"]
    print(f"    - Table '{t}': {cnt} items")

s3_count = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME).get("KeyCount", 0)
print(f"    - S3 Bucket '{S3_BUCKET_NAME}': {s3_count} objects")

print("\n============================================================")
print("  AWS DATA CLEANUP COMPLETE! SYSTEM IS READY FOR FRESH DEMO")
print("============================================================\n")
