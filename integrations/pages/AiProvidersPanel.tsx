// DAT-242 — Merkezi Yapay Zeka Sağlayıcı (API anahtarı) yönetimi.
// Tenant geneli: anahtarlar /integrations/ai-keys (şifreli DB) altında tutulur ve
// WhatsApp botu dahil TÜM AI özellikleri tarafından kullanılır (WhatsApp'a özel değil).
// Tanımlamalar > Yapay Zeka sekmesinde render edilir; başka sayfalardan da kullanılabilir.

import { useEffect, useState } from 'react';
import axios from 'axios';
import { aiKeysApi, type AiProviderKey } from '../services/aiKeysApi';
import { AI_PROVIDERS, isAiProviderKey, buildProviderRecord } from '../config/aiProviders';
import { useToastStore } from '../../../stores/useToastStore';
import CustomSelect from '@/components/CustomSelect';

/** Axios hatasından backend'in gerçek mesajını çıkarır (ham "Request failed..." yerine). */
function backendErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data: unknown = err.response?.data;
        if (data && typeof data === 'object') {
            const record: Record<string, unknown> = data as Record<string, unknown>;
            const errorField = record.error;
            if (errorField && typeof errorField === 'object') {
                const msg = (errorField as Record<string, unknown>).message;
                if (typeof msg === 'string') return msg;
            }
            if (typeof record.message === 'string') return record.message;
        }
        return err.message;
    }
    return err instanceof Error ? err.message : fallback;
}

interface AiProvidersPanelProps {
    /** Ayarlar paneli içinde gömülü mü (absolute layout) */
    embedded?: boolean;
}

export default function AiProvidersPanel({ embedded = false }: AiProvidersPanelProps = {}) {
    const addToast = useToastStore((s) => s.addToast);

    const [aiNewKeys, setAiNewKeys] = useState<Record<AiProviderKey, string>>(
        () => buildProviderRecord(() => ''), // boş = değiştirme
    );
    const [aiModels, setAiModels] = useState<Record<AiProviderKey, string>>(
        () => buildProviderRecord((p) => p.defaultModel),
    );
    const [aiMasked, setAiMasked] = useState<Record<AiProviderKey, string>>(
        () => buildProviderRecord(() => ''),
    );
    const [testingProvider, setTestingProvider] = useState<AiProviderKey | null>(null);
    // Sağlayıcı API'sinden canlı çekilen güncel modeller (anahtar varsa). Boşsa statik listeye düşülür.
    const [liveModels, setLiveModels] = useState<Record<AiProviderKey, string[]>>(
        () => buildProviderRecord(() => []),
    );
    // Göz ile gösterme: hangi sağlayıcının anahtarı açık + çözülmüş açık metin önbelleği.
    const [showKey, setShowKey] = useState<Record<AiProviderKey, boolean>>(
        () => buildProviderRecord(() => false),
    );
    const [revealedKeys, setRevealedKeys] = useState<Record<AiProviderKey, string>>(
        () => buildProviderRecord(() => ''),
    );

    useEffect(() => {
        let cancelled = false;
        aiKeysApi
            .list()
            .then((keys) => {
                if (cancelled) return;
                setAiMasked((prev) => {
                    const next = { ...prev };
                    keys.forEach((k) => {
                        if (isAiProviderKey(k.provider)) next[k.provider] = k.apiKeyMasked;
                    });
                    return next;
                });
                setAiModels((prev) => {
                    const next = { ...prev };
                    keys.forEach((k) => {
                        if (isAiProviderKey(k.provider) && k.modelName) next[k.provider] = k.modelName;
                    });
                    return next;
                });
                // Bağlı sağlayıcılar için güncel model listesini sağlayıcı API'sinden canlı çek.
                keys.forEach((k) => {
                    if (!isAiProviderKey(k.provider)) return;
                    const prov = k.provider;
                    aiKeysApi
                        .listModels(prov)
                        .then((models) => {
                            if (cancelled || models.length === 0) return;
                            setLiveModels((prev) => ({ ...prev, [prov]: models }));
                        })
                        .catch(() => {});
                });
            })
            .catch(() => {
                /* key yoksa sessizce boş kalır */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Göz ikonu: anahtarı aç/gizle. Kayıtlı (eklenmiş) anahtar için açık metni backend'den çeker. */
    const toggleReveal = async (provider: AiProviderKey) => {
        if (showKey[provider]) {
            setShowKey((prev) => ({ ...prev, [provider]: false }));
            return;
        }
        // Yazılmış yeni anahtar yoksa ama kayıtlı anahtar varsa açık metni getir.
        if (!aiNewKeys[provider].trim() && aiMasked[provider] && !revealedKeys[provider]) {
            try {
                const key = await aiKeysApi.reveal(provider);
                setRevealedKeys((prev) => ({ ...prev, [provider]: key }));
            } catch (err) {
                addToast('error', backendErrorMessage(err, 'Anahtar gösterilemedi'));
                return;
            }
        }
        setShowKey((prev) => ({ ...prev, [provider]: true }));
    };

    /**
     * Test Et: önce anahtarı test eder (KAYDETMEDEN), başarılıysa KAYDEDER.
     * Girilen yeni anahtar varsa onu, yoksa kayıtlı anahtarı doğrular.
     */
    const testAiProvider = async (provider: AiProviderKey) => {
        const meta = AI_PROVIDERS.find((p) => p.key === provider);
        const typedKey = aiNewKeys[provider].trim();
        const hasSavedKey = !!aiMasked[provider];
        const modelName = aiModels[provider].trim() || meta?.defaultModel || '';
        if (!typedKey && !hasSavedKey) {
            addToast('error', 'Test etmek için önce API anahtarı girin.');
            return;
        }
        setTestingProvider(provider);
        try {
            // 1) KAYDETMEDEN test et (yeni anahtar varsa onunla, yoksa kayıtlıyla).
            const res = await aiKeysApi.test(
                provider,
                typedKey ? { apiKey: typedKey, modelName } : { modelName },
            );
            if (!res.success) {
                addToast('error', res.message);
                return;
            }
            // 2) Başarılıysa kaydet.
            await aiKeysApi.upsert(provider, {
                apiKey: typedKey || undefined,
                modelName,
            });
            addToast('success', res.message);
            // 3) Maske + canlı model listesini tazele (best-effort).
            try {
                const fresh = await aiKeysApi.list();
                setAiMasked((prev) => {
                    const next = { ...prev };
                    fresh.forEach((k) => {
                        if (isAiProviderKey(k.provider)) next[k.provider] = k.apiKeyMasked;
                    });
                    return next;
                });
                setAiNewKeys((prev) => ({ ...prev, [provider]: '' }));
                setRevealedKeys((prev) => ({ ...prev, [provider]: '' }));
                setShowKey((prev) => ({ ...prev, [provider]: false }));
                aiKeysApi
                    .listModels(provider)
                    .then((models) => {
                        if (models.length) setLiveModels((prev) => ({ ...prev, [provider]: models }));
                    })
                    .catch(() => {});
            } catch {
                /* tazeleme kritik değil */
            }
        } catch (err) {
            addToast('error', backendErrorMessage(err, 'Test başarısız'));
        } finally {
            setTestingProvider(null);
        }
    };

    return (
        <div
            className={
                embedded
                    ? 'absolute inset-0 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-5'
                    : 'flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5'
            }
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: '#F1E9F0', color: '#663259' }}
                >
                    <span className="material-symbols-outlined text-[28px]">psychology</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Yapay Zeka Sağlayıcıları</h2>
                    <p className="text-sm text-gray-500">
                        Bu anahtarlar işletmeniz geneli içindir; WhatsApp botu ve diğer yapay zeka
                        özellikleri tarafından kullanılır.
                    </p>
                </div>
            </div>

            <Card title="API Anahtarları" icon="key">
                <p className="text-sm text-gray-600 mb-4">
                    Kendi sağlayıcı API anahtarlarınızı girin. Anahtarlar şifreli saklanır, bir daha
                    açık gösterilmez. Hangi modelin kullanılacağı her özelliğin (örn. WhatsApp botu)
                    kendi ayarından seçilir.
                </p>

                {AI_PROVIDERS.map((p) => {
                    const connected = !!aiMasked[p.key];
                    const canUse = !!aiNewKeys[p.key].trim() || connected;
                    // Modeller: anahtar varsa sağlayıcıdan CANLI çekilen güncel liste; yoksa statik.
                    // Elle giriş yok; kayıtlı model listede yoksa CustomSelect placeholder gösterir.
                    const sourceModels = liveModels[p.key]?.length ? liveModels[p.key] : p.models;
                    const modelOptions = sourceModels.map((m) => ({ value: m, label: m }));
                    return (
                        <div
                            key={p.key}
                            className="rounded-2xl border border-gray-200 bg-white p-5 mb-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                            {/* Başlık + durum rozeti */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: '#F1E9F0', color: '#663259' }}
                                    >
                                        <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-gray-800 leading-tight">{p.label}</h4>
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {connected ? aiMasked[p.key] : 'Anahtar girilmedi'}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                        connected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                    }`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            connected ? 'bg-emerald-500' : 'bg-gray-300'
                                        }`}
                                    />
                                    {connected ? 'Bağlı' : 'Bağlı değil'}
                                </span>
                            </div>

                            {/* API Anahtarı */}
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                API Anahtarı
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey[p.key] ? 'text' : 'password'}
                                    value={aiNewKeys[p.key] || (showKey[p.key] ? revealedKeys[p.key] : '')}
                                    onChange={(e) =>
                                        setAiNewKeys((prev) => ({ ...prev, [p.key]: e.target.value }))
                                    }
                                    placeholder={aiMasked[p.key] ? 'Yeni anahtar (değiştirmek için)' : p.keyPlaceholder}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm font-mono bg-gray-50/50 focus:bg-white focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleReveal(p.key)}
                                    disabled={!aiNewKeys[p.key].trim() && !aiMasked[p.key]}
                                    title={showKey[p.key] ? 'Anahtarı gizle' : 'Anahtarı göster'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-[#663259] hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showKey[p.key] ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                            <a
                                href={p.apiKeyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#663259] hover:underline mt-2"
                            >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                API anahtarını buradan al
                            </a>

                            {/* Ayraç */}
                            <div className="h-px bg-gray-100 my-4" />

                            {/* Model */}
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Model</label>
                            <div className="flex items-stretch gap-2">
                                <div className="flex-1">
                                    <CustomSelect
                                        options={modelOptions}
                                        value={aiModels[p.key]}
                                        onChange={(v) => setAiModels((prev) => ({ ...prev, [p.key]: v }))}
                                        placeholder="Model seçin"
                                        searchPlaceholder="Model ara..."
                                        accentColor="#663259"
                                    />
                                </div>
                                <button
                                    onClick={() => testAiProvider(p.key)}
                                    disabled={testingProvider === p.key || !canUse}
                                    title={
                                        canUse
                                            ? 'Bağlantıyı test eder; başarılıysa kaydeder'
                                            : 'Test etmek için API anahtarı girin'
                                    }
                                    className="px-5 flex items-center justify-center rounded-xl text-sm font-bold text-white bg-[#663259] hover:bg-[#55284b] disabled:opacity-40 disabled:hover:bg-[#663259] transition-colors whitespace-nowrap"
                                >
                                    {testingProvider === p.key ? 'Test...' : 'Test Et'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[20px] text-[#663259]">{icon}</span>
                <h3 className="text-base font-bold text-gray-800">{title}</h3>
            </div>
            {children}
        </div>
    );
}
