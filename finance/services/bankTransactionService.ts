// Banka hareket servisi — DathaModules submodule (Manager + Desktop ORTAK). Gercek backend ile senkron.
import type { BankTransactionView } from '@/types/backend/finance';
import { toLira, toKurus, dateOnly, getList, pushOp } from './_financeSync';

export interface BankTransaction {
    id: string;
    localId?: string;
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

function mapView(v: BankTransactionView): BankTransaction {
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        bank_account_id: v.bankAccountId,
        date: dateOnly(v.date),
        description: v.description ?? '',
        amount: toLira(v.amount),
        type: v.type === 'INCOME' ? 'income' : 'expense',
        balance_after: null,
        reference_id: v.referenceId,
        category: null,
        matched_transaction_id: null,
        is_imported: 0,
        created_at: v.createdAt,
        reference: v.referenceId,
    };
}

function toBackendData(tx: Partial<BankTransaction>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (tx.bank_account_id !== undefined) payload.bankAccountId = tx.bank_account_id;
    if (tx.type !== undefined) {
        payload.type = tx.type === 'income' ? 'INCOME' : 'EXPENSE';
        payload.kind = tx.type === 'income' ? 'DEPOSIT' : 'WITHDRAWAL';
    }
    if (tx.amount !== undefined) payload.amount = toKurus(tx.amount);
    if (tx.description !== undefined) payload.description = tx.description;
    if (tx.date !== undefined) payload.date = tx.date;
    if (tx.reference_id !== undefined) payload.referenceId = tx.reference_id;
    return payload;
}

export const bankTransactionService = {
    async getByAccountId(accountId: string): Promise<BankTransaction[]> {
        const rows = await getList<BankTransactionView>(`/finance/bank-transactions?bankAccountId=${accountId}`);
        return rows.map(mapView);
    },

    async create(tx: Omit<BankTransaction, 'created_at'>): Promise<void> {
        await pushOp('bankTransaction', 'UPSERT', tx.id, toBackendData(tx));
    },

    async bulkCreate(transactions: Omit<BankTransaction, 'created_at'>[]): Promise<void> {
        for (const tx of transactions) {
            await pushOp('bankTransaction', 'UPSERT', tx.id, toBackendData(tx));
        }
    },

    async update(id: string, data: Partial<Omit<BankTransaction, 'id' | 'created_at'>>): Promise<void> {
        const localId = await this._localId(id, data.localId);
        await pushOp('bankTransaction', 'UPSERT', localId, toBackendData(data));
    },

    async delete(id: string): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('bankTransaction', 'DELETE', localId);
    },

    // Mutabakat eslestirme backend modelinde yok — yerel/ileride (no-op).
    async matchTransaction(_id: string, _financeTransactionId: string): Promise<void> {
        void _id;
        void _financeTransactionId;
    },

    async unmatchTransaction(_id: string): Promise<void> {
        void _id;
    },

    async _localId(id: string, hint?: string): Promise<string> {
        if (hint) return hint;
        const rows = await getList<BankTransactionView>('/finance/bank-transactions');
        return rows.find((r) => r.id === id)?.localId ?? id;
    },
};
