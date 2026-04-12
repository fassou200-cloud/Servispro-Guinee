from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import bcrypt

from database import db
from dependencies import get_current_company, get_current_user, hash_password, verify_password
from models import (
    CompanyProfileUpdate, CompanyChangePassword, CompanyServiceCreate, CompanyService,
    CompanyJobOfferCreate, CompanyJobOffer, RentalListingCreate, RentalListing,
    PropertySaleCreate, PropertySale, RentalMessageInput
)
from utils.cloudinary_helper import upload_to_cloudinary, delete_from_cloudinary

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/company/profile/me")
async def get_company_profile(current_company: dict = Depends(get_current_company)):
    """Get current company profile"""
    return current_company


@router.put("/company/profile/me")
async def update_company_profile(update_data: CompanyProfileUpdate, current_company: dict = Depends(get_current_company)):
    """Update company profile"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.companies.update_one(
            {'id': current_company['id']},
            {'$set': update_dict}
        )
    
    updated_company = await db.companies.find_one({'id': current_company['id']}, {'_id': 0, 'password': 0})
    return updated_company


@router.put("/company/change-password")
async def change_company_password(data: CompanyChangePassword, current_company: dict = Depends(get_current_company)):
    """Change company password"""
    company = await db.companies.find_one({'id': current_company['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    if not verify_password(data.current_password, company['password']):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    
    hashed = hash_password(data.new_password)
    await db.companies.update_one(
        {'id': current_company['id']},
        {'$set': {'password': hashed, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Mot de passe modifié avec succès"}


@router.post("/company/upload-logo")
async def upload_company_logo(file: UploadFile = File(...), current_company: dict = Depends(get_current_company)):

    """Upload company logo"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/company_logos")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    logo_url = result["url"]
    await db.companies.update_one(
        {'id': current_company['id']},
        {'$set': {'logo': logo_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'logo': logo_url}


@router.post("/company/upload-document/{document_type}")
async def upload_company_document(
    document_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload company document (licence, rccm, nif, attestation_fiscale, additionnels)"""
    valid_types = ['licence_exploitation', 'rccm_document', 'nif_document', 'attestation_fiscale', 'documents_additionnels']
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types acceptés: {', '.join(valid_types)}")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (JPG, PNG) ou un PDF")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/company_documents")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    document_url = result["url"]
    
    # Update company
    if document_type == 'documents_additionnels':
        await db.companies.update_one(
            {'id': current_company['id']},
            {
                '$push': {'documents_additionnels': document_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.companies.update_one(
            {'id': current_company['id']},
            {'$set': {document_type: document_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': document_url, 'document_type': document_type}

# Company Services Routes

@router.post("/company/services")
async def create_company_service(
    service_data: CompanyServiceCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a new company service"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des services")
    
    service_id = str(uuid.uuid4())
    
    service_doc = {
        'id': service_id,
        'company_id': current_company['id'],
        'company_name': current_company['company_name'],
        **service_data.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_services.insert_one(service_doc)
    
    return {k: v for k, v in service_doc.items() if k != '_id'}


@router.get("/company/services/my")
async def get_my_company_services(current_company: dict = Depends(get_current_company)):
    """Get all services of current company"""
    services = await db.company_services.find(
        {'company_id': current_company['id']},
        {'_id': 0}
    ).to_list(None)
    return services


@router.get("/company-services")
async def get_all_company_services(
    category: Optional[str] = None,
    location: Optional[str] = None
):
    """Get all company services (public)"""
    query = {}
    if category:
        query['category'] = category
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    
    services = await db.company_services.find(query, {'_id': 0}).to_list(None)
    return services

# Company Job Offers Routes

@router.post("/company/job-offers")
async def create_company_job_offer(
    job_data: CompanyJobOfferCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a new job offer"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des offres d'emploi")
    
    job_id = str(uuid.uuid4())
    
    job_doc = {
        'id': job_id,
        'company_id': current_company['id'],
        'company_name': current_company['company_name'],
        'company_logo': current_company.get('logo'),
        **job_data.model_dump(),
        'applications_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_job_offers.insert_one(job_doc)
    
    return {k: v for k, v in job_doc.items() if k != '_id'}


@router.get("/company/job-offers/my")
async def get_my_company_job_offers(current_company: dict = Depends(get_current_company)):
    """Get all job offers of current company"""
    jobs = await db.company_job_offers.find(
        {'company_id': current_company['id']},
        {'_id': 0}
    ).to_list(None)
    return jobs


@router.get("/job-offers")
async def get_all_job_offers(
    contract_type: Optional[str] = None,
    location: Optional[str] = None
):
    """Get all active job offers (public)"""
    query = {'is_active': True}
    if contract_type:
        query['contract_type'] = contract_type
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    
    jobs = await db.company_job_offers.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return jobs


@router.get("/job-offers/{job_id}")
async def get_job_offer(job_id: str):
    """Get a specific job offer"""
    job = await db.company_job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Offre d'emploi non trouvée")
    return job


@router.post("/company/rentals")
async def create_company_rental(
    listing_data: RentalListingCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a rental listing for an approved real estate company"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des annonces")
    
    # Check if company is in real estate sector
    if current_company.get('sector') != 'Immobilier':
        raise HTTPException(status_code=403, detail="Seules les entreprises du secteur immobilier peuvent publier des locations")
    
    listing_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    listing_doc = {
        'id': listing_id,
        'service_provider_id': current_company['id'],  # Using company ID
        'provider_name': current_company['company_name'],
        'provider_phone': current_company['phone_number'],
        'owner_type': 'company',  # Indicate it's a company listing
        'property_type': listing_data.property_type.value,
        'title': listing_data.title,
        'description': listing_data.description,
        'location': listing_data.location,
        'rental_price': listing_data.rental_price,
        'caution': listing_data.caution,
        'mois_avance': listing_data.mois_avance,
        'rental_type': listing_data.rental_type,
        'price_per_night': listing_data.price_per_night,
        'min_nights': listing_data.min_nights,
        'max_guests': listing_data.max_guests,
        'amenities': listing_data.amenities,
        'is_available': listing_data.is_available,
        'available_from': listing_data.available_from,
        'available_to': listing_data.available_to,
        'photos': [],
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        # Admin approval fields
        'approval_status': ListingApprovalStatus.PENDING.value,
        'rejection_reason': None,
        'approved_at': None,
        'approved_by': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.rental_listings.insert_one(listing_doc)
    return {k: v for k, v in listing_doc.items() if k != '_id'}


@router.get("/company/rentals/my")
async def get_company_rentals(current_company: dict = Depends(get_current_company)):
    """Get all rental listings for the current company"""
    rentals = await db.rental_listings.find(
        {'service_provider_id': current_company['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return rentals


@router.post("/company/rentals/{rental_id}/upload-photo")
async def upload_company_rental_photo(
    rental_id: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a photo for a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/rentals")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    photo_url = result["url"]
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'photo_url': photo_url, 'message': 'Photo uploadée avec succès'}


@router.post("/company/rentals/{rental_id}/upload-document/{doc_type}")
async def upload_company_rental_document(
    rental_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a document for a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'document_ministere_habitat', 'document_batiment', 'documents_additionnels', 'autres_documents']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/rental_documents")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    doc_url = result["url"]
    
    if doc_type in ['documents_additionnels', 'autres_documents']:
        await db.rental_listings.update_one(
            {'id': rental_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.rental_listings.update_one(
            {'id': rental_id},
            {'$set': {doc_type: doc_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}


@router.delete("/company/rentals/{rental_id}")
async def delete_company_rental(
    rental_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Delete a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.rental_listings.delete_one({'id': rental_id})
    await db.chat_messages.delete_many({'rental_id': rental_id})
    
    return {'message': 'Annonce supprimée avec succès'}

# Company Property Sales Routes

@router.post("/company/property-sales")
async def create_company_property_sale(
    sale_data: PropertySaleCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a property sale listing for an approved real estate company"""
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des ventes")
    
    if current_company.get('sector') != 'Immobilier':
        raise HTTPException(status_code=403, detail="Seules les entreprises du secteur immobilier peuvent publier des ventes")
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sale_doc = {
        'id': sale_id,
        'agent_id': current_company['id'],  # Using company ID
        'agent_name': current_company['company_name'],
        'agent_phone': current_company['phone_number'],
        'owner_type': 'company',  # Indicate it's a company listing
        'property_type': sale_data.property_type,
        'title': sale_data.title,
        'description': sale_data.description,
        'location': sale_data.location,
        'sale_price': sale_data.sale_price,
        'surface_area': sale_data.surface_area,
        'num_rooms': sale_data.num_rooms,
        'num_bathrooms': sale_data.num_bathrooms,
        'has_garage': sale_data.has_garage,
        'has_garden': sale_data.has_garden,
        'has_pool': sale_data.has_pool,
        'year_built': sale_data.year_built,
        'features': sale_data.features,
        'is_negotiable': sale_data.is_negotiable,
        'is_available': True,
        'photos': [],
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        'documents_verified': False,
        'verification_date': None,
        'status': 'pending',  # pending, approved, rejected, sold
        'created_at': now,
        'updated_at': now
    }
    
    await db.property_sales.insert_one(sale_doc)
    return {k: v for k, v in sale_doc.items() if k != '_id'}


@router.get("/company/property-sales/my")
async def get_company_property_sales(current_company: dict = Depends(get_current_company)):
    """Get all property sales for the current company"""
    sales = await db.property_sales.find(
        {'agent_id': current_company['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return sales


@router.post("/company/property-sales/{sale_id}/upload-photo")
async def upload_company_sale_photo(
    sale_id: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a photo for a company property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/property_sales")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    photo_url = result["url"]
    await db.property_sales.update_one(
        {'id': sale_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"photo_url": photo_url, "message": "Photo uploadée avec succès"}


@router.post("/company/property-sales/{sale_id}/upload-document/{doc_type}")
async def upload_company_sale_document(
    sale_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a document for a company property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'document_ministere_habitat', 'document_batiment', 'documents_additionnels', 'autres_documents']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/sale_documents")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    doc_url = result["url"]
    
    if doc_type in ['documents_additionnels', 'autres_documents']:
        await db.property_sales.update_one(
            {'id': sale_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.property_sales.update_one(
            {'id': sale_id},
            {'$set': {doc_type: doc_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}


@router.delete("/company/property-sales/{sale_id}")
async def delete_company_property_sale(
    sale_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Delete a company property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.property_sales.delete_one({'id': sale_id})
    return {'message': 'Propriété supprimée avec succès'}

# Public Companies Route

@router.get("/companies")
async def get_all_companies(
    sector: Optional[str] = None,
    region: Optional[str] = None
):
    """Get all approved companies (public)"""
    query = {'verification_status': 'approved'}
    if sector:
        query['sector'] = sector
    if region:
        query['region'] = region
    
    companies = await db.companies.find(query, {'_id': 0, 'password': 0}).to_list(None)
    return companies


@router.get("/companies/{company_id}")
async def get_company(company_id: str):
    """Get a specific company (public)"""
    company = await db.companies.find_one(
        {'id': company_id, 'verification_status': 'approved'},
        {'_id': 0, 'password': 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return company

# Profile Routes

@router.get("/company/property-messages")
async def get_company_property_messages(current_company: dict = Depends(get_current_company)):
    """Get all property messages (rental + sale inquiries) for the company"""
    company_id = current_company['id']
    
    # Get rental messages
    rental_msgs = await db.property_messages.find(
        {'owner_id': company_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    # Get sale inquiries  
    sale_inquiries = await db.property_inquiries.find(
        {'agent_id': company_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    # Normalize sale inquiries to same format
    for inq in sale_inquiries:
        inq['message_type'] = 'sale'
        inq['sender_name'] = inq.get('customer_name', '')
        inq['sender_phone'] = inq.get('customer_phone', '')
        inq['rental_title'] = inq.get('property_info', '')
        inq['is_read'] = inq.get('status') != 'pending'
    
    # Combine and sort
    all_messages = rental_msgs + sale_inquiries
    all_messages.sort(key=lambda m: m.get('created_at', ''), reverse=True)
    
    return all_messages


@router.put("/company/property-messages/{message_id}/read")
async def mark_property_message_read(message_id: str, current_company: dict = Depends(get_current_company)):
    """Mark a property message as read"""
    # Try rental messages first
    result = await db.property_messages.update_one(
        {'id': message_id, 'owner_id': current_company['id']},
        {'$set': {'is_read': True}}
    )
    if result.modified_count == 0:
        # Try sale inquiries
        await db.property_inquiries.update_one(
            {'id': message_id, 'agent_id': current_company['id']},
            {'$set': {'status': 'contacted'}}
        )
    return {'message': 'Marqué comme lu'}


