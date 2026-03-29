export type CustomerSegment = 'aktif' | 'vip' | 'potansiyel' | 'yeni' | 'pasif';

export interface CustomerNote {
    id: string;
    text: string;
    createdAt: string;
}

export type SpecialOfferType = 'percentage' | 'fixed_amount' | 'free_product';

export interface SpecialOffer {
    id: string;
    type: SpecialOfferType;
    value: number;
    productId?: string;
    productName?: string;
    description: string;
    validUntil?: string;
    isUsed: boolean;
    usedAt?: string;
    createdAt: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    ulke?: string;
    il?: string;
    ilce?: string;
    mahalle?: string;
    directions?: string;
    isVip?: boolean;
    recentOrders?: number;
    balance: number;
    notes?: string;
    segment?: CustomerSegment;
    city?: string;
    avgSpending?: number;
    lastVisit?: string;
    favoriteProducts?: string[];
    registrationDate?: string;
    birthday?: string;
    noteHistory?: CustomerNote[];
    isStarred?: boolean;
    loyaltyPoints?: number;
    specialOffers?: SpecialOffer[];
    addresses?: CustomerAddress[];
}

export interface CustomerAddress {
    id: string;
    label?: string;
    mahalle?: string;
    addressLine1?: string;
    addressLine2?: string;
    il?: string;
    ilce?: string;
    directions?: string;
    isDefault?: boolean;
}

export interface NonPayableReason {
    id: string;
    name: string;
    type: 'personel' | 'ikram' | 'diger';
}
