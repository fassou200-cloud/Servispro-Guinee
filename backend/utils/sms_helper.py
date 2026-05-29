"""Africa's Talking SMS helper for OTP delivery.

Send a single SMS via Africa's Talking. Returns {success, error}.
Uses the global SDK init pattern so it only initializes once per process.
Every send attempt is logged to the `sms_logs` collection for admin tracking.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone

import africastalking

logger = logging.getLogger(__name__)

_AT_USERNAME = os.environ.get('AT_USERNAME', '').strip()
_AT_API_KEY = os.environ.get('AT_API_KEY', '').strip()
_AT_SENDER_ID = os.environ.get('AT_SENDER_ID', '').strip() or None

_initialized = False
_sms = None
_application = None


def _init():
    global _initialized, _sms, _application
    if _initialized:
        return _sms is not None
    if not _AT_USERNAME or not _AT_API_KEY:
        logger.warning("Africa's Talking credentials missing — SMS sending disabled")
        _initialized = True
        return False
    africastalking.initialize(_AT_USERNAME, _AT_API_KEY)
    _sms = africastalking.SMS
    _application = africastalking.Application
    _initialized = True
    return True


def _mask_phone(phone: str) -> str:
    """Mask phone number for storage/display, keeping +224 prefix and last 2 digits."""
    if not phone:
        return ''
    p = phone if phone.startswith('+') else f"+{phone}"
    if len(p) < 6:
        return p
    return p[:5] + ' ' + 'X' * (len(p) - 7) + ' ' + p[-2:]


async def _log_sms_attempt(phone: str, message: str, purpose: str, result: dict) -> None:
    """Persist one SMS attempt to sms_logs collection."""
    try:
        from database import db
        await db.sms_logs.insert_one({
            'id': str(uuid.uuid4()),
            'phone_number_masked': _mask_phone(phone),
            'message_preview': (message or '')[:80],
            'message_length': len(message or ''),
            'purpose': purpose,
            'provider': 'africas_talking',
            'sender_id': _AT_SENDER_ID or 'default',
            'success': bool(result.get('success')),
            'message_id': result.get('message_id'),
            'cost': result.get('cost'),
            'error': result.get('error'),
            'status_raw': (result.get('raw') or {}).get('status') if isinstance(result.get('raw'), dict) else None,
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"sms_logs insert failed: {e}")


def send_sms(phone_number: str, message: str, purpose: str = 'other') -> dict:
    """Send an SMS to a single recipient. `phone_number` must be E.164 (+224...).

    `purpose` is logged for analytics: 'otp', 'alert', 'notification', 'other'.
    """
    if not _init():
        result = {"success": False, "error": "SMS provider not configured"}
        _schedule_log(phone_number, message, purpose, result)
        return result

    to = phone_number if phone_number.startswith('+') else f"+{phone_number}"

    try:
        kwargs = {"message": message, "recipients": [to]}
        if _AT_SENDER_ID:
            kwargs["sender_id"] = _AT_SENDER_ID
        response = _sms.send(**kwargs)
        recipients = response.get('SMSMessageData', {}).get('Recipients', [])
        if not recipients:
            result = {"success": False, "error": "No recipients accepted by provider", "raw": response}
            _schedule_log(phone_number, message, purpose, result)
            return result
        first = recipients[0]
        status = first.get('status', '').lower()
        if status == 'success' or 'success' in status:
            result = {"success": True, "message_id": first.get('messageId'), "cost": first.get('cost')}
        else:
            result = {"success": False, "error": first.get('status', 'Unknown error'), "raw": first}
    except Exception as e:
        logger.error(f"Africa's Talking send error: {e}")
        result = {"success": False, "error": str(e)}

    _schedule_log(phone_number, message, purpose, result)
    return result


def _schedule_log(phone: str, message: str, purpose: str, result: dict) -> None:
    """Best-effort fire-and-forget log into MongoDB."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(_log_sms_attempt(phone, message, purpose, result))
        else:
            loop.run_until_complete(_log_sms_attempt(phone, message, purpose, result))
    except RuntimeError:
        # No running loop — try a one-shot run
        try:
            asyncio.run(_log_sms_attempt(phone, message, purpose, result))
        except Exception as e:
            logger.warning(f"Could not log SMS attempt: {e}")
    except Exception as e:
        logger.warning(f"Could not schedule SMS log: {e}")


def fetch_balance() -> dict:
    """Fetch the current Africa's Talking account balance.
    Returns {success, balance_str, currency, balance_amount} or {success: False, error}.
    """
    if not _init():
        return {"success": False, "error": "SMS provider not configured"}
    try:
        data = _application.fetch_application_data()
        # Africa's Talking SDK returns {'UserData': {'balance': 'KES 1234.5678'}}
        ud = data.get('UserData', {}) if isinstance(data, dict) else {}
        bal_str = ud.get('balance') or ''
        currency = ''
        amount = None
        parts = bal_str.split()
        if len(parts) == 2:
            currency, amt = parts
            try:
                amount = float(amt)
            except (TypeError, ValueError):
                amount = None
        return {
            "success": True,
            "balance_str": bal_str,
            "currency": currency,
            "balance_amount": amount,
        }
    except Exception as e:
        logger.error(f"AT balance fetch error: {e}")
        return {"success": False, "error": str(e)}
