import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import api from '../services/api';
import { shouldShowPrompt } from '../utils/telegramPrefs';
import TelegramOverlay, { TelegramSuccess } from './telegram/TelegramOverlay';
import TelegramConnectFlow from './telegram/TelegramConnectFlow';
import Expand from './telegram/Expand';

const TelegramConnectPrompt = ({ status }) => {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(() => shouldShowPrompt(status));
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const reported = useRef(false);

    useEffect(() => {
        if (!visible || reported.current) return;
        reported.current = true;
        api.post('/telegram/prompt/', { action: 'shown' }).catch(() => {});
    }, [visible]);

    const onConnected = useCallback(() => setConnected(true), []);

    if (!visible) return null;

    const close = () => setVisible(false);
    const dismiss = () => {
        setVisible(false);
        api.post('/telegram/prompt/', { action: 'dismiss' }).catch(() => {});
    };

    return (
        <TelegramOverlay onClose={close} closeOnBackdrop={!connecting && !connected}>
            {connected ? (
                <TelegramSuccess
                    onSettings={() => { close(); navigate('/profile?tab=notifications'); }}
                    onClose={close}
                />
            ) : (
                <>
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
                    {!connecting && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setConnecting(true)}
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
                    )}
                    <Expand open={connecting}>
                        {connecting && (
                            <div className="pt-4">
                                <TelegramConnectFlow compact onConnected={onConnected} />
                                <button
                                    onClick={() => setConnecting(false)}
                                    className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                                >
                                    Geri
                                </button>
                            </div>
                        )}
                    </Expand>
                </>
            )}
        </TelegramOverlay>
    );
};

export default TelegramConnectPrompt;
