/**
 * Product Sync Service
 * DAT-189: DathaDesktop yerel urun/kategori verilerini backend'e senkronize eder
 *
 * Akis: Kategoriler ONCE sync edilir (FK bagimliligi), sonra urunler.
 */
import { api, isOnline } from '../../_shared/api';
import { useProductStore } from '../stores/useProductStore';
import type { Product, Category } from '../types';

interface SyncResult {
    categories: number;
    products: number;
    errors: string[];
}

/**
 * Yerel Product yapisini backend CreateProductDto formatina donusturur
 */
function mapLocalToBackendProduct(
    prod: Product,
    backendCategoryId: string,
): Record<string, unknown> {
    const mapped: Record<string, unknown> = {
        name: prod.name,
        categoryId: backendCategoryId,
        price: prod.price,
        costPrice: prod.purchasePrice ?? undefined,
        description: prod.description ?? undefined,
        productCode: prod.sku ?? undefined,
        isActive: prod.isActive !== false,
        trackStock: prod.trackStock ?? false,
        stockQty: prod.stockQuantity ?? 0,
        sortOrder: 0,
    };

    // Opsiyonel alanlar — sadece tanımlıysa gönder
    if (prod.taxRate != null) mapped.taxRate = prod.taxRate;
    if (prod.purchaseTaxRate != null) mapped.purchaseTaxRate = prod.purchaseTaxRate;
    if (prod.price2 != null) mapped.price2 = prod.price2;
    if (prod.price3 != null) mapped.price3 = prod.price3;
    if (prod.criticalStockLevel != null) mapped.criticalStockLevel = prod.criticalStockLevel;
    if (prod.imageUrl) mapped.imageUrl = prod.imageUrl;
    if (prod.icon) mapped.icon = prod.icon;
    if (prod.showInKitchen != null) mapped.showInKitchen = prod.showInKitchen;
    if (prod.packageCost != null) mapped.packageCost = prod.packageCost;
    if (prod.isRecipeProduct != null) mapped.isRecipeProduct = prod.isRecipeProduct;
    if (prod.updatedAt) mapped.updatedAt = prod.updatedAt;

    // JSON alanları
    if (prod.portions && prod.portions.length > 0) {
        mapped.portions = prod.portions.map((p) => ({
            name: p.name,
            unit: 'PORSIYON' as const,
            price: p.price,
            isDefault: false,
        }));
    }
    if (prod.recipeItems && prod.recipeItems.length > 0) {
        mapped.recipeItems = prod.recipeItems;
    }
    if (prod.packagingItems && prod.packagingItems.length > 0) {
        mapped.packagingItems = prod.packagingItems;
    }
    if (prod.marketplacePrices) mapped.marketplacePrices = prod.marketplacePrices;
    if (prod.marketplaceCommissions) mapped.marketplaceCommissions = prod.marketplaceCommissions;
    if (prod.loyaltyPointType) {
        mapped.loyaltyPointType = prod.loyaltyPointType;
        mapped.loyaltyPointValue = prod.loyaltyPointValue;
    }

    return mapped;
}

/**
 * Backend'den mevcut kategorileri ceker (eslestirme icin)
 */
async function fetchServerCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
        const { data }: { data: unknown } = await api.get('/categories/active');
        const payload = data as { data?: unknown; success?: boolean };
        const list = Array.isArray(payload) ? payload
            : Array.isArray(payload.data) ? payload.data
            : [];
        return list.map((c: Record<string, unknown>) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? ''),
        }));
    } catch {
        return [];
    }
}

export const productSyncService = {
    /**
     * Tum yerel kategori ve urunleri backend'e gonder
     * Ilk kurulum veya manuel toplu senkronizasyon icin
     */
    async syncAll(): Promise<SyncResult> {
        if (!isOnline()) {
            return { categories: 0, products: 0, errors: ['Cevrimdisi — internet baglantisi yok'] };
        }

        const store = useProductStore.getState();
        const errors: string[] = [];
        let categoryCount = 0;
        let productCount = 0;

        // Adim 1: Mevcut backend kategorilerini cek (eslestirme icin)
        const serverCats = await fetchServerCategories();
        const categoryMap = new Map<string, string>(); // localName -> serverId

        // Onceden eslesmis kategorileri map'e ekle
        for (const cat of store.categories) {
            if (cat.serverId) {
                categoryMap.set(cat.name, cat.serverId);
            }
        }

        // Adim 2: Kategorileri sync et
        for (const cat of store.categories) {
            try {
                if (cat.serverId) {
                    // Zaten sync edilmis — guncelle
                    await api.patch(`/categories/${cat.serverId}`, {
                        name: cat.name,
                        isActive: true,
                    });
                    categoryMap.set(cat.name, cat.serverId);
                } else {
                    // Backend'de ayni isimli kategori var mi kontrol et
                    const existing = serverCats.find(
                        (sc) => sc.name.toLowerCase() === cat.name.toLowerCase(),
                    );

                    if (existing) {
                        // Mevcut kategoriyi eslestir
                        categoryMap.set(cat.name, existing.id);
                        useProductStore.getState().updateCategory(cat.id, { serverId: existing.id });
                        categoryCount++;
                    } else {
                        // Yeni kategori olustur
                        const { data }: { data: unknown } = await api.post('/categories', {
                            name: cat.name,
                            sortOrder: store.categories.indexOf(cat),
                            isActive: true,
                        });
                        const resp = data as Record<string, unknown>;
                        const serverId = String(resp.id ?? (resp.data as Record<string, unknown>)?.id ?? '');
                        if (serverId) {
                            categoryMap.set(cat.name, serverId);
                            useProductStore.getState().updateCategory(cat.id, { serverId });
                            categoryCount++;
                        }
                    }
                }
            } catch (err: unknown) {
                const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
                if (axiosErr.response?.status === 409) {
                    // Duplikat — backend'den taze liste cek ve eslestir
                    const freshCats = await fetchServerCategories();
                    const match = freshCats.find(
                        (sc) => sc.name.toLowerCase() === cat.name.toLowerCase(),
                    );
                    if (match) {
                        categoryMap.set(cat.name, match.id);
                        useProductStore.getState().updateCategory(cat.id, { serverId: match.id });
                    }
                } else {
                    errors.push(`Kategori '${cat.name}': ${axiosErr.response?.data?.message ?? 'Bilinmeyen hata'}`);
                }
            }
        }

        // Adim 3: Urunleri sync et
        for (const prod of store.products) {
            const backendCategoryId = categoryMap.get(prod.category)
                ?? store.categories.find((c) => c.name === prod.category)?.serverId;

            if (!backendCategoryId) {
                errors.push(`Urun '${prod.name}': Kategori '${prod.category}' backend'de bulunamadi`);
                continue;
            }

            try {
                const backendProduct = mapLocalToBackendProduct(prod, backendCategoryId);

                if (prod.serverId) {
                    // Mevcut urunu guncelle
                    await api.patch(`/products/${prod.serverId}`, backendProduct);
                } else {
                    // Yeni urun olustur
                    const { data }: { data: unknown } = await api.post('/products', backendProduct);
                    const resp = data as Record<string, unknown>;
                    const serverId = String(resp.id ?? (resp.data as Record<string, unknown>)?.id ?? '');
                    if (serverId) {
                        useProductStore.getState().updateProduct(prod.id, { serverId });
                        productCount++;
                    }
                }
            } catch (err: unknown) {
                const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
                const msg = axiosErr.response?.data?.message ?? 'Bilinmeyen hata';
                errors.push(`Urun '${prod.name}': ${msg}`);
            }
        }

        return { categories: categoryCount, products: productCount, errors };
    },

    /**
     * Tek kategori olustur/guncelle
     */
    async pushCategory(cat: Category): Promise<string | null> {
        if (!isOnline()) return null;

        try {
            if (cat.serverId) {
                await api.patch(`/categories/${cat.serverId}`, {
                    name: cat.name,
                    isActive: true,
                });
                return cat.serverId;
            }

            // Mevcut eslestirme kontrolu
            const serverCats = await fetchServerCategories();
            const existing = serverCats.find(
                (sc) => sc.name.toLowerCase() === cat.name.toLowerCase(),
            );
            if (existing) return existing.id;

            const { data }: { data: unknown } = await api.post('/categories', {
                name: cat.name,
                isActive: true,
            });
            const resp = data as Record<string, unknown>;
            return String(resp.id ?? (resp.data as Record<string, unknown>)?.id ?? '') || null;
        } catch {
            return null;
        }
    },

    /**
     * Tek urun olustur/guncelle
     */
    async pushProduct(prod: Product, categoryServerId: string): Promise<string | null> {
        if (!isOnline()) return null;

        try {
            const backendProduct = mapLocalToBackendProduct(prod, categoryServerId);

            if (prod.serverId) {
                await api.patch(`/products/${prod.serverId}`, backendProduct);
                return prod.serverId;
            }

            const { data }: { data: unknown } = await api.post('/products', backendProduct);
            const resp = data as Record<string, unknown>;
            return String(resp.id ?? (resp.data as Record<string, unknown>)?.id ?? '') || null;
        } catch {
            return null;
        }
    },

    /**
     * Backend'den kayit sil (soft delete)
     */
    async deleteOnServer(type: 'product' | 'category', serverId: string): Promise<boolean> {
        if (!isOnline() || !serverId) return false;

        try {
            const endpoint = type === 'product' ? '/products' : '/categories';
            await api.delete(`${endpoint}/${serverId}`);
            return true;
        } catch {
            return false;
        }
    },
};

export default productSyncService;
