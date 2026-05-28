"""One-shot migration: mark all EXISTING users as phone_verified=True.

Run ONCE before deploying the OTP verification feature, so existing users
(who registered before OTP existed) are not locked out on next login.

New users created AFTER this script runs will have phone_verified=False
and will go through the OTP flow.

Usage:
    cd /app/backend && python3 scripts/grandfather_phone_verified.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Allow running this file directly as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db


async def main():
    now = datetime.now(timezone.utc).isoformat()
    total = {}
    for col in ('service_providers', 'customers', 'companies'):
        r = await db[col].update_many(
            {'phone_verified': {'$exists': False}},
            {'$set': {'phone_verified': True, 'phone_verified_at': now, 'phone_verified_grandfathered': True}},
        )
        total[col] = r.modified_count
        print(f"  {col}: {r.modified_count} grandfathered")
    print("Done.", total)


if __name__ == "__main__":
    asyncio.run(main())
