import React, { useState, useEffect, useMemo } from 'react';
import GradientHeader from '../../../components/GradientHeader';
import DatePicker from '../../../components/DatePicker';
import { formatCurrency } from '../utils';
import { useIntegrationStore } from '../../integrations/stores/useIntegrationStore';
import { integrationsApi, type FinanceSummaryDto } from '../../integrations/services/integrationsApi';

const PERIOD_OPTIONS = [
    { label: 'Bugün', days: 0 },
    { label: 'Bu Hafta', days: 7 },
    { label: 'Bu Ay', days: 30 },
    { label: 'Son 3 Ay', days: 90 },
];

/** YYYY-MM-DD (yerel) string üret */
const toYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const TrendyolSummary: React.FC = () => {
    const { integrations, fetchIntegrations } = useIntegrationStore();
    const [activePeriod, setActivePeriod] = useState(2); // Bu Ay
    const [customMode, setCustomMode] = useState(false);
    const [customStart, setCustomStart] = useState(() => toYmd(new Date(Date.now() - 30 * 86400000)));
    const [customEnd, setCustomEnd] = useState(() => toYmd(new Date()));
    const [data, setData] = useState<FinanceSummaryDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!integrations.length) fetchIntegrations();
    }, [fetchIntegrations, integrations.length]);

    // Aktif Trendyol Yemek entegrasyonu
    const trendyol = useMemo(
        () => integrations.find((i) => i.provider === 'TRENDYOL_FOOD'),
        [integrations],
    );

    useEffect(() => {
        if (!trendyol) {
            setLoading(false);
            return;
        }
        let startMs: number;
        let endMs: number;
        if (customMode) {
            startMs = new Date(customStart + 'T00:00:00').getTime();
            endMs = new Date(customEnd + 'T23:59:59').getTime();
        } else {
            const end = new Date();
            const start = new Date();
            const days = PERIOD_OPTIONS[activePeriod].days;
            if (days > 0) start.setDate(start.getDate() - days);
            else start.setHours(0, 0, 0, 0);
            startMs = start.getTime();
            endMs = end.getTime();
        }
        if (endMs <= startMs) return;

        setLoading(true);
        integrationsApi
            .getFinanceSummary(trendyol.id, startMs, endMs)
            .then((d) => setData(d))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [trendyol, activePeriod, customMode, customStart, customEnd]);

    const cards = data
        ? [
              { label: 'Toplam Sipariş', value: `${data.totalOrders.toLocaleString('tr-TR')} Adet`, icon: 'receipt_long', color: 'text-[#663259]', bg: 'bg-purple-50', neg: false },
              { label: 'Toplam Satış', value: `₺${formatCurrency(data.totalSales)}`, icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50', neg: false },
              { label: 'Platform Komisyonu', value: `-₺${formatCurrency(data.totalCommission)}`, icon: 'percent', color: 'text-red-500', bg: 'bg-red-50', neg: true },
              { label: 'Taşıma Bedeli', value: `-₺${formatCurrency(data.totalDelivery)}`, icon: 'local_shipping', color: 'text-orange-500', bg: 'bg-orange-50', neg: true, note: 'Komisyona dahil' },
              { label: 'Toplam İndirim', value: `-₺${formatCurrency(data.totalDiscount)}`, icon: 'sell', color: 'text-amber-600', bg: 'bg-amber-50', neg: true },
              { label: 'Toplam İade', value: `-₺${formatCurrency(data.totalReturn)}`, icon: 'undo', color: 'text-rose-500', bg: 'bg-rose-50', neg: true },
              { label: 'Toplam Hakediş', value: `₺${formatCurrency(data.totalSellerRevenue)}`, icon: 'account_balance_wallet', color: 'text-blue-600', bg: 'bg-blue-50', neg: false },
          ]
        : [];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader icon="storefront" title="Trendyol Satış Özeti" subtitle="Tarih bazlı sipariş, satış, komisyon ve hakediş özeti">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/15">
                            {PERIOD_OPTIONS.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setActivePeriod(i); setCustomMode(false); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!customMode && i === activePeriod ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setCustomMode(true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${customMode ? 'bg-white text-[#663259]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                            >
                                Özel
                            </button>
                        </div>
                    </div>
                </GradientHeader>

                {/* Özel tarih aralığı seçimi */}
                {customMode && (
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-3 flex-wrap shrink-0">
                        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-[#663259]">date_range</span>
                            Tarih Aralığı
                        </span>
                        <div className="w-44"><DatePicker value={customStart} onChange={setCustomStart} placeholder="Başlangıç" /></div>
                        <span className="text-gray-400">—</span>
                        <div className="w-44"><DatePicker value={customEnd} onChange={setCustomEnd} placeholder="Bitiş" /></div>
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <div className="w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm">Özet yükleniyor...</p>
                        </div>
                    </div>
                ) : !trendyol ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">storefront</span>
                        <p className="text-sm">Trendyol Yemek entegrasyonu bulunamadı</p>
                        <p className="text-xs text-gray-400">Ayarlar &gt; Tanımlamalar &gt; Pazaryeri'nden bağlantı kurun</p>
                    </div>
                ) : data?.error ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">error_outline</span>
                        <p className="text-sm">Özet alınamadı</p>
                        <p className="text-xs text-red-400 max-w-md text-center">{data.error}</p>
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                        <span className="material-symbols-outlined text-[48px]">cloud_off</span>
                        <p className="text-sm">Backend'e bağlanılamadı</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pb-2 custom-scrollbar">
                        {/* Özet başlık kartı */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-5">Sipariş Kayıtları Özet</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {cards.map((c) => (
                                    <div key={c.label} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-9 h-9 ${c.bg} ${c.color} rounded-xl flex items-center justify-center shrink-0`}>
                                                <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                                            </div>
                                            <span className="text-gray-500 text-xs leading-tight">{c.label}</span>
                                        </div>
                                        <p className={`text-lg font-bold ${c.neg ? 'text-gray-700' : 'text-gray-900'}`}>{c.value}</p>
                                        {c.note && <span className="text-[10px] text-gray-400">{c.note}</span>}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-5 flex items-start gap-1.5">
                                <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                                Trendyol settlement API'sinde taşıma bedeli platform komisyonuna dahildir; ayrı kalem olarak verilmediğinden bu satır genelde 0 görünür. Hakediş = Satış − Komisyon.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendyolSummary;
