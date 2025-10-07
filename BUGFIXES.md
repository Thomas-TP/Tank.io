# 🐛 CORRECTIONS DES BUGS

## Problèmes Identifiés

### ❌ Bug #1 : Mouvements saccadés
**Cause** : Throttling à 20 Hz limitait l'envoi des inputs
```javascript
// AVANT (bugué)
if (now - this.lastUpdateSent < 1000 / this.serverUpdateRate) return;
```

**Solution** : Envoyer inputs à chaque frame, limiter la queue
```javascript
// APRÈS (corrigé)
// Envoi sans throttling
// Queue limitée à 60 inputs max (1 seconde à 60 FPS)
if (this.pendingInputs.length > 60) {
    this.pendingInputs.shift();
}
```

### ❌ Bug #2 : Double projectile par tir
**Cause** : Client crée un projectile local + Serveur en crée un aussi
```javascript
// AVANT (bugué)
// game.js : this.shoot() crée un projectile
// server.js : handleShoot() crée aussi un projectile
// = 2 projectiles !
```

**Solution** : 
1. Client ne crée PAS de projectile en mode LAN
2. Serveur a cooldown pour éviter spam
3. `input.shoot` envoyé SEULEMENT au moment du tir

```javascript
// game.js
if (gameMode !== 'lan') {
    projectiles.push(...); // Seulement en PvP/AI
}

// server.js
if (now - player.lastShootTime >= SHOOT_COOLDOWN) {
    this.handleShoot(); // Cooldown serveur
}
```

### ❌ Bug #3 : Input.shoot envoyé en continu
**Cause** : `input.shoot = true` envoyé à chaque frame pendant que souris pressée
```javascript
// AVANT (bugué)
if (mouseDown && this.shootTimer <= 0) {
    this.shoot();
    if (input) input.shoot = true; // CHAQUE FRAME !
}
```

**Solution** : Flag `justShot` pour envoyer shoot = true UNE SEULE FOIS
```javascript
// APRÈS (corrigé)
let justShot = false;
if (mouseDown && this.shootTimer <= 0) {
    this.shoot();
    this.shootTimer = SHOOT_COOLDOWN;
    justShot = true;
}

// Seulement si on vient de tirer
if (input && justShot) {
    input.shoot = true;
}
```

## 🧪 Tests à Effectuer

### Test 1 : Mouvement Fluide
1. Démarrer serveur : `npm start`
2. Ouvrir 2 navigateurs
3. Cliquer "MODE LAN" des deux côtés
4. **Vérifier** : 
   - ✅ Mouvement sans à-coups
   - ✅ Rotation fluide
   - ✅ Pas de téléportation

### Test 2 : Tir Simple
1. En jeu LAN
2. Cliquer pour tirer (ou maintenir le clic)
3. **Vérifier** :
   - ✅ UN SEUL projectile par clic
   - ✅ Pas de double tir
   - ✅ Cooldown respecté (500ms)

### Test 3 : Synchronisation
1. Joueur 1 tire vers Joueur 2
2. **Vérifier** :
   - ✅ Projectile visible des deux côtés
   - ✅ Collision détectée correctement
   - ✅ Dégâts appliqués (−2 HP)

### Test 4 : Spam Protection
1. Maintenir clic gauche enfoncé
2. **Vérifier** :
   - ✅ Max 2 tirs/seconde (cooldown 500ms)
   - ✅ Pas de lag serveur
   - ✅ Pas de projectiles multiples

## 📊 Console de Debug

### F12 → Console pour voir :
```
✅ Connecté au serveur
🎮 Début de la manche
📍 Input envoyé: {forward: true, shoot: false, seq: 123}
📍 État reçu: lastProcessedInput: 120
```

### Serveur (terminal) :
```
✅ Match créé: abc123 vs def456
🎮 P1 tire @ (x, y)
📍 Projectile créé: P1_timestamp_random
```

## 🔍 Debugging

### Si mouvements encore saccadés :
- Ouvrir F12 → Performance
- Enregistrer 5 secondes
- Vérifier : FPS doit être ~60
- Si FPS < 30 → Problème performance PC

### Si double tir persiste :
- F12 → Console
- Chercher : "Projectile créé"
- Compter combien par clic
- Si > 1 → Vérifier `justShot` dans game.js

### Si désynchronisation :
- F12 → Console
- Vérifier : `lastProcessedInput` augmente
- Si bloqué → Problème réseau/serveur

## 🚀 Améliorations Appliquées

1. **Input sans throttling** → Mouvement 60 FPS fluide
2. **Cooldown serveur** → Protection anti-spam (500ms)
3. **Flag justShot** → Tir unique par clic
4. **Queue limitée** → Évite overflow mémoire (max 60 inputs)
5. **Projectiles serveur-only** → Pas de duplication

## 📈 Performance Attendue

- **Client FPS** : 60 FPS constant
- **Serveur Update Rate** : 20 Hz (50ms)
- **Input Rate** : 60 Hz (16ms)
- **Latency** : ~50-100ms en LAN
- **Reconciliation** : Transparente (invisible)

## ✅ Statut

- [x] Mouvement saccadé → **CORRIGÉ**
- [x] Double projectile → **CORRIGÉ**
- [x] Input spam → **CORRIGÉ**
- [x] Cooldown manquant → **AJOUTÉ**
- [x] Queue overflow → **LIMITÉ À 60**
