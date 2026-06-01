import React, { useEffect, useMemo, useState } from 'react';
import { useReminderStore } from '../reminderStore';
import { ReminderSeverity } from '../reminderTypes';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    Bell,
    Info,
    AlertTriangle,
    X,
    Trash2,
    Send,
    ChevronDown,
    Check,
    Clock,
} from 'lucide-react';

interface RemindersPanelProps {
    getUsersFn?: () => Promise<{ id: string; name: string; role: string }[]>;
}

const severityStyle: Record<ReminderSeverity, { card: string; icon: string; Icon: typeof Info; label: string }> = {
    INFO: {
        card: 'bg-blue-50 border-blue-200',
        icon: 'text-blue-500',
        Icon: Info,
        label: 'Bilgi',
    },
    WARNING: {
        card: 'bg-amber-50 border-amber-200',
        icon: 'text-amber-500',
        Icon: AlertTriangle,
        label: 'Uyarı',
    },
};

function formatWhen(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'az önce';
    if (min < 60) return `${min} dk önce`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours} sa önce`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const RemindersPanel: React.FC<RemindersPanelProps> = ({ getUsersFn }) => {
    const { reminders, fetchReminders, sendReminder, dismissReminder, deleteReminder } = useReminderStore();
    const myUserId = useAuthStore((s) => s.user?.id);

    const [title, setTitle] = useState('');
    const [severity, setSeverity] = useState<ReminderSeverity>('INFO');
    const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchReminders();
    }, []);

    useEffect(() => {
        if (getUsersFn) {
            getUsersFn()
                .then((list) => setUsers(list.filter((u) => u.id !== myUserId)))
                .catch(() => setUsers([]));
        }
    }, [getUsersFn, myUserId]);

    const recipientLabel = useMemo(() => {
        if (selectedIds.length === 0) return 'Kendime';
        if (selectedIds.length === 1) {
            return users.find((u) => u.id === selectedIds[0])?.name ?? '1 kişi';
        }
        return `${selectedIds.length} kişi`;
    }, [selectedIds, users]);

    const toggleRecipient = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleSend = async () => {
        const text = title.trim();
        if (!text || sending) return;
        setSending(true);
        await sendReminder({
            title: text,
            severity,
            recipientIds: selectedIds.length > 0 ? selectedIds : undefined,
        });
        setTitle('');
        setSeverity('INFO');
        setSelectedIds([]);
        setPickerOpen(false);
        setSending(false);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
            {/* Composer — hizli hatirlatma gonder */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        placeholder="Hatırlatma yaz… (örn. Saat 18:00 kasa sayımı)"
                        className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none bg-gray-50 border border-gray-200 rounded-xl focus:border-[#663259] transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!title.trim() || sending}
                        className="flex items-center gap-2 bg-[#663259] text-white hover:bg-[#552a4a] disabled:opacity-40 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap"
                    >
                        <Send size={15} />
                        Gönder
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity secici */}
                    <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        {(['INFO', 'WARNING'] as ReminderSeverity[]).map((sev) => {
                            const sty = severityStyle[sev];
                            const active = severity === sev;
                            return (
                                <button
                                    key={sev}
                                    onClick={() => setSeverity(sev)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        active ? 'bg-white shadow-sm ' + sty.icon : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <sty.Icon size={13} />
                                    {sty.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Alici secici */}
                    {getUsersFn && (
                        <div className="relative">
                            <button
                                onClick={() => setPickerOpen((o) => !o)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 transition-all"
                            >
                                <Bell size={13} />
                                {recipientLabel}
                                <ChevronDown size={13} className={pickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                            {pickerOpen && (
                                <div className="absolute z-20 top-full mt-1 left-0 w-56 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 no-scrollbar">
                                    <button
                                        onClick={() => { setSelectedIds([]); setPickerOpen(false); }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                                    >
                                        Kendime
                                        {selectedIds.length === 0 && <Check size={14} className="text-[#663259]" />}
                                    </button>
                                    {users.map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => toggleRecipient(u.id)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            <span className="truncate">{u.name}</span>
                                            {selectedIds.includes(u.id) && <Check size={14} className="text-[#663259]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hatirlatma listesi — dokun-kapat */}
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar flex flex-col gap-2.5">
                {reminders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3 py-10">
                        <Bell size={40} strokeWidth={1.5} />
                        <p className="text-sm font-bold text-gray-400">Aktif hatırlatma yok</p>
                        <p className="text-xs text-gray-300">Yukarıdan kendine veya bir arkadaşına hatırlatma gönder.</p>
                    </div>
                ) : (
                    reminders.map((r) => {
                        const sty = severityStyle[r.severity] ?? severityStyle.INFO;
                        const isMine = !!myUserId && r.createdBy === myUserId;
                        return (
                            <div
                                key={r.id}
                                className={`group flex items-start gap-3 px-4 py-3 rounded-2xl border ${sty.card} transition-all`}
                            >
                                <div className={`shrink-0 mt-0.5 ${sty.icon}`}>
                                    <sty.Icon size={18} />
                                </div>
                                <button
                                    onClick={() => dismissReminder(r.id)}
                                    className="flex-1 min-w-0 text-left"
                                    title="Kapatmak için tıkla"
                                >
                                    <p className="text-sm font-bold text-gray-800 break-words">{r.title}</p>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-medium">
                                        {r.createdByName && <span>{r.createdByName}</span>}
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {formatWhen(r.createdAt)}
                                        </span>
                                    </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                    {isMine && (
                                        <button
                                            onClick={() => deleteReminder(r.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Sil (herkesten kaldır)"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => dismissReminder(r.id)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white/70 rounded-lg transition-all"
                                        title="Kapat"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default RemindersPanel;
