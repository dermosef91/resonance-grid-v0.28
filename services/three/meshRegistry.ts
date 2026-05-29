import * as THREE from 'three';
import { disposeObject } from './sceneUtils';

// A factory mirrors one entry of the legacy EnemyRenderRegistry: it knows how
// to build a fresh Object3D for an entity and how to update that object's
// transform/appearance each frame from the entity's (read-only) state.
export interface MeshFactory<E> {
    create(entity: E): THREE.Object3D;
    update(obj: THREE.Object3D, entity: E, frame: number): void;
}

// Persistent id-keyed pool for one entity collection. Creates a mesh when an
// entity first appears, updates it every frame, and disposes it when the entity
// is gone — the same create/update/cull lifecycle the prompt calls for.
export class EntityMeshPool<E extends { id: string }> {
    private map = new Map<string, { obj: THREE.Object3D; key: string }>();

    constructor(
        private scene: THREE.Scene,
        // Resolve which factory (and a stable key identifying it) an entity uses.
        private dispatch: (e: E) => { key: string; factory: MeshFactory<E> },
    ) {}

    sync(entities: E[], frame: number): void {
        const seen = new Set<string>();
        for (const e of entities) {
            seen.add(e.id);
            const { key, factory } = this.dispatch(e);
            let entry = this.map.get(e.id);
            // Recreate if the visual key changed (e.g. an enemy morphing type).
            if (!entry || entry.key !== key) {
                if (entry) { this.scene.remove(entry.obj); disposeObject(entry.obj); }
                const obj = factory.create(e);
                this.scene.add(obj);
                entry = { obj, key };
                this.map.set(e.id, entry);
            }
            factory.update(entry.obj, e, frame);
        }
        // Cull anything no longer present.
        for (const [id, entry] of this.map) {
            if (!seen.has(id)) {
                this.scene.remove(entry.obj);
                disposeObject(entry.obj);
                this.map.delete(id);
            }
        }
    }

    clear(): void {
        for (const [, entry] of this.map) {
            this.scene.remove(entry.obj);
            disposeObject(entry.obj);
        }
        this.map.clear();
    }
}
