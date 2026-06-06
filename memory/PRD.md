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
- **2026-06-06** : **Fix P0 Double SMS Africa's Talking** — Le `PreRegisterOtpGate` envoyait un OTP au mount (auto-send `useEffect`) alors que les 3 parents (`CustomerAuth`, `CompanyAuth`, `AuthPage`) appellent déjà `/auth/pre-register` avant d'afficher le gate. Résultat : 2 SMS facturés à chaque inscription. Confirmé en prod via `otp_codes` collection (ex: phone `224629316505` → 2 OTPs avec 2 `message_id` AT distincts à 1.3s d'écart). Fix : suppression complète du `useEffect` d'auto-envoi dans `PreRegisterOtpGate.js`. `sent` initialisé à `true` car le parent gère l'envoi initial ; `sendCode` ne se déclenche plus que via le bouton "Renvoyer" manuel.
- **2026-06-06** : **Flux d'inscription 2 étapes (Pre-Register + OTP)** — Backend : nouveau `POST /api/auth/pre-register` (valide format guinéen + unicité + envoie OTP, aucun compte créé). Les 3 endpoints register (`/auth/register`, `/auth/customer/register`, `/auth/company/register`) exigent maintenant un champ `otp_code` (vérifié avant toute insertion BD ou upload R2/Cloudinary). `phone_verified=True` directement sur création. Frontend : nouveau composant `PreRegisterOtpGate.js` (auto-envoi, saisie 6 chiffres, renvoi avec cooldown 45s) intégré dans `CustomerAuth.js`, `CompanyAuth.js`, `AuthPage.js`. Validation Guinéa-Phone côté backend : regex `^224[6-7]\\d{8}$` (9 chiffres après +224). Erreurs Africa's Talking traduites en français (InvalidPhoneNumber/CouldNotRoute → "Numéro de téléphone inexistant"). Script `grandfather_phone_verified.py` étendu pour aussi traiter `phone_verified=False` (pas seulement les champs manquants). Régression `/auth/login` OK.
- **2026-02-29** : **Fix P0 uploads R2 contournés** — Découverte critique : 6 endpoints (`/shop/upload-logo`, `/shop/upload-banner`, `/shop/products/{id}/photos`, `/company/shop/upload-logo`, `/company/shop/products/{id}/photos`, `/admin/products/{id}/photos`) appelaient `cloudinary.uploader.upload()` directement au lieu du facade `storage.upload_to_cloudinary`, donc **R2 n'était jamais utilisé pour les produits/logos** depuis l'introduction de la migration R2. Refactor complet pour passer tous ces uploads par le facade qui route vers R2 selon `STORAGE_PROVIDER=r2`. Imports `cloudinary`/`cloudinary.uploader` retirés de `marketplace.py`. R2 confirmé fonctionnel : upload OK, URL publique HTTP 200, propagation < 5 s.
- **2026-02-29** : **Basculement preview vers `servispro_production`** pour préparation déploiement. `sms_settings` (seuil 2 USD) et `interim_settings` (commission 10%) initialisés en BD prod. Tous les endpoints validés (admin login, SMS dashboard, OTP, interim, marketplace).
- **2026-02-29** : **Dashboard SMS Admin** livré (P1). Backend : `routes/admin_sms.py` + collection `sms_logs` (logging automatique via `sms_helper`), endpoints `/api/admin/sms/{stats,logs,balance,settings}`. Frontend : nouvel onglet **SMS** dans AdminDashboard avec 4 KPI cards, widget solde Africa's Talking temps réel, configuration seuil d'alerte solde bas, répartition par motif (OTP/Alerte/Notification/Autre), journal paginé avec filtres et numéros masqués.
- **2026-02-29** : **Africa's Talking passé en mode Live** (`AT_USERNAME=servispro`, clé Live, sender ID vide en attendant approbation "SERVISPRO").
- **2026-02-29** : **Fix P0 verrouillage pointage validé** — Le pointage validé par l'entreprise est désormais entièrement en lecture seule côté prestataire. `ProviderInterimTab.openTimesheet` calcule `lockedDates` pour les statuts `submitted` ET `validated`, ajoute un flag `readOnly` qui désactive calendrier + inputs + cache le bouton « Envoyer ». `TimesheetCalendar` accepte un prop `readOnly`. `ProviderInterimDialogs.TimesheetSubmitDialog` affiche une bannière verte « Pointage validé par l'entreprise. Les jours et heures sont figés ». Backend renvoyait déjà HTTP 400 « Pointage déjà validé » (testé via curl).
- **2026-02-26** : **Module Intérim Client** livré. Backend `routes/interim_customer.py` (14 endpoints `/api/interim/customer/*`, quota 2 missions actives). Frontend : `CompanyInterimTab.js` rendu paramétrique (props routes/tokenKey), wrapper `CustomerInterimTab.js`, onglet Intérim dans dashboard client. Badge « Particulier » vs « Entreprise » sur les missions côté prestataire.
- **2026-02-26** : Compteur **« N missions réussies »** sur profil prestataire (header + section avis) et cartes Browse. Endpoint `/interim/ratings/provider/{id}` enrichi avec `completed_missions`.
- **2026-02-26** : Localisation Région/Ville/Commune/Quartier (4 niveaux) dans le formulaire mission entreprise — identique inscription prestataire.
- **2026-02-26** : Catégorie « Vêtements de sport » ajoutée au carousel Makiti + admin.
- **2026-02-26** : Avis Intérim affichés sur profil prestataire (header badge + section dédiée) ; note combinée Clients+Intérim sur cartes Browse.
- **2026-02-26** : Calendriers Disponibilité + Pointage compacts (`max-w-md`, cellules h-9) + dates futures grisées sur calendrier pointage. Modal Shadcn pour rejet de pointage avec motif obligatoire ≥ 5 caractères.
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
- Intégration Mobile Money (Orange / MTN) — paiement réel des commissions intérim
- Rebascule DB_NAME vers `servispro_production` avant redéploiement

### P1
- Refactor `CompanyDashboard.js` (~1060 lignes) via Context API
- Refactor `CompanyInterimTab.js` / `ProviderInterimTab.js` devenus volumineux

### P2
- Statut "En ligne/Hors ligne" en temps réel via WebSockets
- Bug "Erreur lors de l'approbation" Admin (à reproduire avec étapes utilisateur)
- **Classement « Top prestataires de la semaine »** sur la home Makiti (missions réussies + note moyenne 7 derniers jours)

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

## Storage (mai 2026)
Migration de Cloudinary vers **Cloudflare R2** pour réduire les coûts de bande passante.
- **Provider actif** : R2 (variable `STORAGE_PROVIDER=r2` dans `.env`)
- **Nouveau helper** : `/app/backend/utils/r2_helper.py` (boto3 S3-compatible)
- **Facade** : `/app/backend/utils/storage.py` — route les uploads vers R2 et les deletes vers le bon provider selon l'URL. Les anciennes URLs Cloudinary continuent de fonctionner.
- **Bucket** : `servispro-media` — public URL `https://pub-50bc696e8a3e4a70baf84e8e8800084f.r2.dev`
- **Endpoint S3** : `https://89b8b5177ed7aaf6fbf827e2833d7104.r2.cloudflarestorage.com`
- **À redéployer** : ajouter `R2_*` + `STORAGE_PROVIDER` dans Emergent Deploy → Env Vars

## Code Quality Backlog (reporté mai 2026)
Suite à un rapport de code review automatisé. Tous les **bugs critiques runtime** ont été corrigés (imports manquants `VehicleSaleStatus`, `ProviderStatus`, `ListingApprovalStatus`, `VisitRequestStatus`, `os`, `UPLOAD_DIR`, `generate_transaction_reference`, parenthèse `JobsList.js:75`). Reste en backlog :

### P2 — Refactoring & Polish
- **`is` → `==`** (53 instances dans `routes/`, `tests/`) — auto-fixable via `ruff --fix --unsafe-fixes`, ~30min
- **Array index as key** (`ProviderProfile.js`, `LandingPage.js`, `AuthPage.js`, `TimesheetCalendar.js`) — remplacer `key={index}` par `key={item.id}`, ~1-2h
- **`useEffect` missing dependencies** (50+ instances dans `Marketplace.js`, `Dashboard.js`, `CustomerDashboard.js`, `ProviderProfile.js`, `ProductDetail.js`) — refactor par fichier avec `useCallback`, ~4-6h total
- **Composants > 600 lignes à splitter** : `RentalListingForm.js` (939), `MyShop.js` (835), `PropertySaleForm.js` (763), `AdminCompaniesTab.js` (754), `InvestigationFeePopup.js` (650), `MyRentals.js` (607), ~4-6h
- **Fonctions admin.py à haute complexité** : `get_visit_fees_stats()`, `get_demand_stats()`, `admin_update_property_inquiry()` — extraire en helpers, ~3-4h
- **Type hints Python** sur `models.py`, `server.py`, tests, ~4-6h

### P3 — Sécurité long terme
- **Migration `localStorage` → `httpOnly cookies`** pour les tokens (XSS protection), ~8-10h (refactor auth complet)
- **Hardcoded credentials dans `tests/`** — déplacer vers fixtures pytest avec `os.getenv()`, ~1h

### P1 — Monitoring
- **Endpoint `/api/health`** : retourne `{"status":"ok","db":"connected","storage":"r2"}` pour surveillance externe (UptimeRobot/cronjob). Détection instantanée d'un crash backend post-redéploiement. ~30min

## Phone Verification (OTP) — mai 2026
Vérification obligatoire du numéro de téléphone à l'inscription pour les 3 types d'utilisateurs (prestataires, clients, entreprises). SMS via **Africa's Talking** (mode `sandbox` actif pour dev).

**Architecture** :
- `utils/sms_helper.py` — wrapper Africa's Talking SDK
- `utils/otp_helper.py` — génération + stockage + vérification (6 chiffres, 10min, max 5 tentatives, max 3 envois/h)
- `routes/otp.py` — `POST /api/otp/send`, `POST /api/otp/verify`
- `scripts/grandfather_phone_verified.py` — marque tous les utilisateurs existants comme vérifiés (exécuté sur dev + prod le 28 mai)
- Frontend : page `/verify-phone` (`VerifyPhonePage.js`) + redirections depuis `AuthPage`, `CustomerAuth`, `CompanyAuth`

**Login flow** : Si `phone_verified=False`, l'API retourne HTTP 403 avec `error_code: "PHONE_NOT_VERIFIED"` + `phone_number`. Le frontend détecte et redirige automatiquement vers `/verify-phone`.

**WhatsApp** : Bouton "support" ouvre `wa.me/<support>` pour vérification manuelle. **Phase 2** : intégrer Twilio WhatsApp Sandbox pour automatisation.

**À déployer en prod** :
1. Ajouter dans Emergent Deploy → Env Vars : `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` (vide pour sandbox)
2. Le script grandfather a déjà été exécuté sur prod le 28 mai (les 212 utilisateurs existants sont marqués vérifiés)
3. Pour passer Africa's Talking en **mode Live** : créer une app payante AT (~$5 minimum), demander approbation Sender ID `ServisPro` (2-7j), mettre à jour `AT_USERNAME=ServisPro` + `AT_SENDER_ID=ServisPro` dans `.env` prod


## Intérim Phase 4 — Vue Carte (mai 2026)
- 🗺️ **MissionsMap** (`/app/frontend/src/components/interim/MissionsMap.js`) — composant Leaflet + OpenStreetMap (100% gratuit)
- 📍 **guineaCoords.js** (`/app/frontend/src/data/guineaCoords.js`) — coordonnées GPS approximatives par région / ville / commune (priorité commune > city > region) + jitter déterministe pour éviter le chevauchement
- 🔀 **Toggle Liste/Carte** dans `ProviderInterimTab.js` au-dessus du listing des missions ouvertes
- Marqueur custom emerald, popups avec titre, badges (Particulier/Entreprise, type contrat), localisation, dates, tarif, CTA "Voir/Postuler"
- Dépendances ajoutées : `leaflet@1.9.4`, `react-leaflet@5.0.0`

**À venir Phase 4 (reste)** :
- ✅ ~Filtres avancés missions (4 niveaux location, salaire, type)~ — livré (mai 2026)
- Alertes mission par SMS (Africa's Talking déjà en place) → P1 backlog
- Favoris entreprises côté prestataire → P1 backlog

## Intérim Phase 4 — Filtres avancés (mai 2026)
- 🔍 `/app/frontend/src/components/interim/MissionFilters.js` — panneau collapsible avec 4 selects cascade (Région > Ville > Commune > Quartier) issus de `guineaLocations.js`, select `job_type` dynamique extrait des missions, et inputs tarif min/max
- Application via `applyMissionFilters(missions, filters)` (pure fn) — fonctionne pour la liste ET la carte
- Compteur "N actifs" + "N résultats" dans le header du panneau, bouton "Effacer les filtres"
- Intégré dans `ProviderInterimTab.js` au-dessus du toggle Liste/Carte

## Pointages — Note par jour + verrouillage (mai 2026)
**Backend** (`routes/interim_phase2.py` `submit_timesheet`) :
- Schéma `worked_days[]` étendu : `{date, hours, note?}` (note ≤ 200 chars/jour)
- **Verrouillage** : si timesheet en statut `submitted`, les jours déjà envoyés sont LOCKED — toute tentative de modif/suppression renvoie 400 avec message clair ; seule l'ADDITION de nouveaux jours est permise (merge automatique)
- **Déverrouillage automatique** : statut `rejected` (suite à rejet entreprise) → tous les jours redeviennent éditables

**Frontend** :
- `TimesheetCalendar.js` : nouveau prop `lockedDates` (Set), tuiles grises non-cliquables avec tooltip "Jour déjà soumis"
- `ProviderInterimDialogs.TimesheetSubmitDialog` : input note inline par jour (200 chars), badge "Soumis" + disabled sur jours verrouillés, encart explicatif si jours bloqués présents
- `ProviderInterimTab.openTimesheet` : calcule `lockedDates` selon `existing.status === 'submitted'`

Tests backend exhaustifs validés : ajout autorisé, modification refusée, suppression refusée, déverrouillage après rejet OK.

## Masquage contacts post-mission (mai 2026)
**Anti-démarchage** : une fois une mission marquée `completed` (terminée), les numéros des prestataires (acceptés ET rejetés) sont masqués pour l'entreprise / le particulier-propriétaire.
- Backend `routes/interim.py` + `routes/interim_customer.py` `list_*_applications` : ajout flag `phone_lock_reason: 'mission_completed'|'not_accepted'`
- Frontend `components/interim/MissionCard.js` : affiche `🔒 contact masqué — mission terminée` quand `phone_lock_reason === 'mission_completed'`

### Backlog SMS notifications (P1)
- 📲 Notification SMS au prestataire lors d'acceptation/rejet de candidature, validation/rejet de pointage (Africa's Talking déjà branché, ~30min)

## Évaluations rendues OPTIONNELLES (mai 2026)
Suite à choix produit, le caractère obligatoire des évaluations a été levé :
- `routes/interim.py /complete` accepte `ratings` mais ne les exige plus ; les entrées invalides sont ignorées silencieusement
- Mission passe directement à `completed` (plus de phase intermédiaire `awaiting_rating`)
- Frontend `CompleteMissionDialog.js` : section "Évaluation des prestataires (optionnel)", bouton "Clôturer" plus bloqué tant que pas tout noté
- Le système de pending-ratings côté prestataire reste en place (banner amber) — utilisable plus tard si retour à obligatoire
