import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ReferenceLine
} from 'recharts';
import api from '../../services/api';
import {
    TrendingUp, TrendingDown, Award, Clock, AlertTriangle, Users,
    Target, Zap, Minus, ChevronDown, ChevronUp, Shield,
    Palmtree, BarChart3, Activity, Calendar, Eye, Star,
    UserCheck, ArrowRight, Flame, AlertCircle, Info
} from 'lucide-react';
import { formatMinutes } from './AttendanceComponents';

const DEPT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

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
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', iconBg: 'bg-cyan-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconBg: 'bg-blue-100' },
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
                        {trend !== 0 ? `${Math.abs(trend)}%` : '\u2014'}
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
    const [dailyTrend, setDailyTrend] = useState([]);
    const [trendLoading, setTrendLoading] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [expandedRisk, setExpandedRisk] = useState(null);

    // ── DEPARTMENT TAB SYSTEM ──
    const deptList = useMemo(() => {
        const depts = [...new Set(stats.filter(s => s.department && s.department !== '-').map(s => s.department))];
        return depts.sort((a, b) => a.localeCompare(b, 'tr'));
    }, [stats]);

    const [activeTab, setActiveTab] = useState('all');

    const scopedStats = useMemo(() => {
        if (activeTab === 'all') return stats;
        return stats.filter(s => s.department === activeTab);
    }, [stats, activeTab]);

    // ── FETCH DAILY TREND ──
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
        if (!scopedStats || scopedStats.length === 0) return null;
        const count = scopedStats.length;

        // Totals
        const totalWorked = scopedStats.reduce((a, c) => a + (c.total_worked || 0), 0);
        const totalOT = scopedStats.reduce((a, c) => a + (c.total_overtime || 0), 0);
        const totalMissing = scopedStats.reduce((a, c) => a + (c.total_missing || 0), 0);
        const totalRequired = scopedStats.reduce((a, c) => a + (c.monthly_required || 0), 0);
        const onlineCount = scopedStats.filter(s => s.is_online).length;

        // Averages
        const avgWorked = Math.round(totalWorked / count);
        const avgOT = Math.round(totalOT / count);
        const avgMissing = Math.round(totalMissing / count);
        const avgRequired = Math.round(totalRequired / count);
        const efficiency = totalRequired > 0 ? Math.round((totalWorked / totalRequired) * 100) : 0;

        // Work days calculation
        const today = new Date();
        const dayOfMonth = today.getDate();
        const elapsedWorkDays = Math.max(1, Math.round(dayOfMonth * 5 / 7));
        const totalWorkDaysInMonth = 22;
        const remainingWorkDays = Math.max(0, totalWorkDaysInMonth - elapsedWorkDays);

        // Daily average missing per person
        const dailyAvgMissing = Math.round(totalMissing / count / elapsedWorkDays);

        // Projected end-of-month balance
        const avgDeviation = Math.round(scopedStats.reduce((a, c) => a + (c.monthly_deviation || 0), 0) / count);
        const dailyAvgDeviation = elapsedWorkDays > 0 ? avgDeviation / elapsedWorkDays : 0;
        const projectedBalance = Math.round(avgDeviation + dailyAvgDeviation * remainingWorkDays);

        // Balance distribution
        const positiveBalance = scopedStats.filter(s => (s.monthly_net_balance || 0) > 0).length;
        const negativeBalance = scopedStats.filter(s => (s.monthly_net_balance || 0) < 0).length;
        const zeroBalance = count - positiveBalance - negativeBalance;

        // Department breakdown (for "Tum Ekibim" tab)
        const deptMap = {};
        scopedStats.forEach(s => {
            const dept = s.department || 'Bilinmiyor';
            if (!deptMap[dept]) deptMap[dept] = { name: dept, count: 0, worked: 0, ot: 0, missing: 0, required: 0, online: 0, deviation: 0, positiveBalance: 0 };
            deptMap[dept].count++;
            deptMap[dept].worked += (s.total_worked || 0);
            deptMap[dept].ot += (s.total_overtime || 0);
            deptMap[dept].missing += (s.total_missing || 0);
            deptMap[dept].required += (s.monthly_required || 0);
            deptMap[dept].deviation += (s.monthly_deviation || 0);
            if (s.is_online) deptMap[dept].online++;
            if ((s.monthly_net_balance || 0) > 0) deptMap[dept].positiveBalance++;
        });
        const departments = Object.values(deptMap).sort((a, b) => b.count - a.count);

        // Per-person computed fields
        const ranked = [...scopedStats].map(s => ({
            ...s,
            efficiency: (s.monthly_required || 0) > 0 ? Math.round(((s.total_worked || 0) / s.monthly_required) * 100) : 0,
            dailyMissing: Math.round((s.total_missing || 0) / elapsedWorkDays),
            projected: elapsedWorkDays > 0 ? Math.round((s.monthly_deviation || 0) + ((s.monthly_deviation || 0) / elapsedWorkDays) * remainingWorkDays) : 0,
        })).sort((a, b) => (b.monthly_net_balance || 0) - (a.monthly_net_balance || 0));

        // Performance chart data (top 20)
        const performanceData = [...scopedStats]
            .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'))
            .slice(0, 20)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                fullName: s.employee_name,
                worked: s.total_worked || 0,
                overtime: s.total_overtime || 0,
                missing: s.total_missing || 0,
                target: s.monthly_required || 0,
            }));

        // OT vs Missing comparison
        const comparisonData = [...scopedStats]
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
            { name: 'Kayip Zaman', value: totalMissing, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const balanceDist = [
            { name: 'Pozitif', value: positiveBalance, color: '#10b981' },
            { name: 'Sifir', value: zeroBalance, color: '#94a3b8' },
            { name: 'Negatif', value: negativeBalance, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Spotlight
        const bestPerformer = ranked[0];
        const worstPerformer = ranked[ranked.length - 1];
        const mostOT = [...scopedStats].sort((a, b) => (b.total_overtime || 0) - (a.total_overtime || 0))[0];
        const mostEfficient = [...ranked].sort((a, b) => b.efficiency - a.efficiency)[0];

        // Leave data
        const leaveData = scopedStats
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

        // Risk detection
        const highOTRisk = scopedStats.filter(s => (s.total_overtime || 0) > 900); // > 15 saat
        const highMissingRisk = scopedStats.filter(s => (s.monthly_required || 0) > 0 && (s.total_missing || 0) > (s.monthly_required * 0.2));
        const criticalBalanceRisk = scopedStats.filter(s => (s.monthly_net_balance || 0) < -600); // < -10 saat

        // Radar data for departments (only for "Tum Ekibim")
        const radarData = departments.length > 1 ? (() => {
            const axes = ['Verimlilik', 'OT Yogunlugu', 'Eksik Dusukl.', 'Cevrimici', 'Pozitif Bakiye'];
            return axes.map(axis => {
                const row = { axis };
                departments.slice(0, 6).forEach(dept => {
                    const dEff = dept.required > 0 ? (dept.worked / dept.required) * 100 : 0;
                    const dOT = dept.required > 0 ? (dept.ot / dept.required) * 100 : 0;
                    const dMiss = dept.required > 0 ? 100 - (dept.missing / dept.required) * 100 : 100;
                    const dOnline = dept.count > 0 ? (dept.online / dept.count) * 100 : 0;
                    const dPosBal = dept.count > 0 ? (dept.positiveBalance / dept.count) * 100 : 0;

                    let val = 0;
                    if (axis === 'Verimlilik') val = Math.min(100, dEff);
                    else if (axis === 'OT Yogunlugu') val = Math.min(100, dOT * 5);
                    else if (axis === 'Eksik Dusukl.') val = Math.max(0, dMiss);
                    else if (axis === 'Cevrimici') val = dOnline;
                    else if (axis === 'Pozitif Bakiye') val = dPosBal;

                    row[dept.name] = Math.round(val);
                });
                return row;
            });
        })() : [];

        return {
            count, totalWorked, totalOT, totalMissing, totalRequired, onlineCount,
            avgWorked, avgOT, avgMissing, avgRequired, efficiency,
            dailyAvgMissing, projectedBalance, avgDeviation, elapsedWorkDays, remainingWorkDays,
            positiveBalance, negativeBalance, zeroBalance,
            departments, ranked, performanceData, comparisonData,
            workDistribution, balanceDist,
            bestPerformer, worstPerformer, mostOT, mostEfficient,
            leaveData,
            highOTRisk, highMissingRisk, criticalBalanceRisk,
            radarData,
        };
    }, [scopedStats]);

    // ── HEATMAP COMPUTATION ──
    const heatmapData = useMemo(() => {
        if (!dailyTrend || dailyTrend.length === 0) return [];
        const weeks = {};
        dailyTrend.forEach(d => {
            const date = new Date(d.date || `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
            if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends
            const weekNum = Math.ceil(d.day / 7);
            if (!weeks[weekNum]) weeks[weekNum] = {};
            weeks[weekNum][dayOfWeek] = { worked: d.avg_worked, absent: d.absent, day: d.day };
        });
        return Object.entries(weeks).map(([week, days]) => ({ week: parseInt(week), days }));
    }, [dailyTrend, year, month]);

    // ── SORT HANDLER FOR BENCHMARKING TABLE ──
    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('desc');
        }
    };

    // ── SORTED DEPARTMENTS ──
    const sortedDepartments = useMemo(() => {
        if (!analytics?.departments) return [];
        const depts = [...analytics.departments].map(dept => {
            const dEff = dept.required > 0 ? Math.round((dept.worked / dept.required) * 100) : 0;
            const avgWorkedDept = dept.count > 0 ? Math.round(dept.worked / dept.count) : 0;
            const avgOTDept = dept.count > 0 ? Math.round(dept.ot / dept.count) : 0;
            const avgMissingDept = dept.count > 0 ? Math.round(dept.missing / dept.count) : 0;
            const dailyMissingDept = dept.count > 0 && analytics.elapsedWorkDays > 0 ? Math.round(dept.missing / dept.count / analytics.elapsedWorkDays) : 0;
            const projectedDept = dept.count > 0 && analytics.elapsedWorkDays > 0
                ? Math.round((dept.deviation / dept.count) + ((dept.deviation / dept.count / analytics.elapsedWorkDays) * analytics.remainingWorkDays))
                : 0;
            const activeRate = dept.count > 0 ? Math.round((dept.online / dept.count) * 100) : 0;
            return { ...dept, efficiency: dEff, avgWorked: avgWorkedDept, avgOT: avgOTDept, avgMissing: avgMissingDept, dailyMissing: dailyMissingDept, projected: projectedDept, activeRate };
        });
        if (sortColumn) {
            depts.sort((a, b) => {
                const aVal = a[sortColumn] ?? 0;
                const bVal = b[sortColumn] ?? 0;
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }
        return depts;
    }, [analytics, sortColumn, sortDirection]);

    // ── EMPTY STATE ──
    if (!analytics || stats.length === 0) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="text-center">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Analiz verileri yuklenemedi</p>
                    <p className="text-xs mt-1">Ekip uyelerinizin mesai verileri bulunamadi.</p>
                </div>
            </div>
        );
    }

    const showDeptComparison = activeTab === 'all' && analytics.departments.length > 1;
    const dayNames = { 1: 'Pzt', 2: 'Sal', 3: 'Car', 4: 'Per', 5: 'Cum' };

    // Heatmap color helper
    const getHeatColor = (minutes) => {
        if (!minutes || minutes <= 0) return 'bg-slate-100 text-slate-400';
        if (minutes >= 480) return 'bg-emerald-500 text-white';
        if (minutes >= 420) return 'bg-emerald-300 text-emerald-900';
        if (minutes >= 360) return 'bg-amber-300 text-amber-900';
        if (minutes >= 240) return 'bg-amber-200 text-amber-800';
        return 'bg-red-200 text-red-800';
    };

    // Efficiency badge helper
    const getEfficiencyBadge = (eff) => {
        if (eff >= 100) return { label: 'Mukemmel', cls: 'bg-emerald-100 text-emerald-700' };
        if (eff >= 95) return { label: 'Iyi', cls: 'bg-blue-100 text-blue-700' };
        if (eff >= 85) return { label: 'Normal', cls: 'bg-amber-100 text-amber-700' };
        return { label: 'Dusuk', cls: 'bg-red-100 text-red-700' };
    };

    return (
        <div className="space-y-5 animate-in fade-in">

            {/* ═══════ DEPARTMENT TAB BAR ═══════ */}
            {deptList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'all'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Users size={12} className="inline mr-1.5 -mt-0.5" />
                        Tum Ekibim
                    </button>
                    {deptList.map((dept, i) => (
                        <button
                            key={dept}
                            onClick={() => setActiveTab(dept)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                activeTab === dept
                                    ? 'text-white shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            style={activeTab === dept ? { backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length], boxShadow: `0 4px 12px ${DEPT_COLORS[i % DEPT_COLORS.length]}40` } : {}}
                        >
                            {dept}
                            <span className="ml-1.5 opacity-70">
                                ({stats.filter(s => s.department === dept).length})
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ═══════ SECTION 1: KPI Cards (8 cards) ═══════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
                <KpiCard
                    label="Ekip Verimi"
                    value={`%${analytics.efficiency}`}
                    subValue={`Hedef: ${formatMinutes(analytics.avgRequired)}/kisi`}
                    icon={Target}
                    color={analytics.efficiency >= 95 ? 'emerald' : analytics.efficiency >= 80 ? 'amber' : 'red'}
                />
                <KpiCard
                    label="Ort. Calisma"
                    value={formatMinutes(analytics.avgWorked)}
                    subValue={`${analytics.count} kisi toplam`}
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
                    label="Ort. Kayip"
                    value={formatMinutes(analytics.avgMissing)}
                    subValue={`Toplam: ${formatMinutes(analytics.totalMissing)}`}
                    icon={AlertTriangle}
                    color={analytics.avgMissing > 60 ? 'red' : 'slate'}
                />
                <KpiCard
                    label="Gunluk Ort. Eksik"
                    value={formatMinutes(analytics.dailyAvgMissing)}
                    subValue={`${analytics.elapsedWorkDays} is gunu icinde`}
                    icon={TrendingDown}
                    color={analytics.dailyAvgMissing > 30 ? 'red' : 'slate'}
                />
                <KpiCard
                    label="Tahmini Ay Sonu"
                    value={formatMinutes(Math.abs(analytics.projectedBalance))}
                    subValue={analytics.projectedBalance >= 0 ? 'Pozitif projeksiyon' : 'Negatif projeksiyon'}
                    icon={Calendar}
                    color={analytics.projectedBalance >= 0 ? 'emerald' : 'red'}
                />
                <KpiCard
                    label="Cevrimici"
                    value={`${analytics.onlineCount}/${analytics.count}`}
                    subValue={`%${analytics.count > 0 ? Math.round((analytics.onlineCount / analytics.count) * 100) : 0} orani`}
                    icon={Eye}
                    color="cyan"
                />
                <KpiCard
                    label="Pozitif Bakiye"
                    value={`${analytics.positiveBalance}/${analytics.count}`}
                    subValue={`%${Math.round((analytics.positiveBalance / analytics.count) * 100)} orani`}
                    icon={TrendingUp}
                    color="emerald"
                />
            </div>

            {/* ═══════ SECTION 2: Department Benchmarking Table (only "Tum Ekibim" + multiple depts) ═══════ */}
            {showDeptComparison && (
                <AnalyticsCard
                    title="Departman Kiyaslama Tablosu"
                    subtitle="Departmanlar arasi performans karsilastirmasi"
                    icon={BarChart3}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {[
                                        { key: 'name', label: 'Departman', align: 'left' },
                                        { key: 'count', label: 'Kisi' },
                                        { key: 'efficiency', label: 'Verim %' },
                                        { key: 'avgWorked', label: 'Ort. Calisma' },
                                        { key: 'avgOT', label: 'Ort. OT' },
                                        { key: 'avgMissing', label: 'Ort. Eksik' },
                                        { key: 'dailyMissing', label: 'Gunluk Ort. Eksik' },
                                        { key: 'projected', label: 'Tahmini Bakiye' },
                                        { key: 'activeRate', label: 'Aktif Oran' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className={`px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors ${col.align === 'left' ? 'text-left' : 'text-right'}`}
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                {sortColumn === col.key && (
                                                    sortDirection === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                                )}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDepartments.map((dept, i) => {
                                    const teamAvgEff = analytics.efficiency;
                                    const teamAvgWorked = analytics.avgWorked;
                                    const teamAvgOT = analytics.avgOT;
                                    const teamAvgMissing = analytics.avgMissing;
                                    const cellColor = (val, avg, invert = false) => {
                                        if (val === avg) return '';
                                        const isGood = invert ? val < avg : val > avg;
                                        return isGood ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-600 bg-red-50/50';
                                    };
                                    return (
                                        <tr
                                            key={dept.name}
                                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                            onClick={() => setActiveTab(dept.name)}
                                        >
                                            <td className="px-3 py-2.5 font-bold text-slate-700">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                                                    {dept.name}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">{dept.count}</td>
                                            <td className={`px-3 py-2.5 text-right font-bold rounded ${cellColor(dept.efficiency, teamAvgEff)}`}>
                                                %{dept.efficiency}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgWorked, teamAvgWorked)}`}>
                                                {formatMinutes(dept.avgWorked)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgOT, teamAvgOT)}`}>
                                                {formatMinutes(dept.avgOT)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgMissing, teamAvgMissing, true)}`}>
                                                {formatMinutes(dept.avgMissing)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">
                                                {formatMinutes(dept.dailyMissing)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-bold rounded ${dept.projected >= 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-600 bg-red-50/50'}`}>
                                                {dept.projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(dept.projected))}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">
                                                %{dept.activeRate}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Team average footer */}
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                                    <td className="px-3 py-2.5 font-bold text-slate-800">Ekip Ortalamasi</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{analytics.count}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-indigo-600">%{analytics.efficiency}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgWorked)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgOT)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgMissing)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.dailyAvgMissing)}</td>
                                    <td className={`px-3 py-2.5 text-right font-bold ${analytics.projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {analytics.projectedBalance >= 0 ? '+' : ''}{formatMinutes(Math.abs(analytics.projectedBalance))}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                        %{analytics.count > 0 ? Math.round((analytics.onlineCount / analytics.count) * 100) : 0}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 3: Department Radar Chart (only "Tum Ekibim" + multiple depts) ═══════ */}
            {showDeptComparison && analytics.radarData.length > 0 && (
                <AnalyticsCard
                    title="Departman Kiyaslama Radari"
                    subtitle="5 eksende departman performans karsilastirmasi"
                    icon={Activity}
                >
                    <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analytics.radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis
                                    dataKey="axis"
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                                    tickCount={5}
                                />
                                {analytics.departments.slice(0, 6).map((dept, i) => (
                                    <Radar
                                        key={dept.name}
                                        name={dept.name}
                                        dataKey={dept.name}
                                        stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fillOpacity={0.1}
                                        strokeWidth={2}
                                    />
                                ))}
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 4: Daily Trend + Projection ═══════ */}
            {dailyTrend.length > 0 && (
                <AnalyticsCard
                    title="Gunluk Trend ve Projeksiyon"
                    subtitle="Gun bazli ortalama calisma, fazla mesai ve hedef cizgisi (dakika)"
                    icon={Activity}
                >
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={dailyTrend}
                                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="gradWorkedV2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradOTV2" x1="0" y1="0" x2="0" y2="1">
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
                                {/* Daily target reference line */}
                                {analytics.avgRequired > 0 && analytics.elapsedWorkDays > 0 && (
                                    <ReferenceLine
                                        y={Math.round(analytics.avgRequired / analytics.elapsedWorkDays)}
                                        stroke="#10b981"
                                        strokeDasharray="8 4"
                                        strokeWidth={1.5}
                                        label={{
                                            value: 'Gunluk Hedef',
                                            position: 'insideTopRight',
                                            fill: '#10b981',
                                            fontSize: 10,
                                            fontWeight: 600,
                                        }}
                                    />
                                )}
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="avg_worked"
                                    name="Ort. Calisma"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#gradWorkedV2)"
                                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="avg_overtime"
                                    name="Ort. Fazla Mesai"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fill="url(#gradOTV2)"
                                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Absent count mini row */}
                    {dailyTrend.some(d => d.absent > 0) && (
                        <div className="flex items-center gap-2 mt-2 px-1">
                            <span className="text-[10px] font-semibold text-slate-400">Devamsizlik:</span>
                            <div className="flex gap-1 flex-wrap">
                                {dailyTrend.filter(d => d.absent > 0).map(d => (
                                    <span key={d.day} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-bold tabular-nums">
                                        {d.day}. gun: {d.absent}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 5: Weekly Heatmap ═══════ */}
            {heatmapData.length > 0 && (
                <AnalyticsCard
                    title="Haftalik Calisma Deseni"
                    subtitle="Hafta ici gun bazli ortalama calisma yogunlugu"
                    icon={Calendar}
                >
                    <div className="space-y-2">
                        {/* Header row */}
                        <div className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                            <div className="text-[10px] font-bold text-slate-400" />
                            {[1, 2, 3, 4, 5].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-slate-500">{dayNames[d]}</div>
                            ))}
                        </div>
                        {/* Week rows */}
                        {heatmapData.map(weekData => (
                            <div key={weekData.week} className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                                <div className="text-[10px] font-bold text-slate-400 flex items-center">Hafta {weekData.week}</div>
                                {[1, 2, 3, 4, 5].map(d => {
                                    const cell = weekData.days[d];
                                    if (!cell) return <div key={d} className="h-12 rounded-lg bg-slate-50 border border-slate-100" />;
                                    return (
                                        <div
                                            key={d}
                                            className={`h-12 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 ${getHeatColor(cell.worked)}`}
                                            title={`${cell.day}. gun: ${formatMinutes(cell.worked)} calisma${cell.absent > 0 ? `, ${cell.absent} devamsiz` : ''}`}
                                        >
                                            <span className="text-xs font-bold">{cell.worked > 0 ? formatMinutes(cell.worked) : '-'}</span>
                                            {cell.absent > 0 && (
                                                <span className="text-[8px] font-semibold opacity-80">{cell.absent} yok</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {/* Legend */}
                        <div className="flex items-center gap-3 mt-3 justify-end">
                            <span className="text-[9px] text-slate-400 font-semibold">Yogunluk:</span>
                            {[
                                { label: '<4s', cls: 'bg-red-200' },
                                { label: '4-6s', cls: 'bg-amber-200' },
                                { label: '6-7s', cls: 'bg-amber-300' },
                                { label: '7-8s', cls: 'bg-emerald-300' },
                                { label: '8s+', cls: 'bg-emerald-500' },
                            ].map((l, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className={`w-3 h-3 rounded ${l.cls}`} />
                                    <span className="text-[9px] text-slate-500">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 6: Per-Person Performance Bar ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <AnalyticsCard
                    title="Kisi Bazli Performans"
                    subtitle={`Aylik calisma sureleri (${analytics.performanceData.length} kisi)`}
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
                                <Bar dataKey="worked" name="Calisma" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="overtime" name="Fazla Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="missing" name="Kayip" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>

                {/* ═══════ SECTION 7: Time Distribution Pies ═══════ */}
                <div className="space-y-5">
                    <AnalyticsCard
                        title="Zaman Dagilimi"
                        subtitle="Ekip toplami"
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
                        title="Bakiye Dagilimi"
                        subtitle="Pozitif / Negatif orani"
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
                                        title={`${d.name}: ${d.value} kisi`}
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

            {/* ═══════ SECTION 8: OT vs Missing Comparison ═══════ */}
            {analytics.comparisonData.length > 0 && (
                <AnalyticsCard
                    title="Fazla Mesai ve Kayip Karsilastirmasi"
                    subtitle="Kisi bazli fazla mesai vs eksik zaman (diverging chart)"
                    icon={Zap}
                >
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.comparisonData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                barCategoryGap="25%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => formatMinutes(Math.abs(v))}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(Math.abs(v))} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                                <Bar dataKey="Fazla Mesai" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Eksik Zaman" fill="#ef4444" radius={[4, 0, 0, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 9: Performance Ranking Table ═══════ */}
            <AnalyticsCard
                title="Performans Siralamasi"
                subtitle={`Net bakiyeye gore siralama (${analytics.ranked.length} kisi)`}
                icon={Award}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Calisan</th>
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Departman</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Calisma</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Hedef</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Verim %</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">OT</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Eksik</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Sapma</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Gunluk Eksik</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Tahmini</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Bakiye</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Izin Bakiye</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.ranked.map((person, idx) => {
                                const balance = person.monthly_net_balance || 0;
                                const effBadge = getEfficiencyBadge(person.efficiency);
                                return (
                                    <tr key={person.employee_id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-2 font-bold text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                {person.is_online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                <span className="font-bold text-slate-700">{person.employee_name}</span>
                                            </div>
                                            {person.job_title && (
                                                <span className="text-[10px] text-slate-400">{person.job_title}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">{person.department || '-'}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-indigo-600 tabular-nums">{formatMinutes(person.total_worked || 0)}</td>
                                        <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{formatMinutes(person.monthly_required || 0)}</td>
                                        <td className="px-3 py-2 text-right">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${effBadge.cls}`}>
                                                %{person.efficiency}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-amber-600 tabular-nums">{formatMinutes(person.total_overtime || 0)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-red-500 tabular-nums">{formatMinutes(person.total_missing || 0)}</td>
                                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${(person.monthly_deviation || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {(person.monthly_deviation || 0) >= 0 ? '+' : ''}{formatMinutes(Math.abs(person.monthly_deviation || 0))}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-600 tabular-nums">{formatMinutes(person.dailyMissing)}</td>
                                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${person.projected >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {person.projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(person.projected))}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {balance > 0 ? '+' : ''}{formatMinutes(Math.abs(balance))}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-violet-600 tabular-nums">
                                            {person.annual_leave_balance != null ? `${person.annual_leave_balance} gun` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>

            {/* ═══════ SECTION 10: Risk Panel ═══════ */}
            {(analytics.highOTRisk.length > 0 || analytics.highMissingRisk.length > 0 || analytics.criticalBalanceRisk.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* High OT Risk */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'ot' ? null : 'ot')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                    <Flame size={14} className="text-amber-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-amber-800">Yuksek Fazla Mesai</p>
                                    <p className="text-[10px] text-amber-600">&gt;15 saat fazla mesai</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                                    {analytics.highOTRisk.length}
                                </span>
                                {expandedRisk === 'ot' ? <ChevronUp size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'ot' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.highOTRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-amber-900">{s.employee_name}</span>
                                        <span className="font-bold text-amber-700">{formatMinutes(s.total_overtime || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* High Missing Risk */}
                    <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'missing' ? null : 'missing')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-100 rounded-lg">
                                    <AlertCircle size={14} className="text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-red-800">Yuksek Eksik Zaman</p>
                                    <p className="text-[10px] text-red-600">&gt;%20 hedef kaybi</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                                    {analytics.highMissingRisk.length}
                                </span>
                                {expandedRisk === 'missing' ? <ChevronUp size={14} className="text-red-600" /> : <ChevronDown size={14} className="text-red-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'missing' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.highMissingRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-red-900">{s.employee_name}</span>
                                        <span className="font-bold text-red-700">{formatMinutes(s.total_missing || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Critical Balance Risk */}
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-violet-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'balance' ? null : 'balance')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-100 rounded-lg">
                                    <Shield size={14} className="text-violet-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-violet-800">Kritik Bakiye</p>
                                    <p className="text-[10px] text-violet-600">&lt;-10 saat bakiye</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded-full text-xs font-bold">
                                    {analytics.criticalBalanceRisk.length}
                                </span>
                                {expandedRisk === 'balance' ? <ChevronUp size={14} className="text-violet-600" /> : <ChevronDown size={14} className="text-violet-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'balance' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.criticalBalanceRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-violet-900">{s.employee_name}</span>
                                        <span className="font-bold text-violet-700">{formatMinutes(Math.abs(s.monthly_net_balance || 0))}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 11: Leave Balance ═══════ */}
            {analytics.leaveData.length > 0 && (
                <AnalyticsCard
                    title="Izin Bakiyesi"
                    subtitle="Yillik izin haklari ve kullanim durumu"
                    icon={Palmtree}
                >
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.leaveData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit=" gun"
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    formatter={(v) => `${v} gun`}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="used" name="Kullanilan" stackId="leave" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reserved" name="Planlanan" stackId="leave" fill="#a5b4fc" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="remaining" name="Kalan" stackId="leave" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 12: Spotlight Cards ═══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Best Balance */}
                {analytics.bestPerformer && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <TrendingUp size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Yuksek Bakiye</p>
                            <p className="text-lg font-bold truncate">{analytics.bestPerformer.employee_name}</p>
                            <p className="text-emerald-200 text-xs mt-0.5">{analytics.bestPerformer.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    {formatMinutes(Math.abs(analytics.bestPerformer.monthly_net_balance || 0))}
                                </span>
                                <TrendingUp size={16} className="text-emerald-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Most OT */}
                {analytics.mostOT && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <Zap size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-amber-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Cok Fazla Mesai</p>
                            <p className="text-lg font-bold truncate">{analytics.mostOT.employee_name}</p>
                            <p className="text-amber-200 text-xs mt-0.5">{analytics.mostOT.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    {formatMinutes(analytics.mostOT.total_overtime || 0)}
                                </span>
                                <Zap size={16} className="text-amber-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Worst Balance */}
                {analytics.worstPerformer && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-red-500 to-rose-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <TrendingDown size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-red-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Dusuk Bakiye</p>
                            <p className="text-lg font-bold truncate">{analytics.worstPerformer.employee_name}</p>
                            <p className="text-red-200 text-xs mt-0.5">{analytics.worstPerformer.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    {formatMinutes(Math.abs(analytics.worstPerformer.monthly_net_balance || 0))}
                                </span>
                                <TrendingDown size={16} className="text-red-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Most Efficient */}
                {analytics.mostEfficient && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <Star size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-violet-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Verimli</p>
                            <p className="text-lg font-bold truncate">{analytics.mostEfficient.employee_name}</p>
                            <p className="text-violet-200 text-xs mt-0.5">{analytics.mostEfficient.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    %{analytics.mostEfficient.efficiency}
                                </span>
                                <Star size={16} className="text-violet-200" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════ SECTION 13: Department Mini Cards (only "Tum Ekibim" + multiple depts) ═══════ */}
            {showDeptComparison && (
                <AnalyticsCard
                    title="Departman Ozeti"
                    subtitle="Her departmanin kompakt ozet karti (tikla: o departmana gec)"
                    icon={Users}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {analytics.departments.map((dept, i) => {
                            const dEff = dept.required > 0 ? Math.round((dept.worked / dept.required) * 100) : 0;
                            const dAvgWorked = dept.count > 0 ? Math.round(dept.worked / dept.count) : 0;
                            const dAvgMissing = dept.count > 0 ? Math.round(dept.missing / dept.count) : 0;
                            const dActiveRate = dept.count > 0 ? Math.round((dept.online / dept.count) * 100) : 0;
                            return (
                                <button
                                    key={dept.name}
                                    className="text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all hover:shadow-sm group"
                                    onClick={() => setActiveTab(dept.name)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                                            <span className="text-xs font-bold text-slate-800">{dept.name}</span>
                                        </div>
                                        <ArrowRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Kisi</span>
                                            <span className="font-bold text-slate-600">{dept.count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Verim</span>
                                            <span className={`font-bold ${dEff >= 95 ? 'text-emerald-600' : dEff >= 80 ? 'text-amber-600' : 'text-red-600'}`}>%{dEff}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Ort. Calisma</span>
                                            <span className="font-bold text-indigo-600">{formatMinutes(dAvgWorked)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Ort. Eksik</span>
                                            <span className="font-bold text-red-500">{formatMinutes(dAvgMissing)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Aktif</span>
                                            <span className="font-bold text-cyan-600">%{dActiveRate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Poz. Bakiye</span>
                                            <span className="font-bold text-emerald-600">{dept.positiveBalance}/{dept.count}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 14: Individual Performance Cards ═══════ */}
            <AnalyticsCard
                title="Bireysel Performans Kartlari"
                subtitle={`Her calisan icin detayli performans ozeti (${analytics.ranked.length} kisi)`}
                icon={UserCheck}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {analytics.ranked.map((person, idx) => {
                        const balance = person.monthly_net_balance || 0;
                        const effBadge = getEfficiencyBadge(person.efficiency);
                        return (
                            <div
                                key={person.employee_id || idx}
                                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                                    balance > 0
                                        ? 'bg-gradient-to-br from-white to-emerald-50/50 border-emerald-200/60'
                                        : balance < 0
                                            ? 'bg-gradient-to-br from-white to-red-50/50 border-red-200/60'
                                            : 'bg-white border-slate-200/80'
                                }`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {person.is_online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />}
                                            <p className="text-xs font-bold text-slate-800 truncate">{person.employee_name}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate">{person.job_title || person.department || '-'}</p>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ml-2 ${effBadge.cls}`}>
                                        %{person.efficiency} {effBadge.label}
                                    </span>
                                </div>

                                {/* Metrics grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Calisma</span>
                                        <span className="font-bold text-indigo-600 tabular-nums">{formatMinutes(person.total_worked || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Hedef</span>
                                        <span className="font-bold text-slate-500 tabular-nums">{formatMinutes(person.monthly_required || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">F. Mesai</span>
                                        <span className="font-bold text-amber-600 tabular-nums">{formatMinutes(person.total_overtime || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Eksik</span>
                                        <span className="font-bold text-red-500 tabular-nums">{formatMinutes(person.total_missing || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Gnl. Eksik</span>
                                        <span className="font-bold text-slate-600 tabular-nums">{formatMinutes(person.dailyMissing)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tahmini</span>
                                        <span className={`font-bold tabular-nums ${person.projected >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {person.projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(person.projected))}
                                        </span>
                                    </div>
                                </div>

                                {/* Balance bar */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${balance > 0 ? 'bg-emerald-500' : balance < 0 ? 'bg-red-500' : 'bg-slate-300'}`}
                                            style={{ width: `${Math.min(100, Math.abs(person.efficiency))}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-bold tabular-nums whitespace-nowrap ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                        {balance > 0 ? '+' : ''}{formatMinutes(Math.abs(balance))}
                                    </span>
                                </div>

                                {/* Leave info */}
                                {(person.annual_leave_entitlement > 0 || person.annual_leave_used > 0) && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <Palmtree size={10} />
                                            Izin
                                        </span>
                                        <span className="font-bold text-violet-600">
                                            {person.annual_leave_balance ?? 0}/{person.annual_leave_entitlement ?? 0} gun
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </AnalyticsCard>

            {/* ═══════ SECTION 15: Summary Footer Band ═══════ */}
            <div className="bg-slate-800 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">Ozet</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Toplam Calisan</p>
                        <p className="text-sm font-bold text-white tabular-nums">{analytics.count}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Toplam Calisma</p>
                        <p className="text-sm font-bold text-indigo-400 tabular-nums">{formatMinutes(analytics.totalWorked)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Toplam OT</p>
                        <p className="text-sm font-bold text-amber-400 tabular-nums">{formatMinutes(analytics.totalOT)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Toplam Eksik</p>
                        <p className="text-sm font-bold text-red-400 tabular-nums">{formatMinutes(analytics.totalMissing)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Ort. Verim</p>
                        <p className={`text-sm font-bold tabular-nums ${analytics.efficiency >= 95 ? 'text-emerald-400' : analytics.efficiency >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                            %{analytics.efficiency}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Tahmini Ay Sonu</p>
                        <p className={`text-sm font-bold tabular-nums ${analytics.projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {analytics.projectedBalance >= 0 ? '+' : ''}{formatMinutes(Math.abs(analytics.projectedBalance))}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TeamAnalyticsDashboard;
