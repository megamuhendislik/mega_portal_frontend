import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area, LineChart, Line
} from 'recharts';
import api from '../../services/api';
import {
    TrendingUp, TrendingDown, Award, Clock, AlertTriangle, Users,
    Target, Zap, Minus,
    Palmtree, BarChart3, Activity
} from 'lucide-react';
import { formatMinutes } from './AttendanceComponents';

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {formatter ? formatter(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   SECTION WRAPPER
   ═══════════════════════════════════════════════════ */
const AnalyticsCard = ({ title, subtitle, icon: Icon, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden ${className}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            {Icon && (
                <div className="p-2 bg-slate-50 rounded-xl">
                    <Icon size={16} className="text-slate-500" />
                </div>
            )}
            <div>
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* ═══════════════════════════════════════════════════
   MINI KPI CARD
   ═══════════════════════════════════════════════════ */
const KpiCard = ({ label, value, subValue, icon: Icon, color, trend }) => {
    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', iconBg: 'bg-indigo-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', iconBg: 'bg-amber-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', iconBg: 'bg-red-100' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', iconBg: 'bg-violet-100' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconBg: 'bg-slate-100' },
    };
    const c = colorMap[color] || colorMap.slate;

    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-4 transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 ${c.iconBg} rounded-lg`}>
                    <Icon size={14} className={c.text} />
                </div>
                {trend !== undefined && trend !== null && (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {trend > 0 ? <TrendingUp size={10} /> : trend < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                        {trend !== 0 ? `${Math.abs(trend)}%` : '—'}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold ${c.text} tabular-nums mt-0.5`}>{value}</p>
            {subValue && <p className="text-[10px] text-slate-400 mt-0.5">{subValue}</p>}
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════ */
const TeamAnalyticsDashboard = ({ stats = [], year, month, departmentId }) => {
    const [expandedSection, setExpandedSection] = useState(null);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [trendLoading, setTrendLoading] = useState(false);

    // Fetch daily trend data from dedicated team_analytics endpoint
    useEffect(() => {
        if (!stats || stats.length === 0) return;
        const fetchTrend = async () => {
            setTrendLoading(true);
            try {
                const params = {};
                if (year) params.year = year;
                if (month) params.month = month;
                if (departmentId) params.department_id = departmentId;
                const res = await api.get('/dashboard/team_analytics/', { params });
                setDailyTrend(res.data?.daily_trend || []);
            } catch (err) {
                console.error('Daily trend fetch error:', err);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchTrend();
    }, [year, month, departmentId, stats.length]);

    // ── COMPUTED ANALYTICS DATA ──
    const analytics = useMemo(() => {
        if (!stats || stats.length === 0) return null;

        const count = stats.length;
        const totalWorked = stats.reduce((a, c) => a + (c.total_worked || 0), 0);
        const totalOT = stats.reduce((a, c) => a + (c.total_overtime || 0), 0);
        const totalMissing = stats.reduce((a, c) => a + (c.total_missing || 0), 0);
        const totalRequired = stats.reduce((a, c) => a + (c.monthly_required || 0), 0);
        const totalLate = stats.reduce((a, c) => a + (c.total_late || 0), 0);
        const onlineCount = stats.filter(s => s.is_online).length;

        const avgWorked = Math.round(totalWorked / count);
        const avgOT = Math.round(totalOT / count);
        const avgMissing = Math.round(totalMissing / count);
        const avgRequired = Math.round(totalRequired / count);

        // Efficiency: percentage of target that was completed (worked / required)
        const efficiency = totalRequired > 0 ? Math.round((totalWorked / totalRequired) * 100) : 0;

        // Performance ranking by net balance
        const ranked = [...stats]
            .map(s => ({
                ...s,
                efficiency: (s.monthly_required || 0) > 0
                    ? Math.round(((s.total_worked || 0) / s.monthly_required) * 100)
                    : 0,
            }))
            .sort((a, b) => (b.monthly_net_balance || 0) - (a.monthly_net_balance || 0));

        // Best / Worst performers
        const bestPerformer = ranked[0];
        const worstPerformer = ranked[ranked.length - 1];

        // Most OT
        const mostOT = [...stats].sort((a, b) => (b.total_overtime || 0) - (a.total_overtime || 0))[0];

        // Department breakdown
        const deptMap = {};
        stats.forEach(s => {
            const dept = s.department || 'Bilinmiyor';
            if (!deptMap[dept]) deptMap[dept] = { name: dept, count: 0, worked: 0, ot: 0, missing: 0, required: 0 };
            deptMap[dept].count++;
            deptMap[dept].worked += (s.total_worked || 0);
            deptMap[dept].ot += (s.total_overtime || 0);
            deptMap[dept].missing += (s.total_missing || 0);
            deptMap[dept].required += (s.monthly_required || 0);
        });
        const departments = Object.values(deptMap).sort((a, b) => b.count - a.count);

        // Performance chart data — top 15 by name
        const performanceData = [...stats]
            .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'))
            .slice(0, 20)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                fullName: s.employee_name,
                worked: s.total_worked || 0,
                overtime: s.total_overtime || 0,
                missing: s.total_missing || 0,
                target: s.monthly_required || 0,
                balance: s.monthly_net_balance || 0,
            }));

        // OT vs Missing comparison
        const comparisonData = [...stats]
            .filter(s => (s.total_overtime || 0) > 0 || (s.total_missing || 0) > 0)
            .sort((a, b) => (b.total_overtime || 0) - (a.total_overtime || 0))
            .slice(0, 15)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                'Fazla Mesai': s.total_overtime || 0,
                'Eksik Zaman': -(s.total_missing || 0),
            }));

        // Work distribution pie
        const workDistribution = [
            { name: 'Normal Mesai', value: Math.max(0, totalWorked - totalOT), color: '#6366f1' },
            { name: 'Fazla Mesai', value: totalOT, color: '#f59e0b' },
            { name: 'Kayıp Zaman', value: totalMissing, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Status distribution pie
        const statusDist = [
            { name: 'Ofiste', value: onlineCount, color: '#10b981' },
            { name: 'Dışarıda', value: count - onlineCount, color: '#94a3b8' },
        ].filter(d => d.value > 0);

        // Balance distribution: how many +, -, 0
        const positiveBalance = stats.filter(s => (s.monthly_net_balance || 0) > 0).length;
        const negativeBalance = stats.filter(s => (s.monthly_net_balance || 0) < 0).length;
        const zeroBalance = count - positiveBalance - negativeBalance;

        const balanceDist = [
            { name: 'Pozitif Bakiye', value: positiveBalance, color: '#10b981' },
            { name: 'Sıfır Bakiye', value: zeroBalance, color: '#94a3b8' },
            { name: 'Negatif Bakiye', value: negativeBalance, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Leave overview
        const leaveData = stats
            .filter(s => s.annual_leave_entitlement > 0 || s.annual_leave_used > 0)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                fullName: s.employee_name,
                entitlement: s.annual_leave_entitlement || 0,
                used: s.annual_leave_used || 0,
                remaining: s.annual_leave_balance || 0,
                reserved: s.annual_leave_reserved || 0,
            }))
            .sort((a, b) => a.remaining - b.remaining);

        return {
            count, totalWorked, totalOT, totalMissing, totalRequired, totalLate,
            onlineCount, avgWorked, avgOT, avgMissing, avgRequired, efficiency,
            ranked, bestPerformer, worstPerformer, mostOT,
            departments, performanceData, comparisonData,
            workDistribution, statusDist, balanceDist,
            positiveBalance, negativeBalance, zeroBalance,
            leaveData
        };
    }, [stats]);

    if (!analytics || stats.length === 0) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="text-center">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Analiz verileri yüklenemedi</p>
                    <p className="text-xs mt-1">Ekip üyelerinizin mesai verileri bulunamadı.</p>
                </div>
            </div>
        );
    }

    const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

    return (
        <div className="space-y-5 animate-in fade-in">

            {/* ═══════ SECTION 1: Advanced KPI Cards ═══════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard
                    label="Ekip Verimi"
                    value={`%${analytics.efficiency}`}
                    subValue={`Hedef: ${formatMinutes(analytics.avgRequired)}/kişi`}
                    icon={Target}
                    color={analytics.efficiency >= 95 ? 'emerald' : analytics.efficiency >= 80 ? 'amber' : 'red'}
                />
                <KpiCard
                    label="Ort. Çalışma"
                    value={formatMinutes(analytics.avgWorked)}
                    subValue={`${analytics.count} kişi toplam`}
                    icon={Clock}
                    color="indigo"
                />
                <KpiCard
                    label="Ort. Fazla Mesai"
                    value={formatMinutes(analytics.avgOT)}
                    subValue={`Toplam: ${formatMinutes(analytics.totalOT)}`}
                    icon={Zap}
                    color="amber"
                />
                <KpiCard
                    label="Ort. Kayıp"
                    value={formatMinutes(analytics.avgMissing)}
                    subValue={`Toplam: ${formatMinutes(analytics.totalMissing)}`}
                    icon={AlertTriangle}
                    color={analytics.avgMissing > 60 ? 'red' : 'slate'}
                />
                <KpiCard
                    label="Geç Kalan"
                    value={`${formatMinutes(analytics.totalLate)}`}
                    subValue={`Ekip toplamı`}
                    icon={TrendingDown}
                    color={analytics.totalLate > 0 ? 'red' : 'slate'}
                />
                <KpiCard
                    label="Pozitif Bakiye"
                    value={`${analytics.positiveBalance}/${analytics.count}`}
                    subValue={`%${Math.round((analytics.positiveBalance / analytics.count) * 100)} oranı`}
                    icon={TrendingUp}
                    color="emerald"
                />
            </div>

            {/* ═══════ SECTION 1.5: Daily Trend Chart ═══════ */}
            {dailyTrend.length > 0 && (
                <AnalyticsCard
                    title="Günlük Trend"
                    subtitle="Gün bazlı ortalama çalışma ve fazla mesai (dakika)"
                    icon={Activity}
                >
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={dailyTrend}
                                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="gradWorked" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradOT" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Math.round(v / 60)}s`}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="avg_worked"
                                    name="Ort. Çalışma"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#gradWorked)"
                                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="avg_overtime"
                                    name="Ort. Fazla Mesai"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fill="url(#gradOT)"
                                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Absent count mini row */}
                    {dailyTrend.some(d => d.absent > 0) && (
                        <div className="flex items-center gap-2 mt-2 px-1">
                            <span className="text-[10px] font-semibold text-slate-400">Devamsızlık:</span>
                            <div className="flex gap-1 flex-wrap">
                                {dailyTrend.filter(d => d.absent > 0).map(d => (
                                    <span key={d.day} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-bold tabular-nums">
                                        {d.day}. gün: {d.absent}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 2: Performance Comparison + Distribution ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Performance Comparison Bar Chart */}
                <AnalyticsCard
                    title="Kişi Bazlı Performans"
                    subtitle={`Aylık çalışma süreleri (${analytics.performanceData.length} kişi)`}
                    icon={BarChart3}
                    className="lg:col-span-2"
                >
                    <div className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.performanceData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Math.round(v / 60)}s`}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="worked" name="Çalışma" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="overtime" name="Fazla Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="missing" name="Kayıp" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>

                {/* Work Distribution Pie */}
                <div className="space-y-5">
                    <AnalyticsCard
                        title="Zaman Dağılımı"
                        subtitle="Ekip toplamı"
                        icon={Activity}
                    >
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.workDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={38}
                                        outerRadius={60}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {analytics.workDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v) => formatMinutes(v)}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                            {analytics.workDistribution.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    {d.name}: {formatMinutes(d.value)}
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    <AnalyticsCard
                        title="Bakiye Dağılımı"
                        subtitle="Pozitif / Negatif oranı"
                        icon={TrendingUp}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-5 rounded-full overflow-hidden bg-slate-100 flex">
                                {analytics.balanceDist.map((d, i) => (
                                    <div
                                        key={i}
                                        className="h-full transition-all duration-700"
                                        style={{
                                            width: `${(d.value / analytics.count) * 100}%`,
                                            backgroundColor: d.color,
                                        }}
                                        title={`${d.name}: ${d.value} kişi`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between mt-2">
                            {analytics.balanceDist.map((d, i) => (
                                <span key={i} className="text-[10px] font-bold" style={{ color: d.color }}>
                                    {d.name}: {d.value}
                                </span>
                            ))}
                        </div>
                    </AnalyticsCard>
                </div>
            </div>

            {/* ═══════ SECTION 3: OT vs Missing Comparison ═══════ */}
            {analytics.comparisonData.length > 0 && (
                <AnalyticsCard
                    title="Fazla Mesai / Kayıp Karşılaştırması"
                    subtitle="Pozitif: Fazla mesai, Negatif: Kayıp zaman"
                    icon={Zap}
                >
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.comparisonData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                barCategoryGap="15%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v / 60)}s`}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(Math.abs(v))} />} />
                                <Bar dataKey="Fazla Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Eksik Zaman" fill="#ef4444" radius={[0, 0, 4, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 4: Performance Ranking Table ═══════ */}
            <AnalyticsCard
                title="Performans Sıralaması"
                subtitle="Net bakiyeye göre sıralı ekip üyeleri"
                icon={Award}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="py-2.5 pr-3 w-10">#</th>
                                <th className="py-2.5 pr-3">Personel</th>
                                <th className="py-2.5 px-3 text-center">Çalışma</th>
                                <th className="py-2.5 px-3 text-center">Hedef</th>
                                <th className="py-2.5 px-3 text-center">Verimlilik</th>
                                <th className="py-2.5 px-3 text-center">F. Mesai</th>
                                <th className="py-2.5 px-3 text-center">Kayıp</th>
                                <th className="py-2.5 px-3 text-right min-w-[140px]">Net Bakiye</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {analytics.ranked.map((emp, i) => {
                                const balance = emp.monthly_net_balance || 0;
                                const maxBalance = Math.max(
                                    ...analytics.ranked.map(r => Math.abs(r.monthly_net_balance || 0)),
                                    1
                                );
                                const barWidth = Math.min(100, (Math.abs(balance) / maxBalance) * 100);
                                const isPositive = balance >= 0;

                                return (
                                    <tr key={emp.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 pr-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-50 text-orange-600' : 'text-slate-400'}`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600 border border-slate-200 shrink-0">
                                                    {(emp.employee_name || '?').charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-semibold text-slate-800 block truncate">{emp.employee_name}</span>
                                                    <span className="text-[10px] text-slate-400 truncate block">{emp.department}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatMinutes(emp.total_worked || 0)}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="text-xs text-slate-400 tabular-nums">{formatMinutes(emp.monthly_required || 0)}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`text-xs font-bold tabular-nums ${emp.efficiency >= 95 ? 'text-emerald-600' : emp.efficiency >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                                                %{emp.efficiency}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {(emp.total_overtime || 0) > 0 ? (
                                                <span className="text-xs font-bold text-amber-600 tabular-nums">+{formatMinutes(emp.total_overtime)}</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {(emp.total_missing || 0) > 0 ? (
                                                <span className="text-xs font-bold text-red-500 tabular-nums">{formatMinutes(emp.total_missing)}</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                    {isPositive ? (
                                                        <div
                                                            className="h-full bg-emerald-400 rounded-full transition-all duration-500 ml-auto"
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="h-full bg-red-400 rounded-full transition-all duration-500"
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold tabular-nums min-w-[60px] text-right ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isPositive ? '+' : ''}{formatMinutes(balance)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>

            {/* ═══════ SECTION 5: Department Breakdown ═══════ */}
            {analytics.departments.length > 1 && (
                <AnalyticsCard
                    title="Departman Karşılaştırması"
                    subtitle="Departman bazlı performans metrikleri"
                    icon={Users}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {analytics.departments.map((dept, i) => {
                            const deptEfficiency = dept.required > 0 ? Math.round((dept.worked / dept.required) * 100) : 0;
                            const avgDeptWorked = Math.round(dept.worked / dept.count);
                            const avgDeptOT = Math.round(dept.ot / dept.count);

                            return (
                                <div key={dept.name} className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="text-sm font-bold text-slate-700">{dept.name}</span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 font-bold tabular-nums">
                                            {dept.count} kişi
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Verim</p>
                                            <p className={`text-sm font-bold tabular-nums ${deptEfficiency >= 95 ? 'text-emerald-600' : deptEfficiency >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                                                %{deptEfficiency}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Ort. Mesai</p>
                                            <p className="text-sm font-bold text-indigo-600 tabular-nums">{formatMinutes(avgDeptWorked)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Ort. F.M.</p>
                                            <p className="text-sm font-bold text-amber-600 tabular-nums">{formatMinutes(avgDeptOT)}</p>
                                        </div>
                                    </div>
                                    {/* Mini efficiency bar */}
                                    <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${deptEfficiency >= 95 ? 'bg-emerald-500' : deptEfficiency >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, deptEfficiency)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 6: Leave Balance Overview ═══════ */}
            {analytics.leaveData.length > 0 && (
                <AnalyticsCard
                    title="Yıllık İzin Durumu"
                    subtitle="Ekip üyelerinin izin bakiyeleri"
                    icon={Palmtree}
                >
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.leaveData}
                                layout="vertical"
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit=" gün"
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={90}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    formatter={(v) => `${v} gün`}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="used" name="Kullanılan" fill="#6366f1" stackId="a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reserved" name="Rezerve" fill="#a78bfa" stackId="a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="remaining" name="Kalan" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 7: Top Performers Spotlight ═══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Best Performer */}
                {analytics.bestPerformer && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Award size={14} className="text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">En Yüksek Bakiye</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-sm font-bold text-emerald-700">
                                {(analytics.bestPerformer.employee_name || '?').charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{analytics.bestPerformer.employee_name}</p>
                                <p className="text-[10px] text-slate-500">{analytics.bestPerformer.department}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Net Bakiye</p>
                                <p className="text-sm font-bold text-emerald-600 tabular-nums">+{formatMinutes(analytics.bestPerformer.monthly_net_balance || 0)}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Verimlilik</p>
                                <p className="text-sm font-bold text-emerald-600 tabular-nums">%{analytics.bestPerformer.efficiency}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Most OT */}
                {analytics.mostOT && (analytics.mostOT.total_overtime || 0) > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <Zap size={14} className="text-amber-600" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">En Çok Fazla Mesai</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-sm font-bold text-amber-700">
                                {(analytics.mostOT.employee_name || '?').charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{analytics.mostOT.employee_name}</p>
                                <p className="text-[10px] text-slate-500">{analytics.mostOT.department}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Fazla Mesai</p>
                                <p className="text-sm font-bold text-amber-600 tabular-nums">+{formatMinutes(analytics.mostOT.total_overtime)}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Çalışma</p>
                                <p className="text-sm font-bold text-amber-600 tabular-nums">{formatMinutes(analytics.mostOT.total_worked || 0)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Worst Performer */}
                {analytics.worstPerformer && (analytics.worstPerformer.monthly_net_balance || 0) < 0 && (
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/60 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-red-100 rounded-lg">
                                <AlertTriangle size={14} className="text-red-500" />
                            </div>
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">En Düşük Bakiye</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center text-sm font-bold text-red-700">
                                {(analytics.worstPerformer.employee_name || '?').charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{analytics.worstPerformer.employee_name}</p>
                                <p className="text-[10px] text-slate-500">{analytics.worstPerformer.department}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Net Bakiye</p>
                                <p className="text-sm font-bold text-red-600 tabular-nums">{formatMinutes(analytics.worstPerformer.monthly_net_balance || 0)}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Kayıp</p>
                                <p className="text-sm font-bold text-red-600 tabular-nums">{formatMinutes(analytics.worstPerformer.total_missing || 0)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════ SECTION 8: Individual Performance Cards ═══════ */}
            <AnalyticsCard
                title="Bireysel Performans Kartları"
                subtitle="Her ekip üyesinin detaylı performans özeti"
                icon={Users}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {analytics.ranked.map((emp, i) => {
                        const balance = emp.monthly_net_balance || 0;
                        const isPositive = balance >= 0;

                        return (
                            <div key={emp.employee_id} className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group">
                                {/* Header */}
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {(emp.employee_name || '?').charAt(0)}
                                        </div>
                                        {emp.is_online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">{emp.employee_name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{emp.department} {emp.job_title && emp.job_title !== '-' ? `· ${emp.job_title}` : ''}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                        #{i + 1}
                                    </span>
                                </div>

                                {/* Efficiency Progress Bar */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Verimlilik</span>
                                        <span className={`text-[10px] font-bold tabular-nums ${emp.efficiency >= 95 ? 'text-emerald-600' : emp.efficiency >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                                            %{emp.efficiency}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${emp.efficiency >= 95 ? 'bg-emerald-500' : emp.efficiency >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, emp.efficiency)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase">Çalışma</p>
                                        <p className="text-[10px] font-bold text-indigo-600 tabular-nums">{formatMinutes(emp.total_worked || 0)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase">F. Mesai</p>
                                        <p className="text-[10px] font-bold text-amber-600 tabular-nums">{(emp.total_overtime || 0) > 0 ? `+${formatMinutes(emp.total_overtime)}` : '—'}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase">Bakiye</p>
                                        <p className={`text-[10px] font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isPositive ? '+' : ''}{formatMinutes(balance)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </AnalyticsCard>
        </div>
    );
};

export default TeamAnalyticsDashboard;
