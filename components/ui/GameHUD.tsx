
import React, { useState, useEffect, useRef } from 'react';
import { Weapon, Enemy, MissionState, MissionType, EnemyType, TutorialStep } from '../../types';
import { BASE_ARTIFACTS, WEAPON_AUGMENTS } from '../../services/gameData';
import { CurrencyDisplay, IconFrame } from '../Common';
import { formatTime, getMissionColorConfig } from '../../utils/uiUtils';

export const GameHUD: React.FC<{
    uiStats: { health: number, maxHealth: number, level: number, xp: number, nextXp: number, score: number, currency: number, runTime?: number };
    waveInfo: { id: number, boss?: string, mission?: MissionState };
    inventory: Weapon[];
    artifacts: string[];
    activeBoss: Enemy | null;
    activeBosses?: Enemy[]; // Optional array of bosses
    onPause: () => void;
    isLevelUp?: boolean;
    tutorialStep?: TutorialStep;
}> = ({ uiStats, waveInfo, inventory, artifacts, activeBoss, activeBosses, onPause, isLevelUp, tutorialStep = 'NONE' }) => {

    const [xpPulse, setXpPulse] = useState(false);
    const prevXp = useRef(uiStats.xp);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    useEffect(() => {
        if (uiStats.xp > prevXp.current && !isLevelUp) {
            setXpPulse(true);
            const t = setTimeout(() => setXpPulse(false), 200);
            return () => clearTimeout(t);
        }
        prevXp.current = uiStats.xp;
    }, [uiStats.xp, isLevelUp]);

    const [missionDisplayState, setMissionDisplayState] = useState<'SPLASH' | 'HUD'>('HUD');
    const lastMissionHash = useRef<string>("");

    // Effect 1: Trigger SPLASH on mission change
    useEffect(() => {
        const m = waveInfo.mission;
        if (!m) return;
        const currentHash = `${waveInfo.id}_${m.type}_${m.stage || ''}`;

        if (currentHash !== lastMissionHash.current) {
            setMissionDisplayState('SPLASH');
            lastMissionHash.current = currentHash;
        }
    }, [waveInfo.id, waveInfo.mission?.type, waveInfo.mission?.stage]);

    // Effect 2: Handle SPLASH timeout
    useEffect(() => {
        if (missionDisplayState === 'SPLASH') {
            const t = setTimeout(() => {
                setMissionDisplayState('HUD');
            }, 1500);
            return () => clearTimeout(t);
        }
    }, [missionDisplayState]);

    const getBossName = (boss: Enemy) => {
        switch (boss.enemyType) {
            case EnemyType.BOSS_VANGUARD: return "THE VANGUARD";
            case EnemyType.BOSS_HIVE_MIND: return "THE HIVE";
            case EnemyType.BOSS_CYBER_KRAKEN: return "CYBER-KRAKEN";
            case EnemyType.BOSS_SHANGO: return "SHANGO'S WRATH";
            case EnemyType.BOSS_AIDO_HWEDO: return "AIDO-HWEDO";
            case EnemyType.BOSS_TRINITY_CUBE: return "TRINITY: CUBE";
            case EnemyType.BOSS_TRINITY_PYRAMID: return "TRINITY: PYRAMID";
            case EnemyType.BOSS_TRINITY_ORB: return "TRINITY: ORB";
            default: return "UNKNOWN ANOMALY";
        }
    };

    const mission = waveInfo.mission;
    let displayTitle = "";
    let displayContent = "";
    let isSplash = false;
    let showDisplay = false;
    let borderColor = "border-orange-500";
    let titleColor = "text-orange-400";
    let splashShadow = "shadow-[0_0_30px_rgba(255,102,0,0.4)]";

    if (tutorialStep !== 'NONE') {
        showDisplay = true;
        borderColor = "border-white";
        titleColor = "text-white";
        isSplash = false;

        if (tutorialStep === 'MOVE') {
            displayContent = isMobile ? "DRAG ANYWHERE TO MOVE" : "USE ARROW KEYS TO MOVE";
        } else if (tutorialStep === 'COMBAT') {
            displayContent = "WEAPONS FIRE AUTOMATICALLY";
        } else if (tutorialStep === 'COLLECT') {
            displayContent = "COLLECT DATA TO LEVEL UP";
        }
    }
    else if (mission) {
        showDisplay = true;
        displayTitle = mission.description;
        const styles = getMissionColorConfig(mission.type);
        borderColor = styles.border;
        titleColor = styles.text;
        splashShadow = styles.splashShadow;

        let timeLeft = 0;

        if (mission.type === MissionType.SURVIVE || mission.type === MissionType.EVENT_HORIZON) {
            timeLeft = Math.max(0, mission.total - mission.progress);
            displayContent = `${timeLeft}s`;
        } else if (mission.type === MissionType.SOLAR_STORM) {
            const state = mission.customData?.solarData?.state;
            if (state === 'WARNING') displayContent = "WARNING";
            else if (state === 'STORM') displayContent = "DANGER";
            else displayContent = ""; // Calm
        } else if (mission.type === MissionType.ELIMINATE) {
            displayContent = `${mission.progress}/${mission.total}`;
        } else if (mission.type === MissionType.DATA_RUN) {
            displayContent = mission.stage === 'LOCATE_FRAGMENT' ? "FIND" : "DELIVER";
        } else if (mission.type === MissionType.PAYLOAD_ESCORT) {
            const progressPercent = (mission.progress / mission.total) * 100;
            displayContent = `${Math.floor(progressPercent)}%`;
        } else if (mission.type === MissionType.SHADOW_STEP || mission.type === MissionType.WEAPON_OVERRIDE) {
            timeLeft = Math.max(0, mission.total - mission.progress);
            displayContent = `${timeLeft}s`;
        } else if (mission.type === MissionType.BOSS) {
            displayContent = "";
        }

        const isFinalCountdown = (mission.type === MissionType.SURVIVE || mission.type === MissionType.SHADOW_STEP || mission.type === MissionType.EVENT_HORIZON) && timeLeft <= 3 && timeLeft > 0;
        if (missionDisplayState === 'SPLASH' || isFinalCountdown) {
            isSplash = true;
        }
    }

    // Determine which bosses to display
    const bossesToDisplay = activeBosses && activeBosses.length > 0 ? activeBosses : (activeBoss ? [activeBoss] : []);

    return (
        <>
            {showDisplay && (
                <div
                    className={`
                    fixed left-1/2 pointer-events-none flex flex-col items-center justify-center
                    transition-all duration-1000 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
                    ${isSplash
                            ? 'top-1/3 -translate-x-1/2 -translate-y-1/2 scale-[1.5] z-[100]'
                            : 'top-[3.5rem] -translate-x-1/2 -translate-y-0 scale-100 z-[60]'}
                `}
                >
                    <div className={`
                    bg-black/80 backdrop-blur-sm border-y-2 ${borderColor} skew-x-[-15deg] 
                    flex flex-col items-center shadow-lg transition-all
                    ${isSplash ? `px-8 py-3 ${splashShadow}` : 'px-4 py-1'}
                `}>
                        {displayTitle && (
                            <div className={`${titleColor} font-mono font-bold text-xs tracking-[0.2em] skew-x-[15deg] uppercase whitespace-nowrap`}>
                                {displayTitle}
                            </div>
                        )}
                        {displayContent && (
                            <div className={`text-white font-black skew-x-[15deg] tracking-wider ${isSplash ? 'text-xl' : 'text-sm'}`}>
                                {displayContent}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-[60]">
                <div className="flex flex-col gap-1 items-start text-xs font-mono text-gray-400">
                    <div className="whitespace-nowrap">
                        WAVE {waveInfo.id} <span className="text-gray-600 px-1">|</span>
                        LVL {uiStats.level} <span className="text-gray-600 px-1">|</span>
                        {formatTime(uiStats.runTime || 0)}
                    </div>
                </div>

                <div className="text-center flex flex-col items-center">
                    <div className="h-8"></div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (!document.fullscreenElement) {
                                    document.documentElement.requestFullscreen().catch(err => {
                                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                                    });
                                } else {
                                    if (document.exitFullscreen) {
                                        document.exitFullscreen();
                                    }
                                }
                            }}
                            className="pointer-events-auto bg-black/50 hover:bg-gray-800 text-white border border-gray-600 w-8 h-8 flex items-center justify-center text-lg"
                            title="Toggle Fullscreen"
                        >
                            ⛶
                        </button>
                        <button
                            onClick={onPause}
                            className="pointer-events-auto bg-black/50 hover:bg-gray-800 text-white border border-gray-600 w-8 h-8 flex items-center justify-center text-lg"
                            title="Pause"
                        >
                            ⏸
                        </button>
                    </div>
                    <CurrencyDisplay amount={uiStats.currency} size="xl" />
                </div>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none items-end z-[60]">
                <div className="flex flex-col gap-2 mr-2">
                    {artifacts.map((aId, idx) => {
                        const artifact = BASE_ARTIFACTS[aId];
                        return (
                            <IconFrame
                                key={`art-${idx}`}
                                id={aId}
                                color={artifact?.color}
                                size="sm"
                            />
                        );
                    })}
                </div>
                {inventory.map((w, idx) => {
                    let iconId = w.id;
                    let iconColor = w.color;
                    // If augment is active, use augment icon and color
                    if (w.augment) {
                        iconId = w.augment;
                        const augDef = WEAPON_AUGMENTS[w.id]?.find(a => a.id === w.augment);
                        if (augDef) iconColor = augDef.color;
                    }

                    return (
                        <IconFrame
                            key={idx}
                            id={iconId}
                            color={iconColor}
                            size="md"
                            level={w.level}
                            isPulse={w.id === 'ancestral_resonance'}
                            className={w.id === 'ancestral_resonance' ? '' : ''}
                        />
                    );
                })}
                {Array.from({ length: Math.max(0, 3 - inventory.length) }).map((_, i) => (<div key={`empty-${i}`} className="w-12 h-12 bg-black/50 border border-gray-700 rounded-full"></div>))}
            </div>

            {/* BOSS HEALTH BARS */}
            {bossesToDisplay.length > 0 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-lg z-[60] pointer-events-none flex flex-col gap-2 px-4">
                    {bossesToDisplay.map((boss) => (
                        <div key={boss.id} className="w-full">
                            <div className="text-center text-red-500 font-bold text-xs md:text-sm mb-0.5 tracking-widest uppercase shadow-black drop-shadow-md">
                                {getBossName(boss)}
                            </div>
                            <div className="w-full h-4 bg-black border border-red-600 relative">
                                <div
                                    className="h-full bg-red-600 transition-all duration-200"
                                    style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};
