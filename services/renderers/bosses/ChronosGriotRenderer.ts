
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

export const drawChronosGriot = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const auraSize = e.radius * (1.5 + Math.sin(frame * 0.05) * 0.1);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, auraSize);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.7, 'rgba(20, 10, 0, 0.8)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, auraSize, 0, Math.PI * 2); ctx.fill();

    const moteCount = 20;
    for (let i = 0; i < moteCount; i++) {
        const angle = (i / moteCount) * Math.PI * 2;
        const radiusBase = e.radius * 1.2;
        const timeOffset = Math.sin((frame * 0.05) + (i * 132)) * 30;
        const r = radiusBase + timeOffset;
        const mx = Math.cos(angle) * r;
        const my = Math.sin(angle) * r;
        
        const alpha = 0.5 + Math.sin(frame * 0.1 + i) * 0.5;
        ctx.fillStyle = i % 2 === 0 ? `rgba(255, 215, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(mx, my, 2, 2);
    }

    const bob = Math.sin(frame * 0.03) * 10;
    ctx.translate(0, bob);
    
    const drawRing = (radius: number, rx: number, ry: number, rz: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const px = Math.cos(theta) * radius;
            const pz = Math.sin(theta) * radius;
            const p = project3D(px, 0, pz, rx, ry, rz, 400); 
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    };

    const time = frame * 0.02;
    drawRing(e.radius * 1.2, Math.PI / 6, time, 0, '#CD7F32');
    drawRing(e.radius * 1.0, time * 1.5, 0, Math.PI / 8, '#FFD700');
    drawRing(e.radius * 0.8, time, time * 2, 0, '#FFFFFF');

    const coreSize = e.radius * 0.5;
    const verts = [
        { x: 0, y: coreSize * 1.5, z: 0 },
        { x: 0, y: -coreSize * 1.5, z: 0 },
        { x: coreSize, y: 0, z: 0 },
        { x: 0, y: 0, z: coreSize },
        { x: -coreSize, y: 0, z: 0 },
        { x: 0, y: 0, z: -coreSize }
    ];

    const coreRotY = frame * 0.05;
    const coreRotX = Math.sin(frame * 0.02) * 0.2;
    
    const pVerts = verts.map(v => project3D(v.x, v.y, v.z, coreRotX, coreRotY, 0, 400));
    const edges = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [3, 4], [4, 5], [5, 2]];

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#FFAA00'; 
    ctx.lineWidth = 2;
    
    ctx.beginPath(); ctx.moveTo(pVerts[0].x, pVerts[0].y); ctx.lineTo(pVerts[2].x, pVerts[2].y); ctx.lineTo(pVerts[3].x, pVerts[3].y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(pVerts[0].x, pVerts[0].y); ctx.lineTo(pVerts[3].x, pVerts[3].y); ctx.lineTo(pVerts[4].x, pVerts[4].y); ctx.closePath(); ctx.fill();

    ctx.beginPath();
    edges.forEach(([i, j]) => {
        ctx.moveTo(pVerts[i].x, pVerts[i].y);
        ctx.lineTo(pVerts[j].x, pVerts[j].y);
    });
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    const center = project3D(0, 0, 0, coreRotX, coreRotY, 0, 400);
    ctx.beginPath(); ctx.arc(center.x, center.y, 3, 0, Math.PI*2); ctx.fill();
};
