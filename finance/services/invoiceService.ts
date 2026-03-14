import { getDb } from '../../_shared/db';
import api from '../../_shared/api';
import type { Invoice as BaseInvoice, InvoiceItem as BaseInvoiceItem } from '../types';
import { generateId, nowISO } from '../../_shared/helpers';

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

// SQL column list for invoices — includes new columns + aliases
const INVOICE_COLS = `
    i.id, i.company_id, i.invoice_number, i.invoice_no, i.invoice_type,
    i.direction, i.status, i.payment_status, i.date, i.due_date,
    i.subtotal, i.tax_total, i.tax_total as vat_total,
    i.discount_total, i.grand_total, i.currency,
    i.description, i.notes, i.item_count,
    i.created_at, i.updated_at, i.deleted_at,
    c.name as company_name
`;

const ITEM_COLS = `
    id, invoice_id, product_name, product_name as name,
    description, quantity, unit, unit_price,
    tax_rate, tax_rate as vat_rate,
    discount_rate, line_total, line_total as total,
    created_at
`;

export const invoiceService = {
    async getByDirection(direction: 'purchase' | 'sale'): Promise<Invoice[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/invoices?direction=${direction}`);
                const data = res.data;
                return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            } catch { return []; }
        }
        return db.select<Invoice[]>(
            `SELECT ${INVOICE_COLS}
             FROM invoices i
             LEFT JOIN companies c ON i.company_id = c.id
             WHERE i.deleted_at IS NULL AND i.direction = $1
             ORDER BY i.date DESC, i.created_at DESC`,
            [direction]
        );
    },

    async getAll(): Promise<Invoice[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/invoices');
                const data = res.data;
                return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            } catch { return []; }
        }
        return db.select<Invoice[]>(
            `SELECT ${INVOICE_COLS}
             FROM invoices i
             LEFT JOIN companies c ON i.company_id = c.id
             WHERE i.deleted_at IS NULL
             ORDER BY i.date DESC, i.created_at DESC`
        );
    },

    async getById(id: string): Promise<InvoiceWithItems | null> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/invoices/${id}`);
                const data = res.data;
                return data?.data ?? data ?? null;
            } catch { return null; }
        }

        const rows = await db.select<Invoice[]>(
            `SELECT ${INVOICE_COLS}
             FROM invoices i
             LEFT JOIN companies c ON i.company_id = c.id
             WHERE i.id = $1 AND i.deleted_at IS NULL`,
            [id]
        );
        if (!rows[0]) return null;

        const items = await db.select<InvoiceLineItem[]>(
            `SELECT ${ITEM_COLS} FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
            [id]
        );

        return { ...rows[0], items };
    },

    async create(
        data: Omit<Invoice, 'created_at' | 'item_count'>,
        items: Omit<InvoiceLineItem, 'invoice_id'>[]
    ): Promise<string> {
        const db = await getDb();
        if (!db) {
            const res = await api.post('/finance/invoices', { ...data, items });
            const result = res.data?.data ?? res.data;
            if (result?.id) return result.id;
            throw new Error('API: Fatura oluşturulamadı');
        }

        const id = data.id || generateId();
        const now = nowISO();

        // Calculate totals from items
        let subtotal = 0;
        let taxTotal = 0;
        let discountTotal = 0;

        const processedItems = items.map((item) => {
            const qty = item.quantity;
            const price = item.unit_price;
            const taxRate = item.tax_rate ?? item.vat_rate ?? 18;
            const discountRate = item.discount_rate ?? 0;
            const base = qty * price;
            const discount = base * (discountRate / 100);
            const afterDiscount = base - discount;
            const tax = afterDiscount * (taxRate / 100);
            const lineTotal = afterDiscount + tax;

            subtotal += base;
            taxTotal += tax;
            discountTotal += discount;

            return {
                product_name: item.product_name || item.name || '',
                description: item.description ?? null,
                quantity: qty,
                unit: item.unit ?? 'Adet',
                unit_price: price,
                tax_rate: taxRate,
                discount_rate: discountRate,
                line_total: item.total ?? item.line_total ?? lineTotal,
            };
        });

        const grandTotal = data.grand_total || (subtotal - discountTotal + taxTotal);
        const invoiceNo = data.invoice_no || data.invoice_number || await this.generateNextNo(data.direction || 'purchase');

        await db.execute(
            `INSERT INTO invoices (id, company_id, invoice_number, invoice_no, invoice_type, direction, status, payment_status, date, due_date, subtotal, tax_total, discount_total, grand_total, currency, description, notes, item_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
            [
                id, data.company_id, invoiceNo, invoiceNo,
                data.invoice_type, data.direction || 'purchase',
                data.status || 'active', data.payment_status || 'unpaid',
                data.date, data.due_date ?? null,
                data.subtotal ?? subtotal, data.tax_total ?? data.vat_total ?? taxTotal,
                data.discount_total ?? discountTotal, grandTotal,
                data.currency ?? 'TRY', data.description ?? null, data.notes ?? null,
                processedItems.length, now, now
            ]
        );

        for (const item of processedItems) {
            await db.execute(
                `INSERT INTO invoice_items (id, invoice_id, product_name, description, quantity, unit, unit_price, tax_rate, discount_rate, line_total, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [generateId(), id, item.product_name, item.description, item.quantity, item.unit, item.unit_price, item.tax_rate, item.discount_rate, item.line_total, now]
            );
        }

        return id;
    },

    async update(
        id: string,
        data: Partial<Omit<Invoice, 'id' | 'created_at' | 'item_count'>>,
        items?: Omit<InvoiceLineItem, 'invoice_id'>[]
    ): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.patch(`/finance/invoices/${id}`, { ...data, items });
            return;
        }

        const now = nowISO();

        if (items && items.length > 0) {
            // Recalculate totals
            let subtotal = 0;
            let taxTotal = 0;
            let discountTotal = 0;

            const processedItems = items.map((item) => {
                const base = item.quantity * item.unit_price;
                const discount = base * ((item.discount_rate ?? 0) / 100);
                const afterDiscount = base - discount;
                const tax = afterDiscount * ((item.tax_rate ?? item.vat_rate ?? 18) / 100);
                const lineTotal = afterDiscount + tax;

                subtotal += base;
                taxTotal += tax;
                discountTotal += discount;

                return {
                    product_name: item.product_name || item.name || '',
                    description: item.description ?? null,
                    quantity: item.quantity,
                    unit: item.unit ?? 'Adet',
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate ?? item.vat_rate ?? 18,
                    discount_rate: item.discount_rate ?? 0,
                    line_total: item.total ?? item.line_total ?? lineTotal,
                };
            });

            const grandTotal = subtotal - discountTotal + taxTotal;

            await db.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
            for (const item of processedItems) {
                await db.execute(
                    `INSERT INTO invoice_items (id, invoice_id, product_name, description, quantity, unit, unit_price, tax_rate, discount_rate, line_total, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [generateId(), id, item.product_name, item.description, item.quantity, item.unit, item.unit_price, item.tax_rate, item.discount_rate, item.line_total, now]
                );
            }

            await db.execute(
                `UPDATE invoices SET subtotal = $2, tax_total = $3, discount_total = $4, grand_total = $5, item_count = $6, updated_at = $7 WHERE id = $1`,
                [id, subtotal, taxTotal, discountTotal, grandTotal, processedItems.length, now]
            );
        }

        // Update header fields
        const allowed = ['company_id', 'invoice_no', 'invoice_type', 'direction', 'status', 'payment_status', 'date', 'due_date', 'currency', 'description', 'notes'] as const;
        const fields: string[] = [];
        const values: (string | number | null)[] = [id];
        let idx = 2;

        for (const key of allowed) {
            if (key in data) {
                fields.push(`${key} = $${idx}`);
                values.push((data as Record<string, unknown>)[key] as string | number | null);
                idx++;
            }
        }
        if (fields.length > 0) {
            fields.push(`updated_at = $${idx}`);
            values.push(now);
            await db.execute(`UPDATE invoices SET ${fields.join(', ')} WHERE id = $1`, values);
        }
    },

    async updatePaymentStatus(id: string, status: 'unpaid' | 'partial' | 'paid'): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.patch(`/finance/invoices/${id}`, { payment_status: status });
            return;
        }
        await db.execute('UPDATE invoices SET payment_status = $2, updated_at = $3 WHERE id = $1', [id, status, nowISO()]);
    },

    async getSummary(direction: 'purchase' | 'sale'): Promise<InvoiceSummary> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/invoices/summary?direction=${direction}`);
                const data = res.data?.data ?? res.data;
                return data ?? { totalCount: 0, totalAmount: 0, unpaidCount: 0, unpaidAmount: 0, thisMonthCount: 0, thisMonthAmount: 0 };
            } catch { return { totalCount: 0, totalAmount: 0, unpaidCount: 0, unpaidAmount: 0, thisMonthCount: 0, thisMonthAmount: 0 }; }
        }

        const now = new Date();
        const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const allRows = await db.select<{ cnt: number; amt: number }[]>(
            `SELECT COUNT(*) as cnt, COALESCE(SUM(grand_total), 0) as amt FROM invoices WHERE direction = $1 AND deleted_at IS NULL`,
            [direction]
        );
        const unpaidRows = await db.select<{ cnt: number; amt: number }[]>(
            `SELECT COUNT(*) as cnt, COALESCE(SUM(grand_total), 0) as amt FROM invoices WHERE direction = $1 AND deleted_at IS NULL AND payment_status != 'paid'`,
            [direction]
        );
        const monthRows = await db.select<{ cnt: number; amt: number }[]>(
            `SELECT COUNT(*) as cnt, COALESCE(SUM(grand_total), 0) as amt FROM invoices WHERE direction = $1 AND deleted_at IS NULL AND date >= $2`,
            [direction, firstOfMonth]
        );

        return {
            totalCount: allRows[0]?.cnt ?? 0,
            totalAmount: allRows[0]?.amt ?? 0,
            unpaidCount: unpaidRows[0]?.cnt ?? 0,
            unpaidAmount: unpaidRows[0]?.amt ?? 0,
            thisMonthCount: monthRows[0]?.cnt ?? 0,
            thisMonthAmount: monthRows[0]?.amt ?? 0,
        };
    },

    async getNextInvoiceNo(direction: 'purchase' | 'sale'): Promise<string> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get(`/finance/invoices/next-no?direction=${direction}`);
                const data = res.data?.data ?? res.data;
                if (typeof data === 'string') return data;
                if (data?.invoiceNo) return data.invoiceNo;
            } catch { /* fall through to local generation */ }
        }
        return await this.generateNextNo(direction);
    },

    async generateNextNo(direction: 'purchase' | 'sale'): Promise<string> {
        const db = await getDb();
        const prefix = direction === 'purchase' ? 'ALI' : 'SAT';
        const year = new Date().getFullYear();
        const pattern = `${prefix}-${year}-%`;

        if (db) {
            const rows = await db.select<{ cnt: number }[]>(
                `SELECT COUNT(*) as cnt FROM invoices WHERE direction = $1 AND invoice_no LIKE $2 AND deleted_at IS NULL`,
                [direction, pattern]
            );
            const next = (rows[0]?.cnt ?? 0) + 1;
            return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
        }
        return `${prefix}-${year}-0001`;
    },

    async delete(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.delete(`/finance/invoices/${id}`);
            return;
        }
        await db.execute('UPDATE invoices SET deleted_at = $2 WHERE id = $1', [id, nowISO()]);
    },
};
