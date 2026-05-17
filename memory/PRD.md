# ServisPro — Product Requirements Document

## Original Problem Statement
ServisPro est une plateforme guinéenne (Conakry) qui connecte clients, prestataires et entreprises de services. Elle inclut :
- Annuaire des prestataires (Browse)
- Marketplace "Makiti" (boutiques + produits)
- Immobilier (Locations + Ventes)
- Espace Entreprise (création de boutique, statistiques de ventes)
- Espace Admin (modération, statistiques, insights)

## Personas
- **Client** : recherche des prestataires, produits, biens immobiliers
- **Prestataire** : propose ses services, reçoit des demandes
- **Entreprise** : gère sa boutique Makiti, ses ventes, ses produits
- **Admin** : valide les entreprises/prestataires, modère

## Core Requirements (état actuel)
- Localisation guinéenne : numéros auto-formatés en `+224`, drapeau guinéen sur les champs téléphone
- Auth-gate sur Makiti avant de contacter un vendeur
- Validation stricte des numéros côté front + back
- Pagination & tri Admin (Companies, Customers, Providers, Agents)
- Sécurité : 5 endpoints publics protégés (`Depends(get_current_user)`)
- Stats entreprise : ventes Makiti (basées sur demandes traitées)
- Tracking : recherches Makiti + suggestions produits (exit-intent)
- CGU obligatoires : Client, Prestataire, **Entreprise** (✅ ajouté Feb 2026)

## Changelog
- **2026-02-17** : Renommé items dropdown "Mon compte" → "Connexion client" / "Inscription client" (CustomerHome.js)
- **2026-02-17** : Ajout CGU obligatoires à `/company/auth` (CompanyAuth.js) avec `TermsConditionsModal`
- (antérieur) : Refactoring CustomerDashboard.js (1466→548) et CompanyDashboard.js (1331→1038)
- (antérieur) : Makiti Auth Gate, Insights, Tracking, Shop Inquiries, Stats Entreprise
- (antérieur) : Pagination Admin complète, sécurisation des endpoints, localisation guinéenne globale

## Roadmap

### P0
- Intégration Mobile Money (paiement réel pour Makiti/services)

### P1
- Refactor `CompanyDashboard.js` (~1038 lignes) via Context API

### P2
- Statut "En ligne/Hors ligne" en temps réel via WebSockets
- Bug "Erreur lors de l'approbation" (Admin) — besoin de repro user

### P3
- Localisation i18next pour textes français hardcodés
- MongoDB Atlas Security Configuration (manuel — user)

## Architecture
```
/app/
├── backend/
│   ├── server.py
│   ├── models.py
│   ├── config.py
│   ├── middleware.py
│   └── routes/ (auth, marketplace, companies, feedback, …)
└── frontend/src/
    ├── components/{admin,company,customer,ui}/
    ├── components/{GuineaFlag, TermsConditionsModal}.{jsx,js}
    ├── pages/ (CustomerHome, CustomerAuth, CompanyAuth, AuthPage, …)
    └── utils/phone.js
```

## Key API endpoints
- `GET /api/company/stats`
- `POST /api/marketplace/searches`
- `POST /api/marketplace/suggestions`
- `PUT /api/shop/inquiries/{id}/status`

## DB schema (extraits récents)
- `product_messages.status` ∈ {pending, processed, cancelled}
- `marketplace_searches` `{query, count, timestamp}`
- `marketplace_suggestions` `{product_name, category, description, user_phone, status}`

## Credentials
Voir `/app/memory/test_credentials.md`. Admin prod : `servispro@servisprogn.com`.

## Language
Toutes les interactions agent ↔ utilisateur doivent être en **français**.
