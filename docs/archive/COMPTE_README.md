# 🎮 Système de Compte Tank.io

## ⚠️ AVERTISSEMENT DE SÉCURITÉ

**CE JEU UTILISE UN STOCKAGE LOCAL NON SÉCURISÉ (localStorage)**

- ❌ **N'utilisez JAMAIS votre mot de passe personnel**
- ❌ Les mots de passe sont stockés en clair dans votre navigateur
- ❌ Tout le monde ayant accès à votre ordinateur peut voir vos données
- ✅ Utilisez un mot de passe unique et simple pour ce jeu uniquement

## 📋 Fonctionnalités

### 1. Création de Compte
- **Pseudo** : 3-20 caractères (obligatoire)
- **Email** : Optionnel, utilisé uniquement pour l'affichage
- **Mot de passe** : 4+ caractères (NON SÉCURISÉ)

### 2. Mode Invité
- Jouer sans créer de compte
- Statistiques non sauvegardées après fermeture
- Pseudo généré automatiquement (Invité####)

### 3. Statistiques Suivies
- 🏆 **Victoires** : Nombre de parties gagnées
- 💀 **Défaites** : Nombre de parties perdues
- 🎯 **Meilleur Score** : Score le plus élevé obtenu
- 📊 **Score Total** : Somme de tous les scores
- 📈 **Ratio V/D** : Taux de victoire

### 4. Historique des Parties
- Enregistrement des **50 dernières parties**
- Affichage des **10 dernières** dans les statistiques
- Informations sauvegardées :
  - Date et heure
  - Mode de jeu (PvP, IA, LAN)
  - Difficulté de l'IA
  - Carte jouée
  - Résultat (victoire/défaite)
  - Score obtenu

## 🔐 Gestion des Comptes

### Connexion
1. Entrer votre pseudo et mot de passe
2. Cliquer sur "Se connecter"
3. Appuyer sur Entrée fonctionne aussi

### Déconnexion
- Cliquer sur le bouton "Déconnexion"
- Les statistiques sont **automatiquement sauvegardées**

### Sauvegarde Automatique
- À chaque fin de partie (victoire/défaite)
- À la fermeture du navigateur
- Lors de la déconnexion

## 📊 Affichage des Statistiques

Cliquer sur le bouton "📊 Statistiques" pour voir :
- Résumé général avec tous les chiffres
- Historique détaillé des 10 dernières parties
- Chaque partie affiche :
  - Résultat coloré (vert=victoire, rouge=défaite)
  - Score obtenu
  - Mode de jeu et difficulté
  - Carte jouée
  - Date et heure précises

## 💾 Stockage des Données

### LocalStorage
- Clé : `tankio_accounts`
- Format : JSON
- Accessible depuis les DevTools du navigateur (F12)
- Persistant entre les sessions

### Structure des Données
```json
{
  "username": {
    "password": "mot_de_passe",
    "email": "email@exemple.com",
    "stats": {
      "wins": 10,
      "losses": 5,
      "bestScore": 3,
      "totalScore": 25
    },
    "matchHistory": [
      {
        "date": "01/01/2024 14:30:00",
        "mode": "ai",
        "difficulty": "Difficile",
        "map": "lava",
        "won": true,
        "score": 3
      }
    ]
  }
}
```

## 🎯 Quand les Stats sont Enregistrées

### ✅ Enregistré
- Modes **PvP** et **IA** seulement
- Uniquement si vous avez gagné OU perdu (pas en cas de match nul)
- Score = nombre de manches gagnées (0-3)

### ❌ Non Enregistré
- Mode **LAN** (multijoueur réseau)
- **Mode Invité** (stats temporaires seulement)
- **Matchs nuls** (2-2 ou temps écoulé)

## 🔧 Dépannage

### Mes statistiques ne se sauvegardent pas
1. Vérifiez que vous n'êtes pas en mode Invité
2. Assurez-vous d'avoir gagné ou perdu (pas match nul)
3. Vérifiez que votre navigateur autorise localStorage
4. Mode privé/incognito efface les données

### J'ai perdu mes données
- LocalStorage est lié au navigateur
- Changer de navigateur = nouvelles données
- Effacer les cookies/données = perte des comptes
- Pas de synchronisation cloud

### Je veux supprimer un compte
1. Ouvrir les DevTools (F12)
2. Onglet "Application" ou "Storage"
3. Section "Local Storage"
4. Trouver la clé `tankio_accounts`
5. Éditer ou supprimer manuellement

## 🆕 Nouveautés

### Version Actuelle
- ✅ Système de compte avec localStorage
- ✅ Statistiques persistantes (V/D/Meilleur)
- ✅ Historique des 50 dernières parties
- ✅ Mode invité pour jouer sans compte
- ✅ Sauvegarde automatique
- ✅ Disclaimer de sécurité visible

### Améliorations Futures Possibles
- 🔮 Cryptage des mots de passe
- 🔮 Export/Import de comptes
- 🔮 Graphiques de progression
- 🔮 Succès et achievements
- 🔮 Comparaison entre joueurs

---

**Bon jeu ! 🎮🚀**
