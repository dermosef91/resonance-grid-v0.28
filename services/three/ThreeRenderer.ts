import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { ZOOM_LEVEL } from '../../constants';
import { graphicsSettings } from '../graphicsSettings';
import { Enemy, Projectile, Pickup, Replica } from '../../types';
import { RenderFrame } from './types';
import { EntityMeshPool } from './meshRegistry';
import { toColor } from './sceneUtils';
import { Environment } from './factories/environment';
import { playerFactory } from './factories/playerMesh';
import { enemyRegistry, enemyKey } from './factories/enemyMeshes';
import { projectileRegistry, projectileKey } from './factories/projectileMeshes';
import { pickupRegistry, pickupKey } from './factories/pickupMeshes';
import { simpleNeonFactory } from './factories/common';

const FOV = 50;          // vertical field of view (degrees)
const TILT_DEG = 58;     // camera pitch below horizontal (tilted 3/4 view)

// Allies/clones: simple bright octahedron coloured per replica.
const replicaFactory = simpleNeonFactory<Replica>(
    'replica::octa',
    () => new THREE.OctahedronGeometry(1),
    { emissive: 2.4, heightMul: 0.7, animate: (obj, _e, frame) => { obj.rotation.y = frame * 0.05; } },
);

// Owns the entire Three.js scene and drives it from per-frame game state. This
// is the real-3D replacement for the legacy Canvas2D renderGame().
export class ThreeRenderer {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private composer: EffectComposer;

    private env: Environment | null = null;
    private playerObj: THREE.Object3D | null = null;
    private enemyPool: EntityMeshPool<Enemy>;
    private projectilePool: EntityMeshPool<Projectile>;
    private pickupPool: EntityMeshPool<Pickup>;
    private replicaPool: EntityMeshPool<Replica>;

    private lastW = 0;
    private lastH = 0;
    private lastDpr = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setClearColor(0x04040a, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x04040a);
        this.scene.fog = new THREE.Fog(0x04040a, 2600, 11000);

        this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 30000);

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.7, 0.12);
        this.composer.addPass(bloom);
        this.composer.addPass(new OutputPass());

        this.enemyPool = new EntityMeshPool(this.scene, (e) => ({ key: enemyKey(e), factory: enemyRegistry[enemyKey(e)] }));
        this.projectilePool = new EntityMeshPool(this.scene, (p) => ({ key: projectileKey(p), factory: projectileRegistry[projectileKey(p)] }));
        this.pickupPool = new EntityMeshPool(this.scene, (p) => ({ key: pickupKey(p), factory: pickupRegistry[pickupKey(p)] }));
        this.replicaPool = new EntityMeshPool(this.scene, () => ({ key: 'R', factory: replicaFactory }));
    }

    resize(cssW: number, cssH: number, dpr: number): void {
        this.lastW = cssW; this.lastH = cssH; this.lastDpr = dpr;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(cssW, cssH, false);
        this.camera.aspect = cssW / Math.max(1, cssH);
        this.camera.updateProjectionMatrix();
        // EffectComposer multiplies by its pixel ratio internally.
        (this.composer as unknown as { setPixelRatio?: (r: number) => void }).setPixelRatio?.(dpr);
        this.composer.setSize(cssW, cssH);
    }

    render(f: RenderFrame): void {
        if (f.viewW !== this.lastW || f.viewH !== this.lastH || f.dpr !== this.lastDpr) {
            this.resize(f.viewW, f.viewH, f.dpr);
        }

        if (!this.env) this.env = new Environment(this.scene, f.palette);
        this.env.update(f.player.pos.x, f.player.pos.y, f.palette);
        this.scene.background = toColor(f.palette.background);

        if (!this.playerObj) {
            this.playerObj = playerFactory.create(f.player);
            this.scene.add(this.playerObj);
        }
        playerFactory.update(this.playerObj, f.player, f.frame);

        this.enemyPool.sync(f.enemies, f.frame);
        this.projectilePool.sync(f.projectiles, f.frame);
        this.pickupPool.sync(f.pickups, f.frame);
        this.replicaPool.sync(f.replicas, f.frame);

        this.updateCamera(f);
        this.composer.render();
    }

    // Player-locked tilted 3/4 camera. Distance is solved from the legacy
    // ZOOM_LEVEL so the on-screen world coverage matches the 2D build (mobile's
    // lower zoom -> wider span -> camera pulls back automatically).
    private updateCamera(f: RenderFrame): void {
        const spanWorld = f.viewH / ZOOM_LEVEL;
        const fovRad = THREE.MathUtils.degToRad(FOV);
        const dist = (spanWorld / 2) / Math.tan(fovRad / 2);
        const pitch = THREE.MathUtils.degToRad(TILT_DEG);

        let tx = f.player.pos.x;
        let tz = f.player.pos.y;
        let cx = tx;
        let cy = dist * Math.sin(pitch);
        let cz = tz + dist * Math.cos(pitch);

        if (graphicsSettings.screenShake && f.screenShake > 0) {
            const trauma = Math.min(1, f.screenShake / 24);
            const mag = trauma * trauma * 42;
            const ang = Math.random() * Math.PI * 2;
            const sx = Math.cos(ang) * mag;
            const sz = Math.sin(ang) * mag;
            cx += sx; cz += sz; tx += sx; tz += sz;
        }

        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(tx, 0, tz);
    }

    dispose(): void {
        this.enemyPool.clear();
        this.projectilePool.clear();
        this.pickupPool.clear();
        this.replicaPool.clear();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
