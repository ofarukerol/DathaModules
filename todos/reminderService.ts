import { api } from '../_shared/api';
import { Reminder, CreateReminderPayload } from './reminderTypes';

// Hatirlatmalar dogrudan REST + socket (offline kuyruk YOK — anlik/online bildirim niteligi).
interface ApiResp<T> {
    success: boolean;
    data: T;
}

export const reminderService = {
    /** Bana gelen kapatilmamis hatirlatmalar */
    async getMine(): Promise<Reminder[]> {
        const { data } = await api.get<ApiResp<Reminder[]>>('/reminders/my');
        return data.data ?? [];
    },

    /** Hatirlatma olustur (kendine veya secilen kisilere) */
    async create(payload: CreateReminderPayload): Promise<Reminder> {
        const { data } = await api.post<ApiResp<Reminder>>('/reminders', payload);
        return data.data;
    },

    /** Aliciya ozel kapat (dokun-kapat) */
    async dismiss(id: string): Promise<void> {
        await api.post(`/reminders/${id}/dismiss`, {});
    },

    /** Soft delete — sadece gonderen */
    async remove(id: string): Promise<void> {
        await api.delete(`/reminders/${id}`);
    },
};
