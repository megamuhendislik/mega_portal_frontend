import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

export const TELEGRAM_STATUS_EVENT = 'telegram-status-changed';

// Telegram bağlantı durumu; bağlanınca/kesilince 'telegram-status-changed' olayıyla yenilenir.
export default function useTelegramStatus() {
    const [status, setStatus] = useState(null);

    const refresh = useCallback(() => api.get('/telegram/status/')
        .then((res) => setStatus(res.data))
        .catch(() => setStatus(null)), []);

    useEffect(() => {
        refresh();
        window.addEventListener(TELEGRAM_STATUS_EVENT, refresh);
        return () => window.removeEventListener(TELEGRAM_STATUS_EVENT, refresh);
    }, [refresh]);

    return { status, refresh };
}
