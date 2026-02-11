
import { Obstacle } from '../../types';
import { project3D, parseColorToRgb } from '../renderUtils';

export const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, frame: number, gridColor: string) => {
    // 3D Tower Rendering
    // Shapes: BOX or HEX or CYLINDER
    // We'll treat cylinder as multi-sided polygon (e.g. 12 sides)
    
    const sides = obs.shape === 'BOX' ? 4 : (obs.shape === 'HEX' ? 6 : 12);
    const radius = obs.radius * 0.8; // Visual radius slightly smaller than collision
    const height = obs.height;
    
    // Parallax rotation based on camera pos?
    // We already have camera transform applied in renderService context
    // But we need 3D projection.
    // We assume the obs is at (0,0) due to context translation
    
    // Slight slow rotation for "Data" feel
    const angleOffset = obs.rotation + frame * obs.rotationSpeed;
    
    // Vertices
    const topVerts: {x:number, y:number, z:number}[] = [];
    const botVerts: {x:number, y:number, z:number}[] = [];
    
    for(let i=0; i<sides; i++) {
        const angle = angleOffset + (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius; // Z is depth
        
        topVerts.push({ x, y: -height, z }); // Y up is negative
        botVerts.push({ x, y: 0, z });
    }
    
    // Project
    // Static rotation for perspective (tilt)
    const tiltX = 0.5; // Look down
    const tiltY = 0;   // No spin of world, just object spin
    
    const project = (v: {x:number, y:number, z:number}) => project3D(v.x, v.y, v.z, tiltX, tiltY, 0, 600);
    
    const pTop = topVerts.map(project);
    const pBot = botVerts.map(project);
    
    // Faces
    // We need to draw side faces then top cap
    // Simple painter's algo: draw back faces first?
    // Actually, cylinder/convex shape: simple sorting by Z might work, or just draw all sides with transparency
    
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    
    // Parse grid color for dynamic tinting
    const rgb = parseColorToRgb(gridColor) || {r: 0, g: 255, b: 255};
    
    // Draw Sides
    for(let i=0; i<sides; i++) {
        const next = (i + 1) % sides;
        
        const p1 = pTop[i];
        const p2 = pTop[next];
        const p3 = pBot[next];
        const p4 = pBot[i];
        
        // Color based on height/index for "digital rain" effect
        const alpha = 0.1 + Math.abs(Math.sin(i + frame * 0.05)) * 0.1;
        
        // Use biome grid color for fill/stroke
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
    }
    
    // Draw Top Cap
    ctx.beginPath();
    ctx.moveTo(pTop[0].x, pTop[0].y);
    for(let i=1; i<sides; i++) ctx.lineTo(pTop[i].x, pTop[i].y);
    ctx.closePath();
    
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
    ctx.fill();
    ctx.stroke();
    
    // Draw Base (Shadow/Ground connection)
    ctx.beginPath();
    ctx.moveTo(pBot[0].x, pBot[0].y);
    for(let i=1; i<sides; i++) ctx.lineTo(pBot[i].x, pBot[i].y);
    ctx.closePath();
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    ctx.stroke();
};
