import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, Segmented, Tag, Empty, Spin, Tooltip } from 'antd';
import {
    Users, GitCompare, Building2, Calendar, User as UserIcon,
    TrendingUp, TrendingDown, BarChart3, ArrowRight,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import ChartTooltip from '../shared/ChartTooltip';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Legend, LineChart, Line, Cell,
} from 'recharts';

/**
 * ComparisonTab v2 — 4-mod karşılaştırma stüdyosu (Phase 10)
 *
 * Modlar:
 *   benchmark: Kişi vs grup ortalaması (departman/şirket/pozisyon)
 *   persons:   2-4 kişi karşılaştırma
 *   teams:     2-4 departman karşılaştırma
 *   periods:   Kişi vs kendi geçmişi (2 dönem)
 *
 * Görünüm:
 *   anlık: snapshot (radar/bar)
 *   trend: aylık zaman serisi (multi-line)
 */

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MODES = [
    { value: 'benchmark', label: 'Kişi → Benchmark', icon: UserIcon, desc: 'Bir kişiyi grup ortalamasıyla karşılaştır' },
    { value: 'persons', label: 'Kişi vs Kişi', icon: GitCompare, desc: '2-4 çalışanı yan yana koy' },
    { value: 'teams', label: 'Ekip vs Ekip', icon: Building2, desc: '2-4 departmanı karşılaştır' },
    { value: 'periods', label: 'Geçmiş ile', icon: Calendar, desc: 'Bir kişinin iki dönemini kıyasla' },
];

const SCOPE_OPTIONS = [
    { value: 'department', label: 'Departman' },
    { value: 'company', label: 'Şirket Geneli' },
    { value: 'position', label: 'Pozisyon' },
];

export default function ComparisonTab() {
    const { employees, departments } = useAnalytics();

    const [mode, setMode] = useState('benchmark');
    const [view, setView] = useState('snapshot'); // 'snapshot' | 'trend'
    const [months, setMonths] = useState(6);

    // Mode-specific state
    const [selectedEmpId, setSelectedEmpId] = useState(null);
    const [selectedEmpIds, setSelectedEmpIds] = useState([]);
    const [selectedDeptIds, setSelectedDeptIds] = useState([]);
    const [scope, setScope] = useState('department');
    const [periodA, setPeriodA] = useState('');
    const [periodB, setPeriodB] = useState('');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-pick defaults
    useEffect(() => {
        if (!selectedEmpId && employees?.length) setSelectedEmpId(employees[0].id);
    }, [employees, selectedEmpId]);

    const empOptions = useMemo(
        () => (employees || []).map((e) => ({ value: e.id, label: e.name || e.full_name || `#${e.id}` })),
        [employees]
    );
    const deptOptions = useMemo(
        () => (departments || []).map((d) => ({ value: d.id, label: d.name })),
        [departments]
    );

    // Fetch
    const fetchComparison = useCallback(async () => {
        const params = { mode, months };
        if (mode === 'benchmark') {
            if (!selectedEmpId) return;
            params.emp_id = selectedEmpId;
            params.scope = scope;
        } else if (mode === 'persons') {
            if (selectedEmpIds.length < 2) return;
            params.emp_ids = selectedEmpIds.join(',');
        } else if (mode === 'teams') {
            if (selectedDeptIds.length < 2) return;
            params.dept_ids = selectedDeptIds.join(',');
        } else if (mode === 'periods') {
            if (!selectedEmpId || !periodA || !periodB) return;
            params.emp_id = selectedEmpId;
            params.period_a = periodA;
            params.period_b = periodB;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/compare/', { params, timeout: 30000 });
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Yüklenemedi');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [mode, months, selectedEmpId, selectedEmpIds, selectedDeptIds, scope, periodA, periodB]);

    useEffect(() => { fetchComparison(); }, [fetchComparison]);

    // ─── Render helpers ───

    const renderModeSelector = () => (
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
            <div className="flex items-center gap-1 overflow-x-auto">
                {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = mode === m.value;
                    return (
                        <button
                            key={m.value}
                            onClick={() => { setMode(m.value); setData(null); }}
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                active
                                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                            }`}
                        >
                            <Icon size={14} />
                            <div className="text-left">
                                <div>{m.label}</div>
                                <div className="text-[9px] font-medium text-slate-400">{m.desc}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderControls = () => (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                {/* Mode-specific selectors */}
                {mode === 'benchmark' && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Kişi:</span>
                            <Select
                                value={selectedEmpId}
                                onChange={setSelectedEmpId}
                                options={empOptions}
                                style={{ minWidth: 220 }}
                                size="small"
                                showSearch
                                optionFilterProp="label"
                                placeholder="Çalışan seç"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Karşılaştır:</span>
                            <Segmented
                                value={scope}
                                onChange={setScope}
                                options={SCOPE_OPTIONS}
                                size="small"
                            />
                        </div>
                    </>
                )}

                {mode === 'persons' && (
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Kişiler (2-4):</span>
                        <Select
                            mode="multiple"
                            value={selectedEmpIds}
                            onChange={(v) => setSelectedEmpIds(v.slice(0, 4))}
                            options={empOptions}
                            style={{ flex: 1, minWidth: 300 }}
                            size="small"
                            showSearch
                            optionFilterProp="label"
                            maxTagCount={4}
                            placeholder="2-4 çalışan seç"
                        />
                    </div>
                )}

                {mode === 'teams' && (
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Departmanlar (2-4):</span>
                        <Select
                            mode="multiple"
                            value={selectedDeptIds}
                            onChange={(v) => setSelectedDeptIds(v.slice(0, 4))}
                            options={deptOptions}
                            style={{ flex: 1, minWidth: 300 }}
                            size="small"
                            showSearch
                            optionFilterProp="label"
                            placeholder="2-4 departman seç"
                        />
                    </div>
                )}

                {mode === 'periods' && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Kişi:</span>
                            <Select
                                value={selectedEmpId}
                                onChange={setSelectedEmpId}
                                options={empOptions}
                                style={{ minWidth: 200 }}
                                size="small"
                                showSearch
                                optionFilterProp="label"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">A:</span>
                            <input type="month" value={periodA} onChange={(e) => setPeriodA(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs" />
                            <ArrowRight size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">B:</span>
                            <input type="month" value={periodB} onChange={(e) => setPeriodB(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs" />
                        </div>
                    </>
                )}

                {/* Months + View toggle (sağda) */}
                {mode !== 'periods' && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Görünüm:</span>
                        <Segmented
                            value={view}
                            onChange={setView}
                            options={[
                                { value: 'snapshot', label: 'Anlık' },
                                { value: 'trend', label: 'Zaman Serisi' },
                            ]}
                            size="small"
                        />
                        {view === 'trend' && (
                            <Select
                                value={months}
                                onChange={setMonths}
                                options={[3, 6, 12].map((n) => ({ value: n, label: `Son ${n} ay` }))}
                                size="small"
                                style={{ width: 110 }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderBenchmark = () => {
        if (!data || data.mode !== 'benchmark') return null;
        const months = data.months || [];
        const last = months[months.length - 1] || {};
        const person = last.person || {};
        const benchmark = last.benchmark || {};

        if (view === 'snapshot') {
            const compareData = [
                { metric: 'Verimlilik (%)', person: person.efficiency_pct || 0, benchmark: benchmark.efficiency_pct || 0 },
                { metric: 'Çalışma (sa)', person: person.worked_hours || 0, benchmark: benchmark.worked_hours || 0 },
                { metric: 'Ek Mesai (sa)', person: person.overtime_hours || 0, benchmark: benchmark.overtime_hours || 0 },
                { metric: 'Eksik (sa)', person: person.missing_hours || 0, benchmark: benchmark.missing_hours || 0 },
            ];
            return (
                <SectionCard title={`${data.person.name} vs ${data.benchmark_label}`} collapsible={false}>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compareData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RTooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Bar dataKey="person" name={data.person.name} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="benchmark" name={data.benchmark_label} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        {compareData.map((d) => {
                            const delta = d.benchmark > 0 ? Math.round((d.person - d.benchmark) / d.benchmark * 100) : 0;
                            const isPositive = (d.metric.includes('Eksik') ? delta < 0 : delta > 0);
                            return (
                                <div key={d.metric} className="rounded-lg border border-slate-200 p-2.5 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{d.metric}</div>
                                    <div className="text-lg font-black text-slate-800 tabular-nums">{d.person}</div>
                                    <div className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {delta >= 0 ? '+' : ''}{delta}% vs ort.
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            );
        }

        // Trend
        const chartData = months.map((m) => ({
            ay: m.period?.slice(5),
            kişi_verimlilik: m.person?.efficiency_pct || 0,
            ortalama_verimlilik: m.benchmark?.efficiency_pct || 0,
            kişi_çalışma: m.person?.worked_hours || 0,
            ortalama_çalışma: m.benchmark?.worked_hours || 0,
            kişi_ot: m.person?.overtime_hours || 0,
            ortalama_ot: m.benchmark?.overtime_hours || 0,
        }));
        return (
            <SectionCard title={`${data.person.name} vs ${data.benchmark_label} — Aylık Trend`} collapsible={false}>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ay" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            <Line type="monotone" dataKey="kişi_verimlilik" name={`${data.person.name} - Verimlilik %`} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="ortalama_verimlilik" name="Ortalama Verimlilik %" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </SectionCard>
        );
    };

    const renderPersons = () => {
        if (!data || data.mode !== 'persons') return null;
        const emps = data.employees || [];
        const series = data.time_series || [];
        const snapshot = data.snapshot || [];

        if (view === 'snapshot') {
            // Radar
            const radarMetrics = [
                { metric: 'Verimlilik' },
                { metric: 'Çalışma' },
                { metric: 'Ek Mesai' },
                { metric: 'Eksik' },
            ];
            // Her metrik için her kişinin değeri
            const radarData = radarMetrics.map((m) => {
                const point = { metric: m.metric };
                snapshot.forEach((s) => {
                    const key = s.name.split(' ')[0].slice(0, 12);
                    if (m.metric === 'Verimlilik') point[key] = s.metrics?.efficiency_pct || 0;
                    if (m.metric === 'Çalışma') point[key] = s.metrics?.worked_hours || 0;
                    if (m.metric === 'Ek Mesai') point[key] = s.metrics?.overtime_hours || 0;
                    if (m.metric === 'Eksik') point[key] = s.metrics?.missing_hours || 0;
                });
                return point;
            });
            const keys = snapshot.map((s) => s.name.split(' ')[0].slice(0, 12));
            return (
                <SectionCard title="Kişi Karşılaştırma — Anlık" collapsible={false}>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                                {keys.map((k, i) => (
                                    <Radar key={k} dataKey={k} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.2} strokeWidth={2} />
                                ))}
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <RTooltip content={<ChartTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            );
        }

        // Trend
        const lineData = series.map((p) => {
            const out = { ay: p.period?.slice(5) };
            emps.forEach((e) => {
                const key = e.name.split(' ')[0].slice(0, 12);
                out[`${key}_verimlilik`] = p[`${key}_efficiency`] || 0;
            });
            return out;
        });
        return (
            <SectionCard title="Kişi Verimlilik Trendi" collapsible={false}>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ay" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 10 }} unit="%" />
                            <RTooltip content={<ChartTooltip unit="%" />} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            {emps.map((e, i) => {
                                const key = e.name.split(' ')[0].slice(0, 12);
                                return <Line key={e.id} type="monotone" dataKey={`${key}_verimlilik`} name={e.name} stroke={COLORS[i]} strokeWidth={2.5} dot={{ r: 4 }} />;
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </SectionCard>
        );
    };

    const renderTeams = () => {
        if (!data || data.mode !== 'teams') return null;
        const depts = data.departments || [];
        const series = data.time_series || [];
        const snapshot = data.snapshot || [];

        if (view === 'snapshot') {
            const barData = snapshot.map((s) => ({
                name: s.name,
                verimlilik: s.metrics?.efficiency_pct || 0,
                çalışma: s.metrics?.worked_hours || 0,
                ot: s.metrics?.overtime_hours || 0,
                kişi: s.employee_count,
            }));
            return (
                <SectionCard title="Departman Karşılaştırma — Anlık" collapsible={false}>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RTooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Bar dataKey="verimlilik" name="Verimlilik %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="çalışma" name="Ort. Çalışma (sa)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ot" name="Ort. OT (sa)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        {snapshot.map((s, i) => (
                            <div key={s.dept_id} className="rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                                    <span className="font-bold text-sm text-slate-800">{s.name}</span>
                                    <Tag color="default" className="ml-auto text-[10px]">{s.employee_count} kişi</Tag>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div><span className="text-slate-500">Verimlilik:</span> <span className="font-bold tabular-nums">{s.metrics?.efficiency_pct}%</span></div>
                                    <div><span className="text-slate-500">Çalışma:</span> <span className="font-bold tabular-nums">{s.metrics?.worked_hours}sa</span></div>
                                    <div><span className="text-slate-500">OT:</span> <span className="font-bold tabular-nums">{s.metrics?.overtime_hours}sa</span></div>
                                    <div><span className="text-slate-500">Eksik:</span> <span className="font-bold tabular-nums text-red-600">{s.metrics?.missing_hours}sa</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            );
        }

        // Trend
        const lineData = series.map((p) => {
            const out = { ay: p.period?.slice(5) };
            depts.forEach((d) => {
                const key = d.name.slice(0, 12);
                out[`${key}_verimlilik`] = p[`${key}_efficiency`] || 0;
            });
            return out;
        });
        return (
            <SectionCard title="Departman Verimlilik Trendi" collapsible={false}>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ay" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 10 }} unit="%" />
                            <RTooltip content={<ChartTooltip unit="%" />} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            {depts.map((d, i) => {
                                const key = d.name.slice(0, 12);
                                return <Line key={d.id} type="monotone" dataKey={`${key}_verimlilik`} name={d.name} stroke={COLORS[i]} strokeWidth={2.5} dot={{ r: 4 }} />;
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </SectionCard>
        );
    };

    const renderPeriods = () => {
        if (!data || data.mode !== 'periods') return null;
        const deltas = data.deltas || {};
        const cards = [
            { label: 'Verimlilik', key: 'efficiency_pct', suffix: '%', betterIsHigher: true },
            { label: 'Çalışma', key: 'worked_hours', suffix: 'sa', betterIsHigher: true },
            { label: 'Ek Mesai', key: 'overtime_hours', suffix: 'sa', betterIsHigher: null },
            { label: 'Eksik Saat', key: 'missing_hours', suffix: 'sa', betterIsHigher: false },
        ];
        return (
            <SectionCard title={`${data.person.name} — ${data.period_a} vs ${data.period_b}`} collapsible={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map((c) => {
                        const d = deltas[c.key] || {};
                        const isImproved = c.betterIsHigher === null
                            ? null
                            : c.betterIsHigher ? d.diff > 0 : d.diff < 0;
                        const TrendIcon = d.diff > 0 ? TrendingUp : TrendingDown;
                        return (
                            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{c.label}</div>
                                <div className="flex items-baseline justify-between gap-2 mb-3">
                                    <div>
                                        <div className="text-[9px] text-slate-400">A: {data.period_a}</div>
                                        <div className="text-lg font-bold text-slate-700 tabular-nums">{d.period_a}{c.suffix}</div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-400" />
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-400">B: {data.period_b}</div>
                                        <div className="text-lg font-bold text-slate-700 tabular-nums">{d.period_b}{c.suffix}</div>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 text-sm font-bold ${
                                    isImproved === null ? 'text-slate-600' : isImproved ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                    <TrendIcon size={14} />
                                    {d.diff >= 0 ? '+' : ''}{d.diff}{c.suffix}
                                    <span className="text-[10px] text-slate-400 ml-auto">
                                        ({d.pct_change >= 0 ? '+' : ''}{d.pct_change}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>
        );
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {renderModeSelector()}
            {renderControls()}

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    ⚠ {error}
                </div>
            )}

            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                    <Spin size="large" />
                    <div className="mt-3 text-xs text-slate-500">Karşılaştırma verisi hazırlanıyor…</div>
                </div>
            )}

            {!loading && !data && !error && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <BarChart3 size={32} className="mx-auto mb-2 text-slate-400" />
                    <div className="text-sm text-slate-500">
                        {mode === 'persons' && 'En az 2 çalışan seçin'}
                        {mode === 'teams' && 'En az 2 departman seçin'}
                        {mode === 'periods' && 'Çalışan + 2 dönem seçin'}
                        {mode === 'benchmark' && 'Çalışan seçin'}
                    </div>
                </div>
            )}

            {!loading && data && mode === 'benchmark' && renderBenchmark()}
            {!loading && data && mode === 'persons' && renderPersons()}
            {!loading && data && mode === 'teams' && renderTeams()}
            {!loading && data && mode === 'periods' && renderPeriods()}
        </div>
    );
}
