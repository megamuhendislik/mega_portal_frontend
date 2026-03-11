import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PieChart as PieChartIcon, ArrowDownLeft, Users, RefreshCw, User,
    TrendingUp, BarChart3, CheckCircle2, XCircle, AlertCircle,
    Clock, Calendar, Timer, Layers, HeartPulse, Zap
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
    KPIGrid, ComparisonBanner, TypeBreakdownCards, StatusDonut,
    TrendChart, HealthReportSection, ApprovalBottleneck,
    WeeklyHeatmap, EmployeeBreakdownTable, DepartmentBreakdown,
    TopRequesters, OTSourcePie, LeaveTypeBreakdown, RecentActivity,
    ExportButton, SectionCard
} from '../../components/analytics';
import TeamOvertimeAnalytics from '../../components/TeamOvertimeAnalytics';
import FiscalMonthPicker from '../../components/FiscalMonthPicker';
import clsx from 'clsx';

// ============================================================
// Shared helpers
// ============================================================

/** Transform backend nested comparison to ComparisonBanner flat format */
function toFlatComparison(comparison) {
    if (!comparison) return null;

    // Backend sends nested format: { total: {current, previous, delta_pct}, leave: {...}, ... }
    // ComparisonBanner expects flat: { delta_total, delta_approval_rate, delta_overtime_hours, delta_leave_days }
    const flat = {};
    if (comparison.total) flat.delta_total = comparison.total.delta_pct;
    if (comparison.leave) flat.delta_leave_days = comparison.leave.delta_pct;
    if (comparison.overtime) flat.delta_overtime_hours = comparison.overtime.delta_pct;

    // Also handle flat format if backend already sends it
    if ('delta_total' in comparison) return comparison;

    return Object.keys(flat).length > 0 ? flat : null;
}

/** Extract a KPI delta from nested comparison entry */
function makeDelta(comparison, key) {
    if (!comparison?.[key]) return undefined;
    const entry = comparison[key];
    if (typeof entry === 'object' && 'delta_pct' in entry) {
        return entry.delta_pct;
    }
    return undefined;
}

/** Build trend data for TrendChart from monthly_trend array */
function buildTrendData(monthlyTrend) {
    if (!monthlyTrend) return [];
    return monthlyTrend.map(m => ({
        name: m.label,
        leave: m.leave || 0,
        overtime: m.overtime || 0,
        meal: m.meal || 0,
        cardless: m.cardless || 0,
        health_report: m.health_report || m.health_count || 0,
        overtime_hours: m.overtime_hours || 0,
        leave_days: m.leave_days || 0,
        total: m.total || 0,
        approved: m.approved || 0,
    }));
}

/** Standard trend bars config (5 types) */
const TREND_BARS = [
    { key: 'leave', label: 'Izin', color: '#3B82F6' },
    { key: 'overtime', label: 'Ek Mesai', color: '#F59E0B' },
    { key: 'meal', label: 'Yemek', color: '#10B981' },
    { key: 'cardless', label: 'Kartsiz Giris', color: '#8B5CF6' },
    { key: 'health_report', label: 'Saglik Raporu', color: '#EC4899' },
];

/** Composed lines for secondary chart */
const COMPOSED_LINES = [
    { key: 'overtime_hours', label: 'Mesai (saat)', color: '#F59E0B', type: 'area', yAxisId: 'left' },
    { key: 'leave_days', label: 'Izin (gun)', color: '#3B82F6', type: 'line', yAxisId: 'right' },
];

/** Range option buttons */
const RANGE_OPTIONS = [
    { value: 3, label: '3 Ay' },
    { value: 6, label: '6 Ay' },
    { value: 12, label: '12 Ay' },
];

// ============================================================
// Loading skeleton
// ============================================================
const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
        </div>
    </div>
);

// ============================================================
// Error state
// ============================================================
const ErrorState = ({ icon: Icon = PieChartIcon, message, onRetry }) => (
    <div className="text-center py-16 text-slate-400">
        <Icon size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium mb-3">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
                <RefreshCw size={14} />
                Tekrar Dene
            </button>
        )}
    </div>
);

// ============================================================
// Empty state
// ============================================================
const EmptyState = ({ icon: Icon = PieChartIcon }) => (
    <div className="text-center py-16 text-slate-400">
        <Icon size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">Veri bulunamadi</p>
    </div>
);

// ============================================================
// PersonalAnalytics
// ============================================================
const PersonalAnalytics = ({ range }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await api.get('/request-analytics/', { params: { range } });
            setData(res.data);
        } catch (err) {
            console.error('Personal analytics error:', err);
            setError(true);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <LoadingSkeleton />;
    if (error) return <ErrorState message="Analiz verisi olusturulamadi." onRetry={fetchData} />;
    if (!data) return <EmptyState />;

    return <PersonalAnalyticsContent data={data} range={range} />;
};

const PersonalAnalyticsContent = ({ data, range }) => {
    const trendData = useMemo(() => buildTrendData(data?.monthly_trend), [data]);

    const typeDistData = useMemo(() => {
        if (!data?.type_distribution) return [];
        return data.type_distribution.filter(d => d.count > 0).map(d => ({
            name: d.type, value: d.count, color: d.color || '#94A3B8',
        }));
    }, [data]);

    const statusDistData = useMemo(() => {
        if (!data?.status_distribution) return [];
        return data.status_distribution.filter(d => d.count > 0).map(d => ({
            name: d.status, value: d.count, color: d.color || '#94A3B8',
        }));
    }, [data]);

    const leaveTypeData = useMemo(() => {
        if (!data?.leave_type_breakdown) return [];
        return data.leave_type_breakdown.map(l => ({
            name: l.name,
            Talep: l.count || 0,
            Onay: l.count || 0,  // approved only from backend
            Gun: l.days || 0,
        }));
    }, [data]);

    const flatComparison = useMemo(() => toFlatComparison(data?.comparison), [data]);

    const pendingCount = data.status_distribution?.find(s =>
        s.status === 'Bekleyen' || s.status === 'PENDING'
    )?.count || 0;

    const kpiItems = [
        {
            title: 'Toplam Talep',
            value: data.total_requests || 0,
            gradient: 'from-slate-700 to-slate-900',
            icon: Layers,
            delta: makeDelta(data.comparison, 'total'),
            deltaSuffix: '%',
        },
        {
            title: 'Onay Orani',
            value: data.approval_rate || 0,
            suffix: '%',
            gradient: 'from-emerald-500 to-emerald-600',
            icon: CheckCircle2,
        },
        {
            title: 'Ek Mesai',
            value: data.total_overtime_hours || 0,
            suffix: 'saat',
            gradient: 'from-amber-500 to-orange-500',
            icon: Clock,
            delta: makeDelta(data.comparison, 'overtime'),
            deltaSuffix: '%',
        },
        {
            title: 'Izin Gunleri',
            value: data.total_leave_days || 0,
            suffix: 'gun',
            gradient: 'from-blue-500 to-blue-600',
            icon: Calendar,
            delta: makeDelta(data.comparison, 'leave'),
            deltaSuffix: '%',
        },
        {
            title: 'Bekleyen',
            value: pendingCount,
            gradient: 'from-amber-400 to-amber-500',
            icon: AlertCircle,
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <KPIGrid items={kpiItems} columns={5} />

            <ComparisonBanner comparison={flatComparison} />

            <TypeBreakdownCards summary={data.summary} healthReport={data.health_report} />

            <SectionCard
                title="Aylik Trend"
                subtitle="Talep turleri bazinda aylik dagilim"
                icon={TrendingUp}
                iconGradient="from-emerald-500 to-emerald-600"
                collapsible={true}
                defaultOpen={true}
            >
                <TrendChart
                    data={trendData}
                    bars={TREND_BARS}
                    showComposed={true}
                    composedLines={COMPOSED_LINES}
                />
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                    title="Tur Dagilimi"
                    icon={PieChartIcon}
                    iconGradient="from-indigo-500 to-indigo-600"
                    collapsible={false}
                >
                    <StatusDonut
                        data={typeDistData}
                        title="Talep Turleri"
                        centerLabel={data.total_requests}
                        centerSubLabel="Toplam"
                    />
                </SectionCard>

                <SectionCard
                    title="Durum Dagilimi"
                    icon={BarChart3}
                    iconGradient="from-purple-500 to-purple-600"
                    collapsible={false}
                >
                    <StatusDonut
                        data={statusDistData}
                        title="Talep Durumlari"
                        centerLabel={data.total_requests}
                        centerSubLabel="Toplam"
                    />
                </SectionCard>
            </div>

            {leaveTypeData.length > 0 && (
                <SectionCard
                    title="Izin Turu Dagilimi"
                    icon={Calendar}
                    iconGradient="from-blue-500 to-blue-600"
                    collapsible={true}
                    defaultOpen={false}
                >
                    <LeaveTypeBreakdown data={leaveTypeData} />
                </SectionCard>
            )}

            {data.health_report && data.health_report.total > 0 && (
                <SectionCard
                    title="Saglik Raporu"
                    icon={HeartPulse}
                    iconGradient="from-pink-500 to-pink-600"
                    collapsible={true}
                    defaultOpen={true}
                >
                    <HealthReportSection stats={data.health_report} />
                </SectionCard>
            )}

            <SectionCard
                title="Son Aktiviteler"
                icon={Clock}
                iconGradient="from-violet-500 to-violet-600"
                collapsible={true}
                defaultOpen={true}
            >
                <RecentActivity data={data.recent_requests} />
            </SectionCard>

            <div className="flex justify-end">
                <ExportButton type="personal" range={range} />
            </div>
        </div>
    );
};

// ============================================================
// IncomingAnalytics
// ============================================================
const IncomingAnalytics = ({ range }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await api.get('/request-analytics/incoming/', { params: { range } });
            setData(res.data);
        } catch (err) {
            console.error('Incoming analytics error:', err);
            setError(true);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <LoadingSkeleton />;
    if (error) return <ErrorState icon={ArrowDownLeft} message="Gelen talep verisi olusturulamadi." onRetry={fetchData} />;
    if (!data) return <EmptyState icon={ArrowDownLeft} />;

    return <IncomingAnalyticsContent data={data} range={range} />;
};

const IncomingAnalyticsContent = ({ data, range }) => {
    const trendData = useMemo(() => buildTrendData(data?.monthly_trend), [data]);

    const flatComparison = useMemo(() => toFlatComparison(data?.comparison), [data]);

    const approvalDonutData = useMemo(() => {
        const items = [];
        if (data.approved_count > 0) items.push({ name: 'Onaylanan', value: data.approved_count, color: '#10B981' });
        if (data.rejected_count > 0) items.push({ name: 'Reddedilen', value: data.rejected_count, color: '#EF4444' });
        if (data.pending_count > 0) items.push({ name: 'Bekleyen', value: data.pending_count, color: '#F59E0B' });
        return items;
    }, [data]);

    const kpiItems = [
        {
            title: 'Toplam Gelen',
            value: data.total_received || 0,
            gradient: 'from-slate-700 to-slate-900',
            icon: ArrowDownLeft,
            delta: makeDelta(data.comparison, 'total'),
            deltaSuffix: '%',
        },
        {
            title: 'Onaylanan',
            value: data.approved_count || 0,
            gradient: 'from-emerald-500 to-emerald-600',
            icon: CheckCircle2,
        },
        {
            title: 'Reddedilen',
            value: data.rejected_count || 0,
            gradient: 'from-red-500 to-red-600',
            icon: XCircle,
        },
        {
            title: 'Bekleyen',
            value: data.pending_count || 0,
            gradient: 'from-amber-500 to-amber-600',
            icon: AlertCircle,
        },
        {
            title: 'Ort. Karar Suresi',
            value: data.avg_decision_hours ?? '\u2014',
            suffix: 'saat',
            gradient: 'from-blue-500 to-blue-600',
            icon: Timer,
        },
    ];

    // Inline type distribution bars (not a separate component)
    const byType = data.by_type || {};
    const typeBarItems = [
        { key: 'leave', label: 'Izin', color: 'bg-blue-400' },
        { key: 'overtime', label: 'Ek Mesai', color: 'bg-amber-400' },
        { key: 'cardless', label: 'Kartsiz Giris', color: 'bg-purple-400' },
        { key: 'health_report', label: 'Saglik Raporu', color: 'bg-pink-400' },
    ];
    const maxTypeTotal = Math.max(
        ...typeBarItems.map(t => byType[t.key]?.total || 0), 1
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <KPIGrid items={kpiItems} columns={5} />

            <ComparisonBanner comparison={flatComparison} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                    title="Onay Orani"
                    icon={CheckCircle2}
                    iconGradient="from-emerald-500 to-emerald-600"
                    collapsible={false}
                >
                    <StatusDonut
                        data={approvalDonutData}
                        centerLabel={`${data.approval_rate || 0}%`}
                        centerSubLabel="Onay"
                    />
                </SectionCard>

                <SectionCard
                    title="Tur Dagilimi"
                    icon={BarChart3}
                    iconGradient="from-indigo-500 to-indigo-600"
                    collapsible={false}
                >
                    <div className="space-y-3">
                        {typeBarItems.map(({ key, label, color }) => {
                            const t = byType[key] || {};
                            const total = t.total || 0;
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="w-24 text-sm font-medium text-slate-600 shrink-0">{label}</span>
                                    <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                                        <div
                                            className={clsx('h-full rounded-lg flex items-center justify-end pr-2', color)}
                                            style={{ width: `${Math.max((total / maxTypeTotal) * 100, 5)}%` }}
                                        >
                                            <span className="text-[10px] font-bold text-white">{total}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 w-16 text-right shrink-0">
                                        {t.approved || 0} onay
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            </div>

            <SectionCard
                title="Aylik Gelen Talep Trendi"
                subtitle="Son donemde size gelen talep sayilari"
                icon={TrendingUp}
                iconGradient="from-emerald-500 to-emerald-600"
                collapsible={true}
                defaultOpen={true}
            >
                <TrendChart
                    data={trendData}
                    bars={[
                        { key: 'leave', label: 'Izin', color: '#3B82F6' },
                        { key: 'overtime', label: 'Ek Mesai', color: '#F59E0B' },
                        { key: 'cardless', label: 'Kartsiz Giris', color: '#8B5CF6' },
                        { key: 'health_report', label: 'Saglik Raporu', color: '#EC4899' },
                    ]}
                />
            </SectionCard>

            {data.top_requesters && data.top_requesters.length > 0 && (
                <SectionCard
                    title="En Cok Talep Eden Calisanlar"
                    icon={Users}
                    iconGradient="from-purple-500 to-purple-600"
                    collapsible={true}
                    defaultOpen={true}
                >
                    <TopRequesters data={data.top_requesters} />
                </SectionCard>
            )}

            {data.approval_bottleneck && data.approval_bottleneck.length > 0 && (
                <SectionCard
                    title="Onay Darbogazlari"
                    icon={AlertCircle}
                    iconGradient="from-red-500 to-red-600"
                    collapsible={true}
                    defaultOpen={true}
                >
                    <ApprovalBottleneck data={data.approval_bottleneck} />
                </SectionCard>
            )}

            <div className="flex justify-end">
                <ExportButton type="incoming" range={range} />
            </div>
        </div>
    );
};

// ============================================================
// TeamAnalytics
// ============================================================
const TeamAnalytics = ({ range }) => {
    const [teamData, setTeamData] = useState(null);
    const [compData, setCompData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [teamRes, compRes] = await Promise.allSettled([
                api.get('/request-analytics/team-overview/', { params: { range } }),
                api.get('/request-analytics/comprehensive/', { params: { range } }),
            ]);
            if (teamRes.status === 'fulfilled') setTeamData(teamRes.value.data);
            if (compRes.status === 'fulfilled') setCompData(compRes.value.data);
            if (teamRes.status === 'rejected' && compRes.status === 'rejected') {
                setError(true);
            }
        } catch (err) {
            console.error('Team analytics error:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <LoadingSkeleton />;
    if (error || (!teamData && !compData)) {
        return <ErrorState icon={Users} message="Ekip analiz verisi olusturulamadi." onRetry={fetchData} />;
    }

    return <TeamAnalyticsContent teamData={teamData} compData={compData} range={range} />;
};

const TeamAnalyticsContent = ({ teamData, compData, range }) => {
    const data = teamData || {};
    const comp = compData || {};

    const trendData = useMemo(() => {
        // Prefer comprehensive trend data if available, fallback to team
        const source = comp?.monthly_trend || data?.monthly_trend;
        return buildTrendData(source);
    }, [comp, data]);

    const flatComparison = useMemo(() => toFlatComparison(comp?.comparison), [comp]);

    // Build summary from team by_type data for TypeBreakdownCards
    const summary = useMemo(() => {
        const bt = data.by_type || comp?.overview?.by_type || {};
        return {
            leave: bt.leave || { total: 0, approved: 0, rejected: 0, pending: 0 },
            overtime: bt.overtime || { total: 0, approved: 0, rejected: 0, pending: 0 },
            meal: bt.meal || { total: 0, approved: 0, rejected: 0, pending: 0 },
            cardless: bt.cardless || { total: 0, approved: 0, rejected: 0, pending: 0 },
        };
    }, [data, comp]);

    const healthReport = useMemo(() => {
        const hrType = data.by_type?.health_report || comp?.overview?.by_type?.health_report || {};
        return {
            total: hrType.total || data.health_report_count || 0,
            approved: hrType.approved || 0,
            pending: hrType.pending || 0,
        };
    }, [data, comp]);

    // OT source data for OTSourcePie
    const otSourceData = useMemo(() => {
        if (!comp?.overtime_sources) return [];
        const src = comp.overtime_sources;
        return [
            { key: 'intended', name: 'Planli', value: src.intended || 0 },
            { key: 'potential', name: 'Planlanmamis', value: src.potential || 0 },
            { key: 'manual', name: 'Manuel', value: src.manual || 0 },
        ].filter(d => d.value > 0);
    }, [comp]);

    // Leave type data for LeaveTypeBreakdown
    const leaveTypeData = useMemo(() => {
        if (!comp?.leave_types) return [];
        return comp.leave_types.map(l => ({
            name: l.name,
            Talep: l.count || 0,
            Onay: l.approved || 0,
            Gun: l.total_days || 0,
        }));
    }, [comp]);

    // Department breakdown data
    const deptBreakdown = useMemo(() => {
        if (!comp?.department_breakdown) return [];
        return comp.department_breakdown.map(d => ({
            department: d.name || d.department || '',
            leave: d.leave || 0,
            overtime: d.overtime || 0,
            meal: d.meal || 0,
            cardless: d.cardless || 0,
            health_report: d.health_report || 0,
            total: d.total || 0,
            employee_count: d.employee_count || 0,
        }));
    }, [comp]);

    const kpiItems = [
        {
            title: 'Ekip Talepleri',
            value: data.total_requests || comp?.overview?.total_requests || 0,
            gradient: 'from-slate-700 to-slate-900',
            icon: Layers,
            delta: makeDelta(comp?.comparison, 'total'),
            deltaSuffix: '%',
        },
        {
            title: 'Onay Orani',
            value: data.approval_rate || comp?.overview?.approval_rate || 0,
            suffix: '%',
            gradient: 'from-emerald-500 to-emerald-600',
            icon: CheckCircle2,
        },
        {
            title: 'Mesai Saatleri',
            value: data.overtime_hours || comp?.overview?.total_overtime_hours || 0,
            suffix: 'saat',
            gradient: 'from-amber-500 to-orange-500',
            icon: Zap,
            delta: makeDelta(comp?.comparison, 'overtime'),
            deltaSuffix: '%',
        },
        {
            title: 'Izin Gunleri',
            value: data.leave_days || comp?.overview?.total_leave_days || 0,
            suffix: 'gun',
            gradient: 'from-blue-500 to-blue-600',
            icon: Calendar,
            delta: makeDelta(comp?.comparison, 'leave'),
            deltaSuffix: '%',
        },
        {
            title: 'Saglik Raporu',
            value: data.health_report_count || 0,
            gradient: 'from-pink-500 to-pink-600',
            icon: HeartPulse,
            delta: makeDelta(comp?.comparison, 'health_report'),
            deltaSuffix: '%',
        },
        {
            title: 'Ekip Uyeleri',
            value: data.managed_count || comp?.overview?.managed_employee_count || 0,
            gradient: 'from-violet-500 to-violet-600',
            icon: Users,
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <KPIGrid items={kpiItems} columns={6} />

            <ComparisonBanner comparison={flatComparison} />

            <TypeBreakdownCards summary={summary} healthReport={healthReport} />

            <SectionCard
                title="Aylik Trend"
                subtitle="Ekip talep turleri bazinda aylik dagilim"
                icon={TrendingUp}
                iconGradient="from-emerald-500 to-emerald-600"
                collapsible={true}
                defaultOpen={true}
            >
                <TrendChart
                    data={trendData}
                    bars={TREND_BARS}
                    showComposed={true}
                    composedLines={COMPOSED_LINES}
                />
            </SectionCard>

            <SectionCard
                title="Calisan Bazli Talep Dagilimi"
                icon={User}
                iconGradient="from-blue-500 to-blue-600"
                collapsible={true}
                defaultOpen={true}
            >
                <EmployeeBreakdownTable
                    data={data.by_employee || comp?.employee_breakdown}
                    showHealthReport={true}
                />
            </SectionCard>

            {deptBreakdown.length > 0 && (
                <SectionCard
                    title="Departman Dagilimi"
                    icon={Users}
                    iconGradient="from-cyan-500 to-cyan-600"
                    collapsible={true}
                    defaultOpen={false}
                >
                    <DepartmentBreakdown data={deptBreakdown} />
                </SectionCard>
            )}

            {comp?.health_report_stats && comp.health_report_stats.total > 0 && (
                <SectionCard
                    title="Saglik Raporu"
                    icon={HeartPulse}
                    iconGradient="from-pink-500 to-pink-600"
                    collapsible={true}
                    defaultOpen={true}
                >
                    <HealthReportSection stats={comp.health_report_stats} />
                </SectionCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {otSourceData.length > 0 && (
                    <SectionCard
                        title="Ek Mesai Kaynak Dagilimi"
                        icon={Zap}
                        iconGradient="from-amber-500 to-amber-600"
                        collapsible={false}
                    >
                        <OTSourcePie data={otSourceData} />
                    </SectionCard>
                )}

                {comp?.weekly_pattern && comp.weekly_pattern.length > 0 && (
                    <SectionCard
                        title="Haftalik Talep Dagitimi"
                        icon={Calendar}
                        iconGradient="from-violet-500 to-violet-600"
                        collapsible={false}
                    >
                        <WeeklyHeatmap data={comp.weekly_pattern} />
                    </SectionCard>
                )}
            </div>

            {leaveTypeData.length > 0 && (
                <SectionCard
                    title="Izin Turu Dagilimi"
                    icon={Calendar}
                    iconGradient="from-blue-500 to-blue-600"
                    collapsible={true}
                    defaultOpen={false}
                >
                    <LeaveTypeBreakdown data={leaveTypeData} />
                </SectionCard>
            )}

            {comp?.approval_bottleneck && comp.approval_bottleneck.length > 0 && (
                <SectionCard
                    title="Onay Darbogazlari"
                    icon={AlertCircle}
                    iconGradient="from-red-500 to-red-600"
                    collapsible={true}
                    defaultOpen={false}
                >
                    <ApprovalBottleneck data={comp.approval_bottleneck} />
                </SectionCard>
            )}

            <div className="flex justify-end">
                <ExportButton type="team" range={range} />
            </div>

            {/* Existing TeamOvertimeAnalytics component */}
            <TeamOvertimeAnalytics />
        </div>
    );
};

// ============================================================
// Main AnalyticsTab
// ============================================================
const AnalyticsTab = ({ refreshTrigger }) => {
    const { hasPermission } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('personal');
    const [range, setRange] = useState(6);
    const [fiscalDateFrom, setFiscalDateFrom] = useState('');
    const [fiscalDateTo, setFiscalDateTo] = useState('');
    const [subordinates, setSubordinates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [subsRes] = await Promise.allSettled([
                    api.get('/employees/subordinates/'),
                ]);
                if (subsRes.status === 'fulfilled') {
                    setSubordinates(subsRes.value.data?.results || subsRes.value.data || []);
                }
            } catch (err) {
                console.error('AnalyticsTab fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME') || subordinates.length > 0;

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    const subTabs = [
        { key: 'personal', label: 'Kendi Taleplerim', icon: PieChartIcon },
        ...(isManager ? [
            { key: 'incoming', label: 'Gelen Talepler', icon: ArrowDownLeft },
            { key: 'team', label: 'Ekip Analizi', icon: Users },
        ] : []),
    ];

    return (
        <div className="space-y-0 animate-in fade-in">
            {/* Header with range selector and refresh */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <FiscalMonthPicker
                    onDateChange={(from, to) => { setFiscalDateFrom(from); setFiscalDateTo(to); }}
                />

                {/* Range selector */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    {RANGE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setRange(opt.value)}
                            className={clsx(
                                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                                range === opt.value
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Refresh button */}
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    title="Yenile"
                >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Yenile</span>
                </button>
            </div>

            {/* Sub-tab bar */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveSubTab(tab.key)}
                            className={clsx(
                                'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2',
                                activeSubTab === tab.key
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeSubTab === 'personal' && <PersonalAnalytics key={`personal-${range}-${refreshKey}`} range={range} />}
            {activeSubTab === 'incoming' && isManager && <IncomingAnalytics key={`incoming-${range}-${refreshKey}`} range={range} />}
            {activeSubTab === 'team' && isManager && <TeamAnalytics key={`team-${range}-${refreshKey}`} range={range} />}
        </div>
    );
};

export default AnalyticsTab;
