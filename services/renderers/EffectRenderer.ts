
import { Vector2 } from '../../types';

export const drawAbyssalLoop = (ctx: CanvasRenderingContext2D, points: Vector2[], frame: number, alpha: number, camX: number, camY: number, viewBounds: any) => {
    if (points.length < 3) return;

    // Calculate centroid and bounds for gradient
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const radius = Math.max(maxX - minX, maxY - minY) / 2;

    // Check for valid gradient params to prevent "The provided double value is non-finite"
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius)) return;

    ctx.save();
    
    // 1. EVENT HORIZON (Hole in reality)
    ctx.beginPath();
    points.forEach((pt, i) => {
        if (i===0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    
    ctx.save();
    ctx.clip();
    
    // --- Shiny Dark Purple Gradient Fill ---
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(40, 0, 70, ${alpha})`);      // Deep Purple Center
    grad.addColorStop(0.6, `rgba(20, 0, 40, ${alpha})`);    // Darker Mid
    grad.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);        // Black Edge
    ctx.fillStyle = grad;
    ctx.fillRect(viewBounds.left, viewBounds.top, viewBounds.right - viewBounds.left, viewBounds.bottom - viewBounds.top);

    // Specular Shine (Scanning bar effect)
    const time = frame * 0.02;
    const shinePos = (Math.sin(time) + 1) / 2; // 0 to 1
    const shineGrad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    shineGrad.addColorStop(Math.max(0, shinePos - 0.2), `rgba(255, 255, 255, 0)`);
    shineGrad.addColorStop(shinePos, `rgba(200, 100, 255, ${alpha * 0.15})`); // Faint sheen
    shineGrad.addColorStop(Math.min(1, shinePos + 0.2), `rgba(255, 255, 255, 0)`);
    
    ctx.fillStyle = shineGrad;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    
    // Draw Deep Stars (Parallax Effect)
    const density = 100;
    const startX = Math.floor(viewBounds.left / density) * density;
    const startY = Math.floor(viewBounds.top / density) * density;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    
    for (let x = startX; x < viewBounds.right; x += density) {
        for (let y = startY; y < viewBounds.bottom; y += density) {
            const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            if ((hash - Math.floor(hash)) > 0.8) {
                const px = x + camX * 0.4; 
                const py = y + camY * 0.4;
                const size = 1 + Math.abs(Math.sin(hash)) * 1.5;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    ctx.restore(); // End Clip

    // 2. INFINITE MIRROR EFFECT (Jittery concentric loops)
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawPolyLayer = (scale: number, isOuter: boolean) => {
        const jitterScale = Math.max(0.2, scale); // Reduce jitter intensity for smaller inner loops

        // Pre-calculate styles for the layer to avoid doing it per segment
        const layerOpacity = alpha * Math.min(1, scale * 1.2); 
        const coreColor = `rgba(255, 0, 255, ${layerOpacity})`;
        const glowColor = `rgba(208, 0, 255, ${layerOpacity})`;
        const lineWidth = (1.5 * Math.max(0.5, scale)) * layerOpacity;
        const shadowBlur = (10 * scale) * layerOpacity;

        const len = points.length;
        for (let i = 0; i < len; i++) {
            const pt1 = points[i];
            const pt2 = points[(i + 1) % len];
            
            // Calculate scaled points on the fly (Removed allocation)
            const p1x = cx + (pt1.x - cx) * scale;
            const p1y = cy + (pt1.y - cy) * scale;
            const p2x = cx + (pt2.x - cx) * scale;
            const p2y = cy + (pt2.y - cy) * scale;
            
            const dist = Math.sqrt((p2x - p1x)**2 + (p2y - p1y)**2);
            // Adjust step density: fewer segments for smaller inner rings
            const steps = Math.max(1, Math.ceil(dist / (10 / Math.max(0.1, scale))));

            ctx.beginPath();
            ctx.moveTo(p1x, p1y);

            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                let x = p1x + (p2x - p1x) * t;
                let y = p1y + (p2y - p1y) * t;

                if (s < steps) {
                    const jitterAmount = 4 * jitterScale;
                    x += (Math.random() - 0.5) * jitterAmount;
                    y += (Math.random() - 0.5) * jitterAmount;
                }
                ctx.lineTo(x, y);
            }

            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = glowColor;
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Sparkles (Only on the main outer ring)
            if (isOuter) {
                const particleCount = Math.ceil(dist / 15 * alpha); 
                for (let j = 0; j < particleCount; j++) {
                    if (Math.random() > 0.3) continue;
                    const t = Math.random();
                    let px = p1x + (p2x - p1x)*t;
                    let py = p1y + (p2y - p1y)*t;
                    const spread = 12 * (Math.random() - 0.5);
                    px += spread; py += spread;
                    const size = (Math.random() * 1.5 + 0.5) * alpha;
                    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 0, 255, ${alpha})` : `rgba(200, 150, 255, ${alpha})`;
                    ctx.beginPath(); ctx.fillRect(px, py, size, size); ctx.fill();
                }
            }
        }
    };

    // A. Always draw the fixed outer boundary (Scale 1.0)
    drawPolyLayer(1.0, true);

    // B. Draw animated inner layers (Endlessly shrinking)
    const layerSpacing = 0.15;
    const animOffset = (frame * 0.005) % layerSpacing; // 0 to 0.15
    
    // Generate rings starting just inside the rim and shrinking to center
    // Reduced from 7 to 2 for performance optimization
    for(let i = 0; i < 2; i++) {
        const scale = 1.0 - animOffset - (i * layerSpacing);
        // Only draw if scale is valid and distinct enough from the outer rim (0.98)
        if (scale < 0.98 && scale > 0.05) {
            drawPolyLayer(scale, false);
        }
    }

    ctx.restore();
}
