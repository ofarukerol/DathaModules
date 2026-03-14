import React, { useState, useEffect } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import { reportingService } from '../service';
import { formatCurrency, METHOD_LABELS, ORDER_TYPE_LABELS, offsetDate } from '../utils';
import type { ShiftsReport } from '../types';

const SHIFT_ICONS: Record<string, string> = {
    'Sabah':  'wb_sunny',
    'Öğle':  'light_mode',
    'Akşam': 'nights_stay',
};

const DATES = [
    { label: 'Bugün',       offset: 0 },
    { label: 'Dün',         offset: 1 },
    { label: '2 Gün Önce', offset: 2 },
    { label: '3 Gün Önce', offset: 3 },
];

const Shifts: React.FC = () => {
    const [selectedOffset, setSelectedOffset] = useState(0);
    const [data, setData] = useState<ShiftsReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

    useEffect(() => {
        setLoading(true);
        reportingService.getShifts(offsetDate(selectedOffset))
            .then(setData)
            .finally(() => setLoading(false));
    }, [selectedOffset]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="schedule"
                    title="Vardiya Raporu"
                    subtitle="Vardiya bazlı satış performansı, ödeme dağılımı ve sipariş tipleri"
                >
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/15">
                        {DATES.map((d, i) => (
                            <button key={i} onClick={() => { setSelectedOffset(i); setExpandedIdx(0); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedOffset === i ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
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
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                        <p className="text-sm">Backend'e bağlanılamadı</p>
                    </div>
                ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Toplam Ciro',    value: `₺${formatCurrency(data.summary.totalRevenue)}`, icon: 'payments',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Toplam Sipariş', value: String(data.summary.totalOrders),                icon: 'receipt_long', color: 'text-blue-600',    bg: 'bg-blue-50' },
                            { label: 'Kapalı Vardiya', value: `${data.shifts.filter(s => s.status === 'closed').length}/${data.shifts.length}`, icon: 'check_circle', color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Ort. Sipariş',   value: `₺${formatCurrency(data.summary.avgOrderValue)}`,icon: 'trending_up',  color: 'text-[#663259]',   bg: 'bg-purple-50' },
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

                    {/* Shifts List */}
                    {data.shifts.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                            <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-3">schedule</span>
                            <p className="text-gray-400">Bu gün için vardiya verisi bulunamadı</p>
                        </div>
                    ) : (
                    <div className="space-y-3">
                        {data.shifts.map((shift, idx) => {
                            const isExpanded = expandedIdx === idx;
                            const shiftIcon = SHIFT_ICONS[shift.name] ?? shift.icon ?? 'schedule';
                            const isOpen = shift.status === 'open';
                            const isUpcoming = shift.status === 'upcoming';
                            return (
                                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-50 text-emerald-600' : isUpcoming ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">{shiftIcon}</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800">{shift.name} Vardiyası</span>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isOpen ? 'bg-emerald-50 text-emerald-600' : isUpcoming ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                                        {isOpen ? 'Açık' : isUpcoming ? 'Bekliyor' : 'Kapalı'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{shift.startTime} – {shift.endTime}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Ciro</p>
                                                <p className="font-bold text-[#663259]">₺{formatCurrency(shift.totalRevenue)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Sipariş</p>
                                                <p className="font-bold text-gray-700">{shift.totalOrders}</p>
                                            </div>
                                            <span className={`material-symbols-outlined text-gray-400 text-[20px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-5 pb-5 border-t border-gray-100">
                                            <div className="pt-4 grid grid-cols-3 gap-4">
                                                {/* Ödeme Dağılımı */}
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Ödeme Dağılımı</h4>
                                                    {shift.paymentBreakdown.length === 0 ? (
                                                        <p className="text-xs text-gray-400">Ödeme verisi yok</p>
                                                    ) : (
                                                    <div className="space-y-2">
                                                        {shift.paymentBreakdown.map(pb => {
                                                            const m = METHOD_LABELS[pb.method] ?? METHOD_LABELS.OTHER;
                                                            return (
                                                                <div key={pb.method} className="flex justify-between text-sm">
                                                                    <span className="text-gray-500">{m.label}</span>
                                                                    <span className="font-medium text-gray-700">₺{formatCurrency(pb.amount)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                                                            <span className="font-semibold text-gray-700">Toplam</span>
                                                            <span className="font-bold text-[#663259]">₺{formatCurrency(shift.totalRevenue)}</span>
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>

                                                {/* Sipariş Tipleri */}
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Sipariş Tipleri</h4>
                                                    {shift.orderTypeBreakdown.length === 0 ? (
                                                        <p className="text-xs text-gray-400">Veri yok</p>
                                                    ) : (
                                                    <div className="space-y-2">
                                                        {shift.orderTypeBreakdown.map(ot => (
                                                            <div key={ot.type} className="flex justify-between text-sm">
                                                                <span className="text-gray-500">{ORDER_TYPE_LABELS[ot.type] ?? ot.type}</span>
                                                                <span className="font-medium text-gray-700">{ot.count} sipariş</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    )}
                                                </div>

                                                {/* Performans */}
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Performans</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Sipariş Sayısı</span>
                                                            <span className="font-medium text-gray-700">{shift.totalOrders}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Ort. Sipariş</span>
                                                            <span className="font-medium text-gray-700">₺{formatCurrency(shift.avgOrderValue)}</span>
                                                        </div>
                                                        {shift.topPersonnel.length > 0 && (
                                                            <>
                                                                <div className="border-t border-gray-200 pt-2">
                                                                    <p className="text-xs font-semibold text-gray-500 mb-1.5">En Aktif Personel</p>
                                                                    {shift.topPersonnel.slice(0, 2).map(p => (
                                                                        <div key={p.name} className="flex justify-between text-xs mb-1">
                                                                            <span className="text-gray-500">{p.name}</span>
                                                                            <span className="font-medium text-gray-700">{p.orders} sipariş</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default Shifts;
