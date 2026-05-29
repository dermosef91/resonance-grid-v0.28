
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

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

    // Dodecahedron Geometry
    const phi = 1.618;
    const invPhi = 1 / phi;
    
    // 20 Vertices of a Dodecahedron
    const verts = [
        // (+-1, +-1, +-1) (8 vertices)
        {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:1, y:-1, z:1}, {x:1, y:-1, z:-1},
        {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1},
        // (0, +-phi, +-1/phi) (4 vertices)
        {x:0, y:phi, z:invPhi}, {x:0, y:phi, z:-invPhi}, {x:0, y:-phi, z:invPhi}, {x:0, y:-phi, z:-invPhi},
        // (+-1/phi, 0, +-phi) (4 vertices)
        {x:invPhi, y:0, z:phi}, {x:invPhi, y:0, z:-phi}, {x:-invPhi, y:0, z:phi}, {x:-invPhi, y:0, z:-phi},
        // (+-phi, +-1/phi, 0) (4 vertices)
        {x:phi, y:invPhi, z:0}, {x:phi, y:-invPhi, z:0}, {x:-phi, y:invPhi, z:0}, {x:-phi, y:-invPhi, z:0}
    ];

    // Filter vertices based on phase to simulate shattering
    // We replace removed vertices with null to keep index structure for edges logic, 
    // but check for null later
    const filteredVerts = verts.map((v, i) => {
        if (phase >= 1 && i % 4 === 0) return null; // Phase 1: Lose ~25%
        if (phase >= 2 && i % 2 === 0) return null; // Phase 2: Lose ~50%
        if (phase >= 3 && i % 4 !== 3) return null; // Phase 3: Lose ~75%
        return v;
    });

    // Project points
    const projected = filteredVerts.map(v => {
        if (!v) return null;
        return project3D(v.x * finalScale, v.y * finalScale, v.z * finalScale, rotX, rotY, rotZ, 400);
    });

    // Calculate Edges dynamically based on distance
    const edges: {p1: any, p2: any, depth: number}[] = [];
    const threshold = 1.6; 

    for (let i = 0; i < verts.length; i++) {
        // Skip if vertex is shattered
        if (!projected[i]) continue;

        for (let j = i + 1; j < verts.length; j++) {
            if (!projected[j]) continue;

            const dx = verts[i].x - verts[j].x;
            const dy = verts[i].y - verts[j].y;
            const dz = verts[i].z - verts[j].z;
            const d2 = dx*dx + dy*dy + dz*dz;
            
            if (d2 < threshold) {
                const p1 = projected[i]!;
                const p2 = projected[j]!;
                edges.push({ p1, p2, depth: (p1.depth + p2.depth) / 2 });
            }
        }
    }

    edges.sort((a, b) => a.depth - b.depth);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Draw Edges (Shell)
    edges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(edge.p1.x, edge.p1.y);
        ctx.lineTo(edge.p2.x, edge.p2.y);
        
        if (edge.depth < 0) {
            ctx.strokeStyle = '#FF4500'; 
            ctx.lineWidth = 3;
            ctx.globalAlpha = 1.0;
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 10;
        } else {
            ctx.strokeStyle = '#8B0000'; 
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.4;
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
    });
    
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Draw Vertices (Shell Nodes)
    projected.forEach(p => {
        if (!p) return;
        const isFront = p.depth < 0;
        const size = (isFront ? 5 : 3) * p.scale;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = isFront ? 1.0 : 0.5;
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x + size, p.y);
        ctx.lineTo(p.x, p.y + size);
        ctx.lineTo(p.x - size, p.y);
        ctx.closePath();
        ctx.fill();
        
        if (isFront) {
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 5;
            ctx.stroke(); 
            ctx.shadowBlur = 0;
        }
    });
    ctx.globalAlpha = 1.0;

    // --- CORE RENDERING (Glitchy Inner Core) ---
    // Make core glitch more intense with phase
    const coreGlitch = phase * 0.2; // 0, 0.2, 0.4, 0.6
    
    const innerScale = scale * 0.3;
    const iPhi = 1.618;
    const coreVerts = [
        {x:0, y:1, z:iPhi}, {x:0, y:1, z:-iPhi}, {x:0, y:-1, z:iPhi}, {x:0, y:-1, z:-iPhi},
        {x:1, y:iPhi, z:0}, {x:1, y:-iPhi, z:0}, {x:-1, y:iPhi, z:0}, {x:-1, y:-iPhi, z:0},
        {x:iPhi, y:0, z:1}, {x:iPhi, y:0, z:-1}, {x:-iPhi, y:0, z:1}, {x:-iPhi, y:0, z:-1}
    ];
    
    const coreRotSpeed = 1.0 + (phase * 0.5); // Spin faster when exposed
    const projCore = coreVerts.map(v => {
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
    ctx.strokeStyle = `rgb(255, ${255 - redIntensity}, 0)`; 
    ctx.lineWidth = 1 + (phase * 0.5);
    
    if (phase === 3) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF0000';
    }

    ctx.beginPath();
    
    for (let i = 0; i < projCore.length; i++) {
        for (let j = i + 1; j < projCore.length; j++) {
            const dx = coreVerts[i].x - coreVerts[j].x;
            const dy = coreVerts[i].y - coreVerts[j].y;
            const dz = coreVerts[i].z - coreVerts[j].z;
            const d2 = dx*dx + dy*dy + dz*dz;
            
            if (d2 <= 4.1) {
                const p1 = projCore[i];
                const p2 = projCore[j];
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
        }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
};
