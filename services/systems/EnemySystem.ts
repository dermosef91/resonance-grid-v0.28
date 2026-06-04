
import { Enemy, Player, Projectile, VisualParticle, TextParticle, EnemyType, EntityType, Obstacle } from '../../types';
import { spawnEnemy, createTextParticle } from '../gameLogic';
import { checkCollision, SpatialHash, resolveStaticCollision } from '../PhysicsSystem';
import { getVisualParticle } from '../objectPools';
import { EnemyBehaviors } from '../ai/EnemyBehaviors';
import { MASS } from '../data/enemies';

export interface EnemyUpdateResult {
    newProjectiles: Projectile[];
    newEnemies: Enemy[];
    newParticles: (VisualParticle | TextParticle)[];
    playerDamageTaken: number;
    lastHitter?: string;
    screenShake?: number;
}

export const updateEnemies = (
    enemies: Enemy[],
    player: Player,
    frame: number,
    grid?: SpatialHash,
    isFrozen: boolean = false,
    obstacles: Obstacle[] = []
): EnemyUpdateResult => {
    const result: EnemyUpdateResult = {
        newProjectiles: [],
        newEnemies: [],
        newParticles: [],
        playerDamageTaken: 0,
        screenShake: 0
    };

    const ATTACK_SLOTS = 20;
    const WAITING_RADIUS = 220;
    const activeIds = new Set<string>();
    enemies.forEach(e => { if (e.isBoss) activeIds.add(e.id); });
    const candidates = enemies.filter(e => !e.isBoss);
    const candidatesWithDist = candidates.map(e => ({ enemy: e, distSq: (e.pos.x - player.pos.x) ** 2 + (e.pos.y - player.pos.y) ** 2 }));
    candidatesWithDist.sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < Math.min(candidatesWithDist.length, ATTACK_SLOTS); i++) { activeIds.add(candidatesWithDist[i].enemy.id); }

    enemies.forEach(enemy => {
        // --- 1. ROTATIONAL VELOCITY DECAY (Tumbling) ---
        if (enemy.rotVelocity && Math.abs(enemy.rotVelocity) > 0.001) {
            // Apply Tumble
            enemy.rotation = (enemy.rotation || 0) + enemy.rotVelocity;
            // Decay
            enemy.rotVelocity *= 0.92;
        } else {
            enemy.rotVelocity = 0;
        }

        // If frozen, skip movement and behavior updates
        if (isFrozen) {
            // Still check collision with player (if player runs into frozen enemy)
            // But skip AI logic
        } else {
            // Handle Slow
            if (enemy.slowTimer && enemy.slowTimer > 0) {
                enemy.slowTimer--;
                // Visual indicator
                // if (frame % 20 === 0) result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y - enemy.radius }, "SLOW", '#0000FF', 30));
            }

            // Handle Bleed
            if (enemy.bleedTimer && enemy.bleedTimer > 0) {
                // Tick every 15 frames (4 times per second)
                if (enemy.bleedTimer % 15 === 0) {
                    const tickDamage = (enemy.bleedDamage || 0) / 4;
                    if (tickDamage > 0) {
                        enemy.health -= tickDamage;
                        result.newParticles.push(createTextParticle({ x: enemy.pos.x + (Math.random() - 0.5) * 20, y: enemy.pos.y - enemy.radius - 10 }, Math.round(tickDamage).toString(), '#FF0000', 20));
                    }
                }
                enemy.bleedTimer--;
            }

            // Calculate Effective Speed
            const originalSpeed = enemy.speed;
            if (enemy.slowTimer && enemy.slowTimer > 0) {
                enemy.speed *= 0.5; // 50% slow
            }

            const isActive = activeIds.has(enemy.id);
            let aiResult;

            if (isActive) {
                const bHandler = EnemyBehaviors[enemy.enemyType] || EnemyBehaviors['DEFAULT'];
                aiResult = bHandler.update(enemy, player, { spawnEnemy, allEnemies: enemies });
            } else {
                const angle = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x);
                const targetPos = { x: player.pos.x + Math.cos(angle) * WAITING_RADIUS, y: player.pos.y + Math.sin(angle) * WAITING_RADIUS };
                const dummyTarget = { ...player, pos: targetPos };
                const bHandler = EnemyBehaviors[enemy.enemyType] || EnemyBehaviors['DEFAULT'];
                aiResult = bHandler.update(enemy, dummyTarget, { spawnEnemy, allEnemies: enemies });
                aiResult.newProjectiles = []; aiResult.newEnemies = [];
                const dTx = targetPos.x - enemy.pos.x; const dTy = targetPos.y - enemy.pos.y;
                if (dTx * dTx + dTy * dTy < 100) { aiResult.velocity.x *= 0.1; aiResult.velocity.y *= 0.1; }
            }

            // Restore speed for next frame logic (so it doesn't degrade recursively if stateful)
            enemy.speed = originalSpeed;

            // Physics
            if (grid) {
                const myMass = MASS[enemy.enemyType] || 2;
                let forceX = 0; let forceY = 0;
                const separationPadding = enemy.enemyType === EnemyType.LASER_LOTUS ? 600 : 60;
                const detectRad = enemy.radius + separationPadding;
                const neighbors = grid.query(enemy.pos, detectRad);

                for (const other of neighbors) {
                    if (other.id === enemy.id) continue;
                    if (other.type !== EntityType.ENEMY) continue;
                    const otherEnemy = other as Enemy;
                    const dx = enemy.pos.x - other.pos.x; const dy = enemy.pos.y - other.pos.y;
                    const distSq = dx * dx + dy * dy; const dist = Math.sqrt(distSq) || 0.001;
                    const radSum = enemy.radius + other.radius; const otherMass = MASS[otherEnemy.enemyType] || 2;
                    const dirX = dx / dist; const dirY = dy / dist;

                    if (dist < radSum) {
                        const overlap = radSum - dist; const influence = otherMass / (myMass + otherMass); const pushStrength = 1.0 * influence;
                        forceX += dirX * overlap * pushStrength; forceY += dirY * overlap * pushStrength;
                    }
                    if (dist < detectRad) {
                        const weightRatio = Math.min(10, otherMass / myMass); const proximityFactor = 1 - (dist / detectRad);
                        const SEPARATION_COEFFICIENT = 1.2; const repulsion = proximityFactor * weightRatio * SEPARATION_COEFFICIENT;
                        forceX += dirX * repulsion; forceY += dirY * repulsion;
                    }
                }
                aiResult.velocity.x += forceX; aiResult.velocity.y += forceY;
            }

            // Apply Velocity with Slow Logic applied
            enemy.pos.x += aiResult.velocity.x;
            enemy.pos.y += aiResult.velocity.y;

            // --- OBSTACLE COLLISION FOR ENEMIES ---
            // Simple push out to avoid walking through monoliths
            for (const obs of obstacles) {
                resolveStaticCollision(enemy, obs);
            }

            if ((enemy.enemyType === EnemyType.DRONE || enemy.enemyType === EnemyType.ELITE_DRONE) && frame % 4 === 0) {
                result.newParticles.push(getVisualParticle({ id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE, pos: { x: enemy.pos.x - (aiResult.velocity.x * 2) + (Math.random() - 0.5) * 6, y: enemy.pos.y - (aiResult.velocity.y * 2) + (Math.random() - 0.5) * 6 }, velocity: { x: 0, y: 0 }, radius: 0, color: enemy.enemyType === EnemyType.ELITE_DRONE ? 'rgba(255, 180, 50, 0.6)' : 'rgba(200, 80, 0, 0.4)', markedForDeletion: false, life: 20, maxLife: 20, size: Math.random() * 2 + 2, decay: 0 }));
            }

            Object.keys(enemy.immuneTimers).forEach(key => { if (enemy.immuneTimers[key] > 0) enemy.immuneTimers[key]--; });

            if (aiResult.newProjectiles.length > 0) result.newProjectiles.push(...aiResult.newProjectiles);
            if (aiResult.newEnemies.length > 0) result.newEnemies.push(...aiResult.newEnemies);
            if (aiResult.newParticles.length > 0) result.newParticles.push(...aiResult.newParticles);
            if (aiResult.screenShake) result.screenShake = (result.screenShake || 0) + aiResult.screenShake;

            if (enemy.gravityPull) {
                const gx = enemy.pos.x - player.pos.x; const gy = enemy.pos.y - player.pos.y; const gDistSq = gx * gx + gy * gy; const gDist = Math.sqrt(gDistSq);
                if (gDist > enemy.radius) { const strength = enemy.gravityPull * 1000; const force = strength / Math.max(100, gDistSq); player.pos.x += (gx / gDist) * force; player.pos.y += (gy / gDist) * force; }
            }
        }

        let isHit = checkCollision(player, enemy);
        if (enemy.enemyType === EnemyType.BOSS_SHANGO) {
            const scale = enemy.radius * 0.9; const dx = player.pos.x - enemy.pos.x; const dy = player.pos.y - enemy.pos.y; const rot = -(enemy.rotation || 0);
            const lx = dx * Math.cos(rot) - dy * Math.sin(rot); const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
            const wH = 0.22 * scale; const hH_top = 0.45 * 3.8 * scale; const hH_bot = 0.6 * 3.8 * scale; const bW = 2.6 * scale; const bH_min = 0.8 * scale;
            if (Math.abs(lx) < (wH + player.radius) && ly > -(hH_bot + player.radius) && ly < (hH_top + player.radius)) { isHit = true; }
            if (Math.abs(lx) < (bW + player.radius) && Math.abs(ly) < (bH_min + player.radius)) { isHit = true; }
        } else if (isHit && enemy.enemyType === EnemyType.BOSS_AIDO_HWEDO && enemy.aidoData) {
            isHit = false; const dx = player.pos.x - enemy.pos.x; const dy = player.pos.y - enemy.pos.y; const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) isHit = true;
            if (!isHit && enemy.state !== 'FLARE') {
                const angle = Math.atan2(dy, dx); const gapSize = Math.PI / 4; const thickness = 25;
                const checkRing = (r: number, ringAngle: number) => { if (Math.abs(dist - r) < thickness) { let angleDiff = Math.abs(angle - ringAngle); while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2); if (angleDiff > gapSize / 2) return true; } return false; };
                if (checkRing(200, enemy.aidoData.innerAngle)) isHit = true; if (checkRing(360, enemy.aidoData.outerAngle)) isHit = true;
                if (enemy.aidoData.phase2Ring?.active && !isHit) {
                    const p2 = enemy.aidoData.phase2Ring; const r3 = 530; const segments = 4; const segAngle = (Math.PI * 2) / segments; const gapRatio = 0.4;
                    if (Math.abs(dist - r3) < thickness) {
                        let relAngle = angle - p2.angle; while (relAngle < 0) relAngle += Math.PI * 2; while (relAngle >= Math.PI * 2) relAngle -= Math.PI * 2;
                        const segIndex = Math.floor(relAngle / segAngle); const angleInSeg = relAngle - (segIndex * segAngle); const wallEnd = segAngle * (1 - gapRatio);
                        if (angleInSeg < wallEnd) { isHit = true; const resolveDist = dist < r3 ? r3 - thickness - 1 : r3 + thickness + 1; player.pos.x = enemy.pos.x + Math.cos(angle) * resolveDist; player.pos.y = enemy.pos.y + Math.sin(angle) * resolveDist; }
                        else { if (!p2.doorsOpen) { isHit = true; const resolveDist = dist < r3 ? r3 - thickness - 1 : r3 + thickness + 1; player.pos.x = enemy.pos.x + Math.cos(angle) * resolveDist; player.pos.y = enemy.pos.y + Math.sin(angle) * resolveDist; } }
                    }
                }
            }
        }

        if (isHit) {
            // Apply Damage only if I-frames are inactive
            if (player.invulnerabilityTimer <= 0) {
                const takenDamage = Math.max(1, enemy.damage - player.stats.armor);
                result.playerDamageTaken += takenDamage;
                result.lastHitter = enemy.name || enemy.enemyType;
                player.invulnerabilityTimer = 30; // Set I-Frames (0.5s)
            }

            // Always apply physics pushback
            if (enemy.enemyType !== EnemyType.BOSS_AIDO_HWEDO) {
                const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                const pushConfig = (MASS[enemy.enemyType] || 2) > 10 ? 0.2 : 5;
                const push = pushConfig * (enemy.enemyType === EnemyType.TANK || enemy.isBoss ? 0.2 : 1);
                // Even when frozen, physics collision pushback should probably happen so player doesn't get stuck inside
                enemy.pos.x -= Math.cos(angle) * push;
                enemy.pos.y -= Math.sin(angle) * push;
            }
        }
    });

    return result;
};
