import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Building2,
    Phone,
    MapPin,
    FileText,
    Plus,
    Download,
    Edit2,
    History,
    CreditCard,
    Clock,
    UserCircle
} from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import PageToolbar from '../../../components/PageToolbar';

const CompanyDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { companies, fetchCompanies, getCompanyById, getTransactionsByCompany, getCompanyBalance, updateCompany, addTransaction } = useCompanyStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isEInvoice, setIsEInvoice] = useState(true);
    const [isEArchive, setIsEArchive] = useState(false);

    useEffect(() => { if (companies.length === 0) fetchCompanies(); }, []);

    const company = getCompanyById(id || '');
    const transactions = getTransactionsByCompany(id || '');
    const balance = getCompanyBalance(id || '');

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', title: '', contact_person: '', phone: '', tax_office: '', tax_number: '', address: '', email: ''
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        method: 'nakit' as 'nakit' | 'havale' | 'kredi_karti' | 'cek',
    });

    const filteredTransactions = useMemo(() => transactions.filter(t => {
        if (!startDate && !endDate) return true;
        const d = new Date(t.date);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date(8640000000000000);
        return d >= start && d <= end;
    }), [transactions, startDate, endDate]);

    const periodTotals = useMemo(() => filteredTransactions.reduce((acc, t) => {
        if (t.type === 'purchase') acc.purchase += t.amount;
        else acc.payment += t.amount;
        return acc;
    }, { purchase: 0, payment: 0 }), [filteredTransactions]);

    const periodBalance = periodTotals.payment - periodTotals.purchase;

    // Running balance calculation for table rows
    const transactionsWithBalance = useMemo(() => {
        // Sort by date ascending for running balance
        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;
        const withBalance = sorted.map(t => {
            const before = runningBalance;
            if (t.type === 'purchase') runningBalance -= t.amount;
            else runningBalance += t.amount;
            return { ...t, balanceBefore: before, balanceAfter: runningBalance };
        });
        // Reverse to show newest first
        return withBalance.reverse();
    }, [filteredTransactions]);

    if (!company) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 font-bold">Firma bulunamadı.</p>
            </div>
        );
    }

    const openEditModal = () => {
        setEditForm({
            name: company.name,
            title: company.title || '',
            contact_person: company.contact_person || '',
            phone: company.phone || '',
            tax_office: company.tax_office || '',
            tax_number: company.tax_number || '',
            address: company.address || '',
            email: company.email || '',
        });
        setShowEditModal(true);
    };

    const handleEditSave = () => {
        updateCompany(company.id, editForm);
        setShowEditModal(false);
    };

    const handlePaymentSave = () => {
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return;
        addTransaction({
            companyId: company.id,
            date: paymentForm.date,
            description: paymentForm.description || 'Ödeme',
            type: 'payment',
            amount: Number(paymentForm.amount),
            method: paymentForm.method,
            status: 'completed',
        });
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'nakit' });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <PageToolbar
                icon="corporate_fare"
                title={company.name}
                stats={company.title}
                actions={
                    <>
                        <button
                            onClick={() => navigate(`/finance/companies/${id}/invoice/new`)}
                            className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                            style={{ background: '#663259' }}
                        >
                            <Plus size={16} />
                            Alış Faturası Ekle
                        </button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            <CreditCard size={16} />
                            Ödeme Ekle
                        </button>
                    </>
                }
            />

            <div className="flex-1 overflow-hidden flex gap-6 px-5 pb-5">
                {/* Left: Info & Stats */}
                <div className="w-[280px] flex flex-col gap-4 shrink-0 h-full overflow-y-auto pr-2 custom-scrollbar pb-4">
                    {/* Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm transition-all group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-[#663259] border border-gray-100 shadow-inner">
                                <Building2 size={20} />
                            </div>
                            <h3 className="font-black text-gray-800 text-sm leading-tight uppercase tracking-tight">Firma Bilgileri</h3>
                        </div>

                        <div className="space-y-2.5">
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <UserCircle size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Yetkili Kişi</p>
                                    <p className="text-xs font-bold text-gray-700">{company.contact_person || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <Phone size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Telefon</p>
                                    <p className="text-xs font-bold text-gray-700">{company.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <FileText size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Vergi Bilgileri</p>
                                    <p className="text-xs font-bold text-gray-700">{company.tax_office || '-'} / {company.tax_number || '-'}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 flex items-start gap-2.5">
                                <MapPin size={15} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">Adres</p>
                                    <p className="text-[10px] font-bold text-gray-500 leading-relaxed">{company.address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={openEditModal}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg hover:bg-[#663259] hover:text-white hover:border-[#663259] transition-all font-bold text-[10px] active:scale-95"
                        >
                            <Edit2 size={13} />
                            <span>DÜZENLE</span>
                        </button>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shrink-0">
                        <h3 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-400">
                            <Clock size={12} />
                            Bakiye Özeti
                        </h3>

                        <div className="space-y-2">
                            {/* Toplam Alım */}
                            <div className="flex items-center justify-between p-2.5 bg-red-50/60 rounded-xl border border-red-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                                        <span className="text-red-500 text-xs font-black">A</span>
                                    </div>
                                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Toplam Alım</p>
                                </div>
                                <p className="text-sm font-black text-red-600">₺{periodTotals.purchase.toLocaleString('tr-TR')}</p>
                            </div>

                            {/* Toplam Ödeme */}
                            <div className="flex items-center justify-between p-2.5 bg-green-50/60 rounded-xl border border-green-100/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                                        <span className="text-green-500 text-xs font-black">Ö</span>
                                    </div>
                                    <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">Toplam Ödeme</p>
                                </div>
                                <p className="text-sm font-black text-green-600">₺{periodTotals.payment.toLocaleString('tr-TR')}</p>
                            </div>

                            {/* Dönem Bakiyesi */}
                            <div className={`p-3 rounded-xl border ${periodBalance < 0 ? 'bg-[#663259]/5 border-[#663259]/10' : 'bg-green-50/60 border-green-100/50'}`}>
                                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Dönem Bakiyesi</p>
                                <div className="flex items-end justify-between">
                                    <p className={`text-xl font-black tracking-tight ${periodBalance < 0 ? 'text-[#663259]' : 'text-green-600'}`}>
                                        {periodBalance.toLocaleString('tr-TR')}₺
                                    </p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${periodBalance < 0 ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                                        {periodBalance < 0 ? 'Borçlu' : 'Alacaklı'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Transactions & Filters */}
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between shrink-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    icon="calendar_today"
                                    compact
                                />
                                <span className="text-gray-300 text-xs font-bold px-1">—</span>
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    icon="event"
                                    compact
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        setStartDate(today);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bugün
                                </button>
                                <button
                                    onClick={() => {
                                        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        const today = new Date().toISOString().split('T')[0];
                                        setStartDate(lastWeek);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bu Hafta
                                </button>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                                        const today = now.toISOString().split('T')[0];
                                        setStartDate(firstDay);
                                        setEndDate(today);
                                    }}
                                    className="px-3 py-2 bg-gray-50 hover:bg-[#663259] hover:text-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-gray-500"
                                >
                                    Bu Ay
                                </button>
                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                        className="px-2 py-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                        title="Filtreyi Temizle"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100">
                                <Download size={14} />
                                PDF
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100">
                                <Download size={14} />
                                EXCEL
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarih / Saat</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlem Detayı</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tür</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Miktar</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Bakiye</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactionsWithBalance.map(t => (
                                    <tr key={t.id} className="hover:bg-[#663259]/[0.02] transition-colors group cursor-pointer">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{t.date}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {t.createdAt ? new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'purchase' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {t.type === 'purchase' ? 'shopping_cart' : 'payments'}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">{t.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${t.type === 'purchase' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {t.type === 'purchase' ? 'Alış Faturası' : 'Ödeme'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`text-base font-black ${t.type === 'purchase' ? 'text-red-500' : 'text-green-500'}`}>
                                                {t.type === 'purchase' ? '-' : '+'} ₺{t.amount.toLocaleString('tr-TR')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-gray-800 tracking-tight">₺{t.balanceAfter.toLocaleString('tr-TR')}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredTransactions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                                <History size={64} className="opacity-10 mb-4" />
                                <p className="text-lg font-bold">Kayıt Bulunamadı</p>
                                <p className="text-sm">Seçilen tarih aralığında işlem bulunmamaktadır.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Borç Bakiyesi</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Alacak Bakiyesi</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mr-4">Dönem Sonu Net</span>
                            <span className={`text-xl font-black ${periodBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                ₺{periodBalance.toLocaleString('tr-TR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#663259] text-white flex items-center justify-center">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Firmayı Düzenle</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Firma bilgilerini güncelleyin</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Firma Adı</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Resmi Ünvan</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Yetkili Kişi</label>
                                    <input
                                        type="text"
                                        value={editForm.contact_person}
                                        onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefon</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        value={editForm.tax_office}
                                        onChange={(e) => setEditForm({ ...editForm, tax_office: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vergi No</label>
                                    <input
                                        type="text"
                                        value={editForm.tax_number}
                                        onChange={(e) => setEditForm({ ...editForm, tax_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adres</label>
                                <textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura Türü</label>
                                <div className="flex items-center gap-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isEInvoice}
                                            onChange={(e) => setIsEInvoice(e.target.checked)}
                                            className="w-4 h-4 rounded text-[#663259] focus:ring-[#663259]/20"
                                        />
                                        <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">E-Fatura</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isEArchive}
                                            onChange={(e) => setIsEArchive(e.target.checked)}
                                            className="w-4 h-4 rounded text-[#663259] focus:ring-[#663259]/20"
                                        />
                                        <span className="text-sm font-bold text-gray-600 group-hover:text-[#663259] transition-colors">E-Arşiv</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-6 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="flex-1 px-6 py-4 bg-[#663259] text-white rounded-2xl hover:bg-[#4a2340] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#663259]/20"
                            >
                                Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-green-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-800 tracking-tight">Ödeme Ekle</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{company.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tutar (₺)</label>
                                    <input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarih</label>
                                    <input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ödeme Yöntemi</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as typeof paymentForm.method })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="nakit">Nakit</option>
                                        <option value="havale">Havale / EFT</option>
                                        <option value="kredi_karti">Kredi Kartı</option>
                                        <option value="cek">Çek</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama</label>
                                    <textarea
                                        value={paymentForm.description}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                        placeholder="Ödeme açıklaması..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all min-h-[72px] resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bakiye Bilgisi</label>
                                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mevcut</span>
                                            <span className={`text-sm font-black ${balance.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                ₺{balance.balance.toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        {paymentForm.amount && (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sonrası</span>
                                                <span className={`text-sm font-black ${(balance.balance + Number(paymentForm.amount)) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    ₺{(balance.balance + Number(paymentForm.amount)).toLocaleString('tr-TR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 px-6 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-black text-xs uppercase tracking-widest"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handlePaymentSave}
                                className="flex-1 px-6 py-3.5 bg-[#10B981] text-white rounded-2xl hover:bg-[#059669] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-[#10B981]/20"
                            >
                                Ödemeyi Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyDetail;
