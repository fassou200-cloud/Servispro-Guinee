from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Form
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
import logging

from database import db
from config import ADMIN_ACCOUNTS, JWT_SECRET, JWT_ALGORITHM
from dependencies import get_current_user, get_current_company, get_current_customer, hash_password, verify_password, create_token
from models import (
    RegisterInput, LoginInput, AuthResponse, CustomerRegisterInput,
    CompanyRegisterInput, CompanyLoginInput, CompanyResetPasswordInput,
    AdminLoginInput, AdminRegisterInput, PasswordResetRequest, PasswordResetVerify,
    ProfessionType, UserType, ServiceProvider, ProviderStatus
)
from utils.security import log_audit_event, get_client_ip, is_ip_blocked, record_failed_attempt, clear_failed_attempts
from utils.storage import upload_to_cloudinary

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory OTP storage for password reset (consider Redis for production)
password_reset_otps = {}


def normalize_phone(raw: str) -> str:
    """Normalize a Guinea phone number to '224XXXXXXXXX' format."""
    phone = raw.strip().replace(" ", "").replace("-", "").replace(".", "").replace("+", "")
    if phone.startswith('00224'):
        phone = phone[2:]
    if phone.startswith('224') and len(phone) > 9:
        return phone
    return '224' + phone


def phone_variants(raw: str) -> list:
    """Generate all possible phone format variants for DB lookup."""
    phone = raw.strip().replace(" ", "").replace("-", "").replace(".", "").replace("+", "")
    if phone.startswith('00224'):
        phone = phone[2:]
    if phone.startswith('224') and len(phone) > 9:
        base = phone[3:]
    else:
        base = phone
    return list(dict.fromkeys([
        '224' + base,
        base,
        '+224' + base,
        phone,
        '+224' + base.lstrip('0'),
        '224' + base.lstrip('0'),
    ]))

@router.post("/auth/register", response_model=AuthResponse)
async def register(
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone_number: str = Form(...),
    password: str = Form(...),
    profession: str = Form(...),
    profession_group: str = Form(""),
    years_experience: str = Form(""),
    custom_profession: str = Form(""),
    location: str = Form(""),
    region: str = Form(""),
    ville: str = Form(""),
    commune: str = Form(""),
    quartier: str = Form(""),
    about: str = Form(""),
    profile_photo: Optional[UploadFile] = File(None),
    documents: List[UploadFile] = File(default=[])
):
    # Validate "about" field doesn't contain contact information
    if about:
        import re
        # Phone number patterns
        phone_patterns = [
            r'\+?\d{3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}',
            r'\d{9,}',
            r'\d{2,4}[\s.-]\d{2,4}[\s.-]\d{2,4}',
        ]
        # Email pattern
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        
        for pattern in phone_patterns:
            if re.search(pattern, about):
                raise HTTPException(
                    status_code=400, 
                    detail="La section 'À propos' ne doit pas contenir de numéro de téléphone. Cela est contraire aux règles de la plateforme."
                )
        
        if re.search(email_pattern, about, re.IGNORECASE):
            raise HTTPException(
                status_code=400, 
                detail="La section 'À propos' ne doit pas contenir d'adresse email. Cela est contraire aux règles de la plateforme."
            )
        
        # Check for contact phrases
        contact_phrases = [r'whatsapp', r'telegram', r'appel[ez]?\s*moi', r'contact[ez]?\s*moi']
        for phrase in contact_phrases:
            if re.search(phrase, about, re.IGNORECASE):
                raise HTTPException(
                    status_code=400, 
                    detail="La section 'À propos' ne doit pas contenir d'informations de contact. Cela est contraire aux règles de la plateforme."
                )
    
    # Validate "about" field is not empty (minimum 20 characters)
    if not about or len(about.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="La section 'À propos' est obligatoire (minimum 20 caractères)"
        )
    
    # Validate at least one document is provided
    if not documents or len(documents) == 0 or all(doc.filename == '' for doc in documents):
        raise HTTPException(
            status_code=400,
            detail="Veuillez télécharger au moins un document justificatif"
        )
    
    # Normalize phone number (remove spaces, dashes, +, etc.)
    phone = phone_number.strip().replace(" ", "").replace("-", "").replace(".", "").replace("+", "")
    
    # Extract the base number without country code
    if phone.startswith('224'):
        base_phone = phone[3:]
    else:
        base_phone = phone
    
    # Create all possible variants to check
    phone_variants = [
        phone,                    # As provided (normalized)
        base_phone,               # Without country code
        '224' + base_phone,       # With 224 prefix
        '+224' + base_phone,      # With +224 prefix
    ]
    
    # Check all variants in the database
    for variant in phone_variants:
        existing = await db.service_providers.find_one({'phone_number': variant})
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà enregistré comme prestataire")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(password)
    
    # Normalized phone number for storage
    normalized_phone = '224' + base_phone if not phone.startswith('224') else phone
    
    # Handle profile photo upload to Cloudinary
    profile_photo_path = None
    if profile_photo and profile_photo.filename:
        file_ext = profile_photo.filename.split('.')[-1].lower()
        if file_ext in ['jpg', 'jpeg', 'png', 'webp']:
            result = await upload_to_cloudinary(profile_photo, folder="servispro/profiles")
            if result["success"]:
                profile_photo_path = result["url"]
            else:
                raise HTTPException(status_code=502, detail=f"Échec du téléversement de la photo de profil : {result.get('error', 'Cloudinary indisponible')}. Réessayez avec une image plus légère.")
    
    # Handle documents upload to Cloudinary
    uploaded_documents = []
    rejected_documents = []
    for idx, doc in enumerate(documents):
        if doc and doc.filename:
            file_ext = doc.filename.split('.')[-1].lower()
            if file_ext not in ['jpg', 'jpeg', 'png', 'pdf', 'webp']:
                rejected_documents.append(f"{doc.filename} (format non supporté)")
                continue
            result = await upload_to_cloudinary(doc, folder="servispro/documents")
            if result["success"]:
                uploaded_documents.append({
                    "filename": doc.filename,
                    "path": result["url"],
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                })
            else:
                rejected_documents.append(f"{doc.filename} ({result.get('error', 'upload échoué')})")
    
    # Fail if NO document was successfully uploaded
    if not uploaded_documents:
        msg = "Aucun document n'a pu être téléversé."
        if rejected_documents:
            msg += " Détails : " + " ; ".join(rejected_documents)
        msg += " Compressez vos fichiers (max 2 Mo, formats PDF/JPG/PNG) puis réessayez."
        raise HTTPException(status_code=400, detail=msg)
    
    user_doc = {
        'id': user_id,
        'first_name': first_name,
        'last_name': last_name,
        'phone_number': normalized_phone,
        'password': hashed_pwd,
        'profession': profession,
        'profession_group': profession_group,
        'years_experience': years_experience,
        'custom_profession': custom_profession if custom_profession else None,
        'location': location,
        'region': region,
        'ville': ville,
        'commune': commune,
        'quartier': quartier,
        'about_me': about,
        'profile_picture': profile_photo_path,
        'documents': uploaded_documents,
        'id_verification_picture': None,
        'online_status': False,
        'verification_status': ProviderStatus.PENDING.value,
        'price': None,
        'investigation_fee': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_providers.insert_one(user_doc)
    
    # Generate token
    token = create_token(user_id)
    
    # Get user from database without _id and password
    user_response = await db.service_providers.find_one({'id': user_id}, {'_id': 0, 'password': 0})
    
    return AuthResponse(token=token, user=user_response)


@router.post("/auth/login", response_model=AuthResponse)
async def login(input_data: LoginInput, request: Request):
    client_ip = get_client_ip(request)
    
    # Check if IP is blocked
    if is_ip_blocked(client_ip):
        await log_audit_event(
            event_type="LOGIN_BLOCKED",
            ip_address=client_ip,
            user_type=input_data.user_type.value,
            details={"phone": input_data.phone_number, "reason": "rate_limited"},
            success=False
        )
        raise HTTPException(
            status_code=429, 
            detail="Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
        )
    
    # Determine which collection to search
    if input_data.user_type == UserType.PROVIDER:
        collection = db.service_providers
    else:
        collection = db.customers
    
    # Find user — try all phone number variants
    user = await collection.find_one({'phone_number': {'$in': phone_variants(input_data.phone_number)}})
    if not user:
        # Record failed attempt
        was_blocked = record_failed_attempt(client_ip)
        await log_audit_event(
            event_type="LOGIN_FAILED",
            ip_address=client_ip,
            user_type=input_data.user_type.value,
            details={"phone": input_data.phone_number, "reason": "user_not_found", "blocked": was_blocked},
            success=False
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(input_data.password, user['password']):
        # Record failed attempt
        was_blocked = record_failed_attempt(client_ip)
        await log_audit_event(
            event_type="LOGIN_FAILED",
            user_id=user['id'],
            ip_address=client_ip,
            user_type=input_data.user_type.value,
            details={"phone": input_data.phone_number, "reason": "invalid_password", "blocked": was_blocked},
            success=False
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts on successful login
    clear_failed_attempts(client_ip)
    
    # Generate token
    token = create_token(user['id'])
    
    # Log successful login
    await log_audit_event(
        event_type="LOGIN_SUCCESS",
        user_id=user['id'],
        ip_address=client_ip,
        user_type=input_data.user_type.value,
        details={"phone": input_data.phone_number},
        success=True
    )
    
    # Return user without password
    user_response = {k: v for k, v in user.items() if k not in ['password', '_id']}
    user_response['user_type'] = input_data.user_type.value
    
    return AuthResponse(token=token, user=user_response)


@router.post("/auth/customer/register", response_model=AuthResponse)
async def register_customer(input_data: CustomerRegisterInput):
    # Normalize phone number (remove spaces, dashes, +, etc.)
    phone = input_data.phone_number.strip().replace(" ", "").replace("-", "").replace(".", "").replace("+", "")
    
    # Extract the base number without country code
    if phone.startswith('224'):
        base_phone = phone[3:]
    else:
        base_phone = phone
    
    # Create all possible variants to check
    phone_variants = [
        phone,                    # As provided (normalized)
        base_phone,               # Without country code
        '224' + base_phone,       # With 224 prefix
        '+224' + base_phone,      # With +224 prefix
    ]
    
    # Check all variants in the database
    for variant in phone_variants:
        existing = await db.customers.find_one({'phone_number': variant})
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà enregistré comme client")
    
    # Create customer
    customer_id = str(uuid.uuid4())
    hashed_pwd = hash_password(input_data.password)
    
    # Store phone number in normalized format (with 224 prefix)
    normalized_phone = '224' + base_phone if not phone.startswith('224') else phone
    
    customer_doc = {
        'id': customer_id,
        'first_name': input_data.first_name,
        'last_name': input_data.last_name,
        'phone_number': normalized_phone,
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

@router.post("/auth/company/register", response_model=AuthResponse)
async def register_company(input_data: CompanyRegisterInput):
    """Register a new company"""
    # Check if RCCM number already exists (only if provided)
    if input_data.rccm_number:
        existing_company = await db.companies.find_one({'rccm_number': input_data.rccm_number})
        if existing_company:
            raise HTTPException(status_code=400, detail="Ce numéro RCCM est déjà enregistré")
    
    # Normalize phone and check all variants
    normalized = normalize_phone(input_data.phone_number)
    for variant in phone_variants(input_data.phone_number):
        existing_phone = await db.companies.find_one({'phone_number': variant})
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
        'phone_number': normalized,
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


@router.post("/auth/company/login", response_model=AuthResponse)
async def login_company(input_data: CompanyLoginInput, request: Request):
    """Login for companies using phone number"""
    client_ip = get_client_ip(request)
    
    # Check if IP is blocked
    if is_ip_blocked(client_ip):
        await log_audit_event(
            event_type="COMPANY_LOGIN_BLOCKED",
            ip_address=client_ip,
            user_type="company",
            details={"phone": input_data.phone_number, "reason": "rate_limited"},
            success=False
        )
        raise HTTPException(
            status_code=429, 
            detail="Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
        )
    
    company = await db.companies.find_one({'phone_number': {'$in': phone_variants(input_data.phone_number)}})
    if not company:
        was_blocked = record_failed_attempt(client_ip)
        await log_audit_event(
            event_type="COMPANY_LOGIN_FAILED",
            ip_address=client_ip,
            user_type="company",
            details={"phone": input_data.phone_number, "reason": "not_found", "blocked": was_blocked},
            success=False
        )
        raise HTTPException(status_code=401, detail="Numéro de téléphone ou mot de passe incorrect")
    
    if not verify_password(input_data.password, company['password']):
        was_blocked = record_failed_attempt(client_ip)
        await log_audit_event(
            event_type="COMPANY_LOGIN_FAILED",
            user_id=company['id'],
            ip_address=client_ip,
            user_type="company",
            details={"phone": input_data.phone_number, "reason": "invalid_password", "blocked": was_blocked},
            success=False
        )
        raise HTTPException(status_code=401, detail="Numéro de téléphone ou mot de passe incorrect")
    
    # Clear failed attempts on successful login
    clear_failed_attempts(client_ip)
    
    # Generate token
    token = create_token(company['id'])
    
    # Log successful login
    await log_audit_event(
        event_type="COMPANY_LOGIN_SUCCESS",
        user_id=company['id'],
        ip_address=client_ip,
        user_type="company",
        details={"phone": input_data.phone_number, "company_name": company.get('company_name')},
        success=True
    )
    
    # Return company without password and _id
    company_response = {k: v for k, v in company.items() if k not in ['password', '_id']}
    company_response['user_type'] = 'company'
    
    return AuthResponse(token=token, user=company_response)


@router.post("/auth/company/reset-password")
async def reset_company_password(input_data: CompanyResetPasswordInput, request: Request):
    """Reset company password by verifying phone number and email"""
    client_ip = get_client_ip(request)
    
    if is_ip_blocked(client_ip):
        raise HTTPException(status_code=429, detail="Trop de tentatives. Veuillez réessayer dans 15 minutes.")
    
    company = await db.companies.find_one({'phone_number': {'$in': phone_variants(input_data.phone_number)}})
    if not company or (company.get('email', '').lower() != input_data.email.lower()):
        record_failed_attempt(client_ip)
        await log_audit_event(
            event_type="COMPANY_PASSWORD_RESET_FAILED",
            ip_address=client_ip,
            user_type="company",
            details={"phone": input_data.phone_number, "email": input_data.email, "reason": "no_match"},
            success=False
        )
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec ce numéro de téléphone et cet email")
    
    if len(input_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    hashed_password = hash_password(input_data.new_password)
    await db.companies.update_one(
        {'id': company['id']},
        {'$set': {'password': hashed_password, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    clear_failed_attempts(client_ip)
    
    await log_audit_event(
        event_type="COMPANY_PASSWORD_RESET_SUCCESS",
        user_id=company['id'],
        ip_address=client_ip,
        user_type="company",
        details={"phone": input_data.phone_number, "company_name": company.get('company_name')},
        success=True
    )
    
    return {"message": "Mot de passe réinitialisé avec succès"}

# Company Profile Routes

@router.post("/auth/forgot-password")
async def request_password_reset(request: PasswordResetRequest):
    """Request a password reset - sends OTP to phone"""
    phone = request.phone_number
    user_type = request.user_type
    
    # Use shared phone variant lookup
    variants = phone_variants(phone)
    
    # Find user based on type
    user = None
    
    if user_type == 'provider':
        user = await db.service_providers.find_one({'phone_number': {'$in': variants}})
    elif user_type == 'customer':
        user = await db.customers.find_one({'phone_number': {'$in': variants}})
    elif user_type == 'company':
        user = await db.companies.find_one({'phone_number': {'$in': variants}})
    
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec ce numéro de téléphone")
    
    # The phone number as stored in DB
    matched_phone = user.get('phone_number', phone)
    
    # Generate OTP (6 digits)
    import random
    otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store OTP with expiration (10 minutes) - use matched phone for consistency
    password_reset_otps[f"{user_type}_{matched_phone}"] = {
        'otp': otp,
        'expires_at': datetime.now(timezone.utc) + timedelta(minutes=10),
        'original_phone': phone,
        'matched_phone': matched_phone
    }
    
    # In production, send SMS here. For now, return OTP in response (dev mode)
    return {
        'message': f'Code OTP envoyé au {phone}',
        'otp_for_testing': otp,  # Remove this in production!
        'expires_in_minutes': 10
    }


@router.post("/auth/reset-password")
async def reset_password(request: PasswordResetVerify):
    """Verify OTP and reset password"""
    phone = request.phone_number
    user_type = request.user_type
    otp = request.verification_code
    new_password = request.new_password
    
    # Normalize phone number
    phone_clean = phone.replace('+', '').replace(' ', '').replace('-', '')
    if len(phone_clean) >= 9:
        base_phone = phone_clean[-9:]
    else:
        base_phone = phone_clean
    
    # Try multiple phone formats to find the OTP
    phone_patterns = [
        phone,
        phone_clean,
        f"+224{base_phone}",
        f"224{base_phone}",
        base_phone,
    ]
    
    stored_otp = None
    otp_key = None
    matched_phone = None
    
    for p in phone_patterns:
        key = f"{user_type}_{p}"
        if key in password_reset_otps:
            stored_otp = password_reset_otps[key]
            otp_key = key
            matched_phone = stored_otp.get('matched_phone', p)
            break
    
    if not stored_otp:
        raise HTTPException(status_code=400, detail="Aucune demande de réinitialisation en cours")
    
    if datetime.now(timezone.utc) > stored_otp['expires_at']:
        del password_reset_otps[otp_key]
        raise HTTPException(status_code=400, detail="Le code OTP a expiré")
    
    if stored_otp['otp'] != otp:
        raise HTTPException(status_code=400, detail="Code OTP incorrect")
    
    # Hash new password
    hashed_pwd = hash_password(new_password)
    
    # Update password based on user type - use matched_phone from DB
    if user_type == 'provider':
        await db.service_providers.update_one(
            {'phone_number': matched_phone},
            {'$set': {'password': hashed_pwd, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    elif user_type == 'customer':
        await db.customers.update_one(
            {'phone_number': matched_phone},
            {'$set': {'password': hashed_pwd, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    elif user_type == 'company':
        await db.companies.update_one(
            {'phone_number': matched_phone},
            {'$set': {'password': hashed_pwd, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    # Remove used OTP
    del password_reset_otps[otp_key]
    
    return {'message': 'Mot de passe réinitialisé avec succès'}


@router.post("/admin/register")
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


@router.post("/admin/login")
async def admin_login(input_data: AdminLoginInput, request: Request):
    client_ip = get_client_ip(request)
    
    # Check if IP is blocked
    if is_ip_blocked(client_ip):
        await log_audit_event(
            event_type="ADMIN_LOGIN_BLOCKED",
            ip_address=client_ip,
            user_type="admin",
            details={"username": input_data.username, "reason": "rate_limited"},
            success=False
        )
        raise HTTPException(
            status_code=429, 
            detail="Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
        )
    
    # Check predefined admin accounts
    for admin_account in ADMIN_ACCOUNTS:
        if input_data.username == admin_account["username"] and input_data.password == admin_account["password"]:
            clear_failed_attempts(client_ip)
            token = create_token(admin_account["username"])
            await log_audit_event(
                event_type="ADMIN_LOGIN_SUCCESS",
                user_id=admin_account["username"],
                ip_address=client_ip,
                user_type="super-admin",
                details={"username": input_data.username},
                success=True
            )
            return {
                "token": token, 
                "user": {
                    "id": admin_account["username"], 
                    "username": admin_account["username"],
                    "role": admin_account["role"]
                }
            }
    
    # Check database admins as fallback
    admin = await db.admins.find_one({'username': input_data.username}, {'_id': 0})
    if admin and bcrypt.checkpw(input_data.password.encode('utf-8'), admin['password'].encode('utf-8')):
        clear_failed_attempts(client_ip)
        token = create_token(admin['id'])
        await log_audit_event(
            event_type="ADMIN_LOGIN_SUCCESS",
            user_id=admin['id'],
            ip_address=client_ip,
            user_type="admin",
            details={"username": input_data.username},
            success=True
        )
        return {
            "token": token, 
            "user": {
                "id": admin['id'], 
                "username": admin['username'],
                "role": admin['role']
            }
        }
    
    # Record failed attempt
    was_blocked = record_failed_attempt(client_ip)
    await log_audit_event(
        event_type="ADMIN_LOGIN_FAILED",
        ip_address=client_ip,
        user_type="admin",
        details={"username": input_data.username, "reason": "invalid_credentials", "blocked": was_blocked},
        success=False
    )
    raise HTTPException(status_code=401, detail="Identifiants admin invalides")


