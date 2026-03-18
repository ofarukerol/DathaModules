import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import { nowISO } from '../../_shared/helpers';
import { enqueueSync } from '../../../utils/syncQueue';

export interface BankTransaction {
    id: string;
    bank_account_id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    balance_after: number | null;
    reference_id: string | null;
    category: string | null;
    matched_transaction_id: string | null;
    is_imported: number;
    created_at: string;
    // Aliases for backward compat with UI
    reference?: string | null;
}

export const bankTransactionService = {
    async getByAccountId(accountId: string): Promise<BankTransaction[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/bank-transactions?accountId=${accountId}`);
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.map((r: BankTransaction) => ({ ...r, reference: r.reference_id }));
            } catch { return []; }
        }
        const rows = await db.select<BankTransaction[]>(
            `SELECT id, bank_account_id, date, description, amount, type,
                    balance_after, reference_id, category, matched_transaction_id,
                    is_imported, created_at
             FROM bank_transactions
             WHERE bank_account_id = $1
             ORDER BY date DESC, created_at DESC`,
            [accountId]
        );
        // Map reference_id → reference for UI compat
        return rows.map(r => ({ ...r, reference: r.reference_id }));
    },

    async create(tx: Omit<BankTransaction, 'created_at'>): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.post('/finance/bank-transactions', tx);
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute(
            `INSERT INTO bank_transactions (id, bank_account_id, date, description, amount, type, balance_after, reference_id, category, matched_transaction_id, is_imported, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [tx.id, tx.bank_account_id, tx.date, tx.description, tx.amount, tx.type,
             tx.balance_after ?? null, tx.reference_id ?? null, tx.category ?? null,
             tx.matched_transaction_id ?? null, tx.is_imported ?? 0, nowISO()]
        );
        await enqueueSync('BANK_TRANSACTION_CREATED', {
            localId: tx.id, bankAccountId: tx.bank_account_id,
            type: tx.type, amount: tx.amount, description: tx.description, date: tx.date,
        });
    },

    async bulkCreate(transactions: Omit<BankTransaction, 'created_at'>[]): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.post('/finance/bank-transactions/bulk', { transactions });
            } catch { /* silent fail for API */ }
            return;
        }
        const now = nowISO();
        for (const tx of transactions) {
            await db.execute(
                `INSERT INTO bank_transactions (id, bank_account_id, date, description, amount, type, balance_after, reference_id, category, matched_transaction_id, is_imported, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [tx.id, tx.bank_account_id, tx.date, tx.description, tx.amount, tx.type,
                 tx.balance_after ?? null, tx.reference_id ?? null, tx.category ?? null,
                 tx.matched_transaction_id ?? null, tx.is_imported ?? 0, now]
            );
        }
    },

    async update(id: string, data: Partial<Omit<BankTransaction, 'id' | 'created_at'>>): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/bank-transactions/${id}`, data);
            } catch { /* silent fail for API */ }
            return;
        }
        const fields: string[] = [];
        const values: (string | number | null)[] = [];
        let idx = 1;

        const keys: (keyof typeof data)[] = ['bank_account_id', 'date', 'description', 'amount', 'type', 'balance_after', 'reference_id', 'category', 'matched_transaction_id', 'is_imported'];
        for (const key of keys) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(data[key] as string | number | null);
            }
        }

        if (fields.length === 0) return;

        values.push(id);
        await db.execute(
            `UPDATE bank_transactions SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
    },

    async delete(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.delete(`/finance/bank-transactions/${id}`);
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute('DELETE FROM bank_transactions WHERE id = $1', [id]);
    },

    async matchTransaction(id: string, financeTransactionId: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/bank-transactions/${id}/match`, { financeTransactionId });
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute(
            'UPDATE bank_transactions SET matched_transaction_id = $1 WHERE id = $2',
            [financeTransactionId, id]
        );
    },

    async unmatchTransaction(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            try {
                await api.patch(`/finance/bank-transactions/${id}/unmatch`, {});
            } catch { /* silent fail for API */ }
            return;
        }
        await db.execute(
            'UPDATE bank_transactions SET matched_transaction_id = NULL WHERE id = $1',
            [id]
        );
    },
};
