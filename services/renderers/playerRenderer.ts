
import { Player, MissionType } from '../../types';
import { COLORS, DASH, GRAPHICS_QUALITY } from '../../constants';
import { graphicsSettings } from '../graphicsSettings';
import { project3D, parseColorToRgb } from '../renderUtils';
import { PlayerAttachmentRegistry, SLOT_PHASE, computeBodyStyle, AttachmentCtx } from './playerAttachments';

export const drawPlayerMesh = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    frame: number,
    color: string = COLORS.orange,
    wireframeColor: string = COLORS.white,
    opacity: number = 1.0,
    distortion: number = 0,
    customYaw?: number,
    customPitch?: number,
    shellLineWidth: number = 1.5
) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);

    // Rotation
    // Use custom pitch/yaw if provided (for replicas matching player movement)
    // Otherwise fall back to idle animation
    // NOTE: Mapping to project3D axes:
    // rx (X-axis) = roll (Wobble)
    // ry (Y-axis) = pitch (Rolling forward/back)
    // rz (Z-axis) = yaw (Facing direction on screen)

    const pitch = customPitch !== undefined ? customPitch : frame * 0.05;
    const yaw = customYaw !== undefined ? customYaw : Math.sin(frame * 0.02) * 0.2;
    const roll = Math.cos(frame * 0.02) * 0.1;

    // Helper for vertex distortion
    const applyDistortion = (vx: number, vy: number, vz: number) => {
        if (distortion <= 0) return { x: vx, y: vy, z: vz };
        return {
            x: vx + (Math.random() - 0.5) * distortion,
            y: vy + (Math.random() - 0.5) * distortion,
            z: vz + (Math.random() - 0.5) * distortion
        };
    };

    // --- SHELL (Octahedron) ---
    const sR = radius;
    const shellVerts = [
        { x: 0, y: 0, z: sR * 1.3 }, { x: 0, y: 0, z: -sR * 1.3 }, // Z axis tips
        { x: sR, y: 0, z: 0 }, { x: -sR, y: 0, z: 0 }, // X axis tips
        { x: 0, y: sR, z: 0 }, { x: 0, y: -sR, z: 0 }  // Y axis tips
    ];

    const pShell = shellVerts.map(v => {
        const d = applyDistortion(v.x, v.y, v.z);
        // Correct Axis Mapping: roll (X), pitch (Y), yaw (Z)
        return project3D(d.x, d.y, d.z, roll, pitch, yaw, 300);
    });

    const shellFaces = [
        [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], // Top pyramid
        [1, 2, 4], [1, 4, 3], [1, 3, 5], [1, 5, 2]  // Bottom pyramid
    ];

    // Sort by depth
    const sortedShell = shellFaces.map(f => {
        const v0 = pShell[f[0]]; const v1 = pShell[f[1]]; const v2 = pShell[f[2]];
        const depth = (v0.depth + v1.depth + v2.depth) / 3;
        return { v0, v1, v2, depth };
    }).sort((a, b) => a.depth - b.depth);

    // --- CORE (Icosahedron) ---
    const coreScale = radius * 0.25;
    const phi = 1.618;
    const coreVerts = [
        { x: 0, y: 1, z: phi }, { x: 0, y: 1, z: -phi }, { x: 0, y: -1, z: phi }, { x: 0, y: -1, z: -phi },
        { x: 1, y: phi, z: 0 }, { x: 1, y: -phi, z: 0 }, { x: -1, y: phi, z: 0 }, { x: -1, y: -phi, z: 0 },
        { x: phi, y: 0, z: 1 }, { x: phi, y: 0, z: -1 }, { x: -phi, y: 0, z: 1 }, { x: -phi, y: 0, z: -1 }
    ];

    // Core Spin Animation (Local)
    const coreSpin = frame * 0.05;
    const spinCos = Math.cos(coreSpin);
    const spinSin = Math.sin(coreSpin);
    const s = coreScale / 1.618;

    const pCore = coreVerts.map(v => {
        // Pre-rotate core vertices (Local Spin around Y axis)
        const lx = v.x * spinCos - v.z * spinSin;
        const lz = v.x * spinSin + v.z * spinCos;
        const ly = v.y;

        // Apply distortion to core
        const d = applyDistortion(lx * s, ly * s, lz * s);

        // Project with Player Orientation
        return project3D(d.x, d.y, d.z, roll, pitch, yaw, 300);
    });

    const coreFaces = [
        [0, 10, 2], [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10],
        [3, 9, 5], [3, 5, 7], [3, 7, 11], [3, 11, 1], [3, 1, 9],
        [2, 10, 7], [2, 7, 5], [2, 5, 8], [8, 5, 9], [8, 9, 4],
        [4, 9, 1], [4, 1, 6], [6, 1, 11], [6, 11, 10], [10, 11, 7]
    ];
    const sortedCore = coreFaces.map(f => {
        const v0 = pCore[f[0]]; const v1 = pCore[f[1]]; const v2 = pCore[f[2]];
        const depth = (v0.depth + v1.depth + v2.depth) / 3;
        return { v0, v1, v2, depth };
    }).sort((a, b) => a.depth - b.depth);

    // --- DRAW FUNCTIONS ---
    const drawShellFace = (f: any) => {
        ctx.beginPath(); ctx.moveTo(f.v0.x, f.v0.y); ctx.lineTo(f.v1.x, f.v1.y); ctx.lineTo(f.v2.x, f.v2.y); ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeStyle = wireframeColor;
        ctx.lineWidth = shellLineWidth;
        ctx.lineJoin = 'round';
        ctx.fill();
        ctx.stroke();
    };

    const drawCoreFace = (f: any) => {
        ctx.beginPath(); ctx.moveTo(f.v0.x, f.v0.y); ctx.lineTo(f.v1.x, f.v1.y); ctx.lineTo(f.v2.x, f.v2.y); ctx.closePath();
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    };

    // 1. Far Shell Faces
    sortedShell.filter(f => f.depth < 0).forEach(drawShellFace);
    // 2. Core
    sortedCore.forEach(drawCoreFace);
    // 3. Near Shell Faces
    sortedShell.filter(f => f.depth >= 0).forEach(drawShellFace);

    ctx.restore();
};

export const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    player: Player,
    frame: number,
    activeMissionType?: MissionType
) => {
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);

    // I-Frame Flashing Logic
    if (player.invulnerabilityTimer > 0) {
        if (Math.floor(frame / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
    }

    // Dash body tint: ghostly fade-in/out during dash (feature-flagged)
    if (graphicsSettings.dashEnabled && player.dashTimer > 0) {
        const dashFade = player.dashTimer / DASH.DURATION;
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.35 + dashFade * 0.65);
    }

    const t = frame * 0.05;
    const rollingPitch = -player.distanceTraveled * 0.04;
    const yaw = player.rotation;
    const pitch = rollingPitch;
    // Bank: lean the shell off-axis into lateral movement (velocity perpendicular to facing).
    const lateralV = -player.velocity.x * Math.sin(yaw) + player.velocity.y * Math.cos(yaw);
    const bank = Math.max(-0.3, Math.min(0.3, lateralV * 0.06));
    const roll = Math.cos(t * 0.5) * 0.1 + bank;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const cosR = Math.cos(roll), sinR = Math.sin(roll);
    const tilt = 0.4, cosT = Math.cos(tilt), sinT = Math.sin(tilt);

    const projectPlayer3D = (x: number, y: number, z: number) => {
        let y1 = y * cosR - z * sinR; let z1 = y * sinR + z * cosR; let x2 = x * cosP - z1 * sinP; let z2 = x * sinP + z1 * cosP;
        let x3 = x2 * cosY - y1 * sinY; let y3 = x2 * sinY + y1 * cosY; let yFinal = y3 * cosT - z2 * sinT; let depth = y3 * sinT + z2 * cosT;

        const focalLength = 300;
        const scale = focalLength / (focalLength + depth);
        return { x: x3, y: yFinal, depth, scale };
    };

    const isWeaponsJammed = activeMissionType === MissionType.SHADOW_STEP;

    // --- WEAPON-DRIVEN AVATAR BUILD-OUT ---
    // Each equipped weapon renders an attachment that grows with its level (1->8)
    // and changes with its augment. Run in two depth passes so parts pass behind
    // and in front of the body. All share this exact transform via projectPlayer3D.
    const bodyStyle = computeBodyStyle(player, GRAPHICS_QUALITY);
    const attachCtx: AttachmentCtx = {
        ctx, player, frame, t,
        project: projectPlayer3D,
        drawBack: true,
        quality: GRAPHICS_QUALITY,
        slotIndex: 0,
        slotPhase: 0,
        areaMult: player.stats.areaMult,
    };
    const runAttachments = (drawBack: boolean) => {
        if (isWeaponsJammed) return;
        attachCtx.drawBack = drawBack;
        player.weapons.forEach((w, i) => {
            const renderer = PlayerAttachmentRegistry[w.id];
            if (!renderer) return;
            attachCtx.slotIndex = i;
            attachCtx.slotPhase = SLOT_PHASE[i] ?? (i * 1.7);
            renderer(attachCtx, w);
        });
    };

    // BACK PASS (behind the body)
    runAttachments(true);

    // --- PLAYER BODY (Octahedron shell) ---
    // Shape is morphed per-weapon (vertex displacement) and may breathe with cadence.
    // It may also bulge (rounded blob), bevel (truncated tips), undulate (live wobble),
    // and stack into segments (totem body) per the equipped weapons' BodyStyle.
    const scale = 22 * (1 + bodyStyle.breath * Math.sin(t * 1.5));
    const vertices = bodyStyle.shellVerts;
    const faces = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]];
    // Cyclic neighbour ring per vertex (for the truncated bevel cap quads).
    const vertNeighbours = [[2, 4, 3, 5], [2, 4, 3, 5], [0, 4, 1, 5], [0, 4, 1, 5], [0, 2, 1, 3], [0, 2, 1, 3]];
    // The 12 octahedron edges (all vert pairs except the 3 opposite poles) — for edge fringe.
    const octaEdges: [number, number][] = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]];
    const budDirs = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]; // child-octahedron axes
    ctx.lineJoin = 'round';

    // Draws the whole shell (faces + shatter + plate + bulge + bevel + belt + spikes +
    // fringe + buds) once, at a
    // given model-y offset and scale. Stacked segments reuse this; single-segment builds
    // call it once with (0, 1, true) for byte-identical output vs. before this batch.
    const drawBodySegment = (modelYOffset: number, segScale: number, isMain: boolean) => {
        const full = isMain || GRAPHICS_QUALITY === 'HIGH'; // secondary LOW segments stay flat/cheap
        // Project a unit model coord, folding in segment scale, model-y offset, and the
        // animated undulation (y-axis only; per-vertex x/z phase = asymmetric living wobble).
        const projV = (vx: number, vy: number, vz: number) => {
            const undY = 1 + bodyStyle.undulate * Math.sin(t * 1.5 + vx * 0.6 + vz * 0.6);
            return projectPlayer3D(vx * scale * segScale, vy * scale * segScale * undY + modelYOffset, vz * scale * segScale);
        };
        const projVerts = vertices.map(v => projV(v.x, v.y, v.z));

        ctx.lineWidth = bodyStyle.shellLineWidth;
        faces.forEach((f, fi) => {
            // Face-gap shatter: push the whole face outward along its own normal (animated)
            // so adjacent faces separate and the body reads as barely held together.
            let a = vertices[f[0]], b = vertices[f[1]], c = vertices[f[2]];
            if (full && bodyStyle.shatter > 0) {
                const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
                const len = Math.hypot(cx, cy, cz) || 1;
                // shatterJagged: deterministic per-face hash so faces shatter unevenly (ENTROPY_FIELD)
                const jag = bodyStyle.shatterJagged
                    ? 0.4 + 1.6 * (((Math.sin(fi * 12.9898) * 43758.5453) % 1) + 1) % 1
                    : 1;
                const push = bodyStyle.shatter * jag * (0.55 + 0.45 * Math.sin(t * 2 + fi * 1.3)) / len;
                const dx = cx * push, dy = cy * push, dz = cz * push;
                a = { x: a.x + dx, y: a.y + dy, z: a.z + dz };
                b = { x: b.x + dx, y: b.y + dy, z: b.z + dz };
                c = { x: c.x + dx, y: c.y + dy, z: c.z + dz };
            }
            const v0 = projV(a.x, a.y, a.z), v1 = projV(b.x, b.y, b.z), v2 = projV(c.x, c.y, c.z);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.strokeStyle = bodyStyle.shellColor;
            ctx.lineWidth = bodyStyle.shellLineWidth;
            if (full && bodyStyle.bulge > 0) {
                // Inflate: raise the face centroid and fan into 3 sub-triangles → rounded blob.
                const k = 1 + bodyStyle.bulge;
                const pc = projV((a.x + b.x + c.x) / 3 * k, (a.y + b.y + c.y) / 3 * k, (a.z + b.z + c.z) / 3 * k);
                const edges: [typeof v0, typeof v0][] = [[v0, v1], [v1, v2], [v2, v0]];
                edges.forEach(([pa, pb]) => {
                    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pc.x, pc.y); ctx.closePath();
                    ctx.fill();
                    if (GRAPHICS_QUALITY === 'HIGH') ctx.stroke(); // interior spokes only on HIGH
                });
                if (GRAPHICS_QUALITY !== 'HIGH') { // LOW: stroke just the outer perimeter
                    ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.closePath(); ctx.stroke();
                }
            } else {
                ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Armor plating: inset highlight on near faces (artifacts / armor stat).
                if (full && bodyStyle.plate > 0 && (v0.depth + v1.depth + v2.depth) < 0) {
                    const mx = (v0.x + v1.x + v2.x) / 3, my = (v0.y + v1.y + v2.y) / 3;
                    ctx.beginPath();
                    ctx.moveTo(mx + (v0.x - mx) * 0.6, my + (v0.y - my) * 0.6);
                    ctx.lineTo(mx + (v1.x - mx) * 0.6, my + (v1.y - my) * 0.6);
                    ctx.lineTo(mx + (v2.x - mx) * 0.6, my + (v2.y - my) * 0.6);
                    ctx.closePath();
                    ctx.strokeStyle = `rgba(255,255,255,${0.25 * bodyStyle.plate})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        });

        // Truncated/beveled vertex caps: cut each sharp tip into a small flat quad.
        if (full && bodyStyle.bevel > 0) {
            const bv = bodyStyle.bevel;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.strokeStyle = bodyStyle.shellColor;
            ctx.lineWidth = bodyStyle.shellLineWidth;
            vertices.forEach((v, vi) => {
                ctx.beginPath();
                vertNeighbours[vi].forEach((ni, k) => {
                    const n = vertices[ni];
                    const p = projV(v.x + (n.x - v.x) * bv, v.y + (n.y - v.y) * bv, v.z + (n.z - v.z) * bv);
                    if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath(); ctx.fill(); ctx.stroke();
            });
        }

        // Equatorial belt: 4 diagonal facets pushed outward from the mid-ring (main only).
        if (isMain && bodyStyle.belt > 0) {
            const beltW = bodyStyle.belt * (bodyStyle.bulge > 0 ? 0.5 : 1); // bulge already rounds the equator
            const beltPairs: [number, number][] = [[0, 2], [0, 3], [1, 2], [1, 3]];
            beltPairs.forEach(([a, b]) => {
                const va = vertices[a], vb = vertices[b];
                const bMid = projV((va.x + vb.x) * 0.5 * (1 + beltW), 0, (va.z + vb.z) * 0.5 * (1 + beltW));
                const pA = projVerts[a], pB = projVerts[b];
                ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(bMid.x, bMid.y); ctx.lineTo(pB.x, pB.y); ctx.closePath();
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.strokeStyle = bodyStyle.shellColor; ctx.lineWidth = bodyStyle.shellLineWidth;
                ctx.fill(); ctx.stroke();
            });
        }

        // Structural spikes from each vertex (HIGH only, main only). When truncated, grow
        // them from the bevel cap (radius 1-bevel) so they emerge from the flat tip cleanly.
        if (isMain && bodyStyle.spike > 0) {
            const baseR = bodyStyle.bevel > 0 ? 1 - bodyStyle.bevel : 1;
            const tipR = baseR + bodyStyle.spike / scale;
            ctx.strokeStyle = bodyStyle.shellColor; ctx.lineWidth = 1.5;
            vertices.forEach(v => {
                const base = projV(v.x * baseR, v.y * baseR, v.z * baseR);
                const tip = projV(v.x * tipR, v.y * tipR, v.z * tipR);
                ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
            });
        }

        // Edge spike-fringe: a bristle from each of the 12 edge midpoints → sea-urchin look
        // (HIGH only, main only). fringe scales with fractal_bloom level / high total level.
        if (isMain && bodyStyle.fringe > 0) {
            const fl = bodyStyle.fringe;
            ctx.strokeStyle = bodyStyle.shellColor; ctx.lineWidth = 1;
            octaEdges.forEach(([i, j]) => {
                const a = vertices[i], b = vertices[j];
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2;
                const base = projV(mx, my, mz);
                const tip = projV(mx * (1 + fl), my * (1 + fl), mz * (1 + fl));
                ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
            });
        }

        // Face budding: sprout a tiny child octahedron from alternating faces → fractal bloom
        // (HIGH only, main only). Recursive silhouette that grows with fractal_bloom level.
        if (isMain && bodyStyle.bud > 0) {
            const r = bodyStyle.bud;
            ctx.strokeStyle = bodyStyle.shellColor; ctx.lineWidth = 1;
            [0, 2, 4, 6].forEach(fi => {
                const f = faces[fi];
                const a = vertices[f[0]], b = vertices[f[1]], c = vertices[f[2]];
                const ox = (a.x + b.x + c.x) / 3 * 1.25, oy = (a.y + b.y + c.y) / 3 * 1.25, oz = (a.z + b.z + c.z) / 3 * 1.25;
                const cv = budDirs.map(d => projV(ox + d[0] * r, oy + d[1] * r, oz + d[2] * r));
                faces.forEach(cf => {
                    const p0 = cv[cf[0]], p1 = cv[cf[1]], p2 = cv[cf[2]];
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath(); ctx.stroke();
                });
            });
        }
    };

    // Stacked segments: draw farthest/topmost first so the base (main) lands on top with
    // its belt/spikes/core. A single segment (the default) draws once, unchanged.
    const segs = bodyStyle.segments;
    for (let s = segs - 1; s >= 0; s--) {
        const segScale = 1 - s * 0.22;
        const yOff = s * (scale * 0.9);
        drawBodySegment(yOff, segScale, s === 0);
    }

    // Dual-shell: inner octahedron at 0.5× scale counter-rotating around Y (kaleidoscope_gaze).
    if (bodyStyle.dualShell > 0) {
        const inner = bodyStyle.dualShell * scale;
        const ang = -t, dc = Math.cos(ang), ds = Math.sin(ang);
        const iv = vertices.map(v => {
            const rx = v.x * dc - v.z * ds, rz = v.x * ds + v.z * dc;
            return projectPlayer3D(rx * inner, v.y * inner, rz * inner);
        });
        ctx.save();
        ctx.globalAlpha *= 0.6;
        ctx.strokeStyle = bodyStyle.shellColor;
        ctx.lineWidth = bodyStyle.shellLineWidth * 0.7;
        ctx.lineJoin = 'round';
        faces.forEach(f => {
            ctx.beginPath();
            ctx.moveTo(iv[f[0]].x, iv[f[0]].y); ctx.lineTo(iv[f[1]].x, iv[f[1]].y); ctx.lineTo(iv[f[2]].x, iv[f[2]].y);
            ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.stroke();
        });
        ctx.restore();
    }

    // FRONT PASS (in front of body, before the core)
    runAttachments(false);

    // --- CORE (Icosahedron) — morphed per signature weapon ---
    {
        const cs = bodyStyle.core;
        let fill = cs.fill; let wire = cs.wire;
        let scaleMul = 1; let jitterX = 0; let jitterY = 0;
        if (activeMissionType === MissionType.SHADOW_STEP) {
            fill = (Math.floor(frame / 10) % 2 === 0) ? '#FF0000' : '#444444';
            wire = 'rgba(255, 200, 100, 0.5)';
        } else {
            if (cs.pulse) scaleMul = 1 + Math.sin(frame * cs.pulseSpeed) * cs.pulse;
            if (cs.jitter) { jitterX = (Math.random() - 0.5) * cs.jitter; jitterY = (Math.random() - 0.5) * cs.jitter; }
        }
        const s = cs.scale * scaleMul;

        const rawVerts = [{ x: 0, y: 1, z: 1.618 }, { x: 0, y: 1, z: -1.618 }, { x: 0, y: -1, z: 1.618 }, { x: 0, y: -1, z: -1.618 }, { x: 1, y: 1.618, z: 0 }, { x: 1, y: -1.618, z: 0 }, { x: -1, y: 1.618, z: 0 }, { x: -1, y: -1.618, z: 0 }, { x: 1.618, y: 0, z: 1 }, { x: 1.618, y: 0, z: -1 }, { x: -1.618, y: 0, z: 1 }, { x: -1.618, y: 0, z: -1 }];
        const faces = [[0, 10, 2], [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10], [3, 9, 5], [3, 5, 7], [3, 7, 11], [3, 11, 1], [3, 1, 9], [2, 10, 7], [2, 7, 5], [2, 5, 8], [8, 5, 9], [8, 9, 4], [4, 9, 1], [4, 1, 6], [6, 1, 11], [6, 11, 10], [10, 11, 7]];
        const coreSpin = frame * 0.05 * cs.spin; const spinCos = Math.cos(coreSpin); const spinSin = Math.sin(coreSpin);
        const projVertsIco = rawVerts.map(v => {
            const rx = v.x * spinCos - v.z * spinSin; const rz = v.x * spinSin + v.z * spinCos;
            const p = projectPlayer3D(rx * s * cs.sx, v.y * s * cs.sy, rz * s * cs.sz);
            return { x: p.x + jitterX, y: p.y + jitterY, depth: p.depth };
        });
        const faceList = faces.map((f, fi) => { const v0 = projVertsIco[f[0]]; const v1 = projVertsIco[f[1]]; const v2 = projVertsIco[f[2]]; const depth = (v0.depth + v1.depth + v2.depth) / 3; return { v0, v1, v2, depth, fi }; });
        faceList.sort((a, b) => b.depth - a.depth);
        ctx.strokeStyle = wire; ctx.lineWidth = 1;
        faceList.forEach(f => {
            let v0 = f.v0, v1 = f.v1, v2 = f.v2;
            // Shard-split: explode each face outward from the core center.
            if (cs.shard) {
                const cxF = (v0.x + v1.x + v2.x) / 3, cyF = (v0.y + v1.y + v2.y) / 3;
                const d = Math.hypot(cxF, cyF) || 1; const ox = (cxF / d) * cs.shard, oy = (cyF / d) * cs.shard;
                v0 = { x: v0.x + ox, y: v0.y + oy, depth: v0.depth };
                v1 = { x: v1.x + ox, y: v1.y + oy, depth: v1.depth };
                v2 = { x: v2.x + ox, y: v2.y + oy, depth: v2.depth };
            }
            ctx.fillStyle = cs.prism ? `hsl(${(f.fi * 18 + frame * 2) % 360}, 90%, 60%)` : fill;
            ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
    }

    // Extra Lives Satellites
    if (player.extraLives > 0) {
        for (let i = 0; i < player.extraLives; i++) {
            const orbitSpeed = frame * 0.02;
            const angleOffset = (i / player.extraLives) * Math.PI * 2;
            const orbitR = 30 + Math.sin(frame * 0.05) * 2;
            const ox = Math.cos(orbitSpeed + angleOffset) * orbitR;
            const oz = Math.sin(orbitSpeed + angleOffset) * orbitR;
            const oy = Math.sin(frame * 0.1 + i) * 5 - 15;
            const proj = projectPlayer3D(ox, oy, oz);

            ctx.save();
            ctx.translate(proj.x, proj.y);
            const s = 3.5 * proj.scale;
            const phi = 1.618;
            const rawVerts = [{ x: 0, y: 1, z: phi }, { x: 0, y: 1, z: -phi }, { x: 0, y: -1, z: phi }, { x: 0, y: -1, z: -phi }, { x: 1, y: phi, z: 0 }, { x: 1, y: -phi, z: 0 }, { x: -1, y: phi, z: 0 }, { x: -1, y: -phi, z: 0 }, { x: phi, y: 0, z: 1 }, { x: phi, y: 0, z: -1 }, { x: -phi, y: 0, z: 1 }, { x: -phi, y: 0, z: -1 }];
            const faces = [[0, 10, 2], [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10], [3, 9, 5], [3, 5, 7], [3, 7, 11], [3, 11, 1], [3, 1, 9], [2, 10, 7], [2, 7, 5], [2, 5, 8], [8, 5, 9], [8, 9, 4], [4, 9, 1], [4, 1, 6], [6, 1, 11], [6, 11, 10], [10, 11, 7]];
            const spin = frame * 0.1; const spinCos = Math.cos(spin); const spinSin = Math.sin(spin);
            const projVertsIco = rawVerts.map(v => { const rx = v.x * spinCos - v.z * spinSin; const rz = v.x * spinSin + v.z * spinCos; return { x: rx * s, y: v.y * s, z: rz * s }; });
            const faceList = faces.map(f => { const v0 = projVertsIco[f[0]]; const v1 = projVertsIco[f[1]]; const v2 = projVertsIco[f[2]]; const depth = (v0.z + v1.z + v2.z) / 3; return { v0, v1, v2, depth }; });
            faceList.sort((a, b) => b.depth - a.depth);
            ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)'; ctx.lineWidth = 1; ctx.fillStyle = COLORS.orange;
            faceList.forEach(f => { ctx.beginPath(); ctx.moveTo(f.v0.x, f.v0.y); ctx.lineTo(f.v1.x, f.v1.y); ctx.lineTo(f.v2.x, f.v2.y); ctx.closePath(); ctx.fill(); ctx.stroke(); });
            ctx.restore();
        }
    }

    // --- DIEGETIC UI (HEALTH & XP BARS) ---
    const projectUI3D = (x: number, y: number, z: number) => {
        const yFinal = y * cosT - z * sinT;
        const depth = y * sinT + z * cosT;
        const focalLength = 300;
        const s = focalLength / (focalLength + depth);
        return { x: x * s, y: yFinal * s };
    };

    const drawDiegeticArc = (pct: number, radius: number, startRad: number, endRad: number, color: string, width: number, isGlowing: boolean = false) => {
        const segs = 20;
        const totalRad = endRad - startRad;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= segs; i++) {
            const theta = startRad + (totalRad * (i / segs));
            const proj = projectUI3D(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
            if (first) { ctx.moveTo(proj.x, proj.y); first = false; } else { ctx.lineTo(proj.x, proj.y); }
        }
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();

        if (pct > 0.01) {
            ctx.beginPath();
            first = true;
            const fillSegs = Math.ceil(segs * Math.min(1, pct));
            for (let i = 0; i <= fillSegs; i++) {
                let t = i / segs;
                if (t > pct) t = pct;
                const theta = startRad + (totalRad * t);
                const proj = projectUI3D(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
                if (first) { ctx.moveTo(proj.x, proj.y); first = false; } else { ctx.lineTo(proj.x, proj.y); }
            }

            ctx.strokeStyle = color;

            if (isGlowing) {
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#FFFFFF';
                ctx.lineWidth = width * 1.5;
            } else {
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
                ctx.lineWidth = width;
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    };

    // Calculate Pulse Widths
    const hpPulse = player.healthPulseTimer > 0 ? (player.healthPulseTimer / 10) : 0;
    const xpPulse = player.xpPulseTimer > 0 ? (player.xpPulseTimer / 8) : 0;

    const hpWidth = 4 + (hpPulse * 3);
    const xpWidth = 4 + (xpPulse * 2);

    const isLevelUpReady = player.xp >= player.nextLevelXp;

    // Draw Health
    drawDiegeticArc(player.health / player.maxHealth, 50, Math.PI * 0.75, Math.PI * 1.25, COLORS.orange, hpWidth);

    // Draw XP
    const xpPct = isLevelUpReady ? 1.0 : player.xp / player.nextLevelXp;
    const xpCol = isLevelUpReady ? '#FFFFFF' : '#00FFFF';
    const xpGlow = isLevelUpReady;

    drawDiegeticArc(xpPct, 50, -Math.PI * 0.25, Math.PI * 0.25, xpCol, xpWidth, xpGlow);

    // Dash cooldown arc (top slot: 45° to 135°) — only when feature is enabled
    if (graphicsSettings.dashEnabled) {
        const dashReady = player.dashCooldown <= 0 && player.dashTimer <= 0;
        const dashPct = player.dashTimer > 0 ? 1.0
            : player.dashCooldown > 0 ? (1 - player.dashCooldown / DASH.COOLDOWN)
            : 1.0;
        const dashArcColor = player.dashTimer > 0 ? '#FFFFFF'
            : dashReady ? COLORS.orange
            : 'rgba(255,102,0,0.7)';
        const dashGlow = player.dashTimer > 0 || dashReady;
        drawDiegeticArc(dashPct, 50, Math.PI * 0.25, Math.PI * 0.75, dashArcColor, 3, dashGlow);
    }

    ctx.restore();
};
