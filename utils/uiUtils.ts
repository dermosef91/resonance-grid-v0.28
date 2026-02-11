
import { MissionType } from '../types';

export const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getMissionColorConfig = (type: string) => {
    switch(type) {
        case MissionType.SURVIVE: 
            return { 
                hex: '#ff6600', 
                border: 'border-orange-500', 
                text: 'text-orange-400', 
                shadow: 'shadow-orange-900/20',
                hoverBorder: 'group-hover:border-orange-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(255,102,0,0.4)]'
            };
        case MissionType.ELIMINATE: 
            return { 
                hex: '#ef4444', 
                border: 'border-red-500', 
                text: 'text-red-500', 
                shadow: 'shadow-red-900/20',
                hoverBorder: 'group-hover:border-red-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            };
        case MissionType.DATA_RUN: 
            return { 
                hex: '#06b6d4', 
                border: 'border-cyan-500', 
                text: 'text-cyan-400', 
                shadow: 'shadow-cyan-900/20',
                hoverBorder: 'group-hover:border-cyan-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            };
        case MissionType.BOSS: 
            return { 
                hex: '#dc2626', 
                border: 'border-red-600', 
                text: 'text-red-600', 
                shadow: 'shadow-red-900/20',
                hoverBorder: 'group-hover:border-red-600/50',
                splashShadow: 'shadow-[0_0_30px_rgba(220,38,38,0.4)]'
            };
        case MissionType.KING_OF_THE_HILL: 
            return { 
                hex: '#22c55e', 
                border: 'border-green-500', 
                text: 'text-green-400', 
                shadow: 'shadow-green-900/20',
                hoverBorder: 'group-hover:border-green-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
            };
        case MissionType.PAYLOAD_ESCORT: 
            return { 
                hex: '#00FFFF', 
                border: 'border-cyan-400', 
                text: 'text-cyan-400', 
                shadow: 'shadow-cyan-900/20',
                hoverBorder: 'group-hover:border-cyan-400/50',
                splashShadow: 'shadow-[0_0_30px_rgba(0,255,255,0.4)]'
            };
        case MissionType.RITUAL_CIRCLE: 
            return { 
                hex: '#22c55e', 
                border: 'border-green-500', 
                text: 'text-green-400', 
                shadow: 'shadow-green-900/20',
                hoverBorder: 'group-hover:border-green-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
            };
        case MissionType.SHADOW_STEP: 
            return { 
                hex: '#ef4444', 
                border: 'border-red-500', 
                text: 'text-red-500', 
                shadow: 'shadow-red-900/20',
                hoverBorder: 'group-hover:border-red-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            };
        case MissionType.ENTANGLEMENT: 
            return { 
                hex: '#00FFFF', 
                border: 'border-cyan-400', 
                text: 'text-cyan-400', 
                shadow: 'shadow-cyan-900/20',
                hoverBorder: 'group-hover:border-cyan-400/50',
                splashShadow: 'shadow-[0_0_30px_rgba(0,255,255,0.4)]'
            };
        case MissionType.THE_GREAT_FILTER: 
            return { 
                hex: '#FF0055', // Vivid Red
                border: 'border-pink-500', 
                text: 'text-pink-400', 
                shadow: 'shadow-pink-900/20',
                hoverBorder: 'group-hover:border-pink-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(255,0,85,0.4)]'
            };
        case MissionType.EVENT_HORIZON:
            return {
                hex: '#9900FF',
                border: 'border-purple-600',
                text: 'text-purple-400',
                shadow: 'shadow-purple-900/40',
                hoverBorder: 'group-hover:border-purple-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(153,0,255,0.6)]'
            };
        default: 
            return { 
                hex: '#ff6600', 
                border: 'border-orange-500', 
                text: 'text-orange-400', 
                shadow: 'shadow-orange-900/20',
                hoverBorder: 'group-hover:border-orange-500/50',
                splashShadow: 'shadow-[0_0_30px_rgba(255,102,0,0.4)]'
            };
    }
};
