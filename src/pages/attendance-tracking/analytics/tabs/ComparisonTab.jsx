import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, Segmented, Tag, Spin } from 'antd';
import {
    GitCompare, Calendar, ArrowRight, BarChart3, AlertTriangle,
    TrendingUp, TrendingDown,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import SectionCard from '../shared/SectionCard';
import ChartTooltip from '../shared/ChartTooltip';
import ScopeBanner from '../shared/ScopeBanner';
import EntityPicker from '../shared/EntityPicker';
import RadarMetric from '../shared/RadarMetric';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Legend, LineChart, Line, Cell,
} from 'recharts';

/**
 * ComparisonTab v3 — Birleşik karşılaştırma.
 *
 * 2 mod:
 *   compare: kişi, departman ort., şirket ort., pozisyon ort. — sınır yok
 *   periods: bir kişi vs kendi 2 dönemi
 */

const PERSON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                       '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];
const AVG_COLORS = ['#94a3b8', '#64748b', '#475569', '#334155'];

const MODES = [
    {
        value: 'compare',
        label: 'Karşılaştır',
        desc: 'Kişi · Departman ort. · Şirket ort. · Pozisyon ort. — sınır yok',
    },
    {
        value: 'periods',
        label: 'Geçmiş ile',
        desc: 'Bir kişiyi 2 dönemiyle yan yana koy',
    },
];

export default function ComparisonTab() {
    const { employees, departments, positions, startDate, endDate } = useAnalytics();

    const [mode, setMode] = useState('compare');
    const [view, setView] = useState('snapshot');
    const [months, setMonths] = useState(6);

    const [selectedItems, setSelectedItems] = useState([]); // ['p:1', 'd:5', 'c', 'j:3']
    const [periodEmpId, setPeriodEmpId] = useState(null);
    const [periodA, setPeriodA] = useState('');
    const [periodB, setPeriodB] = useState('');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!periodEmpId && employees?.length) setPeriodEmpId(employees[0].id);
    }, [employees, periodEmpId]);

    const fetchComparison = useCallback(async () => {
        const params = { mode, months };
        if (mode === 'compare') {
            if (selectedItems.length === 0) return;
            params.items = selectedItems.join(',');
        } else if (mode === 'periods') {
            if (!periodEmpId || !periodA || !periodB) return;
            params.emp_id = periodEmpId;
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
    }, [mode, months, selectedItems, periodEmpId, periodA, periodB]);

    useEffect(() => { fetchComparison(); }, [fetchComparison]);

    // Renk ataması: kişi renkli paletten, ortalama gri tonlardan
    const colorMap = useMemo(() => {
        if (!data?.entities) return {};
        const map = {};
        let pi = 0, ai = 0;
        data.entities.forEach((e) => {
            if (e.is_avg) { map[e.key] = AVG_COLORS[ai % AVG_COLORS.length]; ai++; }
            else { map[e.key] = PERSON_COLORS[pi % PERSON_COLORS.length]; pi++; }
        });
        return map;
    }, [data]);

    const renderModeSelector = () => (
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
            <div className="flex items-center gap-1">
                {MODES.map((m) => {
                    const active = mode === m.value;
                    const Icon = m.value === 'compare' ? GitCompare : Calendar;
                    return (
                        <button
                            key={m.value}
                            onClick={() => { setMode(m.value); setData(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                active
                                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                            }`}
                        >
                            <Icon size={16} />
                            <div className="text-left">
                                <div>{m.label}</div>
                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">{m.desc}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderControls = () => (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            {mode === 'compare' && (
                <>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                            Karşılaştırılacaklar:
                        </div>
                        <EntityPicker
                            value={selectedItems}
                            onChange={setSelectedItems}
                            employees={employees}
                            departments={departments}
                            positions={positions}
                        />
                        {selectedItems.length >= 8 && (
                            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                                <AlertTriangle size={12} />
                                Çok fazla varlık seçili — grafik kalabalıklaşıyor. Trend görünümünü ya da daha az varlık seçmeyi öneririz.
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
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
                </>
            )}

            {mode === 'periods' && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Kişi:</span>
                        <Select
                            value={periodEmpId}
                            onChange={setPeriodEmpId}
                            options={(employees || []).map((e) => ({
                                value: e.id,
                                label: e.name || e.full_name || `#${e.id}`,
                            }))}
                            style={{ minWidth: 220 }}
                            size="small"
                            showSearch
                            optionFilterProp="label"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">A:</span>
                        <input
                            type="month"
                            value={periodA}
                            onChange={(e) => setPeriodA(e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">B:</span>
                        <input
                            type="month"
                            value={periodB}
                            onChange={(e) => setPeriodB(e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                    </div>
                </div>
            )}
        </div>
    );

    const renderCompareSnapshot = () => {
        if (!data || data.mode !== 'compare') return null;
        const snap = data.snapshot || [];
        if (!snap.length) return null;

        const metrics = [
            { key: 'efficiency_pct', label: 'Normal Doluluk %', color: '#6366f1' },
            { key: 'total_completion_pct', label: 'Toplam Doluluk %', color: '#10b981' },
            { key: 'ot_to_target_pct', label: 'Fazla Mesai/Y %', color: '#f59e0b' },
            { key: 'missing_to_target_pct', label: 'Eksik/Y %', color: '#ef4444' },
            { key: 'normal_hours', label: 'Normal (sa)', color: '#0ea5e9' },
            { key: 'overtime_hours', label: 'Fazla Mesai (sa)', color: '#d97706' },
            { key: 'missing_hours', label: 'Eksik (sa)', color: '#dc2626' },
        ];

        const barData = snap.map((s) => ({
            name: s.label,
            key: s.key,
            is_avg: s.is_avg,
            ...metrics.reduce((acc, m) => ({ ...acc, [m.key]: s.metrics?.[m.key] || 0 }), {}),
        }));

        return (
            <SectionCard title="Anlık Karşılaştırma" collapsible={false}>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 60, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fontWeight: 600 }}
                                angle={-25}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            {metrics.map((m) => (
                                <Bar key={m.key} dataKey={m.key} name={m.label}
                                     fill={m.color} radius={[4, 4, 0, 0]}>
                                    {barData.map((entry, idx) => (
                                        <Cell key={idx} fillOpacity={entry.is_avg ? 0.45 : 1} />
                                    ))}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {snap.map((s) => (
                        <div
                            key={s.key}
                            className={`rounded-lg border p-3 ${
                                s.is_avg
                                    ? 'border-slate-300 bg-slate-50/60 border-dashed'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="w-3 h-3 rounded-sm"
                                    style={{
                                        backgroundColor: colorMap[s.key],
                                        opacity: s.is_avg ? 0.5 : 1,
                                    }}
                                />
                                <span className="font-bold text-sm text-slate-800">{s.label}</span>
                                {s.is_avg && s.population_size > 0 && (
                                    <Tag color="default" className="ml-auto text-[10px]">
                                        {s.population_size} kişi
                                    </Tag>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                <div>
                                    <span className="text-slate-500">Doluluk:</span>{' '}
                                    <span className="font-bold tabular-nums">%{s.metrics?.efficiency_pct}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Çalışma:</span>{' '}
                                    <span className="font-bold tabular-nums">{s.metrics?.worked_hours}sa</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Fazla Mesai:</span>{' '}
                                    <span className="font-bold tabular-nums">{s.metrics?.overtime_hours}sa</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Eksik:</span>{' '}
                                    <span className="font-bold tabular-nums text-red-600">{s.metrics?.missing_hours}sa</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        );
    };

    const renderCompareRadar = () => {
        if (!data || data.mode !== 'compare') return null;
        const snap = data.snapshot || [];
        if (snap.length === 0) return null;
        const radarMetrics = [
            { key: 'efficiency_pct', label: 'N.Doluluk', max: 100 },
            { key: 'total_completion_pct', label: 'T.Doluluk', max: 120 },
            { key: 'ot_to_target_pct', label: 'FM/Y', max: 50 },
            { key: 'missing_to_target_pct', label: 'Eksik/Y', max: 50 },
            { key: 'attendance_pct', label: 'Devam', max: 100 },
        ];
        const radarEntities = snap.map((s, i) => ({
            id: s.key,
            name: s.label,
            color: colorMap[s.key] || `hsl(${i * 60}, 70%, 50%)`,
            metrics: {
                efficiency_pct: s.metrics?.efficiency_pct || 0,
                total_completion_pct: s.metrics?.total_completion_pct || 0,
                ot_to_target_pct: s.metrics?.ot_to_target_pct || 0,
                missing_to_target_pct: s.metrics?.missing_to_target_pct || 0,
                attendance_pct: s.metrics?.attendance_pct || s.metrics?.attendance_rate || 0,
            },
        }));
        return (
            <RadarMetric
                title="Radar Karşılaştırma — 5 metrik"
                subtitle="Tüm metrikler tek görüntüde · alan büyüklüğü genel performansı yansıtır"
                entities={radarEntities}
                metrics={radarMetrics}
                height={400}
                collapsible defaultOpen={true}
            />
        );
    };

    const renderCompareTrend = () => {
        if (!data || data.mode !== 'compare') return null;
        const series = data.time_series || [];
        const ents = data.entities || [];
        const lineData = series.map((p) => ({
            ay: p.period?.slice(5),
            ...ents.reduce(
                (acc, e) => ({ ...acc, [e.key]: p[`${e.key}_efficiency`] ?? 0 }),
                {},
            ),
        }));
        return (
            <SectionCard title="Mesai Doluluğu Trendi (Aylık %)" collapsible={false}>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ay" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 10 }} unit="%" />
                            <RTooltip content={<ChartTooltip unit="%" />} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            {ents.map((e) => (
                                <Line
                                    key={e.key}
                                    type="monotone"
                                    dataKey={e.key}
                                    name={e.label}
                                    stroke={colorMap[e.key]}
                                    strokeWidth={e.is_avg ? 2 : 2.5}
                                    strokeDasharray={e.is_avg ? '5 5' : undefined}
                                    dot={{ r: e.is_avg ? 3 : 4 }}
                                />
                            ))}
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
            { label: 'Normal Doluluk', key: 'efficiency_pct', suffix: '%', betterIsHigher: true },
            { label: 'Toplam Doluluk', key: 'total_completion_pct', suffix: '%', betterIsHigher: true },
            { label: 'Fazla Mesai/Yükümlülük', key: 'ot_to_target_pct', suffix: '%', betterIsHigher: null },
            { label: 'Eksik/Yükümlülük', key: 'missing_to_target_pct', suffix: '%', betterIsHigher: false },
            { label: 'Normal Mesai', key: 'normal_hours', suffix: 'sa', betterIsHigher: true },
            { label: 'Fazla Mesai', key: 'overtime_hours', suffix: 'sa', betterIsHigher: null },
            { label: 'Eksik Saat', key: 'missing_hours', suffix: 'sa', betterIsHigher: false },
        ];
        return (
            <SectionCard
                title={`${data.person.name} — ${data.period_a} vs ${data.period_b}`}
                collapsible={false}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map((c) => {
                        const d = deltas[c.key] || {};
                        const isImproved =
                            c.betterIsHigher === null
                                ? null
                                : c.betterIsHigher
                                ? d.diff > 0
                                : d.diff < 0;
                        const TrendIcon = d.diff > 0 ? TrendingUp : TrendingDown;
                        return (
                            <div
                                key={c.key}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                    {c.label}
                                </div>
                                <div className="flex items-baseline justify-between gap-2 mb-3">
                                    <div>
                                        <div className="text-[9px] text-slate-400">A: {data.period_a}</div>
                                        <div className="text-lg font-bold text-slate-700 tabular-nums">
                                            {d.period_a}{c.suffix}
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-400" />
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-400">B: {data.period_b}</div>
                                        <div className="text-lg font-bold text-slate-700 tabular-nums">
                                            {d.period_b}{c.suffix}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`flex items-center gap-1.5 text-sm font-bold ${
                                        isImproved === null
                                            ? 'text-slate-600'
                                            : isImproved
                                            ? 'text-emerald-600'
                                            : 'text-red-600'
                                    }`}
                                >
                                    <TrendIcon size={14} />
                                    {d.diff >= 0 ? '+' : ''}{d.diff}{c.suffix}
                                    <span className="text-[10px] text-slate-400 ml-auto">
                                        ({d.pct_change >= 0 ? '+' : ''}%{d.pct_change})
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
            <ScopeBanner startDate={startDate} endDate={endDate} />
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
                    <div className="mt-3 text-xs text-slate-500">
                        Karşılaştırma verisi hazırlanıyor…
                    </div>
                </div>
            )}
            {!loading && !data && !error && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <BarChart3 size={32} className="mx-auto mb-2 text-slate-400" />
                    <div className="text-sm text-slate-500">
                        {mode === 'compare' && 'Karşılaştırmak için 1 veya daha fazla varlık seçin'}
                        {mode === 'periods' && 'Çalışan + 2 dönem seçin'}
                    </div>
                </div>
            )}
            {!loading && data && mode === 'compare' && view === 'snapshot' && (
                <>
                    {renderCompareSnapshot()}
                    {renderCompareRadar()}
                </>
            )}
            {!loading && data && mode === 'compare' && view === 'trend' && renderCompareTrend()}
            {!loading && data && mode === 'periods' && renderPeriods()}
        </div>
    );
}
