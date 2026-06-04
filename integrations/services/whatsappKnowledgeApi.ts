// DAT-242 — WhatsApp bot bilgi tabanı (RAG) API servisi.
// Backend: /integrations/whatsapp/knowledge (JwtAuthGuard, tenant JWT'den çözülür).
// İşletme, botun cevaplarken kullanacağı metin dokümanları ekler/listeler/siler.

import { api } from '../../../services/datha/api';

// Backend TransformInterceptor { success, data } ile sarmalar — zarfı aç.
type ApiEnvelope<T> = { success: boolean; data: T };
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

export interface KnowledgeDoc {
    id: string;
    title: string;
    status: string;
    chunkCount: number;
    createdAt: string;
}

export const whatsappKnowledgeApi = {
    async list(): Promise<KnowledgeDoc[]> {
        const { data } = await api.get('/integrations/whatsapp/knowledge');
        return unwrap<KnowledgeDoc[]>(data) ?? [];
    },

    async create(title: string, content: string): Promise<{ documentId: string; chunks: number }> {
        const { data } = await api.post('/integrations/whatsapp/knowledge', { title, content });
        return unwrap<{ documentId: string; chunks: number }>(data);
    },

    async remove(id: string): Promise<void> {
        await api.delete(`/integrations/whatsapp/knowledge/${id}`);
    },
};

export default whatsappKnowledgeApi;
