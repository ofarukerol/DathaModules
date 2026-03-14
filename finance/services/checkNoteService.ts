import { getDb } from '../../_shared/db';
import api from '../../_shared/api';

export type CheckNoteType = 'received_check' | 'given_check' | 'promissory_note';
export type CheckNoteStatus = 'pending' | 'collected' | 'endorsed' | 'returned' | 'bounced' | 'paid';

export interface CheckNote {
    id: string;
    type: CheckNoteType;
    check_no: string;
    bank: string;
    bank_code: string;
    amount: number;
    currency: string;
    due_date: string;
    issue_date: string;
    drawer: string;
    holder: string;
    party: string;
    description: string;
    status: CheckNoteStatus;
    endorsed_to: string;
    created_at: string;
}

export const checkNoteService = {
    async getAll(): Promise<CheckNote[]> {
        const db = await getDb();
        if (!db) {
            try {
                const res = await api.get('/finance/check-notes');
                const data = res.data;
                return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            } catch { return []; }
        }
        return await db.select<CheckNote[]>(
            'SELECT * FROM check_notes ORDER BY due_date ASC'
        );
    },

    async create(note: Omit<CheckNote, 'created_at'>): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.post('/finance/check-notes', note);
            return;
        }
        await db.execute(
            `INSERT INTO check_notes (id, type, check_no, bank, bank_code, amount, currency, due_date, issue_date, drawer, holder, party, description, status, endorsed_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [note.id, note.type, note.check_no, note.bank, note.bank_code, note.amount, note.currency, note.due_date, note.issue_date, note.drawer, note.holder, note.party, note.description, note.status, note.endorsed_to]
        );
    },

    async update(id: string, data: Partial<Omit<CheckNote, 'id' | 'created_at'>>): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.patch(`/finance/check-notes/${id}`, data);
            return;
        }
        const fields: string[] = [];
        const values: (string | number)[] = [];
        let idx = 1;

        const keys: (keyof typeof data)[] = ['type', 'check_no', 'bank', 'bank_code', 'amount', 'currency', 'due_date', 'issue_date', 'drawer', 'holder', 'party', 'description', 'status', 'endorsed_to'];
        for (const key of keys) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(data[key] as string | number);
            }
        }

        if (fields.length === 0) return;

        values.push(id);
        await db.execute(
            `UPDATE check_notes SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
    },

    async delete(id: string): Promise<void> {
        const db = await getDb();
        if (!db) {
            await api.delete(`/finance/check-notes/${id}`);
            return;
        }
        await db.execute('DELETE FROM check_notes WHERE id = $1', [id]);
    },
};
