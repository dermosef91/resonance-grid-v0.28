
import { MissionEntity, Player, MissionState } from '../../types';
import { project3D, drawLightningBolt, hexToRgba } from '../renderUtils';
import { drawPlayer, drawPlayerMesh } from './playerRenderer';

export const drawMissionEntity = (
    ctx: CanvasRenderingContext2D,
    e: MissionEntity,
    frame: number,
    missionProgress?: MissionState | { current: number, total: number },
    player?: Player
) => {
    if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y)) return;

    ctx.save();
    ctx.translate(e.pos.x, e.pos.y);

    // APPLY FADE
    if (e.opacity !== undefined) {
        ctx.globalAlpha = e.opacity;
    }

    if (e.kind === 'ZONE') {
        // --- HOLO-PROJECTOR MONOLITH (King of the Hill) ---
        const t = frame * 0.02;
        const isActive = e.active; // Player inside
        const currentVal = missionProgress ? ('progress' in missionProgress ? missionProgress.progress : (missionProgress as any).current) : 0;
        const totalVal = missionProgress ? ('total' in missionProgress ? missionProgress.total : (missionProgress as any).total) : 1;
        const progress = (missionProgress && totalVal > 0)
            ? Math.min(1, Math.max(0, currentVal / totalVal))
            : 0;

        const mainColor = isActive ? '#00FF00' : '#FFD700'; // Green (Active) vs Gold (Inactive)
        const beamColor = isActive ? `rgba(0, 255, 0, ${0.3 + progress * 0.5})` : 'rgba(255, 215, 0, 0.2)';

        // --- 1. PERIMETER RING (Projected on Ground) ---
        ctx.save();
        ctx.scale(1, 0.5); // Perspective squash for ground circle

        // Base Ring
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;

        if (progress < 0.99) {
            // Scanning effect: Dotted/Dashed based on progress
            const dashLen = 5 + (progress * 40);
            const gapLen = 20 - (progress * 18); // Gaps close as progress increases
            ctx.setLineDash([dashLen, Math.max(2, gapLen)]);
            ctx.lineDashOffset = -frame * 2; // Rotate
        } else {
            // Solid when complete/near complete
            ctx.setLineDash([]);
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 15;
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        ctx.shadowBlur = 0;

        // Fill area (Faint Hologram Floor)
        ctx.fillStyle = isActive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 215, 0, 0.05)';
        ctx.fill();

        // Progress Arc (Solid overlay tracking completion)
        if (progress > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        ctx.restore();

        // --- 2. CENTRAL MONOLITH (3D Projector) ---
        const hover = Math.sin(t * 2) * 5;
        const openY = isActive ? -25 : 0; // Top part lifts up when active
        const spin = isActive ? t * 3 : t * 0.5; // Spins faster when active

        // A. Base Pyramid (Fixed on ground)
        const bW = 15;
        const bH = -25; // Negative Y is up in this projection
        const baseVerts = [
            { x: -bW, y: 0, z: -bW }, { x: bW, y: 0, z: -bW }, // Base corners
            { x: bW, y: 0, z: bW }, { x: -bW, y: 0, z: bW },
            { x: 0, y: bH, z: 0 } // Tip
        ];
        const pBase = baseVerts.map(v => project3D(v.x, v.y, v.z, 0, 0, 0, 300));

        ctx.fillStyle = '#111111';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        const drawFace = (indices: number[]) => {
            ctx.beginPath();
            const start = pBase[indices[0]];
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < indices.length; i++) ctx.lineTo(pBase[indices[i]].x, pBase[indices[i]].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        // Draw Base Faces
        drawFace([0, 1, 4]); drawFace([1, 2, 4]); drawFace([2, 3, 4]); drawFace([3, 0, 4]);

        // B. Floating Emitter (Rotating & Opening)
        const eW = 10;
        const eH = 20;
        const topY = bH + openY + hover; // Floating position

        // Emitter Shape (Crystal/Diamond)
        const emitVerts = [
            { x: 0, y: topY - eH, z: 0 }, // Top point
            { x: eW, y: topY, z: 0 }, { x: -eW, y: topY, z: 0 }, { x: 0, y: topY, z: eW }, { x: 0, y: topY, z: -eW }, // Middle Ring
            { x: 0, y: topY + eH, z: 0 } // Bottom point
        ];

        const pEmit = emitVerts.map(v => {
            // Rotate around local Y axis
            // Since v.x, v.z are local coords relative to (0, topY, 0)
            const dx = v.x; const dz = v.z;
            const rx = dx * Math.cos(spin) - dz * Math.sin(spin);
            const rz = dx * Math.sin(spin) + dz * Math.cos(spin);
            return project3D(rx, v.y, rz, 0, 0, 0, 300);
        });

        ctx.fillStyle = isActive ? '#FFFFFF' : '#333333';
        if (isActive) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = mainColor;
        }

        // Draw Emitter Faces
        const emitFaces = [
            [0, 1, 3], [0, 3, 2], [0, 2, 4], [0, 4, 1], // Top Pyramid
            [5, 1, 3], [5, 3, 2], [5, 2, 4], [5, 4, 1]  // Bottom Pyramid
        ];

        emitFaces.forEach(indices => {
            ctx.beginPath();
            const start = pEmit[indices[0]];
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < indices.length; i++) ctx.lineTo(pEmit[indices[i]].x, pEmit[indices[i]].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        ctx.shadowBlur = 0;

        // --- 3. LASER PROJECTION ---
        // Beams from Emitter Top to Perimeter
        const beamSource = pEmit[0]; // Top of emitter
        const laserCount = 8;

        // Calculate lasers scanning rotation
        const scanOffset = frame * 0.02;

        for (let i = 0; i < laserCount; i++) {
            const angle = (i / laserCount) * Math.PI * 2 + scanOffset;

            // Ground point 3D coord (y=0 is ground)
            const gx = Math.cos(angle) * e.radius;
            const gz = Math.sin(angle) * e.radius;
            const pGround = project3D(gx, 0, gz, 0, 0, 0, 300);

            ctx.beginPath();
            ctx.moveTo(beamSource.x, beamSource.y);
            ctx.lineTo(pGround.x, pGround.y);

            ctx.strokeStyle = beamColor;

            if (isActive) {
                // Solid intense beam if active
                ctx.lineWidth = 1 + (progress * 2);
                ctx.setLineDash([]);
                // Random flicker for beam intensity
                if (Math.random() > 0.5) ctx.lineWidth += 1;
            } else {
                // Scanning dotted beam if inactive
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 20]);
                ctx.lineDashOffset = -frame * 4;
            }

            ctx.stroke();
            ctx.setLineDash([]);

            // Dot on ground
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.arc(pGround.x, pGround.y, isActive ? 4 : 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Central Uplink Beam (When active)
        if (isActive) {
            const beamWidth = 5 + (progress * 15);
            const beamHeight = 1000;
            const grad = ctx.createLinearGradient(0, beamSource.y, 0, beamSource.y - beamHeight);
            grad.addColorStop(0, `rgba(0, 255, 0, ${0.3 + progress * 0.2})`);
            grad.addColorStop(1, 'rgba(0, 255, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(beamSource.x - beamWidth / 2, beamSource.y);
            ctx.lineTo(beamSource.x + beamWidth / 2, beamSource.y);
            ctx.lineTo(beamSource.x + beamWidth, beamSource.y - beamHeight); // Fan out slightly
            ctx.lineTo(beamSource.x - beamWidth, beamSource.y - beamHeight);
            ctx.fill();
        }

    } else if (e.kind === 'PAYLOAD') {
        // --- ETHEREAL PAYLOAD VISUALS ---
        const distToPlayer = player ? Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2) : 0;
        const isLocked = distToPlayer >= 750;
        const t = frame * 0.02;

        if (isLocked) {
            // LOCKED STATE: VOID AURA CAGE
            const radius = 60;
            const rings = 4;

            // Background Void Fill
            ctx.fillStyle = 'rgba(10, 0, 20, 0.6)';
            ctx.beginPath(); ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2); ctx.fill();

            // Chaotic Void Rings
            ctx.lineWidth = 2;
            for (let r = 0; r < rings; r++) {
                const ringOffset = (r / rings) * Math.PI;
                const rX = t * (r % 2 === 0 ? 1 : -1) + ringOffset;
                const rY = t * (r % 2 === 0 ? 0.7 : -0.7);
                const rZ = t * 0.3;

                ctx.beginPath();
                const segments = 32;
                for (let i = 0; i <= segments; i++) {
                    const theta = (i / segments) * Math.PI * 2;
                    const lx = Math.cos(theta) * radius;
                    const ly = Math.sin(theta) * radius;
                    const p = project3D(lx, ly, 0, rX, rY, rZ);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                const alpha = 0.4 + Math.sin(t * 3 + r) * 0.2;
                ctx.strokeStyle = `rgba(150, 0, 255, ${alpha})`; // Purple pulsing
                ctx.shadowBlur = 10; ctx.shadowColor = '#9900FF';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Core Text/Symbol
            ctx.fillStyle = '#9900FF';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("VOID LOCK", 0, radius + 15);

        } else {
            // ACTIVE STATE: ETHEREAL CRYSTAL + TETHER

            // 1. Draw Lightning Tether & Connection Aura (Absolute Coordinates)
            // Restore context to world space temporarily
            ctx.restore();

            if (player) {
                ctx.save();
                ctx.globalAlpha = 0.6 + Math.sin(frame * 0.2) * 0.2;
                drawLightningBolt(ctx, player.pos, e.pos, '#00FFFF', 2, 20);

                // Draw Jittery Connection Aura around Player and Payload
                const drawConnectionAura = (pos: { x: number, y: number }) => {
                    const layers = 2;
                    for (let i = 0; i < layers; i++) {
                        ctx.beginPath();
                        const baseRad = 35 + (i * 8);
                        const segments = 12;
                        const offset = frame * 0.1 * (i % 2 === 0 ? 1 : -1);

                        for (let j = 0; j <= segments; j++) {
                            const ang = (j / segments) * Math.PI * 2 + offset;
                            const r = baseRad + (Math.random() - 0.5) * 6;
                            const px = pos.x + Math.cos(ang) * r;
                            const py = pos.y + Math.sin(ang) * r;
                            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                        ctx.strokeStyle = i === 0 ? '#00FFFF' : 'rgba(0, 80, 255, 0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                };

                drawConnectionAura(player.pos);
                drawConnectionAura(e.pos);

                ctx.restore();
            }

            // Re-apply translation for local object drawing
            ctx.save();
            ctx.translate(e.pos.x, e.pos.y);

            // 2. Draw Ethereal Core (Spinning Geometric Shape)
            const scale = 22;
            const coreRotX = t;
            const coreRotY = t * 1.3;

            // Vertices for Octahedron
            const verts = [
                { x: 0, y: -1.4, z: 0 }, // Top
                { x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: 1 }, { x: -1, y: 0, z: -1 }, // Mid
                { x: 0, y: 1.4, z: 0 } // Bottom
            ];

            const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, coreRotX, coreRotY, 0));

            // Draw Inner Glow
            const pulse = 1 + Math.sin(frame * 0.1) * 0.1;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 20 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw Wireframe
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';

            const edges = [
                [0, 1], [0, 2], [0, 3], [0, 4], // Top pyramid
                [5, 1], [5, 2], [5, 3], [5, 4], // Bottom pyramid
                [1, 2], [2, 4], [4, 3], [3, 1]  // Equator
            ];

            ctx.beginPath();
            edges.forEach(edge => {
                const p1 = projected[edge[0]];
                const p2 = projected[edge[1]];
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            });
            ctx.stroke();

            // 3. Draw Destination Indicator (Arrow)
            if (e.destination) {
                const angle = Math.atan2(e.destination.y - e.pos.y, e.destination.x - e.pos.x);
                ctx.rotate(angle);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.moveTo(45, 0);
                ctx.lineTo(35, -8);
                ctx.lineTo(35, 8);
                ctx.fill();
            }
        }

    } else if (e.kind === 'OBELISK') {
        const t = frame * 0.02;
        // Obelisk Shape Params
        const h = 120;
        const wBase = 25;
        const wTop = 15;
        const hPyr = 30;

        const rotY = t * 0.25; // Slower majestic spin

        // --- 1. Circular Base ---
        const rings = [60, 80];
        ctx.lineWidth = 2;

        rings.forEach(r => {
            ctx.beginPath();
            const segs = 32;
            for (let i = 0; i <= segs; i++) {
                const theta = (i / segs) * Math.PI * 2;
                // Project base rings on ground plane (y=0)
                const p = project3D(Math.cos(theta) * r, 0, Math.sin(theta) * r, 0, rotY, 0, 300);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = e.active ? 'rgba(0, 255, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)';
            ctx.shadowBlur = e.active ? 10 : 0; // Reduced blur
            ctx.shadowColor = '#00FF00';
            ctx.stroke();
        });

        // --- 2. Obelisk Body ---
        // Define Geometry
        const vBase = [
            { x: -wBase, y: 0, z: -wBase }, { x: wBase, y: 0, z: -wBase },
            { x: wBase, y: 0, z: wBase }, { x: -wBase, y: 0, z: wBase }
        ];
        // Note: Y is negative up in this 3D projection context
        const vShaftTop = [
            { x: -wTop, y: -h, z: -wTop }, { x: wTop, y: -h, z: -wTop },
            { x: wTop, y: -h, z: wTop }, { x: -wTop, y: -h, z: wTop }
        ];
        const vTip = { x: 0, y: -h - hPyr, z: 0 };

        // Combine and project
        const allVerts = [...vBase, ...vShaftTop, vTip];
        const pVerts = allVerts.map(v => project3D(v.x, v.y, v.z, 0, rotY, 0, 300));

        // Indices
        const idxBase = [0, 1, 2, 3];
        const idxShaftTop = [4, 5, 6, 7];
        const idxTip = 8;

        // Faces to draw (Sides and Cap)
        const faces = [
            [0, 1, 5, 4], // Front/Side
            [1, 2, 6, 5],
            [2, 3, 7, 6],
            [3, 0, 4, 7],
            // Pyramid Cap
            [4, 5, 8],
            [5, 6, 8],
            [6, 7, 8],
            [7, 4, 8]
        ];

        // Sort by average depth
        const sortedFaces = faces.map(indices => {
            const ps = indices.map(i => pVerts[i]);
            const depth = ps.reduce((acc, p) => acc + p.depth, 0) / indices.length;
            return { indices, depth, ps };
        }).sort((a, b) => a.depth - b.depth);

        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        if (e.active) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowBlur = 10; // Reduced blur
            ctx.shadowColor = '#00FF00';
            ctx.fillStyle = 'rgba(0, 30, 0, 0.2)'; // Dark transparent green
        } else {
            ctx.strokeStyle = '#555555';
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)'; // Dark monolith
        }

        // Draw
        sortedFaces.forEach(f => {
            ctx.beginPath();
            ctx.moveTo(f.ps[0].x, f.ps[0].y);
            for (let i = 1; i < f.ps.length; i++) {
                ctx.lineTo(f.ps[i].x, f.ps[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // --- 3. Activation Effects ---
        if (e.active) {
            // Vertical Beam
            const tip = pVerts[8]; // vTip index

            // Trapezoid Beam
            const beamGrad = ctx.createLinearGradient(0, tip.y, 0, tip.y - 1000);
            beamGrad.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
            beamGrad.addColorStop(1, 'rgba(0, 255, 0, 0)');

            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(tip.x - 5, tip.y);
            ctx.lineTo(tip.x + 5, tip.y);
            ctx.lineTo(tip.x + 40, tip.y - 1000); // Fan out
            ctx.lineTo(tip.x - 40, tip.y - 1000);
            ctx.closePath();
            ctx.fill();

            // Core Laser Line
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00FF00';
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(tip.x, tip.y - 1000);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

    } else if (e.kind === 'STATION') {
        ctx.scale(1, 0.5); const pulse = 1 + Math.sin(frame * 0.05) * 0.1;
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#FFFFFF';
        ctx.beginPath(); ctx.arc(0, 0, e.radius * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill();
        ctx.scale(1, 2); const grad = ctx.createLinearGradient(0, 0, 0, -400);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;

        // Draw beam with rounded base
        const w = e.radius / 2;
        const h = 400;
        ctx.beginPath();
        ctx.moveTo(-w, -h);
        ctx.lineTo(w, -h);
        ctx.lineTo(w, 0);
        ctx.ellipse(0, 0, w, w * 0.5, 0, 0, Math.PI); // Rounded base matching perspective
        ctx.lineTo(-w, -h);
        ctx.fill();
    } else if (e.kind === 'CLONE' && player) {
        ctx.restore(); // Undo entity translate to use absolute coords for lightning

        // Draw Electric Tether to Player
        if (Math.random() > 0.1) {
            const dist = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
            if (dist < 2000) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                drawLightningBolt(ctx, player.pos, e.pos, '#00FFFF', 2, 30);
                ctx.restore();
            }
        }

        // Draw Clone Mesh with instability (Flicker + Jitter)
        const jitterX = (Math.random() - 0.5) * 5; // Position jitter
        const jitterY = (Math.random() - 0.5) * 5;
        // Flicker between 60% and 100% opacity
        const flicker = 0.6 + Math.random() * 0.4;
        const frameJitter = frame + (Math.random() * 10); // Slight animation offset
        const vertDistortion = 4.0; // Vertex distortion magnitude

        // Sync visual rotation with player movement
        const yaw = player.rotation;
        const pitch = -player.distanceTraveled * 0.04;

        drawPlayerMesh(ctx, e.pos.x + jitterX, e.pos.y + jitterY, 22, frameJitter, '#00FFFF', '#00FFFF', flicker, vertDistortion, yaw, pitch);

        return; // Early return as we restored context
    } else if (e.kind === 'SYNC_GOAL') {
        ctx.scale(1, 0.5);
        const pulse = 1 + Math.sin(frame * 0.1) * 0.15;
        const color = e.color || '#00FFFF';

        ctx.strokeStyle = e.active ? '#FFFFFF' : color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.arc(0, 0, e.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner spinning ring
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.7, frame * 0.1, frame * 0.1 + Math.PI * 1.5);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = e.active ? color : 'transparent';
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Label
        ctx.scale(1, 2);
        if (e.color === '#00FF00') {
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 10px monospace';
            ctx.fillText("P1", -5, 5);
        } else {
            ctx.fillStyle = '#00FFFF';
            ctx.font = 'bold 10px monospace';
            ctx.fillText("P2", -5, 5);
        }
    } else if (e.kind === 'FILTER_WAVE' && e.filterData) {
        // --- THE GREAT FILTER VISUAL (PARABOLIC ENERGY LATTICE) ---
        // Design: Massive concave energy net scooping the player

        const fd = e.filterData;
        const halfHole = fd.holeWidth / 2;
        const wallHeight = 2500; // Visual Y span (half)
        const curveDepth = 600; // How much the edges lead the center (convex/concave)

        // Rotate to face movement direction (+X is forward)
        ctx.rotate(fd.angle);

        const t = frame * 0.05; // Animation time

        // 1. FORWARD GRAVITATIONAL RIPPLES (Spacetime Distortion)
        // Drawn ahead of the wall (in +X) to show influence and momentum
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const offset = (t * 50 + i * 200) % 1000; // Cycle forward
            const alpha = Math.max(0, 1 - (offset / 1000)) * 0.6;
            const xShift = offset;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 200, 220, ${alpha})`; // Soft pink/white ripple

            // Top Ripple (Parabolic Arc)
            const startY = -wallHeight;
            // INCREASED GAP: End 2.5x away from hole edge to keep gate clear
            const endY = -halfHole * 2.5;
            // X coordinate follows parabola: x = (y/wallHeight)^2 * depth + shift
            const startX = (Math.pow(startY, 2) / Math.pow(wallHeight, 2)) * curveDepth + xShift;
            const endX = (Math.pow(endY, 2) / Math.pow(wallHeight, 2)) * curveDepth + xShift;

            ctx.moveTo(startX, startY);
            // Control point for smooth curve
            ctx.quadraticCurveTo(xShift, (startY + endY) / 2, endX, endY);

            // Bottom Ripple
            const startY2 = halfHole * 2.5;
            const endY2 = wallHeight;
            const startX2 = (Math.pow(startY2, 2) / Math.pow(wallHeight, 2)) * curveDepth + xShift;
            const endX2 = (Math.pow(endY2, 2) / Math.pow(wallHeight, 2)) * curveDepth + xShift;

            ctx.moveTo(startX2, startY2);
            ctx.quadraticCurveTo(xShift, (startY2 + endY2) / 2, endX2, endY2);

            ctx.stroke();
        }

        // 2. THE BARRIER (Parabolic Lattice)
        const drawSide = (yStart: number, yEnd: number, polarity: number) => {
            // polarity: -1 for top section, 1 for bottom section

            // Generate points along the curve
            const steps = 16;
            const points = [];
            for (let i = 0; i <= steps; i++) {
                const ratio = i / steps;
                const y = yStart + (yEnd - yStart) * ratio;
                // Parabola eq: x = (y / wallHeight)^2 * curveDepth
                // This ensures edges (high Y) are further ahead (high X) than center
                const x = Math.pow(y / wallHeight, 2) * curveDepth;
                points.push({ x, y });
            }

            // A. Energy Field (Fill)
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            // Close shape back to deep negative X to create "body" of the wall
            ctx.lineTo(-2000, points[points.length - 1].y);
            ctx.lineTo(-2000, points[0].y);
            ctx.closePath();

            const pulse = 0.4 + Math.sin(t) * 0.15;
            // Gradient fades from bright front to dark back
            const grad = ctx.createLinearGradient(0, 0, -1200, 0);
            grad.addColorStop(0, `rgba(255, 0, 85, ${pulse})`); // Vivid Red Front
            grad.addColorStop(1, `rgba(50, 0, 20, 0)`); // Invisible Tail
            ctx.fillStyle = grad;
            ctx.fill();

            // B. Lattice Lines (Longitudinal - White Glowing)
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF0055';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;

            // Main Leading Edge (Now Jagged/Buzzing)
            ctx.beginPath();
            const jaggedness = 8; // Amplitude of buzz
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                // Jitter perpendicular to curve? Or just random xy? Simple random xy is easier and looks "electric"
                const jx = p.x + (Math.random() - 0.5) * jaggedness;
                const jy = p.y + (Math.random() - 0.5) * jaggedness;
                if (i === 0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
            }
            ctx.stroke();

            // Add a secondary "Ghost" line for extra buzz
            ctx.beginPath();
            ctx.strokeStyle = '#00FFFF'; // Cyan buzz
            ctx.lineWidth = 1;
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const jx = p.x + (Math.random() - 0.5) * (jaggedness * 1.5);
                const jy = p.y + (Math.random() - 0.5) * (jaggedness * 1.5);
                if (i === 0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
            }
            ctx.stroke();

            // Inner Lattice Lines (Pink Echoes)
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#FF69B4'; // Hot Pink
            const innerLayers = 4;
            const layerSpacing = 150;

            for (let l = 1; l <= innerLayers; l++) {
                const xOff = -l * layerSpacing;
                ctx.beginPath();
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    if (i === 0) ctx.moveTo(p.x + xOff, p.y);
                    else ctx.lineTo(p.x + xOff, p.y);
                }
                ctx.stroke();
            }

            // C. Cross-Hatching (Latitudinal - Grid Effect)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 180, 200, 0.4)';
            // Connect points back into the void
            for (let i = 0; i < points.length; i += 2) { // Every other point
                const p = points[i];
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - (innerLayers * layerSpacing + 100), p.y);
            }
            ctx.stroke();

            // D. Edge Anomalies (Distortion at tips)
            // Draw chaotic glitch lines at the far Y edges (the "horns" of the parabola)
            const tipIdx = polarity === -1 ? 0 : points.length - 1;
            const tipP = points[tipIdx];

            ctx.strokeStyle = '#00FFFF'; // Glitch Cyan
            ctx.shadowColor = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const lx = tipP.x + (Math.random() - 0.5) * 150;
                const ly = tipP.y + (Math.random() - 0.5) * 150;
                ctx.moveTo(tipP.x, tipP.y);
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
        };

        // Draw Top (Negative Y)
        // From far edge (-wallHeight) to hole edge (-halfHole)
        drawSide(-wallHeight, -halfHole, -1);

        // Draw Bottom (Positive Y)
        // From hole edge (halfHole) to far edge (wallHeight)
        drawSide(halfHole, wallHeight, 1);

        // 3. Gate Indicators (Brackets)
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 25;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;

        // Calculate X position at hole edge using curve formula
        const holeX = Math.pow(halfHole / wallHeight, 2) * curveDepth;

        // Top Bracket
        ctx.beginPath();
        ctx.moveTo(holeX - 60, -halfHole);
        ctx.lineTo(holeX + 60, -halfHole);
        ctx.stroke();

        // Bottom Bracket
        ctx.beginPath();
        ctx.moveTo(holeX - 60, halfHole);
        ctx.lineTo(holeX + 60, halfHole);
        ctx.stroke();

        ctx.shadowBlur = 0;

    } else if (e.kind === 'EVENT_HORIZON') {
        const t = frame * 0.05;
        let coreScale = e.radius; // Dynamic size from system

        // Safeguard against bad radius values
        if (!Number.isFinite(coreScale) || coreScale < 0) coreScale = 1;

        // 1. Unstable Core (Black Hole)
        // Draw black core with slight wobble
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        const wobble = Math.sin(t * 3) * 2;
        ctx.arc(0, 0, Math.max(0, coreScale + wobble), 0, Math.PI * 2);
        ctx.fill();

        // 2. Event Horizon Rim (Glow)
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF0000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, coreScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Multi-Layer Accretion Disk
        const layers = [
            { color: 'rgba(150, 0, 255, 0.4)', speed: 1.0, size: 2.0 },
            { color: 'rgba(255, 69, 0, 0.5)', speed: 0.7, size: 3.5 },
            { color: 'rgba(255, 140, 0, 0.3)', speed: 0.4, size: 5.0 }
        ];

        layers.forEach((layer, i) => {
            ctx.save();
            // Tilt the disk for 3D effect
            ctx.scale(1, 0.3 + (Math.sin(t * 0.5) * 0.1));
            ctx.rotate(t * layer.speed * (i % 2 === 0 ? 1 : -1));

            const r1 = coreScale;
            // Bloom Effect: If opacity < 1 (buildup), scale r2 from coreScale to full size
            const bloomProgress = e.opacity !== undefined ? e.opacity : 1.0;
            const r2 = coreScale * (1 + (layer.size - 1) * bloomProgress);

            // Check for valid gradient params
            if (Number.isFinite(r1) && r1 >= 0 && Number.isFinite(r2) && r2 >= 0) {
                const grad = ctx.createRadialGradient(0, 0, r1, 0, 0, r2);
                grad.addColorStop(0, layer.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = layer.color; // Fallback
            }

            ctx.beginPath();
            ctx.arc(0, 0, r2, 0, Math.PI * 2);
            ctx.fill();

            // Add debris speckles in disk
            const debrisCount = 12;
            ctx.fillStyle = '#FFFFFF';
            for (let j = 0; j < debrisCount; j++) {
                const angle = (j / debrisCount) * Math.PI * 2;
                const r = coreScale * (1.2 + Math.random() * (layer.size - 1.2));
                ctx.fillRect(Math.cos(angle) * r, Math.sin(angle) * r, 3, 3);
            }

            ctx.restore();
        });

        // 4. Lensing Distortion Ring (White outline)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const distR = coreScale * 1.5 + Math.sin(t * 5) * 5;
        if (Number.isFinite(distR) && distR >= 0) {
            ctx.arc(0, 0, distR, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (e.kind === 'ALLY') {

        // --- TRAPPED ALLY (STASIS POD) ---
        const t = frame * 0.05;
        const allyClass = e.customData?.allyClass || 'ASSAULT';
        let color = '#00AAFF'; // Default Assault
        if (allyClass === 'SNIPER') color = '#00FF88';
        else if (allyClass === 'SUPPORT') color = '#FF8800';

        // 1. Stasis Field (Spinning Rings)
        const pulse = 1 + Math.sin(t * 2) * 0.1;

        ctx.save();
        ctx.scale(1, 0.5); // Perspective

        // Outer Ring
        ctx.beginPath();
        ctx.arc(0, 0, 40 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = frame;
        ctx.stroke();

        // Inner Ring (Counter Rotate)
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.lineDashOffset = -frame;
        ctx.stroke();

        ctx.restore();

        // 2. The Pod/Cage (3D Dodecahedron Field)
        const rotX = t * 0.5;
        const rotY = t * 0.3;
        const rCage = 35;

        // Golden Ratio
        const phi = (1 + Math.sqrt(5)) / 2;

        // Dodecahedron Vertices (20 points)
        // (±1, ±1, ±1)
        // (0, ±1/phi, ±phi)
        // (±1/phi, ±phi, 0)
        // (±phi, 0, ±1/phi)
        const verts = [];
        // Orange vertices (±1, ±1, ±1)
        for (let x of [-1, 1]) for (let y of [-1, 1]) for (let z of [-1, 1]) verts.push({ x, y, z });
        // Green vertices (0, ±1/phi, ±phi)
        for (let y of [-1 / phi, 1 / phi]) for (let z of [-phi, phi]) verts.push({ x: 0, y, z });
        // Blue vertices (±1/phi, ±phi, 0)
        for (let x of [-1 / phi, 1 / phi]) for (let y of [-phi, phi]) verts.push({ x, y, z: 0 });
        // Pink vertices (±phi, 0, ±1/phi)
        for (let x of [-phi, phi]) for (let z of [-1 / phi, 1 / phi]) verts.push({ x, y: 0, z });

        // Scale vertices
        const scaledVerts = verts.map(v => ({ x: v.x * rCage * 0.6, y: v.y * rCage * 0.6, z: v.z * rCage * 0.6 }));

        // Project
        const projVerts = scaledVerts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, frame * 0.01, 300));

        // Connect nearby vertices to form edges (Distance based approach simplifes manual indexing)
        // Edge length in ideal dodecahedron with scale 1 is 2/phi = 1.236...
        // We scaled by rCage * 0.6. 
        // Max distance for connection check:
        const connectDist = (2 / phi) * rCage * 0.6 * 1.1; // 10% tolerance

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        // Naive distance check for wireframe (O(N^2) but N=20 is tiny)
        for (let i = 0; i < scaledVerts.length; i++) {
            for (let j = i + 1; j < scaledVerts.length; j++) {
                const d = Math.sqrt(
                    (scaledVerts[i].x - scaledVerts[j].x) ** 2 +
                    (scaledVerts[i].y - scaledVerts[j].y) ** 2 +
                    (scaledVerts[i].z - scaledVerts[j].z) ** 2
                );
                if (d < connectDist) {
                    ctx.moveTo(projVerts[i].x, projVerts[i].y);
                    ctx.lineTo(projVerts[j].x, projVerts[j].y);
                }
            }
        }
        ctx.stroke();

        // Fill Faces (Transparent)
        // Hard to do strictly correct without depth sort, but a faint fill helps volume
        ctx.fillStyle = hexToRgba(color, 0.1);
        // Draw a hull or simple shape to simulate fill
        ctx.beginPath();
        ctx.arc(0, 0, rCage * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;



    } else if (e.kind === 'SOLAR_SHIELD') {
        const solarData = (missionProgress as any)?.customData?.solarData || (missionProgress as any)?.solarData; // Fallback for safety
        const state = solarData?.state || 'CALM';
        const sunAngle = solarData?.sunAngle || 0;

        // --- 2. BLACK SHINY OBELISK ---
        // Shape: Tapered square monolith.
        const height = 240; // Taller to be more imposing
        const sides = 4; // Square base for Obelisk look

        const baseRadius = e.radius; // Base width
        const topRadius = e.radius * 0.35; // More tapered

        const rotationOffset = Math.PI / 4; // Align flat face to viewer

        const pointsBottom: { x: number, y: number }[] = [];
        const pointsTop: { x: number, y: number }[] = [];

        for (let i = 0; i < sides; i++) {
            const th = (i / sides) * Math.PI * 2 + rotationOffset;
            pointsBottom.push({
                x: Math.cos(th) * baseRadius,
                y: Math.sin(th) * baseRadius
            });
            pointsTop.push({
                x: Math.cos(th) * topRadius,
                y: Math.sin(th) * topRadius - height
            });
        }

        ctx.save();

        // --- 1. SHADOW / SAFETY ZONE (Holographic Floor) ---
        // Draw this BEFORE the 3D object so it looks like it's on the floor
        if (state === 'WARNING' || state === 'STORM') {
            const shadowLen = 800;
            const shadowDirX = -Math.cos(sunAngle);
            const shadowDirY = -Math.sin(sunAngle);

            // Construct Convex Hull of Shadow (Base + Projected Base)
            const shadowPoints: { x: number, y: number }[] = [
                ...pointsBottom,
                ...pointsBottom.map(p => ({ x: p.x + shadowDirX * shadowLen, y: p.y + shadowDirY * shadowLen }))
            ];

            // Monotone Chain Convex Hull Algorithm for 8 points
            shadowPoints.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

            const lower: { x: number, y: number }[] = [];
            for (let i = 0; i < shadowPoints.length; i++) {
                while (lower.length >= 2) {
                    const p1 = lower[lower.length - 2];
                    const p2 = lower[lower.length - 1];
                    const p3 = shadowPoints[i];
                    if ((p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) <= 0) {
                        lower.pop();
                    } else {
                        break;
                    }
                }
                lower.push(shadowPoints[i]);
            }

            const upper: { x: number, y: number }[] = [];
            for (let i = shadowPoints.length - 1; i >= 0; i--) {
                while (upper.length >= 2) {
                    const p1 = upper[upper.length - 2];
                    const p2 = upper[upper.length - 1];
                    const p3 = shadowPoints[i];
                    if ((p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) <= 0) {
                        upper.pop();
                    } else {
                        break;
                    }
                }
                upper.push(shadowPoints[i]);
            }

            upper.pop();
            lower.pop();
            const hull = lower.concat(upper);

            ctx.beginPath();
            hull.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();

            // Gradient
            const grad = ctx.createLinearGradient(0, 0, shadowDirX * shadowLen, shadowDirY * shadowLen);

            if (state === 'STORM') {
                grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
                ctx.fillStyle = grad;
                ctx.fill();
            } else {
                grad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        }



        // --- 2. BLACK SHINY OBELISK ---
        // Draw Sides - Manual Depth Sort for Convex Shape
        // Define faces
        type Face = { index: number, z: number, p: any[] };
        const faces: Face[] = [];

        for (let i = 0; i < sides; i++) {
            const p1 = pointsBottom[i];
            const p2 = pointsBottom[(i + 1) % sides];
            // Average Y acts as depth
            const avgY = (p1.y + p2.y) / 2;
            faces.push({ index: i, z: avgY, p: [p1, p2, pointsTop[(i + 1) % sides], pointsTop[i]] });
        }

        // Sort: Furthest (Lowest Y? No, Highest Y is Closer in standard grid) 
        // We look from "South" (Bottom). So "North" (Top/Negative Y) is further away.
        // We want to draw the back faces first. 
        // Back faces have lower Y values (more negative).
        faces.sort((a, b) => a.z - b.z); // Draw Smallest Y (Furthest) first

        faces.forEach(f => {
            const [p1, p2, p3, p4] = f.p;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();

            // Gradient for "Shiny" look
            const grad = ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
            grad.addColorStop(0, '#050505');
            grad.addColorStop(0.4, '#151515');
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.fill();

            // Edges
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Highlights - Only on faces 1 and 2 (Front facing in this rotation)
            if (f.index === 1 || f.index === 2) {
                // Shiny Reflection
                ctx.save();
                ctx.clip();

                // Reflection Streak
                const refGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                refGrad.addColorStop(0, 'rgba(255,255,255,0)');
                refGrad.addColorStop(0.5, 'rgba(200,230,255,0.15)');
                refGrad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = refGrad;
                ctx.fillRect(-100, -300, 200, 300);
                ctx.restore();
            }
        });




        ctx.restore();
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
};
