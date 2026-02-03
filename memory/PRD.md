# ServisPro - Plateforme de Services en Guinée

## Énoncé du Problème Original
Construire une plateforme nommée "ServisPro" pour les prestataires de services et clients en Guinée. La plateforme nécessite des rôles utilisateurs distincts (Prestataire, Client, Admin, Entreprise), la gestion des profils, la vérification d'identité et de documents, les annonces de location et vente, les demandes de service et un système de notation.

## Dernière mise à jour - 3 Février 2026

### Nouvelles fonctionnalités - 3 Février 2026

1. **Admin peut modifier le "À propos" des prestataires**
   - Nouveau bouton "Modifier" à côté de la section "À propos" dans les détails prestataire
   - Modal de modification avec textarea et compteur de caractères
   - Validation : minimum 10 caractères
   - Endpoint : `PUT /api/admin/providers/{provider_id}/about`
   - Fichiers modifiés :
     - `/app/backend/server.py` - Endpoint déjà créé dans session précédente
     - `/app/frontend/src/pages/AdminDashboard.js` - UI modal et bouton ajoutés

2. **Amélioration du son de notification**
   - Volume augmenté (0.7 au lieu de 0.4)
   - Son à deux bips plus distinct (880Hz -> 1047Hz)
   - Logs de debug ajoutés pour diagnostiquer les problèmes
   - Fichier modifié : `/app/frontend/src/components/NotificationBell.js`

3. **Confirmation : Photos des prestataires fonctionnelles**
   - Les photos s'affichent correctement dans la liste et les détails (admin et browse)
   - Les prestataires sans photo uploadée affichent leurs initiales
   - Note : La plupart des prestataires n'ont pas uploadé de photo

4. **Prestataire peut modifier son profil (NOUVEAU)**
   - Nouveau bouton "Modifier mon profil" sur la page profil du prestataire (visible uniquement pour le propriétaire)
   - Modal d'édition complet avec les sections :
     - Photo de profil (upload avec aperçu)
     - Informations personnelles (prénom, nom)
     - À propos de moi (textarea avec validation min 20 caractères)
     - Localisation (région, ville, commune, quartier)
     - Expérience (dropdown avec options)
     - Disponibilité (switch on/off)
   - Endpoints utilisés :
     - `PUT /api/profile/me` - Mise à jour des données
     - `POST /api/profile/upload-picture` - Upload photo de profil
   - Fichiers créés/modifiés :
     - `/app/frontend/src/components/ProviderProfileEdit.js` - Nouveau composant modal
     - `/app/frontend/src/pages/ProviderProfile.js` - Intégration du bouton et modal
     - `/app/backend/server.py` - Ajout des champs region, ville, commune, quartier, years_experience au modèle ProfileUpdate

### Fonctionnalités - 31 Janvier 2026

1. **Gestion des documents par le prestataire**
   - Le prestataire peut ajouter de nouveaux documents (max 10)
   - Le prestataire peut supprimer ses propres documents
   - Formats acceptés : PDF, DOC, DOCX, JPG, PNG (max 10 Mo)
   - Nouveaux endpoints API :
     - `POST /api/providers/{id}/documents` - Ajouter un document
     - `DELETE /api/providers/{id}/documents/{index}` - Supprimer un document
   - Fichiers modifiés :
     - `/app/backend/server.py` - Nouveaux endpoints
     - `/app/frontend/src/pages/ProviderProfile.js` - UI de gestion

2. **Terminologie Frais différenciée**
   - **Location immobilière** : "Frais de visite" (avec icône maison)
   - **Autres services** : "Frais de déplacement" (avec icône camion)
   - Le composant `ServiceFeesDisplay` accepte maintenant `isRental` prop
   - Fichiers modifiés :
     - `/app/frontend/src/components/ServiceFeesDisplay.js`
     - `/app/frontend/src/components/VisitRequestForm.js`
     - `/app/frontend/src/components/InvestigationFeePopup.js`

### Mise à jour des communes de Conakry - 3 Février 2026

Les 13 communes officielles de Conakry ont été ajoutées avec leurs quartiers respectifs :

| # | Commune | Quartiers principaux |
|---|---------|---------------------|
| 1 | Kaloum (Centre-ville) | Sandervalia, Almamya, Manquépas, Boulbinet, Coronthie |
| 2 | Dixinn | Landréah, Camayenne, Minière, Belle-vue, Hafia, Dixinn-port |
| 3 | Matam | Madina Marché, Matam Centre, Bonfi, Coléah, Touguiwondy |
| 4 | Ratoma | Kipé, Kaporo, Hamdallaye, Koloma |
| 5 | Matoto | Matoto Marché, Béanzin, Kissosso, Sangoyah |
| 6 | Kassa (Îles de Loos) | Île de Kassa, Île de Room, Île de Fotoba |
| 7 | Gbessia (nouvelle) | Gbessia Cité 1/2/3, Dabondy, Zone Aéroport |
| 8 | Tombolia (nouvelle) | Tombolia, Dabompa, Entag |
| 9 | Lambanyi (nouvelle) | Lambanyi, Nongo-Taady, Nassouroulaye, Waréah, Simbaya Gare |
| 10 | Sonfonia (nouvelle) | Sonfonia Gare 1/2, Sonfonia Centre, Kobaya, Yattaya Fossidet |
| 11 | Kagbelen (extraite de Dubréka) | Kagbelen Plateau, Kènendé, Keitayah |
| 12 | Manéah (extraite de Coyah) | Bentouraya, Friguiyadi, Gomboya |
| 13 | Sanoyah (extraite de Coyah) | Sanoyah, Lansanayah |

**Fichier modifié** : `/app/frontend/src/data/guineaLocations.js`

### Bug corrigé : Documents non visibles (P0)
- **Problème** : Les documents téléchargés par les prestataires n'étaient pas visibles sur le profil public ni dans le tableau de bord admin.
- **Cause** : Conflit CSS avec le wrapper de debug d'Emergent.
- **Solution** : Utiliser `<div>` avec `onClick` au lieu de `<a>` tags.
- **Statut** : ✅ Corrigé et testé

### Modifications UI/UX - 31 Janvier 2026
1. **Visibilité des sections sur le profil prestataire**
   - Les clients ne voient plus les sections "Catégorie" et "Documents"
   - Seul le prestataire propriétaire peut voir et gérer ses documents

## Personas Utilisateurs
1. **Prestataires de Services** - Professionnels offrant divers services (8 catégories)
2. **Agents Immobiliers (Propriétaire Immobilier)** - Gestion des locations et ventes de propriétés
3. **Clients** - Recherche et réservation de services
4. **Entreprises** - Sociétés avec documents légaux (RCCM, NIF, Licence)
5. **Administrateurs** - Gestion de la plateforme

## Catégories de Prestataires
- Électromécanicien
- Mécanicien
- Plombier
- Maçon
- Menuisier
- Propriétaire immobilier
- Soudeur
- Autres Métiers

**Note:** Les catégories "Logisticien", "Camionneur", "Tracteur", "Voiture" ont été supprimées (2026-01-24).

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

### Fonctionnalités Entreprise
- ✅ Inscription en 2 étapes (informations + documents)
- ✅ Connexion via numéro RCCM + mot de passe
- ✅ Upload de documents : Licence d'exploitation, RCCM, NIF, Attestation fiscale, Logo
- ✅ Validation obligatoire par l'admin avant activation
- ✅ Publication de services (après approbation)
- ✅ Publication d'offres d'emploi (après approbation)
- ✅ **Entreprises Immobilières peuvent poster des locations** (comme Agent Immobilier)
- ✅ **Entreprises Immobilières peuvent poster des ventes** (comme Agent Immobilier)

### Système de Paiement & Notifications
- ✅ **Tarif d'Investigation** remplace "Frais de Transport"
- ✅ **Popup de paiement** avant demande de service avec bannière et conditions
- ✅ **Conditions affichées** : Non remboursable si prestataire présent, 100% remboursé sinon
- ✅ **Paiement Mobile Money** (Orange Money, MTN MoMo) - MODE SIMULATION
- ✅ **Système de Notifications** dans l'application
- ✅ Icône 🔔 avec badge pour notifications non lues
- ✅ Types de notifications : paiement reçu, demande de service, etc.

### Ventes Immobilières & Landing Page (NOUVEAU)
- ✅ **Section "Propriétés à Vendre"** sur la page d'accueil
- ✅ **Affichage des propriétés approuvées uniquement**
- ✅ **Bouton "Contacter"** sur chaque carte de propriété
- ✅ **Modal de demande d'achat** avec formulaire complet

### Admin
- ✅ Vue de tous les documents pour les locations
- ✅ Vue de tous les documents pour les ventes
- ✅ Vue de tous les documents des entreprises
- ✅ Approbation/Rejet des entreprises
- ✅ **Approbation/Rejet des annonces de location**
- ✅ **Approbation/Rejet des ventes immobilières**
- ✅ **Gestion des demandes d'achat immobilier** (Demandes Immobilier)

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
        │   ├── AdminSalesManager.js   # Gestion ventes véhicules + demandes immo
        │   └── ...
        ├── pages/
        │   ├── AdminDashboard.js      # Dashboard admin
        │   ├── CompanyDashboard.js    # Dashboard entreprise
        │   ├── Dashboard.js           # Dashboard prestataire
        │   ├── LandingPage.js         # Page d'accueil avec propriétés
        │   └── ...
        └── data/
            └── guineaLocations.js     # Données régions/villes
```

### Schéma Base de Données
- **users:** Prestataires individuels
- **customers:** Clients
- **companies:** Entreprises avec documents
- **company_services:** Services des entreprises
- **company_job_offers:** Offres d'emploi des entreprises
- **rentals:** Locations avec documents
- **property_sales:** Ventes de propriétés avec documents et status
- **property_inquiries:** Demandes d'achat immobilier (NOUVEAU)
- **vehicle_sales:** Ventes de véhicules
- **vehicle_inquiries:** Demandes d'achat véhicules

### Endpoints API Clés - Ventes Immobilières
- `GET /api/property-sales` - Liste des ventes approuvées (public)
- `GET /api/admin/property-sales` - Toutes les ventes (admin)
- `PUT /api/admin/property-sales/{id}/approve` - Approuver une vente
- `PUT /api/admin/property-sales/{id}/reject` - Rejeter une vente
- `PUT /api/admin/property-sales/{id}/sold` - Marquer comme vendue
- `POST /api/property-sales/{id}/inquiries` - Créer une demande d'achat
- `GET /api/admin/property-inquiries` - Liste des demandes (admin)
- `PUT /api/admin/property-inquiries/{id}` - Mettre à jour une demande

---

## Changelog

### 2026-01-25 - Affichage Documents Admin + Notifications Approbation
- ✅ **Affichage des documents pour l'admin** :
  - Admin peut voir tous les documents uploadés pour les ventes immobilières (Titre Foncier, Document Ministère de l'Habitat, Document du Bâtiment, Pièce d'Identité Vendeur, Documents Additionnels)
  - Admin peut voir tous les documents uploadés pour les locations (mêmes types de documents)
  - Section "Documents Légaux" avec icônes vertes pour documents présents et indication "Non fourni" pour documents manquants
  - Liens cliquables pour ouvrir les documents dans un nouvel onglet
- ✅ **Système de notifications pour approbations/rejets/suppressions** :
  - Notification envoyée au propriétaire lors de l'approbation d'une vente
  - Notification envoyée au propriétaire lors du rejet d'une vente (avec raison)
  - Notification envoyée au propriétaire lors de la suppression d'une vente
  - Notification envoyée au propriétaire lors de l'approbation d'une location
  - Notification envoyée au propriétaire lors du rejet d'une location (avec raison)
  - Notification envoyée au propriétaire lors de la suppression d'une location
- ✅ **Tests** : 5/5 fonctionnalités frontend vérifiées avec succès (iteration_10.json)

### 2026-01-24 - "Mot de passe oublié" + Suppression de Catégories + Autres Métiers
- ✅ **Fonctionnalité "Mot de passe oublié"** pour les prestataires et clients :
  - Composant ForgotPassword.js avec flux en 3 étapes (téléphone → OTP → nouveau mot de passe)
  - Backend endpoints : POST /api/auth/forgot-password, POST /api/auth/reset-password
  - OTP stocké en mémoire avec expiration de 10 minutes
  - Lien visible sur les pages de connexion /auth et /customer/auth
- ✅ **Suppression des catégories** : Logisticien, Camionneur, Tracteur, Voiture
  - Supprimé du backend (ProfessionType enum)
  - Supprimé de tous les fichiers frontend (AuthPage, LandingPage, BrowseProviders, etc.)
  - 7 catégories de prestataires au lieu de 11
- ✅ **Profession personnalisée pour "Autres Métiers"** :
  - Champ `custom_profession` ajouté au backend (RegisterInput, ProfileUpdate, ServiceProvider)
  - Champ texte visible lors de l'inscription quand "Autres" est sélectionné
  - Affichage de la profession personnalisée sur les pages BrowseProviders et ProviderProfile
- ✅ **Admin Dashboard amélioré** :
  - Suppression de l'onglet "Ventes Véhicules"
  - Ajout de l'onglet "Demandes Immobilier" avec upload de documents admin
  - Upload de documents pour les ventes immobilières (section Documents Admin)
- ✅ **Nouveau Dashboard Prestataire moderne** :
  - Design sombre avec glassmorphisme et dégradés
  - Section héro avec avatar, badges et statistiques visuelles
  - Cartes de demandes avec bordures colorées et effets hover
  - Navigation par onglets avec gradient actif
- ✅ **Nouvelle Page d'Accueil Client (CustomerHome.js)** :
  - Design mobile-first simple et convivial
  - Header avec logo ServisPro et localisation Conakry
  - Image héro avec illustration de professionnels africains
  - Barre de recherche "Rechercher un service ou un logement..."
  - 2 gros boutons: "Trouver un professionnel" et "Trouver une maison"
  - Catégories avec icônes rondes colorées (Électricien, Plombier, Mécanicien, Maçon, Location)
  - Menu de navigation en bas (Accueil, Demandes, Messages, Favoris)
- ✅ **Tests** : Backend et frontend fonctionnels

### 2026-01-19 - Système de Conversation Client-Admin pour Demandes d'Achat (NOUVEAU)
- ✅ **Connexion obligatoire** pour soumettre une demande d'achat
- ✅ **Onglet "Mes Demandes"** dans le dashboard client :
  - Liste des demandes avec statut (En attente, Contacté, Terminé)
  - Indicateur "Nouvelle réponse reçue"
  - Panneau de détails avec message client et réponse admin
- ✅ **Système de réponse admin** :
  - Champ "Répondre au Client" (visible par le client)
  - Champ "Notes Internes" (non visible par le client)
  - Notification automatique au client lors de réponse
- ✅ **Tests** : 16 tests backend + tests UI - 100% passés

### 2026-01-19 - Ventes Immobilières & Demandes d'Achat
- ✅ **Ventes immobilières sur Landing Page** :
  - Section "Propriétés à Vendre" sur la page d'accueil
  - Affiche uniquement les propriétés approuvées par l'admin
  - Cartes avec badge "Vérifié" et bouton "Contacter"
- ✅ **Système de demandes d'achat immobilier** :
  - Modal de demande sur la Landing Page
  - Champs : nom, téléphone, email, budget, mode de financement, message
  - Backend : endpoints POST /api/property-sales/{id}/inquiries
- ✅ **Gestion admin des demandes immobilières** :
  - Sous-onglet "Demandes Immobilier" dans AdminSalesManager
  - Liste des demandes avec badge de statut
  - Détails : info acheteur, propriété demandée, agent immobilier
  - Actions : "Marquer Contacté", "Marquer Terminé"
  - Notes admin pour suivi des conversations
- ✅ **Tests** : 15 tests backend + tests UI - 100% passés

### 2026-01-17 - Vente de Véhicules
- ✅ Nouvelle fonctionnalité : prestataires véhicules peuvent vendre leurs véhicules
- ✅ Backend : endpoints POST/GET/PUT pour créer, lister et gérer les ventes
- ✅ Frontend Provider : onglets "Mes Ventes" et "+ Vendre" dans le dashboard véhicule
- ✅ Frontend Admin : onglet "Ventes Véhicules" avec gestion Approuver/Rejeter/Vendu
- ✅ Composants créés : VehicleSaleForm.js, MyVehicleSales.js, AdminSalesManager.js
- ✅ Conversations de vente gérées par l'admin
- ✅ Tests : 16 tests backend - 100% passés

### 2026-01-17 - Frais de Service par Profession
- ✅ Admin peut définir les frais par profession
- ✅ Interface Admin : Tableau éditable avec tous les métiers
- ✅ Affichage côté client et prestataire

### 2026-01-15 - Paramètres Admin: Commissions par Domaine
- ✅ Nouvelle structure de commissions par domaine (tous en pourcentage)
- ✅ Interface Admin Settings : 5 champs de pourcentage avec icônes

### 2026-01-13 - Approbation Admin des Locations
- ✅ Champ `approval_status` ajouté aux locations
- ✅ Admin peut approuver/rejeter les locations

### 2026-01-13 - Système de Paiement & Notifications
- ✅ Simulation Orange Money / MTN MoMo
- ✅ Système de notifications avec icône 🔔

### 2026-01-11 - Entreprises Immobilières
- ✅ Entreprises du secteur "Immobilier" peuvent poster locations et ventes

### 2026-01-11 - Espace Entreprise
- ✅ Inscription, connexion et dashboard entreprise

---

## Tâches Restantes

### P0 - Terminé
- [x] Approbation Admin des locations
- [x] Paramètres Admin: Commissions par Domaine
- [x] Vente de Véhicules
- [x] Ventes immobilières sur Landing Page
- [x] Système de demandes d'achat immobilier

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

### Admin
- **Username:** admin
- **Mot de passe:** admin123

### Agent Immobilier
- **Téléphone:** 6229998877
- **Mot de passe:** test123

### Prestataire Véhicule
- **Téléphone:** 6220001234
- **Mot de passe:** test123

### Client
- **Téléphone:** 6250001234
- **Mot de passe:** test123

### Entreprise Immobilière (approuvée)
- **RCCM:** IMMO123456
- **Mot de passe:** password123
