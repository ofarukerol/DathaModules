import { create } from 'zustand';
import { checkNoteService, CheckNote } from '../services/checkNoteService';

interface CheckNoteStore {
    notes: CheckNote[];
    isLoading: boolean;

    fetchNotes: () => Promise<void>;
    addNote: (data: Omit<CheckNote, 'id' | 'created_at'>) => Promise<void>;
    updateNote: (id: string, data: Partial<Omit<CheckNote, 'id' | 'created_at'>>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
}

export const useCheckNoteStore = create<CheckNoteStore>((set, get) => ({
    notes: [],
    isLoading: false,

    fetchNotes: async () => {
        set({ isLoading: true });
        try {
            const data = await checkNoteService.getAll();
            set({ notes: data, isLoading: false });
        } catch (err) {
            console.error('fetchNotes error:', err);
            set({ isLoading: false });
        }
    },

    addNote: async (data) => {
        const id = crypto.randomUUID();
        const newNote: CheckNote = {
            ...data,
            id,
            created_at: new Date().toISOString(),
        };

        set((state) => ({ notes: [...state.notes, newNote] }));

        try {
            await checkNoteService.create({ ...data, id });
        } catch (err) {
            console.error('addNote error:', err);
            set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
        }
    },

    updateNote: async (id, data) => {
        const prev = get().notes;
        set((state) => ({
            notes: state.notes.map((n) => n.id === id ? { ...n, ...data } : n),
        }));

        try {
            await checkNoteService.update(id, data);
        } catch (err) {
            console.error('updateNote error:', err);
            set({ notes: prev });
        }
    },

    deleteNote: async (id) => {
        const prev = get().notes;
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));

        try {
            await checkNoteService.delete(id);
        } catch (err) {
            console.error('deleteNote error:', err);
            set({ notes: prev });
        }
    },
}));
