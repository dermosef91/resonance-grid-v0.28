import React, { useState, useEffect, useRef } from 'react';
import { NeonButton, CurrencyDisplay, IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';
import { GameOverUnlockedItem } from '../../types';
import { adManager } from '../../services/AdManager';
import { audioEngine } from '../../services/audioEngine';


export const GameOverScreen: React.FC<{
    score: number,
    level: number,
    wave: number,
    kills: number,
    duration: number,
    chipsEarned: number,
    currency: number,
    metaState: any, // Using any temporarily to avoid circular deps if types not ready, but better import MetaState
    newUnlocks: GameOverUnlockedItem[],
    newAvailable: GameOverUnlockedItem[],
    onRestart: () => void,
    openStore: () => void,
    onDoubleReward?: () => void
}> = ({ score, level, wave, kills, duration, chipsEarned, currency, metaState, newUnlocks, newAvailable, onRestart, openStore, onDoubleReward }) => {
    const [adLoading, setAdLoading] = useState(false);
    const [adWatched, setAdWatched] = useState(false);









    const [displayChips, setDisplayChips] = useState(0);
    const [visibleUnlocks, setVisibleUnlocks] = useState<GameOverUnlockedItem[]>([]);
    const [showButtons, setShowButtons] = useState(false);
    const [isFirstShopView, setIsFirstShopView] = useState(false);

    useEffect(() => {
        const key = 'hasSeenUpgradeButtonV1';
        if (localStorage.getItem(key) !== 'true') {
            setIsFirstShopView(true);
            localStorage.setItem(key, 'true');
        }
    }, []);

    const animationFrameRef = useRef<number>();
    const unlockIntervalRef = useRef<NodeJS.Timeout>();

    // Initial Animation Sequence
    useEffect(() => {
        // 1. Animate Chips
        let startTimestamp: number;
        const duration = 1500; // 1.5s to count chips
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(ease * chipsEarned);

            setDisplayChips(current);

            // Play sound every few frames if value changed significantly
            if (current % 5 === 0 && progress < 1.0) {
                audioEngine.playCollectXP();
            }

            if (progress < 1) {
                animationFrameRef.current = window.requestAnimationFrame(step);
            } else {
                // Chips done, trigger unlocks
                triggerUnlocks();
            }
        };
        animationFrameRef.current = window.requestAnimationFrame(step);

        // Cleanup
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (unlockIntervalRef.current) clearInterval(unlockIntervalRef.current);
        };
    }, [chipsEarned]);

    const triggerUnlocks = () => {
        // Clear any existing interval just in case
        if (unlockIntervalRef.current) clearInterval(unlockIntervalRef.current);

        // Filter out any undefined or empty strings and deduplicate by ID
        const rawUnlocks = [...safeUnlocks, ...safeAvailable].filter(item => item && item.id);
        const uniqueUnlocks = Array.from(new Map(rawUnlocks.map(item => [item.id, item])).values());

        if (uniqueUnlocks.length === 0) {
            setShowButtons(true);
            return;
        }

        let currentIndex = 0;
        unlockIntervalRef.current = setInterval(() => {
            if (currentIndex >= uniqueUnlocks.length) {
                if (unlockIntervalRef.current) clearInterval(unlockIntervalRef.current);
                setShowButtons(true);
                return;
            }

            // Add next unlock
            const itemToAdd = uniqueUnlocks[currentIndex];
            setVisibleUnlocks(prev => {
                // Double check it's not already in (React double-invocation safety)
                if (prev.some(p => p.id === itemToAdd.id)) return prev;
                return [...prev, itemToAdd];
            });
            // Play unlock sound
            audioEngine.playCollectXP();

            currentIndex++;
        }, 500); // 0.5s per unlock
    };

    const canShop = currency > 0;
    // Only show ad button if native platform and callback exists and not watched
    const canWatchAd = onDoubleReward && !adWatched && adManager.isNative;

    let itemCount = 1;
    if (canWatchAd) itemCount++;
    if (canShop) itemCount++;
    // Defensive defaults
    const safeChips = chipsEarned || 0;
    const safeUnlocks = newUnlocks || [];
    const safeAvailable = newAvailable || [];

    const handleAdClick = async () => {
        if (adLoading || adWatched || !canWatchAd) return;
        setAdLoading(true);
        const success = await adManager.showRewardedAd();
        setAdLoading(false);
        if (success) {
            setAdWatched(true);
            if (onDoubleReward) onDoubleReward();
        }
    };

    const selectedIndex = useMenuNav(itemCount, (idx) => {
        if (!showButtons) return; // Disable nav during animation

        let currentIndex = 0;

        if (canWatchAd) {
            if (idx === currentIndex) { handleAdClick(); return; }
            currentIndex++;
        }

        if (canShop) {
            if (idx === currentIndex) { openStore(); return; }
            currentIndex++;
        }

        if (idx === currentIndex) onRestart();
    });

    const getButtonIndex = (type: 'AD' | 'SHOP' | 'RESTART') => {
        let idx = 0;
        if (type === 'AD') return idx;
        if (canWatchAd) idx++;
        if (type === 'SHOP') return idx;
        if (canShop) idx++;
        if (type === 'RESTART') return idx;
        return -1;
    }

    return (
        <OverlayContainer zIndex={50} className="bg-red-900/20 overflow-y-auto p-0 sm:p-4">
            <div className="bg-black border-y sm:border border-orange-500 p-4 sm:p-8 [@media(max-height:600px)]:p-4 max-w-2xl w-full text-center relative max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto flex flex-col justify-center my-auto shadow-2xl">
                <h2 className="text-3xl sm:text-5xl [@media(max-height:600px)]:text-3xl font-bold text-white mb-4 sm:mb-8 [@media(max-height:600px)]:mb-4 animate-in zoom-in duration-500 pt-4 sm:pt-0">RUN COMPLETE</h2>

                <div className="grid grid-cols-2 gap-4 mb-4 sm:mb-8 [@media(max-height:600px)]:mb-4 border-y border-gray-800 py-3 sm:py-6 [@media(max-height:600px)]:py-3 shrink-0">
                    <div className="flex flex-col items-center justify-center border-r border-gray-800">
                        <div className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">Wave Reached</div>
                        <div className="text-2xl sm:text-4xl [@media(max-height:600px)]:text-2xl font-bold text-white">{wave}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">Chips</div>
                        <CurrencyDisplay amount={displayChips} size="lg" />
                    </div>
                </div>

                {(visibleUnlocks.length > 0) && (
                    <div className="mb-6 sm:mb-10 [@media(max-height:600px)]:mb-4 w-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h3 className="text-orange-500 font-bold uppercase tracking-[0.2em] text-xs sm:text-sm mb-3 sm:mb-6 [@media(max-height:600px)]:mb-2 text-center animate-pulse sticky top-0 bg-black z-20 pb-2">Unlocked Upgrades</h3>
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 pb-4">
                            {visibleUnlocks.map((item, index) => {
                                if (!item) return null;
                                const isNew = newUnlocks.some(u => u && u.id === item.id);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={openStore}
                                        className={`
                                            relative flex flex-col items-center p-2 sm:p-4 [@media(max-height:600px)]:p-2 min-w-[100px] sm:min-w-[140px] cursor-pointer hover:bg-gray-800 transition-colors
                                            bg-gray-900 border-2 
                                            ${isNew ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-110 z-10' : 'border-yellow-700'} 
                                            animate-in zoom-in-0 fade-in slide-in-from-bottom-12 duration-500 fill-mode-backwards
                                        `}
                                        style={{ animationDelay: `${index * 150}ms` }}
                                    >
                                        {/* New Badge */}
                                        {isNew && (
                                            <div className="absolute top-1 sm:top-2 right-1 sm:right-2 text-[8px] sm:text-[10px] font-mono text-purple-400 border border-purple-900/50 px-1 py-0.5 bg-black/50 tracking-widest z-20">
                                                NEW
                                            </div>
                                        )}

                                        <div className="mb-1 sm:mb-3 transform hover:scale-125 transition-transform duration-300">
                                            <IconFrame id={item.id} color={isNew ? "#d8b4fe" : "#fbbf24"} size="lg" className={`${isNew ? "animate-pulse" : ""} w-10 h-10 sm:w-16 sm:h-16 [@media(max-height:600px)]:w-10 [@media(max-height:600px)]:h-10`} />
                                        </div>

                                        <div className="text-center w-full px-1">
                                            <div className={`text-[10px] sm:text-sm font-bold uppercase leading-tight mb-0.5 sm:mb-1 truncate ${isNew ? 'text-purple-300' : 'text-yellow-500'}`}>
                                                {item.name}
                                            </div>
                                            <div className="text-[8px] sm:text-[10px] text-gray-500 font-mono uppercase">
                                                {isNew ? 'UNLOCKED' : 'IN SHOP'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className={`flex flex-col gap-2 sm:gap-3 shrink-0 transition-opacity duration-1000 ${showButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'} pb-4 sm:pb-0`}>

                    {canWatchAd && (
                        <div className="mb-2 sm:mb-4">
                            <NeonButton
                                onClick={handleAdClick}
                                variant="secondary"
                                fullWidth
                                disabled={adLoading}
                                className={selectedIndex === getButtonIndex('AD') ? 'border-white bg-gray-800' : ''}
                            >
                                {adLoading ? 'LOADING FEED...' : `DOUBLE CHIPS (+${chipsEarned}) [AD]`}
                            </NeonButton>
                        </div>
                    )}

                    {canShop && (
                        <>
                            <div className="mb-1 sm:mb-2 text-[10px] sm:text-xs font-mono text-gray-400 flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 uppercase tracking-wide">
                                <span>Use your</span>
                                <CurrencyDisplay amount={currency} size="sm" />
                                <span>to get permanent upgrades for your next runs</span>
                            </div>

                            <NeonButton
                                onClick={openStore}
                                variant={selectedIndex === getButtonIndex('SHOP') ? 'primary' : 'secondary'}
                                fullWidth
                                className={isFirstShopView ? "animate-pulse shadow-[0_0_20px_rgba(234,88,12,0.8)]" : ""}
                            >
                                <span>Get Upgrades</span>
                                <span className={`text-sm mx-2 ${selectedIndex === getButtonIndex('SHOP') ? 'text-black/60' : 'text-gray-600'}`}>|</span>
                                <CurrencyDisplay amount={currency} size="sm" />
                            </NeonButton>
                        </>
                    )}

                    <button
                        onClick={onRestart}
                        className={`w-full py-2 sm:py-3 border font-mono text-[10px] sm:text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group hover:bg-white/10 ${selectedIndex === getButtonIndex('RESTART') ? 'border-white text-white bg-gray-800' : 'bg-black border-gray-700 text-gray-400 hover:border-white hover:text-white'}`}
                    >
                        START NEXT RUN
                    </button>
                </div>
            </div>
        </OverlayContainer>
    );
};
