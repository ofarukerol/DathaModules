// Integration store — Zustand
// Persist YOK: server state (anlık), sync'te güncellenmeli.
// @see DAT-236 Phase 1

import { create } from 'zustand';
import { integrationsApi } from '../services/integrationsApi';
import type {
    IntegrationDto,
    CreateIntegrationPayload,
    UpdateIntegrationPayload,
    TestConnectionResult,
} from '../services/integrationsApi';

interface IntegrationStore {
    integrations: IntegrationDto[];
    loading: boolean;
    error: string | null;

    fetchIntegrations: () => Promise<void>;
    createIntegration: (payload: CreateIntegrationPayload) => Promise<IntegrationDto>;
    updateIntegration: (id: string, payload: UpdateIntegrationPayload) => Promise<IntegrationDto>;
    deleteIntegration: (id: string) => Promise<void>;
    testConnection: (id: string) => Promise<TestConnectionResult>;
}

export const useIntegrationStore = create<IntegrationStore>((set, get) => ({
    integrations: [],
    loading: false,
    error: null,

    async fetchIntegrations() {
        set({ loading: true, error: null });
        try {
            const items = await integrationsApi.list();
            set({ integrations: items, loading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Liste alınamadı';
            set({ error: message, loading: false });
        }
    },

    async createIntegration(payload) {
        const created = await integrationsApi.create(payload);
        set({ integrations: [created, ...get().integrations] });
        return created;
    },

    async updateIntegration(id, payload) {
        const updated = await integrationsApi.update(id, payload);
        set({
            integrations: get().integrations.map((i) => (i.id === id ? updated : i)),
        });
        return updated;
    },

    async deleteIntegration(id) {
        await integrationsApi.remove(id);
        set({ integrations: get().integrations.filter((i) => i.id !== id) });
    },

    async testConnection(id) {
        const result = await integrationsApi.test(id);
        // Backend status'i guncelledi — listeyi tazele
        await get().fetchIntegrations();
        return result;
    },
}));
