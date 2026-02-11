
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

export const drawShango = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    // --- SHANGO'S WRATH ---
    const t = frame * 0.02;
    const scale = e.radius * 0.9;
    // Use e.rotation directly, do NOT add frame-based spin here to allow AI to control stopping.
    const rotZ = (e.rotation || 0); 
    const rotX = 0.65; 
    const rotY = Math.sin(frame * 0.02) * 0.15;

    ctx.save();
    // Removed global body glow/shadow
    ctx.globalCompositeOperation = 'lighter'; 

    // 1. VERTICES
    const hH = 3.8 * scale;   const wH = 0.22 * scale;  
    const bW = 2.6 * scale;   const bZ = 0.45 * scale;  

    const verts = [];
    // Handle (0-7)
    verts.push({x: -wH, y: hH*0.45, z: -wH}, {x: wH, y: hH*0.45, z: -wH}, {x: wH, y: hH*0.45, z: wH}, {x: -wH, y: hH*0.45, z: wH});
    verts.push({x: -wH, y: -hH*0.6, z: -wH}, {x: wH, y: -hH*0.6, z: -wH}, {x: wH, y: -hH*0.6, z: wH}, {x: -wH, y: -hH*0.6, z: wH});

    // Left Blade (8-15)
    verts.push({x: -wH, y: 0.9*scale, z: 0}, {x: -wH, y: -0.6*scale, z: 0}); // 8,9: Neck
    verts.push({x: -bW, y: 1.6*scale, z: 0}, {x: -bW, y: -1.2*scale, z: 0}); // 10,11: Tips
    verts.push({x: -bW*0.65, y: 0.2*scale, z: bZ}, {x: -bW*0.65, y: 0.2*scale, z: -bZ}); // 12,13: Ridges
    verts.push({x: -bW*0.45, y: 0.8*scale, z: bZ*0.6}, {x: -bW*0.45, y: -0.4*scale, z: bZ*0.6}); // 14,15: Mid

    // Right Blade (16-23)
    verts.push({x: wH, y: 0.9*scale, z: 0}, {x: wH, y: -0.6*scale, z: 0}); // 16,17: Neck
    verts.push({x: bW, y: 1.6*scale, z: 0}, {x: bW, y: -1.2*scale, z: 0}); // 18,19: Tips
    verts.push({x: bW*0.65, y: 0.2*scale, z: bZ}, {x: bW*0.65, y: 0.2*scale, z: -bZ}); // 20,21: Ridges
    verts.push({x: bW*0.45, y: 0.9*scale, z: bZ*0.6}, {x: bW*0.45, y: -0.5*scale, z: bZ*0.6}); // 22,23: Mid

    // Base Tetrahedron Spike (Indices 24-27)
    const spikeY = -hH * 0.65;
    verts.push({x: 0, y: spikeY - (0.5 * scale), z: 0}); // Index 24: Tip
    verts.push({x: -wH*1.5, y: spikeY, z: wH});          // Index 25: Base L
    verts.push({x: wH*1.5, y: spikeY, z: wH});           // Index 26: Base R
    verts.push({x: 0, y: spikeY, z: -wH*1.5});           // Index 27: Base Back

    // 2. PROJECTION
    const projected = verts.map(v => {
        const x1 = v.x * Math.cos(rotZ) - v.y * Math.sin(rotZ);
        const y1 = v.x * Math.sin(rotZ) + v.y * Math.cos(rotZ);
        return project3D(x1, y1, v.z, rotX, rotY, 0, 400);
    });

    // 3. FACES (Now fully enclosed)
    const faces = [];
    // Handle sides
    faces.push({ idx: [0,1,5,4], col: '#551100', str: '#FF6600', type: 'handle' });
    faces.push({ idx: [1,2,6,5], col: '#551100', str: '#FF6600', type: 'handle' });
    faces.push({ idx: [2,3,7,6], col: '#551100', str: '#FF6600', type: 'handle' });
    faces.push({ idx: [3,0,4,7], col: '#551100', str: '#FF6600', type: 'handle' });

    // Blade Facets (L & R)
    const addBlade = (off: number) => {
        faces.push({ idx: [off+0, off+2, off+6], col: '#FF4500', str: '#FFFFFF' }); // Top Facet
        faces.push({ idx: [off+6, off+2, off+4], col: '#FF8800', str: '#FFFFFF' }); // Outer Facet
        faces.push({ idx: [off+4, off+2, off+3], col: '#CC1100', str: '#FFCC00' }); // Bottom Flare
        faces.push({ idx: [off+1, off+7, off+3], col: '#FF4500', str: '#FFFFFF' }); // Bottom Neck
    };
    addBlade(8);  // Left
    addBlade(16); // Right

    faces.push(
        { idx: [24, 25, 26], col: '#FFFFFF', str: '#FFCC00' }, // Front Face (Hot White)
        { idx: [24, 26, 27], col: '#FF4500', str: '#FFFFFF' }, // Right Face
        { idx: [24, 27, 25], col: '#CC2200', str: '#FFFFFF' }, // Left Face
        { idx: [25, 26, 27], col: '#551100', str: '#FF8800' }  // Bottom Cap
    );

    // 4. RENDER LOOP
    faces.map(f => {
        // Add depth to face object
        const depth = f.idx.reduce((acc, i) => acc + projected[i].depth, 0) / f.idx.length;
        return { ...f, d: depth };
    }).sort((a, b) => a.d - b.d).forEach(f => {
        const ps = f.idx.map(i => projected[i]);
        ctx.beginPath();
        ctx.moveTo(ps[0].x, ps[0].y);
        for(let i=1; i<ps.length; i++) ctx.lineTo(ps[i].x, ps[i].y);
        ctx.closePath();
        ctx.fillStyle = f.col; ctx.fill();
        ctx.strokeStyle = f.str; ctx.lineWidth = 0.8; ctx.stroke();

        if (f.type === 'handle') { // Digital Banding
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            for(let j=1; j<6; j++) {
                const r = j/6;
                ctx.beginPath();
                ctx.moveTo(ps[0].x + (ps[3].x - ps[0].x)*r, ps[0].y + (ps[3].y - ps[0].y)*r);
                ctx.lineTo(ps[1].x + (ps[2].x - ps[1].x)*r, ps[1].y + (ps[2].y - ps[1].y)*r);
                ctx.stroke();
            }
        }
    });

    // 5. HALO & LIGHTNING
    const rR = 2.6 * scale;
    for (let i = 0; i < 8; i++) {
        const aS = (i / 8) * Math.PI * 2 + (frame * 0.03);
        const aE = aS + 0.35;
        const pF1 = project3D(Math.cos(aS)*rR, Math.sin(aS)*rR, 8, rotX, rotY, 0, 400);
        const pF2 = project3D(Math.cos(aE)*rR, Math.sin(aE)*rR, 8, rotX, rotY, 0, 400);
        const pB2 = project3D(Math.cos(aE)*(rR+14), Math.sin(aE)*(rR+14), -8, rotX, rotY, 0, 400);
        const pB1 = project3D(Math.cos(aS)*(rR+14), Math.sin(aS)*(rR+14), -8, rotX, rotY, 0, 400);
        ctx.beginPath();
        ctx.moveTo(pF1.x, pF1.y); ctx.lineTo(pF2.x, pF2.y); ctx.lineTo(pB2.x, pB2.y); ctx.lineTo(pB1.x, pB1.y);
        ctx.closePath(); ctx.fillStyle = 'rgba(255, 80, 0, 0.7)'; ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    }

    // Jagged Lightning Effect
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
        const ang = (i / 32) * Math.PI * 2 + (frame * 0.05);
        const rV = rR + 5 + (Math.random() - 0.5) * 18;
        const p = project3D(Math.cos(ang) * rV, Math.sin(ang) * rV, 0, rotX, rotY, 0, 400);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Telegraphing Lights (LOCK PHASE)
    if (e.state === 'LOCK') {
        const alpha = 0.5 + Math.sin(frame * 0.3) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = 10;
        
        ctx.lineWidth = 2 * alpha;
        ctx.strokeStyle = `rgba(255, 50, 0, ${alpha * 0.8})`;
        
        const focalLen = 400;
        const clipZ = 300; 

        for(let i=0; i<4; i++) {
            const angle = rotZ + (i * Math.PI / 2);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            const getDepth = (r: number) => {
                const x = cosA * r;
                const y = sinA * r;
                const z1 = y * Math.sin(rotX);
                const z2 = x * Math.sin(rotY) + z1 * Math.cos(rotY);
                return z2;
            };

            const dist = 800;
            const originalREnd = rR + dist;
            
            let drawStartR = rR;
            let drawEndR = originalREnd;
            
            const zStart = getDepth(rR);
            const zEnd = getDepth(originalREnd);
            
            if (Math.abs(zEnd - zStart) > 0.001) {
                if (zStart > clipZ && zEnd > clipZ) continue;
                
                if (zStart > clipZ) {
                    const t = (clipZ - zStart) / (zEnd - zStart);
                    drawStartR = rR + (originalREnd - rR) * t;
                }
                
                if (zEnd > clipZ) {
                    const t = (clipZ - zStart) / (zEnd - zStart);
                    drawEndR = rR + (originalREnd - rR) * t;
                }
            } else {
                if (zStart > clipZ) continue;
            }
            
            const pS = project3D(cosA * drawStartR, sinA * drawStartR, 0, rotX, rotY, 0, focalLen);
            const pE = project3D(cosA * drawEndR, sinA * drawEndR, 0, rotX, rotY, 0, focalLen);
            
            if (zStart <= clipZ) {
                 const pRing = project3D(cosA * rR, sinA * rR, 0, rotX, rotY, 0, focalLen);
                 ctx.beginPath(); ctx.arc(pRing.x, pRing.y, 8, 0, Math.PI*2); ctx.fill();
            }
            
            ctx.beginPath(); 
            ctx.moveTo(pS.x, pS.y); 
            ctx.lineTo(pE.x, pE.y); 
            ctx.stroke();
        }
    }

    ctx.restore();
};
