// Banka servisi (hesap + hareket) — DathaModules submodule. Gercek backend ile senkron.
import { generateId } from '../../_shared/helpers';
import type { BankAccount, BankTransaction, BankTransactionType } from '../types';
import type { BankAccountView, BankTransactionView, CompanyView } from '@/types/backend/finance';
import { toLira, toKurus, dateOnly, getList, pushOp } from './_financeSync';

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
    return BANK_THEME[bankName] || { code: (bankName || '').substring(0, 3).toUpperCase(), color: '#6B7280' };
}

function mapAccount(v: BankAccountView): BankAccount {
    const theme = deriveTheme(v.bankName ?? '');
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        name: v.name,
        bank_name: v.bankName ?? '',
        iban: v.iban ?? '',
        currency: v.currency,
        balance: toLira(v.balance),
        is_default: v.isDefault ? 1 : 0,
        code: v.code ?? theme.code,
        color: v.color ?? theme.color,
        status: v.isActive ? 'active' : 'passive',
        created_at: v.createdAt,
        updated_at: v.updatedAt,
    };
}

function mapTx(v: BankTransactionView, names: Map<string, string>): BankTransaction {
    const kind = (v.kind as BankTransactionType | null) ?? (v.type === 'INCOME' ? 'DEPOSIT' : 'WITHDRAWAL');
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        bank_account_id: v.bankAccountId,
        company_id: v.companyId ?? undefined,
        type: kind,
        amount: toLira(v.amount),
        description: v.description ?? undefined,
        date: dateOnly(v.date),
        reference_id: v.referenceId ?? undefined,
        created_at: v.createdAt,
        company_name: v.companyId ? names.get(v.companyId) : undefined,
    };
}

const kindToType = (k: BankTransactionType): 'INCOME' | 'EXPENSE' => (k === 'DEPOSIT' ? 'INCOME' : 'EXPENSE');

export const bankService = {
    async fetchAccounts(): Promise<BankAccount[]> {
        const rows = await getList<BankAccountView>('/finance/banks');
        return rows.map(mapAccount);
    },

    async getById(id: string): Promise<BankAccount | null> {
        const rows = await getList<BankAccountView>('/finance/banks');
        const found = rows.find((r) => r.id === id);
        return found ? mapAccount(found) : null;
    },

    async create(data: { name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number }): Promise<string> {
        const localId = generateId();
        const theme = deriveTheme(data.bank_name);
        const serverId = await pushOp('bankAccount', 'UPSERT', localId, {
            name: data.name,
            bankName: data.bank_name,
            iban: data.iban ?? null,
            currency: data.currency ?? 'TRY',
            isActive: true,
            code: theme.code,
            color: theme.color,
            isDefault: !!data.is_default,
        });
        return serverId ?? localId;
    },

    async update(id: string, data: Partial<BankAccount>): Promise<void> {
        const localId = data.localId ?? (await this._accId(id));
        const payload: Record<string, unknown> = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.bank_name !== undefined) payload.bankName = data.bank_name;
        if (data.iban !== undefined) payload.iban = data.iban ?? null;
        if (data.currency !== undefined) payload.currency = data.currency;
        if (data.status !== undefined) payload.isActive = data.status !== 'passive';
        if (data.code !== undefined) payload.code = data.code;
        if (data.color !== undefined) payload.color = data.color;
        if (data.is_default !== undefined) payload.isDefault = !!data.is_default;
        await pushOp('bankAccount', 'UPSERT', localId, payload);
    },

    async deleteAccount(id: string): Promise<void> {
        await pushOp('bankAccount', 'DELETE', await this._accId(id));
    },

    async fetchTransactions(accountId: string, dateFrom?: string, dateTo?: string): Promise<BankTransaction[]> {
        const [rows, companies] = await Promise.all([
            getList<BankTransactionView>(`/finance/bank-transactions?bankAccountId=${accountId}`),
            getList<CompanyView>('/finance/companies'),
        ]);
        const names = new Map(companies.map((c) => [c.id, c.name]));
        let list = rows.map((r) => mapTx(r, names));
        if (dateFrom) list = list.filter((t) => t.date >= dateFrom);
        if (dateTo) list = list.filter((t) => t.date <= dateTo);
        return list;
    },

    async fetchRecentTransactions(limit: number = 10): Promise<BankTransaction[]> {
        const [rows, companies] = await Promise.all([
            getList<BankTransactionView>('/finance/bank-transactions'),
            getList<CompanyView>('/finance/companies'),
        ]);
        const names = new Map(companies.map((c) => [c.id, c.name]));
        return rows
            .map((r) => mapTx(r, names))
            .sort((a, b) => (b.date < a.date ? -1 : 1))
            .slice(0, limit);
    },

    async fetchMonthlyStats(): Promise<{ deposits: number; withdrawals: number }> {
        const rows = await getList<BankTransactionView>('/finance/bank-transactions');
        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        let deposits = 0;
        let withdrawals = 0;
        for (const v of rows) {
            if (dateOnly(v.date) < firstDay) continue;
            const kind = v.kind ?? (v.type === 'INCOME' ? 'DEPOSIT' : 'WITHDRAWAL');
            if (kind === 'DEPOSIT') deposits += toLira(v.amount);
            else if (kind === 'WITHDRAWAL') withdrawals += toLira(v.amount);
        }
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
        const localId = generateId();
        const serverId = await pushOp('bankTransaction', 'UPSERT', localId, {
            bankAccountId: data.bank_account_id,
            companyId: data.company_id ?? null,
            kind: data.type,
            type: kindToType(data.type),
            amount: toKurus(data.amount),
            description: data.description ?? null,
            date: data.date,
        });
        return serverId ?? localId;
    },

    async _accId(id: string): Promise<string> {
        const rows = await getList<BankAccountView>('/finance/banks');
        return rows.find((r) => r.id === id)?.localId ?? id;
    },
};
