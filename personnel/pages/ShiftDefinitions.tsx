import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useShiftDefinitionStore } from '../stores/useShiftDefinitionStore';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import CustomSelect from '../../../components/CustomSelect';
import HeaderActions from '../../../components/HeaderActions';
import type { ShiftDefinition } from '../types';

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: `${String(i).padStart(2, '0')}:00`,
    label: `${String(i).padStart(2, '0')}:00`,
}));

interface FormState {
    name: string;
    startTime: string;
    endTime: string;
    earlyEntryTolerance: number;
    lateEntryTolerance: number;
    earlyExitTolerance: number;
    lateExitTolerance: number;
    description: string;
}

const DEFAULT_FORM: FormState = {
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    earlyEntryTolerance: 0,
    lateEntryTolerance: 0,
    earlyExitTolerance: 0,
    lateExitTolerance: 0,
    description: '',
};

const ShiftDefinitions: React.FC = () => {
    const navigate = useNavigate();
    const { definitions, addDefinition, updateDefinition, deleteDefinition } = useShiftDefinitionStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEscapeKey(() => setShowModal(false), showModal);

    const filteredDefs = useMemo(() => {
        if (!searchQuery) return definitions;
        const q = searchQuery.toLowerCase();
        return definitions.filter(d => d.name.toLowerCase().includes(q));
    }, [definitions, searchQuery]);

    const openAddModal = () => {
        setForm(DEFAULT_FORM);
        setEditingId(null);
        setShowModal(true);
    };

    const openEditModal = (def: ShiftDefinition) => {
        setForm({
            name: def.name,
            startTime: def.startTime,
            endTime: def.endTime,
            earlyEntryTolerance: def.earlyEntryTolerance,
            lateEntryTolerance: def.lateEntryTolerance,
            earlyExitTolerance: def.earlyExitTolerance,
            lateExitTolerance: def.lateExitTolerance,
            description: def.description,
        });
        setEditingId(def.id);
        setShowModal(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editingId) {
            updateDefinition(editingId, form);
        } else {
            addDefinition(form);
        }
        setShowModal(false);
    };

    const handleDeleteClick = (id: string) => {
        if (confirmDeleteId === id) {
            deleteDefinition(id);
            setConfirmDeleteId(null);
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        } else {
            setConfirmDeleteId(id);
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const updateForm = (updates: Partial<FormState>) => setForm(prev => ({ ...prev, ...updates }));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Gradient Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0"
                                >
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">event_note</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Vardiya Listesi</h1>
                                <p className="text-white/60 text-xs mt-0.5">
                                    Toplam {definitions.length} vardiya tanımı
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center bg-white/10 rounded-xl px-3 border border-white/15">
                                <Search className="text-white/50" size={15} />
                                <input
                                    type="text"
                                    placeholder="Listede ara..."
                                    className="py-2 px-2 text-sm font-medium text-white placeholder-white/40 outline-none bg-transparent w-40"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <Plus size={16} />
                                Yeni Kayıt Ekle
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-14 text-center">Satır No</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[220px]">Adı</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-20">Giriş</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-20">Çıkış</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-28">Giriş Tolerans</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-28">Çıkış Tolerans</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-24">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredDefs.length > 0 ? (
                                    filteredDefs.map((def, idx) => (
                                        <tr key={def.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-3 py-3 text-center text-sm font-bold text-gray-300">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-sm text-gray-800">
                                                    [{def.startTime}-{def.endTime}] {def.name}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-semibold text-gray-700">{def.startTime}</td>
                                            <td className="px-3 py-3 text-center text-sm font-semibold text-gray-700">{def.endTime}</td>
                                            <td className="px-3 py-3 text-center text-sm font-medium text-gray-600">
                                                -{def.earlyEntryTolerance} | +{def.lateEntryTolerance}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-medium text-gray-600">
                                                -{def.earlyExitTolerance} | +{def.lateExitTolerance}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {confirmDeleteId === def.id ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleDeleteClick(def.id)}
                                                            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            Evet
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                                                        >
                                                            İptal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDeleteClick(def.id)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Sil"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(def)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#663259] hover:bg-[#663259]/10 transition-colors"
                                                            title="Düzenle"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-[48px] opacity-30">event_busy</span>
                                                <p className="font-medium">Vardiya tanımı bulunamadı</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                        <span className="text-sm text-gray-500 font-medium">
                            Toplam Kayıt: <span className="font-bold text-gray-700">{filteredDefs.length}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-[#663259]">edit_calendar</span>
                                <h2 className="text-lg font-bold text-gray-800">Vardiya Bilgileri</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Adı</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => updateForm({ name: e.target.value })}
                                    placeholder="Vardiya adı"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none transition-all"
                                />
                            </div>

                            {/* Entry Time + Tolerance */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-4">
                                    <div className="w-44 shrink-0">
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Giriş Saati</label>
                                        <CustomSelect
                                            options={TIME_OPTIONS}
                                            value={form.startTime}
                                            onChange={(v: string) => updateForm({ startTime: v })}
                                            placeholder="Saat"
                                            searchPlaceholder="Ara..."
                                            icon="schedule"
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-500">Erken Giriş (dk)</span>
                                                <span className="text-xs font-bold text-emerald-600">-{form.earlyEntryTolerance}</span>
                                            </div>
                                            <input
                                                type="range" min={0} max={60} step={5}
                                                value={form.earlyEntryTolerance}
                                                onChange={e => updateForm({ earlyEntryTolerance: Number(e.target.value) })}
                                                className="w-full h-2 rounded-full cursor-pointer"
                                                style={{ accentColor: '#10B981' }}
                                            />
                                            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                                                <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-500">Geç Giriş (dk)</span>
                                                <span className="text-xs font-bold text-blue-600">+{form.lateEntryTolerance}</span>
                                            </div>
                                            <input
                                                type="range" min={0} max={60} step={5}
                                                value={form.lateEntryTolerance}
                                                onChange={e => updateForm({ lateEntryTolerance: Number(e.target.value) })}
                                                className="w-full h-2 rounded-full cursor-pointer"
                                                style={{ accentColor: '#3B82F6' }}
                                            />
                                            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                                                <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Exit Time + Tolerance */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-4">
                                    <div className="w-44 shrink-0">
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Çıkış Saati</label>
                                        <CustomSelect
                                            options={TIME_OPTIONS}
                                            value={form.endTime}
                                            onChange={(v: string) => updateForm({ endTime: v })}
                                            placeholder="Saat"
                                            searchPlaceholder="Ara..."
                                            icon="schedule"
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-500">Erken Çıkış (dk)</span>
                                                <span className="text-xs font-bold text-red-500">-{form.earlyExitTolerance}</span>
                                            </div>
                                            <input
                                                type="range" min={0} max={60} step={5}
                                                value={form.earlyExitTolerance}
                                                onChange={e => updateForm({ earlyExitTolerance: Number(e.target.value) })}
                                                className="w-full h-2 rounded-full cursor-pointer"
                                                style={{ accentColor: '#EF4444' }}
                                            />
                                            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                                                <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-500">Geç Çıkış (dk)</span>
                                                <span className="text-xs font-bold text-red-500">+{form.lateExitTolerance}</span>
                                            </div>
                                            <input
                                                type="range" min={0} max={60} step={5}
                                                value={form.lateExitTolerance}
                                                onChange={e => updateForm({ lateExitTolerance: Number(e.target.value) })}
                                                className="w-full h-2 rounded-full cursor-pointer"
                                                style={{ accentColor: '#EF4444' }}
                                            />
                                            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                                                <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tanımı</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => updateForm({ description: e.target.value })}
                                    placeholder="Tanımı"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none transition-all resize-y"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!form.name.trim()}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#663259] hover:bg-[#7a3d6d] text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">save</span>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftDefinitions;
