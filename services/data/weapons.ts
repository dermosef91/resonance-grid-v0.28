
import { Weapon, EnemyType, AugmentDef } from '../../types';

// --- Definitions ---
// Cooldowns / 1.5, Speeds * 1.5, Durations / 1.5
export const BASE_WEAPONS: Record<string, Weapon> = {
  // Syncing to music: Set cooldown to 0 to let behavior handle timing
  spirit_lance: { id: 'spirit_lance', name: 'Spirit Lance', description: 'Shoots bolts of energy towards nearby enemies.', cooldown: 0, currentCooldown: 0, damage: 20, level: 1, type: 'PROJECTILE', count: 1, pierce: 1, duration: 80, area: 1, speed: 12, color: '#ffffff' },
  
  cyber_kora: { id: 'cyber_kora', name: 'Cyber Kora', description: 'Sonic wave spread.', cooldown: 0, currentCooldown: 0, damage: 15, level: 1, type: 'CONE', count: 3, pierce: 2, duration: 80, area: 1, speed: 10.5, color: '#00FFFF' },
  
  void_aura: { id: 'void_aura', name: 'Void Aura', description: 'Emits a void shockwave synced to the beat.', cooldown: 0, currentCooldown: 0, damage: 20, level: 1, type: 'RHYTHM_WAVE', count: 1, pierce: 999, duration: 15, area: 0.65, speed: 0, color: '#9900FF' },
  
  nanite_swarm: { 
      id: 'nanite_swarm', name: 'Nanite Swarm', description: 'Autonomous drones, locking onto enemies.', cooldown: 46, currentCooldown: 0, damage: 15, level: 1, type: 'HOMING', count: 1, pierce: 1, duration: 120, area: 1, speed: 12, color: '#00FF00',
      unlockCost: 75, unlockReq: { type: 'NONE', value: 0 }
  },
  
  solar_chakram: { 
      id: 'solar_chakram', name: 'Solar Chakram', description: 'Boomerang disc that returns to you.', cooldown: 46, currentCooldown: 0, damage: 18, level: 1, type: 'BOOMERANG', count: 1, pierce: 999, duration: 133, area: 1, speed: 10.5, color: '#FFD700',
      unlockCost: 175, unlockReq: { type: 'WAVE', value: 5 }
  },
  
  void_wake: {
      id: 'void_wake', name: 'Void Trail', description: 'Leave a trail of damaging dark matter as you move.', cooldown: 10, currentCooldown: 0, damage: 8, level: 1, type: 'TRAIL', count: 1, pierce: 999, duration: 180, area: 1, speed: 0, color: '#FF00FF',
      unlockCost: 325, unlockReq: { type: 'WAVE', value: 8 }
  },
  
  drum_echo: { 
      id: 'drum_echo', name: 'Orbital drums', description: 'Drum satellites orbit and protect you.', cooldown: 0, currentCooldown: 0, damage: 7.5, level: 1, type: 'ORBITAL', count: 2, pierce: 999, duration: 5, area: 1, speed: 0, color: '#FFD700',
      unlockCost: 450, unlockReq: { type: 'WAVE', value: 10 }
  },

  paradox_pendulum: {
      id: 'paradox_pendulum', name: 'Paradox Pendulum', description: 'Swings through time, hitting enemies on forward and rewind arcs.', cooldown: 0, currentCooldown: 0, damage: 30, level: 1, type: 'PARADOX', count: 1, pierce: 999, duration: 20, area: 1, speed: 0, color: '#FFD700',
      unlockCost: 600, unlockReq: { type: 'WAVE', value: 12 }
  },

  kaleidoscope_gaze: {
      id: 'kaleidoscope_gaze', name: 'Kaleidoscope Gaze', description: 'Fires a white beam that splits into RGB lasers on impact.', cooldown: 60, currentCooldown: 0, damage: 25, level: 1, type: 'KALEIDOSCOPE', count: 1, pierce: 0, duration: 100, area: 1, speed: 20, color: '#FFFFFF',
      unlockCost: 750, unlockReq: { type: 'WAVE', value: 18 }
  },
  
  fractal_bloom: {
      id: 'fractal_bloom', name: 'Fractal Bloom', description: 'Drops a recursive anomaly that damages enemies in a swirling pattern.', cooldown: 180, currentCooldown: 0, damage: 15, level: 1, type: 'FRACTAL', count: 1, pierce: 999, duration: 180, area: 1, speed: 0, color: '#00FFFF',
      unlockCost: 1000, unlockReq: { type: 'WAVE', value: 15 }
  },

  ancestral_resonance: { 
      id: 'ancestral_resonance', name: 'Ancestral Resonance', description: 'Create a blast wave around you. Hit enemies reap further havoco.', cooldown: 120, currentCooldown: 0, damage: 100, level: 1, type: 'SHOCKWAVE', count: 1, pierce: 999, duration: 20, area: 1, speed: 0, color: '#00FF00', // Changed to Green
      unlockCost: 2000, unlockReq: { type: 'WAVE', value: 20 }
  }
};

export const WEAPON_AUGMENTS: Record<string, [AugmentDef, AugmentDef]> = {
    spirit_lance: [
        { id: 'VOLTAIC_ARC', name: 'Voltaic Arc', description: 'Projectiles bounce to nearby enemies as chain lightning.', color: '#00ccff' },
        { id: 'PHASE_DRILL', name: 'Phase Drill', description: 'Infinite Pierce, massive size, but slower projectile speed.', color: '#aa00ff' }
    ],
    cyber_kora: [
        { id: 'RESONANT_FEEDBACK', name: 'Resonant Feedback', description: 'Enemies hit by the wave trigger explosive sparks.', color: '#FF4500' },
        { id: 'SONIC_WALL', name: 'Sonic Wall', description: 'Waves linger as stationary shields with high knockback.', color: '#00FFFF' }
    ],
    void_aura: [
        { id: 'SUPERNOVA', name: 'Supernova', description: 'Expand base radius by 50% and pulsing size.', color: '#FF00FF' },
        { id: 'ENTROPY_FIELD', name: 'Entropy Field', description: 'Increase enemy knockback by 100% and damage by 50%.', color: '#0000FF' }
    ],
    nanite_swarm: [
        { id: 'HUNTER_PROTOCOL', name: 'Hunter Protocol', description: 'Drones prioritize High HP targets (Boss/Elite Killer).', color: '#FF0000' },
        { id: 'HIVE_SHIELD', name: 'Hive Shield', description: 'Drones form a tight defensive barrier around you.', color: '#00FF00' }
    ],
    solar_chakram: [
        { id: 'ORBITAL_LOCK', name: 'Orbital Lock', description: 'Chakrams never return; they orbit at max range indefinitely.', color: '#FFD700' },
        { id: 'FRACTAL_SPLIT', name: 'Fractal Split', description: 'Splits into 3 mini-chakrams at apex of flight.', color: '#FFAA00' }
    ],
    void_wake: [
        { id: 'UNSTABLE_GROUND', name: 'Unstable Ground', description: 'Trail segments explode when they expire.', color: '#FF0055' },
        { id: 'SHADOW_STEP', name: 'Shadow Step', description: 'Walking on your trail grants Speed and Evasion.', color: '#FFFFFF' }
    ],
    drum_echo: [
        { id: 'BASS_DROP', name: 'Bass Drop', description: 'Drums slam inward periodically, causing massive area damage.', color: '#FF4400' },
        { id: 'SOLAR_FLARE', name: 'Solar Flares', description: 'Drums emit searing solar bolts at nearby enemies.', color: '#FFFF00' }
    ],
    ancestral_resonance: [
        { id: 'CHRONO_STUTTER', name: 'Chrono-Stutter', description: 'Blast freezes enemies in time for 4 seconds.', color: '#00FFFF' },
        { id: 'AFTERSHOCK', name: 'Aftershock', description: 'Triggers 2 echo waves after the main blast.', color: '#00FF00' }
    ],
    paradox_pendulum: [
        { id: 'QUANTUM_ECHO', name: 'Quantum Echo', description: 'Creates a secondary phantom pendulum that swings in opposition.', color: '#00FFFF' },
        { id: 'TEMPORAL_DRAG', name: 'Temporal Drag', description: 'Enemies hit are slowed by 50% for 3 seconds.', color: '#AA00AA' }
    ],
    kaleidoscope_gaze: [
        { id: 'TRI_OPTIC_PRISM', name: 'Tri-Optic Prism', description: 'Fires 3 initial white beams in a spread.', color: '#FFFFFF' },
        { id: 'CHROMA_STASIS', name: 'Chroma Stasis', description: 'Colored beams freeze enemies. White beam pierces 1 enemy.', color: '#00FFFF' }
    ],
    fractal_bloom: [
        { id: 'JULIAS_GRASP', name: 'Mandelbrot Field', description: 'Continuously spawns fractal anomalies in random locations around you.', color: '#00FFFF' },
        { id: 'RECURSIVE_SPLIT', name: 'Infinite Recursion', description: 'Fractals grow in complexity and size in-place before violently imploding.', color: '#FF00FF' }
    ]
};

export const WEAPON_UPGRADE_TABLE: Record<string, Record<number, { desc: string; apply: (w: Weapon) => void }>> = {
  spirit_lance: {
    2: { desc: "Shoot an additional projectile", apply: w => w.count += 1 },
    3: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
    4: { desc: "Shoot an additional projectile", apply: w => w.count += 1 }, 
    6: { desc: "+30% Projectile Speed", apply: w => w.speed *= 1.3 },
    7: { desc: "Shoot an additional projectile", apply: w => w.count += 1 },
    8: { desc: "EVOLUTION: Spectral Barrage (Rapid Fire)", apply: w => { w.pierce += 2; w.damage *= 1.5; } }
  },
  drum_echo: {
    2: { desc: "Add another orbiting drum", apply: w => w.count += 1 },
    3: { desc: "20% increased orbiting radius", apply: w => w.area *= 1.2 },
    4: { desc: "Add another orbiting drum", apply: w => w.count += 1 },
    6: { desc: "30% increased orbiting radius", apply: w => w.area *= 1.3 },
    7: { desc: "Add another orbiting drum", apply: w => w.count += 1 },
    8: { desc: "EVOLUTION: Resonant Frequency (Massive Radius)", apply: w => { w.area *= 1.8; w.damage *= 1.5; } }
  },
  void_aura: {
    2: { desc: "+30% Area", apply: w => w.area *= 1.3 },
    3: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
    4: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
    6: { desc: "+30% Area", apply: w => w.area *= 1.3 },
    7: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
    8: { desc: "EVOLUTION: Double Tempo (Triggers 2x faster)", apply: w => { w.damage *= 1.5; w.area *= 1.2; } }
  },
  cyber_kora: {
    2: { desc: "+1 Projectile", apply: w => w.count += 1 },
    3: { desc: "40% increased Projectile spread", apply: w => w.area *= 1.40 },
    4: { desc: "+2 Projectiles", apply: w => w.count += 2 },
    6: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
    7: { desc: "Projectiles can pierce through two more enemies & +20% Spread", apply: w => { w.pierce += 2; w.area *= 1.2; } },
    8: { desc: "EVOLUTION: Neural Static (Massive Count + Stun)", apply: w => { w.count += 4; w.area *= 1.5; } }
  },
  nanite_swarm: {
    2: { desc: "Add another Nanite to the Swarm", apply: w => w.count += 1 },
    3: { desc: "+40% Duration", apply: w => w.duration *= 1.4 },
    4: { desc: "Increase Narnite speed +25% Speed", apply: w => w.speed *= 1.25 },
    6: { desc: "+1 Pierce", apply: w => w.pierce += 1 },
    7: { desc: "+2 Swarm Count", apply: w => w.count += 2 },
    8: { desc: "EVOLUTION: Gray Goo (Massive Count/Pierce)", apply: w => { w.count += 4; w.pierce += 2; } }
  },
  solar_chakram: {
      2: { desc: "+1 Chakram", apply: w => w.count += 1 },
      3: { desc: "+30% Flight Speed", apply: w => w.speed *= 1.3 },
      4: { desc: "+1 Chakram", apply: w => w.count += 1 },
      6: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
      7: { desc: "30% increased frequency ", apply: w => w.cooldown *= 0.7 },
      8: { desc: "EVOLUTION: Eclipse Blade (Orbit before return)", apply: w => { w.duration *= 1.5; } }
  },
  void_wake: {
      2: { desc: "Increase trail length by 20%", apply: w => w.duration *= 1.2 },
      3: { desc: "Increase trail length by 20%", apply: w => w.duration *= 1.2 },
      4: { desc: "Increase trail length by 20%", apply: w => w.duration *= 1.2 },
      6: { desc: "Increase trail length by 20%", apply: w => w.duration *= 1.2 },
      7: { desc: "Increase trail length by 20%", apply: w => w.duration *= 1.2 },
      8: { desc: "EVOLUTION: Abyssal Loop (Close the loop to destroy inside)", apply: w => { w.damage *= 1.5; } }
  },
  ancestral_resonance: {
      2: { desc: "-10% Cooldown", apply: w => w.cooldown *= 0.9 },
      3: { desc: "+20% Area", apply: w => w.area *= 1.2 },
      4: { desc: "+50% Damage", apply: w => w.damage *= 1.5 },
      6: { desc: "-10% Cooldown", apply: w => w.cooldown *= 0.9 },
      7: { desc: "+20% Area", apply: w => w.area *= 1.2 },
      8: { desc: "EVOLUTION: Cataclysm (Double Damage)", apply: w => w.damage *= 2 }
  },
  paradox_pendulum: {
      2: { desc: "+20% Swing Arc", apply: w => w.area *= 1.2 },
      3: { desc: "+20% Damage", apply: w => w.damage *= 1.2 },
      4: { desc: "+1 Pendulum", apply: w => w.count += 1 },
      6: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
      7: { desc: "+20% Swing Arc", apply: w => w.area *= 1.2 },
      8: { desc: "EVOLUTION: Grandfather Paradox (360 swing, Erase Existence)", apply: w => { w.area = 1.0; w.damage *= 1.5; } }
  },
  kaleidoscope_gaze: {
      2: { desc: "+20% Projectile Speed", apply: w => w.speed *= 1.2 },
      3: { desc: "+30% Damage", apply: w => w.damage *= 1.3 },
      4: { desc: "-15% Cooldown", apply: w => w.cooldown *= 0.85 },
      6: { desc: "+20% Damage", apply: w => w.damage *= 1.2 },
      7: { desc: "+1 Split Beam Count", apply: w => w.count += 1 }, // Affects split count internally
      8: { desc: "EVOLUTION: Prismatic Godhead (Recursive Splitting + Rainbow Loot)", apply: w => { w.damage *= 1.5; } }
  },
  fractal_bloom: {
      2: { desc: "+30% Duration", apply: w => w.duration *= 1.3 },
      3: { desc: "+20% Damage", apply: w => w.damage *= 1.2 },
      4: { desc: "+20% Area", apply: w => w.area *= 1.2 },
      6: { desc: "-15% Cooldown", apply: w => w.cooldown *= 0.85 },
      7: { desc: "+30% Duration", apply: w => w.duration *= 1.3 },
      8: { desc: "EVOLUTION: Chaos Theory (Rapid Damage Ticks + Color Shift)", apply: w => { w.damage *= 1.3; } }
  }
};
