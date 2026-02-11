
import { Player, Enemy, Projectile, Vector2, VisualParticle, Weapon, Replica } from '../../types';
import { getNearestEnemy, getNearestEnemies } from '../PhysicsSystem';
import { createProjectile } from '../gameLogic';

// Can accept either a Player or a Replica as the source "actor"
type WeaponActor = Player | Replica;

export const updateWeapons = (
    actor: WeaponActor,
    enemies: Enemy[],
    activeProjectiles: Projectile[],
    onSpawnParticle?: (p: VisualParticle) => void
): Projectile[] => {
    
    const newProjectiles: Projectile[] = [];
    const particles: VisualParticle[] = [];

    // Cast as Player to use player-specific features (pos, weapons, stats are common to both)
    // Replicas have 'pos', 'weapons', 'stats' matching Player interface structure needed here
    const player = actor as Player; // Using variable name 'player' for convenience but it could be replica

    player.weapons.forEach(w => {
        if (w.currentCooldown <= 0) {
            let targets: Vector2[] = [];
            const totalCount = w.count + player.stats.projectileCountFlat;
            
            // Calculate active projectiles for this weapon to prevent over-spawning (Orbital Lock)
            const activeCount = activeProjectiles.filter(p => p.sourceWeaponId === w.id && !p.markedForDeletion).length;

            // Target Selection Logic
            if (w.id === 'spirit_lance') {
                const rangeLimitSq = 1200 * 1200;
                
                // Priority 1: Mission Targets
                const priorityTargets = enemies
                    .filter(e => e.isMissionTarget && !e.markedForDeletion && e.health > 0)
                    .map(e => ({ enemy: e, distSq: (e.pos.x - player.pos.x)**2 + (e.pos.y - player.pos.y)**2 }))
                    .filter(item => item.distSq <= rangeLimitSq)
                    .sort((a, b) => a.distSq - b.distSq)
                    .map(item => item.enemy);

                const pickedEnemies: Enemy[] = [];
                for (const t of priorityTargets) {
                    if (pickedEnemies.length < totalCount) pickedEnemies.push(t); 
                    else break;
                }
                
                if (pickedEnemies.length < totalCount) {
                    const remaining = totalCount - pickedEnemies.length;
                    const excludeIds = pickedEnemies.map(e => e.id);
                    // Pass wrapper with pos to satisfy getNearestEnemies signature
                    const nearest = getNearestEnemies({ pos: player.pos } as any, enemies, remaining, excludeIds);
                    pickedEnemies.push(...nearest);
                }
                targets = pickedEnemies.map(e => e.pos);
            } 
            else if (w.id === 'nanite_swarm' && w.augment === 'HUNTER_PROTOCOL') {
                const candidates = enemies.filter(e => !e.markedForDeletion && e.health > 0);
                if (candidates.length > 0) {
                    candidates.sort((a, b) => b.health - a.health); // Descending HP
                    targets.push({ ...candidates[0].pos, _id: candidates[0].id } as any);
                }
            }
            else if (w.id === 'cyber_kora') {
                if (enemies.length > 0) {
                    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                    targets.push(randomEnemy.pos);
                }
            } 
            else {
                // Pass wrapper to getNearestEnemy
                const t = getNearestEnemy({ pos: player.pos } as any, enemies);
                if (t) targets.push(t.pos);
            }

            if ((w.type === 'PROJECTILE' || w.type === 'HOMING' || w.type === 'CHAIN') && targets.length === 0) {
                return;
            }

            const created = createProjectile(w, player, targets, particles, activeCount);
            
            // --- KALEIDOSCOPE EFFECT ---
            // If active and weapon is compatible (Not AURA/RHYTHM_WAVE/TRAIL which stack badly)
            if (player.kaleidoscopeTimer > 0 && w.type !== 'AURA' && w.type !== 'RHYTHM_WAVE' && w.type !== 'TRAIL') {
                const clones: Projectile[] = [];
                const slices = 8;
                const angleStep = (Math.PI * 2) / slices;
                
                created.forEach(p => {
                    // Replicate 7 times (i=1 to 7)
                    for(let i=1; i<slices; i++) {
                        const theta = angleStep * i;
                        const cos = Math.cos(theta);
                        const sin = Math.sin(theta);
                        
                        // Rotate Position relative to player
                        const relX = p.pos.x - player.pos.x;
                        const relY = p.pos.y - player.pos.y;
                        const rotX = relX * cos - relY * sin;
                        const rotY = relX * sin + relY * cos;
                        
                        // Rotate Velocity
                        const vx = p.velocity.x * cos - p.velocity.y * sin;
                        const vy = p.velocity.x * sin + p.velocity.y * cos;
                        
                        let newBeamData = undefined;
                        if (p.beamData) {
                            newBeamData = { ...p.beamData, angle: p.beamData.angle + theta };
                        }
                        
                        // Clone Data Objects if they exist
                        // Boomerang Data
                        let newBoomerangData = undefined;
                        if (p.boomerangData) {
                            newBoomerangData = { 
                                ...p.boomerangData, 
                                initialAngle: (p.boomerangData.initialAngle || 0) + theta 
                            };
                        }

                        clones.push({
                            ...p,
                            id: p.id + '_mirror_' + i,
                            pos: { x: player.pos.x + rotX, y: player.pos.y + rotY },
                            velocity: { x: vx, y: vy },
                            beamData: newBeamData,
                            boomerangData: newBoomerangData,
                            // Ensure arrays are cloned
                            hitEnemyIds: [],
                            // Deep copy specific data objects if needed
                            chainData: p.chainData ? { ...p.chainData, hitEntityIds: [] } : undefined,
                            mineData: p.mineData ? { ...p.mineData } : undefined
                        });
                    }
                });
                created.push(...clones);
            }

            newProjectiles.push(...created);
            
            w.currentCooldown = w.cooldown * player.stats.cooldownMult;
        } else {
            w.currentCooldown--;
        }
    });

    if (onSpawnParticle && particles.length > 0) {
        particles.forEach(p => onSpawnParticle(p));
    }

    return newProjectiles;
};
