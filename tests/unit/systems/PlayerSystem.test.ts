import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updatePlayer } from '../../../services/systems/PlayerSystem';
import { makePlayer } from '../../helpers/factories';
import { DASH } from '../../../constants';
import { graphicsSettings } from '../../../services/graphicsSettings';
import { MissionType } from '../../../types';

const NO_INPUT = { x: 0, y: 0 };
const NO_DASH = { requested: false, mobileDir: null };

describe('updatePlayer', () => {
  // ─── Timer decrements ─────────────────────────────────────────────────────

  describe('timer decrements', () => {
    it('decrements invulnerabilityTimer each frame', () => {
      const p = makePlayer({ invulnerabilityTimer: 5 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.invulnerabilityTimer).toBe(4);
    });

    it('does not decrement invulnerabilityTimer below zero', () => {
      const p = makePlayer({ invulnerabilityTimer: 0 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.invulnerabilityTimer).toBe(0);
    });

    it('decrements kaleidoscopeTimer each frame', () => {
      const p = makePlayer({ kaleidoscopeTimer: 10 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.kaleidoscopeTimer).toBe(9);
    });

    it('decrements healthPulseTimer each frame', () => {
      const p = makePlayer({ healthPulseTimer: 3 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.healthPulseTimer).toBe(2);
    });

    it('decrements xpPulseTimer each frame', () => {
      const p = makePlayer({ xpPulseTimer: 7 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.xpPulseTimer).toBe(6);
    });
  });

  // ─── Dash timer expiry ────────────────────────────────────────────────────

  describe('dash timer expiry', () => {
    it('sets dashCooldown when dashTimer counts down to zero', () => {
      const p = makePlayer({ dashTimer: 1, dashDir: { x: 1, y: 0 } });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.dashTimer).toBe(0);
      // dashCooldown is set to DASH.COOLDOWN then immediately decremented by 1
      // in the same frame, so the observable value is DASH.COOLDOWN - 1.
      expect(p.dashCooldown).toBe(DASH.COOLDOWN - 1);
    });

    it('decrements dashCooldown each frame when on cooldown', () => {
      const p = makePlayer({ dashCooldown: 60 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.dashCooldown).toBe(59);
    });

    it('does not assign dashCooldown when dashTimer was already zero', () => {
      const p = makePlayer({ dashTimer: 0, dashCooldown: 0 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.dashCooldown).toBe(0);
    });
  });

  // ─── Regeneration ─────────────────────────────────────────────────────────

  describe('regeneration', () => {
    it('heals by regen amount on multiples of frame 40', () => {
      const p = makePlayer({ health: 80, maxHealth: 100, stats: { ...makePlayer().stats, regen: 5 } });
      updatePlayer(p, NO_INPUT, 40, undefined, NO_DASH);
      expect(p.health).toBe(85);
    });

    it('does not heal on non-regen frames', () => {
      const p = makePlayer({ health: 80, maxHealth: 100, stats: { ...makePlayer().stats, regen: 5 } });
      updatePlayer(p, NO_INPUT, 41, undefined, NO_DASH);
      expect(p.health).toBe(80);
    });

    it('caps health at maxHealth', () => {
      const p = makePlayer({ health: 98, maxHealth: 100, stats: { ...makePlayer().stats, regen: 5 } });
      updatePlayer(p, NO_INPUT, 40, undefined, NO_DASH);
      expect(p.health).toBe(100);
    });

    it('sets healthPulseTimer when healing occurs', () => {
      const p = makePlayer({ health: 80, maxHealth: 100, healthPulseTimer: 0, stats: { ...makePlayer().stats, regen: 5 } });
      updatePlayer(p, NO_INPUT, 40, undefined, NO_DASH);
      expect(p.healthPulseTimer).toBe(5);
    });

    it('does not heal when regen is 0', () => {
      const p = makePlayer({ health: 80, maxHealth: 100 });
      updatePlayer(p, NO_INPUT, 40, undefined, NO_DASH);
      expect(p.health).toBe(80);
    });

    it('does not set healthPulseTimer when already at maxHealth', () => {
      const p = makePlayer({ health: 100, maxHealth: 100, healthPulseTimer: 0, stats: { ...makePlayer().stats, regen: 5 } });
      updatePlayer(p, NO_INPUT, 40, undefined, NO_DASH);
      expect(p.health).toBe(100);
      expect(p.healthPulseTimer).toBe(0);
    });
  });

  // ─── Dash activation ──────────────────────────────────────────────────────

  describe('dash activation', () => {
    let origDashEnabled: boolean;

    beforeEach(() => {
      origDashEnabled = graphicsSettings.dashEnabled;
      graphicsSettings.dashEnabled = true;
    });

    afterEach(() => {
      graphicsSettings.dashEnabled = origDashEnabled;
    });

    it('activates dash when all conditions are met', () => {
      const p = makePlayer({ dashCooldown: 0, dashTimer: 0 });
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, { requested: true, mobileDir: null });
      expect(p.dashTimer).toBe(DASH.DURATION);
    });

    it('grants i-frames lasting at least DASH.DURATION + 8 on activation', () => {
      const p = makePlayer({ dashCooldown: 0, dashTimer: 0, invulnerabilityTimer: 0 });
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, { requested: true, mobileDir: null });
      // i-frames are set to DASH.DURATION + 8, then decremented by 1 this frame
      expect(p.invulnerabilityTimer).toBeGreaterThanOrEqual(DASH.DURATION + 7);
    });

    it('does not activate dash when on cooldown', () => {
      const p = makePlayer({ dashCooldown: 60, dashTimer: 0 });
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, { requested: true, mobileDir: null });
      expect(p.dashTimer).toBe(0);
    });

    it('does not re-activate dash while already dashing', () => {
      const p = makePlayer({ dashCooldown: 0, dashTimer: 8, dashDir: { x: 1, y: 0 } });
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, { requested: true, mobileDir: null });
      // dashTimer should decrement (8→7), not reset to DASH.DURATION
      expect(p.dashTimer).toBe(7);
    });

    it('does not activate dash when dashEnabled is false', () => {
      graphicsSettings.dashEnabled = false;
      const p = makePlayer({ dashCooldown: 0, dashTimer: 0 });
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, { requested: true, mobileDir: null });
      expect(p.dashTimer).toBe(0);
    });

    it('uses mobileDir when provided', () => {
      const p = makePlayer({ dashCooldown: 0, dashTimer: 0 });
      updatePlayer(p, { x: 0, y: 0 }, 1, undefined, { requested: true, mobileDir: { x: 0, y: 1 } });
      expect(p.dashTimer).toBe(DASH.DURATION);
      expect(p.dashDir).toEqual({ x: 0, y: 1 });
    });
  });

  // ─── Movement physics ─────────────────────────────────────────────────────

  describe('movement physics', () => {
    it('accelerates in input direction', () => {
      const p = makePlayer();
      updatePlayer(p, { x: 1, y: 0 }, 1, undefined, NO_DASH);
      expect(p.velocity.x).toBeGreaterThan(0);
    });

    it('applies friction when there is no input', () => {
      const p = makePlayer({ velocity: { x: 4, y: 0 } });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.velocity.x).toBeCloseTo(4 * 0.88, 5);
    });

    it('caps velocity magnitude at player.speed', () => {
      const p = makePlayer({ velocity: { x: 100, y: 0 }, speed: 6 });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      // After friction 100*0.88=88 >> 6, so it must be capped
      expect(Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2)).toBeCloseTo(6, 1);
    });

    it('zeroes velocity when below stop threshold', () => {
      const p = makePlayer({ velocity: { x: 0.05, y: 0 } });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.velocity.x).toBe(0);
      expect(p.velocity.y).toBe(0);
    });

    it('applies SHADOW_STEP +20% speed mod — allows higher top speed', () => {
      // With SHADOW_STEP, speed cap is speed * 1.2. We can verify that a velocity
      // slightly above normal speed is NOT clamped under SHADOW_STEP.
      const speed = 6;
      const normalCap = speed;
      const shadowCap = speed * 1.2; // 7.2
      const testVelocity = 7; // between normalCap and shadowCap

      const pNormal = makePlayer({ velocity: { x: testVelocity, y: 0 }, speed });
      updatePlayer(pNormal, NO_INPUT, 1, undefined, NO_DASH);
      // Normal mode: 7 * 0.88 = 6.16 > 6, clamped to 6
      expect(Math.sqrt(pNormal.velocity.x ** 2 + pNormal.velocity.y ** 2)).toBeCloseTo(normalCap, 1);

      const pShadow = makePlayer({ velocity: { x: testVelocity, y: 0 }, speed });
      updatePlayer(pShadow, NO_INPUT, 1, MissionType.SHADOW_STEP, NO_DASH);
      // SHADOW_STEP: 7 * 0.88 = 6.16 < 7.2, not clamped
      expect(Math.sqrt(pShadow.velocity.x ** 2 + pShadow.velocity.y ** 2)).toBeCloseTo(testVelocity * 0.88, 2);
    });

    it('moves player position by velocity each frame', () => {
      const p = makePlayer({ pos: { x: 0, y: 0 }, velocity: { x: 3, y: 0 } });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      // Friction reduces velocity before position update in source:
      // velocity = 3 * 0.88 = 2.64, then pos.x += 2.64
      expect(p.pos.x).toBeCloseTo(3 * 0.88, 5);
    });
  });

  // ─── Position history ─────────────────────────────────────────────────────

  describe('position history', () => {
    it('appends current position to positionHistory each frame', () => {
      const p = makePlayer({ positionHistory: [] });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.positionHistory).toHaveLength(1);
    });

    it('keeps positionHistory capped at 120 entries', () => {
      const history = Array.from({ length: 120 }, (_, i) => ({ x: i, y: 0 }));
      const p = makePlayer({ positionHistory: history });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(p.positionHistory).toHaveLength(120);
    });

    it('drops the oldest entry when history exceeds 120', () => {
      const history = Array.from({ length: 120 }, (_, i) => ({ x: i, y: 0 }));
      const p = makePlayer({ positionHistory: history });
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      // Entry {x:0} was the oldest and should be shifted out
      expect(p.positionHistory[0].x).toBe(1);
    });

    it('initialises positionHistory if it is missing (defensive check)', () => {
      // positionHistory is required by the type but could be missing at runtime
      const p = makePlayer();
      (p as any).positionHistory = undefined;
      updatePlayer(p, NO_INPUT, 1, undefined, NO_DASH);
      expect(Array.isArray(p.positionHistory)).toBe(true);
      expect(p.positionHistory.length).toBeGreaterThan(0);
    });
  });
});
