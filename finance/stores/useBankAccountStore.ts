import { create } from 'zustand';
import { bankAccountService, BankAccount } from '../services/bankAccountService';
import { uuidv7 } from '@/utils/uuid';

interface BankAccountStore {
    accounts: BankAccount[];
    isLoading: boolean;

    fetchAccounts: () => Promise<void>;
    addAccount: (data: { name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number; status?: 'active' | 'passive' }) => Promise<void>;
    updateAccount: (id: string, data: Partial<Omit<BankAccount, 'id' | 'created_at'>>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
}

export const useBankAccountStore = create<BankAccountStore>((set, get) => ({
    accounts: [],
    isLoading: false,

    fetchAccounts: async () => {
        set({ isLoading: true });
        try {
            const data = await bankAccountService.getAll();
            set({ accounts: data, isLoading: false });
        } catch (err) {
            set({ isLoading: false });
        }
    },

    addAccount: async (data) => {
        set({ isLoading: true });
        try {
            const id = uuidv7();
            await bankAccountService.create({ id, ...data });
            await get().fetchAccounts();
        } catch (err) {
            set({ isLoading: false });
        }
    },

    updateAccount: async (id, data) => {
        const prev = get().accounts;
        set((state) => ({
            accounts: state.accounts.map((a) => a.id === id ? { ...a, ...data } : a),
        }));

        try {
            await bankAccountService.update(id, data);
        } catch (err) {
            set({ accounts: prev });
        }
    },

    deleteAccount: async (id) => {
        const prev = get().accounts;
        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));

        try {
            await bankAccountService.delete(id);
        } catch (err) {
            set({ accounts: prev });
        }
    },
}));
