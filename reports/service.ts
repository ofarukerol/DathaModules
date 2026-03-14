import { api, isOnline } from '../_shared/api';
import type {
    ApiResponse,
    EndOfDayReport,
    ProductSalesReport,
    StatisticsReport,
    ShiftsReport,
    StockReport,
    WasteReport,
} from './types';

export const reportingService = {
    async getEndOfDay(date?: string): Promise<EndOfDayReport | null> {
        if (!isOnline()) return null;
        try {
            const params = date ? { date } : {};
            const res = await api.get<ApiResponse<EndOfDayReport>>('/reports/daily', { params });
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },

    async getProductSales(startDate?: string, endDate?: string): Promise<ProductSalesReport | null> {
        if (!isOnline()) return null;
        try {
            const params: Record<string, string> = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const res = await api.get<ApiResponse<ProductSalesReport>>('/reports/product-sales', { params });
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },

    async getStatistics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<StatisticsReport | null> {
        if (!isOnline()) return null;
        try {
            const res = await api.get<ApiResponse<StatisticsReport>>('/reports/statistics', { params: { period } });
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },

    async getShifts(date?: string): Promise<ShiftsReport | null> {
        if (!isOnline()) return null;
        try {
            const params = date ? { date } : {};
            const res = await api.get<ApiResponse<ShiftsReport>>('/reports/shifts', { params });
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },

    async getStock(): Promise<StockReport | null> {
        if (!isOnline()) return null;
        try {
            const res = await api.get<ApiResponse<StockReport>>('/reports/stock');
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },

    async getWaste(startDate?: string, endDate?: string): Promise<WasteReport | null> {
        if (!isOnline()) return null;
        try {
            const params: Record<string, string> = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const res = await api.get<ApiResponse<WasteReport>>('/reports/waste', { params });
            return res.data?.data ?? null;
        } catch {
            return null;
        }
    },
};
