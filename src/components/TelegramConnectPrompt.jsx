import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import api from '../services/api';
import { TELEGRAM_PROMPT_SEEN_KEY, shouldShowPrompt } from '../utils/telegramPrefs';

function readSeen() {
    try {
        return !!sessionStorage.getItem(TELEGRAM_PROMPT_SEEN_KEY);
    } catch {
        return false;
    }
}

const TelegramConnectPrompt = ({ status }) => {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(() => shouldShowPrompt(status, readSeen()));
    const reported = useRef(false);

    useEffect(() => {
        if (!visible || reported.current) return;
        reported.current = true;
        try {
            sessionStorage.setItem(TELEGRAM_PROMPT_SEEN_KEY, '1');
        } catch {
            // depolama kapalıysa sunucu sayacı yine de işler
        }
        api.post('/telegram/prompt/', { action: 'shown' }).catch(() => {});
    }, [visible]);

    if (!visible) return null;

    const close = () => setVisible(false);
    const connect = () => {
        setVisible(false);
        navigate('/profile?tab=notifications');
    };
    const dismiss = () => {
        setVisible(false);
        api.post('/telegram/prompt/', { action: 'dismiss' }).catch(() => {});
    };

    return (
        <div className="fixed z-50 bottom-0 inset-x-0 p-3 md:inset-x-auto md:right-6 md:bottom-6 md:p-0 md:w-96 animate-prompt-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 relative">
                <button
                    onClick={close}
                    aria-label="Kapat"
                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                    <X size={16} />
                </button>
                <div className="flex items-start gap-3 pr-6">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Send size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Telegram bildirimleri</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mt-1">
                            Bildirimlerinizi Telegram'dan da alabilirsiniz. Onay bekleyen talepler ve sonuçlar telefonunuza gelir.
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        onClick={connect}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        Bağla
                    </button>
                    <button
                        onClick={close}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Daha sonra
                    </button>
                    <button
                        onClick={dismiss}
                        className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                    >
                        Bir daha gösterme
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TelegramConnectPrompt;
