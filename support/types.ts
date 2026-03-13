/* ─── Support Ticket Types ─── */
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportTicketCategory = 'TECHNICAL' | 'ACCOUNTING' | 'SALES' | 'SETUP' | 'REPORTING' | 'INTEGRATION' | 'GENERAL';

export interface SupportTicket {
    id: string;
    tenantId: string;
    userId: string;
    subject: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    status: SupportTicketStatus;
    assignedToId: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    messages?: SupportTicketMessage[];
    _count?: { messages: number };
    _localId?: string;
    _synced?: boolean;
}

export interface SupportTicketMessage {
    id: string;
    senderType: 'USER' | 'ADMIN';
    senderId: string;
    body: string;
    createdAt: string;
}

export interface SupportArticle {
    id: string;
    title: string;
    body: string;
    category: SupportTicketCategory;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

/* ─── Live Chat Types ─── */
export interface ChatMessage {
    id: string;
    senderType: 'USER' | 'ADMIN' | 'AI';
    senderId: string;
    body: string;
    confidence?: number | null;
    sourceChunks?: unknown;
    createdAt: string;
}

export interface AiAgentInfo {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar: string;
}

export interface ChatConversation {
    id: string;
    tenantId: string;
    userId: string;
    status: 'ACTIVE' | 'WAITING' | 'CLOSED';
    isAiHandled: boolean;
    aiAgentId: string | null;
    aiAgent: AiAgentInfo | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
    messages?: ChatMessage[];
    _count?: { messages: number };
}
