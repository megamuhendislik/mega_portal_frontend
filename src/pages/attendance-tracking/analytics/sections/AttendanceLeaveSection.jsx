import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CalendarDays, PieChart as PieChartIcon, TrendingUp,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum'];

const STATUS_CONFIG = {
    present: { label: 'Tam gun', bg: 'bg-emerald-400', color: '#10b981' },
    late:    { label: 'Gec giris', bg: 'bg-amber-400', color: '#f59e0b' },
    absent:  { label: 'Devamsiz', bg: 'bg-red-400', color: '#ef4444' },
    leave:   { label: 'Izinli', bg: 'bg-blue-400', color: '#3b82f6' },
    off:     { label: 'Tatil', bg: 'bg-slate-200', color: '#e2e8f0' },
};

const LEAVE_TYPE_COLORS = {
    ANNUAL_LEAVE: '#3b82f6',
    EXCUSE_LEAVE: '#f59e0b',
    HEALTH_REPORT: '#ef4444',
    HOSPITAL_VISIT: '#8b5cf6',
    EXTERNAL_DUTY: '#06b6d4',
};

const LEAVE_TYPE_FALLBACK_COLORS = [
    '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#ec4899', '#84cc16', '#0ea5e9',
];

const AREA_COLORS = {
    present: '#10b981',
    late:    '#f59e0b',
    absent:  '#ef4444',
    leave:   '#3b82f6',
};

/* ═══════════════════════════════════════════════════
   HELPER: Parse date string to Date object
   ═══════════════════════════════════════════════════ */
function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDateKey(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateLabel(dt) {
    return `${dt.getDate()} ${['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'][dt.getMonth()]}`;
}

/* ═══════════════════════════════════════════════════
   CHART 1: Devam Takvim Heatmap
   ═══════════════════════════════════════════════════ */
function AttendanceCalendarHeatmap({ dailyData, period }) {
    // Build calendar grid from period dates
    const calendarGrid = useMemo(() => {
        if (!period?.start_date || !period?.end_date) return [];

        const startDt = parseDate(period.start_date);
        const endDt = parseDate(period.end_date);

        // Generate all dates in range
        const allDates = [];
        const current = new Date(startDt);
        while (current <= endDt) {
            allDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        // Build week rows (Mon-Fri only)
        const weeks = [];
        let currentWeek = [];
        let currentWeekStarted = false;

        for (const dt of allDates) {
            const dow = dt.getDay(); // 0=Sun, 1=Mon..5=Fri, 6=Sat
            if (dow === 0 || dow === 6) continue; // Skip weekends

            const mondayIdx = dow - 1; // 0=Mon..4=Fri

            // New week row if Monday or first day
            if (mondayIdx === 0 || !currentWeekStarted) {
                if (currentWeek.length > 0) {
                    // Pad incomplete week
                    while (currentWeek.length < 5) currentWeek.push(null);
                    weeks.push(currentWeek);
                }
                currentWeek = [];
                currentWeekStarted = true;
                // Pad start of week if needed
                for (let i = 0; i < mondayIdx; i++) {
                    currentWeek.push(null);
                }
            }

            const dateKey = formatDateKey(dt);
            const dayInfo = dailyData?.[dateKey];

            currentWeek.push({
                date: dt,
                dateKey,
                dayLabel: formatDateLabel(dt),
                status: dayInfo?.status || 'off',
                avgHours: dayInfo?.avg_hours ?? 0,
                presentCount: dayInfo?.present ?? 0,
                lateCount: dayInfo?.late ?? 0,
                absentCount: dayInfo?.absent ?? 0,
                leaveCount: dayInfo?.leave ?? 0,
            });
        }

        // Push last week
        if (currentWeek.length > 0) {
            while (currentWeek.length < 5) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        return weeks;
    }, [dailyData, period]);

    if (calendarGrid.length === 0) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                Takvim verisi bulunamadi.
            </div>
        );
    }

    // Determine dominant status for cell coloring based on avg hours
    const getCellClass = (cell) => {
        if (!cell) return 'bg-transparent';
        const { avgHours, status } = cell;
        if (status === 'off') return STATUS_CONFIG.off.bg;
        if (avgHours >= 8.5) return 'bg-emerald-500';
        if (avgHours >= 7.5) return STATUS_CONFIG.present.bg;
        if (avgHours >= 6) return 'bg-emerald-300';
        if (avgHours >= 4) return STATUS_CONFIG.late.bg;
        if (avgHours > 0) return 'bg-amber-300';
        return STATUS_CONFIG.absent.bg;
    };

    return (
        <div>
            {/* Column headers */}
            <div className="flex items-center mb-1">
                <div className="w-12 shrink-0" />
                {WEEKDAY_LABELS.map(d => (
                    <div key={d} className="flex-1 text-center text-[10px] text-slate-400 font-bold uppercase">
                        {d}
                    </div>
                ))}
            </div>

            {/* Week rows */}
            {calendarGrid.map((week, wi) => (
                <div key={wi} className="flex items-center gap-1 mb-1">
                    <div className="w-12 shrink-0 text-[9px] text-slate-400 font-semibold text-right pr-1">
                        H{wi + 1}
                    </div>
                    {week.map((cell, ci) => (
                        <div key={ci} className="flex-1 flex justify-center">
                            {cell ? (
                                <div
                                    className={`w-9 h-9 rounded-lg ${getCellClass(cell)} transition-all cursor-default
                                        hover:ring-2 hover:ring-slate-300 hover:ring-offset-1 flex items-center justify-center`}
                                    title={`${cell.dayLabel}: ${cell.avgHours > 0 ? cell.avgHours.toFixed(1) + 's ort.' : 'Veri yok'}${cell.presentCount ? ' | ' + cell.presentCount + ' tam' : ''}${cell.lateCount ? ', ' + cell.lateCount + ' gec' : ''}${cell.absentCount ? ', ' + cell.absentCount + ' devamsiz' : ''}${cell.leaveCount ? ', ' + cell.leaveCount + ' izinli' : ''}`}
                                >
                                    <span className="text-[8px] font-bold text-white/80">
                                        {cell.date.getDate()}
                                    </span>
                                </div>
                            ) : (
                                <div className="w-9 h-9" />
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded ${cfg.bg}`} />
                        <span className="text-[10px] text-slate-500 font-semibold">{cfg.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 2: Donut Tooltip
   ═══════════════════════════════════════════════════ */
function LeaveDonutTooltip({ active, payload, totalDays, employeesByType, onPersonClick }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const pct = totalDays > 0 ? Math.round((d.value / totalDays) * 100) : 0;
    const empList = employeesByType?.[d.code] || [];
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[240px]">
            <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-bold text-slate-700">{d.name}</span>
            </div>
            <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Gun:</span>
                    <span className="font-bold text-slate-800">{d.value}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Talep:</span>
                    <span className="font-bold text-slate-800">{d.count ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Oran:</span>
                    <span className="font-bold text-slate-800">%{pct}</span>
                </div>
            </div>
            {empList.length > 0 && (
                <div className="border-t border-slate-100 pt-1.5 mt-1.5 space-y-0.5">
                    {empList.slice(0, 6).map((emp) => (
                        <p
                            key={emp.id}
                            className={`text-slate-500 truncate ${onPersonClick ? 'cursor-pointer hover:text-blue-600' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPersonClick?.(emp.id);
                            }}
                        >
                            {emp.name}
                        </p>
                    ))}
                    {empList.length > 6 && (
                        <p className="text-slate-400 italic">+{empList.length - 6} daha...</p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 3: Trend Tooltip
   ═══════════════════════════════════════════════════ */
function TrendTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => {
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                return (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-500">{entry.name}:</span>
                        <span className="font-bold text-slate-800">{entry.value}</span>
                        <span className="text-slate-400">(%{pct})</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════ */
function SkeletonCard({ height = 'h-[280px]' }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 p-4 ${height} animate-pulse`}>
            <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
            <div className="h-full bg-slate-100 rounded-xl" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AttendanceLeaveSection({ onPersonClick }) {
    const { queryParams } = useAnalyticsFilter();
    const [absenceData, setAbsenceData] = useState(null);
    const [workHoursData, setWorkHoursData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [absRes, whRes] = await Promise.allSettled([
                api.get('/attendance-analytics/absence-leave/', { params: queryParams }),
                api.get('/attendance-analytics/work-hours/', { params: queryParams }),
            ]);

            if (absRes.status === 'fulfilled') setAbsenceData(absRes.value.data);
            else console.error('absence-leave fetch error:', absRes.reason);

            if (whRes.status === 'fulfilled') setWorkHoursData(whRes.value.data);
            else console.error('work-hours fetch error:', whRes.reason);

            if (absRes.status === 'rejected' && whRes.status === 'rejected') {
                setError('Devamsizlik/izin verileri yuklenemedi.');
            }
        } catch (err) {
            console.error('AttendanceLeaveSection fetch error:', err);
            setError('Devamsizlik/izin verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Derived: Daily data for calendar heatmap ───
    // Uses work-hours daily_team_avg for avg hours coloring
    // Uses absence-leave absence_heatmap for absence overlay
    const dailyCalendarData = useMemo(() => {
        const map = {};

        // Populate from daily_team_avg (work-hours endpoint)
        if (workHoursData?.daily_team_avg?.length) {
            for (const row of workHoursData.daily_team_avg) {
                map[row.date] = {
                    avg_hours: row.avg_hours ?? 0,
                    status: row.avg_hours >= 7.5 ? 'present'
                          : row.avg_hours >= 4 ? 'late'
                          : row.avg_hours > 0 ? 'absent'
                          : 'off',
                    present: 0,
                    late: 0,
                    absent: 0,
                    leave: 0,
                };
            }
        }

        // Overlay absence heatmap data if available
        // The backend heatmap is weekday x week-number, not per-date
        // We approximate by distributing absent counts back onto calendar dates
        if (absenceData?.absence_heatmap?.length && absenceData?.period) {
            const startDt = parseDate(absenceData.period.start_date);
            const endDt = parseDate(absenceData.period.end_date);

            // Build a lookup: weekday-index (0=Mon) -> week-number -> absent_count
            const heatLookup = {};
            const trDayToIdx = {
                'Pazartesi': 0, 'Sal\u0131': 1, 'Carsamba': 2, '\u00c7ar\u015famba': 2,
                'Per\u015fembe': 3, 'Cuma': 4, 'Cumartesi': 5, 'Pazar': 6,
            };
            absenceData.absence_heatmap.forEach((dayEntry, idx) => {
                const dowIdx = trDayToIdx[dayEntry.day] ?? idx;
                if (dayEntry.weeks) {
                    heatLookup[dowIdx] = dayEntry.weeks;
                }
            });

            // Walk dates and overlay absent counts
            const cur = new Date(startDt);
            while (cur <= endDt) {
                const key = formatDateKey(cur);
                const jsDay = cur.getDay(); // 0=Sun
                const dow = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon
                const weekNum = String(Math.floor((cur - startDt) / (7 * 24 * 60 * 60 * 1000)) + 1);

                if (map[key] && heatLookup[dow]?.[weekNum]) {
                    map[key].absent = heatLookup[dow][weekNum];
                }
                cur.setDate(cur.getDate() + 1);
            }
        }

        return map;
    }, [workHoursData, absenceData]);

    // ─── Derived: Period for calendar ───
    const period = useMemo(() => {
        return absenceData?.period || (workHoursData?.period ? workHoursData.period : null);
    }, [absenceData, workHoursData]);

    // ─── Derived: Leave type pie data ───
    const { pieData, totalLeaveDays } = useMemo(() => {
        if (!absenceData?.leave_type_distribution?.length) return { pieData: [], totalLeaveDays: 0 };

        let total = 0;
        const items = absenceData.leave_type_distribution.map((lt, i) => {
            const days = lt.days || lt.count || 0;
            total += days;
            return {
                name: lt.label || lt.name,
                code: lt.name || '',
                value: days,
                count: lt.count || 0,
                color: LEAVE_TYPE_COLORS[lt.name] || LEAVE_TYPE_FALLBACK_COLORS[i % LEAVE_TYPE_FALLBACK_COLORS.length],
            };
        });

        return { pieData: items, totalLeaveDays: total };
    }, [absenceData?.leave_type_distribution]);

    // ─── Derived: Trend data (stacked area) ───
    const trendData = useMemo(() => {
        if (!absenceData?.monthly_absence_trend?.length) return [];

        return absenceData.monthly_absence_trend.map(m => {
            const absentDays = m.absent_days ?? 0;
            const leaveDays = m.leave_days ?? 0;

            return {
                name: m.label,
                'Devamsiz': absentDays,
                'Izinli': leaveDays,
            };
        });
    }, [absenceData?.monthly_absence_trend]);

    // ─── Derived: Employees grouped by leave type (for donut tooltip) ───
    const employeesByType = useMemo(() => {
        const table = absenceData?.employee_leave_table || [];
        if (!table.length) return {};

        const map = {};
        for (const emp of table) {
            const entry = { id: emp.employee_id, name: emp.name };
            if ((emp.annual_used ?? 0) > 0) {
                if (!map['ANNUAL_LEAVE']) map['ANNUAL_LEAVE'] = [];
                map['ANNUAL_LEAVE'].push(entry);
            }
            if ((emp.excuse_used_hours ?? 0) > 0) {
                if (!map['EXCUSE_LEAVE']) map['EXCUSE_LEAVE'] = [];
                map['EXCUSE_LEAVE'].push(entry);
            }
            if ((emp.health_report_days ?? 0) > 0) {
                if (!map['HEALTH_REPORT']) map['HEALTH_REPORT'] = [];
                map['HEALTH_REPORT'].push(entry);
            }
        }
        return map;
    }, [absenceData?.employee_leave_table]);

    // ─── Loading ───
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height="h-[340px]" />
                    <SkeletonCard height="h-[340px]" />
                </div>
                <SkeletonCard height="h-[320px]" />
            </div>
        );
    }

    // ─── Error ───
    if (error && !absenceData && !workHoursData) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    const hasCalendar = Object.keys(dailyCalendarData).length > 0 && period;
    const hasPie = pieData.length > 0;
    const hasTrend = trendData.length > 0;

    if (!hasCalendar && !hasPie && !hasTrend) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CalendarDays size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Bu donem icin devam/izin verisi bulunamadi.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ─── Top Row: 2 cards side-by-side ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chart 1: Devam Takvimi */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <CalendarDays size={14} className="text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Devam Takvimi</h3>
                    </div>
                    {hasCalendar ? (
                        <AttendanceCalendarHeatmap dailyData={dailyCalendarData} period={period} />
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                            Takvim verisi bulunamadi.
                        </div>
                    )}
                </div>

                {/* Chart 2: Izin Turu Dagilimi (Donut) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <PieChartIcon size={14} className="text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Izin Turu Dagilimi</h3>
                    </div>
                    {hasPie ? (
                        <>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        label={false}
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={`cell-${i}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Pie
                                        data={[{ value: 1 }]}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={0}
                                        fill="transparent"
                                    >
                                        <Cell fill="transparent" />
                                    </Pie>
                                    <Tooltip content={<LeaveDonutTooltip totalDays={totalLeaveDays} employeesByType={employeesByType} onPersonClick={onPersonClick} />} />
                                    {/* Center label */}
                                    <text
                                        x="50%"
                                        y="46%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-slate-800 text-2xl font-black"
                                        style={{ fontSize: '24px', fontWeight: 900 }}
                                    >
                                        {totalLeaveDays}
                                    </text>
                                    <text
                                        x="50%"
                                        y="55%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-slate-400"
                                        style={{ fontSize: '11px' }}
                                    >
                                        gun
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                {pieData.map(entry => (
                                    <div key={entry.name} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px] text-slate-500 font-semibold">
                                            {entry.name}: {entry.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                            Izin verisi bulunamadi.
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Bottom: Devam Durumu Trend ─── */}
            {hasTrend && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <TrendingUp size={14} className="text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Devam Durumu Trend</h3>
                    </div>
                    <div className="overflow-x-auto -mx-2">
                        <ResponsiveContainer width="100%" height={280} minWidth={400}>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                                <defs>
                                    <linearGradient id="atl-absent-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={AREA_COLORS.absent} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={AREA_COLORS.absent} stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="atl-leave-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={AREA_COLORS.leave} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={AREA_COLORS.leave} stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<TrendTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px' }}
                                    iconSize={10}
                                    iconType="circle"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Devamsiz"
                                    stackId="status"
                                    stroke={AREA_COLORS.absent}
                                    fill="url(#atl-absent-fill)"
                                    strokeWidth={2}
                                    fillOpacity={0.6}
                                    dot={{ r: 3, fill: AREA_COLORS.absent }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Izinli"
                                    stackId="status"
                                    stroke={AREA_COLORS.leave}
                                    fill="url(#atl-leave-fill)"
                                    strokeWidth={2}
                                    fillOpacity={0.6}
                                    dot={{ r: 3, fill: AREA_COLORS.leave }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
