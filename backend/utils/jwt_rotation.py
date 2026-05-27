"""Helpers for JWT secret rotation.
Used by both the CLI script (`scripts/rotate_jwt_secret.py`) and the admin
HTTP endpoints (`/api/admin/jwt/rotate`, `/api/admin/jwt/finalize`).
"""
import re
import secrets
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ENV_PATH = Path('/app/backend/.env')


def read_env() -> dict:
    if not ENV_PATH.exists():
        return {}
    env = {}
    for line in ENV_PATH.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, _, v = line.partition('=')
            env[k.strip()] = v
    return env


def write_env_kv(updates: dict, removals: list[str]) -> None:
    """Rewrite .env preserving comments/order; update or insert keys, drop `removals`."""
    lines = ENV_PATH.read_text().splitlines() if ENV_PATH.exists() else []
    seen = set()
    out = []
    for line in lines:
        m = re.match(r'^([A-Z_][A-Z0-9_]*)=', line)
        if not m:
            out.append(line)
            continue
        key = m.group(1)
        if key in removals:
            continue
        if key in updates:
            out.append(f'{key}={updates[key]}')
            seen.add(key)
        else:
            out.append(line)
    for k, v in updates.items():
        if k not in seen:
            out.append(f'{k}={v}')
    ENV_PATH.write_text('\n'.join(out) + '\n')


def schedule_backend_restart(delay_seconds: int = 2) -> None:
    """Schedule a backend restart in a detached subprocess, so the HTTP response
    can be sent back to the admin before the supervisor kills the process.
    """
    subprocess.Popen(
        f'sleep {delay_seconds} && sudo supervisorctl restart backend',
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


def perform_rotation() -> dict:
    """Rotate JWT_SECRET — keep the old one as JWT_SECRET_PREVIOUS for the grace
    window (24h typically). Returns a small status dict.
    """
    env = read_env()
    current = env.get('JWT_SECRET', '').strip()
    if not current:
        raise RuntimeError('No current JWT_SECRET in .env to rotate from.')

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
    return {
        'ok': True,
        'rotated_at': now_iso,
        'grace_window_hours': 24,
        'next_step': "Wait 24h then call /api/admin/jwt/finalize",
    }


def perform_finalize() -> dict:
    """Remove JWT_SECRET_PREVIOUS — old tokens become invalid."""
    env = read_env()
    if not env.get('JWT_SECRET_PREVIOUS'):
        return {'ok': True, 'already_finalized': True}
    write_env_kv(updates={}, removals=['JWT_SECRET_PREVIOUS'])
    return {'ok': True, 'finalized_at': datetime.now(timezone.utc).isoformat()}
