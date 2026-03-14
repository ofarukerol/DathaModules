import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../stores/useProductStore';
import type { Product } from '../types';
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List, Settings2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import CategoryModal from '../components/CategoryModal';
import HeaderActions from '../components/HeaderActions';

const ProductList: React.FC = () => {
    const navigate = useNavigate();
    const { products, deleteProduct, categories } = useProductStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // View Mode State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    // Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    // Determine default view mode based on product count
    useEffect(() => {
        if (products.length >= 50) {
            setViewMode('list');
        } else {
            setViewMode('grid');
        }
    }, [products.length]);

    // Filter Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const currentProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const openAddPage = () => {
        navigate('/products/new');
    };

    const openEditPage = (product: Product) => {
        navigate(`/products/edit/${product.id}`);
    };

    const promptDelete = (id: string) => {
        setProductToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    const activeCount = products.filter(p => p.isActive !== false).length;

    return (
        <div className="flex flex-col h-full bg-[#F3F4F6] p-4 lg:p-6 overflow-hidden">
            {/* Header */}
            <header className="flex flex-col gap-4 mb-4 shrink-0">
                {/* Gradient Card Header */}
                <div className="relative overflow-hidden rounded-2xl shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}>
                    {/* Dekoratif çemberler */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        {/* Sol: Başlık + İstatistikler */}
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
                                <span className="material-symbols-outlined text-white text-[26px]">inventory_2</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Ürün Yönetimi</h1>
                                <p className="text-white/60 text-xs mt-0.5">Ürün kataloğunuzu yönetin</p>
                            </div>
                            {/* Stat chips */}
                            <div className="hidden md:flex items-center gap-3 ml-2">
                                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-center">
                                    <p className="text-white font-black text-lg leading-none">{products.length}</p>
                                    <p className="text-white/60 text-[10px] font-medium mt-0.5 uppercase tracking-wider">Toplam</p>
                                </div>
                                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-center">
                                    <p className="text-emerald-300 font-black text-lg leading-none">{activeCount}</p>
                                    <p className="text-white/60 text-[10px] font-medium mt-0.5 uppercase tracking-wider">Aktif</p>
                                </div>
                                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-center">
                                    <p className="text-amber-300 font-black text-lg leading-none">{categories.length}</p>
                                    <p className="text-white/60 text-[10px] font-medium mt-0.5 uppercase tracking-wider">Kategori</p>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Arama + Ekle */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="relative hidden sm:block">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-white/50 text-[18px]">search</span>
                                </div>
                                <input
                                    className="block w-52 pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 text-sm transition-all"
                                    placeholder="Ürün Ara..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={openAddPage}
                                className="flex items-center gap-2 bg-white text-[#663259] px-4 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:bg-white/90 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span className="hidden sm:inline text-sm">Yeni Ürün</span>
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    {/* Category Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors whitespace-nowrap border border-transparent hover:border-gray-300"
                            title="Kategorileri Düzenle"
                        >
                            <Settings2 size={18} />
                        </button>
                        <div className="h-8 w-[1px] bg-gray-300 mx-1"></div>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all whitespace-nowrap ${selectedCategory === 'all'
                                ? 'bg-[#663259] text-white shadow-[#663259]/20'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">apps</span>
                            Tümü
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap border ${selectedCategory === cat.id
                                    ? 'bg-white border-[#F97171] text-[#F97171] shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* View Switcher */}
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Izgara Görünümü"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Liste Görünümü"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Products Content */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
                {currentProducts.length > 0 ? (
                    viewMode === 'grid' ? (
                        // GRID VIEW
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {currentProducts.map(product => {
                                const category = categories.find(c => c.id === product.category);
                                return (
                                    <div key={product.id} onClick={() => openEditPage(product)} className="group bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#F97171]/30 transition-all duration-300 relative flex flex-col h-[280px] cursor-pointer">
                                        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); openEditPage(product); }} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); promptDelete(product.id); }} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                        <div className={`h-32 w-full ${category?.color || 'bg-gray-100'}/50 rounded-lg mb-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300`}>
                                            <span className="material-symbols-outlined text-[64px] text-gray-600 drop-shadow-sm">{product.icon || 'inventory_2'}</span>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{product.name}</h3>
                                                <div className={`w-2 h-2 rounded-full mt-2 ${product.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`} title={product.isActive !== false ? "Aktif" : "Pasif"}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description || 'Açıklama yok'}</p>
                                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fiyat</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-lg font-black text-gray-800">₺{product.price}</span>
                                                        {(product.price2 ?? 0) > 0 && <span className="text-[10px] font-bold text-slate-400">/ {product.price2}₺</span>}
                                                        {(product.price3 ?? 0) > 0 && <span className="text-[10px] font-bold text-slate-400">/ {product.price3}₺</span>}
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${category?.color} ${category?.text} ${category?.border}`}>
                                                    {category?.name || 'Genel'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Add New Card (always last in grid) */}
                            <div onClick={openAddPage} className="group bg-gray-50 rounded-xl p-5 border-2 border-dashed border-gray-200 hover:border-[#F97171] hover:bg-white transition-all duration-300 relative flex flex-col h-[280px] items-center justify-center cursor-pointer">
                                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#F97171] text-[32px] transition-colors">add</span>
                                </div>
                                <h3 className="font-bold text-gray-500 group-hover:text-[#F97171] text-lg transition-colors">Yeni Ürün Ekle</h3>
                                <p className="text-xs text-gray-400 mt-2 text-center px-4">Listeye yeni bir ürün eklemek için tıklayın.</p>
                            </div>
                        </div>
                    ) : (
                        // LIST VIEW
                        <div className="flex flex-col gap-3">
                            {currentProducts.map(product => {
                                const category = categories.find(c => c.id === product.category);
                                return (
                                    <div key={product.id} onClick={() => openEditPage(product)} className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F97171]/30 transition-all flex items-center gap-4 cursor-pointer">
                                        <div className={`w-16 h-16 ${category?.color || 'bg-gray-100'}/50 rounded-lg flex items-center justify-center shrink-0`}>
                                            <span className="material-symbols-outlined text-[32px] text-gray-600">{product.icon || 'inventory_2'}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-800 text-lg truncate">{product.name}</h3>
                                                <div className={`w-2 h-2 rounded-full ${product.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`} title={product.isActive !== false ? "Aktif" : "Pasif"}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{product.description || 'Açıklama yok'} • SKU: {product.sku || '-'}</p>
                                        </div>

                                        <div className="flex items-center gap-6 shrink-0">
                                            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap hidden sm:block ${category?.color} ${category?.text} ${category?.border}`}>
                                                {category?.name || 'Genel'}
                                            </span>
                                            <div className="flex flex-col items-end min-w-[80px]">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fiyat</span>
                                                <div className="flex items-baseline gap-1.5 justify-end w-full">
                                                    <span className="text-lg font-black text-gray-800">₺{product.price}</span>
                                                    {(product.price2 ?? 0) > 0 && <span className="text-[10px] font-bold text-slate-400">/ {product.price2}₺</span>}
                                                    {(product.price3 ?? 0) > 0 && <span className="text-[10px] font-bold text-slate-400">/ {product.price3}₺</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
                                                <button onClick={(e) => { e.stopPropagation(); openEditPage(product); }} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); promptDelete(product.id); }} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-gray-300" />
                        </div>
                        <p className="font-medium">Ürün bulunamadı</p>
                        <button onClick={() => { setSearchQuery(''); setSelectedCategory('all') }} className="mt-2 text-[#663259] font-bold hover:underline">Filtreleri Temizle</button>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pt-4  flex items-center justify-between shrink-0">
                    <div className="text-sm text-gray-500 font-medium">
                        Toplam {filteredProducts.length} kayıttan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} gösteriliyor
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`w-9 h-9 rounded-lg font-bold text-sm transition-colors ${currentPage === page
                                    ? 'bg-[#663259] text-white shadow-md'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                message={`Bu ürünü silmek istediğinizden emin misiniz?`}
                title="Ürünü Sil"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="SİL"
                type="danger"
            />
        </div>
    );
};

export default ProductList;
