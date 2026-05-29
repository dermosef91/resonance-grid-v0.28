import { POST_FX_ENABLED } from '../constants';

// Runtime-toggleable graphics settings. Mirrors the mutable `audioEngine`
// singleton pattern: render code reads these live each frame and the debug
// menu flips them in place, so changes take effect immediately (even while
// paused, since the render loop keeps drawing).
//
// Seeded from the compile-time defaults so behaviour matches a fresh build
// until the player overrides something.
export const graphicsSettings = {
    // Active renderer. '3D' = the real Three.js scene (perspective camera, meshes,
    // lighting, UnrealBloom). '2D' = the legacy Canvas 2D neon renderer, kept as a
    // live A/B fallback. Read every frame by the game loop.
    renderer: '3D' as '2D' | '3D',
    postFx: POST_FX_ENABLED,  // WebGL post layer: highlight bloom, grade, CRT, glitch, freeze, flash
    bloom: true,              // Canvas 2D additive bright-pass bloom
    screenShake: true,        // Trauma-style directional screen shake
    damageFlash: true,        // Red radial flash when the player takes damage
    hiDpi: true,              // Render at devicePixelRatio for crisp HiDPI output
};

export type GraphicsSettingKey = keyof typeof graphicsSettings;
// Keys that are simple on/off booleans (everything except the renderer selector).
export type GraphicsToggleKey = Exclude<GraphicsSettingKey, 'renderer'>;
