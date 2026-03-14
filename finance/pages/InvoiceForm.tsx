import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText,
    Plus,
    Trash2,
    Search,
} from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import { useProductStore } from '../../products';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import { useInvoiceStore } from '../stores/useInvoiceStore';

interface InvoiceItem {
    id: string;
    name: string;
    productId?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    total: number;
}

const PURCHASE_TYPES = [
    { value: 'toptan_alis', label: 'Toptan Alış' },
    { value: 'perakende_alis', label: 'Perakende Alış' },
    { value: 'ithalat_irsaliyesi', label: 'İthalat İrsaliyesi' },
    { value: 'masraf', label: 'Masraf' },
    { value: 'iade', label: 'İade' },
    { value: 'fiyat_farki', label: 'Fiyat Farkı' },
    { value: 'kur_farki', label: 'Kur Farkı' },
    { value: 'tevkifat', label: 'Tevkifat' },
];

const SALE_TYPES = [
    { value: 'toptan_satis', label: 'Toptan Satış' },
    { value: 'perakende_satis', label: 'Perakende Satış' },
    { value: 'ihracat_faturasi', label: 'İhracat Faturası' },
    { value: 'komisyon', label: 'Komisyon' },
    { value: 'iade', label: 'İade' },
    { value: 'fiyat_farki', label: 'Fiyat Farkı' },
    { value: 'kur_farki', label: 'Kur Farkı' },
    { value: 'istisna', label: 'İstisna' },
    { value: 'yazar_kasa', label: 'Yazar Kasa' },
];

const InvoiceForm: React.FC = () => {
    const { id: companyId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const direction = (searchParams.get('direction') as 'purchase' | 'sale') || 'purchase';
    const navigate = useNavigate();
    const { products, updateProduct } = useProductStore();
    const { addTransaction, getCompanyById } = useCompanyStore();
    const { addInvoice, getNextInvoiceNo } = useInvoiceStore();

    const company = companyId ? getCompanyById(companyId) : undefined;
    const isPurchase = direction === 'purchase';

    const invoiceTypes = isPurchase ? PURCHASE_TYPES : SALE_TYPES;

    const [invoiceType, setInvoiceType] = useState(isPurchase ? 'toptan_alis' : 'toptan_satis');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Generate invoice number on mount
    useEffect(() => {
        getNextInvoiceNo(direction).then(no => setInvoiceNo(no));
    }, [direction]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectProduct = (itemId: string, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const unitPrice = product.price;
            const vatRate = product.taxRate ?? 20;
            return { ...item, name: product.name, productId: product.id, unitPrice, vatRate, total: item.quantity * unitPrice };
        }));
        setActiveDropdown(null);
    };

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', name: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20, total: 0 },
    ]);

    const addItem = () => {
        setItems([
            ...items,
            {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                quantity: 1,
                unit: 'Adet',
                unitPrice: 0,
                vatRate: 20,
                total: 0,
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(prev =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, [field]: value };
                if (field === 'name') {
                    const matchedProduct = products.find(p => p.id === item.productId);
                    if (!matchedProduct || matchedProduct.name !== value) {
                        updated.productId = undefined;
                    }
                }
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            })
        );
    };

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalVat = items.reduce((sum, item) => sum + (item.total * item.vatRate) / 100, 0);
    const grandTotal = subtotal + totalVat;

    const handleSave = async () => {
        if (!companyId) return;

        const validItems = items.filter(i => i.name);
        if (validItems.length === 0) return;

        // Stock update
        const currentProducts = useProductStore.getState().products;
        validItems.forEach(item => {
            const product = item.productId
                ? currentProducts.find(p => p.id === item.productId)
                : currentProducts.find(p => p.name === item.name);
            if (!product || product.trackStock === false) return;
            const currentStock = product.stockQuantity ?? 0;
            if (isPurchase) {
                updateProduct(product.id, { stockQuantity: currentStock + item.quantity });
            } else {
                updateProduct(product.id, { stockQuantity: Math.max(0, currentStock - item.quantity) });
            }
        });

        // Save to new invoice DB
        const invoiceId = crypto.randomUUID();
        try {
            await addInvoice(
                {
                    id: invoiceId,
                    invoice_no: invoiceNo,
                    invoice_type: invoiceType,
                    direction,
                    company_id: companyId,
                    company_name: company?.name || '',
                    date: invoiceDate,
                    due_date: dueDate || undefined,
                    description: description || undefined,
                    subtotal,
                    vat_total: totalVat,
                    grand_total: grandTotal,
                    payment_status: 'unpaid',
                    status: 'active',
                },
                validItems.map(item => ({
                    id: crypto.randomUUID(),
                    product_id: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unitPrice,
                    vat_rate: item.vatRate,
                    total: item.total,
                }))
            );
        } catch (err) {
            console.error('Invoice DB save error:', err);
        }

        // Backward compat: Also save to CompanyTransaction
        const itemNames = validItems.map(i => i.name).join(', ');
        addTransaction({
            companyId,
            date: invoiceDate,
            description: description || `${isPurchase ? 'Alış' : 'Satış'} Faturası${itemNames ? ': ' + itemNames : ''}`,
            type: 'purchase',
            amount: grandTotal,
            invoiceNo: invoiceNo || undefined,
            status: 'completed',
        });

        navigate(`/finance/companies/${companyId}`);
    };

    const accentColor = isPurchase ? '#3B82F6' : '#10B981';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Header Card */}
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                    <div className="flex items-center gap-3 pl-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${accentColor}15` }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: accentColor }}>
                                {isPurchase ? 'shopping_cart' : 'sell'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#1F2937]">
                                {isPurchase ? 'Alış Faturası Oluştur' : 'Satış Faturası Oluştur'}
                            </h2>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                                {company ? company.name : 'Firma bilgisi yükleniyor...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/finance/companies/${companyId}`)}
                            className="px-5 py-3 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all font-bold text-sm active:scale-95"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all font-bold text-sm shadow-lg active:scale-95"
                            style={{ backgroundColor: accentColor }}
                        >
                            <FileText size={18} />
                            <span>FATURAYI KAYDET</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        {/* Invoice Info */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                            <h3 className="font-black text-gray-800 text-lg mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                                    <FileText size={20} />
                                </div>
                                Fatura Bilgileri
                            </h3>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* Invoice Type */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura Türü</label>
                                    <CustomSelect
                                        options={invoiceTypes}
                                        value={invoiceType}
                                        onChange={(val) => setInvoiceType(val)}
                                        placeholder="Fatura türü seçin"
                                        accentColor={accentColor}
                                    />
                                </div>

                                {/* Invoice No */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura No</label>
                                    <input
                                        type="text"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        placeholder={isPurchase ? 'ALI-001' : 'SAT-001'}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                    />
                                </div>

                                {/* Invoice Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fatura Tarihi</label>
                                    <DatePicker
                                        value={invoiceDate}
                                        onChange={setInvoiceDate}
                                        icon="calendar_today"
                                        placeholder="Tarih seçin"
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vade Tarihi</label>
                                    <DatePicker
                                        value={dueDate}
                                        onChange={setDueDate}
                                        icon="event"
                                        placeholder="Tarih seçin"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Invoice Items */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-black text-gray-800 text-lg flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">list_alt</span>
                                    </div>
                                    Kalemler
                                </h3>

                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={searchProduct}
                                            onChange={(e) => setSearchProduct(e.target.value)}
                                            placeholder="Ürün ara..."
                                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 w-56 transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={addItem}
                                        className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all font-bold text-xs active:scale-95 shadow-md"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        <Plus size={16} />
                                        <span>KALEM EKLE</span>
                                    </button>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-8">#</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ürün / Hizmet</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40">Miktar</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Birim</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-56">Birim Fiyat</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40">KDV %</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48 text-right">Tutar</th>
                                            <th className="px-6 py-4 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                                                <td className="px-6 py-3">
                                                    <span className="text-xs font-black text-gray-300">{index + 1}</span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="relative" ref={activeDropdown === item.id ? dropdownRef : undefined}>
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => {
                                                                updateItem(item.id, 'name', e.target.value);
                                                                setActiveDropdown(item.id);
                                                            }}
                                                            onFocus={() => setActiveDropdown(item.id)}
                                                            placeholder="Ürün veya hizmet adı"
                                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                                                        />
                                                        {activeDropdown === item.id && (() => {
                                                            const query = item.name.toLowerCase();
                                                            const filtered = products.filter(p =>
                                                                p.name.toLowerCase().includes(query)
                                                            );
                                                            if (filtered.length === 0) return null;
                                                            return (
                                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                                                    {filtered.map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                selectProduct(item.id, p.id);
                                                                            }}
                                                                            className="w-full px-3 py-2.5 text-left hover:bg-[#663259]/5 transition-colors flex items-center justify-between gap-2"
                                                                        >
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span className="material-symbols-outlined text-gray-400 text-base shrink-0">{p.icon || 'inventory_2'}</span>
                                                                                <span className="text-sm font-bold text-gray-700 truncate">{p.name}</span>
                                                                            </div>
                                                                            <span className="text-xs font-black text-[#663259] shrink-0">₺{p.price.toLocaleString('tr-TR')}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                        min="0"
                                                        step="1"
                                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 text-center transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <CustomSelect
                                                        options={[
                                                            { value: 'Adet', label: 'Adet' },
                                                            { value: 'Kg', label: 'Kg' },
                                                            { value: 'Lt', label: 'Lt' },
                                                            { value: 'Paket', label: 'Paket' },
                                                            { value: 'Koli', label: 'Koli' },
                                                            { value: 'Metre', label: 'Metre' },
                                                        ]}
                                                        value={item.unit}
                                                        onChange={(val) => updateItem(item.id, 'unit', val)}
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                        min="0"
                                                        step="1"
                                                        placeholder="0,00"
                                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#663259]/10 text-right transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <CustomSelect
                                                        options={[
                                                            { value: '0', label: '%0' },
                                                            { value: '1', label: '%1' },
                                                            { value: '10', label: '%10' },
                                                            { value: '20', label: '%20' },
                                                        ]}
                                                        value={String(item.vatRate)}
                                                        onChange={(val) => updateItem(item.id, 'vatRate', Number(val))}
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="text-base font-black text-gray-800">
                                                        {item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}₺
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length <= 1}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-300 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Description & Totals */}
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                                <div className="flex gap-6">
                                    {/* Description */}
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıklama</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Fatura açıklaması..."
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#663259] focus:ring-2 focus:ring-[#663259]/20 hover:border-slate-300 transition-all resize-none min-h-[120px]"
                                        />
                                    </div>

                                    {/* Totals */}
                                    <div className="w-80 shrink-0">
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                                                <span className="text-sm font-bold text-gray-500">Toplam</span>
                                                <span className="text-base font-black text-gray-600">
                                                    {subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                                                <span className="text-sm font-bold text-gray-500">KDV</span>
                                                <span className="text-base font-black text-gray-600">
                                                    {totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-4 bg-white">
                                                <span className="text-sm font-black text-gray-700">Net</span>
                                                <span className="text-xl font-black tracking-tight" style={{ color: accentColor }}>
                                                    {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </span>
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
    );
};

export default InvoiceForm;
