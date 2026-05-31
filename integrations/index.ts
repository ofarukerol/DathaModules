// Integrations Module — DAT-236
// Barrel export for all integration pages, stores, services

// ─── Pages ───
export { default as IntegrationsList } from './pages/IntegrationsList';
export { default as TrendyolFoodSetup } from './pages/TrendyolFoodSetup';
export { default as TrendyolFoodDetail } from './pages/TrendyolFoodDetail';
export { default as WhatsAppSetup } from './pages/WhatsAppSetup';
export { default as WhatsAppDetail } from './pages/WhatsAppDetail';
export { default as MarketplaceSalesReport } from './pages/MarketplaceSalesReport';

// ─── Stores ───
export { useIntegrationStore } from './stores/useIntegrationStore';

// ─── Services ───
export { integrationsApi } from './services/integrationsApi';
export type {
    IntegrationDto,
    CreateIntegrationPayload,
    UpdateIntegrationPayload,
    TestConnectionResult,
} from './services/integrationsApi';
