import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Segmented, Tag, Tooltip, Empty, Select } from 'antd';
import {
    TrendingUp, Clock, AlertTriangle, Users, Building2, GitCompare,
    Search as SearchIcon, X as CloseIcon, Crown,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, ReferenceLine, LineChart, Line, Legend, Cell,
} from 'recharts';
import api from '../../../../../services/api';
import { useAnalytics } from '../../AnalyticsContext';

/**
 * WeeklyLimitPanel — Haftalık ek mesai limiti yakınlığı + dönem yoğunluk analizi.
 *
 * 3 mod:
 *   - 'person'    Kişi bazlı satır listesi (her satır: avg/peak limit % + sparkline)
 *   - 'department' Departman ortalama (her satır: dept aggregate)
 *   - 'compare'   2-5 kişi/dept seç → side-by-side line chart + metric kartları
 */

const PCT_COLOR = (pct) => {
    if (pct == null) return '#94a3b8';
    if (pct >= 100) return '#dc2626';
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    if (pct >= 40) return '#6366f1';
    return '#10b981';
};

const COMPARE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function formatWeekLabel(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
}

function ProgressBar({ pct, hours, limit, label, height = 8 }) {
    const safePct = pct == null ? 0 : Math.min(pct, 130);
    const display = pct == null ? '—' : `%${pct.toFixed(0)}`;
    const color = PCT_COLOR(pct);
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">{label}</span>
                <span className="font-bold tabular-nums" style={{ color }}>
                    {display} <span className="text-slate-400 font-normal">· {hours}sa / {limit}sa</span>
                </span>
            </div>
            <div className="relative w-full bg-slate-100 rounded-full overflow-hidden" style={{ height }}>
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${Math.min(safePct, 100)}%`, backgroundColor: color }}
                />
                {pct != null && pct > 100 && (
                    <div
                        className="absolute inset-y-0 rounded-full bg-red-700 opacity-70"
                        style={{ left: '100%', width: `${Math.min(pct - 100, 30)}%` }}
                    />
                )}
            </div>
        </div>
    );
}

function Sparkline({ weeks, limit, peakValue, color = '#6366f1', height = 40 }) {
    const data = (weeks || []).map((w) => ({ x: formatWeekLabel(w.week_start), y: w.ot_hours || w.avg_ot_hours || 0 }));
    if (!data.length) return <div className="text-[10px] text-slate-400 italic">veri yok</div>;
    return (
        <div style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    {limit > 0 && (
                        <ReferenceLine
                            y={limit}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            ifOverflow="extendDomain"
                        />
                    )}
                    <RTooltip
                        cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const v = payload[0].value;
                            const pct = limit > 0 ? Math.round((v / limit) * 100) : null;
                            return (
                                <div className="rounded-lg bg-white border border-slate-200 shadow-md px-2 py-1.5 text-[10px]">
                                    <div className="font-bold text-slate-700">Hafta {label}</div>
                                    <div className="tabular-nums" style={{ color: PCT_COLOR(pct) }}>
                                        {v.toFixed(1)} sa{pct != null && ` · %${pct}`}
                                    </div>
                                </div>
                            );
                        }}
                    />
                    <Bar dataKey="y" radius={[2, 2, 0, 0]}>
                        {data.map((d, i) => {
                            const pct = limit > 0 ? (d.y / limit) * 100 : 0;
                            const isPeak = d.y === peakValue && d.y > 0;
                            return <Cell key={i} fill={isPeak ? PCT_COLOR(pct) : `${color}aa`} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function MetricChip({ label, value, suffix, color = 'slate', icon: Icon }) {
    const colorMap = {
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold tabular-nums ${colorMap[color]}`}>
            {Icon && <Icon size={11} />}
            <span className="opacity-70 font-semibold">{label}:</span>
            <span>{value}{suffix && <span className="opacity-70 font-normal ml-0.5">{suffix}</span>}</span>
        </div>
    );
}

function PersonRow({ row, isPeakHighlight }) {
    const stats = row.stats || {};
    const totals = row.totals || {};
    const limit = row.weekly_limit_hours || 0;
    const peakWeek = stats.peak_week_start;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
            <div className="grid grid-cols-12 gap-3 items-start">
                {/* Sol: Kişi adı + dept + pozisyon */}
                <div className="col-span-12 lg:col-span-3">
                    <div className="font-bold text-[13px] text-slate-800 leading-tight">{row.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                        {row.department || '—'}
                        {row.position && row.position !== '—' && <span> · {row.position}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <Tag color="default" className="text-[10px] m-0">
                            Limit: {limit}sa/hafta
                        </Tag>
                        {peakWeek && (
                            <Tag icon={<Crown size={9} className="inline mr-0.5" />} color="orange" className="text-[10px] m-0">
                                Peak: {formatWeekLabel(peakWeek)}
                            </Tag>
                        )}
                    </div>
                </div>

                {/* Orta: Limit progress'leri */}
                <div className="col-span-12 lg:col-span-4 space-y-2">
                    <ProgressBar
                        pct={stats.avg_limit_usage_pct}
                        hours={stats.avg_weekly_ot}
                        limit={limit}
                        label="Ortalama haftalık"
                    />
                    <ProgressBar
                        pct={stats.peak_limit_usage_pct}
                        hours={stats.peak_weekly_ot}
                        limit={limit}
                        label="Peak hafta"
                    />
                </div>

                {/* Sağ: Sparkline */}
                <div className="col-span-12 lg:col-span-5">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Haftalık OT (kırmızı kesik = limit)
                    </div>
                    <Sparkline weeks={row.weeks} limit={limit} peakValue={stats.peak_weekly_ot} />
                </div>
            </div>

            {/* Alt: metric chips */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <MetricChip label="Normal" value={totals.normal_hours} suffix="sa" color="indigo" icon={Clock} />
                <MetricChip label="OT" value={totals.ot_hours} suffix="sa" color="amber" icon={TrendingUp} />
                <MetricChip label="Eksik" value={totals.missing_hours} suffix="sa" color="red" icon={AlertTriangle} />
                <MetricChip label="Çalışılan iş günü" value={totals.worked_weekdays} color="slate" />
                <MetricChip label="Ort. günlük normal" value={stats.avg_daily_normal} suffix="sa" color="emerald" />
                {isPeakHighlight && (
                    <Tag color="red" className="text-[10px] m-0 ml-auto">
                        Limit aşıldı
                    </Tag>
                )}
            </div>
        </div>
    );
}

function DepartmentRow({ row }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
            <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 lg:col-span-3">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-indigo-600" />
                        <div className="font-bold text-[13px] text-slate-800">{row.department}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{row.employee_count} çalışan</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <Tag color="default" className="text-[10px] m-0">
                            Ort. limit: {row.avg_weekly_limit_hours}sa
                        </Tag>
                    </div>
                </div>
                <div className="col-span-12 lg:col-span-4 space-y-2">
                    <ProgressBar
                        pct={row.avg_limit_usage_pct}
                        hours={row.avg_weekly_ot}
                        limit={row.avg_weekly_limit_hours}
                        label="Üye ort. haftalık"
                    />
                    <ProgressBar
                        pct={row.peak_limit_usage_pct}
                        hours={row.peak_individual_ot}
                        limit={row.avg_weekly_limit_hours}
                        label="Üye peak (en yüksek)"
                    />
                </div>
                <div className="col-span-12 lg:col-span-5">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Haftalık üye-ortalaması OT
                    </div>
                    <Sparkline
                        weeks={row.weeks}
                        limit={row.avg_weekly_limit_hours}
                        peakValue={row.peak_avg_week_ot}
                        color="#10b981"
                    />
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <MetricChip label="Ort. Normal" value={row.avg_normal_hours} suffix="sa" color="indigo" icon={Clock} />
                <MetricChip label="Ort. OT" value={row.avg_ot_hours} suffix="sa" color="amber" icon={TrendingUp} />
                <MetricChip label="Ort. Eksik" value={row.avg_missing_hours} suffix="sa" color="red" icon={AlertTriangle} />
                <MetricChip label="Ort. günlük normal" value={row.avg_daily_normal} suffix="sa" color="emerald" />
            </div>
        </div>
    );
}

function CompareView({ data, weeksList }) {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [scope, setScope] = useState('person'); // 'person' | 'department'

    const options = useMemo(() => {
        if (scope === 'department') {
            return (data?.departments || []).map((d) => ({
                value: `dept:${d.department}`,
                label: `${d.department} (${d.employee_count})`,
                row: d,
                weeksKey: 'avg_ot_hours',
                limit: d.avg_weekly_limit_hours,
            }));
        }
        return (data?.employees || []).map((e) => ({
            value: `emp:${e.employee_id}`,
            label: `${e.name} — ${e.department}`,
            row: e,
            weeksKey: 'ot_hours',
            limit: e.weekly_limit_hours,
        }));
    }, [data, scope]);

    const lookup = useMemo(() => {
        const m = {};
        options.forEach((o) => { m[o.value] = o; });
        return m;
    }, [options]);

    const handleScopeChange = (next) => {
        setScope(next);
        setSelectedKeys([]);
    };

    const selected = selectedKeys.slice(0, 5).map((k) => lookup[k]).filter(Boolean);

    // Recharts için chart datası — her hafta bir nokta, seçili her birim ayrı seri
    const chartData = useMemo(() => {
        return (weeksList || []).map((w) => {
            const pt = { week: formatWeekLabel(w.start) };
            selected.forEach((s) => {
                const wk = (s.row.weeks || []).find((x) => x.week_start === w.start);
                pt[s.value] = wk ? (wk[s.weeksKey] || 0) : 0;
            });
            return pt;
        });
    }, [weeksList, selected]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Segmented
                    value={scope}
                    onChange={handleScopeChange}
                    size="small"
                    options={[
                        { value: 'person', label: <span className="flex items-center gap-1 px-1 text-[11px]"><Users size={10} /> Kişi</span> },
                        { value: 'department', label: <span className="flex items-center gap-1 px-1 text-[11px]"><Building2 size={10} /> Departman</span> },
                    ]}
                />
                <Select
                    mode="multiple"
                    placeholder={`Karşılaştırılacak ${scope === 'person' ? 'kişileri' : 'departmanları'} seç (max 5)`}
                    value={selectedKeys}
                    onChange={(v) => setSelectedKeys(v.slice(0, 5))}
                    style={{ flex: 1, minWidth: 280 }}
                    options={options}
                    showSearch
                    optionFilterProp="label"
                    maxTagCount={5}
                    suffixIcon={<SearchIcon size={13} />}
                    allowClear
                />
                {selectedKeys.length > 0 && (
                    <button
                        onClick={() => setSelectedKeys([])}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                        <CloseIcon size={11} /> Temizle
                    </button>
                )}
            </div>

            {selected.length === 0 ? (
                <Empty
                    description={`Karşılaştırmak için yukarıdan ${scope === 'person' ? 'kişi' : 'departman'} seç (2-5 önerilir)`}
                />
            ) : (
                <>
                    {/* Line chart: haftalık OT karşılaştırması */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h4 className="text-[12px] font-bold text-slate-800">Haftalık OT Karşılaştırması</h4>
                                <p className="text-[10px] text-slate-500">Her seri bir {scope === 'person' ? 'kişiyi' : 'departmanı'} temsil eder</p>
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} unit="sa" />
                                    <RTooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <div className="rounded-lg bg-white border border-slate-200 shadow-md px-3 py-2 text-[11px]">
                                                    <div className="font-bold text-slate-700 mb-1">Hafta {label}</div>
                                                    {payload.map((p) => {
                                                        const opt = lookup[p.dataKey];
                                                        const lim = opt?.limit;
                                                        const pct = lim > 0 ? Math.round((p.value / lim) * 100) : null;
                                                        return (
                                                            <div key={p.dataKey} className="flex items-center justify-between gap-3">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                                    {opt?.label}
                                                                </span>
                                                                <span className="font-bold tabular-nums" style={{ color: PCT_COLOR(pct) }}>
                                                                    {p.value?.toFixed(1)}sa{pct != null && ` (%${pct})`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    {selected.length > 0 && selected[0].limit > 0 && (
                                        <ReferenceLine
                                            y={selected[0].limit}
                                            stroke="#ef4444"
                                            strokeDasharray="5 3"
                                            label={{ value: `Limit ${selected[0].limit}sa`, position: 'right', fontSize: 10, fill: '#ef4444' }}
                                        />
                                    )}
                                    {selected.map((s, i) => (
                                        <Line
                                            key={s.value}
                                            type="monotone"
                                            dataKey={s.value}
                                            name={s.label}
                                            stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Side-by-side metric kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selected.map((s, i) => {
                            const r = s.row;
                            const isDept = scope === 'department';
                            const stats = isDept ? r : (r.stats || {});
                            const totals = isDept ? r : (r.totals || {});
                            const accent = COMPARE_COLORS[i % COMPARE_COLORS.length];
                            return (
                                <div
                                    key={s.value}
                                    className="rounded-xl border-2 bg-white p-3"
                                    style={{ borderColor: `${accent}55` }}
                                >
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                                        <div className="font-bold text-[12px] text-slate-800 truncate">{s.label}</div>
                                    </div>
                                    <div className="space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Ort. haftalık OT</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.avg_weekly_ot : stats.avg_weekly_ot)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Peak haftalık OT</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.peak_avg_week_ot : stats.peak_weekly_ot)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Limit kullanım %</span>
                                            <span className="font-bold tabular-nums" style={{ color: PCT_COLOR(stats.avg_limit_usage_pct) }}>
                                                {stats.avg_limit_usage_pct ?? '—'}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Toplam normal</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.avg_normal_hours : totals.normal_hours)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Toplam OT</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.avg_ot_hours : totals.ot_hours)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Toplam eksik</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.avg_missing_hours : totals.missing_hours)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Ort. günlük normal</span>
                                            <span className="font-bold tabular-nums">
                                                {(isDept ? r.avg_daily_normal : stats.avg_daily_normal)?.toFixed(1)}sa
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function WeeklyLimitPanel() {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('person');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('avg_pct_desc');

    const fetchData = useCallback(async () => {
        if (!queryParams?.start_date) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/weekly-limit/', { params: queryParams, timeout: 30000 });
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Veri alınamadı');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredEmployees = useMemo(() => {
        let list = data?.employees || [];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((e) => e.name?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
        }
        const cmp = (a, b) => {
            switch (sortBy) {
                case 'avg_pct_desc': return (b.stats?.avg_limit_usage_pct || 0) - (a.stats?.avg_limit_usage_pct || 0);
                case 'peak_pct_desc': return (b.stats?.peak_limit_usage_pct || 0) - (a.stats?.peak_limit_usage_pct || 0);
                case 'avg_ot_desc': return (b.stats?.avg_weekly_ot || 0) - (a.stats?.avg_weekly_ot || 0);
                case 'missing_desc': return (b.totals?.missing_hours || 0) - (a.totals?.missing_hours || 0);
                case 'name': return String(a.name).localeCompare(String(b.name), 'tr');
                default: return 0;
            }
        };
        return [...list].sort(cmp);
    }, [data, search, sortBy]);

    const filteredDepts = useMemo(() => {
        let list = data?.departments || [];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((d) => d.department?.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) => (b.avg_limit_usage_pct || 0) - (a.avg_limit_usage_pct || 0));
    }, [data, search]);

    if (loading && !data) {
        return <div className="text-center text-[12px] text-slate-500 py-6">Yükleniyor...</div>;
    }
    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
                {error}
            </div>
        );
    }
    if (!data || !data.employees?.length) {
        return <Empty description="Bu dönem için veri bulunamadı" />;
    }

    return (
        <div className="space-y-4">
            {/* Mode toggle + filtreler */}
            <div className="flex items-center gap-3 flex-wrap">
                <Segmented
                    value={mode}
                    onChange={setMode}
                    size="middle"
                    options={[
                        { value: 'person', label: <span className="flex items-center gap-1.5 px-1 font-bold"><Users size={12} /> Kişi Bazlı</span> },
                        { value: 'department', label: <span className="flex items-center gap-1.5 px-1 font-bold"><Building2 size={12} /> Departman Ortalaması</span> },
                        { value: 'compare', label: <span className="flex items-center gap-1.5 px-1 font-bold"><GitCompare size={12} /> Karşılaştır</span> },
                    ]}
                />
                {mode !== 'compare' && (
                    <>
                        <div className="relative">
                            <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`${mode === 'person' ? 'Kişi/dept' : 'Departman'} ara...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                        {mode === 'person' && (
                            <Segmented
                                size="small"
                                value={sortBy}
                                onChange={setSortBy}
                                options={[
                                    { value: 'avg_pct_desc', label: <span className="text-[10px]">Limit % ↓</span> },
                                    { value: 'peak_pct_desc', label: <span className="text-[10px]">Peak % ↓</span> },
                                    { value: 'avg_ot_desc', label: <span className="text-[10px]">OT sa ↓</span> },
                                    { value: 'missing_desc', label: <span className="text-[10px]">Eksik ↓</span> },
                                    { value: 'name', label: <span className="text-[10px]">A-Z</span> },
                                ]}
                            />
                        )}
                        <span className="ml-auto text-[10px] text-slate-500">
                            <span className="font-bold tabular-nums text-slate-700">
                                {mode === 'person' ? filteredEmployees.length : filteredDepts.length}
                            </span> kayıt
                            <span className="mx-1.5 text-slate-300">·</span>
                            {data.period?.week_count || 0} hafta
                        </span>
                    </>
                )}
            </div>

            {/* İçerik */}
            {mode === 'person' && (
                <div className="space-y-2.5">
                    {filteredEmployees.length === 0 ? (
                        <Empty description="Filtre sonucu yok" />
                    ) : (
                        filteredEmployees.map((row) => (
                            <PersonRow
                                key={row.employee_id}
                                row={row}
                                isPeakHighlight={row.stats?.peak_limit_usage_pct >= 100}
                            />
                        ))
                    )}
                </div>
            )}

            {mode === 'department' && (
                <div className="space-y-2.5">
                    {filteredDepts.length === 0 ? (
                        <Empty description="Filtre sonucu yok" />
                    ) : (
                        filteredDepts.map((row) => (
                            <DepartmentRow key={row.department} row={row} />
                        ))
                    )}
                </div>
            )}

            {mode === 'compare' && (
                <CompareView data={data} weeksList={data.weeks} />
            )}
        </div>
    );
}
