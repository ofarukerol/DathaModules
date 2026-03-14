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
            products: [
                // ── Burgerler (4) ──
                { id: '1', name: 'Cheeseburger', price: 180, category: 'Burgerler', description: '180gr dana eti, cheddar, turşu, özel sos', icon: 'lunch_dining', trackStock: true, stockQuantity: 50 },
                { id: '2', name: 'BBQ Burger', price: 195, category: 'Burgerler', description: 'Barbekü sos, karamelize soğan, füme et', icon: 'lunch_dining', trackStock: true, stockQuantity: 40 },
                { id: '3', name: 'Double Burger', price: 240, category: 'Burgerler', description: '2x 180gr dana eti, cheddar, soğan', icon: 'lunch_dining', trackStock: true, stockQuantity: 30 },
                { id: '12', name: 'Mantar Burger', price: 205, category: 'Burgerler', description: 'Sote mantar, swiss peyniri, özel sos', icon: 'lunch_dining', trackStock: true, stockQuantity: 25 },
                // ── İçecekler (5) ──
                { id: '4', name: 'Coca Cola', price: 45, category: 'İçecekler', description: '330ml Kutu', icon: 'local_drink', trackStock: true, stockQuantity: 100 },
                { id: '5', name: 'Ayran', price: 30, category: 'İçecekler', description: '300ml Şişe', icon: 'local_drink', trackStock: true, stockQuantity: 80 },
                { id: '13', name: 'Çay', price: 20, category: 'İçecekler', description: 'Demlik çay', icon: 'local_drink', trackStock: true, stockQuantity: 200 },
                { id: '14', name: 'Limonata', price: 55, category: 'İçecekler', description: 'Taze sıkılmış limon, nane', icon: 'local_drink', trackStock: true, stockQuantity: 60 },
                { id: '15', name: 'Su (500ml)', price: 15, category: 'İçecekler', description: '500ml Şişe su', icon: 'local_drink', trackStock: true, stockQuantity: 150 },
                // ── Salatalar (2) ──
                { id: '6', name: 'Mevsim Salata', price: 85, category: 'Salatalar', description: 'Taze yeşillikler, zeytinyağı sos', icon: 'restaurant', trackStock: true, stockQuantity: 30 },
                { id: '7', name: 'Sezar Salata', price: 120, category: 'Salatalar', description: 'Izgara tavuk, kruton, parmesan', icon: 'restaurant', trackStock: true, stockQuantity: 25 },
                // ── Ana Yemekler (4) ──
                { id: '16', name: 'Köfte Ekmek', price: 120, category: 'Ana Yemekler', description: 'El yapımı köfte, ekmek, domates, biber', icon: 'restaurant_menu', trackStock: true, stockQuantity: 40 },
                { id: '17', name: 'Tavuk Şiş', price: 160, category: 'Ana Yemekler', description: 'Marine tavuk şiş, pilav, salata', icon: 'restaurant_menu', trackStock: true, stockQuantity: 35 },
                { id: '18', name: 'Döner (Tabak)', price: 145, category: 'Ana Yemekler', description: 'Dana döner tabak, pilav, salata', icon: 'restaurant_menu', trackStock: true, stockQuantity: 45 },
                { id: '19', name: 'Karışık Pizza', price: 220, category: 'Ana Yemekler', description: '32cm, sucuk, mantar, biber, mozzarella', icon: 'restaurant_menu', trackStock: true, stockQuantity: 20 },
                // ── Atıştırmalıklar (3) ──
                { id: '20', name: 'Patates Kızartması', price: 65, category: 'Atıştırmalıklar', description: 'Çıtır patates, ketçap veya mayonez', icon: 'fastfood', trackStock: true, stockQuantity: 60 },
                { id: '21', name: 'Soğan Halkası', price: 70, category: 'Atıştırmalıklar', description: 'Çıtır soğan halkası, ranch sos', icon: 'fastfood', trackStock: true, stockQuantity: 40 },
                { id: '22', name: 'Mozzarella Stick', price: 85, category: 'Atıştırmalıklar', description: '6 adet, marinara sos ile', icon: 'fastfood', trackStock: true, stockQuantity: 35 },
                // ── Çorbalar (2) ──
                { id: '23', name: 'Mercimek Çorbası', price: 75, category: 'Çorbalar', description: 'Geleneksel kırmızı mercimek', icon: 'soup_kitchen', trackStock: true, stockQuantity: 50 },
                { id: '24', name: 'Domates Çorbası', price: 80, category: 'Çorbalar', description: 'Kremalı domates, fesleğen', icon: 'soup_kitchen', trackStock: true, stockQuantity: 40 },
                // ── Tatlılar (3) ──
                { id: '8', name: 'Sufle', price: 110, category: 'Tatlılar', description: 'Belçika çikolatalı, dondurma ile', icon: 'cake', trackStock: true, stockQuantity: 20 },
                { id: '9', name: 'Cheesecake', price: 100, category: 'Tatlılar', description: 'Limonlu veya Frambuazlı', icon: 'cake', trackStock: true, stockQuantity: 25 },
                { id: '25', name: 'Brownie', price: 95, category: 'Tatlılar', description: 'Sıcak çikolatalı brownie, dondurma', icon: 'cake', trackStock: true, stockQuantity: 30 },
                // ── Kahveler (2) ──
                { id: '10', name: 'Latte', price: 65, category: 'Kahveler', description: 'Sütlü espresso', icon: 'coffee', trackStock: true, stockQuantity: 0 },
                { id: '11', name: 'Türk Kahvesi', price: 50, category: 'Kahveler', description: 'Çifte kavrulmuş', icon: 'coffee', trackStock: true, stockQuantity: 0 },
            ],
            categories: [
                { id: 'Burgerler', name: 'Burgerler', icon: 'lunch_dining', color: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-yellow-100', hover: 'hover:border-yellow-300', iconColor: 'text-yellow-500' },
                { id: 'İçecekler', name: 'İçecekler', icon: 'local_drink', color: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', border: 'border-blue-100', hover: 'hover:border-blue-300', iconColor: 'text-blue-500' },
                { id: 'Salatalar', name: 'Salatalar', icon: 'restaurant', color: 'bg-[#D1FAE5]', text: 'text-[#065F46]', border: 'border-green-100', hover: 'hover:border-green-300', iconColor: 'text-green-600' },
                { id: 'Ana Yemekler', name: 'Ana Yemekler', icon: 'restaurant_menu', color: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-red-100', hover: 'hover:border-red-300', iconColor: 'text-red-500' },
                { id: 'Atıştırmalıklar', name: 'Atıştırmalıklar', icon: 'fastfood', color: 'bg-[#FEF9C3]', text: 'text-[#854D0E]', border: 'border-yellow-100', hover: 'hover:border-yellow-300', iconColor: 'text-amber-500' },
                { id: 'Çorbalar', name: 'Çorbalar', icon: 'soup_kitchen', color: 'bg-[#FFEDD5]', text: 'text-[#9A3412]', border: 'border-orange-100', hover: 'hover:border-orange-300', iconColor: 'text-orange-500' },
                { id: 'Tatlılar', name: 'Tatlılar', icon: 'cake', color: 'bg-[#FCE7F3]', text: 'text-[#9D174D]', border: 'border-pink-100', hover: 'hover:border-pink-300', iconColor: 'text-pink-500' },
                { id: 'Kahveler', name: 'Kahveler', icon: 'coffee', color: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', border: 'border-purple-100', hover: 'hover:border-purple-300', iconColor: 'text-purple-600' },
            ],
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
            version: 3,
            migrate: (persistedState: any, version) => {
                // v0→v1→v2: eski cache temizle, yeni initial state'le başla
                if (version < 2) return {};
                // v2→v3: serverId field eklendi (mevcut veriler undefined olarak kalir)
                if (version < 3) return persistedState;
                return persistedState;
            },
            merge: (persistedState: any, currentState) => {
                // Persisted listede olmayan yeni default ürünleri ekle
                const persistedIds = new Set(
                    (persistedState.products || []).map((p: Product) => p.id)
                );
                const newDefaults = currentState.products.filter(
                    (p) => !persistedIds.has(p.id)
                );
                // Persisted listede olmayan yeni default kategorileri ekle
                const persistedCatIds = new Set(
                    (persistedState.categories || []).map((c: Category) => c.id)
                );
                const newDefaultCats = currentState.categories.filter(
                    (c) => !persistedCatIds.has(c.id)
                );
                return {
                    ...currentState,
                    ...persistedState,
                    products: [...(persistedState.products || []), ...newDefaults],
                    categories: [...(persistedState.categories || []), ...newDefaultCats],
                    quickNotes: persistedState.quickNotes || currentState.quickNotes,
                    orderNotes: persistedState.orderNotes || currentState.orderNotes,
                };
            },
        }
    )
);
