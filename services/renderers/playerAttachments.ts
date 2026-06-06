// services/renderers/playerAttachments.ts
//
// Data-driven registry of per-weapon AVATAR attachments. As the player picks
// weapons, levels them (1->8) and chooses augments (level-5 modifications), the
// avatar accretes orbiting parts AND structural body growth, so each run ends
// with a visually distinct silhouette.
//
// Pattern mirrors services/renderers/index.ts (EnemyRenderRegistry): add a draw
// function, register it by weapon id. Missing ids simply contribute nothing.
//
// Each renderer is invoked TWICE per frame by drawPlayer: once for the BACK
// depth pass (behind the body, drawBack=true) and once for the FRONT pass
// (drawBack=false). They share the body's exact transform via `project`.

import { Player, Weapon } from '../../types';
import { COLORS } from '../../constants';
import { WEAPON_AUGMENTS } from '../data/weapons';
import { lerpColor } from '../renderUtils';

export interface AttachmentCtx {
    ctx: CanvasRenderingContext2D;
    player: Player;
    frame: number;
    t: number;                 // frame * 0.05 (precomputed in drawPlayer)
    project: (x: number, y: number, z: number) => { x: number; y: number; depth: number; scale: number };
    drawBack: boolean;         // true = behind-body pass, false = front pass
    quality: 'HIGH' | 'LOW';
    slotIndex: number;         // weapon index in player.weapons (0..2)
    slotPhase: number;         // SLOT_PHASE[slotIndex] orbit offset (radians)
    areaMult: number;          // player.stats.areaMult, hoisted
}

export type AttachmentRenderer = (a: AttachmentCtx, w: Weapon) => void;

// Up to 3 simultaneous weapons spread 120 degrees apart so orbiting parts
// don't visually collide. Radial shells separate by radius band (slotIndex*N).
export const SLOT_PHASE = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Local rotation about the origin (Z then Y then X), matching the legacy
// void-orb math. Returns the rotated point in local space (pre-projection).
const rot3 = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
    // Z
    let nx = x * Math.cos(rz) - y * Math.sin(rz);
    let ny = x * Math.sin(rz) + y * Math.cos(rz);
    let nz = z;
    // Y
    let mx = nx * Math.cos(ry) - nz * Math.sin(ry);
    let mz = nx * Math.sin(ry) + nz * Math.cos(ry);
    // X
    let py = ny * Math.cos(rx) - mz * Math.sin(rx);
    let pz = ny * Math.sin(rx) + mz * Math.cos(rx);
    return { x: mx, y: py, z: pz };
};

// Continuous level growth (NOT gated at 8): count grows step-wise, size ramps.
const lvlCount = (level: number, base: number, every: number, cap: number) =>
    Math.min(cap, base + Math.floor(level / every));
const lvlSize = (level: number) => 0.6 + level * 0.05; // L1 ~0.65 -> L8 1.0

// Resolve a weapon's chosen-augment color (data-driven), else fallback.
const augColor = (w: Weapon, fallback: string): string => {
    if (!w.augment) return fallback;
    const pair = WEAPON_AUGMENTS[w.id];
    const def = pair?.find(a => a.id === w.augment);
    return def?.color ?? fallback;
};

// Radial band so multiple shell-type weapons nest instead of overlapping.
const slotRadius = (a: AttachmentCtx, base: number) => base + a.slotIndex * 14;

// Draw a flat diamond/crystal at a projected point.
const drawDiamond = (
    ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
    stroke: string, fill: string, elongate = 1
) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * elongate);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, size * elongate);
    ctx.lineTo(-size / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};

// Draw a small spinning wireframe tetrahedron centered at local (cx,cy,cz).
const drawTetra = (
    a: AttachmentCtx, cx: number, cy: number, cz: number, scale: number,
    rx: number, ry: number, stroke: string, fill: string
) => {
    const { ctx, project } = a;
    const raw = [
        { x: 0, y: -scale * 1.5, z: 0 },
        { x: scale, y: scale * 0.5, z: scale * 0.8 },
        { x: -scale, y: scale * 0.5, z: scale * 0.8 },
        { x: 0, y: scale * 0.5, z: -scale }
    ];
    const p = raw.map(v => {
        const r = rot3(v.x, v.y, v.z, rx, ry, 0);
        return project(r.x + cx, r.y + cy, r.z + cz);
    });
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p[1].x, p[1].y); ctx.lineTo(p[2].x, p[2].y); ctx.lineTo(p[3].x, p[3].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[2].x, p[2].y);
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[3].x, p[3].y);
    ctx.stroke(); ctx.fill();
};

// Draw a flat regular polygon (ring of `sides`) facing the camera at projected
// center, radius in px (already roughly scaled by depth via `scale`).
const drawPolyFlat = (
    a: AttachmentCtx, cx: number, cy: number, cz: number, radius: number,
    sides: number, spin: number, stroke: string, fill: string
) => {
    const { ctx, project } = a;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        const ang = (i / sides) * Math.PI * 2 + spin;
        const p = project(cx + Math.cos(ang) * radius, cy, cz + Math.sin(ang) * radius);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

// Stroke a rotated 3D ring, splitting segments into the requested depth pass.
const drawRing = (
    a: AttachmentCtx, radius: number, rx: number, ry: number, rz: number,
    stroke: string, glow: string, width: number
) => {
    const { ctx, project, drawBack, quality } = a;
    const segs = quality === 'LOW' ? 14 : 30;
    ctx.beginPath();
    let first = true; let has = false;
    for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2;
        const r = rot3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0, rx, ry, rz);
        const proj = project(r.x, r.y, r.z);
        const isBack = proj.depth > 0;
        if (isBack === drawBack) {
            if (first) { ctx.moveTo(proj.x, proj.y); first = false; } else { ctx.lineTo(proj.x, proj.y); }
            has = true;
        } else { first = true; }
    }
    if (has) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        if (quality === 'HIGH' && !drawBack) { ctx.shadowBlur = 10; ctx.shadowColor = glow; }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
};

// ---------------------------------------------------------------------------
// Per-weapon attachment renderers (level 1->8 growth + augment variants)
// ---------------------------------------------------------------------------

// SPIRIT LANCE -> orbiting energy crystals. VOLTAIC_ARC: cyan + arcs.
// PHASE_DRILL: violet elongated shards.
const drawSpiritLance: AttachmentRenderer = (a, w) => {
    // Spirit Lance is the starting weapon — hold off the orbiting crystal until level 2
    // so the player doesn't begin the run with it already attached.
    if (w.level < 2) return;
    const { ctx, t, project, drawBack, slotPhase } = a;
    const phase = w.augment === 'PHASE_DRILL';
    const stroke = phase ? '#aa00ff' : (w.augment === 'VOLTAIC_ARC' ? '#00ccff' : '#00FFFF');
    const fill = phase ? '#d9a8ff' : '#E0FFFF';
    const count = lvlCount(w.level, 1, 2, 5);
    const orbitR = slotRadius(a, 30);
    const size = 6 * lvlSize(w.level);
    const elong = phase ? 1.8 : 1;
    const pts: { x: number; y: number; depth: number }[] = [];
    for (let i = 0; i < count; i++) {
        const ang = t * 2 + slotPhase + (Math.PI * 2 / count) * i;
        const proj = project(Math.cos(ang) * orbitR, -10 + Math.sin(t * 4 + i) * 5, Math.sin(ang) * orbitR);
        pts.push(proj);
        if ((proj.depth > 0) === drawBack) drawDiamond(ctx, proj.x, proj.y, size, stroke, fill, elong);
    }
    // Voltaic arcs between consecutive crystals (front pass only).
    if (w.augment === 'VOLTAIC_ARC' && !drawBack && pts.length > 1) {
        ctx.strokeStyle = '#aef6ff'; ctx.lineWidth = 1;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i]; const q = pts[(i + 1) % pts.length];
            if (p.depth > 0 || q.depth > 0) continue;
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo((p.x + q.x) / 2 + (Math.random() - 0.5) * 12, (p.y + q.y) / 2 + (Math.random() - 0.5) * 12);
            ctx.lineTo(q.x, q.y); ctx.stroke();
        }
    }
};

// CYBER KORA -> rotating sonic ring + lightning arcs across body.
// DISSONANCE_SHREDDER: red glitch jitter. ACOUSTIC_BARRIER: solid cyan band.
const drawCyberKora: AttachmentRenderer = (a, w) => {
    const { ctx, t, project, drawBack, quality, areaMult } = a;
    const diss = w.augment === 'DISSONANCE_SHREDDER';
    const color = diss ? '#FF0033' : '#00FFFF';
    const radius = slotRadius(a, 42) * (0.7 + w.level * 0.04) * areaMult;
    // Ring (single pass on front to stay cheap, split by depth).
    const segs = quality === 'LOW' ? 12 : 16 + w.level;
    ctx.beginPath();
    let first = true; let has = false;
    for (let i = 0; i <= segs; i++) {
        const ang = (i / segs) * Math.PI * 2 + t * 5;
        const jitter = diss ? (Math.random() - 0.5) * 14 : 0;
        const proj = project(Math.cos(ang) * radius, 0, Math.sin(ang) * radius);
        if ((proj.depth > 0) === drawBack) {
            const x = proj.x + jitter, y = proj.y + jitter;
            if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
            has = true;
        } else first = true;
    }
    if (has) {
        ctx.strokeStyle = w.augment === 'ACOUSTIC_BARRIER' ? 'rgba(0,255,255,0.85)' : `rgba(${diss ? '255,0,51' : '0,255,255'},0.5)`;
        ctx.lineWidth = w.augment === 'ACOUSTIC_BARRIER' ? 3 : 2;
        if (quality === 'HIGH' && !drawBack) { ctx.shadowBlur = 8; ctx.shadowColor = color; }
        ctx.stroke(); ctx.shadowBlur = 0;
    }
    // Lightning arcs only on the front pass.
    if (!drawBack) {
        const arcs = 1 + Math.floor(w.level / 3);
        if (quality === 'HIGH') { ctx.shadowBlur = 8; ctx.shadowColor = color; }
        for (let i = 0; i < arcs; i++) {
            const a1 = Math.random() * Math.PI * 2, a2 = Math.random() * Math.PI * 2;
            const r = radius * 0.55;
            const pA = project(Math.cos(a1) * r, (Math.random() - 0.5) * 20, Math.sin(a1) * r);
            const pB = project(Math.cos(a2) * r, (Math.random() - 0.5) * 20, Math.sin(a2) * r);
            ctx.strokeStyle = i === 0 ? '#FFFFFF' : color; ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(pA.x, pA.y);
            ctx.lineTo((pA.x + pB.x) / 2 + (Math.random() - 0.5) * 15, (pA.y + pB.y) / 2 + (Math.random() - 0.5) * 15);
            ctx.lineTo(pB.x, pB.y); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
};

// VOID AURA -> rotating 3D rings. SUPERNOVA: magenta + extra pulsing ring.
// ENTROPY_FIELD: blue.
const drawVoidAura: AttachmentRenderer = (a, w) => {
    const { frame, areaMult } = a;
    const sup = w.augment === 'SUPERNOVA';
    let baseR = (34 + w.level * 7) * areaMult;
    if (sup) baseR *= 1.4 + Math.sin(frame * 0.08) * 0.1;
    const rings = lvlCount(w.level, 1, 3, 3) + (sup ? 1 : 0);
    const time = frame * 0.02;
    const col = sup ? 'rgba(255,0,255,' : (w.augment === 'ENTROPY_FIELD' ? 'rgba(60,80,255,' : 'rgba(153,0,255,');
    const glow = sup ? '#FF00FF' : (w.augment === 'ENTROPY_FIELD' ? '#3050FF' : '#9900FF');
    for (let ri = 0; ri < rings; ri++) {
        const off = (ri / rings) * Math.PI;
        const rx = time * (ri % 2 === 0 ? 1 : -1) + off;
        const ry = time * (ri % 2 === 0 ? 0.5 : -0.5);
        const rz = time * 0.2;
        drawRing(a, baseR, rx, ry, rz, col + (a.drawBack ? '0.4)' : '0.8)'), glow, 2);
    }
};

// NANITE SWARM -> orbiting wireframe drones (tetrahedra). HUNTER_PROTOCOL: red.
// HIVE_SHIELD: tighter defensive ring of green drones.
const drawNaniteSwarm: AttachmentRenderer = (a, w) => {
    const { frame, project, drawBack, slotPhase } = a;
    const hive = w.augment === 'HIVE_SHIELD';
    const hunter = w.augment === 'HUNTER_PROTOCOL';
    const stroke = hunter ? '#FF3030' : '#00FF00';
    const fill = hunter ? 'rgba(255,48,48,0.3)' : 'rgba(0,255,0,0.3)';
    const count = lvlCount(w.level, 1, 2, hive ? 8 : 6);
    const radius = (hive ? 34 : 45) + a.slotIndex * 8;
    const swarmTime = frame * 0.05;
    for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + swarmTime + slotPhase;
        const cx = Math.cos(ang) * radius;
        const cy = hive ? 0 : Math.sin(swarmTime * 2 + i) * 10;
        const cz = Math.sin(ang) * radius;
        const proj = project(cx, cy, cz);
        if ((proj.depth > 0) === drawBack) {
            drawTetra(a, cx, cy, cz, 4 * lvlSize(w.level), swarmTime * 2 + i, swarmTime * 3, stroke, fill);
        }
    }
};

// SOLAR CHAKRAM -> orbiting gold spinning discs. ORBITAL_LOCK: outer locked ring.
// FRACTAL_SPLIT: each disc trails a smaller orange disc.
const drawSolarChakram: AttachmentRenderer = (a, w) => {
    const { project, t, drawBack, slotPhase } = a;
    const lock = w.augment === 'ORBITAL_LOCK';
    const split = w.augment === 'FRACTAL_SPLIT';
    const stroke = split ? '#FFAA00' : '#FFD700';
    const count = lvlCount(w.level, 1, 3, 4);
    const radius = (lock ? slotRadius(a, 58) : slotRadius(a, 34)) * (0.8 + w.level * 0.03);
    const spin = t * (lock ? 1.2 : 2.2);
    const size = 8 * lvlSize(w.level);
    for (let i = 0; i < count; i++) {
        const ang = spin + slotPhase + (Math.PI * 2 / count) * i;
        const cx = Math.cos(ang) * radius, cz = Math.sin(ang) * radius;
        const proj = project(cx, 0, cz);
        if ((proj.depth > 0) === drawBack) {
            drawPolyFlat(a, cx, 0, cz, size, 8, t * 6 + i, stroke, 'rgba(255,170,0,0.25)');
            if (split) {
                const sx = Math.cos(ang + 0.4) * (radius * 0.6), sz = Math.sin(ang + 0.4) * (radius * 0.6);
                drawPolyFlat(a, sx, 0, sz, size * 0.5, 6, -t * 8, '#FFCC44', 'rgba(255,204,68,0.2)');
            }
        }
    }
};

// VOID WAKE -> abyssal loop rings (pulsing inward). GRAVITATIONAL_WELL: pink.
// VOID_SIPHON: white.
const drawVoidWake: AttachmentRenderer = (a, w) => {
    const { ctx, frame, project, drawBack, quality, areaMult } = a;
    const time = frame * 0.04;
    const baseRadius = (24 + w.level * 3) * areaMult;
    const layers = lvlCount(w.level, 1, 3, 3);
    const rgb = w.augment === 'GRAVITATIONAL_WELL' ? '255,0,85' : (w.augment === 'VOID_SIPHON' ? '240,240,255' : '255,0,255');
    const segs = quality === 'LOW' ? 16 : 30;
    for (let l = 0; l < layers; l++) {
        const animScale = 1.0 - ((frame * 0.01 + l * 0.2) % 0.6);
        const alpha = Math.min(1, animScale * 1.5);
        if (alpha <= 0.1) continue;
        const radius = baseRadius * animScale;
        const rx = time * (l + 1) * 0.5, ry = time * (l * 0.7 + 0.3), rz = time + (l * Math.PI / 3);
        ctx.beginPath();
        let first = true; let has = false;
        for (let j = 0; j <= segs; j++) {
            const theta = (j / segs) * Math.PI * 2;
            const r = rot3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0, rx, ry, rz);
            const proj = project(r.x, r.y, r.z);
            if ((proj.depth > 0) === drawBack) {
                const jit = (Math.random() - 0.5) * (5 * animScale);
                if (first) { ctx.moveTo(proj.x + jit, proj.y + jit); first = false; }
                else ctx.lineTo(proj.x + jit, proj.y + jit);
                has = true;
            } else first = true;
        }
        if (has) {
            ctx.strokeStyle = `rgba(${rgb},${alpha})`;
            ctx.lineWidth = 2 * animScale;
            if (quality === 'HIGH' && !drawBack) { ctx.shadowColor = `rgba(${rgb},${alpha})`; ctx.shadowBlur = 10 * animScale; }
            ctx.stroke(); ctx.shadowBlur = 0;
        }
    }
};

// NOTE: drum_echo (ORBITAL) and paradox_pendulum (PARADOX) intentionally have
// no avatar attachment — those weapons already render their orbiting drums /
// swinging pendulum on the player via the projectile renderer, so a second
// decorative copy would just duplicate them.

// KALEIDOSCOPE GAZE -> a small, semi-transparent prismatic bullseye reticle
// floating in the aim direction (player-local +x maps to the facing angle).
// TRI_OPTIC_PRISM: faint side reticles. CHROMA_STASIS: cyan monochrome.
const drawKaleidoscope: AttachmentRenderer = (a, w) => {
    const { ctx, project, frame, drawBack } = a;
    const tri = w.augment === 'TRI_OPTIC_PRISM';
    const stasis = w.augment === 'CHROMA_STASIS';
    const dist = 44;            // forward offset along the aim direction
    const baseR = 6 + w.level * 0.7;
    const cols = stasis
        ? ['rgba(0,255,255,', 'rgba(0,255,255,', 'rgba(0,255,255,']
        : ['rgba(255,40,90,', 'rgba(60,255,140,', 'rgba(90,150,255,'];

    // angle offsets for the reticle and (optional) tri-optic side reticles
    const offsets = tri ? [-0.5, 0, 0.5] : [0];
    for (const off of offsets) {
        const fx = Math.cos(off) * dist, fz = Math.sin(off) * dist;
        const proj = project(fx, 0, fz);
        if ((proj.depth > 0) !== drawBack) continue;
        const main = off === 0;
        const fade = main ? 1 : 0.45;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.lineWidth = 1.25;
        // concentric prismatic rings (camera-facing, flattened slightly)
        for (let i = 0; i < 3; i++) {
            const r = baseR * (1 - i * 0.3) * (main ? 1 : 0.7);
            if (r <= 0.5) continue;
            ctx.strokeStyle = cols[i] + (0.4 * fade) + ')';
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        // crosshair ticks + center dot
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * fade})`;
        const tick = baseR * 1.15;
        ctx.beginPath();
        ctx.moveTo(-tick, 0); ctx.lineTo(-tick * 0.5, 0);
        ctx.moveTo(tick * 0.5, 0); ctx.lineTo(tick, 0);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.6 * fade})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};

// FRACTAL BLOOM -> orbiting recursive branch motes. JULIAS_GRASP: cyan.
// RECURSIVE_SPLIT: magenta, larger.
const drawFractalBloom: AttachmentRenderer = (a, w) => {
    const { ctx, project, t, drawBack, slotPhase } = a;
    const split = w.augment === 'RECURSIVE_SPLIT';
    const color = split ? '#FF00FF' : '#00FFFF';
    const count = lvlCount(w.level, 1, 2, 4);
    const orbitR = slotRadius(a, 36);
    const depth = Math.min(4, 2 + Math.floor(w.level / 3));
    for (let i = 0; i < count; i++) {
        const ang = t * 1.6 + slotPhase + (Math.PI * 2 / count) * i;
        const proj = project(Math.cos(ang) * orbitR, Math.sin(t * 3 + i) * 6, Math.sin(ang) * orbitR);
        if ((proj.depth > 0) !== drawBack) continue;
        // Cheap 2D recursive Y-branch at the projected position.
        ctx.strokeStyle = color; ctx.lineWidth = 1.2;
        const branch = (x: number, y: number, len: number, ang2: number, d: number) => {
            if (d <= 0 || len < 1) return;
            const ex = x + Math.cos(ang2) * len, ey = y + Math.sin(ang2) * len;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
            branch(ex, ey, len * 0.66, ang2 - 0.6, d - 1);
            branch(ex, ey, len * 0.66, ang2 + 0.6, d - 1);
        };
        const base = (split ? 9 : 7) * lvlSize(w.level);
        branch(proj.x, proj.y, base, -Math.PI / 2 + t, depth);
    }
};

// ANCESTRAL RESONANCE -> periodic expanding ground shockwave + totem base ring.
// CHRONO_STUTTER: cyan. AFTERSHOCK: green double pulse.
const drawAncestralResonance: AttachmentRenderer = (a, w) => {
    const { ctx, project, frame, drawBack, areaMult } = a;
    const chrono = w.augment === 'CHRONO_STUTTER';
    const after = w.augment === 'AFTERSHOCK';
    // Persistent low totem ring (front+back via depth).
    const baseR = slotRadius(a, 30) * areaMult;
    drawPolyFlat(a, 0, 18, 0, baseR, 6, frame * 0.01, `rgba(${chrono ? '0,255,255' : '0,255,0'},0.5)`, 'rgba(0,0,0,0)');
    // Expanding pulses on the ground plane.
    const pulses = after ? 2 : 1;
    const maxR = (60 + w.level * 8) * areaMult;
    for (let p = 0; p < pulses; p++) {
        const prog = ((frame * 0.012 + p * 0.4) % 1);
        const r = baseR + prog * maxR;
        const alpha = (1 - prog) * 0.7;
        ctx.beginPath();
        let first = true; let has = false;
        const segs = a.quality === 'LOW' ? 16 : 28;
        for (let i = 0; i <= segs; i++) {
            const ang = (i / segs) * Math.PI * 2;
            const proj = project(Math.cos(ang) * r, 20, Math.sin(ang) * r);
            if ((proj.depth > 0) === drawBack) {
                if (first) { ctx.moveTo(proj.x, proj.y); first = false; } else ctx.lineTo(proj.x, proj.y);
                has = true;
            } else first = true;
        }
        if (has) {
            ctx.strokeStyle = `rgba(${chrono ? '0,255,255' : '0,255,0'},${alpha})`;
            ctx.lineWidth = 2.5 * (1 - prog) + 0.5;
            ctx.stroke();
        }
    }
};

export const PlayerAttachmentRegistry: Record<string, AttachmentRenderer> = {
    spirit_lance: drawSpiritLance,
    cyber_kora: drawCyberKora,
    void_aura: drawVoidAura,
    nanite_swarm: drawNaniteSwarm,
    solar_chakram: drawSolarChakram,
    void_wake: drawVoidWake,
    kaleidoscope_gaze: drawKaleidoscope,
    fractal_bloom: drawFractalBloom,
    ancestral_resonance: drawAncestralResonance,
};

// ---------------------------------------------------------------------------
// Body-structural growth: vertex SHAPE morphs + per-weapon CORE morphs
// ---------------------------------------------------------------------------

export interface Vec3 { x: number; y: number; z: number; }

// Per-weapon CORE (icosahedron) transformation. The core reflects the player's
// most-invested ("signature") weapon — the heart of the build. Animated terms
// (pulse / jitter / prism color) are applied in the renderer from these params.
export interface CoreStyle {
    scale: number;                 // base size
    sx: number; sy: number; sz: number; // per-axis stretch (spindle / disc / smear)
    spin: number;                  // spin-speed multiplier (1 = default)
    fill: string;
    wire: string;
    shard: number;                 // px each face explodes outward (shard-split)
    pulse: number;                 // size-pulse amplitude (fraction)
    pulseSpeed: number;
    prism: boolean;                // rainbow per-face fill
    jitter: number;                // px positional stutter
}

export interface BodyStyle {
    shellColor: string;     // octahedron wireframe stroke
    shellLineWidth: number;
    plate: number;          // 0..1 armor-plate fill strength on near faces
    spike: number;          // spike length in px out from vertices (HIGH only)
    shellVerts: Vec3[];     // 6 octahedron verts, morphed by equipped weapons
    breath: number;         // whole-shell scale-pulse amplitude
    belt: number;           // equatorial belt expansion factor (0 = none)
    undulate: number;       // per-frame asymmetric y-axis wobble amplitude (0 = none)
    bulge: number;          // face-centroid outward push fraction → rounded blob (0 = none)
    bevel: number;          // 0..~0.35 edge fraction for truncated vertex cap quads (0 = none)
    segments: number;       // stacked body copies → totem/insectoid (1 = single)
    shatter: number;        // face-gap separation along normals → barely-held-together (0 = none)
    fringe: number;         // edge-bristle length fraction → sea-urchin (HIGH only, 0 = none)
    bud: number;            // child-octahedron size on faces → fractal bloom (HIGH only, 0 = none)
    dualShell: number;      // counter-rotating inner shell scale multiplier (kaleidoscope_gaze). 0 = none
    shatterJagged: boolean; // non-uniform per-face shatter via deterministic hash (void_aura + ENTROPY_FIELD)
    core: CoreStyle;
}

// Base octahedron vertices (unit; scaled by ~22 in the renderer). Index order:
// 0:+z 1:-z 2:+x(aim/forward) 3:-x(rear) 4:+y(top) 5:-y(bottom).
const BASE_SHELL_VERTS: Vec3[] = [
    { x: 0, y: 0, z: 1.3 }, { x: 0, y: 0, z: -1.3 },
    { x: 1.0, y: 0, z: 0 }, { x: -1.0, y: 0, z: 0 },
    { x: 0, y: 1.0, z: 0 }, { x: 0, y: -1.0, z: 0 },
];

// Per-weapon vertex displacement. The grow variant scales a vert along its own
// axis by (1 + grow * level). twist rotates the equatorial ring (y≈0 verts 0-3)
// around Y. skew additively leans the top/bottom poles forward/back in Z.
// Multiple weapons and types stack, so a loadout produces a unique silhouette.
type ShellMorphEntry =
    | { type?: 'grow'; idx: number; grow: number }
    | { type: 'twist'; amount: number }
    | { type: 'skew'; dz: number };

const SHELL_MORPHS: Record<string, ShellMorphEntry[]> = {
    spirit_lance: [{ idx: 2, grow: 0.11 }],                                   // forward dart/lance
    cyber_kora: [{ idx: 0, grow: 0.06 }, { idx: 1, grow: 0.06 },
                 { idx: 2, grow: -0.10 }, { idx: 3, grow: -0.10 }],           // caltrop: z-spikes + pinched sides
    void_aura: [{ idx: 0, grow: -0.03 }, { idx: 1, grow: -0.03 }, { idx: 2, grow: -0.03 }, { idx: 3, grow: -0.03 }, { idx: 4, grow: -0.03 }, { idx: 5, grow: -0.03 }], // implode/compact
    nanite_swarm: [{ idx: 4, grow: 0.09 }, { idx: 5, grow: 0.09 }],           // tall segmented hull (+ belt in BodyStyle)
    solar_chakram: [{ idx: 0, grow: 0.06 }, { idx: 1, grow: 0.06 }, { idx: 2, grow: 0.05 }, { idx: 3, grow: 0.05 }, { idx: 4, grow: -0.05 }, { idx: 5, grow: -0.05 }], // flattened disc
    void_wake: [{ idx: 3, grow: 0.12 },
                { idx: 4, grow: 0.05 }, { idx: 0, grow: -0.04 }, { idx: 1, grow: -0.04 }], // taper: rear tail + kite silhouette
    drum_echo: [{ idx: 4, grow: 0.03 }, { idx: 5, grow: 0.03 }],              // slight swell (+ breathing)
    paradox_pendulum: [{ idx: 2, grow: 0.04 }, { idx: 3, grow: 0.04 },
                       { type: 'twist', amount: 0.045 }],                     // twist: screwed/sheared crystal
    kaleidoscope_gaze: [{ idx: 0, grow: 0.04 }],                              // faceted front
    fractal_bloom: [{ idx: 0, grow: 0.04 }, { idx: 1, grow: 0.04 }, { idx: 2, grow: 0.04 }, { idx: 3, grow: 0.04 }, { idx: 4, grow: 0.04 }, { idx: 5, grow: 0.04 }], // bristling growth
    ancestral_resonance: [{ idx: 4, grow: 0.13 }, { idx: 0, grow: 0.06 },
                          { type: 'skew', dz: 0.08 }],                        // skew: aggressive forward lean
};

const defaultCore = (): CoreStyle => ({
    scale: 3.5, sx: 1, sy: 1, sz: 1, spin: 1,
    fill: COLORS.orange, wire: 'rgba(255, 200, 100, 0.5)',
    shard: 0, pulse: 0, pulseSpeed: 0.1, prism: false, jitter: 0,
});

// Core morph for the signature (highest-level) weapon, tinted by its augment.
const coreStyleFor = (w: Weapon): CoreStyle => {
    const c = defaultCore();
    switch (w.id) {
        case 'spirit_lance': c.sx = 0.7; c.sy = 1.7; c.sz = 0.7; c.scale = 3.3; c.fill = w.augment === 'PHASE_DRILL' ? '#c77dff' : '#ffd9b3'; break; // spindle
        case 'cyber_kora': c.fill = '#00FFFF'; c.spin = 2.2; c.pulse = 0.22; c.pulseSpeed = 0.5; break;                                              // flickering pulse
        case 'void_aura': c.fill = '#0a0014'; c.wire = augColor(w, '#cc66ff'); c.scale = 3.1; c.pulse = 0.14; c.pulseSpeed = 0.08; break;            // hollow void
        case 'nanite_swarm': c.fill = w.augment === 'HUNTER_PROTOCOL' ? '#FF3030' : '#00FF00'; c.shard = 3.5; c.spin = 1.6; break;                   // shard-split
        case 'solar_chakram': c.sx = 1.5; c.sz = 1.5; c.sy = 0.45; c.fill = '#FFD700'; c.spin = 3; break;                                            // fast gold disc
        case 'void_wake': c.sx = 1.7; c.fill = augColor(w, '#FF00FF'); c.spin = 1.3; break;                                                          // comet smear
        case 'drum_echo': c.fill = '#3399FF'; c.pulse = 0.4; c.pulseSpeed = 0.18; break;                                                             // struck-drum throb
        case 'paradox_pendulum': c.fill = '#FFD700'; c.jitter = 3.5; c.spin = 1.5; break;                                                            // time stutter
        case 'kaleidoscope_gaze': c.prism = true; c.spin = 2; c.fill = '#FFFFFF'; break;                                                             // prism
        case 'fractal_bloom': c.fill = '#00FFFF'; c.shard = 2; c.spin = 1.4; break;                                                                  // subdivided
        case 'ancestral_resonance': c.fill = augColor(w, '#00FF00'); c.scale = 3.8; c.pulse = 0.5; c.pulseSpeed = 0.06; break;                       // huge throb
    }
    c.scale *= 0.9 + w.level * 0.025; // signature weapon investment grows the heart
    return c;
};

// Augment-conditional vertex morphs, layered on top of static SHELL_MORPHS.
// Returns true when the shatterJagged flag should be set.
const applyAugmentMorph = (w: Weapon, shellVerts: Vec3[]): boolean => {
    if (!w.augment) return false;
    if (w.id === 'spirit_lance' && w.augment === 'PHASE_DRILL') {
        // spiral-drill: twist the equatorial ring on top of the forward dart
        const a = 0.06 * w.level, c = Math.cos(a), s = Math.sin(a);
        for (const i of [0, 1, 2, 3]) {
            const { x, z } = shellVerts[i];
            shellVerts[i].x = x * c - z * s; shellVerts[i].z = x * s + z * c;
        }
    }
    if (w.id === 'cyber_kora' && w.augment === 'DISSONANCE_SHREDDER') {
        // asymmetric/glitchy: hard-collapse one x-side, grow the other (overrides static pinch)
        const s2 = Math.sign(shellVerts[2].x) || 1, s3 = Math.sign(shellVerts[3].x) || -1;
        shellVerts[2].x = s2 * 0.30;
        shellVerts[3].x = s3 * (1.0 + 0.10 * w.level);
    }
    return w.id === 'void_aura' && w.augment === 'ENTROPY_FIELD';
};

// Folds equipped weapons + artifacts/stats into one body style per frame.
// Weapons drive shell tint, vertex morphs, spikes, and the core; artifacts/stats
// add subtle plating/tints. Built once per frame, no orbiting geometry here.
export const computeBodyStyle = (player: Player, quality: 'HIGH' | 'LOW'): BodyStyle => {
    let shellColor = COLORS.white;
    let shellLineWidth = 1.5;
    let plate = 0;
    let spike = 0;
    let breath = 0;
    let belt = 0;
    let undulate = 0;
    let bulge = 0;
    let bevel = 0;
    let segments = 1;
    let shatter = 0;
    let fringe = 0;
    let bud = 0;
    let dualShell = 0;
    let shatterJagged = false;

    // Morphed shell vertices (clone the base so we never mutate it).
    const shellVerts: Vec3[] = BASE_SHELL_VERTS.map(v => ({ x: v.x, y: v.y, z: v.z }));

    let totalLevel = 0;
    let topWeapon: Weapon | null = null;
    for (const w of player.weapons) {
        totalLevel += w.level;
        // gentle blend so multiple weapons mix without washing out the white.
        shellColor = lerpColor(shellColor, w.color, 0.12);
        if (!topWeapon || w.level > topWeapon.level) topWeapon = w;
        // accumulate vertex shape morph
        const morph = SHELL_MORPHS[w.id];
        if (morph) {
            for (const m of morph) {
                if (!m.type || m.type === 'grow') {
                    const f = 1 + m.grow * w.level;
                    shellVerts[m.idx].x *= f; shellVerts[m.idx].y *= f; shellVerts[m.idx].z *= f;
                } else if (m.type === 'twist') {
                    // rotate equatorial ring (verts 0-3, all at y≈0) around the Y axis
                    const angle = m.amount * w.level;
                    const cos = Math.cos(angle), sin = Math.sin(angle);
                    for (const i of [0, 1, 2, 3]) {
                        const { x, z } = shellVerts[i];
                        shellVerts[i].x = x * cos - z * sin;
                        shellVerts[i].z = x * sin + z * cos;
                    }
                } else if (m.type === 'skew') {
                    // additive z lean: top pole forward, bottom pole backward
                    shellVerts[4].z += m.dz * w.level;
                    shellVerts[5].z -= m.dz * w.level;
                }
            }
        }
        if (w.id === 'drum_echo') {
            breath = Math.max(breath, 0.05 + w.level * 0.005);
            segments = Math.max(segments, quality === 'HIGH' ? 3 : 2); // stacked totem body
        }
        if (w.id === 'nanite_swarm') {
            belt = Math.max(belt, 0.08 + w.level * 0.04);
            bevel = Math.max(bevel, Math.min(0.35, 0.08 + w.level * 0.03)); // truncated mechanical tips
        }
        if (w.id === 'void_aura') {
            undulate = Math.max(undulate, 0.04 + w.level * 0.004); // living wobble
            bulge = Math.max(bulge, 0.10 + w.level * 0.02);        // rounded organic blob
        }
        if (w.id === 'paradox_pendulum') shatter = Math.max(shatter, Math.min(0.5, 0.18 + w.level * 0.04)); // barely-held-together
        if (w.id === 'fractal_bloom' && quality === 'HIGH') {
            fringe = Math.max(fringe, 0.25 + w.level * 0.05); // sea-urchin edge bristles
            bud = Math.max(bud, 0.12 + w.level * 0.03);       // recursive child octahedra
        }
        if (w.id === 'kaleidoscope_gaze') dualShell = Math.max(dualShell, 0.5);
        if (applyAugmentMorph(w, shellVerts)) shatterJagged = true;
    }
    if (quality === 'HIGH') {
        spike = Math.min(10, totalLevel * 0.5);
        if (totalLevel >= 30) fringe = Math.max(fringe, 0.2); // high total level bristles regardless of build
    }

    // Artifacts (subtle traits).
    const arts = player.artifacts || [];
    if (arts.includes('titan_frame')) { shellLineWidth += 1.0; plate += 0.5; }
    if (arts.includes('data_siphon')) shellColor = lerpColor(shellColor, '#00FFFF', 0.25);
    if (arts.includes('ancestral_focus')) shellColor = lerpColor(shellColor, COLORS.orange, 0.2);

    // Stats: armor thickens/plates the shell.
    if (player.stats.armor > 0) { shellLineWidth += Math.min(1.0, player.stats.armor * 0.15); plate += Math.min(0.5, player.stats.armor * 0.1); }

    const core = topWeapon ? coreStyleFor(topWeapon) : defaultCore();

    return { shellColor, shellLineWidth, plate: Math.min(1, plate), spike, shellVerts, breath, belt, undulate, bulge, bevel, segments, shatter, fringe, bud, dualShell, shatterJagged, core };
};
