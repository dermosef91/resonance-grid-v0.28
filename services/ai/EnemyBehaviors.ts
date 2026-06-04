
import { EnemyType } from '../../types';
import { IEnemyBehavior } from './types';
import { DefaultBehavior, OrbitalBehavior } from './behaviors/CommonBehaviors';
import {
    SentinelBehavior, GhostBehavior, LaserLotusBehavior,
    LancerBehavior, OrbitalSniperBehavior, UtatuBehavior,
    MandelbrotBehavior, MonolithBehavior,
    SankofaTotemBehavior, KintsugiWraithBehavior, CalabashVoidBehavior,
    AnansiBroodPodBehavior, SankofaSiphonBehavior, ObsidianHeartBehavior,
    MirrorDjinnBehavior, DatamoshCorruptorBehavior
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

    // Brainstorm Roster (v0.28)
    [EnemyType.SANKOFA_TOTEM]: new SankofaTotemBehavior(),
    [EnemyType.KINTSUGI_WRAITH]: new KintsugiWraithBehavior(),
    [EnemyType.CALABASH_VOID]: new CalabashVoidBehavior(),
    [EnemyType.ANANSI_BROOD_POD]: new AnansiBroodPodBehavior(),
    [EnemyType.SANKOFA_SIPHON]: new SankofaSiphonBehavior(),
    [EnemyType.OBSIDIAN_HEART]: new ObsidianHeartBehavior(),
    [EnemyType.MIRROR_DJINN]: new MirrorDjinnBehavior(),
    [EnemyType.DATAMOSH_CORRUPTOR]: new DatamoshCorruptorBehavior(),
    
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
