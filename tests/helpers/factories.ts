import { Player, Enemy, Projectile, EntityType, EnemyType } from '../../types';
import { PLAYER_BASE_STATS } from '../../constants';

const baseStats = () => ({
  damageMult: 1,
  cooldownMult: 1,
  areaMult: 1,
  speedMult: 1,
  magnetMult: 1,
  xpMult: 1,
  projectileCountFlat: 0,
  knockbackMult: 1,
  regen: 0,
  armor: 0,
  currencyMult: 1,
});

export const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  type: EntityType.PLAYER,
  pos: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  radius: 20,
  color: '#ff6600',
  markedForDeletion: false,
  health: 100,
  maxHealth: 100,
  extraLives: 0,
  xp: 0,
  level: 1,
  nextLevelXp: 10,
  speed: PLAYER_BASE_STATS.speed,
  magnetRadius: PLAYER_BASE_STATS.magnetRadius,
  rotation: 0,
  distanceTraveled: 0,
  flipTimer: 0,
  invulnerabilityTimer: 0,
  weapons: [],
  artifacts: [],
  xpPulseTimer: 0,
  healthPulseTimer: 0,
  kaleidoscopeTimer: 0,
  dashTimer: 0,
  dashCooldown: 0,
  dashDir: { x: 1, y: 0 },
  stats: baseStats(),
  positionHistory: [],
  ...overrides,
});

export const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: 'enemy-1',
  type: EntityType.ENEMY,
  pos: { x: 100, y: 0 },
  velocity: { x: 0, y: 0 },
  radius: 15,
  color: '#ff0000',
  markedForDeletion: false,
  enemyType: EnemyType.DRONE,
  health: 20,
  maxHealth: 20,
  damage: 35,
  xpValue: 1,
  speed: 2.7,
  isBoss: false,
  attackTimer: 0,
  stunTimer: 0,
  immuneTimers: {},
  ...overrides,
});

export const makeProjectile = (overrides: Partial<Projectile> = {}): Projectile => ({
  id: 'proj-1',
  type: EntityType.PROJECTILE,
  pos: { x: 0, y: 0 },
  velocity: { x: 10, y: 0 },
  radius: 5,
  color: '#ffffff',
  markedForDeletion: false,
  damage: 50,
  duration: 60,
  pierce: 0,
  knockback: 0,
  isEnemy: false,
  hitEnemyIds: [],
  ...overrides,
});

export const makeChainProjectile = (chainOverrides: {
  bouncesRemaining: number;
  range?: number;
  hitEntityIds?: string[];
  isStunning?: boolean;
  damage?: number;
} & Partial<Projectile> = { bouncesRemaining: 3 }): Projectile => {
  const { bouncesRemaining, range = 300, hitEntityIds = [], isStunning = false, damage, ...projOverrides } = chainOverrides;
  return makeProjectile({
    damage: damage ?? 50,
    chainData: {
      bouncesRemaining,
      hitEntityIds: [...hitEntityIds],
      range,
      isStunning,
    },
    ...projOverrides,
  });
};
