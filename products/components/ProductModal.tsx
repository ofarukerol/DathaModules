import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useProductStore } from '../stores/useProductStore';
import type { Product } from '../types';
import { X, Save, Tag, DollarSign, FileText, UtensilsCrossed } from 'lucide-react';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: Product | null;
}

const availableIcons = [
    { id: 'lunch_dining', label: 'Burger' },
    { id: 'local_drink', label: 'İçecek' },
    { id: 'restaurant', label: 'Yemek' },
    { id: 'cake', label: 'Tatlı' },
    { id: 'coffee', label: 'Kahve' },
    { id: 'local_pizza', label: 'Pizza' },
    { id: 'ramen_dining', label: 'Makarna' },
    { id: 'set_meal', label: 'Tabak' },
    { id: 'icecream', label: 'Dondurma' },
    { id: 'bakery_dining', label: 'Fırın' },
    { id: 'kebab_dining', label: 'Kebap' },
    { id: 'egg', label: 'Kahvaltı' },
    { id: 'soup_kitchen', label: 'Çorba' },
    { id: 'rice_bowl', label: 'Pilav' },
    { id: 'local_bar', label: 'Bar' },
    { id: 'sports_bar', label: 'Kokteyl' },
    { id: 'wine_bar', label: 'Şarap' },
    { id: 'fastfood', label: 'Fast Food' },
    { id: 'tapas', label: 'Meze' },
    { id: 'skillet_cooktop', label: 'Tava' },
];

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, productToEdit }) => {
    useEscapeKey(onClose, isOpen);
    const { addProduct, updateProduct, categories } = useProductStore();

    const [name, setName] = useState('');
    const [price, setPrice] = useState('0');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('restaurant');
    const [loyaltyPointType, setLoyaltyPointType] = useState<'fixed' | 'percent'>('fixed');
    const [loyaltyPointValue, setLoyaltyPointValue] = useState('');

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name);
            setPrice(productToEdit.price.toString());
            setCategory(productToEdit.category);
            setDescription(productToEdit.description || '');
            setIcon(productToEdit.icon || 'restaurant');
            setLoyaltyPointType(productToEdit.loyaltyPointType || 'fixed');
            setLoyaltyPointValue(productToEdit.loyaltyPointValue?.toString() || '');
        } else {
            setName('');
            setPrice('0');
            setCategory(categories.length > 0 ? categories[0].id : '');
            setDescription('');
            setIcon('restaurant');
            setLoyaltyPointType('fixed');
            setLoyaltyPointValue('');
        }
    }, [productToEdit, isOpen, categories]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !price || !category) {
            alert('Lütfen gerekli alanları doldurunuz.');
            return;
        }

        const lpVal = parseFloat(loyaltyPointValue);
        const productData = {
            name,
            price: parseFloat(price),
            category,
            description: description || undefined,
            icon: icon || undefined,
            loyaltyPointType: lpVal > 0 ? loyaltyPointType : undefined,
            loyaltyPointValue: lpVal > 0 ? lpVal : undefined,
        };

        if (productToEdit) {
            updateProduct(productToEdit.id, productData);
        } else {
            addProduct(productData);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 font-sans">
                            {productToEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                        </h3>
                        <p className="text-sm text-gray-500 font-sans">
                            {productToEdit ? 'Mevcut ürün bilgilerini güncelleyin' : 'Menüye yeni bir ürün ekleyin'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Ürün Adı *</label>
                        <div className="relative">
                            <UtensilsCrossed size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none font-medium text-gray-800 placeholder-gray-400 transition-all"
                                placeholder="Örn: Cheeseburger"
                                required
                            />
                        </div>
                    </div>

                    {/* Price & Category Row */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Fiyat (₺) *</label>
                            <div className="relative">
                                <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none font-medium text-gray-800 placeholder-gray-400 transition-all app-numpad-trigger"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Kategori *</label>
                            <div className="relative">
                                <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none font-medium text-gray-800 transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Seçiniz</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Açıklama</label>
                        <div className="relative">
                            <FileText size={18} className="absolute left-4 top-3 text-gray-400" />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none font-medium text-gray-800 placeholder-gray-400 transition-all min-h-[80px] resize-y"
                                placeholder="Ürün içeriği, malzemeler vb..."
                            />
                        </div>
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Simge</label>
                        <div className="grid grid-cols-5 gap-2">
                            {availableIcons.map((ic) => (
                                <button
                                    key={ic.id}
                                    type="button"
                                    onClick={() => setIcon(ic.id)}
                                    className={`w-full aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${icon === ic.id
                                        ? 'bg-[#663259]/10 border-[#663259] text-[#663259] shadow-md'
                                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl">{ic.id}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">info</span>
                            Simge seçilmezse otomatik olarak rastgele bir simge atanacaktır.
                        </p>
                    </div>

                    {/* Sadakat Puanı */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-sans">Sadakat Puan Değeri</label>
                        <div className="flex gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setLoyaltyPointType('fixed')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${loyaltyPointType === 'fixed' ? 'border-[#663259] bg-[#663259]/10 text-[#663259]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <span className="material-symbols-outlined text-[14px] align-middle mr-1">pin</span>
                                Sabit Puan
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoyaltyPointType('percent')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${loyaltyPointType === 'percent' ? 'border-[#663259] bg-[#663259]/10 text-[#663259]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <span className="material-symbols-outlined text-[14px] align-middle mr-1">percent</span>
                                Yüzdelik
                            </button>
                        </div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">loyalty</span>
                            <input
                                type="number"
                                value={loyaltyPointValue}
                                onChange={(e) => setLoyaltyPointValue(e.target.value)}
                                className="w-full pl-10 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none font-medium text-gray-800 placeholder-gray-400 transition-all"
                                placeholder={loyaltyPointType === 'fixed' ? 'Ör: 50' : 'Ör: 10'}
                                min="0"
                                step={loyaltyPointType === 'percent' ? '1' : '0.01'}
                                max={loyaltyPointType === 'percent' ? '100' : undefined}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                {loyaltyPointType === 'fixed' ? 'Puan' : '%'}
                            </span>
                        </div>
                        {loyaltyPointType === 'percent' && parseFloat(loyaltyPointValue) > 0 && parseFloat(price) > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-[#663259]">info</span>
                                ₺{parseFloat(price).toFixed(2)} fiyatlı üründen <span className="font-bold text-[#663259]">{(parseFloat(price) * parseFloat(loyaltyPointValue) / 100).toFixed(2)} puan</span> kazandırır
                            </p>
                        )}
                        {loyaltyPointType === 'fixed' && parseFloat(loyaltyPointValue) > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-[#663259]">info</span>
                                Bu üründen sabit <span className="font-bold text-[#663259]">{parseFloat(loyaltyPointValue).toFixed(0)} puan</span> kazandırır
                            </p>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-4 bg-[#663259] text-white rounded-xl font-bold text-lg hover:bg-[#7a3d6b] hover:shadow-lg hover:shadow-[#663259]/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {productToEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
