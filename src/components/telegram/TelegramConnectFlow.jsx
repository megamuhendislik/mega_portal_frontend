import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCode, message } from 'antd';
import { Monitor, QrCode } from 'lucide-react';
import api from '../../services/api';
import { telegramCodeExpiryMs } from '../../utils/telegramPrefs';

const POLL_MS = 3000;

const SecondaryButton = ({ onClick, disabled, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
    >
        {children}
    </button>
);

const OptionTile = ({ icon: Icon, title, text, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex-1 flex items-start gap-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors p-4 text-left disabled:opacity-60"
    >
        <Icon size={20} className="text-sky-600 shrink-0 mt-0.5" />
        <span>
            <span className="block text-sm font-bold text-slate-800">{title}</span>
            <span className="block text-[12px] text-slate-500 mt-1 leading-relaxed">{text}</span>
        </span>
    </button>
);

// Telegram bağlama akışı: seçim, masaüstü veya QR; bağlantı kurulunca onConnected çağrılır.
const TelegramConnectFlow = ({ onConnected, compact = false }) => {
    const [step, setStep] = useState('choose');
    const [busy, setBusy] = useState(false);
    const [qrUrl, setQrUrl] = useState(null);
    const [expired, setExpired] = useState(false);
    const [waitingUntil, setWaitingUntil] = useState(null);
    const [pendingRelink, setPendingRelink] = useState(false);
    const onConnectedRef = useRef(onConnected);
    const doneRef = useRef(false);

    useEffect(() => {
        onConnectedRef.current = onConnected;
    }, [onConnected]);

    // Telegram'da "Başlat"a basıldıktan sonra bağlantıyı yakala: 3 sn aralıkla ve sekmeye dönünce, kodun süresi dolana kadar.
    useEffect(() => {
        if (!waitingUntil) return undefined;
        const tick = async () => {
            if (doneRef.current) return;
            try {
                const res = await api.get('/telegram/status/');
                if (res.data?.connected && !doneRef.current) {
                    doneRef.current = true;
                    setWaitingUntil(null);
                    window.dispatchEvent(new Event('telegram-status-changed'));
                    onConnectedRef.current?.();
                    return;
                }
                setPendingRelink(!!res.data?.pending_relink);
            } catch {
                // geçici hata: bir sonraki turda tekrar denenir
            }
            if (!doneRef.current && Date.now() >= waitingUntil) {
                setWaitingUntil(null);
                setPendingRelink(false);
                setExpired(true);
            }
        };
        const timer = setInterval(tick, POLL_MS);
        window.addEventListener('focus', tick);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', tick);
        };
    }, [waitingUntil]);

    const openDesktop = async () => {
        // Açılır pencere engellenmesin diye sekme tıklama anında açılır, link gelince yönlendirilir
        const win = window.open('about:blank', '_blank');
        setBusy(true);
        try {
            const res = await api.post('/telegram/me/connect/');
            if (win) {
                win.opener = null;
                win.location.href = res.data.url;
            } else {
                window.location.href = res.data.url;
            }
            setExpired(false);
            setStep('desktop');
            setWaitingUntil(telegramCodeExpiryMs(res.data.expires_at));
        } catch {
            if (win) win.close();
            message.error('Bağlantı linki oluşturulamadı.');
        } finally {
            setBusy(false);
        }
    };

    const showQr = async () => {
        setBusy(true);
        try {
            const res = await api.post('/telegram/me/connect/');
            setQrUrl(res.data.url);
            setExpired(false);
            setStep('qr');
            setWaitingUntil(telegramCodeExpiryMs(res.data.expires_at));
        } catch {
            message.error('QR kod oluşturulamadı.');
        } finally {
            setBusy(false);
        }
    };

    const back = useCallback(() => {
        setStep('choose');
        setQrUrl(null);
        setExpired(false);
        setWaitingUntil(null);
    }, []);

    const relinkNotice = pendingRelink && (
        <p className="text-[12px] text-amber-700">
            Bu Telegram hesabı başka bir Mega Portal hesabına bağlı. Devam etmek için Telegram'daki onay mesajında "Evet, bu hesaba bağla"ya basın.
        </p>
    );

    return (
        <div key={step} className="animate-tg-step space-y-3">
            {step === 'choose' && (
                <>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Nasıl bağlamak istersiniz?</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">Hangi Telegram hesabında Başlat'a basarsanız o hesap bağlanır.</p>
                    </div>
                    <div className={`flex gap-3 ${compact ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                        <OptionTile
                            icon={Monitor}
                            title="Masaüstü uygulamasıyla bağlan"
                            text="Bilgisayarınızda Telegram kuruluysa uygulama açılır, Başlat'a basmanız yeterli."
                            onClick={openDesktop}
                            disabled={busy}
                        />
                        <OptionTile
                            icon={QrCode}
                            title="Telefonla QR okut"
                            text="Telefonunuzdaki Telegram hesabını bağlamak için kodu kamerayla okutun."
                            onClick={showQr}
                            disabled={busy}
                        />
                    </div>
                </>
            )}
            {step === 'desktop' && (
                <>
                    <p className="text-[12px] text-sky-700">
                        Telegram açıldı. Başlat'a basın, bağlantı kurulunca burası kendiliğinden güncellenir.
                    </p>
                    {relinkNotice}
                    {expired && <p className="text-[12px] text-amber-700">Kodun süresi doldu, tekrar açın.</p>}
                    <div className="flex gap-2">
                        <SecondaryButton onClick={openDesktop} disabled={busy}>Tekrar aç</SecondaryButton>
                        <SecondaryButton onClick={back}>Geri</SecondaryButton>
                    </div>
                </>
            )}
            {step === 'qr' && (
                <div className="flex flex-col items-start gap-3">
                    <QRCode
                        value={qrUrl || ' '}
                        size={180}
                        status={expired ? 'expired' : 'active'}
                        onRefresh={showQr}
                    />
                    <p className="text-[12px] text-sky-700">
                        Telefonunuzun kamerasıyla okutun ve açılan Telegram'da Başlat'a basın. Kod 15 dakika geçerli.
                    </p>
                    {relinkNotice}
                    <div className="flex gap-2">
                        <SecondaryButton onClick={showQr} disabled={busy}>Yeni kod</SecondaryButton>
                        <SecondaryButton onClick={back}>Geri</SecondaryButton>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelegramConnectFlow;
