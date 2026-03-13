import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFavoritesStore, CALENDAR_PAGE_INFO } from './store';
import CustomSelect from './components/CustomSelect';
import DatePicker from './components/DatePicker';
import RichTextEditor from './components/RichTextEditor';
import { useEscapeKey } from '../_shared/useEscapeKey';
import type { CalendarEvent, Reservation, StaffMember, EventFormState } from './types';

// Helper functions
function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMonthGridDays(year: number, month: number): Date[] {
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
    const start = new Date(year, month, 1 - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
    }
    return days;
}

function getWeekDays(date: Date): Date[] {
    const d = new Date(date);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const wd = new Date(d);
        wd.setDate(wd.getDate() + i);
        days.push(wd);
    }
    return days;
}

const TURKISH_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TURKISH_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const TURKISH_DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Sample data
const sampleEvents: CalendarEvent[] = [
    { id: '1', date: '2023-10-02', title: '09:00 Vardiya', type: 'shift', color: '#8E44AD' },
    { id: '2', date: '2023-10-03', title: '20:30 Rezv (4)', type: 'reservation', color: '#F97171', time: '20:30' },
    { id: '3', date: '2023-10-05', title: '09:00 Vardiya', type: 'shift', color: '#8E44AD' },
    { id: '4', date: '2023-10-05', title: '14:00 Tedarik', type: 'special', color: '#3B82F6' },
    { id: '5', date: '2023-10-06', title: 'Özel Etkinlik', type: 'special', color: '#10B981' },
    { id: '6', date: '2023-10-09', title: '19:00 Rezv (2)', type: 'reservation', color: '#F97171', time: '19:00' },
    { id: '7', date: '2023-10-11', title: '09:00 Vardiya', type: 'shift', color: '#8E44AD' },
    { id: '8', date: '2023-10-13', title: '21:00 Rezv (8)', type: 'reservation', color: '#F97171', time: '21:00' },
    { id: '9', date: '2023-10-19', title: '11:00 Vardiya', type: 'shift', color: '#8E44AD' },
    { id: '10', date: '2023-10-20', title: '18:30 Rezv (6)', type: 'reservation', color: '#F97171', time: '18:30' },
    { id: '11', date: '2023-10-24', title: '20:30 Rezv (4) - Masa 5', type: 'reservation', color: '#F97171', time: '20:30', details: '4 Kişi • Masa 5 (Teras)' },
    { id: '12', date: '2023-10-24', title: '16:00 A. Yılmaz - Şef', type: 'shift', color: '#8E44AD' },
    { id: '13', date: '2023-10-26', title: '09:00 Vardiya', type: 'shift', color: '#8E44AD' },
    { id: '14', date: '2023-10-29', title: 'Cumhuriyet B.', type: 'special', color: '#10B981' },
    { id: '15', date: '2023-10-31', title: 'Cadılar Bayramı', type: 'special', color: '#F97171' },
];

const sampleReservations: Reservation[] = [
    { id: '1', time: '20:30', name: 'Ahmet Yılmaz', people: 4, table: 'Masa 5 (Teras)', status: 'confirmed' },
    { id: '2', time: '21:00', name: 'Ayşe Demir', people: 2, table: 'Masa 12', status: 'waiting' },
];

const sampleStaff: StaffMember[] = [
    {
        id: '1',
        name: 'Selin Kara',
        role: 'Baş Garson',
        hours: '16:00 - 00:00',
        status: 'online',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWc_buFz3vYi6CvfqEjb-0znyuy-D3PL79LT2SQf8Cx2LT73QraVCRrpzjyLcLqMYVcLsSBGgBui3Am-xpe6s_582Bu0yZzWF47prvE-__EJe3i2nVd92CxvE1CmigZR1CWuAIGWox20brFhuIIPytqOj5u807MZyj7GTx1jCU5OgFglEHF_uC-vqnNBwgRo8XUjUWZ_7luaTFp88rQc5THxjOASa8YtnEVAiiwFGvm5Ht-Cah3FBpKUfE3cpKfq6w0q2DCBkeKcE'
    },
    {
        id: '2',
        name: 'Can Yücel',
        role: 'Barmen',
        hours: '18:00 - 02:00',
        status: 'online',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_UVv-pjvWAAq_ntg7FbEy1XuXe5Y7UgjItexNOxIr2e5-54YncXesuE_jEArZzV-Fy5PosXmX8V4uleGlUU-qHIzgYctYlw38a-jp7D9mTaPlvarcfpuLX95brvxgHC21e_-8Gz2UsaV6yfaBt98RJxTAlnazIW31tqHb72Tfm9Wl_Ethw2ldBaH3TwD6PnGV0TL_vP8ioPZpetbrlBLJmXJaql-yNincGHo2XaTHNMCdRrdBA5QiBZLoRTX9HhcAI_dCUuLmmx8'
    },
    {
        id: '3',
        name: 'Ali Yılmaz',
        role: 'Şef (Yönetici)',
        hours: '09:00 - 17:00',
        status: 'offline',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr8QmBf_5dke1rEMRIM_wHbta7VdavdwZCkuMz_lU1ggzs2YuYjoO5mIvJ02NOG2ZmS_KpQSeCkTLDGYlNFKNKFBSVL9YdSznFrviu42RPRmBI3ZnutCycppPAHm9XLBYfWgRMo5zVCjMYVid-EMLi1mZHh7AOaBH1XdK8u_VLJMvhD_p8-0teV4CvHlWragLCRaKo37JOXX7F7RYMinZdkqZwdbtxGtjBO-OguFCb-OUMuU0MvM_-nJ0jyI_V7nyHE1OHEUtMpj8'
    },
];

const EVENT_TYPE_OPTIONS = [
    { value: 'reservation', label: 'Rezervasyon', icon: 'table_restaurant' },
    { value: 'special', label: 'Özel Etkinlik', icon: 'celebration' },
    { value: 'social_media', label: 'Sosyal Medya', icon: 'share' },
    { value: 'sms', label: 'SMS', icon: 'sms' },
    { value: 'whatsapp', label: 'WhatsApp Business', icon: 'chat' },
];

const SM_PLATFORM_OPTIONS = [
    { value: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { value: 'facebook', label: 'Facebook', icon: 'thumb_up' },
    { value: 'tiktok', label: 'TikTok', icon: 'music_note' },
    { value: 'twitter', label: 'Twitter / X', icon: 'tag' },
    { value: 'youtube', label: 'YouTube', icon: 'play_circle' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'work' },
];

const SM_CONTENT_TYPE_OPTIONS = [
    { value: 'post', label: 'Gönderi', icon: 'image' },
    { value: 'story', label: 'Story', icon: 'amp_stories' },
    { value: 'reel', label: 'Reel', icon: 'slow_motion_video' },
    { value: 'video', label: 'Video', icon: 'videocam' },
    { value: 'live', label: 'Canlı Yayın', icon: 'sensors' },
    { value: 'carousel', label: 'Carousel', icon: 'view_carousel' },
];

const TABLE_OPTIONS = [
    { value: 'masa-1', label: 'Masa 1' },
    { value: 'masa-2', label: 'Masa 2' },
    { value: 'masa-3', label: 'Masa 3' },
    { value: 'masa-4', label: 'Masa 4' },
    { value: 'masa-5', label: 'Masa 5 (Teras)' },
    { value: 'masa-6', label: 'Masa 6 (Teras)' },
    { value: 'masa-7', label: 'Masa 7' },
    { value: 'masa-8', label: 'Masa 8' },
    { value: 'masa-9', label: 'Masa 9' },
    { value: 'masa-10', label: 'Masa 10' },
    { value: 'masa-11', label: 'Masa 11' },
    { value: 'masa-12', label: 'Masa 12' },
    { value: 'bar-1', label: 'Bar 1' },
    { value: 'bar-2', label: 'Bar 2' },
    { value: 'vip', label: 'VIP Oda' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hour = String(Math.floor(i / 2)).padStart(2, '0');
    const minute = i % 2 === 0 ? '00' : '30';
    return { value: `${hour}:${minute}`, label: `${hour}:${minute}`, icon: 'schedule' };
});

const EVENT_COLORS = [
    { value: '#F97171', label: 'Kırmızı' },
    { value: '#F59E0B', label: 'Turuncu' },
    { value: '#10B981', label: 'Yeşil' },
    { value: '#3B82F6', label: 'Mavi' },
    { value: '#8E44AD', label: 'Mor' },
    { value: '#EC4899', label: 'Pembe' },
];

const DEFAULT_FORM: EventFormState = {
    type: 'reservation',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    peopleCount: '',
    table: '',
    description: '',
    color: '#F97171',
    smPlatform: '',
    smContentType: '',
};

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toggleFavorite, isFavorite } = useFavoritesStore();
    const isFav = isFavorite(location.pathname);

    const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 24)); // October 24, 2023
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventForm, setEventForm] = useState<EventFormState>(DEFAULT_FORM);

    useEscapeKey(() => {
        if (showEventModal) {
            setShowEventModal(false);
            setEventForm(DEFAULT_FORM);
        }
    }, showEventModal);

    const updateEventForm = (field: string, value: string) => {
        setEventForm(prev => ({ ...prev, [field]: value }));
    };

    const resetEventForm = () => {
        setEventForm(DEFAULT_FORM);
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date(2023, 9, 24); // Fixed to Oct 24, 2023 for demo
    const todayKey = toDateKey(today);

    const monthGridDays = useMemo(() => getMonthGridDays(year, month), [year, month]);
    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

    const navigateMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const getEventsForDay = (dateStr: string) => {
        return sampleEvents.filter(e => e.date === dateStr);
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'reservation':
                return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-500' };
            case 'shift':
                return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-500' };
            case 'special':
                return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' };
            default:
                return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500' };
        }
    };

    const handleAddEvent = () => {
        if (eventForm.title.trim()) {
            resetEventForm();
            setShowEventModal(false);
        }
    };

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
                        {/* Sol: İkon + Başlık */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button onClick={() => navigate(-1)} className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0">
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">calendar_month</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-white leading-tight">Takvim</h1>
                                    <button
                                        onClick={() => toggleFavorite({ path: location.pathname, ...CALENDAR_PAGE_INFO })}
                                        className={`relative group w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-125 active:scale-95 ${isFav ? 'text-amber-400' : 'text-white/40 hover:text-amber-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{isFav ? 'star' : 'star_border'}</span>
                                        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">{isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}</span>
                                    </button>
                                </div>
                                <p className="text-white/60 text-xs mt-0.5">Rezervasyonlar ve personel vardiya yönetimi</p>
                            </div>
                        </div>

                        {/* Sağ: Eylem butonları */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* View Mode Buttons */}
                            <div className="h-10 flex items-center bg-white/10 rounded-xl p-1 border border-white/15">
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`h-8 px-4 rounded-lg text-sm font-semibold transition-all flex items-center ${
                                        viewMode === 'month'
                                            ? 'bg-white text-[#663259] shadow-sm'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    Ay
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={`h-8 px-4 rounded-lg text-sm font-semibold transition-all flex items-center ${
                                        viewMode === 'week'
                                            ? 'bg-white text-[#663259] shadow-sm'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    Hafta
                                </button>
                                <button
                                    onClick={() => setViewMode('day')}
                                    className={`h-8 px-4 rounded-lg text-sm font-semibold transition-all flex items-center ${
                                        viewMode === 'day'
                                            ? 'bg-white text-[#663259] shadow-sm'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    Gün
                                </button>
                            </div>

                            {/* Month Navigator */}
                            <div className="h-10 flex items-center gap-1 bg-white/10 px-2 rounded-xl border border-white/15">
                                <button
                                    onClick={() => navigateMonth(-1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                                </button>
                                <span className="font-bold text-white text-sm min-w-[120px] text-center">
                                    {TURKISH_MONTHS[month]} {year}
                                </span>
                                <button
                                    onClick={() => navigateMonth(1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                </button>
                            </div>

                            {/* Add Event Button */}
                            <button
                                onClick={() => setShowEventModal(true)}
                                className="h-10 px-5 rounded-xl bg-[#F97171] text-white font-bold shadow-lg shadow-[#F97171]/30 hover:bg-[#E05A5A] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span className="text-sm">Yeni Etkinlik</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex gap-6 items-start">
                    {/* Calendar Grid */}
                    <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm p-6 border border-gray-100 overflow-y-auto custom-scrollbar min-h-0">
                        {viewMode === 'month' && (
                            <>
                                {/* Day Headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {TURKISH_DAYS.map((day, i) => (
                                        <div key={day} className={`py-2 text-center text-sm font-semibold ${i >= 5 ? 'text-[#F97171]' : 'text-[#6B7280]'}`}>
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden flex-1">
                                    {monthGridDays.map((day, i) => {
                                        const dateKey = toDateKey(day);
                                        const isCurrentMonth = day.getMonth() === month;
                                        const isToday = dateKey === todayKey;
                                        const dayEvents = getEventsForDay(dateKey);

                                        return (
                                            <div
                                                key={i}
                                                className={`min-h-[120px] p-2 transition-colors relative ${
                                                    !isCurrentMonth
                                                        ? 'bg-gray-50/50 text-gray-400'
                                                        : isToday
                                                        ? 'bg-white ring-2 ring-[#F97171] ring-inset z-10'
                                                        : 'bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className={`flex ${isToday ? 'justify-between items-start' : 'justify-start'}`}>
                                                    <span className={`font-medium text-sm ${isToday ? 'font-bold text-[#F97171]' : 'text-gray-700'}`}>
                                                        {day.getDate()}
                                                    </span>
                                                    {isToday && (
                                                        <span className="text-[10px] font-bold bg-[#F97171] text-white px-1.5 rounded">
                                                            Bugün
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`${isToday ? 'mt-2' : 'mt-1'} space-y-1`}>
                                                    {dayEvents.map((event) => {
                                                        const colors = getEventColor(event.type);
                                                        return (
                                                            <div
                                                                key={event.id}
                                                                className={`${colors.bg} ${colors.text} text-[10px] px-1.5 py-0.5 rounded truncate font-medium border-l-2 ${colors.border}`}
                                                            >
                                                                {event.title}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {viewMode === 'week' && (
                            <div className="flex-1 flex flex-col">
                                <div className="grid grid-cols-7 mb-4 gap-2">
                                    {weekDays.map((day, i) => {
                                        const dateKey = toDateKey(day);
                                        const isToday = dateKey === todayKey;
                                        return (
                                            <div key={i} className={`text-center p-3 rounded-xl ${isToday ? 'bg-[#F97171] text-white' : 'bg-gray-50'}`}>
                                                <div className="text-xs font-medium opacity-70">{TURKISH_DAYS[i]}</div>
                                                <div className="text-2xl font-bold mt-1">{day.getDate()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex-1 grid grid-cols-7 gap-2">
                                    {weekDays.map((day, i) => {
                                        const dateKey = toDateKey(day);
                                        const dayEvents = getEventsForDay(dateKey);
                                        return (
                                            <div key={i} className="border border-gray-200 rounded-xl p-2 space-y-2 overflow-y-auto">
                                                {dayEvents.map((event) => {
                                                    const colors = getEventColor(event.type);
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={`${colors.bg} ${colors.text} text-xs px-2 py-2 rounded-lg font-medium border-l-2 ${colors.border}`}
                                                        >
                                                            {event.time && <div className="font-bold mb-1">{event.time}</div>}
                                                            <div>{event.title}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {viewMode === 'day' && (
                            <div className="flex-1 flex flex-col">
                                <div className="bg-gradient-to-br from-[#663259] to-[#8E44AD] text-white rounded-2xl p-6 mb-4">
                                    <h3 className="text-3xl font-bold">{today.getDate()} {TURKISH_MONTHS[today.getMonth()]}</h3>
                                    <p className="text-white/80 mt-1">{TURKISH_DAY_NAMES[(today.getDay() + 6) % 7]}, {today.getFullYear()}</p>
                                </div>
                                <div className="flex-1 space-y-3 overflow-y-auto">
                                    {getEventsForDay(todayKey).map((event) => {
                                        const colors = getEventColor(event.type);
                                        return (
                                            <div
                                                key={event.id}
                                                className={`${colors.bg} ${colors.text} p-4 rounded-xl font-medium border-l-4 ${colors.border} flex items-center gap-4`}
                                            >
                                                {event.time && (
                                                    <div className="text-2xl font-bold">{event.time}</div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="font-bold text-lg">{event.title}</div>
                                                    {event.details && <div className="text-sm mt-1 opacity-80">{event.details}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="w-[340px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pb-6">
                        {/* Today Card */}
                        <div className="bg-gradient-to-br from-[#663259] to-[#4A235A] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-white/15 transition-all"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F97171]/30 rounded-full -ml-8 -mb-8 blur-xl group-hover:bg-[#F97171]/40 transition-all"></div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold mb-1 text-white">24 Ekim</h3>
                                <p className="text-white/70 mb-6 font-medium">Salı, 2023</p>
                                <div className="flex gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex-1 border border-white/10 hover:bg-white/15 transition-all">
                                        <p className="text-xs text-white/70 mb-2 font-medium">Rezervasyon</p>
                                        <p className="text-3xl font-bold text-white">12</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex-1 border border-white/10 hover:bg-white/15 transition-all">
                                        <p className="text-xs text-white/70 mb-2 font-medium">Personel</p>
                                        <p className="text-3xl font-bold text-white">8</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Reservations */}
                        <div className="flex flex-col gap-4">
                            <h4 className="font-bold text-[#1F2937] text-sm uppercase tracking-wider pl-1">
                                Yaklaşan Rezervasyonlar
                            </h4>
                            <div className="space-y-3">
                            {sampleReservations.map((reservation) => (
                                <div
                                    key={reservation.id}
                                    className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start group hover:border-[#F97171]/50 hover:shadow-md transition-all cursor-pointer shadow-sm"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                                        reservation.status === 'confirmed'
                                            ? 'bg-orange-50 text-orange-500 border-orange-100'
                                            : 'bg-gray-50 text-gray-500 border-gray-100'
                                    }`}>
                                        <span className="text-xs font-bold">{reservation.time}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h5 className="font-bold text-[#1F2937] text-sm">{reservation.name}</h5>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                reservation.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {reservation.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">group</span>
                                            {reservation.people} Kişi • {reservation.table}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>

                        {/* Staff on Shift */}
                        <div className="flex flex-col gap-4">
                            <h4 className="font-bold text-[#1F2937] text-sm uppercase tracking-wider pl-1">
                                Vardiyadaki Personel
                            </h4>
                            <div className="space-y-3">
                            {sampleStaff.map((staff) => (
                                <div
                                    key={staff.id}
                                    className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3 items-center group hover:border-[#8E44AD]/50 hover:shadow-md transition-all shadow-sm"
                                >
                                    <div className="relative">
                                        <img
                                            alt={staff.name}
                                            className="w-10 h-10 rounded-lg object-cover"
                                            src={staff.avatar}
                                        />
                                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${
                                            staff.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                        }`}></span>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-[#1F2937] text-sm">{staff.name}</h5>
                                        <p className="text-xs text-[#8E44AD] font-medium">{staff.role}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-400 font-mono">{staff.hours}</span>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowEventModal(false); resetEventForm(); }}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#663259] to-[#8E44AD] p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#F97171]/30 rounded-full -ml-5 -mb-5 blur-xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white">event_note</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Yeni Etkinlik</h3>
                                        <p className="text-white/70 text-xs mt-0.5">Etkinlik detaylarını doldurun</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowEventModal(false); resetEventForm(); }}
                                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                            {/* Event Type */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Etkinlik Türü</label>
                                <CustomSelect
                                    options={EVENT_TYPE_OPTIONS}
                                    value={eventForm.type}
                                    onChange={(v) => updateEventForm('type', v)}
                                    icon="category"
                                    accentColor="#663259"
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Etkinlik Başlığı</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[16px] text-gray-400">edit</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={eventForm.title}
                                        onChange={(e) => updateEventForm('title', e.target.value)}
                                        placeholder="Örn: Doğum günü partisi, Ekip toplantısı"
                                        className="w-full pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#663259]/30 focus:ring-2 focus:ring-[#663259]/10 outline-none transition-all"
                                        style={{ paddingLeft: '52px' }}
                                    />
                                </div>
                            </div>

                            {/* Date + Time Row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tarih</label>
                                    <DatePicker
                                        value={eventForm.date}
                                        onChange={(v) => updateEventForm('date', v)}
                                        icon="event"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Başlangıç</label>
                                    <CustomSelect
                                        options={TIME_OPTIONS}
                                        value={eventForm.startTime}
                                        onChange={(v) => updateEventForm('startTime', v)}
                                        placeholder="Saat"
                                        icon="schedule"
                                        accentColor="#663259"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bitiş</label>
                                    <CustomSelect
                                        options={TIME_OPTIONS}
                                        value={eventForm.endTime}
                                        onChange={(v) => updateEventForm('endTime', v)}
                                        placeholder="Saat"
                                        icon="schedule"
                                        accentColor="#663259"
                                    />
                                </div>
                            </div>

                            {/* Reservation Fields */}
                            {eventForm.type === 'reservation' && (
                                <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-[16px] text-orange-400">table_restaurant</span>
                                        <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">Rezervasyon Detayları</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Kişi Sayısı</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[16px] text-orange-400">group</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    value={eventForm.peopleCount}
                                                    onChange={(e) => updateEventForm('peopleCount', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full pr-4 py-3 bg-white border border-orange-100 rounded-2xl text-sm font-bold text-gray-800 placeholder-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                                    style={{ paddingLeft: '52px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Masa / Konum</label>
                                            <CustomSelect
                                                options={TABLE_OPTIONS}
                                                value={eventForm.table}
                                                onChange={(v) => updateEventForm('table', v)}
                                                placeholder="Masa seçin"
                                                icon="table_restaurant"
                                                accentColor="#F97171"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Social Media Fields */}
                            {eventForm.type === 'social_media' && (
                                <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-[16px] text-purple-400">share</span>
                                        <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Sosyal Medya Detayları</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Platform</label>
                                            <CustomSelect
                                                options={SM_PLATFORM_OPTIONS}
                                                value={eventForm.smPlatform}
                                                onChange={(v) => updateEventForm('smPlatform', v)}
                                                placeholder="Seçiniz"
                                                icon="smartphone"
                                                accentColor="#663259"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tür</label>
                                            <CustomSelect
                                                options={SM_CONTENT_TYPE_OPTIONS}
                                                value={eventForm.smContentType}
                                                onChange={(v) => updateEventForm('smContentType', v)}
                                                placeholder="Seçiniz"
                                                icon="style"
                                                accentColor="#663259"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Açıklama</label>
                                <RichTextEditor
                                    value={eventForm.description}
                                    onChange={(html) => updateEventForm('description', html)}
                                    placeholder="Etkinlik hakkında notlar..."
                                    minHeight={100}
                                    accentColor="#663259"
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Renk</label>
                                <div className="flex gap-2.5">
                                    {EVENT_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateEventForm('color', c.value)}
                                            className="w-9 h-9 rounded-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                                            style={{
                                                backgroundColor: c.value,
                                                boxShadow: eventForm.color === c.value
                                                    ? `0 0 0 2px white, 0 0 0 4px ${c.value}`
                                                    : 'none',
                                            }}
                                            title={c.label}
                                        >
                                            {eventForm.color === c.value && (
                                                <span className="material-symbols-outlined text-white text-[16px] drop-shadow-sm">check</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            <button
                                onClick={() => { setShowEventModal(false); resetEventForm(); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAddEvent}
                                disabled={!eventForm.title.trim()}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                    eventForm.title.trim()
                                        ? 'bg-[#F97171] text-white hover:bg-[#E05A5A] shadow-lg shadow-[#F97171]/30'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                Etkinlik Ekle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
