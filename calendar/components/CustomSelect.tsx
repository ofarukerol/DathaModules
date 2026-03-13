import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    icon?: string;
    subtitle?: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    icon?: React.ReactNode;
    accentColor?: string;
    alwaysSearch?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    disabled = false,
    className = '',
    placeholder = 'Seçiniz...',
    searchPlaceholder = 'Ara...',
    icon,
    accentColor,
    alwaysSearch = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLocaleLowerCase('tr');
        return options.filter(o =>
            o.label.toLocaleLowerCase('tr').includes(q) ||
            o.subtitle?.toLocaleLowerCase('tr').includes(q)
        );
    }, [options, search]);

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < 260;

        setDropdownStyle({
            position: 'fixed',
            minWidth: Math.max(rect.width, 100),
            width: Math.max(rect.width, 100),
            left: rect.left,
            zIndex: 9999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
        });
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            updatePosition();
            setSearch('');
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch('');
        }
    };

    const selected = options.find(o => o.value === value);

    const accent = accentColor || '#663259';

    const dropdown = isOpen ? ReactDOM.createPortal(
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-200/50 overflow-hidden animate-in fade-in duration-150"
        >
            {(alwaysSearch || options.length > 5) && (
                <div className="p-2 border-b border-gray-100">
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-semibold text-gray-800 placeholder-gray-400 focus:border-gray-300"
                        placeholder={searchPlaceholder}
                    />
                </div>
            )}
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                            option.value === value
                                ? 'bg-gray-50 text-gray-800'
                                : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {option.icon && (
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                option.value === value ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'
                            }`}
                            style={option.value === value ? { backgroundColor: accent + '15', color: accent } : {}}>
                                <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${option.value === value ? 'font-bold' : 'font-medium'}`}>
                                {option.label}
                            </p>
                            {option.subtitle && (
                                <p className="text-[11px] text-gray-400 font-medium truncate mt-px">{option.subtitle}</p>
                            )}
                        </div>
                        {option.value === value && (
                            <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />
                        )}
                    </button>
                )) : (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center font-medium">Sonuç bulunamadı</div>
                )}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border rounded-2xl text-left transition-all hover:bg-gray-100 ${
                    disabled
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                        : isOpen
                            ? 'border-gray-300 ring-2 ring-gray-200'
                            : 'border-gray-100'
                }`}
            >
                {icon && !selected?.icon && (
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                        {typeof icon === 'string'
                            ? <span className="material-symbols-outlined text-[16px]">{icon}</span>
                            : icon}
                    </div>
                )}
                {selected?.icon && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: accent + '15', color: accent }}>
                        <span className="material-symbols-outlined text-[16px]">{selected.icon}</span>
                    </div>
                )}
                <span className={`text-sm flex-1 truncate ${selected ? 'font-bold text-gray-800' : 'font-medium text-gray-400'}`}>
                    {selected?.label || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdown}
        </div>
    );
};

export default CustomSelect;
