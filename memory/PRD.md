# ServisPro - Product Requirements Document

## Overview
ServisPro is a comprehensive platform in Guinea connecting service providers, companies, and clients. It includes a virtual marketplace (Makiti), a real estate section, and a service directory.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB (`servispro_production`)
- **Image Hosting**: Cloudinary (with `f_auto` for HEIC compatibility)
- **PWA**: Service Worker + manifest.json for installable web app

## Backend Structure (Refactored Feb 2026)
```
/app/backend/
├── server.py           # 92 lines - Main app, middleware, router inclusion
├── database.py         # MongoDB connection
├── config.py           # JWT, admin accounts, rate limiting, CORS
├── models.py           # All Pydantic models and enums (~870 lines)
├── dependencies.py     # Auth dependencies (get_current_user, etc.)
├── middleware.py        # Security, rate limiting, admin auth middleware
├── utils/
│   ├── cloudinary_helper.py  # Upload/delete Cloudinary functions
│   └── security.py           # Audit logging, IP blocking, contact filtering
├── routes/
│   ├── auth.py          # Auth routes (register, login, password reset)
│   ├── providers.py     # Provider profile, documents
│   ├── companies.py     # Company profile, services, jobs, properties
│   ├── rentals.py       # Rental listings, visit requests, chat
│   ├── property_sales.py # Property sales, inquiries
│   ├── vehicles.py      # Vehicle listings, vehicle sales
│   ├── marketplace.py   # Shops, products, reviews (Makiti)
│   ├── admin.py         # Admin management, stats, settings
│   ├── jobs.py          # Job offers, completion flow
│   ├── notifications.py # Notification system
│   ├── payments.py      # Payments, credits, refunds
│   └── feedback.py      # Feedback, provider reviews
└── tests/
```

## Frontend Structure (Refactored Feb 2026)
```
/app/frontend/src/
├── pages/
│   ├── AdminDashboard.js   # 1649 lines (refactored from 5070)
│   ├── CompanyDashboard.js # 2470 lines (pending refactor)
│   ├── Marketplace.js      # Makiti with category icons
│   └── ...
├── components/
│   ├── admin/              # Extracted admin tab components
│   │   ├── AdminProvidersTab.js
│   │   ├── AdminCustomersTab.js
│   │   ├── AdminRentalsTab.js
│   │   ├── AdminAgentsTab.js
│   │   ├── AdminSalesTab.js
│   │   ├── AdminCompaniesTab.js
│   │   ├── AdminRevenueTab.js
│   │   ├── AdminRefundsTab.js
│   │   ├── AdminFeedbacksTab.js
│   │   ├── AdminMakitiTab.js
│   │   └── AdminSettingsTab.js
│   ├── MyShop.js
│   └── ...
└── utils/
    └── imageUrl.js         # getImageUrl with f_auto for HEIC
```

## Completed Features
- [x] Service provider registration/login with verification
- [x] Customer registration/login
- [x] Company registration/login with document upload
- [x] Admin dashboard with 14 management tabs
- [x] Makiti Marketplace with category filtering (icons)
- [x] Dynamic product characteristics by category
- [x] Currency selector (GNF, EUR, USD) + "Prix sur demande"
- [x] Real estate: Rentals, property sales, visit requests
- [x] Vehicle listings and sales
- [x] Admin message monitoring (client-to-seller)
- [x] Company password reset (phone+email verification)
- [x] HEIC image fix (Cloudinary f_auto)
- [x] PWA with iOS install banner
- [x] Payment simulation system
- [x] Notification system
- [x] Feedback system
- [x] Commission and service fees management
- [x] **Backend refactoring** (8078 → 92 lines server.py)
- [x] **AdminDashboard refactoring** (5070 → 1649 lines)

## Pending Issues
- [ ] P3: "Erreur lors de l'approbation" (needs user reproduction steps)
- [ ] P3: Notification sound not playing (browser media policy)

## Upcoming Tasks
- [ ] P0: Refactor CompanyDashboard.js (2470 lines)
- [ ] P1: Terms & Conditions for Company Registration
- [ ] P0: Real Mobile Money Integration
- [ ] P2: WebSockets for real-time status
- [ ] P4: i18next localization

## Admin Credentials
- Email: servispro@servisprogn.com
- Password: Servisproguinea2026#
