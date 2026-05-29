"""OTP (One-Time Password) helper for phone number verification.

Generates a 6-digit code, stores it in MongoDB with a 10-min expiry, and
verifies it. Includes basic rate-limiting (max 5 wrong attempts, max 3 resends/hour).
"""
import logging
import random
from datetime import datetime, timedelta, timezone

from database import db
from utils.sms_helper import send_sms

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_VALIDITY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_LIMIT_PER_HOUR = 3


def generate_code() -> str:
    return ''.join(random.choices('0123456789', k=OTP_LENGTH))


def normalize_phone(raw: str) -> str:
    """Normalize a Guinea phone number to '224XXXXXXXXX' format (no leading +)."""
    phone = (raw or '').strip().replace(" ", "").replace("-", "").replace(".", "").replace("+", "")
    if phone.startswith('00224'):
        phone = phone[2:]
    if phone.startswith('224') and len(phone) > 9:
        return phone
    return '224' + phone


async def send_otp(phone_number: str, purpose: str = 'verification') -> dict:
    """Generate, save and send a fresh OTP via SMS to `phone_number`.

    Returns {success, message, retry_after?}.
    """
    phone = normalize_phone(phone_number)
    now = datetime.now(timezone.utc)

    # Rate limit: max N resends per hour
    hour_ago = now - timedelta(hours=1)
    recent_count = await db.otp_codes.count_documents({
        'phone_number': phone,
        'purpose': purpose,
        'created_at': {'$gte': hour_ago.isoformat()},
    })
    if recent_count >= OTP_RESEND_LIMIT_PER_HOUR:
        return {
            "success": False,
            "error": "RATE_LIMITED",
            "message": "Trop de demandes de code. Réessayez dans 1 heure.",
        }

    # Invalidate previous active codes for this phone/purpose
    await db.otp_codes.update_many(
        {'phone_number': phone, 'purpose': purpose, 'consumed': False},
        {'$set': {'consumed': True, 'invalidated_at': now.isoformat()}},
    )

    code = generate_code()
    expires_at = now + timedelta(minutes=OTP_VALIDITY_MINUTES)

    await db.otp_codes.insert_one({
        'phone_number': phone,
        'code': code,
        'purpose': purpose,
        'attempts': 0,
        'consumed': False,
        'created_at': now.isoformat(),
        'expires_at': expires_at.isoformat(),
    })

    message = f"ServisPro : votre code de vérification est {code}. Valable {OTP_VALIDITY_MINUTES} minutes. Ne le partagez avec personne."
    result = send_sms(f"+{phone}", message, purpose='otp')
    if not result.get('success'):
        logger.warning(f"SMS send failed for {phone}: {result.get('error')}")
        return {
            "success": False,
            "error": "SMS_SEND_FAILED",
            "message": f"Échec de l'envoi du SMS : {result.get('error', 'erreur inconnue')}",
        }

    return {
        "success": True,
        "message": f"Code envoyé au +{phone}. Valable {OTP_VALIDITY_MINUTES} minutes.",
        "expires_in_minutes": OTP_VALIDITY_MINUTES,
    }


async def verify_otp(phone_number: str, code: str, purpose: str = 'verification') -> dict:
    """Check the code. On success, marks the OTP as consumed. Returns {success, error?}."""
    phone = normalize_phone(phone_number)
    code = (code or '').strip()
    if len(code) != OTP_LENGTH or not code.isdigit():
        return {"success": False, "error": "INVALID_FORMAT", "message": "Le code doit contenir 6 chiffres."}

    now = datetime.now(timezone.utc)

    record = await db.otp_codes.find_one(
        {'phone_number': phone, 'purpose': purpose, 'consumed': False},
        sort=[('created_at', -1)],
    )
    if not record:
        return {"success": False, "error": "NO_ACTIVE_CODE", "message": "Aucun code actif. Demandez un nouveau code."}

    if record.get('expires_at') and now.isoformat() > record['expires_at']:
        return {"success": False, "error": "EXPIRED", "message": "Code expiré. Demandez un nouveau code."}

    if record.get('attempts', 0) >= OTP_MAX_ATTEMPTS:
        await db.otp_codes.update_one({'_id': record['_id']}, {'$set': {'consumed': True}})
        return {"success": False, "error": "TOO_MANY_ATTEMPTS", "message": "Trop de tentatives échouées. Demandez un nouveau code."}

    if code != record['code']:
        await db.otp_codes.update_one({'_id': record['_id']}, {'$inc': {'attempts': 1}})
        remaining = OTP_MAX_ATTEMPTS - record.get('attempts', 0) - 1
        return {"success": False, "error": "WRONG_CODE", "message": f"Code incorrect. {remaining} tentative(s) restante(s)."}

    # Success — consume the code
    await db.otp_codes.update_one(
        {'_id': record['_id']},
        {'$set': {'consumed': True, 'verified_at': now.isoformat()}},
    )
    return {"success": True, "message": "Numéro vérifié avec succès."}


async def mark_user_phone_verified(phone_number: str) -> dict:
    """After OTP success, flip `phone_verified=True` on the matching user in any of the 3 collections."""
    phone = normalize_phone(phone_number)
    variants = [phone, phone[3:] if phone.startswith('224') else phone, f"+{phone}"]
    updated = {"providers": 0, "customers": 0, "companies": 0}
    for col_name, key in (('service_providers', 'providers'), ('customers', 'customers'), ('companies', 'companies')):
        r = await db[col_name].update_many(
            {'phone_number': {'$in': variants}},
            {'$set': {'phone_verified': True, 'phone_verified_at': datetime.now(timezone.utc).isoformat()}},
        )
        updated[key] = r.modified_count
    return updated
