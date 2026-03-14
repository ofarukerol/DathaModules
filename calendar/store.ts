// Calendar modülü için sadeleştirilmiş favorites store implementasyonu.
// Orijinal useFavoritesStore, i18n bağımlılığı içerdiğinden buraya
// Calendar'ın ihtiyaç duyduğu asgari implementasyon inline yazıldı.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent } from './types';

export interface FavoritePage {
    path: string;
    label: string;
    icon: string;
}

// Calendar sayfasının statik page info'su
export const CALENDAR_PAGE_INFO = {
    label: 'Takvim',
    icon: 'calendar_month',
};

interface FavoritesStore {
    favorites: FavoritePage[];
    toggleFavorite: (page: FavoritePage) => void;
    isFavorite: (path: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favorites: [],

            toggleFavorite: (page) => set((state) => {
                const exists = state.favorites.some((f) => f.path === page.path);
                if (exists) {
                    return { favorites: state.favorites.filter((f) => f.path !== page.path) };
                }
                return { favorites: [...state.favorites, page] };
            }),

            isFavorite: (path) => get().favorites.some((f) => f.path === path),
        }),
        { name: 'calendar-favorites-store' }
    )
);

interface CalendarStore {
    events: CalendarEvent[];
    addEvent: (event: CalendarEvent) => void;
    removeEvent: (id: string) => void;
    updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
}

export const useCalendarStore = create<CalendarStore>()(
    persist(
        (set) => ({
            events: [],

            addEvent: (event) => set((state) => ({
                events: [...state.events, event],
            })),

            removeEvent: (id) => set((state) => ({
                events: state.events.filter((e) => e.id !== id),
            })),

            updateEvent: (id, updates) => set((state) => ({
                events: state.events.map((e) => e.id === id ? { ...e, ...updates } : e),
            })),
        }),
        { name: 'calendar-events-store' }
    )
);
