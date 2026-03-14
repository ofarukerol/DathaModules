// Finance Module — DathaModules Submodule
// Barrel export for all finance pages, stores, services, and components

// ─── Pages ───
export { default as Banks } from './pages/Banks';
export { default as BankDetail } from './pages/BankDetail';
export { default as Companies } from './pages/Companies';
export { default as CompanyDetail } from './pages/CompanyDetail';
export { default as Invoices } from './pages/Invoices';
export { default as InvoiceForm } from './pages/InvoiceForm';
export { default as Checks } from './pages/Checks';
export { default as IncomeExpense } from './pages/IncomeExpense';
export { default as FinanceCategories } from './pages/FinanceCategories';
export { default as Marketplaces } from './pages/Marketplaces';
export { default as OrderDetail } from './pages/OrderDetail';

// ─── Stores ───
export { useBankStore } from './stores/useBankStore';
export { useBankAccountStore } from './stores/useBankAccountStore';
export { useBankTransactionStore } from './stores/useBankTransactionStore';
export { useInvoiceStore } from './stores/useInvoiceStore';
export { useCheckStore } from './stores/useCheckStore';
export { useCheckNoteStore } from './stores/useCheckNoteStore';
export { useFinanceCategoryStore } from './stores/useFinanceCategoryStore';

// ─── Types ───
export type * from './types';
