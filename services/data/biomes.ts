
import { ColorPalette } from '../../types';

// --- Biome Color Palettes ---
export const BIOMES: Record<string, ColorPalette> = {
    DEFAULT: {
        background: '#050505',
        grid: '#ff6600', // Orange
        nebulaPrimary: '#40003c',
        nebulaSecondary: '#3c1400',
        landscape: {
            noiseScaleX: 0.002,
            noiseScaleY: 0.002,
            amplitude: 80,
            sharpness: 2.5,
            digitalFactor: 0
        }
    },
    BOSS: {
        background: '#1a0505',
        grid: '#ff0000', // Red
        nebulaPrimary: '#400000',
        nebulaSecondary: '#200000',
        landscape: {
            noiseScaleX: 0.005,
            noiseScaleY: 0.001,
            amplitude: 150,
            sharpness: 4.0, // Very spiky
            digitalFactor: 0
        }
    },
    TECH: {
        background: '#00050a',
        grid: '#00ffff', // Cyan
        nebulaPrimary: '#002030',
        nebulaSecondary: '#004040',
        landscape: {
            noiseScaleX: 0.01,
            noiseScaleY: 0.001,
            amplitude: 60,
            sharpness: 1.0,
            digitalFactor: 1.0 // Fully blocked/stepped
        }
    },
    VOID: {
        background: '#0a000a',
        grid: '#b400ff', // Purple
        nebulaPrimary: '#300040',
        nebulaSecondary: '#100020',
        landscape: {
            noiseScaleX: 0.001, // Very long waves
            noiseScaleY: 0.005,
            amplitude: 120,
            sharpness: 1.5,
            digitalFactor: 0
        }
    },
    TOXIC: {
        background: '#000a00',
        grid: '#00ff00', // Green
        nebulaPrimary: '#004000',
        nebulaSecondary: '#204000',
        landscape: {
            noiseScaleX: 0.008,
            noiseScaleY: 0.008,
            amplitude: 50,
            sharpness: 1.0, // Round bubbles
            digitalFactor: 0.2
        }
    },
    GOLD: {
        background: '#1a1200',
        grid: '#FFD700', // Gold
        nebulaPrimary: '#403000',
        nebulaSecondary: '#604000',
        landscape: {
            noiseScaleX: 0.003,
            noiseScaleY: 0.001,
            amplitude: 100,
            sharpness: 3.0, // Sharp pyramids
            digitalFactor: 0
        }
    }
};

export const getWavePalette = (waveId: number): ColorPalette => {
    // Boss Waves
    if ([6, 12, 15, 20].includes(waveId)) {
        if (waveId === 15) return BIOMES.VOID; // Hive Mind Theme
        if (waveId === 20) return BIOMES.GOLD; // Aido Hwedo Theme
        return BIOMES.BOSS;
    }

    // Tech Waves (Fast/Robots)
    if ([5, 9, 10, 11].includes(waveId)) return BIOMES.TECH;

    // Void Waves (Swarms/Ghosts/Magic)
    if ([7, 8, 13, 14, 18, 19].includes(waveId)) return BIOMES.VOID;

    // Toxic/Chaos Waves
    if ([16, 17].includes(waveId)) return BIOMES.TOXIC;

    // Default (1-4) and unhandled
    return BIOMES.DEFAULT;
};
