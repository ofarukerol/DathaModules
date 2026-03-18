import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBankStore } from '../stores/useBankStore';
import { useCheckStore } from '../stores/useCheckStore';
import { useFinanceStore } from '../../../stores/useFinanceStore';
import { financeService } from '../services/financeService';
import { formatCurrency, formatDate } from '../../_shared/helpers';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PageToolbar from '../../../components/PageToolbar';
import FinanceTransactionModal from '../components/FinanceTransactionModal';
import type { BankTransactionType, CheckType, CheckStatus, CheckNote } from '../types';

// ============ HELPERS ============

const BANK_THEME: Record<string, { abbr: string; color: string }> = {
    'Yapı Kredi': { abbr: 'YKB', color: '#003F7F' },
    'Akbank': { abbr: 'AKB', color: '#E30613' },
    'Garanti BBVA': { abbr: 'GAR', color: '#008246' },
    'Ziraat Bankası': { abbr: 'ZRT', color: '#ED1C24' },
    'İş Bankası': { abbr: 'İŞB', color: '#003399' },
    'Halkbank': { abbr: 'HLK', color: '#004E9E' },
    'Vakıfbank': { abbr: 'VKF', color: '#D4A017' },
    'QNB Finansbank': { abbr: 'QNB', color: '#780078' },
    'Denizbank': { abbr: 'DNZ', color: '#003370' },
    'TEB': { abbr: 'TEB', color: '#00A651' },
    'ING': { abbr: 'ING', color: '#FF6200' },
    'HSBC': { abbr: 'HSBC', color: '#DB0011' },
    'Enpara': { abbr: 'ENP', color: '#FF6B00' },
    'Papara': { abbr: 'PPR', color: '#663299' },
};

function getBankTheme(bankName: string) {
    return BANK_THEME[bankName] || { abbr: bankName.substring(0, 3).toUpperCase(), color: '#6B7280' };
}

function maskIban(iban?: string): string {
    if (!iban) return '';
    const clean = iban.replace(/\s/g, '');
    if (clean.length < 10) return iban;
    return `${clean.substring(0, 4)} ${clean.substring(4, 8)} ... ${clean.substring(clean.length - 4)}`;
}

function formatTxTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - txDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const TX_ICON_MAP: Record<BankTransactionType, { icon: string; bg: string; text: string }> = {
    WITHDRAWAL: { icon: 'shopping_cart', bg: 'bg-red-100', text: 'text-red-600' },
    DEPOSIT: { icon: 'arrow_downward', bg: 'bg-green-100', text: 'text-green-600' },
    TRANSFER: { icon: 'swap_horiz', bg: 'bg-blue-100', text: 'text-blue-600' },
};

const CHECK_TYPE_LABEL: Record<CheckType, string> = {
    CHECK_RECEIVED: 'Alınan Çek', CHECK_ISSUED: 'Verilen Çek',
    NOTE_RECEIVED: 'Alınan Senet', NOTE_ISSUED: 'Verilen Senet',
};

const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
    PENDING: 'Beklemede', DEPOSITED: 'Bankaya Verildi', CASHED: 'Tahsil Edildi',
    BOUNCED: 'Karşılıksız', ENDORSED: 'Ciro Edildi', CANCELLED: 'İptal',
};

const CHECK_STATUS_STYLE: Record<CheckStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    DEPOSITED: 'bg-blue-50 text-blue-700',
    CASHED: 'bg-emerald-50 text-emerald-700',
    BOUNCED: 'bg-red-50 text-red-700',
    ENDORSED: 'bg-purple-50 text-purple-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
};

type ActiveTab = 'gelir-gider' | 'bankalar' | 'cek-senet';

// ============ BANKA OPTIONS ============

const bankOptions = [
    { value: 'Ziraat Bankası', label: 'Ziraat Bankası' },
    { value: 'Garanti BBVA', label: 'Garanti BBVA' },
    { value: 'İş Bankası', label: 'İş Bankası' },
    { value: 'Yapı Kredi', label: 'Yapı Kredi' },
    { value: 'Akbank', label: 'Akbank' },
    { value: 'Halkbank', label: 'Halkbank' },
    { value: 'Vakıfbank', label: 'Vakıfbank' },
    { value: 'QNB Finansbank', label: 'QNB Finansbank' },
    { value: 'Denizbank', label: 'Denizbank' },
    { value: 'TEB', label: 'TEB' },
    { value: 'ING', label: 'ING' },
    { value: 'HSBC', label: 'HSBC' },
    { value: 'Enpara', label: 'Enpara' },
    { value: 'Papara', label: 'Papara' },
];

// ============ MAIN COMPONENT ============

export default function Banks() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ActiveTab>('gelir-gider');
    const [showAllAccounts, setShowAllAccounts] = useState(false);
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    const [financeModalType, setFinanceModalType] = useState<'income' | 'expense'>('income');

    const openFinanceModal = (type: 'income' | 'expense') => {
        setFinanceModalType(type);
        setShowFinanceModal(true);
    };

    // Bank store
    const {
        accounts, recentTransactions, monthlyDeposits, monthlyWithdrawals,
        loading, fetchAccounts, addAccount, deleteAccount,
        fetchRecentTransactions, fetchMonthlyStats,
    } = useBankStore();

    // Check store
    const {
        checks, stats: checkStats, loading: checksLoading,
        fetchChecks, fetchStats: fetchCheckStats, addCheck,
    } = useCheckStore();

    // Finance store
    const {
        transactions: financeTransactions, summary: financeSummary,
        setFilters: setFinanceFilters,
    } = useFinanceStore();

    // Date range presets
    type DatePreset = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month';
    const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>('today');

    const getDateRange = (preset: DatePreset): { from: string; to: string } => {
        const now = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const today = fmt(now);

        switch (preset) {
            case 'today':
                return { from: today, to: today };
            case 'this_week': {
                const day = now.getDay();
                const monday = new Date(now);
                monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return { from: fmt(monday), to: fmt(sunday) };
            }
            case 'last_week': {
                const day = now.getDay();
                const thisMonday = new Date(now);
                thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                const lastMonday = new Date(thisMonday);
                lastMonday.setDate(thisMonday.getDate() - 7);
                const lastSunday = new Date(lastMonday);
                lastSunday.setDate(lastMonday.getDate() + 6);
                return { from: fmt(lastMonday), to: fmt(lastSunday) };
            }
            case 'this_month': {
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return { from: fmt(first), to: fmt(last) };
            }
            case 'last_month': {
                const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const last = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: fmt(first), to: fmt(last) };
            }
        }
    };

    const datePresets: { key: DatePreset; label: string }[] = [
        { key: 'today', label: 'Bugün' },
        { key: 'this_week', label: 'Bu Hafta' },
        { key: 'last_week', label: 'Geçen Hafta' },
        { key: 'this_month', label: 'Bu Ay' },
        { key: 'last_month', label: 'Geçen Ay' },
    ];

    // Lokal tarih aralığı — tüm tab'lar için ortak
    const [localDateFrom, setLocalDateFrom] = useState('');
    const [localDateTo, setLocalDateTo] = useState('');

    const applyDatePreset = (preset: DatePreset) => {
        setActiveDatePreset(preset);
        const range = getDateRange(preset);
        setLocalDateFrom(range.from);
        setLocalDateTo(range.to);
        setFinanceFilters({ dateFrom: range.from, dateTo: range.to });
    };

    // Custom date range
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    const applyCustomRange = (from: string, to: string) => {
        setCustomDateFrom(from);
        setCustomDateTo(to);
        if (from || to) {
            setActiveDatePreset('' as DatePreset);
            setLocalDateFrom(from);
            setLocalDateTo(to);
            setFinanceFilters({ dateFrom: from, dateTo: to });
        }
    };

    // Chart state
    const [chartYear, setChartYear] = useState(String(new Date().getFullYear()));
    const [monthlyData, setMonthlyData] = useState<{ month: number; income: number; expense: number }[]>(
        Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }))
    );

    // Bank form
    const [showBankModal, setShowBankModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [bankForm, setBankForm] = useState({ name: '', bank_name: '', iban: '', currency: 'TRY', balance: '' });

    // Check form
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [checkForm, setCheckForm] = useState({
        type: 'CHECK_RECEIVED' as CheckType, company_name: '', amount: '', currency: 'TRY',
        issue_date: '', due_date: '', bank_name: '', check_number: '', notes: '',
    });


    useEffect(() => {
        fetchAccounts();
        fetchRecentTransactions();
        fetchMonthlyStats();
        fetchChecks();
        fetchCheckStats();
        // Gelir-Gider: varsayılan olarak "bugün" filtresiyle başla
        applyDatePreset('today');
    }, []);

    // Chart data fetch
    useEffect(() => {
        financeService.getMonthlyBreakdown(Number(chartYear)).then(setMonthlyData);
    }, [chartYear]);

    // Bankalar tab: tarih aralığına göre filtrelenmiş işlemler
    const filteredBankTransactions = useMemo(() => {
        if (!localDateFrom && !localDateTo) return recentTransactions;
        return recentTransactions.filter(tx => {
            const txDate = tx.date.split('T')[0];
            if (localDateFrom && txDate < localDateFrom) return false;
            if (localDateTo && txDate > localDateTo) return false;
            return true;
        });
    }, [recentTransactions, localDateFrom, localDateTo]);

    // Çek/Senet tab: tarih aralığına göre filtrelenmiş çekler (vade tarihine göre)
    const filteredChecks = useMemo(() => {
        if (!localDateFrom && !localDateTo) return checks;
        return checks.filter(ch => {
            const dueDate = ch.due_date.split('T')[0];
            if (localDateFrom && dueDate < localDateFrom) return false;
            if (localDateTo && dueDate > localDateTo) return false;
            return true;
        });
    }, [checks, localDateFrom, localDateTo]);

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalMonthly = monthlyDeposits + monthlyWithdrawals;
    const depositPercent = totalMonthly > 0 ? Math.round((monthlyDeposits / totalMonthly) * 100) : 0;
    const withdrawalPercent = totalMonthly > 0 ? Math.round((monthlyWithdrawals / totalMonthly) * 100) : 0;

    const handleAddBank = async () => {
        if (!bankForm.name.trim() || !bankForm.bank_name.trim()) return;
        await addAccount({
            name: bankForm.name, bank_name: bankForm.bank_name,
            iban: bankForm.iban || undefined, currency: bankForm.currency,
            balance: parseFloat(bankForm.balance) || 0,
        });
        setShowBankModal(false);
        setBankForm({ name: '', bank_name: '', iban: '', currency: 'TRY', balance: '' });
        fetchMonthlyStats();
    };

    const handleAddCheck = async () => {
        if (!checkForm.amount || !checkForm.issue_date || !checkForm.due_date) return;
        await addCheck({
            type: checkForm.type, amount: parseFloat(checkForm.amount),
            currency: checkForm.currency, issue_date: checkForm.issue_date,
            due_date: checkForm.due_date, bank_name: checkForm.bank_name || undefined,
            check_number: checkForm.check_number || undefined, notes: checkForm.notes || undefined,
        });
        setShowCheckModal(false);
        setCheckForm({ type: 'CHECK_RECEIVED', company_name: '', amount: '', currency: 'TRY', issue_date: '', due_date: '', bank_name: '', check_number: '', notes: '' });
    };

    // Tab butonları
    const tabs: { key: ActiveTab; label: string; icon: string }[] = [
        { key: 'gelir-gider', label: 'Gelir-Gider', icon: 'query_stats' },
        { key: 'bankalar', label: 'Bankalar', icon: 'account_balance' },
        { key: 'cek-senet', label: 'Çek/Senet', icon: 'payments' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <FinanceTransactionModal
                isOpen={showFinanceModal}
                onClose={() => setShowFinanceModal(false)}
                type={financeModalType}
            />
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                <PageToolbar
                    icon="account_balance_wallet"
                    title="Hesaplar"
                    stats="Tüm finansal varlıklarınızı tek yerden kontrol edin"
                    actions={
                        <>
                            {activeTab === 'bankalar' && (
                                <button onClick={() => setShowBankModal(true)}
                                    className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                                    style={{ background: '#663259' }}>
                                    <span className="material-symbols-outlined text-[17px]">add</span>
                                    Yeni Hesap
                                </button>
                            )}
                            {activeTab === 'cek-senet' && (
                                <button onClick={() => setShowCheckModal(true)}
                                    className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                                    style={{ background: '#663259' }}>
                                    <span className="material-symbols-outlined text-[17px]">add</span>
                                    Yeni Çek/Senet
                                </button>
                            )}
                        </>
                    }
                />

                {/* Tabs */}
                <div className="relative flex items-center bg-gray-100/80 rounded-2xl p-1.5 shrink-0 w-fit">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative z-10 flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-white text-[#663259] shadow-md shadow-black/5'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[20px] transition-colors duration-200 ${isActive ? 'text-[#F97171]' : ''}`}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97171] ml-0.5" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ============ TAB CONTENT ============ */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">

                    {/* ======== BANKALAR TAB ======== */}
                    {activeTab === 'bankalar' && (
                        <>
                            {/* Tarih Filtre Barı */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-[#663259]/10 flex items-center justify-center text-[#663259]">
                                        <span className="material-symbols-outlined text-[20px]">date_range</span>
                                    </div>
                                    <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
                                        {datePresets.map((p) => (
                                            <button
                                                key={p.key}
                                                onClick={() => { applyDatePreset(p.key); setCustomDateFrom(''); setCustomDateTo(''); }}
                                                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                                    activeDatePreset === p.key
                                                        ? 'bg-white text-[#663259] shadow-sm'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateFrom}
                                            onChange={(v) => applyCustomRange(v, customDateTo || v)}
                                            placeholder="Başlangıç"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                    <span className="text-gray-300 text-sm">—</span>
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateTo}
                                            onChange={(v) => applyCustomRange(customDateFrom || v, v)}
                                            placeholder="Bitiş"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* İstatistik Kartları */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-[#F97171]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <span className="material-symbols-outlined text-[#F97171] text-[24px]">account_balance_wallet</span>
                                            </div>
                                            {accounts.length > 0 && (
                                                <span className="flex items-center text-emerald-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-md">
                                                    <span className="material-symbols-outlined text-[16px] mr-1">account_balance</span>
                                                    {accounts.length} hesap
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Toplam Bakiye</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(totalBalance)}</p>
                                        <p className="text-xs text-gray-400 mt-2">Tüm hesapların toplamı</p>
                                    </div>
                                </div>
                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm"><span className="material-symbols-outlined text-emerald-500 text-[24px]">arrow_downward</span></div>
                                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Bu Ay</span>
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Gelen Transferler</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(monthlyDeposits)}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${depositPercent}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm"><span className="material-symbols-outlined text-amber-500 text-[24px]">arrow_upward</span></div>
                                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Bu Ay</span>
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Giden Ödemeler</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(monthlyWithdrawals)}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                            <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${withdrawalPercent}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hesaplar + İşlemler */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-gray-800">Aktif Hesaplar</h3>
                                        {accounts.length > 3 && !showAllAccounts && (
                                            <button onClick={() => setShowAllAccounts(true)} className="text-sm text-[#F97171] font-medium hover:text-[#E05A5A] transition-colors flex items-center gap-1">
                                                Tümünü Gör ({accounts.length}) <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </button>
                                        )}
                                    </div>
                                    {accounts.length === 0 && !loading ? (
                                        <div className="bg-white p-8 rounded-xl border border-gray-100 text-center">
                                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3 block">account_balance</span>
                                            <p className="text-gray-500 font-medium">Henüz banka hesabı yok</p>
                                            <p className="text-gray-400 text-sm mt-1">Hesaplarınızı ekleyerek başlayın</p>
                                        </div>
                                    ) : (
                                        (showAllAccounts ? accounts : accounts.slice(0, 3)).map((acc) => {
                                            const theme = getBankTheme(acc.bank_name);
                                            return (
                                                <div key={acc.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                                                    onClick={() => navigate(`/finance/banks/${acc.id}`)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: theme.color }}>{theme.abbr}</div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-800">{acc.bank_name} - {acc.name}</h4>
                                                            <p className="text-sm text-gray-500">{maskIban(acc.iban)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="font-bold text-lg text-gray-800">{formatCurrency(acc.balance, acc.currency)}</p>
                                                            {acc.currency !== 'TRY' && acc.balance > 0 ? (
                                                                <p className="text-xs text-gray-400 font-medium">~ {formatCurrency(acc.balance * (acc.currency === 'USD' ? 32.4 : 35.2))}</p>
                                                            ) : (
                                                                <p className="text-xs text-emerald-500 font-medium flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Aktif</p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteId(acc.id); }}
                                                            className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Hesabı Sil"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <button onClick={() => setShowBankModal(true)} className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined">add</span>Yeni Hesap Ekle
                                    </button>
                                </div>

                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-800">Son İşlemler</h3>
                                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{filteredBankTransactions.length} işlem</span>
                                    </div>
                                    {filteredBankTransactions.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-8">
                                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">receipt_long</span>
                                            <p className="text-gray-500 font-medium">Bu tarih aralığında işlem yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 flex-1">
                                            {filteredBankTransactions.map((tx) => {
                                                const txStyle = TX_ICON_MAP[tx.type as BankTransactionType] || TX_ICON_MAP.WITHDRAWAL;
                                                const isIncome = tx.type === 'DEPOSIT';
                                                const accountLabel = tx.account_name ? `${getBankTheme(tx.bank_name || '').abbr} ${tx.account_name}` : tx.bank_name || '';
                                                return (
                                                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-gray-100/50 last:border-0 hover:bg-white/40 px-2 rounded-lg transition-colors -mx-2">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full ${txStyle.bg} flex items-center justify-center ${txStyle.text}`}>
                                                                <span className="material-symbols-outlined text-[20px]">{txStyle.icon}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">{tx.company_name || tx.description || (isIncome ? 'Gelen Transfer' : 'Giden Ödeme')}</p>
                                                                <p className="text-xs text-gray-500">{tx.description && tx.company_name ? tx.description + ' • ' : ''}{formatTxTime(tx.date)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-gray-800'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</p>
                                                            <p className="text-xs text-gray-400">{accountLabel}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <button onClick={() => navigate('/finance/income-expense')} className="mt-4 w-full py-2.5 text-sm text-[#663259] font-medium bg-[#663259]/5 hover:bg-[#663259]/10 rounded-lg transition-colors">
                                        Tüm İşlemleri Görüntüle
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ======== ÇEK/SENET TAB ======== */}
                    {activeTab === 'cek-senet' && (() => {
                        const pendingChecks = filteredChecks.filter(ch => ch.status === 'PENDING');
                        const upcomingChecks = pendingChecks
                            .filter(ch => daysUntil(ch.due_date) >= 0)
                            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                            .slice(0, 5);

                        const totalPortfolio = checkStats.receivedTotal + checkStats.issuedTotal;
                        const receivedPercent = totalPortfolio > 0 ? Math.round((checkStats.receivedTotal / totalPortfolio) * 100) : 0;
                        const issuedPercent = totalPortfolio > 0 ? Math.round((checkStats.issuedTotal / totalPortfolio) * 100) : 0;
                        const duePercent = totalPortfolio > 0 ? Math.min(Math.round((checkStats.dueThisWeekTotal / totalPortfolio) * 100), 100) : 0;

                        const getMonthAbbr = (dateStr: string) => {
                            const months = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
                            return months[new Date(dateStr).getMonth()] || '';
                        };
                        const getDay = (dateStr: string) => new Date(dateStr).getDate();
                        const isReceived = (ch: CheckNote) => ch.type === 'CHECK_RECEIVED' || ch.type === 'NOTE_RECEIVED';

                        const getCheckTypeLabel = (ch: CheckNote) => {
                            if (ch.type === 'CHECK_RECEIVED') return { label: 'Müşteri Çeki', style: 'bg-gray-100 text-gray-600' };
                            if (ch.type === 'CHECK_ISSUED') return { label: 'Kendi Çekimiz', style: 'bg-purple-100 text-purple-700' };
                            if (ch.type === 'NOTE_RECEIVED') return { label: 'Alınan Senet', style: 'bg-gray-100 text-gray-600' };
                            return { label: 'Borç Senedi', style: 'bg-orange-100 text-orange-700' };
                        };

                        return (
                        <>
                            {/* Tarih Filtre Barı */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-[#663259]/10 flex items-center justify-center text-[#663259]">
                                        <span className="material-symbols-outlined text-[20px]">date_range</span>
                                    </div>
                                    <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
                                        {datePresets.map((p) => (
                                            <button
                                                key={p.key}
                                                onClick={() => { applyDatePreset(p.key); setCustomDateFrom(''); setCustomDateTo(''); }}
                                                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                                    activeDatePreset === p.key
                                                        ? 'bg-white text-[#663259] shadow-sm'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateFrom}
                                            onChange={(v) => applyCustomRange(v, customDateTo || v)}
                                            placeholder="Başlangıç"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                    <span className="text-gray-300 text-sm">—</span>
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateTo}
                                            onChange={(v) => applyCustomRange(customDateFrom || v, v)}
                                            placeholder="Bitiş"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3 Özet Kartı */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Alınan Çekler */}
                                <div className="bg-white/65 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <span className="material-symbols-outlined text-emerald-500 text-[24px]">input</span>
                                            </div>
                                            {checkStats.receivedCount > 0 && (
                                                <span className="flex items-center text-emerald-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-md">
                                                    {checkStats.receivedCount} Adet
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Alınan Çekler</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(checkStats.receivedTotal)}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${receivedPercent}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Portföydeki toplam</p>
                                    </div>
                                </div>

                                {/* Verilen Çekler */}
                                <div className="bg-white/65 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <span className="material-symbols-outlined text-amber-500 text-[24px]">output</span>
                                            </div>
                                            {checkStats.issuedCount > 0 ? (
                                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                    {checkStats.issuedCount} Adet
                                                </span>
                                            ) : null}
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Verilen Çekler</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(checkStats.issuedTotal)}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                            <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${issuedPercent}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Ödenecek toplam</p>
                                    </div>
                                </div>

                                {/* Vadesi Gelenler */}
                                <div className="bg-white/65 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-[#F97171]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <span className="material-symbols-outlined text-[#F97171] text-[24px]">event_busy</span>
                                            </div>
                                            <span className="text-xs font-bold text-white bg-[#F97171] px-2 py-1 rounded-md">
                                                Bu Hafta
                                            </span>
                                        </div>
                                        <h3 className="text-gray-500 text-sm font-medium mb-1">Vadesi Gelenler</h3>
                                        <p className="text-3xl font-bold text-gray-800 tracking-tight">{formatCurrency(checkStats.dueThisWeekTotal)}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                                            <div className="bg-[#F97171] h-1.5 rounded-full transition-all duration-500" style={{ width: `${duePercent}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Acil ödemeler/tahsilatlar</p>
                                    </div>
                                </div>
                            </div>

                            {/* İki Sütunlu Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Sol: Yaklaşan Ödemeler */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-gray-800">Yaklaşan Ödemeler</h3>
                                        <button className="text-sm text-[#F97171] font-medium hover:text-[#E05A5A] transition-colors flex items-center gap-1">
                                            Takvim Görünümü <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                        </button>
                                    </div>

                                    <div className="bg-white/65 backdrop-blur-sm rounded-xl shadow-sm border border-white/80 overflow-hidden">
                                        {upcomingChecks.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3 block">event_available</span>
                                                <p className="text-gray-500 font-medium">Yaklaşan ödeme yok</p>
                                                <p className="text-gray-400 text-sm mt-1">Vadesi yaklaşan çek/senet bulunmuyor</p>
                                            </div>
                                        ) : (
                                            upcomingChecks.map((ch, idx) => {
                                                const days = daysUntil(ch.due_date);
                                                const isRcv = isReceived(ch);
                                                const dateBg = days <= 3 ? 'bg-[#F97171]/10 text-[#F97171]' : days <= 7 ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-emerald-600';
                                                const badgeBg = days <= 3
                                                    ? 'text-red-500 bg-red-50 border-red-100'
                                                    : days <= 7
                                                        ? 'text-amber-600 bg-orange-50 border-orange-100'
                                                        : 'text-emerald-600 bg-green-50 border-green-100';
                                                return (
                                                    <div key={ch.id} className={`p-4 flex items-center justify-between bg-white/50 ${idx < upcomingChecks.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${dateBg} w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs leading-none`}>
                                                                <span className="text-[10px]">{getMonthAbbr(ch.due_date)}</span>
                                                                <span className="text-lg">{getDay(ch.due_date)}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 text-sm">{ch.company_name || ch.bank_name || CHECK_TYPE_LABEL[ch.type]}</h4>
                                                                <p className="text-xs text-gray-500">{ch.check_number ? `Çek No: ${ch.check_number}` : ch.type.includes('NOTE') ? 'Senet' : 'Çek'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`block font-bold ${isRcv ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                                {isRcv ? '+' : '-'}{formatCurrency(ch.amount, ch.currency)}
                                                            </span>
                                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                                                {isRcv ? 'Tahsilat' : `${days} Gün Kaldı`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Nakite Dönüşüm Oranı */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                <span className="material-symbols-outlined text-[20px]">query_stats</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm">Nakite Dönüşüm Oranı</h4>
                                                <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1.5">
                                                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${checkStats.cashConversionRate}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-blue-600">%{checkStats.cashConversionRate}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sağ: Portföy Listesi */}
                                <div id="cek-portfolio" className="bg-white/65 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-white/80 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-800">Portföy Listesi</h3>
                                        <div className="flex gap-2">
                                            <button className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-500" title="Filtrele">
                                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                            </button>
                                            <button className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-500" title="Diğer">
                                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                            </button>
                                        </div>
                                    </div>

                                    {filteredChecks.length === 0 && !checksLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-8">
                                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">payments</span>
                                            <p className="text-gray-500 font-medium">Bu tarih aralığında çek/senet yok</p>
                                            <p className="text-gray-400 text-sm mt-1">Farklı bir tarih aralığı deneyin</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 flex-1">
                                            {filteredChecks.slice(0, 6).map((ch) => {
                                                const theme = ch.bank_name ? getBankTheme(ch.bank_name) : { abbr: ch.type.includes('NOTE') ? 'SEN' : 'ÇEK', color: '#6B7280' };
                                                const typeInfo = getCheckTypeLabel(ch);
                                                const isRcv = isReceived(ch);
                                                return (
                                                    <div key={ch.id} className="flex items-center justify-between py-3 border-b border-gray-100/50 last:border-0 hover:bg-white/40 px-2 rounded-lg transition-colors -mx-2 group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0" style={{ color: theme.color }}>
                                                                <span className="font-bold text-xs">{theme.abbr}</span>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-gray-800">{ch.bank_name || ch.company_name || CHECK_TYPE_LABEL[ch.type]}</p>
                                                                    <span className={`${typeInfo.style} text-[10px] px-1.5 py-0.5 rounded font-medium`}>{typeInfo.label}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    Vade: {formatDate(ch.due_date)}
                                                                    {ch.company_name && ch.bank_name ? ` • ${isRcv ? 'Keşideci' : 'Hamil'}: ${ch.company_name}` : ''}
                                                                    {ch.endorser ? ` • Ciro: ${ch.endorser}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-gray-800">{formatCurrency(ch.amount, ch.currency)}</p>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CHECK_STATUS_STYLE[ch.status]}`}>
                                                                {CHECK_STATUS_LABEL[ch.status]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {filteredChecks.length > 6 && (
                                        <button className="mt-4 w-full py-2.5 text-sm text-[#663259] font-medium bg-[#663259]/5 hover:bg-[#663259]/10 rounded-lg transition-colors flex items-center justify-center gap-2">
                                            Tüm Portföyü Görüntüle <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                        );
                    })()}

                    {/* ======== GELİR-GİDER TAB ======== */}
                    {activeTab === 'gelir-gider' && (() => {
                        const currentMonth = new Date().getMonth();
                        const maxChartValue = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);
                        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

                        const expenseTransactions = financeTransactions.filter(t => t.type === 'EXPENSE').slice(0, 5);
                        const incomeTransactions = financeTransactions.filter(t => t.type === 'INCOME').slice(0, 5);

                        const formatK = (val: number) => {
                            if (val >= 1000) return `${Math.round(val / 1000)}k`;
                            return String(Math.round(val));
                        };

                        return (
                        <>
                            {/* Tarih Filtre Barı */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-[#663259]/10 flex items-center justify-center text-[#663259]">
                                        <span className="material-symbols-outlined text-[20px]">date_range</span>
                                    </div>
                                    <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
                                        {datePresets.map((p) => (
                                            <button
                                                key={p.key}
                                                onClick={() => { applyDatePreset(p.key); setCustomDateFrom(''); setCustomDateTo(''); }}
                                                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                                    activeDatePreset === p.key
                                                        ? 'bg-white text-[#663259] shadow-sm'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateFrom}
                                            onChange={(v) => applyCustomRange(v, customDateTo || v)}
                                            placeholder="Başlangıç"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                    <span className="text-gray-300 text-sm">—</span>
                                    <div className="w-36">
                                        <DatePicker
                                            value={customDateTo}
                                            onChange={(v) => applyCustomRange(customDateFrom || v, v)}
                                            placeholder="Bitiş"
                                            icon="event"
                                            compact
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Grafik + Özet Kartı */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex gap-8" style={{ minHeight: '300px' }}>
                                {/* Sol: 3 Özet */}
                                <div className="w-1/4 flex flex-col gap-4 justify-center shrink-0">
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[28px]">trending_up</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500 font-medium">Toplam Gelir</p>
                                            <p className="text-2xl font-bold text-gray-800 truncate">{formatCurrency(financeSummary.totalIncome)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[28px]">trending_down</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500 font-medium">Toplam Gider</p>
                                            <p className="text-2xl font-bold text-gray-800 truncate">{formatCurrency(financeSummary.totalExpense)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#663259]/5 rounded-2xl p-5 border border-[#663259]/10 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-[#663259] text-white flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-[#663259] font-medium">Net Bakiye</p>
                                            <p className="text-2xl font-bold text-[#663259] truncate">{formatCurrency(financeSummary.netBalance)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sağ: Bar Chart */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-800">Aylık Finansal Denge</h3>
                                        <div className="w-24">
                                            <CustomSelect
                                                options={[
                                                    { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
                                                    { value: String(new Date().getFullYear() - 1), label: String(new Date().getFullYear() - 1) },
                                                ]}
                                                value={chartYear}
                                                onChange={setChartYear}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-end gap-1 pb-8 relative min-h-0">
                                        {/* Y-axis labels */}
                                        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 font-light w-8 pointer-events-none">
                                            <span>{formatK(maxChartValue)}</span>
                                            <span>{formatK(maxChartValue * 0.66)}</span>
                                            <span>{formatK(maxChartValue * 0.33)}</span>
                                            <span>0</span>
                                        </div>

                                        {/* Grid lines */}
                                        <div className="absolute left-8 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                                            <div className="border-t border-dashed border-gray-100 w-full" />
                                            <div className="border-t border-dashed border-gray-100 w-full" />
                                            <div className="border-t border-dashed border-gray-100 w-full" />
                                            <div className="border-t border-gray-200 w-full" />
                                        </div>

                                        {/* Bars */}
                                        <div className="flex-1 flex items-end justify-around ml-8 h-full">
                                            {monthlyData.map((m, i) => {
                                                const isCurrent = i === currentMonth && chartYear === String(new Date().getFullYear());
                                                const isFuture = i > currentMonth && chartYear === String(new Date().getFullYear());
                                                const incH = maxChartValue > 0 ? Math.max((m.income / maxChartValue) * 100, m.income > 0 ? 3 : 0) : 0;
                                                const expH = maxChartValue > 0 ? Math.max((m.expense / maxChartValue) * 100, m.expense > 0 ? 3 : 0) : 0;

                                                return (
                                                    <div key={i} className={`flex gap-[3px] h-full items-end relative group ${isFuture ? 'opacity-30' : ''}`}>
                                                        {/* Income bar */}
                                                        <div className="relative">
                                                            {isCurrent && m.income > 0 && (
                                                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                                                    {formatK(m.income)}
                                                                </div>
                                                            )}
                                                            {!isCurrent && m.income > 0 && (
                                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">
                                                                    {formatK(m.income)}
                                                                </div>
                                                            )}
                                                            <div
                                                                className={`w-[10px] xl:w-3 rounded-t-sm transition-all duration-700 ${
                                                                    isFuture ? 'bg-gray-200' :
                                                                    isCurrent ? 'bg-[#663259] shadow-lg shadow-[#663259]/20' :
                                                                    'bg-[#663259]/70 hover:bg-[#663259]'
                                                                }`}
                                                                style={{ height: `${isFuture ? 8 : incH}%`, minHeight: isFuture ? '4px' : undefined }}
                                                            />
                                                        </div>
                                                        {/* Expense bar */}
                                                        <div className="relative">
                                                            {isCurrent && m.expense > 0 && (
                                                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                                                    {formatK(m.expense)}
                                                                </div>
                                                            )}
                                                            {!isCurrent && m.expense > 0 && (
                                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">
                                                                    {formatK(m.expense)}
                                                                </div>
                                                            )}
                                                            <div
                                                                className={`w-[10px] xl:w-3 rounded-t-sm transition-all duration-700 ${
                                                                    isFuture ? 'bg-gray-200' :
                                                                    isCurrent ? 'bg-[#F97171] shadow-lg shadow-[#F97171]/20' :
                                                                    'bg-[#F97171]/70 hover:bg-[#F97171]'
                                                                }`}
                                                                style={{ height: `${isFuture ? 4 : expH}%`, minHeight: isFuture ? '2px' : undefined }}
                                                            />
                                                        </div>
                                                        {/* Month label */}
                                                        <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap ${
                                                            isCurrent ? 'text-gray-800 font-bold' : 'text-gray-400'
                                                        }`}>
                                                            {monthNames[i]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex items-center justify-center gap-6 mt-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-[#663259]" />
                                            <span className="text-xs text-gray-500 font-medium">Gelir</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-[#F97171]" />
                                            <span className="text-xs text-gray-500 font-medium">Gider</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hızlı İşlemler */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-white/80 p-4 shrink-0">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#663259]/10 flex items-center justify-center text-[#663259]">
                                            <span className="material-symbols-outlined">bolt</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">Hızlı İşlemler</h3>
                                            <p className="text-xs text-gray-500">Sık kullanılan finansal işlemler</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
                                        <button onClick={() => navigate('/finance/invoices')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-[#663259]/30 transition-all text-sm font-medium shadow-sm group">
                                            <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-[#663259] transition-colors">receipt</span>Fatura Öde
                                        </button>
                                        <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden md:block" />
                                        <button onClick={() => openFinanceModal('income')} className="flex items-center gap-2 px-5 py-2.5 bg-[#663259] text-white rounded-lg hover:bg-[#4A235A] transition-all text-sm font-semibold shadow-md hover:shadow-lg active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">add</span>Gelir Ekle
                                        </button>
                                        <button onClick={() => openFinanceModal('expense')} className="flex items-center gap-2 px-5 py-2.5 bg-[#F97171] text-white rounded-lg hover:bg-[#E05A5A] transition-all text-sm font-semibold shadow-md hover:shadow-lg active:scale-95">
                                            <span className="material-symbols-outlined text-[20px]">remove</span>Gider Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* İki Sütun: Son Giderler + Son Gelirler */}
                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
                                {/* Son Giderler */}
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 bg-red-50/40 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white text-red-500 flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined">trending_down</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">Son Giderler</h3>
                                                <p className="text-xs text-gray-500">Personel, Tedarik, Faturalar</p>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate('/finance/income-expense')} className="text-xs font-bold text-red-600 bg-white px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shadow-sm border border-red-100">
                                            Tümünü Gör
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                                        {expenseTransactions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">receipt_long</span>
                                                <p className="text-gray-500 font-medium">Henüz gider kaydı yok</p>
                                                <p className="text-gray-400 text-xs mt-1">Gider ekleyerek başlayın</p>
                                            </div>
                                        ) : (
                                            expenseTransactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 border border-red-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-500 border border-red-100 shrink-0">
                                                            <span className="material-symbols-outlined text-[20px]">{tx.category_icon || 'receipt_long'}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-gray-800 text-sm truncate">{tx.company_name || tx.description || 'Gider'}</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.category_name || tx.description || ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="font-bold text-red-700">- {formatCurrency(tx.amount)}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{formatTxTime(tx.date)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Son Gelirler */}
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 bg-emerald-50/40 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined">trending_up</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">Son Gelirler</h3>
                                                <p className="text-xs text-gray-500">Satışlar, Rezervasyonlar</p>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate('/finance/income-expense')} className="text-xs font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm border border-emerald-100">
                                            Tümünü Gör
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                                        {incomeTransactions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">payments</span>
                                                <p className="text-gray-500 font-medium">Henüz gelir kaydı yok</p>
                                                <p className="text-gray-400 text-xs mt-1">Gelir ekleyerek başlayın</p>
                                            </div>
                                        ) : (
                                            incomeTransactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                                                            <span className="material-symbols-outlined text-[20px]">{tx.category_icon || 'payments'}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-gray-800 text-sm truncate">{tx.company_name || tx.description || 'Gelir'}</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.category_name || tx.description || ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="font-bold text-emerald-700">+ {formatCurrency(tx.amount)}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{formatTxTime(tx.date)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                        );
                    })()}
                </div>
            </div>

            {/* ============ MODALS ============ */}

            {/* Yeni Banka Hesabı Modalı */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Yeni Banka Hesabı</h3>
                            <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined text-gray-400">close</span></button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Banka *</label>
                                <CustomSelect options={bankOptions} value={bankForm.bank_name} onChange={(v) => setBankForm({ ...bankForm, bank_name: v })} placeholder="Banka seçin" icon="account_balance" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Hesap Adı *</label>
                                <input type="text" value={bankForm.name} onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all" placeholder="Ör: Ana İşletme Hesabı" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">IBAN</label>
                                <input type="text" value={bankForm.iban} onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all font-mono" placeholder="TR00 0000 0000 0000 0000 0000 00" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Para Birimi</label>
                                    <CustomSelect options={[{ value: 'TRY', label: '₺ TRY' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }]} value={bankForm.currency} onChange={(v) => setBankForm({ ...bankForm, currency: v })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Açılış Bakiyesi</label>
                                    <input type="number" value={bankForm.balance} onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all" placeholder="0.00" step="0.01" />
                                </div>
                            </div>
                            <button onClick={handleAddBank} disabled={!bankForm.name.trim() || !bankForm.bank_name}
                                className="w-full py-3 bg-[#663259] text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">check</span>Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Yeni Çek/Senet Modalı */}
            {showCheckModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Yeni Çek/Senet</h3>
                            <button onClick={() => setShowCheckModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined text-gray-400">close</span></button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tür *</label>
                                <CustomSelect
                                    options={[
                                        { value: 'CHECK_RECEIVED', label: 'Alınan Çek' },
                                        { value: 'CHECK_ISSUED', label: 'Verilen Çek' },
                                        { value: 'NOTE_RECEIVED', label: 'Alınan Senet' },
                                        { value: 'NOTE_ISSUED', label: 'Verilen Senet' },
                                    ]}
                                    value={checkForm.type} onChange={(v) => setCheckForm({ ...checkForm, type: v as CheckType })}
                                    icon="payments"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tutar *</label>
                                    <input type="number" value={checkForm.amount} onChange={(e) => setCheckForm({ ...checkForm, amount: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all" placeholder="0.00" step="0.01" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Para Birimi</label>
                                    <CustomSelect options={[{ value: 'TRY', label: '₺ TRY' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }]} value={checkForm.currency} onChange={(v) => setCheckForm({ ...checkForm, currency: v })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Düzenleme Tarihi *</label>
                                    <DatePicker value={checkForm.issue_date} onChange={(v) => setCheckForm({ ...checkForm, issue_date: v })} placeholder="Tarih seçin" icon="event" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Vade Tarihi *</label>
                                    <DatePicker value={checkForm.due_date} onChange={(v) => setCheckForm({ ...checkForm, due_date: v })} placeholder="Tarih seçin" icon="event" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Banka</label>
                                    <CustomSelect options={bankOptions} value={checkForm.bank_name} onChange={(v) => setCheckForm({ ...checkForm, bank_name: v })} placeholder="Banka seçin" icon="account_balance" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Çek/Senet No</label>
                                    <input type="text" value={checkForm.check_number} onChange={(e) => setCheckForm({ ...checkForm, check_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all" placeholder="Ör: 123456" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Not</label>
                                <input type="text" value={checkForm.notes} onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all" placeholder="Açıklama..." />
                            </div>
                            <button onClick={handleAddCheck} disabled={!checkForm.amount || !checkForm.issue_date || !checkForm.due_date}
                                className="w-full py-3 bg-[#663259] text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">check</span>Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!deleteId} title="Hesabı Sil" message="Bu banka hesabını ve tüm işlemlerini silmek istediğinize emin misiniz?" confirmLabel="Sil"
                onConfirm={async () => { if (deleteId) await deleteAccount(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
        </div>
    );
}
