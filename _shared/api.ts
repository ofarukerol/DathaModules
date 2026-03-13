import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || '';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else if (token) resolve(token);
    });
    failedQueue = [];
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (TENANT_ID) {
        config.headers['x-tenant-id'] = TENANT_ID;
    }
    const stored = localStorage.getItem('datha_auth');
    if (stored) {
        try {
            const { state } = JSON.parse(stored);
            if (state?.accessToken) {
                config.headers.Authorization = `Bearer ${state.accessToken}`;
            }
        } catch { /* ignore parse errors */ }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            const storedAuth = localStorage.getItem('datha_auth');
            let hasToken = false;
            try {
                hasToken = !!(storedAuth && JSON.parse(storedAuth).state?.accessToken);
            } catch { /* ignore */ }
            if (!hasToken) return Promise.reject(error);

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const stored = localStorage.getItem('datha_auth');
                if (!stored) throw new Error('No auth data');
                const { state } = JSON.parse(stored);
                if (!state?.refreshToken) throw new Error('No refresh token');

                const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
                if (TENANT_ID) refreshHeaders['x-tenant-id'] = TENANT_ID;

                const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: state.refreshToken,
                }, { headers: refreshHeaders });

                const parsed = JSON.parse(stored);
                parsed.state.accessToken = data.accessToken;
                parsed.state.refreshToken = data.refreshToken;
                localStorage.setItem('datha_auth', JSON.stringify(parsed));

                processQueue(null, data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                try {
                    const parsed = JSON.parse(localStorage.getItem('datha_auth') || '{}');
                    if (parsed.state) {
                        parsed.state.accessToken = null;
                        parsed.state.refreshToken = null;
                        localStorage.setItem('datha_auth', JSON.stringify(parsed));
                    }
                } catch { /* ignore */ }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export const isOnline = (): boolean => navigator.onLine;

export default api;
