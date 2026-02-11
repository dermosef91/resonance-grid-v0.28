
import React, { useRef, useEffect } from 'react';
import { COLORS } from '../../constants';
import { drawPlayerMesh } from '../../services/renderers/playerRenderer';
import { useMenuNav } from '../../hooks/useMenuNav';
import { NeonButton, CurrencyDisplay } from '../Common';

export const MainMenu: React.FC<{ 
    startGame: () => void; 
    openCompendium: () => void; 
    currency: number; 
    showShop: boolean;
    maxWave: number;
}> = ({ startGame, openCompendium, currency, showShop, maxWave }) => {
    const canShop = showShop && currency > 0;
    const itemCount = canShop ? 2 : 1;
    const selectedIndex = useMenuNav(itemCount, (idx) => {
        if (idx === 0) startGame();
        if (idx === 1 && canShop) openCompendium();
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2,
            speed: 0.1 + Math.random() * 0.8,
            blinkOffset: Math.random() * Math.PI * 2
        }));

        // Ripple System
        interface GridRipple {
            y: number;
            speed: number;
            width: number;
            amplitude: number;
        }
        const ripples: GridRipple[] = [];

        let frame = 0;
        let animationId: number;
        let camX = 0;

        const render = () => {
            frame++;
            camX += 0.2;

            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            const w = canvas.width;
            const h = canvas.height;

            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const time = frame * 0.005;
            const grad1 = ctx.createRadialGradient(w * 0.2 + Math.sin(time)*50, h * 0.3 + Math.cos(time)*50, 0, w * 0.2, h * 0.3, w * 0.6);
            grad1.addColorStop(0, 'rgba(40, 0, 60, 0.3)');
            grad1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, w, h);

            const grad2 = ctx.createRadialGradient(w * 0.8 - Math.cos(time)*50, h * 0.7 - Math.sin(time)*50, 0, w * 0.8, h * 0.7, w * 0.6);
            grad2.addColorStop(0, 'rgba(60, 20, 0, 0.2)');
            grad2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad2;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            stars.forEach(star => {
                star.x -= star.speed;
                if (star.x < 0) star.x = w;
                const alpha = 0.4 + Math.sin(frame * 0.05 + star.blinkOffset) * 0.3;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            const startY = h * 0.4;

            // Spawn Ripples - Reduced frequency significantly
            if (Math.random() < 0.003) {
                ripples.push({
                    y: startY,
                    speed: 2 + Math.random() * 2,
                    width: 150 + Math.random() * 100,
                    amplitude: 30 + Math.random() * 20
                });
            }

            // Update Ripples
            for (let i = ripples.length - 1; i >= 0; i--) {
                ripples[i].y += ripples[i].speed;
                ripples[i].speed *= 1.01; // Accelerate towards camera
                if (ripples[i].y > h + 200) {
                    ripples.splice(i, 1);
                }
            }

            ctx.save();
            // ENHANCED VISIBILITY: Brighter, thicker, glowing lines
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff4500';
            ctx.strokeStyle = 'rgba(255, 102, 0, 0.75)';
            ctx.lineWidth = 2;
            const lineSpacing = 50;
            const nodeSpacing = 30;
            
            for (let y = startY; y < h + 50; y += lineSpacing) {
                // Calculate Ripple Offset for this line
                let rippleOffset = 0;
                ripples.forEach(r => {
                    const dist = Math.abs(y - r.y);
                    if (dist < r.width) {
                        const t = dist / r.width;
                        // Smooth hump (Cosine wave)
                        rippleOffset -= (Math.cos(t * Math.PI) + 1) * 0.5 * r.amplitude;
                    }
                });

                ctx.beginPath();
                let first = true;
                const yOffset = (y - startY) / (h - startY);
                for (let x = -50; x < w + 50; x += nodeSpacing) {
                    // Slower spatial frequency (0.002) and temporal frequency (frame * 0.001)
                    const xInput = (x + camX * 0.5) * 0.002;
                    const yInput = y * 0.005;
                    const noise = Math.sin(xInput) * Math.cos(yInput * 2) + Math.sin(xInput * 2.5 + frame * 0.001) * 0.5;
                    
                    const elevation = Math.pow(Math.abs(noise), 2) * 80 * yOffset;
                    const drawX = x;
                    const drawY = y - elevation + rippleOffset;
                    
                    if (first) { ctx.moveTo(drawX, drawY); first = false; }
                    else { ctx.lineTo(drawX, drawY); }
                }
                ctx.stroke();
            }
            ctx.restore();

            // Render Player Mesh with Thicker Border (10px)
            const centerX = w / 2;
            const centerY = h / 2;
            const scale = 120;
            drawPlayerMesh(ctx, centerX, centerY, scale, frame * 0.3, COLORS.orange, COLORS.white, 1.0, 0, undefined, undefined, 4);

            animationId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(animationId);
    }, []);

    return (
        <div className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/30 to-black/90 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

            <div className="relative z-10 text-center flex flex-col gap-8 items-center w-full max-w-4xl px-4">
                <div className="animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
                    <h1 className="text-5xl md:text-8xl font-black text-white mb-0 tracking-tighter uppercase">
                        RESONANCE
                    </h1>
                    <h1 className="text-6xl md:text-9xl font-bold text-orange-500 tracking-[0.2em] uppercase drop-shadow-md mt-[-10px] md:mt-[-20px] mb-8">
                        GRID
                    </h1>
                </div>
                
                <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-bottom-10 duration-1000 delay-300 fill-mode-backwards">
                    <NeonButton 
                        onClick={startGame} 
                        fullWidth
                        variant={selectedIndex === 0 ? 'primary' : 'secondary'}
                    >
                        Initiate Run
                    </NeonButton>
                    
                    {canShop && (
                        <button 
                            onClick={openCompendium} 
                            className={`w-full py-3 border font-mono text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group hover:bg-white/10 ${selectedIndex === 1 ? 'border-white text-white bg-gray-800' : 'bg-black border-gray-700 text-gray-400 hover:border-white hover:text-white'}`}
                        >
                            <span>Get Upgrades</span>
                            <span className="text-gray-600 group-hover:text-gray-400">|</span>
                            <CurrencyDisplay amount={currency} size="sm" />
                        </button>
                    )}
                </div>
            </div>

            {maxWave > 0 && (
                <div className="absolute bottom-8 left-0 w-full z-20 flex justify-center pointer-events-none">
                    <div className="text-[10px] md:text-xs font-mono text-gray-600 tracking-[0.4em] uppercase flex items-center gap-3 animate-in fade-in duration-1000 delay-500">
                        <span className="w-8 h-px bg-gray-800"></span>
                        <span>MAX WAVE {maxWave}</span>
                        <span className="w-8 h-px bg-gray-800"></span>
                    </div>
                </div>
            )}
        </div>
    );
};
