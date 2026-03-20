import React from 'react';
import HourlyLineChart from './components/HourlyLineChart';
import type { SummaryContentProps } from './types';

/* ─── Zaman farkı hesaplama ─── */
function getTimeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}s önce`;
    return `${diffDays}g önce`;
}

export default function SummaryContent(props: SummaryContentProps) {
    const {
        todayIncome, yesterdayIncome, incomeChange, todayOrderCount,
        totalExpense, totalIncome, tableStats,
        chartData, currentDataIdx, chartChange, storeOpenTime, storeCloseTime,
        recentTodos, todoTagsMap, newTaskTitle, onNewTaskTitleChange, onAddTask,
        onToggleTodoStatus, onNavigateToTodos,
        recentActivities, employees, onNavigateToShifts, onNavigateToSupport,
        isDemo, onLogoutAndRegister,
        favorites, showFavoritesModal, onToggleFavoritesModal, onToggleFavorite, onNavigate,
    } = props;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onAddTask();
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 flex flex-col gap-6">
                {/* Demo Banner */}
                {isDemo && (
                    <div className="relative overflow-hidden rounded-2xl border border-[#663259]/20 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #663259 0%, #8E44AD 50%, #663259 100%)' }}>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                        <div className="relative flex items-center justify-between px-6 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                                    <span className="material-symbols-outlined text-white text-[20px]">science</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Demo Modundasınız</p>
                                    <p className="text-white/70 text-xs">Gerçek verilerinizi oluşturmak için kayıt olun</p>
                                </div>
                            </div>
                            <button
                                onClick={onLogoutAndRegister}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-[#663259] font-bold text-sm hover:bg-white/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-black/10"
                            >
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                Kayıt Ol
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Toplam Satış */}
                    <div className="bg-white p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                        <div className="absolute top-4 right-4 p-2 bg-[#10B981]/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl text-[#10B981]">payments</span>
                        </div>
                        <div className="mb-4">
                            <p className="text-[#6B7280] text-sm font-semibold mb-2">Bugün Satış</p>
                            <h3 className="text-2xl font-bold text-[#1F2937] tracking-tight">
                                {'\u20BA'}{todayIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`${incomeChange >= 0 ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F97171]/10 text-[#F97171]'} px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {incomeChange >= 0 ? 'trending_up' : 'trending_down'}
                                </span>
                                {incomeChange >= 0 ? '+' : ''}{incomeChange}%
                            </div>
                            <span className="text-xs text-gray-400 font-medium">düne göre</span>
                            {todayOrderCount > 0 && (
                                <span className="text-xs text-gray-400 font-medium">{'\u2022'} {todayOrderCount} sipariş</span>
                            )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                            <div className="bg-[#10B981] h-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${Math.min(100, (todayIncome / (yesterdayIncome || 1)) * 75)}%` }}></div>
                        </div>
                    </div>

                    {/* Toplam Gider */}
                    <div className="bg-white p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] group hover:-translate-y-1 transition-transform duration-300 border border-gray-100">
                        <div className="absolute top-4 right-4 p-2 bg-[#F97171]/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl text-[#F97171]">account_balance_wallet</span>
                        </div>
                        <div className="mb-4">
                            <p className="text-[#6B7280] text-sm font-semibold mb-2">Toplam Gider</p>
                            <h3 className="text-2xl font-bold text-[#1F2937] tracking-tight">
                                {'\u20BA'}{totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-[#F97171]/10 text-[#F97171] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">remove_circle</span>
                                Gider
                            </div>
                            <span className="text-xs text-gray-400 font-medium">toplam</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                            <div className="bg-[#F97171] h-1.5 rounded-full shadow-[0_0_10px_rgba(249,113,113,0.4)]" style={{ width: totalIncome > 0 ? `${Math.min(100, (totalExpense / totalIncome) * 100)}%` : '0%' }}></div>
                        </div>
                    </div>

                    {/* Açık Masa */}
                    <div className="bg-white p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] group hover:-translate-y-1 transition-transform duration-300 border border-gray-100">
                        <div className="absolute top-4 right-4 p-2 bg-[#8E44AD]/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl text-[#8E44AD]">table_restaurant</span>
                        </div>
                        <div className="mb-4">
                            <p className="text-[#6B7280] text-sm font-semibold mb-2">Açık Masa</p>
                            <h3 className="text-2xl font-bold text-[#1F2937] tracking-tight">{tableStats.occupied}<span className="text-lg text-gray-400 font-normal">/{tableStats.total}</span></h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-[#8E44AD]/10 text-[#8E44AD] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">table_restaurant</span>
                                {tableStats.total - tableStats.occupied}
                            </div>
                            <span className="text-xs text-gray-400 font-medium">boş masa</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                            <div className="bg-[#8E44AD] h-1.5 rounded-full shadow-[0_0_10px_rgba(142,68,173,0.4)]" style={{ width: `${tableStats.total > 0 ? (tableStats.occupied / tableStats.total) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    {/* Toplam Misafir */}
                    <div className="bg-white p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] group hover:-translate-y-1 transition-transform duration-300 border border-gray-100">
                        <div className="absolute top-4 right-4 p-2 bg-[#F59E0B]/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl text-[#F59E0B]">groups</span>
                        </div>
                        <div className="mb-4">
                            <p className="text-[#6B7280] text-sm font-semibold mb-2">Toplam Misafir</p>
                            <h3 className="text-2xl font-bold text-[#1F2937] tracking-tight">{tableStats.guests}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-[#8E44AD]/10 text-[#8E44AD] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">table_restaurant</span>
                                {tableStats.occupied}
                            </div>
                            <span className="text-xs text-gray-400 font-medium">aktif masa</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                            <div className="bg-[#F59E0B] h-1.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)]" style={{ width: `${Math.min(100, (tableStats.guests / Math.max(tableStats.total * 4, 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Üst Bölüm: Canlı Ciro ve Görevlerim */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Canlı Ciro */}
                    <div className="bg-white rounded-2xl p-4 flex flex-col shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 xl:col-span-2">
                        {/* Başlık + Saat aralığı */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-[#1F2937] leading-tight">Canlı Ciro</h3>
                                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Bugün için gerçek zamanlı gelir takibi</p>
                            </div>
                            {/* Açılış-kapanış saati */}
                            <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                                <span className="material-symbols-outlined text-[13px] text-gray-400">schedule</span>
                                <span className="text-[11px] font-semibold text-gray-500">{storeOpenTime}</span>
                                <span className="text-gray-300 text-[11px]">{'\u2014'}</span>
                                <span className="text-[11px] font-semibold text-gray-500">{storeCloseTime}</span>
                                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                        </div>

                        {/* Toplam ciro */}
                        <div className="mb-3 flex items-baseline gap-2.5">
                            <span className="text-2xl font-bold tracking-tight text-[#663259]">
                                {'\u20BA'}{todayIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            {chartChange !== 0 && (
                                <span className={`${chartChange >= 0 ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#F97171] bg-[#F97171]/10'} text-[11px] font-bold px-1.5 py-0.5 rounded-md`}>
                                    {chartChange >= 0 ? '+' : ''}{chartChange}% dün
                                </span>
                            )}
                            {todayOrderCount > 0 && (
                                <span className="text-[11px] text-gray-400 font-medium">{todayOrderCount} sipariş</span>
                            )}
                        </div>

                        {/* SVG Line Chart */}
                        <div className="relative flex-1 w-full min-h-[158px]">
                            {chartData.length > 0 && chartData.some(d => d.amount > 0) ? (
                                <HourlyLineChart data={chartData} currentDataIdx={currentDataIdx} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-300">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-3xl mb-1">show_chart</span>
                                        <p className="text-xs font-medium">Henüz veri yok</p>
                                        <p className="text-[11px] mt-1 text-gray-300">Gün içinde siparişler geldikçe grafik oluşacak</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Görevlerim */}
                    <div className="bg-white rounded-2xl p-4 flex flex-col shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 shrink-0 min-h-[40px] gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#663259]/10 to-[#8E44AD]/10 flex items-center justify-center text-[#663259]">
                                    <span className="material-symbols-outlined text-[17px]">task_alt</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] leading-tight">Görevlerim</h3>
                                    <p className="text-[11px] text-gray-500 leading-tight">Hızlı görev yönetimi</p>
                                </div>
                            </div>
                            <button
                                onClick={onNavigateToTodos}
                                className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-[#663259] to-[#8E44AD] text-white rounded-lg hover:shadow-lg transition-all text-[11px] font-bold shrink-0"
                            >
                                <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                                Tüm Görevler
                            </button>
                        </div>

                        {/* Hızlı Görev Ekleme */}
                        <div className="mb-2.5 flex gap-1.5">
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => onNewTaskTitleChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Hızlı görev ekle..."
                                className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all"
                            />
                            <button
                                onClick={onAddTask}
                                disabled={!newTaskTitle.trim()}
                                className="px-3 py-1.5 bg-[#663259] text-white rounded-lg hover:shadow-lg hover:shadow-[#663259]/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all flex items-center gap-1 font-bold shadow-sm text-xs"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Ekle
                            </button>
                        </div>

                        {/* Görev Listesi */}
                        <div className="flex-1 overflow-y-auto -mr-3 pr-3 custom-scrollbar">
                            <div className="flex flex-col divide-y divide-gray-100">
                                {recentTodos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                        <span className="material-symbols-outlined text-[40px] mb-2">task</span>
                                        <p className="text-sm font-medium text-gray-400">Henüz görev yok</p>
                                        <p className="text-xs text-gray-400 mt-1">Yukarıdan hızlıca ekleyebilirsiniz</p>
                                    </div>
                                ) : (
                                    recentTodos.map((todo) => (
                                        <div
                                            key={todo.id}
                                            className="group flex items-center gap-3 py-3 px-1 cursor-pointer transition-colors hover:bg-gray-50/60 rounded-lg"
                                            onClick={onNavigateToTodos}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleTodoStatus(todo.id, todo.status);
                                                }}
                                                className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0 ${todo.status === 'done'
                                                    ? 'bg-[#10B981] border-[#10B981]'
                                                    : 'border-gray-300 group-hover:border-[#663259]/50'
                                                    }`}
                                            >
                                                {todo.status === 'done' && (
                                                    <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={`text-[13px] font-medium truncate transition-all ${todo.status === 'done'
                                                        ? 'text-gray-400 line-through'
                                                        : 'text-gray-700 group-hover:text-gray-900'
                                                        }`}
                                                >
                                                    {todo.title}
                                                </p>
                                                {/* Öncelik + Etiket badgeleri */}
                                                {(todo.priority && todo.priority !== 'normal' || (todoTagsMap[todo.id] ?? []).length > 0) && (
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                        {todo.priority === 'urgent' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">Acil</span>
                                                        )}
                                                        {todo.priority === 'high' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600">Yüksek</span>
                                                        )}
                                                        {todo.priority === 'low' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600">Düşük</span>
                                                        )}
                                                        {(todoTagsMap[todo.id] ?? []).slice(0, 3).map(tag => (
                                                            <span
                                                                key={tag.id}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                                                style={{ backgroundColor: tag.color + '22', color: tag.color }}
                                                            >
                                                                {tag.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Öncelik noktası */}
                                                {todo.priority === 'urgent' && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Acil" />
                                                )}
                                                {todo.priority === 'high' && (
                                                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Yüksek" />
                                                )}
                                                {/* Etiket renk noktaları */}
                                                {(todoTagsMap[todo.id] ?? []).slice(0, 2).map(tag => (
                                                    <span key={tag.id} className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: tag.color }} title={tag.name} />
                                                ))}
                                                {todo.status === 'in_progress' && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="İşlemde" />
                                                )}
                                                {todo.due_date && (
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${new Date(todo.due_date) < new Date() ? 'bg-red-50 text-red-500' : 'text-gray-400'}`}>
                                                        {new Date(todo.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alt Bölüm: Son İşlemler ve Vardiyalı Personeller */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Son İşlemler */}
                    <div className="bg-white rounded-2xl p-4 flex flex-col shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 h-[302px]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 shrink-0 min-h-[40px] gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center text-green-600">
                                    <span className="material-symbols-outlined text-[17px]">receipt_long</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] leading-tight">Son İşlemler</h3>
                                    <p className="text-[11px] text-gray-500 leading-tight">En son yapılan işlemler</p>
                                </div>
                            </div>
                            <button className="text-[11px] text-[#F97171] hover:text-[#E05A5A] font-bold bg-[#F97171]/5 px-2.5 py-1 rounded-md transition-colors shrink-0">
                                Tümü
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-3 pr-3 custom-scrollbar">
                            <div className="flex flex-col gap-1.5">
                                {recentActivities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300 py-6">
                                        <span className="material-symbols-outlined text-[36px]">receipt_long</span>
                                        <p className="text-xs font-medium">Henüz işlem yok</p>
                                    </div>
                                ) : (
                                    recentActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100"
                                        >
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[16px]">payments</span>
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
                                                    <div className="bg-[#10B981] rounded-full p-0.5">
                                                        <span className="material-symbols-outlined text-[9px] text-white block">check</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[#1F2937] truncate">{activity.title}</p>
                                                <p className="text-[11px] text-gray-500 truncate">{activity.description}</p>
                                            </div>
                                            <div className="text-right">
                                                {activity.amount && (
                                                    <p className="text-xs font-bold text-[#1F2937]">
                                                        {'\u20BA'}{activity.amount.toLocaleString('tr-TR')}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {getTimeAgo(activity.date)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vardiyalı Personeller */}
                    <div className="bg-white rounded-2xl p-4 flex flex-col shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 h-[302px]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 shrink-0 min-h-[40px] gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center text-purple-600">
                                    <span className="material-symbols-outlined text-[17px]">groups</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] leading-tight">Vardiyalı Personeller</h3>
                                    <p className="text-[11px] text-gray-500 leading-tight">Bugün çalışanlar ve durumları</p>
                                </div>
                            </div>
                            <button
                                onClick={onNavigateToShifts}
                                className="text-[11px] text-[#663259] hover:text-[#8E44AD] font-bold bg-[#663259]/5 px-2.5 py-1 rounded-md transition-colors shrink-0"
                            >
                                Vardiya
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-3 pr-3 custom-scrollbar">
                            <div className="flex flex-col gap-1.5">
                                {employees.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300 py-6">
                                        <span className="material-symbols-outlined text-[36px]">groups</span>
                                        <p className="text-xs font-medium">Henüz personel eklenmedi</p>
                                    </div>
                                ) : (
                                    employees.map((emp) => {
                                        const initials = emp.name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                                        const isActive = emp.status === 'active';
                                        const isLeave = emp.status === 'on_leave';
                                        const dotColor = isActive ? 'bg-green-500' : isLeave ? 'bg-yellow-500' : 'bg-gray-400';
                                        const badgeBg = isActive ? 'bg-green-100 text-green-700' : isLeave ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
                                        const badgeText = isActive ? 'Çalışıyor' : isLeave ? 'İzinli' : 'Ayrıldı';
                                        return (
                                            <div key={emp.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#663259] to-[#8E44AD] flex items-center justify-center text-white font-bold text-[11px] shadow-md">
                                                        {initials}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                                                        <div className={`w-2 h-2 rounded-full ${dotColor} border-2 border-white`}></div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-[#1F2937] truncate">{emp.name}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{emp.department} {'\u00B7'} {emp.shift}</p>
                                                </div>
                                                <div className="shrink-0">
                                                    <span className={`px-1.5 py-0.5 ${badgeBg} text-[10px] font-bold rounded`}>
                                                        {badgeText}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-white p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer border border-gray-100 group">
                        <div className="p-3 bg-[#10B981]/10 rounded-xl text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">point_of_sale</span>
                        </div>
                        <div>
                            <h4 className="text-[#1F2937] font-bold text-sm">Z-Raporu</h4>
                            <p className="text-gray-400 text-xs font-medium">Gün sonu raporu al</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer border border-gray-100 group">
                        <div className="p-3 bg-[#8E44AD]/10 rounded-xl text-[#8E44AD] group-hover:bg-[#8E44AD] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">lightbulb</span>
                        </div>
                        <div>
                            <h4 className="text-[#1F2937] font-bold text-sm">Geliştirme Talepleri</h4>
                            <p className="text-gray-400 text-xs font-medium">Öneri ve talep gönder</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer border border-gray-100 group">
                        <div className="p-3 bg-[#F97171]/10 rounded-xl text-[#F97171] group-hover:bg-[#F97171] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">psychology</span>
                        </div>
                        <div>
                            <h4 className="text-[#1F2937] font-bold text-sm">AI Asistan</h4>
                            <p className="text-gray-400 text-xs font-medium">Yapay zeka destekli yardım</p>
                        </div>
                    </div>
                    <div
                        onClick={onNavigateToSupport}
                        className="bg-white p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer border border-gray-100 group"
                    >
                        <div className="p-3 bg-[#F59E0B]/10 rounded-xl text-[#F59E0B] group-hover:bg-[#F59E0B] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">support_agent</span>
                        </div>
                        <div>
                            <h4 className="text-[#1F2937] font-bold text-sm">Destek Sistemi</h4>
                            <p className="text-gray-400 text-xs font-medium">Datha Ekibi ile iletişime geç</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Favoriler Modal */}
            {showFavoritesModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => onToggleFavoritesModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-orange-100 flex items-center justify-center text-orange-400">
                                    <span className="material-symbols-outlined text-[24px]">star</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Sık Kullanılanlar</h3>
                                    <p className="text-sm text-gray-500">Hızlı erişim için kayıtlı sayfalar</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onToggleFavoritesModal(false)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {favorites.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                    <span className="material-symbols-outlined text-[64px] mb-3">star_outline</span>
                                    <p className="text-lg font-medium text-gray-400">Henüz favori eklenmemiş</p>
                                    <p className="text-sm text-gray-400 mt-1">Sayfa başlıklarının yanındaki yıldız butonunu kullanarak ekleyebilirsiniz</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {favorites.map((fav) => (
                                        <div
                                            key={fav.path}
                                            className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-[#663259] transition-all cursor-pointer"
                                            onClick={() => {
                                                onNavigate(fav.path);
                                                onToggleFavoritesModal(false);
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#663259]/10 border border-[#663259]/20 flex items-center justify-center text-[#663259] shrink-0">
                                                    <span className="material-symbols-outlined text-[20px]">{fav.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate group-hover:text-[#663259] transition-colors">{fav.label}</h4>
                                                    <p className="text-xs text-gray-400 truncate mt-0.5">{fav.path}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleFavorite(fav);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                                                    title="Favorilerden çıkar"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
