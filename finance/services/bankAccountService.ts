import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import { nowISO } from '../../_shared/helpers';
import { enqueueSync } from '../../../utils/syncQueue';

// Bank theme lookup — code/color is derived from bank_name if not stored
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

export function deriveTheme(bankName: string): { code: string; color: string } {
    return BANK_THEME[bankName] || { code: bankName.substring(0, 3).toUpperCase(), color: '#6B7280' };
}

export interface BankAccount {
    id: string;
    code: string;
    color: string;
    name: string;
    bank_name: string;
    iban: string;
    balance: number;
    currency: string;
    status: 'active' | 'passive';
    is_default: number;
    created_at: string;
    updated_at: string;
}

export const bankAccountService = {
    async getAll(): Promise<BankAccount[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/bank-accounts');
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.map((row: BankAccount) => ({
                    ...row,
                    code: row.code || deriveTheme(row.bank_name).code,
                    color: row.color || deriveTheme(row.bank_name).color,
                    status: (row.status as 'active' | 'passive') || 'active',
                }));
            } catch { return []; }
        }
        const rows = await db.select<BankAccount[]>(
            'SELECT id, name, bank_name, iban, currency, balance, is_default, code, color, status, created_at, updated_at FROM bank_accounts ORDER BY is_default DESC, name ASC'
        );
        // Derive code/color from bank_name if not stored in DB
        return rows.map(row => ({
            ...row,
            code: row.code || deriveTheme(row.bank_name).code,
            color: row.color || deriveTheme(row.bank_name).color,
            status: (row.status as 'active' | 'passive') || 'active',
        }));
    },

    async create(account: { id: string; name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number; status?: 'active' | 'passive' }): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.post('/finance/bank-accounts', account);
            } catch { /* silent fail for API */ }
            return;
        }
        const theme = deriveTheme(account.bank_name);
        const now = nowISO();
        await db.execute(
            `INSERT INTO bank_accounts (id, name, bank_name, iban, currency, balance, is_default, code, color, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [account.id, account.name, account.bank_name, account.iban ?? null, account.currency ?? 'TRY',
             account.balance ?? 0, account.is_default ?? 0, theme.code, theme.color, account.status ?? 'active', now, now]
        );
        await enqueueSync('BANK_ACCOUNT_CREATED', {
            localId: account.id, name: account.name, bankName: account.bank_name,
            iban: account.iban, currency: account.currency ?? 'TRY', balance: account.balance ?? 0,
        });
    },

    async update(id: string, data: Partial<Omit<BankAccount, 'id' | 'created_at'>>): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/bank-accounts/${id}`, data);
            } catch { /* silent fail for API */ }
            return;
        }
        const fields: string[] = [];
        const values: (string | number | null)[] = [];
        let idx = 1;

        const allowed: (keyof typeof data)[] = ['name', 'bank_name', 'iban', 'currency', 'balance', 'is_default', 'code', 'color', 'status'];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(data[key] as string | number | null);
            }
        }
        if (fields.length === 0) return;

        fields.push(`updated_at = $${idx++}`);
        values.push(nowISO());
        values.push(id);
        await db.execute(
            `UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
        await enqueueSync('BANK_ACCOUNT_UPDATED', { localId: id, ...data });
    },

    async delete(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.delete(`/finance/bank-accounts/${id}`);
            } catch { /* silent fail for API */ }
            return;
        }
        // Delete related transactions first
        await db.execute('DELETE FROM bank_transactions WHERE bank_account_id = $1', [id]);
        await db.execute('DELETE FROM bank_accounts WHERE id = $1', [id]);
    },
};
