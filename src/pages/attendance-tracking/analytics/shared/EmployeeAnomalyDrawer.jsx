import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Tag, Segmented, Empty } from 'antd';
import {
    AlertTriangle, TrendingUp, TrendingDown, CheckCircle2,
    Activity, BarChart3, X as CloseIcon, User, Building2,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * EmployeeAnomalyDrawer — Bir çalışanın tüm metrik anomalilerinin detayı
 * + Son 6 ay aylık trend + Ekip ortalaması karşılaştırması.
 *
 * Backend: GET /api/attendance-analytics/anomalies/employee-detail/?employee_id=N
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - employeeId: number | null
 *  - employeeName?: string  (drawer açılırken hızlı placeholder)
 */

const SEVERITY_CFG = {
    critical: { tag: 'red', label: 'Kritik', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    high: { tag: 'orange', label: 'Yüksek', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    medium: { tag: 'gold', label: 'Orta', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    low: { tag: 'default', label: 'Düşük', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const METRIC_CFG = {
    overtime_hours: { label: 'Fazla Mesai', unit: 'sa', color: '#f59e0b', icon: TrendingUp },
    worked_hours: { label: 'Çalışma', unit: 'sa', color: '#6366f1', icon: Activity },
    absence_days: { label: 'Devamsızlık', unit: 'gün', color: '#ef4444', icon: AlertTriangle },
    meal_count: { label: 'Yemek', unit: '', color: '#10b981', icon: BarChart3 },
};

const METRIC_KEYS = ['overtime_hours', 'worked_hours', 'absence_days', 'meal_count'];

function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function EmployeeAnomalyDrawer({ open, onClose, employeeId, employeeName }) {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [trendMetric, setTrendMetric] = useState('overtime_hours');

    useEffect(() => {
        if (!open || !employeeId) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
            setData(null);
        });
        api.get('/attendance-analytics/anomalies/employee-detail/', {
            params: { ...queryParams, employee_id: employeeId },
        })
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err?.message || 'Veri alınamadı');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, employeeId, queryParams]);

    const employee = data?.employee || {};
    const currentAnomalies = useMemo(() => data?.current_anomalies || [], [data]);
    const timeline = useMemo(() => data?.six_month_timeline || [], [data]);

    // Anomaly map keyed by metric for quick lookup
    const anomalyByMetric = useMemo(() => {
        const map = {};
        currentAnomalies.forEach((a) => { map[a.metric] = a; });
        return map;
    }, [currentAnomalies]);

    // Comparison bars: current vs team average for each metric
    const comparisonData = useMemo(() => {
        if (!timeline.length) return [];
        const last = timeline[timeline.length - 1] || {};
        const teamAverages = data?.team_averages || {};
        return METRIC_KEYS.map((key) => {
            const cfg = METRIC_CFG[key];
            return {
                metric: cfg.label,
                metricKey: key,
                kisi: Number(last[key] ?? 0),
                ekip: Number(teamAverages[key] ?? 0),
            };
        });
    }, [timeline, data]);

    const displayName = employee.name || employeeName || '—';
    const displayDept = employee.dept || employee.department || '—';

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={720}
            title={null}
            closeIcon={null}
            destroyOnClose
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 60%)' },
            }}
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md flex-shrink-0">
                            <span className="text-base font-bold">{initials(displayName)}</span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <div className="p-1 rounded-md bg-amber-100/80">
                                    <AlertTriangle size={11} className="text-amber-700" />
                                </div>
                                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-[0.2em]">
                                    Anomali Detayı
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 truncate">{displayName}</h2>
                            <p className="text-[12px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                                <Building2 size={11} className="text-slate-400" />
                                {displayDept}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex-shrink-0"
                        aria-label="Kapat"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
                {loading && (
                    <div className="text-center py-12 text-slate-500 text-sm">Yükleniyor...</div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                        Hata: {error}
                    </div>
                )}
                {!loading && !error && data && (
                    <>
                        {/* Current Anomalies — 4 metric grid */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">
                                Mevcut Anomaliler
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {METRIC_KEYS.map((key) => {
                                    const mc = METRIC_CFG[key];
                                    const a = anomalyByMetric[key];
                                    const Icon = mc.icon;
                                    if (a) {
                                        const sev = SEVERITY_CFG[a.severity] || SEVERITY_CFG.low;
                                        const TrendIcon = a.direction === 'above' ? TrendingUp : TrendingDown;
                                        return (
                                            <div
                                                key={key}
                                                className={`rounded-xl border ${sev.border} ${sev.bg} p-3`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Icon size={14} style={{ color: mc.color }} />
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                            {a.metric_label || mc.label}
                                                        </span>
                                                    </div>
                                                    <Tag color={sev.tag} className="text-[9px] !m-0">
                                                        {sev.label}
                                                    </Tag>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-xl font-black text-slate-900 tabular-nums">
                                                        {typeof a.value === 'number' ? a.value.toFixed(1) : a.value}
                                                    </span>
                                                    {mc.unit && (
                                                        <span className="text-[10px] text-slate-400 font-normal">{mc.unit}</span>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${sev.text}`}>
                                                    <TrendIcon size={10} />
                                                    <span className="tabular-nums">
                                                        {Math.abs(a.z_score).toFixed(2)}σ {a.direction === 'above' ? 'yüksek' : 'düşük'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Icon size={14} style={{ color: mc.color }} />
                                                    <span className="text-[11px] font-bold text-slate-700">
                                                        {mc.label}
                                                    </span>
                                                </div>
                                                <Tag color="green" className="text-[9px] !m-0 flex items-center gap-0.5">
                                                    <CheckCircle2 size={9} /> Normal
                                                </Tag>
                                            </div>
                                            <div className="text-[10px] text-emerald-700 font-medium">
                                                Anomali yok
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 6-Month Timeline — line chart with metric toggle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                    Son 6 Ay Trendi
                                </span>
                                <Segmented
                                    value={trendMetric}
                                    onChange={setTrendMetric}
                                    size="small"
                                    options={METRIC_KEYS.map((k) => ({
                                        value: k,
                                        label: <span className="text-[11px] px-1">{METRIC_CFG[k].label}</span>,
                                    }))}
                                />
                            </div>
                            {timeline.length === 0 ? (
                                <div className="py-10">
                                    <Empty description="Trend verisi yok" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart
                                        data={timeline}
                                        margin={{ top: 10, right: 10, bottom: 5, left: -10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />
                                        <RTooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            }}
                                            formatter={(value) => [
                                                `${Number(value).toFixed(1)}${METRIC_CFG[trendMetric].unit ? ' ' + METRIC_CFG[trendMetric].unit : ''}`,
                                                METRIC_CFG[trendMetric].label,
                                            ]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey={trendMetric}
                                            stroke={METRIC_CFG[trendMetric].color}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: METRIC_CFG[trendMetric].color }}
                                            activeDot={{ r: 6 }}
                                            name={METRIC_CFG[trendMetric].label}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Person vs Team comparison — horizontal bar */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <User size={12} className="text-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                    Bu Kişi vs Ekip Ortalaması
                                </span>
                                <span className="text-[10px] text-slate-400 ml-auto">
                                    Son ay verisi
                                </span>
                            </div>
                            {comparisonData.length === 0 ? (
                                <div className="py-10">
                                    <Empty description="Karşılaştırma verisi yok" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart
                                        data={comparisonData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="metric"
                                            tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={80}
                                        />
                                        <RTooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            }}
                                            formatter={(value) => Number(value).toFixed(1)}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                            iconSize={10}
                                        />
                                        <Bar dataKey="kisi" name="Bu Kişi" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="ekip" name="Ekip Ort." fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Footer note */}
                        <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Z-score = (değer − ekip ortalaması) / standart sapma. |z| eşiğin üzerindeyse anomali sayılır.
                                Trend grafiği son 6 ay aylık aggregate. Ekip ortalaması seçili dönemdeki çalışanlardan hesaplanır.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    );
}
