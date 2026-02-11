
import { useState, useEffect } from 'react';

export const useMenuNav = (itemCount: number, onSelect: (index: number) => void) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                e.preventDefault(); // Prevent scrolling
            }

            const k = e.key;

            if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'w' || k === 'a' || k === 'W' || k === 'A') {
                setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
            } else if (k === 'ArrowDown' || k === 'ArrowRight' || k === 's' || k === 'd' || k === 'S' || k === 'D') {
                setSelectedIndex(prev => (prev + 1) % itemCount);
            } else if (k === 'Enter' || k === ' ') {
                onSelect(selectedIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [itemCount, onSelect, selectedIndex]);

    return selectedIndex;
};
