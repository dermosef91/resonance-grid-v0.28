
import { Pickup, Player } from '../../types';
import { createTextParticle } from '../gameLogic';

export interface PickupUpdateResult {
    collected: Pickup[];
}

export const updatePickups = (
    pickups: Pickup[],
    player: Player
): PickupUpdateResult => {
    const collected: Pickup[] = [];

    pickups.forEach(p => {
        // Skip processing for uploading zones to prevent multiple triggers
        if ((p as any).isUploading) return;

        let dx = p.pos.x - player.pos.x;
        let dy = p.pos.y - player.pos.y;
        let distSq = dx * dx + dy * dy;

        const magnetR = player.magnetRadius * player.stats.magnetMult;
        
        // Magnet Logic
        // Only apply magnet to enemy drops (XP, Currency, Health).
        // Exclude Supply Drops and Mission Items from being magnetized.
        const isMagnetizable = p.kind === 'XP' || p.kind === 'CURRENCY' || p.kind === 'HEALTH';

        if (isMagnetizable && !p.magnetized && distSq < magnetR * magnetR) {
            p.magnetized = true;
        }

        // Movement towards player
        if (p.magnetized) {
            const currentAngle = Math.atan2(dy, dx);
            let currentDist = Math.sqrt(distSq);
            const approachSpeed = 6 + player.speed + (200 / (currentDist + 10));
            currentDist -= approachSpeed;
            const rotDir = p.rotationDir || 1;
            const spinSpeed = 0.05 + (15 / (currentDist + 50));
            const newAngle = currentAngle + (rotDir * spinSpeed);

            if (currentDist < 0) currentDist = 0;
            p.pos.x = player.pos.x + Math.cos(newAngle) * currentDist;
            p.pos.y = player.pos.y + Math.sin(newAngle) * currentDist;
            distSq = currentDist * currentDist;
        }

        // Collection Logic
        // Increased pickup radius substantially (2.25x) to prevent "must hit center" feeling for normal items
        let pickupRadius = (player.radius + p.radius) * 2.25;
        
        // SPECIAL CASE: Mission Zones (Data Upload)
        // User Request: "player should reach the center of the zone, not just the outside"
        // We enforce a tighter radius for these specific pickups so player must enter the visual center.
        if (p.kind === 'MISSION_ZONE') {
            pickupRadius = 40; // Visual radius is ~100, this ensures player is well inside
        }

        if (distSq < pickupRadius * pickupRadius) {
            p.markedForDeletion = true;
            collected.push(p);
            
            // Apply immediate effects here if not handled in useGameEngine
            // Specifically handling Kaleidoscope timer set here for simplicity or
            // keep it consistent with other pickups in useGameEngine? 
            // useGameEngine handles most logic. I'll let useGameEngine handle it.
        }
    });

    return { collected };
};
