import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import type { FinanceCategory, FinanceTransaction, TransactionType, PaymentMethod } from '../types';
import { generateId, nowISO } from '../../_shared/helpers';

interface TransactionFilters {
    type?: TransactionType | '';
    dateFrom?: string;
    dateTo?: string;
    companyId?: string;
    categoryId?: string;
}

export const financeService = {
    async fetchCategories(type?: TransactionType | ''): Promise<FinanceCategory[]> {
        const db = await getDb();
        if (!db) {
            try {
                const url = type ? `/finance/categories?type=${type}` : '/finance/categories';
                const res = await api.get(url);
                const data = res.data;
                return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            } catch { return []; }
        }

        if (type) {
            return db.select<FinanceCategory[]>(
                'SELECT id, name, type, icon, color, is_default, created_at FROM finance_categories WHERE type = $1 ORDER BY name ASC',
                [type]
            );
        }
        return db.select<FinanceCategory[]>(
            'SELECT id, name, type, icon, color, is_default, created_at FROM finance_categories ORDER BY type ASC, name ASC'
        );
    },

    async createCategory(data: { name: string; type: TransactionType; icon?: string; color?: string }): Promise<string> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.post('/finance/categories', data);
                const result = res.data?.data || res.data;
                return result?.id || '';
            } catch (err) { throw new Error('API: Kategori oluşturulamadı'); }
        }

        const id = generateId();
        await db.execute(
            'INSERT INTO finance_categories (id, name, type, icon, color, is_default, created_at) VALUES ($1, $2, $3, $4, $5, 0, $6)',
            [id, data.name, data.type, data.icon ?? null, data.color ?? null, nowISO()]
        );
        return id;
    },

    _getDemoTransactions(): FinanceTransaction[] {
        const today = new Date();
        const d = (daysAgo: number) => {
            const dt = new Date(today);
            dt.setDate(dt.getDate() - daysAgo);
            return dt.toISOString().split('T')[0];
        };
        return [
            { id: 'demo-ft-1', type: 'EXPENSE' as TransactionType, amount: 2450, currency: 'TRY', date: d(0), description: 'Sebze-meyve alımı', category_id: 'exp_hammadde', category_name: 'Hammadde', category_icon: 'restaurant', payment_method: 'CASH' as PaymentMethod, created_at: d(0), updated_at: d(0) },
            { id: 'demo-ft-2', type: 'EXPENSE' as TransactionType, amount: 1850, currency: 'TRY', date: d(1), description: 'Et ve tavuk siparişi', category_id: 'exp_hammadde', category_name: 'Hammadde', category_icon: 'restaurant', payment_method: 'BANK_TRANSFER' as PaymentMethod, created_at: d(1), updated_at: d(1) },
            { id: 'demo-ft-3', type: 'INCOME' as TransactionType, amount: 8750, currency: 'TRY', date: d(0), description: 'Günlük satış hasılatı', category_id: 'inc_satis', category_name: 'Satış Geliri', category_icon: 'payments', payment_method: 'CASH' as PaymentMethod, created_at: d(0), updated_at: d(0) },
            { id: 'demo-ft-4', type: 'INCOME' as TransactionType, amount: 5200, currency: 'TRY', date: d(0), description: 'Kredi kartı tahsilatı', category_id: 'inc_satis', category_name: 'Satış Geliri', category_icon: 'payments', payment_method: 'CARD' as PaymentMethod, created_at: d(0), updated_at: d(0) },
            { id: 'demo-ft-5', type: 'EXPENSE' as TransactionType, amount: 680, currency: 'TRY', date: d(2), description: 'Temizlik malzemesi', category_id: 'exp_genel', category_name: 'Genel Gider', category_icon: 'cleaning_services', payment_method: 'CASH' as PaymentMethod, created_at: d(2), updated_at: d(2) },
            { id: 'demo-ft-6', type: 'EXPENSE' as TransactionType, amount: 3200, currency: 'TRY', date: d(3), description: 'Elektrik faturası', category_id: 'exp_fatura', category_name: 'Faturalar', category_icon: 'bolt', payment_method: 'BANK_TRANSFER' as PaymentMethod, created_at: d(3), updated_at: d(3) },
            { id: 'demo-ft-7', type: 'INCOME' as TransactionType, amount: 4500, currency: 'TRY', date: d(1), description: 'Yemek kartı tahsilatı', category_id: 'inc_satis', category_name: 'Satış Geliri', category_icon: 'payments', payment_method: 'CARD' as PaymentMethod, created_at: d(1), updated_at: d(1) },
            { id: 'demo-ft-8', type: 'INCOME' as TransactionType, amount: 12000, currency: 'TRY', date: d(2), description: 'Catering siparişi - Şirket toplantısı', category_id: 'inc_catering', category_name: 'Catering', category_icon: 'room_service', payment_method: 'BANK_TRANSFER' as PaymentMethod, created_at: d(2), updated_at: d(2) },
            { id: 'demo-ft-9', type: 'EXPENSE' as TransactionType, amount: 890, currency: 'TRY', date: d(4), description: 'İçecek stoku', category_id: 'exp_hammadde', category_name: 'Hammadde', category_icon: 'restaurant', payment_method: 'CASH' as PaymentMethod, created_at: d(4), updated_at: d(4) },
            { id: 'demo-ft-10', type: 'EXPENSE' as TransactionType, amount: 1500, currency: 'TRY', date: d(5), description: 'Doğalgaz faturası', category_id: 'exp_fatura', category_name: 'Faturalar', category_icon: 'local_fire_department', payment_method: 'BANK_TRANSFER' as PaymentMethod, created_at: d(5), updated_at: d(5) },
            { id: 'demo-ft-11', type: 'INCOME' as TransactionType, amount: 6800, currency: 'TRY', date: d(3), description: 'Paket sipariş gelirleri', category_id: 'inc_satis', category_name: 'Satış Geliri', category_icon: 'delivery_dining', payment_method: 'CARD' as PaymentMethod, created_at: d(3), updated_at: d(3) },
            { id: 'demo-ft-12', type: 'EXPENSE' as TransactionType, amount: 420, currency: 'TRY', date: d(6), description: 'Kırtasiye ve ambalaj', category_id: 'exp_genel', category_name: 'Genel Gider', category_icon: 'inventory_2', payment_method: 'CASH' as PaymentMethod, created_at: d(6), updated_at: d(6) },
        ] as FinanceTransaction[];
    },

    _getDemoMonthlyBreakdown(): { month: number; income: number; expense: number }[] {
        const currentMonth = new Date().getMonth() + 1;
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            if (m > currentMonth) return { month: m, income: 0, expense: 0 };
            const base = 18000 + Math.floor(Math.random() * 8000);
            return {
                month: m,
                income: base + Math.floor(Math.random() * 12000),
                expense: Math.floor(base * 0.4) + Math.floor(Math.random() * 4000),
            };
        });
    },

    async fetchTransactions(filters: TransactionFilters = {}): Promise<FinanceTransaction[]> {
        const db = await getDb();
        if (!db) {
            try {
                const params = new URLSearchParams();
                if (filters.type) params.set('type', filters.type);
                if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
                if (filters.dateTo) params.set('dateTo', filters.dateTo);
                if (filters.companyId) params.set('companyId', filters.companyId);
                if (filters.categoryId) params.set('categoryId', filters.categoryId);
                const qs = params.toString();
                const res = await api.get(`/finance/transactions${qs ? `?${qs}` : ''}`);
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : this._getDemoTransactions();
            } catch { return this._getDemoTransactions(); }
        }

        let query = `SELECT ft.id, ft.company_id, ft.category_id, ft.type, ft.amount, ft.currency,
                            ft.description, ft.date, ft.payment_method, ft.created_at, ft.updated_at,
                            c.name as company_name,
                            fc.name as category_name, fc.icon as category_icon, fc.color as category_color
                     FROM finance_transactions ft
                     LEFT JOIN companies c ON ft.company_id = c.id
                     LEFT JOIN finance_categories fc ON ft.category_id = fc.id
                     WHERE 1=1`;
        const params: (string | number)[] = [];
        let idx = 1;

        if (filters.type) {
            query += ` AND ft.type = $${idx}`;
            params.push(filters.type);
            idx++;
        }
        if (filters.dateFrom) {
            query += ` AND ft.date >= $${idx}`;
            params.push(filters.dateFrom);
            idx++;
        }
        if (filters.dateTo) {
            query += ` AND ft.date <= $${idx}`;
            params.push(filters.dateTo);
            idx++;
        }
        if (filters.companyId) {
            query += ` AND ft.company_id = $${idx}`;
            params.push(filters.companyId);
            idx++;
        }
        if (filters.categoryId) {
            query += ` AND ft.category_id = $${idx}`;
            params.push(filters.categoryId);
            idx++;
        }

        query += ' ORDER BY ft.date DESC, ft.created_at DESC';
        const result = await db.select<FinanceTransaction[]>(query, params);
        return result.length > 0 ? result : this._getDemoTransactions();
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
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.post('/finance/transactions', data);
                const result = res.data?.data || res.data;
                return result?.id || '';
            } catch (err) { throw new Error('API: İşlem oluşturulamadı'); }
        }

        const id = generateId();
        const now = nowISO();
        await db.execute(
            `INSERT INTO finance_transactions (id, company_id, category_id, employee_id, type, amount, currency, description, date, payment_method, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [id, data.company_id ?? null, data.category_id ?? null, data.employee_id ?? null, data.type, data.amount, data.currency ?? 'TRY', data.description ?? null, data.date, data.payment_method ?? null, now, now]
        );
        return id;
    },

    async updateTransaction(id: string, data: Partial<FinanceTransaction>): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/transactions/${id}`, data);
            } catch { /* silent fail for API */ }
            return;
        }

        const allowed = ['company_id', 'category_id', 'type', 'amount', 'currency', 'description', 'date', 'payment_method'] as const;
        const fields: string[] = [];
        const values: (string | number | null)[] = [id];
        let idx = 2;

        for (const key of allowed) {
            if (key in data) {
                fields.push(`${key} = $${idx}`);
                values.push((data as Record<string, unknown>)[key] as string | number | null);
                idx++;
            }
        }
        if (fields.length === 0) return;

        fields.push(`updated_at = $${idx}`);
        values.push(nowISO());

        await db.execute(`UPDATE finance_transactions SET ${fields.join(', ')} WHERE id = $1`, values);
    },

    async deleteTransaction(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.delete(`/finance/transactions/${id}`);
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute('DELETE FROM finance_transactions WHERE id = $1', [id]);
    },

    async getPayrollPayments(month: number, year: number): Promise<{ employee_id: string; total_paid: number }[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/payroll-payments?month=${month}&year=${year}`);
                const data = res.data;
                return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            } catch { return []; }
        }

        const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
        const dateToMonth = month === 12 ? 1 : month + 1;
        const dateToYear = month === 12 ? year + 1 : year;
        const dateTo = `${dateToYear}-${String(dateToMonth).padStart(2, '0')}-01`;

        return db.select<{ employee_id: string; total_paid: number }[]>(
            `SELECT employee_id, COALESCE(SUM(amount), 0) as total_paid
             FROM finance_transactions
             WHERE employee_id IS NOT NULL
               AND type = 'EXPENSE'
               AND category_id = 'exp_maas'
               AND date >= $1 AND date < $2
             GROUP BY employee_id`,
            [dateFrom, dateTo]
        );
    },

    async getMonthlyBreakdown(year: number): Promise<{ month: number; income: number; expense: number }[]> {
        const db = await getDb();
        const result: { month: number; income: number; expense: number }[] = [];
        for (let m = 1; m <= 12; m++) result.push({ month: m, income: 0, expense: 0 });
        if (!db) {
            try {
                const res = await api.get(`/finance/monthly-breakdown?year=${year}`);
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : this._getDemoMonthlyBreakdown();
            } catch { return this._getDemoMonthlyBreakdown(); }
        }

        const rows = await db.select<{ m: number; type: string; total: number }[]>(
            `SELECT CAST(strftime('%m', date) AS INTEGER) as m, type, COALESCE(SUM(amount), 0) as total
             FROM finance_transactions
             WHERE strftime('%Y', date) = $1
             GROUP BY m, type
             ORDER BY m`,
            [String(year)]
        );

        if (rows.length === 0) return this._getDemoMonthlyBreakdown();

        for (const row of rows) {
            const entry = result[row.m - 1];
            if (row.type === 'INCOME') entry.income = row.total;
            else if (row.type === 'EXPENSE') entry.expense = row.total;
        }
        return result;
    },

    async getSummary(dateFrom?: string, dateTo?: string): Promise<{ totalIncome: number; totalExpense: number; netBalance: number }> {
        const db = await getDb();
        if (!db) {
            try {
                const params = new URLSearchParams();
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);
                const qs = params.toString();
                const res = await api.get(`/finance/summary${qs ? `?${qs}` : ''}`);
                const data = res.data?.data || res.data;
                if (data && typeof data.totalIncome === 'number') return data;
                return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
            } catch { return { totalIncome: 0, totalExpense: 0, netBalance: 0 }; }
        }

        let query = `SELECT type, COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE 1=1`;
        const params: string[] = [];
        let idx = 1;

        if (dateFrom) {
            query += ` AND date >= $${idx}`;
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            query += ` AND date <= $${idx}`;
            params.push(dateTo);
            idx++;
        }
        query += ' GROUP BY type';

        const rows = await db.select<{ type: string; total: number }[]>(query, params);
        const income = rows.find((r) => r.type === 'INCOME')?.total ?? 0;
        const expense = rows.find((r) => r.type === 'EXPENSE')?.total ?? 0;

        // Veri yoksa demo değerler döndür
        if (income === 0 && expense === 0) {
            return { totalIncome: 28750, totalExpense: 8420, netBalance: 20330 };
        }

        return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
    },
};
