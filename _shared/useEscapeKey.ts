import { useEffect } from 'react';

export const useEscapeKey = (onEscape: () => void, enabled: boolean = true) => {
    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onEscape();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onEscape, enabled]);
};
