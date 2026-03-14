import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AddressPrefsState {
    ulke: string;
    il: string;
    ilce: string;
    mahalle: string;
    ilceHistory: string[];
    mahalleHistory: Record<string, string[]>;
    setUlke: (ulke: string) => void;
    setIl: (il: string) => void;
    setIlce: (ilce: string) => void;
    setMahalle: (ilce: string, mahalle: string) => void;
    addIlce: (ilce: string) => void;
    addMahalle: (ilce: string, mahalle: string) => void;
    setAllDefaults: (vals: { ulke: string; il: string; ilce: string; mahalle: string }) => void;
}

const addToHistory = (history: string[], item: string, maxLength = 15): string[] => {
    if (!item.trim()) return history;
    const filtered = history.filter(h => h !== item);
    return [item, ...filtered].slice(0, maxLength);
};

export const useAddressPrefsStore = create<AddressPrefsState>()(
    persist(
        (set) => ({
            ulke: 'Türkiye',
            il: 'İstanbul',
            ilce: '',
            mahalle: '',
            ilceHistory: [],
            mahalleHistory: {},

            setUlke: (ulke) => set({ ulke }),
            setIl: (il) => set({ il }),
            setIlce: (ilce) =>
                set((state) => ({
                    ilce,
                    ilceHistory: addToHistory(state.ilceHistory, ilce),
                })),
            setMahalle: (ilce, mahalle) =>
                set((state) => ({
                    mahalle,
                    mahalleHistory: {
                        ...state.mahalleHistory,
                        [ilce]: addToHistory(state.mahalleHistory[ilce] || [], mahalle),
                    },
                })),
            addIlce: (ilce) =>
                set((state) => ({
                    ilceHistory: addToHistory(state.ilceHistory, ilce),
                })),
            addMahalle: (ilce, mahalle) =>
                set((state) => ({
                    mahalleHistory: {
                        ...state.mahalleHistory,
                        [ilce]: addToHistory(state.mahalleHistory[ilce] || [], mahalle),
                    },
                })),
            setAllDefaults: ({ ulke, il, ilce, mahalle }) =>
                set((state) => ({
                    ulke: ulke || state.ulke,
                    il: il || state.il,
                    ilce: ilce || state.ilce,
                    mahalle: mahalle || state.mahalle,
                    ilceHistory: ilce ? addToHistory(state.ilceHistory, ilce) : state.ilceHistory,
                    mahalleHistory: ilce && mahalle
                        ? { ...state.mahalleHistory, [ilce]: addToHistory(state.mahalleHistory[ilce] || [], mahalle) }
                        : state.mahalleHistory,
                })),
        }),
        {
            name: 'address-prefs-storage',
            version: 2,
            migrate: (persisted: unknown, version: number) => {
                if (version < 2) {
                    return {
                        ...(persisted as Record<string, unknown>),
                        ilce: '',
                        mahalle: '',
                    };
                }
                return persisted as AddressPrefsState;
            },
        }
    )
);
