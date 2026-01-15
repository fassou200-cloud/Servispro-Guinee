# ServisPro - Plateforme de Services en Guinée

## Énoncé du Problème Original
Construire une plateforme nommée "ServisPro" pour les prestataires de services et clients en Guinée. La plateforme nécessite des rôles utilisateurs distincts (Prestataire, Client, Admin, Entreprise), la gestion des profils, la vérification d'identité et de documents, les annonces de location et vente, les demandes de service et un système de notation.

## Personas Utilisateurs
1. **Prestataires de Services** - Professionnels offrant divers services
2. **Agents Immobiliers** - Gestion des locations et ventes de propriétés
3. **Prestataires Véhicules** (Camionneur, Tracteur, Voiture) - Location de véhicules
4. **Clients** - Recherche et réservation de services
5. **Entreprises** - Sociétés avec documents légaux (RCCM, NIF, Licence)
6. **Administrateurs** - Gestion de la plateforme

## Exigences Principales

### Authentification et Rôles
- ✅ Authentification JWT séparée pour Admin, Prestataire, Client, **Entreprise**
- ✅ Inscription avec dropdowns en cascade pour les régions guinéennes

### Tableaux de Bord
- ✅ Dashboard Admin avec onglets : Prestataires, Clients, Demandes, Locations, Agents, Ventes, **Entreprises**
- ✅ Dashboard Prestataire conditionnel (Standard, Agent Immobilier, Véhicules)
- ✅ Dashboard Client
- ✅ **Dashboard Entreprise** (Profil, Documents, Services, Offres d'Emploi)

### Fonctionnalités Agent Immobilier
- ✅ Gestion des locations (longue/courte durée) avec équipements
- ✅ Ventes de propriétés (Maison, Terrain, Villa, Immeuble, Bureau/Commerce)
- ✅ Upload de documents légaux (titre foncier, pièce d'identité vendeur, enregistrement ministère)
- ✅ Photos de propriétés

### Fonctionnalités Entreprise (NOUVEAU)
- ✅ Inscription en 2 étapes (informations + documents)
- ✅ Connexion via numéro RCCM + mot de passe
- ✅ Upload de documents : Licence d'exploitation, RCCM, NIF, Attestation fiscale, Logo
- ✅ Validation obligatoire par l'admin avant activation
- ✅ Publication de services (après approbation)
- ✅ Publication d'offres d'emploi (après approbation)
- ✅ **Entreprises Immobilières peuvent poster des locations** (comme Agent Immobilier)
- ✅ **Entreprises Immobilières peuvent poster des ventes** (comme Agent Immobilier)

### Système de Paiement & Notifications (NOUVEAU)
- ✅ **Tarif d'Investigation** remplace "Frais de Transport"
- ✅ **Popup de paiement** avant demande de service avec bannière et conditions
- ✅ **Conditions affichées** : Non remboursable si prestataire présent, 100% remboursé sinon
- ✅ **Paiement Mobile Money** (Orange Money, MTN MoMo) - MODE SIMULATION
- ✅ **Système de Notifications** dans l'application
- ✅ Icône 🔔 avec badge pour notifications non lues
- ✅ Types de notifications : paiement reçu, demande de service, etc.

### Admin
- ✅ Vue de tous les documents pour les locations
- ✅ Vue de tous les documents pour les ventes
- ✅ Vue de tous les documents des entreprises
- ✅ Approbation/Rejet des entreprises
- ✅ **Approbation/Rejet des annonces de location** (NOUVEAU)

---

## Architecture Technique

### Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React avec Shadcn UI & TailwindCSS
- **Base de données:** MongoDB

### Structure des Fichiers Principaux
```
/app/
├── backend/
│   ├── server.py         # API principale
│   └── uploads/          # Fichiers uploadés
└── frontend/
    └── src/
        ├── components/
        │   ├── PropertySaleForm.js    # Formulaire vente 2 étapes
        │   ├── RentalListingForm.js   # Formulaire location 2 étapes  
        │   └── ...
        ├── pages/
        │   ├── AdminDashboard.js      # Dashboard admin (+ Entreprises)
        │   ├── CompanyAuth.js         # NOUVEAU: Auth entreprise
        │   ├── CompanyDashboard.js    # NOUVEAU: Dashboard entreprise
        │   ├── Dashboard.js           # Dashboard prestataire
        │   └── ...
        └── data/
            └── guineaLocations.js     # Données régions/villes
```

### Schéma Base de Données
- **users:** Prestataires individuels
- **customers:** Clients
- **companies:** Entreprises avec documents (NOUVEAU)
- **company_services:** Services des entreprises (NOUVEAU)
- **company_job_offers:** Offres d'emploi des entreprises (NOUVEAU)
- **rentals:** Locations avec documents
- **sales:** Ventes de propriétés avec documents

### Endpoints API Clés - Entreprises (NOUVEAU)
- `POST /api/auth/company/register` - Inscription entreprise
- `POST /api/auth/company/login` - Connexion par RCCM
- `GET /api/company/profile/me` - Profil entreprise
- `POST /api/company/upload-document/{type}` - Upload documents
- `POST /api/company/upload-logo` - Upload logo
- `POST /api/company/services` - Créer un service
- `POST /api/company/job-offers` - Créer une offre d'emploi
- `POST /api/company/rentals` - **NOUVEAU: Créer location (Immobilier seulement)**
- `GET /api/company/rentals/my` - **NOUVEAU: Mes locations entreprise**
- `POST /api/company/property-sales` - **NOUVEAU: Créer vente (Immobilier seulement)**
- `GET /api/company/property-sales/my` - **NOUVEAU: Mes ventes entreprise**
- `GET /api/admin/companies` - Liste entreprises (admin)
- `PUT /api/admin/companies/{id}/approve` - Approuver
- `PUT /api/admin/companies/{id}/reject` - Rejeter
- `DELETE /api/admin/companies/{id}` - Supprimer

### Endpoints API Clés - Paiements & Notifications (NOUVEAU)
- `POST /api/payments/initiate` - Initier un paiement Mobile Money
- `POST /api/payments/{id}/confirm` - Confirmer un paiement (webhook)
- `GET /api/payments/{id}/status` - Statut d'un paiement
- `GET /api/provider/{id}/investigation-fee` - Tarif d'investigation d'un prestataire
- `GET /api/notifications/provider` - Notifications du prestataire
- `GET /api/notifications/customer` - Notifications du client
- `GET /api/notifications/unread-count/provider` - Nombre de notifications non lues
- `PUT /api/notifications/{id}/read` - Marquer comme lu
- `PUT /api/notifications/mark-all-read/provider` - Tout marquer comme lu

---

## Changelog

### 2026-01-15 - Paramètres Admin: Commissions par Domaine (NOUVEAU)
- ✅ **Nouvelle structure de commissions par domaine** (tous en pourcentage) :
  - Prestation de services : 10%
  - Location courte durée : 10%
  - Location longue durée : 5%
  - Vente immobilière : 3%
  - Location véhicule : 10%
- ✅ **Backend mis à jour** : Nouveaux champs dans `admin_settings`, endpoint public `/api/commission-rates`
- ✅ **Interface Admin Settings** : 5 champs de pourcentage avec icônes colorées
- ✅ **Répartition des revenus par domaine** dans le dashboard admin
- ✅ **Calcul automatique des commissions** basé sur le type de transaction
- ✅ **Migration automatique** des anciens paramètres vers la nouvelle structure
- ✅ **Composant CommissionRatesCard** : Affiche les commissions aux utilisateurs selon leur domaine
  - Agent Immobilier : Location courte/longue durée + Vente immobilière
  - Prestataire véhicule : Location véhicule
  - Autres prestataires : Prestation de services
  - Entreprises : Selon leur secteur d'activité

### 2026-01-13 - Approbation Admin des Locations (NOUVEAU)
- ✅ **Champ `approval_status`** ajouté aux locations : `pending`, `approved`, `rejected`
- ✅ **Nouvelles locations automatiquement en statut `pending`**
- ✅ **Endpoint public `/api/rentals`** ne retourne que les locations `approved`
- ✅ **Admin Dashboard** : 
  - Badge de statut coloré (orange=En attente, vert=Approuvé, rouge=Rejeté)
  - Boutons "Approuver" / "Rejeter" pour les locations en attente
  - Notification automatique au prestataire lors de l'approbation/rejet
- ✅ **Dashboard Prestataire (MyRentals.js)** :
  - Badge de statut d'approbation pour chaque location
  - Message d'information pour les locations en attente
  - Affichage de la raison de rejet si applicable
- ✅ **Dashboard Entreprise (CompanyDashboard.js)** :
  - Badge de statut d'approbation pour chaque location
  - Message d'information pour les locations en attente/rejetées
- ✅ Migration des locations existantes vers le statut `approved`

### 2026-01-13 - Système de Paiement & Notifications
- ✅ Remplacé "transport_fee" par "investigation_fee" (Tarif d'Investigation)
- ✅ Créé popup de paiement avec bannière professionnelle
- ✅ Conditions de remboursement clairement affichées
- ✅ **Simulation Améliorée Orange Money / MTN MoMo** :
  - Flux complet en 5 étapes (Formulaire → Envoi OTP → Saisie OTP → Traitement → Reçu)
  - Design différencié Orange (orange) vs MTN (jaune)
  - Code OTP simulé avec countdown 60s
  - Référence de transaction unique (ex: OM808297217557)
  - Reçu de transaction complet avec copie de référence
  - Historique des paiements sauvegardé en base
- ✅ Système de notifications avec icône 🔔 et badge
- ✅ Notifications de paiement reçu automatiques
- ✅ Nouveaux composants : InvestigationFeePopup.js, NotificationBell.js
- ✅ Nouveaux endpoints backend pour paiements et notifications

### 2026-01-11 - Entreprises Immobilières (NOUVEAU)
- ✅ Ajouté possibilité pour entreprises du secteur "Immobilier" de poster des locations
- ✅ Ajouté possibilité pour entreprises du secteur "Immobilier" de poster des ventes
- ✅ Nouveaux endpoints : `/api/company/rentals`, `/api/company/property-sales`
- ✅ Onglets conditionnels "Locations", "+ Location", "Ventes", "+ Vendre" dans CompanyDashboard
- ✅ Formulaires création location en 2 étapes (Infos → Photos)
- ✅ Formulaires création vente en 2 étapes (Infos → Photos)
- ✅ Les entreprises non-immobilières ne voient pas ces onglets
- ✅ Tests : 12 tests backend + tests UI - 100% passés

### 2026-01-11 - Espace Entreprise
- ✅ Créé formulaire inscription entreprise en 2 étapes (CompanyAuth.js)
- ✅ Ajouté connexion par numéro RCCM + mot de passe
- ✅ Créé dashboard entreprise avec onglets Profil/Documents/Services/Offres (CompanyDashboard.js)
- ✅ Upload documents : Licence, RCCM, NIF, Attestation fiscale, Logo, Additionnels
- ✅ Admin Dashboard : nouvel onglet Entreprises
- ✅ Admin peut voir tous les documents des entreprises
- ✅ Admin peut approuver/rejeter/supprimer les entreprises
- ✅ Entreprises ne peuvent publier services/offres que si approuvées
- ✅ Stats admin mises à jour avec compteur entreprises
- ✅ Tests : 24 tests backend + tests UI - 100% passés

### 2026-01-11 - Ventes et Documents
- ✅ Formulaire vente propriétés 2 étapes avec documents
- ✅ Formulaire location avec section documents étape 2
- ✅ Affichage documents dans MyPropertySales et MyRentals
- ✅ Admin peut voir documents des ventes et locations

### Sessions Précédentes
- Authentification et rôles complets
- Dashboard conditionnel pour différents types de prestataires
- Véhicules (Camionneur, Tracteur, Voiture)
- Chat avec masquage téléphone/email
- Locations avec équipements détaillés
- Refonte UI complète

---

## Tâches Restantes

### P0 - Terminé
- [x] **Approbation Admin des locations** - TERMINÉ 2026-01-13
- [x] **Paramètres Admin: Commissions par Domaine** - TERMINÉ 2026-01-15

### P1 - À Venir
- [ ] Page publique des offres d'emploi avec filtres (BrowseJobs.js)
- [ ] WebSockets pour statut en ligne temps réel
- [ ] Page publique des services d'entreprises

### P2 - Futur  
- [ ] Intégration réelle Mobile Money (Orange Money / MTN) - requiert clés API
- [ ] Système de candidature aux offres d'emploi

### Refactoring Suggéré
- [ ] Diviser server.py en routers séparés (auth, admin, companies, rentals, etc.)
- [ ] Internationalisation avec i18next

---

## Comptes de Test

### Entreprise Immobilière (approuvée)
- **RCCM:** RCCM/GC/IMMO001
- **Mot de passe:** immo123
- **Secteur:** Immobilier
- **Statut:** Approuvée

### Entreprise Construction (en attente)
- **RCCM:** RCCM/GC/TEST001
- **Mot de passe:** test123
- **Secteur:** Construction
- **Statut:** En attente

### Admin
- **Username:** admin
- **Mot de passe:** admin123
