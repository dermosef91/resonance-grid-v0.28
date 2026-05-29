import * as THREE from 'three';

// --- Colour parsing ------------------------------------------------------
// Entity colours arrive as CSS strings: hex (#ff6600), rgb()/rgba(), hsl(),
// or named. THREE.Color handles hex/rgb/hsl/named but throws on rgba() (the
// alpha channel). Strip alpha first and fall back to white on anything odd so
// a bad colour never crashes the frame.
const _colorCache = new Map<string, THREE.Color>();

export const toColor = (css: string | undefined): THREE.Color => {
    const key = css || '#ffffff';
    const cached = _colorCache.get(key);
    if (cached) return cached;

    let c: THREE.Color;
    try {
        let s = key.trim();
        // rgba(r,g,b,a) -> rgb(r,g,b)  /  hsla(...) -> hsl(...)
        const rgbaMatch = s.match(/^rgba?\(([^)]+)\)$/i);
        if (rgbaMatch) {
            const parts = rgbaMatch[1].split(',').map(p => p.trim());
            s = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
        }
        const hslaMatch = s.match(/^hsla\(([^)]+)\)$/i);
        if (hslaMatch) {
            const parts = hslaMatch[1].split(',').map(p => p.trim());
            s = `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
        }
        c = new THREE.Color(s);
    } catch {
        c = new THREE.Color('#ffffff');
    }
    _colorCache.set(key, c);
    return c;
};

// --- Coordinate mapping --------------------------------------------------
// Gameplay is a 2D top-down plane (x, y). Map to a Y-up Three space where the
// ground is the X-Z plane: world.x -> three.x, world.y -> three.z, with a small
// per-entity height lifting meshes off the floor.
export const worldToThree = (x: number, y: number, height: number): [number, number, number] =>
    [x, height, y];

// In-plane heading (radians, +x toward +y) -> yaw about the Three Y axis.
export const headingToYaw = (rotation: number): number => -rotation;

// --- Geometry cache ------------------------------------------------------
// Primitive geometries are shared across all instances of a type (they never
// vary per entity — only colour/scale do). Cached for the app lifetime and
// intentionally never disposed, so per-entity disposal can safely skip
// geometry and only release the per-instance material.
const _geoCache = new Map<string, THREE.BufferGeometry>();

export const cachedGeometry = (key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry => {
    let g = _geoCache.get(key);
    if (!g) { g = build(); _geoCache.set(key, g); }
    return g;
};

// Dispose an object's per-instance materials (geometries are shared/cached and
// left alone). Call when an entity leaves the scene.
export const disposeObject = (obj: THREE.Object3D): void => {
    obj.traverse((child) => {
        const mesh = child as THREE.Mesh & { material?: THREE.Material | THREE.Material[] };
        const mat = mesh.material;
        if (!mat) return;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
    });
};

// Neon material: dark base that reads almost entirely through its emissive
// channel, so the UnrealBloom pass produces the glowing-edge look.
export const neonMaterial = (color: THREE.Color | string, emissiveIntensity = 2.2): THREE.MeshStandardMaterial => {
    const c = color instanceof THREE.Color ? color : toColor(color);
    return new THREE.MeshStandardMaterial({
        color: 0x050507,
        emissive: c.clone(),
        emissiveIntensity,
        roughness: 0.4,
        metalness: 0.1,
    });
};
