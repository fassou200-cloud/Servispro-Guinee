# ServisPro - Product Requirements Document

## Original Problem Statement
ServisPro is a comprehensive platform for service providers, companies, and clients in Guinea. The platform includes:
- A virtual marketplace named "Makiti" for companies to sell products
- A real estate portal (rentals and sales)
- A service directory connecting professionals with clients
- Admin dashboard for complete platform management

**User's preferred language**: French

## Core Architecture
- **Frontend**: React (CRA) with Shadcn/UI components
- **Backend**: FastAPI (Python) - monolithic `server.py`
- **Database**: MongoDB Atlas (`servispro_production`)
- **Image Storage**: Cloudinary
- **Deployment**: Kubernetes container

## What's Been Implemented

### Phase 1 - Core Platform (Complete)
- Service provider registration, profiles, and approval workflow
- Customer registration and service browsing
- Admin dashboard with comprehensive management tools
- Real estate listings (rentals + sales)
- Company registration and dashboard

### Phase 2 - Marketplace "Makiti" (Complete)
- Company shop creation and management (MyShop component)
- Product CRUD with multi-photo uploads
- Product ratings & reviews from customers
- Marketplace browsing with sector filters
- Product messaging between customers and sellers

### Phase 3 - Security & Data Integrity (Complete)
- AdminAuthMiddleware protecting all 65+ admin API endpoints
- Soft-delete with audit logging for user data
- Hard cascade deletion for companies (shops, products, rentals, sales, messages, Cloudinary files)
- Rate limiting on login endpoints

### Phase 4 - Admin Product Management (Complete - March 31, 2026)
- Admin can view all products from company boutiques in the Entreprises tab
- Photo gallery with grid view showing all product photos
- Individual photo deletion from admin dashboard (with Cloudinary cleanup)
- Product editing (name, description, price, negotiable, availability) from admin
- Product deletion with all associated photos from admin
- Backend endpoints: GET /api/admin/companies/{company_id}/products, PUT /api/admin/products/{product_id}, DELETE /api/admin/products/{product_id}, DELETE /api/admin/products/{product_id}/photos/{photo_index}

### Phase 5 - UI/UX Enhancements (Complete)
- Homepage overhaul with Makiti and Espace Entreprise cards
- Company auth via phone number, RCCM made optional
- Real estate messaging (Contacter l'Agence)
- Company password change functionality
- PWA configuration with service worker
- Company password reset via phone + email verification on login page (March 31, 2026)

## Pending Issues
- **P3**: "Erreur lors de l'approbation" (needs user reproduction steps)
- **P3**: Notification sound not playing (browser media playback policy)
- **P0-Verification**: PWA installation and SPA routing (code written, not fully verified)

## Upcoming Tasks
- **P0**: Refactor `server.py` (7800+ lines) into modular FastAPI routers
- **P0**: Refactor `AdminDashboard.js` (4400+ lines) and `CompanyDashboard.js` (2400+ lines)
- **P1**: Add Terms & Conditions to Company Registration

## Future/Backlog Tasks
- **P0**: Real Mobile Money Integration (payment gateway)
- **P2**: Real-Time "Online/Offline" Status (WebSockets)
- **P4**: Localization (i18next)
- **P4**: Admin Visualizations (charts/graphs)

## Key Credentials
- Admin: servispro@servisprogn.com / Servisproguinea2026#
- Database: servispro_production (MongoDB Atlas)

## Key Files
- `/app/backend/server.py` - All backend logic (7900+ lines)
- `/app/frontend/src/pages/AdminDashboard.js` - Admin panel (4500+ lines)
- `/app/frontend/src/pages/CompanyDashboard.js` - Company dashboard (2400+ lines)
- `/app/frontend/src/components/MyShop.js` - Shop management component
- `/app/frontend/src/pages/Marketplace.js` - Makiti browsing page
