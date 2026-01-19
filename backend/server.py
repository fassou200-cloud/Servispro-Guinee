from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import shutil
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Admin credentials (fixed super-admin)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Admin invitation code for registration
ADMIN_INVITE_CODE = "SERVISPRO2024"

# File upload configuration
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Contact filtering for messages - blocks phone numbers and emails
def filter_contact_info(message: str) -> tuple[str, bool]:
    """
    Filter out phone numbers and email addresses from messages.
    Returns tuple of (filtered_message, was_filtered)
    """
    original = message
    
    # Phone number patterns (international and local formats)
    phone_patterns = [
        r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',  # International format
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3,4}\b',  # Local format 620 00 00 00
        r'\b\d{9,12}\b',  # Continuous digits
        r'\b(?:224|00224)\s*\d{9}\b',  # Guinea specific
        r'\b6[0-9]{8}\b',  # Guinea mobile starting with 6
    ]
    
    # Email pattern
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    
    # Replace phone numbers
    for pattern in phone_patterns:
        message = re.sub(pattern, '[📵 Numéro masqué - Politique de confidentialité]', message, flags=re.IGNORECASE)
    
    # Replace emails
    message = re.sub(email_pattern, '[📧 Email masqué - Politique de confidentialité]', message, flags=re.IGNORECASE)
    
    # Check if message was modified
    was_filtered = message != original
    
    return message, was_filtered

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class ProfessionType(str, Enum):
    LOGISTICIEN = "Logisticien"
    ELECTROMECANICIEN = "Electromecanicien"
    MECANICIEN = "Mecanicien"
    PLOMBIER = "Plombier"
    MACON = "Macon"
    MENUISIER = "Menuisier"
    AGENT_IMMOBILIER = "AgentImmobilier"
    SOUDEUR = "Soudeur"
    CAMIONNEUR = "Camionneur"
    TRACTEUR = "Tracteur"
    VOITURE = "Voiture"
    AUTRES = "Autres"

class UserType(str, Enum):
    PROVIDER = "provider"
    CUSTOMER = "customer"

class JobStatus(str, Enum):
    PENDING = "Pending"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    PROVIDER_COMPLETED = "ProviderCompleted"  # Provider marked as done
    COMPLETED = "Completed"  # Customer confirmed

class ProviderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class PropertyType(str, Enum):
    APARTMENT = "Apartment"
    HOUSE = "House"

# Models
class RegisterInput(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    password: str
    profession: ProfessionType
    
    @field_validator('phone_number')
    def validate_phone(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class LoginInput(BaseModel):
    phone_number: str
    password: str
    user_type: Optional[UserType] = UserType.CUSTOMER

class CustomerRegisterInput(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    password: str
    
    @field_validator('phone_number')
    def validate_phone(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    first_name: str
    last_name: str
    phone_number: str
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profession: Optional[ProfessionType] = None
    about_me: Optional[str] = None
    online_status: Optional[bool] = None
    price: Optional[int] = None
    investigation_fee: Optional[int] = None

class ServiceProvider(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    first_name: str
    last_name: str
    phone_number: str
    profession: str
    about_me: Optional[str] = None
    profile_picture: Optional[str] = None
    id_verification_picture: Optional[str] = None
    online_status: bool = False
    price: Optional[int] = None
    investigation_fee: Optional[int] = None
    created_at: str

# Notification Models
class NotificationType(str, Enum):
    SERVICE_REQUEST = "service_request"
    PAYMENT_RECEIVED = "payment_received"
    JOB_ACCEPTED = "job_accepted"
    JOB_REJECTED = "job_rejected"
    JOB_COMPLETED = "job_completed"
    SYSTEM = "system"

class NotificationCreate(BaseModel):
    user_id: str
    user_type: str  # 'provider', 'customer', 'company'
    title: str
    message: str
    notification_type: NotificationType
    related_id: Optional[str] = None  # job_id, payment_id, etc.

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentCreate(BaseModel):
    job_id: str
    provider_id: str
    customer_phone: str
    customer_name: str
    amount: int
    payment_method: str  # 'orange_money', 'mtn_momo'

class JobOfferCreate(BaseModel):
    service_provider_id: str
    client_name: str
    service_type: str
    description: str
    location: Optional[str] = None
    scheduled_date: Optional[str] = None

class JobOfferUpdate(BaseModel):
    status: JobStatus

class JobOffer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    service_provider_id: str
    client_name: str
    service_type: str
    description: str
    location: Optional[str] = None
    scheduled_date: Optional[str] = None
    status: str
    created_at: str

# Visit Request Models for Rentals
class VisitRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VisitRequestCreate(BaseModel):
    rental_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    preferred_date: str
    preferred_time: Optional[str] = None
    message: Optional[str] = None

class VisitRequestUpdate(BaseModel):
    status: VisitRequestStatus
    response_message: Optional[str] = None

# Vehicle Sale Models
class VehicleSaleStatus(str, Enum):
    PENDING = "pending"       # En attente d'approbation admin
    APPROVED = "approved"     # Approuvé et visible
    SOLD = "sold"            # Vendu
    REJECTED = "rejected"    # Rejeté par admin

class VehicleSaleCreate(BaseModel):
    vehicle_type: str        # Voiture, Camion, Tracteur
    brand: str               # Marque
    model: str               # Modèle
    year: int                # Année
    mileage: Optional[int] = None  # Kilométrage
    fuel_type: Optional[str] = None  # Essence, Diesel, Électrique
    transmission: Optional[str] = None  # Manuelle, Automatique
    price: float             # Prix de vente
    description: str
    location: str
    condition: str = "used"  # new, used, refurbished
    photos: List[str] = []

class VehicleSaleUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None

class VehicleSaleInquiry(BaseModel):
    vehicle_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    message: str

class RentalListingCreate(BaseModel):
    property_type: PropertyType
    title: str
    description: str
    location: str
    rental_price: Optional[float] = None  # For long-term rentals (monthly)
    # New fields for short-term rentals (Airbnb-style)
    rental_type: str = "long_term"  # "long_term" or "short_term"
    price_per_night: Optional[float] = None  # For short-term rentals
    min_nights: Optional[int] = 1  # Minimum nights for short-term
    max_guests: Optional[int] = None  # Maximum number of guests
    amenities: List[str] = []  # List of amenities (WiFi, AC, etc.)
    is_available: bool = True  # Availability status
    available_from: Optional[str] = None  # Available from date
    available_to: Optional[str] = None  # Available to date
    
    @model_validator(mode='after')
    def validate_prices(self):
        """Validate that appropriate price is set based on rental type"""
        if self.rental_type == 'long_term':
            if self.rental_price is None or self.rental_price <= 0:
                raise ValueError('Le prix mensuel doit être supérieur à 0 pour les locations longue durée')
        elif self.rental_type == 'short_term':
            if self.price_per_night is None or self.price_per_night <= 0:
                raise ValueError('Le prix par nuit doit être supérieur à 0 pour les locations courte durée')
        return self

class RentalListing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    service_provider_id: str
    provider_name: str
    provider_phone: str
    property_type: str
    title: str
    description: str
    location: str
    rental_price: Optional[float] = None  # Optional for short-term rentals
    # New fields for short-term rentals
    rental_type: str = "long_term"
    price_per_night: Optional[float] = None
    min_nights: Optional[int] = 1
    max_guests: Optional[int] = None
    amenities: List[str] = []
    is_available: bool = True
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    photos: List[str] = []
    # Document fields for compliance
    titre_foncier: Optional[str] = None  # Land title document
    registration_ministere: Optional[str] = None  # Ministry of Housing registration
    seller_id_document: Optional[str] = None  # Seller's ID/Passport
    documents_additionnels: List[str] = []  # Additional documents
    # Admin approval fields
    approval_status: str = "pending"  # pending, approved, rejected
    rejection_reason: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str
    updated_at: str

class ListingApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Property Sale Model (Vente de Maison/Terrain)
class PropertySaleCreate(BaseModel):
    property_type: str  # Maison, Terrain, Appartement, Villa, Immeuble
    title: str
    description: str
    location: str
    sale_price: int  # Prix de vente en GNF
    surface_area: Optional[str] = None  # Surface en m²
    num_rooms: Optional[int] = None  # Nombre de pièces (pour maisons)
    num_bathrooms: Optional[int] = None
    has_garage: bool = False
    has_garden: bool = False
    has_pool: bool = False
    year_built: Optional[int] = None
    features: List[str] = []
    is_negotiable: bool = True

class PropertySale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    agent_id: str
    agent_name: str
    agent_phone: str
    property_type: str
    title: str
    description: str
    location: str
    sale_price: int
    surface_area: Optional[str] = None
    num_rooms: Optional[int] = None
    num_bathrooms: Optional[int] = None
    has_garage: bool = False
    has_garden: bool = False
    has_pool: bool = False
    year_built: Optional[int] = None
    features: List[str] = []
    is_negotiable: bool = True
    is_available: bool = True
    # Required Documents
    photos: List[str] = []
    titre_foncier: Optional[str] = None  # Land title document (required)
    registration_ministere: Optional[str] = None  # Ministry of Housing registration
    seller_id_document: Optional[str] = None  # Seller's ID/Passport (required)
    documents_additionnels: List[str] = []  # Other documents
    # Document verification status
    documents_verified: bool = False
    verification_date: Optional[str] = None
    created_at: str
    updated_at: str

class ReviewCreate(BaseModel):
    service_provider_id: str
    reviewer_name: str
    rating: int
    comment: str
    
    @field_validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    service_provider_id: str
    reviewer_name: str
    rating: int
    comment: str
    created_at: str

# Chat Models for Rental Listings
class ChatMessageCreate(BaseModel):
    rental_id: str
    message: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    rental_id: str
    sender_id: str
    sender_name: str
    sender_type: str  # 'owner' or 'customer'
    message: str
    created_at: str

# Vehicle Listing Models
class VehicleType(str, Enum):
    CAMION = "Camion"
    TRACTEUR = "Tracteur"
    VOITURE = "Voiture"

class FuelType(str, Enum):
    ESSENCE = "Essence"
    DIESEL = "Diesel"
    ELECTRIQUE = "Electrique"
    HYBRIDE = "Hybride"

class VehicleListingCreate(BaseModel):
    vehicle_type: str  # Camion, Tracteur, Voiture
    brand: str  # Marque
    model: str  # Modèle
    year: int  # Année
    fuel_type: str  # Type de carburant
    transmission: str = "Manuelle"  # Manuelle ou Automatique
    seats: Optional[int] = None  # Nombre de places (pour voitures)
    load_capacity: Optional[str] = None  # Capacité de charge (pour camions)
    engine_power: Optional[str] = None  # Puissance moteur (pour tracteurs)
    description: str
    location: str
    price_per_day: int  # Prix par jour en GNF
    price_per_week: Optional[int] = None  # Prix par semaine
    price_per_month: Optional[int] = None  # Prix par mois
    is_available: bool = True
    features: List[str] = []  # Climatisation, GPS, etc.

class VehicleListing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    owner_id: str
    owner_name: str
    vehicle_type: str
    brand: str
    model: str
    year: int
    fuel_type: str
    transmission: str
    seats: Optional[int] = None
    load_capacity: Optional[str] = None
    engine_power: Optional[str] = None
    description: str
    location: str
    price_per_day: int
    price_per_week: Optional[int] = None
    price_per_month: Optional[int] = None
    is_available: bool
    features: List[str] = []
    photos: List[str] = []
    created_at: str

class VehicleBookingCreate(BaseModel):
    vehicle_id: str
    start_date: str
    end_date: str
    message: Optional[str] = None

class VehicleBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    vehicle_id: str
    vehicle_title: str
    customer_id: str
    customer_name: str
    customer_phone: str
    owner_id: str
    start_date: str
    end_date: str
    total_price: int
    status: str  # pending, accepted, rejected, completed
    message: Optional[str] = None
    created_at: str

# Company Models
class CompanySector(str, Enum):
    CONSTRUCTION = "Construction"
    TRANSPORT = "Transport"
    NETTOYAGE = "Nettoyage"
    SECURITE = "Securite"
    INFORMATIQUE = "Informatique"
    RESTAURATION = "Restauration"
    IMMOBILIER = "Immobilier"
    COMMERCE = "Commerce"
    AGRICULTURE = "Agriculture"
    INDUSTRIE = "Industrie"
    SERVICES = "Services"
    AUTRES = "Autres"

class CompanyRegisterInput(BaseModel):
    company_name: str
    rccm_number: str  # Registre du Commerce
    nif_number: Optional[str] = None  # Numéro d'Identification Fiscale
    sector: str
    address: str
    city: str
    region: str
    phone_number: str
    email: Optional[str] = None
    website: Optional[str] = None
    description: str
    password: str
    contact_person_name: str
    contact_person_phone: str
    
    @field_validator('phone_number')
    def validate_phone(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class CompanyLoginInput(BaseModel):
    rccm_number: str
    password: str

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    company_name: str
    rccm_number: str
    nif_number: Optional[str] = None
    sector: str
    address: str
    city: str
    region: str
    phone_number: str
    email: Optional[str] = None
    website: Optional[str] = None
    description: str
    contact_person_name: str
    contact_person_phone: str
    # Documents
    logo: Optional[str] = None
    licence_exploitation: Optional[str] = None
    rccm_document: Optional[str] = None
    nif_document: Optional[str] = None
    attestation_fiscale: Optional[str] = None
    documents_additionnels: List[str] = []
    # Status
    verification_status: str = "pending"  # pending, approved, rejected
    online_status: bool = False
    # Timestamps
    created_at: str
    updated_at: str

class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    sector: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    contact_person_name: Optional[str] = None
    contact_person_phone: Optional[str] = None
    online_status: Optional[bool] = None

class CompanyServiceCreate(BaseModel):
    title: str
    description: str
    category: str
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    duration: Optional[str] = None
    location: str
    is_available: bool = True

class CompanyService(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    company_id: str
    company_name: str
    title: str
    description: str
    category: str
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    duration: Optional[str] = None
    location: str
    is_available: bool = True
    created_at: str

class CompanyJobOfferCreate(BaseModel):
    title: str
    description: str
    requirements: str
    location: str
    contract_type: str  # CDI, CDD, Stage, Freelance
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    deadline: Optional[str] = None
    is_active: bool = True

class CompanyJobOffer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    company_id: str
    company_name: str
    company_logo: Optional[str] = None
    title: str
    description: str
    requirements: str
    location: str
    contract_type: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    deadline: Optional[str] = None
    is_active: bool = True
    applications_count: int = 0
    created_at: str

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        
        user = await db.service_providers.find_one({'id': user_id}, {'_id': 0, 'password': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_company(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated company"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        company_id = payload.get('user_id')
        
        company = await db.companies.find_one({'id': company_id}, {'_id': 0, 'password': 0})
        if not company:
            raise HTTPException(status_code=401, detail="Company not found")
        return company
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated customer"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        customer_id = payload.get('user_id')
        
        customer = await db.customers.find_one({'id': customer_id}, {'_id': 0, 'password': 0})
        if not customer:
            raise HTTPException(status_code=401, detail="Customer not found")
        return customer
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(input_data: RegisterInput):
    # Check if phone number already exists
    existing_user = await db.service_providers.find_one({'phone_number': input_data.phone_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(input_data.password)
    
    user_doc = {
        'id': user_id,
        'first_name': input_data.first_name,
        'last_name': input_data.last_name,
        'phone_number': input_data.phone_number,
        'password': hashed_pwd,
        'profession': input_data.profession.value,
        'about_me': '',
        'profile_picture': None,
        'id_verification_picture': None,
        'online_status': False,
        'verification_status': ProviderStatus.PENDING.value,
        'price': None,  # Tarif en GNF
        'investigation_fee': None,  # Tarif d'investigation en GNF
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_providers.insert_one(user_doc)
    
    # Generate token
    token = create_token(user_id)
    
    # Get user from database without _id and password
    user_response = await db.service_providers.find_one({'id': user_id}, {'_id': 0, 'password': 0})
    
    return AuthResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(input_data: LoginInput):
    # Determine which collection to search
    if input_data.user_type == UserType.PROVIDER:
        collection = db.service_providers
    else:
        collection = db.customers
    
    # Find user
    user = await collection.find_one({'phone_number': input_data.phone_number})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(input_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = create_token(user['id'])
    
    # Return user without password
    user_response = {k: v for k, v in user.items() if k not in ['password', '_id']}
    user_response['user_type'] = input_data.user_type.value
    
    return AuthResponse(token=token, user=user_response)

@api_router.post("/auth/customer/register", response_model=AuthResponse)
async def register_customer(input_data: CustomerRegisterInput):
    # Check if phone number already exists
    existing_user = await db.customers.find_one({'phone_number': input_data.phone_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create customer
    customer_id = str(uuid.uuid4())
    hashed_pwd = hash_password(input_data.password)
    
    customer_doc = {
        'id': customer_id,
        'first_name': input_data.first_name,
        'last_name': input_data.last_name,
        'phone_number': input_data.phone_number,
        'password': hashed_pwd,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.insert_one(customer_doc)
    
    # Generate token
    token = create_token(customer_id)
    
    # Return customer without password and _id
    customer_response = {k: v for k, v in customer_doc.items() if k not in ['password', '_id']}
    customer_response['user_type'] = 'customer'
    
    return AuthResponse(token=token, user=customer_response)

# Company Auth Routes
@api_router.post("/auth/company/register", response_model=AuthResponse)
async def register_company(input_data: CompanyRegisterInput):
    """Register a new company"""
    # Check if RCCM number already exists
    existing_company = await db.companies.find_one({'rccm_number': input_data.rccm_number})
    if existing_company:
        raise HTTPException(status_code=400, detail="Ce numéro RCCM est déjà enregistré")
    
    # Check if phone number already exists
    existing_phone = await db.companies.find_one({'phone_number': input_data.phone_number})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà enregistré")
    
    # Create company
    company_id = str(uuid.uuid4())
    hashed_pwd = hash_password(input_data.password)
    now = datetime.now(timezone.utc).isoformat()
    
    company_doc = {
        'id': company_id,
        'company_name': input_data.company_name,
        'rccm_number': input_data.rccm_number,
        'nif_number': input_data.nif_number,
        'sector': input_data.sector,
        'address': input_data.address,
        'city': input_data.city,
        'region': input_data.region,
        'phone_number': input_data.phone_number,
        'email': input_data.email,
        'website': input_data.website,
        'description': input_data.description,
        'contact_person_name': input_data.contact_person_name,
        'contact_person_phone': input_data.contact_person_phone,
        'password': hashed_pwd,
        # Documents (to be uploaded later)
        'logo': None,
        'licence_exploitation': None,
        'rccm_document': None,
        'nif_document': None,
        'attestation_fiscale': None,
        'documents_additionnels': [],
        # Status
        'verification_status': 'pending',
        'online_status': False,
        'created_at': now,
        'updated_at': now
    }
    
    await db.companies.insert_one(company_doc)
    
    # Generate token
    token = create_token(company_id)
    
    # Return company without password and _id
    company_response = {k: v for k, v in company_doc.items() if k not in ['password', '_id']}
    company_response['user_type'] = 'company'
    
    return AuthResponse(token=token, user=company_response)

@api_router.post("/auth/company/login", response_model=AuthResponse)
async def login_company(input_data: CompanyLoginInput):
    """Login for companies using RCCM number"""
    company = await db.companies.find_one({'rccm_number': input_data.rccm_number})
    if not company:
        raise HTTPException(status_code=401, detail="Numéro RCCM ou mot de passe incorrect")
    
    if not verify_password(input_data.password, company['password']):
        raise HTTPException(status_code=401, detail="Numéro RCCM ou mot de passe incorrect")
    
    # Generate token
    token = create_token(company['id'])
    
    # Return company without password and _id
    company_response = {k: v for k, v in company.items() if k not in ['password', '_id']}
    company_response['user_type'] = 'company'
    
    return AuthResponse(token=token, user=company_response)

# Company Profile Routes
@api_router.get("/company/profile/me")
async def get_company_profile(current_company: dict = Depends(get_current_company)):
    """Get current company profile"""
    return current_company

@api_router.put("/company/profile/me")
async def update_company_profile(update_data: CompanyProfileUpdate, current_company: dict = Depends(get_current_company)):
    """Update company profile"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.companies.update_one(
            {'id': current_company['id']},
            {'$set': update_dict}
        )
    
    updated_company = await db.companies.find_one({'id': current_company['id']}, {'_id': 0, 'password': 0})
    return updated_company

@api_router.post("/company/upload-logo")
async def upload_company_logo(file: UploadFile = File(...), current_company: dict = Depends(get_current_company)):
    """Upload company logo"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    file_extension = file.filename.split('.')[-1]
    filename = f"company_logo_{current_company['id']}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logo_url = f"/api/uploads/{filename}"
    await db.companies.update_one(
        {'id': current_company['id']},
        {'$set': {'logo': logo_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'logo': logo_url}

@api_router.post("/company/upload-document/{document_type}")
async def upload_company_document(
    document_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload company document (licence, rccm, nif, attestation_fiscale, additionnels)"""
    valid_types = ['licence_exploitation', 'rccm_document', 'nif_document', 'attestation_fiscale', 'documents_additionnels']
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types acceptés: {', '.join(valid_types)}")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (JPG, PNG) ou un PDF")
    
    # Generate filename
    file_extension = file.filename.split('.')[-1]
    filename = f"company_doc_{current_company['id']}_{document_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    document_url = f"/api/uploads/{filename}"
    
    # Update company
    if document_type == 'documents_additionnels':
        await db.companies.update_one(
            {'id': current_company['id']},
            {
                '$push': {'documents_additionnels': document_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.companies.update_one(
            {'id': current_company['id']},
            {'$set': {document_type: document_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': document_url, 'document_type': document_type}

# Company Services Routes
@api_router.post("/company/services")
async def create_company_service(
    service_data: CompanyServiceCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a new company service"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des services")
    
    service_id = str(uuid.uuid4())
    
    service_doc = {
        'id': service_id,
        'company_id': current_company['id'],
        'company_name': current_company['company_name'],
        **service_data.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_services.insert_one(service_doc)
    
    return {k: v for k, v in service_doc.items() if k != '_id'}

@api_router.get("/company/services/my")
async def get_my_company_services(current_company: dict = Depends(get_current_company)):
    """Get all services of current company"""
    services = await db.company_services.find(
        {'company_id': current_company['id']},
        {'_id': 0}
    ).to_list(100)
    return services

@api_router.get("/company-services")
async def get_all_company_services(
    category: Optional[str] = None,
    location: Optional[str] = None
):
    """Get all company services (public)"""
    query = {}
    if category:
        query['category'] = category
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    
    services = await db.company_services.find(query, {'_id': 0}).to_list(100)
    return services

# Company Job Offers Routes
@api_router.post("/company/job-offers")
async def create_company_job_offer(
    job_data: CompanyJobOfferCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a new job offer"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des offres d'emploi")
    
    job_id = str(uuid.uuid4())
    
    job_doc = {
        'id': job_id,
        'company_id': current_company['id'],
        'company_name': current_company['company_name'],
        'company_logo': current_company.get('logo'),
        **job_data.model_dump(),
        'applications_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_job_offers.insert_one(job_doc)
    
    return {k: v for k, v in job_doc.items() if k != '_id'}

@api_router.get("/company/job-offers/my")
async def get_my_company_job_offers(current_company: dict = Depends(get_current_company)):
    """Get all job offers of current company"""
    jobs = await db.company_job_offers.find(
        {'company_id': current_company['id']},
        {'_id': 0}
    ).to_list(100)
    return jobs

@api_router.get("/job-offers")
async def get_all_job_offers(
    contract_type: Optional[str] = None,
    location: Optional[str] = None
):
    """Get all active job offers (public)"""
    query = {'is_active': True}
    if contract_type:
        query['contract_type'] = contract_type
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    
    jobs = await db.company_job_offers.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return jobs

@api_router.get("/job-offers/{job_id}")
async def get_job_offer(job_id: str):
    """Get a specific job offer"""
    job = await db.company_job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Offre d'emploi non trouvée")
    return job

# ==================== COMPANY PROPERTY LISTINGS (Rentals & Sales) ====================

@api_router.post("/company/rentals")
async def create_company_rental(
    listing_data: RentalListingCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a rental listing for an approved real estate company"""
    # Check if company is approved
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des annonces")
    
    # Check if company is in real estate sector
    if current_company.get('sector') != 'Immobilier':
        raise HTTPException(status_code=403, detail="Seules les entreprises du secteur immobilier peuvent publier des locations")
    
    listing_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    listing_doc = {
        'id': listing_id,
        'service_provider_id': current_company['id'],  # Using company ID
        'provider_name': current_company['company_name'],
        'provider_phone': current_company['phone_number'],
        'owner_type': 'company',  # Indicate it's a company listing
        'property_type': listing_data.property_type.value,
        'title': listing_data.title,
        'description': listing_data.description,
        'location': listing_data.location,
        'rental_price': listing_data.rental_price,
        'rental_type': listing_data.rental_type,
        'price_per_night': listing_data.price_per_night,
        'min_nights': listing_data.min_nights,
        'max_guests': listing_data.max_guests,
        'amenities': listing_data.amenities,
        'is_available': listing_data.is_available,
        'available_from': listing_data.available_from,
        'available_to': listing_data.available_to,
        'photos': [],
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        # Admin approval fields
        'approval_status': ListingApprovalStatus.PENDING.value,
        'rejection_reason': None,
        'approved_at': None,
        'approved_by': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.rental_listings.insert_one(listing_doc)
    return {k: v for k, v in listing_doc.items() if k != '_id'}

@api_router.get("/company/rentals/my")
async def get_company_rentals(current_company: dict = Depends(get_current_company)):
    """Get all rental listings for the current company"""
    rentals = await db.rental_listings.find(
        {'service_provider_id': current_company['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return rentals

@api_router.post("/company/rentals/{rental_id}/upload-photo")
async def upload_company_rental_photo(
    rental_id: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a photo for a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"company_rental_{rental_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/{filename}"
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'photo_url': photo_url, 'message': 'Photo uploadée avec succès'}

@api_router.post("/company/rentals/{rental_id}/upload-document/{doc_type}")
async def upload_company_rental_document(
    rental_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a document for a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'documents_additionnels']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"company_rental_doc_{rental_id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/{filename}"
    
    if doc_type == 'documents_additionnels':
        await db.rental_listings.update_one(
            {'id': rental_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.rental_listings.update_one(
            {'id': rental_id},
            {'$set': {doc_type: doc_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}

@api_router.delete("/company/rentals/{rental_id}")
async def delete_company_rental(
    rental_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Delete a company rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.rental_listings.delete_one({'id': rental_id})
    await db.chat_messages.delete_many({'rental_id': rental_id})
    
    return {'message': 'Annonce supprimée avec succès'}

# Company Property Sales Routes
@api_router.post("/company/property-sales")
async def create_company_property_sale(
    sale_data: PropertySaleCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a property sale listing for an approved real estate company"""
    if current_company.get('verification_status') != 'approved':
        raise HTTPException(status_code=403, detail="Votre entreprise doit être approuvée pour publier des ventes")
    
    if current_company.get('sector') != 'Immobilier':
        raise HTTPException(status_code=403, detail="Seules les entreprises du secteur immobilier peuvent publier des ventes")
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sale_doc = {
        'id': sale_id,
        'agent_id': current_company['id'],  # Using company ID
        'agent_name': current_company['company_name'],
        'agent_phone': current_company['phone_number'],
        'owner_type': 'company',  # Indicate it's a company listing
        'property_type': sale_data.property_type,
        'title': sale_data.title,
        'description': sale_data.description,
        'location': sale_data.location,
        'sale_price': sale_data.sale_price,
        'surface_area': sale_data.surface_area,
        'num_rooms': sale_data.num_rooms,
        'num_bathrooms': sale_data.num_bathrooms,
        'has_garage': sale_data.has_garage,
        'has_garden': sale_data.has_garden,
        'has_pool': sale_data.has_pool,
        'year_built': sale_data.year_built,
        'features': sale_data.features,
        'is_negotiable': sale_data.is_negotiable,
        'is_available': True,
        'photos': [],
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        'documents_verified': False,
        'verification_date': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.property_sales.insert_one(sale_doc)
    return {k: v for k, v in sale_doc.items() if k != '_id'}

@api_router.get("/company/property-sales/my")
async def get_company_property_sales(current_company: dict = Depends(get_current_company)):
    """Get all property sales for the current company"""
    sales = await db.property_sales.find(
        {'agent_id': current_company['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return sales

@api_router.post("/company/property-sales/{sale_id}/upload-photo")
async def upload_company_sale_photo(
    sale_id: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a photo for a company property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"company_sale_{sale_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/{filename}"
    await db.property_sales.update_one(
        {'id': sale_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"photo_url": photo_url, "message": "Photo uploadée avec succès"}

@api_router.post("/company/property-sales/{sale_id}/upload-document/{doc_type}")
async def upload_company_sale_document(
    sale_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_company: dict = Depends(get_current_company)
):
    """Upload a document for a company property sale"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'documents_additionnels']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"company_sale_doc_{sale_id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/{filename}"
    
    if doc_type == 'documents_additionnels':
        await db.property_sales.update_one(
            {'id': sale_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.property_sales.update_one(
            {'id': sale_id},
            {'$set': {doc_type: doc_url, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}

@api_router.delete("/company/property-sales/{sale_id}")
async def delete_company_property_sale(
    sale_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Delete a company property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_company['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.property_sales.delete_one({'id': sale_id})
    return {'message': 'Propriété supprimée avec succès'}

# Public Companies Route
@api_router.get("/companies")
async def get_all_companies(
    sector: Optional[str] = None,
    region: Optional[str] = None
):
    """Get all approved companies (public)"""
    query = {'verification_status': 'approved'}
    if sector:
        query['sector'] = sector
    if region:
        query['region'] = region
    
    companies = await db.companies.find(query, {'_id': 0, 'password': 0}).to_list(100)
    return companies

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str):
    """Get a specific company (public)"""
    company = await db.companies.find_one(
        {'id': company_id, 'verification_status': 'approved'},
        {'_id': 0, 'password': 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return company

# Profile Routes
@api_router.get("/profile/me", response_model=ServiceProvider)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return ServiceProvider(**current_user)

@api_router.put("/profile/me")
async def update_profile(update_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        if 'profession' in update_dict:
            update_dict['profession'] = update_dict['profession'].value
        
        await db.service_providers.update_one(
            {'id': current_user['id']},
            {'$set': update_dict}
        )
    
    updated_user = await db.service_providers.find_one({'id': current_user['id']}, {'_id': 0, 'password': 0})
    return updated_user

@api_router.post("/profile/upload-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    filename = f"{current_user['id']}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user profile
    profile_picture_url = f"/api/uploads/{filename}"
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'profile_picture': profile_picture_url}}
    )
    
    return {'profile_picture': profile_picture_url}

@api_router.post("/profile/upload-id-verification")
async def upload_id_verification(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    filename = f"{current_user['id']}_id_verification_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user profile
    id_verification_url = f"/api/uploads/{filename}"
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'id_verification_picture': id_verification_url}}
    )
    
    return {'id_verification_picture': id_verification_url}

@api_router.put("/profile/online-status")
async def update_online_status(current_user: dict = Depends(get_current_user)):
    """Toggle the online status of a service provider"""
    current_status = current_user.get('online_status', False)
    new_status = not current_status
    
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': new_status}}
    )
    
    return {'online_status': new_status}

@api_router.put("/profile/set-online")
async def set_online(current_user: dict = Depends(get_current_user)):
    """Set provider as online"""
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': True}}
    )
    return {'online_status': True}

@api_router.put("/profile/set-offline")
async def set_offline(current_user: dict = Depends(get_current_user)):
    """Set provider as offline"""
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'online_status': False}}
    )
    return {'online_status': False}

@api_router.get("/providers", response_model=List[ServiceProvider])
async def get_all_providers():
    providers = await db.service_providers.find({}, {'_id': 0, 'password': 0}).to_list(100)
    return [ServiceProvider(**p) for p in providers]

@api_router.get("/providers/{provider_id}", response_model=ServiceProvider)
async def get_provider_by_id(provider_id: str):
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0, 'password': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return ServiceProvider(**provider)

# Job Offer Routes
@api_router.post("/jobs", response_model=JobOffer)
async def create_job_offer(job_data: JobOfferCreate):
    # Verify provider exists
    provider = await db.service_providers.find_one({'id': job_data.service_provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Service provider not found")
    
    job_id = str(uuid.uuid4())
    job_doc = {
        'id': job_id,
        'service_provider_id': job_data.service_provider_id,
        'client_name': job_data.client_name,
        'service_type': job_data.service_type,
        'description': job_data.description,
        'location': job_data.location,
        'scheduled_date': job_data.scheduled_date,
        'status': JobStatus.PENDING.value,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.job_offers.insert_one(job_doc)
    
    job_response = {k: v for k, v in job_doc.items() if k != '_id'}
    return JobOffer(**job_response)

@api_router.get("/jobs/my-jobs", response_model=List[JobOffer])
async def get_my_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await db.job_offers.find({'service_provider_id': current_user['id']}, {'_id': 0}).to_list(100)
    return [JobOffer(**job) for job in jobs]

@api_router.put("/jobs/{job_id}")
async def update_job_status(job_id: str, update_data: JobOfferUpdate, current_user: dict = Depends(get_current_user)):
    # Find job and verify ownership
    job = await db.job_offers.find_one({'id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': {'status': update_data.status.value}}
    )
    
    updated_job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    return updated_job

# Rental Listing Routes
@api_router.post("/rentals", response_model=RentalListing)
async def create_rental_listing(listing_data: RentalListingCreate, current_user: dict = Depends(get_current_user)):
    listing_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    listing_doc = {
        'id': listing_id,
        'service_provider_id': current_user['id'],
        'provider_name': f"{current_user['first_name']} {current_user['last_name']}",
        'provider_phone': current_user['phone_number'],
        'property_type': listing_data.property_type.value,
        'title': listing_data.title,
        'description': listing_data.description,
        'location': listing_data.location,
        'rental_price': listing_data.rental_price,
        # New short-term rental fields
        'rental_type': listing_data.rental_type,
        'price_per_night': listing_data.price_per_night,
        'min_nights': listing_data.min_nights,
        'max_guests': listing_data.max_guests,
        'amenities': listing_data.amenities,
        'is_available': listing_data.is_available,
        'available_from': listing_data.available_from,
        'available_to': listing_data.available_to,
        'photos': [],
        # Document fields
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        # Admin approval - starts as pending
        'approval_status': ListingApprovalStatus.PENDING.value,
        'rejection_reason': None,
        'approved_at': None,
        'approved_by': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.rental_listings.insert_one(listing_doc)
    
    listing_response = {k: v for k, v in listing_doc.items() if k != '_id'}
    return RentalListing(**listing_response)

@api_router.get("/rentals", response_model=List[RentalListing])
async def get_all_rentals(rental_type: Optional[str] = None, is_available: Optional[bool] = None):
    """Get all APPROVED rentals with optional filters (public endpoint)"""
    query = {'approval_status': ListingApprovalStatus.APPROVED.value}  # Only show approved listings
    if rental_type:
        query['rental_type'] = rental_type
    if is_available is not None:
        query['is_available'] = is_available
    
    rentals = await db.rental_listings.find(query, {'_id': 0}).to_list(100)
    return [RentalListing(**r) for r in rentals]

@api_router.get("/rentals/my-listings", response_model=List[RentalListing])
async def get_my_rental_listings(current_user: dict = Depends(get_current_user)):
    """Get all rental listings for the current provider (including pending/rejected)"""
    rentals = await db.rental_listings.find({'service_provider_id': current_user['id']}, {'_id': 0}).to_list(100)
    return [RentalListing(**r) for r in rentals]

@api_router.put("/rentals/{rental_id}/availability")
async def update_rental_availability(rental_id: str, is_available: bool, current_user: dict = Depends(get_current_user)):
    """Toggle availability of a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {'$set': {'is_available': is_available, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'is_available': is_available}

@api_router.put("/rentals/{rental_id}")
async def update_rental_listing(rental_id: str, listing_data: RentalListingCreate, current_user: dict = Depends(get_current_user)):
    """Update a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_doc = {
        'property_type': listing_data.property_type.value,
        'title': listing_data.title,
        'description': listing_data.description,
        'location': listing_data.location,
        'rental_price': listing_data.rental_price,
        'rental_type': listing_data.rental_type,
        'price_per_night': listing_data.price_per_night,
        'min_nights': listing_data.min_nights,
        'max_guests': listing_data.max_guests,
        'amenities': listing_data.amenities,
        'is_available': listing_data.is_available,
        'available_from': listing_data.available_from,
        'available_to': listing_data.available_to,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.rental_listings.update_one({'id': rental_id}, {'$set': update_doc})
    
    updated_rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    return RentalListing(**updated_rental)

@api_router.get("/rentals/{rental_id}", response_model=RentalListing)
async def get_rental_by_id(rental_id: str):
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    return RentalListing(**rental)

@api_router.post("/rentals/{rental_id}/upload-photo")
async def upload_rental_photo(rental_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Find rental and verify ownership
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to update this listing")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    filename = f"rental_{rental_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update rental photos array
    photo_url = f"/api/uploads/{filename}"
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {'photo_url': photo_url}

@api_router.delete("/rentals/{rental_id}")
async def delete_rental_listing(rental_id: str, current_user: dict = Depends(get_current_user)):
    # Find rental and verify ownership
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental listing not found")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
    
    await db.rental_listings.delete_one({'id': rental_id})
    return {'message': 'Rental listing deleted successfully'}

# Document Upload Routes for Rentals
@api_router.post("/rentals/{rental_id}/upload-document/{doc_type}")
async def upload_rental_document(
    rental_id: str, 
    doc_type: str,  # titre_foncier, registration_ministere, seller_id_document, documents_additionnels
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Upload required documents for a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'documents_additionnels']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"rental_doc_{rental_id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/{filename}"
    
    # Update based on document type
    if doc_type == 'documents_additionnels':
        await db.rental_listings.update_one(
            {'id': rental_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.rental_listings.update_one(
            {'id': rental_id},
            {
                '$set': {
                    doc_type: doc_url,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {'document_url': doc_url, 'document_type': doc_type, 'message': 'Document uploadé avec succès'}

# ==================== VISIT REQUESTS (Demandes de Visite) ====================

@api_router.post("/visit-requests")
async def create_visit_request(request_data: VisitRequestCreate):
    """Create a visit request for a rental property"""
    # Verify rental exists
    rental = await db.rental_listings.find_one({'id': request_data.rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    # Get service fees for AgentImmobilier
    fees = await db.service_fees.find_one({'profession': 'AgentImmobilier'}, {'_id': 0})
    frais_visite = fees.get('frais_visite', 0) if fees else 0
    
    # Determine owner - could be service_provider_id or company_id
    owner_id = rental.get('service_provider_id') or rental.get('company_id')
    owner_type = 'company' if rental.get('company_id') else 'provider'
    
    visit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    visit_doc = {
        'id': visit_id,
        'rental_id': request_data.rental_id,
        'rental_title': rental.get('title', ''),
        'rental_location': rental.get('location', ''),
        'provider_id': owner_id,
        'owner_type': owner_type,
        'customer_name': request_data.customer_name,
        'customer_phone': request_data.customer_phone,
        'customer_email': request_data.customer_email,
        'preferred_date': request_data.preferred_date,
        'preferred_time': request_data.preferred_time,
        'message': request_data.message,
        'frais_visite': frais_visite,
        'payment_status': 'pending',  # pending, paid
        'status': VisitRequestStatus.PENDING.value,
        'created_at': now,
        'updated_at': now
    }
    
    await db.visit_requests.insert_one(visit_doc)
    
    # Create notification for the owner
    if owner_id:
        notification_doc = {
            'id': str(uuid.uuid4()),
            'user_id': owner_id,
            'user_type': owner_type,
            'title': 'Nouvelle demande de visite',
            'message': f"{request_data.customer_name} souhaite visiter votre bien '{rental.get('title', 'Propriété')}' le {request_data.preferred_date}",
            'notification_type': 'visit_request',
            'related_id': visit_id,
            'is_read': False,
            'created_at': now
        }
        await db.notifications.insert_one(notification_doc)
    
    return {
        'id': visit_id,
        'message': 'Demande de visite envoyée avec succès',
        'frais_visite': frais_visite,
        'status': 'pending'
    }

@api_router.get("/visit-requests/my-requests")
async def get_my_visit_requests(current_user: dict = Depends(get_current_user)):
    """Get visit requests for the current provider/company's rentals"""
    user_id = current_user.get('id')
    
    # Get all visit requests for this owner (check both provider_id and owner_id for compatibility)
    requests = await db.visit_requests.find(
        {'$or': [{'provider_id': user_id}, {'owner_id': user_id}]},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return requests

@api_router.get("/visit-requests/customer/{customer_phone}")
async def get_customer_visit_requests(customer_phone: str):
    """Get visit requests for a customer by phone number"""
    requests = await db.visit_requests.find(
        {'customer_phone': customer_phone},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return requests

@api_router.get("/visit-requests/{visit_id}")
async def get_visit_request(visit_id: str):
    """Get a specific visit request"""
    request = await db.visit_requests.find_one({'id': visit_id}, {'_id': 0})
    if not request:
        raise HTTPException(status_code=404, detail="Demande de visite non trouvée")
    return request

@api_router.put("/visit-requests/{visit_id}")
async def update_visit_request(visit_id: str, update_data: VisitRequestUpdate, current_user: dict = Depends(get_current_user)):
    """Accept or reject a visit request"""
    # Find the visit request
    request = await db.visit_requests.find_one({'id': visit_id}, {'_id': 0})
    if not request:
        raise HTTPException(status_code=404, detail="Demande de visite non trouvée")
    
    # Verify ownership - check both provider_id and owner_id for compatibility
    owner_id = request.get('provider_id') or request.get('owner_id')
    if owner_id != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette demande")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_fields = {
        'status': update_data.status.value,
        'updated_at': now
    }
    
    if update_data.response_message:
        update_fields['response_message'] = update_data.response_message
    
    await db.visit_requests.update_one(
        {'id': visit_id},
        {'$set': update_fields}
    )
    
    # Create notification for customer (we'll need a way to reach them)
    status_messages = {
        'accepted': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été acceptée !",
        'rejected': f"Votre demande de visite pour '{request.get('rental_title', 'la propriété')}' a été refusée.",
        'completed': f"Visite pour '{request.get('rental_title', 'la propriété')}' marquée comme terminée."
    }
    
    return {
        'id': visit_id,
        'status': update_data.status.value,
        'message': status_messages.get(update_data.status.value, 'Statut mis à jour')
    }

@api_router.get("/rentals/{rental_id}/visit-requests")
async def get_rental_visit_requests(rental_id: str, current_user: dict = Depends(get_current_user)):
    """Get all visit requests for a specific rental"""
    # Verify user owns this rental
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    if rental.get('owner_id') != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    requests = await db.visit_requests.find(
        {'rental_id': rental_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return requests

# ==================== VEHICLE SALES (Vente de Véhicules) ====================

@api_router.post("/vehicle-sales")
async def create_vehicle_sale(sale_data: VehicleSaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new vehicle sale listing (Vehicle providers only)"""
    if current_user.get('profession') not in ['Camionneur', 'Tracteur', 'Voiture']:
        raise HTTPException(
            status_code=403, 
            detail="Seuls les prestataires de véhicules peuvent créer des annonces de vente"
        )
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    vehicle_type_map = {
        'Camionneur': 'Camion',
        'Tracteur': 'Tracteur',
        'Voiture': 'Voiture'
    }
    
    sale_doc = {
        'id': sale_id,
        'seller_id': current_user.get('id'),
        'seller_name': f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}",
        'seller_phone': current_user.get('phone_number', ''),
        'vehicle_type': sale_data.vehicle_type or vehicle_type_map.get(current_user.get('profession'), 'Véhicule'),
        'brand': sale_data.brand,
        'model': sale_data.model,
        'year': sale_data.year,
        'mileage': sale_data.mileage,
        'fuel_type': sale_data.fuel_type,
        'transmission': sale_data.transmission,
        'price': sale_data.price,
        'description': sale_data.description,
        'location': sale_data.location,
        'condition': sale_data.condition,
        'photos': sale_data.photos,
        'status': VehicleSaleStatus.PENDING.value,
        'created_at': now,
        'updated_at': now
    }
    
    await db.vehicle_sales.insert_one(sale_doc)
    
    # Notify admin of new vehicle sale listing
    admin_notification = {
        'id': str(uuid.uuid4()),
        'user_id': 'admin',
        'user_type': 'admin',
        'title': 'Nouvelle annonce de vente de véhicule',
        'message': f"{sale_doc['seller_name']} a créé une annonce de vente: {sale_data.brand} {sale_data.model} ({sale_data.year})",
        'notification_type': 'vehicle_sale',
        'related_id': sale_id,
        'is_read': False,
        'created_at': now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {
        'id': sale_id,
        'message': 'Annonce de vente créée avec succès. En attente d\'approbation.',
        'status': 'pending'
    }

@api_router.get("/vehicle-sales/my-sales")
async def get_my_vehicle_sales(current_user: dict = Depends(get_current_user)):
    """Get vehicle sales for the current seller"""
    sales = await db.vehicle_sales.find(
        {'seller_id': current_user.get('id')},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return sales

@api_router.get("/vehicle-sales")
async def get_approved_vehicle_sales(vehicle_type: str = None, limit: int = 20):
    """Get all approved vehicle sales (public)"""
    query = {'status': VehicleSaleStatus.APPROVED.value}
    if vehicle_type:
        query['vehicle_type'] = vehicle_type
    
    sales = await db.vehicle_sales.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).to_list(limit)
    
    return sales

@api_router.get("/vehicle-sales/{sale_id}")
async def get_vehicle_sale(sale_id: str):
    """Get a specific vehicle sale"""
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return sale

@api_router.put("/vehicle-sales/{sale_id}")
async def update_vehicle_sale(sale_id: str, update_data: VehicleSaleUpdate, current_user: dict = Depends(get_current_user)):
    """Update a vehicle sale listing"""
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if sale.get('seller_id') != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_fields = {'updated_at': datetime.now(timezone.utc).isoformat()}
    
    for field, value in update_data.dict(exclude_unset=True).items():
        if value is not None:
            update_fields[field] = value
    
    await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': update_fields}
    )
    
    updated = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    return updated

@api_router.delete("/vehicle-sales/{sale_id}")
async def delete_vehicle_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vehicle sale listing"""
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if sale.get('seller_id') != current_user.get('id'):
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.vehicle_sales.delete_one({'id': sale_id})
    return {'message': 'Annonce supprimée'}

# Vehicle Sale Inquiries (go to admin)
@api_router.post("/vehicle-sales/{sale_id}/inquiries")
async def create_vehicle_inquiry(sale_id: str, inquiry: VehicleSaleInquiry):
    """Create an inquiry for a vehicle sale (goes to admin)"""
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    inquiry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    inquiry_doc = {
        'id': inquiry_id,
        'vehicle_id': sale_id,
        'vehicle_info': f"{sale.get('brand')} {sale.get('model')} ({sale.get('year')})",
        'vehicle_price': sale.get('price'),
        'seller_id': sale.get('seller_id'),
        'seller_name': sale.get('seller_name'),
        'seller_phone': sale.get('seller_phone'),
        'customer_name': inquiry.customer_name,
        'customer_phone': inquiry.customer_phone,
        'customer_email': inquiry.customer_email,
        'message': inquiry.message,
        'status': 'pending',  # pending, contacted, completed
        'admin_notes': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.vehicle_inquiries.insert_one(inquiry_doc)
    
    # Notify admin
    admin_notification = {
        'id': str(uuid.uuid4()),
        'user_id': 'admin',
        'user_type': 'admin',
        'title': 'Nouvelle demande d\'achat de véhicule',
        'message': f"{inquiry.customer_name} est intéressé par: {sale.get('brand')} {sale.get('model')} - {sale.get('price'):,.0f} GNF",
        'notification_type': 'vehicle_inquiry',
        'related_id': inquiry_id,
        'is_read': False,
        'created_at': now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {
        'id': inquiry_id,
        'message': 'Votre demande a été envoyée. L\'équipe ServisPro vous contactera bientôt.',
        'status': 'pending'
    }

# Admin endpoints for vehicle sales
@api_router.get("/admin/vehicle-sales")
async def admin_get_all_vehicle_sales(status: str = None):
    """Admin: Get all vehicle sales"""
    query = {}
    if status:
        query['status'] = status
    
    sales = await db.vehicle_sales.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return sales

@api_router.put("/admin/vehicle-sales/{sale_id}/approve")
async def admin_approve_vehicle_sale(sale_id: str):
    """Admin: Approve a vehicle sale"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.APPROVED.value, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Notify seller
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if sale:
        notification = {
            'id': str(uuid.uuid4()),
            'user_id': sale.get('seller_id'),
            'user_type': 'provider',
            'title': 'Annonce de vente approuvée',
            'message': f"Votre annonce {sale.get('brand')} {sale.get('model')} a été approuvée et est maintenant visible.",
            'notification_type': 'vehicle_sale_approved',
            'related_id': sale_id,
            'is_read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {'message': 'Annonce approuvée'}

@api_router.put("/admin/vehicle-sales/{sale_id}/reject")
async def admin_reject_vehicle_sale(sale_id: str):
    """Admin: Reject a vehicle sale"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.REJECTED.value, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    return {'message': 'Annonce rejetée'}

@api_router.put("/admin/vehicle-sales/{sale_id}/sold")
async def admin_mark_vehicle_sold(sale_id: str):
    """Admin: Mark a vehicle as sold"""
    result = await db.vehicle_sales.update_one(
        {'id': sale_id},
        {'$set': {'status': VehicleSaleStatus.SOLD.value, 'sold_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    return {'message': 'Véhicule marqué comme vendu'}

@api_router.get("/admin/vehicle-inquiries")
async def admin_get_vehicle_inquiries(status: str = None):
    """Admin: Get all vehicle inquiries"""
    query = {}
    if status:
        query['status'] = status
    
    inquiries = await db.vehicle_inquiries.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return inquiries

@api_router.put("/admin/vehicle-inquiries/{inquiry_id}")
async def admin_update_vehicle_inquiry(inquiry_id: str, status: str, admin_notes: str = None):
    """Admin: Update vehicle inquiry status"""
    update_fields = {
        'status': status,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    if admin_notes:
        update_fields['admin_notes'] = admin_notes
    
    result = await db.vehicle_inquiries.update_one(
        {'id': inquiry_id},
        {'$set': update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    return {'message': 'Statut mis à jour'}

# ==================== PROPERTY SALE ROUTES (Vente Immobilière) ====================

@api_router.post("/property-sales")
async def create_property_sale(sale_data: PropertySaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new property sale listing (Agent Immobilier only)"""
    if current_user.get('profession') != 'AgentImmobilier':
        raise HTTPException(
            status_code=403, 
            detail="Seuls les agents immobiliers peuvent publier des ventes"
        )
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sale_doc = {
        'id': sale_id,
        'agent_id': current_user['id'],
        'agent_name': f"{current_user['first_name']} {current_user['last_name']}",
        'agent_phone': current_user.get('phone_number', ''),
        'property_type': sale_data.property_type,
        'title': sale_data.title,
        'description': sale_data.description,
        'location': sale_data.location,
        'sale_price': sale_data.sale_price,
        'surface_area': sale_data.surface_area,
        'num_rooms': sale_data.num_rooms,
        'num_bathrooms': sale_data.num_bathrooms,
        'has_garage': sale_data.has_garage,
        'has_garden': sale_data.has_garden,
        'has_pool': sale_data.has_pool,
        'year_built': sale_data.year_built,
        'features': sale_data.features,
        'is_negotiable': sale_data.is_negotiable,
        'is_available': True,
        'photos': [],
        'titre_foncier': None,
        'registration_ministere': None,
        'seller_id_document': None,
        'documents_additionnels': [],
        'documents_verified': False,
        'verification_date': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.property_sales.insert_one(sale_doc)
    return {k: v for k, v in sale_doc.items() if k != '_id'}

@api_router.get("/property-sales")
async def get_all_property_sales(
    property_type: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    available_only: bool = True
):
    """Get all property sales with optional filters"""
    query = {}
    
    if property_type:
        query['property_type'] = property_type
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    if available_only:
        query['is_available'] = True
    if min_price:
        query['sale_price'] = {'$gte': min_price}
    if max_price:
        if 'sale_price' in query:
            query['sale_price']['$lte'] = max_price
        else:
            query['sale_price'] = {'$lte': max_price}
    
    sales = await db.property_sales.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return sales

@api_router.get("/property-sales/my-listings")
async def get_my_property_sales(current_user: dict = Depends(get_current_user)):
    """Get all property sales for the current agent"""
    sales = await db.property_sales.find(
        {'agent_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return sales

@api_router.get("/property-sales/{sale_id}")
async def get_property_sale_by_id(sale_id: str):
    """Get a specific property sale by ID"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    return sale

@api_router.put("/property-sales/{sale_id}")
async def update_property_sale(sale_id: str, sale_data: PropertySaleCreate, current_user: dict = Depends(get_current_user)):
    """Update a property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = sale_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.property_sales.update_one({'id': sale_id}, {'$set': update_data})
    
    updated = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    return updated

@api_router.delete("/property-sales/{sale_id}")
async def delete_property_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a property sale listing"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.property_sales.delete_one({'id': sale_id})
    return {"message": "Propriété supprimée avec succès"}

@api_router.put("/property-sales/{sale_id}/availability")
async def toggle_property_sale_availability(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle property sale availability status"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    new_status = not sale.get('is_available', True)
    await db.property_sales.update_one(
        {'id': sale_id},
        {'$set': {'is_available': new_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"is_available": new_status}

@api_router.post("/property-sales/{sale_id}/upload-photo")
async def upload_property_sale_photo(sale_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a photo for a property sale"""
    sale = await db.property_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"sale_{sale_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/{filename}"
    await db.property_sales.update_one(
        {'id': sale_id},
        {
            '$push': {'photos': photo_url},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"photo_url": photo_url, "message": "Photo uploadée avec succès"}

@api_router.post("/property-sales/{sale_id}/upload-document/{doc_type}")
async def upload_property_sale_document(
    sale_id: str, 
    doc_type: str,
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Upload required documents for a property sale (titre_foncier, registration_ministere, seller_id_document, documents_additionnels)"""
    sale = await db.property_sales.find_one({'id': sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Propriété non trouvée")
    
    if sale['agent_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    valid_doc_types = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'documents_additionnels']
    if doc_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide. Types valides: {valid_doc_types}")
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"sale_doc_{sale_id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/{filename}"
    
    if doc_type == 'documents_additionnels':
        await db.property_sales.update_one(
            {'id': sale_id},
            {
                '$push': {'documents_additionnels': doc_url},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.property_sales.update_one(
            {'id': sale_id},
            {
                '$set': {
                    doc_type: doc_url,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    doc_labels = {
        'titre_foncier': 'Titre Foncier',
        'registration_ministere': 'Enregistrement Ministère de l\'Habitat',
        'seller_id_document': 'Pièce d\'Identité du Vendeur',
        'documents_additionnels': 'Document Additionnel'
    }
    
    return {
        'document_url': doc_url, 
        'document_type': doc_type, 
        'document_label': doc_labels.get(doc_type, doc_type),
        'message': 'Document uploadé avec succès'
    }

# Review Routes
@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate):
    # Verify provider exists
    provider = await db.service_providers.find_one({'id': review_data.service_provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Service provider not found")
    
    # Check if customer has received service from this provider (accepted or completed job)
    customer_job = await db.job_offers.find_one({
        'service_provider_id': review_data.service_provider_id,
        'status': {'$in': ['Accepted', 'Completed']}
    })
    
    if not customer_job:
        raise HTTPException(
            status_code=403, 
            detail="Vous ne pouvez évaluer que les prestataires qui vous ont fourni un service"
        )
    
    review_id = str(uuid.uuid4())
    review_doc = {
        'id': review_id,
        'service_provider_id': review_data.service_provider_id,
        'reviewer_name': review_data.reviewer_name,
        'rating': review_data.rating,
        'comment': review_data.comment,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    review_response = {k: v for k, v in review_doc.items() if k != '_id'}
    return Review(**review_response)

@api_router.get("/reviews/{provider_id}", response_model=List[Review])
async def get_provider_reviews(provider_id: str):
    reviews = await db.reviews.find({'service_provider_id': provider_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return [Review(**r) for r in reviews]

@api_router.get("/reviews/{provider_id}/stats")
async def get_provider_rating_stats(provider_id: str):
    reviews = await db.reviews.find({'service_provider_id': provider_id}, {'_id': 0, 'rating': 1}).to_list(1000)
    
    if not reviews:
        return {
            'total_reviews': 0,
            'average_rating': 0,
            'rating_distribution': {
                '5': 0,
                '4': 0,
                '3': 0,
                '2': 0,
                '1': 0
            }
        }
    
    total = len(reviews)
    ratings = [r['rating'] for r in reviews]
    average = sum(ratings) / total
    
    distribution = {
        '5': ratings.count(5),
        '4': ratings.count(4),
        '3': ratings.count(3),
        '2': ratings.count(2),
        '1': ratings.count(1)
    }
    
    return {
        'total_reviews': total,
        'average_rating': round(average, 1),
        'rating_distribution': distribution
    }

# ==================== VEHICLE LISTING ROUTES ====================

@api_router.post("/vehicles", response_model=VehicleListing)
async def create_vehicle_listing(vehicle_data: VehicleListingCreate, current_user: dict = Depends(get_current_user)):
    """Create a new vehicle listing (for Camionneur, Tracteur, Voiture providers)"""
    # Verify user is a vehicle provider
    allowed_professions = ['Camionneur', 'Tracteur', 'Voiture']
    if current_user.get('profession') not in allowed_professions:
        raise HTTPException(
            status_code=403, 
            detail="Seuls les prestataires de véhicules (Camionneur, Tracteur, Voiture) peuvent publier des annonces de véhicules"
        )
    
    vehicle_id = str(uuid.uuid4())
    vehicle_doc = {
        'id': vehicle_id,
        'owner_id': current_user['id'],
        'owner_name': f"{current_user['first_name']} {current_user['last_name']}",
        'vehicle_type': vehicle_data.vehicle_type,
        'brand': vehicle_data.brand,
        'model': vehicle_data.model,
        'year': vehicle_data.year,
        'fuel_type': vehicle_data.fuel_type,
        'transmission': vehicle_data.transmission,
        'seats': vehicle_data.seats,
        'load_capacity': vehicle_data.load_capacity,
        'engine_power': vehicle_data.engine_power,
        'description': vehicle_data.description,
        'location': vehicle_data.location,
        'price_per_day': vehicle_data.price_per_day,
        'price_per_week': vehicle_data.price_per_week,
        'price_per_month': vehicle_data.price_per_month,
        'is_available': vehicle_data.is_available,
        'features': vehicle_data.features,
        'photos': [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.vehicle_listings.insert_one(vehicle_doc)
    return {k: v for k, v in vehicle_doc.items() if k != '_id'}

@api_router.get("/vehicles", response_model=List[VehicleListing])
async def get_all_vehicles(
    vehicle_type: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    available_only: bool = True
):
    """Get all vehicle listings with optional filters"""
    query = {}
    
    if vehicle_type:
        query['vehicle_type'] = vehicle_type
    if location:
        query['location'] = {'$regex': location, '$options': 'i'}
    if available_only:
        query['is_available'] = True
    if min_price:
        query['price_per_day'] = {'$gte': min_price}
    if max_price:
        if 'price_per_day' in query:
            query['price_per_day']['$lte'] = max_price
        else:
            query['price_per_day'] = {'$lte': max_price}
    
    vehicles = await db.vehicle_listings.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return vehicles

@api_router.get("/vehicles/my-listings", response_model=List[VehicleListing])
async def get_my_vehicle_listings(current_user: dict = Depends(get_current_user)):
    """Get all vehicle listings for the current user"""
    vehicles = await db.vehicle_listings.find(
        {'owner_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return vehicles

@api_router.get("/vehicles/{vehicle_id}", response_model=VehicleListing)
async def get_vehicle_by_id(vehicle_id: str):
    """Get a specific vehicle listing by ID"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    return vehicle

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle_listing(vehicle_id: str, vehicle_data: VehicleListingCreate, current_user: dict = Depends(get_current_user)):
    """Update a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = vehicle_data.model_dump(exclude_unset=True)
    await db.vehicle_listings.update_one(
        {'id': vehicle_id},
        {'$set': update_data}
    )
    
    updated = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    return updated

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle_listing(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.vehicle_listings.delete_one({'id': vehicle_id})
    return {"message": "Véhicule supprimé avec succès"}

@api_router.put("/vehicles/{vehicle_id}/availability")
async def toggle_vehicle_availability(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle vehicle availability status"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    new_status = not vehicle.get('is_available', True)
    await db.vehicle_listings.update_one(
        {'id': vehicle_id},
        {'$set': {'is_available': new_status}}
    )
    
    return {"is_available": new_status}

@api_router.post("/vehicles/{vehicle_id}/upload-photo")
async def upload_vehicle_photo(vehicle_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a photo for a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Save file
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"vehicle_{vehicle_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update vehicle with new photo
    photo_url = f"/api/uploads/{filename}"
    await db.vehicle_listings.update_one(
        {'id': vehicle_id},
        {'$push': {'photos': photo_url}}
    )
    
    return {"photo_url": photo_url, "message": "Photo uploadée avec succès"}

@api_router.delete("/vehicles/{vehicle_id}/photo")
async def delete_vehicle_photo(vehicle_id: str, photo_url: str, current_user: dict = Depends(get_current_user)):
    """Delete a photo from a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.vehicle_listings.update_one(
        {'id': vehicle_id},
        {'$pull': {'photos': photo_url}}
    )
    
    return {"message": "Photo supprimée avec succès"}

# Vehicle Booking Routes
@api_router.post("/vehicles/{vehicle_id}/book")
async def create_vehicle_booking(vehicle_id: str, booking_data: VehicleBookingCreate):
    """Create a booking request for a vehicle"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if not vehicle.get('is_available', True):
        raise HTTPException(status_code=400, detail="Ce véhicule n'est pas disponible actuellement")
    
    # Calculate total price based on duration
    start = datetime.fromisoformat(booking_data.start_date)
    end = datetime.fromisoformat(booking_data.end_date)
    days = (end - start).days + 1
    
    total_price = days * vehicle['price_per_day']
    
    # Apply weekly/monthly rates if applicable
    if days >= 30 and vehicle.get('price_per_month'):
        months = days // 30
        remaining_days = days % 30
        total_price = (months * vehicle['price_per_month']) + (remaining_days * vehicle['price_per_day'])
    elif days >= 7 and vehicle.get('price_per_week'):
        weeks = days // 7
        remaining_days = days % 7
        total_price = (weeks * vehicle['price_per_week']) + (remaining_days * vehicle['price_per_day'])
    
    # Filter contact info from message
    filtered_message = None
    if booking_data.message:
        filtered_message, _ = filter_contact_info(booking_data.message)
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        'id': booking_id,
        'vehicle_id': vehicle_id,
        'vehicle_title': f"{vehicle['brand']} {vehicle['model']} ({vehicle['year']})",
        'customer_id': 'anonymous',  # Would be from token if authenticated
        'customer_name': 'Client',
        'customer_phone': '',
        'owner_id': vehicle['owner_id'],
        'start_date': booking_data.start_date,
        'end_date': booking_data.end_date,
        'total_price': total_price,
        'status': 'pending',
        'message': filtered_message,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.vehicle_bookings.insert_one(booking_doc)
    return {k: v for k, v in booking_doc.items() if k != '_id'}

@api_router.get("/vehicles/bookings/my-requests")
async def get_my_vehicle_booking_requests(current_user: dict = Depends(get_current_user)):
    """Get all booking requests for the vehicle owner"""
    bookings = await db.vehicle_bookings.find(
        {'owner_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return bookings

@api_router.put("/vehicles/bookings/{booking_id}/status")
async def update_vehicle_booking_status(booking_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update booking status (accept/reject)"""
    booking = await db.vehicle_bookings.find_one({'id': booking_id}, {'_id': 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    if booking['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if status not in ['accepted', 'rejected', 'completed']:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.vehicle_bookings.update_one(
        {'id': booking_id},
        {'$set': {'status': status}}
    )
    
    return {"status": status, "message": f"Réservation {status}"}

# ==================== CHAT ROUTES (Rental Listings) ====================

@api_router.post("/chat/rental/{rental_id}/message")
async def send_chat_message(rental_id: str, message_data: ChatMessageCreate):
    """Send a chat message for a rental listing"""
    # Verify rental exists
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': 'customer',
        'sender_name': 'Client',
        'sender_type': 'customer',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}

@api_router.post("/chat/rental/{rental_id}/message/customer")
async def send_customer_message(rental_id: str, message_data: ChatMessageCreate):
    """Customer sends a message to rental owner"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    # Get customer info if logged in
    customer_name = message_data.sender_name if hasattr(message_data, 'sender_name') and message_data.sender_name else "Client"
    customer_id = "customer"
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': customer_id,
        'sender_name': customer_name,
        'sender_type': 'customer',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}

@api_router.post("/chat/rental/{rental_id}/message/owner")
async def send_owner_message(rental_id: str, message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Owner sends a message to customer"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental.get('service_provider_id') != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Filter contact information from message
    filtered_message, was_filtered = filter_contact_info(message_data.message)
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': current_user['id'],
        'sender_name': f"{current_user['first_name']} {current_user['last_name']}",
        'sender_type': 'owner',
        'message': filtered_message,
        'original_message': message_data.message if was_filtered else None,  # Store original for admin
        'was_filtered': was_filtered,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id' and k != 'original_message'}

@api_router.get("/chat/rental/{rental_id}/messages")
async def get_rental_chat_messages(rental_id: str):
    """Get all chat messages for a rental listing (filtered for users)"""
    messages = await db.chat_messages.find(
        {'rental_id': rental_id}, 
        {'_id': 0, 'original_message': 0}  # Exclude original message from user view
    ).sort('created_at', 1).to_list(100)
    return messages

@api_router.get("/admin/chat/rental/{rental_id}/messages")
async def get_rental_chat_messages_admin(rental_id: str):
    """Get all chat messages for a rental listing (full access for admin - includes original messages)"""
    messages = await db.chat_messages.find(
        {'rental_id': rental_id}, 
        {'_id': 0}  # Admin can see original_message
    ).sort('created_at', 1).to_list(100)
    return messages

@api_router.get("/admin/chat/all-messages")
async def get_all_chat_messages_admin():
    """Get all chat messages across all rentals (admin only)"""
    messages = await db.chat_messages.find(
        {}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(500)
    
    # Add rental info to each message
    for msg in messages:
        rental = await db.rental_listings.find_one(
            {'id': msg.get('rental_id')}, 
            {'_id': 0, 'title': 1}
        )
        msg['rental_title'] = rental.get('title') if rental else 'Annonce supprimée'
    
    return messages

@api_router.get("/chat/my-conversations")
async def get_my_conversations(current_user: dict = Depends(get_current_user)):
    """Get all rental conversations for the logged-in owner"""
    # Get all rentals owned by user
    rentals = await db.rental_listings.find(
        {'service_provider_id': current_user['id']},
        {'_id': 0, 'id': 1, 'title': 1}
    ).to_list(100)
    
    conversations = []
    for rental in rentals:
        # Get latest message and count
        messages = await db.chat_messages.find(
            {'rental_id': rental['id']},
            {'_id': 0}
        ).sort('created_at', -1).to_list(1)
        
        message_count = await db.chat_messages.count_documents({'rental_id': rental['id']})
        
        if message_count > 0:
            conversations.append({
                'rental_id': rental['id'],
                'rental_title': rental['title'],
                'last_message': messages[0] if messages else None,
                'message_count': message_count
            })
    
    return conversations

# ==================== ADMIN ROUTES ====================

class AdminLoginInput(BaseModel):
    username: str
    password: str

class AdminRegisterInput(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

@api_router.post("/admin/register")
async def admin_register(input_data: AdminRegisterInput):
    """Register a new admin"""
    # Check if username already exists
    existing_admin = await db.admins.find_one({'username': input_data.username})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà")
    
    # Hash password and create admin
    hashed_pwd = bcrypt.hashpw(input_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_id = str(uuid.uuid4())
    
    admin_doc = {
        'id': admin_id,
        'username': input_data.username,
        'password': hashed_pwd,
        'role': 'admin',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin_doc)
    
    token = create_token(admin_id)
    return {
        "token": token, 
        "user": {
            "id": admin_id, 
            "username": input_data.username,
            "role": "admin"
        },
        "message": "Compte admin créé avec succès"
    }

@api_router.post("/admin/login")
async def admin_login(input_data: AdminLoginInput):
    # Check fixed super-admin first
    if input_data.username == ADMIN_USERNAME and input_data.password == ADMIN_PASSWORD:
        token = create_token("admin")
        return {"token": token, "user": {"id": "admin", "username": "admin", "role": "super-admin"}}
    
    # Check database admins
    admin = await db.admins.find_one({'username': input_data.username}, {'_id': 0})
    if admin and bcrypt.checkpw(input_data.password.encode('utf-8'), admin['password'].encode('utf-8')):
        token = create_token(admin['id'])
        return {
            "token": token, 
            "user": {
                "id": admin['id'], 
                "username": admin['username'],
                "role": admin['role']
            }
        }
    
    raise HTTPException(status_code=401, detail="Identifiants admin invalides")

@api_router.get("/admin/providers")
async def get_all_providers_admin():
    """Get all providers with their verification status for admin review"""
    providers = await db.service_providers.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(1000)
    return providers

@api_router.put("/admin/providers/{provider_id}/approve")
async def approve_provider(provider_id: str):
    """Approve a service provider"""
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'verification_status': ProviderStatus.APPROVED.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    return {"message": "Prestataire approuvé avec succès"}

@api_router.put("/admin/providers/{provider_id}/reject")
async def reject_provider(provider_id: str):
    """Reject a service provider"""
    result = await db.service_providers.update_one(
        {'id': provider_id},
        {'$set': {'verification_status': ProviderStatus.REJECTED.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    return {"message": "Prestataire rejeté"}

@api_router.get("/admin/jobs")
async def get_all_jobs_admin():
    """Get all jobs for admin dashboard"""
    jobs = await db.job_offers.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    
    # Enrich with provider and customer info
    for job in jobs:
        provider = await db.service_providers.find_one(
            {'id': job.get('service_provider_id')}, 
            {'_id': 0, 'first_name': 1, 'last_name': 1, 'phone_number': 1}
        )
        if provider:
            job['provider_name'] = f"{provider.get('first_name', '')} {provider.get('last_name', '')}"
            job['provider_phone'] = provider.get('phone_number', '')
    
    return jobs

@api_router.get("/admin/rentals")
async def get_all_rentals_admin():
    """Get all rental listings for admin dashboard"""
    rentals = await db.rental_listings.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return rentals

@api_router.get("/admin/rentals/pending")
async def get_pending_rentals_admin():
    """Get all pending rental listings for admin approval"""
    rentals = await db.rental_listings.find(
        {'approval_status': ListingApprovalStatus.PENDING.value}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(1000)
    return rentals

@api_router.put("/admin/rentals/{rental_id}/approve")
async def approve_rental_admin(rental_id: str):
    """Approve a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$set': {
                'approval_status': ListingApprovalStatus.APPROVED.value,
                'approved_at': now,
                'approved_by': 'admin',
                'rejection_reason': None,
                'updated_at': now
            }
        }
    )
    
    # Create notification for the provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': rental['service_provider_id'],
        'user_type': 'provider',
        'title': 'Annonce approuvée',
        'message': f'Votre annonce "{rental["title"]}" a été approuvée et est maintenant visible au public.',
        'notification_type': 'system',
        'related_id': rental_id,
        'is_read': False,
        'created_at': now
    })
    
    return {"message": "Location approuvée avec succès", "rental_id": rental_id}

@api_router.put("/admin/rentals/{rental_id}/reject")
async def reject_rental_admin(rental_id: str, reason: Optional[str] = None):
    """Reject a rental listing"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.rental_listings.update_one(
        {'id': rental_id},
        {
            '$set': {
                'approval_status': ListingApprovalStatus.REJECTED.value,
                'rejection_reason': reason or 'Annonce non conforme aux conditions d\'utilisation',
                'approved_at': None,
                'approved_by': None,
                'updated_at': now
            }
        }
    )
    
    # Create notification for the provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': rental['service_provider_id'],
        'user_type': 'provider',
        'title': 'Annonce rejetée',
        'message': f'Votre annonce "{rental["title"]}" a été rejetée. Raison: {reason or "Non conforme aux conditions"}',
        'notification_type': 'system',
        'related_id': rental_id,
        'is_read': False,
        'created_at': now
    })

@api_router.get("/admin/agents-immobilier")
async def get_all_agents_immobilier():
    """Get all Agent Immobilier providers for admin dashboard"""
    agents = await db.service_providers.find(
        {'profession': 'AgentImmobilier'}, 
        {'_id': 0, 'password': 0}
    ).sort('created_at', -1).to_list(1000)
    
    # Add rental count for each agent
    for agent in agents:
        rental_count = await db.rental_listings.count_documents({'service_provider_id': agent['id']})
        agent['rental_count'] = rental_count
    
    return agents

@api_router.delete("/admin/rentals/{rental_id}")
async def delete_rental_admin(rental_id: str):
    """Delete a rental listing as admin"""
    rental = await db.rental_listings.find_one({'id': rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    # Delete associated chat messages
    await db.chat_messages.delete_many({'rental_id': rental_id})
    
    result = await db.rental_listings.delete_one({'id': rental_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location non trouvée")
    
    return {"message": "Location supprimée avec succès"}

@api_router.get("/admin/customers")
async def get_all_customers_admin():
    """Get all customers for admin dashboard"""
    customers = await db.customers.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(1000)
    return customers

@api_router.delete("/admin/providers/{provider_id}")
async def delete_provider(provider_id: str):
    """Delete a service provider and their associated data"""
    # Check if provider exists
    provider = await db.service_providers.find_one({'id': provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Delete associated data
    await db.job_offers.delete_many({'service_provider_id': provider_id})
    await db.rental_listings.delete_many({'service_provider_id': provider_id})
    await db.reviews.delete_many({'service_provider_id': provider_id})
    await db.chat_messages.delete_many({'sender_id': provider_id})
    
    # Delete the provider
    result = await db.service_providers.delete_one({'id': provider_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    return {"message": "Prestataire et données associées supprimés avec succès"}

@api_router.delete("/admin/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer and their associated data"""
    # Check if customer exists
    customer = await db.customers.find_one({'id': customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Delete associated data (job offers where they were the client, chat messages)
    await db.chat_messages.delete_many({'sender_id': customer_id})
    
    # Delete the customer
    result = await db.customers.delete_one({'id': customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {"message": "Client supprimé avec succès"}

# Admin Company Routes
@api_router.get("/admin/companies")
async def admin_get_all_companies():
    """Get all companies for admin"""
    companies = await db.companies.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(1000)
    
    # Add stats for each company
    for company in companies:
        company['services_count'] = await db.company_services.count_documents({'company_id': company['id']})
        company['job_offers_count'] = await db.company_job_offers.count_documents({'company_id': company['id']})
    
    return companies

@api_router.put("/admin/companies/{company_id}/approve")
async def admin_approve_company(company_id: str):
    """Approve a company"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    await db.companies.update_one(
        {'id': company_id},
        {'$set': {
            'verification_status': 'approved',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Entreprise approuvée avec succès"}

@api_router.put("/admin/companies/{company_id}/reject")
async def admin_reject_company(company_id: str):
    """Reject a company"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    await db.companies.update_one(
        {'id': company_id},
        {'$set': {
            'verification_status': 'rejected',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Entreprise rejetée"}

@api_router.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: str):
    """Delete a company and associated data"""
    company = await db.companies.find_one({'id': company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Delete associated services and job offers
    await db.company_services.delete_many({'company_id': company_id})
    await db.company_job_offers.delete_many({'company_id': company_id})
    
    # Delete the company
    await db.companies.delete_one({'id': company_id})
    
    return {"message": "Entreprise et données associées supprimées avec succès"}

@api_router.get("/admin/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    providers_count = await db.service_providers.count_documents({})
    pending_providers = await db.service_providers.count_documents({'verification_status': 'pending'})
    approved_providers = await db.service_providers.count_documents({'verification_status': 'approved'})
    customers_count = await db.customers.count_documents({})
    jobs_count = await db.job_offers.count_documents({})
    completed_jobs = await db.job_offers.count_documents({'status': 'Completed'})
    rentals_count = await db.rental_listings.count_documents({})
    sales_count = await db.property_sales.count_documents({})
    companies_count = await db.companies.count_documents({})
    pending_companies = await db.companies.count_documents({'verification_status': 'pending'})
    approved_companies = await db.companies.count_documents({'verification_status': 'approved'})
    job_offers_count = await db.company_job_offers.count_documents({})
    
    return {
        'total_providers': providers_count,
        'pending_providers': pending_providers,
        'approved_providers': approved_providers,
        'total_customers': customers_count,
        'total_jobs': jobs_count,
        'completed_jobs': completed_jobs,
        'total_rentals': rentals_count,
        'total_sales': sales_count,
        'total_companies': companies_count,
        'pending_companies': pending_companies,
        'approved_companies': approved_companies,
        'total_job_offers': job_offers_count
    }

# ==================== JOB COMPLETION FLOW ====================

@api_router.put("/jobs/{job_id}/provider-complete")
async def provider_mark_complete(job_id: str, current_user: dict = Depends(get_current_user)):
    """Provider marks job as completed - awaiting customer confirmation"""
    job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Travail non trouvé")
    
    if job['service_provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if job['status'] != 'Accepted':
        raise HTTPException(status_code=400, detail="Le travail doit être accepté avant d'être marqué comme terminé")
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': {'status': JobStatus.PROVIDER_COMPLETED.value}}
    )
    return {"message": "Travail marqué comme terminé. En attente de confirmation du client."}

@api_router.put("/jobs/{job_id}/customer-confirm")
async def customer_confirm_complete(job_id: str):
    """Customer confirms job is completed"""
    job = await db.job_offers.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail="Travail non trouvé")
    
    if job['status'] != 'ProviderCompleted':
        raise HTTPException(status_code=400, detail="Le prestataire doit d'abord marquer le travail comme terminé")
    
    await db.job_offers.update_one(
        {'id': job_id},
        {'$set': {'status': JobStatus.COMPLETED.value}}
    )
    return {"message": "Service confirmé comme terminé. Merci !"}

@api_router.get("/customer/jobs")
async def get_customer_jobs():
    """Get jobs for a customer to confirm completion"""
    # Get jobs awaiting customer confirmation
    jobs = await db.job_offers.find(
        {'status': {'$in': ['Accepted', 'ProviderCompleted']}}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    # Enrich with provider info
    for job in jobs:
        provider = await db.service_providers.find_one(
            {'id': job.get('service_provider_id')}, 
            {'_id': 0, 'first_name': 1, 'last_name': 1, 'profession': 1}
        )
        if provider:
            job['provider_name'] = f"{provider.get('first_name', '')} {provider.get('last_name', '')}"
            job['provider_profession'] = provider.get('profession', '')
    
    return jobs

# ==================== NOTIFICATIONS SYSTEM ====================

@api_router.post("/notifications")
async def create_notification(notification: NotificationCreate):
    """Create a new notification"""
    notification_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    notification_doc = {
        'id': notification_id,
        'user_id': notification.user_id,
        'user_type': notification.user_type,
        'title': notification.title,
        'message': notification.message,
        'notification_type': notification.notification_type.value,
        'related_id': notification.related_id,
        'is_read': False,
        'created_at': now
    }
    
    await db.notifications.insert_one(notification_doc)
    return {k: v for k, v in notification_doc.items() if k != '_id'}

@api_router.get("/notifications/provider")
async def get_provider_notifications(current_user: dict = Depends(get_current_user)):
    """Get all notifications for the current provider"""
    notifications = await db.notifications.find(
        {'user_id': current_user['id'], 'user_type': 'provider'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return notifications

@api_router.get("/notifications/customer")
async def get_customer_notifications(current_customer: dict = Depends(get_current_customer)):
    """Get all notifications for the current customer"""
    notifications = await db.notifications.find(
        {'user_id': current_customer['id'], 'user_type': 'customer'},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return notifications

@api_router.get("/notifications/unread-count/provider")
async def get_provider_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications for provider"""
    count = await db.notifications.count_documents({
        'user_id': current_user['id'],
        'user_type': 'provider',
        'is_read': False
    })
    return {'unread_count': count}

@api_router.get("/notifications/unread-count/customer")
async def get_customer_unread_count(current_customer: dict = Depends(get_current_customer)):
    """Get count of unread notifications for customer"""
    count = await db.notifications.count_documents({
        'user_id': current_customer['id'],
        'user_type': 'customer',
        'is_read': False
    })
    return {'unread_count': count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {'id': notification_id},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Notification marquée comme lue'}

@api_router.put("/notifications/mark-all-read/provider")
async def mark_all_provider_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all provider notifications as read"""
    await db.notifications.update_many(
        {'user_id': current_user['id'], 'user_type': 'provider'},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Toutes les notifications marquées comme lues'}

@api_router.put("/notifications/mark-all-read/customer")
async def mark_all_customer_notifications_read(current_customer: dict = Depends(get_current_customer)):
    """Mark all customer notifications as read"""
    await db.notifications.update_many(
        {'user_id': current_customer['id'], 'user_type': 'customer'},
        {'$set': {'is_read': True}}
    )
    return {'message': 'Toutes les notifications marquées comme lues'}

# ==================== PAYMENT SYSTEM (SIMULATION) ====================

def generate_transaction_reference(method: str) -> str:
    """Generate a realistic transaction reference"""
    prefix = 'OM' if method == 'orange_money' else 'MTN'
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = str(uuid.uuid4().hex[:6]).upper()
    return f"{prefix}{timestamp}{random_suffix}"

@api_router.post("/payments/initiate")
async def initiate_payment(payment: PaymentCreate):
    """
    Initiate a payment for investigation fee.
    SIMULATION MODE - Mimics Orange Money / MTN MoMo flow
    """
    payment_id = str(uuid.uuid4())
    transaction_ref = generate_transaction_reference(payment.payment_method)
    now = datetime.now(timezone.utc).isoformat()
    
    # Get provider info
    provider = await db.service_providers.find_one({'id': payment.provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    payment_doc = {
        'id': payment_id,
        'transaction_ref': transaction_ref,
        'job_id': payment.job_id,
        'provider_id': payment.provider_id,
        'provider_name': f"{provider['first_name']} {provider['last_name']}",
        'customer_phone': payment.customer_phone,
        'customer_name': payment.customer_name,
        'amount': payment.amount,
        'currency': 'GNF',
        'payment_method': payment.payment_method,
        'payment_type': 'investigation_fee',
        'status': PaymentStatus.PENDING.value,
        'otp_sent': True,
        'otp_verified': False,
        'created_at': now,
        'updated_at': now
    }
    
    await db.payments.insert_one(payment_doc)
    
    return {
        'payment_id': payment_id,
        'transaction_ref': transaction_ref,
        'status': 'pending',
        'message': 'Paiement initié. Un code de confirmation a été envoyé.',
        'amount': payment.amount,
        'currency': 'GNF',
        'payment_method': payment.payment_method
    }

@api_router.post("/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: str):
    """
    Confirm a payment after OTP verification.
    SIMULATION MODE - In production, this would be called by a webhook.
    """
    payment = await db.payments.find_one({'id': payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment['status'] != PaymentStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Ce paiement a déjà été traité")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment status
    await db.payments.update_one(
        {'id': payment_id},
        {
            '$set': {
                'status': PaymentStatus.COMPLETED.value,
                'otp_verified': True,
                'completed_at': now,
                'updated_at': now
            }
        }
    )
    
    # Create notification for provider
    notification_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        'id': notification_id,
        'user_id': payment['provider_id'],
        'user_type': 'provider',
        'title': 'Nouveau paiement reçu',
        'message': f"Vous avez reçu un paiement de {payment['amount']} GNF de {payment['customer_name']} pour le tarif d'investigation.",
        'notification_type': 'payment_received',
        'related_id': payment_id,
        'is_read': False,
        'created_at': now
    })
    
    return {
        'payment_id': payment_id,
        'status': 'completed',
        'message': 'Paiement confirmé avec succès!'
    }

@api_router.get("/payments/{payment_id}/status")
async def get_payment_status(payment_id: str):
    """Get the status of a payment"""
    payment = await db.payments.find_one({'id': payment_id}, {'_id': 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    return payment

@api_router.get("/payments/history/provider")
async def get_provider_payment_history(current_user: dict = Depends(get_current_user)):
    """Get payment history for the current provider"""
    payments = await db.payments.find(
        {'provider_id': current_user['id'], 'status': PaymentStatus.COMPLETED.value},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return payments

@api_router.get("/payments/history/customer/{phone}")
async def get_customer_payment_history(phone: str):
    """Get payment history for a customer by phone"""
    payments = await db.payments.find(
        {'customer_phone': phone},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return payments

@api_router.get("/provider/{provider_id}/investigation-fee")
async def get_provider_investigation_fee(provider_id: str):
    """Get the investigation fee for a provider"""
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    return {
        'provider_id': provider_id,
        'provider_name': f"{provider['first_name']} {provider['last_name']}",
        'investigation_fee': provider.get('investigation_fee', 0),
        'price': provider.get('price', 0)
    }

# ==================== ADMIN SETTINGS ====================

class AdminSettingsUpdate(BaseModel):
    # Commissions par domaine en pourcentage
    commission_prestation: Optional[float] = None      # Prestation de services (%)
    commission_location_courte: Optional[float] = None # Location courte durée (%)
    commission_location_longue: Optional[float] = None # Location longue durée (%)
    commission_vente: Optional[float] = None           # Vente immobilière (%)
    commission_location_vehicule: Optional[float] = None # Location véhicule (%)
    devise: Optional[str] = None                       # Devise (GNF, USD, EUR)

# Public endpoint to get commission rates (visible to all users)
@api_router.get("/commission-rates")
async def get_public_commission_rates():
    """Get public commission rates for all domains"""
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    
    if not settings:
        settings = {
            'commission_prestation': 10.0,
            'commission_location_courte': 10.0,
            'commission_location_longue': 5.0,
            'commission_vente': 3.0,
            'commission_location_vehicule': 10.0,
            'devise': 'GNF'
        }
    
    return {
        'rates': {
            'prestation': {
                'label': 'Prestation de services',
                'rate': settings.get('commission_prestation', 10.0),
                'type': 'percentage'
            },
            'location_courte': {
                'label': 'Location courte durée',
                'rate': settings.get('commission_location_courte', 10.0),
                'type': 'percentage'
            },
            'location_longue': {
                'label': 'Location longue durée',
                'rate': settings.get('commission_location_longue', 5.0),
                'type': 'percentage'
            },
            'vente': {
                'label': 'Vente immobilière',
                'rate': settings.get('commission_vente', 3.0),
                'type': 'percentage'
            },
            'location_vehicule': {
                'label': 'Location de véhicule',
                'rate': settings.get('commission_location_vehicule', 10.0),
                'type': 'percentage'
            }
        },
        'devise': settings.get('devise', 'GNF')
    }

# ==================== SERVICE FEES BY PROFESSION ====================

class ServiceFeesUpdate(BaseModel):
    profession: str
    frais_visite: Optional[float] = None
    frais_prestation: Optional[float] = None

@api_router.get("/admin/service-fees")
async def get_all_service_fees():
    """Get all service fees by profession"""
    fees = await db.service_fees.find({}, {'_id': 0}).to_list(100)
    
    # If no fees exist, return defaults for all professions
    if not fees:
        default_fees = [
            {'profession': 'Logisticien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Logisticien'},
            {'profession': 'Electromecanicien', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Électromécanicien'},
            {'profession': 'Mecanicien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plombier', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Macon', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Maçon'},
            {'profession': 'Menuisier', 'frais_visite': 50000, 'frais_prestation': 120000, 'label': 'Menuisier'},
            {'profession': 'AgentImmobilier', 'frais_visite': 100000, 'frais_prestation': 0, 'label': 'Agent Immobilier'},
            {'profession': 'Soudeur', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Soudeur'},
            {'profession': 'Camionneur', 'frais_visite': 0, 'frais_prestation': 200000, 'label': 'Camionneur'},
            {'profession': 'Tracteur', 'frais_visite': 0, 'frais_prestation': 150000, 'label': 'Tracteur'},
            {'profession': 'Voiture', 'frais_visite': 0, 'frais_prestation': 100000, 'label': 'Voiture'},
            {'profession': 'Autres', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
            {'profession': 'Electrician', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Électricien'},
            {'profession': 'Mechanic', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plumber', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Logistics', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Logistique'},
            {'profession': 'Other', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
        ]
        # Insert defaults
        await db.service_fees.insert_many(default_fees)
        return default_fees
    
    return fees

@api_router.get("/admin/service-fees/{profession}")
async def get_service_fees_by_profession(profession: str):
    """Get service fees for a specific profession"""
    fees = await db.service_fees.find_one({'profession': profession}, {'_id': 0})
    
    if not fees:
        # Return default fees
        return {
            'profession': profession,
            'frais_visite': 50000,
            'frais_prestation': 100000,
            'label': profession
        }
    
    return fees

@api_router.put("/admin/service-fees")
async def update_service_fees(fees: ServiceFeesUpdate):
    """Update service fees for a profession"""
    update_data = {
        'profession': fees.profession,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if fees.frais_visite is not None:
        update_data['frais_visite'] = fees.frais_visite
    if fees.frais_prestation is not None:
        update_data['frais_prestation'] = fees.frais_prestation
    
    result = await db.service_fees.update_one(
        {'profession': fees.profession},
        {'$set': update_data},
        upsert=True
    )
    
    # Return updated fees
    updated_fees = await db.service_fees.find_one({'profession': fees.profession}, {'_id': 0})
    return updated_fees

@api_router.put("/admin/service-fees/bulk")
async def update_bulk_service_fees(fees_list: List[ServiceFeesUpdate]):
    """Update multiple service fees at once"""
    results = []
    for fees in fees_list:
        update_data = {
            'profession': fees.profession,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if fees.frais_visite is not None:
            update_data['frais_visite'] = fees.frais_visite
        if fees.frais_prestation is not None:
            update_data['frais_prestation'] = fees.frais_prestation
        
        await db.service_fees.update_one(
            {'profession': fees.profession},
            {'$set': update_data},
            upsert=True
        )
        
        updated = await db.service_fees.find_one({'profession': fees.profession}, {'_id': 0})
        results.append(updated)
    
    return results

# Public endpoint to get service fees (for providers and customers)
@api_router.get("/service-fees")
async def get_public_service_fees():
    """Get all service fees (public endpoint)"""
    fees = await db.service_fees.find({}, {'_id': 0}).to_list(100)
    
    if not fees:
        # Return defaults
        return [
            {'profession': 'Logisticien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Logisticien'},
            {'profession': 'Electromecanicien', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Électromécanicien'},
            {'profession': 'Mecanicien', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Mécanicien'},
            {'profession': 'Plombier', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Plombier'},
            {'profession': 'Macon', 'frais_visite': 50000, 'frais_prestation': 150000, 'label': 'Maçon'},
            {'profession': 'Menuisier', 'frais_visite': 50000, 'frais_prestation': 120000, 'label': 'Menuisier'},
            {'profession': 'AgentImmobilier', 'frais_visite': 100000, 'frais_prestation': 0, 'label': 'Agent Immobilier'},
            {'profession': 'Soudeur', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Soudeur'},
            {'profession': 'Camionneur', 'frais_visite': 0, 'frais_prestation': 200000, 'label': 'Camionneur'},
            {'profession': 'Tracteur', 'frais_visite': 0, 'frais_prestation': 150000, 'label': 'Tracteur'},
            {'profession': 'Voiture', 'frais_visite': 0, 'frais_prestation': 100000, 'label': 'Voiture'},
            {'profession': 'Autres', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Autres'},
            {'profession': 'Electrician', 'frais_visite': 50000, 'frais_prestation': 100000, 'label': 'Électricien'},
        ]
    
    return fees

@api_router.get("/service-fees/{profession}")
async def get_public_fees_by_profession(profession: str):
    """Get service fees for a specific profession (public endpoint)"""
    fees = await db.service_fees.find_one({'profession': profession}, {'_id': 0})
    
    if not fees:
        return {
            'profession': profession,
            'frais_visite': 50000,
            'frais_prestation': 100000,
            'label': profession
        }
    
    return fees

@api_router.get("/admin/settings")
async def get_admin_settings():
    """Get admin platform settings"""
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    
    if not settings:
        # Return default settings if none exist - All commissions are percentages by domain
        default_settings = {
            'type': 'platform_settings',
            'commission_prestation': 10.0,        # 10% Prestation de services
            'commission_location_courte': 10.0,   # 10% Location courte durée
            'commission_location_longue': 5.0,    # 5% Location longue durée
            'commission_vente': 3.0,              # 3% Vente immobilière
            'commission_location_vehicule': 10.0, # 10% Location véhicule
            'devise': 'GNF',                      # Devise par défaut
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.admin_settings.insert_one(default_settings)
        return {k: v for k, v in default_settings.items() if k != '_id'}
    
    # Migrate old settings format to new format if needed
    if 'commission_location_courte' not in settings:
        settings['commission_prestation'] = settings.get('commission_prestation', 10.0) if settings.get('commission_prestation', 0) > 100 else settings.get('commission_prestation', 10.0)
        settings['commission_location_courte'] = 10.0
        settings['commission_location_longue'] = 5.0
        settings['commission_vente'] = settings.get('commission_vente', 3.0)
        settings['commission_location_vehicule'] = 10.0
    
    return settings

@api_router.put("/admin/settings")
async def update_admin_settings(settings: AdminSettingsUpdate):
    """Update admin platform settings"""
    update_data = {
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if settings.commission_prestation is not None:
        update_data['commission_prestation'] = settings.commission_prestation
    if settings.commission_location_courte is not None:
        update_data['commission_location_courte'] = settings.commission_location_courte
    if settings.commission_location_longue is not None:
        update_data['commission_location_longue'] = settings.commission_location_longue
    if settings.commission_vente is not None:
        update_data['commission_vente'] = settings.commission_vente
    if settings.commission_location_vehicule is not None:
        update_data['commission_location_vehicule'] = settings.commission_location_vehicule
    if settings.devise is not None:
        update_data['devise'] = settings.devise
    
    result = await db.admin_settings.update_one(
        {'type': 'platform_settings'},
        {'$set': update_data},
        upsert=True
    )
    
    # Return updated settings
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    return settings

@api_router.get("/admin/commission-revenue")
async def get_commission_revenue():
    """Calculate commission revenue for the last 30 days by domain"""
    from datetime import timedelta
    
    # Get settings
    settings = await db.admin_settings.find_one({'type': 'platform_settings'}, {'_id': 0})
    if not settings:
        settings = {
            'commission_prestation': 10.0,        # 10%
            'commission_location_courte': 10.0,   # 10%
            'commission_location_longue': 5.0,    # 5%
            'commission_vente': 3.0,              # 3%
            'commission_location_vehicule': 10.0, # 10%
            'devise': 'GNF'
        }
    
    # Calculate date 30 days ago
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Get successful payments from the last 30 days
    payments = await db.payments.find({
        'status': 'completed',
        'created_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(1000)
    
    # Get property sales from the last 30 days
    sales = await db.property_sales.find({
        'status': 'sold',
        'sold_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(1000)
    
    # Get rentals for location calculations
    rentals = await db.rentals.find({
        'status': 'approved',
        'created_at': {'$gte': thirty_days_ago}
    }, {'_id': 0}).to_list(1000)
    
    # Calculate totals
    total_payments = len(payments)
    total_sales = len(sales)
    total_rentals = len(rentals)
    total_payment_amount = sum(p.get('amount', 0) for p in payments)
    total_sales_amount = sum(s.get('price', 0) for s in sales)
    
    # Commission breakdown by domain (all percentages)
    # 1. Prestation de services
    prestation_amount = sum(p.get('amount', 0) for p in payments if p.get('payment_type') == 'prestation')
    commission_prestation = prestation_amount * (settings.get('commission_prestation', 10.0) / 100)
    prestation_count = sum(1 for p in payments if p.get('payment_type') == 'prestation')
    
    # 2. Location courte durée
    location_courte_amount = sum(r.get('price_per_night', 0) * 30 for r in rentals if r.get('listing_type') == 'short_term')
    commission_location_courte = location_courte_amount * (settings.get('commission_location_courte', 10.0) / 100)
    location_courte_count = sum(1 for r in rentals if r.get('listing_type') == 'short_term')
    
    # 3. Location longue durée
    location_longue_amount = sum(r.get('price_per_month', 0) for r in rentals if r.get('listing_type') == 'long_term')
    commission_location_longue = location_longue_amount * (settings.get('commission_location_longue', 5.0) / 100)
    location_longue_count = sum(1 for r in rentals if r.get('listing_type') == 'long_term')
    
    # 4. Vente immobilière
    commission_vente = total_sales_amount * (settings.get('commission_vente', 3.0) / 100)
    
    # 5. Location véhicule
    vehicule_amount = sum(r.get('price_per_day', 0) * 30 for r in rentals if r.get('listing_type') == 'vehicle')
    commission_location_vehicule = vehicule_amount * (settings.get('commission_location_vehicule', 10.0) / 100)
    vehicule_count = sum(1 for r in rentals if r.get('listing_type') == 'vehicle')
    
    # Also include visite payments (frais d'investigation) under prestation
    visite_amount = sum(p.get('amount', 0) for p in payments if p.get('payment_type', 'visite') == 'visite' or not p.get('payment_type'))
    commission_visite = visite_amount * (settings.get('commission_prestation', 10.0) / 100)
    visite_count = sum(1 for p in payments if p.get('payment_type', 'visite') == 'visite' or not p.get('payment_type'))
    
    total_commission = (commission_prestation + commission_location_courte + 
                       commission_location_longue + commission_vente + 
                       commission_location_vehicule + commission_visite)
    
    devise = settings.get('devise', 'GNF')
    
    return {
        'period': '30 derniers jours',
        'total_transactions': total_payments,
        'total_sales': total_sales,
        'total_rentals': total_rentals,
        'total_volume_payments': total_payment_amount,
        'total_volume_sales': total_sales_amount,
        'commission_breakdown': {
            'prestation': round(commission_prestation + commission_visite, 0),
            'location_courte': round(commission_location_courte, 0),
            'location_longue': round(commission_location_longue, 0),
            'vente': round(commission_vente, 0),
            'location_vehicule': round(commission_location_vehicule, 0)
        },
        'volume_breakdown': {
            'prestation': round(prestation_amount + visite_amount, 0),
            'location_courte': round(location_courte_amount, 0),
            'location_longue': round(location_longue_amount, 0),
            'vente': round(total_sales_amount, 0),
            'location_vehicule': round(vehicule_amount, 0)
        },
        'transaction_counts': {
            'prestation': prestation_count + visite_count,
            'location_courte': location_courte_count,
            'location_longue': location_longue_count,
            'vente': total_sales,
            'location_vehicule': vehicule_count
        },
        'total_commission': round(total_commission, 0),
        'devise': devise,
        'rates': {
            'commission_prestation': settings.get('commission_prestation', 10.0),
            'commission_location_courte': settings.get('commission_location_courte', 10.0),
            'commission_location_longue': settings.get('commission_location_longue', 5.0),
            'commission_vente': settings.get('commission_vente', 3.0),
            'commission_location_vehicule': settings.get('commission_location_vehicule', 10.0)
        }
    }

# Include router
app.include_router(api_router)

# Serve uploaded files - IMPORTANT: Use /api/uploads to work with Kubernetes ingress
from fastapi.staticfiles import StaticFiles
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()