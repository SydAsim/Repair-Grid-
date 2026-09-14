import os
import io
import zipfile
import boto3
import time
import urllib.request
import json

LAMBDA_FUNCTION = "RepairGridApiStack-RepairGridApiHandler3468E20D-vqcEww364Df8"
REGION = "us-east-1"

print(f"1. Creating in-memory zip bundle of backend code (agents, scripts, services)...")
zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
    for folder in ["agents", "scripts", "services"]:
        for root, dirs, files in os.walk(folder):
            if "__pycache__" in root or ".pytest_cache" in root:
                continue
            for file in files:
                if file.endswith((".pyc", ".pyo")):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ".")
                zip_file.write(file_path, arcname)

zip_bytes = zip_buffer.getvalue()
print(f"Bundle created: {len(zip_bytes)} bytes")

client = boto3.client("lambda", region_name=REGION)

print(f"2. Updating Lambda code for {LAMBDA_FUNCTION}...")
update_res = client.update_function_code(
    FunctionName=LAMBDA_FUNCTION,
    ZipFile=zip_bytes,
)
print(f"Code updated! Version: {update_res['Version']}, LastModified: {update_res['LastModified']}")

print("3. Waiting for function update to finish...")
waiter = client.get_waiter("function_updated")
waiter.wait(FunctionName=LAMBDA_FUNCTION)

print("4. Updating Lambda environment variables for Nova 2 Lite...")
current_config = client.get_function_configuration(FunctionName=LAMBDA_FUNCTION)
env_vars = current_config.get("Environment", {}).get("Variables", {})
env_vars["PRIMARY_MODEL"] = "us.amazon.nova-2-lite-v1:0"
env_vars["ENABLE_LOCAL_AGENT_MOCK"] = "false"
env_vars["ENABLE_LIVE_BEDROCK"] = "true"

cfg_res = client.update_function_configuration(
    FunctionName=LAMBDA_FUNCTION,
    Environment={"Variables": env_vars}
)
print("Environment configuration updated!")

waiter.wait(FunctionName=LAMBDA_FUNCTION)

print("5. Verifying live API health on AWS...")
time.sleep(2)
api_url = "https://135szwxyp5.execute-api.us-east-1.amazonaws.com/api/health"
req = urllib.request.Request(api_url, headers={"User-Agent": "RepairGrid-Deploy/1.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print("LIVE AWS RESPONSE:", data)
    assert data.get("status") == "healthy"
    print("SUCCESS: Backend Lambda is running live on AWS with Amazon Nova Pro!")
