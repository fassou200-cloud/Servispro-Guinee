"""
Interim/Temp-staffing module for ServisPro.

Workflow:
1. Company publishes a mission (POST /interim/missions).
2. Providers (interim-enabled, not suspended) browse and apply.
3. Company sees applications, accepts one (or several) provider(s).
4. Once accepted, the company contacts the provider directly to start the mission.
5. Company marks the mission as completed → a commission record is generated for
   the provider to pay ServisPro (configurable %).
6. Provider submits proof of transfer (operator + reference number).
7. Admin validates or rejects the commission.
8. If a provider has any unpaid commission older than the platform tolerance, the
   provider is auto-suspended from applying to new missions until cleared.
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_company

logger = logging.getLogger(__name__)
router = APIRouter()


# ======================================================================
# Helpers
# ======================================================================

async def _get_interim_settings():
    """Returns the current interim settings (commission_percent + payment_methods).
    Lazy-creates with sane defaults the first time it is called.
    """
    s = await db.admin_settings.find_one({'type': 'interim_settings'}, {'_id': 0})
    if s:
        return s
    default = {
        'type': 'interim_settings',
        'commission_percent': 10.0,           # 10 % par défaut
        'payment_methods': [],                # liste de comptes ServisPro
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_settings.insert_one(default)
    default.pop('_id', None)
    return default


async def _provider_has_unpaid_commission(provider_id: str) -> bool:
    """A provider with any commission whose status is NOT 'validated' (and not
    'rejected' for the same period) is considered to have unpaid dues."""
    count = await db.interim_commissions.count_documents({
        'provider_id': provider_id,
        'status': {'$in': ['pending', 'submitted', 'rejected']},
    })
    return count > 0


# ======================================================================
# Mission CRUD (Company side)
# ======================================================================

@router.post("/interim/missions")
async def create_mission(data: dict = Body(...), current_company: dict = Depends(get_current_company)):
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    job_type = (data.get('job_type') or '').strip()           # ex: "Électricien"
    location_city = (data.get('location_city') or '').strip()
    location_region = (data.get('location_region') or '').strip()
    location_commune = (data.get('location_commune') or '').strip()
    location_quartier = (data.get('location_quartier') or '').strip()
    start_date = (data.get('start_date') or '').strip()        # ISO
    end_date = (data.get('end_date') or '').strip()            # ISO (optional)
    daily_rate = float(data.get('daily_rate') or 0)
    num_providers_needed = int(data.get('num_providers_needed') or 1)
    documents_required = data.get('documents_required') or []

    if not title or not job_type or not description:
        raise HTTPException(status_code=400, detail="Titre, description et métier sont obligatoires")
    if daily_rate <= 0 and not data.get('rate_negotiable'):
        raise HTTPException(status_code=400, detail="Indiquez un taux journalier ou cochez 'à négocier'")

    mission = {
        'id': str(uuid.uuid4()),
        'owner_type': 'company',
        'owner_id': current_company['id'],
        'owner_name': current_company.get('company_name') or current_company.get('name', ''),
        'company_id': current_company['id'],
        'company_name': current_company.get('company_name') or current_company.get('name', ''),
        'customer_id': None,
        'title': title,
        'description': description,
        'job_type': job_type,
        'location_city': location_city,
        'location_region': location_region,
        'location_commune': location_commune,
        'location_quartier': location_quartier,
        'start_date': start_date or None,
        'end_date': end_date or None,
        'daily_rate': daily_rate,
        'rate_negotiable': bool(data.get('rate_negotiable')),
        'num_providers_needed': max(1, num_providers_needed),
        'documents_required': documents_required,
        'status': 'open',          # open | closed | completed | cancelled
        'applications_count': 0,
        'accepted_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.interim_missions.insert_one(mission)
    mission.pop('_id', None)
    return mission


@router.get("/interim/missions/mine")
async def my_company_missions(current_company: dict = Depends(get_current_company)):
    missions = await db.interim_missions.find(
        {'company_id': current_company['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return missions


@router.get("/interim/missions")
async def list_open_missions(
    job_type: Optional[str] = None,
    city: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Public list of open missions — accessible to logged-in providers.
    Excludes missions the current provider has declined."""
    query = {'status': 'open'}
    if job_type:
        query['job_type'] = job_type
    if city:
        query['location_city'] = city
    # Exclude missions this provider has declined
    declined_ids = await db.mission_declines.distinct('mission_id', {'provider_id': current_user['id']})
    if declined_ids:
        query['id'] = {'$nin': declined_ids}
    missions = await db.interim_missions.find(query, {'_id': 0}).sort('created_at', -1).to_list(200)
    return missions


@router.get("/interim/missions/{mission_id}")
async def get_mission(mission_id: str):
    mission = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


@router.put("/interim/missions/{mission_id}")
async def update_mission(mission_id: str, data: dict = Body(...), current_company: dict = Depends(get_current_company)):
    mission = await db.interim_missions.find_one({'id': mission_id, 'company_id': current_company['id']})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Mission terminée — non modifiable")
    allowed = {'title', 'description', 'job_type', 'location_city', 'location_region',
               'location_commune', 'location_quartier',
               'start_date', 'end_date', 'daily_rate', 'rate_negotiable',
               'num_providers_needed', 'documents_required', 'status'}
    update = {k: v for k, v in data.items() if k in allowed}
    update['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.interim_missions.update_one({'id': mission_id}, {'$set': update})
    updated = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0})
    return updated


@router.delete("/interim/missions/{mission_id}")
async def delete_mission(mission_id: str, current_company: dict = Depends(get_current_company)):
    mission = await db.interim_missions.find_one({'id': mission_id, 'company_id': current_company['id']})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('accepted_count', 0) > 0:
        raise HTTPException(status_code=400, detail="Impossible de supprimer : prestataire(s) déjà accepté(s)")
    await db.interim_missions.delete_one({'id': mission_id})
    await db.mission_applications.delete_many({'mission_id': mission_id})
    return {'deleted': True}


# ======================================================================
# Applications (Provider side)
# ======================================================================

@router.post("/interim/missions/{mission_id}/apply")
async def apply_to_mission(mission_id: str, data: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    # Suspension check
    if current_user.get('interim_suspended'):
        raise HTTPException(status_code=403, detail="Compte intérim suspendu : commission(s) à régler")
    if await _provider_has_unpaid_commission(current_user['id']):
        # Auto-flag the suspension flag for consistency
        await db.service_providers.update_one({'id': current_user['id']}, {'$set': {'interim_suspended': True}})
        raise HTTPException(status_code=403, detail="Vous avez une commission impayée — règlez-la avant de postuler à nouveau")

    mission = await db.interim_missions.find_one({'id': mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('status') != 'open':
        raise HTTPException(status_code=400, detail="Cette mission n'est plus ouverte aux candidatures")

    existing = await db.mission_applications.find_one({'mission_id': mission_id, 'provider_id': current_user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette mission")

    application = {
        'id': str(uuid.uuid4()),
        'mission_id': mission_id,
        'mission_title': mission.get('title', ''),
        'company_id': mission['company_id'],
        'company_name': mission.get('company_name', ''),
        'provider_id': current_user['id'],
        'provider_name': f"{current_user.get('first_name','')} {current_user.get('last_name','')}".strip(),
        'provider_phone': current_user.get('phone_number', ''),
        'provider_city': current_user.get('city', ''),
        'cover_message': (data.get('cover_message') or '').strip()[:1000],
        'proposed_rate': float(data.get('proposed_rate') or 0) or None,
        'status': 'pending',     # pending | accepted | rejected | withdrawn
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.mission_applications.insert_one(application)
    await db.interim_missions.update_one({'id': mission_id}, {'$inc': {'applications_count': 1}})
    application.pop('_id', None)
    return application


@router.get("/interim/applications/mine")
async def my_provider_applications(current_user: dict = Depends(get_current_user)):
    apps = await db.mission_applications.find(
        {'provider_id': current_user['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    # Enrichir avec le statut actuel de la mission (pour affichage "Quota atteint")
    mission_ids = list({a['mission_id'] for a in apps})
    missions = await db.interim_missions.find(
        {'id': {'$in': mission_ids}},
        {'_id': 0, 'id': 1, 'status': 1, 'accepted_count': 1, 'num_providers_needed': 1, 'start_date': 1, 'end_date': 1}
    ).to_list(None)
    mission_status = {m['id']: m for m in missions}
    for a in apps:
        ms = mission_status.get(a['mission_id'])
        if ms:
            a['mission_status'] = ms.get('status')
            a['mission_accepted_count'] = ms.get('accepted_count', 0)
            a['mission_num_providers_needed'] = ms.get('num_providers_needed', 1)
            a['mission_start_date'] = ms.get('start_date')
            a['mission_end_date'] = ms.get('end_date')
    return apps


@router.get("/interim/missions/{mission_id}/applications")
async def list_mission_applications(mission_id: str, current_company: dict = Depends(get_current_company)):
    mission = await db.interim_missions.find_one({'id': mission_id, 'company_id': current_company['id']}, {'_id': 0, 'id': 1, 'status': 1})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    apps = await db.mission_applications.find(
        {'mission_id': mission_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    # Masquer le numéro tant que la candidature n'est pas acceptée (anti-contournement).
    # Une fois la mission terminée, masquer à nouveau pour TOUS (anti-démarchage).
    mission_completed = mission.get('status') == 'completed'
    for a in apps:
        if mission_completed or a.get('status') != 'accepted':
            a['provider_phone'] = None
            a['phone_locked'] = True
            a['phone_lock_reason'] = 'mission_completed' if mission_completed else 'not_accepted'
        else:
            a['phone_locked'] = False
    return apps


@router.post("/interim/applications/{application_id}/accept")
async def accept_application(application_id: str, current_company: dict = Depends(get_current_company)):
    app_doc = await db.mission_applications.find_one({'id': application_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if app_doc['company_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    if app_doc['status'] != 'pending':
        raise HTTPException(status_code=400, detail=f"Candidature déjà {app_doc['status']}")

    mission = await db.interim_missions.find_one({'id': app_doc['mission_id']})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    # Le quota peut être dépassé : si un prestataire accepté ne se présente pas, l'entreprise peut en accepter un autre.

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.mission_applications.update_one(
        {'id': application_id},
        {'$set': {'status': 'accepted', 'accepted_at': now_iso}}
    )
    new_count = mission.get('accepted_count', 0) + 1
    mission_update = {'accepted_count': new_count, 'updated_at': now_iso}
    if new_count >= mission.get('num_providers_needed', 1):
        mission_update['status'] = 'closed'
    await db.interim_missions.update_one({'id': mission['id']}, {'$set': mission_update})
    # Les candidatures en attente restent pending — l'entreprise peut accepter au-delà du quota
    # si un prestataire accepté ne se présente pas.
    return {'ok': True, 'status': 'accepted'}


@router.post("/interim/applications/{application_id}/reject")
async def reject_application(application_id: str, data: dict = Body(default={}), current_company: dict = Depends(get_current_company)):
    app_doc = await db.mission_applications.find_one({'id': application_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if app_doc['company_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.mission_applications.update_one(
        {'id': application_id},
        {'$set': {'status': 'rejected', 'rejected_at': datetime.now(timezone.utc).isoformat(),
                  'rejection_reason': (data.get('reason') or '').strip()[:500]}}
    )
    return {'ok': True, 'status': 'rejected'}


@router.post("/interim/applications/{application_id}/withdraw")
async def withdraw_application(application_id: str, current_user: dict = Depends(get_current_user)):
    app_doc = await db.mission_applications.find_one({'id': application_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if app_doc['provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    if app_doc['status'] not in ('pending',):
        raise HTTPException(status_code=400, detail=f"Impossible de retirer une candidature {app_doc['status']}")
    await db.mission_applications.update_one({'id': application_id}, {'$set': {'status': 'withdrawn'}})
    await db.interim_missions.update_one({'id': app_doc['mission_id']}, {'$inc': {'applications_count': -1}})
    return {'ok': True}


# ======================================================================
# Complete a mission → generate commission(s) for accepted provider(s)
# ======================================================================

@router.post("/interim/missions/{mission_id}/complete")
async def complete_mission(mission_id: str, data: dict = Body(default={}), current_company: dict = Depends(get_current_company)):
    """Mark a mission as 'closed' + finalize commissions + collect MANDATORY ratings
    for each accepted provider (company → provider).

    Body shape:
        {
            "days_worked": 3,
            "daily_rate": 150000,        // optional
            "ratings": [                  // REQUIRED, one entry per accepted provider
                {"provider_id": "...", "stars": 1-5, "comment": "..."},
                ...
            ]
        }

    Status transitions:
        open / closed (in progress) → 'closed' + awaiting_rating=true + company_rated=true
        When ALL accepted providers have rated back, transitions to 'completed'.
        Lazy auto-completion fallback: 7 days after company_completed_at,
        any missing provider ratings default to 3⭐.
    """
    mission = await db.interim_missions.find_one({'id': mission_id, 'company_id': current_company['id']})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Déjà marquée terminée")
    if mission.get('company_rated'):
        raise HTTPException(status_code=400, detail="Vous avez déjà clôturé cette mission")

    days_worked = int(data.get('days_worked') or 1)
    daily_rate_override = float(data.get('daily_rate') or 0) or mission.get('daily_rate', 0)

    accepted = await db.mission_applications.find(
        {'mission_id': mission_id, 'status': 'accepted'}, {'_id': 0}
    ).to_list(None)
    if not accepted:
        raise HTTPException(status_code=400, detail="Aucun prestataire accepté sur cette mission")

    # Validate ratings — one per accepted provider, stars in [1,5]
    raw_ratings = data.get('ratings') or []
    if not isinstance(raw_ratings, list) or len(raw_ratings) == 0:
        raise HTTPException(status_code=400, detail="Évaluation obligatoire de chaque prestataire accepté pour terminer la mission")
    ratings_by_provider = {}
    for r in raw_ratings:
        if not isinstance(r, dict):
            continue
        pid = (r.get('provider_id') or '').strip()
        try:
            stars = int(r.get('stars') or 0)
        except (TypeError, ValueError):
            stars = 0
        comment = (r.get('comment') or '').strip()[:1000]
        if not pid or stars < 1 or stars > 5:
            raise HTTPException(status_code=400, detail="Chaque évaluation doit comporter un prestataire et 1 à 5 étoiles")
        ratings_by_provider[pid] = {'stars': stars, 'comment': comment}
    accepted_ids = {a['provider_id'] for a in accepted}
    missing = accepted_ids - set(ratings_by_provider.keys())
    if missing:
        raise HTTPException(status_code=400, detail=f"Évaluation manquante pour {len(missing)} prestataire(s) accepté(s)")

    settings = await _get_interim_settings()
    commission_percent = float(settings.get('commission_percent') or 10.0)

    now_iso = datetime.now(timezone.utc).isoformat()
    created_commissions = []
    for app_doc in accepted:
        gross = daily_rate_override * days_worked
        commission_amount = round(gross * commission_percent / 100)
        commission = {
            'id': str(uuid.uuid4()),
            'mission_id': mission_id,
            'mission_title': mission.get('title', ''),
            'application_id': app_doc['id'],
            'company_id': mission['company_id'],
            'company_name': mission.get('company_name', ''),
            'provider_id': app_doc['provider_id'],
            'provider_name': app_doc.get('provider_name', ''),
            'provider_phone': app_doc.get('provider_phone', ''),
            'days_worked': days_worked,
            'daily_rate': daily_rate_override,
            'gross_amount': gross,
            'commission_percent': commission_percent,
            'commission_amount': commission_amount,
            'currency': 'GNF',
            'status': 'pending',
            'created_at': now_iso,
        }
        await db.interim_commissions.insert_one(commission)
        commission.pop('_id', None)
        created_commissions.append(commission)
        await db.service_providers.update_one({'id': app_doc['provider_id']}, {'$set': {'interim_suspended': True}})

        # Insert/update the company→provider rating
        r = ratings_by_provider[app_doc['provider_id']]
        rating_payload = {
            'mission_id': mission_id,
            'mission_title': mission.get('title', ''),
            'company_id': mission['company_id'],
            'company_name': mission.get('company_name', ''),
            'provider_id': app_doc['provider_id'],
            'direction': 'company_to_provider',
            'stars': r['stars'],
            'comment': r['comment'],
            'updated_at': now_iso,
        }
        existing_rating = await db.interim_ratings.find_one({
            'mission_id': mission_id, 'provider_id': app_doc['provider_id'], 'direction': 'company_to_provider'
        })
        if existing_rating:
            await db.interim_ratings.update_one({'id': existing_rating['id']}, {'$set': rating_payload})
        else:
            rating_payload['id'] = str(uuid.uuid4())
            rating_payload['created_at'] = now_iso
            await db.interim_ratings.insert_one(rating_payload)

    # Stay in 'closed' status with awaiting_rating flag until all providers have rated back.
    await db.interim_missions.update_one(
        {'id': mission_id},
        {'$set': {
            'status': 'closed',
            'awaiting_rating': True,
            'company_rated': True,
            'company_completed_at': now_iso,
            'updated_at': now_iso,
            'days_worked': days_worked,
        }}
    )

    # Auto-reject any pending applications (mission is closed)
    await db.mission_applications.update_many(
        {'mission_id': mission_id, 'status': 'pending'},
        {'$set': {
            'status': 'rejected',
            'rejection_reason': 'Mission terminée — candidature non retenue',
            'rejected_at': now_iso,
        }}
    )

    return {
        'ok': True,
        'awaiting_provider_ratings': len(accepted),
        'commissions_created': len(created_commissions),
        'message': "Mission clôturée. En attente des évaluations de chaque prestataire (auto-complétion sous 7 jours).",
    }


# ======================================================================
# Commissions (Provider submits payment proof)
# ======================================================================

@router.get("/interim/commissions/mine")
async def my_commissions(current_user: dict = Depends(get_current_user)):
    commissions = await db.interim_commissions.find(
        {'provider_id': current_user['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return commissions


@router.get("/interim/payment-methods")
async def public_payment_methods(current_user: dict = Depends(get_current_user)):
    """Provider-facing endpoint : returns where to transfer the commission."""
    settings = await _get_interim_settings()
    return {
        'commission_percent': settings.get('commission_percent', 10.0),
        'payment_methods': settings.get('payment_methods', []),
    }


@router.post("/interim/commissions/{commission_id}/submit-payment")
async def submit_commission_payment(commission_id: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    payment_method = (data.get('payment_method') or '').strip()    # orange_money | mtn_money | bank | other
    transfer_reference = (data.get('transfer_reference') or '').strip()
    sender_phone = (data.get('sender_phone') or '').strip()
    note = (data.get('note') or '').strip()

    if payment_method not in ('orange_money', 'mtn_money', 'bank', 'other'):
        raise HTTPException(status_code=400, detail="Mode de paiement invalide")
    if not transfer_reference:
        raise HTTPException(status_code=400, detail="La référence du transfert est obligatoire")

    commission = await db.interim_commissions.find_one({'id': commission_id, 'provider_id': current_user['id']})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission introuvable")
    if commission['status'] not in ('pending', 'rejected'):
        raise HTTPException(status_code=400, detail=f"Cette commission est déjà {commission['status']}")

    await db.interim_commissions.update_one(
        {'id': commission_id},
        {'$set': {
            'status': 'submitted',
            'payment_method': payment_method,
            'transfer_reference': transfer_reference[:100],
            'sender_phone': sender_phone[:30],
            'payment_note': note[:500],
            'submitted_at': datetime.now(timezone.utc).isoformat(),
            'rejection_reason': None,
        }}
    )
    return {'ok': True, 'status': 'submitted'}


# ======================================================================
# Admin endpoints  (protected by AdminAuthMiddleware on /api/admin/*)
# ======================================================================

@router.get("/admin/interim/settings")
async def admin_get_interim_settings():
    return await _get_interim_settings()


@router.put("/admin/interim/settings")
async def admin_update_interim_settings(data: dict = Body(...)):
    update = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if 'commission_percent' in data:
        try:
            cp = float(data['commission_percent'])
            if cp < 0 or cp > 100:
                raise ValueError
            update['commission_percent'] = cp
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="commission_percent doit être un nombre entre 0 et 100")
    if 'payment_methods' in data:
        methods = data['payment_methods']
        if not isinstance(methods, list):
            raise HTTPException(status_code=400, detail="payment_methods doit être une liste")
        clean = []
        for m in methods:
            if not isinstance(m, dict):
                continue
            clean.append({
                'id': m.get('id') or str(uuid.uuid4()),
                'type': (m.get('type') or 'other').strip(),      # orange_money | mtn_money | bank | other
                'label': (m.get('label') or '').strip()[:100],
                'account_name': (m.get('account_name') or '').strip()[:100],
                'account_number': (m.get('account_number') or '').strip()[:100],
                'instructions': (m.get('instructions') or '').strip()[:500],
            })
        update['payment_methods'] = clean

    await db.admin_settings.update_one(
        {'type': 'interim_settings'},
        {'$set': update},
        upsert=True,
    )
    return await _get_interim_settings()


@router.get("/admin/interim/commissions")
async def admin_list_commissions(status: Optional[str] = None, limit: int = Query(200, ge=1, le=1000)):
    query = {}
    if status:
        query['status'] = status
    commissions = await db.interim_commissions.find(query, {'_id': 0}).sort('created_at', -1).to_list(limit)
    counts = {
        'pending': await db.interim_commissions.count_documents({'status': 'pending'}),
        'submitted': await db.interim_commissions.count_documents({'status': 'submitted'}),
        'validated': await db.interim_commissions.count_documents({'status': 'validated'}),
        'rejected': await db.interim_commissions.count_documents({'status': 'rejected'}),
    }
    return {'commissions': commissions, 'counts': counts}


@router.post("/admin/interim/commissions/{commission_id}/validate")
async def admin_validate_commission(commission_id: str):
    commission = await db.interim_commissions.find_one({'id': commission_id})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission introuvable")
    if commission['status'] != 'submitted':
        raise HTTPException(status_code=400, detail="La commission doit être soumise pour être validée")
    await db.interim_commissions.update_one(
        {'id': commission_id},
        {'$set': {'status': 'validated', 'validated_at': datetime.now(timezone.utc).isoformat()}}
    )
    # Auto-unsuspend the provider if no other unpaid commission remains
    provider_id = commission['provider_id']
    still_unpaid = await db.interim_commissions.count_documents({
        'provider_id': provider_id,
        'status': {'$in': ['pending', 'submitted', 'rejected']},
    })
    if still_unpaid == 0:
        await db.service_providers.update_one(
            {'id': provider_id},
            {'$set': {'interim_suspended': False}}
        )
    return {'ok': True, 'status': 'validated', 'provider_unsuspended': still_unpaid == 0}


@router.post("/admin/interim/commissions/{commission_id}/reject")
async def admin_reject_commission(commission_id: str, data: dict = Body(default={})):
    reason = (data.get('reason') or '').strip()[:500]
    commission = await db.interim_commissions.find_one({'id': commission_id})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission introuvable")
    if commission['status'] not in ('submitted', 'pending'):
        raise HTTPException(status_code=400, detail=f"Impossible de rejeter une commission {commission['status']}")
    await db.interim_commissions.update_one(
        {'id': commission_id},
        {'$set': {
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat(),
            'rejection_reason': reason or 'Référence de paiement invalide',
        }}
    )
    return {'ok': True, 'status': 'rejected'}


@router.get("/admin/interim/missions")
async def admin_list_missions(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    missions = await db.interim_missions.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)
    counts = {
        'open': await db.interim_missions.count_documents({'status': 'open'}),
        'closed': await db.interim_missions.count_documents({'status': 'closed'}),
        'completed': await db.interim_missions.count_documents({'status': 'completed'}),
        'cancelled': await db.interim_missions.count_documents({'status': 'cancelled'}),
    }
    return {'missions': missions, 'counts': counts}


@router.post("/interim/missions/{mission_id}/decline")
async def decline_mission(mission_id: str, current_user: dict = Depends(get_current_user)):
    """Provider marks a mission as 'not interested' — it disappears from his available list & badge.
    Idempotent. Cannot decline a mission to which the provider has already applied/accepted."""
    mission = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0, 'id': 1})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    existing_app = await db.mission_applications.find_one({
        'mission_id': mission_id,
        'provider_id': current_user['id'],
        'status': {'$in': ['pending', 'accepted']},
    })
    if existing_app:
        raise HTTPException(status_code=400, detail="Impossible de rejeter une mission à laquelle vous avez postulé")

    await db.mission_declines.update_one(
        {'mission_id': mission_id, 'provider_id': current_user['id']},
        {'$set': {
            'mission_id': mission_id,
            'provider_id': current_user['id'],
            'declined_at': datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {'ok': True, 'declined': True}


@router.post("/interim/missions/{mission_id}/undecline")
async def undecline_mission(mission_id: str, current_user: dict = Depends(get_current_user)):
    """Revert a decline so the mission reappears in the available list."""
    await db.mission_declines.delete_one({'mission_id': mission_id, 'provider_id': current_user['id']})
    return {'ok': True}


# ======================================================================
# Notification badges (lightweight counts)
# ======================================================================

@router.get("/interim/provider/badge")
async def provider_interim_badge(current_user: dict = Depends(get_current_user)):
    """Returns counts for the provider's interim tab pastille."""
    # All open missions the provider hasn't applied to OR declined
    applied_ids = await db.mission_applications.distinct('mission_id', {'provider_id': current_user['id']})
    declined_ids = await db.mission_declines.distinct('mission_id', {'provider_id': current_user['id']})
    excluded = list(set(applied_ids) | set(declined_ids))
    available = await db.interim_missions.count_documents({
        'status': 'open',
        'id': {'$nin': excluded},
    })
    pending_applications = await db.mission_applications.count_documents({
        'provider_id': current_user['id'],
        'status': 'pending',
    })
    unpaid_commissions = await db.interim_commissions.count_documents({
        'provider_id': current_user['id'],
        'status': {'$in': ['pending', 'rejected']},
    })
    return {
        'available_missions': available,
        'pending_applications': pending_applications,
        'unpaid_commissions': unpaid_commissions,
        'total': available + unpaid_commissions,
    }


@router.get("/interim/company/badge")
async def company_interim_badge(current_company: dict = Depends(get_current_company)):
    """Returns counts for the company's interim tab pastille."""
    # Get all mission IDs of this company
    mission_ids = await db.interim_missions.distinct('id', {'company_id': current_company['id']})
    pending_applications = await db.mission_applications.count_documents({
        'mission_id': {'$in': mission_ids},
        'status': 'pending',
    })
    open_missions = await db.interim_missions.count_documents({
        'company_id': current_company['id'],
        'status': 'open',
    })
    return {
        'pending_applications': pending_applications,
        'open_missions': open_missions,
        'total': pending_applications,
    }
