import React, { useState, useCallback } from 'react';
import { MagnifyingGlassIcon, TrashIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';

const SCAN = '/system/health-check/stale-potential-scan/';
const APPLY = '/system/health-check/stale-potential-apply/';
const TXT = '/system/health-check/stale-potential-txt/';

export default function StalePotentialCleanup() {
    const [scan, setScan] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const runScan = useCallback(async () => {
        setBusy(true); setError(''); setNotice('');
        try {
            const { data } = await api.post(SCAN, {}, { timeout: 600000 });
            setScan(data);
        } catch (e) {
            setError(e?.response?.data?.error || 'Tarama sırasında hata oluştu.');
        } finally {
            setBusy(false);
        }
    }, []);

    const runApply = useCallback(async () => {
        if (!scan || scan.total === 0) return;
        if (!window.confirm(`${scan.total} eski potansiyel mesai kaydı KALICI olarak silinecek. Onaylıyor musunuz?`)) return;
        setBusy(true); setError(''); setNotice('');
        try {
            const { data } = await api.post(APPLY, {}, { timeout: 600000 });
            setNotice(`${data.deleted} eski potansiyel silindi (${data.employee_count} çalışan).`);
            await runScan();
        } catch (e) {
            setError(e?.response?.data?.error || 'Temizlik sırasında hata oluştu.');
        } finally {
            setBusy(false);
        }
    }, [scan, runScan]);

    const downloadTxt = useCallback(async () => {
        setError('');
        try {
            const { data } = await api.get(TXT, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([data], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'eski_potansiyel_temizlik.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setError('TXT raporu indirilemedi.');
        }
    }, []);

    return (
        <div className="bg-white rounded-xl border border-amber-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TrashIcon className="w-5 h-5 text-amber-600" /> Eski Potansiyelleri Temizle
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                        Retro pencere (içinde bulunulan + 2 önceki mali dönem) dışındaki, artık talep edilemeyen
                        potansiyel mesai kayıtlarını siler. Bordroya, onaylı ve bekleyen taleplere etkisi yoktur.
                        Önce "Tara" ile önizleyin, sonra "Temizle" ile silin.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={runScan} disabled={busy}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors">
                        {busy ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        Tara (Dry-run)
                    </button>
                    <button onClick={runApply} disabled={busy || !scan || scan.total === 0}
                        title={!scan ? 'Önce Tara' : (scan.total === 0 ? 'Silinecek eski potansiyel yok' : 'Eski potansiyelleri sil')}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <TrashIcon className="w-4 h-4" /> Temizle
                    </button>
                    <button onClick={downloadTxt} disabled={busy || !scan}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ArrowDownTrayIcon className="w-4 h-4" /> TXT
                    </button>
                </div>
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{error}</div>}
            {notice && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-2">{notice}</div>}
            {scan && (
                <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                        Toplam {scan.total} eski potansiyel · {scan.employee_count} çalışan
                    </div>
                    {scan.total > 0 && (
                        <div className="max-h-64 overflow-y-auto text-xs border border-gray-100 rounded-lg">
                            {scan.by_employee.map((e) => (
                                <div key={e.employee_id} className="flex justify-between border-b border-gray-50 px-3 py-1.5 last:border-0">
                                    <span className="text-gray-700">{e.employee_name}</span>
                                    <span className="text-gray-500">{e.count} kayıt · kesim &lt; {e.cutoff}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
