
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
        // Telegraph the imminent phase-out in the final frames before vanishing.
        enemy.customData = enemy.customData || {};
        enemy.customData.telegraph = enemy.attackTimer >= 70 && enemy.attackTimer < 80;
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

// --- BRAINSTORM ROSTER (v0.28) ---

// Support unit: hovers at range, never attacks, pulses a regen aura onto allies.
export class SankofaTotemBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);

        const HOVER = 320;
        if (dist > HOVER + 60) {
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        } else if (dist < HOVER - 60) {
            result.velocity = { x: -Math.cos(angle) * enemy.speed, y: -Math.sin(angle) * enemy.speed };
        } else {
            const dir = (enemy.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
            const oa = angle + (Math.PI / 2) * dir;
            result.velocity = { x: Math.cos(oa) * enemy.speed * 0.6, y: Math.sin(oa) * enemy.speed * 0.6 };
        }

        enemy.rotation = (enemy.rotation || 0) + 0.012;
        enemy.attackTimer++;

        const AURA = 320;
        if (enemy.attackTimer % 30 === 0 && ctx.allEnemies) {
            for (const ally of ctx.allEnemies) {
                if (ally.id === enemy.id || ally.markedForDeletion) continue;
                if (ally.enemyType === EnemyType.SANKOFA_TOTEM || ally.isBoss) continue;
                const adx = ally.pos.x - enemy.pos.x;
                const ady = ally.pos.y - enemy.pos.y;
                if (adx * adx + ady * ady > AURA * AURA) continue;
                if (ally.health < ally.maxHealth) {
                    ally.health = Math.min(ally.maxHealth, ally.health + ally.maxHealth * 0.04);
                    if (Math.random() < 0.25) {
                        result.newParticles.push(createTextParticle({ x: ally.pos.x, y: ally.pos.y - ally.radius - 8 }, "+", '#FFAA33', 22));
                    }
                }
            }
        }
        return result;
    }
}

// Blink assassin: hops toward the player, leaving a damaging shard at the old spot.
export class KintsugiWraithBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);

        result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        enemy.rotation = (enemy.rotation || 0) + 0.15;
        enemy.attackTimer++;

        if (enemy.attackTimer >= 70) {
            enemy.attackTimer = 0;
            // Leave a lingering gold shard hazard where we were standing.
            result.newProjectiles.push(getProjectile({
                id: `kintsugi_${enemy.id}_${Math.random()}`,
                type: EntityType.PROJECTILE,
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                velocity: { x: 0, y: 0 },
                radius: 22,
                color: '#FFB000',
                markedForDeletion: false,
                damage: enemy.damage,
                duration: 70,
                pierce: 999,
                knockback: 0,
                isEnemy: true
            }));
            result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y }, "✦", '#FFB000', 30));
            // Teleport hop toward the player (don't overshoot).
            const hop = Math.min(140, dist - enemy.radius);
            if (hop > 0) {
                enemy.pos.x += Math.cos(angle) * hop;
                enemy.pos.y += Math.sin(angle) * hop;
            }
        }
        return result;
    }
}

// Gravity well: slow drift, continuously drags the player inward (consumed in EnemySystem).
export class CalabashVoidBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);

        enemy.gravityPull = 10; // EnemySystem applies the inward force on the player.
        enemy.rotation = (enemy.rotation || 0) + 0.01;
        result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        return result;
    }
}

// Mobile spawner: drifts at range, cracks open to release Swarmers, then seals.
export class AnansiBroodPodBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);

        enemy.attackTimer++;
        enemy.customData = enemy.customData || {};
        const opening = enemy.attackTimer > 120;
        enemy.customData.open = opening;
        enemy.state = opening ? 'ATTACK' : 'IDLE';

        // Hold a mid-range distance while alive.
        if (dist > 340) result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        else if (dist < 240) result.velocity = { x: -Math.cos(angle) * enemy.speed, y: -Math.sin(angle) * enemy.speed };

        enemy.rotation = (enemy.rotation || 0) + 0.01;

        if (enemy.attackTimer >= 150) {
            enemy.attackTimer = 0;
            const broodCount = 3;
            for (let i = 0; i < broodCount; i++) {
                const a = (i / broodCount) * Math.PI * 2;
                const spawnPos = { x: enemy.pos.x + Math.cos(a) * (enemy.radius + 4), y: enemy.pos.y + Math.sin(a) * (enemy.radius + 4) };
                const baby = ctx.spawnEnemy(player, EnemyType.SWARMER, spawnPos);
                result.newEnemies.push(baby);
            }
            result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y - enemy.radius }, "HATCH", '#FF8800', 26));
        }
        return result;
    }
}

// Resource leech: kites at range, drains via a beam, heals itself.
export class SankofaSiphonBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);
        enemy.rotation = angle;

        const MIN = 360;
        const MAX = 520;
        if (dist < MIN) {
            result.velocity = { x: -Math.cos(angle) * enemy.speed, y: -Math.sin(angle) * enemy.speed };
        } else if (dist > MAX) {
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        } else {
            const dir = (enemy.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
            const oa = angle + (Math.PI / 2) * dir;
            result.velocity = { x: Math.cos(oa) * enemy.speed * 0.8, y: Math.sin(oa) * enemy.speed * 0.8 };
        }

        // Drain beam while in feeding range.
        if (dist < 620) {
            enemy.state = 'ATTACK';
            result.newProjectiles.push(getProjectile({
                id: `siphon_${enemy.id}`,
                type: EntityType.PROJECTILE,
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                velocity: { x: 0, y: 0 },
                radius: 2,
                color: '#FFC400',
                markedForDeletion: false,
                damage: 8,
                duration: 1,
                pierce: 999,
                knockback: 0,
                isEnemy: true,
                beamData: { angle, length: dist, width: 5, tickRate: 30 }
            }));
            // Heal itself as it feeds.
            enemy.health = Math.min(enemy.maxHealth, enemy.health + 0.6);
        } else {
            enemy.state = 'IDLE';
        }
        return result;
    }
}

// Rhythm-gated armor: invulnerable except during the brief heartbeat flare.
export class ObsidianHeartBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);

        result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        enemy.rotation = (enemy.rotation || 0) + 0.01;
        enemy.attackTimer++;

        const beat = Math.sin(enemy.attackTimer * 0.05);
        enemy.customData = enemy.customData || {};
        enemy.customData.vulnerable = beat > 0.7; // ~18% of the cycle
        enemy.state = enemy.customData.vulnerable ? 'FLARE' : 'IDLE';
        return result;
    }
}

// Mimic: shadows the player and periodically fires a volley back.
export class MirrorDjinnBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);
        enemy.rotation = angle;
        enemy.attackTimer++;

        // Approach with a mirrored lateral sway.
        const sway = Math.sin(enemy.attackTimer * 0.06);
        const perp = angle + Math.PI / 2;
        result.velocity = {
            x: Math.cos(angle) * enemy.speed * 0.7 + Math.cos(perp) * sway * enemy.speed,
            y: Math.sin(angle) * enemy.speed * 0.7 + Math.sin(perp) * sway * enemy.speed
        };

        enemy.customData = enemy.customData || {};
        if (enemy.customData.flash > 0) enemy.customData.flash--;

        if (enemy.attackTimer % 90 === 0 && dist < 650) {
            const weaponColor = (player.weapons && player.weapons[0] && (player.weapons[0] as any).color) || '#E0E0F0';
            // Telegraph the mirrored volley: flash the stolen weapon colour.
            enemy.customData.flash = 12;
            enemy.customData.weaponColor = weaponColor;
            for (let i = -1; i <= 1; i++) {
                const a = angle + i * 0.18;
                result.newProjectiles.push(getProjectile({
                    id: `djinn_${enemy.id}_${Math.random()}`,
                    type: EntityType.PROJECTILE,
                    pos: { x: enemy.pos.x, y: enemy.pos.y },
                    velocity: { x: Math.cos(a) * 9, y: Math.sin(a) * 9 },
                    radius: 5,
                    color: weaponColor,
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

// Area denial: wanders erratically, laying a trail of lingering damage zones.
export class DatamoshCorruptorBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        enemy.attackTimer++;

        // Erratic drift toward the player.
        const wobble = Math.sin(enemy.attackTimer * 0.13) * 0.8;
        const a = angle + wobble;
        result.velocity = { x: Math.cos(a) * enemy.speed, y: Math.sin(a) * enemy.speed };
        enemy.rotation = (enemy.rotation || 0) + 0.05;

        if (enemy.attackTimer % 25 === 0) {
            result.newProjectiles.push(getProjectile({
                id: `datamosh_${enemy.id}_${Math.random()}`,
                type: EntityType.PROJECTILE,
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                velocity: { x: 0, y: 0 },
                radius: 26,
                color: '#F0F0F0',
                markedForDeletion: false,
                damage: Math.round(enemy.damage * 0.6),
                duration: 150,
                pierce: 999,
                knockback: 0,
                isEnemy: true
            }));
        }
        return result;
    }
}

// Squad commander: chases like a drone but periodically rallies nearby basic Drones, briefly boosting their speed.
export class EliteDroneBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player, ctx: AIContext): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        enemy.rotation = angle;
        result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };

        enemy.attackTimer++;
        enemy.customData = enemy.customData || {};
        if (enemy.customData.rally > 0) enemy.customData.rally--;

        const RALLY_RAD = 280;
        if (enemy.attackTimer % 45 === 0 && ctx.allEnemies) {
            enemy.customData.rally = 14; // drives the commander ring glow in the renderer
            for (const ally of ctx.allEnemies) {
                if (ally.id === enemy.id || ally.markedForDeletion) continue;
                if (ally.enemyType !== EnemyType.DRONE) continue;
                const adx = ally.pos.x - enemy.pos.x;
                const ady = ally.pos.y - enemy.pos.y;
                if (adx * adx + ady * ady > RALLY_RAD * RALLY_RAD) continue;
                ally.customData = ally.customData || {};
                ally.customData.buffFrames = 90; // consumed in DefaultBehavior
                if (Math.random() < 0.15) {
                    result.newParticles.push(createTextParticle({ x: ally.pos.x, y: ally.pos.y - ally.radius - 6 }, "▲", '#FF5500', 18));
                }
            }
        }
        return result;
    }
}

// Serpentine pursuer: chases the player with a winding lateral weave (matches its "winding movement" flavour).
export class NeonCobraBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        enemy.attackTimer++;

        const sway = Math.sin(enemy.attackTimer * 0.18) * 0.9;
        const perp = angle + Math.PI / 2;
        const vx = Math.cos(angle) * enemy.speed + Math.cos(perp) * sway * enemy.speed;
        const vy = Math.sin(angle) * enemy.speed + Math.sin(perp) * sway * enemy.speed;
        result.velocity = { x: vx, y: vy };
        // Orient the serpent along its actual slither direction.
        enemy.rotation = Math.atan2(vy, vx);
        return result;
    }
}

// Seismic heavy: lumbers forward, plants its feet to telegraph, then slams a radial shockwave nova.
export class AsaseColossusBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        enemy.rotation = angle;
        enemy.attackTimer++;
        enemy.customData = enemy.customData || {};

        const CYCLE = 160;
        const WINDUP = 30;
        const phase = enemy.attackTimer % CYCLE;
        const winding = phase >= CYCLE - WINDUP;
        enemy.customData.winding = winding;

        if (winding) {
            // Plant feet and telegraph the slam.
            enemy.state = 'CHARGE';
            result.velocity = { x: Math.cos(angle) * enemy.speed * 0.1, y: Math.sin(angle) * enemy.speed * 0.1 };
        } else {
            enemy.state = 'IDLE';
            result.velocity = { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed };
        }

        // SLAM at the top of the cycle: radial shockwave nova.
        if (phase === 0 && enemy.attackTimer > 0) {
            const count = 12;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                result.newProjectiles.push(getProjectile({
                    id: `asase_${enemy.id}_${i}_${Math.random()}`,
                    type: EntityType.PROJECTILE,
                    pos: { x: enemy.pos.x, y: enemy.pos.y },
                    velocity: { x: Math.cos(a) * 4.5, y: Math.sin(a) * 4.5 },
                    radius: 12,
                    color: '#FF6600',
                    markedForDeletion: false,
                    damage: enemy.damage,
                    duration: 90,
                    pierce: 0,
                    knockback: 6,
                    isEnemy: true
                }));
            }
            result.screenShake = 8;
            result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y - enemy.radius }, "SLAM", '#FF6600', 30));
        }
        return result;
    }
}
