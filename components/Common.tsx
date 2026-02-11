
import React from 'react';
import { WeaponIcon3D } from './WeaponIcon3D';

// --- Neon Button ---
interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'shop';
    fullWidth?: boolean;
}

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(({ children, variant = 'primary', fullWidth, className = '', disabled, ...props }, ref) => {
    let baseStyles = "font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group";
    
    // Size/Shape defaults
    if (variant === 'shop') {
        baseStyles += " py-3 border font-mono text-sm";
    } else {
        baseStyles += " py-4 px-6 border-2 transform hover:scale-[1.02] active:scale-[0.98]";
    }
    
    let colorStyles = "";
    if (variant === 'primary') {
        // Removed shadow-[0_0_20px_rgba(255,102,0,0.4)]
        colorStyles = "bg-orange-600 text-black border-orange-600 hover:bg-orange-500";
    } else if (variant === 'secondary') {
        colorStyles = "bg-black/50 text-white border-orange-600 hover:bg-orange-600 hover:text-black";
    } else if (variant === 'danger') {
        colorStyles = "bg-transparent text-gray-500 border-gray-800 hover:border-red-500 hover:text-red-500";
    } else if (variant === 'ghost') {
        colorStyles = "bg-transparent text-gray-500 border-gray-800 hover:border-white hover:text-white";
    } else if (variant === 'shop') {
        // Shop buttons handle their own active state often, but this is the "buy" button look
        colorStyles = "bg-orange-600 text-black border-orange-600 hover:bg-orange-500";
    }

    if (disabled) {
        colorStyles = "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed transform-none hover:scale-100";
    }

    return (
        <button 
            ref={ref}
            className={`${baseStyles} ${colorStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
});

NeonButton.displayName = 'NeonButton';

// --- Currency Display ---
export const CurrencyDisplay: React.FC<{ amount: number, size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ amount, size = 'md' }) => {
    const sizeClasses = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-4xl' : size === 'xl' ? 'text-xl' : 'text-xl';
    const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-2.5 h-2.5';
    
    return (
        <span className={`font-bold text-white flex items-center gap-2 ${sizeClasses}`}>
            {amount}
            <div className={`${iconSize} bg-yellow-400 rotate-45 animate-[spin_3s_linear_infinite]`} />
        </span>
    );
};

// --- Icon Frame ---
interface IconFrameProps {
    id: string;
    color?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    level?: number;
    isPulse?: boolean;
    className?: string;
}

export const IconFrame: React.FC<IconFrameProps> = ({ id, color = '#fff', size = 'md', level, isPulse, className = '' }) => {
    // Map sizes to tailwind classes
    // xs: w-4 h-4 (for tiny lists)
    // sm: w-8 h-8 (for artifacts in HUD)
    // md: w-12 h-12 (default HUD inventory)
    // lg: w-16 h-16 (for Mission Complete / Compendium)
    // xl: w-20 h-20 (for Level Up)
    
    let sizeClass = 'w-12 h-12';
    // Always use rounded-full for circular icons
    const roundedClass = 'rounded-full';

    if (size === 'xs') {
        sizeClass = 'w-4 h-4';
    } else if (size === 'sm') {
        sizeClass = 'w-8 h-8';
    } else if (size === 'lg') {
        sizeClass = 'w-16 h-16';
    } else if (size === 'xl') {
        sizeClass = 'w-20 h-20';
    }
    
    // Removing inline style for borderColor to enforce the grey outline via class (unless overridden by className)
    return (
        <div className={`${sizeClass} ${roundedClass} bg-gray-900 border border-gray-600 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${isPulse ? 'border-white animate-pulse shadow-[0_0_10px_rgba(255,102,0,0.5)]' : ''} ${className}`}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: color }}></div>
            <div className="w-[70%] h-[70%] z-10">
                <WeaponIcon3D id={id} color={color} className="w-full h-full" />
            </div>
            {level !== undefined && (
                // Centered level text at bottom to avoid clipping in circle
                <div className="text-[10px] font-bold text-white z-10 absolute bottom-1 w-full text-center leading-none drop-shadow-md">L{level}</div>
            )}
        </div>
    );
};

// --- Overlay Container ---
export const OverlayContainer: React.FC<{ children: React.ReactNode, zIndex?: number, className?: string }> = ({ children, zIndex = 50, className = '' }) => {
    return (
        <div 
            className={`absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${className}`}
            style={{ zIndex }}
        >
            {children}
        </div>
    );
};
