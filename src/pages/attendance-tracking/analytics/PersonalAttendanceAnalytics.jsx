import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DatePicker } from 'antd';
import {
    Clock, Target, TrendingDown, TrendingUp, Coffee,
    ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
    CalendarDays, BarChart3, Activity, Loader2, AlertCircle,
    UtensilsCrossed, UserCheck, Palmtree, Ban
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
    Cell, Legend
} from 'recharts';
import api from '../../../services/api';

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
const QUICK_FILTERS = [
    { key: 'this_week', label: 'Bu Hafta' },
    { key: 'last_7', label: 'Son 7 Gun' },
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Gecen Ay' },
];

const DOW_LABELS = { MON: 'Pzt', TUE: 'Sal', WED: 'Car', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz' };

function buildQueryParams(quickFilter, customRange) {
    const params = {};
    const today = new Date();
    if (quickFilter === 'custom' && customRange.start && customRange.end) {
        params.start_date = customRange.start;
        params.end_date = customRange.end;
    } else if (quickFilter === 'this_week') {
        const mon = new Date(today);
        mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        params.start_date = mon.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
    } else if (quickFilter === 'last_7') {
        const d = new Date(today); d.setDate(d.getDate() - 7);
        params.start_date = d.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
    } else if (quickFilter === 'last_month') {
        const d = new Date(today.getFullYear(), today.getMonth() - 1, 26);
        const e = new Date(today.getFullYear(), today.getMonth(), 25);
        params.start_date = d.toISOString().split('T')[0];
        params.end_date = e.toISOString().split('T')[0];
    } else {
        // this_month — fiscal
        if (today.getDate() >= 26) {
            params.start_date = new Date(today.getFullYear(), today.getMonth(), 26).toISOString().split('T')[0];
            params.end_date = new Date(today.getFullYear(), today.getMonth() + 1, 25).toISOString().split('T')[0];
        } else {
            params.start_date = new Date(today.getFullYear(), today.getMonth() - 1, 26).toISOString().split('T')[0];
            params.end_date = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0];
        }
    }
    return params;
}

const timeToDecimal = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.round((h + m / 60) * 100) / 100;
};

/* ═══════════════════════════════════════════════════
   PERFORMANCE CIRCLE
   ═══════════════════════════════════════════════════ */
function PerformanceCircle({ value }) {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(value || 0, 0), 100);
    const offset = circumference - (clamped / 100) * circumference;
    const color = clamped >= 90 ? '#10b981' : clamped >= 70 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <svg width={180} height={180} className="transform -rotate-90">
                <circle cx={90} cy={90} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={12} />
                <circle
                    cx={90} cy={90} r={radius} fill="none"
                    stroke={color} strokeWidth={12} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-800">%{Math.round(clamped)}</span>
                <span className="text-[11px] text-slate-400 font-semibold">Verimlilik</span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
function KPICard({ label, value, suffix, icon: Icon, gradient, delta }) {
    const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
    const deltaColor = delta > 0 ? 'text-emerald-200' : delta < 0 ? 'text-red-200' : 'text-white/50';
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl font-black leading-tight">
                {value}{suffix && <span className="text-xs ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            {delta != null && (
                <div className={`flex items-center gap-0.5 mt-1 ${deltaColor}`}>
                    <DeltaIcon size={12} />
                    <span className="text-[10px] font-bold">%{Math.abs(delta)}</span>
                </div>
            )}
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10"><Icon size={48} /></div>}
        </div>
    );
}

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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MINI CALENDAR
   ═══════════════════════════════════════════════════ */
function MiniCalendar({ data }) {
    if (!data?.length) return null;
    const statusStyles = {
        full: 'bg-emerald-500 text-white',
        partial: 'bg-amber-400 text-white',
        absent: 'bg-red-500 text-white',
        off: 'bg-slate-100 text-slate-300',
        future: 'bg-slate-50 text-slate-200',
    };
    const statusSymbol = { full: '\u2713', partial: '\u25D0', absent: '\u2717', off: '\u00B7', future: '' };

    // Group by week rows (Mon-Fri only)
    const weeks = [];
    let currentWeek = [];
    for (const item of data) {
        const d = new Date(item.date);
        const dow = d.getDay(); // 0=Sun
        if (dow === 0 || dow === 6) continue; // skip weekends
        if (dow === 1 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(item);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return (
        <div className="bg-slate-50 rounded-xl p-3">
            <div className="grid grid-cols-5 gap-1 mb-2">
                {['Pzt', 'Sal', 'Car', 'Per', 'Cum'].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase">{d}</div>
                ))}
            </div>
            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-5 gap-1 mb-1">
                    {week.map((item, di) => (
                        <div
                            key={di}
                            className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold ${statusStyles[item.status] || statusStyles.off}`}
                            title={`${item.date}: ${item.status}`}
                        >
                            {statusSymbol[item.status] || ''}
                        </div>
                    ))}
                    {/* Fill empty slots if week is incomplete */}
                    {Array.from({ length: 5 - week.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-full aspect-square" />
                    ))}
                </div>
            ))}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200">
                {[['full', '\u2713 Tam'], ['partial', '\u25D0 Eksik'], ['absent', '\u2717 Devamsiz'], ['off', '\u00B7 Tatil']].map(([s, l]) => (
                    <div key={s} className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded ${statusStyles[s]} flex items-center justify-center text-[7px]`} />
                        <span className="text-[9px] text-slate-400">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PersonalAttendanceAnalytics() {
    const [quickFilter, setQuickFilter] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: null, end: null });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const queryParams = useMemo(() => buildQueryParams(quickFilter, customRange), [quickFilter, customRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('PersonalAnalytics fetch error:', err);
            setError('Kisisel analitik verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Scatter data
    const scatterData = useMemo(() => {
        if (!data?.entry_exit) return { checkIn: [], checkOut: [] };
        const checkIn = [];
        const checkOut = [];
        data.entry_exit.forEach((d, i) => {
            const ci = timeToDecimal(d.first_check_in || d.check_in);
            if (ci != null) checkIn.push({ x: i, y: ci, date: d.date, time: d.first_check_in || d.check_in });
            const co = timeToDecimal(d.last_check_out || d.check_out);
            if (co != null) checkOut.push({ x: i, y: co, date: d.date, time: d.last_check_out || d.check_out });
        });
        return { checkIn, checkOut };
    }, [data?.entry_exit]);

    // Weekly heatmap
    const weeklyHeatmap = useMemo(() => {
        if (!data?.weekly_pattern) return [];
        const ordered = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
        const maxVal = Math.max(...ordered.map(d => data.weekly_pattern[d] || 0), 1);
        return ordered.map(dow => ({
            day: DOW_LABELS[dow],
            hours: data.weekly_pattern[dow] || 0,
            intensity: (data.weekly_pattern[dow] || 0) / maxVal,
        }));
    }, [data?.weekly_pattern]);

    const kpi = data?.kpi;
    const summary = data?.summary;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={28} className="text-indigo-500 animate-spin mb-3" />
                <span className="text-sm text-slate-400">Kisisel analitik yukleniyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ─── Quick Date Filters ───────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {QUICK_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setQuickFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                quickFilter === f.key
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <DatePicker.RangePicker
                    size="small"
                    onChange={(dates) => {
                        if (dates) {
                            setCustomRange({ start: dates[0].format('YYYY-MM-DD'), end: dates[1].format('YYYY-MM-DD') });
                            setQuickFilter('custom');
                        }
                    }}
                    className="rounded-lg"
                    placeholder={['Baslangic', 'Bitis']}
                />
            </div>

            {/* ─── Performance Score Circle ─────────── */}
            {kpi && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative flex items-center justify-center">
                    <PerformanceCircle value={kpi.efficiency_pct} />
                </div>
            )}

            {/* ─── 5 KPI Cards ─────────────────────── */}
            {kpi && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <KPICard label="Calisan" value={kpi.total_worked_hours} suffix="s" icon={Clock} gradient="bg-gradient-to-br from-blue-500 to-blue-600" delta={kpi.vs_prev?.worked} />
                    <KPICard label="Hedef" value={kpi.target_hours} suffix="s" icon={Target} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" delta={null} />
                    <KPICard label="Eksik" value={kpi.missing_hours} suffix="s" icon={TrendingDown} gradient="bg-gradient-to-br from-rose-500 to-rose-600" delta={kpi.vs_prev?.missing} />
                    <KPICard label="Ek Mesai" value={kpi.overtime_hours} suffix="s" icon={TrendingUp} gradient="bg-gradient-to-br from-violet-500 to-violet-600" delta={kpi.vs_prev?.ot} />
                    <KPICard label="Ort. Mola" value={kpi.avg_break_minutes} suffix="dk" icon={Coffee} gradient="bg-gradient-to-br from-amber-500 to-amber-600" delta={null} />
                </div>
            )}

            {/* ─── Entry/Exit Scatter + Mini Calendar ─ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Scatter */}
                {(scatterData.checkIn.length > 0 || scatterData.checkOut.length > 0) && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={16} className="text-blue-500" />
                            <h4 className="text-sm font-bold text-slate-800">Giris/Cikis Dagılımı</h4>
                        </div>
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={220} minWidth={300}>
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis type="number" dataKey="x" hide />
                                    <YAxis
                                        type="number" dataKey="y" domain={[7, 20]}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v) => `${Math.floor(v).toString().padStart(2, '0')}:${Math.round((v % 1) * 60).toString().padStart(2, '0')}`}
                                    />
                                    <Tooltip content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                <p className="font-bold text-slate-700">{d.date}</p>
                                                <p className="text-slate-500">{d.time}</p>
                                            </div>
                                        );
                                    }} />
                                    <ReferenceLine y={9} stroke="#6366f1" strokeDasharray="3 3" label={{ value: '09:00', fontSize: 9, fill: '#6366f1' }} />
                                    <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '18:00', fontSize: 9, fill: '#f59e0b' }} />
                                    <Scatter name="Giris" data={scatterData.checkIn} fill="#3b82f6">
                                        {scatterData.checkIn.map((_, i) => <Cell key={`ci-${i}`} fill="#3b82f6" />)}
                                    </Scatter>
                                    <Scatter name="Cikis" data={scatterData.checkOut} fill="#f59e0b">
                                        {scatterData.checkOut.map((_, i) => <Cell key={`co-${i}`} fill="#f59e0b" />)}
                                    </Scatter>
                                    <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Mini Calendar */}
                {data?.calendar && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarDays size={16} className="text-indigo-500" />
                            <h4 className="text-sm font-bold text-slate-800">Ay Takvimi</h4>
                        </div>
                        <MiniCalendar data={data.calendar} />
                    </div>
                )}
            </div>

            {/* ─── Daily Hours Bar Chart ───────────── */}
            {data?.daily_hours?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={16} className="text-indigo-500" />
                        <h4 className="text-sm font-bold text-slate-800">Gunluk Calisma Saatleri</h4>
                    </div>
                    <div className="overflow-x-auto -mx-2">
                        <ResponsiveContainer width="100%" height={240} minWidth={400}>
                            <BarChart data={data.daily_hours} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }}
                                    tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} />
                                <Tooltip content={<ChartTooltip />} />
                                <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'Hedef 8s', fontSize: 9, fill: '#ef4444', position: 'right' }} />
                                <Bar dataKey="worked" name="Calisma" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar dataKey="ot" name="Ek Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ─── Weekly Heatmap + Summary Metrics ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Heatmap */}
                {weeklyHeatmap.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDays size={16} className="text-violet-500" />
                            <h4 className="text-sm font-bold text-slate-800">Haftalik Oruntu</h4>
                        </div>
                        <div className="flex items-end gap-3 justify-center">
                            {weeklyHeatmap.map((d) => (
                                <div key={d.day} className="flex flex-col items-center gap-1.5">
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500"
                                        style={{
                                            backgroundColor: `rgba(99, 102, 241, ${0.1 + d.intensity * 0.7})`,
                                            color: d.intensity > 0.5 ? 'white' : '#64748b',
                                        }}
                                    >
                                        {d.hours}s
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary Metrics */}
                {summary && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={16} className="text-emerald-500" />
                            <h4 className="text-sm font-bold text-slate-800">Ozet Metrikler</h4>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Ort. Giris', value: summary.avg_check_in || '-', icon: Clock, color: 'text-blue-500' },
                                { label: 'Ort. Cikis', value: summary.avg_check_out || '-', icon: Clock, color: 'text-amber-500' },
                                { label: 'En Erken Giris', value: summary.earliest_check_in?.time ? `${summary.earliest_check_in.time} (${summary.earliest_check_in.date})` : '-', icon: TrendingDown, color: 'text-emerald-500' },
                                { label: 'En Gec Cikis', value: summary.latest_check_out?.time ? `${summary.latest_check_out.time} (${summary.latest_check_out.date})` : '-', icon: TrendingUp, color: 'text-violet-500' },
                                { label: 'Dakiklik', value: `%${summary.punctuality_pct} (${summary.punctual_days}/${summary.total_working_days})`, icon: UserCheck, color: 'text-indigo-500' },
                                { label: 'Yemek', value: `${summary.meal_orders}/${summary.meal_working_days} gun`, icon: UtensilsCrossed, color: 'text-orange-500' },
                                { label: 'Izin', value: `${summary.leave_used}/${summary.leave_total} gun`, icon: Palmtree, color: 'text-teal-500' },
                                { label: 'Devamsizlik', value: `${summary.absence_days} gun`, icon: Ban, color: 'text-red-500' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <item.icon size={13} className={item.color} />
                                        <span className="text-xs text-slate-500">{item.label}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
