// Cek/Senet servisi — DathaModules submodule (Manager + Desktop ORTAK). Gercek backend ile senkron.
// CheckType (CHECK_RECEIVED/...) <-> backend type(RECEIVED/ISSUED) + instrument(CHECK/NOTE).
import { generateId } from '../../_shared/helpers';
import type { CheckNote, CheckType, CheckStatus } from '../types';
import type { CheckView, CompanyView } from '@/types/backend/finance';
import { toLira, toKurus, dateOnly, getList, pushOp } from './_financeSync';

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

function splitType(t: CheckType): { type: 'RECEIVED' | 'ISSUED'; instrument: 'CHECK' | 'NOTE' } {
    return {
        type: t.endsWith('RECEIVED') ? 'RECEIVED' : 'ISSUED',
        instrument: t.startsWith('NOTE') ? 'NOTE' : 'CHECK',
    };
}

function joinType(type: string, instrument: string): CheckType {
    const dir = type === 'RECEIVED' ? 'RECEIVED' : 'ISSUED';
    const ins = instrument === 'NOTE' ? 'NOTE' : 'CHECK';
    return `${ins}_${dir}` as CheckType;
}

function mapView(v: CheckView, companyNames: Map<string, string>): CheckNote {
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        type: joinType(v.type, v.instrument),
        company_id: v.companyId ?? undefined,
        amount: toLira(v.amount),
        currency: v.currency ?? 'TRY',
        issue_date: dateOnly(v.issueDate),
        due_date: dateOnly(v.dueDate),
        status: v.status as CheckStatus,
        bank_name: v.bankName ?? undefined,
        check_number: v.checkNumber ?? undefined,
        notes: v.notes ?? undefined,
        endorser: v.endorser ?? undefined,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
        company_name: v.companyId ? companyNames.get(v.companyId) : undefined,
    };
}

const RECEIVED: CheckType[] = ['CHECK_RECEIVED', 'NOTE_RECEIVED'];

export const checkService = {
    async fetchAll(): Promise<CheckNote[]> {
        const [rows, companies] = await Promise.all([
            getList<CheckView>('/finance/checks'),
            getList<CompanyView>('/finance/companies'),
        ]);
        const names = new Map(companies.map((c) => [c.id, c.name]));
        return rows.map((r) => mapView(r, names));
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
        const localId = generateId();
        const st = splitType(data.type);
        const serverId = await pushOp('check', 'UPSERT', localId, {
            type: st.type,
            instrument: st.instrument,
            companyId: data.company_id ?? null,
            amount: toKurus(data.amount),
            currency: data.currency ?? 'TRY',
            issueDate: data.issue_date,
            dueDate: data.due_date,
            bankName: data.bank_name ?? null,
            checkNumber: data.check_number ?? null,
            notes: data.notes ?? null,
            endorser: data.endorser ?? null,
            status: 'PENDING',
        });
        return serverId ?? localId;
    },

    async updateStatus(id: string, status: CheckStatus): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('check', 'UPSERT', localId, { status });
    },

    async deleteCheck(id: string): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('check', 'DELETE', localId);
    },

    async fetchStats(): Promise<CheckStats> {
        const list = await this.fetchAll();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const isReceived = (c: CheckNote) => RECEIVED.includes(c.type);
        const pending = list.filter((c) => c.status === 'PENDING');
        const recv = pending.filter(isReceived);
        const iss = pending.filter((c) => !isReceived(c));
        const dueWeek = pending.filter((c) => c.due_date >= todayStr && c.due_date <= weekLater);
        const sum = (arr: CheckNote[]) => arr.reduce((s, c) => s + c.amount, 0);
        const allRecv = list.filter(isReceived);
        const cashedRecv = allRecv.filter((c) => c.status === 'CASHED');
        const allRecvTotal = sum(allRecv);
        const rate = allRecvTotal > 0 ? Math.round((sum(cashedRecv) / allRecvTotal) * 100) : 0;
        return {
            receivedTotal: sum(recv),
            receivedCount: recv.length,
            issuedTotal: sum(iss),
            issuedCount: iss.length,
            pendingCount: pending.length,
            overdueCount: pending.filter((c) => c.due_date < todayStr).length,
            dueThisWeekTotal: sum(dueWeek),
            dueThisWeekCount: dueWeek.length,
            cashConversionRate: rate,
        };
    },

    async _localId(id: string): Promise<string> {
        const rows = await getList<CheckView>('/finance/checks');
        return rows.find((r) => r.id === id)?.localId ?? id;
    },
};
