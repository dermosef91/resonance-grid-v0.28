import * as THREE from 'three';
import { ColorPalette } from '../../../types';
import { toColor } from '../sceneUtils';

const CELL = 60;            // grid cell size in world units (matches 2D grid spacing)
const GRID_SIZE = 4200;     // total grid extent (kept finite, snapped to follow player)
const GROUND_SIZE = 40000;  // huge dark plane so its edge is never visible

// Static scene scaffold: a dark ground plane, a neon grid that follows the
// player (infinite-grid illusion), lighting, and a distant starfield.
export class Environment {
    private grid: THREE.GridHelper;
    private ground: THREE.Mesh;
    private stars: THREE.Points;
    private lastGridColor = '';

    constructor(scene: THREE.Scene, palette: ColorPalette) {
        // Ground plane.
        const groundMat = new THREE.MeshStandardMaterial({
            color: toColor(palette.background).clone().multiplyScalar(0.5),
            roughness: 0.95, metalness: 0.0,
        });
        this.ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.5;
        scene.add(this.ground);

        // Neon grid.
        const divisions = Math.round(GRID_SIZE / CELL);
        const gridColor = toColor(palette.grid);
        this.grid = new THREE.GridHelper(GRID_SIZE, divisions, gridColor.clone(), gridColor.clone());
        (this.grid.material as THREE.Material).opacity = 0.35;
        (this.grid.material as THREE.Material).transparent = true;
        this.lastGridColor = palette.grid;
        scene.add(this.grid);

        // Lighting — modest; the neon read comes from emissive + bloom.
        scene.add(new THREE.AmbientLight(0x404058, 0.7));
        const hemi = new THREE.HemisphereLight(0x6070a0, 0x0a0a12, 0.6);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.5);
        dir.position.set(0.5, 1, 0.3);
        scene.add(dir);

        // Distant starfield.
        const starGeo = new THREE.BufferGeometry();
        const count = 900;
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 6000 + Math.random() * 6000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            arr[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 400; // bias above horizon
            arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaab0d0, size: 6, sizeAttenuation: true }));
        scene.add(this.stars);
    }

    // Snap the grid to the player so it appears infinite, and re-tint on biome
    // changes. The ground/stars stay centred on the player horizontally.
    update(playerX: number, playerY: number, palette: ColorPalette): void {
        const gx = Math.round(playerX / CELL) * CELL;
        const gz = Math.round(playerY / CELL) * CELL;
        this.grid.position.set(gx, 0, gz);
        this.ground.position.x = playerX;
        this.ground.position.z = playerY;
        this.stars.position.set(playerX, 0, playerY);

        if (palette.grid !== this.lastGridColor) {
            const c = toColor(palette.grid);
            const mat = this.grid.material as THREE.LineBasicMaterial;
            mat.color.copy(c);
            this.lastGridColor = palette.grid;
        }
    }
}
