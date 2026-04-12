import os
from pathlib import Path

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Admin accounts configuration (multiple admins supported)
ADMIN_ACCOUNTS = [
    {
        "username": "herman.haba@servisprogn.com",
        "password": "Servisproguinea2026$2027",
        "role": "super-admin"
    },
    {
        "username": "barthelemy.haba@servisprogn.com",
        "password": "DDraper2026Servisprogn",
        "role": "super-admin"
    },
    {
        "username": "servispro@servisprogn.com",
        "password": "Servisproguinea2026#",
        "role": "super-admin"
    }
]

# Admin invitation code for registration
ADMIN_INVITE_CODE = os.environ.get('ADMIN_INVITE_CODE', 'SERVISPRO2024')

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
