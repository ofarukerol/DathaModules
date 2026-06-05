// Ortak finans sync yardimcilari — DathaModules submodule (Manager + Desktop ORTAK).
// Tum finans servisleri /finance/sync/push uzerinden yazar (idempotency + LWW + DELETE_WINS).
// BIRIM: backend kurus (int) <-> frontend lira (formatCurrency lira gosterir) → *100 / /100.
import api from '../../_shared/api';
import { nowISO } from '../../_shared/helpers';
import type { FinanceEntity, FinanceSyncOpResult } from '@/types/backend/finance';

export const toLira = (kurus: number | null | undefined): number => Math.round(kurus ?? 0) / 100;
export const toKurus = (lira: number | null | undefined): number => Math.round((lira ?? 0) * 100);
export const dateOnly = (iso: string | null | undefined): string => (iso ? iso.split('T')[0] : '');

export function unwrap<T>(payload: unknown): T | undefined {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

/** GET /finance/<path> → liste (ApiResponse.data veya dizi) */
export async function getList<T>(path: string): Promise<T[]> {
    try {
        const res = await api.get(path);
        const raw = unwrap<T[]>(res.data);
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

/** Tek sync op gonder; serverId doner (yoksa null). */
export async function pushOp(
    entity: FinanceEntity,
    op: 'UPSERT' | 'DELETE',
    localId: string,
    data?: Record<string, unknown>,
    items?: Array<Record<string, unknown>>,
): Promise<string | null> {
    const res = await api.post('/finance/sync/push', {
        ops: [{ entity, op, localId, updatedAt: nowISO(), data, items }],
    });
    const result = unwrap<{ results?: FinanceSyncOpResult[] }>(res.data);
    return result?.results?.[0]?.serverId ?? null;
}
