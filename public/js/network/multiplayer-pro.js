// ========================================
// CLIENT MULTIJOUEUR - Architecture Professionnelle
// Client-Side Prediction + Server Reconciliation
// Basé sur : https://gabrielgambetta.com/client-server-game-architecture.html
// ========================================

class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerNumber = null;
        this.gameId = null;
        this.opponentId = null;
        this.searching = false;
        
        // Client-Side Prediction
        this.clientSequenceNumber = 0;
        this.pendingInputs = [];
        this.serverUpdateRate = 20; // 20 updates/sec
        this.lastUpdateSent = 0;
        
        // Entity Interpolation pour l'adversaire
        this.opponentBuffer = [];
        this.interpolationDelay = 100; // 100ms de délai pour lisser
    }
    
    connect() {
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
        
        this.socket.on('searching', (data) => {
            console.log('🔍 ' + data.message);
            showMessage('Recherche d\'un adversaire en cours...', 0);
        });
        
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
        
        this.socket.on('roundStart', (state) => {
            console.log('🎮 Début de la manche');
            this.startMultiplayerRound(state);
        });
        
        // Server Reconciliation : le serveur renvoie notre état validé
        this.socket.on('gameState', (data) => {
            this.processServerUpdate(data);
        });
        
        this.socket.on('playerHit', (data) => {
            const player = data.playerNum === this.playerNumber ? 
                (this.playerNumber === 1 ? player1 : player2) :
                (this.playerNumber === 1 ? player2 : player1);
            
            player.currentHealth = data.health;
            createExplosion(player.x, player.y, player.color);
            triggerScreenShake(5, 15);
        });
        
        this.socket.on('playerDied', (data) => {
            scores.player1 = data.scores.player1;
            scores.player2 = data.scores.player2;
            updateUI();
            
            const winnerText = data.winner === this.playerNumber ? 
                'Vous avez gagné la manche !' : 
                'L\'adversaire a gagné la manche !';
            
            showMessage(winnerText, 3000);
        });
        
        this.socket.on('gameOver', (data) => {
            const winnerText = data.winner === this.playerNumber ? 
                'VICTOIRE !\nVous avez gagné la partie !' : 
                'DÉFAITE\nL\'adversaire a gagné la partie';
            
            showMessage(winnerText, 0);
            gameState = 'GAME_OVER';
        });
        
        this.socket.on('opponentDisconnected', () => {
            showMessage('Adversaire déconnecté\nVictoire par forfait !', 0);
            gameState = 'GAME_OVER';
        });
        
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
    
    // Client-Side Prediction : envoyer l'input, pas la position
    sendInput(input) {
        if (!this.socket || !this.gameId) return;
        
        const now = Date.now();
        if (now - this.lastUpdateSent < 1000 / this.serverUpdateRate) return;
        
        input.sequenceNumber = this.clientSequenceNumber++;
        input.timestamp = now;
        
        this.socket.emit('playerInput', input);
        this.pendingInputs.push(input);
        this.lastUpdateSent = now;
    }
    
    // Server Reconciliation : réconcilier notre état avec le serveur
    processServerUpdate(serverState) {
        const myPlayerNum = this.playerNumber;
        const myState = serverState[`player${myPlayerNum}`];
        const oppState = serverState[`player${myPlayerNum === 1 ? 2 : 1}`];
        
        if (!myState || !oppState) return;
        
        // Mettre à jour l'adversaire (Entity Interpolation)
        const opponent = myPlayerNum === 1 ? player2 : player1;
        this.opponentBuffer.push({
            timestamp: Date.now(),
            x: oppState.x,
            y: oppState.y,
            angle: oppState.angle,
            health: oppState.health
        });
        
        // Garder seulement les 10 dernières positions
        if (this.opponentBuffer.length > 10) {
            this.opponentBuffer.shift();
        }
        
        // Server Reconciliation pour notre propre joueur
        const myPlayer = myPlayerNum === 1 ? player1 : player2;
        const lastProcessedSeq = serverState.lastProcessedInput;
        
        if (lastProcessedSeq !== undefined) {
            // Retirer les inputs déjà traités par le serveur
            let i = 0;
            while (i < this.pendingInputs.length) {
                if (this.pendingInputs[i].sequenceNumber <= lastProcessedSeq) {
                    this.pendingInputs.splice(i, 1);
                } else {
                    i++;
                }
            }
        }
        
        // Appliquer la position du serveur
        myPlayer.x = myState.x;
        myPlayer.y = myState.y;
        myPlayer.angle = myState.angle;
        myPlayer.currentHealth = myState.health;
        
        // Ré-appliquer les inputs non encore traités par le serveur
        for (let input of this.pendingInputs) {
            this.applyInput(myPlayer, input);
        }
        
        // Mettre à jour les projectiles
        if (serverState.projectiles) {
            this.syncProjectiles(serverState.projectiles);
        }
    }
    
    // Appliquer un input au joueur (utilisé pour prediction et reconciliation)
    applyInput(player, input) {
        const speed = player.speed;
        
        // Rotation
        if (input.rotateLeft) player.angle -= player.rotationSpeed;
        if (input.rotateRight) player.angle += player.rotationSpeed;
        
        // Mouvement
        let newX = player.x;
        let newY = player.y;
        
        if (input.forward || input.backward) {
            const moveX = Math.sin(player.angle) * speed;
            const moveY = -Math.cos(player.angle) * speed;
            
            if (input.forward) {
                newX += moveX;
                newY += moveY;
            }
            if (input.backward) {
                newX -= moveX;
                newY -= moveY;
            }
            
            // Vérifier collision
            if (!player.checkCollision(newX, newY)) {
                player.x = newX;
                player.y = newY;
            } else {
                // Glissement
                if (!player.checkCollision(newX, player.y)) {
                    player.x = newX;
                } else if (!player.checkCollision(player.x, newY)) {
                    player.y = newY;
                }
            }
        }
    }
    
    // Entity Interpolation : interpoler la position de l'adversaire
    interpolateOpponent() {
        if (this.opponentBuffer.length < 2) return;
        
        const now = Date.now();
        const renderTime = now - this.interpolationDelay;
        
        const opponent = this.playerNumber === 1 ? player2 : player1;
        
        // Trouver les deux positions à interpoler
        let pos0 = null;
        let pos1 = null;
        
        for (let i = 0; i < this.opponentBuffer.length - 1; i++) {
            if (this.opponentBuffer[i].timestamp <= renderTime && 
                this.opponentBuffer[i + 1].timestamp >= renderTime) {
                pos0 = this.opponentBuffer[i];
                pos1 = this.opponentBuffer[i + 1];
                break;
            }
        }
        
        if (!pos0 || !pos1) {
            // Utiliser la dernière position connue
            const lastPos = this.opponentBuffer[this.opponentBuffer.length - 1];
            opponent.x = lastPos.x;
            opponent.y = lastPos.y;
            opponent.angle = lastPos.angle;
            opponent.currentHealth = lastPos.health;
            return;
        }
        
        // Interpolation linéaire
        const t = (renderTime - pos0.timestamp) / (pos1.timestamp - pos0.timestamp);
        opponent.x = pos0.x + (pos1.x - pos0.x) * t;
        opponent.y = pos0.y + (pos1.y - pos0.y) * t;
        opponent.angle = pos0.angle + (pos1.angle - pos0.angle) * t;
        opponent.currentHealth = pos1.health; // Pas d'interpolation pour la santé
    }
    
    syncProjectiles(serverProjectiles) {
        // Synchroniser les projectiles avec le serveur
        // Pour simplifier, on fait confiance au serveur
        projectiles = serverProjectiles.map(p => {
            const owner = p.ownerNum === 1 ? player1 : player2;
            return new Projectile(p.x, p.y, p.angle, owner.color, owner);
        });
    }
    
    sendHit(victimNum, damage) {
        if (this.socket && this.gameId) {
            this.socket.emit('playerHit', { victimNum, damage });
        }
    }
    
    startMultiplayerRound(state) {
        gameState = 'RUNNING';
        messageOverlay.classList.remove('visible');
        
        // Réinitialiser les buffers
        this.pendingInputs = [];
        this.opponentBuffer = [];
        this.clientSequenceNumber = 0;
        
        const myPlayer = this.playerNumber === 1 ? player1 : player2;
        const opponent = this.playerNumber === 1 ? player2 : player1;
        
        const myState = state[`player${this.playerNumber}`];
        const oppState = state[`player${this.playerNumber === 1 ? 2 : 1}`];
        
        myPlayer.x = myState.x;
        myPlayer.y = myState.y;
        myPlayer.angle = myState.angle;
        myPlayer.currentHealth = myState.health;
        
        opponent.x = oppState.x;
        opponent.y = oppState.y;
        opponent.angle = oppState.angle;
        opponent.currentHealth = oppState.health;
        
        // Noms UI
        if (this.playerNumber === 1) {
            document.getElementById('player1-name').innerText = 'Vous (BLEU)';
            document.getElementById('player2-name').innerText = 'Adversaire (ROUGE)';
        } else {
            document.getElementById('player1-name').innerText = 'Adversaire (BLEU)';
            document.getElementById('player2-name').innerText = 'Vous (ROUGE)';
        }
        
        obstacles = state.obstacles.map(o => new Obstacle(o.x, o.y, o.width, o.height));
        projectiles = [];
        particles = [];
        
        currentLevel = state.currentLevel;
        scores.player1 = state.scores.player1;
        scores.player2 = state.scores.player2;
        roundTimer = state.roundTimer;
        
        updateUI();
    }
}

let multiplayerClient = null;
