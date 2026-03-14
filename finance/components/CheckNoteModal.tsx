import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useCheckNoteStore } from '../stores/useCheckNoteStore';
import { CheckNote, CheckNoteType, CheckNoteStatus } from '../services/checkNoteService';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';

interface CheckNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    editNote?: CheckNote | null;
    defaultType?: CheckNoteType;
    hideType?: boolean;
    customTitle?: string;
}

const CheckNoteModal: React.FC<CheckNoteModalProps> = ({ isOpen, onClose, editNote, defaultType, hideType, customTitle }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { addNote, updateNote } = useCheckNoteStore();

    const TYPE_OPTIONS = [
        { value: 'received_check', label: t('checks.receivedCheck'), icon: 'input' },
        { value: 'given_check', label: t('checks.givenCheck'), icon: 'output' },
        { value: 'promissory_note', label: t('checks.promissoryNote'), icon: 'description' },
    ];

    const STATUS_OPTIONS = [
        { value: 'pending', label: t('checks.pending'), icon: 'schedule' },
        { value: 'collected', label: t('checks.collected'), icon: 'check_circle' },
        { value: 'endorsed', label: t('checks.endorsed'), icon: 'swap_horiz' },
        { value: 'paid', label: t('common.paid'), icon: 'payments' },
        { value: 'returned', label: t('checks.returned'), icon: 'undo' },
        { value: 'bounced', label: t('checks.bounced'), icon: 'cancel' },
    ];

    const CURRENCY_OPTIONS = [
        { value: '₺', label: '₺ Türk Lirası' },
        { value: '$', label: '$ Amerikan Doları' },
        { value: '€', label: '€ Euro' },
        { value: '£', label: '£ İngiliz Sterlini' },
    ];

    const [type, setType] = useState<CheckNoteType>(defaultType || 'received_check');
    const [checkNo, setCheckNo] = useState('');
    const [bank, setBank] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('₺');
    const [dueDate, setDueDate] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [drawer, setDrawer] = useState('');
    const [holder, setHolder] = useState('');
    const [party, setParty] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<CheckNoteStatus>('pending');
    const [endorsedTo, setEndorsedTo] = useState('');

    useEffect(() => {
        if (editNote) {
            setType(editNote.type);
            setCheckNo(editNote.check_no || '');
            setBank(editNote.bank || '');
            setBankCode(editNote.bank_code || '');
            setAmount(String(editNote.amount));
            setCurrency(editNote.currency);
            setDueDate(editNote.due_date);
            setIssueDate(editNote.issue_date || '');
            setDrawer(editNote.drawer || '');
            setHolder(editNote.holder || '');
            setParty(editNote.party || '');
            setDescription(editNote.description || '');
            setStatus(editNote.status);
            setEndorsedTo(editNote.endorsed_to || '');
        } else {
            setType(defaultType || 'received_check');
            setCheckNo('');
            setBank('');
            setBankCode('');
            setAmount('');
            setCurrency('₺');
            setDueDate('');
            setIssueDate(new Date().toISOString().split('T')[0]);
            setDrawer('');
            setHolder('');
            setParty('');
            setDescription('');
            setStatus('pending');
            setEndorsedTo('');
        }
    }, [editNote, isOpen, defaultType]);

    if (!isOpen) return null;

    const isEdit = !!editNote;
    const isCheck = type !== 'promissory_note';

    const getTitle = () => {
        if (isEdit) return t('checks.editCheck');
        if (customTitle) return customTitle;
        switch (type) {
            case 'received_check': return t('checks.checkIn');
            case 'given_check': return t('checks.checkOut');
            case 'promissory_note': return t('checks.noteIn');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !dueDate) return;

        const data = {
            type,
            check_no: checkNo,
            bank: bank,
            bank_code: bankCode.toUpperCase(),
            amount: parseFloat(amount) || 0,
            currency,
            due_date: dueDate,
            issue_date: issueDate,
            drawer,
            holder,
            party,
            description,
            status,
            endorsed_to: endorsedTo,
        };

        if (isEdit && editNote) {
            await updateNote(editNote.id, data);
        } else {
            await addNote(data);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold font-sans text-gray-800">{getTitle()}</h3>
                        <p className="text-sm font-sans text-gray-500">
                            {isEdit ? t('checks.editDesc') : t('checks.newDesc')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    {/* Type & Status */}
                    {hideType && !isEdit ? (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.status')}</label>
                            <CustomSelect
                                options={STATUS_OPTIONS}
                                value={status}
                                onChange={(val) => setStatus(val as CheckNoteStatus)}
                                placeholder={t('common.select')}
                                icon="flag"
                                accentColor="#663259"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.type')}</label>
                                <CustomSelect
                                    options={TYPE_OPTIONS}
                                    value={type}
                                    onChange={(val) => setType(val as CheckNoteType)}
                                    placeholder={t('common.select')}
                                    icon="category"
                                    accentColor="#663259"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.status')}</label>
                                <CustomSelect
                                    options={STATUS_OPTIONS}
                                    value={status}
                                    onChange={(val) => setStatus(val as CheckNoteStatus)}
                                    placeholder={t('common.select')}
                                    icon="flag"
                                    accentColor="#663259"
                                />
                            </div>
                        </div>
                    )}

                    {/* Check No & Bank */}
                    {isCheck && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.checkNo')}</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">tag</span>
                                    <input
                                        type="text"
                                        value={checkNo}
                                        onChange={(e) => setCheckNo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                        placeholder="882910"
                                    />
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.bank')}</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">account_balance</span>
                                    <input
                                        type="text"
                                        value={bank}
                                        onChange={(e) => setBank(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                        placeholder="Akbank"
                                    />
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.code')}</label>
                                <input
                                    type="text"
                                    value={bankCode}
                                    onChange={(e) => setBankCode(e.target.value.slice(0, 4))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 text-center uppercase transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="AKB"
                                    maxLength={4}
                                />
                            </div>
                        </div>
                    )}

                    {/* Senet No for promissory notes */}
                    {!isCheck && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.noteNo')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">tag</span>
                                <input
                                    type="text"
                                    value={checkNo}
                                    onChange={(e) => setCheckNo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="1102"
                                />
                            </div>
                        </div>
                    )}

                    {/* Amount & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.amount')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">payments</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder="0.00"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.currency')}</label>
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

                    {/* Due Date & Issue Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.dueDate')}</label>
                            <DatePicker
                                value={dueDate}
                                onChange={setDueDate}
                                placeholder={t('checks.selectDueDate')}
                                icon="event"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.issueDate')}</label>
                            <DatePicker
                                value={issueDate}
                                onChange={setIssueDate}
                                placeholder={t('common.selectDate')}
                                icon="edit_calendar"
                            />
                        </div>
                    </div>

                    {/* Drawer / Holder / Party based on type */}
                    {type === 'received_check' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.drawer')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">person</span>
                                <input
                                    type="text"
                                    value={drawer}
                                    onChange={(e) => setDrawer(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder={t('checks.drawerPlaceholder')}
                                />
                            </div>
                        </div>
                    )}
                    {type === 'given_check' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.holder')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">person</span>
                                <input
                                    type="text"
                                    value={holder}
                                    onChange={(e) => setHolder(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder={t('checks.holderPlaceholder')}
                                />
                            </div>
                        </div>
                    )}
                    {type === 'promissory_note' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.relatedPerson')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">person</span>
                                <input
                                    type="text"
                                    value={party}
                                    onChange={(e) => setParty(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder={t('checks.relatedPersonPlaceholder')}
                                />
                            </div>
                        </div>
                    )}

                    {/* Endorsed To (if status = endorsed) */}
                    {status === 'endorsed' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('checks.endorsedLabel')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">swap_horiz</span>
                                <input
                                    type="text"
                                    value={endorsedTo}
                                    onChange={(e) => setEndorsedTo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                    placeholder={t('checks.endorsedTo')}
                                />
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('common.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 transition-all resize-none h-20 focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                            placeholder={t('checks.descPlaceholder')}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white bg-[#663259] hover:bg-[#7a3d6b] hover:shadow-[#663259]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">{isEdit ? 'save' : 'add'}</span>
                        {isEdit ? t('accounts.saveChanges') : t('common.save')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CheckNoteModal;
