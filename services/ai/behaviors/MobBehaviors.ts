
import { Enemy, Player, EnemyType, EntityType } from '../../../types';
import { IEnemyBehavior, AIResult, AIContext } from '../types';
import { createEmptyResult } from '../utils';
import { getProjectile } from '../../objectPools';
import { createTextParticle } from '../../gameLogic';

// ... (Existing behaviors: UtatuBehavior, SentinelBehavior, GhostBehavior, LaserLotusBehavior, LancerBehavior, OrbitalSniperBehavior) ...
// KEEPING EXISTING BEHAVIORS - appending new ones

export class UtatuBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const angleToPlayer = Math.atan2(dy, dx);

        let neighbors: Enemy[] = [];
        if (ctx.allEnemies) {
            neighbors = ctx.allEnemies.filter(e => 
                e.enemyType === EnemyType.UTATU && 
                e.id !== enemy.id && 
                !e.markedForDeletion
            );
        }

        const ORBIT_RAD = 350;
        const ENGAGEMENT_DIST = ORBIT_RAD + 50; 

        if (neighbors.length > 0 && dist <= ENGAGEMENT_DIST) {
            neighbors.forEach(neighbor => {
                if (enemy.id < neighbor.id) {
                    const ndx = neighbor.pos.x - enemy.pos.x;
                    const ndy = neighbor.pos.y - enemy.pos.y;
                    const nDist = Math.sqrt(ndx*ndx + ndy*ndy);
                    const nAngle = Math.atan2(ndy, ndx);
                    
                    const pNdx = player.pos.x - neighbor.pos.x;
                    const pNdy = player.pos.y - neighbor.pos.y;
                    const pNdist = Math.sqrt(pNdx*pNdx + pNdy*pNdy);

                    if (nDist < 800 && pNdist <= ENGAGEMENT_DIST) {
                        result.newProjectiles.push(getProjectile({
                            id: `utatu_link_${enemy.id}_${neighbor.id}`,
                            type: EntityType.PROJECTILE,
                            pos: { ...enemy.pos },
                            velocity: { x: 0, y: 0 },
                            radius: 2, 
                            color: '#9900FF',
                            markedForDeletion: false,
                            damage: 20, 
                            duration: 1, 
                            pierce: 999,
                            knockback: 0,
                            isEnemy: true,
                            beamData: {
                                angle: nAngle,
                                length: nDist,
                                width: 4, 
                                tickRate: 10
                            }
                        }));
                    }
                }
            });
        }

        const isSwarm = neighbors.length >= 2; 

        if (isSwarm) {
            enemy.state = 'ATTACK';
            const orbitSpeed = enemy.speed * 1.2;
            const inwardSpeed = 1.0;
            const dir = (enemy.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
            const orbitX = Math.cos(angleToPlayer + (Math.PI / 2 * dir));
            const orbitY = Math.sin(angleToPlayer + (Math.PI / 2 * dir));
            const inX = Math.cos(angleToPlayer);
            const inY = Math.sin(angleToPlayer);
            
            result.velocity = {
                x: (orbitX * orbitSpeed) + (inX * inwardSpeed),
                y: (orbitY * orbitSpeed) + (inY * inwardSpeed)
            };
        } else {
            enemy.state = neighbors.length > 0 ? 'ATTACK' : 'IDLE';
            if (dist > ORBIT_RAD + 50) {
                result.velocity = { x: Math.cos(angleToPlayer) * enemy.speed, y: Math.sin(angleToPlayer) * enemy.speed };
            } else if (dist < ORBIT_RAD - 50) {
                result.velocity = { x: -Math.cos(angleToPlayer) * enemy.speed, y: -Math.sin(angleToPlayer) * enemy.speed };
            } else {
                const orbitSpeed = enemy.speed * 0.8;
                const dir = (enemy.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
                const orbitAngle = angleToPlayer + (Math.PI / 2 * dir);
                result.velocity = { x: Math.cos(orbitAngle) * orbitSpeed, y: Math.sin(orbitAngle) * orbitSpeed };
            }
        }
        enemy.rotation = (enemy.rotation || 0) + 0.02;
        return result;
    }
}

export class SentinelBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const distSq = dx * dx + dy * dy;
        const angle = Math.atan2(dy, dx);

        if (distSq > 350 * 350) {
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
            enemy.state = 'IDLE';
        } else {
            result.velocity = { x: 0, y: 0 };
            enemy.state = 'ATTACK';
            enemy.attackTimer++;
            
            if (enemy.attackTimer >= 60) { 
                enemy.attackTimer = 0;
                result.newProjectiles.push(getProjectile({
                    id: Math.random().toString(),
                    type: EntityType.PROJECTILE,
                    pos: { ...enemy.pos },
                    velocity: { x: Math.cos(angle) * 7.5, y: Math.sin(angle) * 7.5 }, 
                    radius: 8,
                    color: '#ff0000',
                    markedForDeletion: false,
                    damage: enemy.damage,
                    duration: 100,
                    pierce: 0,
                    knockback: 0,
                    isEnemy: true
                }));
            }
        }
        return result;
    }
}

export class GhostBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);

        enemy.attackTimer++;
        if (enemy.attackTimer < 80) { 
            enemy.opacity = 1;
            enemy.speed = 2.25; 
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        } else if (enemy.attackTimer < 166) { 
            // Reduced Opacity to 0.2 for Predatory Distortion effect
            enemy.opacity = 0.2; 
            enemy.speed = 7.5; 
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        } else {
            enemy.opacity = Math.min(1, (enemy.opacity || 0) + 0.05);
            if (enemy.attackTimer > 186) enemy.attackTimer = 0;
            result.velocity = { x: Math.cos(angle) * 2.25, y: Math.sin(angle) * 2.25 };
        }
        return result;
    }
}

export class LaserLotusBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        
        // Slower rotation
        enemy.rotation = (enemy.rotation || 0) + 0.008;
        enemy.attackTimer++;
        
        // Beam Expand/Contract Cycle (with full withdrawal)
        const cycleSpeed = 0.02;
        const maxLen = 400;
        
        // Wave oscillates between -1 and 1
        const wave = Math.sin(enemy.attackTimer * cycleSpeed);
        
        // Threshold: Below this, beam is length 0 (retracted)
        // Range: -1 to 1. If we cutoff at -0.4, it's off ~30% of time.
        const cutoff = -0.4;
        
        let beamLength = 0;
        if (wave > cutoff) {
            // Normalize (cutoff -> 1) to (0 -> 1)
            const normalized = (wave - cutoff) / (1 - cutoff);
            beamLength = normalized * maxLen;
        }
        
        // Only spawn beams if they have meaningful length
        if (beamLength > 10) {
            const beamCount = 6;
            for (let i = 0; i < beamCount; i++) {
                const beamAngle = enemy.rotation! + (i * (Math.PI * 2 / beamCount));
                result.newProjectiles.push(getProjectile({
                    id: `lotus_${enemy.id}_${i}`,
                    type: EntityType.PROJECTILE,
                    pos: { ...enemy.pos },
                    velocity: { x: 0, y: 0 },
                    radius: 0,
                    color: '#ff0055',
                    markedForDeletion: false,
                    damage: enemy.damage,
                    duration: 1,
                    pierce: 999,
                    knockback: 0,
                    isEnemy: true,
                    beamData: {
                        angle: beamAngle,
                        length: beamLength,
                        width: 4,
                        tickRate: 0
                    }
                }));
            }
        }
        
        const t = Date.now() / 1000;
        const phase = enemy.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100 * 0.06;
        const orbitRad = 250; 
        const orbitSpeed = 0.2;
        
        const targetX = player.pos.x + Math.cos(t * orbitSpeed + phase) * orbitRad;
        const targetY = player.pos.y + Math.sin(t * orbitSpeed + phase) * orbitRad;
        
        const dxOrb = targetX - enemy.pos.x;
        const dyOrb = targetY - enemy.pos.y;
        const angleOrb = Math.atan2(dyOrb, dxOrb);
        
        result.velocity = { x: Math.cos(angleOrb) * enemy.speed, y: Math.sin(angleOrb) * enemy.speed };
        return result;
    }
}

export class LancerBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);

        if (enemy.state === 'IDLE' || !enemy.state) {
            let currentRot = enemy.rotation || 0;
            let diff = angle - currentRot;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            enemy.rotation = currentRot + Math.max(-0.1, Math.min(0.1, diff));
            
            result.velocity = { x: Math.cos(enemy.rotation!) * 0.75, y: Math.sin(enemy.rotation!) * 0.75 };
            
            enemy.attackTimer++;
            if (enemy.attackTimer > 53) {
                enemy.state = 'CHARGE';
                enemy.attackTimer = 0;
            }
        } else if (enemy.state === 'CHARGE') {
            const speed = 13.5;
            result.velocity = { x: Math.cos(enemy.rotation!) * speed, y: Math.sin(enemy.rotation!) * speed };
            
            enemy.attackTimer++;
            if (enemy.attackTimer > 40) {
                enemy.state = 'COOLDOWN';
                enemy.attackTimer = 0;
            }
        } else if (enemy.state === 'COOLDOWN') {
            result.velocity = { x: 0, y: 0 };
            enemy.attackTimer++;
            if (enemy.attackTimer > 26) {
                enemy.state = 'IDLE';
                enemy.attackTimer = 0;
            }
        }
        return result;
    }
}

export class OrbitalSniperBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const distSq = dx * dx + dy * dy;
        const angle = Math.atan2(dy, dx);

        enemy.attackTimer++;
        
        const FIRE_INTERVAL = 180;
        const AIM_DURATION = 60;
        
        if (enemy.attackTimer >= FIRE_INTERVAL) {
             result.newProjectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...enemy.pos },
                velocity: { x: Math.cos(enemy.rotation!) * 20, y: Math.sin(enemy.rotation!) * 20 },
                radius: 5,
                color: '#ff0000',
                markedForDeletion: false,
                damage: enemy.damage,
                duration: 100,
                pierce: 0,
                knockback: 0,
                isEnemy: true
            }));
            enemy.attackTimer = 0;
            enemy.state = 'COOLDOWN';
        } else if (enemy.attackTimer >= FIRE_INTERVAL - AIM_DURATION) {
            enemy.state = 'AIMING';
            result.velocity = { x: 0, y: 0 }; 
            enemy.rotation = angle;
        } else {
            enemy.state = 'IDLE';
            enemy.rotation = angle;
            
            const dist = Math.sqrt(distSq);
            const OPTIMAL_MIN = 350;
            const OPTIMAL_MAX = 550;

            if (dist < OPTIMAL_MIN) {
                result.velocity = { x: -Math.cos(angle) * enemy.speed, y: -Math.sin(angle) * enemy.speed };
            } else if (dist > OPTIMAL_MAX) {
                result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
            } else {
                const orbitDir = (enemy.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
                const orbitAngle = angle + (Math.PI / 2 * orbitDir);
                result.velocity = { x: Math.cos(orbitAngle) * enemy.speed * 0.75, y: Math.sin(orbitAngle) * enemy.speed * 0.75 };
            }
        }
        return result;
    }
}

// --- NEW BEHAVIORS ---

export class MandelbrotBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        // Simple tracking, splitting handled in EnemySystem death logic
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        
        result.velocity = { 
            x: Math.cos(angle) * enemy.speed, 
            y: Math.sin(angle) * enemy.speed 
        };
        return result;
    }
}

export class MonolithBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        // Very slow drift, practically a hazard
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        
        result.velocity = { 
            x: Math.cos(angle) * enemy.speed, 
            y: Math.sin(angle) * enemy.speed 
        };
        
        // Rotation for visual effect (slow spin)
        enemy.rotation = (enemy.rotation || 0) + 0.005;
        
        return result;
    }
}
