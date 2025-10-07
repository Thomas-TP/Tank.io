// ========================================
// SERVEUR MULTIJOUEUR LAN TANK.IO
// Auto-matchmaking : trouve automatiquement un adversaire
// ========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques
app.use(express.static(__dirname));

// État du serveur
const waitingPlayers = []; // Joueurs en attente de match
const activeGames = new Map(); // Parties actives

class Game {
    constructor(player1, player2) {
        this.id = `game_${Date.now()}_${Math.random()}`;
        this.players = {
            player1: { socket: player1, ready: false, score: 0 },
            player2: { socket: player2, ready: false, score: 0 }
        };
        
        this.state = {
            player1: { x: 100, y: 300, angle: -Math.PI / 2, health: 6 },
            player2: { x: 700, y: 300, angle: Math.PI / 2, health: 6 },
            projectiles: [],
            obstacles: [],
            scores: { player1: 0, player2: 0 },
            roundTimer: 180,
            currentLevel: 1
        };
        
        this.timerInterval = null;
        
        // Notifier les joueurs qu'ils ont trouvé un match
        player1.emit('matchFound', { 
            gameId: this.id, 
            playerNumber: 1,
            opponentId: player2.id
        });
        
        player2.emit('matchFound', { 
            gameId: this.id, 
            playerNumber: 2,
            opponentId: player1.id
        });
        
        console.log(`✅ Match créé: ${player1.id} vs ${player2.id}`);
    }
    
    startRound() {
        // Générer obstacles
        this.generateObstacles();
        
        // Réinitialiser positions
        this.state.player1 = { x: 100, y: 300, angle: -Math.PI / 2, health: 6 };
        this.state.player2 = { x: 700, y: 300, angle: Math.PI / 2, health: 6 };
        this.state.projectiles = [];
        this.state.roundTimer = 180;
        
        // Envoyer aux clients
        this.broadcast('roundStart', this.state);
        
        // Timer
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.state.roundTimer--;
            this.broadcast('timerUpdate', { timer: this.state.roundTimer });
            
            if (this.state.roundTimer <= 0) {
                this.endRound('timeout');
            }
        }, 1000);
    }
    
    generateObstacles() {
        this.state.obstacles = [];
        const count = 2 + this.state.currentLevel * 2;
        
        for (let i = 0; i < count; i++) {
            const width = 50 + Math.random() * 50;
            const height = 50 + Math.random() * 50;
            const x = Math.random() * (800 - width - 200) + 100;
            const y = Math.random() * (600 - height);
            
            this.state.obstacles.push({ x, y, width, height });
        }
    }
    
    endRound(reason) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.broadcast('roundEnd', { 
            reason, 
            scores: this.state.scores 
        });
    }
    
    broadcast(event, data) {
        this.players.player1.socket.emit(event, data);
        this.players.player2.socket.emit(event, data);
    }
    
    updatePlayer(playerNum, data) {
        const key = `player${playerNum}`;
        this.state[key] = { ...this.state[key], ...data };
        
        // Envoyer à l'autre joueur
        const otherPlayer = playerNum === 1 ? 'player2' : 'player1';
        this.players[otherPlayer].socket.emit('playerUpdate', {
            playerNum,
            data: this.state[key]
        });
    }
    
    handleProjectile(playerNum, projectile) {
        this.state.projectiles.push({
            ...projectile,
            owner: playerNum,
            id: `${playerNum}_${Date.now()}_${Math.random()}`
        });
        
        // Envoyer à l'autre joueur
        const otherPlayer = playerNum === 1 ? 'player2' : 'player1';
        this.players[otherPlayer].socket.emit('projectileSpawned', projectile);
    }
    
    handleHit(victimNum, damage) {
        const victimKey = `player${victimNum}`;
        this.state[victimKey].health -= damage;
        
        this.broadcast('playerHit', {
            playerNum: victimNum,
            health: this.state[victimKey].health,
            damage
        });
        
        // Vérifier mort
        if (this.state[victimKey].health <= 0) {
            const winnerNum = victimNum === 1 ? 2 : 1;
            const winnerKey = `player${winnerNum}`;
            this.state.scores[winnerKey]++;
            
            this.broadcast('playerDied', {
                victim: victimNum,
                winner: winnerNum,
                scores: this.state.scores
            });
            
            // Nouvelle manche après 3 secondes
            setTimeout(() => {
                if (this.state.scores.player1 + this.state.scores.player2 < 3) {
                    this.startRound();
                } else {
                    this.endGame();
                }
            }, 3000);
        }
    }
    
    endGame() {
        const winner = this.state.scores.player1 > this.state.scores.player2 ? 1 : 2;
        this.broadcast('gameOver', {
            winner,
            scores: this.state.scores
        });
        
        // Nettoyer
        if (this.timerInterval) clearInterval(this.timerInterval);
        activeGames.delete(this.id);
    }
    
    removePlayer(socket) {
        // Un joueur s'est déconnecté
        this.broadcast('opponentDisconnected', {});
        if (this.timerInterval) clearInterval(this.timerInterval);
        activeGames.delete(this.id);
    }
}

// Gestion des connexions
io.on('connection', (socket) => {
    console.log(`🔌 Joueur connecté: ${socket.id}`);
    
    // Joueur cherche un match
    socket.on('findMatch', () => {
        console.log(`🔍 ${socket.id} cherche un match...`);
        
        if (waitingPlayers.length > 0) {
            // Il y a un joueur en attente, créer le match
            const opponent = waitingPlayers.shift();
            const game = new Game(opponent, socket);
            activeGames.set(game.id, game);
            
            // Démarrer après 2 secondes
            setTimeout(() => game.startRound(), 2000);
        } else {
            // Mettre en file d'attente
            waitingPlayers.push(socket);
            socket.emit('searching', { message: 'Recherche d\'un adversaire...' });
            console.log(`⏳ ${socket.id} mis en attente. Total en attente: ${waitingPlayers.length}`);
        }
    });
    
    // Annuler la recherche
    socket.on('cancelSearch', () => {
        const index = waitingPlayers.indexOf(socket);
        if (index > -1) {
            waitingPlayers.splice(index, 1);
            console.log(`❌ ${socket.id} a annulé la recherche`);
        }
    });
    
    // Mise à jour position joueur
    socket.on('updatePosition', (data) => {
        const game = findGameBySocket(socket);
        if (game) {
            // Utiliser le playerNum envoyé par le client pour plus de fiabilité
            const playerNum = data.playerNum || (game.players.player1.socket === socket ? 1 : 2);
            const posData = { x: data.x, y: data.y, angle: data.angle, health: data.health };
            
            // Debug : vérifier qu'on envoie au bon joueur
            const otherPlayerNum = playerNum === 1 ? 2 : 1;
            console.log(`📍 P${playerNum} @ (${Math.round(data.x)}, ${Math.round(data.y)}) → envoyé à P${otherPlayerNum}`);
            
            game.updatePlayer(playerNum, posData);
        }
    });
    
    // Tir de projectile
    socket.on('fireProjectile', (data) => {
        const game = findGameBySocket(socket);
        if (game) {
            const playerNum = game.players.player1.socket === socket ? 1 : 2;
            game.handleProjectile(playerNum, data);
        }
    });
    
    // Impact sur joueur
    socket.on('playerHit', (data) => {
        const game = findGameBySocket(socket);
        if (game) {
            game.handleHit(data.victimNum, data.damage);
        }
    });
    
    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`🔌 Joueur déconnecté: ${socket.id}`);
        
        // Retirer de la file d'attente
        const waitIndex = waitingPlayers.indexOf(socket);
        if (waitIndex > -1) {
            waitingPlayers.splice(waitIndex, 1);
        }
        
        // Retirer de la partie active
        const game = findGameBySocket(socket);
        if (game) {
            game.removePlayer(socket);
        }
    });
});

// Fonction helper pour trouver la partie d'un socket
function findGameBySocket(socket) {
    for (const [id, game] of activeGames) {
        if (game.players.player1.socket === socket || game.players.player2.socket === socket) {
            return game;
        }
    }
    return null;
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🎮 SERVEUR TANK.IO MULTIJOUEUR LAN');
    console.log('='.repeat(50));
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Adresse locale: http://localhost:${PORT}`);
    
    // Afficher l'IP locale
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`🌐 Adresse LAN: http://${iface.address}:${PORT}`);
                console.log(`   Les joueurs doivent ouvrir cette adresse dans leur navigateur`);
            }
        }
    }
    console.log('='.repeat(50));
});
