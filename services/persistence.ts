
import { MetaState, EnemyType } from '../types';

const STORAGE_KEY = 'resonance_grid_meta_v1';

const DEFAULT_STATE: MetaState = {
  currency: 0,
  runsCompleted: 0,
  bossesDefeated: [],
  unlockedItems: [
    // Default Unlocked Items (Weapons)
    'spirit_lance',
    'void_aura',
    'cyber_kora',
    // Default Unlocked Items (Artifacts)
    'harmonic_tuner',
    'data_siphon',
    'attractor_field',

    'titan_frame'
  ],
  permanentUpgrades: {},
  maxWaveCompleted: 0,
  personalBests: {
    maxKills: 0,
    maxDamage: 0,
    maxChips: 0
  },
  seenItems: [
    'spirit_lance',
    'void_aura',
    'cyber_kora',
    'harmonic_tuner',
    'data_siphon',
    'attractor_field',
    'titan_frame'
  ]
};

export const loadMetaState = (): MetaState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with default to handle schema updates/new default unlocks
      const savedUnlocks = new Set(parsed.unlockedItems || []);
      const defaultUnlocks = new Set(DEFAULT_STATE.unlockedItems);
      // Union of saved and currently default
      const combined = [...new Set([...savedUnlocks, ...defaultUnlocks])];

      return {
        ...DEFAULT_STATE,
        ...parsed,
        unlockedItems: combined,
        // Ensure nested objects are merged correctly if missing in saved
        personalBests: { ...DEFAULT_STATE.personalBests, ...(parsed.personalBests || {}) },
        seenItems: parsed.seenItems || DEFAULT_STATE.seenItems
      };
    }
  } catch (e) {
    console.warn("Failed to load meta state, using default", e);
  }
  return DEFAULT_STATE;
};

export const saveMetaState = (state: MetaState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save meta state", e);
  }
};

export const resetMetaState = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};
