
import { EnemyType } from '../../types';
import { IEnemyBehavior } from './types';
import { DefaultBehavior, OrbitalBehavior } from './behaviors/CommonBehaviors';
import { 
    SentinelBehavior, GhostBehavior, LaserLotusBehavior, 
    LancerBehavior, OrbitalSniperBehavior, UtatuBehavior,
    MandelbrotBehavior, MonolithBehavior
} from './behaviors/MobBehaviors';
import { 
    BossVanguardBehavior, BossHiveMindBehavior, BossCyberKrakenBehavior, 
    BossShangoBehavior, BossAidoHwedoBehavior, BossTrinityBehavior
} from './behaviors/BossBehaviors';

export type { IEnemyBehavior, AIContext, AIResult } from './types';

export const EnemyBehaviors: Record<string, IEnemyBehavior> = {
    [EnemyType.SENTINEL]: new SentinelBehavior(),
    [EnemyType.GHOST]: new GhostBehavior(),
    [EnemyType.LASER_LOTUS]: new LaserLotusBehavior(),
    [EnemyType.LANCER]: new LancerBehavior(),
    [EnemyType.ORBITAL_SNIPER]: new OrbitalSniperBehavior(),
    [EnemyType.UTATU]: new UtatuBehavior(),
    
    // New Enemies
    [EnemyType.MANDELBROT_MITE]: new MandelbrotBehavior(),
    [EnemyType.PRISMATIC_MONOLITH]: new MonolithBehavior(),
    
    // Orbital Shared
    [EnemyType.SWARMER]: new OrbitalBehavior(),
    [EnemyType.INFERNO_SPINNER]: new OrbitalBehavior(),
    [EnemyType.BINARY_SENTINEL]: new OrbitalBehavior(),
    
    // Bosses
    [EnemyType.BOSS_VANGUARD]: new BossVanguardBehavior(),
    [EnemyType.BOSS_HIVE_MIND]: new BossHiveMindBehavior(),
    [EnemyType.BOSS_CYBER_KRAKEN]: new BossCyberKrakenBehavior(),
    [EnemyType.BOSS_SHANGO]: new BossShangoBehavior(),
    [EnemyType.BOSS_AIDO_HWEDO]: new BossAidoHwedoBehavior(),
    
    // Trinity
    [EnemyType.BOSS_TRINITY_CUBE]: new BossTrinityBehavior(),
    [EnemyType.BOSS_TRINITY_PYRAMID]: new BossTrinityBehavior(),
    [EnemyType.BOSS_TRINITY_ORB]: new BossTrinityBehavior(),
    
    'DEFAULT': new DefaultBehavior()
};
