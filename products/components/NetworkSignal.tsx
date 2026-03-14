import React, { useEffect, useState, useRef } from 'react';

type NetworkStatus = 'online' | 'offline' | 'checking';

interface NetworkSignalProps {
    showDateTime?: boolean;
    dark?: boolean;
    className?: string;
}

const checkRealConnectivity = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        await fetch('https://1.1.1.1/cdn-cgi/trace', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
};

const WifiIcon: React.FC<{ status: NetworkStatus; dark?: boolean }> = ({ status, dark = false }) => {
    const isOffline = status === 'offline';
    const isChecking = status === 'checking';

    const activeColor  = dark ? '#FFFFFF' : '#10B981';
    const offlineColor = dark ? 'rgba(255,255,255,0.4)' : '#6B7280';
    const checkColor   = dark ? 'rgba(255,255,255,0.25)' : '#D1D5DB';

    const arcColor = isOffline ? offlineColor : isChecking ? checkColor : activeColor;
    const dotColor = isOffline ? offlineColor : isChecking ? checkColor : activeColor;
    const arcCount = isOffline ? 3 : isChecking ? 1 : 3;
    const arcOpacity = isOffline ? 0.45 : 1;

    return (
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M2 8.5C5.5 4.5 9.5 2.5 14 2.5C18.5 2.5 22.5 4.5 26 8.5"
                stroke={arcCount >= 3 ? arcColor : '#E5E7EB'}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity={arcOpacity}
            />
            <path
                d="M5.5 12C7.8 9.5 10.8 8 14 8C17.2 8 20.2 9.5 22.5 12"
                stroke={arcCount >= 2 ? arcColor : '#E5E7EB'}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity={arcOpacity}
            />
            <path
                d="M9.5 15.5C10.8 14 12.3 13 14 13C15.7 13 17.2 14 18.5 15.5"
                stroke={arcCount >= 1 ? arcColor : '#E5E7EB'}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity={arcOpacity}
            />
            <circle cx="14" cy="20" r="2" fill={dotColor} opacity={arcOpacity} />
            {isOffline && (
                <line
                    x1="3" y1="1"
                    x2="25" y2="23"
                    stroke={dark ? 'rgba(255,255,255,0.5)' : '#6B7280'}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
};

const NetworkSignal: React.FC<NetworkSignalProps> = ({
    showDateTime = true,
    dark = false,
    className = '',
}) => {
    const [status, setStatus] = useState<NetworkStatus>('checking');
    const [label, setLabel] = useState('Kontrol ediliyor...');
    const [now, setNow] = useState(new Date());
    const checkingRef = useRef(false);

    const runCheck = async () => {
        if (checkingRef.current) return;
        checkingRef.current = true;

        if (!navigator.onLine) {
            setStatus('offline');
            setLabel('Bağlantı Yok');
            checkingRef.current = false;
            return;
        }

        const isConnected = await checkRealConnectivity();
        if (isConnected) {
            setStatus('online');
            setLabel('İnternet Bağlı');
        } else {
            setStatus('offline');
            setLabel('İnternet Yok');
        }
        checkingRef.current = false;
    };

    useEffect(() => {
        runCheck();

        const handleOnline = () => {
            setStatus('checking');
            setLabel('Kontrol ediliyor...');
            runCheck();
        };

        const handleOffline = () => {
            setStatus('offline');
            setLabel('Bağlantı Yok');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const interval = setInterval(runCheck, 20000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    const dateStr = now.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '.');

    const timeStr = now.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const containerClass = dark
        ? {
            'online':   'bg-white/10 border-white/15',
            'offline':  'bg-red-500/15 border-red-400/30',
            'checking': 'bg-white/5 border-white/10',
        }[status]
        : {
            'online':   'bg-white border-gray-100',
            'offline':  'bg-red-50 border-red-100',
            'checking': 'bg-gray-50 border-gray-200',
        }[status];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {showDateTime && (
                <div className="text-right">
                    <p className={`text-sm font-bold leading-tight ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{dateStr}</p>
                    <p className={`text-xs font-semibold leading-tight ${dark ? 'text-white/60' : 'text-[#6B7280]'}`}>{timeStr}</p>
                </div>
            )}
            <div
                title={label}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 ${containerClass} ${status === 'checking' ? 'animate-pulse' : ''}`}
            >
                <WifiIcon status={status} dark={dark} />
            </div>
        </div>
    );
};

export default NetworkSignal;
