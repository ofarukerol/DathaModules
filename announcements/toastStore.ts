import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number; // ms, default 3000
}

interface ToastState {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    addToast: (type, message, duration = 3000) => {
        const id = `toast-${Date.now()}-${++counter}`;
        set((state) => ({
            toasts: [...state.toasts, { id, type, message, duration }],
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, duration);
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}));

// Helper shortcuts for convenience
export const toast = {
    success: (message: string, duration?: number) =>
        useToastStore.getState().addToast('success', message, duration),
    error: (message: string, duration?: number) =>
        useToastStore.getState().addToast('error', message, duration),
    info: (message: string, duration?: number) =>
        useToastStore.getState().addToast('info', message, duration),
    warning: (message: string, duration?: number) =>
        useToastStore.getState().addToast('warning', message, duration),
};
