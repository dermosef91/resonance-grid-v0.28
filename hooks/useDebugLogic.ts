
import { useCallback } from 'react';
import { UpgradeOption, EnemyType, MissionType, EntityType, WaveConfig, Enemy } from '../types';
import { BASE_WEAPONS, BASE_ARTIFACTS, GLITCH_UPGRADES, WEAPON_UPGRADE_TABLE } from '../services/gameData';
import { BALANCE } from '../constants';
import { spawnEnemy, createTextParticle, createXP, createHealthPickup, createCurrency, createTimeCrystal, createStasisFieldPickup, createSupplyDrop, createMissionPickup, createEventHorizon, createKaleidoscopePickup } from '../services/gameLogic';
import { saveMetaState, resetMetaState as wipeSave } from '../services/persistence';
import { initMissionState } from '../services/systems/MissionSystem';
import { audioEngine } from '../services/audioEngine';

export const useDebugLogic = (gameState: any, addEnemies: any) => {
    const {
        playerRef,
        particlesRef,
        pickupsRef,
        projectilesRef,
        missionEntitiesRef,
        missionRef,
        waveIndexRef,
        sessionCurrencyRef,
        screenShakeRef,
        redFlashTimerRef,

        setStatus,
        setShowDebug,
        setAugmentTarget,
        setWaveInfo
    } = gameState;

    const generateDebugOptions = useCallback((): UpgradeOption[] => {
        const player = playerRef.current;
        const opts: UpgradeOption[] = [];
        Object.values(BASE_WEAPONS).forEach(w => {
            const existing = player.weapons.find((pw: any) => pw.id === w.id);

            if (existing && existing.level === 4) {
                opts.push({
                    id: `debug_${w.id}_augment`,
                    name: `${w.name} (Lvl 4 -> 5 AUGMENT)`,
                    description: "TRIGGER AUGMENT SELECTION",
                    type: 'AUGMENT_TRIGGER',
                    rarity: 'UNCOMMON',
                    color: w.color,
                    apply: (p) => {
                        setAugmentTarget(existing);
                        setStatus('AUGMENT_SELECT');
                        setShowDebug(false);
                    }
                });
                return;
            }

            const name = existing ? `${w.name} (Lvl ${existing.level} -> ${existing.level + 1})` : `Add ${w.name}`;
            opts.push({
                id: `debug_${w.id}`, name, description: existing ? "Force level up" : "Force unlock/add", type: 'WEAPON_NEW', rarity: 'COMMON', color: w.color,
                apply: (p) => {
                    const weapon = p.weapons.find((pw: any) => pw.id === w.id);
                    if (weapon) {
                        weapon.level++;
                        const progression = WEAPON_UPGRADE_TABLE[w.id]?.[weapon.level];
                        if (progression) progression.apply(weapon); else weapon.damage *= 1.1;
                    } else { p.weapons.push({ ...BASE_WEAPONS[w.id] }); }
                }
            });
        });
        Object.values(BASE_ARTIFACTS).forEach(a => { if (!player.artifacts.includes(a.id)) opts.push(a); });
        GLITCH_UPGRADES.forEach(g => opts.push(g));
        opts.push({ id: 'heal_full', name: 'Heal Full', description: 'Heal 100%', type: 'STAT', rarity: 'COMMON', color: '#00ff00', apply: (p) => { p.health = p.maxHealth; p.healthPulseTimer = 15; } });
        opts.push({ id: 'extra_life', name: '+1 Life', description: 'Add Extra Life', type: 'STAT', rarity: 'LEGENDARY', color: '#FF0088', apply: (p) => { p.extraLives += 1; } });
        opts.push({ id: 'level_up_cheat', name: 'Force Level Up', description: '+1 Level', type: 'STAT', rarity: 'COMMON', color: '#ffffff', apply: (p) => { p.level++; p.xp = 0; p.nextLevelXp = Math.floor(p.nextLevelXp * BALANCE.XP_GROWTH_RATE); } });
        opts.push({ id: 'currency_1000', name: '+1000 Chips', description: 'Add Currency', type: 'STAT', rarity: 'LEGENDARY', color: '#FFD700', apply: (p) => { sessionCurrencyRef.current += 1000; } });
        opts.push({ id: 'complete_mission', name: 'FORCE MISSION COMPLETE', description: 'Advance to next wave', type: 'GLITCH', rarity: 'GLITCH', color: '#00ffff', apply: (p) => { missionRef.current.isComplete = true; } });
        opts.push({ id: 'reset_save', name: 'RESET SAVE', description: 'Delete data & Reload', type: 'GLITCH', rarity: 'GLITCH', color: '#ff0000', apply: (p) => { wipeSave(); } });
        return opts;
    }, []);

    const handleDebugSpawn = (type: EnemyType) => {
        const player = playerRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = type === EnemyType.BOSS_AIDO_HWEDO ? 900 : 300;
        const cx = player.pos.x + Math.cos(angle) * dist;
        const cy = player.pos.y + Math.sin(angle) * dist;

        if (type === EnemyType.BOSS_TRINITY) {
            const parts: EnemyType[] = [EnemyType.BOSS_TRINITY_CUBE, EnemyType.BOSS_TRINITY_PYRAMID, EnemyType.BOSS_TRINITY_ORB];
            const spawnedParts: Enemy[] = [];

            parts.forEach((partType, i) => {
                const offsetAngle = (i / 3) * Math.PI * 2;
                const offsetR = 100;
                const px = cx + Math.cos(offsetAngle) * offsetR;
                const py = cy + Math.sin(offsetAngle) * offsetR;

                const enemy = spawnEnemy(player, partType, { x: px, y: py }, waveIndexRef.current + 1);
                enemy.trinityData = {
                    role: i === 0 ? 'AGGRESSOR' : 'SUPPORT',
                    siblings: [],
                    type: i === 0 ? 'CUBE' : (i === 1 ? 'PYRAMID' : 'ORB')
                };
                spawnedParts.push(enemy);
            });

            const ids = spawnedParts.map(e => e.id);
            spawnedParts.forEach(e => {
                if (e.trinityData) e.trinityData.siblings = ids.filter(id => id !== e.id);
            });

            addEnemies(spawnedParts);
            particlesRef.current.push(createTextParticle({ x: cx, y: cy }, "TRINITY SPAWNED", '#ff0000'));
            return;
        }

        const spawnPos = { x: cx, y: cy };
        addEnemies([spawnEnemy(player, type, spawnPos, waveIndexRef.current + 1)]);
        particlesRef.current.push(createTextParticle(spawnPos, "DEBUG SPAWN", '#ff00ff'));
    };

    const handleDebugMission = (type: MissionType) => {
        missionEntitiesRef.current = [];
        pickupsRef.current = pickupsRef.current.filter((p: any) => p.kind !== 'MISSION_ITEM' && p.kind !== 'MISSION_ZONE');
        const dummyWave: WaveConfig = { id: waveIndexRef.current + 1, spawnRate: 20, types: [EnemyType.DRONE], missionType: type, missionParam: 60 };
        if (type === MissionType.ELIMINATE) dummyWave.missionParam = 5;
        if (type === MissionType.KING_OF_THE_HILL) dummyWave.missionParam = 1000;
        if (type === MissionType.SHADOW_STEP) dummyWave.missionParam = 30;
        const { mission, entities, pickups } = initMissionState(dummyWave, playerRef.current);
        missionRef.current = mission;
        missionEntitiesRef.current = entities;
        pickupsRef.current.push(...pickups);
        setWaveInfo((prev: any) => ({ ...prev, mission: { ...mission } }));

        if (type === MissionType.THE_GREAT_FILTER) {
            audioEngine.setTheme('MIND_FLAYER');
            redFlashTimerRef.current = 120; // Trigger warning on debug start too
            screenShakeRef.current = 20;
        }

        particlesRef.current.push(createTextParticle(playerRef.current.pos, `MISSION: ${type}`, '#00FFFF', 120));
    };

    const handleDebugPickup = (kind: string) => {
        const p = playerRef.current;
        const pos = { x: p.pos.x + (Math.random() - 0.5) * 100, y: p.pos.y + (Math.random() - 0.5) * 100 };

        let pickup;
        if (kind === 'XP_SMALL') pickup = createXP(pos, 10);
        else if (kind === 'XP_LARGE') pickup = createXP(pos, 500);
        else if (kind === 'HEALTH') pickup = createHealthPickup(pos);
        else if (kind === 'CURRENCY') pickup = createCurrency(pos, 100);
        else if (kind === 'TIME_CRYSTAL') pickup = createTimeCrystal(pos);
        else if (kind === 'STASIS_FIELD') pickup = createStasisFieldPickup(pos);
        else if (kind === 'SUPPLY_DROP') pickup = createSupplyDrop(pos);
        else if (kind === 'MISSION_ITEM') pickup = createMissionPickup(pos, 'MISSION_ITEM');
        else if (kind === 'MISSION_ZONE') pickup = createMissionPickup(pos, 'MISSION_ZONE');

        if (kind === 'EVENT_HORIZON') {
            projectilesRef.current.push(createEventHorizon(pos));
            particlesRef.current.push(createTextParticle(pos, "SPAWNED SINGULARITY", '#000000'));
            return;
        }

        if (kind === 'KALEIDOSCOPE') {
            pickupsRef.current.push(createKaleidoscopePickup(pos));
            particlesRef.current.push(createTextParticle(pos, "SPAWNED PRISM", '#FF00FF'));
            return;
        }

        if (pickup) {
            pickupsRef.current.push(pickup);
            particlesRef.current.push(createTextParticle(pos, `SPAWNED ${kind}`, '#FFFFFF'));
        }
    };

    return { generateDebugOptions, handleDebugSpawn, handleDebugMission, handleDebugPickup };
};
