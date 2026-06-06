import { GraphicsQuality, GRAPHICS_QUALITY } from '../constants';
import { setNeonQuality } from './renderers/neonRender';
import { graphicsSettings } from './graphicsSettings';

// Adaptive quality controller.
//
// The renderer's two biggest, load-sensitive costs are the neon kit's HIGH-quality
// multi-pass strokes/gradients (driven by setNeonQuality) and the full-screen
// canvas bloom pass (graphicsSettings.bloom). When the frame budget is blown
// under heavy load this controller sheds those automatically, then restores them
// when there's headroom again — so the game degrades gracefully instead of
// stuttering. It owns those two settings while `enabled`; the DebugMenu can pin a
// manual level via forceQualityLevel().

interface QualityLevel { neon: GraphicsQuality; bloom: boolean; }

// Level 0 is the prettiest; higher levels are cheaper.
const LEVELS: QualityLevel[] = [
    { neon: 'HIGH', bloom: true },
    { neon: 'HIGH', bloom: false },
    { neon: 'LOW', bloom: false },
];

const SEED_MS = 1000 / 60;   // assume 60fps until we measure otherwise
const DOWN_MS = 22;          // sustained avg above this (~<45fps) -> step down
const UP_MS = 14.5;          // sustained avg below this (~>69fps) -> step up
const DOWN_SUSTAIN = 45;     // ~0.75s of bad frames before dropping quality
const UP_SUSTAIN = 180;      // ~3s of good frames before raising (slow, anti-flap)

export const adaptiveQuality = {
    enabled: true,                                       // DebugMenu can disable
    level: GRAPHICS_QUALITY === 'HIGH' ? 0 : LEVELS.length - 1,
    avgMs: SEED_MS,
    badFrames: 0,
    goodFrames: 0,
    get maxLevel() { return LEVELS.length - 1; },
};

const apply = (level: number) => {
    const l = LEVELS[level];
    setNeonQuality(l.neon);
    graphicsSettings.bloom = l.bloom;
};

// Push the current level into the render settings. Call once at startup.
export const initAdaptiveQuality = () => apply(adaptiveQuality.level);

// Force a specific level and stop auto-adjusting (DebugMenu override).
export const forceQualityLevel = (level: number) => {
    adaptiveQuality.enabled = false;
    adaptiveQuality.level = Math.max(0, Math.min(adaptiveQuality.maxLevel, level));
    apply(adaptiveQuality.level);
};

export const setAdaptiveQualityEnabled = (enabled: boolean) => {
    adaptiveQuality.enabled = enabled;
};

// Feed one rendered frame's wall-clock delta (ms). Cheap; safe to call every frame.
export const sampleFrame = (deltaMs: number) => {
    if (!adaptiveQuality.enabled) return;

    // Clamp pathological spikes (tab switch, GC pause) so they don't whipsaw quality.
    const d = deltaMs > 100 ? 100 : deltaMs;
    adaptiveQuality.avgMs += (d - adaptiveQuality.avgMs) * 0.1;
    const avg = adaptiveQuality.avgMs;

    if (avg > DOWN_MS && adaptiveQuality.level < adaptiveQuality.maxLevel) {
        adaptiveQuality.badFrames++;
        adaptiveQuality.goodFrames = 0;
        if (adaptiveQuality.badFrames >= DOWN_SUSTAIN) {
            adaptiveQuality.level++;
            apply(adaptiveQuality.level);
            adaptiveQuality.badFrames = 0;
            adaptiveQuality.avgMs = SEED_MS; // re-measure after the change
        }
    } else if (avg < UP_MS && adaptiveQuality.level > 0) {
        adaptiveQuality.goodFrames++;
        adaptiveQuality.badFrames = 0;
        if (adaptiveQuality.goodFrames >= UP_SUSTAIN) {
            adaptiveQuality.level--;
            apply(adaptiveQuality.level);
            adaptiveQuality.goodFrames = 0;
            adaptiveQuality.avgMs = SEED_MS;
        }
    } else {
        adaptiveQuality.badFrames = 0;
        adaptiveQuality.goodFrames = 0;
    }
};
