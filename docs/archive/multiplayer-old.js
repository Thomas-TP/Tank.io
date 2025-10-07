// ========================================
// CLIENT MULTIJOUEUR - Gestion réseau
// ========================================

class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerNumber = null;
        this.gameId = null;
        this.opponentId = null;
        this.searching = false;
    }
    
    connect() {
        // Se connecter au serveur (même adresse que la page web)
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur');
            this.connected = true;
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Déconnecté du serveur');
            this.connected = false;
            if (gameState === 'MULTIPLAYER') {
                showMessage('Connexion perdue', 0);
            }
        });
        
        // Recherche en cours
        this.socket.on('searching', (data) => {
            console.log('🔍 ' + data.message);
            showMessage('Recherche d\'un adversaire en cours...', 0);
        });
        
        // Match trouvé !
        this.socket.on('matchFound', (data) => {
            console.log('✅ Match trouvé !', data);
            this.playerNumber = data.playerNumber;
            this.gameId = data.gameId;
            this.opponentId = data.opponentId;
            this.searching = false;
            
            showMessage(`Adversaire trouvé !\nVous êtes le Joueur ${this.playerNumber}`, 2000, () => {
                messageOverlay.classList.remove('visible');
            });
        });
        
        // Début de manche
        this.socket.on('roundStart', (state) => {
            console.log('🎮 Début de la manche');
            this.startMultiplayerRound(state);
        });
        
        // Mise à jour adversaire
        this.socket.on('playerUpdate', (data) => {
            this.updateOpponent(data);
        });
        
        // Projectile adverse
        this.socket.on('projectileSpawned', (projectile) => {
            this.spawnOpponentProjectile(projectile);
        });
        
        // Joueur touché
        this.socket.on('playerHit', (data) => {
            const player = data.playerNum === this.playerNumber ? 
                (this.playerNumber === 1 ? player1 : player2) :
                (this.playerNumber === 1 ? player2 : player1);
            
            player.currentHealth = data.health;
            createExplosion(player.x, player.y, player.color);
            triggerScreenShake(5, 15);
        });
        
        // Mort d'un joueur
        this.socket.on('playerDied', (data) => {
            scores.player1 = data.scores.player1;
            scores.player2 = data.scores.player2;
            updateUI();
            
            const winnerText = data.winner === this.playerNumber ? 
                'Vous avez gagné la manche !' : 
                'L\'adversaire a gagné la manche !';
            
            showMessage(winnerText, 3000);
        });
        
        // Fin de partie
        this.socket.on('gameOver', (data) => {
            const winnerText = data.winner === this.playerNumber ? 
                'VICTOIRE !\nVous avez gagné la partie !' : 
                'DÉFAITE\nL\'adversaire a gagné la partie';
            
            showMessage(winnerText, 0);
            gameState = 'GAME_OVER';
        });
        
        // Adversaire déconnecté
        this.socket.on('opponentDisconnected', () => {
            showMessage('Adversaire déconnecté\nVictoire par forfait !', 0);
            gameState = 'GAME_OVER';
        });
        
        // Timer
        this.socket.on('timerUpdate', (data) => {
            roundTimer = data.timer;
            updateUI();
        });
    }
    
    findMatch() {
        if (!this.connected) {
            alert('Connexion au serveur en cours...');
            return;
        }
        
        this.searching = true;
        this.socket.emit('findMatch');
    }
    
    cancelSearch() {
        if (this.searching) {
            this.socket.emit('cancelSearch');
            this.searching = false;
        }
    }
    
    sendPosition(x, y, angle, health, playerNum) {
        if (this.socket && this.gameId) {
            this.socket.emit('updatePosition', { x, y, angle, health, playerNum });
        }
    }
    
    sendProjectile(x, y, angle, color) {
        if (this.socket && this.gameId) {
            this.socket.emit('fireProjectile', { x, y, angle, color });
        }
    }
    
    sendHit(victimNum, damage) {
        if (this.socket && this.gameId) {
            this.socket.emit('playerHit', { victimNum, damage });
        }
    }
    
    startMultiplayerRound(state) {
        gameState = 'RUNNING';
        messageOverlay.classList.remove('visible');
        
        // Définir qui est qui selon notre numéro
        let myPlayer, opponent, myState, oppState;
        
        if (this.playerNumber === 1) {
            myPlayer = player1;
            opponent = player2;
            myState = state.player1;
            oppState = state.player2;
            
            // Mettre à jour les noms UI
            document.getElementById('player1-name').innerText = 'Vous (BLEU)';
            document.getElementById('player2-name').innerText = 'Adversaire (ROUGE)';
        } else {
            myPlayer = player2;
            opponent = player1;
            myState = state.player2;
            oppState = state.player1;
            
            // Inverser les noms UI
            document.getElementById('player1-name').innerText = 'Adversaire (BLEU)';
            document.getElementById('player2-name').innerText = 'Vous (ROUGE)';
        }
        
        myPlayer.x = myState.x;
        myPlayer.y = myState.y;
        myPlayer.angle = myState.angle;
        myPlayer.currentHealth = myState.health;
        
        opponent.x = oppState.x;
        opponent.y = oppState.y;
        opponent.angle = oppState.angle;
        opponent.currentHealth = oppState.health;
        
        // Obstacles
        obstacles = state.obstacles.map(o => new Obstacle(o.x, o.y, o.width, o.height));
        
        projectiles = [];
        particles = [];
        
        currentLevel = state.currentLevel;
        scores.player1 = state.scores.player1;
        scores.player2 = state.scores.player2;
        roundTimer = state.roundTimer;
        
        updateUI();
    }
    
    updateOpponent(data) {
        // data.playerNum indique quel joueur a bougé
        // On met à jour seulement si ce n'est pas nous
        if (!data.playerNum) {
            console.warn('⚠️ Update sans playerNum:', data);
            return;
        }
        
        if (data.playerNum === this.playerNumber) {
            console.warn('⚠️ Reçu notre propre update, ignoré');
            return;
        }
        
        const opponent = this.playerNumber === 1 ? player2 : player1;
        
        // Mise à jour directe (sans interpolation pour simplifier)
        // Ne pas mettre à jour si c'est hors limites (protection contre bugs)
        if (data.data.x >= 0 && data.data.x <= 800 && 
            data.data.y >= 0 && data.data.y <= 600) {
            opponent.x = data.data.x;
            opponent.y = data.data.y;
            opponent.angle = data.data.angle;
            opponent.currentHealth = data.data.health;
        }
    }
    
    spawnOpponentProjectile(proj) {
        // Ne créer le projectile que si c'est l'adversaire qui tire
        const opponent = this.playerNumber === 1 ? player2 : player1;
        const myPlayer = this.playerNumber === 1 ? player1 : player2;
        
        // Vérifier que c'est bien un tir adverse (couleur différente)
        if (proj.color === myPlayer.color) return;
        
        projectiles.push(new Projectile(proj.x, proj.y, proj.angle, opponent.color, opponent));
    }
}

// Instance globale
let multiplayerClient = null;
