import os
from pathlib import Path

# JWT Configuration — REQUIRED in .env, fail fast if missing/default
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or JWT_SECRET == 'your-secret-key-change-in-production' or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET must be set in environment (.env) and at least 32 chars. "
        "Generate one with: python3 -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
# Optional: previous secret kept during a grace window (e.g., 24h after rotation)
# so existing tokens stay valid. Set to None / empty when no rotation in progress.
JWT_SECRET_PREVIOUS = os.environ.get('JWT_SECRET_PREVIOUS') or None
JWT_SECRET_ROTATED_AT = os.environ.get('JWT_SECRET_ROTATED_AT')  # ISO date string, informational
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Admin accounts — credentials loaded from environment ONLY.
# Format ADMIN_ACCOUNTS env var: "user1@x:pwd1,user2@x:pwd2"
_admin_env = os.environ.get('ADMIN_ACCOUNTS', '').strip()
ADMIN_ACCOUNTS = []
if _admin_env:
    for entry in _admin_env.split(','):
        if ':' in entry:
            u, p = entry.split(':', 1)
            ADMIN_ACCOUNTS.append({'username': u.strip(), 'password': p.strip(), 'role': 'super-admin'})

# Admin invitation code for registration — REQUIRED in .env
ADMIN_INVITE_CODE = os.environ.get('ADMIN_INVITE_CODE')
if not ADMIN_INVITE_CODE or len(ADMIN_INVITE_CODE) < 16:
    raise RuntimeError(
        "ADMIN_INVITE_CODE must be set in environment (.env) and at least 16 chars."
    )

# Rate Limiting Configuration
RATE_LIMIT_WINDOW = 300  # 5 minutes window
RATE_LIMIT_MAX_ATTEMPTS = 5  # Max failed attempts before blocking
RATE_LIMIT_BLOCK_DURATION = 900  # 15 minutes block

# File upload configuration
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# CORS Configuration
ALLOWED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'https://shop-marketplace-47.preview.emergentagent.com'),
    "https://shop-marketplace-47.preview.emergentagent.com",
    "https://servisprogn.com",
    "https://www.servisprogn.com",
    "http://servisprogn.com",
    "http://www.servisprogn.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
