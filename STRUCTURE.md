# 📁 Structure du Projet Tank.io

## 🗂️ Organisation des Fichiers

```
tank.io/
│
├── 📂 public/                      # Fichiers publics (client-side)
│   ├── 📂 css/
│   │   └── style.css              # Styles du jeu
│   │
│   ├── 📂 js/
│   │   ├── 📂 ai/                 # Intelligence Artificielle
│   │   │   ├── ai-pro.js          # IA avancée avec comportements
│   │   │   └── ai-steering.js     # Algorithmes de pathfinding
│   │   │
│   │   ├── 📂 network/            # Réseau et multijoueur
│   │   │   ├── multiplayer.js     # Client multijoueur Socket.IO
│   │   │   └── multiplayer-pro.js # Version professionnelle (archive)
│   │   │
│   │   ├── account-system.js      # Système de comptes (client)
│   │   └── game.js                # Logique principale du jeu
│   │
│   └── index.html                 # Page HTML principale
│
├── 📂 server/                      # Fichiers serveur (back-end)
│   ├── server.js                  # Serveur Express + Socket.IO
│   └── accounts.json              # Base de données des comptes
│
├── 📂 docs/                        # Documentation
│   ├── 📂 archive/                # Anciens fichiers (backup)
│   │   ├── multiplayer-old.js
│   │   ├── server-old.js
│   │   └── server-pro.js
│   │
│   ├── GUIDE_HACKMD.md            # Guide complet (HackMD)
│   ├── PUBLICATION_SUCCESS.md     # Récapitulatif publication GitHub
│   ├── ARCHITECTURE-PRO.md        # Architecture technique
│   ├── MOBILE_FEATURES.md         # Fonctionnalités mobiles
│   ├── MULTI_DEVICE_UPDATE.md     # Système multi-appareils
│   ├── MAPS.md                    # Documentation des maps
│   ├── POWERUPS.md                # Documentation power-ups
│   ├── AI-IMPROVEMENTS.md         # Améliorations IA
│   ├── AUDIO-VISUAL.md            # Audio & visuels
│   ├── BUGFIXES.md                # Corrections de bugs
│   └── ... (autres docs)
│
├── 📂 node_modules/                # Dépendances npm (ignoré git)
│
├── .gitignore                      # Fichiers ignorés par Git
├── LICENSE                         # Licence MIT
├── README.md                       # Documentation principale
├── package.json                    # Configuration npm
├── package-lock.json               # Verrouillage des dépendances
└── STRUCTURE.md                    # Ce fichier

```

---

## 🎯 Description des Dossiers

### 📂 `public/`
**Rôle :** Tous les fichiers accessibles par le client (navigateur)

- **`css/`** : Styles CSS
  - Design responsive
  - Animations
  - Interface utilisateur

- **`js/`** : Scripts JavaScript client
  - **`ai/`** : Intelligence artificielle
    - `ai-pro.js` : Comportements IA (facile, moyen, difficile, imbattable)
    - `ai-steering.js` : Pathfinding et steering behaviors
  
  - **`network/`** : Communication réseau
    - `multiplayer.js` : Client Socket.IO pour le multijoueur LAN
    - `multiplayer-pro.js` : Version archivée
  
  - `account-system.js` : Gestion des comptes utilisateur côté client
  - `game.js` : Boucle de jeu, rendu canvas, logique gameplay

- **`index.html`** : Point d'entrée de l'application

---

### 📂 `server/`
**Rôle :** Back-end Node.js + Express + Socket.IO

- **`server.js`** : 
  - Serveur HTTP/WebSocket
  - API REST pour les comptes
  - Logique serveur authoritative
  - Synchronisation multijoueur

- **`accounts.json`** :
  - Base de données JSON
  - Comptes utilisateurs
  - Sessions actives
  - Statistiques

---

### 📂 `docs/`
**Rôle :** Documentation complète du projet

- **Guides principaux :**
  - `GUIDE_HACKMD.md` : Guide complet avec illustrations
  - `README.md` : Documentation GitHub principale
  - `ARCHITECTURE-PRO.md` : Architecture technique détaillée

- **Fonctionnalités :**
  - `MOBILE_FEATURES.md` : Support mobile et tactile
  - `MULTI_DEVICE_UPDATE.md` : Synchronisation multi-appareils
  - `MAPS.md` : Documentation des 6 maps
  - `POWERUPS.md` : Power-ups et gameplay

- **Archive :**
  - Anciennes versions des fichiers
  - Backups avant refactoring

---

## 🚀 Commandes

### Démarrage
```bash
# Installation
npm install

# Lancer le serveur
npm start

# Mode développement (auto-reload)
npm run dev
```

### Accès
- **Local :** http://localhost:3000
- **LAN :** http://[VOTRE_IP]:3000

---

## 🔧 Configuration

### Port du serveur
Par défaut : `3000`

Modifier dans `server/server.js` :
```javascript
const PORT = 3000;
```

### Chemins des fichiers statiques
Le serveur sert automatiquement les fichiers depuis `public/` :
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```

---

## 📦 Dépendances

### Production
- **express** : Framework web Node.js
- **socket.io** : Communication WebSocket temps réel

### Développement
- **nodemon** : Auto-reload du serveur

---

## 🔒 Fichiers Ignorés par Git

- `node_modules/` : Dépendances npm
- `server/accounts.json` : Base de données locale
- `.env` : Variables d'environnement
- `docs/archive/` : Anciens fichiers

---

## 📈 Évolution du Projet

### v1.0 - Initial
- Jeu tank local 2 joueurs
- Maps simples

### v2.0 - Multijoueur
- Socket.IO intégré
- Mode LAN
- Client-Side Prediction

### v3.0 - Comptes & Mobile
- Système de comptes multi-appareils
- Support mobile (joystick)
- Design responsive
- API REST

### v3.1 - Organisation (Actuel)
- ✅ Structure professionnelle
- ✅ Dossiers organisés
- ✅ Documentation complète
- ✅ Séparation client/serveur

---

## 🎨 Architecture

```
Client (Browser)          Server (Node.js)
┌─────────────┐          ┌─────────────┐
│             │          │             │
│  index.html │◄────────►│  server.js  │
│             │  HTTP    │             │
│   game.js   │          │  Express    │
│             │          │             │
│   Socket    │◄────────►│  Socket.IO  │
│   Client    │  WS      │   Server    │
│             │          │             │
│  account-   │          │  accounts   │
│  system.js  │◄────────►│  .json      │
│             │  REST    │             │
└─────────────┘          └─────────────┘
```

---

## ✅ Avantages de la Nouvelle Structure

### 🎯 Clarté
- Séparation client/serveur
- Fichiers groupés par fonction
- Navigation intuitive

### 🔒 Sécurité
- Fichiers sensibles dans `server/`
- Base de données non exposée
- `.gitignore` mis à jour

### 📚 Maintenabilité
- Code modulaire
- Documentation centralisée
- Archive des anciennes versions

### 🚀 Performance
- Chargement optimisé
- Fichiers statiques servis efficacement
- Structure scalable

---

## 🔗 Liens Utiles

- **GitHub :** https://github.com/Thomas-TP/Tank.io
- **README :** [README.md](../README.md)
- **Guide Complet :** [GUIDE_HACKMD.md](GUIDE_HACKMD.md)

---

<div align="center">

**📁 Structure organisée le 7 octobre 2025**

Made with ❤️ by Thomas-TP

</div>
