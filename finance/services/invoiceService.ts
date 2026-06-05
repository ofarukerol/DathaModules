// Fatura servisi — DathaModules submodule (Manager + Desktop ORTAK). Gercek backend ile senkron.
import { generateId } from '../../_shared/helpers';
import type { Invoice as BaseInvoice, InvoiceItem as BaseInvoiceItem } from '../types';
import type { FinanceInvoiceView, CompanyView } from '@/types/backend/finance';
import { toLira, toKurus, dateOnly, getList, pushOp } from './_financeSync';

export type Invoice = BaseInvoice;
export type InvoiceLineItem = BaseInvoiceItem;
export interface InvoiceWithItems extends Invoice {
    items: InvoiceLineItem[];
}
export interface InvoiceSummary {
    totalCount: number;
    totalAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
    thisMonthCount: number;
    thisMonthAmount: number;
}

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];

function mapItem(it: FinanceInvoiceView['items'][number]): InvoiceLineItem {
    return {
        id: it.id,
        invoice_id: '',
        product_name: it.description,
        name: it.description,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit ?? 'Adet',
        unit_price: toLira(it.unitPrice),
        tax_rate: it.taxRate,
        vat_rate: it.taxRate,
        discount_rate: it.discountRate,
        line_total: toLira(it.totalPrice),
        total: toLira(it.totalPrice),
        created_at: '',
    };
}

function mapView(v: FinanceInvoiceView, companyNames: Map<string, string>): InvoiceWithItems {
    return {
        id: v.id,
        localId: v.localId ?? undefined,
        company_id: v.companyId ?? '',
        invoice_number: v.invoiceNumber ?? '',
        invoice_no: v.invoiceNumber ?? '',
        invoice_type: v.invoiceType,
        direction: v.type === 'INCOME' ? 'sale' : 'purchase',
        status: v.status,
        payment_status: v.paymentStatus.toLowerCase() as 'unpaid' | 'partial' | 'paid',
        date: dateOnly(v.date),
        due_date: v.dueDate ? dateOnly(v.dueDate) : undefined,
        subtotal: toLira(v.subtotal),
        tax_total: toLira(v.taxAmount),
        vat_total: toLira(v.taxAmount),
        discount_total: toLira(v.discountTotal),
        grand_total: toLira(v.totalAmount),
        currency: v.currency,
        description: v.description ?? undefined,
        notes: v.notes ?? undefined,
        item_count: v.items.length,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
        deleted_at: v.deletedAt ?? undefined,
        company_name: v.companyId ? companyNames.get(v.companyId) : undefined,
        items: v.items.map(mapItem),
    };
}

function toBackendData(data: Partial<Invoice>): Record<string, unknown> {
    const statusU = (data.status ?? '').toUpperCase();
    return {
        companyId: data.company_id ?? null,
        invoiceNumber: data.invoice_no ?? data.invoice_number ?? null,
        type: data.direction === 'sale' ? 'INCOME' : 'EXPENSE',
        invoiceType: data.invoice_type ?? 'SALES',
        status: INVOICE_STATUSES.includes(statusU) ? statusU : 'ISSUED',
        paymentStatus: (data.payment_status ?? 'unpaid').toUpperCase(),
        subtotal: toKurus(data.subtotal),
        taxAmount: toKurus(data.tax_total ?? data.vat_total),
        discountTotal: toKurus(data.discount_total),
        totalAmount: toKurus(data.grand_total),
        currency: data.currency ?? 'TRY',
        date: data.date,
        dueDate: data.due_date ?? null,
        isPaid: (data.payment_status ?? 'unpaid') === 'paid',
        description: data.description ?? null,
        notes: data.notes ?? null,
    };
}

function toBackendItems(items: Array<Partial<InvoiceLineItem>>): Array<Record<string, unknown>> {
    return items.map((it) => ({
        description: it.product_name || it.name || it.description || '',
        unit: it.unit ?? 'Adet',
        quantity: it.quantity ?? 1,
        unitPrice: toKurus(it.unit_price),
        taxRate: it.tax_rate ?? it.vat_rate ?? 0,
        discountRate: it.discount_rate ?? 0,
        totalPrice: toKurus(it.total ?? it.line_total),
    }));
}

async function companyNameMap(): Promise<Map<string, string>> {
    const cs = await getList<CompanyView>('/finance/companies');
    return new Map(cs.map((c) => [c.id, c.name]));
}

export const invoiceService = {
    async getAll(): Promise<Invoice[]> {
        const [rows, names] = await Promise.all([getList<FinanceInvoiceView>('/finance/invoices'), companyNameMap()]);
        return rows.map((r) => mapView(r, names));
    },

    async getByDirection(direction: 'purchase' | 'sale'): Promise<Invoice[]> {
        const all = await this.getAll();
        return all.filter((i) => i.direction === direction);
    },

    async getById(id: string): Promise<InvoiceWithItems | null> {
        const [rows, names] = await Promise.all([getList<FinanceInvoiceView>('/finance/invoices'), companyNameMap()]);
        const found = rows.find((r) => r.id === id);
        return found ? mapView(found, names) : null;
    },

    async create(
        data: Omit<Invoice, 'created_at' | 'item_count'>,
        items: Omit<InvoiceLineItem, 'invoice_id'>[],
    ): Promise<string> {
        const localId = data.localId ?? generateId();
        const serverId = await pushOp('invoice', 'UPSERT', localId, toBackendData(data), toBackendItems(items));
        return serverId ?? localId;
    },

    async update(
        id: string,
        data: Partial<Omit<Invoice, 'id' | 'created_at' | 'item_count'>>,
        items?: Omit<InvoiceLineItem, 'invoice_id'>[],
    ): Promise<void> {
        const localId = await this._localId(id, data.localId);
        await pushOp('invoice', 'UPSERT', localId, toBackendData(data), items ? toBackendItems(items) : undefined);
    },

    async updatePaymentStatus(id: string, status: 'unpaid' | 'partial' | 'paid'): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('invoice', 'UPSERT', localId, { paymentStatus: status.toUpperCase(), isPaid: status === 'paid' });
    },

    async delete(id: string): Promise<void> {
        const localId = await this._localId(id);
        await pushOp('invoice', 'DELETE', localId);
    },

    async getSummary(direction: 'purchase' | 'sale'): Promise<InvoiceSummary> {
        const list = await this.getByDirection(direction);
        const now = new Date();
        const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const unpaid = list.filter((i) => i.payment_status !== 'paid');
        const month = list.filter((i) => i.date >= firstOfMonth);
        const sum = (arr: Invoice[]) => arr.reduce((s, i) => s + i.grand_total, 0);
        return {
            totalCount: list.length,
            totalAmount: sum(list),
            unpaidCount: unpaid.length,
            unpaidAmount: sum(unpaid),
            thisMonthCount: month.length,
            thisMonthAmount: sum(month),
        };
    },

    async generateNextNo(direction: 'purchase' | 'sale'): Promise<string> {
        const prefix = direction === 'purchase' ? 'ALI' : 'SAT';
        const year = new Date().getFullYear();
        const list = await this.getByDirection(direction);
        const next = list.filter((i) => (i.invoice_no ?? '').startsWith(`${prefix}-${year}`)).length + 1;
        return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
    },

    async getNextInvoiceNo(direction: 'purchase' | 'sale'): Promise<string> {
        return this.generateNextNo(direction);
    },

    /** id -> localId cozumu (backend push localId ile eslesir). */
    async _localId(id: string, hint?: string): Promise<string> {
        if (hint) return hint;
        const rows = await getList<FinanceInvoiceView>('/finance/invoices');
        return rows.find((r) => r.id === id)?.localId ?? id;
    },
};
