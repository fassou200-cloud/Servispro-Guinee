from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import cloudinary
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Import config
from config import ALLOWED_ORIGINS, UPLOAD_DIR
from database import client

# Import middleware
from middleware import SecurityHeadersMiddleware, RateLimitMiddleware, AdminAuthMiddleware

# Import route modules
from routes.auth import router as auth_router
from routes.providers import router as providers_router
from routes.companies import router as companies_router
from routes.rentals import router as rentals_router
from routes.property_sales import router as property_sales_router
from routes.vehicles import router as vehicles_router
from routes.marketplace import router as marketplace_router
from routes.admin import router as admin_router
from routes.jobs import router as jobs_router
from routes.notifications import router as notifications_router
from routes.payments import router as payments_router
from routes.feedback import router as feedback_router
from routes.interim import router as interim_router
from routes.interim_phase2 import router as interim_phase2_router
from routes.interim_customer import router as interim_customer_router
from routes.otp import router as otp_router
from routes.admin_sms import router as admin_sms_router
from routes.sms_webhooks import router as sms_webhooks_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# Include all route modules with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(providers_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(rentals_router, prefix="/api")
app.include_router(property_sales_router, prefix="/api")
app.include_router(vehicles_router, prefix="/api")
app.include_router(marketplace_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(interim_router, prefix="/api")
app.include_router(interim_phase2_router, prefix="/api")
app.include_router(interim_customer_router, prefix="/api")
app.include_router(otp_router, prefix="/api")
app.include_router(admin_sms_router, prefix="/api")
app.include_router(sms_webhooks_router, prefix="/api")

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Add Security Headers Middleware (must be added first)
app.add_middleware(SecurityHeadersMiddleware)

# Add Admin Authentication Middleware (before rate limiting)
app.add_middleware(AdminAuthMiddleware)

# Add Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
