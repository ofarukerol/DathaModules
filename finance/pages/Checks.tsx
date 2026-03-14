import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { useCheckStore } from '../stores/useCheckStore';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import {
    CheckType, CheckStatus,
    CHECK_TYPE_LABELS, CHECK_STATUS_LABELS,
} from '../types';
import type { CheckNote, Company } from '../types';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import { X } from 'lucide-react';

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const formatDate = (d: string) => {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
};

const STATUS_CONFIG: Record<CheckStatus, { label: string; bg: string; text: string; dot: string }> = {
    PENDING:    { label: CHECK_STATUS_LABELS.PENDING,    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
    DEPOSITED:  { label: CHECK_STATUS_LABELS.DEPOSITED,  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
    CASHED:     { label: CHECK_STATUS_LABELS.CASHED,     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    BOUNCED:    { label: CHECK_STATUS_LABELS.BOUNCED,    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
    ENDORSED:   { label: CHECK_STATUS_LABELS.ENDORSED,   bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500' },
    CANCELLED:  { label: CHECK_STATUS_LABELS.CANCELLED,  bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
};

type TabKey = 'ALL' | 'CHECK_RECEIVED' | 'CHECK_ISSUED' | 'NOTE_RECEIVED' | 'NOTE_ISSUED';

const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Tümü', icon: 'receipt_long' },
    { key: 'CHECK_RECEIVED', label: 'Alınan Çek', icon: 'call_received' },
    { key: 'CHECK_ISSUED', label: 'Verilen Çek', icon: 'call_made' },
    { key: 'NOTE_RECEIVED', label: 'Alınan Senet', icon: 'description' },
    { key: 'NOTE_ISSUED', label: 'Verilen Senet', icon: 'assignment' },
];

// ─── Add Check Modal ───────────────────────────────────────────────────────────
interface AddCheckData {
    type: CheckType;
    company_id?: string;
    amount: number;
    currency?: string;
    issue_date: string;
    due_date: string;
    bank_name?: string;
    check_number?: string;
    notes?: string;
    endorser?: string;
}

interface AddCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AddCheckData) => Promise<void>;
    companies: Company[];
}

const AddCheckModal: React.FC<AddCheckModalProps> = ({ isOpen, onClose, onSave, companies }) => {
    const [form, setForm] = useState({
        type: 'CHECK_RECEIVED' as CheckType,
        company_id: '',
        amount: '',
        bank_name: '',
        check_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    useEscapeKey(onClose, isOpen);

    const handleSave = async () => {
        if (!form.amount || !form.due_date) return;
        setSaving(true);
        try {
            await onSave({
                type: form.type,
                company_id: form.company_id || undefined,
                amount: parseFloat(form.amount),
                issue_date: form.issue_date,
                due_date: form.due_date,
                bank_name: form.bank_name || undefined,
                check_number: form.check_number || undefined,
                notes: form.notes || undefined,
            });
            onClose();
            setForm({
                type: 'CHECK_RECEIVED', company_id: '', amount: '', bank_name: '',
                check_number: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
            });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const companyOptions = [
        { value: '', label: 'Firma seçin (opsiyonel)' },
        ...companies.map(c => ({ value: c.id, label: c.name })),
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Yeni Çek/Senet</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Yeni çek veya senet kaydı ekleyin</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Tür *</label>
                        <CustomSelect
                            options={[
                                { value: 'CHECK_RECEIVED', label: 'Alınan Çek', icon: 'call_received' },
                                { value: 'CHECK_ISSUED',   label: 'Verilen Çek', icon: 'call_made' },
                                { value: 'NOTE_RECEIVED',  label: 'Alınan Senet', icon: 'description' },
                                { value: 'NOTE_ISSUED',    label: 'Verilen Senet', icon: 'assignment' },
                            ]}
                            value={form.type}
                            onChange={v => setForm(f => ({ ...f, type: v as CheckType }))}
                            icon="category"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Firma</label>
                        <CustomSelect
                            options={companyOptions}
                            value={form.company_id}
                            onChange={v => setForm(f => ({ ...f, company_id: v }))}
                            placeholder="Firma seçin (opsiyonel)"
                            icon="corporate_fare"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Tutar (₺) *</label>
                        <input
                            type="number"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Düzenleme Tarihi</label>
                            <DatePicker value={form.issue_date} onChange={v => setForm(f => ({ ...f, issue_date: v }))} placeholder="Düzenleme" icon="event" compact />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Vade Tarihi *</label>
                            <DatePicker value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} placeholder="Vade" icon="event_upcoming" compact />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Banka Adı</label>
                            <input
                                type="text"
                                value={form.bank_name}
                                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                placeholder="Örn: Akbank"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Çek/Senet No</label>
                            <input
                                type="text"
                                value={form.check_number}
                                onChange={e => setForm(f => ({ ...f, check_number: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                placeholder="Örn: CHK-001"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Notlar</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all resize-none"
                            placeholder="Notlar..."
                            rows={2}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!form.amount || !form.due_date || saving}
                        className="w-full py-3 bg-[#663259] text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Status Change Modal ──────────────────────────────────────────────────────
interface StatusModalProps {
    check: CheckNote | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: CheckStatus) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const StatusModal: React.FC<StatusModalProps> = ({ check, isOpen, onClose, onStatusChange, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEscapeKey(onClose, isOpen);

    if (!isOpen || !check) return null;
    const st = STATUS_CONFIG[check.status];
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = check.status === 'PENDING' && check.due_date < today;

    const NEXT_STATUSES: Partial<Record<CheckStatus, { status: CheckStatus; label: string; color: string; icon: string }[]>> = {
        PENDING: [
            { status: 'DEPOSITED', label: 'Bankaya Ver', color: 'bg-blue-500', icon: 'account_balance' },
            { status: 'CASHED',    label: 'Tahsil Et', color: 'bg-emerald-500', icon: 'check_circle' },
            { status: 'BOUNCED',   label: 'Karşılıksız', color: 'bg-red-500', icon: 'cancel' },
            { status: 'ENDORSED',  label: 'Ciro Et', color: 'bg-purple-500', icon: 'swap_horiz' },
            { status: 'CANCELLED', label: 'İptal Et', color: 'bg-gray-500', icon: 'block' },
        ],
        DEPOSITED: [
            { status: 'CASHED',   label: 'Tahsil Edildi', color: 'bg-emerald-500', icon: 'check_circle' },
            { status: 'BOUNCED',  label: 'Karşılıksız',   color: 'bg-red-500', icon: 'cancel' },
        ],
    };

    const nextActions = NEXT_STATUSES[check.status] ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">Çek/Senet Detayı</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{check.check_number || check.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={16} className="text-gray-400" /></button>
                </div>

                <div className="p-5 space-y-3">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tür</span>
                            <span className="font-semibold text-gray-800">{CHECK_TYPE_LABELS[check.type]}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tutar</span>
                            <span className="font-bold text-[#663259] text-base">₺{formatCurrency(check.amount)}</span>
                        </div>
                        {check.company_name && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Firma</span>
                                <span className="font-semibold text-gray-800">{check.company_name}</span>
                            </div>
                        )}
                        {check.bank_name && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Banka</span>
                                <span className="font-semibold text-gray-800">{check.bank_name}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Vade</span>
                            <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{formatDate(check.due_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Durum</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                            </span>
                        </div>
                    </div>

                    {nextActions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Durum Güncelle</p>
                            <div className="grid grid-cols-2 gap-2">
                                {nextActions.map(a => (
                                    <button
                                        key={a.status}
                                        onClick={async () => { await onStatusChange(check.id, a.status); onClose(); }}
                                        className={`${a.color} text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity`}
                                    >
                                        <span className="material-symbols-outlined text-[15px]">{a.icon}</span>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-gray-100 pt-3">
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Sil
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => { await onDelete(check.id); onClose(); setShowDeleteConfirm(false); }}
                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
                                >Evet, Sil</button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
                                >İptal</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Checks Page ──────────────────────────────────────────────────────────
const Checks: React.FC = () => {
    const { checks, stats, loading, fetchChecks, fetchStats, addCheck, updateStatus, deleteCheck } = useCheckStore();
    const { companies, fetchCompanies } = useCompanyStore();

    const [activeTab, setActiveTab] = useState<TabKey>('ALL');
    const [statusFilter, setStatusFilter] = useState<CheckStatus | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCheck, setSelectedCheck] = useState<CheckNote | null>(null);

    useEffect(() => {
        fetchChecks();
        fetchStats();
        fetchCompanies();
    }, []);

    const today = new Date().toISOString().split('T')[0];

    const filtered = checks
        .filter(c => activeTab === 'ALL' || c.type === activeTab)
        .filter(c => statusFilter === 'ALL' || c.status === statusFilter)
        .filter(c => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                (c.check_number && c.check_number.toLowerCase().includes(q)) ||
                (c.bank_name && c.bank_name.toLowerCase().includes(q))
            );
        });

    const summaryCards = [
        {
            label: 'Alınan Çekler',
            value: `₺${formatCurrency(stats.receivedTotal)}`,
            sub: `${stats.receivedCount} adet`,
            icon: 'call_received',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Verilen Çekler',
            value: `₺${formatCurrency(stats.issuedTotal)}`,
            sub: `${stats.issuedCount} adet`,
            icon: 'call_made',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Bu Hafta Vadeli',
            value: `₺${formatCurrency(stats.dueThisWeekTotal)}`,
            sub: `${stats.dueThisWeekCount} adet`,
            icon: 'event_upcoming',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Vadesi Geçen',
            value: String(stats.overdueCount),
            sub: 'bekleyen çek/senet',
            icon: 'warning',
            color: 'text-red-600',
            bg: 'bg-red-50',
        },
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="receipt_long"
                    title="Çek / Senet"
                    subtitle="Alınan ve verilen çek/senet takibi ve vade yönetimi"
                >
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-xl text-sm font-bold hover:bg-white/25 border border-white/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Yeni Ekle
                    </button>
                </GradientHeader>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                    {summaryCards.map(c => (
                        <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2.5 ${c.bg} ${c.color} rounded-xl`}>
                                    <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                                </div>
                                <span className="text-gray-500 text-sm">{c.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs + Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 shrink-0">
                    {/* Tab row */}
                    <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-gray-100 overflow-x-auto">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
                                    activeTab === t.key
                                        ? 'text-[#663259] border-[#663259] bg-[#663259]/5'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter bar */}
                    <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                        <div className="flex gap-1.5 flex-wrap flex-1">
                            {(['ALL', 'PENDING', 'DEPOSITED', 'CASHED', 'BOUNCED', 'ENDORSED', 'CANCELLED'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        statusFilter === s
                                            ? 'bg-[#663259] text-white'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {s === 'ALL' ? 'Tümü' : CHECK_STATUS_LABELS[s]}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[17px]">search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Firma, çek no, banka..."
                                className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] w-52 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                <div className="w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm">Yükleniyor...</p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 text-center">
                            <span className="material-symbols-outlined text-[56px] text-gray-300 mb-3">receipt_long</span>
                            <p className="font-bold text-gray-400">Çek/senet bulunamadı</p>
                            <p className="text-sm text-gray-400 mt-1">Yeni eklemek için "Yeni Ekle" butonunu kullanın</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 px-5 py-2.5 bg-[#663259] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Yeni Çek/Senet Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs font-semibold text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-5 py-3 text-left">Tür</th>
                                        <th className="px-5 py-3 text-left">Firma</th>
                                        <th className="px-5 py-3 text-left">Banka / No</th>
                                        <th className="px-5 py-3 text-right">Tutar</th>
                                        <th className="px-5 py-3 text-center">Düzenleme</th>
                                        <th className="px-5 py-3 text-center">Vade</th>
                                        <th className="px-5 py-3 text-center">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(c => {
                                        const st = STATUS_CONFIG[c.status];
                                        const isOverdue = c.status === 'PENDING' && c.due_date < today;
                                        const isReceived = c.type === 'CHECK_RECEIVED' || c.type === 'NOTE_RECEIVED';
                                        return (
                                            <tr
                                                key={c.id}
                                                onClick={() => setSelectedCheck(c)}
                                                className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${isOverdue ? 'bg-red-50/20' : ''}`}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReceived ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                {c.type.startsWith('CHECK') ? 'receipt_long' : 'description'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-700">{CHECK_TYPE_LABELS[c.type]}</p>
                                                            <p className={`text-[10px] font-semibold ${isReceived ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                                {isReceived ? 'Alınan' : 'Verilen'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="text-sm font-semibold text-gray-800">{c.company_name || '—'}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="text-sm text-gray-700">{c.bank_name || '—'}</p>
                                                    {c.check_number && (
                                                        <p className="text-xs text-gray-400">{c.check_number}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className={`text-sm font-bold ${isReceived ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                        {isReceived ? '+' : '-'}₺{formatCurrency(c.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center text-sm text-gray-500">
                                                    {formatDate(c.issue_date)}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {formatDate(c.due_date)}
                                                        {isOverdue && (
                                                            <span className="ml-1 text-[10px] font-bold text-red-500">(!)</span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                                        {st.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                                <p className="text-sm text-gray-400">{filtered.length} kayıt — Toplam: ₺{formatCurrency(filtered.reduce((s, c) => s + c.amount, 0))}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddCheckModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={addCheck}
                companies={companies}
            />

            <StatusModal
                check={selectedCheck}
                isOpen={!!selectedCheck}
                onClose={() => setSelectedCheck(null)}
                onStatusChange={updateStatus}
                onDelete={deleteCheck}
            />
        </div>
    );
};

export default Checks;
