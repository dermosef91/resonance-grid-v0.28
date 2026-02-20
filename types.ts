
export type Vector2 = { x: number; y: number };

export interface BaseLandscapeConfig {
  noiseScaleX: number;
  noiseScaleY: number;
  amplitude: number;
  sharpness: number;
  digitalFactor: number; // 0 = organic, 1 = blocky/stepped
}

export interface LandscapeConfig extends BaseLandscapeConfig {
  secondary?: BaseLandscapeConfig;
  blendFactor?: number; // 0 to 1
}

export interface ColorPalette {
  background: string;
  grid: string;
  nebulaPrimary: string;
  nebulaSecondary: string;
  landscape: LandscapeConfig;
}

export enum EntityType {
  PLAYER,
  ENEMY,
  PROJECTILE,
  PICKUP,
  TEXT_PARTICLE,
  VISUAL_PARTICLE,
  MISSION_ENTITY,
  OBSTACLE // New type
}

export interface Shockwave {
  id: string;
  pos: Vector2;
  time: number;
  maxDuration: number;
  maxRadius: number;
  minRadius?: number; // Inner exclusion zone
  strength: number;
  contracting?: boolean; // If true, wave moves inward (radius max -> 0)
}

export enum EnemyType {
  DRONE = 'DRONE',       // Basic
  TANK = 'TANK',         // Slow, tanky
  SWARMER = 'SWARMER',   // Fast, weak
  ELITE_DRONE = 'ELITE_DRONE', // Faster, stronger drone
  SENTINEL = 'SENTINEL', // Stationary shooter
  GHOST = 'GHOST',       // Phasing stealth
  LANCER = 'LANCER',     // Charge attacker
  BOSS_VANGUARD = 'BOSS_VANGUARD', // Boss 1: Charger / Shooter
  BOSS_HIVE_MIND = 'BOSS_HIVE_MIND', // Boss 2: Spawner / Bullet Hell
  BOSS_SHANGO = 'BOSS_SHANGO', // NEW BOSS: Wave 2 Spinner

  // --- NEW IDEATION ENEMIES (Curated) ---
  NEON_COBRA = 'NEON_COBRA',
  INFERNO_SPINNER = 'INFERNO_SPINNER', // Redesigned
  BINARY_SENTINEL = 'BINARY_SENTINEL', // Redesigned
  LASER_LOTUS = 'LASER_LOTUS',
  ORBITAL_SNIPER = 'ORBITAL_SNIPER',
  UTATU = 'UTATU', // New Enemy: Utatu
  FERROFLUID_SLIME = 'FERROFLUID_SLIME', // New: Merging Blob

  // --- PHYSICS / METAPHYSICS ENEMIES ---
  MANDELBROT_MITE = 'MANDELBROT_MITE',
  PRISMATIC_MONOLITH = 'PRISMATIC_MONOLITH',

  // --- PREVIOUS BOSS IDEATION ---
  BOSS_CYBER_KRAKEN = 'BOSS_CYBER_KRAKEN',

  // --- NEW CONCEPT BOSSES ---
  BOSS_AIDO_HWEDO = 'BOSS_AIDO_HWEDO', // The Boundless Coil

  // --- THE TRINITY ---
  BOSS_TRINITY = 'BOSS_TRINITY', // Wave Config Placeholder
  BOSS_TRINITY_CUBE = 'BOSS_TRINITY_CUBE',
  BOSS_TRINITY_PYRAMID = 'BOSS_TRINITY_PYRAMID',
  BOSS_TRINITY_ORB = 'BOSS_TRINITY_ORB'
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Obstacle extends Entity {
  shape: 'BOX' | 'CYLINDER' | 'HEX';
  height: number;
  rotationSpeed: number;
  rotation: number;
}

// New Interface for Mission Entities
export interface MissionEntity extends Entity {
  kind: 'ZONE' | 'PAYLOAD' | 'OBELISK' | 'STATION' | 'CLONE' | 'SYNC_GOAL' | 'FILTER_WAVE' | 'EVENT_HORIZON' | 'SOLAR_SHIELD' | 'ALLY';
  health: number;
  maxHealth: number;
  active: boolean; // For Obelisks/Zones
  destination?: Vector2; // For Payload
  opacity?: number; // For fading out
  filterData?: {
    angle: number; // Direction of movement (radians)
    speed: number;
    holeWidth: number;
    width: number; // Length of the wall (visually infinite)
  };
  solid?: boolean; // If true, blocks player movement
  customData?: any; // Generic data for various mission entity needs
}

export interface PlayerStats {
  damageMult: number;
  cooldownMult: number;
  areaMult: number;
  speedMult: number;
  magnetMult: number;
  xpMult: number;
  projectileCountFlat: number; // Adds to every weapon's projectile count
  knockbackMult: number;
  regen: number; // HP per second
  armor: number; // Flat damage reduction
  currencyMult: number;
}

export interface Player extends Entity {
  health: number;
  maxHealth: number;
  extraLives: number; // New: Number of revives available
  xp: number;
  level: number;
  nextLevelXp: number;
  speed: number;
  magnetRadius: number;
  rotation: number; // Current facing angle in radians
  distanceTraveled: number; // For rolling animation
  flipTimer: number; // For turn animations (0 = inactive, >0 = frame count)
  invulnerabilityTimer: number; // I-Frames: >0 means player is invincible
  weapons: Weapon[];
  artifacts: string[]; // List of IDs of collected artifacts

  // Visual State
  xpPulseTimer: number;
  healthPulseTimer: number;

  // Power-up States
  kaleidoscopeTimer: number; // >0 means Kaleidoscope effect is active

  stats: PlayerStats;

  // Logic State
  positionHistory: Vector2[]; // Stores last 120 frames of positions for Time Slip
}

export interface Replica extends Entity {
  rotation: number;
  weapons: Weapon[];
  stats: PlayerStats;
  lifeTime: number;
  isAlly?: boolean;
  isSpectral?: boolean;
  formationOffset?: Vector2;
  departing?: boolean;
}

export interface Enemy extends Entity {
  enemyType: EnemyType;
  name?: string;
  health: number;
  maxHealth: number;
  damage: number;
  xpValue: number;
  speed: number;
  isBoss: boolean;
  isMissionTarget?: boolean; // New: For ELIMINATE missions
  attackTimer: number; // For controlling boss pattern
  state?: 'IDLE' | 'CHARGE' | 'COOLDOWN' | 'ATTACK' | 'PHASE_IN' | 'PHASE_OUT' | 'AIMING' | 'SPIN' | 'LOCK' | 'FIRE' | 'FLARE';
  rotation?: number; // For directional enemies like Lancer
  rotVelocity?: number; // Physics tumbling
  opacity?: number; // For stealth enemies like Ghost
  stunTimer: number; // Frames remaining for stun
  bleedTimer?: number; // Frames remaining for bleed
  bleedDamage?: number; // Damage per tick for bleed
  slowTimer?: number; // Frames remaining for slow (Augment: Entropy)
  immuneTimers: Record<string, number>; // WeaponID -> Frames remaining of immunity
  gravityPull?: number; // Strength of pull on player
  voidSiphonTimer?: number; // Added for Void Siphon augment
  // Special drop flag for Kaleidoscope Evolution
  deathColor?: 'RED' | 'GREEN' | 'BLUE';
  skipDrop?: boolean; // If true, no XP/Items on death

  // Custom data for arbitrary behaviors
  customData?: any;

  // Specific to Mandelbrot Mite
  miteData?: {
    generation: number; // 0 = Big, 1 = Med, 2 = Small
  };

  // Specific to Binary Sentinel
  binaryData?: {
    angle: number;       // Current rotation of the pair
    separation: number;  // Current distance between nodes
    separationDir: number; // 1 = expanding, -1 = contracting
    nodeRadius: number;  // Size of individual nodes
  };
  // Specific to Aido-Hwedo
  aidoData?: {
    innerAngle: number;
    outerAngle: number;
    phase2Ring?: { // Renamed from middleRing, now Outer-Outer
      angle: number;
      active: boolean; // Triggered at <25% HP
      doorTimer: number; // Cycle timer
      doorsOpen: boolean; // Safe or Spikes?
    };
    phaseStartHealth: number; // Health at start of current phase
    flareTimer: number; // Duration of ejection event
  };
  // Specific to Boss Vanguard
  vanguardData?: {
    phase: number; // 0 (100%), 1 (75%), 2 (50%), 3 (25%)
  };
  // Specific to The Trinity
  trinityData?: {
    role: 'AGGRESSOR' | 'SUPPORT';
    siblings: string[]; // IDs of other parts
    type: 'CUBE' | 'PYRAMID' | 'ORB';
    // Runtime state
    subState?: string;
    subTimer?: number;
    attackCount?: number;
    expansion?: number; // Cube: 0 to 1
    deformation?: number; // Pyramid: 0 to 1
    gap?: number; // Orb: 0 to 1
    aimAngle?: number; // For charging/firing
  };
}

export interface Projectile extends Entity {
  damage: number;
  duration: number; // frames
  pierce: number;
  knockback: number;
  isEnemy?: boolean;
  stunDuration?: number; // How many frames to stun enemy on hit
  homingTargetId?: string | null; // For homing missiles
  turnSpeed?: number; // How fast it turns towards target
  sourceWeaponId?: string; // ID of weapon that fired this
  hitEnemyIds?: string[]; // IDs of enemies already hit by this projectile (for piercing)

  customData?: any; // Generic data for augments and custom behaviors

  // Chain Lightning specific
  chainData?: {
    bouncesRemaining: number;
    hitEntityIds: string[];
    range: number;
    isStunning: boolean;
    augment?: boolean; // Is this from Voltaic Arc?
  };
  // Mine specific
  mineData?: {
    isMine: boolean;
    explosionRadius: number;
    pullRadius: number; // For gravity well evolution
    lingers: boolean;
  };
  // Boomerang specific (Solar Chakram)
  boomerangData?: {
    state: 'OUT' | 'ORBIT' | 'RETURN';
    speed: number;
    maxDist: number;
    distTraveled: number;
    orbitDuration?: number;
    orbitTimer?: number;
    initialAngle?: number; // for orbit calc
    augmented?: boolean; // For Fractal Split
  };
  // Sky Fall specific (Pixel Rain)
  skyFallData?: {
    targetY: number;
    poolOnHit: boolean;
    isPool?: boolean; // If true, this IS the pool
    hasHit?: boolean;
  };
  // Beam specific (Phase Ripper)
  beamData?: {
    length: number;
    width: number;
    angle: number;
    tickRate: number; // Frames between damage ticks
  };
  // Void Wake specific
  voidWakeData?: {
    index: number;
    explosive?: boolean; // Unstable Ground
  };
  // Paradox Pendulum specific
  paradoxData?: {
    baseAngle: number;
    sweepAngle: number; // Total arc width
    currentPhase: number; // 0 to 1
    state: 'FORWARD' | 'REWIND';
    isEvolution: boolean;
    armLength: number;
    swingDir: number; // 1 = Normal, -1 = Counter/Echo
  };
  // Kaleidoscope Gaze Specific
  kaleidoscopeData?: {
    colorType: 'WHITE' | 'RED' | 'GREEN' | 'BLUE';
    generation: number; // 0=White, 1=RGB, 2=Sub-split
    splitCount: number;
    isGodhead: boolean; // Evolution Flag
  };
  // Fractal Bloom Specific
  fractalData?: {
    rotationSpeed: number;
    hueShift: number;
    branches: number;
    recursionDepth: number;
  };
  // Polygon Data for Special Effects (Void Loop)
  polyPoints?: Vector2[];
  // Event Horizon Anchor Data
  anchorData?: {
    pullRadius: number;
  };
}

export interface Pickup extends Entity {
  value: number; // XP amount or Health amount
  magnetized: boolean;
  kind: 'XP' | 'HEALTH' | 'CURRENCY' | 'SUPPLY_DROP' | 'MISSION_ITEM' | 'MISSION_ZONE' | 'TIME_CRYSTAL' | 'KALEIDOSCOPE' | 'STASIS_FIELD';
  rotationDir?: number; // 1 or -1 for swirl direction
  supplyContent?: 'CURRENCY_50' | 'FULL_HEALTH' | 'LEVEL_UP' | 'TEMPORAL_BOOST' | 'EXTRA_LIFE';
}

export interface TextParticle extends Entity {
  text: string;
  life: number;
  opacity: number;
}

export interface VisualParticle extends Entity {
  life: number;
  maxLife: number;
  size: number;
  decay: number;
  rotation?: number;
  rotationSpeed?: number;
  shape?: 'SQUARE' | 'LINE' | 'CIRCLE' | 'POLYGON'; // Added POLYGON shape
  polygon?: Vector2[]; // Custom vertices relative to center

  // New Light Cast Properties
  lightColor?: string;
  lightRadius?: number;
}

export interface UnlockRequirement {
  type: 'RUNS' | 'BOSS' | 'WAVE' | 'NONE'; // Added WAVE
  value: number | string; // Number of runs/wave OR Boss EnemyType ID
}

export interface Weapon {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  damage: number;
  level: number;
  type: 'PROJECTILE' | 'AURA' | 'ORBITAL' | 'CONE' | 'HOMING' | 'SHOCKWAVE' | 'CHAIN' | 'MINE' | 'BOOMERANG' | 'SKY_FALL' | 'BEAM' | 'TRAIL' | 'RHYTHM_WAVE' | 'PARADOX' | 'KALEIDOSCOPE' | 'FRACTAL';
  color: string; // Visual color for UI
  // Detailed Stats
  count: number;    // Number of projectiles
  pierce: number;   // Enemies it can pass through (or bounces for CHAIN)
  duration: number; // How long projectile lasts
  area: number;     // Size/Radius modifier (or Jump Range for CHAIN)
  speed: number;    // Projectile speed (used for length in beams)

  // Meta Progression
  unlockCost?: number;
  unlockReq?: UnlockRequirement;

  // Augment System
  augment?: string; // ID of chosen augment (e.g., 'VOLTAIC_ARC')

  // Temporary Logic
  expiresAt?: number; // Frame count when weapon should be removed

  // Custom tracking logic
  customData?: any;
}

export interface AugmentDef {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  type: 'WEAPON_NEW' | 'WEAPON_UPGRADE' | 'ARTIFACT' | 'GLITCH' | 'STAT' | 'AUGMENT_TRIGGER';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY' | 'GLITCH';
  weaponId?: string; // If related to a weapon
  color?: string; // For UI
  apply: (player: Player) => void;

  // Meta Progression
  unlockCost?: number;
  unlockReq?: UnlockRequirement;
}

export interface PermanentUpgrade {
  id: string;
  name: string;
  description: string;
  costPerLevel: number;
  maxLevel: number;
  unlockReq?: UnlockRequirement; // Added Unlock Requirement
  apply: (player: Player, level: number) => void;
}

export interface MetaState {
  currency: number;
  runsCompleted: number;
  bossesDefeated: string[]; // List of Boss EnemyType strings
  unlockedItems: string[]; // List of Weapon/Artifact IDs
  permanentUpgrades: Record<string, number>; // UpgradeID -> Level
  maxWaveCompleted: number; // Max wave index completed (0 = none, 5 = Wave 5 won)
  personalBests?: {
    maxKills: number;
    maxDamage: number;
    maxChips: number;
    fastestRun?: number;
  };
  seenItems?: string[];
}

// --- MISSION SYSTEM TYPES ---
export enum MissionType {
  SURVIVE = 'SURVIVE',
  ELIMINATE = 'ELIMINATE',
  DATA_RUN = 'DATA_RUN',
  BOSS = 'BOSS',
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',
  PAYLOAD_ESCORT = 'PAYLOAD_ESCORT',
  RITUAL_CIRCLE = 'RITUAL_CIRCLE',
  // New Types
  SHADOW_STEP = 'SHADOW_STEP',
  WEAPON_OVERRIDE = 'WEAPON_OVERRIDE',
  ENTANGLEMENT = 'ENTANGLEMENT',
  THE_GREAT_FILTER = 'THE_GREAT_FILTER',
  EVENT_HORIZON = 'EVENT_HORIZON',
  SOLAR_STORM = 'SOLAR_STORM',
  RESCUE = 'RESCUE'
}

export interface MissionState {
  type: MissionType;
  description: string;
  progress: number;
  total: number;
  isComplete: boolean;
  // Context data
  targetIds?: string[]; // IDs of entities to kill/find
  stage?: 'LOCATE_FRAGMENT' | 'UPLOAD_DATA' | string; // For Data Run / Ritual
  customData?: {
    wallX?: number; // For Firewall (Deprecated but type safety)
    wallSpeed?: number;
    backupWeapons?: Weapon[]; // For Weapon Override
    spawned?: boolean;
    uploadTimer?: number; // Added for delay
    cloneOffset?: Vector2; // For Entanglement
    cloneAlive?: boolean; // For Entanglement
    filterSafeZoneId?: string; // For Great Filter
    solarData?: {
      state: 'CALM' | 'WARNING' | 'STORM';
      timer: number;
      sunAngle: number;
      intensity: number;
    };
    allyGuards?: Record<string, string[]>; // RESCUE: AllyID -> GuardIDs
    needsSpawn?: boolean; // RESCUE: Flag to trigger initial spawn
    guardsSpawned?: boolean; // RESCUE: Flag to indicate guards are active
    spawnTime?: number; // RESCUE: Timestamp of spawn to prevent instant-clear
    phase2Started?: boolean; // RESCUE: Flag to trigger elite wave
  };
}

export interface WaveConfig {
  id: number;
  spawnRate: number;
  types: EnemyType[];
  missionType: MissionType;
  missionParam: number; // Duration (Survive), Count (Eliminate), 0 (Data/Boss)
  boss?: EnemyType;
}

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_UP' | 'VICTORY' | 'COMPENDIUM' | 'MISSION_COMPLETE' | 'AUGMENT_SELECT';

export type TutorialStep = 'NONE' | 'MOVE' | 'COMBAT' | 'COLLECT';

export interface GameOverUnlockedItem {
  id: string;
  name: string;
  description: string;
  type: 'WEAPON' | 'ARTIFACT' | 'UPGRADE';
  rarity?: string;
}

export interface GameOverInfo {
  score: number;
  level: number;
  wave: number;
  kills: number;
  duration: number; // Seconds
  chipsEarned: number;
  newUnlocks: GameOverUnlockedItem[];
  newAvailable: GameOverUnlockedItem[];
}
