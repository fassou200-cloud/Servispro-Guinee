"""
Phase 2 — Interim module : Availability, Timesheets, Invoices, Ratings.

Architecture :
- /interim/availability/*           → Provider sets unavailable dates manually
- /interim/availability/{provider}  → Public read for company (combine manual + accepted missions)
- /interim/timesheets/*             → Provider submits days, company validates
- /interim/missions/{id}/invoice    → HTML view (PDF via browser Ctrl+P), accessible by company & provider
- /interim/ratings/*                → Company rates provider, provider rates company
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import HTMLResponse
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from dependencies import get_current_user, get_current_company

router = APIRouter()


# ======================================================================
# Helpers
# ======================================================================

def _date_str(d):
    """Normalize an ISO date string to YYYY-MM-DD."""
    if not d:
        return None
    return str(d)[:10]


async def _get_busy_dates_from_missions(provider_id: str):
    """Returns the set of YYYY-MM-DD where the provider is booked on an accepted mission."""
    accepted_apps = await db.mission_applications.find(
        {'provider_id': provider_id, 'status': 'accepted'},
        {'_id': 0, 'mission_id': 1}
    ).to_list(None)
    mission_ids = [a['mission_id'] for a in accepted_apps]
    if not mission_ids:
        return set()
    missions = await db.interim_missions.find(
        {'id': {'$in': mission_ids}, 'status': {'$in': ['open', 'closed']}},
        {'_id': 0, 'start_date': 1, 'end_date': 1}
    ).to_list(None)
    busy = set()
    for m in missions:
        sd = _date_str(m.get('start_date'))
        ed = _date_str(m.get('end_date')) or sd
        if not sd:
            continue
        try:
            from datetime import date
            d1 = date.fromisoformat(sd)
            d2 = date.fromisoformat(ed)
            current = d1
            while current <= d2:
                busy.add(current.isoformat())
                from datetime import timedelta
                current = current + timedelta(days=1)
        except ValueError:
            continue
    return busy


# ======================================================================
# AVAILABILITY
# ======================================================================

@router.get("/interim/availability/mine")
async def my_availability(current_user: dict = Depends(get_current_user)):
    """Returns the provider's manual unavailable dates + mission-busy dates (read-only)."""
    doc = await db.provider_availability.find_one(
        {'provider_id': current_user['id']}, {'_id': 0}
    ) or {'provider_id': current_user['id'], 'unavailable_dates': []}
    busy = await _get_busy_dates_from_missions(current_user['id'])
    return {
        'manual_unavailable_dates': sorted(doc.get('unavailable_dates', [])),
        'mission_busy_dates': sorted(busy),
    }


@router.put("/interim/availability")
async def update_my_availability(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Sets the provider's manual unavailable dates (list of YYYY-MM-DD)."""
    dates_in = data.get('unavailable_dates') or []
    if not isinstance(dates_in, list):
        raise HTTPException(status_code=400, detail="unavailable_dates doit être une liste")
    clean = sorted({_date_str(d) for d in dates_in if d})
    await db.provider_availability.update_one(
        {'provider_id': current_user['id']},
        {'$set': {
            'provider_id': current_user['id'],
            'unavailable_dates': clean,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {'ok': True, 'unavailable_dates': clean}


@router.get("/interim/providers/{provider_id}/availability")
async def public_availability(provider_id: str, current_company: dict = Depends(get_current_company)):
    """Company can check a provider's full unavailable set before proposing a mission."""
    doc = await db.provider_availability.find_one(
        {'provider_id': provider_id}, {'_id': 0}
    ) or {'unavailable_dates': []}
    busy = await _get_busy_dates_from_missions(provider_id)
    manual = set(doc.get('unavailable_dates', []))
    return {
        'provider_id': provider_id,
        'all_unavailable_dates': sorted(manual | busy),
    }


# ======================================================================
# TIMESHEETS  (provider submits → company validates)
# ======================================================================

@router.post("/interim/missions/{mission_id}/timesheet")
async def submit_timesheet(mission_id: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Provider submits worked days for an accepted mission."""
    days_worked = data.get('days_worked')
    notes = (data.get('notes') or '').strip()[:1000]
    worked_dates = data.get('worked_dates') or []
    if not isinstance(days_worked, (int, float)) or days_worked <= 0:
        raise HTTPException(status_code=400, detail="days_worked doit être > 0")

    app_doc = await db.mission_applications.find_one({
        'mission_id': mission_id,
        'provider_id': current_user['id'],
        'status': 'accepted',
    })
    if not app_doc:
        raise HTTPException(status_code=400, detail="Aucune candidature acceptée trouvée pour cette mission")

    mission = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0, 'id': 1, 'company_id': 1, 'daily_rate': 1, 'title': 1, 'status': 1})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('status') not in ('closed', 'completed'):
        raise HTTPException(status_code=400, detail="Le pointage n'est possible que lorsque la mission est fermée ou terminée")

    timesheet = await db.interim_timesheets.find_one({'mission_id': mission_id, 'provider_id': current_user['id']})
    now_iso = datetime.now(timezone.utc).isoformat()
    if timesheet:
        if timesheet.get('status') == 'validated':
            raise HTTPException(status_code=400, detail="Pointage déjà validé — modifications impossibles")
        await db.interim_timesheets.update_one(
            {'id': timesheet['id']},
            {'$set': {
                'days_worked': float(days_worked),
                'worked_dates': sorted({_date_str(d) for d in worked_dates if d}),
                'notes': notes,
                'status': 'submitted',
                'updated_at': now_iso,
                'rejection_reason': None,
            }}
        )
        ts_id = timesheet['id']
    else:
        ts_id = str(uuid.uuid4())
        await db.interim_timesheets.insert_one({
            'id': ts_id,
            'mission_id': mission_id,
            'mission_title': mission.get('title', ''),
            'company_id': mission['company_id'],
            'provider_id': current_user['id'],
            'provider_name': f"{current_user.get('first_name','')} {current_user.get('last_name','')}".strip(),
            'application_id': app_doc['id'],
            'days_worked': float(days_worked),
            'worked_dates': sorted({_date_str(d) for d in worked_dates if d}),
            'notes': notes,
            'status': 'submitted',
            'created_at': now_iso,
            'updated_at': now_iso,
        })
    ts = await db.interim_timesheets.find_one({'id': ts_id}, {'_id': 0})
    return ts


@router.get("/interim/timesheets/mine")
async def my_timesheets(current_user: dict = Depends(get_current_user)):
    """All timesheets the current provider has submitted."""
    return await db.interim_timesheets.find(
        {'provider_id': current_user['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)


@router.get("/interim/timesheets/company")
async def company_timesheets(current_company: dict = Depends(get_current_company), status: Optional[str] = None):
    """Timesheets the company received."""
    query = {'company_id': current_company['id']}
    if status:
        query['status'] = status
    return await db.interim_timesheets.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)


@router.post("/interim/timesheets/{ts_id}/validate")
async def validate_timesheet(ts_id: str, current_company: dict = Depends(get_current_company)):
    ts = await db.interim_timesheets.find_one({'id': ts_id})
    if not ts or ts['company_id'] != current_company['id']:
        raise HTTPException(status_code=404, detail="Pointage introuvable")
    if ts['status'] == 'validated':
        raise HTTPException(status_code=400, detail="Déjà validé")
    await db.interim_timesheets.update_one(
        {'id': ts_id},
        {'$set': {'status': 'validated', 'validated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'ok': True}


@router.post("/interim/timesheets/{ts_id}/reject")
async def reject_timesheet(ts_id: str, data: dict = Body(default={}), current_company: dict = Depends(get_current_company)):
    ts = await db.interim_timesheets.find_one({'id': ts_id})
    if not ts or ts['company_id'] != current_company['id']:
        raise HTTPException(status_code=404, detail="Pointage introuvable")
    if ts['status'] != 'submitted':
        raise HTTPException(status_code=400, detail=f"Pointage déjà {ts['status']}")
    reason = (data.get('reason') or '').strip()[:500]
    await db.interim_timesheets.update_one(
        {'id': ts_id},
        {'$set': {
            'status': 'rejected',
            'rejected_at': datetime.now(timezone.utc).isoformat(),
            'rejection_reason': reason or 'Pointage incohérent',
        }}
    )
    return {'ok': True}


# ======================================================================
# INVOICE (HTML — to be printed via Ctrl+P)
# ======================================================================

@router.get("/interim/missions/{mission_id}/invoice/{provider_id}", response_class=HTMLResponse)
async def mission_invoice(mission_id: str, provider_id: str, token: Optional[str] = None):
    """Public HTML invoice — accessible via signed link. For simplicity here, we accept a token
    that must match either the company's id or the provider's id."""
    if not token or token not in (provider_id,):
        # Allow company token too: we look up the mission's company_id
        mission_check = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0, 'company_id': 1})
        if not mission_check or token != mission_check.get('company_id'):
            raise HTTPException(status_code=403, detail="Lien invalide")

    mission = await db.interim_missions.find_one({'id': mission_id}, {'_id': 0})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    company = await db.companies.find_one({'id': mission['company_id']}, {'_id': 0, 'company_name': 1, 'rccm_number': 1, 'nif_number': 1, 'address': 1, 'phone_number': 1, 'email': 1})
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0, 'first_name': 1, 'last_name': 1, 'phone_number': 1, 'profession': 1, 'location': 1})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire introuvable")
    commission = await db.interim_commissions.find_one({'mission_id': mission_id, 'provider_id': provider_id}, {'_id': 0})
    timesheet = await db.interim_timesheets.find_one({'mission_id': mission_id, 'provider_id': provider_id, 'status': 'validated'}, {'_id': 0})

    days = (timesheet and timesheet.get('days_worked')) or (commission and commission.get('days_worked')) or mission.get('days_worked') or 1
    rate = (commission and commission.get('daily_rate')) or mission.get('daily_rate') or 0
    gross = days * rate
    commission_pct = (commission and commission.get('commission_percent')) or 10
    commission_amount = (commission and commission.get('commission_amount')) or round(gross * commission_pct / 100)
    net_provider = gross - commission_amount
    invoice_no = f"INV-{mission['id'][:8].upper()}-{provider_id[:4].upper()}"
    now = datetime.now(timezone.utc).strftime('%d/%m/%Y')

    def fmt(n):
        try:
            return f"{int(n):,}".replace(',', ' ')
        except (TypeError, ValueError):
            return str(n)

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Facture {invoice_no}</title>
<style>
  @media print {{ body {{ margin: 0; }} .no-print {{ display: none; }} }}
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1f2937; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }}
  .logo {{ font-size: 28px; font-weight: bold; color: #10b981; }}
  .logo .makiti {{ color: #f97316; font-size: 14px; }}
  .invoice-meta {{ text-align: right; font-size: 14px; }}
  .invoice-no {{ font-size: 22px; font-weight: bold; color: #1f2937; }}
  .parties {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }}
  .party {{ background: #f9fafb; padding: 16px; border-radius: 8px; }}
  .party h3 {{ margin: 0 0 8px 0; color: #10b981; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
  th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
  th {{ background: #f3f4f6; font-size: 13px; text-transform: uppercase; color: #6b7280; }}
  .text-right {{ text-align: right; }}
  .totals {{ margin-left: auto; width: 320px; }}
  .totals .row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
  .totals .total {{ font-weight: bold; font-size: 18px; border-top: 2px solid #10b981; padding-top: 12px; color: #10b981; }}
  .totals .commission {{ color: #dc2626; }}
  .footer {{ margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }}
  .btn {{ background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }}
</style>
</head>
<body>
<div class="no-print" style="margin-bottom: 16px;">
  <button class="btn" onclick="window.print()">🖨️ Imprimer / Télécharger PDF</button>
</div>
<div class="header">
  <div>
    <div class="logo">ServisPro <span class="makiti">Makiti</span></div>
    <p style="color:#6b7280; font-size:13px; margin:4px 0 0 0;">Conakry, Guinée — Plateforme de services</p>
  </div>
  <div class="invoice-meta">
    <div class="invoice-no">FACTURE</div>
    <div>N° <strong>{invoice_no}</strong></div>
    <div>Date : {now}</div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <h3>Entreprise (Cliente)</h3>
    <div><strong>{(company or {}).get('company_name', '—')}</strong></div>
    <div>{(company or {}).get('address', '')}</div>
    <div>{(company or {}).get('phone_number', '')}</div>
    <div>{(company or {}).get('email', '') or ''}</div>
    {f"<div>RCCM : {company.get('rccm_number')}</div>" if company and company.get('rccm_number') else ''}
    {f"<div>NIF : {company.get('nif_number')}</div>" if company and company.get('nif_number') else ''}
  </div>
  <div class="party">
    <h3>Prestataire</h3>
    <div><strong>{provider['first_name']} {provider['last_name']}</strong></div>
    <div>{provider.get('profession', '')}</div>
    <div>{provider.get('location', '')}</div>
    <div>{provider.get('phone_number', '')}</div>
  </div>
</div>

<h3 style="color:#10b981; font-size:14px; text-transform:uppercase;">Détail de la mission</h3>
<table>
  <thead>
    <tr><th>Mission</th><th class="text-right">Jours</th><th class="text-right">Taux/jour</th><th class="text-right">Montant</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>{mission.get('title', '')}<br/><span style="font-size:12px; color:#6b7280;">{mission.get('job_type', '')} — {mission.get('location_city', '')}</span></td>
      <td class="text-right">{fmt(days)}</td>
      <td class="text-right">{fmt(rate)} GNF</td>
      <td class="text-right"><strong>{fmt(gross)} GNF</strong></td>
    </tr>
  </tbody>
</table>

<div class="totals">
  <div class="row"><span>Montant brut</span><span><strong>{fmt(gross)} GNF</strong></span></div>
  <div class="row commission"><span>Commission ServisPro ({commission_pct}%)</span><span>- {fmt(commission_amount)} GNF</span></div>
  <div class="row total"><span>Net prestataire</span><span>{fmt(net_provider)} GNF</span></div>
</div>

<div class="footer">
  <p>Cette facture est générée automatiquement par la plateforme ServisPro.</p>
  <p>Pour toute question : <strong>servispro@servisprogn.com</strong> · +224 622 17 64 29 · +224 610 06 21 89</p>
</div>
</body>
</html>
"""
    return HTMLResponse(content=html)


# ======================================================================
# RATINGS  (bidirectional)
# ======================================================================

@router.post("/interim/missions/{mission_id}/rate-provider")
async def rate_provider(mission_id: str, data: dict = Body(...), current_company: dict = Depends(get_current_company)):
    provider_id = (data.get('provider_id') or '').strip()
    stars = int(data.get('stars') or 0)
    comment = (data.get('comment') or '').strip()[:1000]
    if not provider_id or stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="provider_id + stars (1-5) requis")
    mission = await db.interim_missions.find_one({'id': mission_id, 'company_id': current_company['id']})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="La mission doit être terminée")
    # Vérifier que ce prestataire a bien été accepté sur cette mission
    accepted = await db.mission_applications.find_one({
        'mission_id': mission_id, 'provider_id': provider_id, 'status': 'accepted'
    })
    if not accepted:
        raise HTTPException(status_code=400, detail="Ce prestataire n'a pas été accepté sur cette mission")
    existing = await db.interim_ratings.find_one({
        'mission_id': mission_id, 'provider_id': provider_id, 'direction': 'company_to_provider'
    })
    payload = {
        'mission_id': mission_id,
        'mission_title': mission.get('title', ''),
        'company_id': current_company['id'],
        'company_name': current_company.get('company_name', ''),
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
    payload['created_at'] = payload['updated_at']
    await db.interim_ratings.insert_one(payload)
    return {'ok': True, 'created': True}


@router.post("/interim/missions/{mission_id}/rate-company")
async def rate_company(mission_id: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    stars = int(data.get('stars') or 0)
    comment = (data.get('comment') or '').strip()[:1000]
    if stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="stars (1-5) requis")
    app_doc = await db.mission_applications.find_one({
        'mission_id': mission_id, 'provider_id': current_user['id'], 'status': 'accepted'
    })
    if not app_doc:
        raise HTTPException(status_code=403, detail="Vous n'avez pas été accepté sur cette mission")
    mission = await db.interim_missions.find_one({'id': mission_id})
    if not mission or mission.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="La mission doit être terminée")
    existing = await db.interim_ratings.find_one({
        'mission_id': mission_id, 'provider_id': current_user['id'], 'direction': 'provider_to_company'
    })
    payload = {
        'mission_id': mission_id,
        'mission_title': mission.get('title', ''),
        'company_id': mission['company_id'],
        'company_name': mission.get('company_name', ''),
        'provider_id': current_user['id'],
        'direction': 'provider_to_company',
        'stars': stars,
        'comment': comment,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        await db.interim_ratings.update_one({'id': existing['id']}, {'$set': payload})
        return {'ok': True, 'updated': True}
    payload['id'] = str(uuid.uuid4())
    payload['created_at'] = payload['updated_at']
    await db.interim_ratings.insert_one(payload)
    return {'ok': True, 'created': True}


@router.get("/interim/ratings/provider/{provider_id}")
async def provider_ratings_summary(provider_id: str):
    ratings = await db.interim_ratings.find(
        {'provider_id': provider_id, 'direction': 'company_to_provider'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    if not ratings:
        return {'count': 0, 'average': 0, 'ratings': []}
    avg = sum(r['stars'] for r in ratings) / len(ratings)
    return {'count': len(ratings), 'average': round(avg, 2), 'ratings': ratings}


@router.get("/interim/ratings/company/{company_id}")
async def company_ratings_summary(company_id: str):
    ratings = await db.interim_ratings.find(
        {'company_id': company_id, 'direction': 'provider_to_company'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    if not ratings:
        return {'count': 0, 'average': 0, 'ratings': []}
    avg = sum(r['stars'] for r in ratings) / len(ratings)
    return {'count': len(ratings), 'average': round(avg, 2), 'ratings': ratings}
