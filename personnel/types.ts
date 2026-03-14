// ─── Employee ───

export interface Employee {
    id: string;
    name: string;
    position: string;
    department: string;
    status: 'active' | 'on_leave' | 'terminated';
    phone?: string;
    email?: string;
    photo_url?: string;
    hire_date?: string;
    leave_start_date?: string;
    leave_end_date?: string;
    termination_date?: string;
    salary: number;
    shift: string;
    performance: number;
    notes?: string;
    created_at: string;

    // Kişisel bilgiler
    tc_kimlik_no?: string;
    birth_date?: string;
    gender?: string;
    marital_status?: string;
    blood_type?: string;
    military_status?: string;

    // Acil durum yakını
    emergency_name?: string;
    emergency_phone?: string;
    emergency_relation?: string;

    // Adres
    ulke?: string;
    il?: string;
    ilce?: string;
    mahalle?: string;
    address_line?: string;
}

export interface EmployeeSummary {
    totalCount: number;
    activeCount: number;
    onLeaveCount: number;
    terminatedCount: number;
}

// ─── Department & Position ───

export interface Department {
    id: string;
    name: string;
}

export interface DepartmentConfig {
    id: string;
    name: string;
    color: string;
}

export interface Position {
    id: string;
    name: string;
}

// ─── Shift ───

export interface ShiftDefinition {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    earlyEntryTolerance: number;
    lateEntryTolerance: number;
    earlyExitTolerance: number;
    lateExitTolerance: number;
    description: string;
}

// ─── Documents ───

export interface EmployeeDocument {
    id: string;
    employeeId: string;
    docType: string;
    fileName: string;
    filePath: string;
    uploadedAt: string;
}

export const DOCUMENT_TYPES = [
    { key: 'kimlik', label: 'Kimlik', icon: 'badge', description: 'Nüfus cüzdanı / kimlik kartı fotokopisi' },
    { key: 'ikametgah', label: 'İkametgah', icon: 'home', description: 'İkametgah belgesi (e-Devlet)' },
    { key: 'fotograf', label: 'Fotoğraf', icon: 'photo_camera', description: 'Vesikalık fotoğraf' },
    { key: 'adli_sicil', label: 'Adli Sicil Kaydı', icon: 'gavel', description: 'Adli sicil kaydı belgesi' },
    { key: 'saglik_raporu', label: 'Sağlık Raporu', icon: 'medical_information', description: 'İşe giriş sağlık raporu' },
    { key: 'sozlesme', label: 'İşe Giriş Sözleşmesi', icon: 'description', description: 'İmzalı iş sözleşmesi' },
    { key: 'ibraname', label: 'İbrâname', icon: 'verified', description: 'İbraname belgesi' },
] as const;
