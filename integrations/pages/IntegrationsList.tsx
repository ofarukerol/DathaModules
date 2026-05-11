// IntegrationsList — Pazaryerleri sayfası (gerçek API'den)
// @see DAT-236 Phase 1
// Eski mock: src/modules/finance/pages/Marketplaces.tsx (UI referansı)

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GradientHeader from '../../../components/GradientHeader';
import { useIntegrationStore } from '../stores/useIntegrationStore';
import {
    IntegrationProvider,
    IntegrationStatus,
    PROVIDER_LABELS,
    PROVIDER_DESCRIPTIONS,
    PROVIDER_COLORS,
    INTEGRATION_STATUS_LABELS,
} from '../../../shared/src';
import type { IntegrationDto } from '../services/integrationsApi';

interface ProviderRow {
    provider: IntegrationProvider;
    integration: IntegrationDto | null; // null → henüz bağlanmamış
}

const STATUS_STYLE: Record<IntegrationStatus, { fg: string; bg: string; dot: string }> = {
    CONNECTED: { fg: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    PENDING: { fg: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    DISCONNECTED: { fg: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' },
    ERROR: { fg: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
    DISABLED: { fg: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' },
};

const SETUP_ROUTE_BY_PROVIDER: Record<IntegrationProvider, string> = {
    TRENDYOL_FOOD: '/finance/marketplaces/new?provider=TRENDYOL_FOOD',
    YEMEKSEPETI: '/finance/marketplaces/new?provider=YEMEKSEPETI',
    GETIR_FOOD: '/finance/marketplaces/new?provider=GETIR_FOOD',
    MIGROS_YEMEK: '/finance/marketplaces/new?provider=MIGROS_YEMEK',
};

export default function IntegrationsList() {
    const navigate = useNavigate();
    const { integrations, loading, error, fetchIntegrations } = useIntegrationStore();

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const rows = useMemo<ProviderRow[]>(() => {
        return (Object.values(IntegrationProvider) as IntegrationProvider[]).map((provider) => ({
            provider,
            integration: integrations.find((i) => i.provider === provider) ?? null,
        }));
    }, [integrations]);

    const connectedCount = rows.filter((r) => r.integration?.status === 'CONNECTED').length;
    const pendingCount = rows.filter(
        (r) => r.integration?.status === 'PENDING' || r.integration?.status === 'ERROR',
    ).length;

    const handleCardClick = (row: ProviderRow) => {
        if (row.integration) {
            navigate(`/finance/marketplaces/${row.integration.id}`);
        } else {
            navigate(SETUP_ROUTE_BY_PROVIDER[row.provider]);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="storefront"
                    title="Pazaryerleri"
                    subtitle={loading ? 'Yükleniyor...' : `${connectedCount} bağlı platform`}
                >
                    <button
                        onClick={() => navigate('/finance/marketplaces/new?provider=TRENDYOL_FOOD')}
                        className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: '#663259' }}
                    >
                        <span className="material-symbols-outlined text-[17px]">add</span>
                        Yeni Entegrasyon
                    </button>
                </GradientHeader>

                {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-7xl mx-auto flex flex-col gap-6">
                        {/* Özet */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            <SummaryCard
                                icon="check_circle"
                                label="Bağlı Platform"
                                value={`${connectedCount} / ${rows.length}`}
                                color="emerald"
                            />
                            <SummaryCard
                                icon="hourglass_top"
                                label="Beklemede / Hata"
                                value={`${pendingCount}`}
                                color="amber"
                            />
                            <SummaryCard
                                icon="link_off"
                                label="Bağlı Değil"
                                value={`${rows.length - connectedCount - pendingCount}`}
                                color="gray"
                            />
                            <SummaryCard
                                icon="settings"
                                label="Toplam Platform"
                                value={`${rows.length}`}
                                color="purple"
                            />
                        </div>

                        {/* Kart grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {rows.map((row) => {
                                const colors = PROVIDER_COLORS[row.provider];
                                const status = row.integration?.status ?? IntegrationStatus.DISCONNECTED;
                                const style = STATUS_STYLE[status];
                                return (
                                    <div
                                        key={row.provider}
                                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <div className="p-5 pb-4">
                                            <div className="flex items-start justify-between mb-4">
                                                <div
                                                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shadow-sm"
                                                    style={{ backgroundColor: colors.bg, color: colors.fg }}
                                                >
                                                    {colors.logo}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-gray-800">
                                                    {PROVIDER_LABELS[row.provider]}
                                                </h3>
                                                <div
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.fg}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                    {INTEGRATION_STATUS_LABELS[status]}
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                                {PROVIDER_DESCRIPTIONS[row.provider]}
                                            </p>

                                            {row.integration?.lastErrorMessage && (
                                                <p className="text-xs text-red-600 mt-2 line-clamp-2">
                                                    Hata: {row.integration.lastErrorMessage}
                                                </p>
                                            )}
                                        </div>

                                        <div className="p-4 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handleCardClick(row)}
                                                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                                    row.integration
                                                        ? 'bg-[#663259] text-white hover:shadow-lg hover:shadow-[#663259]/20'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {row.integration ? 'settings' : 'link'}
                                                </span>
                                                {row.integration ? 'İşlemleri Yönet' : 'Entegrasyonu Başlat'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----- Small subcomponent -----

interface SummaryCardProps {
    icon: string;
    label: string;
    value: string;
    color: 'emerald' | 'amber' | 'gray' | 'purple';
}

const COLOR_MAP = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', value: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-700' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-500', value: 'text-gray-700' },
    purple: { bg: 'bg-[#663259]/10', text: 'text-[#663259]', value: 'text-[#663259]' },
};

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
    const c = COLOR_MAP[color];
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined ${c.text} text-[22px]`}>{icon}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.value}`}>{value}</p>
        </div>
    );
}
