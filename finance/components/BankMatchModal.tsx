import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useBankTransactionStore } from '../stores/useBankTransactionStore';
import { BankTransaction } from '../services/bankTransactionService';
import { useFinanceStore } from '../../../stores/useFinanceStore';

interface BankMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    bankTransaction: BankTransaction | null;
}

const BankMatchModal: React.FC<BankMatchModalProps> = ({ isOpen, onClose, bankTransaction }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { matchTransaction } = useBankTransactionStore();
    const { transactions: financeTransactions } = useFinanceStore();

    const candidates = useMemo(() => {
        if (!bankTransaction) return [];

        const txDate = new Date(bankTransaction.date + 'T00:00:00');
        const txAmount = bankTransaction.amount;

        const expectedType = bankTransaction.type === 'income' ? 'INCOME' : 'EXPENSE';
        return financeTransactions
            .filter(ft => {
                // Same type (bank uses lowercase, finance uses uppercase)
                if (ft.type !== expectedType) return false;
                // Amount within +/- 10%
                const diff = Math.abs(ft.amount - txAmount);
                if (diff > txAmount * 0.1) return false;
                // Date within +/- 7 days
                const ftDate = new Date(ft.date + 'T00:00:00');
                const daysDiff = Math.abs(txDate.getTime() - ftDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff > 7) return false;
                return true;
            })
            .sort((a, b) => {
                // Exact amount first, then closest date
                const aDiff = Math.abs(a.amount - txAmount);
                const bDiff = Math.abs(b.amount - txAmount);
                if (aDiff !== bDiff) return aDiff - bDiff;
                const aDateDiff = Math.abs(new Date(a.date + 'T00:00:00').getTime() - txDate.getTime());
                const bDateDiff = Math.abs(new Date(b.date + 'T00:00:00').getTime() - txDate.getTime());
                return aDateDiff - bDateDiff;
            });
    }, [bankTransaction, financeTransactions]);

    if (!isOpen || !bankTransaction) return null;

    const handleMatch = async (financeTransactionId: string) => {
        await matchTransaction(bankTransaction.id, financeTransactionId);
        onClose();
    };

    const paymentMethodLabels: Record<string, string> = {
        cash: 'Nakit',
        credit_card: t('common.creditCard'),
        transfer: 'Havale/EFT',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold font-sans text-gray-800">{t('bank.matchTransaction')}</h3>
                        <p className="text-sm font-sans text-gray-500">
                            Banka hareketini mevcut gelir-gider kayıtlarıyla eşleştirin
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Bank Transaction Info */}
                <div className="px-6 pt-4 shrink-0">
                    <div className={`p-4 rounded-xl border ${bankTransaction.type === 'income' ? 'bg-emerald-50/60 border-emerald-100' : 'bg-red-50/60 border-red-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bankTransaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    <span className="material-symbols-outlined text-[20px]">
                                        {bankTransaction.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{bankTransaction.description || t('bank.noDescription')}</p>
                                    <p className="text-xs text-gray-500">{bankTransaction.date} {bankTransaction.reference ? `• Ref: ${bankTransaction.reference}` : ''}</p>
                                </div>
                            </div>
                            <p className={`text-lg font-black ${bankTransaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {bankTransaction.type === 'income' ? '+' : '-'}₺{bankTransaction.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Candidates List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                    {candidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <span className="material-symbols-outlined text-[48px] mb-3 opacity-30">search_off</span>
                            <p className="text-sm font-bold text-gray-500">{t('bank.noMatch')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('bank.noMatchDesc')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                {candidates.length} olası eşleşme bulundu
                            </p>
                            {candidates.map(ft => {
                                const isExact = ft.amount === bankTransaction.amount;
                                return (
                                    <button
                                        key={ft.id}
                                        onClick={() => handleMatch(ft.id)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-[#663259]/30 hover:shadow-md transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ft.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {ft.type === 'INCOME' ? 'arrow_downward' : 'arrow_upward'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-[#663259] transition-colors truncate">{ft.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 font-medium">{ft.date}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{ft.category_name}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{ft.payment_method ? (paymentMethodLabels[ft.payment_method] || ft.payment_method) : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${ft.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    ₺{ft.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </p>
                                                {isExact && (
                                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">{t('bank.exactMatch')}</span>
                                                )}
                                            </div>
                                            <span className="material-symbols-outlined text-[20px] text-gray-300 group-hover:text-[#663259] transition-colors">link</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end shrink-0 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankMatchModal;
