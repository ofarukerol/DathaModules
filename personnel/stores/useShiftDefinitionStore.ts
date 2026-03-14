import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShiftDefinition } from '../types';

interface ShiftDefinitionStore {
    definitions: ShiftDefinition[];
    addDefinition: (def: Omit<ShiftDefinition, 'id'>) => void;
    updateDefinition: (id: string, updates: Partial<ShiftDefinition>) => void;
    deleteDefinition: (id: string) => void;
}

const DEFAULT_DEFINITIONS: ShiftDefinition[] = [
    { id: 'sd-1', name: 'Sabah', startTime: '10:00', endTime: '19:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-2', name: 'Mutfak - Full', startTime: '10:00', endTime: '02:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-3', name: 'Full', startTime: '10:00', endTime: '02:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-4', name: 'Mutfak - Sabah', startTime: '10:00', endTime: '18:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-5', name: 'Kurye 12 Saat', startTime: '12:00', endTime: '00:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-6', name: 'Kurye Yarim', startTime: '12:00', endTime: '17:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-7', name: 'Kurye', startTime: '12:00', endTime: '21:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-8', name: 'Ogle', startTime: '13:00', endTime: '22:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-9', name: 'Aksam', startTime: '17:00', endTime: '02:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
    { id: 'sd-10', name: 'Mutfak - Aksam', startTime: '21:00', endTime: '02:00', earlyEntryTolerance: 0, lateEntryTolerance: 0, earlyExitTolerance: 0, lateExitTolerance: 0, description: '' },
];

export const useShiftDefinitionStore = create<ShiftDefinitionStore>()(
    persist(
        (set, get) => ({
            definitions: DEFAULT_DEFINITIONS,
            addDefinition: (def) => {
                const id = crypto.randomUUID();
                set({ definitions: [...get().definitions, { ...def, id }] });
            },
            updateDefinition: (id, updates) => {
                set({
                    definitions: get().definitions.map(d =>
                        d.id === id ? { ...d, ...updates } : d
                    ),
                });
            },
            deleteDefinition: (id) => {
                set({ definitions: get().definitions.filter(d => d.id !== id) });
            },
        }),
        { name: 'shift-definition-store' }
    )
);
