
import React from 'react';
import { NeonButton, OverlayContainer } from '../Common';

export const PauseMenu: React.FC<{ onResume: () => void, onQuit: () => void }> = ({ onResume, onQuit }) => {
    return (
        <OverlayContainer zIndex={80}>
            <div className="bg-black border border-orange-500 p-8 text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
                <h2 className="text-3xl text-white font-bold mb-8 tracking-widest uppercase border-b border-gray-800 pb-4">PAUSED</h2>
                <div className="flex flex-col gap-4">
                    <NeonButton onClick={onResume} variant="primary">Resume Protocol</NeonButton>
                    <NeonButton onClick={onQuit} variant="danger">Abort Run</NeonButton>
                </div>
            </div>
        </OverlayContainer>
    )
}
