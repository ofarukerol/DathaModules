import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore, User } from '../../../stores/useUserStore';
import { useFavoritesStore, getPageInfo } from '../../../stores/useFavoritesStore';
import { usePersonnelConfigStore } from '../stores/usePersonnelConfigStore';
import { ChevronLeft, ChevronRight, Search, Download, Copy, X } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import { useShiftDefinitionStore } from '../stores/useShiftDefinitionStore';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import HeaderActions from '../../../components/HeaderActions';

// --- Types ---
interface ShiftEntry {
    planned: string | null;       // e.g. "21:00 - 02:00"
    actualIn?: string | null;     // e.g. "20:44"
    actualOut?: string | null;    // e.g. "01:42" — null = henüz çıkış yapmadı
    type: 'normal' | 'off' | 'undefined';
    lateEntry?: boolean;          // geç giriş (tolerans aşıldı)
    earlyExit?: boolean;          // erken çıkış (tolerans aşıldı)
    noQrScan?: boolean;           // QR okutulmadı, mesai süresi bitti
}

interface PersonnelShift {
    userId: string;
    name: string;
    employeeCode: string;
    department: string;
    departmentColor: string;
    position: string;
    totalHours: string;        // planlanan toplam
    actualTotalHours: string;  // gerçek çalışılan toplam
    shifts: ShiftEntry[];
}

// --- Helpers ---
const DAY_NAMES = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];

// Fallback department mapping when user has no departmentId assigned
const ROLE_DEPT_FALLBACK: Record<string, { label: string; color: string }> = {
    'Yönetici': { label: 'Yönetim', color: '#8B5CF6' },
    'Garson': { label: 'Salon', color: '#3B82F6' },
    'Kasiyer': { label: 'Mutfak', color: '#10B981' },
};

function getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDateShort(date: Date): string {
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateDay(date: Date): string {
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// Generate deterministic mock shift data based on user id + day
function generateMockShifts(user: User, weekStart: Date, deptMap: Record<string, { name: string; color: string }>, positionNames: string[]): PersonnelShift {
    const userDept = user.departmentId && deptMap[user.departmentId]
        ? { label: deptMap[user.departmentId].name, color: deptMap[user.departmentId].color }
        : ROLE_DEPT_FALLBACK[user.role] || { label: user.role, color: '#6B7280' };
    const hash = user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const userPosition = positionNames.length > 0
        ? positionNames[hash % positionNames.length]
        : user.role;

    const shiftTemplates = [
        '21:00 - 02:00', '17:00 - 02:00', '10:00 - 19:00',
        '12:00 - 21:00', '08:00 - 17:00', '10:00 - 02:00',
    ];

    const baseShift = shiftTemplates[hash % shiftTemplates.length];
    const shifts: ShiftEntry[] = [];
    let plannedTotalMin = 0;
    let actualTotalMin = 0;

    // Planlanan vardiya dakika hesabı (HH:MM - HH:MM formatından)
    const parsePlanned = (s: string): number => {
        const [sH, sM, eH, eM] = s.split(/[- :]+/).map(Number);
        let diff = (eH * 60 + eM) - (sH * 60 + sM);
        if (diff <= 0) diff += 24 * 60;
        return diff;
    };

    // Gerçek çalışma dakikası (actualIn → actualOut arası)
    const calcActualMinutes = (inStr: string, outStr: string): number => {
        const [inH, inM] = inStr.split(':').map(Number);
        const [outH, outM] = outStr.split(':').map(Number);
        let diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff <= 0) diff += 24 * 60;
        return diff;
    };

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        const seed = (hash + i * 7 + dayDate.getDate()) % 10;

        if (seed < 2) {
            shifts.push({ planned: null, type: 'off' });
        } else if (seed === 2) {
            shifts.push({ planned: null, type: 'undefined' });
        } else {
            const [startH, startM, endH, endM] = baseShift.split(/[- :]+/).map(Number);
            const plannedMin = parsePlanned(baseShift);

            // Planlanan her zaman eklenir
            plannedTotalMin += plannedMin;

            const scenario = seed % 5;

            if (scenario === 4 && i < 5) {
                // QR okutulmadı — gerçek süre 0
                shifts.push({
                    planned: baseShift,
                    type: 'normal',
                    noQrScan: true,
                });
            } else {
                const lateMinutes = scenario === 1 ? 15 + (seed * 3) % 30 : (seed % 3 === 0 ? 0 : (seed % 5));
                const inTotalMin = startH * 60 + startM + lateMinutes;
                const inH = Math.floor(inTotalMin / 60) % 24;
                const inM = inTotalMin % 60;
                const actualInStr = `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}`;

                const earlyMinutes = scenario === 2 ? 20 + (seed * 2) % 25 : 0;
                const outTotalMin = endH * 60 + endM - earlyMinutes + (seed * 7) % 15;
                const outH = Math.floor(((outTotalMin % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
                const outM = ((outTotalMin % 60) + 60) % 60;
                const actualOutStr = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;

                const hasExit = scenario !== 3 || i > 4;

                if (hasExit) {
                    actualTotalMin += calcActualMinutes(actualInStr, actualOutStr);
                }

                shifts.push({
                    planned: baseShift,
                    actualIn: actualInStr,
                    actualOut: hasExit ? actualOutStr : null,
                    type: 'normal',
                    lateEntry: scenario === 1,
                    earlyExit: scenario === 2,
                });
            }
        }
    }

    const fmtTime = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

    return {
        userId: user.id,
        name: user.name,
        employeeCode: `${String(hash).padStart(5, '0')}-01`,
        department: userDept.label,
        departmentColor: userDept.color,
        position: userPosition,
        totalHours: fmtTime(plannedTotalMin),
        actualTotalHours: fmtTime(actualTotalMin),
        shifts,
    };
}

// --- TimeInput: saat girince otomatik dakikaya geçen custom input ---
function TimeInput({ value, onChange, icon, iconColor, onAdvance, onEnter, hourInputRef }: {
    value: string;
    onChange: (val: string) => void;
    icon: string;
    iconColor: string;
    onAdvance?: () => void;
    onEnter?: () => void;
    hourInputRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
    const [hh, mm] = (value || '').split(':');
    const internalHourRef = useRef<HTMLInputElement | null>(null);
    const minRef = useRef<HTMLInputElement | null>(null);

    const setHourRef = (el: HTMLInputElement | null) => {
        internalHourRef.current = el;
        if (hourInputRef) hourInputRef.current = el;
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 2);
        const num = parseInt(v, 10);
        if (v.length === 2 && num > 23) v = '23';
        onChange(`${v}:${mm || '00'}`);
        if (v.length === 2) {
            minRef.current?.focus();
            minRef.current?.select();
        }
    };

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 2);
        const num = parseInt(v, 10);
        if (v.length === 2 && num > 59) v = '59';
        onChange(`${hh || '00'}:${v}`);
        if (v.length === 2 && onAdvance) {
            onAdvance();
        }
    };

    const handleHourKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ':' || e.key === 'ArrowRight') {
            e.preventDefault();
            minRef.current?.focus();
            minRef.current?.select();
        }
        if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
        }
    };

    const handleMinKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && (mm === '' || mm === '00')) {
            e.preventDefault();
            internalHourRef.current?.focus();
            internalHourRef.current?.select();
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            internalHourRef.current?.focus();
            internalHourRef.current?.select();
        }
        if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
        }
    };

    return (
        <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2.5 gap-1 focus-within:border-[#663259] focus-within:ring-1 focus-within:ring-[#663259]/20 transition-all">
            <span className={`material-symbols-outlined ${iconColor} text-[16px] shrink-0`}>{icon}</span>
            <input
                ref={setHourRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={hh || ''}
                onChange={handleHourChange}
                onKeyDown={handleHourKeyDown}
                onFocus={e => e.target.select()}
                placeholder="00"
                className="w-7 text-center text-sm font-medium text-gray-700 outline-none bg-transparent"
            />
            <span className="text-gray-400 font-bold">:</span>
            <input
                ref={minRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={mm || ''}
                onChange={handleMinChange}
                onKeyDown={handleMinKeyDown}
                onFocus={e => e.target.select()}
                placeholder="00"
                className="w-7 text-center text-sm font-medium text-gray-700 outline-none bg-transparent"
            />
        </div>
    );
}

const ITEMS_PER_PAGE = 10;

// --- Component ---
const ShiftPlan: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toggleFavorite, isFavorite } = useFavoritesStore();
    const pageInfo = getPageInfo(location.pathname);
    const isFav = pageInfo ? isFavorite(location.pathname) : false;
    const handleToggleFavorite = () => { if (pageInfo) toggleFavorite({ path: location.pathname, ...pageInfo }); };

    const { users, fetchUsers } = useUserStore();
    const { departments: configDepartments, positions: configPositions } = usePersonnelConfigStore();
    const { definitions: shiftDefinitions } = useShiftDefinitionStore();

    const deptMap = useMemo(() => {
        const map: Record<string, { name: string; color: string }> = {};
        configDepartments.forEach(d => { map[d.id] = { name: d.name, color: d.color }; });
        return map;
    }, [configDepartments]);

    const positionNames = useMemo(() => configPositions.map(p => p.name), [configPositions]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState<string>('');
    const [filterPosition, setFilterPosition] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showCopyModal, setShowCopyModal] = useState(false);

    // Shift overrides: userId-dayIdx → override entry
    const [shiftOverrides, setShiftOverrides] = useState<Record<string, ShiftEntry>>({});

    // Shift assignment modal state
    const [assignModal, setAssignModal] = useState<{ userId: string; dayIdx: number; personName: string; currentShift: ShiftEntry } | null>(null);
    const [assignMode, setAssignMode] = useState<'work' | 'off'>('work');
    const [assignShiftId, setAssignShiftId] = useState<string | null>(null);
    const [manualIn, setManualIn] = useState('');
    const [manualOut, setManualOut] = useState('');
    const outHourRef = useRef<HTMLInputElement>(null);

    useEscapeKey(() => setAssignModal(null), !!assignModal);

    useEffect(() => { fetchUsers(); }, []);

    const today = useMemo(() => new Date(), []);
    const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(currentDate), [currentDate]);
    const weekNum = useMemo(() => getWeekNumber(weekStart), [weekStart]);

    const weekDays = useMemo(() => {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push(d);
        }
        return days;
    }, [weekStart]);

    const activeUsers = useMemo(() => users.filter(u => u.active !== false), [users]);

    const baseShifts = useMemo(
        () => activeUsers.map(u => generateMockShifts(u, weekStart, deptMap, positionNames)),
        [activeUsers, weekStart, deptMap, positionNames]
    );

    // Override'ları uygula ve toplamları yeniden hesapla
    const personnelShifts = useMemo(() => {
        const parsePlanned = (s: string): number => {
            const [sH, sM, eH, eM] = s.split(/[- :]+/).map(Number);
            let diff = (eH * 60 + eM) - (sH * 60 + sM);
            if (diff <= 0) diff += 24 * 60;
            return diff;
        };
        const calcActualMin = (inStr: string, outStr: string): number => {
            const [inH, inM] = inStr.split(':').map(Number);
            const [outH, outM] = outStr.split(':').map(Number);
            let diff = (outH * 60 + outM) - (inH * 60 + inM);
            if (diff <= 0) diff += 24 * 60;
            return diff;
        };
        const fmtTime = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

        return baseShifts.map(person => {
            let hasOverride = false;
            const mergedShifts = person.shifts.map((shift, dayIdx) => {
                const key = `${person.userId}-${dayIdx}`;
                if (shiftOverrides[key]) {
                    hasOverride = true;
                    return shiftOverrides[key];
                }
                return shift;
            });

            if (!hasOverride) return person;

            // Toplamları yeniden hesapla
            let plannedMin = 0;
            let actualMin = 0;
            for (const s of mergedShifts) {
                if (s.type === 'normal' && s.planned) {
                    plannedMin += parsePlanned(s.planned);
                    if (s.actualIn && s.actualOut) {
                        actualMin += calcActualMin(s.actualIn, s.actualOut);
                    }
                }
            }

            return {
                ...person,
                shifts: mergedShifts,
                totalHours: fmtTime(plannedMin),
                actualTotalHours: fmtTime(actualMin),
            };
        });
    }, [baseShifts, shiftOverrides]);

    const filteredShifts = useMemo(() => {
        let result = personnelShifts;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.employeeCode.includes(q) ||
                p.department.toLowerCase().includes(q)
            );
        }
        if (filterDept) {
            result = result.filter(p => p.department === filterDept);
        }
        if (filterPosition) {
            result = result.filter(p => p.position === filterPosition);
        }
        return result;
    }, [personnelShifts, searchQuery, filterDept, filterPosition]);

    const totalPages = Math.ceil(filteredShifts.length / ITEMS_PER_PAGE);
    const paginatedShifts = filteredShifts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const departmentOptions = useMemo(() => [
        { value: '', label: 'Tüm Departmanlar' },
        ...configDepartments.map(d => ({ value: d.name, label: d.name })),
    ], [configDepartments]);

    const positionOptions = useMemo(() => [
        { value: '', label: 'Tüm Pozisyonlar' },
        ...configPositions.map(p => ({ value: p.name, label: p.name })),
    ], [configPositions]);

    const navigateWeek = (direction: -1 | 1) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + direction * 7);
        setCurrentDate(d);
        setCurrentPage(1);
    };

    const goToday = () => {
        setCurrentDate(new Date());
        setCurrentPage(1);
    };

    // Sonraki hafta tarih aralığı
    const nextWeekStart = useMemo(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        return d;
    }, [weekStart]);
    const nextWeekEnd = useMemo(() => {
        const d = new Date(nextWeekStart);
        d.setDate(d.getDate() + 6);
        return d;
    }, [nextWeekStart]);

    const handleCopyPlan = () => {
        setCurrentDate(nextWeekStart);
        setCurrentPage(1);
        setShowCopyModal(false);
    };

    const openAssignModal = (userId: string, dayIdx: number, personName: string, currentShift: ShiftEntry) => {
        setAssignModal({ userId, dayIdx, personName, currentShift });
        setAssignMode(currentShift.type === 'off' ? 'off' : 'work');
        // Try to match current planned shift to a definition
        if (currentShift.planned) {
            const match = shiftDefinitions.find(d => `${d.startTime} - ${d.endTime}` === currentShift.planned);
            setAssignShiftId(match ? match.id : null);
        } else {
            setAssignShiftId(null);
        }
        // Mevcut giriş/çıkış saatlerini doldur
        setManualIn(currentShift.actualIn || '');
        setManualOut(currentShift.actualOut || '');
    };

    const handleAssignSave = () => {
        if (!assignModal) return;
        const key = `${assignModal.userId}-${assignModal.dayIdx}`;

        if (assignMode === 'off') {
            setShiftOverrides(prev => ({
                ...prev,
                [key]: { planned: null, type: 'off' },
            }));
        } else if (assignShiftId) {
            const def = shiftDefinitions.find(d => d.id === assignShiftId);
            if (def) {
                const trimIn = manualIn.trim();
                const trimOut = manualOut.trim();
                setShiftOverrides(prev => ({
                    ...prev,
                    [key]: {
                        planned: `${def.startTime} - ${def.endTime}`,
                        type: 'normal',
                        actualIn: trimIn || null,
                        actualOut: trimOut || null,
                        noQrScan: false,
                    },
                }));
            }
        } else {
            setShiftOverrides(prev => ({
                ...prev,
                [key]: { planned: null, type: 'undefined' },
            }));
        }

        setAssignModal(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-3">
                {/* Gradient Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        {/* Sol: Geri + İkon + Başlık */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0"
                                >
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">calendar_month</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-white leading-tight">Vardiya Planı</h1>
                                    {pageInfo && (
                                        <button
                                            onClick={handleToggleFavorite}
                                            className={`w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-125 active:scale-95 ${isFav ? 'text-amber-400' : 'text-white/40 hover:text-amber-400'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{isFav ? 'star' : 'star_border'}</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-white/60 text-xs mt-0.5">
                                    {weekNum}. Hafta &middot; {formatDateShort(weekStart)} - {formatDateShort(weekEnd)} &middot; {activeUsers.length} personel
                                </p>
                            </div>
                        </div>

                        {/* Sağ: Arama + Hafta Nav + Butonlar */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* Arama */}
                            <div className="flex items-center h-10 bg-white/10 rounded-xl px-3 border border-white/15">
                                <Search className="text-white/50" size={15} />
                                <input
                                    type="text"
                                    placeholder="Personel ara..."
                                    className="px-2 text-sm font-medium text-white placeholder-white/40 outline-none bg-transparent w-40"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                />
                            </div>

                            {/* Hafta Navigasyonu */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => navigateWeek(-1)}
                                    className="w-10 h-10 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={goToday}
                                    className="h-10 flex items-center gap-1.5 px-3 bg-white/10 border border-white/15 rounded-lg text-xs font-bold text-white/80 hover:bg-white/20 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                    [ {formatDateShort(weekStart)} - {formatDateShort(weekEnd)} ]
                                </button>
                                <button
                                    onClick={() => navigateWeek(1)}
                                    className="w-10 h-10 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Vardiyalar */}
                            <button
                                onClick={() => navigate('/personnel/shift-definitions')}
                                className="h-10 flex items-center gap-1.5 px-3 bg-white/10 border border-white/15 hover:bg-white/20 text-white/80 rounded-xl text-sm font-bold transition-all"
                            >
                                <span className="material-symbols-outlined text-[16px]">event_note</span>
                                Vardiyalar
                            </button>

                            {/* Excel */}
                            <button className="h-10 flex items-center gap-1.5 px-3 bg-white/10 border border-white/15 hover:bg-white/20 text-white/80 rounded-xl text-sm font-medium transition-all">
                                <Download size={15} />
                                Excel
                            </button>

                            {/* Planı Kopyala */}
                            <button
                                onClick={() => setShowCopyModal(true)}
                                className="w-10 h-10 bg-white/10 border border-white/15 hover:bg-white/20 text-white/70 rounded-lg transition-colors flex items-center justify-center"
                                title="Planı Kopyala"
                            >
                                <Copy size={16} />
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-52">
                        <CustomSelect
                            options={departmentOptions}
                            value={filterDept}
                            onChange={(v: string) => { setFilterDept(v); setCurrentPage(1); }}
                            placeholder="Tüm Departmanlar"
                            searchPlaceholder="Departman ara..."
                            icon="apartment"
                            accentColor="#663259"
                        />
                    </div>
                    <div className="w-52">
                        <CustomSelect
                            options={positionOptions}
                            value={filterPosition}
                            onChange={(v: string) => { setFilterPosition(v); setCurrentPage(1); }}
                            placeholder="Tüm Pozisyonlar"
                            searchPlaceholder="Pozisyon ara..."
                            icon="badge"
                            accentColor="#663259"
                        />
                    </div>
                    {(filterDept || filterPosition) && (
                        <button
                            onClick={() => { setFilterDept(''); setFilterPosition(''); setCurrentPage(1); }}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                            Filtreleri Temizle
                        </button>
                    )}
                    <span className="ml-auto text-xs font-medium text-gray-400">
                        {filteredShifts.length} / {personnelShifts.length} personel
                    </span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[1100px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[220px]">Personel Ad-Soyad</th>
                                    <th className="px-3 py-3 text-center w-20">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top.</span>
                                            <span className="text-[9px] text-gray-300 font-medium">Plan / Fiili</span>
                                        </div>
                                    </th>
                                    {weekDays.map((day, i) => {
                                        const isToday = isSameDay(day, today);
                                        return (
                                            <th
                                                key={i}
                                                className={`px-2 py-3 text-center min-w-[130px] ${
                                                    isToday ? 'bg-[#663259]/5' : ''
                                                }`}
                                            >
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {formatDateDay(day)}
                                                </div>
                                                <div className={`text-xs font-black uppercase ${isToday ? 'text-[#663259]' : 'text-gray-600'}`}>
                                                    {DAY_NAMES[i]}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedShifts.length > 0 ? (
                                    paginatedShifts.map((person, idx) => (
                                        <tr key={person.userId} className="hover:bg-gray-50/50 transition-colors group">
                                            {/* Row # */}
                                            <td className="px-3 py-3 text-center text-sm font-bold text-gray-300">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            </td>

                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm">
                                                            {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                                            style={{ backgroundColor: person.departmentColor }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-gray-800">{person.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-medium">- [{person.employeeCode}]</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <span
                                                                    className="w-1.5 h-1.5 rounded-full"
                                                                    style={{ backgroundColor: person.departmentColor }}
                                                                />
                                                                <span className="text-xs font-medium" style={{ color: person.departmentColor }}>
                                                                    {person.department}
                                                                </span>
                                                            </div>
                                                            <span className="text-gray-300">·</span>
                                                            <span className="text-xs text-gray-500">{person.position}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Total Hours */}
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-sm font-black text-gray-700">{person.totalHours}</span>
                                                    <span className="text-[10px] font-medium text-[#663259]/70">{person.actualTotalHours}</span>
                                                </div>
                                            </td>

                                            {/* Day Cells */}
                                            {person.shifts.map((shift, dayIdx) => {
                                                const isToday = isSameDay(weekDays[dayIdx], today);
                                                return (
                                                    <td
                                                        key={dayIdx}
                                                        className={`px-2 py-3 text-center cursor-pointer hover:bg-[#663259]/[0.06] transition-colors ${
                                                            isToday ? 'bg-[#663259]/[0.03]' : ''
                                                        }`}
                                                        onClick={() => openAssignModal(person.userId, dayIdx, person.name, shift)}
                                                    >
                                                        {shift.type === 'off' ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className="text-xs font-bold text-red-400">Hafta Tatili</span>
                                                            </div>
                                                        ) : shift.type === 'undefined' ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className="text-xs font-bold text-orange-500">Tanımsız Vardiya</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                {/* Planlanan vardiya saati */}
                                                                <span className="text-xs font-bold text-emerald-600">
                                                                    [ {shift.planned} ]
                                                                </span>

                                                                {/* QR Okutulmadı */}
                                                                {shift.noQrScan ? (
                                                                    <div className="flex items-center gap-1 bg-red-50 rounded-full px-2 py-0.5">
                                                                        <span className="material-symbols-outlined text-red-400 text-[13px]">qr_code_2</span>
                                                                        <span className="text-[10px] font-bold text-red-400">QR Okutulmadı</span>
                                                                    </div>
                                                                ) : shift.actualIn ? (
                                                                    <div className="flex items-center gap-1">
                                                                        {/* Tolerans ihlali ikonu */}
                                                                        {(shift.lateEntry || shift.earlyExit) && (
                                                                            <span
                                                                                className={`material-symbols-outlined text-[13px] ${
                                                                                    shift.lateEntry ? 'text-amber-500' : 'text-orange-500'
                                                                                }`}
                                                                                title={shift.lateEntry ? 'Geç giriş' : 'Erken çıkış'}
                                                                            >
                                                                                {shift.lateEntry ? 'schedule' : 'logout'}
                                                                            </span>
                                                                        )}
                                                                        <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                                                                            shift.lateEntry || shift.earlyExit
                                                                                ? 'bg-amber-50 text-amber-600'
                                                                                : 'bg-[#663259]/[0.06] text-[#663259]'
                                                                        }`}>
                                                                            {shift.actualIn}{' | '}{shift.actualOut || ''}
                                                                        </span>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-[48px] opacity-30">group_off</span>
                                                <p className="font-medium">Personel bulunamadı</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                        <span className="text-sm text-gray-500 font-medium">
                            Toplam Kayıt: <span className="font-bold text-gray-700">{filteredShifts.length}</span>
                        </span>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                                            currentPage === page
                                                ? 'bg-[#663259] text-white shadow-md'
                                                : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Vardiya Atama Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#663259] text-[20px]">edit_calendar</span>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-800">{assignModal.personName}</h2>
                                    <p className="text-xs text-gray-400">
                                        {DAY_NAMES[assignModal.dayIdx]} — {formatDateDay(weekDays[assignModal.dayIdx])}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {/* Mesai / Tatil Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hafta Tatili / Mesai Günü</label>
                                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => setAssignMode('work')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-all ${
                                            assignMode === 'work'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">check_box</span>
                                        Mesai Günü
                                    </button>
                                    <button
                                        onClick={() => { setAssignMode('off'); setAssignShiftId(null); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-all ${
                                            assignMode === 'off'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">disabled_by_default</span>
                                        Hafta Tatili
                                    </button>
                                </div>
                            </div>

                            {/* Shift List */}
                            {assignMode === 'work' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Atanan Vardiya</label>
                                    <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                                        {/* No shift option */}
                                        <button
                                            onClick={() => setAssignShiftId(null)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                assignShiftId === null ? 'bg-[#663259]/[0.04]' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                assignShiftId === null ? 'border-[#663259]' : 'border-gray-300'
                                            }`}>
                                                {assignShiftId === null && <div className="w-2.5 h-2.5 rounded-full bg-[#663259]" />}
                                            </div>
                                            <span className={`text-sm ${assignShiftId === null ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
                                                Özel Vardiya Ataması Yok
                                            </span>
                                        </button>

                                        {/* Defined shifts */}
                                        {shiftDefinitions.map(def => (
                                            <button
                                                key={def.id}
                                                onClick={() => setAssignShiftId(def.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                    assignShiftId === def.id ? 'bg-[#663259]/[0.04]' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    assignShiftId === def.id ? 'border-[#663259]' : 'border-gray-300'
                                                }`}>
                                                    {assignShiftId === def.id && <div className="w-2.5 h-2.5 rounded-full bg-[#663259]" />}
                                                </div>
                                                <span className={`text-sm ${assignShiftId === def.id ? 'font-bold text-gray-800' : 'font-medium text-gray-600'}`}>
                                                    [{def.startTime}-{def.endTime}] {def.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Manuel Giriş/Çıkış Saati */}
                            {assignMode === 'work' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Giriş / Çıkış Saati
                                        {assignModal.currentShift.noQrScan && (
                                            <span className="ml-2 text-[10px] font-bold text-red-400 bg-red-50 rounded-full px-2 py-0.5 normal-case tracking-normal">
                                                QR Okutulmadı
                                            </span>
                                        )}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <TimeInput
                                            value={manualIn}
                                            onChange={setManualIn}
                                            icon="login"
                                            iconColor="text-emerald-500"
                                            onAdvance={() => { outHourRef.current?.focus(); outHourRef.current?.select(); }}
                                            onEnter={handleAssignSave}
                                        />
                                        <span className="text-gray-300 font-bold text-lg">—</span>
                                        <TimeInput
                                            value={manualOut}
                                            onChange={setManualOut}
                                            icon="logout"
                                            iconColor="text-red-400"
                                            hourInputRef={outHourRef}
                                            onEnter={handleAssignSave}
                                        />
                                    </div>
                                    {manualIn && !manualOut && (
                                        <p className="text-[10px] text-amber-500 font-medium mt-1.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">info</span>
                                            Çıkış saati girilmedi — mesai devam ediyor olarak kaydedilecek
                                        </p>
                                    )}
                                </div>
                            )}

                            {assignMode === 'off' && (
                                <div className="flex flex-col items-center py-6 text-center">
                                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-red-400 text-[28px]">event_busy</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-700">Bu gün hafta tatili olarak işaretlenecek</p>
                                    <p className="text-xs text-gray-400 mt-1">Personele vardiya atanmayacak</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                            <button
                                onClick={() => setAssignModal(null)}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleAssignSave}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#663259] hover:bg-[#7a3d6d] text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">save</span>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Planı Kopyala Modal */}
            {showCopyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCopyModal(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#663259] text-[22px]">content_copy</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Planı Kopyala</h2>
                                    <p className="text-xs text-gray-400">Haftalık vardiya planını ileri taşı</p>
                                </div>
                            </div>
                        </div>

                        {/* Flow Cards */}
                        <div className="px-6 pb-5">
                            <div className="flex flex-col items-center gap-2">
                                {/* Source Week */}
                                <div className="w-full rounded-xl border border-[#663259]/15 bg-[#663259]/[0.03] p-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-[#663259]/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[#663259] text-[18px]">date_range</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-[#663259]/60 uppercase tracking-wider">Kaynak Hafta</p>
                                            <p className="text-sm font-bold text-gray-800">{formatDateShort(weekStart)} — {formatDateShort(weekEnd)}</p>
                                        </div>
                                        <span className="text-xs font-bold text-[#663259]/50 bg-[#663259]/10 px-2 py-0.5 rounded-md">{weekNum}. Hafta</span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">arrow_downward</span>
                                    </div>
                                </div>

                                {/* Target Week */}
                                <div className="w-full rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-emerald-600 text-[18px]">event_upcoming</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider">Hedef Hafta</p>
                                            <p className="text-sm font-bold text-gray-800">{formatDateShort(nextWeekStart)} — {formatDateShort(nextWeekEnd)}</p>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600/50 bg-emerald-100 px-2 py-0.5 rounded-md">{weekNum + 1}. Hafta</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2.5">
                                <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5 shrink-0">warning</span>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Hedef haftada mevcut bir plan varsa <span className="font-bold">üzerine yazılacaktır.</span>
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleCopyPlan}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#663259] hover:bg-[#7a3d6d] text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                Planı Kopyala
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftPlan;
