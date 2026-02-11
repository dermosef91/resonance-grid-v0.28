
import { Enemy, Player, Projectile, Vector2, EnemyType, VisualParticle, TextParticle } from '../../types';

export interface AIContext {
    spawnEnemy: (player: Player, type: EnemyType, overridePos?: Vector2) => Enemy;
    allEnemies?: Enemy[]; // Optional context for swarm behaviors
}

export interface AIResult {
    velocity: Vector2;
    newProjectiles: Projectile[];
    newEnemies: Enemy[];
    newParticles: (VisualParticle | TextParticle)[];
    screenShake?: number;
}

export interface IEnemyBehavior {
    update(enemy: Enemy, player: Player, ctx: AIContext): AIResult;
}
