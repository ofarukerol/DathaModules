import { create } from 'zustand';
import { useRoleStore } from '../../../stores/useRoleStore';
import type { Department, Position } from '../types';

interface PersonnelDefsState {
    departments: Department[];
    positions: Position[];
    addDepartment: (name: string) => void;
    updateDepartment: (id: string, name: string) => void;
    deleteDepartment: (id: string) => void;
    addPosition: (name: string) => void;
    updatePosition: (id: string, name: string) => void;
    deletePosition: (id: string) => void;
    syncFromRoles: () => void;
}

/** Roles'dan departments türet */
function rolesToDepts(): Department[] {
    return useRoleStore.getState().roles.map((r) => ({ id: r.id, name: r.name }));
}

export const usePersonnelDefsStore = create<PersonnelDefsState>((set) => ({
    // Başlangıçta roles'dan oku
    departments: rolesToDepts(),

    positions: [
        { id: 'pos-1', name: 'Garson' },
        { id: 'pos-2', name: 'Şef' },
        { id: 'pos-3', name: 'Kasiyer' },
        { id: 'pos-4', name: 'Kurye' },
        { id: 'pos-5', name: 'Müdür' },
    ],

    /** Roles'dan departments'ı güncelle */
    syncFromRoles: () => {
        set({ departments: rolesToDepts() });
    },

    /** Departman ekle → aynı zamanda Role olarak da eklenir */
    addDepartment: (name) => {
        const id = crypto.randomUUID();
        useRoleStore.getState().addRole({
            id,
            name,
            description: `${name} departmanı.`,
            permissions: [],
        });
        // Subscription otomatik günceller, ama anında reaktivite için set de yap
        set({ departments: rolesToDepts() });
    },

    /** Departman güncelle → karşılık gelen Role da güncellenir */
    updateDepartment: (id, name) => {
        useRoleStore.getState().updateRole(id, { name });
        set({ departments: rolesToDepts() });
    },

    /** Departman sil → karşılık gelen Role da silinir */
    deleteDepartment: (id) => {
        useRoleStore.getState().deleteRole(id);
        set({ departments: rolesToDepts() });
    },

    // Pozisyonlar bağımsız kalır
    addPosition: (name) => set((s) => ({
        positions: [...s.positions, { id: crypto.randomUUID(), name }],
    })),
    updatePosition: (id, name) => set((s) => ({
        positions: s.positions.map((p) => p.id === id ? { ...p, name } : p),
    })),
    deletePosition: (id) => set((s) => ({
        positions: s.positions.filter((p) => p.id !== id),
    })),
}));

/**
 * RoleStore değiştiğinde departments otomatik güncellenir.
 * Yetki gruplarından ekleme/silme/düzenleme yapılınca departmanlar da eşitlenir.
 */
useRoleStore.subscribe((state, prevState) => {
    if (state.roles !== prevState.roles) {
        usePersonnelDefsStore.setState({
            departments: state.roles.map((r) => ({ id: r.id, name: r.name })),
        });
    }
});
