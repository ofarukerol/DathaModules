// Personnel Module — DathaModules Submodule
// Barrel export for all personnel pages, stores, and types

// ─── Pages ───
export { default as Employees } from './pages/Employees';
export { default as EmployeeDetail } from './pages/EmployeeDetail';
export { default as ShiftManagement } from './pages/ShiftManagement';
export { default as ShiftDefinitions } from './pages/ShiftDefinitions';
export { default as Payroll } from './pages/Payroll';

// ─── Stores ───
export { useEmployeeStore } from './stores/useEmployeeStore';
export { usePersonnelDefsStore } from './stores/usePersonnelDefsStore';
export { useShiftDefinitionStore } from './stores/useShiftDefinitionStore';
export { useEmployeeDocStore, DOCUMENT_TYPES } from './stores/useEmployeeDocStore';
export { usePersonnelConfigStore } from './stores/usePersonnelConfigStore';

// ─── Types ───
export type { Employee, EmployeeSummary, Department, DepartmentConfig, Position, ShiftDefinition, EmployeeDocument } from './types';
