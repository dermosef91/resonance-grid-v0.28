import * as THREE from 'three';
import { Projectile } from '../../../types';
import { MeshFactory } from '../meshRegistry';
import { simpleNeonFactory } from './common';

// Ring-style projectiles (auras, shockwaves, resonance blasts) expand as a
// flat torus; their `radius` already encodes the current ring size.
const RING_WEAPONS = /aura|shockwave|resonance|mine|bass|loop|nova/i;

export const projectileRegistry: Record<string, MeshFactory<Projectile>> = {
    // Expanding flat energy ring.
    RING: simpleNeonFactory<Projectile>('proj::ring', () => new THREE.TorusGeometry(1, 0.12, 6, 28), {
        emissive: 2.6, showEdges: false, heightMul: 0.4,
        animate: (obj, _e, frame) => obj.rotation.set(Math.PI / 2, 0, frame * 0.04),
    }),
    // Enemy shots: tumbling dark-cored shard.
    ENEMY: simpleNeonFactory<Projectile>('proj::enemy', () => new THREE.TetrahedronGeometry(1), {
        emissive: 2.0, heightMul: 0.8,
        animate: (obj, _e, frame) => { obj.rotation.x = frame * 0.2; obj.rotation.y = frame * 0.16; },
    }),
    // Default player bolt: bright spinning octahedral shard.
    DEFAULT: simpleNeonFactory<Projectile>('proj::bolt', () => new THREE.OctahedronGeometry(1), {
        emissive: 3.0, heightMul: 0.8,
        animate: (obj, _e, frame) => { obj.rotation.y = frame * 0.25; obj.rotation.z = frame * 0.15; },
    }),
};

export const projectileKey = (p: Projectile): string => {
    if (p.isEnemy) return 'ENEMY';
    if (p.sourceWeaponId && RING_WEAPONS.test(p.sourceWeaponId)) return 'RING';
    return 'DEFAULT';
};
