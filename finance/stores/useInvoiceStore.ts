import { create } from 'zustand';
import { invoiceService, Invoice, InvoiceWithItems, InvoiceSummary } from '../services/invoiceService';

// Practical input types — auto-generated fields are optional
interface InvoiceInput {
    id: string;
    company_id: string;
    invoice_type: string;
    direction: 'purchase' | 'sale';
    date: string;
    invoice_no?: string;
    invoice_number?: string;
    due_date?: string;
    description?: string;
    notes?: string;
    subtotal?: number;
    vat_total?: number;
    tax_total?: number;
    discount_total?: number;
    grand_total?: number;
    payment_status?: 'unpaid' | 'partial' | 'paid';
    status?: string;
    currency?: string;
    company_name?: string;
}

interface InvoiceItemInput {
    id?: string;
    name?: string;
    product_name?: string;
    product_id?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    vat_rate?: number;
    tax_rate?: number;
    discount_rate?: number;
    total?: number;
    line_total?: number;
    description?: string;
}

interface InvoiceStore {
    invoices: Invoice[];
    isLoading: boolean;
    activeTab: 'purchase' | 'sale';
    summary: InvoiceSummary;
    selectedInvoice: InvoiceWithItems | null;

    fetchInvoices: () => Promise<void>;
    addInvoice: (data: InvoiceInput, items: InvoiceItemInput[]) => Promise<string>;
    updateInvoice: (id: string, data: Partial<InvoiceInput>, items?: InvoiceItemInput[]) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    updatePaymentStatus: (id: string, status: 'unpaid' | 'partial' | 'paid') => Promise<void>;
    setActiveTab: (tab: 'purchase' | 'sale') => void;
    fetchSummary: () => Promise<void>;
    loadInvoiceDetail: (id: string) => Promise<void>;
    clearSelectedInvoice: () => void;
    getNextInvoiceNo: (direction: 'purchase' | 'sale') => Promise<string>;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
    invoices: [],
    isLoading: false,
    activeTab: 'purchase',
    summary: { totalCount: 0, totalAmount: 0, unpaidCount: 0, unpaidAmount: 0, thisMonthCount: 0, thisMonthAmount: 0 },
    selectedInvoice: null,

    fetchInvoices: async () => {
        set({ isLoading: true });
        try {
            const tab = get().activeTab;
            const data = await invoiceService.getByDirection(tab);
            set({ invoices: data, isLoading: false });
        } catch (err) {
            set({ isLoading: false });
        }
    },

    addInvoice: async (data, items) => {
        try {
            // Cast to service expected type — service handles defaults internally
            await invoiceService.create(data as Parameters<typeof invoiceService.create>[0], items as Parameters<typeof invoiceService.create>[1]);
            get().fetchInvoices();
            get().fetchSummary();
            return data.id;
        } catch (err) {
            throw err;
        }
    },

    updateInvoice: async (id, data, items) => {
        try {
            await invoiceService.update(id, data as Parameters<typeof invoiceService.update>[1], items as Parameters<typeof invoiceService.update>[2]);
            get().fetchInvoices();
            get().fetchSummary();
        } catch (err) {
            throw err;
        }
    },

    deleteInvoice: async (id) => {
        const prev = get().invoices;
        set((state) => ({
            invoices: state.invoices.filter((inv) => inv.id !== id),
        }));

        try {
            await invoiceService.delete(id);
            get().fetchSummary();
        } catch (err) {
            set({ invoices: prev });
        }
    },

    updatePaymentStatus: async (id, status) => {
        try {
            await invoiceService.updatePaymentStatus(id, status);
            set((state) => ({
                invoices: state.invoices.map((inv) =>
                    inv.id === id ? { ...inv, payment_status: status } : inv
                ),
                selectedInvoice: state.selectedInvoice?.id === id
                    ? { ...state.selectedInvoice, payment_status: status }
                    : state.selectedInvoice,
            }));
            get().fetchSummary();
        } catch (err) {
            // silent
        }
    },

    setActiveTab: (tab) => {
        set({ activeTab: tab });
        get().fetchInvoices();
        get().fetchSummary();
    },

    fetchSummary: async () => {
        try {
            const tab = get().activeTab;
            const summary = await invoiceService.getSummary(tab);
            set({ summary });
        } catch (err) {
            // silent
        }
    },

    loadInvoiceDetail: async (id) => {
        try {
            const detail = await invoiceService.getById(id);
            set({ selectedInvoice: detail });
        } catch (err) {
            // silent
        }
    },

    clearSelectedInvoice: () => set({ selectedInvoice: null }),

    getNextInvoiceNo: async (direction) => {
        return await invoiceService.getNextInvoiceNo(direction);
    },
}));
