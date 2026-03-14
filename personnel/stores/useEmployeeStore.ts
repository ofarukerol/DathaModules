import { create } from 'zustand';
import { employeeService } from '../services/employeeService';
import { useUserStore } from '../../../stores/useUserStore';
import { usePersonnelDefsStore } from './usePersonnelDefsStore';
import type { Employee, EmployeeSummary } from '../types';
import type { User } from '../../../stores/useUserStore';

/** Pozisyon adından User.role'a eşleme */
function mapPositionToRole(position: string): User['role'] {
    const lower = position.toLowerCase();
    if (lower.includes('kasiyer')) return 'Kasiyer';
    if (lower.includes('müdür') || lower.includes('şef') || lower.includes('yönet')) return 'Yönetici';
    return 'Garson';
}

/** Departman adından departman ID'sine eşleme */
function findDeptId(deptName: string): string | undefined {
    const dept = usePersonnelDefsStore.getState().departments.find(
        (d) => d.name.toLowerCase() === deptName.toLowerCase()
    );
    return dept?.id;
}

/** Pozisyon adından pozisyon ID'sine eşleme */
function findPosId(posName: string): string | undefined {
    const pos = usePersonnelDefsStore.getState().positions.find(
        (p) => p.name.toLowerCase() === posName.toLowerCase()
    );
    return pos?.id;
}

interface EmployeeStore {
    employees: Employee[];
    isLoading: boolean;
    summary: EmployeeSummary;

    fetchEmployees: () => Promise<void>;
    addEmployee: (data: Omit<Employee, 'created_at'>) => Promise<string>;
    updateEmployee: (id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
    fetchSummary: () => Promise<void>;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
    employees: [],
    isLoading: false,
    summary: { totalCount: 0, activeCount: 0, onLeaveCount: 0, terminatedCount: 0 },

    fetchEmployees: async () => {
        set({ isLoading: true });
        try {
            const data = await employeeService.getAll();
            set({ employees: data, isLoading: false });

            // Self-healing: DB'deki personellerin users tablosunda karşılığı yoksa oluştur
            if (data.length > 0) {
                try {
                    const { users, addUser, fetchUsers } = useUserStore.getState();
                    // Henüz users yüklenmediyse önce yükle
                    if (users.length === 0) await fetchUsers();

                    const currentUsers = useUserStore.getState().users;
                    const missingEmployees = data.filter(
                        (emp) => !currentUsers.find((u) => u.id === emp.id)
                    );

                    for (const emp of missingEmployees) {
                        try {
                            await addUser({
                                id: emp.id,
                                name: emp.name,
                                role: mapPositionToRole(emp.position),
                                phone: emp.phone,
                                active: emp.status === 'active',
                                departmentId: findDeptId(emp.department),
                                positionId: findPosId(emp.position),
                            });
                        } catch {
                            // Zaten varsa veya hata olursa sessizce devam et
                        }
                    }

                    if (missingEmployees.length > 0) {
                        console.log(`[EmployeeStore] ${missingEmployees.length} personel kullanıcı tablosuna senkronize edildi.`);
                    }
                } catch (syncErr) {
                    console.warn('[EmployeeStore] Bulk user sync failed:', syncErr);
                }
            }
        } catch (err) {
            console.error('fetchEmployees error:', err);
            set({ isLoading: false });
        }
    },

    addEmployee: async (data) => {
        try {
            await employeeService.create(data);

            // Personel → Kullanıcı senkronizasyonu
            // Personelden eklenen kişi otomatik olarak kullanıcı da olur
            try {
                const { users, addUser } = useUserStore.getState();
                const exists = users.find((u) => u.id === data.id);
                if (!exists) {
                    await addUser({
                        id: data.id,
                        name: data.name,
                        role: mapPositionToRole(data.position),
                        phone: data.phone,
                        active: data.status === 'active',
                        departmentId: findDeptId(data.department),
                        positionId: findPosId(data.position),
                    });
                }
            } catch (syncErr) {
                console.warn('[EmployeeStore] User sync failed:', syncErr);
            }

            get().fetchEmployees();
            get().fetchSummary();
            return data.id;
        } catch (err) {
            console.error('addEmployee error:', err);
            throw err;
        }
    },

    updateEmployee: async (id, data) => {
        try {
            await employeeService.update(id, data);

            // Personel güncellenince kullanıcı da güncellenir
            try {
                const { users, updateUser } = useUserStore.getState();
                const userExists = users.find((u) => u.id === id);
                if (userExists) {
                    const updates: Partial<User> = {};
                    if (data.name) updates.name = data.name;
                    if (data.phone !== undefined) updates.phone = data.phone;
                    if (data.status) updates.active = data.status === 'active';
                    if (data.position) {
                        updates.role = mapPositionToRole(data.position);
                        updates.positionId = findPosId(data.position);
                    }
                    if (data.department) {
                        updates.departmentId = findDeptId(data.department);
                    }
                    if (Object.keys(updates).length > 0) {
                        await updateUser(id, updates);
                    }
                }
            } catch (syncErr) {
                console.warn('[EmployeeStore] User update sync failed:', syncErr);
            }

            get().fetchEmployees();
            get().fetchSummary();
        } catch (err) {
            console.error('updateEmployee error:', err);
            throw err;
        }
    },

    deleteEmployee: async (id) => {
        const prev = get().employees;
        set((state) => ({
            employees: state.employees.filter((e) => e.id !== id),
        }));
        try {
            await employeeService.delete(id);
            get().fetchSummary();

            // Personel silinince kullanıcı pasif yapılır (silinmez — sadece kullanıcı olarak kalabilir)
            try {
                const { users, updateUser } = useUserStore.getState();
                const userExists = users.find((u) => u.id === id);
                if (userExists) {
                    await updateUser(id, { active: false });
                }
            } catch (syncErr) {
                console.warn('[EmployeeStore] User deactivate sync failed:', syncErr);
            }
        } catch (err) {
            console.error('deleteEmployee error:', err);
            set({ employees: prev });
        }
    },

    fetchSummary: async () => {
        try {
            const summary = await employeeService.getSummary();
            set({ summary });
        } catch (err) {
            console.error('fetchSummary error:', err);
        }
    },
}));
