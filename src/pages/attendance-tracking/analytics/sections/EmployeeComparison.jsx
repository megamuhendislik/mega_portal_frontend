import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users, Loader2, AlertCircle, RefreshCw, X
} from 'lucide-react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const EMPLOYEE_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function EmployeeComparison() {
    const { queryParams, comparisonEmployees } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const shouldFetch = comparisonEmployees?.length >= 2;

    const fetchData = useCallback(async () => {
        if (!shouldFetch) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/employee-compare/', {
                params: { ...queryParams, employee_ids: comparisonEmployees.join(',') }
            });
            setData(res.data);
        } catch (err) {
            console.error('EmployeeComparison fetch error:', err);
            setError('Calisan karsilastirma verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams, comparisonEmployees, shouldFetch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Radar chart data
    const radarData = useMemo(() => {
        if (!data?.radar) return [];
        const { axes, employees } = data.radar;
        if (!axes?.length || !employees?.length) return [];
        return axes.map((axis, i) => {
            const point = { subject: axis };
            employees.forEach(emp => {
                point[emp.name] = emp.values?.[i] ?? 0;
            });
            return point;
        });
    }, [data?.radar]);

    // Daily comparison line data
    const dailyData = useMemo(() => {
        if (!data?.daily_comparison?.length) return { chartData: [], employees: [] };
        const days = data.daily_comparison;
        const employeeNames = data.radar?.employees?.map(e => e.name) || [];

        const chartData = days.map(d => {
            const point = { name: d.label || d.date?.substring(5) };
            employeeNames.forEach(emp => {
                point[emp] = d.employees?.[emp] ?? null;
            });
            return point;
        });

        return { chartData, employees: employeeNames };
    }, [data?.daily_comparison, data?.radar?.employees]);

    const employees = data?.radar?.employees || [];
    const metricTable = data?.metric_table || [];
    const entryExitData = data?.entry_exit_comparison || [];

    return (
        <CollapsibleSection
            title="Calisan Karsilastirma"
            subtitle={shouldFetch ? `${comparisonEmployees.length} calisan secili` : 'En az 2 calisan secin'}
            icon={Users}
            iconGradient="from-indigo-500 to-blue-600"
        >
            {/* ─── Not enough employees selected ──────── */}
            {!shouldFetch && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Users size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Karsilastirma icin ust filtrede en az 2 calisan secin.</p>
                    <p className="text-[10px] mt-1 text-slate-300">Filtrelerdeki Calisan Karsilastirma alanini kullanin.</p>
                </div>
            )}

            {/* Loading */}
            {shouldFetch && loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-indigo-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Karsilastirma verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {shouldFetch && error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {shouldFetch && data && !loading && (
                <div className="space-y-5">
                    {/* ─── 1. Selected Employee Pills ─────────── */}
                    {employees.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {employees.map((emp, i) => (
                                <div
                                    key={emp.id || emp.name}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] }}
                                >
                                    <span className="w-2 h-2 rounded-full bg-white/40" />
                                    {emp.name}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── 2. Radar Chart ─────────────────────── */}
                    {radarData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yetenek Karsilastirmasi</h4>
                            <ResponsiveContainer width="100%" height={320}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                    />
                                    <PolarRadiusAxis
                                        angle={90}
                                        domain={[0, 100]}
                                        tick={{ fontSize: 8, fill: '#94a3b8' }}
                                        axisLine={false}
                                    />
                                    {employees.map((emp, i) => (
                                        <Radar
                                            key={emp.name}
                                            name={emp.name}
                                            dataKey={emp.name}
                                            stroke={EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]}
                                            fill={EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]}
                                            fillOpacity={0.1}
                                            strokeWidth={2}
                                        />
                                    ))}
                                    <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* ─── 3. Metric Table ─────────────────────── */}
                    {metricTable.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Metrik Tablosu</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Metrik</th>
                                            {employees.map((emp, i) => (
                                                <th key={emp.name} className="px-3 py-2 text-left font-bold" style={{ color: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] }}>
                                                    {emp.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metricTable.map(metric => {
                                            // Find best value
                                            let bestIdx = -1;
                                            let bestVal = -Infinity;
                                            employees.forEach((emp, i) => {
                                                const val = metric.values?.[i] ?? 0;
                                                const numVal = typeof val === 'string' ? parseFloat(val) : val;
                                                if (!isNaN(numVal) && numVal > bestVal && metric.higher_is_better !== false) {
                                                    bestVal = numVal;
                                                    bestIdx = i;
                                                }
                                            });

                                            return (
                                                <tr key={metric.label} className="border-b border-slate-100 last:border-0">
                                                    <td className="px-3 py-2.5 font-semibold text-slate-700">{metric.label}</td>
                                                    {employees.map((emp, i) => {
                                                        const val = metric.values?.[i] ?? '-';
                                                        const isBest = i === bestIdx;
                                                        return (
                                                            <td key={emp.name} className={`px-3 py-2.5 ${isBest ? 'font-black text-emerald-600' : 'text-slate-600'}`}>
                                                                {val}{metric.suffix || ''}
                                                                {isBest && <span className="ml-1 text-[9px]">*</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ─── 4. Daily Comparison LineChart ───────── */}
                    {dailyData.chartData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gunluk Karsilastirma</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={280} minWidth={400}>
                                    <LineChart data={dailyData.chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                                        <ReferenceLine
                                            y={8}
                                            stroke="#ef4444"
                                            strokeDasharray="4 2"
                                            strokeWidth={1.5}
                                            label={{ value: 'Hedef', fontSize: 9, fill: '#ef4444', position: 'right' }}
                                        />
                                        {dailyData.employees.map((emp, i) => (
                                            <Line
                                                key={emp}
                                                type="monotone"
                                                dataKey={emp}
                                                stroke={EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]}
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ─── 5. Entry/Exit Comparison Timeline ─── */}
                    {entryExitData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Giris/Cikis Karsilastirma</h4>
                            <div className="overflow-x-auto">
                                <div className="min-w-[500px]">
                                    {/* Hour labels */}
                                    <div className="flex items-center mb-2 ml-28 relative h-4">
                                        {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => {
                                            const x = ((h * 60 - 420) / 780) * 100;
                                            return (
                                                <span
                                                    key={h}
                                                    className="absolute text-[9px] text-slate-400 font-semibold"
                                                    style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
                                                >
                                                    {h.toString().padStart(2, '0')}:00
                                                </span>
                                            );
                                        })}
                                    </div>

                                    {entryExitData.map((emp, empIdx) => (
                                        <div key={emp.name} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                                            <div className="w-28 shrink-0 flex items-center gap-1.5">
                                                <span
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: EMPLOYEE_COLORS[empIdx % EMPLOYEE_COLORS.length] }}
                                                />
                                                <span className="text-[10px] font-semibold text-slate-600 truncate" title={emp.name}>
                                                    {emp.name}
                                                </span>
                                            </div>
                                            <div className="flex-1 relative h-5 bg-slate-100/50 rounded">
                                                {/* Shift boundaries */}
                                                <div className="absolute top-0 bottom-0 border-l border-dashed border-indigo-300" style={{ left: `${((9*60-420)/780)*100}%` }} />
                                                <div className="absolute top-0 bottom-0 border-l border-dashed border-amber-300" style={{ left: `${((18*60-420)/780)*100}%` }} />
                                                {/* Avg check-in / check-out bars */}
                                                {emp.avg_check_in && emp.avg_check_out && (() => {
                                                    const [ciH, ciM] = emp.avg_check_in.split(':').map(Number);
                                                    const [coH, coM] = emp.avg_check_out.split(':').map(Number);
                                                    const ciPct = ((ciH * 60 + ciM - 420) / 780) * 100;
                                                    const coPct = ((coH * 60 + coM - 420) / 780) * 100;
                                                    return (
                                                        <div
                                                            className="absolute top-0.5 bottom-0.5 rounded"
                                                            style={{
                                                                left: `${Math.max(0, ciPct)}%`,
                                                                width: `${Math.max(1, coPct - ciPct)}%`,
                                                                backgroundColor: EMPLOYEE_COLORS[empIdx % EMPLOYEE_COLORS.length],
                                                                opacity: 0.4,
                                                            }}
                                                            title={`${emp.name}: ${emp.avg_check_in} - ${emp.avg_check_out}`}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Legend */}
                                    <div className="flex items-center gap-4 mt-3 ml-28">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 border-t border-dashed border-indigo-400" />
                                            <span className="text-[10px] text-slate-400">Vardiya Baslangici</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 border-t border-dashed border-amber-400" />
                                            <span className="text-[10px] text-slate-400">Vardiya Bitisi</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty data */}
                    {!radarData.length && !metricTable.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Users size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Secili calisanlar icin veri bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
