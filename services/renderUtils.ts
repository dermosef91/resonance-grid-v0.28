
import { COLORS } from '../constants';
import { ColorPalette } from '../types';

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const hexToRgbStruct = (hex: string) => {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
};

export const parseColorToRgb = (color: string): { r: number, g: number, b: number } | null => {
    if (!color) return null;
    if (color.startsWith('#')) {
        return hexToRgbStruct(color);
    }
    if (color.startsWith('rgb')) {
        const parts = color.match(/\d+/g);
        if (parts && parts.length >= 3) {
            return { r: parseInt(parts[0]), g: parseInt(parts[1]), b: parseInt(parts[2]) };
        }
    }
    return null;
};

export const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
};

export const lerpColor = (c1: string, c2: string, t: number): string => {
    const color1 = hexToRgbStruct(c1);
    const color2 = hexToRgbStruct(c2);

    const r = color1.r + (color2.r - color1.r) * t;
    const g = color1.g + (color2.g - color1.g) * t;
    const b = color1.b + (color2.b - color1.b) * t;

    return rgbToHex(r, g, b);
};

export const lerpPaletteColors = (p1: ColorPalette, p2: ColorPalette, t: number): Omit<ColorPalette, 'landscape'> => {
    return {
        background: lerpColor(p1.background, p2.background, t),
        grid: lerpColor(p1.grid, p2.grid, t),
        nebulaPrimary: lerpColor(p1.nebulaPrimary, p2.nebulaPrimary, t),
        nebulaSecondary: lerpColor(p1.nebulaSecondary, p2.nebulaSecondary, t)
    };
};

export const getDropStyle = (content?: string) => {
    switch (content) {
        case 'CURRENCY_50': return { hex: '#FFD700', rgba: 'rgba(255, 215, 0,' };
        case 'FULL_HEALTH': return { hex: '#00FF00', rgba: 'rgba(0, 255, 0,' };
        case 'TEMPORAL_BOOST': return { hex: '#00FF00', rgba: 'rgba(0, 255, 0,' };
        case 'EXTRA_LIFE': return { hex: '#FFFFFF', rgba: 'rgba(255, 255, 255,' };
        case 'LEVEL_UP':
        default: return { hex: '#00FFFF', rgba: 'rgba(0, 255, 255,' };
    }
};

/**
 * Projects a 3D point onto 2D canvas coordinates.
 * Supports rotation on X, Y, and Z axes.
 */
export const project3D = (
    x: number,
    y: number,
    z: number,
    rx: number = 0,
    ry: number = 0,
    rz: number = 0,
    focalLength: number = 300
): { x: number, y: number, scale: number, depth: number } => {
    // Rotate X
    let y1 = y * Math.cos(rx) - z * Math.sin(rx);
    let z1 = y * Math.sin(rx) + z * Math.cos(rx);

    // Rotate Y
    let x2 = x * Math.cos(ry) - z1 * Math.sin(ry);
    let z2 = x * Math.sin(ry) + z1 * Math.cos(ry);

    // Rotate Z
    let x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
    let y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);

    // Project
    // Avoid division by zero or negative depth issues
    const safeZ = Math.max(z2, focalLength * -0.9);
    const scale = focalLength / (focalLength - safeZ);

    return {
        x: x3 * scale,
        y: y3 * scale,
        scale,
        depth: z2 // Useful for Z-sorting
    };
};

/**
 * Simple perspective projection without rotation inputs (for when rotation is calculated manually)
 */
export const projectSimple = (v: { x: number, y: number, z: number }, fl: number = 300) => {
    const p = 1 / (1 - v.z / fl);
    return { x: v.x * p, y: v.y * p };
};

export const drawLightningBolt = (
    ctx: CanvasRenderingContext2D,
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    color: string,
    width: number = 2,
    displacement: number = 20
) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(2, Math.floor(dist / 40));

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        // Perpendicular jitter
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const jitter = (Math.random() - 0.5) * displacement;

        ctx.lineTo(
            p1.x + dx * t + perpX * jitter,
            p1.y + dy * t + perpY * jitter
        );
    }

    ctx.lineTo(p2.x, p2.y);

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
};
