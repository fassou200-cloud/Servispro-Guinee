import jwt
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import JWT_SECRET, JWT_SECRET_PREVIOUS, JWT_ALGORITHM, ADMIN_ACCOUNTS
from database import db
from utils.security import get_client_ip, is_ip_blocked, log_audit_event


def _decode_with_rotation(token: str):
    """Decode JWT trying CURRENT secret first, fall back to PREVIOUS during grace window."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError:
        if JWT_SECRET_PREVIOUS:
            return jwt.decode(token, JWT_SECRET_PREVIOUS, algorithms=[JWT_ALGORITHM])
        raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        login_paths = ["/api/auth/login", "/api/admin/login", "/api/customer/login", "/api/company/login"]
        
        if request.method == "POST" and any(request.url.path.endswith(path) for path in login_paths):
            client_ip = get_client_ip(request)
            
            if is_ip_blocked(client_ip):
                await log_audit_event(
                    event_type="RATE_LIMIT_BLOCKED",
                    ip_address=client_ip,
                    details={"path": str(request.url.path)},
                    success=False
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Trop de tentatives de connexion. Veuillez reessayer dans 15 minutes.",
                        "error_code": "RATE_LIMITED"
                    }
                )
        
        response = await call_next(request)
        return response


class AdminAuthMiddleware(BaseHTTPMiddleware):
    EXEMPT_PATHS = ["/api/admin/login", "/api/admin/register"]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        if not path.startswith("/api/admin"):
            return await call_next(request)
        
        if any(path.endswith(exempt) for exempt in self.EXEMPT_PATHS):
            return await call_next(request)
        
        if request.method == "OPTIONS":
            return await call_next(request)
        
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Token d'authentification admin requis"}
            )
        
        token = auth_header.split("Bearer ")[1]
        try:
            payload = _decode_with_rotation(token)
            user_id = payload.get("user_id")
            
            is_admin = False
            for admin_account in ADMIN_ACCOUNTS:
                if user_id == admin_account["username"]:
                    is_admin = True
                    break
            
            if not is_admin:
                admin_db = await db.admins.find_one({"id": user_id}, {"_id": 0})
                if admin_db:
                    is_admin = True
            
            if not is_admin:
                await log_audit_event(
                    event_type="ADMIN_UNAUTHORIZED_ACCESS",
                    user_id=user_id,
                    ip_address=get_client_ip(request),
                    details={"path": path, "method": request.method},
                    success=False
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Acces refuse. Droits administrateur requis."}
                )
            
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token expire. Veuillez vous reconnecter."}
            )
        except jwt.InvalidTokenError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token invalide"}
            )
        
        return await call_next(request)
