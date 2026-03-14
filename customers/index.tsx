import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from './store';
import type { Customer, CustomerSegment } from './types';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, MoreVertical, MessageSquare, Eye, Star, MapPin, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import CustomerModal from './components/CustomerModal';
import ConfirmationModal from '../../components/ConfirmationModal';

/* ─── Helpers ─── */
const getInitials = (name: string) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-orange-100', text: 'text-orange-500' },
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { bg: 'bg-amber-100', text: 'text-amber-600' },
];

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/* Toplam harcama ve puan hesaplama */
const getTotalSpending = (c: Customer) =>
    Math.round((c.avgSpending || 0) * Math.max(c.recentOrders || 1, 1));

const getPoints = (c: Customer) => c.loyaltyPoints ?? 0;

/* ─── WhatsApp Helper ─── */
const openWhatsApp = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    const firstName = name.trim().split(/\s+/)[0];
    const message = encodeURIComponent(`Merhaba ${firstName} Bey`);
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank');
};

/* ─── Types & Constants ─── */
type SegmentFilter = 'all' | 'starred' | CustomerSegment;

interface SegmentInfo {
    key: SegmentFilter;
    label: string;
    subtitle: string;
    icon: string;
    dotColor: string;
    iconBg: string;
    iconText: string;
}

const SEGMENTS: SegmentInfo[] = [
    {
        key: 'all',
        label: 'Tüm Müşteriler',
        subtitle: 'Tüm kayıtlar',
        icon: 'groups',
        dotColor: 'bg-gray-400',
        iconBg: 'bg-gray-100',
        iconText: 'text-gray-600',
    },
    {
        key: 'starred',
        label: 'Yıldızlı Müşteriler',
        subtitle: 'Öne çıkarılanlar',
        icon: 'star',
        dotColor: 'bg-amber-400',
        iconBg: 'bg-amber-50',
        iconText: 'text-amber-500',
    },
    {
        key: 'vip',
        label: 'VIP Müşteriler',
        subtitle: 'En yüksek harcama',
        icon: 'diamond',
        dotColor: 'bg-purple-500',
        iconBg: 'bg-purple-100',
        iconText: 'text-purple-600',
    },
    {
        key: 'aktif',
        label: 'Bireysel',
        subtitle: 'Standart üyeler',
        icon: 'person',
        dotColor: 'bg-emerald-500',
        iconBg: 'bg-emerald-100',
        iconText: 'text-emerald-600',
    },
    {
        key: 'potansiyel',
        label: 'Potansiyel',
        subtitle: 'Gelişime açık',
        icon: 'trending_up',
        dotColor: 'bg-blue-500',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
    },
    {
        key: 'yeni',
        label: 'Yeni Üyeler',
        subtitle: 'Son 30 gün',
        icon: 'verified',
        dotColor: 'bg-orange-400',
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600',
    },
    {
        key: 'pasif',
        label: 'Pasif',
        subtitle: '6 aydır işlem yok',
        icon: 'person_off',
        dotColor: 'bg-red-400',
        iconBg: 'bg-red-100',
        iconText: 'text-red-500',
    },
];

const SEGMENT_STATUS_MAP: Record<string, { dot: string; text: string; label: string }> = {
    aktif: { dot: 'bg-green-500', text: 'text-green-600', label: 'AKTİF' },
    vip: { dot: 'bg-purple-500', text: 'text-purple-600', label: 'VIP' },
    potansiyel: { dot: 'bg-blue-500', text: 'text-blue-600', label: 'POTANSİYEL' },
    yeni: { dot: 'bg-orange-400 animate-pulse', text: 'text-orange-500', label: 'YENİ' },
    pasif: { dot: 'bg-gray-400', text: 'text-gray-500', label: 'PASİF' },
};

/* ─── Customer Card (Grid View) ─── */
const CustomerCard: React.FC<{
    customer: Customer;
    onDetail: (c: Customer) => void;
    onEdit: (c: Customer) => void;
    onDelete: (id: string) => void;
}> = ({ customer, onDetail, onEdit, onDelete }) => {
    const initials = getInitials(customer.name);
    const color = getAvatarColor(customer.name);
    const segment = customer.segment || 'aktif';
    const status = SEGMENT_STATUS_MAP[segment] || SEGMENT_STATUS_MAP.aktif;
    const isPasif = segment === 'pasif';
    const isVip = segment === 'vip';
    const isYeni = segment === 'yeni';

    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className={`bg-white/95 backdrop-blur-md border border-white/90 p-0 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 group ${isPasif ? 'opacity-75' : ''}`}>
            <div className="p-5 flex items-start justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#663259]/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                        <div className={`w-14 h-14 rounded-xl ${isPasif ? 'bg-gray-200 text-gray-500' : color.bg + ' ' + color.text} flex items-center justify-center font-bold text-xl border-2 border-white shadow-sm`}>
                            {initials}
                        </div>
                        {isVip && (
                            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                                <span className="material-symbols-outlined text-purple-600 text-[16px] bg-purple-100 rounded-full p-0.5">diamond</span>
                            </div>
                        )}
                        {isYeni && (
                            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                                <span className="material-symbols-outlined text-green-600 text-[16px] bg-green-100 rounded-full p-0.5">fiber_new</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className={`text-base font-bold ${isPasif ? 'text-gray-700' : 'text-gray-900'} group-hover:text-[#663259] transition-colors flex items-center gap-1.5`}>
                            {customer.name}
                            {customer.isStarred && <span className="material-symbols-outlined text-amber-400 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {customer.city || customer.il || '-'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                            <span className={`text-[10px] ${status.text} font-bold uppercase tracking-wide`}>{status.label}</span>
                        </div>
                    </div>
                </div>
                <div className="relative z-10">
                    <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-[#663259] transition-colors p-1 rounded-lg">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 w-36">
                                <button onClick={() => { onEdit(customer); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <Edit2 size={14} /> Düzenle
                                </button>
                                <button onClick={() => { onDelete(customer.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 size={14} /> Sil
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="px-5 pb-4">
                <div className="flex justify-between items-center py-3 border-t border-b border-gray-100 mb-3">
                    <div className="text-center w-1/2 border-r border-gray-100">
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">
                            {isYeni ? 'İlk Sipariş' : 'Ort. Harcama'}
                        </p>
                        <p className={`text-lg font-bold ${isPasif ? 'text-gray-500' : 'text-[#663259]'}`}>
                            {customer.avgSpending != null ? `₺${customer.avgSpending.toLocaleString('tr-TR')}` : '₺0'}
                        </p>
                    </div>
                    <div className="text-center w-1/2">
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">
                            {isYeni ? 'Kayıt Tarihi' : 'Son Ziyaret'}
                        </p>
                        <p className="text-sm font-bold text-gray-700">
                            {isYeni ? (customer.registrationDate || 'Bugün') : (customer.lastVisit || '-')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-h-[56px]">
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#F97171]">favorite</span> {isYeni ? 'Önerilen' : 'Favori Ürünler'}
                    </p>
                    {customer.favoriteProducts && customer.favoriteProducts.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                            {customer.favoriteProducts.map((p, i) => (
                                <span key={i} className={`px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-[10px] ${isPasif ? 'text-gray-500' : 'text-gray-600'} font-medium`}>
                                    {p}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-2 flex-wrap opacity-0 select-none">
                            <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-[10px] font-medium">-</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-4">
                    {isPasif ? (
                        <>
                            <button className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold hover:bg-[#663259] hover:text-white transition-colors shadow-sm">
                                Aktifleştir
                            </button>
                            <button
                                onClick={() => openWhatsApp(customer.phone, customer.name)}
                                disabled={!customer.phone}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${customer.phone ? 'bg-white border border-gray-200 text-gray-600 hover:bg-[#25D366] hover:text-white hover:border-[#25D366]' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                            >
                                Mesaj
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onDetail(customer)} className="flex-1 bg-[#663259] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#4A235A] transition-colors shadow-sm">
                                Detay
                            </button>
                            <button
                                onClick={() => openWhatsApp(customer.phone, customer.name)}
                                disabled={!customer.phone}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${customer.phone ? 'bg-white border border-gray-200 text-gray-600 hover:bg-[#25D366] hover:text-white hover:border-[#25D366]' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                            >
                                {isYeni ? 'Hoş Geldin' : isVip ? 'Özel Teklif' : 'Mesaj'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── List Row ─── */
const CustomerListRow: React.FC<{
    customer: Customer;
    onDetail: (c: Customer) => void;
    onEdit: (c: Customer) => void;
    onDelete: (id: string) => void;
}> = ({ customer, onDetail, onEdit, onDelete }) => {
    const initials = getInitials(customer.name);
    const color = getAvatarColor(customer.name);
    const segment = customer.segment || 'aktif';
    const isPasif = segment === 'pasif';
    const isVip = segment === 'vip';
    const totalSpend = getTotalSpending(customer);
    const points = getPoints(customer);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div
            className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 cursor-pointer group ${isPasif ? 'opacity-70' : ''}`}
            onClick={() => onDetail(customer)}
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-xl ${isPasif ? 'bg-gray-200 text-gray-500' : color.bg + ' ' + color.text} flex items-center justify-center font-bold text-base`}>
                    {initials}
                </div>
                {isVip && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
                {!isVip && !isPasif && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                )}
            </div>

            {/* Name + location */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate group-hover:text-[#663259] transition-colors flex items-center gap-1.5">
                    {customer.name}
                    {customer.isStarred && <span className="material-symbols-outlined text-amber-400 text-[14px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} />
                    <span className="truncate">
                        {customer.city || customer.il || '-'}
                        {customer.lastVisit && <> &bull; Son işlem: {customer.lastVisit}</>}
                    </span>
                </p>
            </div>

            {/* Toplam Harcama */}
            <div className="shrink-0 text-center min-w-[110px]">
                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Toplam Harcama</p>
                <p className={`text-sm font-bold mt-0.5 ${isPasif ? 'text-gray-500' : 'text-gray-800'}`}>
                    ₺{totalSpend.toLocaleString('tr-TR')}
                </p>
            </div>

            {/* Puan */}
            <div className="shrink-0 text-center min-w-[80px]">
                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Puan</p>
                <p className="text-sm font-bold text-[#F97171] flex items-center justify-center gap-0.5 mt-0.5">
                    <Star size={12} fill="currentColor" />
                    {points.toLocaleString('tr-TR')}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => openWhatsApp(customer.phone, customer.name)}
                    disabled={!customer.phone}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${customer.phone ? 'bg-gray-100 text-gray-500 hover:bg-[#25D366] hover:text-white' : 'bg-gray-50 text-gray-200 cursor-not-allowed'}`}
                    title="WhatsApp Mesaj"
                >
                    <MessageSquare size={16} />
                </button>
                <button
                    onClick={() => onDetail(customer)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-[#663259] hover:text-white transition-colors"
                    title="Detay"
                >
                    <Eye size={16} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 w-36">
                                <button onClick={() => { onEdit(customer); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <Edit2 size={13} /> Düzenle
                                </button>
                                <button onClick={() => { onDelete(customer.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                                    <Trash2 size={13} /> Sil
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Props Interface ─── */
interface CustomersContentProps {
    renderHeader: (toolbarActions: React.ReactNode, customerCount: number) => React.ReactNode;
}

/* ─── Main Component ─── */
export default function CustomersContent({ renderHeader }: CustomersContentProps) {
    const navigate = useNavigate();
    const { customers, deleteCustomer, updateCustomer } = useCustomerStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeSegment, setActiveSegment] = useState<SegmentFilter>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
    const [excelToast, setExcelToast] = useState<{ show: boolean; path: string; error?: boolean }>({ show: false, path: '' });
    const [showSegmentPanel, setShowSegmentPanel] = useState(false);

    // ─── Segment Yükseltme Önerileri ───
    interface SegmentSuggestion {
        customer: Customer;
        currentSegment: CustomerSegment;
        suggestedSegment: CustomerSegment;
        reason: string;
    }

    const segmentSuggestions = useMemo<SegmentSuggestion[]>(() => {
        const suggestions: SegmentSuggestion[] = [];
        for (const c of customers) {
            const seg = c.segment || 'yeni';
            const spend = c.avgSpending || 0;
            const orders = c.recentOrders || 0;

            // VIP'e yükseltme: yüksek harcama + sık sipariş
            if (seg !== 'vip' && spend >= 1000 && orders >= 5) {
                suggestions.push({
                    customer: c,
                    currentSegment: seg,
                    suggestedSegment: 'vip',
                    reason: `Ort. ${spend.toLocaleString('tr-TR')}₺ harcama, ${orders} sipariş`,
                });
            }
            // Aktif'e yükseltme: yeni/pasif ama düzenli sipariş
            else if ((seg === 'yeni' || seg === 'pasif') && orders >= 3 && spend >= 300) {
                suggestions.push({
                    customer: c,
                    currentSegment: seg,
                    suggestedSegment: 'aktif',
                    reason: `${orders} sipariş, ort. ${spend.toLocaleString('tr-TR')}₺`,
                });
            }
            // Potansiyel'e yükseltme: aktif ama harcama artıyor
            else if (seg === 'aktif' && spend >= 600 && orders >= 4) {
                suggestions.push({
                    customer: c,
                    currentSegment: seg,
                    suggestedSegment: 'potansiyel',
                    reason: `Artan harcama: ort. ${spend.toLocaleString('tr-TR')}₺`,
                });
            }
        }
        return suggestions;
    }, [customers]);

    const handleApproveSegment = (customerId: string, newSegment: CustomerSegment) => {
        updateCustomer(customerId, { segment: newSegment });
    };

    const handleApproveAll = () => {
        for (const s of segmentSuggestions) {
            updateCustomer(s.customer.id, { segment: s.suggestedSegment });
        }
        setShowSegmentPanel(false);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone.includes(searchQuery);
            const matchesSegment = activeSegment === 'all'
                || (activeSegment === 'starred' ? c.isStarred === true : c.segment === activeSegment);
            return matchesSearch && matchesSegment;
        });
    }, [customers, searchQuery, activeSegment]);

    const segmentCounts = useMemo(() => {
        const counts: Record<string, number> = { all: customers.length, starred: 0 };
        for (const c of customers) {
            const seg = c.segment || 'aktif';
            counts[seg] = (counts[seg] || 0) + 1;
            if (c.isStarred) counts.starred++;
        }
        return counts;
    }, [customers]);

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const currentCustomers = viewMode === 'list'
        ? filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredCustomers;

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const openAddModal = () => { setEditingCustomer(null); setIsModalOpen(true); };
    const openEditModal = (c: Customer) => { setEditingCustomer(c); setIsModalOpen(true); };
    const promptDelete = (id: string) => { setCustomerToDelete(id); setIsDeleteModalOpen(true); };
    const confirmDelete = () => {
        if (customerToDelete) { deleteCustomer(customerToDelete); setIsDeleteModalOpen(false); setCustomerToDelete(null); }
    };
    const goToDetail = (c: Customer) => navigate(`/customers/${c.id}`);

    const exportToExcel = async () => {
        try {
            const data = filteredCustomers.map(c => ({
                'İsim': c.name,
                'Telefon': c.phone,
                'E-posta': c.email || '-',
                'Şehir': c.city || '-',
                'Segment': c.segment || '-',
                'Ort. Harcama': c.avgSpending || 0,
                'Son Ziyaret': c.lastVisit || '-',
                'Bakiye': c.balance,
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const filename = `Musteri_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`;
            const savedPath = await invoke<string>('save_file', {
                filename,
                data: Array.from(new Uint8Array(wbout)),
            });
            setExcelToast({ show: true, path: savedPath });
            setTimeout(() => setExcelToast({ show: false, path: '' }), 4000);
        } catch (err) {
            console.error('Excel dışa aktarma hatası:', err);
            setExcelToast({ show: true, path: '', error: true });
            setTimeout(() => setExcelToast({ show: false, path: '' }), 4000);
        }
    };

    const activeSegInfo = SEGMENTS.find(s => s.key === activeSegment) || SEGMENTS[0];

    /* ─── Toolbar Actions (renderHeader'a aktarılacak) ─── */
    const toolbarActions = (
        <>
            {/* Arama */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-white/50 text-[16px]">search</span>
                </div>
                <input
                    type="text"
                    className="w-[200px] pl-9 pr-3 py-2 bg-white/10 border border-white/15 rounded-xl text-xs font-medium text-white placeholder-white/40 outline-none focus:bg-white/15 focus:border-white/30 transition-all"
                    placeholder="Müşteri ara..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
            </div>
            {/* Görünüm Toggle */}
            <div className="flex bg-white/10 rounded-xl border border-white/15 overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`px-2.5 py-2 transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`} title="Izgara">
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`px-2.5 py-2 transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`} title="Liste">
                    <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
            </div>
            {/* Excel */}
            <button onClick={exportToExcel} className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/15 text-white/80 rounded-xl text-xs font-bold hover:bg-white/20 hover:text-white transition-all">
                <span className="material-symbols-outlined text-[16px]">download</span> Excel
            </button>
            {/* Yeni Müşteri */}
            <button onClick={openAddModal} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Yeni Müşteri
            </button>
        </>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                {/* Header — proje tarafından sağlanır */}
                {renderHeader(toolbarActions, customers.length)}

                {/* Body */}
                <div className="flex-1 flex gap-5 overflow-hidden">

                    {/* ─── Left Sidebar ─── */}
                    <div className="w-[260px] shrink-0 flex flex-col gap-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
                            <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#663259] text-[18px]">workspaces</span>
                                </div>
                                <span className="font-bold text-gray-800 text-sm flex-1">Segmentler</span>
                                <button
                                    onClick={() => navigate('/settings?tab=segments')}
                                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#663259]/10 flex items-center justify-center transition-colors group"
                                    title="Segmentleri düzenle"
                                >
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#663259] text-[16px]">settings</span>
                                </button>
                            </div>

                            <div className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto no-scrollbar">
                                {SEGMENTS.filter(seg => seg.key !== 'starred' || (segmentCounts.starred || 0) > 0).map((seg) => {
                                    const isActive = activeSegment === seg.key;
                                    const count = segmentCounts[seg.key] || 0;
                                    return (
                                        <button
                                            key={seg.key}
                                            onClick={() => { setActiveSegment(seg.key); setCurrentPage(1); }}
                                            className={`w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 text-left ${isActive
                                                ? 'bg-[#663259] text-white shadow-md'
                                                : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : seg.iconBg + ' ' + seg.iconText
                                                }`}>
                                                <span className="material-symbols-outlined text-[20px]">{seg.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm leading-tight ${isActive ? 'text-white' : 'text-gray-800'}`}>
                                                    {seg.label}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                                    {seg.subtitle}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Segment Önerisi */}
                            {segmentSuggestions.length > 0 && (
                                <div className="m-3 mt-1 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#663259] flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="material-symbols-outlined text-white text-[16px]">auto_awesome</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-xs">Segment Önerisi</p>
                                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                                Sistem verilerine göre <span className="font-bold text-gray-700">{segmentSuggestions.length}</span> müşteri segment yükseltmeye aday.
                                            </p>
                                            <button
                                                onClick={() => setShowSegmentPanel(true)}
                                                className="text-[11px] font-bold text-[#F97171] mt-2 hover:underline"
                                            >
                                                İncele ve Onayla →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Content ─── */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-0">
                        {filteredCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <Search size={40} className="text-gray-200" />
                                <p className="font-medium">Müşteri bulunamadı</p>
                                <p className="text-sm">Arama veya segment filtresini değiştirin.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Grid View */
                            <div className="flex-1 overflow-hidden flex flex-col bg-transparent">
                                {/* Grid Header */}
                                <div className="flex items-center justify-between px-1 py-2 mb-3 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900 text-base">{activeSegInfo.label}</h3>
                                        <span className="text-xs font-bold bg-[#663259]/10 text-[#663259] px-2.5 py-1 rounded-lg">
                                            {filteredCustomers.length} Kayıt
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 bg-white">
                                            <ArrowUpDown size={13} />
                                            Sırala: Toplam Harcama
                                        </button>
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 bg-white">
                                            <SlidersHorizontal size={13} />
                                            Filtrele
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
                                        {filteredCustomers.map(c => (
                                            <CustomerCard key={c.id} customer={c} onDetail={goToDetail} onEdit={openEditModal} onDelete={promptDelete} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* List View */
                            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
                                {/* List Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900 text-base">{activeSegInfo.label}</h3>
                                        <span className="text-xs font-bold bg-[#663259]/10 text-[#663259] px-2.5 py-1 rounded-lg">
                                            {filteredCustomers.length} Kayıt
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                                            <ArrowUpDown size={13} />
                                            Sırala: Toplam Harcama
                                        </button>
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                                            <SlidersHorizontal size={13} />
                                            Filtrele
                                        </button>
                                    </div>
                                </div>

                                {/* Rows */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {currentCustomers.map(c => (
                                        <CustomerListRow
                                            key={c.id}
                                            customer={c}
                                            onDetail={goToDetail}
                                            onEdit={openEditModal}
                                            onDelete={promptDelete}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                                        <p className="text-xs text-gray-500 font-medium">
                                            {filteredCustomers.length} kayıttan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredCustomers.length)} gösteriliyor
                                        </p>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronLeft size={18} />
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button key={page} onClick={() => handlePageChange(page)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-[#663259] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                    {page}
                                                </button>
                                            ))}
                                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} customerToEdit={editingCustomer} />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                message="Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
                title="Müşteriyi Sil"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="SİL"
                type="danger"
            />

            {/* Segment Önerisi Paneli */}
            {showSegmentPanel && segmentSuggestions.length > 0 && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSegmentPanel(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#663259] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-800">Segment Yükseltme Önerileri</h2>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{segmentSuggestions.length} müşteri aday</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSegmentPanel(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">close</span>
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {segmentSuggestions.map((s) => {
                                const fromSeg = SEGMENT_STATUS_MAP[s.currentSegment];
                                const toSeg = SEGMENT_STATUS_MAP[s.suggestedSegment];
                                return (
                                    <div key={s.customer.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                        {/* Avatar */}
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(s.customer.name).bg} ${getAvatarColor(s.customer.name).text}`}>
                                            {getInitials(s.customer.name)}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{s.customer.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{s.reason}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${fromSeg?.text || 'text-gray-500'} bg-white border border-gray-100`}>
                                                    {fromSeg?.label || s.currentSegment.toUpperCase()}
                                                </span>
                                                <span className="material-symbols-outlined text-[12px] text-gray-300">arrow_forward</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${toSeg?.text || 'text-gray-500'} bg-white border border-gray-100`}>
                                                    {toSeg?.label || s.suggestedSegment.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <button
                                            onClick={() => handleApproveSegment(s.customer.id, s.suggestedSegment)}
                                            className="shrink-0 w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center border border-emerald-200 transition-colors"
                                            title="Onayla"
                                        >
                                            <span className="material-symbols-outlined text-emerald-600 text-[16px]">check</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                            <button
                                onClick={() => setShowSegmentPanel(false)}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={handleApproveAll}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#663259] text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all"
                            >
                                <span className="material-symbols-outlined text-[14px]">done_all</span>
                                Tümünü Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Export Toast */}
            {excelToast.show && (
                <div className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm transition-all animate-[slideUp_0.3s_ease-out] max-w-[420px] ${excelToast.error ? 'bg-red-50/95 border-red-200 text-red-700' : 'bg-white/95 border-emerald-200 text-emerald-700'}`}>
                    <span className={`material-symbols-outlined text-[22px] mt-0.5 shrink-0 ${excelToast.error ? 'text-red-500' : 'text-emerald-500'}`}>
                        {excelToast.error ? 'error' : 'check_circle'}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{excelToast.error ? 'Dışa aktarma başarısız' : 'Excel dosyası kaydedildi'}</p>
                        {!excelToast.error && excelToast.path && (
                            <button
                                onClick={() => invoke('open_file', { path: excelToast.path })}
                                className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 hover:underline transition-colors group text-left"
                                title="Dosyayı aç"
                            >
                                <span className="material-symbols-outlined text-[14px] group-hover:scale-110 transition-transform">open_in_new</span>
                                <span className="truncate">{excelToast.path}</span>
                            </button>
                        )}
                    </div>
                    <button onClick={() => setExcelToast({ show: false, path: '' })} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Named Exports ─── */
export { getInitials, getAvatarColor, AVATAR_COLORS, openWhatsApp, SEGMENTS, SEGMENT_STATUS_MAP };
export type { SegmentFilter };
