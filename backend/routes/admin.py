from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Body, Request
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging
import bcrypt

from database import db
from config import ADMIN_ACCOUNTS, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_BLOCK_DURATION
from dependencies import get_current_user, get_current_company, get_current_customer, create_token
from models import (
    UpdateProviderAboutInput, UpdateProviderProfileInput,
    AdminSettingsUpdate, ServiceFeesUpdate, AdminPropertyInquiryResponse,
    InquiryMessage, ProductUpdate, RefundDecision
)
from utils.cloudinary_helper import upload_to_cloudinary, delete_from_cloudinary, delete_provider_cloudinary_files, delete_company_cloudinary_files
from utils.security import (
    log_audit_event, get_client_ip, is_ip_blocked, record_failed_attempt,
    clear_failed_attempts, login_attempts, blocked_ips
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/admin/vehicle-sales")
async def admin_get_all_vehicle_sales(status: str = None):
    """Admin: Get all vehicle sales"""
    query = {}
    if status:
        query['status'] = status
    
    sales = await db.vehicle_sales.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return sales


@router.put("/admin/vehicle-sales/{sale_id}/approve")
async def admin_approve_vehicle_sale(sale_id: str):
    """Admin: Approve a vehicle sale"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.APPROVED.value, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Notify seller
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if sale:
        notification = {
            'id': str(uuid.uuid4()),
            'user_id': sale.get('seller_id'),
            'user_type': 'provider',
            'title': 'Annonce de vente approuvée',
            'message': f"Votre annonce {sale.get('brand')} {sale.get('model')} a été approuvée et est maintenant visible.",
            'notification_type': 'vehicle_sale_approved',
            'related_id': sale_id,
            'is_read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {'message': 'Annonce approuvée'}


@router.put("/admin/vehicle-sales/{sale_id}/reject")
async def admin_reject_vehicle_sale(sale_id: str):
    """Admin: Reject a vehicle sale"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.REJECTED.value, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    return {'message': 'Annonce rejetée'}


@router.put("/admin/vehicle-sales/{sale_id}/sold")
async def admin_mark_vehicle_sold(sale_id: str):
    """Admin: Mark a vehicle as sold"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.SOLD.value, 'sold_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    return {'message': 'Véhicule marqué comme vendu'}


@router.get("/admin/vehicle-inquiries")
async def admin_get_vehicle_inquiries(status: str = None):
    """Admin: Get all vehicle inquiries"""
    query = {}
    if status:
        query['status'] = status
    
    inquiries = await db.vehicle_inquiries.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return inquiries


@router.put("/admin/vehicle-inquiries/{inquiry_id}")
async def admin_update_vehicle_inquiry(inquiry_id: str, status: str, admin_notes: str = None):
    """Admin: Update vehicle inquiry status"""
    update_fields = {
        'status': status,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    if admin_notes:
        update_fields['admin_notes'] = admin_notes
    
    result = await db.vehicle_inquiries.update_one(
        {'id': inquiry_id},
        {'$set': update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    return {'message': 'Statut mis à jour'}


@router.get("/admin/property-sales")
async def admin_get_all_property_sales(status: str = None):
    """Admin: Get all property sales for management"""
    query = {}
    if status:
        query['status'] = status
    
    sales = await db.property_sales.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return sales


@router.get("/admin/property-sales/pending")
async def admin_get_pending_property_sales():
    """Admin: Get all pending property sales"""
    sales = await db.property_sales.find(
        {'status': 'pending'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return sales


@router.put("/admin/property-sales/{sale_id}/approve")
async def admin_approve_property_sale(sale_id: str):
    """Admin: Approve a property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {
            'status': 'approved',
            'approved_at': now,
            'approved_by': 'admin',
            'updated_at': now
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    # Create notification for the property owner
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': sale.get('agent_id') or sale.get('company_id'),
        'user_type': 'provider' if sale.get('agent_id') else 'company',
        'title': 'Vente approuvée',
        'message': f'Votre annonce de vente "{sale.get("title", "Propriété")}" a été approuvée et est maintenant visible au public.',
        'notification_type': 'property_sale_approved',
        'related_id': sale_id,
        'is_read': False,
        'created_at': now
    })
    
    return {'message': 'Vente immobilière approuvée', 'sale_id': sale_id}


@router.put("/admin/property-sales/{sale_id}/reject")
async def admin_reject_property_sale(sale_id: str, reason: Optional[str] = None):
    """Admin: Reject a property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {
            'status': 'rejected',
            'rejection_reason': reason or 'Annonce non conforme aux conditions d\'utilisation',
            'updated_at': now
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    # Create notification for the property owner
    notification_id = str(uuid.uuid4())
    rejection_msg = reason or 'Annonce non conforme aux conditions d\'utilisation'
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': sale.get('agent_id') or sale.get('company_id'),
        'user_type': 'provider' if sale.get('agent_id') else 'company',
        'title': 'Vente rejetée',
        'message': f'Votre annonce de vente "{sale.get("title", "Propriété")}" a été rejetée. Raison: {rejection_msg}',
        'notification_type': 'property_sale_rejected',
        'related_id': sale_id,
        'is_read': False,
        'created_at': now
    })
    
    return {'message': 'Vente immobilière rejetée', 'sale_id': sale_id}


@router.delete("/admin/property-sales/{sale_id}")
async def admin_delete_property_sale(sale_id: str):
    """Admin: Delete a property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create notification for the property owner before deletion
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': sale.get('agent_id') or sale.get('company_id'),
        'user_type': 'provider' if sale.get('agent_id') else 'company',
        'title': 'Vente supprimée',
        'message': f'Votre annonce de vente "{sale.get("title", "Propriété")}" a été supprimée par l\'administrateur.',
        'notification_type': 'property_sale_deleted',
        'related_id': sale_id,
        'is_read': False,
        'created_at': now
    })
    
    # Delete the sale
    await db.property_sales.delete_one({'id': sale_id})
    
    return {'message': 'Vente immobilière supprimée', 'sale_id': sale_id}


@router.put("/admin/property-sales/{sale_id}/sold")
async def admin_mark_property_sold(sale_id: str):
    """Admin: Mark a property as sold"""
    result = await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {
            'status': 'sold',
            'is_available': False,
            'sold_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    return {'message': 'Propriété marquée comme vendue', 'sale_id': sale_id}


@router.put("/admin/property-sales/{sale_id}/update-price")
async def admin_update_sale_price(sale_id: str, data: dict = Body(...)):
    """Admin: Update property sale price"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    new_price = data.get('sale_price')
    if new_price is None or float(new_price) < 0:
        raise HTTPException(status_code=400, detail="Prix invalide")
    
    await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {
            'sale_price': float(new_price),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {'message': 'Prix mis à jour avec succès'}


@router.post("/admin/property-sales/{sale_id}/documents")
async def admin_upload_property_document(sale_id: str, document: UploadFile = File(...)):
    """Admin: Upload a document for a property sale"""
    # Verify sale exists
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    # Validate file type
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if document.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    # Save file
    file_ext = document.filename.split('.')[-1] if '.' in document.filename else 'pdf'
    filename = f"admin_doc_{sale_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = f"/app/uploads/property_sales/{filename}"
    
    os.makedirs("/app/uploads/property_sales", exist_ok=True)
    
    content = await document.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Add to admin_documents array
    document_url = f"/uploads/property_sales/{filename}"
    await db.property_sales.update_one(
        {'id': sale_id},
        {
            '$push': {'admin_documents': document_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'message': 'Document téléchargé', 'document_path': document_url}


@router.delete("/admin/property-sales/{sale_id}/documents")
async def admin_delete_property_document(sale_id: str, document_path: str = Body(..., embed=True)):
    """Admin: Delete a document from a property sale"""
    # Verify sale exists
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    # Remove from array
    await db.property_sales.update_one(
        {'id': sale_id},
        {
            '$pull': {'admin_documents': document_path},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Delete file from disk
    full_path = f"/app{document_path}"
    if os.path.exists(full_path):
        os.remove(full_path)
    
    return {'message': 'Document supprimé'}


@router.post("/admin/property-inquiries/{inquiry_id}/message")
async def admin_send_inquiry_message(inquiry_id: str, message_data: InquiryMessage):
    """Admin sends a message in the inquiry conversation"""
    inquiry = await db.property_inquiries.find_one({'id': inquiry_id}, {'_id': 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        'id': str(uuid.uuid4()),
        'sender': 'admin',
        'sender_name': 'ServisPro',
        'message': message_data.message,
        'created_at': now
    }
    
    # Add message to conversation array
    await db.property_inquiries.update_one(
        {'id': inquiry_id},
        {
            '$push': {'conversation': new_message},
            '$set': {'updated_at': now, 'status': 'contacted'}
        }
    )
    
    # Notify customer
    customer_id = inquiry.get('customer_id')
    if customer_id:
        customer_notification = {
            'id': str(uuid.uuid4()),
            'customer_phone': inquiry.get('customer_phone'),
            'title': 'Réponse à votre demande d\'achat',
            'message': message_data.message,
            'link': '/customer/dashboard?tab=demandes',
            'read': False,
            'created_at': now,
            'data': {
                'type': 'property_inquiry_message',
                'inquiry_id': inquiry_id,
                'property_info': inquiry.get('property_info')
            }
        }
        await db.customer_notifications.insert_one(customer_notification)
    
    return {'message': 'Message envoyé', 'id': new_message['id']}


@router.get("/admin/property-inquiries")
async def admin_get_property_inquiries(status: str = None):
    """Admin: Get all property sale inquiries"""
    query = {}
    if status:
        query['status'] = status
    inquiries = await db.property_inquiries.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return inquiries


@router.put("/admin/property-inquiries/{inquiry_id}")
async def admin_update_property_inquiry(inquiry_id: str, update_data: AdminPropertyInquiryResponse):
    """Admin: Update a property inquiry status and respond to customer"""
    # Get the inquiry to find customer info
    inquiry = await db.property_inquiries.find_one({'id': inquiry_id}, {'_id': 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_fields = {
        'status': update_data.status,
        'updated_at': now
    }
    if update_data.admin_notes:
        update_fields['admin_notes'] = update_data.admin_notes
    if update_data.admin_response:
        update_fields['admin_response'] = update_data.admin_response
        update_fields['response_date'] = now
    
    result = await db.property_inquiries.update_one(
        {'id': inquiry_id},
        {'$set': update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Send notification to customer if there's a response or status change
    customer_id = inquiry.get('customer_id')
    if customer_id and (update_data.admin_response or update_data.status in ['contacted', 'completed']):
        status_text = {
            'pending': 'En attente',
            'contacted': 'Contacté',
            'completed': 'Terminé',
            'rejected': 'Rejeté'
        }.get(update_data.status, update_data.status)
        
        notification_message = update_data.admin_response or f"Votre demande pour '{inquiry.get('property_info', 'la propriété')}' a été mise à jour: {status_text}"
        
        customer_notification = {
            'id': str(uuid.uuid4()),
            'customer_phone': inquiry.get('customer_phone'),
            'title': 'Réponse à votre demande d\'achat',
            'message': notification_message,
            'link': '/customer/dashboard?tab=demandes',
            'read': False,
            'created_at': now,
            'data': {
                'type': 'property_inquiry_response',
                'inquiry_id': inquiry_id,
                'property_info': inquiry.get('property_info'),
                'status': update_data.status,
                'admin_response': update_data.admin_response
            }
        }
        await db.customer_notifications.insert_one(customer_notification)
    
    return {'message': 'Demande mise à jour', 'inquiry_id': inquiry_id}


@router.post("/admin/property-inquiries/{inquiry_id}/documents")
async def admin_upload_inquiry_document(inquiry_id: str, document: UploadFile = File(...)):
    """Admin: Upload a document for a property inquiry"""
    # Verify inquiry exists
    inquiry = await db.property_inquiries.find_one({'id': inquiry_id})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Validate file type
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if document.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    # Save file
    file_ext = document.filename.split('.')[-1] if '.' in document.filename else 'pdf'
    filename = f"inquiry_doc_{inquiry_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = f"/app/uploads/property_inquiries/{filename}"
    
    os.makedirs("/app/uploads/property_inquiries", exist_ok=True)
    
    content = await document.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Add to admin_documents array
    document_url = f"/uploads/property_inquiries/{filename}"
    await db.property_inquiries.update_one(
        {'id': inquiry_id},
        {
            '$push': {'admin_documents': document_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'message': 'Document téléchargé', 'document_path': document_url}


@router.delete("/admin/property-inquiries/{inquiry_id}/documents")
async def admin_delete_inquiry_document(inquiry_id: str, document_path: str = Body(..., embed=True)):
    """Admin: Delete a document from a property inquiry"""
    # Verify inquiry exists
    inquiry = await db.property_inquiries.find_one({'id': inquiry_id})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Remove from array
    await db.property_inquiries.update_one(
        {'id': inquiry_id},
        {
            '$pull': {'admin_documents': document_path},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Delete file from disk
    full_path = f"/app{document_path}"
    if os.path.exists(full_path):
        os.remove(full_path)
    
    return {'message': 'Document supprimé'}


@router.get("/admin/feedbacks")
async def get_all_feedbacks(status: Optional[str] = None, type: Optional[str] = None):
    """Get all feedbacks for admin review"""
    query = {}
    if status:
        query['status'] = status
    if type:
        query['type'] = type
    
    feedbacks = await db.feedbacks.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return feedbacks


@router.get("/admin/feedbacks/stats")
async def get_feedback_stats():
    """Get feedback statistics for admin dashboard"""
    all_feedbacks = await db.feedbacks.find({}, {'_id': 0, 'type': 1, 'status': 1}).to_list(None)
    
    stats = {
        'total': len(all_feedbacks),
        'by_status': {
            'new': 0,
            'in_progress': 0,
            'resolved': 0,
            'closed': 0
        },
        'by_type': {
            'bug': 0,
            'issue': 0,
            'feature': 0,
            'improvement': 0,
            'other': 0
        }
    }
    
    for fb in all_feedbacks:
        status = fb.get('status', 'new')
        fb_type = fb.get('type', 'other')
        if status in stats['by_status']:
            stats['by_status'][status] += 1
        if fb_type in stats['by_type']:
            stats['by_type'][fb_type] += 1
    
    return stats


@router.put("/admin/feedbacks/{feedback_id}")
async def update_feedback(feedback_id: str, status: Optional[str] = None, admin_notes: Optional[str] = None):
    """Update feedback status and admin notes"""
    feedback = await db.feedbacks.find_one({'id': feedback_id}, {'_id': 0})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback non trouvé")
    
    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if status:
        update_data['status'] = status
    if admin_notes is not None:
        update_data['admin_notes'] = admin_notes
    
    await db.feedbacks.update_one({'id': feedback_id}, {'$set': update_data})
    
    updated_feedback = await db.feedbacks.find_one({'id': feedback_id}, {'_id': 0})
    return updated_feedback


@router.delete("/admin/feedbacks/{feedback_id}")
async def delete_feedback(feedback_id: str):
    """Delete a feedback"""
    result = await db.feedbacks.delete_one({'id': feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouvé")
    return {"message": "Feedback supprimé avec succès"}


@router.get("/admin/chat/rental/{rental_id}/messages")
async def get_rental_chat_messages_admin(rental_id: str):
    """Get all chat messages for a rental listing (full access for admin - includes original messages)"""
    messages = await db.chat_messages.find(
        {'rental_id': rental_id}, 
        {'_id': 0}  # Admin can see original_message
    ).sort('created_at', 1).to_list(None)
    return messages


@router.get("/admin/chat/all-messages")
async def get_all_chat_messages_admin():
    """Get all chat messages across all rentals (admin only)"""
    messages = await db.chat_messages.find(
        {}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    # Add rental info to each message
    for msg in messages:
        rental = await db.rental_listings.find_one(
            {'id': msg.get('rental_id')}, 
            {'_id': 0, 'title': 1}
        )
        msg['rental_title'] = rental.get('title') if rental else 'Annonce supprimée'
    
    return messages


@router.get("/admin/audit-logs")
async def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[str] = None,
    success: Optional[bool] = None,
    user_type: Optional[str] = None
):
    """Get audit logs for admin review"""
    query = {}
    if event_type:
        query["event_type"] = {"$regex": event_type, "$options": "i"}
    if success is not None:
        query["success"] = success
    if user_type:
        query["user_type"] = user_type
    
    logs = await db.audit_logs.find(query, {'_id': 0}).sort('timestamp', -1).limit(limit).to_list(limit)
    
    # Get summary stats
    total_logs = await db.audit_logs.count_documents({})
    failed_logins = await db.audit_logs.count_documents({"success": False, "event_type": {"$regex": "LOGIN", "$options": "i"}})
    blocked_ips = await db.audit_logs.count_documents({"event_type": {"$regex": "BLOCKED", "$options": "i"}})
    
    return {
        "logs": logs,
        "stats": {
            "total_logs": total_logs,
            "failed_logins_count": failed_logins,
            "blocked_attempts": blocked_ips
        }
    }


@router.get("/admin/security-status")
async def get_security_status():
    """Get current security status including blocked IPs"""
    now = datetime.now(timezone.utc)
    
    # Get currently blocked IPs
    active_blocks = [
        {"ip": ip, "blocked_until": block_time.isoformat()}
        for ip, block_time in blocked_ips.items()
        if block_time > now
    ]
    
    # Get recent failed attempts
    recent_attempts = []
    for ip, attempts in login_attempts.items():
        if attempts:
            recent_attempts.append({
                "ip": ip,
                "attempt_count": len(attempts),
                "last_attempt": max(attempts).isoformat() if attempts else None
            })
    
    # Get stats from last 24 hours
    yesterday = now - timedelta(hours=24)
    recent_failures = await db.audit_logs.count_documents({
        "success": False,
        "timestamp": {"$gte": yesterday}
    })
    recent_successes = await db.audit_logs.count_documents({
        "success": True,
        "event_type": {"$regex": "LOGIN_SUCCESS", "$options": "i"},
        "timestamp": {"$gte": yesterday}
    })
    
    return {
        "blocked_ips": active_blocks,
        "pending_attempts": recent_attempts,
        "last_24h": {
            "failed_attempts": recent_failures,
            "successful_logins": recent_successes
        },
        "rate_limit_config": {
            "window_seconds": RATE_LIMIT_WINDOW,
            "max_attempts": RATE_LIMIT_MAX_ATTEMPTS,
            "block_duration_seconds": RATE_LIMIT_BLOCK_DURATION
        }
    }


@router.delete("/admin/unblock-ip/{ip_address}")
async def unblock_ip(ip_address: str):
    """Manually unblock an IP address"""
    if ip_address in blocked_ips:
        del blocked_ips[ip_address]
        await log_audit_event(
            event_type="IP_UNBLOCKED",
            details={"unblocked_ip": ip_address},
            success=True
        )
        return {"message": f"IP {ip_address} débloquée avec succès"}
    return {"message": f"IP {ip_address} n'était pas bloquée"}


@router.get("/admin/visit-fees-stats")
async def get_visit_fees_stats():
    """Get statistics for visit fees paid (frais de visite) for locations and services"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Initialize stats
    location_fees = {
        'total_amount': 0,
        'count': 0,
        'today_amount': 0,
        'today_count': 0,
        'this_month_amount': 0,
        'this_month_count': 0,
        'recent_payments': []
    }
    
    service_fees = {
        'total_amount': 0,
        'count': 0,
        'today_amount': 0,
        'today_count': 0,
        'this_month_amount': 0,
        'this_month_count': 0,
        'recent_payments': []
    }
    
    # 1. Get all visit requests (for locations) - both pending and paid
    visit_requests = await db.visit_requests.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    
    for vr in visit_requests:
        amount = vr.get('frais_visite', 0) or 0
        if amount > 0:
            location_fees['total_amount'] += amount
            location_fees['count'] += 1
            
            created_at = vr.get('created_at', '')
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    if created_date.tzinfo is None:
                        created_date = created_date.replace(tzinfo=timezone.utc)
                    if created_date >= today_start:
                        location_fees['today_amount'] += amount
                        location_fees['today_count'] += 1
                    if created_date >= month_start:
                        location_fees['this_month_amount'] += amount
                        location_fees['this_month_count'] += 1
                except Exception as e:
                    pass
            
            if len(location_fees['recent_payments']) < 10:
                location_fees['recent_payments'].append({
                    'id': vr.get('id'),
                    'amount': amount,
                    'customer_name': vr.get('customer_name', 'N/A'),
                    'customer_phone': vr.get('customer_phone', 'N/A'),
                    'rental_title': vr.get('rental_title', 'N/A'),
                    'payment_status': vr.get('payment_status', 'pending'),
                    'created_at': str(vr.get('created_at', '')),
                    'type': 'location'
                })
    
    # 2. Get all payments from payments collection (for prestataires/services)
    payments = await db.payments.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    
    for payment in payments:
        amount = payment.get('amount', 0) or 0
        status = payment.get('status', '')
        
        if amount > 0:
            service_fees['total_amount'] += amount
            service_fees['count'] += 1
            
            created_at = payment.get('created_at', '')
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    if created_date.tzinfo is None:
                        created_date = created_date.replace(tzinfo=timezone.utc)
                    if created_date >= today_start:
                        service_fees['today_amount'] += amount
                        service_fees['today_count'] += 1
                    if created_date >= month_start:
                        service_fees['this_month_amount'] += amount
                        service_fees['this_month_count'] += 1
                except Exception as e:
                    pass
            
            if len(service_fees['recent_payments']) < 10:
                service_fees['recent_payments'].append({
                    'id': payment.get('id'),
                    'amount': amount,
                    'customer_name': payment.get('customer_name', 'Client'),
                    'customer_phone': payment.get('customer_phone', 'N/A'),
                    'provider_name': payment.get('provider_name', 'N/A'),
                    'service_type': payment.get('payment_type', 'investigation_fee'),
                    'status': status,
                    'created_at': str(payment.get('created_at', '')),
                    'type': 'prestataire'
                })
    
    return {
        'locations': location_fees,
        'prestataires': service_fees,
        'grand_total': {
            'amount': location_fees['total_amount'] + service_fees['total_amount'],
            'count': location_fees['count'] + service_fees['count'],
            'today_amount': location_fees['today_amount'] + service_fees['today_amount'],
            'today_count': location_fees['today_count'] + service_fees['today_count'],
            'this_month_amount': location_fees['this_month_amount'] + service_fees['this_month_amount'],
            'this_month_count': location_fees['this_month_count'] + service_fees['this_month_count']
        }
    }


@router.get("/admin/demand-stats")
async def get_demand_stats():
    """Get statistics for service demands by profession and by location"""
    
    # Get all jobs/demands
    jobs = await db.job_offers.find({}, {'_id': 0}).to_list(None)
    
    # Stats by profession
    by_profession = {}
    # Stats by location
    by_location = {}
    
    for job in jobs:
        # Get provider info
        provider_id = job.get('service_provider_id')
        if provider_id:
            provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0})
            if provider:
                profession = provider.get('profession', 'Autres')
                custom_profession = provider.get('custom_profession')
                
                # Use custom profession if set and profession is "Autres"
                display_profession = custom_profession if profession == 'Autres' and custom_profession else profession
                
                # Count by profession
                if display_profession not in by_profession:
                    by_profession[display_profession] = {
                        'count': 0,
                        'pending': 0,
                        'accepted': 0,
                        'completed': 0,
                        'rejected': 0
                    }
                by_profession[display_profession]['count'] += 1
                
                status = job.get('status', 'Pending')
                if status == 'Pending':
                    by_profession[display_profession]['pending'] += 1
                elif status == 'Accepted':
                    by_profession[display_profession]['accepted'] += 1
                elif status in ['Completed', 'ProviderCompleted']:
                    by_profession[display_profession]['completed'] += 1
                elif status == 'Rejected':
                    by_profession[display_profession]['rejected'] += 1
        
        # Count by location
        location = job.get('location', 'Non spécifié')
        if location:
            # Normalize location (extract main area/city)
            location_key = location.strip()
            if ',' in location_key:
                location_key = location_key.split(',')[0].strip()
            
            if location_key not in by_location:
                by_location[location_key] = {
                    'count': 0,
                    'pending': 0,
                    'accepted': 0,
                    'completed': 0,
                    'rejected': 0
                }
            by_location[location_key]['count'] += 1
            
            status = job.get('status', 'Pending')
            if status == 'Pending':
                by_location[location_key]['pending'] += 1
            elif status == 'Accepted':
                by_location[location_key]['accepted'] += 1
            elif status in ['Completed', 'ProviderCompleted']:
                by_location[location_key]['completed'] += 1
            elif status == 'Rejected':
                by_location[location_key]['rejected'] += 1
    
    # Sort by count descending
    sorted_by_profession = dict(sorted(by_profession.items(), key=lambda x: x[1]['count'], reverse=True))
    sorted_by_location = dict(sorted(by_location.items(), key=lambda x: x[1]['count'], reverse=True))
    
    return {
        'total_demands': len(jobs),
        'by_profession': sorted_by_profession,
        'by_location': sorted_by_location
    }


@router.get("/admin/providers")
async def get_all_providers_admin():
    """Get all providers with their verification status for admin review"""
    providers = await db.service_providers.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(None)
    return providers


@router.put("/admin/providers/{provider_id}/approve")
async def approve_provider(provider_id: str):
    """Approve a service provider"""
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'verification_status': ProviderStatus.APPROVED.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    return {"message": "Prestataire approuvé avec succès"}


@router.put("/admin/providers/{provider_id}/reject")
async def reject_provider(provider_id: str):
    """Reject a service provider and delete their Cloudinary files"""
    # Get provider to access their files
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Delete Cloudinary files to free up storage
    cloudinary_result = await delete_provider_cloudinary_files(provider)
    logging.info(f"Cloudinary cleanup on reject: {cloudinary_result}")
    
    # Update status to rejected and clear file references
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {
            '$set': {
                'verification_status': ProviderStatus.REJECTED.value,
                'profile_picture': None,
                'id_verification_picture': None,
                'documents': []
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    return {
        "message": "Prestataire rejeté et fichiers supprimés",
        "cloudinary_files_deleted": cloudinary_result.get('deleted', 0)
    }


@router.put("/admin/providers/{provider_id}/toggle-active")
async def toggle_provider_active(provider_id: str):
    """Toggle provider's active status (activate/deactivate) - Admin only"""
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Toggle is_active status
    current_status = provider.get('is_active', True)
    new_status = not current_status
    
    await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'is_active': new_status}}
    )
    
    status_text = "activé" if new_status else "désactivé"
    return {
        "message": f"Prestataire {status_text} avec succès",
        "is_active": new_status
    }


@router.put("/admin/customers/{customer_id}/toggle-active")
async def toggle_customer_active(customer_id: str):
    """Toggle customer's active status (activate/deactivate) - Admin only"""
    customer = await db.customers.find_one({'id': customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Toggle is_active status
    current_status = customer.get('is_active', True)
    new_status = not current_status
    
    await db.customers.update_one(
        {'id': customer_id},
        {'$set': {'is_active': new_status}}
    )
    
    status_text = "activé" if new_status else "désactivé"
    return {
        "message": f"Client {status_text} avec succès",
        "is_active": new_status
    }


@router.put("/admin/providers/{provider_id}/profile")
async def update_provider_profile(provider_id: str, input_data: UpdateProviderProfileInput):
    """Update provider's profile (name, profession) - Admin only"""
    # Validate names are not empty
    if not input_data.first_name or len(input_data.first_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Le prénom doit contenir au moins 2 caractères")
    if not input_data.last_name or len(input_data.last_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Le nom doit contenir au moins 2 caractères")
    if not input_data.profession or len(input_data.profession.strip()) < 2:
        raise HTTPException(status_code=400, detail="La profession est obligatoire")
    
    update_data = {
        'first_name': input_data.first_name.strip(),
        'last_name': input_data.last_name.strip(),
        'profession': input_data.profession.strip()
    }
    
    # Update profession_group if provided
    if input_data.profession_group:
        update_data['profession_group'] = input_data.profession_group.strip()
    
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': update_data}
    )
    if result.modified_count == 0:
        # Check if provider exists
        provider = await db.service_providers.find_one({'id': provider_id})
        if not provider:
            raise HTTPException(status_code=404, detail="Prestataire non trouvé")
        # Provider exists but no changes made (same data)
        return {"message": "Aucune modification nécessaire", **update_data}
    
    return {"message": "Profil mis à jour avec succès", **update_data}


@router.put("/admin/providers/{provider_id}/about")
async def update_provider_about(provider_id: str, input_data: UpdateProviderAboutInput):
    """Update provider's about_me field - Admin only"""
    # Validate about_me is not empty
    if not input_data.about_me or len(input_data.about_me.strip()) < 10:
        raise HTTPException(status_code=400, detail="La description doit contenir au moins 10 caractères")
    
    # Check for contact info in about_me
    import re
    phone_patterns = [
        r'\+?\d{3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}',
        r'\d{9,}',
    ]
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    for pattern in phone_patterns:
        if re.search(pattern, input_data.about_me):
            raise HTTPException(status_code=400, detail="La description ne doit pas contenir de numéro de téléphone")
    
    if re.search(email_pattern, input_data.about_me, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="La description ne doit pas contenir d'adresse email")
    
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'about_me': input_data.about_me.strip()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    return {"message": "Description mise à jour avec succès", "about_me": input_data.about_me.strip()}


@router.get("/admin/jobs")
async def get_all_jobs_admin():
    """Get all jobs for admin dashboard"""
    jobs = await db.job_offers.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    
    # Enrich with provider and customer info
    for job in jobs:
        provider = await db.service_providers.find_one(
            {'id': job.get('service_provider_id')}, 
            {'_id': 0, 'first_name': 1, 'last_name': 1, 'phone_number': 1}
        )
        if provider:
            job['provider_name'] = f"{provider.get('first_name', '')} {provider.get('last_name', '')}"
            job['provider_phone'] = provider.get('phone_number', '')
    
    return jobs


@router.get("/admin/rentals")
async def get_all_rentals_admin():
    """Get all rental listings for admin dashboard"""
    rentals = await db.rental_listings.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    return rentals


@router.get("/admin/rentals/pending")
async def get_pending_rentals_admin():
    """Get all pending rental listings for admin approval"""
    rentals = await db.rental_listings.find(
        {'approval_status': ListingApprovalStatus.PENDING.value}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return rentals


@router.put("/admin/rentals/{rental_id}/approve")
async def approve_rental_admin(rental_id: str):
    """Approve a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$set': {
                'approval_status': ListingApprovalStatus.APPROVED.value,
                'approved_at': now,
                'approved_by': 'admin',
                'rejection_reason': None,
                'updated_at': now
            }
        }
    )
    
    # Create notification for the provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': rental['service_provider_id'],
        'user_type': 'provider',
        'title': 'Annonce approuvée',
        'message': f'Votre annonce "{rental["title"]}" a été approuvée et est maintenant visible au public.',
        'notification_type': 'system',
        'related_id': rental_id,
        'is_read': False,
        'created_at': now
    })
    
    return {"message": "Location approuvée avec succès", "rental_id": rental_id}


@router.put("/admin/rentals/{rental_id}/reject")
async def reject_rental_admin(rental_id: str, reason: Optional[str] = None):
    """Reject a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$set': {
                'approval_status': ListingApprovalStatus.REJECTED.value,
                'rejection_reason': reason or 'Annonce non conforme aux conditions d\'utilisation',
                'approved_at': None,
                'approved_by': None,
                'updated_at': now
            }
        }
    )
    
    # Create notification for the provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': rental['service_provider_id'],
        'user_type': 'provider',
        'title': 'Annonce rejetée',
        'message': f'Votre annonce "{rental["title"]}" a été rejetée. Raison: {reason or "Non conforme aux conditions"}',
        'notification_type': 'system',
        'related_id': rental_id,
        'is_read': False,
        'created_at': now
    })


@router.get("/admin/agents-immobilier")
async def get_all_agents_immobilier():
    """Get all Agent Immobilier providers for admin dashboard"""
    agents = await db.service_providers.find(
        {'profession': 'AgentImmobilier'}, 
        {'_id': 0, 'password': 0}
    ).sort('created_at', -1).to_list(None)
    
    # Add rental count for each agent
    for agent in agents:
        rental_count = await db.rental_listings.count_documents({'service_provider_id': agent['id']})
        agent['rental_count'] = rental_count
    
    return agents


@router.delete("/admin/rentals/{rental_id}")
async def delete_rental_admin(rental_id: str):
    """Delete a rental listing as admin"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create notification for the property owner before deletion
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': rental.get('service_provider_id') or rental.get('company_id'),
        'user_type': 'provider' if rental.get('service_provider_id') else 'company',
        'title': 'Location supprimée',
        'message': f'Votre annonce de location "{rental.get("title", "Propriété")}" a été supprimée par l\'administrateur.',
        'notification_type': 'rental_deleted',
        'related_id': rental_id,
        'is_read': False,
        'created_at': now
    })
    
    # Delete associated chat messages
    await db.chat_messages.delete_many({'rental_id': rental_id})
    
    result = await db.rental_listings.delete_one({'id': rental_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    return {"message": "Location supprimée avec succès"}


@router.get("/admin/customers")
async def get_all_customers_admin():
    """Get all customers for admin dashboard"""
    customers = await db.customers.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(None)
    return customers


@router.delete("/admin/providers/{provider_id}")
async def delete_provider(provider_id: str, request: Request):
    """Soft-delete a service provider (archive instead of permanent deletion)"""
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Soft-delete: mark as deleted instead of removing
    now = datetime.now(timezone.utc).isoformat()
    await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {
            'is_active': False,
            'is_deleted': True,
            'deleted_at': now,
            'deleted_by': 'admin'
        }}
    )
    
    # Audit log
    await log_audit_event(
        event_type="PROVIDER_DELETED",
        ip_address=get_client_ip(request),
        user_type="admin",
        details={
            "provider_id": provider_id,
            "provider_name": f"{provider.get('first_name', '')} {provider.get('last_name', '')}",
            "provider_phone": provider.get('phone_number', ''),
            "profession": provider.get('profession', ''),
            "action": "soft_delete"
        },
        success=True
    )
    
    return {"message": "Prestataire archivé avec succès"}


@router.delete("/admin/customers/{customer_id}")
async def delete_customer(customer_id: str, request: Request):
    """Soft-delete a customer (archive instead of permanent deletion)"""
    customer = await db.customers.find_one({'id': customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Soft-delete: mark as deleted instead of removing
    now = datetime.now(timezone.utc).isoformat()
    await db.customers.update_one(
        {'id': customer_id},
        {'$set': {
            'is_active': False,
            'is_deleted': True,
            'deleted_at': now,
            'deleted_by': 'admin'
        }}
    )
    
    # Audit log
    await log_audit_event(
        event_type="CUSTOMER_DELETED",
        ip_address=get_client_ip(request),
        user_type="admin",
        details={
            "customer_id": customer_id,
            "customer_name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}",
            "customer_phone": customer.get('phone_number', ''),
            "action": "soft_delete"
        },
        success=True
    )
    
    return {"message": "Client archivé avec succès"}

# Admin Company Routes

@router.get("/admin/companies")
async def admin_get_all_companies():
    """Get all companies for admin"""
    companies = await db.companies.find({'is_deleted': {'$ne': True}}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(None)
    
    # Add stats for each company
    for company in companies:
        company['services_count'] = await db.company_services.count_documents({'company_id': company['id']})
        company['job_offers_count'] = await db.company_job_offers.count_documents({'company_id': company['id']})
    
    return companies


@router.put("/admin/companies/{company_id}/approve")
async def admin_approve_company(company_id: str):
    """Approve a company"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    await db.companies.update_one(
        {'id': company_id},
        {'$set': {
            'verification_status': 'approved',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Entreprise approuvée avec succès"}


@router.put("/admin/companies/{company_id}/description")
async def admin_update_company_description(company_id: str, data: dict = Body(...)):
    """Update a company's description"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    description = data.get('description', '').strip()
    if not description:
        raise HTTPException(status_code=400, detail="La description ne peut pas être vide")
    
    await db.companies.update_one(
        {'id': company_id},
        {'$set': {
            'description': description,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Description mise à jour avec succès"}


@router.put("/admin/companies/{company_id}/update")
async def admin_update_company(company_id: str, data: dict = Body(...)):
    """Update company details from admin dashboard"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    allowed_fields = [
        'company_name', 'sector', 'address', 'city', 'region',
        'phone_number', 'email', 'website', 'description',
        'rccm_number', 'nif_number', 'contact_person_name', 'contact_person_phone'
    ]
    
    update_data = {}
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.companies.update_one({'id': company_id}, {'$set': update_data})
    
    # Also update the shop name/sector if exists
    shop_update = {}
    if 'company_name' in update_data:
        shop_update['name'] = update_data['company_name']
    if 'sector' in update_data:
        shop_update['sector'] = update_data['sector']
    if shop_update:
        await db.shops.update_many({'owner_id': company_id}, {'$set': shop_update})
    
    return {"message": "Entreprise mise à jour avec succès"}


@router.put("/admin/companies/{company_id}/reject")
async def admin_reject_company(company_id: str):
    """Reject a company and delete their Cloudinary files"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Delete Cloudinary files
    cloudinary_result = await delete_company_cloudinary_files(company)
    logging.info(f"Cloudinary cleanup on company reject: {cloudinary_result}")
    
    await db.companies.update_one(
        {'id': company_id},
        {'$set': {
            'verification_status': 'rejected',
            'logo': None,
            'licence_exploitation': None,
            'rccm_document': None,
            'nif_document': None,
            'attestation_fiscale': None,
            'documents_additionnels': [],
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {
        "message": "Entreprise rejetée et fichiers supprimés",
        "cloudinary_files_deleted": cloudinary_result.get('deleted', 0)
    }


@router.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: str):
    """Hard-delete a company and ALL associated data"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Delete Cloudinary files if any
    try:
        await delete_company_cloudinary_files(company)
    except Exception as e:
        logging.warning(f"Cloudinary cleanup error: {e}")
    
    # Delete shop(s) and related data
    shops = await db.shops.find({'owner_id': company_id}, {'_id': 0, 'id': 1}).to_list(None)
    shop_ids = [s['id'] for s in shops]
    
    if shop_ids:
        # Delete products of these shops
        products = await db.products.find({'shop_id': {'$in': shop_ids}}, {'_id': 0, 'id': 1}).to_list(None)
        product_ids = [p['id'] for p in products]
        
        if product_ids:
            # Delete product reviews
            await db.product_reviews.delete_many({'product_id': {'$in': product_ids}})
            # Delete product messages
            await db.product_messages.delete_many({'product_id': {'$in': product_ids}})
        
        # Delete all products
        await db.products.delete_many({'shop_id': {'$in': shop_ids}})
        # Delete marketplace messages for shops
        await db.marketplace_messages.delete_many({'shop_id': {'$in': shop_ids}})
        # Delete shops
        await db.shops.delete_many({'owner_id': company_id})
    
    # Delete property messages
    await db.property_messages.delete_many({'owner_id': company_id})
    # Delete rental listings
    await db.rental_listings.delete_many({'service_provider_id': company_id})
    # Delete property sales and inquiries
    sales = await db.property_sales.find({'agent_id': company_id}, {'_id': 0, 'id': 1}).to_list(None)
    sale_ids = [s['id'] for s in sales]
    if sale_ids:
        await db.property_inquiries.delete_many({'sale_id': {'$in': sale_ids}})
    await db.property_sales.delete_many({'agent_id': company_id})
    # Delete company services and job offers
    await db.company_services.delete_many({'company_id': company_id})
    await db.company_job_offers.delete_many({'company_id': company_id})
    # Delete visit requests
    await db.visit_requests.delete_many({'service_provider_id': company_id})
    # Delete notifications
    await db.notifications.delete_many({'user_id': company_id})
    
    # Finally delete the company itself
    await db.companies.delete_one({'id': company_id})
    
    return {"message": "Entreprise et toutes les données associées supprimées définitivement"}


@router.get("/admin/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    providers_count = await db.service_providers.count_documents({})
    pending_providers = await db.service_providers.count_documents({'verification_status': 'pending'})
    approved_providers = await db.service_providers.count_documents({'verification_status': 'approved'})
    customers_count = await db.customers.count_documents({})
    jobs_count = await db.job_offers.count_documents({})
    completed_jobs = await db.job_offers.count_documents({'status': 'Completed'})
    rentals_count = await db.rental_listings.count_documents({})
    sales_count = await db.property_sales.count_documents({})
    companies_count = await db.companies.count_documents({})
    pending_companies = await db.companies.count_documents({'verification_status': 'pending'})
    approved_companies = await db.companies.count_documents({'verification_status': 'approved'})
    job_offers_count = await db.company_job_offers.count_documents({})
    
    return {
        'total_providers': providers_count,
        'pending_providers': pending_providers,
        'approved_providers': approved_providers,
        'total_customers': customers_count,
        'total_jobs': jobs_count,
        'completed_jobs': completed_jobs,
        'total_rentals': rentals_count,
        'total_sales': sales_count,
        'total_companies': companies_count,
        'pending_companies': pending_companies,
        'approved_companies': approved_companies,
        'total_job_offers': job_offers_count
    }


@router.get("/admin/service-fees")
async def get_all_service_fees():
    """Get all service fees by profession"""
    fees = await db.service_fees.find({}, {'_id': 0}).to_list(None)
    
    # If no fees exist, return defaults for all professions
    if not fees:
        default_fees = [
            {'profession': 'Logisticien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Logisticien'},
            {'profession': 'Electromecanicien', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Électromécanicien'},
            {'profession': 'Mecanicien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plombier', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Macon', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Maçon'},
            {'profession': 'Menuisier', 'frais_visite': 50000, 'frais_prestation': 120000, 'label': 'Menuisier'},
            {'profession': 'AgentImmobilier', 'frais_visite': 100000, 'frais_prestation': 0, 'label': 'Propriétaire immobilier'},
            {'profession': 'Soudeur', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Soudeur'},
            {'profession': 'Autres', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
            {'profession': 'Electrician', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Électricien'},
            {'profession': 'Mechanic', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plumber', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Other', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
        ]
        # Insert defaults
        await db.service_fees.insert_many(default_fees)
        return default_fees
    
    return fees


@router.get("/admin/service-fees/{profession}")
async def get_service_fees_by_profession(profession: str):
    """Get service fees for a specific profession"""
    fees = await db.service_fees.find_one({'profession': profession}, {'_id': 0})
    
    if not fees:
        # Return default fees
        return {
            'profession': profession,
            'frais_visite': 50000,
            'frais_prestation': 100000,
            'label': profession
        }
    
    return fees


@router.put("/admin/service-fees")
async def update_service_fees(fees: ServiceFeesUpdate):
    """Update service fees for a profession"""
    update_data = {
        'profession': fees.profession,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if fees.frais_visite is not None:
        update_data['frais_visite'] = fees.frais_visite
    if fees.frais_prestation is not None:
        update_data['frais_prestation'] = fees.frais_prestation
    
    result = await db.service_fees.update_one(
        {'profession': fees.profession},
        {'$set': update_data},
        upsert=True
    )
    
    # Return updated fees
    updated_fees = await db.service_fees.find_one({'profession': fees.profession}, {'_id': 0})
    return updated_fees


@router.put("/admin/service-fees/bulk")
async def update_bulk_service_fees(fees_list: List[ServiceFeesUpdate]):
    """Update multiple service fees at once"""
    results = []
    for fees in fees_list:
        update_data = {
            'profession': fees.profession,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if fees.frais_visite is not None:
            update_data['frais_visite'] = fees.frais_visite
        if fees.frais_prestation is not None:
            update_data['frais_prestation'] = fees.frais_prestation
        
        await db.service_fees.update_one(
            {'profession': fees.profession},
            {'$set': update_data},
            upsert=True
        )
        
        updated = await db.service_fees.find_one({'profession': fees.profession}, {'_id': 0})
        results.append(updated)
    
    return results

# Public endpoint to get service fees (for providers and customers)

@router.get("/admin/settings")
async def get_admin_settings():
    """Get admin platform settings"""
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    
    if not settings:
        # Return default settings if none exist - All commissions are percentages by domain
        default_settings = {
            'type': 'platform_settings',
            'commission_prestation': 10.0,        # 10% Prestation de services
            'commission_location_courte': 10.0,   # 10% Location courte durée
            'commission_location_longue': 5.0,    # 5% Location longue durée
            'commission_vente': 3.0,              # 3% Vente immobilière
            'commission_location_vehicule': 10.0, # 10% Location véhicule
            'devise': 'GNF',                      # Devise par défaut
            'frais_annonce_location': 50000,      # 50 000 GNF par annonce de location
            'frais_annonce_vente': 100000,        # 100 000 GNF par annonce de vente
            'annonces_gratuites': 3,              # 3 premières annonces gratuites
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.admin_settings.insert_one(default_settings)
        return {k: v for k, v in default_settings.items() if k != '_id'}
    
    # Migrate old settings format to new format if needed
    if 'commission_location_courte' not in settings:
        settings['commission_prestation'] = settings.get('commission_prestation', 10.0) if settings.get('commission_prestation', 0) > 100 else settings.get('commission_prestation', 10.0)
        settings['commission_location_courte'] = 10.0
        settings['commission_location_longue'] = 5.0
        settings['commission_vente'] = settings.get('commission_vente', 3.0)
        settings['commission_location_vehicule'] = 10.0
    
    return settings


@router.put("/admin/settings")
async def update_admin_settings(settings: AdminSettingsUpdate):
    """Update admin platform settings"""
    update_data = {
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if settings.commission_prestation is not None:
        update_data['commission_prestation'] = settings.commission_prestation
    if settings.commission_location_courte is not None:
        update_data['commission_location_courte'] = settings.commission_location_courte
    if settings.commission_location_longue is not None:
        update_data['commission_location_longue'] = settings.commission_location_longue
    if settings.commission_vente is not None:
        update_data['commission_vente'] = settings.commission_vente
    if settings.commission_location_vehicule is not None:
        update_data['commission_location_vehicule'] = settings.commission_location_vehicule
    if settings.devise is not None:
        update_data['devise'] = settings.devise
    if settings.frais_annonce_location is not None:
        update_data['frais_annonce_location'] = settings.frais_annonce_location
    if settings.frais_annonce_vente is not None:
        update_data['frais_annonce_vente'] = settings.frais_annonce_vente
    if settings.annonces_gratuites is not None:
        update_data['annonces_gratuites'] = settings.annonces_gratuites
    
    result = await db.admin_settings.update_one(
        {'type': 'platform_settings'},
        {'$set': update_data},
        upsert=True
    )
    
    # Return updated settings
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    return settings


@router.get("/admin/commission-revenue")
async def get_commission_revenue():
    """Calculate commission revenue for the last 30 days by domain"""
    from datetime import timedelta
    
    # Get settings
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    if not settings:
        settings = {
            'commission_prestation': 10.0,        # 10%
            'commission_location_courte': 10.0,   # 10%
            'commission_location_longue': 5.0,    # 5%
            'commission_vente': 3.0,              # 3%
            'commission_location_vehicule': 10.0, # 10%
            'devise': 'GNF'
        }
    
    # Calculate date 30 days ago
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Get successful payments from the last 30 days
    payments = await db.payments.find({
        'status': 'completed',
        'created_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(None)
    
    # Get property sales from the last 30 days
    sales = await db.property_sales.find({
        'status': 'sold',
        'sold_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(None)
    
    # Get rentals for location calculations
    rentals = await db.rentals.find({
        'status': 'approved',
        'created_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(None)
    
    # Calculate totals
    total_payments = len(payments)
    total_sales = len(sales)
    total_rentals = len(rentals)
    total_payment_amount = sum(p.get('amount', 0) for p in payments)
    total_sales_amount = sum(s.get('price', 0) for s in sales)
    
    # Commission breakdown by domain (all percentages)
    # 1. Prestation de services
    prestation_amount = sum(p.get('amount', 0) for p in payments if p.get('payment_type') == 'prestation')
    commission_prestation = prestation_amount * (settings.get('commission_prestation', 10.0) / 100)
    prestation_count = sum(1 for p in payments if p.get('payment_type') == 'prestation')
    
    # 2. Location courte durée
    location_courte_amount = sum(r.get('price_per_night', 0) * 30 for r in rentals if r.get('listing_type') == 'short_term')
    commission_location_courte = location_courte_amount * (settings.get('commission_location_courte', 10.0) / 100)
    location_courte_count = sum(1 for r in rentals if r.get('listing_type') == 'short_term')
    
    # 3. Location longue durée
    location_longue_amount = sum(r.get('price_per_month', 0) for r in rentals if r.get('listing_type') == 'long_term')
    commission_location_longue = location_longue_amount * (settings.get('commission_location_longue', 5.0) / 100)
    location_longue_count = sum(1 for r in rentals if r.get('listing_type') == 'long_term')
    
    # 4. Vente immobilière
    commission_vente = total_sales_amount * (settings.get('commission_vente', 3.0) / 100)
    
    # 5. Location véhicule
    vehicule_amount = sum(r.get('price_per_day', 0) * 30 for r in rentals if r.get('listing_type') == 'vehicle')
    commission_location_vehicule = vehicule_amount * (settings.get('commission_location_vehicule', 10.0) / 100)
    vehicule_count = sum(1 for r in rentals if r.get('listing_type') == 'vehicle')
    
    # Also include visite payments (frais d'investigation) under prestation
    visite_amount = sum(p.get('amount', 0) for p in payments if p.get('payment_type', 'visite') == 'visite' or not p.get('payment_type'))
    commission_visite = visite_amount * (settings.get('commission_prestation', 10.0) / 100)
    visite_count = sum(1 for p in payments if p.get('payment_type', 'visite') == 'visite' or not p.get('payment_type'))
    
    total_commission = (commission_prestation + commission_location_courte + 
                       commission_location_longue + commission_vente + 
                       commission_location_vehicule + commission_visite)
    
    devise = settings.get('devise', 'GNF')
    
    return {
        'period': '30 derniers jours',
        'total_transactions': total_payments,
        'total_sales': total_sales,
        'total_rentals': total_rentals,
        'total_volume_payments': total_payment_amount,
        'total_volume_sales': total_sales_amount,
        'commission_breakdown': {
            'prestation': round(commission_prestation + commission_visite, 0),
            'location_courte': round(commission_location_courte, 0),
            'location_longue': round(commission_location_longue, 0),
            'vente': round(commission_vente, 0),
            'location_vehicule': round(commission_location_vehicule, 0)
        },
        'volume_breakdown': {
            'prestation': round(prestation_amount + visite_amount, 0),
            'location_courte': round(location_courte_amount, 0),
            'location_longue': round(location_longue_amount, 0),
            'vente': round(total_sales_amount, 0),
            'location_vehicule': round(vehicule_amount, 0)
        },
        'transaction_counts': {
            'prestation': prestation_count + visite_count,
            'location_courte': location_courte_count,
            'location_longue': location_longue_count,
            'vente': total_sales,
            'location_vehicule': vehicule_count
        },
        'total_commission': round(total_commission, 0),
        'devise': devise,
        'rates': {
            'commission_prestation': settings.get('commission_prestation', 10.0),
            'commission_location_courte': settings.get('commission_location_courte', 10.0),
            'commission_location_longue': settings.get('commission_location_longue', 5.0),
            'commission_vente': settings.get('commission_vente', 3.0),
            'commission_location_vehicule': settings.get('commission_location_vehicule', 10.0)
        }
    }


@router.get("/admin/refund-requests")
async def get_all_refund_requests():
    """Get all refund requests for admin"""
    requests = await db.refund_requests.find(
        {},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    return requests


@router.put("/admin/refund-requests/{request_id}")
async def process_refund_request(request_id: str, decision: RefundDecision):
    """Approve or reject a refund request"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the refund request
    refund_request = await db.refund_requests.find_one({'id': request_id}, {'_id': 0})
    if not refund_request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if refund_request['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
    
    if decision.status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    # Update refund request
    await db.refund_requests.update_one(
        {'id': request_id},
        {'$set': {
            'status': decision.status,
            'admin_note': decision.admin_note,
            'processed_at': now,
            'updated_at': now
        }}
    )
    
    # If approved, deduct from customer balance and create transaction
    if decision.status == 'approved':
        customer = await db.customers.find_one({'id': refund_request['customer_id']}, {'_id': 0})
        if customer:
            current_balance = customer.get('balance', 0) or 0
            new_balance = max(0, current_balance - refund_request['amount'])
            
            # Update customer balance
            await db.customers.update_one(
                {'id': refund_request['customer_id']},
                {'$set': {'balance': new_balance}}
            )
            
            # Create credit transaction (negative = debit for refund)
            credit_transaction = {
                'id': str(uuid.uuid4()),
                'customer_id': refund_request['customer_id'],
                'customer_phone': refund_request['customer_phone'],
                'amount': -refund_request['amount'],
                'transaction_type': 'refund',
                'description': f"Remboursement approuvé - {decision.admin_note or 'Sans note'}",
                'related_id': request_id,
                'balance_after': new_balance,
                'created_at': now
            }
            await db.credit_transactions.insert_one(credit_transaction)
            
            # Create notification for customer
            notification_doc = {
                'id': str(uuid.uuid4()),
                'customer_phone': refund_request['customer_phone'],
                'customer_id': refund_request['customer_id'],
                'user_type': 'customer',
                'title': '✅ Remboursement approuvé',
                'message': f"Votre demande de remboursement de {refund_request['amount']:,.0f} GNF a été approuvée.",
                'notification_type': 'refund_approved',
                'related_id': request_id,
                'is_read': False,
                'created_at': now
            }
            await db.customer_notifications.insert_one(notification_doc)
    else:
        # Rejected - notify customer
        notification_doc = {
            'id': str(uuid.uuid4()),
            'customer_phone': refund_request['customer_phone'],
            'customer_id': refund_request['customer_id'],
            'user_type': 'customer',
            'title': '❌ Remboursement refusé',
            'message': f"Votre demande de remboursement de {refund_request['amount']:,.0f} GNF a été refusée. {decision.admin_note or ''}",
            'notification_type': 'refund_rejected',
            'related_id': request_id,
            'is_read': False,
            'created_at': now
        }
        await db.customer_notifications.insert_one(notification_doc)
    
    return {
        'id': request_id,
        'status': decision.status,
        'message': f"Demande {'approuvée' if decision.status == 'approved' else 'refusée'}"
    }


@router.post("/admin/customer/{customer_id}/adjust-balance")
async def admin_adjust_customer_balance(
    customer_id: str, 
    amount: float = Query(..., description="Montant (positif pour crédit, négatif pour débit)"),
    reason: str = Query(..., description="Raison de l'ajustement")
):
    """Admin endpoint to adjust a customer's balance"""
    customer = await db.customers.find_one({'id': customer_id}, {'_id': 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    current_balance = customer.get('balance', 0) or 0
    new_balance = current_balance + amount
    
    # Prevent negative balance
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Le solde ne peut pas être négatif")
    
    # Update customer balance
    await db.customers.update_one(
        {'id': customer_id},
        {'$set': {'balance': new_balance}}
    )
    
    # Create credit transaction record
    credit_transaction = {
        'id': str(uuid.uuid4()),
        'customer_id': customer_id,
        'customer_phone': customer.get('phone_number'),
        'amount': amount,
        'transaction_type': 'admin_adjustment',
        'description': f"Ajustement administratif: {reason}",
        'related_id': None,
        'balance_after': new_balance,
        'created_at': now
    }
    await db.credit_transactions.insert_one(credit_transaction)
    
    # Create notification for customer
    if amount > 0:
        notification_doc = {
            'id': str(uuid.uuid4()),
            'customer_phone': customer.get('phone_number'),
            'customer_id': customer_id,
            'user_type': 'customer',
            'title': '💰 Crédit ajouté par l\'administration',
            'message': f"Un crédit de {amount:,.0f} GNF a été ajouté à votre solde.\nRaison: {reason}\nNouveau solde: {new_balance:,.0f} GNF",
            'notification_type': 'admin_credit',
            'credit_amount': amount,
            'is_read': False,
            'created_at': now
        }
        await db.customer_notifications.insert_one(notification_doc)
    
    return {
        'customer_id': customer_id,
        'previous_balance': current_balance,
        'adjustment': amount,
        'new_balance': new_balance,
        'reason': reason
    }


@router.get("/admin/customers-with-balance")
async def get_customers_with_balance():
    """Get all customers with their balance information"""
    customers = await db.customers.find(
        {},
        {'_id': 0, 'password': 0}
    ).to_list(None)
    
    # Add balance info if missing
    for customer in customers:
        if 'balance' not in customer:
            customer['balance'] = 0
    
    return customers

# Include router - must be after all route definitions
# app.include_router moved to after marketplace endpoints

# Serve uploaded files - IMPORTANT: Use /api/uploads to work with Kubernetes ingress
from fastapi.staticfiles import StaticFiles

@router.get("/admin/product-categories")
async def get_product_categories():
    categories = await db.product_categories.find({}, {'_id': 0}).to_list(None)
    return categories


@router.post("/admin/product-categories")
async def create_product_category(data: dict = Body(...)):
    category = {
        'id': str(uuid.uuid4()),
        'name': data['name'],
        'icon': data.get('icon', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.product_categories.insert_one(category)
    del category['_id']
    return category


@router.delete("/admin/product-categories/{category_id}")
async def delete_product_category(category_id: str):
    result = await db.product_categories.delete_one({'id': category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return {"message": "Catégorie supprimée"}


@router.get("/admin/marketplace-stats")
async def get_marketplace_stats():
    total_shops = await db.shops.count_documents({'is_active': True})
    total_products = await db.products.count_documents({'is_deleted': {'$ne': True}})
    total_messages = await db.product_messages.count_documents({})
    return {
        "total_shops": total_shops,
        "total_products": total_products,
        "total_messages": total_messages
    }


@router.get("/admin/marketplace-shops")
async def admin_get_shops():
    shops = await db.shops.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    return shops


@router.post("/admin/shops/{shop_id}/products")
async def admin_create_product_for_shop(shop_id: str, data: dict = Body(...)):
    """Admin: create a product for any shop"""
    shop = await db.shops.find_one({'id': shop_id}, {'_id': 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    product = {
        'id': str(uuid.uuid4()),
        'shop_id': shop['id'],
        'shop_name': shop.get('name', ''),
        'owner_id': shop.get('owner_id', ''),
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'price': float(data.get('price', 0)),
        'currency': data.get('currency', 'GNF'),
        'price_on_request': data.get('price_on_request', False),
        'category_id': data.get('category_id'),
        'product_type': data.get('product_type'),
        'characteristics': data.get('characteristics', {}),
        'is_negotiable': data.get('is_negotiable', False),
        'is_available': True,
        'photos': [],
        'total_views': 0,
        'total_inquiries': 0,
        'is_deleted': False,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    
    await db.products.insert_one(product)
    product.pop('_id', None)
    return product



@router.get("/admin/all-products")
async def admin_get_all_products():
    """Get all products across all shops for admin"""
    products = await db.products.find(
        {'is_deleted': {'$ne': True}}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    for p in products:
        shop = await db.shops.find_one({'id': p.get('shop_id')}, {'_id': 0, 'name': 1, 'owner_id': 1})
        if shop:
            p['shop_name'] = shop.get('name', '')
            company = await db.companies.find_one({'id': shop.get('owner_id')}, {'_id': 0, 'company_name': 1})
            p['company_name'] = company.get('company_name', '') if company else ''
    return products


@router.get("/admin/all-messages")
async def admin_get_all_messages():
    """Get all product and property messages for admin"""
    product_msgs = await db.product_messages.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    property_msgs = await db.property_messages.find({}, {'_id': 0}).sort('created_at', -1).to_list(None)
    
    # Enrich product messages with shop/company info
    for msg in product_msgs:
        msg['message_category'] = 'product'
        shop = await db.shops.find_one({'id': msg.get('shop_id')}, {'_id': 0, 'name': 1, 'owner_id': 1})
        if shop:
            msg['shop_name'] = shop.get('name', '')
            company = await db.companies.find_one({'id': shop.get('owner_id')}, {'_id': 0, 'company_name': 1})
            msg['company_name'] = company.get('company_name', '') if company else ''
    
    # Enrich property messages with company info
    for msg in property_msgs:
        msg['message_category'] = 'property'
        company = await db.companies.find_one({'id': msg.get('owner_id')}, {'_id': 0, 'company_name': 1})
        msg['company_name'] = company.get('company_name', '') if company else ''
    
    return {'product_messages': product_msgs, 'property_messages': property_msgs}


@router.get("/admin/companies/{company_id}/products")
async def admin_get_company_products(company_id: str):
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0})
    if not shop:
        return []
    products = await db.products.find(
        {'shop_id': shop['id'], 'is_deleted': {'$ne': True}}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return products


@router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, data: ProductUpdate):
    product = await db.products.find_one({'id': product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({'id': product_id}, {'$set': update_data})
    updated = await db.products.find_one({'id': product_id}, {'_id': 0})
    return updated


@router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str):
    product = await db.products.find_one({'id': product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    for photo_url in product.get('photos', []):
        delete_from_cloudinary(photo_url)
    await db.products.delete_one({'id': product_id})
    return {"message": "Produit supprimé"}


@router.delete("/admin/products/{product_id}/photos/{photo_index}")
async def admin_delete_product_photo(product_id: str, photo_index: int):
    product = await db.products.find_one({'id': product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    photos = list(product.get('photos', []))
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Index de photo invalide")
    removed_url = photos.pop(photo_index)
    delete_from_cloudinary(removed_url)
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photos}})
    return {"photos": photos}


@router.post("/admin/products/{product_id}/photos")
async def admin_upload_product_photos(product_id: str, files: List[UploadFile] = File(...)):
    """Admin: upload photos to any product"""
    import cloudinary
    import cloudinary.uploader
    
    product = await db.products.find_one({'id': product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    photo_urls = list(product.get('photos', []))
    for file in files:
        try:
            contents = await file.read()
            result = cloudinary.uploader.upload(contents, folder=f"servispro/products/{product_id}")
            photo_urls.append(result['secure_url'])
        except Exception as e:
            logger.error(f"Admin photo upload failed for product {product_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")
    
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photo_urls}})
    return {"photos": photo_urls}




# ==================== LIMITED OFFERS ====================

@router.get("/admin/limited-offers")
async def get_limited_offers():
    """Get all limited offers with product details"""
    offers = await db.limited_offers.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    
    # Enrich with product data
    for offer in offers:
        product = await db.products.find_one({'id': offer.get('product_id')}, {'_id': 0})
        if product:
            offer['product'] = product
        else:
            offer['product'] = None
    
    return offers


@router.get("/admin/limited-offers/settings")
async def get_offer_settings():
    """Get global offer expiration date"""
    settings = await db.admin_settings.find_one({'type': 'limited_offers_settings'}, {'_id': 0})
    if not settings:
        return {'expiration_date': None, 'is_active': False}
    return settings


@router.put("/admin/limited-offers/settings")
async def update_offer_settings(data: dict = Body(...)):
    """Update global offer settings (expiration date, active status)"""
    update = {
        'type': 'limited_offers_settings',
        'expiration_date': data.get('expiration_date'),
        'is_active': data.get('is_active', True),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.admin_settings.update_one(
        {'type': 'limited_offers_settings'},
        {'$set': update},
        upsert=True
    )
    return update


@router.post("/admin/limited-offers")
async def create_limited_offer(data: dict = Body(...)):
    """Add a product to limited offers"""
    product_id = data.get('product_id')
    discount_percent = data.get('discount_percent', 0)
    
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id requis")
    if discount_percent < 0 or discount_percent > 99:
        raise HTTPException(status_code=400, detail="Réduction entre 0% et 99%")
    
    # Check product exists
    product = await db.products.find_one({'id': product_id}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if already in offers
    existing = await db.limited_offers.find_one({'product_id': product_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ce produit est déjà dans les offres")
    
    offer = {
        'id': str(uuid.uuid4()),
        'product_id': product_id,
        'discount_percent': int(discount_percent),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.limited_offers.insert_one(offer)
    offer.pop('_id', None)
    offer['product'] = product
    return offer


@router.put("/admin/limited-offers/{offer_id}")
async def update_limited_offer(offer_id: str, data: dict = Body(...)):
    """Update discount percentage"""
    discount = data.get('discount_percent')
    if discount is not None and (discount < 0 or discount > 99):
        raise HTTPException(status_code=400, detail="Réduction entre 0% et 99%")
    
    update_fields = {}
    if discount is not None:
        update_fields['discount_percent'] = int(discount)
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")
    
    result = await db.limited_offers.update_one({'id': offer_id}, {'$set': update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    return {"message": "Offre mise à jour"}


@router.delete("/admin/limited-offers/{offer_id}")
async def delete_limited_offer(offer_id: str):
    """Remove a product from limited offers"""
    result = await db.limited_offers.delete_one({'id': offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    return {"message": "Offre supprimée"}
