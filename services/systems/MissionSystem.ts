
import {
    MissionState, MissionType, WaveConfig, Player, MissionEntity, Pickup, Enemy,
    EnemyType, EntityType, Vector2, Weapon, Projectile, VisualParticle, TextParticle, Replica
} from '../../types';
import {
    createMissionEntity, createMissionPickup, spawnEnemy, createTextParticle, createCurrency, createShatterParticles, createPolygonShatterParticles, createAllyReplica
} from '../gameLogic';
import { getVisualParticle } from '../objectPools';
import { audioEngine } from '../audioEngine';

export interface MissionUpdateResult {
    mission: MissionState;
    isComplete: boolean;
    newEnemies: Enemy[]; // Fully formed enemies ready to add
    newParticles: (VisualParticle | { pos: Vector2, text: string, color: string, duration?: number })[];
    newReplicas?: Replica[]; // Added Replicas
    screenShake?: number;
}

export interface MissionPickupResult {
    mission: MissionState;
    isComplete: boolean;
    newPickups: Pickup[];
    newParticles: { pos: Vector2, text: string, color: string, duration?: number }[];
}

export const initMissionState = (wave: WaveConfig, player: Player): { mission: MissionState, entities: MissionEntity[], pickups: Pickup[] } => {
    const m: MissionState = {
        type: wave.missionType,
        description: "Survive",
        progress: 0,
        total: 0,
        isComplete: false,
        targetIds: [],
        customData: {}
    };

    const entities: MissionEntity[] = [];
    const pickups: Pickup[] = [];

    if (m.type === MissionType.SURVIVE) {
        m.total = wave.missionParam; // Duration in seconds
        m.description = "SURVIVE";
    } else if (m.type === MissionType.ELIMINATE) {
        m.total = wave.missionParam;
        m.description = `ELIMINATE TARGETS`;
    } else if (m.type === MissionType.DATA_RUN) {
        m.total = 1;
        m.stage = 'LOCATE_FRAGMENT';
        m.description = "LOCATE DATA FRAGMENT";
        const angle = Math.random() * Math.PI * 2;
        const dist = 2000; // Increased from 1200
        const spawnPos = {
            x: player.pos.x + Math.cos(angle) * dist,
            y: player.pos.y + Math.sin(angle) * dist
        };
        const fragment = createMissionPickup(spawnPos, 'MISSION_ITEM');
        pickups.push(fragment);
        m.targetIds = [fragment.id];
    } else if (m.type === MissionType.BOSS) {
        m.total = 1;
        m.description = "DEFEAT THE BOSS";
    } else if (m.type === MissionType.KING_OF_THE_HILL) {
        m.total = wave.missionParam; // Ticks required
        m.description = "SECURE THE ZONE";
        const angle = Math.random() * Math.PI * 2;
        const dist = 1200; // Increased from 600
        const zonePos = { x: player.pos.x + Math.cos(angle) * dist, y: player.pos.y + Math.sin(angle) * dist };
        const zone = createMissionEntity(zonePos, 'ZONE');
        entities.push(zone);
        m.targetIds = [zone.id];
    } else if (m.type === MissionType.PAYLOAD_ESCORT) {
        const travelDist = 4000; // Total travel distance
        m.total = travelDist;
        m.description = "ESCORT PAYLOAD";

        // Spawn Payload further away (1200 units)
        const spawnDist = 1200;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnX = player.pos.x + Math.cos(spawnAngle) * spawnDist;
        const spawnY = player.pos.y + Math.sin(spawnAngle) * spawnDist;

        const payload = createMissionEntity({ x: spawnX, y: spawnY }, 'PAYLOAD');

        // Determine Destination from Payload position
        const destAngle = Math.random() * Math.PI * 2;
        const destX = spawnX + Math.cos(destAngle) * travelDist;
        const destY = spawnY + Math.sin(destAngle) * travelDist;

        payload.destination = { x: destX, y: destY };

        // Spawn Station at Destination
        const station = createMissionEntity({ x: destX, y: destY }, 'STATION');

        entities.push(payload);
        entities.push(station);
        m.targetIds = [payload.id, station.id];
    } else if (m.type === MissionType.RITUAL_CIRCLE) {
        m.total = 3;
        m.description = "ACTIVATE OBELISKS";
        m.stage = '0';
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const dist = 1000; // Increased from 500
            const obelisk = createMissionEntity({
                x: player.pos.x + Math.cos(angle) * dist,
                y: player.pos.y + Math.sin(angle) * dist
            }, 'OBELISK');
            entities.push(obelisk);
        }
    } else if (m.type === MissionType.SHADOW_STEP) {
        m.total = wave.missionParam; // Use wave param (e.g. 30s)
        m.description = "SURVIVE (WEAPONS JAMMED)";
    } else if (m.type === MissionType.ENTANGLEMENT) {
        m.total = 1;
        m.description = "REACH GOAL AND MAINTAIN LINK";
        m.customData = {
            cloneOffset: { x: -250, y: 0 },
            cloneAlive: true
        };

        // Spawn Clone
        const clone = createMissionEntity({
            x: player.pos.x - 250,
            y: player.pos.y
        }, 'CLONE');
        clone.radius = player.radius; // Match player size
        entities.push(clone);

        // Spawn Goals
        // Spawn Player Goal somewhere
        const angle = Math.random() * Math.PI * 2;
        const dist = 1800; // Increased from 1200 (1.5x)
        const pGoalPos = {
            x: player.pos.x + Math.cos(angle) * dist,
            y: player.pos.y + Math.sin(angle) * dist
        };

        const pGoal = createMissionEntity(pGoalPos, 'SYNC_GOAL');
        pGoal.color = '#00FF00'; // Player Color

        // Spawn Clone Goal relative to Player Goal using offset
        const cGoal = createMissionEntity({
            x: pGoalPos.x - 250,
            y: pGoalPos.y
        }, 'SYNC_GOAL');
        cGoal.color = '#00FFFF'; // Clone Color (Cyan)

        entities.push(pGoal);
        entities.push(cGoal);
    } else if (m.type === MissionType.THE_GREAT_FILTER) {
        m.total = 1;
        m.description = "PASS THROUGH THE GATE";

        // 1. Choose random direction
        const angle = Math.random() * Math.PI * 2;
        const dist = 3500; // Far spawn (Increased from 1800)
        const speed = 7;

        // 2. Spawn point
        const startX = player.pos.x + Math.cos(angle) * dist;
        const startY = player.pos.y + Math.sin(angle) * dist;

        // 3. Direction vector towards player (inverted spawn angle)
        const moveAngle = angle + Math.PI;

        // 4. Calculate Hole Position relative to center
        // The hole is essentially just a point along the perpendicular axis of the wave
        // Offset it slightly from center so player has to move, but keep it reachable
        const perpX = -Math.sin(moveAngle);
        const perpY = Math.cos(moveAngle);
        const offset = (Math.random() - 0.5) * 600; // +/- 300px lateral shift

        const filter = createMissionEntity({ x: startX, y: startY }, 'FILTER_WAVE');
        filter.filterData = {
            angle: moveAngle,
            speed: speed,
            width: 4000, // Visual width
            holeWidth: 180 // Size of safe gap
        };

        // Store offset in pos effectively by shifting start pos perpendicular
        filter.pos.x += perpX * offset;
        filter.pos.y += perpY * offset;

        entities.push(filter);
    } else if (m.type === MissionType.EVENT_HORIZON) {
        m.total = wave.missionParam || 30; // Survive for X seconds (Reduced from 45)
        m.description = "ESCAPE THE EVENT HORIZON"; // Fixed Typo

        // Spawn near player but not on top
        const angle = Math.random() * Math.PI * 2;
        const dist = 600;
        const spawnPos = {
            x: player.pos.x + Math.cos(angle) * dist,
            y: player.pos.y + Math.sin(angle) * dist
        };

        const singularity = createMissionEntity(spawnPos, 'EVENT_HORIZON');
        // Initial radius
        singularity.radius = 40;
        entities.push(singularity);
        m.targetIds = [singularity.id];
    } else if (m.type === MissionType.SOLAR_STORM) {
        m.total = wave.missionParam || 30; // Duration in seconds (Halved)
        m.description = "SURVIVE THE SOLAR STORM";

        // Initialize Solar Data
        m.customData = {
            solarData: {
                state: 'CALM',
                timer: 60, // 1s initial calm (reduced from 10s)
                sunAngle: Math.random() * Math.PI * 2, // Random direction for the sun
                intensity: 0
            }
        };

        // Spawn Solar Shields
        const shieldCount = 5;
        const shieldDist = 800;
        for (let i = 0; i < shieldCount; i++) {
            const angle = (Math.PI * 2 / shieldCount) * i;
            const pos = {
                x: player.pos.x + Math.cos(angle) * shieldDist,
                y: player.pos.y + Math.sin(angle) * shieldDist
            };
            entities.push(createMissionEntity(pos, 'SOLAR_SHIELD'));
        }
    } else if (m.type === MissionType.RESCUE) {
        m.total = 4; // 4 Allies to save (Quadrants)
        m.description = "RESCUE TRAPPED ALLIES";
        m.customData = {
            allyGuards: {} // allyId -> guardId[]
        };

        const allyCount = 4;
        const classes: ('ASSAULT' | 'SUPPORT')[] = ['ASSAULT', 'SUPPORT', 'ASSAULT', 'SUPPORT'];

        for (let i = 0; i < allyCount; i++) {
            // Quadrants: 45, 135, 225, 315 degrees
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const dist = 1400; // Further out
            const allyPos = {
                x: player.pos.x + Math.cos(angle) * dist,
                y: player.pos.y + Math.sin(angle) * dist
            };
            const ally = createMissionEntity(allyPos, 'ALLY');
            ally.customData = { allyClass: classes[i] }; // Persist class
            entities.push(ally);
        }
        // Mark for initial guard spawn
        m.customData.needsSpawn = true;
    }

    return { mission: m, entities, pickups };
};

export const updateMission = (
    mission: MissionState,
    player: Player,
    missionEntities: MissionEntity[],
    enemies: Enemy[],
    waveTimer: number,
    activeBoss: Enemy | undefined,
    bossesDefeated: Set<string>,
    currentBossType: string | undefined,
    waveIndex: number = 1,
    projectiles: Projectile[] = [],
    pickups: Pickup[] = [] // Added pickups for interaction
): MissionUpdateResult => {
    const result: MissionUpdateResult = {
        mission: { ...mission },
        isComplete: mission.isComplete,
        newEnemies: [],

        newParticles: [],
        newReplicas: [],
        screenShake: 0
    };

    if (mission.type === MissionType.SURVIVE) {
        result.mission.progress = Math.floor(waveTimer / 60);
        if (result.mission.progress >= mission.total) result.isComplete = true;
    }
    else if (mission.type === MissionType.ELIMINATE) {
        // Progress usually updated by kills externally, but we check completion here
        if (mission.progress >= mission.total) result.isComplete = true;

        // Check if targets exist
        const currentTargets = enemies.filter(e => e.isMissionTarget).length;
        if (currentTargets === 0 && !result.isComplete) {
            const elite = spawnEnemy(player, EnemyType.ELITE_DRONE, undefined, waveIndex);
            elite.isMissionTarget = true;
            elite.color = '#FF0000';
            elite.health *= 2;
            elite.maxHealth *= 2;
            result.newEnemies.push(elite);
            // result.newParticles.push({ pos: elite.pos, text: "TARGET", color: '#FF0000', duration: 90 });
        }
    }
    else if (mission.type === MissionType.DATA_RUN) {
        // Data Run Completion Delay Logic
        if (mission.stage === 'UPLOAD_COMPLETE_WAIT') {
            const timer = mission.customData?.uploadTimer || 0;
            if (timer > 0) {
                result.mission.customData = { ...mission.customData, uploadTimer: timer - 1 };
                // Keep creating particles during upload
                if (timer % 15 === 0) {
                    // result.newParticles.push({ pos: player.pos, text: "UPLOADING...", color: '#00FFFF', duration: 30 });
                }
            } else {
                result.isComplete = true;
            }
        }
    }
    else if (mission.type === MissionType.BOSS) {
        if (!activeBoss && currentBossType && bossesDefeated.has(currentBossType)) {
            result.isComplete = true;
        }
    }
    else if (mission.type === MissionType.KING_OF_THE_HILL) {
        const zone = missionEntities.find(e => e.kind === 'ZONE');
        if (zone) {
            const dx = player.pos.x - zone.pos.x;
            const dy = player.pos.y - zone.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < zone.radius) {
                result.mission.progress++;
                zone.active = true;
            } else {
                zone.active = false;
            }
            if (result.mission.progress >= mission.total) result.isComplete = true;
        }
    }
    else if (mission.type === MissionType.PAYLOAD_ESCORT) {
        const payload = missionEntities.find(e => e.kind === 'PAYLOAD');
        if (payload && payload.destination) {
            const dx = player.pos.x - payload.pos.x;
            const dy = player.pos.y - payload.pos.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);

            // Move payload if close (750px range)
            // Move payload if close (750px range)
            const isActive = distToPlayer < 750;

            // Audio FX
            if (!mission.isComplete) {
                audioEngine.setEscortHum(isActive);
            } else {
                audioEngine.setEscortHum(false);
            }

            if (isActive) {
                const moveSpeed = 2;
                const destDx = payload.destination.x - payload.pos.x;
                const destDy = payload.destination.y - payload.pos.y;
                const distToDest = Math.sqrt(destDx * destDx + destDy * destDy);

                if (distToDest < 20) {
                    if (!mission.isComplete) {
                        result.isComplete = true;
                        audioEngine.setEscortHum(false); // Stop sound immediately on completion
                    }
                } else {
                    payload.pos.x += (destDx / distToDest) * moveSpeed;
                    payload.pos.y += (destDy / distToDest) * moveSpeed;
                }
            }

            // Progress Update
            const destDx = payload.destination.x - payload.pos.x;
            const destDy = payload.destination.y - payload.pos.y;
            const distToDest = Math.sqrt(destDx * destDx + destDy * destDy);
            result.mission.progress = Math.max(0, mission.total - distToDest);
        } else {
            // Safety: If payload missing, stop sound
            audioEngine.setEscortHum(false);
        }
    }
    else if (mission.type === MissionType.RITUAL_CIRCLE) {
        const obelisks = missionEntities.filter(e => e.kind === 'OBELISK');
        let allActive = true;

        obelisks.forEach(obelisk => {
            if (!obelisk.active) {
                allActive = false;
                const dx = player.pos.x - obelisk.pos.x;
                const dy = player.pos.y - obelisk.pos.y;
                // Activation radius 1600 sq (40px)
                if (dx * dx + dy * dy < obelisk.radius * obelisk.radius + 1600) {
                    obelisk.active = true;
                    result.mission.progress++;
                    // result.newParticles.push({ pos: obelisk.pos, text: "ACTIVATED", color: '#00FF00', duration: 90 });
                }
            }
        });

        if (allActive) {
            result.isComplete = true;
        }
    }
    // --- NEW MISSIONS UPDATE ---
    else if (mission.type === MissionType.SHADOW_STEP) {
        result.mission.progress = Math.floor(waveTimer / 60);
        if (result.mission.progress >= mission.total) result.isComplete = true;
    }
    else if (mission.type === MissionType.ENTANGLEMENT) {
        const clone = missionEntities.find(e => e.kind === 'CLONE');
        if (clone) {
            // Update Clone Position (Perfect Mirror via Offset)
            const offset = mission.customData?.cloneOffset || { x: -250, y: 0 };
            clone.pos.x = player.pos.x + offset.x;
            clone.pos.y = player.pos.y + offset.y;
            clone.velocity = player.velocity; // For animation

            // Check Goals
            const goals = missionEntities.filter(e => e.kind === 'SYNC_GOAL');
            const pGoal = goals.find(g => g.color === '#00FF00');
            const cGoal = goals.find(g => g.color === '#00FFFF');

            if (pGoal && cGoal) {
                const pDistSq = (player.pos.x - pGoal.pos.x) ** 2 + (player.pos.y - pGoal.pos.y) ** 2;
                const cDistSq = (clone.pos.x - cGoal.pos.x) ** 2 + (clone.pos.y - cGoal.pos.y) ** 2;
                const radiusSq = (pGoal.radius + 10) ** 2;

                pGoal.active = pDistSq < radiusSq;
                cGoal.active = cDistSq < radiusSq;

                // Fix: Check if already complete to avoid spamming
                if (pGoal.active && cGoal.active && !mission.isComplete) {
                    result.isComplete = true;
                    result.mission.customData = { ...mission.customData, cloneAlive: true };
                    // result.newParticles.push({ pos: player.pos, text: "QUANTUM SYNC", color: '#00FFFF', duration: 120 });
                }
            }
        } else {
            // Clone is dead (handled in gameEngine logic which removes it)
            // If clone is missing, we check if mission should fail
            if (!mission.isComplete) {
                result.mission.customData = { ...mission.customData, cloneAlive: false };
                result.mission.description = "LINK SEVERED";
                // Mission ends immediately (no bonus reward)
                result.isComplete = true;
            }
        }
    }
    else if (mission.type === MissionType.THE_GREAT_FILTER) {
        const filter = missionEntities.find(e => e.kind === 'FILTER_WAVE');
        if (filter && filter.filterData) {
            const fd = filter.filterData;

            // Move Wave
            filter.pos.x += Math.cos(fd.angle) * fd.speed;
            filter.pos.y += Math.sin(fd.angle) * fd.speed;

            // Calculate vector from player to wave center (hole)
            // Normal Vector of movement
            const normX = Math.cos(fd.angle);
            const normY = Math.sin(fd.angle);

            // Tangent Vector (Along the wall)
            const tanX = -normY;
            const tanY = normX;

            // Project Player position onto Normal axis relative to Filter pos
            // Distance of player from the line
            const pdx = player.pos.x - filter.pos.x;
            const pdy = player.pos.y - filter.pos.y;

            // Dot product with normal = distance from line plane
            const distNormal = pdx * normX + pdy * normY;

            // Dot product with tangent = distance from hole center along the wall
            const distTangent = pdx * tanX + pdy * tanY;

            const wallThickness = 40; // Visual thickness

            // --- PARABOLIC GEOMETRY LOGIC ---
            // Calculate X offset based on Y distance from center (tangent)
            // Visual params: WallHeight=2500, CurveDepth=600
            // Formula: x = (y / wallHeight)^2 * curveDepth
            const wallH = 2500;
            const curveD = 600;
            const curveX = Math.pow(distTangent / wallH, 2) * curveD;

            // Adjust distNormal relative to the curved surface
            // The wall is physically at x = curveX relative to the center plane
            // Since movement is in +X direction locally, 'distNormal' is local X
            const distFromWall = distNormal - curveX;

            // PROXIMITY SHAKE
            // Check distance from the curved surface
            if (distFromWall > 0 && distFromWall < 1200) {
                // Closer = Stronger Shake
                const intensity = (1 - (distFromWall / 1200)) * 8; // Max 8
                if (intensity > 0.5) result.screenShake = intensity;
            }

            // COLLISION CHECK: PLAYER
            // If player is inside the wall thickness (crossing the curved plane)
            if (Math.abs(distFromWall) < wallThickness) {
                // Check if they are NOT in the hole (Safe zone)
                // Hole width is total width, so check +/- half width
                if (Math.abs(distTangent) > fd.holeWidth / 2) {
                    // HIT! Massive Damage - INSTANT KILL
                    player.health = 0;
                    // result.newParticles.push({ pos: player.pos, text: "FATAL ERROR", color: '#FF0000', duration: 60 });
                    result.screenShake = 30; // Massive shake on hit
                } else {
                    // Safe in hole
                    if (waveTimer % 20 === 0) {
                        result.newParticles.push({ pos: player.pos, text: "SAFE", color: '#00FF00', duration: 30 });
                    }
                }
            }

            // COLLISION CHECK: ENEMIES
            enemies.forEach(e => {
                if (e.markedForDeletion) return;

                const edx = e.pos.x - filter.pos.x;
                const edy = e.pos.y - filter.pos.y;
                const eDistNormal = edx * normX + edy * normY;
                const eDistTangent = edx * tanX + edy * tanY;

                const eCurveX = Math.pow(eDistTangent / wallH, 2) * curveD;
                const eDistFromWall = eDistNormal - eCurveX;

                // Enemies hit by wall (and not in hole) die instantly
                if (Math.abs(eDistFromWall) < wallThickness) {
                    if (Math.abs(eDistTangent) > fd.holeWidth / 2) {
                        e.health = 0; // Vaporize
                        // Changed from "PURGED" text to "SHARD" particles
                        result.newParticles.push(...createPolygonShatterParticles(e));
                    }
                }
            });

            // Completion Check
            // If the wave (including its trailing wings) has passed the player significantly
            // Normal points along movement. If distFromWall is negative, it means wall passed.
            // Wait until it's far enough away (e.g. -1200) so it clears screen
            if (distFromWall < -1200) {
                result.isComplete = true;
            }
        }
    } else if (mission.type === MissionType.EVENT_HORIZON) {
        result.mission.progress = Math.floor(waveTimer / 60);
        if (result.mission.progress >= mission.total) result.isComplete = true;

        const horizon = missionEntities.find(e => e.kind === 'EVENT_HORIZON');
        if (horizon) {
            // --- GROWTH LOGIC ---
            // Grow bigger and more powerful as time passes
            const BUILDUP_DURATION = 180; // 3 Seconds buildup
            const totalDuration = mission.total * 60; // Total duration in frames

            // Base Params
            const baseRadius = 50;
            const maxRadius = 350;
            const basePullRadius = 600;
            const maxPullRadius = 1300;
            const maxForce = 14;

            let currentRadius = baseRadius;
            let pullRadius = basePullRadius;
            let forceMultiplier = 1.0;

            if (waveTimer < BUILDUP_DURATION) {
                // --- BUILDUP PHASE ---
                const buildupProgress = waveTimer / BUILDUP_DURATION;
                // EASE IN QUAD for slow start -> fast finish
                const ease = Math.pow(buildupProgress, 2);

                currentRadius = 1 + (baseRadius - 1) * ease; // Start at 1px
                pullRadius = 100 + (basePullRadius - 100) * ease;
                horizon.opacity = ease; // Fade in
                forceMultiplier = ease * 0.5; // Weak pull during buildup
            } else {
                // --- ACTIVE PHASE ---
                // Calculate progress relative to the remaining time after buildup
                const activeTime = waveTimer - BUILDUP_DURATION;
                const activeDuration = totalDuration - BUILDUP_DURATION;
                const progress = Math.min(1, activeTime / activeDuration);

                currentRadius = baseRadius + (maxRadius - baseRadius) * progress;
                pullRadius = basePullRadius + (maxPullRadius - basePullRadius) * progress;
                horizon.opacity = 1.0;
                forceMultiplier = 1.0;
            }

            if (Number.isFinite(currentRadius)) {
                horizon.radius = currentRadius; // Visual radius
            }

            const killRadius = currentRadius * 0.8;
            const coreDeathRadius = 50 * (waveTimer < BUILDUP_DURATION ? 0 : 1); // No insta-death during buildup start

            // --- SUCTION PARTICLES ---
            // 1. Dense debris field near the event horizon
            const debrisCount = 2;
            for (let i = 0; i < debrisCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = currentRadius + Math.random() * (pullRadius - currentRadius);
                const px = horizon.pos.x + Math.cos(angle) * r;
                const py = horizon.pos.y + Math.sin(angle) * r;

                const speed = 4 + Math.random() * 6;
                const vx = -Math.cos(angle) * speed;
                const vy = -Math.sin(angle) * speed;

                result.newParticles.push({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { x: px, y: py },
                    velocity: { x: vx, y: vy },
                    radius: 0,
                    color: Math.random() > 0.6 ? '#FF4400' : '#9900FF',
                    markedForDeletion: false,
                    life: 40 + Math.random() * 20,
                    maxLife: 60,
                    size: 2 + Math.random() * 3,
                    decay: 1.0
                } as any);
            }

            // 2. Far-field "Streaks" to indicate direction from off-screen
            if (waveTimer % 4 === 0) {
                // Spawn in a large annulus around the horizon
                const angle = Math.random() * Math.PI * 2;
                const dist = 1200 + Math.random() * 1800; // 1200 to 3000 units away

                const px = horizon.pos.x + Math.cos(angle) * dist;
                const py = horizon.pos.y + Math.sin(angle) * dist;

                const speed = 20 + Math.random() * 10; // High speed
                const vx = -Math.cos(angle) * speed;
                const vy = -Math.sin(angle) * speed;

                result.newParticles.push({
                    id: Math.random().toString(),
                    type: EntityType.VISUAL_PARTICLE,
                    pos: { x: px, y: py },
                    velocity: { x: vx, y: vy },
                    radius: 0,
                    color: 'rgba(150, 0, 255, 0.4)',
                    markedForDeletion: false,
                    life: 150,
                    maxLife: 150,
                    size: 40 + Math.random() * 40, // Very long
                    decay: 1.0,
                    shape: 'LINE',
                    rotation: angle // Line orientation (radial)
                } as any);
            }

            // 1. Pull Player (Omnidirectional with Outer Trap)
            const pdx = horizon.pos.x - player.pos.x;
            const pdy = horizon.pos.y - player.pos.y;
            const pDistSq = pdx * pdx + pdy * pdy;
            const pDist = Math.sqrt(pDistSq);

            let force = 0;

            if (pDist < pullRadius) {
                // Standard Pull: Stronger at center
                const ratio = pDist / pullRadius;
                force = Math.pow(1 - ratio, 2) * maxForce * forceMultiplier;
            } else {
                // Outer Pull: Stronger further away (Rubber Band)
                const distBeyond = pDist - pullRadius;
                const outerRatio = Math.min(1, distBeyond / 600); // Ramp up force
                force = outerRatio * maxForce * forceMultiplier;
            }

            // Apply Force with strict NaN guards
            if (pDist > 1 && Number.isFinite(pDist)) {
                let moveX = (pdx / pDist) * force;
                let moveY = (pdy / pDist) * force;

                // Safety clamp
                if (Math.abs(moveX) > 50) moveX = Math.sign(moveX) * 50;
                if (Math.abs(moveY) > 50) moveY = Math.sign(moveY) * 50;

                if (Number.isFinite(moveX) && Number.isFinite(moveY)) {
                    player.pos.x += moveX;
                    player.pos.y += moveY;
                }
            }

            if (pDist < coreDeathRadius) {
                // INSTANT DEATH - Consume lives
                player.health = 0;
                player.extraLives = 0;
                // result.newParticles.push({
                //     pos: player.pos,
                //     text: "SINGULARITY",
                //     color: '#FF0000',
                //     duration: 60
                // });
            } else if (pDist < killRadius) {
                player.health -= 5;
                if (waveTimer % 10 === 0) {
                    // result.newParticles.push({
                    //     pos: player.pos,
                    //     text: "CRITICAL",
                    //     color: '#FF0000',
                    //     duration: 30
                    // });

                    const safeDist = Math.max(0.1, pDist);
                    result.newParticles.push({
                        pos: player.pos,
                        type: EntityType.VISUAL_PARTICLE,
                        velocity: { x: (pdx / safeDist) * 5, y: (pdy / safeDist) * 5 },
                        color: '#FFFFFF',
                        duration: 20
                    } as any);
                }
            }

            // 2. Pull Enemies (Standard Pull)
            enemies.forEach(e => {
                if (e.markedForDeletion) return;
                const edx = horizon.pos.x - e.pos.x;
                const edy = horizon.pos.y - e.pos.y;
                const eDistSq = edx * edx + edy * edy;

                if (eDistSq < pullRadius * pullRadius) {
                    const eDist = Math.sqrt(eDistSq);
                    const ratio = eDist / pullRadius;
                    const eForce = Math.pow(1 - ratio, 2) * (maxForce * 1.5 * forceMultiplier);

                    if (eDist > 0.1 && Number.isFinite(eDist)) {
                        let mX = (edx / eDist) * eForce;
                        let mY = (edy / eDist) * eForce;

                        // Clamp enemy force
                        if (Math.abs(mX) > 50) mX = Math.sign(mX) * 50;
                        if (Math.abs(mY) > 50) mY = Math.sign(mY) * 50;

                        if (Number.isFinite(mX) && Number.isFinite(mY)) {
                            e.pos.x += mX;
                            e.pos.y += mY;
                        }
                    }

                    if (eDist < killRadius) {
                        e.health -= 50;
                        if (waveTimer % 5 === 0) {
                            const safeEDist = Math.max(0.1, eDist);
                            result.newParticles.push({
                                pos: e.pos,
                                type: EntityType.VISUAL_PARTICLE,
                                velocity: { x: (edx / safeEDist) * 8, y: (edy / safeEDist) * 8 },
                                color: e.color,
                                duration: 20,
                            } as any);
                        }
                    }
                }
            });

            // 3. Pull Projectiles
            projectiles.forEach(p => {
                if (p.markedForDeletion || p.anchorData) return;

                const pdx = horizon.pos.x - p.pos.x;
                const pdy = horizon.pos.y - p.pos.y;
                const pDistSq = pdx * pdx + pdy * pdy;

                if (pDistSq < pullRadius * pullRadius) {
                    const pDist = Math.sqrt(pDistSq);

                    if (pDist < killRadius) {
                        p.markedForDeletion = true;
                        return;
                    }

                    const ratio = pDist / pullRadius;
                    const pForce = Math.pow(1 - ratio, 2) * 2.0 * forceMultiplier;

                    if (pDist > 0.1 && Number.isFinite(pDist)) {
                        const moveX = (pdx / pDist) * pForce;
                        const moveY = (pdy / pDist) * pForce;

                        // Projectiles can move fast, but let's still ensure valid numbers
                        if (Number.isFinite(moveX) && Number.isFinite(moveY)) {
                            p.velocity.x += moveX;
                            p.velocity.y += moveY;
                        }
                    }
                }
            });

            // 4. Pull Pickups (XP/Currency)
            pickups.forEach(p => {
                if (p.markedForDeletion) return;

                const pdx = horizon.pos.x - p.pos.x;
                const pdy = horizon.pos.y - p.pos.y;
                const pDistSq = pdx * pdx + pdy * pdy;

                if (pDistSq < pullRadius * pullRadius) {
                    const pDist = Math.sqrt(pDistSq);

                    if (pDist < killRadius) {
                        // Consumed by event horizon
                        p.markedForDeletion = true;
                        return;
                    }

                    const ratio = pDist / pullRadius;
                    // Pickups are light, pull them fast
                    const pForce = Math.pow(1 - ratio, 2) * (maxForce * 1.2 * forceMultiplier);

                    if (pDist > 0.1 && Number.isFinite(pDist)) {
                        const moveX = (pdx / pDist) * pForce;
                        const moveY = (pdy / pDist) * pForce;

                        if (Number.isFinite(moveX) && Number.isFinite(moveY)) {
                            p.pos.x += moveX;
                            p.pos.y += moveY;
                        }
                    }
                }
            });
        }
    } else if (mission.type === MissionType.RESCUE) {

        // --- PHASE 0: SPAWN GUARDS (First Tick) ---
        if (mission.customData?.needsSpawn) {
            delete mission.customData.needsSpawn;
            const allies = missionEntities.filter(e => e.kind === 'ALLY');
            const allyGuards: Record<string, string[]> = {};

            allies.forEach((ally, index) => {
                const guards: string[] = [];
                // Spawn 3 Sentinels per Ally
                for (let j = 0; j < 3; j++) {
                    const gAngle = (Math.PI * 2 / 3) * j;
                    const gDist = 120;
                    const gPos = {
                        x: ally.pos.x + Math.cos(gAngle) * gDist,
                        y: ally.pos.y + Math.sin(gAngle) * gDist
                    };
                    const guard = spawnEnemy(player, EnemyType.SENTINEL, gPos, waveIndex);
                    guard.isMissionTarget = true;
                    // Persist initial angle for circling
                    guard.customData = {
                        circleAngle: gAngle,
                        circleCenterId: ally.id,
                        isCircling: true
                    };
                    result.newEnemies.push(guard);
                    guards.push(guard.id);
                }
                allyGuards[ally.id] = guards;
            });
            result.mission.customData = { ...mission.customData, allyGuards, guardsSpawned: true, spawnTime: waveTimer };
        }

        // --- PHASE 1: RESCUE ALLIES ---
        if (mission.progress < mission.total) {
            const allies = missionEntities.filter(e => e.kind === 'ALLY');
            const guardMap = mission.customData?.allyGuards || {};

            const guardsSpawned = mission.customData?.guardsSpawned;
            const spawnTime = mission.customData?.spawnTime || 0;

            // Update Guard Behavior (Circling)
            enemies.forEach(e => {
                if (e.customData?.isCircling && e.customData?.circleCenterId && !e.markedForDeletion) {
                    const ally = allies.find(a => a.id === e.customData.circleCenterId);
                    if (ally) {
                        const distToPlayer = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);

                        // Break circle if player represents a threat
                        if (distToPlayer < 400) {
                            e.customData.isCircling = false;
                        } else {
                            // Orbit Logic
                            e.customData.circleAngle = (e.customData.circleAngle || 0) + 0.02;
                            const radius = 120;
                            const targetX = ally.pos.x + Math.cos(e.customData.circleAngle) * radius;
                            const targetY = ally.pos.y + Math.sin(e.customData.circleAngle) * radius;

                            // Smoothly move to orbit position
                            e.pos.x += (targetX - e.pos.x) * 0.1;
                            e.pos.y += (targetY - e.pos.y) * 0.1;

                            // Override velocity to zero to prevent drift from physics engine while orbiting
                            e.velocity.x = 0;
                            e.velocity.y = 0;
                        }
                    } else {
                        // Ally gone, stop circling
                        e.customData.isCircling = false;
                    }
                }
            });

            if (guardsSpawned && waveTimer > spawnTime) {
                allies.forEach((ally, index) => {
                    const guardIds = guardMap[ally.id] || [];
                    if (guardIds.length === 0) return;

                    // Check if all guards are dead
                    const aliveGuards = enemies.filter(e => guardIds.includes(e.id) && !e.markedForDeletion);

                    if (waveTimer % 60 === 0) {
                        console.log(`Ally ${index} (${ally.id}): Guards Total ${guardIds.length}, Alive ${aliveGuards.length}`, aliveGuards.map(e => e.id));
                    }

                    if (aliveGuards.length === 0) {
                        // ALLY FREED!
                        result.mission.progress++;
                        ally.markedForDeletion = true;

                        // Retrieve Saved Class
                        const allyClass = ally.customData?.allyClass || 'ASSAULT';

                        // Slot Logic
                        // We have 4 allies now. Slots?
                        // 0: (-60, -60), 1: (60, -60), 2: (-90, -30), 3: (90, -30) -- simple wedge
                        const slotIdx = result.mission.progress - 1;
                        const offset = { x: 0, y: 0 };

                        if (slotIdx === 0) { offset.x = -60; offset.y = -60; }
                        else if (slotIdx === 1) { offset.x = 60; offset.y = -60; }
                        else if (slotIdx === 2) { offset.x = -40; offset.y = -100; }
                        else { offset.x = 40; offset.y = -100; }

                        console.log(`RESCUE: ALLY FREED! ID: ${ally.id}, Class: ${allyClass}, Slot: ${slotIdx}`);

                        const replica = createAllyReplica(ally.pos, offset, player.stats, allyClass);
                        if (!result.newReplicas) result.newReplicas = [];
                        result.newReplicas.push(replica);

                        // result.newParticles.push({ pos: ally.pos, text: `${allyClass} UNIT ONLINE`, color: replica.color, duration: 120 });
                        result.screenShake = 5;
                    }
                });
            }
        }
        // --- PHASE 2: ELITE SQUAD BATTLE ---
        else if (mission.progress === mission.total && !mission.customData?.phase2Started) {
            // Trigger Phase 2 once
            result.mission.customData = { ...mission.customData, phase2Started: true };
            result.mission.description = "DEFEAT ELITE SQUAD";

            // Spawn Strong Enemies (e.g. 1 Tank + 4 Elites)
            // Formation ahead of player
            const angle = player.rotation; // facing dir
            const dist = 1500;
            const centerPos = {
                x: player.pos.x + Math.cos(angle) * dist,
                y: player.pos.y + Math.sin(angle) * dist
            };

            // Tank Center (Now 2 Tanks)
            for (let i = 0; i < 2; i++) {
                const tOffset = (i === 0 ? -40 : 40);
                const tPos = { ...centerPos, x: centerPos.x + Math.cos(angle + Math.PI / 2) * tOffset, y: centerPos.y + Math.sin(angle + Math.PI / 2) * tOffset };
                const tank = spawnEnemy(player, EnemyType.TANK, tPos, waveIndex + 2);
                tank.isMissionTarget = true;
                result.newEnemies.push(tank);
            }

            // Elites Flanking
            for (let i = 0; i < 4; i++) {
                const fAngle = angle + (i % 2 === 0 ? 1 : -1) * (0.6 + Math.floor(i / 2) * 0.4);
                const fDist = dist;
                const fPos = {
                    x: player.pos.x + Math.cos(fAngle) * fDist,
                    y: player.pos.y + Math.sin(fAngle) * fDist
                };
                const elite = spawnEnemy(player, EnemyType.ELITE_DRONE, fPos, waveIndex + 1);
                elite.isMissionTarget = true;
                result.newEnemies.push(elite);
            }

            // Sentinels Support
            for (let i = 0; i < 3; i++) {
                const sAngle = angle + (i - 1) * 0.3;
                const sDist = dist - 150; // Slightly in front/between
                const sPos = {
                    x: player.pos.x + Math.cos(sAngle) * sDist,
                    y: player.pos.y + Math.sin(sAngle) * sDist
                };
                const sentinel = spawnEnemy(player, EnemyType.SENTINEL, sPos, waveIndex + 1);
                sentinel.isMissionTarget = true;
                result.newEnemies.push(sentinel);
            }

            result.screenShake = 20;
            // result.newParticles.push({ pos: player.pos, text: "ENEMIES INCOMING", color: '#FF0000', duration: 120 });
        }
        else if (mission.customData?.phase2Started) {
            // Check for completion (Kill all targets)
            const targets = enemies.filter(e => e.isMissionTarget && !e.markedForDeletion);
            if (targets.length === 0) {
                result.isComplete = true;
            }
        }

    } else if (mission.type === MissionType.SOLAR_STORM) {
        result.mission.progress = Math.floor(waveTimer / 60);
        if (result.mission.progress >= mission.total) result.isComplete = true;


        const sd = mission.customData?.solarData;
        if (sd) {
            sd.timer--;

            // --- STATE MACHINE ---
            if (sd.state === 'CALM') {
                audioEngine.setSolarIntensity(0);
                if (sd.timer <= 0) {
                    sd.state = 'WARNING';
                    sd.timer = 180; // 3 seconds warning
                    sd.sunAngle += (Math.random() - 0.5); // Shift sun angle slightly
                }
            } else if (sd.state === 'WARNING') {
                // Warning Effects
                if (sd.timer % 30 === 0) {
                    result.newParticles.push({ pos: player.pos, text: "SEEK SHELTER", color: '#FF4400', duration: 30 });
                    result.screenShake = 2;
                }

                // Audio Ramp Up (0 -> 0.4)
                audioEngine.setSolarIntensity(0.4 * (1 - sd.timer / 180));

                if (sd.timer <= 0) {
                    sd.state = 'STORM';
                    sd.timer = 480; // 8 seconds storm
                }
            } else if (sd.state === 'STORM') {
                // Storm Effects & Damage
                result.screenShake = 1.5;
                sd.intensity = Math.min(1, (480 - sd.timer) / 60); // Ramp up intensity

                // Audio High Intensity (0.4 -> 1.0)
                audioEngine.setSolarIntensity(0.4 + 0.6 * sd.intensity);

                // Check for safety (Shadow Logic)
                let isSafe = false;
                const badges = missionEntities.filter(e => e.kind === 'SOLAR_SHIELD');

                // Vector pointing TO the sun
                const sunDirX = Math.cos(sd.sunAngle);
                const sunDirY = Math.sin(sd.sunAngle);

                for (const shield of badges) {
                    // Vector from Shield to Player
                    const dx = player.pos.x - shield.pos.x;
                    const dy = player.pos.y - shield.pos.y;

                    // Project player position onto the "Shadow Axis" (direction away from sun)
                    // We want component along the shadow vector (opposite to sun)
                    // Shadow Vector = -SunDir
                    const shadowDirX = -sunDirX;
                    const shadowDirY = -sunDirY;

                    const distAlongShadow = dx * shadowDirX + dy * shadowDirY;
                    const distPerpShadow = dx * -shadowDirY + dy * shadowDirX; // Perpendicular distance

                    // Simple shadow box check
                    // Must be "behind" the shield (positive distance along shadow)
                    // Must be within width of the shield (perp distance < radius)
                    // And not too far (shadow length limit, e.g., 600px)
                    if (distAlongShadow > 0 && distAlongShadow < 800 && Math.abs(distPerpShadow) < shield.radius * 1.2) {
                        isSafe = true;
                        break;
                    }
                }

                if (!isSafe) {
                    // BURN DAMAGE
                    if (waveTimer % 10 === 0) {
                        player.health -= 5;
                        result.newParticles.push({ pos: player.pos, text: "BURN", color: '#FF0000', duration: 30 });

                        // Burn particles
                        result.newParticles.push({
                            id: Math.random().toString(),
                            type: EntityType.VISUAL_PARTICLE,
                            pos: { ...player.pos },
                            velocity: { x: (Math.random() - 0.5) * 2, y: -2 - Math.random() * 2 },
                            color: '#FF4400',
                            life: 20,
                            maxLife: 20,
                            size: 3,
                            decay: 0.9
                        } as any);
                    }
                } else {
                    if (waveTimer % 60 === 0) {
                        // result.newParticles.push({ pos: player.pos, text: "SHELTERED", color: '#00FF00', duration: 40 });
                    }
                }

                // --- ENEMY DESTRUCTION LOGIC ---
                // Enemies not in shadow get incinerated (No XP)
                if (waveTimer % 10 === 0) {
                    enemies.forEach(enemy => {
                        // Bosses might be immune or take heavy damage instead? User said "enemies quickly pile up", implying fodder.
                        // Let's safe-guard bosses for now or apply damage? "Destroy all enemies directly exposed"
                        // Let's kill normal enemies, maybe damage bosses?
                        if (enemy.isBoss) return;

                        let isEnemySafe = false;
                        for (const shield of badges) {
                            const dx = enemy.pos.x - shield.pos.x;
                            const dy = enemy.pos.y - shield.pos.y;
                            const shadowDirX = -sunDirX;
                            const shadowDirY = -sunDirY;
                            const distAlongShadow = dx * shadowDirX + dy * shadowDirY;
                            const distPerpShadow = dx * -shadowDirY + dy * shadowDirX;

                            if (distAlongShadow > 0 && distAlongShadow < 800 && Math.abs(distPerpShadow) < shield.radius * 1.2) {
                                isEnemySafe = true;
                                break;
                            }
                        }

                        if (!isEnemySafe) {
                            enemy.health = 0;
                            enemy.skipDrop = true; // No XP
                            // Visuals
                            result.newParticles.push({
                                id: Math.random().toString(), type: EntityType.VISUAL_PARTICLE,
                                pos: { ...enemy.pos }, velocity: { x: 0, y: -2 },
                                color: '#FF4400', life: 20, maxLife: 20, size: enemy.radius, decay: 0.8
                            } as any);
                        }
                    });
                }

                if (sd.timer <= 0) {
                    sd.state = 'CALM'; // Keep state valid but irrelevant
                    result.isComplete = true; // Mission Complete!
                    result.mission.progress = mission.total; // Ensure progress bar fills

                    // Stop audio effects
                    audioEngine.setSolarIntensity(0);
                }
            }

            // Persist state updates
            result.mission.customData = { ...mission.customData, solarData: sd };
        }
    }

    // Persist completion state to the mission object
    if (result.isComplete) {
        result.mission.isComplete = true;
    }

    return result;
};

export const handleMissionPickup = (
    mission: MissionState,
    kind: string,
    pos: Vector2,
    player: Player
): MissionPickupResult => {
    const result: MissionPickupResult = {
        mission: { ...mission },
        isComplete: false,
        newPickups: [],
        newParticles: []
    };

    if (mission.type === MissionType.DATA_RUN) {
        if (kind === 'MISSION_ITEM' && mission.stage === 'LOCATE_FRAGMENT') {
            result.mission.stage = 'UPLOAD_DATA';
            result.mission.description = "UPLOAD DATA AT ZONE";
            // result.newParticles.push({ pos: { ...pos }, text: "DATA ACQUIRED", color: '#00FFFF', duration: 120 });

            const angle = Math.random() * Math.PI * 2;
            const dist = 3000;
            const zonePos = {
                x: player.pos.x + Math.cos(angle) * dist,
                y: player.pos.y + Math.sin(angle) * dist
            };

            const zone = createMissionPickup(zonePos, 'MISSION_ZONE');
            result.newPickups.push(zone);
            result.mission.targetIds = [zone.id];
        }
        else if (kind === 'MISSION_ZONE' && mission.stage === 'UPLOAD_DATA') {
            // Start the waiting period instead of instant completion
            result.mission.stage = 'UPLOAD_COMPLETE_WAIT';
            result.mission.description = "UPLOADING...";
            result.mission.customData = { uploadTimer: 60 }; // 60 frames = 1 second
            // Particle to indicate start
            // result.newParticles.push({ pos: { ...pos }, text: "INITIALIZING UPLOAD", color: '#00FFFF', duration: 60 });
        }
    }

    return result;
};
