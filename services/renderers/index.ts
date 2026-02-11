
import { Enemy, EnemyType } from '../../types';
import { drawVanguard } from './bosses/VanguardRenderer';
import { drawHiveMind } from './bosses/HiveMindRenderer';
import { drawCyberKraken } from './bosses/CyberKrakenRenderer';
import { drawShango } from './bosses/ShangoRenderer';
import { drawAidoHwedo } from './bosses/AidoHwedoRenderer';
import { drawTrinityPart } from './bosses/TrinityRenderer';

import { 
    drawLancer, drawDrone, drawSentinel, 
    drawGhost, drawTank, drawSwarmer, drawNeonCobra, drawInfernoSpinner, 
    drawBinarySentinel, drawLaserLotus, 
    drawOrbitalSniper, drawUtatu, drawDefault,
    drawMandelbrotMite, drawPrismaticMonolith
} from './mobRenderers';

type Renderer = (ctx: CanvasRenderingContext2D, e: Enemy, frame: number) => void;

export const EnemyRenderRegistry: Record<string, Renderer> = {
    // BOSSES
    [EnemyType.BOSS_VANGUARD]: drawVanguard,
    [EnemyType.BOSS_HIVE_MIND]: drawHiveMind,
    [EnemyType.BOSS_CYBER_KRAKEN]: drawCyberKraken,
    [EnemyType.BOSS_SHANGO]: drawShango,
    [EnemyType.BOSS_AIDO_HWEDO]: drawAidoHwedo,
    
    // TRINITY BOSS PARTS
    [EnemyType.BOSS_TRINITY_CUBE]: drawTrinityPart,
    [EnemyType.BOSS_TRINITY_PYRAMID]: drawTrinityPart,
    [EnemyType.BOSS_TRINITY_ORB]: drawTrinityPart,

    // MOBS
    [EnemyType.LANCER]: drawLancer,
    [EnemyType.DRONE]: drawDrone,
    [EnemyType.ELITE_DRONE]: drawDrone, // Uses same renderer
    [EnemyType.SENTINEL]: drawSentinel,
    [EnemyType.GHOST]: drawGhost,
    [EnemyType.TANK]: drawTank,
    [EnemyType.SWARMER]: drawSwarmer,
    [EnemyType.NEON_COBRA]: drawNeonCobra,
    [EnemyType.INFERNO_SPINNER]: drawInfernoSpinner,
    [EnemyType.BINARY_SENTINEL]: drawBinarySentinel,
    [EnemyType.LASER_LOTUS]: drawLaserLotus,
    [EnemyType.ORBITAL_SNIPER]: drawOrbitalSniper,
    [EnemyType.UTATU]: drawUtatu,
    
    // NEW ENEMIES
    [EnemyType.MANDELBROT_MITE]: drawMandelbrotMite,
    [EnemyType.PRISMATIC_MONOLITH]: drawPrismaticMonolith,
    
    // DEFAULT
    'DEFAULT': drawDefault
};
