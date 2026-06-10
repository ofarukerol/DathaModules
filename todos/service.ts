import axios from 'axios';
import { getReadyDb, isTauri } from './db';
import { Todo, Tag, TodoComment } from './types';
import { enqueueSync } from '../../utils/syncQueue';
import { api } from '../_shared/api';

/**
 * Online iken sunucudan donen GERCEK HTTP hatasi (4xx/5xx — response var) ile
 * ag/timeout hatasini (response yok) ayirt eder. HTTP hatasi offline mantigina
 * DUSULMEMELI: aksi halde sunucu reddi (orn. 403/404) sessizce yutulur, kullanici
 * islemin basarili oldugunu sanir ve refresh'te degisiklik geri doner.
 */
function isHttpResponseError(e: unknown): boolean {
    return axios.isAxiosError(e) && !!e.response;
}

// ─── Backend <-> UI eslestirme ───
type ApiStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type ApiPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

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

const STATUS_TO_API: Record<Todo['status'], ApiStatus> = { todo: 'TODO', in_progress: 'IN_PROGRESS', done: 'DONE' };
const STATUS_FROM_API: Record<ApiStatus, Todo['status']> = { TODO: 'todo', IN_PROGRESS: 'in_progress', DONE: 'done' };
const PRIORITY_TO_API: Record<NonNullable<Todo['priority']>, ApiPriority> = { low: 'LOW', normal: 'NORMAL', high: 'HIGH', urgent: 'URGENT' };
const PRIORITY_FROM_API: Record<ApiPriority, NonNullable<Todo['priority']>> = { LOW: 'low', NORMAL: 'normal', HIGH: 'high', URGENT: 'urgent' };

function mapFromApi(t: ApiTodo): Todo {
    const assignees = t.assignees ?? [];
    return {
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        assignee: assignees[0]?.name ?? '',
        assignees,
        createdBy: t.createdBy ?? null,
        due_date: t.dueDate ?? undefined,
        priority: PRIORITY_FROM_API[t.priority] ?? 'normal',
        status: STATUS_FROM_API[t.status] ?? 'todo',
        created_at: t.createdAt,
    };
}

// ─── localStorage cache + tag/yorum yerel deposu ───
const CACHE_KEY = 'datha_todos_cache';
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

function lsSet(key: string, value: any) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // sessiz
    }
}

const isOnline = (): boolean => (typeof navigator !== 'undefined' ? navigator.onLine : true);

// ─── Service: gorevler online-first + offline fallback + sync kuyruk ───

export const todoService = {
    /** Online: backend'den cek + cache'le. Offline: cache'i dondur. */
    async getTodos(): Promise<Todo[]> {
        if (isOnline()) {
            try {
                const { data } = await api.get<{ success: boolean; data: ApiTodo[] }>('/todos');
                const list = (data.data ?? []).map(mapFromApi);
                lsSet(CACHE_KEY, list);
                return list;
            } catch {
                // Gecici ag hatasi → cache'e dus
                return lsGet<Todo[]>(CACHE_KEY, []);
            }
        }
        return lsGet<Todo[]>(CACHE_KEY, []);
    },

    /** Online: POST /todos (assigneeIds dahil) + cache. Offline: local + kuyruk. */
    async addTodo(todo: Todo): Promise<Todo> {
        const assigneeIds = (todo.assignees ?? []).map((a) => a.id).filter(Boolean);
        if (isOnline()) {
            try {
                const { data } = await api.post<{ success: boolean; data: ApiTodo }>('/todos', {
                    title: todo.title,
                    description: todo.description || undefined,
                    priority: PRIORITY_TO_API[todo.priority ?? 'normal'],
                    status: STATUS_TO_API[todo.status ?? 'todo'],
                    dueDate: todo.due_date || undefined,
                    assigneeIds,
                    localId: todo.id || undefined,
                });
                const saved = mapFromApi(data.data);
                const cache = lsGet<Todo[]>(CACHE_KEY, []);
                lsSet(CACHE_KEY, [saved, ...cache.filter((t) => t.id !== saved.id && t.id !== todo.id)]);
                return saved;
            } catch (e) {
                if (isHttpResponseError(e)) throw e;
                // ag hatasi → offline mantik (kuyruga al)
            }
        }
        // Offline / online basarisiz
        const local: Todo = { ...todo, created_at: todo.created_at || new Date().toISOString() };
        const cache = lsGet<Todo[]>(CACHE_KEY, []);
        lsSet(CACHE_KEY, [local, ...cache.filter((t) => t.id !== local.id)]);

        // Tauri Desktop'ta yerel SQLite'a da yaz (cross-window/legacy uyumluluk)
        if (isTauri()) {
            const db = await getReadyDb();
            if (db) {
                try {
                    await db.execute(
                        'INSERT INTO todos (id, title, description, assignee, due_date, priority, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                        [local.id, local.title || '', local.description || '', local.assignee || '', local.due_date || null, local.priority || 'normal', local.status || 'todo', local.created_at],
                    );
                } catch { /* yoksay */ }
            }
        }

        await enqueueSync('TODO_CREATED', {
            localId: local.id,
            title: local.title,
            description: local.description,
            assignee: local.assignee,
            assigneeIds,
            dueDate: local.due_date,
            priority: (local.priority || 'normal').toUpperCase(),
            status: (local.status || 'todo').toUpperCase(),
        });
        return local;
    },

    async updateTodoStatus(id: string, status: string) {
        if (isOnline()) {
            try {
                await api.patch(`/todos/${id}/status`, { status: STATUS_TO_API[status as Todo['status']] });
                const cache = lsGet<Todo[]>(CACHE_KEY, []);
                lsSet(CACHE_KEY, cache.map((t) => (t.id === id ? { ...t, status: status as Todo['status'] } : t)));
                return;
            } catch (e) {
                if (isHttpResponseError(e)) throw e;
                /* ag hatasi → offline mantigi */
            }
        }
        const cache = lsGet<Todo[]>(CACHE_KEY, []);
        lsSet(CACHE_KEY, cache.map((t) => (t.id === id ? { ...t, status: status as Todo['status'] } : t)));
        if (isTauri()) {
            const db = await getReadyDb();
            if (db) {
                try {
                    await db.execute('UPDATE todos SET status = $1 WHERE id = $2', [status, id]);
                } catch { /* yoksay */ }
            }
        }
        await enqueueSync('TODO_UPDATED', { localId: id, status: status.toUpperCase() });
    },

    async updateTodo(todo: Todo) {
        const assigneeIds = (todo.assignees ?? []).map((a) => a.id).filter(Boolean);
        if (isOnline()) {
            try {
                const { data } = await api.patch<{ success: boolean; data: ApiTodo }>(`/todos/${todo.id}`, {
                    title: todo.title,
                    description: todo.description || undefined,
                    priority: PRIORITY_TO_API[todo.priority ?? 'normal'],
                    status: STATUS_TO_API[todo.status ?? 'todo'],
                    dueDate: todo.due_date ?? null,
                    assigneeIds,
                });
                const saved = mapFromApi(data.data);
                const cache = lsGet<Todo[]>(CACHE_KEY, []);
                lsSet(CACHE_KEY, cache.map((t) => (t.id === saved.id ? saved : t)));
                return;
            } catch (e) {
                if (isHttpResponseError(e)) throw e;
                /* ag hatasi → offline mantigi */
            }
        }
        const cache = lsGet<Todo[]>(CACHE_KEY, []);
        lsSet(CACHE_KEY, cache.map((t) => (t.id === todo.id ? todo : t)));
        if (isTauri()) {
            const db = await getReadyDb();
            if (db) {
                try {
                    await db.execute(
                        'UPDATE todos SET title = $1, description = $2, assignee = $3, due_date = $4, priority = $5, status = $6 WHERE id = $7',
                        [todo.title || '', todo.description || '', todo.assignee || '', todo.due_date || null, todo.priority || 'normal', todo.status || 'todo', todo.id],
                    );
                } catch { /* yoksay */ }
            }
        }
        await enqueueSync('TODO_UPDATED', {
            localId: todo.id,
            title: todo.title,
            description: todo.description,
            assignee: todo.assignee,
            assigneeIds,
            dueDate: todo.due_date,
            priority: (todo.priority || 'normal').toUpperCase(),
            status: (todo.status || 'todo').toUpperCase(),
        });
    },

    async deleteTodo(id: string) {
        if (isOnline()) {
            try {
                await api.delete(`/todos/${id}`);
                const cache = lsGet<Todo[]>(CACHE_KEY, []);
                lsSet(CACHE_KEY, cache.filter((t) => t.id !== id));
                return;
            } catch (e) {
                if (isHttpResponseError(e)) throw e;
                /* ag hatasi → offline mantigi */
            }
        }
        const cache = lsGet<Todo[]>(CACHE_KEY, []);
        lsSet(CACHE_KEY, cache.filter((t) => t.id !== id));
        if (isTauri()) {
            const db = await getReadyDb();
            if (db) {
                try {
                    await db.execute('DELETE FROM todos WHERE id = $1', [id]);
                } catch { /* yoksay */ }
            }
        }
        await enqueueSync('TODO_DELETED', { localId: id });
    },

    // ===== Yorumlar (yerel — backend endpoint'i henuz yok) =====

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

    // ===== Etiketler (yerel — backend endpoint'i henuz yok) =====

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
                await db.execute('INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)', [tag.id, tag.name, tag.color]);
                await enqueueSync('TAG_CREATED', { localId: tag.id, name: tag.name, color: tag.color });
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
                await db.execute('UPDATE tags SET name = $1, color = $2 WHERE id = $3', [tag.name, tag.color, tag.id]);
                await enqueueSync('TAG_UPDATED', { localId: tag.id, name: tag.name, color: tag.color });
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
                await enqueueSync('TAG_DELETED', { localId: id });
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
                    await db.execute('INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)', [todoId, tagId]);
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
