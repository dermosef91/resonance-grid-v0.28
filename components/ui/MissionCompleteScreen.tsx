
import React from 'react';
import { MissionType, MissionState } from '../../types';
import { NeonButton, IconFrame, OverlayContainer } from '../Common';
import { useMenuNav } from '../../hooks/useMenuNav';
import { getMissionColorConfig } from '../../utils/uiUtils';

export const MissionCompleteScreen: React.FC<{
    nextMission: { type: string, description: string } | null,
    completedMission?: MissionState,
    onContinue: () => void
}> = ({ nextMission, completedMission, onContinue }) => {
    const selectedIndex = useMenuNav(1, (idx) => onContinue());

    const getMissionIconId = (type: string): string => {
        switch(type) {
            case MissionType.SURVIVE: return 'mission_survive';
            case MissionType.ELIMINATE: return 'mission_eliminate';
            case MissionType.DATA_RUN: return 'mission_data_run';
            case MissionType.BOSS: return 'mission_boss';
            case MissionType.KING_OF_THE_HILL: return 'mission_koth';
            case MissionType.PAYLOAD_ESCORT: return 'mission_payload';
            case MissionType.RITUAL_CIRCLE: return 'mission_ritual';
            case MissionType.SHADOW_STEP: return 'mission_shadow';
            case MissionType.ENTANGLEMENT: return 'mission_koth'; // Reuse KOTH icon or similar
            case MissionType.THE_GREAT_FILTER: return 'mission_data_run'; // Placeholder
            default: return 'titan_frame';
        }
    }

    const getMissionTitle = (mission: MissionState): string => {
        const type = mission.type;
        if (type === MissionType.ENTANGLEMENT && mission.customData?.cloneAlive === false) {
            return "LINK SEVERED";
        }

        switch(type) {
            case MissionType.SURVIVE: return "SURVIVE";
            case MissionType.ELIMINATE: return "ELIMINATE TARGETS";
            case MissionType.DATA_RUN: return "LOCATE AND UPLOAD DATA";
            case MissionType.BOSS: return "DEFEAT THE BOSS";
            case MissionType.KING_OF_THE_HILL: return "SECURE THE ZONE";
            case MissionType.PAYLOAD_ESCORT: return "ESCORT PAYLOAD";
            case MissionType.RITUAL_CIRCLE: return "ACTIVATE OBELISKS";
            case MissionType.SHADOW_STEP: return "SURVIVE (WEAPONS JAMMED)";
            case MissionType.ENTANGLEMENT: return "LINK MAINTAINED";
            case MissionType.THE_GREAT_FILTER: return "GATEWAY PASSED";
            default: return type.replace(/_/g, ' ');
        }
    }

    const nextStyles = nextMission ? getMissionColorConfig(nextMission.type) : getMissionColorConfig('DEFAULT');

    return (
        <OverlayContainer zIndex={70} className="bg-black/20">
            <div className="relative max-w-xl w-full p-8 border border-orange-500 bg-gray-900/95 transition-all animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
                
                <h2 className="text-sm text-gray-400 font-mono font-bold mb-4 text-center tracking-widest uppercase">
                    {completedMission 
                        ? `MISSION COMPLETE: ${getMissionTitle(completedMission)}`
                        : 'SECTOR SECURED'
                    }
                </h2>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mb-8"></div>

                <div className={`w-full bg-black/80 border border-gray-700 p-6 mb-8 relative group hover:${nextStyles.border.replace('border-', 'border-opacity-50 ')} transition-colors`}>
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border ${nextStyles.border} px-4 py-1 text-xs ${nextStyles.text} font-bold uppercase tracking-widest shadow-lg ${nextStyles.shadow}`}>
                        NEXT MISSION
                    </div>
                    {nextMission ? (
                        <div className="flex flex-col items-center pt-2">
                            <div className="mb-4 opacity-100 group-hover:scale-110 transition-transform duration-300">
                                <IconFrame id={getMissionIconId(nextMission.type)} color={nextStyles.hex} size="xl" />
                            </div>
                            <div className="text-3xl md:text-4xl text-white font-black uppercase mb-1 tracking-wide drop-shadow-md">{nextMission.description}</div>
                        </div>
                    ) : (
                        <div className="text-white font-bold animate-pulse">ESTABLISHING UPLINK...</div>
                    )}
                </div>

                <NeonButton 
                    onClick={onContinue}
                    fullWidth
                    variant={selectedIndex === 0 ? 'primary' : 'secondary'}
                >
                    Continue
                </NeonButton>
            </div>
        </OverlayContainer>
    );
};
