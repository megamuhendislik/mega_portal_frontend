import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    PlayCircleIcon,
    ArrowPathIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CommandLineIcon,
    TableCellsIcon,
    FunnelIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds into human-readable Turkish duration string */
function formatSec(seconds) {
    if (seconds === null || seconds === undefined) return '-';
    const abs = Math.abs(seconds);
    const sign = seconds < 0 ? '-' : '';
    if (abs >= 3600) {
        const h = Math.floor(abs / 3600);
        const m = Math.floor((abs % 3600) / 60);
        return `${sign}${h}s ${m}dk`;
    }
    if (abs >= 60) {
        const m = Math.floor(abs / 60);
        const s = abs % 60;
        return `${sign}${m}dk ${s}sn`;
    }
    return `${sign}${abs}sn`;
}

/** Format elapsed timer (in seconds) to mm:ss */
function formatElapsed(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Percentage bar color based on value */
function pctColor(pct) {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-teal-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-red-500';
}

/** Check if a before/after pair changed */
function didChange(before, after, key) {
    if (!before || !after) return false;
    return before[key] !== after[key];
}

/** Render a cell value with optional before->after highlight */
function ChangeCell({ before, after, field, formatter }) {
    const fmt = formatter || formatSec;
    const bVal = before?.[field];
    const aVal = after?.[field];
    const changed = bVal !== undefined && aVal !== undefined && bVal !== aVal;

    if (changed) {
        return (
            <span className="inline-flex items-center gap-1">
                <span className="line-through text-gray-500 text-[10px]">{fmt(bVal)}</span>
                <span className="text-amber-600 font-bold">{fmt(aVal)}</span>
            </span>
        );
    }
    return <span>{fmt(aVal ?? bVal)}</span>;
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Compact terminal log line */
function TerminalLine({ log }) {
    const isError = log.type === 'error' || log.success === false;
    const isDone = log.type === 'done' || log.type === 'emp_done';
    const isStart = log.type === 'start' || log.type === 'emp_start';

    let textClass = 'text-green-400';
    if (isError) textClass = 'text-red-400';
    else if (isDone) textClass = 'text-emerald-300';
    else if (isStart) textClass = 'text-cyan-300';
    else if (log.type === 'date_detail') textClass = 'text-gray-400';

    return (
        <div className="leading-relaxed border-b border-gray-800/40 pb-0.5">
            <span className="text-gray-600 mr-2 select-none">[{log.time}]</span>
            <span className={textClass}>{log.message}</span>
        </div>
    );
}

/** Rules info badge */
function RulesBox({ rules }) {
    if (!rules) return null;
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 mb-3">
            <span><b>Vardiya:</b> {rules.shift_start}-{rules.shift_end}</span>
            {rules.lunch_start && <span><b>Ogle:</b> {rules.lunch_start}-{rules.lunch_end}</span>}
            <span><b>Mola Hakki:</b> {rules.break_allowance_min}dk</span>
            {rules.is_off_day && <span className="text-orange-600 font-bold">TATIL GUNU</span>}
        </div>
    );
}

/** Gap analysis table */
function GapTable({ gaps }) {
    if (!gaps || gaps.length === 0) {
        return <div className="text-xs text-gray-400 italic mb-3">Bosluk tespit edilmedi.</div>;
    }
    return (
        <div className="mb-3 overflow-x-auto">
            <div className="text-xs font-semibold text-gray-600 mb-1">Bosluk (Gap) Analizi</div>
            <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">#</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Baslangic</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Bitis</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Ham</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Ogle Kesisim</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Net</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Kredi</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Kalan Hak</th>
                    </tr>
                </thead>
                <tbody>
                    {gaps.map((g, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1 font-mono">{g.from}</td>
                            <td className="px-2 py-1 font-mono">{g.to}</td>
                            <td className="px-2 py-1 text-right">{formatSec(g.raw_sec)}</td>
                            <td className="px-2 py-1 text-right">{g.lunch_overlap_sec > 0 ? formatSec(g.lunch_overlap_sec) : '-'}</td>
                            <td className="px-2 py-1 text-right font-medium">{formatSec(g.net_sec)}</td>
                            <td className="px-2 py-1 text-right text-teal-700 font-medium">{formatSec(g.credit_sec)}</td>
                            <td className="px-2 py-1 text-right text-gray-500">{formatSec(g.remaining_allowance_sec)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Records before/after comparison table */
function RecordsTable({ recordsBefore, recordsAfter }) {
    const maxLen = Math.max(recordsBefore?.length || 0, recordsAfter?.length || 0);
    if (maxLen === 0) {
        return <div className="text-xs text-gray-400 italic mb-3">Kayit bulunamadi.</div>;
    }

    const rows = [];
    for (let i = 0; i < maxLen; i++) {
        const b = recordsBefore?.[i];
        const a = recordsAfter?.[i];
        rows.push({ idx: i, before: b, after: a });
    }

    return (
        <div className="mb-3 overflow-x-auto">
            <div className="text-xs font-semibold text-gray-600 mb-1">Kayitlar (Once / Sonra)</div>
            <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">#</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Giris</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500">Cikis</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Normal</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">F.Mesai</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Mola</th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500">Eksik</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ idx, before, after }) => {
                        const rec = after || before;
                        const breakChanged = didChange(before, after, 'break_sec');
                        const missingChanged = didChange(before, after, 'missing_sec');
                        const normalChanged = didChange(before, after, 'normal_sec');
                        const otChanged = didChange(before, after, 'ot_sec');
                        const anyChange = breakChanged || missingChanged || normalChanged || otChanged;

                        return (
                            <tr key={idx} className={`border-t border-gray-100 ${anyChange ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                                <td className="px-2 py-1 text-gray-400">{idx + 1}</td>
                                <td className="px-2 py-1 font-mono">{rec?.check_in || '-'}</td>
                                <td className="px-2 py-1 font-mono">{rec?.check_out || '-'}</td>
                                <td className="px-2 py-1 text-right">
                                    <ChangeCell before={before} after={after} field="normal_sec" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                    <ChangeCell before={before} after={after} field="ot_sec" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                    <ChangeCell before={before} after={after} field="break_sec" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                    <ChangeCell before={before} after={after} field="missing_sec" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/** Day summary bar */
function DaySummary({ summary }) {
    if (!summary) return null;
    const pct = summary.break_used_pct ?? 0;
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs">
            <span><b className="text-gray-600">Normal:</b> <span className="text-gray-800 font-medium">{formatSec(summary.total_normal)}</span></span>
            <span><b className="text-gray-600">F.Mesai:</b> <span className="text-gray-800 font-medium">{formatSec(summary.total_ot)}</span></span>
            <span className="flex items-center gap-1">
                <b className="text-gray-600">Mola:</b>
                <span className="text-gray-800 font-medium">{formatSec(summary.total_break)}/{formatSec(summary.break_allowance)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    pct >= 100 ? 'bg-emerald-100 text-emerald-700' :
                    pct >= 70 ? 'bg-teal-100 text-teal-700' :
                    pct >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                }`}>%{Math.round(pct)}</span>
            </span>
            <span><b className="text-gray-600">Eksik:</b> <span className={`font-medium ${summary.total_missing > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatSec(summary.total_missing)}</span></span>
        </div>
    );
}

/** Single date detail expandable */
function DateDetail({ date, detail }) {
    const [open, setOpen] = useState(false);
    const hasChanges = detail.records_before?.some((b, i) => {
        const a = detail.records_after?.[i];
        return a && (b.break_sec !== a.break_sec || b.missing_sec !== a.missing_sec || b.normal_sec !== a.normal_sec || b.ot_sec !== a.ot_sec);
    });

    return (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                }
                <span className="font-mono font-medium text-gray-700">{date}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{detail.records_after?.length || 0} kayit</span>
                {detail.gaps?.length > 0 && (
                    <span className="text-teal-600">{detail.gaps.length} bosluk</span>
                )}
                {hasChanges && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">DEGISTI</span>
                )}
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-2 bg-white border-t border-gray-100">
                    <RulesBox rules={detail.rules} />
                    <RecordsTable recordsBefore={detail.records_before} recordsAfter={detail.records_after} />
                    <GapTable gaps={detail.gaps} />
                    <DaySummary summary={detail.summary} />
                </div>
            )}
        </div>
    );
}

/** Single employee expandable section */
function EmployeeSection({ name, dates, filterChanged, filterErrors }) {
    const [open, setOpen] = useState(false);

    const sortedDates = Object.keys(dates).sort();

    // Filter logic
    const filteredDates = sortedDates.filter(d => {
        const detail = dates[d];
        if (filterErrors) {
            // Show only dates with errors (we don't track errors per date in current format,
            // so this is a no-op unless we add error tracking)
            return false;
        }
        if (filterChanged) {
            // Show only dates where before != after
            return detail.records_before?.some((b, i) => {
                const a = detail.records_after?.[i];
                return a && (b.break_sec !== a.break_sec || b.missing_sec !== a.missing_sec || b.normal_sec !== a.normal_sec || b.ot_sec !== a.ot_sec);
            });
        }
        return true;
    });

    const totalDates = sortedDates.length;
    const changedDates = sortedDates.filter(d => {
        const detail = dates[d];
        return detail.records_before?.some((b, i) => {
            const a = detail.records_after?.[i];
            return a && (b.break_sec !== a.break_sec || b.missing_sec !== a.missing_sec || b.normal_sec !== a.normal_sec || b.ot_sec !== a.ot_sec);
        });
    }).length;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
                <span className="font-semibold text-gray-800 text-sm">{name}</span>
                <span className="text-xs text-gray-400">{totalDates} gun</span>
                {changedDates > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                        {changedDates} degisiklik
                    </span>
                )}
                {filterChanged && filteredDates.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Degisiklik yok</span>
                )}
            </button>
            {open && (
                <div className="px-4 pb-3 space-y-2 bg-slate-50/50 border-t border-gray-100">
                    {filteredDates.length === 0 ? (
                        <div className="text-xs text-gray-400 italic py-3 text-center">
                            {filterChanged ? 'Bu personelde degisen kayit bulunamadi.' : 'Kayit yok.'}
                        </div>
                    ) : (
                        filteredDates.map(d => (
                            <DateDetail key={d} date={d} detail={dates[d]} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}


// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BreakFixTab() {
    // Core state
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [compactLogs, setCompactLogs] = useState([]);
    const [detailedData, setDetailedData] = useState({});  // {employeeName: {dates: {date: dateDetailObj}}}
    const [viewMode, setViewMode] = useState('compact');     // 'compact' | 'detailed'
    const [filterChanged, setFilterChanged] = useState(false);
    const [filterErrors, setFilterErrors] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [finalResult, setFinalResult] = useState(null);

    // Stats counters
    const [statsChanged, setStatsChanged] = useState(0);
    const [statsUnchanged, setStatsUnchanged] = useState(0);

    // Refs
    const terminalRef = useRef(null);
    const timerRef = useRef(null);
    const abortRef = useRef(null);

    // Auto-scroll terminal
    useEffect(() => {
        if (viewMode === 'compact' && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [compactLogs, viewMode]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    const addCompactLog = useCallback((message, type = 'info', success = true) => {
        setCompactLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString('tr-TR'),
            message,
            type,
            success,
        }]);
    }, []);

    const handleStart = async () => {
        if (!confirm(
            "Bu islem tum personelin puantaj verilerini yeniden hesaplayacak " +
            "ve detayli tanilama loglarini uretecektir.\n\n" +
            "Islem uzun surebilir. Devam etmek istiyor musunuz?"
        )) return;

        // Reset state
        setLoading(true);
        setCompactLogs([]);
        setDetailedData({});
        setProgress({ current: 0, total: 0 });
        setElapsed(0);
        setFinalResult(null);
        setStatsChanged(0);
        setStatsUnchanged(0);

        // Start timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/system/health-check/fix_retroactive_breaks/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({}),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Split on double newlines (SSE frame boundary)
                const frames = buffer.split('\n\n');
                // Keep the last potentially incomplete frame in the buffer
                buffer = frames.pop() || '';

                for (const frame of frames) {
                    const lines = frame.split('\n');
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;

                        try {
                            const jsonStr = line.slice(6); // Remove 'data: ' prefix
                            const data = JSON.parse(jsonStr);
                            handleSSEEvent(data);
                        } catch (e) {
                            console.warn('SSE parse error:', e, line);
                        }
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleSSEEvent(data);
                    } catch (e) {
                        console.warn('SSE parse error (final):', e);
                    }
                }
            }

        } catch (e) {
            if (e.name !== 'AbortError') {
                addCompactLog(`HATA: ${e.message}`, 'error', false);
            }
        } finally {
            setLoading(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleSSEEvent = useCallback((data) => {
        switch (data.type) {
            case 'start':
                setProgress(prev => ({ ...prev, total: data.total_employees || 0 }));
                addCompactLog(data.message, 'start');
                break;

            case 'emp_start':
                addCompactLog(data.message, 'emp_start');
                break;

            case 'date_detail': {
                // Add summary to compact log
                addCompactLog(data.message, 'date_detail');

                // Track changes for stats
                const hasAnyChange = data.records_before?.some((b, i) => {
                    const a = data.records_after?.[i];
                    return a && (
                        b.break_sec !== a.break_sec ||
                        b.missing_sec !== a.missing_sec ||
                        b.normal_sec !== a.normal_sec ||
                        b.ot_sec !== a.ot_sec
                    );
                });
                if (hasAnyChange) {
                    setStatsChanged(prev => prev + 1);
                } else {
                    setStatsUnchanged(prev => prev + 1);
                }

                // Store in detailed data
                const empName = data.employee;
                const dateStr = data.date;
                if (empName && dateStr) {
                    setDetailedData(prev => {
                        const empData = prev[empName] || { dates: {} };
                        return {
                            ...prev,
                            [empName]: {
                                ...empData,
                                dates: {
                                    ...empData.dates,
                                    [dateStr]: {
                                        rules: data.rules,
                                        records_before: data.records_before,
                                        records_after: data.records_after,
                                        gaps: data.gaps,
                                        summary: data.summary,
                                    }
                                }
                            }
                        };
                    });
                }
                break;
            }

            case 'emp_done':
                setProgress(prev => ({ ...prev, current: prev.current + 1 }));
                addCompactLog(data.message, 'emp_done');
                break;

            case 'done':
                setFinalResult(data);
                addCompactLog(data.message, 'done');
                setLoading(false);
                break;

            case 'error':
                addCompactLog(data.message, 'error', false);
                break;

            default:
                if (data.message) {
                    addCompactLog(data.message, data.type || 'info', data.success !== false);
                }
                break;
        }
    }, [addCompactLog]);

    const handleAbort = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            addCompactLog('Islem kullanici tarafindan iptal edildi.', 'error', false);
        }
    };

    // Progress percentage
    const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    // Sorted employee names for detailed view
    const employeeNames = Object.keys(detailedData).sort((a, b) => a.localeCompare(b, 'tr'));

    const hasAnyData = compactLogs.length > 0 || Object.keys(detailedData).length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            {/* ---- Header ---- */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-4 text-teal-700 bg-teal-50 p-4 rounded-xl border border-teal-200">
                    <ClockIcon className="w-10 h-10 flex-shrink-0" />
                    <div>
                        <h3 className="text-xl font-bold">Puantaj Yeniden Hesaplama & Tanilama</h3>
                        <p className="text-sm opacity-80 mt-0.5">
                            Tum personelin giris/cikis verilerini takvim kurallariyla yeniden hesaplar ve detayli loglar uretir.
                        </p>
                    </div>
                </div>
            </div>

            {/* ---- Control Bar ---- */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Start / Abort Button */}
                    {!loading ? (
                        <button
                            onClick={handleStart}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                        >
                            <PlayCircleIcon className="w-5 h-5" />
                            Hesaplamayi Baslat
                        </button>
                    ) : (
                        <button
                            onClick={handleAbort}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                        >
                            <XCircleIcon className="w-5 h-5" />
                            Iptal Et
                        </button>
                    )}

                    {/* Progress info */}
                    {(loading || progress.total > 0) && (
                        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-600">
                                        [{progress.current}/{progress.total}] personel islendi
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">{progressPct}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${pctColor(progressPct)}`}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Elapsed time */}
                    {(loading || elapsed > 0) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span className="font-mono">{formatElapsed(elapsed)}</span>
                        </div>
                    )}

                    {loading && (
                        <ArrowPathIcon className="w-5 h-5 text-teal-600 animate-spin" />
                    )}
                </div>

                {/* Filter controls + View mode toggle */}
                {hasAnyData && (
                    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-200/60">
                        {/* View mode */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                    viewMode === 'compact'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <CommandLineIcon className="w-3.5 h-3.5" />
                                Terminal
                            </button>
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                    viewMode === 'detailed'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <TableCellsIcon className="w-3.5 h-3.5" />
                                Detayli Tablo
                            </button>
                        </div>

                        {/* Filters (only in detailed mode) */}
                        {viewMode === 'detailed' && (
                            <div className="flex items-center gap-3">
                                <FunnelIcon className="w-3.5 h-3.5 text-gray-400" />
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={filterChanged}
                                            onChange={e => setFilterChanged(e.target.checked)}
                                        />
                                        <div className="w-8 h-4 bg-gray-200 rounded-full peer-checked:bg-amber-500 transition-colors"></div>
                                        <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
                                    </div>
                                    <span className="text-xs text-gray-600">Sadece degisen kayitlar</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={filterErrors}
                                            onChange={e => setFilterErrors(e.target.checked)}
                                        />
                                        <div className="w-8 h-4 bg-gray-200 rounded-full peer-checked:bg-red-500 transition-colors"></div>
                                        <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
                                    </div>
                                    <span className="text-xs text-gray-600">Sadece hatali kayitlar</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---- Content Area ---- */}
            <div className="p-6">
                {/* Empty state */}
                {!hasAnyData && !loading && (
                    <div className="text-center py-16 text-gray-400">
                        <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">"Hesaplamayi Baslat" butonuna tiklayarak tum personelin puantaj verilerini yeniden hesaplayabilirsiniz.</p>
                        <p className="text-xs mt-2 text-gray-300">Islem surecinde detayli tanilama loglari uretilecektir.</p>
                    </div>
                )}

                {/* Mode A: Compact Terminal */}
                {hasAnyData && viewMode === 'compact' && (
                    <div
                        ref={terminalRef}
                        className="bg-gray-900 rounded-xl border border-gray-700 font-mono text-xs overflow-y-auto"
                        style={{ maxHeight: '600px' }}
                    >
                        {/* Terminal header */}
                        <div className="sticky top-0 z-10 bg-gray-800 px-4 py-2.5 border-b border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-gray-400 text-[11px] ml-2">RECALCULATION_LOGS.log</span>
                            </div>
                            <span className="text-gray-500 text-[10px]">{compactLogs.length} satir</span>
                        </div>

                        {/* Log lines */}
                        <div className="p-4 space-y-0.5">
                            {compactLogs.map((log, i) => (
                                <TerminalLine key={i} log={log} />
                            ))}
                            {loading && (
                                <div className="text-green-500 animate-pulse mt-1">_ Isleniyor...</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode B: Detailed Table View */}
                {hasAnyData && viewMode === 'detailed' && (
                    <div className="space-y-2">
                        {employeeNames.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                {loading
                                    ? 'Detayli veriler yukleniyor...'
                                    : 'Detayli veri bulunamadi.'
                                }
                            </div>
                        ) : (
                            employeeNames.map(name => (
                                <EmployeeSection
                                    key={name}
                                    name={name}
                                    dates={detailedData[name]?.dates || {}}
                                    filterChanged={filterChanged}
                                    filterErrors={filterErrors}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ---- Final Summary ---- */}
                {finalResult && (
                    <div className="mt-6 p-5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircleIcon className="w-6 h-6 text-teal-600" />
                            <h4 className="text-lg font-bold text-teal-800">Islem Tamamlandi</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-teal-100 text-center">
                                <div className="text-2xl font-bold text-teal-700">{finalResult.total_employees ?? progress.total}</div>
                                <div className="text-xs text-teal-600 mt-0.5">Toplam Personel</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-teal-100 text-center">
                                <div className="text-2xl font-bold text-blue-700">{finalResult.total_dates ?? '-'}</div>
                                <div className="text-xs text-blue-600 mt-0.5">Islenen Gun</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-teal-100 text-center">
                                <div className={`text-2xl font-bold ${(finalResult.total_errors ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {finalResult.total_errors ?? 0}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">Hata</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-teal-100 text-center">
                                <div className="text-2xl font-bold text-amber-700">{statsChanged}</div>
                                <div className="text-xs text-gray-600 mt-0.5">Degisen / <span className="text-gray-400">{statsUnchanged} Degismeyen</span></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>Sure: {formatElapsed(elapsed)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
