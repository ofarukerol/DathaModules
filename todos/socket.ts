import { io, Socket } from 'socket.io-client';
import { useTodoStore } from './store';
import { useReminderStore } from './reminderStore';
import { useCompanyStore } from '../finance/stores/useCompanyStore';

/**
 * Todo + Hatirlatma realtime socket — backend `/tasks` namespace (TaskGateway).
 * Paylasilan modul (DathaModules): DathaManager + DathaDesktop ayni kodu kullanir.
 * Token, _shared/api ile ayni kaynaktan (localStorage `datha_auth`) okunur → app-agnostic.
 * Gorev olaylarinda gorev listesini, hatirlatma olaylarinda hatirlatma listesini tazeler.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SOCKET_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

function getToken(): string | null {
    const stored = localStorage.getItem('datha_auth');
    if (!stored) return null;
    try {
        const parsed = JSON.parse(stored) as { state?: { accessToken?: string } };
        return parsed.state?.accessToken ?? null;
    } catch {
        return null;
    }
}

export function connectTodoSocket(): void {
    const token = getToken();
    if (!token) return;
    disconnectTodoSocket();

    socket = io(`${SOCKET_ROOT}/tasks`, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
    });

    const refetch = () => {
        void useTodoStore.getState().fetchTodos();
    };
    socket.on('todo:created', refetch);
    socket.on('todo:updated', refetch);
    socket.on('todo:deleted', refetch);
    socket.on('todo:assigned', refetch);

    const refetchReminders = () => {
        void useReminderStore.getState().fetchReminders();
    };
    socket.on('reminder:new', refetchReminders);
    socket.on('reminder:dismissed', refetchReminders);

    // Finans degisikligi (cari/fatura/...) — diger cihazda yapilan degisikligi tazele
    socket.on('finance:changed', () => {
        void useCompanyStore.getState().fetchCompanies();
    });
}

export function disconnectTodoSocket(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}
