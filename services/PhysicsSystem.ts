
import { Entity, EntityType, EnemyType, Enemy, Projectile, Vector2, Obstacle } from '../types';

// --- SPATIAL PARTITIONING ---
export class SpatialHash {
    cellSize: number;
    cells: Map<string, Entity[]>;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    private getKey(x: number, y: number): string {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    add(entity: Entity) {
        const minX = Math.floor((entity.pos.x - entity.radius) / this.cellSize);
        const maxX = Math.floor((entity.pos.x + entity.radius) / this.cellSize);
        const minY = Math.floor((entity.pos.y - entity.radius) / this.cellSize);
        const maxY = Math.floor((entity.pos.y + entity.radius) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key)!.push(entity);
            }
        }
    }

    query(pos: Vector2, radius: number): Entity[] {
        const results = new Set<Entity>();
        const minX = Math.floor((pos.x - radius) / this.cellSize);
        const maxX = Math.floor((pos.x + radius) / this.cellSize);
        const minY = Math.floor((pos.y - radius) / this.cellSize);
        const maxY = Math.floor((pos.y + radius) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        results.add(cell[i]);
                    }
                }
            }
        }
        return Array.from(results);
    }
}

// Distance from point P to segment V-W squared
function distToSegmentSquared(p: Vector2, v: Vector2, w: Vector2) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

export const checkCollision = (a: Entity, b: Entity): boolean => {
    // Special handling for Binary Sentinel (The "Link" enemy)
    if (b.type === EntityType.ENEMY && (b as Enemy).enemyType === EnemyType.BINARY_SENTINEL && (b as Enemy).binaryData) {
        const enemy = b as Enemy;
        const bd = enemy.binaryData!;

        // Calculate the two node positions
        const halfSep = bd.separation / 2;
        const cos = Math.cos(bd.angle);
        const sin = Math.sin(bd.angle);

        const node1 = { x: enemy.pos.x + cos * halfSep, y: enemy.pos.y + sin * halfSep };
        const node2 = { x: enemy.pos.x - cos * halfSep, y: enemy.pos.y - sin * halfSep };

        // 1. Check collision with Node 1
        let dx = a.pos.x - node1.x; let dy = a.pos.y - node1.y;
        if ((dx * dx + dy * dy) < (a.radius + bd.nodeRadius) ** 2) return true;

        // 2. Check collision with Node 2
        dx = a.pos.x - node2.x; dy = a.pos.y - node2.y;
        if ((dx * dx + dy * dy) < (a.radius + bd.nodeRadius) ** 2) return true;

        // 3. Check collision with the Link (Line Segment)
        const beamThickness = 8;
        const distSq = distToSegmentSquared(a.pos, node1, node2);
        if (distSq < (a.radius + beamThickness) ** 2) return true;

        return false;
    }

    // Reverse check if A is the Sentinel
    if (a.type === EntityType.ENEMY && (a as Enemy).enemyType === EnemyType.BINARY_SENTINEL && (a as Enemy).binaryData) {
        return checkCollision(b, a); // Swap
    }

    const dx = a.pos.x - b.pos.x;
    const dy = a.pos.y - b.pos.y;
    const distSq = dx * dx + dy * dy;
    const radSum = a.radius + b.radius;
    return distSq < (radSum * radSum);
};

// Generic beam check against any Entity (Player or Enemy)
export const checkBeamCollision = (beam: Projectile, target: Entity): boolean => {
    if (!beam.beamData) return false;

    const angle = beam.beamData.angle;
    const length = beam.beamData.length;

    const startX = beam.pos.x;
    const startY = beam.pos.y;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;

    const px = target.pos.x;
    const py = target.pos.y;

    const l2 = Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2);
    if (l2 === 0) return checkCollision(beam, target);

    let t = ((px - startX) * (endX - startX) + (py - startY) * (endY - startY)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = startX + t * (endX - startX);
    const projY = startY + t * (endY - startY);

    const distSq = Math.pow(px - projX, 2) + Math.pow(py - projY, 2);
    const hitRadius = (beam.beamData.width / 2) + target.radius;

    return distSq < (hitRadius * hitRadius);
};

export const resolveStaticCollision = (dynamicEntity: Entity, staticObstacle: Entity) => {
    const dx = dynamicEntity.pos.x - staticObstacle.pos.x;
    const dy = dynamicEntity.pos.y - staticObstacle.pos.y;
    const distSq = dx * dx + dy * dy;
    const minDist = dynamicEntity.radius + staticObstacle.radius;

    if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;
        // Push out
        const overlap = minDist - dist;
        dynamicEntity.pos.x += nx * overlap;
        dynamicEntity.pos.y += ny * overlap;

        // Kill velocity if moving towards
        if (dynamicEntity.velocity) {
            // Project velocity onto normal
            const dot = dynamicEntity.velocity.x * nx + dynamicEntity.velocity.y * ny;
            if (dot < 0) {
                // Remove component of velocity towards obstacle
                dynamicEntity.velocity.x -= dot * nx;
                dynamicEntity.velocity.y -= dot * ny;
            }
        }
        return true;
    }
    return false;
};

export const getNearestEnemy = (source: { pos: Vector2 }, enemies: Enemy[], excludeIds: string[] = []): Enemy | null => {
    let nearest: Enemy | null = null;
    let minDistSq = Infinity;
    const rangeLimitSq = 1000 * 1000;

    for (const enemy of enemies) {
        if (excludeIds.includes(enemy.id)) continue;

        const dx = source.pos.x - enemy.pos.x;
        const dy = source.pos.y - enemy.pos.y;

        if (Math.abs(dx) > 1000 || Math.abs(dy) > 1000) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq > rangeLimitSq) continue;

        if (distSq < minDistSq) {
            minDistSq = distSq;
            nearest = enemy;
        }
    }
    return nearest;
};

export const getNearestEnemies = (source: { pos: Vector2 }, enemies: Enemy[], count: number, excludeIds: string[] = []): Enemy[] => {
    const result: { enemy: Enemy, distSq: number }[] = [];
    const rangeLimitSq = 1200 * 1200;

    for (const enemy of enemies) {
        if (excludeIds.includes(enemy.id)) continue;

        const dx = source.pos.x - enemy.pos.x;
        const dy = source.pos.y - enemy.pos.y;

        if (Math.abs(dx) > 1200 || Math.abs(dy) > 1200) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq > rangeLimitSq) continue;

        result.push({ enemy, distSq });
    }

    result.sort((a, b) => a.distSq - b.distSq);
    return result.slice(0, count).map(r => r.enemy);
};
