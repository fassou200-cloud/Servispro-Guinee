# ServisPro - PRD (Product Requirements Document)

## Problem Statement
ServisPro est une plateforme pour prestataires de services et clients en Guinée, avec des rôles pour Admin, Prestataires, Entreprises et Clients.

## Architecture
- **Backend**: FastAPI (Python) - `/app/backend/server.py`
- **Frontend**: React - `/app/frontend/src/`
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary

## Core Features Implemented

### Authentication & Roles
- Provider, Client, Company, Admin authentication
- Role-based dashboards
- Terms & Conditions modals (Provider, Client - pending for Company)

### Provider Management
- Registration, profile, approval workflow
- Advanced filters: City, Neighborhood, Profession, Experience
- Activation/Deactivation by admin (soft delete with `is_active` flag)
- Admin can edit provider name and profession

### Real Estate Agent Features
- Special dashboard for "Propriétaire immobilier"
- Rental listing creation and management
- Property sale listing
- Visit requests management
- **Dynamic Ad Pricing** (COMPLETED 2026-03-15):
  - First 3 listings free (configurable by admin via `annonces_gratuites`)
  - Admin-configurable fees: `frais_annonce_location`, `frais_annonce_vente`
  - `RealEstateFeesCard` component shows fees, free remaining, and listing counts
  - Backend endpoint: `GET /api/agent-listing-info/{provider_id}`

### Admin Dashboard
- Provider/Client list with pagination
- Approval workflow
- Service fee configuration by profession
- Real estate ad fee configuration
- Contact form submissions viewer

### Service Request Flow
- Free service requests (payment gateway removed)
- Job management (accept/reject/complete)

### Other
- Notification system (sound issue pending)
- Contact form
- Google Analytics & Tag Manager

## Known Issues
- **P2**: Notification sound may be silent in some browsers
- **P3**: "Erreur lors de l'approbation" bug (needs user reproduction steps)

## Upcoming Tasks
- **P1**: Add Terms & Conditions to Company Registration (`/company/auth`)
- **P0**: Real Mobile Money Integration (Orange Money / MTN)
- **P2**: WebSocket for real-time online/offline status
- **P3**: Refactor `server.py` into modular routers
- **P4**: Localization with `i18next`
- **P4**: Admin dashboard visualizations (charts)

## Key DB Schema
- **service_providers**: `is_active`, `profession`, `phone_number`, `created_at`
- **customers**: `is_active`
- **admin_settings**: `listing_fee_rental`, `listing_fee_sale`, `free_listings_count`, `frais_annonce_location`, `frais_annonce_vente`, `annonces_gratuites`
- **rental_listings**: `service_provider_id` (owner reference)
- **property_sales**: `agent_id` (owner reference)

## Test Credentials
- **Admin**: `servispro@servisprogn.com` / `Servisproguinea2026#`
- **Provider (Standard)**: `224620333444` / `password123`
- **Provider (Real Estate)**: `224699999999` / `password123`

## 3rd Party Integrations
- MongoDB Atlas (production DB)
- Cloudinary (file storage)
- Google Tag Manager: `GTM-MJMGQVPX`
- Google Analytics 4: `G-FHEVHMPGMR`
