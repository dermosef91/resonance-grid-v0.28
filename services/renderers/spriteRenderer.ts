// Draws authored sprites for the Option-3 render path. Assumes ctx is already
// translated to the entity's centre (as the procedural renderers expect).
// Returns false when no sprite is available so the caller can fall back.

import { spriteCache } from '../spriteCache';

// Generated art fills ~85% of its square frame, so scale the drawn size up a
// touch to make the visible silhouette roughly match the entity's radius*2.
const FILL_COMPENSATION = 1.2;

export const drawEntitySprite = (
    ctx: CanvasRenderingContext2D,
    id: string | undefined,
    radius: number,
    rotation = 0,
): boolean => {
    const img = spriteCache.get(id);
    if (!img) return false;
    ctx.save();
    if (rotation) ctx.rotate(rotation);
    const d = radius * 2 * FILL_COMPENSATION;
    ctx.drawImage(img, -d / 2, -d / 2, d, d);
    ctx.restore();
    return true;
};

// Sprite-id conventions: match the manifest ids (lowercased enum / kind).
export const enemySpriteId = (e: { enemyType?: string }) => e.enemyType ? e.enemyType.toLowerCase() : undefined;
export const pickupSpriteId = (p: { kind?: string }) => p.kind ? p.kind.toLowerCase() : undefined;
