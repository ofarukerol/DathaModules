import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import { formatCurrency, dateRange } from '../utils';
import type { ProductSalesReport } from '../types';

const PERIOD_OPTIONS = [
    { label: 'Bugün',      days: 0 },
    { label: 'Bu Hafta',   days: 7 },
    { label: 'Bu Ay',      days: 30 },
    { label: 'Son 3 Ay',   days: 90 },
];

const ITEMS_PER_PAGE = 8;

const ProductSales: React.FC = () => {
    const [activePeriod, setActivePeriod] = useState(0);
    const [data, setData] = useState<ProductSalesReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Tümü');
    const [sortBy, setSortBy] = useState<'revenue' | 'qty'>('revenue');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        const { startDate, endDate } = dateRange(PERIOD_OPTIONS[activePeriod].days);
        reportingService.getProductSales(startDate, endDate)
            .then(d => { setData(d); setCurrentPage(1); })
            .finally(() => setLoading(false));
    }, [activePeriod]);

    const categories = ['Tümü', ...Array.from(new Set(data?.products.map(p => p.category) || []))];

    const filtered = (data?.products || [])
        .filter(p => activeCategory === 'Tümü' || p.category === activeCategory)
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : b.qtySold - a.qtySold);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader icon="trending_up" title="Ürün Satış Raporu" subtitle="Ürün bazlı satış miktarı, ciro ve trend analizi">
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
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Toplam Ciro', value: `₺${formatCurrency(data.summary.totalRevenue)}`, icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Toplam Satış', value: `${data.summary.totalQty.toLocaleString('tr-TR')} adet`, icon: 'inventory_2', color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Ürün Çeşidi', value: String(data.summary.productCount), icon: 'category', color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map(c => (
                            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2.5 ${c.bg} ${c.color} rounded-xl`}>
                                        <span className="material-symbols-outlined text-[22px]">{c.icon}</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{c.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Filters */}
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex gap-1.5 flex-wrap">
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-[#663259] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                    {(['revenue','qty'] as const).map(s => (
                                        <button key={s} onClick={() => setSortBy(s)}
                                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${sortBy === s ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                                            {s === 'revenue' ? 'Ciroya Göre' : 'Adede Göre'}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[17px]">search</span>
                                    <input type="text" value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        placeholder="Ürün ara..." className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] w-40 transition-all" />
                                </div>
                            </div>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="text-xs font-semibold text-gray-400 uppercase bg-gray-50/50">
                                    <th className="px-5 py-3 text-left">#</th>
                                    <th className="px-5 py-3 text-left">Ürün</th>
                                    <th className="px-5 py-3 text-left">Kategori</th>
                                    <th className="px-5 py-3 text-right">Satış Adedi</th>
                                    <th className="px-5 py-3 text-right">Ort. Fiyat</th>
                                    <th className="px-5 py-3 text-right">Ciro</th>
                                    <th className="px-5 py-3 text-right">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paged.length === 0 ? (
                                    <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                                        <span className="material-symbols-outlined text-[36px] block mb-2">search_off</span>Sonuç bulunamadı
                                    </td></tr>
                                ) : paged.map((p, i) => (
                                    <tr key={p.productId} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3.5 text-gray-400 text-sm font-medium">{(currentPage-1)*ITEMS_PER_PAGE+i+1}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#663259] flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[17px]">restaurant</span>
                                                </div>
                                                <span className="font-semibold text-gray-800 text-sm">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">{p.category}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-sm font-medium text-gray-700">{p.qtySold.toLocaleString('tr-TR')}</td>
                                        <td className="px-5 py-3.5 text-right text-sm text-gray-600">₺{formatCurrency(p.avgPrice)}</td>
                                        <td className="px-5 py-3.5 text-right font-bold text-[#663259]">₺{formatCurrency(p.revenue)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${p.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : p.trend === 'down' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                                                <span className="material-symbols-outlined text-[12px]">{p.trend === 'up' ? 'trending_up' : p.trend === 'down' ? 'trending_down' : 'trending_flat'}</span>
                                                {p.trend !== 'neutral' ? `%${p.trendPct}` : 'Sabit'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                            <span className="text-sm text-gray-500">{filtered.length} üründen {filtered.length===0?0:(currentPage-1)*ITEMS_PER_PAGE+1}–{Math.min(currentPage*ITEMS_PER_PAGE,filtered.length)} gösteriliyor</span>
                            <div className="flex gap-1.5">
                                <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
                                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                </button>
                                {Array.from({length: totalPages},(_,i)=>i+1).map(page => (
                                    <button key={page} onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${currentPage===page ? 'bg-[#663259] text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'}`}>
                                        {page}
                                    </button>
                                ))}
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
                                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default ProductSales;
