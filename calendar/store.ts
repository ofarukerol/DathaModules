// Calendar modülü için sadeleştirilmiş favorites store implementasyonu.
// Orijinal useFavoritesStore, i18n bağımlılığı içerdiğinden buraya
// Calendar'ın ihtiyaç duyduğu asgari implementasyon inline yazıldı.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
