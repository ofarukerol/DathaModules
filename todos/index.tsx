import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTodoStore } from './store';
import { todoService } from './service';
import { Todo, Tag } from './types';
import AddTodoModal from './components/AddTodoModal';
import EditTodoModal from './components/EditTodoModal';
import { useToastStore } from './toastStore';
import {
    Search,
    Plus,
    MoreHorizontal,
    MessageSquare,
    Paperclip,
    Clock,
    Trash2,
    Edit2,
    CheckCircle2,
    AlertTriangle,
    CalendarDays,
    User,
    LayoutGrid,
    List,
    GripVertical
} from 'lucide-react';

type ViewMode = 'kanban' | 'list';
type TabFilter = 'all' | 'todo' | 'in_progress' | 'done';
type ColumnStatus = 'todo' | 'in_progress' | 'done';

const columnConfig: Record<string, { label: string; dotColor: string }> = {
    todo: { label: 'Yapılacaklar', dotColor: 'bg-gray-400' },
    in_progress: { label: 'Devam Edenler', dotColor: 'bg-amber-400' },
    done: { label: 'Tamamlananlar', dotColor: 'bg-emerald-400' },
};

const listTabs: { id: TabFilter; label: string; activeColor: string }[] = [
    { id: 'all', label: 'Tümü', activeColor: 'bg-[#663259] text-white' },
    { id: 'todo', label: 'Yapılacak', activeColor: 'bg-gray-700 text-white' },
    { id: 'in_progress', label: 'Devam Eden', activeColor: 'bg-amber-500 text-white' },
    { id: 'done', label: 'Tamamlanan', activeColor: 'bg-emerald-500 text-white' },
];

const DRAG_THRESHOLD = 5; // px before drag starts

interface TodoBoardProps {
    currentUserName?: string;
    getUsersFn?: () => Promise<{ id: string; name: string; role: string }[]>;
}

const TodoBoard: React.FC<TodoBoardProps> = ({ currentUserName, getUsersFn }) => {
    const { todos, fetchTodos, updateStatus, deleteTodo } = useTodoStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('kanban');

    // Custom drag state
    const [draggedTask, setDraggedTask] = useState<Todo | null>(null);
    const [hoverColumn, setHoverColumn] = useState<ColumnStatus | null>(null);
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

    const dragStartPos = useRef({ x: 0, y: 0 });
    const pendingDragId = useRef<string | null>(null);
    const isDragging = useRef(false);
    const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Tags per todo
    const [todoTagsMap, setTodoTagsMap] = useState<Record<string, Tag[]>>({});

    // List states
    const [activeTab, setActiveTab] = useState<TabFilter>('all');

    const loadTodoTags = async (todoList: Todo[]) => {
        const map: Record<string, Tag[]> = {};
        await Promise.all(todoList.map(async (t) => {
            map[t.id] = await todoService.getTagsForTodo(t.id);
        }));
        setTodoTagsMap(map);
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    useEffect(() => {
        if (todos.length > 0) {
            loadTodoTags(todos);
        }
    }, [todos]);

    // --- Mouse-based drag & drop ---

    const handleMouseDown = useCallback((e: React.MouseEvent, task: Todo) => {
        // Ignore if clicking buttons
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        pendingDragId.current = task.id;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!pendingDragId.current && !isDragging.current) return;

            // Start drag after threshold
            if (pendingDragId.current && !isDragging.current) {
                const dx = Math.abs(e.clientX - dragStartPos.current.x);
                const dy = Math.abs(e.clientY - dragStartPos.current.y);
                if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

                const task = todos.find(t => t.id === pendingDragId.current);
                if (!task) return;
                isDragging.current = true;
                setDraggedTask(task);
            }

            if (isDragging.current) {
                setGhostPos({ x: e.clientX, y: e.clientY });

                // Detect which column the mouse is over
                let found: ColumnStatus | null = null;
                for (const [colId, ref] of Object.entries(columnRefs.current)) {
                    if (ref) {
                        const rect = ref.getBoundingClientRect();
                        if (e.clientX >= rect.left && e.clientX <= rect.right &&
                            e.clientY >= rect.top && e.clientY <= rect.bottom) {
                            found = colId as ColumnStatus;
                            break;
                        }
                    }
                }
                setHoverColumn(found);
            }
        };

        const handleMouseUp = () => {
            if (isDragging.current && draggedTask && hoverColumn) {
                if (draggedTask.status !== hoverColumn) {
                    updateStatus(draggedTask.id, hoverColumn);
                }
            }

            pendingDragId.current = null;
            isDragging.current = false;
            setDraggedTask(null);
            setHoverColumn(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [todos, draggedTask, hoverColumn, updateStatus]);

    const handleCardClick = useCallback((task: Todo) => {
        // Only open if we didn't just drag
        if (!isDragging.current) {
            setEditingTodo(task);
        }
    }, []);

    // --- Shared helpers ---

    const searchFiltered = todos.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const counts = {
        all: todos.length,
        todo: todos.filter(t => t.status === 'todo').length,
        in_progress: todos.filter(t => t.status === 'in_progress').length,
        done: todos.filter(t => t.status === 'done').length,
    };

    const formatDate = (dateUnparsed?: string) => {
        if (!dateUnparsed) return null;
        const d = new Date(dateUnparsed);
        const now = new Date();
        const diff = d.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Bugün';
        if (days === 1) return 'Yarın';
        if (days < 0) return `${Math.abs(days)} gün önce`;
        if (days <= 7) return `${days} gün kaldı`;
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const isOverdue = (task: Todo) => {
        if (!task.due_date || task.status === 'done') return false;
        return new Date(task.due_date) < new Date();
    };

    // --- Kanban helpers ---

    const getColumnTasks = (status: string) => {
        const filtered = searchFiltered.filter((t) => t.status === status);
        return filtered.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
        });
    };

    // --- List helpers ---

    const listFiltered = searchFiltered.filter(t => activeTab === 'all' || t.status === activeTab);

    const sortedListTodos = [...listFiltered].sort((a, b) => {
        const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, done: 2 };
        const statusDiff = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
        if (statusDiff !== 0) return statusDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
    });

    const handleToggle = (task: Todo) => {
        updateStatus(task.id, task.status === 'done' ? 'todo' : 'done');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress': return { label: 'Devam Ediyor', className: 'bg-amber-50 text-amber-600 border-amber-200' };
            case 'done': return { label: 'Tamamlandı', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
            default: return { label: 'Yapılacak', className: 'bg-gray-50 text-gray-500 border-gray-200' };
        }
    };

    // --- Render ---

    return (
        <div className="h-full flex flex-col bg-[#F8F9FB] p-6 lg:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Görev ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#663259]/20 focus:border-[#663259]/30 transition-all"
                        />
                    </div>

                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'kanban' ? 'bg-[#663259] text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <LayoutGrid size={14} />
                            Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'list' ? 'bg-[#663259] text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <List size={14} />
                            Liste
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-[#663259] hover:bg-[#4A233C] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#663259]/20 transition-all transform active:scale-95 text-sm whitespace-nowrap"
                >
                    <Plus size={18} />
                    Yeni Görev
                </button>
            </div>

            {/* List view tab filter */}
            {viewMode === 'list' && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                        {listTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === tab.id ? tab.activeColor : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 text-[10px] ${activeTab === tab.id ? 'opacity-80' : 'text-gray-400'}`}>
                                    {counts[tab.id]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ========== KANBAN VIEW ========== */}
            {viewMode === 'kanban' && (
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {(['todo', 'in_progress', 'done'] as const).map((colId) => {
                        const col = columnConfig[colId];
                        const tasks = getColumnTasks(colId);
                        const isDropTarget = draggedTask && hoverColumn === colId && draggedTask.status !== colId;

                        return (
                            <div
                                key={colId}
                                ref={(el) => { columnRefs.current[colId] = el; }}
                                className={`flex flex-col min-w-[340px] w-1/3 h-full max-h-full rounded-2xl p-3 border-2 transition-all duration-200 ${
                                    isDropTarget
                                        ? 'bg-[#663259]/5 border-dashed border-[#663259]/30'
                                        : 'border-transparent'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-5 px-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3.5 h-3.5 rounded-full ${col.dotColor} shadow-sm`} />
                                        <h3 className="font-bold text-[#1F2937] text-lg">{col.label}</h3>
                                        <span className="bg-gray-200 text-gray-600 text-xs font-black px-2 py-0.5 rounded-md min-w-[20px] text-center">
                                            {tasks.length}
                                        </span>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
                                    {tasks.map((task) => {
                                        const isBeingDragged = draggedTask?.id === task.id;

                                        return (
                                            <div
                                                key={task.id}
                                                onMouseDown={(e) => handleMouseDown(e, task)}
                                                onClick={() => handleCardClick(task)}
                                                className={`bg-white p-5 rounded-[24px] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.06)] border border-gray-100/50 hover:shadow-xl hover:translate-y-[-2px] transition-all group relative select-none ${
                                                    isBeingDragged ? 'opacity-30 scale-95 pointer-events-none' : 'cursor-pointer'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(todoTagsMap[task.id] || []).map(tag => (
                                                            <span key={tag.id} className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wider ${tag.color}`}>
                                                                {tag.name}
                                                            </span>
                                                        ))}
                                                        {(!todoTagsMap[task.id] || todoTagsMap[task.id].length === 0) && (
                                                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wider bg-gray-100 text-gray-400">
                                                                Etiketsiz
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingTodo(task); }} className="p-1.5 text-gray-400 hover:text-[#F97171] bg-gray-50 rounded-lg">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteTodo(task.id); }} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <h4 className={`text-[15px] font-bold text-[#1F2937] leading-tight mb-2 pr-2 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                                    {task.title}
                                                </h4>
                                                {task.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed">{task.description}</p>
                                                )}

                                                {/* Progress Bar */}
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mb-1">
                                                        <span>İlerleme</span>
                                                        <span>{task.status === 'done' ? '100%' : task.status === 'in_progress' ? '45%' : '0%'}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${task.status === 'done' ? 'bg-[#10B981]' : task.status === 'in_progress' ? 'bg-[#F97171]' : 'bg-gray-300'}`}
                                                            style={{ width: task.status === 'done' ? '100%' : task.status === 'in_progress' ? '45%' : '0%' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px]">
                                                            <MessageSquare size={13} />
                                                            <span>3</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px]">
                                                            <Paperclip size={13} />
                                                            <span>1</span>
                                                        </div>
                                                        {task.due_date && (
                                                            <div className={`flex items-center gap-1 font-bold text-[10px] ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>
                                                                <Clock size={13} />
                                                                <span>{formatDate(task.due_date)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex -space-x-2">
                                                        <img
                                                            src={`https://i.pravatar.cc/100?u=${task.assignee || task.id}`}
                                                            alt="User"
                                                            className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm bg-gray-100"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Drop hint when dragging over empty area */}
                                    {isDropTarget && (
                                        <div className="flex items-center justify-center py-6 border-2 border-dashed border-[#663259]/30 rounded-3xl text-[#663259]/50 text-sm font-bold animate-pulse">
                                            Buraya bırak
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:text-[#F97171] hover:border-[#F97171]/30 hover:bg-white transition-all group"
                                    >
                                        <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-bold">Görev Ekle</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ghost card while dragging */}
            {draggedTask && (
                <div
                    className="fixed pointer-events-none z-[9999]"
                    style={{
                        left: ghostPos.x - 160,
                        top: ghostPos.y - 30,
                    }}
                >
                    <div className="w-[320px] bg-white p-4 rounded-[20px] shadow-2xl border-2 border-[#663259]/20 opacity-90 rotate-2">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <GripVertical size={14} className="text-[#663259]" />
                            {(todoTagsMap[draggedTask.id] || []).map(tag => (
                                <span key={tag.id} className={`px-2 py-0.5 rounded-md text-[9px] font-black ${tag.color}`}>
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                        <h4 className="text-sm font-bold text-[#1F2937] truncate">{draggedTask.title}</h4>
                        {draggedTask.description && (
                            <p className="text-[11px] text-gray-400 truncate mt-1">{draggedTask.description}</p>
                        )}
                    </div>
                </div>
            )}

            {/* ========== LIST VIEW ========== */}
            {viewMode === 'list' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-[40px_1fr_120px_auto_100px_80px] gap-3 px-5 py-3 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <div></div>
                            <div>Görev</div>
                            <div>Durum</div>
                            <div>Etiketler</div>
                            <div>Tarih</div>
                            <div></div>
                        </div>

                        {sortedListTodos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <CheckCircle2 size={48} className="mb-4 text-gray-200" />
                                <p className="text-sm font-bold">
                                    {searchTerm ? 'Aramanızla eşleşen görev bulunamadı' : 'Henüz görev eklenmemiş'}
                                </p>
                                {!searchTerm && (
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="mt-3 text-sm font-bold text-[#663259] hover:underline"
                                    >
                                        İlk görevinizi ekleyin
                                    </button>
                                )}
                            </div>
                        ) : (
                            sortedListTodos.map((task) => {
                                const statusBadge = getStatusBadge(task.status);
                                const overdue = isOverdue(task);
                                const isDone = task.status === 'done';
                                const taskTags = todoTagsMap[task.id] || [];

                                return (
                                    <div
                                        key={task.id}
                                        className={`grid grid-cols-[40px_1fr_120px_auto_100px_80px] gap-3 px-5 py-3.5 border-b border-gray-50 items-center group hover:bg-gray-50/50 transition-colors ${isDone ? 'opacity-60' : ''}`}
                                    >
                                        <div>
                                            <button
                                                onClick={() => handleToggle(task)}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isDone
                                                        ? 'border-emerald-400 bg-emerald-400 text-white'
                                                        : 'border-gray-300 hover:border-[#663259] text-transparent hover:text-[#663259]/30'
                                                }`}
                                            >
                                                {isDone && <CheckCircle2 size={14} />}
                                            </button>
                                        </div>

                                        <div className="min-w-0 cursor-pointer" onClick={() => setEditingTodo(task)}>
                                            <p className={`text-sm font-bold text-[#1F2937] truncate ${isDone ? 'line-through text-gray-400' : ''}`}>
                                                {task.title}
                                            </p>
                                            {task.description && (
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                                            )}
                                            {task.assignee && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <User size={10} className="text-gray-300" />
                                                    <span className="text-[10px] text-gray-400 font-medium">{task.assignee}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusBadge.className}`}>
                                                {statusBadge.label}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {taskTags.length > 0 ? taskTags.map(tag => (
                                                <span key={tag.id} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${tag.color}`}>
                                                    {tag.name}
                                                </span>
                                            )) : (
                                                <span className="text-[10px] text-gray-300">&mdash;</span>
                                            )}
                                        </div>

                                        <div>
                                            {task.due_date ? (
                                                <div className={`flex items-center gap-1 text-[11px] font-bold ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {overdue ? <AlertTriangle size={12} /> : <CalendarDays size={12} />}
                                                    <span>{formatDate(task.due_date)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-gray-300">&mdash;</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <button
                                                onClick={() => setEditingTodo(task)}
                                                className="p-1.5 text-gray-400 hover:text-[#663259] hover:bg-[#663259]/5 rounded-lg transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => deleteTodo(task.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <AddTodoModal
                    isOpen={isAddModalOpen}
                    onClose={() => { setIsAddModalOpen(false); loadTodoTags(todos); }}
                    getUsersFn={getUsersFn}
                />
            )}

            {editingTodo && (
                <EditTodoModal
                    isOpen={!!editingTodo}
                    onClose={() => { setEditingTodo(null); loadTodoTags(todos); }}
                    todo={editingTodo}
                    currentUserName={currentUserName}
                    getUsersFn={getUsersFn}
                />
            )}
        </div>
    );
};

export default TodoBoard;
