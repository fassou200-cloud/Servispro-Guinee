# ServisPro - Plateforme de Services en Guinée

## Énoncé du Problème Original
Construire une plateforme nommée "ServisPro" pour les prestataires de services et clients en Guinée. La plateforme nécessite des rôles utilisateurs distincts (Prestataire, Client, Admin), la gestion des profils, la vérification d'identité, les annonces de location, les demandes de service et un système de notation.

## Personas Utilisateurs
1. **Prestataires de Services** - Professionnels offrant divers services
2. **Agents Immobiliers** - Gestion des locations et ventes de propriétés
3. **Prestataires Véhicules** (Camionneur, Tracteur, Voiture) - Location de véhicules
4. **Clients** - Recherche et réservation de services
5. **Administrateurs** - Gestion de la plateforme

## Exigences Principales

### Authentification et Rôles
- ✅ Authentification JWT séparée pour Admin, Prestataire, Client
- ✅ Inscription avec dropdowns en cascade pour les régions guinéennes

### Tableaux de Bord
- ✅ Dashboard Admin avec tous les onglets (Prestataires, Clients, Demandes, Locations, Agents, Ventes)
- ✅ Dashboard Prestataire conditionnel (Standard, Agent Immobilier, Véhicules)
- ✅ Dashboard Client

### Fonctionnalités Agent Immobilier
- ✅ Gestion des locations (longue/courte durée) avec équipements
- ✅ Ventes de propriétés (Maison, Terrain, Villa, Immeuble, Bureau/Commerce)
- ✅ Upload de documents légaux (titre foncier, pièce d'identité vendeur, enregistrement ministère)
- ✅ Photos de propriétés
- ✅ Statut en ligne/hors ligne

### Fonctionnalités Véhicules
- ✅ Listing véhicules pour Camionneurs, Tracteurs, Voitures

### Chat
- ✅ Système de messagerie avec masquage automatique des numéros de téléphone et emails

### Admin
- ✅ Vue de tous les documents pour les locations
- ✅ Vue de tous les documents pour les ventes
- ✅ Gestion des agents immobiliers

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
        │   ├── MyPropertySales.js     # Liste ventes agent
        │   ├── MyRentals.js           # Liste locations agent
        │   ├── MyVehicles.js          # Liste véhicules
        │   └── VehicleListingForm.js  # Formulaire véhicule
        ├── pages/
        │   ├── AdminDashboard.js      # Dashboard admin
        │   ├── Dashboard.js           # Dashboard prestataire
        │   ├── CustomerDashboard.js   # Dashboard client
        │   └── ...
        └── data/
            └── guineaLocations.js     # Données régions/villes
```

### Schéma Base de Données
- **users:** profession inclut AgentImmobilier, Camionneur, Tracteur, Voiture
- **rentals:** documents optionnels (titre_foncier, seller_id_document, registration_ministere, documents_additionnels)
- **sales:** documents légaux requis
- **vehicles:** pour les prestataires véhicules
- **chat_messages:** filtrage du contenu

### Endpoints API Clés
- `POST/GET /api/property-sales` - CRUD ventes
- `POST /api/property-sales/{id}/upload-document/{type}` - Upload documents vente
- `POST /api/rentals/{id}/upload-document/{type}` - Upload documents location
- `GET /api/admin/rentals` - Locations avec documents (admin)
- `GET /api/property-sales` - Ventes avec documents

---

## Changelog

### 2026-01-11 - Ventes et Documents
- ✅ Implémenté formulaire de vente 2 étapes (PropertySaleForm.js)
- ✅ Ajouté section documents au formulaire de location (RentalListingForm.js) 
- ✅ MyPropertySales affiche liens vers documents
- ✅ MyRentals affiche liens vers documents
- ✅ Admin Dashboard: nouvel onglet Ventes avec détails et documents légaux
- ✅ Admin peut voir tous les documents des locations et ventes
- ✅ Tests backend (20 tests - 100% passés)
- ✅ Tests frontend UI validés

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

### P2 - Futur  
- [ ] Flux OTP simulé
- [ ] Intégration Mobile Money

### Refactoring Suggéré
- [ ] Diviser Dashboard.js en composants par type de prestataire
- [ ] Internationalisation avec i18next
