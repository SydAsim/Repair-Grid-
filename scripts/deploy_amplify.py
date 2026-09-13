import urllib.request
import boto3
import shutil
import os

APP_ID = "dpd7m9jmuhh6w"
BRANCH_NAME = "main"
DIST_ZIP = "dist.zip"
OUT_DIR = os.path.join("apps", "web", "out")

client = boto3.client("amplify", region_name="us-east-1")

print("1. Compressing apps/web/out into dist.zip...")
if os.path.exists(DIST_ZIP):
    os.remove(DIST_ZIP)

# Create zip archive without top-level out folder
shutil.make_archive("dist", "zip", OUT_DIR)
print(f"Created {DIST_ZIP} ({os.path.getsize(DIST_ZIP)} bytes)")

print("2. Creating Amplify deployment...")
dep = client.create_deployment(appId=APP_ID, branchName=BRANCH_NAME)
job_id = dep["jobId"]
upload_url = dep["zipUploadUrl"]
print(f"Deployment created! Job ID: {job_id}")

print("3. Uploading dist.zip to Amplify S3 bucket...")
with open(DIST_ZIP, "rb") as f:
    zip_bytes = f.read()

req = urllib.request.Request(upload_url, data=zip_bytes, method="PUT")
req.add_header("Content-Type", "application/zip")
with urllib.request.urlopen(req) as resp:
    print(f"Upload complete! HTTP Status: {resp.status}")

print(f"4. Starting deployment for Job ID: {job_id}...")
start_res = client.start_deployment(
    appId=APP_ID,
    branchName=BRANCH_NAME,
    jobId=job_id
)
print(f"Deployment started! Status: {start_res['jobSummary']['status']}")
