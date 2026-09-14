"""Bounded Amazon Nova vision adapter used by the RepairGrid agents.

The application can run its deterministic state machine locally while invoking
Bedrock through the developer's AWS credentials. Model output is parsed into a
small structured contract; business rules and lifecycle transitions remain code.
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import boto3


class BedrockUnavailable(RuntimeError):
    pass


def _image_bytes(reference: str) -> Tuple[bytes, str]:
    if not reference:
        raise BedrockUnavailable("No image evidence was supplied")

    if reference.startswith("data:image/"):
        header, encoded = reference.split(",", 1)
        image_format = header.split("/", 1)[1].split(";", 1)[0].lower()
        image_format = "jpeg" if image_format in ("jpg", "jpeg") else image_format
        return base64.b64decode(encoded), image_format

    if reference.startswith("s3://"):
        parsed = urlparse(reference)
        body = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1")).get_object(
            Bucket=parsed.netloc,
            Key=parsed.path.lstrip("/"),
        )["Body"].read()
        image_format = Path(parsed.path).suffix.lower().lstrip(".") or "jpeg"
        return body, "jpeg" if image_format in ("jpg", "jpeg") else image_format

    if reference.startswith(("http://", "https://")):
        parsed = urlparse(reference)
        # Directly read through boto3 S3 if it targets the RepairGrid evidence bucket
        if "s3.amazonaws.com" in parsed.netloc or "repairgrid-evidence" in parsed.netloc:
            try:
                bucket_name = parsed.netloc.split(".s3")[0]
                object_key = parsed.path.lstrip("/")
                s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
                body = s3_client.get_object(Bucket=bucket_name, Key=object_key)["Body"].read()
                image_format = Path(object_key).suffix.lower().lstrip(".") or "jpeg"
                return body, "jpeg" if image_format in ("jpg", "jpeg") else image_format
            except Exception as s3_err:
                print(f"Direct S3 IAM read failed, falling back to urlopen: {s3_err}")

        request = Request(reference, headers={"User-Agent": "RepairGrid/1.0"})
        with urlopen(request, timeout=6) as response:
            body = response.read(8 * 1024 * 1024)
            content_type = response.headers.get_content_type()
        image_format = mimetypes.guess_extension(content_type or "") or Path(urlparse(reference).path).suffix
        image_format = image_format.lower().lstrip(".") or "jpeg"
        return body, "jpeg" if image_format in ("jpg", "jpeg", "jpe") else image_format

    path = Path(reference)
    if path.exists() and path.is_file():
        image_format = path.suffix.lower().lstrip(".") or "jpeg"
        return path.read_bytes(), "jpeg" if image_format in ("jpg", "jpeg") else image_format

    raise BedrockUnavailable("The evidence reference is not readable by the local Bedrock adapter")


def _json_from_text(text: str) -> Dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise BedrockUnavailable("Nova returned an invalid structured response")
        return json.loads(match.group(0))


class NovaVisionService:
    MODEL_ID = os.getenv("PRIMARY_MODEL", "us.amazon.nova-2-lite-v1:0")
    REGION = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))

    @classmethod
    def enabled(cls) -> bool:
        return os.getenv("ENABLE_LIVE_BEDROCK", "false").lower() == "true"

    @classmethod
    def _converse(cls, prompt: str, images: List[str]) -> Dict[str, Any]:
        if not cls.enabled():
            raise BedrockUnavailable("Live Bedrock is disabled for this environment")

        content: List[Dict[str, Any]] = [{"text": prompt}]
        for reference in images:
            body, image_format = _image_bytes(reference)
            if image_format not in {"png", "jpeg", "gif", "webp"}:
                raise BedrockUnavailable(f"Unsupported evidence format: {image_format}")
            content.append({"image": {"format": image_format, "source": {"bytes": body}}})

        try:
            response = boto3.client("bedrock-runtime", region_name=cls.REGION).converse(
                modelId=cls.MODEL_ID,
                system=[{"text": "You are RepairGrid's bounded evidence analyst. Return only valid JSON matching the requested schema. Do not invent facts that are not visually supported."}],
                messages=[{"role": "user", "content": content}],
                inferenceConfig={"maxTokens": 500, "temperature": 0.0, "topP": 0.8},
            )
        except Exception as exc:
            raise BedrockUnavailable(str(exc)) from exc

        blocks = response.get("output", {}).get("message", {}).get("content", [])
        text = next((item.get("text") for item in blocks if item.get("text")), None)
        if not text:
            raise BedrockUnavailable("Nova returned no text output")
        result = _json_from_text(text)
        result["modelId"] = cls.MODEL_ID
        result["provider"] = "AMAZON_BEDROCK"
        return result

    @classmethod
    def analyze_issue(cls, image_reference: str, category: str, description: str) -> Dict[str, Any]:
        return cls._converse(
            "Review the report evidence. The resident selected category "
            f"'{category}' and wrote: {description!r}. Return: "
            '{"isValidIssue": boolean, "categorySupported": boolean, "assetIdentified": boolean, '
            '"descriptionVisualMatch": boolean, "confidence": number from 0 to 1, "summary": string}.',
            [image_reference],
        )

    @classmethod
    def compare_repair(cls, before_reference: str, after_reference: str, category: str) -> Dict[str, Any]:
        return cls._converse(
            "The first image is the original report and the second is technician completion evidence "
            f"for category '{category}'. Compare only visible evidence. Return: "
            '{"sameAsset": boolean, "conditionImproved": boolean, "evidenceQuality": number from 0 to 1, '
            '"confidence": number from 0 to 1, "summary": string}.',
            [before_reference, after_reference],
        )
