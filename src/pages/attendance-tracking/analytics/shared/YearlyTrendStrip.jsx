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

// Kumulatif tum metrikler (Hepsi modu icin) — running sum
function buildCumulativeAll(months, monthlyData) {
    let normalAcc = 0, otAcc = 0, missingAcc = 0;
    return months.map((m, idx) => {
        const row = monthlyData[idx] || {};
        normalAcc += row.avg_normal_h ?? 0;
        otAcc += row.avg_ot_h ?? 0;
        missingAcc += row.avg_missing_h ?? 0;
        return {
            month: m.label,
            monthIdx: m.index,
            normal: +normalAcc.toFixed(2),
            ot: +otAcc.toFixed(2),
            missing: +missingAcc.toFixed(2),
        };
    });
}

// Kumulatif tek metric — running sum + running avg
function buildCumulativeSingle(months, monthlyData, metric) {
    let sumAcc = 0;
    let avgAcc = 0;
    let nMonths = 0;
    const sumKey = `sum_${metric}`;
    const avgKey = `avg_${metric}`;
    return months.map((m, idx) => {
        const row = monthlyData[idx] || {};
        sumAcc += row[sumKey] ?? 0;
        if ((row[avgKey] ?? 0) > 0) {
            avgAcc += row[avgKey];
            nMonths++;
        }
        return {
            month: m.label,
            monthIdx: m.index,
            cumSum: +sumAcc.toFixed(2),
            cumAvg: nMonths > 0 ? +(avgAcc / nMonths).toFixed(2) : 0,
        };
    });
}

// Mali ay X of year Y = "26 of (X-1) → 25 of X"
function getFiscalMonthRange(year, month) {
    const fmt = (yr, mo, dy) => `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
    const startMonth = month === 1 ? 12 : month - 1;
    const startYear = month === 1 ? year - 1 : year;
    return {
        startDate: fmt(startYear, startMonth, 26),
        endDate: fmt(year, month, 25),
    };
}

const TR_MONTHS_FULL = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function YearlyTrendStrip() {
    const { selectedYear, queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scope, setScope] = useState('company');
    const [metric, setMetric] = useState('all');
    const [chartMode, setChartMode] = useState('line'); // 'line' | 'bar' | 'area' | 'cumulative'
    const [selectedPersons, setSelectedPersons] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [drillMonth, setDrillMonth] = useState(null); // 1-12 — tıklanan mali ay

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        setError(null);
        try {
            const params = { year: selectedYear };
            // Filtreleri korumak için scope/exclude/min-attendance/dates geçir.
            // start_date/end_date min_normal_completion_pct filtresinin
            // referans ayını belirler (get_scope mantığı).
            const passKeys = [
                'department_ids', 'position_ids',
                'exclude_department_ids', 'exclude_employee_ids',
                'min_normal_completion_pct',
                'start_date', 'end_date',
            ];
            passKeys.forEach((k) => {
                if (queryParams?.[k] != null) params[k] = queryParams[k];
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
        const months = data.months || [];
        const monthly = data.company?.monthly || [];
        if (chartMode === 'cumulative') {
            if (metric === 'all') {
                return buildCumulativeAll(months, monthly);
            }
            return buildCumulativeSingle(months, monthly, metric);
        }
        if (metric === 'all') {
            return months.map((m, idx) => {
                const row = monthly[idx] || {};
                return {
                    month: m.label,
                    monthIdx: m.index,
                    normal: row.avg_normal_h ?? 0,
                    ot: row.avg_ot_h ?? 0,
                    missing: row.avg_missing_h ?? 0,
                };
            });
        }
        return withCumulativeAvg(getCompanySeries(data, metric));
    }, [data, metric, chartMode]);

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
                        { value: 'cumulative', label: <span className="text-[10px] px-1 font-bold">Kümülatif</span> },
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
                        onMonthClick={(idx) => setDrillMonth(idx)}
                    />
                )}
                {scope === 'company' && (
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                        💡 Bir aya tıklayınca alt bölümde haftalık dağılımı açılır
                    </p>
                )}

                {/* Aylık drill-down — haftalık dağılım */}
                {drillMonth && (
                    <MonthDrillPanel
                        year={selectedYear}
                        month={drillMonth}
                        onClose={() => setDrillMonth(null)}
                        queryParams={queryParams}
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

function CompanyChart({ data, metric, chartMode, yearAvg, onMonthClick }) {
    if (!data || data.length === 0) {
        return <Empty description="Veri yok" />;
    }
    // Bar/Line click → drill-down (parent setState)
    // O9 fix (2026-05-17): monthIdx 1-12 doğrulaması (eskiden 0 veya 13+ undefined erişim olabilirdi)
    const handleBarClick = (e) => {
        if (!onMonthClick) return;
        const idx = e?.activePayload?.[0]?.payload?.monthIdx;
        if (Number.isInteger(idx) && idx >= 1 && idx <= 12) {
            onMonthClick(idx);
        }
    };

    // Kümülatif modu (running sum)
    if (chartMode === 'cumulative') {
        if (metric === 'all') {
            return (
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} onClick={handleBarClick}>
                            <defs>
                                <linearGradient id="cumGrad-normal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={METRIC_COLORS.normal_h} stopOpacity={0.5} />
                                    <stop offset="100%" stopColor={METRIC_COLORS.normal_h} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            {/* O8 fix (2026-05-17): Y axis label eklendi */}
                            <YAxis tick={{ fontSize: 10 }} unit=" sa"
                                label={{ value: 'Saat', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fontWeight: 600, fill: '#64748b' } }} />
                            <RTooltip />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Area type="monotone" dataKey="normal" name="Kümülatif Normal" stroke={METRIC_COLORS.normal_h} fill="url(#cumGrad-normal)" strokeWidth={2} />
                            <Line type="monotone" dataKey="ot" name="Kümülatif OT" stroke={METRIC_COLORS.ot_h} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, onClick: (e, p) => onMonthClick && onMonthClick(p?.payload?.monthIdx) }} />
                            <Line type="monotone" dataKey="missing" name="Kümülatif Eksik" stroke={METRIC_COLORS.missing_h} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            );
        }
        const c = METRIC_COLORS[metric];
        return (
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} onClick={handleBarClick}>
                        <defs>
                            <linearGradient id={`cumGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={c} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={c} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="L" tick={{ fontSize: 10 }} unit="sa" orientation="left" />
                        <YAxis yAxisId="R" tick={{ fontSize: 10 }} unit="sa" orientation="right" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area yAxisId="L" type="monotone" dataKey="cumSum" name="Kümülatif Toplam (sol)" stroke={c} fill={`url(#cumGrad-${metric})`} strokeWidth={2} />
                        <Line yAxisId="R" type="monotone" dataKey="cumAvg" name="Yıl Bilinmesi Ort. (sağ)" stroke={c} strokeDasharray="4 3" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (metric === 'all') {
        return (
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={2} barCategoryGap="22%" onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                        <RTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="normal" name="Normal" fill={METRIC_COLORS.normal_h} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="ot" name="OT" fill={METRIC_COLORS.ot_h} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="missing" name="Eksik" fill={METRIC_COLORS.missing_h} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
    const color = METRIC_COLORS[metric];
    return (
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'bar' ? (
                    <BarChart data={data} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
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
                    <ComposedChart data={data} onClick={handleBarClick}>
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
                    <LineChart data={data} onClick={handleBarClick}>
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

function MonthDrillPanel({ year, month, onClose, queryParams }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const range = useMemo(() => getFiscalMonthRange(year, month), [year, month]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    start_date: range.startDate,
                    end_date: range.endDate,
                };
                ['department_ids', 'position_ids', 'exclude_department_ids', 'exclude_employee_ids', 'min_normal_completion_pct'].forEach((k) => {
                    if (queryParams?.[k] != null) params[k] = queryParams[k];
                });
                const res = await api.get('/attendance-analytics/weekly-limit/', { params, timeout: 30000 });
                if (!cancelled) setData(res.data);
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Yüklenemedi');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [year, month, range.startDate, range.endDate, queryParams]);

    // Haftalık şirket aggregate
    const weeklySummary = useMemo(() => {
        if (!data?.weeks?.length || !data?.employees?.length) return [];
        const weeks = data.weeks;
        return weeks.map((w, idx) => {
            let totalOt = 0;
            let count = 0;
            data.employees.forEach((e) => {
                const wk = e.weeks?.[idx];
                if (wk) {
                    totalOt += wk.ot_hours || 0;
                    count++;
                }
            });
            return {
                label: `${w.start.slice(5)} → ${w.end.slice(5)}`,
                week_start: w.start,
                avg_ot: count > 0 ? +(totalOt / count).toFixed(2) : 0,
                sum_ot: +totalOt.toFixed(2),
                members: count,
            };
        });
    }, [data]);

    const totals = useMemo(() => {
        if (!data?.employees?.length) return null;
        let normal = 0, ot = 0, missing = 0;
        let nWithData = 0;
        data.employees.forEach((e) => {
            normal += e.totals?.normal_hours || 0;
            ot += e.totals?.ot_hours || 0;
            missing += e.totals?.missing_hours || 0;
            if ((e.totals?.normal_hours || 0) > 0) nWithData++;
        });
        const n = nWithData || 1;
        return {
            sum_normal: +normal.toFixed(1),
            sum_ot: +ot.toFixed(1),
            sum_missing: +missing.toFixed(1),
            avg_normal: +(normal / n).toFixed(2),
            avg_ot: +(ot / n).toFixed(2),
            avg_missing: +(missing / n).toFixed(2),
            employees: nWithData,
            weeks: data.weeks?.length || 0,
        };
    }, [data]);

    return (
        <div className="mt-4 rounded-xl border-2 border-indigo-300 bg-indigo-50/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-200">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100">
                        <Calendar size={14} className="text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="text-[13px] font-black text-slate-800">
                            {TR_MONTHS_FULL[month]} {year} — Haftalık Dağılım
                        </h4>
                        <p className="text-[10px] text-slate-500">
                            {range.startDate} → {range.endDate} · Mali Ay {month}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
                >
                    Kapat ✕
                </button>
            </div>

            {loading && (
                <div className="text-center py-6 text-[12px] text-indigo-600">Haftalık veri yükleniyor…</div>
            )}
            {error && (
                <div className="text-center py-4 text-[12px] text-red-600">{error}</div>
            )}
            {!loading && !error && data && (
                <>
                    {/* Aylık özet KPI */}
                    {totals && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                            <KpiTile label={`${totals.weeks} hafta · ${totals.employees} kişi`} value={totals.weeks} suffix="hf" color="slate" icon={Calendar} />
                            <KpiTile label="Aylık Toplam Normal" value={totals.sum_normal} suffix="sa" color="indigo" />
                            <KpiTile label="Aylık Toplam OT" value={totals.sum_ot} suffix="sa" color="amber" icon={TrendingUp} />
                            <KpiTile label="Aylık Toplam Eksik" value={totals.sum_missing} suffix="sa" color="red" icon={AlertTriangle} />
                        </div>
                    )}

                    {/* Haftalık şirket OT bar chart */}
                    {weeklySummary.length > 0 ? (
                        <div className="rounded-lg border border-indigo-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-[11px] font-bold text-slate-700">Haftalık Kişi-Ortalaması OT</h5>
                                <span className="text-[10px] text-slate-400">
                                    Aylık ort. <span className="font-bold tabular-nums text-amber-700">{totals?.avg_ot ?? 0}sa</span> · <span className="font-bold tabular-nums text-indigo-700">{totals?.avg_normal ?? 0}sa</span> normal
                                </span>
                            </div>
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklySummary}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} unit="sa" />
                                        <RTooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="rounded-lg bg-white border border-slate-200 shadow-md px-3 py-2 text-[11px]">
                                                        <div className="font-bold text-slate-700 mb-1">{label}</div>
                                                        <div>Kişi başı OT: <span className="font-bold tabular-nums text-amber-700">{d.avg_ot}sa</span></div>
                                                        <div>Toplam OT: <span className="font-bold tabular-nums text-amber-700">{d.sum_ot}sa</span></div>
                                                        <div>Veri olan kişi: <span className="font-bold tabular-nums">{d.members}</span></div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="avg_ot" name="Haftalık Kişi Ort. OT" fill={METRIC_COLORS.ot_h} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <Empty description="Bu ay için haftalık veri yok" />
                    )}
                </>
            )}
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
