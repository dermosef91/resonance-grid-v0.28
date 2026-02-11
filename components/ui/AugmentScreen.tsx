
import React from 'react';
import { Weapon } from '../../types';
import { WEAPON_AUGMENTS } from '../../services/gameData';
import { IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';

interface AugmentScreenProps {
    weapon: Weapon;
    onSelect: (augmentId: string) => void;
}

export const AugmentScreen: React.FC<AugmentScreenProps> = ({ weapon, onSelect }) => {
    const augments = WEAPON_AUGMENTS[weapon.id];
    
    // Fallback if data missing
    if (!augments) {
        onSelect('NONE');
        return null;
    }

    const selectedIndex = useMenuNav(augments.length, (idx) => {
        onSelect(augments[idx].id);
    });

    return (
        <OverlayContainer zIndex={80} className="backdrop-blur-[2px]">
            <div className="relative max-w-3xl w-full mx-4 p-4 md:p-6 border border-orange-500 bg-gray-900/95 transition-all animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="sticky top-0 bg-gray-900/95 pb-4 z-20 flex flex-col items-center border-b border-gray-800 mb-4">
                    <h2 className="text-xl md:text-2xl text-orange-500 font-bold mb-1 text-center tracking-widest uppercase">
                        SYSTEM MODULATION
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-gray-400 font-mono text-xs md:text-sm tracking-widest uppercase">
                        <span className="text-white font-bold">{weapon.name}</span>
                        <span className="text-orange-500">//</span>
                        <span>LEVEL 5 BRANCH</span>
                    </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {augments.map((aug, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                            <button
                                key={aug.id}
                                onClick={() => onSelect(aug.id)}
                                className={`group relative p-4 border transition-all text-left flex flex-row md:flex-col items-center justify-start gap-4 md:gap-4 ${isSelected ? 'border-orange-500 bg-gray-800 z-10' : 'border-gray-700 bg-black hover:border-orange-500 hover:bg-gray-800'} shrink-0 min-h-[120px]`}
                            >
                                {/* Index Number (Desktop only) */}
                                <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded group-hover:text-white group-hover:border-orange-500 hidden md:block">
                                    {idx + 1}
                                </div>

                                {/* Top Gradient Line */}
                                <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}/>

                                {/* Icon */}
                                <div className="shrink-0">
                                    <IconFrame 
                                        id={aug.id} 
                                        color={aug.color} 
                                        size="xl" 
                                        className={`border-gray-600 group-hover:border-white ${isSelected ? 'shadow-[0_0_15px_currentColor] border-white' : ''}`}
                                    />
                                </div>

                                {/* Content */}
                                <div className="text-left md:text-center w-full min-w-0 flex flex-col justify-center h-full">
                                    <div className="text-[10px] font-bold mb-1 uppercase tracking-wider opacity-90" style={{ color: aug.color }}>
                                        AUGMENTATION
                                    </div>
                                    <h3 className={`text-base md:text-lg font-bold mb-2 leading-tight ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                        {aug.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300">
                                        {aug.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </OverlayContainer>
    );
};
