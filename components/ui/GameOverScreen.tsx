
import React, { useState } from 'react';
import { NeonButton, CurrencyDisplay, IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';
import { BASE_WEAPONS, BASE_ARTIFACTS } from '../../services/gameData';
import { adManager } from '../../services/AdManager';

export const GameOverScreen: React.FC<{ 
    score: number, 
    level: number,
    wave: number,
    chipsEarned: number,
    currency: number,
    newUnlocks: string[], 
    newAvailable: string[], 
    onRestart: () => void, 
    openStore: () => void,
    onDoubleReward?: () => void
}> = ({ score, level, wave, chipsEarned, currency, newUnlocks, newAvailable, onRestart, openStore, onDoubleReward }) => {
    const [adLoading, setAdLoading] = useState(false);
    const [adWatched, setAdWatched] = useState(false);

    const canShop = currency > 0;
    // Only show ad button if native platform and callback exists and not watched
    const canWatchAd = onDoubleReward && !adWatched && adManager.isNative;

    let itemCount = 1; 
    if (canWatchAd) itemCount++;
    if (canShop) itemCount++;
    
    const handleAdClick = async () => {
        if (adLoading || adWatched || !canWatchAd) return;
        setAdLoading(true);
        const success = await adManager.showRewardedAd();
        setAdLoading(false);
        if (success) {
            setAdWatched(true);
            onDoubleReward();
        }
    };

    const selectedIndex = useMenuNav(itemCount, (idx) => {
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
        <OverlayContainer zIndex={50} className="bg-red-900/20 overflow-y-auto">
            <div className="bg-black border border-orange-500 p-8 max-w-lg w-full text-center my-8 relative">
                <h2 className="text-5xl font-bold text-white mb-8">RUN COMPLETE</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8 border-t border-b border-gray-800 py-6">
                    <div className="flex flex-col items-center justify-center border-r border-gray-800">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Wave Reached</div>
                        <div className="text-4xl font-bold text-white">{wave}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Chips</div>
                        <CurrencyDisplay amount={chipsEarned} size="lg" />
                    </div>
                </div>

                {(newUnlocks.length > 0 || newAvailable.length > 0) && (
                    <div className="mb-8 text-left">
                        <h3 className="text-orange-500 font-bold uppercase tracking-widest text-sm mb-2">Unlocked Upgrades</h3>
                        <div className="flex flex-wrap gap-2">
                            {newUnlocks.map(id => (
                                <div key={id} className="flex items-center gap-2 bg-gray-900 border border-green-900 px-2 py-1">
                                    <IconFrame id={id} color="#4ade80" size="xs" />
                                    <span className="text-xs text-green-400 font-bold uppercase">{BASE_WEAPONS[id]?.name || BASE_ARTIFACTS[id]?.name || id}</span>
                                </div>
                            ))}
                            {newAvailable.map(id => (
                                <div key={id} className="flex items-center gap-2 bg-gray-900 border border-yellow-900 px-2 py-1 opacity-75">
                                    <IconFrame id={id} color="#fbbf24" size="xs" />
                                    <span className="text-xs text-yellow-500 font-bold uppercase">{BASE_WEAPONS[id]?.name || BASE_ARTIFACTS[id]?.name || id} (SHOP)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    
                    {canWatchAd && (
                        <div className="mb-4 animate-in slide-in-from-left-10 duration-300">
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
                            <div className="mb-2 text-xs font-mono text-gray-400 flex flex-wrap justify-center items-center gap-1.5 uppercase tracking-wide">
                                <span>Use your</span>
                                <CurrencyDisplay amount={currency} size="sm" />
                                <span>to get permanent upgrades for your next runs</span>
                            </div>

                            <NeonButton 
                                onClick={openStore}
                                variant={selectedIndex === getButtonIndex('SHOP') ? 'primary' : 'secondary'}
                                fullWidth
                            >
                                <span>Get Upgrades</span>
                                <span className={`text-sm mx-2 ${selectedIndex === getButtonIndex('SHOP') ? 'text-black/60' : 'text-gray-600'}`}>|</span>
                                <CurrencyDisplay amount={currency} size="sm" />
                            </NeonButton>
                        </>
                    )}

                    <button
                        onClick={onRestart}
                        className={`w-full py-3 border font-mono text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group hover:bg-white/10 ${selectedIndex === getButtonIndex('RESTART') ? 'border-white text-white bg-gray-800' : 'bg-black border-gray-700 text-gray-400 hover:border-white hover:text-white'}`}
                    >
                        START NEXT RUN
                    </button>
                </div>
            </div>
        </OverlayContainer>
    );
};
