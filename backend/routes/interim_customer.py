"""Customer-side endpoints for the Interim module.

A customer can post missions exactly like a company can. We keep the same
collections (`interim_missions`, `mission_applications`, `interim_timesheets`,
`interim_ratings`, `interim_commissions`) but tag each mission with
`owner_type='customer'` and store the customer id in `customer_id` (we also
mirror it into `company_id` for downstream code that still queries by
`company_id` — that field then references the customer's user id for these
missions and is excluded from the normal company joins thanks to the
`owner_type` filter).

Quota : a customer can have at most 2 simultaneous active missions
(status open or closed).
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from dependencies import get_current_customer
from routes.interim import _get_interim_settings  # reuse existing settings helper

router = APIRouter()

MAX_ACTIVE_MISSIONS = 2


async def _ensure_owns_mission(mission_id: str, customer_id: str) -> dict:
    mission = await db.interim_missions.find_one({'id': mission_id, 'customer_id': customer_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


# ======================================================================
# Mission CRUD
# ======================================================================

@router.post("/interim/customer/missions")
async def create_customer_mission(data: dict = Body(...), current_customer: dict = Depends(get_current_customer)):
    # Quota check
    active = await db.interim_missions.count_documents({
        'customer_id': current_customer['id'],
        'status': {'$in': ['open', 'closed']},
    })
    if active >= MAX_ACTIVE_MISSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Vous avez déjà {active} missions actives. Limite : {MAX_ACTIVE_MISSIONS} simultanées. Terminez ou annulez une mission en cours avant d'en publier une nouvelle.",
        )

    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    job_type = (data.get('job_type') or '').strip()
    if not title or not job_type or not description:
        raise HTTPException(status_code=400, detail="Titre, description et métier sont obligatoires")
    daily_rate = float(data.get('daily_rate') or 0)
    if daily_rate <= 0 and not data.get('rate_negotiable'):
        raise HTTPException(status_code=400, detail="Indiquez un taux journalier ou cochez 'à négocier'")

    customer_name = f"{current_customer.get('first_name','')} {current_customer.get('last_name','')}".strip() or 'Particulier'

    mission = {
        'id': str(uuid.uuid4()),
        'owner_type': 'customer',
        'owner_id': current_customer['id'],
        'owner_name': customer_name,
        # IMPORTANT: company_id mirrors customer_id so downstream code keeps working.
        'company_id': current_customer['id'],
        'company_name': customer_name,
        'customer_id': current_customer['id'],
        'title': title,
        'description': description,
        'job_type': job_type,
        'location_city': (data.get('location_city') or '').strip(),
        'location_region': (data.get('location_region') or '').strip(),
        'location_commune': (data.get('location_commune') or '').strip(),
        'location_quartier': (data.get('location_quartier') or '').strip(),
        'start_date': (data.get('start_date') or '').strip() or None,
        'end_date': (data.get('end_date') or '').strip() or None,
        'daily_rate': daily_rate,
        'rate_negotiable': bool(data.get('rate_negotiable')),
        'num_providers_needed': max(1, int(data.get('num_providers_needed') or 1)),
        'documents_required': data.get('documents_required') or [],
        'status': 'open',
        'applications_count': 0,
        'accepted_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.interim_missions.insert_one(mission)
    mission.pop('_id', None)
    return mission


@router.get("/interim/customer/missions/mine")
async def my_customer_missions(current_customer: dict = Depends(get_current_customer)):
    missions = await db.interim_missions.find(
        {'customer_id': current_customer['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return missions


@router.put("/interim/customer/missions/{mission_id}")
async def update_customer_mission(mission_id: str, data: dict = Body(...), current_customer: dict = Depends(get_current_customer)):
    mission = await _ensure_owns_mission(mission_id, current_customer['id'])
    if mission.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Mission terminée — non modifiable")
    allowed = {'title', 'description', 'job_type', 'location_city', 'location_region',
               'location_commune', 'location_quartier', 'start_date', 'end_date',
               'daily_rate', 'rate_negotiable', 'num_providers_needed',
               'documents_required', 'status'}
    update = {k: v for k, v in data.items() if k in allowed}
    update['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.interim_missions.update_one({'id': mission_id}, {'$set': update})
    return await db.interim_missions.find_one({'id': mission_id}, {'_id': 0})


@router.delete("/interim/customer/missions/{mission_id}")
async def delete_customer_mission(mission_id: str, current_customer: dict = Depends(get_current_customer)):
    mission = await _ensure_owns_mission(mission_id, current_customer['id'])
    if mission.get('accepted_count', 0) > 0:
        raise HTTPException(status_code=400, detail="Impossible de supprimer : prestataire(s) déjà accepté(s)")
    await db.interim_missions.delete_one({'id': mission_id})
    await db.mission_applications.delete_many({'mission_id': mission_id})
    return {'deleted': True}


# ======================================================================
# Applications management
# ======================================================================

@router.get("/interim/customer/missions/{mission_id}/applications")
async def list_customer_mission_applications(mission_id: str, current_customer: dict = Depends(get_current_customer)):
    await _ensure_owns_mission(mission_id, current_customer['id'])
    apps = await db.mission_applications.find({'mission_id': mission_id}, {'_id': 0}).sort('created_at', -1).to_list(None)
    return apps


@router.post("/interim/customer/applications/{application_id}/accept")
async def accept_customer_application(application_id: str, current_customer: dict = Depends(get_current_customer)):
    app_doc = await db.mission_applications.find_one({'id': application_id})
    if not app_doc or app_doc.get('company_id') != current_customer['id']:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if app_doc['status'] != 'pending':
        raise HTTPException(status_code=400, detail=f"Candidature déjà {app_doc['status']}")

    mission = await db.interim_missions.find_one({'id': app_doc['mission_id']})
    if mission.get('accepted_count', 0) >= mission.get('num_providers_needed', 1):
        raise HTTPException(status_code=400, detail="Tous les postes sont déjà pourvus")

    await db.mission_applications.update_one(
        {'id': application_id},
        {'$set': {
            'status': 'accepted',
            'accepted_at': datetime.now(timezone.utc).isoformat(),
            'phone_locked': False,
        }}
    )
    new_accepted = mission.get('accepted_count', 0) + 1
    update = {'accepted_count': new_accepted, 'updated_at': datetime.now(timezone.utc).isoformat()}
    if new_accepted >= mission.get('num_providers_needed', 1):
        update['status'] = 'closed'
    await db.interim_missions.update_one({'id': app_doc['mission_id']}, {'$set': update})
    return {'ok': True}


@router.post("/interim/customer/applications/{application_id}/reject")
async def reject_customer_application(application_id: str, data: dict = Body(default={}), current_customer: dict = Depends(get_current_customer)):
    app_doc = await db.mission_applications.find_one({'id': application_id})
    if not app_doc or app_doc.get('company_id') != current_customer['id']:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if app_doc['status'] != 'pending':
        raise HTTPException(status_code=400, detail=f"Candidature déjà {app_doc['status']}")
    reason = (data.get('reason') or '').strip()[:500]
    await db.mission_applications.update_one(
        {'id': application_id},
        {'$set': {
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat(),
            'rejection_reason': reason,
        }}
    )
    return {'ok': True}


@router.post("/interim/customer/missions/{mission_id}/complete")
async def complete_customer_mission(mission_id: str, data: dict = Body(default={}), current_customer: dict = Depends(get_current_customer)):
    mission = await _ensure_owns_mission(mission_id, current_customer['id'])
    if mission.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Mission déjà terminée")

    accepted_apps = await db.mission_applications.find({'mission_id': mission_id, 'status': 'accepted'}, {'_id': 0}).to_list(None)
    settings = await _get_interim_settings()
    commission_pct = float(settings.get('commission_percent', 10))
    now_iso = datetime.now(timezone.utc).isoformat()

    for a in accepted_apps:
        days_worked = float(data.get('days_worked_by_provider', {}).get(a['provider_id'], 1))
        daily_rate = float(mission.get('daily_rate') or 0)
        gross = days_worked * daily_rate
        commission_amount = gross * (commission_pct / 100.0)
        existing = await db.interim_commissions.find_one({
            'mission_id': mission_id, 'provider_id': a['provider_id']
        })
        if existing:
            continue
        await db.interim_commissions.insert_one({
            'id': str(uuid.uuid4()),
            'mission_id': mission_id,
            'company_id': current_customer['id'],
            'owner_type': 'customer',
            'provider_id': a['provider_id'],
            'days_worked': days_worked,
            'daily_rate': daily_rate,
            'gross': gross,
            'commission_percent': commission_pct,
            'amount': round(commission_amount, 2),
            'status': 'pending',
            'created_at': now_iso,
        })

    # Auto-reject pending applications
    await db.mission_applications.update_many(
        {'mission_id': mission_id, 'status': 'pending'},
        {'$set': {
            'status': 'rejected',
            'rejected_at': now_iso,
            'rejection_reason': 'Mission terminée',
            'auto_rejected': True,
        }}
    )

    await db.interim_missions.update_one(
        {'id': mission_id},
        {'$set': {'status': 'completed', 'completed_at': now_iso, 'updated_at': now_iso}}
    )
    return {'ok': True, 'commissions_created': len(accepted_apps)}


# ======================================================================
# Timesheets validation/rejection
# ======================================================================

@router.get("/interim/customer/timesheets")
async def customer_timesheets(current_customer: dict = Depends(get_current_customer), status: Optional[str] = None):
    query = {'company_id': current_customer['id']}
    if status:
        query['status'] = status
    return await db.interim_timesheets.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)


@router.post("/interim/customer/timesheets/{ts_id}/validate")
async def validate_customer_timesheet(ts_id: str, current_customer: dict = Depends(get_current_customer)):
    ts = await db.interim_timesheets.find_one({'id': ts_id})
    if not ts or ts['company_id'] != current_customer['id']:
        raise HTTPException(status_code=404, detail="Pointage introuvable")
    if ts['status'] == 'validated':
        raise HTTPException(status_code=400, detail="Déjà validé")
    await db.interim_timesheets.update_one(
        {'id': ts_id},
        {'$set': {'status': 'validated', 'validated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'ok': True}


@router.post("/interim/customer/timesheets/{ts_id}/reject")
async def reject_customer_timesheet(ts_id: str, data: dict = Body(default={}), current_customer: dict = Depends(get_current_customer)):
    ts = await db.interim_timesheets.find_one({'id': ts_id})
    if not ts or ts['company_id'] != current_customer['id']:
        raise HTTPException(status_code=404, detail="Pointage introuvable")
    if ts['status'] != 'submitted':
        raise HTTPException(status_code=400, detail=f"Pointage déjà {ts['status']}")
    reason = (data.get('reason') or '').strip()[:500]
    if not reason or len(reason) < 5:
        raise HTTPException(status_code=400, detail="Un motif de rejet d'au moins 5 caractères est obligatoire")
    await db.interim_timesheets.update_one(
        {'id': ts_id},
        {'$set': {
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat(),
            'rejection_reason': reason,
        }}
    )
    return {'ok': True}


# ======================================================================
# Rating
# ======================================================================

@router.post("/interim/customer/missions/{mission_id}/rate-provider")
async def customer_rate_provider(mission_id: str, data: dict = Body(...), current_customer: dict = Depends(get_current_customer)):
    mission = await _ensure_owns_mission(mission_id, current_customer['id'])
    if mission.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Notation possible uniquement après la fin de la mission")

    provider_id = data.get('provider_id')
    stars = int(data.get('stars') or 0)
    comment = (data.get('comment') or '').strip()[:1000]
    if stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="Note entre 1 et 5 étoiles")
    accepted_app = await db.mission_applications.find_one({'mission_id': mission_id, 'provider_id': provider_id, 'status': 'accepted'})
    if not accepted_app:
        raise HTTPException(status_code=400, detail="Ce prestataire n'a pas travaillé sur cette mission")

    customer_name = f"{current_customer.get('first_name','')} {current_customer.get('last_name','')}".strip() or 'Particulier'
    existing = await db.interim_ratings.find_one({
        'mission_id': mission_id, 'company_id': current_customer['id'], 'provider_id': provider_id,
        'direction': 'company_to_provider',
    })
    payload = {
        'mission_id': mission_id,
        'mission_title': mission.get('title', ''),
        'company_id': current_customer['id'],
        'company_name': customer_name,
        'provider_id': provider_id,
        'direction': 'company_to_provider',
        'stars': stars,
        'comment': comment,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        await db.interim_ratings.update_one({'id': existing['id']}, {'$set': payload})
        return {'ok': True, 'updated': True}
    payload['id'] = str(uuid.uuid4())
    payload['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.interim_ratings.insert_one(payload)
    return {'ok': True, 'created': True}
