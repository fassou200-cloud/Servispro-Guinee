"""Africa's Talking SMS helper for OTP delivery.

Send a single SMS via Africa's Talking. Returns {success, error}.
Uses the global SDK init pattern so it only initializes once per process.
"""
import logging
import os

import africastalking

logger = logging.getLogger(__name__)

_AT_USERNAME = os.environ.get('AT_USERNAME', '').strip()
_AT_API_KEY = os.environ.get('AT_API_KEY', '').strip()
_AT_SENDER_ID = os.environ.get('AT_SENDER_ID', '').strip() or None

_initialized = False
_sms = None


def _init():
    global _initialized, _sms
    if _initialized:
        return _sms is not None
    if not _AT_USERNAME or not _AT_API_KEY:
        logger.warning("Africa's Talking credentials missing — SMS sending disabled")
        _initialized = True
        return False
    africastalking.initialize(_AT_USERNAME, _AT_API_KEY)
    _sms = africastalking.SMS
    _initialized = True
    return True


def send_sms(phone_number: str, message: str) -> dict:
    """Send an SMS to a single recipient. `phone_number` must be E.164 (+224...)."""
    if not _init():
        return {"success": False, "error": "SMS provider not configured"}

    # E.164 requires a leading +. Africa's Talking is strict on this.
    to = phone_number if phone_number.startswith('+') else f"+{phone_number}"

    try:
        kwargs = {"message": message, "recipients": [to]}
        if _AT_SENDER_ID:
            kwargs["sender_id"] = _AT_SENDER_ID
        response = _sms.send(**kwargs)
        recipients = response.get('SMSMessageData', {}).get('Recipients', [])
        if not recipients:
            return {"success": False, "error": "No recipients accepted by provider", "raw": response}
        first = recipients[0]
        status = first.get('status', '').lower()
        if status == 'success' or 'success' in status:
            return {"success": True, "message_id": first.get('messageId'), "cost": first.get('cost')}
        return {"success": False, "error": first.get('status', 'Unknown error'), "raw": first}
    except Exception as e:
        logger.error(f"Africa's Talking send error: {e}")
        return {"success": False, "error": str(e)}
