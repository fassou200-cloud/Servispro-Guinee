from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

# ==================== CHAT ROUTES (Rental Listings) ====================

@api_router.post("/chat/rental/{rental_id}/message")
async def send_chat_message(rental_id: str, message_data: ChatMessageCreate):
    """Send a chat message for a rental listing"""
    # Verify rental exists
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Get sender info from request (customer or owner)
    sender_id = message_data.message  # We'll pass sender info in the message for now
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': 'customer',
        'sender_name': 'Client',
        'sender_type': 'customer',
        'message': message_data.message,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id'}

@api_router.post("/chat/rental/{rental_id}/message/customer")
async def send_customer_message(rental_id: str, message_data: ChatMessageCreate):
    """Customer sends a message to rental owner"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    # Get customer info if logged in
    customer_name = "Client Anonyme"
    customer_id = "anonymous"
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': customer_id,
        'sender_name': customer_name,
        'sender_type': 'customer',
        'message': message_data.message,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id'}

@api_router.post("/chat/rental/{rental_id}/message/owner")
async def send_owner_message(rental_id: str, message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Owner sends a message to customer"""
    rental = await db.rental_listings.find_one({'id': rental_id}, {'_id': 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    if rental.get('service_provider_id') != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    message_id = str(uuid.uuid4())
    message_doc = {
        'id': message_id,
        'rental_id': rental_id,
        'sender_id': current_user['id'],
        'sender_name': f"{current_user['first_name']} {current_user['last_name']}",
        'sender_type': 'owner',
        'message': message_data.message,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {k: v for k, v in message_doc.items() if k != '_id'}

@api_router.get("/chat/rental/{rental_id}/messages")
async def get_rental_chat_messages(rental_id: str):
    """Get all chat messages for a rental listing"""
    messages = await db.chat_messages.find(
        {'rental_id': rental_id}, 
        {'_id': 0}
    ).sort('created_at', 1).to_list(100)
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
    
    return {
        'providers': {
            'total': total_providers,
            'pending': pending_providers,
            'approved': approved_providers
        },
        'jobs': {
            'total': total_jobs,
            'pending': pending_jobs,
            'accepted': accepted_jobs,
            'completed': completed_jobs
        },
        'customers': total_customers,
        'rentals': total_rentals
    }

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