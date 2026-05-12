import React, { useState, useCallback } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    PlayIcon,
    BeakerIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const BUG_META = {
    BUG1: {
        title: 'BUG 1 — save() segments dedup',
        short: 'OvertimeRequest save() öncesi duplicate (start, end) tuple temizleme',
        color: 'border-blue-200 bg-blue-50',
        accent: 'bg-blue-600',
    },
    BUG2: {
        title: 'BUG 2 — claim_potential merged_segments dedup',
        short: 'Çoklu POTENTIAL claim sonrası segments dedup',
        color: 'border-violet-200 bg-violet-50',
        accent: 'bg-violet-600',
    },
    BUG3: {
        title: 'BUG 3 — cancel audit gap',
        short: 'CANCELLED tüm taleplerin RequestDecisionHistory CANCELLED satırı',
        color: 'border-emerald-200 bg-emerald-50',
        accent: 'bg-emerald-600',
    },
    BUG5: {
        title: 'BUG 5 — RE_REQUEST UX banner',
        short: 'Modal banner + eski tarih uyarısı (frontend smoke)',
        color: 'border-amber-200 bg-amber-50',
        accent: 'bg-amber-600',
    },
};

function StatusIcon({ passed }) {
    if (passed === true) {
        return <CheckCircleIcon className="w-6 h-6 text-emerald-600" />;
    }
    if (passed === false) {
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
    }
    return <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />;
}

function StatusLabel({ passed }) {
    if (passed === true) return <span className="text-emerald-700 font-bold">PASS</span>;
    if (passed === false) return <span className="text-red-700 font-bold">FAIL</span>;
    return <span className="text-amber-700 font-bold">SKIP</span>;
}

export default function FixValidationTab() {
    const [since, setSince] = useState('');  // ISO datetime
    const [sample, setSample] = useState(100);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const runValidation = useCallback(async (bugIds = null) => {
        setLoading(true);
        setError('');
        try {
            const body = {
                sample,
            };
            if (since) body.since = since;
            if (bugIds) body.bug_ids = bugIds;
            const res = await api.post('/system/health-check/fix-validation/', body);
            setData(res.data);
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [since, sample]);

    const downloadTxt = async () => {
        try {
            const params = new URLSearchParams();
            if (since) params.append('since', since);
            if (sample) params.append('sample', sample);
            const res = await api.get(
                `/system/health-check/fix-validation-txt/?${params.toString()}`,
                { responseType: 'blob' },
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: 'text/plain;charset=utf-8' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `kok-neden-dogrulama-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e?.response?.data?.error || e.message));
        }
    };

    const results = data?.results || {};
    const summary = data?.summary || {};

    return (
        <div className="space-y-4">
            {/* Header + controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BeakerIcon className="w-5 h-5 text-indigo-600" />
                    Kök Neden Doğrulama
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    4 bug fix'in (BUG 1, 2, 3, 5) canlı veride çalışıp çalışmadığını
                    sayısal kanıtla doğrular. Salt okuma — schema değişikliği yok.
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" /> Since (ISO datetime, boş = deploy default)
                        </label>
                        <input type="datetime-local" value={since}
                            onChange={(e) => setSince(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Sample (BUG 3 başına)</label>
                        <input type="number" value={sample}
                            onChange={(e) => setSample(parseInt(e.target.value, 10) || 100)}
                            min="10" max="1000"
                            className="border rounded px-3 py-1.5 text-sm w-24" />
                    </div>
                    <button onClick={() => runValidation()} disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                        <PlayIcon className="w-4 h-4" />
                        {loading ? 'Doğrulanıyor...' : 'Hepsini Doğrula'}
                    </button>
                    {data && (
                        <button onClick={downloadTxt}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                        </button>
                    )}
                </div>

                {summary.total_bugs > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Genel" value={summary.all_passed ? 'BAŞARILI' : 'KISMEN'}
                            color={summary.all_passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'} />
                        <SummaryCard label="PASS" value={summary.passed} color="bg-emerald-50 text-emerald-800" />
                        <SummaryCard label="FAIL" value={summary.failed} color="bg-red-50 text-red-800" />
                        <SummaryCard label="SKIP" value={summary.skipped} color="bg-amber-50 text-amber-800" />
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                    {error}
                </div>
            )}

            {/* 4 validator cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['BUG1', 'BUG2', 'BUG3', 'BUG5'].map((bugId) => (
                    <BugCard
                        key={bugId}
                        bugId={bugId}
                        result={results[bugId]}
                        loading={loading}
                        onRun={() => runValidation([bugId])}
                    />
                ))}
            </div>

            {data && (
                <div className="text-xs text-gray-500 text-right">
                    Rapor: {data.generated_at} | Since: {data.since || '(default)'}
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div className={`border rounded-lg p-3 ${color}`}>
            <div className="text-xs font-medium">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
}

function BugCard({ bugId, result, loading, onRun }) {
    const meta = BUG_META[bugId];
    return (
        <div className={`border-2 rounded-xl p-4 ${meta.color}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded ${meta.accent}`}>
                        {bugId}
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm">{meta.title}</h3>
                </div>
                {result && <StatusIcon passed={result.passed} />}
            </div>
            <p className="text-xs text-gray-600 mb-3">{meta.short}</p>

            {!result && (
                <button onClick={onRun} disabled={loading}
                    className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded font-bold disabled:opacity-50">
                    Doğrula
                </button>
            )}

            {result && (
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                        <span>Sonuç:</span>
                        <StatusLabel passed={result.passed} />
                    </div>

                    {result.total_scanned !== undefined && (
                        <div className="text-xs text-gray-700">
                            Taranan: <strong>{result.total_scanned}</strong>{' '}
                            | İhlal: <strong>{result.violation_count}</strong>
                        </div>
                    )}
                    {result.total_checked !== undefined && (
                        <div className="text-xs text-gray-700">
                            Kontrol: <strong>{result.total_checked}</strong>{' '}
                            | Audit Coverage: <strong>{result.audit_coverage_pct ?? '—'}%</strong>{' '}
                            | İhlal: <strong>{result.violation_count}</strong>
                        </div>
                    )}

                    {result.per_type_stats && result.per_type_stats.length > 0 && (
                        <div className="text-xs bg-white border rounded p-2">
                            <div className="font-bold mb-1">Tip Coverage:</div>
                            <div className="grid grid-cols-5 gap-1">
                                {result.per_type_stats.map((s) => (
                                    <div key={s.type} className="text-center">
                                        <div className="font-mono text-[10px]">{s.type}</div>
                                        <div className={`text-sm font-bold ${(s.coverage_pct ?? 100) === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {s.coverage_pct ?? '—'}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.violations_sample && result.violations_sample.length > 0 && (
                        <details className="text-xs">
                            <summary className="cursor-pointer font-bold text-red-700">
                                İhlal Örnekleri ({result.violations_sample.length})
                            </summary>
                            <pre className="mt-2 bg-white p-2 rounded border max-h-64 overflow-auto text-[10px]">
                                {JSON.stringify(result.violations_sample, null, 2)}
                            </pre>
                        </details>
                    )}

                    {result.info && result.test_steps && (
                        <details className="text-xs" open>
                            <summary className="cursor-pointer font-bold text-amber-700">
                                Manuel Test Adımları
                            </summary>
                            <ol className="mt-2 list-decimal list-inside space-y-0.5 text-gray-700">
                                {result.test_steps.map((s, i) => <li key={i}>{s.replace(/^\d+\. /, '')}</li>)}
                            </ol>
                        </details>
                    )}

                    <button onClick={onRun} disabled={loading}
                        className="text-xs text-indigo-600 hover:underline font-bold">
                        Tekrar doğrula
                    </button>
                </div>
            )}
        </div>
    );
}
