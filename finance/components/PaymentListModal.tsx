import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Wallet, History, Save, ChevronLeft } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { formatCurrency, generateId } from '../../_shared/helpers';
import { paymentListService } from '../services/paymentListService';
import type { PaymentListSummary, PaymentListDetail } from '../services/paymentListService';
import type { Company } from '../types';

interface PaymentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[]; // tum cariler; modal borclu (balance < 0) olanlari kullanir
}

interface ManualRow { id: string; name: string; amount: string; }

const fmt = (n: number) => formatCurrency(n);

export default function PaymentListModal({ isOpen, onClose, companies }: PaymentListModalProps) {
    useEscapeKey(onClose, isOpen);

    const [tab, setTab] = useState<'new' | 'history'>('new');

    // Yeni liste
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [total, setTotal] = useState('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [manualRows, setManualRows] = useState<ManualRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Gecmis
    const [history, setHistory] = useState<PaymentListSummary[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [detail, setDetail] = useState<PaymentListDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Borclu cariler (bakiye < 0), borcu buyukten kucuge
    const borcluCompanies = useMemo(
        () => companies.filter((c) => c.balance < 0).sort((a, b) => a.balance - b.balance),
        [companies],
    );

    const allocatedTotal = useMemo(() => {
        let sum = 0;
        for (const v of Object.values(allocations)) sum += Number(v) || 0;
        for (const m of manualRows) sum += Number(m.amount) || 0;
        return Math.round(sum * 100) / 100;
    }, [allocations, manualRows]);

    const totalNum = Number(total) || 0;
    const remaining = Math.round((totalNum - allocatedTotal) * 100) / 100;

    const loadHistory = async () => {
        setHistoryLoading(true);
        try { setHistory(await paymentListService.getAll()); }
        catch { setHistory([]); }
        finally { setHistoryLoading(false); }
    };

    useEffect(() => {
        if (isOpen && tab === 'history' && !detail) void loadHistory();
    }, [isOpen, tab, detail]);

    const resetNew = () => {
        setTitle(''); setDate(new Date().toISOString().split('T')[0]); setTotal('');
        setAllocations({}); setManualRows([]); setError(null);
    };

    const openDetail = async (id: string) => {
        setDetailLoading(true); setDetail(null);
        try { setDetail(await paymentListService.getById(id)); }
        catch { setDetail(null); }
        finally { setDetailLoading(false); }
    };

    const handleSave = async () => {
        if (saving) return;
        if (totalNum <= 0) { setError('Geçerli bir toplam tutar girin.'); return; }
        const items = [
            ...borcluCompanies
                .filter((c) => (Number(allocations[c.id]) || 0) > 0)
                .map((c) => ({ companyId: c.id, balanceSnapshot: c.balance, amount: Number(allocations[c.id]) })),
            ...manualRows
                .filter((m) => m.name.trim() && (Number(m.amount) || 0) > 0)
                .map((m) => ({ manualName: m.name.trim(), amount: Number(m.amount) })),
        ];
        if (items.length === 0) { setError('En az bir satıra tutar girin.'); return; }
        setSaving(true); setError(null);
        try {
            await paymentListService.create({ title, paymentDate: date, totalAmount: totalNum, items });
            resetNew();
            setTab('history');
            await loadHistory();
        } catch {
            setError('Liste kaydedilemedi. Lütfen tekrar deneyin veya oturumunuzu yenileyin.');
        } finally { setSaving(false); }
    };

    if (!isOpen) return null;

    const tabBtn = (key: 'new' | 'history', label: string, Icon: typeof Wallet) => (
        <button
            onClick={() => { setTab(key); setDetail(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-[#663259] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <Icon size={16} />{label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[92vh] relative z-10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-[#663259] text-white flex items-center justify-center">
                            <Wallet size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">Ödeme Listesi</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tedarikçi ödeme dağıtımı</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {tabBtn('new', 'Yeni Liste', Wallet)}
                        {tabBtn('history', 'Geçmiş', History)}
                        <button onClick={onClose} className="ml-1 w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ───────── YENİ LİSTE ───────── */}
                {tab === 'new' && (
                    <>
                        <div className="px-7 py-4 border-b border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Toplam Tutar (₺)</label>
                                <input
                                    type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0,00" autoFocus
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-2xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#663259]/15 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                                <DatePicker value={date} onChange={setDate} icon="event" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kalan</label>
                                <div className={`px-4 py-3 rounded-2xl border text-xl font-black ${remaining < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    {fmt(remaining)}
                                </div>
                            </div>
                        </div>

                        <div className="px-7 pt-3 flex items-center justify-between shrink-0">
                            <input
                                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                placeholder="Liste başlığı (opsiyonel) — ör. Haftalık tedarikçi ödemesi"
                                className="flex-1 mr-3 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all"
                            />
                            <button
                                onClick={() => setManualRows((r) => [...r, { id: generateId(), name: '', amount: '' }])}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 transition-all shrink-0"
                            >
                                <Plus size={15} /> Manuel Satır
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-7 py-3">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="py-2">Tedarikçi</th>
                                        <th className="py-2 text-right">Borç</th>
                                        <th className="py-2 text-right w-44">Ödenecek Tutar (₺)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {borcluCompanies.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50/50">
                                            <td className="py-2.5 text-sm font-bold text-gray-700">{c.name}</td>
                                            <td className="py-2.5 text-right text-sm font-black text-red-500">{fmt(Math.abs(c.balance))}</td>
                                            <td className="py-2.5 text-right">
                                                <input
                                                    type="number" value={allocations[c.id] ?? ''}
                                                    onChange={(e) => setAllocations((a) => ({ ...a, [c.id]: e.target.value }))}
                                                    placeholder="0,00"
                                                    className="w-40 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {manualRows.map((m) => (
                                        <tr key={m.id} className="bg-amber-50/30">
                                            <td className="py-2.5">
                                                <input
                                                    type="text" value={m.name}
                                                    onChange={(e) => setManualRows((r) => r.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))}
                                                    placeholder="Manuel ödeme adı (ör. nakliye)"
                                                    className="w-full px-3 py-2 bg-white border border-amber-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
                                                />
                                            </td>
                                            <td className="py-2.5 text-right text-[10px] font-black text-amber-500 uppercase">Manuel</td>
                                            <td className="py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <input
                                                        type="number" value={m.amount}
                                                        onChange={(e) => setManualRows((r) => r.map((x) => x.id === m.id ? { ...x, amount: e.target.value } : x))}
                                                        placeholder="0,00"
                                                        className="w-32 px-3 py-2 bg-white border border-amber-100 rounded-xl text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
                                                    />
                                                    <button onClick={() => setManualRows((r) => r.filter((x) => x.id !== m.id))} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {borcluCompanies.length === 0 && manualRows.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <Wallet size={48} className="opacity-10 mb-3" />
                                    <p className="text-sm font-bold">Borçlu tedarikçi yok</p>
                                    <p className="text-xs">"Manuel Satır" ile tek seferlik ödeme ekleyebilirsiniz.</p>
                                </div>
                            )}
                        </div>

                        <div className="px-7 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                            <div className="text-xs font-bold text-gray-500">
                                Dağıtılan: <span className="text-gray-800 font-black">{fmt(allocatedTotal)}</span>
                                {error && <span className="ml-4 text-red-500">{error}</span>}
                            </div>
                            <button
                                onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-7 py-3 bg-[#663259] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20 hover:bg-[#4a2340] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={16} />{saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </>
                )}

                {/* ───────── GEÇMİŞ ───────── */}
                {tab === 'history' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-7 py-4">
                        {detail ? (
                            <div>
                                <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#663259] mb-4 transition-colors">
                                    <ChevronLeft size={16} /> Listeye dön
                                </button>
                                <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-2xl">
                                    <div>
                                        <h4 className="text-base font-black text-gray-800">{detail.title || 'Ödeme Listesi'}</h4>
                                        <p className="text-xs text-gray-400 font-bold">{detail.paymentDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toplam / Dağıtılan</p>
                                        <p className="text-lg font-black text-[#663259]">{fmt(detail.totalAmount)} <span className="text-gray-300">/</span> {fmt(detail.allocatedAmount)}</p>
                                    </div>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <th className="py-2">Alıcı</th>
                                            <th className="py-2 text-right">Kayıttaki Borç</th>
                                            <th className="py-2 text-right">Ödenen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {detail.items.map((it) => (
                                            <tr key={it.id}>
                                                <td className="py-2.5 text-sm font-bold text-gray-700">
                                                    {it.companyName || it.manualName || '—'}
                                                    {!it.companyId && <span className="ml-2 text-[9px] font-black text-amber-500 uppercase">Manuel</span>}
                                                </td>
                                                <td className="py-2.5 text-right text-sm font-bold text-gray-400">{it.companyId ? fmt(Math.abs(it.balanceSnapshot)) : '—'}</td>
                                                <td className="py-2.5 text-right text-sm font-black text-emerald-600">{fmt(it.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : detailLoading || historyLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <svg className="animate-spin h-7 w-7 text-[#663259]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <History size={48} className="opacity-10 mb-3" />
                                <p className="text-sm font-bold">Henüz kayıtlı ödeme listesi yok</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((h) => (
                                    <button
                                        key={h.id} onClick={() => openDetail(h.id)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-[#663259]/20 transition-all text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-black text-gray-800">{h.title || 'Ödeme Listesi'}</p>
                                            <p className="text-xs text-gray-400 font-bold">{h.paymentDate} · {h.itemCount} ödeme</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-[#663259]">{fmt(h.allocatedAmount)}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Toplam {fmt(h.totalAmount)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
