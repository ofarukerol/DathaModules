// Integrations API service — DathaBackend /integrations endpoint'lerine axios wrapper
// @see DAT-236 Phase 1

import { api } from '../../../services/api';
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
};
