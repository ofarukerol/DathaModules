// Finans offline outbox — DathaModules submodule (Manager + Desktop ORTAK).
// Internet yokken/istek basarisizken finans sync op'lari localStorage kuyruguna yazilir,
// online olunca /finance/sync/push'a toplu gonderilir. Idempotency (localId) sayesinde
// mukerrer gonderim guvenlidir. Tauri webview'da da localStorage kalici → restart'a dayanikli.
import api from '../../_shared/api';
import type { FinanceSyncOp } from '@/types/backend/finance';

const QUEUE_KEY = 'datha:financeOutbox';

interface QueuedOp extends FinanceSyncOp {
    queuedAt: number;
    attempts: number;
}

export const isOnline = (): boolean => (typeof navigator !== 'undefined' ? navigator.onLine : true);

function read(): QueuedOp[] {
    try {
        const raw = globalThis.localStorage?.getItem(QUEUE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function write(items: QueuedOp[]): void {
    try {
        globalThis.localStorage?.setItem(QUEUE_KEY, JSON.stringify(items));
    } catch {
        /* sessiz */
    }
}

/** Op'u kuyruga ekle (offline veya basarisiz push sonrasi). */
export function enqueueFinanceOp(op: FinanceSyncOp): void {
    const q = read();
    q.push({ ...op, queuedAt: Date.now(), attempts: 0 });
    write(q);
}

export function pendingCount(): number {
    return read().length;
}

let flushing = false;

/** Kuyrugu tek push ile gonderir. Basarili → temizler; basarisiz → attempts arttirir, birakir. */
export async function flushFinanceOutbox(): Promise<{ pushed: number; remaining: number }> {
    if (flushing || !isOnline()) return { pushed: 0, remaining: read().length };
    const q = read();
    if (q.length === 0) return { pushed: 0, remaining: 0 };
    flushing = true;
    try {
        const ops: FinanceSyncOp[] = q.map(({ entity, op, localId, updatedAt, data, items }) => ({
            entity,
            op,
            localId,
            updatedAt,
            data,
            items,
        }));
        await api.post('/finance/sync/push', { ops });
        write([]);
        return { pushed: ops.length, remaining: 0 };
    } catch {
        write(q.map((item) => ({ ...item, attempts: item.attempts + 1 })));
        return { pushed: 0, remaining: q.length };
    } finally {
        flushing = false;
    }
}

// Online'a donunce + sayfa acilisinda otomatik flush (tarayici/Tauri webview)
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        void flushFinanceOutbox();
    });
    if (isOnline()) {
        setTimeout(() => {
            void flushFinanceOutbox();
        }, 1500);
    }
}
