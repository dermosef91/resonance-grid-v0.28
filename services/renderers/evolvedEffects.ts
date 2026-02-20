import { Vector2, VisualParticle, TextParticle, Shockwave, EntityType } from '../../types';
import { getVisualParticle } from '../objectPools';

export const createEvolvedDeathEffect = (pos: Vector2, weaponId: string, radius: number): { particles: (VisualParticle | TextParticle)[], screenShake: number, shockwave?: Shockwave } => {
    const particles: (VisualParticle | TextParticle)[] = [];
    let screenShake = 0;
    let shockwave: Shockwave | undefined;

    // Generic evolved death effect
    // We can customize this based on weaponId if we had the mapping
    const color = '#00FFFF'; // Cyan for evolved energy

    // 1. Central flash
    particles.push(getVisualParticle({
        id: Math.random().toString(),
        type: EntityType.VISUAL_PARTICLE,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: 0,
        color: '#FFFFFF',
        markedForDeletion: false,
        life: 10,
        maxLife: 10,
        size: radius * 2,
        decay: 0.1,
        shape: 'CIRCLE',
        lightColor: color,
        lightRadius: radius * 3
    }));

    // 2. Shockwave
    shockwave = {
        id: Math.random().toString(),
        pos: { ...pos },
        maxRadius: radius * 3,
        maxDuration: 30,
        time: 0,
        strength: 5
    };

    // 3. Debris/Sparks
    const count = 12;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        particles.push(getVisualParticle({
            id: Math.random().toString(),
            type: EntityType.VISUAL_PARTICLE,
            pos: { x: pos.x, y: pos.y },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            radius: 0,
            color: color,
            markedForDeletion: false,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 4,
            decay: 0.9,
            shape: 'SQUARE',
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.1
        }));
    }

    screenShake = 5;

    return { particles, screenShake, shockwave };
};
