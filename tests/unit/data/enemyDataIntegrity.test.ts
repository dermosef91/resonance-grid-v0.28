import { describe, it, expect } from 'vitest';
import { EnemyType } from '../../../types';
import { ALL_ENEMIES_DB, MASS } from '../../../services/data/enemies';

// BOSS_TRINITY is a wave-config placeholder (hp:0, radius:0, speed:0) — it has
// no spawnable form and therefore intentionally lacks a MASS entry.
const PLACEHOLDER_TYPES = new Set([EnemyType.BOSS_TRINITY]);

describe('Enemy data integrity', () => {
  // ─── ALL_ENEMIES_DB ───────────────────────────────────────────────────────

  describe('ALL_ENEMIES_DB', () => {
    it('contains no duplicate enemy types', () => {
      const types = ALL_ENEMIES_DB.map(e => e.type);
      const unique = new Set(types);
      expect(unique.size).toBe(types.length);
    });

    it('every included entry has positive hp', () => {
      for (const entry of ALL_ENEMIES_DB.filter(e => e.included && !PLACEHOLDER_TYPES.has(e.type))) {
        expect(entry.hp, `${entry.name} must have hp > 0`).toBeGreaterThan(0);
      }
    });

    it('every included entry has positive radius', () => {
      for (const entry of ALL_ENEMIES_DB.filter(e => e.included && !PLACEHOLDER_TYPES.has(e.type))) {
        expect(entry.radius, `${entry.name} must have radius > 0`).toBeGreaterThan(0);
      }
    });

    it('every included entry has positive speed', () => {
      for (const entry of ALL_ENEMIES_DB.filter(e => e.included && !PLACEHOLDER_TYPES.has(e.type))) {
        expect(entry.speed, `${entry.name} must have speed > 0`).toBeGreaterThan(0);
      }
    });
  });

  // ─── MASS table ───────────────────────────────────────────────────────────

  describe('MASS table', () => {
    it('every spawnable enemy in ALL_ENEMIES_DB has a MASS entry', () => {
      const missing: string[] = [];
      for (const entry of ALL_ENEMIES_DB) {
        if (PLACEHOLDER_TYPES.has(entry.type)) continue;
        if (MASS[entry.type] === undefined) {
          missing.push(`${entry.name} (${entry.type})`);
        }
      }
      expect(missing, `Missing MASS entries: ${missing.join(', ')}`).toHaveLength(0);
    });

    it('all MASS values are positive numbers', () => {
      for (const [type, value] of Object.entries(MASS)) {
        expect(value, `MASS[${type}] must be > 0`).toBeGreaterThan(0);
      }
    });
  });

  // ─── Known gaps (documented, not accidentally introduced) ─────────────────

  describe('known gaps — document intentional omissions so regressions are visible', () => {
    it('FERROFLUID_SLIME exists in EnemyType enum', () => {
      expect(EnemyType.FERROFLUID_SLIME).toBeDefined();
    });

    it('FERROFLUID_SLIME has no ALL_ENEMIES_DB entry yet (known gap)', () => {
      const found = ALL_ENEMIES_DB.some(e => e.type === EnemyType.FERROFLUID_SLIME);
      // This test documents the current state. When the enemy is fully implemented,
      // delete this test and add it to the MASS table and ALL_ENEMIES_DB instead.
      expect(found).toBe(false);
    });

    it('FERROFLUID_SLIME has no MASS entry yet (known gap)', () => {
      expect(MASS[EnemyType.FERROFLUID_SLIME]).toBeUndefined();
    });
  });
});
