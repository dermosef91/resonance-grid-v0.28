
import { Pickup } from '../../types';
import { getDropStyle, project3D, drawLightningBolt } from '../renderUtils';
import { COLORS } from '../../constants';

export const drawPickup = (ctx: CanvasRenderingContext2D, p: Pickup, frame: number, viewBounds: {left: number, right: number, top: number, bottom: number}) => {
    if (p.pos.x < viewBounds.left || p.pos.x > viewBounds.right || p.pos.y < viewBounds.top || p.pos.y > viewBounds.bottom) {
        return;
    }

    if (p.kind === 'KALEIDOSCOPE') {
        const t = frame * 0.05;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.translate(0, Math.sin(t) * 8 - 15);

        // Rotating Prism (Pyramid)
        const scale = 14;
        const rotY = t;
        const rotX = 0.5;
        const rotZ = Math.sin(t*0.5) * 0.2;

        const verts = [
            {x:0, y:-1.5, z:0}, // Tip
            {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:-1, y:1, z:1}, {x:-1, y:1, z:-1} // Base
        ];
        // Connect base: (1,1,1)->(1,1,-1)->(-1,1,-1)->(-1,1,1)->(1,1,1)
        
        const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, rotX, rotY, rotZ, 300));

        // Cycle colors
        const hue = (frame * 2) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.strokeStyle;

        // Draw Faces (Tip to Base)
        const baseIndices = [1, 2, 4, 3];
        
        // Draw sides
        baseIndices.forEach((idx, i) => {
            const nextIdx = baseIndices[(i + 1) % baseIndices.length];
            ctx.beginPath();
            ctx.moveTo(projected[0].x, projected[0].y);
            ctx.lineTo(projected[idx].x, projected[idx].y);
            ctx.lineTo(projected[nextIdx].x, projected[nextIdx].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    } else if (p.kind === 'STASIS_FIELD') {
        const t = frame * 0.03;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.translate(0, Math.sin(t*2) * 5 - 10);

        // Rotating Snowflake/Star
        const size = 15;
        const arms = 6;
        
        ctx.strokeStyle = '#0088FF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#0000FF';
        ctx.shadowBlur = 15;
        
        // Background Glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        grad.addColorStop(0, 'rgba(0, 100, 255, 0.6)');
        grad.addColorStop(1, 'rgba(0, 0, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();

        ctx.rotate(t);
        
        for(let i=0; i<arms; i++) {
            const angle = (i/arms) * Math.PI * 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            // Branch
            ctx.moveTo(size*0.6, 0); ctx.lineTo(size*0.8, -4);
            ctx.moveTo(size*0.6, 0); ctx.lineTo(size*0.8, 4);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.shadowBlur = 0;
        
        // Core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    } else if (p.kind === 'SUPPLY_DROP') {
        const style = getDropStyle(p.supplyContent);
        ctx.save(); ctx.translate(p.pos.x, p.pos.y);
        const beamHeight = 400; const beamGrad = ctx.createLinearGradient(0, 0, 0, -beamHeight);
        beamGrad.addColorStop(0, style.rgba + '0.4)'); beamGrad.addColorStop(1, style.rgba + '0)');
        ctx.fillStyle = beamGrad; ctx.fillRect(-20, -beamHeight, 40, beamHeight);
        const hover = Math.sin(frame * 0.05) * 10; ctx.translate(0, hover - 20);
        const content = p.supplyContent || 'LEVEL_UP';
        
        if (content === 'LEVEL_UP') {
            const size = 20; const rot = frame * 0.02; ctx.lineWidth = 2; ctx.strokeStyle = style.hex; ctx.shadowColor = style.hex; ctx.shadowBlur = 10; ctx.fillStyle = 'rgba(0, 20, 30, 0.8)';
            for(let i=0; i<3; i++) { const offset = (Math.PI * 2 / 3) * i; const r = size; const x = Math.cos(rot + offset) * r; const y = Math.sin(rot + offset) * (r * 0.3); ctx.beginPath(); ctx.rect(x - size/2, y - size/2, size, size); ctx.fill(); ctx.stroke(); }
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        } else if (content === 'FULL_HEALTH') {
            const drawCross = (x: number, y: number, s: number) => { ctx.fillRect(x - s/3, y - s, s*0.66, s*2); ctx.fillRect(x - s, y - s/3, s*2, s*0.66); };
            ctx.fillStyle = style.hex; ctx.shadowColor = style.hex; ctx.shadowBlur = 10; drawCross(0, 0, 10);
            const orbitSpeed = frame * 0.05; for(let i=0; i<2; i++) { const angle = orbitSpeed + i * Math.PI; const r = 20; drawCross(Math.cos(angle)*r, Math.sin(angle)*r, 6); }
        } else if (content === 'CURRENCY_50') {
            ctx.strokeStyle = style.hex; ctx.fillStyle = 'rgba(20, 20, 0, 0.8)'; ctx.lineWidth = 2; ctx.shadowColor = style.hex; ctx.shadowBlur = 10; ctx.rotate(Math.sin(frame * 0.05) * 0.2);
            const w = 24, h = 30; ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.fill(); ctx.stroke();
            ctx.beginPath(); for(let i=0; i<4; i++) { const y = -h/2 + 6 + i*6; ctx.moveTo(-w/2, y); ctx.lineTo(-w/2 - 4, y); ctx.moveTo(w/2, y); ctx.lineTo(w/2 + 4, y); } ctx.stroke();
            ctx.fillStyle = style.hex; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("$", 0, 0);
        } else if (content === 'TEMPORAL_BOOST') {
            ctx.strokeStyle = style.hex; ctx.lineWidth = 2; ctx.shadowColor = style.hex; ctx.shadowBlur = 15;
            const drawHex = (r: number) => { ctx.beginPath(); for(let i=0; i<6; i++) { const angle = (i/6) * Math.PI * 2; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.stroke(); };
            ctx.rotate(frame * 0.02); drawHex(15); ctx.rotate(frame * 0.02); drawHex(8);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0, 3, 0, Math.PI*2); ctx.fill();
        } else if (content === 'EXTRA_LIFE') {
            const s = 10; const spin = frame * 0.05; const spinCos = Math.cos(spin); const spinSin = Math.sin(spin);
            const phi = 1.618;
            const verts = [ {x:0, y:1, z:phi}, {x:0, y:1, z:-phi}, {x:0, y:-1, z:phi}, {x:0, y:-1, z:-phi}, {x:1, y:phi, z:0}, {x:1, y:-phi, z:0}, {x:-1, y:phi, z:0}, {x:-1, y:-phi, z:0}, {x:phi, y:0, z:1}, {x:phi, y:0, z:-1}, {x:-phi, y:0, z:1}, {x:-phi, y:0, z:-1} ];
            const faces = [ [0, 10, 2], [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10], [3, 9, 5], [3, 5, 7], [3, 7, 11], [3, 11, 1], [3, 1, 9], [2, 10, 7], [2, 7, 5], [2, 5, 8], [8, 5, 9], [8, 9, 4], [4, 9, 1], [4, 1, 6], [6, 1, 11], [6, 11, 10], [10, 11, 7] ];
            const projVerts = verts.map(v => { const rx = v.x * spinCos - v.z * spinSin; const rz = v.x * spinSin + v.z * spinCos; return project3D(rx * s, v.y * s, rz * s, 0, 0, 0, 300); });
            const sortedFaces = faces.map(f => { const v0 = projVerts[f[0]]; const v1 = projVerts[f[1]]; const v2 = projVerts[f[2]]; const depth = (v0.depth + v1.depth + v2.depth) / 3; return { v0, v1, v2, depth }; }).sort((a, b) => b.depth - a.depth);
            
            // Player Core Style: Orange orb, White outlines
            ctx.strokeStyle = '#FFFFFF'; 
            ctx.lineWidth = 1.5; 
            ctx.fillStyle = COLORS.orange; 
            ctx.shadowColor = COLORS.orange;
            ctx.shadowBlur = 5;

            sortedFaces.forEach(f => { ctx.beginPath(); ctx.moveTo(f.v0.x, f.v0.y); ctx.lineTo(f.v1.x, f.v1.y); ctx.lineTo(f.v2.x, f.v2.y); ctx.closePath(); ctx.fill(); ctx.stroke(); });
            ctx.shadowBlur = 0;

            // Text
            ctx.fillStyle = '#FFFFFF'; 
            ctx.font = 'bold 12px monospace'; 
            ctx.textAlign = 'center'; 
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 2;
            ctx.fillText("+1", 0, -18);
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    } else if (p.kind === 'MISSION_ZONE') {
        // --- THE SONIC RESONATOR (Audio-Reactive Stonehenge) ---
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);

        // Simulate Audio Data from Frame Count
        // 132 BPM ~ 27 frames per beat
        const framesPerBeat = 27; 
        const beatProgress = (frame % framesPerBeat) / framesPerBeat; 
        const beatImpact = 1 - beatProgress; // 1.0 at start of beat, fades to 0
        const kickEnv = Math.pow(beatImpact, 8); // Sharp spike
        const bassEnv = 0.5 + Math.sin(frame * 0.1) * 0.5; // Smooth modulation

        // --- UPLOAD STATE VISUALS ---
        const isUploading = (p as any).isUploading;
        
        // 1. Ground Effect: Pulse Circles
        ctx.save();
        ctx.scale(1, 0.5); // Perspective squash
        
        // Outer Ring
        const rOuter = p.radius + (kickEnv * 20);
        ctx.beginPath();
        ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
        
        const outerColor = isUploading ? '#00FFFF' : '#00FF66';
        ctx.strokeStyle = isUploading 
            ? `rgba(0, 255, 255, ${0.5 + kickEnv * 0.5})` 
            : `rgba(0, 255, 100, ${0.3 + kickEnv * 0.4})`;
            
        ctx.lineWidth = 2 + kickEnv * 4;
        ctx.shadowColor = outerColor;
        ctx.shadowBlur = 10 * kickEnv;
        ctx.stroke();
        
        // Inner Ripples
        const rippleCount = 3;
        for(let i=0; i<rippleCount; i++) {
            const phase = (frame * 0.05 + i * (Math.PI*2/rippleCount)) % (Math.PI*2);
            const rRipple = (phase / (Math.PI*2)) * p.radius;
            const alpha = 1 - (rRipple / p.radius);
            
            ctx.beginPath();
            ctx.arc(0, 0, rRipple, 0, Math.PI * 2);
            ctx.strokeStyle = isUploading 
                ? `rgba(0, 255, 255, ${alpha * 0.8})`
                : `rgba(0, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();

        // 2. Equalizer Pillars
        const pillarCount = 12;
        const radius = p.radius * 0.8;
        const rotSpeed = isUploading ? 0.02 : 0.005; // Spin faster when uploading
        const baseRotation = frame * rotSpeed;
        
        // Pillar Params
        const w = 12;
        const d = 12;
        
        ctx.fillStyle = '#111'; // Dark Monolith
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        // Sort Pillars by Z-depth to draw correctly
        const pillars = [];
        for(let i=0; i<pillarCount; i++) {
            const angle = baseRotation + (i / pillarCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Height Calculation: Noise + Beat
            const noise = Math.sin(i * 132.5 + frame * 0.1);
            // Stagger kick effect around circle
            const kickDelay = Math.abs(Math.sin(i * 0.5)); 
            const localKick = Math.max(0, kickEnv - kickDelay * 0.2);
            
            const h = 20 + (bassEnv * 30) + (localKick * 80) + (noise * 10) + (isUploading ? 40 : 0); // Taller when uploading
            
            pillars.push({ i, x, z, h });
        }
        
        // Sort: Back to Front
        const projectedPillars = pillars.map(p => {
            const centerBase = project3D(p.x, 0, p.z, 0.5, 0, 0, 600); // Using same tilt as Obstacles
            return { ...p, projY: centerBase.y, projDepth: centerBase.depth };
        });
        
        projectedPillars.sort((a, b) => a.projDepth - b.projDepth);

        projectedPillars.forEach(pillar => {
            const { x, z, h } = pillar;
            const topY = -h;
            
            // Define Box Vertices
            const vTop = [
                {x: x-w/2, y: topY, z: z-d/2}, {x: x+w/2, y: topY, z: z-d/2},
                {x: x+w/2, y: topY, z: z+d/2}, {x: x-w/2, y: topY, z: z+d/2}
            ];
            const vBot = [
                {x: x-w/2, y: 0, z: z-d/2}, {x: x+w/2, y: 0, z: z-d/2},
                {x: x+w/2, y: 0, z: z+d/2}, {x: x-w/2, y: 0, z: z+d/2}
            ];
            
            const pTop = vTop.map(v => project3D(v.x, v.y, v.z, 0.5, 0, 0, 600));
            const pBot = vBot.map(v => project3D(v.x, v.y, v.z, 0.5, 0, 0, 600));
            
            // Draw Sides
            const drawQuad = (i1: number, i2: number, color: string) => {
                ctx.beginPath();
                ctx.moveTo(pTop[i1].x, pTop[i1].y);
                ctx.lineTo(pTop[i2].x, pTop[i2].y);
                ctx.lineTo(pBot[i2].x, pBot[i2].y);
                ctx.lineTo(pBot[i1].x, pBot[i1].y);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
                ctx.stroke();
            };
            
            const isActive = kickEnv > 0.1 || isUploading;
            const strokeCol = isActive 
                ? (isUploading ? '#00FFFF' : '#00FFaa')
                : '#005533';
            ctx.strokeStyle = strokeCol;
            
            // Draw all sides
            ctx.fillStyle = `rgba(10, 20, 15, 0.9)`;
            
            // Side 1
            drawQuad(0, 1, ctx.fillStyle as string);
            drawQuad(1, 2, ctx.fillStyle as string);
            drawQuad(2, 3, ctx.fillStyle as string);
            drawQuad(3, 0, ctx.fillStyle as string);
            
            // Top Cap
            ctx.beginPath();
            ctx.moveTo(pTop[0].x, pTop[0].y);
            ctx.lineTo(pTop[1].x, pTop[1].y);
            ctx.lineTo(pTop[2].x, pTop[2].y);
            ctx.lineTo(pTop[3].x, pTop[3].y);
            ctx.closePath();
            
            // Top Glow
            const topColorBase = isUploading ? '0, 255, 255' : '0, 255, 170';
            ctx.fillStyle = `rgba(${topColorBase}, ${0.2 + (pillar.h / 150)})`;
            ctx.fill();
            ctx.stroke();
            
            // 3. Electric Arcs (on Kick)
            if (kickEnv > 0.6 && Math.random() > 0.7) {
                // Flash connection to center
                const start = { x: (pTop[0].x + pTop[2].x)/2, y: (pTop[0].y + pTop[2].y)/2 };
                const center = project3D(0, -50, 0, 0.5, 0, 0, 600); // Center point in air
                
                ctx.save();
                ctx.shadowColor = isUploading ? '#00FFFF' : '#00FF00';
                ctx.shadowBlur = 10;
                drawLightningBolt(ctx, start, {x: center.x, y: center.y}, isUploading ? '#00FFFF' : '#00FF00', 2, 15);
                ctx.restore();
            }
        });

        // Center Data Stream
        const centerBot = project3D(0, 0, 0, 0.5, 0, 0, 600);
        const centerTop = project3D(0, -200, 0, 0.5, 0, 0, 600);
        
        const beamIntensity = isUploading ? 1.0 : kickEnv * 0.5;
        const beamColorCore = isUploading ? '0, 100, 255' : '0, 255, 255';
        
        const grad = ctx.createLinearGradient(centerBot.x, centerBot.y, centerTop.x, centerTop.y);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.5, `rgba(${beamColorCore}, ${beamIntensity})`);
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        const wBeam = (10 + kickEnv * 10) * (isUploading ? 2.5 : 1);
        ctx.moveTo(centerBot.x - wBeam, centerBot.y);
        ctx.lineTo(centerBot.x + wBeam, centerBot.y);
        ctx.lineTo(centerTop.x + wBeam, centerTop.y);
        ctx.lineTo(centerTop.x - wBeam, centerTop.y);
        ctx.fill();
        
        // Strong Blue Core Beam when Uploading
        if (isUploading) {
            ctx.save();
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerBot.x, centerBot.y);
            ctx.lineTo(centerTop.x, centerTop.y - 1000); // Shoot up
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

    } else if (p.kind === 'MISSION_ITEM') {
        // --- DATA FRAGMENT 3D VISUAL ---
        // (Existing Logic preserved)
        const t = frame * 0.05;
        const float = Math.sin(t) * 10;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.translate(0, float - 20);

        // Rotating Octahedron
        const scale = 12;
        const rotY = t;
        const rotX = Math.sin(t * 0.5) * 0.5;
        const rotZ = Math.cos(t * 0.3) * 0.2;
        
        // Vertices for Octahedron
        const verts = [
            {x:0, y:-1.8, z:0}, // Top Tip
            {x:1, y:0, z:1}, {x:1, y:0, z:-1}, {x:-1, y:0, z:1}, {x:-1, y:0, z:-1}, // Middle Ring
            {x:0, y:1.8, z:0} // Bottom Tip
        ];
        
        // Project
        const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, rotX, rotY, rotZ, 300));
        
        // Edges
        const edges = [
            [0,1], [0,2], [0,3], [0,4], // Top to mid
            [5,1], [5,2], [5,3], [5,4], // Bottom to mid
            [1,2], [2,4], [4,3], [3,1]  // Mid ring
        ];

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#00FFFF';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.lineJoin = 'round';
        
        // Draw Edges
        ctx.beginPath();
        edges.forEach(([i, j]) => {
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
        });
        ctx.stroke();
        
        // Inner Fill (Front facing approx)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        ctx.lineTo(projected[1].x, projected[1].y);
        ctx.lineTo(projected[5].x, projected[5].y);
        ctx.lineTo(projected[3].x, projected[3].y);
        ctx.closePath();
        ctx.fill();
        
        // Orbiting Data Bits
        const bitCount = 3;
        for(let i=0; i<bitCount; i++) {
            const angle = t * 2 + (i * (Math.PI * 2 / bitCount));
            const r = scale * 2.2;
            const bx = Math.cos(angle) * r;
            const bz = Math.sin(angle) * r;
            const by = Math.sin(angle * 2) * (scale * 0.5); // Sine wave orbit
            
            const pb = project3D(bx, by, bz, rotX, rotY, rotZ, 300);
            
            // Draw connecting line to core momentarily? No, just bits.
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); 
            ctx.arc(pb.x, pb.y, 2, 0, Math.PI*2); 
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    } else if (p.kind === 'TIME_CRYSTAL') {
        const t = frame * 0.05;
        ctx.save(); 
        ctx.translate(p.pos.x, p.pos.y);
        ctx.translate(0, Math.sin(t) * 5); // Float

        // Hourglass / Crystal shape
        const scale = 15;
        const rotY = t;
        const rotX = 0.5; // Tilted to show depth

        const verts = [
            {x:0, y:-1.5, z:0}, // Top
            {x:1, y:-1, z:1}, {x:1, y:-1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1}, // Top base
            {x:0, y:0, z:0}, // Waist
            {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, // Bottom base
            {x:0, y:1.5, z:0} // Bottom
        ];

        const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, rotX, rotY, 0, 300));

        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00FFFF';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';

        // Draw Top Pyramid (Tip to Base)
        ctx.beginPath();
        [1,2,3,4].forEach(i => { ctx.moveTo(projected[0].x, projected[0].y); ctx.lineTo(projected[i].x, projected[i].y); });
        // Connect to Waist
        [1,2,3,4].forEach(i => { ctx.moveTo(projected[i].x, projected[i].y); ctx.lineTo(projected[5].x, projected[5].y); });
        ctx.stroke();
        
        // Draw Bottom Pyramid (Waist to Base)
        ctx.beginPath();
        [6,7,8,9].forEach(i => { ctx.moveTo(projected[5].x, projected[5].y); ctx.lineTo(projected[i].x, projected[i].y); });
        // Connect to Bottom Tip
        [6,7,8,9].forEach(i => { ctx.moveTo(projected[i].x, projected[i].y); ctx.lineTo(projected[10].x, projected[10].y); });
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    } else {
        // Standard Drops
        if (p.kind === 'HEALTH') {
            const size = 6; ctx.fillStyle = '#00FF00'; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.fillRect(-size/3, -size, size*0.66, size*2); ctx.fillRect(-size, -size/3, size*2, size*0.66); ctx.restore();
        } else if (p.kind === 'CURRENCY') {
            const size = 12; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(frame * 0.1); ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.7, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else {
            let scale = 1; 
            // Simple visual check for magnetization start
            // Logic handled in system, this is just visual
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y - 4); ctx.lineTo(p.pos.x + 4, p.pos.y); ctx.lineTo(p.pos.x, p.pos.y + 4); ctx.lineTo(p.pos.x - 4, p.pos.y); ctx.fill(); 
        }
    }
};
