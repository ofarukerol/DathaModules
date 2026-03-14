import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FinanceCategory {
    id: string;
    label: string;
    icon: string;
    type: 'income' | 'expense';
    isSystem?: boolean;
}

interface FinanceCategoryStore {
    categories: FinanceCategory[];
    addCategory: (category: Omit<FinanceCategory, 'id'>) => void;
    updateCategory: (id: string, updates: Partial<Omit<FinanceCategory, 'id' | 'type'>>) => void;
    deleteCategory: (id: string) => void;
    getCategoriesByType: (type: 'income' | 'expense') => FinanceCategory[];
}

const defaultCategories: FinanceCategory[] = [
    // Gider Kategorileri
    { id: 'exp_maas', label: 'Maaş', icon: 'groups', type: 'expense', isSystem: true },
    { id: 'exp_kira', label: 'Kira', icon: 'home', type: 'expense', isSystem: true },
    { id: 'exp_fatura', label: 'Fatura (Elektrik/Su/Doğalgaz)', icon: 'bolt', type: 'expense', isSystem: true },
    { id: 'exp_hammadde', label: 'Hammadde / Malzeme', icon: 'inventory_2', type: 'expense', isSystem: true },
    { id: 'exp_vergi', label: 'Vergi', icon: 'gavel', type: 'expense', isSystem: true },
    { id: 'exp_temizlik', label: 'Temizlik', icon: 'cleaning_services', type: 'expense' },
    { id: 'exp_pazarlama', label: 'Pazarlama / Reklam', icon: 'campaign', type: 'expense' },
    { id: 'exp_bakim', label: 'Bakım / Onarım', icon: 'build', type: 'expense' },
    { id: 'exp_ulasim', label: 'Ulaşım / Kargo', icon: 'local_shipping', type: 'expense' },
    { id: 'exp_sigorta', label: 'Sigorta', icon: 'health_and_safety', type: 'expense' },
    { id: 'exp_muhasebe', label: 'Muhasebe', icon: 'calculate', type: 'expense' },
    { id: 'exp_teknoloji', label: 'Teknoloji / Yazılım', icon: 'devices', type: 'expense' },
    { id: 'exp_ambalaj', label: 'Ambalaj', icon: 'package_2', type: 'expense' },
    { id: 'exp_egitim', label: 'Eğitim', icon: 'school', type: 'expense' },
    { id: 'exp_diger', label: 'Diğer', icon: 'more_horiz', type: 'expense', isSystem: true },

    // Gelir Kategorileri
    { id: 'inc_satis', label: 'Satış', icon: 'point_of_sale', type: 'income', isSystem: true },
    { id: 'inc_hizmet', label: 'Hizmet', icon: 'handyman', type: 'income', isSystem: true },
    { id: 'inc_yatirim', label: 'Yatırım', icon: 'trending_up', type: 'income' },
    { id: 'inc_kira', label: 'Kira Geliri', icon: 'real_estate_agent', type: 'income' },
    { id: 'inc_komisyon', label: 'Komisyon', icon: 'handshake', type: 'income' },
    { id: 'inc_iade', label: 'İade', icon: 'undo', type: 'income' },
    { id: 'inc_diger', label: 'Diğer', icon: 'more_horiz', type: 'income', isSystem: true },
];

export const useFinanceCategoryStore = create<FinanceCategoryStore>()(
    persist(
        (set, get) => ({
            categories: defaultCategories,

            addCategory: (category) => set((state) => ({
                categories: [
                    ...state.categories,
                    { ...category, id: Math.random().toString(36).substr(2, 9) },
                ],
            })),

            updateCategory: (id, updates) => set((state) => ({
                categories: state.categories.map((c) =>
                    c.id === id ? { ...c, ...updates } : c
                ),
            })),

            deleteCategory: (id) => set((state) => ({
                categories: state.categories.filter((c) => c.id !== id || c.isSystem),
            })),

            getCategoriesByType: (type) =>
                get().categories.filter((c) => c.type === type),
        }),
        {
            name: 'finance-category-store',
            merge: (persistedState: any, currentState) => ({
                ...currentState,
                ...persistedState,
                categories: persistedState.categories || currentState.categories,
            }),
        }
    )
);
