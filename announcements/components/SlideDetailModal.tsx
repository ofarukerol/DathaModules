import React from 'react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { X, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Announcement } from '../types';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    RELEASE: { label: 'Yeni Sürüm', color: 'bg-[#F97171]/10 text-[#F97171]' },
    MAINTENANCE: { label: 'Bakım', color: 'bg-blue-100 text-blue-700' },
    FEATURE: { label: 'Yeni Özellik', color: 'bg-green-100 text-green-700' },
    TRAINING: { label: 'Eğitim', color: 'bg-green-100 text-green-700' },
    TIP: { label: 'İpucu', color: 'bg-purple-100 text-purple-700' },
    GENERAL: { label: 'Duyuru', color: 'bg-gray-100 text-gray-700' },
};

interface SlideDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Announcement | null;
}

const SlideDetailModal: React.FC<SlideDetailModalProps> = ({ isOpen, onClose, item }) => {
    const navigate = useNavigate();
    useEscapeKey(onClose, isOpen);

    if (!isOpen || !item) return null;

    const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.GENERAL;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Hero */}
                <div className="relative h-40 overflow-hidden" style={{ background: 'linear-gradient(135deg, #4A235A 0%, #663259 100%)' }}>
                    <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-[#F97171]/30 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 h-full flex flex-col justify-end p-6">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold mb-2 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F97171] animate-pulse" />
                            {item.slideTag ?? typeInfo.label}
                        </div>
                        <h2 className="text-xl font-bold text-white leading-snug">{item.title}</h2>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center backdrop-blur-md">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                        {item.publishedAt && (
                            <span className="text-xs text-gray-400">
                                {new Date(item.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {item.body}
                    </div>
                </div>

                {/* Footer */}
                {item.slideCta && (
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                            Kapat
                        </button>
                        <button
                            onClick={() => { navigate(item.slideCta!); onClose(); }}
                            className="bg-[#F97171] hover:bg-[#E05A5A] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#F97171]/30 transition-all flex items-center gap-2 text-sm active:scale-95"
                        >
                            <Rocket size={16} />
                            Hemen Keşfet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlideDetailModal;
