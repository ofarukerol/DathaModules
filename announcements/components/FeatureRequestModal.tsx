import React, { useState, useRef, useEffect } from 'react';
import { useAnnouncementStore } from '../store';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { Plus, X, Sparkles, ChevronDown, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { trackMyFeatureRequest } from './MyFeatureRequestsModal';

interface FeatureRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { value: 'GENERAL', label: 'Genel', icon: 'category', color: '#6B7280', bg: 'bg-gray-100' },
    { value: 'ACCOUNTING', label: 'Muhasebe', icon: 'calculate', color: '#7C3AED', bg: 'bg-purple-100' },
    { value: 'UI', label: 'Arayüz', icon: 'palette', color: '#2563EB', bg: 'bg-blue-100' },
    { value: 'INTEGRATION', label: 'Entegrasyon', icon: 'hub', color: '#059669', bg: 'bg-green-100' },
    { value: 'STOCK', label: 'Stok', icon: 'inventory_2', color: '#EA580C', bg: 'bg-orange-100' },
    { value: 'REPORTING', label: 'Raporlama', icon: 'bar_chart', color: '#CA8A04', bg: 'bg-yellow-100' },
    { value: 'PAYMENT', label: 'Ödeme', icon: 'payments', color: '#DC2626', bg: 'bg-red-100' },
    { value: 'OTHER', label: 'Diğer', icon: 'more_horiz', color: '#64748B', bg: 'bg-slate-100' },
];

/* ─── Custom Category Select ─── */
const CategorySelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = CATEGORIES.find(c => c.value === value) ?? CATEGORIES[0];

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Kategori</label>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-800 transition-all hover:bg-white hover:border-[#663259]/20 ${open ? 'bg-white border-[#663259]/30 ring-4 ring-[#663259]/5' : 'border-gray-100'}`}
            >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected.bg}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: selected.color }}>{selected.icon}</span>
                </span>
                <span className="flex-1 text-left">{selected.label}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 bottom-full mb-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/10 py-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
                    {CATEGORIES.map(c => {
                        const isActive = c.value === value;
                        return (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => { onChange(c.value); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all ${isActive ? 'bg-[#663259]/5 text-[#663259] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${isActive ? '' : c.bg}`}
                                    style={isActive ? { backgroundColor: `${c.color}15` } : undefined}
                                >
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: c.color }}>{c.icon}</span>
                                </span>
                                <span className="flex-1 text-left">{c.label}</span>
                                {isActive && <Check size={16} className="text-[#663259] shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({ isOpen, onClose }) => {
    const { createFeatureRequest, isLoading, featureRequests } = useAnnouncementStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [titleError, setTitleError] = useState(false);
    const [descError, setDescError] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEscapeKey(onClose, isOpen);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const hasTitle = title.trim().length > 0;
        const hasDesc = description.trim().length > 0;
        setTitleError(!hasTitle);
        setDescError(!hasDesc);
        setSubmitError(null);

        if (!hasTitle || !hasDesc) return;

        const prevIds = new Set(featureRequests.map(r => r.id));
        const success = await createFeatureRequest({ title, description, category });
        if (success) {
            // Yeni eklenen talebi bul ve localStorage'a kaydet
            const { featureRequests: updatedList } = useAnnouncementStore.getState();
            const newReq = updatedList.find(r => !prevIds.has(r.id));
            if (newReq) {
                trackMyFeatureRequest(newReq.id);
            } else {
                // ID bulunamadiysa baslik eslesmesi ile dene
                const match = updatedList.find(
                    r => r.title === title.trim() && r.description === description.trim()
                );
                if (match) trackMyFeatureRequest(match.id);
            }
            setSubmitSuccess(true);
            setTimeout(() => {
                setTitle('');
                setDescription('');
                setCategory('GENERAL');
                setSubmitSuccess(false);
                onClose();
            }, 1200);
        } else {
            setSubmitError('Talep gönderilemedi. Sunucu bağlantısı kontrol edin.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97171]/10 to-[#663259]/10 flex items-center justify-center">
                            <Sparkles size={20} className="text-[#663259]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Yeni Talep Oluştur</h3>
                            <p className="text-xs text-gray-500">Fikriniz bir sonraki güncellememiz olabilir</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Baslik */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Başlık *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => { setTitle(e.target.value); setTitleError(false); }}
                            placeholder="Örneğin: Toplu Fatura Aktarımı"
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:bg-white focus:ring-4 focus:ring-[#663259]/5 ${titleError ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-[#663259]/30'}`}
                        />
                        {titleError && <p className="text-xs text-red-500 mt-1">Başlık zorunludur</p>}
                    </div>

                    {/* Aciklama */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Açıklama *</label>
                        <textarea
                            value={description}
                            onChange={e => { setDescription(e.target.value); setDescError(false); }}
                            placeholder="Talebinizi detaylı olarak açıklayın..."
                            rows={4}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:bg-white focus:ring-4 focus:ring-[#663259]/5 resize-none ${descError ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-[#663259]/30'}`}
                        />
                        {descError && <p className="text-xs text-red-500 mt-1">Açıklama zorunludur</p>}
                    </div>

                    {/* Kategori */}
                    <CategorySelect value={category} onChange={setCategory} />
                </div>

                {/* Hata / Basari Mesaji */}
                {submitError && (
                    <div className="mx-6 mb-0 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                        <AlertCircle size={16} className="shrink-0" />
                        {submitError}
                    </div>
                )}
                {submitSuccess && (
                    <div className="mx-6 mb-0 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600">
                        <CheckCircle2 size={16} className="shrink-0" />
                        Talebiniz başarıyla gönderildi!
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#663259] to-[#8E44AD] text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm active:scale-95 disabled:opacity-50"
                    >
                        <Plus size={16} />
                        {isLoading ? 'Gönderiliyor...' : 'Talep Oluştur'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeatureRequestModal;
