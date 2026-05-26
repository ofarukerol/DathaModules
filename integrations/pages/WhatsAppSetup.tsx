// WhatsAppSetup — WhatsApp Business API bağlantı sayfası
// @see DAT-145 Item 11 (Embedded Signup)
//
// Varsayılan akış: Meta Embedded Signup (tek tıkla bağlanma)
//   1. Bot ayarları (min sipariş, ödeme sorusu, varsayılan şube)
//   2. "WhatsApp'a Bağlan" → FB.login popup → Meta'da WABA seç/oluştur
//   3. Backend code'u uzun ömürlü token'a çevirir + WABA'ya subscribe eder
//   4. Sonuç — entegrasyon CONNECTED
//
// Fallback: "Gelişmiş kurulum" — manuel WABA ID + Token (sandbox/test için)

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../../components/GradientHeader';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import {
    IntegrationProvider,
    PROVIDER_LABELS,
    PROVIDER_COLORS,
} from '../../../shared/src';
import type { IntegrationDto, BranchOption } from '../services/integrationsApi';
import { tenantApi, whatsappOnboardingApi } from '../services/integrationsApi';

// ---------------- Facebook SDK type tanımları ----------------

interface FBLoginResponse {
    status: string;
    authResponse?: {
        code?: string;
        accessToken?: string;
        userID?: string;
    };
}

interface FBLoginOptions {
    config_id?: string;
    response_type?: 'code' | 'token';
    override_default_response_type?: boolean;
    extras?: Record<string, unknown>;
    scope?: string;
}

interface FBSDK {
    init(opts: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
    login(callback: (response: FBLoginResponse) => void, opts?: FBLoginOptions): void;
    AppEvents?: { logPageView(): void };
}

declare global {
    interface Window {
        FB?: FBSDK;
        fbAsyncInit?: () => void;
    }
}

// ---------------- Sabitler ----------------

const FB_APP_ID = (import.meta.env.VITE_WHATSAPP_APP_ID as string | undefined) || '';
const FB_CONFIG_ID = (import.meta.env.VITE_WHATSAPP_CONFIG_ID as string | undefined) || '';
const FB_GRAPH_VERSION = 'v19.0';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api';
const WEBHOOK_URL = `${API_BASE_URL}/webhooks/whatsapp`;

function generateVerifyToken(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Facebook SDK'sını lazy load et (sadece bu sayfa açılınca)
function loadFacebookSDK(appId: string): Promise<FBSDK> {
    return new Promise((resolve, reject) => {
        if (window.FB) {
            resolve(window.FB);
            return;
        }
        if (!appId) {
            reject(new Error('VITE_WHATSAPP_APP_ID tanımsız'));
            return;
        }
        window.fbAsyncInit = function () {
            window.FB!.init({
                appId,
                cookie: true,
                xfbml: false,
                version: FB_GRAPH_VERSION,
            });
            resolve(window.FB!);
        };
        const existing = document.getElementById('facebook-jssdk');
        if (existing) {
            // Script yüklü ama init henüz çalışmamış — fbAsyncInit zaten çağrılacak
            return;
        }
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => reject(new Error('Facebook SDK yüklenemedi (internet bağlantısı?)'));
        document.body.appendChild(script);
    });
}

// ---------------- Ana bileşen ----------------

export default function WhatsAppSetup() {
    const navigate = useNavigate();
    const { createIntegration } = useIntegrationStore();

    // Mod: 'embedded' (varsayılan, tek tıkla) | 'manual' (gelişmiş, eski wizard)
    const [mode, setMode] = useState<'embedded' | 'manual'>('embedded');

    // Bot ayarları (her iki modda da)
    const [minOrderAmount, setMinOrderAmount] = useState(50);
    const [askPaymentMethod, setAskPaymentMethod] = useState(true);
    const [defaultBranchId, setDefaultBranchId] = useState<string>('');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    // Embedded Signup state
    const [embedStatus, setEmbedStatus] = useState<'idle' | 'loading_sdk' | 'in_popup' | 'submitting' | 'done' | 'error'>('idle');
    const [embedError, setEmbedError] = useState<string | null>(null);
    const [embedResult, setEmbedResult] = useState<IntegrationDto | null>(null);

    // Manual mode state (eski wizard'dan)
    const [manualStep, setManualStep] = useState<1 | 2 | 3 | 4>(1);
    const [wabaId, setWabaId] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [manualSubmitting, setManualSubmitting] = useState(false);
    const [manualError, setManualError] = useState<string | null>(null);
    const [manualResult, setManualResult] = useState<IntegrationDto | null>(null);
    const verifyToken = useMemo(() => generateVerifyToken(), []);

    const providerColors = PROVIDER_COLORS[IntegrationProvider.WHATSAPP];

    useEffect(() => {
        tenantApi.getBranches().then(setBranches).catch(() => {});
    }, []);

    // ---------------- Embedded Signup akışı ----------------

    const handleEmbeddedSignup = useCallback(async () => {
        setEmbedError(null);

        if (!FB_APP_ID) {
            setEmbedError('Sistem yapılandırması eksik: WhatsApp App ID tanımlanmamış. Datha ekibiyle iletişime geçin.');
            return;
        }

        setEmbedStatus('loading_sdk');
        let FB: FBSDK;
        try {
            FB = await loadFacebookSDK(FB_APP_ID);
        } catch (err) {
            setEmbedError(err instanceof Error ? err.message : 'Facebook SDK yüklenemedi');
            setEmbedStatus('error');
            return;
        }

        setEmbedStatus('in_popup');

        // Meta'nın popup'ından gelen WABA + Phone ID'yi yakalamak için listener
        let receivedWaba: string | null = null;
        let receivedPhone: string | null = null;
        const messageHandler = (event: MessageEvent) => {
            if (!event.origin.endsWith('facebook.com')) return;
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (data?.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        receivedWaba = data.data?.waba_id ?? null;
                        receivedPhone = data.data?.phone_number_id ?? null;
                    } else if (data.event === 'CANCEL') {
                        setEmbedError('Kurulum iptal edildi');
                        setEmbedStatus('idle');
                    }
                }
            } catch {
                // ignore
            }
        };
        window.addEventListener('message', messageHandler);

        FB.login(
            (response) => {
                window.removeEventListener('message', messageHandler);

                if (!response.authResponse?.code) {
                    setEmbedError('Bağlantı tamamlanamadı (Meta\'dan code dönmedi). Lütfen tekrar deneyin.');
                    setEmbedStatus('error');
                    return;
                }
                if (!receivedWaba || !receivedPhone) {
                    setEmbedError('WhatsApp Business Account veya telefon ID alınamadı. Lütfen Meta\'da tüm adımları tamamladığınızdan emin olun.');
                    setEmbedStatus('error');
                    return;
                }

                // Backend'e gönder
                setEmbedStatus('submitting');
                whatsappOnboardingApi
                    .completeEmbeddedSignup({
                        code: response.authResponse.code,
                        wabaId: receivedWaba,
                        phoneNumberId: receivedPhone,
                        defaultBranchId: defaultBranchId || undefined,
                    })
                    .then(async (result) => {
                        // Listeyi refresh et → yeni integration'ı bul → bot tercihlerini config'e merge et
                        await useIntegrationStore.getState().fetchIntegrations();
                        const created = useIntegrationStore
                            .getState()
                            .integrations.find((i) => i.id === result.integrationId) ?? null;
                        if (created) {
                            const updated = await useIntegrationStore.getState().updateIntegration(created.id, {
                                config: { ...created.config, minOrderAmount, askPaymentMethod },
                            });
                            setEmbedResult(updated);
                        } else {
                            setEmbedResult(null);
                        }
                        setEmbedStatus('done');
                    })
                    .catch((err: unknown) => {
                        const apiError = err as { response?: { data?: { message?: string } }; message?: string };
                        setEmbedError(apiError.response?.data?.message || apiError.message || 'Bağlantı kaydedilemedi');
                        setEmbedStatus('error');
                    });
            },
            FB_CONFIG_ID
                ? {
                      // Embedded Signup config (Solution Partner / Tech Provider config_id varsa)
                      config_id: FB_CONFIG_ID,
                      response_type: 'code',
                      override_default_response_type: true,
                      extras: { feature: 'whatsapp_embedded_signup', version: 2 },
                  }
                : {
                      // Config yoksa: doğrudan OAuth + açık scope
                      // (Dev Mode'da app admin/tester rolündeki kullanıcı için çalışır;
                      //  production'da App Review onayı gerekir)
                      scope: 'whatsapp_business_management,whatsapp_business_messaging',
                      response_type: 'code',
                      override_default_response_type: true,
                      extras: { feature: 'whatsapp_embedded_signup', version: 2 },
                  },
        );
    }, [defaultBranchId, minOrderAmount, askPaymentMethod]);

    // ---------------- Manual mode (eski wizard, fallback) ----------------

    const isManualFormValid =
        wabaId.trim().length > 0 &&
        phoneNumberId.trim().length > 0 &&
        accessToken.trim().length > 0 &&
        appSecret.trim().length > 0;

    const handleManualSubmit = async () => {
        if (!isManualFormValid) return;
        setManualSubmitting(true);
        setManualError(null);
        try {
            const created = await createIntegration({
                provider: IntegrationProvider.WHATSAPP,
                externalAccountId: phoneNumberId.trim(),
                externalStoreId: wabaId.trim(),
                apiKey: '',
                apiSecret: '',
                token: accessToken.trim(),
                features: { fetchOrders: true },
                config: {
                    appSecret: appSecret.trim(),
                    verifyToken,
                    webhookUrl: WEBHOOK_URL,
                    minOrderAmount,
                    askPaymentMethod,
                },
            });
            setManualResult(created);
            if (defaultBranchId) {
                await tenantApi.updateWhatsappDefaultBranch(defaultBranchId);
            }
            setManualStep(3);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } }; message?: string };
            setManualError(apiError.response?.data?.message || apiError.message || 'Entegrasyon kaydedilemedi');
        } finally {
            setManualSubmitting(false);
        }
    };

    // ---------------- Render ----------------

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="chat"
                    title={`${PROVIDER_LABELS[IntegrationProvider.WHATSAPP]} Entegrasyonu`}
                    subtitle="Müşterileriniz WhatsApp üzerinden sipariş verebilir"
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        {/* Provider chip */}
                        <div className="flex items-center justify-between mb-6">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black"
                                style={{ backgroundColor: providerColors.bg, color: providerColors.fg }}
                            >
                                {providerColors.logo}
                            </div>
                            {mode === 'embedded' && embedStatus !== 'done' && (
                                <button
                                    onClick={() => setMode('manual')}
                                    className="text-xs text-gray-500 underline hover:text-gray-700"
                                >
                                    Gelişmiş: Manuel kurulum
                                </button>
                            )}
                            {mode === 'manual' && manualStep < 3 && (
                                <button
                                    onClick={() => setMode('embedded')}
                                    className="text-xs text-gray-500 underline hover:text-gray-700"
                                >
                                    ← Otomatik bağlanmaya dön
                                </button>
                            )}
                        </div>

                        {/* ============ EMBEDDED SIGNUP MODE ============ */}
                        {mode === 'embedded' && embedStatus !== 'done' && (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">WhatsApp'a tek tıkla bağlan</h2>
                                    <p className="text-sm text-gray-600 leading-relaxed mt-2">
                                        Aşağıdaki ayarları yapıp <strong>WhatsApp'a Bağlan</strong> butonuna tıklayın.
                                        Açılan Meta penceresinde işletme telefonunuzu seçin/ekleyin, izin verin.
                                        Bağlantı otomatik tamamlanır.
                                    </p>
                                </div>

                                {/* Bot ayarları */}
                                <div className="bg-gray-50 rounded-xl p-5 flex flex-col gap-4 border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Bot Ayarları</h3>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-bold text-sm">Minimum sipariş tutarı (₺)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={minOrderAmount}
                                            onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                                        />
                                        <p className="text-xs text-gray-500">Bu tutarın altındaki siparişleri bot otomatik reddeder.</p>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={askPaymentMethod}
                                            onChange={(e) => setAskPaymentMethod(e.target.checked)}
                                            className="w-5 h-5 rounded accent-[#663259]"
                                        />
                                        <div>
                                            <div className="font-bold text-sm">Ödeme yöntemini sor</div>
                                            <div className="text-xs text-gray-500">Bot sipariş onayında "Nakit / Kart / Online" sorar.</div>
                                        </div>
                                    </label>

                                    {branches.length > 1 && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="font-bold text-sm">Varsayılan şube</label>
                                            <select
                                                value={defaultBranchId}
                                                onChange={(e) => setDefaultBranchId(e.target.value)}
                                                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none bg-white"
                                            >
                                                <option value="">Otomatik (ana şube)</option>
                                                {branches.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}
                                                        {b.isMainBranch ? ' (Ana)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500">WhatsApp siparişleri bu şubeye düşer.</p>
                                        </div>
                                    )}
                                </div>

                                {embedError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                                        <p className="font-bold mb-1">⚠ Hata</p>
                                        <p>{embedError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleEmbeddedSignup}
                                    disabled={embedStatus === 'loading_sdk' || embedStatus === 'in_popup' || embedStatus === 'submitting'}
                                    className="w-full mt-2 px-6 py-3.5 rounded-xl font-bold text-base text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                                >
                                    {embedStatus === 'idle' && (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[20px]">link</span>
                                            WhatsApp'a Bağlan
                                        </span>
                                    )}
                                    {embedStatus === 'loading_sdk' && 'Yükleniyor...'}
                                    {embedStatus === 'in_popup' && 'Meta penceresinde devam edin...'}
                                    {embedStatus === 'submitting' && 'Bağlantı tamamlanıyor...'}
                                    {embedStatus === 'error' && 'Tekrar dene'}
                                </button>

                                <p className="text-xs text-gray-500 text-center mt-1">
                                    Bağlanarak <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noreferrer" className="underline">WhatsApp Business Politikası</a>'nı kabul etmiş olursunuz.
                                </p>
                            </div>
                        )}

                        {/* ============ EMBEDDED SUCCESS ============ */}
                        {mode === 'embedded' && embedStatus === 'done' && (
                            <SuccessScreen
                                integration={embedResult}
                                onGoBack={() => navigate('/finance/marketplaces')}
                            />
                        )}

                        {/* ============ MANUAL MODE (fallback wizard) ============ */}
                        {mode === 'manual' && (
                            <ManualWizard
                                step={manualStep}
                                setStep={setManualStep}
                                wabaId={wabaId}
                                setWabaId={setWabaId}
                                phoneNumberId={phoneNumberId}
                                setPhoneNumberId={setPhoneNumberId}
                                accessToken={accessToken}
                                setAccessToken={setAccessToken}
                                appSecret={appSecret}
                                setAppSecret={setAppSecret}
                                minOrderAmount={minOrderAmount}
                                setMinOrderAmount={setMinOrderAmount}
                                askPaymentMethod={askPaymentMethod}
                                setAskPaymentMethod={setAskPaymentMethod}
                                defaultBranchId={defaultBranchId}
                                setDefaultBranchId={setDefaultBranchId}
                                branches={branches}
                                webhookUrl={WEBHOOK_URL}
                                verifyToken={verifyToken}
                                isFormValid={isManualFormValid}
                                submitting={manualSubmitting}
                                error={manualError}
                                result={manualResult}
                                onSubmit={handleManualSubmit}
                                onFinish={() => navigate('/finance/marketplaces')}
                                providerColor={providerColors.fg}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------- Success ekranı ----------------

interface SuccessScreenProps {
    integration: IntegrationDto | null;
    onGoBack: () => void;
}

function SuccessScreen({ integration, onGoBack }: SuccessScreenProps) {
    return (
        <div className="flex flex-col items-center gap-4 text-center py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[44px]">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Bağlantı tamamlandı ✓</h2>
            <p className="text-sm text-gray-600 max-w-md">
                WhatsApp Business hesabınız Datha'ya bağlandı. Artık müşterileriniz işletme numaranıza yazdıklarında
                bot otomatik sipariş alacak.
            </p>
            {integration && (
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 font-mono w-full max-w-md text-left">
                    <div>WABA ID: {integration.externalStoreId}</div>
                    <div>Phone ID: {integration.externalAccountId}</div>
                </div>
            )}
            <button
                onClick={onGoBack}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20"
            >
                Pazaryerlerine Dön
            </button>
        </div>
    );
}

// ---------------- Manuel Wizard (eski 5-step akış, advanced) ----------------

interface ManualWizardProps {
    step: 1 | 2 | 3 | 4;
    setStep: (s: 1 | 2 | 3 | 4) => void;
    wabaId: string;
    setWabaId: (v: string) => void;
    phoneNumberId: string;
    setPhoneNumberId: (v: string) => void;
    accessToken: string;
    setAccessToken: (v: string) => void;
    appSecret: string;
    setAppSecret: (v: string) => void;
    minOrderAmount: number;
    setMinOrderAmount: (v: number) => void;
    askPaymentMethod: boolean;
    setAskPaymentMethod: (v: boolean) => void;
    defaultBranchId: string;
    setDefaultBranchId: (v: string) => void;
    branches: BranchOption[];
    webhookUrl: string;
    verifyToken: string;
    isFormValid: boolean;
    submitting: boolean;
    error: string | null;
    result: IntegrationDto | null;
    onSubmit: () => void;
    onFinish: () => void;
    providerColor: string;
}

function ManualWizard(p: ManualWizardProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* Step pill */}
            <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`flex-1 h-1.5 rounded-full ${s <= p.step ? 'bg-[#663259]' : 'bg-gray-200'}`}
                    />
                ))}
            </div>

            {p.step === 1 && (
                <>
                    <h2 className="text-xl font-bold text-gray-800">Manuel Kurulum: Credentials</h2>
                    <p className="text-sm text-gray-600">
                        Meta App'inizden aldığınız WABA bilgilerini girin. (Sandbox/test ya da kendi Meta App'iniz olan
                        durumlar için.)
                    </p>
                    <FormField label="WABA ID" placeholder="123456789012345" value={p.wabaId} onChange={p.setWabaId} required />
                    <FormField label="Phone Number ID" placeholder="987654321098765" value={p.phoneNumberId} onChange={p.setPhoneNumberId} required />
                    <FormField label="Access Token" placeholder="EAAxxx..." value={p.accessToken} onChange={p.setAccessToken} required type="password" />
                    <FormField label="App Secret" placeholder="abc123..." value={p.appSecret} onChange={p.setAppSecret} required type="password" />
                    <button
                        onClick={() => p.setStep(2)}
                        disabled={!p.isFormValid}
                        className="self-end mt-2 px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50"
                    >
                        Devam Et →
                    </button>
                </>
            )}

            {p.step === 2 && (
                <>
                    <h2 className="text-xl font-bold text-gray-800">Bot Ayarları</h2>
                    <FormField label="Min sipariş tutarı (₺)" value={String(p.minOrderAmount)} onChange={(v) => p.setMinOrderAmount(Number(v) || 0)} type="number" />
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={p.askPaymentMethod} onChange={(e) => p.setAskPaymentMethod(e.target.checked)} className="w-5 h-5 accent-[#663259]" />
                        <span className="text-sm font-bold">Ödeme yöntemini sor</span>
                    </label>
                    {p.branches.length > 1 && (
                        <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-sm">Varsayılan şube</label>
                            <select value={p.defaultBranchId} onChange={(e) => p.setDefaultBranchId(e.target.value)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white">
                                <option value="">Otomatik (ana şube)</option>
                                {p.branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}{b.isMainBranch ? ' (Ana)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {p.error && <div className="text-sm text-red-600">{p.error}</div>}
                    <div className="flex justify-between mt-2">
                        <button onClick={() => p.setStep(1)} className="px-5 py-2.5 rounded-xl bg-gray-100 font-bold text-sm">← Geri</button>
                        <button onClick={p.onSubmit} disabled={p.submitting} className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm disabled:opacity-50">
                            {p.submitting ? 'Kaydediliyor...' : 'Kaydet ve Webhook Bilgilerini Göster →'}
                        </button>
                    </div>
                </>
            )}

            {p.step === 3 && p.result && (
                <>
                    <h2 className="text-xl font-bold text-gray-800">Webhook'u Meta'da Ayarla</h2>
                    <p className="text-sm text-gray-600">
                        Meta App → WhatsApp → Configuration → Webhooks bölümünde aşağıdakileri girin:
                    </p>
                    <CopyField label="Callback URL" value={p.webhookUrl} />
                    <CopyField label="Verify Token" value={p.verifyToken} note="Backend ENV: WHATSAPP_VERIFY_TOKEN ile aynı olmalı" />
                    <button onClick={() => p.setStep(4)} className="self-end mt-2 px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm">Bitir →</button>
                </>
            )}

            {p.step === 4 && (
                <SuccessScreen integration={p.result} onGoBack={p.onFinish} />
            )}
        </div>
    );
}

// ---------------- Yardımcı bileşenler ----------------

interface FormFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    helper?: string;
    type?: 'text' | 'password' | 'number';
}

function FormField({ label, value, onChange, placeholder, required, helper, type = 'text' }: FormFieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-bold text-sm">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
            />
            {helper && <p className="text-xs text-gray-500">{helper}</p>}
        </div>
    );
}

interface CopyFieldProps {
    label: string;
    value: string;
    note?: string;
}

function CopyField({ label, value, note }: CopyFieldProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard erişimi reddedilebilir
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-bold text-sm">{label}</label>
            <div className="flex items-stretch gap-2">
                <input
                    type="text"
                    value={value}
                    readOnly
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono bg-gray-50 select-all"
                />
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-[#663259] text-white hover:shadow-lg hover:shadow-[#663259]/20'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">
                            {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                    </span>
                </button>
            </div>
            {note && <p className="text-xs text-gray-500">{note}</p>}
        </div>
    );
}
