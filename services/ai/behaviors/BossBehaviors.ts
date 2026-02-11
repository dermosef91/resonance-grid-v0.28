
import { Enemy, Player, EntityType, EnemyType } from '../../../types';
import { IEnemyBehavior, AIResult, AIContext } from '../types';
import { createEmptyResult } from '../utils';
import { getProjectile, getVisualParticle } from '../../objectPools';
import { createTextParticle, createShatterParticles } from '../../gameLogic';
import { audioEngine } from '../../../services/audioEngine'; // IMPORT AUDIO ENGINE

export class BossVanguardBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - boss.pos.x;
        const dy = player.pos.y - boss.pos.y;
        const angle = Math.atan2(dy, dx);

        // Initialize Vanguard Data
        if (!boss.vanguardData) {
            boss.vanguardData = { phase: 0 };
        }

        // Determine Phase based on Health
        const hpPct = boss.health / boss.maxHealth;
        let targetPhase = 0;
        if (hpPct < 0.25) targetPhase = 3;
        else if (hpPct < 0.50) targetPhase = 2;
        else if (hpPct < 0.75) targetPhase = 1;

        if (targetPhase > boss.vanguardData.phase) {
            boss.vanguardData.phase = targetPhase;
            // Add shatter particles
            result.newParticles.push(...createShatterParticles(boss.pos, '#ff3300', 12, boss.radius));
            result.screenShake = 10;
            // Trigger Audio Breakdown Effect (1 measure of silence/atmosphere)
            audioEngine.triggerBreakdown(1);
        }

        // Adjust Fire Rate based on Phase
        // Phase 0: 120, Phase 1: 90, Phase 2: 60, Phase 3: 30
        const fireInterval = Math.max(30, 120 - (boss.vanguardData.phase * 30));

        boss.attackTimer++;
        if (boss.state === 'CHARGE') {
          result.velocity = boss.velocity; 
          if (boss.attackTimer > 40) {
            boss.state = 'IDLE';
            boss.attackTimer = 0;
            boss.velocity = { x: 0, y: 0 };
          }
        } else {
          result.velocity = { x: Math.cos(angle) * boss.speed, y: Math.sin(angle) * boss.speed };
          
          const chargeThreshold = 200; // Time before charge
          
          if (boss.attackTimer > chargeThreshold) {
            boss.state = 'CHARGE';
            boss.attackTimer = 0;
            result.velocity = { x: Math.cos(angle) * (boss.speed * 4), y: Math.sin(angle) * (boss.speed * 4) };
            boss.velocity = result.velocity; 
          } else if (boss.attackTimer % fireInterval === 0) {
            // Number of projectiles increases with phase too? 
            // Keep it 5 spread, but faster rate.
            for (let i = -2; i <= 2; i++) {
              const shotAngle = angle + (i * 0.2);
              result.newProjectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...boss.pos },
                velocity: { x: Math.cos(shotAngle) * 9, y: Math.sin(shotAngle) * 9 },
                radius: 8,
                color: '#ff0000',
                markedForDeletion: false,
                damage: 10,
                duration: 120,
                pierce: 1,
                knockback: 0,
                isEnemy: true
              }));
            }
          }
        }
        return result;
    }
}

export class BossAidoHwedoBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        
        // Initialize specific data if missing
        if (!boss.aidoData) {
            boss.aidoData = {
                innerAngle: 0,
                outerAngle: Math.PI,
                phaseStartHealth: boss.maxHealth,
                flareTimer: 0,
                phase2Ring: {
                    angle: 0,
                    active: false,
                    doorTimer: 0,
                    doorsOpen: true // Start safe
                }
            };
        }

        const data = boss.aidoData!;
        const PHASE_THRESHOLD = 0.25 * boss.maxHealth;
        const damageTakenInPhase = data.phaseStartHealth - boss.health;

        // 1. Check for Solar Flare (Pushback Mechanic)
        if (damageTakenInPhase >= PHASE_THRESHOLD && boss.state !== 'FLARE') {
            boss.state = 'FLARE';
            data.flareTimer = 90; // 1.5 seconds of ejection
            data.phaseStartHealth = boss.health; // Reset baseline for next phase
            
            // Visual Effect
            result.newParticles.push(createTextParticle(boss.pos, "SOLAR FLARE DETECTED", '#FF0000', 90));
            result.newParticles.push({
                id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE,
                pos: { ...boss.pos }, velocity: { x: 0, y: 0 },
                radius: 0, color: '#FF0000', markedForDeletion: false,
                life: 30, maxLife: 30, size: 20, decay: 0.9
            });
        }

        // 2. State Logic
        if (boss.state === 'FLARE') {
            data.flareTimer--;
            
            // Push player away
            const dx = player.pos.x - boss.pos.x;
            const dy = player.pos.y - boss.pos.y;
            const angle = Math.atan2(dy, dx);
            
            // Strong push force
            const pushSpeed = 25; 
            player.pos.x += Math.cos(angle) * pushSpeed;
            player.pos.y += Math.sin(angle) * pushSpeed;
            
            // End Flare
            if (data.flareTimer <= 0) {
                boss.state = 'IDLE';
            }
        } else {
            // Normal State: Rotate Rings
            data.innerAngle += 0.015;
            data.outerAngle -= 0.01;
            
            // Ensure bounds 0-2PI
            if (data.innerAngle > Math.PI*2) data.innerAngle -= Math.PI*2;
            if (data.outerAngle < 0) data.outerAngle += Math.PI*2;

            // --- PHASE 2 RING LOGIC (Spike Doors) ---
            // Activates at 25% HP remaining
            if (boss.health <= boss.maxHealth * 0.25) {
                if (!data.phase2Ring!.active) {
                    data.phase2Ring!.active = true;
                    result.newParticles.push(createTextParticle(boss.pos, "DEFENSE SYSTEM: CRITICAL", '#FF0000', 120));
                }
                
                const p2 = data.phase2Ring!;
                p2.angle += 0.008; // Slow rotation
                p2.doorTimer++;
                
                // Cycle: 180 frames (3s) Closed/Danger -> 120 frames (2s) Open/Safe
                const cycleLength = 300;
                const phase = p2.doorTimer % cycleLength;
                
                if (phase < 180) {
                    p2.doorsOpen = false; // Spikes Active (Block)
                } else {
                    p2.doorsOpen = true; // Spikes Inactive (Pass)
                }
            }

            // Firing Logic (Outer Ring Turrets)
            boss.attackTimer++;
            if (boss.attackTimer % 60 === 0) {
                const turretCount = 6;
                // Determine outermost active ring radius
                const r2 = 360; 
                const r3 = 530;
                const spawnRadius = data.phase2Ring?.active ? r3 : r2;
                const spawnAngleBase = data.phase2Ring?.active ? data.phase2Ring.angle : data.outerAngle;

                for (let i = 0; i < turretCount; i++) {
                    const turretAngle = spawnAngleBase + (i * (Math.PI * 2 / turretCount));
                    
                    const spawnX = boss.pos.x + Math.cos(turretAngle) * spawnRadius;
                    const spawnY = boss.pos.y + Math.sin(turretAngle) * spawnRadius;
                    
                    const vx = Math.cos(turretAngle) * 5;
                    const vy = Math.sin(turretAngle) * 5;
                    
                    result.newProjectiles.push(getProjectile({
                        id: Math.random().toString(),
                        type: EntityType.PROJECTILE,
                        pos: { x: spawnX, y: spawnY },
                        velocity: { x: vx, y: vy },
                        radius: 6,
                        color: '#FF8800',
                        markedForDeletion: false,
                        damage: 15,
                        duration: 120,
                        pierce: 0,
                        knockback: 0,
                        isEnemy: true
                    }));
                }
            }
            
            // RING WALL LOGIC (Player cannot pass rings physically)
            const dx = player.pos.x - boss.pos.x;
            const dy = player.pos.y - boss.pos.y;
            const distSq = dx*dx + dy*dy;
            const dist = Math.sqrt(distSq);
            const angleToPlayer = Math.atan2(dy, dx);
            
            // Increased Radii by ~30%
            const r1 = 200; // Was 150
            const r2 = 360; // Was 280
            const thickness = 20;
            const gapSize = Math.PI / 4; // 45 degrees
            
            const checkRingCollision = (r: number, ringAngle: number) => {
                if (dist > r - thickness && dist < r + thickness) {
                    // Check if inside gap
                    let angleDiff = Math.abs(angleToPlayer - ringAngle);
                    // Handle wrap around PI
                    while(angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI*2);
                    
                    if (angleDiff > gapSize / 2) {
                        // Not in gap -> COLLISION -> Push back
                        const resolveDist = dist < r ? r - thickness - 1 : r + thickness + 1;
                        player.pos.x = boss.pos.x + Math.cos(angleToPlayer) * resolveDist;
                        player.pos.y = boss.pos.y + Math.sin(angleToPlayer) * resolveDist;
                    }
                }
            };
            
            checkRingCollision(r1, data.innerAngle);
            checkRingCollision(r2, data.outerAngle);
        }

        // Boss Movement (Drift slowly towards player to force navigation)
        const dx = player.pos.x - boss.pos.x;
        const dy = player.pos.y - boss.pos.y;
        const angle = Math.atan2(dy, dx);
        result.velocity = { x: Math.cos(angle) * boss.speed, y: Math.sin(angle) * boss.speed };

        return result;
    }
}

export class BossShangoBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - boss.pos.x;
        const dy = player.pos.y - boss.pos.y;
        const angleToPlayer = Math.atan2(dy, dx);

        boss.attackTimer++;
        if (!boss.state) boss.state = 'SPIN';
        
        // SPIN (180) -> LOCK (45) -> FIRE (60) -> COOLDOWN (30) = 315
        const cycle = 315; 
        const t = boss.attackTimer % cycle;

        if (t < 180) {
            boss.rotation = (boss.rotation || 0) + 0.3; 
            boss.state = 'SPIN';
            const maxSpeed = boss.speed * 6.5; 
            const turnRate = 0.04;
            let vx = boss.velocity.x || 0;
            let vy = boss.velocity.y || 0;
            const targetVx = Math.cos(angleToPlayer) * maxSpeed;
            const targetVy = Math.sin(angleToPlayer) * maxSpeed;
            vx += (targetVx - vx) * turnRate;
            vy += (targetVy - vy) * turnRate;
            boss.velocity.x = vx;
            boss.velocity.y = vy;
            result.velocity = { x: vx, y: vy };
            
            if (boss.attackTimer % 5 === 0) {
                const randAngle = Math.random() * Math.PI * 2;
                result.newParticles.push({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { x: boss.pos.x + Math.cos(randAngle) * boss.radius * 1.2, y: boss.pos.y + Math.sin(randAngle) * boss.radius * 1.2 },
                    velocity: { x: -vx * 0.3, y: -vy * 0.3 },
                    radius: 0,
                    color: '#FF4500',
                    markedForDeletion: false,
                    life: 20, maxLife: 20, size: 4, decay: 0.9, shape: 'LINE'
                });
            }

        } else if (t < 225) { // LOCK phase reduced to 45 frames (from 90)
            boss.state = 'LOCK';
            boss.velocity = { x: 0, y: 0 };
            result.velocity = { x: 0, y: 0 };
            const currentRot = boss.rotation || 0;
            const sector = Math.PI / 2;
            const offset = Math.PI / 4;
            const k = Math.round((currentRot - offset) / sector);
            const target = k * sector + offset;
            boss.rotation = currentRot + (target - currentRot) * 0.1;
            
            if (boss.attackTimer % 10 === 0) {
                for(let i=0; i<4; i++) {
                    const tipAngle = (boss.rotation || 0) + (i * Math.PI / 2);
                    const tipX = boss.pos.x + Math.cos(tipAngle) * boss.radius;
                    const tipY = boss.pos.y + Math.sin(tipAngle) * boss.radius;
                    result.newParticles.push({
                        id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE,
                        pos: { x: tipX, y: tipY }, velocity: { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 },
                        radius: 0, color: '#FFFFFF', markedForDeletion: false, life: 30, maxLife: 30, size: 8, decay: 0.9
                    });
                }
            }

        } else if (t < 285) { // FIRE phase (60 frames)
            boss.state = 'FIRE';
            result.velocity = { x: 0, y: 0 };
            const currentRot = boss.rotation || 0;
            const sector = Math.PI / 2;
            const offset = Math.PI / 4;
            const k = Math.round((currentRot - offset) / sector);
            boss.rotation = k * sector + offset;
            
            if (t === 225) { // Trigger beam
                result.screenShake = 15; // SHAKE EFFECT ADDED
                for(let i=0; i<4; i++) {
                    const beamAngle = (boss.rotation || 0) + (i * Math.PI / 2);
                    result.newProjectiles.push(getProjectile({
                        id: `shango_beam_${boss.id}_${i}_${boss.attackTimer}`,
                        type: EntityType.PROJECTILE,
                        pos: { ...boss.pos },
                        velocity: { x: 0, y: 0 },
                        radius: 0,
                        color: '#FFD700',
                        markedForDeletion: false,
                        damage: 35,
                        duration: 60,
                        pierce: 999,
                        knockback: 20,
                        isEnemy: true,
                        beamData: {
                            angle: beamAngle,
                            length: 2000, 
                            width: 30,
                            tickRate: 5
                        }
                    }));
                }
            }
        } else {
            boss.state = 'COOLDOWN';
            result.velocity = { x: 0, y: 0 };
        }

        return result;
    }
}

export class BossHiveMindBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - boss.pos.x;
        const dy = player.pos.y - boss.pos.y;
        const angle = Math.atan2(dy, dx);

        result.velocity = { x: Math.cos(angle) * boss.speed, y: Math.sin(angle) * boss.speed };
        boss.attackTimer++;
        if (boss.attackTimer % 160 === 0) {
          for (let i = 0; i < 9; i++) {
            const spawnAngle = (Math.PI * 2 / 9) * i;
            const minion = ctx.spawnEnemy(player, EnemyType.GHOST);
            minion.pos.x = boss.pos.x + Math.cos(spawnAngle) * 60;
            minion.pos.y = boss.pos.y + Math.sin(spawnAngle) * 60;
            result.newEnemies.push(minion);
          }
        }
        if (boss.attackTimer % 7 === 0) {
           const spiralAngle = (boss.attackTimer / 20) + angle;
           result.newProjectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...boss.pos },
                velocity: { x: Math.cos(spiralAngle) * 6, y: Math.sin(spiralAngle) * 6 },
                radius: 6,
                color: '#ff0000',
                markedForDeletion: false,
                damage: 8,
                duration: 180,
                pierce: 1,
                knockback: 0,
                isEnemy: true
           }));
        }

        // Sky Fall Attack (Ported from Solar Seraph)
        if (boss.attackTimer % 50 === 0) {
            const leadX = player.pos.x + player.velocity.x * 20;
            const leadY = player.pos.y + player.velocity.y * 20;
            const targetX = leadX + (Math.random() - 0.5) * 150; 
            const targetY = leadY + (Math.random() - 0.5) * 150;

            result.newProjectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { x: targetX, y: targetY - 600 }, 
                velocity: { x: 0, y: 40 }, 
                radius: 40,
                color: '#FF4500', 
                markedForDeletion: false,
                damage: 25,
                duration: 100,
                pierce: 999,
                knockback: 0,
                isEnemy: true,
                skyFallData: { targetY: targetY, poolOnHit: true, hasHit: false }
            }));
        }

        return result;
    }
}

export class BossCyberKrakenBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - boss.pos.x;
        const dy = player.pos.y - boss.pos.y;
        const angle = Math.atan2(dy, dx);

        boss.attackTimer++;
      
        const IDLE_TIME = 180;
        const CHARGE_TIME = 60;
        const LASER_TIME = 120;
        const STORM_TIME = 60;
      
        const cycleLength = IDLE_TIME + CHARGE_TIME + LASER_TIME + STORM_TIME;
        const cycleTime = boss.attackTimer % cycleLength;
      
        if (cycleTime < IDLE_TIME) {
            result.velocity = { x: Math.cos(angle) * boss.speed, y: Math.sin(angle) * boss.speed };
            if (cycleTime % 90 === 0) {
                result.newProjectiles.push(getProjectile({
                    id: Math.random().toString(),
                    type: EntityType.PROJECTILE,
                    pos: { ...boss.pos },
                    velocity: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
                    radius: 12,
                    color: '#0000ff',
                    markedForDeletion: false,
                    damage: 15,
                    duration: 200,
                    pierce: 0,
                    knockback: 0,
                    isEnemy: true,
                    homingTargetId: 'player',
                    turnSpeed: 0.05
                }));
            }
        } else if (cycleTime < IDLE_TIME + CHARGE_TIME) {
            result.velocity = { x: 0, y: 0 };
        } else if (cycleTime < IDLE_TIME + CHARGE_TIME + LASER_TIME) {
            result.velocity = { x: 0, y: 0 };
            if (boss.attackTimer % 4 === 0) {
                const spread = (Math.random() - 0.5) * 0.2;
                result.newProjectiles.push(getProjectile({
                    id: Math.random().toString(),
                    type: EntityType.PROJECTILE,
                    pos: { ...boss.pos },
                    velocity: { x: Math.cos(angle + spread) * 12, y: Math.sin(angle + spread) * 12 },
                    radius: 5,
                    color: '#ff0000',
                    markedForDeletion: false,
                    damage: 12,
                    duration: 100,
                    pierce: 0,
                    knockback: 0,
                    isEnemy: true
                }));
            }
        } else {
            result.velocity = { x: 0, y: 0 };
            if (boss.attackTimer % 5 === 0) {
                const spiralArms = 8;
                for(let i=0; i<spiralArms; i++) {
                    const spiralAngle = (boss.attackTimer * 0.1) + (i * Math.PI * 2 / spiralArms);
                    result.newProjectiles.push(getProjectile({
                        id: Math.random().toString(),
                        type: EntityType.PROJECTILE,
                        pos: { ...boss.pos },
                        velocity: { x: Math.cos(spiralAngle) * 5, y: Math.sin(spiralAngle) * 5 },
                        radius: 8,
                        color: '#00ffff',
                        markedForDeletion: false,
                        damage: 20,
                        duration: 150,
                        pierce: 0,
                        knockback: 0,
                        isEnemy: true
                    }));
                }
            }
        }
      
        return result;
    }
}

export class BossTrinityBehavior implements IEnemyBehavior {
    update(boss: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const frame = Date.now() / 16; 
        boss.attackTimer++; 

        if (!boss.trinityData) {
            // Should be initialized at spawn, but fallback
            boss.trinityData = { role: 'SUPPORT', siblings: [], type: 'CUBE' };
        }

        const data = boss.trinityData;
        if (data.subState === undefined) {
            data.subState = 'IDLE';
            data.subTimer = 0;
            data.attackCount = 0;
            // Props for rendering
            data.expansion = 0; // Cube: 0-1
            data.deformation = 0; // Pyramid: 0-1
            data.gap = 0; // Orb: 0-1
        }

        // --- ROLE MANAGEMENT ---
        // Cycle every 10 seconds (600 frames)
        // Order: CUBE -> PYRAMID -> ORB
        const cycleDuration = 600;
        const globalTime = Math.floor(boss.attackTimer); 
        const cycleIndex = Math.floor(globalTime / cycleDuration) % 3;
        
        let myRole: 'AGGRESSOR' | 'SUPPORT' = 'SUPPORT';
        
        if (data.type === 'CUBE' && cycleIndex === 0) myRole = 'AGGRESSOR';
        else if (data.type === 'PYRAMID' && cycleIndex === 1) myRole = 'AGGRESSOR';
        else if (data.type === 'ORB' && cycleIndex === 2) myRole = 'AGGRESSOR';
        
        // Reset substate if role changes to SUPPORT
        if (myRole === 'SUPPORT' && data.role === 'AGGRESSOR') {
            data.subState = 'IDLE';
            data.subTimer = 0;
            data.expansion = 0;
            data.deformation = 0;
            data.gap = 0;
        }
        
        data.role = myRole;

        // --- MOVEMENT ---
        // Determine Target Position
        let targetX = player.pos.x;
        let targetY = player.pos.y;
        let speed = boss.speed;

        if (myRole === 'AGGRESSOR') {
            // --- ARENA LOGIC ---
            // The Aggressor enforces the arena
            if (ctx.allEnemies) {
                // Calculate Centroid of Trinity
                let cx = boss.pos.x;
                let cy = boss.pos.y;
                let count = 1;
                
                data.siblings.forEach(sibId => {
                    const sib = ctx.allEnemies?.find(e => e.id === sibId && !e.markedForDeletion);
                    if (sib) {
                        cx += sib.pos.x;
                        cy += sib.pos.y;
                        count++;
                    }
                });
                
                cx /= count;
                cy /= count;
                
                const ARENA_RADIUS = 900;
                
                // Check Player Distance
                const pdx = player.pos.x - cx;
                const pdy = player.pos.y - cy;
                const pDistSq = pdx*pdx + pdy*pdy;
                
                if (pDistSq > ARENA_RADIUS*ARENA_RADIUS) {
                    const pDist = Math.sqrt(pDistSq);
                    
                    // VELOCITY-BASED GRAVITY (Replaces Position Snapping)
                    // Apply a force vector towards center to pull player back smoothly
                    const distOver = pDist - ARENA_RADIUS;
                    
                    // Normalized direction to center
                    const toCenterX = cx - player.pos.x;
                    const toCenterY = cy - player.pos.y;
                    const len = Math.sqrt(toCenterX**2 + toCenterY**2);
                    const normX = toCenterX / len;
                    const normY = toCenterY / len;
                    
                    // Base force (Strong enough to fight movement) + distance scaler
                    const pullForce = 0.5 + (distOver * 0.05); 
                    
                    player.velocity.x += normX * pullForce;
                    player.velocity.y += normY * pullForce;
                    
                    // Visual feedback: DENSE PARTICLES
                    if (boss.attackTimer % 2 === 0) {
                         const angle = Math.atan2(pdy, pdx);
                         for(let k=0; k<2; k++) {
                             result.newParticles.push(getVisualParticle({
                                id: Math.random().toString(),
                                type: EntityType.VISUAL_PARTICLE,
                                pos: { x: player.pos.x + (Math.random()-0.5)*30, y: player.pos.y + (Math.random()-0.5)*30 },
                                velocity: { x: -Math.cos(angle) * 15, y: -Math.sin(angle) * 15 }, // Fast inward
                                radius: 0,
                                color: '#FF0000',
                                markedForDeletion: false,
                                life: 15, maxLife: 15, size: 4, decay: 0.9, shape: 'LINE',
                                rotation: angle
                            }));
                         }
                    }
                }
                
                // Continuous Arena Visuals: Gravitational Waves OUTSIDE
                if (boss.attackTimer % 120 === 0) {
                    result.newProjectiles.push(getProjectile({
                        id: Math.random().toString(),
                        type: EntityType.PROJECTILE,
                        pos: { x: cx, y: cy },
                        velocity: { x: 0, y: 0 },
                        radius: 0,
                        color: 'transparent',
                        markedForDeletion: false,
                        damage: 0,
                        duration: 1, // Exists for 1 frame to trigger effect
                        pierce: 999,
                        knockback: 0,
                        isEnemy: true,
                        sourceWeaponId: 'trinity_arena_pulse'
                    }));
                }
                
                // Particle Ring: Multi-colored wall pulled from outside
                const particleCount = 6; 
                const colors = ['#FF0000', '#9900FF', '#FF8800']; // Red, Purple, Orange
                
                for(let i=0; i<particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    // Spawn from 900 to 1400 (The "Outside")
                    // We want them to move INWARD and die at 900.
                    const spawnDist = ARENA_RADIUS + 50 + Math.random() * 400; 
                    const px = cx + Math.cos(angle) * spawnDist;
                    const py = cy + Math.sin(angle) * spawnDist;
                    
                    const speed = 12 + Math.random() * 8; // Fast inward suction
                    const distToBorder = spawnDist - ARENA_RADIUS;
                    const life = Math.floor(distToBorder / speed);
                    
                    if (life > 0) {
                        const col = colors[Math.floor(Math.random() * colors.length)];
                        
                        result.newParticles.push(getVisualParticle({
                            id: Math.random().toString(),
                            type: EntityType.VISUAL_PARTICLE,
                            pos: { x: px, y: py },
                            velocity: { x: -Math.cos(angle) * speed, y: -Math.sin(angle) * speed },
                            radius: 0,
                            color: col,
                            markedForDeletion: false,
                            life: life, 
                            maxLife: life, // Fade out as they approach border
                            size: 4 + Math.random() * 4, 
                            decay: 1.0, 
                            shape: Math.random() > 0.5 ? 'LINE' : 'SQUARE',
                            rotation: angle
                        }));
                    }
                }
            }

            const distSq = (player.pos.x - boss.pos.x)**2 + (player.pos.y - boss.pos.y)**2;
            const dist = Math.sqrt(distSq);
            
            // --- AGGRESSOR ATTACK LOGIC ---
            data.subTimer = (data.subTimer || 0) + 1;

            if (data.type === 'CUBE') {
                // FRACTURE ATTACK: Expands into 8 cubes, orbits, fires
                if (data.subState === 'IDLE') {
                    if (data.subTimer > 120) {
                        data.subState = 'FRACTURE';
                        data.subTimer = 0;
                    }
                } else if (data.subState === 'FRACTURE') {
                    // Expand
                    data.expansion = Math.min(1, (data.expansion || 0) + 0.05);
                    if (data.expansion >= 1) {
                        data.subState = 'BARRAGE';
                        data.subTimer = 0;
                    }
                } else if (data.subState === 'BARRAGE') {
                    // Stay expanded, rotate (handled in renderer), and FIRE
                    if (data.subTimer > 180) { // Fire for 3 seconds
                        data.subState = 'REFORM';
                    } else if (data.subTimer % 15 === 0) {
                        // Fire from 8 sub-cube positions? Or just from center outwards?
                        // Let's fire from the orbital positions to look cool
                        const offsets = [
                            {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:1, y:-1, z:1}, {x:1, y:-1, z:-1},
                            {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1}
                        ];
                        const rotX = frame * 0.02;
                        const rotY = frame * 0.03;
                        const s = boss.radius * 2.5; // Expansion scale matches renderer
                        
                        offsets.forEach(off => {
                            // Rotate offset
                            let y1 = off.y * Math.cos(rotX) - off.z * Math.sin(rotX);
                            let z1 = off.y * Math.sin(rotX) + off.z * Math.cos(rotX);
                            let x2 = off.x * Math.cos(rotY) - z1 * Math.sin(rotY);
                            let y2 = y1;
                            
                            const spawnX = boss.pos.x + x2 * s;
                            const spawnY = boss.pos.y + y2 * s;
                            
                            // Aim at player
                            const shotAngle = Math.atan2(player.pos.y - spawnY, player.pos.x - spawnX);
                            
                            result.newProjectiles.push(getProjectile({
                                id: Math.random().toString(),
                                type: EntityType.PROJECTILE,
                                pos: { x: spawnX, y: spawnY },
                                velocity: { x: Math.cos(shotAngle) * 6, y: Math.sin(shotAngle) * 6 },
                                radius: 5,
                                color: '#FF0000', // Changed to Pure Red
                                markedForDeletion: false,
                                damage: 15,
                                duration: 160, // Doubled range (was 80)
                                pierce: 0,
                                knockback: 0,
                                isEnemy: true,
                                homingTargetId: 'player', // Homing on player
                                turnSpeed: 0.04
                            }));
                        });
                    }
                } else if (data.subState === 'REFORM') {
                    data.expansion = Math.max(0, (data.expansion || 0) - 0.05);
                    if (data.expansion <= 0) {
                        data.subState = 'IDLE';
                        data.subTimer = 0;
                    }
                }
                
                // Movement: Relentlessly move towards player unless FIRING
                if (data.subState !== 'BARRAGE' && data.subState !== 'FRACTURE') {
                    speed = boss.speed;
                } else {
                    speed = 0;
                }

            } else if (data.type === 'PYRAMID') {
                // SPEAR CHARGE: Deforms to arrowhead, dashes
                if (data.subState === 'IDLE') {
                    if (data.subTimer > 60) { // Reduced from 90 to be snappier
                        data.subState = 'CHARGE';
                        data.subTimer = 0;
                    }
                } else if (data.subState === 'CHARGE') {
                    // TRACKING PHASE: Follow player for first ~60% of charge
                    if (data.subTimer < 45) {
                        data.aimAngle = Math.atan2(player.pos.y - boss.pos.y, player.pos.x - boss.pos.x);
                    }
                    
                    // LOCK PHASE: Stop tracking, telegraph
                    if (data.subTimer === 45) {
                         result.screenShake = 2;
                         // Removed text popup per request
                    }

                    // Deform geometry
                    data.deformation = Math.min(1, (data.deformation || 0) + 0.03);
                    speed = 0;
                    
                    if (data.deformation >= 1 && data.subTimer > 70) {
                        data.subState = 'DASH';
                        data.subTimer = 0;
                        result.screenShake = 10;
                    }
                } else if (data.subState === 'DASH') {
                    speed = 35; // Increased Speed (was 25)
                    if (data.aimAngle !== undefined) {
                        result.velocity = { 
                            x: Math.cos(data.aimAngle) * speed, 
                            y: Math.sin(data.aimAngle) * speed 
                        };
                    }
                    if (data.subTimer > 25) { // Increased Duration (was 20)
                        data.subState = 'RECOVER';
                        data.subTimer = 0;
                    }
                    // Override default movement below
                    targetX = boss.pos.x + result.velocity.x;
                    targetY = boss.pos.y + result.velocity.y;
                } else if (data.subState === 'RECOVER') {
                    speed = 0;
                    data.deformation = Math.max(0, (data.deformation || 0) - 0.05);
                    if (data.deformation <= 0 && data.subTimer > 40) {
                        data.subState = 'IDLE';
                        data.subTimer = 0;
                    }
                } else {
                    // Track player when idle
                    speed = boss.speed;
                }

            } else if (data.type === 'ORB') {
                // ORB LASER: Split open, fire 3 big lasers
                if (data.subState === 'IDLE') {
                    if (data.subTimer > 100) {
                        data.subState = 'OPEN';
                        data.subTimer = 0;
                    }
                } else if (data.subState === 'OPEN') {
                    speed = 0.5; // Slow move
                    data.gap = Math.min(1, (data.gap || 0) + 0.05);
                    if (data.gap >= 1) {
                        data.subState = 'LASER_CHARGE';
                        data.subTimer = 0;
                        data.attackCount = 0; // Shots fired
                    }
                } else if (data.subState === 'LASER_CHARGE') {
                    speed = 0;
                    
                    // TARGETING PHASE: Track player for 0.5s (30 frames)
                    if (data.subTimer <= 30 || data.aimAngle === undefined) {
                        const angle = Math.atan2(player.pos.y - boss.pos.y, player.pos.x - boss.pos.x);
                        data.aimAngle = angle;
                    }
                    // GAP PHASE: Lock aim for 3 seconds (180 frames)
                    // Total charge time = 30 + 180 = 210 frames
                    if (data.subTimer > 30) {
                        data.subState = 'LASER_FIRE';
                        data.subTimer = 0;
                        
                        // Fire Laser
                        result.newProjectiles.push(getProjectile({
                            id: `orb_laser_${boss.id}_${Date.now()}`,
                            type: EntityType.PROJECTILE,
                            pos: { ...boss.pos },
                            velocity: { x: 0, y: 0 },
                            radius: 0,
                            color: '#FF0000',
                            markedForDeletion: false,
                            damage: 30,
                            duration: 20, // Instant beam duration
                            pierce: 999,
                            knockback: 20,
                            isEnemy: true,
                            beamData: {
                                angle: data.aimAngle,
                                length: 2000,
                                width: 20,
                                tickRate: 5
                            }
                        }));
                        result.screenShake = 5;
                        result.newParticles.push(createTextParticle(boss.pos, "BLAST", '#FFFFFF', 30));
                        data.attackCount = (data.attackCount || 0) + 1;
                    }
                } else if (data.subState === 'LASER_FIRE') {
                    // Brief pause between shots
                    if (data.subTimer > 15) {
                        if (data.attackCount && data.attackCount < 3) {
                            data.subState = 'LASER_CHARGE';
                            data.subTimer = 0;
                        } else {
                            data.subState = 'CLOSE';
                            data.subTimer = 0;
                        }
                    }
                } else if (data.subState === 'CLOSE') {
                    data.gap = Math.max(0, (data.gap || 0) - 0.05);
                    if (data.gap <= 0) {
                        data.subState = 'IDLE';
                        data.subTimer = 0;
                    }
                } else {
                    // Track player when idle
                    speed = boss.speed;
                }
            }

        } else {
            // SUPPORT ROLE: Formation
            // Find Aggressor
            let leader: Enemy | undefined;
            if (ctx.allEnemies) {
                leader = ctx.allEnemies.find(e => e.trinityData?.role === 'AGGRESSOR' && !e.markedForDeletion);
            }
            const centerObj = leader || player;
            const ldx = player.pos.x - centerObj.pos.x;
            const ldy = player.pos.y - centerObj.pos.y;
            const faceAngle = Math.atan2(ldy, ldx);
            
            if (leader) {
                // Target is behind leader
                const formDist = 900; // Increased distance
                let mySlotAngle = faceAngle + Math.PI; 
                if (leader.trinityData?.type === 'CUBE') {
                    if (data.type === 'PYRAMID') mySlotAngle = faceAngle - (Math.PI * 0.8);
                    if (data.type === 'ORB') mySlotAngle = faceAngle + (Math.PI * 0.8);
                } else if (leader.trinityData?.type === 'PYRAMID') {
                    if (data.type === 'ORB') mySlotAngle = faceAngle - (Math.PI * 0.8);
                    if (data.type === 'CUBE') mySlotAngle = faceAngle + (Math.PI * 0.8);
                } else { // ORB Leader
                    if (data.type === 'CUBE') mySlotAngle = faceAngle - (Math.PI * 0.8);
                    if (data.type === 'PYRAMID') mySlotAngle = faceAngle + (Math.PI * 0.8);
                }
                
                targetX = leader.pos.x + Math.cos(mySlotAngle) * formDist;
                targetY = leader.pos.y + Math.sin(mySlotAngle) * formDist;
                speed = boss.speed * 1.5; 
            } else {
                // Orbit player
                const orbitSpeed = Date.now() * 0.001;
                const orbitR = 900; // Increased distance
                const phase = data.type === 'CUBE' ? 0 : (data.type === 'PYRAMID' ? 2 : 4);
                targetX = player.pos.x + Math.cos(orbitSpeed + phase) * orbitR;
                targetY = player.pos.y + Math.sin(orbitSpeed + phase) * orbitR;
            }
        }

        // Apply Movement (If not Dashing)
        if (data.subState !== 'DASH') {
            const dx = targetX - boss.pos.x;
            const dy = targetY - boss.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 10) {
                result.velocity = { 
                    x: (dx / dist) * speed, 
                    y: (dy / dist) * speed 
                };
            } else {
                result.velocity = { x: 0, y: 0 };
            }
        } else {
            // Velocity already set in DASH logic
        }

        boss.rotation = (boss.rotation || 0) + 0.02;

        return result;
    }
}
