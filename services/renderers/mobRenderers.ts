
import { Enemy, EnemyType } from '../../types';
import { COLORS } from '../../constants';
import { projectSimple, project3D, parseColorToRgb } from '../renderUtils';
import { neonStroke, neonPoly, neonOrb } from './neonRender';

// Build a neon trace from a list of [a,b] projected edge segments.
type Pt = { x: number, y: number };
const edgeTrace = (segs: [Pt, Pt][]) => (c: CanvasRenderingContext2D) => {
    for (const [a, b] of segs) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
};

export const drawLancer = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1);
    ctx.rotate(e.rotation || 0);
    const spin = frame * 0.2; const len = e.radius * 1.5; const wid = e.radius * 0.6;
    const vertices = [{ x: len, y: 0, z: 0 }, { x: -len * 0.5, y: -wid, z: -wid }, { x: -len * 0.5, y: wid, z: -wid }, { x: -len * 0.5, y: wid, z: wid }, { x: -len * 0.5, y: -wid, z: wid }, { x: -len, y: 0, z: 0 }];
    const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4]];

    const rotX = (v: any) => { return { x: v.x, y: v.y * Math.cos(spin) - v.z * Math.sin(spin), z: v.y * Math.sin(spin) + v.z * Math.cos(spin) } };
    const segs: [Pt, Pt][] = edges.map(([i, j]) => [projectSimple(rotX(vertices[i])), projectSimple(rotX(vertices[j]))]);
    neonStroke(ctx, edgeTrace(segs), e.color, { width: 2, intensity: 0.95 });
    const tail = projectSimple(rotX(vertices[5]));
    neonOrb(ctx, tail.x, tail.y, 2, '#fff', 1);
    ctx.restore();
};

export const drawDrone = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1);
    ctx.rotate((e.rotation || 0) + Math.PI / 2);

    const isElite = e.enemyType === EnemyType.ELITE_DRONE;
    const spin = frame * (isElite ? 0.1 : 0.05);
    const tilt = Math.sin(frame * 0.05) * 0.2;

    let vertices: { x: number, y: number, z: number }[] = [];
    let edges: number[][] = [];

    if (isElite) {
        const r = e.radius * 0.8; vertices = [{ x: 0, y: -r * 1.2, z: 0 }, { x: r, y: 0, z: 0 }, { x: 0, y: 0, z: r }, { x: -r, y: 0, z: 0 }, { x: 0, y: 0, z: -r }, { x: 0, y: r * 1.2, z: 0 }];
        edges = [[0, 1], [0, 2], [0, 3], [0, 4], [5, 1], [5, 2], [5, 3], [5, 4], [1, 2], [2, 3], [3, 4], [4, 1]];
    } else {
        const r = e.radius; vertices = [{ x: 0, y: -r, z: 0 }, { x: r * 0.7, y: r * 0.5, z: r * 0.7 }, { x: -r * 0.7, y: r * 0.5, z: r * 0.7 }, { x: 0, y: r * 0.5, z: -r * 0.7 }];
        edges = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
    }

    const segs: [Pt, Pt][] = edges.map(([i, j]) => [
        project3D(vertices[i].x, vertices[i].y, vertices[i].z, tilt, spin, 0),
        project3D(vertices[j].x, vertices[j].y, vertices[j].z, tilt, spin, 0),
    ]);
    neonStroke(ctx, edgeTrace(segs), e.color, { width: 2, intensity: isElite ? 1.1 : 0.9 });

    neonOrb(ctx, 0, 0, isElite ? 4 : 2, isElite ? '#fff' : '#ffaa00', isElite ? 1.2 : 1);
    ctx.restore();
};

export const drawSentinel = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    // 3D Octahedron "Watcher"
    const t = frame * 0.02;
    const r = e.radius * 1.2;
    const hover = Math.sin(t * 2) * 5;
    ctx.translate(0, hover);

    // If attacking, spin fast
    const spin = e.state === 'ATTACK' ? t * 5 : t;
    const tilt = e.state === 'ATTACK' ? 0 : Math.sin(t) * 0.2;

    const verts = [
        { x: 0, y: -r, z: 0 }, { x: 0, y: r, z: 0 }, // Top/Bottom
        { x: r, y: 0, z: 0 }, { x: -r, y: 0, z: 0 }, // Width
        { x: 0, y: 0, z: r }, { x: 0, y: 0, z: -r }  // Depth
    ];

    // Project
    const proj = verts.map(v => project3D(v.x, v.y, v.z, tilt, spin, 0, 300));

    const edges = [
        [0, 2], [0, 3], [0, 4], [0, 5], // Top pyramid
        [1, 2], [1, 3], [1, 4], [1, 5], // Bottom pyramid
        [2, 4], [4, 3], [3, 5], [5, 2]  // Equator
    ];

    const segs: [Pt, Pt][] = edges.map(([i, j]) => [proj[i], proj[j]]);
    neonStroke(ctx, edgeTrace(segs), e.color, { width: 1.5, intensity: 0.9 });

    // Red "Eye" Core — burns hot when attacking.
    const center = project3D(0, 0, 0, tilt, spin, 0, 300);
    neonOrb(ctx, center.x, center.y, r * 0.3, e.state === 'ATTACK' ? '#FF0000' : '#882222', e.state === 'ATTACK' ? 1.6 : 0.7);

    ctx.restore();
};

export const drawGhost = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const opacity = e.opacity ?? 1;

    if (opacity < 0.5) {
        // Stealth Mode Visuals: Rare sparkles to hint location
        if (Math.random() < 0.2) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            const r = e.radius * (0.8 + Math.random() * 0.4);
            ctx.beginPath();
            ctx.arc((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Pre-compute the wavy outline once so the layered neon passes line up.
    const ghostPts: Pt[] = [];
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = e.radius * (0.8 + Math.random() * 0.4);
        ghostPts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    ctx.globalAlpha = opacity;
    neonPoly(ctx, ghostPts, e.color, { width: 2, fillAlpha: 0.06, intensity: 0.9 });
    ctx.globalAlpha = 1;
};

export const drawTank = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(e.rotation || 0);
    const traceOctagon = (r: number, rot: number) => (c: CanvasRenderingContext2D) => { for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2 + rot; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath(); };

    // Dark armoured body backing, then neon hull.
    ctx.fillStyle = 'rgba(2, 2, 6, 0.85)'; ctx.beginPath(); traceOctagon(e.radius, Math.PI / 8)(ctx); ctx.fill();
    neonStroke(ctx, traceOctagon(e.radius, Math.PI / 8), COLORS.orange, { width: 2 });
    neonStroke(ctx, traceOctagon(e.radius * 0.8, Math.PI / 8), '#cc5200', { width: 1, glow: false, core: false });

    // Spokes.
    const spokeSegs: [Pt, Pt][] = [];
    for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2 + Math.PI / 8; spokeSegs.push([{ x: Math.cos(angle) * e.radius * 0.4, y: Math.sin(angle) * e.radius * 0.4 }, { x: Math.cos(angle) * e.radius, y: Math.sin(angle) * e.radius }]); }
    neonStroke(ctx, edgeTrace(spokeSegs), COLORS.orange, { width: 1, glow: false, core: false });

    // Turret.
    const turretR = e.radius * 0.45; const spin = frame * 0.01;
    ctx.fillStyle = 'rgba(10, 6, 0, 0.9)'; ctx.beginPath(); traceOctagon(turretR, spin)(ctx); ctx.fill();
    neonStroke(ctx, traceOctagon(turretR, spin), '#ffffff', { width: 1.5, glow: false });
    neonOrb(ctx, 0, 0, 5, '#ff3300', 1.2);
};

export const drawSwarmer = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    // 3D "Digital Swarm" Cloud
    ctx.save();

    const count = 5;
    const t = frame * 0.1;
    const idSeed = e.id.charCodeAt(0); // Randomize per entity

    // Base Rotation
    const rotX = t + idSeed;
    const rotY = t * 0.7;

    // Draw 5 chaotic orbiting shards
    for (let i = 0; i < count; i++) {
        const offset = (i / count) * Math.PI * 2;

        // Oscillation
        const r = e.radius * (0.8 + Math.sin(t * 2 + offset) * 0.4);

        const x = Math.cos(offset + t) * r;
        const y = Math.sin(offset + t * 1.5) * r;
        const z = Math.sin(offset * 2 + t) * r;

        // Triangle Shard
        const s = 4;
        const v1 = project3D(x, y - s, z, rotX, rotY, 0, 200);
        const v2 = project3D(x - s, y + s, z, rotX, rotY, 0, 200);
        const v3 = project3D(x + s, y + s, z, rotX, rotY, 0, 200);

        neonPoly(ctx, [v1, v2, v3], e.color, { width: 1, fillAlpha: 0.12, glow: false, core: false });
    }

    // Core dot
    neonOrb(ctx, 0, 0, 2, '#FFFFFF', 1);

    ctx.restore();
};

export const drawNeonCobra = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);

    const t = frame * 0.05;
    const scale = e.radius;

    // Parse color for segments
    const rgb = parseColorToRgb(e.color) || { r: 255, g: 0, b: 204 };

    // --- HEAD (3D Pyramid) ---
    // Pointing right (+X)
    const headSize = scale * 1.4;
    const headRotX = t;
    const headRotY = t * 0.5;

    // Pyramid vertices relative to (0,0,0)
    // We want it to point in X direction
    // Tip at (h, 0, 0), Base at (-h, +/-w, +/-w)
    const h = headSize;
    const w = headSize * 0.5;

    const headVerts = [
        { x: h, y: 0, z: 0 }, // Tip
        { x: -h * 0.5, y: w, z: w },
        { x: -h * 0.5, y: w, z: -w },
        { x: -h * 0.5, y: -w, z: -w },
        { x: -h * 0.5, y: -w, z: w }
    ];

    const pHead = headVerts.map(v => project3D(v.x, v.y, v.z, headRotX, headRotY, 0, 200));

    // Draw Head as a glowing neon pyramid.
    const headColor = e.color || '#FF00CC';
    const headEdges = [
        [0, 1], [0, 2], [0, 3], [0, 4], // Tip connections
        [1, 2], [2, 3], [3, 4], [4, 1]  // Base connections
    ];
    const headSegs: [Pt, Pt][] = headEdges.map(([i, j]) => [pHead[i], pHead[j]]);
    neonStroke(ctx, edgeTrace(headSegs), headColor, { width: 1.5, intensity: 1.0 });

    // --- TAIL SEGMENTS (3D Cubes) ---
    const segments = 6;
    const segSize = scale * 0.5; // Cube radius

    for (let i = 1; i <= segments; i++) {
        // Movement Logic (Wiggling behind)
        const lag = i * 4;
        const yOffset = Math.sin((frame - lag) * 0.2) * 6;
        const xOffset = -i * (scale * 0.8);

        // Individual Cube Rotation
        const segRotX = t + i * 0.5;
        const segRotY = t * 0.8 + i;

        // Generic Cube Vertices
        const s = segSize * (1 - (i / (segments + 2))); // Tapering size
        const cubeVerts = [
            { x: s, y: s, z: s }, { x: s, y: s, z: -s }, { x: s, y: -s, z: s }, { x: s, y: -s, z: -s },
            { x: -s, y: s, z: s }, { x: -s, y: s, z: -s }, { x: -s, y: -s, z: s }, { x: -s, y: -s, z: -s }
        ];

        // Project and Translate
        const pCube = cubeVerts.map(v => {
            const p = project3D(v.x, v.y, v.z, segRotX, segRotY, 0, 200);
            return { x: p.x + xOffset, y: p.y + yOffset };
        });

        const alpha = 0.8 - (i * 0.1);

        const cubeEdges = [
            [0, 1], [0, 2], [0, 4], // Corner 0
            [1, 3], [1, 5],
            [2, 3], [2, 6],
            [3, 7],
            [4, 5], [4, 6],
            [5, 7],
            [6, 7]
        ];

        const cubeSegs: [Pt, Pt][] = cubeEdges.map(([a, b]) => [pCube[a], pCube[b]]);
        neonStroke(ctx, edgeTrace(cubeSegs), e.color || '#FF00CC', { width: 1.2, intensity: alpha + 0.2, glow: false, core: false });
    }

    ctx.restore();
};

export const drawInfernoSpinner = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(frame * 0.3); const bladeCount = 3;
    neonOrb(ctx, 0, 0, e.radius * 0.4, '#ff4400', 1.3);
    for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2; ctx.save(); ctx.rotate(angle);
        neonPoly(ctx, [
            { x: 0, y: -e.radius * 0.4 },
            { x: e.radius * 0.5, y: -e.radius * 1.2 },
            { x: -e.radius * 0.5, y: -e.radius * 1.2 },
        ], '#ff8800', { width: 1.5, fillAlpha: 0.18, intensity: 1.0 });
        neonOrb(ctx, 0, -e.radius, e.radius * 0.3, '#ff6400', 0.9);
        ctx.restore();
    }
};

export const drawBinarySentinel = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    let separation = e.radius; let angle = frame * 0.05; let nodeRadius = e.radius * 0.6;
    if (e.binaryData) { angle = e.binaryData.angle; separation = e.binaryData.separation / 2; nodeRadius = e.binaryData.nodeRadius; }
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    for (let dir of [-1, 1]) {
        const x = dir * separation * cos; const y = dir * separation * sin; ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(10, 10, 14, 0.9)'; ctx.beginPath(); ctx.arc(0, 0, nodeRadius, 0, Math.PI * 2); ctx.fill();
        neonStroke(ctx, (c) => c.arc(0, 0, nodeRadius, 0, Math.PI * 2), '#ffffff', { width: 2, glow: false });
        neonOrb(ctx, 0, 0, 4, '#ff0000', 1.3);
        ctx.restore();
    }
    // Pre-compute the jittered beam so neon passes align.
    const startX = -separation * cos; const startY = -separation * sin; const endX = separation * cos; const endY = separation * sin;
    const steps = 10; const stepX = (endX - startX) / steps; const stepY = (endY - startY) / steps;
    const beamPts: Pt[] = [{ x: startX, y: startY }];
    for (let i = 1; i < steps; i++) { const jitter = (Math.random() - 0.5) * 10; beamPts.push({ x: startX + stepX * i + jitter, y: startY + stepY * i + jitter }); }
    beamPts.push({ x: endX, y: endY });
    neonStroke(ctx, (c) => { c.moveTo(beamPts[0].x, beamPts[0].y); for (let i = 1; i < beamPts.length; i++) c.lineTo(beamPts[i].x, beamPts[i].y); }, '#00ffff', { width: 4 + Math.sin(frame * 0.5) * 2, intensity: 1.2 });
};

export const drawLaserLotus = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(e.rotation || 0);
    // Hex core.
    const hexPts: Pt[] = [];
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const r = e.radius * 0.4; hexPts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
    neonPoly(ctx, hexPts, '#ff0055', { width: 2, fillAlpha: 0.25, intensity: 1.1 });

    const petals = 6;
    for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2; const pulse = Math.sin(frame * 0.1 + i) * 2; ctx.save(); ctx.rotate(angle);
        const inner = e.radius * 0.5 + pulse; const outer = e.radius * 1.2; const width = e.radius * 0.3;
        neonPoly(ctx, [
            { x: inner, y: 0 }, { x: (inner + outer) / 2, y: width }, { x: outer, y: 0 }, { x: (inner + outer) / 2, y: -width },
        ], '#ff0055', { width: 1.5, fillAlpha: 0.12, glow: false });
        neonStroke(ctx, (c) => { c.moveTo(e.radius * 0.4, 0); c.lineTo(inner, 0); }, 'rgba(255, 255, 255, 0.5)', { width: 1, glow: false, core: false });
        ctx.restore();
    }
};

export const drawOrbitalSniper = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    // 3D "Railgun" Drone
    const rot = e.rotation || 0;
    ctx.rotate(rot);

    // If Aiming, draw laser first
    if (e.state === 'AIMING') {
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(2000, 0);
        const opacity = 0.4 + Math.random() * 0.4;
        ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const t = frame * 0.05;
    const rX = Math.sin(t) * 0.2; // Slight wobble
    const scale = e.radius;

    // Geometry: Long triangular prism (Arrowhead)
    const verts = [
        { x: 2 * scale, y: 0, z: 0 }, // Front tip
        { x: -scale, y: 0.5 * scale, z: 0.5 * scale }, // Back Top Right
        { x: -scale, y: -0.5 * scale, z: 0.5 * scale }, // Back Bottom Right
        { x: -scale, y: -0.5 * scale, z: -0.5 * scale }, // Back Bottom Left
        { x: -scale, y: 0.5 * scale, z: -0.5 * scale } // Back Top Left
    ];

    const proj = verts.map(v => project3D(v.x, v.y, v.z, rX, 0, 0, 300));

    // Draw Hull as neon tube.
    const hullColor = e.state === 'AIMING' ? '#FF0000' : '#00FF00';
    const segs: [Pt, Pt][] = [
        [proj[0], proj[1]], [proj[0], proj[2]], [proj[0], proj[3]], [proj[0], proj[4]],
        [proj[1], proj[2]], [proj[2], proj[3]], [proj[3], proj[4]], [proj[4], proj[1]],
    ];
    neonStroke(ctx, edgeTrace(segs), hullColor, { width: 1.5, intensity: e.state === 'AIMING' ? 1.3 : 0.95 });

    // Engine Glow
    neonOrb(ctx, -scale * 1.2, 0, scale * 0.3, '#00FF00', 1.2);

    ctx.restore();
};

export const drawUtatu = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const scale = e.radius;
    // Slow Rotation around itself
    const rotX = frame * 0.02;
    const rotY = frame * 0.03;

    // Tetrahedron Vertices
    // (1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1)
    const verts = [
        { x: 1, y: 1, z: 1 },
        { x: 1, y: -1, z: -1 },
        { x: -1, y: 1, z: -1 },
        { x: -1, y: -1, z: 1 }
    ];

    const projected = verts.map(v => project3D(v.x * scale * 0.7, v.y * scale * 0.7, v.z * scale * 0.7, rotX, rotY, 0, 300));

    const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];

    // Draw faces
    const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];

    // Z-Sort faces
    const sortedFaces = faces.map(indices => {
        const v0 = projected[indices[0]];
        const v1 = projected[indices[1]];
        const v2 = projected[indices[2]];
        const depth = (v0.depth + v1.depth + v2.depth) / 3;
        return { indices, depth, v0, v1, v2 };
    }).sort((a, b) => a.depth - b.depth); // Draw furthest first

    sortedFaces.forEach(face => {
        neonPoly(ctx, [face.v0, face.v1, face.v2], '#9900FF', {
            width: 2,
            fillAlpha: 0.12,
            brightness: face.depth < 0 ? 0.9 : 0.4,
        });
    });

    // If attacking (linked), glow brighter
    if (e.state === 'ATTACK') {
        neonOrb(ctx, 0, 0, 4, '#FFFFFF', 1.4);
    }

    ctx.restore();
};

export const drawDataCorruptor = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();

    // Chaotic Rotation
    const rx = frame * 0.05;
    const ry = frame * 0.07;
    const rz = frame * 0.03;

    const scale = e.radius * 0.8;

    // Cube Vertices
    const verts = [
        { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: -1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: -1, z: -1 },
        { x: -1, y: 1, z: 1 }, { x: -1, y: 1, z: -1 }, { x: -1, y: -1, z: 1 }, { x: -1, y: -1, z: -1 }
    ];

    // Project
    const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, rx, ry, rz, 300));

    // Edges
    const edges = [
        [0, 1], [0, 2], [0, 4],
        [1, 3], [1, 5],
        [2, 3], [2, 6],
        [3, 7],
        [4, 5], [4, 6],
        [5, 7],
        [6, 7]
    ];

    const segs: [Pt, Pt][] = edges.map(([i, j]) => [projected[i], projected[j]]);
    neonStroke(ctx, edgeTrace(segs), '#00FF00', { width: 2, intensity: 1.0 });

    ctx.restore();
};

export const drawMandelbrotMite = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const gen = e.miteData?.generation || 0;
    const scale = e.radius;
    // Use ID to offset animation so they don't all pulse in sync
    const t = frame * 0.05 + ((e.id.charCodeAt(0) || 0) % 100);

    // Color based on generation + time
    // Gen 0: Cyan/Blue (Base), Gen 1: Purple/Pink, Gen 2: Red/Orange
    const baseHue = 180 + (gen * 60) + Math.sin(t * 0.5) * 20;
    const color = `hsla(${baseHue}, 100%, 60%, 0.9)`;

    // Manual Glow (Replaces expensive shadowBlur)
    // Only draw detailed glow for Gen 0 and 1. Gen 2 is too small.
    if (gen < 2) {
        const glowRadius = scale * 1.5;
        const grad = ctx.createRadialGradient(0, 0, scale * 0.2, 0, 0, glowRadius);
        grad.addColorStop(0, `hsla(${baseHue}, 100%, 80%, 0.6)`);
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Simple circle glow for small ones
        ctx.fillStyle = `hsla(${baseHue}, 100%, 80%, 0.3)`;
        ctx.beginPath();
        ctx.arc(0, 0, scale * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pulsating scale
    const pulse = 1 + Math.sin(t * 2) * 0.1;
    ctx.scale(pulse, pulse);

    // Use lighter composite for "energy" look
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.fillStyle = `hsla(${baseHue}, 100%, 80%, 0.4)`;

    // Recursive Geometry: Fractal Star
    // Level of Detail: Reduce depth for smaller generations
    // Gen 0 -> Depth 2
    // Gen 1 -> Depth 1
    // Gen 2 -> Depth 0 (Just the base shape)
    const maxDepth = Math.max(0, 2 - gen);

    const drawFractalLayer = (r: number, depth: number, rotation: number) => {
        ctx.save();
        ctx.rotate(rotation);

        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sub-layers
        if (depth > 0) {
            drawFractalLayer(r * 0.5, depth - 1, t * (depth % 2 === 0 ? 1 : -1));
        }
        ctx.restore();
    };

    // Draw 2 interlocking triangles (Star of David style) but recursive
    // Rotate counter to each other
    drawFractalLayer(scale, maxDepth, t);
    drawFractalLayer(scale, maxDepth, -t + Math.PI / 3); // Offset by 60deg

    ctx.restore();
};

export const drawPrismaticMonolith = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();

    const t = frame * 0.02;
    const scale = e.radius;

    // Vertical Bob
    const bob = Math.sin(t) * 5;
    ctx.translate(0, bob);

    // 3D Projection setup
    const h = scale * 1.8;
    const w = scale * 0.8;
    const rotY = t;
    const rotX = Math.sin(t * 0.5) * 0.2;
    const rotZ = Math.cos(t * 0.3) * 0.1;

    const project = (v: { x: number, y: number, z: number }) => project3D(v.x, v.y, v.z, rotX, rotY, rotZ, 400);

    // Outer Prism (Diamond/Crystal shape)
    // Top tip, Base mid points, Bottom tip
    const outerVerts = [
        { x: 0, y: -h, z: 0 }, // Top
        { x: w, y: 0, z: w * 0.6 }, { x: -w, y: 0, z: w * 0.6 }, { x: 0, y: 0, z: -w }, // Mid ring
        { x: 0, y: h, z: 0 } // Bottom
    ];

    const pOuter = outerVerts.map(project);

    // Inner Prism (Inverted/Smaller/Counter-rotating)
    // We calculate rotation manually for inner core
    const innerRotY = -t * 2;
    const innerH = h * 0.5;
    const innerW = w * 0.5;
    const innerVerts = [
        { x: 0, y: -innerH, z: 0 },
        { x: innerW, y: 0, z: innerW }, { x: -innerW, y: 0, z: innerW }, { x: 0, y: 0, z: -innerW },
        { x: 0, y: innerH, z: 0 }
    ];
    const pInner = innerVerts.map(v => project3D(v.x, v.y, v.z, rotX, innerRotY, rotZ, 400));

    // Colors
    // Cycle spectrum for edges
    const hue = (frame * 2) % 360;
    const edgeColor = `hsl(${hue}, 100%, 70%)`;
    const faceColor = `hsla(${hue}, 80%, 90%, 0.1)`; // Glassy

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;

    // Draw Function
    const drawCrystal = (pts: any[], isInner: boolean) => {
        const top = pts[0];
        const mid = [pts[1], pts[2], pts[3]];
        const bot = pts[4];

        const crystalColor = isInner ? '#FFFFFF' : edgeColor;

        const faces = [
            [top, mid[0], mid[1]], [top, mid[1], mid[2]], [top, mid[2], mid[0]], // Top
            [bot, mid[0], mid[1]], [bot, mid[1], mid[2]], [bot, mid[2], mid[0]]  // Bottom
        ];

        faces.forEach(face => {
            neonPoly(ctx, [face[0], face[1], face[2]], crystalColor, {
                width: isInner ? 1.5 : 2,
                fillAlpha: isInner ? 0.3 : 0.12,
                intensity: isInner ? 1.3 : 1.0,
            });
        });
    };

    // Draw Inner Core First
    drawCrystal(pInner, true);

    // Draw Outer Shell
    drawCrystal(pOuter, false);

    // Add "Spectral Lines" orbiting
    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yOff = (i - 1) * 20;
        ctx.ellipse(0, yOff, w * 1.5, w * 0.5, t + i, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
};

// --- BRAINSTORM ROSTER (v0.28) ---

export const drawSankofaTotem = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const r = e.radius;
    const t = frame * 0.025;
    const breathe = 0.85 + Math.sin(frame * 0.045) * 0.15;

    // Broken ancestral-energy aura: segmented arcs with gaps, crackling outward
    for (let i = 0; i < 3; i++) {
        const phase = (t * 0.55 + i / 3) % 1;
        const rr = r * 1.1 + phase * 85;
        const alpha = (1 - phase) * 0.45;
        neonStroke(ctx, (c) => {
            for (let s = 0; s < 8; s++) {
                const a0 = (s / 8) * Math.PI * 2;
                const a1 = ((s + 0.6) / 8) * Math.PI * 2;
                c.moveTo(rr * Math.cos(a0), rr * Math.sin(a0));
                c.arc(0, 0, rr, a0, a1);
            }
        }, e.color, { width: 1, intensity: alpha, glow: false, core: false });
    }

    // Slow, ponderous sway
    ctx.rotate(Math.sin(frame * 0.014) * 0.07);

    // Stake / plinth base — driven into the ground
    neonStroke(ctx, (c) => {
        c.moveTo(-r * 0.14, r * 1.1);
        c.lineTo(0, r * 1.52);
        c.lineTo(r * 0.14, r * 1.1);
    }, e.color, { width: 2, intensity: 0.55, glow: false });

    // Crown horns — branching prongs referencing the Sankofa bird silhouette
    neonStroke(ctx, (c) => {
        c.moveTo(-r * 0.22, -r * 1.05);
        c.lineTo(-r * 0.52, -r * 1.65);
        c.lineTo(-r * 0.18, -r * 1.2);
    }, e.color, { width: 1.5, intensity: 1.0 });
    neonStroke(ctx, (c) => {
        c.moveTo( r * 0.22, -r * 1.05);
        c.lineTo( r * 0.52, -r * 1.65);
        c.lineTo( r * 0.18, -r * 1.2);
    }, e.color, { width: 1.5, intensity: 1.0 });
    neonOrb(ctx, 0, -r * 1.35, 2.5, e.color, 1.1);

    // Main mask body: 14-point polygon with cheek notches for depth
    const maskPts: Pt[] = [
        { x:  0,         y: -r * 1.35 },
        { x:  r * 0.28,  y: -r * 1.05 },
        { x:  r * 0.62,  y: -r * 0.58 },
        { x:  r * 0.72,  y: -r * 0.1  },
        { x:  r * 0.55,  y:  r * 0.28 },
        { x:  r * 0.68,  y:  r * 0.62 },
        { x:  r * 0.42,  y:  r * 1.05 },
        { x:  0,         y:  r * 1.12 },
        { x: -r * 0.42,  y:  r * 1.05 },
        { x: -r * 0.68,  y:  r * 0.62 },
        { x: -r * 0.55,  y:  r * 0.28 },
        { x: -r * 0.72,  y: -r * 0.1  },
        { x: -r * 0.62,  y: -r * 0.58 },
        { x: -r * 0.28,  y: -r * 1.05 },
    ];
    neonPoly(ctx, maskPts, e.color, { width: 2.5, fillAlpha: 0.07, backingAlpha: 0.82 });

    // Brow ridge — heavy angular furrow conveying menace
    neonStroke(ctx, (c) => {
        c.moveTo(-r * 0.62, -r * 0.28);
        c.lineTo(-r * 0.32, -r * 0.48);
        c.lineTo(-r * 0.06, -r * 0.42);
    }, e.color, { width: 2, intensity: 0.9 });
    neonStroke(ctx, (c) => {
        c.moveTo( r * 0.62, -r * 0.28);
        c.lineTo( r * 0.32, -r * 0.48);
        c.lineTo( r * 0.06, -r * 0.42);
    }, e.color, { width: 2, intensity: 0.9 });

    // Eye sockets — dark hollow pits
    const eyeY = -r * 0.12;
    const exL = -r * 0.33, exR = r * 0.33;
    const eW = r * 0.2, eH = r * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2, 2, 6, 0.94)';
    ctx.beginPath(); ctx.ellipse(exL, eyeY, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(exR, eyeY, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    neonStroke(ctx, (c) => { c.ellipse(exL, eyeY, eW, eH, 0, 0, Math.PI * 2); }, e.color, { width: 1.5, intensity: 1.0 });
    neonStroke(ctx, (c) => { c.ellipse(exR, eyeY, eW, eH, 0, 0, Math.PI * 2); }, e.color, { width: 1.5, intensity: 1.0 });
    // Burning ember pupils — deep orange-red, pulsing
    neonOrb(ctx, exL, eyeY, eW * 0.42 * breathe, '#FF3300', 1.6);
    neonOrb(ctx, exR, eyeY, eW * 0.42 * breathe, '#FF3300', 1.6);

    // Nasal bridge — angular V-notch
    neonStroke(ctx, (c) => {
        c.moveTo(-r * 0.1, -r * 0.08);
        c.lineTo(0, r * 0.1);
        c.lineTo(r * 0.1, -r * 0.08);
    }, e.color, { width: 1.2, intensity: 0.45, glow: false, core: false });

    // Mouth — gaping void with 5 tooth dividers
    const mY = r * 0.5, mW = r * 0.44, mH = r * 0.165;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2, 2, 6, 0.94)';
    ctx.beginPath(); ctx.ellipse(0, mY, mW, mH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    neonStroke(ctx, (c) => { c.ellipse(0, mY, mW, mH, 0, 0, Math.PI * 2); }, e.color, { width: 1.5, intensity: 0.88 });
    for (let ti = 0; ti < 5; ti++) {
        const tx = -mW * 0.72 + (ti / 4) * mW * 1.44;
        neonStroke(ctx, (c) => { c.moveTo(tx, mY - mH * 0.88); c.lineTo(tx, mY + mH * 0.88); }, '#ffffff', { width: 0.8, intensity: 0.42, glow: false, core: false });
    }

    // Cheek scarification — 3 parallel diagonal cuts per side
    for (let si = 0; si < 3; si++) {
        const sy = -r * 0.06 + si * r * 0.2;
        neonStroke(ctx, (c) => { c.moveTo(-r * 0.66, sy - r * 0.04); c.lineTo(-r * 0.4, sy + r * 0.04); }, e.color, { width: 1, intensity: 0.36, glow: false, core: false });
        neonStroke(ctx, (c) => { c.moveTo( r * 0.66, sy - r * 0.04); c.lineTo( r * 0.4, sy + r * 0.04); }, e.color, { width: 1, intensity: 0.36, glow: false, core: false });
    }

    ctx.restore();
};

export const drawKintsugiWraith = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);
    const r = e.radius;
    // Black porcelain shard body.
    const pts: Pt[] = [{ x: 0, y: -r }, { x: r * 0.8, y: 0 }, { x: 0, y: r }, { x: -r * 0.8, y: 0 }];
    neonPoly(ctx, pts, '#1a1208', { width: 1.5, fillAlpha: 0.05, backingAlpha: 0.85 });
    // Glowing gold cracks (kintsugi).
    const crackSegs: [Pt, Pt][] = [
        [{ x: 0, y: -r }, { x: 0, y: r }],
        [{ x: -r * 0.8, y: 0 }, { x: r * 0.8, y: 0 }],
        [{ x: -r * 0.4, y: -r * 0.5 }, { x: r * 0.4, y: r * 0.5 }]
    ];
    neonStroke(ctx, edgeTrace(crackSegs), e.color, { width: 1.5, intensity: 1.1 });
    ctx.restore();
};

export const drawCalabashVoid = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const r = e.radius;
    // Dark collapsing core.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2, 2, 6, 0.95)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(e.rotation || 0);
    // Accretion ring.
    neonStroke(ctx, (c) => c.ellipse(0, 0, r * 1.4, r * 0.5, 0, 0, Math.PI * 2), e.color, { width: 2, intensity: 1 });
    // Inward-swirling matter.
    const t = frame * 0.06;
    for (let i = 0; i < 10; i++) {
        const a = t + i * (Math.PI * 2 / 10);
        const rad = r * 1.5 * (i / 10);
        neonOrb(ctx, Math.cos(a) * rad, Math.sin(a) * rad * 0.4, 1.5, e.color, 0.8);
    }
    neonOrb(ctx, 0, 0, 2, e.color, 0.5);
    ctx.restore();
};

export const drawAnansiBroodPod = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);
    const r = e.radius;
    const open = e.customData?.open;
    const hex = (rad: number) => (c: CanvasRenderingContext2D) => {
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath();
    };
    ctx.fillStyle = 'rgba(2, 2, 6, 0.8)'; ctx.beginPath(); hex(r)(ctx); ctx.fill();
    neonStroke(ctx, hex(r), e.color, { width: 2 });
    neonStroke(ctx, hex(r * 0.6), e.color, { width: 1, glow: false, core: false });
    // Brood thread + core flares brighter while open.
    const coreR = open ? r * 0.45 * (0.6 + Math.sin(frame * 0.25) * 0.4) : r * 0.18;
    neonOrb(ctx, 0, 0, coreR, open ? '#FFCC66' : '#FF8800', open ? 1.4 : 0.7);
    ctx.restore();
};

export const drawSankofaSiphon = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);
    const r = e.radius;
    // Backward-looking bird glyph.
    neonStroke(ctx, (c) => { c.moveTo(-r, r * 0.6); c.quadraticCurveTo(r * 1.2, 0, -r * 0.2, -r); }, e.color, { width: 2, intensity: 1 });
    neonStroke(ctx, (c) => { c.moveTo(-r, r * 0.6); c.lineTo(r * 0.5, r * 0.2); }, e.color, { width: 1.5, glow: false });
    // Feeding tendrils.
    if (e.state === 'ATTACK') {
        for (let i = 0; i < 3; i++) {
            const a = Math.PI + (i - 1) * 0.3 + Math.sin(frame * 0.2 + i) * 0.2;
            neonStroke(ctx, (c) => { c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); }, e.color, { width: 1, glow: false, core: false });
        }
    }
    neonOrb(ctx, 0, 0, 3, '#ffffff', 1);
    ctx.restore();
};

export const drawObsidianHeart = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);
    const r = e.radius;
    const vuln = e.customData?.vulnerable;
    const oct = (rad: number) => (c: CanvasRenderingContext2D) => {
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath();
    };
    // Glassy obsidian shell — hardens (cold) vs flares (hot) on the beat.
    ctx.fillStyle = 'rgba(2, 2, 6, 0.92)'; ctx.beginPath(); oct(r)(ctx); ctx.fill();
    neonStroke(ctx, oct(r), vuln ? '#FFAA33' : '#552200', { width: 2, intensity: vuln ? 1.3 : 0.7 });
    const beat = 0.5 + Math.sin(frame * 0.2) * 0.5;
    const coreR = vuln ? r * 0.5 * (0.7 + beat * 0.5) : r * 0.12;
    neonOrb(ctx, 0, 0, coreR, vuln ? '#FF7722' : '#aa3300', vuln ? 1.6 : 0.6);
    ctx.restore();
};

export const drawMirrorDjinn = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);
    const r = e.radius;
    // Chrome doppelganger silhouette.
    const body: Pt[] = [{ x: 0, y: -r * 1.1 }, { x: r * 0.7, y: 0 }, { x: 0, y: r * 1.1 }, { x: -r * 0.7, y: 0 }];
    neonPoly(ctx, body, e.color, { width: 2, fillAlpha: 0.1, backingAlpha: 0.6 });
    neonStroke(ctx, (c) => { c.moveTo(0, -r * 1.1); c.lineTo(0, r * 1.1); }, '#ffffff', { width: 1.5, intensity: 1.2 });
    neonOrb(ctx, -r * 0.25, -r * 0.2, 2, '#ffffff', 1);
    ctx.restore();
};

export const drawDatamoshCorruptor = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const r = e.radius;
    // Smeared, glitching corruption block.
    for (let i = 0; i < 5; i++) {
        const ox = (Math.random() - 0.5) * r * 1.5;
        const oy = (i - 2) * r * 0.4;
        const w = r * (0.8 + Math.random() * 0.8);
        const col = i % 2 === 0 ? '#F0F0F0' : '#FF6600';
        neonStroke(ctx, (c) => c.rect(ox - w / 2, oy - r * 0.18, w, r * 0.36), col, { width: 1.5, glow: false, core: false });
    }
    neonOrb(ctx, 0, 0, 3, '#FF6600', 1);
    ctx.restore();
};

export const drawDefault = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1);
    neonStroke(ctx, (c) => c.arc(0, 0, e.radius, 0, Math.PI * 2), e.color || '#fff', { width: 2 });
};
