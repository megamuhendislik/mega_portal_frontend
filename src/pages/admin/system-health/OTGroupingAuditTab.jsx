import React, { useState } from 'react';
import api from '../../../services/api';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_DOT = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-blue-500',
};

export default function OTGroupingAuditTab() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [expandedCat, setExpandedCat] = useState(null);

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const body = { format: 'json' };
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            if (employeeId) body.employee_id = parseInt(employeeId);

            const res = await api.post('/system/health-check/ot-grouping-audit/', body);
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadTxt = async () => {
        try {
            const body = { format: 'txt' };
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            if (employeeId) body.employee_id = parseInt(employeeId);

            const res = await api.post('/system/health-check/ot-grouping-audit/', body, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ot_grouping_audit_${dateFrom || 'all'}_${dateTo || 'today'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('TXT indirme hatası: ' + (err.message || 'bilinmeyen'));
        }
    };

    const [fixing, setFixing] = useState(false);
    const [fixResult, setFixResult] = useState(null);

    const runFix = async () => {
        if (!window.confirm(
            `${totalIssues} sorun tespit edildi. Sorunlu günler için recalculate çalıştırılacak.\n\nDevam etmek istiyor musunuz?`
        )) return;

        setFixing(true);
        setError(null);
        try {
            const body = { format: 'json', mode: 'fix' };
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            if (employeeId) body.employee_id = parseInt(employeeId);

            const res = await api.post('/system/health-check/ot-grouping-audit/', body);
            setFixResult(res.data);
            // Post-scan sonuçlarını göster
            if (res.data.post_scan) {
                setResults(res.data.post_scan);
            }
        } catch (err) {
            setError('Düzeltme hatası: ' + (err.response?.data?.error || err.message));
        } finally {
            setFixing(false);
        }
    };

    const categories = results ? Object.entries(results.categories) : [];
    const totalIssues = results?.total_issues || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-1">OT Gruplama Denetimi</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Ek mesai taleplerinde timezone uyumsuzluğu, gruplama hatası ve eksik POTENTIAL tespiti.
                </p>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Çalışan ID (opsiyonel)</label>
                        <input
                            type="number"
                            value={employeeId}
                            onChange={e => setEmployeeId(e.target.value)}
                            placeholder="Tümü"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <button
                        onClick={runAudit}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {loading ? 'Taranıyor...' : 'Tara'}
                    </button>
                    {results && (
                        <>
                            <button
                                onClick={downloadTxt}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                TXT İndir
                            </button>
                            {totalIssues > 0 && (
                                <button
                                    onClick={runFix}
                                    disabled={fixing}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    {fixing ? 'Düzeltiliyor...' : `Düzelt (${totalIssues})`}
                                </button>
                            )}
                        </>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                )}

                {fixResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-bold text-green-800 mb-2">
                            Düzeltme tamamlandı — {fixResult.fixed_count} gün recalculate edildi
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {fixResult.fix_log?.map((line, i) => (
                                <p key={i} className="text-xs text-green-700 font-mono">{line}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {results && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Toplam Sorun</p>
                            <p className={`text-3xl font-black ${totalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {totalIssues}
                            </p>
                        </div>
                        {['HIGH', 'MEDIUM', 'LOW'].map(sev => {
                            const count = categories.reduce((sum, [, cat]) =>
                                sum + (cat.severity === sev ? cat.count : 0), 0);
                            return (
                                <div key={sev} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{sev}</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[sev]}`} />
                                        <span className="text-3xl font-black text-gray-700">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Category Accordion */}
                    <div className="space-y-3">
                        {categories.map(([catKey, catData]) => (
                            <div key={catKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[catData.severity]}`} />
                                        <span className="font-bold text-gray-800 text-sm">{catData.label}</span>
                                        <span className="text-xs text-gray-400 font-mono">{catKey}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_COLORS[catData.severity]}`}>
                                            {catData.count} sorun
                                        </span>
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCat === catKey ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {expandedCat === catKey && catData.issues.length > 0 && (
                                    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50 space-y-3 max-h-[500px] overflow-y-auto">
                                        {catData.issues.map((issue, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                                                    <span className="font-bold text-gray-800 text-sm">{issue.employee_name}</span>
                                                    <span className="text-xs text-gray-400 font-mono">{issue.date}</span>
                                                    {issue.ot_id && (
                                                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">
                                                            OT #{issue.ot_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 font-mono leading-relaxed">{issue.description}</p>

                                                {/* TZ_MISMATCH extra */}
                                                {catKey === 'TZ_MISMATCH' && (
                                                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                                        <p>Attendance #{issue.att_id}: check_in = <span className="font-bold text-red-600">{issue.att_check_in_utc} UTC</span> → <span className="font-bold text-green-600">{issue.att_check_in_istanbul} Istanbul</span></p>
                                                        <p>OT start: <span className="font-bold text-red-600">{issue.ot_start}</span> (UTC ile eşleşiyor → hatalı)</p>
                                                    </div>
                                                )}

                                                {/* FRAGMENT extra */}
                                                {catKey === 'FRAGMENT_BELOW_MIN' && issue.same_day_attendance?.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs font-bold text-gray-500 mb-1">Aynı gün attendance:</p>
                                                        <div className="space-y-1">
                                                            {issue.same_day_attendance.map((a, i) => (
                                                                <p key={i} className="text-xs text-gray-500 font-mono">
                                                                    ATT #{a.att_id}: {a.check_in}-{a.check_out} ({Math.floor(a.duration_s / 60)}dk) [{a.source}]
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* UNGROUPED extra */}
                                                {catKey === 'UNGROUPED_NEIGHBORS' && (
                                                    <div className="mt-2 space-y-1">
                                                        {issue.ot_records?.map((o, i) => (
                                                            <p key={i} className="text-xs text-gray-500 font-mono">
                                                                OT #{o.ot_id}: {o.start}-{o.end} ({Math.floor(o.duration_s / 60)}dk) [{o.status}] group={o.group_key}
                                                            </p>
                                                        ))}
                                                        {issue.pair_details?.map((pd, i) => (
                                                            <p key={`p${i}`} className="text-xs text-amber-600 font-mono">→ {pd}</p>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* MISSING_POTENTIAL extra */}
                                                {catKey === 'MISSING_POTENTIAL' && issue.attendance_records?.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {issue.attendance_records.map((a, i) => (
                                                            <p key={i} className="text-xs text-gray-500 font-mono">
                                                                ATT #{a.att_id}: {a.check_in}-{a.check_out} OT={Math.floor(a.ot_seconds / 60)}dk [{a.status}]
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {expandedCat === catKey && catData.issues.length === 0 && (
                                    <div className="border-t border-gray-100 px-5 py-6 bg-green-50/30 text-center">
                                        <p className="text-sm text-green-600 font-medium">Sorun bulunamadı</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="text-xs text-gray-400 text-right">
                        Tarama süresi: {results.elapsed_seconds}s | Aralık: {results.date_range.start} — {results.date_range.end}
                    </div>
                </>
            )}
        </div>
    );
}
