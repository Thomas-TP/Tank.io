// ========================================
// ALGORITHME D'IA PROFESSIONNEL
// Basé sur les Steering Behaviors
// ========================================

class SteeringAI {
    constructor(tank, player, difficulty) {
        this.tank = tank;
        this.player = player;
        this.difficulty = difficulty;
        
        this.params = this.getParams();
        
        // Steering Behaviors - Standard de l'industrie
        this.velocity = {x: 0, y: 0};
        this.desired = {x: 0, y: 0};
        this.maxSpeed = tank.speed;
        this.maxForce = 0.5;
        
        // État tactique
        this.mode = 'seek'; // seek, flee, evade, pursue
        this.modeTimer = 0;
        
        // Anti-blocage robuste
        this.history = [];
        this.historySize = 30;
        this.blockedCount = 0;
        this.escapeTimer = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
    }
    
    getParams() {
        const base = {
            easy: {accuracy: 0.6, reaction: 15, aggression: 0.3, shootRate: 0.03},
            medium: {accuracy: 0.75, reaction: 10, aggression: 0.6, shootRate: 0.05},
            hard: {accuracy: 0.9, reaction: 6, aggression: 0.8, shootRate: 0.07},
            impossible: {accuracy: 0.98, reaction: 3, aggression: 0.95, shootRate: 0.1}
        };
        return base[this.difficulty] || base.medium;
    }
    
    update() {
        this.trackPosition();
        this.detectBlocked();
        
        // Réinitialiser les touches
        Object.values(this.tank.controls).forEach(key => this.tank.keys[key] = false);
        
        // Calculer les forces de steering
        if (this.escapeTimer > 0) {
            this.applyUnstuck();
            this.escapeTimer--;
        } else {
            this.calculateSteering();
        }
        
        // Appliquer le mouvement
        this.applyMovement();
        
        // Gérer le tir
        this.handleShooting();
    }
    
    trackPosition() {
        this.history.push({x: this.tank.x, y: this.tank.y, time: Date.now()});
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
    }
    
    detectBlocked() {
        if (this.history.length < 20) return;
        
        const recent = this.history.slice(-20);
        const avgX = recent.reduce((sum, p) => sum + p.x, 0) / 20;
        const avgY = recent.reduce((sum, p) => sum + p.y, 0) / 20;
        
        const variance = recent.reduce((sum, p) => {
            return sum + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
        }, 0) / 20;
        
        // Si presque aucun mouvement
        if (variance < 50) {
            this.blockedCount++;
            if (this.blockedCount > 15) {
                this.escapeTimer = 90;
                this.wanderAngle = Math.random() * Math.PI * 2;
                this.blockedCount = 0;
            }
        } else {
            this.blockedCount = Math.max(0, this.blockedCount - 1);
        }
    }
    
    applyUnstuck() {
        // Wander behavior pour se débloquer
        this.wanderAngle += (Math.random() - 0.5) * 0.5;
        
        const wanderForce = {
            x: Math.cos(this.wanderAngle) * this.maxForce,
            y: Math.sin(this.wanderAngle) * this.maxForce
        };
        
        // Force vers le centre
        const centerForce = this.seek(canvas.width / 2, canvas.height / 2);
        
        // Combiner
        this.desired.x = wanderForce.x * 0.7 + centerForce.x * 0.3;
        this.desired.y = wanderForce.y * 0.7 + centerForce.y * 0.3;
        
        // Appliquer en reculant parfois
        if (this.escapeTimer > 60) {
            this.tank.keys[this.tank.controls.backward] = true;
        }
    }
    
    calculateSteering() {
        let steering = {x: 0, y: 0};
        
        // 1. ÉVITEMENT DES MURS (Priorité max)
        const wallAvoid = this.avoidWalls();
        if (wallAvoid.active) {
            steering.x = wallAvoid.x * 3;
            steering.y = wallAvoid.y * 3;
        } else {
            // 2. ÉVITEMENT DES OBSTACLES
            const obstacleAvoid = this.avoidObstacles();
            if (obstacleAvoid.active) {
                steering.x += obstacleAvoid.x * 2;
                steering.y += obstacleAvoid.y * 2;
            }
            
            // 3. ÉVITEMENT DES PROJECTILES
            const projectileAvoid = this.avoidProjectiles();
            if (projectileAvoid.active) {
                steering.x += projectileAvoid.x * 2.5;
                steering.y += projectileAvoid.y * 2.5;
            } else {
                // 4. COMPORTEMENT TACTIQUE
                const tactical = this.tacticalBehavior();
                steering.x += tactical.x;
                steering.y += tactical.y;
            }
        }
        
        // Limiter la force
        const mag = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
        if (mag > this.maxForce) {
            steering.x = (steering.x / mag) * this.maxForce;
            steering.y = (steering.y / mag) * this.maxForce;
        }
        
        this.desired = steering;
    }
    
    avoidWalls() {
        const margin = 80;
        const danger = 40;
        let force = {x: 0, y: 0, active: false};
        
        // Distance aux murs
        const distLeft = this.tank.x;
        const distRight = canvas.width - this.tank.x;
        const distTop = this.tank.y;
        const distBottom = canvas.height - this.tank.y;
        
        // Forces répulsives des murs
        if (distLeft < margin) {
            force.x += (margin - distLeft) / margin;
            force.active = true;
        }
        if (distRight < margin) {
            force.x -= (margin - distRight) / margin;
            force.active = true;
        }
        if (distTop < margin) {
            force.y += (margin - distTop) / margin;
            force.active = true;
        }
        if (distBottom < margin) {
            force.y -= (margin - distBottom) / margin;
            force.active = true;
        }
        
        // Normaliser
        if (force.active) {
            const mag = Math.sqrt(force.x * force.x + force.y * force.y);
            if (mag > 0) {
                force.x = (force.x / mag) * this.maxForce;
                force.y = (force.y / mag) * this.maxForce;
            }
        }
        
        return force;
    }
    
    avoidObstacles() {
        const ahead = 100;
        let force = {x: 0, y: 0, active: false};
        
        // Position anticipée
        const lookX = this.tank.x + Math.sin(this.tank.angle) * ahead;
        const lookY = this.tank.y - Math.cos(this.tank.angle) * ahead;
        
        // Vérifier obstacles
        for (const obs of obstacles) {
            const buffer = 45;
            if (lookX > obs.x - buffer && lookX < obs.x + obs.width + buffer &&
                lookY > obs.y - buffer && lookY < obs.y + obs.height + buffer) {
                
                // Force répulsive depuis le centre de l'obstacle
                const centerX = obs.x + obs.width / 2;
                const centerY = obs.y + obs.height / 2;
                
                force.x = this.tank.x - centerX;
                force.y = this.tank.y - centerY;
                force.active = true;
                
                const mag = Math.sqrt(force.x * force.x + force.y * force.y);
                if (mag > 0) {
                    force.x = (force.x / mag) * this.maxForce;
                    force.y = (force.y / mag) * this.maxForce;
                }
                break;
            }
        }
        
        return force;
    }
    
    avoidProjectiles() {
        let force = {x: 0, y: 0, active: false};
        let closestDist = Infinity;
        
        for (const proj of projectiles) {
            if (proj.owner !== this.player) continue;
            
            const dx = proj.x - this.tank.x;
            const dy = proj.y - this.tank.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Vérifier si se dirige vers nous
            const angleToUs = Math.atan2(-dx, dy);
            const diff = Math.abs(this.normalizeAngle(proj.angle - angleToUs));
            
            if (dist < 200 && diff < Math.PI / 3 && dist < closestDist) {
                closestDist = dist;
                
                // Force perpendiculaire à la trajectoire
                force.x = -dy;
                force.y = dx;
                force.active = true;
                
                const mag = Math.sqrt(force.x * force.x + force.y * force.y);
                if (mag > 0) {
                    force.x = (force.x / mag) * this.maxForce;
                    force.y = (force.y / mag) * this.maxForce;
                }
            }
        }
        
        return force;
    }
    
    tacticalBehavior() {
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Changement de mode tactique
        this.modeTimer--;
        if (this.modeTimer <= 0) {
            const healthRatio = this.tank.currentHealth / this.tank.maxHealth;
            
            if (healthRatio < 0.3) {
                this.mode = distance < 250 ? 'flee' : 'evade';
            } else if (distance < 150) {
                this.mode = 'evade'; // Garder distance
            } else if (distance > 400) {
                this.mode = 'pursue'; // Se rapprocher
            } else {
                this.mode = Math.random() < this.params.aggression ? 'pursue' : 'seek';
            }
            
            this.modeTimer = 60 + Math.random() * 60;
        }
        
        // Appliquer le comportement
        switch (this.mode) {
            case 'flee':
                return this.flee(this.player.x, this.player.y);
            case 'evade':
                return this.evade();
            case 'pursue':
                return this.pursue();
            default:
                return this.seek(this.player.x, this.player.y);
        }
    }
    
    seek(targetX, targetY) {
        const dx = targetX - this.tank.x;
        const dy = targetY - this.tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            return {
                x: (dx / dist) * this.maxForce,
                y: (dy / dist) * this.maxForce
            };
        }
        return {x: 0, y: 0};
    }
    
    flee(targetX, targetY) {
        const seek = this.seek(targetX, targetY);
        return {x: -seek.x, y: -seek.y};
    }
    
    pursue() {
        // Prédire position future du joueur
        const predictionTime = 20;
        const futureX = this.player.x + Math.sin(this.player.angle) * this.player.speed * predictionTime;
        const futureY = this.player.y - Math.cos(this.player.angle) * this.player.speed * predictionTime;
        
        return this.seek(futureX, futureY);
    }
    
    evade() {
        // Fuir la position future
        const predictionTime = 15;
        const futureX = this.player.x + Math.sin(this.player.angle) * this.player.speed * predictionTime;
        const futureY = this.player.y - Math.cos(this.player.angle) * this.player.speed * predictionTime;
        
        return this.flee(futureX, futureY);
    }
    
    applyMovement() {
        // Appliquer la vélocité avec lissage
        this.velocity.x += this.desired.x;
        this.velocity.y += this.desired.y;
        
        // Limiter vitesse
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }
        
        // Friction
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;
        
        // Calculer angle désiré
        if (speed > 0.1) {
            const targetAngle = Math.atan2(this.velocity.x, -this.velocity.y);
            const angleDiff = this.normalizeAngle(targetAngle - this.tank.angle);
            
            // Rotation douce
            const rotThreshold = 0.1;
            if (Math.abs(angleDiff) > rotThreshold) {
                if (angleDiff > 0) {
                    this.tank.keys[this.tank.controls.rotateRight] = true;
                } else {
                    this.tank.keys[this.tank.controls.rotateLeft] = true;
                }
            }
            
            // Avancer si bien orienté
            if (Math.abs(angleDiff) < Math.PI / 2) {
                this.tank.keys[this.tank.controls.forward] = true;
            }
        }
    }
    
    handleShooting() {
        if (this.tank.shootTimer > 0) return;
        
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const angleToPlayer = Math.atan2(dx, -dy);
        const angleDiff = Math.abs(this.normalizeAngle(this.tank.angle - angleToPlayer));
        
        // Conditions de tir
        const aligned = angleDiff < 0.4;
        const inRange = distance > 90 && distance < 600;
        const canSee = this.hasLineOfSight();
        
        if (aligned && inRange && canSee && Math.random() < this.params.shootRate) {
            this.tank.keys[this.tank.controls.shoot] = true;
        }
    }
    
    hasLineOfSight() {
        const steps = 15;
        const dx = (this.player.x - this.tank.x) / steps;
        const dy = (this.player.y - this.tank.y) / steps;
        
        for (let i = 1; i < steps; i++) {
            const x = this.tank.x + dx * i;
            const y = this.tank.y + dy * i;
            
            for (const obs of obstacles) {
                if (x > obs.x && x < obs.x + obs.width &&
                    y > obs.y && y < obs.y + obs.height) {
                    return false;
                }
            }
        }
        return true;
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
}
