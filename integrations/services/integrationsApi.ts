// Integrations API service — DathaBackend /integrations endpoint'lerine axios wrapper
// @see DAT-236 Phase 1

import { api } from '../../../services/datha/api';
import type { IntegrationProvider, IntegrationStatus } from '../../../shared/src';

export interface IntegrationFeatures {
    fetchOrders?: boolean;
    pushStatus?: boolean;
    syncStock?: boolean;
    syncPrice?: boolean;
}

export interface IntegrationConfig {
    defaultDeliveryMode?: 'kuryeli' | 'kuryesiz';
    autoAcceptOrders?: boolean;
    hideOnOutOfStock?: boolean;
    [key: string]: unknown;
}

export interface IntegrationDto {
    id: string;
    tenantId: string;
    branchId: string | null;
    provider: IntegrationProvider;
    status: IntegrationStatus;
    externalAccountId: string | null;
    externalStoreId: string | null;
    apiKeyMasked: string;
    apiSecretMasked: string;
    hasToken: boolean;
    features: IntegrationFeatures | null;
    config: IntegrationConfig | null;
    pollIntervalSec: number;
    lastSyncAt: string | null;
    lastErrorAt: string | null;
    lastErrorMessage: string | null;
    consecutiveErrors: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateIntegrationPayload {
    provider: IntegrationProvider;
    branchId?: string;
    externalAccountId: string;
    externalStoreId?: string;
    apiKey: string;
    apiSecret: string;
    token?: string;
    features?: IntegrationFeatures;
    config?: IntegrationConfig;
    pollIntervalSec?: number;
}

export interface UpdateIntegrationPayload {
    status?: IntegrationStatus;
    externalAccountId?: string;
    externalStoreId?: string;
    apiKey?: string;
    apiSecret?: string;
    token?: string;
    features?: IntegrationFeatures;
    config?: IntegrationConfig;
    pollIntervalSec?: number;
    enabled?: boolean;
}

export interface TestConnectionResult {
    success: boolean;
    latencyMs: number;
    supplierName?: string;
    error?: string;
}

// ---------------- Phase 4: Product mapping ----------------

export interface IntegrationProductMapDto {
    id: string;
    internalProductId: string;
    externalProductId: string;
    externalSku: string | null;
    externalName: string | null;
    lastPushedPrice: string | null; // Prisma Decimal serialized
    lastPushedStock: number | null;
    lastPushedAt: string | null;
    pushStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
    lastError: string | null;
    product?: {
        id: string;
        name: string;
        price: string;
        stockQty: number;
        integrationCode: string | null;
    };
}

export interface UnmappedProductDto {
    id: string;
    name: string;
    price: string;
    stockQty: number;
    integrationCode: string | null;
}

export interface ProductMapsResponse {
    mapped: IntegrationProductMapDto[];
    unmapped: UnmappedProductDto[];
}

export interface AutoMapResult {
    success: boolean;
    created: number;
    totalTrendyol?: number;
    error?: string;
}

export interface BranchOption {
    id: string;
    name: string;
    isMainBranch: boolean;
    code: string | null;
}

export const tenantApi = {
    async getBranches(): Promise<BranchOption[]> {
        const { data } = await api.get<{ success: boolean; data: BranchOption[] }>('/tenant/me/branches');
        return data.data;
    },

    async updateWhatsappDefaultBranch(branchId: string | null): Promise<void> {
        await api.patch('/tenant/me', { whatsappDefaultBranchId: branchId });
    },
};

export const integrationsApi = {
    async list(): Promise<IntegrationDto[]> {
        const { data } = await api.get<IntegrationDto[]>('/integrations');
        return data;
    },

    async get(id: string): Promise<IntegrationDto> {
        const { data } = await api.get<IntegrationDto>(`/integrations/${id}`);
        return data;
    },

    async create(payload: CreateIntegrationPayload): Promise<IntegrationDto> {
        const { data } = await api.post<IntegrationDto>('/integrations', payload);
        return data;
    },

    async update(id: string, payload: UpdateIntegrationPayload): Promise<IntegrationDto> {
        const { data } = await api.patch<IntegrationDto>(`/integrations/${id}`, payload);
        return data;
    },

    async remove(id: string): Promise<void> {
        await api.delete(`/integrations/${id}`);
    },

    async test(id: string): Promise<TestConnectionResult> {
        const { data } = await api.post<TestConnectionResult>(`/integrations/${id}/test`);
        return data;
    },

    // Product mapping (Phase 4)
    async listProductMaps(id: string): Promise<ProductMapsResponse> {
        const { data } = await api.get<ProductMapsResponse>(`/integrations/${id}/products`);
        return data;
    },

    async autoMapProducts(id: string): Promise<AutoMapResult> {
        const { data } = await api.post<AutoMapResult>(`/integrations/${id}/products/auto-map`);
        return data;
    },

    async mapProduct(
        integrationId: string,
        internalProductId: string,
        externalProductId: string,
        opts?: { externalSku?: string; externalName?: string },
    ): Promise<IntegrationProductMapDto> {
        const { data } = await api.post<IntegrationProductMapDto>(
            `/integrations/${integrationId}/products/${internalProductId}/map`,
            { externalProductId, ...opts },
        );
        return data;
    },

    async unmapProduct(integrationId: string, internalProductId: string): Promise<void> {
        await api.delete(`/integrations/${integrationId}/products/${internalProductId}/map`);
    },

    async pushAllPrices(id: string): Promise<{ queued: number }> {
        const { data } = await api.post<{ queued: number }>(
            `/integrations/${id}/sync/push-all-prices`,
        );
        return data;
    },
};

// ---------------- WhatsApp Embedded Signup (DAT-145 Item 11) ----------------

export interface EmbeddedSignupPayload {
    code: string;
    wabaId: string;
    phoneNumberId: string;
    defaultBranchId?: string;
}

export interface EmbeddedSignupResult {
    integrationId: string;
    wabaId: string;
    phoneNumberId: string;
    status: 'CONNECTED';
}

export const whatsappOnboardingApi = {
    async completeEmbeddedSignup(payload: EmbeddedSignupPayload): Promise<EmbeddedSignupResult> {
        const { data } = await api.post<EmbeddedSignupResult>(
            '/integrations/whatsapp/embedded-signup',
            payload,
        );
        return data;
    },
};
