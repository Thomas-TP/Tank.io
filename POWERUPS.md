# 🎁 SYSTÈME DE POWER-UPS - TANK.IO

## Power-ups disponibles

### ⚡ **VITESSE BOOST** (Cyan)
- **Effet** : Multiplie la vitesse du tank par **1.5x**
- **Durée** : **15 secondes**
- **Stratégie** : Parfait pour foncer sur l'ennemi, esquiver les tirs ou fuir en danger
- **Visuel** : Icône ⚡ au-dessus du tank

### 🛡️ **BOUCLIER** (Vert)
- **Effet** : Absorbe **TOUS les dégâts** (projectiles et collisions)
- **Durée** : **10 secondes**
- **Stratégie** : Invincibilité temporaire - profite-en pour attaquer agressivement !
- **Visuel** : Double cercle vert brillant autour du tank + icône 🛡

### ⚔️ **TIR TRIPLE** (Magenta)
- **Effet** : Le prochain tir lance **3 projectiles** (un droit + deux à ±15°)
- **Durée** : **1 tir unique** puis disparaît
- **Stratégie** : Zone de dégâts large - idéal pour toucher un ennemi en mouvement
- **Visuel** : Icône ⚔ + particules magenta lors du tir + plus de screen shake

## Apparition des Power-ups

### Au début du round
- **2-3 power-ups** apparaissent aléatoirement sur la carte
- Spawn retardé de 0.5s entre chaque

### Pendant le round
- Un nouveau power-up spawn toutes les **15-20 secondes** (70% de chance)
- Types aléatoires avec distribution égale

### Emplacements
✅ Évitent les obstacles (marge de 30px)
✅ Ne spawneront jamais trop près des tanks (100px minimum)
✅ Jusqu'à 50 tentatives pour trouver un emplacement valide

## Collecte

- **Collision automatique** : Approche le power-up avec ton tank
- **Effet visuel** : 20 particules colorées éclatent lors de la collecte
- **Disparition** : Le power-up disparaît immédiatement après collecte

## Affichage

### Sur la carte
- Power-ups brillants avec effet de **pulsation**
- Ombre lumineuse (shadowBlur) de la couleur du power-up
- Icône centrée visible de loin

### Sur le tank
- Barre de vie affiche les **icônes des power-ups actifs**
- Bouclier : **double cercle vert brillant** autour du tank
- Les effets sont visibles pour les deux joueurs

## Mécaniques techniques

### Vitesse Boost
```javascript
// Vitesse normale : 2.0
// Avec boost : 2.0 × 1.5 = 3.0
this.speed = this.baseSpeed * 1.5;
// Durée : 900 frames (60 FPS × 15 secondes)
```

### Bouclier
```javascript
// Dans applyDamage()
if (this.hasShield) {
    // Particules vertes d'absorption
    return; // Pas de dégâts !
}
```

### Tir Triple
```javascript
// Un projectile central
projectiles.push(new Projectile(x, y, angle, color, owner));
// Deux projectiles à ±15° (0.26 radians)
projectiles.push(new Projectile(x, y, angle - 0.26, color, owner));
projectiles.push(new Projectile(x, y, angle + 0.26, color, owner));
```

## Stratégies de jeu

### Avec Vitesse Boost ⚡
- Fonce pour prendre d'autres power-ups avant l'adversaire
- Esquive facilement les projectiles ennemis
- Repositionne-toi rapidement derrière des obstacles

### Avec Bouclier 🛡️
- Approche directement l'ennemi sans crainte
- Tire agressivement - tu es invincible !
- Bloque l'accès aux power-ups pour l'adversaire

### Avec Tir Triple ⚔️
- Attend le bon moment - tu n'as qu'un tir !
- Parfait pour toucher un ennemi qui strafe
- Utilise-le à moyenne distance pour maximum d'impact

### Combos puissants
- **Vitesse + Triple** : Fonce rapidement et tire en passant
- **Bouclier + Vitesse** : Tank invincible ultra-rapide - dominateur !
- **Bouclier + Triple** : Approche sans risque puis tire massivement

## Mode IA et Multiplayer

- Les power-ups fonctionnent en **tous les modes** (PvP, IA, LAN)
- L'IA peut également collecter et utiliser les power-ups
- En mode LAN, la synchronisation des power-ups est gérée par le serveur

## Notes importantes

⚠️ Les timers des power-ups sont **indépendants**
- Tu peux avoir Vitesse + Bouclier en même temps !
- Le Tir Triple reste actif jusqu'à utilisation

⚠️ Les power-ups sont **remis à zéro** à chaque nouveau round

⚠️ Un nouveau power-up peut **remplacer un ancien** du même type
- Exemple : Prendre Vitesse alors que tu as déjà Vitesse → Reset le timer à 15s
