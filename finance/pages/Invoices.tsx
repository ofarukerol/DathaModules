import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2 } from 'lucide-react';
import { useInvoiceStore } from '../stores/useInvoiceStore';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import { COMPANY_TYPE_LABELS } from '../types';
import { Invoice, InvoiceWithItems } from '../services/invoiceService';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import HeaderActions from '../../../components/HeaderActions';

const ITEMS_PER_PAGE = 10;

const AVATAR_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { bg: 'bg-amber-100', text: 'text-amber-600' },
];

const INVOICE_TYPE_LABELS: Record<string, string> = {
    perakende_satis: 'Perakende Satış',
    toptan_satis: 'Toptan Satış',
    iade: 'İade',
    ihracat_faturasi: 'İhracat Faturası',
    istisna: 'İstisna',
    masraf: 'Masraf',
    fiyat_farki: 'Fiyat Farkı',
    kur_farki: 'Kur Farkı',
    red: 'Red',
    tevkifat: 'Tevkifat',
    ihracat_kayitli: 'İhracat Kayıtlı',
    komisyon: 'Komisyon',
    yazar_kasa: 'Yazar Kasa',
    ithalat_irsaliyesi: 'İthalat İrsaliyesi',
};

const formatCurrency = (val: number) =>
    `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
};

const getCompanyInitials = (name: string) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getStatusDisplay = (inv: Invoice) => {
    const today = new Date().toISOString().split('T')[0];
    if (inv.payment_status === 'paid') {
        return { label: 'Ödendi', dotColor: 'bg-green-600', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-200' };
    }
    if (inv.due_date && inv.due_date < today) {
        return { label: 'Gecikmiş', dotColor: 'bg-red-600', bgColor: 'bg-red-100', textColor: 'text-red-700', borderColor: 'border-red-200' };
    }
    if (inv.payment_status === 'partial') {
        return { label: 'Kısmi Ödendi', dotColor: 'bg-amber-600', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-amber-200' };
    }
    return { label: 'Bekliyor', dotColor: 'bg-yellow-600', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' };
};

// --- Company Select Modal ---
interface CompanySelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (companyId: string) => void;
}

const CompanySelectModal: React.FC<CompanySelectModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { companies } = useCompanyStore();
    const [search, setSearch] = useState('');
    useEscapeKey(onClose, isOpen);

    if (!isOpen) return null;

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.title && c.title.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Firma Seçin</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Fatura kesilecek firmayı seçin</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative mb-3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Firma ara..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                        {filtered.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8">Firma bulunamadı</p>
                        ) : (
                            filtered.map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => onSelect(company.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#663259]/5 transition-colors text-left"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-[#663259]/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#663259] text-[18px]">corporate_fare</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{company.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{company.title || company.phone}</p>
                                    </div>
                                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${company.type === 'SUPPLIER' ? 'bg-blue-50 text-blue-500' : company.type === 'CUSTOMER' ? 'bg-green-50 text-green-500' : 'bg-purple-50 text-purple-500'}`}>
                                        {COMPANY_TYPE_LABELS[company.type] || company.type}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Invoice Detail Modal ---
interface InvoiceDetailModalProps {
    invoice: InvoiceWithItems | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: 'unpaid' | 'partial' | 'paid') => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, isOpen, onClose, onDelete, onStatusChange }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEscapeKey(onClose, isOpen);

    if (!isOpen || !invoice) return null;

    const status = getStatusDisplay(invoice);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${invoice.direction === 'purchase' ? 'bg-blue-50' : 'bg-green-50'}`}>
                            <span className={`material-symbols-outlined text-[20px] ${invoice.direction === 'purchase' ? 'text-blue-500' : 'text-green-500'}`}>
                                {invoice.direction === 'purchase' ? 'call_received' : 'call_made'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{invoice.invoice_no}</h3>
                            <p className="text-xs text-gray-500">
                                {invoice.direction === 'purchase' ? 'Gelen Fatura' : 'Giden Fatura'} — {INVOICE_TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Firma</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{invoice.company_name || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Durum</p>
                            <span className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.textColor} border ${status.borderColor}`}>
                                <span className={`w-1.5 h-1.5 ${status.dotColor} rounded-full mr-1.5`} />
                                {status.label}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fatura Tarihi</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{formatDate(invoice.date)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vade Tarihi</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{invoice.due_date ? formatDate(invoice.due_date) : '-'}</p>
                        </div>
                    </div>

                    {invoice.description && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-6">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Açıklama</p>
                            <p className="text-sm text-gray-700 mt-1">{invoice.description}</p>
                        </div>
                    )}

                    {/* Items Table */}
                    {invoice.items && invoice.items.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ürün</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Miktar</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">B. Fiyat</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">KDV</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoice.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{item.name}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 text-center">{item.quantity} {item.unit}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 text-center">%{item.vat_rate}</td>
                                            <td className="px-4 py-2.5 text-sm font-bold text-gray-800 text-right">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex justify-between px-5 py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500 font-medium">Ara Toplam</span>
                            <span className="text-sm font-bold text-gray-700">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between px-5 py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500 font-medium">KDV</span>
                            <span className="text-sm font-bold text-gray-700">{formatCurrency(invoice.vat_total)}</span>
                        </div>
                        <div className="flex justify-between px-5 py-4 bg-gray-50">
                            <span className="text-sm font-bold text-gray-800">Genel Toplam</span>
                            <span className="text-xl font-black text-[#663259]">{formatCurrency(invoice.grand_total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-colors text-sm"
                            >
                                <Trash2 size={16} />
                                Sil
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { onDelete(invoice.id); setShowDeleteConfirm(false); }}
                                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                                >
                                    Evet, Sil
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {invoice.payment_status !== 'paid' && (
                            <button
                                onClick={() => onStatusChange(invoice.id, 'paid')}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Ödendi
                            </button>
                        )}
                        {invoice.payment_status === 'paid' && (
                            <button
                                onClick={() => onStatusChange(invoice.id, 'unpaid')}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">undo</span>
                                Ödenmedi Yap
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Invoices Page ---
const Invoices: React.FC = () => {
    const navigate = useNavigate();
    const {
        invoices, isLoading, activeTab, selectedInvoice,
        fetchInvoices, fetchSummary, setActiveTab,
        deleteInvoice, updatePaymentStatus, loadInvoiceDetail, clearSelectedInvoice,
    } = useInvoiceStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchInvoices();
        fetchSummary();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, dateFrom, dateTo, activeTab]);

    // Summary computed from invoices
    const summaryData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const paid = invoices.filter(inv => inv.payment_status === 'paid');
        const overdue = invoices.filter(inv => inv.payment_status !== 'paid' && inv.due_date && inv.due_date < today);
        const pending = invoices.filter(inv => inv.payment_status !== 'paid' && !(inv.due_date && inv.due_date < today));
        return {
            paid: { count: paid.length, amount: paid.reduce((s, i) => s + i.grand_total, 0) },
            pending: { count: pending.length, amount: pending.reduce((s, i) => s + i.grand_total, 0) },
            overdue: { count: overdue.length, amount: overdue.reduce((s, i) => s + i.grand_total, 0) },
        };
    }, [invoices]);

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        let result = [...invoices];
        const today = new Date().toISOString().split('T')[0];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(inv =>
                inv.invoice_no.toLowerCase().includes(q) ||
                (inv.company_name && inv.company_name.toLowerCase().includes(q)) ||
                (inv.description && inv.description.toLowerCase().includes(q))
            );
        }

        if (statusFilter) {
            if (statusFilter === 'overdue') {
                result = result.filter(inv => inv.payment_status !== 'paid' && inv.due_date && inv.due_date < today);
            } else {
                result = result.filter(inv => inv.payment_status === statusFilter);
            }
        }

        if (dateFrom) result = result.filter(inv => inv.date >= dateFrom);
        if (dateTo) result = result.filter(inv => inv.date <= dateTo);

        return result;
    }, [invoices, searchQuery, statusFilter, dateFrom, dateTo]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getPageNumbers = () => {
        const pages: number[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            for (let i = 1; i <= 5; i++) pages.push(i);
        } else if (currentPage >= totalPages - 2) {
            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
            for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
        }
        return pages;
    };

    const handleCompanySelect = (companyId: string) => {
        setShowCompanyModal(false);
        navigate(`/finance/companies/${companyId}/invoice/new?direction=${activeTab}`);
    };

    const handleRowClick = async (invoiceId: string) => {
        await loadInvoiceDetail(invoiceId);
        setShowDetailModal(true);
    };

    const handleDelete = async (id: string) => {
        await deleteInvoice(id);
        setShowDetailModal(false);
        clearSelectedInvoice();
    };

    const handleStatusChange = async (id: string, status: 'unpaid' | 'partial' | 'paid') => {
        await updatePaymentStatus(id, status);
    };

    const hasActiveFilters = !!statusFilter || !!dateFrom || !!dateTo;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                {/* Gradient Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button onClick={() => navigate(-1)} className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0">
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">receipt_long</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Faturalar</h1>
                                <p className="text-white/60 text-xs mt-0.5">Fatura yönetim paneli</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* Tabs */}
                            <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 border border-white/15">
                                <button
                                    onClick={() => setActiveTab('purchase')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'purchase'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/50 hover:text-white/80'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">call_received</span>
                                    Gelen
                                </button>
                                <button
                                    onClick={() => setActiveTab('sale')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'sale'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/50 hover:text-white/80'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">call_made</span>
                                    Giden
                                </button>
                            </div>
                            <button
                                onClick={() => setShowCompanyModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-xl text-sm font-bold hover:bg-white/25 border border-white/20 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Fatura
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Ödenen */}
                        <div className="bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/80 relative overflow-hidden group cursor-pointer hover:border-green-500/50 transition-all">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        Ödenen
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(summaryData.paid.amount)}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{summaryData.paid.count} Adet Fatura</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined text-green-500 text-[28px]">check_circle</span>
                                </div>
                            </div>
                        </div>

                        {/* Bekleyen */}
                        <div className="bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/80 relative overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-all">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Bekleyen
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(summaryData.pending.amount)}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{summaryData.pending.count} Adet Fatura</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined text-amber-500 text-[28px]">hourglass_top</span>
                                </div>
                            </div>
                        </div>

                        {/* Vadesi Geçen */}
                        <div className="bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/80 relative overflow-hidden group cursor-pointer hover:border-red-500/50 transition-all">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                        Vadesi Geçen
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(summaryData.overdue.amount)}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{summaryData.overdue.count} Adet Fatura</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined text-red-500 text-[28px]">warning</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 w-full md:w-auto relative">
                            <span className="absolute left-3 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                            <input
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-[#F97171]/20 focus:border-[#F97171] outline-none transition-all"
                                placeholder="Fatura No veya Cari Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${showFilters || hasActiveFilters
                                    ? 'bg-[#663259] text-white border-[#663259]'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                Filtrele
                                {hasActiveFilters && (
                                    <span className="w-5 h-5 bg-white/20 rounded-full text-[10px] font-bold flex items-center justify-center">
                                        {[statusFilter, dateFrom, dateTo].filter(Boolean).length}
                                    </span>
                                )}
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200 transition-colors whitespace-nowrap">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Dışa Aktar
                            </button>
                        </div>
                    </div>

                    {/* Expandable Filter Panel */}
                    {showFilters && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end -mt-2">
                            <div className="flex-1 min-w-[180px]">
                                <label className="text-xs text-gray-500 mb-1 block font-medium">Başlangıç Tarihi</label>
                                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Başlangıç" icon="event" compact />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="text-xs text-gray-500 mb-1 block font-medium">Bitiş Tarihi</label>
                                <DatePicker value={dateTo} onChange={setDateTo} placeholder="Bitiş" icon="event" compact />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="text-xs text-gray-500 mb-1 block font-medium">Ödeme Durumu</label>
                                <CustomSelect
                                    options={[
                                        { value: '', label: 'Tümü' },
                                        { value: 'paid', label: 'Ödendi' },
                                        { value: 'unpaid', label: 'Bekliyor' },
                                        { value: 'partial', label: 'Kısmi Ödendi' },
                                        { value: 'overdue', label: 'Gecikmiş' },
                                    ]}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    placeholder="Durum seçin"
                                />
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); }}
                                    className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    )}

                    {/* Table */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full" />
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="material-symbols-outlined text-gray-300 text-[64px] mb-4">description</span>
                                <p className="text-lg font-bold text-gray-400 mb-1">
                                    {searchQuery || hasActiveFilters
                                        ? 'Sonuç bulunamadı'
                                        : activeTab === 'purchase'
                                            ? 'Henüz gelen fatura yok'
                                            : 'Henüz giden fatura yok'}
                                </p>
                                <p className="text-sm text-gray-400">
                                    {!searchQuery && !hasActiveFilters && 'İlk faturanızı oluşturmak için yukarıdaki butona tıklayın.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                            <th className="px-6 py-4 font-semibold">Fatura No</th>
                                            <th className="px-6 py-4 font-semibold">Cari Hesap</th>
                                            <th className="px-6 py-4 font-semibold">Tarih</th>
                                            <th className="px-6 py-4 font-semibold">Vade</th>
                                            <th className="px-6 py-4 font-semibold text-right">Tutar</th>
                                            <th className="px-6 py-4 font-semibold text-center">Durum</th>
                                            <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {paginatedInvoices.map(inv => {
                                            const st = getStatusDisplay(inv);
                                            const avatar = getAvatarColor(inv.company_name || '');
                                            const initials = getCompanyInitials(inv.company_name || '');
                                            return (
                                                <tr
                                                    key={inv.id}
                                                    onClick={() => handleRowClick(inv.id)}
                                                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 font-medium text-[#663259]">{inv.invoice_no}</td>
                                                    <td className="px-6 py-4 text-gray-800 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-full ${avatar.bg} ${avatar.text} flex items-center justify-center text-xs font-bold shrink-0`}>
                                                                {initials}
                                                            </div>
                                                            <span className="truncate">{inv.company_name || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">{formatDate(inv.date)}</td>
                                                    <td className="px-6 py-4 text-gray-500">{inv.due_date ? formatDate(inv.due_date) : '-'}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(inv.grand_total)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.bgColor} ${st.textColor} border ${st.borderColor} inline-flex items-center`}>
                                                            <span className={`w-1.5 h-1.5 ${st.dotColor} rounded-full mr-1.5`} />
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRowClick(inv.id); }}
                                                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                                                                title="Görüntüle"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                                                                title="Yazdır"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">print</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                <p className="text-xs text-gray-500">Toplam {filteredInvoices.length} kayıt gösteriliyor</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Önceki
                                    </button>
                                    {getPageNumbers().map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setCurrentPage(num)}
                                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${currentPage === num
                                                ? 'text-white bg-[#663259] border border-[#663259]'
                                                : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Sonraki
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CompanySelectModal
                isOpen={showCompanyModal}
                onClose={() => setShowCompanyModal(false)}
                onSelect={handleCompanySelect}
            />

            <InvoiceDetailModal
                invoice={selectedInvoice}
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); clearSelectedInvoice(); }}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
};

export default Invoices;
