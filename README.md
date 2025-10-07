# 🎮 Tank.io

<div align="center">

![Tank.io Banner](https://img.shields.io/badge/Tank.io-Multiplayer_Battle-orange?style=for-the-badge&logo=battle.net)

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?style=flat-square&logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)](https://github.com/Thomas-TP/Tank.io)

**Un jeu de combat de tanks multijoueur en temps réel avec IA avancée, système de comptes synchronisé et support mobile complet**

[🎯 Démo](#-démonstration) • [🚀 Installation](#-installation-rapide) • [📖 Documentation](#-documentation-complète) • [🎮 Fonctionnalités](#-fonctionnalités)

</div>

---

## 📋 Table des Matières

- [À propos](#-à-propos)
- [Démonstration](#-démonstration)
- [Fonctionnalités](#-fonctionnalités)
- [Installation Rapide](#-installation-rapide)
- [Architecture](#-architecture)
- [Modes de Jeu](#-modes-de-jeu)
- [Système de Comptes](#-système-de-comptes)
- [Contrôles](#-contrôles)
- [Documentation Complète](#-documentation-complète)
- [Contribution](#-contribution)
- [Licence](#-licence)

---

## 🎯 À propos

**Tank.io** est un jeu de combat de tanks multijoueur en temps réel développé avec **Node.js**, **Socket.IO** et **HTML5 Canvas**. Le projet implémente une architecture client-serveur authoritative avec prédiction côté client pour une expérience de jeu fluide même avec de la latence réseau.

### 🌟 Points Forts

- **🤖 IA Professionnelle** - 4 niveaux de difficulté avec FSM (Finite State Machine)
- **🌐 Multijoueur en Temps Réel** - Synchronisation serveur avec client-side prediction
- **💾 Comptes Synchronisés** - Système d'authentification multi-appareils
- **📱 Support Mobile** - Contrôles tactiles (joystick virtuel) et design responsive
- **🗺️ 6 Maps Différentes** - Chacune avec mécaniques uniques (téléporteurs, zones dangereuses, obstacles destructibles)
- **⚡ Power-ups** - Speed Boost, Shield, Triple Shot
- **🎵 Audio Immersif** - Effets sonores et musique de fond

---

## 🎬 Démonstration

### Capture d'écran du Jeu

```
┌─────────────────────────────────────────────────────┐
│  🎮 Tank.io - Guerre des Tanks                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│   [Tank Bleu] ←→ Combat ←→ [Tank Rouge]            │
│        💨                           🛡️              │
│   Obstacles:  ██  ██  ██                            │
│   Projectiles: • • • →                              │
│                                                     │
│   Score: 2-1  |  Temps: 01:23  |  Niveau: 3        │
└─────────────────────────────────────────────────────┘
```

### Modes de Jeu

| Mode | Description | Joueurs |
|------|-------------|---------|
| 🤺 **PvP** | Combat local 2 joueurs | 2 |
| 🤖 **vs IA** | Affrontez l'IA (4 difficultés) | 1 |
| 🌐 **LAN** | Multijoueur en réseau local | 2+ |

---

## ✨ Fonctionnalités

### 🎮 Gameplay

- ✅ **Combat en temps réel** avec détection de collision précise
- ✅ **6 maps uniques** avec mécaniques spéciales
- ✅ **Power-ups dynamiques** : Vitesse, Bouclier, Triple Tir
- ✅ **Système de scoring** avec timer et rounds
- ✅ **Effets visuels** : Traînées de projectiles, screen shake, particules

### 🤖 Intelligence Artificielle

```javascript
Difficulté      │ Précision │ Vitesse │ Comportement
────────────────┼───────────┼─────────┼─────────────────────
Facile          │   70%     │  0.8x   │ Basique
Moyen           │   85%     │  1.0x   │ Stratégique
Difficile       │   95%     │  1.2x   │ Agressif
Impossible      │  99.5%    │  1.5x   │ Parfait + Prédiction
```

**FSM States :** PATROL → CHASE → ATTACK → EVADE → COLLECT_POWERUP

### 💾 Système de Comptes

- ✅ **Authentification sécurisée** (SHA-256)
- ✅ **Multi-appareils** : Connectez-vous depuis n'importe où
- ✅ **Statistiques complètes** : Victoires, défaites, meilleur score
- ✅ **Historique des matchs** : 50 dernières parties sauvegardées
- ✅ **Mode invité** : Jouez sans compte

### 📱 Support Mobile

- ✅ **Design responsive** : Adapté à tous les écrans
- ✅ **Contrôles tactiles** : Joystick virtuel + bouton de tir
- ✅ **Détection intelligente** : Joystick uniquement sur mobiles/tablettes
- ✅ **Optimisations** : Limites d'entités, FPS tracking

---

## 🚀 Installation Rapide

### Prérequis

- **Node.js** 14.x ou supérieur ([Télécharger](https://nodejs.org/))
- **npm** 6.x ou supérieur
- Navigateur moderne (Chrome, Firefox, Safari, Edge)

### Étapes d'Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/Thomas-TP/Tank.io.git
cd Tank.io

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur
npm start
```

### Accès au Jeu

Le serveur affichera les adresses disponibles :

```
✅ Serveur démarré sur le port 3000
📡 Adresse locale: http://localhost:3000
🌐 Adresse LAN: http://192.168.x.x:3000
```

**Sur le même PC :** Ouvrez http://localhost:3000  
**Sur un autre appareil (même réseau) :** Utilisez l'adresse LAN affichée

---

## 🏗️ Architecture

### Stack Technique

```
┌─────────────────────────────────────────────────┐
│                 CLIENT SIDE                     │
│  ┌──────────────────────────────────────────┐   │
│  │  HTML5 Canvas (800x600)                  │   │
│  │  - Rendering Engine                      │   │
│  │  - Client-Side Prediction                │   │
│  │  - Input Handler                         │   │
│  └──────────────────────────────────────────┘   │
│                      ↕                          │
│              WebSocket (Socket.IO)              │
│                      ↕                          │
│  ┌──────────────────────────────────────────┐   │
│  │  SERVER SIDE (Node.js + Express)         │   │
│  │  - Authoritative Game State              │   │
│  │  - Physics & Collision                   │   │
│  │  - Input Validation                      │   │
│  │  - Player Reconciliation                 │   │
│  │  - REST API (Accounts)                   │   │
│  └──────────────────────────────────────────┘   │
│                      ↕                          │
│  ┌──────────────────────────────────────────┐   │
│  │  DATABASE (accounts.json)                │   │
│  │  - User Accounts                         │   │
│  │  - Statistics                            │   │
│  │  - Match History                         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Fichiers Principaux

```
tank.io/
├── 📄 server.js              # Serveur Node.js + API REST
├── 📄 game.js                # Logique du jeu côté client
├── 📄 account-system.js      # Système d'authentification
├── 📄 index.html             # Interface utilisateur
├── 📄 style.css              # Styles + responsive design
├── 📂 sounds/                # Effets sonores
├── 📄 accounts.json          # Base de données (auto-généré)
└── 📄 package.json           # Dépendances npm
```

---

## 🎮 Modes de Jeu

### 1️⃣ PvP Local (Player vs Player)

Combat à 2 joueurs sur le même clavier.

**Contrôles :**
- **Joueur 1 (Bleu)** : ZQSD + Souris pour viser/tirer
- **Joueur 2 (Rouge)** : Flèches + Entrée pour tirer

**Objectif :** Être le premier à atteindre 3 victoires

---

### 2️⃣ vs IA (Player vs AI)

Affrontez une intelligence artificielle avec 4 niveaux de difficulté.

**Caractéristiques :**
- 🟢 **Facile** : IA basique, idéale pour débuter
- 🟡 **Moyen** : IA stratégique, évite les obstacles
- 🟠 **Difficile** : IA agressive, utilise les power-ups
- 🔴 **Impossible** : IA parfaite avec prédiction des mouvements

**Comportements :**
```javascript
- PATROL    : Exploration de la map
- CHASE     : Poursuite du joueur
- ATTACK    : Tir sur le joueur
- EVADE     : Esquive des projectiles
- COLLECT   : Ramassage des power-ups
```

---

### 3️⃣ LAN (Multijoueur)

Jouez en réseau local avec vos amis.

**Configuration :**
1. Le **serveur** démarre et affiche son IP LAN
2. Les **clients** se connectent via cette IP
3. Matchmaking automatique (file d'attente)
4. Serveur authoritative (pas de triche possible)

**Technologies :**
- **Socket.IO** : Communication temps réel
- **Client-Side Prediction** : Latence compensée
- **Server Reconciliation** : Correction des désynchronisations

---

## 🗺️ Les 6 Maps

| Map | Thème | Mécaniques Spéciales |
|-----|-------|---------------------|
| 🏜️ **Desert Storm** | Désert | Obstacles classiques |
| 🏙️ **Urban Warfare** | Ville | Nombreux bâtiments |
| ❄️ **Arctic Base** | Arctique | Téléporteurs |
| 🌲 **Forest Arena** | Forêt | Zones de dégâts |
| 🏭 **Industrial Zone** | Usine | Obstacles destructibles |
| 🌋 **Volcanic Valley** | Volcan | Lave + téléporteurs |

**Sélection :** Choisissez votre map avant chaque partie

---

## 💾 Système de Comptes

### Création de Compte

```javascript
// Inscription
Pseudo : votre_pseudo
Email : optionnel
Mot de passe : ••••••••

→ Compte créé et synchronisé sur le serveur
```

### Connexion Multi-Appareils

```
PC (Création)          Mobile (Connexion)        Tablette (Connexion)
     ↓                        ↓                          ↓
  Serveur ←───────────────────────────────────────────→ Sync
     ↓
accounts.json (Base de données)
```

**Avantages :**
- ✅ Accès depuis n'importe quel appareil
- ✅ Statistiques synchronisées en temps réel
- ✅ Historique des matchs sauvegardé
- ✅ Session persistante (7 jours)

### Statistiques Disponibles

```javascript
{
  wins: 15,              // Victoires totales
  losses: 8,             // Défaites totales
  bestScore: 1250,       // Meilleur score
  gamesPlayed: 23,       // Parties jouées
  totalKills: 42,        // Kills totaux
  totalDeaths: 18        // Morts totales
}
```

---

## 🎯 Contrôles

### 🖥️ PC / Laptop

#### Joueur 1 (Bleu)
| Action | Touche |
|--------|--------|
| Avancer | Z |
| Reculer | S |
| Gauche | Q |
| Droite | D |
| Viser | Souris |
| Tirer | Clic Gauche |

#### Joueur 2 (Rouge)
| Action | Touche |
|--------|--------|
| Avancer | ↑ |
| Reculer | ↓ |
| Gauche | ← |
| Droite | → |
| Pivoter Gauche | , |
| Pivoter Droite | . |
| Tirer | Entrée |

### 📱 Mobile / Tablette

```
┌─────────────────────────────────────┐
│                                     │
│        [Écran de jeu]               │
│                                     │
│                                     │
│  ╔═══╗                      ┌───┐  │
│  ║ ◉ ║  Joystick           │ 💥 │  │
│  ╚═══╝  (Mouvement)         └───┘  │
│                            (Tir)    │
└─────────────────────────────────────┘
```

- **Joystick gauche** : Déplacements (360°)
- **Bouton droit** : Tir

---

## ⚡ Power-ups

### Types Disponibles

| Power-up | Durée | Effet |
|----------|-------|-------|
| 💨 **Speed Boost** | 10s | Vitesse x1.5 |
| 🛡️ **Shield** | 5s | Invincibilité |
| 🔫 **Triple Shot** | 15s | 3 projectiles simultanés |

**Apparition :** Aléatoire toutes les 15-30 secondes  
**Stratégie :** Contrôlez les power-ups pour dominer la partie

---

## 📖 Documentation Complète

Pour une documentation technique complète, consultez :

- 📄 [MULTI_DEVICE_UPDATE.md](MULTI_DEVICE_UPDATE.md) - Guide multi-appareils et API
- 📄 [MOBILE_FEATURES.md](MOBILE_FEATURES.md) - Fonctionnalités mobiles et optimisations

### API REST Endpoints

```http
POST /api/register      # Créer un compte
POST /api/login         # Se connecter
POST /api/verify-session  # Vérifier un token
POST /api/logout        # Se déconnecter
POST /api/update-stats  # Synchroniser les stats
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment participer :

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Guidelines

- 📝 Code commenté en français
- ✅ Tests unitaires si possible
- 📖 Documentation des nouvelles fonctionnalités
- 🎨 Respect du style de code existant

---

## 🐛 Bugs Connus & Solutions

| Bug | Solution |
|-----|----------|
| ❌ Session expirée | Reconnectez-vous avec votre pseudo/mot de passe |
| ❌ Joystick sur desktop | Normal, uniquement pour mobiles/tablettes |
| ❌ Lag en LAN | Vérifiez votre connexion réseau et le pare-feu |
| ❌ Audio ne démarre pas | Cliquez sur la page (politique navigateur) |

---

## 📜 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **Socket.IO** - Communication temps réel
- **Express** - Framework serveur
- **Mixkit** - Effets sonores
- **Google Fonts** - Police Roboto Mono

---

## 📞 Contact

**Développeur :** Thomas-TP  
**GitHub :** [@Thomas-TP](https://github.com/Thomas-TP)  
**Projet :** [Tank.io](https://github.com/Thomas-TP/Tank.io)

---

<div align="center">

**⭐ N'oubliez pas de mettre une étoile si vous aimez le projet ! ⭐**

Made with ❤️ by Thomas-TP

</div>
