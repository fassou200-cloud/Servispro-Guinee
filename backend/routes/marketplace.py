from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import cloudinary
import cloudinary.uploader

from database import db
from dependencies import get_current_user, get_current_company, get_current_customer
from models import (
    ShopCreate, ShopUpdate, ProductCreate, ProductUpdate,
    ProductMessageCreate, ProductReviewCreate
)
from utils.cloudinary_helper import upload_to_cloudinary, delete_from_cloudinary
from utils.security import filter_contact_info

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/product-categories")
async def get_public_product_categories():
    categories = await db.product_categories.find({}, {'_id': 0}).to_list(None)
    return categories


@router.post("/shop/create")
async def create_shop(data: ShopCreate, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    existing = await db.shops.find_one({'owner_id': provider_id})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà une boutique")
    
    provider = await db.service_providers.find_one({'id': provider_id}, {'_id': 0, 'first_name': 1, 'last_name': 1})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    shop = {
        'id': str(uuid.uuid4()),
        'owner_id': provider_id,
        'owner_name': f"{provider['first_name']} {provider['last_name']}",
        'name': data.name,
        'description': data.description,
        'sector': data.sector,
        'contact_phone': data.contact_phone,
        'contact_email': data.contact_email,
        'location': data.location,
        'logo': None,
        'banner': None,
        'is_active': True,
        'total_products': 0,
        'total_views': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.shops.insert_one(shop)
    shop.pop('_id', None)
    return shop


@router.get("/shop/my-shop")
async def get_my_shop(current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0})
    if not shop:
        return None
    shop['total_products'] = await db.products.count_documents({'shop_id': shop['id'], 'is_deleted': {'$ne': True}})
    return shop


@router.put("/shop/update")
async def update_shop(data: ShopUpdate, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.shops.update_one({'owner_id': provider_id}, {'$set': update_data})
    updated = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0})
    return updated


@router.post("/shop/upload-logo")
async def upload_shop_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(contents, folder="servispro/shops/logos", public_id=shop['id'])
        logo_url = result['secure_url']
    except Exception as e:
        logger.error(f"Logo upload failed for shop {shop['id']}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload du logo: {str(e)}")
    
    await db.shops.update_one({'owner_id': provider_id}, {'$set': {'logo': logo_url}})
    return {"logo": logo_url}


@router.post("/shop/upload-banner")
async def upload_shop_banner(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(contents, folder="servispro/shops/banners", public_id=shop['id'])
        banner_url = result['secure_url']
    except Exception as e:
        logger.error(f"Banner upload failed for shop {shop['id']}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload du banner: {str(e)}")
    
    await db.shops.update_one({'owner_id': provider_id}, {'$set': {'banner': banner_url}})
    return {"banner": banner_url}


@router.post("/shop/products")
async def create_product(data: ProductCreate, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0, 'id': 1, 'name': 1})
    if not shop:
        raise HTTPException(status_code=404, detail="Créez d'abord votre boutique")
    
    product = {
        'id': str(uuid.uuid4()),
        'shop_id': shop['id'],
        'shop_name': shop['name'],
        'owner_id': provider_id,
        'name': data.name,
        'description': data.description,
        'price': data.price,
        'currency': data.currency or 'GNF',
        'price_on_request': data.price_on_request or False,
        'category_id': data.category_id,
        'product_type': data.product_type,
        'characteristics': data.characteristics or {},
        'is_negotiable': data.is_negotiable,
        'is_available': data.is_available,
        'photos': [],
        'total_views': 0,
        'total_inquiries': 0,
        'is_deleted': False,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    product.pop('_id', None)
    return product


@router.post("/shop/products/{product_id}/photos")
async def upload_product_photos(product_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': provider_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    photo_urls = list(product.get('photos', []))
    for file in files:
        try:
            contents = await file.read()
            result = cloudinary.uploader.upload(contents, folder=f"servispro/products/{product_id}")
            photo_urls.append(result['secure_url'])
        except Exception as e:
            logger.error(f"Photo upload failed for product {product_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload de la photo: {str(e)}")
    
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photo_urls}})
    return {"photos": photo_urls}


@router.delete("/shop/products/{product_id}/photos/{photo_index}")
async def delete_product_photo(product_id: str, photo_index: int, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': provider_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    photos = list(product.get('photos', []))
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Index de photo invalide")
    removed_url = photos.pop(photo_index)
    delete_from_cloudinary(removed_url)
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photos}})
    return {"photos": photos}


@router.get("/shop/products")
async def get_my_products(current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    products = await db.products.find(
        {'owner_id': provider_id, 'is_deleted': {'$ne': True}},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return products


@router.put("/shop/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': provider_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({'id': product_id}, {'$set': update_data})
    updated = await db.products.find_one({'id': product_id}, {'_id': 0})
    return updated


@router.delete("/shop/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    result = await db.products.update_one(
        {'id': product_id, 'owner_id': provider_id},
        {'$set': {'is_deleted': True, 'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}


@router.get("/shop/messages")
async def get_shop_messages(current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0, 'id': 1})
    if not shop:
        return []
    messages = await db.product_messages.find(
        {'shop_id': shop['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return messages


@router.put("/shop/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    await db.product_messages.update_one({'id': message_id}, {'$set': {'is_read': True}})
    return {"message": "Marqué comme lu"}


@router.get("/shop/reviews")
async def get_shop_reviews(current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0, 'id': 1})
    if not shop:
        return []
    reviews = await db.product_reviews.find({'shop_id': shop['id']}, {'_id': 0}).sort('created_at', -1).to_list(None)
    for review in reviews:
        product = await db.products.find_one({'id': review['product_id']}, {'_id': 0, 'name': 1})
        review['product_name'] = product['name'] if product else 'Produit supprimé'
    return reviews


@router.get("/shop/stats")
async def get_shop_stats(current_user: dict = Depends(get_current_user)):
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0, 'id': 1})
    if not shop:
        return {"total_products": 0, "total_views": 0, "total_messages": 0, "available_products": 0}
    
    shop_id = shop['id']
    total = await db.products.count_documents({'shop_id': shop_id, 'is_deleted': {'$ne': True}})
    available = await db.products.count_documents({'shop_id': shop_id, 'is_deleted': {'$ne': True}, 'is_available': True})
    total_messages = await db.product_messages.count_documents({'shop_id': shop_id})
    unread_messages = await db.product_messages.count_documents({'shop_id': shop_id, 'is_read': False})
    
    # Get product views sum
    pipeline = [
        {'$match': {'shop_id': shop_id, 'is_deleted': {'$ne': True}}},
        {'$group': {'_id': None, 'total_views': {'$sum': '$total_views'}, 'total_inquiries': {'$sum': '$total_inquiries'}}}
    ]
    agg = await db.products.aggregate(pipeline).to_list(1)
    views = agg[0]['total_views'] if agg else 0
    inquiries = agg[0]['total_inquiries'] if agg else 0
    
    # Top products by views
    top_products = await db.products.find(
        {'shop_id': shop_id, 'is_deleted': {'$ne': True}},
        {'_id': 0, 'id': 1, 'name': 1, 'total_views': 1, 'total_inquiries': 1, 'price': 1}
    ).sort('total_views', -1).to_list(5)
    
    return {
        "total_products": total,
        "available_products": available,
        "total_views": views,
        "total_inquiries": inquiries,
        "total_messages": total_messages,
        "unread_messages": unread_messages,
        "top_products": top_products
    }


@router.get("/marketplace/shops")
async def browse_shops(sector: Optional[str] = None, search: Optional[str] = None):
    # Get non-deleted, approved, NON-Immobilier company IDs
    company_filter = {
        'is_deleted': {'$ne': True},
        'verification_status': 'approved',
        'sector': {'$ne': 'Immobilier'}
    }
    valid_companies = await db.companies.find(company_filter, {'_id': 0}).to_list(None)
    valid_owner_ids = [c['id'] for c in valid_companies]
    
    # Get existing active shops from valid companies
    shop_query = {'is_active': True, 'owner_id': {'$in': valid_owner_ids}}
    if sector:
        shop_query['sector'] = sector
    if search:
        shop_query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]
    
    shops = await db.shops.find(shop_query, {'_id': 0}).sort('created_at', -1).to_list(None)
    
    # Only keep shops that have at least 1 product
    result = []
    for shop in shops:
        product_count = await db.products.count_documents({'shop_id': shop['id'], 'is_deleted': {'$ne': True}})
        if product_count > 0:
            shop['total_products'] = product_count
            result.append(shop)
    
    return result


@router.get("/marketplace/shops/{shop_id}")
async def get_shop_detail(shop_id: str):
    shop = await db.shops.find_one({'id': shop_id, 'is_active': True}, {'_id': 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    # Increment view count
    await db.shops.update_one({'id': shop_id}, {'$inc': {'total_views': 1}})
    
    products = await db.products.find(
        {'shop_id': shop_id, 'is_deleted': {'$ne': True}, 'is_available': True},
        {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    
    shop['products'] = products
    return shop


@router.get("/marketplace/products")
async def browse_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = "recent"
):
    query = {'is_deleted': {'$ne': True}, 'is_available': True}
    
    # Only show products from active shops
    active_shops = await db.shops.find({'is_active': True}, {'_id': 0, 'id': 1}).to_list(None)
    active_shop_ids = [s['id'] for s in active_shops]
    query['shop_id'] = {'$in': active_shop_ids}
    
    if category_id:
        query['category_id'] = category_id
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]
    if min_price is not None:
        query['price'] = {'$gte': min_price}
    if max_price is not None:
        query.setdefault('price', {})['$lte'] = max_price
    
    sort_field = ('created_at', -1)
    if sort_by == "price_asc":
        sort_field = ('price', 1)
    elif sort_by == "price_desc":
        sort_field = ('price', -1)
    elif sort_by == "popular":
        sort_field = ('total_views', -1)
    
    products = await db.products.find(query, {'_id': 0}).sort(*sort_field).to_list(None)
    return products


@router.get("/marketplace/products/{product_id}")
async def get_product_detail(product_id: str):
    product = await db.products.find_one({'id': product_id, 'is_deleted': {'$ne': True}}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Increment view count
    await db.products.update_one({'id': product_id}, {'$inc': {'total_views': 1}})
    
    # Get shop info
    shop = await db.shops.find_one({'id': product['shop_id']}, {'_id': 0, 'id': 1, 'name': 1, 'logo': 1, 'contact_phone': 1, 'location': 1, 'sector': 1})
    product['shop'] = shop
    
    return product


@router.post("/marketplace/products/{product_id}/message")
async def send_product_message(product_id: str, data: ProductMessageCreate, credentials: Optional[str] = None):
    product = await db.products.find_one({'id': product_id, 'is_deleted': {'$ne': True}}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    sender_name = (data.sender_name or '').strip()
    sender_phone = (data.sender_phone or '').strip()
    message_text = (data.message or '').strip()
    if not sender_name:
        raise HTTPException(status_code=400, detail="Le nom est obligatoire")
    if len(sender_phone) < 8:
        raise HTTPException(status_code=400, detail="Le numéro de téléphone est obligatoire (minimum 8 chiffres)")
    if not message_text:
        raise HTTPException(status_code=400, detail="Le message est obligatoire")

    message = {
        'id': str(uuid.uuid4()),
        'product_id': product_id,
        'product_name': product['name'],
        'product_photo': product.get('photos', [None])[0] if product.get('photos') else None,
        'product_price': product.get('price', 0),
        'product_currency': product.get('currency', 'GNF'),
        'shop_id': product['shop_id'],
        'shop_name': product.get('shop_name', ''),
        'owner_id': product.get('owner_id', ''),
        'sender_name': sender_name,
        'sender_phone': sender_phone,
        'message': message_text,
        'customer_id': None,
        'is_read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Try to link to a customer account by phone number
    sender_phone_clean = sender_phone.replace('+', '').replace(' ', '').replace('-', '')
    variants = [sender_phone_clean]
    if sender_phone_clean.startswith('224') and len(sender_phone_clean) > 9:
        variants.append(sender_phone_clean[3:])
        variants.append('+' + sender_phone_clean)
    else:
        variants.append('224' + sender_phone_clean)
        variants.append('+224' + sender_phone_clean)
    
    customer = await db.customers.find_one({'phone_number': {'$in': variants}}, {'_id': 0})
    if customer:
        message['customer_id'] = customer['id']
    
    await db.product_messages.insert_one(message)
    message.pop('_id', None)
    
    # Increment inquiry count
    await db.products.update_one({'id': product_id}, {'$inc': {'total_inquiries': 1}})
    
    return message



# ==================== CUSTOMER INQUIRY HISTORY ====================

@router.get("/customer/product-inquiries")
async def get_customer_product_inquiries(current_customer: dict = Depends(get_current_customer)):
    """Get all product inquiries made by the logged-in customer"""
    customer_id = current_customer['id']
    customer_phone = current_customer.get('phone_number', '')
    
    # Search by customer_id OR phone variants
    phone_clean = customer_phone.replace('+', '').replace(' ', '').replace('-', '')
    phone_variants = [customer_phone, phone_clean]
    if phone_clean.startswith('224') and len(phone_clean) > 9:
        phone_variants.extend([phone_clean[3:], '+' + phone_clean])
    else:
        phone_variants.extend(['224' + phone_clean, '+224' + phone_clean])
    
    inquiries = await db.product_messages.find(
        {'$or': [
            {'customer_id': customer_id},
            {'sender_phone': {'$in': phone_variants}}
        ]},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return inquiries


@router.get("/shop/inquiries")
async def get_shop_inquiries(current_user: dict = Depends(get_current_user)):
    """Get all product inquiries received by the shop (provider)"""
    provider_id = current_user['id']
    shop = await db.shops.find_one({'owner_id': provider_id}, {'_id': 0})
    if not shop:
        return []
    
    inquiries = await db.product_messages.find(
        {'shop_id': shop['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(200)
    
    return inquiries


@router.get("/company/shop/inquiries")
async def get_company_shop_inquiries(current_company: dict = Depends(get_current_company)):
    """Get all product inquiries received by the company shop"""
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0})
    if not shop:
        return []
    
    inquiries = await db.product_messages.find(
        {'shop_id': shop['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(200)
    
    return inquiries


async def _update_inquiry_status(inquiry_id: str, shop_id: str, status: str):
    """Helper: update an inquiry status. status in {'pending','processed','cancelled'}"""
    if status not in ('pending', 'processed', 'cancelled'):
        raise HTTPException(status_code=400, detail="Statut invalide")
    update_fields = {'status': status}
    if status == 'processed':
        update_fields['processed_at'] = datetime.now(timezone.utc).isoformat()
        update_fields['is_read'] = True
    result = await db.product_messages.update_one(
        {'id': inquiry_id, 'shop_id': shop_id},
        {'$set': update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    return {'message': 'Statut mis à jour', 'status': status}


@router.put("/shop/inquiries/{inquiry_id}/status")
async def update_shop_inquiry_status(
    inquiry_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Provider: mark inquiry as processed (counts as sale) or cancelled"""
    shop = await db.shops.find_one({'owner_id': current_user['id']}, {'_id': 0, 'id': 1})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    return await _update_inquiry_status(inquiry_id, shop['id'], body.get('status', ''))


@router.put("/company/shop/inquiries/{inquiry_id}/status")
async def update_company_shop_inquiry_status(
    inquiry_id: str,
    body: dict = Body(...),
    current_company: dict = Depends(get_current_company),
):
    """Company: mark inquiry as processed (counts as sale) or cancelled"""
    shop = await db.shops.find_one({'owner_id': current_company['id']}, {'_id': 0, 'id': 1})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    return await _update_inquiry_status(inquiry_id, shop['id'], body.get('status', ''))


@router.post("/company/shop/create")
async def company_create_shop(data: ShopCreate, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    existing = await db.shops.find_one({'owner_id': company_id})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà une boutique")
    
    shop = {
        'id': str(uuid.uuid4()),
        'owner_id': company_id,
        'owner_name': current_company.get('name', ''),
        'owner_type': 'company',
        'name': data.name,
        'description': data.description,
        'sector': data.sector,
        'contact_phone': data.contact_phone,
        'contact_email': data.contact_email,
        'location': data.location,
        'logo': None,
        'banner': None,
        'is_active': True,
        'total_products': 0,
        'total_views': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.shops.insert_one(shop)
    shop.pop('_id', None)
    return shop


@router.get("/company/shop/my-shop")
async def company_get_my_shop(current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0})
    if not shop:
        return None
    shop['total_products'] = await db.products.count_documents({'shop_id': shop['id'], 'is_deleted': {'$ne': True}})
    return shop


@router.put("/company/shop/update")
async def company_update_shop(data: ShopUpdate, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.shops.update_one({'owner_id': company_id}, {'$set': update_data})
    updated = await db.shops.find_one({'owner_id': company_id}, {'_id': 0})
    return updated


@router.post("/company/shop/upload-logo")
async def company_upload_shop_logo(file: UploadFile = File(...), current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(contents, folder="servispro/shops/logos", public_id=shop['id'])
    except Exception as e:
        logger.error(f"Company logo upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload du logo: {str(e)}")
    await db.shops.update_one({'owner_id': company_id}, {'$set': {'logo': result['secure_url']}})
    return {"logo": result['secure_url']}


@router.post("/company/shop/products")
async def company_create_product(data: ProductCreate, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0, 'id': 1, 'name': 1})
    if not shop:
        raise HTTPException(status_code=404, detail="Créez d'abord votre boutique")
    product = {
        'id': str(uuid.uuid4()),
        'shop_id': shop['id'],
        'shop_name': shop['name'],
        'owner_id': company_id,
        'name': data.name,
        'description': data.description,
        'price': data.price,
        'currency': data.currency or 'GNF',
        'price_on_request': data.price_on_request or False,
        'category_id': data.category_id,
        'product_type': data.product_type,
        'characteristics': data.characteristics or {},
        'is_negotiable': data.is_negotiable,
        'is_available': data.is_available,
        'photos': [],
        'total_views': 0,
        'total_inquiries': 0,
        'is_deleted': False,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    product.pop('_id', None)
    return product


@router.post("/company/shop/products/{product_id}/photos")
async def company_upload_product_photos(product_id: str, files: List[UploadFile] = File(...), current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': company_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    photo_urls = list(product.get('photos', []))
    for file in files:
        try:
            contents = await file.read()
            result = cloudinary.uploader.upload(contents, folder=f"servispro/products/{product_id}")
            photo_urls.append(result['secure_url'])
        except Exception as e:
            logger.error(f"Company photo upload failed for product {product_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload de la photo: {str(e)}")
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photo_urls}})
    return {"photos": photo_urls}


@router.delete("/company/shop/products/{product_id}/photos/{photo_index}")
async def company_delete_product_photo(product_id: str, photo_index: int, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': company_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    photos = list(product.get('photos', []))
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Index de photo invalide")
    removed_url = photos.pop(photo_index)
    delete_from_cloudinary(removed_url)
    await db.products.update_one({'id': product_id}, {'$set': {'photos': photos}})
    return {"photos": photos}


@router.get("/company/shop/products")
async def company_get_my_products(current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    products = await db.products.find(
        {'owner_id': company_id, 'is_deleted': {'$ne': True}}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return products


@router.put("/company/shop/products/{product_id}")
async def company_update_product(product_id: str, data: ProductUpdate, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    product = await db.products.find_one({'id': product_id, 'owner_id': company_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({'id': product_id}, {'$set': update_data})
    updated = await db.products.find_one({'id': product_id}, {'_id': 0})
    return updated


@router.delete("/company/shop/products/{product_id}")
async def company_delete_product(product_id: str, current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    result = await db.products.update_one(
        {'id': product_id, 'owner_id': company_id},
        {'$set': {'is_deleted': True, 'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}


@router.get("/company/shop/messages")
async def company_get_shop_messages(current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0, 'id': 1})
    if not shop:
        return []
    messages = await db.product_messages.find({'shop_id': shop['id']}, {'_id': 0}).sort('created_at', -1).to_list(None)
    return messages


@router.get("/company/shop/stats")
async def company_get_shop_stats(current_company: dict = Depends(get_current_company)):
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0, 'id': 1})
    if not shop:
        return {"total_products": 0, "total_views": 0, "total_messages": 0, "available_products": 0}
    shop_id = shop['id']
    total = await db.products.count_documents({'shop_id': shop_id, 'is_deleted': {'$ne': True}})
    available = await db.products.count_documents({'shop_id': shop_id, 'is_deleted': {'$ne': True}, 'is_available': True})
    total_messages = await db.product_messages.count_documents({'shop_id': shop_id})
    unread_messages = await db.product_messages.count_documents({'shop_id': shop_id, 'is_read': False})
    pipeline = [
        {'$match': {'shop_id': shop_id, 'is_deleted': {'$ne': True}}},
        {'$group': {'_id': None, 'total_views': {'$sum': '$total_views'}, 'total_inquiries': {'$sum': '$total_inquiries'}}}
    ]
    agg = await db.products.aggregate(pipeline).to_list(1)
    views = agg[0]['total_views'] if agg else 0
    inquiries = agg[0]['total_inquiries'] if agg else 0
    return {
        "total_products": total,
        "available_products": available,
        "total_views": views,
        "total_inquiries": inquiries,
        "total_messages": total_messages,
        "unread_messages": unread_messages
    }

# Include router AFTER all route definitions


@router.post("/marketplace/products/{product_id}/reviews")
async def create_product_review(product_id: str, data: ProductReviewCreate, current_customer: dict = Depends(get_current_customer)):
    """Create a review for a product (requires customer auth)"""
    product = await db.products.find_one({'id': product_id, 'is_deleted': {'$ne': True}}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if customer already reviewed this product
    existing = await db.product_reviews.find_one({
        'product_id': product_id, 
        'customer_id': current_customer['id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà laissé un avis sur ce produit")
    
    review = {
        'id': str(uuid.uuid4()),
        'product_id': product_id,
        'shop_id': product['shop_id'],
        'customer_id': current_customer['id'],
        'customer_name': f"{current_customer.get('first_name', '')} {current_customer.get('last_name', '')}".strip() or current_customer.get('full_name', 'Client'),
        'rating': data.rating,
        'comment': data.comment,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.product_reviews.insert_one(review)
    review.pop('_id', None)
    
    # Update product average rating
    pipeline = [
        {'$match': {'product_id': product_id}},
        {'$group': {'_id': None, 'avg_rating': {'$avg': '$rating'}, 'count': {'$sum': 1}}}
    ]
    agg = await db.product_reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.products.update_one({'id': product_id}, {'$set': {
            'avg_rating': round(agg[0]['avg_rating'], 1),
            'review_count': agg[0]['count']
        }})
    
    return review


@router.get("/marketplace/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
    """Get all reviews for a product (public)"""
    reviews = await db.product_reviews.find(
        {'product_id': product_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    return reviews


@router.get("/company/shop/reviews")
async def company_get_shop_reviews(current_company: dict = Depends(get_current_company)):
    """Get all reviews for the company's shop products"""
    company_id = current_company['id']
    shop = await db.shops.find_one({'owner_id': company_id}, {'_id': 0, 'id': 1})
    if not shop:
        return []
    reviews = await db.product_reviews.find(
        {'shop_id': shop['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(None)
    # Attach product name to each review
    for review in reviews:
        product = await db.products.find_one({'id': review['product_id']}, {'_id': 0, 'name': 1})
        review['product_name'] = product['name'] if product else 'Produit supprimé'
    return reviews




# ==================== PUBLIC LIMITED OFFERS ====================

@router.get("/marketplace/limited-offers")
async def get_public_limited_offers():
    """Get active limited offers with product details for the storefront"""
    # Check if offers are active
    settings = await db.admin_settings.find_one({'type': 'limited_offers_settings'}, {'_id': 0})
    if not settings or not settings.get('is_active'):
        return {'offers': [], 'expiration_date': None, 'is_active': False}
    
    exp_date = settings.get('expiration_date')
    if exp_date:
        try:
            exp_dt = datetime.fromisoformat(exp_date.replace('Z', '+00:00'))
            if exp_dt < datetime.now(timezone.utc):
                return {'offers': [], 'expiration_date': exp_date, 'is_active': False}
        except Exception:
            pass
    
    offers = await db.limited_offers.find({}, {'_id': 0}).sort('created_at', -1).to_list(50)
    
    enriched = []
    for offer in offers:
        product = await db.products.find_one({'id': offer['product_id']}, {'_id': 0})
        if product:
            offer['product'] = product
            enriched.append(offer)
    
    return {
        'offers': enriched,
        'expiration_date': exp_date,
        'is_active': True
    }


# ==================== MAKITI SEARCH TRACKING ====================

@router.post("/makiti/search-log")
async def log_makiti_search(body: dict = Body(...)):
    """Log a user search query on Makiti (public, no auth required).
    Body: { query: str, results_count?: int, customer_id?: str }
    Stored only for non-trivial queries (>= 2 chars)."""
    query = (body.get('query') or '').strip()
    if len(query) < 2:
        return {'logged': False}

    doc = {
        'id': str(uuid.uuid4()),
        'query': query[:200],  # cap length
        'results_count': int(body.get('results_count') or 0),
        'customer_id': body.get('customer_id'),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.makiti_searches.insert_one(doc)
    doc.pop('_id', None)
    return {'logged': True, 'id': doc['id']}


@router.get("/admin/makiti/searches")
async def admin_list_makiti_searches(limit: int = 200):
    """Admin: list recent search queries with frequency aggregation."""
    recent = await db.makiti_searches.find({}, {'_id': 0}).sort('created_at', -1).to_list(limit)

    # Aggregate top queries
    freq = {}
    for r in recent:
        q = (r.get('query') or '').lower()
        freq[q] = freq.get(q, 0) + 1
    top = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:20]

    return {
        'recent': recent,
        'top_queries': [{'query': q, 'count': c} for q, c in top],
        'total': await db.makiti_searches.count_documents({}),
    }


@router.delete("/admin/makiti/searches/{search_id}")
async def admin_delete_makiti_search(search_id: str):
    """Admin: delete a search log entry."""
    result = await db.makiti_searches.delete_one({'id': search_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recherche introuvable")
    return {'deleted': True}


# ==================== MAKITI PRODUCT SUGGESTIONS ====================

@router.post("/makiti/product-suggestion")
async def submit_product_suggestion(body: dict = Body(...)):
    """Public: user suggests a product they want us to add or find for them.
    Body: { suggestion: str, contact_name: str, contact_phone: str, customer_id?: str }
    All fields except customer_id are now required."""
    suggestion = (body.get('suggestion') or '').strip()
    contact_name = (body.get('contact_name') or '').strip()
    contact_phone = (body.get('contact_phone') or '').strip()

    if len(suggestion) < 3:
        raise HTTPException(status_code=400, detail="Veuillez décrire le produit recherché")
    if not contact_name:
        raise HTTPException(status_code=400, detail="Le nom est obligatoire")
    if len(contact_phone) < 8:
        raise HTTPException(status_code=400, detail="Numéro de téléphone invalide")

    doc = {
        'id': str(uuid.uuid4()),
        'suggestion': suggestion[:1000],
        'contact_name': contact_name[:100],
        'contact_phone': contact_phone[:30],
        'customer_id': body.get('customer_id'),
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.product_suggestions.insert_one(doc)
    doc.pop('_id', None)
    return {'success': True, 'id': doc['id']}


@router.get("/admin/makiti/product-suggestions")
async def admin_list_product_suggestions(status: Optional[str] = None):
    """Admin: list product suggestions, optionally filtered by status."""
    query = {}
    if status:
        query['status'] = status
    suggestions = await db.product_suggestions.find(query, {'_id': 0}).sort('created_at', -1).to_list(200)
    return {
        'suggestions': suggestions,
        'total': await db.product_suggestions.count_documents({}),
        'pending': await db.product_suggestions.count_documents({'status': 'pending'}),
    }


@router.put("/admin/makiti/product-suggestions/{suggestion_id}/status")
async def admin_update_suggestion_status(suggestion_id: str, body: dict = Body(...)):
    """Admin: update suggestion status (pending|reviewed|added|rejected)."""
    status = body.get('status', '')
    if status not in ('pending', 'reviewed', 'added', 'rejected'):
        raise HTTPException(status_code=400, detail="Statut invalide")
    result = await db.product_suggestions.update_one(
        {'id': suggestion_id},
        {'$set': {'status': status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    return {'updated': True, 'status': status}


@router.delete("/admin/makiti/product-suggestions/{suggestion_id}")
async def admin_delete_product_suggestion(suggestion_id: str):
    """Admin: delete a product suggestion."""
    result = await db.product_suggestions.delete_one({'id': suggestion_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    return {'deleted': True}
