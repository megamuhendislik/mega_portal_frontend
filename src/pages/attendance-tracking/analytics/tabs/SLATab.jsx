import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Empty, Progress, Tooltip, Collapse } from 'antd';
import { Clock, AlertTriangle, CheckCircle2, Target, Users, TrendingUp, Hourglass, BarChart3 } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import ChartTooltip from '../shared/ChartTooltip';
import ScopeBanner from '../shared/ScopeBanner';
import GaugeCluster from '../shared/GaugeCluster';
import ManagerDecisionDetailModal from '../shared/ManagerDecisionDetailModal';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const SLA_BUCKET_COLORS = {
    '<24h': '#10b981',
    '24-48h': '#6366f1',
    '48-72h': '#f59e0b',
    '72h-1w': '#f97316',
    '>1w': '#ef4444',
};

const STATUS_COLORS = {
    on_target: { color: 'green', bg: '#10b981', label: 'Hedefte' },
    warning: { color: 'gold', bg: '#f59e0b', label: 'Uyarı' },
    late: { color: 'orange', bg: '#f97316', label: 'Geciken' },
    critical: { color: 'red', bg: '#ef4444', label: 'Kritik' },
    pending: { color: 'default', bg: '#94a3b8', label: 'Bekliyor' },
};

const TYPE_COLORS = {
    leave: '#3B82F6',
    overtime: '#F59E0B',
    cardless: '#8B5CF6',
};
const TYPE_LABELS = {
    leave: 'İzin',
    overtime: 'Fazla Mesai',
    cardless: 'Kartsız Giriş',
};

/**
 * SLATab — Talep onay süresi dashboard'u.
 *
 * Backend: GET /api/attendance-analytics/sla/
 *
 * Özellikler:
 *  - KPI kartları: total, pending, avg/median/p95 hours, on-target rate
 *  - Tip bazlı karşılaştırma pie + tablosu
 *  - Yönetici performans rankingi
 *  - Geciken talepler listesi (en eski 20)
 */
export default function SLATab() {
    const { queryParams, startDate, endDate } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [managerModal, setManagerModal] = useState({ open: false, id: null, name: null });

    useEffect(() => {
        if (!queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get('/attendance-analytics/sla/', { params: queryParams, timeout: 30000 })
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err?.response?.data?.error || err?.message || 'SLA yüklenemedi');
                    setData(null);
                }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [queryParams]);

    const summary = data?.summary || {};
    const targets = data?.targets || {};

    // Type bar data
    const typeBarData = useMemo(() => {
        if (!data?.by_type) return [];
        return Object.entries(data.by_type).map(([key, val]) => ({
            name: TYPE_LABELS[key] || key,
            toplam: val.total || 0,
            bekleyen: val.pending || 0,
            onaylı: (val.total || 0) - (val.pending || 0),
            ortSaat: val.avg_hours || 0,
            hedefteYüzde: val.on_target_pct || 0,
            color: TYPE_COLORS[key] || '#94a3b8',
        }));
    }, [data]);

    // SLA bucket histogram data — backend's by_bucket veya summary'den hesapla
    const slaBucketData = useMemo(() => {
        const buckets = data?.summary?.by_bucket || data?.by_bucket || {};
        return ['<24h', '24-48h', '48-72h', '72h-1w', '>1w'].map((b) => ({
            name: b,
            count: buckets[b] || 0,
            color: SLA_BUCKET_COLORS[b],
        }));
    }, [data]);
    const hasBucketData = slaBucketData.some((b) => b.count > 0);

    const managerColumns = [
        {
            title: 'Sıra',
            dataIndex: 'rank',
            width: 60,
            render: (v) => (
                <span className={`font-bold ${v === 1 ? 'text-amber-600 text-lg' : v <= 3 ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {v === 1 ? '🥇' : v === 2 ? '🥈' : v === 3 ? '🥉' : `#${v}`}
                </span>
            ),
        },
        {
            title: 'Yönetici',
            dataIndex: 'manager_name',
            render: (v) => <span className="font-semibold text-slate-700">{v}</span>,
        },
        {
            title: 'Karar Sayısı',
            dataIndex: 'total_decided',
            align: 'right',
            sorter: (a, b) => a.total_decided - b.total_decided,
            render: (v) => <span className="tabular-nums font-medium">{v}</span>,
        },
        {
            title: 'Ort. Süre (saat)',
            dataIndex: 'avg_hours',
            align: 'right',
            sorter: (a, b) => a.avg_hours - b.avg_hours,
            render: (v) => {
                const cls = v <= targets.target_hours ? 'text-emerald-600' :
                    v <= targets.warning_hours ? 'text-amber-600' :
                    'text-red-600';
                return <span className={`tabular-nums font-bold ${cls}`}>{v}</span>;
            },
        },
        {
            title: 'Hedefte (%)',
            dataIndex: 'on_target_pct',
            align: 'right',
            sorter: (a, b) => a.on_target_pct - b.on_target_pct,
            render: (v) => (
                <div className="flex items-center gap-2 justify-end">
                    <Progress percent={v} size="small" style={{ width: 80 }}
                        strokeColor={v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444'} />
                    <span className="tabular-nums font-bold w-12 text-right">%{v}</span>
                </div>
            ),
        },
    ];

    const overdueColumns = [
        {
            title: 'Tip',
            dataIndex: 'type_label',
            render: (v, row) => (
                <Tag color={TYPE_COLORS[row.type] ? undefined : 'default'} style={{ backgroundColor: TYPE_COLORS[row.type], color: 'white', border: 'none' }}>
                    {v}
                </Tag>
            ),
        },
        { title: 'Çalışan', dataIndex: 'employee_name' },
        { title: 'Departman', dataIndex: 'department' },
        {
            title: 'Bekleme (saat)',
            dataIndex: 'age_hours',
            align: 'right',
            sorter: (a, b) => a.age_hours - b.age_hours,
            defaultSortOrder: 'descend',
            render: (v, row) => {
                const cfg = STATUS_COLORS[row.sla_status] || STATUS_COLORS.critical;
                return (
                    <div className="flex items-center gap-2 justify-end">
                        <Tag color={cfg.color}>{cfg.label}</Tag>
                        <span className="tabular-nums font-bold">{v}</span>
                    </div>
                );
            },
        },
        { title: 'Onaylayacak Yönetici', dataIndex: 'target_approver_name', render: (v) => v || '—' },
    ];

    if (loading) return <LoadingSkeleton rows={4} />;
    if (error) return <EmptyState message={`SLA verisi yüklenemedi: ${error}`} />;
    if (!data) return <EmptyState message="SLA verisi yok" />;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Toplam Talep" value={summary.total_requests || 0} icon={Users} gradient="indigo" />
                <KPICard title="Bekleyen" value={summary.total_pending || 0} icon={Hourglass} gradient="amber"
                    subtitle={summary.overdue_count ? `${summary.overdue_count} gecikmiş` : 'Gecikme yok'} />
                <KPICard title="Ort. Karar" value={summary.avg_decision_hours || 0} suffix="sa" icon={Clock}
                    gradient={(summary.avg_decision_hours || 0) <= (targets.target_hours || 48) ? 'emerald' : 'red'}
                    subtitle={`Medyan: ${summary.median_decision_hours || 0}sa · p95: ${summary.p95_decision_hours || 0}sa`} />
                <KPICard title="Hedefte" value={summary.on_target_rate_pct || 0} suffix="%" icon={Target}
                    gradient={(summary.on_target_rate_pct || 0) >= 75 ? 'emerald' : 'amber'}
                    subtitle={`${summary.on_target_count || 0} / ${summary.total_decided || 0} karar`} />
                <KPICard title="Hedef Süre" value={targets.target_hours || 48} suffix="sa" icon={CheckCircle2} gradient="slate"
                    subtitle={`Uyarı: ${targets.warning_hours || 72}sa · Kritik: ${targets.critical_hours || 168}sa`} />
            </div>

            {/* SLA Gauge Cluster — yenilikçi gauge meters */}
            <GaugeCluster
                title="SLA Performans Göstergeleri"
                subtitle={`Hedef: ${targets.target_hours || 48}sa · Uyarı: ${targets.warning_hours || 72}sa`}
                columns={4}
                gauges={[
                    {
                        key: 'avg',
                        label: 'Ortalama Karar',
                        value: summary.avg_decision_hours || 0,
                        max: Math.max(targets.critical_hours || 168, summary.avg_decision_hours || 0),
                        target: targets.target_hours || 48,
                        suffix: 'sa',
                        color: (summary.avg_decision_hours || 0) <= (targets.target_hours || 48) ? '#10b981'
                            : (summary.avg_decision_hours || 0) <= (targets.warning_hours || 72) ? '#f59e0b' : '#ef4444',
                        subtitle: `Hedef: ${targets.target_hours || 48}sa`,
                        icon: Clock,
                    },
                    {
                        key: 'median',
                        label: 'Medyan',
                        value: summary.median_decision_hours || 0,
                        max: Math.max(targets.critical_hours || 168, summary.median_decision_hours || 0),
                        target: targets.target_hours || 48,
                        suffix: 'sa',
                        color: '#6366f1',
                        subtitle: 'Yarı taleplerin altında',
                    },
                    {
                        key: 'p95',
                        label: 'P95 Süre',
                        value: summary.p95_decision_hours || 0,
                        max: Math.max(targets.critical_hours || 168, summary.p95_decision_hours || 0),
                        target: targets.warning_hours || 72,
                        suffix: 'sa',
                        color: (summary.p95_decision_hours || 0) <= (targets.warning_hours || 72) ? '#10b981' : '#ef4444',
                        subtitle: '%95 talep bu sürede',
                    },
                    {
                        key: 'on_target',
                        label: 'Hedef Tutturma',
                        value: summary.on_target_rate_pct || 0,
                        max: 100,
                        target: 75,
                        suffix: '%',
                        color: (summary.on_target_rate_pct || 0) >= 75 ? '#10b981' : '#f59e0b',
                        subtitle: `${summary.on_target_count || 0}/${summary.total_decided || 0} karar`,
                        icon: Target,
                    },
                ]}
            />

            {/* Type comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard title="Talep Tipi Bazlı Dağılım" icon={TrendingUp} iconGradient="from-indigo-500 to-indigo-600" collapsible={false}>
                    {typeBarData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typeBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RTooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                    <Bar dataKey="onaylı" name="Kararlı" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="bekleyen" name="Bekleyen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Tip bazlı veri yok" />}
                </SectionCard>

                <SectionCard title="Tip Bazlı Ortalama Süre" icon={Clock} iconGradient="from-amber-500 to-orange-600" collapsible={false}>
                    <div className="space-y-3">
                        {typeBarData.map((t) => (
                            <div key={t.name} className="flex items-center gap-3">
                                <span className="w-24 text-sm font-semibold text-slate-700">{t.name}</span>
                                <Progress
                                    percent={Math.min((t.ortSaat / (targets.critical_hours || 168)) * 100, 100)}
                                    strokeColor={t.ortSaat <= (targets.target_hours || 48) ? '#10b981'
                                        : t.ortSaat <= (targets.warning_hours || 72) ? '#f59e0b' : '#ef4444'}
                                    showInfo={false}
                                    size="small"
                                    className="flex-1"
                                />
                                <span className="w-20 text-right text-sm font-bold tabular-nums">{t.ortSaat}sa</span>
                                <Tag color={t.hedefteYüzde >= 75 ? 'green' : t.hedefteYüzde >= 50 ? 'gold' : 'red'}>
                                    %{t.hedefteYüzde} hedefte
                                </Tag>
                            </div>
                        ))}
                        {typeBarData.length === 0 && <EmptyState message="Veri yok" />}
                    </div>
                </SectionCard>
            </div>

            {/* SLA Bucket Histogram */}
            {hasBucketData && (
                <SectionCard title="SLA Süre Dağılımı" icon={BarChart3} iconGradient="from-blue-500 to-indigo-600"
                    subtitle="Karar süresinin bant dağılımı — kaç karar hangi pencerede sonuçlandı">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={slaBucketData} barSize={48}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                <RTooltip content={<ChartTooltip unit=" karar" />} />
                                <Bar dataKey="count" name="Karar Sayısı" radius={[6, 6, 0, 0]}>
                                    {slaBucketData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            )}

            {/* Manager performance — rows are clickable for drill-down */}
            <SectionCard title="Yönetici Onay Performansı" icon={Users} iconGradient="from-violet-500 to-purple-600"
                subtitle={`${(data.by_manager || []).length} yönetici — ort. süre ve hedefte oranı (satıra tıkla → detay)`}>
                {(data.by_manager || []).length > 0 ? (
                    <Table
                        columns={managerColumns}
                        dataSource={data.by_manager}
                        rowKey="manager_id"
                        size="small"
                        pagination={data.by_manager.length > 10 ? { pageSize: 10 } : false}
                        onRow={(row) => ({
                            onClick: () => setManagerModal({ open: true, id: row.manager_id, name: row.manager_name }),
                            style: { cursor: 'pointer' },
                        })}
                    />
                ) : <EmptyState message="Henüz onay kararı yok" />}
            </SectionCard>

            {/* Overdue requests */}
            <SectionCard
                title="Geciken Talepler"
                icon={AlertTriangle}
                iconGradient={(summary.overdue_count || 0) > 0 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'}
                subtitle={`${data.overdue_requests?.length || 0} talep ${targets.warning_hours || 72} saatten fazla bekliyor`}
            >
                {(data.overdue_requests || []).length > 0 ? (
                    <Table
                        columns={overdueColumns}
                        dataSource={data.overdue_requests}
                        rowKey="id"
                        size="small"
                        pagination={data.overdue_requests.length > 15 ? { pageSize: 15 } : false}
                    />
                ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                        Gecikmiş talep yok. Tüm bekleyen talepler hedef süre içinde.
                    </div>
                )}
            </SectionCard>

            {/* Manager decision detail modal — bir yöneticinin tüm kararları */}
            <ManagerDecisionDetailModal
                open={managerModal.open}
                onClose={() => setManagerModal({ open: false, id: null, name: null })}
                managerId={managerModal.id}
                managerName={managerModal.name}
            />
        </div>
    );
}
