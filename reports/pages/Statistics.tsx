import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import { formatNumber, formatCurrencyWithSymbol, CATEGORY_COLORS } from '../utils';
import type { StatisticsReport } from '../types';

type Period = 'week' | 'month' | 'quarter' | 'year';
const PERIOD_OPTIONS: { label: string; value: Period }[] = [
    { label: 'Bu Hafta',  value: 'week' },
    { label: 'Bu Ay',     value: 'month' },
    { label: 'Son 3 Ay',  value: 'quarter' },
    { label: 'Bu Yıl',   value: 'year' },
];

const DAY_LABELS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

const Statistics: React.FC = () => {
    const [period, setPeriod] = useState<Period>('month');
    const [data, setData] = useState<StatisticsReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        reportingService.getStatistics(period)
            .then(setData)
            .finally(() => setLoading(false));
    }, [period]);

    const maxWeeklyRevenue = data ? Math.max(...data.weeklyData.map(d => d.revenue), 1) : 1;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader icon="bar_chart" title="İstatistikler" subtitle="İşletme performansı, büyüme trendleri ve genel analitik">
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/15">
                        {PERIOD_OPTIONS.map(p => (
                            <button key={p.value} onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period===p.value ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </GradientHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                        <p className="text-sm">Backend'e bağlanılamadı</p>
                    </div>
                ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Toplam Ciro',      value: formatCurrencyWithSymbol(data.kpi.totalRevenue),   change: data.kpi.revenueChange, icon: 'payments',      color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Toplam Sipariş',   value: formatNumber(data.kpi.totalOrders),                change: data.kpi.ordersChange,  icon: 'receipt_long',  color: 'text-blue-600',    bg: 'bg-blue-50' },
                            { label: 'Ort. Sipariş',     value: formatCurrencyWithSymbol(data.kpi.avgOrderValue),  change: null,                  icon: 'trending_up',   color: 'text-amber-600',   bg: 'bg-amber-50' },
                            { label: 'Tekil Müşteri',    value: formatNumber(data.kpi.uniqueCustomers),            change: null,                  icon: 'groups',        color: 'text-[#663259]',   bg: 'bg-purple-50' },
                        ].map(k => (
                            <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 ${k.bg} ${k.color} rounded-xl`}>
                                        <span className="material-symbols-outlined text-[22px]">{k.icon}</span>
                                    </div>
                                    {k.change !== null && (
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(k.change??0)>=0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            {(k.change??0)>=0 ? '+' : ''}{k.change}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-sm mb-1">{k.label}</p>
                                <p className="text-2xl font-bold text-gray-800">{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Weekly Bar + Peak Hours */}
                    <div className="grid grid-cols-5 gap-4">
                        {/* Weekly */}
                        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">Son 7 Gün Satış</h3>
                            <p className="text-gray-400 text-xs mb-5">Günlük ciro ve sipariş dağılımı</p>
                            {data.weeklyData.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-8">Veri yok</p>
                            ) : (
                                <div className="flex items-end gap-3 h-36">
                                    {data.weeklyData.map((d, i) => {
                                        const pct = Math.round((d.revenue / maxWeeklyRevenue) * 100);
                                        const dayLabel = DAY_LABELS[new Date(d.date).getDay() === 0 ? 6 : new Date(d.date).getDay() - 1];
                                        const isToday = d.date === new Date().toISOString().slice(0, 10);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                                                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                                                    <div className={`w-full rounded-t-xl transition-all ${isToday ? 'bg-[#663259]' : 'bg-purple-100 group-hover:bg-purple-300'}`}
                                                        style={{ height: `${pct}%` }} />
                                                </div>
                                                <span className="text-[11px] font-medium text-gray-500">{dayLabel}</span>
                                                <span className="text-[10px] text-gray-400">{d.orders}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Peak Hours */}
                        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">Yoğunluk Saatleri</h3>
                            <p className="text-gray-400 text-xs mb-4">Saat bazlı sipariş yoğunluğu</p>
                            <div className="space-y-2">
                                {data.peakHours.filter(h => h.score > 0).map(h => (
                                    <div key={h.hour} className="flex items-center gap-2.5">
                                        <span className="text-[11px] text-gray-400 w-10 shrink-0">{String(h.hour).padStart(2,'0')}:00</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all"
                                                style={{ width: `${h.score}%`, background: h.score>=90?'#663259':h.score>=70?'#8E44AD':'#C4A5C8' }} />
                                        </div>
                                        <span className="text-[11px] font-semibold text-gray-600 w-8 text-right">%{h.score}</span>
                                    </div>
                                ))}
                                {data.peakHours.filter(h=>h.score>0).length===0 && <p className="text-gray-400 text-xs text-center py-4">Veri yok</p>}
                            </div>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    {data.categoryShare.length > 0 && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">Kategori Gelir Dağılımı</h3>
                            <p className="text-gray-400 text-xs mb-5">Toplam ciroya kategorilerin katkısı</p>
                            <div className="flex gap-6 items-center">
                                <div className="flex-1">
                                    <div className="h-8 rounded-xl overflow-hidden flex">
                                        {data.categoryShare.map((c, i) => (
                                            <div key={c.name} style={{ width:`${c.pct}%`, background: CATEGORY_COLORS[i%CATEGORY_COLORS.length] }} className="h-full transition-all" />
                                        ))}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                                        {data.categoryShare.map((c, i) => (
                                            <div key={c.name} className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i%CATEGORY_COLORS.length] }} />
                                                <span className="text-xs text-gray-600">{c.name}</span>
                                                <span className="text-xs font-bold text-gray-800">%{c.pct}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default Statistics;
