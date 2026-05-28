from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import PropertySaleCreate, PropertySale, PropertySaleInquiry, InquiryMessage
from utils.storage import upload_to_cloudinary

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/property-sales/{sale_id}/inquiries")
async def create_property_inquiry(sale_id: str, inquiry: PropertySaleInquiry, current_customer: dict = Depends(get_current_customer)):
    """Create an inquiry for a property sale (requires customer login)"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    inquiry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    inquiry_doc = {
        'id': inquiry_id,
        'property_id': sale_id,
        'property_info': f"{sale.get('title')} - {sale.get('property_type')}",
        'property_price': sale.get('sale_price'),
        'property_location': sale.get('location'),
        'property_photos': sale.get('photos', []),
        'agent_id': sale.get('agent_id'),
        'agent_name': sale.get('agent_name'),
        'agent_phone': sale.get('agent_phone'),
        'customer_id': current_customer['id'],
        'customer_name': inquiry.customer_name or f"{current_customer.get('first_name', '')} {current_customer.get('last_name', '')}".strip(),
        'customer_phone': inquiry.customer_phone or current_customer.get('phone_number', ''),
        'customer_email': inquiry.customer_email,
        'message': inquiry.message,
        'budget_range': inquiry.budget_range,
        'financing_type': inquiry.financing_type,
        'status': 'pending',  # pending, contacted, completed, rejected
        'admin_notes': None,
        'admin_response': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.property_inquiries.insert_one(inquiry_doc)
    
    # Notify admin
    admin_notification = {
        'id': str(uuid.uuid4()),
        'user_id': 'admin',
        'user_type': 'admin',
        'title': 'Nouvelle demande d\'achat immobilier',
        'message': f"{inquiry_doc['customer_name']} est intéressé par: {sale.get('title')} - {sale.get('sale_price'):,.0f} GNF",
        'notification_type': 'property_inquiry',
        'related_id': inquiry_id,
        'is_read': False,
        'created_at': now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {
        'id': inquiry_id,
        'message': 'Votre demande a été envoyée. L\'équipe ServisPro vous contactera bientôt.',
        'status': 'pending'
    }


@router.get("/customer/property-inquiries")
async def get_customer_property_inquiries(current_customer: dict = Depends(get_current_customer)):
    """Get all property inquiries for the current customer"""
    inquiries = await db.property_inquiries.find(
        {'customer_id': current_customer['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return inquiries


@router.post("/customer/property-inquiries/{inquiry_id}/message")
async def customer_send_inquiry_message(
    inquiry_id: str, 
    message_data: InquiryMessage,
    current_customer: dict = Depends(get_current_customer)
):
    """Customer sends a message in the inquiry conversation"""
    inquiry = await db.property_inquiries.find_one({'id': inquiry_id, 'customer_id': current_customer['id']}, {'_id': 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        'id': str(uuid.uuid4()),
        'sender': 'customer',
        'sender_name': inquiry.get('customer_name', 'Client'),
        'message': message_data.message,
        'created_at': now
    }
    
    # Add message to conversation array
    await db.property_inquiries.update_one(
        {'id': inquiry_id},
        {
            '$push': {'conversation': new_message},
            '$set': {'updated_at': now, 'status': 'pending'}  # Reset to pending when customer replies
        }
    )
    
    # Notify admin
    admin_notification = {
        'id': str(uuid.uuid4()),
        'user_id': 'admin',
        'user_type': 'admin',
        'title': 'Nouveau message - Demande d\'achat',
        'message': f"{inquiry.get('customer_name')} a répondu concernant: {inquiry.get('property_info')}",
        'notification_type': 'property_inquiry_reply',
        'related_id': inquiry_id,
        'is_read': False,
        'created_at': now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {'message': 'Message envoyé', 'id': new_message['id']}


@router.post("/property-sales")
async def create_property_sale(sale_data: PropertySaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new property sale listing (Agent Immobilier only)"""
    if current_user.get('profession') != 'AgentImmobilier':
        raise HTTPException(
            status_code=403, 
            detail="Seuls les agents immobiliers peuvent publier des ventes"
        )
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sale_doc = {
        'id': sale_id,
        'agent_id': current_user['id'],
        'agent_name': f"{current_user['first_name']} {current_user['last_name']}",
        'agent_phone': current_user.get('phone_number', ''),
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


@router.get("/property-sales")
async def get_all_property_sales(
    property_type: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    available_only: bool = True,
    approved_only: bool = True
):
    """Get all property sales with optional filters - only approved ones for public"""
    query = {}
    
    if property_type:
        query['property_type'] = property_type
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    if available_only:
        query['is_available'] = True
    if approved_only:
        query['status'] = 'approved'
    if min_price:
        query['sale_price'] = {'$gte': min_price}
    if max_price:
        if 'sale_price' in query:
            query['sale_price']['$lte'] = max_price
        else:
            query['sale_price'] = {'$lte': max_price}
    
    sales = await db.property_sales.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return sales


@router.get("/property-sales/my-listings")
async def get_my_property_sales(current_user: dict = Depends(get_current_user)):
    """Get all property sales for the current agent"""
    sales = await db.property_sales.find(
        {'agent_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return sales


@router.get("/property-sales/{sale_id}")
async def get_property_sale_by_id(sale_id: str):
    """Get a specific property sale by ID"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    return sale


@router.put("/property-sales/{sale_id}")
async def update_property_sale(sale_id: str, sale_data: PropertySaleCreate, current_user: dict = Depends(get_current_user)):
    """Update a property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = sale_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.property_sales.update_one({'id': sale_id}, {'$set': update_data})
    
    updated = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    return updated


@router.delete("/property-sales/{sale_id}")
async def delete_property_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.property_sales.delete_one({'id': sale_id})
    return {"message": "Propriété supprimée avec succès"}


@router.put("/property-sales/{sale_id}/availability")
async def toggle_property_sale_availability(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle property sale availability status"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    new_status = not sale.get('is_available', True)
    await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {'is_available': new_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"is_available": new_status}


@router.post("/property-sales/{sale_id}/upload-photo")
async def upload_property_sale_photo(sale_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a photo for a property sale"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
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


@router.post("/property-sales/{sale_id}/upload-document/{doc_type}")
async def upload_property_sale_document(
    sale_id: str, 
    doc_type: str,
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Upload required documents for a property sale (titre_foncier, registration_ministere, seller_id_document, documents_additionnels)"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
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
            {
                '$set': {
                    doc_type: doc_url,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    doc_labels = {
        'titre_foncier': 'Titre Foncier',
        'registration_ministere': 'Enregistrement Ministère de l\'Habitat',
        'document_ministere_habitat': 'Document du Ministère de l\'Habitat',
        'document_batiment': 'Document du Bâtiment',
        'seller_id_document': 'Pièce d\'Identité du Vendeur',
        'documents_additionnels': 'Document Additionnel',
        'autres_documents': 'Autre Document'
    }
    
    return {
        'document_url': doc_url, 
        'document_type': doc_type, 
        'document_label': doc_labels.get(doc_type, doc_type),
        'message': 'Document uploadé avec succès'
    }

# Review Routes

