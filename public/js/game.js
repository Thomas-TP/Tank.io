// ============================
// SYSTÈME DE COMPTE - Voir account-system.js
// ============================

// Le système de compte a été déplacé vers account-system.js
// pour une meilleure synchronisation multi-appareils via le serveur

// --- Initialisation ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fonction pour adapter le canvas à la taille de l'écran
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const aspectRatio = 800 / 600; // Ratio d'origine
    
    // Sur mobile, adapter au viewport
    if (window.innerWidth < 900) {
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight - 100; // Garder de l'espace pour les contrôles
        
        if (maxWidth / maxHeight > aspectRatio) {
            canvas.style.height = maxHeight + 'px';
            canvas.style.width = (maxHeight * aspectRatio) + 'px';
        } else {
            canvas.style.width = maxWidth + 'px';
            canvas.style.height = (maxWidth / aspectRatio) + 'px';
        }
    } else {
        // Desktop: taille fixe
        canvas.style.width = '800px';
        canvas.style.height = '600px';
    }
}

// Appeler au chargement et au redimensionnement
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

// UI Elements & MENU ELEMENTS
const player1ScoreElem = document.getElementById('player1-score');
const player2ScoreElem = document.getElementById('player2-score');
const timerElem = document.getElementById('timer');
const levelElem = document.getElementById('level');
const messageOverlay = document.getElementById('message-overlay');
const messageText = document.getElementById('message-text');
const menuScreen = document.getElementById('menu-screen');
const startButton = document.getElementById('start-button');
const modePvpButton = document.getElementById('mode-pvp');
const modeAiButton = document.getElementById('mode-ai');
const modeLanButton = document.getElementById('mode-lan');
const difficultySelection = document.getElementById('difficulty-selection');
const difficultyButtons = document.querySelectorAll('.difficulty-button');
const controlsText = document.getElementById('controls-text');
const controlsMouse = document.getElementById('controls-mouse');

// --- Constantes du jeu ---
const TANK_WIDTH = 32;
const TANK_HEIGHT = 42;
const CANNON_LENGTH = 38;
const CANNON_WIDTH = 8;
const PROJECTILE_SPEED = 15;
const PROJECTILE_RADIUS = 5;
const ROUND_TIME = 180; // 3 minutes = 180 secondes
const SHOOT_COOLDOWN = 60;

const MAX_HEALTH = 6;
const PROJECTILE_DAMAGE = 2;
const COLLISION_DAMAGE = 1;
const COLLISION_COOLDOWN = 30;

// --- État du jeu ---
let gameState = 'MENU';
let currentLevel = 1;
let scores = { player1: 0, player2: 0 };
let obstacles = [];
let projectiles = [];
let particles = [];
let powerUps = [];
let hazardZones = []; // Zones dangereuses (lave/eau)
let teleporters = []; // Téléporteurs
let currentMap = 'classic'; // Map actuelle
let projectileTrails = []; // Traînées des projectiles
let roundTimer;
let timerInterval;
let screenShakeDuration = 0;
let screenShakeMagnitude = 0;

// --- Sons du jeu ---
const sounds = {
    shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'), // Tir laser
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3'), // Impact
    explosion: new Audio('https://assets.mixkit.co/active_storage/sfx/1304/1304-preview.mp3'), // Explosion
    powerup: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'), // Power-up collecté
    damage: new Audio('https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3'), // Dégâts reçus
    teleport: new Audio('https://assets.mixkit.co/active_storage/sfx/1007/1007-preview.mp3'), // Téléportation
    music: new Audio('https://assets.mixkit.co/active_storage/sfx/2745/2745-preview.mp3') // Musique de fond
};

// Configuration des sons
sounds.music.loop = true;
sounds.music.volume = 0.3;
sounds.teleport.loop = false; // S'assurer que le téléporteur ne boucle pas
Object.keys(sounds).forEach(key => {
    if (key !== 'music') {
        sounds[key].volume = 0.4;
        sounds[key].loop = false; // Aucun effet sonore ne doit boucler
    }
});

// Fonction pour jouer un son
function playSound(soundName) {
    if (sounds[soundName]) {
        const sound = sounds[soundName].cloneNode();
        sound.volume = sounds[soundName].volume;
        sound.play().catch(e => console.log('Son non disponible:', soundName));
    }
}

// --- État du mode IA ---
let gameMode = null; // 'pvp', 'ai', ou 'lan'
let aiDifficulty = null; // 'easy', 'medium', 'hard'
let aiController = null;

// --- Contrôles tactiles ---
// Détecter uniquement les vraies tablettes/mobiles (pas les desktops tactiles)
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       (window.innerWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPosition = { x: 0, y: 0 };
let touchShootActive = false;

// Optimisation des performances
let lastFrameTime = Date.now();
let fpsCounter = 0;
let lastFpsUpdate = Date.now();
let currentFPS = 60;

// Limiter le nombre de particules pour les performances
const MAX_PARTICLES = 100;
const MAX_PROJECTILES = 50;

// --- Contrôles souris ---
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let lastNetworkUpdate = 0;
const NETWORK_UPDATE_INTERVAL = 50; // Envoyer la position toutes les 50ms (20 fois/sec)

// --- Client multiplayer LAN ---
if (typeof MultiplayerClient !== 'undefined') {
    multiplayerClient = new MultiplayerClient();
    multiplayerClient.connect();
}

// --- Classes ---
class Tank {
    constructor(x, y, color, controls) {
        this.x = x; this.y = y;
        this.width = TANK_WIDTH; this.height = TANK_HEIGHT;
        this.color = color; this.darkerColor = shadeColor(color, -40);
        this.angle = 0;
        this.speed = 2; this.rotationSpeed = 0.04;
        this.controls = controls; this.keys = {};
        this.shootTimer = 0;
        
        this.maxHealth = MAX_HEALTH;
        this.currentHealth = this.maxHealth;
        this.collisionCooldown = 0;
        
        // Power-ups
        this.hasSpeedBoost = false;
        this.speedBoostTimer = 0;
        this.hasShield = false;
        this.shieldTimer = 0;
        this.hasTripleShot = false;
        this.baseSpeed = 2;
        
        // État eau
        this.inWater = false;
        this.waterSlowSpeed = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const healthBarWidth = this.height;
        const healthBarHeight = 8;
        ctx.fillStyle = '#500';
        ctx.fillRect(-healthBarWidth / 2, -this.height / 2 - 20, healthBarWidth, healthBarHeight);
        const currentHealthWidth = healthBarWidth * (this.currentHealth / this.maxHealth);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-healthBarWidth / 2, -this.height / 2 - 20, currentHealthWidth, healthBarHeight);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(-healthBarWidth / 2, -this.height / 2 - 20, healthBarWidth, healthBarHeight);
        
        // Afficher les power-ups actifs
        let iconOffset = 0;
        if (this.hasSpeedBoost) {
            ctx.fillStyle = '#00FFFF';
            ctx.font = '12px Arial';
            ctx.fillText('⚡', -healthBarWidth / 2 + iconOffset, -this.height / 2 - 25);
            iconOffset += 15;
        }
        if (this.hasShield) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '12px Arial';
            ctx.fillText('🛡', -healthBarWidth / 2 + iconOffset, -this.height / 2 - 25);
            iconOffset += 15;
        }
        if (this.hasTripleShot) {
            ctx.fillStyle = '#FF00FF';
            ctx.font = '12px Arial';
            ctx.fillText('⚔', -healthBarWidth / 2 + iconOffset, -this.height / 2 - 25);
        }

        ctx.rotate(this.angle);
        
        // Dessiner le bouclier si actif
        if (this.hasShield) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2 + 13, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width / 2 - 4, -this.height / 2, 8, this.height);
        ctx.fillRect(this.width / 2 - 4, -this.height / 2, 8, this.height);
        ctx.fillStyle = this.darkerColor;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.width / 2 * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.darkerColor; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#555';
        ctx.fillRect(-CANNON_WIDTH / 2, -this.height / 2 - CANNON_LENGTH + 15, CANNON_WIDTH, CANNON_LENGTH);
        if (this.shootTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, this.width / 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - this.shootTimer / SHOOT_COOLDOWN)), false); ctx.closePath(); ctx.fill();
        }
        
        ctx.restore();
    }

    update() {
        if (this.shootTimer > 0) this.shootTimer--;
        if (this.collisionCooldown > 0) this.collisionCooldown--;
        
        // Gestion des timers de power-ups
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer--;
            this.speed = this.baseSpeed * 1.5;
            if (this.speedBoostTimer === 0) {
                this.hasSpeedBoost = false;
                this.speed = this.baseSpeed;
            }
        }
        
        if (this.shieldTimer > 0) {
            this.shieldTimer--;
            if (this.shieldTimer === 0) {
                this.hasShield = false;
            }
        }

        // En mode LAN, seul le tank local peut être contrôlé
        const isLocalPlayer = (gameMode !== 'lan') || 
            (multiplayerClient && (
                (multiplayerClient.playerNumber === 1 && this === player1) ||
                (multiplayerClient.playerNumber === 2 && this === player2)
            ));
        
        // En mode LAN, le tank adverse ne fait RIEN localement (tout vient du réseau)
        if (gameMode === 'lan' && !isLocalPlayer) {
            // L'adversaire est interpolé dans gameLoop via interpolateOpponent()
            return;
        }

        // En mode IA : seulement joueur 1 utilise la souris
        // En mode LAN : le joueur local (player1 ou player2) utilise la souris
        const useMouseControls = (gameMode === 'ai' && this === player1) || 
                                 (gameMode === 'lan' && isLocalPlayer);
        const controls = (gameMode === 'lan') ? player1.controls : this.controls;
        
        // Préparer l'input pour le serveur (mode LAN)
        let input = null;
        if (gameMode === 'lan' && isLocalPlayer) {
            input = {
                forward: this.keys[controls.forward],
                backward: this.keys[controls.backward],
                rotateLeft: false,
                rotateRight: false,
                shoot: false,
                mouseAngle: null
            };
        }
        
        if (useMouseControls) {
            // Calculer l'angle vers la souris
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            this.angle = Math.atan2(dx, -dy);
            
            if (input) input.mouseAngle = this.angle;
        } else {
            // Rotation au clavier (mode PvP)
            if (this.keys[controls.rotateLeft]) {
                this.angle -= this.rotationSpeed;
                if (input) input.rotateLeft = true;
            }
            if (this.keys[controls.rotateRight]) {
                this.angle += this.rotationSpeed;
                if (input) input.rotateRight = true;
            }
        }
        
        // Mouvement (toujours au clavier)
        let moved = false;
        const moveX = Math.sin(this.angle) * this.speed;
        const moveY = -Math.cos(this.angle) * this.speed;
        let newX = this.x; let newY = this.y;

        if (this.keys[controls.forward]) { newX += moveX; newY += moveY; moved = true; }
        if (this.keys[controls.backward]) { newX -= moveX; newY -= moveY; moved = true; }
        
        // Système de glissement contre les murs
        if (!this.checkCollision(newX, newY)) {
            // Pas de collision - mouvement normal
            this.x = newX; 
            this.y = newY;
        } else if (moved) {
            // Collision - essayer de glisser
            // Essayer mouvement horizontal uniquement
            if (!this.checkCollision(newX, this.y)) {
                this.x = newX;
            }
            // Essayer mouvement vertical uniquement
            else if (!this.checkCollision(this.x, newY)) {
                this.y = newY;
            }
        }
        
        if (moved && Math.random() < 0.2) {
            particles.push(new Particle(this.x, this.y, 3, '#808080', 0.98, 0, -0.5));
        }

        // Tir : souris en mode IA/LAN, clavier en mode PvP
        let justShot = false;
        if (useMouseControls) {
            if (mouseDown && this.shootTimer <= 0) {
                this.shoot();
                this.shootTimer = SHOOT_COOLDOWN;
                justShot = true;
            }
        } else {
            if (this.keys[controls.shoot] && this.shootTimer <= 0) {
                this.shoot();
                this.shootTimer = SHOOT_COOLDOWN;
                justShot = true;
            }
        }
        
        // Envoyer shoot = true SEULEMENT au moment du tir
        if (input && justShot) {
            input.shoot = true;
        }
        
        // Envoyer l'input au serveur (mode LAN avec Client-Side Prediction)
        if (gameMode === 'lan' && multiplayerClient && isLocalPlayer && input) {
            multiplayerClient.sendInput(input);
        }
    }
    
    applyDamage(amount) {
        if (this.currentHealth > 0) {
            if (this.hasShield) {
                // Le bouclier absorbe les dégâts et affiche un effet
                playSound('hit'); // Son d'impact sur bouclier
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(
                        this.x + (Math.random() - 0.5) * 40,
                        this.y + (Math.random() - 0.5) * 40,
                        Math.random() * 3 + 1,
                        '#00FF00',
                        0.95,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3
                    ));
                }
                return; // Pas de dégâts
            }
            
            // Dégâts reçus
            this.currentHealth -= amount;
            playSound('damage'); // Son de dégâts
            triggerScreenShake(6, 12); // Screen shake plus fort quand touché
        }
    }

    checkCollision(nextX, nextY) { 
        if (nextX - this.width/2 < 0 || nextX + this.width/2 > canvas.width ||
            nextY - this.height/2 < 0 || nextY + this.height/2 > canvas.height) return true;
        for (const obstacle of obstacles) {
            if (nextX > obstacle.x - this.width/2 && nextX < obstacle.x + obstacle.width + this.width/2 &&
                nextY > obstacle.y - this.height/2 && nextY < obstacle.y + obstacle.height + this.height/2) return true;
        }
        return false;
    }

    shoot() {
        const cannonEndX = this.x + Math.sin(this.angle) * (CANNON_LENGTH);
        const cannonEndY = this.y - Math.cos(this.angle) * (CANNON_LENGTH);
        
        // Son de tir
        playSound('shoot');
        
        // En mode LAN, le serveur gère les projectiles (ne rien créer localement)
        if (gameMode !== 'lan') {
            if (this.hasTripleShot) {
                // Tir triple : un projectile droit et deux à ±15°
                projectiles.push(new Projectile(cannonEndX, cannonEndY, this.angle, this.color, this));
                projectiles.push(new Projectile(cannonEndX, cannonEndY, this.angle - 0.26, this.color, this));
                projectiles.push(new Projectile(cannonEndX, cannonEndY, this.angle + 0.26, this.color, this));
                this.hasTripleShot = false; // Utilisé une seule fois
                
                // Plus de particules pour le tir triple
                for (let i = 0; i < 30; i++) {
                    particles.push(new Particle(cannonEndX, cannonEndY, Math.random() * 4 + 1, '#FF00FF', 0.9, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7));
                }
                triggerScreenShake(5, 15);
            } else {
                // Tir normal
                projectiles.push(new Projectile(cannonEndX, cannonEndY, this.angle, this.color, this));
                
                for (let i = 0; i < 15; i++) {
                    particles.push(new Particle(cannonEndX, cannonEndY, Math.random() * 3 + 1, '#FFFF00', 0.9, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5));
                }
                triggerScreenShake(3, 10);
            }
        }
    }
}

class Projectile {
    constructor(x, y, angle, color, owner) {
        this.x = x; this.y = y; this.angle = angle;
        this.color = color; this.speed = PROJECTILE_SPEED; this.radius = PROJECTILE_RADIUS;
        this.owner = owner;
        this.trail = []; // Historique des positions pour la traînée
    }
    draw() {
        // Dessiner la traînée
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.radius * 1.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            
            for (let i = 0; i < this.trail.length - 1; i++) {
                const alpha = i / this.trail.length;
                ctx.globalAlpha = alpha * 0.6;
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
        
        // Dessiner le projectile principal
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }
    update() {
        // Ajouter position actuelle à la traînée
        this.trail.push({x: this.x, y: this.y});
        
        // Limiter la longueur de la traînée (8 positions)
        if (this.trail.length > 8) {
            this.trail.shift();
        }
        
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }
}

class Obstacle {
    constructor(x, y, width, height, destructible = false) {
        this.x = x; this.y = y; this.width = width; this.height = height;
        this.destructible = destructible;
        this.health = destructible ? 3 : Infinity;
        this.maxHealth = 3;
    }
    draw() {
        if (this.destructible) {
            // Obstacle destructible - couleur selon santé
            const healthRatio = this.health / this.maxHealth;
            const r = Math.floor(139 * healthRatio + 255 * (1 - healthRatio));
            const g = Math.floor(69 * healthRatio);
            const b = Math.floor(19 * healthRatio);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Cracks visuels selon dégâts
            if (this.health < this.maxHealth) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                for (let i = 0; i < (this.maxHealth - this.health); i++) {
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.random() * this.width, this.y);
                    ctx.lineTo(this.x + Math.random() * this.width, this.y + this.height);
                    ctx.stroke();
                }
            }
            
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else {
            // Obstacle indestructible classique
            ctx.fillStyle = '#4a2a0a';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
    
    takeDamage() {
        if (this.destructible && this.health > 0) {
            this.health--;
            return this.health <= 0; // Retourne true si détruit
        }
        return false;
    }
}

class HazardZone {
    constructor(x, y, width, height, type = 'lava') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'lava' ou 'water'
        this.animationTime = 0;
        this.damageTimer = {};
    }
    
    draw() {
        this.animationTime += 0.05;
        
        if (this.type === 'lava') {
            // Lave animée
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#FF4500');
            gradient.addColorStop(0.5, '#FF6347');
            gradient.addColorStop(1, '#8B0000');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Bulles de lave
            for (let i = 0; i < 5; i++) {
                const bubbleX = this.x + (i * this.width / 5) + Math.sin(this.animationTime + i) * 10;
                const bubbleY = this.y + this.height / 2 + Math.cos(this.animationTime * 2 + i) * 15;
                ctx.beginPath();
                ctx.arc(bubbleX, bubbleY, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
                ctx.fill();
            }
            
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'water') {
            // Eau animée
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#1E90FF');
            gradient.addColorStop(0.5, '#4169E1');
            gradient.addColorStop(1, '#000080');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Vagues
            ctx.strokeStyle = 'rgba(135, 206, 250, 0.5)';
            ctx.lineWidth = 2;
            for (let y = 0; y < this.height; y += 20) {
                ctx.beginPath();
                for (let x = 0; x < this.width; x += 5) {
                    const waveY = y + Math.sin((x + this.animationTime * 50) / 20) * 3;
                    if (x === 0) {
                        ctx.moveTo(this.x + x, this.y + waveY);
                    } else {
                        ctx.lineTo(this.x + x, this.y + waveY);
                    }
                }
                ctx.stroke();
            }
            
            ctx.strokeStyle = '#000080';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
    
    checkCollision(tank) {
        return tank.x > this.x && tank.x < this.x + this.width &&
               tank.y > this.y && tank.y < this.y + this.height;
    }
    
    applyEffect(tank) {
        if (this.type === 'lava') {
            // LAVE : Dégâts toutes les 30 frames (0.5 secondes)
            // Initialiser le timer pour ce tank
            if (!this.damageTimer[tank]) {
                this.damageTimer[tank] = 0;
            }
            
            this.damageTimer[tank]++;
            if (this.damageTimer[tank] >= 30) {
                tank.applyDamage(1);
                this.damageTimer[tank] = 0;
                
                // Effet visuel lave
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(
                        tank.x + (Math.random() - 0.5) * 30,
                        tank.y + (Math.random() - 0.5) * 30,
                        Math.random() * 3 + 1,
                        '#FF4500',
                        0.95,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2
                    ));
                }
            }
        } else if (this.type === 'water') {
            // EAU : Ralentissement à 50% de la vitesse normale
            if (!tank.inWater) {
                tank.inWater = true;
                tank.waterSlowSpeed = tank.speed * 0.5;
                tank.speed = tank.waterSlowSpeed;
            }
            
            // Petites bulles bleues pour l'effet visuel
            if (Math.random() < 0.1) {
                particles.push(new Particle(
                    tank.x + (Math.random() - 0.5) * 20,
                    tank.y + (Math.random() - 0.5) * 20,
                    Math.random() * 2 + 1,
                    '#1E90FF',
                    0.98,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 1
                ));
            }
        }
    }
    
    removeEffect(tank) {
        if (this.type === 'lava') {
            this.damageTimer[tank] = 0;
        } else if (this.type === 'water') {
            if (tank.inWater) {
                tank.inWater = false;
                // Restaurer la vitesse normale (baseSpeed ou avec boost)
                tank.speed = tank.hasSpeedBoost ? tank.baseSpeed * 1.5 : tank.baseSpeed;
            }
        }
    }
}

class Teleporter {
    constructor(x, y, linkedTeleporter = null) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.linkedTeleporter = linkedTeleporter;
        this.animationTime = 0;
        this.cooldown = {};
    }
    
    draw() {
        this.animationTime += 0.1;
        
        // Portail avec effet de rotation
        for (let r = this.radius; r > 0; r -= 5) {
            const alpha = (this.radius - r) / this.radius;
            const hue = (this.animationTime * 10 + r * 5) % 360;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Centre brillant
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00FFFF';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    checkCollision(tank) {
        const dx = tank.x - this.x;
        const dy = tank.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + tank.width / 2;
    }
    
    teleport(tank) {
        if (!this.linkedTeleporter) return false;
        
        // Cooldown par tank pour éviter les téléportations infinies
        if (!this.cooldown[tank]) {
            this.cooldown[tank] = 0;
        }
        
        if (this.cooldown[tank] <= 0) {
            // Son de téléportation
            playSound('teleport');
            
            tank.x = this.linkedTeleporter.x;
            tank.y = this.linkedTeleporter.y;
            
            // Cooldown de 2 secondes
            this.cooldown[tank] = 120;
            this.linkedTeleporter.cooldown[tank] = 120;
            
            // Effet visuel
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(
                    tank.x + (Math.random() - 0.5) * 50,
                    tank.y + (Math.random() - 0.5) * 50,
                    Math.random() * 4 + 2,
                    '#00FFFF',
                    0.95,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 8
                ));
            }
            
            triggerScreenShake(8, 15); // Screen shake pour téléportation
            
            return true;
        }
        return false;
    }
    
    update() {
        // Décrémenter les cooldowns
        for (let tank in this.cooldown) {
            if (this.cooldown[tank] > 0) {
                this.cooldown[tank]--;
            }
        }
    }
}

class Particle {
    constructor(x, y, radius, color, decay, velX = 0, velY = 0) {
        this.x = x; this.y = y;
        this.radius = radius; this.color = color; this.decay = decay;
        this.life = 1;
        this.velX = velX; this.velY = velY;
    }
    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.life *= this.decay;
        this.radius *= this.decay;
    }
    draw() {
        const rgb = hexToRgb(this.color);
        if (!rgb) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.life})`;
        ctx.fill();
        ctx.closePath();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'speed', 'shield', 'triple'
        this.radius = 15;
        this.collected = false;
        this.pulseTime = 0;
        
        // Définir les propriétés selon le type
        switch(type) {
            case 'speed':
                this.color = '#00FFFF';
                this.icon = '⚡';
                break;
            case 'shield':
                this.color = '#00FF00';
                this.icon = '🛡';
                break;
            case 'triple':
                this.color = '#FF00FF';
                this.icon = '⚔';
                break;
        }
    }
    
    draw() {
        this.pulseTime += 0.1;
        const pulse = Math.sin(this.pulseTime) * 3;
        
        // Ombre brillante
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Cercle externe qui pulse
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '40';
        ctx.fill();
        
        // Cercle interne
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Icône
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
    }
    
    checkCollision(tank) {
        const dx = tank.x - this.x;
        const dy = tank.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + tank.width / 2;
    }
    
    applyEffect(tank) {
        // Son de collecte de power-up
        playSound('powerup');
        
        switch(this.type) {
            case 'speed':
                tank.hasSpeedBoost = true;
                tank.speedBoostTimer = 60 * 10; // 10 secondes à 60 FPS
                break;
            case 'shield':
                tank.hasShield = true;
                tank.shieldTimer = 60 * 5; // 5 secondes
                break;
            case 'triple':
                tank.hasTripleShot = true;
                break;
        }
        
        // Effet visuel de collecte
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x,
                this.y,
                Math.random() * 4 + 2,
                this.color,
                0.95,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6
            ));
        }
        
        this.collected = true;
    }
}

class AIController {
    constructor(tank, player, difficulty) {
        this.tank = tank;
        this.player = player;
        this.difficulty = difficulty;
        
        // Paramètres selon la difficulté
        this.params = this.getDifficultyParams();
        this.updateInterval = this.params.updateFrequency;
        
        this.frameCounter = 0;
        this.targetAngle = 0;
        this.shouldShoot = false;
        this.dodgeTimer = 0;
        
        // Système anti-blocage robuste
        this.lastPosition = {x: tank.x, y: tank.y};
        this.stuckCounter = 0;
        this.unstuckTimer = 0;
        this.unstuckAngle = 0;
        
        // Prédiction avancée (technique FPS pro)
        this.playerHistory = [];
        this.playerVelocity = {x: 0, y: 0};
        this.playerAcceleration = {x: 0, y: 0};
        this.lastPlayerVelocity = {x: 0, y: 0};
        
        // États tactiques avec FSM (Finite State Machine)
        this.state = 'ENGAGE'; // ENGAGE, FLANK, RETREAT, AMBUSH, HUNT
        this.stateTimer = 0;
        this.lastStateChange = 0;
        
        // Système de menaces multiples
        this.threats = [];
        this.primaryThreat = null;
        
        // Tir prédictif avancé
        this.lastShotTime = 0;
        this.shotAccuracy = [];
        this.consecutiveHits = 0;
        this.consecutiveMisses = 0;
        
        // Positionnement tactique
        this.tacticalPoints = [];
        this.currentTacticalPoint = null;
        this.repositionTimer = 0;
        
        // Learning / Adaptation
        this.playerBehaviorProfile = {
            isAggressive: 0.5,
            movementPredictability: 0.5,
            preferredDistance: 300,
            dodgingSkill: 0.5
        };
        
        this.lastPlayerHealth = player.currentHealth;
    }
    
    getDifficultyParams() {
        switch(this.difficulty) {
            case 'easy':
                return {
                    reactionSpeed: 0.04,
                    aimAccuracy: 0.65,
                    shootFrequency: 0.15,      // Tire BEAUCOUP plus
                    shootCooldown: 400,         // Cooldown réduit
                    dodgeChance: 0.3,
                    updateFrequency: 8,
                    predictionSkill: 0.4,
                    aggressiveness: 0.6,        // Plus agressif
                    repositionFrequency: 150
                };
            case 'medium':
                return {
                    reactionSpeed: 0.05,
                    aimAccuracy: 0.8,
                    shootFrequency: 0.25,      // Tire très souvent
                    shootCooldown: 350,
                    dodgeChance: 0.5,
                    updateFrequency: 5,
                    predictionSkill: 0.7,
                    aggressiveness: 0.75,
                    repositionFrequency: 120
                };
            case 'hard':
                return {
                    reactionSpeed: 0.06,
                    aimAccuracy: 0.92,
                    shootFrequency: 0.35,      // Tire constamment
                    shootCooldown: 300,
                    dodgeChance: 0.7,
                    updateFrequency: 3,
                    predictionSkill: 0.9,
                    aggressiveness: 0.85,
                    repositionFrequency: 90
                };
            case 'impossible':
                return {
                    reactionSpeed: 0.08,
                    aimAccuracy: 0.98,
                    shootFrequency: 0.5,       // Tire TOUT LE TEMPS
                    shootCooldown: 250,         // Cooldown minimal
                    dodgeChance: 0.9,
                    updateFrequency: 2,
                    predictionSkill: 0.99,
                    aggressiveness: 0.95,
                    repositionFrequency: 60
                };
            default:
                return this.getDifficultyParams.call({difficulty: 'medium'});
        }
    }
    
    update() {
        this.frameCounter++;
        
        // Anti-blocage prioritaire
        if (this.detectStuck()) {
            this.executeUnstuck();
            return;
        }
        
        // Mise à jour des décisions tactiques
        if (this.frameCounter % this.updateInterval === 0) {
            this.updateThreatAssessment();
            this.updateFSM();
            this.updatePlayerPrediction();
            this.makeDecision();
        }
        
        // Exécuter les actions
        this.executeMovement();
        this.executeAiming();
        this.executeShooting();
    }
    
    detectStuck() {
        const dist = Math.sqrt(
            Math.pow(this.tank.x - this.lastPosition.x, 2) +
            Math.pow(this.tank.y - this.lastPosition.y, 2)
        );
        
        if (this.frameCounter % 20 === 0) {
            if (dist < 2) {
                this.stuckCounter++;
                if (this.stuckCounter > 3) {
                    this.unstuckTimer = 90;
                    this.unstuckAngle = Math.random() * Math.PI * 2;
                    this.stuckCounter = 0;
                    return true;
                }
            } else {
                this.stuckCounter = 0;
            }
            this.lastPosition = {x: this.tank.x, y: this.tank.y};
        }
        
        return this.unstuckTimer > 0;
    }
    
    executeUnstuck() {
        this.unstuckTimer--;
        this.targetAngle = this.unstuckAngle;
        // Tourner aléatoirement pour se débloquer
        if (this.unstuckTimer % 20 === 0) {
            this.unstuckAngle += (Math.random() - 0.5) * Math.PI;
        }
    }
    
    makeDecisions() {
        // Détecter si bloqué
        const distMoved = Math.sqrt(
            Math.pow(this.tank.x - this.lastPosition.x, 2) + 
            Math.pow(this.tank.y - this.lastPosition.y, 2)
        );
        
        if (distMoved < 1 && this.frameCounter % 30 === 0) {
            this.stuckCounter++;
            if (this.stuckCounter > 2) {
                this.forceAvoidanceTimer = 60;
                this.stuckCounter = 0;
            }
        } else if (distMoved > 2) {
            this.stuckCounter = 0;
        }
        
        this.lastPosition = {x: this.tank.x, y: this.tank.y};
        
        // PRIORITÉ 1: Éviter les murs et obstacles (toujours prioritaire)
        const avoidanceAngle = this.checkObstacleAndWallAvoidance();
        if (avoidanceAngle !== null || this.forceAvoidanceTimer > 0) {
            if (this.forceAvoidanceTimer > 0) {
                this.forceAvoidanceTimer--;
                this.targetAngle = this.tank.angle + (Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3);
            } else {
                this.targetAngle = avoidanceAngle;
            }
            this.avoidancePriority = true;
            return;
        }
        
        this.avoidancePriority = false;
        
        // PRIORITÉ 2: Éviter les projectiles
        const projectileThreat = this.analyzeProjectileThreat();
        if (projectileThreat) {
            this.targetAngle = projectileThreat.dodgeAngle;
            this.dodgeTimer = 30;
            return;
        }
        
        // Analyser la situation tactique
        this.updateTacticalMode();
        
        // PRIORITÉ 3: Comportement tactique selon le mode
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let angleToPlayer = Math.atan2(dx, -dy);
        
        // Prédiction du mouvement du joueur
        const predictedAngle = this.predictPlayerMovement(angleToPlayer, distance);
        
        // Ajouter de l'imprécision selon la difficulté
        const inaccuracy = (1 - this.params.aimAccuracy) * (Math.random() - 0.5) * Math.PI / 4;
        
        // Comportement selon le mode tactique
        switch(this.tacticalMode) {
            case 'aggressive':
                // Foncer directement avec prédiction + zigzag si en danger
                if (distance < 180 && this.params.tacticalIntelligence > 0.6) {
                    // Trop proche : zigzag pour esquiver
                    const zigzag = Math.sin(this.frameCounter * 0.1) * 0.3;
                    this.targetAngle = predictedAngle + inaccuracy + zigzag;
                } else {
                    this.targetAngle = predictedAngle + inaccuracy;
                }
                break;
                
            case 'defensive':
                // Garder distance optimale (250-300px) et tirer
                if (distance < 250) {
                    // Trop proche, reculer en gardant alignement
                    this.targetAngle = angleToPlayer + Math.PI + inaccuracy;
                } else if (distance > 350) {
                    // Trop loin, se rapprocher
                    this.targetAngle = predictedAngle + inaccuracy;
                } else {
                    // Distance idéale : strafing latéral
                    const strafeAngle = angleToPlayer + (Math.PI / 2) * this.circleDirection;
                    this.targetAngle = strafeAngle + inaccuracy;
                    if (Math.random() < 0.02) this.circleDirection *= -1;
                }
                break;
                
            case 'flanking':
                // Tourner autour du joueur en spirale
                const spiralFactor = Math.max(0.5, distance / 300);
                const flankerAngle = angleToPlayer + (Math.PI / 2) * this.circleDirection * spiralFactor;
                this.targetAngle = flankerAngle + inaccuracy;
                
                // Adaptation dynamique de direction
                if (Math.random() < 0.015) {
                    this.circleDirection *= -1;
                }
                
                // Si trop proche, élargir le cercle
                if (distance < 200) {
                    this.targetAngle += Math.PI / 6 * this.circleDirection;
                }
                break;
                
            case 'ambush':
                // Utiliser les obstacles comme cover
                if (this.targetCover) {
                    const coverDx = this.targetCover.x - this.tank.x;
                    const coverDy = this.targetCover.y - this.tank.y;
                    const coverDist = Math.sqrt(coverDx * coverDx + coverDy * coverDy);
                    
                    if (coverDist > 50) {
                        // Aller vers le cover
                        this.targetAngle = Math.atan2(coverDx, -coverDy);
                    } else {
                        // Derrière cover : peek and shoot
                        this.inCover = true;
                        if (this.checkLineOfSight()) {
                            // Ligne de vue : tirer
                            this.targetAngle = predictedAngle + inaccuracy;
                        } else {
                            // Pas de ligne de vue : repositionner
                            const peekAngle = angleToPlayer + (Math.random() - 0.5) * Math.PI / 3;
                            this.targetAngle = peekAngle;
                        }
                    }
                } else {
                    // Pas de cover : chercher position tactique
                    const tacticalAngle = angleToPlayer + (Math.PI * 0.75) * this.circleDirection;
                    this.targetAngle = tacticalAngle + inaccuracy;
                }
                break;
        }
        
        // Décider de tirer de manière intelligente
        this.decideShooting(distance, predictedAngle);
    }
    
    updateTacticalMode() {
        this.tacticalTimer--;
        this.coverTimer--;
        
        // Analyser la situation tactique
        const healthRatio = this.tank.currentHealth / this.tank.maxHealth;
        const playerHealthRatio = this.player.currentHealth / this.player.maxHealth;
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Utiliser cover si disponible et intelligent
        if (this.params.coverUsage > 0.5 && this.coverTimer <= 0) {
            const cover = this.findNearestCover();
            if (cover && (healthRatio < 0.5 || !this.checkLineOfSight())) {
                this.targetCover = cover;
                this.coverTimer = 180;
                this.tacticalMode = 'ambush';
                return;
            }
        }
        
        // Changer de mode tactique périodiquement
        if (this.tacticalTimer <= 0) {
            const random = Math.random();
            const intelligence = this.params.tacticalIntelligence;
            
            if (healthRatio < 0.3) {
                // Santé critique : cover + défensif
                this.tacticalMode = intelligence > 0.6 ? 'ambush' : 'defensive';
                this.tacticalTimer = 150;
            } else if (healthRatio < 0.5 && distance < 250) {
                // Santé moyenne + trop proche : retraite tactique
                this.tacticalMode = 'defensive';
                this.tacticalTimer = 100;
            } else if (playerHealthRatio < 0.4 && this.params.aggressionLevel > 0.5) {
                // Joueur blessé : pression agressive
                this.tacticalMode = 'aggressive';
                this.tacticalTimer = 120;
            } else if (distance > 350 && intelligence > 0.7) {
                // Loin : flanking pour approche
                this.tacticalMode = 'flanking';
                this.tacticalTimer = 200;
            } else if (random < this.params.aggressionLevel * 0.8) {
                // Mode agressif calculé
                this.tacticalMode = 'aggressive';
                this.tacticalTimer = 100;
            } else if (random < 0.6 && intelligence > 0.5) {
                // Embuscade tactique
                this.tacticalMode = 'ambush';
                this.tacticalTimer = 180;
            } else if (random < 0.8) {
                // Flanking pour surprendre
                this.tacticalMode = 'flanking';
                this.tacticalTimer = 150;
            } else {
                this.tacticalMode = 'defensive';
                this.tacticalTimer = 120;
            }
        }
        
        // Détecter si on a touché le joueur
        if (this.player.currentHealth < this.lastPlayerHealth) {
            this.shotsHit++;
            // Succès : continuer le mode actuel
            this.tacticalTimer += 30;
        }
        this.lastPlayerHealth = this.player.currentHealth;
    }
    
    predictPlayerMovement(angleToPlayer, distance) {
        // Tracker la vélocité réelle du joueur
        this.playerHistory.push({x: this.player.x, y: this.player.y, time: Date.now()});
        if (this.playerHistory.length > 10) this.playerHistory.shift();
        
        // Calculer la vélocité moyenne du joueur
        if (this.playerHistory.length >= 3) {
            const recent = this.playerHistory.slice(-3);
            const dt = (recent[2].time - recent[0].time) / 1000;
            if (dt > 0) {
                this.playerVelocity.x = (recent[2].x - recent[0].x) / dt;
                this.playerVelocity.y = (recent[2].y - recent[0].y) / dt;
            }
        }
        
        // Calculer le temps pour que le projectile atteigne la cible
        const timeToHit = distance / PROJECTILE_SPEED;
        
        // Prédire la position future basée sur la vélocité réelle
        const predictionFactor = this.params.predictionSkill;
        const predictedX = this.player.x + (this.playerVelocity.x * timeToHit * predictionFactor);
        const predictedY = this.player.y + (this.playerVelocity.y * timeToHit * predictionFactor);
        
        // Apprendre les patterns de mouvement
        this.analyzePlayerPatterns();
        
        // Ajuster selon les patterns détectés
        let finalX = predictedX;
        let finalY = predictedY;
        
        if (this.playerPatterns.circlingTendency > 0.6 && this.params.tacticalIntelligence > 0.7) {
            // Joueur tourne en cercle : anticiper la trajectoire circulaire
            const circleAdjust = Math.PI / 6 * this.playerPatterns.circlingTendency;
            const adjustedAngle = Math.atan2(finalX - this.tank.x, -(finalY - this.tank.y)) + circleAdjust;
            finalX = this.tank.x + Math.sin(adjustedAngle) * distance;
            finalY = this.tank.y - Math.cos(adjustedAngle) * distance;
        }
        
        return Math.atan2(finalX - this.tank.x, -(finalY - this.tank.y));
    }
    
    analyzePlayerPatterns() {
        if (this.playerHistory.length < 5) return;
        
        // Détecter mouvement circulaire
        const angles = [];
        for (let i = 1; i < this.playerHistory.length; i++) {
            const dx = this.playerHistory[i].x - this.playerHistory[i-1].x;
            const dy = this.playerHistory[i].y - this.playerHistory[i-1].y;
            angles.push(Math.atan2(dy, dx));
        }
        
        // Mesurer le changement d'angle constant (= mouvement circulaire)
        let angleChanges = 0;
        for (let i = 1; i < angles.length; i++) {
            const diff = Math.abs(this.normalizeAngle(angles[i] - angles[i-1]));
            if (diff > 0.1 && diff < 0.5) angleChanges++;
        }
        
        this.playerPatterns.circlingTendency = angleChanges / (angles.length - 1);
        
        // Mesurer l'agressivité (distance au tank IA)
        const avgDist = this.playerHistory.reduce((sum, pos) => {
            const dx = pos.x - this.tank.x;
            const dy = pos.y - this.tank.y;
            return sum + Math.sqrt(dx * dx + dy * dy);
        }, 0) / this.playerHistory.length;
        
        this.playerPatterns.aggressiveness = 1 - Math.min(1, avgDist / 400);
    }
    
    analyzeProjectileThreat() {
        this.dodgeTimer--;
        if (this.dodgeTimer > 0) return null;
        
        let closestThreat = null;
        let closestDist = Infinity;
        
        for (const proj of projectiles) {
            if (proj.owner === this.player) {
                const pdx = proj.x - this.tank.x;
                const pdy = proj.y - this.tank.y;
                const projDist = Math.sqrt(pdx * pdx + pdy * pdy);
                
                // Calculer si le projectile se dirige vers nous
                const projAngle = proj.angle;
                const angleToUs = Math.atan2(-pdx, pdy);
                const angleDiff = Math.abs(this.normalizeAngle(projAngle - angleToUs));
                
                // Menace si projectile se dirige vers nous
                if (projDist < 200 && angleDiff < Math.PI / 3 && projDist < closestDist) {
                    closestDist = projDist;
                    closestThreat = proj;
                }
            }
        }
        
        if (closestThreat && Math.random() < this.params.dodgeChance) {
            const pdx = closestThreat.x - this.tank.x;
            const pdy = closestThreat.y - this.tank.y;
            
            // Esquiver perpendiculairement
            const dodgeAngle = Math.atan2(pdx, -pdy) + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
            return { dodgeAngle, threat: closestThreat };
        }
        
        return null;
    }
    
    decideShooting(distance, predictedAngle) {
        if (this.tank.shootTimer > 0) return;
        
        const angleDiff = Math.abs(this.normalizeAngle(this.tank.angle - predictedAngle));
        
        // Conditions de tir améliorées
        const isAligned = angleDiff < 0.25;
        const isInRange = distance > 100 && distance < 500;
        const hasLineOfSight = this.checkLineOfSight();
        
        // Tir basé sur l'alignement et la difficulté
        if (isAligned && isInRange && hasLineOfSight) {
            const shootProb = this.params.shootChance * (1 + (1 - angleDiff / 0.25));
            if (Math.random() < shootProb) {
                this.shouldShoot = true;
                this.shotsFired++;
            }
        }
    }
    
    findNearestCover() {
        let nearestCover = null;
        let nearestDist = Infinity;
        
        for (const obs of obstacles) {
            // Centre de l'obstacle
            const coverX = obs.x + obs.width / 2;
            const coverY = obs.y + obs.height / 2;
            
            const dx = coverX - this.tank.x;
            const dy = coverY - this.tank.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Vérifier que l'obstacle est entre nous et le joueur
            const angleToObs = Math.atan2(dx, -dy);
            const angleToPlayer = Math.atan2(this.player.x - this.tank.x, -(this.player.y - this.tank.y));
            const angleDiff = Math.abs(this.normalizeAngle(angleToObs - angleToPlayer));
            
            // Bon cover si entre nous et joueur
            if (dist < nearestDist && dist < 300 && angleDiff < Math.PI / 3) {
                nearestDist = dist;
                nearestCover = obs;
            }
        }
        
        return nearestCover;
    }
    
    checkLineOfSight() {
        // Vérifier s'il y a un obstacle entre l'IA et le joueur
        const steps = 20;
        const dx = (this.player.x - this.tank.x) / steps;
        const dy = (this.player.y - this.tank.y) / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkX = this.tank.x + dx * i;
            const checkY = this.tank.y + dy * i;
            
            for (const obs of obstacles) {
                if (checkX > obs.x && checkX < obs.x + obs.width &&
                    checkY > obs.y && checkY < obs.y + obs.height) {
                    return false;
                }
            }
        }
        return true;
    }
    
    checkObstacleAndWallAvoidance() {
        const lookAheadDist = 100;
        const lateralCheck = 40;
        
        // Vérifier plusieurs points devant le tank
        const checkPoints = [
            { // Devant
                x: this.tank.x + Math.sin(this.tank.angle) * lookAheadDist,
                y: this.tank.y - Math.cos(this.tank.angle) * lookAheadDist
            },
            { // Devant-gauche
                x: this.tank.x + Math.sin(this.tank.angle - 0.5) * lookAheadDist,
                y: this.tank.y - Math.cos(this.tank.angle - 0.5) * lookAheadDist
            },
            { // Devant-droite
                x: this.tank.x + Math.sin(this.tank.angle + 0.5) * lookAheadDist,
                y: this.tank.y - Math.cos(this.tank.angle + 0.5) * lookAheadDist
            }
        ];
        
        // Vérifier la position actuelle et immédiate
        const margin = 45;
        const dangerMargin = 30;
        
        // Détection de danger immédiat (très proche du mur)
        const isDangerLeft = this.tank.x < dangerMargin;
        const isDangerRight = this.tank.x > canvas.width - dangerMargin;
        const isDangerTop = this.tank.y < dangerMargin;
        const isDangerBottom = this.tank.y > canvas.height - dangerMargin;
        
        if (isDangerLeft || isDangerRight || isDangerTop || isDangerBottom) {
            // Direction vers le centre avec urgence
            const centerAngle = Math.atan2(canvas.width / 2 - this.tank.x, -(canvas.height / 2 - this.tank.y));
            return centerAngle;
        }
        
        // Détection de proximité aux murs
        const isNearLeft = this.tank.x < margin;
        const isNearRight = this.tank.x > canvas.width - margin;
        const isNearTop = this.tank.y < margin;
        const isNearBottom = this.tank.y > canvas.height - margin;
        
        // Vérifier si on se dirige vers un mur
        for (const point of checkPoints) {
            if (point.x < margin || point.x > canvas.width - margin || 
                point.y < margin || point.y > canvas.height - margin) {
                // Calculer un angle sûr vers le centre
                const safeCenterAngle = Math.atan2(canvas.width / 2 - this.tank.x, -(canvas.height / 2 - this.tank.y));
                return safeCenterAngle;
            }
        }
        
        // Si proche d'un mur, tourner de manière préventive
        if (isNearLeft && Math.sin(this.tank.angle) < 0) {
            return this.tank.angle + Math.PI / 4;
        }
        if (isNearRight && Math.sin(this.tank.angle) > 0) {
            return this.tank.angle - Math.PI / 4;
        }
        if (isNearTop && Math.cos(this.tank.angle) > 0) {
            return this.tank.angle + Math.PI / 4;
        }
        if (isNearBottom && Math.cos(this.tank.angle) < 0) {
            return this.tank.angle - Math.PI / 4;
        }
        
        // Vérifier les obstacles
        for (const point of checkPoints) {
            for (const obs of obstacles) {
                if (point.x > obs.x - 30 && point.x < obs.x + obs.width + 30 &&
                    point.y > obs.y - 30 && point.y < obs.y + obs.height + 30) {
                    
                    // Calculer la direction pour contourner l'obstacle
                    const obsCenterX = obs.x + obs.width / 2;
                    const obsCenterY = obs.y + obs.height / 2;
                    const dx = this.tank.x - obsCenterX;
                    const dy = this.tank.y - obsCenterY;
                    
                    // Angle pour s'éloigner de l'obstacle
                    const avoidAngle = Math.atan2(dx, -dy);
                    return avoidAngle;
                }
            }
        }
        
        return null;
    }
    
    executeActions() {
        // Réinitialiser UNIQUEMENT les touches du tank de l'IA
        Object.values(this.tank.controls).forEach(controlKey => {
            this.tank.keys[controlKey] = false;
        });
        
        // Décrémenter les locks
        if (this.rotationLock > 0) this.rotationLock--;
        if (this.movementLock > 0) this.movementLock--;
        
        // === ROTATION STABILISÉE ===
        let angleDiff = this.normalizeAngle(this.targetAngle - this.tank.angle);
        
        // Seuil de rotation (évite les micro-ajustements)
        const rotationThreshold = 0.08;
        
        if (Math.abs(angleDiff) > rotationThreshold) {
            if (angleDiff > 0) {
                this.tank.keys[this.tank.controls.rotateRight] = true;
            } else {
                this.tank.keys[this.tank.controls.rotateLeft] = true;
            }
        }
        
        // === MOUVEMENT INTELLIGENT ===
        const nextX = this.tank.x + Math.sin(this.tank.angle) * this.tank.speed;
        const nextY = this.tank.y - Math.cos(this.tank.angle) * this.tank.speed;
        const wouldCollide = this.tank.checkCollision(nextX, nextY);
        
        // En mode déblocage : reculer
        if (this.forceAvoidanceTimer > 30 && this.escapeAttempts > 0) {
            this.tank.keys[this.tank.controls.backward] = true;
        }
        // Si collision imminente et en évitement : reculer
        else if (wouldCollide && this.avoidancePriority) {
            this.tank.keys[this.tank.controls.backward] = true;
        }
        // Sinon avancer si bien aligné et pas de collision
        else if (!wouldCollide && this.dodgeTimer <= 0) {
            // Ne pas avancer si trop mal orienté (évite le zigzag)
            if (Math.abs(angleDiff) < Math.PI / 2.5) {
                this.tank.keys[this.tank.controls.forward] = true;
            }
        }
        
        // === TIR ===
        if (this.shouldShoot && !this.avoidancePriority && Math.abs(angleDiff) < 0.4) {
            this.tank.keys[this.tank.controls.shoot] = true;
            this.shouldShoot = false;
        }
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
}

function createExplosion(x, y, color) {
    playSound('explosion'); // Son d'explosion
    for (let i = 0; i < 50; i++) {
        const speed = Math.random() * 5 + 2;
        const angle = Math.random() * Math.PI * 2;
        const velX = Math.cos(angle) * speed;
        const velY = Math.sin(angle) * speed;
        particles.push(new Particle(x, y, Math.random() * 4 + 2, color, 0.95, velX, velY));
    }
}

const player1 = new Tank(100, 300, '#00BFFF', { forward: 'KeyW', rotateLeft: 'KeyA', backward: 'KeyS', rotateRight: 'KeyD', shoot: 'Space' });
const player2 = new Tank(700, 300, '#FF4500', { forward: 'ArrowUp', rotateLeft: 'ArrowLeft', backward: 'ArrowDown', rotateRight: 'ArrowRight', shoot: 'Enter' });
const players = [player1, player2];

window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
    
    // Touche ESC pour pause/menu
    if (e.code === 'Escape' && gameState === 'RUNNING') {
        togglePauseMenu();
        return;
    }
    
    // En mode LAN, activer seulement les contrôles du joueur local avec ZQSD + Espace
    if (gameMode === 'lan' && multiplayerClient) {
        const localPlayer = multiplayerClient.playerNumber === 1 ? player1 : player2;
        // Utiliser les contrôles du joueur 1 (ZQSD + Espace) pour les deux joueurs
        if (Object.values(player1.controls).includes(e.code)) {
            localPlayer.keys[e.code] = true;
        }
    } else {
        players.forEach(p => { if (Object.values(p.controls).includes(e.code)) p.keys[e.code] = true; });
    }
});
window.addEventListener('keyup', (e) => { 
    if (gameMode === 'lan' && multiplayerClient) {
        const localPlayer = multiplayerClient.playerNumber === 1 ? player1 : player2;
        // Utiliser les contrôles du joueur 1 (ZQSD + Espace) pour les deux joueurs
        if (Object.values(player1.controls).includes(e.code)) {
            localPlayer.keys[e.code] = false;
        }
    } else {
        players.forEach(p => { if (Object.values(p.controls).includes(e.code)) p.keys[e.code] = false; });
    }
});

// Event listeners pour la souris (visée et tir en mode IA et LAN)
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Clic gauche
        mouseDown = true;
        e.preventDefault();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        mouseDown = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
});

// ============================
// CONTRÔLES TACTILES (MOBILE)
// ============================

// Initialiser uniquement si c'est un vrai appareil mobile/tablette
if (isMobileDevice) {
    const touchControls = document.getElementById('touch-controls');
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const shootButton = document.getElementById('shoot-button');

    // Gestion du joystick
    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
    joystickActive = true;
    const rect = joystickContainer.getBoundingClientRect();
    joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
    updateJoystick(e.touches[0]);
});

joystickContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (joystickActive) {
        updateJoystick(e.touches[0]);
    }
});

joystickContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystickActive = false;
    joystickPosition = { x: 0, y: 0 };
    joystickStick.style.transform = 'translate(-50%, -50%)';
    
    // Arrêter le mouvement du tank
    if (player1) {
        player1.keys = {};
    }
});

function updateJoystick(touch) {
    const dx = touch.clientX - joystickCenter.x;
    const dy = touch.clientY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 45;
    
    // Limiter la distance
    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    
    joystickPosition = {
        x: Math.cos(angle) * limitedDistance,
        y: Math.sin(angle) * limitedDistance
    };
    
    // Déplacer visuellement le stick
    joystickStick.style.transform = `translate(calc(-50% + ${joystickPosition.x}px), calc(-50% + ${joystickPosition.y}px))`;
    
    // Appliquer le mouvement au tank
    if (player1 && gameState === 'RUNNING') {
        // Convertir en contrôles directionnels
        const threshold = 0.3;
        const normalizedX = joystickPosition.x / maxDistance;
        const normalizedY = joystickPosition.y / maxDistance;
        
        player1.keys = {};
        
        // Avancer/Reculer
        if (normalizedY < -threshold) {
            player1.keys['KeyZ'] = true; // Avancer
        } else if (normalizedY > threshold) {
            player1.keys['KeyS'] = true; // Reculer
        }
        
        // Tourner
        if (normalizedX < -threshold) {
            player1.keys['KeyQ'] = true; // Gauche
        } else if (normalizedX > threshold) {
            player1.keys['KeyD'] = true; // Droite
        }
    }
}

// Gestion du bouton de tir
shootButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchShootActive = true;
    if (player1 && gameState === 'RUNNING') {
        player1.keys['Space'] = true;
    }
});

    shootButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchShootActive = false;
        if (player1) {
            player1.keys['Space'] = false;
        }
    });
}

// Event listeners pour le menu
modePvpButton.addEventListener('click', () => {
    gameMode = 'pvp';
    modePvpButton.classList.add('selected');
    modeAiButton.classList.remove('selected');
    modeLanButton.classList.remove('selected');
    difficultySelection.style.display = 'none';
    startButton.style.display = 'block';
    difficultyButtons.forEach(btn => btn.classList.remove('selected'));
    aiDifficulty = null;
    
    // Afficher contrôles clavier
    controlsText.style.display = 'block';
    controlsMouse.style.display = 'none';
});

modeAiButton.addEventListener('click', () => {
    gameMode = 'ai';
    modeAiButton.classList.add('selected');
    modePvpButton.classList.remove('selected');
    modeLanButton.classList.remove('selected');
    difficultySelection.style.display = 'block';
    startButton.style.display = aiDifficulty ? 'block' : 'none';
    
    // Afficher contrôles souris
    controlsText.style.display = 'none';
    controlsMouse.style.display = 'block';
});

modeLanButton.addEventListener('click', () => {
    if (!multiplayerClient || !multiplayerClient.connected) {
        alert('Connexion au serveur impossible.\nAssurez-vous que le serveur est démarré avec: npm start');
        return;
    }
    
    gameMode = 'lan';
    modeLanButton.classList.add('selected');
    modePvpButton.classList.remove('selected');
    modeAiButton.classList.remove('selected');
    difficultySelection.style.display = 'none';
    
    // Afficher contrôles souris
    controlsText.style.display = 'none';
    controlsMouse.style.display = 'block';
    
    // Lancer immédiatement la recherche
    menuScreen.style.display = 'none';
    gameState = 'MULTIPLAYER';
    multiplayerClient.findMatch();
    showMessage('🔍 Recherche d\'un adversaire...', 0);
});

difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        aiDifficulty = btn.dataset.difficulty;
        difficultyButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        startButton.style.display = 'block';
    });
});

// Sélection de map
const mapButtons = document.querySelectorAll('.map-button');
mapButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentMap = btn.dataset.map;
        mapButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

startButton.addEventListener('click', () => {
    if (!gameMode) return;
    if (gameMode === 'ai' && !aiDifficulty) return;
    
    menuScreen.style.display = 'none';
    
    // Afficher le bouton pause
    document.getElementById('pause-button').style.display = 'block';
    
    // Afficher les contrôles tactiles uniquement sur mobile/tablette
    if (isMobileDevice) {
        document.getElementById('touch-controls').style.display = 'block';
    }
    
    // Démarrer la musique de fond
    sounds.music.play().catch(e => console.log('Musique non disponible'));
    
    // Réinitialiser le jeu
    currentLevel = 1;
    scores = { player1: 0, player2: 0 };
    
    // Créer l'IA si nécessaire
    if (gameMode === 'ai') {
        aiController = new ProAIController(player2, player1, aiDifficulty);
    } else {
        aiController = null;
    }
    
    gameState = 'STARTING';
    showMessage('Prêts ?', 2000, startRound);
});

// Bouton pause pendant le jeu
document.getElementById('pause-game-btn').addEventListener('click', () => {
    togglePauseMenu();
});

// ============================
// EVENT LISTENERS POUR L'AUTHENTIFICATION
// ============================

// Bouton de connexion
document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (AccountSystem.login(username, password)) {
        // Connexion réussie
    }
});

// Bouton d'inscription
document.getElementById('register-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    AccountSystem.register(username, email, password);
});

// Bouton mode invité
document.getElementById('guest-mode').addEventListener('click', () => {
    AccountSystem.guestMode();
});

// Bouton de déconnexion
document.getElementById('corner-logout-btn').addEventListener('click', () => {
    AccountSystem.logout();
});

// Bouton d'affichage des statistiques
document.getElementById('corner-stats-btn').addEventListener('click', () => {
    AccountSystem.showStats();
});

// Bouton de fermeture du modal statistiques
document.getElementById('close-stats').addEventListener('click', () => {
    document.getElementById('stats-modal').style.display = 'none';
});

// Fermer le modal en cliquant en dehors
document.getElementById('stats-modal').addEventListener('click', (e) => {
    if (e.target.id === 'stats-modal') {
        document.getElementById('stats-modal').style.display = 'none';
    }
});

// Gestion de la touche Entrée dans les champs de connexion
document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});

// Sauvegarder automatiquement avant de fermer la page
window.addEventListener('beforeunload', () => {
    if (AccountSystem.currentUser && !AccountSystem.currentUser.isGuest) {
        const accounts = AccountSystem.loadAccounts();
        accounts[AccountSystem.currentUser.username] = {
            password: AccountSystem.currentUser.password,
            email: AccountSystem.currentUser.email,
            stats: AccountSystem.currentUser.stats,
            matchHistory: AccountSystem.currentUser.matchHistory
        };
        AccountSystem.saveAccounts(accounts);
    }
});

// La vérification de session est gérée par account-system.js

// Configuration des différentes maps
const MAPS = {
    classic: {
        name: 'Classique',
        generateObstacles: () => {
            obstacles = [];
            const obstacleCount = 3 + currentLevel;
            for (let i = 0; i < obstacleCount; i++) {
                const width = 50 + Math.random() * 50;
                const height = 50 + Math.random() * 50;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, false));
            }
        },
        generateHazards: () => { hazardZones = []; },
        generateTeleporters: () => { teleporters = []; }
    },
    
    destructible: {
        name: 'Destructible',
        generateObstacles: () => {
            obstacles = [];
            // Mélange d'obstacles normaux et destructibles
            for (let i = 0; i < 3; i++) {
                const width = 60 + Math.random() * 40;
                const height = 60 + Math.random() * 40;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, false)); // Indestructible
            }
            for (let i = 0; i < 4; i++) {
                const width = 50 + Math.random() * 30;
                const height = 50 + Math.random() * 30;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, true)); // Destructible
            }
        },
        generateHazards: () => { hazardZones = []; },
        generateTeleporters: () => { teleporters = []; }
    },
    
    lava: {
        name: 'Enfer de Lave',
        generateObstacles: () => {
            obstacles = [];
            for (let i = 0; i < 4; i++) {
                const width = 50 + Math.random() * 40;
                const height = 50 + Math.random() * 40;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, false));
            }
        },
        generateHazards: () => {
            hazardZones = [];
            // Zones de lave stratégiquement placées
            hazardZones.push(new HazardZone(200, 100, 150, 100, 'lava'));
            hazardZones.push(new HazardZone(450, 350, 120, 120, 'lava'));
            hazardZones.push(new HazardZone(canvas.width - 200, 200, 100, 150, 'lava'));
        },
        generateTeleporters: () => { teleporters = []; }
    },
    
    water: {
        name: 'Archipel',
        generateObstacles: () => {
            obstacles = [];
            for (let i = 0; i < 3; i++) {
                const width = 60 + Math.random() * 50;
                const height = 60 + Math.random() * 50;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, false));
            }
        },
        generateHazards: () => {
            hazardZones = [];
            // Grandes zones d'eau
            hazardZones.push(new HazardZone(50, 50, 200, 150, 'water'));
            hazardZones.push(new HazardZone(canvas.width - 250, 300, 200, 150, 'water'));
            hazardZones.push(new HazardZone(300, canvas.height - 150, 180, 100, 'water'));
        },
        generateTeleporters: () => { teleporters = []; }
    },
    
    portal: {
        name: 'Portails',
        generateObstacles: () => {
            obstacles = [];
            // Obstacles en forme de labyrinthe
            obstacles.push(new Obstacle(250, 100, 100, 30, false));
            obstacles.push(new Obstacle(450, 200, 100, 30, false));
            obstacles.push(new Obstacle(250, 400, 100, 30, false));
            obstacles.push(new Obstacle(450, 500, 100, 30, false));
        },
        generateHazards: () => { hazardZones = []; },
        generateTeleporters: () => {
            teleporters = [];
            // Créer des paires de téléporteurs
            const tp1 = new Teleporter(150, 150);
            const tp2 = new Teleporter(650, 450);
            tp1.linkedTeleporter = tp2;
            tp2.linkedTeleporter = tp1;
            teleporters.push(tp1, tp2);
            
            const tp3 = new Teleporter(400, 100);
            const tp4 = new Teleporter(400, 500);
            tp3.linkedTeleporter = tp4;
            tp4.linkedTeleporter = tp3;
            teleporters.push(tp3, tp4);
        }
    },
    
    chaos: {
        name: 'Chaos Total',
        generateObstacles: () => {
            obstacles = [];
            // Mix de tout
            for (let i = 0; i < 2; i++) {
                const width = 60 + Math.random() * 40;
                const height = 60 + Math.random() * 40;
                const x = Math.random() * (canvas.width - width - 200) + 100;
                const y = Math.random() * (canvas.height - height);
                obstacles.push(new Obstacle(x, y, width, height, Math.random() > 0.5));
            }
        },
        generateHazards: () => {
            hazardZones = [];
            hazardZones.push(new HazardZone(100, 250, 120, 120, 'lava'));
            hazardZones.push(new HazardZone(580, 150, 150, 100, 'water'));
        },
        generateTeleporters: () => {
            teleporters = [];
            const tp1 = new Teleporter(200, 500);
            const tp2 = new Teleporter(600, 100);
            tp1.linkedTeleporter = tp2;
            tp2.linkedTeleporter = tp1;
            teleporters.push(tp1, tp2);
        }
    }
};

function generateObstacles() {
    // Utiliser la fonction de génération de la map actuelle
    if (MAPS[currentMap]) {
        MAPS[currentMap].generateObstacles();
        MAPS[currentMap].generateHazards();
        MAPS[currentMap].generateTeleporters();
    } else {
        // Fallback sur classique
        MAPS.classic.generateObstacles();
        MAPS.classic.generateHazards();
        MAPS.classic.generateTeleporters();
    }
}

function spawnPowerUp() {
    // Générer un power-up aléatoire à une position valide
    const types = ['speed', 'shield', 'triple'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let x, y, validPosition;
    let attempts = 0;
    
    do {
        validPosition = true;
        x = Math.random() * (canvas.width - 100) + 50;
        y = Math.random() * (canvas.height - 100) + 50;
        
        // Vérifier qu'il n'y a pas d'obstacle
        for (const obstacle of obstacles) {
            if (x > obstacle.x - 30 && x < obstacle.x + obstacle.width + 30 &&
                y > obstacle.y - 30 && y < obstacle.y + obstacle.height + 30) {
                validPosition = false;
                break;
            }
        }
        
        // Vérifier qu'il n'est pas trop proche des tanks
        if (validPosition) {
            players.forEach(p => {
                const dx = p.x - x;
                const dy = p.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < 100) {
                    validPosition = false;
                }
            });
        }
        
        attempts++;
    } while (!validPosition && attempts < 50);
    
    if (validPosition) {
        powerUps.push(new PowerUp(x, y, type));
    }
}

function startRound() {
    gameState = 'RUNNING';
    messageOverlay.classList.remove('visible');
    projectiles = [];
    particles = [];
    powerUps = [];
    
    // Changer le curseur selon le mode
    if (gameMode === 'ai' || gameMode === 'lan') {
        canvas.classList.add('mouse-aim');
    } else {
        canvas.classList.remove('mouse-aim');
    }
    
    players.forEach(p => {
        p.currentHealth = p.maxHealth;
        p.shootTimer = SHOOT_COOLDOWN;
        p.collisionCooldown = 0;
        p.hasSpeedBoost = false;
        p.speedBoostTimer = 0;
        p.hasShield = false;
        p.shieldTimer = 0;
        p.hasTripleShot = false;
        p.inWater = false;
        p.waterSlowSpeed = 0;
    });

    player1.x = 100; player1.y = 300; player1.angle = -Math.PI / 2;
    player2.x = 700; player2.y = 300; player2.angle = Math.PI / 2;

    player1.speed = 2 + (currentLevel - 1) * 0.5;
    player2.speed = 2 + (currentLevel - 1) * 0.5;
    
    player1.baseSpeed = player1.speed;
    player2.baseSpeed = player2.speed;

    generateObstacles();
    
    // NE PAS spawner de power-ups au début
    // Ils apparaîtront progressivement pendant la partie
    
    roundTimer = ROUND_TIME;
    updateUI();
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        roundTimer--;
        updateUI();
        
        // Spawner un power-up toutes les 8-12 secondes
        if (roundTimer % 10 === 0 && Math.random() < 0.8) {
            spawnPowerUp();
        }
        
        if (roundTimer <= 0) {
            if (currentLevel < 3) {
                 levelUp();
            } else {
                 endGame("ÉGALITÉ - TEMPS ÉCOULÉ");
            }
        }
    }, 1000);
}

function levelUp() {
    currentLevel++;
    showMessage(`NIVEAU ${currentLevel}\nVitesse augmentée !`, 2000, startRound);
}

function endRoundAsDraw() {
    if (gameState !== 'RUNNING') return;
    
    clearInterval(timerInterval);
    gameState = 'ROUND_OVER';

    createExplosion(player1.x, player1.y, player1.color);
    createExplosion(player2.x, player2.y, player2.color);
    triggerScreenShake(20, 30);

    showMessage('ÉLIMINATION MUTUELLE !\nManche Nulle', 3000, startRound);
    updateUI();
}

function endRound(winner) {
    if (gameState !== 'RUNNING') return;

    clearInterval(timerInterval);
    gameState = 'ROUND_OVER';
    
    const loser = winner === player1 ? player2 : player1;
    createExplosion(loser.x, loser.y, loser.color);
    triggerScreenShake(20, 30);
    
    if (winner === player1) {
        scores.player1++;
        const winMsg = gameMode === 'ai' ? 'Vous gagnez la manche !' : 'Le Joueur 1 gagne la manche !';
        showMessage(winMsg, 3000, startRound);
    } else {
        scores.player2++;
        const winMsg = gameMode === 'ai' ? 'L\'IA gagne la manche !' : 'Le Joueur 2 gagne la manche !';
        showMessage(winMsg, 3000, startRound);
    }
    
    if (scores.player1 + scores.player2 < 3) {
        // Continue
    } else {
        setTimeout(() => {
            let finalMessage;
            if (gameMode === 'ai') {
                finalMessage = scores.player1 > scores.player2 ? "VOUS AVEZ GAGNÉ !" : 
                               scores.player2 > scores.player1 ? "L'IA A GAGNÉ !" : 
                               "MATCH NUL !";
            } else {
                finalMessage = scores.player1 > scores.player2 ? "JOUEUR 1 EST LE VAINQUEUR !" : 
                               scores.player2 > scores.player1 ? "JOUEUR 2 EST LE VAINQUEUR !" : 
                               "MATCH NUL !";
            }
            endGame(finalMessage);
        }, 3000);
    }
    updateUI();
}

function endGame(message) {
    clearInterval(timerInterval);
    gameState = 'GAME_OVER';
    
    // Sauvegarder les statistiques
    if (AccountSystem.currentUser && (gameMode === 'ai' || gameMode === 'pvp')) {
        const playerScore = scores.player1;
        const playerWon = scores.player1 > scores.player2;
        
        if (playerWon) {
            AccountSystem.addWin(playerScore);
        } else if (scores.player1 < scores.player2) {
            AccountSystem.addLoss(playerScore);
        }
        // Match nul = pas de stat
    }
    
    showGameOverScreen(message);
}

function showGameOverScreen(message) {
    // Créer l'écran de fin de partie
    messageText.innerHTML = `
        <div class="game-over-screen">
            <h1 class="game-over-title">🎮 GAME OVER</h1>
            <p class="game-over-message">${message}</p>
            <div class="game-over-stats">
                <div class="stat-box">
                    <span class="stat-label">Score Final</span>
                    <span class="stat-value">${scores.player1} - ${scores.player2}</span>
                </div>
            </div>
            <div class="game-over-buttons">
                <button class="game-over-btn primary" id="play-again-btn">
                    <span class="btn-icon">🔄</span>
                    <span>Rejouer</span>
                </button>
                <button class="game-over-btn secondary" id="back-to-menu-btn">
                    <span class="btn-icon">🏠</span>
                    <span>Menu Principal</span>
                </button>
            </div>
        </div>
    `;
    messageOverlay.classList.add('visible');
    
    // Ajouter les événements
    setTimeout(() => {
        document.getElementById('play-again-btn').addEventListener('click', () => {
            messageOverlay.classList.remove('visible');
            currentLevel = 1;
            scores = { player1: 0, player2: 0 };
            
            if (gameMode === 'ai') {
                aiController = new ProAIController(player2, player1, aiDifficulty);
            }
            
            gameState = 'STARTING';
            showMessage('Prêts ?', 2000, startRound);
        });
        
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            // Sauvegarder les stats avant de recharger
            if (AccountSystem.currentUser && !AccountSystem.currentUser.isGuest) {
                const accounts = AccountSystem.loadAccounts();
                accounts[AccountSystem.currentUser.username] = {
                    password: AccountSystem.currentUser.password,
                    email: AccountSystem.currentUser.email,
                    stats: AccountSystem.currentUser.stats,
                    matchHistory: AccountSystem.currentUser.matchHistory
                };
                AccountSystem.saveAccounts(accounts);
            }
            // Recharger la page
            location.reload();
        });
    }, 100);
}

function returnToMenu() {
    // Arrêter tous les timers
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Arrêter la musique
    sounds.music.pause();
    sounds.music.currentTime = 0;
    
    // Réinitialiser l'état du jeu
    gameState = 'MENU';
    currentLevel = 1;
    scores = { player1: 0, player2: 0 };
    obstacles = [];
    projectiles = [];
    particles = [];
    powerUps = [];
    hazardZones = [];
    teleporters = [];
    aiController = null;
    isPaused = false;
    
    // Réinitialiser les tanks
    player1.reset();
    player2.reset();
    
    // Cacher l'overlay et le bouton pause
    messageOverlay.classList.remove('visible');
    document.getElementById('pause-button').style.display = 'none';
    
    // Cacher les contrôles tactiles
    document.getElementById('touch-controls').style.display = 'none';
    
    // Afficher le menu
    menuScreen.style.display = 'flex';
    
    // Réinitialiser la sélection
    gameMode = null;
    aiDifficulty = null;
    startButton.style.display = 'none';
    
    modePvpButton.classList.remove('selected');
    modeAiButton.classList.remove('selected');
    modeLanButton.classList.remove('selected');
    difficultySelection.style.display = 'none';
}

let isPaused = false;
let pauseButton = null;

function togglePauseMenu() {
    if (gameState !== 'RUNNING' && !isPaused) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        // Mettre en pause
        if (timerInterval) clearInterval(timerInterval);
        
        // Afficher le menu pause minimaliste
        messageText.innerHTML = `
            <div class="pause-menu">
                <h1 class="pause-title">⏸️ PAUSE</h1>
                <div class="pause-buttons">
                    <button class="pause-menu-btn danger" id="quit-game-btn">
                        <span class="btn-icon">🚪</span>
                        <span>Quitter la Partie</span>
                    </button>
                </div>
                <p class="pause-hint">Appuyez sur ESC pour reprendre</p>
            </div>
        `;
        messageOverlay.classList.add('visible');
        
        // Ajouter l'événement
        setTimeout(() => {
            document.getElementById('quit-game-btn').addEventListener('click', () => {
                // Sauvegarder les stats avant de recharger
                if (AccountSystem.currentUser && !AccountSystem.currentUser.isGuest) {
                    const accounts = AccountSystem.loadAccounts();
                    accounts[AccountSystem.currentUser.username] = {
                        password: AccountSystem.currentUser.password,
                        email: AccountSystem.currentUser.email,
                        stats: AccountSystem.currentUser.stats,
                        matchHistory: AccountSystem.currentUser.matchHistory
                    };
                    AccountSystem.saveAccounts(accounts);
                }
                // Recharger la page
                location.reload();
            });
        }, 100);
    } else {
        // Reprendre
        messageOverlay.classList.remove('visible');
        
        // Relancer le timer
        timerInterval = setInterval(() => {
            roundTimer--;
            updateUI();
            if (roundTimer <= 0) {
                clearInterval(timerInterval);
                if (scores.player1 === scores.player2) {
                    endRoundAsDraw();
                } else {
                    endGame("ÉGALITÉ - TEMPS ÉCOULÉ");
                }
            }
        }, 1000);
    }
}

function showMessage(text, duration, callback) {
    messageText.innerText = text;
    messageOverlay.classList.add('visible');
    if (duration > 0) {
        setTimeout(() => {
            messageOverlay.classList.remove('visible');
        }, duration - 500);
        if (callback) {
            setTimeout(callback, duration);
        }
    }
}

function updateUI() {
    player1ScoreElem.innerText = `Score: ${scores.player1}`;
    player2ScoreElem.innerText = `Score: ${scores.player2}`;
    
    const minutes = Math.floor(roundTimer / 60);
    const seconds = roundTimer % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    timerElem.innerText = `Temps: ${formattedTime}`;
    
    levelElem.innerText = `Niveau: ${currentLevel}`;
}

function checkProjectileCollisions() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p) continue;
        let destroyed = false;
        
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            createExplosion(p.x, p.y, '#FFFFFF');
            projectiles.splice(i, 1);
            continue;
        }

        for(const obs of obstacles) {
            if (p.x > obs.x && p.x < obs.x + obs.width && p.y > obs.y && p.y < obs.y + obs.height) {
                createExplosion(p.x, p.y, '#654321');
                
                // Si l'obstacle est destructible, lui infliger des dégâts
                if (obs.takeDamage()) {
                    // Obstacle détruit - le retirer
                    obstacles.splice(obstacles.indexOf(obs), 1);
                    createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#8B4513');
                    triggerScreenShake(4, 12);
                }
                
                projectiles.splice(i, 1);
                destroyed = true;
                break;
            }
        }
        if (destroyed) continue;

        const target = p.owner === player1 ? player2 : player1;
        
        // Ne pas se toucher soi-même
        if (target === p.owner) continue;
        
        const dx = p.x - target.x;
        const dy = p.y - target.y;
        if (Math.sqrt(dx * dx + dy * dy) < target.height / 2) {
             createExplosion(p.x, p.y, p.color);
             triggerScreenShake(5, 15);
             target.applyDamage(PROJECTILE_DAMAGE);
             projectiles.splice(i, 1);
             
             if (target.currentHealth <= 0) {
                 endRound(p.owner);
             }
             return;
        }
    }
}

function checkTankCollisions() {
    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const collisionDistance = TANK_WIDTH;

    if (distance < collisionDistance) {
        if (player1.collisionCooldown <= 0 && player2.collisionCooldown <= 0) {
            
            player1.applyDamage(COLLISION_DAMAGE);
            player2.applyDamage(COLLISION_DAMAGE);
            
            player1.collisionCooldown = COLLISION_COOLDOWN;
            player2.collisionCooldown = COLLISION_COOLDOWN;

            const midX = (player1.x + player2.x) / 2;
            const midY = (player1.y + player2.y) / 2;
            for(let i=0; i < 10; i++) particles.push(new Particle(midX, midY, 2, '#FFFFFF', 0.9, (Math.random()-0.5)*2, (Math.random()-0.5)*2));
            triggerScreenShake(4, 10);

            const p1dead = player1.currentHealth <= 0;
            const p2dead = player2.currentHealth <= 0;

            if (p1dead && p2dead) {
                endRoundAsDraw();
            } else if (p1dead) {
                endRound(player2);
            } else if (p2dead) {
                endRound(player1);
            }
        }
        
        const overlap = collisionDistance - distance;
        const pushX = (dx / distance) * (overlap / 2);
        const pushY = (dy / distance) * (overlap / 2);
        
        if (!player1.checkCollision(player1.x + pushX, player1.y + pushY)) {
             player1.x += pushX; player1.y += pushY;
        }
        if (!player2.checkCollision(player2.x - pushX, player2.y - pushY)) {
            player2.x -= pushX; player2.y -= pushY;
        }
    }
    
    // Vérifier collision avec les power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        // Vérifier collision avec player1
        if (powerUp.checkCollision(player1)) {
            powerUp.applyEffect(player1);
            powerUps.splice(i, 1);
            continue;
        }
        
        // Vérifier collision avec player2
        if (powerUp.checkCollision(player2)) {
            powerUp.applyEffect(player2);
            powerUps.splice(i, 1);
        }
    }
    
    // Vérifier collision avec les zones dangereuses
    for (const hazard of hazardZones) {
        if (hazard.checkCollision(player1)) {
            hazard.applyEffect(player1);
            if (hazard.type === 'lava' && player1.currentHealth <= 0) {
                endRound(player2);
                return;
            }
        } else {
            hazard.removeEffect(player1);
        }
        
        if (hazard.checkCollision(player2)) {
            hazard.applyEffect(player2);
            if (hazard.type === 'lava' && player2.currentHealth <= 0) {
                endRound(player1);
                return;
            }
        } else {
            hazard.removeEffect(player2);
        }
    }
    
    // Vérifier collision avec les téléporteurs
    for (const teleporter of teleporters) {
        teleporter.update();
        
        if (teleporter.checkCollision(player1)) {
            teleporter.teleport(player1);
        }
        
        if (teleporter.checkCollision(player2)) {
            teleporter.teleport(player2);
        }
    }
}

function drawBackground() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
}

function triggerScreenShake(magnitude, duration) {
    screenShakeMagnitude = magnitude;
    screenShakeDuration = duration;
}
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;
    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
}
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function gameLoop() {
    // Optimisation FPS
    const now = Date.now();
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    
    fpsCounter++;
    if (now - lastFpsUpdate > 1000) {
        currentFPS = fpsCounter;
        fpsCounter = 0;
        lastFpsUpdate = now;
        
        // Mettre à jour l'affichage FPS (si visible)
        const fpsElem = document.getElementById('fps-counter');
        if (fpsElem && fpsElem.style.display !== 'none') {
            fpsElem.textContent = 'FPS: ' + currentFPS;
        }
    }
    
    if (gameState === 'RUNNING') {
        // Mettre à jour l'IA si elle est active
        if (aiController) {
            aiController.update();
        }
        
        // Entity Interpolation pour l'adversaire en mode LAN
        if (gameMode === 'lan' && multiplayerClient) {
            multiplayerClient.interpolateOpponent();
            multiplayerClient.interpolateProjectiles(); // Interpoler aussi les projectiles
        }
        
        players.forEach(p => p.update());
        
        // En mode LAN, le serveur gère les projectiles (pas de mise à jour locale)
        if (gameMode !== 'lan') {
            projectiles.forEach(p => p.update());
            checkProjectileCollisions();
        }
        
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.life > 0.05 && p.radius > 0.5);
        
        // Limiter le nombre de particules pour les performances
        if (particles.length > MAX_PARTICLES) {
            particles = particles.slice(0, MAX_PARTICLES);
        }
        
        // Limiter le nombre de projectiles
        if (projectiles.length > MAX_PROJECTILES) {
            projectiles = projectiles.slice(0, MAX_PROJECTILES);
        }
        
        checkTankCollisions();
    }
    
    if (gameState !== 'MENU') {
        ctx.save();
        if (screenShakeDuration > 0) {
            const dx = (Math.random() - 0.5) * screenShakeMagnitude;
            const dy = (Math.random() - 0.5) * screenShakeMagnitude;
            ctx.translate(dx, dy);
            screenShakeDuration--;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        hazardZones.forEach(h => h.draw()); // Dessiner zones dangereuses en premier
        obstacles.forEach(o => o.draw());
        teleporters.forEach(t => t.draw()); // Dessiner téléporteurs
        powerUps.forEach(p => p.draw()); // Dessiner les power-ups
        projectiles.forEach(p => p.draw());
        players.forEach(p => p.draw());
        
        ctx.globalCompositeOperation = 'lighter';
        particles.forEach(p => p.draw());
        ctx.globalCompositeOperation = 'source-over';
        
        // Dessiner un réticule si on utilise la souris
        if ((gameMode === 'ai' || gameMode === 'lan') && gameState === 'RUNNING') {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(mouseX - 20, mouseY);
            ctx.lineTo(mouseX - 5, mouseY);
            ctx.moveTo(mouseX + 5, mouseY);
            ctx.lineTo(mouseX + 20, mouseY);
            ctx.moveTo(mouseX, mouseY - 20);
            ctx.lineTo(mouseX, mouseY - 5);
            ctx.moveTo(mouseX, mouseY + 5);
            ctx.lineTo(mouseX, mouseY + 20);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    requestAnimationFrame(gameLoop);
}

// Démarrage de la boucle de jeu
gameLoop();