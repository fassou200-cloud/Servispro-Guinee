"""Seed 2 test providers into servispro_dev for testing the interim module."""
import asyncio
import bcrypt
import uuid
from datetime import datetime, timezone
import sys
sys.path.insert(0, '/app/backend')
from database import db


async def seed():
    now_iso = datetime.now(timezone.utc).isoformat()

    providers = [
        {
            'id': str(uuid.uuid4()),
            'first_name': 'Mamadou',
            'last_name': 'Diallo',
            'phone_number': '+224620100001',
            'password': bcrypt.hashpw(b'TestProvider2026!', bcrypt.gensalt()).decode(),
            'profession': 'Électricien',
            'profession_group': 'Métiers techniques',
            'years_experience': '5',
            'about_me': 'Électricien expérimenté, intérim accepté.',
            'profile_picture': None,
            'online_status': True,
            'price': 150000,
            'location': 'Conakry',
            'region': 'Conakry',
            'ville': 'Kaloum',
            'commune': 'Kaloum',
            'quartier': 'Sandervalia',
            'verification_status': 'approved',
            'is_active': True,
            'is_interim': True,
            'interim_suspended': False,
            'skills': ['Électricien', 'Câblage', 'Tableaux électriques'],
            'daily_rate': 200000,
            'created_at': now_iso,
        },
        {
            'id': str(uuid.uuid4()),
            'first_name': 'Fatoumata',
            'last_name': 'Camara',
            'phone_number': '+224620100002',
            'password': bcrypt.hashpw(b'TestProvider2026!', bcrypt.gensalt()).decode(),
            'profession': 'Agent de sécurité',
            'profession_group': 'Sécurité',
            'years_experience': '3',
            'about_me': 'Agent de sécurité disponible pour missions ponctuelles.',
            'profile_picture': None,
            'online_status': True,
            'price': 80000,
            'location': 'Conakry',
            'region': 'Conakry',
            'ville': 'Ratoma',
            'commune': 'Ratoma',
            'quartier': 'Lambanyi',
            'verification_status': 'approved',
            'is_active': True,
            'is_interim': True,
            'interim_suspended': False,
            'skills': ['Agent de sécurité', 'Surveillance', 'Contrôle d\'accès'],
            'daily_rate': 100000,
            'created_at': now_iso,
        },
        {
            'id': str(uuid.uuid4()),
            'first_name': 'Ibrahima',
            'last_name': 'Sow',
            'phone_number': '+224620100003',
            'password': bcrypt.hashpw(b'TestProvider2026!', bcrypt.gensalt()).decode(),
            'profession': 'Plombier',
            'profession_group': 'Métiers techniques',
            'years_experience': '7',
            'about_me': 'Plombier qualifié, intervention rapide à Conakry et environs.',
            'profile_picture': None,
            'online_status': True,
            'price': 120000,
            'location': 'Conakry',
            'region': 'Conakry',
            'ville': 'Matam',
            'commune': 'Matam',
            'quartier': 'Coleyah',
            'verification_status': 'approved',
            'is_active': True,
            'is_interim': True,
            'interim_suspended': False,
            'skills': ['Plombier', 'Installation sanitaire', 'Dépannage fuites'],
            'daily_rate': 150000,
            'created_at': now_iso,
        },
    ]

    for p in providers:
        # Idempotent : remove existing with same phone first
        await db.service_providers.delete_many({'phone_number': p['phone_number']})
        await db.service_providers.insert_one(p)
        print(f"✅ {p['first_name']} {p['last_name']} ({p['phone_number']}) — {p['profession']}")

    print("\n--- LOGIN INFO ---")
    print("Prestataire 1 : +224620100001 / TestProvider2026!")
    print("Prestataire 2 : +224620100002 / TestProvider2026!")
    print("Prestataire 3 : +224620100003 / TestProvider2026!")


if __name__ == '__main__':
    asyncio.run(seed())
