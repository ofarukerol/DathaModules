import { create } from 'zustand';
import {
    supportTicketService,
    supportArticleService,
    liveChatApi,
    liveChatSocket,
} from './service';
import type {
    SupportTicket,
    SupportArticle,
    SupportTicketCategory,
    SupportTicketPriority,
    ChatConversation,
    ChatMessage,
} from './types';

/* ────────────────────────────────────────────────────────────────
   SUPPORT STORE
   ──────────────────────────────────────────────────────────────── */

interface SupportState {
    tickets: SupportTicket[];
    articles: SupportArticle[];
    selectedTicket: SupportTicket | null;
    isLoading: boolean;
    isArticlesLoading: boolean;
    isDetailLoading: boolean;

    fetchTickets: () => Promise<void>;
    fetchArticles: (category?: SupportTicketCategory) => Promise<void>;
    loadTicketDetail: (id: string) => Promise<void>;
    createTicket: (dto: {
        subject: string;
        body: string;
        category?: SupportTicketCategory;
        priority?: SupportTicketPriority;
    }) => Promise<SupportTicket>;
    sendMessage: (ticketId: string, body: string) => Promise<void>;
    clearSelectedTicket: () => void;
}

export const useSupportStore = create<SupportState>((set, get) => ({
    tickets: [],
    articles: [],
    selectedTicket: null,
    isLoading: false,
    isArticlesLoading: false,
    isDetailLoading: false,

    fetchTickets: async () => {
        set({ isLoading: true });
        try {
            const res = await supportTicketService.getMyTickets();
            set({ tickets: res.data });
        } catch {
            /* API offline */
        } finally {
            set({ isLoading: false });
        }
    },

    fetchArticles: async (category?: SupportTicketCategory) => {
        set({ isArticlesLoading: true });
        try {
            const articles = await supportArticleService.getAll(category);
            set({ articles });
        } catch {
            /* API offline */
        } finally {
            set({ isArticlesLoading: false });
        }
    },

    loadTicketDetail: async (id: string) => {
        set({ isDetailLoading: true });
        try {
            const ticket = await supportTicketService.getOne(id);
            set({ selectedTicket: ticket });
        } catch {
            /* handle error */
        } finally {
            set({ isDetailLoading: false });
        }
    },

    createTicket: async (dto) => {
        const ticket = await supportTicketService.create(dto);
        await get().fetchTickets();
        return ticket;
    },

    sendMessage: async (ticketId: string, body: string) => {
        await supportTicketService.addMessage(ticketId, body);
        try {
            await get().loadTicketDetail(ticketId);
        } catch {
            /* ticket detayı yüklenemezse listeyi yenile */
            await get().fetchTickets();
        }
    },

    clearSelectedTicket: () => set({ selectedTicket: null }),
}));

/* ────────────────────────────────────────────────────────────────
   LIVE CHAT STORE
   ──────────────────────────────────────────────────────────────── */

type ChatPhase = 'idle' | 'connecting' | 'active';

interface LiveChatState {
  chatPhase: ChatPhase;
  chatConversation: ChatConversation | null;
  chatMessages: ChatMessage[];
  queuePosition: number;
  estimatedWait: number;
  queueEnteredAt: number | null; // sıraya girme zamanı (ms) — remount'ta kaybolmaması için store'da
}

interface LiveChatActions {
  setChatPhase: (phase: ChatPhase) => void;
  setChatConversation: (conv: ChatConversation | null) => void;
  setChatMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  addMessage: (msg: ChatMessage) => void;
  setQueuePosition: (val: number) => void;
  setEstimatedWait: (val: number) => void;
  setQueueEnteredAt: (ts: number | null) => void;
  resetChat: () => void;
}

const INITIAL_STATE: LiveChatState = {
  chatPhase: 'idle',
  chatConversation: null,
  chatMessages: [],
  queuePosition: 0,
  estimatedWait: 0,
  queueEnteredAt: null,
};

export const useLiveChatStore = create<LiveChatState & LiveChatActions>()((set, get) => ({
  ...INITIAL_STATE,

  setChatPhase: (phase) => set({ chatPhase: phase }),
  setChatConversation: (conv) => set({ chatConversation: conv }),
  setChatMessages: (msgs) => {
    if (typeof msgs === 'function') {
      set({ chatMessages: msgs(get().chatMessages) });
    } else {
      set({ chatMessages: msgs });
    }
  },
  addMessage: (msg) => {
    const existing = get().chatMessages;
    if (existing.some((m) => m.id === msg.id)) return;
    set({ chatMessages: [...existing, msg] });
  },
  setQueuePosition: (val) => set({ queuePosition: val }),
  setEstimatedWait: (val) => set({ estimatedWait: val }),
  setQueueEnteredAt: (ts) => set({ queueEnteredAt: ts }),
  resetChat: () => set(INITIAL_STATE),
}));

// Re-export service helpers so consumers can import from store if needed
export { liveChatApi, liveChatSocket };
