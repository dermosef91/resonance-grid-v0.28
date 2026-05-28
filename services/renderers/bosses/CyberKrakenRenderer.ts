
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';
import { neonStroke, neonOrb } from '../neonRender';

export const drawCyberKraken = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const t = frame * 0.02;
    const scale = e.radius * 0.6;
    const colMain = '#FF4500'; 
    const colHighlight = '#FFD700'; 
    const colNode = '#FFFFFF'; 

    const headBob = Math.sin(t * 2) * 5;
    const tiltX = Math.sin(t) * 0.1;
    const tiltZ = Math.cos(t * 0.8) * 0.1;

    const headTop = { x: 0, y: -3.0 * scale, z: 0 };
    const headMidRing: {x:number, y:number, z:number}[] = [];
    const ringSides = 6;
    for(let i=0; i<ringSides; i++) {
        const ang = (i/ringSides) * Math.PI * 2;
        headMidRing.push({ 
            x: Math.cos(ang) * scale * 1.5, 
            y: -1.2 * scale, 
            z: Math.sin(ang) * scale * 1.5 
        });
    }
    const headBottom = { x: 0, y: 0, z: 0 };

    const tentacles: {x:number, y:number, z:number}[][] = [];
    const numTentacles = 8;
    const segs = 10;
    
    for(let i=0; i<numTentacles; i++) {
        const baseAng = (i/numTentacles) * Math.PI * 2 + t * 0.5;
        const pts = [headBottom];
        
        for(let j=0; j<segs; j++) {
            const wave = Math.sin(t * 3 + j * 0.5 + i) * (j * 2);
            const spread = (j / segs) * (scale * 3.5);
            const r = spread + scale * 0.5;
            const theta = baseAng + Math.sin(t + j*0.2)*0.5;
            
            const px = Math.cos(theta) * r;
            const pz = Math.sin(theta) * r;
            const py = (j * scale * 0.5) + wave; 
            
            pts.push({ x: px, y: py, z: pz });
        }
        tentacles.push(pts);
    }

    const project = (v: {x:number, y:number, z:number}) => {
        const vy = v.y + headBob;
        const y1 = vy * Math.cos(tiltX) - v.z * Math.sin(tiltX);
        const z1 = vy * Math.sin(tiltX) + v.z * Math.cos(tiltX);
        const x2 = v.x * Math.cos(tiltZ) - y1 * Math.sin(tiltZ);
        const y2 = v.x * Math.sin(tiltZ) + y1 * Math.cos(tiltZ);
        return project3D(x2, y2, z1, 0.5, 0, 0, 400);
    };

    const pHeadTop = project(headTop);
    const pHeadRing = headMidRing.map(project);
    const pHeadBottom = project(headBottom);
    const pTentacles = tentacles.map(arm => arm.map(project));

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pTentacles.forEach(arm => {
        neonStroke(ctx, (c) => {
            for(let i=0; i<arm.length-1; i++) {
                c.moveTo(arm[i].x, arm[i].y);
                c.lineTo(arm[i+1].x, arm[i+1].y);
            }
        }, colMain, { width: 1.5, glow: false, core: false });

        arm.forEach((p, idx) => {
            if (idx === 0) return;
            const size = Math.max(1, 3 - idx * 0.2);
            neonOrb(ctx, p.x, p.y, size * p.scale, (idx % 3 === 0) ? colNode : colHighlight);
        });
    });

    neonStroke(ctx, (c) => {
        pHeadRing.forEach(p => {
            c.moveTo(pHeadTop.x, pHeadTop.y);
            c.lineTo(p.x, p.y);
        });
        pHeadRing.forEach(p => {
            c.moveTo(pHeadBottom.x, pHeadBottom.y);
            c.lineTo(p.x, p.y);
        });
        for(let i=0; i<ringSides; i++) {
            const p1 = pHeadRing[i];
            const p2 = pHeadRing[(i+1)%ringSides];
            c.moveTo(p1.x, p1.y);
            c.lineTo(p2.x, p2.y);
        }
        c.moveTo(pHeadTop.x, pHeadTop.y);
        c.lineTo(pHeadBottom.x, pHeadBottom.y);
    }, colHighlight, { width: 2 });

    const allHeadPts = [pHeadTop, pHeadBottom, ...pHeadRing];
    allHeadPts.forEach(p => {
        neonOrb(ctx, p.x, p.y, 4 * p.scale, colNode);
    });

    neonOrb(ctx, pHeadBottom.x, pHeadBottom.y, 10, colMain, 0.5);
};
