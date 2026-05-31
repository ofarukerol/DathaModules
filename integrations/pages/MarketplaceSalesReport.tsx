// MarketplaceSalesReport — Raporlar > Pazaryerleri
// Aktif pazaryeri (Trendyol Yemek) satışlarını tarih bazlı listeler:
// finansal özet (settlement) + tarih-gruplı sipariş tablosu.
// @see DAT-236 — backend GET /integrations/:id/sales-report

import { useEffect, useMemo, useState } from 'react';
import PageToolbar from '../../../components/PageToolbar';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import { formatCurrency } from '../../../utils/datha/helpers';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import { integrationsApi, type SalesReportDto, type SalesReportOrderDto } from '../services/integrationsApi';
import { IntegrationProvider, PROVIDER_LABELS } from '../../../shared/src';

// ─── Tarih yardımcıları (yerel saat) ───
const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDayMs = (dateStr: string) => new Date(`${dateStr}T00:00:00`).getTime();
const endOfDayMs = (dateStr: string) => new Date(`${dateStr}T23:59:59.999`).getTime();
const daysBetween = (startStr: string, endStr: string) =>
    Math.floor((startOfDayMs(endStr) - startOfDayMs(startStr)) / 86_400_000) + 1;

// Bu süreden uzun aralıkta sipariş listesi (paketler) varsayılan olarak çekilmez — yavaş.
const AUTO_LIST_MAX_DAYS = 7;

type Preset = 'today' | 'week' | 'month' | 'custom';

function presetRange(preset: Exclude<Preset, 'custom'>): { start: string; end: string } {
    const now = new Date();
    const today = toDateStr(now);
    if (preset === 'today') return { start: today, end: today };
    if (preset === 'week') {
        const day = now.getDay() || 7; // Pazar=0 → 7
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day - 1));
        return { start: toDateStr(monday), end: today };
    }
    // month
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toDateStr(first), end: today };
}

// ─── Statü → renk ───
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
    'Teslim Edildi': { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    Hazır: { bg: 'bg-blue-50', fg: 'text-blue-600' },
    Hazırlanıyor: { bg: 'bg-amber-50', fg: 'text-amber-600' },
    Oluşturuldu: { bg: 'bg-indigo-50', fg: 'text-indigo-600' },
    Kargoda: { bg: 'bg-cyan-50', fg: 'text-cyan-600' },
    İptal: { bg: 'bg-red-50', fg: 'text-red-600' },
    'Tedarik Edilemedi': { bg: 'bg-red-50', fg: 'text-red-600' },
    İade: { bg: 'bg-orange-50', fg: 'text-orange-600' },
};
const statusStyle = (s: string) => STATUS_STYLE[s] ?? { bg: 'bg-gray-100', fg: 'text-gray-600' };

const PAYMENT_OPTIONS = [
    { value: 'all', label: 'Tüm Ödemeler', icon: 'payments' },
    { value: 'Kredi Kartı', label: 'Kredi Kartı', icon: 'credit_card' },
    { value: 'Yemek Kartı', label: 'Yemek Kartı', icon: 'restaurant' },
    { value: 'Kapıda Ödeme', label: 'Kapıda Ödeme', icon: 'local_shipping' },
];

// İptal/Tedarik Edilemedi = satış değildir (Trendyol "Geçmiş Siparişler"e saymaz)
const FAILED_STATUSES = ['İptal', 'Tedarik Edilemedi'];
const PREPARING_STATUSES = ['Oluşturuldu', 'Hazırlanıyor', 'Hazır', 'Kargoda'];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Aktif + Tamamlanan', icon: 'check_circle' }, // iptal/tedarik edilemedi hariç
    { value: 'Teslim Edildi', label: 'Teslim Edildi', icon: 'task_alt' },    // Trendyol "Tamamlandı"
    { value: 'preparing', label: 'Hazırlanıyor', icon: 'schedule' },
    { value: 'failed', label: 'İptal / Tedarik Edilemedi', icon: 'cancel' },
];

// Bir siparişin seçili statü filtresine uyup uymadığı
function matchesStatusFilter(status: string, filter: string): boolean {
    if (filter === 'active') return !FAILED_STATUSES.includes(status);
    if (filter === 'preparing') return PREPARING_STATUSES.includes(status);
    if (filter === 'failed') return FAILED_STATUSES.includes(status);
    return status === filter; // 'Teslim Edildi'
}

export default function MarketplaceSalesReport() {
    const { integrations, loading: intLoading, fetchIntegrations } = useIntegrationStore();

    // Aktif (CONNECTED) pazaryeri entegrasyonları
    const connected = useMemo(
        () => integrations.filter((i) => i.status === 'CONNECTED'),
        [integrations],
    );
    const [integrationId, setIntegrationId] = useState<string>('');

    // Filtre state
    const initial = presetRange('today');
    const [preset, setPreset] = useState<Preset>('today');
    const [startDate, setStartDate] = useState(initial.start);
    const [endDate, setEndDate] = useState(initial.end);
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active'); // varsayılan: iptal/tedarik edilemedi hariç
    const [search, setSearch] = useState('');
    // Siparişleri listele: kısa aralıkta varsayılan açık, uzun aralıkta kapalı (yalnızca özet)
    const [includeOrders, setIncludeOrders] = useState(true);

    // Veri state
    const [report, setReport] = useState<SalesReportDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    // İlk CONNECTED entegrasyonu otomatik seç
    useEffect(() => {
        if (!integrationId && connected.length > 0) {
            const trendyol = connected.find((i) => i.provider === IntegrationProvider.TRENDYOL_FOOD);
            setIntegrationId((trendyol ?? connected[0]).id);
        }
    }, [connected, integrationId]);

    const applyPreset = (p: Exclude<Preset, 'custom'>) => {
        const r = presetRange(p);
        setPreset(p);
        setStartDate(r.start);
        setEndDate(r.end);
        setIncludeOrders(daysBetween(r.start, r.end) <= AUTO_LIST_MAX_DAYS);
    };

    // Özel tarih değişiminde aralık uzunluğuna göre "siparişleri listele"yi otomatik ayarla
    const changeDates = (next: { start?: string; end?: string }) => {
        const start = next.start ?? startDate;
        const end = next.end ?? endDate;
        setStartDate(start);
        setEndDate(end);
        setPreset('custom');
        setIncludeOrders(daysBetween(start, end) <= AUTO_LIST_MAX_DAYS);
    };

    const loadReport = async () => {
        if (!integrationId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await integrationsApi.getSalesReport(
                integrationId,
                startOfDayMs(startDate),
                endOfDayMs(endDate),
                includeOrders,
            );
            setReport(data);
            if (data.error) setError(data.error);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Rapor alınamadı');
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    // Entegrasyon seçilince/değişince otomatik yükle
    useEffect(() => {
        if (integrationId) loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [integrationId]);

    // ─── İstemci tarafı filtre (ödeme tipi + arama) ───
    const filteredOrders = useMemo(() => {
        let list = report?.orders ?? [];
        list = list.filter((o) => matchesStatusFilter(o.status, statusFilter));
        if (paymentFilter !== 'all') list = list.filter((o) => o.paymentType === paymentFilter);
        if (search.trim()) {
            const q = search.trim().toLocaleLowerCase('tr-TR');
            list = list.filter(
                (o) =>
                    o.orderNumber.toLocaleLowerCase('tr-TR').includes(q) ||
                    o.customer.toLocaleLowerCase('tr-TR').includes(q),
            );
        }
        return list;
    }, [report, paymentFilter, statusFilter, search]);

    // ─── Tarihe göre grupla ───
    const grouped = useMemo(() => {
        const map = new Map<string, SalesReportOrderDto[]>();
        for (const o of filteredOrders) {
            const key = new Date(o.orderDate).toLocaleDateString('tr-TR');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(o);
        }
        return Array.from(map.entries());
    }, [filteredOrders]);

    // Toplam Sipariş + Satış doğrudan listeden hesaplanır (tüm siparişler, "Hazırlanıyor" dahil)
    // — settlement'a değil. Böylece özet kartları aşağıdaki sipariş listesiyle birebir tutulur.
    const listTotalSales = useMemo(
        () => filteredOrders.reduce((acc, o) => acc + o.totalPrice, 0),
        [filteredOrders],
    );

    const provider = useMemo(() => {
        const i = connected.find((x) => x.id === integrationId);
        return i?.provider ?? IntegrationProvider.TRENDYOL_FOOD;
    }, [connected, integrationId]);

    const s = report?.summary;
    // ordersIncluded yoksa (eski backend) liste her zaman gelirdi → true varsay.
    const ordersShown = report ? (report.ordersIncluded ?? true) : false;

    // Özet "Toplam Sipariş/Satış": liste getirildiyse listeden (tutarlılık),
    // yalnızca özet modunda settlement'tan (muhasebeleşen).
    const summaryOrderCount = ordersShown ? filteredOrders.length : (s?.totalOrders ?? 0);
    const summarySales = ordersShown ? listTotalSales : (s?.totalSales ?? 0);

    // ─── CSV indir (Gün Sonu Raporu) ───
    const downloadCsv = () => {
        if (!filteredOrders.length) return;
        const head = ['Sipariş No', 'Müşteri', 'Tutar', 'Ürün Adedi', 'Ödeme', 'Statü', 'Sipariş Saati', 'Vade'];
        const rows = filteredOrders.map((o) => [
            o.orderNumber,
            o.customer,
            String(o.totalPrice).replace('.', ','),
            String(o.productCount),
            o.paymentType,
            o.status,
            new Date(o.orderDate).toLocaleString('tr-TR'),
            o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '-',
        ]);
        const csv = [head, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
            .join('\n');
        const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pazaryeri-satis-${startDate}_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <PageToolbar
                    icon="storefront"
                    title="Pazaryeri Satışları"
                    stats={
                        connected.length === 0
                            ? 'Bağlı pazaryeri yok'
                            : `${PROVIDER_LABELS[provider]} · ${startDate} → ${endDate}`
                    }
                    actions={
                        <button
                            onClick={downloadCsv}
                            disabled={!filteredOrders.length}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-[#663259] rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-white/90 active:scale-95 disabled:opacity-40 disabled:hover:bg-white"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Gün Sonu Raporu İndir
                        </button>
                    }
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {/* Bağlı pazaryeri yoksa */}
                    {!intLoading && connected.length === 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                            <span className="material-symbols-outlined text-gray-300 text-[56px]">storefront</span>
                            <p className="mt-3 text-gray-700 font-bold">Bağlı pazaryeri bulunamadı</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Ayarlar &gt; Tanımlamalar &gt; Pazaryerleri üzerinden bir entegrasyon bağlayın.
                            </p>
                        </div>
                    )}

                    {connected.length > 0 && (
                        <>
                            {/* Filtre çubuğu */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                                {/* Hızlı seçim presetleri */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {([
                                        ['today', 'Bugün'],
                                        ['week', 'Bu Hafta'],
                                        ['month', 'Bu Ay'],
                                    ] as Array<[Exclude<Preset, 'custom'>, string]>).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => applyPreset(key)}
                                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                                preset === key
                                                    ? 'bg-[#663259] text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                    {connected.length > 1 && (
                                        <div className="ml-auto w-56">
                                            <CustomSelect
                                                options={connected.map((i) => ({
                                                    value: i.id,
                                                    label: PROVIDER_LABELS[i.provider],
                                                }))}
                                                value={integrationId}
                                                onChange={setIntegrationId}
                                                icon={<span className="material-symbols-outlined text-[18px]">storefront</span>}
                                                accentColor="#663259"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Siparişleri listele toggle */}
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={includeOrders}
                                        onChange={(e) => setIncludeOrders(e.target.checked)}
                                        className="w-4 h-4 rounded accent-[#663259] cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">Siparişleri listele</span>
                                    <span className="text-xs text-gray-400">
                                        (uzun tarih aralığında otomatik kapanır — yalnızca özet daha hızlı gelir)
                                    </span>
                                </label>

                                {/* Tarih + statü + ödeme + arama + filtrele */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Başlangıç Tarihi</label>
                                        <DatePicker
                                            value={startDate}
                                            onChange={(v) => changeDates({ start: v })}
                                            icon="event"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Bitiş Tarihi</label>
                                        <DatePicker
                                            value={endDate}
                                            onChange={(v) => changeDates({ end: v })}
                                            icon="event"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Statü</label>
                                        <CustomSelect
                                            options={STATUS_OPTIONS}
                                            value={statusFilter}
                                            onChange={setStatusFilter}
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Ödeme Türü</label>
                                        <CustomSelect
                                            options={PAYMENT_OPTIONS}
                                            value={paymentFilter}
                                            onChange={setPaymentFilter}
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Ara (Sipariş No / Müşteri)</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                            <input
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Ara..."
                                                className="w-full h-[42px] pl-10 pr-3 rounded-xl border border-gray-200 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={loadReport}
                                            disabled={loading}
                                            className="w-full h-[42px] flex items-center justify-center gap-2 rounded-xl bg-[#663259] text-white text-sm font-bold hover:bg-[#7a3d6b] transition-colors disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {loading ? 'progress_activity' : 'filter_alt'}
                                            </span>
                                            {loading ? 'Yükleniyor...' : 'FİLTRELE'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Özet kartları */}
                            {s && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-1 px-1">Sipariş Kayıtları Özet</h3>
                                    <p className="text-xs text-gray-400 mb-2 px-1">
                                        {ordersShown ? (
                                            <>
                                                Toplam Sipariş ve Satış seçili statüdeki siparişleri kapsar (varsayılan: iptal /
                                                tedarik edilemedi hariç). Trendyol panelindeki “Tamamlandı” ile birebir karşılaştırmak
                                                için Statü = “Teslim Edildi” seçin. Komisyon, taşıma, indirim, iade ve Hakediş yalnızca
                                                muhasebeleşen (settlement) siparişleri yansıtır; bu yüzden teslim adedinden az olabilir.
                                            </>
                                        ) : (
                                            <>
                                                Yalnızca özet getirildi (sipariş listesi çekilmedi). Bu rakamlar muhasebeleşen
                                                (settlement) siparişleri yansıtır. Sipariş kayıtlarını görmek için “Siparişleri
                                                listele”yi işaretleyip Filtrele’ye basın.
                                            </>
                                        )}
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                                        <MetricCard icon="receipt_long" label="Toplam Sipariş" value={String(summaryOrderCount)} color="#663259" />
                                        <MetricCard icon="payments" label="Toplam Satış" value={formatCurrency(summarySales)} color="#10B981" />
                                        <MetricCard icon="percent" label="Platform Komisyonu" value={`-${formatCurrency(s.totalCommission)}`} color="#EF4444" />
                                        <MetricCard icon="local_shipping" label="Taşıma Bedeli" value={`-${formatCurrency(s.totalDelivery)}`} color="#F59E0B" />
                                        <MetricCard icon="sell" label="İndirim" value={`-${formatCurrency(s.totalDiscount)}`} color="#F59E0B" />
                                        <MetricCard icon="undo" label="İade" value={`-${formatCurrency(s.totalReturn)}`} color="#EF4444" />
                                        <MetricCard icon="account_balance_wallet" label="Hakediş" value={formatCurrency(s.totalSellerRevenue)} color="#663259" highlight />
                                    </div>
                                </div>
                            )}

                            {/* Sipariş listesi (tarihe gruplı) — yalnızca "Siparişleri listele" açıkken */}
                            {loading && !report ? (
                                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                                    <span className="material-symbols-outlined text-[40px] animate-spin">progress_activity</span>
                                    <p className="mt-2 text-sm">Yükleniyor...</p>
                                </div>
                            ) : !ordersShown ? (
                                report && (
                                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                                        <span className="material-symbols-outlined text-[40px] text-gray-300">receipt_long</span>
                                        <p className="mt-2 text-sm font-semibold text-gray-600">Sipariş listesi getirilmedi</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Bu aralık için yalnızca özet gösteriliyor. Sipariş kayıtlarını görmek için yukarıdaki
                                            <span className="font-semibold text-gray-600"> “Siparişleri listele” </span>
                                            kutusunu işaretleyip <span className="font-semibold text-gray-600">Filtrele</span>’ye basın.
                                        </p>
                                    </div>
                                )
                            ) : grouped.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                                    <span className="material-symbols-outlined text-[48px]">inbox</span>
                                    <p className="mt-2 text-sm">Seçili kriterlerde sipariş bulunamadı.</p>
                                </div>
                            ) : (
                                grouped.map(([date, orders]) => (
                                    <DayGroup key={date} date={date} orders={orders} />
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Gün grubu (Trendyol gibi: gün başlığı + gün toplamı + açılır/kapanır + sayfalama) ───
const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 Adet' },
    { value: '25', label: '25 Adet' },
    { value: '50', label: '50 Adet' },
    { value: '100', label: '100 Adet' },
];

function DayGroup({ date, orders }: { date: string; orders: SalesReportOrderDto[] }) {
    const [expanded, setExpanded] = useState(true);
    const [pageSize, setPageSize] = useState('10');
    const [page, setPage] = useState(1);

    const daySum = orders.reduce((acc, o) => acc + o.totalPrice, 0);
    const size = Number(pageSize);
    const totalPages = Math.max(1, Math.ceil(orders.length / size));
    const safePage = Math.min(page, totalPages);
    const pageOrders = orders.slice((safePage - 1) * size, safePage * size);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Grup başlığı */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-4 hover:bg-gray-100/70 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[#663259] text-[20px]">calendar_month</span>
                    <span className="font-bold text-gray-800 text-sm truncate">{date} Tarihli Siparişler</span>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                    <span className="text-xs text-gray-500">
                        Toplam Sipariş: <span className="font-bold text-gray-700">{orders.length}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                        Toplam Sipariş Tutarı: <span className="font-bold text-emerald-600">{formatCurrency(daySum)}</span>
                    </span>
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">
                        {expanded ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </button>

            {expanded && (
                <>
                    {/* Tablo */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                    <th className="px-4 py-2.5 font-semibold">Sipariş No</th>
                                    <th className="px-4 py-2.5 font-semibold">Müşteri</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Sipariş Tutarı</th>
                                    <th className="px-4 py-2.5 font-semibold text-center">Ürün Adedi</th>
                                    <th className="px-4 py-2.5 font-semibold">Ödeme Türü</th>
                                    <th className="px-4 py-2.5 font-semibold">Statü</th>
                                    <th className="px-4 py-2.5 font-semibold">Sipariş Saati</th>
                                    <th className="px-4 py-2.5 font-semibold">Vade Tarihi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageOrders.map((o) => {
                                    const st = statusStyle(o.status);
                                    return (
                                        <tr key={o.orderId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2.5 font-semibold text-gray-700">#{o.orderNumber}</td>
                                            <td className="px-4 py-2.5 text-gray-600">{o.customer || '-'}</td>
                                            <td className="px-4 py-2.5 text-right font-bold text-gray-800">{formatCurrency(o.totalPrice)}</td>
                                            <td className="px-4 py-2.5 text-center text-gray-600">{o.productCount}</td>
                                            <td className="px-4 py-2.5 text-gray-600">{o.paymentType}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.bg} ${st.fg}`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-500">
                                                {new Date(o.orderDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-500">
                                                {o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Sayfalama */}
                    {orders.length > size && (
                        <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                                <PagerBtn icon="first_page" disabled={safePage === 1} onClick={() => setPage(1)} />
                                <PagerBtn icon="chevron_left" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} />
                                <span className="px-3 text-xs text-gray-500">
                                    Sayfa <span className="font-bold text-gray-700">{safePage}</span> / {totalPages}
                                </span>
                                <PagerBtn icon="chevron_right" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} />
                                <PagerBtn icon="last_page" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Her Sayfada</span>
                                <div className="w-28">
                                    <CustomSelect
                                        options={PAGE_SIZE_OPTIONS}
                                        value={pageSize}
                                        onChange={(v) => { setPageSize(v); setPage(1); }}
                                        accentColor="#663259"
                                        compact
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function PagerBtn({ icon, disabled, onClick }: { icon: string; disabled: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
    );
}

// ─── Özet kartı ───
interface MetricCardProps {
    icon: string;
    label: string;
    value: string;
    color: string;
    highlight?: boolean;
}

function MetricCard({ icon, label, value, color, highlight }: MetricCardProps) {
    return (
        <div
            className={`rounded-2xl border p-4 shadow-sm ${highlight ? 'border-transparent text-white' : 'bg-white border-gray-100'}`}
            style={highlight ? { background: `linear-gradient(135deg, ${color} 0%, #4A235A 100%)` } : undefined}
        >
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.18)' : `${color}1A` }}
            >
                <span className="material-symbols-outlined text-[20px]" style={{ color: highlight ? '#fff' : color }}>
                    {icon}
                </span>
            </div>
            <p className={`text-xs font-medium ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</p>
        </div>
    );
}
