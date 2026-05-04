import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
    FileText, TrendingUp, PieChart as PieChartIcon, Users,
    CheckCircle2, Clock, XCircle, Calendar, BarChart3, Hourglass, X as CloseIcon,
    UserCheck,
} from 'lucide-react';
import SLATab from './SLATab';
import api from '../../../../services/api';
import { lazyRetry } from '../../../../utils/lazyRetry';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import ChartTooltip from '../shared/ChartTooltip';
import ScopeBanner from '../shared/ScopeBanner';
import RequestDetailDrawer from '../shared/RequestDetailDrawer';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area,
} from 'recharts';

// Lazy-load — yalnızca bekleyen talep filtresi etkin olunca tablo render edilir
// lazyRetry: deploy sonrasi stale chunk hash 404 -> auto reload
const PendingRequestsTable = lazyRetry(() => import('../shared/PendingRequestsTable'));

const TYPE_COLORS = { leave: '#3B82F6', overtime: '#F59E0B', meal: '#10B981', cardless: '#8B5CF6', health_report: '#EC4899' };
const TYPE_LABELS = { leave: 'İzin', overtime: 'Fazla Mesai', meal: 'Yemek', cardless: 'Kartsız Giriş', health_report: 'Sağlık Raporu' };
const STATUS_COLORS = { approved: '#10B981', rejected: '#EF4444', pending: '#F59E0B', cancelled: '#94A3B8' };

// Pie label (Turkish) -> backend type/status code mapping
const TYPE_LABEL_TO_CODE = {
    'İzin': 'leave',
    'Fazla Mesai': 'overtime',
    'Yemek': 'meal',
    'Kartsız Giriş': 'cardless',
    'Sağlık Raporu': 'health_report',
};
const STATUS_LABEL_TO_CODE = {
    'Onaylı': 'APPROVED',
    'Onaylandı': 'APPROVED',
    'Reddedildi': 'REJECTED',
    'Bekleyen': 'PENDING',
    'İptal': 'CANCELLED',
    'Bekliyor': 'PENDING',
};

// Filter chip tile
function FilterChip({ label, color = 'blue', onRemove }) {
    const COLORS = {
        blue: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
        amber: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
        violet: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
        emerald: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
        slate: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
    };
    const c = COLORS[color] || COLORS.blue;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
        >
            {label}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    aria-label="Filtreyi kaldır"
                >
                    <CloseIcon size={10} />
                </button>
            )}
        </span>
    );
}

export default function RequestAnalyticsTab() {
    const { startDate, endDate } = useAnalytics();
    const [mode, setMode] = useState('personal');
    // Ust seviye segmented: 'employee' (calisan talepleri) vs 'manager' (SLA)
    const [topSection, setTopSection] = useState('employee');
    const [personalData, setPersonalData] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Tıklanabilir pie filter state'leri
    const [selectedType, setSelectedType] = useState(null);   // 'leave'|'overtime'|'cardless'|'meal'|null
    const [selectedStatus, setSelectedStatus] = useState(null); // 'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'|null
    const [selectedMonth, setSelectedMonth] = useState(null); // 'YYYY-MM' | null

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerRequest, setDrawerRequest] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            if (mode === 'team') {
                const [overviewRes, compRes] = await Promise.allSettled([
                    api.get('/request-analytics/team-overview/', { params: { range: 6 } }),
                    api.get('/request-analytics/comprehensive/', { params: { range: 6 } }),
                ]);
                const overview = overviewRes.status === 'fulfilled' ? overviewRes.value.data : {};
                const comp = compRes.status === 'fulfilled' ? compRes.value.data : {};
                setTeamData({ ...overview, ...comp });
            } else {
                const res = await api.get('/request-analytics/', { params: { range: 6 } });
                setPersonalData(res.data);
            }
        } catch {
            setError(true);
        }
        setLoading(false);
    }, [mode]);

    useEffect(() => {
        // Effect body içinde sync setState yapmamak için microtask'a ertele
        Promise.resolve().then(() => { fetchData(); });
    }, [fetchData]);

    // Mode değişince filtreleri resetle
    useEffect(() => {
        Promise.resolve().then(() => {
            setSelectedType(null);
            setSelectedStatus(null);
            setSelectedMonth(null);
        });
    }, [mode]);

    const data = mode === 'team' ? teamData : personalData;

    // Type distribution
    const typeDistData = useMemo(() => {
        if (!data) return [];
        if (data.type_distribution) {
            return data.type_distribution.filter(d => d.count > 0).map(d => ({
                name: d.type || d.name, value: d.count, color: d.color || TYPE_COLORS[d.key] || '#94A3B8',
                key: d.key,
            }));
        }
        if (data.by_type) {
            return Object.entries(data.by_type).map(([key, val]) => ({
                name: TYPE_LABELS[key] || key, value: val?.total || (typeof val === 'number' ? val : 0), color: TYPE_COLORS[key] || '#94A3B8',
                key,
            })).filter(d => d.value > 0);
        }
        return [];
    }, [data]);

    // Status distribution
    const statusDistData = useMemo(() => {
        if (!data) return [];
        if (data.status_distribution) {
            return data.status_distribution.filter(d => d.count > 0).map(d => ({
                name: d.status || d.label, value: d.count, color: d.color || '#94A3B8',
            }));
        }
        const items = [];
        if (data.approved_count) items.push({ name: 'Onaylı', value: data.approved_count, color: STATUS_COLORS.approved });
        if (data.rejected_count) items.push({ name: 'Reddedildi', value: data.rejected_count, color: STATUS_COLORS.rejected });
        if (data.pending_count) items.push({ name: 'Bekleyen', value: data.pending_count, color: STATUS_COLORS.pending });
        return items;
    }, [data]);

    // Monthly trend
    const trendData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        const TR_MONTHS = { Jan: 'Oca', Feb: 'Şub', Mar: 'Mar', Apr: 'Nis', May: 'May', Jun: 'Haz', Jul: 'Tem', Aug: 'Ağu', Sep: 'Eyl', Oct: 'Eki', Nov: 'Kas', Dec: 'Ara' };
        return data.monthly_trend.map(m => ({
            name: (m.label || '').replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, match => TR_MONTHS[match] || match),
            ym: m.ym || m.year_month || m.key || null, // backend "YYYY-MM"
            izin: m.leave || 0,
            ek_mesai: m.overtime || 0,
            yemek: m.meal || 0,
            kartsız: m.cardless || 0,
            toplam: m.total || 0,
        }));
    }, [data]);

    // Employee breakdown (team mode)
    const employeeBreakdown = useMemo(() => {
        if (!data?.by_employee) return [];
        return (Array.isArray(data.by_employee) ? data.by_employee : [])
            .sort((a, b) => (b.total || 0) - (a.total || 0))
            .slice(0, 20);
    }, [data]);

    // Leave type breakdown
    const leaveTypeData = useMemo(() => {
        if (!data?.leave_type_breakdown) return [];
        return data.leave_type_breakdown
            .filter(d => d.count > 0)
            .map((d, i) => ({
                name: d.type || d.leave_type || d.name,
                value: d.count,
                color: ['#3B82F6', '#6366f1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'][i % 7],
            }));
    }, [data]);

    // Approval speed / bottleneck
    const avgDecisionHours = data?.avg_decision_hours || data?.avg_approval_time_hours;

    // Pie chart click handlers
    const handleTypePieClick = useCallback((entry) => {
        if (!entry) return;
        const code = entry.key || TYPE_LABEL_TO_CODE[entry.name] || null;
        if (!code) return;
        setSelectedType((prev) => (prev === code ? null : code));
    }, []);

    const handleStatusPieClick = useCallback((entry) => {
        if (!entry) return;
        const code = STATUS_LABEL_TO_CODE[entry.name] || null;
        if (!code) return;
        setSelectedStatus((prev) => (prev === code ? null : code));
    }, []);

    const handleTrendBarClick = useCallback((data) => {
        if (!data || !data.ym) return;
        setSelectedMonth((prev) => (prev === data.ym ? null : data.ym));
    }, []);

    const handleRowClick = useCallback((row) => {
        setDrawerRequest(row);
        setDrawerOpen(true);
    }, []);

    const clearAllFilters = useCallback(() => {
        setSelectedType(null);
        setSelectedStatus(null);
        setSelectedMonth(null);
    }, []);

    if (loading) return <LoadingSkeleton rows={4} />;
    if (error) return <ErrorState message="Talep analiz verisi yüklenemedi" onRetry={fetchData} />;

    const totalRequests = data?.total_requests || data?.total_received || 0;
    const approvalRate = data?.approval_rate || 0;
    const pendingCount = data?.pending_count || data?.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0;

    const hasFilter = !!(selectedType || selectedStatus || selectedMonth);
    // Tablo görünür mu? Team mode + en az bir filter aktif (varsayılan: status=PENDING'i type seçilince auto-aç)
    // UX: type pie tıklanınca status'u 'PENDING'e zorla (kullanıcı farklı seçtiyse koru)
    const showPendingTable = mode === 'team' && hasFilter;
    const effectiveStatus = selectedStatus || (selectedType ? 'PENDING' : 'PENDING');

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Kapsam göstergesi */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* ═══ ÜST BÖLÜM SEÇİCİ — Çalışan Talepleri vs Yönetici Onayları ═══ */}
            <div className="bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/60 border-2 border-indigo-200/60 rounded-2xl p-2 shadow-sm">
                <div className="flex items-center gap-2">
                    {[
                        {
                            key: 'employee',
                            label: 'Çalışan Talepleri',
                            sublabel: 'Talep tipi, durum, trend, kişi bazlı',
                            icon: FileText,
                            gradient: 'from-indigo-500 to-blue-600',
                        },
                        {
                            key: 'manager',
                            label: 'Yönetici Onayları (SLA)',
                            sublabel: 'Onay süresi, gecikme, yönetici performansı',
                            icon: UserCheck,
                            gradient: 'from-violet-500 to-fuchsia-600',
                        },
                    ].map((s) => {
                        const isActive = topSection === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setTopSection(s.key)}
                                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    isActive
                                        ? `bg-gradient-to-r ${s.gradient} text-white shadow-md`
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    <s.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-black ${isActive ? '' : 'text-slate-700'}`}>
                                        {s.label}
                                    </div>
                                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                        {s.sublabel}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Yönetici Onayları (SLA) içeriği */}
            {topSection === 'manager' && (
                <SLATab showScopeBanner={false} />
            )}

            {/* Çalışan Talepleri içeriği */}
            {topSection === 'employee' && (
            <>
            {/* Mode toggle (kişisel/ekip) */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 w-fit shadow-sm">
                {[{ key: 'personal', label: 'Kişisel Taleplerim', icon: FileText }, { key: 'team', label: 'Ekip Talepleri', icon: Users }].map(m => (
                    <button key={m.key} onClick={() => setMode(m.key)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === m.key ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <m.icon size={15} /> {m.label}
                    </button>
                ))}
            </div>

            {/* Filter chips (sadece team mode) */}
            {mode === 'team' && hasFilter && (
                <div className="flex items-center gap-2 flex-wrap bg-blue-50/40 border border-blue-200/60 rounded-xl px-4 py-3">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-[0.15em]">
                        Aktif Filtreler:
                    </span>
                    {selectedStatus && (
                        <FilterChip
                            label={`Durum: ${({ PENDING: 'Bekleyen', APPROVED: 'Onaylı', REJECTED: 'Reddedildi', CANCELLED: 'İptal' })[selectedStatus]}`}
                            color={selectedStatus === 'PENDING' ? 'amber' : (selectedStatus === 'APPROVED' ? 'emerald' : (selectedStatus === 'REJECTED' ? 'blue' : 'slate'))}
                            onRemove={() => setSelectedStatus(null)}
                        />
                    )}
                    {selectedType && (
                        <FilterChip
                            label={`Tip: ${TYPE_LABELS[selectedType] || selectedType}`}
                            color={selectedType === 'leave' ? 'blue' : (selectedType === 'overtime' ? 'amber' : (selectedType === 'cardless' ? 'violet' : 'emerald'))}
                            onRemove={() => setSelectedType(null)}
                        />
                    )}
                    {selectedMonth && (
                        <FilterChip
                            label={`Ay: ${selectedMonth}`}
                            color="slate"
                            onRemove={() => setSelectedMonth(null)}
                        />
                    )}
                    <button
                        onClick={clearAllFilters}
                        className="ml-auto text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                    >
                        <CloseIcon size={11} /> Tümünü Temizle
                    </button>
                </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Toplam Talep" value={totalRequests} icon={FileText} gradient="slate" />
                <KPICard title="Onay Oranı" value={`${approvalRate}`} suffix="%" icon={CheckCircle2} gradient="emerald"
                    info={METRIC_EXPLANATIONS.approval_rate} />
                <KPICard title="Bekleyen" value={pendingCount} icon={Hourglass} gradient="amber"
                    onClick={mode === 'team' ? () => setSelectedStatus('PENDING') : undefined} />
                <KPICard title="Reddedilen" value={data?.rejected_count || 0} icon={XCircle} gradient="red" />
                <KPICard title={avgDecisionHours != null ? 'Ort. Karar Süresi' : 'Fazla Mesai Saati'}
                    value={avgDecisionHours != null ? avgDecisionHours : (data?.total_overtime_hours || 0)}
                    suffix={avgDecisionHours != null ? 'saat' : 'saat'}
                    icon={Clock} gradient="blue"
                    info={avgDecisionHours != null ? METRIC_EXPLANATIONS.decision_time : METRIC_EXPLANATIONS.overtime} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Type distribution */}
                <SectionCard title="Talep Türü Dağılımı" icon={PieChartIcon} iconGradient="from-indigo-500 to-indigo-600"
                    collapsible={false}
                    subtitle={mode === 'team' ? 'Tıkla → tip filtresi' : null}
                >
                    {typeDistData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeDistData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}
                                            onClick={mode === 'team' ? handleTypePieClick : undefined}
                                            cursor={mode === 'team' ? 'pointer' : 'default'}
                                        >
                                            {typeDistData.map((e, i) => {
                                                const isSelected = mode === 'team' && selectedType
                                                    && (e.key === selectedType || TYPE_LABEL_TO_CODE[e.name] === selectedType);
                                                const isFaded = mode === 'team' && selectedType && !isSelected;
                                                return (
                                                    <Cell
                                                        key={i}
                                                        fill={e.color}
                                                        opacity={isFaded ? 0.35 : 1}
                                                        stroke={isSelected ? '#0f172a' : '#fff'}
                                                        strokeWidth={isSelected ? 3 : 2}
                                                    />
                                                );
                                            })}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {typeDistData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="Tür dağılımı yok" />}
                </SectionCard>

                {/* Status distribution */}
                <SectionCard title="Durum Dağılımı" icon={CheckCircle2} iconGradient="from-emerald-500 to-emerald-600"
                    collapsible={false}
                    subtitle={mode === 'team' ? 'Tıkla → durum filtresi' : null}
                >
                    {statusDistData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusDistData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}
                                            onClick={mode === 'team' ? handleStatusPieClick : undefined}
                                            cursor={mode === 'team' ? 'pointer' : 'default'}
                                        >
                                            {statusDistData.map((e, i) => {
                                                const code = STATUS_LABEL_TO_CODE[e.name];
                                                const isSelected = mode === 'team' && selectedStatus && code === selectedStatus;
                                                const isFaded = mode === 'team' && selectedStatus && !isSelected;
                                                return (
                                                    <Cell
                                                        key={i}
                                                        fill={e.color}
                                                        opacity={isFaded ? 0.35 : 1}
                                                        stroke={isSelected ? '#0f172a' : '#fff'}
                                                        strokeWidth={isSelected ? 3 : 2}
                                                    />
                                                );
                                            })}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {statusDistData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="Durum dağılımı yok" />}
                </SectionCard>

                {/* Leave type breakdown */}
                <SectionCard title="İzin Türü Kırılımı" icon={Calendar} iconGradient="from-blue-500 to-blue-600" collapsible={false}>
                    {leaveTypeData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={leaveTypeData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                                            {leaveTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {leaveTypeData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="İzin türü kırılımı yok" />}
                </SectionCard>
            </div>

            {/* Bekleyen Talepler Tablosu (lazy-loaded, sadece team mode + filter aktif) */}
            {showPendingTable && (
                <SectionCard
                    title="Bekleyen Talepler"
                    icon={Hourglass}
                    iconGradient="from-amber-500 to-orange-600"
                    subtitle="Filtreye göre canlı liste — satıra tıkla detay panelini aç"
                    collapsible={false}
                >
                    <Suspense fallback={<div className="text-center py-10 text-slate-400">Tablo yükleniyor…</div>}>
                        <PendingRequestsTable
                            typeFilter={selectedType || ''}
                            statusFilter={effectiveStatus}
                            monthFilter={selectedMonth}
                            onRowClick={handleRowClick}
                        />
                    </Suspense>
                </SectionCard>
            )}

            {/* Monthly trend (bar tıklanabilir, sadece team mode) */}
            <SectionCard title="Aylık Talep Trendi" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600"
                subtitle={mode === 'team' ? 'Bar tıkla → o ayın taleplerini listele' : 'Talep türleri bazında aylık dağılım'}
            >
                {trendData.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData} barGap={2}
                                onClick={mode === 'team' ? (e) => {
                                    if (e?.activePayload?.[0]?.payload) {
                                        handleTrendBarClick(e.activePayload[0].payload);
                                    }
                                } : undefined}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Bar dataKey="izin" name="İzin" fill={TYPE_COLORS.leave} radius={[3, 3, 0, 0]} stackId="a"
                                    cursor={mode === 'team' ? 'pointer' : 'default'} />
                                <Bar dataKey="ek_mesai" name="Fazla Mesai" fill={TYPE_COLORS.overtime} radius={[3, 3, 0, 0]} stackId="a"
                                    cursor={mode === 'team' ? 'pointer' : 'default'} />
                                <Bar dataKey="yemek" name="Yemek" fill={TYPE_COLORS.meal} radius={[3, 3, 0, 0]} stackId="a"
                                    cursor={mode === 'team' ? 'pointer' : 'default'} />
                                <Bar dataKey="kartsız" name="Kartsız" fill={TYPE_COLORS.cardless} radius={[3, 3, 0, 0]} stackId="a"
                                    cursor={mode === 'team' ? 'pointer' : 'default'} />
                                <Line type="monotone" dataKey="toplam" name="Toplam" stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Trend verisi yok" />}
            </SectionCard>

            {/* Approval process insight */}
            {avgDecisionHours != null && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ort. Karar Süresi</p>
                            <p className="text-2xl font-black text-slate-800">{avgDecisionHours}<span className="text-sm text-slate-400 ml-1">saat</span></p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onay Oranı</p>
                            <p className="text-2xl font-black text-emerald-600">{approvalRate}%</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white">
                            <Hourglass size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bekleyen Talep</p>
                            <p className="text-2xl font-black text-amber-600">{pendingCount}<span className="text-sm text-slate-400 ml-1">adet</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee breakdown (team mode) */}
            {mode === 'team' && employeeBreakdown.length > 0 && (
                <SectionCard title="Çalışan Bazlı Talep Dağılımı" icon={Users} iconGradient="from-blue-500 to-blue-600"
                    subtitle="En çok talep oluşturan çalışanlar">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">#</th>
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Çalışan</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Toplam</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">İzin</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Fazla Mesai</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Onaylı</th>
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold w-32">Oran</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeBreakdown.map((emp, i) => {
                                    const total = emp.total || 1;
                                    const approvedPct = Math.round((emp.approved || 0) / total * 100);
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2.5 px-4 text-slate-300 font-bold">{i + 1}</td>
                                            <td className="py-2.5 px-4 font-bold text-slate-700">{emp.name || emp.employee_name}</td>
                                            <td className="py-2.5 px-4 text-center font-black text-slate-800">{emp.total || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-blue-600 font-bold">{emp.leave || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-amber-600 font-bold">{emp.overtime || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-emerald-600 font-bold">{emp.approved || 0}</td>
                                            <td className="py-2.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${approvedPct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold tabular-nums w-8 text-right">{approvedPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {/* Detail Drawer */}
            <RequestDetailDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                request={drawerRequest}
            />
            </>
            )}
        </div>
    );
}
