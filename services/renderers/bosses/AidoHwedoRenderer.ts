
import { Enemy } from '../../../types';
import { project3D } from '../../renderUtils';

export const drawAidoHwedo = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => {
    // --- AIDO-HWEDO: THE BOUNDLESS COIL ---
    // Two rotating rings with gaps + Red-hot Dodecahedron Core
    
    // Core Logic
    const t = frame * 0.02;
    const coreScale = 40; // Core Size
    
    // Core Rotation
    const coreRotX = t * 0.8;
    const coreRotY = t * 1.2;
    
    // Solar Flare Effect
    if (e.state === 'FLARE') {
        const flareSize = (90 - (e.aidoData?.flareTimer || 0)) * 20; 
        const alpha = Math.max(0, (e.aidoData?.flareTimer || 0) / 90);
        
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, flareSize);
        grad.addColorStop(0, `rgba(255, 200, 200, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, flareSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Shockwave rings
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, flareSize * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // DRAW RINGS (Counter Rotating)
    const drawRing = (radius: number, angle: number, color: string, gapSize: number) => {
        ctx.save();
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, gapSize/2, Math.PI * 2 - gapSize/2);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Double Line effect
        ctx.beginPath();
        ctx.arc(0, 0, radius - 8, gapSize/2 + 0.1, Math.PI * 2 - gapSize/2 - 0.1);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.shadowBlur = 0;
        ctx.stroke();
        
        // Gap Indicators (Sparks at edges)
        const sparkSize = 4 + Math.random() * 4;
        const gapStart = gapSize/2;
        const gapEnd = Math.PI * 2 - gapSize/2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(Math.cos(gapStart)*radius, Math.sin(gapStart)*radius, sparkSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(Math.cos(gapEnd)*radius, Math.sin(gapEnd)*radius, sparkSize, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    };

    const data = e.aidoData || { innerAngle: 0, outerAngle: 0, phase2Ring: undefined };
    const GAP = Math.PI / 4; // 45 degrees

    // Inner Ring
    drawRing(200, data.innerAngle, '#FF8800', GAP);
    
    // Outer Ring (Now Middle visually since P2 added further out)
    drawRing(360, data.outerAngle, '#FF4400', GAP);

    // --- PHASE 2 RING (Outer Spike Doors) ---
    if (data.phase2Ring?.active) {
        const p2 = data.phase2Ring;
        const r3 = 530; // New Outer Radius
        const segments = 4; // 4 Fixed segments, 4 Doors
        const segAngle = (Math.PI * 2) / segments; 
        const gapRatio = 0.4; // 40% of segment is gap/door
        
        ctx.save();
        ctx.rotate(p2.angle);
        
        for(let i=0; i<segments; i++) {
            const startAngle = i * segAngle;
            // Draw SOLID part
            const wallStart = startAngle;
            const wallEnd = startAngle + segAngle * (1 - gapRatio);
            
            ctx.beginPath();
            ctx.arc(0, 0, r3, wallStart, wallEnd);
            ctx.strokeStyle = '#8B0000'; // Dark Red for outer
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.stroke();
            
            // Draw DOOR part (Spikes) if closed
            if (!p2.doorsOpen) {
                // SPIKES VISUAL
                const doorStart = wallEnd;
                const doorEnd = startAngle + segAngle; // Next start
                
                // Flicker effect when appearing/disappearing
                const flicker = Math.random() > 0.1 ? 1 : 0.5;
                ctx.globalAlpha = flicker;
                
                // Draw jagged spikes in the gap
                ctx.beginPath();
                const spikeCount = 8; // More spikes for larger ring
                const arcLen = doorEnd - doorStart;
                for(let j=0; j<=spikeCount; j++) {
                    const a = doorStart + (j/spikeCount) * arcLen;
                    const r = r3 + (j%2 === 0 ? 15 : -15); // Larger spikes
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r;
                    if (j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                }
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            } else {
                // Hint at open door (faint lines)
                const doorStart = wallEnd;
                const doorEnd = startAngle + segAngle;
                ctx.beginPath();
                ctx.arc(0, 0, r3, doorStart, doorEnd);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        ctx.restore();
    }

    // DRAW CORE (Red Dodecahedron)
    // Dodecahedron Geometry (Reuse from Vanguard but red/hot)
    const phi = 1.618;
    const invPhi = 1 / phi;
    const verts = [
        {x:1, y:1, z:1}, {x:1, y:1, z:-1}, {x:1, y:-1, z:1}, {x:1, y:-1, z:-1},
        {x:-1, y:1, z:1}, {x:-1, y:1, z:-1}, {x:-1, y:-1, z:1}, {x:-1, y:-1, z:-1},
        {x:0, y:phi, z:invPhi}, {x:0, y:phi, z:-invPhi}, {x:0, y:-phi, z:invPhi}, {x:0, y:-phi, z:-invPhi},
        {x:invPhi, y:0, z:phi}, {x:invPhi, y:0, z:-phi}, {x:-invPhi, y:0, z:phi}, {x:-invPhi, y:0, z:-phi},
        {x:phi, y:invPhi, z:0}, {x:phi, y:-invPhi, z:0}, {x:-phi, y:invPhi, z:0}, {x:-phi, y:-invPhi, z:0}
    ];

    const projected = verts.map(v => project3D(v.x * coreScale, v.y * coreScale, v.z * coreScale, coreRotX, coreRotY, 0, 400));

    // Simple wireframe for core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Connect nearest neighbors (naive approach for visual density)
    for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
            const dx = projected[i].x - projected[j].x;
            const dy = projected[i].y - projected[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < coreScale * 1.2) {
                ctx.moveTo(projected[i].x, projected[i].y);
                ctx.lineTo(projected[j].x, projected[j].y);
            }
        }
    }
    ctx.stroke();
    
    // Core Fill
    const pulse = 1 + Math.sin(frame * 0.2) * 0.2;
    ctx.fillStyle = `rgba(255, 50, 0, ${0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, coreScale * 0.8, 0, Math.PI * 2);
    ctx.fill();
};
