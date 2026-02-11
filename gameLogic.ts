
import { Entity, EntityType, EnemyType, Player, Enemy, Projectile, Pickup, Weapon, TextParticle, VisualParticle, Vector2, MissionEntity } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, ZOOM_LEVEL, BALANCE } from '../constants';
import { checkCollision } from './PhysicsSystem';
import { WeaponStrategies } from './weapons';
import { getProjectile, getVisualParticle, getTextParticle } from './objectPools';
import { ALL_ENEMIES_DB } from './gameData';

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
        opacity: 1
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

export const createXP = (pos: Vector2, value: number): Pickup => ({
    id: Math.random().toString(),
    type: EntityType.PICKUP,
    kind: 'XP',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    radius: 4,
    color: '#33CCFF', // Neon Blue (Changed from #00FFFF Cyan)
    value: value,
    markedForDeletion: false,
    magnetized: false
});

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
    // Random Content
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
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        parts.push(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: pos.x + (Math.random()-0.5)*spread, y: pos.y + (Math.random()-0.5)*spread },
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

export const createMissionEntity = (pos: Vector2, kind: 'ZONE' | 'PAYLOAD' | 'OBELISK' | 'STATION' | 'CLONE' | 'SYNC_GOAL'): MissionEntity => {
    let radius = 100;
    let color = '#00FF00';
    if (kind === 'PAYLOAD') { radius = 25; color = '#FFD700'; }
    if (kind === 'OBELISK') { radius = 30; color = '#00FF00'; }
    if (kind === 'STATION') { radius = 60; color = '#FFFFFF'; }
    if (kind === 'CLONE') { radius = 12; color = '#00FFFF'; }
    if (kind === 'SYNC_GOAL') { radius = 40; color = '#00FFFF'; }

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
        active: false
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
