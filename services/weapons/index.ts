
import { WeaponBehavior } from './weaponTypes';
import { handleProjectile, handleCone, handleHoming } from './behaviors/standard';
import { handleOrbital, handleAura, handleShockwave, handleRhythmWave } from './behaviors/area';
import { handleBeam, handleBoomerang, handleChain, handleTrail, handleParadoxPendulum, handleFractal } from './behaviors/special';
import { handleKaleidoscope } from './behaviors/kaleidoscope';

export const WeaponStrategies: Record<string, WeaponBehavior> = {
    'PROJECTILE': handleProjectile,
    'CONE': handleCone,
    'HOMING': handleHoming,
    'ORBITAL': handleOrbital,
    'AURA': handleAura,
    'SHOCKWAVE': handleShockwave,
    'BEAM': handleBeam,
    'BOOMERANG': handleBoomerang,
    'CHAIN': handleChain,
    'TRAIL': handleTrail,
    'RHYTHM_WAVE': handleRhythmWave,
    'PARADOX': handleParadoxPendulum,
    'KALEIDOSCOPE': handleKaleidoscope,
    'FRACTAL': handleFractal
};
