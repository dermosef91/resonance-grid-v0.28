
import { AIResult } from './types';

export const createEmptyResult = (): AIResult => ({
    velocity: { x: 0, y: 0 },
    newProjectiles: [],
    newEnemies: [],
    newParticles: [],
    screenShake: 0
});
