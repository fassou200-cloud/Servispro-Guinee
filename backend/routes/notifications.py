from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import NotificationCreate, NotificationType

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/notifications")
async def create_notification(notification: NotificationCreate):
    """Create a new notification"""
    notification_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    notification_doc = {
        'id': notification_id,
        'user_id': notification.user_id,
        'user_type': notification.user_type,
        'title': notification.title,
        'message': notification.message,
        'notification_type': notification.notification_type.value,
        'related_id': notification.related_id,
        'is_read': False,
        'created_at': now
    }
    
    await db.notifications.insert_one(notification_doc)
    return {k: v for k, v in notification_doc.items() if k != '_id'}


@router.get("/notifications/provider")
async def get_provider_notifications(current_user: dict = Depends(get_current_user)):
    """Get all notifications for the current provider"""
    notifications = await db.notifications.find(
        {'user_id': current_user['id'], 'user_type': 'provider'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return notifications


@router.get("/notifications/customer")
async def get_customer_notifications(current_customer: dict = Depends(get_current_customer)):
    """Get all notifications for the current customer"""
    customer_id = current_customer.get('id')
    customer_phone = current_customer.get('phone_number')
    
    # Get notifications from both collections
    notifications_standard = await db.notifications.find(
        {'user_id': customer_id, 'user_type': 'customer'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    # Get notifications from customer_notifications (visit requests)
    notifications_visits = await db.customer_notifications.find(
        {'$or': [
            {'customer_id': customer_id},
            {'customer_phone': customer_phone}
        ]},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    # Combine and sort
    all_notifications = notifications_standard + notifications_visits
    all_notifications.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return all_notifications[:50]


@router.get("/notifications/unread-count/provider")
async def get_provider_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications for provider"""
    count = await db.notifications.count_documents({
        'user_id': current_user['id'],
        'user_type': 'provider',
        'is_read': False
    })
    return {'unread_count': count}


@router.get("/notifications/unread-count/customer")
async def get_customer_unread_count(current_customer: dict = Depends(get_current_customer)):
    """Get count of unread notifications for customer"""
    customer_id = current_customer.get('id')
    customer_phone = current_customer.get('phone_number')
    
    # Count from standard notifications
    count_standard = await db.notifications.count_documents({
        'user_id': customer_id,
        'user_type': 'customer',
        'is_read': False
    })
    
    # Count from customer_notifications (visit requests)
    count_visits = await db.customer_notifications.count_documents({
        '$or': [
            {'customer_id': customer_id},
            {'customer_phone': customer_phone}
        ],
        'is_read': False
    })
    
    return {'unread_count': count_standard + count_visits}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {'id': notification_id},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Notification marquée comme lue'}


@router.put("/notifications/mark-all-read/provider")
async def mark_all_provider_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all provider notifications as read"""
    await db.notifications.update_many(
        {'user_id': current_user['id'], 'user_type': 'provider'},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Toutes les notifications marquées comme lues'}


@router.put("/notifications/mark-all-read/customer")
async def mark_all_customer_notifications_read(current_customer: dict = Depends(get_current_customer)):
    """Mark all customer notifications as read"""
    await db.notifications.update_many(
        {'user_id': current_customer['id'], 'user_type': 'customer'},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Toutes les notifications marquées comme lues'}


