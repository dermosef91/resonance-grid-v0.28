
import React from 'react';
import { UpgradeOption } from '../../types';
import { IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';

export const LevelUpScreen: React.FC<{ options: UpgradeOption[], onSelect: (opt: UpgradeOption) => void, title?: string, metaState?: any }> = ({ options, onSelect, title, metaState }) => {
    const selectedIndex = useMenuNav(options.length, (idx) => {
        if (options[idx]) onSelect(options[idx]);
    });

    return (
        <OverlayContainer zIndex={75} className="backdrop-blur-[2px] p-0 sm:p-4">
            <div className="relative max-w-5xl w-full max-h-[100dvh] sm:max-h-[90vh] sm:mx-4 p-3 sm:p-6 [@media(max-height:600px)]:p-3 border-y sm:border border-cyan-500 bg-gray-900/95 transition-all animate-in fade-in zoom-in duration-200 overflow-y-auto shadow-2xl my-auto">
                <div className="shrink-0 sticky top-0 bg-gray-900/95 z-20 pb-2 sm:pb-4 pt-2 sm:pt-0 [@media(max-height:600px)]:pb-2 [&::after]:content-[''] [&::after]:absolute [&::after]:bottom-0 [&::after]:left-0 [&::after]:w-full [&::after]:h-[1px] [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-cyan-500/50 [&::after]:to-transparent sm:[&::after]:hidden">
                    <h2 className="text-lg sm:text-2xl text-cyan-500 font-bold mb-1 sm:mb-2 text-center tracking-widest uppercase">
                        {title || "System Upgrade"}
                    </h2>
                    <p className="text-gray-400 text-center text-[10px] sm:text-sm font-mono uppercase tracking-wide">Select one of these upgrades to improve your run</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full items-stretch pt-2 sm:pt-0 pb-2 sm:pb-0">
                    {options.map((opt, idx) => {
                        const id = opt.weaponId || opt.id;
                        const isNew = metaState?.seenItems ? !metaState.seenItems.includes(id) && (metaState.unlockedItems.includes(id) || opt.type === 'WEAPON_NEW') : false;

                        return (
                            <button
                                key={idx}
                                onClick={() => onSelect(opt)}
                                className={`group relative p-3 sm:p-4 [@media(max-height:600px)]:p-3 border transition-all text-left flex flex-row sm:flex-col [@media(max-height:600px)]:flex-row [@media(max-height:600px)]:sm:flex-row items-center sm:justify-start [@media(max-height:600px)]:justify-start gap-4 sm:gap-0 [@media(max-height:600px)]:gap-4 ${selectedIndex === idx ? 'border-cyan-500 bg-gray-800 z-10' : 'border-gray-700 bg-black hover:border-cyan-500 hover:bg-gray-800'} ${opt.rarity === 'GLITCH' ? 'animate-pulse' : ''} ${opt.rarity === 'LEGENDARY' ? 'legendary-hologram' : ''} shrink-0 h-full`}
                            >
                                {isNew && (
                                    <div className="absolute top-2 right-2 text-[10px] font-mono text-green-500 border border-green-900/50 px-1.5 py-0.5 bg-black/50 tracking-widest z-20">
                                        NEW
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded group-hover:text-white group-hover:border-cyan-500 hidden sm:block [@media(max-height:600px)]:hidden">{idx + 1}</div>
                                <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-opacity ${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

                                <div className="mb-0 sm:mb-4 [@media(max-height:600px)]:mb-0 shrink-0">
                                    <IconFrame
                                        id={opt.weaponId || opt.id}
                                        color={opt.color}
                                        size="lg"
                                        className={`${opt.rarity === 'GLITCH' ? 'border-red-500' : 'border-gray-600 group-hover:border-white'} sm:w-20 sm:h-20 [@media(max-height:600px)]:w-14 [@media(max-height:600px)]:h-14 w-12 h-12`}
                                    />
                                </div>

                                <div className="text-left sm:text-center [@media(max-height:600px)]:text-left w-full min-w-0">
                                    <div className="text-[10px] sm:text-xs [@media(max-height:600px)]:text-[10px] font-bold mb-0.5 uppercase tracking-wider opacity-80" style={{ color: opt.type === 'WEAPON_NEW' ? '#4ade80' : opt.type === 'WEAPON_UPGRADE' ? '#60a5fa' : opt.type === 'ARTIFACT' ? '#f472b6' : opt.type === 'GLITCH' ? '#ef4444' : '#fbbf24' }}>{opt.type.replace('WEAPON_', '').replace('_', ' ')}</div>
                                    <h3 className={`text-sm sm:text-base [@media(max-height:600px)]:text-sm font-bold mb-0.5 sm:mb-1 [@media(max-height:600px)]:mb-0.5 leading-tight truncate ${opt.rarity === 'GLITCH' ? 'text-red-500' : 'text-white group-hover:text-cyan-400'}`}>{opt.name}</h3>
                                    <p className="text-[10px] sm:text-xs [@media(max-height:600px)]:text-[10px] text-gray-400 mb-0.5 sm:mb-1 [@media(max-height:600px)]:mb-0.5 leading-relaxed line-clamp-2 sm:line-clamp-4 [@media(max-height:600px)]:line-clamp-2">{opt.description}</p>
                                    <div className={`text-[10px] sm:text-xs [@media(max-height:600px)]:text-[10px] font-mono uppercase ${opt.rarity === 'LEGENDARY' ? 'text-purple-400 font-bold tracking-widest' : opt.rarity === 'RARE' ? 'text-orange-500' : opt.rarity === 'GLITCH' ? 'text-red-600' : 'text-blue-400'}`}>{opt.rarity}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </OverlayContainer>
    );
};
