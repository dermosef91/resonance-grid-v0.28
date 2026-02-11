
import { Projectile, VisualParticle, TextParticle, EntityType } from '../types';

class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (item: T) => void;

    constructor(factory: () => T, reset: (item: T) => void, initialSize = 100) {
        this.factory = factory;
        this.reset = reset;
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    get(): T {
        const item = this.pool.pop() || this.factory();
        this.reset(item);
        return item;
    }

    release(item: T) {
        this.pool.push(item);
    }
}

export const projectilePool = new ObjectPool<Projectile>(
    () => ({
        id: '', type: EntityType.PROJECTILE, pos: {x:0,y:0}, velocity: {x:0,y:0}, radius: 0, color: '#fff', markedForDeletion: false,
        damage: 0, duration: 0, pierce: 0, knockback: 0, isEnemy: false, hitEnemyIds: []
    }),
    (p) => {
        p.id = ''; p.markedForDeletion = false; p.homingTargetId = undefined; p.turnSpeed = undefined;
        p.sourceWeaponId = undefined; p.chainData = undefined; p.mineData = undefined; p.boomerangData = undefined;
        p.skyFallData = undefined; p.beamData = undefined; p.stunDuration = undefined; p.voidWakeData = undefined;
        p.polyPoints = undefined;
        p.customData = undefined; 
        p.anchorData = undefined;
        // Fix: Reset new data structures to prevent state leakage
        p.kaleidoscopeData = undefined;
        p.paradoxData = undefined;
        
        if (p.hitEnemyIds) p.hitEnemyIds.length = 0; else p.hitEnemyIds = [];
    },
    1000
);

export const visualParticlePool = new ObjectPool<VisualParticle>(
    () => ({
        id: '', type: EntityType.VISUAL_PARTICLE, pos: {x:0,y:0}, velocity: {x:0,y:0}, radius: 0, color: '#fff', markedForDeletion: false,
        life: 0, maxLife: 0, size: 0, decay: 0,
        rotation: 0, rotationSpeed: 0, shape: 'SQUARE'
    }),
    (p) => { 
        p.id = ''; p.markedForDeletion = false; 
        p.rotation = 0; p.rotationSpeed = 0; p.shape = 'SQUARE';
        p.lightColor = undefined; p.lightRadius = undefined; // Reset light props
    },
    500
);

export const textParticlePool = new ObjectPool<TextParticle>(
    () => ({
        id: '', type: EntityType.TEXT_PARTICLE, pos: {x:0,y:0}, velocity: {x:0,y:0}, radius: 0, color: '#fff', markedForDeletion: false,
        text: '', life: 0, opacity: 1
    }),
    (p) => { p.id = ''; p.markedForDeletion = false; p.opacity = 1; },
    200
);

export const getProjectile = (props: Partial<Projectile>): Projectile => {
    const p = projectilePool.get();
    Object.assign(p, props);
    return p;
};

export const getVisualParticle = (props: Partial<VisualParticle>): VisualParticle => {
    const p = visualParticlePool.get();
    Object.assign(p, props);
    return p;
};

export const getTextParticle = (props: Partial<TextParticle>): TextParticle => {
    const p = textParticlePool.get();
    Object.assign(p, props);
    return p;
};
