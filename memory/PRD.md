# ServisPro — Product Requirements Document

## Original Problem Statement
ServisPro est une plateforme guinéenne (Conakry) qui connecte clients, prestataires et entreprises de services. Elle inclut :
- Annuaire des prestataires (Browse)
- Marketplace "Makiti" (boutiques + produits) — désormais la page d'accueil principale
- Immobilier (Locations + Ventes)
- Espace Entreprise (création de boutique, statistiques de ventes)
- **Module Intérim** (missions ponctuelles entreprise ↔ prestataire avec commission ServisPro)
- Espace Admin (modération, statistiques, insights, intérim)

## Personas
- **Client** : recherche des prestataires, produits, biens immobiliers
- **Prestataire** : propose ses services + postule à des missions d'intérim
- **Entreprise** : gère sa boutique Makiti, ses ventes, publie des missions d'intérim
- **Admin** : valide les entreprises/prestataires, modère, valide les commissions intérim

## Core Requirements (état actuel)
- Localisation guinéenne : numéros auto-formatés en `+224`, drapeau guinéen sur les champs téléphone
- Auth-gate sur Makiti avant de contacter un vendeur
- Pagination & tri Admin (Companies, Customers, Providers, Agents)
- Sécurité : endpoints publics protégés (`Depends(get_current_user)`)
- Stats entreprise : ventes Makiti
- Tracking : recherches Makiti + suggestions produits
- CGU obligatoires : Client, Prestataire, Entreprise
- Catégories Makiti étendues : Ordinateurs portables, Smartphones, + cartes "Trouver un pro / Louer une maison / Vente maison"
- Tri intelligent + rotation 2h des produits Makiti
- Logo "ServisPro Makiti" + dropdown "Mon compte" 3 espaces (Client / Prestataire / Entreprise)
- Bandeau Espace Entreprise sur la home
- Footer avec numéros de téléphone cliquables + réseaux sociaux
- **Module Intérim complet (Feb 2026)** :
  - Entreprises publient des missions
  - Prestataires postulent (interim_suspended bloque)
  - Acceptation → mission close/completed → commissions générées
  - Commission % global configurable par l'admin
  - Prestataire paie ServisPro (Orange/MTN/Bank/Autre) + soumet ref transfert
  - Admin valide ou rejette → auto-unsuspend du prestataire

## Changelog
- **2026-02-25** : **Phase 2 Intérim livrée** (28/28 tests). Backend : `routes/interim_phase2.py` (availability, timesheets, invoice HTML, ratings). Frontend : `AvailabilityCalendar.js`, 2 nouvelles vues côté prestataire (Pointages + Disponibilité) et 1 côté entreprise (Pointages), modales Pointage + Notation, boutons Facture + Noter sur missions complétées.
- **2026-02-24** : Module Intérim Phase 1 complet
- **2026-02-23** : Footer Makiti avec numéros tel: cliquables, réseaux sociaux, copyright
- **2026-02-23** : Landing = Makiti, logo "ServisPro Makiti", dropdown Mon compte 3 espaces, bandeau Espace Entreprise
- **2026-02-22** : Catégories étendues (Ordinateurs portables, Smartphones), bouton "Publier annonce" Rentals → `/company/auth`
- **2026-02-21** : Rotation 2h sur Makiti + tri smart (engagement + récence + personnalisation)
- **2026-02-20** : Carrousel catégories défilant + Trouver pro / Louer maison / Vente maison
- **2026-02-19** : Espace Entreprise ajouté au dropdown CustomerHome
- **2026-02-17** : CGU obligatoires à `/company/auth`
- (antérieur) Refactoring CustomerDashboard.js, CompanyDashboard.js, sécurisation endpoints, localisation

## Roadmap

### P0
- Intégration Mobile Money (paiement réel) — phase 2 du module Intérim
- Rebascule DB_NAME vers `servispro_production` avant redéploiement

### P1
- Refactor `CompanyDashboard.js` (~1060 lignes) via Context API
- Module Intérim — Phase 2 : calendrier de dispo, pointage, facturation auto, notation

### P2
- Statut "En ligne/Hors ligne" en temps réel via WebSockets
- Bug "Erreur lors de l'approbation" Admin

### P3
- Localisation i18next pour textes français hardcodés
- MongoDB Atlas Security (manuel — user)

## Architecture
```
/app/
├── backend/
│   ├── server.py
│   ├── models.py
│   ├── config.py
│   ├── middleware.py
│   └── routes/ (auth, marketplace, companies, feedback, interim, …)
└── frontend/src/
    ├── components/{admin,company,customer,provider,ui}/
    │   ├── company/CompanyInterimTab.js
    │   ├── provider/ProviderInterimTab.js
    │   └── admin/AdminInterimTab.js
    └── pages/ (Marketplace [home], CustomerHome [home-classic], CompanyAuth, …)
```

## Key API endpoints (Intérim)
### Public/logged-in
- `GET /api/interim/missions` (liste publique pour prestataires)
- `GET /api/interim/missions/{id}`
- `GET /api/interim/payment-methods`

### Entreprise
- `POST /api/interim/missions`
- `GET /api/interim/missions/mine`
- `PUT/DELETE /api/interim/missions/{id}`
- `GET /api/interim/missions/{id}/applications`
- `POST /api/interim/applications/{id}/accept|reject`
- `POST /api/interim/missions/{id}/complete`

### Prestataire
- `POST /api/interim/missions/{id}/apply`
- `GET /api/interim/applications/mine`
- `POST /api/interim/applications/{id}/withdraw`
- `GET /api/interim/commissions/mine`
- `POST /api/interim/commissions/{id}/submit-payment`

### Admin
- `GET/PUT /api/admin/interim/settings`
- `GET /api/admin/interim/commissions`
- `POST /api/admin/interim/commissions/{id}/validate|reject`
- `GET /api/admin/interim/missions`

## DB schema (extraits récents)
- `interim_missions` : `{id, company_id, title, job_type, daily_rate, status, num_providers_needed, accepted_count, ...}`
- `mission_applications` : `{id, mission_id, provider_id, status[pending|accepted|rejected|withdrawn], cover_message, proposed_rate, ...}`
- `interim_commissions` : `{id, mission_id, provider_id, gross_amount, commission_percent, commission_amount, status[pending|submitted|validated|rejected], payment_method, transfer_reference, sender_phone, ...}`
- `admin_settings.type='interim_settings'` : `{commission_percent, payment_methods[]}`
- `service_providers.interim_suspended` : booléen

## Credentials
Voir `/app/memory/test_credentials.md`. Admin prod : `servispro@servisprogn.com`.
Test company (dev DB) : `224620000001 / TestCompany2026!`

## Language
Toutes les interactions agent ↔ utilisateur doivent être en **français**.

## Environments
- **PREVIEW** (`shop-marketplace-47.preview.emergentagent.com`) — DB = `servispro_dev`
- **PRODUCTION** (`https://servisprogn.com`) — DB = `servispro_production`
- ⚠️ Pour redéployer : remettre `DB_NAME="servispro_production"` dans `backend/.env`
