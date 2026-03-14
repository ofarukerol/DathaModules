import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import type { StockReport } from '../types';

type StockStatus = 'tukendi' | 'kritik' | 'dusuk' | 'normal' | 'fazla';

const STATUS_LABELS: Record<StockStatus, { label: string; color: string; bg: string; icon: string }> = {
    tukendi: { label: 'Tükendi',  color: 'text-red-700',    bg: 'bg-red-100',   icon: 'do_not_disturb_on' },
    kritik:  { label: 'Kritik',   color: 'text-red-600',    bg: 'bg-red-50',    icon: 'error' },
    dusuk:   { label: 'Düşük',    color: 'text-amber-600',  bg: 'bg-amber-50',  icon: 'warning' },
    normal:  { label: 'Normal',   color: 'text-emerald-600',bg: 'bg-emerald-50',icon: 'check_circle' },
    fazla:   { label: 'Fazla',    color: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'info' },
};

const FILL_COLORS: Record<StockStatus, string> = {
    tukendi: '#DC2626',
    kritik:  '#EF4444',
    dusuk:   '#F59E0B',
    normal:  '#10B981',
    fazla:   '#3B82F6',
};

const STATUS_FILTERS: StockStatus[] = ['tukendi', 'kritik', 'dusuk', 'normal', 'fazla'];

const Stock: React.FC = () => {
    const [data, setData] = useState<StockReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<StockStatus | 'tumu'>('tumu');
    const [activeCategory, setActiveCategory] = useState('Tümü');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        reportingService.getStock()
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    const categories = ['Tümü', ...Array.from(new Set(data?.products.map(p => p.category) || []))];

    const filtered = (data?.products || [])
        .filter(p => activeFilter === 'tumu' || p.status === activeFilter)
        .filter(p => activeCategory === 'Tümü' || p.category === activeCategory)
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="inventory"
                    title="Stok Raporu"
                    subtitle="Anlık stok seviyeleri, kritik ürünler ve stok durumu"
                />

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <div className="w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm">Stok verileri yükleniyor...</p>
                        </div>
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                        <p className="text-sm">Backend'e bağlanılamadı</p>
                    </div>
                ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* Status Summary Cards */}
                    <div className="grid grid-cols-5 gap-3">
                        {STATUS_FILTERS.map(f => {
                            const s = STATUS_LABELS[f];
                            const count = data.summary[f];
                            const isActive = activeFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(isActive ? 'tumu' : f)}
                                    className={`p-5 rounded-2xl border text-left transition-all shadow-sm hover:shadow-md cursor-pointer ${
                                        isActive ? 'border-[#663259] bg-white ring-2 ring-[#663259]/10' : 'border-transparent bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className={`p-2.5 ${s.bg} ${s.color} rounded-xl inline-block mb-3`}>
                                        <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                                    </div>
                                    <p className="text-gray-500 text-sm">{s.label} Stok</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{count}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">ürün</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Table Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Filter Bar */}
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex gap-1.5 flex-wrap">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-[#663259] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[17px]">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Ürün ara..."
                                    className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] w-44 transition-all"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs font-semibold text-gray-400 uppercase bg-gray-50/50">
                                    <th className="px-5 py-3 text-left">Ürün</th>
                                    <th className="px-5 py-3 text-left">Kategori</th>
                                    <th className="px-5 py-3 text-right">Mevcut</th>
                                    <th className="px-5 py-3 text-right">Min. Stok</th>
                                    <th className="px-5 py-3 text-center">Doluluk</th>
                                    <th className="px-5 py-3 text-center">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                                            <span className="material-symbols-outlined text-[36px] block mb-2">inventory_2</span>
                                            Sonuç bulunamadı
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => {
                                    const s = STATUS_LABELS[item.status];
                                    const fillColor = FILL_COLORS[item.status];
                                    return (
                                        <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.status === 'tukendi' || item.status === 'kritik' ? 'bg-red-50/20' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[17px]">restaurant</span>
                                                    </div>
                                                    <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">{item.category}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-gray-800 text-sm">
                                                {item.currentStock}
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-sm text-gray-500">{item.minStock}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${item.fillPct}%`, background: fillColor }} />
                                                    </div>
                                                    <span className="text-xs text-gray-400 w-8 text-right">%{item.fillPct}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                                                    {s.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/30">
                            <p className="text-sm text-gray-400">{filtered.length} ürün gösteriliyor</p>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default Stock;
