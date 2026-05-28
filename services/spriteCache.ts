// Loads & caches authored sprite PNGs for the Option-3 sprite render path.
// Lazy: the first lookup kicks off a one-time fetch of sprite-index.json and
// preloads every referenced image. Missing/failed images simply stay absent,
// so callers fall back to the procedural renderer.

const BASE = ((import.meta as any).env?.BASE_URL as string | undefined) ?? './';

class SpriteCache {
    private images = new Map<string, HTMLImageElement>();
    private started = false;

    private begin() {
        if (this.started) return;
        this.started = true;
        void this.load();
    }

    private async load() {
        try {
            const res = await fetch(`${BASE}sprites/sprite-index.json`);
            if (!res.ok) return;
            const index: Record<string, string> = await res.json();
            await Promise.all(
                Object.entries(index).map(([id, rel]) => new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => { this.images.set(id, img); resolve(); };
                    img.onerror = () => resolve();
                    img.src = `${BASE}${rel}`;
                }))
            );
        } catch {
            /* no sprite index yet — procedural fallback everywhere */
        }
    }

    /** Returns a loaded image for `id`, or null (caller falls back). */
    get(id?: string): HTMLImageElement | null {
        if (!id) return null;
        if (!this.started) this.begin();
        return this.images.get(id) ?? null;
    }
}

export const spriteCache = new SpriteCache();
