import { io, Socket } from 'socket.io-client';
import { useTodoStore } from './store';

/**
 * Todo realtime socket — backend `/tasks` namespace, `tenant:{tenantId}` room (TaskGateway).
 * Paylasilan modul (DathaModules): DathaManager + DathaDesktop ayni kodu kullanir.
 * Token, _shared/api ile ayni kaynaktan (localStorage `datha_auth`) okunur → app-agnostic.
 * Her olayda (created/updated/deleted/assigned) listeyi tazeler.
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
}

export function disconnectTodoSocket(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}
