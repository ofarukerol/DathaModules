import React, { useState } from 'react';
import GradientHeader from '../../../components/GradientHeader';

type TabType = 'iptal' | 'ikram' | 'masaDegisim' | 'iadeler';

interface LogItem {
    id: number;
    urunAdi: string;
    departman: string;
    saat: string;
    personelUnvan: string;
    personelAdi: string;
    masa: string;
    neden: string;
    tutar: number;
    icon: string;
}

const logData: Record<TabType, LogItem[]> = {
    iptal: [
        { id: 1, urunAdi: 'Mercimek Çorbası', departman: 'Mutfak', saat: '14:32', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'B-12', neden: 'Müşteri vazgeçti', tutar: -85, icon: 'soup_kitchen' },
        { id: 2, urunAdi: 'Cheese Burger', departman: 'Mutfak', saat: '14:15', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: 'A-04', neden: 'Yanlış Sipariş', tutar: -240, icon: 'lunch_dining' },
        { id: 3, urunAdi: 'Cola Zero', departman: 'Bar', saat: '13:50', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: 'T-05', neden: 'Stok Yok', tutar: -45, icon: 'local_bar' },
        { id: 4, urunAdi: 'Karışık Izgara', departman: 'Mutfak', saat: '13:42', personelUnvan: 'Yönetici', personelAdi: 'Ahmet Y.', masa: 'B-01', neden: 'Müşteri Şikayeti', tutar: -480, icon: 'restaurant' },
        { id: 5, urunAdi: 'Türk Kahvesi', departman: 'Bar', saat: '12:20', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'Bahçe-4', neden: 'Yanlış Giriş', tutar: -60, icon: 'coffee' },
        { id: 6, urunAdi: 'Tavuk Şiş', departman: 'Mutfak', saat: '11:55', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: 'C-03', neden: 'Müşteri vazgeçti', tutar: -210, icon: 'restaurant' },
        { id: 7, urunAdi: 'Ayran', departman: 'Bar', saat: '11:30', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: 'A-07', neden: 'Yanlış Giriş', tutar: -25, icon: 'local_drink' },
        { id: 8, urunAdi: 'Lahmacun', departman: 'Mutfak', saat: '10:48', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'B-09', neden: 'Stok Yok', tutar: -120, icon: 'lunch_dining' },
        { id: 9, urunAdi: 'Çorba', departman: 'Mutfak', saat: '10:10', personelUnvan: 'Yönetici', personelAdi: 'Ahmet Y.', masa: 'T-02', neden: 'Kalite Sorunu', tutar: -75, icon: 'soup_kitchen' },
        { id: 10, urunAdi: 'Espresso', departman: 'Bar', saat: '09:55', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: 'Bahçe-1', neden: 'Müşteri Şikayeti', tutar: -40, icon: 'coffee' },
        { id: 11, urunAdi: 'Fıstıklı Baklava', departman: 'Mutfak', saat: '09:30', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: 'VIP-2', neden: 'Yanlış Sipariş', tutar: -160, icon: 'cake' },
        { id: 12, urunAdi: 'Su', departman: 'Bar', saat: '09:10', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'A-11', neden: 'Yanlış Giriş', tutar: -10, icon: 'water_drop' },
        { id: 13, urunAdi: 'Köfte', departman: 'Mutfak', saat: '08:50', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: 'B-06', neden: 'Stok Yok', tutar: -350, icon: 'restaurant' },
        { id: 14, urunAdi: 'Çay', departman: 'Bar', saat: '08:22', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: 'C-05', neden: 'Yanlış Giriş', tutar: -10, icon: 'emoji_food_beverage' },
    ],
    ikram: [
        { id: 1, urunAdi: 'Çay', departman: 'Bar', saat: '15:10', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: 'V-01', neden: 'VIP Müşteri', tutar: -15, icon: 'emoji_food_beverage' },
        { id: 2, urunAdi: 'Baklava Tabağı', departman: 'Mutfak', saat: '14:45', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: 'A-08', neden: 'Doğum Günü', tutar: -180, icon: 'cake' },
        { id: 3, urunAdi: 'Meyve Tabağı', departman: 'Mutfak', saat: '13:30', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: 'B-03', neden: 'Gecikme Telafisi', tutar: -120, icon: 'restaurant' },
        { id: 4, urunAdi: 'Kola', departman: 'Bar', saat: '12:55', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: 'T-02', neden: 'Şikayet Telafisi', tutar: -35, icon: 'local_bar' },
        { id: 5, urunAdi: 'Tatlı Tabağı', departman: 'Mutfak', saat: '11:40', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'C-07', neden: 'Sadık Müşteri', tutar: -95, icon: 'cake' },
        { id: 6, urunAdi: 'Espresso', departman: 'Bar', saat: '10:30', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: 'VIP-1', neden: 'VIP Müşteri', tutar: -40, icon: 'coffee' },
        { id: 7, urunAdi: 'Limonata', departman: 'Bar', saat: '09:50', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: 'A-02', neden: 'Gecikme Telafisi', tutar: -45, icon: 'local_bar' },
        { id: 8, urunAdi: 'Çorba', departman: 'Mutfak', saat: '09:15', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'B-10', neden: 'Şikayet Telafisi', tutar: -75, icon: 'soup_kitchen' },
    ],
    masaDegisim: [
        { id: 1, urunAdi: 'A-01 → B-05', departman: 'İç Mekan', saat: '15:30', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 2, urunAdi: 'T-03 → A-09', departman: 'Teras', saat: '14:50', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 3, urunAdi: 'B-07 → VIP-2', departman: 'VIP', saat: '14:10', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: '-', neden: 'Müşteri Yükseltme', tutar: 0, icon: 'table_restaurant' },
        { id: 4, urunAdi: 'Bahçe-2 → C-04', departman: 'Bahçe', saat: '13:15', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: '-', neden: 'Hava Koşulu', tutar: 0, icon: 'table_restaurant' },
        { id: 5, urunAdi: 'VIP-1 → T-06', departman: 'VIP', saat: '11:20', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: '-', neden: 'Sistem Düzeltme', tutar: 0, icon: 'table_restaurant' },
        { id: 6, urunAdi: 'C-02 → A-05', departman: 'İç Mekan', saat: '10:45', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 7, urunAdi: 'A-08 → Bahçe-3', departman: 'Bahçe', saat: '10:05', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 8, urunAdi: 'T-01 → B-12', departman: 'Teras', saat: '09:40', personelUnvan: 'Yönetici', personelAdi: 'Ahmet Y.', masa: '-', neden: 'Sistem Düzeltme', tutar: 0, icon: 'table_restaurant' },
        { id: 9, urunAdi: 'B-03 → VIP-1', departman: 'VIP', saat: '09:20', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: '-', neden: 'Müşteri Yükseltme', tutar: 0, icon: 'table_restaurant' },
        { id: 10, urunAdi: 'A-10 → C-07', departman: 'İç Mekan', saat: '08:55', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 11, urunAdi: 'Bahçe-1 → A-03', departman: 'İç Mekan', saat: '08:30', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: '-', neden: 'Hava Koşulu', tutar: 0, icon: 'table_restaurant' },
        { id: 12, urunAdi: 'C-05 → T-04', departman: 'Teras', saat: '08:10', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 13, urunAdi: 'VIP-2 → B-08', departman: 'VIP', saat: '07:50', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: '-', neden: 'Sistem Düzeltme', tutar: 0, icon: 'table_restaurant' },
        { id: 14, urunAdi: 'T-07 → Bahçe-4', departman: 'Bahçe', saat: '07:30', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 15, urunAdi: 'A-06 → C-09', departman: 'İç Mekan', saat: '07:15', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 16, urunAdi: 'B-02 → T-08', departman: 'Teras', saat: '07:00', personelUnvan: 'Yönetici', personelAdi: 'Ahmet Y.', masa: '-', neden: 'Sistem Düzeltme', tutar: 0, icon: 'table_restaurant' },
        { id: 17, urunAdi: 'C-01 → A-04', departman: 'İç Mekan', saat: '06:45', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 18, urunAdi: 'Bahçe-5 → B-11', departman: 'İç Mekan', saat: '06:30', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: '-', neden: 'Hava Koşulu', tutar: 0, icon: 'table_restaurant' },
        { id: 19, urunAdi: 'T-05 → VIP-3', departman: 'VIP', saat: '06:15', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: '-', neden: 'Müşteri Yükseltme', tutar: 0, icon: 'table_restaurant' },
        { id: 20, urunAdi: 'A-12 → Bahçe-2', departman: 'Bahçe', saat: '06:00', personelUnvan: 'Garson', personelAdi: 'Mehmet T.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 21, urunAdi: 'B-04 → C-06', departman: 'İç Mekan', saat: '05:45', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: '-', neden: 'Müşteri Talebi', tutar: 0, icon: 'table_restaurant' },
        { id: 22, urunAdi: 'VIP-4 → A-07', departman: 'İç Mekan', saat: '05:30', personelUnvan: 'Garson', personelAdi: 'Ayşe Y.', masa: '-', neden: 'Sistem Düzeltme', tutar: 0, icon: 'table_restaurant' },
        { id: 23, urunAdi: 'T-09 → Bahçe-6', departman: 'Bahçe', saat: '05:15', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: '-', neden: 'Hava Koşulu', tutar: 0, icon: 'table_restaurant' },
    ],
    iadeler: [
        { id: 1, urunAdi: 'Adana Kebap', departman: 'Mutfak', saat: '16:05', personelUnvan: 'Müdür', personelAdi: 'Ahmet Y.', masa: 'A-02', neden: 'Kalite Sorunu', tutar: -185, icon: 'restaurant' },
        { id: 2, urunAdi: 'Limonata', departman: 'Bar', saat: '15:40', personelUnvan: 'Garson', personelAdi: 'Fatma S.', masa: 'T-08', neden: 'Yanlış Ürün', tutar: -45, icon: 'local_bar' },
        { id: 3, urunAdi: 'Lahmacun', departman: 'Mutfak', saat: '13:22', personelUnvan: 'Garson', personelAdi: 'Ali K.', masa: 'B-11', neden: 'Geç Servis', tutar: -220, icon: 'lunch_dining' },
    ],
};

const tabConfig = {
    iptal: {
        label: 'İptal İşlemleri',
        icon: 'cancel',
        count: 14,
        tutar: -4250,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        cardBg: 'bg-red-500/10',
        badge: 'Bugün',
        badgeClass: 'bg-red-50 text-red-700',
        listTitle: 'Son İptal Hareketleri',
        nedenLabel: 'İptal Nedeni',
        tutarColor: 'text-red-500',
    },
    ikram: {
        label: 'İkramlar',
        icon: 'redeem',
        count: 8,
        tutar: -1850.5,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100',
        cardBg: 'bg-blue-500/5',
        badge: null,
        badgeClass: '',
        listTitle: 'Son İkram Hareketleri',
        nedenLabel: 'İkram Nedeni',
        tutarColor: 'text-blue-500',
    },
    masaDegisim: {
        label: 'Masa Değişim',
        icon: 'move_group',
        count: 23,
        tutar: 0,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100',
        cardBg: 'bg-orange-500/5',
        badge: null,
        badgeClass: '',
        listTitle: 'Son Masa Değişim Hareketleri',
        nedenLabel: 'Değişim Detayı',
        tutarColor: 'text-amber-500',
    },
    iadeler: {
        label: 'İadeler',
        icon: 'keyboard_return',
        count: 3,
        tutar: -450,
        color: 'text-[#663259]',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100',
        cardBg: 'bg-purple-500/5',
        badge: null,
        badgeClass: '',
        listTitle: 'Son İade Hareketleri',
        nedenLabel: 'İade Nedeni',
        tutarColor: 'text-[#663259]',
    },
} as const;

const ITEMS_PER_PAGE = 5;

const formatTutar = (amount: number) => {
    if (amount === 0) return '₺0,00';
    const formatted = Math.abs(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? `-₺${formatted}` : `₺${formatted}`;
};

const Log: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('iptal');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const config = tabConfig[activeTab];
    const allItems = logData[activeTab];

    const filteredItems = allItems.filter(item =>
        item.urunAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.personelAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.masa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.neden.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalItems = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSearchQuery('');
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
          <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
            {/* Gradient Header */}
            <GradientHeader
                icon="history"
                title="Hareket Kayıtları"
                subtitle="Sisteme yansıyan tüm iptal, ikram ve değişiklik hareketleri"
            />

            {/* Summary Tabs */}
            <div className="grid grid-cols-4 gap-4 mb-5 shrink-0">
                {(Object.keys(tabConfig) as TabType[]).map((tab) => {
                    const conf = tabConfig[tab];
                    const isActive = activeTab === tab;
                    return (
                        <div
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm hover:shadow-md group relative overflow-hidden select-none
                                ${isActive
                                    ? 'border-[#663259] bg-white ring-2 ring-[#663259]/10'
                                    : 'border-transparent bg-white/60 hover:bg-white'
                                }`}
                        >
                            <div className={`absolute right-0 top-0 w-24 h-24 ${conf.cardBg} rounded-bl-[60px] -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className={`p-2.5 ${conf.bgColor} ${conf.color} rounded-xl`}>
                                    <span className="material-symbols-outlined text-[24px]">{conf.icon}</span>
                                </div>
                                {conf.badge && (
                                    <span className={`${conf.badgeClass} text-xs font-bold px-2.5 py-1 rounded-md`}>
                                        {conf.badge}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{conf.label}</h3>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-gray-800">{conf.count}</span>
                                <span className="text-sm text-gray-400">Adet</span>
                            </div>
                            <p className={`mt-1 text-sm font-semibold ${conf.tutarColor}`}>{formatTutar(conf.tutar)}</p>
                        </div>
                    );
                })}
            </div>

            {/* List Panel */}
            <div className="flex-1 rounded-t-2xl border-t border-x border-white/80 overflow-hidden flex flex-col min-h-0" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)' }}>
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-800">{config.listTitle}</h3>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">{totalItems} Kayıt</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259] transition-all w-56 shadow-sm"
                                placeholder="Personel veya ürün ara..."
                            />
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-[17px]">filter_list</span>
                            Filtrele
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-[17px]">download</span>
                            Excel
                        </button>
                    </div>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {paginatedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                            <span className="material-symbols-outlined text-[40px] mb-2">search_off</span>
                            <p className="text-sm">Sonuç bulunamadı</p>
                        </div>
                    ) : (
                        paginatedItems.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 rounded-xl shadow-sm flex items-center justify-between hover:bg-white hover:shadow-md transition-all group cursor-pointer"
                                style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.9)' }}
                            >
                                {/* Left */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-11 h-11 rounded-xl ${config.bgColor} ${config.color} flex items-center justify-center border ${config.borderColor} shrink-0`}>
                                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-800">{item.urunAdi}</span>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded shrink-0">{item.departman}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                {item.saat}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">person</span>
                                                {item.personelUnvan}: <strong className="ml-0.5">{item.personelAdi}</strong>
                                            </span>
                                            {item.masa !== '-' && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">table_restaurant</span>
                                                        Masa: <strong className="ml-0.5">{item.masa}</strong>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right */}
                                <div className="flex items-center gap-6 pl-4 shrink-0">
                                    <div className="text-right hidden xl:block">
                                        <p className="text-xs text-gray-400 mb-0.5">{config.nedenLabel}</p>
                                        <p className="text-sm font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded whitespace-nowrap">{item.neden}</p>
                                    </div>
                                    <div className="text-right min-w-[90px]">
                                        <p className="text-xs text-gray-400 mb-0.5">Tutar</p>
                                        <p className={`text-base font-bold ${item.tutar === 0 ? 'text-amber-500' : config.tutarColor}`}>
                                            {formatTutar(item.tutar)}
                                        </p>
                                    </div>
                                    <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-gray-100 bg-white/50 flex justify-between items-center shrink-0" style={{ backdropFilter: 'blur(4px)' }}>
                    <span className="text-sm text-gray-500">
                        Toplam {totalItems} kayıttan{' '}
                        {totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} arası gösteriliyor
                    </span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                                    ${currentPage === page
                                        ? 'bg-[#663259] text-white shadow-md'
                                        : 'border border-gray-200 text-gray-600 hover:bg-white'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
    );
};

export default Log;
