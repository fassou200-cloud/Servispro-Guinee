#!/usr/bin/env python3
"""
JWT secret rotation script for ServisPro.

Best practice: rotate every 6 months (or on incident).

What it does:
1. Reads /app/backend/.env
2. Moves the current JWT_SECRET → JWT_SECRET_PREVIOUS (24h grace window)
3. Generates a fresh 86-char JWT_SECRET
4. Writes JWT_SECRET_ROTATED_AT = <today>
5. Restarts backend (sudo supervisorctl restart backend)
6. Prints a checklist for the operator

After 24h, run:
    python3 scripts/rotate_jwt_secret.py --finalize
to remove JWT_SECRET_PREVIOUS (forces remaining old-token holders to re-login).

Usage:
    python3 scripts/rotate_jwt_secret.py             # rotate now
    python3 scripts/rotate_jwt_secret.py --finalize  # drop the previous secret
    python3 scripts/rotate_jwt_secret.py --check     # show rotation status only
"""
import argparse
import os
import re
import secrets
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

ENV_PATH = Path('/app/backend/.env')
RECOMMENDED_INTERVAL_DAYS = 180  # ~6 months


def read_env() -> dict:
    if not ENV_PATH.exists():
        print(f'ERROR: {ENV_PATH} not found', file=sys.stderr)
        sys.exit(1)
    env = {}
    for line in ENV_PATH.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, _, v = line.partition('=')
            env[k.strip()] = v
    return env


def write_env_kv(updates: dict, removals: list[str]) -> None:
    """Rewrite .env preserving comments/order; update or insert keys, drop `removals`."""
    lines = ENV_PATH.read_text().splitlines()
    seen = set()
    out = []
    for line in lines:
        m = re.match(r'^([A-Z_][A-Z0-9_]*)=', line)
        if not m:
            out.append(line)
            continue
        key = m.group(1)
        if key in removals:
            continue  # skip
        if key in updates:
            out.append(f'{key}={updates[key]}')
            seen.add(key)
        else:
            out.append(line)
    # Append any new keys
    for k, v in updates.items():
        if k not in seen:
            out.append(f'{k}={v}')
    ENV_PATH.write_text('\n'.join(out) + '\n')


def restart_backend():
    print('Restarting backend (supervisorctl restart backend)...')
    res = subprocess.run(['sudo', 'supervisorctl', 'restart', 'backend'],
                         capture_output=True, text=True)
    print(res.stdout or res.stderr)


def cmd_check():
    env = read_env()
    print('JWT_SECRET present       :', bool(env.get('JWT_SECRET')))
    print('JWT_SECRET length        :', len(env.get('JWT_SECRET', '')))
    prev = env.get('JWT_SECRET_PREVIOUS', '').strip()
    print('JWT_SECRET_PREVIOUS set  :', bool(prev), '(grace window active)' if prev else '')
    rotated = env.get('JWT_SECRET_ROTATED_AT', '').strip()
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
    env = read_env()
    current = env.get('JWT_SECRET', '').strip()
    if not current:
        print('ERROR: no current JWT_SECRET in .env', file=sys.stderr)
        sys.exit(2)

    new_secret = secrets.token_urlsafe(64)
    now_iso = datetime.now(timezone.utc).isoformat()

    write_env_kv(
        updates={
            'JWT_SECRET': new_secret,
            'JWT_SECRET_PREVIOUS': current,
            'JWT_SECRET_ROTATED_AT': now_iso,
        },
        removals=[],
    )
    print('✅ JWT_SECRET rotated.')
    print('   - Previous secret kept as JWT_SECRET_PREVIOUS for 24h grace window.')
    print(f'   - Rotation timestamp : {now_iso}')
    restart_backend()
    print('\n📌 NEXT STEPS:')
    print('   1. In ~24h run: python3 scripts/rotate_jwt_secret.py --finalize')
    print('      (this removes JWT_SECRET_PREVIOUS and forces all remaining tokens to expire).')
    print('   2. Mark your calendar 6 months from now for next rotation.')


def cmd_finalize():
    env = read_env()
    if not env.get('JWT_SECRET_PREVIOUS'):
        print('Nothing to finalize — JWT_SECRET_PREVIOUS is already empty.')
        return
    write_env_kv(updates={}, removals=['JWT_SECRET_PREVIOUS'])
    print('✅ JWT_SECRET_PREVIOUS removed.')
    print('   All tokens signed with the old secret are now invalid.')
    restart_backend()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check', action='store_true', help='show rotation status')
    p.add_argument('--finalize', action='store_true', help='remove the previous secret after grace window')
    args = p.parse_args()

    if args.check:
        cmd_check()
    elif args.finalize:
        cmd_finalize()
    else:
        cmd_rotate()


if __name__ == '__main__':
    main()
