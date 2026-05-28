"""Cloudflare R2 (S3-compatible) storage helper.

Mirrors the interface of `cloudinary_helper.py` so callers can swap providers
via the STORAGE_PROVIDER env var without code changes elsewhere.

Public functions:
- upload_to_r2(file, folder)          -> {"success": bool, "url": str, "public_id": str, ...}
- delete_from_r2(url)                 -> {"success": bool, ...}
- delete_provider_r2_files(provider)  -> {"deleted": int, "failed": int}
- delete_company_r2_files(company)    -> {"deleted": int, "failed": int}
"""
import logging
import os
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import UploadFile

logger = logging.getLogger(__name__)

R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY')
R2_ENDPOINT = os.environ.get('R2_ENDPOINT')
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME')
R2_PUBLIC_URL = (os.environ.get('R2_PUBLIC_URL') or '').rstrip('/')


def _client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto',
        config=Config(signature_version='s3v4'),
    )


_CONTENT_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'gif': 'image/gif',
    'webp': 'image/webp', 'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


async def upload_to_r2(file: UploadFile, folder: str = "servispro") -> dict:
    """Upload a file to Cloudflare R2. Returns {success, url, public_id}."""
    try:
        file_content = await file.read()
        await file.seek(0)

        file_ext = file.filename.split('.')[-1].lower() if '.' in (file.filename or '') else 'bin'
        unique_id = str(uuid.uuid4())
        key = f"{folder}/{unique_id}.{file_ext}"

        content_type = (
            file.content_type
            or _CONTENT_TYPES.get(file_ext)
            or 'application/octet-stream'
        )

        _client().put_object(
            Bucket=R2_BUCKET_NAME,
            Key=key,
            Body=file_content,
            ContentType=content_type,
        )

        public_url = f"{R2_PUBLIC_URL}/{key}"
        return {
            "success": True,
            "url": public_url,
            "public_id": key,
            "resource_type": "raw" if file_ext in ('pdf', 'doc', 'docx') else "image",
        }
    except Exception as e:
        logger.error(f"R2 upload error: {e}")
        return {"success": False, "error": str(e)}


def _key_from_url(url: str) -> str | None:
    """Extract the object key from a public R2 URL."""
    if not url or not R2_PUBLIC_URL:
        return None
    if url.startswith(R2_PUBLIC_URL + '/'):
        return url[len(R2_PUBLIC_URL) + 1:]
    return None


def delete_from_r2(url: str) -> dict:
    """Delete a file from R2 using its public URL."""
    key = _key_from_url(url)
    if not key:
        return {"success": False, "error": "Not an R2 URL"}
    try:
        _client().delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        return {"success": True, "public_id": key}
    except ClientError as e:
        logger.error(f"R2 delete error: {e}")
        return {"success": False, "error": str(e)}


def _is_r2_url(url) -> bool:
    return bool(url) and isinstance(url, str) and R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL)


async def delete_provider_r2_files(provider: dict) -> dict:
    deleted, failed = 0, 0
    for field in ('profile_picture', 'id_verification_picture'):
        if _is_r2_url(provider.get(field)):
            if delete_from_r2(provider[field])['success']:
                deleted += 1
            else:
                failed += 1
    for doc in (provider.get('documents') or []):
        path = doc.get('path') if isinstance(doc, dict) else doc
        if _is_r2_url(path):
            if delete_from_r2(path)['success']:
                deleted += 1
            else:
                failed += 1
    return {"deleted": deleted, "failed": failed}


async def delete_company_r2_files(company: dict) -> dict:
    deleted, failed = 0, 0
    fields = ('logo', 'licence_exploitation', 'rccm_document', 'nif_document', 'attestation_fiscale')
    for field in fields:
        if _is_r2_url(company.get(field)):
            if delete_from_r2(company[field])['success']:
                deleted += 1
            else:
                failed += 1
    for doc_url in (company.get('documents_additionnels') or []):
        if _is_r2_url(doc_url):
            if delete_from_r2(doc_url)['success']:
                deleted += 1
            else:
                failed += 1
    return {"deleted": deleted, "failed": failed}
