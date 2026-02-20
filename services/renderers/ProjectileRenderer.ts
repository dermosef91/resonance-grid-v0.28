
import { Projectile, Player } from '../../types';
import { COLORS } from '../../constants';
import { project3D, hexToRgba, projectSimple, parseColorToRgb } from '../renderUtils';

const getQuadBezierPoint = (t: number, p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    const invT = 1 - t;
    const invT2 = invT * invT;
    const t2 = t * t;
    return {
        x: invT2 * p0.x + 2 * invT * t * p1.x + t2 * p2.x,
        y: invT2 * p0.y + 2 * invT * t * p1.y + t2 * p2.y
    };
};

export const drawProjectiles = (
    ctx: CanvasRenderingContext2D,
    projectiles: Projectile[],
    player: Player,
    frame: number,
    viewBounds: { left: number, right: number, top: number, bottom: number }
) => {
    const viewLeft = viewBounds.left;
    const viewRight = viewBounds.right;
    const viewTop = viewBounds.top;
    const viewBottom = viewBounds.bottom;

    // --- VOID WAKE TRAIL RENDERING (SPARKLING ELECTRIC PURPLE/PINK) ---
    const wakeNodes = projectiles.filter(p => p.voidWakeData);
    if (wakeNodes.length > 1) {
        wakeNodes.sort((a, b) => (a.voidWakeData!.index - b.voidWakeData!.index));

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'screen';

        const drawElectricSegment = (pStart: { x: number, y: number }, pEnd: { x: number, y: number }, pControl: { x: number, y: number } | null, alpha: number) => {
            if (alpha <= 0.05) return;
            const coreColor = `rgba(255, 0, 255, ${alpha})`;
            const glowColor = `rgba(208, 0, 255, ${alpha})`;

            const dist = Math.sqrt((pEnd.x - pStart.x) ** 2 + (pEnd.y - pStart.y) ** 2);
            const steps = Math.max(2, Math.ceil(dist / 10));

            ctx.beginPath();
            ctx.moveTo(pStart.x, pStart.y);

            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                let pt;
                if (pControl) pt = getQuadBezierPoint(t, pStart, pControl, pEnd);
                else pt = { x: pStart.x + (pEnd.x - pStart.x) * t, y: pStart.y + (pEnd.y - pStart.y) * t };

                let jx = pt.x; let jy = pt.y;
                if (i < steps) {
                    const jitterAmount = 4;
                    jx += (Math.random() - 0.5) * jitterAmount;
                    jy += (Math.random() - 0.5) * jitterAmount;
                }
                ctx.lineTo(jx, jy);
            }

            ctx.shadowBlur = 10 * alpha; ctx.shadowColor = glowColor; ctx.strokeStyle = coreColor; ctx.lineWidth = 1.5 * alpha; ctx.stroke(); ctx.shadowBlur = 0;
        };

        for (let i = 0; i < wakeNodes.length; i++) {
            const pCurr = wakeNodes[i];
            const duration = pCurr.duration;
            const alpha = Math.min(1, duration / 90);

            if (pCurr.pos.x < viewLeft - 100 || pCurr.pos.x > viewRight + 100 ||
                pCurr.pos.y < viewTop - 100 || pCurr.pos.y > viewBottom + 100) continue;

            let start: { x: number, y: number }, end: { x: number, y: number }, control: { x: number, y: number } | null = null;

            if (i === 0) {
                if (wakeNodes.length < 2) continue;
                const pNext = wakeNodes[i + 1];
                start = pCurr.pos;
                end = { x: (pCurr.pos.x + pNext.pos.x) / 2, y: (pCurr.pos.y + pNext.pos.y) / 2 };
            } else if (i === wakeNodes.length - 1) {
                const pPrev = wakeNodes[i - 1];
                start = { x: (pPrev.pos.x + pCurr.pos.x) / 2, y: (pPrev.pos.y + pCurr.pos.y) / 2 };
                end = pCurr.pos;
            } else {
                const pPrev = wakeNodes[i - 1];
                const pNext = wakeNodes[i + 1];
                start = { x: (pPrev.pos.x + pCurr.pos.x) / 2, y: (pPrev.pos.y + pCurr.pos.y) / 2 };
                end = { x: (pCurr.pos.x + pNext.pos.x) / 2, y: (pCurr.pos.y + pNext.pos.y) / 2 };
                control = pCurr.pos;
            }
            drawElectricSegment(start, end, control, alpha);
        }
        ctx.restore();
    }

    const nanites = projectiles.filter(p => p.sourceWeaponId === 'nanite_swarm' && !p.markedForDeletion);
    if (nanites.length > 1) {
        ctx.save();
        ctx.lineWidth = 1; const maxDist = 80; const maxDistSq = maxDist * maxDist;
        for (let i = 0; i < nanites.length; i++) {
            const p1 = nanites[i];
            if (p1.pos.x < viewLeft - maxDist || p1.pos.x > viewRight + maxDist || p1.pos.y < viewTop - maxDist || p1.pos.y > viewBottom + maxDist) continue;
            for (let j = i + 1; j < nanites.length; j++) {
                const p2 = nanites[j];
                const dx = p1.pos.x - p2.pos.x; const dy = p1.pos.y - p2.pos.y;
                if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;
                const distSq = dx * dx + dy * dy;
                if (distSq < maxDistSq) {
                    const dist = Math.sqrt(distSq); const alpha = (1 - (dist / maxDist)) * 0.4;
                    ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
                    ctx.beginPath(); ctx.moveTo(p1.pos.x, p1.pos.y); ctx.lineTo(p2.pos.x, p2.pos.y); ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    // Draw Projectiles
    projectiles.forEach(p => {
        if (p.voidWakeData) return;
        if (p.sourceWeaponId === 'abyssal_loop_collapse') return;

        if (p.pos.x + p.radius < viewLeft || p.pos.x - p.radius > viewRight || p.pos.y + p.radius < viewTop || p.pos.y - p.radius > viewBottom) return;

        // --- FRACTAL BLOOM RENDERER ---
        if (p.fractalData) {
            // ... (Fractal bloom rendering code kept as is, collapsed for brevity in this response but presumed present)
            const fd = p.fractalData;
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            const t = frame * 0.01;
            const maxDur = p.customData?.maxDuration || 180;
            const age = maxDur - p.duration;
            const idHash = p.id.charCodeAt(p.id.length - 1) % 100;
            const startAngle = idHash * 0.1;
            const rotation = startAngle + (age * (fd.rotationSpeed || 0.05) * 0.2);
            ctx.rotate(rotation);
            const maxDepth = 7;
            const branches = fd.branches || 3;
            const size = p.radius * 1.5;
            const animDur = Math.min(45, maxDur / 2.2);
            let unfoldT = 1;
            if (age < animDur) {
                const rawT = Math.max(0, Math.min(1, age / animDur));
                unfoldT = 1 - Math.pow(1 - rawT, 3);
            } else if (p.duration < animDur) {
                const rawT = Math.max(0, Math.min(1, p.duration / animDur));
                unfoldT = Math.pow(rawT, 3);
            }
            let alpha = Math.min(1, p.duration / 10);
            if (p.customData?.opacityMultiplier !== undefined) {
                alpha *= p.customData.opacityMultiplier;
            }
            if (alpha < 0.01) {
                ctx.restore();
                return;
            }
            ctx.globalCompositeOperation = 'screen';
            const drawFractalNode = (x: number, y: number, r: number, a: number, depth: number) => {
                if (depth === 0) return;
                const ratio = depth / maxDepth;
                let hue, sat = 85, lit = 60;
                if (ratio > 0.6) { hue = 190 + (1 - ratio) * 100; lit = 70; }
                else if (ratio > 0.3) { hue = 280 + (0.6 - ratio) * 100; lit = 60; }
                else { hue = 40 + ratio * 60; lit = 50; }
                const pulse = 1.0 + Math.sin(t * 10 + depth) * 0.1;
                const blobR = r * 0.6 * pulse;
                if (blobR < 0.5) return;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, blobR * 2.0);
                grad.addColorStop(0, `hsla(${hue}, 100%, 95%, ${alpha})`);
                grad.addColorStop(0.2, `hsla(${hue}, 90%, 70%, ${alpha * 0.8})`);
                grad.addColorStop(0.6, `hsla(${hue}, 80%, 50%, ${alpha * 0.2})`);
                grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, blobR * 2.0, 0, Math.PI * 2);
                ctx.fill();
                if (depth > 2 && Math.random() < 0.2) {
                    const dustAngle = Math.random() * Math.PI * 2;
                    const dustDist = blobR * (1.2 + Math.random());
                    const dx = x + Math.cos(dustAngle) * dustDist;
                    const dy = y + Math.sin(dustAngle) * dustDist;
                    ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(dx, dy, Math.max(1, blobR * 0.2), 0, Math.PI * 2);
                    ctx.fill();
                }
                const s1 = r * 0.85;
                const a1 = a + (Math.PI / 8) + Math.sin(t) * 0.05;
                const d1 = r * 1.1 * unfoldT;
                const x1 = x + Math.cos(a1) * d1;
                const y1 = y + Math.sin(a1) * d1;
                drawFractalNode(x1, y1, s1, a1, depth - 1);
                const s2 = r * 0.5;
                const a2 = a - (Math.PI * 0.6) + Math.cos(t * 0.7) * 0.1;
                const d2 = r * 1.0 * unfoldT;
                const x2 = x + Math.cos(a2) * d2;
                const y2 = y + Math.sin(a2) * d2;
                drawFractalNode(x2, y2, s2, a2, depth - 1);
            };
            const voidR = size * 0.2;
            for (let i = 0; i < branches; i++) {
                const angle = (i / branches) * Math.PI * 2;
                const sx = Math.cos(angle) * (voidR * unfoldT);
                const sy = Math.sin(angle) * (voidR * unfoldT);
                const startSize = (size * 0.25) * (0.5 + 0.5 * unfoldT);
                drawFractalNode(sx, sy, startSize, angle, maxDepth);
            }
            const corePulse = 1.0 + Math.sin(t * 20) * 0.1;
            const coreRad = voidR * 1.2 * corePulse * unfoldT;
            const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            coreGrad.addColorStop(0.3, `rgba(200, 255, 255, ${alpha * 0.8})`);
            coreGrad.addColorStop(0.6, `rgba(0, 255, 255, ${alpha * 0.3})`);
            coreGrad.addColorStop(1, `rgba(0, 255, 255, 0)`);
            ctx.fillStyle = coreGrad;
            ctx.beginPath(); ctx.arc(0, 0, coreRad, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            return;
        }

        // --- KALEIDOSCOPE GAZE ---
        if (p.kaleidoscopeData) {
            const kd = p.kaleidoscopeData;
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            const angle = Math.atan2(p.velocity.y, p.velocity.x);
            ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, 0);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = kd.generation === 0 ? 3 : 1.5;
            ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(0, 0, kd.generation === 0 ? 3 : 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // --- PARADOX PENDULUM ---
        if (p.paradoxData) {
            // ... (Paradox Pendulum rendering kept as is)
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);
            const isRewind = p.paradoxData.state === 'REWIND';
            const color = isRewind ? '#FFFFFF' : p.color;
            const alpha = isRewind ? 0.6 : 1.0;
            ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 3; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0);
            const dx = p.pos.x - player.pos.x; const dy = p.pos.y - player.pos.y;
            ctx.lineTo(dx, dy); ctx.stroke();
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(dx, dy, p.radius, 0, Math.PI * 2); ctx.fill();
            const currentAngle = Math.atan2(dy, dx);
            const swingDir = p.paradoxData.swingDir || 1;
            const isClockwiseMovement = (p.paradoxData.state === 'FORWARD' && swingDir === 1) || (p.paradoxData.state === 'REWIND' && swingDir === -1);
            const currentDist = Math.sqrt(dx * dx + dy * dy);
            ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
            ctx.beginPath();
            const trailLen = 0.5;
            const startA = currentAngle;
            const endA = currentAngle + (isClockwiseMovement ? -trailLen : trailLen);
            ctx.arc(0, 0, currentDist, startA, endA, isClockwiseMovement); ctx.stroke();
            ctx.restore();
            return;
        }

        if (p.anchorData) {
            // ... (Anchor rendering kept as is)
            ctx.save(); ctx.translate(p.pos.x, p.pos.y); const t = frame * 0.05;
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            const rings = 2;
            for (let i = 0; i < rings; i++) {
                ctx.rotate(t * (i % 2 === 0 ? 1 : -1));
                const grad = ctx.createLinearGradient(-50, 0, 50, 0);
                grad.addColorStop(0, 'rgba(100, 0, 200, 0)'); grad.addColorStop(0.5, 'rgba(180, 0, 255, 0.5)'); grad.addColorStop(1, 'rgba(100, 0, 200, 0)');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, p.radius * (2 + i * 0.5), p.radius * (0.5 + i * 0.2), i * 0.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = '#FFFFFF'; ctx.shadowColor = '#AA00FF'; ctx.shadowBlur = 10; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        if (p.sourceWeaponId === 'drum_echo') {
            // "THE BASS DRIVER" - 3D Pulsing Speaker
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);

            // 3D Setup
            // Make them slowly tumble or face a direction
            const rotSpeed = 0.02;
            const idHash = p.id.charCodeAt(0);
            const rotX = frame * rotSpeed + idHash;
            const rotY = frame * rotSpeed * 0.8 + idHash; // Tumble

            // Pulse logic
            const pulse = 1.0 + Math.max(0, Math.sin(frame * 0.2)) * 0.2;
            const radius = p.radius * 1.2;

            // Geometry: Two circles (Front Rim, Back Plate) + Cone center
            const frontZ = 10;
            const backZ = -10;

            // 1. Draw Housing (Cylinder-ish connection between front and back)
            // We'll draw lines connecting the rims
            const segments = 8;
            const housingColor = hexToRgba(p.color, 0.3);
            const rimColor = p.color;

            const getCirclePoints = (r: number, z: number, pulseScale: number = 1) => {
                const pts = [];
                for (let i = 0; i < segments; i++) {
                    const theta = (i / segments) * Math.PI * 2;
                    pts.push({
                        x: Math.cos(theta) * r * pulseScale,
                        y: Math.sin(theta) * r * pulseScale,
                        z: z
                    });
                }
                return pts;
            };

            const frontPts = getCirclePoints(radius, frontZ);
            const backPts = getCirclePoints(radius * 0.8, backZ);
            const conePts = getCirclePoints(radius * 0.3, backZ + 5, pulse); // The pulsing center

            const projFront = frontPts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));
            const projBack = backPts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));
            const projCone = conePts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));

            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            // Draw Wireframe Housing
            ctx.strokeStyle = housingColor;
            ctx.lineWidth = 1;

            // Connect Front to Back
            for (let i = 0; i < segments; i++) {
                ctx.beginPath();
                ctx.moveTo(projFront[i].x, projFront[i].y);
                ctx.lineTo(projBack[i].x, projBack[i].y);
                ctx.stroke();
            }

            // Draw Back Rim
            ctx.beginPath();
            projBack.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Draw Cone (Front Rim -> Center)
            // Fill this one to make it look solid
            ctx.fillStyle = hexToRgba(p.color, 0.1);
            ctx.strokeStyle = rimColor;
            ctx.lineWidth = 2;

            ctx.beginPath();
            projFront.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw "Speaker" Cone lines (Front Rim -> Small pulsing center)
            ctx.strokeStyle = hexToRgba(p.color, 0.6);
            ctx.lineWidth = 1.5;
            for (let i = 0; i < segments; i++) {
                ctx.beginPath();
                ctx.moveTo(projFront[i].x, projFront[i].y);
                ctx.lineTo(projCone[i].x, projCone[i].y);
                ctx.stroke();
            }

            // Draw Dust Cap (The glowing center)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            projCone.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.fill();

            // Sound Wave Ring (2D effect around the 3D object for clarity)
            if (frame % 45 < 20) {
                const waveExp = (frame % 45) / 20;
                // Project a simple circle ring
                const wavePts = getCirclePoints(radius * (1.2 + waveExp), 0);
                const projWave = wavePts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));

                ctx.beginPath();
                projWave.forEach((pt, i) => {
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                });
                ctx.closePath();
                ctx.strokeStyle = hexToRgba(p.color, 1 - waveExp);
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        } else if (p.sourceWeaponId === 'spirit_lance' || p.sourceWeaponId === 'ally_sniper' || p.sourceWeaponId === 'ally_assault') {
            // REDESIGNED SPIRIT LANCE: 3D BOLT
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            const angle = Math.atan2(p.velocity.y, p.velocity.x);
            ctx.rotate(angle);

            if (p.customData?.augment === 'PHASE_DRILL') {
                const t = frame * 0.8; const len = p.radius * 1.75; const width = p.radius * 1.8;
                const grad = ctx.createLinearGradient(-len, 0, len, 0); grad.addColorStop(0, '#440088'); grad.addColorStop(0.5, '#8800FF'); grad.addColorStop(1, '#EEBBFF');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-len * 0.6, -width / 2); ctx.lineTo(len, 0); ctx.lineTo(-len * 0.6, width / 2); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
                const threads = 2;
                for (let i = 0; i < threads; i++) {
                    const offset = i * Math.PI; let first = true;
                    for (let x = -len * 0.6; x <= len; x += 2) {
                        const n = (x + len * 0.6) / (len * 1.6); const r = (1 - n) * (width / 2); const phase = (x * 0.15) - t + offset; const y = Math.sin(phase) * r;
                        if (Math.cos(phase) > 0) { if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); } else { first = true; }
                    }
                }
                ctx.stroke();
                ctx.fillStyle = '#AA00FF'; ctx.shadowColor = '#AA00FF'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.ellipse(-len * 0.6, 0, width / 3, width / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            } else {
                // Base Spirit Lance: Energy Shard
                const length = p.radius * 3.0;
                const width = p.radius * 0.8;

                // Core
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(length / 2, 0);
                ctx.lineTo(-length / 2, -width / 2);
                ctx.lineTo(-length / 2 + width, 0);
                ctx.lineTo(-length / 2, width / 2);
                ctx.closePath();
                ctx.fill();

                // Trailing particles/line
                ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-length, 0);
                ctx.lineTo(length / 2, 0);
                ctx.stroke();
            }
            ctx.restore();
        } else if (p.sourceWeaponId === 'drum_laser') {
            ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x));
            ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 10; ctx.shadowColor = '#FFD700'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
        } else if (p.sourceWeaponId === 'nanite_swarm') {
            ctx.save(); ctx.translate(p.pos.x, p.pos.y);
            const idNum = p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1);
            const glitchTrigger = Math.sin(frame * 0.8 + idNum) > 0.95;
            let scale = p.radius * 0.8; let color = p.color;
            if (glitchTrigger) { scale *= 1.5; color = '#FFFFFF'; ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4); }
            const rotSpeed = 0.1; const rotX = frame * rotSpeed + idNum; const rotY = frame * rotSpeed * 0.7 + idNum;
            const h = scale * 1.5; const r = scale;
            const verts = [{ x: 0, y: -h, z: 0 }, { x: r, y: h * 0.5, z: r * 0.8 }, { x: -r, y: h * 0.5, z: r * 0.8 }, { x: 0, y: h * 0.5, z: -r }];
            const projected = verts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));
            ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[1].x, projected[1].y); ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[2].x, projected[2].y);
            ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[3].x, projected[3].y); ctx.moveTo(projected[1].x, projected[1].y); ctx.lineTo(projected[2].x, projected[2].y);
            ctx.lineTo(projected[3].x, projected[3].y); ctx.lineTo(projected[1].x, projected[1].y); ctx.stroke();
            ctx.fillStyle = glitchTrigger ? 'rgba(255, 255, 255, 0.8)' : hexToRgba(color, 0.3); ctx.fill(); ctx.restore();
        } else if (p.beamData) {
            // ... (Beam logic kept as is)
            ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.beamData.angle);
            if (p.id.startsWith('utatu_link')) {
                const len = p.beamData.length;
                ctx.shadowBlur = 8; ctx.shadowColor = '#bf00ff'; ctx.strokeStyle = '#9900FF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0);
                const segs = Math.max(2, Math.floor(len / 15));
                for (let i = 1; i < segs; i++) { const x = (i / segs) * len; const y = (Math.random() - 0.5) * 8; ctx.lineTo(x, y); }
                ctx.lineTo(len, 0); ctx.stroke();
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            } else if (p.id.includes('shango_beam')) {
                const len = p.beamData.length; const segLen = 20; const segs = Math.ceil(len / segLen);
                ctx.shadowBlur = 15; ctx.shadowColor = '#FF8800'; ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= segs; i++) { const x = i * segLen; const y = (Math.random() - 0.5) * 15; ctx.lineTo(x, y); } ctx.stroke();
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= segs; i++) { const x = i * segLen; const y = (Math.random() - 0.5) * 8; ctx.lineTo(x, y); } ctx.stroke();
            } else if (p.id.startsWith('lotus')) {
                ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#ff0055';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.beamData.length, 0); ctx.stroke();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.beamData.length, 0); ctx.stroke(); ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = p.color; ctx.fillRect(0, -p.beamData.width / 2, p.beamData.length, p.beamData.width);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -p.beamData.width / 4, p.beamData.length, p.beamData.width / 2);
                const endX = p.beamData.length;
                if (Math.random() > 0.5) { for (let i = 0; i < 2; i++) { const sX = Math.random() * endX; const sY = (Math.random() - 0.5) * p.beamData.width; ctx.fillStyle = '#ffffff'; ctx.fillRect(sX, sY, 2, 2); } }
            }
            ctx.restore();
        } else if (p.isEnemy) {
            // STANDARD ENEMY PROJECTILE (Tetrahedron)
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);

            const rotSpeed = 0.15;
            const idNum = p.id.charCodeAt(0);
            const rotX = frame * rotSpeed + idNum;
            const rotY = frame * rotSpeed * 0.5 + idNum;

            const scale = p.radius;
            const h = scale * 1.5;
            const r = scale;

            const verts = [
                { x: 0, y: -h, z: 0 },
                { x: r, y: h * 0.5, z: r * 0.8 },
                { x: -r, y: h * 0.5, z: r * 0.8 },
                { x: 0, y: h * 0.5, z: -r }
            ];

            const projected = verts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, 0, 200));

            // Use projectile color for varied enemy projectiles
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[1].x, projected[1].y);
            ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[2].x, projected[2].y);
            ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[3].x, projected[3].y);
            ctx.moveTo(projected[1].x, projected[1].y); ctx.lineTo(projected[2].x, projected[2].y);
            ctx.lineTo(projected[3].x, projected[3].y); ctx.lineTo(projected[1].x, projected[1].y);
            ctx.stroke();

            const rgb = parseColorToRgb(p.color);
            if (rgb) ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
            else ctx.fillStyle = p.color;
            ctx.fill();

            ctx.restore();
        } else if (p.sourceWeaponId === 'cyber_kora') {
            const isBarrier = p.customData?.augment === 'ACOUSTIC_BARRIER';
            const isShredder = p.customData?.augment === 'DISSONANCE_SHREDDER';

            if (isBarrier && p.customData.isBarrier) {
                // STATIC BARRIER: Neon Equalizer Pillars
                ctx.save(); ctx.translate(p.pos.x, p.pos.y);
                const barCount = 3;
                const w = p.radius * 1.5;
                const baseH = p.radius * 3;
                ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 15; ctx.fillStyle = '#00FFFF';
                for (let i = 0; i < barCount; i++) {
                    const offset = (i - 1) * (w * 0.8);
                    const h = baseH * (0.5 + Math.abs(Math.sin(frame * 0.2 + i + p.id.charCodeAt(0))));
                    ctx.fillRect(offset - w / 4, -h, w / 2, h * 2);
                }
                ctx.restore();
            } else {
                // MOVING WAVE
                ctx.save(); ctx.translate(p.pos.x, p.pos.y);
                const angle = Math.atan2(p.velocity.y, p.velocity.x);
                ctx.rotate(angle);

                if (isShredder) {
                    // DISSONANCE SHREDDER: Red Glitchy Wave
                    ctx.strokeStyle = '#FF0033'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 10; ctx.lineWidth = 3;
                    ctx.beginPath();
                    const segments = 6; const len = p.radius * 2;
                    ctx.moveTo(0, -len);
                    for (let i = 0; i <= segments; i++) {
                        const y = -len + (i / segments) * len * 2;
                        const x = (i % 2 === 0 ? 5 : -5) + (Math.random() - 0.5) * 10;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    if (Math.random() < 0.3) {
                        ctx.fillStyle = '#FFFFFF'; ctx.fillRect((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 10, 2);
                    }
                } else {
                    // STANDARD / BARRIER TRAVEL: Smooth Wave
                    const size = p.radius * 3.0;
                    const alpha = 1.0;
                    ctx.beginPath(); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
                    ctx.moveTo(-5, -size * 0.5); ctx.quadraticCurveTo(10, 0, -5, size * 0.5); ctx.stroke();
                }
                ctx.restore();
            }
        } else if (p.sourceWeaponId === 'ancestral_resonance' || p.sourceWeaponId === 'void_aura' || p.sourceWeaponId === 'bass_drop_shockwave' || p.sourceWeaponId === 'bass_mine_explosion' || p.sourceWeaponId === 'boss_death_ring' || p.sourceWeaponId === 'boss_death_core' || p.sourceWeaponId === 'logic_bomb_explosion') {
            const isVoidAura = p.sourceWeaponId === 'void_aura';
            const isBassDrop = p.sourceWeaponId === 'bass_drop_shockwave';

            if (isVoidAura || isBassDrop) {
                ctx.save(); ctx.translate(p.pos.x, p.pos.y);
                const alpha = Math.min(1, p.duration / 15);
                const rgb = parseColorToRgb(p.color) || (isBassDrop ? { r: 255, g: 68, b: 0 } : { r: 153, g: 0, b: 255 });
                ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.lineWidth = 4;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`; ctx.shadowColor = p.color; ctx.shadowBlur = 20; ctx.stroke();
                ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.2})`; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2); ctx.lineWidth = 2;
                ctx.strokeStyle = `rgba(${Math.min(255, rgb.r + 60)}, ${Math.min(255, rgb.g + 60)}, ${Math.min(255, rgb.b + 60)}, ${alpha * 0.8})`; ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.strokeStyle = p.color; ctx.lineWidth = p.sourceWeaponId === 'bass_mine_explosion' ? 4 : (p.sourceWeaponId?.includes('boss') || p.sourceWeaponId === 'logic_bomb_explosion' ? 8 : 3);
                const segs = (p.sourceWeaponId === 'bass_mine_explosion' || p.sourceWeaponId?.includes('boss') || p.sourceWeaponId === 'logic_bomb_explosion') ? 32 : 8;
                const numRings = p.sourceWeaponId === 'bass_mine_explosion' ? 1 : 3;
                if (p.sourceWeaponId === 'boss_death_core' || p.sourceWeaponId === 'logic_bomb_explosion') {
                    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = p.duration / (p.sourceWeaponId === 'logic_bomb_explosion' ? 15 : 50);
                    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
                } else {
                    for (let ring = 0; ring < numRings; ring++) {
                        const r = p.radius - (ring * (p.sourceWeaponId?.includes('boss') ? 50 : 30)); if (r < 0) continue;
                        ctx.beginPath(); for (let i = 0; i <= segs; i++) { const a = (i / segs) * Math.PI * 2; const x = p.pos.x + Math.cos(a) * r, y = p.pos.y + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
                    }
                }
                ctx.restore();
            }
        } else if (p.boomerangData) {
            ctx.save(); ctx.translate(p.pos.x, p.pos.y); const spin = frame * 0.5; ctx.rotate(spin); ctx.strokeStyle = p.color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-p.radius, 0); ctx.lineTo(p.radius, 0); ctx.moveTo(0, -p.radius); ctx.lineTo(0, p.radius); ctx.stroke(); ctx.restore();
        } else if (p.skyFallData) {
            if (p.skyFallData.isPool) {
                ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.fillStyle = p.color; ctx.globalAlpha = 0.4 + Math.sin(frame * 0.2) * 0.1;
                ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const nx = (Math.random() - 0.5) * p.radius; const ny = (Math.random() - 0.5) * p.radius; ctx.fillRect(nx, ny, 2, 2); } ctx.globalAlpha = 1.0; ctx.restore();
            } else if (!p.skyFallData.hasHit) {
                ctx.save(); ctx.strokeStyle = p.color; ctx.lineWidth = p.radius; ctx.globalAlpha = 0.8; const tailLen = 100;
                ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y); ctx.lineTo(p.pos.x, p.pos.y - tailLen); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.fillRect(p.pos.x - p.radius / 2, p.pos.y, p.radius, 10); ctx.restore();
            }
        } else if (p.type === 'CHAIN' as any) {
            ctx.save();
            ctx.strokeStyle = p.color; ctx.lineWidth = 2; const tailLen = 30; const angle = Math.atan2(p.velocity.y, p.velocity.x);
            const startX = p.pos.x - Math.cos(angle) * tailLen; const startY = p.pos.y - Math.sin(angle) * tailLen;
            ctx.beginPath(); ctx.moveTo(startX, startY); const midX = (startX + p.pos.x) / 2 + (Math.random() - 0.5) * 10; const midY = (startY + p.pos.y) / 2 + (Math.random() - 0.5) * 10;
            ctx.lineTo(midX, midY); ctx.lineTo(p.pos.x, p.pos.y); ctx.stroke();
            ctx.restore();
        } else if (p.mineData?.isMine) {
            const size = p.radius; const pulse = 1 + Math.sin(frame * 0.2) * 0.1;
            ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.scale(pulse, pulse);
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.fillRect(-size, -size, size * 2, size * 2); ctx.strokeRect(-size, -size, size * 2, size * 2);
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(0, 0, size * 0.4 * pulse, 0, Math.PI * 2); ctx.fill();
            if (p.mineData.pullRadius > 0) { ctx.strokeStyle = 'rgba(255, 102, 0, 0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.mineData.pullRadius, 0, Math.PI * 2); ctx.stroke(); }
            ctx.restore();
        } else {
            ctx.save();
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    });
};
