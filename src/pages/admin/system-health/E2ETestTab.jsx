import React, { useState, useRef } from 'react';
import api from '../../../services/api';

const GROUP_COLORS = {
    SETUP: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    TALEP: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ONAY: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    KURAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'DOĞRULAMA': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    CLEANUP: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const STATUS_STYLES = {
    PASS: 'bg-green-100 text-green-800 border-green-300',
    FAIL: 'bg-red-100 text-red-800 border-red-300',
    ERROR: 'bg-orange-100 text-orange-800 border-orange-300',
};

export default function E2ETestTab() {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(null);
    const [results, setResults] = useState(null);
    const [expandedTest, setExpandedTest] = useState(null);
    const [cleaning, setCleaning] = useState(false);
    const [cleanResult, setCleanResult] = useState(null);
    const pollRef = useRef(null);

    const startTests = async () => {
        setRunning(true);
        setResults(null);
        setProgress(null);
        setCleanResult(null);

        try {
            const { data } = await api.post('/system/health-check/run-e2e-tests/');
            const taskId = data.task_id;
            pollStatus(taskId);
        } catch (err) {
            setRunning(false);
            setResults({ success: false, error: err.response?.data?.error || err.message });
        }
    };

    const pollStatus = (taskId) => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/system/health-check/get-test-status/?task_id=${taskId}`);

                if (data.state === 'PROGRESS') {
                    setProgress(data);
                } else if (data.state === 'SUCCESS') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setResults(data.result);
                    setProgress(null);
                    setRunning(false);
                } else if (data.state === 'FAILURE') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setResults({ success: false, error: data.error || 'Task failed' });
                    setProgress(null);
                    setRunning(false);
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, 1500);
    };

    const cleanup = async () => {
        setCleaning(true);
        setCleanResult(null);
        try {
            const { data } = await api.post('/system/health-check/cleanup-e2e-data/');
            setCleanResult(data);
        } catch (err) {
            setCleanResult({ logs: [{ level: 'ERROR', message: err.response?.data?.error || err.message }] });
        } finally {
            setCleaning(false);
        }
    };

    const summary = results?.summary;
    const testResults = results?.results || [];
    const progressInfo = progress;

    // Group tests
    const groups = {};
    testResults.forEach(t => {
        if (!groups[t.group]) groups[t.group] = [];
        groups[t.group].push(t);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">E2E Sistem Testleri</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Gerçek API endpoint'lerini kullanarak tüm talep akışlarını test eder.
                            10 kişilik sanal ekip oluşturur, OT/İzin/Mazeret/Kartsız tüm iş kurallarını doğrular.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={cleanup}
                            disabled={cleaning || running}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            {cleaning ? 'Temizleniyor...' : 'E2E Veri Temizliği'}
                        </button>
                        <button
                            onClick={startTests}
                            disabled={running}
                            className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {running ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Çalışıyor...
                                </>
                            ) : 'Testleri Başlat'}
                        </button>
                    </div>
                </div>

                {/* Cleanup result */}
                {cleanResult && (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                        {cleanResult.logs?.map((log, i) => (
                            <div key={i} className={log.level === 'ERROR' ? 'text-red-600' : 'text-green-600'}>
                                {log.message}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Progress */}
            {running && progressInfo && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                            {progressInfo.current_test}: {progressInfo.current_name}
                        </span>
                        <span className="text-sm text-gray-500">
                            {progressInfo.completed || 0} / {progressInfo.total || 23}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-red-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${((progressInfo.completed || 0) / (progressInfo.total || 23)) * 100}%` }}
                        />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span className="text-green-600 font-medium">{progressInfo.passed || 0} PASS</span>
                        <span className="text-red-600 font-medium">
                            {(progressInfo.completed || 0) - (progressInfo.passed || 0)} FAIL/ERROR
                        </span>
                    </div>
                </div>
            )}

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <SummaryCard label="Toplam" value={summary.total} color="gray" />
                    <SummaryCard label="Başarılı" value={summary.passed} color="green" />
                    <SummaryCard label="Başarısız" value={summary.failed} color="red" />
                    <SummaryCard label="Hata" value={summary.errors} color="orange" />
                    <SummaryCard label="Süre" value={`${summary.elapsed_seconds}s`} color="blue" />
                </div>
            )}

            {/* Error display */}
            {results && !results.success && results.error && !testResults.length && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 text-sm">
                    <strong>Hata:</strong> {results.error}
                </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && Object.entries(groups).map(([group, tests]) => {
                const gc = GROUP_COLORS[group] || GROUP_COLORS.SETUP;
                return (
                    <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`px-4 py-2 ${gc.bg} ${gc.text} border-b ${gc.border} font-bold text-sm`}>
                            {group}
                            <span className="ml-2 font-normal">
                                ({tests.filter(t => t.status === 'PASS').length}/{tests.length} başarılı)
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {tests.map(test => (
                                <div key={test.id}>
                                    <div
                                        className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                                    >
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${STATUS_STYLES[test.status]}`}>
                                            {test.status}
                                        </span>
                                        <span className="ml-3 text-xs text-gray-400 font-mono w-16">{test.id}</span>
                                        <span className="ml-2 text-sm text-gray-800 flex-1">{test.name}</span>
                                        <span className="text-xs text-gray-400">{test.duration_ms}ms</span>
                                        <svg
                                            className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${expandedTest === test.id ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {expandedTest === test.id && (
                                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                                            {test.error && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-mono whitespace-pre-wrap">
                                                    {test.error}
                                                </div>
                                            )}
                                            {test.api_calls?.length > 0 && (
                                                <div className="mt-3">
                                                    <h4 className="text-xs font-bold text-gray-500 mb-2">API Çağrıları ({test.api_calls.length})</h4>
                                                    <div className="space-y-2">
                                                        {test.api_calls.map((call, i) => (
                                                            <ApiCallRow key={i} call={call} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {!test.error && (!test.api_calls || test.api_calls.length === 0) && (
                                                <p className="mt-2 text-sm text-gray-400 italic">Detay yok</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    const colors = {
        gray: 'bg-gray-50 text-gray-800 border-gray-200',
        green: 'bg-green-50 text-green-800 border-green-200',
        red: 'bg-red-50 text-red-800 border-red-200',
        orange: 'bg-orange-50 text-orange-800 border-orange-200',
        blue: 'bg-blue-50 text-blue-800 border-blue-200',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color]}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-1 opacity-70">{label}</div>
        </div>
    );
}

function ApiCallRow({ call }) {
    const [expanded, setExpanded] = useState(false);
    const statusColor = call.status < 300 ? 'text-green-600' : call.status < 500 ? 'text-amber-600' : 'text-red-600';

    return (
        <div className="border border-gray-200 rounded-lg bg-white">
            <div
                className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs"
                onClick={() => setExpanded(!expanded)}
            >
                <span className={`font-bold w-12 ${call.method === 'GET' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {call.method}
                </span>
                <span className="flex-1 font-mono text-gray-600 truncate">{call.url}</span>
                <span className={`font-bold ml-2 ${statusColor}`}>{call.status}</span>
                <svg
                    className={`w-3 h-3 ml-2 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {expanded && (
                <div className="px-3 pb-2 border-t border-gray-100 text-xs">
                    {call.request && (
                        <div className="mt-2">
                            <span className="font-bold text-gray-500">Request:</span>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-gray-700 overflow-x-auto max-h-40">
                                {JSON.stringify(call.request, null, 2)}
                            </pre>
                        </div>
                    )}
                    {call.response && (
                        <div className="mt-2">
                            <span className="font-bold text-gray-500">Response:</span>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-gray-700 overflow-x-auto max-h-40">
                                {typeof call.response === 'string' ? call.response : JSON.stringify(call.response, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
