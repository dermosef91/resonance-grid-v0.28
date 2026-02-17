
import { Enemy, Player, Projectile, Pickup, TextParticle, EntityType, VisualParticle, MissionEntity, MissionType, ColorPalette, Vector2, Shockwave, EnemyType, Replica, Obstacle } from '../types';
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
    missionProgress?: { current: number, total: number },
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
                let intensity = 0.5;
                let rad = lightRad;

                if (p.sourceWeaponId === 'void_aura') {
                    intensity = 1.5;
                    rad = Math.max(200, p.radius * 2.5 + 100);
                } else if (p.sourceWeaponId === 'solar_chakram') {
                    intensity = 1.2;
                    rad = Math.max(180, p.radius * 2.5 + 60);
                } else if (p.isEnemy) {
                    intensity = 1.2;
                    rad = Math.max(120, p.radius * 4 + 50);
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
                    e.enemyType === EnemyType.SWARMER) {
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

                if (p.kind === 'SUPPLY_DROP') { intensity = 0.8; radius = 200; }
                else if (p.kind === 'MISSION_ITEM' || p.kind === 'MISSION_ZONE') { intensity = 0.9; radius = 180; }
                else if (p.kind === 'HEALTH') { intensity = 0.6; radius = 90; }
                else if (p.kind === 'TIME_CRYSTAL') { intensity = 1.0; radius = 150; }
                else if (p.kind === 'STASIS_FIELD') { intensity = 1.5; radius = 180; }
                else if (p.kind === 'KALEIDOSCOPE') { intensity = 1.5; radius = 180; }

                lightSources.push({
                    x: p.pos.x,
                    y: p.pos.y,
                    r: rgb.r, g: rgb.g, b: rgb.b,
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
                    drawObstacle(ctx, obs, frame, palette.grid);
                    ctx.restore();
                }
            });
        }
    });

    // 2. REPLICAS
    replicas.forEach(r => {
        renderQueue.push({
            y: r.pos.y,
            draw: () => drawPlayerMesh(ctx, r.pos.x, r.pos.y, 22, frame, '#00FFFF')
        });
    });

    // 3. MISSION ENTITIES (Split into Floor vs Tall)
    missionEntities.forEach(e => {
        if (!isOnScreen(e.pos.x, e.pos.y, 2000)) return;

        // Tall entities need sorting
        const isVertical = ['PAYLOAD', 'OBELISK', 'STATION', 'CLONE'].includes(e.kind);

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
