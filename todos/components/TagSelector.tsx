import React, { useState, useEffect, useRef } from 'react';
import { Tag } from '../types';
import { todoService } from '../service';
import { Plus, X, Check, Settings, Edit2, Trash2 } from 'lucide-react';

const COLOR_OPTIONS = [
    { value: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500' },
    { value: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' },
    { value: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    { value: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' },
    { value: 'bg-green-100 text-green-600', dot: 'bg-green-500' },
    { value: 'bg-orange-100 text-orange-600', dot: 'bg-orange-500' },
    { value: 'bg-pink-100 text-pink-600', dot: 'bg-pink-500' },
    { value: 'bg-yellow-100 text-yellow-600', dot: 'bg-yellow-500' },
];

const getDotColor = (color: string) => {
    const match = COLOR_OPTIONS.find(c => c.value === color);
    return match?.dot || 'bg-gray-500';
};

interface TagSelectorProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTagIds, onChange }) => {
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(COLOR_OPTIONS[0].value);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const manageRef = useRef<HTMLDivElement>(null);

    const fetchTags = async () => {
        const tags = await todoService.getTags();
        setAllTags(tags);
    };

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (manageRef.current && !manageRef.current.contains(e.target as Node)) {
                setShowManage(false);
                setEditingTagId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            onChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onChange([...selectedTagIds, tagId]);
        }
    };

    const handleAddNewTag = async () => {
        if (!newTagName.trim()) return;
        const newTag: Tag = {
            id: `tag-${crypto.randomUUID().slice(0, 8)}`,
            name: newTagName.trim(),
            color: newTagColor,
        };
        try {
            await todoService.addTag(newTag);
            setAllTags(prev => [...prev, newTag]);
            onChange([...selectedTagIds, newTag.id]);
            setNewTagName('');
            setNewTagColor(COLOR_OPTIONS[0].value);
        } catch (error) {
            console.error('Etiket eklenemedi:', error);
        }
    };

    const handleUpdateTag = async (tag: Tag) => {
        const updated = { ...tag, name: editName.trim(), color: editColor };
        try {
            await todoService.updateTag(updated);
            setAllTags(prev => prev.map(t => t.id === tag.id ? updated : t));
            setEditingTagId(null);
        } catch (error) {
            console.error('Etiket güncellenemedi:', error);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        try {
            await todoService.deleteTag(tagId);
            setAllTags(prev => prev.filter(t => t.id !== tagId));
            onChange(selectedTagIds.filter(id => id !== tagId));
        } catch (error) {
            console.error('Etiket silinemedi:', error);
        }
    };

    const startEdit = (tag: Tag) => {
        setEditingTagId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Etiketler</label>
                <button
                    type="button"
                    onClick={() => { setShowManage(!showManage); setShowDropdown(false); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-[#F97171] transition-colors"
                >
                    <Settings size={12} />
                    Yönet
                </button>
            </div>

            {/* Selected Tags + Add Button */}
            <div className="flex flex-wrap items-center gap-2 relative">
                {selectedTags.map(tag => (
                    <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wider transition-all group ${tag.color} ring-2 ring-offset-1 ring-current/20`}
                    >
                        {tag.name}
                        <X size={12} className="opacity-50 group-hover:opacity-100" />
                    </button>
                ))}

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => { setShowDropdown(!showDropdown); setShowManage(false); }}
                        className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#F97171] hover:text-[#F97171] transition-all"
                    >
                        <Plus size={16} />
                    </button>

                    {/* Tag Selection Dropdown */}
                    {showDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-[260px] bg-white rounded-[16px] shadow-2xl border border-gray-100 z-50 overflow-hidden">
                            {/* Existing tags */}
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-2">
                                {allTags.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-400 text-center italic">Henüz etiket yok</div>
                                ) : (
                                    allTags.map(tag => {
                                        const isSelected = selectedTagIds.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTag(tag.id)}
                                                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl transition-all text-left ${isSelected ? 'bg-[#F97171]/5' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-3 h-3 rounded-full ${getDotColor(tag.color)}`} />
                                                    <span className="text-sm font-bold text-gray-700">{tag.name}</span>
                                                </div>
                                                {isSelected && <Check size={14} className="text-[#F97171]" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Add new tag */}
                            <div className="border-t border-gray-100 p-3 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewTag(); } }}
                                        placeholder="Yeni etiket adı..."
                                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#F97171]/20 focus:border-[#F97171]/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddNewTag}
                                        disabled={!newTagName.trim()}
                                        className="p-2 rounded-lg bg-[#F97171] text-white hover:bg-[#E05A5A] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Color picker */}
                                <div className="flex items-center gap-1.5">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setNewTagColor(c.value)}
                                            className={`w-5 h-5 rounded-full ${c.dot} transition-all ${newTagColor === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tag Management Panel */}
            {showManage && (
                <div ref={manageRef} className="mt-3 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-3 space-y-1">
                        {allTags.length === 0 ? (
                            <div className="p-3 text-xs text-gray-400 text-center italic">Henüz etiket yok</div>
                        ) : (
                            allTags.map(tag => (
                                <div key={tag.id}>
                                    {editingTagId === tag.id ? (
                                        /* Edit Mode */
                                        <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-1">
                                                {COLOR_OPTIONS.map(c => (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        onClick={() => setEditColor(c.value)}
                                                        className={`w-4 h-4 rounded-full ${c.dot} transition-all ${editColor === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-50 hover:opacity-100'}`}
                                                    />
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateTag(tag); } }}
                                                className="flex-1 text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#F97171]/20"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateTag(tag)}
                                                className="p-1.5 rounded-lg bg-[#F97171] text-white hover:bg-[#E05A5A] transition-all"
                                            >
                                                <Check size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingTagId(null)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-all group">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-3 h-3 rounded-full ${getDotColor(tag.color)}`} />
                                                <span className="text-xs font-bold text-gray-700">{tag.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(tag)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagSelector;
