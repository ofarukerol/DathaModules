// Cari (Company) servisi — DathaModules submodule (DathaManager + DathaDesktop ORTAK kaynak).
// Gercek backend ile senkron: okuma GET /finance/companies, yazma POST /finance/sync/push
// (idempotency + LWW + DELETE_WINS). Bakiye sunucu-otoriteli; istemciden gonderilmez.
import api from '../../_shared/api';
import { generateId, nowISO } from '../../_shared/helpers';
import type { Company, CompanyType } from '../types';
import type { CompanyView, FinanceSyncOpResult } from '@/types/backend/finance';

/** Backend CompanyView (camelCase) -> frontend Company (snake_case) */
function mapView(v: CompanyView): Company {
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        name: v.name,
        title: v.title ?? undefined,
        type: v.type as CompanyType,
        tax_number: v.taxNumber ?? undefined,
        tax_office: v.taxOffice ?? undefined,
        contact_person: v.contactPerson ?? undefined,
        phone: v.phone ?? undefined,
        email: v.email ?? undefined,
        address: v.address ?? undefined,
        city: v.city ?? undefined,
        balance: v.balance,
        notes: v.notes ?? undefined,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
        deleted_at: v.deletedAt ?? undefined,
    };
}

/** Frontend Company -> backend sync op data (camelCase; balance HARIC — sunucu hesaplar) */
function toBackendData(c: Partial<Company>): Record<string, unknown> {
    return {
        name: c.name,
        title: c.title ?? null,
        type: c.type,
        phone: c.phone ?? null,
        email: c.email ?? null,
        address: c.address ?? null,
        city: c.city ?? null,
        contactPerson: c.contact_person ?? null,
        taxNumber: c.tax_number ?? null,
        taxOffice: c.tax_office ?? null,
        notes: c.notes ?? null,
    };
}

function unwrap<T>(payload: unknown): T | undefined {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

async function pushOp(
    op: 'UPSERT' | 'DELETE',
    localId: string,
    data?: Record<string, unknown>,
): Promise<string | null> {
    const res = await api.post('/finance/sync/push', {
        ops: [{ entity: 'company', op, localId, updatedAt: nowISO(), data }],
    });
    const result = unwrap<{ results?: FinanceSyncOpResult[] }>(res.data);
    return result?.results?.[0]?.serverId ?? null;
}

export const companyService = {
    async fetchCompanies(search?: string, type?: CompanyType | ''): Promise<Company[]> {
        try {
            const res = await api.get('/finance/companies');
            const raw = unwrap<CompanyView[]>(res.data);
            let list = Array.isArray(raw) ? raw.map(mapView) : [];
            if (search) {
                const q = search.toLowerCase();
                list = list.filter(
                    (c) =>
                        c.name.toLowerCase().includes(q) ||
                        (c.title ?? '').toLowerCase().includes(q),
                );
            }
            if (type) list = list.filter((c) => c.type === type);
            return list;
        } catch {
            return [];
        }
    },

    async getById(id: string): Promise<Company | null> {
        const all = await this.fetchCompanies();
        return all.find((c) => c.id === id) ?? null;
    },

    async create(
        data: Omit<Company, 'id' | 'localId' | 'balance' | 'created_at' | 'updated_at' | 'deleted_at'>,
    ): Promise<string> {
        const localId = generateId();
        const serverId = await pushOp('UPSERT', localId, toBackendData(data));
        return serverId ?? localId;
    },

    /** localId tercih edilir (sunucu eslesmesi); yoksa id ile (legacy kayit). */
    async update(id: string, data: Partial<Company>, localId?: string): Promise<void> {
        await pushOp('UPSERT', localId ?? id, toBackendData(data));
    },

    async softDelete(id: string, localId?: string): Promise<void> {
        await pushOp('DELETE', localId ?? id);
    },

    /** Bakiye sunucu tarafinda hesaplanir — istemci tarafinda yapilacak bir sey yok. */
    async updateBalance(): Promise<void> {
        // no-op (sunucu-otoriteli bakiye)
    },
};
