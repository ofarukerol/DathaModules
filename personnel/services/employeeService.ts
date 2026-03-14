import { getReadyDb } from '../../_shared/db';
import type { Employee, EmployeeSummary } from '../types';

const DEMO_EMPLOYEES: Employee[] = [
    { id: 'demo-emp-1', name: 'Ahmet Yılmaz', position: 'Şef Aşçı', department: 'Mutfak', status: 'active', phone: '05321234567', salary: 42000, shift: '08:00 - 17:00', performance: 92, created_at: '2025-06-15T10:00:00Z' },
    { id: 'demo-emp-2', name: 'Elif Kaya', position: 'Kasiyer', department: 'Salon', status: 'active', phone: '05339876543', salary: 28000, shift: '10:00 - 22:00', performance: 88, created_at: '2025-08-20T10:00:00Z' },
    { id: 'demo-emp-3', name: 'Mehmet Demir', position: 'Garson', department: 'Salon', status: 'active', phone: '05441112233', salary: 26000, shift: '11:00 - 23:00', performance: 85, created_at: '2025-09-01T10:00:00Z' },
    { id: 'demo-emp-4', name: 'Ayşe Çelik', position: 'Garson', department: 'Salon', status: 'on_leave', phone: '05554443322', salary: 26000, shift: '11:00 - 23:00', performance: 90, created_at: '2025-07-10T10:00:00Z' },
    { id: 'demo-emp-5', name: 'Can Özkan', position: 'Aşçıbaşı', department: 'Mutfak', status: 'active', phone: '05367778899', salary: 38000, shift: '08:00 - 17:00', performance: 95, created_at: '2025-05-01T10:00:00Z' },
    { id: 'demo-emp-6', name: 'Zeynep Arslan', position: 'Müdür', department: 'Yönetim', status: 'active', phone: '05422223344', salary: 52000, shift: '09:00 - 18:00', performance: 97, created_at: '2025-03-15T10:00:00Z' },
];

export const employeeService = {
    async getAll(): Promise<Employee[]> {
        const db = await getReadyDb();
        if (!db) return DEMO_EMPLOYEES;
        const result = await db.select<Employee[]>(
            'SELECT * FROM employees ORDER BY name ASC'
        );
        return result.length > 0 ? result : DEMO_EMPLOYEES;
    },

    async getById(id: string): Promise<Employee | null> {
        const db = await getReadyDb();
        if (!db) return null;
        const rows = await db.select<Employee[]>(
            'SELECT * FROM employees WHERE id = $1',
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    async create(employee: Omit<Employee, 'created_at'>): Promise<string> {
        const db = await getReadyDb();
        if (!db) throw new Error('Database not available');
        await db.execute(
            `INSERT INTO employees (id, name, position, department, status, phone, email, photo_url, hire_date,
             leave_start_date, leave_end_date, termination_date,
             salary, shift, performance, notes,
             tc_kimlik_no, birth_date, gender, marital_status, blood_type, military_status,
             emergency_name, emergency_phone, emergency_relation,
             ulke, il, ilce, mahalle, address_line)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                     $13, $14, $15, $16,
                     $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
            [
                employee.id,
                employee.name,
                employee.position,
                employee.department,
                employee.status,
                employee.phone || null,
                employee.email || null,
                employee.photo_url || null,
                employee.hire_date || null,
                employee.leave_start_date || null,
                employee.leave_end_date || null,
                employee.termination_date || null,
                employee.salary,
                employee.shift,
                employee.performance,
                employee.notes || null,
                employee.tc_kimlik_no || null,
                employee.birth_date || null,
                employee.gender || null,
                employee.marital_status || null,
                employee.blood_type || null,
                employee.military_status || null,
                employee.emergency_name || null,
                employee.emergency_phone || null,
                employee.emergency_relation || null,
                employee.ulke || null,
                employee.il || null,
                employee.ilce || null,
                employee.mahalle || null,
                employee.address_line || null,
            ]
        );
        return employee.id;
    },

    async update(id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>): Promise<void> {
        const db = await getReadyDb();
        if (!db) return;
        const fields: string[] = [];
        const values: (string | number | null)[] = [];
        let idx = 1;

        const updatable: (keyof typeof data)[] = [
            'name', 'position', 'department', 'status', 'phone', 'email',
            'photo_url', 'hire_date', 'leave_start_date', 'leave_end_date', 'termination_date',
            'salary', 'shift', 'performance', 'notes',
            'tc_kimlik_no', 'birth_date', 'gender', 'marital_status', 'blood_type', 'military_status',
            'emergency_name', 'emergency_phone', 'emergency_relation',
            'ulke', 'il', 'ilce', 'mahalle', 'address_line',
        ];

        for (const key of updatable) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(data[key] as string | number | null);
                idx++;
            }
        }

        if (fields.length > 0) {
            values.push(id);
            await db.execute(
                `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx}`,
                values
            );
        }
    },

    async delete(id: string): Promise<void> {
        const db = await getReadyDb();
        if (!db) return;
        await db.execute('DELETE FROM employees WHERE id = $1', [id]);
    },

    async getSummary(): Promise<EmployeeSummary> {
        const db = await getReadyDb();
        if (!db) return { totalCount: 6, activeCount: 5, onLeaveCount: 1, terminatedCount: 0 };

        const totalResult  = await db.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM employees');
        const activeResult = await db.select<{ cnt: number }[]>("SELECT COUNT(*) as cnt FROM employees WHERE status = 'active'");
        const leaveResult  = await db.select<{ cnt: number }[]>("SELECT COUNT(*) as cnt FROM employees WHERE status = 'on_leave'");
        const terminatedResult = await db.select<{ cnt: number }[]>("SELECT COUNT(*) as cnt FROM employees WHERE status = 'terminated'");

        const total = totalResult[0]?.cnt ?? 0;
        if (total === 0) return { totalCount: 6, activeCount: 5, onLeaveCount: 1, terminatedCount: 0 };

        return {
            totalCount:      total,
            activeCount:     activeResult[0]?.cnt      ?? 0,
            onLeaveCount:    leaveResult[0]?.cnt       ?? 0,
            terminatedCount: terminatedResult[0]?.cnt  ?? 0,
        };
    },

    async getDepartments(): Promise<{ department: string; count: number }[]> {
        const db = await getReadyDb();
        if (!db) return [];
        return await db.select<{ department: string; count: number }[]>(
            'SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC'
        );
    },
};
