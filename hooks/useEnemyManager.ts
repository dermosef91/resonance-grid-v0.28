
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

        // Prioritize Mission Targets and Bosses to prevent them from being culled by the cap
        candidates.sort((a, b) => {
            const aPrio = (a.isMissionTarget || a.isBoss) ? 1 : 0;
            const bPrio = (b.isMissionTarget || b.isBoss) ? 1 : 0;
            return bPrio - aPrio;
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
                // We need to trim candidates to respect the limit.
                // HOWEVER, we should never drop Mission Targets or Bosses.
                // If effectiveLimit is reached with targets, we slightly overflow (Soft Cap).

                // Identify how many we *want* to drop
                const neededDrop = toRemove - removedCount;

                // Sort candidates so expendable ones (non-targets) are at the end
                // We already sorted targets to the front (index 0).

                // Find the cut-off index.
                let cutIndex = candidates.length - neededDrop;

                // Ensure cutIndex doesn't slice into critical enemies
                // We iterate from the back; if we hit a target, we stop trimming.
                // Since targets are sorted to the front, we just need to ensure cutIndex >= number of targets.
                const targetCount = candidates.filter(c => c.isMissionTarget || c.isBoss).length;

                if (cutIndex < targetCount) {
                    cutIndex = targetCount; // Force keep all targets
                }

                if (cutIndex < candidates.length) {
                    candidates.length = Math.max(0, cutIndex);
                }
            }
        }

        if (candidates.length > 0) enemiesRef.current.push(...candidates);
    }, [enemiesRef, missionRef, cameraRef]);

    return { addEnemies };
};
