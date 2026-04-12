from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import PaymentCreate, PaymentStatus, PayWithCreditsRequest, RefundRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/payments/initiate")
async def initiate_payment(payment: PaymentCreate):
    """
    Initiate a payment for investigation fee.
    SIMULATION MODE - Mimics Orange Money / MTN MoMo flow
    """
    payment_id = str(uuid.uuid4())
    transaction_ref = generate_transaction_reference(payment.payment_method)
    now = datetime.now(timezone.utc).isoformat()
    
    # Get provider info
    provider = await db.service_providers.find_one({'id': payment.provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    payment_doc = {
        'id': payment_id,
        'transaction_ref': transaction_ref,
        'job_id': payment.job_id,
        'provider_id': payment.provider_id,
        'provider_name': f"{provider['first_name']} {provider['last_name']}",
        'customer_phone': payment.customer_phone,
        'customer_name': payment.customer_name,
        'amount': payment.amount,
        'currency': 'GNF',
        'payment_method': payment.payment_method,
        'payment_type': 'investigation_fee',
        'status': PaymentStatus.PENDING.value,
        'otp_sent': True,
        'otp_verified': False,
        'created_at': now,
        'updated_at': now
    }
    
    await db.payments.insert_one(payment_doc)
    
    return {
        'payment_id': payment_id,
        'transaction_ref': transaction_ref,
        'status': 'pending',
        'message': 'Paiement initié. Un code de confirmation a été envoyé.',
        'amount': payment.amount,
        'currency': 'GNF',
        'payment_method': payment.payment_method
    }


@router.post("/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: str):
    """
    Confirm a payment after OTP verification.
    SIMULATION MODE - In production, this would be called by a webhook.
    """
    payment = await db.payments.find_one({'id': payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment['status'] != PaymentStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Ce paiement a déjà été traité")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment status
    await db.payments.update_one(
        {'id': payment_id},
        {
            '$set': {
                'status': PaymentStatus.COMPLETED.value,
                'otp_verified': True,
                'completed_at': now,
                'updated_at': now
            }
        }
    )
    
    # Create notification for provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': payment['provider_id'],
        'user_type': 'provider',
        'title': 'Nouveau paiement reçu',
        'message': f"Vous avez reçu un paiement de {payment['amount']} GNF de {payment['customer_name']} pour le tarif d'investigation.",
        'notification_type': 'payment_received',
        'related_id': payment_id,
        'is_read': False,
        'created_at': now
    })
    
    return {
        'payment_id': payment_id,
        'status': 'completed',
        'message': 'Paiement confirmé avec succès!'
    }


@router.get("/payments/{payment_id}/status")
async def get_payment_status(payment_id: str):
    """Get the status of a payment"""
    payment = await db.payments.find_one({'id': payment_id}, {'_id': 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    return payment


@router.get("/payments/history/provider")
async def get_provider_payment_history(current_user: dict = Depends(get_current_user)):
    """Get payment history for the current provider"""
    payments = await db.payments.find(
        {'provider_id': current_user['id'], 'status': PaymentStatus.COMPLETED.value},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return payments


@router.get("/payments/history/customer/{phone}")
async def get_customer_payment_history(phone: str):
    """Get payment history for a customer by phone"""
    payments = await db.payments.find(
        {'customer_phone': phone},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return payments


@router.get("/provider/{provider_id}/investigation-fee")
async def get_provider_investigation_fee(provider_id: str):
    """Get the investigation fee for a provider"""
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    return {
        'provider_id': provider_id,
        'provider_name': f"{provider['first_name']} {provider['last_name']}",
        'investigation_fee': provider.get('investigation_fee', 0),
        'price': provider.get('price', 0)
    }


@router.get("/commission-rates")
async def get_public_commission_rates():
    """Get public commission rates for all domains"""
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    
    if not settings:
        settings = {
            'commission_prestation': 10.0,
            'commission_location_courte': 10.0,
            'commission_location_longue': 5.0,
            'commission_vente': 3.0,
            'commission_location_vehicule': 10.0,
            'devise': 'GNF'
        }
    
    return {
        'rates': {
            'prestation': {
                'label': 'Prestation de services',
                'rate': settings.get('commission_prestation', 10.0),
                'type': 'percentage'
            },
            'location_courte': {
                'label': 'Location courte durée',
                'rate': settings.get('commission_location_courte', 10.0),
                'type': 'percentage'
            },
            'location_longue': {
                'label': 'Location longue durée',
                'rate': settings.get('commission_location_longue', 5.0),
                'type': 'percentage'
            },
            'vente': {
                'label': 'Vente immobilière',
                'rate': settings.get('commission_vente', 3.0),
                'type': 'percentage'
            },
            'location_vehicule': {
                'label': 'Location de véhicule',
                'rate': settings.get('commission_location_vehicule', 10.0),
                'type': 'percentage'
            }
        },
        'devise': settings.get('devise', 'GNF')
    }

# Endpoint pour obtenir les tarifs et le nombre d'annonces restantes pour un agent immobilier

@router.get("/agent-listing-info/{provider_id}")
async def get_agent_listing_info(provider_id: str):
    """Get listing fees and remaining free listings for a real estate agent"""
    # Get platform settings
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    if not settings:
        settings = {
            'frais_annonce_location': 50000,
            'frais_annonce_vente': 100000,
            'annonces_gratuites': 3,
            'devise': 'GNF'
        }
    
    # Count existing listings for this provider
    # Note: rental_listings uses 'service_provider_id', property_sales uses 'agent_id'
    rentals_count = await db.rental_listings.count_documents({'service_provider_id': provider_id})
    sales_count = await db.property_sales.count_documents({'agent_id': provider_id})
    total_listings = rentals_count + sales_count
    
    # Calculate free listings remaining
    free_listings_limit = settings.get('annonces_gratuites', 3)
    free_listings_remaining = max(0, free_listings_limit - total_listings)
    is_free = total_listings < free_listings_limit
    
    return {
        'total_listings': total_listings,
        'rentals_count': rentals_count,
        'sales_count': sales_count,
        'free_listings_limit': free_listings_limit,
        'free_listings_remaining': free_listings_remaining,
        'is_next_free': is_free,
        'frais_annonce_location': settings.get('frais_annonce_location', 50000),
        'frais_annonce_vente': settings.get('frais_annonce_vente', 100000),
        'devise': settings.get('devise', 'GNF')
    }


@router.get("/service-fees")
async def get_public_service_fees():
    """Get all service fees (public endpoint)"""
    fees = await db.service_fees.find({}, {'_id': 0}).to_list(None)
    
    if not fees:
        # Return defaults
        return [
            {'profession': 'Logisticien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Logisticien'},
            {'profession': 'Electromecanicien', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Électromécanicien'},
            {'profession': 'Mecanicien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plombier', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Macon', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Maçon'},
            {'profession': 'Menuisier', 'frais_visite': 50000, 'frais_prestation': 120000, 'label': 'Menuisier'},
            {'profession': 'AgentImmobilier', 'frais_visite': 100000, 'frais_prestation': 0, 'label': 'Propriétaire immobilier'},
            {'profession': 'Soudeur', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Soudeur'},
            {'profession': 'Camionneur', 'frais_visite': 0, 'frais_prestation': 200000, 'label': 'Camionneur'},
            {'profession': 'Tracteur', 'frais_visite': 0, 'frais_prestation': 150000, 'label': 'Tracteur'},
            {'profession': 'Voiture', 'frais_visite': 0, 'frais_prestation': 100000, 'label': 'Voiture'},
            {'profession': 'Autres', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
            {'profession': 'Electrician', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Électricien'},
        ]
    
    return fees


@router.get("/service-fees/{profession}")
async def get_public_fees_by_profession(profession: str):
    """Get service fees for a specific profession (public endpoint)"""
    fees = await db.service_fees.find_one({'profession': profession}, {'_id': 0})
    
    if not fees:
        return {
            'profession': profession,
            'frais_visite': 50000,
            'frais_prestation': 100000,
            'label': profession
        }
    
    return fees


@router.get("/customer/balance")
async def get_customer_balance(current_customer: dict = Depends(get_current_customer)):
    """Get the current balance/credit of a customer"""
    customer = await db.customers.find_one({'id': current_customer['id']}, {'_id': 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {
        'customer_id': customer['id'],
        'customer_name': f"{customer['first_name']} {customer['last_name']}",
        'balance': customer.get('balance', 0) or 0
    }


@router.post("/customer/pay-with-credits")
async def pay_with_credits(payment_data: PayWithCreditsRequest, current_customer: dict = Depends(get_current_customer)):
    """Pay for a visit or service request using accumulated credits"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Get customer with current balance
    customer = await db.customers.find_one({'id': current_customer['id']}, {'_id': 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    current_balance = customer.get('balance', 0) or 0
    amount = payment_data.amount
    
    # Check if customer has enough balance
    if current_balance < amount:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Votre solde: {current_balance} GNF, Montant requis: {amount} GNF")
    
    # Calculate new balance
    new_balance = current_balance - amount
    
    # Update customer balance
    await db.customers.update_one(
        {'id': current_customer['id']},
        {'$set': {'balance': new_balance}}
    )
    
    # Determine what this payment is for
    description = "Paiement par créances"
    related_id = None
    
    if payment_data.visit_request_id:
        visit = await db.visit_requests.find_one({'id': payment_data.visit_request_id})
        if visit:
            description = f"Paiement des frais de visite pour '{visit.get('rental_title', 'propriété')}'"
            related_id = payment_data.visit_request_id
    elif payment_data.service_request_id:
        related_id = payment_data.service_request_id
        description = "Paiement des frais de prestation"
    
    # Create credit transaction (negative amount = debit)
    credit_transaction = {
        'id': str(uuid.uuid4()),
        'customer_id': current_customer['id'],
        'customer_phone': current_customer.get('phone_number'),
        'amount': -amount,  # Negative for debit
        'transaction_type': 'used_for_payment',
        'description': description,
        'related_id': related_id,
        'balance_after': new_balance,
        'created_at': now
    }
    await db.credit_transactions.insert_one(credit_transaction)
    
    # Create a payment record
    payment_id = str(uuid.uuid4())
    payment_doc = {
        'id': payment_id,
        'visit_request_id': payment_data.visit_request_id,
        'service_request_id': payment_data.service_request_id,
        'customer_id': current_customer['id'],
        'customer_phone': current_customer.get('phone_number'),
        'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}",
        'amount': amount,
        'currency': 'GNF',
        'payment_method': 'credits',
        'payment_type': 'visite' if payment_data.visit_request_id else 'service_request',
        'status': 'completed',
        'created_at': now,
        'updated_at': now
    }
    await db.payments.insert_one(payment_doc)
    
    return {
        'success': True,
        'message': 'Paiement effectué avec vos créances',
        'amount_paid': amount,
        'previous_balance': current_balance,
        'new_balance': new_balance,
        'payment_id': payment_id
    }


@router.get("/customer/credit-history")
async def get_customer_credit_history(current_customer: dict = Depends(get_current_customer)):
    """Get credit transaction history for a customer"""
    transactions = await db.credit_transactions.find(
        {'customer_id': current_customer['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return transactions


@router.post("/customer/request-refund")
async def request_refund(refund_data: RefundRequest, current_customer: dict = Depends(get_current_customer)):
    """Request a refund of accumulated credits"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Get customer balance
    customer = await db.customers.find_one({'id': current_customer['id']}, {'_id': 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    current_balance = customer.get('balance', 0) or 0
    
    if refund_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être positif")
    
    if refund_data.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Montant supérieur au solde disponible ({current_balance} GNF)")
    
    # Create refund request
    refund_id = str(uuid.uuid4())
    refund_doc = {
        'id': refund_id,
        'customer_id': current_customer['id'],
        'customer_phone': current_customer.get('phone_number'),
        'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}",
        'amount': refund_data.amount,
        'reason': refund_data.reason,
        'status': 'pending',  # pending, approved, rejected
        'admin_note': None,
        'processed_by': None,
        'processed_at': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.refund_requests.insert_one(refund_doc)
    
    return {
        'id': refund_id,
        'amount': refund_data.amount,
        'status': 'pending',
        'message': 'Demande de remboursement envoyée'
    }


@router.get("/customer/refund-requests")
async def get_customer_refund_requests(current_customer: dict = Depends(get_current_customer)):
    """Get refund requests for a customer"""
    requests = await db.refund_requests.find(
        {'customer_id': current_customer['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(20)
    
    return requests


@router.post("/customer/report-no-show/{job_id}")
async def report_provider_no_show(job_id: str, current_customer: dict = Depends(get_current_customer)):
    """Report that a provider didn't show up for a paid service - credits the customer"""
    # Find the job/service request
    job = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        # Try to find in payments collection
        payment = await db.payments.find_one({'job_id': job_id}, {'_id': 0})
        if not payment:
            raise HTTPException(status_code=404, detail="Demande de service non trouvée")
        
        # Verify this payment belongs to the customer
        if payment.get('customer_phone') != current_customer.get('phone_number'):
            raise HTTPException(status_code=403, detail="Non autorisé")
        
        # Check if payment was completed
        if payment.get('status') != 'completed':
            raise HTTPException(status_code=400, detail="Le paiement n'a pas été effectué")
        
        # Check if already reported
        existing_report = await db.no_show_reports.find_one({'payment_id': payment['id']})
        if existing_report:
            raise HTTPException(status_code=400, detail="Ce signalement a déjà été fait")
        
        credit_amount = payment.get('amount', 0) or 0
        
        if credit_amount > 0:
            now = datetime.now(timezone.utc).isoformat()
            
            # Get current balance
            customer = await db.customers.find_one({'id': current_customer['id']}, {'_id': 0})
            current_balance = customer.get('balance', 0) or 0
            new_balance = current_balance + credit_amount
            
            # Update customer balance
            await db.customers.update_one(
                {'id': current_customer['id']},
                {'$set': {'balance': new_balance}}
            )
            
            # Create credit transaction record
            credit_transaction = {
                'id': str(uuid.uuid4()),
                'customer_id': current_customer['id'],
                'customer_phone': current_customer.get('phone_number'),
                'amount': credit_amount,
                'transaction_type': 'provider_no_show',
                'description': f"Crédit suite à la non-présentation du prestataire {payment.get('provider_name', '')}",
                'related_id': job_id,
                'balance_after': new_balance,
                'created_at': now
            }
            await db.credit_transactions.insert_one(credit_transaction)
            
            # Record the no-show report
            no_show_report = {
                'id': str(uuid.uuid4()),
                'payment_id': payment['id'],
                'job_id': job_id,
                'customer_id': current_customer['id'],
                'customer_phone': current_customer.get('phone_number'),
                'provider_id': payment.get('provider_id'),
                'provider_name': payment.get('provider_name'),
                'amount_credited': credit_amount,
                'status': 'credited',
                'created_at': now
            }
            await db.no_show_reports.insert_one(no_show_report)
            
            # Create notification
            notification_doc = {
                'id': str(uuid.uuid4()),
                'customer_phone': current_customer.get('phone_number'),
                'customer_id': current_customer['id'],
                'user_type': 'customer',
                'title': '💰 Crédit ajouté - Non-présentation prestataire',
                'message': f"Suite à la non-présentation du prestataire, un crédit de {credit_amount:,.0f} GNF a été ajouté à votre solde.\nNouveau solde: {new_balance:,.0f} GNF",
                'notification_type': 'provider_no_show_credit',
                'related_id': job_id,
                'credit_amount': credit_amount,
                'is_read': False,
                'created_at': now
            }
            await db.customer_notifications.insert_one(notification_doc)
            
            return {
                'success': True,
                'message': 'Signalement enregistré. Votre crédit a été ajouté.',
                'credit_amount': credit_amount,
                'new_balance': new_balance
            }
    
    return {
        'success': False,
        'message': 'Impossible de traiter ce signalement'
    }


