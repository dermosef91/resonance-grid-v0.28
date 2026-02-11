
import React from 'react';
import { UpgradeOption } from '../../types';
import { IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';

export const LevelUpScreen: React.FC<{ options: UpgradeOption[], onSelect: (opt: UpgradeOption) => void, title?: string }> = ({ options, onSelect, title }) => {
    const selectedIndex = useMenuNav(options.length, (idx) => {
        if (options[idx]) onSelect(options[idx]);
    });

    return (
        <OverlayContainer zIndex={75} className="backdrop-blur-[2px]">
            <div className="relative max-w-3xl w-full mx-4 p-4 md:p-6 border border-cyan-500 bg-gray-900/95 transition-all animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl">
            <h2 className="text-xl md:text-2xl text-cyan-500 font-bold mb-2 text-center tracking-widest uppercase sticky top-0 bg-gray-900/95 pb-2 z-20">
                {title || "System Upgrade"}
            </h2>
            <p className="text-gray-400 text-center mb-4 md:mb-6 text-xs md:text-sm font-mono uppercase tracking-wide shrink-0">Select one of these upgrades to improve your run</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {options.map((opt, idx) => (
                <button 
                    key={idx} 
                    onClick={() => onSelect(opt)} 
                    className={`group relative p-3 md:p-4 border transition-all text-left flex flex-row md:flex-col items-center justify-start gap-4 md:gap-0 ${selectedIndex === idx ? 'border-cyan-500 bg-gray-800 z-10' : 'border-gray-700 bg-black hover:border-cyan-500 hover:bg-gray-800'} ${opt.rarity === 'GLITCH' ? 'animate-pulse' : ''} ${opt.rarity === 'LEGENDARY' ? 'legendary-hologram' : ''} shrink-0 min-h-[100px] md:min-h-0`}
                >
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded group-hover:text-white group-hover:border-cyan-500 hidden md:block">{idx + 1}</div>
                    <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-opacity ${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}/>
                    
                    <div className="mb-0 md:mb-3 shrink-0">
                        <IconFrame 
                            id={opt.weaponId || opt.id} 
                            color={opt.color} 
                            size="lg" 
                            className={`${opt.rarity === 'GLITCH' ? 'border-red-500' : 'border-gray-600 group-hover:border-white'} md:w-20 md:h-20`} 
                        />
                    </div>

                    <div className="text-left md:text-center w-full min-w-0">
                        <div className="text-[10px] font-bold mb-0.5 uppercase tracking-wider opacity-80" style={{ color: opt.type === 'WEAPON_NEW' ? '#4ade80' : opt.type === 'WEAPON_UPGRADE' ? '#60a5fa' : opt.type === 'ARTIFACT' ? '#f472b6' : opt.type === 'GLITCH' ? '#ef4444' : '#fbbf24' }}>{opt.type.replace('WEAPON_', '').replace('_', ' ')}</div>
                        <h3 className={`text-sm md:text-base font-bold mb-1 leading-tight truncate ${opt.rarity === 'GLITCH' ? 'text-red-500' : 'text-white group-hover:text-cyan-400'}`}>{opt.name}</h3>
                        <p className="text-xs text-gray-400 mb-1 leading-relaxed line-clamp-3 md:line-clamp-4">{opt.description}</p>
                        <div className={`text-xs font-mono uppercase ${opt.rarity === 'LEGENDARY' ? 'text-purple-400 font-bold tracking-widest' : opt.rarity === 'RARE' ? 'text-orange-500' : opt.rarity === 'GLITCH' ? 'text-red-600' : 'text-blue-400'}`}>{opt.rarity}</div>
                    </div>
                </button>
                ))}
            </div>
            </div>
        </OverlayContainer>
    );
};
