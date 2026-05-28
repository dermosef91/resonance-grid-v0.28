// "Liquid Light" neon drawing kit.
//
// Turns the game's flat wireframe strokes / solid fills into layered,
// light-emitting "plasma tubes" and glassy translucent faces, composited
// additively so the existing bloom pass blows them out into glow.
//
// Perf note: we deliberately avoid ctx.shadowBlur for the bulk work (it is the
// classic Canvas mobile trap) and instead stack a few additive strokes of
// decreasing width. A single optional shadowBlur halo is reserved for HIGH
// quality hero entities. On LOW quality everything collapses to one cheap
// stroke / flat fill so mobile keeps its frame budget.

import { GRAPHICS_QUALITY, GraphicsQuality } from '../../constants';
import { parseColorToRgb } from '../renderUtils';

let _quality: GraphicsQuality = GRAPHICS_QUALITY;
export const setNeonQuality = (q: GraphicsQuality) => { _quality = q; };
export const getNeonQuality = (): GraphicsQuality => _quality;
const isHigh = () => _quality === 'HIGH';

// Global "breathing" multiplier for glow intensity. 1 = neutral. Driven by the
// game loop (e.g. from the audio beat) via setGlowPulse(); read by every neon
// primitive so the whole scene can pulse in unison.
let _glowPulse = 1;
export const setGlowPulse = (v: number) => { _glowPulse = v; };
export const getGlowPulse = () => _glowPulse;

// Convenience sinusoidal pulse for callers that just want a gentle breathe.
export const beatPulse = (frame: number, base = 1, amp = 0.12, speed = 0.05) =>
    base + Math.sin(frame * speed) * amp;

const toRgb = (color: string) => parseColorToRgb(color) || { r: 255, g: 255, b: 255 };
const clamp255 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n);

export type TraceFn = (ctx: CanvasRenderingContext2D) => void;

export interface NeonStrokeOpts {
    width?: number;       // core line width
    intensity?: number;   // overall brightness multiplier
    core?: boolean;       // draw white-hot inner core (HIGH only)
    glow?: boolean;       // draw wide outer halo (HIGH only)
}

/**
 * Stroke a path as a layered neon tube. `trace` should issue the path commands
 * (moveTo/lineTo/arc/closePath); it is re-run once per additive pass.
 */
export const neonStroke = (
    ctx: CanvasRenderingContext2D,
    trace: TraceFn,
    color: string,
    opts: NeonStrokeOpts = {}
) => {
    const { r, g, b } = toRgb(color);
    const width = opts.width ?? 1.5;
    const intensity = (opts.intensity ?? 1) * _glowPulse;

    const prevOp = ctx.globalCompositeOperation;
    const prevCap = ctx.lineCap;
    const prevJoin = ctx.lineJoin;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isHigh()) {
        // Cheap path: single solid stroke (matches the original look).
        ctx.beginPath();
        trace(ctx);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, intensity)})`;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.lineCap = prevCap;
        ctx.lineJoin = prevJoin;
        return;
    }

    ctx.globalCompositeOperation = 'lighter';

    // 1. Wide outer halo.
    if (opts.glow !== false) {
        ctx.beginPath();
        trace(ctx);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.12 * intensity})`;
        ctx.lineWidth = width * 5;
        ctx.stroke();
    }

    // 2. Mid band (saturated colour).
    ctx.beginPath();
    trace(ctx);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, 0.5 * intensity)})`;
    ctx.lineWidth = width * 2.2;
    ctx.stroke();

    // 3. Bright colour core.
    ctx.beginPath();
    trace(ctx);
    ctx.strokeStyle = `rgba(${clamp255(r + 60)}, ${clamp255(g + 60)}, ${clamp255(b + 60)}, ${Math.min(1, 0.9 * intensity)})`;
    ctx.lineWidth = width;
    ctx.stroke();

    // 4. White-hot inner core.
    if (opts.core !== false) {
        ctx.beginPath();
        trace(ctx);
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, 0.5 * intensity)})`;
        ctx.lineWidth = Math.max(0.6, width * 0.4);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = prevOp;
    ctx.lineCap = prevCap;
    ctx.lineJoin = prevJoin;
};

export interface NeonPolyOpts {
    fillAlpha?: number;    // glass fill strength (additive)
    width?: number;        // outline width
    intensity?: number;    // outline brightness
    glow?: boolean;
    core?: boolean;
    brightness?: number;   // 0..1 fresnel-ish term (e.g. derived from face depth)
    backingAlpha?: number; // optional opaque-black backing to occlude background
}

/**
 * Draw a polygon face as glassy translucent fill + neon outline. `points` are
 * projected 2D screen points. `brightness` lets callers feed a fresnel/depth
 * term so camera-facing edges glow hotter.
 */
export const neonPoly = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    color: string,
    opts: NeonPolyOpts = {}
) => {
    if (!points || points.length < 2) return;
    const { r, g, b } = toRgb(color);
    const bright = opts.brightness ?? 0.5;

    const trace: TraceFn = (c) => {
        c.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
        c.closePath();
    };

    const prevOp = ctx.globalCompositeOperation;

    // Optional opaque backing so the mesh still occludes the grid behind it.
    if (opts.backingAlpha && opts.backingAlpha > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        trace(ctx);
        ctx.fillStyle = `rgba(2, 2, 6, ${opts.backingAlpha})`;
        ctx.fill();
    }

    // Glass fill (additive; brighter faces glow more).
    if (isHigh()) {
        const fillAlpha = (opts.fillAlpha ?? 0.1) * (0.5 + bright) * _glowPulse;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        trace(ctx);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, fillAlpha)})`;
        ctx.fill();
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        trace(ctx);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(opts.fillAlpha ?? 0.1) + 0.1})`;
        ctx.fill();
    }

    ctx.globalCompositeOperation = prevOp;

    neonStroke(ctx, trace, color, {
        width: opts.width ?? 1.5,
        intensity: (opts.intensity ?? 1) * (0.7 + bright * 0.6),
        glow: opts.glow,
        core: opts.core,
    });
};

/**
 * A glowing orb / core: additive radial halo + bright white centre. Replaces
 * the common "core dot + shadowBlur" idiom cheaply.
 */
export const neonOrb = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    intensity = 1
) => {
    const { r, g, b } = toRgb(color);
    const I = intensity * _glowPulse;
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    if (isHigh()) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(1, 0.6 * I)})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bright colour body + white-hot centre.
    ctx.fillStyle = `rgba(${clamp255(r + 40)}, ${clamp255(g + 40)}, ${clamp255(b + 40)}, ${Math.min(1, 0.9 * I)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (isHigh()) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.7 * I)})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, radius * 0.45), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = prevOp;
};
