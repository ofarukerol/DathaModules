import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Rocket, TrendingUp,
    ChevronUp, Plus, Sparkles
} from 'lucide-react';
import { useAnnouncementStore } from './store';
import FeatureRequestModal from './components/FeatureRequestModal';
import MyFeatureRequestsModal from './components/MyFeatureRequestsModal';
import SlideDetailModal from './components/SlideDetailModal';
import RoadmapDetailModal from './components/RoadmapDetailModal';
import type { Announcement, FeatureRequest, RoadmapItem } from './types';

/* ─── Enum -> Turkce Mapping ─── */
const ANNOUNCEMENT_TYPE_MAP: Record<string, { label: string; color: string }> = {
    RELEASE: { label: 'Yeni Sürüm', color: 'text-[#F97171]' },
    MAINTENANCE: { label: 'Bakım', color: 'text-blue-600' },
    FEATURE: { label: 'Yenilik', color: 'text-green-600' },
    TRAINING: { label: 'Eğitim', color: 'text-green-600' },
    TIP: { label: 'İpucu', color: 'text-purple-600' },
    GENERAL: { label: 'Duyuru', color: 'text-gray-600' },
};

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
    ACCOUNTING: { label: 'Muhasebe', color: 'bg-purple-100 text-purple-700' },
    UI: { label: 'Arayüz', color: 'bg-blue-100 text-blue-700' },
    INTEGRATION: { label: 'Entegrasyon', color: 'bg-green-100 text-green-700' },
    STOCK: { label: 'Stok', color: 'bg-orange-100 text-orange-700' },
    REPORTING: { label: 'Raporlama', color: 'bg-yellow-100 text-yellow-700' },
    PAYMENT: { label: 'Ödeme', color: 'bg-red-100 text-red-700' },
    GENERAL: { label: 'Genel', color: 'bg-gray-100 text-gray-700' },
    OTHER: { label: 'Diğer', color: 'bg-gray-100 text-gray-500' },
};

const FEATURE_STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'BEKLEMEDE', color: 'bg-gray-100 text-gray-500' },
    REVIEWING: { label: 'İNCELENİYOR', color: 'bg-yellow-100 text-yellow-700' },
    PLANNED: { label: 'PLANLANDI', color: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'GELİŞTİRİLİYOR', color: 'bg-[#663259]/10 text-[#663259]' },
    COMPLETED: { label: 'TAMAMLANDI', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'REDDEDİLDİ', color: 'bg-red-100 text-red-700' },
};

const ROADMAP_STATUS_MAP: Record<string, { label: string; color: string }> = {
    PLANNED: { label: 'Planlanmış', color: 'text-blue-500' },
    IN_PROGRESS: { label: 'Devam Ediyor', color: 'text-[#663259]' },
    FINAL_STAGE: { label: 'Son Aşamada', color: 'text-[#F97171]' },
    COMPLETED: { label: 'Tamamlandı', color: 'text-green-600' },
    CANCELLED: { label: 'İptal Edildi', color: 'text-gray-400' },
};

/* ─── Helper ─── */
const formatRelativeDate = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Bugün';
    if (days < 7) return `${days} gün önce`;
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
    return `${Math.floor(days / 30)} ay once`;
};

const getRoadmapColor = (item: RoadmapItem) => item.color ?? '#663259';

const getRoadmapMonthColor = (item: RoadmapItem) => {
    const c = getRoadmapColor(item);
    if (c === '#F97171') return 'bg-[#F97171]/10 text-[#F97171]';
    if (c === '#663259') return 'bg-[#663259]/10 text-[#663259]';
    return 'bg-gray-100 text-gray-500';
};

const getRoadmapIconBg = (item: RoadmapItem) => {
    const c = getRoadmapColor(item);
    if (c === '#F97171') return 'bg-[#F97171]/10 text-[#F97171] group-hover:bg-[#F97171] group-hover:text-white';
    if (c === '#663259') return 'bg-[#663259]/10 text-[#663259] group-hover:bg-[#663259] group-hover:text-white';
    return 'bg-gray-100 text-gray-600 group-hover:bg-gray-700 group-hover:text-white';
};

/* ─── Props ─── */
interface AnnouncementsProps {
    /** Oturum açmış kullanıcının tam adı — "Taleplerim" filtrelemesinde kullanılır */
    currentUserFullName?: string | null;
}

/* ─── Ana Bilesen ─── */
const Announcements: React.FC<AnnouncementsProps> = ({ currentUserFullName }) => {
    const navigate = useNavigate();
    const {
        announcements, sliders, featureRequests, roadmapItems, votedIds,
        fetchAnnouncements, fetchSliders, fetchFeatureRequests, fetchRoadmapItems, fetchMyVotes, toggleVote,
    } = useAnnouncementStore();

    const [currentSlide, setCurrentSlide] = useState(0);
    const [requestFilter, setRequestFilter] = useState<'votes' | 'newest'>('votes');
    const [showFeatureModal, setShowFeatureModal] = useState(false);
    const [showMyRequests, setShowMyRequests] = useState(false);
    const [showSlideDetail, setShowSlideDetail] = useState(false);
    const [selectedSlide, setSelectedSlide] = useState<Announcement | null>(null);
    const [showRoadmapDetail, setShowRoadmapDetail] = useState(false);
    const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapItem | null>(null);

    // Veri yukle
    useEffect(() => {
        fetchSliders();
        fetchAnnouncements();
        fetchFeatureRequests();
        fetchRoadmapItems();
        fetchMyVotes();
    }, [fetchSliders, fetchAnnouncements, fetchFeatureRequests, fetchRoadmapItems, fetchMyVotes]);

    const displaySliders = sliders;
    const displayAnnouncements = announcements;
    const displayRoadmap = roadmapItems;
    const displayRequests = featureRequests;

    const goNext = useCallback(() => {
        setCurrentSlide(prev => (prev + 1) % displaySliders.length);
    }, [displaySliders.length]);

    const goPrev = useCallback(() => {
        setCurrentSlide(prev => (prev - 1 + displaySliders.length) % displaySliders.length);
    }, [displaySliders.length]);

    // Otomatik slayt gecisi
    useEffect(() => {
        if (displaySliders.length <= 1) return;
        const timer = setInterval(goNext, 5000);
        return () => clearInterval(timer);
    }, [goNext, displaySliders.length]);

    const handleVote = (id: string) => {
        toggleVote(id);
    };

    const sortedRequests = [...displayRequests].sort((a, b) =>
        requestFilter === 'votes' ? (b.voteCount ?? 0) - (a.voteCount ?? 0) : 0
    );

    const slide = displaySliders[currentSlide] ?? displaySliders[0];

    const handleSlideDetail = (s: Announcement) => {
        setSelectedSlide(s);
        setShowSlideDetail(true);
    };

    const handleSlideExplore = (s: Announcement) => {
        if (s.slideCta) {
            window.open(s.slideCta, '_blank');
        }
    };

    const handleRoadmapClick = (item: RoadmapItem) => {
        setSelectedRoadmap(item);
        setShowRoadmapDetail(true);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F4F6] antialiased" style={{ fontFamily: "'Lexend', sans-serif" }}>

            {/* Gradient Header */}
            <div className="px-4 lg:px-6 mt-4 lg:mt-5 shrink-0">
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    {/* Dekoratif arka plan dairesi */}
                    <div
                        className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
                    />

                    <div className="relative px-5 lg:px-6 py-4 flex items-center justify-between gap-4">
                        {/* Sol: İkon + Başlık + İstatistik */}
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
                                <span className="material-symbols-outlined text-white text-[24px]">campaign</span>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base lg:text-lg font-bold text-white leading-tight truncate">
                                    Duyurular ve Yol Haritası
                                </h1>
                                <p className="text-white/55 text-xs mt-0.5">
                                    {displayAnnouncements.length > 0 || displayRoadmap.length > 0 || displayRequests.length > 0
                                        ? [
                                            displayAnnouncements.length > 0 && `${displayAnnouncements.length} duyuru`,
                                            displayRoadmap.length > 0 && `${displayRoadmap.length} yol haritası`,
                                            displayRequests.length > 0 && `${displayRequests.length} talep`,
                                          ].filter(Boolean).join(' · ')
                                        : 'Gelişmeleri takip edin'}
                                </p>
                            </div>
                        </div>

                        {/* Sağ: Destek butonu */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => navigate('/support')}
                                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all font-medium text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                                <span className="hidden sm:inline">Destek</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-5 pt-4 flex flex-col">

                {/* Icerik Alani */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {/* Hero Slider */}
                    {slide ? (
                        <div className="w-full mb-5 relative rounded-2xl overflow-hidden shadow-xl shrink-0"
                            style={{ background: 'linear-gradient(135deg, #4A235A 0%, #663259 100%)', height: 'clamp(110px, 22vh, 200px)' }}>

                            {/* Arka plan doku */}
                            <div className="absolute inset-0 opacity-20 mix-blend-overlay"
                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1400&q=60')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#4A235A] via-[#663259]/90 to-transparent" />

                            {/* Dekoratif glow */}
                            <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-[#F97171]/30 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

                            {/* Slider Icerigi */}
                            <div className="relative z-10 h-full flex items-center px-8 overflow-hidden">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold mb-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F97171] animate-pulse" />
                                        {slide.slideTag ?? ANNOUNCEMENT_TYPE_MAP[slide.type]?.label ?? 'DUYURU'}
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-1 leading-snug">
                                        {slide.title}
                                    </h2>
                                    <p className="text-purple-100 text-xs mb-2.5 max-w-lg leading-relaxed line-clamp-1 opacity-90">
                                        {slide.body}
                                    </p>
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => handleSlideExplore(slide)}
                                            className="bg-[#F97171] hover:bg-[#E05A5A] text-white px-4 py-1.5 rounded-lg font-semibold shadow-lg shadow-[#F97171]/30 transition-all flex items-center gap-1.5 text-xs active:scale-95"
                                        >
                                            <Rocket size={14} />
                                            Hemen Keşfet
                                        </button>
                                        <button
                                            onClick={() => handleSlideDetail(slide)}
                                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg font-semibold backdrop-blur-md border border-white/20 transition-all text-xs active:scale-95"
                                        >
                                            Detayları İncele
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Navigasyon Butonlari */}
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-2 z-20">
                                <button onClick={goPrev}
                                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <button onClick={goNext}
                                    className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-[#663259] transition-colors shadow-lg">
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Nokta gostergeleri */}
                            <div className="absolute bottom-4 left-10 flex gap-2 z-20">
                                {displaySliders.map((_, i) => (
                                    <button key={i} onClick={() => setCurrentSlide(i)}
                                        className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'bg-white w-8' : 'bg-white/30 w-2'}`} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full mb-5 relative rounded-2xl overflow-hidden shadow-lg shrink-0 flex items-center justify-center py-10"
                            style={{ background: 'linear-gradient(135deg, #4A235A 0%, #663259 100%)' }}>
                            <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-[#F97171]/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10 text-center">
                                <span className="material-symbols-outlined text-white/30 text-[48px] mb-2 block">campaign</span>
                                <p className="text-white/60 text-sm font-medium">Henüz slider duyurusu eklenmemiş</p>
                            </div>
                        </div>
                    )}

                    {/* 3 Sutunlu Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* SOL: Duyurular */}
                        <div className="lg:col-span-3 flex flex-col">
                            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 border-t-4 border-t-[#663259] p-5 flex flex-col h-full">
                                <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#663259] text-[22px]">campaign</span>
                                    Duyurular
                                </h3>
                                <div className="space-y-5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                    {displayAnnouncements.length > 0 ? displayAnnouncements.map((item) => {
                                        const typeInfo = ANNOUNCEMENT_TYPE_MAP[item.type] ?? ANNOUNCEMENT_TYPE_MAP.GENERAL;
                                        return (
                                            <div key={item.id} className="group relative pl-4 border-l-2 border-gray-200 hover:border-[#663259] transition-colors pb-1">
                                                <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-200 group-hover:bg-[#663259] transition-colors" />
                                                <span className={`text-xs font-semibold uppercase tracking-wide ${typeInfo.color}`}>{typeInfo.label}</span>
                                                <h4 className="text-sm font-bold text-gray-800 mt-1 mb-1.5 group-hover:text-[#663259] transition-colors leading-snug">{item.title}</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.body}</p>
                                                <span className="text-[10px] text-gray-400 mt-1.5 block">{formatRelativeDate(item.publishedAt ?? item.createdAt)}</span>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <span className="material-symbols-outlined text-gray-300 text-[40px] mb-2">notifications_none</span>
                                            <p className="text-sm text-gray-400">Henüz duyuru yok</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ORTA: Ozellik Iste + Populer Talepler */}
                        <div className="lg:col-span-5 flex flex-col gap-5">
                            {/* Ozellik Iste Karti */}
                            <div className="relative overflow-hidden rounded-2xl p-7 text-center shadow-lg group cursor-pointer transition-transform hover:scale-[1.01] shrink-0"
                                style={{ background: 'linear-gradient(135deg, #F97171, #663259)' }}>
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all pointer-events-none" />
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-[#663259]/40 rounded-full blur-2xl pointer-events-none" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner group-hover:rotate-12 transition-transform duration-300">
                                        <Sparkles size={28} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Bir Özellik İste</h3>
                                    <p className="text-white/90 text-xs mb-5 max-w-xs leading-relaxed">
                                        DathaDesktop'ta görmek istediğiniz yenilikleri bizimle paylaşın. Fikriniz bir sonraki güncellememiz olabilir.
                                    </p>
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => setShowFeatureModal(true)}
                                            className="bg-white text-[#663259] font-bold py-2.5 px-7 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-sm active:scale-95"
                                        >
                                            <Plus size={18} />
                                            Yeni Talep Oluştur
                                        </button>
                                        <button
                                            onClick={() => setShowMyRequests(true)}
                                            className="bg-white/20 text-white font-bold py-2.5 px-5 rounded-xl backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all flex items-center gap-2 text-sm active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">history</span>
                                            Taleplerim
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Populer Talepler */}
                            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 p-5 flex flex-col flex-1" style={{ maxHeight: '420px' }}>
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                        <TrendingUp size={18} className="text-yellow-500" />
                                        Popüler Talepler
                                    </h3>
                                    <div className="flex gap-1 text-xs font-medium bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setRequestFilter('votes')}
                                            className={`px-3 py-1 rounded-md transition-colors ${requestFilter === 'votes' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            En Çok Oy
                                        </button>
                                        <button
                                            onClick={() => setRequestFilter('newest')}
                                            className={`px-3 py-1 rounded-md transition-colors ${requestFilter === 'newest' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            En Yeni
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                                    {sortedRequests.length > 0 ? sortedRequests.map((req: FeatureRequest) => {
                                        const statusInfo = FEATURE_STATUS_MAP[req.status] ?? FEATURE_STATUS_MAP.PENDING;
                                        const catInfo = CATEGORY_MAP[req.category] ?? CATEGORY_MAP.GENERAL;
                                        const voted = votedIds.has(req.id);
                                        return (
                                            <div key={req.id} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:border-[#F97171]/30 hover:shadow-md transition-all">
                                                {/* Oy Butonu */}
                                                <div className="flex flex-col items-center gap-1 min-w-[44px]">
                                                    <button
                                                        onClick={() => handleVote(req.id)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${voted ? 'bg-green-100 text-green-600' : 'bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                                                    >
                                                        <ChevronUp size={18} />
                                                    </button>
                                                    <span className={`text-sm font-bold ${voted ? 'text-green-600' : 'text-gray-700'}`}>{req.voteCount ?? 0}</span>
                                                </div>
                                                {/* Icerik */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-800 mb-0.5">{req.title}</h4>
                                                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{req.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                                                    </div>
                                                </div>
                                                {/* Durum */}
                                                <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <span className="material-symbols-outlined text-gray-300 text-[40px] mb-2">lightbulb</span>
                                            <p className="text-sm text-gray-400">Henüz talep yok</p>
                                            <p className="text-xs text-gray-300">İlk talebi siz oluşturun!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SAG: Yakinda Gelecekler */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <div className="bg-[#663259]/5 px-4 py-3 rounded-xl flex items-center justify-between shrink-0">
                                <h3 className="text-base font-bold text-[#663259] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">upcoming</span>
                                    Yakinda Gelecekler
                                </h3>
                                <span className="text-xs font-medium text-[#663259]/70 bg-[#663259]/10 px-2 py-1 rounded">
                                    {new Date().getFullYear()}
                                </span>
                            </div>

                            <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-1">
                                {displayRoadmap.length > 0 ? displayRoadmap.map(item => {
                                    const statusInfo = ROADMAP_STATUS_MAP[item.status] ?? ROADMAP_STATUS_MAP.PLANNED;
                                    const progressColor = getRoadmapColor(item);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleRoadmapClick(item)}
                                            className="bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
                                        >
                                            {/* Ay etiketi */}
                                            <span className={`absolute top-0 right-0 text-[10px] font-bold px-2 py-1 rounded-bl-lg ${getRoadmapMonthColor(item)}`}>
                                                {item.targetMonth ?? item.targetQuarter ?? ''}
                                            </span>
                                            {/* Ikon */}
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${getRoadmapIconBg(item)}`}>
                                                <span className="material-symbols-outlined text-[22px]">{item.icon ?? 'rocket_launch'}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h4>
                                            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{item.description}</p>
                                            {/* Progress Bar */}
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${item.progress}%`, backgroundColor: progressColor }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center mt-1.5">
                                                <span className="text-[10px] text-gray-400">Geliştirme %{item.progress}</span>
                                                <span className={`text-[10px] font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <span className="material-symbols-outlined text-gray-300 text-[40px] mb-2">rocket_launch</span>
                                        <p className="text-sm text-gray-400">Henüz yol haritası eklenmemiş</p>
                                    </div>
                                )}

                                {/* Fikir kutusu */}
                                <div className="bg-white/85 backdrop-blur-sm p-4 rounded-xl border border-dashed border-[#F97171]/40 bg-[#F97171]/5 flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                        <span className="material-symbols-outlined text-[#F97171] text-[20px]">mark_chat_unread</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 font-medium">Baska bir fikir mi var?</p>
                                        <button
                                            onClick={() => setShowFeatureModal(true)}
                                            className="text-xs font-bold text-[#F97171] hover:underline"
                                        >
                                            Doğrudan ekibe yazın &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modaller */}
            <FeatureRequestModal
                isOpen={showFeatureModal}
                onClose={() => setShowFeatureModal(false)}
            />
            <MyFeatureRequestsModal
                isOpen={showMyRequests}
                onClose={() => setShowMyRequests(false)}
                onNewRequest={() => setShowFeatureModal(true)}
                currentUserFullName={currentUserFullName}
            />
            <SlideDetailModal
                isOpen={showSlideDetail}
                onClose={() => setShowSlideDetail(false)}
                item={selectedSlide}
            />
            <RoadmapDetailModal
                isOpen={showRoadmapDetail}
                onClose={() => setShowRoadmapDetail(false)}
                item={selectedRoadmap}
            />
        </div>
    );
};

export default Announcements;
