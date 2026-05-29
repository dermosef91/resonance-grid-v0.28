
import { Enemy, EnemyType } from '../../../types';
import { project3D } from '../../renderUtils';

// Helper for electric lines
const drawElectricLine = (ctx: CanvasRenderingContext2D, p1: {x:number, y:number}, p2: {x:number, y:number}, color: string, lineWidth: number) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const steps = Math.max(2, Math.floor(dist / 15));
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    
    for(let i=1; i<steps; i++) {
        const t = i / steps;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const jitter = (Math.random() - 0.5) * 6;
        
        ctx.lineTo(
            p1.x + dx*t + perpX * jitter, 
            p1.y + dy*t + perpY * jitter
        );
    }
    
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
};

export const drawTrinityPart = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    const t = frame * 0.03;
    const scale = e.radius;
    const type = e.enemyType;
    const isAggressor = e.trinityData?.role === 'AGGRESSOR';
    
    const baseColor = '#FF6600'; 
    const coreColor = '#FF0000'; 
    
    // State Props
    const expansion = e.trinityData?.expansion || 0; // For Cube
    const deformation = e.trinityData?.deformation || 0; // For Pyramid
    const gap = e.trinityData?.gap || 0; // For Orb

    // Rotation
    const spinSpeed = isAggressor ? 2.0 : 1.0;
    const rotX = t * 0.5 * spinSpeed;
    const rotY = t * 0.8 * spinSpeed;
    const rotZ = t * 0.3 * spinSpeed;

    ctx.save();
    
    // Calculate Center for Body
    // Note: Since we are at 0,0 local, project3D(0,0,0) returns 0,0. 
    const center = { x: 0, y: 0, scale: 1, depth: 0 }; 

    // --- DRAW 3D SHIELD (If not aggressor) ---
    if (!isAggressor) {
        const shieldRadius = scale * 1.8;
        const sTime = frame * 0.04; // Faster shield spin
        
        ctx.save();
        
        // 1. Energy Field Gradient (Fill)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shieldRadius);
        grad.addColorStop(0, 'rgba(255, 0, 0, 0.3)');   // Inner Red
        grad.addColorStop(0.7, 'rgba(255, 50, 0, 0.1)'); // Outer Orange-ish
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. 3D Wireframe Rings
        ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 + Math.sin(frame * 0.1) * 0.2})`;
        ctx.lineWidth = 2;
        // No shadowBlur here
        
        const ringSegments = 32;
        
        // Helper to draw a rotated circle
        const drawGreatCircle = (rx: number, ry: number, rz: number) => {
            ctx.beginPath();
            for(let i=0; i<=ringSegments; i++) {
                const theta = (i/ringSegments) * Math.PI * 2;
                // Circle on XY plane initially
                const cx = Math.cos(theta) * shieldRadius;
                const cy = Math.sin(theta) * shieldRadius;
                const cz = 0;
                
                // Project with specific rotation for this ring
                const p = project3D(cx, cy, cz, rx, ry, rz, 400);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        };

        // Draw 3 orthogonal-ish rings rotating on different axes
        drawGreatCircle(sTime, sTime * 0.5, 0);           // Tumbling X/Y
        drawGreatCircle(sTime + Math.PI/2, 0, sTime * 0.7); // Tumbling X/Z
        drawGreatCircle(0, sTime + Math.PI/3, sTime * 1.1); // Tumbling Y/Z
        
        ctx.restore();
    }

    // --- DRAW BODY (Main Shape) ---
    
    if (type === EnemyType.BOSS_TRINITY_CUBE) {
        // CUBE - Supports FRACTURE (8 sub-cubes)
        const baseS = scale * 0.8;
        
        // Define one cubelet geometry (centered at 0)
        const cubeletVerts = [
            {x:-1, y:-1, z:-1}, {x:1, y:-1, z:-1}, {x:1, y:1, z:-1}, {x:-1, y:1, z:-1},
            {x:-1, y:-1, z:1}, {x:1, y:-1, z:1}, {x:1, y:1, z:1}, {x:-1, y:1, z:1}
        ];
        const cubeletEdges = [
            [0,1], [1,2], [2,3], [3,0], [4,5], [5,6], [6,7], [7,4], [0,4], [1,5], [2,6], [3,7]
        ];

        if (expansion < 0.05) {
            // --- DRAW SINGLE UNIFIED CUBE ---
            // Draw one large cube when not expanded
            const projected = cubeletVerts.map(v => {
                // Scale vertex by baseS to get full size cube
                return project3D(v.x * baseS, v.y * baseS, v.z * baseS, rotX, rotY, rotZ, 400);
            });

            cubeletEdges.forEach(([i, j]) => {
                drawElectricLine(ctx, projected[i], projected[j], baseColor, 3.0); // Thick Orange
                drawElectricLine(ctx, projected[i], projected[j], '#FFFFFF', 1.0); // Thin White
            });

            // Core Glow
            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.arc(center.x, center.y, scale * 0.4, 0, Math.PI*2);
            ctx.fill();

        } else {
            // --- DRAW 8 SUB-CUBES (FRACTURED) ---
            // 8 offsets for the sub-cubes
            const offsets = [
                {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:1, y:-1, z:1}, {x:1, y:-1, z:-1},
                {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1}
            ];

            // Size of sub-cubes: If fully merged, total width is `baseS*2`. So each sub-cube is `baseS` wide.
            const subSize = baseS * 0.5; // Radius of sub-cube
            const spread = subSize + (expansion * baseS * 2.5);

            // Draw each sub-cube
            offsets.forEach(off => {
                const centerX = off.x * spread;
                const centerY = off.y * spread;
                const centerZ = off.z * spread;

                // Transform vertices of sub-cube
                const projected = cubeletVerts.map(v => {
                    // Local position
                    let lx = centerX + v.x * subSize;
                    let ly = centerY + v.y * subSize;
                    let lz = centerZ + v.z * subSize;
                    
                    // Global rotation (Group)
                    return project3D(lx, ly, lz, rotX, rotY, rotZ, 400);
                });

                // Draw without shadow
                cubeletEdges.forEach(([i, j]) => {
                    drawElectricLine(ctx, projected[i], projected[j], baseColor, 2.0);
                    drawElectricLine(ctx, projected[i], projected[j], '#FFFFFF', 1.0);
                });
            });

            // Core (Only visible if expanded)
            if (expansion > 0.1) {
                ctx.fillStyle = coreColor;
                ctx.beginPath();
                ctx.arc(center.x, center.y, scale * 0.3 * expansion, 0, Math.PI*2);
                ctx.fill();
            }
        }

    } else if (type === EnemyType.BOSS_TRINITY_PYRAMID) {
        // TETRAHEDRON - Supports DEFORMATION (Spear)
        const s = scale * 1.2;
        
        // Base geometry
        // Tip: (0, -s, 0)
        // Base triangle: Y = s
        
        // Standard Tetra
        const vTip = {x:0, y:-s, z:0};
        const vBase1 = {x:s, y:s, z:s};
        const vBase2 = {x:-s, y:s, z:s};
        const vBase3 = {x:0, y:s, z:-s};
        
        // Deformed: Base points move towards Y-axis (x=0, z=0)
        const lerp = (a: number, b: number, t: number) => a + (b-a)*t;
        
        const deformV = (v: {x:number, y:number, z:number}) => ({
            x: lerp(v.x, 0, deformation * 0.8), // Squish X
            y: v.y, // Y stays same (length)
            z: lerp(v.z, 0, deformation * 0.8)  // Squish Z
        });

        const vertices = [vTip, deformV(vBase1), deformV(vBase2), deformV(vBase3)];
        
        // Speed up rotation if deforming
        const speedMult = 1 + (deformation * 5);
        const drX = rotX * speedMult;
        
        const projected = vertices.map(v => project3D(v.x, v.y, v.z, drX, rotY, rotZ, 400));
        
        const edges = [
            [0,1], [0,2], [0,3], 
            [1,2], [2,3], [3,1]
        ];

        // Draw without shadow
        edges.forEach(([i, j]) => {
            // Dual lines for jitter effect
            drawElectricLine(ctx, projected[i], projected[j], baseColor, 2.5);
            drawElectricLine(ctx, projected[i], projected[j], '#FFFFFF', 1.0);
        });
        
        // Core
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(center.x, center.y, scale * 0.25, 0, Math.PI*2);
        ctx.fill();

    } else {
        // ORB (Icosahedron) - Supports OPEN (Split hemispheres)
        const phi = 1.618;
        const s = scale * 0.6;
        const rawVerts = [
            {x:0, y:1, z:phi}, {x:0, y:1, z:-phi}, {x:0, y:-1, z:phi}, {x:0, y:-1, z:-phi},
            {x:1, y:phi, z:0}, {x:1, y:-phi, z:0}, {x:-1, y:phi, z:0}, {x:-1, y:-phi, z:0},
            {x:phi, y:0, z:1}, {x:phi, y:0, z:-1}, {x:-phi, y:0, z:1}, {x:-phi, y:0, z:-1}
        ];
        
        // Scale first
        const scaledVerts = rawVerts.map(v => ({x: v.x*s, y: v.y*s, z: v.z*s}));
        
        // Edges definition
        const edges = [
            [0, 10], [0, 2], [0, 8], [0, 4], [0, 6],
            [3, 9], [3, 5], [3, 7], [3, 11], [3, 1],
            [2, 10], [2, 7], [2, 5], [8, 5], [8, 9],
            [4, 9], [4, 1], [6, 1], [6, 11], [10, 11]
        ];

        // Apply Gap Split (Y-axis separation)
        const separation = gap * scale * 1.5;
        
        const finalVerts = scaledVerts.map(v => {
            let y = v.y;
            if (y > 0.1) y += separation;
            else if (y < -0.1) y -= separation;
            return { x: v.x, y: y, z: v.z };
        });
        
        const projected = finalVerts.map(v => project3D(v.x, v.y, v.z, rotX, rotY, rotZ, 400));
        
        // WARNING LASER (During Charge)
        if (e.trinityData?.subState === 'LASER_CHARGE' && e.trinityData.aimAngle !== undefined) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            
            const aimDist = 2000;
            const aimX = Math.cos(e.trinityData.aimAngle) * aimDist;
            const aimY = Math.sin(e.trinityData.aimAngle) * aimDist;
            
            ctx.lineTo(aimX, aimY);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Warning red
            ctx.lineWidth = 1 + Math.random(); // Flicker
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Core if open
        if (gap > 0.1) {
            const corePulse = 1 + Math.sin(frame * 0.5) * 0.2;
            const coreS = scale * 0.5 * corePulse;
            
            // Draw a bright cylinder/orb in center (No ShadowBlur)
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(center.x, center.y, coreS, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
            
            // Energy arcs between halves
            if (Math.random() > 0.5) {
                // Pick random top and bottom points
                const topIndices = [0,1,4,6,8,10]; // Rough approx of top
                const botIndices = [2,3,5,7,9,11];
                const i1 = topIndices[Math.floor(Math.random()*topIndices.length)];
                const i2 = botIndices[Math.floor(Math.random()*botIndices.length)];
                drawElectricLine(ctx, projected[i1], projected[i2], '#FFFFFF', 1.0);
            }
        }

        // Draw Edges without shadow
        edges.forEach(([i, j]) => {
            // Don't draw lines connecting top to bottom if split?
            // The icosahedron edges span across the equator.
            // Vertices y>0 and y<0 are split. Edges connecting them will stretch.
            // If we want them to disconnect, we check polarity.
            const v1 = scaledVerts[i];
            const v2 = scaledVerts[j];
            const isCrossing = (v1.y > 0 && v2.y < 0) || (v1.y < 0 && v2.y > 0);
            
            if (gap > 0.5 && isCrossing) return; // Break connections when wide open

            drawElectricLine(ctx, projected[i], projected[j], baseColor, 2.5);
            drawElectricLine(ctx, projected[i], projected[j], '#FFFFFF', 1.0);
        });
    }
    
    ctx.restore();
};
