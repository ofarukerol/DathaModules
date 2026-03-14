import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Trash2, Pencil, Check, Shield } from 'lucide-react';
import { useFinanceCategoryStore, FinanceCategory } from '../stores/useFinanceCategoryStore';
import { useEscapeKey } from '../../_shared/useEscapeKey';

const availableIcons = [
    'groups', 'home', 'bolt', 'inventory_2', 'gavel', 'cleaning_services',
    'campaign', 'build', 'local_shipping', 'health_and_safety', 'calculate',
    'devices', 'package_2', 'school', 'more_horiz', 'point_of_sale',
    'handyman', 'trending_up', 'real_estate_agent', 'handshake',
    'undo', 'restaurant', 'local_gas_station', 'water_drop', 'wifi',
    'phone', 'directions_car', 'storefront', 'payments', 'savings',
    'workspace_premium', 'redeem', 'loyalty', 'shopping_cart', 'attach_money',
    'account_balance', 'receipt_long', 'credit_card', 'currency_lira',
];

interface FinanceCategoriesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FinanceCategoriesModal: React.FC<FinanceCategoriesModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { addCategory, updateCategory, deleteCategory, getCategoriesByType } = useFinanceCategoryStore();

    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState<'income' | 'expense'>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formLabel, setFormLabel] = useState('');
    const [formIcon, setFormIcon] = useState('more_horiz');

    if (!isOpen) return null;

    const expenseCategories = getCategoriesByType('expense');
    const incomeCategories = getCategoriesByType('income');

    const openAdd = (type: 'income' | 'expense') => {
        setFormType(type);
        setEditingId(null);
        setFormLabel('');
        setFormIcon('more_horiz');
        setShowForm(true);
    };

    const openEdit = (cat: FinanceCategory) => {
        setFormType(cat.type);
        setEditingId(cat.id);
        setFormLabel(cat.label);
        setFormIcon(cat.icon);
        setShowForm(true);
    };

    const handleSave = () => {
        if (!formLabel.trim()) return;
        if (editingId) {
            updateCategory(editingId, { label: formLabel.trim(), icon: formIcon });
        } else {
            addCategory({ label: formLabel.trim(), icon: formIcon, type: formType });
        }
        setShowForm(false);
    };

    const CategoryRow = ({ cat }: { cat: FinanceCategory }) => {
        const isExp = cat.type === 'expense';
        return (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group hover:bg-gray-50 transition-all">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isExp ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                </div>
                <span className="text-xs font-bold text-gray-700 flex-1">{cat.label}</span>
                {cat.isSystem ? (
                    <Shield size={12} className="text-gray-300" />
                ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(cat)} className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{t('categories.managementTitle')}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{t('categories.managementDesc')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {!showForm ? (
                        <div className="grid grid-cols-2 gap-5">
                            {/* Expense */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-red-500 text-[14px]">trending_down</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{t('categories.expense')} <span className="text-gray-400 font-medium">({expenseCategories.length})</span></span>
                                    </div>
                                    <button
                                        onClick={() => openAdd('expense')}
                                        className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <Plus size={12} />
                                        {t('common.add')}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {expenseCategories.map(cat => <CategoryRow key={cat.id} cat={cat} />)}
                                </div>
                            </div>

                            {/* Income */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-green-500 text-[14px]">trending_up</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{t('categories.income')} <span className="text-gray-400 font-medium">({incomeCategories.length})</span></span>
                                    </div>
                                    <button
                                        onClick={() => openAdd('income')}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-colors"
                                    >
                                        <Plus size={12} />
                                        {t('common.add')}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {incomeCategories.map(cat => <CategoryRow key={cat.id} cat={cat} />)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Add/Edit Form */
                        <div className="max-w-sm mx-auto flex flex-col gap-4">
                            <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors self-start">
                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                {t('common.back')}
                            </button>

                            <div className={`text-center p-3 rounded-xl ${formType === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className={`text-sm font-bold ${formType === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                    {editingId ? t('categories.editCategory') : t('categories.newCategory')}
                                </span>
                                <span className={`text-xs ml-2 ${formType === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                    ({formType === 'income' ? t('categories.income') : t('categories.expense')})
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('categories.categoryNameLabel')}</label>
                                <input
                                    type="text"
                                    value={formLabel}
                                    onChange={(e) => setFormLabel(e.target.value)}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm text-gray-800 transition-all ${formType === 'income' ? 'focus:border-green-400 focus:ring-1 focus:ring-green-500/20' : 'focus:border-red-400 focus:ring-1 focus:ring-red-500/20'}`}
                                    placeholder={t('categories.categoryNameInput')}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('categories.selectIcon')}</label>
                                <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto custom-scrollbar p-1 bg-gray-50 rounded-xl border border-gray-100">
                                    {availableIcons.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormIcon(icon)}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${formIcon === icon
                                                ? formType === 'income'
                                                    ? 'bg-green-100 text-green-600 ring-2 ring-green-500/30'
                                                    : 'bg-red-100 text-red-600 ring-2 ring-red-500/30'
                                                : 'text-gray-400 hover:bg-white hover:text-gray-600'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${formType === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <span className="material-symbols-outlined text-[16px]">{formIcon}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-700">{formLabel || t('categories.categoryNameInput')}</span>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!formLabel.trim()}
                                className={`w-full py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${formType === 'income'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                <Check size={16} />
                                {editingId ? t('common.update') : t('categories.addCategory')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinanceCategoriesModal;
