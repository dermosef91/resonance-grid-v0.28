import { describe, it, expect } from 'vitest';
import { handleChainLightning } from '../../../services/gameLogic';
import { makeEnemy, makeChainProjectile } from '../../helpers/factories';

describe('handleChainLightning', () => {
  // ─── Guard conditions ─────────────────────────────────────────────────────

  it('returns empty array when bouncesRemaining is 0', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 0 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    expect(handleChainLightning(proj, hitEnemy, [])).toHaveLength(0);
  });

  it('returns empty array when projectile has no chainData', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3 });
    delete (proj as any).chainData;
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    expect(handleChainLightning(proj, hitEnemy, [])).toHaveLength(0);
  });

  it('returns empty array when no enemies are in range', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3, range: 100 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const outOfRange = makeEnemy({ id: 'e2', pos: { x: 200, y: 0 } });
    expect(handleChainLightning(proj, hitEnemy, [hitEnemy, outOfRange])).toHaveLength(0);
  });

  // ─── Basic bounce ─────────────────────────────────────────────────────────

  it('returns exactly one chain projectile when a target is in range', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const target = makeEnemy({ id: 'e2', pos: { x: 50, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, target]);
    expect(result).toHaveLength(1);
  });

  it('targets the nearest enemy in range, not just the first in the array', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const near = makeEnemy({ id: 'e2', pos: { x: 50, y: 0 } });   // dist = 50
    const far = makeEnemy({ id: 'e3', pos: { x: 150, y: 0 } });   // dist = 150

    // Array order has far before near to prove it's not just first-in-array
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, far, near]);
    expect(result).toHaveLength(1);
    // The chain projectile originates from hitEnemy and moves toward near (positive x)
    expect(result[0].velocity.x).toBeGreaterThan(0);
    expect(result[0].velocity.y).toBeCloseTo(0, 5);
  });

  it("fires the chain from the hit enemy's position", () => {
    const proj = makeChainProjectile({ bouncesRemaining: 2, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 100, y: 200 } });
    const target = makeEnemy({ id: 'e2', pos: { x: 150, y: 200 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, target]);
    expect(result[0].pos).toEqual({ x: 100, y: 200 });
  });

  // ─── Bounce count management ──────────────────────────────────────────────

  it('decrements bouncesRemaining by 1 on the new projectile', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const target = makeEnemy({ id: 'e2', pos: { x: 50, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, target]);
    expect(result[0].chainData?.bouncesRemaining).toBe(2);
  });

  // ─── Visited-set / backtrack prevention ───────────────────────────────────

  it('does not bounce back to the just-hit enemy', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 2, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    // The only other entity is farther away than range
    const farAway = makeEnemy({ id: 'e2', pos: { x: 1000, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, farAway]);
    expect(result).toHaveLength(0);
  });

  it('does not bounce back to previously hit enemies in chainData.hitEntityIds', () => {
    const proj = makeChainProjectile({
      bouncesRemaining: 2,
      range: 500,
      hitEntityIds: ['e0'],
    });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const alreadyHit = makeEnemy({ id: 'e0', pos: { x: 5, y: 0 } });
    const fresh = makeEnemy({ id: 'e2', pos: { x: 60, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [alreadyHit, hitEnemy, fresh]);
    expect(result).toHaveLength(1);
    // 'e0' and 'e1' must both appear in the new chain's visited set
    const newVisited = result[0].chainData?.hitEntityIds ?? [];
    expect(newVisited).toContain('e0');
    expect(newVisited).toContain('e1');
  });

  it('carries the visited set forward so the bounce that arrives at the target cannot backtrack to hitEnemy', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 3, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const target = makeEnemy({ id: 'e2', pos: { x: 50, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, target]);
    const newVisited = result[0].chainData?.hitEntityIds ?? [];
    // hitEnemy (e1) is in the serialised visited set so the next bounce skips it.
    // The target (e2) is NOT added here — it becomes hitEnemy in the next call
    // and gets added to visited at that point.
    expect(newVisited).toContain('e1');
    expect(newVisited).not.toContain('e2');
  });

  // ─── Damage falloff ───────────────────────────────────────────────────────

  it('applies 20% damage falloff to the chain projectile', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 2, range: 500, damage: 100 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const target = makeEnemy({ id: 'e2', pos: { x: 50, y: 0 } });
    const result = handleChainLightning(proj, hitEnemy, [hitEnemy, target]);
    expect(result[0].damage).toBeCloseTo(80);
  });

  // ─── Dead / deleted enemies ───────────────────────────────────────────────

  it('skips enemies with health <= 0', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 2, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const dead = makeEnemy({ id: 'e2', pos: { x: 10, y: 0 }, health: 0 });
    expect(handleChainLightning(proj, hitEnemy, [hitEnemy, dead])).toHaveLength(0);
  });

  it('skips enemies marked for deletion', () => {
    const proj = makeChainProjectile({ bouncesRemaining: 2, range: 500 });
    const hitEnemy = makeEnemy({ id: 'e1', pos: { x: 0, y: 0 } });
    const deleted = makeEnemy({ id: 'e2', pos: { x: 10, y: 0 }, markedForDeletion: true });
    expect(handleChainLightning(proj, hitEnemy, [hitEnemy, deleted])).toHaveLength(0);
  });
});
