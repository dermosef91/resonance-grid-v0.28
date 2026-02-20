
import { Player, MissionType } from '../../types';
import { COLORS } from '../../constants';
import { project3D, parseColorToRgb } from '../renderUtils';

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

    const t = frame * 0.05;
    const rollingPitch = -player.distanceTraveled * 0.04;
    const yaw = player.rotation;
    const pitch = rollingPitch;
    const roll = Math.cos(t * 0.5) * 0.1;
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

    const drawVoidOrb = (drawBack: boolean) => {
        const w = player.weapons.find(w => w.id === 'void_aura');
        if (!w) return;
        const level = w.level;
        const radius = (60 + (level * 10)) * player.stats.areaMult;
        const time = frame * 0.02;
        const rings = 3 + Math.floor(level / 5);
        ctx.lineWidth = 2;

        // Determine Aura Color based on Augment
        let r = 153, g = 0, b = 255; // Default Purple #9900FF
        if (w.augment === 'SUPERNOVA') { r = 255; g = 0; b = 255; } // Magenta
        else if (w.augment === 'ENTROPY_FIELD') { r = 0; g = 0; b = 255; } // Blue

        const backStroke = `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.4)`;
        const frontStroke = `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 50)}, ${Math.min(255, b)}, 0.8)`;
        const shadowCol = `rgb(${r}, ${g}, ${b})`;

        for (let ri = 0; ri < rings; ri++) {
            const ringOffset = (ri / rings) * Math.PI;
            const rotX = time * (ri % 2 === 0 ? 1 : -1) + ringOffset;
            const rotY = time * (ri % 2 === 0 ? 0.5 : -0.5);
            const rotZ = time * 0.2;
            const segments = 32;
            ctx.beginPath();
            let first = true;
            let hasPoints = false;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const lx = Math.cos(theta) * radius; const ly = Math.sin(theta) * radius; const lz = 0;
                let x1 = lx * Math.cos(rotZ) - ly * Math.sin(rotZ); let y1 = lx * Math.sin(rotZ) + ly * Math.cos(rotZ); let z1 = lz;
                let x2 = x1 * Math.cos(rotY) - z1 * Math.sin(rotY); let z2 = x1 * Math.sin(rotY) + z1 * Math.cos(rotY); let y2 = y1;
                let y3 = y2 * Math.cos(rotX) - z2 * Math.sin(rotX); let z3 = y2 * Math.sin(rotX) + z2 * Math.cos(rotX); let x3 = x2;
                const proj = projectPlayer3D(x3, y3, z3);
                const isBack = proj.depth > 0;
                if (isBack === drawBack) {
                    if (first) { ctx.moveTo(proj.x, proj.y); first = false; } else { ctx.lineTo(proj.x, proj.y); }
                    hasPoints = true;
                } else { first = true; }
            }
            if (hasPoints) {
                ctx.strokeStyle = drawBack ? backStroke : frontStroke;
                ctx.shadowBlur = drawBack ? 0 : 10; ctx.shadowColor = shadowCol; ctx.stroke(); ctx.shadowBlur = 0;
            }
        }
    };

    // --- VOID WAKE: ABYSSAL LOOP VISUAL ---
    const drawAbyssalLoop = (drawBack: boolean) => {
        const w = player.weapons.find(w => w.id === 'void_wake' && w.level >= 8);
        if (!w) return;

        const time = frame * 0.04;
        const baseRadius = 45 * player.stats.areaMult;

        const layers = 3;

        for (let l = 0; l < layers; l++) {
            const layerOffset = (l * 0.2);
            const animScale = 1.0 - ((frame * 0.01 + layerOffset) % 0.6);

            const alpha = Math.min(1, animScale * 1.5);
            if (alpha <= 0.1) continue;

            const radius = baseRadius * animScale;

            const rX = time * (l + 1) * 0.5;
            const rY = time * (l * 0.7 + 0.3);
            const rZ = time + (l * Math.PI / 3);

            const segments = 32;

            ctx.beginPath();
            let first = true;
            let hasPoints = false;

            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;

                let x1 = Math.cos(theta) * radius;
                let y1 = Math.sin(theta) * radius;
                let z1 = 0;

                let tx = x1 * Math.cos(rZ) - y1 * Math.sin(rZ);
                let ty = x1 * Math.sin(rZ) + y1 * Math.cos(rZ);
                x1 = tx; y1 = ty;

                tx = x1 * Math.cos(rY) - z1 * Math.sin(rY);
                let tz = x1 * Math.sin(rY) + z1 * Math.cos(rY);
                x1 = tx; z1 = tz;

                ty = y1 * Math.cos(rX) - z1 * Math.sin(rX);
                tz = y1 * Math.sin(rX) + z1 * Math.cos(rX);
                y1 = ty; z1 = tz;

                const proj = projectPlayer3D(x1, y1, z1);

                const jitter = (Math.random() - 0.5) * (5 * animScale);
                const jx = proj.x + jitter;
                const jy = proj.y + jitter;

                const isBack = proj.depth > 0;

                if (isBack === drawBack) {
                    if (first) { ctx.moveTo(jx, jy); first = false; }
                    else { ctx.lineTo(jx, jy); }
                    hasPoints = true;
                } else {
                    first = true;
                }
            }

            if (hasPoints) {
                const coreColor = `rgba(255, 0, 255, ${alpha})`;
                const glowColor = `rgba(208, 0, 255, ${alpha})`;

                ctx.strokeStyle = coreColor;
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 10 * animScale;
                ctx.lineWidth = 2 * animScale;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    };

    let spiritCrystals: { x: number, y: number, depth: number }[] = [];
    const spiritLance = player.weapons.find(w => w.id === 'spirit_lance' && w.level >= 8);
    if (spiritLance) {
        const orbitSpeed = t * 2;
        for (let i = 0; i < 3; i++) {
            const offset = (Math.PI * 2 / 3) * i; const ox = Math.cos(orbitSpeed + offset) * 35; const oz = Math.sin(orbitSpeed + offset) * 35;
            const proj = projectPlayer3D(ox, oz, -10 + Math.sin(t * 4 + i) * 5); spiritCrystals.push(proj);
        }
    }

    if (!isWeaponsJammed) {
        drawVoidOrb(true);
        drawAbyssalLoop(true);

        spiritCrystals.forEach(c => {
            if (c.depth > 0) {
                const size = 6; ctx.save(); ctx.translate(c.x, c.y); ctx.strokeStyle = '#00FFFF'; ctx.fillStyle = '#E0FFFF';
                ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size / 2, 0); ctx.lineTo(0, size); ctx.lineTo(-size / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }
        });
    }

    // Draw Player Body 
    const scale = 22; const vertices = [{ x: 0, y: 0, z: 1.3 }, { x: 0, y: 0, z: -1.3 }, { x: 1.0, y: 0, z: 0 }, { x: -1.0, y: 0, z: 0 }, { x: 0, y: 1.0, z: 0 }, { x: 0, y: -1.0, z: 0 }];
    const projVerts = vertices.map(v => projectPlayer3D(v.x * scale, v.y * scale, v.z * scale));
    const faces = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]];
    ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    faces.forEach(f => {
        const v0 = projVerts[f[0]]; const v1 = projVerts[f[1]]; const v2 = projVerts[f[2]];
        ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.strokeStyle = COLORS.white; ctx.fill(); ctx.stroke();
    });

    if (!isWeaponsJammed) {
        spiritCrystals.forEach(c => {
            if (c.depth <= 0) {
                const size = 6; ctx.save(); ctx.translate(c.x, c.y); ctx.strokeStyle = '#00FFFF'; ctx.fillStyle = '#E0FFFF';
                ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size / 2, 0); ctx.lineTo(0, size); ctx.lineTo(-size / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }
        });

        // Weapon Effects
        player.weapons.forEach(w => {
            if (w.level >= 8) {
                if (w.id === 'nanite_swarm') {
                    const swarmCount = 6;
                    const swarmRadius = 45;
                    const swarmTime = frame * 0.05;

                    ctx.strokeStyle = '#00FF00';
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.lineJoin = 'round';

                    for (let i = 0; i < swarmCount; i++) {
                        const angle = (i / swarmCount) * Math.PI * 2 + swarmTime;
                        const yBob = Math.sin(swarmTime * 2 + i) * 10;
                        const cx = Math.cos(angle) * swarmRadius;
                        const cy = yBob;
                        const cz = Math.sin(angle) * swarmRadius;
                        const scale = 4;
                        const nrX = swarmTime * 2 + i;
                        const nrY = swarmTime * 3;

                        const rawVerts = [
                            { x: 0, y: -scale * 1.5, z: 0 },
                            { x: scale, y: scale * 0.5, z: scale * 0.8 },
                            { x: -scale, y: scale * 0.5, z: scale * 0.8 },
                            { x: 0, y: scale * 0.5, z: -scale }
                        ];

                        const worldVerts = rawVerts.map(v => {
                            let y1 = v.y * Math.cos(nrX) - v.z * Math.sin(nrX);
                            let z1 = v.y * Math.sin(nrX) + v.z * Math.cos(nrX);
                            let x2 = v.x * Math.cos(nrY) - z1 * Math.sin(nrY);
                            let z2 = v.x * Math.sin(nrY) + z1 * Math.cos(nrY);
                            return { x: x2 + cx, y: y1 + cy, z: z2 + cz };
                        });

                        const pVerts = worldVerts.map(v => projectPlayer3D(v.x, v.y, v.z));

                        ctx.beginPath();
                        ctx.moveTo(pVerts[1].x, pVerts[1].y); ctx.lineTo(pVerts[2].x, pVerts[2].y); ctx.lineTo(pVerts[3].x, pVerts[3].y); ctx.lineTo(pVerts[1].x, pVerts[1].y);
                        ctx.moveTo(pVerts[0].x, pVerts[0].y); ctx.lineTo(pVerts[1].x, pVerts[1].y);
                        ctx.moveTo(pVerts[0].x, pVerts[0].y); ctx.lineTo(pVerts[2].x, pVerts[2].y);
                        ctx.moveTo(pVerts[0].x, pVerts[0].y); ctx.lineTo(pVerts[3].x, pVerts[3].y);

                        ctx.stroke(); ctx.fill();
                    }
                } else if (w.id === 'cyber_kora') {
                    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#00FFFF';
                    for (let i = 0; i < 3; i++) {
                        const vA = projVerts[Math.floor(Math.random() * projVerts.length)];
                        const vB = projVerts[Math.floor(Math.random() * projVerts.length)];
                        ctx.strokeStyle = i === 0 ? '#FFFFFF' : '#00FFFF';
                        ctx.lineWidth = i === 0 ? 2 : 1;
                        ctx.beginPath(); ctx.moveTo(vA.x, vA.y);
                        const midX = (vA.x + vB.x) / 2 + (Math.random() - 0.5) * 15;
                        const midY = (vA.y + vB.y) / 2 + (Math.random() - 0.5) * 15;
                        ctx.lineTo(midX, midY); ctx.lineTo(vB.x, vB.y); ctx.stroke();
                    }
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)'; ctx.lineWidth = 2; ctx.beginPath();
                    const radius = 45; const segments = 12;
                    for (let i = 0; i <= segments; i++) {
                        const ang = (i / segments) * Math.PI * 2 + t * 5;
                        const rVar = radius + Math.random() * 10;
                        const pt = projectPlayer3D(Math.cos(ang) * rVar, Math.sin(ang) * rVar, 0);
                        if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.stroke(); ctx.restore();
                }
            }
        });
    }

    // Core Drawing
    {
        let coreColor = COLORS.orange; let s = 3.5;
        if (activeMissionType === MissionType.SHADOW_STEP) {
            coreColor = (Math.floor(frame / 10) % 2 === 0) ? '#FF0000' : '#444444';
        } else if (!isWeaponsJammed && player.weapons.some(w => w.id === 'cyber_kora')) {
            s = 3.5 + Math.sin(t * 10) * 1;
            coreColor = '#00FFFF';
        }

        const rawVerts = [{ x: 0, y: 1, z: 1.618 }, { x: 0, y: 1, z: -1.618 }, { x: 0, y: -1, z: 1.618 }, { x: 0, y: -1, z: -1.618 }, { x: 1, y: 1.618, z: 0 }, { x: 1, y: -1.618, z: 0 }, { x: -1, y: 1.618, z: 0 }, { x: -1, y: -1.618, z: 0 }, { x: 1.618, y: 0, z: 1 }, { x: 1.618, y: 0, z: -1 }, { x: -1.618, y: 0, z: 1 }, { x: -1.618, y: 0, z: -1 }];
        const faces = [[0, 10, 2], [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10], [3, 9, 5], [3, 5, 7], [3, 7, 11], [3, 11, 1], [3, 1, 9], [2, 10, 7], [2, 7, 5], [2, 5, 8], [8, 5, 9], [8, 9, 4], [4, 9, 1], [4, 1, 6], [6, 1, 11], [6, 11, 10], [10, 11, 7]];
        const coreSpin = frame * 0.05; const spinCos = Math.cos(coreSpin); const spinSin = Math.sin(coreSpin);
        const projVertsIco = rawVerts.map(v => { const rx = v.x * spinCos - v.z * spinSin; const rz = v.x * spinSin + v.z * spinCos; return projectPlayer3D(rx * s, v.y * s, rz * s); });
        const faceList = faces.map(f => { const v0 = projVertsIco[f[0]]; const v1 = projVertsIco[f[1]]; const v2 = projVertsIco[f[2]]; const depth = (v0.depth + v1.depth + v2.depth) / 3; return { v0, v1, v2, depth }; });
        faceList.sort((a, b) => b.depth - a.depth);
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)'; ctx.lineWidth = 1; ctx.fillStyle = coreColor;
        faceList.forEach(f => { ctx.beginPath(); ctx.moveTo(f.v0.x, f.v0.y); ctx.lineTo(f.v1.x, f.v1.y); ctx.lineTo(f.v2.x, f.v2.y); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    }

    // Front Layers - Skip if weapons jammed
    if (!isWeaponsJammed) {
        drawVoidOrb(false);
        drawAbyssalLoop(false);
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

    ctx.restore();
};
