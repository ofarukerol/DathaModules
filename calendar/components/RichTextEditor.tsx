import { useRef, useCallback, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    accentColor?: string;
}

interface ToolbarButton {
    command: string;
    icon: string;
    title: string;
    arg?: string;
}

const TOOLBAR_GROUPS: ToolbarButton[][] = [
    [
        { command: 'bold', icon: 'format_bold', title: 'Kalın' },
        { command: 'italic', icon: 'format_italic', title: 'İtalik' },
        { command: 'underline', icon: 'format_underlined', title: 'Altı Çizili' },
        { command: 'strikeThrough', icon: 'strikethrough_s', title: 'Üstü Çizili' },
    ],
    [
        { command: 'insertUnorderedList', icon: 'format_list_bulleted', title: 'Madde Listesi' },
        { command: 'insertOrderedList', icon: 'format_list_numbered', title: 'Numaralı Liste' },
    ],
    [
        { command: 'justifyLeft', icon: 'format_align_left', title: 'Sola Hizala' },
        { command: 'justifyCenter', icon: 'format_align_center', title: 'Ortala' },
        { command: 'justifyRight', icon: 'format_align_right', title: 'Sağa Hizala' },
    ],
    [
        { command: 'createLink', icon: 'link', title: 'Bağlantı Ekle' },
        { command: 'removeFormat', icon: 'format_clear', title: 'Biçimi Temizle' },
    ],
];

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'İçerik yazın...',
    minHeight = 120,
    accentColor = '#663259',
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    // Sync external value → editor (only on mount or when value changes externally)
    useEffect(() => {
        if (editorRef.current && !isInternalUpdate.current) {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value;
            }
        }
        isInternalUpdate.current = false;
    }, [value]);

    const updateActiveFormats = useCallback(() => {
        const formats = new Set<string>();
        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('underline')) formats.add('underline');
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
        if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
        if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
        if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
        if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
        setActiveFormats(formats);
    }, []);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            isInternalUpdate.current = true;
            onChange(editorRef.current.innerHTML);
            updateActiveFormats();
        }
    }, [onChange, updateActiveFormats]);

    const handleKeyUp = useCallback(() => {
        updateActiveFormats();
    }, [updateActiveFormats]);

    const handleMouseUp = useCallback(() => {
        updateActiveFormats();
    }, [updateActiveFormats]);

    const execCommand = useCallback((command: string, arg?: string) => {
        editorRef.current?.focus();

        if (command === 'createLink') {
            const selection = window.getSelection();
            const selectedText = selection?.toString() || '';
            const url = prompt('Bağlantı URL\'si girin:', selectedText.startsWith('http') ? selectedText : 'https://');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        } else {
            document.execCommand(command, false, arg);
        }

        handleInput();
        updateActiveFormats();
    }, [handleInput, updateActiveFormats]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);

    const isEmpty = !value || value === '<br>' || value === '<div><br></div>' || value.replace(/<[^>]*>/g, '').trim() === '';

    return (
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white focus-within:border-opacity-50 focus-within:ring-2 focus-within:ring-opacity-20 transition-all"
            style={{
                // @ts-expect-error CSS custom property
                '--accent': accentColor,
                borderColor: undefined,
            }}
            onFocus={(e) => {
                const container = e.currentTarget;
                container.style.borderColor = `${accentColor}50`;
                container.style.boxShadow = `0 0 0 2px ${accentColor}20`;
            }}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    const container = e.currentTarget;
                    container.style.borderColor = '';
                    container.style.boxShadow = '';
                }
            }}
        >
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-100 flex-wrap">
                {TOOLBAR_GROUPS.map((group, gi) => (
                    <div key={gi} className="flex items-center gap-0.5">
                        {gi > 0 && <div className="w-px h-5 bg-gray-200 mx-1" />}
                        {group.map((btn) => {
                            const isActive = activeFormats.has(btn.command);
                            return (
                                <button
                                    key={btn.command}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand(btn.command, btn.arg)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                        isActive
                                            ? 'text-white shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                    }`}
                                    style={isActive ? { backgroundColor: accentColor } : undefined}
                                    title={btn.title}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div className="relative">
                {isEmpty && (
                    <div className="absolute top-0 left-0 right-0 px-4 py-3 text-sm text-gray-400 pointer-events-none select-none">
                        {placeholder}
                    </div>
                )}
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onKeyUp={handleKeyUp}
                    onMouseUp={handleMouseUp}
                    onPaste={handlePaste}
                    className="px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto custom-scrollbar prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                    style={{ minHeight }}
                />
            </div>
        </div>
    );
}
