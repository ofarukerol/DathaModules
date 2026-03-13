import React from 'react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { X } from 'lucide-react';
import type { RoadmapItem } from '../types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PLANNED: { label: 'Planlanmış', color: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Devam Ediyor', color: 'bg-[#663259]/10 text-[#663259]' },
    FINAL_STAGE: { label: 'Son Aşamada', color: 'bg-[#F97171]/10 text-[#F97171]' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'İptal Edildi', color: 'bg-gray-100 text-gray-500' },
};

interface RoadmapDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: RoadmapItem | null;
}

const RoadmapDetailModal: React.FC<RoadmapDetailModalProps> = ({ isOpen, onClose, item }) => {
    useEscapeKey(onClose, isOpen);

    if (!isOpen || !item) return null;

    const statusInfo = STATUS_LABELS[item.status] ?? STATUS_LABELS.PLANNED;
    const progressColor = item.color ?? '#663259';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {item.icon && (
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${progressColor}15`, color: progressColor }}>
                                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                                {item.targetQuarter && (
                                    <span className="text-xs text-gray-400">{item.targetQuarter}</span>
                                )}
                                {item.targetMonth && !item.targetQuarter && (
                                    <span className="text-xs text-gray-400">{item.targetMonth}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Aciklama */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Açıklama</h4>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {/* Ilerleme */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-700">Geliştirme İlerlemesi</h4>
                            <span className="text-sm font-bold" style={{ color: progressColor }}>%{item.progress}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${item.progress}%`, backgroundColor: progressColor }}
                            />
                        </div>
                    </div>

                    {/* Tarihler */}
                    {(item.startDate || item.targetDate) && (
                        <div className="grid grid-cols-2 gap-4">
                            {item.startDate && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Başlangıç</p>
                                    <p className="text-sm font-semibold text-gray-700">{formatDate(item.startDate)}</p>
                                </div>
                            )}
                            {item.targetDate && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hedef Tarih</p>
                                    <p className="text-sm font-semibold text-gray-700">{formatDate(item.targetDate)}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoadmapDetailModal;
