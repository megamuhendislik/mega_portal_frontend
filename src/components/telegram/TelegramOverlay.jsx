import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Ortalanmış animasyonlu pencere; Escape ve X her zaman kapatır, arka plan tıklaması closeOnBackdrop ile.
const TelegramOverlay = ({ onClose, closeOnBackdrop = true, children }) => {
    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-prompt-backdrop"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Telegram bildirimleri"
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-5 relative animate-prompt-card"
            >
                <button
                    onClick={onClose}
                    aria-label="Kapat"
                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                    <X size={16} />
                </button>
                {children}
            </div>
        </div>
    );
};

export const TelegramSuccess = ({ onSettings, onClose }) => (
    <div className="animate-tg-step pr-6">
        <h3 className="font-bold text-slate-800 text-sm">Telegram hesabınız bağlandı.</h3>
        <p className="text-slate-500 text-[12px] mt-1">Bundan sonra seçtiğiniz bildirimler Telegram'a da gelir.</p>
        <div className="mt-4 flex items-center gap-2">
            <button
                onClick={onSettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
                Bildirim ayarları
            </button>
            <button
                onClick={onClose}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
                Kapat
            </button>
        </div>
    </div>
);

export default TelegramOverlay;
