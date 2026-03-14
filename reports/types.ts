/* ─── Response Wrapper ─── */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/* ─── Report Types ─── */

export interface EndOfDayReport {
    period: { start: string; end: string };
    summary: {
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        uniqueCustomers: number;
        revenueChangePercent: number | null;
        ordersChangePercent: number | null;
    };
    paymentBreakdown: { method: string; amount: number; count: number }[];
    categoryBreakdown: { name: string; amount: number }[];
    vatBreakdown: { group: string; amount: number }[];
}

export interface ProductSalesReport {
    period: { start: string; end: string };
    summary: { totalRevenue: number; totalQty: number; productCount: number };
    products: {
        productId: string;
        name: string;
        category: string;
        kitchenGroup: string;
        qtySold: number;
        revenue: number;
        avgPrice: number;
        trend: 'up' | 'down' | 'neutral';
        trendPct: number;
    }[];
}

export interface StatisticsReport {
    period: { start: string; end: string; type: string };
    kpi: {
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        uniqueCustomers: number;
        revenueChange: number | null;
        ordersChange: number | null;
    };
    weeklyData: { date: string; revenue: number; orders: number }[];
    peakHours: { hour: number; count: number; revenue: number; score: number }[];
    categoryShare: { name: string; amount: number; pct: number }[];
}

export interface ShiftsReport {
    date: string;
    summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
    shifts: {
        name: string;
        icon: string;
        startTime: string;
        endTime: string;
        status: 'open' | 'closed' | 'upcoming';
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        paymentBreakdown: { method: string; amount: number }[];
        orderTypeBreakdown: { type: string; count: number }[];
        topPersonnel: { name: string; orders: number; revenue: number }[];
    }[];
}

export interface StockReport {
    summary: {
        tukendi: number;
        kritik: number;
        dusuk: number;
        normal: number;
        fazla: number;
    };
    products: {
        id: string;
        name: string;
        category: string;
        kitchenGroup: string;
        currentStock: number;
        minStock: number;
        lowStock: number;
        status: 'tukendi' | 'kritik' | 'dusuk' | 'normal' | 'fazla';
        fillPct: number;
    }[];
}

export interface WasteReport {
    period: { start: string; end: string };
    summary: { totalRecords: number; totalLoss: number; avgLoss: number };
    reasonBreakdown: { reason: string; count: number; loss: number; pct: number }[];
    records: {
        id: string;
        productId: string;
        productName: string;
        category: string;
        kitchenGroup: string;
        quantity: number;
        unitCost: number;
        totalLoss: number;
        reason: string;
        date: string;
        time: string;
    }[];
}
