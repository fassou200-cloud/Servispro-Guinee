from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import List, Optional, Dict
from enum import Enum


# ==================== ENUMS ====================

class ProfessionType(str, Enum):
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
    PROVIDER_COMPLETED = "ProviderCompleted"
    COMPLETED = "Completed"

class ProviderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class PropertyType(str, Enum):
    APARTMENT = "Apartment"
    HOUSE = "House"

class VisitRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VehicleSaleStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SOLD = "sold"
    REJECTED = "rejected"

class ListingApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class NotificationType(str, Enum):
    SERVICE_REQUEST = "service_request"
    PAYMENT_RECEIVED = "payment_received"
    JOB_ACCEPTED = "job_accepted"
    JOB_REJECTED = "job_rejected"
    JOB_COMPLETED = "job_completed"
    SYSTEM = "system"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class CreditTransactionType(str, Enum):
    VISIT_REJECTED = "visit_rejected"
    PROVIDER_NO_SHOW = "provider_no_show"
    USED_FOR_PAYMENT = "used_for_payment"
    ADMIN_ADJUSTMENT = "admin_adjustment"
    REFUND = "refund"

class FeedbackType(str, Enum):
    BUG = "bug"
    ISSUE = "issue"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"
    CONTACT = "contact"
    OTHER = "other"

class FeedbackStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class VehicleType(str, Enum):
    CAMION = "Camion"

class FuelType(str, Enum):
    ESSENCE = "Essence"
    DIESEL = "Diesel"
    ELECTRIQUE = "Electrique"
    HYBRIDE = "Hybride"

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


# ==================== AUTH MODELS ====================

class RegisterInput(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    password: str
    profession: ProfessionType
    custom_profession: Optional[str] = None
    
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

class AuthResponse(BaseModel):
    token: str
    user: dict

class AdminLoginInput(BaseModel):
    username: str
    password: str

class AdminRegisterInput(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class PasswordResetRequest(BaseModel):
    phone_number: str
    user_type: str  # 'provider' or 'customer'

class PasswordResetVerify(BaseModel):
    phone_number: str
    user_type: str
    verification_code: Optional[str] = None
    otp: Optional[str] = None
    new_password: str
    
    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v
    
    @model_validator(mode='after')
    def get_code(self):
        code = self.otp or self.verification_code
        if not code:
            raise ValueError('OTP code is required')
        self.verification_code = code
        return self

class CompanyLoginInput(BaseModel):
    phone_number: str
    password: str

class CompanyResetPasswordInput(BaseModel):
    phone_number: str
    email: str
    new_password: str

class CompanyRegisterInput(BaseModel):
    company_name: str
    rccm_number: Optional[str] = None
    nif_number: Optional[str] = None
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


# ==================== ENTITY MODELS ====================

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    first_name: str
    last_name: str
    phone_number: str
    balance: float = 0.0
    created_at: str

class CreditTransaction(BaseModel):
    id: str
    customer_id: str
    customer_phone: str
    amount: float
    transaction_type: str
    description: str
    related_id: Optional[str] = None
    balance_after: float
    created_at: str

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profession: Optional[ProfessionType] = None
    custom_profession: Optional[str] = None
    about_me: Optional[str] = None
    online_status: Optional[bool] = None
    price: Optional[int] = None
    investigation_fee: Optional[int] = None
    years_experience: Optional[str] = None
    region: Optional[str] = None
    ville: Optional[str] = None
    commune: Optional[str] = None
    quartier: Optional[str] = None

class ServiceProvider(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    first_name: str
    last_name: str
    phone_number: str
    profession: str
    profession_group: Optional[str] = None
    years_experience: Optional[str] = None
    custom_profession: Optional[str] = None
    about_me: Optional[str] = None
    profile_picture: Optional[str] = None
    id_verification_picture: Optional[str] = None
    online_status: bool = False
    price: Optional[int] = None
    investigation_fee: Optional[int] = None
    location: Optional[str] = None
    region: Optional[str] = None
    ville: Optional[str] = None
    commune: Optional[str] = None
    quartier: Optional[str] = None
    documents: Optional[List[Dict]] = None
    verification_status: Optional[str] = None
    is_active: bool = True
    created_at: str


class ServiceProviderPublic(BaseModel):
    """Public-safe projection of a provider — strips PII documents that
    must not leak via public endpoints (national ID photo, diplomas, etc.).
    Used by the public `/providers` and `/providers/{id}` endpoints.
    """
    model_config = ConfigDict(extra="ignore")
    id: str
    first_name: str
    last_name: str
    phone_number: str
    profession: str
    profession_group: Optional[str] = None
    years_experience: Optional[str] = None
    custom_profession: Optional[str] = None
    about_me: Optional[str] = None
    profile_picture: Optional[str] = None
    online_status: bool = False
    price: Optional[int] = None
    investigation_fee: Optional[int] = None
    location: Optional[str] = None
    region: Optional[str] = None
    ville: Optional[str] = None
    commune: Optional[str] = None
    quartier: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: bool = True
    created_at: str

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
    logo: Optional[str] = None
    licence_exploitation: Optional[str] = None
    rccm_document: Optional[str] = None
    nif_document: Optional[str] = None
    attestation_fiscale: Optional[str] = None
    documents_additionnels: List[str] = []
    verification_status: str = "pending"
    online_status: bool = False
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

class CompanyChangePassword(BaseModel):
    current_password: str
    new_password: str


# ==================== NOTIFICATION & PAYMENT MODELS ====================

class NotificationCreate(BaseModel):
    user_id: str
    user_type: str
    title: str
    message: str
    notification_type: NotificationType
    related_id: Optional[str] = None

class PaymentCreate(BaseModel):
    job_id: str
    provider_id: str
    customer_phone: str
    customer_name: str
    amount: int
    payment_method: str


# ==================== JOB MODELS ====================

class JobOfferCreate(BaseModel):
    service_provider_id: str
    client_name: str
    service_type: str
    description: str
    location: Optional[str] = None
    scheduled_date: Optional[str] = None
    customer_id: Optional[str] = None
    customer_phone: Optional[str] = None

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
    customer_id: Optional[str] = None
    customer_phone: Optional[str] = None


# ==================== VISIT REQUEST MODELS ====================

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

class VisitPaymentUpdate(BaseModel):
    payment_status: str
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    amount_paid: Optional[float] = None


# ==================== VEHICLE MODELS ====================

class VehicleSaleCreate(BaseModel):
    vehicle_type: str
    brand: str
    model: str
    year: int
    mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    price: float
    description: str
    location: str
    condition: str = "used"
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

class VehicleListingCreate(BaseModel):
    vehicle_type: str
    brand: str
    model: str
    year: int
    fuel_type: str
    transmission: str = "Manuelle"
    seats: Optional[int] = None
    load_capacity: Optional[str] = None
    engine_power: Optional[str] = None
    description: str
    location: str
    price_per_day: int
    price_per_week: Optional[int] = None
    price_per_month: Optional[int] = None
    is_available: bool = True
    features: List[str] = []

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
    status: str
    message: Optional[str] = None
    created_at: str


# ==================== RENTAL MODELS ====================

class RentalListingCreate(BaseModel):
    property_type: PropertyType
    title: str
    description: str
    location: str
    rental_price: Optional[float] = None
    caution: Optional[float] = None
    mois_avance: Optional[int] = None
    rental_type: str = "long_term"
    price_per_night: Optional[float] = None
    min_nights: Optional[int] = 1
    max_guests: Optional[int] = None
    amenities: List[str] = []
    is_available: bool = True
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_prices(self):
        if self.rental_type == 'long_term':
            if self.rental_price is None or self.rental_price <= 0:
                raise ValueError('Le prix mensuel doit etre superieur a 0 pour les locations longue duree')
        elif self.rental_type == 'short_term':
            if self.price_per_night is None or self.price_per_night <= 0:
                raise ValueError('Le prix par nuit doit etre superieur a 0 pour les locations courte duree')
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
    rental_price: Optional[float] = None
    caution: Optional[float] = None
    mois_avance: Optional[int] = None
    rental_type: str = "long_term"
    price_per_night: Optional[float] = None
    min_nights: Optional[int] = 1
    max_guests: Optional[int] = None
    amenities: List[str] = []
    is_available: bool = True
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    photos: List[str] = []
    titre_foncier: Optional[str] = None
    registration_ministere: Optional[str] = None
    seller_id_document: Optional[str] = None
    documents_additionnels: List[str] = []
    approval_status: str = "pending"
    rejection_reason: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str
    updated_at: str

class ChatMessageCreate(BaseModel):
    rental_id: str
    message: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    rental_id: str
    sender_id: str
    sender_name: str
    sender_type: str
    message: str
    created_at: str

class RentalMessageInput(BaseModel):
    sender_name: str
    sender_phone: str
    sender_type: str = "customer"
    message: str


# ==================== PROPERTY SALE MODELS ====================

class PropertySaleCreate(BaseModel):
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
    status: str = "pending"
    photos: List[str] = []
    titre_foncier: Optional[str] = None
    registration_ministere: Optional[str] = None
    seller_id_document: Optional[str] = None
    documents_additionnels: List[str] = []
    documents_verified: bool = False
    verification_date: Optional[str] = None
    created_at: str
    updated_at: str

class PropertySaleInquiry(BaseModel):
    property_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    message: str
    budget_range: Optional[str] = None
    financing_type: Optional[str] = None

class AdminPropertyInquiryResponse(BaseModel):
    status: str
    admin_response: Optional[str] = None
    admin_notes: Optional[str] = None

class InquiryMessage(BaseModel):
    message: str


# ==================== REVIEW & FEEDBACK MODELS ====================

class SurveyData(BaseModel):
    punctuality: Optional[str] = None
    quality: Optional[str] = None
    communication: Optional[str] = None
    recommend: Optional[str] = None

class ReviewCreate(BaseModel):
    service_provider_id: str
    reviewer_name: str
    rating: int
    comment: str
    job_id: str
    customer_id: str
    survey: Optional[SurveyData] = None
    
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
    job_id: Optional[str] = None
    customer_id: Optional[str] = None
    survey: Optional[dict] = None

class FeedbackCreate(BaseModel):
    type: FeedbackType
    title: str
    description: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    user_type: Optional[str] = None
    page_url: Optional[str] = None

class Feedback(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str
    title: str
    description: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    user_type: Optional[str] = None
    page_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class ProductReviewCreate(BaseModel):
    rating: int
    comment: str
    
    @field_validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


# ==================== COMPANY SERVICE & JOB MODELS ====================

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
    contract_type: str
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


# ==================== MARKETPLACE MODELS ====================

class ShopCreate(BaseModel):
    name: str
    description: str
    sector: str
    contact_phone: str
    contact_email: Optional[str] = None
    location: Optional[str] = None

class ShopUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sector: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    logo: Optional[str] = None
    banner: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float = 0
    currency: str = "GNF"
    price_on_request: bool = False
    category_id: Optional[str] = None
    product_type: Optional[str] = None
    characteristics: Optional[dict] = None
    is_negotiable: bool = False
    is_available: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    price_on_request: Optional[bool] = None
    category_id: Optional[str] = None
    product_type: Optional[str] = None
    characteristics: Optional[dict] = None
    is_negotiable: Optional[bool] = None
    is_available: Optional[bool] = None

class ProductMessageCreate(BaseModel):
    message: str
    sender_name: str
    sender_phone: str


# ==================== ADMIN MODELS ====================

class UpdateProviderAboutInput(BaseModel):
    about_me: str

class UpdateProviderProfileInput(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    profession: Optional[str] = None
    custom_profession: Optional[str] = None
    about_me: Optional[str] = None
    years_experience: Optional[str] = None
    price: Optional[int] = None
    investigation_fee: Optional[int] = None

class AdminSettingsUpdate(BaseModel):
    # Visit fees
    visit_fee_amount: Optional[int] = None
    visit_fee_enabled: Optional[bool] = None
    visit_fee_description: Optional[str] = None
    # Commission settings
    commission_rate: Optional[float] = None
    commission_enabled: Optional[bool] = None
    # Agent listing fees
    agent_listing_fee: Optional[int] = None
    agent_listing_fee_enabled: Optional[bool] = None

class ServiceFeesUpdate(BaseModel):
    profession: str
    investigation_fee: Optional[int] = None
    investigation_fee_enabled: Optional[bool] = None
    service_fee: Optional[int] = None
    service_fee_enabled: Optional[bool] = None
    description: Optional[str] = None

class RefundRequest(BaseModel):
    amount: float
    reason: str
    related_visit_id: Optional[str] = None

class RefundDecision(BaseModel):
    action: str  # "approve" or "reject"
    admin_notes: Optional[str] = None

class PayWithCreditsRequest(BaseModel):
    amount: float
    description: str
    related_id: Optional[str] = None
    payment_type: str  # "visit_fee", "service_payment", etc.
