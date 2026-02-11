
import { WeaponBehavior } from '../weaponTypes';
import { EntityType } from '../../../types';
import { getProjectile, getVisualParticle } from '../../objectPools';
import { audioEngine } from '../../audioEngine';

export const handleBeam: WeaponBehavior = ({ player, weapon, baseDamage }) => {
    const projectiles = [];
    const isEvolved = weapon.level >= 8;
    let angle = player.rotation;
    if (isEvolved) {
        angle = (Date.now() / 500) % (Math.PI * 2); 
    }
    const beamCount = weapon.count;
    for(let i=0; i<beamCount; i++) {
        let finalAngle = angle;
        if (beamCount > 1) {
            const spread = 0.3;
            finalAngle = angle + (i - (beamCount-1)/2) * spread;
        }
        if (isEvolved && i > 0) {
            finalAngle = angle + (i * Math.PI); 
        }
        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: 0, y: 0 },
            radius: 0,
            color: weapon.color,
            markedForDeletion: false,
            damage: baseDamage,
            duration: 2,
            pierce: 999,
            knockback: 0.5 * player.stats.knockbackMult,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            beamData: {
                angle: finalAngle,
                length: weapon.speed * player.stats.areaMult,
                width: weapon.area * player.stats.areaMult,
                tickRate: 7
            }
        }));
    }
    return projectiles;
};

export const handleBoomerang: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed, totalCount, onSpawnParticle }) => {
    const projectiles = [];
    let angle = 0;
    if (targets.length > 0) {
        const target = targets[0];
        angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
    } else if (player.velocity.x !== 0 || player.velocity.y !== 0) {
        angle = Math.atan2(player.velocity.y, player.velocity.x);
    } else {
        angle = Math.random() * Math.PI * 2;
    }

    // AUGMENT: ORBITAL_LOCK (Forever Orbit)
    const isOrbital = weapon.augment === 'ORBITAL_LOCK';
    const orbitDur = isOrbital ? 99999 : (weapon.level >= 8 ? 80 : 0);

    // RECOIL LOGIC
    if (!isOrbital) {
        const recoil = 0.8;
        player.velocity.x -= Math.cos(angle) * recoil;
        player.velocity.y -= Math.sin(angle) * recoil;

        // --- SOLAR CHAKRAM FLASH ---
        onSpawnParticle(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: player.pos.x + Math.cos(angle) * 10, y: player.pos.y + Math.sin(angle) * 10 },
            velocity: { x: 0, y: 0 },
            radius: 0,
            color: '#FFD700',
            markedForDeletion: false,
            life: 5,
            maxLife: 5,
            size: 60 * player.stats.areaMult,
            decay: 0.1,
            shape: 'CIRCLE',
            lightColor: '#FFA500', // Orange-Gold Light
            lightRadius: 180
        }));
    }

    for (let i = 0; i < totalCount; i++) {
        const spread = totalCount > 1 ? ((i / (totalCount - 1)) * Math.PI / 2) - (Math.PI / 4) : 0;
        const finalAngle = angle + spread;
        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: {
                x: Math.cos(finalAngle) * baseSpeed,
                y: Math.sin(finalAngle) * baseSpeed
            },
            radius: 12 * player.stats.areaMult * weapon.area,
            color: isOrbital ? '#FFD700' : weapon.color,
            markedForDeletion: false,
            damage: baseDamage,
            duration: 9999, 
            pierce: 999, 
            knockback: 3 * player.stats.knockbackMult,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            boomerangData: {
                state: 'OUT',
                speed: baseSpeed,
                maxDist: 300 * weapon.area * player.stats.areaMult,
                distTraveled: 0,
                orbitDuration: orbitDur, 
                orbitTimer: 0,
                initialAngle: finalAngle,
                augmented: weapon.augment === 'FRACTAL_SPLIT'
            },
            customData: { augment: weapon.augment }
        }));
    }
    return projectiles;
};

export const handleChain: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed }) => {
    const projectiles = [];
    if (targets.length > 0) {
        const target = targets[0];
        const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
        projectiles.push(getProjectile({
           id: Math.random().toString(),
           type: EntityType.PROJECTILE,
           pos: { ...player.pos },
           velocity: {
               x: Math.cos(angle) * baseSpeed,
               y: Math.sin(angle) * baseSpeed
           },
           radius: 3, 
           color: weapon.color,
           markedForDeletion: false,
           damage: baseDamage,
           duration: 40,
           pierce: 0, 
           knockback: 0,
           isEnemy: false,
           sourceWeaponId: weapon.id,
           chainData: {
               bouncesRemaining: weapon.pierce + (weapon.level >= 8 ? 6 : 0),
               hitEntityIds: [],
               range: 400 * weapon.area * player.stats.areaMult,
               isStunning: weapon.level >= 8
           }
        }));
    }
    return projectiles;
};

let trailNodeIndex = 0;

export const handleTrail: WeaponBehavior = ({ player, weapon, baseDamage }) => {
    if (Math.abs(player.velocity.x) < 0.1 && Math.abs(player.velocity.y) < 0.1) {
        return [];
    }

    trailNodeIndex++;
    
    // AUGMENT: UNSTABLE_GROUND (Explosive)
    const isExplosive = weapon.augment === 'UNSTABLE_GROUND';
    const color = isExplosive ? '#FF0055' : weapon.color;

    return [getProjectile({
        id: Math.random().toString(),
        type: EntityType.PROJECTILE,
        pos: { ...player.pos },
        velocity: { x: 0, y: 0 },
        radius: 12 * player.stats.areaMult * weapon.area,
        color: color,
        markedForDeletion: false,
        damage: baseDamage,
        duration: weapon.duration, 
        pierce: 999, 
        knockback: 0, 
        isEnemy: false,
        sourceWeaponId: weapon.id,
        voidWakeData: {
            index: trailNodeIndex,
            explosive: isExplosive
        },
        customData: { augment: weapon.augment }
    })];
};

export const handleParadoxPendulum: WeaponBehavior = ({ player, weapon, baseDamage, totalCount }) => {
    // Rhythm Sync Logic
    const isEvolved = weapon.level >= 8;
    // Reduced frequency by half:
    // Evolved = Every 2 Beats (8 16ths), Normal = Every 4 Beats / 1 Measure (16 16ths)
    const interval = isEvolved ? 8 : 16; 

    if (!weapon.customData) weapon.customData = { lastFiredNote: -1 };
    
    const currentNote = audioEngine.total16thNotes;
    
    // Only fire if on the interval beat and haven't fired for this note yet
    if (!(currentNote > weapon.customData.lastFiredNote && currentNote % interval === 0)) {
        return [];
    }
    weapon.customData.lastFiredNote = currentNote;

    const sweepAngle = isEvolved ? Math.PI * 2 : Math.PI; // 180 or 360 degrees
    const baseAngle = player.rotation; // Swing in direction player is moving/facing
    
    const projectiles = [];
    
    const isEcho = weapon.augment === 'QUANTUM_ECHO';
    const isDrag = weapon.augment === 'TEMPORAL_DRAG';
    
    // Determine Color based on Augment
    let color = weapon.color; // Gold default
    if (isEcho) color = '#00FFFF'; // Cyan
    if (isDrag) color = '#AA00AA'; // Purple

    // AUGMENT: QUANTUM_ECHO (Double pendulum)
    const count = isEcho ? totalCount * 2 : totalCount;

    for(let i=0; i<count; i++) {
        // Echo Logic: If index is in the second half, it's a phantom echo
        // Echoes swing in REVERSE direction (Counter-Clockwise) to create "scissoring" effect
        const isPhantom = isEcho && i >= totalCount;
        const swingDir = isPhantom ? -1 : 1;
        
        // Use modulus to pair up originals with echoes
        // i.e. 0 pairs with totalCount, 1 pairs with totalCount+1
        const baseIndex = i % totalCount;
        
        const angleOffset = (baseIndex / totalCount) * Math.PI * 2;
        
        // Use White for the Phantom Echo to look ghostly
        const projColor = isPhantom ? '#FFFFFF' : color;

        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: 0, y: 0 },
            // Set radius to a reasonable hitbox size for the Bob
            radius: 8 * player.stats.areaMult, 
            color: projColor,
            markedForDeletion: false,
            damage: baseDamage,
            duration: weapon.duration, // Controls swing speed (approx 20-30 frames)
            pierce: 999,
            knockback: 20 * player.stats.knockbackMult,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            paradoxData: {
                baseAngle: baseAngle + angleOffset,
                sweepAngle: sweepAngle,
                currentPhase: 0,
                state: 'FORWARD',
                isEvolution: isEvolved,
                // Store the full arm length here for the system logic
                armLength: 150 * weapon.area * player.stats.areaMult,
                swingDir: swingDir
            },
            customData: { augment: weapon.augment }
        }));
    }
    return projectiles;
};

export const handleFractal: WeaponBehavior = ({ player, weapon, baseDamage, totalCount }) => {
    const isTrail = weapon.augment === 'JULIAS_GRASP'; // Replaced Grav Pull with Trail
    const isRecursion = weapon.augment === 'RECURSIVE_SPLIT'; // Replaced Split with In-Place Growth
    const isEvolved = weapon.level >= 8;

    // JULIAS_GRASP: Spawns an Emitter attached to the player that drops fractals as they move
    if (isTrail) {
        // Return a single long-lived emitter projectile. 
        // The ProjectileSystem handles the actual spawning of trail fractals.
        // We set duration same as weapon cycle so it acts as a "buff" phase.
        return [getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: 0, y: 0 },
            radius: 0, // No collision
            color: '#00FFFF',
            markedForDeletion: false,
            damage: 0, // Emitter itself does no damage
            duration: weapon.duration, // Lasts for the duration of the 'spell'
            pierce: 999,
            knockback: 0,
            isEnemy: false,
            sourceWeaponId: 'fractal_trail_emitter', // Special ID for system logic
            customData: {
                augment: 'JULIAS_GRASP',
                spawnDamage: baseDamage * 0.6, // Trail fractals are weaker but numerous
                spawnArea: weapon.area * player.stats.areaMult,
                spawnDuration: 50 // Trail elements last ~0.8s
            }
        })];
    }

    // FRACTAL BLOOM: Drops a stationary area
    // RECURSIVE_SPLIT: Handled via data flags in ProjectileSystem (Growth/Implosion)
    const projectiles = [];
    
    for (let i = 0; i < totalCount; i++) {
        // Offset slightly if multiple
        const offset = totalCount > 1 ? (Math.PI * 2 / totalCount) * i : 0;
        const spawnX = player.pos.x + (totalCount > 1 ? Math.cos(offset) * 30 : 0);
        const spawnY = player.pos.y + (totalCount > 1 ? Math.sin(offset) * 30 : 0);

        const areaRadius = 120 * weapon.area * player.stats.areaMult;

        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { x: spawnX, y: spawnY },
            velocity: { x: 0, y: 0 },
            radius: areaRadius, // Visual/Hitbox radius
            color: weapon.color,
            markedForDeletion: false,
            damage: baseDamage,
            duration: weapon.duration,
            pierce: 999,
            knockback: 0.5, 
            isEnemy: false,
            sourceWeaponId: weapon.id,
            fractalData: {
                rotationSpeed: 0.05 + (Math.random() * 0.02),
                hueShift: Math.random() * 360,
                branches: 2 + Math.floor(Math.random() * 2), // 2 or 3 arms
                recursionDepth: isEvolved ? 3 : 2
            },
            mineData: { // Reuse mine logic for collision ticking
                isMine: true,
                explosionRadius: 0, // No explosion on trigger
                pullRadius: 0,
                lingers: true // Ticks damage over time
            },
            customData: { 
                augment: weapon.augment,
                maxDuration: weapon.duration, // Needed for growth calculation
                baseRadius: areaRadius 
            }
        }));
    }
    
    return projectiles;
};
