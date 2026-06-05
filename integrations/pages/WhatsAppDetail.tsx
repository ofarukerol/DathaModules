// WhatsAppDetail — WhatsApp Sipariş Botu yönetim/detay paneli
// @see DAT-145 — WhatsApp pazaryeri değil, mesajlaşma kanalı; Trendyol detayından ayrı.
//
// Ayarlar > Tanımlamalar > WhatsApp sekmesinde gömülü (embedded) render edilir.
// Tek WhatsApp entegrasyonu olduğu varsayımıyla detayı DOĞRUDAN gösterir (liste yok).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import { IntegrationProvider, PROVIDER_COLORS } from '../../../shared/src';
import type { IntegrationDto, UpdateIntegrationPayload } from '../services/integrationsApi';
import { useToastStore } from '../../../stores/useToastStore';
import MapPickerModal from '@/components/modals/MapPickerModal';
import CustomSelect from '@/components/CustomSelect';
import { type AiProviderKey } from '../services/aiKeysApi';
import { AI_PROVIDERS, isAiProviderKey } from '../config/aiProviders';
import { whatsappKnowledgeApi, type KnowledgeDoc } from '../services/whatsappKnowledgeApi';

// Backend sabit verify token (env WHATSAPP_VERIFY_TOKEN). Meta'ya bu değer girilir.
const BACKEND_VERIFY_TOKEN = 'datha-webhook-verify';
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'https://backend.datha.com.tr/api';
const WEBHOOK_URL = `${API_BASE_URL}/webhooks/whatsapp`;

interface WhatsAppDetailProps {
    /** Ayarlar paneli içinde gömülü mü (kompakt başlık) */
    embedded?: boolean;
    /** Panelin altına eklenecek ek bölüm (ör. ürün açıklamaları listesi) */
    children?: React.ReactNode;
}

export default function WhatsAppDetail({ embedded = false, children }: WhatsAppDetailProps = {}) {
    const navigate = useNavigate();
    const { integrations, fetchIntegrations, updateIntegration, deleteIntegration } = useIntegrationStore();

    useEffect(() => {
        if (!integrations.length) fetchIntegrations();
    }, [fetchIntegrations, integrations.length]);

    const integration = useMemo<IntegrationDto | null>(
        () => integrations.find((i) => i.provider === IntegrationProvider.WHATSAPP) ?? null,
        [integrations],
    );

    // ── Boş durum: henüz bağlı değil ──
    if (!integration) {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
                    style={{ backgroundColor: PROVIDER_COLORS[IntegrationProvider.WHATSAPP].bg, color: PROVIDER_COLORS[IntegrationProvider.WHATSAPP].fg }}>
                    W
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">WhatsApp henüz bağlı değil</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md">
                        Müşterileriniz WhatsApp üzerinden sipariş verebilsin diye WhatsApp Business hesabınızı bağlayın.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/finance/marketplaces/whatsapp-setup')}
                    className="px-6 py-3 rounded-xl font-bold text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                    <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">link</span>
                        WhatsApp'a Bağlan
                    </span>
                </button>
            </div>
        );
    }

    return <WhatsAppDetailBody integration={integration} embedded={embedded}
        onUpdate={updateIntegration} onDelete={deleteIntegration} navigate={navigate}>{children}</WhatsAppDetailBody>;
}

// ─────────────────────────────────────────────────────────────────────────────

interface BodyProps {
    integration: IntegrationDto;
    embedded: boolean;
    onUpdate: (id: string, payload: UpdateIntegrationPayload) => Promise<IntegrationDto>;
    onDelete: (id: string) => Promise<void>;
    navigate: ReturnType<typeof useNavigate>;
    children?: React.ReactNode;
}

function WhatsAppDetailBody({ integration, embedded, onUpdate, onDelete, navigate, children }: BodyProps) {
    const addToast = useToastStore((s) => s.addToast);
    const config = (integration.config ?? {}) as Record<string, unknown>;

    // Kaydetme anında store'daki EN GÜNCEL config'i baz al — bu sayfada birden
    // fazla bağımsız "Kaydet" butonu var (bot ayarı / mağaza bilgisi / konum);
    // render-anı config closure'ı bayatsa, başka bir handler'ın az önce yazdığını
    // ezmeyi önler.
    const latestConfig = (): Record<string, unknown> => {
        const fresh = useIntegrationStore
            .getState()
            .integrations.find((i) => i.id === integration.id);
        return ((fresh?.config ?? config) ?? {}) as Record<string, unknown>;
    };

    const isConnected = integration.status === 'CONNECTED';

    // Bot ayarları (config'den)
    const [minOrderAmount, setMinOrderAmount] = useState<number>(Number(config.minOrderAmount ?? 50));
    const [askPaymentMethod, setAskPaymentMethod] = useState<boolean>(config.askPaymentMethod !== false);
    // DAT-242 — konuşma tarzı (FRIENDLY/FORMAL/NORMAL); backend prompt üslubunu belirler
    const [aiTone, setAiTone] = useState<string>(
        config.aiTone === 'FRIENDLY' || config.aiTone === 'FORMAL' || config.aiTone === 'NORMAL'
            ? config.aiTone
            : 'NORMAL',
    );
    const [savingBot, setSavingBot] = useState(false);

    // #3 — mağaza özel bilgisi (serbest metin → AI prompt'una gider)
    const [businessInfo, setBusinessInfo] = useState<string>(typeof config.businessInfo === 'string' ? config.businessInfo : '');
    const [savingInfo, setSavingInfo] = useState(false);

    // DAT-242 — WhatsApp bot bilgi tabanı (RAG dokümanları)
    const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
    const [kbTitle, setKbTitle] = useState('');
    const [kbContent, setKbContent] = useState('');
    const [kbSaving, setKbSaving] = useState(false);
    const [kbDeletingId, setKbDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        whatsappKnowledgeApi
            .list()
            .then((docs) => {
                if (!cancelled) setKnowledgeDocs(docs);
            })
            .catch(() => {
                /* henüz doküman yoksa veya yetki yoksa sessizce boş kalır */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const addKnowledge = async () => {
        if (!kbTitle.trim() || !kbContent.trim()) {
            addToast('error', 'Başlık ve içerik zorunludur.');
            return;
        }
        setKbSaving(true);
        try {
            await whatsappKnowledgeApi.create(kbTitle.trim(), kbContent.trim());
            const docs = await whatsappKnowledgeApi.list();
            setKnowledgeDocs(docs);
            setKbTitle('');
            setKbContent('');
            addToast('success', 'Bilgi tabanına eklendi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Eklenemedi');
        } finally {
            setKbSaving(false);
        }
    };

    const removeKnowledge = async (id: string) => {
        setKbDeletingId(id);
        try {
            await whatsappKnowledgeApi.remove(id);
            setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
            addToast('success', 'Doküman silindi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Silinemedi');
        } finally {
            setKbDeletingId(null);
        }
    };

    // DAT-242 Paket B — yetkili numaraları (max 3, ilki ana). AI cevaplayamayınca sorar.
    const initAuthorities = Array.isArray(config.authorityPhones)
        ? (config.authorityPhones as unknown[]).filter((p): p is string => typeof p === 'string')
        : [];
    const [authorityPhones, setAuthorityPhones] = useState<string[]>([
        initAuthorities[0] ?? '',
        initAuthorities[1] ?? '',
        initAuthorities[2] ?? '',
    ]);
    const [savingAuthorities, setSavingAuthorities] = useState(false);

    const saveAuthorityPhones = async () => {
        const cleaned = authorityPhones.map((p) => p.trim()).filter(Boolean);
        setSavingAuthorities(true);
        try {
            await onUpdate(integration.id, {
                config: { ...latestConfig(), authorityPhones: cleaned },
            });
            addToast('success', 'Yetkili numaraları kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingAuthorities(false);
        }
    };

    const saveBusinessInfo = async () => {
        setSavingInfo(true);
        try {
            await onUpdate(integration.id, {
                config: { ...latestConfig(), businessInfo: businessInfo.trim() },
            });
            addToast('success', 'Mağaza bilgisi kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingInfo(false);
        }
    };

    // Konum (haritadan seçilen pin) + Google Haritalar yorum linki
    const [locationLat, setLocationLat] = useState<string>(
        config.locationLatitude != null ? String(config.locationLatitude) : '',
    );
    const [locationLng, setLocationLng] = useState<string>(
        config.locationLongitude != null ? String(config.locationLongitude) : '',
    );
    const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(
        typeof config.googleReviewUrl === 'string' ? config.googleReviewUrl : '',
    );
    const [mapOpen, setMapOpen] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);

    const hasLocation = locationLat.trim() !== '' && locationLng.trim() !== '';

    const saveLocation = async () => {
        const url = googleReviewUrl.trim();
        // URL girildiyse http(s) doğrula — bot bunu müşteriye gönderecek.
        if (url && !/^https?:\/\//i.test(url)) {
            addToast('error', 'Google yorum linki http:// veya https:// ile başlamalı');
            return;
        }
        setSavingLocation(true);
        try {
            const lat = locationLat.trim() === '' ? null : Number(locationLat);
            const lng = locationLng.trim() === '' ? null : Number(locationLng);
            await onUpdate(integration.id, {
                config: {
                    ...latestConfig(),
                    locationLatitude: lat,
                    locationLongitude: lng,
                    googleReviewUrl: url,
                },
            });
            addToast('success', 'Konum ve yorum linki kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingLocation(false);
        }
    };

    // ── DAT-242 — Botun tercih ettiği AI sağlayıcı (WhatsApp'a özel ayar) ──
    // API anahtarları artık merkezi (Tanımlamalar > Yapay Zeka). Burada yalnızca
    // botun ÖNCE hangi sağlayıcıyı deneyeceği seçilir; config.aiPreferredProvider'a yazılır.
    const [aiPreferred, setAiPreferred] = useState<AiProviderKey>(
        isAiProviderKey(config.aiPreferredProvider) ? config.aiPreferredProvider : 'OPENAI',
    );
    const [savingAi, setSavingAi] = useState(false);

    const savePreferredProvider = async () => {
        setSavingAi(true);
        try {
            await onUpdate(integration.id, {
                config: { ...latestConfig(), aiPreferredProvider: aiPreferred },
            });
            addToast('success', 'Tercih edilen sağlayıcı kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingAi(false);
        }
    };

    // Token güncelleme
    const [newToken, setNewToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [savingToken, setSavingToken] = useState(false);

    const saveBotSettings = async () => {
        setSavingBot(true);
        try {
            await onUpdate(integration.id, {
                config: { ...latestConfig(), minOrderAmount, askPaymentMethod, aiTone },
            });
            addToast('success', 'Bot ayarları kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingBot(false);
        }
    };

    const saveToken = async () => {
        if (!newToken.trim()) return;
        setSavingToken(true);
        try {
            await onUpdate(integration.id, { token: newToken.trim(), enabled: true });
            setNewToken('');
            addToast('success', 'Access token güncellendi — bağlantı aktif');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Token güncellenemedi');
        } finally {
            setSavingToken(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('WhatsApp bağlantısını silmek istediğine emin misin? Gelen mesajlar işlenmeyi durdurur.')) return;
        try {
            await onDelete(integration.id);
            addToast('success', 'WhatsApp bağlantısı silindi');
            if (!embedded) navigate('/finance/marketplaces');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Silinemedi');
        }
    };

    return (
        <div className={embedded ? 'absolute inset-0 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-5' : 'flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5'}>
            {/* Başlık + durum */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                        style={{ backgroundColor: '#E8F8EE', color: '#25D366' }}>
                        W
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">WhatsApp Sipariş Botu</h2>
                        <p className="text-sm text-gray-500">Müşteriler WhatsApp'tan doğal dilde sipariş verir</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge connected={isConnected} />
                    <button
                        onClick={handleDelete}
                        className="h-9 px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                        Bağlantıyı Sil
                    </button>
                </div>
            </div>

            {/* Bağlantı bilgileri */}
            <Card title="Bağlantı Bilgileri" icon="link">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Info label="WhatsApp Numarası ID (Phone Number ID)" value={integration.externalAccountId || '—'} mono />
                    <Info label="WhatsApp Business Account ID (WABA)" value={integration.externalStoreId || '—'} mono />
                    <Info label="Durum" value={isConnected ? 'Bağlı ve aktif' : 'Token bekliyor'} />
                    <Info label="Oluşturulma" value={new Date(integration.createdAt).toLocaleDateString('tr-TR')} />
                </div>
            </Card>

            {/* Access token güncelleme */}
            <Card title="Access Token" icon="key">
                <p className="text-sm text-gray-600 mb-3">
                    {integration.hasToken
                        ? 'Token kayıtlı. Süresi dolduysa (bot cevap vermiyorsa) Meta\'dan yeni bir kalıcı System User token alıp güncelleyin.'
                        : 'Henüz token girilmemiş. Meta\'dan aldığınız access token\'ı girin.'}
                </p>
                <div className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                        <input
                            type={showToken ? 'text' : 'password'}
                            value={newToken}
                            onChange={(e) => setNewToken(e.target.value)}
                            placeholder="Yeni access token (EAAxxx...)"
                            className="w-full rounded-xl border border-gray-200 pl-4 pr-11 py-2.5 text-sm font-mono focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            title={showToken ? 'Gizle' : 'Göster'}
                            aria-label={showToken ? 'Token gizle' : 'Token göster'}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#663259] hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {showToken ? 'visibility_off' : 'visibility'}
                            </span>
                        </button>
                    </div>
                    <button
                        onClick={saveToken}
                        disabled={!newToken.trim() || savingToken}
                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingToken ? 'Kaydediliyor...' : 'Güncelle'}
                    </button>
                </div>
            </Card>

            {/* Bot ayarları */}
            <Card title="Bot Ayarları" icon="smart_toy">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-sm text-gray-700">Minimum sipariş tutarı (₺)</label>
                        <input
                            type="number"
                            min={0}
                            value={minOrderAmount}
                            onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none w-48"
                        />
                        <p className="text-xs text-gray-500">Bu tutarın altındaki siparişleri bot otomatik reddeder.</p>
                    </div>

                    <ToggleRow
                        label="Ödeme yöntemini sor"
                        description="Bot sipariş onayında 'Nakit / Kart / Online' sorar."
                        enabled={askPaymentMethod}
                        onToggle={() => setAskPaymentMethod((v) => !v)}
                    />

                    {/* DAT-242 — konuşma tarzı */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-sm text-gray-700">Konuşma tarzı</label>
                        <div className="w-64">
                            <CustomSelect
                                options={[
                                    { value: 'FRIENDLY', label: 'Samimi', icon: 'sentiment_satisfied' },
                                    { value: 'NORMAL', label: 'Normal (ideal)', icon: 'balance' },
                                    { value: 'FORMAL', label: 'Resmi', icon: 'business_center' },
                                ]}
                                value={aiTone}
                                onChange={setAiTone}
                                placeholder="Tarz seçin"
                                accentColor="#663259"
                            />
                        </div>
                        <p className="text-xs text-gray-500">Botun müşteriye yanıt verirken kullanacağı üslup.</p>
                    </div>

                    <button
                        onClick={saveBotSettings}
                        disabled={savingBot}
                        className="self-start px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingBot ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </button>
                </div>
            </Card>

            {/* DAT-242 — Botun tercih ettiği AI sağlayıcı. Anahtarlar merkezi (Tanımlamalar > Yapay Zeka). */}
            <Card title="Yapay Zeka Sağlayıcı" icon="psychology">
                <p className="text-sm text-gray-600 mb-4">
                    Botun önce hangi yapay zeka sağlayıcısını kullanacağını seçin. Seçilen sağlayıcı
                    önce denenir; hata/limit olursa bot otomatik diğerine geçer (kesintisiz yanıt).
                    <br />
                    <span className="text-gray-500">
                        API anahtarlarını <strong>Tanımlamalar &gt; Yapay Zeka</strong> sekmesinden
                        yönetebilirsiniz (anahtarlar tüm yapay zeka özellikleri için ortaktır).
                    </span>
                </p>

                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tercih Edilen Sağlayıcı (önce denenir)</label>
                <CustomSelect
                    options={AI_PROVIDERS.map((p) => ({ value: p.key, label: p.label, icon: p.icon }))}
                    value={aiPreferred}
                    onChange={(v) => setAiPreferred(v as AiProviderKey)}
                    placeholder="Sağlayıcı seçin"
                    accentColor="#663259"
                />

                <div className="flex justify-end mt-4">
                    <button
                        onClick={savePreferredProvider}
                        disabled={savingAi}
                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingAi ? 'Kaydediliyor...' : 'Tercihi Kaydet'}
                    </button>
                </div>
            </Card>

            {/* DAT-242 — Bilgi Tabanı (bot bu dokümanlardan cevap verir; RAG) */}
            <Card title="Bilgi Tabanı" icon="menu_book">
                <p className="text-sm text-gray-600 mb-4">
                    Botun müşteri sorularında kullanacağı dokümanlar (SSS, kampanya, teslimat
                    politikası, sık sorulan özel bilgiler). Eklediğiniz metin bot tarafından otomatik
                    işlenir; müşteri ilgili bir soru sorduğunda bot öncelikle buradan cevap verir.
                    Burada olmayan bilgiyi uydurmaz.
                </p>

                {knowledgeDocs.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                        {knowledgeDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-2.5"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{doc.title}</p>
                                    <p className="text-xs text-gray-400">
                                        {doc.chunkCount} parça · {doc.status === 'INDEXED' ? 'hazır' : doc.status}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeKnowledge(doc.id)}
                                    disabled={kbDeletingId === doc.id}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-40 shrink-0"
                                >
                                    {kbDeletingId === doc.id ? 'Siliniyor...' : 'Sil'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        maxLength={120}
                        placeholder="Başlık (örn. Teslimat Bölgeleri)"
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                    />
                    <textarea
                        value={kbContent}
                        onChange={(e) => setKbContent(e.target.value)}
                        rows={4}
                        maxLength={8000}
                        placeholder={'İçerik (örn. Sadece merkez ilçeye teslimat yapıyoruz. Hafta içi 11:00-22:00 arası. Min. sipariş 50₺.)'}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none resize-y"
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{kbContent.length}/8000</span>
                        <button
                            onClick={addKnowledge}
                            disabled={kbSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                        >
                            {kbSaving ? 'Ekleniyor...' : 'Bilgi Ekle'}
                        </button>
                    </div>
                </div>
            </Card>

            {/* DAT-242 Paket B — Yetkili numaraları (AI bilemezse WhatsApp'tan sorar) */}
            <Card title="Yetkili Numaraları" icon="support_agent">
                <p className="text-sm text-gray-600 mb-4">
                    Yapay zeka bir soruyu cevaplayamadığında (örn. özel istek, menüde olmayan bilgi),
                    soruyu buradaki yetkilinin WhatsApp'ına iletir; yetkilinin cevabını müşteriye otomatik
                    aktarır. <strong>Ana yetkili 3 dakika içinde yanıtlamazsa</strong> sıradaki yetkiliye sorar.
                    En fazla 3 numara tanımlanabilir.
                </p>
                <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                            <label className="font-bold text-xs text-gray-500 uppercase tracking-wide">
                                {i === 0 ? 'Ana yetkili' : `${i + 1}. yetkili (yedek)`}
                            </label>
                            <input
                                type="tel"
                                value={authorityPhones[i]}
                                onChange={(e) =>
                                    setAuthorityPhones((prev) => {
                                        const next = [...prev];
                                        next[i] = e.target.value;
                                        return next;
                                    })
                                }
                                placeholder="örn. 905321234567"
                                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none w-64"
                            />
                        </div>
                    ))}
                    <p className="text-xs text-gray-400">
                        Ülke koduyla yazın (Türkiye için 90...). Yetkili, botun gönderdiği soru mesajına
                        WhatsApp'tan yanıt yazarak cevap verir.
                    </p>
                    <button
                        onClick={saveAuthorityPhones}
                        disabled={savingAuthorities}
                        className="self-start px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingAuthorities ? 'Kaydediliyor...' : 'Yetkilileri Kaydet'}
                    </button>
                </div>
            </Card>

            {/* #3 — Mağaza özel bilgisi (AI bu metni müşteri sorularında kullanır) */}
            <Card title="Mağaza Bilgisi" icon="store">
                <p className="text-sm text-gray-600 mb-3">
                    Bot'un müşteri sorularında kullanacağı serbest bilgi. Adres, kampanya, teslimat bölgesi,
                    sık sorulan notlar vb. yazabilirsiniz. Bot bu metinden cevaplar; burada olmayan bilgiyi uydurmaz.
                </p>
                <textarea
                    value={businessInfo}
                    onChange={(e) => setBusinessInfo(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder={'Örn: Adresimiz Atatürk Mah. 5. Sok. No:3. Teslimat sadece merkez ilçeye. Min. sipariş 50₺. Salı günleri %10 indirim.'}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none resize-y"
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{businessInfo.length}/2000</span>
                    <button
                        onClick={saveBusinessInfo}
                        disabled={savingInfo}
                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingInfo ? 'Kaydediliyor...' : 'Bilgiyi Kaydet'}
                    </button>
                </div>
            </Card>

            {/* #2 — Konum (haritadan pin) + Google Haritalar yorum linki */}
            <Card title="Konum & Google Yorum" icon="pin_drop">
                <p className="text-sm text-gray-600 mb-4">
                    Müşteri "neredesiniz / konum" sorduğunda bot, aşağıda seçtiğiniz pinli konumu WhatsApp konumu
                    olarak gönderir. Google yorum linki tanımlıysa, konumla birlikte değerlendirme daveti de iletir.
                </p>

                {/* Harita konumu */}
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Restoran Konumu</label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                        onClick={() => setMapOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">map</span>
                        {hasLocation ? 'Konumu Haritadan Değiştir' : 'Haritadan Konum Seç'}
                    </button>
                    {hasLocation && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono">
                            <span className="material-symbols-outlined text-[16px] text-emerald-500">location_on</span>
                            {Number(locationLat).toFixed(6)}, {Number(locationLng).toFixed(6)}
                        </span>
                    )}
                    {hasLocation && (
                        <button
                            onClick={() => { setLocationLat(''); setLocationLng(''); }}
                            className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
                        >
                            Temizle
                        </button>
                    )}
                </div>

                {/* Google yorum linki */}
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mt-4 mb-2">Google Haritalar Yorum Linki</label>
                <input
                    type="url"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/..../review veya https://maps.app.goo.gl/..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                    Google İşletme Profili → "Daha fazla yorum al" bağlantısını yapıştırın. Müşteriye konumla birlikte gönderilir.
                </p>

                <div className="flex justify-end mt-3">
                    <button
                        onClick={saveLocation}
                        disabled={savingLocation}
                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingLocation ? 'Kaydediliyor...' : 'Konum & Linki Kaydet'}
                    </button>
                </div>
            </Card>

            {/* Webhook bilgisi */}
            <Card title="Webhook Bilgisi" icon="webhook">
                <p className="text-sm text-gray-600 mb-3">
                    Meta App → WhatsApp → Configuration → Webhooks bölümüne aşağıdaki değerleri girin (zaten yapıldıysa dokunmayın):
                </p>
                <div className="flex flex-col gap-3">
                    <CopyField label="Callback URL" value={WEBHOOK_URL} />
                    <CopyField label="Verify Token" value={BACKEND_VERIFY_TOKEN} />
                </div>
            </Card>

            {/* Ek bölüm — ürün açıklamaları listesi (Ayarlar > WhatsApp altında) */}
            {children}

            {/* Haritadan konum seçici */}
            <MapPickerModal
                isOpen={mapOpen}
                onClose={() => setMapOpen(false)}
                initialLat={locationLat || undefined}
                initialLng={locationLng || undefined}
                onSelect={(lat, lng) => { setLocationLat(lat); setLocationLng(lng); }}
            />
        </div>
    );
}

// ─── Küçük yardımcı bileşenler ───

function StatusBadge({ connected }: { connected: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Bağlı' : 'Token bekliyor'}
        </span>
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

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
            <p className={`text-sm text-gray-800 font-semibold ${mono ? 'font-mono' : ''} break-all`}>{value}</p>
        </div>
    );
}

function ToggleRow({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="font-bold text-sm text-gray-700">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-[#663259]' : 'bg-gray-300'}`}
            >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}

function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const addToast = useToastStore((s) => s.addToast);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('error', 'Kopyalanamadı');
        }
    };
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-bold text-xs text-gray-500">{label}</label>
            <div className="flex items-stretch gap-2">
                <input type="text" value={value} readOnly
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono bg-gray-50 select-all" />
                <button type="button" onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-[#663259] text-white hover:shadow-lg hover:shadow-[#663259]/20'}`}>
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
            </div>
        </div>
    );
}
