
import { Enemy, EnemyType } from '../../types';
import { COLORS } from '../../constants';
import { projectSimple, project3D, parseColorToRgb } from '../renderUtils';

export const drawLancer = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save(); 
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1); 
    ctx.rotate(e.rotation || 0);
    const spin = frame * 0.2; const len = e.radius * 1.5; const wid = e.radius * 0.6;
    const vertices = [ {x: len, y: 0, z: 0}, {x: -len*0.5, y: -wid, z: -wid}, {x: -len*0.5, y: wid, z: -wid}, {x: -len*0.5, y: wid, z: wid}, {x: -len*0.5, y: -wid, z: wid}, {x: -len, y: 0, z: 0} ];
    const edges = [ [0,1], [0,2], [0,3], [0,4], [1,2], [2,3], [3,4], [4,1], [5,1], [5,2], [5,3], [5,4] ];
    
    ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
    ctx.beginPath(); 
    edges.forEach(([i, j]) => {
        const v1 = vertices[i];
        const v2 = vertices[j];
        // Custom rotation on X axis
        const rotX = (v: any) => { return {x: v.x, y: v.y * Math.cos(spin) - v.z * Math.sin(spin), z: v.y * Math.sin(spin) + v.z * Math.cos(spin)} };
        const p1 = projectSimple(rotX(v1)); 
        const p2 = projectSimple(rotX(v2)); 
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    }); 
    ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); const tail = vertices[5]; ctx.arc(tail.x, 0, 2, 0, Math.PI*2); ctx.fill(); 
    ctx.restore();
};

export const drawDrone = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save(); 
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1); 
    ctx.rotate((e.rotation || 0) + Math.PI / 2);
    
    const isElite = e.enemyType === EnemyType.ELITE_DRONE; 
    const spin = frame * (isElite ? 0.1 : 0.05); 
    const tilt = Math.sin(frame * 0.05) * 0.2;
    
    let vertices: {x:number, y:number, z:number}[] = []; 
    let edges: number[][] = [];
    
    if (isElite) {
        const r = e.radius * 0.8; vertices = [ {x:0, y:-r*1.2, z:0}, {x:r, y:0, z:0}, {x:0, y:0, z:r}, {x:-r, y:0, z:0}, {x:0, y:0, z:-r}, {x:0, y:r*1.2, z:0} ];
        edges = [ [0,1],[0,2],[0,3],[0,4], [5,1],[5,2],[5,3],[5,4], [1,2],[2,3],[3,4],[4,1] ];
    } else {
        const r = e.radius; vertices = [ {x:0, y:-r, z:0}, {x:r*0.7, y:r*0.5, z:r*0.7}, {x:-r*0.7, y:r*0.5, z:r*0.7}, {x:0, y:r*0.5, z:-r*0.7} ];
        edges = [ [0,1],[0,2],[0,3], [1,2],[2,3],[3,1] ];
    }
    
    ctx.strokeStyle = e.color; 
    ctx.fillStyle = isElite ? 'rgba(255, 150, 0, 0.2)' : 'rgba(0,0,0,0.5)'; 
    ctx.lineWidth = 2; 
    ctx.lineJoin = 'round';
    
    ctx.beginPath(); 
    edges.forEach(([i, j]) => {
        // Project with custom rotation parameters
        const p1 = project3D(vertices[i].x, vertices[i].y, vertices[i].z, tilt, spin, 0);
        const p2 = project3D(vertices[j].x, vertices[j].y, vertices[j].z, tilt, spin, 0);
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    }); 
    ctx.stroke(); ctx.fill();
    
    ctx.fillStyle = isElite ? '#fff' : '#ffaa00'; 
    ctx.beginPath(); ctx.arc(0, 0, isElite ? 4 : 2, 0, Math.PI*2); ctx.fill(); 
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
        {x:0, y:-r, z:0}, {x:0, y:r, z:0}, // Top/Bottom
        {x:r, y:0, z:0}, {x:-r, y:0, z:0}, // Width
        {x:0, y:0, z:r}, {x:0, y:0, z:-r}  // Depth
    ];

    // Project
    const proj = verts.map(v => project3D(v.x, v.y, v.z, tilt, spin, 0, 300));

    const edges = [
        [0,2], [0,3], [0,4], [0,5], // Top pyramid
        [1,2], [1,3], [1,4], [1,5], // Bottom pyramid
        [2,4], [4,3], [3,5], [5,2]  // Equator
    ];

    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    edges.forEach(([i, j]) => {
        ctx.moveTo(proj[i].x, proj[i].y);
        ctx.lineTo(proj[j].x, proj[j].y);
    });
    ctx.stroke();

    // Red "Eye" Core
    ctx.fillStyle = e.state === 'ATTACK' ? '#FF0000' : '#550000';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = e.state === 'ATTACK' ? 20 : 0;
    
    const center = project3D(0, 0, 0, tilt, spin, 0, 300);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r * 0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

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
            ctx.arc((Math.random()-0.5)*10, (Math.random()-0.5)*10, r, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.globalAlpha = opacity; 
    ctx.strokeStyle = e.color; 
    ctx.lineWidth = 2; 
    ctx.beginPath();
    for(let i=0; i<8; i++) { 
        const a = (i/8)*Math.PI*2; 
        const r = e.radius * (0.8 + Math.random()*0.4); 
        if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); 
        else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); 
    }
    ctx.closePath(); 
    ctx.stroke(); 
    ctx.globalAlpha = 1;
};

export const drawTank = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(e.rotation || 0); const traceOctagon = (r: number, rot: number) => { for(let i=0; i<8; i++) { const angle = (i/8) * Math.PI * 2 + rot; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); };
    ctx.fillStyle = '#000000'; ctx.beginPath(); traceOctagon(e.radius, Math.PI/8); ctx.fill();
    ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 2; ctx.beginPath(); traceOctagon(e.radius, Math.PI/8); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#cc5200'; ctx.beginPath(); traceOctagon(e.radius * 0.8, Math.PI/8); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = COLORS.orange;
    for(let i=0; i<8; i++) { const angle = (i/8) * Math.PI * 2 + Math.PI/8; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * e.radius * 0.4, Math.sin(angle) * e.radius * 0.4); ctx.lineTo(Math.cos(angle) * e.radius, Math.sin(angle) * e.radius); ctx.stroke(); }
    const turretR = e.radius * 0.45; const spin = frame * 0.01;
    ctx.fillStyle = '#1a0d00'; ctx.beginPath(); traceOctagon(turretR, spin); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); traceOctagon(turretR, spin); ctx.stroke();
    ctx.fillStyle = '#ff3300'; ctx.beginPath(); ctx.rect(-5, -5, 10, 10); ctx.fill();
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
    
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1;
    
    // Draw 5 chaotic orbiting shards
    for(let i=0; i<count; i++) {
        const offset = (i / count) * Math.PI * 2;
        
        // Oscillation
        const r = e.radius * (0.8 + Math.sin(t * 2 + offset) * 0.4);
        
        const x = Math.cos(offset + t) * r;
        const y = Math.sin(offset + t * 1.5) * r;
        const z = Math.sin(offset * 2 + t) * r;
        
        // Triangle Shard
        const s = 4;
        const v1 = project3D(x, y-s, z, rotX, rotY, 0, 200);
        const v2 = project3D(x-s, y+s, z, rotX, rotY, 0, 200);
        const v3 = project3D(x+s, y+s, z, rotX, rotY, 0, 200);
        
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.lineTo(v3.x, v3.y);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Core dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();
};

export const drawNeonCobra = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    ctx.rotate(e.rotation || 0);

    const t = frame * 0.05;
    const scale = e.radius;
    
    // Parse color for segments
    const rgb = parseColorToRgb(e.color) || {r: 255, g: 0, b: 204};

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
        {x: h, y: 0, z: 0}, // Tip
        {x: -h*0.5, y: w, z: w},
        {x: -h*0.5, y: w, z: -w},
        {x: -h*0.5, y: -w, z: -w},
        {x: -h*0.5, y: -w, z: w}
    ];

    const pHead = headVerts.map(v => project3D(v.x, v.y, v.z, headRotX, headRotY, 0, 200));

    // Draw Head
    ctx.strokeStyle = e.color || '#FF00CC';
    ctx.fillStyle = e.color || '#FF00CC'; // Use enemy color (Pink/Magenta)
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    const headEdges = [
        [0,1], [0,2], [0,3], [0,4], // Tip connections
        [1,2], [2,3], [3,4], [4,1]  // Base connections
    ];

    ctx.beginPath();
    headEdges.forEach(([i, j]) => {
        ctx.moveTo(pHead[i].x, pHead[i].y);
        ctx.lineTo(pHead[j].x, pHead[j].y);
    });
    ctx.fill();
    ctx.stroke();

    // --- TAIL SEGMENTS (3D Cubes) ---
    const segments = 6;
    const segSize = scale * 0.5; // Cube radius

    for(let i=1; i<=segments; i++) {
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
            {x:s, y:s, z:s}, {x:s, y:s, z:-s}, {x:s, y:-s, z:s}, {x:s, y:-s, z:-s},
            {x:-s, y:s, z:s}, {x:-s, y:s, z:-s}, {x:-s, y:-s, z:s}, {x:-s, y:-s, z:-s}
        ];

        // Project and Translate
        const pCube = cubeVerts.map(v => {
            const p = project3D(v.x, v.y, v.z, segRotX, segRotY, 0, 200);
            return { x: p.x + xOffset, y: p.y + yOffset };
        });

        const alpha = 0.8 - (i * 0.1);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha + 0.2})`;

        const cubeEdges = [
            [0,1], [0,2], [0,4], // Corner 0
            [1,3], [1,5],
            [2,3], [2,6],
            [3,7],
            [4,5], [4,6],
            [5,7],
            [6,7]
        ];

        ctx.beginPath();
        cubeEdges.forEach(([a, b]) => {
            ctx.moveTo(pCube[a].x, pCube[a].y);
            ctx.lineTo(pCube[b].x, pCube[b].y);
        });
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
};

export const drawInfernoSpinner = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(frame * 0.3); const bladeCount = 3; ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#882200'; ctx.strokeStyle = '#ff8800';
    for(let i=0; i<bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2; ctx.save(); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0, -e.radius * 0.4); ctx.lineTo(e.radius * 0.5, -e.radius * 1.2); ctx.lineTo(-e.radius * 0.5, -e.radius * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)'; ctx.beginPath(); ctx.arc(0, -e.radius, e.radius * 0.3, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
};

export const drawBinarySentinel = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    let separation = e.radius; let angle = frame * 0.05; let nodeRadius = e.radius * 0.6; 
    if (e.binaryData) { angle = e.binaryData.angle; separation = e.binaryData.separation / 2; nodeRadius = e.binaryData.nodeRadius; }
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    for(let dir of [-1, 1]) { const x = dir * separation * cos; const y = dir * separation * sin; ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#222'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, nodeRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4 + Math.sin(frame * 0.5) * 2; ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.beginPath();
    const startX = -separation * cos; const startY = -separation * sin; const endX = separation * cos; const endY = separation * sin; ctx.moveTo(startX, startY);
    const steps = 10; const stepX = (endX - startX) / steps; const stepY = (endY - startY) / steps;
    for (let i = 1; i < steps; i++) { const jitter = (Math.random() - 0.5) * 10; ctx.lineTo(startX + stepX * i + jitter, startY + stepY * i + jitter); }
    ctx.lineTo(endX, endY); ctx.stroke(); ctx.shadowBlur = 0;
};

export const drawLaserLotus = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.rotate(e.rotation || 0); ctx.fillStyle = '#ff0055'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    for(let i=0; i<6; i++) { const a = i * Math.PI / 3; const r = e.radius * 0.4; if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    const petals = 6; ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 1.5;
    for(let i=0; i<petals; i++) {
        const angle = (i/petals) * Math.PI * 2; const pulse = Math.sin(frame * 0.1 + i) * 2; ctx.save(); ctx.rotate(angle); ctx.beginPath();
        const inner = e.radius * 0.5 + pulse; const outer = e.radius * 1.2; const width = e.radius * 0.3;
        ctx.moveTo(inner, 0); ctx.lineTo((inner + outer)/2, width); ctx.lineTo(outer, 0); ctx.lineTo((inner + outer)/2, -width); ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 85, 0.15)'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(e.radius * 0.4, 0); ctx.lineTo(inner, 0); ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
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
        {x: 2*scale, y: 0, z: 0}, // Front tip
        {x: -scale, y: 0.5*scale, z: 0.5*scale}, // Back Top Right
        {x: -scale, y: -0.5*scale, z: 0.5*scale}, // Back Bottom Right
        {x: -scale, y: -0.5*scale, z: -0.5*scale}, // Back Bottom Left
        {x: -scale, y: 0.5*scale, z: -0.5*scale} // Back Top Left
    ];

    const proj = verts.map(v => project3D(v.x, v.y, v.z, rX, 0, 0, 300));

    // Draw Hull
    ctx.strokeStyle = e.state === 'AIMING' ? '#FF0000' : '#00FF00';
    ctx.fillStyle = 'rgba(0, 50, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Connect Tip to back plate
    for(let i=1; i<=4; i++) {
        ctx.moveTo(proj[0].x, proj[0].y);
        ctx.lineTo(proj[i].x, proj[i].y);
    }
    // Connect Back plate
    ctx.moveTo(proj[1].x, proj[1].y);
    ctx.lineTo(proj[2].x, proj[2].y);
    ctx.lineTo(proj[3].x, proj[3].y);
    ctx.lineTo(proj[4].x, proj[4].y);
    ctx.lineTo(proj[1].x, proj[1].y);
    
    ctx.fill();
    ctx.stroke();

    // Engine Glow
    const backCenter = {x: -scale * 1.2, y: 0};
    ctx.fillStyle = '#00FF00';
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(backCenter.x, backCenter.y, scale * 0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

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
        {x: 1, y: 1, z: 1},
        {x: 1, y: -1, z: -1},
        {x: -1, y: 1, z: -1},
        {x: -1, y: -1, z: 1}
    ];
    
    const projected = verts.map(v => project3D(v.x * scale * 0.7, v.y * scale * 0.7, v.z * scale * 0.7, rotX, rotY, 0, 300));
    
    const edges = [[0,1], [0,2], [0,3], [1,2], [2,3], [3,1]];
    
    // Draw wireframe with purple outline
    ctx.strokeStyle = '#9900FF';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#9900FF';
    ctx.shadowBlur = 10;
    
    // Fill faces semi-transparently
    ctx.fillStyle = 'rgba(20, 0, 40, 0.8)';
    
    // Draw faces
    const faces = [[0,1,2], [0,2,3], [0,3,1], [1,3,2]];
    
    // Z-Sort faces
    const sortedFaces = faces.map(indices => {
        const v0 = projected[indices[0]];
        const v1 = projected[indices[1]];
        const v2 = projected[indices[2]];
        const depth = (v0.depth + v1.depth + v2.depth) / 3;
        return { indices, depth, v0, v1, v2 };
    }).sort((a, b) => a.depth - b.depth); // Draw furthest first
    
    sortedFaces.forEach(face => {
        ctx.beginPath();
        ctx.moveTo(face.v0.x, face.v0.y);
        ctx.lineTo(face.v1.x, face.v1.y);
        ctx.lineTo(face.v2.x, face.v2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    ctx.shadowBlur = 0;
    
    // If attacking (linked), glow brighter
    if (e.state === 'ATTACK') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI*2);
        ctx.fill();
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
        {x: 1, y: 1, z: 1}, {x: 1, y: 1, z: -1}, {x: 1, y: -1, z: 1}, {x: 1, y: -1, z: -1},
        {x: -1, y: 1, z: 1}, {x: -1, y: 1, z: -1}, {x: -1, y: -1, z: 1}, {x: -1, y: -1, z: -1}
    ];
    
    // Project
    const projected = verts.map(v => project3D(v.x * scale, v.y * scale, v.z * scale, rx, ry, rz, 300));
    
    // Edges
    const edges = [
        [0,1], [0,2], [0,4], 
        [1,3], [1,5], 
        [2,3], [2,6], 
        [3,7], 
        [4,5], [4,6], 
        [5,7], 
        [6,7]
    ];
    
    ctx.strokeStyle = '#00FF00'; // Glitch Green
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 5;
    
    ctx.beginPath();
    edges.forEach(([i, j]) => {
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
    });
    ctx.stroke();
    
    // Inner Cube (Dark)
    ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    // Simple hull approximation for fill (using first 4 projected points)
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    ctx.lineTo(projected[2].x, projected[2].y);
    ctx.lineTo(projected[6].x, projected[6].y);
    ctx.lineTo(projected[4].x, projected[4].y);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
};

export const drawMandelbrotMite = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.save();
    const gen = e.miteData?.generation || 0;
    const scale = e.radius;
    const t = frame * 0.05 + e.id.charCodeAt(0);

    // Color based on generation + time
    // Gen 0: Cyan/Blue, Gen 1: Purple/Pink, Gen 2: Red/Orange
    const baseHue = 180 + (gen * 60) + Math.sin(t * 0.5) * 20;
    const color = `hsla(${baseHue}, 100%, 60%, 0.8)`;
    const glow = `hsla(${baseHue}, 100%, 80%, 0.4)`;

    // Pulsating scale
    const pulse = 1 + Math.sin(t * 2) * 0.1;
    ctx.scale(pulse, pulse);

    // Use lighter composite for "energy" look
    ctx.globalCompositeOperation = 'lighter';

    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.fillStyle = glow;

    // Recursive Geometry: Fractal Star
    const drawFractalLayer = (r: number, depth: number, rotation: number) => {
        if (depth === 0) return;
        ctx.save();
        ctx.rotate(rotation);
        
        ctx.beginPath();
        for(let i=0; i<3; i++) {
            const a = (i/3) * Math.PI * 2 - Math.PI/2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sub-layers
        if (depth > 1) {
            drawFractalLayer(r * 0.5, depth - 1, t * (depth % 2 === 0 ? 1 : -1));
        }
        ctx.restore();
    };

    // Draw 2 interlocking triangles (Star of David style) but recursive
    // Rotate counter to each other
    drawFractalLayer(scale, 2, t);
    drawFractalLayer(scale, 2, -t + Math.PI/3); // Offset by 60deg

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
    
    const project = (v: {x:number, y:number, z:number}) => project3D(v.x, v.y, v.z, rotX, rotY, rotZ, 400);

    // Outer Prism (Diamond/Crystal shape)
    // Top tip, Base mid points, Bottom tip
    const outerVerts = [
        {x:0, y:-h, z:0}, // Top
        {x:w, y:0, z:w*0.6}, {x:-w, y:0, z:w*0.6}, {x:0, y:0, z:-w}, // Mid ring
        {x:0, y:h, z:0} // Bottom
    ];
    
    const pOuter = outerVerts.map(project);
    
    // Inner Prism (Inverted/Smaller/Counter-rotating)
    // We calculate rotation manually for inner core
    const innerRotY = -t * 2;
    const innerH = h * 0.5;
    const innerW = w * 0.5;
    const innerVerts = [
        {x:0, y:-innerH, z:0},
        {x:innerW, y:0, z:innerW}, {x:-innerW, y:0, z:innerW}, {x:0, y:0, z:-innerW},
        {x:0, y:innerH, z:0}
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
        
        ctx.strokeStyle = isInner ? '#FFFFFF' : edgeColor;
        ctx.fillStyle = isInner ? '#FFFFFF' : faceColor;
        
        if (isInner) ctx.shadowBlur = 15;
        if (isInner) ctx.shadowColor = edgeColor;

        // Draw Faces (Top Pyramid)
        // Correct draw order for simple transparency: Back faces first? 
        // Just draw all, the alpha handles the look for this style
        
        const faces = [
            [top, mid[0], mid[1]], [top, mid[1], mid[2]], [top, mid[2], mid[0]], // Top
            [bot, mid[0], mid[1]], [bot, mid[1], mid[2]], [bot, mid[2], mid[0]]  // Bottom
        ];
        
        faces.forEach(face => {
            ctx.beginPath();
            ctx.moveTo(face[0].x, face[0].y);
            ctx.lineTo(face[1].x, face[1].y);
            ctx.lineTo(face[2].x, face[2].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
        
        ctx.shadowBlur = 0;
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
    for(let i=0; i<3; i++) {
        ctx.beginPath();
        const yOff = (i-1) * 20;
        ctx.ellipse(0, yOff, w * 1.5, w * 0.5, t + i, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
};

export const drawDefault = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    ctx.strokeStyle = e.color || '#fff'; ctx.lineWidth = 2; 
    ctx.scale(1 + Math.sin(frame * 0.1) * 0.1, 1 + Math.sin(frame * 0.1) * 0.1); 
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.stroke(); 
};
