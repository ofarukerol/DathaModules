// Banka hesap servisi — DathaModules submodule (Manager + Desktop ORTAK). Gercek backend ile senkron.
import { generateId } from '../../_shared/helpers';
import type { BankAccountView } from '@/types/backend/finance';
import { toLira, getList, pushOp } from './_financeSync';

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
    return BANK_THEME[bankName] || { code: (bankName || '').substring(0, 3).toUpperCase(), color: '#6B7280' };
}

export interface BankAccount {
    id: string;
    localId?: string;
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

function mapView(v: BankAccountView): BankAccount {
    const theme = deriveTheme(v.bankName ?? '');
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        code: v.code ?? theme.code,
        color: v.color ?? theme.color,
        name: v.name,
        bank_name: v.bankName ?? '',
        iban: v.iban ?? '',
        balance: toLira(v.balance),
        currency: v.currency,
        status: v.isActive ? 'active' : 'passive',
        is_default: v.isDefault ? 1 : 0,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
    };
}

export const bankAccountService = {
    async getAll(): Promise<BankAccount[]> {
        const rows = await getList<BankAccountView>('/finance/banks');
        return rows.map(mapView);
    },

    async create(account: { id: string; name: string; bank_name: string; iban?: string; currency?: string; balance?: number; is_default?: number; status?: 'active' | 'passive' }): Promise<void> {
        const theme = deriveTheme(account.bank_name);
        await pushOp('bankAccount', 'UPSERT', account.id || generateId(), {
            name: account.name,
            bankName: account.bank_name,
            iban: account.iban ?? null,
            currency: account.currency ?? 'TRY',
            isActive: account.status !== 'passive',
            code: theme.code,
            color: theme.color,
            isDefault: !!account.is_default,
            // balance: sunucu hesaplar (hareketlerden)
        });
    },

    async update(id: string, data: Partial<Omit<BankAccount, 'id' | 'created_at'>>): Promise<void> {
        const localId = await this._localId(id, data.localId);
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

    async delete(id: string): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('bankAccount', 'DELETE', localId);
    },

    async _localId(id: string, hint?: string): Promise<string> {
        if (hint) return hint;
        const rows = await getList<BankAccountView>('/finance/banks');
        return rows.find((r) => r.id === id)?.localId ?? id;
    },
};
