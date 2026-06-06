// Cari (Company) servisi — DathaModules submodule (DathaManager + DathaDesktop ORTAK kaynak).
// Gercek backend ile senkron: okuma GET /finance/companies, yazma POST /finance/sync/push
// (idempotency + LWW + DELETE_WINS). Bakiye sunucu-otoriteli; istemciden gonderilmez.
import { generateId } from '../../_shared/helpers';
import type { Company, CompanyType } from '../types';
import type { CompanyView } from '@/types/backend/finance';
import { getList, pushOp } from './_financeSync';

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
        balance: Math.round(v.balance ?? 0) / 100, // backend kurus -> frontend lira
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

export const companyService = {
    async fetchCompanies(search?: string, type?: CompanyType | ''): Promise<Company[]> {
        let list = (await getList<CompanyView>('/finance/companies')).map(mapView);
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
    },

    async getById(id: string): Promise<Company | null> {
        const all = await this.fetchCompanies();
        return all.find((c) => c.id === id) ?? null;
    },

    async create(
        data: Omit<Company, 'id' | 'localId' | 'balance' | 'created_at' | 'updated_at' | 'deleted_at'>,
    ): Promise<string> {
        const localId = generateId();
        const serverId = await pushOp('company', 'UPSERT', localId, toBackendData(data));
        return serverId ?? localId;
    },

    /** localId tercih edilir (sunucu eslesmesi); yoksa id ile (legacy kayit). */
    async update(id: string, data: Partial<Company>, localId?: string): Promise<void> {
        await pushOp('company', 'UPSERT', localId ?? id, toBackendData(data));
    },

    async softDelete(id: string, localId?: string): Promise<void> {
        await pushOp('company', 'DELETE', localId ?? id);
    },

    /** Bakiye sunucu tarafinda hesaplanir — istemci tarafinda yapilacak bir sey yok. */
    async updateBalance(): Promise<void> {
        // no-op (sunucu-otoriteli bakiye)
    },
};
