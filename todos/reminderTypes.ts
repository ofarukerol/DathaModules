// Hatirlatma (Reminder) tipleri — backend ReminderView ile birebir (camelCase, mapping yok).
// Gorevlerden bagimsiz, bilgilendirme/uyari niteliginde "dokun-kapat" hatirlatmalari.

export type ReminderSeverity = 'INFO' | 'WARNING';

export interface ReminderRecipient {
    id: string; // userId
    name: string | null;
}

export interface Reminder {
    id: string;
    title: string;
    severity: ReminderSeverity;
    createdBy: string | null;
    createdByName: string | null;
    createdAt: string; // ISO 8601
    dismissed: boolean;
    recipients: ReminderRecipient[];
}

export interface CreateReminderPayload {
    title: string;
    severity?: ReminderSeverity; // default INFO
    recipientIds?: string[]; // bos ise kendine
}
