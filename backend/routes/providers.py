from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user
from models import ServiceProvider, ProfileUpdate
from utils.cloudinary_helper import upload_to_cloudinary, delete_from_cloudinary

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/profile/me", response_model=ServiceProvider)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return ServiceProvider(**current_user)


@router.put("/profile/me")
async def update_profile(update_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        if 'profession' in update_dict:
            update_dict['profession'] = update_dict['profession'].value
        
        await db.service_providers.update_one(
            {'id': current_user['id']},
            {'$set': update_dict}
        )
    
    updated_user = await db.service_providers.find_one({'id': current_user['id']}, {'_id': 0, 'password': 0})
    return updated_user


@router.post("/profile/upload-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/profiles")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    # Update user profile with Cloudinary URL
    profile_picture_url = result["url"]
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'profile_picture': profile_picture_url}}
    )
    
    return {'profile_picture': profile_picture_url}


@router.post("/profile/upload-id-verification")
async def upload_id_verification(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/id_verification")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    # Update user profile with Cloudinary URL
    id_verification_url = result["url"]
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'id_verification_picture': id_verification_url}}
    )
    
    return {'id_verification_picture': id_verification_url}


@router.put("/profile/online-status")
async def update_online_status(current_user: dict = Depends(get_current_user)):
    """Toggle the online status of a service provider"""
    current_status = current_user.get('online_status', False)
    new_status = not current_status
    
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': new_status}}
    )
    
    return {'online_status': new_status}


@router.put("/profile/set-online")
async def set_online(current_user: dict = Depends(get_current_user)):
    """Set provider as online"""
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': True}}
    )
    return {'online_status': True}


@router.put("/profile/set-offline")
async def set_offline(current_user: dict = Depends(get_current_user)):
    """Set provider as offline"""
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': False}}
    )
    return {'online_status': False}


@router.get("/providers", response_model=List[ServiceProvider])
async def get_all_providers():
    # Only return active, non-deleted providers
    providers = await db.service_providers.find(
        {
            '$or': [{'is_active': True}, {'is_active': {'$exists': False}}],
            'is_deleted': {'$ne': True}
        },
        {'_id': 0, 'password': 0}
    ).to_list(None)
    return [ServiceProvider(**p) for p in providers]


@router.get("/providers/{provider_id}", response_model=ServiceProvider)
async def get_provider_by_id(provider_id: str):
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0, 'password': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    # Check if provider is active
    if provider.get('is_active') == False:
        raise HTTPException(status_code=404, detail="Ce prestataire n'est plus disponible")
    return ServiceProvider(**provider)

# Provider Document Management

@router.delete("/providers/{provider_id}/documents/{doc_index}")
async def delete_provider_document(provider_id: str, doc_index: int, current_user: dict = Depends(get_current_user)):
    """Delete a document from a provider's profile - only the provider can delete their own documents"""
    # Verify the current user is the owner of this provider profile
    if current_user.get('id') != provider_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres documents")
    
    # Get the provider
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    documents = provider.get('documents', [])
    if doc_index < 0 or doc_index >= len(documents):
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Get the document to delete
    doc_to_delete = documents[doc_index]
    
    # Try to delete the physical file
    try:
        file_path = doc_to_delete.get('path', '')
        if file_path.startswith('/api/uploads/'):
            file_name = file_path.replace('/api/uploads/', '')
            full_path = os.path.join(UPLOAD_DIR, file_name)
            if os.path.exists(full_path):
                os.remove(full_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Remove the document from the array
    documents.pop(doc_index)
    
    # Update the provider
    await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'documents': documents}}
    )
    
    return {"message": "Document supprimé avec succès", "remaining_documents": len(documents)}


@router.post("/providers/{provider_id}/documents")
async def add_provider_document(
    provider_id: str,
    document: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Add a new document to a provider's profile - only the provider can add to their own documents"""
    # Verify the current user is the owner of this provider profile
    if current_user.get('id') != provider_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez ajouter des documents qu'à votre propre profil")
    
    # Get the provider
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    documents = provider.get('documents', [])
    
    # Limit to 10 documents max
    if len(documents) >= 10:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas télécharger plus de 10 documents")
    
    # Upload to Cloudinary
    try:
        result = await upload_to_cloudinary(document, folder="servispro/documents")
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Erreur upload: {result.get('error')}")
        
        new_doc = {
            "path": result["url"],
            "filename": document.filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add to documents array
        await db.service_providers.update_one(
            {'id': provider_id},
            {'$push': {'documents': new_doc}}
        )
        
        return {"message": "Document ajouté avec succès", "document": new_doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du téléchargement: {str(e)}")

# Job Offer Routes

