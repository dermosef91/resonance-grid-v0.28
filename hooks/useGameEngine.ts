
import React, { useCallback, useEffect } from 'react';
import {
    GameStatus, Player, Enemy, Projectile, Pickup, TextParticle, VisualParticle,
    Weapon, UpgradeOption, EntityType, EnemyType, MetaState, MissionState, MissionType, MissionEntity, WaveConfig, ColorPalette, TutorialStep, Shockwave, Replica, Obstacle
} from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PLAYER_BASE_STATS, ZOOM_LEVEL, BALANCE } from '../constants';
import {
    spawnEnemy, createXP, createCurrency, createHealthPickup, createTimeCrystal, createStasisFieldPickup,
    createSupplyDrop, createTextParticle, createShatterParticles, createBossDeathExplosion, createMissionPickup, createEventHorizon, createKaleidoscopePickup, createObstacle
} from '../services/gameLogic';
import { checkCollision } from '../services/PhysicsSystem';
import { inputSystem } from '../services/InputSystem';
import { audioEngine } from '../services/audioEngine';
import { renderGame } from '../services/renderService';
import { lerpPaletteColors } from '../services/renderUtils';
import { BASE_WEAPONS, BASE_ARTIFACTS, getWavePalette } from '../services/gameData';
import { saveMetaState } from '../services/persistence';
import { trackEvent } from '../services/trackingService';
import { projectilePool, visualParticlePool, textParticlePool, getProjectile, getVisualParticle } from '../services/objectPools';

// --- SYSTEMS ---
import { updatePlayer } from '../services/systems/PlayerSystem';
import { updateWeapons } from '../services/systems/WeaponSystem';
import { updateProjectiles } from '../services/systems/ProjectileSystem';
import { updateEnemies } from '../services/systems/EnemySystem';
import { resolveCollisions } from '../services/systems/CollisionSystem';
import { updatePickups } from '../services/systems/PickupSystem';
import { initMissionState, updateMission, handleMissionPickup } from '../services/systems/MissionSystem';

// --- STATE HOOKS ---
import { useGameState } from './useGameState';
import { useEnemyManager } from './useEnemyManager';
import { useUpgradeLogic } from './useUpgradeLogic';
import { useDebugLogic } from './useDebugLogic';

const SPECIAL_WAVE_POOLS: Record<number, EnemyType[]> = {
    1: [EnemyType.ELITE_DRONE], // 2% Elite Drone
    3: [EnemyType.NEON_COBRA, EnemyType.MANDELBROT_MITE], // ~1% each (2% total)
    5: [EnemyType.LASER_LOTUS], // 2% Laser Lotus
    7: [EnemyType.LANCER, EnemyType.MANDELBROT_MITE] // ~1% each (2% total)
};

export const useGameEngine = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    metaState: MetaState,
    setMetaState: React.Dispatch<React.SetStateAction<MetaState>>
) => {
    // Destructure everything from the Game State Hook
    const gameState = useGameState(metaState);
    const {
        playerRef, enemiesRef, projectilesRef, pickupsRef, particlesRef, missionEntitiesRef, shockwavesRef, replicasRef, obstaclesRef,
        wavesRef, cameraRef, frameRef, spawnTimerRef, scoreRef, killsRef, waveIndexRef, waveTimerRef,
        screenShakeRef, dropsCounterRef, sessionCurrencyRef, bossesDefeatedRef, spatialHashRef,
        lastDamageSourceRef, runIdRef, hitStopRef, glitchIntensityRef, enemyFreezeTimerRef, replicaTimerRef, redFlashTimerRef,
        currentPaletteRef, targetPaletteRef, sourcePaletteRef, transitionProgressRef,
        missionRef, missionCompleteTimerRef, levelUpProcessingRef, levelUpTimerRef, nextStatusRef,
        tutorialTimerRef,

        status, setStatus,
        levelUpOptions,
        uiStats, setUiStats,
        activeBosses, setActiveBosses,
        waveInfo, setWaveInfo,
        inventory, setInventory,
        artifacts, setArtifacts,
        gameOverInfo, setGameOverInfo,
        showDebug, setShowDebug,
        isMissionReward, setIsMissionReward,
        tutorialStep, setTutorialStep,
        augmentTarget, setAugmentTarget,

        resetRefs
    } = gameState;

    // --- SUB-HOOKS ---
    const { addEnemies } = useEnemyManager(gameState);

    const {
        generateUpgrades, selectUpgrade, applyAugment, handleAdReward, pendingRewardsRef
    } = useUpgradeLogic(gameState, metaState, setMetaState);

    const {
        generateDebugOptions, handleDebugSpawn, handleDebugMission, handleDebugPickup
    } = useDebugLogic(gameState, addEnemies);

    useEffect(() => {
        inputSystem.init();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ß') setShowDebug(prev => !prev);
            if (e.key === 'Escape') togglePause();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            inputSystem.cleanup();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (status === 'MENU') {
            audioEngine.stop();
        } else if (status === 'LEVEL_UP' || status === 'MISSION_COMPLETE' || status === 'AUGMENT_SELECT') {
            audioEngine.setProfile('TRIBAL');
        } else {
            audioEngine.setProfile('INDUSTRIAL');
        }
    }, [status]);

    const togglePause = useCallback(() => {
        setStatus(prev => {
            if (prev === 'PLAYING') return 'PAUSED';
            if (prev === 'PAUSED') return 'PLAYING';
            return prev;
        });
    }, []);

    const initMission = (waveIndex: number) => {
        const wave = wavesRef.current[waveIndex];
        if (!wave) return;
        const { mission, entities, pickups } = initMissionState(wave, playerRef.current);
        missionRef.current = mission;
        missionEntitiesRef.current = entities;
        pickupsRef.current.push(...pickups);
        missionCompleteTimerRef.current = 0;
        if (mission.type === MissionType.SHADOW_STEP) {
            screenShakeRef.current = 25;
            particlesRef.current.push(createTextParticle(playerRef.current.pos, "WEAPONS JAMMED", '#FF4400', 120));
            particlesRef.current.push(...createShatterParticles(playerRef.current.pos, '#FFFFFF', 10, 5));
        } else if (mission.type === MissionType.ENTANGLEMENT) {
            screenShakeRef.current = 15;
            particlesRef.current.push(createTextParticle(playerRef.current.pos, "QUANTUM ENTANGLEMENT", '#00FFFF', 120));
        } else if (mission.type === MissionType.THE_GREAT_FILTER) {
            audioEngine.setTheme('MIND_FLAYER');
            redFlashTimerRef.current = 120;
            screenShakeRef.current = 30;
        }

        const newPalette = getWavePalette(wave.id);
        if (newPalette !== targetPaletteRef.current) {
            sourcePaletteRef.current = targetPaletteRef.current;
            targetPaletteRef.current = newPalette;
            transitionProgressRef.current = 0;
        }
    };

    const resetGame = useCallback(() => {
        resetRefs();
        initMission(0);
        setUiStats({ health: 100, maxHealth: 100, level: 1, xp: 0, nextXp: 10, score: 0, currency: 0, runTime: 0 });
        setWaveInfo({ id: 1, mission: { ...missionRef.current } });
        setActiveBosses([]);
        setInventory([...playerRef.current.weapons]);
        setArtifacts([...playerRef.current.artifacts]);
        setGameOverInfo(null);
        pendingRewardsRef.current = 0;
        if (metaState.runsCompleted === 0) {
            setTutorialStep('MOVE');
            tutorialTimerRef.current = 0;
        } else {
            setTutorialStep('NONE');
        }
    }, [metaState, resetRefs]);

    const startGame = useCallback(() => {
        resetGame();
        setStatus('PLAYING');
        audioEngine.start();
        trackEvent(runIdRef.current, 'RUN_START', playerRef.current, metaState, 1, 0, 0);
    }, [resetGame, metaState]);

    const gameOver = useCallback(() => {
        const newRuns = metaState.runsCompleted + 1;
        const newBosses: string[] = Array.from(new Set<string>([...metaState.bossesDefeated, ...(Array.from(bossesDefeatedRef.current) as string[])]));
        const wavesWon = waveIndexRef.current;
        const newMaxWave = Math.max(metaState.maxWaveCompleted || 0, wavesWon);
        const newlyUnlocked: string[] = [];
        const newAvailable: string[] = [];
        const nextUnlocked = new Set<string>(metaState.unlockedItems);
        const allItems = [...Object.values(BASE_WEAPONS), ...Object.values(BASE_ARTIFACTS)];

        allItems.forEach(item => {
            if (metaState.unlockedItems.includes(item.id)) return;
            let reqMet = true;
            if (item.unlockReq) {
                if (item.unlockReq.type === 'RUNS') reqMet = newRuns >= (item.unlockReq.value as number);
                else if (item.unlockReq.type === 'BOSS') reqMet = newBosses.includes(item.unlockReq.value as string);
                else if (item.unlockReq.type === 'WAVE') reqMet = newMaxWave >= (item.unlockReq.value as number);
            }
            if (reqMet) {
                if (item.unlockCost && item.unlockCost > 0) {
                    let prevReqMet = true;
                    if (item.unlockReq) {
                        if (item.unlockReq.type === 'RUNS') prevReqMet = metaState.runsCompleted >= (item.unlockReq.value as number);
                        else if (item.unlockReq.type === 'BOSS') prevReqMet = metaState.bossesDefeated.includes(item.unlockReq.value as string);
                        else if (item.unlockReq.type === 'WAVE') prevReqMet = (metaState.maxWaveCompleted || 0) >= (item.unlockReq.value as number);
                    }
                    if (!prevReqMet) newAvailable.push(item.id);
                } else {
                    nextUnlocked.add(item.id);
                    newlyUnlocked.push(item.id);
                }
            }
        });

        const newState: MetaState = {
            currency: metaState.currency + sessionCurrencyRef.current,
            runsCompleted: newRuns,
            bossesDefeated: newBosses,
            unlockedItems: Array.from(nextUnlocked),
            permanentUpgrades: metaState.permanentUpgrades,
            maxWaveCompleted: newMaxWave
        };

        trackEvent(runIdRef.current, 'DEATH', playerRef.current, metaState, waveIndexRef.current + 1, sessionCurrencyRef.current, Math.floor(frameRef.current / 60), { causeOfDeath: lastDamageSourceRef.current });
        setMetaState(newState);
        saveMetaState(newState);
        hitStopRef.current = 0;
        glitchIntensityRef.current = 0;
        screenShakeRef.current = 0;
        enemyFreezeTimerRef.current = 0;
        replicaTimerRef.current = 0;
        redFlashTimerRef.current = 0;
        setGameOverInfo({ score: scoreRef.current, level: playerRef.current.level, wave: waveIndexRef.current + 1, chipsEarned: sessionCurrencyRef.current, newUnlocks: newlyUnlocked, newAvailable: newAvailable });
        setStatus('GAME_OVER');
        audioEngine.stop();
    }, [metaState, setMetaState]);

    const checkPlayerDeath = () => {
        const player = playerRef.current;
        if (player.health <= 0) {
            if (player.extraLives > 0) {
                player.extraLives--;
                player.health = player.maxHealth;
                player.healthPulseTimer = 20;
                particlesRef.current.push(createTextParticle(player.pos, "SYSTEM RESTORED", '#FF0088', 90));
                screenShakeRef.current = 20;
                projectilesRef.current.push(getProjectile({ id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { ...player.pos }, velocity: { x: 0, y: 0 }, radius: 150, color: '#FF0088', markedForDeletion: false, damage: 2000, duration: 5, pierce: 999, knockback: 60, isEnemy: false, sourceWeaponId: 'revival_blast' }));
            } else { gameOver(); }
        }
    };

    const getNextMissionInfo = useCallback(() => {
        const nextWave = wavesRef.current[waveIndexRef.current + 1];
        if (!nextWave) return null;
        let desc = "SURVIVE";
        if (nextWave.missionType === MissionType.ELIMINATE) desc = "ELIMINATE TARGETS";
        if (nextWave.missionType === MissionType.DATA_RUN) desc = "LOCATE AND UPLOAD DATA";
        if (nextWave.missionType === MissionType.BOSS) desc = "DEFEAT THE BOSS";
        if (nextWave.missionType === MissionType.KING_OF_THE_HILL) desc = "SECURE THE ZONE";
        if (nextWave.missionType === MissionType.PAYLOAD_ESCORT) desc = "ESCORT PAYLOAD";
        if (nextWave.missionType === MissionType.RITUAL_CIRCLE) desc = "ACTIVATE OBELISKS";
        if (nextWave.missionType === MissionType.SHADOW_STEP) desc = "SURVIVE (WEAPONS JAMMED)";
        if (nextWave.missionType === MissionType.ENTANGLEMENT) desc = "MAINTAIN LINK";
        if (nextWave.missionType === MissionType.THE_GREAT_FILTER) desc = "PASS THROUGH THE GATE";
        return { type: nextWave.missionType, description: desc };
    }, []);

    const advanceWave = useCallback(() => {
        const runWaves = wavesRef.current;
        enemiesRef.current = enemiesRef.current.filter((e: any) => !e.isBoss);
        setActiveBosses([]);
        missionEntitiesRef.current = [];
        obstaclesRef.current = []; // Clear obstacles on wave change
        waveIndexRef.current++;
        waveTimerRef.current = 0;
        const nextWave = runWaves[waveIndexRef.current];
        if (nextWave) {
            audioEngine.setWave(nextWave.id);
            audioEngine.triggerBuildup(0.5);
            initMission(waveIndexRef.current);

            // BOSS SPAWNING LOGIC
            if (nextWave.boss) {
                if (nextWave.boss === EnemyType.BOSS_TRINITY) {
                    // Spawn The Trinity (3 Parts)
                    // Random angle for formation center
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.max(window.innerWidth, window.innerHeight) / ZOOM_LEVEL * 0.7;
                    const cx = playerRef.current.pos.x + Math.cos(angle) * dist;
                    const cy = playerRef.current.pos.y + Math.sin(angle) * dist;

                    const parts: EnemyType[] = [EnemyType.BOSS_TRINITY_CUBE, EnemyType.BOSS_TRINITY_PYRAMID, EnemyType.BOSS_TRINITY_ORB];
                    const spawnedParts: Enemy[] = [];

                    parts.forEach((type, i) => {
                        const offsetAngle = (i / 3) * Math.PI * 2;
                        const offsetR = 100;
                        const px = cx + Math.cos(offsetAngle) * offsetR;
                        const py = cy + Math.sin(offsetAngle) * offsetR;

                        const enemy = spawnEnemy(playerRef.current, type, { x: px, y: py }, waveIndexRef.current + 1);
                        // Init trinity data
                        enemy.trinityData = {
                            role: i === 0 ? 'AGGRESSOR' : 'SUPPORT', // Start Cube as aggressor
                            siblings: [],
                            type: i === 0 ? 'CUBE' : (i === 1 ? 'PYRAMID' : 'ORB')
                        };
                        spawnedParts.push(enemy);
                    });

                    // Link siblings
                    const ids = spawnedParts.map(e => e.id);
                    spawnedParts.forEach(e => {
                        if (e.trinityData) {
                            e.trinityData.siblings = ids.filter(id => id !== e.id);
                        }
                    });

                    addEnemies(spawnedParts);
                    particlesRef.current.push(createTextParticle(playerRef.current.pos, "WARNING: TRINITY DETECTED", '#ff0000', 120));

                } else {
                    // Standard Single Boss
                    addEnemies([spawnEnemy(playerRef.current, nextWave.boss, undefined, waveIndexRef.current + 1)]);
                    particlesRef.current.push(createTextParticle(playerRef.current.pos, "WARNING: ANOMALY DETECTED", '#ff0000', 120));
                }
            }
        }
        setStatus('PLAYING');
    }, [addEnemies]);

    const update = useCallback(() => {
        if (status !== 'PLAYING' || showDebug) return;
        const player = playerRef.current;
        const camera = cameraRef.current;
        const grid = spatialHashRef.current;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const mission = missionRef.current;

        // Moved up for access in Obstacle logic
        const runWaves = wavesRef.current;
        const currentWave = runWaves[Math.min(waveIndexRef.current, runWaves.length - 1)];

        // --- REPLICA LOGIC ---
        if (replicaTimerRef.current > 0) {
            replicaTimerRef.current--;
            if (replicaTimerRef.current % 30 === 0) {
                const prevReplica = replicasRef.current.length > 0 ? replicasRef.current[replicasRef.current.length - 1] : null;
                const newReplica: Replica = {
                    id: Math.random().toString(),
                    type: EntityType.PLAYER,
                    pos: { ...player.pos },
                    velocity: { x: 0, y: 0 },
                    radius: player.radius,
                    color: '#00FFFF',
                    markedForDeletion: false,
                    rotation: player.rotation,
                    weapons: player.weapons.map((w: any) => ({ ...w, customData: w.customData ? { ...w.customData } : undefined })),
                    stats: { ...player.stats },
                    lifeTime: replicaTimerRef.current
                };

                if (prevReplica) {
                    const dist = Math.sqrt((newReplica.pos.x - prevReplica.pos.x) ** 2 + (newReplica.pos.y - prevReplica.pos.y) ** 2);
                    const steps = Math.ceil(dist / 15);
                    for (let i = 1; i < steps; i++) {
                        const t = i / steps;
                        const tx = prevReplica.pos.x + (newReplica.pos.x - prevReplica.pos.x) * t;
                        const ty = prevReplica.pos.y + (newReplica.pos.y - prevReplica.pos.y) * t;
                        particlesRef.current.push(getVisualParticle({
                            id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE, pos: { x: tx, y: ty }, velocity: { x: 0, y: 0 },
                            radius: 0, color: 'rgba(0, 255, 255, 0.4)', markedForDeletion: false, life: 60, maxLife: 60, size: 8, decay: 0, shape: 'CIRCLE'
                        }));
                    }
                }
                replicasRef.current.push(newReplica);
            }
        } else {
            if (replicasRef.current.length > 0) replicasRef.current = [];
        }

        // --- OBSTACLE SPAWNING ---
        // Try to maintain ~8-12 obstacles in view/near-view
        // Check less frequently
        if (frameRef.current % 60 === 0) {
            const viewW = winW / ZOOM_LEVEL;
            const viewH = winH / ZOOM_LEVEL;
            const spawnRadius = Math.max(viewW, viewH) * 0.8;

            // Clean up far obstacles
            obstaclesRef.current = obstaclesRef.current.filter(o => {
                const dx = o.pos.x - player.pos.x;
                const dy = o.pos.y - player.pos.y;
                return (dx * dx + dy * dy) < (spawnRadius * 2.5) ** 2;
            });

            let maxObstacles = 0;
            let isMega = false;

            if (currentWave.id === 5) {
                maxObstacles = 12;
                isMega = false;
            } else if (currentWave.id === 9 || currentWave.id === 10) {
                maxObstacles = 6;
                isMega = true;
            }

            if (maxObstacles > 0 && obstaclesRef.current.length < maxObstacles) {
                const count = Math.min(isMega ? 1 : 3, maxObstacles - obstaclesRef.current.length);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = spawnRadius + Math.random() * 400;
                    const pos = {
                        x: player.pos.x + Math.cos(angle) * dist,
                        y: player.pos.y + Math.sin(angle) * dist
                    };
                    obstaclesRef.current.push(createObstacle(pos, isMega));
                }
            }
        }

        let isFrozen = false;
        if (enemyFreezeTimerRef.current > 0) {
            enemyFreezeTimerRef.current--;
            isFrozen = true;
        }

        if (redFlashTimerRef.current > 0) redFlashTimerRef.current--;

        const keptShockwaves: Shockwave[] = [];
        shockwavesRef.current.forEach((sw: any) => { sw.time++; if (sw.time < sw.maxDuration) keptShockwaves.push(sw); });
        shockwavesRef.current = keptShockwaves;

        if (levelUpProcessingRef.current) {
            levelUpTimerRef.current++;
            if (levelUpTimerRef.current > 10) {
                player.level++;
                player.xp -= player.nextLevelXp;
                player.nextLevelXp = Math.floor(player.nextLevelXp * BALANCE.XP_GROWTH_RATE);
                setStatus('LEVEL_UP');
                generateUpgrades();
                levelUpProcessingRef.current = false;
            }
            return;
        }

        if (screenShakeRef.current > 0) screenShakeRef.current--;

        if (transitionProgressRef.current < 1.0) transitionProgressRef.current = Math.min(1.0, transitionProgressRef.current + 0.01);

        const progress = transitionProgressRef.current;
        currentPaletteRef.current = {
            ...lerpPaletteColors(sourcePaletteRef.current, targetPaletteRef.current, progress),
            landscape: { ...sourcePaletteRef.current.landscape, secondary: targetPaletteRef.current.landscape, blendFactor: progress }
        };

        const inputVec = inputSystem.getMoveVector();
        updatePlayer(player, inputVec, frameRef.current, mission.type);

        camera.x = player.pos.x - (winW / ZOOM_LEVEL) / 2; camera.y = player.pos.y - (winH / ZOOM_LEVEL) / 2;

        if (tutorialStep === 'MOVE') {
            if (player.distanceTraveled > 50) {
                tutorialTimerRef.current++;
                if (tutorialTimerRef.current > 60) setTutorialStep('COMBAT');
            }
        } else if (tutorialStep === 'COMBAT') {
            if (killsRef.current > 0) setTutorialStep('COLLECT');
        } else if (tutorialStep === 'COLLECT') { if (player.xp > 0) setTutorialStep('NONE'); }

        waveTimerRef.current++;

        // Find all active bosses for HUD and logic
        const currentBosses = enemiesRef.current.filter((e: any) => e.isBoss && !e.markedForDeletion);
        // For mission logic, pass the first one found as representative, but updateMission handles list logic if needed
        const representativeBoss = currentBosses.length > 0 ? currentBosses[0] : undefined;

        const missionResult = updateMission(missionRef.current, player, missionEntitiesRef.current, enemiesRef.current, waveTimerRef.current, representativeBoss, bossesDefeatedRef.current, currentWave.boss, waveIndexRef.current + 1, projectilesRef.current, pickupsRef.current);
        missionRef.current = missionResult.mission;
        addEnemies(missionResult.newEnemies);

        if (missionResult.screenShake) screenShakeRef.current = Math.max(screenShakeRef.current, missionResult.screenShake);

        missionResult.newParticles.forEach(p => {
            if ((p as any).type === EntityType.VISUAL_PARTICLE) particlesRef.current.push(p as any);
            else if ((p as any).text) { const tp = p as any; particlesRef.current.push(createTextParticle(tp.pos, tp.text, tp.color, tp.duration)); }
        });

        if (player.health <= 0) { lastDamageSourceRef.current = "Mission Failure"; checkPlayerDeath(); }

        if (missionRef.current.type === MissionType.SHADOW_STEP && frameRef.current % 4 === 0) {
            particlesRef.current.push(getVisualParticle({ id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE, pos: { x: player.pos.x + (Math.random() - 0.5) * 10, y: player.pos.y + (Math.random() - 0.5) * 10 }, velocity: { x: -player.velocity.x * 0.2 + (Math.random() - 0.5), y: -player.velocity.y * 0.2 + (Math.random() - 0.5) }, radius: 0, color: Math.random() > 0.5 ? '#333333' : '#555555', markedForDeletion: false, life: 30 + Math.random() * 20, maxLife: 50, size: Math.random() * 6 + 4, decay: 0.95, shape: 'SQUARE', rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.1 }));
        }

        if (missionResult.isComplete && waveIndexRef.current < runWaves.length - 1) {
            // --- REMOVE DATA RUN ZONE IMMEDIATELY ---
            if (missionRef.current.type === MissionType.DATA_RUN) {
                pickupsRef.current.forEach(p => {
                    if (p.kind === 'MISSION_ZONE') p.markedForDeletion = true;
                });
            }

            if (missionCompleteTimerRef.current === 0) {
                trackEvent(runIdRef.current, 'WAVE_COMPLETE', player, metaState, waveIndexRef.current + 1, sessionCurrencyRef.current, Math.floor(frameRef.current / 60));
                projectilesRef.current.push(getProjectile({ id: Math.random().toString(), type: EntityType.PROJECTILE, pos: { ...player.pos }, velocity: { x: 0, y: 0 }, radius: 10, color: 'rgba(0,0,0,0)', markedForDeletion: false, damage: 2000, duration: 20, pierce: 999, knockback: 15, isEnemy: false, sourceWeaponId: 'ancestral_resonance' }));

                let text = "MISSION COMPLETE"; let color = '#00FF00';
                if (missionRef.current.type === MissionType.ENTANGLEMENT && missionRef.current.customData?.cloneAlive === false) { text = "MISSION FAILED"; color = '#FF0000'; }
                particlesRef.current.push(createTextParticle(player.pos, text, color, 120));
                if (mission.type === MissionType.THE_GREAT_FILTER) audioEngine.restoreWaveTheme();
            }
            missionCompleteTimerRef.current++;
            // Fade out mission entities faster since the timer is shorter
            missionEntitiesRef.current.forEach((e: any) => { e.opacity = Math.max(0, (e.opacity || 1) - 0.03); });

            // Reduced from 100 to 50 for faster transition
            if (missionCompleteTimerRef.current > 50) {
                screenShakeRef.current = 0; hitStopRef.current = 0; glitchIntensityRef.current = 0;
                let hasReward = mission.type !== MissionType.SURVIVE && mission.type !== MissionType.SHADOW_STEP;
                if (mission.type === MissionType.ENTANGLEMENT && !mission.customData?.cloneAlive) hasReward = false;

                if (hasReward) {
                    player.level++; player.nextLevelXp = Math.floor(player.nextLevelXp * BALANCE.XP_GROWTH_RATE);
                    generateUpgrades();
                    nextStatusRef.current = 'MISSION_COMPLETE';
                    setIsMissionReward(true);
                    setStatus('LEVEL_UP');
                } else { setStatus('MISSION_COMPLETE'); }
                missionCompleteTimerRef.current = 0; return;
            }
        } else { missionCompleteTimerRef.current = 0; }

        if (currentBosses.length > 0) {
            if (!audioEngine.isBossActive) audioEngine.setBossMode(true);
        } else {
            if (audioEngine.isBossActive) audioEngine.setBossMode(false);
        }

        if (tutorialStep !== 'MOVE') {
            // TRINITY BOSS CHECK: Suppress mobs if any Trinity part is active
            const isTrinityActive = currentBosses.some(b =>
                b.enemyType === EnemyType.BOSS_TRINITY_CUBE ||
                b.enemyType === EnemyType.BOSS_TRINITY_PYRAMID ||
                b.enemyType === EnemyType.BOSS_TRINITY_ORB
            );

            if (!isTrinityActive) {
                spawnTimerRef.current++;
                if (isFrozen) spawnTimerRef.current--;
                else {
                    if (spawnTimerRef.current >= currentWave.spawnRate) {
                        let type = currentWave.types[Math.floor(Math.random() * currentWave.types.length)];

                        // VARIETY INJECTION: 1 in 50 chance (2%) for special enemy on odd waves
                        const currentId = currentWave.id;
                        if (currentId % 2 !== 0 && Math.random() < 0.02) {
                            let pool = SPECIAL_WAVE_POOLS[currentId];
                            // Fallback for higher odd waves (Wave 9+)
                            if (!pool && currentId >= 9) {
                                pool = [EnemyType.ORBITAL_SNIPER];
                            }

                            if (pool && pool.length > 0) {
                                type = pool[Math.floor(Math.random() * pool.length)];
                            }
                        }

                        if (type === EnemyType.SWARMER && Math.random() < 0.4) {
                            const angle = Math.random() * Math.PI * 2; const distance = Math.max(winW, winH) / 1.5 + 50; const centerX = player.pos.x + Math.cos(angle) * distance; const centerY = player.pos.y + Math.sin(angle) * distance; const swarm: Enemy[] = [];
                            for (let i = 0; i < 8; i++) { swarm.push(spawnEnemy(player, type, { x: centerX + (Math.random() - 0.5) * 100, y: centerY + (Math.random() - 0.5) * 100 }, currentWave.id)); }
                            addEnemies(swarm);
                        } else { addEnemies([spawnEnemy(player, type, undefined, currentWave.id)]); }
                        spawnTimerRef.current = 0;
                    }
                }
            }
        }

        if (!representativeBoss && mission.type === MissionType.SURVIVE && waveTimerRef.current === 900) {
            const viewW = window.innerWidth / ZOOM_LEVEL; const viewH = window.innerHeight / ZOOM_LEVEL; const diag = Math.sqrt(viewW * viewW + viewH * viewH); const dist = diag * (1.25 + Math.random() * 0.75); const angle = Math.random() * Math.PI * 2; const spawnPos = { x: player.pos.x + Math.cos(angle) * dist, y: player.pos.y + Math.sin(angle) * dist };
            const hasTemporal = player.weapons.some((w: any) => w.id === 'ancestral_resonance' && w.expiresAt !== undefined && w.expiresAt > frameRef.current);
            pickupsRef.current.push(createSupplyDrop(spawnPos, hasTemporal));
            particlesRef.current.push(createTextParticle(player.pos, "SUPPLY SIGNAL DETECTED", '#ffffff', 90));
        }

        grid.clear(); for (const enemy of enemiesRef.current) grid.add(enemy);

        if (mission.type === MissionType.ENTANGLEMENT && mission.customData?.cloneAlive) {
            const clone = missionEntitiesRef.current.find((e: any) => e.kind === 'CLONE');
            if (clone) {
                for (const enemy of enemiesRef.current) {
                    if (checkCollision(clone, enemy)) {
                        missionRef.current.customData = { ...missionRef.current.customData, cloneAlive: false };
                        particlesRef.current.push(...createShatterParticles(clone.pos, '#00FFFF', 15, 20));
                        particlesRef.current.push(createTextParticle(clone.pos, "LINK LOST", '#FF0000', 90));
                        screenShakeRef.current += 10;
                        clone.markedForDeletion = true;
                        missionEntitiesRef.current = missionEntitiesRef.current.filter((e: any) => e.id !== clone.id);
                        break;
                    }
                }
                for (const proj of projectilesRef.current) {
                    if (proj.isEnemy && !proj.markedForDeletion) {
                        if (checkCollision(clone, proj)) {
                            missionRef.current.customData = { ...missionRef.current.customData, cloneAlive: false };
                            particlesRef.current.push(...createShatterParticles(clone.pos, '#00FFFF', 15, 20));
                            particlesRef.current.push(createTextParticle(clone.pos, "LINK LOST", '#FF0000', 90));
                            screenShakeRef.current += 10;
                            clone.markedForDeletion = true; proj.markedForDeletion = true;
                            missionEntitiesRef.current = missionEntitiesRef.current.filter((e: any) => e.id !== clone.id);
                            break;
                        }
                    }
                }
            }
        }

        player.weapons = player.weapons.filter((w: any) => !w.expiresAt || w.expiresAt > frameRef.current);
        if (mission.type !== MissionType.SHADOW_STEP) {
            const newWeaponProjectiles = updateWeapons(player, enemiesRef.current, projectilesRef.current, (p) => particlesRef.current.push(p));
            projectilesRef.current.push(...newWeaponProjectiles);
            if (replicasRef.current.length > 0) {
                replicasRef.current.forEach((replica: any) => {
                    const replicaProjs = updateWeapons(replica, enemiesRef.current, projectilesRef.current, (p) => particlesRef.current.push(p));
                    projectilesRef.current.push(...replicaProjs);
                });
            }
        }

        const cleanupDistSq = (Math.max(winW, winH) * 1.5) ** 2;
        const projResult = updateProjectiles(projectilesRef.current, player, enemiesRef.current, frameRef.current, cleanupDistSq, isFrozen);

        // Process collisions with obstacles here implicitly via system or explicitly?
        // CollisionSystem now handles it. Just make sure arguments are passed.

        const colResult = resolveCollisions(player, projectilesRef.current, grid, enemiesRef.current, obstaclesRef.current);

        projectilesRef.current.push(...projResult.newProjectiles);
        projectilesRef.current.push(...colResult.newProjectiles);
        particlesRef.current.push(...projResult.newParticles);
        particlesRef.current.push(...colResult.newParticles);

        screenShakeRef.current += projResult.screenShake;
        shockwavesRef.current.push(...projResult.newShockwaves);

        const enemyResult = updateEnemies(enemiesRef.current, player, frameRef.current, grid, isFrozen, obstaclesRef.current);
        addEnemies(enemyResult.newEnemies); enemyResult.newEnemies.forEach(e => grid.add(e));
        projectilesRef.current.push(...enemyResult.newProjectiles); particlesRef.current.push(...enemyResult.newParticles);
        if (enemyResult.screenShake) screenShakeRef.current += enemyResult.screenShake;
        if (enemyResult.playerDamageTaken > 0) {
            player.health -= enemyResult.playerDamageTaken; player.healthPulseTimer = 10; lastDamageSourceRef.current = enemyResult.lastHitter || "Enemy Contact"; particlesRef.current.push(createTextParticle(player.pos, `-${Math.round(enemyResult.playerDamageTaken)}`, '#ff0000')); checkPlayerDeath(); hitStopRef.current = 1; screenShakeRef.current = Math.max(screenShakeRef.current, 2);
        }

        if (colResult.playerDamageTaken > 0) {
            player.health -= colResult.playerDamageTaken; player.healthPulseTimer = 10; lastDamageSourceRef.current = colResult.lastHitter || "Projectile"; checkPlayerDeath(); hitStopRef.current = 1; screenShakeRef.current = Math.max(screenShakeRef.current, 2); particlesRef.current.push(createTextParticle(player.pos, `-${Math.round(colResult.playerDamageTaken)}`, '#ff0000'));
        }

        const pickupResult = updatePickups(pickupsRef.current, player);
        pickupResult.collected.forEach(p => {
            if (p.kind === 'KALEIDOSCOPE') {
                player.kaleidoscopeTimer = 600; particlesRef.current.push(createTextParticle(player.pos, "PRISM ACTIVE (10s)", '#FF00FF', 90)); screenShakeRef.current += 10;
            } else if (p.kind === 'XP') {
                player.xp += p.value * player.stats.xpMult; player.xpPulseTimer = 8; scoreRef.current += p.value;
                if (player.xp >= player.nextLevelXp && !levelUpProcessingRef.current) { levelUpProcessingRef.current = true; levelUpTimerRef.current = 0; }
                audioEngine.playCollectXP();
            } else if (p.kind === 'HEALTH') {
                player.health = Math.min(player.maxHealth, player.health + p.value); player.healthPulseTimer = 10; particlesRef.current.push(createTextParticle(player.pos, `+${p.value}`, '#00ff00'));
            } else if (p.kind === 'CURRENCY') {
                const amount = Math.floor(p.value * player.stats.currencyMult); sessionCurrencyRef.current += amount; particlesRef.current.push(createTextParticle(player.pos, `+${amount} ◆`, '#FFD700'));
            } else if (p.kind === 'TIME_CRYSTAL') {
                replicaTimerRef.current = 480; replicasRef.current = []; particlesRef.current.push(createTextParticle(player.pos, "REPLICAS ONLINE", '#00FFFF', 90)); screenShakeRef.current += 10;
            } else if (p.kind === 'STASIS_FIELD') {
                enemyFreezeTimerRef.current = 300; particlesRef.current.push(createTextParticle(player.pos, "STASIS FIELD", '#0000FF', 90)); screenShakeRef.current += 15;
            } else if (p.kind === 'SUPPLY_DROP') {
                trackEvent(runIdRef.current, 'LOOT_PICKUP', player, metaState, waveIndexRef.current + 1, sessionCurrencyRef.current, Math.floor(frameRef.current / 60), { lootType: p.supplyContent || 'LEVEL_UP' });
                const content = p.supplyContent || 'LEVEL_UP';
                if (content === 'CURRENCY_50') { sessionCurrencyRef.current += 50; particlesRef.current.push(createTextParticle(player.pos, `+50 ◆`, '#FFD700', 60)); }
                else if (content === 'FULL_HEALTH') { player.health = player.maxHealth; player.healthPulseTimer = 15; particlesRef.current.push(createTextParticle(player.pos, `MAX HEALTH`, '#00FF00', 60)); }
                else if (content === 'LEVEL_UP') { player.level++; player.xp = 0; player.nextLevelXp = Math.floor(player.nextLevelXp * BALANCE.XP_GROWTH_RATE); setStatus('LEVEL_UP'); generateUpgrades(); particlesRef.current.push(createTextParticle(player.pos, "SYSTEM UPGRADE", '#FFFFFF', 60)); }
                else if (content === 'EXTRA_LIFE') { player.extraLives += 1; particlesRef.current.push(createTextParticle(player.pos, "EXTRA LIFE", '#FFFFFF', 90)); }
                else { particlesRef.current.push(createTextParticle(player.pos, "ANCESTRAL RESONANCE (30s)", '#ff6600', 90)); const tempWeapon = { ...BASE_WEAPONS.ancestral_resonance, expiresAt: frameRef.current + (30 * 60) }; player.weapons.push(tempWeapon); }
            } else {
                const missionRes = handleMissionPickup(missionRef.current, p.kind, p.pos, player);

                // If entering WAIT state (Data Run), cancel deletion and flag pickup
                if (missionRes.mission.stage === 'UPLOAD_COMPLETE_WAIT' && p.kind === 'MISSION_ZONE') {
                    p.markedForDeletion = false;
                    (p as any).isUploading = true; // Flag for renderer and system
                } else if (missionRes.newPickups.length > 0 || missionRes.newParticles.length > 0 || missionRes.isComplete) {
                    // Standard update for other cases
                    pickupsRef.current.push(...missionRes.newPickups);
                }

                missionRef.current = missionRes.mission;
                if (missionRes.isComplete) missionRef.current.isComplete = true;

                missionRes.newParticles.forEach((pt: any) => particlesRef.current.push(createTextParticle(pt.pos, pt.text, pt.color, pt.duration)));
            }
        });

        const newSpawns: Enemy[] = [];
        enemiesRef.current = enemiesRef.current.filter((e: Enemy) => {
            if (e.health <= 0) {
                scoreRef.current += e.xpValue * 10; killsRef.current++; audioEngine.playEnemyDeath();
                if (missionCompleteTimerRef.current === 0) pickupsRef.current.push(createXP(e.pos, e.xpValue));
                if (e.deathColor && missionCompleteTimerRef.current === 0) {
                    if (e.deathColor === 'RED') pickupsRef.current.push(createHealthPickup(e.pos));
                    else if (e.deathColor === 'GREEN') pickupsRef.current.push(createXP(e.pos, e.xpValue * 5));
                    else if (e.deathColor === 'BLUE') pickupsRef.current.push(createCurrency(e.pos, 5));
                }
                particlesRef.current.push(...createShatterParticles(e.pos, e.color, 5, e.radius));
                if ((mission.type === MissionType.ELIMINATE) && e.isMissionTarget) { missionRef.current.progress++; particlesRef.current.push(createTextParticle(e.pos, "TARGET ELIMINATED", '#FF0000', 45)); }
                dropsCounterRef.current++;
                if (dropsCounterRef.current > 50) { dropsCounterRef.current = 0; if (missionCompleteTimerRef.current === 0) pickupsRef.current.push(createCurrency(e.pos, 10)); }
                if (e.isBoss) {
                    // Check if this boss is part of The Trinity
                    if (e.trinityData) {
                        const siblingsAlive = enemiesRef.current.some(s => s.trinityData && s.id !== e.id && s.health > 0);
                        if (!siblingsAlive) {
                            bossesDefeatedRef.current.add(EnemyType.BOSS_TRINITY);
                            // All parts dead, stop boss audio mode
                            audioEngine.setBossMode(false);
                        }
                    } else {
                        bossesDefeatedRef.current.add(e.enemyType);
                        // Single boss dead, stop boss audio mode
                        audioEngine.setBossMode(false);
                    }

                    pickupsRef.current.push(createHealthPickup(e.pos));
                    projectilesRef.current.push(...createBossDeathExplosion(e.pos));
                    screenShakeRef.current = 40;

                    audioEngine.playExplosion();
                    hitStopRef.current = 10;
                    glitchIntensityRef.current = 30;
                    shockwavesRef.current.push({ id: Math.random().toString(), pos: { ...e.pos }, time: 0, maxDuration: 120, maxRadius: 1000, strength: 150 });
                }

                // --- MANDELBROT MITE SPLIT ---
                if (e.enemyType === EnemyType.MANDELBROT_MITE) {
                    const gen = e.miteData?.generation || 0;
                    if (gen < 2) { // 3 Generations total (0, 1, 2)
                        for (let i = 0; i < 3; i++) {
                            // Offset children slightly
                            const offsetA = (i / 3) * Math.PI * 2;
                            const offsetR = e.radius;
                            const childPos = {
                                x: e.pos.x + Math.cos(offsetA) * offsetR,
                                y: e.pos.y + Math.sin(offsetA) * offsetR
                            };

                            // Manually spawn child
                            // We use spawnEnemy helper, but need to manually override props after
                            const child = spawnEnemy(playerRef.current, EnemyType.MANDELBROT_MITE, childPos, waveIndexRef.current + 1);
                            child.miteData = { generation: gen + 1 };
                            child.radius = e.radius * 0.7; // Smaller
                            child.maxHealth = e.maxHealth * 0.6; // Weaker
                            child.health = child.maxHealth;
                            child.xpValue = Math.ceil(e.xpValue * 0.5);
                            child.speed = e.speed * 1.2; // Faster

                            newSpawns.push(child);
                        }
                    }
                }

                if (e.enemyType === EnemyType.FERROFLUID_SLIME && e.radius >= 20) {
                    for (let i = 0; i < 2; i++) {
                        const child = spawnEnemy(playerRef.current, EnemyType.FERROFLUID_SLIME, { ...e.pos }, waveIndexRef.current + 1);
                        child.radius = e.radius * 0.7; child.maxHealth = e.maxHealth * 0.6; child.health = child.maxHealth; child.speed = e.speed * 1.2;
                        const angle = (Math.PI * 2 / 2) * i + Math.random(); child.pos.x += Math.cos(angle) * e.radius; child.pos.y += Math.sin(angle) * e.radius; child.immuneTimers['spawn'] = 10;
                        newSpawns.push(child);
                    }
                }
                return false;
            }
            return !e.markedForDeletion;
        });
        addEnemies(newSpawns);

        const keptProjectiles: Projectile[] = [];
        projectilesRef.current.forEach((p: any) => { if (p.markedForDeletion) projectilePool.release(p); else keptProjectiles.push(p); });
        projectilesRef.current = keptProjectiles;
        pickupsRef.current = pickupsRef.current.filter((p: any) => !p.markedForDeletion);
        const keptParticles: (TextParticle | VisualParticle)[] = [];
        particlesRef.current.forEach((p: any) => {
            if (p.type === EntityType.TEXT_PARTICLE) { const tp = p as TextParticle; tp.pos.y += tp.velocity.y; tp.life--; if (tp.life <= 0) tp.markedForDeletion = true; else tp.opacity = Math.min(1, tp.life / 30); }
            else { const vp = p as VisualParticle; vp.pos.x += vp.velocity.x; vp.pos.y += vp.velocity.y; vp.velocity.x *= vp.decay; vp.velocity.y *= vp.decay; if (vp.rotation !== undefined && vp.rotationSpeed !== undefined) vp.rotation += vp.rotationSpeed; vp.life--; if (vp.life <= 0) vp.markedForDeletion = true; }
            if (p.markedForDeletion) { if (p.type === EntityType.TEXT_PARTICLE) textParticlePool.release(p as TextParticle); else if (p.type === EntityType.VISUAL_PARTICLE) visualParticlePool.release(p as VisualParticle); } else keptParticles.push(p);
        });
        particlesRef.current = keptParticles;

        setActiveBosses(currentBosses);
        setUiStats({ health: player.health, maxHealth: player.maxHealth, level: player.level, xp: player.xp, nextXp: player.nextLevelXp, score: scoreRef.current, currency: sessionCurrencyRef.current, runTime: Math.floor(frameRef.current / 60) });
        setWaveInfo({ id: currentWave.id, boss: currentWave.boss, mission: { ...missionRef.current } });
        setInventory([...player.weapons]);
        setArtifacts([...player.artifacts]);
        audioEngine.updateWeaponMix(player.weapons);

        audioEngine.forceBreakdown = missionRef.current.type === MissionType.SHADOW_STEP;
        audioEngine.detuneAmount = missionRef.current.type === MissionType.SHADOW_STEP ? 0.5 : 0;
        audioEngine.accentVolume = missionRef.current.type === MissionType.ELIMINATE ? 0.05 : 0;
        // Set Shadow Step state
        audioEngine.isShadowStep = missionRef.current.type === MissionType.SHADOW_STEP;

        if (missionRef.current.type === MissionType.RITUAL_CIRCLE || missionRef.current.type === MissionType.ENTANGLEMENT) {
            audioEngine.overtureVolume = 0.15;
        } else { audioEngine.overtureVolume = 0; }
        if ((missionRef.current.type === MissionType.DATA_RUN && missionRef.current.stage === 'UPLOAD_DATA') ||
            (missionRef.current.type === MissionType.KING_OF_THE_HILL && missionRef.current.progress > 0)) {
            audioEngine.gateIntensity = 0.6;
        } else { audioEngine.gateIntensity = 0; }

    }, [status, showDebug, generateUpgrades, gameOver, tutorialStep, addEnemies]);

    useEffect(() => {
        let animationId: number;
        let lastTime = performance.now();
        let accumulator = 0;
        const FIXED_TIMESTEP = 1000 / 60; const GAME_SPEED = 0.8;

        const loop = (currentTime: number) => {
            const deltaTime = currentTime - lastTime; lastTime = currentTime; const safeDelta = Math.min(deltaTime, 250); accumulator += safeDelta * GAME_SPEED;
            while (accumulator >= FIXED_TIMESTEP) { if (status !== 'MENU') { if (status === 'PLAYING' && !showDebug) { if (hitStopRef.current > 0) hitStopRef.current--; else update(); } frameRef.current++; } accumulator -= FIXED_TIMESTEP; }
            if (glitchIntensityRef.current > 0.1) glitchIntensityRef.current *= 0.9; else glitchIntensityRef.current = 0;

            if (canvasRef.current && status !== 'MENU') {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    let targets: { pos: { x: number, y: number }, color: string, label?: string }[] = [];
                    const m = missionRef.current;
                    if (m.type === MissionType.ELIMINATE) { enemiesRef.current.forEach((e: any) => { if (e.isMissionTarget) targets.push({ pos: e.pos, color: '#ff0000' }); }); }
                    else if (m.type === MissionType.DATA_RUN && m.targetIds) { pickupsRef.current.forEach((p: any) => { if (m.targetIds?.includes(p.id)) targets.push({ pos: p.pos, color: p.kind === 'MISSION_ZONE' ? '#00FF00' : '#00FFFF' }); }); }
                    else if (m.type === MissionType.KING_OF_THE_HILL || m.type === MissionType.PAYLOAD_ESCORT || m.type === MissionType.RITUAL_CIRCLE || m.type === MissionType.ENTANGLEMENT || m.type === MissionType.THE_GREAT_FILTER) {
                        missionEntitiesRef.current.forEach((e: any) => {
                            if (m.type === MissionType.RITUAL_CIRCLE && e.kind === 'OBELISK' && e.active) return;
                            if (m.type === MissionType.PAYLOAD_ESCORT && e.kind === 'STATION') return;
                            if (m.type === MissionType.ENTANGLEMENT && e.kind === 'CLONE') return;

                            let color = e.color;
                            let label: string | undefined;
                            if (e.kind === 'FILTER_WAVE') {
                                if (e.filterData) {
                                    const normX = Math.cos(e.filterData.angle); const normY = Math.sin(e.filterData.angle);
                                    const pdx = playerRef.current.pos.x - e.pos.x; const pdy = playerRef.current.pos.y - e.pos.y;
                                    if (pdx * normX + pdy * normY < 0) return;
                                }
                                label = "SAFE ZONE"; color = '#00FF00';
                            }
                            targets.push({ pos: e.pos, color: color, label });
                        });
                    }

                    let tutorialPickup: Pickup | null = null;
                    if (tutorialStep === 'COLLECT') {
                        let closestDistSq = Infinity; const pp = playerRef.current.pos;
                        for (const p of pickupsRef.current) {
                            if (p.kind === 'XP') {
                                const dSq = (p.pos.x - pp.x) ** 2 + (p.pos.y - pp.y) ** 2;
                                if (dSq < closestDistSq) { closestDistSq = dSq; tutorialPickup = p; }
                            }
                        }
                    }

                    renderGame(
                        ctx, canvasRef.current.width, canvasRef.current.height, cameraRef.current, playerRef.current, enemiesRef.current, projectilesRef.current, pickupsRef.current, particlesRef.current, frameRef.current, screenShakeRef.current,
                        targets, missionEntitiesRef.current, undefined, { current: missionRef.current.progress, total: missionRef.current.total }, missionRef.current.type,
                        glitchIntensityRef.current, currentPaletteRef.current, tutorialPickup, shockwavesRef.current, replicasRef.current, enemyFreezeTimerRef.current > 0, redFlashTimerRef.current,
                        obstaclesRef.current, waveIndexRef.current + 1 // Pass Obstacles + current Wave ID (1-based)
                    );
                }
            }
            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationId);
    }, [status, update, tutorialStep]);

    return {
        status, setStatus,
        uiStats, waveInfo, inventory, artifacts, activeBoss: activeBosses.length > 0 ? activeBosses[0] : null, activeBosses, levelUpOptions, gameOverInfo, showDebug, setShowDebug,
        startGame, selectUpgrade, generateDebugOptions, handleDebugSpawn, togglePause, handleDebugMission, advanceWave,
        getNextMissionInfo, tutorialStep, isMissionReward, handleAdReward, augmentTarget, applyAugment,
        handleDebugPickup
    };
};
