// ============ ENUMS (union types) ============

export type CompanyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK';

export type BankTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

export type InvoiceType = 'SALES' | 'PURCHASE' | 'RETURN' | 'PROFORMA' | 'WAYBILL';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

// ============ LABEL MAPS (Turkish UI) ============

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
    CUSTOMER: 'Müşteri',
    SUPPLIER: 'Tedarikçi',
    BOTH: 'Müşteri/Tedarikçi',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: 'Gelir',
    EXPENSE: 'Gider',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: 'Nakit',
    CARD: 'Kredi Kartı',
    BANK_TRANSFER: 'Havale/EFT',
    CHECK: 'Çek',
};

export const BANK_TX_TYPE_LABELS: Record<BankTransactionType, string> = {
    DEPOSIT: 'Giriş',
    WITHDRAWAL: 'Çıkış',
    TRANSFER: 'Transfer',
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
    SALES: 'Satış Faturası',
    PURCHASE: 'Alış Faturası',
    RETURN: 'İade Faturası',
    PROFORMA: 'Proforma Fatura',
    WAYBILL: 'İrsaliye',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
    DRAFT: 'Taslak',
    ISSUED: 'Kesildi',
    PAID: 'Ödendi',
    CANCELLED: 'İptal',
};

// ============ ENTITIES ============

export interface Company {
    id: string;
    name: string;
    title?: string;
    type: CompanyType;
    tax_number?: string;
    tax_office?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    balance: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface FinanceCategory {
    id: string;
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    is_default: number;
    created_at: string;
}

export interface FinanceTransaction {
    id: string;
    company_id?: string;
    category_id?: string;
    employee_id?: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description?: string;
    date: string;
    payment_method?: PaymentMethod;
    created_at: string;
    updated_at: string;
    // Joined fields
    company_name?: string;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
}

export interface BankAccount {
    id: string;
    name: string;
    bank_name: string;
    iban?: string;
    currency: string;
    balance: number;
    is_default: number;
    code: string;
    color: string;
    status: 'active' | 'passive';
    created_at: string;
    updated_at: string;
}

export interface BankTransaction {
    id: string;
    bank_account_id: string;
    company_id?: string;
    type: BankTransactionType;
    amount: number;
    description?: string;
    date: string;
    reference_id?: string;
    created_at: string;
    // Joined fields
    bank_name?: string;
    account_name?: string;
    company_name?: string;
}

export interface Invoice {
    id: string;
    company_id: string;
    invoice_number: string;
    invoice_no: string;
    invoice_type: string;
    direction: 'purchase' | 'sale';
    status: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    date: string;
    due_date?: string;
    subtotal: number;
    tax_total: number;
    vat_total: number;
    discount_total: number;
    grand_total: number;
    currency: string;
    description?: string;
    notes?: string;
    item_count: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    // Joined fields
    company_name?: string;
    items?: InvoiceItem[];
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    product_name: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    vat_rate: number;
    discount_rate: number;
    line_total: number;
    total: number;
    created_at: string;
}

// ============ CHECK / PROMISSORY NOTE (ÇEK/SENET) ============

export type CheckType = 'CHECK_RECEIVED' | 'CHECK_ISSUED' | 'NOTE_RECEIVED' | 'NOTE_ISSUED';

export type CheckStatus = 'PENDING' | 'DEPOSITED' | 'CASHED' | 'BOUNCED' | 'ENDORSED' | 'CANCELLED';

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
    CHECK_RECEIVED: 'Alınan Çek',
    CHECK_ISSUED: 'Verilen Çek',
    NOTE_RECEIVED: 'Alınan Senet',
    NOTE_ISSUED: 'Verilen Senet',
};

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
    PENDING: 'Beklemede',
    DEPOSITED: 'Bankaya Verildi',
    CASHED: 'Tahsil Edildi',
    BOUNCED: 'Karşılıksız',
    ENDORSED: 'Ciro Edildi',
    CANCELLED: 'İptal',
};

export interface CheckNote {
    id: string;
    type: CheckType;
    company_id?: string;
    amount: number;
    currency: string;
    issue_date: string;
    due_date: string;
    status: CheckStatus;
    bank_name?: string;
    check_number?: string;
    notes?: string;
    endorser?: string;
    created_at: string;
    updated_at: string;
    // Joined
    company_name?: string;
}

// ============ REGISTER (KASA) ============

export type CashSessionStatus = 'OPEN' | 'CLOSED';

export interface CashSession {
    id: string;
    user_id?: string;
    opening_date: string;
    closing_date?: string;
    opening_balance: number;
    closing_balance?: number;
    expected_balance?: number;
    status: CashSessionStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentSummary {
    method: string;
    total: number;
}

export interface CashSessionSummary {
    openingBalance: number;
    cashIncome: number;
    cashExpense: number;
    cashSales: number;
    expectedBalance: number;
    allPayments: PaymentSummary[];
}
