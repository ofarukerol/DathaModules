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
    // KRITIK: Backend CreateProductDto.forbidNonWhitelisted=true — DTO'da OLMAYAN
    // alanlar 400 BadRequest firlatir. Asagidaki liste DTO ile birebir uyumludur;
    // taxRate / price2 / icon / showInKitchen / packageCost / isRecipeProduct /
    // recipeItems / packagingItems / marketplacePrices / marketplaceCommissions /
    // loyaltyPointType / loyaltyPointValue / updatedAt — bu alanlar henuz backend
    // DTO'sunda DESTEKLENMIYOR, sync sirasinda gonderilmez. Backend gelistigi zaman
    // DTO'ya eklenir ve buraya ekleme yapilabilir.
    const mapped: Record<string, unknown> = {
        name: prod.name,
        categoryId: backendCategoryId,
        price: prod.price,
    };

    // Opsiyonel — sadece tanimliysa ekle, undefined gondermez (whitelist hatasi olmaz)
    if (prod.purchasePrice != null) mapped.costPrice = prod.purchasePrice;
    if (prod.description) mapped.description = prod.description;
    if (prod.aiNote) mapped.aiNote = prod.aiNote; // #6 — AI-only gizli not
    if (prod.sku) mapped.productCode = prod.sku;
    if (typeof prod.isActive === 'boolean') mapped.isActive = prod.isActive;
    if (typeof prod.trackStock === 'boolean') mapped.trackStock = prod.trackStock;
    if (typeof prod.stockQuantity === 'number') mapped.stockQty = prod.stockQuantity;
    if (prod.criticalStockLevel != null) mapped.criticalStockLevel = prod.criticalStockLevel;
    if (prod.imageUrl) mapped.imageUrl = prod.imageUrl;

    // Portions: DTO ile uyumlu sekil
    if (prod.portions && prod.portions.length > 0) {
        mapped.portions = prod.portions.map((p) => ({
            name: p.name,
            unit: 'PORSIYON' as const,
            price: p.price,
            isDefault: false,
        }));
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
