import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getReadyDb } from '../../_shared/db';
import type { Product, Category, OrderNote } from '../types';

/** Ürün güncellemesini hemen backend'e push et (queue'ya ek, best-effort) */
async function immediatePushProduct(localId: string) {
    try {
        // Lazy import — circular dependency önlemi
        const { productSyncService } = await import('../services/productSyncService');
        const { isOnline } = await import('../../_shared/api');
        if (!isOnline()) return;
        const store = useProductStore.getState();
        const prod = store.products.find((p) => p.id === localId);
        if (!prod?.serverId) return;
        const catServerId = store.categories.find((c) => c.name === prod.category)?.serverId;
        if (!catServerId) return;
        await productSyncService.pushProduct(prod, catServerId);
    } catch {
        // Best-effort — başarısız olursa queue zaten yedek
    }
}

async function enqueueSyncEvent(eventType: string, payload: Record<string, unknown>) {
    try {
        const db = await getReadyDb();
        if (!db) return;
        const id = crypto.randomUUID();
        await db.execute(
            `INSERT INTO sync_queue (id, event_type, payload_json, status, retry_count, created_at)
             VALUES ($1, $2, $3, 'PENDING', 0, datetime('now'))`,
            [id, eventType, JSON.stringify(payload)],
        );
    } catch {
        // Sync queue yazimi basarisiz — yerel islem etkilenmez
    }
}

interface ProductStore {
    products: Product[];
    categories: Category[];
    quickNotes: string[];
    orderNotes: OrderNote[];
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    addCategory: (category: Omit<Category, 'id'>) => void;
    updateCategory: (id: string, updates: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
    addQuickNote: (note: string) => void;
    removeQuickNote: (note: string) => void;
    addOrderNote: (text: string) => void;
    updateOrderNote: (id: string, text: string) => void;
    removeOrderNote: (id: string) => void;
    mergeServerData: (serverProducts: Product[], serverCategories: Category[]) => void;
    clearAll: () => void;
}

export const useProductStore = create<ProductStore>()(
    persist(
        (set) => ({
            products: [],
            categories: [],
            quickNotes: ['Az Pişmiş', 'Orta Pişmiş', 'Çok Pişmiş', 'Soğansız', 'Acısız', 'Bol Soslu', 'Paket Olsun'],
            orderNotes: [
                { id: '1', text: 'Acele sipariş' },
                { id: '2', text: 'Kapıda bırakın' },
                { id: '3', text: 'Zili çalmayın' },
                { id: '4', text: 'Müşteri alerjik - fıstık' },
                { id: '5', text: 'Ekstra peçete' },
            ],
            addProduct: (product) => {
                const id = crypto.randomUUID();
                const now = new Date().toISOString();
                set((state) => ({
                    products: [...state.products, { trackStock: true, stockQuantity: 0, ...product, id, updatedAt: now }]
                }));
                enqueueSyncEvent('PRODUCT_CREATED', { localId: id, ...product });
            },
            updateProduct: (id, updates) => {
                const prev = useProductStore.getState().products.find((p) => p.id === id);
                const now = new Date().toISOString();
                // serverId güncellemesi dışında her değişiklikte updatedAt damgası bas
                const stamped = updates.serverId ? updates : { ...updates, updatedAt: now };
                set((state) => ({
                    products: state.products.map((p) => (p.id === id ? { ...p, ...stamped } : p))
                }));
                if (prev?.serverId && !updates.serverId) {
                    enqueueSyncEvent('PRODUCT_UPDATED', { localId: id, serverId: prev.serverId, ...updates });
                    // Queue'ya ek olarak hemen push et (best-effort, queue yedek)
                    immediatePushProduct(id);
                }
            },
            deleteProduct: (id) => {
                const prev = useProductStore.getState().products.find((p) => p.id === id);
                set((state) => ({
                    products: state.products.filter((p) => p.id !== id)
                }));
                if (prev?.serverId) {
                    enqueueSyncEvent('PRODUCT_DELETED', { localId: id, serverId: prev.serverId });
                }
            },
            addCategory: (category) => {
                set((state) => ({
                    categories: [...state.categories, { ...category, id: category.name }]
                }));
                enqueueSyncEvent('CATEGORY_CREATED', { localId: category.name, name: category.name });
            },
            updateCategory: (id, updates) => {
                const prev = useProductStore.getState().categories.find((c) => c.id === id);
                set((state) => ({
                    categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c))
                }));
                if (prev?.serverId && !updates.serverId) {
                    enqueueSyncEvent('CATEGORY_UPDATED', { localId: id, serverId: prev.serverId, name: updates.name || prev.name });
                }
            },
            deleteCategory: (id) => {
                const prev = useProductStore.getState().categories.find((c) => c.id === id);
                set((state) => ({
                    categories: state.categories.filter((c) => c.id !== id)
                }));
                if (prev?.serverId) {
                    enqueueSyncEvent('CATEGORY_DELETED', { localId: id, serverId: prev.serverId });
                }
            },
            addQuickNote: (note) => set((state) => ({
                quickNotes: state.quickNotes.includes(note) ? state.quickNotes : [...state.quickNotes, note]
            })),
            removeQuickNote: (note) => set((state) => ({
                quickNotes: state.quickNotes.filter((n) => n !== note)
            })),
            addOrderNote: (text) => set((state) => ({
                orderNotes: [...state.orderNotes, { id: Date.now().toString(), text }]
            })),
            updateOrderNote: (id, text) => set((state) => ({
                orderNotes: state.orderNotes.map((n) => n.id === id ? { ...n, text } : n)
            })),
            removeOrderNote: (id) => set((state) => ({
                orderNotes: state.orderNotes.filter((n) => n.id !== id)
            })),
            mergeServerData: (serverProducts, serverCategories) => {
                // Server'dan gelen undefined alanları filtrele — lokal veriyi ezmesin
                const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
                    const result: Record<string, unknown> = {};
                    for (const [key, val] of Object.entries(obj)) {
                        if (val !== undefined) result[key] = val;
                    }
                    return result;
                };

                set((state) => {
                    // Merge categories: match by serverId or name
                    const mergedCats = [...state.categories];
                    for (const sCat of serverCategories) {
                        const existingIdx = mergedCats.findIndex(
                            (c) => c.serverId === sCat.serverId || c.name.toLowerCase() === sCat.name.toLowerCase()
                        );
                        if (existingIdx >= 0) {
                            mergedCats[existingIdx] = { ...mergedCats[existingIdx], serverId: sCat.serverId, name: sCat.name };
                        } else {
                            mergedCats.push(sCat);
                        }
                    }

                    // Merge products: match by serverId, then by name+category
                    // Desktop esas kaynak: lokal updatedAt daha yeniyse server verisi lokal veriyi EZMEZ.
                    // Server verisi sadece tanımlı alanları günceller, lokal-only alanları EZMEz.
                    const mergedProducts = [...state.products];
                    for (const sProd of serverProducts) {
                        const cleanServer = stripUndefined(sProd as unknown as Record<string, unknown>);
                        const existingIdx = mergedProducts.findIndex((p) => p.serverId === sProd.serverId);
                        if (existingIdx >= 0) {
                            const local = mergedProducts[existingIdx];
                            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
                            const serverTime = sProd.updatedAt
                                ? new Date(sProd.updatedAt).getTime()
                                : 0;

                            if (localTime > serverTime) {
                                // Lokal daha güncel — sadece serverId eşleştir, veri ezme
                                mergedProducts[existingIdx] = {
                                    ...local,
                                    serverId: sProd.serverId,
                                } as Product;
                            } else {
                                // Server daha güncel veya eşit — normal merge
                                mergedProducts[existingIdx] = {
                                    ...local,
                                    ...cleanServer,
                                    id: local.id,
                                    updatedAt: local.updatedAt, // lokal timestamp'i koru
                                } as Product;
                            }
                        } else {
                            const nameMatch = mergedProducts.findIndex(
                                (p) => !p.serverId && p.name.toLowerCase() === sProd.name.toLowerCase() && p.category.toLowerCase() === sProd.category.toLowerCase()
                            );
                            if (nameMatch >= 0) {
                                const local = mergedProducts[nameMatch];
                                const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
                                const serverTime = sProd.updatedAt
                                    ? new Date(sProd.updatedAt).getTime()
                                    : 0;

                                if (localTime > serverTime) {
                                    mergedProducts[nameMatch] = {
                                        ...local,
                                        serverId: sProd.serverId,
                                    } as Product;
                                } else {
                                    mergedProducts[nameMatch] = {
                                        ...local,
                                        ...cleanServer,
                                        id: local.id,
                                        updatedAt: local.updatedAt,
                                    } as Product;
                                }
                            } else {
                                mergedProducts.push(sProd);
                            }
                        }
                    }

                    return { products: mergedProducts, categories: mergedCats };
                });
            },
            clearAll: () => set({ products: [], categories: [], quickNotes: [], orderNotes: [] }),
        }),
        {
            name: 'product-store',
            version: 4,
            migrate: (persistedState: any, version) => {
                if (version < 2) return {};
                if (version < 3) return persistedState;
                if (version < 4) {
                    const old = persistedState as any;
                    const demoProductIds = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25']);
                    const demoCategoryIds = new Set(['Burgerler','İçecekler','Salatalar','Ana Yemekler','Atıştırmalıklar','Çorbalar','Tatlılar','Kahveler']);
                    return {
                        ...old,
                        products: (old.products || []).filter((p: any) => !demoProductIds.has(p.id) || p.serverId),
                        categories: (old.categories || []).filter((c: any) => !demoCategoryIds.has(c.id) || c.serverId),
                    };
                }
                return persistedState;
            },
        }
    )
);
