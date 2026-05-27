#!/usr/bin/env python3
"""
JWT secret rotation CLI for ServisPro. See utils/jwt_rotation.py for the core logic.

Usage:
    python3 scripts/rotate_jwt_secret.py             # rotate now
    python3 scripts/rotate_jwt_secret.py --finalize  # drop the previous secret
    python3 scripts/rotate_jwt_secret.py --check     # show rotation status only
"""
import argparse
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Make `utils` importable when running directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.jwt_rotation import (  # noqa: E402
    read_env, perform_rotation, perform_finalize, schedule_backend_restart,
)

RECOMMENDED_INTERVAL_DAYS = 180


def cmd_check():
    env = read_env()
    print('JWT_SECRET present       :', bool(env.get('JWT_SECRET')))
    print('JWT_SECRET length        :', len(env.get('JWT_SECRET', '')))
    prev = (env.get('JWT_SECRET_PREVIOUS') or '').strip()
    print('JWT_SECRET_PREVIOUS set  :', bool(prev), '(grace window active)' if prev else '')
    rotated = (env.get('JWT_SECRET_ROTATED_AT') or '').strip()
    print('Last rotation            :', rotated or '(never)')
    if rotated:
        try:
            d = datetime.fromisoformat(rotated.replace('Z', '+00:00'))
            age_days = (datetime.now(timezone.utc) - d).days
            print(f'Days since last rotation : {age_days}')
            if age_days >= RECOMMENDED_INTERVAL_DAYS:
                print(f'\n⚠️  ROTATION RECOMMENDED (>{RECOMMENDED_INTERVAL_DAYS} days). Run without flag.')
            else:
                next_at = d + timedelta(days=RECOMMENDED_INTERVAL_DAYS)
                print(f'Next rotation suggested  : {next_at.date().isoformat()} '
                      f'(in {(next_at - datetime.now(timezone.utc)).days} days)')
        except Exception:
            pass


def cmd_rotate():
    res = perform_rotation()
    print('✅ JWT_SECRET rotated.')
    print('   - Previous secret kept as JWT_SECRET_PREVIOUS for 24h grace window.')
    print(f'   - Rotation timestamp : {res["rotated_at"]}')
    schedule_backend_restart(delay_seconds=1)
    print('   - Backend restart scheduled.')
    print('\n📌 NEXT STEPS:')
    print('   1. In ~24h run: python3 scripts/rotate_jwt_secret.py --finalize')
    print('   2. Mark your calendar 6 months from now for next rotation.')


def cmd_finalize():
    res = perform_finalize()
    if res.get('already_finalized'):
        print('Nothing to finalize — JWT_SECRET_PREVIOUS is already empty.')
        return
    print('✅ JWT_SECRET_PREVIOUS removed.')
    print('   All tokens signed with the old secret are now invalid.')
    schedule_backend_restart(delay_seconds=1)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check', action='store_true', help='show rotation status')
    p.add_argument('--finalize', action='store_true', help='remove the previous secret')
    args = p.parse_args()
    if args.check:
        cmd_check()
    elif args.finalize:
        cmd_finalize()
    else:
        cmd_rotate()


if __name__ == '__main__':
    main()
