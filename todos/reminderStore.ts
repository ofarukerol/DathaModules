import { create } from 'zustand';
import { reminderService } from './reminderService';
import { Reminder, CreateReminderPayload } from './reminderTypes';
import { toast } from './toastStore';

// Toast hatalari store islemlerini bozmasin
const safeToast = {
    success: (msg: string) => { try { toast.success(msg); } catch { /* ignore */ } },
    error: (msg: string) => { try { toast.error(msg); } catch { /* ignore */ } },
};

interface ReminderState {
    reminders: Reminder[];
    isLoading: boolean;
    fetchReminders: () => Promise<void>;
    sendReminder: (payload: CreateReminderPayload) => Promise<void>;
    dismissReminder: (id: string) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
    reminders: [],
    isLoading: false,

    fetchReminders: async () => {
        set({ isLoading: true });
        try {
            const data = await reminderService.getMine();
            set({ reminders: data, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    sendReminder: async (payload) => {
        try {
            await reminderService.create(payload);
            safeToast.success('Hatırlatma gönderildi');
            await get().fetchReminders();
        } catch {
            safeToast.error('Hatırlatma gönderilemedi');
        }
    },

    dismissReminder: async (id) => {
        const old = get().reminders;
        // Optimistic: dokun-kapat
        set({ reminders: old.filter((r) => r.id !== id) });
        try {
            await reminderService.dismiss(id);
        } catch {
            set({ reminders: old });
            safeToast.error('Hatırlatma kapatılamadı');
        }
    },

    deleteReminder: async (id) => {
        const old = get().reminders;
        set({ reminders: old.filter((r) => r.id !== id) });
        try {
            await reminderService.remove(id);
        } catch {
            set({ reminders: old });
            safeToast.error('Hatırlatma silinemedi');
        }
    },
}));
