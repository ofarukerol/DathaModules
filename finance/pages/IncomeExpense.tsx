import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FinanceTransactionModal from '../components/FinanceTransactionModal';
import { useFinanceStore } from '../../../stores/useFinanceStore';
import { useFinanceCategoryStore } from '../stores/useFinanceCategoryStore';
import { financeService } from '../services/financeService';
import HeaderActions from '../../../components/HeaderActions';

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const formatCurrency = (val: number) => {
    if (val >= 1000) {
        return `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Dün';
    if (diff < 7) return d.toLocaleDateString('tr-TR', { weekday: 'long' });
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

const IncomeExpense: React.FC = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('income');

    const {
        transactions, summary,
        fetchTransactions, fetchSummary
    } = useFinanceStore();

    const { totalIncome, totalExpense } = summary;

    const { categories } = useFinanceCategoryStore();

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [monthlySummary, setMonthlySummary] = useState<{ month: number; income: number; expense: number }[]>([]);

    useEffect(() => {
        fetchTransactions();
        fetchSummary();
    }, []);

    useEffect(() => {
        financeService.getMonthlyBreakdown(selectedYear).then(setMonthlySummary);
    }, [selectedYear]);

    const netBalance = totalIncome - totalExpense;

    const maxChartValue = useMemo(() => {
        const allValues = monthlySummary.flatMap((m: { income: number; expense: number }) => [m.income, m.expense]);
        return Math.max(...allValues, 1);
    }, [monthlySummary]);

    const recentExpenses = useMemo(
        () => transactions.filter(t => t.type === 'EXPENSE').slice(0, 6),
        [transactions]
    );
    const recentIncomes = useMemo(
        () => transactions.filter(t => t.type === 'INCOME').slice(0, 6),
        [transactions]
    );

    const getCategoryIcon = (categoryId: string | undefined) => {
        if (!categoryId) return 'receipt';
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || 'receipt';
    };

    const formatChartLabel = (val: number) => {
        if (val >= 1000) return `${Math.round(val / 1000)}k`;
        return String(Math.round(val));
    };

    const openModal = (type: 'income' | 'expense') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    // Year options
    const yearOptions = useMemo(() => {
        const years: number[] = [];
        for (let y = currentYear; y >= currentYear - 3; y--) years.push(y);
        return years;
    }, [currentYear]);

    // Chart grid lines
    const gridLines = useMemo(() => {
        if (maxChartValue <= 0) return [0];
        const step = Math.ceil(maxChartValue / 3 / 1000) * 1000 || 1;
        const lines: number[] = [];
        for (let v = step * 3; v >= 0; v -= step) lines.push(v);
        return lines;
    }, [maxChartValue]);

    const chartMaxForScale = gridLines[0] || 1;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <FinanceTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                type={modalType}
            />
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
                                <button onClick={() => navigate(-1)} className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0">
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">query_stats</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Gelir & Gider</h1>
                                <p className="text-white/60 text-xs mt-0.5">Finansal analiz</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={() => openModal('expense')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white/90 rounded-xl text-sm font-bold hover:bg-white/20 border border-white/15 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                                Gider Ekle
                            </button>
                            <button
                                onClick={() => openModal('income')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-xl text-sm font-bold hover:bg-white/25 border border-white/20 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Gelir Ekle
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {/* Summary + Chart Row */}
                    <div className="h-[270px] shrink-0 bg-white rounded-3xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex gap-6">
                        {/* Summary Cards */}
                        <div className="w-1/4 flex flex-col gap-3 justify-center">
                            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[24px]">trending_up</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Toplam Gelir</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(totalIncome)}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[24px]">trending_down</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Toplam Gider</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(totalExpense)}</p>
                                </div>
                            </div>
                            <div className="bg-[#663259]/5 rounded-2xl p-3.5 border border-[#663259]/10 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-[#663259] text-white flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                                </div>
                                <div>
                                    <p className="text-xs text-[#663259] font-medium">Net Bakiye</p>
                                    <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-[#663259]' : 'text-red-600'}`}>{formatCurrency(netBalance)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="w-3/4 flex flex-col relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Aylık Finansal Denge</h3>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="form-select bg-gray-50 border-gray-200 text-sm rounded-lg focus:ring-[#663259] focus:border-[#663259]"
                                    >
                                        {yearOptions.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-4 pb-6 border-b border-gray-100 px-4 relative">
                                {/* Grid lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 text-xs text-gray-400 font-light">
                                    {gridLines.map((val, i) => (
                                        <div key={i} className="w-full border-t border-dashed border-gray-100 pt-1">
                                            {formatChartLabel(val)}
                                        </div>
                                    ))}
                                </div>

                                {/* Bars */}
                                {monthlySummary.map((m, i) => {
                                    const isCurrent = selectedYear === currentYear && m.month === currentMonth;
                                    const isFuture = selectedYear === currentYear && m.month > currentMonth;
                                    const incHeight = chartMaxForScale > 0 ? Math.max((m.income / chartMaxForScale) * 100, m.income > 0 ? 3 : 0) : 0;
                                    const expHeight = chartMaxForScale > 0 ? Math.max((m.expense / chartMaxForScale) * 100, m.expense > 0 ? 3 : 0) : 0;

                                    return (
                                        <div key={i} className={`flex gap-1 h-full items-end group relative z-10 w-full justify-center ${isFuture ? 'opacity-40' : ''}`}>
                                            {isFuture ? (
                                                <>
                                                    <div className="w-3 bg-gray-200 rounded-t-sm h-[3%]"></div>
                                                    <div className="w-3 bg-gray-200 rounded-t-sm h-[1%]"></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        className={`w-3 rounded-t-sm transition-all ${isCurrent ? 'bg-[#663259] shadow-lg shadow-[#663259]/20' : 'bg-[#663259]/80 hover:bg-[#663259]'}`}
                                                        style={{ height: `${incHeight}%` }}
                                                    >
                                                        {(isCurrent || m.income > 0) && (
                                                            <div className={`${isCurrent ? '' : 'opacity-0 group-hover:opacity-100'} absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded ${isCurrent ? 'font-bold' : ''} whitespace-nowrap`}>
                                                                {formatChartLabel(m.income)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`w-3 rounded-t-sm transition-all ${isCurrent ? 'bg-[#F97171] shadow-lg shadow-[#F97171]/20' : 'bg-[#F97171]/80 hover:bg-[#F97171]'}`}
                                                        style={{ height: `${expHeight}%` }}
                                                    />
                                                </>
                                            )}
                                            <span className={`absolute -bottom-6 text-xs font-medium ${isCurrent ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
                                                {MONTH_LABELS[i]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#663259]"></span>
                                    <span className="text-xs text-gray-500 font-medium">Gelir</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#F97171]"></span>
                                    <span className="text-xs text-gray-500 font-medium">Gider</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expenses & Incomes Panels */}
                    <div className="flex-1 flex gap-6 overflow-hidden min-h-0 pb-2">
                        {/* Expenses Panel */}
                        <div className="w-1/2 bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-full bg-white text-[#EF4444] flex items-center justify-center shadow-sm border border-red-50">
                                        <span className="material-symbols-outlined text-[24px]">trending_down</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Son Giderler</h3>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">En son eklenen giderler</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/finance/history')} className="text-sm font-bold text-[#DC2626] hover:bg-red-50 px-4 py-2 rounded-xl transition-all">Tümünü Gör</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-3">
                                {recentExpenses.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
                                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-30">receipt_long</span>
                                        <p className="text-sm font-medium">Henüz gider kaydı yok</p>
                                        <p className="text-xs mt-1">Gider eklemek için yukarıdaki butonu kullanın</p>
                                    </div>
                                ) : (
                                    recentExpenses.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between px-6 py-4 rounded-[2rem] bg-[#FFF5F5] border border-[#FECACA] hover:border-red-300 hover:shadow-md transition-all group cursor-default">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#EF4444] shadow-sm border border-red-50 group-hover:scale-105 transition-transform">
                                                    <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(tx.category_id)}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-base">{tx.category_name}</h4>
                                                    {tx.description && <p className="text-xs text-gray-500 font-medium mt-1">{tx.description}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-[#B91C1C] text-lg">- {formatCurrency(tx.amount)}</p>
                                                <p className="text-[12px] text-gray-400 font-medium mt-1">{formatDate(tx.date)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Incomes Panel */}
                        <div className="w-1/2 bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-full bg-white text-[#10B981] flex items-center justify-center shadow-sm border border-green-50">
                                        <span className="material-symbols-outlined text-[24px]">trending_up</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Son Gelirler</h3>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">En son eklenen gelirler</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/finance/history')} className="text-sm font-bold text-[#059669] hover:bg-green-50 px-4 py-2 rounded-xl transition-all">Tümünü Gör</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-3">
                                {recentIncomes.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
                                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-30">savings</span>
                                        <p className="text-sm font-medium">Henüz gelir kaydı yok</p>
                                        <p className="text-xs mt-1">Gelir eklemek için yukarıdaki butonu kullanın</p>
                                    </div>
                                ) : (
                                    recentIncomes.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between px-6 py-4 rounded-[2rem] bg-[#ECFDF5] border border-[#A7F3D0] hover:border-green-300 hover:shadow-md transition-all group cursor-default">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#10B981] shadow-sm border border-green-50 group-hover:scale-105 transition-transform">
                                                    <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(tx.category_id)}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-base">{tx.category_name}</h4>
                                                    {tx.description && <p className="text-xs text-gray-500 font-medium mt-1">{tx.description}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-[#047857] text-lg">+ {formatCurrency(tx.amount)}</p>
                                                <p className="text-[12px] text-gray-400 font-medium mt-1">{formatDate(tx.date)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomeExpense;
