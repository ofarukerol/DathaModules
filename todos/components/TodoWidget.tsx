import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../store';

interface TodoWidgetProps {
    onNavigate?: () => void;
}

const TodoWidget: React.FC<TodoWidgetProps> = ({ onNavigate }) => {
    const { todos, fetchTodos, updateStatus, addTodo } = useTodoStore();
    const [isLoading, setIsLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');

    useEffect(() => {
        fetchTodos().then(() => setIsLoading(false));
    }, []);

    // Filter incomplete tasks and take top 5
    const pendingTodos = todos
        .filter(t => t.status !== 'done')
        .slice(0, 5);

    const totalPending = todos.filter(t => t.status !== 'done').length;

    const handleToggle = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';
        updateStatus(id, newStatus as any);
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTitle.trim()) return;

        await addTodo({
            title: quickTitle.trim(),
            description: '',
            assignee: '',
            status: 'todo',
        });

        setQuickTitle('');
        setShowQuickAdd(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const priorityColors: Record<string, string> = {
        urgent: 'border-l-red-500',
        high: 'border-l-orange-400',
        normal: 'border-l-transparent',
        low: 'border-l-blue-400',
    };

    return (
        <div className="bg-white rounded-2xl p-6 flex flex-col h-full shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 min-h-[420px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#1F2937]">Yapılacaklar</h3>
                    {totalPending > 0 && (
                        <span className="bg-[#F97171]/10 text-[#F97171] text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {totalPending}
                        </span>
                    )}
                </div>
                {onNavigate && (
                    <button
                        onClick={onNavigate}
                        className="text-xs text-[#F97171] hover:text-[#E05A5A] font-bold bg-[#F97171]/5 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                        Genişlet
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {isLoading ? (
                    <div className="text-center py-4 text-gray-400">Yükleniyor...</div>
                ) : pendingTodos.length > 0 ? (
                    pendingTodos.map((todo) => (
                        <div
                            key={todo.id}
                            className={`flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100 border-l-2 ${priorityColors[todo.priority || 'normal']}`}
                            onClick={onNavigate}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggle(todo.id, todo.status);
                                }}
                                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${todo.status === 'done'
                                    ? 'bg-[#10B981] border-[#10B981]'
                                    : 'border-gray-300 hover:border-[#F97171]'
                                    }`}
                            >
                                {todo.status === 'done' && (
                                    <span className="material-symbols-outlined text-[14px] text-white">check</span>
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold text-[#1F2937] truncate ${todo.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                    {todo.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {todo.assignee && (
                                        <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-medium">
                                            <span className="material-symbols-outlined text-[12px] text-gray-400">person</span>
                                            {todo.assignee}
                                        </div>
                                    )}
                                    {todo.due_date && (
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${new Date(todo.due_date) < new Date()
                                            ? 'bg-red-50 text-red-500'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <span className="material-symbols-outlined text-[12px]">event</span>
                                            {formatDate(todo.due_date)}
                                        </div>
                                    )}
                                    {todo.priority && todo.priority !== 'normal' && (
                                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${todo.priority === 'urgent' ? 'bg-red-100 text-red-600'
                                            : todo.priority === 'high' ? 'bg-orange-100 text-orange-600'
                                                : 'bg-blue-100 text-blue-500'
                                            }`}>
                                            {todo.priority === 'urgent' ? 'Acil' : todo.priority === 'high' ? 'Yüksek' : 'Düşük'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-3 justify-center h-full">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-300">check_circle</span>
                        </div>
                        <p className="font-medium">Tüm işler tamamlandı!</p>
                        <p className="text-xs text-gray-400">Yeni bir görev eklemek için butonu kullanın.</p>
                    </div>
                )}

                {totalPending > 5 && onNavigate && (
                    <button
                        onClick={onNavigate}
                        className="text-xs text-gray-400 hover:text-[#F97171] font-medium py-2 transition-colors"
                    >
                        +{totalPending - 5} görev daha...
                    </button>
                )}
            </div>

            {showQuickAdd ? (
                <form onSubmit={handleQuickAdd} className="mt-3 flex gap-2">
                    <input
                        type="text"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#F97171] focus:ring-2 focus:ring-[#F97171]/20 outline-none transition-all text-sm"
                        placeholder="Görev başlığı..."
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setShowQuickAdd(false);
                                setQuickTitle('');
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!quickTitle.trim()}
                        className="px-3 py-2 rounded-xl bg-[#F97171] text-white font-bold text-sm hover:bg-[#E05A5A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowQuickAdd(false); setQuickTitle(''); }}
                        className="px-2 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </form>
            ) : (
                <button
                    onClick={() => setShowQuickAdd(true)}
                    className="mt-3 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-[#F97171] hover:bg-[#F97171]/5 rounded-xl transition-all border border-dashed border-gray-200 hover:border-[#F97171]/30 hover:shadow-sm"
                >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Hızlı Görev Ekle
                </button>
            )}
        </div>
    );
};

export default TodoWidget;
