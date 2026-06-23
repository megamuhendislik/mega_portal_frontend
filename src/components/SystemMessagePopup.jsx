import { useEffect, useState } from 'react';
import ModalOverlay from './ui/ModalOverlay';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';

const LEVEL_STYLES = {
  INFO:     { color: 'bg-blue-600',   Icon: Info },
  WARNING:  { color: 'bg-amber-500',  Icon: AlertTriangle },
  CRITICAL: { color: 'bg-red-600',    Icon: AlertOctagon },
};

export default function SystemMessagePopup() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.get('/system-messages/active/')
      .then((res) => { if (!cancelled) setQueue(Array.isArray(res.data) ? res.data : (res.data?.results ?? [])); })
      .catch(() => { /* sessizce atla — uygulamayı bloklama */ });
    return () => { cancelled = true; };
  }, [userId]);

  const current = queue[0];
  if (!current) return null;

  const { color, Icon } = LEVEL_STYLES[current.level] || LEVEL_STYLES.INFO;

  const closeSession = () => setQueue((q) => q.slice(1)); // sadece bu oturum — tekrar gösterilir

  const dontShowAgain = async () => {
    setBusy(true);
    try { await api.post(`/system-messages/${current.id}/dismiss/`); }
    catch { /* yine de kuyruktan düş */ }
    finally { setBusy(false); setQueue((q) => q.slice(1)); }
  };

  return (
    <ModalOverlay open onClose={closeSession} level="tertiary" closeOnOverlayClick={false}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`${color} p-5 text-white flex items-center gap-3`}>
          <Icon size={24} />
          <h3 className="text-lg font-semibold flex-1">{current.title}</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-700 whitespace-pre-wrap">{current.body}</p>
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={closeSession}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={dontShowAgain}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
            >
              Bir daha gösterme
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
