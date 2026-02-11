
import { Player, Vector2, MissionType } from '../../types';
import { PLAYER_BASE_STATS } from '../../constants';

export const updatePlayer = (
    player: Player,
    inputVector: Vector2,
    frame: number,
    activeMissionType?: MissionType
) => {
    // Decrement pulse timers
    if (player.healthPulseTimer > 0) player.healthPulseTimer--;
    if (player.xpPulseTimer > 0) player.xpPulseTimer--;
    if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer--;
    
    // Power-up timers
    if (player.kaleidoscopeTimer > 0) player.kaleidoscopeTimer--;

    // 1. Regen
    if (player.stats.regen > 0 && frame % 40 === 0) {
        const oldHealth = player.health;
        player.health = Math.min(player.maxHealth, player.health + player.stats.regen);
        if (player.health > oldHealth) player.healthPulseTimer = 5; // Subtle pulse for regen
    }

    // 2. Modifiers based on Mission
    let speedMod = 1.0;
    if (activeMissionType === MissionType.SHADOW_STEP) {
        speedMod = 1.2; // +20% Speed
    }

    // 3. Movement & Physics (Inertial)
    const ACCEL = 2.0; // Acceleration force per frame
    const FRICTION = 0.88; // Velocity retention per frame (0-1)
    const STOP_THRESHOLD = 0.1; // Speed below which we stop completely

    // Apply Input as Acceleration
    if (inputVector.x !== 0 || inputVector.y !== 0) {
        player.velocity.x += inputVector.x * ACCEL;
        player.velocity.y += inputVector.y * ACCEL;
        
        // Rotation: Face input direction immediately for responsive feel
        const targetRotation = Math.atan2(inputVector.y, inputVector.x);
        let diff = targetRotation - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        player.rotation += diff * 0.15; // Slightly faster turn speed
    }

    // Apply Friction
    player.velocity.x *= FRICTION;
    player.velocity.y *= FRICTION;

    // Cap Speed
    const currentSpeedSq = player.velocity.x ** 2 + player.velocity.y ** 2;
    const maxSpeed = player.speed * speedMod;
    const maxSpeedSq = maxSpeed * maxSpeed;
    
    if (currentSpeedSq > maxSpeedSq) {
        const scale = maxSpeed / Math.sqrt(currentSpeedSq);
        player.velocity.x *= scale;
        player.velocity.y *= scale;
    }

    // Stop completely if negligible (prevents jitter)
    if (currentSpeedSq < STOP_THRESHOLD * STOP_THRESHOLD) {
        player.velocity.x = 0;
        player.velocity.y = 0;
    }

    // Apply Velocity to Position
    player.pos.x += player.velocity.x;
    player.pos.y += player.velocity.y;
    
    // Accumulate distance for animations
    player.distanceTraveled += Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
    
    // 4. Update Position History (Time Slip)
    if (!player.positionHistory) player.positionHistory = [];
    player.positionHistory.push({ ...player.pos });
    if (player.positionHistory.length > 120) { // Keep last 2 seconds (60fps)
        player.positionHistory.shift();
    }
};
