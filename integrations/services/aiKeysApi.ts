// Tenant AI sağlayıcı key API servisi (DAT-145)
// Backend: /integrations/ai-keys (JwtAuthGuard, tenant JWT'den çözülür)
// Her restoran kendi OpenAI/Gemini key'ini Ayarlar > WhatsApp panelinden yönetir.

import { api } from '../../../services/datha/api';

// Backend TransformInterceptor { success, data, meta? } ile sarmalar — zarfı aç.
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

// Backend AiProvider enum ile uyumlu (tenant-ai-key.controller.ts ALLOWED listesi).
// Meta verileri (label, ikon, model, API URL): config/aiProviders.ts
export type AiProviderKey = 'OPENAI' | 'GOOGLE' | 'DEEPSEEK' | 'MINIMAX' | 'XAI';

export interface TenantAiKeyDto {
    provider: AiProviderKey;
    modelName: string;
    apiKeyMasked: string;
    hasKey: boolean;
    isActive: boolean;
}

export interface UpsertAiKeyPayload {
    /** Boş bırakılırsa mevcut key korunur (yalnızca modelName güncellenir). */
    apiKey?: string;
    modelName: string;
}

export interface AiKeyTestResult {
    success: boolean;
    message: string;
}

export const aiKeysApi = {
    async list(): Promise<TenantAiKeyDto[]> {
        const { data } = await api.get('/integrations/ai-keys');
        return unwrap<TenantAiKeyDto[]>(data) ?? [];
    },

    async upsert(provider: AiProviderKey, payload: UpsertAiKeyPayload): Promise<TenantAiKeyDto> {
        const { data } = await api.put(`/integrations/ai-keys/${provider}`, payload);
        return unwrap<TenantAiKeyDto>(data);
    },

    async remove(provider: AiProviderKey): Promise<void> {
        await api.delete(`/integrations/ai-keys/${provider}`);
    },

    async test(provider: AiProviderKey): Promise<AiKeyTestResult> {
        const { data } = await api.post(`/integrations/ai-keys/${provider}/test`);
        return unwrap<AiKeyTestResult>(data);
    },
};

export default aiKeysApi;
