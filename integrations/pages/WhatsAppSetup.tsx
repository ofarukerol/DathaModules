// WhatsAppSetup — WhatsApp Business API bağlantı wizard'ı (4 adım)
// @see DAT-145 Phase 4
//
// Akış:
//   Step 1: Bilgi  → Meta Business Suite linki, gerekenler
//   Step 2: Form   → WABA ID, Phone Number ID, Access Token, App Secret
//   Step 3: Webhook → Backend webhook URL + Verify Token (kopyala, Meta'ya yapıştır)
//   Step 4: Sonuç  → Entegrasyon CONNECTED, bot aktif
//
// Backend pattern: POST /integrations { provider: WHATSAPP, externalAccountId=phone_number_id,
// externalStoreId=WABA ID, token=access_token, config={appSecret, verifyToken, webhookUrl} }
// apiKey/apiSecret boş gönderilir (WhatsApp'ta kullanılmaz).

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../../components/GradientHeader';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import {
    IntegrationProvider,
    PROVIDER_LABELS,
    PROVIDER_COLORS,
} from '../../../shared/src';
import type { IntegrationDto } from '../services/integrationsApi';

type Step = 1 | 2 | 3 | 4 | 5;

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api';
const WEBHOOK_URL = `${API_BASE_URL}/webhooks/whatsapp`;

function generateVerifyToken(): string {
    // 32 karakterlik random hex — Meta verify_token için yeterli
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function WhatsAppSetup() {
    const navigate = useNavigate();
    const { createIntegration } = useIntegrationStore();

    const [step, setStep] = useState<Step>(1);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [wabaId, setWabaId] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [appSecret, setAppSecret] = useState('');

    const [minOrderAmount, setMinOrderAmount] = useState(50);
    const [askPaymentMethod, setAskPaymentMethod] = useState(true);

    const verifyToken = useMemo(() => generateVerifyToken(), []);

    const [createdIntegration, setCreatedIntegration] = useState<IntegrationDto | null>(null);

    const providerColors = PROVIDER_COLORS[IntegrationProvider.WHATSAPP];

    const isFormValid =
        wabaId.trim().length > 0 &&
        phoneNumberId.trim().length > 0 &&
        accessToken.trim().length > 0 &&
        appSecret.trim().length > 0;

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setSubmitting(true);
        setFormError(null);
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
            setCreatedIntegration(created);
            setStep(4);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } }; message?: string };
            setFormError(apiError.response?.data?.message || apiError.message || 'Entegrasyon kaydedilemedi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="chat"
                    title={`${PROVIDER_LABELS[IntegrationProvider.WHATSAPP]} Entegrasyonu`}
                    subtitle={`Adım ${step} / 5`}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        {/* Step header chip */}
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
                                style={{ backgroundColor: providerColors.bg, color: providerColors.fg }}
                            >
                                {providerColors.logo}
                            </div>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div
                                        key={s}
                                        className={`w-8 h-1.5 rounded-full ${
                                            s <= step ? 'bg-[#663259]' : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Step 1: Bilgi */}
                        {step === 1 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Başlamadan önce</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Müşterilerinizden WhatsApp üzerinden doğal dilde sipariş alabilmek için
                                    Meta WhatsApp Business API'sine bağlanmanız gerekir. Bu işlem için
                                    <strong> Meta for Business</strong> hesabınız ve onaylı bir WhatsApp Business
                                    Account'unuz (WABA) olmalıdır.
                                </p>
                                <a
                                    href="https://business.facebook.com/wa/manage/home/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold underline"
                                    style={{ color: providerColors.fg }}
                                >
                                    Meta WhatsApp Manager'a Git →
                                </a>
                                <p className="text-sm text-gray-600 mt-2">
                                    Aşağıdaki bilgileri elinizin altında bulundurun:
                                </p>
                                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                                    <li>WhatsApp Business Account ID (WABA ID)</li>
                                    <li>Phone Number ID (Meta'nın atadığı telefon ID'si)</li>
                                    <li>Access Token (uzun ömürlü WABA token — System User'dan oluşturun)</li>
                                    <li>App Secret (Meta App ayarlarından)</li>
                                </ul>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2 text-sm text-amber-800">
                                    <p className="font-bold mb-1">💡 İpucu</p>
                                    <p>
                                        Test için Meta'nın sandbox numarasını kullanabilirsiniz. Canlıya
                                        çıkmak için iş telefonunuzun Meta tarafından onaylanması gerekir
                                        (1-3 iş günü sürebilir).
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    className="self-end mt-4 px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20"
                                >
                                    Devam Et →
                                </button>
                            </div>
                        )}

                        {/* Step 2: Form */}
                        {step === 2 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Meta Credentials</h2>
                                <FormField
                                    label="WhatsApp Business Account ID (WABA)"
                                    placeholder="örn: 123456789012345"
                                    value={wabaId}
                                    onChange={setWabaId}
                                    required
                                    helper="Meta Business Suite → WhatsApp Manager → Hesap Bilgileri"
                                />
                                <FormField
                                    label="Phone Number ID"
                                    placeholder="örn: 987654321098765"
                                    value={phoneNumberId}
                                    onChange={setPhoneNumberId}
                                    required
                                    helper="Bot mesajlarının geldiği telefonun Meta-side ID'si"
                                />
                                <FormField
                                    label="Access Token (System User Token)"
                                    placeholder="EAAGm0PX4ZCpsBO..."
                                    value={accessToken}
                                    onChange={setAccessToken}
                                    required
                                    isSecret
                                    helper="Meta Business Settings → System Users → Token (1 yıl ömürlü)"
                                />
                                <FormField
                                    label="App Secret"
                                    placeholder="abc123def456..."
                                    value={appSecret}
                                    onChange={setAppSecret}
                                    required
                                    isSecret
                                    helper="Meta App → Settings → Basic → App Secret (webhook imza doğrulama için)"
                                />

                                <div className="flex justify-between mt-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                                    >
                                        ← Geri
                                    </button>
                                    <button
                                        onClick={() => setStep(3)}
                                        disabled={!isFormValid}
                                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Devam Et →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Bot Ayarları */}
                        {step === 3 && (
                            <div className="flex flex-col gap-5">
                                <h2 className="text-xl font-bold text-gray-800">Bot Ayarları</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Botun sipariş alma davranışını özelleştirin. Bu ayarlar daha sonra
                                    entegrasyon detayından değiştirilebilir.
                                </p>

                                {/* Min Sipariş Tutarı */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-bold text-sm">
                                        Minimum Sipariş Tutarı (₺)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            step={5}
                                            value={minOrderAmount}
                                            onChange={(e) => setMinOrderAmount(Math.max(0, Number(e.target.value)))}
                                            className="w-32 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]"
                                        />
                                        <span className="text-sm text-gray-500">
                                            Bu tutarın altındaki siparişler kabul edilmez.
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">Varsayılan: 50₺ · 0 girersen limit uygulanmaz</p>
                                </div>

                                {/* Ödeme Yöntemi Sor */}
                                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3.5">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">Ödeme Yöntemi Sor</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Aktifken bot sipariş onayından önce ödeme yöntemini (Nakit / Kart / Yemek Kartı) sorar.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAskPaymentMethod(!askPaymentMethod)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${
                                            askPaymentMethod ? 'bg-[#663259]' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                                askPaymentMethod ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {formError && (
                                    <p className="text-sm text-red-600">{formError}</p>
                                )}

                                <div className="flex justify-between mt-2">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                                    >
                                        ← Geri
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Webhook URL */}
                        {step === 4 && createdIntegration && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Meta Webhook Ayarları</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Credentials kaydedildi. Şimdi Meta'da webhook'u bağlayalım.
                                    <strong> Meta App Dashboard → WhatsApp → Configuration → Webhooks</strong>
                                    {' '}sayfasına gidip aşağıdaki bilgileri yapıştırın:
                                </p>

                                <CopyField
                                    label="Callback URL"
                                    value={WEBHOOK_URL}
                                />
                                <CopyField
                                    label="Verify Token"
                                    value={verifyToken}
                                    note="Bu token bizde de saklı, Meta ile karşılaştırarak webhook doğrulanır."
                                />

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 text-sm text-blue-800">
                                    <p className="font-bold mb-1">📋 Webhook Field'ları</p>
                                    <p className="mb-2">Meta'da şu field'lara abone olmanız gerekir:</p>
                                    <ul className="list-disc pl-5 space-y-0.5">
                                        <li><code className="bg-blue-100 px-1 rounded">messages</code> (zorunlu — gelen mesajlar)</li>
                                        <li><code className="bg-blue-100 px-1 rounded">message_status</code> (opsiyonel — teslim durumu)</li>
                                    </ul>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                                    <p className="font-bold mb-1">✅ Saklanan Bilgiler</p>
                                    <p className="font-mono text-xs">WABA ID: <strong>{createdIntegration.externalStoreId}</strong></p>
                                    <p className="font-mono text-xs">Phone ID: <strong>{createdIntegration.externalAccountId}</strong></p>
                                    <p className="font-mono text-xs">Access Token: <strong>{createdIntegration.hasToken ? '••••••••' : '(eksik)'}</strong></p>
                                </div>

                                <div className="flex justify-between mt-4">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                                    >
                                        ← Düzenle
                                    </button>
                                    <button
                                        onClick={() => setStep(5)}
                                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20"
                                    >
                                        Tamamla →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Sonuç */}
                        {step === 5 && createdIntegration && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Kurulum Tamamlandı</h2>
                                <div
                                    className="rounded-xl p-5 border"
                                    style={{
                                        backgroundColor: providerColors.bg,
                                        borderColor: providerColors.fg + '40',
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ color: providerColors.fg }}
                                        >
                                            check_circle
                                        </span>
                                        <p className="font-bold" style={{ color: providerColors.fg }}>
                                            WhatsApp botu aktif
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                        Müşterileriniz artık <strong>{createdIntegration.externalAccountId}</strong> ID'li
                                        WhatsApp numaranıza mesaj attığında bot otomatik yanıtlayacak ve
                                        siparişleri sisteme alacak.
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                                    <p className="font-bold mb-2">İlk Test İçin</p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                        <li>Test telefonundan WhatsApp numaranıza <em>"merhaba"</em> yazın</li>
                                        <li>Bot karşılama mesajı dönmeli</li>
                                        <li><em>"menü"</em> yazın → ürünleriniz listelenmeli</li>
                                        <li><em>"2 köfte"</em> gibi sipariş yazıp → <em>"evet"</em> ile onaylayın</li>
                                        <li>Sipariş paneline yeni siparişin düştüğünü kontrol edin</li>
                                    </ol>
                                </div>

                                <div className="flex justify-between mt-4">
                                    <button
                                        onClick={() => navigate('/finance/marketplaces')}
                                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                                    >
                                        Pazaryerleri Listesine Dön
                                    </button>
                                    <button
                                        onClick={() => navigate(`/finance/marketplaces/${createdIntegration.id}`)}
                                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20"
                                    >
                                        Detay Sayfasına Git →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----- Form field component (TrendyolFoodSetup'tan mirror, helper text destekli) -----

interface FormFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    isSecret?: boolean;
    helper?: string;
}

function FormField({ label, placeholder, value, onChange, required, isSecret, helper }: FormFieldProps) {
    const [show, setShow] = useState(false);
    const inputType = isSecret && !show ? 'password' : 'text';
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-bold text-sm">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <div className="relative">
                <input
                    type={inputType}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]"
                />
                {isSecret && value && (
                    <button
                        type="button"
                        onClick={() => setShow(!show)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {show ? 'visibility_off' : 'visibility'}
                        </span>
                    </button>
                )}
            </div>
            {helper && <p className="text-xs text-gray-500">{helper}</p>}
        </div>
    );
}

// ----- Copy-to-clipboard field -----

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
