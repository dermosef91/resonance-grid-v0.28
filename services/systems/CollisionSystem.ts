
import { Player, Enemy, Projectile, VisualParticle, TextParticle, EntityType, EnemyType, Obstacle, MissionEntity } from '../../types';
import { checkCollision, checkBeamCollision, SpatialHash, resolveStaticCollision } from '../PhysicsSystem';
import { handleChainLightning, createTextParticle, createShatterParticles } from '../gameLogic';
import { COLORS } from '../../constants';
import { getProjectile, getVisualParticle } from '../objectPools';

export interface CollisionResult {
    playerDamageTaken: number;
    newProjectiles: Projectile[];
    newParticles: (TextParticle | VisualParticle)[];
    lastHitter?: string;
}

export const resolveCollisions = (
    player: Player,
    projectiles: Projectile[],
    grid: SpatialHash,
    enemies: Enemy[],
    obstacles: Obstacle[] = [],
    missionEntities: MissionEntity[] = [] // Added MissionEntities
): CollisionResult => {
    const result: CollisionResult = {
        playerDamageTaken: 0,
        newProjectiles: [],
        newParticles: []
    };

    // --- PLAYER VS OBSTACLES ---
    for (const obs of obstacles) {
        if (resolveStaticCollision(player, obs)) {
            // Optional: Add scrape effect or sound
        }
    }

    // --- PLAYER VS SOLID MISSION ENTITIES ---
    for (const entity of missionEntities) {
        if (entity.solid) {
            // Treat as static circular obstacle for now
            if (resolveStaticCollision(player, entity)) {
                // Collision handled (position correction)
            }
        }
    }

    projectiles.forEach(proj => {
        if (proj.markedForDeletion) return;

        // --- PROJECTILE VS OBSTACLES ---
        // Beams usually pass through or are handled differently, but let's block regular shots
        if (!proj.beamData && !proj.skyFallData && !proj.paradoxData && !proj.voidWakeData) {
            for (const obs of obstacles) {
                if (checkCollision(proj, obs)) {
                    // Don't destroy barrier projectiles on obstacles (self-collision or otherwise)
                    if (proj.customData?.isBarrier) continue;

                    proj.markedForDeletion = true;
                    // Spark effect on wall hit
                    result.newParticles.push(...createShatterParticles(proj.pos, '#00FFFF', 3, 5));
                    break;
                }
            }
            if (proj.markedForDeletion) return;
        }

        if (proj.isEnemy) {
            let hit = false;
            if (proj.beamData) hit = checkBeamCollision(proj, player);
            else hit = checkCollision(player, proj);

            if (hit) {
                if (player.invulnerabilityTimer <= 0) {
                    const takenDamage = Math.max(1, proj.damage - player.stats.armor);
                    result.playerDamageTaken += takenDamage;
                    result.lastHitter = proj.sourceWeaponId || "Enemy Projectile";
                    player.invulnerabilityTimer = 30; // Set I-Frames
                }

                if (!proj.beamData) proj.markedForDeletion = true;
            }
        } else {
            let nearbyEnemies: Enemy[] = [];
            if (proj.beamData || proj.paradoxData) nearbyEnemies = enemies;
            else nearbyEnemies = grid.query(proj.pos, proj.radius + 30) as Enemy[];

            for (const enemy of nearbyEnemies) {
                if (enemy.markedForDeletion) continue;

                // --- SPECIAL BOSS COLLISION: AIDO-HWEDO RINGS ---
                if (enemy.enemyType === EnemyType.BOSS_AIDO_HWEDO && enemy.aidoData && !proj.beamData && !proj.paradoxData) {
                    const data = enemy.aidoData;
                    const dx = proj.pos.x - enemy.pos.x; const dy = proj.pos.y - enemy.pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx);
                    const r1 = 200; const r2 = 360; const thickness = 25; const gapSize = Math.PI / 4;
                    const checkRingBlock = (r: number, ringAngle: number, strict: boolean = false) => {
                        if (dist > r - thickness && dist < r + thickness) {
                            if (strict) { proj.markedForDeletion = true; result.newParticles.push(createTextParticle(proj.pos, "SHIELD", '#FFAA00')); return true; }
                            let angleDiff = Math.abs(angle - ringAngle); while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
                            if (angleDiff > gapSize / 2) { proj.markedForDeletion = true; result.newParticles.push(createTextParticle(proj.pos, "BLOCKED", '#FFAA00')); return true; }
                        }
                        return false;
                    };
                    if (checkRingBlock(r1, data.innerAngle, true)) continue;
                    if (checkRingBlock(r2, data.outerAngle)) continue;
                    if (data.phase2Ring?.active) {
                        const r3 = 530; const p2 = data.phase2Ring; const segments = 4; const segAngle = (Math.PI * 2) / segments; const gapRatio = 0.4; const wallEnd = segAngle * (1 - gapRatio);
                        if (Math.abs(dist - r3) < thickness) {
                            let relAngle = angle - p2.angle; while (relAngle < 0) relAngle += Math.PI * 2; while (relAngle >= Math.PI * 2) relAngle -= Math.PI * 2;
                            const segIndex = Math.floor(relAngle / segAngle); const angleInSeg = relAngle - (segIndex * segAngle);
                            if (angleInSeg < wallEnd || !p2.doorsOpen) { proj.markedForDeletion = true; result.newParticles.push(createTextParticle(proj.pos, "BLOCKED", '#FF4400')); continue; }
                        }
                    }
                }

                // --- PRISMATIC MONOLITH REFLECTION ---
                if (enemy.enemyType === EnemyType.PRISMATIC_MONOLITH && !proj.beamData && !proj.paradoxData) {
                    if (checkCollision(enemy, proj)) {
                        proj.markedForDeletion = true;

                        // Spawn 3 Spectrum Projectiles
                        const colors = ['#FF0000', '#00FF00', '#0000FF'];
                        const angleToPlayer = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);

                        for (let i = 0; i < 3; i++) {
                            const offset = (i - 1) * 0.3; // Spread
                            const fireAngle = angleToPlayer + offset;

                            result.newProjectiles.push(getProjectile({
                                id: Math.random().toString(),
                                type: EntityType.PROJECTILE,
                                pos: { ...enemy.pos },
                                velocity: { x: Math.cos(fireAngle) * 6, y: Math.sin(fireAngle) * 6 },
                                radius: 5,
                                color: colors[i],
                                markedForDeletion: false,
                                damage: 15,
                                duration: 120,
                                pierce: 0,
                                knockback: 0,
                                isEnemy: true
                            }));
                        }

                        result.newParticles.push(createTextParticle(proj.pos, "REFLECT", '#FFFFFF'));
                        continue; // Skip damage
                    }
                }

                let hit = false;

                if (proj.paradoxData) {
                    // Check collision manually for pendulum (it's a point at the end of an arm, or a line check?)
                    // Treating it as a ball at the end for now based on Projectile System logic
                    if (checkCollision(enemy, proj)) {
                        hit = true;
                    }
                }
                else if (proj.beamData) {
                    if (checkBeamCollision(proj, enemy)) {
                        const weaponId = proj.sourceWeaponId || 'beam';
                        if ((enemy.immuneTimers[weaponId] || 0) <= 0) {
                            hit = true; enemy.immuneTimers[weaponId] = proj.beamData.tickRate;
                        }
                    }
                } else if (proj.mineData?.isMine) {
                    if (proj.mineData.pullRadius > 0) {
                        const dx = proj.pos.x - enemy.pos.x; const dy = proj.pos.y - enemy.pos.y; const distSq = dx * dx + dy * dy;
                        if (distSq < proj.mineData.pullRadius * proj.mineData.pullRadius) {
                            const dist = Math.sqrt(distSq); const pullStrength = 0.5; enemy.pos.x += (dx / dist) * pullStrength; enemy.pos.y += (dy / dist) * pullStrength;
                        }
                    }
                    if (checkCollision(enemy, proj)) {
                        // Avoid explosion on every frame for lingering fields
                        if (proj.sourceWeaponId === 'void_aura' || proj.sourceWeaponId === 'void_wake' || proj.sourceWeaponId === 'fractal_bloom') { // Lingering types
                            const weaponId = proj.sourceWeaponId || 'area';

                            // AUGMENT: VOID_SIPHON (Apply Debuff)
                            if (proj.sourceWeaponId === 'void_wake' && proj.customData?.augment === 'VOID_SIPHON') {
                                enemy.voidSiphonTimer = 60; // 1 Second Debuff
                            }

                            if ((enemy.immuneTimers[weaponId] || 0) <= 0) {
                                hit = true; enemy.immuneTimers[weaponId] = 20; // Tick rate
                            }
                        } else {
                            proj.markedForDeletion = true;
                            result.newProjectiles.push(getProjectile({ id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { ...proj.pos }, velocity: { x: 0, y: 0 }, radius: 10, color: '#ffffff', markedForDeletion: false, damage: proj.damage, duration: proj.mineData.lingers ? 60 : 15, pierce: 999, knockback: 8 * player.stats.knockbackMult, isEnemy: false, sourceWeaponId: 'bass_mine_explosion' }));
                            result.newParticles.push(createTextParticle(proj.pos, "DROP!", '#ffaa00'));
                        }
                    }
                } else if (proj.skyFallData && !proj.skyFallData.hasHit) {
                } else if (checkCollision(enemy, proj)) {
                    if (proj.chainData && proj.chainData.hitEntityIds.includes(enemy.id)) hit = false;
                    else hit = true;
                }

                if (hit) {
                    if (proj.hitEnemyIds && proj.hitEnemyIds.includes(enemy.id)) continue;

                    let finalDamage = proj.damage;

                    // AUGMENT: VOID_SIPHON (Damage Amp)
                    if (enemy.voidSiphonTimer && enemy.voidSiphonTimer > 0) {
                        finalDamage *= 1.5; // +50% Damage taken
                        // Visual Crit Indicator
                        if (Math.random() < 0.3) result.newParticles.push(createTextParticle(enemy.pos, "SIPHON", '#D8BFD8', 20)); // Thistle color
                    }

                    // PARADOX LOGIC
                    if (proj.paradoxData) {
                        if (proj.paradoxData.state === 'FORWARD') {
                            const angle = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x);
                            enemy.pos.x += Math.cos(angle) * (proj.knockback * 2);
                            enemy.pos.y += Math.sin(angle) * (proj.knockback * 2);
                        } else {
                            finalDamage *= 2.0;
                            if (proj.customData?.augment === 'TEMPORAL_DRAG') {
                                enemy.slowTimer = 180; // 3s
                            }
                        }
                    }

                    if (enemy.enemyType === EnemyType.LASER_LOTUS && enemy.state === 'COOLDOWN') finalDamage *= 2;
                    if (enemy.enemyType === EnemyType.BOSS_VANGUARD && enemy.vanguardData) {
                        const phase = enemy.vanguardData.phase; if (phase === 1) finalDamage *= 1.25; else if (phase === 2) finalDamage *= 1.50; else if (phase === 3) finalDamage *= 2.00;
                    }

                    // --- TRINITY BOSS SHIELD LOGIC ---
                    if (enemy.trinityData && enemy.trinityData.role === 'SUPPORT') {
                        finalDamage *= 0.2; // 80% Damage Reduction
                        // Visual feedback for shielded hit
                        if (Math.random() < 0.3) {
                            result.newParticles.push(createTextParticle(enemy.pos, "SHIELDED", '#FF0000', 30));
                        }
                    }

                    enemy.health -= finalDamage;

                    // --- KALEIDOSCOPE SPLIT LOGIC ---
                    if (proj.kaleidoscopeData) {
                        // Tag enemy with death color if Godhead is active
                        if (proj.kaleidoscopeData.isGodhead && enemy.health <= 0) {
                            enemy.deathColor = proj.kaleidoscopeData.colorType === 'WHITE' ? undefined : proj.kaleidoscopeData.colorType as any;
                        }

                        // Chroma Stasis Freeze Chance
                        if (proj.customData?.augment === 'CHROMA_STASIS' && Math.random() < 0.2) {
                            enemy.stunTimer = 60; // 1s freeze
                            // result.newParticles.push(createTextParticle(enemy.pos, "FROZE", '#00FFFF'));
                        }

                        // Determine Max Generations
                        // Base: 1 (White -> RGB)
                        // Godhead: 2 (White -> RGB -> SubRGB)
                        const maxGen = proj.kaleidoscopeData.isGodhead ? 2 : 1;

                        if (proj.kaleidoscopeData.generation < maxGen) {
                            // SPLIT!
                            const nextGen = proj.kaleidoscopeData.generation + 1;
                            // Colors: If White, split into Red, Green, Blue.
                            // If Colored and Godhead, cycle or split to same color?
                            // Let's cycle: R->G, G->B, B->R to create rainbow chaos

                            const parentColor = proj.kaleidoscopeData.colorType;
                            const colorsToSpawn: ('RED' | 'GREEN' | 'BLUE')[] = [];

                            if (parentColor === 'WHITE') {
                                colorsToSpawn.push('RED', 'GREEN', 'BLUE');
                            } else if (proj.kaleidoscopeData.isGodhead) {
                                // Recursive split for Godhead
                                if (parentColor === 'RED') colorsToSpawn.push('GREEN', 'BLUE');
                                else if (parentColor === 'GREEN') colorsToSpawn.push('BLUE', 'RED');
                                else if (parentColor === 'BLUE') colorsToSpawn.push('RED', 'GREEN');
                            }

                            // Calculate angles based on velocity
                            const velAngle = Math.atan2(proj.velocity.y, proj.velocity.x);
                            const spread = Math.PI / 4; // 45 degrees

                            colorsToSpawn.forEach((colType, idx) => {
                                // Angle offset: -45, 0, +45 relative to impact?
                                // If 3 colors: -45, 0, +45
                                // If 2 colors: -30, +30
                                let angleOffset = 0;
                                if (colorsToSpawn.length === 3) angleOffset = (idx - 1) * spread;
                                else if (colorsToSpawn.length === 2) angleOffset = (idx === 0 ? -1 : 1) * (spread * 0.7);

                                const newAngle = velAngle + angleOffset;
                                const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);

                                let hexColor = '#FFFFFF';
                                if (colType === 'RED') hexColor = '#FF0055';
                                if (colType === 'GREEN') hexColor = '#00FF55';
                                if (colType === 'BLUE') hexColor = '#0055FF';

                                result.newProjectiles.push(getProjectile({
                                    id: Math.random().toString(),
                                    type: EntityType.PROJECTILE,
                                    pos: { ...proj.pos }, // Start at impact point
                                    velocity: { x: Math.cos(newAngle) * speed, y: Math.sin(newAngle) * speed },
                                    radius: 3,
                                    color: hexColor,
                                    markedForDeletion: false,
                                    damage: proj.damage * 0.7, // Reduced damage for splits
                                    duration: 60, // Short range
                                    pierce: 1,
                                    knockback: 0,
                                    isEnemy: false,
                                    sourceWeaponId: proj.sourceWeaponId,
                                    kaleidoscopeData: {
                                        colorType: colType,
                                        generation: nextGen,
                                        splitCount: proj.kaleidoscopeData!.splitCount,
                                        isGodhead: proj.kaleidoscopeData!.isGodhead
                                    },
                                    customData: proj.customData
                                }));
                            });

                            // Visual Shatter
                            result.newParticles.push(getVisualParticle({
                                id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE,
                                pos: { ...proj.pos }, velocity: { x: 0, y: 0 }, radius: 0,
                                color: '#FFFFFF', markedForDeletion: false,
                                life: 10, maxLife: 10, size: 20, decay: 0.8, shape: 'CIRCLE'
                            }));
                        }
                    }

                    // PARADOX EVOLUTION: GRANDFATHER PARADOX (Erase on Rewind Kill)
                    if (proj.paradoxData?.isEvolution && proj.paradoxData.state === 'REWIND' && enemy.health <= 0) {
                        (enemy as any).erasedFromExistence = true;
                        // result.newParticles.push(createTextParticle(enemy.pos, "ERASED", '#FFFFFF'));
                    }

                    if (!proj.skyFallData?.isPool && !proj.beamData) {
                        const isLotusWither = enemy.enemyType === EnemyType.LASER_LOTUS && enemy.state === 'COOLDOWN';
                        const isVuln = isLotusWither || (enemy.enemyType === EnemyType.BOSS_VANGUARD && (enemy.vanguardData?.phase || 0) > 0);
                        const color = isVuln ? '#FFD700' : COLORS.white;
                        // ROUNDED DAMAGE
                        const text = Math.round(finalDamage).toString() + (isVuln ? "!" : "");
                        result.newParticles.push(createTextParticle(enemy.pos, text, color));
                    }

                    if (!proj.hitEnemyIds) proj.hitEnemyIds = [];
                    proj.hitEnemyIds.push(enemy.id);

                    if (proj.stunDuration) {
                        const prevStun = enemy.stunTimer; enemy.stunTimer = Math.max(enemy.stunTimer, proj.stunDuration);
                        // if (prevStun <= 0) result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y - 10 }, "STUN", '#00FFFF'));
                    }

                    // AUGMENT: DISSONANCE_SHREDDER (Bleed)
                    if (proj.customData?.augment === 'DISSONANCE_SHREDDER') {
                        // Apply Bleed: 50% of hit damage over 1s (60 frames)
                        // effective damage per tick (handled in EnemySystem)
                        enemy.bleedTimer = 60;
                        enemy.bleedDamage = finalDamage * 0.5;
                    }

                    if (proj.chainData) {
                        proj.markedForDeletion = true;
                        // if (proj.chainData.isStunning) { enemy.stunTimer = 60; result.newParticles.push(createTextParticle({ x: enemy.pos.x, y: enemy.pos.y - 10 }, "STUN", '#00FFFF')); }
                        if (proj.chainData.isStunning) { enemy.stunTimer = 60; }
                        const chainProjectiles = handleChainLightning(proj, enemy, enemies);
                        result.newProjectiles.push(...chainProjectiles);
                    } else if (proj.pierce > 0) {
                        proj.pierce--;
                        if (enemy.enemyType !== EnemyType.BOSS_AIDO_HWEDO) {
                            // Apply Knockback Rotational Impulse (Tumble)
                            const knockForce = proj.knockback;
                            if (knockForce > 2) {
                                if (enemy.rotVelocity === undefined) enemy.rotVelocity = 0;
                                const dir = Math.random() > 0.5 ? 1 : -1;
                                // Add spin proportional to knockback
                                enemy.rotVelocity += (knockForce * 0.05 * dir);
                            }

                            const angle = Math.atan2(enemy.pos.y - proj.pos.y, enemy.pos.x - proj.pos.x);
                            enemy.pos.x += Math.cos(angle) * proj.knockback; enemy.pos.y += Math.sin(angle) * proj.knockback;
                        }
                    } else { proj.markedForDeletion = true; }
                }
            }
        }
    });

    return result;
};
