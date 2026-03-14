import { api, isOnline } from '../../_shared/api';
import { getReadyDb } from '../../_shared/db';

export interface ProductServiceProduct {
    id: string;
    name: string;
    description?: string;
    categoryId: string;
    categoryName: string;
    price: number;
    costPrice?: number;
    kitchenGroup: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder: number;
    portions?: ProductServicePortion[];
    parameters?: Record<string, boolean>;
}

export interface ProductServicePortion {
    name: string;
    unit: string;
    price: number;
    costPrice?: number;
    isDefault?: boolean;
}

export interface ProductServiceCategory {
    id: string;
    name: string;
    description?: string;
    sortOrder: number;
    imageUrl?: string;
    isActive: boolean;
    parentId?: string;
    productCount: number;
}

export const productService = {
    async fetchProducts(page = 1, limit = 100): Promise<ProductServiceProduct[]> {
        if (isOnline()) {
            try {
                const { data } = await api.get('/products', { params: { page, limit, isActive: true } });
                const products: ProductServiceProduct[] = data.items || data;
                await cacheProducts(products);
                return products;
            } catch {
                return getProductsFromCache();
            }
        }
        return getProductsFromCache();
    },

    async fetchCategories(): Promise<ProductServiceCategory[]> {
        if (isOnline()) {
            try {
                const { data } = await api.get('/categories/active');
                const categories: ProductServiceCategory[] = Array.isArray(data) ? data : data.items || [];
                await cacheCategories(categories);
                return categories;
            } catch {
                return getCategoriesFromCache();
            }
        }
        return getCategoriesFromCache();
    },

    async getProductsByCategory(categoryId: string): Promise<ProductServiceProduct[]> {
        if (isOnline()) {
            try {
                const { data } = await api.get(`/products/category/${categoryId}`);
                return data.items || data;
            } catch {
                return getProductsFromCache(categoryId);
            }
        }
        return getProductsFromCache(categoryId);
    },
};

async function cacheProducts(products: ProductServiceProduct[]): Promise<void> {
    const db = await getReadyDb();
    if (!db) return;

    for (const p of products) {
        await db.execute(
            `INSERT OR REPLACE INTO products_cache (id, server_id, name, price, cost_price, category_id, category_name, description, image_url, kitchen_group, portions_json, parameters_json, is_active, sort_order, cached_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, datetime('now'))`,
            [p.id, p.id, p.name, p.price, p.costPrice || null, p.categoryId, p.categoryName || '', p.description || null, p.imageUrl || null, p.kitchenGroup || 'MUTFAK', p.portions ? JSON.stringify(p.portions) : null, p.parameters ? JSON.stringify(p.parameters) : null, p.isActive ? 1 : 0, p.sortOrder || 0],
        );
    }
}

async function cacheCategories(categories: ProductServiceCategory[]): Promise<void> {
    const db = await getReadyDb();
    if (!db) return;

    for (const c of categories) {
        await db.execute(
            `INSERT OR REPLACE INTO categories_cache (id, server_id, name, sort_order, image_url, is_active, parent_id, cached_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'))`,
            [c.id, c.id, c.name, c.sortOrder || 0, c.imageUrl || null, c.isActive ? 1 : 0, c.parentId || null],
        );
    }
}

async function getProductsFromCache(categoryId?: string): Promise<ProductServiceProduct[]> {
    const db = await getReadyDb();
    if (!db) return [];

    const query = categoryId
        ? 'SELECT * FROM products_cache WHERE category_id = $1 AND is_active = 1 ORDER BY sort_order'
        : 'SELECT * FROM products_cache WHERE is_active = 1 ORDER BY sort_order';
    const params = categoryId ? [categoryId] : [];

    const rows = await db.select<any[]>(query, params);
    return rows.map((r) => ({
        id: r.server_id || r.id,
        name: r.name,
        description: r.description,
        categoryId: r.category_id,
        categoryName: r.category_name,
        price: r.price,
        costPrice: r.cost_price,
        kitchenGroup: r.kitchen_group,
        imageUrl: r.image_url,
        isActive: !!r.is_active,
        sortOrder: r.sort_order,
        portions: r.portions_json ? JSON.parse(r.portions_json) : undefined,
        parameters: r.parameters_json ? JSON.parse(r.parameters_json) : undefined,
    }));
}

async function getCategoriesFromCache(): Promise<ProductServiceCategory[]> {
    const db = await getReadyDb();
    if (!db) return [];

    const rows = await db.select<any[]>('SELECT * FROM categories_cache WHERE is_active = 1 ORDER BY sort_order');
    return rows.map((r) => ({
        id: r.server_id || r.id,
        name: r.name,
        description: undefined,
        sortOrder: r.sort_order,
        imageUrl: r.image_url,
        isActive: !!r.is_active,
        parentId: r.parent_id,
        productCount: 0,
    }));
}

export default productService;
