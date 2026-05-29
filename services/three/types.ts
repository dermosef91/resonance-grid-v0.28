import {
    Player, Enemy, Projectile, Pickup, TextParticle, VisualParticle,
    MissionEntity, Shockwave, Replica, Obstacle, ColorPalette,
} from '../../types';

// Single typed bundle handed to ThreeRenderer.render() each frame. Carries
// exactly the state the legacy renderGame() receives (which lives entirely in
// the game-loop refs), so swapping renderers is purely a rendering concern —
// no game logic moves. See hooks/useGameEngine.ts.
export interface RenderFrame {
    viewW: number;          // logical (CSS px) viewport width
    viewH: number;          // logical (CSS px) viewport height
    dpr: number;            // device pixel ratio (capped at 2 upstream)
    camera: { x: number; y: number }; // legacy top-left world camera (3D follows player directly)
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    pickups: Pickup[];
    particles: (TextParticle | VisualParticle)[];
    missionEntities: MissionEntity[];
    replicas: Replica[];
    obstacles: Obstacle[];
    shockwaves: Shockwave[];
    frame: number;          // monotonically increasing fixed-step frame counter
    screenShake: number;    // trauma counter (decremented in update)
    palette: ColorPalette;  // active biome colours
    isFrozen: boolean;
    waveId: number;         // 1-based current wave
}
