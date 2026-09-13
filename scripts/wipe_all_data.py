import boto3
import os

TABLE_NAMES = [
    "RepairGridReports",
    "RepairGridMissions",
    "RepairGridWorkers",
    "RepairGridDecisions",
    "RepairGridEvents",
    "RepairGridConnections"
]

region = os.getenv("AWS_REGION", "us-east-1")
dynamodb_client = boto3.client("dynamodb", region_name=region)
dynamodb_resource = boto3.resource("dynamodb", region_name=region)

print(f"Starting complete wipe of all DynamoDB tables in {region}...")

for table_name in TABLE_NAMES:
    try:
        table_desc = dynamodb_client.describe_table(TableName=table_name)
        key_schema = table_desc["Table"]["KeySchema"]
        key_names = [k["AttributeName"] for k in key_schema]
        print(f"\nScanning table '{table_name}' (Keys: {key_names})...")

        table = dynamodb_resource.Table(table_name)
        scan = table.scan()
        items = scan.get("Items", [])
        
        while "LastEvaluatedKey" in scan:
            scan = table.scan(ExclusiveStartKey=scan["LastEvaluatedKey"])
            items.extend(scan.get("Items", []))

        print(f"Found {len(items)} items to delete in '{table_name}'.")
        
        with table.batch_writer() as batch:
            for item in items:
                key = {k: item[k] for k in key_names}
                batch.delete_item(Key=key)

        # Verify 0 items remaining
        verify_scan = table.scan(Select="COUNT")
        print(f"Wipe complete for '{table_name}'. Items remaining: {verify_scan.get('Count', 0)}")
    except Exception as e:
        print(f"Error processing table '{table_name}': {e}")

print("\nAll DynamoDB tables successfully wiped!")
