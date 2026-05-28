from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import (
    RentalListingCreate, RentalListing, PropertyType, ListingApprovalStatus,
    VisitRequestCreate, VisitRequestUpdate, VisitPaymentUpdate, VisitRequestStatus,
    ChatMessageCreate, ChatMessage, RentalMessageInput
)
from utils.storage import upload_to_cloudinary
from utils.security import filter_contact_info

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/rentals", response_model=RentalListing)
async def create_rental_listing(listing_data: RentalListingCreate, current_user: dict = Depends(get_current_user)):
    listing_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    listing_doc = {
        'id': listing_id,
        'service_provider_id': current_user['id'],
        'provider_name': f"{current_user['first_name']} {current_user['last_name']}",
        'provider_phone': current_user['phone_number'],
        'property_type': listing_data.property_type.value,
        'title': listing_data.title,
        'description': listing_data.description,
        'location': listing_data.location,
        'rental_price': listing_data.rental_price,
        'caution': listing_data.caution,
        'mois_avance': listing_data.mois_avance,
        # New short-term rental fields
        'rental_type': listing_data.rental_type,
        'price_per_night': listing_data.price_per_night,
        'min_nights': listing_data.min_nights,
        'max_guests': listing_data.max_guests,
        'amenities': listing_data.amenities,
        'is_available': listing_data.is_available,
        'available_from': listing_data.available_from,
        'available_to': listing_data.available_to,
        'photos': [],
        # Document fields
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        # Admin approval - starts as pending
        'approval_status': ListingApprovalStatus.PENDING.value,
        'rejection_reason': None,
        'approved_at': None,
        'approved_by': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.rental_listings.insert_one(listing_doc)
    
    listing_response = {k: v for k, v in listing_doc.items() if k != '_id'}
    return RentalListing(**listing_response)


@router.get("/rentals", response_model=List[RentalListing])
async def get_all_rentals(rental_type: Optional[str] = None, is_available: Optional[bool] = None):
    """Get all APPROVED rentals with optional filters (public endpoint)"""
    query = {'approval_status': ListingApprovalStatus.APPROVED.value}  # Only show approved listings
    if rental_type:
        query['rental_type'] = rental_type
    if is_available is not None:
        query['is_available'] = is_available
    
    rentals = await db.rental_listings.find(query, {'_id': 0}).to_list(None)
    return [RentalListing(**r) for r in rentals]


@router.get("/rentals/my-listings", response_model=List[RentalListing])
async def get_my_rental_listings(current_user: dict = Depends(get_current_user)):
    """Get all rental listings for the current provider (including pending/rejected)"""
    rentals = await db.rental_listings.find({'service_provider_id': current_user['id']}, {'_id': 0}).to_list(None)
    return [RentalListing(**r) for r in rentals]


@router.put("/rentals/{rental_id}/availability")
async def update_rental_availability(rental_id: str, is_available: bool, current_user: dict = Depends(get_current_user)):
    """Toggle availability of a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {'$set': {'is_available': is_available, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'is_available': is_available}


@router.put("/rentals/{rental_id}")
async def update_rental_listing(rental_id: str, listing_data: RentalListingCreate, current_user: dict = Depends(get_current_user)):
    """Update a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_doc = {
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
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.rental_listings.update_one({'id': rental_id}, {'$set': update_doc})
    
    updated_rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    return RentalListing(**updated_rental)


@router.get("/rentals/{rental_id}", response_model=RentalListing)
async def get_rental_by_id(rental_id: str):
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    return RentalListing(**rental)


@router.post("/rentals/{rental_id}/upload-photo")
async def upload_rental_photo(rental_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Find rental and verify ownership
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to update this listing")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/rentals")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    # Update rental photos array
    photo_url = result["url"]
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'photo_url': photo_url}


@router.delete("/rentals/{rental_id}")
async def delete_rental_listing(rental_id: str, current_user: dict = Depends(get_current_user)):
    # Find rental and verify ownership
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
    
    await db.rental_listings.delete_one({'id': rental_id})
    return {'message': 'Rental listing deleted successfully'}

# Document Upload Routes for Rentals

@router.post("/rentals/{rental_id}/upload-document/{doc_type}")
async def upload_rental_document(
    rental_id: str, 
    doc_type: str,  # titre_foncier, registration_ministere, seller_id_document, documents_additionnels
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Upload required documents for a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'document_ministere_habitat', 'document_batiment', 'documents_additionnels', 'autres_documents']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/rental_documents")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    doc_url = result["url"]
    
    # Update based on document type
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
            {
                '$set': {
                    doc_type: doc_url,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}


@router.post("/visit-requests")
async def create_visit_request(request_data: VisitRequestCreate):
    """Create a visit request for a rental property"""
    # Verify rental exists
    rental = await db.rental_listings.find_one({'id': request_data.rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    # Get service fees for AgentImmobilier
    fees = await db.service_fees.find_one({'profession': 'AgentImmobilier'}, {'_id': 0})
    frais_visite = fees.get('frais_visite', 0) if fees else 0
    
    # Determine owner - could be service_provider_id or company_id
    owner_id = rental.get('service_provider_id') or rental.get('company_id')
    owner_type = 'company' if rental.get('company_id') else 'provider'
    
    visit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    visit_doc = {
        'id': visit_id,
        'rental_id': request_data.rental_id,
        'rental_title': rental.get('title', ''),
        'rental_location': rental.get('location', ''),
        'provider_id': owner_id,
        'owner_type': owner_type,
        'customer_name': request_data.customer_name,
        'customer_phone': request_data.customer_phone,
        'customer_email': request_data.customer_email,
        'preferred_date': request_data.preferred_date,
        'preferred_time': request_data.preferred_time,
        'message': request_data.message,
        'frais_visite': frais_visite,
        'payment_status': 'pending',  # pending, paid
        'status': VisitRequestStatus.PENDING.value,
        'created_at': now,
        'updated_at': now
    }
    
    await db.visit_requests.insert_one(visit_doc)
    
    # Create notification for the owner
    if owner_id:
        notification_doc = {
            'id': str(uuid.uuid4()),
            'user_id': owner_id,
            'user_type': owner_type,
            'title': 'Nouvelle demande de visite',
            'message': f"{request_data.customer_name} souhaite visiter votre bien '{rental.get('title', 'Propriété')}' le {request_data.preferred_date}",
            'notification_type': 'visit_request',
            'related_id': visit_id,
            'is_read': False,
            'created_at': now
        }
        await db.notifications.insert_one(notification_doc)
    
    return {
        'id': visit_id,
        'message': 'Demande de visite envoyée avec succès',
        'frais_visite': frais_visite,
        'status': 'pending'
    }


@router.get("/visit-requests/my-requests")
async def get_my_visit_requests(current_user: dict = Depends(get_current_user)):
    """Get visit requests for the current provider/company's rentals"""
    user_id = current_user.get('id')
    
    # Get all visit requests for this owner (check both provider_id and owner_id for compatibility)
    requests = await db.visit_requests.find(
        {'$or': [{'provider_id': user_id}, {'owner_id': user_id}]},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    return requests


@router.get("/visit-requests/customer/{customer_phone}")
async def get_customer_visit_requests(customer_phone: str):
    """Get visit requests for a customer by phone number"""
    requests = await db.visit_requests.find(
        {'customer_phone': customer_phone},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return requests


@router.get("/visit-requests/{visit_id}")
async def get_visit_request(visit_id: str):
    """Get a specific visit request"""
    request = await db.visit_requests.find_one({'id': visit_id}, {'_id': 0})
    if not request:
        raise HTTPException(status_code=404, detail="Demande de visite non trouvée")
    return request


@router.put("/visit-requests/{visit_id}")
async def update_visit_request(visit_id: str, update_data: VisitRequestUpdate, current_user: dict = Depends(get_current_user)):
    """Accept or reject a visit request"""
    # Find the visit request
    request = await db.visit_requests.find_one({'id': visit_id}, {'_id': 0})
    if not request:
        raise HTTPException(status_code=404, detail="Demande de visite non trouvée")
    
    # Verify ownership - check both provider_id and owner_id for compatibility
    owner_id = request.get('provider_id') or request.get('owner_id')
    if owner_id != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette demande")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_fields = {
        'status': update_data.status.value,
        'updated_at': now
    }
    
    if update_data.response_message:
        update_fields['response_message'] = update_data.response_message
    
    await db.visit_requests.update_one(
        {'id': visit_id},
        {'$set': update_fields}
    )
    
    # Create notification for customer when accepted
    if update_data.status.value == 'accepted':
        # Get provider info
        provider_phone = current_user.get('phone_number', '')
        provider_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        
        # Find customer by phone to create notification
        customer = await db.customers.find_one({'phone_number': request.get('customer_phone')}, {'_id': 0})
        
        notification_message = (
            f"🎉 Bonne nouvelle ! Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' "
            f"a été acceptée par {provider_name}.\n\n"
            f"📞 Contactez le prestataire au : {provider_phone}\n\n"
            f"📅 Date demandée : {request.get('preferred_date', 'Non spécifiée')}"
        )
        
        notification_doc = {
            'id': str(uuid.uuid4()),
            'customer_phone': request.get('customer_phone'),
            'customer_id': customer.get('id') if customer else None,
            'user_type': 'customer',
            'title': '✅ Demande de visite acceptée',
            'message': notification_message,
            'provider_phone': provider_phone,
            'provider_name': provider_name,
            'notification_type': 'visit_accepted',
            'related_id': visit_id,
            'rental_id': request.get('rental_id'),
            'is_read': False,
            'created_at': now
        }
        await db.customer_notifications.insert_one(notification_doc)
    
    elif update_data.status.value == 'rejected':
        # Check if payment was made - if so, credit the customer
        if request.get('payment_status') == 'paid':
            customer = await db.customers.find_one({'phone_number': request.get('customer_phone')}, {'_id': 0})
            if customer:
                credit_amount = request.get('frais_visite', 0) or 0
                if credit_amount > 0:
                    # Get current balance
                    current_balance = customer.get('balance', 0) or 0
                    new_balance = current_balance + credit_amount
                    
                    # Update customer balance
                    await db.customers.update_one(
                        {'id': customer['id']},
                        {'$set': {'balance': new_balance}}
                    )
                    
                    # Create credit transaction record
                    credit_transaction = {
                        'id': str(uuid.uuid4()),
                        'customer_id': customer['id'],
                        'customer_phone': request.get('customer_phone'),
                        'amount': credit_amount,
                        'transaction_type': 'visit_rejected',
                        'description': f"Crédit suite au refus de visite pour '{request.get('rental_title', 'la propriété')}'",
                        'related_id': visit_id,
                        'balance_after': new_balance,
                        'created_at': now
                    }
                    await db.credit_transactions.insert_one(credit_transaction)
                    
                    # Enhanced notification with credit info
                    notification_doc = {
                        'id': str(uuid.uuid4()),
                        'customer_phone': request.get('customer_phone'),
                        'customer_id': customer.get('id'),
                        'user_type': 'customer',
                        'title': '❌ Demande de visite refusée - Crédit ajouté',
                        'message': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été refusée.\n\n💰 Un crédit de {credit_amount:,.0f} GNF a été ajouté à votre solde.\nNouveau solde: {new_balance:,.0f} GNF",
                        'notification_type': 'visit_rejected_credit',
                        'related_id': visit_id,
                        'credit_amount': credit_amount,
                        'is_read': False,
                        'created_at': now
                    }
                    await db.customer_notifications.insert_one(notification_doc)
                else:
                    # Standard rejection notification (no credit to add)
                    notification_doc = {
                        'id': str(uuid.uuid4()),
                        'customer_phone': request.get('customer_phone'),
                        'user_type': 'customer',
                        'title': '❌ Demande de visite refusée',
                        'message': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été refusée par le prestataire.",
                        'notification_type': 'visit_rejected',
                        'related_id': visit_id,
                        'is_read': False,
                        'created_at': now
                    }
                    await db.customer_notifications.insert_one(notification_doc)
            else:
                # No customer found - standard notification
                notification_doc = {
                    'id': str(uuid.uuid4()),
                    'customer_phone': request.get('customer_phone'),
                    'user_type': 'customer',
                    'title': '❌ Demande de visite refusée',
                    'message': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été refusée par le prestataire.",
                    'notification_type': 'visit_rejected',
                    'related_id': visit_id,
                    'is_read': False,
                    'created_at': now
                }
                await db.customer_notifications.insert_one(notification_doc)
        else:
            # No payment was made - standard rejection notification
            notification_doc = {
                'id': str(uuid.uuid4()),
                'customer_phone': request.get('customer_phone'),
                'user_type': 'customer',
                'title': '❌ Demande de visite refusée',
                'message': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été refusée par le prestataire.",
                'notification_type': 'visit_rejected',
                'related_id': visit_id,
                'is_read': False,
                'created_at': now
            }
            await db.customer_notifications.insert_one(notification_doc)
    
    status_messages = {
        'accepted': f"Demande acceptée ! Le client a reçu votre numéro de téléphone.",
        'rejected': f"Demande refusée. Le client a été notifié.",
        'completed': f"Visite marquée comme terminée."
    }
    
    return {
        'id': visit_id,
        'status': update_data.status.value,
        'message': status_messages.get(update_data.status.value, 'Statut mis à jour')
    }


@router.put("/visit-requests/{visit_id}/payment")
async def update_visit_payment_status(
    visit_id: str,
    payment_data: VisitPaymentUpdate,
    current_customer: dict = Depends(get_current_customer),
):
    """Update the payment status of a visit request. Only the owner customer can update."""
    now = datetime.now(timezone.utc).isoformat()

    # Find the visit request
    request = await db.visit_requests.find_one({'id': visit_id}, {'_id': 0})
    if not request:
        raise HTTPException(status_code=404, detail="Demande de visite non trouvée")

    # Authorization: only the customer who created this visit request can update
    customer_phone = current_customer.get('phone_number', '')
    request_phone = (request.get('customer_phone') or '').replace('+', '').replace(' ', '')
    user_phone = customer_phone.replace('+', '').replace(' ', '')
    if request_phone and user_phone and request_phone != user_phone and not user_phone.endswith(request_phone[-9:]):
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres demandes")
    
    # Update payment status
    update_doc = {
        'payment_status': payment_data.payment_status,
        'updated_at': now
    }
    
    if payment_data.payment_method:
        update_doc['payment_method'] = payment_data.payment_method
    if payment_data.payment_phone:
        update_doc['payment_phone'] = payment_data.payment_phone
    
    if payment_data.payment_status == 'paid':
        update_doc['paid_at'] = now
        
        # Create a payment record in the payments collection
        payment_id = str(uuid.uuid4())
        frais_visite = request.get('frais_visite', 0) or 0
        
        if frais_visite > 0:
            payment_doc = {
                'id': payment_id,
                'visit_request_id': visit_id,
                'rental_id': request.get('rental_id'),
                'provider_id': request.get('provider_id'),
                'customer_phone': request.get('customer_phone'),
                'customer_name': request.get('customer_name'),
                'amount': frais_visite,
                'currency': 'GNF',
                'payment_method': payment_data.payment_method or 'mobile_money',
                'payment_type': 'visite',
                'status': 'completed',
                'created_at': now,
                'updated_at': now
            }
            await db.payments.insert_one(payment_doc)
    
    await db.visit_requests.update_one(
        {'id': visit_id},
        {'$set': update_doc}
    )
    
    return {
        'id': visit_id,
        'payment_status': payment_data.payment_status,
        'message': 'Statut de paiement mis à jour'
    }


@router.get("/rentals/{rental_id}/visit-requests")
async def get_rental_visit_requests(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Get all visit requests for a specific rental"""
    # Verify user owns this rental
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental.get('owner_id') != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    requests = await db.visit_requests.find(
        {'rental_id': rental_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return requests


@router.post("/rentals/{rental_id}/messages")
async def send_rental_message(rental_id: str, data: RentalMessageInput):
    """Send a message to the owner of a rental listing (public)"""
    rental = await db.rental_listings.find_one({'id': rental_id, 'is_deleted': {'$ne': True}}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    msg = {
        'id': str(uuid.uuid4()),
        'rental_id': rental_id,
        'rental_title': rental.get('title', 'Logement'),
        'rental_location': rental.get('location', ''),
        'owner_id': rental.get('service_provider_id') or rental.get('company_id'),
        'sender_name': data.sender_name,
        'sender_phone': data.sender_phone,
        'message': data.message,
        'is_read': False,
        'message_type': 'rental',
        'created_at': now
    }
    await db.property_messages.insert_one(msg)
    msg.pop('_id', None)
    return {'message': 'Message envoyé au propriétaire', 'id': msg['id']}


@router.post("/chat/rental/{rental_id}/message")
async def send_chat_message(rental_id: str, message_data: ChatMessageCreate):
    """Send a chat message for a rental listing"""
    # Verify rental exists
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': 'customer',
        'sender_name': 'Client',
        'sender_type': 'customer',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}


@router.post("/chat/rental/{rental_id}/message/customer")
async def send_customer_message(rental_id: str, message_data: ChatMessageCreate):
    """Customer sends a message to rental owner"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    # Get customer info if logged in
    customer_name = message_data.sender_name if hasattr(message_data, 'sender_name') and message_data.sender_name else "Client"
    customer_id = "customer"
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': customer_id,
        'sender_name': customer_name,
        'sender_type': 'customer',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}


@router.post("/chat/rental/{rental_id}/message/owner")
async def send_owner_message(rental_id: str, message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Owner sends a message to customer"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental.get('service_provider_id') != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': current_user['id'],
        'sender_name': f"{current_user['first_name']} {current_user['last_name']}",
        'sender_type': 'owner',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}


@router.get("/chat/rental/{rental_id}/messages")
async def get_rental_chat_messages(rental_id: str):
    """Get all chat messages for a rental listing (filtered for users)"""
    messages = await db.chat_messages.find(
        {'rental_id': rental_id}, 
        {'_id': 0, 'original_message': 0}  # Exclude original message from user view
    ).sort('created_at', 1).to_list(None)
    return messages


@router.get("/chat/my-conversations")
async def get_my_conversations(current_user: dict = Depends(get_current_user)):
    """Get all rental conversations for the logged-in owner"""
    # Get all rentals owned by user
    rentals = await db.rental_listings.find(
        {'service_provider_id': current_user['id']},
        {'_id': 0, 'id': 1, 'title': 1}
    ).to_list(None)
    
    conversations = []
    for rental in rentals:
        # Get latest message and count
        messages = await db.chat_messages.find(
            {'rental_id': rental['id']},
            {'_id': 0}
        ).sort('created_at', -1).to_list(1)
        
        message_count = await db.chat_messages.count_documents({'rental_id': rental['id']})
        
        if message_count > 0:
            conversations.append({
                'rental_id': rental['id'],
                'rental_title': rental['title'],
                'last_message': messages[0] if messages else None,
                'message_count': message_count
            })
    
    return conversations


