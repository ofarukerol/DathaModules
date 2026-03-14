import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { usePersonnelDefsStore } from '../stores/usePersonnelDefsStore';
import { useShiftDefinitionStore } from '../stores/useShiftDefinitionStore';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from '../../../components/DatePicker';
import AddressFields from '../../../components/AddressFields';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useEmployeeDocStore, DOCUMENT_TYPES } from '../stores/useEmployeeDocStore';
import HeaderActions from '../../../components/HeaderActions';
import type { Employee } from '../types';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Aktif', color: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
    on_leave: { label: 'İzinli', color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
    terminated: { label: 'Ayrıldı', color: 'bg-red-500', bg: 'bg-red-50 text-red-700' },
};

const AVATAR_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { bg: 'bg-amber-100', text: 'text-amber-600' },
];

const getInitials = (name: string) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getSicilNo = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return `TR-${String(Math.abs(hash) % 100000).padStart(5, '0')}`;
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

type TabType = 'info' | 'documents' | 'shifts' | 'performance' | 'activity';

// ── Field Row component ──
interface FieldRowProps {
    icon: string;
    label: string;
    value: string | number | undefined;
    editing: boolean;
    type?: 'text' | 'number' | 'tel' | 'email' | 'textarea';
    editValue: string;
    onEditChange: (v: string) => void;
    placeholder?: string;
    suffix?: string;
}

function FieldRow({ icon, label, value, editing, type = 'text', editValue, onEditChange, placeholder, suffix }: FieldRowProps) {
    const displayValue = value !== undefined && value !== null && value !== ''
        ? (suffix ? `${value}${suffix}` : String(value))
        : '—';

    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-gray-400 text-[18px]">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                {editing ? (
                    type === 'textarea' ? (
                        <textarea
                            value={editValue}
                            onChange={e => onEditChange(e.target.value)}
                            placeholder={placeholder}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20 resize-none"
                        />
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type={type}
                                value={editValue}
                                onChange={e => onEditChange(e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                            />
                            {suffix && <span className="text-xs font-medium text-gray-400 shrink-0">{suffix}</span>}
                        </div>
                    )
                ) : (
                    <p className="text-sm font-semibold text-gray-800">{displayValue}</p>
                )}
            </div>
        </div>
    );
}

export default function EmployeeDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { employees, fetchEmployees, updateEmployee, deleteEmployee } = useEmployeeStore();
    const { departments, positions } = usePersonnelDefsStore();
    const { definitions: shiftDefs } = useShiftDefinitionStore();
    const { addDocument, removeDocument, getDocsByEmployee, getDocByType } = useEmployeeDocStore();

    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [editing, setEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editDepartment, setEditDepartment] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editShift, setEditShift] = useState('');
    const [editSalary, setEditSalary] = useState('');
    const [editHireDate, setEditHireDate] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editPerformance, setEditPerformance] = useState('');

    // Kişisel bilgiler
    const [editTcKimlik, setEditTcKimlik] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editMaritalStatus, setEditMaritalStatus] = useState('');
    const [editBloodType, setEditBloodType] = useState('');
    const [editMilitaryStatus, setEditMilitaryStatus] = useState('');

    // Acil durum yakını
    const [editEmergencyName, setEditEmergencyName] = useState('');
    const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
    const [editEmergencyRelation, setEditEmergencyRelation] = useState('');

    // Adres
    const [editUlke, setEditUlke] = useState('');
    const [editIl, setEditIl] = useState('');
    const [editIlce, setEditIlce] = useState('');
    const [editMahalle, setEditMahalle] = useState('');
    const [editAddressLine, setEditAddressLine] = useState('');

    // Fotoğraf
    const [editPhotoUrl, setEditPhotoUrl] = useState('');

    useEffect(() => { if (employees.length === 0) fetchEmployees(); }, []);
    useEffect(() => {
        if (id && employees.length > 0) {
            const found = employees.find(e => e.id === id) ?? null;
            setEmployee(found);
        }
    }, [id, employees]);

    // Escape to cancel editing
    useEscapeKey(() => { if (editing) { setEditing(false); } }, editing);

    const startEditing = () => {
        if (!employee) return;
        setEditName(employee.name);
        setEditPhone(employee.phone || '');
        setEditEmail(employee.email || '');
        setEditDepartment(employee.department || '');
        setEditPosition(employee.position || '');
        setEditShift(employee.shift || '');
        setEditSalary(employee.salary > 0 ? String(employee.salary) : '');
        setEditHireDate(employee.hire_date || '');
        setEditNotes(employee.notes || '');
        setEditPerformance(String(employee.performance || 0));
        setEditTcKimlik(employee.tc_kimlik_no || '');
        setEditBirthDate(employee.birth_date || '');
        setEditGender(employee.gender || '');
        setEditMaritalStatus(employee.marital_status || '');
        setEditBloodType(employee.blood_type || '');
        setEditMilitaryStatus(employee.military_status || '');
        setEditEmergencyName(employee.emergency_name || '');
        setEditEmergencyPhone(employee.emergency_phone || '');
        setEditEmergencyRelation(employee.emergency_relation || '');
        setEditUlke(employee.ulke || '');
        setEditIl(employee.il || '');
        setEditIlce(employee.ilce || '');
        setEditMahalle(employee.mahalle || '');
        setEditAddressLine(employee.address_line || '');
        setEditPhotoUrl(employee.photo_url || '');
        setEditing(true);
    };

    const handleSave = async () => {
        if (!employee) return;
        setSaving(true);
        const updates: Partial<Omit<Employee, 'id' | 'created_at'>> = {
            name: editName.trim() || employee.name,
            phone: editPhone.trim() || undefined,
            email: editEmail.trim() || undefined,
            department: editDepartment,
            position: editPosition,
            shift: editShift,
            salary: Number(editSalary) || 0,
            hire_date: editHireDate || undefined,
            notes: editNotes.trim() || undefined,
            performance: Number(editPerformance) || 0,
            photo_url: editPhotoUrl || undefined,
            tc_kimlik_no: editTcKimlik.trim() || undefined,
            birth_date: editBirthDate || undefined,
            gender: editGender || undefined,
            marital_status: editMaritalStatus || undefined,
            blood_type: editBloodType || undefined,
            military_status: editMilitaryStatus || undefined,
            emergency_name: editEmergencyName.trim() || undefined,
            emergency_phone: editEmergencyPhone.trim() || undefined,
            emergency_relation: editEmergencyRelation || undefined,
            ulke: editUlke || undefined,
            il: editIl || undefined,
            ilce: editIlce || undefined,
            mahalle: editMahalle || undefined,
            address_line: editAddressLine.trim() || undefined,
        };
        await updateEmployee(employee.id, updates);
        setEmployee({
            ...employee,
            ...updates,
            phone: updates.phone || '',
            email: updates.email || '',
            hire_date: updates.hire_date || '',
            notes: updates.notes || '',
            photo_url: updates.photo_url || '',
            tc_kimlik_no: updates.tc_kimlik_no || '',
            birth_date: updates.birth_date || '',
            gender: updates.gender || '',
            marital_status: updates.marital_status || '',
            blood_type: updates.blood_type || '',
            military_status: updates.military_status || '',
            emergency_name: updates.emergency_name || '',
            emergency_phone: updates.emergency_phone || '',
            emergency_relation: updates.emergency_relation || '',
            ulke: updates.ulke || '',
            il: updates.il || '',
            ilce: updates.ilce || '',
            mahalle: updates.mahalle || '',
            address_line: updates.address_line || '',
        });
        setEditing(false);
        setSaving(false);
    };

    const handleStatusChange = async (
        status: 'active' | 'on_leave' | 'terminated',
        extra?: { leave_start_date?: string; leave_end_date?: string; termination_date?: string }
    ) => {
        if (!employee) return;
        const updates: Partial<Omit<Employee, 'id' | 'created_at'>> = { status, ...extra };
        // Aktif'e dönünce izin/ayrılma tarihlerini temizle
        if (status === 'active') {
            updates.leave_start_date = '';
            updates.leave_end_date = '';
            updates.termination_date = '';
        }
        await updateEmployee(employee.id, updates);
        setEmployee({ ...employee, ...updates });
    };

    const handleDelete = async () => {
        if (!employee) return;
        await deleteEmployee(employee.id);
        navigate('/personnel/list');
    };

    const handleFileUpload = async (docType: string) => {
        if (!employee) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                addDocument({
                    employeeId: employee.id,
                    docType,
                    fileName: file.name,
                    filePath: file.name, // Gerçek dosya yolu — ileride Object Storage'a taşınacak
                });
            }
        };
        input.click();
    };

    const handleRemoveDoc = (docId: string) => {
        removeDocument(docId);
    };

    const employeeDocs = useMemo(() => {
        if (!employee) return [];
        return getDocsByEmployee(employee.id);
    }, [employee, getDocsByEmployee]);

    const handlePhotoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setEditPhotoUrl(base64);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const handleCall = () => {
        if (employee?.phone) {
            window.open(`tel:${employee.phone}`, '_self');
        }
    };


    const handleMail = () => {
        if (employee?.email) {
            window.open(`mailto:${employee.email}`, '_self');
        }
    };

    const avatar = useMemo(() => employee ? getAvatarColor(employee.name) : AVATAR_COLORS[0], [employee]);
    const statusInfo = employee ? (STATUS_MAP[employee.status] ?? STATUS_MAP.active) : STATUS_MAP.active;
    const sicilNo = employee ? getSicilNo(employee.id) : '-';

    const deptOptions = useMemo(() => departments.map(d => ({ value: d.name, label: d.name })), [departments]);
    const posOptions = useMemo(() => positions.map(p => ({ value: p.name, label: p.name })), [positions]);
    const shiftOptions = useMemo(() => shiftDefs.map(s => ({ value: s.name, label: `${s.name} (${s.startTime}-${s.endTime})` })), [shiftDefs]);

    // ── Not found ──
    if (!employee) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-gray-300 text-[64px] mb-4 block">person_off</span>
                        <p className="text-lg font-bold text-gray-400">Personel bulunamadı</p>
                        <button
                            onClick={() => navigate('/personnel/list')}
                            className="mt-4 px-5 py-2.5 bg-[#663259] text-white rounded-xl text-sm font-bold hover:bg-[#7a3d6b] transition-colors"
                        >
                            Listeye Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                {/* ── Gradient Kart Header ── */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Birleşik pill: geri oku + sayfa ikonu */}
                            <div className="flex items-center">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0"
                                >
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">person</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">{employee.name}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-white/60 text-xs">{employee.position}</span>
                                    <span className="text-white/30">•</span>
                                    <span className="text-white/60 text-xs">{employee.department}</span>
                                    <span className="text-white/30">•</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                                        employee.status === 'on_leave' ? 'bg-amber-500/20 text-amber-300' :
                                        employee.status === 'terminated' ? 'bg-red-500/20 text-red-300' :
                                        'bg-gray-500/20 text-gray-300'
                                    }`}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* İletişim butonları */}
                            {employee.phone && (
                                <>
                                    <button
                                        onClick={handleCall}
                                        className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                        title="Ara"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (employee?.phone) {
                                                const phone = employee.phone.replace(/\D/g, '');
                                                const normalized = phone.startsWith('0') ? `90${phone.slice(1)}` : phone.startsWith('90') ? phone : `90${phone}`;
                                                window.open(`sms:+${normalized}`, '_blank');
                                            }
                                        }}
                                        className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                        title="SMS"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">sms</span>
                                    </button>
                                </>
                            )}
                            {employee.email && (
                                <button
                                    onClick={handleMail}
                                    className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                    title="E-posta"
                                >
                                    <span className="material-symbols-outlined text-[18px]">mail</span>
                                </button>
                            )}

                            {/* Düzenle / Kaydet */}
                            {editing ? (
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="h-9 px-3 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/20 transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">save</span>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={startEditing}
                                    className="ml-2 h-9 px-4 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Düzenle
                                </button>
                            )}
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="bg-white rounded-xl border border-gray-100 px-4 shrink-0 shadow-sm">
                    <nav className="flex gap-1">
                        {([
                            { key: 'info', icon: 'person', label: 'Kişisel Bilgiler' },
                            { key: 'documents', icon: 'folder_open', label: 'Evrak Yükleme' },
                            { key: 'shifts', icon: 'calendar_month', label: 'Vardiya & İzin' },
                            { key: 'performance', icon: 'bar_chart', label: 'Performans' },
                            { key: 'activity', icon: 'history', label: 'Hareketler' },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`py-3 px-4 text-sm flex items-center gap-2 border-b-2 transition-all ${
                                    activeTab === tab.key
                                        ? 'border-[#663259] text-[#663259] font-bold'
                                        : 'border-transparent text-gray-400 hover:text-gray-600 font-medium'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* ── Tab Content ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">

                    {/* ── TAB: Kişisel Bilgiler ── */}
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                            {/* Sol: Temel Bilgiler */}
                            <div className="lg:col-span-2 space-y-4">

                                {/* Kişisel Bilgiler Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#663259] text-[20px]">badge</span>
                                        Temel Bilgiler
                                    </h3>

                                    {/* Fotoğraf + Bilgiler */}
                                    <div className="flex gap-5 mb-2">
                                        {/* Profil Fotoğrafı */}
                                        <div className="shrink-0">
                                            {editing ? (
                                                <button
                                                    onClick={handlePhotoUpload}
                                                    className="group w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#663259] flex flex-col items-center justify-center transition-all overflow-hidden bg-gray-50 hover:bg-[#663259]/5"
                                                >
                                                    {editPhotoUrl ? (
                                                        <img src={editPhotoUrl} alt="Profil" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-gray-400 group-hover:text-[#663259] text-[28px] transition-colors">add_a_photo</span>
                                                            <span className="text-[10px] font-medium text-gray-400 group-hover:text-[#663259] mt-1 transition-colors">Fotoğraf Ekle</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                                                    {employee.photo_url ? (
                                                        <img src={employee.photo_url} alt="Profil" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-3xl font-bold ${avatar.bg} ${avatar.text}`}>
                                                            {getInitials(employee.name)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* İlk satır alanları */}
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                            <FieldRow
                                                icon="person" label="Ad Soyad" value={employee.name}
                                                editing={editing} editValue={editName} onEditChange={setEditName}
                                                placeholder="Ad Soyad"
                                            />
                                            <FieldRow
                                                icon="fingerprint" label="Sicil No" value={sicilNo}
                                                editing={false} editValue="" onEditChange={() => {}}
                                            />
                                            <FieldRow
                                                icon="id_card" label="T.C. Kimlik No" value={employee.tc_kimlik_no}
                                                editing={editing} editValue={editTcKimlik} onEditChange={setEditTcKimlik}
                                                placeholder="11 haneli TC Kimlik No"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">apartment</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Departman</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={deptOptions}
                                                            value={editDepartment}
                                                            onChange={setEditDepartment}
                                                            placeholder="Departman seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">{employee.department || '—'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">work</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Pozisyon</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={posOptions}
                                                            value={editPosition}
                                                            onChange={setEditPosition}
                                                            placeholder="Pozisyon seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">{employee.position || '—'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">schedule</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Vardiya</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={shiftOptions}
                                                            value={editShift}
                                                            onChange={setEditShift}
                                                            placeholder="Vardiya seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">{employee.shift || '—'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">event</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">İşe Giriş Tarihi</p>
                                                    {editing ? (
                                                        <DatePicker
                                                            value={editHireDate}
                                                            onChange={setEditHireDate}
                                                            placeholder="Tarih seçin"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">cake</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Doğum Tarihi</p>
                                                    {editing ? (
                                                        <DatePicker
                                                            value={editBirthDate}
                                                            onChange={setEditBirthDate}
                                                            placeholder="Tarih seçin"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Kişisel Detaylar Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-purple-500 text-[20px]">person_book</span>
                                        Kişisel Detaylar
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">wc</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Cinsiyet</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={[
                                                                { value: 'erkek', label: 'Erkek' },
                                                                { value: 'kadin', label: 'Kadın' },
                                                            ]}
                                                            value={editGender}
                                                            onChange={setEditGender}
                                                            placeholder="Seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {employee.gender === 'erkek' ? 'Erkek' : employee.gender === 'kadin' ? 'Kadın' : '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">favorite</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Medeni Hali</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={[
                                                                { value: 'bekar', label: 'Bekar' },
                                                                { value: 'evli', label: 'Evli' },
                                                                { value: 'bosanmis', label: 'Boşanmış' },
                                                                { value: 'dul', label: 'Dul' },
                                                            ]}
                                                            value={editMaritalStatus}
                                                            onChange={setEditMaritalStatus}
                                                            placeholder="Seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {({ bekar: 'Bekar', evli: 'Evli', bosanmis: 'Boşanmış', dul: 'Dul' } as Record<string, string>)[employee.marital_status || ''] || '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">bloodtype</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Kan Grubu</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={[
                                                                { value: 'A+', label: 'A Rh+' },
                                                                { value: 'A-', label: 'A Rh-' },
                                                                { value: 'B+', label: 'B Rh+' },
                                                                { value: 'B-', label: 'B Rh-' },
                                                                { value: 'AB+', label: 'AB Rh+' },
                                                                { value: 'AB-', label: 'AB Rh-' },
                                                                { value: '0+', label: '0 Rh+' },
                                                                { value: '0-', label: '0 Rh-' },
                                                            ]}
                                                            value={editBloodType}
                                                            onChange={setEditBloodType}
                                                            placeholder="Seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">{employee.blood_type || '—'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">military_tech</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Askerlik Durumu</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={[
                                                                { value: 'yapti', label: 'Yaptı' },
                                                                { value: 'muaf', label: 'Muaf' },
                                                                { value: 'tecilli', label: 'Tecilli' },
                                                                { value: 'yapmiyor', label: 'Yapmıyor' },
                                                            ]}
                                                            value={editMilitaryStatus}
                                                            onChange={setEditMilitaryStatus}
                                                            placeholder="Seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {({ yapti: 'Yaptı', muaf: 'Muaf', tecilli: 'Tecilli', yapmiyor: 'Yapmıyor' } as Record<string, string>)[employee.military_status || ''] || '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Acil Durum Yakını Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500 text-[20px]">emergency</span>
                                        Acil Durum Yakını
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                                        <FieldRow
                                            icon="person" label="Yakın Adı Soyadı" value={employee.emergency_name}
                                            editing={editing} editValue={editEmergencyName} onEditChange={setEditEmergencyName}
                                            placeholder="Ad Soyad"
                                        />
                                        <FieldRow
                                            icon="call" label="Yakın Telefonu" value={employee.emergency_phone}
                                            editing={editing} type="tel" editValue={editEmergencyPhone} onEditChange={setEditEmergencyPhone}
                                            placeholder="05XX XXX XX XX"
                                        />
                                        <div className="py-3 border-b border-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-gray-400 text-[18px]">family_restroom</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Yakınlık Derecesi</p>
                                                    {editing ? (
                                                        <CustomSelect
                                                            options={[
                                                                { value: 'anne', label: 'Anne' },
                                                                { value: 'baba', label: 'Baba' },
                                                                { value: 'es', label: 'Eş' },
                                                                { value: 'kardes', label: 'Kardeş' },
                                                                { value: 'diger', label: 'Diğer' },
                                                            ]}
                                                            value={editEmergencyRelation}
                                                            onChange={setEditEmergencyRelation}
                                                            placeholder="Seçin"
                                                            accentColor="#663259"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {({ anne: 'Anne', baba: 'Baba', es: 'Eş', kardes: 'Kardeş', diger: 'Diğer' } as Record<string, string>)[employee.emergency_relation || ''] || '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Adres Bilgileri Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-teal-500 text-[20px]">location_on</span>
                                        Adres Bilgileri
                                    </h3>
                                    {editing ? (
                                        <div className="space-y-3">
                                            <AddressFields
                                                values={{ ulke: editUlke, il: editIl, ilce: editIlce, mahalle: editMahalle }}
                                                onChange={(field, value) => {
                                                    if (field === 'ulke') setEditUlke(value);
                                                    else if (field === 'il') setEditIl(value);
                                                    else if (field === 'ilce') setEditIlce(value);
                                                    else if (field === 'mahalle') setEditMahalle(value);
                                                }}
                                            />
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Açık Adres</label>
                                                <textarea
                                                    value={editAddressLine}
                                                    onChange={e => setEditAddressLine(e.target.value)}
                                                    placeholder="Sokak, bina no, daire no..."
                                                    rows={2}
                                                    className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20 resize-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                            <FieldRow
                                                icon="public" label="Ülke" value={employee.ulke}
                                                editing={false} editValue="" onEditChange={() => {}}
                                            />
                                            <FieldRow
                                                icon="location_city" label="İl" value={employee.il}
                                                editing={false} editValue="" onEditChange={() => {}}
                                            />
                                            <FieldRow
                                                icon="map" label="İlçe" value={employee.ilce}
                                                editing={false} editValue="" onEditChange={() => {}}
                                            />
                                            <FieldRow
                                                icon="holiday_village" label="Mahalle" value={employee.mahalle}
                                                editing={false} editValue="" onEditChange={() => {}}
                                            />
                                            <div className="md:col-span-2">
                                                <FieldRow
                                                    icon="home" label="Açık Adres" value={employee.address_line}
                                                    editing={false} editValue="" onEditChange={() => {}}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* İletişim Bilgileri Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-500 text-[20px]">contact_phone</span>
                                        İletişim Bilgileri
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        <FieldRow
                                            icon="smartphone" label="Cep Telefonu" value={employee.phone}
                                            editing={editing} type="tel" editValue={editPhone} onEditChange={setEditPhone}
                                            placeholder="05XX XXX XX XX"
                                        />
                                        <FieldRow
                                            icon="mail" label="E-posta Adresi" value={employee.email}
                                            editing={editing} type="email" editValue={editEmail} onEditChange={setEditEmail}
                                            placeholder="ornek@email.com"
                                        />
                                    </div>
                                </div>

                                {/* Maaş & Ücret Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-500 text-[20px]">payments</span>
                                        Maaş & Ücret
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        <FieldRow
                                            icon="account_balance_wallet" label="Aylık Brüt Maaş"
                                            value={employee.salary > 0 ? `₺${formatCurrency(employee.salary)}` : undefined}
                                            editing={editing} type="number" editValue={editSalary} onEditChange={setEditSalary}
                                            placeholder="25000" suffix="₺"
                                        />
                                        <FieldRow
                                            icon="trending_up" label="Performans Puanı"
                                            value={employee.performance > 0 ? `${employee.performance}/100` : undefined}
                                            editing={editing} type="number" editValue={editPerformance} onEditChange={setEditPerformance}
                                            placeholder="85"
                                        />
                                    </div>
                                </div>

                                {/* Notlar Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500 text-[20px]">description</span>
                                        Notlar
                                    </h3>
                                    <FieldRow
                                        icon="edit_note" label="Personel Notları" value={employee.notes}
                                        editing={editing} type="textarea" editValue={editNotes} onEditChange={setEditNotes}
                                        placeholder="Personel hakkında notlarınızı buraya yazabilirsiniz..."
                                    />
                                </div>
                            </div>

                            {/* Sağ: Durum & Hızlı İşlemler */}
                            <div className="space-y-4">

                                {/* Durum Kartı */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#F97171] text-[20px]">manage_accounts</span>
                                        Personel Durumu
                                    </h3>

                                    {/* Mevcut durum göstergesi */}
                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 ${STATUS_MAP[employee.status]?.bg || 'bg-gray-50 text-gray-600'}`}>
                                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_MAP[employee.status]?.color || 'bg-gray-400'}`} />
                                        <span className="text-sm font-bold">{STATUS_MAP[employee.status]?.label || employee.status}</span>
                                    </div>

                                    {/* Durum değiştirme butonları */}
                                    <div className="space-y-3">
                                        {/* Aktif butonu */}
                                        {employee.status !== 'active' && (
                                            <button
                                                onClick={() => handleStatusChange('active')}
                                                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                Aktif Yap
                                            </button>
                                        )}

                                        {/* İzinli bölümü */}
                                        {employee.status === 'on_leave' ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2.5">
                                                <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
                                                    <span className="material-symbols-outlined text-[16px]">beach_access</span>
                                                    İzin Tanımlama
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-amber-600 mb-1 block">Başlangıç</label>
                                                        <DatePicker
                                                            value={employee.leave_start_date || ''}
                                                            onChange={(val) => {
                                                                handleStatusChange('on_leave', {
                                                                    leave_start_date: val,
                                                                    leave_end_date: employee.leave_end_date,
                                                                });
                                                            }}
                                                            placeholder="Başlangıç"
                                                            compact
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-amber-600 mb-1 block">Bitiş</label>
                                                        <DatePicker
                                                            value={employee.leave_end_date || ''}
                                                            onChange={(val) => {
                                                                handleStatusChange('on_leave', {
                                                                    leave_start_date: employee.leave_start_date,
                                                                    leave_end_date: val,
                                                                });
                                                            }}
                                                            placeholder="Bitiş"
                                                            compact
                                                        />
                                                    </div>
                                                </div>
                                                {employee.leave_start_date && employee.leave_end_date && (
                                                    <p className="text-[10px] text-amber-600 text-center">
                                                        {(() => {
                                                            const start = new Date(employee.leave_start_date);
                                                            const end = new Date(employee.leave_end_date);
                                                            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                            return days > 0 ? `${days} gün izin` : '';
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange('on_leave', {
                                                    leave_start_date: new Date().toISOString().split('T')[0],
                                                    leave_end_date: '',
                                                })}
                                                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">beach_access</span>
                                                İzne Çıkar
                                            </button>
                                        )}

                                        {/* Ayrıldı bölümü */}
                                        {employee.status === 'terminated' ? (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2.5">
                                                <div className="flex items-center gap-2 text-red-700 text-xs font-bold">
                                                    <span className="material-symbols-outlined text-[16px]">person_off</span>
                                                    İşten Ayrılma
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold text-red-600 mb-1 block">Ayrılış Tarihi</label>
                                                    <DatePicker
                                                        value={employee.termination_date || ''}
                                                        onChange={(val) => {
                                                            handleStatusChange('terminated', { termination_date: val });
                                                        }}
                                                        placeholder="Tarih seçin"
                                                        compact
                                                    />
                                                </div>
                                                {employee.termination_date && (
                                                    <p className="text-[10px] text-red-600 text-center">
                                                        {new Date(employee.termination_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde ayrıldı
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange('terminated', {
                                                    termination_date: new Date().toISOString().split('T')[0],
                                                })}
                                                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">person_off</span>
                                                İşten Çıkar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Özet Bilgiler */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#663259] text-[20px]">info</span>
                                        Özet
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <span className="text-xs text-gray-400">Sicil No</span>
                                            <span className="text-xs font-bold text-gray-700">{sicilNo}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <span className="text-xs text-gray-400">Departman</span>
                                            <span className="text-xs font-bold text-gray-700">{employee.department || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <span className="text-xs text-gray-400">Pozisyon</span>
                                            <span className="text-xs font-bold text-gray-700">{employee.position || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <span className="text-xs text-gray-400">Vardiya</span>
                                            <span className="text-xs font-bold text-gray-700">{employee.shift || '—'}</span>
                                        </div>
                                        {employee.salary > 0 && (
                                            <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                                <span className="text-xs text-gray-400">Maaş</span>
                                                <span className="text-xs font-bold text-emerald-600">₺{formatCurrency(employee.salary)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between py-2">
                                            <span className="text-xs text-gray-400">İşe Giriş</span>
                                            <span className="text-xs font-bold text-gray-700">
                                                {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('tr-TR') : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hızlı İşlemler */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#F97171] text-[20px]">bolt</span>
                                        Hızlı İşlemler
                                    </h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => navigate('/personnel/shifts')}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#663259]/5 hover:bg-[#663259]/10 transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-[#663259]/10 flex items-center justify-center group-hover:bg-[#663259]/20 transition-colors">
                                                <span className="material-symbols-outlined text-[#663259] text-[18px]">edit_calendar</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-gray-700">Vardiya Planına Git</p>
                                                <p className="text-[10px] text-gray-400">Haftalık programı düzenle</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => navigate('/personnel/payroll')}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-gray-700">Maaş Dökümü</p>
                                                <p className="text-[10px] text-gray-400">Aylık ödeme detayları</p>
                                            </div>
                                        </button>
                                        {!editing && (
                                            <button
                                                onClick={startEditing}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100/70 transition-colors group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                    <span className="material-symbols-outlined text-blue-600 text-[18px]">edit</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-gray-700">Bilgileri Düzenle</p>
                                                    <p className="text-[10px] text-gray-400">Personel bilgilerini güncelle</p>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Silme */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-bold text-xs border border-red-200 hover:bg-red-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                            Personeli Sil
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 text-center mb-3">
                                                <span className="font-bold text-red-500">{employee.name}</span> silinecek. Emin misiniz?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleDelete}
                                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    Evet, Sil
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="flex-1 py-3 rounded-xl text-gray-500 font-bold text-xs border border-gray-200 hover:bg-gray-50 transition-colors"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Evrak Yükleme ── */}
                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            {/* Evrak durumu özeti */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#663259] text-[20px]">folder_open</span>
                                        Resmi Evraklar
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                            {employeeDocs.length} / {DOCUMENT_TYPES.length} yüklendi
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#663259] to-emerald-500 transition-all duration-500"
                                        style={{ width: `${(employeeDocs.length / DOCUMENT_TYPES.length) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 text-right">
                                    {DOCUMENT_TYPES.length - employeeDocs.length === 0
                                        ? 'Tüm evraklar tamamlandı'
                                        : `${DOCUMENT_TYPES.length - employeeDocs.length} evrak eksik`
                                    }
                                </p>
                            </div>

                            {/* Evrak listesi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {DOCUMENT_TYPES.map(docType => {
                                    const uploaded = employee ? getDocByType(employee.id, docType.key) : undefined;
                                    return (
                                        <div
                                            key={docType.key}
                                            className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${
                                                uploaded
                                                    ? 'border-emerald-200 bg-emerald-50/30'
                                                    : 'border-gray-100 hover:border-amber-200'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                    uploaded ? 'bg-emerald-100' : 'bg-gray-100'
                                                }`}>
                                                    <span className={`material-symbols-outlined text-[22px] ${
                                                        uploaded ? 'text-emerald-600' : 'text-gray-400'
                                                    }`}>
                                                        {uploaded ? 'check_circle' : docType.icon}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="text-sm font-bold text-gray-800">{docType.label}</h4>
                                                        {!uploaded && (
                                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">EKSİK</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mb-2">{docType.description}</p>

                                                    {uploaded ? (
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="material-symbols-outlined text-gray-400 text-[14px]">attach_file</span>
                                                                <span className="text-xs font-medium text-gray-600 truncate">{uploaded.fileName}</span>
                                                                <span className="text-[10px] text-gray-300 shrink-0">
                                                                    {new Date(uploaded.uploadedAt).toLocaleDateString('tr-TR')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                <button
                                                                    onClick={() => handleFileUpload(docType.key)}
                                                                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                                                    title="Değiştir"
                                                                >
                                                                    <span className="material-symbols-outlined text-blue-500 text-[14px]">sync</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveDoc(uploaded.id)}
                                                                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                                                                    title="Sil"
                                                                >
                                                                    <span className="material-symbols-outlined text-red-400 text-[14px]">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleFileUpload(docType.key)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#663259]/5 hover:bg-[#663259]/10 text-[#663259] text-xs font-bold transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">upload_file</span>
                                                            Dosya Yükle
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Vardiya & İzin ── */}
                    {activeTab === 'shifts' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#663259] text-[20px]">calendar_month</span>
                                    Bu Haftaki Vardiyalar
                                </h3>
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-gray-200 text-[48px] mb-3 block">schedule</span>
                                    <p className="text-sm text-gray-400 mb-4">Vardiya bilgileri için Vardiya Planı sayfasını kullanın</p>
                                    <button
                                        onClick={() => navigate('/personnel/shifts')}
                                        className="px-4 py-2 bg-[#663259] text-white text-xs font-bold rounded-xl hover:bg-[#7a3d6b] transition-colors"
                                    >
                                        Vardiya Planına Git
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 text-[20px]">flight_takeoff</span>
                                    İzin Bakiyesi
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-gray-400">Yıllık İzin</p>
                                            <p className="text-lg font-bold text-gray-800">14 <span className="text-xs font-medium text-gray-400">gün kaldı</span></p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full border-4 border-[#663259] flex items-center justify-center">
                                            <span className="text-xs font-bold text-[#663259]">14</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-gray-400">Mazeret İzni</p>
                                            <p className="text-lg font-bold text-gray-800">3 <span className="text-xs font-medium text-gray-400">gün kaldı</span></p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full border-4 border-amber-400 flex items-center justify-center">
                                            <span className="text-xs font-bold text-amber-600">3</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-gray-400">Kullanılan İzin (Bu Yıl)</p>
                                            <p className="text-lg font-bold text-gray-800">5 <span className="text-xs font-medium text-gray-400">gün</span></p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full border-4 border-gray-300 flex items-center justify-center">
                                            <span className="text-xs font-bold text-gray-500">5</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Performans ── */}
                    {activeTab === 'performance' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Performans Puanı */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                                <h3 className="text-sm font-bold text-gray-800 mb-4">Performans Puanı</h3>
                                <div className="relative w-32 h-32 mx-auto mb-4">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                                        <circle
                                            cx="60" cy="60" r="52" fill="none"
                                            stroke={employee.performance >= 70 ? '#10B981' : employee.performance >= 40 ? '#F59E0B' : '#EF4444'}
                                            strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={`${(employee.performance / 100) * 327} 327`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-3xl font-black text-gray-800">{employee.performance}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">100 üzerinden</p>
                            </div>

                            {/* Aylık Çalışma */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-800 mb-4">Aylık Çalışma Saati</h3>
                                {(() => {
                                    const hours = Math.min(180, Math.floor(120 + employee.performance * 0.6));
                                    const pct = Math.round((hours / 180) * 100);
                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-end gap-2">
                                                <span className="text-4xl font-black text-gray-800">{hours}</span>
                                                <span className="text-sm font-medium text-gray-400 mb-1">/ 180 saat</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#663259] to-[#F97171]"
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Tamamlanan: {pct}%</span>
                                                <span className="text-[#F97171] font-medium">Kalan: {180 - hours}s</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Devamsızlık */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-800 mb-4">Devamsızlık</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs text-gray-500">Geç Gelme</span>
                                        <span className="text-sm font-bold text-amber-600">3 gün</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs text-gray-500">Erken Çıkma</span>
                                        <span className="text-sm font-bold text-orange-600">1 gün</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs text-gray-500">Mazeretsiz</span>
                                        <span className="text-sm font-bold text-red-600">0 gün</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                        <span className="text-xs text-gray-500">Tam Devamlılık</span>
                                        <span className="text-sm font-bold text-emerald-600">22 gün</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Hareketler ── */}
                    {activeTab === 'activity' && (
                        <EmployeeActivityTimeline employee={employee} />
                    )}
                </div>

            </div>
        </div>
    );
}

/* ─── Activity Timeline ─────────────────────────────────────────────── */

interface ActivityItem {
    id: string;
    time: string;
    date: string;
    type: 'hire' | 'status' | 'shift' | 'payment' | 'leave' | 'system';
    title: string;
    description: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    amount?: string;
}

function buildActivitiesFromEmployee(emp: Employee): ActivityItem[] {
    const items: ActivityItem[] = [];
    const now = new Date();

    // İşe giriş
    if (emp.hire_date) {
        const hd = new Date(emp.hire_date);
        items.push({
            id: 'hire',
            time: hd.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            date: hd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'hire',
            title: 'İşe Başlangıç',
            description: `${emp.name}, ${emp.department} departmanında ${emp.position} olarak işe başladı.`,
            icon: 'work',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-400',
            dotColor: 'bg-emerald-500',
        });
    }

    // Maaş kaydı
    if (emp.salary > 0) {
        const salaryDate = new Date(now);
        salaryDate.setDate(1);
        items.push({
            id: 'salary',
            time: '09:00',
            date: salaryDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'payment',
            title: 'Maaş Ödemesi',
            description: `Aylık maaş ödemesi gerçekleştirildi.`,
            icon: 'payments',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-400',
            dotColor: 'bg-blue-500',
            amount: `₺${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(emp.salary)}`,
        });
    }

    // Vardiya ataması
    if (emp.shift) {
        const shiftDate = new Date(now);
        shiftDate.setDate(shiftDate.getDate() - 3);
        items.push({
            id: 'shift',
            time: '08:30',
            date: shiftDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'shift',
            title: 'Vardiya Ataması',
            description: `${emp.shift} vardiyasına atandı.`,
            icon: 'schedule',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-400',
            dotColor: 'bg-purple-500',
        });
    }

    // Durum değişikliği
    const statusLabels: Record<string, string> = {
        active: 'Aktif',
        on_leave: 'İzinli',
        terminated: 'Ayrıldı',
    };
    if (emp.status !== 'active') {
        const statusDate = new Date(now);
        statusDate.setDate(statusDate.getDate() - 1);
        items.push({
            id: 'status-change',
            time: '10:15',
            date: statusDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'status',
            title: `Durum: ${statusLabels[emp.status] || emp.status}`,
            description: `Personel durumu "${statusLabels[emp.status]}" olarak güncellendi.`,
            icon: emp.status === 'on_leave' ? 'beach_access' : emp.status === 'terminated' ? 'person_remove' : 'pause_circle',
            color: emp.status === 'on_leave' ? 'text-amber-600' : emp.status === 'terminated' ? 'text-red-600' : 'text-gray-600',
            bgColor: emp.status === 'on_leave' ? 'bg-amber-50' : emp.status === 'terminated' ? 'bg-red-50' : 'bg-gray-50',
            borderColor: emp.status === 'on_leave' ? 'border-amber-400' : emp.status === 'terminated' ? 'border-red-400' : 'border-gray-400',
            dotColor: emp.status === 'on_leave' ? 'bg-amber-500' : emp.status === 'terminated' ? 'bg-red-500' : 'bg-gray-400',
        });
    }

    // Performans değerlendirmesi
    if (emp.performance > 0) {
        const perfDate = new Date(now);
        perfDate.setDate(perfDate.getDate() - 7);
        items.push({
            id: 'perf',
            time: '14:00',
            date: perfDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'system',
            title: 'Performans Değerlendirmesi',
            description: `Performans puanı ${emp.performance}/100 olarak değerlendirildi.`,
            icon: 'trending_up',
            color: emp.performance >= 70 ? 'text-emerald-600' : emp.performance >= 40 ? 'text-amber-600' : 'text-red-600',
            bgColor: emp.performance >= 70 ? 'bg-emerald-50' : emp.performance >= 40 ? 'bg-amber-50' : 'bg-red-50',
            borderColor: emp.performance >= 70 ? 'border-emerald-400' : emp.performance >= 40 ? 'border-amber-400' : 'border-red-400',
            dotColor: emp.performance >= 70 ? 'bg-emerald-500' : emp.performance >= 40 ? 'bg-amber-500' : 'bg-red-500',
        });
    }

    // Kayıt oluşturulma
    if (emp.created_at) {
        const cd = new Date(emp.created_at);
        items.push({
            id: 'created',
            time: cd.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            date: cd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'system',
            title: 'Kayıt Oluşturuldu',
            description: 'Personel kaydı sisteme eklendi.',
            icon: 'person_add',
            color: 'text-gray-500',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-300',
            dotColor: 'bg-gray-400',
        });
    }

    // Sisteme giriş (bugün)
    items.push({
        id: 'login-today',
        time: '09:00',
        date: now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: 'system',
        title: 'Sisteme Giriş',
        description: 'Vardiya başlangıcı kaydedildi.',
        icon: 'login',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-400',
        dotColor: 'bg-indigo-500',
    });

    // Sırala: en yeni önce
    return items.sort((a, b) => {
        const dateA = new Date(a.date.split(' ').reverse().join('-'));
        const dateB = new Date(b.date.split(' ').reverse().join('-'));
        if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime();
        return b.time.localeCompare(a.time);
    });
}

function EmployeeActivityTimeline({ employee }: { employee: Employee }) {
    const activities = useMemo(() => buildActivitiesFromEmployee(employee), [employee]);
    const [filter, setFilter] = useState<'all' | 'status' | 'payment' | 'system'>('all');

    const filtered = activities.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'status') return a.type === 'status' || a.type === 'hire' || a.type === 'leave';
        if (filter === 'payment') return a.type === 'payment';
        return a.type === 'system' || a.type === 'shift';
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#663259] text-[20px]">history</span>
                    Son Hareketler
                </h3>
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {([
                        { key: 'all', label: 'Tümü' },
                        { key: 'status', label: 'Durum' },
                        { key: 'payment', label: 'Ödeme' },
                        { key: 'system', label: 'Sistem' },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${filter === f.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="p-5 pl-8 relative">
                {/* Vertical line */}
                <div className="absolute top-5 bottom-5 left-[22px] w-0.5 bg-gray-100" />

                <div className="space-y-5">
                    {filtered.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-gray-300 text-[40px] block mb-2">event_busy</span>
                            <p className="text-sm text-gray-400">Bu kategoride hareket bulunamadı.</p>
                        </div>
                    ) : (
                        filtered.map(activity => (
                            <div key={activity.id} className="relative pl-16 group">
                                {/* Dot */}
                                <div className={`absolute left-[-5px] top-2 w-3.5 h-3.5 rounded-full border-[2.5px] border-white shadow-sm z-10 group-hover:scale-125 transition-transform ${activity.dotColor}`} />

                                {/* Time */}
                                <div className="absolute left-[14px] top-1 w-12 text-left">
                                    <span className="text-[11px] font-bold text-gray-700 block leading-tight">{activity.time}</span>
                                </div>

                                {/* Card */}
                                <div className={`p-3.5 rounded-xl border-l-[3px] bg-white shadow-sm hover:shadow-md transition-all duration-200 ${activity.borderColor}`}>
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`p-1.5 rounded-lg text-[18px] material-symbols-outlined shrink-0 ${activity.color} ${activity.bgColor}`}>
                                                {activity.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-800 text-sm">{activity.title}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{activity.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 gap-1">
                                            {activity.amount && (
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700">
                                                    {activity.amount}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{activity.date}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
