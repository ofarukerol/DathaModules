// TrendyolFoodDetail — Entegrasyon detay sayfası
// @see DAT-236 Phase 1 (genel) + Phase 4 (Ürün Eşleştirme)

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageToolbar from '@/components/PageToolbar';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import { IntegrationProvider, PROVIDER_LABELS, PROVIDER_COLORS, INTEGRATION_STATUS_LABELS } from '../../../shared/src';
import WhatsAppDetail from './WhatsAppDetail';
import {
    integrationsApi,
    type IntegrationDto,
    type TestConnectionResult,
    type ProductMapsResponse,
    type IntegrationProductMapDto,
    type UnmappedProductDto,
} from '../services/integrationsApi';
import { useToastStore } from '../../../stores/useToastStore';

type TabKey = 'overview' | 'products';

export default function TrendyolFoodDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { integrations, fetchIntegrations, testConnection, deleteIntegration, updateIntegration } =
        useIntegrationStore();

    const [integration, setIntegration] = useState<IntegrationDto | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

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

    // WhatsApp pazaryeri değil — kendi detay panelini kullan (Trendyol etiketleri uymaz)
    if (integration.provider === IntegrationProvider.WHATSAPP) {
        return <WhatsAppDetail />;
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
                <PageToolbar
                    icon="storefront"
                    title={PROVIDER_LABELS[integration.provider]}
                    stats={`Durum: ${INTEGRATION_STATUS_LABELS[integration.status]}`}
                    backPath="/finance/marketplaces"
                    actions={
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleTest}
                                disabled={testing}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/15 text-white rounded-xl text-sm font-semibold transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
                            >
                                {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-[#663259] rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-white/90 active:scale-95"
                            >
                                Sil
                            </button>
                        </div>
                    }
                />

                {/* Tab bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-2 py-1.5 inline-flex gap-1 shrink-0 w-fit">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                        Genel
                    </TabButton>
                    <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
                        Ürün Eşleştirme
                    </TabButton>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'overview' && (
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
                                        description="Sipariş durumu değişince Trendyol'a bildir"
                                        enabled={integration.features?.pushStatus ?? false}
                                        onToggle={() => toggleFeature('pushStatus')}
                                    />
                                    <FeatureToggle
                                        label="Stok sync"
                                        description="Stok azaldıkça Trendyol'a yansıt"
                                        enabled={integration.features?.syncStock ?? false}
                                        onToggle={() => toggleFeature('syncStock')}
                                    />
                                    <FeatureToggle
                                        label="Fiyat sync"
                                        description="Trendyol fiyat alanı değişince otomatik push"
                                        enabled={integration.features?.syncPrice ?? false}
                                        onToggle={() => toggleFeature('syncPrice')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && <ProductMappingPanel integrationId={integration.id} />}
                </div>
            </div>
        </div>
    );
}

// ---------------- Product Mapping Panel (Phase 4) ----------------

interface ProductMappingPanelProps {
    integrationId: string;
}

function ProductMappingPanel({ integrationId }: ProductMappingPanelProps) {
    const addToast = useToastStore((s) => s.addToast);
    const [data, setData] = useState<ProductMapsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoMapping, setAutoMapping] = useState(false);
    const [pushingAll, setPushingAll] = useState(false);
    const [search, setSearch] = useState('');
    const [mapInput, setMapInput] = useState<{ product: UnmappedProductDto; externalProductId: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await integrationsApi.listProductMaps(integrationId);
            setData(res);
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Eşleşmeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [integrationId, addToast]);

    useEffect(() => {
        load();
    }, [load]);

    const handleAutoMap = async () => {
        setAutoMapping(true);
        try {
            const res = await integrationsApi.autoMapProducts(integrationId);
            if (res.success) {
                addToast('success', `${res.created} ürün otomatik eşleştirildi (Trendyol'da ${res.totalTrendyol})`);
                await load();
            } else {
                addToast('error', `Otomatik eşleştirme başarısız: ${res.error}`);
            }
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Hata');
        } finally {
            setAutoMapping(false);
        }
    };

    const handlePushAll = async () => {
        setPushingAll(true);
        try {
            const res = await integrationsApi.pushAllPrices(integrationId);
            addToast('success', `${res.queued} ürün senkronizasyon kuyruğuna eklendi`);
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Hata');
        } finally {
            setPushingAll(false);
        }
    };

    const handleUnmap = async (internalProductId: string) => {
        const confirmed = window.confirm('Eşleşmeyi kaldırmak istediğine emin misin?');
        if (!confirmed) return;
        try {
            await integrationsApi.unmapProduct(integrationId, internalProductId);
            addToast('success', 'Eşleşme kaldırıldı');
            await load();
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Hata');
        }
    };

    const handleMapSubmit = async () => {
        if (!mapInput || !mapInput.externalProductId.trim()) return;
        try {
            await integrationsApi.mapProduct(
                integrationId,
                mapInput.product.id,
                mapInput.externalProductId.trim(),
            );
            addToast('success', `${mapInput.product.name} eşleştirildi — push kuyruğa alındı`);
            setMapInput(null);
            await load();
        } catch (err) {
            addToast('error', err instanceof Error ? err.message : 'Hata');
        }
    };

    const q = search.trim().toLocaleLowerCase('tr');
    const filteredMapped = data?.mapped.filter(
        (m) => !q || m.product?.name.toLocaleLowerCase('tr').includes(q) || m.externalProductId.toLocaleLowerCase('tr').includes(q),
    ) ?? [];
    const filteredUnmapped = data?.unmapped.filter(
        (p) => !q || p.name.toLocaleLowerCase('tr').includes(q),
    ) ?? [];

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
                <button
                    onClick={handleAutoMap}
                    disabled={autoMapping}
                    className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#663259] hover:bg-[#7a3d6b] disabled:opacity-50 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    {autoMapping ? 'Eşleştiriliyor...' : 'Otomatik Eşleştir'}
                </button>
                <button
                    onClick={handlePushAll}
                    disabled={pushingAll}
                    className="h-9 px-4 rounded-lg text-sm font-semibold text-[#663259] bg-purple-50 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    {pushingAll ? 'Kuyruğa alınıyor...' : 'Tümünü Senkronize Et'}
                </button>
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ürün veya barcode ara..."
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#663259]"
                    />
                </div>
            </div>

            {loading && <p className="text-sm text-gray-500 text-center py-8">Yükleniyor...</p>}

            {!loading && data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Mapped */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">
                                Eşleşmiş ({filteredMapped.length})
                            </h3>
                        </div>
                        {filteredMapped.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4">Henüz eşleşme yok.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {filteredMapped.map((m) => (
                                    <MappedRow key={m.id} map={m} onUnmap={() => handleUnmap(m.internalProductId)} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Unmapped */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800">
                                Eşleşmemiş ({filteredUnmapped.length})
                            </h3>
                        </div>
                        {filteredUnmapped.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4">Tüm aktif ürünler eşleşmiş.</p>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredUnmapped.map((p) => (
                                    <UnmappedRow
                                        key={p.id}
                                        product={p}
                                        onMap={() => setMapInput({ product: p, externalProductId: p.integrationCode ?? '' })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Map input modal */}
            {mapInput && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setMapInput(null)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-800">Ürünü Eşleştir</h3>
                            <p className="text-xs text-gray-500 mt-1">{mapInput.product.name}</p>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            <label className="text-xs font-bold text-gray-700">
                                Trendyol Barcode / Product ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={mapInput.externalProductId}
                                onChange={(e) => setMapInput({ ...mapInput, externalProductId: e.target.value })}
                                placeholder="TR-12345 veya barcode"
                                autoFocus
                                className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#663259]"
                            />
                            <p className="text-xs text-gray-400">
                                Bu değer Trendyol satıcı panelindeki ürünün barcode/productId alanından gelir.
                            </p>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setMapInput(null)}
                                className="flex-1 h-9 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleMapSubmit}
                                disabled={!mapInput.externalProductId.trim()}
                                className="flex-1 h-9 text-sm font-bold text-white bg-[#663259] rounded-lg hover:bg-[#7a3d6b] disabled:opacity-50"
                            >
                                Eşleştir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface MappedRowProps {
    map: IntegrationProductMapDto;
    onUnmap: () => void;
}

function MappedRow({ map, onUnmap }: MappedRowProps) {
    const statusColors: Record<string, string> = {
        SUCCESS: 'bg-emerald-100 text-emerald-700',
        FAILED: 'bg-red-100 text-red-700',
        PENDING: 'bg-amber-100 text-amber-700',
    };
    return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                    {map.product?.name ?? 'Bilinmeyen ürün'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    Barcode: <span className="font-mono">{map.externalProductId}</span>
                    {map.lastPushedPrice && (
                        <> · Son push: ₺{Number(map.lastPushedPrice).toFixed(2)}</>
                    )}
                </p>
                {map.lastError && (
                    <p className="text-xs text-red-600 mt-0.5 truncate" title={map.lastError}>
                        ⚠ {map.lastError}
                    </p>
                )}
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${statusColors[map.pushStatus]}`}>
                {map.pushStatus}
            </span>
            <button
                onClick={onUnmap}
                className="text-gray-400 hover:text-red-500"
                title="Eşleşmeyi kaldır"
            >
                <span className="material-symbols-outlined text-[20px]">link_off</span>
            </button>
        </div>
    );
}

interface UnmappedRowProps {
    product: UnmappedProductDto;
    onMap: () => void;
}

function UnmappedRow({ product, onMap }: UnmappedRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">
                    ₺{Number(product.price).toFixed(2)} · stok: {product.stockQty}
                    {product.integrationCode && (
                        <> · kod: <span className="font-mono">{product.integrationCode}</span></>
                    )}
                </p>
            </div>
            <button
                onClick={onMap}
                className="h-7 px-2.5 text-xs font-bold text-[#663259] bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
            >
                Eşleştir
            </button>
        </div>
    );
}

// ----- Common subcomponents -----

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`h-8 px-4 rounded-lg text-sm font-semibold transition-colors ${
                active ? 'bg-[#663259] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {children}
        </button>
    );
}

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
