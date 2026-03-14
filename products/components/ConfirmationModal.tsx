import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    type = 'info',
}) => {
    if (!isOpen) return null;

    const colorMap = {
        danger: { bg: 'bg-red-500 hover:bg-red-600', icon: 'delete_forever', iconColor: 'text-red-500', iconBg: 'bg-red-50' },
        warning: { bg: 'bg-amber-500 hover:bg-amber-600', icon: 'warning', iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
        info: { bg: 'bg-[#663259] hover:bg-[#7a3d6b]', icon: 'help', iconColor: 'text-[#663259]', iconBg: 'bg-purple-50' },
    };

    const colors = colorMap[type];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onCancel}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col items-center text-center gap-3">
                    <div className={`w-14 h-14 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${colors.iconColor} text-[28px]`}>{colors.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
                <div className="flex gap-3 p-4 border-t border-gray-100">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors ${colors.bg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
