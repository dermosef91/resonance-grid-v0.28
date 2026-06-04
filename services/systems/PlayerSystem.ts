
import { Player, Vector2, MissionType } from '../../types';
import { PLAYER_BASE_STATS, DASH } from '../../constants';
import { graphicsSettings } from '../graphicsSettings';

export const updatePlayer = (
    player: Player,
    inputVector: Vector2,
    frame: number,
    activeMissionType?: MissionType,
    dashInput?: { requested: boolean; mobileDir: Vector2 | null }
) => {
    // Decrement pulse timers
    if (player.healthPulseTimer > 0) player.healthPulseTimer--;
    if (player.xpPulseTimer > 0) player.xpPulseTimer--;
    if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer--;

    // Power-up timers
    if (player.kaleidoscopeTimer > 0) player.kaleidoscopeTimer--;

    // Dash timers
    if (player.dashTimer > 0) {
        player.dashTimer--;
        if (player.dashTimer === 0) player.dashCooldown = DASH.COOLDOWN;
    }
    if (player.dashCooldown > 0) player.dashCooldown--;

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

    // 3. Dash activation (feature-flagged)
    if (graphicsSettings.dashEnabled && dashInput?.requested && player.dashCooldown <= 0 && player.dashTimer <= 0) {
        let dir: Vector2;
        if (dashInput.mobileDir) {
            dir = dashInput.mobileDir;
        } else if (inputVector.x !== 0 || inputVector.y !== 0) {
            dir = inputVector;
        } else {
            dir = { x: Math.cos(player.rotation), y: Math.sin(player.rotation) };
        }
        player.dashDir = dir;
        player.dashTimer = DASH.DURATION;
        player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, DASH.DURATION + 8);
        player.velocity.x = dir.x * player.speed * speedMod * DASH.SPEED_MULT;
        player.velocity.y = dir.y * player.speed * speedMod * DASH.SPEED_MULT;
    }

    // 4. Movement & Physics
    const ACCEL = 2.0;
    const FRICTION = 0.88;
    const STOP_THRESHOLD = 0.1;

    if (player.dashTimer > 0) {
        // Dash active: hold fixed velocity, bypass friction and cap
        player.velocity.x = player.dashDir.x * player.speed * speedMod * DASH.SPEED_MULT;
        player.velocity.y = player.dashDir.y * player.speed * speedMod * DASH.SPEED_MULT;
        player.rotation = Math.atan2(player.dashDir.y, player.dashDir.x);
    } else {
        // Normal movement
        if (inputVector.x !== 0 || inputVector.y !== 0) {
            player.velocity.x += inputVector.x * ACCEL;
            player.velocity.y += inputVector.y * ACCEL;

            const targetRotation = Math.atan2(inputVector.y, inputVector.x);
            let diff = targetRotation - player.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            player.rotation += diff * 0.15;
        }

        player.velocity.x *= FRICTION;
        player.velocity.y *= FRICTION;

        const currentSpeedSq = player.velocity.x ** 2 + player.velocity.y ** 2;
        const maxSpeed = player.speed * speedMod;
        const maxSpeedSq = maxSpeed * maxSpeed;

        if (currentSpeedSq > maxSpeedSq) {
            const scale = maxSpeed / Math.sqrt(currentSpeedSq);
            player.velocity.x *= scale;
            player.velocity.y *= scale;
        }

        if (currentSpeedSq < STOP_THRESHOLD * STOP_THRESHOLD) {
            player.velocity.x = 0;
            player.velocity.y = 0;
        }
    }

    // Apply Velocity to Position
    player.pos.x += player.velocity.x;
    player.pos.y += player.velocity.y;

    // Accumulate distance for animations
    player.distanceTraveled += Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);

    // 5. Update Position History (Time Slip)
    if (!player.positionHistory) player.positionHistory = [];
    player.positionHistory.push({ ...player.pos });
    if (player.positionHistory.length > 120) {
        player.positionHistory.shift();
    }
};
