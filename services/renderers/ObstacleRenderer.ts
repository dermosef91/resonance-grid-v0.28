
import { Obstacle } from '../../types';
import { project3D, parseColorToRgb } from '../renderUtils';
import { neonStroke, neonPoly } from './neonRender';

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
    const topVerts: { x: number, y: number, z: number }[] = [];
    const botVerts: { x: number, y: number, z: number }[] = [];

    for (let i = 0; i < sides; i++) {
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

    const project = (v: { x: number, y: number, z: number }) => project3D(v.x, v.y, v.z, tiltX, tiltY, 0, 600);

    const pTop = topVerts.map(project);
    const pBot = botVerts.map(project);

    // Faces
    // We need to draw side faces then top cap
    // Simple painter's algo: draw back faces first?
    // Actually, cylinder/convex shape: simple sorting by Z might work, or just draw all sides with transparency

    // Parse grid color for dynamic tinting
    const rgb = parseColorToRgb(gridColor) || { r: 0, g: 255, b: 255 };
    const gridRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    // Draw Sides as glassy neon panels.
    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const p1 = pTop[i];
        const p2 = pTop[next];
        const p3 = pBot[next];
        const p4 = pBot[i];

        // "Digital rain" flicker on the glass fill.
        const alpha = 0.08 + Math.abs(Math.sin(i + frame * 0.05)) * 0.1;
        neonPoly(ctx, [p1, p2, p3, p4], gridRgb, { width: 1, fillAlpha: alpha, intensity: 0.55, glow: false, core: false });
    }

    // Draw Top Cap (brightest — it's nearest the camera).
    neonPoly(ctx, pTop, gridRgb, { width: 1.5, fillAlpha: 0.18, intensity: 1.0 });

    // Draw Base ring.
    neonStroke(ctx, (c) => { c.moveTo(pBot[0].x, pBot[0].y); for (let i = 1; i < sides; i++) c.lineTo(pBot[i].x, pBot[i].y); c.closePath(); }, gridRgb, { width: 1, intensity: 0.6, glow: false, core: false });
};
