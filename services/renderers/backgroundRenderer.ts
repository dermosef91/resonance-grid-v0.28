
import { COLORS, ZOOM_LEVEL } from '../../constants';
import { ColorPalette, Shockwave, BaseLandscapeConfig } from '../../types';
import { hexToRgba, hexToRgbStruct, project3D } from '../renderUtils';

// --- STAR CONFIGURATION ---
const STAR_LAYERS = [
    { speed: 0.02, size: 1.0, count: 50, color: 'rgba(255, 255, 255, 0.9)' }, // Distant
    { speed: 0.08, size: 1.5, count: 25, color: 'rgba(255, 200, 150, 0.8)' }, // Mid
    { speed: 0.20, size: 2.0, count: 12, color: 'rgba(255, 100, 50, 0.8)' }   // Close
];

const STAR_FIELD_SIZE = 2500;
const STARS: { x: number, y: number, layer: number, phase: number }[] = [];

if (STARS.length === 0) {
    for (let l = 0; l < STAR_LAYERS.length; l++) {
        for (let i = 0; i < STAR_LAYERS[l].count; i++) {
            STARS.push({
                x: Math.random() * STAR_FIELD_SIZE,
                y: Math.random() * STAR_FIELD_SIZE,
                layer: l,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
}

// --- NEBULA CONFIGURATION ---
const NEBULA_COUNT = 12;
const NEBULA_CLOUDS: { x: number, y: number, radius: number, variant: 'PRIMARY' | 'SECONDARY', opacity: number }[] = [];

if (NEBULA_CLOUDS.length === 0) {
    for (let i = 0; i < NEBULA_COUNT; i++) {
        NEBULA_CLOUDS.push({
            x: Math.random() * STAR_FIELD_SIZE,
            y: Math.random() * STAR_FIELD_SIZE,
            radius: 400 + Math.random() * 400,
            variant: Math.random() > 0.5 ? 'PRIMARY' : 'SECONDARY',
            opacity: 0.1 + Math.random() * 0.15
        });
    }
}

export interface LightSource {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    radius: number;
    intensity: number;
}

export interface DistortionSource {
    x: number;
    y: number;
    radius: number;
    strength: number; // 0.0 to 1.0+
}

// --- VOLUMETRIC HELPER ---
const drawVolumetricRing = (
    ctx: CanvasRenderingContext2D,
    radius: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    rz: number,
    color: string
) => {
    const segments = 64;
    const rInner = radius - width / 2;
    const rOuter = radius + width / 2;
    const hHalf = height / 2;

    const projectedPoints: { x: number, y: number }[][] = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        // 4 Corners of cross-section (Z is perpendicular to ring plane)
        const corners = [
            { r: rInner, z: hHalf },
            { r: rOuter, z: hHalf },
            { r: rOuter, z: -hHalf },
            { r: rInner, z: -hHalf }
        ];

        const projectedCorners = corners.map(c => {
            // Local coords: Ring lies on XY plane (Z=0) conceptually before thickness
            const x = cos * c.r;
            const y = sin * c.r;
            const z = c.z; // Thickness acts as Z

            // Project with global ring rotation
            return project3D(x, y, z, rx, ry, rz, 2000);
        });

        projectedPoints.push(projectedCorners);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    // Draw 4 Rails
    for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const p = projectedPoints[i][c];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    // Draw Struts (Cross-sections)
    ctx.lineWidth = 1;
    const strutFreq = 4; // Every 4 segments
    for (let i = 0; i < segments; i += strutFreq) {
        const corners = projectedPoints[i];
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.lineTo(corners[0].x, corners[0].y);
        ctx.stroke();
    }
};

const drawWireframeSphere = (ctx: CanvasRenderingContext2D, radius: number, rx: number, ry: number, color: string) => {
    const lat = 6;
    const long = 8;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Longitudes
    for (let i = 0; i < long; i++) {
        const phi = (i / long) * Math.PI * 2;
        for (let j = 0; j <= 24; j++) {
            const theta = (j / 24) * Math.PI;
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const z = radius * Math.sin(theta) * Math.sin(phi);
            const y = radius * Math.cos(theta);
            const p = project3D(x, y, z, rx, ry, 0, 2000);
            if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
    }
    // Latitudes
    for (let i = 1; i < lat; i++) {
        const theta = (i / lat) * Math.PI;
        const rRing = radius * Math.sin(theta);
        const yRing = radius * Math.cos(theta);
        for (let j = 0; j <= 24; j++) {
            const phi = (j / 24) * Math.PI * 2;
            const x = rRing * Math.cos(phi);
            const z = rRing * Math.sin(phi);
            const y = yRing;
            const p = project3D(x, y, z, rx, ry, 0, 2000);
            if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
    }
    ctx.stroke();
};

export const drawSierpinskiTetrahedron = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frame: number,
    camera: { x: number, y: number },
    palette: ColorPalette
) => {
    // Parallax position (Background)
    const parallax = 0.5;
    const cx = width / 2 + (0 - camera.x) * parallax;
    const cy = height / 2 + (0 - camera.y) * parallax;

    // Cull if far off-screen
    if (cx < -500 || cx > width + 500) return;

    const size = 325; // 50% Smaller (Was 650)

    ctx.save();
    ctx.translate(cx, cy);

    // Style from palette
    const strokeColor = palette.grid;
    const fillColor = hexToRgba(palette.nebulaPrimary, 0.1);

    // Vertices for a regular tetrahedron relative to center (0,0,0)
    // h = height, r = circumradius
    const h = size;
    const r = size / Math.sqrt(2);

    // Base vectors (Top, Front, BackRight, BackLeft)
    // In local space: Y is UP (negative in canvas coords), Z is depth
    const v0 = { x: 0, y: -h * 0.75, z: 0 };
    const v1 = { x: 0, y: h * 0.25, z: r };
    const v2 = { x: r * 0.866, y: h * 0.25, z: -r * 0.5 };
    const v3 = { x: -r * 0.866, y: h * 0.25, z: -r * 0.5 };

    // Almost Top-Down Look
    const rotX = 1.0; // Pitch forward to see top (~57 degrees)
    const rotY = 0;
    const rotZ = Math.PI / 4; // Angle slightly

    const drawRecursive = (currOffset: { x: number, y: number, z: number }, scale: number, depth: number) => {
        if (depth === 0) {
            // Transform Function
            const transform = (v: { x: number, y: number, z: number }) => {
                // 1. Scale and position in Fractal (Model Space)
                let x = v.x * scale + currOffset.x;
                let y = v.y * scale + currOffset.y;
                let z = v.z * scale + currOffset.z;

                // 2. Project with World Rotation (Top-down tilt)
                return project3D(x, y, z, rotX, rotY, rotZ, 800);
            };

            const p0 = transform(v0);
            const p1 = transform(v1);
            const p2 = transform(v2);
            const p3 = transform(v3);

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.fillStyle = fillColor;
            ctx.lineJoin = 'round';

            // Draw Faces
            const drawFace = (a: any, b: any, c: any) => {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            };

            // Faces
            drawFace(p0, p1, p2);
            drawFace(p0, p2, p3);
            drawFace(p0, p3, p1);
            // Base is usually hidden in top-down or obscured, drawing mostly sides/top
            return;
        }

        const nextScale = scale * 0.5;
        // Recurse to 4 sub-tetrahedrons located at the vertices
        drawRecursive({ x: currOffset.x + v0.x * nextScale, y: currOffset.y + v0.y * nextScale, z: currOffset.z + v0.z * nextScale }, nextScale, depth - 1);
        drawRecursive({ x: currOffset.x + v1.x * nextScale, y: currOffset.y + v1.y * nextScale, z: currOffset.z + v1.z * nextScale }, nextScale, depth - 1);
        drawRecursive({ x: currOffset.x + v2.x * nextScale, y: currOffset.y + v2.y * nextScale, z: currOffset.z + v2.z * nextScale }, nextScale, depth - 1);
        drawRecursive({ x: currOffset.x + v3.x * nextScale, y: currOffset.y + v3.y * nextScale, z: currOffset.z + v3.z * nextScale }, nextScale, depth - 1);
    };

    drawRecursive({ x: 0, y: 0, z: 0 }, 1.0, 3);

    ctx.restore();
};

export const drawMegastructure = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, camera: { x: number, y: number }, palette: ColorPalette) => {
    // Parallax position: Use 0.5 to make it feel like a massive object in the middle distance (World 0,0)
    const parallax = 0.5;
    const cx = width / 2 + (0 - camera.x) * parallax;
    const cy = height / 2 + (0 - camera.y) * parallax;

    // Cull if off-screen (with margin for size)
    const renderMargin = 1000;
    if (cx < -renderMargin || cx > width + renderMargin || cy < -renderMargin || cy > height + renderMargin) return;

    const radius = 300;
    const t = frame * 0.002;

    // Determine colors based on palette
    const gridColor = palette.grid;
    const nebulaColor = palette.nebulaPrimary;

    const ring1Color = hexToRgba(gridColor, 0.4); // Outer ring, subtle
    const ring2Color = hexToRgba(gridColor, 0.6); // Middle ring, slightly brighter
    const ring3Color = hexToRgba(nebulaColor, 0.9); // Inner ring, contrast
    const coreColor = hexToRgba('#FF4500', 0.7); // Core slightly transparent

    ctx.save();
    ctx.translate(cx, cy);

    // Style
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';

    // Ring 1 (Vertical-ish) - Volumetric
    drawVolumetricRing(ctx, radius, 30, 15, t * 0.8, t * 0.2, 0, ring1Color);

    // Ring 2 (Horizontal-ish)
    drawVolumetricRing(ctx, radius * 0.8, 25, 12, t * 0.3, t * 1.1, Math.PI / 4, ring2Color);

    // Ring 3 (Inner Fast)
    drawVolumetricRing(ctx, radius * 0.5, 15, 8, t * 1.5, 0, t * 0.5, ring3Color);

    // Core - Wireframe Sphere
    const corePulse = 1 + Math.sin(frame * 0.05) * 0.1;
    const coreR = radius * 0.18 * corePulse;
    drawWireframeSphere(ctx, coreR, t * 3, t * 2, coreColor);

    ctx.restore();
};

export const drawBackground = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    camera: { x: number, y: number },
    frame: number,
    palette: ColorPalette
) => {
    // 1. Solid Background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Nebula Clouds
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const nebulaSpeed = 0.01;
    const nebOffsetX = (camera.x * nebulaSpeed);
    const nebOffsetY = (camera.y * nebulaSpeed);

    NEBULA_CLOUDS.forEach(cloud => {
        let x = (cloud.x - nebOffsetX) % STAR_FIELD_SIZE;
        let y = (cloud.y - nebOffsetY) % STAR_FIELD_SIZE;
        if (x < 0) x += STAR_FIELD_SIZE;
        if (y < 0) y += STAR_FIELD_SIZE;

        const pad = cloud.radius;
        for (let ix = -1; ix <= 1; ix++) {
            const tx = x + (ix * STAR_FIELD_SIZE);
            if (tx < -pad || tx > canvasWidth + pad) continue;

            for (let iy = -1; iy <= 1; iy++) {
                const ty = y + (iy * STAR_FIELD_SIZE);
                if (ty < -pad || ty > canvasHeight + pad) continue;

                if (Number.isFinite(tx) && Number.isFinite(ty) && Number.isFinite(cloud.radius) && cloud.radius >= 0) {
                    const colorHex = cloud.variant === 'PRIMARY' ? palette.nebulaPrimary : palette.nebulaSecondary;
                    const colorRgba = hexToRgba(colorHex, 1).replace(', 1)', '');

                    const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, cloud.radius);
                    grad.addColorStop(0, colorRgba + `, ${cloud.opacity})`);
                    grad.addColorStop(1, colorRgba + ', 0)');

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(tx, ty, cloud.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    });
    ctx.restore();

    // 3. Parallax Starfield
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    STAR_LAYERS.forEach((layer, layerIdx) => {
        const offsetX = (camera.x * layer.speed);
        const offsetY = (camera.y * layer.speed);

        ctx.fillStyle = layer.color;

        for (const star of STARS) {
            if (star.layer !== layerIdx) continue;
            let x = (star.x - offsetX) % STAR_FIELD_SIZE;
            let y = (star.y - offsetY) % STAR_FIELD_SIZE;
            if (x < 0) x += STAR_FIELD_SIZE;
            if (y < 0) y += STAR_FIELD_SIZE;

            const alpha = 0.3 + Math.sin(frame * 0.05 + star.phase) * 0.7;
            ctx.globalAlpha = alpha;

            for (let ix = -1; ix <= 1; ix++) {
                const tx = x + (ix * STAR_FIELD_SIZE);
                if (tx < -5 || tx > canvasWidth + 5) continue;
                for (let iy = -1; iy <= 1; iy++) {
                    const ty = y + (iy * STAR_FIELD_SIZE);
                    if (ty < -5 || ty > canvasHeight + 5) continue;
                    if (Number.isFinite(tx) && Number.isFinite(ty)) {
                        ctx.beginPath();
                        ctx.arc(tx, ty, layer.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();
};

const calculateElevation = (x: number, y: number, cfg: BaseLandscapeConfig, frame: number): number => {
    const { noiseScaleX, noiseScaleY, amplitude, sharpness, digitalFactor } = cfg;
    const n1 = Math.sin(x * noiseScaleX) * Math.cos(y * noiseScaleY);
    const n2 = Math.sin(x * (noiseScaleX * 2.5)) * Math.sin(y * (noiseScaleY * 2.5)) * 0.5;
    const drift = Math.sin(frame * 0.005 + y * 0.01) * 0.2;
    let h = n1 + n2 + drift;
    if (digitalFactor > 0.01) {
        const step = 0.5;
        const hDigital = Math.round(h / step) * step;
        h = h + (hDigital - h) * digitalFactor;
    }
    return Math.pow(Math.abs(h), sharpness) * amplitude * (h > 0 ? 1 : -0.2);
};

export const drawLandscape = (
    ctx: CanvasRenderingContext2D,
    viewLeft: number,
    viewRight: number,
    viewTop: number,
    viewBottom: number,
    palette: ColorPalette,
    frame: number,
    camX: number,
    shockwaves: Shockwave[] = [],
    lightSources: LightSource[] = [],
    distortionSources: DistortionSource[] = []
) => {
    if (!Number.isFinite(viewLeft) || !Number.isFinite(viewRight) || !Number.isFinite(viewTop) || !Number.isFinite(viewBottom)) return;

    const lineSpacing = 60; const nodeSpacing = 40;
    const startY = Math.floor(viewTop / lineSpacing) * lineSpacing;
    const endY = Math.floor(viewBottom / lineSpacing) * lineSpacing + lineSpacing;
    const startX = Math.floor(viewLeft / nodeSpacing) * nodeSpacing;
    const endX = Math.floor(viewRight / nodeSpacing) * nodeSpacing + nodeSpacing;

    const baseColor = hexToRgbStruct(palette.grid);
    const baseR = baseColor.r * 0.28;
    const baseG = baseColor.g * 0.28;
    const baseB = baseColor.b * 0.28;

    ctx.lineWidth = 1.5;

    // Pre-filter arrays to only those influencing the current viewport
    const margin = 200;

    const activeLights: LightSource[] = [];
    for (const l of lightSources) {
        if (l.x > viewLeft - margin && l.x < viewRight + margin && l.y > viewTop - margin && l.y < viewBottom + margin) {
            activeLights.push(l);
        }
    }

    const activeShockwaves = shockwaves.filter(sw => sw.time < sw.maxDuration);
    const activeDistortions = distortionSources.filter(d =>
        d.x > viewLeft - margin && d.x < viewRight + margin &&
        d.y > viewTop - margin && d.y < viewBottom + margin
    );

    const primaryCfg = palette.landscape;
    const secondaryCfg = palette.landscape.secondary;
    const blend = palette.landscape.blendFactor ?? 0;

    for (let y = startY; y <= endY; y += lineSpacing) {
        ctx.beginPath();
        let first = true;

        if (Number.isFinite(startX) && Number.isFinite(endX)) {
            const grad = ctx.createLinearGradient(startX, 0, endX, 0);
            const totalWidth = endX - startX;

            if (totalWidth > 0 && activeLights.length > 0) {
                const stopStep = 80;
                for (let sx = startX; sx <= endX; sx += stopStep) {
                    const elev1 = calculateElevation(sx, y, primaryCfg, frame);
                    let elevation = elev1;
                    if (secondaryCfg && blend > 0) {
                        const elev2 = calculateElevation(sx, y, secondaryCfg, frame);
                        elevation = elev1 + (elev2 - elev1) * blend;
                    }
                    const sy = y - elevation;

                    let r = baseR;
                    let g = baseG;
                    let b = baseB;

                    for (let i = 0; i < activeLights.length; i++) {
                        const l = activeLights[i];
                        if (Math.abs(l.y - sy) > l.radius) continue;

                        const dx = sx - l.x;
                        const dy = sy - l.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < l.radius * l.radius) {
                            const dist = Math.sqrt(distSq);
                            const factor = Math.pow(1 - dist / l.radius, 1.5) * l.intensity;
                            r += l.r * factor;
                            g += l.g * factor;
                            b += l.b * factor;
                        }
                    }

                    const finalR = Math.min(255, (r | 0));
                    const finalG = Math.min(255, (g | 0));
                    const finalB = Math.min(255, (b | 0));

                    const offset = Math.max(0, Math.min(1, (sx - startX) / totalWidth));
                    grad.addColorStop(offset, `rgb(${finalR}, ${finalG}, ${finalB})`);
                }
                ctx.strokeStyle = grad;
            } else {
                ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.28)`;
            }
        }

        for (let x = startX; x <= endX; x += nodeSpacing) {
            const elev1 = calculateElevation(x, y, primaryCfg, frame);
            let elevation = elev1;

            if (secondaryCfg && blend > 0) {
                const elev2 = calculateElevation(x, y, secondaryCfg, frame);
                elevation = elev1 + (elev2 - elev1) * blend;
            }

            let drawX = x;
            let drawY = y - elevation;

            // --- SHOCKWAVE DISTORTION ---
            for (let i = 0; i < activeShockwaves.length; i++) {
                const sw = activeShockwaves[i];
                const distSq = (x - sw.pos.x) ** 2 + (y - sw.pos.y) ** 2;
                if (sw.minRadius && distSq < sw.minRadius * sw.minRadius) continue;
                if (distSq > (sw.maxRadius + 100) ** 2) continue;

                const dist = Math.sqrt(distSq);
                const progress = sw.time / sw.maxDuration;

                let currentRadius = sw.maxRadius * progress;
                let amplitudeFactor = (1 - progress);

                if (sw.contracting) {
                    currentRadius = sw.maxRadius * (1 - progress);
                    amplitudeFactor = 0.2 + (0.8 * progress);
                }

                const waveWidth = 80;
                const distToWave = dist - currentRadius;

                if (Math.abs(distToWave) < waveWidth) {
                    const t = distToWave / waveWidth;
                    const displacement = Math.cos(t * Math.PI / 2) * sw.strength * amplitudeFactor;
                    drawY -= displacement;
                }
            }

            // --- GHOST / PREDATOR DISTORTION ---
            for (let i = 0; i < activeDistortions.length; i++) {
                const d = activeDistortions[i];
                const dx = x - d.x;
                const dy = y - d.y;
                if (Math.abs(dx) > d.radius || Math.abs(dy) > d.radius) continue;

                const distSq = dx * dx + dy * dy;
                if (distSq < d.radius * d.radius) {
                    const dist = Math.sqrt(distSq);
                    const ratio = dist / d.radius;
                    const falloff = (1 - ratio) * (1 - ratio);

                    const noise = Math.sin(x * 0.05 + y * 0.08 + frame * 0.3) * Math.cos(x * 0.03 - frame * 0.2);

                    const bulge = 20 * d.strength * falloff;
                    drawX += (dx / (dist + 0.1)) * bulge;
                    drawY += (dy / (dist + 0.1)) * bulge;

                    const jitter = 8 * d.strength * falloff * noise;
                    drawX += jitter;
                    drawY += jitter;
                }
            }

            if (first) { ctx.moveTo(drawX, drawY); first = false; } else { ctx.lineTo(drawX, drawY); }
        }
        ctx.stroke();
    }
};
