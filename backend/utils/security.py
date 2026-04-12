import logging
import re
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Dict

from fastapi import Request

from database import db
from config import RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_BLOCK_DURATION

logger = logging.getLogger(__name__)

# In-memory storage for rate limiting
login_attempts: Dict[str, list] = defaultdict(list)
blocked_ips: Dict[str, datetime] = {}

# Audit log collection
audit_logs_collection = db.audit_logs


async def log_audit_event(
    event_type: str,
    user_id: str = None,
    user_type: str = None,
    ip_address: str = None,
    details: dict = None,
    success: bool = True
):
    """Log security-relevant events to the database"""
    try:
        audit_entry = {
            "event_type": event_type,
            "user_id": user_id,
            "user_type": user_type,
            "ip_address": ip_address,
            "details": details or {},
            "success": success,
            "timestamp": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await audit_logs_collection.insert_one(audit_entry)
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, considering proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_ip_blocked(ip: str) -> bool:
    """Check if an IP is currently blocked"""
    if ip in blocked_ips:
        if datetime.now(timezone.utc) < blocked_ips[ip]:
            return True
        else:
            del blocked_ips[ip]
    return False


def record_failed_attempt(ip: str):
    """Record a failed login attempt"""
    now = datetime.now(timezone.utc)
    # Clean old attempts
    login_attempts[ip] = [
        attempt for attempt in login_attempts[ip]
        if (now - attempt).total_seconds() < RATE_LIMIT_WINDOW
    ]
    login_attempts[ip].append(now)
    
    # Block IP if too many attempts
    if len(login_attempts[ip]) >= RATE_LIMIT_MAX_ATTEMPTS:
        blocked_ips[ip] = now + timedelta(seconds=RATE_LIMIT_BLOCK_DURATION)
        login_attempts[ip] = []
        return True
    return False


def clear_failed_attempts(ip: str):
    """Clear failed attempts on successful login"""
    if ip in login_attempts:
        del login_attempts[ip]


def filter_contact_info(message: str) -> tuple[str, bool]:
    """
    Filter out phone numbers and email addresses from messages.
    Returns tuple of (filtered_message, was_filtered)
    """
    original = message
    
    # Phone number patterns (international and local formats)
    phone_patterns = [
        r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3,4}\b',
        r'\b\d{9,12}\b',
        r'\b(?:224|00224)\s*\d{9}\b',
        r'\b6[0-9]{8}\b',
    ]
    
    # Email pattern
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    
    # Replace phone numbers
    for pattern in phone_patterns:
        message = re.sub(pattern, '[Phone masque - Politique de confidentialite]', message, flags=re.IGNORECASE)
    
    # Replace emails
    message = re.sub(email_pattern, '[Email masque - Politique de confidentialite]', message, flags=re.IGNORECASE)
    
    was_filtered = message != original
    return message, was_filtered
