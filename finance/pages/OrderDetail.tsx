import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface OrderData {
    id: string;
    customerName: string;
    items: string[];
    total: string;
    status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
    time: string;
}

const MarketplaceDetail: React.FC = () => {
    const navigate = useNavigate();
    const { marketplaceId } = useParams<{ marketplaceId: string }>();
    const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'reports'>('orders');

    const marketplaceData: Record<string, {
        name: string;
        logo: string;
        color: string;
        bgColor: string;
        status: 'connected' | 'disconnected' | 'pending';
        description: string;
    }> = {
        trendyol: {
            name: 'Trendyol',
            logo: 'T',
            color: '#F27A1A',
            bgColor: '#FEF3EB',
            status: 'connected',
            description: 'Trendyol Yemek entegrasyonu ile siparişlerinizi yönetin'
        },
        yemeksepeti: {
            name: 'Yemeksepeti',
            logo: 'Y',
            color: '#FA0050',
            bgColor: '#FFF0F5',
            status: 'connected',
            description: 'Yemeksepeti siparişlerinizi tek panelden takip edin'
        },
        migros: {
            name: 'Migros',
            logo: 'M',
            color: '#FF6600',
            bgColor: '#FFF4EB',
            status: 'pending',
            description: 'Migros Sanal Market entegrasyonu'
        },
        getir: {
            name: 'Getir',
            logo: 'G',
            color: '#5D3FD3',
            bgColor: '#F3F0FF',
            status: 'disconnected',
            description: 'Getir Yemek siparişlerinizi anlık takip edin'
        }
    };

    const marketplace = marketplaceData[marketplaceId || 'trendyol'];

    const orders: OrderData[] = [
        { id: '#1234', customerName: 'Ahmet Y.', items: ['Tavuk Döner', 'Ayran'], total: '₺85', status: 'pending', time: '2 dk önce' },
        { id: '#1233', customerName: 'Mehmet K.', items: ['Adana Kebap', 'Şalgam'], total: '₺145', status: 'preparing', time: '8 dk önce' },
        { id: '#1232', customerName: 'Ayşe S.', items: ['Lahmacun x3', 'Kola'], total: '₺120', status: 'delivered', time: '25 dk önce' },
        { id: '#1231', customerName: 'Fatma D.', items: ['Karışık Pide', 'Ayran x2'], total: '₺95', status: 'delivered', time: '45 dk önce' },
        { id: '#1230', customerName: 'Can B.', items: ['İskender'], total: '₺180', status: 'cancelled', time: '1 saat önce' },
    ];

    const getStatusConfig = (status: OrderData['status']) => {
        switch (status) {
            case 'pending':
                return { label: 'Beklemede', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
            case 'preparing':
                return { label: 'Hazırlanıyor', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
            case 'delivered':
                return { label: 'Teslim Edildi', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
            case 'cancelled':
                return { label: 'İptal', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
        }
    };

    const handleAction = (orderId: string, action: string) => {
        console.log(`Action ${action} for order ${orderId}`);
        // In real app, this would call an API
    };

    if (!marketplace) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">error</span>
                    <p className="text-gray-500">Pazaryeri bulunamadı</p>
                    <button
                        onClick={() => navigate('/finance/marketplaces')}
                        className="mt-4 px-4 py-2 bg-[#663259] text-white rounded-xl font-bold"
                    >
                        Geri Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            {/* Header */}
            <header className="h-24 flex items-center justify-between px-8 py-6 relative z-10 shrink-0 bg-white shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/finance/marketplaces')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-600">arrow_back</span>
                    </button>
                    <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shadow-sm"
                        style={{ backgroundColor: marketplace.bgColor, color: marketplace.color }}
                    >
                        {marketplace.logo}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-800">{marketplace.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">{marketplace.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                        marketplace.status === 'connected' ? 'bg-emerald-50 text-emerald-600' :
                        marketplace.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            marketplace.status === 'connected' ? 'bg-emerald-500' :
                            marketplace.status === 'pending' ? 'bg-amber-500' :
                            'bg-gray-400'
                        }`}></span>
                        {marketplace.status === 'connected' ? 'Bağlı' : marketplace.status === 'pending' ? 'Beklemede' : 'Bağlı Değil'}
                    </div>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        Ayarlar
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-100 px-8">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'orders'
                                ? 'border-[#663259] text-[#663259]'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Siparişler
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'reports'
                                ? 'border-[#663259] text-[#663259]'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Raporlar
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'settings'
                                ? 'border-[#663259] text-[#663259]'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Ayarlar
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'orders' && (
                        <div className="flex flex-col gap-6">
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-500">pending_actions</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Bekleyen</p>
                                            <p className="text-2xl font-bold text-gray-800">12</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-500">restaurant</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Hazırlanan</p>
                                            <p className="text-2xl font-bold text-gray-800">8</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tamamlanan</p>
                                            <p className="text-2xl font-bold text-gray-800">147</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#663259]">payments</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Bugünkü Ciro</p>
                                            <p className="text-2xl font-bold text-gray-800">₺24,580</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-800">Güncel Siparişler</h3>
                                    <button className="text-sm text-[#F97171] font-bold hover:underline">
                                        Tümünü Gör
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {orders.map((order) => {
                                        const statusConfig = getStatusConfig(order.status);
                                        return (
                                            <div key={order.id} className="p-5 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-gray-500">receipt_long</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-gray-800">{order.id}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-gray-600">{order.customerName}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500">{order.items.join(', ')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-bold text-gray-800">{order.total}</p>
                                                            <p className="text-xs text-gray-400">{order.time}</p>
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                                                            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                                                            {statusConfig.label}
                                                        </div>
                                                        {order.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAction(order.id, 'accept')}
                                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(order.id, 'reject')}
                                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-8">
                            <div className="text-center py-12">
                                <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-4xl text-[#663259]">analytics</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Raporlar</h3>
                                <p className="text-gray-500 mb-6">Bu platformdan gelen sipariş ve ciro raporlarını görüntüleyin</p>
                                <div className="flex justify-center gap-3">
                                    <button className="px-4 py-2.5 bg-[#663259] text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                                        Günlük Rapor
                                    </button>
                                    <button className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm">
                                        Haftalık Rapor
                                    </button>
                                    <button className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm">
                                        Aylık Rapor
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Entegrasyon Ayarları</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gray-500">notifications</span>
                                            <div>
                                                <p className="font-bold text-gray-800">Bildirimler</p>
                                                <p className="text-sm text-gray-500">Yeni sipariş bildirimleri al</p>
                                            </div>
                                        </div>
                                        <button className="w-12 h-6 bg-[#663259] rounded-full relative">
                                            <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gray-500">timer</span>
                                            <div>
                                                <p className="font-bold text-gray-800">Otomatik Kabul</p>
                                                <p className="text-sm text-gray-500">Siparişleri otomatik onayla</p>
                                            </div>
                                        </div>
                                        <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                                            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gray-500">sync</span>
                                            <div>
                                                <p className="font-bold text-gray-800">Menü Senkronizasyonu</p>
                                                <p className="text-sm text-gray-500">Menüyü otomatik güncelle</p>
                                            </div>
                                        </div>
                                        <button className="w-12 h-6 bg-[#663259] rounded-full relative">
                                            <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">API Bilgileri</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-gray-500">API Durumu</span>
                                        <span className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            Aktif
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-gray-500">Son Senkronizasyon</span>
                                        <span className="text-sm font-bold text-gray-800">2 dakika önce</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-gray-500">Bağlantı Tarihi</span>
                                        <span className="text-sm font-bold text-gray-800">15 Şubat 2026</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all text-sm">
                                    Entegrasyonu Kaldır
                                </button>
                                <button className="px-4 py-2.5 bg-[#663259] text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                                    Değişiklikleri Kaydet
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketplaceDetail;
