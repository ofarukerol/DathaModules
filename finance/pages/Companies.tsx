import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import { COMPANY_TYPE_LABELS } from '../types';
import type { CompanyType } from '../types';
import { formatCurrency } from '../../_shared/helpers';
import CustomSelect from '../../../components/CustomSelect';
import EmptyState from '../../../components/EmptyState';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PageToolbar from '../../../components/PageToolbar';

const TYPE_COLORS: Record<CompanyType, { badge: string; avatar: string }> = {
    CUSTOMER: { badge: 'text-blue-600 bg-blue-50', avatar: 'bg-blue-100 text-blue-700' },
    SUPPLIER: { badge: 'text-orange-600 bg-orange-50', avatar: 'bg-orange-100 text-orange-700' },
    BOTH: { badge: 'text-purple-600 bg-purple-50', avatar: 'bg-purple-100 text-purple-700' },
};

const TYPE_ICONS: Record<CompanyType, string> = {
    CUSTOMER: 'person',
    SUPPLIER: 'local_shipping',
    BOTH: 'sync_alt',
};

const typeFilterOptions = [
    { value: '', label: 'Tüm Türler', icon: 'filter_list' },
    { value: 'CUSTOMER', label: 'Müşteri', icon: 'person' },
    { value: 'SUPPLIER', label: 'Tedarikçi', icon: 'local_shipping' },
    { value: 'BOTH', label: 'Müşteri/Tedarikçi', icon: 'sync_alt' },
];

function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

export default function Companies() {
    const navigate = useNavigate();
    const { companies, loading, filters, setFilters, fetchCompanies, addCompany, deleteCompany } = useCompanyStore();
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', type: 'CUSTOMER' as CompanyType, phone: '', email: '', city: '' });

    useEffect(() => { fetchCompanies(); }, []);

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        await addCompany({
            name: form.name,
            type: form.type,
            phone: form.phone || undefined,
            email: form.email || undefined,
            city: form.city || undefined,
        });
        setShowModal(false);
        setForm({ name: '', type: 'CUSTOMER', phone: '', email: '', city: '' });
    };

    const customerCount = companies.filter((c) => c.type === 'CUSTOMER').length;
    const supplierCount = companies.filter((c) => c.type === 'SUPPLIER').length;
    const bothCount = companies.filter((c) => c.type === 'BOTH').length;

    const hasActiveFilter = !!filters.search || !!filters.type;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                <PageToolbar
                    icon="corporate_fare"
                    title="Cari Hesaplar"
                    stats={`${companies.length} firma kayıtlı`}
                    actions={
                        <button
                            onClick={() => setShowModal(true)}
                            className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                            style={{ background: '#663259' }}
                        >
                            <span className="material-symbols-outlined text-[17px]">add</span>
                            Yeni Cari
                        </button>
                    }
                />

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 flex-wrap">
                    {/* Arama */}
                    <div className="relative flex-1 min-w-[160px]">
                        <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ search: e.target.value })}
                            placeholder="Firma adı ara..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                        />
                    </div>

                    {/* Tür Filtresi */}
                    <div className="w-44 shrink-0">
                        <CustomSelect
                            options={typeFilterOptions}
                            value={filters.type}
                            onChange={(v) => setFilters({ type: v as CompanyType | '' })}
                            placeholder="Tür filtrele"
                            icon="filter_list"
                            accentColor="#663259"
                        />
                    </div>

                    {/* Hızlı tip sayaçları */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setFilters({ type: filters.type === 'CUSTOMER' ? '' : 'CUSTOMER' })}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                filters.type === 'CUSTOMER'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            {customerCount} Müşteri
                        </button>
                        <button
                            onClick={() => setFilters({ type: filters.type === 'SUPPLIER' ? '' : 'SUPPLIER' })}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                filters.type === 'SUPPLIER'
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            {supplierCount} Tedarikçi
                        </button>
                        {bothCount > 0 && (
                            <button
                                onClick={() => setFilters({ type: filters.type === 'BOTH' ? '' : 'BOTH' })}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    filters.type === 'BOTH'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                                {bothCount} İkisi
                            </button>
                        )}
                    </div>

                    {/* Filtreyi temizle */}
                    {hasActiveFilter && (
                        <button
                            onClick={() => setFilters({ search: '', type: '' })}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all shrink-0"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Temizle
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3">
                                <svg className="animate-spin h-7 w-7 text-[#663259]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm text-gray-400">Yükleniyor...</span>
                            </div>
                        </div>
                    ) : companies.length === 0 ? (
                        <EmptyState
                            icon="business"
                            title="Henüz cari hesap yok"
                            description="Müşteri ve tedarikçi bilgilerinizi buradan yönetebilirsiniz."
                            actionLabel="Yeni Cari Ekle"
                            onAction={() => setShowModal(true)}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {companies.map((c) => {
                                const colors = TYPE_COLORS[c.type];
                                const initials = getInitials(c.name);
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => navigate(`/finance/companies/${c.id}`)}
                                        className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                                    >
                                        {/* Üst: Avatar + Bilgiler + Sil butonu */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${colors.avatar}`}>
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">{c.name}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${colors.badge}`}>
                                                        <span className="material-symbols-outlined text-[11px]">{TYPE_ICONS[c.type]}</span>
                                                        {COMPANY_TYPE_LABELS[c.type]}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-[16px] text-red-400">delete</span>
                                            </button>
                                        </div>

                                        {/* İletişim */}
                                        {(c.phone || c.city || c.email) && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                                                {c.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px] text-gray-400">phone</span>
                                                        {c.phone}
                                                    </span>
                                                )}
                                                {c.city && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px] text-gray-400">location_on</span>
                                                        {c.city}
                                                    </span>
                                                )}
                                                {c.email && (
                                                    <span className="flex items-center gap-1 truncate">
                                                        <span className="material-symbols-outlined text-[13px] text-gray-400">mail</span>
                                                        <span className="truncate">{c.email}</span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Bakiye */}
                                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className={`text-sm font-bold ${c.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {formatCurrency(c.balance)}
                                            </span>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>
                                                Bakiye
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Yeni Cari Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px] text-[#663259]">corporate_fare</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Yeni Cari Hesap</h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                            >
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Firma Adı *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                    placeholder="Firma adı girin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tür</label>
                                <CustomSelect
                                    options={[
                                        { value: 'CUSTOMER', label: 'Müşteri', icon: 'person' },
                                        { value: 'SUPPLIER', label: 'Tedarikçi', icon: 'local_shipping' },
                                        { value: 'BOTH', label: 'Müşteri/Tedarikçi', icon: 'sync_alt' },
                                    ]}
                                    value={form.type}
                                    onChange={(v) => setForm({ ...form, type: v as CompanyType })}
                                    icon="category"
                                    accentColor="#663259"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Telefon</label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                        placeholder="0 5XX XXX XX XX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Şehir</label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                        placeholder="İstanbul"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">E-posta</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#663259] focus:bg-white transition-all"
                                    placeholder="info@firma.com"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!form.name.trim()}
                                className="w-full py-3 bg-[#663259] text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onayı */}
            <ConfirmDialog
                open={!!deleteId}
                title="Cari Hesabı Sil"
                message="Bu cari hesabı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmLabel="Sil"
                onConfirm={async () => { if (deleteId) await deleteCompany(deleteId); setDeleteId(null); }}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
