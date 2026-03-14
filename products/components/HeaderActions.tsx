import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NetworkSignal from './NetworkSignal';

interface HeaderActionsProps {
    dark?: boolean;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ dark = true }) => {
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            getCurrentWindow().onResized(async () => {
                const fs = await getCurrentWindow().isFullscreen();
                setIsFullscreen(fs);
            }).then(fn => { unlisten = fn; });
        }).catch(() => {});
        return () => { unlisten?.(); };
    }, []);

    const handleFullscreen = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            const currentFs = await win.isFullscreen();
            await win.setFullscreen(!currentFs);
            setIsFullscreen(!currentFs);
        } catch {
            // Tauri dışı ortamlarda sessizce geç
        }
    };

    const handleClose = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            await win.close();
        } catch {
            // Tauri dışı ortamlarda sessizce geç
        }
    };

    if (dark) {
        return (
            <>
                <button
                    onClick={() => navigate('/calendar')}
                    className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 transition-all flex items-center justify-center group shrink-0"
                    title="Takvim"
                >
                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">calendar_month</span>
                </button>

                <NetworkSignal showDateTime={false} dark />

                <div className="h-10 flex items-center bg-white/10 rounded-xl overflow-hidden border border-white/15 shrink-0">
                    <button
                        onClick={() => window.location.reload()}
                        className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors border-r border-white/10 group"
                        title="Sayfayı Yenile"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500">refresh</span>
                    </button>
                    <button
                        onClick={handleFullscreen}
                        className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors border-r border-white/10"
                        title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
                        </span>
                    </button>
                    <button
                        onClick={handleClose}
                        className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-red-500/30 hover:text-red-300 transition-colors"
                        title="Kapat"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <button
                onClick={() => navigate('/calendar')}
                className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 transition-all flex items-center justify-center group shrink-0"
                title="Takvim"
            >
                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">calendar_month</span>
            </button>

            <NetworkSignal showDateTime={false} />

            <div className="h-10 flex items-center bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                <button
                    onClick={() => window.location.reload()}
                    className="h-full w-10 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors border-r border-gray-200 group"
                    title="Sayfayı Yenile"
                >
                    <span className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500">refresh</span>
                </button>
                <button
                    onClick={handleFullscreen}
                    className="h-full w-10 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors border-r border-gray-200"
                    title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                >
                    <span className="material-symbols-outlined text-lg">
                        {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
                    </span>
                </button>
                <button
                    onClick={handleClose}
                    className="h-full w-10 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Kapat"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        </>
    );
};

export default HeaderActions;
