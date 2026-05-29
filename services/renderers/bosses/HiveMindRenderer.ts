
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

export const drawHiveMind = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const t = frame * 0.01;
    const rotX = Math.sin(t * 0.3) * 0.3;
    const rotY = t * 0.5;
    const rotZ = Math.cos(t * 0.4) * 0.1;
    
    const scale = e.radius * 0.45; 

    interface Prism {
        cx: number; cy: number; cz: number; 
        r: number; h: number; 
        color: string; isCore: boolean; pulseOffset: number;
    }

    const prisms: Prism[] = [];
    
    prisms.push({ cx: 0, cy: 0, cz: 0, r: 1.3, h: 2.5, color: '#FF8800', isCore: true, pulseOffset: 0 });

    for(let i=0; i<6; i++) {
        const theta = (i / 6) * Math.PI * 2;
        const d = 2.0; 
        prisms.push({ 
            cx: Math.cos(theta) * d, cy: Math.sin(theta) * d, cz: 0, 
            r: 0.95, 
            h: 1.8, 
            color: '#FF4500', // OrangeRed
            isCore: false,
            pulseOffset: i
        });
    }

    for(let i=0; i<3; i++) {
        const theta = (i / 3) * Math.PI * 2 + (Math.PI/6);
        const d = 1.2;
        const zOffset = 1.4;
        prisms.push({ cx: Math.cos(theta)*d, cy: Math.sin(theta)*d, cz: zOffset, r: 0.8, h: 1.0, color: '#FF2200', isCore: false, pulseOffset: i+6 });
        prisms.push({ cx: Math.cos(theta)*d, cy: Math.sin(theta)*d, cz: -zOffset, r: 0.8, h: 1.0, color: '#8B0000', isCore: false, pulseOffset: i+9 });
    }

    const allEdges: {p1: any, p2: any, depth: number, color: string, width: number, alpha: number}[] = [];
    const allNodes: {x: number, y: number, depth: number, color: string, size: number}[] = [];

    prisms.forEach(prism => {
        const { cx, cy, cz, r, h, color, isCore, pulseOffset } = prism;
        const cellPulse = 1 + Math.sin(frame * 0.1 + pulseOffset) * 0.03;
        const effR = r * scale * cellPulse;
        const effH = h * scale;
        
        const spread = scale * 1.4;
        const posX = cx * spread;
        const posY = cy * spread;
        const posZ = cz * spread;

        const vertices: {x:number, y:number, z:number}[] = [];
        for(let i=0; i<6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const vx = Math.cos(angle) * effR;
            const vy = Math.sin(angle) * effR;
            vertices.push({ x: posX + vx, y: posY + vy, z: posZ + effH/2 });
            vertices.push({ x: posX + vx, y: posY + vy, z: posZ - effH/2 });
        }

        const projected = vertices.map(v => project3D(v.x, v.y, v.z, rotX, rotY, rotZ, 400));

        for(let i=0; i<6; i++) {
            const currTop = i*2;
            const currBot = i*2 + 1;
            const nextTop = ((i+1)%6)*2;
            const nextBot = ((i+1)%6)*2 + 1;

            const pTop = projected[currTop];
            const pBot = projected[currBot];
            const pNextTop = projected[nextTop];
            const pNextBot = projected[nextBot];

            const addEdge = (p1: any, p2: any) => {
                allEdges.push({
                    p1, p2,
                    depth: (p1.depth + p2.depth) / 2,
                    color: color,
                    width: isCore ? 3 : 1.5,
                    alpha: isCore ? 1.0 : 0.8
                });
            };

            addEdge(pTop, pNextTop);
            addEdge(pBot, pNextBot);
            addEdge(pTop, pBot);

            if (pTop.depth < 0) allNodes.push({x: pTop.x, y: pTop.y, depth: pTop.depth, color: '#FFFFFF', size: (isCore?4:2)*pTop.scale});
            if (pBot.depth < 0) allNodes.push({x: pBot.x, y: pBot.y, depth: pBot.depth, color: '#FFFFFF', size: (isCore?4:2)*pBot.scale});
        }
    });

    const centerP = project3D(0, 0, 0, rotX, rotY, rotZ, 400);

    allEdges.sort((a, b) => a.depth - b.depth);
    allNodes.sort((a, b) => a.depth - b.depth);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    allEdges.forEach(e => {
        if (e.depth >= 0) { 
            ctx.beginPath();
            ctx.moveTo(e.p1.x, e.p1.y);
            ctx.lineTo(e.p2.x, e.p2.y);
            ctx.strokeStyle = e.color;
            ctx.lineWidth = e.width * 0.8;
            ctx.globalAlpha = e.alpha * 0.3;
            ctx.stroke();
        }
    });

    if (centerP.depth < 50) {
        const glowSize = 30 * scale * centerP.scale * (1 + Math.sin(frame*0.2)*0.2);
        const grad = ctx.createRadialGradient(centerP.x, centerP.y, 0, centerP.x, centerP.y, glowSize);
        grad.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(centerP.x, centerP.y, glowSize, 0, Math.PI*2); ctx.fill();
    }

    allEdges.forEach(e => {
        if (e.depth < 0) { 
            ctx.beginPath();
            ctx.moveTo(e.p1.x, e.p1.y);
            ctx.lineTo(e.p2.x, e.p2.y);
            ctx.strokeStyle = e.color;
            ctx.lineWidth = e.width;
            ctx.globalAlpha = e.alpha;
            if (e.width > 2) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = e.color;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
    ctx.globalAlpha = 1.0;

    allNodes.forEach(n => {
        if (n.depth < 10) {
            ctx.fillStyle = n.color;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI*2);
            ctx.fill();
        }
    });
};
