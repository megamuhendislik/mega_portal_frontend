import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Legend
} from 'recharts';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Activity } from 'lucide-react';
import {
    startOfWeek, endOfWeek, addDays, format, isSameDay,
    startOfMonth, endOfMonth, getWeek, getYear, eachWeekOfInterval
} from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';
import useIsMobile from '../hooks/useIsMobile';
import { getIstanbulToday, getIstanbulTodayDate, getIstanbulMonth } from '../utils/dateUtils';

// Safe date validation: returns true if Date is valid
const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

// Safe format wrapper — returns fallback string if date is invalid
const safeFormat = (date, pattern, options) => {
    try {
        if (!isValidDate(date)) return '-';
        return format(date, pattern, options);
    } catch {
        return '-';
    }
};

// Safe Date parser from string — returns null if invalid
const safeParse = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
};

// ─── Weekly View (Günlük) ─────────────────────────────────────────────
const WeeklyView = ({ logs, showBreaks, employeeId, onDateClick }) => {
    const isMobile = useIsMobile();
    const [weekStart, setWeekStart] = useState(() => {
        if (logs && logs.length > 0 && logs[0].work_date) {
            const d = safeParse(logs[0].work_date);
            if (d) return startOfWeek(d, { weekStartsOn: 1 });
        }
        return startOfWeek(getIstanbulTodayDate(), { weekStartsOn: 1 });
    });

    const [fetchedLogs, setFetchedLogs] = useState([]);
    const [dailyTargets, setDailyTargets] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (logs && logs.length > 0 && logs[0].work_date) {
            const firstLog = safeParse(logs[0].work_date);
            if (firstLog && Math.abs(weekStart - firstLog) > 1000 * 60 * 60 * 24 * 45) {
                setWeekStart(startOfWeek(firstLog, { weekStartsOn: 1 }));
                setFetchedLogs([]);
            }
        }
    }, [logs]);

    const allLogs = useMemo(() => {
        const combined = [...(logs || []), ...fetchedLogs];
        const unique = new Map();
        combined.forEach(l => {
            if (l.id) unique.set(l.id, l);
            else unique.set(`${l.work_date}-${l.check_in || 'no-in'}`, l);
        });
        return Array.from(unique.values());
    }, [logs, fetchedLogs]);

    useEffect(() => {
        const checkAndFetch = async () => {
            if (!employeeId || !isValidDate(weekStart)) return;
            const startStr = safeFormat(weekStart, 'yyyy-MM-dd');
            const endStr = safeFormat(addDays(weekStart, 6), 'yyyy-MM-dd');
            if (startStr === '-' || endStr === '-') return;
            let needsFetch = false;
            if (logs && logs.length > 0) {
                const logsMin = safeParse(logs[0].work_date);
                const logsMax = safeParse(logs[logs.length - 1].work_date);
                if (logsMin && logsMax && (addDays(weekStart, 6) < logsMin || weekStart > logsMax)) needsFetch = true;
            } else {
                needsFetch = true;
            }
            if (fetchedLogs.some(l => l.work_date >= startStr && l.work_date <= endStr)) needsFetch = false;
            if (needsFetch) {
                setLoading(true);
                try {
                    const res = await api.get(`/attendance/?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}&limit=100`);
                    const newLogs = res.data.results || res.data;
                    if (newLogs && newLogs.length > 0) setFetchedLogs(prev => [...prev, ...newLogs]);
                } catch (err) {
                    console.error("Historical data fetch failed", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        checkAndFetch();
    }, [weekStart, employeeId]);

    useEffect(() => {
        const fetchTargets = async () => {
            if (!employeeId || !isValidDate(weekStart)) return;
            const startStr = safeFormat(weekStart, 'yyyy-MM-dd');
            const endStr = safeFormat(addDays(weekStart, 6), 'yyyy-MM-dd');
            if (startStr === '-' || endStr === '-') return;
            try {
                const res = await api.get(`/attendance/daily-targets/?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}`);
                const targetMap = {};
                (res.data || []).forEach(item => { targetMap[item.date] = item.target_seconds; });
                setDailyTargets(prev => ({ ...prev, ...targetMap }));
            } catch (err) {
                console.error("Daily targets fetch failed", err);
            }
        };
        fetchTargets();
    }, [weekStart, employeeId]);

    const data = useMemo(() => {
        if (!isValidDate(weekStart)) return [];
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = addDays(weekStart, i);
            const dateStr = safeFormat(d, 'yyyy-MM-dd');
            if (dateStr === '-') continue;
            const dayLogs = allLogs.filter(l => l.work_date === dateStr);

            const totalNormal = dayLogs.reduce((acc, l) => acc + (l.normal_seconds || 0), 0);
            const totalBreak = dayLogs.reduce((acc, l) => acc + (l.break_seconds || 0), 0);
            const otApproved = dayLogs.reduce((acc, l) => acc + (l.ot_approved_seconds || 0), 0);
            const otPending = dayLogs.reduce((acc, l) => acc + (l.pending_overtime_seconds || 0), 0);
            const totalCalcOt = dayLogs.reduce((acc, l) => acc + (l.calculated_overtime_seconds || 0), 0);
            // İzin/Rapor günlerinde: normal → leave olarak göster, potansiyel OT sıfırla
            const isLeaveDay = dayLogs.length > 0 && dayLogs.every(l => ['DUTY', 'HEALTH_REPORT', 'HOSPITAL_VISIT'].includes(l.source));
            const otPotential = isLeaveDay ? 0 : Math.max(0, totalCalcOt - otApproved - otPending);
            const totalMissing = dayLogs.reduce((acc, l) => acc + (l.missing_seconds || 0), 0);
            const dayTarget = dayLogs.length > 0
                ? Math.max(...dayLogs.map(l => l.day_target_seconds || 0))
                : (dailyTargets[dateStr] || 0);

            days.push({
                date: dateStr,
                name: safeFormat(d, 'EEE', { locale: tr }),
                fullDate: safeFormat(d, 'd MMM yyyy', { locale: tr }),
                normal: isLeaveDay ? 0 : parseFloat((totalNormal / 3600).toFixed(1)),
                leave: isLeaveDay ? parseFloat((totalNormal / 3600).toFixed(1)) : 0,
                ot_approved: parseFloat((otApproved / 3600).toFixed(2)),
                ot_pending: parseFloat((otPending / 3600).toFixed(2)),
                ot_potential: parseFloat((otPotential / 3600).toFixed(2)),
                missing: isLeaveDay ? 0 : parseFloat((totalMissing / 3600).toFixed(1)),
                break_time: parseFloat((totalBreak / 3600).toFixed(2)),
                target: dayTarget > 0 ? parseFloat((dayTarget / 3600).toFixed(1)) : null,
                isFuture: dateStr > getIstanbulToday()
            });
        }
        return days;
    }, [allLogs, weekStart, dailyTargets]);

    return (
        <div className="h-full flex flex-col relative">
            {loading && <div className="absolute top-2 right-12 text-xs text-indigo-500 font-bold animate-pulse">Veri yükleniyor...</div>}
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs font-bold text-slate-500">
                    {safeFormat(weekStart, 'd MMM', { locale: tr })} - {safeFormat(addDays(weekStart, 6), 'd MMM', { locale: tr })}
                </span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-1">
                    <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex-1 w-full" style={{ height: isMobile ? 220 : 320 }}>
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <ComposedChart
                        data={data}
                        barSize={isMobile ? 16 : 32}
                        margin={{ top: 10, right: 10, left: isMobile ? 0 : -20, bottom: isMobile ? 20 : 0 }}
                        onClick={(e) => {
                            if (e?.activePayload?.[0]?.payload?.date && onDateClick) {
                                onDateClick(e.activePayload[0].payload.date);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <defs>
                            <pattern id="striped-analytics" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                <rect width="4" height="8" fill="#f43f5e" opacity="0.1" />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2" />
                            </pattern>
                            <pattern id="striped-pending" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                <rect width="8" height="8" fill="#fde68a" />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="#d97706" strokeWidth="3" />
                            </pattern>
                            <pattern id="striped-potential" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-45)">
                                <rect width="8" height="8" fill="#e2e8f0" />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="3" />
                            </pattern>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 10, fill: '#94a3b8' }} dy={5} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 10, fill: '#94a3b8' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                            cursor={{ fill: '#f8fafc', cursor: 'pointer' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '4px', fontSize: '10px' }} />
                        <Line type="step" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} name="Hedef" connectNulls={false} />
                        <Bar dataKey="leave" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} name="İzin/Rapor" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Normal" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        <Bar dataKey="ot_approved" stackId="a" fill="#10b981" name="Onaylı Mesai" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        <Bar dataKey="ot_pending" stackId="a" fill="url(#striped-pending)" stroke="#f59e0b" strokeWidth={1} name="Bekleyen Mesai" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        <Bar dataKey="ot_potential" stackId="a" fill="url(#striped-potential)" stroke="#94a3b8" strokeWidth={1} radius={[4, 4, 0, 0]} name="Potansiyel Mesai" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        <Bar dataKey="missing" stackId="a" fill="url(#striped-analytics)" stroke="#f43f5e" strokeWidth={1} radius={[4, 4, 0, 0]} name="Eksik" onClick={(d) => onDateClick && onDateClick(d.date)} />
                        {showBreaks && (
                            <Bar dataKey="break_time" stackId="b" fill="#fbbf24" radius={[4, 4, 4, 4]} name="Mola" barSize={isMobile ? 8 : 12} onClick={(d) => onDateClick && onDateClick(d.date)} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ─── Monthly Bar View (Aylık — Haftalık Ort. Günlük Değerler) ─────────
const MonthlyBarView = ({ data, showBreaks, showTotals }) => {
    const isMobile = useIsMobile();

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;
        const d = payload[0]?.payload;
        return (
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 min-w-[200px]">
                <p className="text-sm font-bold text-slate-700 mb-1">
                    {label}
                    <span className="text-xs font-normal text-slate-400 ml-1">({d?.day_count || '-'} gün)</span>
                </p>
                <p className="text-[10px] text-slate-400 mb-2">Ort. günlük değerler</p>
                <div className="space-y-1">
                    {d?.avg_normal > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Normal</span>
                            <span className="font-bold">{d.avg_normal} sa</span>
                        </div>
                    )}
                    {d?.avg_ot_approved > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Onaylı Mesai</span>
                            <span className="font-bold">{d.avg_ot_approved} sa</span>
                        </div>
                    )}
                    {d?.avg_ot_pending > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Bekleyen Mesai</span>
                            <span className="font-bold">{d.avg_ot_pending} sa</span>
                        </div>
                    )}
                    {d?.avg_ot_potential > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Potansiyel Mesai</span>
                            <span className="font-bold">{d.avg_ot_potential} sa</span>
                        </div>
                    )}
                    {d?.avg_missing > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Eksik</span>
                            <span className="font-bold">{d.avg_missing} sa</span>
                        </div>
                    )}
                    {showBreaks && d?.avg_break > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300" />Mola</span>
                            <span className="font-bold">{d.avg_break} sa</span>
                        </div>
                    )}
                    {showTotals && (
                        <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5">
                            <p className="text-[10px] text-slate-400">Haftalık toplam</p>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Toplam Çalışma</span>
                                <span className="font-bold">{d?.total_work || 0} sa</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" />Toplam Mesai</span>
                                <span className="font-bold">{d?.total_ot || 0} sa</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full pt-2" style={{ height: isMobile ? 220 : 320 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <ComposedChart
                    data={data}
                    barSize={isMobile ? 24 : 40}
                    margin={{ top: 10, right: showTotals ? 40 : 10, left: isMobile ? 0 : -20, bottom: isMobile ? 20 : 0 }}
                >
                    <defs>
                        <pattern id="striped-m-missing" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <rect width="4" height="8" fill="#f43f5e" opacity="0.15" />
                            <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2" />
                        </pattern>
                        <pattern id="striped-m-pending" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <rect width="8" height="8" fill="#fde68a" />
                            <line x1="0" y1="0" x2="0" y2="8" stroke="#d97706" strokeWidth="3" />
                        </pattern>
                        <pattern id="striped-m-potential" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-45)">
                            <rect width="8" height="8" fill="#e2e8f0" />
                            <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="3" />
                        </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }}
                        label={{ value: 'Ort. Sa/Gün', angle: -90, position: 'insideLeft', offset: 15, fontSize: 9, fill: '#94a3b8' }}
                    />
                    {showTotals && (
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: isMobile ? 9 : 11, fill: '#6366f1' }}
                            label={{ value: 'Toplam Sa', angle: 90, position: 'insideRight', offset: 15, fontSize: 9, fill: '#6366f1' }}
                        />
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />

                    {/* Average daily bars */}
                    <Bar yAxisId="left" dataKey="avg_normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Ort. Normal" />
                    <Bar yAxisId="left" dataKey="avg_ot_approved" stackId="a" fill="#10b981" name="Ort. Onaylı Mesai" />
                    <Bar yAxisId="left" dataKey="avg_ot_pending" stackId="a" fill="url(#striped-m-pending)" stroke="#f59e0b" strokeWidth={1} name="Ort. Bekleyen" />
                    <Bar yAxisId="left" dataKey="avg_ot_potential" stackId="a" fill="url(#striped-m-potential)" stroke="#94a3b8" strokeWidth={1} name="Ort. Potansiyel" />
                    <Bar yAxisId="left" dataKey="avg_missing" stackId="a" fill="url(#striped-m-missing)" stroke="#f43f5e" strokeWidth={1} radius={[4, 4, 0, 0]} name="Ort. Eksik" />

                    {/* Break as small side bar */}
                    {showBreaks && (
                        <Bar yAxisId="left" dataKey="avg_break" stackId="b" fill="#fbbf24" radius={[4, 4, 4, 4]} name="Ort. Mola" barSize={isMobile ? 10 : 16} />
                    )}

                    {/* Total lines (optional) */}
                    {showTotals && (
                        <Line yAxisId="right" type="monotone" dataKey="total_work" name="Toplam Çalışma" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    )}
                    {showTotals && (
                        <Line yAxisId="right" type="monotone" dataKey="total_ot" name="Toplam Mesai" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Yearly View (Yıllık — Aylık Toplam + Kümülatif) ─────────────────
const YearlyView = ({ data }) => {
    const isMobile = useIsMobile();

    const simplifiedData = useMemo(() => data.map(m => ({
        ...m,
        total_mesai: parseFloat(((m.ot_approved || 0) + (m.ot_pending || 0) + (m.ot_potential || 0)).toFixed(1)),
    })), [data]);

    const CustomBar = (props) => {
        const { x, y, width, height, payload, fill, radius } = props;
        const opacity = payload?._isFuture ? 0.15 : payload?._isBeforeStart ? 0.08 : 1;
        const r = radius || [0, 0, 0, 0];
        return <rect x={x} y={y} width={width} height={height} fill={fill} opacity={opacity} rx={r[0] || 0} ry={r[0] || 0} />;
    };

    const CustomXTick = ({ x, y, payload: tickPayload }) => {
        const item = simplifiedData.find(d => d.name === tickPayload?.value);
        const isPast = item?._isPast;
        const isCurrent = item?._isCurrent;
        const isFuture = item?._isFuture || item?._isBeforeStart;

        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    textAnchor="middle"
                    dy={12}
                    fontSize={isMobile ? 9 : 11}
                    fontWeight={isCurrent ? 800 : 600}
                    fill={isFuture ? '#CBD5E1' : isCurrent ? '#6366F1' : '#94A3B8'}
                >
                    {tickPayload?.value}
                </text>
                {isPast && (
                    <text textAnchor="middle" dy={25} fontSize={10} fill="#10B981" fontWeight="bold">
                        ✓
                    </text>
                )}
                {isCurrent && (
                    <circle cx={0} cy={24} r={3} fill="#6366F1">
                        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                )}
            </g>
        );
    };

    const renderBarLabel = (props) => {
        const { x, y, width, index } = props;
        const item = simplifiedData[index];
        if (!item?._isPast && !item?._isCurrent) return null;
        const totalHours = Math.round((item.normal || 0) + (item.total_mesai || 0));
        if (totalHours <= 0) return null;
        return (
            <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={isMobile ? 8 : 9} fill="#64748B" fontWeight="700">
                {totalHours}
            </text>
        );
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;
        const d = payload[0]?.payload;
        if (d?._isBeforeStart) return null;

        if (d?._isFuture) {
            return (
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 min-w-[160px]">
                    <p className="text-sm font-bold text-slate-400 mb-1">{label}</p>
                    <p className="text-xs text-slate-400 italic">Henüz veri yok</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 min-w-[200px]">
                <p className="text-sm font-bold text-slate-700 mb-2">{label} {d?._isCurrent ? '(Aktif)' : ''}</p>
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Normal</span>
                        <span className="font-bold">{d?.normal || 0} sa</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Toplam Mesai</span>
                        <span className="font-bold">{d?.total_mesai || 0} sa</span>
                    </div>
                    {(d?.ot_approved > 0 || d?.ot_pending > 0 || d?.ot_potential > 0) && (
                        <div className="pl-4 border-l-2 border-emerald-200 space-y-0.5 text-[10px] text-slate-500">
                            {d?.ot_approved > 0 && <div className="flex justify-between"><span>Onaylı</span><span>{d.ot_approved} sa</span></div>}
                            {d?.ot_pending > 0 && <div className="flex justify-between"><span>Bekleyen</span><span>{d.ot_pending} sa</span></div>}
                            {d?.ot_potential > 0 && <div className="flex justify-between"><span>Potansiyel</span><span>{d.ot_potential} sa</span></div>}
                        </div>
                    )}
                    {d?.missing > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Eksik</span>
                            <span className="font-bold">{d.missing} sa</span>
                        </div>
                    )}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />Kümülatif Net</span>
                            <span className="font-bold">{d?.cumulative_net_hours || 0} sa</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full pt-2" style={{ height: isMobile ? 250 : 350 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <ComposedChart data={simplifiedData} barSize={isMobile ? 12 : 18} margin={{ top: 25, right: 40, left: isMobile ? 0 : -20, bottom: isMobile ? 30 : 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={<CustomXTick />} dy={10} interval={0} />
                    <YAxis yAxisId="left" domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: '#94A3B8' }} label={{ value: 'Saat', angle: -90, position: 'insideLeft', offset: 15, fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: '#8b5cf6' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />

                    <Bar yAxisId="left" dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Normal (Sa)" shape={<CustomBar />} label={renderBarLabel} />
                    <Bar yAxisId="left" dataKey="total_mesai" stackId="a" fill="#10b981" name="Mesai (Sa)" shape={<CustomBar />} />
                    <Bar yAxisId="left" dataKey="missing" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} name="Eksik (Sa)" shape={<CustomBar />} />

                    <Line yAxisId="right" type="monotone" dataKey="cumulative_net_hours" name="Kümülatif Net (Sa)" stroke="#8b5cf6" strokeWidth={3} dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (payload?._isFuture || payload?._isBeforeStart) return <circle cx={0} cy={0} r={0} fill="transparent" />;
                        return <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" strokeWidth={2} stroke="#fff" />;
                    }} activeDot={{ r: 6 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────
const AttendanceAnalyticsChart = ({ logs, currentYear = Number(getIstanbulToday().split('-')[0]), currentMonth = (() => { const [, m, d] = getIstanbulToday().split('-').map(Number); return d >= 26 ? (m + 1 > 12 ? 1 : m + 1) : m; })(), employeeId, onDateClick }) => {
    const [scope, setScope] = useState('WEEKLY');
    const [yearlyData, setYearlyData] = useState([]);
    const [monthlyBarData, setMonthlyBarData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showBreaks, setShowBreaks] = useState(false);
    const [showTotals, setShowTotals] = useState(false);

    useEffect(() => {
        if (scope === 'WEEKLY') return;
        const fetchStats = async () => {
            setLoading(true);
            try {
                const params = { scope, year: currentYear, employee_id: employeeId };
                if (scope === 'MONTHLY') params.month = currentMonth;
                const res = await api.get('/attendance/stats/', { params });

                if (scope === 'YEARLY') {
                    const months = res.data.months || res.data;
                    const meta = {
                        systemStartFiscalMonth: res.data.system_start_fiscal_month || 1,
                        currentFiscalMonth: res.data.current_fiscal_month || getIstanbulMonth(),
                    };
                    setYearlyData(months.map(m => {
                        const isBeforeStart = m.month < meta.systemStartFiscalMonth;
                        return {
                            name: new Date(2000, m.month - 1, 1).toLocaleString('tr-TR', { month: 'short', timeZone: 'Europe/Istanbul' }),
                            month: m.month,
                            normal: isBeforeStart ? 0 : m.normal_hours,
                            overtime: isBeforeStart ? 0 : m.overtime_hours,
                            ot_approved: isBeforeStart ? 0 : (m.ot_approved_hours || 0),
                            ot_pending: isBeforeStart ? 0 : (m.ot_pending_hours || 0),
                            ot_potential: isBeforeStart ? 0 : (m.ot_potential_hours || 0),
                            missing: isBeforeStart ? 0 : m.missing_hours,
                            cumulative_net_hours: isBeforeStart ? 0 : m.cumulative_net_hours,
                            _isPast: m.month < meta.currentFiscalMonth && m.month >= meta.systemStartFiscalMonth,
                            _isCurrent: m.month === meta.currentFiscalMonth,
                            _isFuture: m.month > meta.currentFiscalMonth,
                            _isBeforeStart: isBeforeStart,
                        };
                    }));
                } else if (scope === 'MONTHLY') {
                    setMonthlyBarData(res.data.map(w => ({
                        name: w.label,
                        day_count: w.day_count || 0,
                        // Average daily values (bars)
                        avg_normal: w.normal,
                        avg_overtime: w.overtime,
                        avg_ot_approved: w.ot_approved || 0,
                        avg_ot_pending: w.ot_pending || 0,
                        avg_ot_potential: w.ot_potential || 0,
                        avg_missing: w.missing || 0,
                        avg_break: w.break || 0,
                        // Weekly totals (lines)
                        total_work: parseFloat((
                            (w.total_normal ?? (w.normal || 0) * (w.day_count || 1)) +
                            (w.total_overtime ?? (w.overtime || 0) * (w.day_count || 1))
                        ).toFixed(1)),
                        total_ot: parseFloat((
                            w.total_overtime ?? (w.overtime || 0) * (w.day_count || 1)
                        ).toFixed(1)),
                    })));
                }
            } catch (err) {
                console.error("Stats Fetch Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [scope, currentYear, currentMonth, employeeId]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BarChart2 size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Puantaj Tablosu</h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {scope === 'WEEKLY' ? 'Günlük çalışma süreleri' : (scope === 'MONTHLY' ? 'Haftalık ort. günlük çalışma' : 'Aylık toplam & kümülatif net bakiye')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Breaks toggle (weekly + monthly) */}
                    {scope !== 'YEARLY' && (
                        <label className="flex items-center cursor-pointer relative">
                            <input type="checkbox" className="sr-only peer" checked={showBreaks} onChange={(e) => setShowBreaks(e.target.checked)} />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                            <span className="ml-2 text-[10px] font-bold text-slate-500">Mola</span>
                        </label>
                    )}

                    {/* Totals toggle (monthly only) */}
                    {scope === 'MONTHLY' && (
                        <label className="flex items-center cursor-pointer relative">
                            <input type="checkbox" className="sr-only peer" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                            <span className="ml-2 text-[10px] font-bold text-slate-500">Toplam</span>
                        </label>
                    )}

                    {/* Scope tabs */}
                    <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-100">
                        {['WEEKLY', 'MONTHLY', 'YEARLY'].map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${scope === s
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {s === 'WEEKLY' ? 'Haftalık' : (s === 'MONTHLY' ? 'Aylık' : 'Yıllık')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative">
                {loading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center text-indigo-600 text-xs font-bold">Yükleniyor...</div>}

                {scope === 'WEEKLY' && <WeeklyView logs={logs} showBreaks={showBreaks} employeeId={employeeId} onDateClick={onDateClick} />}
                {scope === 'MONTHLY' && <MonthlyBarView data={monthlyBarData} showBreaks={showBreaks} showTotals={showTotals} />}
                {scope === 'YEARLY' && <YearlyView data={yearlyData} />}
            </div>
        </div>
    );
};

export default AttendanceAnalyticsChart;
