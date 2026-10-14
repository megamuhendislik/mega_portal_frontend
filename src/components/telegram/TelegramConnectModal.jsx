import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import TelegramOverlay, { TelegramSuccess } from './TelegramOverlay';
import TelegramConnectFlow from './TelegramConnectFlow';

const ModalBody = ({ onClose }) => {
    const navigate = useNavigate();
    const [connected, setConnected] = useState(false);
    const onConnected = useCallback(() => setConnected(true), []);

    return (
        <TelegramOverlay onClose={onClose} closeOnBackdrop={false}>
            {connected ? (
                <TelegramSuccess
                    onSettings={() => { onClose(); navigate('/profile?tab=notifications'); }}
                    onClose={onClose}
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 pr-6 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Send size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">Telegram'a bağlan</h3>
                    </div>
                    <TelegramConnectFlow compact onConnected={onConnected} />
                </>
            )}
        </TelegramOverlay>
    );
};

const TelegramConnectModal = ({ open, onClose }) => (open ? <ModalBody onClose={onClose} /> : null);

export default TelegramConnectModal;
