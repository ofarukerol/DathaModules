import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import { generateId, nowISO } from '../../_shared/helpers';
import type { CheckNote, CheckType, CheckStatus } from '../types';

export interface CheckStats {
    receivedTotal: number;
    receivedCount: number;
    issuedTotal: number;
    issuedCount: number;
    pendingCount: number;
    overdueCount: number;
    dueThisWeekTotal: number;
    dueThisWeekCount: number;
    cashConversionRate: number;
}

const DEMO_CHECKS: CheckNote[] = (() => {
    const today = new Date();
    const d = (offset: number) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + offset);
        return dt.toISOString().split('T')[0];
    };
    return [
        { id: 'demo-chk-1', type: 'CHECK_RECEIVED' as CheckType, amount: 15000, currency: 'TRY', issue_date: d(-30), due_date: d(5), status: 'PENDING' as CheckStatus, bank_name: 'Yapı Kredi', check_number: 'ÇK-2026-001', company_name: 'Taze Gıda A.Ş.', notes: 'Mart ayı tedarik ödemesi', created_at: d(-30), updated_at: d(-30) },
        { id: 'demo-chk-2', type: 'CHECK_ISSUED' as CheckType, amount: 8500, currency: 'TRY', issue_date: d(-15), due_date: d(12), status: 'PENDING' as CheckStatus, bank_name: 'Akbank', check_number: 'ÇK-2026-002', company_name: 'Metro Toptancı', notes: 'İçecek siparişi', created_at: d(-15), updated_at: d(-15) },
        { id: 'demo-chk-3', type: 'NOTE_RECEIVED' as CheckType, amount: 22000, currency: 'TRY', issue_date: d(-45), due_date: d(-3), status: 'PENDING' as CheckStatus, bank_name: 'Garanti BBVA', check_number: 'SN-2026-001', company_name: 'Lezzet Catering', notes: 'Catering sözleşmesi', created_at: d(-45), updated_at: d(-45) },
        { id: 'demo-chk-4', type: 'CHECK_RECEIVED' as CheckType, amount: 9800, currency: 'TRY', issue_date: d(-20), due_date: d(25), status: 'PENDING' as CheckStatus, bank_name: 'İş Bankası', check_number: 'ÇK-2026-003', company_name: 'Anadolu Et', notes: 'Et tedarik ödemesi', created_at: d(-20), updated_at: d(-20) },
        { id: 'demo-chk-5', type: 'CHECK_RECEIVED' as CheckType, amount: 6500, currency: 'TRY', issue_date: d(-60), due_date: d(-40), status: 'CASHED' as CheckStatus, bank_name: 'Yapı Kredi', check_number: 'ÇK-2026-004', company_name: 'ABC Tedarik', notes: 'Tahsil edildi', created_at: d(-60), updated_at: d(-40) },
    ] as CheckNote[];
})();

const DEMO_CHECK_STATS: CheckStats = {
    receivedTotal: 46800,
    receivedCount: 3,
    issuedTotal: 8500,
    issuedCount: 1,
    pendingCount: 4,
    overdueCount: 1,
    dueThisWeekTotal: 15000,
    dueThisWeekCount: 1,
    cashConversionRate: 25,
};

export const checkService = {
    async fetchAll(): Promise<CheckNote[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/checks');
                const data = res.data;
                const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                return arr.length > 0 ? arr : DEMO_CHECKS;
            } catch { return DEMO_CHECKS; }
        }
        const result = await db.select<CheckNote[]>(
            `SELECT ch.id, ch.type, ch.company_id, ch.amount, ch.currency,
                    ch.issue_date, ch.due_date, ch.status, ch.bank_name,
                    ch.check_number, ch.notes, ch.endorser,
                    ch.created_at, ch.updated_at,
                    c.name as company_name
             FROM checks ch
             LEFT JOIN companies c ON ch.company_id = c.id
             ORDER BY ch.due_date ASC`
        );
        return result.length > 0 ? result : DEMO_CHECKS;
    },

    async create(data: {
        type: CheckType;
        company_id?: string;
        amount: number;
        currency?: string;
        issue_date: string;
        due_date: string;
        bank_name?: string;
        check_number?: string;
        notes?: string;
        endorser?: string;
    }): Promise<string> {
        const db = await getDb();
        if (!db) {
            const res = await api.post('/finance/checks', data);
            const result = res.data?.data ?? res.data;
            if (result?.id) return result.id;
            throw new Error('API: Cek/senet olusturulamadi');
        }

        const id = generateId();
        const now = nowISO();
        await db.execute(
            `INSERT INTO checks (id, type, company_id, amount, currency, issue_date, due_date, status, bank_name, check_number, notes, endorser, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13)`,
            [id, data.type, data.company_id ?? null, data.amount, data.currency ?? 'TRY',
             data.issue_date, data.due_date, data.bank_name ?? null, data.check_number ?? null,
             data.notes ?? null, data.endorser ?? null, now, now]
        );
        return id;
    },

    async updateStatus(id: string, status: CheckStatus): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.patch(`/finance/checks/${id}/status`, { status });
            return;
        }
        await db.execute(
            'UPDATE checks SET status = $2, updated_at = $3 WHERE id = $1',
            [id, status, nowISO()]
        );
    },

    async deleteCheck(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.delete(`/finance/checks/${id}`);
            return;
        }
        await db.execute('DELETE FROM checks WHERE id = $1', [id]);
    },

    async fetchStats(): Promise<CheckStats> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/checks/stats');
                const data = res.data?.data ?? res.data;
                return data ?? DEMO_CHECK_STATS;
            } catch { return DEMO_CHECK_STATS; }
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Alınan çekler (PENDING)
        const received = await db.select<[{ total: number; cnt: number }]>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM checks WHERE type IN ('CHECK_RECEIVED', 'NOTE_RECEIVED') AND status = 'PENDING'`
        );

        // Verilen çekler (PENDING)
        const issued = await db.select<[{ total: number; cnt: number }]>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM checks WHERE type IN ('CHECK_ISSUED', 'NOTE_ISSUED') AND status = 'PENDING'`
        );

        // Bekleyen toplam
        const pending = await db.select<[{ cnt: number }]>(
            `SELECT COUNT(*) as cnt FROM checks WHERE status = 'PENDING'`
        );

        // Vadesi geçen
        const overdue = await db.select<[{ cnt: number }]>(
            `SELECT COUNT(*) as cnt FROM checks WHERE status = 'PENDING' AND due_date < $1`,
            [todayStr]
        );

        // Bu hafta vadesi gelenler
        const dueWeek = await db.select<[{ total: number; cnt: number }]>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM checks WHERE status = 'PENDING' AND due_date >= $1 AND due_date <= $2`,
            [todayStr, weekLater]
        );

        // Nakite dönüşüm oranı: tahsil edilen / (tahsil edilen + bekleyen alınan)
        const cashedReceived = await db.select<[{ total: number }]>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM checks WHERE type IN ('CHECK_RECEIVED', 'NOTE_RECEIVED') AND status = 'CASHED'`
        );
        const allReceived = await db.select<[{ total: number }]>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM checks WHERE type IN ('CHECK_RECEIVED', 'NOTE_RECEIVED')`
        );
        const allReceivedTotal = allReceived[0]?.total || 0;
        const cashedTotal = cashedReceived[0]?.total || 0;
        const cashConversionRate = allReceivedTotal > 0 ? Math.round((cashedTotal / allReceivedTotal) * 100) : 0;

        const stats = {
            receivedTotal: received[0]?.total || 0,
            receivedCount: received[0]?.cnt || 0,
            issuedTotal: issued[0]?.total || 0,
            issuedCount: issued[0]?.cnt || 0,
            pendingCount: pending[0]?.cnt || 0,
            overdueCount: overdue[0]?.cnt || 0,
            dueThisWeekTotal: dueWeek[0]?.total || 0,
            dueThisWeekCount: dueWeek[0]?.cnt || 0,
            cashConversionRate,
        };

        if (stats.receivedCount === 0 && stats.issuedCount === 0 && stats.pendingCount === 0) {
            return DEMO_CHECK_STATS;
        }
        return stats;
    },
};
