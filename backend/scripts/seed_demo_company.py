"""Seed a demo company + 3 test interim missions in servispro_dev."""
import asyncio
import bcrypt
import uuid
from datetime import datetime, timezone, timedelta
import sys
sys.path.insert(0, '/app/backend')
from database import db


COMPANY_PHONE = '+224620200001'
COMPANY_PASSWORD = 'BoutiqueDemo2026!'


async def seed():
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # ---------- COMPANY ----------
    await db.companies.delete_many({'phone_number': COMPANY_PHONE})

    company_id = str(uuid.uuid4())
    company = {
        'id': company_id,
        'company_name': 'Boutique Demo Conakry',
        'rccm_number': 'RCCM-DEMO-2026-001',
        'nif_number': 'NIF-DEMO-001',
        'sector': 'Commerce général',
        'address': 'Avenue de la République, Kaloum',
        'city': 'Conakry',
        'region': 'Conakry',
        'phone_number': COMPANY_PHONE,
        'email': 'contact@boutiquedemo.gn',
        'website': '',
        'description': 'Boutique de démonstration utilisée pour tester l\'écosystème ServisPro (Makiti + Intérim).',
        'contact_person_name': 'Aïssata Touré',
        'contact_person_phone': COMPANY_PHONE,
        'password': bcrypt.hashpw(COMPANY_PASSWORD.encode(), bcrypt.gensalt()).decode(),
        'logo': None,
        'licence_exploitation': None,
        'rccm_document': None,
        'nif_document': None,
        'attestation_fiscale': None,
        'documents_additionnels': [],
        'verification_status': 'approved',
        'is_active': True,
        'online_status': True,
        'created_at': now_iso,
        'updated_at': now_iso,
    }
    await db.companies.insert_one(company)
    print(f"✅ Entreprise créée : {company['company_name']} ({COMPANY_PHONE})")

    # ---------- MISSIONS ----------
    # Clean up old TEST missions from this seed
    await db.interim_missions.delete_many({'company_id': company_id})

    missions = [
        {
            'id': str(uuid.uuid4()),
            'company_id': company_id,
            'company_name': company['company_name'],
            'title': 'Électricien pour câblage boutique (3 jours)',
            'description': "Nous ouvrons un nouveau point de vente à Kaloum et avons besoin d'un électricien expérimenté pour le câblage complet : tableau électrique, prises, éclairage LED, climatisation. Matériel fourni.",
            'job_type': 'Électricien',
            'location_city': 'Kaloum',
            'location_region': 'Conakry',
            'start_date': (now + timedelta(days=3)).date().isoformat(),
            'end_date': (now + timedelta(days=5)).date().isoformat(),
            'daily_rate': 250000,
            'rate_negotiable': False,
            'num_providers_needed': 1,
            'documents_required': ['CNI', 'Certification électrique'],
            'status': 'open',
            'applications_count': 0,
            'accepted_count': 0,
            'created_at': now_iso,
            'updated_at': now_iso,
        },
        {
            'id': str(uuid.uuid4()),
            'company_id': company_id,
            'company_name': company['company_name'],
            'title': 'Agents de sécurité événement (2 jours, 2 personnes)',
            'description': "Organisation d'un événement promotionnel sur 2 jours à Ratoma. Besoin de 2 agents de sécurité pour contrôle d'accès, surveillance générale et fluidité du public. Horaires : 8h-20h.",
            'job_type': 'Agent de sécurité',
            'location_city': 'Ratoma',
            'location_region': 'Conakry',
            'start_date': (now + timedelta(days=7)).date().isoformat(),
            'end_date': (now + timedelta(days=8)).date().isoformat(),
            'daily_rate': 120000,
            'rate_negotiable': False,
            'num_providers_needed': 2,
            'documents_required': ['CNI', 'Casier judiciaire'],
            'status': 'open',
            'applications_count': 0,
            'accepted_count': 0,
            'created_at': now_iso,
            'updated_at': now_iso,
        },
        {
            'id': str(uuid.uuid4()),
            'company_id': company_id,
            'company_name': company['company_name'],
            'title': 'Plombier pour installation sanitaire complète',
            'description': "Installation complète des sanitaires d'un local commercial neuf : lavabos, WC, alimentation et évacuation, raccordement à la fosse septique. Plans disponibles, matériel à fournir par le prestataire (sera remboursé sur facture).",
            'job_type': 'Plombier',
            'location_city': 'Matam',
            'location_region': 'Conakry',
            'start_date': (now + timedelta(days=4)).date().isoformat(),
            'end_date': (now + timedelta(days=8)).date().isoformat(),
            'daily_rate': 0,
            'rate_negotiable': True,
            'num_providers_needed': 1,
            'documents_required': ['CNI'],
            'status': 'open',
            'applications_count': 0,
            'accepted_count': 0,
            'created_at': now_iso,
            'updated_at': now_iso,
        },
    ]

    for m in missions:
        await db.interim_missions.insert_one(m)
        rate = 'à négocier' if m['rate_negotiable'] else f"{m['daily_rate']:,} GNF/jour".replace(',', ' ')
        print(f"  📋 Mission : {m['title']} ({rate}, {m['num_providers_needed']} place(s))")

    print(f"\n--- COMPANY LOGIN ---")
    print(f"Phone : {COMPANY_PHONE}")
    print(f"Password : {COMPANY_PASSWORD}")
    print(f"\n3 missions ouvertes prêtes à recevoir les candidatures des 3 prestataires.")


if __name__ == '__main__':
    asyncio.run(seed())
