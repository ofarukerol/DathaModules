// Tedarikci Odeme Listesi servisi — DathaModules submodule (Manager + Desktop ORTAK).
// Dedicated REST: GET/POST /finance/payment-lists, GET /finance/payment-lists/:id.
// BIRIM: backend kurus (int) <-> frontend lira; sinirda toKurus/toLira.
import api from '../../_shared/api';
import { toKurus, toLira, unwrap } from './_financeSync';
import type {
    PaymentListView,
    CreatePaymentListPayload,
    UpdatePaymentListPayload,
} from '@/types/backend/payment-list';

export interface PaymentListSummary {
    id: string;
    title: string | null;
    note: string | null;
    paymentDate: string;
    totalAmount: number; // lira
    allocatedAmount: number; // lira
    itemCount: number;
    createdAt: string;
}

export interface PaymentListDetailItem {
    id: string;
    companyId: string | null;
    companyName: string | null;
    manualName: string | null;
    balanceSnapshot: number; // lira
    amount: number; // lira
    sortOrder: number;
}

export interface PaymentListDetail extends PaymentListSummary {
    items: PaymentListDetailItem[];
}

/** Olusturma girisi (lira; servis kurusa cevirir). */
export interface CreatePaymentListInput {
    title?: string;
    note?: string;
    paymentDate: string; // yyyy-mm-dd
    totalAmount: number; // lira
    items: Array<{
        companyId?: string | null;
        manualName?: string | null;
        balanceSnapshot?: number; // lira
        amount: number; // lira
        sortOrder?: number;
    }>;
}

function mapSummary(v: PaymentListView): PaymentListSummary {
    return {
        id: v.id,
        title: v.title,
        note: v.note,
        paymentDate: v.paymentDate.slice(0, 10),
        totalAmount: toLira(v.totalAmount),
        allocatedAmount: toLira(v.allocatedAmount),
        itemCount: v.itemCount,
        createdAt: v.createdAt,
    };
}

function mapDetail(v: PaymentListView): PaymentListDetail {
    return {
        ...mapSummary(v),
        items: (v.items ?? []).map((it) => ({
            id: it.id,
            companyId: it.companyId,
            companyName: it.companyName ?? null,
            manualName: it.manualName,
            balanceSnapshot: toLira(it.balanceSnapshot),
            amount: toLira(it.amount),
            sortOrder: it.sortOrder,
        })),
    };
}

export const paymentListService = {
    async getAll(): Promise<PaymentListSummary[]> {
        const res = await api.get('/finance/payment-lists');
        const rows = unwrap<PaymentListView[]>(res.data) ?? [];
        return rows.map(mapSummary);
    },

    async getById(id: string): Promise<PaymentListDetail | null> {
        const res = await api.get(`/finance/payment-lists/${id}`);
        const v = unwrap<PaymentListView>(res.data);
        return v ? mapDetail(v) : null;
    },

    async create(data: CreatePaymentListInput): Promise<string> {
        const payload: CreatePaymentListPayload = {
            title: data.title?.trim() || null,
            note: data.note?.trim() || null,
            paymentDate: data.paymentDate,
            totalAmount: toKurus(data.totalAmount),
            items: data.items.map((it, i) => ({
                companyId: it.companyId ?? null,
                manualName: it.manualName ?? null,
                balanceSnapshot: toKurus(it.balanceSnapshot ?? 0),
                amount: toKurus(it.amount),
                sortOrder: it.sortOrder ?? i,
            })),
        };
        const res = await api.post('/finance/payment-lists', payload);
        const v = unwrap<PaymentListView>(res.data);
        return v?.id ?? '';
    },

    async update(id: string, data: CreatePaymentListInput): Promise<PaymentListDetail | null> {
        const payload: UpdatePaymentListPayload = {
            title: data.title?.trim() || null,
            note: data.note?.trim() || null,
            paymentDate: data.paymentDate,
            totalAmount: toKurus(data.totalAmount),
            items: data.items.map((it, i) => ({
                companyId: it.companyId ?? null,
                manualName: it.manualName ?? null,
                balanceSnapshot: toKurus(it.balanceSnapshot ?? 0),
                amount: toKurus(it.amount),
                sortOrder: it.sortOrder ?? i,
            })),
        };
        const res = await api.patch(`/finance/payment-lists/${id}`, payload);
        const v = unwrap<PaymentListView>(res.data);
        return v ? mapDetail(v) : null;
    },

    async remove(id: string): Promise<void> {
        await api.delete(`/finance/payment-lists/${id}`);
    },
};
