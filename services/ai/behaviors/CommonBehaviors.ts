
import { Enemy, Player, EnemyType } from '../../../types';
import { IEnemyBehavior, AIResult, AIContext } from '../types';
import { createEmptyResult } from '../utils';

export class DefaultBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const angle = Math.atan2(dy, dx);
        
        enemy.rotation = angle;
        return {
            ...createEmptyResult(),
            velocity: { x: Math.cos(angle) * enemy.speed, y: Math.sin(angle) * enemy.speed }
        };
    }
}

export class OrbitalBehavior implements IEnemyBehavior {
    update(enemy: Enemy, player: Player): AIResult {
        const result = createEmptyResult();
        const t = Date.now() / 1000;
        const phase = enemy.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100 * 0.06;
        
        let orbitRad = 350; 
        let orbitSpeed = 0.5;

        if (enemy.enemyType === EnemyType.INFERNO_SPINNER) {
             orbitRad = 200;
             orbitSpeed = 1.0;
        } else if (enemy.enemyType === EnemyType.SWARMER) {
             orbitRad = 50; 
             orbitSpeed = 2.0; 
        }
        
        const targetX = player.pos.x + Math.cos(t * orbitSpeed + phase) * orbitRad;
        const targetY = player.pos.y + Math.sin(t * orbitSpeed + phase) * orbitRad;
        
        const dxOrb = targetX - enemy.pos.x;
        const dyOrb = targetY - enemy.pos.y;
        const angleOrb = Math.atan2(dyOrb, dxOrb);
        
        result.velocity = { x: Math.cos(angleOrb) * enemy.speed, y: Math.sin(angleOrb) * enemy.speed };
        
        // Face movement direction
        enemy.rotation = angleOrb;
        
        // Binary Sentinel Specific Internal Mechanics
        if (enemy.enemyType === EnemyType.BINARY_SENTINEL && enemy.binaryData) {
            enemy.binaryData.angle += 0.03;
            const driftSpeed = 2.0; // Increased expansion speed for visible effect
            enemy.binaryData.separation += enemy.binaryData.separationDir * driftSpeed;
            
            const MIN_SEP = 60;
            const MAX_SEP = 600; // Reasonable max width for screen
            
            if (enemy.binaryData.separation > MAX_SEP) {
                enemy.binaryData.separation = MAX_SEP;
                enemy.binaryData.separationDir = -1;
            } else if (enemy.binaryData.separation < MIN_SEP) {
                enemy.binaryData.separation = MIN_SEP;
                enemy.binaryData.separationDir = 1;
            }
            // Update radius effectively for collision checks
            enemy.radius = (enemy.binaryData.separation / 2) + enemy.binaryData.nodeRadius;
        }
        
        return result;
    }
}
