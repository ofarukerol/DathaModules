import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import type { BankAccount, BankTransaction, BankTransactionType } from '../types';
import { generateId, nowISO } from '../../_shared/helpers';

const BANK_THEME: Record<string, { code: string; color: string }> = {
    'Yapı Kredi': { code: 'YKB', color: '#003F7F' },
    'Akbank': { code: 'AKB', color: '#E30613' },
    'Garanti BBVA': { code: 'GAR', color: '#008246' },
    'Ziraat Bankası': { code: 'ZRT', color: '#ED1C24' },
    'İş Bankası': { code: 'İŞB', color: '#003399' },
    'Halkbank': { code: 'HLK', color: '#004E9E' },
    'Vakıfbank': { code: 'VKF', color: '#D4A017' },
    'QNB Finansbank': { code: 'QNB', color: '#780078' },
    'Denizbank': { code: 'DNZ', color: '#003370' },
    'TEB': { code: 'TEB', color: '#00A651' },
    'ING': { code: 'ING', color: '#FF6200' },
    'HSBC': { code: 'HSBC', color: '#DB0011' },
    'Enpara': { code: 'ENP', color: '#FF6B00' },
    'Papara': { code: 'PPR', color: '#663299' },
};

function deriveTheme(bankName: string) {
    return BANK_THEME[bankName] || { code: bankName.substring(0, 3).toUpperCase(), color: '#6B7280' };
}

const DEMO_ACCOUNTS: BankAccount[] = [
    { id: 'demo-bank-1', name: 'İşletme Hesabı', bank_name: 'Yapı Kredi', iban: 'TR12 0006 7010 0000 0012 3456 78', currency: 'TRY', balance: 84250, is_default: 1, code: 'YKB', color: '#003F7F', status: 'active', created_at: '2025-01-15T10:00:00Z', updated_at: '2026-03-13T10:00:00Z' },
    { id: 'demo-bank-2', name: 'Kasa Hesabı', bank_name: 'Akbank', iban: 'TR99 0004 6000 0088 8000 1234 56', currency: 'TRY', balance: 32100, is_default: 0, code: 'AKB', color: '#E30613', status: 'active', created_at: '2025-03-20T10:00:00Z', updated_at: '2026-03-12T10:00:00Z' },
    { id: 'demo-bank-3', name: 'POS Hesabı', bank_name: 'Garanti BBVA', iban: 'TR50 0006 2000 0140 0006 2991 11', currency: 'TRY', balance: 18750, is_default: 0, code: 'GAR', color: '#008246', status: 'active', created_at: '2025-06-10T10:00:00Z', updated_at: '2026-03-11T10:00:00Z' },
] as BankAccount[];

const DEMO_BANK_TXS: BankTransaction[] = (() => {
    const now = Date.now();
    return [
        { id: 'demo-btx-1', bank_account_id: 'demo-bank-1', type: 'DEPOSIT' as BankTransactionType, amount: 8750, description: 'Günlük satış hasılatı yatırma', date: new Date(now - 0 * 86400000).toISOString().split('T')[0], bank_name: 'Yapı Kredi', created_at: new Date(now).toISOString() },
        { id: 'demo-btx-2', bank_account_id: 'demo-bank-1', type: 'WITHDRAWAL' as BankTransactionType, amount: 2450, description: 'Tedarikçi ödemesi - Taze Gıda A.Ş.', date: new Date(now - 1 * 86400000).toISOString().split('T')[0], bank_name: 'Yapı Kredi', created_at: new Date(now - 86400000).toISOString() },
        { id: 'demo-btx-3', bank_account_id: 'demo-bank-2', type: 'DEPOSIT' as BankTransactionType, amount: 5200, description: 'Kart tahsilatı aktarım', date: new Date(now - 1 * 86400000).toISOString().split('T')[0], bank_name: 'Akbank', created_at: new Date(now - 86400000).toISOString() },
        { id: 'demo-btx-4', bank_account_id: 'demo-bank-3', type: 'DEPOSIT' as BankTransactionType, amount: 12400, description: 'POS tahsilatı', date: new Date(now - 0 * 86400000).toISOString().split('T')[0], bank_name: 'Garanti BBVA', created_at: new Date(now).toISOString() },
        { id: 'demo-btx-5', bank_account_id: 'demo-bank-1', type: 'WITHDRAWAL' as BankTransactionType, amount: 3200, description: 'Elektrik faturası ödeme', date: new Date(now - 3 * 86400000).toISOString().split('T')[0], bank_name: 'Yapı Kredi', created_at: new Date(now - 3 * 86400000).toISOString() },
        { id: 'demo-btx-6', bank_account_id: 'demo-bank-1', type: 'DEPOSIT' as BankTransactionType, amount: 6800, description: 'Paket sipariş gelirleri', date: new Date(now - 2 * 86400000).toISOString().split('T')[0], bank_name: 'Yapı Kredi', created_at: new Date(now - 2 * 86400000).toISOString() },
        { id: 'demo-btx-7', bank_account_id: 'demo-bank-2', type: 'WITHDRAWAL' as BankTransactionType, amount: 1500, description: 'Doğalgaz faturası', date: new Date(now - 4 * 86400000).toISOString().split('T')[0], bank_name: 'Akbank', created_at: new Date(now - 4 * 86400000).toISOString() },
        { id: 'demo-btx-8', bank_account_id: 'demo-bank-3', type: 'DEPOSIT' as BankTransactionType, amount: 9300, description: 'POS tahsilatı', date: new Date(now - 2 * 86400000).toISOString().split('T')[0], bank_name: 'Garanti BBVA', created_at: new Date(now - 2 * 86400000).toISOString() },
    ] as BankTransaction[];
})();

export const bankService = {
    async fetchAccounts(): Promise<BankAccount[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/banks');
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : DEMO_ACCOUNTS;
            } catch { return DEMO_ACCOUNTS; }
        }
        const result = await db.select<BankAccount[]>(
            'SELECT id, name, bank_name, iban, currency, balance, is_default, code, color, status, created_at, updated_at FROM bank_accounts ORDER BY is_default DESC, name ASC'
        );
        return result.length > 0 ? result : DEMO_ACCOUNTS;
    },

    async getById(id: string): Promise<BankAccount | null> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/banks/${id}`);
                const data = res.data?.data || res.data;
                return data || null;
            } catch { return null; }
        }
        const rows = await db.select<BankAccount[]>(
            'SELECT id, name, bank_name, iban, currency, balance, is_default, code, color, status, created_at, updated_at FROM bank_accounts WHERE id = $1',
            [id]
        );
        return rows[0] ?? null;
    },

    async create(data: { name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number }): Promise<string> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.post('/finance/banks', data);
                const result = res.data?.data || res.data;
                return result?.id || '';
            } catch (err) { throw new Error('API: Banka hesabı oluşturulamadı'); }
        }

        const id = generateId();
        const now = nowISO();
        const theme = deriveTheme(data.bank_name);
        await db.execute(
            `INSERT INTO bank_accounts (id, name, bank_name, iban, currency, balance, is_default, code, color, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)`,
            [id, data.name, data.bank_name, data.iban ?? null, data.currency ?? 'TRY', data.balance ?? 0, data.is_default ?? 0, theme.code, theme.color, now, now]
        );
        return id;
    },

    async update(id: string, data: Partial<BankAccount>): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/banks/${id}`, data);
            } catch { /* silent fail for API */ }
            return;
        }

        const allowed = ['name', 'bank_name', 'iban', 'currency', 'balance', 'is_default', 'code', 'color', 'status'] as const;
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

        await db.execute(`UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = $1`, values);
    },

    async deleteAccount(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.delete(`/finance/banks/${id}`);
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute('DELETE FROM bank_transactions WHERE bank_account_id = $1', [id]);
        await db.execute('DELETE FROM bank_accounts WHERE id = $1', [id]);
    },

    async fetchTransactions(accountId: string, dateFrom?: string, dateTo?: string): Promise<BankTransaction[]> {
        const db = await getDb();
        if (!db) {
            try {
                const params = new URLSearchParams({ accountId });
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);
                const res = await api.get(`/finance/bank-transactions?${params.toString()}`);
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : DEMO_BANK_TXS.filter(t => t.bank_account_id === accountId);
            } catch { return DEMO_BANK_TXS.filter(t => t.bank_account_id === accountId); }
        }

        let query = `SELECT bt.id, bt.bank_account_id, bt.company_id, bt.type, bt.amount,
                            bt.description, bt.date, bt.reference_id, bt.created_at,
                            ba.bank_name, c.name as company_name
                     FROM bank_transactions bt
                     LEFT JOIN bank_accounts ba ON bt.bank_account_id = ba.id
                     LEFT JOIN companies c ON bt.company_id = c.id
                     WHERE bt.bank_account_id = $1`;
        const params: (string | number)[] = [accountId];
        let idx = 2;

        if (dateFrom) {
            query += ` AND bt.date >= $${idx}`;
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            query += ` AND bt.date <= $${idx}`;
            params.push(dateTo);
            idx++;
        }

        query += ' ORDER BY bt.date DESC, bt.created_at DESC';
        return db.select<BankTransaction[]>(query, params);
    },

    async fetchRecentTransactions(limit: number = 10): Promise<BankTransaction[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/bank-transactions?limit=${limit}&recent=true`);
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : DEMO_BANK_TXS.slice(0, limit);
            } catch { return DEMO_BANK_TXS.slice(0, limit); }
        }
        const result = await db.select<BankTransaction[]>(
            `SELECT bt.id, bt.bank_account_id, bt.company_id, bt.type, bt.amount,
                    bt.description, bt.date, bt.reference_id, bt.created_at,
                    ba.bank_name, ba.name as account_name, c.name as company_name
             FROM bank_transactions bt
             LEFT JOIN bank_accounts ba ON bt.bank_account_id = ba.id
             LEFT JOIN companies c ON bt.company_id = c.id
             ORDER BY bt.date DESC, bt.created_at DESC
             LIMIT $1`,
            [limit]
        );
        return result.length > 0 ? result : DEMO_BANK_TXS.slice(0, limit);
    },

    async fetchMonthlyStats(): Promise<{ deposits: number; withdrawals: number }> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/bank-transactions/monthly-stats');
                const data = res.data?.data || res.data;
                if (data && typeof data.deposits === 'number') return data;
                return { deposits: 43250, withdrawals: 7150 };
            } catch { return { deposits: 43250, withdrawals: 7150 }; }
        }

        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const rows = await db.select<{ type: string; total: number }[]>(
            `SELECT type, COALESCE(SUM(amount), 0) as total
             FROM bank_transactions
             WHERE date >= $1 AND type IN ('DEPOSIT', 'WITHDRAWAL')
             GROUP BY type`,
            [firstDay]
        );

        let deposits = 0, withdrawals = 0;
        for (const row of rows) {
            if (row.type === 'DEPOSIT') deposits = row.total;
            else if (row.type === 'WITHDRAWAL') withdrawals = row.total;
        }

        if (deposits === 0 && withdrawals === 0) return { deposits: 43250, withdrawals: 7150 };
        return { deposits, withdrawals };
    },

    async createTransaction(data: {
        bank_account_id: string;
        company_id?: string;
        type: BankTransactionType;
        amount: number;
        description?: string;
        date: string;
    }): Promise<string> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.post('/finance/bank-transactions', data);
                const result = res.data?.data || res.data;
                return result?.id || '';
            } catch (err) { throw new Error('API: Banka işlemi oluşturulamadı'); }
        }

        const id = generateId();
        await db.execute(
            `INSERT INTO bank_transactions (id, bank_account_id, company_id, type, amount, description, date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, data.bank_account_id, data.company_id ?? null, data.type, data.amount, data.description ?? null, data.date, nowISO()]
        );

        // Update account balance
        const sign = data.type === 'DEPOSIT' ? 1 : -1;
        await db.execute(
            `UPDATE bank_accounts SET balance = balance + $2, updated_at = $3 WHERE id = $1`,
            [data.bank_account_id, data.amount * sign, nowISO()]
        );

        return id;
    },
};
