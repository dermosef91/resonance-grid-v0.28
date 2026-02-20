
import { Enemy, Player, Projectile, Pickup, TextParticle, EntityType, VisualParticle, MissionEntity, MissionType, ColorPalette, Vector2, Shockwave, EnemyType, Replica, Obstacle, MissionState } from '../types';
import { COLORS, ZOOM_LEVEL } from '../constants';
import { EnemyRenderRegistry } from './renderers';
import { project3D, hexToRgba, parseColorToRgb, drawLightningBolt } from './renderUtils';
import { drawBackground, drawLandscape, drawMegastructure, drawSierpinskiTetrahedron, LightSource, DistortionSource } from './renderers/backgroundRenderer';
import { drawPlayer, drawPlayerMesh } from './renderers/playerRenderer';
import { drawPickup } from './renderers/pickupRenderer';
import { drawMissionEntity } from './renderers/MissionRenderer';
import { drawAbyssalLoop } from './renderers/EffectRenderer';
import { drawProjectiles } from './renderers/ProjectileRenderer';
import { drawObstacle } from './renderers/ObstacleRenderer';

export const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.translate(e.pos.x, e.pos.y);

    if (e.isBoss) {
        const pulse = 1 + Math.sin(frame * 0.1) * 0.05;
        ctx.scale(pulse, pulse);
    }

    const renderer = EnemyRenderRegistry[e.enemyType] || EnemyRenderRegistry['DEFAULT'];
    renderer(ctx, e, frame);

    if (e.stunTimer > 0) {
        ctx.fillStyle = '#00FFFF'; ctx.font = '10px monospace'; ctx.fillText('⚡', -3, -e.radius - 5);
    }

    if (e.isMissionTarget) {
        const size = e.radius * 1.5;
        const pulse = Math.sin(frame * 0.15) * 0.2 + 1;
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const s = size * pulse;
        const len = s * 0.4;
        ctx.moveTo(-s, -s + len); ctx.lineTo(-s, -s); ctx.lineTo(-s + len, -s);
        ctx.moveTo(s, -s + len); ctx.lineTo(s, -s); ctx.lineTo(s - len, -s);
        ctx.moveTo(-s, s - len); ctx.lineTo(-s, s); ctx.lineTo(-s + len, s);
        ctx.moveTo(s, s - len); ctx.lineTo(s, s); ctx.lineTo(s - len, s);
        ctx.stroke();
    }

    ctx.restore();
};

export const renderGame = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    camera: { x: number, y: number },
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    pickups: Pickup[],
    particles: (TextParticle | VisualParticle)[],
    frame: number,
    screenShake: number,
    targets?: { pos: { x: number, y: number }, color: string, label?: string }[],
    missionEntities: MissionEntity[] = [],
    wallX?: number,
    missionProgress?: MissionState | { current: number, total: number },
    activeMissionType?: MissionType,
    glitchIntensity: number = 0,
    palette: ColorPalette = {
        background: '#050505',
        grid: '#ff6600',
        nebulaPrimary: '#40003c',
        nebulaSecondary: '#3c1400',
        landscape: {
            noiseScaleX: 0.002,
            noiseScaleY: 0.002,
            amplitude: 80,
            sharpness: 2.5,
            digitalFactor: 0
        }
    },
    tutorialTargetPickup?: Pickup | null,
    shockwaves: Shockwave[] = [],
    replicas: Replica[] = [],
    isFrozen: boolean = false,
    redFlashTimer: number = 0,
    obstacles: Obstacle[] = [],
    waveId: number = 1
) => {
    // Apply Camera & Shake & Zoom
    let camX = camera.x;
    let camY = camera.y;

    // Safety fallback for invalid camera
    if (!Number.isFinite(camX) || !Number.isFinite(camY)) {
        camX = 0;
        camY = 0;
    }
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

    const margin = 200; // Increased safety margin for culling
    const scaledCanvasWidth = canvasWidth / ZOOM_LEVEL;
    const scaledCanvasHeight = canvasHeight / ZOOM_LEVEL;
    const viewLeft = camX - margin;
    const viewRight = camX + scaledCanvasWidth + margin;
    const viewTop = camY - margin;
    const viewBottom = camY + scaledCanvasHeight + margin;
    const viewBounds = { left: viewLeft, right: viewRight, top: viewTop, bottom: viewBottom };

    // Helper check for on-screen logic
    const isOnScreen = (x: number, y: number, r: number) => {
        return x + r > viewLeft && x - r < viewRight && y + r > viewTop && y - r < viewBottom;
    };

    // --- Dynamic Light Sources & Distortion Sources ---
    const lightSources: LightSource[] = [];
    const distortionSources: DistortionSource[] = [];
    const renderShockwaves: Shockwave[] = [...shockwaves];

    // PLAYER
    lightSources.push({
        x: player.pos.x,
        y: player.pos.y,
        r: 255, g: 120, b: 0,
        radius: 200,
        intensity: 1.2
    });

    // OBSTACLES (Static light/distortion)
    // Parse grid color for dynamic obstacle lighting
    const gridRgb = parseColorToRgb(palette.grid) || { r: 0, g: 200, b: 255 };

    obstacles.forEach(obs => {
        if (isOnScreen(obs.pos.x, obs.pos.y, obs.radius)) {
            // Faint glow at base matching grid
            lightSources.push({
                x: obs.pos.x,
                y: obs.pos.y,
                r: gridRgb.r, g: gridRgb.g, b: gridRgb.b,
                radius: obs.radius * 1.5,
                intensity: 0.5
            });
        }
    });

    // PARTICLES
    particles.forEach(p => {
        if (p.type === EntityType.VISUAL_PARTICLE) {
            const vp = p as VisualParticle;
            if (vp.lightColor && vp.lightRadius) {
                // Cull off-screen particles for lighting
                if (!isOnScreen(vp.pos.x, vp.pos.y, vp.lightRadius)) return;

                const rgb = parseColorToRgb(vp.lightColor);
                if (rgb) {
                    lightSources.push({
                        x: vp.pos.x,
                        y: vp.pos.y,
                        r: rgb.r, g: rgb.g, b: rgb.b,
                        radius: vp.lightRadius * (vp.life / vp.maxLife),
                        intensity: 1.0
                    });
                }
            }
        }
    });

    // PROJECTILES
    projectiles.forEach(p => {
        if (!p.markedForDeletion) {
            // Anchor Logic (Event Horizon)
            if (p.anchorData) {
                // If on screen or close to it
                if (isOnScreen(p.pos.x, p.pos.y, p.anchorData.pullRadius * 1.5)) {
                    distortionSources.push({
                        x: p.pos.x,
                        y: p.pos.y,
                        radius: p.anchorData.pullRadius * 1.2,
                        strength: 3.5
                    });
                    lightSources.push({
                        x: p.pos.x,
                        y: p.pos.y,
                        r: 100, g: 0, b: 200,
                        radius: p.anchorData.pullRadius * 0.8,
                        intensity: 1.5
                    });
                }
                return;
            }

            // Normal Projectiles - Cull rigorously
            // Only add lighting if on screen
            const lightRad = Math.max(80, p.radius * 3 + 40);
            if (!isOnScreen(p.pos.x, p.pos.y, lightRad)) return;

            const rgb = parseColorToRgb(p.color);
            if (rgb) {
                // Baseline dynamic pulse using id length as a simple "seed" since it's a string
                const seed = p.id.length + (p.id.charCodeAt(0) || 0);
                const pulse = Math.sin(frame * 0.15 + seed) * 0.2;
                let intensity = 0.8 + pulse; // Increased base intensity from 0.5 to 0.8
                let rad = Math.max(150, p.radius * 3 + 60); // Increased base radius from 80 to 150

                if (p.sourceWeaponId === 'void_aura') {
                    intensity = 1.8 + pulse;
                    rad = Math.max(250, p.radius * 2.5 + 100);
                } else if (p.sourceWeaponId === 'solar_chakram') {
                    intensity = 1.5 + pulse;
                    rad = Math.max(220, p.radius * 2.5 + 60);
                } else if (p.isEnemy) {
                    intensity = 1.4 + pulse; // Enemies cast harsher light
                    rad = Math.max(180, p.radius * 4 + 70);
                }

                lightSources.push({
                    x: p.pos.x,
                    y: p.pos.y,
                    r: rgb.r, g: rgb.g, b: rgb.b,
                    radius: rad,
                    intensity: intensity
                });
            }
        }
    });

    // ENEMIES
    enemies.forEach(e => {
        if (!e.markedForDeletion) {
            // Optimization: Skip off-screen enemies for lighting
            if (!isOnScreen(e.pos.x, e.pos.y, 600)) return;

            if (e.enemyType === EnemyType.GHOST) {
                const opacity = e.opacity ?? 1;
                if (opacity < 0.9) {
                    distortionSources.push({
                        x: e.pos.x,
                        y: e.pos.y,
                        radius: e.radius * 6 + 20,
                        strength: (1 - opacity) * 3.0
                    });
                    lightSources.push({
                        x: e.pos.x,
                        y: e.pos.y,
                        r: 255, g: 0, b: 255,
                        radius: e.radius * 5 + 50,
                        intensity: (1 - opacity) * 2.0
                    });
                }
            }

            if (e.trinityData) {
                const isAggressor = e.trinityData.role === 'AGGRESSOR';
                if (isAggressor) {
                    lightSources.push({
                        x: e.pos.x,
                        y: e.pos.y,
                        r: 255, g: 0, b: 0,
                        radius: 600,
                        intensity: 2.0
                    });
                } else {
                    lightSources.push({
                        x: e.pos.x,
                        y: e.pos.y,
                        r: 255, g: 100, b: 0,
                        radius: 300,
                        intensity: 0.5
                    });
                }
                return;
            }

            let lightAdded = false;
            if (e.isMissionTarget) {
                lightSources.push({
                    x: e.pos.x,
                    y: e.pos.y,
                    r: 255, g: 0, b: 0,
                    radius: e.radius * 3 + 120,
                    intensity: 0.8
                });
                lightAdded = true;
            } else {
                let isGlowing = e.isBoss;
                if (e.enemyType === EnemyType.NEON_COBRA ||
                    e.enemyType === EnemyType.INFERNO_SPINNER ||
                    e.enemyType === EnemyType.BINARY_SENTINEL ||
                    e.enemyType === EnemyType.LASER_LOTUS ||
                    e.enemyType === EnemyType.GHOST ||
                    e.enemyType === EnemyType.MANDELBROT_MITE ||
                    e.enemyType === EnemyType.SWARMER ||
                    e.enemyType === EnemyType.DRONE) {
                    isGlowing = true;
                }

                if (isGlowing) {
                    const rgb = parseColorToRgb(e.color);
                    if (rgb) {
                        lightSources.push({
                            x: e.pos.x,
                            y: e.pos.y,
                            r: rgb.r, g: rgb.g, b: rgb.b,
                            radius: e.radius * 2 + 100,
                            intensity: 0.6
                        });
                        lightAdded = true;
                    }
                }
            }

            if (!lightAdded) {
                const rgb = parseColorToRgb(e.color);
                if (rgb) {
                    lightSources.push({
                        x: e.pos.x,
                        y: e.pos.y,
                        r: rgb.r, g: rgb.g, b: rgb.b,
                        radius: e.radius + 60,
                        intensity: 0.3
                    });
                }
            }
        }
    });

    // PICKUPS
    pickups.forEach(p => {
        if (!p.markedForDeletion) {
            if (!isOnScreen(p.pos.x, p.pos.y, 250)) return;

            const rgb = parseColorToRgb(p.color);
            if (rgb) {
                let intensity = 0.4;
                let radius = 60;

                let r = rgb.r;
                let g = rgb.g;
                let b = rgb.b;

                if (p.kind === 'SUPPLY_DROP') { intensity = 0.8; radius = 200; }
                else if (p.kind === 'MISSION_ITEM' || p.kind === 'MISSION_ZONE') { intensity = 0.9; radius = 180; }
                else if (p.kind === 'HEALTH') { intensity = 0.6; radius = 90; }
                else if (p.kind === 'TIME_CRYSTAL') { intensity = 1.0; radius = 150; }
                else if (p.kind === 'STASIS_FIELD') { intensity = 1.5; radius = 180; }
                else if (p.kind === 'KALEIDOSCOPE') { intensity = 1.5; radius = 180; }
                else if (p.kind === 'XP') {
                    intensity = 1.0; // Less strong (was 2.0)
                    radius = 120; // Slightly smaller radius to tighten the feel
                    // Override color to be "More Blue" (Deep Blue instead of Cyan)
                    r = 0; g = 60; b = 255;
                }

                lightSources.push({
                    x: p.pos.x,
                    y: p.pos.y,
                    r: r, g: g, b: b,
                    radius: radius,
                    intensity: intensity
                });
            }
        }
    });

    // MISSION ENTITIES
    missionEntities.forEach(e => {
        if (!isOnScreen(e.pos.x, e.pos.y, 1500)) return; // Large culling radius for big events

        if (e.kind === 'OBELISK' && e.active) {
            lightSources.push({
                x: e.pos.x,
                y: e.pos.y,
                r: 0, g: 255, b: 0,
                radius: 400,
                intensity: 2.0
            });
        }

        if (e.kind === 'FILTER_WAVE' && e.filterData) {
            const fd = e.filterData;
            const wallH = 2500;
            const curveD = 600;
            const spacing = 150;

            const waveCount = 3;
            const speed = 0.05;

            for (let w = 0; w < waveCount; w++) {
                const t = (frame * speed + w / waveCount) % 1.0;
                const forwardOffset = 200 + (t * 1000);
                const strength = (1 - t) * 100;

                for (let y = -wallH; y <= wallH; y += 800) {
                    if (Math.abs(y) < fd.holeWidth * 3) continue;
                    const lx = Math.pow(y / wallH, 2) * curveD + forwardOffset;
                    const ly = y;
                    const cosA = Math.cos(fd.angle);
                    const sinA = Math.sin(fd.angle);
                    const wx = e.pos.x + (lx * cosA - ly * sinA);
                    const wy = e.pos.y + (lx * sinA + ly * cosA);

                    if (isOnScreen(wx, wy, 1000)) {
                        renderShockwaves.push({
                            id: `filter_wave_${w}_${y}`,
                            pos: { x: wx, y: wy },
                            time: t * 100,
                            maxDuration: 100,
                            maxRadius: 1000,
                            strength: strength,
                            contracting: false
                        });
                    }
                }
            }

            for (let y = -wallH; y <= wallH; y += spacing) {
                if (Math.abs(y) < fd.holeWidth * 2) continue;
                const lx = Math.pow(y / wallH, 2) * curveD;
                const ly = y;
                const cosA = Math.cos(fd.angle);
                const sinA = Math.sin(fd.angle);
                const wx = e.pos.x + (lx * cosA - ly * sinA);
                const wy = e.pos.y + (lx * sinA + ly * cosA);

                if (isOnScreen(wx, wy, 400)) {
                    lightSources.push({
                        x: wx,
                        y: wy,
                        r: 255, g: 0, b: 85,
                        radius: 350,
                        intensity: 1.5
                    });
                    distortionSources.push({
                        x: wx,
                        y: wy,
                        radius: 400,
                        strength: 3.5
                    });
                }
            }
        }

        if (e.kind === 'EVENT_HORIZON') {
            distortionSources.push({
                x: e.pos.x,
                y: e.pos.y,
                radius: 900,
                strength: 4.0
            });

            const waveSpeed = 6;
            const maxDuration = 500;
            const spawnInterval = 120;

            const currentCycle = Math.floor(frame / spawnInterval);
            const lookback = Math.ceil(maxDuration / spawnInterval);

            for (let i = 0; i <= lookback; i++) {
                const startFrame = (currentCycle - i) * spawnInterval;
                const t = frame - startFrame;

                if (t >= 0 && t < maxDuration) {
                    const strength = 180;
                    renderShockwaves.push({
                        id: `eh_ripple_${e.id}_${startFrame}`,
                        pos: e.pos,
                        time: t,
                        maxDuration: maxDuration,
                        maxRadius: maxDuration * waveSpeed,
                        strength: strength,
                        contracting: true
                    });
                }
            }
        }
    });

    // 1. Background Layer (Pass arrays populated with on-screen entities only)
    drawBackground(ctx, canvasWidth, canvasHeight, camera, frame, palette);

    // --- MEGASTRUCTURE (Wave 7) ---
    if (waveId === 7) {
        drawMegastructure(ctx, canvasWidth, canvasHeight, frame, camera, palette);
    }

    // --- SIERPINSKI TETRAHEDRON (Wave 16) ---
    if (waveId === 16) {
        drawSierpinskiTetrahedron(ctx, canvasWidth, canvasHeight, frame, camera, palette);
    }

    // --- GREAT FILTER RED WARNING BACKGROUND (Under Grid) ---
    if (activeMissionType === MissionType.THE_GREAT_FILTER) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const alpha = 0.15 + Math.sin(frame * 0.1) * 0.1;
        ctx.fillStyle = `rgba(100, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }

    // --- SOLAR STORM GLOBAL EFFECTS ---
    if (activeMissionType === MissionType.SOLAR_STORM && missionProgress) {
        const solarData = (missionProgress as MissionState)?.customData?.solarData;
        if (solarData) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            if (solarData.state === 'WARNING') {
                // Red/Orange Warning Flash - Softer
                const alpha = 0.05 + Math.sin(frame * 0.1) * 0.05; // Reduced opacity and speed

                // Vignette - Smoother
                const grad = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.4, canvasWidth / 2, canvasHeight / 2, canvasHeight);
                grad.addColorStop(0, 'rgba(255, 60, 0, 0)');
                grad.addColorStop(1, `rgba(255, 40, 0, ${alpha * 3})`); // Soft red/orange glow at edges
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            } else if (solarData.state === 'STORM') {
                // Intensive Storm - Evolution of Warning
                // Use similar Vignette style but much more intense and filling the screen
                const intensity = solarData.intensity || 0;

                // Dynamic Pulse: Speed increases with intensity
                const pulseSpeed = 0.1 + intensity * 0.4;
                const pulse = Math.sin(frame * pulseSpeed) * (0.1 + intensity * 0.1);

                // Secondary rapid shimmer
                const shimmer = Math.sin(frame * 0.8) * 0.05 * intensity;

                // Base Overlay - Intense Orange/Red
                const baseAlpha = 0.3 + intensity * 0.4 + pulse + shimmer;

                // Vignette Style but crushing in
                // The "eye" of the storm gets smaller as intensity rises
                const centerRadius = canvasHeight * (0.3 - intensity * 0.15 + pulse * 0.5);

                const grad = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, Math.max(0, centerRadius), canvasWidth / 2, canvasHeight / 2, canvasHeight * 1.2);
                grad.addColorStop(0, `rgba(255, 120, 0, ${baseAlpha * 0.4})`); // Center is brighter/clearer
                grad.addColorStop(0.6, `rgba(255, 60, 0, ${baseAlpha})`);
                grad.addColorStop(1, `rgba(255, 20, 0, ${baseAlpha * 1.2})`); // Darker, blood-red edges

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Sun Direction Highlight (Instead of lines)
                // A massive gradient sweep from the sun direction
                const sunAngle = solarData.sunAngle;
                const diag = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2);
                const cx = canvasWidth / 2;
                const cy = canvasHeight / 2;

                // Position huge glow source far away
                const glowX = cx + Math.cos(sunAngle) * diag; // Sun source
                const glowY = cy + Math.sin(sunAngle) * diag;

                // Pulse the sun glow size
                const glowSize = diag * (0.5 + intensity * 0.3 + pulse);

                const sunGrad = ctx.createRadialGradient(glowX, glowY, glowSize * 0.2, cx, cy, glowSize * 2.5);
                sunGrad.addColorStop(0, `rgba(255, 255, 220, ${0.6 + intensity * 0.4 + shimmer})`); // Blinding white/yellow
                sunGrad.addColorStop(0.4, `rgba(255, 200, 50, ${0.4 + intensity * 0.3})`);
                sunGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = sunGrad;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }

            ctx.restore();
        }
    }

    // --- Joy Division Topographic Landscape ---
    ctx.save();
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-camX + shakeX, -camY + shakeY);

    // Draw Landscape with updated signature (removed gridActivators)
    drawLandscape(ctx, viewLeft, viewRight, viewTop, viewBottom, palette, frame, camX, renderShockwaves, lightSources, distortionSources);

    // DRAW ABYSSAL LOOP EFFECTS
    projectiles.forEach(p => {
        if (p.sourceWeaponId === 'abyssal_loop_collapse' && p.polyPoints) {
            const alpha = Math.min(1, p.duration / 30);
            drawAbyssalLoop(ctx, p.polyPoints, frame, alpha, camX, camY, viewBounds);
        }
    });

    // --- RENDER QUEUE FOR DEPTH SORTING ---
    // Collect all "Tall" entities: Player, Enemies, Obstacles, Replicas, and vertical Mission Entities
    type RenderItem = {
        y: number;
        draw: () => void;
    };
    const renderQueue: RenderItem[] = [];

    // 1. OBSTACLES
    obstacles.forEach(obs => {
        if (isOnScreen(obs.pos.x, obs.pos.y, obs.radius * 2)) {
            renderQueue.push({
                y: obs.pos.y,
                draw: () => {
                    ctx.save();
                    ctx.translate(obs.pos.x, obs.pos.y);
                    drawObstacle(ctx, obs, frame, palette.grid, lightSources);
                    ctx.restore();
                }
            });
        }
    });

    // 2. REPLICAS
    replicas.forEach(r => {
        renderQueue.push({
            y: r.pos.y,
            draw: () => {
                if (r.isSpectral) {
                    // Determine Class based on Color (set in createAllyReplica)
                    let type = 'ASSAULT';
                    if (r.color === '#00FF88') type = 'SNIPER';
                    else if (r.color === '#FF8800') type = 'SUPPORT';

                    // Animation Params
                    const t = frame * 0.05;
                    const bob = Math.sin(t * 2 + (r.id.charCodeAt(0) % 10)) * 2;
                    const roll = Math.cos(t * 0.5) * 0.1;
                    const pitch = 0;
                    const yaw = r.rotation;

                    ctx.save();
                    ctx.translate(r.pos.x, r.pos.y);

                    const _proj = (x: number, y: number, z: number) => project3D(x, y + bob, z, roll, pitch, yaw, 300);

                    const drawPoly = (verts: any[], col: string, glow: boolean) => {
                        if (verts.length === 0) return;
                        ctx.beginPath();
                        ctx.moveTo(verts[0].x, verts[0].y);
                        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
                        ctx.closePath();
                        ctx.fillStyle = hexToRgba(col, 0.4); // Semitransparent core
                        ctx.strokeStyle = col;
                        ctx.lineWidth = glow ? 2 : 1;
                        if (glow) {
                            ctx.shadowBlur = 15;
                            ctx.shadowColor = col;
                        }
                        ctx.fill();
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    };

                    if (type === 'ASSAULT' || type === 'SNIPER') {
                        // Green Icosahedron (Wireframe)
                        const s = 18;
                        const t2 = (1 + Math.sqrt(5)) / 2;
                        // Icosahedron Vertices
                        const verts = [
                            { x: -1, y: t2, z: 0 }, { x: 1, y: t2, z: 0 }, { x: -1, y: -t2, z: 0 }, { x: 1, y: -t2, z: 0 },
                            { x: 0, y: -1, z: t2 }, { x: 0, y: 1, z: t2 }, { x: 0, y: -1, z: -t2 }, { x: 0, y: 1, z: -t2 },
                            { x: t2, y: 0, z: -1 }, { x: t2, y: 0, z: 1 }, { x: -t2, y: 0, z: -1 }, { x: -t2, y: 0, z: 1 }
                        ].map(v => ({ x: v.x * s * 0.6, y: v.y * s * 0.6, z: v.z * s * 0.6 })); // Scale down slightly

                        // Faces (Triangles) or Edges? Wireframe requested.
                        // Edges logic: Connect vertices.
                        // Simplified: Draw vertices and connect nearest neighbors?
                        // Authentic Icosahedron edges:
                        const edges = [
                            [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
                            [1, 5], [1, 7], [1, 8], [1, 9],
                            [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
                            [3, 4], [3, 6], [3, 8], [3, 9],
                            [4, 5], [4, 9], [4, 11],
                            [5, 9], // Fixed connection
                            [6, 7], [6, 8], [6, 10],
                            [7, 8],
                            [8, 9], [10, 11]
                        ];
                        // Auto-rotate
                        const autoRoll = frame * 0.02;
                        const autoPitch = frame * 0.03;

                        ctx.lineWidth = 1.5;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = '#00FF88';

                        edges.forEach(e => {
                            const v1 = verts[e[0]];
                            const v2 = verts[e[1]];
                            // Rotate V1
                            let y1 = v1.y * Math.cos(autoRoll) - v1.z * Math.sin(autoRoll);
                            let z1 = v1.y * Math.sin(autoRoll) + v1.z * Math.cos(autoRoll);
                            let x1 = v1.x * Math.cos(autoPitch) - z1 * Math.sin(autoPitch);
                            z1 = v1.x * Math.sin(autoPitch) + z1 * Math.cos(autoPitch); // Update z1

                            // Rotate V2
                            let y2 = v2.y * Math.cos(autoRoll) - v2.z * Math.sin(autoRoll);
                            let z2 = v2.y * Math.sin(autoRoll) + v2.z * Math.cos(autoRoll);
                            let x2 = v2.x * Math.cos(autoPitch) - z2 * Math.sin(autoPitch);
                            z2 = v2.x * Math.sin(autoPitch) + z2 * Math.cos(autoPitch);

                            const p1 = _proj(x1, y1, z1);
                            const p2 = _proj(x2, y2, z2);

                            ctx.strokeStyle = '#00FF88';
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        });

                        // Center Core
                        ctx.fillStyle = '#FFFFFF';
                        ctx.shadowBlur = 20;
                        const core = _proj(0, 0, 0);
                        ctx.beginPath(); ctx.arc(core.x, core.y, 4, 0, Math.PI * 2); ctx.fill();
                        ctx.shadowBlur = 0;

                    }
                    else if (type === 'SUPPORT') {
                        // Orange Halo (Existing, slightly refined)
                        const r1 = 16; const r2 = 22; const segs = 8;
                        const c = '#FF8800';

                        // Draw Ring
                        ctx.beginPath();
                        for (let i = 0; i <= segs; i++) {
                            const a = (i / segs) * Math.PI * 2 + t;
                            const p = _proj(Math.cos(a) * r2, Math.sin(a) * r2, 0);
                            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                        }
                        ctx.closePath();
                        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = c; ctx.stroke(); ctx.shadowBlur = 0;

                        // Floating bits
                        for (let i = 0; i < 3; i++) {
                            const a = (i / 3) * Math.PI * 2 - t * 2;
                            const p = _proj(Math.cos(a) * 10, Math.sin(a) * 10, Math.sin(t * 4 + i) * 8);
                            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
                        }
                    }

                    ctx.restore();
                } else {
                    drawPlayerMesh(ctx, r.pos.x, r.pos.y, 22, frame, '#00FFFF');
                }
            }
        });
    });

    // 3. MISSION ENTITIES (Split into Floor vs Tall)
    missionEntities.forEach(e => {
        if (!isOnScreen(e.pos.x, e.pos.y, 2000)) return;

        // Tall entities need sorting
        const isVertical = ['PAYLOAD', 'OBELISK', 'STATION', 'CLONE', 'SOLAR_SHIELD'].includes(e.kind);

        if (isVertical) {
            renderQueue.push({
                y: e.pos.y,
                draw: () => drawMissionEntity(ctx, e, frame, missionProgress, player)
            });
        } else {
            // Draw Ground/Background entities immediately (Floor Layer)
            drawMissionEntity(ctx, e, frame, missionProgress, player);
        }
    });

    // 4. ENEMIES
    enemies.forEach(e => {
        if (isOnScreen(e.pos.x, e.pos.y, e.radius)) {
            renderQueue.push({
                y: e.pos.y,
                draw: () => drawEnemy(ctx, e, frame)
            });
        }
    });

    // 5. PLAYER
    renderQueue.push({
        y: player.pos.y,
        draw: () => drawPlayer(ctx, player, frame, activeMissionType)
    });

    // Draw Pickups (Floor Layer, above zones but below tall objects)
    pickups.forEach(p => drawPickup(ctx, p, frame, viewBounds));

    // --- DRAW TRINITY LINKS (Before sorted entities) ---
    ctx.save();
    enemies.forEach(e => {
        if (e.trinityData && !e.markedForDeletion) {
            e.trinityData.siblings.forEach(sibId => {
                if (e.id < sibId) {
                    const sibling = enemies.find(s => s.id === sibId && !s.markedForDeletion);
                    if (sibling) {
                        const dist = Math.sqrt((e.pos.x - sibling.pos.x) ** 2 + (e.pos.y - sibling.pos.y) ** 2);
                        if (dist < 1500 && isOnScreen((e.pos.x + sibling.pos.x) / 2, (e.pos.y + sibling.pos.y) / 2, 1000)) {
                            ctx.globalAlpha = 0.8;
                            drawLightningBolt(ctx, e.pos, sibling.pos, '#FF0000', 2.5, 20);
                            drawLightningBolt(ctx, e.pos, sibling.pos, '#FFFFFF', 1.0, 15);
                        }
                    }
                }
            });
        }
    });
    ctx.restore();

    // --- EXECUTE SORTED RENDER QUEUE ---
    renderQueue.sort((a, b) => a.y - b.y);
    renderQueue.forEach(item => item.draw());

    // --- DRAW PROJECTILES & WEAPON EFFECTS (Always on top) ---
    drawProjectiles(ctx, projectiles, player, frame, viewBounds);

    // --- Supply Drop, Boss & Mission Indicators (Screen Space) ---

    // --- Supply Drop, Boss & Mission Indicators (Screen Space) ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const drawIndicator = (pos: { x: number, y: number }, color: string, label?: string) => {
        const screenX = (pos.x - camX) * ZOOM_LEVEL;
        const screenY = (pos.y - camY) * ZOOM_LEVEL;
        const detectionPad = 40;
        const marginX = 40;
        const marginY = 130;

        const w = canvasWidth;
        const h = canvasHeight;

        if (screenX < -detectionPad || screenX > w + detectionPad || screenY < -detectionPad || screenY > h + detectionPad) {
            const centerX = w / 2;
            const centerY = h / 2;
            const dx = screenX - centerX;
            const dy = screenY - centerY;
            const angle = Math.atan2(dy, dx);

            const boundW = w / 2 - marginX;
            const boundH = h / 2 - marginY;

            let intersectX = 0;
            let intersectY = 0;

            if (boundW * Math.abs(Math.tan(angle)) > boundH) {
                intersectY = dy > 0 ? boundH : -boundH;
                intersectX = intersectY / Math.tan(angle);
            } else {
                intersectX = dx > 0 ? boundW : -boundW;
                intersectY = intersectX * Math.tan(angle);
            }

            const arrowX = centerX + intersectX;
            const arrowY = centerY + intersectY;

            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(angle);
            const scale = 1 + Math.sin(frame * 0.2) * 0.2;
            ctx.scale(scale, scale);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(-25, -25);
            ctx.lineTo(25, 0);
            ctx.lineTo(-25, 25);
            ctx.stroke();

            if (label) {
                ctx.rotate(-angle);
                ctx.fillStyle = color;
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, 0, 40);
            }

            ctx.restore();
        }
    };

    if (tutorialTargetPickup) {
        const screenX = (tutorialTargetPickup.pos.x - camX) * ZOOM_LEVEL;
        const screenY = (tutorialTargetPickup.pos.y - camY) * ZOOM_LEVEL;
        const pad = 40;
        const isOffScreen = screenX < -pad || screenX > canvasWidth + pad || screenY < -pad || screenY > canvasHeight + pad;

        if (isOffScreen) {
            drawIndicator(tutorialTargetPickup.pos, '#00FFFF', 'GET DATA');
        } else {
            const arrowY = screenY - 40 + Math.sin(frame * 0.2) * 5;
            ctx.save();
            ctx.translate(screenX, arrowY);
            ctx.fillStyle = '#00FFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, -15);
            ctx.lineTo(10, -15);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("GET", 0, -20);
            ctx.restore();
        }
    }

    pickups.forEach(p => {
        if (p.kind === 'SUPPLY_DROP' || p.kind === 'TIME_CRYSTAL' || p.kind === 'KALEIDOSCOPE' || p.kind === 'STASIS_FIELD') {
            drawIndicator(p.pos, '#ffffff');
        }
    });

    enemies.forEach(e => {
        if (e.isBoss) drawIndicator(e.pos, '#ff0000');
    });

    if (targets) {
        targets.forEach(t => drawIndicator(t.pos, t.color, t.label));
    }

    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-camX + shakeX, -camY + shakeY);

    particles.forEach(part => {
        if (isOnScreen(part.pos.x, part.pos.y, 50)) {
            if (part.type === EntityType.TEXT_PARTICLE) {
                const p = part as TextParticle;
                ctx.save();
                ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity;
                ctx.font = 'bold 24px monospace';
                ctx.fillText(p.text, p.pos.x, p.pos.y);
                ctx.restore();
            } else if (part.type === EntityType.VISUAL_PARTICLE) {
                const p = part as VisualParticle;
                ctx.save();
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;

                if (p.shape === 'LINE') {
                    ctx.save();
                    ctx.translate(p.pos.x, p.pos.y);
                    ctx.rotate(p.rotation || 0);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    const halfLen = p.size / 2;
                    ctx.moveTo(-halfLen, 0);
                    ctx.lineTo(halfLen, 0);
                    ctx.stroke();
                    ctx.restore();
                } else if (p.shape === 'CIRCLE') {
                    ctx.beginPath();
                    ctx.arc(p.pos.x, p.pos.y, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'POLYGON' && p.polygon && p.polygon.length > 0) {
                    ctx.save();
                    ctx.translate(p.pos.x, p.pos.y);
                    ctx.rotate(p.rotation || 0);
                    ctx.beginPath();
                    ctx.moveTo(p.polygon[0].x * p.size, p.polygon[0].y * p.size);
                    for (let i = 1; i < p.polygon.length; i++) {
                        ctx.lineTo(p.polygon[i].x * p.size, p.polygon[i].y * p.size);
                    }
                    ctx.closePath();
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
                }
                ctx.restore();
            }
        }
    });
    ctx.restore();

    if (glitchIntensity > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'screen';

        const rOffset = glitchIntensity;
        const bOffset = -glitchIntensity;

        ctx.filter = `drop-shadow(${rOffset}px 0px rgba(255,0,0,0.5)) drop-shadow(${bOffset}px 0px rgba(0,255,255,0.5))`;
        ctx.drawImage(ctx.canvas, 0, 0);

        ctx.restore();
    }

    if (isFrozen) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 50, 100, 0.15)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(10px) brightness(1.2)';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
}
