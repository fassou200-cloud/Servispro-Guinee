from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
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
    transport_fee: Optional[int] = None

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
    transport_fee: Optional[int] = None
    created_at: str

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

class RentalListingCreate(BaseModel):
    property_type: PropertyType
    title: str
    description: str
    location: str
    rental_price: float
    # New fields for short-term rentals (Airbnb-style)
    rental_type: str = "long_term"  # "long_term" or "short_term"
    price_per_night: Optional[float] = None  # For short-term rentals
    min_nights: Optional[int] = 1  # Minimum nights for short-term
    max_guests: Optional[int] = None  # Maximum number of guests
    amenities: List[str] = []  # List of amenities (WiFi, AC, etc.)
    is_available: bool = True  # Availability status
    available_from: Optional[str] = None  # Available from date
    available_to: Optional[str] = None  # Available to date
    
    @field_validator('rental_price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Rental price must be greater than 0')
        return v

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
    rental_price: float
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
        'transport_fee': None,  # Frais de transport en GNF
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
        'created_at': now,
        'updated_at': now
    }
    
    await db.rental_listings.insert_one(listing_doc)
    
    listing_response = {k: v for k, v in listing_doc.items() if k != '_id'}
    return RentalListing(**listing_response)

@api_router.get("/rentals", response_model=List[RentalListing])
async def get_all_rentals(rental_type: Optional[str] = None, is_available: Optional[bool] = None):
    """Get all rentals with optional filters"""
    query = {}
    if rental_type:
        query['rental_type'] = rental_type
    if is_available is not None:
        query['is_available'] = is_available
    
    rentals = await db.rental_listings.find(query, {'_id': 0}).to_list(100)
    return [RentalListing(**r) for r in rentals]

@api_router.get("/rentals/my-listings", response_model=List[RentalListing])
async def get_my_rental_listings(current_user: dict = Depends(get_current_user)):
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
    invite_code: str

@api_router.post("/admin/register")
async def admin_register(input_data: AdminRegisterInput):
    """Register a new admin with invitation code"""
    # Verify invitation code
    if input_data.invite_code != ADMIN_INVITE_CODE:
        raise HTTPException(status_code=403, detail="Code d'invitation invalide")
    
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

@api_router.get("/admin/stats")
async def get_admin_stats():
    """Get statistics for admin dashboard"""
    total_providers = await db.service_providers.count_documents({})
    pending_providers = await db.service_providers.count_documents({'verification_status': 'pending'})
    approved_providers = await db.service_providers.count_documents({'verification_status': 'approved'})
    
    total_jobs = await db.job_offers.count_documents({})
    pending_jobs = await db.job_offers.count_documents({'status': 'Pending'})
    accepted_jobs = await db.job_offers.count_documents({'status': 'Accepted'})
    completed_jobs = await db.job_offers.count_documents({'status': 'Completed'})
    
    total_customers = await db.customers.count_documents({})
    total_rentals = await db.rental_listings.count_documents({})
    long_term_rentals = await db.rental_listings.count_documents({'rental_type': 'long_term'})
    short_term_rentals = await db.rental_listings.count_documents({'rental_type': 'short_term'})
    available_rentals = await db.rental_listings.count_documents({'is_available': True})
    
    # Count Agent Immobilier providers
    agent_immobilier_count = await db.service_providers.count_documents({'profession': 'AgentImmobilier'})
    
    return {
        'providers': {
            'total': total_providers,
            'pending': pending_providers,
            'approved': approved_providers,
            'agent_immobilier': agent_immobilier_count
        },
        'jobs': {
            'total': total_jobs,
            'pending': pending_jobs,
            'accepted': accepted_jobs,
            'completed': completed_jobs
        },
        'customers': total_customers,
        'rentals': {
            'total': total_rentals,
            'long_term': long_term_rentals,
            'short_term': short_term_rentals,
            'available': available_rentals
        }
    }

@api_router.get("/admin/rentals")
async def get_all_rentals_admin():
    """Get all rental listings for admin dashboard"""
    rentals = await db.rental_listings.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return rentals

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