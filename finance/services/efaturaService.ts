import { api } from '../../../services/api';
import { getDb } from '../../../services/db';
import { CreateEFaturaDTO, EDocumentStatus, EFaturaResponse } from '../../../shared/src';

/**
 * BirFatura E-Belge service (DAT-213)
 * Backend ile konusur — gercek BirFatura iletisimini backend yapar.
 * Offline'da local queue'ya yazar, sonra syncService gonderir.
 */

const API_BASE = '/v2/integrations/birfatura';

export interface PendingEFaturaQueueRow {
    id: string;
    tenantId: string | null;
    invoiceLocalId: string;
    orderId: string | null;
    payloadJson: string;
    status: 'LOCAL_QUEUED' | 'SENT' | 'ACK' | 'FAILED';
    lastError: string | null;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
}

export const efaturaService = {
    // ---------------- Online — backend cagrilari ----------------

    async submit(dto: CreateEFaturaDTO): Promise<EFaturaResponse> {
        const res = await api.post(`${API_BASE}/documents`, dto);
        return res.data?.data ?? res.data;
    },

    async list(params?: { status?: EDocumentStatus[]; dateFrom?: string; dateTo?: string; limit?: number; offset?: number; }): Promise<{ items: EFaturaResponse[]; total: number }> {
        const res = await api.get(`${API_BASE}/documents`, { params });
        return { items: res.data?.data ?? [], total: res.data?.meta?.total ?? 0 };
    },

    async getById(id: string): Promise<EFaturaResponse> {
        const res = await api.get(`${API_BASE}/documents/${id}`);
        return res.data?.data ?? res.data;
    },

    async retry(id: string): Promise<{ id: string; status: EDocumentStatus }> {
        const res = await api.post(`${API_BASE}/documents/${id}/retry`);
        return res.data?.data ?? res.data;
    },

    async getPdfUrl(id: string): Promise<string> {
        // Backend redirects 302 to S3 — axios maxRedirects=0 olmali, ama biz redirect URL'i body'de degil response.request'te buluruz
        // Pratik: backend'i degistirip JSON dondurmesi yerine, biz direkt link'i alalim
        // Su an: GET /documents/:id'den pdfUrl'i okuyalim
        const doc = await this.getById(id);
        if (!doc.pdfUrl) throw new Error('PDF henuz hazir degil');
        return doc.pdfUrl;
    },

    async ping(): Promise<{ ok: boolean; credits?: unknown; error?: string }> {
        const res = await api.post(`${API_BASE}/diagnostics/ping`);
        return res.data?.data ?? res.data;
    },

    async getSettings() {
        const res = await api.get(`${API_BASE}/settings`);
        return res.data?.data ?? res.data;
    },

    async updateSettings(body: Record<string, unknown>) {
        const res = await api.patch(`${API_BASE}/settings`, body);
        return res.data?.data ?? res.data;
    },

    // ---------------- Offline — local queue ----------------

    async enqueueLocally(dto: CreateEFaturaDTO): Promise<string> {
        const db = await getDb();
        if (!db) throw new Error('DB henuz hazir degil');
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
            `INSERT INTO pending_efatura_queue (id, tenant_id, invoice_local_id, order_id, payload_json, status, retry_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'LOCAL_QUEUED', 0, $6, $6)`,
            [id, dto.tenantId, dto.invoiceLocalId, dto.orderId ?? null, JSON.stringify(dto), now],
        );

        // sync_queue'ya da event ekle — backend'e gönderim icin
        await db.execute(
            `INSERT INTO sync_queue (id, tenant_id, event_type, payload, status, retry_count, created_at, updated_at)
             VALUES ($1, $2, 'EFATURA_CREATE', $3, 'PENDING', 0, $4, $4)`,
            [crypto.randomUUID(), dto.tenantId, JSON.stringify(dto), now],
        );
        return id;
    },

    async listLocalQueue(): Promise<PendingEFaturaQueueRow[]> {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select<Array<{
            id: string; tenant_id: string | null; invoice_local_id: string; order_id: string | null;
            payload_json: string; status: PendingEFaturaQueueRow['status'];
            last_error: string | null; retry_count: number; created_at: string; updated_at: string;
        }>>(
            `SELECT id, tenant_id, invoice_local_id, order_id, payload_json, status, last_error, retry_count, created_at, updated_at
             FROM pending_efatura_queue ORDER BY created_at DESC LIMIT 200`,
        );
        return rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            invoiceLocalId: r.invoice_local_id,
            orderId: r.order_id,
            payloadJson: r.payload_json,
            status: r.status,
            lastError: r.last_error,
            retryCount: r.retry_count,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    },

    async markLocalSent(id: string): Promise<void> {
        const db = await getDb();
        if (!db) return;
        await db.execute(
            `UPDATE pending_efatura_queue SET status = 'SENT', updated_at = $1 WHERE id = $2`,
            [new Date().toISOString(), id],
        );
    },

    async markLocalFailed(id: string, error: string): Promise<void> {
        const db = await getDb();
        if (!db) return;
        await db.execute(
            `UPDATE pending_efatura_queue
             SET status = 'FAILED', last_error = $1, retry_count = retry_count + 1, updated_at = $2
             WHERE id = $3`,
            [error.slice(0, 500), new Date().toISOString(), id],
        );
    },
};
