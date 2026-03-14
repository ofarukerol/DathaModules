import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, Pencil, Check, Shield } from 'lucide-react';
import { useFinanceCategoryStore, FinanceCategory } from '../stores/useFinanceCategoryStore';
import HeaderActions from '../../../components/HeaderActions';

const availableIcons = [
    'groups', 'home', 'bolt', 'inventory_2', 'gavel', 'cleaning_services',
    'campaign', 'build', 'local_shipping', 'health_and_safety', 'calculate',
    'devices', 'package_2', 'school', 'more_horiz', 'point_of_sale',
    'miscellaneous_services', 'trending_up', 'real_estate_agent', 'handshake',
    'undo', 'restaurant', 'local_gas_station', 'water_drop', 'wifi',
    'phone', 'directions_car', 'storefront', 'payments', 'savings',
    'workspace_premium', 'redeem', 'loyalty', 'shopping_cart', 'attach_money',
    'account_balance', 'receipt_long', 'credit_card', 'currency_lira',
];

const FinanceCategories: React.FC = () => {
    const navigate = useNavigate();
    const { addCategory, updateCategory, deleteCategory, getCategoriesByType } = useFinanceCategoryStore();

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formLabel, setFormLabel] = useState('');
    const [formIcon, setFormIcon] = useState('more_horiz');

    const expenseCategories = getCategoriesByType('expense');
    const incomeCategories = getCategoriesByType('income');

    const openAddModal = (type: 'income' | 'expense') => {
        setModalType(type);
        setEditingId(null);
        setFormLabel('');
        setFormIcon('more_horiz');
        setShowModal(true);
    };

    const openEditModal = (cat: FinanceCategory) => {
        setModalType(cat.type);
        setEditingId(cat.id);
        setFormLabel(cat.label);
        setFormIcon(cat.icon);
        setShowModal(true);
    };

    const handleSave = () => {
        if (!formLabel.trim()) return;
        if (editingId) {
            updateCategory(editingId, { label: formLabel.trim(), icon: formIcon });
        } else {
            addCategory({ label: formLabel.trim(), icon: formIcon, type: modalType });
        }
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        deleteCategory(id);
    };

    const CategoryCard = ({ cat }: { cat: FinanceCategory }) => {
        const isExpense = cat.type === 'expense';
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 group hover:shadow-sm transition-all">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isExpense ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                </div>
                <span className="text-sm font-bold text-gray-800 flex-1">{cat.label}</span>
                {cat.isSystem ? (
                    <div className="flex items-center gap-1 text-gray-300" title="Sistem kategorisi">
                        <Shield size={14} />
                    </div>
                ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Düzenle"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Sil"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Gradient Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button onClick={() => navigate(-1)} className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0">
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">category</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Gelir & Gider Kategorileri</h1>
                                <p className="text-white/60 text-xs mt-0.5">Kategori ekleme, düzenleme ve silme</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Expense Categories */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-500 text-[18px]">trending_down</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800">Gider Kategorileri</h3>
                                        <p className="text-[11px] text-gray-400">{expenseCategories.length} kategori</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openAddModal('expense')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Ekle
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {expenseCategories.map(cat => (
                                    <CategoryCard key={cat.id} cat={cat} />
                                ))}
                            </div>
                        </div>

                        {/* Income Categories */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-500 text-[18px]">trending_up</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800">Gelir Kategorileri</h3>
                                        <p className="text-[11px] text-gray-400">{incomeCategories.length} kategori</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openAddModal('income')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Ekle
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {incomeCategories.map(cat => (
                                    <CategoryCard key={cat.id} cat={cat} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className={`p-5 border-b flex justify-between items-center ${modalType === 'income' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div>
                                <h3 className={`text-lg font-bold font-sans ${modalType === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                    {editingId ? 'Kategori Düzenle' : 'Yeni Kategori'}
                                </h3>
                                <p className={`text-xs font-sans ${modalType === 'income' ? 'text-green-600/70' : 'text-red-600/70'}`}>
                                    {modalType === 'income' ? 'Gelir kategorisi' : 'Gider kategorisi'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className={`p-2 rounded-full transition-colors ${modalType === 'income' ? 'hover:bg-green-200 text-green-700' : 'hover:bg-red-200 text-red-700'}`}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-5">
                            {/* Label Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Kategori Adı</label>
                                <input
                                    type="text"
                                    value={formLabel}
                                    onChange={(e) => setFormLabel(e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 transition-all ${modalType === 'income' ? 'focus:border-green-500 focus:ring-1 focus:ring-green-500/20' : 'focus:border-red-500 focus:ring-1 focus:ring-red-500/20'}`}
                                    placeholder="Kategori adı..."
                                    autoFocus
                                />
                            </div>

                            {/* Icon Picker */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">İkon Seç</label>
                                <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {availableIcons.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormIcon(icon)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${formIcon === icon
                                                ? modalType === 'income'
                                                    ? 'bg-green-100 text-green-600 ring-2 ring-green-500/30'
                                                    : 'bg-red-100 text-red-600 ring-2 ring-red-500/30'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                                }`}
                                            title={icon}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Önizleme</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${modalType === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{formIcon}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800">{formLabel || 'Kategori adı...'}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!formLabel.trim()}
                                className={`w-full py-3.5 rounded-xl font-bold text-base hover:shadow-lg transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${modalType === 'income'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                <Check size={18} />
                                {editingId ? 'Güncelle' : 'Kategori Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceCategories;
