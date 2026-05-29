
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

export const drawSolarSeraph = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const scale = e.radius * 0.7;
    const t = frame * 0.03;
    const bob = Math.sin(t) * 10;
    const rotY = Math.sin(frame * 0.01) * 0.3;
    const rotX = 0.2; 

    const vertices: {x:number, y:number, z:number, type: 'CORE' | 'WING' | 'WIRE'}[] = [];
    const edges: {p1:number, p2:number, color: string, alpha: number}[] = [];

    vertices.push({x:0, y: -1000, z:0, type: 'WIRE'});
    vertices.push({x:0, y: -1.5 * scale, z:0, type: 'WIRE'});
    edges.push({p1:0, p2:1, color: '#FF4500', alpha: 0.5});

    const segments = 6;
    const bodyTopIdx = vertices.length;
    for(let i=0; i<=segments; i++) {
        const y = -1.5 * scale + (i / segments) * 3.0 * scale;
        vertices.push({x:0, y, z:0, type: 'CORE'});
        
        const w = (1 - Math.abs((i/segments) - 0.5)*2) * 0.6 * scale + 0.2*scale; 
        vertices.push({x: w, y, z: 0, type: 'CORE'});
        vertices.push({x: -w, y, z: 0, type: 'CORE'});
        vertices.push({x: 0, y, z: w, type: 'CORE'});
        vertices.push({x: 0, y, z: -w, type: 'CORE'});
    }
    
    const pointsPerSeg = 5;
    for(let i=0; i<segments; i++) {
        const base = bodyTopIdx + i * pointsPerSeg;
        const next = base + pointsPerSeg;
        
        edges.push({p1: base, p2: next, color: '#FFFFFF', alpha: 1.0});
        
        edges.push({p1: base+1, p2: base+3, color: '#FF8800', alpha: 0.8}); 
        edges.push({p1: base+3, p2: base+2, color: '#FF8800', alpha: 0.8}); 
        edges.push({p1: base+2, p2: base+4, color: '#FF8800', alpha: 0.8}); 
        edges.push({p1: base+4, p2: base+1, color: '#FF8800', alpha: 0.8}); 
        
        for(let j=1; j<=4; j++) {
            edges.push({p1: base+j, p2: next+j, color: '#FF4500', alpha: 0.6});
        }
    }

    const wingRows = 4;
    const wingCols = 8;
    const wingSpread = 3.5 * scale;
    const flap = Math.sin(t * 1.5) * 0.2;
    
    [1, -1].forEach(side => {
        const startIdx = vertices.length;
        
        for(let r=0; r<wingRows; r++) {
            for(let c=0; c<wingCols; c++) {
                const u = c / (wingCols - 1); 
                const v = r / (wingRows - 1); 
                
                const span = u * wingSpread;
                let wx = side * (0.5 * scale + span);
                let wy = -0.5 * scale - (Math.sin(u * Math.PI * 0.6) * 1.5 * scale);
                wy += (v - 0.5) * (0.5 * scale + u * scale); 
                
                let wz = Math.abs(side * u * scale * 0.5) + (v-0.5)*scale*0.5; 
                
                const pivotX = side * 0.5 * scale;
                const pivotY = -0.5 * scale;
                
                let dx = wx - pivotX;
                let dy = wy - pivotY;
                
                const angle = flap * side * (1 - u*0.5); 
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                
                const nx = dx * cosA - dy * sinA;
                const ny = dx * sinA + dy * cosA;
                
                wx = pivotX + nx;
                wy = pivotY + ny;

                vertices.push({x: wx, y: wy, z: wz, type: 'WING'});
            }
        }
        
        for(let r=0; r<wingRows; r++) {
            for(let c=0; c<wingCols; c++) {
                const curr = startIdx + r*wingCols + c;
                
                if(c < wingCols - 1) {
                    const next = curr + 1;
                    edges.push({p1: curr, p2: next, color: '#FFD700', alpha: 0.9}); 
                }
                
                if(r < wingRows - 1) {
                    const below = curr + wingCols;
                    edges.push({p1: curr, p2: below, color: '#FF4500', alpha: 0.4}); 
                }
            }
        }
    });

    const projected = vertices.map(v => {
        let px = v.x;
        let py = v.y + bob; 
        let pz = v.z;
        return { ...project3D(px, py, pz, rotX, rotY, 0, 400), type: v.type };
    });

    const renderList = edges.map(e => {
        const v1 = projected[e.p1];
        const v2 = projected[e.p2];
        const depth = (v1.depth + v2.depth) / 2;
        return { v1, v2, depth, color: e.color, alpha: e.alpha };
    });

    renderList.sort((a, b) => a.depth - b.depth);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    renderList.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.v1.x, e.v1.y);
        ctx.lineTo(e.v2.x, e.v2.y);
        
        if (e.depth < 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = e.color;
            ctx.strokeStyle = e.color;
            ctx.globalAlpha = e.alpha;
            ctx.lineWidth = 2;
        } else {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = e.color;
            ctx.globalAlpha = e.alpha * 0.5; 
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    });
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    projected.forEach(p => {
        if (p.type === 'WIRE') return;
        const size = (p.depth < 0 ? 3 : 1.5) * p.scale;
        const alpha = p.depth < 0 ? 1.0 : 0.5;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        if (p.type === 'CORE' && p.depth < 0) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
    
    ctx.globalAlpha = 1.0;
};
