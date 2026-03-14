import { create } from 'zustand';
import { bankService } from '../services/bankService';
import type { BankAccount, BankTransaction, BankTransactionType } from '../types';

interface BankStore {
    accounts: BankAccount[];
    transactions: BankTransaction[];
    recentTransactions: BankTransaction[];
    monthlyDeposits: number;
    monthlyWithdrawals: number;
    loading: boolean;
    error: string | null;
    selectedAccountId: string | null;
    fetchAccounts: () => Promise<void>;
    addAccount: (data: { name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number }) => Promise<void>;
    updateAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    fetchTransactions: (accountId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
    fetchRecentTransactions: () => Promise<void>;
    fetchMonthlyStats: () => Promise<void>;
    addTransaction: (data: { bank_account_id: string; company_id?: string; type: BankTransactionType; amount: number; description?: string; date: string }) => Promise<void>;
    setSelectedAccount: (id: string | null) => void;
}

export const useBankStore = create<BankStore>((set, get) => ({
    accounts: [],
    transactions: [],
    recentTransactions: [],
    monthlyDeposits: 0,
    monthlyWithdrawals: 0,
    loading: false,
    error: null,
    selectedAccountId: null,

    setSelectedAccount: (id) => set({ selectedAccountId: id }),

    fetchAccounts: async () => {
        set({ loading: true, error: null });
        try {
            const accounts = await bankService.fetchAccounts();
            set({ accounts, loading: false });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    addAccount: async (data) => {
        set({ loading: true, error: null });
        try {
            await bankService.create(data);
            await get().fetchAccounts();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    updateAccount: async (id, data) => {
        set({ loading: true, error: null });
        try {
            await bankService.update(id, data);
            await get().fetchAccounts();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    deleteAccount: async (id) => {
        set({ loading: true, error: null });
        try {
            await bankService.deleteAccount(id);
            await get().fetchAccounts();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    fetchRecentTransactions: async () => {
        try {
            const recentTransactions = await bankService.fetchRecentTransactions(10);
            set({ recentTransactions });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg });
        }
    },

    fetchMonthlyStats: async () => {
        try {
            const stats = await bankService.fetchMonthlyStats();
            set({ monthlyDeposits: stats.deposits, monthlyWithdrawals: stats.withdrawals });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg });
        }
    },

    fetchTransactions: async (accountId, dateFrom, dateTo) => {
        set({ loading: true, error: null });
        try {
            const transactions = await bankService.fetchTransactions(accountId, dateFrom, dateTo);
            set({ transactions, loading: false });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },

    addTransaction: async (data) => {
        set({ loading: true, error: null });
        try {
            await bankService.createTransaction(data);
            await get().fetchAccounts();
            if (get().selectedAccountId) {
                await get().fetchTransactions(get().selectedAccountId!);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            set({ error: msg, loading: false });
        }
    },
}));
