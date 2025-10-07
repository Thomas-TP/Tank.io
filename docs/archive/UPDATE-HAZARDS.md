# 🔥💧 MISE À JOUR : LAVE & EAU

## Corrections Appliquées

### 🔥 **LAVE - Maintenant DANGEREUSE !**
**Avant** : Pas de dégâts
**Maintenant** : 
- ✅ **-1 HP toutes les 0.5 secondes**
- ✅ Particules rouges/oranges quand touché
- ✅ Peut TUER un joueur
- ✅ Timer indépendant par tank

**Test** : Entre dans une zone rouge → Tu prends des dégâts !

---

### 🌊 **EAU - Ralentissement au lieu de Dégâts**
**Avant** : Faisait des dégâts comme la lave
**Maintenant** :
- ✅ **Ralentit à 50% de la vitesse**
- ✅ **Pas de dégâts** - juste ralentissement
- ✅ Petites bulles bleues (effet visuel subtil)
- ✅ Vitesse restaurée automatiquement en sortant

**Test** : Entre dans une zone bleue → Tu es ralenti mais pas blessé !

---

## 🎮 Mécaniques Détaillées

### Lave 🔥
```javascript
Timer : 30 frames (0.5s)
Dégâts : -1 HP
Effet : Particules rouges
Mort : Oui, si HP atteint 0
```

### Eau 🌊
```javascript
Ralentissement : 50% (vitesse × 0.5)
Dégâts : Aucun
Effet : Bulles bleues (10% de chance par frame)
Mort : Non - juste gênant
```

---

## 🛡️ Interactions avec Power-ups

### Bouclier + Lave 🛡️🔥
- **Résultat** : Aucun dégât !
- **Utilisation** : Traverse la lave en toute sécurité
- **Durée** : 5 secondes (assez pour traverser)
- **Stratégie** : Piège l'ennemi de l'autre côté

### Vitesse Boost + Eau ⚡🌊
- **Résultat** : Vitesse normale (1.5x base × 0.5 eau = vitesse normale !)
- **Utilisation** : Bouge librement dans l'eau
- **Avantage** : Ennemi sans boost = très lent
- **Stratégie** : Domine la zone d'eau avec le boost

### Vitesse Boost + Lave ⚡🔥
- **Résultat** : Traverse plus vite, moins de ticks de dégâts
- **Utilisation** : Minimise l'exposition
- **Risque** : Prends quand même des dégâts
- **Mieux** : Utilise le bouclier pour la lave !

---

## 📊 Comparaison

| Zone  | Dégâts | Ralentissement | Mortel | Contre-mesure      |
|-------|--------|----------------|--------|--------------------|
| 🔥 Lave | ✅ -1 HP/0.5s | ❌ Non | ✅ Oui | 🛡️ Bouclier |
| 🌊 Eau  | ❌ Non | ✅ -50% vitesse | ❌ Non | ⚡ Vitesse |

---

## 🗺️ Impact sur les Maps

### Enfer de Lave 🔥
**Difficulté augmentée** : ⭐⭐⭐
- La lave est maintenant MORTELLE
- Combat de positionnement crucial
- Bouclier = power-up essentiel

### Archipel 🌊
**Difficulté ajustée** : ⭐⭐⭐
- L'eau ralentit mais ne tue plus
- Tire sur les tanks lents dans l'eau
- Vitesse boost = domination

### Chaos Total ⚡
**Équilibre amélioré** :
- Lave = zone de MORT
- Eau = zone de RALENTISSEMENT
- Distinction claire entre les deux

---

## 🎯 Nouvelles Stratégies

### Map Lave 🔥
1. **Contrôle le centre** (zone sûre)
2. **Collecte le bouclier en priorité**
3. **Force l'ennemi vers la lave**
4. **Ne traverse JAMAIS sans bouclier**

### Map Eau 🌊
1. **Attire l'ennemi dans l'eau**
2. **Tire sur lui pendant qu'il est ralenti**
3. **Utilise vitesse boost pour dominer**
4. **L'eau = piège tactique, pas mortel**

### Map Chaos ⚡
1. **Lave = à éviter absolument**
2. **Eau = ralentissement gérable**
3. **Priorité : Bouclier > Vitesse > Triple**
4. **Adapte-toi aux deux types de zones**

---

## ✅ Testé et Vérifié

- ✅ Lave fait des dégâts (-1 HP/0.5s)
- ✅ Eau ralentit (50% vitesse)
- ✅ Bouclier protège de la lave
- ✅ Vitesse compense l'eau
- ✅ Sortie de zone = restauration automatique
- ✅ Timers indépendants par joueur
- ✅ Effets visuels appropriés

---

## 🚀 Prêt à Tester !

Lance le jeu et essaie :
1. **Map "Enfer de Lave"** → Entre dans le rouge = dégâts !
2. **Map "Archipel"** → Entre dans le bleu = ralenti !
3. **Collecte un bouclier** → Traverse la lave sans dégâts
4. **Collecte vitesse** → Bouge normalement dans l'eau

**Le serveur tourne déjà** : http://localhost:3000 🎮
