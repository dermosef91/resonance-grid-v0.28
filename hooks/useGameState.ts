
import { useState, useRef } from 'react';
import {
  GameStatus, Player, Enemy, Projectile, Pickup, TextParticle, VisualParticle,
  Weapon, UpgradeOption, EntityType, MetaState, MissionState, MissionType, MissionEntity, WaveConfig, ColorPalette, TutorialStep, Shockwave, Replica, Obstacle, GameOverInfo
} from '../types';
import { COLORS, PLAYER_BASE_STATS, ZOOM_LEVEL } from '../constants';
import { BIOMES, BASE_WEAPONS, generateRunWaves, PERMANENT_UPGRADES } from '../services/gameData';
import { SpatialHash } from '../services/PhysicsSystem';

const getInitialPlayer = (metaState: MetaState): Player => {
  const p: Player = {
    id: 'player',
    type: EntityType.PLAYER,
    pos: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: 12,
    color: COLORS.white,
    markedForDeletion: false,
    health: PLAYER_BASE_STATS.maxHealth,
    maxHealth: PLAYER_BASE_STATS.maxHealth,
    extraLives: 0,
    xp: 0,
    level: 1,
    nextLevelXp: 10,
    speed: PLAYER_BASE_STATS.speed,
    magnetRadius: PLAYER_BASE_STATS.magnetRadius,
    rotation: 0,
    distanceTraveled: 0,
    flipTimer: 0,
    invulnerabilityTimer: 0,
    xpPulseTimer: 0,
    healthPulseTimer: 0,
    kaleidoscopeTimer: 0,
    weapons: [{ ...BASE_WEAPONS.spirit_lance }],
    artifacts: [],
    positionHistory: [], // Initial empty history
    stats: {
      damageMult: 1,
      cooldownMult: 1,
      areaMult: 1,
      speedMult: 1,
      magnetMult: 1,
      xpMult: 1,
      projectileCountFlat: 0,
      knockbackMult: 1,
      regen: 0,
      armor: 0,
      currencyMult: 1
    }
  };

  PERMANENT_UPGRADES.forEach(upgrade => {
    const level = metaState.permanentUpgrades?.[upgrade.id] || 0;
    if (level > 0) {
      upgrade.apply(p, level);
    }
  });

  return p;
};

export const useGameState = (metaState: MetaState) => {
  // --- ENTITY REFS ---
  const playerRef = useRef<Player>(getInitialPlayer(metaState));
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const particlesRef = useRef<(TextParticle | VisualParticle)[]>([]);
  const missionEntitiesRef = useRef<MissionEntity[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const replicasRef = useRef<Replica[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]); // New obstacles ref

  // --- SYSTEM REFS ---
  const wavesRef = useRef<WaveConfig[]>([]);
  const cameraRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const killsRef = useRef<number>(0);
  const waveIndexRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const dropsCounterRef = useRef<number>(0);
  const sessionCurrencyRef = useRef<number>(0);
  const bossesDefeatedRef = useRef<Set<string>>(new Set<string>());
  const spatialHashRef = useRef<SpatialHash>(new SpatialHash(200));
  const lastDamageSourceRef = useRef<string>("Unknown");
  const runIdRef = useRef<string>("");

  // --- VISUAL REFS ---
  const hitStopRef = useRef<number>(0);
  const glitchIntensityRef = useRef<number>(0);
  const enemyFreezeTimerRef = useRef<number>(0); // Replaces timeFreezeTimerRef
  const replicaTimerRef = useRef<number>(0);     // New timer for Replica effect
  const redFlashTimerRef = useRef<number>(0);    // Red screen flash warning

  const currentPaletteRef = useRef<ColorPalette>(BIOMES.DEFAULT);
  const targetPaletteRef = useRef<ColorPalette>(BIOMES.DEFAULT);
  const sourcePaletteRef = useRef<ColorPalette>(BIOMES.DEFAULT);
  const transitionProgressRef = useRef<number>(1.0);

  // --- LOGIC REFS ---
  const missionRef = useRef<MissionState>({
    type: MissionType.SURVIVE,
    description: "Survive",
    progress: 0,
    total: 100,
    isComplete: false
  });
  const missionCompleteTimerRef = useRef<number>(0);
  const levelUpProcessingRef = useRef<boolean>(false);
  const levelUpTimerRef = useRef<number>(0);
  const nextStatusRef = useRef<GameStatus>('PLAYING');
  const tutorialTimerRef = useRef<number>(0);

  // --- REACT STATE ---
  const [status, setStatus] = useState<GameStatus>('MENU');
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([]);
  const [uiStats, setUiStats] = useState({ health: 100, maxHealth: 100, level: 1, xp: 0, nextXp: 10, score: 0, currency: 0, runTime: 0 });
  const [activeBosses, setActiveBosses] = useState<Enemy[]>([]); // Changed to Array
  const [waveInfo, setWaveInfo] = useState<{ id: number, boss?: string, mission?: MissionState }>({ id: 1 });
  const [inventory, setInventory] = useState<Weapon[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isMissionReward, setIsMissionReward] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('NONE');
  const [augmentTarget, setAugmentTarget] = useState<Weapon | null>(null);

  // Helper to reset all refs for a new run
  const resetRefs = () => {
    playerRef.current = getInitialPlayer(metaState);
    enemiesRef.current = [];
    projectilesRef.current = [];
    pickupsRef.current = [];
    particlesRef.current = [];
    missionEntitiesRef.current = [];
    shockwavesRef.current = [];
    replicasRef.current = [];
    obstaclesRef.current = [];
    wavesRef.current = generateRunWaves();
    cameraRef.current = { x: 0, y: 0 };
    frameRef.current = 0;
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    killsRef.current = 0;
    waveIndexRef.current = 0;
    waveTimerRef.current = 0;
    screenShakeRef.current = 0;
    dropsCounterRef.current = 0;
    sessionCurrencyRef.current = 0;
    bossesDefeatedRef.current.clear();
    spatialHashRef.current.clear();
    lastDamageSourceRef.current = "Unknown";

    hitStopRef.current = 0;
    glitchIntensityRef.current = 0;
    enemyFreezeTimerRef.current = 0;
    replicaTimerRef.current = 0;
    redFlashTimerRef.current = 0;
    currentPaletteRef.current = BIOMES.DEFAULT;
    targetPaletteRef.current = BIOMES.DEFAULT;
    sourcePaletteRef.current = BIOMES.DEFAULT;
    transitionProgressRef.current = 1.0;

    missionCompleteTimerRef.current = 0;
    levelUpProcessingRef.current = false;
    levelUpTimerRef.current = 0;
    nextStatusRef.current = 'PLAYING';
    tutorialTimerRef.current = 0;

    setAugmentTarget(null);

    runIdRef.current = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  return {
    // Refs
    playerRef, enemiesRef, projectilesRef, pickupsRef, particlesRef, missionEntitiesRef, shockwavesRef, replicasRef, obstaclesRef,
    wavesRef, cameraRef, frameRef, spawnTimerRef, scoreRef, killsRef, waveIndexRef, waveTimerRef,
    screenShakeRef, dropsCounterRef, sessionCurrencyRef, bossesDefeatedRef, spatialHashRef,
    lastDamageSourceRef, runIdRef, hitStopRef, glitchIntensityRef, enemyFreezeTimerRef, replicaTimerRef, redFlashTimerRef,
    currentPaletteRef, targetPaletteRef,
    sourcePaletteRef, transitionProgressRef,
    missionRef, missionCompleteTimerRef, levelUpProcessingRef, levelUpTimerRef, nextStatusRef,
    tutorialTimerRef,

    // State & Setters
    status, setStatus,
    levelUpOptions, setLevelUpOptions,
    uiStats, setUiStats,
    activeBoss: activeBosses.length > 0 ? activeBosses[0] : null, // Compat for single checks
    activeBosses, setActiveBosses, // New Array State
    waveInfo, setWaveInfo,
    inventory, setInventory,
    artifacts, setArtifacts,
    gameOverInfo, setGameOverInfo,
    showDebug, setShowDebug,
    isMissionReward, setIsMissionReward,
    tutorialStep, setTutorialStep,
    augmentTarget, setAugmentTarget,

    // Actions
    resetRefs
  };
};
