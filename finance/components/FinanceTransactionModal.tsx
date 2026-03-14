
import React, { useState } from 'react';
import { X, CreditCard, AlignLeft, Banknote } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useFinanceCategoryStore } from '../stores/useFinanceCategoryStore';
import { useFinanceStore } from '../../../stores/useFinanceStore';
import { CURRENCIES, getCurrencyInfo } from '../../../stores/useCurrencyStore';
import type { PaymentMethod } from '../types';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c.code, label: `${c.flag} ${c.symbol} ${c.code}` }));

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'CASH', label: 'Nakit', icon: <Banknote size={20} /> },
    { key: 'CARD', label: 'Kredi Kartı', icon: <CreditCard size={20} /> },
    { key: 'BANK_TRANSFER', label: 'Havale/EFT', icon: <span className="material-symbols-outlined text-[20px]">account_balance</span> },
];

interface FinanceTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'income' | 'expense';
}

const FinanceTransactionModal: React.FC<FinanceTransactionModalProps> = ({ isOpen, onClose, type }) => {
    useEscapeKey(onClose, isOpen);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TRY');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const { getCategoriesByType } = useFinanceCategoryStore();
    const { addTransaction } = useFinanceStore();

    if (!isOpen) return null;

    const isIncome = type === 'income';
    const categories = getCategoriesByType(type).map(c => ({ value: c.id, label: c.label, icon: c.icon }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) return;

        await addTransaction({
            type: isIncome ? 'INCOME' : 'EXPENSE',
            amount: parseFloat(amount),
            currency,
            description,
            category_id: category,
            payment_method: paymentMethod,
            date,
        });

        // Reset form
        setAmount('');
        setCurrency('TRY');
        setDescription('');
        setCategory('');
        setPaymentMethod('CASH');
        setDate(new Date().toISOString().split('T')[0]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className={`p-6 border-b flex justify-between items-center ${isIncome ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div>
                        <h3 className={`text-xl font-bold font-sans ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                            {isIncome ? 'Gelir Ekle' : 'Gider Ekle'}
                        </h3>
                        <p className={`text-sm font-sans ${isIncome ? 'text-green-600/70' : 'text-red-600/70'}`}>
                            {isIncome ? 'Gelir detaylarını girin' : 'Gider detaylarını girin'}
                        </p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isIncome ? 'hover:bg-green-200 text-green-700' : 'hover:bg-red-200 text-red-700'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    {/* Amount & Currency */}
                    <div className="grid grid-cols-[1fr,140px] gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Tutar</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                                    <Banknote size={18} />
                                    <span className="font-bold text-sm">{getCurrencyInfo(currency).symbol}</span>
                                </div>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`w-full pl-16 pr-4 py-3 bg-gray-50 border rounded-xl outline-none font-bold text-gray-800 transition-all text-lg ${isIncome ? 'focus:border-green-500 focus:ring-1 focus:ring-green-500/20' : 'focus:border-red-500 focus:ring-1 focus:ring-red-500/20'} border-gray-200`}
                                    placeholder="0.00"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Birim</label>
                            <CustomSelect
                                options={CURRENCY_OPTIONS}
                                value={currency}
                                onChange={setCurrency}
                                placeholder="Birim"
                                icon="currency_exchange"
                                accentColor={isIncome ? '#16a34a' : '#dc2626'}
                            />
                        </div>
                    </div>

                    {/* Category & Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Kategori</label>
                            <CustomSelect
                                options={categories}
                                value={category}
                                onChange={setCategory}
                                placeholder="Seçiniz"
                                searchPlaceholder="Kategori ara..."
                                icon="category"
                                accentColor={isIncome ? '#16a34a' : '#dc2626'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Tarih</label>
                            <DatePicker
                                value={date}
                                onChange={setDate}
                                placeholder="Tarih seçin"
                                icon="event"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Açıklama</label>
                        <div className="relative">
                            <AlignLeft size={20} className="absolute left-4 top-3 text-gray-400" />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all resize-none h-24 hover:bg-gray-100 focus:bg-white"
                                placeholder="İşlem detayı..."
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Ödeme Yöntemi</label>
                        <div className="grid grid-cols-3 gap-3">
                            {PAYMENT_METHODS.map((pm) => (
                                <button
                                    key={pm.key}
                                    type="button"
                                    onClick={() => setPaymentMethod(pm.key)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === pm.key
                                        ? 'border-gray-800 bg-gray-800 text-white shadow-lg'
                                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    {pm.icon}
                                    <span className="font-bold text-xs">{pm.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white ${isIncome
                            ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-600/20'
                            : 'bg-red-600 hover:bg-red-700 hover:shadow-red-600/20'}`}
                    >
                        {isIncome ? 'Gelir Kaydet' : 'Gider Kaydet'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FinanceTransactionModal;
