
import React, { useRef, useEffect } from 'react';

export const WeaponIcon3D: React.FC<{ id: string; color: string; className?: string }> = ({ id, color, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = Math.random() * 100;
    let frameCount = 0;
    
    // Define vertices and edges based on ID
    let vertices: {x:number, y:number, z:number}[] = [];
    let edges: [number, number][] = [];
    
    // --- AUGMENTATIONS ---
    if (id === 'VOLTAIC_ARC') {
        vertices = [
            {x: -0.5, y: -1.5, z: 0}, {x: 0.8, y: -0.5, z: 0},
            {x: -0.8, y: 0.5, z: 0}, {x: 0.5, y: 1.5, z: 0}
        ];
        edges = [[0,1], [1,2], [2,3]];
    } else if (id === 'PHASE_DRILL') {
        const rings = 4;
        for(let i=0; i<rings; i++) {
            const r = 1.0 - (i*0.3);
            const y = -1.0 + (i*0.8);
            const segs = 6;
            const startIdx = vertices.length;
            for(let j=0; j<segs; j++) {
                const a = (j/segs)*Math.PI*2;
                vertices.push({x:Math.cos(a)*r, y:y, z:Math.sin(a)*r});
            }
            // Connect ring
            for(let j=0; j<segs; j++) edges.push([startIdx+j, startIdx+((j+1)%segs)]);
            // Connect to prev ring
            if (i > 0) {
                const prevStart = startIdx - segs;
                for(let j=0; j<segs; j++) edges.push([prevStart+j, startIdx+j]);
            }
        }
        vertices.push({x:0, y:1.8, z:0}); // Tip
        const lastRingStart = vertices.length - 1 - 6;
        for(let j=0; j<6; j++) edges.push([lastRingStart+j, vertices.length-1]);

    } else if (id === 'RESONANT_FEEDBACK') {
        // Spiky star
        for(let i=0; i<8; i++) {
            const a = (i/8)*Math.PI*2;
            vertices.push({x:Math.cos(a)*0.5, y:Math.sin(a)*0.5, z:0}); // Inner
            vertices.push({x:Math.cos(a)*1.5, y:Math.sin(a)*1.5, z:0}); // Outer
        }
        for(let i=0; i<8; i++) {
            const inner = i*2;
            const outer = i*2+1;
            const nextInner = ((i+1)%8)*2;
            edges.push([inner, outer]);
            edges.push([outer, nextInner]);
        }
    } else if (id === 'SONIC_WALL') {
        // Vertical curved wall
        const w = 1.5; const h = 1.0;
        vertices = [
            {x:-w, y:-h, z:0.5}, {x:w, y:-h, z:0.5}, {x:w, y:h, z:0.5}, {x:-w, y:h, z:0.5},
            {x:-w, y:-h, z:-0.5}, {x:w, y:-h, z:-0.5}, {x:w, y:h, z:-0.5}, {x:-w, y:h, z:-0.5}
        ];
        edges = [[0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7]];
        // Grid lines
        edges.push([0,2], [4,6]); 
    } else if (id === 'SUPERNOVA') {
        // Exploding star
        const rays = 12;
        for(let i=0; i<rays; i++) {
            const a = (i/rays) * Math.PI * 2;
            vertices.push({x:0, y:0, z:0});
            // Varying lengths for explosion look
            const r = 1.2 + (i%2)*0.5;
            vertices.push({x:Math.cos(a)*r, y:Math.sin(a)*r, z: (i%3 - 1)*0.5});
            edges.push([vertices.length-2, vertices.length-1]);
        }
    } else if (id === 'ENTROPY_FIELD') {
        const hex = 6;
        for(let i=0; i<hex; i++) {
            const a = (i/hex)*Math.PI*2;
            vertices.push({x:Math.cos(a)*1.2, y:Math.sin(a)*1.2, z:0});
        }
        vertices.push({x:0, y:0, z:0});
        for(let i=0; i<hex; i++) {
            edges.push([i, (i+1)%hex]);
            edges.push([i, 6]);
        }
    } else if (id === 'HUNTER_PROTOCOL') {
        // Crosshair
        const r = 1.2;
        vertices.push({x:0, y:r, z:0}, {x:0, y:-r, z:0}, {x:r, y:0, z:0}, {x:-r, y:0, z:0});
        edges.push([0,1], [2,3]);
        // Circle
        const segs = 12;
        const start = vertices.length;
        for(let i=0; i<segs; i++) {
            const a = (i/segs)*Math.PI*2;
            vertices.push({x:Math.cos(a)*0.8, y:Math.sin(a)*0.8, z:0});
        }
        for(let i=0; i<segs; i++) edges.push([start+i, start+((i+1)%segs)]);
    } else if (id === 'HIVE_SHIELD') {
        // Hex Shield
        const hex = 6;
        for(let i=0; i<hex; i++) {
            const a = (i/hex)*Math.PI*2;
            vertices.push({x:Math.cos(a)*1.4, y:Math.sin(a)*1.4, z:0});
        }
        for(let i=0; i<hex; i++) edges.push([i, (i+1)%hex]);
        // Inner dots
        for(let i=0; i<hex; i++) {
            const a = (i/hex)*Math.PI*2;
            vertices.push({x:Math.cos(a)*0.7, y:Math.sin(a)*0.7, z:0.2});
        }
    } else if (id === 'ORBITAL_LOCK') {
        // Atom
        const rings = 3;
        for(let r=0; r<rings; r++) {
            const segs = 12;
            const start = vertices.length;
            const rotX = r === 0 ? 0 : r === 1 ? Math.PI/3 : -Math.PI/3;
            const rotY = r === 0 ? Math.PI/2 : 0;
            
            for(let i=0; i<segs; i++) {
                const a = (i/segs)*Math.PI*2;
                let x = Math.cos(a)*1.4;
                let y = Math.sin(a)*1.4;
                let z = 0;
                // Rotate
                let y1 = y*Math.cos(rotX) - z*Math.sin(rotX);
                let z1 = y*Math.sin(rotX) + z*Math.cos(rotX);
                let x2 = x*Math.cos(rotY) - z1*Math.sin(rotY);
                let z2 = x*Math.sin(rotY) + z1*Math.cos(rotY);
                vertices.push({x:x2, y:y1, z:z2});
            }
            for(let i=0; i<segs; i++) edges.push([start+i, start+((i+1)%segs)]);
        }
        vertices.push({x:0, y:0, z:0}); // Core
    } else if (id === 'FRACTAL_SPLIT') {
        // 3 circles
        for(let k=0; k<3; k++) {
            const centerA = (k/3)*Math.PI*2;
            const cx = Math.cos(centerA)*0.8;
            const cy = Math.sin(centerA)*0.8;
            
            const segs = 8;
            const start = vertices.length;
            for(let i=0; i<segs; i++) {
                const a = (i/segs)*Math.PI*2;
                vertices.push({x:cx + Math.cos(a)*0.5, y:cy + Math.sin(a)*0.5, z:0});
            }
            for(let i=0; i<segs; i++) edges.push([start+i, start+((i+1)%segs)]);
        }
    } else if (id === 'UNSTABLE_GROUND') {
        // Fissure
        vertices = [
            {x:-1, y:-1, z:0}, {x:-0.3, y:0, z:0}, {x:0.3, y:-0.5, z:0}, {x:1, y:1, z:0},
            {x:-0.8, y:-0.8, z:0}, {x:-0.1, y:0.2, z:0}, {x:0.5, y:-0.3, z:0}, {x:1.2, y:1.2, z:0}
        ];
        edges = [[0,1],[1,2],[2,3], [4,5],[5,6],[6,7]];
    } else if (id === 'SHADOW_STEP') {
        // Footprint/Shoe
        vertices = [
            {x:-0.5, y:-1, z:0}, {x:0.5, y:-1, z:0}, // Heel
            {x:0.5, y:0.5, z:0}, {x:0.8, y:1, z:0}, {x:-0.8, y:1, z:0}, {x:-0.5, y:0.5, z:0}
        ];
        edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
    } else if (id === 'BASS_DROP') {
        // Heavy Arrow Down
        vertices = [
            {x:-0.5, y:-1.5, z:0}, {x:0.5, y:-1.5, z:0},
            {x:0.5, y:0.5, z:0}, {x:1.2, y:0.5, z:0},
            {x:0, y:1.5, z:0},
            {x:-1.2, y:0.5, z:0}, {x:-0.5, y:0.5, z:0}
        ];
        edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]];
        // Weight block
        vertices.push({x:-0.8, y:-1.8, z:0}, {x:0.8, y:-1.8, z:0}, {x:0.8, y:-1.5, z:0}, {x:-0.8, y:-1.5, z:0});
        edges.push([7,8],[8,9],[9,10],[10,7]);
    } else if (id === 'SOLAR_FLARE') {
        // Solar Flare / Sun burst
        const rays = 8;
        vertices.push({x:0, y:0, z:0}); // Center
        for(let i=0; i<rays; i++) {
            const a = (i/rays) * Math.PI * 2;
            const r = (i%2===0) ? 1.5 : 0.8; // Long/Short rays
            vertices.push({x:Math.cos(a)*r, y:Math.sin(a)*r, z:0});
        }
        // Connect center to all
        for(let i=1; i<=rays; i++) edges.push([0, i]);
        // Connect outer ring
        for(let i=1; i<=rays; i++) edges.push([i, (i%rays === 0 ? rays : i)+1 > rays ? 1 : i+1 ]);
    } else if (id === 'CHRONO_STUTTER') {
        // Hourglass
        const r = 0.8;
        const h = 1.2;
        vertices = [
            {x:-r, y:-h, z:-r}, {x:r, y:-h, z:-r}, {x:r, y:-h, z:r}, {x:-r, y:-h, z:r}, // Top
            {x:0, y:0, z:0}, // Center
            {x:-r, y:h, z:-r}, {x:r, y:h, z:-r}, {x:r, y:h, z:r}, {x:-r, y:h, z:r} // Bottom
        ];
        edges = [
            [0,1],[1,2],[2,3],[3,0], [0,4],[1,4],[2,4],[3,4],
            [5,6],[6,7],[7,8],[8,5], [5,4],[6,4],[7,4],[8,4]
        ];
    } else if (id === 'AFTERSHOCK') {
        // Ripple
        const rings = 3;
        for(let i=0; i<rings; i++) {
            const r = 0.5 + i*0.5;
            const segs = 12;
            const start = vertices.length;
            for(let j=0; j<segs; j++) {
                const a = (j/segs)*Math.PI*2;
                vertices.push({x:Math.cos(a)*r, y:Math.sin(a)*r, z:0});
            }
            for(let j=0; j<segs; j++) edges.push([start+j, start+((j+1)%segs)]);
        }
    } else if (id === 'QUANTUM_ECHO') {
        // Overlapping ghosts
        vertices = [ {x:-0.5, y:-1, z:0}, {x:0.5, y:-1, z:0}, {x:0, y:1, z:0} ]; // Triangle
        edges = [[0,1],[1,2],[2,0]];
        // Offset duplicate
        vertices.push({x:-0.2, y:-0.7, z:-0.2}, {x:0.8, y:-0.7, z:-0.2}, {x:0.3, y:1.3, z:-0.2});
        edges.push([3,4],[4,5],[5,3]);
    } else if (id === 'TEMPORAL_DRAG') {
        // Heavy Weight
        vertices = [{x:-1, y:0, z:-1}, {x:1, y:0, z:-1}, {x:1, y:0, z:1}, {x:-1, y:0, z:1}, {x:0, y:-1.5, z:0}];
        edges = [[0,1],[1,2],[2,3],[3,0], [0,4],[1,4],[2,4],[3,4]];
    } else if (id === 'TRI_OPTIC_PRISM' || id === 'CHROMA_STASIS') {
        // Tri-Optic Prism (Triangle)
        vertices = [ {x:0, y:-1.2, z:0}, {x:1, y:0.8, z:0}, {x:-1, y:0.8, z:0} ];
        edges = [[0,1],[1,2],[2,0]];
        // Inner triangle
        vertices.push({x:0, y:-0.6, z:0.2}, {x:0.5, y:0.4, z:0.2}, {x:-0.5, y:0.4, z:0.2});
        edges.push([3,4],[4,5],[5,3]);
    } else if (id === 'JULIAS_GRASP') {
        // Swirling Hole
        const spirals = 3;
        for(let i=0; i<spirals; i++) {
            const offset = (i/spirals) * Math.PI*2;
            const pts = 10;
            const start = vertices.length;
            for(let j=0; j<pts; j++) {
                const r = (j/pts) * 1.5;
                const a = offset + (j/pts) * Math.PI * 2;
                vertices.push({x: Math.cos(a)*r, y: Math.sin(a)*r, z: (j/pts)*0.5});
            }
            for(let j=0; j<pts-1; j++) edges.push([start+j, start+j+1]);
        }
    } else if (id === 'RECURSIVE_SPLIT') {
        // One big triangle, 3 small ones
        vertices.push({x:0, y:-1, z:0}, {x:0.8, y:0.5, z:0}, {x:-0.8, y:0.5, z:0});
        edges.push([0,1],[1,2],[2,0]);
        // Minis
        const miniOffsets = [{x:0, y:-1.5}, {x:1.2, y:0.8}, {x:-1.2, y:0.8}];
        miniOffsets.forEach(off => {
            const start = vertices.length;
            const s = 0.3;
            vertices.push({x:off.x, y:off.y-s, z:0}, {x:off.x+s, y:off.y+s, z:0}, {x:off.x-s, y:off.y+s, z:0});
            edges.push([start,start+1],[start+1,start+2],[start+2,start]);
        });
    }

    // --- EXISTING SHAPES (Refactored to be 'else if') ---
    else if (id.includes('spirit_lance')) {
       vertices = [ {x:0, y:-1.5, z:0}, {x:0.5, y:1, z:0.5}, {x:-0.5, y:1, z:0.5}, {x:0, y:1, z:-0.5} ];
       edges = [[0,1], [0,2], [0,3], [1,2], [2,3], [3,1]];
    } else if (id.includes('solar_chakram')) {
        const segs = 12;
        const outerR = 1.0;
        const innerR = 0.6;
        for (let i = 0; i < segs; i++) {
            const a = (i/segs)*Math.PI*2;
            vertices.push({x: Math.cos(a)*outerR, y: Math.sin(a)*outerR, z: 0});
            vertices.push({x: Math.cos(a)*innerR, y: Math.sin(a)*innerR, z: 0.1});
            vertices.push({x: Math.cos(a)*innerR, y: Math.sin(a)*innerR, z: -0.1});
        }
        for (let i = 0; i < segs; i++) {
            const next = (i+1)%segs;
            const b = i*3;
            const nb = next*3;
            edges.push([b, nb]); 
            edges.push([b+1, nb+1]); 
            edges.push([b+2, nb+2]); 
            edges.push([b, b+1]);
            edges.push([b, b+2]);
        }
    } else if (id.includes('cyber_kora')) {
       vertices = [
           {x:0.2, y:-1.5, z:0}, {x:-0.5, y:-0.2, z:0}, {x:0.5, y:0.2, z:0}, {x:-0.2, y:1.5, z:0},
           {x:0.2, y:-1.5, z:0.2}, {x:-0.5, y:-0.2, z:0.2}, {x:0.5, y:0.2, z:0.2}, {x:-0.2, y:1.5, z:0.2} 
       ];
       edges = [[0,1], [1,2], [2,3], [4,5], [5,6], [6,7], [0,4], [1,5], [2,6], [3,7]];
    } else if (id.includes('ancestral_resonance')) {
       const segs = 8;
       for(let i=0; i<segs; i++) { const a = (i/segs)*Math.PI*2; vertices.push({x: Math.cos(a)*1.2, y: -1.2, z: Math.sin(a)*1.2}); }
       for(let i=0; i<segs; i++) { const a = (i/segs)*Math.PI*2; vertices.push({x: Math.cos(a)*0.4, y: 0.4, z: Math.sin(a)*0.4}); }
       for(let i=0; i<segs; i++) { const a = (i/segs)*Math.PI*2; vertices.push({x: Math.cos(a)*0.8, y: 1.4, z: Math.sin(a)*0.8}); }
       for(let i=0; i<segs; i++) { const next = (i+1)%segs; edges.push([i, next]); edges.push([i+segs, next+segs]); edges.push([i+segs*2, next+segs*2]); edges.push([i, i+segs]); edges.push([i+segs, i+segs*2]); }
    } else if (id.includes('drum_echo') && !id.includes('BASS_DROP') && !id.includes('SOLAR_FLARE') && !id.includes('TURRET_MODE')) { // Base Drum Echo only
        vertices = []; edges = [];
    } else if (id.includes('void_aura')) { vertices = []; edges = []; } 
    else if (id.includes('nanite_swarm')) {
       for(let i=0; i<15; i++) { vertices.push({x:(Math.random()-0.5)*2.5, y:(Math.random()-0.5)*2.5, z:(Math.random()-0.5)*2.5}); }
    } else if (id.includes('void_wake')) {
        const segs = 16;
        for (let i = 0; i < segs; i++) {
            const theta = (i / segs) * Math.PI * 4;
            const r = (i / segs) * 1.5;
            vertices.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r, z: i * 0.1 - 0.8 });
        }
        for (let i = 0; i < segs - 1; i++) {
            edges.push([i, i + 1]);
        }
    } else if (id.includes('paradox_pendulum')) {
        // Metronome Needle
        vertices = [ {x:0, y:-1.5, z:0}, {x:0.1, y:1.5, z:0}, {x:-0.1, y:1.5, z:0} ];
        edges = [[0,1],[1,2],[2,0]];
        // Weight
        const wY = 0.5;
        vertices.push({x:0.3, y:wY, z:0}, {x:0, y:wY-0.3, z:0.2}, {x:-0.3, y:wY, z:0}, {x:0, y:wY+0.3, z:-0.2});
        edges.push([3,4],[4,5],[5,6],[6,3], [3,6],[4,5]); // Diamond weight
    } else if (id.includes('kaleidoscope_gaze')) {
        // Triangular Prism
        vertices = [ 
            {x:0, y:-1.2, z:0}, {x:1, y:0.8, z:0.5}, {x:-1, y:0.8, z:0.5}, // Front Face
            {x:0, y:-1.2, z:-0.5}, {x:1, y:0.8, z:-0.5}, {x:-1, y:0.8, z:-0.5} // Back Face
        ];
        edges = [
            [0,1],[1,2],[2,0], // Front
            [3,4],[4,5],[5,3], // Back
            [0,3],[1,4],[2,5]  // Connecting
        ];
    } else if (id.includes('fractal_bloom')) {
        // Fractal Spiral / Mandelbrot-ish shape
        const loops = 4;
        const pointsPerLoop = 12;
        let prevIdx = -1;
        for(let i=0; i<loops; i++) {
            const start = vertices.length;
            const r = 1.5 - (i * 0.4);
            const zOff = i * 0.2;
            for(let j=0; j<=pointsPerLoop; j++) {
                const theta = (j/pointsPerLoop) * Math.PI * 1.5 + (i * Math.PI/2);
                const ir = r * (1 - j/pointsPerLoop); // Taper in
                vertices.push({
                    x: Math.cos(theta) * ir,
                    y: Math.sin(theta) * ir,
                    z: zOff
                });
                if (j > 0) edges.push([start+j-1, start+j]);
            }
        }
    }
    
    // --- ARTIFACTS & STATS ---
    else if (id === 'speed') { // Rhythm Stride
        const z = 0.2;
        vertices = [
            {x: 0.5, y: -1.2, z: 0}, {x: -0.2, y: -0.2, z: 0}, {x: -0.8, y: -0.2, z: 0}, {x: 0.2, y: 1.2, z: 0},
            {x: 0.5, y: -1.2, z: z}, {x: -0.2, y: -0.2, z: z}, {x: -0.8, y: -0.2, z: z}, {x: 0.2, y: 1.2, z: z}
        ];
        edges = [[0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7]];
    } 
    else if (id === 'might') { // Warrior Spirit
        vertices = [
            {x:0, y:-1.5, z:0}, {x:-0.2, y:0.5, z:0}, {x:0.2, y:0.5, z:0},
            {x:-0.6, y:0.5, z:0}, {x:0.6, y:0.5, z:0}, {x:0, y:1.5, z:0},
            {x:0, y:-1.5, z:0.1}, {x:-0.2, y:0.5, z:0.1}, {x:0.2, y:0.5, z:0.1}, {x:0, y:1.5, z:0.1}
        ];
        edges = [[0,1],[0,2],[1,2], [1,3],[2,4], [1,5],[2,5], [6,7],[6,8],[7,8], [0,6],[3,1],[4,2],[5,9]];
    }
    else if (id.includes('harmonic_tuner')) {
        vertices = [ {x:0, y:1.5, z:0}, {x:0, y:0.5, z:0}, {x:-0.5, y:0.2, z:0}, {x:-0.5, y:-1.2, z:0}, {x:0.5, y:0.2, z:0}, {x:0.5, y:-1.2, z:0} ];
        edges = [[0,1], [1,2], [2,3], [1,4], [4,5]];
    }
    else if (id.includes('attractor_field')) {
        const d = 0.2;
        vertices = [
            {x:-0.8, y:-1, z:d}, {x:-0.4, y:-1, z:d}, {x:-0.4, y:0.5, z:d}, {x:0.4, y:0.5, z:d}, {x:0.4, y:-1, z:d}, {x:0.8, y:-1, z:d}, {x:0.8, y:1, z:d}, {x:-0.8, y:1, z:d},
            {x:-0.8, y:-1, z:-d}, {x:-0.4, y:-1, z:-d}, {x:-0.4, y:0.5, z:-d}, {x:0.4, y:0.5, z:-d}, {x:0.4, y:-1, z:-d}, {x:0.8, y:-1, z:-d}, {x:0.8, y:1, z:-d}, {x:-0.8, y:1, z:-d}
        ];
        edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]];
        edges.push([8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,8]);
        for(let i=0; i<8; i++) edges.push([i, i+8]);
    }
    else if (id.includes('data_siphon')) {
        const segs = 6;
        for(let i=0; i<segs; i++) {
            const a = (i/segs)*Math.PI*2;
            vertices.push({x: Math.cos(a)*1.0, y: -1.0, z: Math.sin(a)*1.0});
            vertices.push({x: Math.cos(a+0.5)*0.2, y: 1.0, z: Math.sin(a+0.5)*0.2});
        }
        for(let i=0; i<segs; i++) {
            const next = (i+1)%segs;
            edges.push([i*2, next*2]); edges.push([i*2+1, next*2+1]); edges.push([i*2, i*2+1]); edges.push([i*2, next*2+1]); 
        }
    }
    else if (id.includes('polyrhythm_core')) {
        vertices = [ {x:-0.7, y:-1, z:-0.7}, {x:0.7, y:-1, z:-0.7}, {x:0.7, y:-1, z:0.7}, {x:-0.7, y:-1, z:0.7}, {x:0, y:0, z:0}, {x:-0.7, y:1, z:-0.7}, {x:0.7, y:1, z:-0.7}, {x:0.7, y:1, z:0.7}, {x:-0.7, y:1, z:0.7} ];
        edges = [ [0,1],[1,2],[2,3],[3,0], [0,4],[1,4],[2,4],[3,4], [5,4],[6,4],[7,4],[8,4], [5,6],[6,7],[7,8],[8,5] ];
    }
    else if (id.includes('titan_frame')) {
        vertices = [ {x:0, y:-1.2, z:0.2}, {x:0.8, y:-0.8, z:0}, {x:0.6, y:0.5, z:0}, {x:0, y:1.5, z:0.2}, {x:-0.6, y:0.5, z:0}, {x:-0.8, y:-0.8, z:0}, {x:0, y:0, z:0.5} ];
        edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0], [6,0],[6,1],[6,2],[6,3],[6,4],[6,5]];
    }
    else if (id.includes('ancestral_focus')) {
        vertices = [{x:0, y:-1, z:0}, {x:1, y:1, z:1}, {x:-1, y:1, z:1}, {x:1, y:1, z:-1}, {x:-1, y:1, z:-1}];
        edges = [[0,1],[0,2],[0,3],[0,4], [1,2],[2,4],[4,3],[3,1]];
    } 
    // --- MISSION ICONS ---
    else if (id === 'mission_survive') {
        vertices = [ {x: -1, y: -1, z: 0}, {x: 1, y: -1, z: 0}, {x: 1, y: 0.5, z: 0}, {x: 0, y: 1.5, z: 0}, {x: -1, y: 0.5, z: 0}, {x: 0, y: -1, z: 0.2}, {x: 0, y: 1.5, z: 0.2} ];
        edges = [ [0,1], [1,2], [2,3], [3,4], [4,0], [5,6] ];
    } else if (id === 'mission_eliminate') {
        const d = 0.8;
        vertices = [ {x:-1, y:-1, z:0}, {x:1, y:-1, z:0}, {x:1, y:1, z:0}, {x:-1, y:1, z:0}, {x:0, y:-d, z:0}, {x:0, y:d, z:0}, {x:-d, y:0, z:0}, {x:d, y:0, z:0} ];
        edges = [[0,1],[1,2],[2,3],[3,0], [4,5], [6,7]];
    } else if (id === 'mission_data_run') {
        vertices = [ {x:0, y:-1.5, z:0}, {x:1, y:0, z:1}, {x:-1, y:0, z:1}, {x:0, y:0, z:-1.5}, {x:0, y:1.5, z:0} ];
        edges = [ [0,1],[0,2],[0,3], [4,1],[4,2],[4,3], [1,2],[2,3],[3,1] ];
    } else if (id === 'mission_boss') {
        vertices = [ {x:-1, y:0.5, z:0.5}, {x:1, y:0.5, z:0.5}, {x:1, y:0.5, z:-0.5}, {x:-1, y:0.5, z:-0.5}, {x:-1, y:-1, z:0.5}, {x:0, y:-0.5, z:0.5}, {x:1, y:-1, z:0.5}, {x:-1, y:-1, z:-0.5}, {x:0, y:-0.5, z:-0.5}, {x:1, y:-1, z:-0.5} ];
        edges = [ [0,1],[1,2],[2,3],[3,0], [0,4],[4,5],[5,6],[6,1], [3,7],[7,8],[8,9],[9,2], [4,7],[6,9] ];
    } else if (id === 'mission_koth') {
        vertices = [ {x:-0.5, y:1.5, z:0}, {x:-0.5, y:-1.5, z:0}, {x:-0.5, y:-1.5, z:0}, {x:1, y:-1, z:0.2}, {x:-0.5, y:-0.5, z:0} ];
        edges = [[0,1], [2,3],[3,4],[4,2]];
    } else if (id === 'mission_payload') {
        const segs = 8;
        for(let i=0; i<segs; i++) { const a = (i/segs)*Math.PI*2; vertices.push({x: Math.cos(a)*1.5, y: Math.sin(a)*1.5, z: 0}); }
        vertices.push({x:0, y:0, z:0.8}, {x:0, y:0, z:-0.8}, {x:0.8, y:0, z:0}, {x:-0.8, y:0, z:0});
        const cBase = segs;
        edges = [[cBase, cBase+2],[cBase, cBase+3],[cBase+1, cBase+2],[cBase+1, cBase+3],[cBase+2, cBase+3]];
        for(let i=0; i<segs; i++) edges.push([i, (i+1)%segs]);
    } else if (id === 'mission_ritual') {
        for(let i=0; i<3; i++) {
            const a = (i/3)*Math.PI*2; const x = Math.cos(a)*0.8; const z = Math.sin(a)*0.8; const idx = vertices.length;
            vertices.push({x:x, y:1.2, z:z}); vertices.push({x:x, y:-1.2, z:z}); edges.push([idx, idx+1]);
        }
    } else if (id === 'mission_shadow') {
        vertices = [ {x:-1.5, y:0, z:0}, {x:0, y:-0.8, z:0}, {x:1.5, y:0, z:0}, {x:0, y:0.8, z:0}, {x:0, y:-0.4, z:0.2}, {x:0, y:0.4, z:0.2}, {x:0.3, y:0, z:0.2}, {x:-0.3, y:0, z:0.2} ];
        edges = [[0,1], [1,2], [2,3], [3,0], [4,6], [6,5], [5,7], [7,4]];
    } else if (id === 'mission_event_horizon' || id === 'EVENT_HORIZON') { // Case sensitivity
        // Spiral galaxy icon
        const arms = 3;
        const armLen = 12;
        for (let i = 0; i < arms; i++) {
            const offset = (Math.PI * 2 * i) / arms;
            for (let j = 0; j < armLen; j++) {
                const r = j / 10;
                const theta = offset + r * 2;
                vertices.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r, z: j * 0.05 });
            }
        }
        for (let i = 0; i < vertices.length - 1; i++) {
            if ((i + 1) % armLen !== 0) edges.push([i, i + 1]);
        }
        vertices.push({ x: 0, y: 0, z: 0 }); // Center
    }
    else if (id.includes('glitch')) {
        vertices = [ {x:-1,y:-1,z:-1}, {x:1,y:-1,z:-1}, {x:1,y:1,z:-1}, {x:-1,y:1,z:-1}, {x:-1,y:-1,z:1}, {x:1,y:-1,z:1}, {x:1,y:1,z:1}, {x:-1,y:1,z:1} ];
        edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],[8,9],[9,10],[10,11],[11,8],[12,13],[13,14],[14,15],[15,12],[8,12],[9,13],[10,14],[11,15]];
    } else if (id === 'heal') {
        const t = 0.3; const l = 1.0; 
        vertices = [ {x:-t,y:-l,z:t}, {x:t,y:-l,z:t}, {x:t,y:l,z:t}, {x:-t,y:l,z:t}, {x:-t,y:-l,z:-t}, {x:t,y:-l,z:-t}, {x:t,y:l,z:-t}, {x:-t,y:l,z:-t}, {x:-l,y:-t,z:t}, {x:l,y:-t,z:t}, {x:l,y:t,z:t}, {x:-l,y:t,z:t}, {x:-l,y:-t,z:-t}, {x:l,y:-t,z:-t}, {x:l,y:t,z:-t}, {x:-l,y:t,z:-t} ];
        edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],[8,9],[9,10],[10,11],[11,8],[12,13],[13,14],[14,15],[15,12],[8,12],[9,13],[10,14],[11,15]];
    } else if (id === 'magnet_boost') {
        vertices = [ {x:-0.5, y:-0.5, z:0}, {x:-0.5, y:0.5, z:0}, {x:0.5, y:0.5, z:0}, {x:0.5, y:-0.5, z:0}, {x:-0.8, y:-0.5, z:0}, {x:-0.8, y:0.8, z:0}, {x:0.8, y:0.8, z:0}, {x:0.8, y:-0.5, z:0} ];
        edges = [[0,1],[1,2],[2,3], [4,5],[5,6],[6,7], [0,4],[3,7]];
    } else if (id === 'instant_chips') {
        const d = 0.2; vertices = [ {x:0, y:1, z:d}, {x:1, y:0, z:d}, {x:0, y:-1, z:d}, {x:-1, y:0, z:d}, {x:0, y:1, z:-d}, {x:1, y:0, z:-d}, {x:0, y:-1, z:-d}, {x:-1, y:0, z:-d}, {x:0, y:0.6, z:d}, {x:0.6, y:0, z:d}, {x:0, y:-0.6, z:d}, {x:-0.6, y:0, z:d} ];
        edges = [ [0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7], [8,9],[9,10],[10,11],[11,8] ];
    } else if (id === 'area') {
        vertices = [ {x:-0.2,y:-0.2,z:-0.2}, {x:0.2,y:-0.2,z:-0.2}, {x:0.2,y:0.2,z:-0.2}, {x:-0.2,y:0.2,z:-0.2}, {x:-0.2,y:-0.2,z:0.2}, {x:0.2,y:-0.2,z:0.2}, {x:0.2,y:0.2,z:0.2}, {x:-0.2,y:0.2,z:0.2} ];
        const b = 0; edges = [[b,b+1],[b+1,b+2],[b+2,b+3],[b+3,b],[b+4,b+5],[b+5,b+6],[b+6,b+7],[b+7,b+4],[b,b+4],[b+1,b+5],[b+2,b+6],[b+3,b+7]];
        const addArrow = (dx: number, dy: number) => {
            const baseIdx = vertices.length; const start = 0.4; const end = 1.2; const headBase = 0.9; const headW = 0.3;
            vertices.push({x:dx*start, y:dy*start, z:0}, {x:dx*end, y:dy*end, z:0});
            if (dx === 0) vertices.push({x:-headW, y:dy*headBase, z:0}, {x:headW, y:dy*headBase, z:0}); else vertices.push({x:dx*headBase, y:-headW, z:0}, {x:dx*headBase, y:headW, z:0});
            edges.push([baseIdx, baseIdx+1], [baseIdx+1, baseIdx+2], [baseIdx+1, baseIdx+3], [baseIdx+2, baseIdx+3]);
        };
        addArrow(0, 1); addArrow(0, -1); addArrow(1, 0); addArrow(-1, 0);
    } else {
        // Generic box fallthrough
        vertices = [{x:0,y:-1,z:0}, {x:0,y:1,z:0}, {x:1, y:0, z:0}, {x:-1, y:0, z:0}, {x:0, y:0, z:1}, {x:0, y:0, z:-1}];
        edges = [[0,2],[0,3],[0,4],[0,5], [1,2],[1,3],[1,4],[1,5], [2,4],[4,3],[3,5],[5,2]];
    }

    const render = () => {
        animationId = requestAnimationFrame(render);
        frameCount++;
        if (frameCount % 2 !== 0) return; // Throttle
        
        time += 0.06;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width; const h = canvas.height;
        const scale = w * 0.35;
        ctx.strokeStyle = color; ctx.fillStyle = color;
        ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.save(); ctx.translate(w/2, h/2);
        
        let rotX = time; let rotY = time * 0.6;
        if (id.includes('solar_chakram')) { rotX = time * 3; rotY = time; }
        if (id.includes('void_wake')) { rotX = time * 2; rotY = time * 2; }
        if (id.includes('paradox_pendulum')) { rotX = 0; rotY = 0; ctx.rotate(Math.sin(time*2)*0.5); } // 2D swing
        if (id.includes('void_aura')) { const pulse = 1 + Math.sin(time * 4) * 0.1; ctx.scale(pulse, pulse); }
        if (id === 'instant_chips') { rotX = 0; rotY = time * 0.5; ctx.rotate(Math.PI/4); }
        if (id.includes('kaleidoscope_gaze')) { rotX = 0.5; rotY = time * 0.8; } // Slow Y spin
        if (id.includes('fractal_bloom')) { rotX = time * 0.2; rotY = time * 0.1; } // Slow rotation for fractal

        const project = (v: {x:number, y:number, z:number}) => {
             let dx = 0, dy = 0, dz = 0;
             if (id.includes('glitch') && Math.random() < 0.2) { dx = (Math.random()-0.5)*0.5; dy = (Math.random()-0.5)*0.5; dz = (Math.random()-0.5)*0.5; }
             let x = (v.x+dx) * Math.cos(rotY) - (v.z+dz) * Math.sin(rotY);
             let z = (v.x+dx) * Math.sin(rotY) + (v.z+dz) * Math.cos(rotY);
             let y = (v.y+dy) * Math.cos(rotX) - z * Math.sin(rotX);
             z = (v.y+dy) * Math.sin(rotX) + z * Math.cos(rotX);
             const fl = 4; const p = 1 / (1 - z / fl);
             return { x: x * p * scale, y: y * p * scale };
        };
        
        if (id.includes('drum_echo') && !id.includes('BASS_DROP') && !id.includes('SOLAR_FLARE') && !id.includes('TURRET_MODE')) { // Base Drum Echo only
             // Draw Wireframe Grid Sphere
             const radius = 1.2;
             for(let i=0; i<3; i++) {
                 ctx.beginPath();
                 for(let j=0; j<=32; j++) {
                     const lonAngle = (j/32) * Math.PI * 2;
                     let vx=0, vy=0, vz=0;
                     if(i===0) { vx=Math.cos(lonAngle)*radius; vy=Math.sin(lonAngle)*radius; vz=0; }
                     if(i===1) { vx=Math.cos(lonAngle)*radius; vy=0; vz=Math.sin(lonAngle)*radius; }
                     if(i===2) { vx=0; vy=Math.cos(lonAngle)*radius; vz=Math.sin(lonAngle)*radius; }
                     const p = project({x:vx, y:vy, z:vz});
                     if(j===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                 }
                 ctx.stroke();
             }
        } else if (id.includes('void_aura') && !id.includes('SUPERNOVA') && !id.includes('ENTROPY_FIELD')) { // Base Void Aura
             for(let i=0; i<3; i++) {
                 ctx.beginPath();
                 const rOffset = i * 0.3;
                 for(let j=0; j<=24; j++) {
                     const theta = (j/24) * Math.PI * 2;
                     const p = project({x:Math.cos(theta)*(1-rOffset), y:Math.sin(theta)*(1-rOffset), z:0});
                     if(j===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                 }
                 ctx.stroke();
             }
        } else if (id.includes('nanite_swarm') && !id.includes('HUNTER_PROTOCOL') && !id.includes('HIVE_SHIELD')) { // Base Nanite
            vertices.forEach(v => { const p = project(v); ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill(); });
        } else {
            // Standard Vertex/Edge render for augmentations and other items
            ctx.beginPath();
            edges.forEach(([i1, i2]) => {
                const v1 = vertices[i1]; const v2 = vertices[i2];
                if(v1 && v2) { const p1 = project(v1); const p2 = project(v2); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
            });
            ctx.stroke();
        }
        ctx.restore();
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [id, color]);

  return <canvas ref={canvasRef} width={100} height={100} className={className} />;
};
