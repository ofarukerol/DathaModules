/**
 * Shared helper utilities for DathaModules.
 * These functions are used by multiple modules and must work in both
 * DathaDesktop (Tauri) and DathaManager (web) environments.
 */

export function generateId(): string {
    return crypto.randomUUID();
}

export function nowISO(): string {
    return new Date().toISOString();
}

export function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

export function formatCurrency(amount: number, currency: string = 'TRY'): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(isoDate: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatDateLong(isoDate: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text.toString()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
        .replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
        .toLowerCase();
}
