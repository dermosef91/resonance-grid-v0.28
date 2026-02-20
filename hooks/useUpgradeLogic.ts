
import { useCallback, useRef } from 'react';
import { UpgradeOption, Player, Weapon } from '../types';
import { BASE_WEAPONS, BASE_ARTIFACTS, WEAPON_UPGRADE_TABLE, GLITCH_UPGRADES, WEAPON_AUGMENTS } from '../services/gameData';
import { PLAYER_BASE_STATS, BALANCE } from '../constants';
import { createTextParticle } from '../services/gameLogic';
import { trackEvent } from '../services/trackingService';
import { saveMetaState } from '../services/persistence';

export const useUpgradeLogic = (
    gameState: any,
    metaState: any,
    setMetaState: any
) => {
    const {
        playerRef,
        particlesRef,
        screenShakeRef,
        sessionCurrencyRef,
        waveIndexRef,
        runIdRef,

        setStatus,
        setLevelUpOptions,
        setInventory,
        setAugmentTarget,
        setGameOverInfo,
        setIsMissionReward,
        nextStatusRef,
        augmentTarget
    } = gameState;

    const pendingRewardsRef = useRef<number>(0);

    const generateUpgrades = useCallback(() => {
        const player = playerRef.current;
        const candidates: UpgradeOption[] = [];

        const isUnlocked = (id: string) => {
            const baseW = BASE_WEAPONS[id];
            const baseA = BASE_ARTIFACTS[id];
            const item = baseW || baseA;
            if (!item) return false;
            if (item.unlockReq || item.unlockCost) {
                return metaState.unlockedItems.includes(id);
            }
            return true;
        };

        if (player.weapons.length < 3) {
            const ownedIds = player.weapons.map((w: Weapon) => w.id);
            const availableNew = Object.values(BASE_WEAPONS).filter(w => !ownedIds.includes(w.id) && isUnlocked(w.id));
            availableNew.forEach(w => {
                candidates.push({
                    id: `new_${w.id}`, name: w.name, description: `New Weapon: ${w.description}`,
                    type: 'WEAPON_NEW', rarity: w.id === 'ancestral_resonance' ? 'LEGENDARY' : 'RARE', weaponId: w.id, color: w.color,
                    apply: (p: Player) => { p.weapons.push({ ...BASE_WEAPONS[w.id] }); }
                });
            });
        }

        player.weapons.forEach((w: Weapon) => {
            if (w.expiresAt) return;

            const nextLevel = w.level + 1;

            if (nextLevel === 5) {
                candidates.push({
                    id: `upgrade_${w.id}_augment`,
                    name: `${w.name} Lv 5`,
                    description: "SYSTEM MODULATION AVAILABLE. Select for specialized upgrade path.",
                    type: 'AUGMENT_TRIGGER',
                    rarity: 'UNCOMMON',
                    weaponId: w.id,
                    color: w.color,
                    apply: (p: Player) => {
                        setAugmentTarget(w);
                        setStatus('AUGMENT_SELECT');
                    }
                });
                return;
            }

            const progression = WEAPON_UPGRADE_TABLE[w.id]?.[nextLevel];
            if (progression) {
                let rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY' = 'COMMON';
                if (nextLevel === 8) rarity = 'LEGENDARY';
                else if (nextLevel === 6 || nextLevel === 7) rarity = 'RARE';
                else if (nextLevel === 3 || nextLevel === 4) rarity = 'UNCOMMON';

                candidates.push({
                    id: `upgrade_${w.id}`, name: `${w.name} Lv ${nextLevel}`, description: progression.desc,
                    type: 'WEAPON_UPGRADE', rarity: rarity, weaponId: w.id, color: w.color,
                    apply: (p: Player) => { const weapon = p.weapons.find(pw => pw.id === w.id); if (weapon) { weapon.level++; progression.apply(weapon); } }
                });
            } else if (w.level >= 8) {
                candidates.push({
                    id: `upgrade_${w.id}_overclock`, name: `${w.name} Lv ${nextLevel}`, description: "OVERCLOCK: +10% Damage",
                    type: 'WEAPON_UPGRADE', rarity: 'COMMON', weaponId: w.id, color: w.color,
                    apply: (p: Player) => { const weapon = p.weapons.find(pw => pw.id === w.id); if (weapon) { weapon.level++; weapon.damage *= 1.1; } }
                });
            }
        });

        if (player.artifacts.length < 3) {
            const availableArtifacts = Object.values(BASE_ARTIFACTS).filter(a => !player.artifacts.includes(a.id) && isUnlocked(a.id));
            availableArtifacts.forEach(a => candidates.push(a));
        }

        candidates.push(...GLITCH_UPGRADES);
        candidates.push({ id: 'heal', name: 'Ancestral Mending', description: 'Heal 50% Health', type: 'STAT', rarity: 'COMMON', color: '#00ff00', apply: (p: Player) => { p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.5); p.healthPulseTimer = 15; } });
        candidates.push({ id: 'speed', name: 'Rhythm Stride', description: '10% increased Movement and Projectile Speed', type: 'STAT', rarity: 'COMMON', color: '#33ccff', apply: (p: Player) => { p.stats.speedMult += 0.1; p.speed = PLAYER_BASE_STATS.speed * p.stats.speedMult; } });
        candidates.push({ id: 'might', name: 'Warrior Spirit', description: '+15% Damage on all weapons', type: 'STAT', rarity: 'COMMON', color: '#ff9900', apply: (p: Player) => { p.stats.damageMult += 0.15; } });
        candidates.push({ id: 'area', name: 'Cosmic Expansion', description: '15% increased projectile/aura radius on all weapons', type: 'STAT', rarity: 'COMMON', color: '#aa00ff', apply: (p: Player) => { p.stats.areaMult += 0.15; } });
        candidates.push({ id: 'magnet_boost', name: 'Magnetic Field', description: '+15% Item Pickup Range', type: 'STAT', rarity: 'COMMON', color: '#00ccff', apply: (p: Player) => { p.stats.magnetMult += 0.15; p.magnetRadius = PLAYER_BASE_STATS.magnetRadius * p.stats.magnetMult; } });
        candidates.push({ id: 'instant_chips', name: 'Wealth Subroutine', description: '+20 Data Chips', type: 'STAT', rarity: 'COMMON', color: '#FFD700', apply: (p: Player) => { sessionCurrencyRef.current += 20; } });

        const WEIGHTS: Record<string, number> = { 'COMMON': 50, 'UNCOMMON': 30, 'RARE': 15, 'LEGENDARY': 5, 'GLITCH': 1 };

        const selected: UpgradeOption[] = [];
        const pool = [...candidates];
        for (let i = 0; i < 3; i++) {
            if (pool.length === 0) break;
            const totalWeight = pool.reduce((acc, opt) => acc + (WEIGHTS[opt.rarity] || 10), 0);
            let randomVal = Math.random() * totalWeight;
            const pickedIndex = pool.findIndex(opt => { const w = WEIGHTS[opt.rarity] || 10; if (randomVal < w) return true; randomVal -= w; return false; });
            if (pickedIndex !== -1) { selected.push(pool[pickedIndex]); pool.splice(pickedIndex, 1); }
        }
        setLevelUpOptions(selected);
    }, [metaState, setLevelUpOptions]);

    const selectUpgrade = useCallback((opt: UpgradeOption) => {
        // Mark all displayed options as seen
        const displayedIds = gameState.levelUpOptions.map((o: UpgradeOption) => o.weaponId || o.id);
        const currentSeen = metaState.seenItems || [];
        const newSeen = displayedIds.filter((id: string) => !currentSeen.includes(id));

        if (newSeen.length > 0) {
            const newState = {
                ...metaState,
                seenItems: [...currentSeen, ...newSeen]
            };
            setMetaState(newState);
            saveMetaState(newState);
        }

        opt.apply(playerRef.current);
        if (opt.type !== 'AUGMENT_TRIGGER') {
            if (pendingRewardsRef.current > 0) {
                pendingRewardsRef.current--;
                playerRef.current.level++;
                playerRef.current.nextLevelXp = Math.floor(playerRef.current.nextLevelXp * BALANCE.XP_GROWTH_RATE);
                generateUpgrades();
            } else {
                setStatus(nextStatusRef.current);
                nextStatusRef.current = 'PLAYING';
                setIsMissionReward(false);
            }
        }
    }, [generateUpgrades, setStatus, setIsMissionReward, metaState, setMetaState, gameState.levelUpOptions]);

    const applyAugment = useCallback((augmentId: string) => {
        if (!augmentTarget) return;

        const weapon = playerRef.current.weapons.find((w: Weapon) => w.id === augmentTarget.id);
        if (weapon) {
            weapon.level++;
            weapon.augment = augmentId;
            const progression = WEAPON_UPGRADE_TABLE[weapon.id]?.[5];
            if (progression) progression.apply(weapon);

            // particlesRef.current.push(createTextParticle(playerRef.current.pos, "SYSTEM MODULATED", '#00FFFF', 90));
            screenShakeRef.current += 15;
            setInventory([...playerRef.current.weapons]);
        }

        setAugmentTarget(null);

        if (pendingRewardsRef.current > 0) {
            pendingRewardsRef.current--;
            playerRef.current.level++;
            playerRef.current.nextLevelXp = Math.floor(playerRef.current.nextLevelXp * BALANCE.XP_GROWTH_RATE);
            generateUpgrades();
            setStatus('LEVEL_UP');
        } else {
            setStatus(nextStatusRef.current);
            nextStatusRef.current = 'PLAYING';
            setIsMissionReward(false);
        }
    }, [augmentTarget, generateUpgrades, setStatus, setIsMissionReward, setAugmentTarget, setInventory]);

    const handleAdReward = useCallback(() => {
        setGameOverInfo((prev: any) => {
            if (!prev) return null;
            const bonus = prev.chipsEarned;
            const newState = { ...metaState, currency: metaState.currency + bonus };
            setMetaState(newState);
            saveMetaState(newState);
            trackEvent(runIdRef.current, 'LOOT_PICKUP', playerRef.current, newState, waveIndexRef.current, bonus, Math.floor(gameState.frameRef.current / 60), { type: 'AD_REWARD' });
            return { ...prev, chipsEarned: prev.chipsEarned * 2 };
        });
    }, [metaState, setMetaState, setGameOverInfo]);

    return {
        generateUpgrades,
        selectUpgrade,
        applyAugment,
        handleAdReward,
        pendingRewardsRef
    };
};
