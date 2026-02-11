
export const BPM = 132;
export const SECONDS_PER_BEAT = 60.0 / BPM;
export const SCHEDULE_AHEAD_TIME = 0.2; 
export const LOOKAHEAD_MS = 100.0; 

// E, G, A, D (Hz) - Base Roots
export const ROOT_FREQS = [329.63, 392.00, 440.00, 293.66];

// SCALES (Frequency Multipliers)
export const SCALES = {
    PENTATONIC: [1.0, 1.2, 1.5, 1.6, 2.0],
    DORIAN: [1.0, 1.12, 1.2, 1.33, 1.5, 1.68, 1.78, 2.0],
    PHRYGIAN: [1.0, 1.06, 1.2, 1.33, 1.5, 1.6, 1.78, 2.0], // Dark, tension
    MAJOR: [1.0, 1.125, 1.25, 1.333, 1.5, 1.666, 1.875, 2.0], // Bright
    CHORD_TONES: [1.0, 1.25, 1.5, 2.0] // Root, 3rd, 5th, Octave
};

export type AudioProfile = 'INDUSTRIAL' | 'TRIBAL';

export type MusicTheme = 
    'DEEP_CIRCUIT' | 
    'SUB_TERRA' | 
    'CIRCUIT_BREAKER' | 
    'LOGIC_GATE' |      
    'ETHEREAL_VOYAGE' |      
    'MIND_FLAYER' |     
    'GLITCH_STORM' | 
    'SOLAR_PLAINS';

export interface WeaponMix {
  spiritLance: number;
  drumEcho: number;
  voidAura: number;
  naniteSwarm: number;
  solarChakram: number;
  cyberKora: number;
  ancestralResonance: number;
  voidWake: number;
  paradoxPendulum: number;
  kaleidoscopeGaze: number;
  fractalBloom: number;
}
