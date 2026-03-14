import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import { formatCurrency, METHOD_LABELS, offsetDate, CATEGORY_COLORS } from '../utils';
import type { EndOfDayReport } from '../types';

const DATES = [
    { label: 'Bugün',         offset: 0 },
    { label: 'Dün',           offset: 1 },
    { label: '2 Gün Önce',   offset: 2 },
    { label: '3 Gün Önce',   offset: 3 },
];

const EndOfDay: React.FC = () => {
    const [selectedOffset, setSelectedOffset] = useState(0);
    const [data, setData] = useState<EndOfDayReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        reportingService.getEndOfDay(offsetDate(selectedOffset))
            .then(setData)
            .finally(() => setLoading(false));
    }, [selectedOffset]);

    const totalPayment = data?.paymentBreakdown?.reduce((s, p) => s + p.amount, 0) || 0;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Header */}
                <GradientHeader
                    icon="summarize"
                    title="Gün Sonu Raporu"
                    subtitle="Günlük satış özeti, ödeme dağılımı ve kategori analizi"
                >
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/15">
                        {DATES.map((d, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedOffset(i)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    selectedOffset === i ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {d.label}
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
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                            <p className="text-sm">Backend'e bağlanılamadı</p>
                        </div>
                    </div>
                ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4 shrink-0">
                        {[
                            {
                                label: 'Toplam Ciro',
                                value: `₺${formatCurrency(data.summary.totalRevenue)}`,
                                sub: data.summary.revenueChangePercent !== null
                                    ? `${data.summary.revenueChangePercent >= 0 ? '+' : ''}${data.summary.revenueChangePercent}% önceki gün`
                                    : 'Karşılaştırma yok',
                                icon: 'payments',
                                color: 'text-emerald-600',
                                bgColor: 'bg-emerald-50',
                                up: (data.summary.revenueChangePercent ?? 0) >= 0,
                            },
                            {
                                label: 'Sipariş Sayısı',
                                value: String(data.summary.totalOrders),
                                sub: data.summary.ordersChangePercent !== null
                                    ? `${data.summary.ordersChangePercent >= 0 ? '+' : ''}${data.summary.ordersChangePercent}% önceki gün`
                                    : 'Karşılaştırma yok',
                                icon: 'receipt_long',
                                color: 'text-blue-600',
                                bgColor: 'bg-blue-50',
                                up: (data.summary.ordersChangePercent ?? 0) >= 0,
                            },
                            {
                                label: 'Ort. Sipariş',
                                value: `₺${formatCurrency(data.summary.avgOrderValue)}`,
                                sub: `${data.summary.totalOrders} siparişin ortalaması`,
                                icon: 'trending_up',
                                color: 'text-amber-600',
                                bgColor: 'bg-amber-50',
                                up: true,
                            },
                            {
                                label: 'Tekil Müşteri',
                                value: String(data.summary.uniqueCustomers),
                                sub: 'Kayıtlı müşteri',
                                icon: 'groups',
                                color: 'text-[#663259]',
                                bgColor: 'bg-purple-50',
                                up: true,
                            },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 ${card.bgColor} ${card.color} rounded-xl`}>
                                        <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                        {card.sub}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Ödeme + Kategori */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Ödeme Dağılımı */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">Ödeme Dağılımı</h3>
                            <p className="text-gray-400 text-xs mb-5">
                                Toplam ₺{formatCurrency(totalPayment)}
                            </p>
                            {data.paymentBreakdown.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">Bu gün için ödeme kaydı yok</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.paymentBreakdown.map(p => {
                                        const m = METHOD_LABELS[p.method] || METHOD_LABELS.OTHER;
                                        const pct = totalPayment > 0 ? Math.round((p.amount / totalPayment) * 100) : 0;
                                        return (
                                            <div key={p.method}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-7 h-7 rounded-lg ${m.bgColor} ${m.color} flex items-center justify-center`}>
                                                            <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{m.label}</span>
                                                        {p.count > 0 && (
                                                            <span className="text-xs text-gray-400">({p.count} işlem)</span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-gray-800">₺{formatCurrency(p.amount)}</span>
                                                        <span className="text-xs text-gray-400 ml-1">%{pct}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #663259, #4A235A)' }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Kategori Dağılımı */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-1">Kategori Dağılımı</h3>
                            <p className="text-gray-400 text-xs mb-4">Ürün kategorilerine göre ciro</p>
                            {data.categoryBreakdown.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">Bu gün için kategori verisi yok</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.categoryBreakdown.slice(0, 6).map((cat, i) => {
                                        const totalCat = data.categoryBreakdown.reduce((s, c) => s + c.amount, 0);
                                        const pct = totalCat > 0 ? Math.round((cat.amount / totalCat) * 100) : 0;
                                        return (
                                            <div key={cat.name} className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm text-gray-700 font-medium">{cat.name}</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold text-gray-800">₺{formatCurrency(cat.amount)}</span>
                                                            <span className="text-xs text-gray-400 ml-1">%{pct}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KDV Dağılımı */}
                    {data.vatBreakdown.length > 0 && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">KDV Grubu Dağılımı</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {data.vatBreakdown.map(vat => (
                                    <div key={vat.group} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">{vat.group}</p>
                                        <p className="text-lg font-bold text-gray-800">₺{formatCurrency(vat.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default EndOfDay;
