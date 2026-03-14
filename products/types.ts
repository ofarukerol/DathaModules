export interface Product {
    id: string;
    serverId?: string;
    name: string;
    price: number;
    price2?: number;
    price3?: number;
    category: string;
    description?: string;
    icon?: string;
    sku?: string;
    isActive?: boolean;
    showInKitchen?: boolean;
    trackStock?: boolean;
    portions?: Portion[];
    marketplacePrices?: {
        getir?: number;
        yemeksepeti?: number;
        trendyol?: number;
        migros?: number;
    };
    marketplaceCommissions?: {
        [key: string]: {
            courier: number;
            noCourier: number;
            deliveryMode: 'kuryeli' | 'kuryesiz';
        };
    };
    purchasePrice?: number;
    taxRate?: number;
    purchaseTaxRate?: number;
    stockQuantity?: number;
    criticalStockLevel?: number;
    isRecipeProduct?: boolean;
    recipeItems?: RecipeItem[];
    packagingItems?: RecipeItem[];
    imageUrl?: string;
    packageCost?: number;
    loyaltyPointType?: 'fixed' | 'percent';
    loyaltyPointValue?: number;
    updatedAt?: string;
}

export interface RecipeItem {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unit: 'Adet' | 'Gram' | 'Litre' | 'Paket' | 'Metre';
    unitPrice: number;
    total: number;
    taxRate?: number;
}

export interface Portion {
    id: string;
    name: string;
    price: number;
}

export interface Category {
    id: string;
    serverId?: string;
    name: string;
    icon: string;
    color: string;
    text: string;
    border?: string;
    hover?: string;
    iconColor?: string;
}

export interface OrderNote {
    id: string;
    text: string;
}
