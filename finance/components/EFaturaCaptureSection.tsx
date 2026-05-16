import React from 'react';
import { Receipt, User, Building2 } from 'lucide-react';
import { useSettingsStore } from '../../../stores/useSettingsStore';

export interface EFaturaCaptureState {
    requested: boolean;          // 'Fatura İstiyorum' isaretli mi?
    recipientName: string;
    taxNumber: string;            // VKN veya TCKN
    taxOffice: string;
    email: string;
    address: string;
}

export const emptyEFaturaState: EFaturaCaptureState = {
    requested: false,
    recipientName: '',
    taxNumber: '',
    taxOffice: '',
    email: '',
    address: '',
};

interface EFaturaCaptureSectionProps {
    state: EFaturaCaptureState;
    onChange: (next: EFaturaCaptureState) => void;
    /** Bazi sayfalarda (Paket) musteri bilgisi otomatik dolar — readonly hale getirir */
    readOnly?: boolean;
}

/**
 * Payment modal'larda 'Fatura İstiyorum' onay kutusu + VKN/TCKN inputlari.
 * Controlled — state parent'ta tutulur.
 *
 * Settings.efaturaSettings.mode === 'DISABLED' ise hic render edilmez.
 * AUTO modda 'requested' otomatik true, toggle gizlenir.
 */
const EFaturaCaptureSection: React.FC<EFaturaCaptureSectionProps> = ({ state, onChange, readOnly }) => {
    const efaturaSettings = useSettingsStore((s) => s.efaturaSettings);

    if (efaturaSettings.mode === 'DISABLED') return null;

    const isAuto = efaturaSettings.mode === 'AUTO';
    const showInputs = isAuto || state.requested;

    return (
        <div className="border border-purple/20 bg-purple-50/40 rounded-xl p-3 space-y-3">
            {/* Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={isAuto || state.requested}
                    disabled={isAuto || readOnly}
                    onChange={(e) => onChange({ ...state, requested: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600"
                />
                <Receipt className="w-4 h-4 text-purple-700" />
                <span className="font-semibold text-sm text-gray-800">
                    Fatura İstiyorum
                    {isAuto && (
                        <span className="ml-2 text-xs font-normal text-purple-700">
                            (Otomatik kesilecek)
                        </span>
                    )}
                </span>
            </label>

            {/* Detay inputlari */}
            {showInputs && (
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2 relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Müşteri Adı / Unvan"
                            value={state.recipientName}
                            onChange={(e) => onChange({ ...state, recipientName: e.target.value })}
                            readOnly={readOnly}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="VKN (10) veya TCKN (11)"
                            value={state.taxNumber}
                            onChange={(e) => onChange({ ...state, taxNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                            readOnly={readOnly}
                            maxLength={11}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Vergi Dairesi (opsiyonel)"
                            value={state.taxOffice}
                            onChange={(e) => onChange({ ...state, taxOffice: e.target.value })}
                            readOnly={readOnly}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div className="col-span-2">
                        <input
                            type="email"
                            placeholder="E-Posta (e-Arşiv PDF için)"
                            value={state.email}
                            onChange={(e) => onChange({ ...state, email: e.target.value })}
                            readOnly={readOnly}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    {state.taxNumber.length === 10 && (
                        <p className="col-span-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            VKN tespit edildi — e-Fatura kesilecek (mükellef ise)
                        </p>
                    )}
                    {state.taxNumber.length === 11 && (
                        <p className="col-span-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                            TCKN tespit edildi — e-Arşiv kesilecek
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default EFaturaCaptureSection;
