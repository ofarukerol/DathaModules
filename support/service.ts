import { io, Socket } from 'socket.io-client';
import { api, isOnline } from '../_shared/api';
import { getReadyDb } from '../_shared/db';
import type {
    SupportTicket,
    SupportTicketMessage,
    SupportArticle,
    SupportTicketStatus,
    SupportTicketPriority,
    SupportTicketCategory,
    ChatMessage,
    ChatConversation,
} from './types';

// Re-export so consumers can import from here if needed
export type {
    SupportTicket,
    SupportTicketMessage,
    SupportArticle,
    SupportTicketStatus,
    SupportTicketPriority,
    SupportTicketCategory,
    ChatMessage,
    ChatConversation,
};

interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: { page: number; limit: number; total: number };
}

/* ─── Helpers ─── */
function getUserId(): string {
    try {
        const stored = localStorage.getItem('datha_auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed?.state?.user?.id || 'unknown';
        }
    } catch { /* ignore */ }
    return 'unknown';
}

function mapRowToTicket(row: any): SupportTicket {
    return {
        id: row.server_id || row.id,
        tenantId: '',
        userId: row.user_id || '',
        subject: row.subject,
        category: (row.category || 'GENERAL') as SupportTicketCategory,
        priority: (row.priority || 'MEDIUM') as SupportTicketPriority,
        status: (row.status || 'OPEN') as SupportTicketStatus,
        assignedToId: null,
        resolvedAt: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _localId: row.id,
        _synced: row.synced === 1,
    };
}

function mapRowToMessage(row: any): SupportTicketMessage {
    return {
        id: row.server_id || row.id,
        senderType: (row.sender_type || 'USER') as 'USER' | 'ADMIN',
        senderId: row.sender_id || '',
        body: row.body,
        createdAt: row.created_at,
    };
}

/* ─── Support Ticket Service (Local-First) ─── */
export const supportTicketService = {
    /**
     * Ticket oluştur: önce SQLite'a kaydet (her zaman başarılı),
     * sonra online ise backend'e push dene.
     */
    async create(dto: {
        subject: string;
        body: string;
        category?: SupportTicketCategory;
        priority?: SupportTicketPriority;
    }): Promise<SupportTicket> {
        const db = await getReadyDb();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const userId = getUserId();
        const category = dto.category || 'GENERAL';
        const priority = dto.priority || 'MEDIUM';

        // 1. Local SQLite'a kaydet (her zaman çalışır)
        if (db) {
            await db.execute(
                `INSERT INTO support_tickets (id, subject, body, category, priority, status, user_id, synced, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
                [id, dto.subject, dto.body, category, priority, 'OPEN', userId, now, now]
            );

            // İlk mesajı da kaydet
            await db.execute(
                `INSERT INTO support_ticket_messages (id, ticket_id, sender_type, sender_id, body, synced, created_at)
                 VALUES ($1, $2, 'USER', $3, $4, 0, $5)`,
                [crypto.randomUUID(), id, userId, dto.body, now]
            );
        }

        let synced = false;

        // 2. Online ise backend'e push dene
        if (isOnline()) {
            try {
                const { data } = await api.post<ApiResponse<SupportTicket>>(
                    '/support-tickets',
                    dto,
                );
                const serverTicket = data.data;

                if (db && serverTicket?.id) {
                    await db.execute(
                        'UPDATE support_tickets SET server_id = $1, synced = 1 WHERE id = $2',
                        [serverTicket.id, id]
                    );
                    synced = true;
                }
            } catch (err: any) {
                // Backend başarısız — sync_queue'ya ekle
                console.error('[SupportService] Backend ticket push failed:', err?.response?.status, err?.response?.data || err?.message);
                if (db) {
                    await db.execute(
                        `INSERT INTO sync_queue (id, event_type, payload_json, status, retry_count, created_at)
                         VALUES ($1, $2, $3, 'PENDING', 0, $4)`,
                        [
                            crypto.randomUUID(),
                            'SUPPORT_TICKET_CREATED',
                            JSON.stringify({ localId: id, subject: dto.subject, body: dto.body, category, priority }),
                            now
                        ]
                    );
                }
            }
        } else {
            // Offline — sync_queue'ya ekle
            if (db) {
                await db.execute(
                    `INSERT INTO sync_queue (id, event_type, payload_json, status, retry_count, created_at)
                     VALUES ($1, $2, $3, 'PENDING', 0, $4)`,
                    [
                        crypto.randomUUID(),
                        'SUPPORT_TICKET_CREATED',
                        JSON.stringify({ localId: id, subject: dto.subject, body: dto.body, category, priority }),
                        now
                    ]
                );
            }
        }

        return {
            id,
            tenantId: '',
            userId,
            subject: dto.subject,
            category: category as SupportTicketCategory,
            priority: priority as SupportTicketPriority,
            status: 'OPEN',
            assignedToId: null,
            resolvedAt: null,
            createdAt: now,
            updatedAt: now,
            _localId: id,
            _synced: synced,
        };
    },

    /**
     * Ticket listesi: local SQLite'dan oku + online ise backend ile merge et.
     */
    async getMyTickets(page = 1, limit = 50): Promise<{ data: SupportTicket[]; total: number }> {
        const db = await getReadyDb();
        let localTickets: SupportTicket[] = [];

        // 1. Local'den oku (her zaman çalışır)
        if (db) {
            const rows = await db.select<any[]>(
                `SELECT id, server_id, subject, body, category, priority, status, user_id, synced, created_at, updated_at
                 FROM support_tickets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                [limit, (page - 1) * limit]
            );
            localTickets = rows.map(mapRowToTicket);
        }

        // 2. Online ise backend'den çek ve local'i güncelle
        if (isOnline()) {
            try {
                const { data } = await api.get<ApiResponse<any>>(
                    '/support-tickets',
                    { params: { page, limit } },
                );
                const payload = data.data;
                const remoteTickets: SupportTicket[] = Array.isArray(payload)
                    ? payload
                    : (payload?.data ?? []);

                if (db && remoteTickets.length > 0) {
                    for (const rt of remoteTickets) {
                        const localMatch = await db.select<any[]>(
                            'SELECT id FROM support_tickets WHERE server_id = $1',
                            [rt.id]
                        );
                        if (localMatch.length > 0) {
                            // Local ticket'ı güncelle (status değişmiş olabilir)
                            await db.execute(
                                'UPDATE support_tickets SET status = $1, updated_at = $2 WHERE server_id = $3',
                                [rt.status, rt.updatedAt, rt.id]
                            );
                        } else {
                            // Backend'den gelen yeni ticket (admin tarafından oluşturulmuş olabilir)
                            await db.execute(
                                `INSERT OR IGNORE INTO support_tickets (id, server_id, subject, body, category, priority, status, user_id, synced, created_at, updated_at)
                                 VALUES ($1, $2, $3, '', $4, $5, $6, $7, 1, $8, $9)`,
                                [crypto.randomUUID(), rt.id, rt.subject, rt.category, rt.priority, rt.status, rt.userId, rt.createdAt, rt.updatedAt]
                            );
                        }
                    }

                    // Merge sonrası tekrar oku
                    const merged = await db.select<any[]>(
                        `SELECT id, server_id, subject, body, category, priority, status, user_id, synced, created_at, updated_at
                         FROM support_tickets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                        [limit, (page - 1) * limit]
                    );
                    localTickets = merged.map(mapRowToTicket);
                }
            } catch (err: any) {
                // Backend erişilemez — local veri ile devam et
                console.warn('[SupportService] Backend ticket fetch failed:', err?.response?.status, err?.response?.data || err?.message);
            }
        }

        return { data: localTickets, total: localTickets.length };
    },

    /**
     * Tek ticket detayı + mesajları
     */
    async getOne(id: string): Promise<SupportTicket> {
        const db = await getReadyDb();
        let ticket: SupportTicket | null = null;

        // Local'den oku
        if (db) {
            const rows = await db.select<any[]>(
                `SELECT id, server_id, subject, body, category, priority, status, user_id, synced, created_at, updated_at
                 FROM support_tickets WHERE (id = $1 OR server_id = $1) AND deleted_at IS NULL`,
                [id]
            );
            if (rows.length > 0) {
                ticket = mapRowToTicket(rows[0]);
                const msgs = await db.select<any[]>(
                    `SELECT id, ticket_id, server_id, sender_type, sender_id, body, synced, created_at
                     FROM support_ticket_messages WHERE ticket_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
                    [rows[0].id]
                );
                ticket.messages = msgs.map(mapRowToMessage);
            }
        }

        // Online ise server'dan mesajları güncelle
        if (isOnline() && ticket?._synced) {
            if (db && ticket._localId) {
                const serverIdRow = await db.select<any[]>(
                    'SELECT server_id FROM support_tickets WHERE id = $1',
                    [ticket._localId]
                );
                if (serverIdRow[0]?.server_id) {
                    try {
                        const { data } = await api.get<ApiResponse<SupportTicket>>(
                            `/support-tickets/${serverIdRow[0].server_id}`,
                        );
                        const remote = data.data;
                        if (remote?.messages) {
                            // Admin mesajlarını local'e kaydet
                            for (const msg of remote.messages) {
                                if (msg.senderType === 'ADMIN') {
                                    await db.execute(
                                        `INSERT OR IGNORE INTO support_ticket_messages (id, ticket_id, server_id, sender_type, sender_id, body, synced, created_at)
                                         VALUES ($1, $2, $3, $4, $5, $6, 1, $7)`,
                                        [crypto.randomUUID(), ticket._localId, msg.id, msg.senderType, msg.senderId, msg.body, msg.createdAt]
                                    );
                                }
                            }
                            // Mesajları yeniden oku
                            const updatedMsgs = await db.select<any[]>(
                                `SELECT id, ticket_id, server_id, sender_type, sender_id, body, synced, created_at
                                 FROM support_ticket_messages WHERE ticket_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
                                [ticket._localId]
                            );
                            ticket.messages = updatedMsgs.map(mapRowToMessage);
                        }
                        // Status güncelle
                        if (remote?.status) {
                            ticket.status = remote.status;
                            await db.execute(
                                'UPDATE support_tickets SET status = $1 WHERE id = $2',
                                [remote.status, ticket._localId]
                            );
                        }
                    } catch { /* backend erişilemez */ }
                }
            }
        }

        if (!ticket) throw new Error('Ticket not found');
        return ticket;
    },

    /**
     * Mesaj gönder: local kaydet, online ise push dene
     */
    async addMessage(ticketId: string, body: string): Promise<SupportTicketMessage> {
        const db = await getReadyDb();
        const msgId = crypto.randomUUID();
        const now = new Date().toISOString();
        const userId = getUserId();

        // Local ticket ID'yi bul
        let localTicketId = ticketId;
        let serverId: string | null = null;
        if (db) {
            const rows = await db.select<any[]>(
                'SELECT id, server_id FROM support_tickets WHERE id = $1 OR server_id = $1',
                [ticketId]
            );
            if (rows.length > 0) {
                localTicketId = rows[0].id;
                serverId = rows[0].server_id;
            }
        }

        // 1. Local'e kaydet
        if (db) {
            await db.execute(
                `INSERT INTO support_ticket_messages (id, ticket_id, sender_type, sender_id, body, synced, created_at)
                 VALUES ($1, $2, 'USER', $3, $4, 0, $5)`,
                [msgId, localTicketId, userId, body, now]
            );
        }

        // 2. Online + synced ise backend'e push dene
        if (isOnline() && serverId) {
            try {
                const { data } = await api.post<ApiResponse<SupportTicketMessage>>(
                    `/support-tickets/${serverId}/message`,
                    { body },
                );
                if (db && data.data?.id) {
                    await db.execute(
                        'UPDATE support_ticket_messages SET server_id = $1, synced = 1 WHERE id = $2',
                        [data.data.id, msgId]
                    );
                }
            } catch {
                // sync_queue'ya ekle
                if (db) {
                    await db.execute(
                        `INSERT INTO sync_queue (id, event_type, payload_json, status, retry_count, created_at)
                         VALUES ($1, $2, $3, 'PENDING', 0, $4)`,
                        [
                            crypto.randomUUID(),
                            'SUPPORT_TICKET_MESSAGE',
                            JSON.stringify({ ticketLocalId: localTicketId, messageLocalId: msgId, body }),
                            now
                        ]
                    );
                }
            }
        } else if (db) {
            // Offline veya ticket henüz sync olmamış
            await db.execute(
                `INSERT INTO sync_queue (id, event_type, payload_json, status, retry_count, created_at)
                 VALUES ($1, $2, $3, 'PENDING', 0, $4)`,
                [
                    crypto.randomUUID(),
                    'SUPPORT_TICKET_MESSAGE',
                    JSON.stringify({ ticketLocalId: localTicketId, messageLocalId: msgId, body }),
                    now
                ]
            );
        }

        return { id: msgId, senderType: 'USER', senderId: userId, body, createdAt: now };
    },
};

/* ─── Support Article Service (Public) ─── */
export const supportArticleService = {
    async getAll(category?: SupportTicketCategory): Promise<SupportArticle[]> {
        if (!isOnline()) return [];
        const params: Record<string, string> = {};
        if (category) params.category = category;
        const { data } = await api.get<ApiResponse<any>>(
            '/support-articles',
            { params },
        );
        const payload = data.data;
        return Array.isArray(payload) ? payload : (payload?.data ?? []);
    },

    async getOne(id: string): Promise<SupportArticle> {
        const { data } = await api.get<ApiResponse<SupportArticle>>(
            `/support-articles/${id}`,
        );
        return data.data;
    },
};

/* ────────────────────────────────────────────────────────────────
   LIVE CHAT SERVICE
   ──────────────────────────────────────────────────────────────── */

/* ─── Socket.IO Backend URL (doğrudan bağlantı için) ─── */
function getDirectBackendUrl(): string {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) return backendUrl;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    if (apiUrl.startsWith('http')) {
        return apiUrl.replace(/\/api\/?$/, '');
    }

    return 'http://localhost:3000';
}

/* ─── Auth Token Helper ─── */
function getAccessToken(): string | null {
    try {
        const stored = localStorage.getItem('datha_auth');
        if (!stored) return null;
        const { state } = JSON.parse(stored);
        return state?.accessToken || null;
    } catch {
        return null;
    }
}

/* ─── Socket.IO Client ─── */
let socket: Socket | null = null;

export const liveChatSocket = {
    connect(): Socket {
        if (socket?.connected) return socket;

        const token = getAccessToken();
        if (!token) {
            console.warn('[LiveChat] Token bulunamadı, socket bağlantısı yapılamıyor');
            throw new Error('No auth token');
        }

        const backendUrl = getDirectBackendUrl();
        socket = io(`${backendUrl}/live-chat`, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
            // bağlantı başarılı
        });

        socket.on('disconnect', () => {
            // bağlantı kesildi
        });

        socket.on('connect_error', (error) => {
            console.warn('[LiveChat] Bağlantı hatası:', error.message);
        });

        return socket;
    },

    disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    getSocket(): Socket | null {
        return socket;
    },

    isConnected(): boolean {
        return socket?.connected ?? false;
    },

    joinConversation(conversationId: string) {
        socket?.emit('join:conversation', { conversationId });
    },

    leaveConversation(conversationId: string) {
        socket?.emit('leave:conversation', { conversationId });
    },

    emitTyping(conversationId: string) {
        socket?.emit('typing', { conversationId });
    },

    onNewMessage(callback: (data: { conversationId: string; message: ChatMessage }) => void) {
        socket?.on('message:new', callback);
        return () => { socket?.off('message:new', callback); };
    },

    onTyping(callback: (data: { userId: string; senderType: string }) => void) {
        socket?.on('typing', callback);
        return () => { socket?.off('typing', callback); };
    },

    onConversationUpdated(callback: (data: { conversationId: string; status?: string }) => void) {
        socket?.on('conversation:updated', callback);
        return () => { socket?.off('conversation:updated', callback); };
    },

    onAiTyping(callback: (data: { conversationId: string; agentName: string }) => void) {
        socket?.on('ai:typing', callback);
        return () => { socket?.off('ai:typing', callback); };
    },

    onAiHandoff(callback: (data: { conversationId: string; isAiHandled: boolean; assignedToId?: string }) => void) {
        socket?.on('ai:handoff', callback);
        return () => { socket?.off('ai:handoff', callback); };
    },

    onTicketCreated(callback: (data: { conversationId: string; ticketId: string }) => void) {
        socket?.on('ticket:created', callback);
        return () => { socket?.off('ticket:created', callback); };
    },
};

/* ─── REST API ─── */
export const liveChatApi = {
    /**
     * Yeni konuşma başlat veya mevcut aktif olanı döndür
     */
    async startConversation(): Promise<ChatConversation> {
        const { data: res } = await api.post('/live-chat/conversations');
        return res?.data || res;
    },

    /**
     * Aktif konuşmayı getir
     */
    async getActiveConversation(): Promise<ChatConversation | null> {
        const { data: res } = await api.get('/live-chat/conversations/active');
        return res?.data || null;
    },

    /**
     * Mesaj gönder
     */
    async sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
        const { data: res } = await api.post(`/live-chat/conversations/${conversationId}/message`, { body });
        return res?.data || res;
    },

    /**
     * Mesaj geçmişi
     */
    async getMessages(conversationId: string): Promise<{ data: ChatMessage[]; total: number }> {
        const { data: res } = await api.get(`/live-chat/conversations/${conversationId}/messages`);
        return {
            data: Array.isArray(res?.data) ? res.data : [],
            total: res?.total || 0,
        };
    },

    /**
     * Kullanıcının tüm konuşma geçmişi
     */
    async getMyConversations(): Promise<ChatConversation[]> {
        const { data: res } = await api.get('/live-chat/conversations/my');
        return Array.isArray(res?.data) ? res.data : [];
    },

    /**
     * Sıra bilgisi — kaç kişi önde, tahmini bekleme süresi
     */
    async getQueueInfo(conversationId: string): Promise<{ position: number; estimatedWaitMinutes: number; hasAdminResponse: boolean }> {
        const { data: res } = await api.get(`/live-chat/conversations/${conversationId}/queue`);
        return res?.data || { position: 0, estimatedWaitMinutes: 0, hasAdminResponse: true };
    },

    /**
     * Konuşmayı kapat + opsiyonel puanlama ve not
     */
    async closeConversation(conversationId: string, feedback?: { rating?: number; note?: string }): Promise<void> {
        await api.patch(`/live-chat/conversations/${conversationId}/close`, feedback || {});
    },
};
