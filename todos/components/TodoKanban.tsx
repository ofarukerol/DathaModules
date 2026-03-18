import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTodoStore } from '../store';
import { Todo, Tag } from '../types';
import { todoService } from '../service';
import AddTodoModal from './AddTodoModal';
import EditTodoModal from './EditTodoModal';
import { uuidv7 } from '../../../utils/uuid';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';

type ViewMode = 'kanban' | 'list' | 'calendar';
type CalendarSubView = 'daily' | 'weekly';

const priorityFilterOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'urgent', label: 'Acil' },
    { value: 'high', label: 'Yüksek Öncelik' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Düşük Öncelik' },
];

interface TodoKanbanProps {
    currentUserName?: string;
    getUsersFn?: () => Promise<{ id: string; name: string; role: string }[]>;
}

const TodoKanban: React.FC<TodoKanbanProps> = ({ currentUserName, getUsersFn }) => {
    const { todos, fetchTodos, updateStatus, addTodo, deleteTodo } = useTodoStore();
    const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('kanban');
    const [activeId, setActiveId] = useState<string | null>(null);
    const [listFilter, setListFilter] = useState('all');
    const [calendarSubView, setCalendarSubView] = useState<CalendarSubView>('daily');
    const [weekOffset, setWeekOffset] = useState(0);
    const justDraggedRef = useRef(false);

    // Label management
    const [showLabelManager, setShowLabelManager] = useState(false);
    const [tags, setTags] = useState<Tag[]>([]);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingColor, setEditingColor] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#663259');

    useEffect(() => {
        if (showLabelManager) {
            todoService.getTags().then(setTags);
        }
    }, [showLabelManager]);

    const handleAddTag = async () => {
        if (!newTagName.trim()) return;
        const tag: Tag = { id: uuidv7(), name: newTagName.trim(), color: newTagColor };
        await todoService.addTag(tag);
        setTags(prev => [...prev, tag]);
        setNewTagName('');
        setNewTagColor('#663259');
    };

    const handleSaveEdit = async (id: string) => {
        const tag = tags.find(t => t.id === id);
        if (!tag) return;
        const updated = { ...tag, name: editingName, color: editingColor };
        await todoService.updateTag(updated);
        setTags(prev => prev.map(t => t.id === id ? updated : t));
        setEditingTagId(null);
    };

    const handleDeleteTag = async (id: string) => {
        await todoService.deleteTag(id);
        setTags(prev => prev.filter(t => t.id !== id));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    // Keep selectedTodo in sync with store
    useEffect(() => {
        if (selectedTodo) {
            const updated = todos.find((t) => t.id === selectedTodo.id);
            if (updated && (updated.status !== selectedTodo.status || updated.title !== selectedTodo.title || updated.priority !== selectedTodo.priority || updated.assignee !== selectedTodo.assignee || updated.due_date !== selectedTodo.due_date)) {
                setSelectedTodo(updated);
            }
        }
    }, [todos]);

    const todoTodos = todos.filter((t) => t.status === 'todo');
    const inProgressTodos = todos.filter((t) => t.status === 'in_progress');
    const doneTodos = todos.filter((t) => t.status === 'done');

    const filteredTodos = useMemo(() => {
        if (listFilter === 'all') return todos;
        return todos.filter((t) => t.priority === listFilter);
    }, [todos, listFilter]);

    // Weekly view helpers
    const weekDays = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
        monday.setHours(0, 0, 0, 0);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }, [weekOffset]);

    const getWeekLabel = () => {
        if (!weekDays.length) return '';
        const start = weekDays[0];
        const end = weekDays[6];
        const sameMonth = start.getMonth() === end.getMonth();
        if (sameMonth) {
            return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
        }
        return `${start.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}`;
    };

    const todosForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return todos.filter((t) => {
            if (!t.due_date) return false;
            const todoDate = new Date(t.due_date).toISOString().split('T')[0];
            return todoDate === dateStr;
        });
    };

    const unscheduledTodos = todos.filter((t) => !t.due_date);

    const isToday = (date: Date) => {
        const now = new Date();
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'normal':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'low':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPriorityLabel = (priority?: string) => {
        switch (priority) {
            case 'urgent':
                return 'Acil';
            case 'high':
                return 'Yüksek';
            case 'normal':
                return 'Normal';
            case 'low':
                return 'Düşük';
            default:
                return 'Normal';
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        justDraggedRef.current = true;
        setTimeout(() => { justDraggedRef.current = false; }, 200);

        if (!over) return;

        const todoId = active.id as string;
        const newStatus = over.id as string;

        // Sadece geçerli kolon statülerine bırakıldıysa işle
        const validStatuses = ['todo', 'in_progress', 'done'];
        if (!validStatuses.includes(newStatus)) return;

        // Eğer farklı bir kolona bırakıldıysa statüyü güncelle
        const todo = todos.find((t) => t.id === todoId);
        if (todo && todo.status !== newStatus) {
            updateStatus(todoId, newStatus as 'todo' | 'in_progress' | 'done');
        }
    };

    const renderTaskCard = (todo: Todo, isDragging = false) => {
        const isDone = todo.status === 'done';
        const isInProgress = todo.status === 'in_progress';

        return (
            <div
                key={todo.id}
                className={`p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group ${
                    isDragging ? 'opacity-50' : ''
                } ${
                    isDone
                        ? 'bg-gray-50/50 opacity-80 hover:opacity-100 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]'
                        : isInProgress
                          ? 'bg-white/70 backdrop-blur-[10px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] ring-1 ring-[#F59E0B]/30'
                          : 'bg-white/70 backdrop-blur-[10px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]'
                }`}
                onClick={() => { if (!justDraggedRef.current) setSelectedTodo(todo); }}
            >
                {/* Header: badge + action */}
                <div className="flex justify-between items-start mb-3">
                    <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${getPriorityColor(
                            todo.priority
                        )}`}
                    >
                        {getPriorityLabel(todo.priority)}
                    </span>
                    {isDone ? (
                        <div className="bg-[#10B981] text-white rounded-full p-1">
                            <span className="material-symbols-outlined text-[14px] block">check</span>
                        </div>
                    ) : (
                        <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                    )}
                </div>

                {/* Title */}
                <h4
                    className={`font-bold text-lg leading-snug mb-2 ${
                        isDone ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                >
                    {todo.title}
                </h4>

                {/* Description */}
                {todo.description && (
                    <p
                        className={`text-sm mb-4 line-clamp-2 ${
                            isDone ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    >
                        {todo.description}
                    </p>
                )}

                {/* Progress bar for in_progress */}
                {isInProgress && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                        <div
                            className="bg-[#F59E0B] h-full rounded-full"
                            style={{ width: '60%' }}
                        ></div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-6 h-6 rounded-full bg-gradient-to-br from-[#663259] to-[#8E44AD] flex items-center justify-center text-white font-bold text-[10px] ring-2 ring-white ${
                                isDone ? 'grayscale opacity-60' : ''
                            }`}
                        >
                            {todo.assignee
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                        </div>
                        <span
                            className={`text-xs font-medium ${
                                isDone ? 'text-gray-400' : 'text-gray-500'
                            }`}
                        >
                            {todo.assignee}
                        </span>
                    </div>

                    {todo.due_date ? (
                        <div
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                                isInProgress
                                    ? 'text-[#F59E0B] bg-[#F59E0B]/10 font-medium'
                                    : isDone
                                      ? 'text-[#10B981] font-medium'
                                      : 'text-gray-400 bg-white/50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {isInProgress ? 'schedule' : 'calendar_today'}
                            </span>
                            <span>
                                {isDone
                                    ? 'Tamamlandı'
                                    : isInProgress
                                      ? `Bugün ${new Date(todo.due_date).toLocaleTimeString('tr-TR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}`
                                      : new Date(todo.due_date).toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                            </span>
                        </div>
                    ) : isDone ? (
                        <div className="text-xs text-[#10B981] font-medium">Tamamlandı</div>
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                {/* Header */}
                <div
                    className="relative overflow-hidden rounded-2xl shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                >
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                                <span className="material-symbols-outlined text-white text-[26px]">view_kanban</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight">Görev Yönetimi</h1>
                                <p className="text-white/60 text-xs mt-0.5">
                                    {viewMode === 'kanban' ? 'Kanban Board' : viewMode === 'list' ? 'Liste Görünümü' : 'Planlama Takvimi'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* View Mode Selector */}
                            <div className="flex items-center gap-1 bg-black/20 rounded-xl p-1 border border-white/10">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        viewMode === 'kanban'
                                            ? 'bg-white/20 text-white shadow-sm'
                                            : 'text-white/50 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                                    Kanban
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        viewMode === 'list'
                                            ? 'bg-white/20 text-white shadow-sm'
                                            : 'text-white/50 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">list</span>
                                    Liste
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        viewMode === 'calendar'
                                            ? 'bg-white/20 text-white shadow-sm'
                                            : 'text-white/50 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                    Planlama
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                                <span className="text-xs text-white/60 font-medium">Toplam:</span>
                                <span className="text-sm font-bold text-white">{todos.length} görev</span>
                            </div>
                            <button
                                onClick={() => setShowLabelManager(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 text-white rounded-xl border border-white/10 hover:bg-white/20 transition-all font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">label</span>
                                Etiketler
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-[#663259] rounded-xl hover:bg-white/90 hover:shadow-lg transition-all font-bold text-sm shrink-0"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Yeni Görev
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Based on View Mode */}
                {viewMode === 'kanban' && (
                    <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <div className="flex-1 overflow-x-auto overflow-y-hidden" data-no-drag>
                            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[900px]">
                                {/* Bekleyen (TODO) */}
                                <KanbanColumn
                                    id="todo"
                                    title="Bekleyen"
                                    count={todoTodos.length}
                                    color="gray"
                                    todos={todoTodos}
                                    renderTaskCard={renderTaskCard}
                                    onAddClick={() => setShowAddModal(true)}
                                    onQuickAdd={async (title) => {
                                        await addTodo({
                                            title,
                                            description: '',
                                            assignee: 'Ali Yılmaz',
                                            status: 'todo',
                                            priority: 'normal',
                                        });
                                    }}
                                />

                                {/* Devam Eden (IN_PROGRESS) */}
                                <KanbanColumn
                                    id="in_progress"
                                    title="Devam Eden"
                                    count={inProgressTodos.length}
                                    color="yellow"
                                    todos={inProgressTodos}
                                    renderTaskCard={renderTaskCard}
                                />

                                {/* Tamamlanan (DONE) */}
                                <KanbanColumn
                                    id="done"
                                    title="Tamamlanan"
                                    count={doneTodos.length}
                                    color="green"
                                    todos={doneTodos}
                                    renderTaskCard={renderTaskCard}
                                />
                            </div>
                        </div>

                        <DragOverlay>
                            {activeId && todos.find((t) => t.id === activeId) ? (
                                <div className="rotate-3 scale-105">
                                    {renderTaskCard(todos.find((t) => t.id === activeId)!, true)}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Liste Görünümü */}
                {viewMode === 'list' && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4" data-no-drag>
                        {/* Stats Cards */}
                        <div className="flex gap-3 shrink-0">
                            <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-[120px]">
                                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                    Tamamlanan
                                </span>
                                <span className="text-2xl font-bold text-[#10B981]">{doneTodos.length}</span>
                            </div>
                            <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-[120px]">
                                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                    Devam Eden
                                </span>
                                <span className="text-2xl font-bold text-[#F59E0B]">
                                    {inProgressTodos.length}
                                </span>
                            </div>
                            <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-[120px]">
                                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                    Bekleyen
                                </span>
                                <span className="text-2xl font-bold text-[#F97171]">{todoTodos.length}</span>
                            </div>
                        </div>

                        {/* Task List Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden flex-1">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#663259]">
                                        checklist
                                    </span>
                                    Görev Listesi
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-[180px]">
                                        <select
                                            value={listFilter}
                                            onChange={(e) => setListFilter(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20 bg-white text-gray-700 font-medium"
                                        >
                                            {priorityFilterOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
                                {filteredTodos.map((todo) => (
                                    <TaskListItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={() =>
                                            updateStatus(todo.id, todo.status === 'done' ? 'todo' : 'done')
                                        }
                                        onClick={() => setSelectedTodo(todo)}
                                        onDelete={() => deleteTodo(todo.id)}
                                    />
                                ))}

                                {filteredTodos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                        <span className="material-symbols-outlined text-[64px] mb-3">
                                            task_alt
                                        </span>
                                        <p className="text-lg font-medium text-gray-400">Henüz görev yok</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Yeni görev ekleyerek başlayın
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Planlama/Timeline Görünümü */}
                {viewMode === 'calendar' && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4" data-no-drag>
                        {/* Sub-view Toggle + Navigation */}
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCalendarSubView('daily')}
                                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                                        calendarSubView === 'daily'
                                            ? 'bg-[#663259] text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:text-[#663259] border border-gray-200 hover:border-[#663259]/30'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">calendar_view_day</span>
                                    Günlük
                                </button>
                                <button
                                    onClick={() => setCalendarSubView('weekly')}
                                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                                        calendarSubView === 'weekly'
                                            ? 'bg-[#663259] text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:text-[#663259] border border-gray-200 hover:border-[#663259]/30'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
                                    Haftalık
                                </button>
                            </div>

                            {calendarSubView === 'weekly' && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setWeekOffset((p) => p - 1)}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-[#663259]/30 hover:text-[#663259] flex items-center justify-center transition-all text-gray-500"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                    </button>
                                    <button
                                        onClick={() => setWeekOffset(0)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            weekOffset === 0
                                                ? 'bg-[#663259]/10 text-[#663259]'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:text-[#663259] hover:border-[#663259]/30'
                                        }`}
                                    >
                                        Bu Hafta
                                    </button>
                                    <span className="text-sm font-semibold text-gray-700 min-w-[200px] text-center">
                                        {getWeekLabel()}
                                    </span>
                                    <button
                                        onClick={() => setWeekOffset((p) => p + 1)}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-[#663259]/30 hover:text-[#663259] flex items-center justify-center transition-all text-gray-500"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Daily Timeline View */}
                        {calendarSubView === 'daily' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="max-w-5xl mx-auto">
                                    <div className="relative space-y-8 pb-10">
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                        {todos
                                            .sort((a, b) => {
                                                if (!a.due_date) return 1;
                                                if (!b.due_date) return -1;
                                                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                                            })
                                            .map((todo) => (
                                                <TimelineItem
                                                    key={todo.id}
                                                    todo={todo}
                                                    onClick={() => setSelectedTodo(todo)}
                                                />
                                            ))}
                                        {todos.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                                <span className="material-symbols-outlined text-[64px] mb-3">event_note</span>
                                                <p className="text-lg font-medium text-gray-400">Henüz planlanmış görev yok</p>
                                                <p className="text-sm text-gray-400 mt-1">Yeni görev ekleyerek başlayın</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Weekly Grid View */}
                        {calendarSubView === 'weekly' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex-1 grid grid-cols-7 gap-3 min-h-0">
                                    {weekDays.map((day) => {
                                        const dayTodos = todosForDate(day);
                                        const todayFlag = isToday(day);
                                        const dayName = day.toLocaleDateString('tr-TR', { weekday: 'short' });
                                        const dayNum = day.getDate();

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`flex flex-col rounded-2xl border overflow-hidden transition-all ${
                                                    todayFlag
                                                        ? 'border-[#663259]/30 bg-[#663259]/[0.02] shadow-sm'
                                                        : 'border-gray-100 bg-white'
                                                }`}
                                            >
                                                {/* Day Header */}
                                                <div className={`px-3 py-2.5 text-center shrink-0 border-b ${
                                                    todayFlag ? 'border-[#663259]/10' : 'border-gray-50'
                                                }`}>
                                                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                        todayFlag ? 'text-[#663259]' : 'text-gray-400'
                                                    }`}>
                                                        {dayName}
                                                    </p>
                                                    <p className={`text-lg font-bold mt-0.5 ${
                                                        todayFlag ? 'text-[#663259]' : 'text-gray-700'
                                                    }`}>
                                                        {dayNum}
                                                    </p>
                                                    {todayFlag && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#663259] mx-auto mt-1"></div>
                                                    )}
                                                </div>

                                                {/* Tasks */}
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                                                    {dayTodos.map((todo) => {
                                                        const statusColor =
                                                            todo.status === 'done'
                                                                ? 'bg-[#10B981]'
                                                                : todo.status === 'in_progress'
                                                                  ? 'bg-[#F59E0B]'
                                                                  : 'bg-gray-300';
                                                        const textColor =
                                                            todo.status === 'done'
                                                                ? 'text-gray-400 line-through'
                                                                : 'text-gray-700';

                                                        return (
                                                            <div
                                                                key={todo.id}
                                                                onClick={() => setSelectedTodo(todo)}
                                                                className="group px-2.5 py-2 rounded-xl bg-gray-50 hover:bg-[#663259]/5 border border-transparent hover:border-[#663259]/20 cursor-pointer transition-all"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusColor}`}></span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`text-xs font-semibold truncate ${textColor}`}>
                                                                            {todo.title}
                                                                        </p>
                                                                        {todo.due_date && (
                                                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                                                {new Date(todo.due_date).toLocaleTimeString('tr-TR', {
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit',
                                                                                })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {dayTodos.length === 0 && (
                                                        <div className="flex items-center justify-center h-full min-h-[60px]">
                                                            <span className="text-[10px] text-gray-300">—</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Unscheduled tasks */}
                                {unscheduledTodos.length > 0 && (
                                    <div className="mt-3 shrink-0">
                                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="material-symbols-outlined text-[18px] text-gray-400">event_busy</span>
                                                <h4 className="text-sm font-bold text-gray-600">Tarihsiz Görevler</h4>
                                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg font-medium">{unscheduledTodos.length}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {unscheduledTodos.map((todo) => (
                                                    <div
                                                        key={todo.id}
                                                        onClick={() => setSelectedTodo(todo)}
                                                        className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#663259]/5 border border-gray-100 hover:border-[#663259]/20 text-xs font-medium text-gray-600 cursor-pointer transition-all"
                                                    >
                                                        {todo.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Task Modal */}
            <AddTodoModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                getUsersFn={getUsersFn}
            />

            {/* Task Detail Modal */}
            {selectedTodo && (
                <EditTodoModal
                    isOpen={!!selectedTodo}
                    onClose={() => setSelectedTodo(null)}
                    todo={selectedTodo}
                    currentUserName={currentUserName}
                    getUsersFn={getUsersFn}
                />
            )}

            {/* Label Manager Modal */}
            {showLabelManager && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => { setShowLabelManager(false); setEditingTagId(null); }}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px] text-[#663259]">label</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-base">Etiket Yönetimi</h3>
                                    <p className="text-xs text-gray-400">{tags.length} etiket tanımlı</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowLabelManager(false); setEditingTagId(null); }}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <span className="material-symbols-outlined text-[22px]">close</span>
                            </button>
                        </div>

                        {/* Tag List */}
                        <div className="px-4 py-3 max-h-[380px] overflow-y-auto custom-scrollbar space-y-2">
                            {tags.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                    <span className="material-symbols-outlined text-[40px] mb-2">label_off</span>
                                    <p className="text-sm text-gray-400">Henüz etiket yok</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Aşağıdan yeni etiket ekleyin</p>
                                </div>
                            ) : (
                                tags.map(tag => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group hover:bg-gray-100/60 transition-all"
                                    >
                                        {editingTagId === tag.id ? (
                                            <>
                                                <input
                                                    type="color"
                                                    value={editingColor}
                                                    onChange={e => setEditingColor(e.target.value)}
                                                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0 p-0.5"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit(tag.id);
                                                        if (e.key === 'Escape') setEditingTagId(null);
                                                    }}
                                                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(tag.id)}
                                                    className="p-1.5 bg-[#663259] text-white rounded-lg hover:bg-[#4A235A] transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                                </button>
                                                <button
                                                    onClick={() => setEditingTagId(null)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className="w-6 h-6 rounded-full shrink-0 border border-black/5"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="flex-1 text-sm font-semibold text-gray-700">{tag.name}</span>
                                                <button
                                                    onClick={() => {
                                                        setEditingTagId(tag.id);
                                                        setEditingName(tag.name);
                                                        setEditingColor(tag.color);
                                                    }}
                                                    className="p-1.5 text-gray-300 hover:text-[#663259] opacity-0 group-hover:opacity-100 hover:bg-[#663259]/10 rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Tag */}
                        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Yeni Etiket</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={newTagColor}
                                    onChange={e => setNewTagColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0 p-0.5 bg-white"
                                />
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={e => setNewTagName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
                                    placeholder="Etiket adı..."
                                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#663259] focus:ring-1 focus:ring-[#663259]/20 bg-white"
                                />
                                <button
                                    onClick={handleAddTag}
                                    disabled={!newTagName.trim()}
                                    className="px-4 py-2.5 bg-[#663259] text-white text-sm font-bold rounded-xl hover:bg-[#4A235A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Kanban Column Component
interface KanbanColumnProps {
    id: string;
    title: string;
    count: number;
    color: 'gray' | 'yellow' | 'green';
    todos: Todo[];
    renderTaskCard: (todo: Todo) => React.ReactNode;
    onAddClick?: () => void;
    onQuickAdd?: (title: string) => Promise<void>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    id,
    title,
    count,
    color,
    todos,
    renderTaskCard,
    onAddClick,
    onQuickAdd,
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });
    const [quickAddValue, setQuickAddValue] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    const handleQuickAdd = async () => {
        const value = quickAddValue.trim();
        if (!value || !onQuickAdd) return;
        setQuickAddValue('');
        try {
            await onQuickAdd(value);
        } catch {
            // error handled at store level
        }
    };

    const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleQuickAdd();
        }
        if (e.key === 'Escape') {
            setQuickAddValue('');
            setIsQuickAdding(false);
        }
    };

    const colorClasses = {
        gray: {
            dot: 'bg-gray-400',
            title: 'text-gray-800',
            badge: 'bg-gray-200 text-gray-600',
            overBg: 'bg-gray-200/40',
            overRing: 'ring-gray-300',
        },
        yellow: {
            dot: 'bg-[#F59E0B]',
            title: 'text-gray-800',
            badge: 'bg-[#F59E0B]/20 text-[#F59E0B]',
            overBg: 'bg-[#F59E0B]/5',
            overRing: 'ring-[#F59E0B]/30',
        },
        green: {
            dot: 'bg-[#10B981]',
            title: 'text-gray-800',
            badge: 'bg-[#10B981]/20 text-[#10B981]',
            overBg: 'bg-[#10B981]/5',
            overRing: 'ring-[#10B981]/30',
        },
    };

    const classes = colorClasses[color];

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col h-full rounded-2xl transition-all duration-200 ${
                isOver
                    ? `${classes.overBg} ring-2 ${classes.overRing} ring-inset`
                    : 'bg-gray-100/50'
            }`}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${classes.dot}`}></span>
                    <h3 className={`text-base font-bold ${classes.title}`}>{title}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${classes.badge}`}>
                        {count}
                    </span>
                </div>
                {id === 'todo' && onAddClick && (
                    <button
                        className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all shadow-sm"
                        onClick={onAddClick}
                        title="Detaylı görev ekle"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                )}
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-3">
                {todos.map((todo) => (
                    <DraggableTaskCard key={todo.id} todo={todo} renderTaskCard={renderTaskCard} />
                ))}

                {/* Inline Quick Add for todo column */}
                {id === 'todo' && (
                    <div
                        className={`rounded-xl border-2 border-dashed transition-all ${
                            isQuickAdding
                                ? 'border-[#663259]/30 bg-white p-3 shadow-sm'
                                : 'border-gray-200/80 bg-white/40 opacity-60 hover:opacity-100 hover:border-[#663259]/30 hover:bg-white/60 cursor-pointer p-4'
                        }`}
                        data-no-drag
                        onClick={(e) => {
                            if (!isQuickAdding) {
                                e.stopPropagation();
                                setIsQuickAdding(true);
                            }
                        }}
                    >
                        {isQuickAdding ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={quickAddValue}
                                    onChange={(e) => setQuickAddValue(e.target.value)}
                                    onKeyDown={handleQuickAddKeyDown}
                                    placeholder="Görev adı yazın, Enter ile ekleyin..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 focus:border-[#663259] bg-gray-50"
                                    autoFocus
                                />
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-gray-400">
                                        Enter = ekle &middot; Esc = kapat
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAdding(false);
                                                setQuickAddValue('');
                                            }}
                                            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickAdd()}
                                            disabled={!quickAddValue.trim()}
                                            className="px-3 py-1 text-xs bg-[#663259] text-white rounded-lg hover:bg-[#8E44AD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                                        >
                                            Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
                                <span className="material-symbols-outlined">add_circle</span>
                                <span className="font-bold text-sm">Yeni Görev Ekle</span>
                            </div>
                        )}
                    </div>
                )}

                {todos.length === 0 && id !== 'todo' && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                        <span className="material-symbols-outlined text-[40px] mb-2 opacity-40">
                            {id === 'in_progress' ? 'hourglass_empty' : 'check_circle'}
                        </span>
                        <p className="text-xs font-medium text-gray-400">Görev yok</p>
                        <p className="text-[10px] text-gray-300 mt-1">Sürükleyerek görev ekleyin</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Draggable Task Card Component
interface DraggableTaskCardProps {
    todo: Todo;
    renderTaskCard: (todo: Todo, isDragging?: boolean) => React.ReactNode;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({ todo, renderTaskCard }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: todo.id,
    });

    const style: React.CSSProperties = {
        touchAction: 'none',
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-no-drag>
            {renderTaskCard(todo, isDragging)}
        </div>
    );
};

// Timeline Item Component
interface TimelineItemProps {
    todo: Todo;
    onClick: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ todo, onClick }) => {
    const getStatusBadge = () => {
        switch (todo.status) {
            case 'done':
                return (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
                        Tamamlandı
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded uppercase">
                        İşlemde
                    </span>
                );
            case 'todo':
                return (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded uppercase">
                        Bekliyor
                    </span>
                );
            default:
                return null;
        }
    };

    const getIcon = () => {
        switch (todo.priority) {
            case 'urgent':
                return 'priority_high';
            case 'high':
                return 'inventory_2';
            default:
                return 'task_alt';
        }
    };

    const getIconColor = () => {
        if (todo.status === 'done') return 'text-green-600 ring-green-200';
        if (todo.status === 'in_progress') return 'text-[#F97171] ring-[#F97171]/20';
        return 'text-gray-400 ring-gray-200';
    };

    const getBorderClass = () => {
        if (todo.status === 'in_progress') return 'border-l-4 border-l-[#F97171]';
        return '';
    };

    const getOpacity = () => {
        if (todo.status === 'done') return 'opacity-100';
        if (todo.status === 'in_progress') return 'opacity-100';
        return 'opacity-60';
    };

    return (
        <div className={`relative flex gap-6 group ${getOpacity()}`} onClick={onClick} data-no-drag>
            {/* Timeline Dot */}
            <div className="relative z-10 flex-none">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full bg-white border-4 border-gray-50 shadow-sm ring-2 ${getIconColor()}`}
                >
                    <span className="material-symbols-outlined">{getIcon()}</span>
                </div>
            </div>

            {/* Content Card */}
            <div
                className={`flex-1 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-[#663259]/30 transition-all cursor-pointer ${getBorderClass()} ${
                    todo.status === 'in_progress' ? 'hover:shadow-md' : ''
                }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <span
                                className={`font-bold text-lg ${
                                    todo.status === 'in_progress'
                                        ? 'text-[#F97171]'
                                        : todo.status === 'done'
                                          ? 'text-[#663259]'
                                          : 'text-gray-500'
                                }`}
                            >
                                {todo.due_date
                                    ? new Date(todo.due_date).toLocaleTimeString('tr-TR', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : '--:--'}
                            </span>
                            {getStatusBadge()}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">{todo.title}</h3>
                        {todo.description && (
                            <p className="text-gray-500 text-sm mt-1">{todo.description}</p>
                        )}

                        {/* Progress checklist for in_progress items */}
                        {todo.status === 'in_progress' && (
                            <div className="mt-4 space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer group/check">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        className="h-5 w-5 rounded border-gray-300 text-[#F97171] focus:ring-[#F97171]"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm text-gray-500 line-through">
                                        İlk adım tamamlandı
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group/check">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-[#F97171] focus:ring-[#F97171]"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm text-gray-800 group-hover/check:text-[#F97171]">
                                        Devam eden işlem
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Avatar or Action Button */}
                    <div className="flex items-start gap-2">
                        {todo.status === 'in_progress' ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle report action
                                }}
                                className="px-4 py-2 bg-[#F97171] text-white text-sm font-semibold rounded-lg shadow hover:bg-[#E05A5A] transition-colors"
                            >
                                Rapor Gir
                            </button>
                        ) : (
                            <div className="flex -space-x-2">
                                <div
                                    className={`h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-[#663259] to-[#8E44AD] flex items-center justify-center text-white text-xs font-bold ${
                                        todo.status !== 'done' ? 'grayscale opacity-50' : ''
                                    }`}
                                >
                                    {todo.assignee
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Task List Item Component
interface TaskListItemProps {
    todo: Todo;
    onToggle: () => void;
    onClick: () => void;
    onDelete: () => void;
}

const TaskListItem: React.FC<TaskListItemProps> = ({ todo, onToggle, onClick, onDelete }) => {
    const getPriorityBadge = () => {
        if (todo.status === 'done') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600">
                    Tamamlandı
                </span>
            );
        }

        switch (todo.priority) {
            case 'urgent':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        Acil
                    </span>
                );
            case 'high':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600">
                        Yüksek
                    </span>
                );
            case 'normal':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                        Normal
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        Düşük
                    </span>
                );
            default:
                return null;
        }
    };

    const getHoverColor = () => {
        if (todo.status === 'done') return '';

        switch (todo.priority) {
            case 'urgent':
            case 'high':
                return 'hover:border-red-300 hover:bg-red-50/30';
            case 'normal':
                return 'hover:border-orange-300 hover:bg-orange-50/30';
            case 'low':
                return 'hover:border-blue-300 hover:bg-blue-50/30';
            default:
                return 'hover:border-gray-300 hover:bg-gray-50/30';
        }
    };

    const getTextHoverColor = () => {
        if (todo.status === 'done') return '';

        switch (todo.priority) {
            case 'urgent':
            case 'high':
                return 'group-hover:text-red-600';
            case 'normal':
                return 'group-hover:text-orange-600';
            case 'low':
                return 'group-hover:text-blue-600';
            default:
                return '';
        }
    };

    const isDone = todo.status === 'done';

    return (
        <div
            className={`group flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDone ? 'bg-gray-50/50 opacity-75' : `bg-white ${getHoverColor()}`
            }`}
            onClick={onClick}
            data-no-drag
        >
            {/* Status indicator */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all ${
                    isDone
                        ? 'bg-[#10B981] text-white shadow-sm'
                        : 'border-2 border-gray-200 text-transparent hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/5'
                }`}
                title={isDone ? 'Geri al' : 'Tamamla'}
            >
                <span className="material-symbols-outlined text-[18px]">check</span>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    {getPriorityBadge()}
                    <span
                        className={`text-xs text-gray-400 flex items-center gap-1 ${
                            isDone ? 'line-through' : ''
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {todo.due_date
                            ? new Date(todo.due_date).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                              })
                            : 'Tarih yok'}
                    </span>
                </div>
                <p
                    className={`text-base font-semibold truncate ${
                        isDone
                            ? 'text-gray-500 line-through'
                            : `text-gray-800 ${getTextHoverColor()}`
                    } transition-colors`}
                >
                    {todo.title}
                </p>
                {todo.description && (
                    <p
                        className={`text-sm truncate mt-0.5 ${
                            isDone ? 'text-gray-400 line-through' : 'text-gray-500'
                        }`}
                    >
                        {todo.description}
                    </p>
                )}
            </div>

            {/* Assignee & Actions */}
            <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#663259] to-[#8E44AD] text-xs flex items-center justify-center font-bold text-white ring-1 ring-gray-100">
                    {todo.assignee
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                </div>
                {isDone && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                                onDelete();
                            }
                        }}
                        className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Görevi sil"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TodoKanban;
