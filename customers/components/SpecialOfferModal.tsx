import { useState, useMemo } from 'react';
import { X, Percent, DollarSign, Gift, Trash2, Check } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useCustomerStore } from '../store';
import type { SpecialOffer, SpecialOfferType } from '../types';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import { uuidv7 } from '@/utils/uuid';

interface SpecialOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    existingOffers?: SpecialOffer[];
    products: { id: string; name: string; price: number; isActive?: boolean }[];
}

const OFFER_TYPES: { value: SpecialOfferType; label: string; icon: typeof Percent; color: string; bg: string }[] = [
    { value: 'percentage', label: 'Yüzde İndirim', icon: Percent, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    { value: 'fixed_amount', label: 'Sabit Tutar', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
    { value: 'free_product', label: 'Ücretsiz Ürün', icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
];

export default function SpecialOfferModal({ isOpen, onClose, customerId, customerName, existingOffers = [], products }: SpecialOfferModalProps) {
    useEscapeKey(onClose, isOpen);

    const { updateCustomer } = useCustomerStore();

    const [offerType, setOfferType] = useState<SpecialOfferType>('percentage');
    const [value, setValue] = useState('');
    const [productId, setProductId] = useState('');
    const [description, setDescription] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [error, setError] = useState('');

    const activeProducts = useMemo(() =>
        products.filter(p => p.isActive !== false).map(p => ({
            value: p.id,
            label: p.name,
            subtitle: `${p.price.toLocaleString('tr-TR')}₺`,
        })),
        [products]
    );

    const selectedProduct = useMemo(() =>
        products.find(p => p.id === productId),
        [products, productId]
    );

    const activeOffers = existingOffers.filter(o => !o.isUsed);
    const usedOffers = existingOffers.filter(o => o.isUsed);

    const resetForm = () => {
        setOfferType('percentage');
        setValue('');
        setProductId('');
        setDescription('');
        setValidUntil('');
        setError('');
    };

    const handleSave = () => {
        setError('');

        if (offerType === 'free_product' && !productId) {
            setError('Lütfen bir ürün seçin');
            return;
        }

        if (offerType !== 'free_product') {
            const numValue = parseFloat(value);
            if (!value || isNaN(numValue) || numValue <= 0) {
                setError('Lütfen geçerli bir değer girin');
                return;
            }
            if (offerType === 'percentage' && numValue > 100) {
                setError('Yüzde değeri 100\'den büyük olamaz');
                return;
            }
        }

        let desc = description;
        if (!desc) {
            if (offerType === 'percentage') desc = `%${value} indirim`;
            else if (offerType === 'fixed_amount') desc = `${value}₺ indirim`;
            else if (selectedProduct) desc = `${selectedProduct.name} ikram`;
        }

        const newOffer: SpecialOffer = {
            id: uuidv7(),
            type: offerType,
            value: offerType === 'free_product' ? (selectedProduct?.price || 0) : parseFloat(value),
            productId: offerType === 'free_product' ? productId : undefined,
            productName: offerType === 'free_product' ? selectedProduct?.name : undefined,
            description: desc,
            validUntil: validUntil || undefined,
            isUsed: false,
            createdAt: new Date().toISOString(),
        };

        updateCustomer(customerId, {
            specialOffers: [...existingOffers, newOffer],
        });

        resetForm();
    };

    const handleDelete = (offerId: string) => {
        updateCustomer(customerId, {
            specialOffers: existingOffers.filter(o => o.id !== offerId),
        });
    };

    const formatOfferLabel = (offer: SpecialOffer) => {
        if (offer.type === 'percentage') return `%${offer.value} İndirim`;
        if (offer.type === 'fixed_amount') return `${offer.value.toLocaleString('tr-TR')}₺ İndirim`;
        return `${offer.productName || 'Ürün'} İkram`;
    };

    const getOfferTypeConfig = (type: SpecialOfferType) =>
        OFFER_TYPES.find(t => t.value === type) || OFFER_TYPES[0];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[540px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0"
                     style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 100%)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                            <Gift size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Özel Teklif Tanımla</h2>
                            <p className="text-[11px] text-white/60 mt-0.5">{customerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X size={18} className="text-white/70" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Teklif Tipi Seçimi */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Teklif Tipi</label>
                        <div className="grid grid-cols-3 gap-2">
                            {OFFER_TYPES.map(t => {
                                const Icon = t.icon;
                                const isSelected = offerType === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        onClick={() => { setOfferType(t.value); setError(''); }}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${isSelected ? `${t.bg} border-current ${t.color} shadow-sm` : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-[11px] font-bold">{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Değer Girişi */}
                    {offerType !== 'free_product' && (
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-2 block">
                                {offerType === 'percentage' ? 'İndirim Yüzdesi' : 'İndirim Tutarı'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={value}
                                    onChange={e => { setValue(e.target.value); setError(''); }}
                                    placeholder={offerType === 'percentage' ? 'Ör: 15' : 'Ör: 50'}
                                    min="0"
                                    max={offerType === 'percentage' ? '100' : undefined}
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none text-sm font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                    {offerType === 'percentage' ? '%' : '₺'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Ürün Seçimi */}
                    {offerType === 'free_product' && (
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-2 block">İkram Edilecek Ürün</label>
                            <CustomSelect
                                options={activeProducts}
                                value={productId}
                                onChange={v => { setProductId(v); setError(''); }}
                                placeholder="Ürün seçin"
                                searchPlaceholder="Ürün ara..."
                                accentColor="#663259"
                            />
                        </div>
                    )}

                    {/* Açıklama */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Açıklama <span className="font-normal text-gray-400">(opsiyonel)</span></label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ör: Doğum günü hediyesi"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none text-sm"
                        />
                    </div>

                    {/* Geçerlilik */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Geçerlilik Tarihi <span className="font-normal text-gray-400">(opsiyonel)</span></label>
                        <DatePicker
                            value={validUntil}
                            onChange={setValidUntil}
                            placeholder="Süresiz"
                            icon="event"
                        />
                    </div>

                    {/* Hata */}
                    {error && (
                        <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    {/* Kaydet Butonu */}
                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-[#663259] text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Teklif Ekle
                    </button>

                    {/* Mevcut Aktif Teklifler */}
                    {activeOffers.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-emerald-500">local_offer</span>
                                Aktif Teklifler ({activeOffers.length})
                            </h3>
                            <div className="space-y-2">
                                {activeOffers.map(offer => {
                                    const config = getOfferTypeConfig(offer.type);
                                    const isExpired = offer.validUntil && new Date(offer.validUntil) < new Date();
                                    return (
                                        <div key={offer.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg.split(' ')[0]}`}>
                                                <config.icon size={14} className={config.color} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800">{formatOfferLabel(offer)}</p>
                                                {offer.description && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{offer.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    {offer.validUntil && (
                                                        <span className={`text-[9px] font-medium ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {isExpired ? 'Süresi doldu' : `${new Date(offer.validUntil).toLocaleDateString('tr-TR')}'e kadar`}
                                                        </span>
                                                    )}
                                                    {!offer.validUntil && (
                                                        <span className="text-[9px] text-gray-400">Süresiz</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(offer.id)}
                                                className="shrink-0 w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 size={13} className="text-red-400" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Kullanılmış Teklifler */}
                    {usedOffers.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                                <Check size={12} className="text-gray-400" />
                                Kullanılmış ({usedOffers.length})
                            </h3>
                            <div className="space-y-1.5">
                                {usedOffers.slice(0, 3).map(offer => (
                                    <div key={offer.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-lg opacity-60">
                                        <Check size={12} className="text-emerald-500 shrink-0" />
                                        <p className="text-[10px] text-gray-500 line-through truncate">{formatOfferLabel(offer)}</p>
                                        {offer.usedAt && (
                                            <span className="text-[9px] text-gray-400 shrink-0">{new Date(offer.usedAt).toLocaleDateString('tr-TR')}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
