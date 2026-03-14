import { create } from 'zustand';
import { bankTransactionService, BankTransaction } from '../services/bankTransactionService';

interface BankTransactionStore {
    transactions: BankTransaction[];
    isLoading: boolean;

    fetchTransactions: (accountId: string) => Promise<void>;
    addTransaction: (data: Omit<BankTransaction, 'id' | 'created_at'>) => Promise<void>;
    bulkAddTransactions: (transactions: Omit<BankTransaction, 'id' | 'created_at'>[]) => Promise<void>;
    updateTransaction: (id: string, data: Partial<Omit<BankTransaction, 'id' | 'created_at'>>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    matchTransaction: (id: string, financeTransactionId: string) => Promise<void>;
    unmatchTransaction: (id: string) => Promise<void>;
}

export const useBankTransactionStore = create<BankTransactionStore>((set, get) => ({
    transactions: [],
    isLoading: false,

    fetchTransactions: async (accountId: string) => {
        set({ isLoading: true });
        try {
            const data = await bankTransactionService.getByAccountId(accountId);
            set({ transactions: data, isLoading: false });
        } catch (err) {
            set({ isLoading: false });
        }
    },

    addTransaction: async (data) => {
        const id = crypto.randomUUID();
        const newTx: BankTransaction = {
            ...data,
            id,
            created_at: new Date().toISOString(),
        };

        set((state) => ({ transactions: [newTx, ...state.transactions] }));

        try {
            await bankTransactionService.create({ ...data, id });
        } catch (err) {
            set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
        }
    },

    bulkAddTransactions: async (transactions) => {
        const withIds = transactions.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        }));

        set((state) => ({ transactions: [...withIds, ...state.transactions] }));

        try {
            await bankTransactionService.bulkCreate(withIds.map(({ created_at, ...rest }) => rest));
        } catch (err) {
            const ids = new Set<string>(withIds.map((t) => t.id));
            set((state) => ({ transactions: state.transactions.filter((t) => !ids.has(t.id)) }));
        }
    },

    updateTransaction: async (id, data) => {
        const prev = get().transactions;
        set((state) => ({
            transactions: state.transactions.map((t) => t.id === id ? { ...t, ...data } : t),
        }));

        try {
            await bankTransactionService.update(id, data);
        } catch (err) {
            set({ transactions: prev });
        }
    },

    deleteTransaction: async (id) => {
        const prev = get().transactions;
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));

        try {
            await bankTransactionService.delete(id);
        } catch (err) {
            set({ transactions: prev });
        }
    },

    matchTransaction: async (id, financeTransactionId) => {
        const prev = get().transactions;
        set((state) => ({
            transactions: state.transactions.map((t) =>
                t.id === id ? { ...t, matched_transaction_id: financeTransactionId } : t
            ),
        }));

        try {
            await bankTransactionService.matchTransaction(id, financeTransactionId);
        } catch (err) {
            set({ transactions: prev });
        }
    },

    unmatchTransaction: async (id) => {
        const prev = get().transactions;
        set((state) => ({
            transactions: state.transactions.map((t) =>
                t.id === id ? { ...t, matched_transaction_id: null } : t
            ),
        }));

        try {
            await bankTransactionService.unmatchTransaction(id);
        } catch (err) {
            set({ transactions: prev });
        }
    },
}));
