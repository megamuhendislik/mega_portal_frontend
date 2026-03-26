import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users, Target, GitCompareArrows, Table2,
    AlertCircle, RefreshCw
} from 'lucide-react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ===================================================================
   CONSTANTS
   =================================================================== */
const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

const RADAR_AXES = [
    { key: 'efficiency', label: 'Verimlilik' },
    { key: 'overtime', label: 'Ek Mesai' },
    { key: 'attendance', label: 'Devam' },
    { key: 'punctuality', label: 'Dakiklik' },
    { key: 'leave_usage', label: 'İzin' },
];

const PARALLEL_AXES = [
    { key: 'efficiency', label: 'Verimlilik%' },
    { key: 'overtime', label: 'OT Saat' },
    { key: 'attendance', label: 'Devam%' },
    { key: 'leave_usage', label: 'İzin Gün' },
    { key: 'punctuality', label: 'Dakiklik%' },
];

/* ===================================================================
   TIER BADGE HELPERS
   =================================================================== */
function getTierLabel(emp) {
    const score = emp.metrics?.total_score ?? emp.normalized?.efficiency ?? 0;
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
}

function getTierClass(emp) {
    const score = emp.metrics?.total_score ?? emp.normalized?.efficiency ?? 0;
    if (score >= 90) return 'bg-emerald-100 text-emerald-700';
    if (score >= 80) return 'bg-blue-100 text-blue-700';
    if (score >= 70) return 'bg-amber-100 text-amber-700';
    if (score >= 60) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
}

/* ===================================================================
   STRONGEST / WEAKEST AXIS HELPERS
   =================================================================== */
function getStrongestAxis(emp) {
    const n = emp.normalized || {};
    const axes = RADAR_AXES.map(a => ({ label: a.label, value: n[a.key] ?? 0 }));
    return axes.reduce((max, a) => a.value > max.value ? a : max, axes[0])?.label;
}

function getWeakestAxis(emp) {
    const n = emp.normalized || {};
    const axes = RADAR_AXES.map(a => ({ label: a.label, value: n[a.key] ?? 0 }));
    return axes.reduce((min, a) => a.value < min.value ? a : min, axes[0])?.label;
}

/* ===================================================================
   SKELETON LOADER
   =================================================================== */
function SkeletonCard({ height = 320 }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="animate-pulse bg-slate-100 rounded-xl" style={{ height }} />
        </div>
    );
}

/* ===================================================================
   CUSTOM TOOLTIP
   =================================================================== */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.color || entry.stroke }}
                    />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {typeof entry.value === 'number'
                            ? entry.value.toLocaleString('tr-TR')
                            : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ===================================================================
   RAW VALUE TOOLTIP — shows original (non-normalized) metric values
   =================================================================== */
function RawValueTooltip({ active, payload, label, employeesData, teamAvg }) {
    if (!active || !payload?.length) return null;

    // Map axis label back to raw metric key (covers both radar and parallel axes labels)
    const RAW_MAP = {
        'Verimlilik': { key: 'efficiency_pct', suffix: '%' },
        'Verimlilik%': { key: 'efficiency_pct', suffix: '%' },
        'Ek Mesai': { key: 'ot_hours', suffix: 's' },
        'OT Saat': { key: 'ot_hours', suffix: 's' },
        'Devam': { key: 'attendance_pct', suffix: '%' },
        'Devam%': { key: 'attendance_pct', suffix: '%' },
        'Dakiklik': { key: 'punctuality_pct', suffix: '%' },
        'Dakiklik%': { key: 'punctuality_pct', suffix: '%' },
        'İzin': { key: 'leave_days', suffix: ' gün' },
        'İzin Gün': { key: 'leave_days', suffix: ' gün' },
    };

    const meta = RAW_MAP[label];

    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => {
                let rawVal = entry.value;
                if (meta) {
                    if (entry.name === 'Ekip Ort.') {
                        rawVal = teamAvg?.[meta.key] ?? entry.value;
                    } else {
                        const emp = employeesData?.find(e => e.name === entry.name);
                        if (emp) rawVal = emp.metrics?.[meta.key] ?? entry.value;
                    }
                }
                return (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color || entry.stroke }}
                        />
                        <span className="text-slate-500">{entry.name}:</span>
                        <span className="font-bold text-slate-800">
                            {typeof rawVal === 'number'
                                ? rawVal.toLocaleString('tr-TR')
                                : rawVal}
                            {meta?.suffix || ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ===================================================================
   CHART 1: RADAR CHART — Performans Radarı
   =================================================================== */
function StrengthsWeaknesses({ employees }) {
    if (!employees?.length) return null;
    return (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {employees.map((emp, idx) => {
                const strongest = getStrongestAxis(emp);
                const weakest = getWeakestAxis(emp);
                return (
                    <div key={emp.employee_id} className="flex items-center gap-2 text-[10px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-bold text-slate-700 w-20 truncate">{emp.name}</span>
                        <span className="text-emerald-600">&uarr; {strongest}</span>
                        <span className="text-red-500">&darr; {weakest}</span>
                    </div>
                );
            })}
        </div>
    );
}

function RadarChartCard({ employees, teamAvg, showTeamAvg }) {
    const radarData = useMemo(() => {
        if (!employees?.length) return [];
        return RADAR_AXES.map(axis => {
            const point = { axis: axis.label };
            employees.forEach(e => {
                point[e.name] = e.normalized?.[axis.key] ?? 0;
            });
            if (showTeamAvg && teamAvg?.normalized) {
                point['Ekip Ort.'] = teamAvg.normalized[axis.key] ?? 0;
            }
            return point;
        });
    }, [employees, teamAvg, showTeamAvg]);

    if (!radarData.length) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                    <Target size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Performans Radarı</h3>
            </div>

            {/* Radar */}
            <ResponsiveContainer width="100%" height={320}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                    <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {employees.map((emp, i) => (
                        <Radar
                            key={emp.employee_id}
                            name={emp.name}
                            dataKey={emp.name}
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.1}
                            strokeWidth={2}
                        />
                    ))}
                    {showTeamAvg && teamAvg?.normalized && (
                        <Radar
                            name="Ekip Ort."
                            dataKey="Ekip Ort."
                            stroke="#94a3b8"
                            fill="#94a3b8"
                            fillOpacity={0.05}
                            strokeWidth={2}
                            strokeDasharray="5 3"
                        />
                    )}
                    <Tooltip
                        content={
                            <RawValueTooltip
                                employeesData={employees}
                                teamAvg={teamAvg}
                            />
                        }
                    />
                </RadarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                {employees.map((emp, i) => (
                    <div key={emp.employee_id} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-[11px] font-medium text-slate-600">{emp.name}</span>
                    </div>
                ))}
                {showTeamAvg && teamAvg?.normalized && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400" />
                        <span className="text-[11px] font-medium text-slate-400">Ekip Ort.</span>
                    </div>
                )}
            </div>

            {/* Güçlü/Zayıf Yönler */}
            <StrengthsWeaknesses employees={employees} />
        </div>
    );
}

/* ===================================================================
   CHART 2: PARALLEL COORDINATES — Cok Boyutlu Karsilastirma
   =================================================================== */
function ParallelCoordinatesCard({ employees, teamAvg, showTeamAvg }) {
    const parallelData = useMemo(() => {
        if (!employees?.length) return [];
        return PARALLEL_AXES.map(axis => {
            const point = { axis: axis.label };
            employees.forEach(e => {
                point[e.name] = e.normalized?.[axis.key] ?? 0;
            });
            if (showTeamAvg && teamAvg?.normalized) {
                point['Ekip Ort.'] = teamAvg.normalized[axis.key] ?? 0;
            }
            return point;
        });
    }, [employees, teamAvg, showTeamAvg]);

    if (!parallelData.length) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0">
                    <GitCompareArrows size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Çok Boyutlu Karşılaştırma</h3>
            </div>

            {/* LineChart (parallel coordinates simulation) */}
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={parallelData} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="axis"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip
                        content={
                            <RawValueTooltip
                                employeesData={employees}
                                teamAvg={teamAvg}
                            />
                        }
                    />
                    {employees.map((emp, i) => (
                        <Line
                            key={emp.employee_id}
                            type="monotone"
                            name={emp.name}
                            dataKey={emp.name}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 5, fill: COLORS[i % COLORS.length] }}
                            activeDot={{ r: 7 }}
                            connectNulls
                        />
                    ))}
                    {showTeamAvg && teamAvg?.normalized && (
                        <Line
                            type="monotone"
                            name="Ekip Ort."
                            dataKey="Ekip Ort."
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            dot={{ r: 4, fill: '#94a3b8' }}
                            activeDot={{ r: 6 }}
                            connectNulls
                        />
                    )}
                    <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ===================================================================
   TABLE: DETAYLI KARSILASTIRMA
   =================================================================== */
function getColorDot(value, thresholdHigh = 90, thresholdLow = 70) {
    if (value >= thresholdHigh) return 'bg-emerald-500';
    if (value >= thresholdLow) return 'bg-amber-400';
    return 'bg-red-500';
}

function ComparisonTable({ employees, teamAvg, bestPerformers, onPersonClick }) {
    if (!employees?.length) return null;

    const ROWS = [
        {
            label: 'Verimlilik',
            metricKey: 'efficiency_pct',
            bestKey: 'efficiency',
            format: v => `%${typeof v === 'number' ? v.toFixed(1) : v}`,
            hasDot: true,
        },
        {
            label: 'Ek Mesai',
            metricKey: 'ot_hours',
            bestKey: 'overtime',
            format: v => `${typeof v === 'number' ? v.toFixed(1) : v}s`,
            hasDot: false,
        },
        {
            label: 'Devam Oranı',
            metricKey: 'attendance_pct',
            bestKey: 'attendance',
            format: v => `%${typeof v === 'number' ? v.toFixed(1) : v}`,
            hasDot: true,
        },
        {
            label: 'Ort. Giriş',
            metricKey: 'avg_check_in',
            bestKey: null,
            format: v => v || '-',
            hasDot: false,
            isTime: true,
        },
        {
            label: 'İzin Günü',
            metricKey: 'leave_days',
            bestKey: 'leave_usage',
            format: v => `${typeof v === 'number' ? v : 0} gün`,
            hasDot: false,
        },
        {
            label: 'Dakiklik',
            metricKey: 'punctuality_pct',
            bestKey: 'punctuality',
            format: v => `%${typeof v === 'number' ? v.toFixed(0) : v}`,
            hasDot: true,
        },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                    <Table2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Detaylı Karşılaştırma</h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-bold text-slate-500 whitespace-nowrap">
                                Metrik
                            </th>
                            {employees.map((emp, i) => (
                                <th
                                    key={emp.employee_id}
                                    className="px-3 py-2 text-left font-bold whitespace-nowrap cursor-pointer hover:underline"
                                    style={{ color: COLORS[i % COLORS.length] }}
                                    onClick={() => onPersonClick?.(emp.employee_id)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {emp.name}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${getTierClass(emp)}`}>
                                            {getTierLabel(emp)}
                                        </span>
                                    </div>
                                </th>
                            ))}
                            <th className="px-3 py-2 text-left font-bold text-slate-400 whitespace-nowrap">
                                Ekip Ort.
                            </th>
                            <th className="px-3 py-2 text-left font-bold text-emerald-600 whitespace-nowrap">
                                En İyi
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row, rowIdx) => {
                            const best = row.bestKey ? bestPerformers?.[row.bestKey] : null;

                            // Team avg value
                            let teamVal;
                            if (row.isTime) {
                                // no team avg for check-in time
                                teamVal = '-';
                            } else {
                                teamVal = teamAvg?.[row.metricKey];
                            }

                            return (
                                <tr
                                    key={row.label}
                                    className={`border-b border-slate-100 last:border-0 ${rowIdx % 2 === 1 ? 'bg-slate-50' : ''}`}
                                >
                                    <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                                        {row.label}
                                    </td>
                                    {employees.map((emp) => {
                                        let val;
                                        if (row.isTime) {
                                            val = emp[row.metricKey];
                                        } else {
                                            val = emp.metrics?.[row.metricKey];
                                        }
                                        // Compute deviation from team avg
                                        const showDeviation = !row.isTime && typeof val === 'number' && typeof teamVal === 'number';
                                        const deviation = showDeviation ? val - teamVal : 0;
                                        return (
                                            <td key={emp.employee_id} className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {row.hasDot && typeof val === 'number' && (
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${getColorDot(val)}`} />
                                                    )}
                                                    <span>{row.format(val)}</span>
                                                    {showDeviation && (
                                                        <span className={`text-[9px] ml-1 ${deviation >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            ({deviation >= 0 ? '+' : ''}{deviation.toFixed(1)})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    {/* Team avg */}
                                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            {row.hasDot && typeof teamVal === 'number' && (
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${getColorDot(teamVal)}`} />
                                            )}
                                            <span>{teamVal != null ? row.format(teamVal) : '-'}</span>
                                        </div>
                                    </td>
                                    {/* Best performer */}
                                    <td className="px-3 py-2.5 text-emerald-600 font-semibold whitespace-nowrap">
                                        {best ? (
                                            <span
                                                className="cursor-pointer hover:underline"
                                                onClick={() => onPersonClick?.(best.employee_id)}
                                            >
                                                {best.name} ({row.format(best.value)})
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
export default function ComparisonSection({ onPersonClick }) {
    const { queryParams, selectedEmployees, showTeamAvg } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const shouldFetch = selectedEmployees?.length >= 2;

    const fetchData = useCallback(async () => {
        if (!shouldFetch) { setData(null); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/employee-compare/', {
                params: {
                    ...queryParams,
                    employee_ids: selectedEmployees.slice(0, 5).join(','),
                },
            });
            setData(res.data);
        } catch (err) {
            console.error('ComparisonSection fetch error:', err);
            setError('Karşılaştırma verileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams, selectedEmployees, shouldFetch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const employees = data?.employees || [];
    const teamAvg = data?.team_avg || null;
    const bestPerformers = data?.best_performers || {};

    /* ─── EMPTY STATE ─────────────────────────────── */
    if (!shouldFetch) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium">Yukarıdaki filtreden en az 2 kişi seçin</p>
                <p className="text-xs mt-1">veya grafiklerde kişiye tıklayın</p>
            </div>
        );
    }

    /* ─── LOADING ──────────────────────────────────── */
    if (loading && !data) {
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <SkeletonCard height={320} />
                    <SkeletonCard height={320} />
                </div>
                <SkeletonCard height={200} />
            </div>
        );
    }

    /* ─── ERROR ────────────────────────────────────── */
    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    /* ─── NO DATA ──────────────────────────────────── */
    if (!employees.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium">Seçili çalışanlar için veri bulunamadı</p>
            </div>
        );
    }

    /* ─── DATA ─────────────────────────────────────── */
    return (
        <div className="space-y-5">
            {/* Top row: 2 charts side-by-side on lg */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <RadarChartCard
                    employees={employees}
                    teamAvg={teamAvg}
                    showTeamAvg={showTeamAvg}
                />
                <ParallelCoordinatesCard
                    employees={employees}
                    teamAvg={teamAvg}
                    showTeamAvg={showTeamAvg}
                />
            </div>

            {/* Bottom: Comparison table */}
            <ComparisonTable
                employees={employees}
                teamAvg={teamAvg}
                bestPerformers={bestPerformers}
                onPersonClick={onPersonClick}
            />
        </div>
    );
}
