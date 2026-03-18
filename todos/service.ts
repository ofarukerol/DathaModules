import { getReadyDb, isTauri } from './db';
import { Todo, Tag, TodoComment } from './types';
import { enqueueSync } from '../../utils/syncQueue';

// ─── localStorage helpers (browser fallback) ───

const LS_TODOS_KEY = 'datha_todos';
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
    localStorage.setItem(key, JSON.stringify(value));
}

// ─── Service ───

export const todoService = {
    async getTodos(): Promise<Todo[]> {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return [];
            try {
                return await db.select<Todo[]>('SELECT * FROM todos ORDER BY created_at DESC');
            } catch (error) {
                console.error('Failed to fetch todos:', error);
                return [];
            }
        }
        // Browser fallback
        return lsGet<Todo[]>(LS_TODOS_KEY, []);
    },

    async addTodo(todo: Todo) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                const params = [
                    todo.id,
                    todo.title || '',
                    todo.description || '',
                    todo.assignee || '',
                    todo.due_date || null,
                    todo.priority || 'normal',
                    todo.status || 'todo',
                    todo.created_at || new Date().toISOString(),
                ];
                await db.execute(
                    'INSERT INTO todos (id, title, description, assignee, due_date, priority, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    params
                );
                await enqueueSync('TODO_CREATED', {
                    localId: todo.id, title: todo.title, description: todo.description,
                    assignee: todo.assignee, dueDate: todo.due_date,
                    priority: (todo.priority || 'normal').toUpperCase(),
                    status: (todo.status || 'todo').toUpperCase(),
                });
            } catch (error) {
                console.error('Failed to add todo:', error);
                throw error;
            }
            return;
        }
        // Browser fallback
        const todos = lsGet<Todo[]>(LS_TODOS_KEY, []);
        todos.unshift(todo);
        lsSet(LS_TODOS_KEY, todos);
    },

    async updateTodoStatus(id: string, status: string) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('UPDATE todos SET status = $1 WHERE id = $2', [status, id]);
                await enqueueSync('TODO_UPDATED', { localId: id, status: status.toUpperCase() });
            } catch (error) {
                console.error('Failed to update todo status:', error);
                throw error;
            }
            return;
        }
        // Browser fallback
        const todos = lsGet<Todo[]>(LS_TODOS_KEY, []);
        const idx = todos.findIndex((t) => t.id === id);
        if (idx >= 0) {
            todos[idx].status = status as Todo['status'];
            lsSet(LS_TODOS_KEY, todos);
        }
    },

    async updateTodo(todo: Todo) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                const params = [
                    todo.title || '',
                    todo.description || '',
                    todo.assignee || '',
                    todo.due_date || null,
                    todo.priority || 'normal',
                    todo.status || 'todo',
                    todo.id,
                ];
                await db.execute(
                    'UPDATE todos SET title = $1, description = $2, assignee = $3, due_date = $4, priority = $5, status = $6 WHERE id = $7',
                    params
                );
                await enqueueSync('TODO_UPDATED', {
                    localId: todo.id, title: todo.title, description: todo.description,
                    assignee: todo.assignee, dueDate: todo.due_date,
                    priority: (todo.priority || 'normal').toUpperCase(),
                    status: (todo.status || 'todo').toUpperCase(),
                });
            } catch (error) {
                console.error('Failed to update todo:', error);
                throw error;
            }
            return;
        }
        // Browser fallback
        const todos = lsGet<Todo[]>(LS_TODOS_KEY, []);
        const idx = todos.findIndex((t) => t.id === todo.id);
        if (idx >= 0) {
            todos[idx] = todo;
            lsSet(LS_TODOS_KEY, todos);
        }
    },

    async deleteTodo(id: string) {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return;
            try {
                await db.execute('DELETE FROM todos WHERE id = $1', [id]);
                await enqueueSync('TODO_DELETED', { localId: id });
            } catch (error) {
                console.error('Failed to delete todo:', error);
                throw error;
            }
            return;
        }
        // Browser fallback
        const todos = lsGet<Todo[]>(LS_TODOS_KEY, []);
        lsSet(LS_TODOS_KEY, todos.filter((t) => t.id !== id));
    },

    async getComments(todoId: string): Promise<TodoComment[]> {
        if (isTauri()) {
            const db = await getReadyDb();
            if (!db) return [];
            try {
                return await db.select<TodoComment[]>(
                    'SELECT * FROM todo_comments WHERE todo_id = $1 ORDER BY created_at ASC',
                    [todoId]
                );
            } catch (error) {
                console.error('Failed to fetch comments:', error);
                return [];
            }
        }
        // Browser fallback
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
                    [comment.id, comment.todo_id, comment.author, comment.content, new Date().toISOString()]
                );
            } catch (error) {
                console.error('Failed to add comment:', error);
                throw error;
            }
            return;
        }
        // Browser fallback
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
        // Browser fallback
        const all = lsGet<TodoComment[]>(LS_COMMENTS_KEY, []);
        lsSet(LS_COMMENTS_KEY, all.filter((c) => c.id !== id));
    },

    // --- Tag Methods ---

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
                await db.execute(
                    'INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)',
                    [tag.id, tag.name, tag.color]
                );
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
                await db.execute(
                    'UPDATE tags SET name = $1, color = $2 WHERE id = $3',
                    [tag.name, tag.color, tag.id]
                );
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
                    [todoId]
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
                    await db.execute(
                        'INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)',
                        [todoId, tagId]
                    );
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
