from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import ReviewCreate, Review, FeedbackCreate, Feedback, FeedbackStatus, SurveyData

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_customer: dict = Depends(get_current_customer)):
    # Verify provider exists
    provider = await db.service_providers.find_one({'id': review_data.service_provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Service provider not found")

    # Force customer identity from authenticated session (anti-spoof)
    customer_id = current_customer.get('id')

    # Verify the job exists and is COMPLETED (not just Accepted)
    job = await db.job_offers.find_one({
        'id': review_data.job_id,
        'service_provider_id': review_data.service_provider_id,
        'customer_id': customer_id,
        'status': 'Completed'  # Only allow reviews for fully completed jobs
    })

    if not job:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez évaluer un prestataire que si le travail a été terminé et confirmé"
        )

    # Check if customer already reviewed this job
    existing_review = await db.reviews.find_one({
        'job_id': review_data.job_id,
        'customer_id': customer_id
    })

    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="Vous avez déjà laissé un avis pour ce travail"
        )
    
    review_id = str(uuid.uuid4())
    review_doc = {
        'id': review_id,
        'service_provider_id': review_data.service_provider_id,
        'reviewer_name': review_data.reviewer_name,
        'rating': review_data.rating,
        'comment': review_data.comment,
        'job_id': review_data.job_id,
        'customer_id': customer_id,
        'survey': review_data.survey.model_dump() if review_data.survey else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    review_response = {k: v for k, v in review_doc.items() if k != '_id'}
    return Review(**review_response)


@router.post("/feedback", response_model=Feedback)
async def submit_feedback(feedback_data: FeedbackCreate):
    """Submit feedback about platform issues, bugs, or feature requests"""
    # Enforce required phone for contact-type messages so admin can follow up
    phone = (feedback_data.user_phone or '').strip()
    phone_digits = ''.join(c for c in phone if c.isdigit())
    if len(phone_digits) < 8:
        raise HTTPException(
            status_code=400,
            detail="Le numéro de téléphone est obligatoire (minimum 8 chiffres)"
        )
    feedback_id = str(uuid.uuid4())
    feedback_doc = {
        'id': feedback_id,
        'type': feedback_data.type.value,
        'title': feedback_data.title,
        'description': feedback_data.description,
        'user_name': feedback_data.user_name,
        'user_email': feedback_data.user_email,
        'user_phone': feedback_data.user_phone,
        'user_type': feedback_data.user_type,
        'page_url': feedback_data.page_url,
        'status': FeedbackStatus.NEW.value,
        'admin_notes': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': None
    }
    
    await db.feedbacks.insert_one(feedback_doc)
    
    feedback_response = {k: v for k, v in feedback_doc.items() if k != '_id'}
    return Feedback(**feedback_response)


@router.get("/reviews/{provider_id}", response_model=List[Review])
async def get_provider_reviews(provider_id: str):
    reviews = await db.reviews.find({'service_provider_id': provider_id}, {'_id': 0}).sort('created_at', -1).to_list(None)
    return [Review(**r) for r in reviews]


@router.get("/reviews/{provider_id}/stats")
async def get_provider_rating_stats(provider_id: str):
    reviews = await db.reviews.find({'service_provider_id': provider_id}, {'_id': 0, 'rating': 1}).to_list(None)
    
    if not reviews:
        return {
            'total_reviews': 0,
            'average_rating': 0,
            'rating_distribution': {
                '5': 0,
                '4': 0,
                '3': 0,
                '2': 0,
                '1': 0
            }
        }
    
    total = len(reviews)
    ratings = [r['rating'] for r in reviews]
    average = sum(ratings) / total
    
    distribution = {
        '5': ratings.count(5),
        '4': ratings.count(4),
        '3': ratings.count(3),
        '2': ratings.count(2),
        '1': ratings.count(1)
    }
    
    return {
        'total_reviews': total,
        'average_rating': round(average, 1),
        'rating_distribution': distribution
    }


