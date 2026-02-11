
import { useCallback } from 'react';
import { Enemy, EnemyType, MissionType } from '../types';
import { ZOOM_LEVEL } from '../constants';

// Define population caps for specific enemies
const ENEMY_CAPS: Partial<Record<EnemyType, number>> = {
    [EnemyType.TANK]: 25,
    [EnemyType.BINARY_SENTINEL]: 10,
    [EnemyType.SWARMER]: 50,
    [EnemyType.LASER_LOTUS]: 10
};

const MAX_GLOBAL_ENEMIES = 50;

export const useEnemyManager = (gameState: any) => {
    const { enemiesRef, missionRef, cameraRef } = gameState;

    const addEnemies = useCallback((newEnemies: Enemy[]) => {
        const candidates: Enemy[] = [];
        
        newEnemies.forEach(e => {
            const cap = ENEMY_CAPS[e.enemyType];
            if (cap !== undefined) {
                const currentCount = enemiesRef.current.filter((existing: Enemy) => existing.enemyType === e.enemyType && !existing.markedForDeletion).length;
                const pendingCount = candidates.filter(pending => pending.enemyType === e.enemyType).length;
                if (currentCount + pendingCount >= cap) return;
            }
            candidates.push(e);
        });

        if (candidates.length === 0) return;

        const currentValid = enemiesRef.current.filter((e: Enemy) => !e.markedForDeletion);
        const effectiveLimit = missionRef.current.type === MissionType.KING_OF_THE_HILL ? 30 : MAX_GLOBAL_ENEMIES;
        const totalAfter = currentValid.length + candidates.length;
        
        if (totalAfter > effectiveLimit) {
            const toRemove = totalAfter - effectiveLimit;
            let removedCount = 0;
            
            const cam = cameraRef.current;
            const vW = window.innerWidth / ZOOM_LEVEL;
            const vH = window.innerHeight / ZOOM_LEVEL;
            const margin = 100;
            const l = cam.x - margin; const r = cam.x + vW + margin; const t = cam.y - margin; const b = cam.y + vH + margin;

            const isOnScreen = (e: Enemy) => e.pos.x + e.radius > l && e.pos.x - e.radius < r && e.pos.y + e.radius > t && e.pos.y - e.radius < b;

            for (const e of enemiesRef.current) {
                if (removedCount >= toRemove) break;
                if (!e.markedForDeletion && !e.isBoss && !e.isMissionTarget) {
                    if (!isOnScreen(e)) {
                        e.markedForDeletion = true;
                        removedCount++;
                    }
                }
            }
            
            if (removedCount < toRemove) {
                const keepCount = candidates.length - (toRemove - removedCount);
                if (keepCount < candidates.length) candidates.length = Math.max(0, keepCount);
            }
        }
        
        if (candidates.length > 0) enemiesRef.current.push(...candidates);
    }, [enemiesRef, missionRef, cameraRef]);

    return { addEnemies };
};
