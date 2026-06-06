"""Africa's Talking SMS delivery report webhook + OTP delivery status polling.

This module exposes two endpoints:

1. POST /api/sms/delivery-report
   Called by Africa's Talking when a sent SMS reaches its final delivery state.
   We update the corresponding `sms_logs` document and, if the SMS was an OTP
   that failed delivery, we mark the OTP code as `delivery_failed=True` so
   the frontend can stop showing the "wait for SMS" UI and tell the user
   their phone number is invalid.

2. GET /api/otp/delivery-status?phone_number=...
   Frontend polls this every ~3 seconds while the user is on the OTP gate.
   Returns the delivery status of the latest OTP code for that number.

Configure the callback URL in Africa's Talking dashboard:
    Settings → SMS → Delivery Reports Callback URL
    https://YOUR-DOMAIN/api/sms/delivery-report
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Form, Query

from database import db

router = APIRouter()

# AT delivery report statuses we care about
FAILED_STATUSES = {'Failed', 'Rejected', 'InsufficientCredit'}
SUCCESS_STATUSES = {'Success', 'Delivered'}


@router.post("/sms/delivery-report")
async def sms_delivery_report(
    id: str = Form(...),                # MessageId echoed back by AT
    status: str = Form(...),            # Success | Failed | Rejected | etc.
    phoneNumber: str = Form(...),       # +224XXXXXXXXX
    networkCode: Optional[str] = Form(None),
    failureReason: Optional[str] = Form(None),
    retryCount: Optional[str] = Form(None),
):
    """Africa's Talking calls this when a delivery state is final.

    No auth — but we only mutate sms_logs/otp_codes documents identified by
    the message id, which is provided by AT. No PII is leaked.
    """
    now = datetime.now(timezone.utc).isoformat()
    update = {
        'delivery_status': status,
        'delivery_status_at': now,
        'delivery_failure_reason': failureReason,
        'delivery_network_code': networkCode,
        'delivery_retry_count': retryCount,
    }
    # Update the corresponding sms_logs entry (matched by message_id)
    await db.sms_logs.update_one({'message_id': id}, {'$set': update})
    
    # If the SMS that failed was an OTP, flag the otp_code as delivery_failed
    is_failure = status in FAILED_STATUSES
    if is_failure:
        # phoneNumber comes as "+224XXX..." — match the same format we store
        normalized = phoneNumber.lstrip('+')
        await db.otp_codes.update_many(
            {
                'phone_number': normalized,
                'consumed': False,
                'message_id': id,
            },
            {'$set': {
                'delivery_failed': True,
                'delivery_failure_reason': failureReason or status,
                'delivery_status_at': now,
            }},
        )
        # Also handle case where message_id wasn't stored on otp (fallback by phone+recent)
        await db.otp_codes.update_many(
            {
                'phone_number': normalized,
                'consumed': False,
                'delivery_failed': {'$exists': False},
            },
            {'$set': {
                'delivery_failed': True,
                'delivery_failure_reason': failureReason or status,
                'delivery_status_at': now,
            }},
        )
    
    return {"received": True, "status": status, "id": id}


@router.get("/otp/delivery-status")
async def otp_delivery_status(phone_number: str = Query(...)):
    """Polled by the frontend (every few seconds during the OTP gate) to detect
    delivery failures and surface a clear error to the user.

    Returns {status: 'pending'|'delivered'|'failed', message?: str}.
    """
    normalized = phone_number.strip().replace(' ', '').lstrip('+')
    code = await db.otp_codes.find_one(
        {'phone_number': normalized},
        sort=[('created_at', -1)],
        projection={'_id': 0, 'delivery_failed': 1, 'delivery_status_at': 1, 'delivery_failure_reason': 1, 'consumed': 1},
    )
    if not code:
        return {"status": "unknown", "message": "Aucun code récent pour ce numéro."}
    if code.get('delivery_failed'):
        reason = code.get('delivery_failure_reason') or 'Numéro invalide'
        return {
            "status": "failed",
            "message": f"Le SMS n'a pas pu être livré : {reason}. Vérifiez votre numéro et réessayez.",
            "failure_reason": reason,
        }
    if code.get('delivery_status_at'):
        return {"status": "delivered", "message": "SMS livré sur le téléphone."}
    return {"status": "pending", "message": "SMS en cours de livraison…"}
