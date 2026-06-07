// DAT-242 — Merkezi Yapay Zeka Sağlayıcı (API anahtarı) yönetimi.
// Tenant geneli: anahtarlar /integrations/ai-keys (şifreli DB) altında tutulur ve
// WhatsApp botu dahil TÜM AI özellikleri tarafından kullanılır (WhatsApp'a özel değil).
// Tanımlamalar > Yapay Zeka sekmesinde render edilir; başka sayfalardan da kullanılabilir.

import { useEffect, useState } from 'react';
import { aiKeysApi, type AiProviderKey } from '../services/aiKeysApi';
import { AI_PROVIDERS, isAiProviderKey, buildProviderRecord } from '../config/aiProviders';
import { useToastStore } from '../../../stores/useToastStore';

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
    const [saving, setSaving] = useState(false);
    const [testingProvider, setTestingProvider] = useState<AiProviderKey | null>(null);
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
            })
            .catch(() => {
                /* key yoksa sessizce boş kalır */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const saveKeys = async () => {
        // Bir sağlayıcı "işlenebilir": ya yeni key girilmiş ya da kayıtlı key var (sadece model).
        const actionable = AI_PROVIDERS.filter((p) => aiNewKeys[p.key].trim() || aiMasked[p.key]);
        if (actionable.length === 0) {
            addToast('error', 'En az bir sağlayıcı için API anahtarı girin.');
            return;
        }
        setSaving(true);
        try {
            for (const p of actionable) {
                await aiKeysApi.upsert(p.key, {
                    apiKey: aiNewKeys[p.key].trim() || undefined,
                    modelName: aiModels[p.key].trim() || p.defaultModel,
                });
            }
            const fresh = await aiKeysApi.list();
            setAiMasked((prev) => {
                const next = { ...prev };
                fresh.forEach((k) => {
                    if (isAiProviderKey(k.provider)) next[k.provider] = k.apiKeyMasked;
                });
                return next;
            });
            setAiNewKeys(buildProviderRecord(() => ''));
            // Açık metin önbelleğini sıfırla (eski/yeni anahtar karışmasın).
            setRevealedKeys(buildProviderRecord(() => ''));
            setShowKey(buildProviderRecord(() => false));
            addToast('success', 'Yapay zeka anahtarları kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSaving(false);
        }
    };

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
            } catch {
                addToast('error', 'Anahtar gösterilemedi (sunucu güncellemesi gerekebilir).');
                return;
            }
        }
        setShowKey((prev) => ({ ...prev, [provider]: true }));
    };

    const testAiProvider = async (provider: AiProviderKey) => {
        const meta = AI_PROVIDERS.find((p) => p.key === provider);
        const typedKey = aiNewKeys[provider].trim();
        const hasSavedKey = !!aiMasked[provider];
        if (!typedKey && !hasSavedKey) {
            addToast('error', 'Test etmek için önce API anahtarı girin.');
            return;
        }
        setTestingProvider(provider);
        try {
            // Test, kayıtlı anahtarı doğrular. Bu yüzden girilen anahtar/model önce
            // kaydedilir (eklendiğinden emin olunur), ardından test edilir.
            await aiKeysApi.upsert(provider, {
                apiKey: typedKey || undefined,
                modelName: aiModels[provider].trim() || meta?.defaultModel || '',
            });
            const res = await aiKeysApi.test(provider);
            addToast(res.success ? 'success' : 'error', res.message);
            // Kaydedilen anahtarı maskeli göster ve input'u temizle.
            const fresh = await aiKeysApi.list();
            setAiMasked((prev) => {
                const next = { ...prev };
                fresh.forEach((k) => {
                    if (isAiProviderKey(k.provider)) next[k.provider] = k.apiKeyMasked;
                });
                return next;
            });
            if (typedKey) {
                setAiNewKeys((prev) => ({ ...prev, [provider]: '' }));
                setRevealedKeys((prev) => ({ ...prev, [provider]: '' }));
                setShowKey((prev) => ({ ...prev, [provider]: false }));
            }
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Test başarısız');
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

                {AI_PROVIDERS.map((p) => (
                    <div key={p.key} className="rounded-xl border border-gray-100 p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-[#663259]">
                                    {p.icon}
                                </span>
                                {p.label}
                            </span>
                            {aiMasked[p.key] && (
                                <span className="text-xs text-gray-400 font-mono">{aiMasked[p.key]}</span>
                            )}
                        </div>
                        <div className="relative mb-2">
                            <input
                                type={showKey[p.key] ? 'text' : 'password'}
                                value={aiNewKeys[p.key] || (showKey[p.key] ? revealedKeys[p.key] : '')}
                                onChange={(e) => setAiNewKeys((prev) => ({ ...prev, [p.key]: e.target.value }))}
                                placeholder={aiMasked[p.key] ? 'Yeni anahtar (değiştirmek için)' : p.keyPlaceholder}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm font-mono focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
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
                            className="inline-flex items-center gap-1 text-xs text-[#663259] hover:underline mb-2"
                        >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            API anahtarını buradan al
                        </a>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={aiModels[p.key]}
                                onChange={(e) => setAiModels((prev) => ({ ...prev, [p.key]: e.target.value }))}
                                placeholder={p.defaultModel}
                                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                            />
                            <button
                                onClick={() => testAiProvider(p.key)}
                                disabled={testingProvider === p.key || (!aiNewKeys[p.key].trim() && !aiMasked[p.key])}
                                title={
                                    !aiNewKeys[p.key].trim() && !aiMasked[p.key]
                                        ? 'Test etmek için API anahtarı girin'
                                        : 'Anahtarı kaydeder ve test eder'
                                }
                                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 disabled:opacity-40 transition-colors whitespace-nowrap"
                            >
                                {testingProvider === p.key ? 'Test...' : 'Test Et'}
                            </button>
                        </div>
                    </div>
                ))}

                <div className="flex justify-end mt-2">
                    <button
                        onClick={saveKeys}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {saving ? 'Kaydediliyor...' : 'Anahtarları Kaydet'}
                    </button>
                </div>
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
