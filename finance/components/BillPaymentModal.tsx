import React, { useState, useEffect, useMemo } from 'react';
import { X, Banknote, CreditCard } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useFinanceStore } from '../../../stores/useFinanceStore';
import { CURRENCIES, getCurrencyInfo } from '../../../stores/useCurrencyStore';
import type { PaymentMethod } from '../types';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c.code, label: `${c.flag} ${c.symbol} ${c.code}` }));

interface BillPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BillType {
    id: string;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
}

const BILL_TYPES: BillType[] = [
    { id: 'elektrik', label: 'Elektrik', icon: 'bolt', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { id: 'dogalgaz', label: 'Doğalgaz', icon: 'local_fire_department', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'su', label: 'Su', icon: 'water_drop', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'telefon', label: 'Telefon', icon: 'phone_in_talk', color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'internet', label: 'İnternet', icon: 'wifi', color: 'text-purple-600', bgColor: 'bg-purple-50' },
];

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'CASH', label: 'Nakit', icon: <Banknote size={14} /> },
    { key: 'CARD', label: 'Kart', icon: <CreditCard size={14} /> },
    { key: 'BANK_TRANSFER', label: 'Havale', icon: <span className="material-symbols-outlined text-[14px]">account_balance</span> },
];

const BillPaymentModal: React.FC<BillPaymentModalProps> = ({ isOpen, onClose }) => {
    useEscapeKey(onClose, isOpen);

    const { addTransaction } = useFinanceStore();

    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [currency, setCurrency] = useState('TRY');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAmounts({});
            setDescriptions({});
            setCurrency('TRY');
            setPaymentMethod('BANK_TRANSFER');
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const billsWithAmount = useMemo(() => {
        return BILL_TYPES.filter(b => {
            const val = parseFloat(amounts[b.id] || '0');
            return val > 0;
        });
    }, [amounts]);

    const totalAmount = useMemo(() => {
        let total = 0;
        BILL_TYPES.forEach(b => {
            const val = parseFloat(amounts[b.id] || '0');
            if (!isNaN(val) && val > 0) total += val;
        });
        return total;
    }, [amounts]);

    const handleSave = async () => {
        if (billsWithAmount.length === 0) return;
        setSaving(true);

        try {
            for (const bill of billsWithAmount) {
                const amount = parseFloat(amounts[bill.id] || '0');
                if (amount <= 0) continue;

                const desc = descriptions[bill.id]?.trim();
                await addTransaction({
                    type: 'EXPENSE',
                    amount,
                    currency,
                    description: desc || `${bill.label} faturası`,
                    category_id: 'exp_fatura',
                    payment_method: paymentMethod,
                    date,
                });
            }

            onClose();
        } catch (err) {
            console.error('Bill payment error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b bg-amber-50/60 border-amber-100/50 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-amber-800">Fatura Öde</h3>
                        <p className="text-sm text-amber-600/60">Fatura tutarlarını girerek hızlıca ödeyin</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-amber-100 text-amber-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Bill Items */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-3">
                    {BILL_TYPES.map(bill => (
                        <div
                            key={bill.id}
                            className={`p-4 rounded-2xl border transition-all ${
                                amounts[bill.id] && parseFloat(amounts[bill.id]) > 0
                                    ? `${bill.bgColor} border-current/10 shadow-sm`
                                    : 'bg-gray-50/80 border-gray-100 hover:bg-gray-100/80'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${bill.bgColor} ${bill.color} flex items-center justify-center shrink-0`}>
                                    <span className="material-symbols-outlined text-[22px]">{bill.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800">{bill.label}</p>
                                    <input
                                        type="text"
                                        value={descriptions[bill.id] || ''}
                                        onChange={(e) => setDescriptions(prev => ({ ...prev, [bill.id]: e.target.value }))}
                                        placeholder="Açıklama (opsiyonel)"
                                        className="w-full text-[11px] text-gray-400 bg-transparent outline-none mt-0.5 placeholder-gray-300"
                                    />
                                </div>
                                <div className="relative shrink-0">
                                    <input
                                        type="number"
                                        value={amounts[bill.id] || ''}
                                        onChange={(e) => setAmounts(prev => ({ ...prev, [bill.id]: e.target.value }))}
                                        placeholder="0.00"
                                        className={`w-32 px-3 py-2.5 text-sm font-bold text-right border rounded-xl outline-none transition-all ${
                                            amounts[bill.id] && parseFloat(amounts[bill.id]) > 0
                                                ? 'border-gray-300 bg-white text-gray-800 shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-500'
                                        } focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">{getCurrencyInfo(currency).symbol}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                    <div className="flex items-end gap-4">
                        {/* Payment Method */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 mb-2">Ödeme Yöntemi</label>
                            <div className="flex gap-2">
                                {PAYMENT_OPTIONS.map((pm) => (
                                    <button
                                        key={pm.key}
                                        type="button"
                                        onClick={() => setPaymentMethod(pm.key)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                                            paymentMethod === pm.key
                                                ? 'border-amber-600 bg-amber-600 text-white'
                                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                        }`}
                                    >
                                        {pm.icon}
                                        {pm.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Currency */}
                        <div className="w-32">
                            <label className="block text-xs font-bold text-gray-600 mb-2">Birim</label>
                            <CustomSelect
                                options={CURRENCY_OPTIONS}
                                value={currency}
                                onChange={setCurrency}
                                placeholder="Birim"
                                icon="currency_exchange"
                                accentColor="#d97706"
                            />
                        </div>

                        {/* Date */}
                        <div className="w-36">
                            <label className="block text-xs font-bold text-gray-600 mb-2">Tarih</label>
                            <DatePicker
                                value={date}
                                onChange={setDate}
                                placeholder="Tarih"
                                icon="event"
                                compact
                            />
                        </div>
                    </div>

                    {/* Total + Save */}
                    <div className="flex items-center justify-between mt-4">
                        <div>
                            <p className="text-[10px] text-gray-400 font-medium">Toplam Fatura Tutarı</p>
                            <p className="text-xl font-black text-amber-700">
                                {getCurrencyInfo(currency).symbol}{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                            {billsWithAmount.length > 0 && (
                                <p className="text-[10px] text-gray-400">{billsWithAmount.length} fatura</p>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={billsWithAmount.length === 0 || saving}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-amber-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                    Faturaları Öde
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillPaymentModal;
