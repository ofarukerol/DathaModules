import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderActions from '../../../components/HeaderActions';

interface Marketplace {
    id: string;
    name: string;
    description: string;
    logo: string;
    color: string;
    bgColor: string;
    status: 'connected' | 'disconnected' | 'pending';
    orderCount: number;
    revenue: string;
}

const Marketplaces: React.FC = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<string[]>(['trendyol', 'yemeksepeti']);

    const marketplaces: Marketplace[] = [
        {
            id: 'trendyol',
            name: 'Trendyol',
            description: 'Trendyol Yemek entegrasyonu ile siparişlerinizi yönetin',
            logo: 'T',
            color: '#F27A1A',
            bgColor: '#FEF3EB',
            status: 'connected',
            orderCount: 147,
            revenue: '₺24,580'
        },
        {
            id: 'yemeksepeti',
            name: 'Yemeksepeti',
            description: 'Yemeksepeti siparişlerinizi tek panelden takip edin',
            logo: 'Y',
            color: '#FA0050',
            bgColor: '#FFF0F5',
            status: 'connected',
            orderCount: 234,
            revenue: '₺38,920'
        },
        {
            id: 'migros',
            name: 'Migros',
            description: 'Migros Sanal Market entegrasyonu',
            logo: 'M',
            color: '#FF6600',
            bgColor: '#FFF4EB',
            status: 'pending',
            orderCount: 0,
            revenue: '₺0'
        },
        {
            id: 'getir',
            name: 'Getir',
            description: 'Getir Yemek siparişlerinizi anlık takip edin',
            logo: 'G',
            color: '#5D3FD3',
            bgColor: '#F3F0FF',
            status: 'disconnected',
            orderCount: 0,
            revenue: '₺0'
        }
    ];

    const toggleFavorite = (id: string) => {
        setFavorites(prev =>
            prev.includes(id)
                ? prev.filter(f => f !== id)
                : [...prev, id]
        );
    };

    const getStatusConfig = (status: Marketplace['status']) => {
        switch (status) {
            case 'connected':
                return {
                    label: 'Bağlı',
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    dot: 'bg-emerald-500'
                };
            case 'pending':
                return {
                    label: 'Beklemede',
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    dot: 'bg-amber-500'
                };
            case 'disconnected':
                return {
                    label: 'Bağlı Değil',
                    color: 'text-gray-500',
                    bg: 'bg-gray-100',
                    dot: 'bg-gray-400'
                };
        }
    };

    const connectedCount = marketplaces.filter(m => m.status === 'connected').length;
    const pendingCount = marketplaces.filter(m => m.status === 'pending').length;
    const totalOrders = marketplaces.reduce((sum, m) => sum + m.orderCount, 0);
    const totalRevenue = marketplaces
        .filter(m => m.status === 'connected')
        .reduce((sum, m) => sum + parseFloat(m.revenue.replace('₺', '').replace(',', '')), 0);

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
                                    <span className="material-symbols-outlined text-white text-[26px]">storefront</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Pazaryerleri</h1>
                                <p className="text-white/60 text-xs mt-0.5">Entegre pazaryeri platformlarınızı yönetin</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={() => navigate('/finance/marketplaces/new')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-xl text-sm font-bold hover:bg-white/25 border border-white/20 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Entegrasyon
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Bağlı Platform */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[50px] -mr-3 -mt-3 transition-transform group-hover:scale-110" />
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Canlı
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium relative z-10">Bağlı Platform</p>
                            <div className="flex items-baseline gap-1.5 mt-1 relative z-10">
                                <span className="text-3xl font-bold text-gray-800">{connectedCount}</span>
                                <span className="text-sm text-gray-400">/ {marketplaces.length}</span>
                            </div>
                            <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden relative z-10">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                    style={{ width: `${(connectedCount / marketplaces.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Bugünkü Sipariş */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-20 h-20 bg-blue-500/5 rounded-bl-[50px] -mr-3 -mt-3 transition-transform group-hover:scale-110" />
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-500 text-[22px]">shopping_bag</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                    +18%
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 font-medium relative z-10">Bugünkü Sipariş</p>
                            <div className="flex items-baseline gap-1.5 mt-1 relative z-10">
                                <span className="text-3xl font-bold text-gray-800">{totalOrders}</span>
                                <span className="text-sm text-gray-400">adet</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 relative z-10">Düne göre 18% artış</p>
                        </div>

                        {/* Toplam Ciro */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-20 h-20 bg-[#663259]/5 rounded-bl-[50px] -mr-3 -mt-3 transition-transform group-hover:scale-110" />
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#663259] text-[22px]">payments</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                    +23%
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 font-medium relative z-10">Toplam Ciro</p>
                            <div className="flex items-baseline gap-1 mt-1 relative z-10">
                                <span className="text-2xl font-bold text-[#663259]">₺{totalRevenue.toLocaleString('tr-TR')}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 relative z-10">Geçen haftaya göre 23% artış</p>
                        </div>

                        {/* Bekleyen Entegrasyon */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-20 h-20 bg-amber-500/5 rounded-bl-[50px] -mr-3 -mt-3 transition-transform group-hover:scale-110" />
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500 text-[22px]">hourglass_top</span>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Beklemede</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 font-medium relative z-10">Bekleyen Entegrasyon</p>
                            <div className="flex items-baseline gap-1.5 mt-1 relative z-10">
                                <span className="text-3xl font-bold text-gray-800">{pendingCount}</span>
                                <span className="text-sm text-gray-400">platform</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 relative z-10">
                                {pendingCount > 0 ? 'Onay sürecinde' : 'Bekleyen platform yok'}
                            </p>
                        </div>
                    </div>

                    {/* Marketplace Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {marketplaces.map((marketplace) => {
                            const statusConfig = getStatusConfig(marketplace.status);
                            const isFavorite = favorites.includes(marketplace.id);

                            return (
                                <div
                                    key={marketplace.id}
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
                                >
                                    {/* Card Header */}
                                    <div className="p-5 pb-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shadow-sm"
                                                style={{ backgroundColor: marketplace.bgColor, color: marketplace.color }}
                                            >
                                                {marketplace.logo}
                                            </div>
                                            <button
                                                onClick={() => toggleFavorite(marketplace.id)}
                                                className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <span
                                                    className={`material-symbols-outlined text-[22px] transition-colors ${
                                                        isFavorite ? 'text-amber-400' : 'text-gray-300 group-hover:text-gray-400'
                                                    }`}
                                                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                                                >
                                                    star
                                                </span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-bold text-gray-800">{marketplace.name}</h3>
                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                                                {statusConfig.label}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                            {marketplace.description}
                                        </p>
                                    </div>

                                    {/* Stats Row */}
                                    {marketplace.status === 'connected' && (
                                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-gray-400">receipt_long</span>
                                                    <span className="text-sm font-bold text-gray-700">{marketplace.orderCount}</span>
                                                    <span className="text-xs text-gray-400">sipariş</span>
                                                </div>
                                                <div className="w-px h-4 bg-gray-200"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-emerald-500">trending_up</span>
                                                    <span className="text-sm font-bold text-gray-700">{marketplace.revenue}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="p-4 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => {
                                                if (marketplace.status === 'connected') {
                                                    navigate(`/finance/marketplaces/${marketplace.id}`);
                                                } else if (marketplace.status === 'disconnected') {
                                                    navigate('/finance/marketplaces/new');
                                                }
                                            }}
                                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                                marketplace.status === 'connected'
                                                    ? 'bg-[#663259] text-white hover:shadow-lg hover:shadow-[#663259]/20'
                                                    : marketplace.status === 'pending'
                                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {marketplace.status === 'connected' ? 'settings' : marketplace.status === 'pending' ? 'hourglass_top' : 'link'}
                                            </span>
                                            {marketplace.status === 'connected'
                                                ? 'İşlemleri Yönet'
                                                : marketplace.status === 'pending'
                                                ? 'Onay Bekleniyor'
                                                : 'Entegrasyonu Başlat'
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Live Integration Status Dashboard */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#663259]">monitoring</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Canlı Entegrasyon Durumu</h3>
                                    <p className="text-sm text-gray-500">Tüm pazaryeri bağlantılarınızın anlık durumu</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-medium text-emerald-600">Sistem Aktif</span>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Connected Platforms */}
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5 border border-emerald-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[20px]">check_circle</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-emerald-600 font-medium">Bağlı Platform</p>
                                            <p className="text-2xl font-bold text-emerald-700">{connectedCount}/{marketplaces.length}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-emerald-200 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(connectedCount / marketplaces.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Total Orders Today */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[20px]">shopping_bag</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-blue-600 font-medium">Bugünkü Sipariş</p>
                                            <p className="text-2xl font-bold text-blue-700">{totalOrders}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="material-symbols-outlined text-emerald-500 text-[16px]">trending_up</span>
                                        <span className="text-emerald-600 font-medium">+18%</span>
                                        <span className="text-gray-400">düne göre</span>
                                    </div>
                                </div>

                                {/* Total Revenue */}
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#663259] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[20px]">payments</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[#663259] font-medium">Toplam Ciro</p>
                                            <p className="text-2xl font-bold text-[#663259]">₺{totalRevenue.toLocaleString('tr-TR')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="material-symbols-outlined text-emerald-500 text-[16px]">trending_up</span>
                                        <span className="text-emerald-600 font-medium">+23%</span>
                                        <span className="text-gray-400">geçen haftaya göre</span>
                                    </div>
                                </div>
                            </div>

                            {/* Platform Status List */}
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-gray-700">Platform Detayları</h4>
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="text-sm text-[#F97171] font-bold hover:underline"
                                    >
                                        Tümünü Gör
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {marketplaces.map((marketplace) => {
                                        const statusConfig = getStatusConfig(marketplace.status);
                                        return (
                                            <div
                                                key={marketplace.id}
                                                onClick={() => {
                                                    if (marketplace.status === 'connected') {
                                                        navigate(`/finance/marketplaces/${marketplace.id}`);
                                                    } else if (marketplace.status === 'disconnected') {
                                                        navigate('/finance/marketplaces/new');
                                                    }
                                                }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                                                        style={{ backgroundColor: marketplace.bgColor, color: marketplace.color }}
                                                    >
                                                        {marketplace.logo}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{marketplace.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {marketplace.status === 'connected'
                                                                ? `${marketplace.orderCount} sipariş bugün`
                                                                : marketplace.status === 'pending'
                                                                ? 'Entegrasyon bekleniyor'
                                                                : 'Henüz bağlanmadı'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                                                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                                                        {statusConfig.label}
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-gray-600 transition-colors">
                                                        chevron_right
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Marketplaces;
