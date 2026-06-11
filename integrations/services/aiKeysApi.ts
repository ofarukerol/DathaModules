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
export type AiProviderKey = 'OPENAI' | 'GOOGLE' | 'GROQ' | 'DEEPSEEK' | 'MINIMAX' | 'XAI';

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
        // ÇAKIŞMASIZ yol: bare '/integrations/ai-keys' trendyol @Get(':id')'e gölgelenebiliyor.
        const { data } = await api.get('/integrations/ai-keys/list');
        return unwrap<TenantAiKeyDto[]>(data) ?? [];
    },

    async upsert(provider: AiProviderKey, payload: UpsertAiKeyPayload): Promise<TenantAiKeyDto> {
        const { data } = await api.put(`/integrations/ai-keys/${provider}`, payload);
        return unwrap<TenantAiKeyDto>(data);
    },

    async remove(provider: AiProviderKey): Promise<void> {
        await api.delete(`/integrations/ai-keys/${provider}`);
    },

    /**
     * Anahtarı test eder. payload verilirse (apiKey/modelName) KAYDETMEDEN onu test eder
     * ("önce test, başarılıysa kaydet"); verilmezse kayıtlı anahtarı test eder.
     */
    async test(
        provider: AiProviderKey,
        payload?: { apiKey?: string; modelName?: string },
    ): Promise<AiKeyTestResult> {
        const { data } = await api.post(`/integrations/ai-keys/${provider}/test`, payload ?? {});
        return unwrap<AiKeyTestResult>(data);
    },

    /**
     * Sağlayıcının güncel modellerini sağlayıcı API'sinden getirir. apiKey verilirse
     * onunla (kaydetmeden), yoksa kayıtlı anahtarla. Anahtar yoksa boş döner.
     */
    async listModels(provider: AiProviderKey, apiKey?: string): Promise<string[]> {
        const { data } = await api.post(`/integrations/ai-keys/${provider}/models`, { apiKey });
        return unwrap<{ provider: AiProviderKey; models: string[] }>(data).models ?? [];
    },

    /** Kayıtlı anahtarı açık metin olarak getirir (kullanıcı "göster" ile talep eder). */
    async reveal(provider: AiProviderKey): Promise<string> {
        const { data } = await api.get(`/integrations/ai-keys/${provider}/reveal`);
        return unwrap<{ provider: AiProviderKey; apiKey: string }>(data).apiKey;
    },
};

export default aiKeysApi;
