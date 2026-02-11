
import { WeaponBehavior } from '../weaponTypes';
import { EntityType } from '../../../types';
import { getProjectile, getVisualParticle } from '../../objectPools';
import { getNearestEnemy } from '../../PhysicsSystem';

export const handleKaleidoscope: WeaponBehavior = ({ player, weapon, targets, baseDamage, baseSpeed, totalCount, onSpawnParticle }) => {
    
    // Determine Target Angle
    let angle = 0;
    if (targets.length > 0) {
        const target = targets[0];
        angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
    } else if (player.velocity.x !== 0 || player.velocity.y !== 0) {
        angle = Math.atan2(player.velocity.y, player.velocity.x);
    } else {
        // Find nearest enemy if targets empty but we want auto-aim
        // The WeaponSystem passes targets based on weapon logic, usually nearest
        // If no targets, fire in random direction or facing direction
        angle = player.rotation || (Math.random() * Math.PI * 2);
    }

    const projectiles = [];
    const isTriPrism = weapon.augment === 'TRI_OPTIC_PRISM';
    const isGodhead = weapon.level >= 8;
    
    // Base pierce logic for White Beam
    // Default 0 (splits on impact), Augment Chroma Stasis = 1 pierce
    const pierce = weapon.augment === 'CHROMA_STASIS' ? 1 : 0;

    // Fire Main Beam(s)
    const fireCount = isTriPrism ? 3 : 1;
    const spread = Math.PI / 6; // 30 degrees spread

    for (let i = 0; i < fireCount; i++) {
        let fireAngle = angle;
        if (fireCount > 1) {
            fireAngle = angle + (i - 1) * spread;
        }

        // Recoil
        const recoil = 1.0;
        player.velocity.x -= Math.cos(fireAngle) * recoil;
        player.velocity.y -= Math.sin(fireAngle) * recoil;

        // Flash
        onSpawnParticle(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: player.pos.x + Math.cos(fireAngle) * 15, y: player.pos.y + Math.sin(fireAngle) * 15 },
            velocity: { x: 0, y: 0 },
            radius: 0,
            color: '#FFFFFF',
            markedForDeletion: false,
            life: 6, maxLife: 6, size: 40 * player.stats.areaMult, decay: 0.1, shape: 'CIRCLE',
            lightColor: '#FFFFFF', lightRadius: 100
        }));

        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: Math.cos(fireAngle) * baseSpeed, y: Math.sin(fireAngle) * baseSpeed },
            radius: 4, // Thin beam
            color: '#FFFFFF',
            markedForDeletion: false,
            damage: baseDamage,
            duration: 100, // Range
            pierce: pierce,
            knockback: 1 * player.stats.knockbackMult,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            kaleidoscopeData: {
                colorType: 'WHITE',
                generation: 0,
                splitCount: 3 + Math.floor((weapon.level - 1) / 3), // Increases with level slightly
                isGodhead: isGodhead
            },
            customData: { augment: weapon.augment }
        }));
    }

    return projectiles;
};
