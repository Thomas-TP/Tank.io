// ========================================
// SYSTÈME DE COMPTES (CLIENT-SIDE)
// Synchronisé avec le serveur via API REST
// ========================================

const AccountSystem = {
    currentUser: null,
    authToken: null,
    
    // Inscription (via serveur)
    async register(username, email, password) {
        if (!username || username.length < 3) {
            alert('Le pseudo doit contenir au moins 3 caractères');
            return false;
        }
        if (!password || password.length < 4) {
            alert('Le mot de passe doit contenir au moins 4 caractères');
            return false;
        }
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.authToken = data.token;
                this.currentUser = {
                    username: data.username,
                    stats: data.stats
                };
                
                // Sauvegarder le token en local
                localStorage.setItem('tankio_token', data.token);
                
                alert('✅ Compte créé avec succès !');
                this.showUserInfo();
                return true;
            } else {
                alert('❌ ' + data.message);
                return false;
            }
        } catch (err) {
            console.error('Erreur inscription:', err);
            alert('❌ Erreur de connexion au serveur');
            return false;
        }
    },
    
    // Connexion (via serveur)
    async login(username, password) {
        if (!username || !password) {
            alert('❌ Veuillez remplir tous les champs');
            return false;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.authToken = data.token;
                this.currentUser = {
                    username: data.username,
                    stats: data.stats,
                    matchHistory: data.matchHistory || []
                };
                
                // Sauvegarder le token en local
                localStorage.setItem('tankio_token', data.token);
                
                this.showUserInfo();
                return true;
            } else {
                alert('❌ ' + data.message);
                return false;
            }
        } catch (err) {
            console.error('Erreur connexion:', err);
            alert('❌ Erreur de connexion au serveur');
            return false;
        }
    },
    
    // Vérifier la session au chargement
    async verifySession() {
        const token = localStorage.getItem('tankio_token');
        
        if (!token) return false;
        
        try {
            const response = await fetch('/api/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.authToken = token;
                this.currentUser = {
                    username: data.username,
                    stats: data.stats,
                    matchHistory: data.matchHistory || []
                };
                
                this.showUserInfo();
                return true;
            } else {
                // Token invalide, supprimer
                localStorage.removeItem('tankio_token');
                return false;
            }
        } catch (err) {
            console.error('Erreur vérification session:', err);
            return false;
        }
    },
    
    // Mode invité (local uniquement)
    guestMode() {
        const guestName = `Invité${Math.floor(Math.random() * 9999)}`;
        this.authToken = null;
        this.currentUser = {
            username: guestName,
            stats: {
                wins: 0,
                losses: 0,
                bestScore: 0,
                gamesPlayed: 0,
                totalKills: 0,
                totalDeaths: 0
            },
            matchHistory: [],
            isGuest: true
        };
        
        // Sauvegarder les données invité localement
        localStorage.setItem('tankio_guest_data', JSON.stringify(this.currentUser));
        
        this.showUserInfo();
    },
    
    // Déconnexion
    async logout() {
        if (this.authToken) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: this.authToken })
                });
            } catch (err) {
                console.error('Erreur déconnexion:', err);
            }
        }
        
        this.currentUser = null;
        this.authToken = null;
        
        // Supprimer le token et données locales
        localStorage.removeItem('tankio_token');
        localStorage.removeItem('tankio_guest_data');
        
        // Réafficher le modal d'authentification
        document.getElementById('auth-modal').style.display = 'flex';
        document.getElementById('user-info-corner').style.display = 'none';
        document.getElementById('mode-selection').style.display = 'none';
        
        // Réinitialiser les formulaires
        document.getElementById('username').value = '';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    },
    
    // Afficher les infos utilisateur
    showUserInfo() {
        // Cacher le modal d'authentification
        document.getElementById('auth-modal').style.display = 'none';
        
        // Afficher le coin utilisateur dans le menu
        const userInfo = document.getElementById('user-info-corner');
        userInfo.style.display = 'block';
        document.getElementById('corner-username').textContent = this.currentUser.username;
        document.getElementById('corner-wins').textContent = this.currentUser.stats.wins || 0;
        document.getElementById('corner-losses').textContent = this.currentUser.stats.losses || 0;
        
        // Rendre le menu principal visible
        document.getElementById('mode-selection').style.display = 'block';
    },
    
    // Ajouter une victoire
    async addWin(score, kills = 0, deaths = 0) {
        if (!this.currentUser) return;
        
        this.currentUser.stats.wins++;
        if (score > (this.currentUser.stats.bestScore || 0)) {
            this.currentUser.stats.bestScore = score;
        }
        
        await this.addMatchToHistory(true, score, kills, deaths);
        this.updateUI();
    },
    
    // Ajouter une défaite
    async addLoss(score, kills = 0, deaths = 0) {
        if (!this.currentUser) return;
        
        this.currentUser.stats.losses++;
        
        await this.addMatchToHistory(false, score, kills, deaths);
        this.updateUI();
    },
    
    // Ajouter une partie à l'historique
    async addMatchToHistory(won, score, kills = 0, deaths = 0) {
        if (!this.currentUser) return;
        
        const matchData = {
            date: new Date().toISOString(),
            won: won,
            score: score,
            kills: kills,
            deaths: deaths
        };
        
        // Ajouter à l'historique local
        if (!this.currentUser.matchHistory) this.currentUser.matchHistory = [];
        this.currentUser.matchHistory.unshift(matchData);
        
        // Si connecté avec un compte, synchroniser avec le serveur
        if (this.authToken && !this.currentUser.isGuest) {
            try {
                await fetch('/api/update-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: this.authToken,
                        stats: {
                            wins: this.currentUser.stats.wins,
                            losses: this.currentUser.stats.losses,
                            bestScore: this.currentUser.stats.bestScore,
                            gamesPlayed: 1,
                            kills: kills,
                            deaths: deaths
                        },
                        matchData: matchData
                    })
                });
            } catch (err) {
                console.error('Erreur mise à jour stats:', err);
            }
        } else if (this.currentUser.isGuest) {
            // Sauvegarder les données invité localement
            localStorage.setItem('tankio_guest_data', JSON.stringify(this.currentUser));
        }
    },
    
    // Mettre à jour l'UI
    updateUI() {
        if (!this.currentUser) return;
        
        document.getElementById('corner-wins').textContent = this.currentUser.stats.wins || 0;
        document.getElementById('corner-losses').textContent = this.currentUser.stats.losses || 0;
    }
};

// Vérifier la session au chargement de la page
window.addEventListener('load', async () => {
    // Essayer de restaurer la session
    const restored = await AccountSystem.verifySession();
    
    // Si pas de session, vérifier les données invité
    if (!restored) {
        const guestData = localStorage.getItem('tankio_guest_data');
        if (guestData) {
            try {
                AccountSystem.currentUser = JSON.parse(guestData);
                AccountSystem.showUserInfo();
            } catch (err) {
                console.error('Erreur chargement invité:', err);
            }
        }
    }
});
