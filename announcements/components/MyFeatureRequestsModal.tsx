import React, { useEffect, useMemo, useState } from 'react';
import { useAnnouncementStore } from '../store';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { X, ClipboardList, Plus, Clock, RefreshCw } from 'lucide-react';
import type { FeatureRequest } from '../types';

interface MyFeatureRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNewRequest: () => void;
    /** Oturum açmış kullanıcının tam adı — talep eşleştirmede kullanılır */
    currentUserFullName?: string | null;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: string }> = {
    GENERAL: { label: 'Genel', color: 'bg-gray-100 text-gray-600', icon: 'category' },
    ACCOUNTING: { label: 'Muhasebe', color: 'bg-purple-100 text-purple-700', icon: 'calculate' },
    UI: { label: 'Arayüz', color: 'bg-blue-100 text-blue-700', icon: 'palette' },
    INTEGRATION: { label: 'Entegrasyon', color: 'bg-green-100 text-green-700', icon: 'hub' },
    STOCK: { label: 'Stok', color: 'bg-orange-100 text-orange-700', icon: 'inventory_2' },
    REPORTING: { label: 'Raporlama', color: 'bg-yellow-100 text-yellow-700', icon: 'bar_chart' },
    PAYMENT: { label: 'Ödeme', color: 'bg-red-100 text-red-700', icon: 'payments' },
    OTHER: { label: 'Diğer', color: 'bg-gray-100 text-gray-500', icon: 'more_horiz' },
};

const STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
    PENDING: { label: 'Beklemede', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
    REVIEWING: { label: 'İnceleniyor', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500' },
    PLANNED: { label: 'Planlandı', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' },
    IN_PROGRESS: { label: 'Geliştiriliyor', color: 'bg-[#663259]/10 text-[#663259]', dotColor: 'bg-[#663259]' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
    REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatRelativeDate = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Bugün';
    if (days < 7) return `${days} gün önce`;
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
    return `${Math.floor(days / 30)} ay once`;
};

/* ─── Kullanicinin kendi taleplerini tanimlama stratejileri ─── */

const MY_REQUESTS_STORAGE_KEY = 'datha_my_feature_requests';

/** localStorage'dan takip edilen talep ID'lerini oku */
function getTrackedIds(): Set<string> {
    try {
        const raw = localStorage.getItem(MY_REQUESTS_STORAGE_KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch {
        return new Set();
    }
}

/** JWT token payload'undan backend userId cikar */
function getBackendUserId(): string | null {
    try {
        const stored = localStorage.getItem('datha_auth');
        if (!stored) return null;
        const { state } = JSON.parse(stored);
        if (!state?.accessToken) return null;
        const parts = state.accessToken.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.sub ?? payload.userId ?? payload.id ?? null;
    } catch {
        return null;
    }
}

/** Kullanicinin kendi talebi mi? (coklu strateji) */
function isMyRequest(
    req: FeatureRequest,
    backendUserId: string | null,
    userFullName: string | null,
    trackedIds: Set<string>,
): boolean {
    // Strateji 1: localStorage'da takip edilen ID
    if (trackedIds.has(req.id)) return true;

    // Strateji 2: JWT backend userId eslesmesi
    if (backendUserId && req.user?.id === backendUserId) return true;

    // Strateji 3: Isim eslesmesi (firstName + lastName vs fullName)
    if (userFullName && req.user) {
        const reqFullName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim();
        if (reqFullName && reqFullName === userFullName) return true;
    }

    return false;
}

/** Yeni olusturulan talep ID'sini localStorage'a kaydet */
export function trackMyFeatureRequest(id: string): void {
    try {
        const ids = getTrackedIds();
        ids.add(id);
        localStorage.setItem(MY_REQUESTS_STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // localStorage yazma hatasi — sessizce devam et
    }
}

const MyFeatureRequestsModal: React.FC<MyFeatureRequestsModalProps> = ({
    isOpen,
    onClose,
    onNewRequest,
    currentUserFullName,
}) => {
    const { featureRequests, fetchFeatureRequests } = useAnnouncementStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchFeatureRequests();
        }
    }, [isOpen, fetchFeatureRequests]);

    const myRequests = useMemo(() => {
        const backendUserId = getBackendUserId();
        const fullName = currentUserFullName ?? null;
        const trackedIds = getTrackedIds();

        return featureRequests.filter(r =>
            isMyRequest(r, backendUserId, fullName, trackedIds)
        );
    }, [featureRequests, currentUserFullName]);

    if (!isOpen) return null;

    const handleNewRequest = () => {
        onClose();
        onNewRequest();
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchFeatureRequests();
        setIsRefreshing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#663259]/10 to-[#8E44AD]/10 flex items-center justify-center">
                            <ClipboardList size={20} className="text-[#663259]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Taleplerim</h3>
                            <p className="text-xs text-gray-500">
                                {myRequests.length > 0
                                    ? `${myRequests.length} talep gönderdiniz`
                                    : 'Gönderdiğiniz talepler burada görüntülenir'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className={`w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {myRequests.length > 0 ? (
                        <div className="space-y-3">
                            {myRequests.map((req: FeatureRequest) => {
                                const statusInfo = STATUS_MAP[req.status] ?? STATUS_MAP.PENDING;
                                const catInfo = CATEGORY_MAP[req.category] ?? CATEGORY_MAP.GENERAL;
                                return (
                                    <div
                                        key={req.id}
                                        className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-[#663259]/20 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h4 className="text-sm font-bold text-gray-800 flex-1">{req.title}</h4>
                                            <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{req.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${catInfo.color}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{catInfo.icon}</span>
                                                    {catInfo.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatRelativeDate(req.createdAt)}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {formatDate(req.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-gray-300 text-[32px]">lightbulb</span>
                            </div>
                            <h4 className="text-base font-bold text-gray-700 mb-1">Henüz talep göndermediniz</h4>
                            <p className="text-sm text-gray-400 mb-6 max-w-xs">
                                Görmek istediğiniz özellikleri bizimle paylaşın. Fikriniz bir sonraki güncellememiz olabilir.
                            </p>
                            <button
                                onClick={handleNewRequest}
                                className="bg-gradient-to-r from-[#663259] to-[#8E44AD] text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm active:scale-95"
                            >
                                <Plus size={16} />
                                Yeni Talep Oluştur
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {myRequests.length > 0 && (
                    <div className="flex items-center justify-between p-6 border-t border-gray-100 shrink-0">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                            Kapat
                        </button>
                        <button
                            onClick={handleNewRequest}
                            className="bg-gradient-to-r from-[#663259] to-[#8E44AD] text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm active:scale-95"
                        >
                            <Plus size={16} />
                            Yeni Talep Oluştur
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyFeatureRequestsModal;
