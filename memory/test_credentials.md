# Test Credentials

## Database Active
- Preview pointe actuellement sur : **`servispro_dev`** (basculement Feb 2026 pour tests Intérim)
- Production (`servispro_production`) reste intacte sur https://servisprogn.com

## Admin Accounts (hardcoded in config.py — fonctionnent sur toutes les BD)
- Username: servispro@servisprogn.com / Password: Servisproguinea2026#
- Username: herman.haba@servisprogn.com / Password: Servisproguinea2026$2027
- Username: barthelemy.haba@servisprogn.com / Password: DDraper2026Servisprogn
- Login URL: /admin

## Test Accounts — servispro_dev

### Entreprise (déjà créée)
- **Login** : 224620000001 / TestCompany2026!
- Statut : approved, boutique avec 2 produits
- URL connexion : `/company/auth`

### Entreprise démo Intérim (créée Feb 2026)
- **Login** : +224620200001 / BoutiqueDemo2026!
- Nom : **Boutique Demo Conakry**
- Secteur : Commerce général · Kaloum, Conakry
- Statut : approved
- **3 missions ouvertes** prêtes pour les prestataires test :
  - Électricien câblage boutique (250 000 GNF/jour, 3 jours, 1 place)
  - Agents de sécurité événement (120 000 GNF/jour, 2 jours, 2 places)
  - Plombier installation sanitaire (à négocier, 5 jours, 1 place)

### Client (déjà créé)
- **Login** : 224620000002 / TestClient2026!
- URL connexion : `/customer/auth`

### Prestataires (créés Feb 2026 pour tests Intérim)
- **Prestataire 1 — Mamadou Diallo (Électricien)**
  - Phone : +224620100001
  - Password : TestProvider2026!
  - Profession : Électricien — Conakry/Kaloum/Sandervalia
  - Tarif journalier : 200 000 GNF
  - `is_interim=true`, `verification_status=approved`

- **Prestataire 2 — Fatoumata Camara (Agent de sécurité)**
  - Phone : +224620100002
  - Password : TestProvider2026!
  - Profession : Agent de sécurité — Conakry/Ratoma/Lambanyi
  - Tarif journalier : 100 000 GNF
  - `is_interim=true`, `verification_status=approved`

- **Prestataire 3 — Ibrahima Sow (Plombier)**
  - Phone : +224620100003
  - Password : TestProvider2026!
  - Profession : Plombier — Conakry/Matam/Coleyah
  - Tarif journalier : 150 000 GNF
  - `is_interim=true`, `verification_status=approved`

- URL connexion : `/auth`
- Payload login (POST `/api/auth/login`) :
  ```json
  {"phone_number":"+224620100001","password":"TestProvider2026!","user_type":"provider"}
  ```

## Script de re-création
Si la BD dev est nettoyée, relancer :
```bash
cd /app/backend && python3 scripts/seed_test_providers.py
```
