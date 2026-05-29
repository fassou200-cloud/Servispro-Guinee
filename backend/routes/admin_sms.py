"""Admin SMS dashboard endpoints.

Tracks Africa's Talking SMS consumption: stats, recent logs, balance, low-balance threshold.
All endpoints are mounted under /api/admin/sms/* and follow the same (auth-less) pattern
as the rest of /admin/* routes (admin auth is enforced at the frontend/UI level via
`localStorage.adminToken`).
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Query

from database import db
from utils.sms_helper import fetch_balance

router = APIRouter()

DEFAULT_LOW_BALANCE_THRESHOLD_USD = 2.0
SETTINGS_DOC_ID = 'sms_settings'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_sms_settings() -> dict:
    doc = await db.admin_settings.find_one({'_id': SETTINGS_DOC_ID})
    if not doc:
        doc = {
            '_id': SETTINGS_DOC_ID,
            'low_balance_threshold_usd': DEFAULT_LOW_BALANCE_THRESHOLD_USD,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.admin_settings.insert_one(doc)
    return {
        'low_balance_threshold_usd': float(doc.get('low_balance_threshold_usd', DEFAULT_LOW_BALANCE_THRESHOLD_USD)),
        'updated_at': doc.get('updated_at'),
    }


def _parse_cost_to_usd(cost_str) -> float:
    """Africa's Talking returns cost as 'KES 0.8000' or 'USD 0.025'. Convert KES → USD with a fixed rate."""
    if cost_str is None:
        return 0.0
    if isinstance(cost_str, (int, float)):
        return float(cost_str)
    s = str(cost_str).strip()
    if not s:
        return 0.0
    parts = s.split()
    try:
        amt = float(parts[-1])
    except (ValueError, IndexError):
        return 0.0
    currency = parts[0].upper() if len(parts) >= 2 else 'USD'
    if currency == 'USD':
        return amt
    if currency == 'KES':
        # Approx 1 USD ≈ 129 KES (2026). Conservative — refined later if needed.
        return amt / 129.0
    return amt  # unknown currency — treat as raw


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/admin/sms/stats")
async def admin_sms_stats():
    """Aggregated SMS metrics: today / 7d / 30d / all-time + by purpose + success rate."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    async def _window_stats(since: Optional[datetime] = None) -> dict:
        match = {}
        if since:
            match = {'created_at': {'$gte': since.isoformat()}}
        pipeline = [
            {'$match': match} if match else {'$match': {}},
            {'$group': {
                '_id': None,
                'sent': {'$sum': 1},
                'success': {'$sum': {'$cond': [{'$eq': ['$success', True]}, 1, 0]}},
                'failed': {'$sum': {'$cond': [{'$eq': ['$success', False]}, 1, 0]}},
            }},
        ]
        result = await db.sms_logs.aggregate(pipeline).to_list(1)
        if not result:
            return {'sent': 0, 'success': 0, 'failed': 0}
        r = result[0]
        return {'sent': r.get('sent', 0), 'success': r.get('success', 0), 'failed': r.get('failed', 0)}

    today = await _window_stats(today_start)
    week = await _window_stats(week_start)
    month = await _window_stats(month_start)
    total = await _window_stats(None)

    # Cost (all time) — sum costs from each log entry
    cursor = db.sms_logs.find({'success': True}, {'_id': 0, 'cost': 1})
    total_cost_usd = 0.0
    async for log in cursor:
        total_cost_usd += _parse_cost_to_usd(log.get('cost'))

    # By purpose (all time)
    by_purpose = await db.sms_logs.aggregate([
        {'$group': {
            '_id': '$purpose',
            'count': {'$sum': 1},
            'success': {'$sum': {'$cond': [{'$eq': ['$success', True]}, 1, 0]}},
        }},
        {'$sort': {'count': -1}},
    ]).to_list(20)
    purposes = [{'purpose': p.get('_id') or 'other', 'count': p.get('count', 0), 'success': p.get('success', 0)} for p in by_purpose]

    return {
        'today': today,
        'week': week,
        'month': month,
        'total': total,
        'total_cost_usd': round(total_cost_usd, 4),
        'by_purpose': purposes,
        'success_rate_pct': round((total['success'] / total['sent'] * 100), 1) if total['sent'] else 0.0,
    }


# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------

@router.get("/admin/sms/logs")
async def admin_sms_logs(
    purpose: Optional[str] = None,
    success: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """Paginated list of recent SMS log entries (newest first)."""
    query: dict = {}
    if purpose:
        query['purpose'] = purpose
    if success is not None:
        query['success'] = success
    total = await db.sms_logs.count_documents(query)
    logs = await db.sms_logs.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return {'total': total, 'limit': limit, 'skip': skip, 'items': logs}


# ---------------------------------------------------------------------------
# Balance + Low-balance setting
# ---------------------------------------------------------------------------

@router.get("/admin/sms/balance")
async def admin_sms_balance():
    """Live Africa's Talking account balance + threshold + alert flag."""
    settings = await _get_sms_settings()
    bal = fetch_balance()
    balance_amount = bal.get('balance_amount')
    currency = bal.get('currency') or ''
    # Convert balance to USD for threshold check
    if balance_amount is not None:
        balance_usd = _parse_cost_to_usd(f"{currency} {balance_amount}") if currency else float(balance_amount)
    else:
        balance_usd = None
    low = (balance_usd is not None) and (balance_usd < settings['low_balance_threshold_usd'])
    return {
        'success': bal.get('success', False),
        'error': bal.get('error'),
        'balance_str': bal.get('balance_str'),
        'currency': currency,
        'balance_amount': balance_amount,
        'balance_usd': round(balance_usd, 4) if balance_usd is not None else None,
        'threshold_usd': settings['low_balance_threshold_usd'],
        'is_low': low,
    }


@router.get("/admin/sms/settings")
async def admin_get_sms_settings():
    return await _get_sms_settings()


@router.put("/admin/sms/settings")
async def admin_update_sms_settings(data: dict = Body(...)):
    update = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if 'low_balance_threshold_usd' in data:
        try:
            thr = float(data['low_balance_threshold_usd'])
            if thr < 0:
                raise ValueError
            update['low_balance_threshold_usd'] = thr
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="low_balance_threshold_usd doit être un nombre ≥ 0")
    await db.admin_settings.update_one(
        {'_id': SETTINGS_DOC_ID},
        {'$set': update},
        upsert=True,
    )
    return await _get_sms_settings()
