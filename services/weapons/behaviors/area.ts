
import { WeaponBehavior } from '../weaponTypes';
import { EntityType } from '../../../types';
import { hexToRgba } from '../../renderUtils';
import { getProjectile } from '../../objectPools';
import { audioEngine } from '../../audioEngine';

export const handleOrbital: WeaponBehavior = ({ player, weapon, baseDamage, totalCount }) => {
    // AUGMENT: BASS_DROP (Periodically slam in)
    let orbitDist = 80 * player.stats.areaMult;
    let damage = baseDamage;
    let color = weapon.color;
    
    if (weapon.augment === 'BASS_DROP') {
        const note = audioEngine.total16thNotes;
        const measure = Math.floor(note / 16);
        
        // Initialize tracking if missing
        if (!weapon.customData) weapon.customData = { lastShockwaveNote: -1 };

        if (measure % 4 === 3) { // 4th Bar
            const beat = note % 16;
            if (beat < 4) orbitDist *= 2.0; // Wind up
            else if (beat < 8) orbitDist *= 0.1; // DROP (Slam in)
            else orbitDist *= 1.5; // Explode out
            
            if (beat >= 4 && beat < 8) {
                damage *= 3; // Crit during slam
                color = '#FF4400';
            }

            // Trigger Shockwave at exact start of DROP (beat 4)
            // Ensure we only fire once per cycle
            if (beat === 4 && weapon.customData.lastShockwaveNote !== note) {
                weapon.customData.lastShockwaveNote = note;
                
                // Return immediately with the shockwave added to the array
                // We will append the drums afterwards
                // Note: We can't return immediately because we still need to render the drums themselves
            }
        }
    }

    const projectiles = [];

    // BASS_DROP SHOCKWAVE INJECTION
    if (weapon.augment === 'BASS_DROP') {
        const note = audioEngine.total16thNotes;
        const measure = Math.floor(note / 16);
        const beat = note % 16;
        
        if (measure % 4 === 3 && beat === 4 && weapon.customData?.lastShockwaveNote === note) {
             projectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { ...player.pos },
                velocity: { x: 0, y: 0 },
                radius: 10, // Starts small, expands rapidly
                color: '#FF4400',
                markedForDeletion: false,
                damage: baseDamage * 4,
                duration: 15,
                pierce: 999,
                knockback: 25 * player.stats.knockbackMult,
                isEnemy: false,
                sourceWeaponId: 'bass_drop_shockwave'
            }));
        }
    }

    for (let i = 0; i < totalCount; i++) {
        const theta = (Date.now() / 150) + (i * (Math.PI * 2 / totalCount)); 
        
        projectiles.push(getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { 
                x: player.pos.x + Math.cos(theta) * orbitDist, 
                y: player.pos.y + Math.sin(theta) * orbitDist 
            },
            velocity: { x: 0, y: 0 }, 
            radius: 10 * player.stats.areaMult,
            color: color,
            markedForDeletion: false,
            damage: damage,
            duration: 5, 
            pierce: 999,
            knockback: 5 * player.stats.knockbackMult,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            customData: { augment: weapon.augment }
        }));

        // AUGMENT: SOLAR_FLARE (Fire lasers)
        if (weapon.augment === 'SOLAR_FLARE' && i === 0 && audioEngine.total16thNotes % 4 === 0) {
             projectiles.push(getProjectile({
                id: Math.random().toString(),
                type: EntityType.PROJECTILE,
                pos: { x: player.pos.x + Math.cos(theta) * orbitDist, y: player.pos.y + Math.sin(theta) * orbitDist },
                velocity: { x: Math.cos(theta) * 25, y: Math.sin(theta) * 25 }, 
                radius: 2, // Slimmer for laser look
                color: '#FFFF00',
                markedForDeletion: false,
                damage: baseDamage,
                duration: 40,
                pierce: 1,
                knockback: 0,
                isEnemy: false,
                sourceWeaponId: 'drum_laser' // Specific ID for rendering/logic
             }));
        }
    }
    return projectiles;
};

export const handleAura: WeaponBehavior = ({ player, weapon, baseDamage }) => {
    return [getProjectile({
        id: Math.random().toString(),
        type: EntityType.PROJECTILE,
        pos: { ...player.pos },
        velocity: { x: 0, y: 0 },
        radius: (60 + (weapon.level * 10)) * player.stats.areaMult,
        color: hexToRgba(weapon.color, 0.2),
        markedForDeletion: false,
        damage: baseDamage / 10, 
        duration: 5,
        pierce: 999,
        knockback: 4.0 * player.stats.knockbackMult,
        isEnemy: false,
        sourceWeaponId: weapon.id
    })];
};

export const handleShockwave: WeaponBehavior = ({ player, weapon, baseDamage }) => {
    // AUGMENT: CHRONO_STUTTER
    const stun = weapon.augment === 'CHRONO_STUTTER' ? 240 : 0; // 4s stun
    
    const p = getProjectile({
        id: Math.random().toString(),
        type: EntityType.PROJECTILE,
        pos: { ...player.pos },
        velocity: { x: 0, y: 0 },
        radius: 10, 
        color: weapon.augment === 'CHRONO_STUTTER' ? '#00FFFF' : weapon.color,
        markedForDeletion: false,
        damage: baseDamage,
        duration: 20, 
        pierce: 999,
        knockback: 10 * player.stats.knockbackMult,
        isEnemy: false,
        sourceWeaponId: weapon.id,
        stunDuration: stun,
        customData: { augment: weapon.augment }
    });
    
    const results = [p];
    return results;
};

export const handleRhythmWave: WeaponBehavior = ({ player, weapon, baseDamage }) => {
    const isEvolved = weapon.level >= 8;
    const interval = isEvolved ? 4 : 8; 
    
    if (!weapon.customData) weapon.customData = { lastFiredNote: -1 };
    
    const currentNote = audioEngine.total16thNotes;
    
    if (currentNote > weapon.customData.lastFiredNote && currentNote % interval === 0) {
        weapon.customData.lastFiredNote = currentNote;
        
        let radius = (60 + (weapon.level * 5)) * weapon.area * player.stats.areaMult;
        let damage = baseDamage;
        let knockback = 25 * player.stats.knockbackMult; // Base knockback
        let color = weapon.color;

        // AUGMENT: SUPERNOVA (Replaces Gravity Well)
        if (weapon.augment === 'SUPERNOVA') {
            radius *= 1.5; // +50% Radius
            // Breathe: Pulse radius over time
            const breathe = 1.0 + Math.sin(Date.now() / 400) * 0.2; 
            radius *= breathe;
            color = '#FF00FF'; // Magenta
        }

        // AUGMENT: ENTROPY_FIELD (Updated)
        if (weapon.augment === 'ENTROPY_FIELD') {
            damage *= 1.5; // +50% Damage
            knockback *= 2.0; // +100% Knockback
            color = '#0000FF'; // Deep Blue
        }
        
        return [getProjectile({
            id: Math.random().toString(),
            type: EntityType.PROJECTILE,
            pos: { ...player.pos },
            velocity: { x: 0, y: 0 },
            radius: radius, 
            color: color,
            markedForDeletion: false,
            damage: damage,
            duration: 15, 
            pierce: 999,
            knockback: knockback,
            isEnemy: false,
            sourceWeaponId: weapon.id,
            customData: { augment: weapon.augment }
        })];
    }
    
    return [];
};
