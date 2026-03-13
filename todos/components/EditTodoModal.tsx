import React, { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useTodoStore } from '../store';
import { Todo, TodoComment } from '../types';
import { todoService } from '../service';
import {
    X,
    AlignLeft,
    Trash2,
    Share2,
    Eye,
    Plus,
    ChevronDown,
    Paperclip,
    ListTodo,
    MessageCircle,
    Send
} from 'lucide-react';
import DatePicker from './DatePicker';
import TagSelector from './TagSelector';

interface DBUser {
    id: string;
    name: string;
    role: string;
}

interface EditTodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    todo: Todo;
    currentUserName?: string;
    getUsersFn?: () => Promise<DBUser[]>;
}

const EditTodoModal: React.FC<EditTodoModalProps> = ({ isOpen, onClose, todo, currentUserName, getUsersFn }) => {
    useEscapeKey(onClose, isOpen);
    const { updateTodo, deleteTodo, updateStatus } = useTodoStore();
    const [title, setTitle] = useState(todo.title);
    const [description, setDescription] = useState(todo.description || '');
    const [assignee, setAssignee] = useState(todo.assignee || '');
    const [dueDate, setDueDate] = useState(todo.due_date || '');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [users, setUsers] = useState<DBUser[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [comments, setComments] = useState<TodoComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const fetchComments = async () => {
        setLoadingComments(true);
        const data = await todoService.getComments(todo.id);
        setComments(data);
        setLoadingComments(false);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        const comment: TodoComment = {
            id: crypto.randomUUID(),
            todo_id: todo.id,
            author: currentUserName || 'Anonim',
            content: newComment.trim(),
        };
        try {
            await todoService.addComment(comment);
            setComments(prev => [...prev, { ...comment, created_at: new Date().toISOString() }]);
            setNewComment('');
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error('Yorum eklenemedi:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await todoService.deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Yorum silinemedi:', error);
        }
    };

    const formatCommentDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);
        if (diffMin < 1) return 'Az önce';
        if (diffMin < 60) return `${diffMin} dk önce`;
        if (diffHour < 24) return `${diffHour} saat önce`;
        if (diffDay < 7) return `${diffDay} gün önce`;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    useEffect(() => {
        if (isOpen) {
            if (getUsersFn) getUsersFn().then(setUsers);
            setTitle(todo.title);
            setDescription(todo.description || '');
            setAssignee(todo.assignee || '');
            setDueDate(todo.due_date || '');
            todoService.getTagsForTodo(todo.id).then(tags => setSelectedTagIds(tags.map(t => t.id)));
            fetchComments();
        }
    }, [isOpen, todo]);

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim()) return;

        await updateTodo({
            ...todo,
            title,
            description,
            assignee,
            due_date: dueDate || undefined,
        });
        await todoService.setTagsForTodo(todo.id, selectedTagIds);
        onClose();
    };

    const handleDelete = async () => {
        await deleteTodo(todo.id);
        onClose();
    };

    const statusConfig = {
        todo: { label: 'Yapılacak', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
        in_progress: { label: 'İşlemde', color: 'bg-yellow-50 text-yellow-600', dot: 'bg-yellow-500' },
        done: { label: 'Tamamlandı', color: 'bg-green-50 text-green-600', dot: 'bg-green-500' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 text-indigo-500 text-[10px] font-black px-2 py-1 rounded-md tracking-wider">
                            GÖREV #{todo.id.slice(0, 4).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                            <ListTodo size={14} />
                            Hazırlık Listesi
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold transition-colors">
                            <Share2 size={18} />
                            Paylaş
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold transition-colors">
                            <Eye size={18} />
                            İzle
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Left Side: Main Info */}
                        <div className="flex-1 space-y-8">
                            <div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Görev başlığı..."
                                    className="w-full text-4xl font-black text-[#1F2937] placeholder-gray-300 border-none outline-none focus:ring-0 p-0 leading-tight"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-600 font-black text-sm uppercase tracking-wider">
                                    <AlignLeft size={16} />
                                    Açıklama
                                </div>
                                <div className="bg-[#F8F9FA] rounded-[24px] p-6 min-h-[160px] border border-gray-100/50">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-gray-600 text-[15px] leading-relaxed resize-none p-0"
                                        placeholder="Görevin detaylarını buraya yazabilirsiniz..."
                                    />
                                </div>
                            </div>

                            {/* Ekler Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-600 font-black text-sm uppercase tracking-wider">
                                    <Paperclip size={16} />
                                    Ekler
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center font-bold text-[10px]">PDF</div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-700">Gorev_Detaylari.pdf</div>
                                                <div className="text-[10px] text-gray-400 font-medium">1.2 MB &bull; 2 saat önce</div>
                                            </div>
                                        </div>
                                        <ChevronDown size={14} className="text-gray-300" />
                                    </div>
                                    <button type="button" className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-100 rounded-[24px] text-gray-400 hover:text-[#F97171] hover:border-[#F97171]/30 hover:bg-gray-50 transition-all font-bold text-sm">
                                        <Plus size={20} />
                                        Dosya Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Yorumlar Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-600 font-black text-sm uppercase tracking-wider">
                                    <MessageCircle size={16} />
                                    Yorumlar
                                    {comments.length > 0 && (
                                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{comments.length}</span>
                                    )}
                                </div>

                                {/* Yorum Listesi */}
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {loadingComments ? (
                                        <div className="text-center text-gray-400 text-sm py-4">Yorumlar yükleniyor...</div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center text-gray-300 text-sm py-6">
                                            Henüz yorum yok. İlk yorumu siz yazın!
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="bg-[#F8F9FA] rounded-2xl p-4 group hover:bg-gray-50 transition-all">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                            {comment.author.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-gray-700">{comment.author}</span>
                                                                <span className="text-[10px] text-gray-400 font-medium">{formatCommentDate(comment.created_at)}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-all shrink-0"
                                                        title="Yorumu sil"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={commentsEndRef} />
                                </div>

                                {/* Yorum Yazma Alanı */}
                                <div className="flex items-end gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#F97171]/10 text-[#F97171] flex items-center justify-center text-xs font-bold shrink-0">
                                        {(currentUserName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 bg-[#F8F9FA] rounded-2xl border border-gray-100/50 focus-within:border-[#F97171]/30 focus-within:ring-2 focus-within:ring-[#F97171]/10 transition-all">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddComment();
                                                }
                                            }}
                                            placeholder="Yorum yazın..."
                                            rows={1}
                                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-gray-600 resize-none p-3 pb-2"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        className="p-2.5 rounded-xl bg-[#F97171] text-white hover:bg-[#E05A5A] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-lg shadow-[#F97171]/20"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Attributes */}
                        <div className="w-full lg:w-[320px] space-y-8">
                            <div className="space-y-6">
                                {/* Durum */}
                                <div className="relative">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Durum</label>
                                    <button
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                        className={`${statusConfig[todo.status].color} w-full px-4 py-2.5 rounded-2xl flex items-center justify-between font-bold text-sm transition-all hover:opacity-80`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusConfig[todo.status].dot} shadow-sm`} />
                                            {statusConfig[todo.status].label}
                                        </div>
                                        <ChevronDown size={14} />
                                    </button>

                                    {showStatusDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-[20px] shadow-2xl border border-gray-100 p-2 z-20">
                                            {(['todo', 'in_progress', 'done'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        updateStatus(todo.id, s);
                                                        setShowStatusDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all text-sm font-bold text-gray-700"
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${statusConfig[s].dot}`} />
                                                    {statusConfig[s].label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Sorumlular */}
                                <div className="relative">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Sorumlular</label>
                                    <div className="flex items-center flex-wrap gap-2">
                                        {assignee ? (
                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full group">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                    {assignee.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold text-gray-700">{assignee}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignee('')}
                                                    className="p-1 hover:bg-gray-200 rounded-full text-gray-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                                            className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#F97171] hover:text-[#F97171] transition-all"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {showUserDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-[20px] shadow-2xl border border-gray-100 p-3 z-10 max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {users.map(user => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setAssignee(user.name);
                                                        setShowUserDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-[#F97171]/5 rounded-xl transition-all text-left group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-[#F97171] group-hover:text-white transition-colors">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-black text-gray-700">{user.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Etiketler */}
                                <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />

                                {/* Son Teslim Tarihi */}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Son Teslim Tarihi</label>
                                    <DatePicker value={dueDate} onChange={setDueDate} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                        {!showDeleteConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 text-red-400 hover:text-red-500 font-bold text-sm transition-all"
                            >
                                <Trash2 size={18} />
                                Görevi Sil
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-red-500">Emin misiniz?</span>
                                <button onClick={handleDelete} className="text-xs font-black bg-red-500 text-white px-3 py-1.5 rounded-lg">Evet, Sil</button>
                                <button onClick={() => setShowDeleteConfirm(false)} className="text-xs font-bold text-gray-400">İptal</button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all text-sm"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            className="px-10 py-3 rounded-2xl bg-[#F97171] text-white font-black hover:bg-[#E05A5A] shadow-xl shadow-[#F97171]/30 transition-all transform active:scale-95 text-sm uppercase tracking-widest"
                        >
                            Değişiklikleri Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditTodoModal;
