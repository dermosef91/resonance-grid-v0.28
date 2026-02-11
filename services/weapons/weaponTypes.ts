
import { Player, Projectile, Weapon, Vector2, VisualParticle } from '../../types';

export interface WeaponContext {
    player: Player;
    weapon: Weapon;
    targets: Vector2[];
    baseDamage: number;
    baseSpeed: number;
    totalCount: number;
    onSpawnParticle: (p: VisualParticle) => void;
}

export type WeaponBehavior = (ctx: WeaponContext) => Projectile[];
