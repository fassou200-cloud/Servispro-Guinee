from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from dependencies import get_current_user, get_current_customer
from models import (
    VehicleSaleCreate, VehicleSaleUpdate, VehicleSaleInquiry, VehicleSaleStatus,
    VehicleListingCreate, VehicleListing, VehicleBookingCreate, VehicleBooking
)
from utils.storage import upload_to_cloudinary, delete_from_cloudinary
from utils.security import filter_contact_info

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/vehicle-sales")
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


@router.get("/vehicle-sales/my-sales")
async def get_my_vehicle_sales(current_user: dict = Depends(get_current_user)):
    """Get vehicle sales for the current seller"""
    sales = await db.vehicle_sales.find(
        {'seller_id': current_user.get('id')},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    return sales


@router.get("/vehicle-sales")
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


@router.get("/vehicle-sales/{sale_id}")
async def get_vehicle_sale(sale_id: str):
    """Get a specific vehicle sale"""
    sale = await db.vehicle_sales.find_one({'id': sale_id}, {'_id': 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return sale


@router.put("/vehicle-sales/{sale_id}")
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


@router.delete("/vehicle-sales/{sale_id}")
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

@router.post("/vehicle-sales/{sale_id}/inquiries")
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

@router.post("/vehicles", response_model=VehicleListing)
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


@router.get("/vehicles", response_model=List[VehicleListing])
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
    
    vehicles = await db.vehicle_listings.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return vehicles


@router.get("/vehicles/my-listings", response_model=List[VehicleListing])
async def get_my_vehicle_listings(current_user: dict = Depends(get_current_user)):
    """Get all vehicle listings for the current user"""
    vehicles = await db.vehicle_listings.find(
        {'owner_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return vehicles


@router.get("/vehicles/{vehicle_id}", response_model=VehicleListing)
async def get_vehicle_by_id(vehicle_id: str):
    """Get a specific vehicle listing by ID"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    return vehicle


@router.put("/vehicles/{vehicle_id}")
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


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle_listing(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.vehicle_listings.delete_one({'id': vehicle_id})
    return {"message": "Véhicule supprimé avec succès"}


@router.put("/vehicles/{vehicle_id}/availability")
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


@router.post("/vehicles/{vehicle_id}/upload-photo")
async def upload_vehicle_photo(vehicle_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a photo for a vehicle listing"""
    vehicle = await db.vehicle_listings.find_one({'id': vehicle_id}, {'_id': 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Upload to Cloudinary
    result = await upload_to_cloudinary(file, folder="servispro/vehicles")
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Upload failed: {result.get('error')}")
    
    # Update vehicle with new photo
    photo_url = result["url"]
    await db.vehicle_listings.update_one(
        {'id': vehicle_id},
        {'$push': {'photos': photo_url}}
    )
    
    return {"photo_url": photo_url, "message": "Photo uploadée avec succès"}


@router.delete("/vehicles/{vehicle_id}/photo")
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

@router.post("/vehicles/{vehicle_id}/book")
async def create_vehicle_booking(
    vehicle_id: str,
    booking_data: VehicleBookingCreate,
    current_customer: dict = Depends(get_current_customer),
):
    """Create a booking request for a vehicle (authenticated customer only)"""
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


@router.get("/vehicles/bookings/my-requests")
async def get_my_vehicle_booking_requests(current_user: dict = Depends(get_current_user)):
    """Get all booking requests for the vehicle owner"""
    bookings = await db.vehicle_bookings.find(
        {'owner_id': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return bookings


@router.put("/vehicles/bookings/{booking_id}/status")
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


