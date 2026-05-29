import * as THREE from 'three';
import { Player } from '../../../types';
import { COLORS } from '../../../constants';
import { MeshFactory } from '../meshRegistry';
import { cachedGeometry, neonMaterial, toColor, worldToThree } from '../sceneUtils';

// Player: a translucent octahedron shell (with bright edges) wrapping a fast-
// spinning icosahedron core — the 3D realisation of the 2D playerRenderer.
export const playerFactory: MeshFactory<Player> = {
    create() {
        const group = new THREE.Group();
        const orange = toColor(COLORS.orange);

        const shellGeo = cachedGeometry('player::shell', () => new THREE.OctahedronGeometry(1));
        const shell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({
            color: 0x070707, emissive: orange.clone(), emissiveIntensity: 0.7,
            transparent: true, opacity: 0.35, roughness: 0.3, metalness: 0.1,
        }));
        shell.name = 'shell';
        group.add(shell);

        const edgeGeo = cachedGeometry('player::shellEdges', () => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1)));
        const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: orange.clone() }));
        edges.name = 'edges';
        group.add(edges);

        const coreGeo = cachedGeometry('player::core', () => new THREE.IcosahedronGeometry(0.5));
        const core = new THREE.Mesh(coreGeo, neonMaterial(orange, 3.2));
        core.name = 'core';
        group.add(core);

        return group;
    },
    update(obj, p, frame) {
        const r = p.radius;
        obj.position.set(...worldToThree(p.pos.x, p.pos.y, r * 0.7));
        obj.scale.setScalar(r);
        obj.rotation.y = -p.rotation;
        const core = obj.getObjectByName('core');
        if (core) { core.rotation.y = frame * 0.05; core.rotation.x = frame * 0.03; }
        // I-frame flicker: blink the whole rig while invulnerable.
        obj.visible = !(p.invulnerabilityTimer > 0 && Math.floor(frame / 4) % 2 === 0);
    },
};
