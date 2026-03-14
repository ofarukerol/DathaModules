import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '../stores/useProductStore';
import type { Product, Portion, RecipeItem } from '../types';
import CategoryModal from '../components/CategoryModal';
import CustomSelect from '../../../components/CustomSelect';

const ProductForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { products, categories, addProduct, updateProduct, addCategory } = useProductStore();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const isEditMode = Boolean(id);
    const existingProduct = isEditMode ? products.find(p => p.id === id) : null;

    // Form State
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [portions, setPortions] = useState<Portion[]>([]);
    const [price, setPrice] = useState('0');
    const [purchasePrice, setPurchasePrice] = useState('0');
    const [taxRate, setTaxRate] = useState('10');
    const [purchaseTaxRate, setPurchaseTaxRate] = useState('10');
    const [price2, setPrice2] = useState('0');
    const [price3, setPrice3] = useState('0');
    // Marketplace State
    const [marketplaces, setMarketplaces] = useState<Record<string, {
        price: string;
        commissionCourier: string;
        commissionNoCourier: string;
        deliveryMode: 'kuryeli' | 'kuryesiz';
    }>>({
        getir: { price: '0', commissionCourier: '35', commissionNoCourier: '13', deliveryMode: 'kuryeli' },
        yemeksepeti: { price: '0', commissionCourier: '35', commissionNoCourier: '13', deliveryMode: 'kuryeli' },
        trendyol: { price: '0', commissionCourier: '35', commissionNoCourier: '13', deliveryMode: 'kuryeli' },
        migros: { price: '0', commissionCourier: '35', commissionNoCourier: '13', deliveryMode: 'kuryeli' },
    });
    const [isActive, setIsActive] = useState(true);
    const [trackStock, setTrackStock] = useState(false);
    const [stockQuantity, setStockQuantity] = useState('0');
    const [criticalStockLevel, setCriticalStockLevel] = useState('0');
    const [icon, setIcon] = useState('restaurant');
    const [imageUrl, setImageUrl] = useState('');
    const [hasPortion, setHasPortion] = useState(false);
    const [isTaxExempt, setIsTaxExempt] = useState(false);
    const [showInKitchen, setShowInKitchen] = useState(true);
    const [isRecipeProduct, setIsRecipeProduct] = useState(false);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [packagingItems, setPackagingItems] = useState<RecipeItem[]>([]);
    const [recipeTab, setRecipeTab] = useState<'ingredients' | 'packaging'>('ingredients');
    const [manualCostOverride, setManualCostOverride] = useState(false);
    const [manualTaxOverride, setManualTaxOverride] = useState(false);
    const [newRecipeTaxRate, setNewRecipeTaxRate] = useState('10');

    // UI State for new recipe item input
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeDesc, setNewRecipeDesc] = useState('');
    const [newRecipeQuantity, setNewRecipeQuantity] = useState('');
    const [newRecipeUnit, setNewRecipeUnit] = useState<RecipeItem['unit']>('Adet');
    const [newRecipeUnitPrice, setNewRecipeUnitPrice] = useState('');

    // UI State for new portion input
    const [newPortionName, setNewPortionName] = useState('');
    const [newPortionPrice, setNewPortionPrice] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Notification State
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Form sadece ilk yüklemede bir kez doldurulur.
    // Sync sırasında store güncellendiğinde form değerleri sıfırlanmaz.
    const formLoadedRef = useRef(false);

    // Reçete otomatik hesaplama
    const hasRecipeItems = isRecipeProduct && recipeItems.length > 0;
    const recipeTotalCost = recipeItems.reduce((s, i) => s + i.total, 0);
    const recipeWeightedTaxRate = recipeTotalCost > 0
        ? recipeItems.reduce((s, i) => s + (i.total * (i.taxRate ?? 10)), 0) / recipeTotalCost
        : 0;
    const isAutoCalc = hasRecipeItems && !manualCostOverride;
    const isAutoCalcTax = hasRecipeItems && !manualTaxOverride;
    const effectivePurchasePrice = isAutoCalc ? recipeTotalCost.toFixed(2) : purchasePrice;
    const effectivePurchaseTaxRate = isAutoCalcTax ? recipeWeightedTaxRate.toFixed(1) : purchaseTaxRate;

    useEffect(() => {
        if (formLoadedRef.current) return;

        if (existingProduct) {
            setName(existingProduct.name);
            setCategoryId(existingProduct.category);
            setSku(existingProduct.sku || '');
            setDescription(existingProduct.description || '');
            setPortions(existingProduct.portions || []);
            setPrice(existingProduct.price?.toString() || '0');
            setPurchasePrice(existingProduct.purchasePrice?.toString() || '0');
            setTaxRate(existingProduct.taxRate?.toString() || '10');
            setPurchaseTaxRate(existingProduct.purchaseTaxRate?.toString() || '10');
            setPrice2(existingProduct.price2?.toString() || '0');
            setPrice3(existingProduct.price3?.toString() || '0');
            const mp = existingProduct.marketplacePrices;
            const mc = existingProduct.marketplaceCommissions;
            setMarketplaces({
                getir: { price: mp?.getir?.toString() || '0', commissionCourier: mc?.getir?.courier?.toString() || '35', commissionNoCourier: mc?.getir?.noCourier?.toString() || '13', deliveryMode: mc?.getir?.deliveryMode || 'kuryeli' },
                yemeksepeti: { price: mp?.yemeksepeti?.toString() || '0', commissionCourier: mc?.yemeksepeti?.courier?.toString() || '35', commissionNoCourier: mc?.yemeksepeti?.noCourier?.toString() || '13', deliveryMode: mc?.yemeksepeti?.deliveryMode || 'kuryeli' },
                trendyol: { price: mp?.trendyol?.toString() || '0', commissionCourier: mc?.trendyol?.courier?.toString() || '35', commissionNoCourier: mc?.trendyol?.noCourier?.toString() || '13', deliveryMode: mc?.trendyol?.deliveryMode || 'kuryeli' },
                migros: { price: mp?.migros?.toString() || '0', commissionCourier: mc?.migros?.courier?.toString() || '35', commissionNoCourier: mc?.migros?.noCourier?.toString() || '13', deliveryMode: mc?.migros?.deliveryMode || 'kuryeli' },
            });
            setIsActive(existingProduct.isActive ?? true);
            setTrackStock(existingProduct.trackStock ?? false);
            setStockQuantity(existingProduct.stockQuantity?.toString() || '0');
            setCriticalStockLevel(existingProduct.criticalStockLevel?.toString() || '0');
            setIcon(existingProduct.icon || 'restaurant');
            setImageUrl(existingProduct.imageUrl || '');
            setPackagingItems(existingProduct.packagingItems || []);
            setHasPortion((existingProduct.portions?.length ?? 0) > 0);
            setIsTaxExempt((existingProduct.taxRate === 0) && (existingProduct.purchaseTaxRate === 0));
            setShowInKitchen(existingProduct.showInKitchen ?? true);
            setIsRecipeProduct(existingProduct.isRecipeProduct ?? false);
            setRecipeItems(existingProduct.recipeItems || []);
            formLoadedRef.current = true;
        } else if (!isEditMode) {
            // Yeni ürün: ilk mevcut kategoriyi seç
            if (categories.length > 0 && !categoryId) {
                setCategoryId(categories[0].id);
            }
        }
    }, [existingProduct, categories, isEditMode]);

    const showSuccess = (message: string) => {
        setSuccessToast(message);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
            setSuccessToast(null);
        }, 2500);
    };

    const handleSave = () => {
        const missingFields: string[] = [];
        if (!name) missingFields.push('Ürün Adı');
        if (!categoryId) missingFields.push('Kategori');
        if (!sku) missingFields.push('Barkod / SKU');
        if (!taxRate) missingFields.push('KDV Oranı');
        const basePrice = portions.length > 0 ? Math.min(...portions.map(p => p.price)) : (parseFloat(price) || 0);
        if (portions.length === 0 && !parseFloat(price)) missingFields.push('Fiyat 1');

        if (missingFields.length > 0) {
            setErrorModal(`Lütfen şu alanları doldurunuz: ${missingFields.join(', ')}`);
            return;
        }

        const productData: Partial<Product> = {
            name,
            category: categoryId,
            sku,
            description,
            portions,
            icon,
            imageUrl: imageUrl || undefined,
            isActive,
            showInKitchen,
            trackStock,
            stockQuantity: parseFloat(stockQuantity) || 0,
            criticalStockLevel: parseFloat(criticalStockLevel) || 0,
            isRecipeProduct,
            recipeItems: isRecipeProduct ? recipeItems : [],
            packagingItems,
            price: basePrice,
            purchasePrice: parseFloat(effectivePurchasePrice) || 0,
            packageCost: packagingItems.reduce((sum, item) => sum + item.total, 0),
            taxRate: isTaxExempt ? 0 : (parseFloat(taxRate) || 0),
            purchaseTaxRate: isTaxExempt ? 0 : (parseFloat(effectivePurchaseTaxRate) || 0),
            price2: parseFloat(price2) || 0,
            price3: parseFloat(price3) || 0,
            marketplacePrices: {
                getir: parseFloat(marketplaces.getir.price) || 0,
                yemeksepeti: parseFloat(marketplaces.yemeksepeti.price) || 0,
                trendyol: parseFloat(marketplaces.trendyol.price) || 0,
                migros: parseFloat(marketplaces.migros.price) || 0,
            },
            marketplaceCommissions: Object.fromEntries(
                Object.entries(marketplaces).map(([key, mp]) => [key, {
                    courier: parseFloat(mp.commissionCourier) || 0,
                    noCourier: parseFloat(mp.commissionNoCourier) || 0,
                    deliveryMode: mp.deliveryMode,
                }])
            )
        };

        if (isEditMode && id) {
            updateProduct(id, productData);
            showSuccess('Ürün başarıyla güncellendi');
        } else {
            addProduct({
                ...productData,
            } as Omit<Product, 'id'>);
            showSuccess('Ürün başarıyla kaydedildi');
            setTimeout(() => navigate('/products'), 1200);
        }
    };

    const handleQuickAddCategory = () => {
        if (!newCategoryName.trim()) return;

        const newCat = {
            name: newCategoryName,
            icon: 'category',
            color: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            hover: 'hover:border-slate-300',
            iconColor: 'text-slate-500'
        };

        addCategory(newCat);
        setCategoryId(newCategoryName); // Store uses name as ID
        setNewCategoryName('');
        setIsAddingCategory(false);
    };

    const generateNextSku = () => {
        const neProducts = products
            .map(p => p.sku)
            .filter((s): s is string => !!s && /^NE\d{5}$/.test(s))
            .map(s => parseInt(s.slice(2), 10));
        const maxNum = neProducts.length > 0 ? Math.max(...neProducts) : 0;
        const nextNum = maxNum + 1;
        setSku(`NE${nextNum.toString().padStart(5, '0')}`);
    };

    const profitAmount = (parseFloat(price) || 0) - (parseFloat(effectivePurchasePrice) || 0);
    const profitMargin = (parseFloat(price) || 0) > 0 ? (profitAmount / (parseFloat(price) || 0)) * 100 : 0;

    const addPortion = () => {
        if (!newPortionName || !newPortionPrice) return;
        const newPortion: Portion = {
            id: crypto.randomUUID(),
            name: newPortionName,
            price: parseFloat(newPortionPrice)
        };
        setPortions([...portions, newPortion]);
        setNewPortionName('');
        setNewPortionPrice('');
    };

    const removePortion = (pId: string) => {
        setPortions(portions.filter(p => p.id !== pId));
    };

    const handlePortionChange = (id: string, field: 'name' | 'price', value: string | number) => {
        setPortions(portions.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">
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
                                <button
                                    onClick={() => navigate(-1)}
                                    className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0"
                                >
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">{isEditMode ? 'edit_note' : 'add_circle'}</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">{isEditMode ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h1>
                                <p className="text-white/60 text-xs mt-0.5">{isEditMode ? 'Mevcut ürün bilgilerini ve fiyatlandırmasını güncelleyin' : 'Envanterinize yeni bir ürün tanımlayın'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button onClick={() => navigate('/products')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 text-white/80 border border-white/10 hover:bg-white/20 transition-all text-sm font-medium">
                                <span className="material-symbols-outlined text-lg">close</span> Vazgeç
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-[#663259] hover:bg-white/90 transition-all text-sm font-bold shadow-lg shadow-black/10">
                                <span className="material-symbols-outlined text-lg">save</span> {isEditMode ? 'Güncellemeleri Kaydet' : 'Ürünü Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex gap-8 min-h-0">
                    <div className="w-1/3 flex flex-col gap-4 overflow-y-auto no-scrollbar pb-6">
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-soft p-6">
                            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <span className="material-symbols-outlined text-2xl">insights</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 tracking-tight">Pazaryeri Analizi</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Komisyon & Kar Marjı</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { key: 'getir', name: 'Getir', color: 'bg-[#5D3EBD]', lightBg: 'bg-[#5D3EBD]/5', textColor: 'text-[#5D3EBD]' },
                                    { key: 'yemeksepeti', name: 'Yemeksepeti', color: 'bg-[#EA1D2C]', lightBg: 'bg-[#EA1D2C]/5', textColor: 'text-[#EA1D2C]' },
                                    { key: 'trendyol', name: 'Trendyol', color: 'bg-[#F27A1A]', lightBg: 'bg-[#F27A1A]/5', textColor: 'text-[#F27A1A]' },
                                    { key: 'migros', name: 'Migros Yemek', color: 'bg-[#FF8200]', lightBg: 'bg-[#FF8200]/5', textColor: 'text-[#FF8200]' },
                                ].map((mp) => {
                                    const data = marketplaces[mp.key];
                                    const salePrice = parseFloat(data.price) || 0;
                                    const commRate = data.deliveryMode === 'kuryeli'
                                        ? (parseFloat(data.commissionCourier) || 0)
                                        : (parseFloat(data.commissionNoCourier) || 0);
                                    const commAmount = salePrice * (commRate / 100);
                                    const totalPackagingCost = packagingItems.reduce((s, item) => s + item.total, 0);
                                    const cost = (parseFloat(effectivePurchasePrice) || 0) + totalPackagingCost;
                                    const purchaseTax = (parseFloat(effectivePurchasePrice) || 0) * ((parseFloat(effectivePurchaseTaxRate) || 0) / 100);
                                    const saleTax = salePrice * ((parseFloat(taxRate) || 0) / 100);
                                    const taxToPay = saleTax - purchaseTax;
                                    const grossProfit = salePrice - commAmount - cost;
                                    const grossProfitRate = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
                                    const netProfit = grossProfit - taxToPay;
                                    const netProfitRate = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

                                    const updateField = (field: string, value: string) => {
                                        setMarketplaces(prev => ({
                                            ...prev,
                                            [mp.key]: { ...prev[mp.key], [field]: value }
                                        }));
                                    };

                                    return (
                                        <div key={mp.key} className={`${mp.lightBg} border border-slate-100 rounded-3xl p-5 space-y-4 transition-all duration-300 hover:shadow-md hover:shadow-slate-200/20`}>
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${mp.color} shadow-sm`}></div>
                                                    <span className={`text-sm font-black tracking-tight ${mp.textColor}`}>{mp.name}</span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[11px] font-black ${netProfit >= 0 ? 'bg-green-500/10 text-success' : 'bg-red-500/10 text-rose-500'}`}>
                                                    {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </div>
                                            </div>

                                            {/* Sale Price */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Satış Fiyatı</label>
                                                    <div className="relative group/input">
                                                        <input
                                                            className="form-input !py-2.5 !pl-3 !pr-8 font-black text-slate-700 bg-white shadow-sm ring-1 ring-slate-200/50"
                                                            placeholder="0,00"
                                                            type="number"
                                                            value={data.price}
                                                            onChange={(e) => updateField('price', e.target.value)}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 group-focus-within/input:text-secondary/40 transition-colors">₺</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Teslimat Tipi</label>
                                                    <div className="flex p-1 bg-white rounded-2xl ring-1 ring-slate-200/50 shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateField('deliveryMode', 'kuryeli')}
                                                            className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all ${data.deliveryMode === 'kuryeli' ? `${mp.color} text-white shadow-sm` : 'text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            Kuryeli
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateField('deliveryMode', 'kuryesiz')}
                                                            className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all ${data.deliveryMode === 'kuryesiz' ? `${mp.color} text-white shadow-sm` : 'text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            Kendi
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Commission Rates */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Komisyon (%)</label>
                                                    <input
                                                        className={`form-input !py-2 !px-3 text-xs font-black bg-white ring-1 ring-slate-200/50 ${data.deliveryMode === 'kuryeli' ? mp.textColor : 'text-slate-400'}`}
                                                        type="number"
                                                        value={data.deliveryMode === 'kuryeli' ? data.commissionCourier : data.commissionNoCourier}
                                                        onChange={(e) => updateField(data.deliveryMode === 'kuryeli' ? 'commissionCourier' : 'commissionNoCourier', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-center pt-5">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Tutar</p>
                                                        <p className={`text-xs font-black ${mp.textColor}`}>-{commAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Calculated Results */}
                                            {salePrice > 0 && (
                                                <div className="pt-4 border-t border-slate-200/40">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-2.5 border border-white/60">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Brüt Kar</span>
                                                                <span className={`text-[10px] font-black ${grossProfitRate >= 0 ? 'text-green-600' : 'text-rose-500'}`}>%{grossProfitRate.toFixed(1)}</span>
                                                            </div>
                                                            <p className={`text-sm font-black ${grossProfit >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                                                                {grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2.5 border border-white/80 shadow-inner">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] font-black text-secondary/60 uppercase">Net Kar</span>
                                                                <span className={`text-[10px] font-black ${netProfitRate >= 0 ? 'text-success' : 'text-rose-500'}`}>%{netProfitRate.toFixed(1)}</span>
                                                            </div>
                                                            <p className={`text-sm font-black ${netProfit >= 0 ? 'text-secondary' : 'text-rose-600'}`}>
                                                                {netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-6">
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-soft p-8">
                            <div className="grid grid-cols-12 gap-10">
                                <div className="col-span-12 lg:col-span-7 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Ürün Adı</label>
                                            <input
                                                className="form-input text-lg !py-3.5"
                                                placeholder="Örn: Özel Karışım Burger"
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Kategori Seçimi</label>
                                            <div className="flex h-[52px] items-stretch">
                                                {isAddingCategory ? (
                                                    <div className="flex-1 flex items-stretch animate-in fade-in slide-in-from-right-2 duration-300">
                                                        <input
                                                            className="form-input flex-1 !rounded-r-none !border-r-0"
                                                            placeholder="Yeni Kategori"
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleQuickAddCategory();
                                                                if (e.key === 'Escape') setIsAddingCategory(false);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={handleQuickAddCategory}
                                                            className="px-4 bg-success text-white flex items-center justify-center hover:bg-success-dark transition-all shadow-md shadow-success/10 border-l border-white/20"
                                                        >
                                                            <span className="material-symbols-outlined">check</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setIsAddingCategory(false)}
                                                            className="px-4 bg-slate-100 text-slate-500 rounded-r-2xl flex items-center justify-center hover:bg-slate-200 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined">close</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-1 items-stretch group/cat">
                                                        <div className="flex-1">
                                                            <CustomSelect
                                                                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                                                                value={categoryId}
                                                                onChange={(val) => setCategoryId(val)}
                                                                className="h-full [&>button]:h-full [&>button]:rounded-r-none [&>button]:border-r-0"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => setIsAddingCategory(true)}
                                                            className="px-5 bg-slate-900 text-white rounded-r-2xl flex items-center justify-center hover:bg-black transition-all shadow-lg shadow-black/10 group border-l border-white/5"
                                                            title="Hızlı Kategori Oluştur"
                                                        >
                                                            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Barkod / SKU</label>
                                            <div className="flex h-[52px] items-stretch">
                                                <input
                                                    className="form-input flex-1 h-full !rounded-r-none !border-r-0"
                                                    placeholder="NE00001"
                                                    type="text"
                                                    value={sku}
                                                    onChange={(e) => setSku(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={generateNextSku}
                                                    className="bg-secondary/5 text-secondary px-5 rounded-r-2xl flex items-center justify-center hover:bg-secondary/10 transition-all border border-secondary/20 border-l-secondary/10 group h-full"
                                                    title="Otomatik NE kodu oluştur"
                                                >
                                                    <span className="material-symbols-outlined text-xl mr-2 group-hover:rotate-12 transition-transform">qr_code_2</span>
                                                    <span className="text-[11px] font-black uppercase tracking-wider">Oluştur</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8">
                                        <div>
                                            <div className="flex items-center justify-between mb-2.5 ml-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Alış Fiyatı</label>
                                                {hasRecipeItems && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isAutoCalc) {
                                                                setPurchasePrice(recipeTotalCost.toFixed(2));
                                                            }
                                                            setManualCostOverride(!manualCostOverride);
                                                        }}
                                                        className="text-[9px] font-bold text-secondary/70 hover:text-secondary flex items-center gap-0.5 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">{isAutoCalc ? 'edit' : 'auto_fix_high'}</span>
                                                        {isAutoCalc ? 'El ile Gireceğim' : 'Otomatik Hesapla'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`relative ${isAutoCalc ? 'opacity-60 pointer-events-none' : ''}`}>
                                                <input
                                                    className="form-input text-lg font-black text-rose-600 !py-3 !pr-10"
                                                    placeholder="0,00"
                                                    type="number"
                                                    value={isAutoCalc ? recipeTotalCost.toFixed(2) : purchasePrice}
                                                    onChange={(e) => setPurchasePrice(e.target.value)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-rose-200">₺</span>
                                            </div>
                                            {isAutoCalc && (
                                                <p className="text-[9px] text-secondary/50 font-bold mt-1 ml-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                                                    Reçeteden otomatik hesaplandı
                                                </p>
                                            )}
                                        </div>
                                        <div className={isTaxExempt ? 'opacity-40 pointer-events-none' : ''}>
                                            <div className="flex items-center justify-between mb-2.5 ml-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Alış KDV (%)</label>
                                                {hasRecipeItems && !isTaxExempt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isAutoCalcTax) {
                                                                const nearest = [0, 1, 10, 20].reduce((a, b) => Math.abs(b - recipeWeightedTaxRate) < Math.abs(a - recipeWeightedTaxRate) ? b : a);
                                                                setPurchaseTaxRate(nearest.toString());
                                                            }
                                                            setManualTaxOverride(!manualTaxOverride);
                                                        }}
                                                        className="text-[9px] font-bold text-secondary/70 hover:text-secondary flex items-center gap-0.5 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">{isAutoCalcTax ? 'edit' : 'auto_fix_high'}</span>
                                                        {isAutoCalcTax ? 'El ile Gireceğim' : 'Otomatik Hesapla'}
                                                    </button>
                                                )}
                                            </div>
                                            {isAutoCalcTax && !isTaxExempt ? (
                                                <div>
                                                    <div className="form-input !py-3.5 text-sm font-black text-slate-600 bg-slate-50 rounded-2xl flex items-center justify-between opacity-60">
                                                        <span>%{recipeWeightedTaxRate.toFixed(1)}</span>
                                                        <span className="text-xs text-slate-400 font-bold">{((parseFloat(effectivePurchasePrice) || 0) * recipeWeightedTaxRate / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                                    </div>
                                                    <p className="text-[9px] text-secondary/50 font-bold mt-1 ml-1 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                                                        Ağırlıklı ortalama
                                                    </p>
                                                </div>
                                            ) : (
                                                <CustomSelect
                                                    options={[
                                                        { value: '0', label: '0%' },
                                                        { value: '1', label: '1%' },
                                                        { value: '10', label: '10%' },
                                                        { value: '20', label: '20%' },
                                                    ]}
                                                    value={isTaxExempt ? '0' : purchaseTaxRate}
                                                    onChange={(val) => setPurchaseTaxRate(val)}
                                                    disabled={isTaxExempt}
                                                    className="[&>button]:rounded-2xl [&>button]:py-3.5"
                                                />
                                            )}
                                        </div>
                                        <div className={isTaxExempt ? 'opacity-40 pointer-events-none' : ''}>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Satış KDV (%)</label>
                                            <CustomSelect
                                                options={[
                                                    { value: '0', label: '0%' },
                                                    { value: '1', label: '1%' },
                                                    { value: '10', label: '10%' },
                                                    { value: '20', label: '20%' },
                                                ]}
                                                value={isTaxExempt ? '0' : taxRate}
                                                onChange={(val) => setTaxRate(val)}
                                                disabled={isTaxExempt}
                                                className="[&>button]:rounded-2xl [&>button]:py-3.5"
                                            />
                                            {!isTaxExempt && parseFloat(price) > 0 && parseFloat(taxRate) > 0 && (
                                                <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-1 flex items-center justify-between">
                                                    <span>KDV Tutarı</span>
                                                    <span className="font-black text-slate-500">{((parseFloat(price) || 0) * (parseFloat(taxRate) || 0) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6 bg-slate-900/5 border border-slate-900/10 p-8 rounded-[32px] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-2xl transition-transform group-hover:scale-110"></div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-xl">payments</span>
                                                </div>
                                                <label className="block text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                                                    Satış Fiyatları
                                                </label>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tahmini Kar</p>
                                                <div className={`px-3 py-1 rounded-full ${profitAmount >= 0 ? 'bg-success/10 text-success' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    <span className="text-sm font-black whitespace-nowrap">
                                                        {profitAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (%{profitMargin.toFixed(1)})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6 relative z-10">
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 ml-1">Fiyat 1 (Genel)</label>
                                                <div className="relative group/price">
                                                    <input
                                                        className="form-input text-xl font-black text-secondary bg-white border-2 border-transparent shadow-md focus:border-secondary/40 !py-3.5 !pr-12 transition-all"
                                                        placeholder="0,00"
                                                        type="number"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-secondary/30">₺</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 ml-1">Fiyat 2</label>
                                                <div className="relative group/price">
                                                    <input
                                                        className="form-input text-xl font-black text-slate-400 focus:text-secondary bg-white/60 focus:bg-white border-2 border-transparent shadow-sm focus:border-secondary/20 !py-3.5 !pr-12 transition-all"
                                                        placeholder="0,00"
                                                        type="number"
                                                        value={price2}
                                                        onChange={(e) => setPrice2(e.target.value)}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">₺</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 ml-1">Fiyat 3</label>
                                                <div className="relative group/price">
                                                    <input
                                                        className="form-input text-xl font-black text-slate-400 focus:text-secondary bg-white/60 focus:bg-white border-2 border-transparent shadow-sm focus:border-secondary/20 !py-3.5 !pr-12 transition-all"
                                                        placeholder="0,00"
                                                        type="number"
                                                        value={price3}
                                                        onChange={(e) => setPrice3(e.target.value)}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">₺</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/50 px-4 py-2.5 rounded-2xl border border-white/80">
                                            <span className="material-symbols-outlined text-slate-400 text-base">info</span>
                                            <p className="text-[11px] text-slate-500 font-bold leading-tight">Bu fiyatlar sadece Hızlı Satış ekranında kullanılabilir. Diğer ekranlarda "Fiyat 1" geçerlidir.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Açıklaması</label>
                                        <textarea
                                            className="form-input !rounded-3xl min-h-[120px] resize-none"
                                            placeholder="Ürün içeriği, alerjen bilgileri vb."
                                            rows={3}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        ></textarea>
                                    </div>
                                    {/* Porsiyon bölümü şu an pasif - ileride açılabilir */}
                                    {false && hasPortion && (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Porsiyon &amp; Fiyatlandırma</label>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 bg-slate-200 border border-slate-200 rounded-xl overflow-hidden mb-2">
                                                {/* Header */}
                                                <div className="bg-slate-50 p-3 text-[10px] font-bold text-slate-400 uppercase">Porsiyon Adı</div>
                                                <div className="bg-slate-50 p-3 text-[10px] font-bold text-slate-400 uppercase">Fiyat (₺)</div>
                                                <div className="bg-slate-50 p-3 text-[10px] font-bold text-slate-400 uppercase text-center">İşlem</div>

                                                {/* List */}
                                                {portions.map((portion) => (
                                                    <React.Fragment key={portion.id}>
                                                        <div className="bg-white p-2">
                                                            <input
                                                                className="w-full border-none p-1 text-sm focus:ring-1 focus:ring-secondary rounded font-medium"
                                                                type="text"
                                                                value={portion.name}
                                                                onChange={(e) => handlePortionChange(portion.id, 'name', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="bg-white p-2">
                                                            <input
                                                                className="w-full border-none p-1 text-sm focus:ring-1 focus:ring-secondary rounded font-bold text-secondary"
                                                                type="number"
                                                                value={portion.price}
                                                                onChange={(e) => handlePortionChange(portion.id, 'price', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="bg-white p-2 flex items-center justify-center">
                                                            <button onClick={() => removePortion(portion.id)} className="text-slate-300 hover:text-red-500">
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            {/* Inputs for Adding New Portion */}
                                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-2 rounded-xl">
                                                <input
                                                    className="bg-white border rounded-lg p-2 text-sm"
                                                    placeholder="Yeni Porsiyon (Örn: Standart)"
                                                    value={newPortionName}
                                                    onChange={(e) => setNewPortionName(e.target.value)}
                                                />
                                                <input
                                                    className="bg-white border rounded-lg p-2 text-sm"
                                                    placeholder="Fiyat"
                                                    type="number"
                                                    value={newPortionPrice}
                                                    onChange={(e) => setNewPortionPrice(e.target.value)}
                                                />
                                                <button onClick={addPortion} className="bg-secondary text-white text-xs font-bold uppercase rounded-lg hover:bg-secondary-dark">Ekle</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recipe & Packaging Section — 2 Tab */}
                                    {isRecipeProduct && (() => {
                                        const activeItems = recipeTab === 'ingredients' ? recipeItems : packagingItems;
                                        const setActiveItems = recipeTab === 'ingredients' ? setRecipeItems : setPackagingItems;
                                        const activeTotal = activeItems.reduce((s, i) => s + i.total, 0);
                                        const tabIcon = recipeTab === 'ingredients' ? 'receipt_long' : 'inventory_2';
                                        const placeholderName = recipeTab === 'ingredients' ? 'Örn: Dana Kıyma' : 'Örn: Kraft Kutu';
                                        const placeholderDesc = recipeTab === 'ingredients'
                                            ? 'Açıklama (opsiyonel) — Örn: %80 yağsız, Kastamonu menşei'
                                            : 'Açıklama (opsiyonel) — Örn: 20x15cm, baskılı';
                                        const infoText = recipeTab === 'ingredients'
                                            ? 'Üretim için gereken malzemeler maliyet hesabında kullanılır.'
                                            : 'Paket/ambalaj kalemleri pazaryeri kar hesaplamasına dahil edilir.';

                                        return (
                                        <div className="space-y-6 bg-slate-50 border border-slate-200 p-8 rounded-[32px] relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16"></div>

                                            {/* Header + Toplam */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-xl">{tabIcon}</span>
                                                    </div>
                                                    <label className="block text-xs font-black text-secondary uppercase tracking-widest">
                                                        {recipeTab === 'ingredients' ? 'Ürün Reçetesi' : 'Paket Maliyetleri'}
                                                    </label>
                                                </div>
                                                {activeTotal > 0 && (
                                                    <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Toplam Maliyet</p>
                                                        <p className="text-base font-black text-secondary">
                                                            {activeTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm relative z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipeTab('ingredients')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all ${recipeTab === 'ingredients' ? 'bg-secondary text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <span className="material-symbols-outlined text-base">receipt_long</span>
                                                    Ana Ürün Maliyetleri
                                                    {recipeItems.length > 0 && (
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${recipeTab === 'ingredients' ? 'bg-white/20' : 'bg-slate-100'}`}>{recipeItems.length}</span>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipeTab('packaging')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all ${recipeTab === 'packaging' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <span className="material-symbols-outlined text-base">inventory_2</span>
                                                    Paket Maliyetleri
                                                    {packagingItems.length > 0 && (
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${recipeTab === 'packaging' ? 'bg-white/20' : 'bg-slate-100'}`}>{packagingItems.length}</span>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Items Table */}
                                            {activeItems.length > 0 && (
                                                <div className="overflow-hidden rounded-[24px] border border-slate-200 shadow-sm relative z-10">
                                                    <table className="w-full border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-100/80 backdrop-blur-sm">
                                                                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Malzeme</th>
                                                                <th className="text-center p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Miktar</th>
                                                                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Birim</th>
                                                                <th className="text-center p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Birim Fiyat</th>
                                                                <th className="text-center p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20">KDV (%)</th>
                                                                <th className="text-right p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Toplam</th>
                                                                <th className="p-4 w-12"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-slate-100">
                                                            {activeItems.map((item) => (
                                                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                                    <td className="p-3">
                                                                        <input
                                                                            className="w-full bg-transparent border-none px-2 py-1.5 text-sm font-black text-slate-700 focus:ring-2 focus:ring-secondary/10 rounded-xl outline-none"
                                                                            type="text"
                                                                            value={item.name}
                                                                            onChange={(e) => {
                                                                                setActiveItems(prev => prev.map(r => r.id === item.id ? { ...r, name: e.target.value } : r));
                                                                            }}
                                                                        />
                                                                        {item.description && (
                                                                            <p className="px-2 mt-0.5 text-[10px] text-slate-400 font-medium leading-tight truncate">{item.description}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <input
                                                                            className="w-full bg-slate-50 border-none px-2 py-1.5 text-sm font-black text-slate-700 text-center focus:ring-2 focus:ring-secondary/10 rounded-xl outline-none"
                                                                            type="number"
                                                                            value={item.quantity}
                                                                            onChange={(e) => {
                                                                                const qty = parseFloat(e.target.value) || 0;
                                                                                setActiveItems(prev => prev.map(r => r.id === item.id ? { ...r, quantity: qty, total: qty * r.unitPrice } : r));
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <CustomSelect
                                                                            options={[
                                                                                { value: 'Adet', label: 'Adet' },
                                                                                { value: 'Gram', label: 'Gram' },
                                                                                { value: 'Litre', label: 'Litre' },
                                                                                { value: 'Paket', label: 'Paket' },
                                                                                { value: 'Metre', label: 'Metre' },
                                                                            ]}
                                                                            value={item.unit}
                                                                            onChange={(val) => {
                                                                                setActiveItems(prev => prev.map(r => r.id === item.id ? { ...r, unit: val as RecipeItem['unit'] } : r));
                                                                            }}
                                                                            className="[&>button]:py-1.5 [&>button]:px-3 [&>button]:rounded-xl [&>button]:text-xs [&>button]:font-black"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="relative group/price">
                                                                            <input
                                                                                className="w-full bg-white border border-slate-200 px-2 py-1.5 text-sm font-black text-secondary text-center focus:ring-2 focus:ring-secondary/10 rounded-xl outline-none"
                                                                                type="number"
                                                                                value={item.unitPrice}
                                                                                onChange={(e) => {
                                                                                    const up = parseFloat(e.target.value) || 0;
                                                                                    setActiveItems(prev => prev.map(r => r.id === item.id ? { ...r, unitPrice: up, total: r.quantity * up } : r));
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <CustomSelect
                                                                            options={[
                                                                                { value: '0', label: '0%' },
                                                                                { value: '1', label: '1%' },
                                                                                { value: '10', label: '10%' },
                                                                                { value: '20', label: '20%' },
                                                                            ]}
                                                                            value={(item.taxRate ?? 10).toString()}
                                                                            onChange={(val) => {
                                                                                setActiveItems(prev => prev.map(r => r.id === item.id ? { ...r, taxRate: parseFloat(val) || 0 } : r));
                                                                            }}
                                                                            className="[&>button]:py-1.5 [&>button]:px-2 [&>button]:rounded-xl [&>button]:text-xs [&>button]:font-black"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        <span className="text-sm font-black text-success tracking-tight">
                                                                            {item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveItems(prev => prev.filter(r => r.id !== item.id))}
                                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* New Item Input */}
                                            <div className="p-4 bg-white/60 rounded-[28px] border border-slate-200 shadow-inner relative z-10 space-y-3">
                                                <div className="flex gap-3 items-end">
                                                <div className="flex-[2.5]">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Malzeme</label>
                                                    <input
                                                        className="form-input !py-2.5 bg-white border-slate-200/60"
                                                        placeholder={placeholderName}
                                                        value={newRecipeName}
                                                        onChange={(e) => setNewRecipeName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Miktar</label>
                                                    <input
                                                        className="form-input !py-2.5 bg-white border-slate-200/60 text-center"
                                                        placeholder="0"
                                                        type="number"
                                                        value={newRecipeQuantity}
                                                        onChange={(e) => setNewRecipeQuantity(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Birim</label>
                                                    <CustomSelect
                                                        options={[
                                                            { value: 'Adet', label: 'Adet' },
                                                            { value: 'Gram', label: 'Gram' },
                                                            { value: 'Litre', label: 'Litre' },
                                                            { value: 'Paket', label: 'Paket' },
                                                            { value: 'Metre', label: 'Metre' },
                                                        ]}
                                                        value={newRecipeUnit}
                                                        onChange={(val) => setNewRecipeUnit(val as RecipeItem['unit'])}
                                                        className="[&>button]:py-2.5 [&>button]:px-3 [&>button]:rounded-2xl [&>button]:text-xs [&>button]:font-black"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Birim Fiyat</label>
                                                    <div className="relative">
                                                        <input
                                                            className="form-input !py-2.5 bg-white border-slate-200/60 text-center"
                                                            placeholder="0,00"
                                                            type="number"
                                                            value={newRecipeUnitPrice}
                                                            onChange={(e) => setNewRecipeUnitPrice(e.target.value)}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">₺</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">KDV (%)</label>
                                                    <CustomSelect
                                                        options={[
                                                            { value: '0', label: '0%' },
                                                            { value: '1', label: '1%' },
                                                            { value: '10', label: '10%' },
                                                            { value: '20', label: '20%' },
                                                        ]}
                                                        value={newRecipeTaxRate}
                                                        onChange={(val) => setNewRecipeTaxRate(val)}
                                                        className="[&>button]:py-2.5 [&>button]:px-3 [&>button]:rounded-2xl [&>button]:text-xs [&>button]:font-black"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!newRecipeName.trim() || !newRecipeQuantity || !newRecipeUnitPrice) return;
                                                        const qty = parseFloat(newRecipeQuantity) || 0;
                                                        const up = parseFloat(newRecipeUnitPrice) || 0;
                                                        const newItem: RecipeItem = {
                                                            id: crypto.randomUUID(),
                                                            name: newRecipeName.trim(),
                                                            description: newRecipeDesc.trim() || undefined,
                                                            quantity: qty,
                                                            unit: newRecipeUnit,
                                                            unitPrice: up,
                                                            total: qty * up,
                                                            taxRate: parseFloat(newRecipeTaxRate) || 0,
                                                        };
                                                        setActiveItems(prev => [...prev, newItem]);
                                                        setNewRecipeName('');
                                                        setNewRecipeDesc('');
                                                        setNewRecipeQuantity('');
                                                        setNewRecipeUnitPrice('');
                                                        setNewRecipeUnit('Adet');
                                                        setNewRecipeTaxRate('10');
                                                    }}
                                                    className={`w-12 h-[46px] text-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0 ${recipeTab === 'ingredients' ? 'bg-secondary shadow-secondary/20' : 'bg-amber-500 shadow-amber-500/20'}`}
                                                >
                                                    <span className="material-symbols-outlined text-xl">add</span>
                                                </button>
                                                </div>
                                                {/* Açıklama satırı */}
                                                <div>
                                                    <input
                                                        className="form-input !py-2 bg-white border-slate-200/60 text-xs text-slate-500"
                                                        placeholder={placeholderDesc}
                                                        value={newRecipeDesc}
                                                        onChange={(e) => setNewRecipeDesc(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                                                <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-wider">
                                                    {infoText}
                                                </p>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>
                                <div className="col-span-12 lg:col-span-5 space-y-6">
                                    {/* Image Upload */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Görseli</label>
                                        <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 shadow-inner">
                                            {imageUrl ? (
                                                <div className="relative group">
                                                    <img
                                                        src={imageUrl}
                                                        alt="Ürün görseli"
                                                        className="w-full h-40 object-cover rounded-2xl border border-slate-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <label className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors shadow-md">
                                                            <span className="material-symbols-outlined text-lg text-slate-700">edit</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => setImageUrl(reader.result as string);
                                                                    reader.readAsDataURL(file);
                                                                }}
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setImageUrl('')}
                                                            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center hover:bg-rose-50 transition-colors shadow-md"
                                                        >
                                                            <span className="material-symbols-outlined text-lg text-rose-500">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-secondary/40 hover:bg-secondary/5 transition-all group">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                                                        <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-secondary transition-colors">add_photo_alternate</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-secondary/70 transition-colors">Görsel Yükle</span>
                                                    <span className="text-[9px] text-slate-300 mt-0.5">PNG, JPG, WEBP</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setImageUrl(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Icon Selection — %30 küçültülmüş */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Simgesi</label>
                                        <div className="bg-slate-50 p-3 rounded-[20px] border border-slate-100 shadow-inner">
                                            <div className="grid grid-cols-6 gap-1.5">
                                                {[
                                                    'lunch_dining', 'local_drink', 'restaurant', 'cake', 'coffee',
                                                    'local_pizza', 'ramen_dining', 'set_meal', 'icecream', 'bakery_dining',
                                                    'kebab_dining', 'egg', 'soup_kitchen', 'rice_bowl', 'local_bar',
                                                    'sports_bar', 'wine_bar', 'fastfood', 'tapas', 'skillet_cooktop',
                                                ].map((ic) => (
                                                    <button
                                                        key={ic}
                                                        type="button"
                                                        onClick={() => setIcon(ic)}
                                                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${icon === ic
                                                            ? 'bg-secondary text-white shadow-lg shadow-secondary/40 scale-110 z-10'
                                                            : 'bg-white border border-slate-200/50 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">{ic}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-1.5">
                                            <span className="material-symbols-outlined text-slate-400 text-xs">info</span>
                                            <p className="text-[9px] text-slate-400 font-bold leading-tight uppercase tracking-wider">
                                                Görsel yoksa simge kullanılır. Seçilmezse sistem otomatik atar.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Operasyonel Durum</label>

                                        <div className="grid grid-cols-1 gap-3">
                                            {/* Active Status */}
                                            <div className={`flex items-center justify-between px-5 py-4 rounded-3xl border transition-all cursor-pointer ${isActive ? 'bg-success/5 border-success/20' : 'bg-white border-slate-100 hover:bg-gray-50'}`} onClick={() => setIsActive(!isActive)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-success/20 text-success' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined">check_circle</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] font-black text-slate-700 tracking-tight block">Satışa Açık</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isActive ? 'Ürün menüde görünür' : 'Ürün menüde gizli'}</span>
                                                    </div>
                                                </div>
                                                <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isActive ? 'bg-success' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-all duration-300 ${isActive ? 'bg-white left-8' : 'bg-white left-1'}`}></div>
                                                </div>
                                            </div>

                                            {/* Stock Tracking */}
                                            <div className="space-y-3">
                                                <div className={`flex items-center justify-between px-5 py-4 rounded-3xl border transition-all cursor-pointer ${trackStock ? 'bg-secondary/5 border-secondary/20' : 'bg-white border-slate-100 hover:bg-gray-50'}`} onClick={() => setTrackStock(!trackStock)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${trackStock ? 'bg-secondary/20 text-secondary' : 'bg-slate-100 text-slate-400'}`}>
                                                            <span className="material-symbols-outlined">inventory</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[13px] font-black text-slate-700 tracking-tight block">Stok Takibi</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{trackStock ? 'Stok takibi aktif' : 'Stok takibi kapalı'}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${trackStock ? 'bg-secondary' : 'bg-slate-200'}`}>
                                                        <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-all duration-300 ${trackStock ? 'bg-white left-8' : 'bg-white left-1'}`}></div>
                                                    </div>
                                                </div>

                                                {trackStock && (
                                                    <div className="grid grid-cols-2 gap-4 p-5 bg-white border border-secondary/10 rounded-[32px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Stok Miktarı</label>
                                                            <input
                                                                className="form-input !py-2.5 font-black !rounded-2xl"
                                                                type="number"
                                                                value={stockQuantity}
                                                                onChange={(e) => setStockQuantity(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-rose-400 uppercase tracking-wider mb-1.5 ml-1">Kritik Seviye</label>
                                                            <input
                                                                className="form-input !py-2.5 font-black !rounded-2xl text-rose-500 focus:border-rose-300"
                                                                type="number"
                                                                value={criticalStockLevel}
                                                                onChange={(e) => setCriticalStockLevel(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recipe Product Toggle */}
                                            <div className={`flex items-center justify-between px-5 py-4 rounded-3xl border transition-all cursor-pointer ${isRecipeProduct ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white border-slate-100 hover:bg-gray-50'}`} onClick={() => setIsRecipeProduct(!isRecipeProduct)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isRecipeProduct ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined">receipt_long</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] font-black text-slate-700 tracking-tight block">Reçeteli Ürün</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hammadde kullanımı</span>
                                                    </div>
                                                </div>
                                                <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isRecipeProduct ? 'bg-amber-500' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-all duration-300 ${isRecipeProduct ? 'bg-white left-8' : 'bg-white left-1'}`}></div>
                                                </div>
                                            </div>

                                            {/* Tax Exempt Toggle */}
                                            <div className={`flex items-center justify-between px-5 py-4 rounded-3xl border transition-all cursor-pointer ${isTaxExempt ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white border-slate-100 hover:bg-gray-50'}`} onClick={() => { setIsTaxExempt(!isTaxExempt); if (!isTaxExempt) { setTaxRate('0'); setPurchaseTaxRate('0'); } }}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isTaxExempt ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined">money_off</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] font-black text-slate-700 tracking-tight block">KDV Muafiyeti</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vergisiz satış</span>
                                                    </div>
                                                </div>
                                                <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isTaxExempt ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-all duration-300 ${isTaxExempt ? 'bg-white left-8' : 'bg-white left-1'}`}></div>
                                                </div>
                                            </div>

                                            {/* Show in Kitchen Toggle */}
                                            <div className={`flex items-center justify-between px-5 py-4 rounded-3xl border transition-all cursor-pointer ${showInKitchen ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white border-slate-100 hover:bg-gray-50'}`} onClick={() => setShowInKitchen(!showInKitchen)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${showInKitchen ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined">soup_kitchen</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] font-black text-slate-700 tracking-tight block">Mutfak Ekranı</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sipariş listesinde göster</span>
                                                    </div>
                                                </div>
                                                <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${showInKitchen ? 'bg-orange-500' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 rounded-full absolute top-1 shadow-sm transition-all duration-300 ${showInKitchen ? 'bg-white left-8' : 'bg-white left-1'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
            />

            {/* Success Toast */}
            {successToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center gap-3 bg-white border border-green-200 shadow-lg shadow-green-100/50 rounded-xl px-5 py-4">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{successToast}</p>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {errorModal && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center gap-3 bg-white border border-red-200 shadow-lg shadow-red-100/50 rounded-xl px-5 py-4">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{errorModal}</p>
                        <button onClick={() => setErrorModal(null)} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductForm;
