// ================================================================
// IA PROFESSIONNELLE FPS - NIVEAU AAA
// Basé sur techniques de Counter-Strike, Quake, et autres FPS pros
// ================================================================

class ProAIController {
    constructor(tank, player, difficulty) {
        this.tank = tank;
        this.player = player;
        this.difficulty = difficulty;
        this.params = this.getParams();
        
        // FSM (Finite State Machine)
        this.state = 'AGGRESSIVE_PURSUE';
        this.stateTimer = 0;
        
        // Prédiction balistique avancée
        this.playerPosHistory = [];
        this.playerVelocity = {x: 0, y: 0};
        this.playerAcceleration = {x: 0, y: 0};
        
        // Anti-stuck ultra robuste
        this.posHistory = [];
        this.stuckFrames = 0;
        this.unstuckMode = false;
        this.unstuckAngle = 0;
        
        // Tir constant et agressif
        this.shootCooldown = 0;
        this.lastShootAttempt = 0;
        
        // Esquive réactive
        this.dodgeMode = false;
        this.dodgeAngle = 0;
        this.dodgeFrames = 0;
        
        this.frameCount = 0;
    }
    
    getParams() {
        const p = {
            easy: {
                aimAccuracy: 0.85,              // Augmenté de 0.7 à 0.85
                predictionFactor: 0.75,          // Augmenté de 0.5 à 0.75
                shootDelay: 400,                 // Réduit de 600 à 400ms
                reactTime: 6,                    // Réduit de 12 à 6
                dodgeSkill: 0.7,                 // Augmenté de 0.4 à 0.7
                aggressiveness: 0.95             // NOUVEAU : Très agressif
            },
            medium: {
                aimAccuracy: 0.93,               // Augmenté de 0.85 à 0.93
                predictionFactor: 0.9,           // Augmenté de 0.75 à 0.9
                shootDelay: 300,                 // Réduit de 450 à 300ms
                reactTime: 4,                    // Réduit de 8 à 4
                dodgeSkill: 0.85,                // Augmenté de 0.65 à 0.85
                aggressiveness: 0.98
            },
            hard: {
                aimAccuracy: 0.98,               // Augmenté de 0.95 à 0.98
                predictionFactor: 0.98,          // Augmenté de 0.9 à 0.98
                shootDelay: 220,                 // Réduit de 350 à 220ms
                reactTime: 2,                    // Réduit de 4 à 2
                dodgeSkill: 0.95,                // Augmenté de 0.85 à 0.95
                aggressiveness: 1.0
            },
            impossible: {
                aimAccuracy: 0.995,              // PRESQUE PARFAIT (99.5%)
                predictionFactor: 1.0,           // PRÉDICTION PARFAITE
                shootDelay: 150,                 // ULTRA-RAPIDE (150ms)
                reactTime: 1,                    // RÉFLEXES INSTANTANÉS
                dodgeSkill: 0.98,                // ESQUIVE QUASI-PARFAITE
                aggressiveness: 1.0
            }
        };
        return p[this.difficulty] || p.medium;
    }
    
    update() {
        this.frameCount++;
        
        // Réinitialiser touches
        Object.values(this.tank.controls).forEach(k => this.tank.keys[k] = false);
        
        // Anti-stuck PRIORITAIRE
        if (this.checkStuck()) {
            this.executeUnstuck();
            return;
        }
        
        // Esquive projectiles PRIORITAIRE
        if (this.detectIncomingProjectile()) {
            this.executeDodge();
            return;
        }
        
        // Mise à jour chaque N frames
        if (this.frameCount % this.params.reactTime === 0) {
            this.updatePlayerPrediction();
            this.updateFSM();
        }
        
        // Exécuter comportement
        this.executeMovement();
        this.executeAiming();
        this.executeShooting();
    }
    
    // ============ ANTI-STUCK ROBUSTE ============
    checkStuck() {
        this.posHistory.push({x: this.tank.x, y: this.tank.y});
        if (this.posHistory.length > 30) this.posHistory.shift();
        
        if (this.posHistory.length < 20) return false;
        
        // Calculer variance de position
        const avgX = this.posHistory.reduce((s, p) => s + p.x, 0) / this.posHistory.length;
        const avgY = this.posHistory.reduce((s, p) => s + p.y, 0) / this.posHistory.length;
        const variance = this.posHistory.reduce((s, p) => {
            return s + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
        }, 0) / this.posHistory.length;
        
        if (variance < 30) {
            this.stuckFrames++;
            if (this.stuckFrames > 20) {
                this.unstuckMode = true;
                this.unstuckAngle = Math.random() * Math.PI * 2;
                this.stuckFrames = 0;
                return true;
            }
        } else {
            this.stuckFrames = 0;
        }
        
        return this.unstuckMode;
    }
    
    executeUnstuck() {
        // Rotation aléatoire + recul
        const targetAngle = this.unstuckAngle + Math.sin(this.frameCount * 0.1) * 0.5;
        this.rotateTowards(targetAngle);
        this.tank.keys[this.tank.controls.backward] = true;
        
        if (this.frameCount % 60 === 0) {
            this.unstuckAngle = Math.random() * Math.PI * 2;
        }
        
        // Sortir du mode après 90 frames
        if (this.frameCount % 90 === 0) {
            this.unstuckMode = false;
        }
    }
    
    // ============ PRÉDICTION BALISTIQUE AVANCÉE ============
    updatePlayerPrediction() {
        this.playerPosHistory.push({
            x: this.player.x,
            y: this.player.y,
            t: Date.now()
        });
        if (this.playerPosHistory.length > 8) this.playerPosHistory.shift();
        
        if (this.playerPosHistory.length >= 3) {
            const recent = this.playerPosHistory.slice(-3);
            const dt = (recent[2].t - recent[0].t) / 1000;
            if (dt > 0) {
                const vx = (recent[2].x - recent[0].x) / dt;
                const vy = (recent[2].y - recent[0].y) / dt;
                
                // Calculer accélération
                const ax = (vx - this.playerVelocity.x) / dt;
                const ay = (vy - this.playerVelocity.y) / dt;
                
                this.playerVelocity = {x: vx, y: vy};
                this.playerAcceleration = {x: ax, y: ay};
            }
        }
    }
    
    predictPlayerPosition(timeAhead) {
        // Prédiction avec accélération (équation cinématique)
        const factor = this.params.predictionFactor;
        const px = this.player.x + (this.playerVelocity.x * timeAhead + 0.5 * this.playerAcceleration.x * timeAhead * timeAhead) * factor;
        const py = this.player.y + (this.playerVelocity.y * timeAhead + 0.5 * this.playerAcceleration.y * timeAhead * timeAhead) * factor;
        return {x: px, y: py};
    }
    
    // ============ ESQUIVE RÉACTIVE ============
    detectIncomingProjectile() {
        if (this.dodgeMode && this.dodgeFrames > 0) {
            this.dodgeFrames--;
            return true;
        }
        
        for (const proj of projectiles) {
            if (proj.owner === this.player) {
                const dx = proj.x - this.tank.x;
                const dy = proj.y - this.tank.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Calculer si projectile nous vise
                const angleToUs = Math.atan2(-dx, dy);
                const angleDiff = Math.abs(this.normalizeAngle(proj.angle - angleToUs));
                
                // DÉTECTION PLUS LARGE ET RÉACTIVE
                const detectionRange = 220;  // Augmenté de 180 à 220
                const detectionAngle = 0.8;   // Plus tolérant (0.6 → 0.8)
                
                if (dist < detectionRange && angleDiff < detectionAngle && Math.random() < this.params.dodgeSkill) {
                    this.dodgeMode = true;
                    this.dodgeFrames = 50;  // Augmenté de 40 à 50
                    // Esquive perpendiculaire avec variation
                    const dodgeDirection = Math.random() > 0.5 ? 1 : -1;
                    this.dodgeAngle = Math.atan2(dx, -dy) + (Math.PI / 2) * dodgeDirection;
                    return true;
                }
            }
        }
        return false;
    }
    
    executeDodge() {
        this.rotateTowards(this.dodgeAngle);
        this.tank.keys[this.tank.controls.forward] = true;
    }
    
    // ============ FSM (FINITE STATE MACHINE) ============
    updateFSM() {
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const health = this.tank.currentHealth / this.tank.maxHealth;
        
        // FSM ULTRA-AGRESSIF - Priorise toujours l'attaque
        if (health < 0.2 && dist < 180) {
            // Seulement en danger critique et très proche
            this.state = 'TACTICAL_RETREAT';
        } else if (dist < 130) {
            // Proche : Strafe pour être difficile à toucher
            this.state = 'STRAFE_COMBAT';
        } else if (dist > 450) {
            // Loin : Poursuite agressive
            this.state = 'AGGRESSIVE_PURSUE';
        } else {
            // Distance moyenne : Engagement constant
            this.state = 'ENGAGE';
        }
    }
    
    // ============ MOUVEMENT ============
    executeMovement() {
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dx, -dy);
        
        let moveAngle = angleToPlayer;
        
        switch(this.state) {
            case 'AGGRESSIVE_PURSUE':
                // Fonce vers le joueur avec léger zigzag
                const pursuitZigzag = Math.sin(this.frameCount * 0.08) * 0.2;
                moveAngle = angleToPlayer + pursuitZigzag;
                break;
                
            case 'ENGAGE':
                // Approche tactique avec mouvement imprévisible
                const engagePattern = Math.sin(this.frameCount * 0.06) * 0.4;
                moveAngle = angleToPlayer + engagePattern;
                break;
                
            case 'STRAFE_COMBAT':
                // Strafing circulaire RAPIDE et changeant
                const strafeSpeed = 0.12;  // Plus rapide
                const strafeDirection = Math.sin(this.frameCount * 0.03) > 0 ? 1 : -1;
                moveAngle = angleToPlayer + (Math.PI / 2) * strafeDirection;
                
                // Change direction plus souvent
                if (this.frameCount % 90 === 0) {
                    moveAngle += Math.PI;
                }
                break;
                
            case 'TACTICAL_RETREAT':
                // Reculer en zigzag pour être difficile à toucher
                const retreatZigzag = Math.sin(this.frameCount * 0.1) * 0.5;
                moveAngle = angleToPlayer + Math.PI + retreatZigzag;
                break;
        }
        
        // Évitement obstacles simple mais efficace
        const avoidAngle = this.checkObstacleAvoidance(moveAngle);
        if (avoidAngle !== null) {
            moveAngle = avoidAngle;
        }
        
        // Rotation vers angle cible
        this.rotateTowards(moveAngle);
        
        // MOUVEMENT PLUS AGRESSIF - Avance presque toujours
        const angleDiff = Math.abs(this.normalizeAngle(moveAngle - this.tank.angle));
        
        if (this.state === 'TACTICAL_RETREAT') {
            this.tank.keys[this.tank.controls.backward] = true;
        } else if (angleDiff < 1.2) {  // Très tolérant (0.8 → 1.2)
            this.tank.keys[this.tank.controls.forward] = true;
        }
    }
    
    // ============ VISÉE ET TIR ============
    executeAiming() {
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Temps de vol du projectile
        const timeToHit = dist / 8; // Vitesse projectile = 8
        
        // Prédire position future avec HAUTE PRÉCISION
        const predicted = this.predictPlayerPosition(timeToHit / 60); // Convertir en secondes
        
        // Angle vers position prédite
        const aimX = predicted.x - this.tank.x;
        const aimY = predicted.y - this.tank.y;
        let aimAngle = Math.atan2(aimX, -aimY);
        
        // Inaccuracy MINIMALE (presque rien en Impossible)
        const spread = (1 - this.params.aimAccuracy) * 0.08;  // Réduit de 0.15 à 0.08
        aimAngle += (Math.random() - 0.5) * spread;
        
        // VISER CONSTAMMENT (pas seulement pendant le mouvement)
        this.rotateTowards(aimAngle);
    }
    
    executeShooting() {
        // TIR ULTRA-AGRESSIF ET CONSTANT
        if (this.tank.shootTimer > 0) return;
        
        const dx = this.player.x - this.tank.x;
        const dy = this.player.y - this.tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculer alignement avec prédiction
        const timeToHit = dist / 8;
        const predicted = this.predictPlayerPosition(timeToHit / 60);
        const aimX = predicted.x - this.tank.x;
        const aimY = predicted.y - this.tank.y;
        const predictedAngle = Math.atan2(aimX, -aimY);
        
        const angleDiff = Math.abs(this.normalizeAngle(this.tank.angle - predictedAngle));
        
        // CONDITIONS DE TIR ULTRA-AGRESSIVES
        const aligned = angleDiff < 0.5;      // Plus tolérant (0.4 → 0.5)
        const inRange = dist > 70 && dist < 650;  // Range plus large
        const hasLOS = this.checkLineOfSight();
        
        if (aligned && inRange && hasLOS) {
            // PROBABILITÉ DE TIR MAXIMALE
            const baseShootChance = 0.95;  // 95% de base !
            
            // Bonus selon précision d'alignement
            const alignmentBonus = (1 - angleDiff / 0.5) * 0.05;
            
            // Bonus selon difficulté
            const difficultyBonus = this.params.aggressiveness * 0.05;
            
            const finalChance = Math.min(0.99, baseShootChance + alignmentBonus + difficultyBonus);
            
            if (Math.random() < finalChance) {
                this.tank.keys[this.tank.controls.shoot] = true;
            }
        }
        
        // TIRE MÊME SI PAS PARFAITEMENT ALIGNÉ (pour pression constante)
        if (inRange && hasLOS && angleDiff < 0.8 && Math.random() < 0.3) {
            this.tank.keys[this.tank.controls.shoot] = true;
        }
    }
    
    // ============ UTILITAIRES ============
    rotateTowards(targetAngle) {
        let diff = this.normalizeAngle(targetAngle - this.tank.angle);
        if (Math.abs(diff) > 0.05) {
            if (diff > 0) {
                this.tank.keys[this.tank.controls.rotateRight] = true;
            } else {
                this.tank.keys[this.tank.controls.rotateLeft] = true;
            }
        }
    }
    
    checkObstacleAvoidance(desiredAngle) {
        const lookAhead = 80;
        const testX = this.tank.x + Math.sin(desiredAngle) * lookAhead;
        const testY = this.tank.y - Math.cos(desiredAngle) * lookAhead;
        
        // Murs
        const margin = 40;
        if (testX < margin || testX > canvas.width - margin || 
            testY < margin || testY > canvas.height - margin) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            return Math.atan2(centerX - this.tank.x, -(centerY - this.tank.y));
        }
        
        // Obstacles
        for (const obs of obstacles) {
            if (testX > obs.x - 30 && testX < obs.x + obs.width + 30 &&
                testY > obs.y - 30 && testY < obs.y + obs.height + 30) {
                const dx = this.tank.x - (obs.x + obs.width / 2);
                const dy = this.tank.y - (obs.y + obs.height / 2);
                return Math.atan2(dx, -dy);
            }
        }
        
        return null;
    }
    
    checkLineOfSight() {
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
    
    normalizeAngle(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }
}
