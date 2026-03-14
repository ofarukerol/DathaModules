/**
 * Minimal DB helper for DathaModules.
 * Table migrations are handled by the host app (DathaDesktop → initDb).
 * This module only opens an existing database connection.
 * In DathaManager (web), isTauri() returns false → null → services use API/localStorage fallback.
 */

export const isTauri = (): boolean => !!(window as any).__TAURI_INTERNALS__;

let dbInstance: import('@tauri-apps/plugin-sql').default | null = null;

export const getReadyDb = async (): Promise<import('@tauri-apps/plugin-sql').default | null> => {
    if (!isTauri()) return null;
    if (dbInstance) return dbInstance;
    try {
        const Database = (await import('@tauri-apps/plugin-sql')).default;
        dbInstance = await Database.load('sqlite:datha.db');
        return dbInstance;
    } catch {
        return null;
    }
};

// Alias for backward compatibility — finance module services use getDb
export const getDb = getReadyDb;
