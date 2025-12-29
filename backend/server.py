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

# File upload configuration
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class ProfessionType(str, Enum):
    ELECTRICIAN = "Electrician"
    MECHANIC = "Mechanic"
    PLUMBER = "Plumber"
    LOGISTICS = "Logistics"

class JobStatus(str, Enum):
    PENDING = "Pending"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    COMPLETED = "Completed"

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

class AuthResponse(BaseModel):
    token: str
    user: dict

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profession: Optional[ProfessionType] = None
    about_me: Optional[str] = None
    online_status: Optional[bool] = None

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
    # Find user
    user = await db.service_providers.find_one({'phone_number': input_data.phone_number})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(input_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = create_token(user['id'])
    
    # Return user without password
    user_response = {k: v for k, v in user.items() if k not in ['password', '_id']}
    
    return AuthResponse(token=token, user=user_response)

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
    profile_picture_url = f"/uploads/{filename}"
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
    id_verification_url = f"/uploads/{filename}"
    await db.service_providers.update_one(
        {'id': current_user['id']},
        {'$set': {'id_verification_picture': id_verification_url}}
    )
    
    return {'id_verification_picture': id_verification_url}

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

# Include router
app.include_router(api_router)

# Serve uploaded files
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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