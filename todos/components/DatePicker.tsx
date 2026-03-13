import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: string;
    compact?: boolean;
    max?: string;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTH_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAY_NAMES = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

type PickerView = 'days' | 'months' | 'years';

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = 'gg.aa.yyyy',
    icon = 'calendar_today',
    compact = false,
    max,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00') : new Date());
    const [pickerView, setPickerView] = useState<PickerView>('days');
    const [yearPageStart, setYearPageStart] = useState(() => {
        const y = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear();
        return Math.floor(y / 20) * 20;
    });
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [inputText, setInputText] = useState('');
    const triggerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // value → inputText sync
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setInputText(`${d}.${m}.${y}`);
            setViewDate(new Date(value + 'T00:00:00'));
        } else {
            setInputText('');
        }
    }, [value]);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const calendarHeight = 400;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < calendarHeight;

        setDropdownStyle({
            position: 'fixed',
            width: 280,
            left: Math.min(rect.left, window.innerWidth - 290),
            zIndex: 9999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
        });
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setPickerView('days');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleScroll = () => updatePosition();
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen, updatePosition]);

    const openCalendar = () => {
        if (!isOpen) {
            updatePosition();
            setPickerView('days');
        }
        setIsOpen(true);
    };

    /* ─── Klavye girişi: dd.mm.yyyy ─── */
    const handleInputChange = (raw: string) => {
        let digits = raw.replace(/[^\d]/g, '');
        if (digits.length > 8) digits = digits.slice(0, 8);

        let formatted = '';
        for (let i = 0; i < digits.length; i++) {
            if (i === 2 || i === 4) formatted += '.';
            formatted += digits[i];
        }
        setInputText(formatted);

        if (digits.length >= 6) {
            const yearStr = digits.slice(4);
            const yearNum = parseInt(yearStr, 10);
            const monthNum = parseInt(digits.slice(2, 4), 10) - 1;
            if (yearStr.length === 4 && yearNum >= 1900 && yearNum <= 2100) {
                setViewDate(new Date(yearNum, monthNum >= 0 && monthNum <= 11 ? monthNum : 0, 1));
            } else if (yearStr.length >= 2) {
                const partialYear = yearStr.length === 2 ? yearNum * 100 : yearStr.length === 3 ? yearNum * 10 : yearNum;
                if (partialYear >= 1900 && partialYear <= 2100) {
                    setViewDate(new Date(partialYear, monthNum >= 0 && monthNum <= 11 ? monthNum : 0, 1));
                }
            }
        }

        if (digits.length === 8) {
            const day = parseInt(digits.slice(0, 2), 10);
            const mon = parseInt(digits.slice(2, 4), 10);
            const yr = parseInt(digits.slice(4, 8), 10);
            if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12 && yr >= 1900 && yr <= 2100) {
                const dateStr = `${yr}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (!max || dateStr <= max) {
                    onChange(dateStr);
                    setViewDate(new Date(yr, mon - 1, 1));
                }
            }
        }
    };

    const handleInputFocus = () => {
        openCalendar();
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setPickerView('days');
            inputRef.current?.blur();
        }
        if (e.key === 'Backspace' && inputText.length > 0) {
            const newVal = inputText.endsWith('.')
                ? inputText.slice(0, -2)
                : inputText.slice(0, -1);
            e.preventDefault();
            handleInputChange(newVal);
        }
    };

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const prevMonthDays = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const maxYear = max ? parseInt(max.split('-')[0], 10) : 2100;

    const makeStr = (y: number, m: number, d: number) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const selectDay = (day: number) => {
        const dateStr = makeStr(year, month, day);
        onChange(dateStr);
        setIsOpen(false);
        setPickerView('days');
    };

    /* ─── Yıl seçici ─── */
    const selectYear = (y: number) => {
        setViewDate(new Date(y, month, 1));
        setPickerView('months');
    };

    const selectMonth = (m: number) => {
        setViewDate(new Date(year, m, 1));
        setPickerView('days');
    };

    const handleHeaderClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pickerView === 'days') {
            setYearPageStart(Math.floor(year / 20) * 20);
            setPickerView('years');
        } else if (pickerView === 'months') {
            setYearPageStart(Math.floor(year / 20) * 20);
            setPickerView('years');
        } else {
            setPickerView('days');
        }
    };

    const cells: { day: number; current: boolean }[] = [];
    for (let i = 0; i < startDay; i++) {
        cells.push({ day: prevMonthDays - startDay + i + 1, current: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({ day: i, current: true });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, current: false });
    }

    /* ─── Yıl grid'i (20 yıl/sayfa) ─── */
    const yearGrid = Array.from({ length: 20 }, (_, i) => yearPageStart + i);

    /* ─── Render: takvim dropdown içeriği ─── */
    const renderHeader = () => {
        if (pickerView === 'years') {
            return (
                <div className="flex items-center justify-between px-3 py-3">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setYearPageStart(p => p - 20); }}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">chevron_left</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleHeaderClick}
                        className="text-sm font-black text-[#663259] tracking-tight hover:bg-[#663259]/10 px-3 py-1 rounded-lg transition-colors"
                    >
                        {yearPageStart} – {yearPageStart + 19}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setYearPageStart(p => p + 20); }}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                    </button>
                </div>
            );
        }
        if (pickerView === 'months') {
            return (
                <div className="flex items-center justify-between px-3 py-3">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year - 1, month, 1)); }}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">chevron_left</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleHeaderClick}
                        className="text-sm font-black text-[#663259] tracking-tight hover:bg-[#663259]/10 px-3 py-1 rounded-lg transition-colors"
                    >
                        {year}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year + 1, month, 1)); }}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                    </button>
                </div>
            );
        }
        // days
        return (
            <div className="flex items-center justify-between px-3 py-3">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); }}
                    className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400 text-lg">chevron_left</span>
                </button>
                <button
                    type="button"
                    onClick={handleHeaderClick}
                    className="text-sm font-black text-[#663259] tracking-tight hover:bg-[#663259]/10 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                    {MONTH_NAMES[month]} {year}
                    <span className="material-symbols-outlined text-[14px] text-[#663259]/50">unfold_more</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); }}
                    className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                </button>
            </div>
        );
    };

    const renderBody = () => {
        /* ─── YIL SEÇİCİ ─── */
        if (pickerView === 'years') {
            return (
                <div className="grid grid-cols-4 gap-1.5 px-3 pb-3">
                    {yearGrid.map(y => {
                        const isCurrent = y === year;
                        const isDisabled = y > maxYear;
                        return (
                            <button
                                key={y}
                                type="button"
                                disabled={isDisabled}
                                onClick={(e) => { e.stopPropagation(); if (!isDisabled) selectYear(y); }}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isCurrent
                                        ? 'bg-[#663259] text-white shadow-md shadow-[#663259]/25'
                                        : isDisabled
                                            ? 'text-gray-200 cursor-default'
                                            : 'text-gray-600 hover:bg-[#663259]/10 hover:text-[#663259] active:scale-95'
                                }`}
                            >
                                {y}
                            </button>
                        );
                    })}
                </div>
            );
        }

        /* ─── AY SEÇİCİ ─── */
        if (pickerView === 'months') {
            return (
                <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                    {MONTH_SHORT.map((m, i) => {
                        const isCurrent = i === month && year === viewDate.getFullYear();
                        const monthMax = max ? `${year}-${String(i + 1).padStart(2, '0')}` : null;
                        const maxMonth = max ? max.slice(0, 7) : null;
                        const isDisabled = monthMax && maxMonth ? monthMax > maxMonth : false;
                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={!!isDisabled}
                                onClick={(e) => { e.stopPropagation(); if (!isDisabled) selectMonth(i); }}
                                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                                    isCurrent
                                        ? 'bg-[#663259] text-white shadow-md shadow-[#663259]/25'
                                        : isDisabled
                                            ? 'text-gray-200 cursor-default'
                                            : 'text-gray-600 hover:bg-[#663259]/10 hover:text-[#663259] active:scale-95'
                                }`}
                            >
                                {m}
                            </button>
                        );
                    })}
                </div>
            );
        }

        /* ─── GÜN SEÇİCİ ─── */
        return (
            <>
                <div className="grid grid-cols-7 px-3">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-wider py-1.5">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 px-3 pb-2 gap-0.5">
                    {cells.map((cell, i) => {
                        const dateStr = cell.current ? makeStr(year, month, cell.day) : '';
                        const isSelected = cell.current && dateStr === value;
                        const isToday = cell.current && dateStr === todayStr;
                        const isDisabled = !cell.current || (max && dateStr > max);

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (!isDisabled) selectDay(cell.day); }}
                                disabled={!!isDisabled}
                                className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${
                                    isSelected
                                        ? 'bg-[#663259] text-white shadow-md shadow-[#663259]/25'
                                        : isToday
                                            ? 'bg-[#663259]/10 text-[#663259] font-black ring-1 ring-[#663259]/20'
                                            : isDisabled
                                                ? 'text-gray-200 cursor-default'
                                                : 'text-gray-600 hover:bg-gray-100 active:scale-90'
                                }`}
                            >
                                {cell.day}
                            </button>
                        );
                    })}
                </div>
            </>
        );
    };

    const calendar = isOpen ? ReactDOM.createPortal(
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden animate-in fade-in duration-150"
        >
            {renderHeader()}
            {renderBody()}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); setPickerView('days'); }}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                    Temizle
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(todayStr); setViewDate(new Date()); setIsOpen(false); setPickerView('days'); }}
                    className="text-[10px] font-black text-[#663259] uppercase tracking-widest hover:text-[#4a2340] transition-colors px-2 py-1 rounded-lg hover:bg-[#663259]/10"
                >
                    Bugün
                </button>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative" ref={triggerRef}>
            <div
                onClick={() => { inputRef.current?.focus(); openCalendar(); }}
                className={`flex items-center gap-2 transition-all cursor-text ${
                    compact
                        ? 'pl-2.5 pr-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus-within:border-[#663259] focus-within:ring-2 focus-within:ring-[#663259]/15 w-[140px]'
                        : 'pl-3 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:border-gray-200 focus-within:bg-white focus-within:border-[#663259]/30 focus-within:ring-2 focus-within:ring-[#663259]/10 w-full'
                }`}
            >
                {compact ? (
                    <span className={`material-symbols-outlined shrink-0 text-[16px] ${value ? 'text-[#663259]' : 'text-gray-400'}`}>{icon}</span>
                ) : (
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${value ? 'bg-[#663259]/15' : 'bg-[#663259]/10'}`}>
                        <span className="material-symbols-outlined text-[#663259] text-[16px]">{icon}</span>
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={handleInputKeyDown}
                    placeholder={placeholder}
                    className={`bg-transparent outline-none w-full ${
                        value
                            ? (compact ? 'text-xs font-bold text-gray-700' : 'text-sm font-bold text-gray-700')
                            : (compact ? 'text-xs font-medium text-gray-400' : 'text-sm font-medium text-gray-400')
                    } placeholder:text-gray-400 placeholder:font-medium`}
                    maxLength={10}
                    autoComplete="off"
                />
                <span
                    className="material-symbols-outlined shrink-0 text-[16px] text-gray-300 hover:text-[#663259] transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); openCalendar(); }}
                >
                    expand_more
                </span>
            </div>
            {calendar}
        </div>
    );
};

export default DatePicker;
