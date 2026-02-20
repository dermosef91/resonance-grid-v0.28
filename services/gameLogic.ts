import { Entity, EntityType, EnemyType, Player, Enemy, Projectile, Pickup, Weapon, TextParticle, VisualParticle, Vector2, MissionEntity, Obstacle, Replica, PlayerStats } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, ZOOM_LEVEL, BALANCE } from '../constants';
import { checkCollision } from './PhysicsSystem';
import { WeaponStrategies } from './weapons/index';
import { BASE_WEAPONS } from './gameData';
import { getProjectile, getVisualParticle, getTextParticle } from './objectPools';
import { ALL_ENEMIES_DB } from './data/enemies';
// --- CHAIN LIGHTNING LOGIC ---
export const handleChainLightning = (projectile: Projectile, hitEnemy: Enemy, allEnemies: Enemy[]): Projectile[] => {
    // 1. Check bounces
    if (!projectile.chainData || projectile.chainData.bouncesRemaining <= 0) return [];

    // 2. Track visited to prevent backtracking
    const visited = new Set(projectile.chainData.hitEntityIds);
    visited.add(hitEnemy.id);

    // 3. Find ONE nearest neighbor that hasn't been hit
    const range = projectile.chainData.range;
    const rangeSq = range * range;

    let nearest: Enemy | null = null;
    let minDistSq = Infinity;

    for (const e of allEnemies) {
        if (e.id === hitEnemy.id || visited.has(e.id)) continue;
        if (e.health <= 0 || e.markedForDeletion) continue;

        const dx = e.pos.x - hitEnemy.pos.x;
        const dy = e.pos.y - hitEnemy.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < rangeSq && distSq < minDistSq) {
            minDistSq = distSq;
            nearest = e;
        }
    }

    if (nearest) {
        const nextTarget = nearest;
        const angle = Math.atan2(nextTarget.pos.y - hitEnemy.pos.y, nextTarget.pos.x - hitEnemy.pos.x);

        // Spawn Chain Projectile
        return [getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...hitEnemy.pos },
            velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 }, // Fast zap
            radius: 3,
            color: projectile.color,
            markedForDeletion: false,
            damage: projectile.damage * 0.8, // 20% falloff
            duration: 15,
            pierce: 0,
            knockback: 0,
            isEnemy: false,
            sourceWeaponId: projectile.sourceWeaponId,
            chainData: {
                bouncesRemaining: projectile.chainData.bouncesRemaining - 1,
                hitEntityIds: Array.from(visited),
                range: range,
                isStunning: projectile.chainData.isStunning
            }
        })];
    }

    return [];
};

// --- SPAWN HELPERS ---

export const spawnEnemy = (player: Player, type: EnemyType, overridePos?: Vector2, waveId: number = 1): Enemy => {
    const info = ALL_ENEMIES_DB.find(e => e.type === type);
    const stats = info || ALL_ENEMIES_DB[0]; // Fallback to Drone

    const distance = Math.max(window.innerWidth, window.innerHeight) / ZOOM_LEVEL * 0.7; // Spawn just offscreen
    const angle = Math.random() * Math.PI * 2;

    let pos = overridePos || {
        x: player.pos.x + Math.cos(angle) * distance,
        y: player.pos.y + Math.sin(angle) * distance
    };

    // Scaling
    const waveMult = Math.pow(BALANCE.ENEMY_SCALING_RATE, waveId - 1);

    const enemy: Enemy = {
        id: Math.random().toString(),
        type: EntityType.ENEMY,
        enemyType: type,
        name: stats.name,
        pos: pos,
        velocity: { x: 0, y: 0 },
        radius: stats.radius,
        color: stats.color,
        markedForDeletion: false,
        health: stats.hp * waveMult,
        maxHealth: stats.hp * waveMult,
        damage: stats.damage * waveMult,
        xpValue: stats.xp,
        speed: stats.speed,
        isBoss: type.includes('BOSS'),
        attackTimer: 0,
        stunTimer: 0,
        immuneTimers: {},
        opacity: 1,
        rotVelocity: 0
    };

    // Initialize Gemini Link Data
    if (type === EnemyType.BINARY_SENTINEL) {
        enemy.binaryData = {
            angle: Math.random() * Math.PI * 2,
            separation: 60,
            separationDir: 1, // Start expanding
            nodeRadius: 15
        };
    }

    return enemy;
};

export const createObstacle = (pos: Vector2, isMegastructure: boolean = false): Obstacle => {
    const isBox = Math.random() > 0.5;
    const scaleMult = isMegastructure ? 3.0 : 1.0;
    const radius = (30 + Math.random() * 40) * scaleMult;

    return {
        id: Math.random().toString(),
        type: EntityType.OBSTACLE,
        pos: { ...pos },
        velocity: { x: 0, y: 0 }, // Static
        radius: radius, // Collision radius
        color: '#444444', // Dark Grey/Metallic
        markedForDeletion: false,
        shape: isBox ? 'BOX' : (Math.random() > 0.5 ? 'CYLINDER' : 'HEX'),
        height: (150 + Math.random() * 200) * scaleMult, // Tall structure
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * (0.02 / scaleMult)
    };
};

export const createProjectile = (
    weapon: Weapon,
    player: Player,
    targets: Vector2[],
    outParticles: VisualParticle[] = [],
    activeCount: number = 0
): Projectile[] => {
    const behavior = WeaponStrategies[weapon.type];
    if (behavior) {
        // Apply stats modifiers
        const baseDamage = weapon.damage * player.stats.damageMult;
        const baseSpeed = weapon.speed * player.stats.speedMult;
        let totalCount = weapon.count + player.stats.projectileCountFlat;

        // ORBITAL LOCK FIX: Prevent infinite accumulation by limiting to weapon count
        if (weapon.augment === 'ORBITAL_LOCK') {
            totalCount = Math.max(0, totalCount - activeCount);
            if (totalCount === 0) return [];
        }

        return behavior({
            player,
            weapon,
            targets,
            baseDamage,
            baseSpeed,
            totalCount,
            onSpawnParticle: (p) => outParticles.push(p)
        });
    }
    return [];
};

export const createXP = (pos: Vector2, value: number): Pickup => {
    // Dynamic radius: Base 3.0 for value 1, scaling logarithmically up to max ~10
    const radius = Math.min(10, 3.0 + Math.log10(Math.max(1, value)) * 2);

    return {
        id: Math.random().toString(),
        type: EntityType.PICKUP,
        kind: 'XP',
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: radius,
        color: '#33CCFF', // Neon Blue
        value: value,
        markedForDeletion: false,
        magnetized: false
    };
};

export const createCurrency = (pos: Vector2, value: number): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'CURRENCY',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 5,
    color: '#FFD700', // Gold
    value: value,
    markedForDeletion: false,
    magnetized: false
});

export const createHealthPickup = (pos: Vector2): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'HEALTH',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 6,
    color: '#00FF00', // Green
    value: 25,
    markedForDeletion: false,
    magnetized: false
});

export const createSupplyDrop = (pos: Vector2, excludeTemporal: boolean = false): Pickup => {
    // 10% Chance for Rare Powerup (Time Crystal, Kaleidoscope, Stasis Field)
    if (Math.random() < 0.10) {
        const rareRoll = Math.random();
        if (rareRoll < 0.33) return createTimeCrystal(pos);
        if (rareRoll < 0.66) return createKaleidoscopePickup(pos);
        return createStasisFieldPickup(pos);
    }

    // Standard Content
    const roll = Math.random();
    let content: 'CURRENCY_50' | 'FULL_HEALTH' | 'LEVEL_UP' | 'TEMPORAL_BOOST' | 'EXTRA_LIFE' = 'CURRENCY_50';

    if (roll > 0.95) content = 'EXTRA_LIFE'; // 5%
    else if (roll > 0.85) content = 'LEVEL_UP'; // 10%
    else if (roll > 0.65) content = 'FULL_HEALTH'; // 20%
    else if (roll > 0.45 && !excludeTemporal) content = 'TEMPORAL_BOOST'; // 20% (Temp weapon)
    // else 45% Currency (or 65% if excluded)

    let color = '#FFFFFF';
    if (content === 'CURRENCY_50') color = '#FFD700';
    if (content === 'FULL_HEALTH') color = '#00FF00';
    if (content === 'LEVEL_UP') color = '#00FFFF';
    if (content === 'TEMPORAL_BOOST') color = '#FF6600'; // Orange for Weapon

    return {
        id: Math.random().toString(),
        type: EntityType.PICKUP,
        kind: 'SUPPLY_DROP',
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: 12,
        color: color,
        value: 0,
        markedForDeletion: false,
        magnetized: false,
        supplyContent: content
    };
};

export const createTextParticle = (pos: Vector2, text: string, color: string = '#FFFFFF', duration: number = 30): TextParticle =>
    getTextParticle({
        id: Math.random().toString(),
        type: EntityType.TEXT_PARTICLE,
        pos: { ...pos },
        velocity: { x: 0, y: -1 },
        radius: 0,
        color: color,
        markedForDeletion: false,
        text: text,
        life: duration,
        opacity: 1
    });

export const createShatterParticles = (pos: Vector2, color: string, count: number = 8, spread: number = 10): VisualParticle[] => {
    const parts: VisualParticle[] = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        parts.push(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: pos.x + (Math.random() - 0.5) * spread, y: pos.y + (Math.random() - 0.5) * spread },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            radius: 0,
            color: color,
            markedForDeletion: false,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 3,
            decay: 0.92,
            shape: Math.random() > 0.5 ? 'SQUARE' : 'LINE',
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        }));
    }
    return parts;
};

// --- POLYGON SHATTER LOGIC ---
export const createPolygonShatterParticles = (enemy: Enemy): VisualParticle[] => {
    const parts: VisualParticle[] = [];
    const color = enemy.color;
    const r = enemy.radius;
    const rot = enemy.rotation || 0;

    // 1. Define base 2D silhouette points for standard enemies
    let basePoints: Vector2[] = [];

    switch (enemy.enemyType) {
        case EnemyType.LANCER:
            basePoints = [
                { x: r * 1.5, y: 0 },
                { x: -r * 0.75, y: -r * 0.6 },
                { x: -r * 0.75, y: r * 0.6 }
            ];
            break;
        case EnemyType.TANK:
            // Octagon
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
                basePoints.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            break;
        case EnemyType.DRONE:
        case EnemyType.ELITE_DRONE:
            // Diamond
            basePoints = [
                { x: 0, y: -r },
                { x: r * 0.7, y: 0 },
                { x: 0, y: r * 0.7 },
                { x: -r * 0.7, y: 0 }
            ];
            break;
        case EnemyType.SWARMER:
            // Triangle Shards
            basePoints = [
                { x: 0, y: -r },
                { x: r * 0.866, y: r * 0.5 },
                { x: -r * 0.866, y: r * 0.5 }
            ];
            break;
        case EnemyType.SENTINEL:
            // Diamond
            basePoints = [
                { x: 0, y: -r * 1.2 },
                { x: r * 1.2, y: 0 },
                { x: 0, y: r * 1.2 },
                { x: -r * 1.2, y: 0 }
            ];
            break;
        default:
            // Fallback: Hexagon
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                basePoints.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            break;
    }

    // 2. Rotate points to match enemy's current rotation
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const rotatedPoints: Vector2[] = basePoints.map(p => ({
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos
    }));

    // 3. Create shards by connecting center to adjacent edges
    const center = { x: 0, y: 0 };
    for (let i = 0; i < rotatedPoints.length; i++) {
        const nextIdx = (i + 1) % rotatedPoints.length;
        const p1 = rotatedPoints[i];
        const p2 = rotatedPoints[nextIdx];

        // The physics center of the shard
        const shardCenterX = (center.x + p1.x + p2.x) / 3;
        const shardCenterY = (center.y + p1.y + p2.y) / 3;

        // Shift polygon vertices so the shard's "center" is at 0,0 locally
        const poly: Vector2[] = [
            { x: center.x - shardCenterX, y: center.y - shardCenterY },
            { x: p1.x - shardCenterX, y: p1.y - shardCenterY },
            { x: p2.x - shardCenterX, y: p2.y - shardCenterY }
        ];

        // Explosion velocity outward from the enemy center, plus some random scatter
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterMag = Math.random() * 2;
        const spd = 2 + Math.random() * 3;
        const vx = shardCenterX * 0.1 * spd + Math.cos(scatterAngle) * scatterMag;
        const vy = shardCenterY * 0.1 * spd + Math.sin(scatterAngle) * scatterMag;

        parts.push(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: enemy.pos.x + shardCenterX, y: enemy.pos.y + shardCenterY },
            velocity: { x: vx, y: vy },
            radius: 0, // Not used for collision
            color: color,
            markedForDeletion: false,
            life: 40 + Math.random() * 20,
            maxLife: 60,
            size: 1, // acts as scale multiplier if needed
            decay: 0.94,
            shape: 'POLYGON',
            polygon: poly,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.4
        }));
    }

    // Add a few generic particles for extra juice
    parts.push(...createShatterParticles(enemy.pos, color, 4, r * 0.5));

    return parts;
};

export const createBossDeathExplosion = (pos: Vector2): Projectile[] => {
    // Massive damage burst
    return [
        getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...pos },
            velocity: { x: 0, y: 0 },
            radius: 50, // Grows in update
            color: '#FFFFFF',
            markedForDeletion: false,
            damage: 2000,
            duration: 100, // Long duration
            pierce: 999,
            knockback: 100,
            isEnemy: false,
            sourceWeaponId: 'boss_death_core'
        }),
        getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...pos },
            velocity: { x: 0, y: 0 },
            radius: 100, // Grows fast
            color: '#FF0000',
            markedForDeletion: false,
            damage: 500,
            duration: 50,
            pierce: 999,
            knockback: 50,
            isEnemy: false,
            sourceWeaponId: 'boss_death_ring'
        })
    ];
};

export const createEventHorizon = (pos: Vector2): Projectile => {
    return getProjectile({
        id: Math.random().toString(),
        type: EntityType.PROJECTILE,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: 60,
        color: '#000000',
        markedForDeletion: false,
        damage: 0,
        duration: 99999,
        pierce: 999,
        knockback: 0,
        isEnemy: false,
        anchorData: {
            pullRadius: 600
        }
    });
};

export const createKaleidoscopePickup = (pos: Vector2): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'KALEIDOSCOPE',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 12,
    color: '#FF00FF', // Magenta
    value: 0,
    markedForDeletion: false,
    magnetized: false
});

export const createTimeCrystal = (pos: Vector2): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'TIME_CRYSTAL',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 10,
    color: '#00FFFF', // Cyan
    value: 0,
    markedForDeletion: false,
    magnetized: false
});

export const createStasisFieldPickup = (pos: Vector2): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'STASIS_FIELD',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 12,
    color: '#0000FF', // Deep Blue
    value: 0,
    markedForDeletion: false,
    magnetized: false
});

export const createMissionEntity = (pos: Vector2, kind: 'ZONE' | 'PAYLOAD' | 'OBELISK' | 'STATION' | 'CLONE' | 'SYNC_GOAL' | 'FILTER_WAVE' | 'EVENT_HORIZON' | 'SOLAR_SHIELD' | 'ALLY'): MissionEntity => {
    let radius = 100;
    let color = '#00FF00';
    let isSolid = false;
    if (kind === 'PAYLOAD') { radius = 25; color = '#00FFFF'; } // Updated to Cyan
    if (kind === 'OBELISK') { radius = 30; color = '#00FF00'; }
    if (kind === 'STATION') { radius = 60; color = '#FFFFFF'; }
    if (kind === 'CLONE') { radius = 12; color = '#00FFFF'; }
    if (kind === 'SYNC_GOAL') { radius = 40; color = '#00FFFF'; }
    if (kind === 'FILTER_WAVE') { radius = 0; color = '#00FFFF'; }
    if (kind === 'EVENT_HORIZON') { radius = 40; color = '#000000'; } // Visual radius of the black hole core
    if (kind === 'SOLAR_SHIELD') { radius = 60; color = '#FFD700'; isSolid = true; } // Gold/Orange Shield
    if (kind === 'ALLY') { radius = 15; color = '#00AAFF'; } // Blue Ally

    return {
        id: Math.random().toString(),
        type: EntityType.MISSION_ENTITY,
        kind,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius,
        color,
        markedForDeletion: false,
        health: 100,
        maxHealth: 100,
        active: false,
        solid: isSolid
    };
};

export const createMissionPickup = (pos: Vector2, kind: 'MISSION_ITEM' | 'MISSION_ZONE'): Pickup => {
    return {
        id: Math.random().toString(),
        type: EntityType.PICKUP,
        kind,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: kind === 'MISSION_ITEM' ? 15 : 100,
        color: kind === 'MISSION_ITEM' ? '#00FFFF' : '#00FF00',
        value: 0,
        markedForDeletion: false,
        magnetized: false
    };
};


export const createAllyReplica = (pos: Vector2, offset: Vector2, playerStats: PlayerStats, allyClass: 'ASSAULT' | 'SNIPER' | 'SUPPORT' = 'ASSAULT'): Replica => {
    let weapon: Weapon;
    let color = '#00AAFF';
    let radius = 12;

    if (allyClass === 'SNIPER') {
        weapon = { ...BASE_WEAPONS.spirit_lance };
        weapon.damage *= 2.5; // High damage
        weapon.speed *= 2.0;  // Fast projectile
        weapon.cooldown = 120; // Slow fire
        weapon.currentCooldown = 0;
        weapon.id = 'ally_sniper';
        weapon.color = '#00FF88';
        color = '#00FF88';
    } else if (allyClass === 'SUPPORT') {
        weapon = { ...BASE_WEAPONS.cyber_kora }; // Wide cone
        weapon.damage *= 0.8;
        weapon.count = 3; // Reduced from base+2 to fixed 3
        weapon.area *= 1.2; // Slightly wider
        weapon.cooldown = 60; // Force meaningful cooldown (1s) to prevent spam
        weapon.currentCooldown = 0;
        weapon.id = 'ally_support';
        weapon.color = '#FF8800';
        color = '#FF8800';
        radius = 16;
    } else {
        // ASSAULT (Green Icosahedron)
        weapon = { ...BASE_WEAPONS.spirit_lance };
        weapon.damage *= 0.6;
        weapon.cooldown = 15; // Rapid fire
        weapon.currentCooldown = 0;
        weapon.count = 1;
        weapon.id = 'ally_assault';
        weapon.color = '#00FF88'; // Green projectiles
        color = '#00FF88'; // Green Ship
    }

    return {
        id: Math.random().toString(),
        type: EntityType.PLAYER, // Visually looks like player
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius,
        color,
        markedForDeletion: false,
        rotation: 0,
        weapons: [weapon],
        stats: { ...playerStats },
        lifeTime: 999999, // Infinite until mission end
        isAlly: true,
        isSpectral: true,
        formationOffset: offset
    };
};
