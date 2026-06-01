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

    const isConnected = integration.status === 'CONNECTED';

    // Bot ayarları (config'den)
    const [minOrderAmount, setMinOrderAmount] = useState<number>(Number(config.minOrderAmount ?? 50));
    const [askPaymentMethod, setAskPaymentMethod] = useState<boolean>(config.askPaymentMethod !== false);
    const [savingBot, setSavingBot] = useState(false);

    // #3 — mağaza özel bilgisi (serbest metin → AI prompt'una gider)
    const [businessInfo, setBusinessInfo] = useState<string>(typeof config.businessInfo === 'string' ? config.businessInfo : '');
    const [savingInfo, setSavingInfo] = useState(false);

    const saveBusinessInfo = async () => {
        setSavingInfo(true);
        try {
            await onUpdate(integration.id, {
                config: { ...config, businessInfo: businessInfo.trim() },
            });
            addToast('success', 'Mağaza bilgisi kaydedildi');
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Kaydedilemedi');
        } finally {
            setSavingInfo(false);
        }
    };

    // Token güncelleme
    const [newToken, setNewToken] = useState('');
    const [savingToken, setSavingToken] = useState(false);

    const saveBotSettings = async () => {
        setSavingBot(true);
        try {
            await onUpdate(integration.id, {
                config: { ...config, minOrderAmount, askPaymentMethod },
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
                    <input
                        type="password"
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value)}
                        placeholder="Yeni access token (EAAxxx...)"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                    />
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

                    <button
                        onClick={saveBotSettings}
                        disabled={savingBot}
                        className="self-start px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-[#663259]/20"
                    >
                        {savingBot ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
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
