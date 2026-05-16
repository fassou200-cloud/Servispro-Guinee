from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import JobOfferCreate, JobOfferUpdate, JobOffer, JobStatus

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/jobs", response_model=JobOffer)
async def create_job_offer(job_data: JobOfferCreate, current_customer: dict = Depends(get_current_customer)):
    # Verify provider exists
    provider = await db.service_providers.find_one({'id': job_data.service_provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Service provider not found")

    job_id = str(uuid.uuid4())
    job_doc = {
        'id': job_id,
        'service_provider_id': job_data.service_provider_id,
        'client_name': job_data.client_name,
        'service_type': job_data.service_type,
        'description': job_data.description,
        'location': job_data.location,
        'scheduled_date': job_data.scheduled_date,
        # Force customer identity from authenticated session (anti-spoof)
        'customer_id': current_customer.get('id'),
        'customer_phone': current_customer.get('phone_number') or job_data.customer_phone,
        'status': JobStatus.PENDING.value,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.job_offers.insert_one(job_doc)
    
    job_response = {k: v for k, v in job_doc.items() if k != '_id'}
    return JobOffer(**job_response)


@router.get("/jobs/my-jobs", response_model=List[JobOffer])
async def get_my_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await db.job_offers.find({'service_provider_id': current_user['id']}, {'_id': 0}).to_list(None)
    return [JobOffer(**job) for job in jobs]


@router.put("/jobs/{job_id}")
async def update_job_status(job_id: str, update_data: JobOfferUpdate, current_user: dict = Depends(get_current_user)):
    # Find job and verify ownership
    job = await db.job_offers.find_one({'id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': {'status': update_data.status.value}}
    )
    
    updated_job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    return updated_job

# Rental Listing Routes

@router.put("/jobs/{job_id}/provider-complete")
async def provider_mark_complete(job_id: str, current_user: dict = Depends(get_current_user)):
    """Provider marks job as completed - awaiting customer confirmation"""
    job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Travail non trouvé")
    
    if job['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if job['status'] != 'Accepted':
        raise HTTPException(status_code=400, detail="Le travail doit être accepté avant d'être marqué comme terminé")
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': {'status': JobStatus.PROVIDER_COMPLETED.value}}
    )
    return {"message": "Travail marqué comme terminé. En attente de confirmation du client."}


@router.put("/jobs/{job_id}/customer-confirm")
async def customer_confirm_complete(job_id: str, current_user: dict = Depends(get_current_customer)):
    """Customer confirms job is completed - returns data for rating popup"""
    job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Travail non trouvé")
    
    if job['status'] != 'ProviderCompleted':
        raise HTTPException(status_code=400, detail="Le prestataire doit d'abord marquer le travail comme terminé")
    
    # If job has a customer_id, verify it matches the current user
    # If job doesn't have customer_id (legacy job), assign current customer to it
    job_customer_id = job.get('customer_id')
    if job_customer_id and job_customer_id != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé - ce n'est pas votre demande")
    
    # Update job with completion status and assign customer_id if not present
    update_data = {
        'status': JobStatus.COMPLETED.value, 
        'completed_at': datetime.now(timezone.utc).isoformat()
    }
    if not job_customer_id:
        update_data['customer_id'] = current_user['id']
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': update_data}
    )
    
    # Get provider info for the rating popup
    provider = await db.service_providers.find_one({'id': job['service_provider_id']}, {'_id': 0, 'password': 0})
    
    # Check if already reviewed
    existing_review = await db.reviews.find_one({
        'job_id': job_id,
        'customer_id': current_user['id']
    })
    
    return {
        "message": "Service confirmé comme terminé. Merci !",
        "job_id": job_id,
        "provider_id": job['service_provider_id'],
        "provider_name": f"{provider.get('first_name', '')} {provider.get('last_name', '')}".strip() if provider else "Prestataire",
        "provider_profession": provider.get('profession', '') if provider else '',
        "service_description": job.get('description', ''),
        "can_review": existing_review is None,
        "already_reviewed": existing_review is not None
    }


@router.get("/customer/jobs")
async def get_customer_jobs(current_customer: dict = Depends(get_current_customer)):
    """Get jobs for the AUTHENTICATED customer only."""
    customer_id = current_customer.get('id')
    customer_phone = current_customer.get('phone_number')

    # Match either by customer_id (preferred) or customer_phone (legacy entries)
    query = {
        '$or': [
            {'customer_id': customer_id},
            {'customer_phone': customer_phone},
        ]
    }
    jobs = await db.job_offers.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)

    # Enrich with provider info and review status
    for job in jobs:
        provider = await db.service_providers.find_one(
            {'id': job.get('service_provider_id')},
            {'_id': 0, 'first_name': 1, 'last_name': 1, 'profession': 1}
        )
        if provider:
            job['provider_name'] = f"{provider.get('first_name', '')} {provider.get('last_name', '')}"
            job['provider_profession'] = provider.get('profession', '')

        # Check if this job has been reviewed
        review = await db.reviews.find_one({'job_id': job.get('id')}, {'_id': 0, 'rating': 1})
        job['has_review'] = review is not None
        job['review_rating'] = review.get('rating') if review else None

    return jobs


