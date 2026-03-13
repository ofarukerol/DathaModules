// status: 'todo' | 'in_progress' | 'done'
// priority: 'low' | 'normal' | 'high' | 'urgent'
export interface Todo {
    id: string;
    title: string;
    description: string;
    assignee: string;
    due_date?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'done';
    created_at?: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface TodoComment {
    id: string;
    todo_id: string;
    author: string;
    content: string;
    created_at?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number; // ms, default 3000
}
