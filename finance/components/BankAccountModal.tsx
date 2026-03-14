import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useBankAccountStore } from '../stores/useBankAccountStore';
import { BankAccount, deriveTheme } from '../services/bankAccountService';
import CustomSelect from '../../../components/CustomSelect';

interface BankAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    editAccount?: BankAccount | null;
}

const BANK_OPTIONS = [
    { value: 'Yapı Kredi', label: 'Yapı Kredi', icon: 'account_balance' },
    { value: 'Akbank', label: 'Akbank', icon: 'account_balance' },
    { value: 'Garanti BBVA', label: 'Garanti BBVA', icon: 'account_balance' },
    { value: 'Ziraat Bankası', label: 'Ziraat Bankası', icon: 'account_balance' },
    { value: 'İş Bankası', label: 'İş Bankası', icon: 'account_balance' },
    { value: 'Halkbank', label: 'Halkbank', icon: 'account_balance' },
    { value: 'Vakıfbank', label: 'Vakıfbank', icon: 'account_balance' },
    { value: 'QNB Finansbank', label: 'QNB Finansbank', icon: 'account_balance' },
    { value: 'Denizbank', label: 'Denizbank', icon: 'account_balance' },
    { value: 'TEB', label: 'TEB', icon: 'account_balance' },
    { value: 'ING', label: 'ING', icon: 'account_balance' },
    { value: 'HSBC', label: 'HSBC', icon: 'account_balance' },
    { value: 'Enpara', label: 'Enpara', icon: 'account_balance' },
    { value: 'Papara', label: 'Papara', icon: 'account_balance' },
    { value: '__other__', label: 'Diğer', icon: 'more_horiz' },
];

const KNOWN_BANK_NAMES = BANK_OPTIONS.filter(b => b.value !== '__other__').map(b => b.value);

const CURRENCY_OPTIONS = [
    { value: 'TRY', label: '₺ Türk Lirası' },
    { value: 'USD', label: '$ Amerikan Doları' },
    { value: 'EUR', label: '€ Euro' },
    { value: 'GBP', label: '£ İngiliz Sterlini' },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Aktif', icon: 'check_circle' },
    { value: 'passive', label: 'Pasif', icon: 'pause_circle' },
];

const BankAccountModal: React.FC<BankAccountModalProps> = ({ isOpen, onClose, editAccount }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { addAccount, updateAccount } = useBankAccountStore();

    const [bankName, setBankName] = useState('');
    const [customBankName, setCustomBankName] = useState('');
    const [name, setName] = useState('');
    const [iban, setIban] = useState('');
    const [balance, setBalance] = useState('');
    const [currency, setCurrency] = useState('TRY');
    const [status, setStatus] = useState<'active' | 'passive'>('active');

    useEffect(() => {
        if (editAccount) {
            const matchesPreset = KNOWN_BANK_NAMES.includes(editAccount.bank_name);
            setBankName(matchesPreset ? editAccount.bank_name : '__other__');
            setCustomBankName(matchesPreset ? '' : (editAccount.bank_name || ''));
            setName(editAccount.name);
            setIban(editAccount.iban || '');
            setBalance(String(editAccount.balance));
            setCurrency(editAccount.currency || 'TRY');
            setStatus(editAccount.status || 'active');
        } else {
            setBankName('');
            setCustomBankName('');
            setName('');
            setIban('');
            setBalance('');
            setCurrency('TRY');
            setStatus('active');
        }
    }, [editAccount, isOpen]);

    if (!isOpen) return null;

    const isEdit = !!editAccount;
    const finalBankName = bankName === '__other__' ? customBankName : bankName;
    const theme = finalBankName ? deriveTheme(finalBankName) : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !finalBankName) return;

        if (isEdit && editAccount) {
            const derivedTheme = deriveTheme(finalBankName);
            await updateAccount(editAccount.id, {
                name,
                bank_name: finalBankName,
                code: derivedTheme.code,
                color: derivedTheme.color,
                iban,
                balance: parseFloat(balance) || 0,
                currency,
                status,
            });
        } else {
            await addAccount({
                name,
                bank_name: finalBankName,
                iban,
                balance: parseFloat(balance) || 0,
                currency,
                status,
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold font-sans text-gray-800">
                            {isEdit ? t('accounts.editAccount') : t('accounts.newAccount')}
                        </h3>
                        <p className="text-sm font-sans text-gray-500">
                            {isEdit ? t('accounts.editAccountDesc') : t('accounts.newAccountDesc')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    {/* Bank Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Banka *</label>
                        <CustomSelect
                            options={BANK_OPTIONS}
                            value={bankName}
                            onChange={(val) => {
                                setBankName(val);
                                if (val !== '__other__') setCustomBankName('');
                            }}
                            placeholder="Banka seçin"
                            searchPlaceholder="Banka ara..."
                            icon="account_balance"
                            accentColor="#663259"
                        />
                        {bankName === '__other__' && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={customBankName}
                                    onChange={(e) => setCustomBankName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="Banka adını yazın"
                                    required
                                    autoFocus
                                />
                            </div>
                        )}
                        {theme && (
                            <div className="flex items-center gap-2 mt-2">
                                <div
                                    className="px-2.5 py-1 rounded-lg text-white text-xs font-bold"
                                    style={{ backgroundColor: theme.color }}
                                >
                                    {theme.code}
                                </div>
                                <span className="text-xs text-gray-400">Kod ve renk otomatik atanır</span>
                            </div>
                        )}
                    </div>

                    {/* Account Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('accounts.accountName')} *</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">badge</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                placeholder="Ticari Hesap, Maaş Hesabı, vb."
                                required
                            />
                        </div>
                    </div>

                    {/* IBAN */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">IBAN</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">credit_card</span>
                            <input
                                type="text"
                                value={iban}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\s/g, '').toUpperCase().slice(0, 26);
                                    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
                                    setIban(formatted);
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                placeholder="TR00 0000 0000 0000 0000 0000 00"
                                maxLength={32}
                            />
                        </div>
                    </div>

                    {/* Balance & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Bakiye</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">payments</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Para Birimi</label>
                            <CustomSelect
                                options={CURRENCY_OPTIONS}
                                value={currency}
                                onChange={setCurrency}
                                placeholder={t('common.select')}
                                icon="currency_exchange"
                                accentColor="#663259"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Durum</label>
                        <CustomSelect
                            options={STATUS_OPTIONS}
                            value={status}
                            onChange={(val) => setStatus(val as 'active' | 'passive')}
                            placeholder={t('common.select')}
                            icon="toggle_on"
                            accentColor="#663259"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white bg-[#663259] hover:bg-[#7a3d6b] hover:shadow-[#663259]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">{isEdit ? 'save' : 'add'}</span>
                        {isEdit ? t('accounts.saveChanges') : t('accounts.addAccount')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BankAccountModal;
