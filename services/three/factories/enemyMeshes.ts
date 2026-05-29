import * as THREE from 'three';
import { Enemy } from '../../../types';
import { MeshFactory } from '../meshRegistry';
import { simpleNeonFactory } from './common';

// Spin a ring-shaped enemy flat on the ground and rotate it about the vertical.
const spinFlat = (speed: number) => (obj: THREE.Object3D, _e: Enemy, frame: number) => {
    obj.rotation.set(Math.PI / 2, 0, frame * speed);
};

// Per-EnemyType mesh factory. Geometries map onto the polyhedra the 2D
// renderer drew; colour comes from each enemy's own `color`. Bosses and any
// unmapped type fall through to DEFAULT (a large bright icosahedron) so the
// whole game is playable in 3D before the bespoke boss rigs land (Phase 3).
export const enemyRegistry: Record<string, MeshFactory<Enemy>> = {
    DRONE: simpleNeonFactory('enemy::tetra', () => new THREE.TetrahedronGeometry(1)),
    ELITE_DRONE: simpleNeonFactory('enemy::octa', () => new THREE.OctahedronGeometry(1), { emissive: 2.7 }),
    SWARMER: simpleNeonFactory('enemy::tetraS', () => new THREE.TetrahedronGeometry(1), { scale: 0.9, emissive: 2.4 }),
    TANK: simpleNeonFactory('enemy::dodeca', () => new THREE.DodecahedronGeometry(1.05), { emissive: 2.0 }),
    SENTINEL: simpleNeonFactory('enemy::octa', () => new THREE.OctahedronGeometry(1)),
    GHOST: simpleNeonFactory('enemy::icosa', () => new THREE.IcosahedronGeometry(1), { useOpacity: true, emissive: 1.8 }),
    LANCER: simpleNeonFactory('enemy::cone', () => new THREE.ConeGeometry(0.7, 2, 4)),
    NEON_COBRA: simpleNeonFactory('enemy::cone', () => new THREE.ConeGeometry(0.7, 2, 4), { emissive: 2.6 }),
    INFERNO_SPINNER: simpleNeonFactory('enemy::torus', () => new THREE.TorusGeometry(1, 0.3, 8, 18), { animate: spinFlat(0.3) }),
    BINARY_SENTINEL: simpleNeonFactory('enemy::octa', () => new THREE.OctahedronGeometry(1)),
    LASER_LOTUS: simpleNeonFactory('enemy::torusW', () => new THREE.TorusGeometry(1, 0.18, 8, 24), { animate: spinFlat(0.12) }),
    ORBITAL_SNIPER: simpleNeonFactory('enemy::cone', () => new THREE.ConeGeometry(0.7, 2, 4)),
    UTATU: simpleNeonFactory('enemy::tetra', () => new THREE.TetrahedronGeometry(1)),
    FERROFLUID_SLIME: simpleNeonFactory('enemy::icosa', () => new THREE.IcosahedronGeometry(1), { emissive: 2.0 }),
    MANDELBROT_MITE: simpleNeonFactory('enemy::icosa', () => new THREE.IcosahedronGeometry(1)),
    PRISMATIC_MONOLITH: simpleNeonFactory('enemy::tallbox', () => new THREE.BoxGeometry(0.8, 2.4, 0.8), { heightMul: 1.2 }),
    DEFAULT: simpleNeonFactory('enemy::bossIcosa', () => new THREE.IcosahedronGeometry(1, 1), { emissive: 2.8 }),
};

export const enemyKey = (e: Enemy): string =>
    enemyRegistry[e.enemyType] ? e.enemyType : 'DEFAULT';
