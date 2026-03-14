import React, { useState, useEffect, useRef } from 'react';
import { ULKELER, ILLER_TR, getIlceler, getMahallelerAsync, sortByHistory } from '../data/turkeyGeo';
import { useAddressPrefsStore } from '../addressPrefsStore';

// ─── AddressSelect (iç bileşen) ─────────────────────────────────────────────

interface AddressSelectProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    recentCount?: number;
}

const AddressSelect: React.FC<AddressSelectProps> = ({
    label, value, onChange, options, placeholder = 'Yazın veya seçin...', disabled, loading, recentCount = 0,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setSearch(value); }, [value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = options.filter(o =>
        o.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
    );

    const handleFocus = () => {
        if (!disabled) {
            setOpen(true);
            setTimeout(() => inputRef.current?.select(), 10);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        onChange(e.target.value);
        setOpen(true);
    };

    const handleSelect = (opt: string) => {
        setSearch(opt);
        onChange(opt);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length > 0) handleSelect(filtered[0]);
            else setOpen(false);
        } else if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'ArrowDown' && filtered.length > 0) {
            e.preventDefault();
        }
    };

    const effectivePlaceholder = loading ? 'Yükleniyor...' : placeholder;

    return (
        <div ref={containerRef} className="relative flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={effectivePlaceholder}
                    disabled={disabled || loading}
                    autoComplete="off"
                    className={`w-full px-3 py-2 bg-white border rounded-xl text-sm transition-all outline-none
                        ${disabled || loading ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-gray-300 focus:border-[#663259] focus:ring-2 focus:ring-[#663259]/15'}`}
                />
                {loading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#663259] rounded-full animate-spin" />
                    </div>
                )}
                {!loading && options.length > 0 && !disabled && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 10); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <span className={`material-symbols-outlined text-[18px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                )}
            </div>
            {open && filtered.length > 0 && (
                <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-44 overflow-y-auto custom-scrollbar">
                    {recentCount > 0 && filtered.slice(0, recentCount).length > 0 && (
                        <div className="px-3 pt-2 pb-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Son Kullanılan</span>
                        </div>
                    )}
                    {filtered.map((opt, idx) => (
                        <React.Fragment key={opt}>
                            {recentCount > 0 && idx === recentCount && filtered.length > recentCount && (
                                <div className="border-t border-gray-100 px-3 pt-2 pb-1">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tümü</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onMouseDown={() => handleSelect(opt)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${opt === value ? 'font-bold text-[#663259] bg-[#663259]/5' : 'text-gray-700'}`}
                            >
                                {opt === value && <span className="material-symbols-outlined text-[12px] mr-1.5 align-middle text-[#663259]">check</span>}
                                {opt}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── AddressFields (ana bileşen) ────────────────────────────────────────────

interface AddressFieldsProps {
    values: {
        ulke: string;
        il: string;
        ilce: string;
        mahalle: string;
    };
    onChange: (field: 'ulke' | 'il' | 'ilce' | 'mahalle', value: string) => void;
    disabled?: boolean;
}

const AddressFields: React.FC<AddressFieldsProps> = ({ values, onChange, disabled }) => {
    const { ilceHistory, mahalleHistory } = useAddressPrefsStore();
    const [mahalleList, setMahalleList] = useState<string[]>([]);
    const [mahalleLoading, setMahalleLoading] = useState(false);

    useEffect(() => {
        if (!values.ilce) {
            setMahalleList([]);
            return;
        }
        let cancelled = false;
        setMahalleLoading(true);
        getMahallelerAsync(values.ilce)
            .then(list => { if (!cancelled) setMahalleList(list); })
            .finally(() => { if (!cancelled) setMahalleLoading(false); });
        return () => { cancelled = true; };
    }, [values.ilce]);

    const handleFieldChange = (field: 'ulke' | 'il' | 'ilce' | 'mahalle', value: string) => {
        onChange(field, value);
        if (field === 'il') {
            onChange('ilce', '');
            onChange('mahalle', '');
        } else if (field === 'ilce') {
            onChange('mahalle', '');
        }
    };

    const ilceList = getIlceler(values.il);

    const ilceOptions = sortByHistory(ilceList, ilceHistory);
    const mahalleOptions = sortByHistory(mahalleList, mahalleHistory[values.ilce] || []);

    const ilRecent = ilceHistory.filter(h => ilceList.includes(h)).length;
    const mahalleRecent = (mahalleHistory[values.ilce] || []).filter(h => mahalleList.includes(h)).length;

    return (
        <div className="grid grid-cols-2 gap-3">
            <AddressSelect
                label="Ülke"
                value={values.ulke}
                onChange={(v) => handleFieldChange('ulke', v)}
                options={ULKELER}
                placeholder="Ülke..."
                disabled={disabled}
            />
            <AddressSelect
                label="İl"
                value={values.il}
                onChange={(v) => handleFieldChange('il', v)}
                options={ILLER_TR}
                placeholder="İl seçin..."
                disabled={disabled}
            />
            <AddressSelect
                label="İlçe"
                value={values.ilce}
                onChange={(v) => handleFieldChange('ilce', v)}
                options={ilceOptions}
                placeholder={values.il ? 'İlçe seçin...' : 'Önce il seçin'}
                disabled={disabled || !values.il}
                recentCount={ilRecent}
            />
            <AddressSelect
                label="Mahalle"
                value={values.mahalle}
                onChange={(v) => onChange('mahalle', v)}
                options={mahalleOptions}
                placeholder={values.ilce ? 'Mahalle seçin...' : 'Önce ilçe seçin'}
                disabled={disabled || !values.ilce}
                loading={mahalleLoading}
                recentCount={mahalleRecent}
            />
        </div>
    );
};

export default AddressFields;
