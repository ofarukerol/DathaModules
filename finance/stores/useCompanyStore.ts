// Cari (Company) store — DathaModules submodule (DathaManager + DathaDesktop ORTAK).
// Gercek backend ile senkron (companyService -> /finance/* + /finance/sync/push).
import { create } from 'zustand';
import { companyService } from '../services/companyService';
import type { Company, CompanyType } from '../types';
import { generateId } from '../../_shared/helpers';

export type { Company };

interface CompanyFilters {
    search: string;
    type: CompanyType | '';
}

interface CompanyTransaction {
    id: string;
    companyId: string;
    date: string;
    description: string;
    type: 'purchase' | 'payment';
    amount: number;
    invoiceNo?: string;
    method?: string;
    status: 'completed' | 'pending';
    createdAt: string;
}

interface CompanyStore {
    companies: Company[];
    transactions: CompanyTransaction[];
    loading: boolean;
    filters: CompanyFilters;

    fetchCompanies: () => Promise<void>;
    setFilters: (filters: Partial<CompanyFilters>) => void;
    addCompany: (data: { name: string; type: CompanyType; title?: string; phone?: string; email?: string; city?: string; address?: string; tax_number?: string; tax_office?: string; contact_person?: string; notes?: string }) => Promise<string>;
    updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;

    getCompanyById: (id: string) => Company | undefined;
    getTransactionsByCompany: (companyId: string) => CompanyTransaction[];
    getCompanyBalance: (companyId: string) => { totalPurchase: number; totalPayment: number; balance: number };
    addTransaction: (transaction: Omit<CompanyTransaction, 'id' | 'createdAt'>) => void;
    clearAll: () => void;
}

export const useCompanyStore = create<CompanyStore>()((set, get) => ({
    companies: [],
    transactions: [],
    loading: false,
    filters: { search: '', type: '' },

    fetchCompanies: async () => {
        set({ loading: true });
        try {
            const { search, type } = get().filters;
            const data = await companyService.fetchCompanies(search || undefined, type || undefined);
            set({ companies: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    setFilters: (newFilters) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
        void get().fetchCompanies();
    },

    addCompany: async (data) => {
        const id = await companyService.create(data);
        await get().fetchCompanies();
        return id;
    },

    updateCompany: async (id, updates) => {
        const localId = get().companies.find((c) => c.id === id)?.localId;
        try {
            await companyService.update(id, updates, localId);
            await get().fetchCompanies();
        } catch {
            // sessiz — bir sonraki fetch/socket ile duzelir
        }
    },

    deleteCompany: async (id) => {
        const prev = get().companies;
        const localId = prev.find((c) => c.id === id)?.localId;
        set((state) => ({ companies: state.companies.filter((c) => c.id !== id) }));
        try {
            await companyService.softDelete(id, localId);
        } catch {
            set({ companies: prev });
        }
    },

    getCompanyById: (id) => get().companies.find((c) => c.id === id),

    getTransactionsByCompany: (companyId) =>
        get().transactions
            .filter((t) => t.companyId === companyId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

    getCompanyBalance: (companyId) => {
        const company = get().companies.find((c) => c.id === companyId);
        if (company) {
            return { totalPurchase: 0, totalPayment: 0, balance: company.balance };
        }
        const txs = get().transactions.filter((t) => t.companyId === companyId);
        const totalPurchase = txs.filter((t) => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
        const totalPayment = txs.filter((t) => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
        return { totalPurchase, totalPayment, balance: totalPayment - totalPurchase };
    },

    addTransaction: (transaction) => set((state) => ({
        transactions: [
            ...state.transactions,
            { ...transaction, id: generateId(), createdAt: new Date().toISOString() },
        ],
    })),

    clearAll: () => set({ companies: [], transactions: [] }),
}));
