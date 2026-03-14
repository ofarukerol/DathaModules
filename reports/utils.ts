/* ─── Ortak Para Formatlama ─── */

export const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

export const formatNumber = (n: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const formatCurrencyWithSymbol = (n: number) =>
    `₺${formatCurrency(n)}`;

/* ─── Ödeme Yöntemi Etiketleri ─── */

export const METHOD_LABELS: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    CASH:        { label: 'Nakit',       icon: 'payments',      color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    CREDIT_CARD: { label: 'Kredi Kartı', icon: 'credit_card',   color: 'text-blue-600',    bgColor: 'bg-blue-50' },
    MEAL_CARD:   { label: 'Yemek Kartı', icon: 'lunch_dining',  color: 'text-amber-600',   bgColor: 'bg-amber-50' },
    ONLINE:      { label: 'Online',      icon: 'phone_android', color: 'text-[#663259]',   bgColor: 'bg-purple-50' },
    OTHER:       { label: 'Diğer',       icon: 'more_horiz',    color: 'text-gray-600',    bgColor: 'bg-gray-50' },
};

/* ─── Sipariş Tipi Etiketleri ─── */

export const ORDER_TYPE_LABELS: Record<string, string> = {
    DINE_IN:  'Masa',
    TAKEAWAY: 'Gel-Al',
    DELIVERY: 'Paket',
};

/* ─── Tarih Yardımcıları ─── */

export function offsetDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}

export function dateRange(daysBack: number) {
    const end = new Date();
    const start = new Date();
    if (daysBack > 0) start.setDate(start.getDate() - daysBack);
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
}

/* ─── Kategori Renkleri ─── */

export const CATEGORY_COLORS = ['#663259', '#8E44AD', '#F97171', '#F59E0B', '#10B981', '#3B82F6', '#94A3B8'];
