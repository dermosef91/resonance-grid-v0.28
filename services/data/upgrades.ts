
import { UpgradeOption, PermanentUpgrade, Player, EnemyType } from '../../types';
import { PLAYER_BASE_STATS } from '../../constants';

export const BASE_ARTIFACTS: Record<string, UpgradeOption> = {
    harmonic_tuner: { id: 'harmonic_tuner', name: 'Harmonic Tuner', description: '20% increased projectile/aura radius and +10% Speed on all weapons.', type: 'ARTIFACT', rarity: 'RARE', color: '#ff00ff', apply: (p) => { p.artifacts.push('harmonic_tuner'); p.stats.areaMult += 0.2; p.stats.speedMult += 0.1; p.speed = PLAYER_BASE_STATS.speed * p.stats.speedMult; } },
    data_siphon: { id: 'data_siphon', name: 'Data Siphon', description: 'Gain 20% more XP from all sources.', type: 'ARTIFACT', rarity: 'RARE', color: '#00ffaa', apply: (p) => { p.artifacts.push('data_siphon'); p.stats.xpMult += 0.2; } },
    attractor_field: { id: 'attractor_field', name: 'Attractor Field', description: 'Increase item pickup range by 50%.', type: 'ARTIFACT', rarity: 'UNCOMMON', color: '#00ccff', apply: (p) => { p.artifacts.push('attractor_field'); p.stats.magnetMult += 0.5; p.magnetRadius = PLAYER_BASE_STATS.magnetRadius * p.stats.magnetMult; } },

    ancestral_focus: {
        id: 'ancestral_focus', name: 'Ancestral Focus', description: '+1 Projectile Amount on all weapons.', type: 'ARTIFACT', rarity: 'LEGENDARY', color: '#ffffff', apply: (p) => { p.artifacts.push('ancestral_focus'); p.stats.projectileCountFlat += 1; },
        unlockCost: 500, unlockReq: { type: 'WAVE', value: 20 }
    },
    titan_frame: { id: 'titan_frame', name: 'Titan Frame', description: '+50% Max Health.', type: 'ARTIFACT', rarity: 'UNCOMMON', color: '#888888', apply: (p) => { p.artifacts.push('titan_frame'); p.maxHealth *= 1.5; p.health += 50; } }
};

export const GLITCH_UPGRADES: UpgradeOption[] = [
    { id: 'glitch_overclock', name: 'OVERCLOCK.EXE', description: 'CORRUPTION: 40% increased firing frequency on all weapons, -30% Max Health.', type: 'GLITCH', rarity: 'GLITCH', apply: (p) => { p.stats.cooldownMult *= 0.6; p.maxHealth *= 0.7; p.health = Math.min(p.health, p.maxHealth); } },
    { id: 'glitch_berserk', name: 'BERSERK_PROTOCOL', description: 'CORRUPTION: +100% Damage on all weapons, Take +50% Damage.', type: 'GLITCH', rarity: 'GLITCH', apply: (p) => { p.stats.damageMult += 1.0; p.maxHealth *= 0.5; p.health = Math.min(p.health, p.maxHealth); } },
    { id: 'glitch_void', name: 'VOID_LEAK', description: 'CORRUPTION: 200% increased projectile/aura radius on all weapons, -50% Duration.', type: 'GLITCH', rarity: 'GLITCH', apply: (p) => { p.stats.areaMult += 2.0; p.weapons.forEach(w => w.duration = Math.max(10, w.duration * 0.5)); } }
];

// --- Permanent Modifications (Meta Progression) ---
export const PERMANENT_UPGRADES: PermanentUpgrade[] = [
    {
        id: 'perm_neural_fortitude', name: 'Neural Fortitude', description: '+10% Max Health per rank.',
        costPerLevel: 100, maxLevel: 4,
        apply: (p, l) => { p.maxHealth *= Math.pow(1.10, l); p.health = p.maxHealth; }
    },
    {
        id: 'perm_plasma_output', name: 'Plasma Output', description: '+10% Damage per rank.',
        costPerLevel: 150, maxLevel: 4,
        apply: (p, l) => { p.stats.damageMult *= Math.pow(1.10, l); }
    },
    {
        id: 'perm_flux_engine', name: 'Flux Engine', description: '+10% Movement Speed per rank.',
        costPerLevel: 75, maxLevel: 4,
        apply: (p, l) => { p.stats.speedMult *= Math.pow(1.10, l); p.speed = PLAYER_BASE_STATS.speed * p.stats.speedMult; }
    },
    {
        id: 'perm_void_expander', name: 'Void Expander', description: '+10% Area radius per rank.',
        costPerLevel: 125, maxLevel: 4,
        apply: (p, l) => { p.stats.areaMult *= Math.pow(1.10, l); }
    },
    {
        id: 'perm_chronos_regulator', name: 'Chronos Regulator', description: '-5% Cooldown per rank.',
        costPerLevel: 175, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 8 },
        apply: (p, l) => { p.stats.cooldownMult *= Math.pow(0.95, l); }
    },
    {
        id: 'perm_gravity_well', name: 'Gravity Well', description: '+10% Magnet Range per rank.',
        costPerLevel: 50, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 8 },
        apply: (p, l) => { p.stats.magnetMult *= Math.pow(1.10, l); p.magnetRadius = PLAYER_BASE_STATS.magnetRadius * p.stats.magnetMult; }
    },
    {
        id: 'perm_data_mining', name: 'Data Mining', description: '+10% XP Gain per rank.',
        costPerLevel: 200, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 10 },
        apply: (p, l) => { p.stats.xpMult *= Math.pow(1.10, l); }
    },
    {
        id: 'perm_crypto_mining', name: 'Crypto Mining', description: '+10% Chip Gain per rank.',
        costPerLevel: 200, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 10 },
        apply: (p, l) => { p.stats.currencyMult *= Math.pow(1.10, l); }
    },
    {
        id: 'perm_nano_weave', name: 'Nano-Weave Armor', description: '-2 Damage taken per rank.',
        costPerLevel: 250, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 15 },
        apply: (p, l) => { p.stats.armor += (2 * l); }
    },
    {
        id: 'perm_biosynthesis', name: 'Biosynthesis', description: '+2 HP Regen / 5 sec per rank.',
        costPerLevel: 300, maxLevel: 4,
        unlockReq: { type: 'WAVE', value: 15 },
        apply: (p, l) => { p.stats.regen += (0.4 * l); } // 0.4 per sec = 2 per 5 sec
    },
    {
        id: 'perm_backup_matrix', name: 'Backup Matrix', description: 'Grants +1 Extra Life per run.',
        costPerLevel: 5000, maxLevel: 1,
        unlockReq: { type: 'WAVE', value: 15 },
        apply: (p, l) => { p.extraLives += (1 * l); }
    }
];
