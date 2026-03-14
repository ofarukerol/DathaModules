import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EmployeeDocument } from '../types';
export { DOCUMENT_TYPES } from '../types';

interface EmployeeDocStore {
    documents: EmployeeDocument[];
    addDocument: (doc: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => void;
    removeDocument: (id: string) => void;
    getDocsByEmployee: (employeeId: string) => EmployeeDocument[];
    getDocByType: (employeeId: string, docType: string) => EmployeeDocument | undefined;
}

export const useEmployeeDocStore = create<EmployeeDocStore>()(
    persist(
        (set, get) => ({
            documents: [],
            addDocument: (doc) => {
                const newDoc: EmployeeDocument = {
                    ...doc,
                    id: crypto.randomUUID(),
                    uploadedAt: new Date().toISOString(),
                };
                // Aynı employee + docType varsa eskisini sil (güncelle)
                set(state => ({
                    documents: [
                        ...state.documents.filter(d => !(d.employeeId === doc.employeeId && d.docType === doc.docType)),
                        newDoc,
                    ],
                }));
            },
            removeDocument: (id) => {
                set(state => ({
                    documents: state.documents.filter(d => d.id !== id),
                }));
            },
            getDocsByEmployee: (employeeId) => {
                return get().documents.filter(d => d.employeeId === employeeId);
            },
            getDocByType: (employeeId, docType) => {
                return get().documents.find(d => d.employeeId === employeeId && d.docType === docType);
            },
        }),
        { name: 'employee-doc-store' }
    )
);
