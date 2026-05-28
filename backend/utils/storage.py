"""Unified storage facade.

Routes new uploads to the provider configured in STORAGE_PROVIDER (default: r2).
Deletes are routed based on the URL pattern (Cloudinary vs R2) so legacy files
keep working without migration.

Drop-in replacement for the symbols previously imported from cloudinary_helper.
"""
import os
import logging

from fastapi import UploadFile

from utils import cloudinary_helper, r2_helper

logger = logging.getLogger(__name__)

STORAGE_PROVIDER = (os.environ.get('STORAGE_PROVIDER') or 'cloudinary').lower()


async def upload_to_cloudinary(file: UploadFile, folder: str = "servispro") -> dict:
    """Compatibility shim — routes new uploads to the configured provider.

    Name kept identical to avoid touching every caller in the routes layer.
    """
    if STORAGE_PROVIDER == 'r2':
        result = await r2_helper.upload_to_r2(file, folder)
        if result.get('success'):
            return result
        logger.warning(f"R2 upload failed, falling back to Cloudinary: {result.get('error')}")
    return await cloudinary_helper.upload_to_cloudinary(file, folder)


def delete_from_cloudinary(url: str) -> dict:
    """Route delete based on the URL pattern (legacy Cloudinary URLs still work)."""
    if not url:
        return {"success": False, "error": "Empty URL"}
    if 'r2.dev' in url or 'r2.cloudflarestorage.com' in url:
        return r2_helper.delete_from_r2(url)
    if 'cloudinary.com' in url:
        return cloudinary_helper.delete_from_cloudinary(url)
    return {"success": False, "error": "Unknown URL provider"}


async def delete_provider_cloudinary_files(provider: dict) -> dict:
    """Delete a provider's files across BOTH providers (legacy + new)."""
    a = await cloudinary_helper.delete_provider_cloudinary_files(provider)
    b = await r2_helper.delete_provider_r2_files(provider)
    return {"deleted": a['deleted'] + b['deleted'], "failed": a['failed'] + b['failed']}


async def delete_company_cloudinary_files(company: dict) -> dict:
    """Delete a company's files across BOTH providers (legacy + new)."""
    a = await cloudinary_helper.delete_company_cloudinary_files(company)
    b = await r2_helper.delete_company_r2_files(company)
    return {"deleted": a['deleted'] + b['deleted'], "failed": a['failed'] + b['failed']}
