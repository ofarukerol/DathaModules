// Ortak finans sync yardimcilari — DathaModules submodule (Manager + Desktop ORTAK).
// Tum finans servisleri /finance/sync/push uzerinden yazar (idempotency + LWW + DELETE_WINS).
// OFFLINE-FIRST (b): online'sa aninda push; offline/basarisizsa financeOutbox kuyruguna alinir,
// online olunca otomatik flush edilir. Okuma offline'da son cache'ten doner.
// BIRIM: backend kurus (int) <-> frontend lira (formatCurrency lira gosterir) → *100 / /100.
import api from '../../_shared/api';
import { nowISO } from '../../_shared/helpers';
import type { FinanceEntity, FinanceSyncOp, FinanceSyncOpResult } from '@/types/backend/finance';
import { enqueueFinanceOp, flushFinanceOutbox, isOnline } from './financeOutbox';

export const toLira = (kurus: number | null | undefined): number => Math.round(kurus ?? 0) / 100;
export const toKurus = (lira: number | null | undefined): number => Math.round((lira ?? 0) * 100);
export const dateOnly = (iso: string | null | undefined): string => (iso ? iso.split('T')[0] : '');

export function unwrap<T>(payload: unknown): T | undefined {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

const CACHE_PREFIX = 'datha:financeCache:';

function cacheRead<T>(path: string): T[] {
    try {
        const raw = globalThis.localStorage?.getItem(CACHE_PREFIX + path);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function cacheWrite<T>(path: string, data: T[]): void {
    try {
        globalThis.localStorage?.setItem(CACHE_PREFIX + path, JSON.stringify(data));
    } catch {
        /* sessiz */
    }
}

/** GET /finance/<path> → liste. Online'da API + cache yazar; offline/hata'da son cache'ten doner. */
export async function getList<T>(path: string): Promise<T[]> {
    try {
        const res = await api.get(path);
        const raw = unwrap<T[]>(res.data);
        const list = Array.isArray(raw) ? raw : [];
        cacheWrite(path, list);
        return list;
    } catch {
        return cacheRead<T>(path);
    }
}

/**
 * Tek sync op gonder. Online'sa aninda push (serverId doner); offline/basarisizsa kuyruga alinir
 * (null doner → cagiran localId'yi kullanir). Kuyruk online olunca otomatik gonderilir.
 */
export async function pushOp(
    entity: FinanceEntity,
    op: 'UPSERT' | 'DELETE',
    localId: string,
    data?: Record<string, unknown>,
    items?: Array<Record<string, unknown>>,
): Promise<string | null> {
    const syncOp: FinanceSyncOp = {
        entity,
        op,
        localId,
        updatedAt: nowISO(),
        data,
        items: items as FinanceSyncOp['items'],
    };
    if (isOnline()) {
        try {
            // Once bekleyen kuyrugu bosalt (sira korunur), sonra bu op'u gonder
            await flushFinanceOutbox();
            const res = await api.post('/finance/sync/push', { ops: [syncOp] });
            const result = unwrap<{ results?: FinanceSyncOpResult[] }>(res.data);
            return result?.results?.[0]?.serverId ?? null;
        } catch {
            enqueueFinanceOp(syncOp);
            return null;
        }
    }
    enqueueFinanceOp(syncOp);
    return null;
}
