"""OTP (One-Time Password) helper for phone number verification.

Generates a 6-digit code, stores it in MongoDB with a 10-min expiry, and
verifies it. Includes basic rate-limiting (max 5 wrong attempts, max 3 resends/hour).

When SMS_ENABLED=false (kill-switch), send_otp/verify_otp short-circuit:
they return success without involving Africa's Talking, so registration and
anonymous contact flows remain usable while the AT top-up is pending.
"""
import logging
import random
import re
from datetime import datetime, timedelta, timezone

from database import db
from utils.sms_helper import send_sms, is_sms_enabled

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_VALIDITY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_LIMIT_PER_HOUR = 3

# Guinea mobile numbers: +224 6XX XX XX XX (9 digits after country code, starting with 6)
GUINEA_PHONE_RE = re.compile(r'^224[6-7]\d{8}$')

# Map Africa's Talking error strings to user-friendly French messages
AT_ERROR_MESSAGES = {
    'InvalidPhoneNumber': "Numéro de téléphone inexistant ou invalide.",
    'UserInBlacklist': "Ce numéro est bloqué par l'opérateur.",
    'UserNotInDeliveryGroup': "Ce numéro n'est pas joignable.",
    'UserNotSubscribedToShortcode': "Ce numéro ne peut pas recevoir de SMS de ce service.",
    'InsufficientBalance': "Service SMS temporairement indisponible. Réessayez plus tard.",
    'InvalidSenderId': "Configuration SMS invalide.",
    'InvalidMessage': "Format de message invalide.",
    'InvalidServiceProvider': "Opérateur non supporté.",
    'CouldNotRoute': "Numéro de téléphone inexistant ou non joignable.",
    'NoSenderId': "Configuration SMS manquante.",
}


def _humanize_sms_error(raw_error: str | None) -> str:
    """Convert raw provider error to a user-friendly French message."""
    if not raw_error:
        return "Échec de l'envoi du SMS. Vérifiez votre numéro et réessayez."
    for code, msg in AT_ERROR_MESSAGES.items():
        if code.lower() in raw_error.lower():
            return msg
    return f"Échec de l'envoi du SMS : {raw_error}"


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


def is_valid_guinea_phone(normalized: str) -> bool:
    """Check that a normalized phone matches the Guinean mobile format."""
    return bool(GUINEA_PHONE_RE.match(normalized))


async def send_otp(phone_number: str, purpose: str = 'verification') -> dict:
    """Generate, save and send a fresh OTP via SMS to `phone_number`.

    Returns {success, message, retry_after?}.

    When SMS is globally disabled, returns a success result that tells the
    caller to skip the verification step.
    """
    phone = normalize_phone(phone_number)

    if not is_sms_enabled():
        # Auto-verify the user in any of the 3 collections (idempotent)
        await mark_user_phone_verified(phone)
        return {
            "success": True,
            "auto_verified": True,
            "message": "Vérification SMS temporairement désactivée. Votre numéro est validé automatiquement.",
        }

    # Validate Guinean phone format upfront to avoid paying for impossible deliveries
    if not is_valid_guinea_phone(phone):
        return {
            "success": False,
            "error": "INVALID_PHONE",
            "message": "Numéro de téléphone inexistant. Saisissez un numéro guinéen valide au format +224 6XX XX XX XX.",
        }

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
        raw_err = (result.get('error') or '').strip()
        # Surface a clean "phone does not exist" message for the most common AT failures
        user_msg = _humanize_sms_error(raw_err)
        error_code = "INVALID_PHONE" if (
            'invalidphonenumber' in raw_err.lower()
            or 'couldnotroute' in raw_err.lower()
            or 'usernotindeliverygroup' in raw_err.lower()
        ) else "SMS_SEND_FAILED"
        return {
            "success": False,
            "error": error_code,
            "message": user_msg,
        }
    
    # Stash the provider message_id on the OTP doc so the delivery-report
    # webhook can correlate the eventual Failed/Success status with this code.
    if result.get('message_id'):
        await db.otp_codes.update_one(
            {'phone_number': phone, 'code': code, 'consumed': False},
            {'$set': {'message_id': result['message_id']}},
        )

    return {
        "success": True,
        "message": f"Code envoyé au +{phone}. Valable {OTP_VALIDITY_MINUTES} minutes.",
        "expires_in_minutes": OTP_VALIDITY_MINUTES,
    }


async def verify_otp(phone_number: str, code: str, purpose: str = 'verification') -> dict:
    """Check the code. On success, marks the OTP as consumed. Returns {success, error?}.

    When SMS is globally disabled, any non-empty code is accepted (the user
    is auto-verified at send time).
    """
    phone = normalize_phone(phone_number)
    code = (code or '').strip()

    if not is_sms_enabled():
        await mark_user_phone_verified(phone)
        return {"success": True, "auto_verified": True, "message": "Vérification SMS désactivée — validation automatique."}

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
