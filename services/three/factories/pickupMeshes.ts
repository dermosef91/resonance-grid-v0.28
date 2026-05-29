import * as THREE from 'three';
import { Pickup } from '../../../types';
import { MeshFactory } from '../meshRegistry';
import { simpleNeonFactory } from './common';

// Hovering bob + slow spin shared by all collectibles.
const float = (spin: number) => (obj: THREE.Object3D, _e: Pickup, frame: number) => {
    obj.rotation.y = frame * spin;
    obj.position.y += Math.sin(frame * 0.08 + obj.position.x) * 0.15 * obj.scale.y;
};

export const pickupRegistry: Record<string, MeshFactory<Pickup>> = {
    XP: simpleNeonFactory<Pickup>('pickup::xp', () => new THREE.OctahedronGeometry(1), {
        emissive: 3.0, heightMul: 1.2, scale: 1.1, animate: float(0.06),
    }),
    HEALTH: simpleNeonFactory<Pickup>('pickup::health', () => new THREE.BoxGeometry(1.1, 1.1, 1.1), {
        emissive: 2.6, heightMul: 1.2, animate: float(0.04),
    }),
    CURRENCY: simpleNeonFactory<Pickup>('pickup::cur', () => new THREE.OctahedronGeometry(1), {
        emissive: 2.8, heightMul: 1.2, scale: 0.9, animate: float(0.09),
    }),
    TIME_CRYSTAL: simpleNeonFactory<Pickup>('pickup::crystal', () => new THREE.OctahedronGeometry(1, 0), {
        emissive: 3.0, heightMul: 1.4, scale: 1.2, animate: float(0.07),
    }),
    DEFAULT: simpleNeonFactory<Pickup>('pickup::def', () => new THREE.OctahedronGeometry(1), {
        emissive: 2.6, heightMul: 1.3, animate: float(0.05),
    }),
};

export const pickupKey = (p: Pickup): string => (pickupRegistry[p.kind] ? p.kind : 'DEFAULT');
