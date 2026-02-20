
import { WeaponBehavior } from '../weaponTypes';
import { EntityType, Enemy } from '../../../types';
import { getProjectile, getVisualParticle } from '../../objectPools';
import { audioEngine } from '../../audioEngine';
import { getNearestEnemy } from '../../PhysicsSystem';

export const handleProjectile: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed, totalCount, onSpawnParticle }) => {
    // Rhythm Check for Spirit Lance
    if (weapon.id === 'spirit_lance') {
        const interval = weapon.level >= 8 ? 4 : 8;
        if (!weapon.customData) weapon.customData = { lastFiredNote: -1 };

        const currentNote = audioEngine.total16thNotes;
        if (!(currentNote > weapon.customData.lastFiredNote && currentNote % interval === 0)) {
            return [];
        }
        weapon.customData.lastFiredNote = currentNote;
    }

    // AUGMENT: PHASE_DRILL (Slower, Bigger, Infinite Pierce)
    let speed = baseSpeed;
    let radius = 6 * player.stats.areaMult;
    let pierce = weapon.pierce;
    let color = weapon.color;

    if (weapon.augment === 'PHASE_DRILL') {
        speed *= 0.7; // Slower
        radius *= 1.5; // Bigger
        pierce = 999;  // Infinite
        color = '#AA00FF'; // Purple
    }

    // AUGMENT: VOLTAIC_ARC (Blue)
    if (weapon.augment === 'VOLTAIC_ARC') {
        color = '#00CCFF';
    }

    // RECOIL & FLASH LOGIC
    if (targets.length > 0 && weapon.id === 'spirit_lance') {
        const t = targets[0];
        const angle = Math.atan2(t.y - player.pos.y, t.x - player.pos.x);

        let recoil = 0.5;
        if (weapon.augment === 'PHASE_DRILL') recoil = 4.0;

        player.velocity.x -= Math.cos(angle) * recoil;
        player.velocity.y -= Math.sin(angle) * recoil;

        // --- MUZZLE FLASH ---
        onSpawnParticle(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: player.pos.x + Math.cos(angle) * 20, y: player.pos.y + Math.sin(angle) * 20 },
            velocity: { x: 0, y: 0 },
            radius: 0,
            color: '#FFFFFF',
            markedForDeletion: false,
            life: 4,
            maxLife: 4,
            size: 40 * player.stats.areaMult,
            decay: 0.1,
            shape: 'CIRCLE',
            lightColor: weapon.augment === 'PHASE_DRILL' ? '#AA00FF' : '#00FFFF',
            lightRadius: 150
        }));
    }

    const projectiles = [];
    if (targets.length === 0) return [];

    if (weapon.id === 'spirit_lance' && targets.length > 1) {
        for (let i = 0; i < totalCount; i++) {
            const target = targets[i % targets.length];
            const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
            const jitter = (totalCount > targets.length) ? (Math.random() - 0.5) * 0.1 : 0;

            projectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...player.pos },
                velocity: { x: Math.cos(angle + jitter) * speed, y: Math.sin(angle + jitter) * speed },
                radius: radius,
                color: color,
                markedForDeletion: false,
                damage: baseDamage,
                duration: weapon.duration,
                pierce: pierce,
                knockback: 2 * player.stats.knockbackMult,
                isEnemy: false,
                sourceWeaponId: weapon.id,
                chainData: weapon.augment === 'VOLTAIC_ARC' ? {
                    bouncesRemaining: 2,
                    hitEntityIds: [],
                    range: 200,
                    isStunning: false,
                    augment: true
                } : undefined,
                customData: { augment: weapon.augment }
            }));
        }
    } else {
        const target = targets[0];
        const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
        for (let i = 0; i < totalCount; i++) {
            const spread = totalCount > 1 ? (i - (totalCount - 1) / 2) * 0.2 : 0;
            projectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...player.pos },
                velocity: { x: Math.cos(angle + spread) * speed, y: Math.sin(angle + spread) * speed },
                radius: radius,
                color: color,
                markedForDeletion: false,
                damage: baseDamage,
                duration: weapon.duration,
                pierce: pierce,
                knockback: 2 * player.stats.knockbackMult,
                isEnemy: false,
                sourceWeaponId: weapon.id,
                chainData: weapon.augment === 'VOLTAIC_ARC' ? {
                    bouncesRemaining: 2,
                    hitEntityIds: [],
                    range: 200,
                    isStunning: false,
                    augment: true
                } : undefined,
                customData: { augment: weapon.augment }
            }));
        }
    }
    return projectiles;
};

export const handleCone: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed, totalCount, onSpawnParticle }) => {
    if (weapon.id === 'cyber_kora') {
        const interval = weapon.level >= 8 ? 4 : 8;
        if (!weapon.customData) weapon.customData = { lastFiredNote: -1 };
        const currentNote = audioEngine.total16thNotes;
        if (!(currentNote > weapon.customData.lastFiredNote && currentNote % interval === 0)) {
            return [];
        }
        weapon.customData.lastFiredNote = currentNote;
    }

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

    // RECOIL & FLASH
    let recoil = 1.5;

    player.velocity.x -= Math.cos(angle) * recoil;
    player.velocity.y -= Math.sin(angle) * recoil;

    // --- CYBER KORA AUGMENT SETUP ---
    let projColor = weapon.color;
    let particleColor = '#AAFFFF';
    let lightColor = '#00FFFF';
    let duration = weapon.duration;
    let pierce = weapon.pierce;

    if (weapon.augment === 'DISSONANCE_SHREDDER') {
        projColor = '#FF0033'; // Red/Glitch
        particleColor = '#FF0000';
        lightColor = '#FF0033';
        // DoT logic handles damage, maybe minimal visual recoil increase
    } else if (weapon.augment === 'ACOUSTIC_BARRIER') {
        projColor = '#00FFFF'; // Neon Cyan
        // Duration = Travel Time + Wall Time (2s)
        // Est Range 350 / Speed 10 = 35 frames travel + 120 frames wall = ~155
        duration = 180;
        pierce = 999; // Barrier shouldn't break on enemies while traveling (or should it? walls usually tough)
        recoil = 3.0;
    }

    // --- CYBER KORA FLASH ---
    onSpawnParticle(getVisualParticle({
        id: Math.random().toString(),
        type: EntityType.VISUAL_PARTICLE,
        pos: { x: player.pos.x + Math.cos(angle) * 15, y: player.pos.y + Math.sin(angle) * 15 },
        velocity: { x: 0, y: 0 },
        radius: 0,
        color: particleColor,
        markedForDeletion: false,
        life: 6,
        maxLife: 6,
        size: 50 * player.stats.areaMult,
        decay: 0.1,
        shape: 'CIRCLE',
        lightColor: lightColor,
        lightRadius: 120
    }));

    let arc = (Math.PI / 4) * weapon.area;
    let stunDuration = weapon.level >= 8 ? 60 : 0;
    let knockback = 4 * player.stats.knockbackMult;
    let speed = baseSpeed;

    for (let i = 0; i < totalCount; i++) {
        const spread = (i / (totalCount > 1 ? totalCount - 1 : 1)) * arc - (arc / 2);
        // Jitter for Dissonance Shredder
        let finalAngle = angle + spread;
        if (weapon.augment === 'DISSONANCE_SHREDDER') {
            finalAngle += (Math.random() - 0.5) * 0.1;
        }

        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: Math.cos(finalAngle) * speed, y: Math.sin(finalAngle) * speed },
            radius: 4 * player.stats.areaMult,
            color: projColor,
            markedForDeletion: false,
            damage: baseDamage,
            duration: duration,
            pierce: pierce,
            knockback: knockback,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            stunDuration,
            customData: {
                augment: weapon.augment,
                origin: { ...player.pos }, // For Barrier
                maxDist: 350 * player.stats.areaMult // Barrier Range
            }
        }));
    }
    return projectiles;
};

export const handleHoming: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed, totalCount }) => {
    // AUGMENT: HIVE_SHIELD (Becomes Orbital with Attack Mode)
    if (weapon.augment === 'HIVE_SHIELD') {
        const projectiles = [];
        const shieldCount = totalCount + 4; // Bonus drones for shield density
        const duration = 150; // 2.5s duration to allow for attack excursions and return
        const globalOffset = (Date.now() % 10000) / 1000; // Offset batches visually

        for (let i = 0; i < shieldCount; i++) {
            const theta = (i * (Math.PI * 2 / shieldCount)) + globalOffset;

            projectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { x: player.pos.x, y: player.pos.y },
                velocity: { x: 0, y: 0 },
                radius: 5 * player.stats.areaMult,
                color: '#00FF00', // Green
                markedForDeletion: false,
                damage: baseDamage * 0.8,
                duration: duration,
                pierce: 999,
                knockback: 2 * player.stats.knockbackMult,
                isEnemy: false,
                sourceWeaponId: weapon.id,
                customData: { augment: 'HIVE_SHIELD', thetaOffset: theta, mode: 'ORBIT' }
            }));
        }
        return projectiles;
    }

    const projectiles = [];
    const target = targets[0];

    for (let i = 0; i < totalCount; i++) {
        const angle = (Math.PI * 2 / totalCount) * i + Math.random();
        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: Math.cos(angle) * (baseSpeed * 0.5), y: Math.sin(angle) * (baseSpeed * 0.5) },
            radius: 5 * player.stats.areaMult,
            color: weapon.augment === 'HUNTER_PROTOCOL' ? '#FF0000' : weapon.color,
            markedForDeletion: false,
            damage: baseDamage,
            duration: weapon.duration,
            pierce: weapon.pierce,
            knockback: 1 * player.stats.knockbackMult,
            isEnemy: false,
            homingTargetId: target ? (target as any)._id || target.x.toString() : 'target',
            turnSpeed: 0.2,
            sourceWeaponId: weapon.id,
            customData: { augment: weapon.augment }
        }));
    }
    return projectiles;
};
