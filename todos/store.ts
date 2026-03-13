import { create } from 'zustand';
import { todoService } from './service';
import { Todo } from './types';
import { toast } from './toastStore';

// Safe toast wrapper - never let toast errors break store operations
const safeToast = {
    success: (msg: string) => { try { toast.success(msg); } catch { /* ignore */ } },
    error: (msg: string) => { try { toast.error(msg); } catch { /* ignore */ } },
};

interface TodoState {
    todos: Todo[];
    isLoading: boolean;
    error: string | null;
    fetchTodos: () => Promise<void>;
    addTodo: (todo: Omit<Todo, 'id' | 'created_at'>) => Promise<string>;
    updateStatus: (id: string, status: 'todo' | 'in_progress' | 'done') => Promise<void>;
    updateTodo: (todo: Todo) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
    todos: [],
    isLoading: false,
    error: null,

    fetchTodos: async () => {
        set({ isLoading: true });
        try {
            const data: Todo[] = await todoService.getTodos();
            set({ todos: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    addTodo: async (todoData) => {
        const id = crypto.randomUUID();
        const newTodo: Todo = { ...todoData, id, created_at: new Date().toISOString() };
        // Optimistic update
        set((state) => ({ todos: [newTodo, ...state.todos] }));
        try {
            await todoService.addTodo(newTodo);
            safeToast.success('Görev eklendi');
        } catch (err: any) {
            set((state) => ({
                error: err.message,
                todos: state.todos.filter((t) => t.id !== id),
            }));
            safeToast.error('Görev eklenemedi');
        }
        return id;
    },

    updateStatus: async (id, status) => {
        const oldTodos = get().todos;
        const target = oldTodos.find((t) => t.id === id);
        if (!target) return;

        // Optimistic update
        set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? { ...t, status } : t)),
        }));

        try {
            await todoService.updateTodoStatus(id, status);
        } catch (err: any) {
            set({ error: err.message, todos: oldTodos });
            safeToast.error('Durum güncellenemedi');
        }
    },

    updateTodo: async (updatedTodo) => {
        const oldTodos = get().todos;
        // Optimistic
        set((state) => ({
            todos: state.todos.map((t) => (t.id === updatedTodo.id ? updatedTodo : t)),
        }));
        try {
            await todoService.updateTodo(updatedTodo);
            safeToast.success('Görev güncellendi');
        } catch (err: any) {
            set({ error: err.message, todos: oldTodos });
            safeToast.error('Görev güncellenemedi');
        }
    },

    deleteTodo: async (id) => {
        const oldTodos = get().todos;
        // Optimistic
        set((state) => ({
            todos: state.todos.filter((t) => t.id !== id),
        }));
        try {
            await todoService.deleteTodo(id);
            safeToast.success('Görev silindi');
        } catch (err: any) {
            set({ error: err.message, todos: oldTodos });
            safeToast.error('Görev silinemedi');
        }
    },
}));
