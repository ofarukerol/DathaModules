import { create } from 'zustand';
import { checkService } from '../services/checkService';
import type { CheckStats } from '../services/checkService';
import type { CheckNote, CheckType, CheckStatus } from '../types';

export type { CheckStats };

interface CheckStore {
    checks: CheckNote[];
    stats: CheckStats;
    loading: boolean;
    error: string | null;
    fetchChecks: () => Promise<void>;
    fetchStats: () => Promise<void>;
    addCheck: (data: {
        type: CheckType;
        company_id?: string;
        amount: number;
        currency?: string;
        issue_date: string;
        due_date: string;
        bank_name?: string;
        check_number?: string;
        notes?: string;
        endorser?: string;
    }) => Promise<void>;
    updateStatus: (id: string, status: CheckStatus) => Promise<void>;
    deleteCheck: (id: string) => Promise<void>;
}

export const useCheckStore = create<CheckStore>((set, get) => ({
    checks: [],
    stats: {
        receivedTotal: 0, receivedCount: 0,
        issuedTotal: 0, issuedCount: 0,
        pendingCount: 0, overdueCount: 0,
        dueThisWeekTotal: 0, dueThisWeekCount: 0,
        cashConversionRate: 0,
    },
    loading: false,
    error: null,

    fetchChecks: async () => {
        set({ loading: true, error: null });
        try {
            const checks = await checkService.fetchAll();
            set({ checks, loading: false });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    fetchStats: async () => {
        try {
            const stats = await checkService.fetchStats();
            set({ stats });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg });
        }
    },

    addCheck: async (data) => {
        set({ loading: true, error: null });
        try {
            await checkService.create(data);
            await get().fetchChecks();
            await get().fetchStats();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    updateStatus: async (id, status) => {
        try {
            await checkService.updateStatus(id, status);
            await get().fetchChecks();
            await get().fetchStats();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg });
        }
    },

    deleteCheck: async (id) => {
        try {
            await checkService.deleteCheck(id);
            await get().fetchChecks();
            await get().fetchStats();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg });
        }
    },
}));
