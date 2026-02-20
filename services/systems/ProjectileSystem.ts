
import { Projectile, Player, Enemy, VisualParticle, TextParticle, EntityType, Vector2, Shockwave, EnemyType } from '../../types';
import { getNearestEnemy, checkCollision } from '../PhysicsSystem';
import { createTextParticle, createShatterParticles } from '../gameLogic';
import { getProjectile, getVisualParticle } from '../objectPools';

export interface ProjectileUpdateResult {
    newProjectiles: Projectile[];
    newParticles: (VisualParticle | TextParticle)[];
    screenShake: number;
    newShockwaves: Shockwave[];
}

const getVectorLen = (v: Vector2) => Math.sqrt(v.x * v.x + v.y * v.y);
const normalizeVector = (v: Vector2): Vector2 => {
    const len = getVectorLen(v);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
};

const isPointInPolygon = (point: Vector2, vs: Vector2[]) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export const updateProjectiles = (
    projectiles: Projectile[],
    player: Player,
    enemies: Enemy[],
    frame: number,
    cleanupDistSq: number,
    isFrozen: boolean = false
): ProjectileUpdateResult => {
    const result: ProjectileUpdateResult = {
        newProjectiles: [],
        newParticles: [],
        screenShake: 0,
        newShockwaves: []
    };

    const activeNanites = projectiles.filter(p => p.sourceWeaponId === 'nanite_swarm' && !p.markedForDeletion);
    const voidWakeNodes = projectiles.filter(p => p.sourceWeaponId === 'void_wake' && !p.markedForDeletion);
    const hasVoidWakeEvolved = player.weapons.some(w => w.id === 'void_wake' && w.level >= 8);

    if (hasVoidWakeEvolved && voidWakeNodes.length > 10) {
        voidWakeNodes.sort((a, b) => (b.voidWakeData?.index || 0) - (a.voidWakeData?.index || 0));
        const head = voidWakeNodes[0];
        if (head.duration > 178) {
            for (let i = 10; i < voidWakeNodes.length; i++) {
                const tail = voidWakeNodes[i];
                const distSq = (head.pos.x - tail.pos.x) ** 2 + (head.pos.y - tail.pos.y) ** 2;
                const collisionThreshold = (head.radius + tail.radius) * 0.8;

                if (distSq < collisionThreshold * collisionThreshold) {
                    const loopNodes = voidWakeNodes.slice(0, i + 1);
                    const polygon = loopNodes.map(n => ({ x: n.pos.x, y: n.pos.y }));
                    enemies.forEach(e => {
                        if (!e.markedForDeletion && isPointInPolygon(e.pos, polygon)) {
                            e.health -= 9999;
                            // result.newParticles.push(createTextParticle(e.pos, "VOID CRUSH", '#4B0082', 60));
                        }
                    });
                    result.screenShake += 10;
                    // result.newParticles.push(createTextParticle(head.pos, "ABYSSAL LOOP", '#8A2BE2', 90));
                    result.newShockwaves.push({ id: Math.random().toString(), pos: { ...head.pos }, time: 0, maxDuration: 60, maxRadius: 500, strength: 80 });
                    loopNodes.forEach(n => n.markedForDeletion = true);
                    result.newProjectiles.push(getProjectile({ id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { x: head.pos.x, y: head.pos.y }, velocity: { x: 0, y: 0 }, radius: 0, color: '#000000', markedForDeletion: false, damage: 500, duration: 60, pierce: 999, knockback: 0, isEnemy: false, sourceWeaponId: 'abyssal_loop_collapse', polyPoints: polygon }));
                    break;
                }
            }
        }
    }

    // --- GRAVITATIONAL WELL AUGMENT ---
    // Iterate Void Wake nodes to pull enemies
    if (voidWakeNodes.length > 0) {
        // Optimization: Only check if augment is active on the weapon
        const voidWakeWeapon = player.weapons.find(w => w.id === 'void_wake');
        if (voidWakeWeapon && voidWakeWeapon.augment === 'GRAVITATIONAL_WELL') {
            const PULL_RADIUS_SQ = 150 * 150;
            const PULL_FORCE = 0.8;

            voidWakeNodes.forEach(node => {
                // Simple check against all enemies (Optimizable with spatial hash if needed)
                enemies.forEach(e => {
                    if (e.markedForDeletion) return;
                    const dx = node.pos.x - e.pos.x;
                    const dy = node.pos.y - e.pos.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < PULL_RADIUS_SQ && distSq > 100) { // Don't pull if on top
                        const dist = Math.sqrt(distSq);
                        e.pos.x += (dx / dist) * PULL_FORCE;
                        e.pos.y += (dy / dist) * PULL_FORCE;
                    }
                });
            });
        }
    }

    projectiles.forEach(p => {
        // If Frozen, skip movement/updates for Enemy Projectiles
        if (isFrozen && p.isEnemy) return;

        // --- FRACTAL TRAIL EMITTER (Julia's Grasp) ---
        if (p.sourceWeaponId === 'fractal_trail_emitter') {
            p.pos = { ...player.pos }; // Stick to player

            // Spawn field element every 30 frames
            if (p.duration % 30 === 0) {
                const data = p.customData;

                // Fade out ALL existing trail segments to 50% of current opacity
                projectiles.forEach(existing => {
                    if (existing.sourceWeaponId === 'fractal_bloom' && existing.customData?.augment === 'JULIAS_GRASP') {
                        if (existing.customData.opacityMultiplier === undefined) existing.customData.opacityMultiplier = 1.0;
                        existing.customData.opacityMultiplier *= 0.5;
                    }
                });

                // Spawn in random area around player
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 250;
                const spawnPos = {
                    x: p.pos.x + Math.cos(angle) * dist,
                    y: p.pos.y + Math.sin(angle) * dist
                };

                result.newProjectiles.push(getProjectile({
                    id: Math.random().toString(),
                    type: EntityType.PROJECTILE,
                    pos: spawnPos,
                    velocity: { x: 0, y: 0 },
                    radius: 60 * (data.spawnArea || 1.0),
                    color: '#00FFFF', // Cyan trail
                    markedForDeletion: false,
                    damage: data.spawnDamage,
                    duration: data.spawnDuration || 100,
                    pierce: 999,
                    knockback: 0,
                    isEnemy: false,
                    sourceWeaponId: 'fractal_bloom', // Rendered as fractal
                    fractalData: {
                        rotationSpeed: 0.1 + (Math.random() * 0.05), // Fast spin
                        hueShift: Math.random() * 360,
                        branches: 3,
                        recursionDepth: 2
                    },
                    mineData: {
                        isMine: true, explosionRadius: 0, pullRadius: 0, lingers: true
                    },
                    customData: {
                        augment: 'JULIAS_GRASP',
                        maxDuration: data.spawnDuration || 100, // Necessary for animation
                        opacityMultiplier: 1.0 // Start full opacity
                    }
                }));
            }
        }

        // --- FRACTAL GROWTH (Recursive Split) ---
        if (p.sourceWeaponId === 'fractal_bloom' && p.customData?.augment === 'RECURSIVE_SPLIT') {
            const maxDur = p.customData.maxDuration || 180;
            const progress = 1 - (p.duration / maxDur);

            // Growth Curve (Exponential)
            const growth = 1 + (progress * 2.0); // 1x to 3x size
            const baseR = p.customData.baseRadius || 100;

            p.radius = baseR * growth;

            // Increase complexity visual
            if (p.fractalData) {
                p.fractalData.recursionDepth = 2 + Math.floor(progress * 3); // 2 -> 5
            }

            // Pull Enemies (Simulate Accretion)
            if (p.mineData) p.mineData.pullRadius = p.radius * 1.5;
        }

        if (p.sourceWeaponId === 'ancestral_resonance') p.radius += 12 * player.stats.areaMult;
        if (p.sourceWeaponId === 'void_aura') {
            p.radius += 5 * player.stats.areaMult;
            if (p.duration === 15) {
                result.screenShake += 2;
                // Add unique grid-warping shockwaves for augments
                if (p.customData?.augment === 'SUPERNOVA') {
                    // Soft, wide pulse for Supernova
                    result.newShockwaves.push({
                        id: Math.random().toString(),
                        pos: { ...p.pos },
                        time: 0,
                        maxDuration: 45,
                        maxRadius: 450 * player.stats.areaMult,
                        strength: 50
                    });
                } else if (p.customData?.augment === 'ENTROPY_FIELD') {
                    // Sharper, tighter distortion for Entropy Field
                    result.newShockwaves.push({
                        id: Math.random().toString(),
                        pos: { ...p.pos },
                        time: 0,
                        maxDuration: 30,
                        maxRadius: 350 * player.stats.areaMult,
                        strength: 70
                    });
                }
            }
        }
        if (p.sourceWeaponId === 'bass_drop_shockwave') {
            p.radius += 20 * player.stats.areaMult;
            if (p.duration === 15) result.screenShake += 5;
        }
        if (p.sourceWeaponId === 'bass_mine_explosion') p.radius += 5;
        if (p.sourceWeaponId === 'boss_death_core') p.radius += 15;
        if (p.sourceWeaponId === 'boss_death_ring') p.radius += 8;
        // Implosion growth - Removed from spawn logic, but keeping update logic safe if any exist
        if (p.sourceWeaponId === 'fractal_implosion') p.radius += 10;

        if (p.sourceWeaponId === 'ancestral_resonance' && p.duration === 20) {
            result.newShockwaves.push({ id: Math.random().toString(), pos: { ...p.pos }, time: 0, maxDuration: 50, maxRadius: 400 * player.stats.areaMult, strength: 100 });
            result.screenShake += 8;
        }
        if (p.sourceWeaponId === 'bass_drop_shockwave' && p.duration === 15) {
            result.newShockwaves.push({ id: Math.random().toString(), pos: { ...p.pos }, time: 0, maxDuration: 40, maxRadius: 300 * player.stats.areaMult, strength: 150 });
        }
        if (p.sourceWeaponId === 'boss_death_core' && p.duration === 33) {
            result.newShockwaves.push({ id: Math.random().toString(), pos: { ...p.pos }, time: 0, maxDuration: 80, maxRadius: 600, strength: 120 });
        }
        if (p.sourceWeaponId === 'trinity_arena_pulse') {
            // Spawn expanding shockwave that only renders outside 900px
            if (p.duration === 1) { // Trigger once
                result.newShockwaves.push({
                    id: Math.random().toString(),
                    pos: { ...p.pos },
                    time: 0,
                    maxDuration: 200, // Longer duration to travel out
                    maxRadius: 3000,  // Expand far out
                    minRadius: 900,   // Only visible/active outside arena
                    strength: 100,
                    contracting: true // Inward waves
                });
            }
            p.markedForDeletion = true;
        }

        if (p.sourceWeaponId === 'spirit_lance' && frame % 2 === 0) {
            const isPhaseDrill = p.customData?.augment === 'PHASE_DRILL';
            result.newParticles.push(getVisualParticle({
                id: Math.random().toString(),
                type: EntityType.VISUAL_PARTICLE,
                pos: { x: p.pos.x + (Math.random() - 0.5) * 6, y: p.pos.y + (Math.random() - 0.5) * 6 },
                velocity: { x: 0, y: 0 },
                radius: 1,
                color: isPhaseDrill ? '#AA00FF' : (Math.random() > 0.5 ? '#E0FFFF' : '#00FFFF'),
                markedForDeletion: false,
                life: 10 + Math.random() * 10,
                maxLife: 20,
                size: Math.random() * 3 + 2,
                decay: 0.9
            }));
        }

        if (p.sourceWeaponId === 'drum_laser') {
            // Laser Particle Trail
            if (Math.random() < 0.5) {
                result.newParticles.push(getVisualParticle({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { x: p.pos.x - p.velocity.x * 0.3 + (Math.random() - 0.5) * 2, y: p.pos.y - p.velocity.y * 0.3 + (Math.random() - 0.5) * 2 },
                    velocity: { x: 0, y: 0 },
                    radius: 0,
                    color: '#FFAA00',
                    markedForDeletion: false,
                    life: 8,
                    maxLife: 8,
                    size: 3,
                    decay: 0.9,
                    shape: 'SQUARE'
                }));
            }
        }

        if (p.paradoxData) {
            const pd = p.paradoxData;
            // Update Phase (Using duration as speed controller: 1.0 / duration)
            const speed = 1.0 / Math.max(1, p.duration);
            if (pd.state === 'FORWARD') {
                pd.currentPhase += speed;
                if (pd.currentPhase >= 1) {
                    pd.state = 'REWIND';
                    // Reset Hit IDs on state change so enemies get hit again
                    p.hitEnemyIds = [];
                }
            } else {
                pd.currentPhase -= speed;
                if (pd.currentPhase <= 0) {
                    p.markedForDeletion = true; // End of cycle
                }
            }

            // Calculate Position relative to player
            // Arc moves from -sweep/2 to +sweep/2 relative to baseAngle, SCALED by direction
            // Formula: Base + (Direction * (Phase * Sweep - HalfSweep))
            // Dir 1: Base - Half + Phase*Sweep
            // Dir -1: Base - (-Half + Phase*Sweep) = Base + Half - Phase*Sweep (Reverse direction)

            const halfSweep = pd.sweepAngle / 2;
            const swingDir = pd.swingDir || 1;
            const sweepProgress = (pd.currentPhase * pd.sweepAngle) - halfSweep;
            const currentAngle = pd.baseAngle + (swingDir * sweepProgress);

            // YOYO LOGIC: Distance from player varies with phase
            // Ease out/in: Sine curve for natural extension/retraction feel
            const ease = Math.sin(pd.currentPhase * Math.PI / 2);
            const currentDist = pd.armLength * ease;

            p.pos.x = player.pos.x + Math.cos(currentAngle) * currentDist;
            p.pos.y = player.pos.y + Math.sin(currentAngle) * currentDist;

            // Emit Ghost Trail
            if (frame % 2 === 0) {
                result.newParticles.push(getVisualParticle({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { ...p.pos },
                    velocity: { x: 0, y: 0 },
                    radius: 0,
                    color: pd.state === 'REWIND' ? '#FFFFFF' : p.color,
                    markedForDeletion: false,
                    life: 10, maxLife: 10, size: 4, decay: 0.9, shape: 'SQUARE'
                }));
            }
        }

        if (p.boomerangData) {
            // ... (Existing Boomerang Logic) ...
            const bd = p.boomerangData;

            // TRAIL EFFECT FOR ORBITAL LOCK
            // Emit particle every frame for a solid trail
            // Fallback to checking orbitDuration > 9000 if customData isn't set for some reason
            if (p.customData?.augment === 'ORBITAL_LOCK' || (bd.orbitDuration && bd.orbitDuration > 9000)) {
                result.newParticles.push(getVisualParticle({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { x: p.pos.x, y: p.pos.y },
                    velocity: { x: 0, y: 0 },
                    radius: 0,
                    color: '#FFD700', // Gold Trail
                    markedForDeletion: false,
                    life: 20,
                    maxLife: 20,
                    size: 5, // Increased size
                    decay: 0.9,
                    shape: 'SQUARE'
                }));
            }

            if (bd.state === 'OUT') {
                p.pos.x += p.velocity.x;
                p.pos.y += p.velocity.y;
                const distStep = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
                bd.distTraveled += distStep;
                if (bd.distTraveled >= bd.maxDist) {
                    // AUGMENT: FRACTAL_SPLIT (Spawn 3 minis at apex)
                    if (bd.augmented) {
                        for (let i = 0; i < 3; i++) {
                            const angle = bd.initialAngle! + (i - 1) * 0.5 + Math.PI; // Fan out backwards
                            result.newProjectiles.push(getProjectile({
                                id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { ...p.pos },
                                velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
                                radius: p.radius * 0.5, color: '#FFAA00', markedForDeletion: false, damage: p.damage * 0.5,
                                duration: 60, pierce: 999, knockback: 0, isEnemy: false, sourceWeaponId: p.sourceWeaponId
                            }));
                        }
                    }

                    if (bd.orbitDuration && bd.orbitDuration > 0) {
                        bd.state = 'ORBIT';
                        bd.orbitTimer = bd.orbitDuration;
                    } else {
                        bd.state = 'RETURN';
                    }
                }
            } else if (bd.state === 'ORBIT') {
                // If duration is massive (ORBITAL_LOCK), it just orbits forever.
                const isOrbitalLock = bd.orbitDuration && bd.orbitDuration > 9000;

                if (!isOrbitalLock) {
                    bd.orbitTimer = (bd.orbitTimer || 0) - 1;
                }

                const currentAngle = Math.atan2(p.pos.y - player.pos.y, p.pos.x - player.pos.x);
                let orbitSpeed = 0.1;
                let r = bd.maxDist;

                // Add variation for Orbital Lock
                if (isOrbitalLock) {
                    // Pseudo-random seed from ID
                    const seed = p.id.charCodeAt(p.id.length - 1) + p.id.charCodeAt(0);

                    // 1. Oscillate radius (Breathing effect)
                    const breatheSpeed = 0.05;
                    const breatheAmp = 50 * player.stats.areaMult;
                    r += Math.sin(frame * breatheSpeed + seed) * breatheAmp;

                    // 2. Secondary radial noise (Chaotic wobble)
                    r += Math.cos(frame * 0.1 + seed * 0.5) * 20;

                    // 3. Variable Speed
                    orbitSpeed += Math.sin(frame * 0.02 + seed) * 0.03;
                }

                const nextAngle = currentAngle + orbitSpeed;
                p.pos.x = player.pos.x + Math.cos(nextAngle) * r;
                p.pos.y = player.pos.y + Math.sin(nextAngle) * r;

                if (!isOrbitalLock && (bd.orbitTimer || 0) <= 0) {
                    bd.state = 'RETURN';
                }
            } else if (bd.state === 'RETURN') {
                const dx = player.pos.x - p.pos.x;
                const dy = player.pos.y - p.pos.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 400) {
                    p.markedForDeletion = true;
                } else {
                    const angle = Math.atan2(dy, dx);
                    p.pos.x += Math.cos(angle) * (bd.speed * 1.5);
                    p.pos.y += Math.sin(angle) * (bd.speed * 1.5);
                }
            }
        } else if (p.skyFallData) {
            if (!p.skyFallData.hasHit) {
                p.pos.y += p.velocity.y;
                if (p.pos.y >= p.skyFallData.targetY) {
                    p.pos.y = p.skyFallData.targetY;
                    p.skyFallData.hasHit = true;
                    result.newProjectiles.push(getProjectile({ id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { ...p.pos }, velocity: { x: 0, y: 0 }, radius: 30, color: '#00ffaa', markedForDeletion: false, damage: p.damage, duration: 15, pierce: 999, knockback: 0, isEnemy: false, sourceWeaponId: 'pixel_rain_splash' }));
                    result.screenShake += 1;
                    result.newShockwaves.push({ id: Math.random().toString(), pos: { ...p.pos }, time: 0, maxDuration: 20, maxRadius: 100, strength: 30 });
                    if (p.skyFallData.poolOnHit) {
                        p.velocity = { x: 0, y: 0 }; p.duration = 180; p.skyFallData.isPool = true; p.radius = 40; p.pierce = 999; p.damage = p.damage * 0.2;
                    } else { p.markedForDeletion = true; }
                }
            } else { if (p.skyFallData.isPool) { p.duration--; if (p.duration <= 0) p.markedForDeletion = true; } }
        } else if (p.sourceWeaponId === 'nanite_swarm' && p.customData?.augment === 'HIVE_SHIELD') {
            // HIVE SHIELD BEHAVIOR: Orbit + Lash Out
            const areaMult = player.stats.areaMult;
            const orbitRadius = 70 * areaMult;
            const offset = p.customData.thetaOffset || 0;
            const rotSpeed = 0.05;
            const angle = (frame * rotSpeed) + offset;

            // Ideal Orbit Position
            const targetX = player.pos.x + Math.cos(angle) * orbitRadius;
            const targetY = player.pos.y + Math.sin(angle) * orbitRadius;

            // Attack Logic
            let attackTarget: Enemy | null = null;
            let minDistSq = 120 * 120; // Range to lash out

            for (const e of enemies) {
                if (e.markedForDeletion) continue;
                const dSq = (e.pos.x - p.pos.x) ** 2 + (e.pos.y - p.pos.y) ** 2;
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    attackTarget = e;
                }
            }

            if (attackTarget) {
                // Lash out at enemy
                const dx = attackTarget.pos.x - p.pos.x;
                const dy = attackTarget.pos.y - p.pos.y;
                const dist = Math.sqrt(minDistSq);
                if (dist > 0.1) {
                    const accel = 2.0;
                    p.velocity.x += (dx / dist) * accel;
                    p.velocity.y += (dy / dist) * accel;
                }
            } else {
                // Return to orbit (Spring)
                const dx = targetX - p.pos.x;
                const dy = targetY - p.pos.y;
                const k = 0.08; // Stiffness

                p.velocity.x += dx * k;
                p.velocity.y += dy * k;

                // Organic Noise
                p.velocity.x += (Math.random() - 0.5) * 1.0;
                p.velocity.y += (Math.random() - 0.5) * 1.0;
            }

            // Friction / Damping
            p.velocity.x *= 0.85;
            p.velocity.y *= 0.85;

            // Apply Velocity
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;

            // Leash to player if too far (e.g. got stuck or knocked far away)
            const distToPlayerSq = (p.pos.x - player.pos.x) ** 2 + (p.pos.y - player.pos.y) ** 2;
            if (distToPlayerSq > (orbitRadius * 4) ** 2) {
                p.pos.x = targetX;
                p.pos.y = targetY;
                p.velocity = { x: 0, y: 0 };
            }

            p.duration--;
        } else if (p.homingTargetId !== undefined) {
            let target: { pos: Vector2 } | null = null;

            if (p.homingTargetId === 'player') {
                target = player;
            } else {
                target = getNearestEnemy({ pos: p.pos } as Player, enemies);
                if (p.homingTargetId && p.homingTargetId !== 'target' && p.homingTargetId !== 'player') {
                    const specific = enemies.find(e => (e as any)._id === p.homingTargetId);
                    if (specific) target = specific;
                }
            }

            if (target) {
                const angleToTarget = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x);
                const currentAngle = Math.atan2(p.velocity.y, p.velocity.x);
                const speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y);
                let diff = angleToTarget - currentAngle;
                while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                const turn = p.turnSpeed || 0.1;
                const newAngle = currentAngle + Math.max(-turn, Math.min(turn, diff));
                p.velocity.x = Math.cos(newAngle) * speed; p.velocity.y = Math.sin(newAngle) * speed;
            }
            p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.duration--;
        } else if (p.customData?.augment === 'ACOUSTIC_BARRIER') {
            // ACOUSTIC BARRIER LOGIC
            // Stop at max range and become a wall
            const origin = p.customData.origin;
            const maxDist = p.customData.maxDist || 350;

            if (!p.customData.isBarrier && origin) {
                const dx = p.pos.x - origin.x;
                const dy = p.pos.y - origin.y;
                const distSq = dx * dx + dy * dy;

                if (distSq >= maxDist * maxDist) {
                    p.velocity = { x: 0, y: 0 };
                    p.customData.isBarrier = true;
                    // Wall phase initiated
                } else {
                    // Standard movement until max range
                    p.pos.x += p.velocity.x;
                    p.pos.y += p.velocity.y;
                }
            } else {
                // Is Barrier: Stay still
                p.velocity = { x: 0, y: 0 };
            }

            p.duration--;
        } else if (!p.paradoxData) {
            // Standard Movement for simple projectiles
            p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.duration--;
        }

        if (p.duration <= 0) {
            // AUGMENT: GRAVITATIONAL_WELL (Handled in update loop, no explosion on death)
            if (p.voidWakeData?.explosive) {
                // Legacy: Unstable Ground removed.
            }
            if (!p.boomerangData && p.sourceWeaponId !== 'fractal_trail_emitter') p.markedForDeletion = true;
        } else {
            const dX = p.pos.x - player.pos.x; const dY = p.pos.y - player.pos.y;
            if (dX * dX + dY * dY > cleanupDistSq) {
                if (!p.boomerangData && !p.paradoxData && p.sourceWeaponId !== 'fractal_trail_emitter') p.markedForDeletion = true;
            }
        }
    });

    return result;
};
