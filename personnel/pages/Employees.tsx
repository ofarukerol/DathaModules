import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useFavoritesStore, getPageInfo } from '../../../stores/useFavoritesStore';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import CustomSelect from '../../../components/CustomSelect';
import { usePersonnelDefsStore } from '../stores/usePersonnelDefsStore';
import HeaderActions from '../../../components/HeaderActions';
import type { Employee } from '../types';

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

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
    'Mutfak': { bg: 'bg-orange-50', text: 'text-orange-600' },
    'Kasa': { bg: 'bg-blue-50', text: 'text-blue-600' },
    'Kurye': { bg: 'bg-green-50', text: 'text-green-600' },
    'Salon': { bg: 'bg-purple-50', text: 'text-purple-600' },
    'Yönetim': { bg: 'bg-red-50', text: 'text-red-600' },
    'Depo': { bg: 'bg-teal-50', text: 'text-teal-600' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    active: { label: 'Aktif', color: 'bg-green-500' },
    on_leave: { label: 'İzinli', color: 'bg-amber-500' },
    terminated: { label: 'Ayrıldı', color: 'bg-red-500' },
};


const SHIFT_OPTIONS = [
    { value: 'Tam Zamanlı', label: 'Tam Zamanlı' },
    { value: 'Yarı Zamanlı', label: 'Yarı Zamanlı' },
    { value: 'Vardiyalı', label: 'Vardiyalı' },
];

const getInitials = (name: string) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getDeptColor = (dept: string) => {
    return DEPT_COLORS[dept] || { bg: 'bg-gray-50', text: 'text-gray-600' };
};

// --- Add/Edit Employee Modal ---
interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: Employee | null;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, employee }) => {
    const { addEmployee, updateEmployee } = useEmployeeStore();
    const { departments, positions } = usePersonnelDefsStore();
    const navigate = useNavigate();
    const isEdit = !!employee;

    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [department, setDepartment] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [shift, setShift] = useState('Tam Zamanlı');
    const [salary, setSalary] = useState('');
    const [saving, setSaving] = useState(false);

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (employee) {
            setName(employee.name);
            setPosition(employee.position);
            setDepartment(employee.department);
            setPhone(employee.phone || '');
            setEmail(employee.email || '');
            setShift(employee.shift);
            setSalary(employee.salary ? String(employee.salary) : '');
        } else {
            setName('');
            setPosition('');
            setDepartment(departments[0]?.name || '');
            setPhone('');
            setEmail('');
            setShift('Tam Zamanlı');
            setSalary('');
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim() || !position.trim()) return;
        setSaving(true);
        try {
            if (isEdit && employee) {
                await updateEmployee(employee.id, {
                    name: name.trim(),
                    position: position.trim(),
                    department,
                    phone: phone.trim() || undefined,
                    email: email.trim() || undefined,
                    shift,
                    salary: parseFloat(salary) || 0,
                });
            } else {
                await addEmployee({
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    position: position.trim(),
                    department,
                    status: 'active',
                    phone: phone.trim() || undefined,
                    email: email.trim() || undefined,
                    shift,
                    salary: parseFloat(salary) || 0,
                    performance: 0,
                });
            }
            onClose();
        } catch (err) {
            console.error('Save employee error:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{isEdit ? 'Personel Düzenle' : 'Yeni Personel'}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{isEdit ? 'Personel bilgilerini güncelleyin' : 'Yeni personel kaydı oluşturun'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Boş liste uyarısı */}
                    {(departments.length === 0 || positions.length === 0) && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">info</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-700">
                                    {departments.length === 0 && positions.length === 0
                                        ? 'Departman ve pozisyon tanımlanmamış.'
                                        : departments.length === 0
                                            ? 'Departman tanımlanmamış.'
                                            : 'Pozisyon tanımlanmamış.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate('/settings', { state: { tab: 'personnel' } }); }}
                                    className="text-xs text-amber-600 underline font-medium mt-0.5 hover:text-amber-800 transition-colors"
                                >
                                    Ayarlar › Personel'den ekle
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Ad Soyad *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Personel adı soyadı"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Pozisyon *</label>
                        {positions.length > 0 ? (
                            <CustomSelect
                                options={positions.map(p => ({ value: p.name, label: p.name, icon: 'badge' }))}
                                value={position}
                                onChange={setPosition}
                                placeholder="Pozisyon seçin"
                            />
                        ) : (
                            <input
                                type="text"
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                                placeholder="Şef, Garson, Kasiyer..."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            />
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Departman</label>
                        {departments.length > 0 ? (
                            <CustomSelect
                                options={departments.map(d => ({ value: d.name, label: d.name, icon: 'corporate_fare' }))}
                                value={department}
                                onChange={setDepartment}
                                placeholder="Departman seçin"
                            />
                        ) : (
                            <input
                                type="text"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                placeholder="Departman adı"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            />
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Vardiya</label>
                        <CustomSelect
                            options={SHIFT_OPTIONS}
                            value={shift}
                            onChange={setShift}
                            placeholder="Vardiya türü"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Telefon</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="0555 123 4567"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Maaş (₺)</label>
                            <input
                                type="number"
                                value={salary}
                                onChange={e => setSalary(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">E-posta</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="ornek@mail.com"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#663259]/10 transition-all"
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || !position.trim() || saving}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#F97171] hover:bg-[#E05A5A] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(249,113,113,0.3)]"
                    >
                        {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Employee Detail Modal ---
interface DetailModalProps {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (emp: Employee) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: 'active' | 'on_leave') => void;
}

const EmployeeDetailModal: React.FC<DetailModalProps> = ({ employee, isOpen, onClose, onEdit, onDelete, onStatusChange }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEscapeKey(onClose, isOpen);

    if (!isOpen || !employee) return null;

    const avatar = getAvatarColor(employee.name);
    const deptColor = getDeptColor(employee.department);
    const statusInfo = STATUS_MAP[employee.status] || STATUS_MAP.active;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full ${avatar.bg} ${avatar.text} flex items-center justify-center text-xl font-black`}>
                                {getInitials(employee.name)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{employee.name}</h3>
                                <p className="text-sm text-gray-500">{employee.position}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${deptColor.bg} ${deptColor.text}`}>{employee.department}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                            {statusInfo.label}
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="p-6 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vardiya</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{employee.shift}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Performans</p>
                            <p className={`text-sm font-bold mt-1 ${employee.performance >= 80 ? 'text-green-600' : employee.performance >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                %{employee.performance}
                            </p>
                        </div>
                    </div>
                    {employee.phone && (
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Telefon</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{employee.phone}</p>
                        </div>
                    )}
                    {employee.email && (
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-posta</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{employee.email}</p>
                        </div>
                    )}
                    {employee.salary > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Maaş</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">₺{employee.salary.toLocaleString('tr-TR')}</p>
                        </div>
                    )}
                </div>

                {/* Status Change */}
                <div className="px-6 pb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Durum Değiştir</p>
                    <div className="flex gap-2">
                        {(['active', 'on_leave'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => onStatusChange(employee.id, s)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                    employee.status === s
                                        ? 'bg-[#663259] text-white'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {STATUS_MAP[s].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                    <div>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-colors text-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Sil
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { onDelete(employee.id); setShowDeleteConfirm(false); }}
                                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                                >
                                    Evet, Sil
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => { onClose(); onEdit(employee); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#663259] text-white font-bold text-sm hover:bg-[#7a3d6b] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Düzenle
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---
const PersonnelList: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toggleFavorite, isFavorite } = useFavoritesStore();
    const pageInfo = getPageInfo(location.pathname);
    const isFav = pageInfo ? isFavorite(location.pathname) : false;

    const { employees, isLoading, summary, fetchEmployees, fetchSummary, updateEmployee, deleteEmployee } = useEmployeeStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState<string | null>(null);
    const [filterStatuses, setFilterStatuses] = useState<string[]>(['active', 'on_leave']);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
    const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        fetchEmployees();
        fetchSummary();
    }, []);

    // Departments with counts
    const departments = useMemo(() => {
        const map: Record<string, number> = {};
        employees.forEach(e => {
            map[e.department] = (map[e.department] || 0) + 1;
        });
        return Object.entries(map)
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        let result = [...employees];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.position.toLowerCase().includes(q) ||
                e.department.toLowerCase().includes(q)
            );
        }

        if (filterDept) {
            result = result.filter(e => e.department === filterDept);
        }

        if (filterStatuses.length > 0) {
            result = result.filter(e => filterStatuses.includes(e.status));
        }

        return result;
    }, [employees, searchQuery, filterDept, filterStatuses]);

    const toggleStatus = (status: string) => {
        setFilterStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const handleStatusChange = async (id: string, status: 'active' | 'on_leave' | 'terminated') => {
        await updateEmployee(id, { status });
        if (detailEmployee?.id === id) {
            setDetailEmployee({ ...detailEmployee, status });
        }
    };

    const handleDelete = async (id: string) => {
        await deleteEmployee(id);
        setDetailEmployee(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Gradient Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="h-12 px-2.5 rounded-l-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/15 border-r-0"
                                >
                                    <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
                                </button>
                                <div className="w-12 h-12 rounded-r-xl bg-white/15 flex items-center justify-center border border-white/20 border-l-white/10">
                                    <span className="material-symbols-outlined text-white text-[26px]">badge</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-white leading-tight">Personel Listesi</h1>
                                    {pageInfo && (
                                        <button
                                            onClick={() => toggleFavorite({ path: location.pathname, ...pageInfo })}
                                            className={`w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-125 active:scale-95 ${isFav ? 'text-amber-400' : 'text-white/40 hover:text-amber-400'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{isFav ? 'star' : 'star_border'}</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-white/60 text-xs mt-0.5">
                                    {summary.totalCount} personel &middot; {summary.activeCount} aktif &middot; {summary.onLeaveCount} izinli
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center bg-white/10 rounded-xl px-3 border border-white/15">
                                <span className="material-symbols-outlined text-white/50 text-[16px]">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Personel ara..."
                                    className="py-2 px-2 text-sm font-medium text-white placeholder-white/40 outline-none bg-transparent w-44"
                                />
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Personel
                            </button>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* Toplam Personel */}
                    <div
                        onClick={() => setFilterStatuses([])}
                        className={`bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border relative overflow-hidden group cursor-pointer transition-all ${
                            filterStatuses.length === 0 ? 'border-[#663259]/40 ring-2 ring-[#663259]/10' : 'border-white/80 hover:border-[#663259]/30'
                        }`}
                    >
                        <div className="absolute right-0 top-0 w-24 h-24 bg-[#663259]/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#663259]" />
                                    Toplam Personel
                                </p>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">{summary.totalCount}</h3>
                                <p className="text-xs text-gray-400 mt-1">Tüm kayıtlı personel</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <span className="material-symbols-outlined text-[#663259] text-[28px]">groups</span>
                            </div>
                        </div>
                    </div>

                    {/* Aktif Çalışan */}
                    <div
                        onClick={() => setFilterStatuses(['active', 'on_leave'])}
                        className={`bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border relative overflow-hidden group cursor-pointer transition-all ${
                            filterStatuses.length === 2 && filterStatuses.includes('active') && filterStatuses.includes('on_leave') ? 'border-green-400/40 ring-2 ring-green-500/10' : 'border-white/80 hover:border-green-500/30'
                        }`}
                    >
                        <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    Aktif Çalışan
                                </p>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">{summary.activeCount}</h3>
                                <p className="text-xs text-gray-400 mt-1">Şu an aktif personel</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <span className="material-symbols-outlined text-green-500 text-[28px]">person_check</span>
                            </div>
                        </div>
                    </div>

                    {/* İzinli */}
                    <div
                        onClick={() => setFilterStatuses(['on_leave'])}
                        className={`bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border relative overflow-hidden group cursor-pointer transition-all ${
                            filterStatuses.length === 1 && filterStatuses[0] === 'on_leave' ? 'border-amber-400/40 ring-2 ring-amber-500/10' : 'border-white/80 hover:border-amber-500/30'
                        }`}
                    >
                        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    İzinli
                                </p>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">{summary.onLeaveCount}</h3>
                                <p className="text-xs text-gray-400 mt-1">İzinde olan personel</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <span className="material-symbols-outlined text-amber-500 text-[28px]">beach_access</span>
                            </div>
                        </div>
                    </div>

                    {/* Ayrılan Personeller */}
                    <div
                        onClick={() => setFilterStatuses(['terminated'])}
                        className={`bg-white/65 backdrop-blur-sm p-5 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border relative overflow-hidden group cursor-pointer transition-all ${
                            filterStatuses.length === 1 && filterStatuses[0] === 'terminated' ? 'border-red-400/40 ring-2 ring-red-500/10' : 'border-white/80 hover:border-red-500/30'
                        }`}
                    >
                        <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Ayrılan Personeller
                                </p>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">{summary.terminatedCount}</h3>
                                <p className="text-xs text-gray-400 mt-1">İşten ayrılan personel</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <span className="material-symbols-outlined text-red-500 text-[28px]">person_off</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: Sidebar + Grid */}
                <div className="flex gap-5">
                    {/* Left Sidebar Filters */}
                    <div className="w-56 shrink-0 space-y-4">
                        {/* Department Filter */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Departman</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setFilterDept(null)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        !filterDept ? 'bg-[#663259] text-white' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">apps</span>
                                        Hepsi
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${!filterDept ? 'bg-white/20' : 'bg-gray-100'}`}>
                                        {employees.length}
                                    </span>
                                </button>
                                {departments.map(d => {
                                    const dColor = getDeptColor(d.department);
                                    return (
                                        <button
                                            key={d.department}
                                            onClick={() => setFilterDept(filterDept === d.department ? null : d.department)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                filterDept === d.department ? 'bg-[#663259] text-white' : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${filterDept === d.department ? 'bg-white' : dColor.bg.replace('bg-', 'bg-').replace('-50', '-400')}`}
                                                    style={{ backgroundColor: filterDept === d.department ? 'white' : undefined }}
                                                />
                                                {d.department}
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filterDept === d.department ? 'bg-white/20' : 'bg-gray-100'}`}>
                                                {d.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Durum</h3>
                            <div className="space-y-2">
                                {(['active', 'on_leave', 'terminated'] as const).map(s => {
                                    const info = STATUS_MAP[s];
                                    const isChecked = filterStatuses.includes(s);
                                    return (
                                        <label
                                            key={s}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <div
                                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                                    isChecked ? 'bg-[#663259] border-[#663259]' : 'border-gray-300'
                                                }`}
                                                onClick={() => toggleStatus(s)}
                                            >
                                                {isChecked && (
                                                    <span className="material-symbols-outlined text-white text-[12px]">check</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${info.color}`} />
                                                <span className="text-sm font-medium text-gray-700">{info.label}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Card Grid */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin w-8 h-8 border-2 border-[#663259] border-t-transparent rounded-full" />
                            </div>
                        ) : filteredEmployees.length === 0 && employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="material-symbols-outlined text-gray-300 text-[64px] mb-4">group_off</span>
                                <p className="text-lg font-bold text-gray-400 mb-1">Henüz personel eklenmemiş</p>
                                <p className="text-sm text-gray-400 mb-4">İlk personelinizi eklemek için butona tıklayın.</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F97171] hover:bg-[#E05A5A] text-white rounded-xl text-sm font-bold transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Yeni Personel Ekle
                                </button>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="material-symbols-outlined text-gray-300 text-[64px] mb-4">search_off</span>
                                <p className="text-lg font-bold text-gray-400 mb-1">Sonuç bulunamadı</p>
                                <p className="text-sm text-gray-400">Farklı bir filtre veya arama terimi deneyin.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredEmployees.map(emp => {
                                    const avatar = getAvatarColor(emp.name);
                                    const deptColor = getDeptColor(emp.department);
                                    const statusInfo = STATUS_MAP[emp.status] || STATUS_MAP.active;
                                    return (
                                        <div
                                            key={emp.id}
                                            onClick={() => navigate(`/personnel/${emp.id}`)}
                                            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer group"
                                        >
                                            {/* Top: Avatar + Name + Status Dot */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full ${avatar.bg} ${avatar.text} flex items-center justify-center text-base font-black shrink-0`}>
                                                        {getInitials(emp.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-gray-800 text-sm truncate">{emp.name}</h4>
                                                        <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                                                    </div>
                                                </div>
                                                <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} mt-1.5 shrink-0`} title={statusInfo.label} />
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-gray-400 font-medium">Vardiya</p>
                                                    <p className="text-xs font-bold text-gray-700 mt-0.5">{emp.shift}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-gray-400 font-medium">Performans</p>
                                                    <p className={`text-xs font-bold mt-0.5 ${emp.performance >= 80 ? 'text-green-600' : emp.performance >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                                                        {emp.performance > 0 ? `%${emp.performance}` : '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Footer: Badge + Detail */}
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 ${deptColor.bg} ${deptColor.text} text-[10px] font-bold rounded-full`}>
                                                    {emp.department}
                                                </span>
                                                <span className="text-xs text-[#663259] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Detay →
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Card */}
                                <div
                                    onClick={() => setShowAddModal(true)}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#F97171] hover:bg-[#F97171]/5 transition-all cursor-pointer min-h-[180px] group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#F97171]/10 flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-[#F97171] text-[24px] transition-colors">add</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 group-hover:text-[#F97171] transition-colors">Yeni Personel</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>

            {/* Modals */}
            <EmployeeModal
                isOpen={showAddModal || !!editEmployee}
                onClose={() => { setShowAddModal(false); setEditEmployee(null); }}
                employee={editEmployee}
            />

            <EmployeeDetailModal
                employee={detailEmployee}
                isOpen={!!detailEmployee}
                onClose={() => setDetailEmployee(null)}
                onEdit={(emp) => setEditEmployee(emp)}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
};

export default PersonnelList;
