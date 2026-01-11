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

### Admin
- ✅ Vue de tous les documents pour les locations
- ✅ Vue de tous les documents pour les ventes
- ✅ Vue de tous les documents des entreprises
- ✅ Approbation/Rejet des entreprises

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
- `GET /api/admin/companies` - Liste entreprises (admin)
- `PUT /api/admin/companies/{id}/approve` - Approuver
- `PUT /api/admin/companies/{id}/reject` - Rejeter
- `DELETE /api/admin/companies/{id}` - Supprimer

---

## Changelog

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

### P1 - À Venir
- [ ] WebSockets pour statut en ligne temps réel
- [ ] Page publique des offres d'emploi avec filtres
- [ ] Page publique des services d'entreprises

### P2 - Futur  
- [ ] Flux OTP simulé
- [ ] Intégration Mobile Money
- [ ] Système de candidature aux offres d'emploi

### Refactoring Suggéré
- [ ] Diviser Dashboard.js en composants par type de prestataire
- [ ] Internationalisation avec i18next
