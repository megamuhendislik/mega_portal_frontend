import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowsRightLeftIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    WrenchScrewdriverIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const BASE = '/system/health-check';

// saniye → "+12s 30d" / "-1s 05d" (null → —)
const fmtHM = (sec) => {
    if (sec === null || sec === undefined) return '—';
    const sign = sec < 0 ? '-' : '+';
    const s = Math.abs(Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${sign}${h}s ${String(m).padStart(2, '0')}d`;
};

const SEVERITY = {
    CRITICAL: { label: 'KRİTİK', cls: 'bg-red-100 text-red-700 border-red-200' },
    WARNING: { label: 'UYARI', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    OK: { label: 'SAĞLIKLI', cls: 'bg-green-100 text-green-700 border-green-200' },
};

const ISSUE_TR = {
    MISSING_ROW: 'Ay kaydı yok',
    REVERTED: 'Mutabakat sıfırlanmış (eski haline dönmüş)',
    COMP_DRIFT: 'Mutabakat tutarı kaymış',
    CHAIN_DRIFT: 'Sonraki ay devri bayat',
    YEAR_BOUNDARY: 'Yıl sınırı (Ocak devri sıfırlanır)',
};

export default function SettlementCarryAuditTab() {
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const fetchAudit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`${BASE}/settlement-carry-audit/`, { params: { only_issues: false } });
            setAudit(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Tarama hatası');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    const downloadTxt = async () => {
        try {
            const res = await api.get(`${BASE}/settlement-carry-audit-txt/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '').replace(/-/g, '');
            a.download = `mutabakat-ay-devri-${stamp}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e.response?.data?.error || e.message || 'Bilinmeyen'));
        }
    };

    const repair = async (body, confirmMsg) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(true);
        try {
            const res = await api.post(`${BASE}/settlement-carry-repair/`, body);
            await fetchAudit();
            alert(`Onarım tamam: ${res.data.repaired}/${res.data.requested} mutabakat düzeltildi.`);
        } catch (e) {
            alert('Onarım hatası: ' + (e.response?.data?.error || e.message || 'Bilinmeyen'));
        } finally {
            setBusy(false);
        }
    };

    const results = audit?.results || [];
    const issueRows = results.filter((r) => !r.ok);
    const sc = audit?.severity_counts || {};

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ArrowsRightLeftIcon className="w-6 h-6 text-indigo-600" />
                        Mutabakatlı Ay Devri
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Yapılan mutabakatların devir etkisinin (compensated) hâlâ sağlam olup olmadığını
                        denetler. "Eski haline dönmüş" (sıfırlanmış) mutabakatları tespit eder, TXT indirir
                        ve tek tıkla onarır (idempotent, bordro-güvenli).
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={fetchAudit}
                        disabled={loading || busy}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Yeniden Tara
                    </button>
                    <button
                        onClick={downloadTxt}
                        disabled={loading || !audit}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-indigo-200 bg-indigo-50 rounded-lg text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        TXT İndir
                    </button>
                    {issueRows.length > 0 && (
                        <button
                            onClick={() => repair({ all: true },
                                `${issueRows.length} sorunlu mutabakat onarılacak (compensated geri yüklenip devir yeniden hesaplanır). Devam?`)}
                            disabled={busy}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <WrenchScrewdriverIcon className="w-4 h-4" />
                            Tümünü Onar ({issueRows.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            {audit && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <SummaryCard label="Taranan Mutabakat" value={audit.checked} cls="text-gray-700" />
                    <SummaryCard label="Kritik (Sıfırlanmış)" value={sc.CRITICAL || 0} cls="text-red-600" />
                    <SummaryCard label="Uyarı (Kayma)" value={sc.WARNING || 0} cls="text-amber-600" />
                    <SummaryCard label="Sağlıklı" value={sc.OK || 0} cls="text-green-600" />
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[820px]">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3">Çalışan</th>
                            <th className="px-4 py-3">Mutabaklanan Ay</th>
                            <th className="px-4 py-3">Mutabakat Tutarı</th>
                            <th className="px-4 py-3">Şu anki compensated</th>
                            <th className="px-4 py-3">Devir (beklenen / fiili)</th>
                            <th className="px-4 py-3">Durum</th>
                            <th className="px-4 py-3 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && results.length === 0 && (
                            <tr><td colSpan="7" className="p-12 text-center text-gray-400">Taranıyor...</td></tr>
                        )}
                        {!loading && results.length === 0 && (
                            <tr><td colSpan="7" className="p-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <ShieldCheckIcon className="w-12 h-12 text-gray-200" />
                                    <div>Aktif mutabakat bulunamadı.</div>
                                </div>
                            </td></tr>
                        )}
                        {results
                            .slice()
                            .sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1))
                            .map((r) => {
                                const sev = SEVERITY[r.severity] || SEVERITY.OK;
                                return (
                                    <tr key={r.settlement_id} className={r.ok ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50'}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{r.employee_name}</div>
                                            <div className="text-xs text-gray-400">{r.employee_code}{r.department ? ` · ${r.department}` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-700">{r.year}/{String(r.month).padStart(2, '0')}</td>
                                        <td className="px-4 py-3 font-mono">{fmtHM(r.settled_amount_seconds)}</td>
                                        <td className={`px-4 py-3 font-mono ${!r.ok ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                            {fmtHM(r.current_compensated_seconds)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                            {fmtHM(r.expected_next_cumulative_seconds)} / {fmtHM(r.actual_next_cumulative_seconds)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${sev.cls}`}>
                                                {sev.label}
                                            </span>
                                            {!r.ok && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {r.issues.map((i) => ISSUE_TR[i] || i).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {r.ok ? (
                                                <CheckCircleIcon className="w-5 h-5 text-green-400 inline" />
                                            ) : (
                                                <button
                                                    onClick={() => repair({ items: [{ employee_id: r.employee_id, year: r.year, month: r.month }] })}
                                                    disabled={busy}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                                >
                                                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                                    Onar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {audit && issueRows.length === 0 && results.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tüm mutabakatlar sağlam — devir etkisi korunuyor.
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, cls }) {
    return (
        <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
    );
}
