import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string[];
}

interface CustomerDisplayData {
    items: OrderItem[];
    totalAmount: number;
    title: string;
}

interface SelectionData {
    selectedIds: string[];   // flattened uniqueIds e.g. "item-0", "item-1"
    selectionTotal: number;
}

type DisplayState = 'idle' | 'active' | 'complete';

const fmt = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ITEM_COLORS = [
    { bg: 'bg-orange-100', text: 'text-orange-500', icon: 'lunch_dining' },
    { bg: 'bg-blue-100', text: 'text-blue-500', icon: 'set_meal' },
    { bg: 'bg-green-100', text: 'text-green-500', icon: 'local_bar' },
    { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'cake' },
    { bg: 'bg-purple-100', text: 'text-purple-500', icon: 'restaurant' },
    { bg: 'bg-rose-100', text: 'text-rose-500', icon: 'fastfood' },
    { bg: 'bg-teal-100', text: 'text-teal-500', icon: 'local_cafe' },
    { bg: 'bg-indigo-100', text: 'text-indigo-500', icon: 'ramen_dining' },
];

const CustomerDisplay: React.FC = () => {
    const [state, setState] = useState<DisplayState>('idle');
    const [orderData, setOrderData] = useState<CustomerDisplayData | null>(null);
    const [selectionData, setSelectionData] = useState<SelectionData | null>(null);
    // Manuel operatör kontrolü: hangi görünüm zorlanacak
    const [forcedView, setForcedView] = useState<'welcome' | 'amount' | 'qr' | null>(null);
    const { googleReviewUrl, instagramHandle } = useSettingsStore();
    const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearCompleteTimer = () => {
        if (completeTimerRef.current) {
            clearTimeout(completeTimerRef.current);
            completeTimerRef.current = null;
        }
    };

    const showComplete = () => {
        clearCompleteTimer();
        setState('complete');
        completeTimerRef.current = setTimeout(() => {
            setState('idle');
            setOrderData(null);
            setSelectionData(null);
            completeTimerRef.current = null;
        }, 4 * 60 * 1000); // 4 dakika
    };

    useEffect(() => {
        const unlisteners: Array<() => void> = [];

        const setup = async () => {
            try {
                const { listen, emit } = await import('@tauri-apps/api/event');

                // Register ALL listeners BEFORE emitting ready
                const u1 = await listen<CustomerDisplayData>('customer-display:show', (event) => {
                    clearCompleteTimer();
                    // Tutar 0 ise direkt Afiyet Olsun ekranını göster
                    if (event.payload.totalAmount === 0) {
                        showComplete();
                        return;
                    }
                    setOrderData(event.payload);
                    setSelectionData(null);
                    setState('active');
                });

                const u2 = await listen('customer-display:complete', () => {
                    showComplete();
                });

                const u3 = await listen('customer-display:hide', () => {
                    clearCompleteTimer();
                    setState('idle');
                    setOrderData(null);
                    setSelectionData(null);
                });

                const u4 = await listen<SelectionData>('customer-display:selection', (event) => {
                    setSelectionData(
                        event.payload.selectedIds.length > 0 ? event.payload : null
                    );
                });

                const u5 = await listen<'welcome' | 'amount' | 'qr'>('customer-display:force-view', (event) => {
                    setForcedView(event.payload);
                });

                unlisteners.push(u1, u2, u3, u4, u5);

                // Signal readiness — main window will send order data
                await emit('customer-display:ready');
            } catch (err) {
                console.error('CustomerDisplay event setup error:', err);
            }
        };

        setup();

        return () => {
            unlisteners.forEach(fn => fn());
            clearCompleteTimer();
        };
    }, []);

    const subTotal = orderData
        ? orderData.items.reduce((s, i) => s + i.price * i.quantity, 0)
        : 0;

    // How many pieces of a grouped item are in the selection
    const getSelectedCount = (item: OrderItem): number => {
        if (!selectionData) return 0;
        let count = 0;
        for (let i = 0; i < item.quantity; i++) {
            if (selectionData.selectedIds.includes(`${item.id}-${i}`)) count++;
        }
        return count;
    };

    const hasSelection = !!(selectionData && selectionData.selectedIds.length > 0);
    const displayAmount = hasSelection ? selectionData!.selectionTotal : orderData?.totalAmount ?? 0;
    const displayLabel = hasSelection ? 'Seçili Ürünler Toplamı' : 'Ödenecek Toplam Tutar';

    // Operatör manuel seçimi yoksa state makinesini kullan
    const effectiveView: 'welcome' | 'amount' | 'qr' | 'complete' =
        forcedView ?? (state === 'active' ? 'amount' : state === 'complete' ? 'complete' : 'welcome');

    return (
        <div className="h-screen w-full overflow-hidden flex flex-col relative bg-[#F8F9FA] select-none"
            style={{ fontFamily: "'Lexend', sans-serif" }}>

            {/* Subtle dot pattern background */}
            <div className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'radial-gradient(#663259 0.5px, transparent 0.5px), radial-gradient(#663259 0.5px, #F8F9FA 0.5px)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px',
                    opacity: 0.04,
                }} />

            {/* Main content */}
            <main className="flex-1 flex gap-6 p-6 z-10 overflow-hidden">

                {/* ── WELCOME / IDLE STATE ── */}
                {effectiveView === 'welcome' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-8">
                        <div className="w-28 h-28 bg-[#663259] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#663259]/20">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 56 }}>restaurant</span>
                        </div>
                        <div className="text-center">
                            <h2 className="text-4xl font-bold text-[#663259]">Hoş Geldiniz</h2>
                        </div>
                    </div>
                )}

                {/* ── AMOUNT / ACTIVE STATE ── */}
                {effectiveView === 'amount' && orderData && (
                    <>
                        {/* Left – Order items */}
                        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                            <div className="p-7 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Sipariş Özeti</h2>
                                    <p className="text-gray-400 mt-1 text-sm">{orderData.title}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm text-gray-400">
                                    <span className="material-symbols-outlined">receipt_long</span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}>
                                {orderData.items.map((item, idx) => {
                                    const palette = ITEM_COLORS[idx % ITEM_COLORS.length];
                                    const selectedCount = getSelectedCount(item);
                                    const allSelected = selectedCount === item.quantity;
                                    const someSelected = selectedCount > 0 && !allSelected;
                                    const isHighlighted = selectedCount > 0;

                                    return (
                                        <div key={item.id}
                                            className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                                                allSelected
                                                    ? 'border-[#F97171] bg-[#F97171]/5 shadow-md shadow-[#F97171]/10'
                                                    : someSelected
                                                    ? 'border-[#F97171]/50 bg-[#F97171]/3'
                                                    : hasSelection
                                                    ? 'border-gray-100 bg-white opacity-50'
                                                    : 'border-gray-100 bg-white'
                                            }`}>
                                            <div className="flex gap-4">
                                                <div className={`w-16 h-16 ${palette.bg} rounded-xl flex items-center justify-center ${palette.text} shrink-0 relative`}>
                                                    <span className="material-symbols-outlined text-3xl">{palette.icon}</span>
                                                    {isHighlighted && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F97171] rounded-full flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">{selectedCount}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold text-lg transition-colors ${isHighlighted ? 'text-[#F97171]' : 'text-gray-800'}`}>
                                                        {item.name}
                                                    </h3>
                                                    {item.notes && item.notes.length > 0 && (
                                                        <p className="text-sm text-gray-400 mt-0.5">{item.notes.join(', ')}</p>
                                                    )}
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                                                            {item.quantity} Adet
                                                        </div>
                                                        {someSelected && (
                                                            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F97171]/15 text-xs font-bold text-[#F97171]">
                                                                {selectedCount}/{item.quantity} seçili
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <span className={`block text-xl font-bold ${isHighlighted ? 'text-[#F97171]' : 'text-gray-800'}`}>
                                                    ₺{fmt(isHighlighted ? item.price * selectedCount : item.price * item.quantity)}
                                                </span>
                                                {item.quantity > 1 && (
                                                    <span className="text-xs text-gray-400">Birim: ₺{fmt(item.price)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Totals */}
                            <div className="p-7 bg-gray-50/50 border-t border-gray-100 shrink-0">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-gray-400 text-base">
                                        <span>Ara Toplam</span>
                                        <span>₺{fmt(subTotal)}</span>
                                    </div>
                                    {subTotal !== orderData.totalAmount && (
                                        <div className="flex justify-between text-[#10B981] font-medium text-base">
                                            <span>İndirim / Diğer</span>
                                            <span>-₺{fmt(Math.abs(subTotal - orderData.totalAmount))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Right – Total + Payment methods */}
                        <section className="w-[44%] flex flex-col gap-5">
                            <div className={`rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center flex-1 transition-all duration-500 ${
                                hasSelection ? 'bg-[#F97171]' : 'bg-[#663259]'
                            }`}>
                                {/* Decorative blobs */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                                <div className="relative z-10 w-full">
                                    {/* Selection badge */}
                                    {hasSelection && (
                                        <div className="mb-3 inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full">
                                            <span className="material-symbols-outlined text-white text-[16px]">check_circle</span>
                                            <span className="text-white text-sm font-bold">
                                                {selectionData!.selectedIds.length} Ürün Seçildi
                                            </span>
                                        </div>
                                    )}

                                    <p className="text-white/70 text-base font-medium tracking-widest uppercase mb-3">
                                        {displayLabel}
                                    </p>
                                    <div className="flex items-start justify-center gap-1">
                                        <span className="text-5xl font-medium text-white/80 mt-4">₺</span>
                                        <h2 className="leading-none font-bold text-white tracking-tighter"
                                            style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}>
                                            {fmt(displayAmount).split(',')[0]}
                                            <span className="text-4xl text-white/50">
                                                ,{fmt(displayAmount).split(',')[1]}
                                            </span>
                                        </h2>
                                    </div>

                                    {/* Show full total as reference when selection is active */}
                                    {hasSelection && (
                                        <p className="text-white/50 mt-2 text-sm">
                                            Toplam: ₺{fmt(orderData.totalAmount)}
                                        </p>
                                    )}

                                    <div className="mt-8">
                                        <p className="text-white/50 mb-5 font-medium text-sm">Lütfen ödeme yöntemi seçiniz</p>
                                        <div className="flex items-center justify-center gap-5">
                                            {[
                                                { icon: 'credit_card', label: 'Kredi Kartı' },
                                                { icon: 'qr_code_scanner', label: 'QR Kod' },
                                                { icon: 'payments', label: 'Nakit' },
                                            ].map(btn => (
                                                <div key={btn.label} className="flex flex-col items-center gap-2">
                                                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
                                                        <span className="material-symbols-outlined text-white text-4xl">{btn.icon}</span>
                                                    </div>
                                                    <span className="text-white text-sm font-medium">{btn.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Thank you banner */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden shrink-0">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F97171] to-[#663259]" />
                                <div className="w-14 h-14 rounded-full bg-[#F97171]/10 flex items-center justify-center text-[#F97171] shrink-0">
                                    <span className="material-symbols-outlined text-3xl">favorite</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Teşekkür Ederiz!</h3>
                                    <p className="text-gray-400 text-sm">Bizi tercih ettiğiniz için mutluyuz, yine bekleriz.</p>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* ── QR STATE — Manuel operatör kontrolü ── */}
                {effectiveView === 'qr' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-10 p-12">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-[#663259] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#663259]/20">
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>qr_code_2</span>
                            </div>
                            <h2 className="text-4xl font-bold text-gray-800">Bizi Takip Edin</h2>
                            <p className="text-gray-400 mt-2 text-lg">Yorumlarınız ve takibiniz bizim için çok değerli</p>
                        </div>
                        <div className="flex gap-8 w-full max-w-3xl">
                            {/* Google Review */}
                            <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0">
                                        <svg viewBox="0 0 24 24" width="24" height="24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-xl leading-tight">Google</p>
                                        <p className="text-gray-400">Haritalar Yorumu</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {[1,2,3,4,5].map(i => (
                                        <span key={i} className="material-symbols-outlined text-[#FBBC04]" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                </div>
                                <div className="w-48 h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                    {googleReviewUrl ? (
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(googleReviewUrl)}&size=192x192&margin=6`}
                                            alt="Google Review QR"
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-300">
                                            <span className="material-symbols-outlined text-5xl">qr_code_2</span>
                                            <span className="text-sm text-center px-3">Ayarlardan URL girin</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-500 text-base text-center font-medium">Deneyiminizi paylaşın</p>
                            </div>

                            {/* Instagram */}
                            <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'linear-gradient(45deg, #FCAF45, #FD1D1D, #833AB4)' }}>
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-xl leading-tight">Instagram</p>
                                        {instagramHandle && <p className="text-gray-400">@{instagramHandle.replace('@', '')}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#833AB4]/10 to-[#FCAF45]/10 rounded-full border border-purple-100">
                                    <span className="material-symbols-outlined text-[#833AB4] text-xl">person_add</span>
                                    <span className="font-semibold text-[#833AB4]">Bizi Takip Et</span>
                                </div>
                                <div className="w-48 h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                    {instagramHandle ? (
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://instagram.com/${instagramHandle.replace('@', '')}`)}&size=192x192&margin=6`}
                                            alt="Instagram QR"
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-300">
                                            <span className="material-symbols-outlined text-5xl">qr_code_2</span>
                                            <span className="text-sm text-center px-3">Ayarlardan kullanıcı adı girin</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-500 text-base text-center font-medium">En yeni lezzetleri kaçırmayın</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── COMPLETE STATE ── */}
                {effectiveView === 'complete' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Scrollable content */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-12 py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                            {/* Check icon */}
                            <div className="relative shrink-0">
                                <div className="w-24 h-24 bg-[#10B981] rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/25">
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: 52 }}>check_circle</span>
                                </div>
                                <div className="absolute inset-0 rounded-full bg-[#10B981]/20 animate-ping" />
                            </div>

                            {/* Title */}
                            <div className="text-center shrink-0">
                                <h1 className="text-6xl font-bold text-gray-800 tracking-tight">Afiyet Olsun!</h1>
                                <p className="text-gray-400 mt-3 text-xl max-w-xl mx-auto leading-relaxed">
                                    Ödemeniz başarıyla alındı. Deneyiminizi paylaşarak bize destek olabilirsiniz.
                                </p>
                            </div>

                            {/* Social cards */}
                            <div className="flex gap-6 w-full max-w-4xl shrink-0">
                                {/* Google Review Card */}
                                <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4 overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0">
                                            <svg viewBox="0 0 24 24" width="22" height="22">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg leading-tight">Google</p>
                                            <p className="text-gray-400 text-sm">Haritalar</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(i => (
                                            <span key={i} className="material-symbols-outlined text-[#FBBC04]" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>star</span>
                                        ))}
                                    </div>

                                    <div className="w-36 h-36 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                        {googleReviewUrl ? (
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(googleReviewUrl)}&size=144x144&margin=4`}
                                                alt="Google Review QR"
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-gray-300">
                                                <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                                                <span className="text-xs text-center px-2">Ayarlardan URL girin</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-500 text-sm text-center font-medium">
                                        Google Haritalar'da yorumunuzu bekliyoruz
                                    </p>
                                </div>

                                {/* Instagram Card */}
                                <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4 overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(45deg, #FCAF45, #FD1D1D, #833AB4)' }}>
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg leading-tight">Instagram</p>
                                            {instagramHandle && (
                                                <p className="text-gray-400 text-sm">@{instagramHandle.replace('@', '')}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4]/10 to-[#FCAF45]/10 rounded-full border border-purple-100">
                                        <span className="material-symbols-outlined text-[#833AB4] text-lg">person_add</span>
                                        <span className="text-sm font-semibold text-[#833AB4]">Bizi Takip Et</span>
                                    </div>

                                    <div className="w-36 h-36 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                        {instagramHandle ? (
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://instagram.com/${instagramHandle.replace('@', '')}`)}&size=144x144&margin=4`}
                                                alt="Instagram QR"
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-gray-300">
                                                <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                                                <span className="text-xs text-center px-2">Ayarlardan kullanıcı adı girin</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-500 text-sm text-center font-medium">
                                        En yeni lezzetlerimizi kaçırmayın
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer — normal flow, never overlaps content */}
                        <div className="py-3 flex items-center justify-center gap-6 border-t border-gray-100 bg-white/80 shrink-0">
                            <span className="text-gray-400 text-sm">© 2024 Datha POS Systems</span>
                            <span className="text-gray-200">|</span>
                            <span className="text-gray-400 text-sm">Gizlilik Politikası</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomerDisplay;
