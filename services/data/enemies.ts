
import { EnemyType } from '../../types';

// --- MASS CONFIGURATION ---
// Ratio = OtherMass / (MyMass + OtherMass)
export const MASS: Record<string, number> = {
    [EnemyType.SWARMER]: 0.5,
    [EnemyType.MANDELBROT_MITE]: 0.5,
    [EnemyType.DRONE]: 2,
    [EnemyType.NEON_COBRA]: 3,
    [EnemyType.ORBITAL_SNIPER]: 3,
    [EnemyType.GHOST]: 4,
    [EnemyType.SENTINEL]: 5,
    [EnemyType.LANCER]: 6,
    [EnemyType.ELITE_DRONE]: 8,
    [EnemyType.INFERNO_SPINNER]: 12,
    [EnemyType.BINARY_SENTINEL]: 15,
    [EnemyType.TANK]: 30,
    [EnemyType.PRISMATIC_MONOLITH]: 100, // Very Heavy
    [EnemyType.LASER_LOTUS]: 300,
    [EnemyType.UTATU]: 25,

    // Bosses
    [EnemyType.BOSS_VANGUARD]: 1000,
    [EnemyType.BOSS_HIVE_MIND]: 2000,
    [EnemyType.BOSS_CYBER_KRAKEN]: 5000,
    [EnemyType.BOSS_SHANGO]: 4000,
    [EnemyType.BOSS_AIDO_HWEDO]: 8000,

    // Trinity Parts
    [EnemyType.BOSS_TRINITY_CUBE]: 3000,
    [EnemyType.BOSS_TRINITY_PYRAMID]: 3000,
    [EnemyType.BOSS_TRINITY_ORB]: 3000,
};

// --- COMPLETE ENEMY DATABASE ---
// SYNCED WITH gameLogic.ts values
export const ALL_ENEMIES_DB = [
    // Standard Units
    {
        type: EnemyType.DRONE, name: "Drone", hp: 20, speed: 2.7, damage: 35, xp: 1, radius: 15, color: '#ff6600',
        desc: "Basic tracking unit.", waves: "1, 2, 3, 4", included: true
    },
    {
        type: EnemyType.SWARMER, name: "Swarmer", hp: 5, speed: 5, damage: 20, xp: 1, radius: 10, color: '#FF00FF',
        desc: "Fast, weak unit that attacks in groups.", waves: "2, 3, 5, 7, Boss Minion", included: true
    },
    {
        type: EnemyType.SENTINEL, name: "Sentinel", hp: 40, speed: 2.25, damage: 20, xp: 15, radius: 20, color: '#FF0000',
        desc: "Stops to shoot projectiles at the player.", waves: "3", included: true
    },
    {
        type: EnemyType.ELITE_DRONE, name: "Elite Drone", hp: 60, speed: 3.3, damage: 40, xp: 5, radius: 18, color: '#ff9900',
        desc: "Upgraded drone with higher stats.", waves: "3, 10", included: true
    },
    {
        type: EnemyType.TANK, name: "Tank", hp: 600, speed: 1.2, damage: 50, xp: 30, radius: 45, color: '#ff6600',
        desc: "High health, slow movement. Resistant to knockback.", waves: "5, 8, 10", included: true
    },
    {
        type: EnemyType.GHOST, name: "Phase Stalker", hp: 20, speed: 2, damage: 35, xp: 15, radius: 16, color: '#ff00ff',
        desc: "Cycles between slow/visible and fast/invisible states.", waves: "5, 6, 7", included: true
    },
    {
        type: EnemyType.LANCER, name: "Lancer", hp: 40, speed: 1.5, damage: 35, xp: 20, radius: 14, color: '#FF0055',
        desc: "Rotates to face player, then charges rapidly.", waves: "11, 12", included: true
    },

    // New / Advanced Units
    {
        type: EnemyType.NEON_COBRA, name: "Neon Cobra", hp: 60, speed: 5, damage: 40, xp: 15, radius: 18, color: '#FF00CC',
        desc: "Fast, winding movement.", waves: "9, 10", included: true
    },
    {
        type: EnemyType.INFERNO_SPINNER, name: "Solar Sawblade", hp: 90, speed: 3.5, damage: 50, xp: 12, radius: 44, color: '#ff4400',
        desc: "A spinning reactor core with three super-heated blades.", waves: "15, 16", included: true
    },
    {
        type: EnemyType.BINARY_SENTINEL, name: "Gemini Link", hp: 150, speed: 2.0, damage: 30, xp: 25, radius: 40, color: '#00ffff',
        desc: "Two units connected by a lethal electric tether.", waves: "9, 10", included: true
    },
    {
        type: EnemyType.LASER_LOTUS, name: "Laser Lotus", hp: 300, speed: 0.8, damage: 20, xp: 30, radius: 25, color: '#ff0055',
        desc: "Stationary. Spinning laser beams that expand/contract.", waves: "13, 14", included: true
    },
    {
        type: EnemyType.ORBITAL_SNIPER, name: "Orbital Sniper", hp: 80, speed: 3, damage: 50, xp: 15, radius: 15, color: '#00ff00',
        desc: "Maintains distance. Shows laser sight before high-speed shot.", waves: "15", included: true
    },
    {
        type: EnemyType.UTATU, name: "Utatu", hp: 200, speed: 3, damage: 30, xp: 25, radius: 35, color: '#9900FF',
        desc: "Orbits player. Links with others to form cutting beams.", waves: "12", included: true
    },

    // Physics / Metaphysics Enemies
    {
        type: EnemyType.MANDELBROT_MITE, name: "Mandelbrot Mite", hp: 10, speed: 3.0, damage: 15, xp: 2, radius: 20, color: '#00FFFF',
        desc: "Splits into smaller copies upon death. Recursive swarm.", waves: "14", included: true
    },
    {
        type: EnemyType.PRISMATIC_MONOLITH, name: "Prismatic Monolith", hp: 2000, speed: 0.5, damage: 60, xp: 100, radius: 45, color: '#FFFFFF',
        desc: "Slow, tanky. Reflects projectiles into RGB spectrum lasers.", waves: "16", included: true
    },

    // Bosses
    {
        type: EnemyType.BOSS_VANGUARD, name: "The Vanguard", hp: 2250, speed: 3.75, damage: 40, xp: 500, radius: 40, color: '#ff3300',
        desc: "BOSS 1. Charger / Shooter hybrid.", waves: "6 (Boss)", included: true
    },
    {
        type: EnemyType.BOSS_SHANGO, name: "Shango's Wrath", hp: 4000, speed: 1.0, damage: 50, xp: 2000, radius: 70, color: '#FF4500',
        desc: "BOSS (Wave 12). Rapidly rotating X-construct with lightning beams.", waves: "12 (Boss)", included: true
    },
    {
        type: EnemyType.BOSS_HIVE_MIND, name: "The Hive", hp: 10000, speed: 0.8, damage: 50, xp: 4000, radius: 80, color: '#9900ff',
        desc: "BOSS (Bench). Spawner / Bullet Hell.", waves: "Bench", included: true
    },
    {
        type: EnemyType.BOSS_AIDO_HWEDO, name: "Aido-Hwedo", hp: 20000, speed: 0.5, damage: 50, xp: 6000, radius: 280, color: '#FF8800',
        desc: "BOSS (Wave 20). The Boundless Coil. Counter-rotating shields protect the core.", waves: "20 (Boss)", included: true
    },
    {
        type: EnemyType.BOSS_CYBER_KRAKEN, name: "Cyber-Kraken", hp: 30000, speed: 1.0, damage: 50, xp: 5000, radius: 90, color: '#00ffff',
        desc: "BOSS (Bench). Deep sea digital horror. Beams, tentacles, and mines.", waves: "Bench", included: true
    },

    // Trinity - REDUCED SIZE (Radius ~50% of previous)
    {
        type: EnemyType.BOSS_TRINITY, name: "The Trinity", hp: 21000, speed: 0, damage: 0, xp: 6000, radius: 0, color: '#FF6600',
        desc: "BOSS (Wave 15). A gestalt of three geometric entities.", waves: "15 (Boss)", included: true
    },
    {
        type: EnemyType.BOSS_TRINITY_CUBE, name: "Trinity: Cube", hp: 8000, speed: 2.0, damage: 60, xp: 2000, radius: 25, color: '#FF4400',
        desc: "Part of The Trinity. Blunt force trauma.", waves: "Boss", included: true
    },
    {
        type: EnemyType.BOSS_TRINITY_PYRAMID, name: "Trinity: Pyramid", hp: 6000, speed: 2.5, damage: 50, xp: 2000, radius: 22, color: '#FF0000',
        desc: "Part of The Trinity. Precision strikes.", waves: "Boss", included: true
    },
    {
        type: EnemyType.BOSS_TRINITY_ORB, name: "Trinity: Orb", hp: 7000, speed: 2.0, damage: 50, xp: 2000, radius: 22, color: '#FF8800',
        desc: "Part of The Trinity. Area denial.", waves: "Boss", included: true
    }
];
