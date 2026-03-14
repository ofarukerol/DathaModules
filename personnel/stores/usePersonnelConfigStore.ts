import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DepartmentConfig, Position } from '../types';

interface PersonnelConfigStore {
    departments: DepartmentConfig[];
    positions: Position[];
    addDepartment: (dept: Omit<DepartmentConfig, 'id'>) => void;
    updateDepartment: (id: string, updates: Partial<Omit<DepartmentConfig, 'id'>>) => void;
    deleteDepartment: (id: string) => void;
    addPosition: (pos: Omit<Position, 'id'>) => void;
    updatePosition: (id: string, updates: Partial<Omit<Position, 'id'>>) => void;
    deletePosition: (id: string) => void;
}

const defaultDepartments: DepartmentConfig[] = [
    { id: 'dept_mutfak', name: 'Mutfak', color: '#10B981' },
    { id: 'dept_salon', name: 'Salon', color: '#3B82F6' },
    { id: 'dept_bar', name: 'Bar', color: '#F59E0B' },
    { id: 'dept_yonetim', name: 'Yönetim', color: '#8B5CF6' },
];

const defaultPositions: Position[] = [
    { id: 'pos_garson', name: 'Garson' },
    { id: 'pos_kasiyer', name: 'Kasiyer' },
    { id: 'pos_asci', name: 'Aşçı' },
    { id: 'pos_mudur', name: 'Müdür' },
    { id: 'pos_barmen', name: 'Barmen' },
    { id: 'pos_kurye', name: 'Kurye' },
];

export const usePersonnelConfigStore = create<PersonnelConfigStore>()(
    persist(
        (set) => ({
            departments: defaultDepartments,
            positions: defaultPositions,

            addDepartment: (dept) => set((state) => ({
                departments: [
                    ...state.departments,
                    { ...dept, id: `dept_${Date.now()}` },
                ],
            })),

            updateDepartment: (id, updates) => set((state) => ({
                departments: state.departments.map((d) =>
                    d.id === id ? { ...d, ...updates } : d
                ),
            })),

            deleteDepartment: (id) => set((state) => ({
                departments: state.departments.filter((d) => d.id !== id),
            })),

            addPosition: (pos) => set((state) => ({
                positions: [
                    ...state.positions,
                    { ...pos, id: `pos_${Date.now()}` },
                ],
            })),

            updatePosition: (id, updates) => set((state) => ({
                positions: state.positions.map((p) =>
                    p.id === id ? { ...p, ...updates } : p
                ),
            })),

            deletePosition: (id) => set((state) => ({
                positions: state.positions.filter((p) => p.id !== id),
            })),
        }),
        {
            name: 'personnel-config-store',
            merge: (persistedState: unknown, currentState) => ({
                ...currentState,
                ...(persistedState as Partial<PersonnelConfigStore>),
                departments: (persistedState as Partial<{ departments: DepartmentConfig[] }>)?.departments || currentState.departments,
                positions: (persistedState as Partial<{ positions: Position[] }>)?.positions || currentState.positions,
            }),
        }
    )
);
