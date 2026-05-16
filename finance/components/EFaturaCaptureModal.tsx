import React, { useEffect, useState } from 'react';
import { X, Receipt, Check } from 'lucide-react';
import EFaturaCaptureSection, { EFaturaCaptureState, emptyEFaturaState } from './EFaturaCaptureSection';

interface EFaturaCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (state: EFaturaCaptureState) => void;
    initialState?: Partial<EFaturaCaptureState>;
    title?: string;
}

/**
 * MANUAL modda ödeme tamamlandiktan sonra acilan modal.
 * Kullanici 'Fatura İstiyorum'u onaylar ve VKN/TCKN girer.
 * 'Vazgec' demek = belge kesilmez.
 *
 * AUTO modda bu modal hic acilmaz — direkt capture() cagrilir.
 */
const EFaturaCaptureModal: React.FC<EFaturaCaptureModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialState,
    title = 'E-Belge Bilgileri',
}) => {
    const [state, setState] = useState<EFaturaCaptureState>({ ...emptyEFaturaState, requested: true });

    useEffect(() => {
        if (isOpen) {
            setState({ ...emptyEFaturaState, requested: true, ...(initialState ?? {}) });
        }
    }, [isOpen, initialState]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!state.requested) {
            onClose();
            return;
        }
        onConfirm(state);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-[90vw] max-w-[520px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-purple-700" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5">
                    <EFaturaCaptureSection state={state} onChange={setState} />
                </div>
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        className="h-10 px-4 border border-gray-200 text-gray-500 font-bold text-xs rounded-xl hover:bg-gray-50"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={state.requested && state.recipientName.trim().length < 2}
                        className="h-10 px-6 font-bold text-xs rounded-xl bg-[#663259] text-white hover:bg-[#4A235A] disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-1.5"
                    >
                        <Check className="w-4 h-4" />
                        Fatura Kes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EFaturaCaptureModal;
