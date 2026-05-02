import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Segmented, Empty, Select, Tag } from 'antd';
import {
    Calendar, TrendingUp, AlertTriangle, Target, Users, Building2, Search,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Area,
} from 'recharts';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * YearlyTrendStrip — Yıllık görünümde her tab'ın üstünde gözüken
 * 12-mali-ay zaman serisi paneli.
 *
 * Backend: GET /attendance-analytics/yearly-monthly-aggregates/?year=YYYY
 *
 * 3 görünüm modu:
 *   - 'company' Şirket geneli toplam ve kişi-ortalaması (varsayılan)
 *   - 'department' Departman bazlı kişi-ortalaması (multi-line)
 *   - 'persons' Multi-select kişi karşılaştırması (max 5)
 *
 * Metric toggle: Normal / OT / Eksik / Hepsi (composed)
 */

const METRIC_COLORS = {
    normal_h: '#6366f1',
    ot_h: '#f59e0b',
    missing_h: '#ef4444',
    target_h: '#10b981',
};

const METRIC_LABELS = {
    normal_h: 'Normal',
    ot_h: 'OT',
    missing_h: 'Eksik',
    target_h: 'Hedef',
};

const PERSON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function MetricLegend({ metric, year }) {
    return (
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[metric] }} />
                <span className="font-semibold">{METRIC_LABELS[metric]}</span>
            </span>
            <span>· Mali Yıl {year}</span>
        </div>
    );
}

function getCompanySeries(data, metric) {
    const monthly = data?.company?.monthly || [];
    const months = data?.months || [];
    return months.map((m, idx) => {
        const row = monthly[idx] || {};
        const sumKey = `sum_${metric}`;
        const avgKey = `avg_${metric}`;
        return {
            month: m.label,
            monthIdx: m.index,
            sum: row[sumKey] ?? 0,
            avg: row[avgKey] ?? 0,
            cumAvg: 0, // doldurulacak
        };
    });
}

function withCumulativeAvg(series, key = 'avg') {
    let acc = 0;
    let nMonths = 0;
    return series.map((row) => {
        if (row[key] > 0) {
            acc += row[key];
            nMonths++;
        }
        return { ...row, cumAvg: nMonths > 0 ? +(acc / nMonths).toFixed(2) : 0 };
    });
}

export default function YearlyTrendStrip() {
    const { selectedYear, queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scope, setScope] = useState('company');
    const [metric, setMetric] = useState('all');
    const [chartMode, setChartMode] = useState('line'); // 'line' | 'bar' | 'area'
    const [selectedPersons, setSelectedPersons] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        setError(null);
        try {
            const params = { year: selectedYear };
            // Filtreleri korumak için scope/exclude'ları da geçir (backend get_scope kullanır)
            ['department_ids', 'position_ids', 'exclude_department_ids', 'exclude_employee_ids'].forEach((k) => {
                if (queryParams?.[k]) params[k] = queryParams[k];
            });
            const res = await api.get('/attendance-analytics/yearly-monthly-aggregates/', {
                params, timeout: 60000,
            });
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const personOptions = useMemo(() => {
        return (data?.employees || []).map((e) => ({
            value: e.employee_id,
            label: `${e.name} — ${e.department}`,
            row: e,
        }));
    }, [data]);

    const deptOptions = useMemo(() => {
        return (data?.departments || []).map((d) => ({
            value: d.department,
            label: `${d.department} (${d.employee_count})`,
            row: d,
        }));
    }, [data]);

    const personLookup = useMemo(() => {
        const m = {};
        personOptions.forEach((o) => { m[o.value] = o.row; });
        return m;
    }, [personOptions]);

    const deptLookup = useMemo(() => {
        const m = {};
        deptOptions.forEach((o) => { m[o.value] = o.row; });
        return m;
    }, [deptOptions]);

    // Şirket genel chart datası
    const companyChartData = useMemo(() => {
        if (!data) return [];
        if (metric === 'all') {
            // Composed: 3 metric ayrı bar/line
            const months = data.months || [];
            return months.map((m, idx) => {
                const row = data.company?.monthly?.[idx] || {};
                return {
                    month: m.label,
                    normal: row.avg_normal_h ?? 0,
                    ot: row.avg_ot_h ?? 0,
                    missing: row.avg_missing_h ?? 0,
                };
            });
        }
        return withCumulativeAvg(getCompanySeries(data, metric.replace('h', 'h')));
    }, [data, metric]);

    const yearAvg = useMemo(() => {
        if (!data || metric === 'all') return null;
        const k = `avg_${metric}`;
        return data?.company?.avg_monthly_per_member?.[k.replace('avg_', '')] ?? null;
    }, [data, metric]);

    // Departman/persons chart datası — 12 ay × seçili her birim ayrı seri
    const multiSeriesData = useMemo(() => {
        if (!data) return { rows: [], series: [] };
        const months = data.months || [];
        const monthIdxs = months.map((m) => m.index);
        const series = [];
        const sourceLookup = scope === 'department' ? deptLookup : personLookup;
        const selected = scope === 'department' ? selectedDepts : selectedPersons;

        const metricKeys = metric === 'all' ? ['normal_h', 'ot_h', 'missing_h'] : [metric];

        const rows = monthIdxs.map((idx, i) => {
            const m = months[i];
            const point = { month: m.label };
            selected.slice(0, 5).forEach((key) => {
                const row = sourceLookup[key];
                if (!row) return;
                const md = (row.monthly || [])[i] || {};
                if (metric === 'all') {
                    point[`${key}_normal_h`] = md.normal_h ?? md.avg_normal_h ?? 0;
                    point[`${key}_ot_h`] = md.ot_h ?? md.avg_ot_h ?? 0;
                    point[`${key}_missing_h`] = md.missing_h ?? md.avg_missing_h ?? 0;
                } else {
                    point[key] = md[metric] ?? md[`avg_${metric.replace('_h', '_h')}`] ?? 0;
                }
            });
            return point;
        });

        selected.slice(0, 5).forEach((key, i) => {
            const row = sourceLookup[key];
            if (!row) return;
            metricKeys.forEach((mk, mi) => {
                series.push({
                    dataKey: metric === 'all' ? `${key}_${mk}` : key,
                    name: metric === 'all' ? `${row.name || row.department} · ${METRIC_LABELS[mk]}` : (row.name || row.department),
                    color: metric === 'all' ? METRIC_COLORS[mk] : PERSON_COLORS[i % 5],
                    strokeDasharray: metric === 'all' ? (mi === 0 ? '0' : mi === 1 ? '4 2' : '2 2') : undefined,
                });
            });
        });

        return { rows, series };
    }, [data, scope, metric, selectedDepts, selectedPersons, deptLookup, personLookup]);

    if (loading && !data) {
        return (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 text-center text-[12px] text-indigo-600">
                Yıllık veri yükleniyor…
            </div>
        );
    }
    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
                {error}
            </div>
        );
    }
    if (!data || !data.company?.monthly?.length) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-indigo-200/60 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50/60 border-b border-indigo-200/40 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                        <TrendingUp size={14} className="text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-[12px] font-black text-slate-800">Yıllık Trend · {data.year} Mali Yılı</div>
                        <div className="text-[10px] text-slate-500">12 mali ay zaman serisi · YTD: {data.months_elapsed} ay</div>
                    </div>
                </div>

                <Segmented
                    size="small"
                    value={scope}
                    onChange={setScope}
                    options={[
                        { value: 'company', label: <span className="flex items-center gap-1 px-1 text-[10px]"><Users size={10} /> Şirket</span> },
                        { value: 'department', label: <span className="flex items-center gap-1 px-1 text-[10px]"><Building2 size={10} /> Departman</span> },
                        { value: 'persons', label: <span className="flex items-center gap-1 px-1 text-[10px]"><Users size={10} /> Kişiler</span> },
                    ]}
                />

                <Segmented
                    size="small"
                    value={metric}
                    onChange={setMetric}
                    options={[
                        { value: 'all', label: <span className="text-[10px] px-1">Hepsi</span> },
                        { value: 'normal_h', label: <span className="text-[10px] px-1" style={{ color: METRIC_COLORS.normal_h }}>Normal</span> },
                        { value: 'ot_h', label: <span className="text-[10px] px-1" style={{ color: METRIC_COLORS.ot_h }}>OT</span> },
                        { value: 'missing_h', label: <span className="text-[10px] px-1" style={{ color: METRIC_COLORS.missing_h }}>Eksik</span> },
                    ]}
                />

                <Segmented
                    size="small"
                    value={chartMode}
                    onChange={setChartMode}
                    options={[
                        { value: 'line', label: <span className="text-[10px] px-1">Çizgi</span> },
                        { value: 'bar', label: <span className="text-[10px] px-1">Bar</span> },
                        { value: 'area', label: <span className="text-[10px] px-1">Alan</span> },
                    ]}
                />

                {scope === 'persons' && (
                    <Select
                        mode="multiple"
                        size="small"
                        placeholder="Kişi seç (max 5)"
                        value={selectedPersons}
                        onChange={(v) => setSelectedPersons(v.slice(0, 5))}
                        options={personOptions}
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 280, flex: 1 }}
                        suffixIcon={<Search size={12} />}
                        allowClear
                    />
                )}
                {scope === 'department' && (
                    <Select
                        mode="multiple"
                        size="small"
                        placeholder="Departman seç (max 5, boşken hepsi)"
                        value={selectedDepts}
                        onChange={(v) => setSelectedDepts(v.slice(0, 5))}
                        options={deptOptions}
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 240, flex: 1 }}
                        allowClear
                    />
                )}
            </div>

            <div className="p-4">
                {/* Üst KPI şeridi — Şirket geneli */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <KpiTile
                        label="Yıllık Toplam Normal"
                        value={data.company?.totals_sum?.normal_h}
                        suffix="sa" color="indigo" icon={Calendar}
                    />
                    <KpiTile
                        label="Yıllık Toplam OT"
                        value={data.company?.totals_sum?.ot_h}
                        suffix="sa" color="amber" icon={TrendingUp}
                    />
                    <KpiTile
                        label="Yıllık Toplam Eksik"
                        value={data.company?.totals_sum?.missing_h}
                        suffix="sa" color="red" icon={AlertTriangle}
                    />
                    <KpiTile
                        label="Kişi/Ay Ort. Normal"
                        value={data.company?.avg_monthly_per_member?.normal_h}
                        suffix="sa" color="emerald" icon={Target}
                    />
                </div>

                {/* Ana chart */}
                {scope === 'company' && (
                    <CompanyChart
                        data={companyChartData}
                        metric={metric}
                        chartMode={chartMode}
                        yearAvg={yearAvg}
                    />
                )}
                {(scope === 'department' || scope === 'persons') && (
                    <MultiSeriesChart
                        rows={multiSeriesData.rows}
                        series={multiSeriesData.series}
                        chartMode={chartMode}
                        emptyMsg={scope === 'persons'
                            ? 'Yukarıdan karşılaştırılacak kişileri seç'
                            : 'Departmanların hepsini görmek için seçim yapma; daraltmak için seç'}
                    />
                )}

                {scope === 'company' && metric !== 'all' && (
                    <MetricLegend metric={metric} year={data.year} />
                )}
            </div>
        </div>
    );
}

function KpiTile({ label, value, suffix, color = 'slate', icon: Icon }) {
    const cls = {
        slate: 'border-slate-200 bg-slate-50 text-slate-700',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-red-200 bg-red-50 text-red-700',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }[color];
    return (
        <div className={`rounded-lg border p-2.5 ${cls}`}>
            <div className="flex items-center gap-1.5 mb-1">
                {Icon && <Icon size={11} />}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</span>
            </div>
            <div className="text-xl font-black tabular-nums leading-none">
                {(value ?? 0).toFixed?.(1) ?? '0.0'}
                {suffix && <span className="text-[10px] font-normal opacity-70 ml-1">{suffix}</span>}
            </div>
        </div>
    );
}

function CompanyChart({ data, metric, chartMode, yearAvg }) {
    if (!data || data.length === 0) {
        return <Empty description="Veri yok" />;
    }
    if (metric === 'all') {
        return (
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="normal" name="Normal" fill={METRIC_COLORS.normal_h} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="ot" name="OT" fill={METRIC_COLORS.ot_h} radius={[3, 3, 0, 0]} />
                        <Line type="monotone" dataKey="missing" name="Eksik" stroke={METRIC_COLORS.missing_h} strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        );
    }
    const color = METRIC_COLORS[metric];
    return (
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'bar' ? (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        {yearAvg != null && (
                            <ReferenceLine y={yearAvg} stroke="#64748b" strokeDasharray="4 3"
                                label={{ value: `Yıl Ort: ${yearAvg.toFixed(1)}sa`, position: 'right', fontSize: 9, fill: '#64748b' }} />
                        )}
                        <Bar dataKey="avg" name="Kişi Ort." fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                ) : chartMode === 'area' ? (
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Area type="monotone" dataKey="avg" name="Kişi Ort." stroke={color} fill={`url(#grad-${metric})`} strokeWidth={2} />
                        <Line type="monotone" dataKey="cumAvg" name="Kümülatif Ort." stroke={color} strokeDasharray="4 3" strokeWidth={2} dot={false} />
                    </ComposedChart>
                ) : (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {yearAvg != null && (
                            <ReferenceLine y={yearAvg} stroke="#64748b" strokeDasharray="4 3"
                                label={{ value: `Yıl Ort: ${yearAvg.toFixed(1)}sa`, position: 'right', fontSize: 9, fill: '#64748b' }} />
                        )}
                        <Line type="monotone" dataKey="avg" name="Kişi Ort." stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="cumAvg" name="Kümülatif Ort." stroke={color} strokeDasharray="4 3" strokeWidth={2} dot={false} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

function MultiSeriesChart({ rows, series, chartMode, emptyMsg }) {
    if (!series || series.length === 0) {
        return (
            <div className="py-10">
                <Empty description={emptyMsg} />
            </div>
        );
    }
    return (
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'bar' ? (
                    <BarChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {series.map((s) => (
                            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} />
                        ))}
                    </BarChart>
                ) : (
                    <LineChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {series.map((s) => (
                            <Line
                                key={s.dataKey}
                                type="monotone"
                                dataKey={s.dataKey}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                strokeDasharray={s.strokeDasharray}
                                dot={{ r: 2 }}
                                activeDot={{ r: 4 }}
                            />
                        ))}
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
