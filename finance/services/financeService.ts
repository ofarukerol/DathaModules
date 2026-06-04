// Gelir/Gider (FinanceTransaction) + Kategori servisi — DathaModules submodule (Manager+Desktop ORTAK).
// Gercek backend ile senkron: okuma GET /finance/*, yazma POST /finance/sync/push.
// BIRIM: backend kurus (int), frontend lira (formatCurrency lira gosterir) -> sinirda *100 / /100.
// Enrichment (kategori adi/ikon/renk, cari adi) client-side join ile yapilir (backend bare doner).
import api from '../../_shared/api';
import { generateId, nowISO } from '../../_shared/helpers';
import type { FinanceCategory, FinanceTransaction, TransactionType, PaymentMethod } from '../types';
import type {
    FinanceTransactionView,
    FinanceCategoryView,
    CompanyView,
    FinanceSyncOpResult,
} from '@/types/backend/finance';

interface TransactionFilters {
    type?: TransactionType | '';
    dateFrom?: string;
    dateTo?: string;
    companyId?: string;
    categoryId?: string;
}

const toLira = (kurus: number | null | undefined): number => Math.round(kurus ?? 0) / 100;
const toKurus = (lira: number | null | undefined): number => Math.round((lira ?? 0) * 100);
const dateOnly = (iso: string): string => (iso ? iso.split('T')[0] : iso);

function unwrap<T>(payload: unknown): T | undefined {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

async function pushTransactionOp(
    op: 'UPSERT' | 'DELETE',
    localId: string,
    data?: Record<string, unknown>,
): Promise<string | null> {
    const res = await api.post('/finance/sync/push', {
        ops: [{ entity: 'transaction', op, localId, updatedAt: nowISO(), data }],
    });
    const result = unwrap<{ results?: FinanceSyncOpResult[] }>(res.data);
    return result?.results?.[0]?.serverId ?? null;
}

function mapCategory(v: FinanceCategoryView): FinanceCategory {
    return {
        id: v.id,
        name: v.name,
        type: v.type as TransactionType,
        icon: v.icon ?? undefined,
        color: v.color ?? undefined,
        is_default: v.isDefault ? 1 : 0,
        created_at: v.createdAt,
    };
}

function mapTransaction(v: FinanceTransactionView): FinanceTransaction {
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        company_id: v.companyId ?? undefined,
        category_id: v.categoryId ?? undefined,
        employee_id: v.employeeId ?? undefined,
        type: v.type as TransactionType,
        amount: toLira(v.amount),
        currency: v.currency,
        description: v.description ?? undefined,
        date: dateOnly(v.date),
        payment_method: (v.paymentMethod as PaymentMethod | null) ?? undefined,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
    };
}

async function fetchCompanyNameMap(): Promise<Map<string, string>> {
    try {
        const res = await api.get('/finance/companies');
        const raw = unwrap<CompanyView[]>(res.data) ?? [];
        return new Map(raw.map((c) => [c.id, c.name]));
    } catch {
        return new Map();
    }
}

export const financeService = {
    async fetchCategories(type?: TransactionType | ''): Promise<FinanceCategory[]> {
        try {
            const res = await api.get('/finance/categories');
            let list = (unwrap<FinanceCategoryView[]>(res.data) ?? []).map(mapCategory);
            if (type) list = list.filter((c) => c.type === type);
            return list;
        } catch {
            return [];
        }
    },

    async createCategory(data: { name: string; type: TransactionType; icon?: string; color?: string }): Promise<string> {
        const localId = generateId();
        const res = await api.post('/finance/sync/push', {
            ops: [{
                entity: 'category', op: 'UPSERT', localId, updatedAt: nowISO(),
                data: { name: data.name, type: data.type, icon: data.icon ?? null, color: data.color ?? null },
            }],
        });
        const result = unwrap<{ results?: FinanceSyncOpResult[] }>(res.data);
        return result?.results?.[0]?.serverId ?? localId;
    },

    /** Gelir/gider islemleri — kategori + cari adlariyla zenginlestirilmis. */
    async fetchTransactions(filters: TransactionFilters = {}): Promise<FinanceTransaction[]> {
        const list = await this._rawTransactions(filters);
        const [categories, companyNames] = await Promise.all([
            this.fetchCategories(),
            fetchCompanyNameMap(),
        ]);
        const catMap = new Map(categories.map((c) => [c.id, c]));
        return list.map((t) => {
            const cat = t.category_id ? catMap.get(t.category_id) : undefined;
            return {
                ...t,
                category_name: cat?.name,
                category_icon: cat?.icon,
                category_color: cat?.color,
                company_name: t.company_id ? companyNames.get(t.company_id) : undefined,
            };
        });
    },

    /** Ham islem listesi (enrichment'siz) — ozet/grafik hesaplari icin. */
    async _rawTransactions(filters: TransactionFilters = {}): Promise<FinanceTransaction[]> {
        try {
            const res = await api.get('/finance/transactions');
            let list = (unwrap<FinanceTransactionView[]>(res.data) ?? []).map(mapTransaction);
            if (filters.type) list = list.filter((t) => t.type === filters.type);
            if (filters.dateFrom) list = list.filter((t) => t.date >= filters.dateFrom!);
            if (filters.dateTo) list = list.filter((t) => t.date <= filters.dateTo!);
            if (filters.companyId) list = list.filter((t) => t.company_id === filters.companyId);
            if (filters.categoryId) list = list.filter((t) => t.category_id === filters.categoryId);
            return list;
        } catch {
            return [];
        }
    },

    async createTransaction(data: {
        company_id?: string;
        category_id?: string;
        employee_id?: string;
        type: TransactionType;
        amount: number;
        currency?: string;
        description?: string;
        date: string;
        payment_method?: PaymentMethod;
    }): Promise<string> {
        const localId = generateId();
        const serverId = await pushTransactionOp('UPSERT', localId, {
            type: data.type,
            amount: toKurus(data.amount),
            currency: data.currency ?? 'TRY',
            description: data.description ?? null,
            date: data.date,
            categoryId: data.category_id ?? null,
            companyId: data.company_id ?? null,
            paymentMethod: data.payment_method ?? null,
            employeeId: data.employee_id ?? null,
        });
        return serverId ?? localId;
    },

    async updateTransaction(id: string, data: Partial<FinanceTransaction>, localId?: string): Promise<void> {
        const payload: Record<string, unknown> = {};
        if (data.type !== undefined) payload.type = data.type;
        if (data.amount !== undefined) payload.amount = toKurus(data.amount);
        if (data.currency !== undefined) payload.currency = data.currency;
        if (data.description !== undefined) payload.description = data.description ?? null;
        if (data.date !== undefined) payload.date = data.date;
        if (data.category_id !== undefined) payload.categoryId = data.category_id ?? null;
        if (data.company_id !== undefined) payload.companyId = data.company_id ?? null;
        if (data.payment_method !== undefined) payload.paymentMethod = data.payment_method ?? null;
        if (data.employee_id !== undefined) payload.employeeId = data.employee_id ?? null;
        await pushTransactionOp('UPSERT', localId ?? id, payload);
    },

    async deleteTransaction(id: string, localId?: string): Promise<void> {
        await pushTransactionOp('DELETE', localId ?? id);
    },

    async getPayrollPayments(month: number, year: number): Promise<{ employee_id: string; total_paid: number }[]> {
        try {
            const res = await api.get('/payroll/summary', { params: { month, year } });
            const rows = (unwrap<{ employeeId: string; totalPaid: number }[]>(res.data)) ?? [];
            return rows.map((r) => ({ employee_id: r.employeeId, total_paid: r.totalPaid }));
        } catch {
            return [];
        }
    },

    async saveSalaryPayments(payload: {
        month: number;
        year: number;
        method: string;
        date: string;
        payments: { employeeId: string; amount: number; description: string }[];
    }): Promise<void> {
        await api.post('/payroll/payments', payload);
    },

    async getMonthlyBreakdown(year: number): Promise<{ month: number; income: number; expense: number }[]> {
        const result = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }));
        const list = await this._rawTransactions({ dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` });
        for (const t of list) {
            const m = Number(t.date.slice(5, 7));
            if (m < 1 || m > 12) continue;
            const entry = result[m - 1];
            if (t.type === 'INCOME') entry.income += t.amount;
            else entry.expense += t.amount;
        }
        return result;
    },

    async getSummary(dateFrom?: string, dateTo?: string): Promise<{ totalIncome: number; totalExpense: number; netBalance: number }> {
        const list = await this._rawTransactions({ dateFrom, dateTo });
        let totalIncome = 0;
        let totalExpense = 0;
        for (const t of list) {
            if (t.type === 'INCOME') totalIncome += t.amount;
            else totalExpense += t.amount;
        }
        return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense };
    },
};
