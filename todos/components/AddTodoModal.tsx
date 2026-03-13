import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useTodoStore } from '../store';
import { todoService } from '../service';
import {
    X,
    AlignLeft,
    Paperclip,
    Share2,
    Eye,
    Plus,
    ChevronDown,
    ListTodo
} from 'lucide-react';
import DatePicker from './DatePicker';
import TagSelector from './TagSelector';

interface DBUser {
    id: string;
    name: string;
    role: string;
}

interface AddTodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    getUsersFn?: () => Promise<DBUser[]>;
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose, getUsersFn }) => {
    useEscapeKey(onClose, isOpen);
    const { addTodo } = useTodoStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [users, setUsers] = useState<DBUser[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    useEffect(() => {
        if (isOpen && getUsersFn) {
            getUsersFn().then(setUsers);
        }
    }, [isOpen, getUsersFn]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const newTodoId = await addTodo({
            title,
            description,
            assignee,
            due_date: dueDate || undefined,
            status: 'todo',
        });

        // Set tags for the new todo
        if (selectedTagIds.length > 0 && newTodoId) {
            await todoService.setTagsForTodo(newTodoId, selectedTagIds);
        }

        // Reset
        setTitle('');
        setDescription('');
        setAssignee('');
        setDueDate('');
        setSelectedTagIds([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-50 text-red-500 text-[10px] font-black px-2 py-1 rounded-md tracking-wider">
                            YENİ GÖREV
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
                    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-12">
                        {/* Left Side: Main Info */}
                        <div className="flex-1 space-y-8">
                            <div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Görev başlığı giriniz..."
                                    className="w-full text-4xl font-black text-[#1F2937] placeholder-gray-300 border-none outline-none focus:ring-0 p-0 leading-tight"
                                    autoFocus
                                    required
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

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-600 font-black text-sm uppercase tracking-wider">
                                    <Paperclip size={16} />
                                    Ekler
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-[24px] text-gray-400 hover:text-[#F97171] hover:border-[#F97171]/30 hover:bg-gray-50 transition-all font-bold text-sm">
                                        <Plus size={20} />
                                        Dosya Ekle
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Attributes */}
                        <div className="w-full lg:w-[320px] space-y-8">
                            <div className="space-y-6">
                                {/* Durum */}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Durum</label>
                                    <div className="bg-yellow-50 text-yellow-600 px-4 py-2.5 rounded-2xl flex items-center justify-between font-bold text-sm cursor-default">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-sm shadow-yellow-200" />
                                            İşlemde
                                        </div>
                                        <ChevronDown size={14} />
                                    </div>
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
                                            {users.length > 0 ? users.map(user => (
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
                                            )) : (
                                                <div className="p-3 text-xs text-gray-400 italic">Kayıtlı kullanıcı yok</div>
                                            )}
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
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-4 shrink-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all text-sm"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim()}
                        className="px-10 py-3 rounded-2xl bg-[#F97171] text-white font-black hover:bg-[#E05A5A] shadow-xl shadow-[#F97171]/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                    >
                        Görevi Oluştur
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTodoModal;
