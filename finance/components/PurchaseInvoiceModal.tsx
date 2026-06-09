import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { formatCurrency, generateId } from '../../_shared/helpers';
import { useInvoiceStore } from '../stores/useInvoiceStore';

interface PurchaseInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
    companyName: string;
    /** Kayit sonrasi cari ekstresini/bakiyesini tazelemek icin. */
    onSaved: () => void | Promise<void>;
}

interface ItemRow {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
}

const newRow = (): ItemRow => ({ id: generateId(), name: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20 });
const fmt = (n: number) => formatCurrency(n);

export default function PurchaseInvoiceModal({ isOpen, onClose, companyId, companyName, onSaved }: PurchaseInvoiceModalProps) {
    useEscapeKey(onClose, isOpen);
    const { addInvoice, getNextInvoiceNo } = useInvoiceStore();

    const [invoiceNo, setInvoiceNo] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<ItemRow[]>([newRow()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate(''); setDescription(''); setItems([newRow()]); setError(null);
        getNextInvoiceNo('purchase').then(setInvoiceNo).catch(() => setInvoiceNo(''));
    }, [isOpen, getNextInvoiceNo]);

    const lineTotal = (it: ItemRow) => Math.round(it.quantity * it.unitPrice * 100) / 100;
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
        try {
            await addInvoice(
                {
                    id: generateId(),
                    invoice_no: invoiceNo,
                    invoice_type: 'toptan_alis',
                    direction: 'purchase',
                    company_id: companyId,
                    company_name: companyName,
                    date,
                    due_date: dueDate || undefined,
                    description: description.trim() || undefined,
                    subtotal,
                    vat_total: totalVat,
                    grand_total: grandTotal,
                    payment_status: 'unpaid',
                    status: 'active',
                },
                valid.map((it) => ({
                    id: generateId(),
                    name: it.name.trim(),
                    quantity: it.quantity,
                    unit: it.unit,
                    unit_price: it.unitPrice,
                    vat_rate: it.vatRate,
                    total: lineTotal(it),
                })),
            );
            await onSaved();
            onClose();
        } catch {
            setError('Alış kaydedilemedi. Lütfen tekrar deneyin veya oturumunuzu yenileyin.');
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
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">Alış Ekle</h3>
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
                                        <input type="number" value={it.quantity} min={0} onChange={(e) => updateItem(it.id, 'quantity', Number(e.target.value) || 0)}
                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all" />
                                    </td>
                                    <td className="py-1.5 px-1">
                                        <input type="number" value={it.unitPrice} min={0} onChange={(e) => updateItem(it.id, 'unitPrice', Number(e.target.value) || 0)}
                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#663259]/20 transition-all" />
                                    </td>
                                    <td className="py-1.5 px-1">
                                        <input type="number" value={it.vatRate} min={0} onChange={(e) => updateItem(it.id, 'vatRate', Number(e.target.value) || 0)}
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
                        <button onClick={handleSave} disabled={saving} className="px-7 py-3 bg-[#663259] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20 hover:bg-[#4a2340] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
