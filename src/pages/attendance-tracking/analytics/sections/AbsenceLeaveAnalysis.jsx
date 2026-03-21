import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CalendarOff, Loader2, AlertCircle, RefreshCw,
    CheckCircle2, Clock, Heart, AlertTriangle
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const LEAVE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

const HEATMAP_DAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum'];

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
function KPICard({ label, value, suffix, icon: Icon, gradient, vsLabel }) {
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl font-black leading-tight">
                {value ?? '-'}{suffix && <span className="text-xs ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            {vsLabel && (
                <p className="text-[9px] opacity-60 mt-0.5">{vsLabel}</p>
            )}
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:opacity-15 transition-opacity"><Icon size={48} /></div>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   ABSENCE HEATMAP (Week x Day)
   Backend returns: [{ "day": "Pzt", "weeks": {"1": count, "2": count, ...} }]
   ═══════════════════════════════════════════════════ */
function AbsenceHeatmap({ heatmapData }) {
    if (!heatmapData?.length) return null;

    // Determine the number of weeks from the data
    const weekNumbers = new Set();
    heatmapData.forEach(dayEntry => {
        if (dayEntry.weeks) {
            Object.keys(dayEntry.weeks).forEach(w => weekNumbers.add(w));
        }
    });
    const sortedWeeks = Array.from(weekNumbers).sort((a, b) => Number(a) - Number(b));

    if (sortedWeeks.length === 0) return null;

    // Find max value for color scaling
    let maxVal = 0;
    heatmapData.forEach(dayEntry => {
        sortedWeeks.forEach(w => {
            const val = dayEntry.weeks?.[w] ?? 0;
            if (val > maxVal) maxVal = val;
        });
    });

    const getColor = (val) => {
        if (!val || maxVal === 0) return 'bg-slate-50';
        const intensity = val / maxVal;
        if (intensity > 0.75) return 'bg-rose-500';
        if (intensity > 0.5) return 'bg-rose-400';
        if (intensity > 0.25) return 'bg-rose-300';
        return 'bg-rose-100';
    };

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Devamsizlik Gun Isi Haritasi</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[350px]">
                    {/* Week headers */}
                    <div className="flex items-center mb-1">
                        <div className="w-14 shrink-0" />
                        {sortedWeeks.map(w => (
                            <div key={w} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">Hafta {w}</div>
                        ))}
                    </div>
                    {/* Day rows */}
                    {heatmapData.map((dayEntry, di) => (
                        <div key={di} className="flex items-center gap-0.5 mb-0.5">
                            <div className="w-14 shrink-0 text-[9px] font-semibold text-slate-400">{dayEntry.day || HEATMAP_DAYS[di] || `Gun ${di + 1}`}</div>
                            {sortedWeeks.map(w => {
                                const val = dayEntry.weeks?.[w] ?? 0;
                                return (
                                    <div
                                        key={w}
                                        className={`flex-1 h-7 rounded-sm ${getColor(val)} transition-colors`}
                                        title={`${dayEntry.day || HEATMAP_DAYS[di]} Hafta ${w}: ${val} kisi`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-3 justify-end">
                        <span className="text-[9px] text-slate-400">Az</span>
                        <div className="w-4 h-3 rounded-sm bg-rose-100" />
                        <div className="w-4 h-3 rounded-sm bg-rose-300" />
                        <div className="w-4 h-3 rounded-sm bg-rose-400" />
                        <div className="w-4 h-3 rounded-sm bg-rose-500" />
                        <span className="text-[9px] text-slate-400">Cok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AbsenceLeaveAnalysis() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/absence-leave/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('AbsenceLeaveAnalysis fetch error:', err);
            setError('Devamsizlik/izin verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Leave type pie data
    // Backend: [{ "name", "label", "count", "days" }]
    const pieData = useMemo(() => {
        if (!data?.leave_type_distribution?.length) return [];
        return data.leave_type_distribution.map((lt, i) => ({
            name: lt.label || lt.name,
            value: lt.days || lt.count,
            color: LEAVE_COLORS[i % LEAVE_COLORS.length],
        }));
    }, [data?.leave_type_distribution]);

    // Monthly absence trend
    // Backend: [{ "month", "label", "absent_days", "leave_days" }]
    const trendData = useMemo(() => {
        if (!data?.monthly_absence_trend?.length) return [];
        return data.monthly_absence_trend.map(m => ({
            name: m.label,
            Devamsiz: m.absent_days ?? 0,
            Izinli: m.leave_days ?? 0,
        }));
    }, [data?.monthly_absence_trend]);

    const kpi = data?.kpi;
    const vsPrev = kpi?.vs_prev;
    // Backend: employee_leave_table: [{ employee_id, name, department, annual_used, annual_total, excuse_used_hours, excuse_total_hours, health_report_days, absent_days, warning }]
    const employees = data?.employee_leave_table || [];
    // Backend: annual_leave_burndown: [{ employee_id, name, department, total_days, used_days, remaining_days }]
    const burnDown = data?.annual_leave_burndown || [];

    return (
        <CollapsibleSection
            title="Devamsizlik & Izin Analizi"
            subtitle="Izin turleri, devamsizlik trendi ve calisan tablosu"
            icon={CalendarOff}
            iconGradient="from-rose-500 to-pink-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-rose-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Devamsizlik/izin verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* --- 1. 5 KPI Cards ---------------------- */}
                    {kpi && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <KPICard
                                label="Devam Orani"
                                value={kpi.attendance_rate}
                                suffix="%"
                                icon={CheckCircle2}
                                gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                                vsLabel={vsPrev?.attendance_rate != null ? `Onceki: %${vsPrev.attendance_rate}` : undefined}
                            />
                            <KPICard
                                label="Toplam Izin"
                                value={kpi.total_leave_days}
                                suffix="gun"
                                icon={CalendarOff}
                                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                                vsLabel={vsPrev?.total_leave_days != null ? `Onceki: ${vsPrev.total_leave_days} gun` : undefined}
                            />
                            <KPICard
                                label="Ort/Kisi"
                                value={kpi.avg_leave_per_person}
                                suffix="gun"
                                icon={Clock}
                                gradient="bg-gradient-to-br from-violet-500 to-violet-600"
                            />
                            <KPICard
                                label="Mazeret Kullanim"
                                value={kpi.excuse_hours_used}
                                suffix="s"
                                icon={AlertTriangle}
                                gradient="bg-gradient-to-br from-amber-500 to-amber-600"
                            />
                            <KPICard
                                label="Saglik Raporu"
                                value={kpi.health_report_count}
                                suffix=""
                                icon={Heart}
                                gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                            />
                        </div>
                    )}

                    {/* --- 2 & 3: Leave Pie + BurnDown ---------- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Leave Type Pie */}
                        {pieData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Izin Turu Dagilimi</h4>
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={85}
                                            innerRadius={50}
                                            paddingAngle={3}
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell key={`cell-${i}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0];
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                        <p className="font-bold text-slate-700">{d.name}</p>
                                                        <p className="text-slate-500">{d.value} gun</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                    {pieData.map(entry => (
                                        <div key={entry.name} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[10px] text-slate-500 font-semibold">{entry.name}: {entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Annual Leave Burn-Down */}
                        {/* Backend fields: total_days, used_days, remaining_days */}
                        {burnDown.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yillik Izin Burn-Down</h4>
                                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                    {burnDown.map(emp => {
                                        const total = emp.total_days ?? ((emp.used_days ?? 0) + (emp.remaining_days ?? 0));
                                        const used = emp.used_days ?? emp.used ?? 0;
                                        const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;
                                        return (
                                            <div key={emp.employee_id || emp.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[120px]" title={emp.name}>
                                                        {emp.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {used}/{total} gun
                                                    </span>
                                                </div>
                                                <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            usedPct >= 90 ? 'bg-red-500'
                                                            : usedPct >= 70 ? 'bg-amber-500'
                                                            : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${usedPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- 4. Monthly Absence Trend ------------- */}
                    {trendData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik Devamsizlik Trendi</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={240} minWidth={350}>
                                    <AreaChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <defs>
                                            <linearGradient id="absAreaFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="leaveAreaFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
                                                        <p className="font-bold text-slate-700 mb-1.5">{label}</p>
                                                        {payload.map((entry, i) => (
                                                            <div key={i} className="flex items-center gap-2 py-0.5">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="text-slate-500">{entry.name}:</span>
                                                                <span className="font-bold text-slate-800">{entry.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Area type="monotone" dataKey="Devamsiz" stroke="#f43f5e" fill="url(#absAreaFill)" strokeWidth={2} dot={{ r: 3 }} />
                                        <Area type="monotone" dataKey="Izinli" stroke="#3b82f6" fill="url(#leaveAreaFill)" strokeWidth={2} dot={{ r: 3 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* --- 5. Absence Day Heatmap --------------- */}
                    <AbsenceHeatmap heatmapData={data.absence_heatmap} />

                    {/* --- 6. Employee Leave Table --------------- */}
                    {/* Backend fields: employee_id, name, department, annual_used, annual_total, excuse_used_hours, excuse_total_hours, health_report_days, absent_days, warning */}
                    {employees.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calisan Izin Tablosu</h4>

                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Calisan</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Departman</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Yillik</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Mazeret</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Saglik</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Devamsiz</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map(emp => {
                                            const totalAbsence = emp.absent_days ?? 0;
                                            const excuseUsed = emp.excuse_used_hours ?? emp.excuse_used ?? 0;
                                            const excuseTotal = emp.excuse_total_hours ?? 18;
                                            const hasWarning = emp.warning || totalAbsence >= 3 || excuseUsed >= 15;
                                            return (
                                                <tr key={emp.employee_id || emp.name} className="border-b border-slate-100 last:border-0 hover:bg-white/60 transition-colors">
                                                    <td className="px-3 py-2.5 font-semibold text-slate-700">{emp.name}</td>
                                                    <td className="px-3 py-2.5 text-slate-500">{emp.department || '-'}</td>
                                                    <td className="px-3 py-2.5 text-blue-600 font-semibold">{emp.annual_used ?? 0}/{emp.annual_total ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-amber-600 font-semibold">{excuseUsed}/{excuseTotal}s</td>
                                                    <td className="px-3 py-2.5 text-rose-600 font-semibold">{emp.health_report_days ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-red-600 font-bold">{totalAbsence}</td>
                                                    <td className="px-3 py-2.5">
                                                        {hasWarning ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                                                <AlertTriangle size={10} /> Dikkat
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                                                <CheckCircle2 size={10} /> Normal
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden space-y-2">
                                {employees.slice(0, 10).map(emp => {
                                    const totalAbsence = emp.absent_days ?? 0;
                                    const excuseUsed = emp.excuse_used_hours ?? emp.excuse_used ?? 0;
                                    const hasWarning = emp.warning || totalAbsence >= 3 || excuseUsed >= 15;
                                    return (
                                        <div key={emp.employee_id || emp.name} className="bg-white rounded-xl p-3 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-700">{emp.name}</p>
                                                    {emp.department && <p className="text-[10px] text-slate-400">{emp.department}</p>}
                                                </div>
                                                {hasWarning ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                                        <AlertTriangle size={10} /> Dikkat
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                                        <CheckCircle2 size={10} /> Normal
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px]">
                                                <span className="text-blue-600">Yillik: {emp.annual_used ?? 0}/{emp.annual_total ?? 0}</span>
                                                <span className="text-amber-600">Mazeret: {excuseUsed}s</span>
                                                <span className="text-red-600">Devamsiz: {totalAbsence}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!kpi && !pieData.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <CalendarOff size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Bu donem icin devamsizlik/izin verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
