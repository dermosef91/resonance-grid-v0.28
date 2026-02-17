
import { WaveConfig, MissionType, EnemyType } from '../../types';

// --- Wave Configuration ---
// Pattern: Survive -> Mission -> Survive -> Mission -> Survive -> Boss
// Enemy Composition switches every 2 steps.

// Enemy Compositions
const GRP_1 = [EnemyType.DRONE];
const GRP_2 = [EnemyType.DRONE, EnemyType.SWARMER];
const GRP_3 = [EnemyType.SENTINEL, EnemyType.ELITE_DRONE]; // Pre-Boss 1
const GRP_4 = [EnemyType.TANK, EnemyType.GHOST, EnemyType.DRONE]; // Added Drone
const GRP_5 = [EnemyType.BINARY_SENTINEL, EnemyType.NEON_COBRA, EnemyType.ELITE_DRONE];
const GRP_6 = [EnemyType.LANCER, EnemyType.TANK, EnemyType.UTATU];
const GRP_6_BOSS = [EnemyType.LANCER, EnemyType.TANK]; // No Utatus for Boss Fight
const GRP_7 = [EnemyType.SENTINEL, EnemyType.LASER_LOTUS, EnemyType.MANDELBROT_MITE]; // Added Mandelbrot Mite
const GRP_8 = [EnemyType.ORBITAL_SNIPER, EnemyType.INFERNO_SPINNER];
const GRP_9 = [EnemyType.NEON_COBRA, EnemyType.LASER_LOTUS, EnemyType.BINARY_SENTINEL]; // Pre-Boss 3

const MISSION_POOL = [
    MissionType.DATA_RUN,
    MissionType.ELIMINATE,
    MissionType.KING_OF_THE_HILL,
    MissionType.PAYLOAD_ESCORT,
    MissionType.RITUAL_CIRCLE,
    MissionType.SHADOW_STEP,
    MissionType.ENTANGLEMENT,
    MissionType.THE_GREAT_FILTER,
    MissionType.EVENT_HORIZON
];

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export const generateRunWaves = (): WaveConfig[] => {
    const pool = shuffleArray([...MISSION_POOL]);

    // Helper to scale mission parameters based on "difficulty" (1-5)
    const getParam = (type: MissionType, difficulty: number): number => {
        switch (type) {
            case MissionType.SURVIVE: return 45 + (difficulty * 15);
            case MissionType.ELIMINATE: return 2 + Math.floor(difficulty);
            case MissionType.KING_OF_THE_HILL: return 720 + (difficulty * 60); // 12s + 1s per diff
            case MissionType.SHADOW_STEP: return 20; // Reduced to 20s
            case MissionType.EVENT_HORIZON: return 30 + (difficulty * 2); // Reduced from 45 + diff*5
            // No param needed for these:
            case MissionType.DATA_RUN:
            case MissionType.PAYLOAD_ESCORT:
            case MissionType.RITUAL_CIRCLE:
            case MissionType.ENTANGLEMENT:
            case MissionType.THE_GREAT_FILTER:
            default: return 0;
        }
    };

    // Distribute missions from the pool
    const m1 = pool[0];
    const m2 = pool[1];
    const m3 = pool[2];
    const m4 = pool[3];
    const m5 = pool[4];
    const m6 = pool[5] || pool[0];

    const waves: WaveConfig[] = [
        // BLOCK 1: Intro (Enemies: Basic)
        {
            id: 1,
            missionType: MissionType.SURVIVE,
            missionParam: 45,
            spawnRate: 25,
            types: GRP_1
        },
        // WAVE 2: First Mission (Was Shango)
        {
            id: 2,
            missionType: m1,
            missionParam: getParam(m1, 1),
            spawnRate: 20,
            types: GRP_1
        },

        // BLOCK 2: Swarm (Enemies: Swarmers)
        {
            id: 3,
            missionType: MissionType.SURVIVE,
            missionParam: 45,
            spawnRate: 15,
            types: GRP_2
        },
        {
            id: 4,
            missionType: m2,
            missionParam: getParam(m2, 2),
            spawnRate: 15,
            types: GRP_2
        },

        // BLOCK 3: Elites & Boss 1
        {
            id: 5,
            missionType: MissionType.SURVIVE,
            missionParam: 45,
            spawnRate: 20,
            types: GRP_3
        },
        {
            id: 6,
            missionType: MissionType.BOSS,
            missionParam: 0,
            spawnRate: 35,
            types: GRP_3,
            boss: EnemyType.BOSS_VANGUARD
        },

        // BLOCK 4: Heavies (Enemies: Tanks/Ghosts)
        {
            id: 7,
            missionType: MissionType.SURVIVE,
            missionParam: 45,
            spawnRate: 18,
            types: GRP_4
        },
        {
            id: 8,
            missionType: m3,
            missionParam: getParam(m3, 3),
            spawnRate: 15,
            types: GRP_4
        },

        // BLOCK 5: Fast Movers (Enemies: Lancer/Cobra)
        {
            id: 9,
            missionType: MissionType.SURVIVE,
            missionParam: 60,
            spawnRate: 12,
            types: GRP_5
        },
        {
            id: 10,
            missionType: m4,
            missionParam: getParam(m4, 4),
            spawnRate: 10,
            types: GRP_5
        },

        // BLOCK 6: Tech & Boss 2 (Shango)
        {
            id: 11,
            missionType: MissionType.SURVIVE,
            missionParam: 60,
            spawnRate: 20,
            types: GRP_6
        },
        {
            id: 12,
            missionType: MissionType.BOSS,
            missionParam: 0,
            spawnRate: 26,
            types: GRP_6_BOSS,
            boss: EnemyType.BOSS_SHANGO
        },

        // BLOCK 7: AoE Threats
        {
            id: 13,
            missionType: MissionType.SURVIVE,
            missionParam: 60,
            spawnRate: 15,
            types: GRP_7
        },
        {
            id: 14,
            missionType: m5,
            missionParam: getParam(m5, 5),
            spawnRate: 12,
            types: GRP_7
        },

        // BLOCK 8: The Trinity (Wave 15)
        {
            id: 15,
            missionType: MissionType.BOSS,
            missionParam: 0,
            spawnRate: 25,
            types: GRP_8,
            boss: EnemyType.BOSS_TRINITY
        },

        // BLOCK 9: Chaos & High Tech
        {
            id: 16,
            missionType: MissionType.SURVIVE,
            missionParam: 90,
            spawnRate: 10,
            types: GRP_8
        },
        {
            id: 17,
            missionType: m6,
            missionParam: getParam(m6, 6),
            spawnRate: 8,
            types: GRP_9
        },

        // BLOCK 10: Intense Survival (Replaced Aido Boss here)
        {
            id: 18,
            missionType: MissionType.SURVIVE,
            missionParam: 90,
            spawnRate: 8,
            types: GRP_9
        },

        // BLOCK 11: Pre-Boss Elimination
        {
            id: 19,
            missionType: MissionType.ELIMINATE,
            missionParam: 12,
            spawnRate: 8,
            types: GRP_9
        },

        // BLOCK 12: Boss 4 (Aido Hwedo) - Moved to Wave 20 Finale
        {
            id: 20,
            missionType: MissionType.BOSS,
            missionParam: 0,
            spawnRate: 25,
            types: GRP_9,
            boss: EnemyType.BOSS_AIDO_HWEDO
        }
    ];

    const LATE_GAME_GROUPS = [
        [EnemyType.TANK, EnemyType.ORBITAL_SNIPER, EnemyType.SWARMER],
        [EnemyType.BINARY_SENTINEL, EnemyType.ELITE_DRONE, EnemyType.NEON_COBRA], // Replaced Viral Host with Elite Drone
        [EnemyType.INFERNO_SPINNER, EnemyType.LANCER, EnemyType.GHOST],
        [EnemyType.LASER_LOTUS, EnemyType.SENTINEL, EnemyType.DRONE], // Replaced Void Jelly with Sentinel
        [EnemyType.TANK, EnemyType.SENTINEL, EnemyType.ELITE_DRONE], // Removed Logic Bomb
        [EnemyType.TANK, EnemyType.INFERNO_SPINNER, EnemyType.MANDELBROT_MITE], // Replaced Swarmer with Mite in this mix
        [EnemyType.ORBITAL_SNIPER, EnemyType.GHOST, EnemyType.NEON_COBRA],
        [EnemyType.ELITE_DRONE, EnemyType.SWARMER, EnemyType.BINARY_SENTINEL], // Replaced Void Jelly with Elite Drone
        [EnemyType.UTATU, EnemyType.TANK, EnemyType.MANDELBROT_MITE]
    ];

    // Generate up to 100 waves for endless play
    // Pattern: 21(Survive) -> 22(Mission) ...
    for (let i = 21; i <= 100; i++) {
        const difficulty = Math.floor((i - 20) / 2); // Scales slowly
        const isMission = i % 2 === 0; // Even = Mission, Odd = Survive

        const enemyGroup = LATE_GAME_GROUPS[Math.floor(Math.random() * LATE_GAME_GROUPS.length)];
        // Spawn rate gets faster (lower number) as difficulty increases, clamped at 5
        const spawnRate = Math.max(5, 10 - Math.floor(difficulty * 0.2));

        if (isMission) {
            const mType = MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
            let param = 0;
            if (mType === MissionType.ELIMINATE) param = 3 + Math.floor(difficulty * 0.5);
            else if (mType === MissionType.KING_OF_THE_HILL) param = 720 + (difficulty * 30);
            else if (mType === MissionType.SHADOW_STEP) param = 20; // 20s
            else if (mType === MissionType.EVENT_HORIZON) param = 30 + (difficulty * 2);

            waves.push({
                id: i,
                missionType: mType,
                missionParam: param,
                spawnRate: spawnRate,
                types: enemyGroup
            });
        } else {
            // Survival Wave
            waves.push({
                id: i,
                missionType: MissionType.SURVIVE,
                missionParam: 60, // Fixed 1 minute survival between missions
                spawnRate: spawnRate,
                types: enemyGroup
            });
        }
    }

    return waves;
};
