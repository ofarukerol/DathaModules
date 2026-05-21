import { getReadyDb, isTauri } from './db';
import { Todo, Tag, TodoComment } from './types';
import { api } from '../_shared/api';

// ─── Backend <-> UI eslestirme ───
type ApiStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type ApiPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
type UiStatus = 'todo' | 'in_progress' | 'done';
type UiPriority = 'low' | 'normal' | 'high' | 'urgent';

interface ApiTodo {
    id: string;
    title: string;
    description: string | null;
    status: ApiStatus;
    priority: ApiPriority;
    dueDate: string | null;
    createdBy: string | null;
    createdAt: string;
    assignees: { id: string; name: string | null }[];
}

const STATUS_TO_API: Record<UiStatus, ApiStatus> = {
    todo: 'TODO',
    in_progress: 'IN_PROGRESS',
    done: 'DONE',
};
const STATUS_FROM_API: Record<ApiStatus, UiStatus> = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
};
const PRIORITY_TO_API: Record<UiPriority, ApiPriority> = {
    low: 'LOW',
    normal: 'NORMAL',
    high: 'HIGH',
    urgent: 'URGENT',
};
const PRIORITY_FROM_API: Record<ApiPriority, UiPriority> = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
};

function mapFromApi(t: ApiTodo): Todo {
    return {
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        assignees: t.assignees ?? [],
        due_date: t.dueDate ?? undefined,
        priority: PRIORITY_FROM_API[t.priority] ?? 'normal',
        status: STATUS_FROM_API[t.status] ?? 'todo',
        created_at: t.createdAt,
        createdBy: t.createdBy ?? null,
    };
}

// ─── localStorage helpers (etiket/yorum — backend'de henuz endpoint yok) ───

const LS_TAGS_KEY = 'datha_tags';
const LS_COMMENTS_KEY = 'datha_todo_comments';
const LS_TODO_TAGS_KEY = 'datha_todo_tags';

function lsGet<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function lsSet(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ─── Service ───

export const todoService = {
    // ===== Gorevler (backend kaynak) =====

    async getTodos(): Promise<Todo[]> {
        const { data } = await api.get<{ success: boolean; data: ApiTodo[] }>('/todos');
        return (data.data ?? []).map(mapFromApi);
    },

    /** Gorev olustur + (coklu) ata. Backend'in olusturdugu kaydi dondurur. */
    async addTodo(todo: Omit<Todo, 'id' | 'created_at'>): Promise<Todo> {
        const { data } = await api.post<{ success: boolean; data: ApiTodo }>('/todos', {
            title: todo.title,
            description: todo.description || undefined,
            priority: PRIORITY_TO_API[todo.priority ?? 'normal'],
            status: STATUS_TO_API[todo.status ?? 'todo'],
            dueDate: todo.due_date || undefined,
            assigneeIds: (todo.assignees ?? []).map((a) => a.id),
        });
        return mapFromApi(data.data);
    },

    async updateTodoStatus(id: string, status: UiStatus): Promise<void> {
        await api.patch(`/todos/${id}/status`, { status: STATUS_TO_API[status] });
    },

    async updateTodo(todo: Todo): Promise<Todo> {
        const { data } = await api.patch<{ success: boolean; data: ApiTodo }>(`/todos/${todo.id}`, {
            title: todo.title,
            description: todo.description || undefined,
            priority: PRIORITY_TO_API[todo.priority ?? 'normal'],
            status: STATUS_TO_API[todo.status ?? 'todo'],
            dueDate: todo.due_date ?? null,
            assigneeIds: (todo.assignees ?? []).map((a) => a.id),
        });
        return mapFromApi(data.data);
    },

    async deleteTodo(id: string): Promise<void> {
        await api.delete(`/todos/${id}`);
    },

    // ===== Yorumlar (yerel — localStorage / Tauri SQLite) =====

    async getComments(todoId: string): Promise<TodoComment[]> {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return [];
            try {
                return await db.select<TodoComment[]>(
                    'SELECT * FROM todo_comments WHERE todo_id = $1 ORDER BY created_at ASC',
                    [todoId],
                );
            } catch (error) {
                console.error('Failed to fetch comments:', error);
                return [];
            }
        }
        const all = lsGet<TodoComment[]>(LS_COMMENTS_KEY, []);
        return all.filter((c) => c.todo_id === todoId);
    },

    async addComment(comment: TodoComment) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute(
                    'INSERT INTO todo_comments (id, todo_id, author, content, created_at) VALUES ($1, $2, $3, $4, $5)',
                    [comment.id, comment.todo_id, comment.author, comment.content, new Date().toISOString()],
                );
            } catch (error) {
                console.error('Failed to add comment:', error);
                throw error;
            }
            return;
        }
        const all = lsGet<TodoComment[]>(LS_COMMENTS_KEY, []);
        all.push({ ...comment, created_at: new Date().toISOString() });
        lsSet(LS_COMMENTS_KEY, all);
    },

    async deleteComment(id: string) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('DELETE FROM todo_comments WHERE id = $1', [id]);
            } catch (error) {
                console.error('Failed to delete comment:', error);
                throw error;
            }
            return;
        }
        const all = lsGet<TodoComment[]>(LS_COMMENTS_KEY, []);
        lsSet(LS_COMMENTS_KEY, all.filter((c) => c.id !== id));
    },

    // ===== Etiketler (yerel) =====

    async getTags(): Promise<Tag[]> {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return [];
            try {
                return await db.select<Tag[]>('SELECT * FROM tags ORDER BY name ASC');
            } catch (error) {
                console.error('Failed to fetch tags:', error);
                return [];
            }
        }
        return lsGet<Tag[]>(LS_TAGS_KEY, []);
    },

    async addTag(tag: Tag) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)', [
                    tag.id,
                    tag.name,
                    tag.color,
                ]);
            } catch (error) {
                console.error('Failed to add tag:', error);
                throw error;
            }
            return;
        }
        const tags = lsGet<Tag[]>(LS_TAGS_KEY, []);
        tags.push(tag);
        lsSet(LS_TAGS_KEY, tags);
    },

    async updateTag(tag: Tag) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('UPDATE tags SET name = $1, color = $2 WHERE id = $3', [
                    tag.name,
                    tag.color,
                    tag.id,
                ]);
            } catch (error) {
                console.error('Failed to update tag:', error);
                throw error;
            }
            return;
        }
        const tags = lsGet<Tag[]>(LS_TAGS_KEY, []);
        const idx = tags.findIndex((t) => t.id === tag.id);
        if (idx >= 0) {
            tags[idx] = tag;
            lsSet(LS_TAGS_KEY, tags);
        }
    },

    async deleteTag(id: string) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('DELETE FROM tags WHERE id = $1', [id]);
            } catch (error) {
                console.error('Failed to delete tag:', error);
                throw error;
            }
            return;
        }
        const tags = lsGet<Tag[]>(LS_TAGS_KEY, []);
        lsSet(LS_TAGS_KEY, tags.filter((t) => t.id !== id));
    },

    async getTagsForTodo(todoId: string): Promise<Tag[]> {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return [];
            try {
                return await db.select<Tag[]>(
                    'SELECT t.* FROM tags t INNER JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = $1',
                    [todoId],
                );
            } catch (error) {
                console.error('Failed to fetch tags for todo:', error);
                return [];
            }
        }
        const todoTags = lsGet<{ todo_id: string; tag_id: string }[]>(LS_TODO_TAGS_KEY, []);
        const tagIds = todoTags.filter((tt) => tt.todo_id === todoId).map((tt) => tt.tag_id);
        const allTags = lsGet<Tag[]>(LS_TAGS_KEY, []);
        return allTags.filter((t) => tagIds.includes(t.id));
    },

    async setTagsForTodo(todoId: string, tagIds: string[]) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('DELETE FROM todo_tags WHERE todo_id = $1', [todoId]);
                for (const tagId of tagIds) {
                    await db.execute('INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)', [
                        todoId,
                        tagId,
                    ]);
                }
            } catch (error) {
                console.error('Failed to set tags for todo:', error);
                throw error;
            }
            return;
        }
        const todoTags = lsGet<{ todo_id: string; tag_id: string }[]>(LS_TODO_TAGS_KEY, []);
        const filtered = todoTags.filter((tt) => tt.todo_id !== todoId);
        for (const tagId of tagIds) {
            filtered.push({ todo_id: todoId, tag_id: tagId });
        }
        lsSet(LS_TODO_TAGS_KEY, filtered);
    },
};
