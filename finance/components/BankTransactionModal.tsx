import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useBankTransactionStore } from '../stores/useBankTransactionStore';
import { BankTransaction } from '../services/bankTransactionService';
import { CURRENCIES, getCurrencyInfo } from '../../../stores/useCurrencyStore';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c.code, label: `${c.flag} ${c.symbol} ${c.code}` }));

interface BankTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    editTransaction?: BankTransaction | null;
}

const BankTransactionModal: React.FC<BankTransactionModalProps> = ({ isOpen, onClose, accountId, editTransaction }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { addTransaction, updateTransaction } = useBankTransactionStore();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TRY');
    const [balanceAfter, setBalanceAfter] = useState('');
    const [reference, setReference] = useState('');

    useEffect(() => {
        if (editTransaction) {
            setDate(editTransaction.date);
            setDescription(editTransaction.description || '');
            setType(editTransaction.type);
            setAmount(String(editTransaction.amount));
            setBalanceAfter(editTransaction.balance_after != null ? String(editTransaction.balance_after) : '');
            setReference(editTransaction.reference || '');
        } else {
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setType('expense');
            setAmount('');
            setCurrency('TRY');
            setBalanceAfter('');
            setReference('');
        }
    }, [editTransaction, isOpen]);

    if (!isOpen) return null;

    const isEdit = !!editTransaction;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !amount) return;

        const data = {
            bank_account_id: accountId,
            date,
            description,
            type,
            amount: Math.abs(parseFloat(amount) || 0),
            balance_after: balanceAfter ? parseFloat(balanceAfter) : null,
            reference_id: reference || null,
            category: null,
            matched_transaction_id: editTransaction?.matched_transaction_id || null,
            is_imported: editTransaction?.is_imported || 0,
        };

        if (isEdit && editTransaction) {
            await updateTransaction(editTransaction.id, data);
        } else {
            await addTransaction(data);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold font-sans text-gray-800">
                            {isEdit ? t('bank.editTransaction') : t('bank.newTransaction')}
                        </h3>
                        <p className="text-sm font-sans text-gray-500">
                            {isEdit ? t('bank.editTransactionDesc') : t('bank.newTransactionDesc')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    {/* Type Toggle */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('bank.transactionType')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${
                                    type === 'income'
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                Gelir
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${
                                    type === 'expense'
                                        ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                Gider
                            </button>
                        </div>
                    </div>

                    {/* Date, Amount & Currency */}
                    <div className="grid grid-cols-[1fr,1fr,120px] gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tarih</label>
                            <DatePicker
                                value={date}
                                onChange={setDate}
                                placeholder={t('common.selectDate')}
                                icon="event"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tutar</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{getCurrencyInfo(currency).symbol}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Birim</label>
                            <CustomSelect
                                options={CURRENCY_OPTIONS}
                                value={currency}
                                onChange={setCurrency}
                                placeholder="Birim"
                                icon="currency_exchange"
                                accentColor="#663259"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('bank.descriptionLabel')}</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">description</span>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                placeholder={t('bank.descPlaceholder')}
                            />
                        </div>
                    </div>

                    {/* Balance After & Reference */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('bank.afterBalance')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">account_balance_wallet</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={balanceAfter}
                                    onChange={(e) => setBalanceAfter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Referans <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">tag</span>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="Dekont no / Ref"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white bg-[#663259] hover:bg-[#7a3d6b] hover:shadow-[#663259]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">{isEdit ? 'save' : 'add'}</span>
                        {isEdit ? t('accounts.saveChanges') : t('bank.addTransaction')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BankTransactionModal;
