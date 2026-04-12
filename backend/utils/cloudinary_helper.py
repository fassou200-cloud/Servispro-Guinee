import logging
import uuid
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

logger = logging.getLogger(__name__)


async def upload_to_cloudinary(file: UploadFile, folder: str = "servispro") -> dict:
    """
    Upload a file to Cloudinary and return the secure URL.
    Works for images and documents (PDF).
    """
    try:
        file_content = await file.read()
        await file.seek(0)
        
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
        unique_id = str(uuid.uuid4())
        
        if file_ext in ['pdf', 'doc', 'docx']:
            resource_type = "raw"
        else:
            resource_type = "image"
        
        result = cloudinary.uploader.upload(
            file_content,
            public_id=f"{folder}/{unique_id}",
            resource_type=resource_type,
            overwrite=True
        )
        
        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "resource_type": resource_type
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def delete_from_cloudinary(url: str) -> dict:
    """
    Delete a file from Cloudinary using its URL.
    """
    if not url or not url.startswith('https://res.cloudinary.com'):
        return {"success": False, "error": "Invalid Cloudinary URL"}
    
    try:
        parts = url.split('/upload/')
        if len(parts) < 2:
            return {"success": False, "error": "Could not parse URL"}
        
        path_with_version = parts[1]
        if path_with_version.startswith('v'):
            path_parts = path_with_version.split('/', 1)
            if len(path_parts) > 1:
                path_with_version = path_parts[1]
        
        public_id = path_with_version.rsplit('.', 1)[0]
        
        if '/raw/upload/' in url:
            resource_type = 'raw'
        else:
            resource_type = 'image'
        
        logger.info(f"Deleting from Cloudinary: {public_id} (type: {resource_type})")
        
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        
        if result.get('result') in ['ok', 'not found']:
            return {"success": True, "public_id": public_id}
        else:
            return {"success": False, "error": f"Cloudinary returned: {result}"}
            
    except Exception as e:
        logger.error(f"Cloudinary delete error: {str(e)}")
        return {"success": False, "error": str(e)}


async def delete_provider_cloudinary_files(provider: dict):
    """Delete all Cloudinary files associated with a provider."""
    deleted_count = 0
    failed_count = 0
    
    if provider.get('profile_picture') and 'cloudinary.com' in str(provider.get('profile_picture', '')):
        result = delete_from_cloudinary(provider['profile_picture'])
        if result['success']:
            deleted_count += 1
            logger.info(f"Deleted profile picture for provider {provider.get('id')}")
        else:
            failed_count += 1
            logger.warning(f"Failed to delete profile picture: {result.get('error')}")
    
    if provider.get('id_verification_picture') and 'cloudinary.com' in str(provider.get('id_verification_picture', '')):
        result = delete_from_cloudinary(provider['id_verification_picture'])
        if result['success']:
            deleted_count += 1
        else:
            failed_count += 1
    
    if provider.get('documents'):
        for doc in provider['documents']:
            doc_path = doc.get('path', '')
            if doc_path and 'cloudinary.com' in doc_path:
                result = delete_from_cloudinary(doc_path)
                if result['success']:
                    deleted_count += 1
                else:
                    failed_count += 1
    
    logger.info(f"Cloudinary cleanup for provider {provider.get('id')}: {deleted_count} deleted, {failed_count} failed")
    return {"deleted": deleted_count, "failed": failed_count}


async def delete_company_cloudinary_files(company: dict):
    """Delete all Cloudinary files associated with a company."""
    deleted_count = 0
    failed_count = 0
    
    if company.get('logo') and 'cloudinary.com' in str(company.get('logo', '')):
        result = delete_from_cloudinary(company['logo'])
        if result['success']:
            deleted_count += 1
        else:
            failed_count += 1
    
    doc_fields = ['licence_exploitation', 'rccm_document', 'nif_document', 'attestation_fiscale']
    for field in doc_fields:
        if company.get(field) and 'cloudinary.com' in str(company.get(field, '')):
            result = delete_from_cloudinary(company[field])
            if result['success']:
                deleted_count += 1
            else:
                failed_count += 1
    
    if company.get('documents_additionnels'):
        for doc_url in company['documents_additionnels']:
            if doc_url and 'cloudinary.com' in doc_url:
                result = delete_from_cloudinary(doc_url)
                if result['success']:
                    deleted_count += 1
                else:
                    failed_count += 1
    
    logger.info(f"Cloudinary cleanup for company {company.get('id')}: {deleted_count} deleted, {failed_count} failed")
    return {"deleted": deleted_count, "failed": failed_count}
