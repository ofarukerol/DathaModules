import { api, isOnline } from '../_shared/api';
import { getDb } from '../../services/db';
import { useSubscriptionStore } from '../../stores/useSubscriptionStore';
import type {
    ApiResponse,
    EndOfDayReport,
    ProductSalesReport,
    StatisticsReport,
    ShiftsReport,
    StockReport,
    WasteReport,
} from './types';

function canUseBackendReports(): boolean {
    return isOnline() && useSubscriptionStore.getState().isPro();
}

/* ─── Local SQLite Fallback Helpers ─── */

async function getLocalEndOfDay(date?: string): Promise<EndOfDayReport | null> {
    try {
        const db = await getDb();
        if (!db) return null;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const orders = await db.select<{ total_amount: number; payment_method: string; id: string }[]>(
            `SELECT id, total_amount, payment_method FROM orders
             WHERE date(created_at, 'localtime') = $1 AND deleted_at IS NULL`,
            [targetDate]
        );

        if (orders.length === 0) return null;

        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const totalOrders = orders.length;

        const paymentMap: Record<string, { amount: number; count: number }> = {};
        for (const o of orders) {
            const method = o.payment_method || 'CASH';
            if (!paymentMap[method]) paymentMap[method] = { amount: 0, count: 0 };
            paymentMap[method].amount += o.total_amount || 0;
            paymentMap[method].count += 1;
        }

        return {
            period: { start: targetDate, end: targetDate },
            summary: {
                totalRevenue,
                totalOrders,
                avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                uniqueCustomers: 0,
                revenueChangePercent: null,
                ordersChangePercent: null,
            },
            paymentBreakdown: Object.entries(paymentMap).map(([method, data]) => ({
                method, amount: data.amount, count: data.count,
            })),
            categoryBreakdown: [],
            vatBreakdown: [],
        };
    } catch {
        return null;
    }
}

async function getLocalProductSales(startDate?: string, endDate?: string): Promise<ProductSalesReport | null> {
    try {
        const db = await getDb();
        if (!db) return null;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const items = await db.select<{
            product_name: string; product_id: string; quantity: number; unit_price: number;
        }[]>(
            `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as quantity, AVG(oi.unit_price) as unit_price
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE date(o.created_at, 'localtime') BETWEEN $1 AND $2 AND o.deleted_at IS NULL
             GROUP BY oi.product_id, oi.product_name`,
            [start, end]
        );

        const totalRevenue = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

        return {
            period: { start, end },
            summary: { totalRevenue, totalQty, productCount: items.length },
            products: items.map((i) => ({
                productId: i.product_id,
                name: i.product_name,
                category: '',
                kitchenGroup: '',
                qtySold: i.quantity,
                revenue: i.quantity * i.unit_price,
                avgPrice: i.unit_price,
                trend: 'neutral' as const,
                trendPct: 0,
            })),
        };
    } catch {
        return null;
    }
}

async function getLocalStatistics(period: string): Promise<StatisticsReport | null> {
    try {
        const db = await getDb();
        if (!db) return null;
        const now = new Date();
        const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
        const start = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = now.toISOString().split('T')[0];

        const dailyData = await db.select<{ day: string; revenue: number; orders: number }[]>(
            `SELECT date(created_at, 'localtime') as day, SUM(total_amount) as revenue, COUNT(*) as orders
             FROM orders WHERE date(created_at, 'localtime') BETWEEN $1 AND $2 AND deleted_at IS NULL
             GROUP BY day ORDER BY day`,
            [start, end]
        );

        const totalRevenue = dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0);
        const totalOrders = dailyData.reduce((sum, d) => sum + (d.orders || 0), 0);

        return {
            period: { start, end, type: period },
            kpi: {
                totalRevenue,
                totalOrders,
                avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                uniqueCustomers: 0,
                revenueChange: null,
                ordersChange: null,
            },
            weeklyData: dailyData.map((d) => ({ date: d.day, revenue: d.revenue || 0, orders: d.orders || 0 })),
            peakHours: [],
            categoryShare: [],
        };
    } catch {
        return null;
    }
}

/* ─── Service ─── */

export const reportingService = {
    async getEndOfDay(date?: string): Promise<EndOfDayReport | null> {
        if (canUseBackendReports()) {
            try {
                const params = date ? { date } : {};
                const res = await api.get<ApiResponse<EndOfDayReport>>('/reports/daily', { params });
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return getLocalEndOfDay(date);
    },

    async getProductSales(startDate?: string, endDate?: string): Promise<ProductSalesReport | null> {
        if (canUseBackendReports()) {
            try {
                const params: Record<string, string> = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                const res = await api.get<ApiResponse<ProductSalesReport>>('/reports/product-sales', { params });
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return getLocalProductSales(startDate, endDate);
    },

    async getStatistics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<StatisticsReport | null> {
        if (canUseBackendReports()) {
            try {
                const res = await api.get<ApiResponse<StatisticsReport>>('/reports/statistics', { params: { period } });
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return getLocalStatistics(period);
    },

    async getShifts(date?: string): Promise<ShiftsReport | null> {
        if (canUseBackendReports()) {
            try {
                const params = date ? { date } : {};
                const res = await api.get<ApiResponse<ShiftsReport>>('/reports/shifts', { params });
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return null;
    },

    async getStock(): Promise<StockReport | null> {
        if (canUseBackendReports()) {
            try {
                const res = await api.get<ApiResponse<StockReport>>('/reports/stock');
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return null;
    },

    async getWaste(startDate?: string, endDate?: string): Promise<WasteReport | null> {
        if (canUseBackendReports()) {
            try {
                const params: Record<string, string> = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                const res = await api.get<ApiResponse<WasteReport>>('/reports/waste', { params });
                return res.data?.data ?? null;
            } catch { /* fallback to local */ }
        }
        return null;
    },
};
