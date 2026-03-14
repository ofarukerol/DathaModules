import React, { useState } from 'react';
import { useProductStore } from '../stores/useProductStore';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_COLORS = [
    { color: 'bg-[#FEF3C7]', text: 'text-[#92400E]', icon: 'category', iconColor: 'text-yellow-500' },
    { color: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', icon: 'category', iconColor: 'text-blue-500' },
    { color: 'bg-[#D1FAE5]', text: 'text-[#065F46]', icon: 'category', iconColor: 'text-green-600' },
    { color: 'bg-[#FCE7F3]', text: 'text-[#9D174D]', icon: 'category', iconColor: 'text-pink-500' },
    { color: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', icon: 'category', iconColor: 'text-purple-600' },
];

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose }) => {
    const { categories, addCategory, deleteCategory } = useProductStore();
    const [newCategoryName, setNewCategoryName] = useState('');

    if (!isOpen) return null;

    const handleAdd = () => {
        if (!newCategoryName.trim()) return;
        const colorIdx = categories.length % DEFAULT_COLORS.length;
        const style = DEFAULT_COLORS[colorIdx];
        addCategory({
            name: newCategoryName.trim(),
            icon: style.icon,
            color: style.color,
            text: style.text,
            iconColor: style.iconColor,
        });
        setNewCategoryName('');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#663259]">category</span>
                        <h2 className="text-lg font-bold text-gray-800">Kategoriler</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-4">
                    <div className="flex gap-2 mb-4">
                        <input
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                            placeholder="Yeni kategori adı..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-[#663259] text-white rounded-xl text-sm font-bold hover:bg-[#7a3d6b] transition-colors"
                        >
                            Ekle
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl group">
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-outlined text-[18px] ${cat.iconColor || 'text-gray-500'}`}>{cat.icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <button
                                    onClick={() => deleteCategory(cat.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-center text-sm text-gray-400 py-6">Henüz kategori yok</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;
