import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { usePersonnelDefsStore } from '../stores/usePersonnelDefsStore';
import { financeService } from '../../finance/services/financeService';
import type { PaymentMethod } from '../../../types/finance';
import CustomSelect from '../../../components/CustomSelect';
import HeaderActions from '../../../components/HeaderActions';

const MONTHS = [
    { value: '1', label: 'Ocak' }, { value: '2', label: 'Şubat' },
    { value: '3', label: 'Mart' }, { value: '4', label: 'Nisan' },
    { value: '5', label: 'Mayıs' }, { value: '6', label: 'Haziran' },
    { value: '7', label: 'Temmuz' }, { value: '8', label: 'Ağustos' },
    { value: '9', label: 'Eylül' }, { value: '10', label: 'Ekim' },
    { value: '11', label: 'Kasım' }, { value: '12', label: 'Aralık' },
];

const SSI_RATE = 0.14;
const TAX_RATE = 0.15;

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
    paid: { label: 'Ödendi', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    pending: { label: 'Bekliyor', bg: 'bg-amber-50', text: 'text-amber-600' },
    partial: { label: 'Kısmi', bg: 'bg-blue-50', text: 'text-blue-600' },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CASH', label: 'Nakit', icon: 'payments' },
    { value: 'CARD', label: 'Kart', icon: 'credit_card' },
    { value: 'BANK_TRANSFER', label: 'Havale', icon: 'account_balance' },
];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

interface PayrollRow {
    id: string;
    name: string;
    department: string;
    position: string;
    grossSalary: number;
    ssiDeduction: number;
    taxDeduction: number;
    totalDeductions: number;
    netSalary: number;
    paid: number;
    remaining: number;
    status: 'paid' | 'pending' | 'partial';
}

export default function Payroll() {
    const navigate = useNavigate();
    const { employees } = useEmployeeStore();
    const { departments } = usePersonnelDefsStore();
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
    const [filterDept, setFilterDept] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    // Ödeme modu
    const [paymentMode, setPaymentMode] = useState(false);
    const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [saving, setSaving] = useState(false);

    // Gerçek ödeme verileri
    const [paymentData, setPaymentData] = useState<Record<string, number>>({});

    const fetchPayments = useCallback(async () => {
        const month = Number(selectedMonth);
        const year = Number(selectedYear);
        const rows = await financeService.getPayrollPayments(month, year);
        const map: Record<string, number> = {};
        for (const r of rows) {
            map[r.employee_id] = r.total_paid;
        }
        setPaymentData(map);
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const yearOptions = useMemo(() => {
        const y = now.getFullYear();
        return [
            { value: String(y - 1), label: String(y - 1) },
            { value: String(y), label: String(y) },
            { value: String(y + 1), label: String(y + 1) },
        ];
    }, []);

    const deptOptions = useMemo(() => [
        { value: 'all', label: 'Tüm Departmanlar' },
        ...departments.map(d => ({ value: d.id, label: d.name })),
    ], [departments]);

    const statusOptions = [
        { value: 'all', label: 'Tüm Durumlar' },
        { value: 'paid', label: 'Ödendi' },
        { value: 'pending', label: 'Bekliyor' },
        { value: 'partial', label: 'Kısmi' },
    ];

    const payrollRows: PayrollRow[] = useMemo(() => {
        const activeEmployees = employees.filter(e => e.status === 'active');
        return activeEmployees.map(emp => {
            const gross = emp.salary || 0;
            const ssi = Math.round(gross * SSI_RATE);
            const taxable = gross - ssi;
            const tax = Math.round(taxable * TAX_RATE);
            const deductions = ssi + tax;
            const net = gross - deductions;
            const paid = paymentData[emp.id] || 0;
            const remaining = Math.max(0, net - paid);
            const status: 'paid' | 'pending' | 'partial' =
                paid >= net && net > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';

            return {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Belirtilmemiş',
                position: emp.position || 'Belirtilmemiş',
                grossSalary: gross,
                ssiDeduction: ssi,
                taxDeduction: tax,
                totalDeductions: deductions,
                netSalary: net,
                paid,
                remaining,
                status,
            };
        });
    }, [employees, paymentData]);

    const filtered = useMemo(() => {
        return payrollRows.filter(r => {
            if (filterDept !== 'all' && !departments.find(d => d.id === filterDept && d.name === r.department)) return false;
            if (filterStatus !== 'all' && r.status !== filterStatus) return false;
            if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [payrollRows, filterDept, filterStatus, search, departments]);

    const totals = useMemo(() => ({
        grossSalary: filtered.reduce((s, r) => s + r.grossSalary, 0),
        totalDeductions: filtered.reduce((s, r) => s + r.totalDeductions, 0),
        netSalary: filtered.reduce((s, r) => s + r.netSalary, 0),
        paid: filtered.reduce((s, r) => s + r.paid, 0),
    }), [filtered]);

    const paidCount = filtered.filter(r => r.status === 'paid').length;
    const pendingCount = filtered.filter(r => r.status === 'pending').length;
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';

    const handleEnterPaymentMode = () => {
        setPaymentMode(true);
        // Kalanı varsayılan tutar olarak ata
        const amounts: Record<string, string> = {};
        for (const row of filtered) {
            if (row.remaining > 0) {
                amounts[row.id] = String(row.remaining);
            }
        }
        setPaymentAmounts(amounts);
    };

    const handleCancelPaymentMode = () => {
        setPaymentMode(false);
        setPaymentAmounts({});
    };

    const handleSavePayments = async () => {
        setSaving(true);
        const today = new Date().toISOString().split('T')[0];

        for (const row of filtered) {
            const amountStr = paymentAmounts[row.id];
            if (!amountStr) continue;
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) continue;

            await financeService.createTransaction({
                type: 'EXPENSE',
                amount,
                category_id: 'exp_maas',
                employee_id: row.id,
                description: `Maaş ödemesi — ${row.name} (${monthLabel} ${selectedYear})`,
                date: today,
                payment_method: paymentMethod,
            });
        }

        await fetchPayments();
        setPaymentMode(false);
        setPaymentAmounts({});
        setSaving(false);
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
                                    <span className="material-symbols-outlined text-white text-[26px]">payments</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Maaş Dökümü</h1>
                                <p className="text-white/60 text-xs mt-0.5">{monthLabel} {selectedYear} — {filtered.length} personel</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* İstatistikler */}
                            <div className="hidden md:flex items-center gap-3 mr-2">
                                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                                    <span className="material-symbols-outlined text-emerald-300 text-[16px]">check_circle</span>
                                    <span className="text-white/80 text-xs">{paidCount} ödendi</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                                    <span className="material-symbols-outlined text-amber-300 text-[16px]">pending</span>
                                    <span className="text-white/80 text-xs">{pendingCount} bekliyor</span>
                                </div>
                            </div>

                            {/* Arama */}
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">search</span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Personel ara..."
                                    className="pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 text-sm w-44 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all"
                                />
                            </div>
                            <HeaderActions />
                        </div>
                    </div>
                </div>

                {/* Filtreler + Ödeme Gir Butonu */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-40">
                        <CustomSelect
                            options={MONTHS}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            placeholder="Ay"
                            icon="calendar_month"
                            accentColor="#663259"
                        />
                    </div>
                    <div className="w-32">
                        <CustomSelect
                            options={yearOptions}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            placeholder="Yıl"
                            icon="event"
                            accentColor="#663259"
                        />
                    </div>
                    <div className="w-56">
                        <CustomSelect
                            options={deptOptions}
                            value={filterDept}
                            onChange={setFilterDept}
                            placeholder="Departman"
                            icon="apartment"
                            accentColor="#663259"
                        />
                    </div>
                    <div className="w-48">
                        <CustomSelect
                            options={statusOptions}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Durum"
                            icon="filter_list"
                            accentColor="#663259"
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {!paymentMode ? (
                            <button
                                onClick={handleEnterPaymentMode}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_card</span>
                                Ödeme Gir
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleCancelPaymentMode}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    İptal
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Özet Kartları */}
                <div className="grid grid-cols-4 gap-3 shrink-0">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[#663259] text-[20px]">account_balance_wallet</span>
                            <span className="text-xs font-medium text-gray-400">Brüt Toplam</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">₺{formatCurrency(totals.grossSalary)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-red-400 text-[20px]">remove_circle</span>
                            <span className="text-xs font-medium text-gray-400">Kesintiler</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">₺{formatCurrency(totals.totalDeductions)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-blue-500 text-[20px]">price_check</span>
                            <span className="text-xs font-medium text-gray-400">Net Toplam</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">₺{formatCurrency(totals.netSalary)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">paid</span>
                            <span className="text-xs font-medium text-gray-400">Ödenen</span>
                        </div>
                        <p className="text-lg font-black text-emerald-600">₺{formatCurrency(totals.paid)}</p>
                    </div>
                </div>

                {/* Ödeme modu: Ödeme yöntemi seçici + Kaydet */}
                {paymentMode && (
                    <div className="flex items-center gap-3 shrink-0 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        <span className="material-symbols-outlined text-emerald-600 text-[20px]">info</span>
                        <span className="text-sm text-emerald-700 font-medium">Ödeme tutarlarını girin, yöntemi seçin ve kaydedin.</span>
                        <div className="ml-auto flex items-center gap-2">
                            {PAYMENT_METHODS.map(pm => (
                                <button
                                    key={pm.value}
                                    onClick={() => setPaymentMethod(pm.value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                                        paymentMethod === pm.value
                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{pm.icon}</span>
                                    {pm.label}
                                </button>
                            ))}
                            <button
                                onClick={handleSavePayments}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-all ml-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">{saving ? 'hourglass_empty' : 'save'}</span>
                                {saving ? 'Kaydediliyor...' : 'Ödemeleri Kaydet'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tablo */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
                                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Personel</th>
                                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Departman</th>
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Brüt Maaş</th>
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kesintiler</th>
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Net Maaş</th>
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Ödenen</th>
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    {paymentMode ? 'Ödeme Tutarı' : 'Kalan'}
                                </th>
                                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <span className="material-symbols-outlined text-gray-300 text-[48px] block mb-2">payments</span>
                                        <p className="text-gray-400 font-medium">Personel bulunamadı</p>
                                        <p className="text-gray-300 text-xs mt-1">Seçili dönem veya filtrelere ait kayıt yok</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(row => {
                                    const st = STATUS_MAP[row.status];
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#663259]/10 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-[#663259]">
                                                            {row.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-[13px]">{row.name}</p>
                                                        <p className="text-[10px] text-gray-400">{row.position}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{row.department}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-gray-700">₺{formatCurrency(row.grossSalary)}</td>
                                            <td className="px-3 py-3 text-right text-red-500 font-medium">
                                                <span className="text-[10px] text-gray-400 block">SGK: ₺{formatCurrency(row.ssiDeduction)}</span>
                                                <span className="text-[10px] text-gray-400 block">Vergi: ₺{formatCurrency(row.taxDeduction)}</span>
                                                <span className="font-semibold text-red-500">-₺{formatCurrency(row.totalDeductions)}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-gray-800">₺{formatCurrency(row.netSalary)}</td>
                                            <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                                                {row.paid > 0 ? `₺${formatCurrency(row.paid)}` : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {paymentMode ? (
                                                    row.remaining > 0 ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max={row.remaining}
                                                            value={paymentAmounts[row.id] || ''}
                                                            onChange={e => setPaymentAmounts(prev => ({ ...prev, [row.id]: e.target.value }))}
                                                            className="w-28 px-2 py-1.5 text-right text-sm font-semibold border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50"
                                                            placeholder="0.00"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-emerald-500 font-medium">Tamamlandı</span>
                                                    )
                                                ) : (
                                                    <span className={`font-semibold ${row.remaining > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
                                                        {row.remaining > 0 ? `₺${formatCurrency(row.remaining)}` : '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                                    <td className="px-4 py-3 font-bold text-gray-700 text-sm" colSpan={2}>Toplam ({filtered.length} kişi)</td>
                                    <td className="px-3 py-3 text-right font-bold text-gray-700">₺{formatCurrency(totals.grossSalary)}</td>
                                    <td className="px-3 py-3 text-right font-bold text-red-500">-₺{formatCurrency(totals.totalDeductions)}</td>
                                    <td className="px-3 py-3 text-right font-black text-gray-800">₺{formatCurrency(totals.netSalary)}</td>
                                    <td className="px-3 py-3 text-right font-bold text-emerald-600">₺{formatCurrency(totals.paid)}</td>
                                    <td className="px-3 py-3 text-right font-bold text-amber-600">
                                        ₺{formatCurrency(totals.netSalary - totals.paid > 0 ? totals.netSalary - totals.paid : 0)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

            </div>
        </div>
    );
}
