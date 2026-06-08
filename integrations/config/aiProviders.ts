// AI sağlayıcı meta verileri — WhatsApp botu için desteklenen LLM sağlayıcıları.
// TEK KAYNAK: Yeni bir sağlayıcı eklemek için buraya bir satır ekle; UI (WhatsAppDetail)
// bu listeyi map'leyerek form/dropdown üretir. Backend tarafında karşılığı:
//   - DathaBackend AiProvider enum (prisma/schema.prisma)
//   - tenant-ai-key.controller.ts ALLOWED listesi
//   - ai-gateway.service.ts OPENAI_COMPATIBLE_BASE_URLS (Gemini hariç hepsi OpenAI-uyumlu)
// Yeni sağlayıcı eklenince bu üç yerin de güncellenmesi gerekir (sözleşme).

import type { AiProviderKey } from '../services/aiKeysApi';

export interface AiProviderMeta {
    /** Backend AiProvider enum değeriyle birebir aynı (UPPER_SNAKE_CASE). */
    key: AiProviderKey;
    /** Kullanıcıya gösterilen ad. */
    label: string;
    /** Material Symbols ikon adı (CustomSelect + form başlığı). */
    icon: string;
    /** API key input placeholder'ı (sağlayıcının anahtar formatı). */
    keyPlaceholder: string;
    /** Model adı input'unun varsayılanı ve placeholder'ı. */
    defaultModel: string;
    /** Sağlayıcının seçilebilir güncel modelleri (CustomSelect; serbest giriş de açık). */
    models: string[];
    /** Kullanıcının API anahtarını alabileceği sayfa. */
    apiKeyUrl: string;
}

export const AI_PROVIDERS: AiProviderMeta[] = [
    {
        key: 'OPENAI',
        label: 'OpenAI (GPT)',
        icon: 'smart_toy',
        keyPlaceholder: 'sk-...',
        defaultModel: 'gpt-4o-mini',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
        apiKeyUrl: 'https://platform.openai.com/api-keys',
    },
    {
        key: 'GOOGLE',
        label: 'Google (Gemini)',
        icon: 'auto_awesome',
        keyPlaceholder: 'AIza...',
        defaultModel: 'gemini-2.5-flash',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
        key: 'DEEPSEEK',
        label: 'DeepSeek',
        icon: 'neurology',
        keyPlaceholder: 'sk-...',
        defaultModel: 'deepseek-chat',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    },
    {
        key: 'MINIMAX',
        label: 'MiniMax',
        icon: 'blur_on',
        keyPlaceholder: 'API anahtarı',
        defaultModel: 'MiniMax-Text-01',
        models: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6.5-chat'],
        apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    },
    {
        key: 'XAI',
        label: 'xAI (Grok)',
        icon: 'rocket_launch',
        keyPlaceholder: 'xai-...',
        defaultModel: 'grok-3',
        models: ['grok-3', 'grok-3-mini', 'grok-2-latest', 'grok-2-vision-1212'],
        apiKeyUrl: 'https://console.x.ai',
    },
];

/** Geçerli bir AiProviderKey mi (config dışı/eski config değerlerini elemek için). */
export function isAiProviderKey(value: unknown): value is AiProviderKey {
    return typeof value === 'string' && AI_PROVIDERS.some((p) => p.key === value);
}

/** Her sağlayıcı için bir değer üreterek provider-key'li bir kayıt oluşturur
 *  (record-based state: aiNewKeys / aiModels / aiMasked). */
export function buildProviderRecord<T>(
    fn: (p: AiProviderMeta) => T,
): Record<AiProviderKey, T> {
    return AI_PROVIDERS.reduce(
        (acc, p) => {
            acc[p.key] = fn(p);
            return acc;
        },
        {} as Record<AiProviderKey, T>,
    );
}
