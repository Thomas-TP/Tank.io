// ========================================
// SERVEUR AUTHORITATIVE - Architecture Professionnelle
// Le serveur est la seule autorité sur l'état du jeu
// ========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// ========================================
// SYSTÈME DE COMPTES (BASE DE DONNÉES)
// ========================================

const DB_FILE = path.join(__dirname, 'accounts.json');

// Charger ou créer la base de données
let accountsDB = { users: {}, sessions: {} };

if (fs.existsSync(DB_FILE)) {
    try {
        accountsDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        console.log(`📁 Base de données chargée: ${Object.keys(accountsDB.users).length} comptes`);
    } catch (err) {
        console.error('❌ Erreur lecture DB:', err);
    }
} else {
    saveDB();
    console.log('📁 Nouvelle base de données créée');
}

function saveDB() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(accountsDB, null, 2));
    } catch (err) {
        console.error('❌ Erreur sauvegarde DB:', err);
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// API REST pour les comptes
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Pseudo et mot de passe requis' });
    }
    
    if (accountsDB.users[username.toLowerCase()]) {
        return res.status(400).json({ success: false, message: 'Ce pseudo existe déjà' });
    }
    
    accountsDB.users[username.toLowerCase()] = {
        username: username,
        email: email || '',
        password: hashPassword(password),
        stats: {
            wins: 0,
            losses: 0,
            bestScore: 0,
            gamesPlayed: 0,
            totalKills: 0,
            totalDeaths: 0
        },
        matchHistory: [],
        createdAt: new Date().toISOString()
    };
    
    saveDB();
    
    const token = generateToken();
    accountsDB.sessions[token] = {
        username: username,
        loginTime: new Date().toISOString()
    };
    
    console.log(`✅ Nouveau compte créé: ${username}`);
    res.json({ success: true, token, username, stats: accountsDB.users[username.toLowerCase()].stats });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Pseudo et mot de passe requis' });
    }
    
    const user = accountsDB.users[username.toLowerCase()];
    
    if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
    
    const token = generateToken();
    accountsDB.sessions[token] = {
        username: user.username,
        loginTime: new Date().toISOString()
    };
    
    console.log(`✅ Connexion: ${user.username}`);
    res.json({ 
        success: true, 
        token, 
        username: user.username, 
        stats: user.stats,
        matchHistory: user.matchHistory || []
    });
});

app.post('/api/verify-session', (req, res) => {
    const { token } = req.body;
    
    if (!token || !accountsDB.sessions[token]) {
        return res.status(401).json({ success: false, message: 'Session invalide' });
    }
    
    const session = accountsDB.sessions[token];
    const user = accountsDB.users[session.username.toLowerCase()];
    
    if (!user) {
        delete accountsDB.sessions[token];
        return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }
    
    res.json({ 
        success: true, 
        username: user.username, 
        stats: user.stats,
        matchHistory: user.matchHistory || []
    });
});

app.post('/api/logout', (req, res) => {
    const { token } = req.body;
    
    if (token && accountsDB.sessions[token]) {
        const username = accountsDB.sessions[token].username;
        delete accountsDB.sessions[token];
        console.log(`👋 Déconnexion: ${username}`);
    }
    
    res.json({ success: true });
});

app.post('/api/update-stats', (req, res) => {
    const { token, stats, matchData } = req.body;
    
    if (!token || !accountsDB.sessions[token]) {
        return res.status(401).json({ success: false, message: 'Session invalide' });
    }
    
    const session = accountsDB.sessions[token];
    const user = accountsDB.users[session.username.toLowerCase()];
    
    if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }
    
    // Mettre à jour les stats
    if (stats) {
        user.stats.wins = stats.wins || user.stats.wins;
        user.stats.losses = stats.losses || user.stats.losses;
        user.stats.bestScore = Math.max(stats.bestScore || 0, user.stats.bestScore);
        user.stats.gamesPlayed = (user.stats.gamesPlayed || 0) + (stats.gamesPlayed || 0);
        user.stats.totalKills = (user.stats.totalKills || 0) + (stats.kills || 0);
        user.stats.totalDeaths = (user.stats.totalDeaths || 0) + (stats.deaths || 0);
    }
    
    // Ajouter le match à l'historique
    if (matchData) {
        if (!user.matchHistory) user.matchHistory = [];
        user.matchHistory.unshift(matchData);
        if (user.matchHistory.length > 50) user.matchHistory = user.matchHistory.slice(0, 50);
    }
    
    saveDB();
    
    res.json({ success: true, stats: user.stats });
});

// Nettoyage des sessions (toutes les heures)
setInterval(() => {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, session] of Object.entries(accountsDB.sessions)) {
        const loginTime = new Date(session.loginTime);
        const hoursSince = (now - loginTime) / (1000 * 60 * 60);
        
        // Supprimer les sessions de plus de 7 jours
        if (hoursSince > 168) {
            delete accountsDB.sessions[token];
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 ${cleaned} sessions expirées nettoyées`);
    }
}, 3600000);

const waitingPlayers = [];
const activeGames = new Map();

class Game {
    constructor(player1, player2) {
        this.id = `game_${Date.now()}_${Math.random()}`;
        this.players = {
            player1: { socket: player1, lastProcessedInput: 0 },
            player2: { socket: player2, lastProcessedInput: 0 }
        };
        
        // État authoritatif du jeu (SEULE source de vérité)
        this.state = {
            player1: { x: 100, y: 300, angle: -Math.PI / 2, health: 6, speed: 2, lastShootTime: 0 },
            player2: { x: 700, y: 300, angle: Math.PI / 2, health: 6, speed: 2, lastShootTime: 0 },
            projectiles: [],
            obstacles: [],
            scores: { player1: 0, player2: 0 },
            roundTimer: 180,
            currentLevel: 1
        };
        
        this.updateInterval = null;
        this.timerInterval = null;
        
        player1.emit('matchFound', { gameId: this.id, playerNumber: 1, opponentId: player2.id });
        player2.emit('matchFound', { gameId: this.id, playerNumber: 2, opponentId: player1.id });
        
        console.log(`✅ Match créé: ${player1.id} vs ${player2.id}`);
    }
    
    startRound() {
        this.generateObstacles();
        
        this.state.player1 = { x: 100, y: 300, angle: -Math.PI / 2, health: 6, speed: 2, lastShootTime: 0 };
        this.state.player2 = { x: 700, y: 300, angle: Math.PI / 2, health: 6, speed: 2, lastShootTime: 0 };
        this.state.projectiles = [];
        this.state.roundTimer = 180;
        
        this.broadcast('roundStart', this.state);
        
        // Mettre à jour et broadcaster l'état 20 fois par seconde
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => this.update(), 50);
        
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
    
    update() {
        // Mettre à jour les projectiles
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            p.x += Math.sin(p.angle) * 15;
            p.y += -Math.cos(p.angle) * 15;
            
            // Hors limites
            if (p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
                this.state.projectiles.splice(i, 1);
                continue;
            }
            
            // Collision avec obstacles
            let hit = false;
            for (const obs of this.state.obstacles) {
                if (p.x > obs.x && p.x < obs.x + obs.width && 
                    p.y > obs.y && p.y < obs.y + obs.height) {
                    this.state.projectiles.splice(i, 1);
                    hit = true;
                    break;
                }
            }
            if (hit) continue;
            
            // Collision avec joueurs
            const target = p.ownerNum === 1 ? this.state.player2 : this.state.player1;
            const targetNum = p.ownerNum === 1 ? 2 : 1;
            const dx = p.x - target.x;
            const dy = p.y - target.y;
            
            if (Math.sqrt(dx * dx + dy * dy) < 21) { // 42/2 = rayon tank
                target.health -= 2;
                this.state.projectiles.splice(i, 1);
                
                this.broadcast('playerHit', { 
                    playerNum: targetNum, 
                    health: target.health, 
                    damage: 2 
                });
                
                if (target.health <= 0) {
                    const winnerNum = targetNum === 1 ? 2 : 1;
                    const winnerKey = `player${winnerNum}`;
                    this.state.scores[winnerKey]++;
                    
                    this.broadcast('playerDied', {
                        victim: targetNum,
                        winner: winnerNum,
                        scores: this.state.scores
                    });
                    
                    setTimeout(() => {
                        if (this.state.scores.player1 + this.state.scores.player2 < 3) {
                            this.startRound();
                        } else {
                            this.endGame();
                        }
                    }, 3000);
                }
            }
        }
        
        // Broadcaster l'état complet
        this.broadcastState();
    }
    
    processInput(playerNum, input) {
        const playerKey = `player${playerNum}`;
        const player = this.state[playerKey];
        
        if (!player) return;
        
        // Mise à jour du dernier input traité
        this.players[playerKey].lastProcessedInput = input.sequenceNumber;
        
        // Appliquer le mouvement (vérifications côté serveur)
        const speed = player.speed;
        
        // Rotation (souris)
        if (input.mouseAngle !== undefined) {
            player.angle = input.mouseAngle;
        }
        
        // Rotation clavier (PvP)
        if (input.rotateLeft) player.angle -= 0.04;
        if (input.rotateRight) player.angle += 0.04;
        
        // Mouvement
        if (input.forward || input.backward) {
            const moveX = Math.sin(player.angle) * speed;
            const moveY = -Math.cos(player.angle) * speed;
            
            let newX = player.x;
            let newY = player.y;
            
            if (input.forward) {
                newX += moveX;
                newY += moveY;
            }
            if (input.backward) {
                newX -= moveX;
                newY -= moveY;
            }
            
            // Vérification collision serveur
            if (!this.checkCollision(newX, newY, playerNum)) {
                player.x = newX;
                player.y = newY;
            } else {
                // Glissement
                if (!this.checkCollision(newX, player.y, playerNum)) {
                    player.x = newX;
                } else if (!this.checkCollision(player.x, newY, playerNum)) {
                    player.y = newY;
                }
            }
        }
        
        // Tir (seulement si le client demande explicitement + cooldown serveur)
        const SHOOT_COOLDOWN = 500; // 500ms entre chaque tir
        if (input.shoot === true) {
            const now = Date.now();
            if (now - player.lastShootTime >= SHOOT_COOLDOWN) {
                player.lastShootTime = now;
                this.handleShoot(playerNum, player);
            }
        }
    }
    
    checkCollision(x, y, playerNum) {
        const TANK_WIDTH = 32;
        const TANK_HEIGHT = 42;
        
        // Limites
        if (x - TANK_WIDTH/2 < 0 || x + TANK_WIDTH/2 > 800 ||
            y - TANK_HEIGHT/2 < 0 || y + TANK_HEIGHT/2 > 600) return true;
        
        // Obstacles
        for (const obs of this.state.obstacles) {
            if (x > obs.x - TANK_WIDTH/2 && x < obs.x + obs.width + TANK_WIDTH/2 &&
                y > obs.y - TANK_HEIGHT/2 && y < obs.y + obs.height + TANK_HEIGHT/2) return true;
        }
        
        return false;
    }
    
    handleShoot(playerNum, player) {
        const CANNON_LENGTH = 38;
        const cannonX = player.x + Math.sin(player.angle) * CANNON_LENGTH;
        const cannonY = player.y - Math.cos(player.angle) * CANNON_LENGTH;
        
        this.state.projectiles.push({
            x: cannonX,
            y: cannonY,
            angle: player.angle,
            ownerNum: playerNum,
            id: `${playerNum}_${Date.now()}_${Math.random()}`
        });
    }
    
    broadcastState() {
        const state1 = {
            player1: this.state.player1,
            player2: this.state.player2,
            projectiles: this.state.projectiles,
            lastProcessedInput: this.players.player1.lastProcessedInput
        };
        
        const state2 = {
            player1: this.state.player1,
            player2: this.state.player2,
            projectiles: this.state.projectiles,
            lastProcessedInput: this.players.player2.lastProcessedInput
        };
        
        this.players.player1.socket.emit('gameState', state1);
        this.players.player2.socket.emit('gameState', state2);
    }
    
    broadcast(event, data) {
        this.players.player1.socket.emit(event, data);
        this.players.player2.socket.emit(event, data);
    }
    
    endRound(reason) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.broadcast('roundEnd', { reason, scores: this.state.scores });
    }
    
    endGame() {
        const winner = this.state.scores.player1 > this.state.scores.player2 ? 1 : 2;
        this.broadcast('gameOver', { winner, scores: this.state.scores });
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);
        activeGames.delete(this.id);
    }
    
    removePlayer(socket) {
        this.broadcast('opponentDisconnected', {});
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);
        activeGames.delete(this.id);
    }
}

io.on('connection', (socket) => {
    console.log(`🔌 Joueur connecté: ${socket.id}`);
    
    socket.on('findMatch', () => {
        console.log(`🔍 ${socket.id} cherche un match...`);
        
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();
            const game = new Game(opponent, socket);
            activeGames.set(game.id, game);
            setTimeout(() => game.startRound(), 2000);
        } else {
            waitingPlayers.push(socket);
            socket.emit('searching', { message: 'Recherche d\'un adversaire...' });
            console.log(`⏳ ${socket.id} mis en attente`);
        }
    });
    
    socket.on('cancelSearch', () => {
        const index = waitingPlayers.indexOf(socket);
        if (index > -1) waitingPlayers.splice(index, 1);
    });
    
    // Recevoir les inputs du joueur
    socket.on('playerInput', (input) => {
        const game = findGameBySocket(socket);
        if (game) {
            const playerNum = game.players.player1.socket === socket ? 1 : 2;
            game.processInput(playerNum, input);
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Joueur déconnecté: ${socket.id}`);
        const waitIndex = waitingPlayers.indexOf(socket);
        if (waitIndex > -1) waitingPlayers.splice(waitIndex, 1);
        
        const game = findGameBySocket(socket);
        if (game) game.removePlayer(socket);
    });
});

function findGameBySocket(socket) {
    for (const [id, game] of activeGames) {
        if (game.players.player1.socket === socket || game.players.player2.socket === socket) {
            return game;
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🎮 SERVEUR TANK.IO PROFESSIONNEL');
    console.log('Architecture: Client-Side Prediction + Server Authoritative');
    console.log('='.repeat(50));
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Adresse locale: http://localhost:${PORT}`);
    
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`🌐 Adresse LAN: http://${iface.address}:${PORT}`);
            }
        }
    }
    console.log('='.repeat(50));
});
