import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Download, History } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import BankTransactionModal from '../components/BankTransactionModal';
import BankImportModal from '../components/BankImportModal';
import BankMatchModal from '../components/BankMatchModal';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { useBankAccountStore } from '../stores/useBankAccountStore';
import { useBankTransactionStore } from '../stores/useBankTransactionStore';
import { BankTransaction } from '../services/bankTransactionService';
import { useFinanceStore } from '../../../stores/useFinanceStore';
import PageToolbar from '../../../components/PageToolbar';
import EInvoiceIntegrationModal from '../components/EInvoiceIntegrationModal';
import * as XLSX from 'xlsx';

const BankDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { accounts, fetchAccounts } = useBankAccountStore();
    const { transactions, isLoading, fetchTransactions, deleteTransaction, unmatchTransaction } = useBankTransactionStore();
    const { fetchTransactions: fetchFinanceTransactions } = useFinanceStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchingTransaction, setMatchingTransaction] = useState<BankTransaction | null>(null);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [showIntegrationModal, setShowIntegrationModal] = useState(false);

    const account = accounts.find(a => a.id === id);

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (id) {
            fetchTransactions(id);
            fetchFinanceTransactions();
        }
    }, [id]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Date filter
            if (startDate || endDate) {
                const d = new Date(t.date + 'T00:00:00');
                const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
                const end = endDate ? new Date(endDate + 'T00:00:00') : new Date(8640000000000000);
                if (d < start || d > end) return false;
            }
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const desc = (t.description || '').toLowerCase();
                const ref = (t.reference || '').toLowerCase();
                if (!desc.includes(q) && !ref.includes(q)) return false;
            }
            return true;
        });
    }, [transactions, startDate, endDate, searchQuery]);

    const periodTotals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else acc.expense += t.amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);

    const periodNet = periodTotals.income - periodTotals.expense;

    const handleAddTransaction = () => {
        setEditingTransaction(null);
        setShowTransactionModal(true);
    };

    const handleEditTransaction = (tx: BankTransaction) => {
        setEditingTransaction(tx);
        setShowTransactionModal(true);
    };

    const handleOpenMatch = (tx: BankTransaction) => {
        setMatchingTransaction(tx);
        setShowMatchModal(true);
    };

    const handleExportExcel = () => {
        const data = filteredTransactions.map(t => ({
            'Tarih': t.date,
            'Açıklama': t.description || '',
            'Tür': t.type === 'income' ? 'Gelir' : 'Gider',
            'Tutar': t.amount,
            'Bakiye Sonrası': t.balance_after ?? '',
            'Referans': t.reference || '',
            'Eşleşme': t.matched_transaction_id ? 'Eşleşmiş' : 'Eşleşmemiş',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Banka Hareketleri');
        XLSX.writeFile(wb, `${account?.name || 'Banka'}_Hareketleri.xlsx`);
    };

    if (!account) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 font-bold">Hesap bulunamadı.</p>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return `${account.currency}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <PageToolbar
                icon="account_balance"
                title={account.name}
                stats={account.iban || 'IBAN girilmemiş'}
                actions={
                    <>
                        <button
                            onClick={() => setShowIntegrationModal(true)}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            <span className="material-symbols-outlined text-[17px]">integration_instructions</span>
                            Entegrasyon
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            <span className="material-symbols-outlined text-[17px]">upload_file</span>
                            Excel Aktar
                        </button>
                        <button
                            onClick={handleAddTransaction}
                            className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                            style={{ background: '#663259' }}
                        >
                            <Plus size={16} />
                            Hareket Ekle
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            <Download size={14} />
                            Excel
                        </button>
                    </>
                }
            />

            <div className="flex-1 overflow-hidden flex gap-6 px-5 py-4">
                {/* Left Sidebar */}
                <div className="w-[280px] flex flex-col gap-4 shrink-0 h-full overflow-y-auto pr-2 custom-scrollbar pb-4">
                    {/* Bank Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-100 shadow-inner" style={{ color: account.color }}>
                                <span className="material-symbols-outlined text-[20px]">account_balance</span>
                            </div>
                            <h3 className="font-black text-gray-800 text-sm leading-tight uppercase tracking-tight">Hesap Bilgileri</h3>
                        </div>

                        <div className="space-y-2.5">
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[15px] text-gray-400 mt-0.5">badge</span>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Kısa Kod</p>
                                    <p className="text-xs font-bold text-gray-700">{account.code}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[15px] text-gray-400 mt-0.5">credit_card</span>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">IBAN</p>
                                    <p className="text-[10px] font-bold text-gray-700 font-mono">{account.iban || '—'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[15px] text-gray-400 mt-0.5">currency_exchange</span>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Para Birimi</p>
                                    <p className="text-xs font-bold text-gray-700">{account.currency}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[15px] text-gray-400 mt-0.5">toggle_on</span>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Durum</p>
                                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${account.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                        {account.status === 'active' ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shrink-0">
                        <h3 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-400">
                            <span className="material-symbols-outlined text-[12px]">query_stats</span>
                            Dönem Özeti
                        </h3>

                        <div className="space-y-2">
                            {/* Account Balance */}
                            <div className="p-3 bg-[#663259]/5 rounded-xl border border-[#663259]/10">
                                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Hesap Bakiyesi</p>
                                <p className="text-xl font-black tracking-tight text-[#663259]">
                                    {formatCurrency(account.balance)}
                                </p>
                            </div>

                            {/* Total Income */}
                            <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[14px] text-emerald-500">arrow_downward</span>
                                    </div>
                                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Toplam Gelir</p>
                                </div>
                                <p className="text-sm font-black text-emerald-600">{formatCurrency(periodTotals.income)}</p>
                            </div>

                            {/* Total Expense */}
                            <div className="flex items-center justify-between p-2.5 bg-red-50/60 rounded-xl border border-red-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[14px] text-red-500">arrow_upward</span>
                                    </div>
                                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Toplam Gider</p>
                                </div>
                                <p className="text-sm font-black text-red-600">{formatCurrency(periodTotals.expense)}</p>
                            </div>

                            {/* Period Net */}
                            <div className={`p-3 rounded-xl border ${periodNet >= 0 ? 'bg-emerald-50/60 border-emerald-100/50' : 'bg-red-50/60 border-red-100/50'}`}>
                                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Dönem Net</p>
                                <div className="flex items-end justify-between">
                                    <p className={`text-xl font-black tracking-tight ${periodNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(periodNet)}
                                    </p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${periodNet >= 0 ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                                        {periodNet >= 0 ? 'Pozitif' : 'Negatif'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Stats */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shrink-0">
                        <h3 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-400">
                            <span className="material-symbols-outlined text-[12px]">analytics</span>
                            İşlem İstatistikleri
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">Toplam Hareket</span>
                                <span className="text-xs font-black text-gray-800">{filteredTransactions.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">Eşleşmiş</span>
                                <span className="text-xs font-black text-emerald-600">{filteredTransactions.filter(t => t.matched_transaction_id).length}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">Eşleşmemiş</span>
                                <span className="text-xs font-black text-amber-600">{filteredTransactions.filter(t => !t.matched_transaction_id).length}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">İçe Aktarılan</span>
                                <span className="text-xs font-black text-blue-600">{filteredTransactions.filter(t => t.is_imported).length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Transaction Table */}
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Filter Bar */}
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

                        {/* Search */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Açıklamada ara..."
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-700 w-48 focus:outline-none focus:border-[#663259]/30 focus:ring-1 focus:ring-[#663259]/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tarih</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Açıklama</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tür</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Tutar</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Bakiye</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Eşleşme</th>
                                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-[#663259]/[0.02] transition-colors group">
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-bold text-gray-700">{t.date}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {t.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-gray-600 group-hover:text-[#663259] transition-colors block truncate max-w-[200px]">{t.description || '—'}</span>
                                                    {t.reference && (
                                                        <span className="text-[9px] text-gray-400 font-medium">Ref: {t.reference}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {t.type === 'income' ? 'Gelir' : 'Gider'}
                                            </span>
                                            {t.is_imported === 1 && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-blue-50 text-blue-500">İmport</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {t.type === 'income' ? '+' : '-'} {account.currency}{t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {t.balance_after != null ? (
                                                <span className="text-xs font-black text-gray-800 tracking-tight">
                                                    {account.currency}{t.balance_after.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {t.matched_transaction_id ? (
                                                <button
                                                    onClick={() => unmatchTransaction(t.id)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                                                    title="Eşleşmeyi kaldır"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Eşleşmiş
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenMatch(t)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">link</span>
                                                    Eşle
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditTransaction(t)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#663259]"
                                                    title="Düzenle"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeletingTransactionId(t.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                                    title="Sil"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {!isLoading && filteredTransactions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                                <History size={64} className="opacity-10 mb-4" />
                                <p className="text-lg font-bold">Kayıt Bulunamadı</p>
                                <p className="text-sm">
                                    {transactions.length === 0
                                        ? 'Henüz hareket eklenmemiş. Excel\'den içe aktarabilir veya manuel ekleyebilirsiniz.'
                                        : 'Seçilen filtrelere uygun hareket bulunmamaktadır.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Gelir</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Gider</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-200" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Eşleşmiş</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mr-4">Dönem Net</span>
                            <span className={`text-xl font-black ${periodNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatCurrency(periodNet)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <BankTransactionModal
                isOpen={showTransactionModal}
                onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
                accountId={id || ''}
                editTransaction={editingTransaction}
            />

            <BankImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                accountId={id || ''}
                onImportComplete={() => { if (id) fetchTransactions(id); }}
            />

            <BankMatchModal
                isOpen={showMatchModal}
                onClose={() => { setShowMatchModal(false); setMatchingTransaction(null); }}
                bankTransaction={matchingTransaction}
            />

            <ConfirmationModal
                isOpen={!!deletingTransactionId}
                onCancel={() => setDeletingTransactionId(null)}
                onConfirm={async () => {
                    if (deletingTransactionId) {
                        await deleteTransaction(deletingTransactionId);
                        setDeletingTransactionId(null);
                    }
                }}
                title="Hareketi Sil"
                message="Bu banka hareketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Sil"
                cancelText="İptal"
            />

            <EInvoiceIntegrationModal
                isOpen={showIntegrationModal}
                onClose={() => setShowIntegrationModal(false)}
            />
        </div>
    );
};

export default BankDetail;
