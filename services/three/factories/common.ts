import * as THREE from 'three';
import { Vector2 } from '../../../types';
import { MeshFactory } from '../meshRegistry';
import { cachedGeometry, neonMaterial, toColor, worldToThree } from '../sceneUtils';

// Minimal shape every pooled entity satisfies for rendering purposes.
export interface RenderableEntity {
    id: string;
    pos: Vector2;
    radius: number;
    color: string;
    rotation?: number;
    opacity?: number;
}

export interface SimpleOpts<E> {
    emissive?: number;             // emissive intensity
    scale?: number;                // multiply radius
    heightMul?: number;            // y = radius * heightMul (default 1)
    showEdges?: boolean;           // overlay bright wireframe edges (default true)
    useOpacity?: boolean;          // honour entity.opacity (e.g. Ghost)
    // Custom per-frame hook for spin / state-driven visuals.
    animate?: (obj: THREE.Object3D, e: E, frame: number) => void;
}

const setOpacity = (obj: THREE.Object3D, opacity: number) => {
    obj.traverse((c) => {
        const m = (c as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (!m) return;
        const apply = (mat: THREE.Material) => { mat.transparent = opacity < 0.99; mat.opacity = opacity; };
        if (Array.isArray(m)) m.forEach(apply); else apply(m);
    });
};

// Builds a reusable factory: a neon-emissive mesh + bright edge wireframe,
// coloured per-entity, positioned/scaled/spun from entity state each frame.
export const simpleNeonFactory = <E extends RenderableEntity>(
    geoKey: string,
    build: () => THREE.BufferGeometry,
    opts: SimpleOpts<E> = {},
): MeshFactory<E> => ({
    create(e) {
        const group = new THREE.Group();
        const color = toColor(e.color);
        const geo = cachedGeometry(geoKey, build);
        const body = new THREE.Mesh(geo, neonMaterial(color, opts.emissive ?? 2.2));
        body.name = 'body';
        group.add(body);
        if (opts.showEdges !== false) {
            const edgeGeo = cachedGeometry(geoKey + '::edges', () => new THREE.EdgesGeometry(build()));
            const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: color.clone() }));
            edges.name = 'edges';
            group.add(edges);
        }
        return group;
    },
    update(obj, e, frame) {
        const r = e.radius;
        obj.position.set(...worldToThree(e.pos.x, e.pos.y, r * (opts.heightMul ?? 1)));
        obj.scale.setScalar(r * (opts.scale ?? 1));
        if (opts.animate) {
            opts.animate(obj, e, frame);
        } else if (e.rotation !== undefined) {
            obj.rotation.y = -e.rotation;
        } else {
            obj.rotation.y = frame * 0.02;
            obj.rotation.x = frame * 0.01;
        }
        if (opts.useOpacity) setOpacity(obj, e.opacity ?? 1);
    },
});
