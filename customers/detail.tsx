import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerStore } from './store';
import type { Customer, CustomerNote } from './types';
import CustomerModal from './components/CustomerModal';
import SpecialOfferModal from './components/SpecialOfferModal';
import {
    Star, Phone, Mail, Cake,
    TrendingUp, Receipt,
    Tag, Edit2, ShoppingBag, Heart, StickyNote,
    Clock, Gift, CalendarDays,
    Plus, Coffee, UtensilsCrossed, CakeSlice, Check, X,
    KeyRound, Copy, Loader2
} from 'lucide-react';

/* ─── Props ─── */
interface CustomerDetailContentProps {
    renderHeader: (customer: Customer, actionButtons: React.ReactNode) => React.ReactNode;
    products: { id: string; name: string; price: number; isActive?: boolean; category: string }[];
    onResetPassword?: (customerId: string) => Promise<{ newPassword: string; smsSent: boolean }>;
}

/* ─── Helpers ─── */

/* ─── WhatsApp Helper ─── */
const openWhatsApp = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    const firstName = name.trim().split(/\s+/)[0];
    const message = encodeURIComponent(`Merhaba ${firstName} Bey`);
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank');
};

/* ─── Mock Data ─── */
const MOCK_ORDERS = [
    { id: '#4829', date: '22 Ekim 2023, 14:30', table: 'Masa 4', total: 345, status: 'tamamlandi' as const, icon: Coffee },
    { id: '#4750', date: '18 Ekim 2023, 19:15', table: 'Masa 12', total: 890, status: 'tamamlandi' as const, icon: UtensilsCrossed },
    { id: '#4601', date: '10 Ekim 2023, 09:45', table: 'Paket Servis', total: 125, status: 'tamamlandi' as const, icon: CakeSlice },
];

/* ─── Types ─── */
type TabType = 'orders' | 'favorites' | 'notes';

const TAB_CONFIG: { key: TabType; icon: typeof ShoppingBag; label: string }[] = [
    { key: 'orders', icon: Receipt, label: 'Sipari\u015f Ge\u00e7mi\u015fi' },
    { key: 'favorites', icon: Heart, label: 'Favori \u00dcr\u00fcnler' },
    { key: 'notes', icon: StickyNote, label: 'M\u00fc\u015fteri Notlar\u0131' },
];

/* ─── Component ─── */
export default function CustomerDetailContent({ renderHeader, products, onResetPassword }: CustomerDetailContentProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { customers, updateCustomer } = useCustomerStore();
    const [activeTab, setActiveTab] = useState<TabType>('orders');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState<{ newPassword: string; smsSent: boolean } | null>(null);

    const addNote = (text: string) => {
        if (!text.trim() || !customer) return;
        const note: CustomerNote = { id: `note-${Date.now()}`, text: text.trim(), createdAt: new Date().toISOString() };
        const history = [note, ...(customer.noteHistory || [])];
        updateCustomer(customer.id, { noteHistory: history, notes: text.trim() });
    };

    const deleteNote = (noteId: string) => {
        if (!customer) return;
        const history = (customer.noteHistory || []).filter(n => n.id !== noteId);
        updateCustomer(customer.id, { noteHistory: history, notes: history[0]?.text || '' });
    };

    const formatNoteDate = (iso: string) => {
        const d = new Date(iso);
        const day = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
        const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        return { day, time };
    };

    const handleResetPassword = async () => {
        if (!customer) return;
        setIsResettingPassword(true);
        setResetPasswordResult(null);
        try {
            if (!onResetPassword) {
                setResetPasswordResult({ newPassword: '', smsSent: false });
                return;
            }
            const data = await onResetPassword(customer.id);
            setResetPasswordResult({ newPassword: data.newPassword, smsSent: data.smsSent });
        } catch {
            setResetPasswordResult({ newPassword: '', smsSent: false });
        } finally {
            setIsResettingPassword(false);
        }
    };

    const customer = useMemo(
        () => customers.find(c => c.id === id) ?? null,
        [customers, id]
    );

    // Önerilen ürünler: müşterinin favorileri dışındaki aktif ürünlerden seç
    const recommendations = useMemo(() => {
        if (!customer) return [];
        const favs = new Set((customer.favoriteProducts || []).map(f => f.toLowerCase()));
        const activeProducts = products.filter(p => p.isActive !== false);
        // Favorilerin kategorilerini bul
        const favCategories = new Set(
            activeProducts.filter(p => favs.has(p.name.toLowerCase())).map(p => p.category)
        );
        // Aynı kategorideki diğer ürünleri öner
        const sameCat = activeProducts.filter(p => favCategories.has(p.category) && !favs.has(p.name.toLowerCase()));
        // Eğer aynı kategoriden yeterli yoksa, popüler ürünlerden ekle
        const others = activeProducts.filter(p => !favCategories.has(p.category) && !favs.has(p.name.toLowerCase()));
        const combined = [...sameCat, ...others];
        return combined.slice(0, 4).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            reason: favCategories.has(p.category) ? 'Favori kategorisinden' : 'Popüler ürün',
        }));
    }, [customer, products]);

    /* ─── Not Found ─── */
    if (!customer) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-gray-300 text-[64px] mb-4 block">person_off</span>
                        <p className="text-lg font-bold text-gray-400">Müşteri bulunamadı</p>
                        <button
                            onClick={() => navigate('/customers')}
                            className="mt-4 px-5 py-2.5 bg-[#663259] text-white rounded-xl text-sm font-bold hover:bg-[#7a3d6b] transition-colors"
                        >
                            Listeye Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Action Buttons (passed to renderHeader) ─── */
    const actionButtons = (
        <>
            <button
                onClick={() => updateCustomer(customer.id, { isStarred: !customer.isStarred })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                    customer.isStarred
                        ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                        : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/20 hover:text-amber-300'
                }`}
                title={customer.isStarred ? 'Yıldızı kaldır' : 'Yıldızla'}
            >
                <Star size={16} fill={customer.isStarred ? 'currentColor' : 'none'} />
            </button>
            {customer.phone && (
                <button
                    onClick={() => window.open(`tel:${customer.phone}`, '_self')}
                    className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                    title="Ara"
                >
                    <Phone size={16} />
                </button>
            )}
            {/* SMS — yakında aktif olacak */}
            <button
                disabled
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/25 cursor-not-allowed"
                title="Yakında"
            >
                <span className="material-symbols-outlined text-[18px]">sms</span>
            </button>
            {customer.email && (
                <button
                    onClick={() => window.open(`mailto:${customer.email}`, '_self')}
                    className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                    title="E-posta"
                >
                    <Mail size={16} />
                </button>
            )}
            <button
                onClick={() => setIsEditModalOpen(true)}
                className="ml-1 h-9 px-4 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
                <Edit2 size={14} />
                Düzenle
            </button>
        </>
    );

    /* ─── Tab Content ─── */
    const renderTabContent = () => {
        switch (activeTab) {
            case 'orders':
                return (
                    <div className="p-6 space-y-4">
                        {MOCK_ORDERS.map(order => (
                            <div key={order.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-[#663259] transition-colors">
                                        <order.icon size={22} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">Sipariş {order.id}</p>
                                        <p className="text-xs text-gray-500">{order.date} • {order.table}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-[#663259]">₺{order.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                        order.status === 'tamamlandi'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-600'
                                    }`}>
                                        {order.status === 'tamamlandi' ? 'TAMAMLANDI' : 'İPTAL'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'favorites':
                return (
                    <div className="p-6">
                        {customer.favoriteProducts && customer.favoriteProducts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {customer.favoriteProducts.map((product, idx) => (
                                    <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#663259]/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#663259]/10 text-[#663259] flex items-center justify-center">
                                                <Heart size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{product}</p>
                                                <p className="text-xs text-gray-400">Sık tercih edilen</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Heart size={40} className="text-gray-200 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">Henüz favori ürün yok</p>
                            </div>
                        )}
                    </div>
                );
            case 'notes': {
                const notes = customer.noteHistory || [];
                // Eski tek not varsa ama noteHistory boşsa, onu migration olarak göster
                const allNotes = notes.length === 0 && customer.notes
                    ? [{ id: 'legacy', text: customer.notes, createdAt: customer.registrationDate || new Date().toISOString() }]
                    : notes;
                return (
                    <div className="p-5 space-y-4">
                        {/* Hızlı Not Girişi */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newNoteText.trim()) { addNote(newNoteText); setNewNoteText(''); } }}
                                placeholder="Hızlı not ekle..."
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259]"
                            />
                            <button
                                onClick={() => { if (newNoteText.trim()) { addNote(newNoteText); setNewNoteText(''); } }}
                                disabled={!newNoteText.trim()}
                                className="px-4 py-2.5 bg-[#663259] text-white rounded-xl text-sm font-bold hover:bg-[#7a3d6b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                <Plus size={16} /> Ekle
                            </button>
                        </div>

                        {/* Not Listesi */}
                        {allNotes.length > 0 ? (
                            <div className="space-y-3">
                                {allNotes.map((note) => {
                                    const { day, time } = formatNoteDate(note.createdAt);
                                    return (
                                        <div key={note.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors group relative">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <StickyNote size={16} className="text-yellow-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 leading-relaxed">{note.text}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <CalendarDays size={10} /> {day}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300">·</span>
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <Clock size={10} /> {time}
                                                        </span>
                                                    </div>
                                                </div>
                                                {note.id !== 'legacy' && (
                                                    <button
                                                        onClick={() => deleteNote(note.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                        title="Notu sil"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <StickyNote size={36} className="text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Henüz not eklenmemiş</p>
                                <p className="text-xs text-gray-300 mt-1">Yukarıdan hızlı not ekleyebilirsiniz</p>
                            </div>
                        )}
                    </div>
                );
            }
        }
    };

    /* ─── Main Layout ─── */
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                {/* ── Header (rendered by wrapper) ── */}
                {renderHeader(customer, actionButtons)}

                {/* Body: Two columns */}
                <div className="flex-1 flex gap-6 overflow-hidden">

                    {/* LEFT COLUMN */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5">

                        {/* Contact Info Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Telefon</p>
                                        <p className="text-sm font-semibold text-gray-800">{customer.phone || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">E-posta</p>
                                        <p className="text-sm font-semibold text-gray-800">{customer.email || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                        <Cake size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Doğum Günü</p>
                                        <p className="text-sm font-semibold text-gray-800">15 Mart 1985</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Toplam Harcama */}
                            <div className="bg-white/85 backdrop-blur-sm p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 border-l-4 border-l-[#663259] hover:shadow-md transition-shadow">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Toplam Harcama</p>
                                <h3 className="text-2xl font-extrabold text-[#663259]">₺{((customer.avgSpending || 0) * (customer.recentOrders || 1)).toLocaleString('tr-TR')}</h3>
                                <div className="mt-4 flex items-center text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                                    <TrendingUp size={14} className="mr-1" />
                                    +15% Geçen Ay
                                </div>
                            </div>
                            {/* Sadakat Puanı */}
                            <div className="bg-white/85 backdrop-blur-sm p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 border-l-4 border-l-[#F97171] hover:shadow-md transition-shadow">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sadakat Puanı</p>
                                <h3 className="text-2xl font-extrabold text-[#F97171]">{(customer.loyaltyPoints || 0).toLocaleString('tr-TR')} Puan</h3>
                                <div className="mt-4 flex items-center text-xs font-medium text-purple-600 bg-purple-50 w-fit px-2 py-1 rounded">
                                    <Gift size={14} className="mr-1" />
                                    {customer.recentOrders || 0} Sipariş
                                </div>
                            </div>
                            {/* Ortalama Adisyon */}
                            <div className="bg-white/85 backdrop-blur-sm p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ortalama Adisyon</p>
                                <h3 className="text-2xl font-extrabold text-gray-800">₺{(customer.avgSpending || 0).toLocaleString('tr-TR')}</h3>
                                <div className="mt-4 flex items-center text-xs font-medium text-gray-500 bg-gray-100 w-fit px-2 py-1 rounded">
                                    <CalendarDays size={14} className="mr-1" />
                                    Son ziyaret: {customer.lastVisit || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Tabbed Section */}
                        <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 flex-1 flex flex-col">
                            {/* Tab Bar */}
                            <div className="border-b border-gray-100 px-6 pt-4">
                                <div className="flex gap-8">
                                    {TAB_CONFIG.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`pb-4 px-2 text-sm flex items-center gap-2 transition-all border-b-2 ${
                                                activeTab === tab.key
                                                    ? 'border-[#F97171] text-[#663259] font-bold'
                                                    : 'border-transparent text-gray-500 hover:text-[#663259] hover:border-gray-200 font-medium'
                                            }`}
                                        >
                                            <tab.icon size={18} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Tab Content */}
                            <div className="overflow-y-auto max-h-[400px]">
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="w-80 shrink-0 flex flex-col gap-5 overflow-y-auto custom-scrollbar">

                        {/* Hızlı İşlemler */}
                        <div className="bg-white/65 backdrop-blur-xl p-5 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-white/80">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-[#F97171]">⚡</span>
                                Hızlı İşlemler
                            </h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => openWhatsApp(customer.phone, customer.name)}
                                    disabled={!customer.phone}
                                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${customer.phone ? 'bg-[#25D366] text-white hover:bg-[#1da851] hover:shadow-lg hover:shadow-green-200/50' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">chat</span>
                                    WhatsApp Mesaj
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsOfferModalOpen(true)}
                                        className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-[#663259] hover:text-white hover:border-[#663259] transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <Tag size={18} />
                                        Özel Teklif Tanımla
                                    </button>
                                    {(customer.specialOffers?.filter(o => !o.isUsed).length || 0) > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#F97171] text-[9px] font-bold text-white rounded-md shadow-sm">
                                            {customer.specialOffers!.filter(o => !o.isUsed).length}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-[#F97171] hover:border-[#F97171] transition-all flex items-center justify-center gap-2 font-medium"
                                >
                                    <Edit2 size={18} />
                                    Düzenle
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={isResettingPassword}
                                    className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isResettingPassword ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                                    {isResettingPassword ? 'Sıfırlanıyor...' : 'Şifre Sıfırla'}
                                </button>
                                {/* Şifre Sıfırlama Sonucu */}
                                {resetPasswordResult && (
                                    <div className={`p-4 rounded-xl border ${resetPasswordResult.newPassword ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        {resetPasswordResult.newPassword ? (
                                            <>
                                                <p className="text-xs font-medium text-green-700 mb-2">Yeni şifre oluşturuldu:</p>
                                                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-green-200">
                                                    <span className="text-lg font-bold text-gray-800 tracking-widest flex-1">{resetPasswordResult.newPassword}</span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(resetPasswordResult.newPassword)}
                                                        className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors"
                                                        title="Kopyala"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                                <p className={`text-[11px] mt-2 flex items-center gap-1 ${resetPasswordResult.smsSent ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {resetPasswordResult.smsSent ? (
                                                        <><Check size={12} /> SMS ile gönderildi</>
                                                    ) : (
                                                        <><X size={12} /> SMS gönderilemedi, şifreyi müşteriye manuel iletin</>
                                                    )}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-red-600 font-medium">Şifre sıfırlama başarısız oldu. Lütfen tekrar deneyin.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Son Not */}
                        <div className="bg-white/65 backdrop-blur-xl p-5 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-white/80">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-800">Son Not</h3>
                                {(customer.noteHistory || []).length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('notes')}
                                        className="text-xs text-[#F97171] font-medium hover:underline"
                                    >
                                        Tümünü Gör ({(customer.noteHistory || []).length})
                                    </button>
                                )}
                            </div>
                            {/* Hızlı not girişi */}
                            {isEditingNote ? (
                                <div className="space-y-2 mb-3">
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && noteText.trim()) { e.preventDefault(); addNote(noteText); setNoteText(''); setIsEditingNote(false); } }}
                                        placeholder="Not yazın... (Enter ile kaydet)"
                                        rows={2}
                                        autoFocus
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { if (noteText.trim()) { addNote(noteText); setNoteText(''); } setIsEditingNote(false); }}
                                            disabled={!noteText.trim()}
                                            className="flex-1 py-2 bg-[#663259] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#7a3d6b] transition-colors disabled:opacity-40"
                                        >
                                            <Check size={14} /> Kaydet
                                        </button>
                                        <button
                                            onClick={() => setIsEditingNote(false)}
                                            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setNoteText(''); setIsEditingNote(true); }}
                                    className="w-full mb-3 py-2 px-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-[#663259]/30 hover:text-[#663259] hover:bg-[#663259]/5 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={14} /> Hızlı not ekle
                                </button>
                            )}
                            {/* Son not gösterimi */}
                            {(() => {
                                const lastNote = (customer.noteHistory || [])[0];
                                if (lastNote) {
                                    const { day, time } = formatNoteDate(lastNote.createdAt);
                                    return (
                                        <div className="bg-yellow-50 p-3.5 rounded-xl border border-yellow-100 relative">
                                            <StickyNote size={12} className="absolute top-2.5 right-2.5 text-yellow-400" />
                                            <p className="text-xs text-gray-700 leading-relaxed pr-5">{lastNote.text}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                                <CalendarDays size={9} /> {day} · {time}
                                            </p>
                                        </div>
                                    );
                                }
                                if (customer.notes && !isEditingNote) {
                                    return (
                                        <div className="bg-yellow-50 p-3.5 rounded-xl border border-yellow-100 relative">
                                            <StickyNote size={12} className="absolute top-2.5 right-2.5 text-yellow-400" />
                                            <p className="text-xs text-gray-700 italic leading-relaxed">"{customer.notes}"</p>
                                        </div>
                                    );
                                }
                                if (!isEditingNote) {
                                    return (
                                        <p className="text-xs text-gray-300 text-center py-2">Henüz not yok</p>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Önerilen Ürünler */}
                        <div className="bg-white/65 backdrop-blur-xl p-5 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-white/80 flex-1">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-[#F97171]">●</span>
                                Önerilen Ürünler
                            </h3>
                            {recommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {recommendations.map(rec => {
                                        const alreadyFav = (customer.favoriteProducts || []).some(f => f.toLowerCase() === rec.name.toLowerCase());
                                        return (
                                            <div key={rec.id} className="flex items-center gap-3 group">
                                                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#663259]/10 group-hover:text-[#663259] transition-colors shrink-0">
                                                    <ShoppingBag size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 group-hover:text-[#663259] transition-colors truncate">{rec.name}</p>
                                                    <p className="text-[11px] text-gray-400">{rec.reason} · ₺{rec.price.toFixed(2)}</p>
                                                </div>
                                                {alreadyFav ? (
                                                    <span className="w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                                                        <Check size={12} className="text-green-500" />
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            const currentFavs = customer.favoriteProducts || [];
                                                            updateCustomer(customer.id, { favoriteProducts: [...currentFavs, rec.name] });
                                                        }}
                                                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-500 hover:bg-green-50 transition-all shrink-0"
                                                        title="Favorilere ekle"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <ShoppingBag size={32} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Henüz öneri oluşturulamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <CustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customerToEdit={customer}
            />

            {/* Special Offer Modal */}
            <SpecialOfferModal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                customerId={customer.id}
                customerName={customer.name}
                existingOffers={customer.specialOffers || []}
                products={products}
            />
        </div>
    );
}
