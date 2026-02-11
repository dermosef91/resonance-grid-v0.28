
import React, { useEffect, useState, useRef } from 'react';
import { Vector2 } from '../types';
import { inputSystem } from '../services/InputSystem';

interface JoystickProps {}

export const Joystick: React.FC<JoystickProps> = () => {
  const [active, setActive] = useState(false);
  // We use refs for positions to avoid React render cycles during 60fps touch moves
  // We only trigger state for 'active' to show/hide the DOM elements
  const originRef = useRef<Vector2>({ x: 0, y: 0 });
  const posRef = useRef<Vector2>({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  const MAX_DIST = 40; // Max radius of joystick movement

  const updateVisuals = () => {
    if (!knobRef.current || !baseRef.current) return;
    
    // Update Base Position
    baseRef.current.style.transform = `translate(${originRef.current.x - 38}px, ${originRef.current.y - 38}px)`;
    
    // Update Knob Position
    // The knob position is relative to the window, so we just set it directly
    knobRef.current.style.transform = `translate(${posRef.current.x - 19}px, ${posRef.current.y - 19}px)`;
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Only capture if it's the first touch or left mouse button
    if ('button' in e && e.button !== 0) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setActive(true);
    originRef.current = { x: clientX, y: clientY };
    posRef.current = { x: clientX, y: clientY };
    
    inputSystem.setJoystickVector({ x: 0, y: 0 });
    
    // Defer visual update to next tick to ensure DOM elements exist
    requestAnimationFrame(updateVisuals);
  };

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!active) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let dx = clientX - originRef.current.x;
    let dy = clientY - originRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // FLOATING JOYSTICK LOGIC:
    // If dragging beyond max distance, drag the origin along with the finger
    if (distance > MAX_DIST) {
        const angle = Math.atan2(dy, dx);
        // Calculate where the origin *should* be to keep the touch exactly at MAX_DIST edge
        const newOriginX = clientX - Math.cos(angle) * MAX_DIST;
        const newOriginY = clientY - Math.sin(angle) * MAX_DIST;
        
        originRef.current = { x: newOriginX, y: newOriginY };
        
        // Recalculate delta based on new origin
        dx = clientX - originRef.current.x;
        dy = clientY - originRef.current.y;
    }

    // Clamp for visual knob position
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(distance, MAX_DIST);
    
    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    posRef.current = { 
      x: originRef.current.x + x, 
      y: originRef.current.y + y 
    };

    // Normalize output for game logic (0.0 to 1.0)
    // We allow full magnitude (clampedDist / MAX_DIST)
    inputSystem.setJoystickVector({ 
      x: x / MAX_DIST, 
      y: y / MAX_DIST 
    });

    updateVisuals();
  };

  const handleEnd = () => {
    setActive(false);
    inputSystem.setJoystickVector({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (active) {
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [active]);

  return (
    <div 
      className="fixed inset-0 z-50 touch-none select-none bg-transparent"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      {active && (
        <>
          {/* Base Ring */}
          <div 
            ref={baseRef}
            className="fixed w-[76px] h-[76px] rounded-full border-2 border-white/15 flex items-center justify-center pointer-events-none will-change-transform"
            style={{ left: 0, top: 0 }} 
          >
             <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
          </div>

          {/* Draggable Knob */}
          <div 
            ref={knobRef}
            className="fixed w-[38px] h-[38px] rounded-full bg-orange-500/30 border-2 border-white/40 shadow-[0_0_20px_rgba(255,102,0,0.25)] pointer-events-none will-change-transform"
            style={{ left: 0, top: 0 }}
          />
        </>
      )}
    </div>
  );
};
