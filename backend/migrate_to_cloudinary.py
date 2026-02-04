#!/usr/bin/env python3
"""
Migration script to transfer all local files to Cloudinary
and update database references.
"""

import os
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

# Load environment
load_dotenv(Path(__file__).parent / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

UPLOAD_DIR = Path("/app/backend/uploads")

def upload_file_to_cloudinary(file_path: Path, folder: str) -> dict:
    """Upload a single file to Cloudinary"""
    try:
        file_ext = file_path.suffix.lower()
        
        # Determine resource type
        if file_ext in ['.pdf', '.doc', '.docx']:
            resource_type = "raw"
        else:
            resource_type = "image"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            str(file_path),
            folder=folder,
            resource_type=resource_type,
            overwrite=True
        )
        
        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def migrate_provider_files():
    """Migrate provider profile pictures and documents"""
    print("\n=== Migrating Provider Files ===")
    
    providers = await db.service_providers.find({}).to_list(1000)
    migrated = 0
    failed = 0
    
    for provider in providers:
        updates = {}
        
        # Migrate profile picture
        if provider.get('profile_picture') and provider['profile_picture'].startswith('/api/uploads/'):
            filename = provider['profile_picture'].replace('/api/uploads/', '')
            file_path = UPLOAD_DIR / filename
            
            if file_path.exists():
                print(f"  Migrating profile picture for {provider.get('first_name', 'Unknown')}...")
                result = upload_file_to_cloudinary(file_path, "servispro/profiles")
                
                if result["success"]:
                    updates['profile_picture'] = result["url"]
                    print(f"    ✓ Uploaded: {result['url'][:60]}...")
                    migrated += 1
                else:
                    print(f"    ✗ Failed: {result['error']}")
                    failed += 1
        
        # Migrate ID verification picture
        if provider.get('id_verification_picture') and provider['id_verification_picture'].startswith('/api/uploads/'):
            filename = provider['id_verification_picture'].replace('/api/uploads/', '')
            file_path = UPLOAD_DIR / filename
            
            if file_path.exists():
                print(f"  Migrating ID verification for {provider.get('first_name', 'Unknown')}...")
                result = upload_file_to_cloudinary(file_path, "servispro/id_verification")
                
                if result["success"]:
                    updates['id_verification_picture'] = result["url"]
                    print(f"    ✓ Uploaded")
                    migrated += 1
                else:
                    print(f"    ✗ Failed: {result['error']}")
                    failed += 1
        
        # Migrate documents
        if provider.get('documents'):
            new_docs = []
            for doc in provider['documents']:
                doc_path = doc.get('path', '')
                if doc_path.startswith('/api/uploads/'):
                    filename = doc_path.replace('/api/uploads/', '')
                    file_path = UPLOAD_DIR / filename
                    
                    if file_path.exists():
                        print(f"  Migrating document: {doc.get('filename', 'unknown')}...")
                        result = upload_file_to_cloudinary(file_path, "servispro/documents")
                        
                        if result["success"]:
                            new_docs.append({
                                **doc,
                                'path': result["url"]
                            })
                            print(f"    ✓ Uploaded")
                            migrated += 1
                        else:
                            new_docs.append(doc)  # Keep original on failure
                            print(f"    ✗ Failed: {result['error']}")
                            failed += 1
                    else:
                        new_docs.append(doc)
                else:
                    new_docs.append(doc)  # Already migrated or external URL
            
            if new_docs:
                updates['documents'] = new_docs
        
        # Update provider in database
        if updates:
            await db.service_providers.update_one(
                {'id': provider['id']},
                {'$set': updates}
            )
    
    print(f"\nProvider migration complete: {migrated} migrated, {failed} failed")
    return migrated, failed

async def migrate_company_files():
    """Migrate company logos and documents"""
    print("\n=== Migrating Company Files ===")
    
    companies = await db.companies.find({}).to_list(1000)
    migrated = 0
    failed = 0
    
    for company in companies:
        updates = {}
        
        # Migrate logo
        if company.get('logo') and company['logo'].startswith('/api/uploads/'):
            filename = company['logo'].replace('/api/uploads/', '')
            file_path = UPLOAD_DIR / filename
            
            if file_path.exists():
                print(f"  Migrating logo for {company.get('company_name', 'Unknown')}...")
                result = upload_file_to_cloudinary(file_path, "servispro/company_logos")
                
                if result["success"]:
                    updates['logo'] = result["url"]
                    print(f"    ✓ Uploaded")
                    migrated += 1
                else:
                    print(f"    ✗ Failed: {result['error']}")
                    failed += 1
        
        # Migrate documents (licence, rccm, nif, attestation_fiscale)
        doc_fields = ['licence_exploitation', 'rccm_document', 'nif_document', 'attestation_fiscale']
        for field in doc_fields:
            if company.get(field) and company[field].startswith('/api/uploads/'):
                filename = company[field].replace('/api/uploads/', '')
                file_path = UPLOAD_DIR / filename
                
                if file_path.exists():
                    print(f"  Migrating {field} for {company.get('company_name', 'Unknown')}...")
                    result = upload_file_to_cloudinary(file_path, "servispro/company_documents")
                    
                    if result["success"]:
                        updates[field] = result["url"]
                        print(f"    ✓ Uploaded")
                        migrated += 1
                    else:
                        print(f"    ✗ Failed: {result['error']}")
                        failed += 1
        
        # Migrate additional documents
        if company.get('documents_additionnels'):
            new_docs = []
            for doc_url in company['documents_additionnels']:
                if doc_url.startswith('/api/uploads/'):
                    filename = doc_url.replace('/api/uploads/', '')
                    file_path = UPLOAD_DIR / filename
                    
                    if file_path.exists():
                        print(f"  Migrating additional document...")
                        result = upload_file_to_cloudinary(file_path, "servispro/company_documents")
                        
                        if result["success"]:
                            new_docs.append(result["url"])
                            print(f"    ✓ Uploaded")
                            migrated += 1
                        else:
                            new_docs.append(doc_url)
                            print(f"    ✗ Failed: {result['error']}")
                            failed += 1
                    else:
                        new_docs.append(doc_url)
                else:
                    new_docs.append(doc_url)
            
            if new_docs:
                updates['documents_additionnels'] = new_docs
        
        # Update company in database
        if updates:
            await db.companies.update_one(
                {'id': company['id']},
                {'$set': updates}
            )
    
    print(f"\nCompany migration complete: {migrated} migrated, {failed} failed")
    return migrated, failed

async def migrate_rental_files():
    """Migrate rental listing photos and documents"""
    print("\n=== Migrating Rental Files ===")
    
    rentals = await db.rental_listings.find({}).to_list(1000)
    migrated = 0
    failed = 0
    
    for rental in rentals:
        updates = {}
        
        # Migrate photos
        if rental.get('photos'):
            new_photos = []
            for photo_url in rental['photos']:
                if photo_url.startswith('/api/uploads/'):
                    filename = photo_url.replace('/api/uploads/', '')
                    file_path = UPLOAD_DIR / filename
                    
                    if file_path.exists():
                        print(f"  Migrating rental photo for {rental.get('title', 'Unknown')[:30]}...")
                        result = upload_file_to_cloudinary(file_path, "servispro/rentals")
                        
                        if result["success"]:
                            new_photos.append(result["url"])
                            migrated += 1
                        else:
                            new_photos.append(photo_url)
                            failed += 1
                    else:
                        new_photos.append(photo_url)
                else:
                    new_photos.append(photo_url)
            
            if new_photos:
                updates['photos'] = new_photos
        
        # Migrate documents
        doc_fields = ['titre_foncier', 'registration_ministere', 'seller_id_document', 'document_ministere_habitat', 'document_batiment']
        for field in doc_fields:
            if rental.get(field) and rental[field].startswith('/api/uploads/'):
                filename = rental[field].replace('/api/uploads/', '')
                file_path = UPLOAD_DIR / filename
                
                if file_path.exists():
                    result = upload_file_to_cloudinary(file_path, "servispro/rental_documents")
                    if result["success"]:
                        updates[field] = result["url"]
                        migrated += 1
                    else:
                        failed += 1
        
        if updates:
            await db.rental_listings.update_one(
                {'id': rental['id']},
                {'$set': updates}
            )
    
    print(f"\nRental migration complete: {migrated} migrated, {failed} failed")
    return migrated, failed

async def migrate_property_sale_files():
    """Migrate property sale photos and documents"""
    print("\n=== Migrating Property Sale Files ===")
    
    sales = await db.property_sales.find({}).to_list(1000)
    migrated = 0
    failed = 0
    
    for sale in sales:
        updates = {}
        
        # Migrate photos
        if sale.get('photos'):
            new_photos = []
            for photo_url in sale['photos']:
                if photo_url.startswith('/api/uploads/'):
                    filename = photo_url.replace('/api/uploads/', '')
                    file_path = UPLOAD_DIR / filename
                    
                    if file_path.exists():
                        print(f"  Migrating sale photo for {sale.get('title', 'Unknown')[:30]}...")
                        result = upload_file_to_cloudinary(file_path, "servispro/property_sales")
                        
                        if result["success"]:
                            new_photos.append(result["url"])
                            migrated += 1
                        else:
                            new_photos.append(photo_url)
                            failed += 1
                    else:
                        new_photos.append(photo_url)
                else:
                    new_photos.append(photo_url)
            
            if new_photos:
                updates['photos'] = new_photos
        
        if updates:
            await db.property_sales.update_one(
                {'id': sale['id']},
                {'$set': updates}
            )
    
    print(f"\nProperty sale migration complete: {migrated} migrated, {failed} failed")
    return migrated, failed

async def migrate_vehicle_files():
    """Migrate vehicle photos"""
    print("\n=== Migrating Vehicle Files ===")
    
    vehicles = await db.vehicle_listings.find({}).to_list(1000)
    migrated = 0
    failed = 0
    
    for vehicle in vehicles:
        updates = {}
        
        if vehicle.get('photos'):
            new_photos = []
            for photo_url in vehicle['photos']:
                if photo_url.startswith('/api/uploads/'):
                    filename = photo_url.replace('/api/uploads/', '')
                    file_path = UPLOAD_DIR / filename
                    
                    if file_path.exists():
                        print(f"  Migrating vehicle photo...")
                        result = upload_file_to_cloudinary(file_path, "servispro/vehicles")
                        
                        if result["success"]:
                            new_photos.append(result["url"])
                            migrated += 1
                        else:
                            new_photos.append(photo_url)
                            failed += 1
                    else:
                        new_photos.append(photo_url)
                else:
                    new_photos.append(photo_url)
            
            if new_photos:
                updates['photos'] = new_photos
        
        if updates:
            await db.vehicle_listings.update_one(
                {'id': vehicle['id']},
                {'$set': updates}
            )
    
    print(f"\nVehicle migration complete: {migrated} migrated, {failed} failed")
    return migrated, failed

async def main():
    print("=" * 60)
    print("CLOUDINARY MIGRATION SCRIPT")
    print("=" * 60)
    print(f"\nLocal upload directory: {UPLOAD_DIR}")
    print(f"Files to migrate: {len(list(UPLOAD_DIR.glob('*')))}")
    
    total_migrated = 0
    total_failed = 0
    
    # Run all migrations
    m, f = await migrate_provider_files()
    total_migrated += m
    total_failed += f
    
    m, f = await migrate_company_files()
    total_migrated += m
    total_failed += f
    
    m, f = await migrate_rental_files()
    total_migrated += m
    total_failed += f
    
    m, f = await migrate_property_sale_files()
    total_migrated += m
    total_failed += f
    
    m, f = await migrate_vehicle_files()
    total_migrated += m
    total_failed += f
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    print(f"Total files migrated: {total_migrated}")
    print(f"Total failures: {total_failed}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
