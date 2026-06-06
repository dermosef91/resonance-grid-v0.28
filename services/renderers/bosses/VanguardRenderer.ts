
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';
import { neonStroke, neonPoly } from '../neonRender';

// Static geometry: the vertex positions and which vertex pairs form edges never
// change (they don't depend on rotation/phase), so compute them once at module
// load instead of rebuilding the arrays and rescanning all O(n^2) vertex pairs
// every frame for every Vanguard on screen.
type V3 = { x: number; y: number; z: number };

const PHI = 1.618;
const INV_PHI = 1 / PHI;

// 20 vertices of a dodecahedron.
const VANGUARD_VERTS: V3[] = [
    {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:1, y:-1, z:1}, {x:1, y:-1, z:-1},
    {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1},
    {x:0, y:PHI, z:INV_PHI}, {x:0, y:PHI, z:-INV_PHI}, {x:0, y:-PHI, z:INV_PHI}, {x:0, y:-PHI, z:-INV_PHI},
    {x:INV_PHI, y:0, z:PHI}, {x:INV_PHI, y:0, z:-PHI}, {x:-INV_PHI, y:0, z:PHI}, {x:-INV_PHI, y:0, z:-PHI},
    {x:PHI, y:INV_PHI, z:0}, {x:PHI, y:-INV_PHI, z:0}, {x:-PHI, y:INV_PHI, z:0}, {x:-PHI, y:-INV_PHI, z:0}
];

const buildEdges = (verts: V3[], thresholdSq: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
            const dx = verts[i].x - verts[j].x;
            const dy = verts[i].y - verts[j].y;
            const dz = verts[i].z - verts[j].z;
            if (dx*dx + dy*dy + dz*dz < thresholdSq) out.push([i, j]);
        }
    }
    return out;
};

const VANGUARD_EDGES = buildEdges(VANGUARD_VERTS, 1.6);

// Inner core icosahedron.
const VANGUARD_CORE_VERTS: V3[] = [
    {x:0, y:1, z:PHI}, {x:0, y:1, z:-PHI}, {x:0, y:-1, z:PHI}, {x:0, y:-1, z:-PHI},
    {x:1, y:PHI, z:0}, {x:1, y:-PHI, z:0}, {x:-1, y:PHI, z:0}, {x:-1, y:-PHI, z:0},
    {x:PHI, y:0, z:1}, {x:PHI, y:0, z:-1}, {x:-PHI, y:0, z:1}, {x:-PHI, y:0, z:-1}
];

const VANGUARD_CORE_EDGES = buildEdges(VANGUARD_CORE_VERTS, 4.1 + 1e-6);

export const drawVanguard = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    // Rotation
    const t = frame * 0.015;
    const rotX = t * 0.7;
    const rotY = t * 1.0;
    const rotZ = t * 0.4;

    const scale = e.radius; 

    // Pulse effect
    const pulse = 1 + Math.sin(frame * 0.1) * 0.05;
    const finalScale = scale * 0.7 * pulse; 

    // Phase check
    const phase = e.vanguardData?.phase || 0;

    // Project points (vertices shattered out by phase become null)
    const projected = VANGUARD_VERTS.map((v, i) => {
        if (phase >= 1 && i % 4 === 0) return null; // Phase 1: Lose ~25%
        if (phase >= 2 && i % 2 === 0) return null; // Phase 2: Lose ~50%
        if (phase >= 3 && i % 4 !== 3) return null; // Phase 3: Lose ~75%
        return project3D(v.x * finalScale, v.y * finalScale, v.z * finalScale, rotX, rotY, rotZ, 400);
    });

    // Build draw edges from the precomputed connectivity (skip shattered verts).
    const edges: {p1: any, p2: any, depth: number}[] = [];
    for (let k = 0; k < VANGUARD_EDGES.length; k++) {
        const p1 = projected[VANGUARD_EDGES[k][0]];
        const p2 = projected[VANGUARD_EDGES[k][1]];
        if (!p1 || !p2) continue;
        edges.push({ p1, p2, depth: (p1.depth + p2.depth) / 2 });
    }

    edges.sort((a, b) => a.depth - b.depth);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Draw Edges (Shell)
    edges.forEach(edge => {
        if (edge.depth < 0) {
            ctx.globalAlpha = 1.0;
            neonStroke(ctx, (c) => {
                c.moveTo(edge.p1.x, edge.p1.y);
                c.lineTo(edge.p2.x, edge.p2.y);
            }, '#FF4500', { width: 3 });
        } else {
            ctx.globalAlpha = 0.4;
            neonStroke(ctx, (c) => {
                c.moveTo(edge.p1.x, edge.p1.y);
                c.lineTo(edge.p2.x, edge.p2.y);
            }, '#8B0000', { width: 1.5, glow: false, core: false });
        }
    });

    ctx.globalAlpha = 1.0;

    // Draw Vertices (Shell Nodes)
    projected.forEach(p => {
        if (!p) return;
        const isFront = p.depth < 0;
        const size = (isFront ? 5 : 3) * p.scale;

        ctx.globalAlpha = isFront ? 1.0 : 0.5;
        neonPoly(ctx, [
            { x: p.x, y: p.y - size },
            { x: p.x + size, y: p.y },
            { x: p.x, y: p.y + size },
            { x: p.x - size, y: p.y },
        ], '#FFFFFF', { brightness: isFront ? 1 : 0.4, width: 1, glow: isFront, core: isFront });
    });
    ctx.globalAlpha = 1.0;

    // --- CORE RENDERING (Glitchy Inner Core) ---
    // Make core glitch more intense with phase
    const coreGlitch = phase * 0.2; // 0, 0.2, 0.4, 0.6
    
    const innerScale = scale * 0.3;

    const coreRotSpeed = 1.0 + (phase * 0.5); // Spin faster when exposed
    const projCore = VANGUARD_CORE_VERTS.map(v => {
        // Apply glitch offset
        let gx = v.x, gy = v.y, gz = v.z;
        if (Math.random() < coreGlitch) {
            gx += (Math.random()-0.5)*0.5;
            gy += (Math.random()-0.5)*0.5;
            gz += (Math.random()-0.5)*0.5;
        }
        return project3D(gx * innerScale, gy * innerScale, gz * innerScale, -rotX*2 * coreRotSpeed, -rotY*2 * coreRotSpeed, 0, 400);
    });
    
    // Core pulsating color
    const redIntensity = 150 + (phase * 35);
    const coreColor = `rgb(255, ${255 - redIntensity}, 0)`;

    const coreSegs: (readonly [{x:number,y:number}, {x:number,y:number}])[] = [];
    for (let k = 0; k < VANGUARD_CORE_EDGES.length; k++) {
        coreSegs.push([projCore[VANGUARD_CORE_EDGES[k][0]], projCore[VANGUARD_CORE_EDGES[k][1]]]);
    }

    neonStroke(ctx, (c) => {
        coreSegs.forEach(([p1, p2]) => { c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); });
    }, coreColor, { width: 1 + (phase * 0.5), glow: phase === 3, core: phase === 3 });
};
