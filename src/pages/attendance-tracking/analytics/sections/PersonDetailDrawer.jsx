import React, { useState, useEffect, useMemo } from 'react';
import {
    X, User, Clock, Target, TrendingUp, TrendingDown,
    Coffee, UtensilsCrossed, Calendar, FileText, Activity,
    CreditCard, AlertCircle, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
    Cell
} from 'recharts';
import ModalOverlay from '../../../../components/ui/ModalOverlay';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const minutesToDecimal = (mins) => {
    if (mins == null) return null;
    return Math.round((mins / 60) * 100) / 100;
};

const ICON_MAP = {
    calendar: Calendar,
    clock: Clock,
    utensils: UtensilsCrossed,
    'id-card': CreditCard,
};

const STATUS_COLORS = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Bekliyor' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Onaylandı' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reddedildi' },
};

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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   KPI CARD (mini)
   ═══════════════════════════════════════════════════ */
function KPIMini({ label, value, suffix, gradient, icon: Icon }) {
    return (
        <div className={`${gradient} text-white p-3 rounded-xl relative overflow-hidden`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <h4 className="text-lg font-black leading-tight">
                {value}
                {suffix && <span className="text-xs ml-0.5 font-bold opacity-80">{suffix}</span>}
            </h4>
            {Icon && (
                <div className="absolute -right-2 -bottom-2 opacity-10">
                    <Icon size={40} />
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════ */
function ProgressBar({ label, value, max = 100, color = 'bg-indigo-500', showPct = true }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                {showPct && <span className="text-[11px] font-bold text-slate-500">%{pct}</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════════ */
function SectionHeader({ icon: Icon, title, iconColor = 'text-slate-400' }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            {Icon && <Icon size={14} className={iconColor} />}
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   STAT PAIR (employee vs team)
   ═══════════════════════════════════════════════════ */
function StatPair({ label, empValue, teamValue, empLabel = 'Siz', teamLabel = 'Ekip Ort.' }) {
    return (
        <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] text-slate-400 font-semibold mb-2">{label}</p>
            <div className="flex items-center justify-between">
                <div className="text-center">
                    <p className="text-sm font-bold text-indigo-600">{empValue || '-'}</p>
                    <p className="text-[9px] text-slate-400">{empLabel}</p>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="text-center">
                    <p className="text-sm font-bold text-slate-500">{teamValue || '-'}</p>
                    <p className="text-[9px] text-slate-400">{teamLabel}</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PersonDetailDrawer({ open, onClose, employeeId, queryParams }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !employeeId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get('/attendance-analytics/person-detail/', {
            params: { employee_id: employeeId, ...queryParams }
        })
            .then(res => { if (!cancelled) setData(res.data); })
            .catch(err => {
                console.error('PersonDetail fetch error:', err);
                if (!cancelled) setError('Veri yuklenemedi.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, employeeId, queryParams]);

    // ─── Scatter data ────────────────────────────────
    const scatterData = useMemo(() => {
        if (!data?.entry_exit_scatter) return { checkIn: [], checkOut: [] };
        const checkIn = [];
        const checkOut = [];
        data.entry_exit_scatter.forEach((d, i) => {
            const ciMin = timeToMinutes(d.check_in);
            if (ciMin != null) {
                checkIn.push({ x: i, y: minutesToDecimal(ciMin), date: d.date, time: d.check_in });
            }
            const coMin = timeToMinutes(d.check_out);
            if (coMin != null) {
                checkOut.push({ x: i, y: minutesToDecimal(coMin), date: d.date, time: d.check_out });
            }
        });
        return { checkIn, checkOut };
    }, [data?.entry_exit_scatter]);

    // ─── Radar data ────────────────────────────────
    const radarData = useMemo(() => {
        if (!data?.vs_team_radar) return [];
        const { axes, employee, team_avg } = data.vs_team_radar;
        return axes.map((axis, i) => ({
            subject: axis,
            employee: employee[i] || 0,
            team: team_avg[i] || 0,
        }));
    }, [data?.vs_team_radar]);

    if (!open) return null;

    const emp = data?.employee;
    const kpi = data?.kpi;
    const otb = data?.ot_breakdown;
    const bm = data?.break_meal;
    const requests = data?.active_requests || [];
    const trend = data?.target_trend || [];
    const dailyHours = data?.daily_hours || [];

    return (
        <ModalOverlay open onClose={onClose} className="!justify-end !p-0 md:!p-4">
            <div className="w-full max-w-lg h-full md:h-[calc(100vh-2rem)] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* ─── Fixed Header ────────────────────────────── */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(emp?.name || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-800 truncate">{emp?.name || 'Yukleniyor...'}</h3>
                            <p className="text-[11px] text-slate-400 truncate">
                                {emp?.department || ''}{emp?.position ? ` · ${emp.position}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* ─── Scrollable Content ──────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Loading state */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={24} className="text-indigo-500 animate-spin mb-2" />
                            <span className="text-xs text-slate-400">Detayli analiz yukleniyor...</span>
                        </div>
                    )}

                    {/* Error state */}
                    {error && !loading && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-600 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Data loaded */}
                    {data && !loading && (
                        <>
                            {/* ─── Section 1: Period ─────────────────── */}
                            {data.period && (
                                <div className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    <span>{data.period.start_date} — {data.period.end_date}</span>
                                </div>
                            )}

                            {/* ─── Section 2: 4 KPI cards ────────────── */}
                            {kpi && (
                                <div className="grid grid-cols-2 gap-3">
                                    <KPIMini
                                        label="Verimlilik"
                                        value={`%${kpi.efficiency_pct}`}
                                        gradient={
                                            kpi.efficiency_pct >= 95 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                            : kpi.efficiency_pct >= 80 ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                                            : 'bg-gradient-to-br from-red-500 to-red-600'
                                        }
                                        icon={Target}
                                    />
                                    <KPIMini
                                        label="Calisan"
                                        value={kpi.worked_hours}
                                        suffix="saat"
                                        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                                        icon={Clock}
                                    />
                                    <KPIMini
                                        label="Eksik"
                                        value={kpi.missing_hours}
                                        suffix="saat"
                                        gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                                        icon={TrendingDown}
                                    />
                                    <KPIMini
                                        label="Ek Mesai"
                                        value={kpi.overtime_hours}
                                        suffix="saat"
                                        gradient="bg-gradient-to-br from-violet-500 to-violet-600"
                                        icon={TrendingUp}
                                    />
                                </div>
                            )}

                            {/* ─── Section 3: Entry/Exit Scatter ─────── */}
                            {(scatterData.checkIn.length > 0 || scatterData.checkOut.length > 0) && (
                                <div>
                                    <SectionHeader icon={Activity} title="Giris/Cikis Dagılımı" iconColor="text-blue-500" />
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <ResponsiveContainer width="100%" height={180}>
                                            <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis
                                                    type="number"
                                                    dataKey="x"
                                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                    hide
                                                />
                                                <YAxis
                                                    type="number"
                                                    dataKey="y"
                                                    domain={[7, 20]}
                                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                    tickFormatter={(v) => {
                                                        const h = Math.floor(v);
                                                        const m = Math.round((v - h) * 60);
                                                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                                    }}
                                                />
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload?.length) return null;
                                                        const d = payload[0].payload;
                                                        return (
                                                            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                                <p className="font-bold text-slate-700">{d.date}</p>
                                                                <p className="text-slate-500">{d.time}</p>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <ReferenceLine y={9} stroke="#6366f1" strokeDasharray="3 3" label={{ value: '09:00', fontSize: 9, fill: '#6366f1' }} />
                                                <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '18:00', fontSize: 9, fill: '#f59e0b' }} />
                                                <Scatter
                                                    name="Giris"
                                                    data={scatterData.checkIn}
                                                    fill="#3b82f6"
                                                >
                                                    {scatterData.checkIn.map((_, i) => (
                                                        <Cell key={`ci-${i}`} fill="#3b82f6" />
                                                    ))}
                                                </Scatter>
                                                <Scatter
                                                    name="Cikis"
                                                    data={scatterData.checkOut}
                                                    fill="#f59e0b"
                                                >
                                                    {scatterData.checkOut.map((_, i) => (
                                                        <Cell key={`co-${i}`} fill="#f59e0b" />
                                                    ))}
                                                </Scatter>
                                                <Legend
                                                    wrapperStyle={{ fontSize: '10px' }}
                                                    iconSize={8}
                                                />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 4: Daily Hours Bar ────────── */}
                            {dailyHours.length > 0 && (
                                <div>
                                    <SectionHeader icon={Clock} title="Gunluk Calisma Saati" iconColor="text-indigo-500" />
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={dailyHours} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                                                    tickFormatter={(v) => {
                                                        const d = new Date(v);
                                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                                    }}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                    domain={[0, 'auto']}
                                                />
                                                <Tooltip content={<ChartTooltip />} />
                                                <ReferenceLine
                                                    y={8}
                                                    stroke="#ef4444"
                                                    strokeDasharray="4 2"
                                                    strokeWidth={1.5}
                                                    label={{ value: 'Hedef 8s', fontSize: 9, fill: '#ef4444', position: 'right' }}
                                                />
                                                <Bar
                                                    dataKey="worked"
                                                    name="Calisma"
                                                    fill="#6366f1"
                                                    radius={[4, 4, 0, 0]}
                                                    maxBarSize={20}
                                                />
                                                <Bar
                                                    dataKey="ot"
                                                    name="Ek Mesai"
                                                    fill="#f59e0b"
                                                    radius={[4, 4, 0, 0]}
                                                    maxBarSize={20}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 5: OT Breakdown ───────────── */}
                            {otb && (
                                <div>
                                    <SectionHeader icon={TrendingUp} title="Ek Mesai Dagilimi" iconColor="text-violet-500" />
                                    <div className="space-y-3">
                                        {/* 3 horizontal progress bars */}
                                        <ProgressBar
                                            label={`Planlı (Intended)`}
                                            value={otb.intended_pct}
                                            color="bg-indigo-500"
                                        />
                                        <ProgressBar
                                            label={`Algılanan (Potential)`}
                                            value={otb.potential_pct}
                                            color="bg-amber-500"
                                        />
                                        <ProgressBar
                                            label={`Manuel`}
                                            value={otb.manual_pct}
                                            color="bg-violet-500"
                                        />

                                        {/* Summary row */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span className="text-[11px] text-slate-500">
                                                Toplam: <span className="font-bold text-slate-700">{otb.total_hours}s</span>
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                Haftalık Limit: <span className={`font-bold ${otb.weekly_limit_pct >= 80 ? 'text-red-600' : 'text-slate-700'}`}>
                                                    %{otb.weekly_limit_pct}
                                                </span> ({otb.weekly_limit_hours}s)
                                            </span>
                                        </div>

                                        {/* Weekly limit bar */}
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    otb.weekly_limit_pct >= 90 ? 'bg-red-500'
                                                    : otb.weekly_limit_pct >= 70 ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(100, otb.weekly_limit_pct)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 6: Break & Meal ───────────── */}
                            {bm && (
                                <div>
                                    <SectionHeader icon={Coffee} title="Mola & Yemek" iconColor="text-orange-500" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatPair
                                            label="Ort. Mola (dk)"
                                            empValue={`${bm.avg_break_min} dk`}
                                            teamValue={`${bm.team_avg_break_min} dk`}
                                        />
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[10px] text-slate-400 font-semibold mb-2">Yemek Oranı</p>
                                            <div className="flex items-center gap-2">
                                                <UtensilsCrossed size={14} className="text-emerald-500" />
                                                <span className="text-sm font-bold text-slate-700">%{bm.meal_rate_pct}</span>
                                            </div>
                                        </div>
                                        <StatPair
                                            label="Ort. Giris"
                                            empValue={bm.avg_check_in}
                                            teamValue={bm.team_avg_check_in}
                                        />
                                        <StatPair
                                            label="Ort. Cikis"
                                            empValue={bm.avg_check_out}
                                            teamValue={bm.team_avg_check_out}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 7: Active Requests ────────── */}
                            {requests.length > 0 && (
                                <div>
                                    <SectionHeader icon={FileText} title={`Aktif Talepler (${requests.length})`} iconColor="text-amber-500" />
                                    <div className="space-y-2">
                                        {requests.map((req, i) => {
                                            const IconComp = ICON_MAP[req.icon] || FileText;
                                            const statusCfg = STATUS_COLORS[req.status] || STATUS_COLORS.PENDING;
                                            return (
                                                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                            <IconComp size={13} className="text-slate-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-slate-700 truncate">{req.type}</p>
                                                            <p className="text-[10px] text-slate-400">{req.date}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 8: Target Trend (3 months) ── */}
                            {trend.length > 0 && (
                                <div>
                                    <SectionHeader icon={Target} title="Hedef Trendi (3 Ay)" iconColor="text-emerald-500" />
                                    <div className="space-y-3">
                                        {trend.map((t, i) => (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-600">{t.label}</span>
                                                    <span className={`text-xs font-bold ${
                                                        t.efficiency_pct >= 95 ? 'text-emerald-600'
                                                        : t.efficiency_pct >= 80 ? 'text-amber-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                        %{t.efficiency_pct}
                                                    </span>
                                                </div>
                                                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${
                                                            t.efficiency_pct >= 95 ? 'bg-emerald-500'
                                                            : t.efficiency_pct >= 80 ? 'bg-amber-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, t.efficiency_pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ─── Section 9: Radar Chart (vs team) ──── */}
                            {radarData.length > 0 && (
                                <div>
                                    <SectionHeader icon={Activity} title="Ekip Karsilastirmasi" iconColor="text-purple-500" />
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <ResponsiveContainer width="100%" height={260}>
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
                                                <Radar
                                                    name="Calisan"
                                                    dataKey="employee"
                                                    stroke="#6366f1"
                                                    fill="#6366f1"
                                                    fillOpacity={0.25}
                                                    strokeWidth={2}
                                                />
                                                <Radar
                                                    name="Ekip Ort."
                                                    dataKey="team"
                                                    stroke="#94a3b8"
                                                    fill="#94a3b8"
                                                    fillOpacity={0.1}
                                                    strokeWidth={2}
                                                    strokeDasharray="4 3"
                                                />
                                                <Legend
                                                    wrapperStyle={{ fontSize: '11px' }}
                                                    iconSize={10}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Empty state if no data sections rendered */}
                            {!kpi && !loading && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <User size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm">Bu donem icin veri bulunamadı.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
}
