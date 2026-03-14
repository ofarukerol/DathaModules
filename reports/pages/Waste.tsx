import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import { formatCurrency, dateRange } from '../utils';
import type { WasteReport } from '../types';

const REASON_COLORS: Record<string, { bg: string; text: string }> = {
    'Bozulma':          { bg: 'bg-red-50',    text: 'text-red-600' },
    'Yanlış Hazırlama': { bg: 'bg-amber-50',  text: 'text-amber-600' },
    'Müşteri İadesi':   { bg: 'bg-blue-50',   text: 'text-blue-600' },
    'Kalite Sorunu':    { bg: 'bg-orange-50', text: 'text-orange-600' },
    'Kaza':             { bg: 'bg-purple-50', text: 'text-purple-600' },
};

function getReasonColor(reason: string) {
    return REASON_COLORS[reason] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
}

const PERIOD_OPTIONS = [
    { label: 'Bugün',    days: 0 },
    { label: 'Bu Hafta', days: 7 },
    { label: 'Bu Ay',    days: 30 },
    { label: 'Son 3 Ay', days: 90 },
];

const ITEMS_PER_PAGE = 8;

const Waste: React.FC = () => {
    const [activePeriod, setActivePeriod] = useState(1);
    const [data, setData] = useState<WasteReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeReason, setActiveReason] = useState('Tümü');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        const { startDate, endDate } = dateRange(PERIOD_OPTIONS[activePeriod].days);
        reportingService.getWaste(startDate, endDate)
            .then(d => { setData(d); setCurrentPage(1); setActiveReason('Tümü'); })
            .finally(() => setLoading(false));
    }, [activePeriod]);

    const uniqueReasons = ['Tümü', ...Array.from(new Set(data?.records.map(r => r.reason) || []))];

    const filtered = (data?.records || [])
        .filter(r => activeReason === 'Tümü' || r.reason === activeReason)
        .filter(r => r.productName.toLowerCase().includes(searchQuery.toLowerCase()) || r.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const totalLoss = filtered.reduce((s, r) => s + r.totalLoss, 0);
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleReasonChange = (r: string) => { setActiveReason(r); setCurrentPage(1); };

    const topReason = data?.reasonBreakdown[0]?.reason ?? '—';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="delete_sweep"
                    title="Fire Raporu"
                    subtitle="Ürün kayıpları, nedenleri ve toplam maliyet analizi"
                >
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/15">
                        {PERIOD_OPTIONS.map((p, i) => (
                            <button key={i} onClick={() => setActivePeriod(i)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === activePeriod ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </GradientHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <div className="w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm">Rapor yükleniyor...</p>
                        </div>
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                        <p className="text-sm">Backend'e bağlanılamadı</p>
                    </div>
                ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* Summary Row */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Toplam Kayıp', value: `₺${formatCurrency(data.summary.totalLoss)}`,  icon: 'money_off',     color: 'text-red-600',     bg: 'bg-red-50' },
                            { label: 'Fire Kaydı',   value: String(data.summary.totalRecords),              icon: 'delete',        color: 'text-amber-600',   bg: 'bg-amber-50' },
                            { label: 'Ort. Kayıp',   value: `₺${formatCurrency(data.summary.avgLoss)}`,    icon: 'trending_down', color: 'text-blue-600',    bg: 'bg-blue-50' },
                            { label: 'En Sık Neden', value: topReason,                                      icon: 'category',      color: 'text-[#663259]',   bg: 'bg-purple-50' },
                        ].map(c => (
                            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2.5 ${c.bg} ${c.color} rounded-xl`}>
                                        <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{c.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Reason Breakdown + Table */}
                    <div className="grid grid-cols-4 gap-4">
                        {/* Reason Breakdown */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">Neden Analizi</h3>
                            {data.reasonBreakdown.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Veri yok</p>
                            ) : (
                            <div className="space-y-3">
                                {data.reasonBreakdown.map(rb => {
                                    const rc = getReasonColor(rb.reason);
                                    return (
                                        <div key={rb.reason}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{rb.reason}</span>
                                                <span className="text-xs text-gray-500">{rb.count} kayıt</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${rb.pct}%`, background: '#663259' }} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 text-right">₺{formatCurrency(rb.loss)} · %{rb.pct}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            {/* Filter Bar */}
                            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
                                <div className="flex gap-1.5 flex-wrap">
                                    {uniqueReasons.map(r => (
                                        <button key={r} onClick={() => handleReasonChange(r)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeReason === r ? 'bg-[#663259] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[17px]">search</span>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        placeholder="Ürün veya kategori ara..."
                                        className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] w-48 transition-all"
                                    />
                                </div>
                            </div>

                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs font-semibold text-gray-400 uppercase bg-gray-50/50">
                                        <th className="px-4 py-3 text-left">Ürün</th>
                                        <th className="px-4 py-3 text-right">Miktar</th>
                                        <th className="px-4 py-3 text-right">Birim Maliyet</th>
                                        <th className="px-4 py-3 text-right">Kayıp</th>
                                        <th className="px-4 py-3 text-center">Neden</th>
                                        <th className="px-4 py-3 text-right">Tarih / Saat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paged.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                                                <span className="material-symbols-outlined text-[36px] block mb-2">delete_sweep</span>
                                                {data.summary.totalRecords === 0 ? 'Bu dönem için fire kaydı yok' : 'Kayıt bulunamadı'}
                                            </td>
                                        </tr>
                                    ) : paged.map(w => {
                                        const rc = getReasonColor(w.reason);
                                        return (
                                            <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[16px]">restaurant</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{w.productName}</p>
                                                            <p className="text-xs text-gray-400">{w.category}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-sm font-medium text-gray-700">{w.quantity}</td>
                                                <td className="px-4 py-3.5 text-right text-sm text-gray-500">₺{formatCurrency(w.unitCost)}</td>
                                                <td className="px-4 py-3.5 text-right font-bold text-red-500">-₺{formatCurrency(w.totalLoss)}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                                                        {w.reason}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                                                    {w.date}<br/><span className="text-gray-300">{w.time}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500">{filtered.length} kayıt</span>
                                    {filtered.length > 0 && (
                                        <span className="text-sm font-bold text-red-500">Toplam: -₺{formatCurrency(totalLoss)}</span>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button key={page} onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${currentPage === page ? 'bg-[#663259] text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'}`}>
                                            {page}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default Waste;
