# 🎮 TANK.IO - GUIDE COMPLET DES NOUVELLES FONCTIONNALITÉS

## 🗺️ SYSTÈME DE MAPS (6 ARÈNES)

### Maps Disponibles

1. **🏛️ Classique** - Map traditionnelle avec obstacles standards
2. **💥 Destructible** - Obstacles qui se détruisent après 3 coups
3. **🔥 Enfer de Lave** - Zones de lave qui infligent des dégâts continus
4. **🌊 Archipel** - Zones d'eau dangereuses
5. **🌀 Portails** - Téléporteurs pour se déplacer instantanément
6. **⚡ Chaos Total** - Combine TOUTES les mécaniques !

### Comment sélectionner une map ?
- Dans le menu principal, clique sur l'une des 6 maps
- Le bouton devient orange quand sélectionné
- Par défaut : **Classique**
- Change avant de démarrer la partie

---

## 💥 OBSTACLES DESTRUCTIBLES

### Mécaniques
- **3 points de vie** par obstacle
- Chaque projectile inflige **-1 HP**
- **Changement visuel** selon les dégâts :
  - 3 HP : Marron normal
  - 2 HP : Orange avec fissures
  - 1 HP : Rouge avec plus de fissures
  - 0 HP : **EXPLOSION** et disparition

### Stratégie
- Détruis les couvertures ennemies
- Crée des passages stratégiques
- Attention : tu peux aussi détruire ta propre couverture !
- **Tir Triple** = détruit 3 obstacles en un coup

---

## 🔥🌊 ZONES DANGEREUSES

### Types
- **Lave** (rouge/orange) : Dégâts de feu
- **Eau** (bleu) : Dégâts d'eau

### Mécaniques
- **-1 HP toutes les 0.5 secondes** dans la zone
- Timer indépendant par tank
- Particules colorées quand touché
- Reset automatique en sortant de la zone

### Stratégie
- **Bouclier** : Traverse sans dégâts ! (5s d'invincibilité)
- **Vitesse** : Traverse rapidement (x1.5 pendant 10s)
- Force l'ennemi dedans pour l'affaiblir
- Utilise comme barrière naturelle

---

## 🌀 TÉLÉPORTEURS

### Fonctionnement
- **4 portails** organisés en **2 paires**
- Collision = téléportation instantanée
- **Cooldown de 2 secondes** après téléportation
- Animation arc-en-ciel avec rotation
- 30 particules cyan à chaque téléport

### Paires (Map Portails)
- Portail Haut-Gauche ↔ Portail Bas-Droite
- Portail Haut-Centre ↔ Portail Bas-Centre

### Stratégie
- **Mobilité ultime** : apparaît derrière l'ennemi
- **Fuite rapide** : téléporte-toi en danger
- **Contrôle de zone** : campe près d'un portail
- ⚠️ L'ennemi peut te suivre immédiatement !
- Combine avec **Vitesse** pour dominer la map

---

## 🎁 POWER-UPS (Rappel)

### ⚡ Vitesse Boost (10 secondes)
- Vitesse x1.5
- Cyan avec icône ⚡
- Parfait pour traverser zones dangereuses

### 🛡️ Bouclier (5 secondes)
- Invincibilité totale
- Vert avec double cercle brillant
- Absorbe TOUS les dégâts (projectiles + zones + collisions)

### ⚔️ Tir Triple (1 tir)
- 3 projectiles en éventail (±15°)
- Magenta avec particules roses
- Détruit 3 obstacles destructibles

### Apparition
- **AUCUN** power-up au début
- Un power-up toutes les **8-12 secondes** (80% chance)
- Distribution progressive tout au long de la partie

---

## 🎯 COMBOS AVANCÉS

### Map-Specific
1. **Bouclier + Lave/Eau** = Traverse sans dégâts, piège l'ennemi
2. **Vitesse + Portails** = Mobilité absolue
3. **Tir Triple + Destructible** = Détruit tout le décor
4. **Vitesse + Chaos** = Seul moyen de survivre

### Power-up Stacking
- Tu peux avoir **Vitesse + Bouclier** en même temps !
- **Tank invincible ultra-rapide** = combo ultime
- Tir Triple reste actif jusqu'à utilisation

---

## 🏆 MODES DE JEU

### 👥 Joueur vs Joueur (PvP)
- Combat local à 2 joueurs
- Contrôles clavier uniquement
- Toutes les maps disponibles

### 🤖 Joueur vs IA
- 4 difficultés : Facile, Moyen, Difficile, **Imbattable**
- Contrôles souris (viser + tirer)
- L'IA collecte aussi les power-ups
- L'IA réagit aux téléporteurs et zones dangereuses

### 🌐 Jouer en LAN
- Multijoueur en réseau local
- Client-Side Prediction + Server Reconciliation
- Synchronisation parfaite des projectiles
- Toutes les maps supportées

---

## 📊 NIVEAUX DE DIFFICULTÉ

### Maps par Difficulté
- **Facile** : Classique ⭐
- **Moyen** : Destructible ⭐⭐
- **Difficile** : Lave, Eau ⭐⭐⭐
- **Expert** : Portails ⭐⭐⭐⭐
- **Extrême** : Chaos Total ⭐⭐⭐⭐⭐

### IA par Difficulté
- **Facile** : 85% précision, 70% esquive
- **Moyen** : 93% précision, 85% esquive
- **Difficile** : 98% précision, 95% esquive
- **Imbattable** : 99.5% précision, 98% esquive, tir ultra-rapide

---

## 🎨 VISUELS

### Obstacles Destructibles
- Couleur dynamique selon HP
- Fissures visuelles
- Bordure marron foncé

### Zones Dangereuses
- **Lave** : Gradient rouge/orange, bulles animées
- **Eau** : Gradient bleu, vagues sinusoïdales

### Téléporteurs
- Cercles concentriques arc-en-ciel
- Rotation continue
- Centre blanc brillant avec glow cyan

### Power-ups
- Animation de pulsation
- Ombre lumineuse colorée
- Icônes emoji

---

## 💻 ARCHITECTURE TECHNIQUE

### Système de Maps
```javascript
MAPS = {
  classic, destructible, lava, water, portal, chaos
}
```
Chaque map génère :
- Obstacles (destructibles ou non)
- Zones dangereuses (lave/eau)
- Téléporteurs (paires liées)

### Classes Ajoutées
- `Obstacle(x, y, width, height, destructible)`
- `HazardZone(x, y, width, height, type)`
- `Teleporter(x, y, linkedTeleporter)`

### Game Loop
1. Update tanks, projectiles, particles
2. Check collisions (obstacles, power-ups, hazards, teleporters)
3. Draw hazards → obstacles → teleporters → power-ups → projectiles → tanks
4. Apply damage from hazard zones

---

## 🚀 DÉMARRAGE RAPIDE

1. **Lance le serveur** : `npm start`
2. **Ouvre** : http://localhost:3000
3. **Choisis** :
   - Mode de jeu (PvP / IA / LAN)
   - Difficulté (si IA)
   - **MAP** (6 choix)
4. **Clique** : Démarrer la Partie
5. **Joue** :
   - Collecte power-ups
   - Évite zones dangereuses
   - Utilise téléporteurs
   - Détruis obstacles
   - GAGNE ! 🏆

---

## 🏅 DÉFIS

### Bronze 🥉
✅ Gagne sur Classique (n'importe quelle difficulté)
✅ Collecte 5 power-ups en une partie

### Argent 🥈
✅ Gagne sur Destructible en Difficile
✅ Utilise un téléporteur pour surprendre l'ennemi
✅ Traverse une zone de lave avec le Bouclier

### Or 🥇
✅ Gagne sur Portails en Imbattable
✅ Détruis 5 obstacles en une partie
✅ Survive 3 minutes en Chaos Total

### Platine 💎
✅ Gagne sur **Chaos Total** en **Imbattable**
✅ Utilise Bouclier + Vitesse + Tir Triple en combo
✅ Fait 3 kills sans mourir

### Légende 👑
✅ Gagne sur TOUTES les maps en Imbattable
✅ Maître absolu de Tank.io !

---

## 📝 NOTES IMPORTANTES

⚠️ **Les maps se choisissent AVANT la partie** - pas de changement en cours
⚠️ **Chaque map a une stratégie unique** - adapte ton style
⚠️ **Combine power-ups + environnement** pour maximum d'efficacité
⚠️ **L'IA s'adapte aux maps** - elle utilise portails et évite zones dangereuses

---

Bon jeu et conquiers toutes les arènes ! 🎮🔥
