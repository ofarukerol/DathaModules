import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { formatCurrency, generateId } from '../../_shared/helpers';
import { useInvoiceStore } from '../stores/useInvoiceStore';
import { invoiceService } from '../services/invoiceService';

interface PurchaseInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
    companyName: string;
    /** Dolu ise duzenleme modu: bu faturayi yukler ve gunceller. */
    editInvoiceId?: string | null;
    /** Kayit/guncelleme sonrasi cari ekstresini/bakiyesini tazelemek icin. */
    onSaved: () => void | Promise<void>;
}

interface ItemRow {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: string; // tr-TR formatli (ondalik ,) — hesapta parseAmount ile sayiya cevrilir
    vatRate: number;
}

/** tr-TR formatli girisi sayiya cevir: "32.237,70" -> 32237.7 */
const parseAmount = (s: string): number => {
    if (!s) return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
};

/** Girisi tr-TR binlik ayraciyla bicimle (yazarken): "32237,7" -> "32.237,7" */
const formatAmountInput = (raw: string): string => {
    let s = raw.replace(/[^\d,]/g, '');
    const ci = s.indexOf(',');
    if (ci !== -1) s = s.slice(0, ci + 1) + s.slice(ci + 1).replace(/,/g, '');
    const [intP, decP] = s.split(',');
    const intF = (intP || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decP !== undefined ? `${intF},${decP.slice(0, 2)}` : intF;
};

const newRow = (): ItemRow => ({ id: generateId(), name: '', quantity: 1, unit: 'Adet', unitPrice: '', vatRate: 0 });
const fmt = (n: number) => formatCurrency(n);

export default function PurchaseInvoiceModal({ isOpen, onClose, companyId, companyName, editInvoiceId, onSaved }: PurchaseInvoiceModalProps) {
    useEscapeKey(onClose, isOpen);
    const { addInvoice, updateInvoice, getNextInvoiceNo } = useInvoiceStore();
    const isEdit = !!editInvoiceId;

    const [invoiceNo, setInvoiceNo] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<ItemRow[]>([newRow()]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        if (editInvoiceId) {
            setLoading(true);
            invoiceService.getById(editInvoiceId).then((inv) => {
                if (!inv) { setError('Fatura bulunamadı.'); return; }
                setInvoiceNo(inv.invoice_no || inv.invoice_number || '');
                setDate(inv.date);
                setDueDate(inv.due_date || '');
                setDescription(inv.description || '');
                setItems(
                    inv.items.length
                        ? inv.items.map((it) => ({
                            id: generateId(),
                            name: it.name || it.product_name || it.description || '',
                            quantity: it.quantity || 1,
                            unit: it.unit || 'Adet',
                            unitPrice: formatAmountInput(String(it.unit_price ?? 0).replace('.', ',')),
                            vatRate: it.vat_rate ?? it.tax_rate ?? 0,
                        }))
                        : [newRow()],
                );
            }).catch(() => setError('Fatura yüklenemedi.')).finally(() => setLoading(false));
        } else {
            setDate(new Date().toISOString().split('T')[0]);
            setDueDate(''); setDescription(''); setItems([newRow()]);
            getNextInvoiceNo('purchase').then(setInvoiceNo).catch(() => setInvoiceNo(''));
        }
    }, [isOpen, editInvoiceId, getNextInvoiceNo]);

    const lineTotal = (it: ItemRow) => Math.round(it.quantity * parseAmount(it.unitPrice) * 100) / 100;
    const subtotal = useMemo(() => items.reduce((s, it) => s + lineTotal(it), 0), [items]);
    const totalVat = useMemo(() => items.reduce((s, it) => s + (lineTotal(it) * it.vatRate) / 100, 0), [items]);
    const grandTotal = Math.round((subtotal + totalVat) * 100) / 100;

    const updateItem = (id: string, field: keyof ItemRow, value: string | number) =>
        setItems((rows) => rows.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
    const removeItem = (id: string) => setItems((rows) => (rows.length <= 1 ? rows : rows.filter((it) => it.id !== id)));

    const handleSave = async () => {
        if (saving) return;
        const valid = items.filter((it) => it.name.trim());
        if (valid.length === 0) { setError('En az bir kalem (açıklama) girin.'); return; }
        setSaving(true); setError(null);
        const data = {
            invoice_no: invoiceNo,
            invoice_type: 'toptan_alis',
            direction: 'purchase' as const,
            company_id: companyId,
            company_name: companyName,
            date,
            due_date: dueDate || undefined,
            description: description.trim() || undefined,
            subtotal,
            vat_total: totalVat,
            grand_total: grandTotal,
            payment_status: 'unpaid' as const,
            status: 'active',
        };
        const itemPayload = valid.map((it) => ({
            id: generateId(),
            name: it.name.trim(),
            quantity: it.quantity,
            unit: it.unit,
            unit_price: parseAmount(it.unitPrice),
            vat_rate: it.vatRate,
            total: lineTotal(it),
        }));
        try {
            if (editInvoiceId) {
                await updateInvoice(editInvoiceId, data, itemPayload);
            } else {
                await addInvoice({ id: generateId(), ...data }, itemPayload);
            }
            await onSaved();
            onClose();
        } catch {
            setError('Kaydedilemedi. Lütfen tekrar deneyin veya oturumunuzu yenileyin.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[92vh] relative z-10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-[#663259]/[0.04] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-[#663259] text-white flex items-center justify-center">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">{isEdit ? 'Alışı Düzenle' : 'Alış Ekle'}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{companyName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>

                {/* Üst alanlar */}
                <div className="px-7 py-4 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 border-b border-gray-50">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura No</label>
                        <input
                            type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="ALI-..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/15 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                        <DatePicker value={date} onChange={setDate} icon="event" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vade (ops.)</label>
                        <DatePicker value={dueDate} onChange={setDueDate} icon="event" />
                    </div>
                </div>

                {/* Kalemler */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-7 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kalemler</span>
                        <button onClick={() => setItems((r) => [...r, newRow()])} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-all">
                            <Plus size={14} /> Kalem Ekle
                        </button>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <svg className="animate-spin h-6 w-6 text-[#663259]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        </div>
                    ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="py-1.5">Açıklama</th>
                                <th className="py-1.5 text-right w-16">Adet</th>
                                <th className="py-1.5 text-right w-28">Birim Fiyat</th>
                                <th className="py-1.5 text-right w-16">KDV%</th>
                                <th className="py-1.5 text-right w-28">Tutar</th>
                                <th className="py-1.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-t border-gray-50">
                                    <td className="py-1.5 pr-2">
                                        <input
                                            type="text" value={it.name} onChange={(e) => updateItem(it.id, 'name', e.target.value)} placeholder="Ürün / hizmet"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all"
                                        />
                                    </td>
                                    <td className="py-1.5 px-1">
                                        <input type="text" inputMode="numeric" value={it.quantity} onChange={(e) => updateItem(it.id, 'quantity', Math.max(0, Math.floor(Number(e.target.value.replace(/\D/g, '')) || 0)))}
                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all" />
                                    </td>
                                    <td className="py-1.5 px-1">
                                        <input type="text" inputMode="decimal" value={it.unitPrice} placeholder="0,00"
                                            onChange={(e) => updateItem(it.id, 'unitPrice', formatAmountInput(e.target.value))}
                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all" />
                                    </td>
                                    <td className="py-1.5 px-1">
                                        <input type="text" inputMode="numeric" value={it.vatRate} onChange={(e) => updateItem(it.id, 'vatRate', Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all" />
                                    </td>
                                    <td className="py-1.5 px-1 text-right text-sm font-black text-gray-800 tabular-nums">{fmt(lineTotal(it))}</td>
                                    <td className="py-1.5 text-center">
                                        <button onClick={() => removeItem(it.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}

                    <div className="mt-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama (ops.)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fatura açıklaması..."
                            className="mt-1 w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all min-h-[52px] resize-none" />
                    </div>
                </div>

                {/* Toplamlar + aksiyonlar */}
                <div className="px-7 py-4 bg-gray-50/60 border-t border-gray-100 shrink-0 flex items-end justify-between gap-4">
                    <div className="text-xs font-bold text-gray-500 space-y-0.5">
                        <div>Ara Toplam: <span className="text-gray-800 font-black">{fmt(subtotal)}</span></div>
                        <div>KDV: <span className="text-gray-800 font-black">{fmt(totalVat)}</span></div>
                        <div className="text-sm">Genel Toplam: <span className="text-[#663259] font-black">{fmt(grandTotal)}</span></div>
                        {error && <div className="text-red-500 pt-1">{error}</div>}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button onClick={onClose} className="px-5 py-3 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest">İptal</button>
                        <button onClick={handleSave} disabled={saving || loading} className="px-7 py-3 bg-[#663259] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20 hover:bg-[#4a2340] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
