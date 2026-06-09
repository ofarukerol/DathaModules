import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
    Building2,
    Phone,
    MapPin,
    FileText,
    Plus,
    Download,
    Edit2,
    History,
    CreditCard,
    Clock,
    UserCircle,
    Scale,
    Trash2
} from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import { invoiceService } from '../services/invoiceService';
import { financeService } from '../services/financeService';
import { COMPANY_TYPE_LABELS, PAYMENT_METHOD_LABELS, type CompanyType, type PaymentMethod } from '../types';
import CustomSelect from '../../../components/CustomSelect';
import PageToolbar from '@/components/PageToolbar';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import ConfirmDialog from '../../../components/ConfirmDialog';

/** Cari ekstre satiri — alis faturalari + odeme/gider islemleri birlesimi. */
interface LedgerEntry {
    id: string;
    date: string;          // YYYY-MM-DD
    createdAt?: string;
    description: string;
    /** purchase = borc artiran (kirmizi, -), payment = borc azaltan (yesil, +) */
    kind: 'purchase' | 'payment';
    kindLabel: string;     // 'Alis Faturasi' | 'Odeme' | 'Satis Faturasi' | 'Gider' | 'Duzeltme'
    amount: number;        // lira, pozitif
    isAdjustment?: boolean; // bakiye duzeltme firsi mi
    // Duzenle/sil icin: kaynak + sync esleme + transaction'da korunacak alanlar
    source: 'invoice' | 'transaction';
    localId?: string;
    txType?: 'INCOME' | 'EXPENSE';   // sadece transaction
    categoryId?: string;             // sadece transaction
    paymentMethod?: PaymentMethod;   // sadece transaction
    currency?: string;               // sadece transaction (REPLACE upsert'te korunmasi icin)
}

/**
 * Bakiye duzeltme hareketlerini ekstrede ayirt etmek + bakiyeyi sunucu-otoriteli
 * yeniden hesaplatmak icin kullanilan sentinel kategori id'si (gercek bir kategori degil).
 */
const BALANCE_ADJUSTMENT_CATEGORY_ID = 'adj_balance_correction';

// UI odeme yontemi -> backend PaymentMethod enum
const PAYMENT_METHOD_MAP: Record<'nakit' | 'havale' | 'kredi_karti' | 'cek', PaymentMethod> = {
    nakit: 'CASH',
    havale: 'BANK_TRANSFER',
    kredi_karti: 'CARD',
    cek: 'CHECK',
};

const fmtTL = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const CompanyDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { companies, fetchCompanies, getCompanyById, updateCompany } = useCompanyStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isEInvoice, setIsEInvoice] = useState(true);
    const [isEArchive, setIsEArchive] = useState(false);

    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    useEffect(() => { if (companies.length === 0) fetchCompanies(); }, []);

    const company = getCompanyById(id || '');

    /** Gercek backend verisinden ekstre yukle: alis faturalari + cari islemleri. */
    const loadLedger = useCallback(async () => {
        if (!id) return;
        setLedgerLoading(true);
        try {
            const [invoices, txns] = await Promise.all([
                invoiceService.getAll(),
                financeService.fetchTransactions({ companyId: id }),
            ]);
            const entries: LedgerEntry[] = [];
            for (const inv of invoices) {
                if (inv.company_id !== id) continue;
                const isPurchase = inv.direction === 'purchase';
                const noPart = inv.invoice_no || inv.invoice_number || 'Fatura';
                entries.push({
                    id: inv.id,
                    date: inv.date,
                    createdAt: inv.created_at,
                    description: inv.description ? `${noPart} · ${inv.description}` : noPart,
                    kind: isPurchase ? 'purchase' : 'payment',
                    kindLabel: isPurchase ? 'Alış Faturası' : 'Satış Faturası',
                    amount: inv.grand_total,
                    source: 'invoice',
                    localId: inv.localId,
                });
            }
            for (const t of txns) {
                const isCredit = t.type === 'INCOME';
                const isAdjustment = t.category_id === BALANCE_ADJUSTMENT_CATEGORY_ID;
                entries.push({
                    id: t.id,
                    date: t.date,
                    createdAt: t.created_at,
                    description: t.description || (isAdjustment ? 'Bakiye Düzeltme' : isCredit ? 'Ödeme' : 'Gider'),
                    kind: isCredit ? 'payment' : 'purchase',
                    kindLabel: isAdjustment ? 'Düzeltme' : isCredit ? 'Ödeme' : 'Gider',
                    amount: t.amount,
                    isAdjustment,
                    source: 'transaction',
                    localId: t.localId,
                    txType: t.type,
                    categoryId: t.category_id,
                    paymentMethod: t.payment_method,
                    currency: t.currency,
                });
            }
            setLedger(entries);
        } catch {
            setLedger([]);
        } finally {
            setLedgerLoading(false);
        }
    }, [id]);

    useEffect(() => { void loadLedger(); }, [loadLedger]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', title: '', contact_person: '', phone: '', tax_office: '', tax_number: '', address: '', email: '', type: 'CUSTOMER' as CompanyType
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        method: 'nakit' as 'nakit' | 'havale' | 'kredi_karti' | 'cek',
    });

    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustSaving, setAdjustSaving] = useState(false);
    const [adjustError, setAdjustError] = useState<string | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        direction: 'alim' as 'alim' | 'odeme',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
    });

    // Hareket duzenleme (sadece transaction) + silme (transaction + fatura) state'leri
    const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
    const [entryForm, setEntryForm] = useState({ amount: '', date: '', description: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    // ESC ile acik modali kapat (her modal yalniz acikken dinler).
    useEscapeKey(() => setShowEditModal(false), showEditModal);
    useEscapeKey(() => setShowPaymentModal(false), showPaymentModal);
    useEscapeKey(() => setShowAdjustModal(false), showAdjustModal);
    useEscapeKey(() => setEditEntry(null), !!editEntry);

    const filteredEntries = useMemo(() => ledger.filter(t => {
        if (!startDate && !endDate) return true;
        const d = new Date(t.date);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date(8640000000000000);
        return d >= start && d <= end;
    }), [ledger, startDate, endDate]);

    const periodTotals = useMemo(() => filteredEntries.reduce((acc, t) => {
        if (t.kind === 'purchase') acc.purchase += t.amount;
        else acc.payment += t.amount;
        return acc;
    }, { purchase: 0, payment: 0 }), [filteredEntries]);

    // Genel cari bakiyesi sunucu-otoriteli (company.balance); ekstre yalniz gosterim.
    const currentBalance = company?.balance ?? 0;

    // Running balance — donem icinde 0'dan baslar (gosterim amacli)
    const entriesWithBalance = useMemo(() => {
        const sorted = [...filteredEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;
        const withBalance = sorted.map(t => {
            const before = runningBalance;
            if (t.kind === 'purchase') runningBalance -= t.amount;
            else runningBalance += t.amount;
            return { ...t, balanceBefore: before, balanceAfter: runningBalance };
        });
        return withBalance.reverse();
    }, [filteredEntries]);

    if (!company) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 font-bold">Firma bulunamadı.</p>
            </div>
        );
    }

    const openEditModal = () => {
        setEditForm({
            name: company.name,
            title: company.title || '',
            contact_person: company.contact_person || '',
            phone: company.phone || '',
            tax_office: company.tax_office || '',
            tax_number: company.tax_number || '',
            address: company.address || '',
            email: company.email || '',
            type: company.type,
        });
        setShowEditModal(true);
    };

    const handleEditSave = () => {
        updateCompany(company.id, editForm);
        setShowEditModal(false);
    };

    const openPaymentModal = () => {
        setPaymentError(null);
        setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'nakit' });
        setShowPaymentModal(true);
    };

    const handlePaymentSave = async () => {
        if (paymentSaving) return;
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            setPaymentError('Geçerli bir tutar girin.');
            return;
        }
        setPaymentSaving(true);
        setPaymentError(null);
        try {
            // Cari odeme = borcu azaltir → INCOME islemi (recomputeCompanyBalance: INCOME bakiyeyi artirir).
            await financeService.createTransaction({
                company_id: company.id,
                type: 'INCOME',
                amount: Number(paymentForm.amount),
                date: paymentForm.date,
                description: paymentForm.description || 'Ödeme',
                payment_method: PAYMENT_METHOD_MAP[paymentForm.method],
            });
            setShowPaymentModal(false);
            await Promise.all([fetchCompanies(), loadLedger()]);
        } catch {
            setPaymentError('Ödeme kaydedilemedi. Lütfen tekrar deneyin veya oturumunuzu yenileyin.');
        } finally {
            setPaymentSaving(false);
        }
    };

    const openAdjustModal = () => {
        setAdjustError(null);
        setAdjustForm({ direction: 'alim', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        setShowAdjustModal(true);
    };

    const handleAdjustSave = async () => {
        if (adjustSaving) return;
        const amount = Number(adjustForm.amount);
        if (adjustForm.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
            setAdjustError('Geçerli bir tutar girin.');
            return;
        }
        setAdjustSaving(true);
        setAdjustError(null);
        try {
            // Alim -> EXPENSE (borc artar, bakiye azalir); Odeme -> INCOME (borc azalir, bakiye artar).
            // Tutar daima pozitif gonderilir; sunucu EXPENSE'i cikarir, INCOME'i ekler (sunucu-otoriteli bakiye).
            // Sentinel kategori ile isaretlenir; ekstrede "Duzeltme" olarak etiketlenir.
            await financeService.createTransaction({
                company_id: company.id,
                category_id: BALANCE_ADJUSTMENT_CATEGORY_ID,
                type: adjustForm.direction === 'odeme' ? 'INCOME' : 'EXPENSE',
                amount: Math.abs(amount),
                date: adjustForm.date,
                description: adjustForm.description.trim() || 'Bakiye Düzeltme',
            });
            setShowAdjustModal(false);
            await Promise.all([fetchCompanies(), loadLedger()]);
        } catch {
            setAdjustError('Düzeltme kaydedilemedi. Lütfen tekrar deneyin veya oturumunuzu yenileyin.');
        } finally {
            setAdjustSaving(false);
        }
    };

    /** Hareket (transaction) duzenleme modalini ac. Faturalar inline duzenlenmez. */
    const openEditEntry = (entry: LedgerEntry) => {
        if (entry.source !== 'transaction') return;
        setEditError(null);
        setEditEntry(entry);
        setEntryForm({ amount: String(entry.amount), date: entry.date, description: entry.description });
    };

    const handleEditEntrySave = async () => {
        if (!editEntry || editSaving) return;
        const amount = Number(entryForm.amount);
        if (entryForm.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
            setEditError('Geçerli bir tutar girin.');
            return;
        }
        setEditSaving(true);
        setEditError(null);
        try {
            // Backend sync UPSERT = REPLACE (gonderilmeyen nullable alanlar NULL'a duser).
            // Bu yuzden company_id + type/category/payment_method ACIKCA gonderilir (hareket cariden
            // kopmasin), currency korunur; bakiye istemciden gitmez, sunucu yeniden hesaplar.
            await financeService.updateTransaction(
                editEntry.id,
                {
                    amount,
                    date: entryForm.date,
                    description: entryForm.description.trim(),
                    company_id: company.id,
                    currency: editEntry.currency,
                    type: editEntry.txType,
                    category_id: editEntry.categoryId,
                    payment_method: editEntry.paymentMethod,
                },
                editEntry.localId,
            );
            setEditEntry(null);
            await Promise.all([fetchCompanies(), loadLedger()]);
        } catch {
            setEditError('Güncellenemedi. Lütfen tekrar deneyin.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget || deleteSaving) return;
        setDeleteSaving(true);
        const target = deleteTarget;
        try {
            if (target.source === 'transaction') {
                await financeService.deleteTransaction(target.id, target.localId);
            } else {
                await invoiceService.delete(target.id);
            }
            setDeleteTarget(null);
            await Promise.all([fetchCompanies(), loadLedger()]);
        } catch {
            setDeleteTarget(null);
        } finally {
            setDeleteSaving(false);
        }
    };

    const handleExportExcel = () => {
        const rows = entriesWithBalance.map(e => ({
            'Tarih': e.date,
            'İşlem': e.description,
            'Tür': e.kindLabel,
            'Tutar (₺)': e.kind === 'purchase' ? -e.amount : e.amount,
            'Bakiye (₺)': e.balanceAfter,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ekstre');
        XLSX.writeFile(wb, `${company.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}-ekstre.xlsx`);
    };

    const handleExportPdf = () => {
        const rowsHtml = entriesWithBalance.map(e => `
            <tr>
                <td>${escapeHtml(e.date)}</td>
                <td>${escapeHtml(e.description)}</td>
                <td>${escapeHtml(e.kindLabel)}</td>
                <td class="num">${e.kind === 'purchase' ? '-' : '+'} ${escapeHtml(fmtTL(e.amount))} ₺</td>
                <td class="num">${escapeHtml(fmtTL(e.balanceAfter))} ₺</td>
            </tr>`).join('');
        const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
            <title>${escapeHtml(company.name)} - Cari Ekstre</title>
            <style>
                * { font-family: Arial, sans-serif; }
                body { padding: 24px; color: #1f2937; }
                h1 { font-size: 18px; margin: 0 0 4px; }
                .sub { color: #6b7280; font-size: 12px; margin: 0 0 16px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
                th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
                .num { text-align: right; white-space: nowrap; }
                .totals { margin-top: 16px; font-size: 13px; }
                .totals span { margin-right: 24px; }
            </style></head><body>
            <h1>${escapeHtml(company.name)}</h1>
            <p class="sub">${escapeHtml(company.title || '')} · Cari Ekstre${startDate || endDate ? ` (${escapeHtml(startDate || '...')} – ${escapeHtml(endDate || '...')})` : ''}</p>
            <table><thead><tr>
                <th>Tarih</th><th>İşlem</th><th>Tür</th><th class="num">Tutar</th><th class="num">Bakiye</th>
            </tr></thead><tbody>${rowsHtml || '<tr><td colspan="5">Kayıt bulunamadı.</td></tr>'}</tbody></table>
            <div class="totals">
                <span>Toplam Alım: <b>${escapeHtml(fmtTL(periodTotals.purchase))} ₺</b></span>
                <span>Toplam Ödeme: <b>${escapeHtml(fmtTL(periodTotals.payment))} ₺</b></span>
                <span>Güncel Bakiye: <b>${escapeHtml(fmtTL(currentBalance))} ₺</b></span>
            </div></body></html>`;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.srcdoc = html;
        iframe.onload = () => {
            const win = iframe.contentWindow;
            if (!win) { iframe.remove(); return; }
            win.onafterprint = () => iframe.remove();
            win.focus();
            win.print();
        };
        document.body.appendChild(iframe);
    };

    // Bakiye duzeltme modali canli onizleme: yon (Alim=-, Odeme=+) * tutar = isaretli duzeltme; yeni bakiye = mevcut + delta.
    const adjAmountNum = Number(adjustForm.amount);
    const adjValid = adjustForm.amount.trim() !== '' && !Number.isNaN(adjAmountNum) && adjAmountNum > 0;
    const adjSignedDelta = adjValid ? (adjustForm.direction === 'odeme' ? adjAmountNum : -adjAmountNum) : 0;
    const adjNewBalance = Math.round((currentBalance + adjSignedDelta) * 100) / 100;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <PageToolbar
                    icon="corporate_fare"
                    title={company.name}
                    stats={company.title}
                    backPath="/finance/companies"
                    actions={
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={openPaymentModal}
                                className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-[#059669] active:scale-95"
                            >
                                <CreditCard size={16} />
                                Ödeme Ekle
                            </button>
                            <button
                                onClick={openAdjustModal}
                                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-[#D97706] active:scale-95"
                            >
                                <Scale size={16} />
                                Bakiye Düzeltme
                            </button>
                            <button
                                onClick={() => navigate(`/finance/companies/${id}/invoice/new?direction=purchase`)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#663259] text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-[#4a2340] active:scale-95"
                            >
                                <Plus size={16} />
                                Alış Faturası Ekle
                            </button>
                        </div>
                    }
                />

                <div className="flex-1 overflow-hidden flex gap-6">
                {/* Left: Info & Stats */}
                <div className="w-[280px] flex flex-col gap-4 shrink-0 h-full overflow-y-auto pr-2 custom-scrollbar pb-4">
                    {/* Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm transition-all group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-[#663259] border border-gray-100 shadow-inner">
                                <Building2 size={20} />
                            </div>
                            <h3 className="font-black text-gray-800 text-sm leading-tight uppercase tracking-tight">Firma Bilgileri</h3>
                        </div>

                        <div className="space-y-2.5">
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <UserCircle size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Yetkili Kişi</p>
                                    <p className="text-xs font-bold text-gray-700">{company.contact_person || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <Phone size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Telefon</p>
                                    <p className="text-xs font-bold text-gray-700">{company.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <FileText size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Vergi Bilgileri</p>
                                    <p className="text-xs font-bold text-gray-700">{company.tax_office || '-'} / {company.tax_number || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <MapPin size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Adres</p>
                                    <p className="text-[10px] font-bold text-gray-500 leading-relaxed">{company.address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={openEditModal}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg hover:bg-[#663259] hover:text-white hover:border-[#663259] transition-all font-bold text-[10px] active:scale-95"
                        >
                            <Edit2 size={13} />
                            <span>DÜZENLE</span>
                        </button>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shrink-0">
                        <h3 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-400">
                            <Clock size={12} />
                            Bakiye Özeti
                        </h3>

                        <div className="space-y-2">
                            {/* Toplam Alım */}
                            <div className="flex items-center justify-between p-2.5 bg-red-50/60 rounded-xl border border-red-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                                        <span className="text-red-500 text-xs font-black">A</span>
                                    </div>
                                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Toplam Alım</p>
                                </div>
                                <p className="text-sm font-black text-red-600">₺{periodTotals.purchase.toLocaleString('tr-TR')}</p>
                            </div>

                            {/* Toplam Ödeme */}
                            <div className="flex items-center justify-between p-2.5 bg-green-50/60 rounded-xl border border-green-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                                        <span className="text-green-500 text-xs font-black">Ö</span>
                                    </div>
                                    <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">Toplam Ödeme</p>
                                </div>
                                <p className="text-sm font-black text-green-600">₺{periodTotals.payment.toLocaleString('tr-TR')}</p>
                            </div>

                            {/* Guncel Bakiye (sunucu-otoriteli) */}
                            <div className={`p-3 rounded-xl border ${currentBalance < 0 ? 'bg-red-50/60 border-red-100/50' : 'bg-green-50/60 border-green-100/50'}`}>
                                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Güncel Bakiye</p>
                                <div className="flex items-end justify-between">
                                    <p className={`text-xl font-black tracking-tight ${currentBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {currentBalance.toLocaleString('tr-TR')}₺
                                    </p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${currentBalance < 0 ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                                        {currentBalance < 0 ? 'Borçlu' : 'Alacaklı'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Transactions & Filters */}
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between shrink-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    icon="calendar_today"
                                    compact
                                />
                                <span className="text-gray-300 text-xs font-bold px-1">—</span>
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    icon="event"
                                    compact
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        setStartDate(today);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bugün
                                </button>
                                <button
                                    onClick={() => {
                                        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        const today = new Date().toISOString().split('T')[0];
                                        setStartDate(lastWeek);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bu Hafta
                                </button>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                                        const today = now.toISOString().split('T')[0];
                                        setStartDate(firstDay);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bu Ay
                                </button>
                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                        className="px-2 py-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                        title="Filtreyi Temizle"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleExportPdf}
                                disabled={entriesWithBalance.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Download size={14} />
                                PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={entriesWithBalance.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Download size={14} />
                                EXCEL
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarih / Saat</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlem Detayı</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tür</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Miktar</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Bakiye</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {entriesWithBalance.map(t => (
                                    <tr key={t.id} className="hover:bg-[#663259]/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{t.date}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {t.createdAt ? new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.isAdjustment ? 'bg-amber-50 text-amber-500' : t.kind === 'purchase' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {t.isAdjustment ? 'tune' : t.kind === 'purchase' ? 'shopping_cart' : 'payments'}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">{t.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${t.isAdjustment ? 'bg-amber-50 text-amber-600' : t.kind === 'purchase' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {t.kindLabel}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`text-base font-black ${t.kind === 'purchase' ? 'text-red-500' : 'text-green-500'}`}>
                                                {t.kind === 'purchase' ? '-' : '+'} ₺{t.amount.toLocaleString('tr-TR')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-gray-800 tracking-tight">₺{t.balanceAfter.toLocaleString('tr-TR')}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {t.localId ? (
                                                    <>
                                                        {t.source === 'transaction' && (
                                                            <button
                                                                onClick={() => openEditEntry(t)}
                                                                title="Düzenle"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-[#663259]/10 hover:text-[#663259] transition-colors"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteTarget(t)}
                                                            title="Sil"
                                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-[9px] text-gray-300 font-bold" title="Senkron anahtarı (localId) olmayan kayıt buradan düzenlenemez/silinemez">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {!ledgerLoading && filteredEntries.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                                <History size={64} className="opacity-10 mb-4" />
                                <p className="text-lg font-bold">Kayıt Bulunamadı</p>
                                <p className="text-sm">Seçilen tarih aralığında işlem bulunmamaktadır.</p>
                            </div>
                        )}

                        {ledgerLoading && (
                            <div className="flex items-center justify-center py-32 text-gray-400">
                                <svg className="animate-spin h-7 w-7 text-[#663259]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Borç Bakiyesi</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Alacak Bakiyesi</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mr-4">Güncel Net Bakiye</span>
                            <span className={`text-xl font-black ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                ₺{currentBalance.toLocaleString('tr-TR')}
                            </span>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#663259] text-white flex items-center justify-center">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Firmayı Düzenle</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Firma bilgilerini güncelleyin</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Firma Adı</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Resmi Ünvan</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Yetkili Kişi</label>
                                    <input
                                        type="text"
                                        value={editForm.contact_person}
                                        onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefon</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        value={editForm.tax_office}
                                        onChange={(e) => setEditForm({ ...editForm, tax_office: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vergi No</label>
                                    <input
                                        type="text"
                                        value={editForm.tax_number}
                                        onChange={(e) => setEditForm({ ...editForm, tax_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adres</label>
                                <textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cari Türü</label>
                                <CustomSelect
                                    options={[
                                        { value: 'CUSTOMER', label: COMPANY_TYPE_LABELS.CUSTOMER, icon: 'person' },
                                        { value: 'SUPPLIER', label: COMPANY_TYPE_LABELS.SUPPLIER, icon: 'local_shipping' },
                                        { value: 'BOTH', label: COMPANY_TYPE_LABELS.BOTH, icon: 'sync_alt' },
                                    ]}
                                    value={editForm.type}
                                    onChange={(v) => setEditForm({ ...editForm, type: v as CompanyType })}
                                    icon="category"
                                    accentColor="#663259"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura Türü</label>
                                <div className="flex items-center gap-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isEInvoice}
                                            onChange={(e) => setIsEInvoice(e.target.checked)}
                                            className="w-4 h-4 rounded text-[#663259] focus:ring-[#663259]/20"
                                        />
                                        <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">E-Fatura</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isEArchive}
                                            onChange={(e) => setIsEArchive(e.target.checked)}
                                            className="w-4 h-4 rounded text-[#663259] focus:ring-[#663259]/20"
                                        />
                                        <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">E-Arşiv</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-6 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="flex-1 px-6 py-4 bg-[#663259] text-white rounded-2xl hover:bg-[#4a2340] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20"
                            >
                                Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-green-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-800 tracking-tight">Ödeme Ekle</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{company.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tutar (₺)</label>
                                    <input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                                    <input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ödeme Yöntemi</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as typeof paymentForm.method })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="nakit">{PAYMENT_METHOD_LABELS.CASH}</option>
                                        <option value="havale">{PAYMENT_METHOD_LABELS.BANK_TRANSFER}</option>
                                        <option value="kredi_karti">{PAYMENT_METHOD_LABELS.CARD}</option>
                                        <option value="cek">{PAYMENT_METHOD_LABELS.CHECK}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama</label>
                                    <textarea
                                        value={paymentForm.description}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                        placeholder="Ödeme açıklaması..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all min-h-[72px] resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bakiye Bilgisi</label>
                                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mevcut</span>
                                            <span className={`text-sm font-black ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                ₺{currentBalance.toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        {paymentForm.amount && (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sonrası</span>
                                                <span className={`text-sm font-black ${(currentBalance + Number(paymentForm.amount)) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    ₺{(currentBalance + Number(paymentForm.amount)).toLocaleString('tr-TR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {paymentError && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                                    <span>{paymentError}</span>
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 px-6 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handlePaymentSave}
                                disabled={paymentSaving}
                                className="flex-1 px-6 py-3.5 bg-[#10B981] text-white rounded-2xl hover:bg-[#059669] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#10B981]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {paymentSaving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bakiye Düzeltme Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center">
                                    <Scale size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-800 tracking-tight">Bakiye Düzeltme</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{company.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* Duzeltme yonu: Alim (borc artar, bakiye azalir) / Odeme (borc azalir, bakiye artar) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Düzeltme Türü</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, direction: 'alim' })}
                                        className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-2xl border-2 transition-all text-left ${adjustForm.direction === 'alim' ? 'bg-red-50 border-red-400 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <span className={`text-sm font-black ${adjustForm.direction === 'alim' ? 'text-red-600' : 'text-gray-600'}`}>Alım · Borç</span>
                                        <span className="text-[10px] font-bold text-gray-400">Bakiye azalır ↓</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, direction: 'odeme' })}
                                        className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-2xl border-2 transition-all text-left ${adjustForm.direction === 'odeme' ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <span className={`text-sm font-black ${adjustForm.direction === 'odeme' ? 'text-green-600' : 'text-gray-600'}`}>Ödeme · Alacak</span>
                                        <span className="text-[10px] font-bold text-gray-400">Bakiye artar ↑</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tutar (₺)</label>
                                    <input
                                        type="number"
                                        value={adjustForm.amount}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                                    <DatePicker
                                        value={adjustForm.date}
                                        onChange={(v) => setAdjustForm({ ...adjustForm, date: v })}
                                        icon="event"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama</label>
                                <textarea
                                    value={adjustForm.description}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                                    placeholder="Bakiye Düzeltme"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 transition-all min-h-[64px] resize-none"
                                />
                            </div>

                            {/* Onizleme: mevcut -> duzeltme (yon) -> yeni bakiye (Borclu/Alacakli) */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mevcut Bakiye</span>
                                    <span className={`text-sm font-black ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        ₺{currentBalance.toLocaleString('tr-TR')}
                                    </span>
                                </div>
                                {adjValid && (
                                    <>
                                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-200">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {adjustForm.direction === 'alim' ? 'Alım (Borç)' : 'Ödeme (Alacak)'}
                                            </span>
                                            <span className={`text-sm font-black ${adjustForm.direction === 'odeme' ? 'text-green-600' : 'text-red-500'}`}>
                                                {adjustForm.direction === 'odeme' ? '+' : '−'} ₺{adjAmountNum.toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-200">
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Yeni Bakiye</span>
                                            <span className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${adjNewBalance < 0 ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                                                    {adjNewBalance < 0 ? 'Borçlu' : 'Alacaklı'}
                                                </span>
                                                <span className={`text-base font-black ${adjNewBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    ₺{adjNewBalance.toLocaleString('tr-TR')}
                                                </span>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {adjustError && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                                    <span>{adjustError}</span>
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="flex-1 px-6 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAdjustSave}
                                disabled={adjustSaving}
                                className="flex-1 px-6 py-3.5 bg-[#F59E0B] text-white rounded-2xl hover:bg-[#D97706] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#F59E0B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {adjustSaving ? 'Kaydediliyor...' : 'Düzeltmeyi Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hareketi Düzenle Modal (sadece transaction; tutar/tarih/açıklama) */}
            {editEntry && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditEntry(null)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#663259] text-white flex items-center justify-center">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-800 tracking-tight">Hareketi Düzenle</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{editEntry.kindLabel}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditEntry(null)} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tutar (₺)</label>
                                    <input
                                        type="number"
                                        value={entryForm.amount}
                                        onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                                    <DatePicker value={entryForm.date} onChange={(v) => setEntryForm({ ...entryForm, date: v })} icon="event" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama</label>
                                <textarea
                                    value={entryForm.description}
                                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                                    placeholder="Açıklama..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all min-h-[64px] resize-none"
                                />
                            </div>
                            {editError && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                                    <span>{editError}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setEditEntry(null)} className="flex-1 px-6 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest">İptal</button>
                            <button onClick={handleEditEntrySave} disabled={editSaving} className="flex-1 px-6 py-3.5 bg-[#663259] text-white rounded-2xl hover:bg-[#4a2340] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20 disabled:opacity-50 disabled:cursor-not-allowed">{editSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme onayi (hareket + fatura) */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={deleteTarget?.source === 'invoice' ? 'Faturayı Sil' : 'Hareketi Sil'}
                message={deleteTarget ? `"${deleteTarget.kindLabel} · ₺${deleteTarget.amount.toLocaleString('tr-TR')}" kaydı silinsin mi? Cari bakiyesi yeniden hesaplanacak.` : ''}
                confirmLabel={deleteSaving ? 'Siliniyor...' : 'Sil'}
                cancelLabel="Vazgeç"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default CompanyDetail;
