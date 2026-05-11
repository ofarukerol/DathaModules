// TrendyolFoodDetail — Entegrasyon detay sayfası
// @see DAT-236 Phase 1 (genel bakış + manuel test + sil)
// Phase 2'de "Canlı Siparişler" sekmesi, Phase 4'te "Ürün Eşleştirme" eklenecek

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GradientHeader from '../../../components/GradientHeader';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import { PROVIDER_LABELS, PROVIDER_COLORS, INTEGRATION_STATUS_LABELS } from '../../../shared/src';
import type { IntegrationDto, TestConnectionResult } from '../services/integrationsApi';

export default function TrendyolFoodDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { integrations, fetchIntegrations, testConnection, deleteIntegration, updateIntegration } =
        useIntegrationStore();

    const [integration, setIntegration] = useState<IntegrationDto | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

    useEffect(() => {
        if (!integrations.length) fetchIntegrations();
    }, [fetchIntegrations, integrations.length]);

    useEffect(() => {
        const found = integrations.find((i) => i.id === id);
        setIntegration(found ?? null);
    }, [integrations, id]);

    if (!integration) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-500">Entegrasyon yükleniyor veya bulunamadı...</p>
            </div>
        );
    }

    const colors = PROVIDER_COLORS[integration.provider];

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testConnection(integration.id);
            setTestResult(result);
        } finally {
            setTesting(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            'Bu entegrasyonu silmek istediğine emin misin? Bağlantı kesilir, sipariş çekme durur.',
        );
        if (!confirmed) return;
        await deleteIntegration(integration.id);
        navigate('/finance/marketplaces');
    };

    const toggleFeature = async (feature: 'fetchOrders' | 'pushStatus' | 'syncStock' | 'syncPrice') => {
        const current = integration.features ?? {};
        await updateIntegration(integration.id, {
            features: { ...current, [feature]: !current[feature] },
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="storefront"
                    title={PROVIDER_LABELS[integration.provider]}
                    subtitle={`Durum: ${INTEGRATION_STATUS_LABELS[integration.status]}`}
                >
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="h-8 px-3.5 rounded-lg text-sm font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/25 disabled:opacity-50"
                    >
                        {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
                    </button>
                    <button
                        onClick={handleDelete}
                        className="h-8 px-3.5 rounded-lg text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500"
                    >
                        Sil
                    </button>
                </GradientHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto flex flex-col gap-4">
                        {/* Genel bilgiler kartı */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black"
                                    style={{ backgroundColor: colors.bg, color: colors.fg }}
                                >
                                    {colors.logo}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">
                                        {PROVIDER_LABELS[integration.provider]}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Satıcı ID: {integration.externalAccountId || '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <Info label="API Key" value={integration.apiKeyMasked} mono />
                                <Info label="API Secret" value={integration.apiSecretMasked} mono />
                                <Info label="Polling aralığı" value={`${integration.pollIntervalSec} saniye`} />
                                <Info
                                    label="Son sync"
                                    value={
                                        integration.lastSyncAt
                                            ? new Date(integration.lastSyncAt).toLocaleString('tr-TR')
                                            : 'Henüz yok'
                                    }
                                />
                                <Info label="Ardışık hata" value={`${integration.consecutiveErrors}`} />
                                <Info
                                    label="Oluşturulma"
                                    value={new Date(integration.createdAt).toLocaleDateString('tr-TR')}
                                />
                            </div>

                            {integration.lastErrorMessage && (
                                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3">
                                    <p className="text-xs font-bold text-red-700 mb-1">Son hata:</p>
                                    <p className="text-xs text-red-600">{integration.lastErrorMessage}</p>
                                </div>
                            )}

                            {testResult && (
                                <div
                                    className={`mt-4 rounded-xl p-3 ${
                                        testResult.success
                                            ? 'bg-emerald-50 border border-emerald-200'
                                            : 'bg-red-50 border border-red-200'
                                    }`}
                                >
                                    <p className={`text-xs font-bold ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {testResult.success
                                            ? `Test başarılı (${testResult.latencyMs} ms)`
                                            : `Test başarısız — ${testResult.error}`}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Özellikler */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-base font-bold text-gray-800 mb-4">Özellikler</h3>
                            <div className="flex flex-col gap-3">
                                <FeatureToggle
                                    label="Sipariş çek"
                                    description="Trendyol'dan yeni siparişleri otomatik al"
                                    enabled={integration.features?.fetchOrders ?? false}
                                    onToggle={() => toggleFeature('fetchOrders')}
                                />
                                <FeatureToggle
                                    label="Status push"
                                    description="Sipariş durumu değişince Trendyol'a bildir (Phase 3)"
                                    enabled={integration.features?.pushStatus ?? false}
                                    onToggle={() => toggleFeature('pushStatus')}
                                    disabled
                                />
                                <FeatureToggle
                                    label="Stok sync"
                                    description="Stok azaldıkça Trendyol'a yansıt (Phase 4)"
                                    enabled={integration.features?.syncStock ?? false}
                                    onToggle={() => toggleFeature('syncStock')}
                                    disabled
                                />
                                <FeatureToggle
                                    label="Fiyat sync"
                                    description="Trendyol fiyat alanı değişince otomatik push (Phase 4)"
                                    enabled={integration.features?.syncPrice ?? false}
                                    onToggle={() => toggleFeature('syncPrice')}
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Phase 2 placeholder */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-60">
                            <h3 className="text-base font-bold text-gray-800 mb-2">Canlı Siparişler</h3>
                            <p className="text-sm text-gray-500">
                                Phase 2'de bu sekme Trendyol'dan çekilen son siparişleri ve push durumlarını gösterecek.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----- Subcomponents -----

interface InfoProps {
    label: string;
    value: string;
    mono?: boolean;
}

function Info({ label, value, mono }: InfoProps) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
}

interface FeatureToggleProps {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

function FeatureToggle({ label, description, enabled, onToggle, disabled }: FeatureToggleProps) {
    return (
        <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button
                onClick={disabled ? undefined : onToggle}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-[#663259]' : 'bg-gray-200'
                } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}
