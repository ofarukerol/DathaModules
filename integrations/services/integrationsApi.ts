// Integrations API service — DathaBackend /integrations endpoint'lerine axios wrapper
// @see DAT-236 Phase 1

import { api } from '../../../services/datha/api';
import type { IntegrationProvider, IntegrationStatus } from '../../../shared/src';

// Backend TransformInterceptor tüm response'ları { success, data, meta? } olarak sarmalar.
// Bu helper idempotent — sarmalanmış gelirse açar, açıkça gelirse aynen döner.
type ApiEnvelope<T> = { success: boolean; data: T; meta?: unknown };
function unwrap<T>(payload: T | ApiEnvelope<T>): T {
    if (
        payload &&
        typeof payload === 'object' &&
        'success' in (payload as object) &&
        'data' in (payload as object)
    ) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
}

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
        const { data } = await api.get<ApiEnvelope<BranchOption[]> | BranchOption[]>('/tenant/me/branches');
        return unwrap(data);
    },

    async updateWhatsappDefaultBranch(branchId: string | null): Promise<void> {
        await api.patch('/tenant/me', { whatsappDefaultBranchId: branchId });
    },
};

export const integrationsApi = {
    async list(): Promise<IntegrationDto[]> {
        const { data } = await api.get<IntegrationDto[] | ApiEnvelope<IntegrationDto[]>>('/integrations');
        return unwrap(data);
    },

    async get(id: string): Promise<IntegrationDto> {
        const { data } = await api.get<IntegrationDto | ApiEnvelope<IntegrationDto>>(`/integrations/${id}`);
        return unwrap(data);
    },

    async create(payload: CreateIntegrationPayload): Promise<IntegrationDto> {
        const { data } = await api.post<IntegrationDto | ApiEnvelope<IntegrationDto>>('/integrations', payload);
        return unwrap(data);
    },

    async update(id: string, payload: UpdateIntegrationPayload): Promise<IntegrationDto> {
        const { data } = await api.patch<IntegrationDto | ApiEnvelope<IntegrationDto>>(`/integrations/${id}`, payload);
        return unwrap(data);
    },

    async remove(id: string): Promise<void> {
        await api.delete(`/integrations/${id}`);
    },

    async test(id: string): Promise<TestConnectionResult> {
        const { data } = await api.post<TestConnectionResult | ApiEnvelope<TestConnectionResult>>(`/integrations/${id}/test`);
        return unwrap(data);
    },

    // Product mapping (Phase 4)
    async listProductMaps(id: string): Promise<ProductMapsResponse> {
        const { data } = await api.get<ProductMapsResponse | ApiEnvelope<ProductMapsResponse>>(`/integrations/${id}/products`);
        return unwrap(data);
    },

    async autoMapProducts(id: string): Promise<AutoMapResult> {
        const { data } = await api.post<AutoMapResult | ApiEnvelope<AutoMapResult>>(`/integrations/${id}/products/auto-map`);
        return unwrap(data);
    },

    async mapProduct(
        integrationId: string,
        internalProductId: string,
        externalProductId: string,
        opts?: { externalSku?: string; externalName?: string },
    ): Promise<IntegrationProductMapDto> {
        const { data } = await api.post<IntegrationProductMapDto | ApiEnvelope<IntegrationProductMapDto>>(
            `/integrations/${integrationId}/products/${internalProductId}/map`,
            { externalProductId, ...opts },
        );
        return unwrap(data);
    },

    async unmapProduct(integrationId: string, internalProductId: string): Promise<void> {
        await api.delete(`/integrations/${integrationId}/products/${internalProductId}/map`);
    },

    async pushAllPrices(id: string): Promise<{ queued: number }> {
        const { data } = await api.post<{ queued: number } | ApiEnvelope<{ queued: number }>>(
            `/integrations/${id}/sync/push-all-prices`,
        );
        return unwrap(data);
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
        const { data } = await api.post<EmbeddedSignupResult | ApiEnvelope<EmbeddedSignupResult>>(
            '/integrations/whatsapp/embedded-signup',
            payload,
        );
        return unwrap(data);
    },
};
