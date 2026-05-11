// TrendyolFoodSetup — Trendyol Yemek bağlantı wizard'ı (4 adım)
// @see DAT-236 Phase 1
//
// Akış:
//   Step 1: Bilgi  → Trendyol developer paneli linki, ne gerektiği açıklaması
//   Step 2: Form   → Satıcı ID, API Key, Secret, Token
//   Step 3: Test   → POST /integrations + POST /:id/test
//   Step 4: Özet   → CONNECTED/ERROR bildirimi + detay sayfasına yönlendir

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GradientHeader from '../../../components/GradientHeader';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import {
    IntegrationProvider,
    PROVIDER_LABELS,
    PROVIDER_COLORS,
} from '../../../shared/src';
import type { IntegrationDto, TestConnectionResult } from '../services/integrationsApi';

type Step = 1 | 2 | 3 | 4;

export default function TrendyolFoodSetup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const providerParam = (searchParams.get('provider') as IntegrationProvider) || IntegrationProvider.TRENDYOL_FOOD;
    const { createIntegration, testConnection } = useIntegrationStore();

    const [step, setStep] = useState<Step>(1);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [externalAccountId, setExternalAccountId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [token, setToken] = useState('');

    const [createdIntegration, setCreatedIntegration] = useState<IntegrationDto | null>(null);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

    const providerColors = PROVIDER_COLORS[providerParam];

    const isFormValid =
        externalAccountId.trim().length > 0 &&
        apiKey.trim().length > 0 &&
        apiSecret.trim().length > 0;

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setSubmitting(true);
        setFormError(null);
        try {
            const created = await createIntegration({
                provider: providerParam,
                externalAccountId: externalAccountId.trim(),
                apiKey: apiKey.trim(),
                apiSecret: apiSecret.trim(),
                token: token.trim() || undefined,
                features: { fetchOrders: true, pushStatus: false, syncStock: false, syncPrice: false },
            });
            setCreatedIntegration(created);
            setStep(3);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } }; message?: string };
            setFormError(apiError.response?.data?.message || apiError.message || 'Entegrasyon kaydedilemedi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTest = async () => {
        if (!createdIntegration) return;
        setSubmitting(true);
        try {
            const result = await testConnection(createdIntegration.id);
            setTestResult(result);
            setStep(4);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } }; message?: string };
            setTestResult({
                success: false,
                latencyMs: 0,
                error: apiError.response?.data?.message || apiError.message || 'Test başarısız',
            });
            setStep(4);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="link"
                    title={`${PROVIDER_LABELS[providerParam]} Entegrasyonu`}
                    subtitle={`Adım ${step} / 4`}
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
                                {[1, 2, 3, 4].map((s) => (
                                    <div
                                        key={s}
                                        className={`w-8 h-1.5 rounded-full ${
                                            s <= step ? 'bg-[#663259]' : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Step 1: Info */}
                        {step === 1 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Başlamadan önce</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Trendyol satıcı panelinizden API erişim bilgilerinizi alın. Bu işlem için
                                    Trendyol Developer Portal'a giriş yapmanız gerekir.
                                </p>
                                <a
                                    href="https://developers.trendyol.com/v2.0/docs/getting-started"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-[#F27A1A] font-semibold underline"
                                >
                                    Trendyol Developer Portal →
                                </a>
                                <p className="text-sm text-gray-600 mt-2">
                                    Aşağıdaki bilgileri elinizin altında bulundurun:
                                </p>
                                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                                    <li>Satıcı ID (Supplier ID)</li>
                                    <li>API Key</li>
                                    <li>API Secret</li>
                                    <li>(Opsiyonel) Hazır Basic Auth Token</li>
                                </ul>
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
                                <h2 className="text-xl font-bold text-gray-800">API Bilgileri</h2>
                                <FormField
                                    label="Satıcı ID"
                                    placeholder="örn: 6651369"
                                    value={externalAccountId}
                                    onChange={setExternalAccountId}
                                    required
                                />
                                <FormField
                                    label="API Key"
                                    placeholder="X8H2IXVvc0TXMFwN0ejq"
                                    value={apiKey}
                                    onChange={setApiKey}
                                    required
                                />
                                <FormField
                                    label="API Secret"
                                    placeholder="0Boi44McR7LVXLEFPJiV"
                                    value={apiSecret}
                                    onChange={setApiSecret}
                                    required
                                    isSecret
                                />
                                <FormField
                                    label="Token (opsiyonel)"
                                    placeholder="WDhIMklYVnZjMFRYTUZ3TjBlanE6..."
                                    value={token}
                                    onChange={setToken}
                                    isSecret
                                />

                                {formError && (
                                    <p className="text-sm text-red-600">{formError}</p>
                                )}

                                <div className="flex justify-between mt-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                                    >
                                        ← Geri
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!isFormValid || submitting}
                                        className="px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Test */}
                        {step === 3 && createdIntegration && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Bağlantıyı Test Et</h2>
                                <p className="text-sm text-gray-600">
                                    Bilgileriniz kaydedildi. Şimdi Trendyol API'sine gerçek bir test çağrısı atalım.
                                </p>
                                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                                    <p className="text-gray-500">Saklanan bilgiler:</p>
                                    <p className="font-mono mt-1">
                                        Satıcı ID: <span className="font-bold">{createdIntegration.externalAccountId}</span>
                                    </p>
                                    <p className="font-mono">
                                        API Key: <span className="font-bold">{createdIntegration.apiKeyMasked}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={handleTest}
                                    disabled={submitting}
                                    className="mt-4 px-5 py-3 rounded-xl bg-[#663259] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#663259]/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Test ediliyor...' : 'Test Et'}
                                </button>
                            </div>
                        )}

                        {/* Step 4: Sonuç */}
                        {step === 4 && testResult && createdIntegration && (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Sonuç</h2>
                                {testResult.success ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                                            <p className="font-bold text-emerald-700">Bağlantı başarılı</p>
                                        </div>
                                        <p className="text-sm text-emerald-700">
                                            Trendyol API'sine başarıyla bağlandık ({testResult.latencyMs} ms).
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-red-600">error</span>
                                            <p className="font-bold text-red-700">Bağlantı başarısız</p>
                                        </div>
                                        <p className="text-sm text-red-700">{testResult.error}</p>
                                        <p className="text-xs text-red-500 mt-2">
                                            Bilgilerinizi kontrol edip tekrar deneyin. Entegrasyon kayıtlı olarak duruyor —
                                            ayarlar sayfasından düzenleyebilirsiniz.
                                        </p>
                                    </div>
                                )}
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
                                        Entegrasyon Detayına Git →
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

// ----- Form field component -----

interface FormFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    isSecret?: boolean;
}

function FormField({ label, placeholder, value, onChange, required, isSecret }: FormFieldProps) {
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
        </div>
    );
}
