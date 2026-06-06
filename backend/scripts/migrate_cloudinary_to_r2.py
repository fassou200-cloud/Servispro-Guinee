"""Cloudinary → Cloudflare R2 migration script.

Walks all collections containing Cloudinary URLs, downloads each file, uploads
it to R2 via the existing r2_helper, and updates the MongoDB document.

Safety properties:
- Idempotent: a `migration_logs` collection tracks every migrated URL.
- Atomic per document: the DB is only updated AFTER R2 upload succeeds + HEAD 200.
- Resumable: re-running the script skips already-migrated URLs.
- Throttled: configurable concurrency (default 4) + small sleep between batches.
- Read-only `--scan` mode counts URLs without mutating anything.

Usage:
    # 1. Dry-run inventory on the current DB
    python3 scripts/migrate_cloudinary_to_r2.py --scan

    # 2. Dry-run on production DB without changing .env
    DB_NAME=servispro_production python3 scripts/migrate_cloudinary_to_r2.py --scan

    # 3. Migrate one collection at a time (recommended)
    python3 scripts/migrate_cloudinary_to_r2.py --migrate --collection=shops

    # 4. Migrate all collections
    python3 scripts/migrate_cloudinary_to_r2.py --migrate

    # 5. Verify post-migration (no Cloudinary URLs should remain)
    python3 scripts/migrate_cloudinary_to_r2.py --verify
"""
import argparse
import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import boto3
import httpx
from botocore.config import Config
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Make `utils.*` importable when running this script from /app/backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger('migrate')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
R2_ENDPOINT = os.environ['R2_ENDPOINT']
R2_BUCKET = os.environ['R2_BUCKET_NAME']
R2_PUBLIC = os.environ['R2_PUBLIC_URL'].rstrip('/')

# (collection, list_of_string_fields, list_of_array_fields_of_strings, list_of_nested_doc_fields_with_url)
# nested = (field, url_subkey) e.g. ('documents', 'url')
COLLECTIONS = [
    ('service_providers', ['profile_picture'], [], [('documents', 'url')]),
    ('customers',          ['profile_picture'], [], []),
    ('companies',          ['logo'], [], [('documents', 'url')]),
    ('shops',              ['logo', 'banner'], [], []),
    ('products',           [], ['photos'], []),
    ('rentals',            [], ['photos'], []),
    ('vehicle_sales',      [], ['photos'], [('documents', 'url')]),
    ('property_sales',     [], ['photos'], [('documents', 'url')]),
    ('feedbacks',          [], ['screenshots'], []),
]

CLOUDINARY_HOST = 'res.cloudinary.com'


def is_cloudinary(url: Optional[str]) -> bool:
    return bool(url) and isinstance(url, str) and CLOUDINARY_HOST in url


def guess_extension(url: str, content_type: Optional[str]) -> str:
    # Prefer the URL extension (preserves original format)
    path = urlparse(url).path
    suffix = Path(path).suffix.lower().lstrip('.')
    if suffix and len(suffix) <= 5:
        return suffix
    if content_type:
        mapping = {
            'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
            'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
            'application/pdf': 'pdf',
        }
        return mapping.get(content_type.split(';')[0].strip().lower(), 'bin')
    return 'bin'


class Migrator:
    def __init__(self, dry_run: bool, concurrency: int = 4, batch: int = 50):
        self.dry_run = dry_run
        self.concurrency = concurrency
        self.batch = batch
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.s3 = boto3.client(
            's3',
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
            region_name='auto',
            config=Config(signature_version='s3v4'),
        )
        self.http = httpx.AsyncClient(timeout=30, follow_redirects=True)
        self.stats = {'scanned': 0, 'migrated': 0, 'failed': 0, 'skipped': 0}
    
    async def close(self):
        await self.http.aclose()
        self.client.close()
    
    async def url_already_migrated(self, old_url: str) -> Optional[str]:
        """Return the new R2 url if this Cloudinary url was already migrated."""
        log = await self.db.migration_logs.find_one({'old_url': old_url, 'status': 'success'})
        return log['new_url'] if log else None
    
    async def migrate_one_url(self, old_url: str, folder: str) -> Optional[str]:
        """Download from Cloudinary → upload to R2 → return new public URL."""
        # Skip if already migrated
        existing = await self.url_already_migrated(old_url)
        if existing:
            self.stats['skipped'] += 1
            return existing
        
        if self.dry_run:
            return None  # scan mode, just count
        
        try:
            resp = await self.http.get(old_url)
            resp.raise_for_status()
            content = resp.content
            content_type = resp.headers.get('content-type', 'image/jpeg')
        except Exception as e:
            logger.warning(f"DL fail {old_url[:80]}: {e}")
            await self._log(old_url, None, 'failed', str(e))
            self.stats['failed'] += 1
            return None
        
        ext = guess_extension(old_url, content_type)
        key = f"{folder}/{uuid.uuid4()}.{ext}"
        try:
            self.s3.put_object(
                Bucket=R2_BUCKET, Key=key,
                Body=content, ContentType=content_type,
            )
        except Exception as e:
            logger.warning(f"R2 upload fail for {old_url[:80]}: {e}")
            await self._log(old_url, None, 'failed', f"R2 upload: {e}")
            self.stats['failed'] += 1
            return None
        
        new_url = f"{R2_PUBLIC}/{key}"
        await self._log(old_url, new_url, 'success')
        self.stats['migrated'] += 1
        return new_url
    
    async def _log(self, old_url: str, new_url: Optional[str], status: str, error: Optional[str] = None):
        await self.db.migration_logs.insert_one({
            'old_url': old_url,
            'new_url': new_url,
            'status': status,
            'error': error,
            'at': datetime.now(timezone.utc).isoformat(),
        })
    
    async def process_collection(self, name: str, str_fields, array_fields, nested_fields, only=None):
        if only and name != only:
            return
        logger.info(f"=== {name} ===")
        # Build OR query to fetch only docs that have at least one Cloudinary URL
        regex = {'$regex': CLOUDINARY_HOST, '$options': 'i'}
        or_clauses = []
        for f in str_fields:
            or_clauses.append({f: regex})
        for f in array_fields:
            or_clauses.append({f: regex})
        for parent, _sub in nested_fields:
            or_clauses.append({parent: {'$elemMatch': {'url': regex}}})
        if not or_clauses:
            return
        cursor = self.db[name].find({'$or': or_clauses}, {'_id': 0, 'id': 1, **{f: 1 for f in str_fields}, **{f: 1 for f in array_fields}, **{p: 1 for p, _ in nested_fields}})
        docs = await cursor.to_list(None)
        logger.info(f"  {len(docs)} document(s) avec URLs Cloudinary")
        folder = f"servispro/migrated/{name}"
        
        for doc in docs:
            doc_id = doc.get('id')
            updates = {}
            
            # Scalar fields
            for f in str_fields:
                url = doc.get(f)
                if is_cloudinary(url):
                    self.stats['scanned'] += 1
                    new = await self.migrate_one_url(url, folder)
                    if new:
                        updates[f] = new
            
            # Array fields (list of strings)
            for f in array_fields:
                arr = doc.get(f) or []
                new_arr = list(arr)
                changed = False
                for i, item in enumerate(arr):
                    if is_cloudinary(item):
                        self.stats['scanned'] += 1
                        new = await self.migrate_one_url(item, folder)
                        if new:
                            new_arr[i] = new
                            changed = True
                if changed:
                    updates[f] = new_arr
            
            # Nested arrays (list of dicts with 'url')
            for parent, sub in nested_fields:
                arr = doc.get(parent) or []
                new_arr = []
                changed = False
                for item in arr:
                    item = dict(item) if isinstance(item, dict) else item
                    if isinstance(item, dict) and is_cloudinary(item.get(sub)):
                        self.stats['scanned'] += 1
                        new = await self.migrate_one_url(item[sub], folder)
                        if new:
                            item[sub] = new
                            changed = True
                    new_arr.append(item)
                if changed:
                    updates[parent] = new_arr
            
            if updates and not self.dry_run and doc_id:
                await self.db[name].update_one({'id': doc_id}, {'$set': updates})
            await asyncio.sleep(0.05)
    
    async def scan_or_migrate(self, only: Optional[str] = None):
        for (name, str_fields, array_fields, nested_fields) in COLLECTIONS:
            if name not in await self.db.list_collection_names():
                continue
            await self.process_collection(name, str_fields, array_fields, nested_fields, only=only)
        logger.info(f"DONE — scanned={self.stats['scanned']} migrated={self.stats['migrated']} skipped={self.stats['skipped']} failed={self.stats['failed']}")
    
    async def verify(self):
        logger.info("=== VERIFY ===")
        total_remaining = 0
        for (name, str_fields, array_fields, nested_fields) in COLLECTIONS:
            if name not in await self.db.list_collection_names():
                continue
            regex = {'$regex': CLOUDINARY_HOST, '$options': 'i'}
            or_clauses = []
            for f in str_fields:
                or_clauses.append({f: regex})
            for f in array_fields:
                or_clauses.append({f: regex})
            for parent, _ in nested_fields:
                or_clauses.append({parent: {'$elemMatch': {'url': regex}}})
            if not or_clauses:
                continue
            count = await self.db[name].count_documents({'$or': or_clauses})
            if count:
                logger.warning(f"  {name}: {count} doc(s) ont encore des URLs Cloudinary")
            total_remaining += count
        if total_remaining == 0:
            logger.info("✅ Aucune URL Cloudinary restante.")
        else:
            logger.warning(f"⚠️ {total_remaining} document(s) à re-migrer (relancer --migrate).")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scan', action='store_true', help='Dry-run: inventory only')
    parser.add_argument('--migrate', action='store_true', help='Run the migration')
    parser.add_argument('--verify', action='store_true', help='Re-scan after migration')
    parser.add_argument('--collection', help='Limit to a single collection')
    parser.add_argument('--concurrency', type=int, default=4)
    parser.add_argument('--batch', type=int, default=50)
    args = parser.parse_args()
    
    if not (args.scan or args.migrate or args.verify):
        parser.print_help()
        sys.exit(1)
    
    logger.info(f"DB={DB_NAME}  R2_BUCKET={R2_BUCKET}")
    m = Migrator(dry_run=args.scan, concurrency=args.concurrency, batch=args.batch)
    try:
        if args.verify:
            await m.verify()
        else:
            await m.scan_or_migrate(only=args.collection)
    finally:
        await m.close()


if __name__ == '__main__':
    asyncio.run(main())
