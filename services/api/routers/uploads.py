import os
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..middleware.auth import AuthenticatedUser, get_current_user
import boto3

router = APIRouter(prefix="/uploads", tags=["Uploads"])

class PresignRequest(BaseModel):
    file_type: str = Field(description="MIME type, e.g. image/jpeg, image/png")
    upload_type: Literal["before", "completion"]
    reference_id: str = Field(description="reportId for before, missionId for completion")

class PresignResponse(BaseModel):
    upload_url: str
    file_key: str
    headers: dict

@router.post("/presign", response_model=PresignResponse)
def get_presigned_upload_url(
    req: PresignRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    if req.file_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are permitted")

    file_uuid = str(uuid.uuid4())
    ext = "jpg" if "jpeg" in req.file_type else "png" if "png" in req.file_type else "webp"

    if req.upload_type == "before":
        file_key = f"reports/{req.reference_id}/before/{file_uuid}.{ext}"
    else:
        file_key = f"missions/{req.reference_id}/completion/{file_uuid}.{ext}"

    bucket_name = os.getenv("S3_EVIDENCE_BUCKET", "repairgrid-evidence-demo")
    enable_mock = os.getenv("ENABLE_LOCAL_AGENT_MOCK", "true").lower() == "true"

    if not enable_mock and os.getenv("AWS_REGION"):
        s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket_name,
                "Key": file_key,
                "ContentType": req.file_type,
            },
            ExpiresIn=int(os.getenv("S3_PRESIGNED_EXPIRATION_SECONDS", "900")),
        )
    else:
        # Mock presigned URL for zero-cloud local testing
        upload_url = f"http://localhost:8000/mock-s3-upload/{file_key}"

    return PresignResponse(
        upload_url=upload_url,
        file_key=file_key,
        headers={"Content-Type": req.file_type}
    )
