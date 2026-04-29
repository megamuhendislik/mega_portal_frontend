import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    User, Clock, AlarmClock, Coffee, TrendingUp, Calendar, Award, Target, BarChart3,
    Users, ChevronLeft, Trophy, AlertTriangle, ArrowUpDown, Search, Building2,
    Activity, Crown, ChevronRight, Zap, Minus,
} from 'lucide-react';
import { Segmented, Empty, Tag } from 'antd';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import ChartTooltip from '../shared/ChartTooltip';
import ScopeBanner from '../shared/ScopeBanner';
import PersonPicker from '../shared/PersonPicker';
import DayDetailDrawer from '../shared/DayDetailDrawer';
import LeaveTimelineModal from '../shared/LeaveTimelineModal';
import AbsenceListModal from '../shared/AbsenceListModal';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area, AreaChart, ComposedChart, Legend, ReferenceLine,
    Cell,
} from 'recharts';

// HH:MM formatter — "s:dd"
const hoursFormatter = (value, name) => {
    if (typeof value === 'number' && value % 1 !== 0) {
        const h = Math.floor(value);
        const m = String(Math.round((value % 1) * 60)).padStart(2, '0');
        return [`${h}:${m}`, name];
    }
    return [value, name];
};

const TR_NORM = (s) => String(s || '').toLocaleLowerCase('tr')
    .replace(/[şçöüğıİ]/g, c => ({ ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', ı: 'i', İ: 'i' })[c]);

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-cyan-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600',
    'from-sky-500 to-blue-600',
    'from-lime-500 to-emerald-600',
];

function gradientFor(id) {
    const n = typeof id === 'number'
        ? id
        : (String(id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    return GRADIENTS[Math.abs(n) % GRADIENTS.length];
}

function levelColor(eff) {
    if (eff >= 95) return '#10b981';
    if (eff >= 80) return '#6366f1';
    if (eff >= 60) return '#f59e0b';
    return '#ef4444';
}

// Eksik/OT yoğunluk renk kodu (yüksek = kırmızı/mor, düşük = yeşil)
function intensityColor(pct) {
    if (pct >= 50) return '#ef4444';     // çok yüksek
    if (pct >= 25) return '#f59e0b';     // yüksek
    if (pct >= 10) return '#6366f1';     // orta
    return '#10b981';                     // düşük
}

// Sayı formatı: null→"—", round
const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const fmtHrs = (v) => `${Math.round(v || 0)}sa`;

// ════════════════════════════════════════════════════════════════════
// EKİP MODE — Tüm ekibe genel bakış
// ════════════════════════════════════════════════════════════════════

function TeamOverviewMode({ onSelectPerson }) {
    const { data, queryParams } = useAnalytics();
    const [employeeHours, setEmployeeHours] = useState([]);
    const [whLoading, setWhLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedDept, setSelectedDept] = useState(null);
    const [sortBy, setSortBy] = useState('normal_completion_desc');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [deptChartMetric, setDeptChartMetric] = useState('normal_completion');

    // work-hours endpoint'inden detaylı çalışan listesi (bulk'ta da var)
    const workHoursFromBulk = data?.work_hours?.employee_hours;

    const fetchWorkHours = useCallback(async () => {
        // Eğer bulk'tan geldiyse kullan
        if (workHoursFromBulk?.length > 0) {
            setEmployeeHours(workHoursFromBulk);
            return;
        }
        if (!queryParams?.start_date) return;
        setWhLoading(true);
        try {
            const res = await api.get('/attendance-analytics/work-hours/', { params: queryParams, timeout: 30000 });
            setEmployeeHours(res.data?.employee_hours || []);
        } catch {
            setEmployeeHours([]);
        } finally {
            setWhLoading(false);
        }
    }, [queryParams, workHoursFromBulk]);

    useEffect(() => { fetchWorkHours(); }, [fetchWorkHours]);

    // Departman bazlı performans (team-overview'dan)
    const deptComparison = data?.team_overview?.department_comparison || [];

    // 4 sıralama paneli için ayrı ayrı top 3'ler
    const eligibleEmployees = useMemo(() => {
        // target_hours > 0 olan (ölçülebilir) çalışanlar
        return employeeHours.filter((e) => (e.has_target ?? (e.target_hours > 0)));
    }, [employeeHours]);

    const topNormalDoluluk = useMemo(() => {
        return [...eligibleEmployees]
            .sort((a, b) => (b.normal_completion_pct ?? b.efficiency_pct ?? 0) - (a.normal_completion_pct ?? a.efficiency_pct ?? 0))
            .slice(0, 3);
    }, [eligibleEmployees]);

    const topOT = useMemo(() => {
        return [...eligibleEmployees]
            .filter((e) => (e.ot_hours || 0) > 0)
            .sort((a, b) => (b.ot_hours || 0) - (a.ot_hours || 0))
            .slice(0, 3);
    }, [eligibleEmployees]);

    const topMissing = useMemo(() => {
        return [...eligibleEmployees]
            .filter((e) => (e.missing_hours || 0) > 0)
            .sort((a, b) => (b.missing_hours || 0) - (a.missing_hours || 0))
            .slice(0, 3);
    }, [eligibleEmployees]);

    const topOTRatio = useMemo(() => {
        return [...eligibleEmployees]
            .filter((e) => e.ot_to_normal_pct != null && (e.normal_hours || 0) > 0)
            .sort((a, b) => (b.ot_to_normal_pct || 0) - (a.ot_to_normal_pct || 0))
            .slice(0, 3);
    }, [eligibleEmployees]);

    // Departman chip listesi
    const deptChips = useMemo(() => {
        const map = new Map();
        employeeHours.forEach((e) => {
            const d = e.department || '—';
            map.set(d, (map.get(d) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [employeeHours]);

    // Filtre + sırala
    const filtered = useMemo(() => {
        let list = [...employeeHours];
        if (selectedDept) {
            list = list.filter((e) => (e.department || '—') === selectedDept);
        }
        if (search) {
            const q = TR_NORM(search);
            list = list.filter((e) => TR_NORM(e.name).includes(q) || TR_NORM(e.department).includes(q));
        }
        list.sort((a, b) => {
            const aN = (x) => (x.normal_completion_pct ?? x.efficiency_pct ?? 0);
            const bN = (x) => (x.normal_completion_pct ?? x.efficiency_pct ?? 0);
            switch (sortBy) {
                case 'normal_completion_desc': return bN(b) - aN(a);
                case 'total_completion_desc': return (b.total_completion_pct || 0) - (a.total_completion_pct || 0);
                case 'normal_hours_desc': return (b.normal_hours || 0) - (a.normal_hours || 0);
                case 'ot_desc': return (b.ot_hours || 0) - (a.ot_hours || 0);
                case 'missing_desc': return (b.missing_hours || 0) - (a.missing_hours || 0);
                case 'ot_ratio_desc': return (b.ot_to_normal_pct || 0) - (a.ot_to_normal_pct || 0);
                case 'name': return String(a.name).localeCompare(String(b.name), 'tr');
                default: return 0;
            }
        });
        return list;
    }, [employeeHours, search, selectedDept, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const resetPage = useCallback(() => { setPage(1); }, []);
    useEffect(() => { resetPage(); }, [search, selectedDept, sortBy, pageSize, resetPage]);

    if (whLoading && employeeHours.length === 0) {
        return <LoadingSkeleton rows={4} />;
    }

    if (employeeHours.length === 0) {
        return <EmptyState icon={Users} message="Bu dönem için ekip verisi bulunamadı" />;
    }

    // Ranking panel renderer (her metrik için yeniden kullanılır)
    const renderRanking = (items, valueKey, valueFmt, hintKey, hintFmt, palette) => {
        if (!items || items.length === 0) return <Empty description="Veri yok" />;
        const c = palette; // {border, bg, hover, text, badge}
        return (
            <div className="space-y-2">
                {items.map((e, i) => (
                    <button
                        key={e.employee_id}
                        onClick={() => onSelectPerson?.(e.employee_id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border ${c.border} bg-gradient-to-r ${c.bg} ${c.hover} hover:shadow-md transition-all text-left group`}
                    >
                        <div className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full ${c.badge} text-white font-black text-xs`}>
                            {i + 1}
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(e.employee_id)} text-white shadow-sm flex-shrink-0`}>
                            <span className="text-xs font-black">{initials(e.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold text-slate-800 text-sm truncate group-hover:${c.text}`}>{e.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{e.department || '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-black ${c.text} tabular-nums leading-none`}>
                                {valueFmt(e[valueKey])}
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                {hintFmt(e[hintKey])}
                            </p>
                        </div>
                        <ChevronRight size={14} className={`text-slate-300 group-hover:${c.text} flex-shrink-0`} />
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {/* 4 SIRALAMA PANELİ — 2x2 grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    title="En Yüksek Mesai Doluluğu"
                    icon={Crown}
                    iconGradient="from-emerald-500 to-teal-600"
                    subtitle="Normal mesai / Yükümlülük"
                    collapsible={false}
                >
                    {renderRanking(
                        topNormalDoluluk,
                        'normal_completion_pct',
                        (v) => `%${v ?? 0}`,
                        'normal_hours',
                        (v) => `${Math.round(v || 0)}sa normal`,
                        {
                            border: 'border-emerald-200',
                            bg: 'from-emerald-50/50 to-white',
                            hover: 'hover:border-emerald-300',
                            text: 'text-emerald-700',
                            badge: 'bg-emerald-600',
                        },
                    )}
                </SectionCard>

                <SectionCard
                    title="En Çok Fazla Mesai"
                    icon={Zap}
                    iconGradient="from-amber-500 to-orange-600"
                    subtitle="OT saat (mutlak)"
                    collapsible={false}
                >
                    {renderRanking(
                        topOT,
                        'ot_hours',
                        (v) => `${Math.round(v || 0)}sa`,
                        'ot_to_normal_pct',
                        (v) => (v == null ? 'Normal yok' : `OT/N: %${Math.round(v)}`),
                        {
                            border: 'border-amber-200',
                            bg: 'from-amber-50/50 to-white',
                            hover: 'hover:border-amber-300',
                            text: 'text-amber-700',
                            badge: 'bg-amber-600',
                        },
                    )}
                </SectionCard>

                <SectionCard
                    title="En Çok Eksik Mesai"
                    icon={AlertTriangle}
                    iconGradient="from-red-500 to-rose-600"
                    subtitle="Eksik saat (mutlak)"
                    collapsible={false}
                >
                    {renderRanking(
                        topMissing,
                        'missing_hours',
                        (v) => `${Math.round(v || 0)}sa`,
                        'missing_to_target_pct',
                        (v) => `Eksik/Y: ${fmtPct(v)}`,
                        {
                            border: 'border-red-200',
                            bg: 'from-red-50/50 to-white',
                            hover: 'hover:border-red-300',
                            text: 'text-red-700',
                            badge: 'bg-red-500',
                        },
                    )}
                </SectionCard>

                <SectionCard
                    title="En Yüksek OT/Normal Oranı"
                    icon={TrendingUp}
                    iconGradient="from-violet-500 to-fuchsia-600"
                    subtitle="OT yoğunluğu (Normal'e oranla)"
                    collapsible={false}
                >
                    {renderRanking(
                        topOTRatio,
                        'ot_to_normal_pct',
                        (v) => fmtPct(v),
                        'ot_hours',
                        (v) => `${Math.round(v || 0)}sa OT`,
                        {
                            border: 'border-violet-200',
                            bg: 'from-violet-50/50 to-white',
                            hover: 'hover:border-violet-300',
                            text: 'text-violet-700',
                            badge: 'bg-violet-600',
                        },
                    )}
                </SectionCard>
            </div>

            {/* Departman Kıyaslaması — 4 metrik segmented */}
            {deptComparison.length > 0 && (() => {
                const metricMap = {
                    normal_completion: {
                        key: 'avg_normal_completion_pct',
                        legacy: 'avg_efficiency_pct',
                        label: 'Normal Doluluk',
                        unit: '%',
                        color: levelColor,
                        ref: 80,
                    },
                    total_completion: {
                        key: 'avg_total_completion_pct',
                        label: 'Toplam Doluluk (N+OT)',
                        unit: '%',
                        color: (v) => (v >= 100 ? '#7c3aed' : levelColor(v)),
                        ref: 100,
                    },
                    ot_to_target: {
                        key: 'avg_ot_to_target_pct',
                        label: 'OT / Yükümlülük',
                        unit: '%',
                        color: intensityColor,
                        ref: null,
                    },
                    missing_to_target: {
                        key: 'avg_missing_to_target_pct',
                        label: 'Eksik / Yükümlülük',
                        unit: '%',
                        color: intensityColor,
                        ref: null,
                    },
                };
                const m = metricMap[deptChartMetric];
                const chartData = deptComparison.map((d) => ({
                    name: d.department_name || '—',
                    value: d[m.key] ?? d[m.legacy] ?? 0,
                    employee_count: d.employee_count,
                }));
                return (
                    <SectionCard
                        title="Departman Kıyaslamaları"
                        icon={Building2}
                        iconGradient="from-violet-500 to-purple-600"
                        subtitle="Metriği seç → çubuğa tıkla → tabloyu filtrele"
                        collapsible={false}
                    >
                        <div className="mb-3">
                            <Segmented
                                size="small"
                                value={deptChartMetric}
                                onChange={setDeptChartMetric}
                                options={[
                                    { value: 'normal_completion', label: <span className="text-[10px] font-bold">Normal Doluluk</span> },
                                    { value: 'total_completion', label: <span className="text-[10px] font-bold">Toplam Doluluk</span> },
                                    { value: 'ot_to_target', label: <span className="text-[10px] font-bold">OT/Yükümlülük</span> },
                                    { value: 'missing_to_target', label: <span className="text-[10px] font-bold">Eksik/Yükümlülük</span> },
                                ]}
                            />
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    onClick={(state) => {
                                        if (state?.activeLabel) setSelectedDept(state.activeLabel);
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 10 }} unit={m.unit} />
                                    <Tooltip content={<ChartTooltip unit={m.unit} />} />
                                    {m.ref != null && (
                                        <ReferenceLine y={m.ref} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} />
                                    )}
                                    <Bar dataKey="value" name={m.label} radius={[6, 6, 0, 0]} cursor="pointer">
                                        {chartData.map((d, i) => (
                                            <Cell key={i} fill={m.color(d.value || 0)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                            Metrikleri segment'le değiştir. Çubuğa tıklayarak alttaki tabloyu o departmanla filtreleyebilirsiniz.
                        </p>
                    </SectionCard>
                );
            })()}

            {/* Tüm Ekip Mesai Tablosu */}
            <SectionCard
                title="Tüm Ekip Mesai Tablosu"
                icon={Users}
                iconGradient="from-indigo-500 to-blue-600"
                subtitle={`${filtered.length} / ${employeeHours.length} çalışan`}
                collapsible={false}
                headerExtra={
                    <button
                        onClick={() => { setSearch(''); setSelectedDept(null); setSortBy('normal_completion_desc'); }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50"
                    >
                        Filtreleri Sıfırla
                    </button>
                }
            >
                {/* Filtreler */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ad veya departman ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                    </div>

                    {deptChips.length > 1 && (
                        <div className="flex items-center gap-1 flex-wrap">
                            <button
                                onClick={() => setSelectedDept(null)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${selectedDept === null
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                            >
                                Tümü
                            </button>
                            {deptChips.slice(0, 6).map((d) => (
                                <button
                                    key={d.name}
                                    onClick={() => setSelectedDept(selectedDept === d.name ? null : d.name)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${selectedDept === d.name
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    {d.name} <span className="opacity-60">({d.count})</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        <Segmented
                            size="small"
                            value={sortBy}
                            onChange={setSortBy}
                            options={[
                                { value: 'normal_completion_desc', label: <span className="text-[10px]">N.Doluluk ↓</span> },
                                { value: 'total_completion_desc', label: <span className="text-[10px]">T.Doluluk ↓</span> },
                                { value: 'normal_hours_desc', label: <span className="text-[10px]">Normal ↓</span> },
                                { value: 'ot_desc', label: <span className="text-[10px]">OT ↓</span> },
                                { value: 'missing_desc', label: <span className="text-[10px]">Eksik ↓</span> },
                                { value: 'ot_ratio_desc', label: <span className="text-[10px]">OT/N ↓</span> },
                                { value: 'name', label: <span className="text-[10px]">A-Z</span> },
                            ]}
                        />
                    </div>
                </div>

                {/* Tablo */}
                {filtered.length === 0 ? (
                    <div className="py-10">
                        <Empty description="Eşleşen çalışan yok" />
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead className="bg-slate-50/80">
                                <tr className="border-b border-slate-200">
                                    {[
                                        { key: 'name', label: 'Çalışan', align: 'left' },
                                        { key: 'department', label: 'Departman', align: 'left' },
                                        { key: 'normal', label: 'Normal', align: 'right', tip: 'Net normal mesai (OT hariç)' },
                                        { key: 'ot', label: 'OT', align: 'right', tip: 'Fazla mesai' },
                                        { key: 'missing', label: 'Eksik', align: 'right', tip: 'Eksik mesai' },
                                        { key: 'normal_completion', label: 'N. Doluluk', align: 'left', tip: 'Normal / Yükümlülük' },
                                        { key: 'total_completion', label: 'T. Doluluk', align: 'left', tip: '(Normal+OT) / Yükümlülük' },
                                        { key: 'ot_to_target', label: 'OT/Y', align: 'right', tip: 'OT / Yükümlülük' },
                                        { key: 'missing_to_target', label: 'Eksik/Y', align: 'right', tip: 'Eksik / Yükümlülük' },
                                        { key: 'target', label: 'Hedef', align: 'right', tip: 'Aylık tam hedef' },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            title={col.tip}
                                            className={`py-2.5 px-3 text-[9px] text-slate-500 uppercase font-black tracking-wider text-${col.align}`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((e) => {
                                    const nDol = e.normal_completion_pct ?? e.efficiency_pct ?? 0;
                                    const tDol = e.total_completion_pct ?? 0;
                                    const otY = e.ot_to_target_pct ?? 0;
                                    const eksY = e.missing_to_target_pct ?? 0;
                                    const noTarget = !(e.has_target ?? (e.target_hours > 0));
                                    return (
                                        <tr
                                            key={e.employee_id}
                                            onClick={() => onSelectPerson?.(e.employee_id)}
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                                        >
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(e.employee_id)} text-white shadow-sm flex-shrink-0`}>
                                                        <span className="text-[10px] font-black">{initials(e.name)}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-[12px] group-hover:text-indigo-700">{e.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">{e.department || '—'}</td>
                                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-700 text-[12px]">{fmtHrs(e.normal_hours)}</td>
                                            <td className="py-2.5 px-3 text-right tabular-nums text-amber-600 font-bold text-[12px]">{fmtHrs(e.ot_hours)}</td>
                                            <td className="py-2.5 px-3 text-right tabular-nums text-red-500 font-bold text-[12px]">{fmtHrs(e.missing_hours)}</td>
                                            <td className="py-2.5 px-3">
                                                {noTarget ? <span className="text-slate-400 text-[11px]">—</span> : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{ width: `${Math.min(100, nDol)}%`, backgroundColor: levelColor(nDol) }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black tabular-nums" style={{ color: levelColor(nDol), minWidth: '32px' }}>
                                                            %{nDol}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {noTarget ? <span className="text-slate-400 text-[11px]">—</span> : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{
                                                                    width: `${Math.min(100, tDol)}%`,
                                                                    backgroundColor: tDol >= 100 ? '#7c3aed' : levelColor(tDol),
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black tabular-nums" style={{ color: tDol >= 100 ? '#7c3aed' : levelColor(tDol), minWidth: '32px' }}>
                                                            %{tDol}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[12px]" style={{ color: intensityColor(otY) }}>
                                                {noTarget ? '—' : `%${otY}`}
                                            </td>
                                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[12px]" style={{ color: intensityColor(eksY) }}>
                                                {noTarget ? '—' : `%${eksY}`}
                                            </td>
                                            <td className="py-2.5 px-3 text-right tabular-nums text-slate-500 text-[12px]">{fmtHrs(e.target_hours)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between mt-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium">Sayfa boyutu:</span>
                            <Segmented
                                size="small"
                                value={pageSize}
                                onChange={setPageSize}
                                options={[
                                    { value: 25, label: <span className="text-[10px]">25</span> },
                                    { value: 50, label: <span className="text-[10px]">50</span> },
                                    { value: 100, label: <span className="text-[10px]">100</span> },
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-bold text-slate-600"
                            >
                                ← Önceki
                            </button>
                            <span className="text-slate-500 tabular-nums">
                                Sayfa <strong className="text-slate-700">{page}</strong> / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-bold text-slate-600"
                            >
                                Sonraki →
                            </button>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════
// KİŞİSEL MODE — Bir kişinin detaylı analizi
// ════════════════════════════════════════════════════════════════════

function PersonalDetailMode({ selectedId, setSelectedId, onBack }) {
    const { employees, queryParams } = useAnalytics();
    const [personalData, setPersonalData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Day detail drawer
    const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    // Modal'lar
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false);

    useEffect(() => {
        if (!selectedId) return undefined;
        let cancelled = false;
        // setState'leri microtask'a ertele — react-hooks/set-state-in-effect uyumlu
        Promise.resolve().then(() => {
            if (!cancelled) setLoading(true);
        });
        api.get('/attendance-analytics/', {
            params: { ...queryParams, employee_id: selectedId },
        })
            .then((res) => {
                if (cancelled) return;
                setPersonalData(res.data);
            })
            .catch(() => {
                if (cancelled) return;
                setPersonalData(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [selectedId, queryParams]);

    // Daily hours (Composed chart)
    const dailyHours = useMemo(() => {
        if (!personalData?.daily_hours) return [];
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        return personalData.daily_hours.map((d) => {
            const dt = new Date(d.date + 'T00:00:00');
            const dayName = dayNames[dt.getDay()];
            return {
                date: `${d.date?.slice(8)}/${d.date?.slice(5, 7)}`,
                fullDate: d.date,
                dayLabel: `${dayName} ${d.date?.slice(8)}`,
                normal: Math.round((d.worked - (d.ot || 0)) * 10) / 10,
                ot: Math.round((d.ot || 0) * 10) / 10,
                hedef: d.target || 8,
                status: d.status,
                worked: d.worked,
                _raw: d,
            };
        });
    }, [personalData]);

    // Entry/exit chart
    const entryExitData = useMemo(() => {
        if (!personalData?.entry_exit) return [];
        return personalData.entry_exit.map((d) => {
            const parseTime = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h + m / 60; };
            return {
                date: `${d.date?.slice(8)}/${d.date?.slice(5, 7)}`,
                fullDate: d.date,
                'giriş': parseTime(d.first_check_in),
                'çıkış': parseTime(d.last_check_out),
                first_check_in: d.first_check_in,
                last_check_out: d.last_check_out,
            };
        });
    }, [personalData]);

    // Entry-exit map for day detail drawer lookup
    const entryExitMap = useMemo(() => {
        const m = new Map();
        (personalData?.entry_exit || []).forEach((d) => m.set(d.date, d));
        return m;
    }, [personalData]);

    // Weekly pattern
    const weeklyPattern = useMemo(() => {
        if (!personalData?.weekly_pattern) return [];
        const dayNames = { MON: 'Pazartesi', TUE: 'Salı', WED: 'Çarşamba', THU: 'Perşembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
        return Object.entries(personalData.weekly_pattern).map(([k, v]) => ({
            day: dayNames[k] || k,
            saat: v,
            fill: v >= 8 ? '#10b981' : v >= 6 ? '#6366f1' : v >= 4 ? '#f59e0b' : '#ef4444',
        }));
    }, [personalData]);

    const calendarData = useMemo(() => personalData?.calendar || [], [personalData]);
    const statusColors = {
        full: 'bg-emerald-400 hover:bg-emerald-500',
        partial: 'bg-amber-400 hover:bg-amber-500',
        absent: 'bg-red-400 hover:bg-red-500',
        off: 'bg-slate-200 hover:bg-slate-300',
        future: 'bg-slate-100 hover:bg-slate-200',
    };

    const kpi = personalData?.kpi;
    const summary = personalData?.summary;
    const selectedEmp = employees.find((e) => e.id === selectedId);
    const selectedEmpName = selectedEmp?.name || selectedEmp?.full_name || '';

    // Daily map for absence modal
    const dailyHoursRaw = personalData?.daily_hours || [];

    // Calendar click → open drawer with day detail
    const handleCalendarClick = (day) => {
        if (!day || day.status === 'future') return;
        const daily = dailyHours.find((d) => d.fullDate === day.date);
        // If we have detailed daily hours, use them; otherwise build a stub
        const dayDetail = daily ? daily._raw : { date: day.date, worked: 0, ot: 0, target: 8, status: day.status === 'absent' ? 'ABSENT' : '' };
        setSelectedDay({ ...dayDetail, calendarStatus: day.status });
        setDayDrawerOpen(true);
    };

    if (loading) return <LoadingSkeleton rows={4} />;

    return (
        <div className="space-y-5">
            {/* Geri butonu + PersonPicker */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[12px] font-bold text-slate-600 hover:text-indigo-700 transition-all"
                >
                    <ChevronLeft size={14} /> Ekip Listesine Dön
                </button>
            </div>

            <PersonPicker
                employees={employees}
                selectedId={selectedId}
                onChange={setSelectedId}
            />

            {!personalData ? (
                <EmptyState message="Kişi seçin" />
            ) : (
                <>
                    {/* Selected emp info banner */}
                    {selectedEmp && (
                        <div className="bg-gradient-to-r from-indigo-50/60 via-white to-blue-50/40 rounded-2xl border border-indigo-200/60 p-4 flex items-center gap-4 shadow-sm">
                            <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(selectedEmp.id)} text-white shadow-md flex-shrink-0`}>
                                <span className="text-base font-black tracking-tight">{initials(selectedEmpName)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-slate-800 truncate">{selectedEmpName}</h3>
                                <p className="text-[11px] text-slate-500 truncate font-medium">
                                    {selectedEmp.department_name || selectedEmp.department || '—'}
                                    {selectedEmp.title && <span className="ml-2 text-slate-400">· {selectedEmp.title}</span>}
                                </p>
                            </div>
                            {personalData.period && (
                                <div className="text-right flex-shrink-0">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dönem</div>
                                    <div className="text-[11px] font-bold text-slate-700 tabular-nums">
                                        {personalData.period.start_date?.slice(5)} – {personalData.period.end_date?.slice(5)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5 KPI cards */}
                    {kpi && (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <KPICard
                                title="Çalışma" value={kpi.total_worked_hours} suffix="saat" icon={Clock}
                                gradient="indigo" delta={kpi.vs_prev?.worked} info={METRIC_EXPLANATIONS.worked_hours}
                            />
                            <KPICard
                                title="Verimlilik" value={`${kpi.efficiency_pct}`} suffix="%" icon={Target}
                                gradient="emerald" delta={kpi.vs_prev?.efficiency} info={METRIC_EXPLANATIONS.efficiency}
                            />
                            <KPICard
                                title="Ek Mesai" value={kpi.overtime_hours} suffix="saat" icon={TrendingUp}
                                gradient="amber" delta={kpi.vs_prev?.ot} info={METRIC_EXPLANATIONS.overtime}
                            />
                            <KPICard
                                title="Kayıp" value={kpi.missing_hours} suffix="saat" icon={BarChart3}
                                gradient="red" delta={kpi.vs_prev?.missing} info={METRIC_EXPLANATIONS.missing_hours}
                            />
                            <KPICard
                                title="Ort. Mola" value={kpi.avg_break_minutes} suffix="dk" icon={Coffee}
                                gradient="cyan" info={METRIC_EXPLANATIONS.break_minutes}
                            />
                        </div>
                    )}

                    {/* 4 mini summary KPI */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Ort. Giriş', value: summary.avg_check_in || '—', icon: AlarmClock, color: 'emerald' },
                                { label: 'Ort. Çıkış', value: summary.avg_check_out || '—', icon: AlarmClock, color: 'indigo' },
                                { label: 'Dakiklik', value: `${summary.punctuality_pct || 0}%`, icon: Award, color: 'amber' },
                                { label: 'Yemek Oranı', value: `${summary.meal_orders || 0}/${summary.meal_working_days || 0}`, icon: Coffee, color: 'cyan' },
                            ].map((item, i) => (
                                <KPICard key={i} mini title={item.label} value={item.value} icon={item.icon} gradient={item.color} />
                            ))}
                        </div>
                    )}

                    {/* Daily hours composed chart */}
                    <SectionCard
                        title="Günlük Çalışma Saatleri" icon={Clock} iconGradient="from-indigo-500 to-indigo-600"
                        subtitle="Normal ve ek mesai saatleri — hedef çizgisi ile"
                    >
                        {dailyHours.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dailyHours} barGap={0} barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="dayLabel" tick={{ fontSize: 9, fontWeight: 600 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} unit="h" />
                                        <Tooltip content={<ChartTooltip formatter={hoursFormatter} />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                                            label={{ value: 'Hedef 8h', position: 'right', style: { fontSize: 9, fill: '#ef4444' } }} />
                                        <Bar dataKey="normal" name="Normal" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="ot" name="Ek Mesai" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Günlük veri yok" />}
                    </SectionCard>

                    {/* Entry-exit area chart */}
                    <SectionCard
                        title="Giriş — Çıkış Saatleri Trendi" icon={AlarmClock} iconGradient="from-cyan-500 to-blue-600"
                        subtitle="Gün bazlı ilk giriş ve son çıkış zaman çizgisi"
                    >
                        {entryExitData.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={entryExitData}>
                                        <defs>
                                            <linearGradient id="gradEntry" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradExit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 600 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 10 }} domain={[6, 22]}
                                            tickFormatter={(v) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`} />
                                        <Tooltip content={<ChartTooltip formatter={hoursFormatter} />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <ReferenceLine y={9} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
                                            label={{ value: '09:00', position: 'left', style: { fontSize: 9, fill: '#94a3b8' } }} />
                                        <Area type="monotone" dataKey="giriş" name="Giriş" stroke="#10b981" strokeWidth={2.5}
                                            fill="url(#gradEntry)" dot={{ r: 2.5, fill: '#10b981' }} activeDot={{ r: 5 }} />
                                        <Area type="monotone" dataKey="çıkış" name="Çıkış" stroke="#6366f1" strokeWidth={2.5}
                                            fill="url(#gradExit)" dot={{ r: 2.5, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Giriş/çıkış verisi yok" />}
                    </SectionCard>

                    {/* Weekly pattern + Calendar */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <SectionCard
                            title="Haftalık Çalışma Örüntüsü" icon={TrendingUp} iconGradient="from-violet-500 to-purple-600"
                            subtitle="Ortalama gün bazlı çalışma saatleri"
                        >
                            {weeklyPattern.length > 0 ? (
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyPattern} barSize={32}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} />
                                            <YAxis tick={{ fontSize: 10 }} domain={[0, 12]} />
                                            <Tooltip content={<ChartTooltip formatter={hoursFormatter} />} />
                                            <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1} />
                                            <Bar dataKey="saat" name="Ort. Saat" radius={[8, 8, 0, 0]}>
                                                {weeklyPattern.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <EmptyState message="Haftalık veri yok" />}
                        </SectionCard>

                        {/* Calendar heatmap (TIKLANABILIR) */}
                        <SectionCard
                            title="Devam Takvimi" icon={Calendar} iconGradient="from-blue-500 to-blue-600"
                            subtitle="Bir güne tıklayarak detayını görün"
                        >
                            {calendarData.length > 0 ? (
                                <div>
                                    <div className="grid grid-cols-7 gap-1.5 mb-3">
                                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                                            <div key={d} className="text-[9px] font-bold text-slate-400 text-center uppercase">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {(() => {
                                            const firstDate = new Date(calendarData[0]?.date + 'T00:00:00');
                                            const dow = (firstDate.getDay() + 6) % 7;
                                            return Array.from({ length: dow }, (_, i) => <div key={`pad-${i}`} className="w-full aspect-square" />);
                                        })()}
                                        {calendarData.map((d, i) => {
                                            const isClickable = d.status !== 'future';
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => isClickable && handleCalendarClick(d)}
                                                    disabled={!isClickable}
                                                    className={`w-full aspect-square rounded-md transition-all relative group ${statusColors[d.status] || 'bg-slate-100'} ${isClickable ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-300 hover:z-10' : 'cursor-not-allowed opacity-60'}`}
                                                    title={`${d.date}: ${d.status}`}
                                                >
                                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {d.date?.slice(8)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-3 mt-3 text-[9px] font-bold text-slate-400 flex-wrap">
                                        {Object.entries({ full: 'Tam', partial: 'Kısmi', absent: 'Devamsız', off: 'Tatil' }).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1">
                                                <div className={`w-3 h-3 rounded ${statusColors[k]}`} />
                                                {v}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-2 text-center italic">
                                        Bir güne tıklayarak çalışma detayını görüntüleyin
                                    </p>
                                </div>
                            ) : <EmptyState message="Takvim verisi yok" />}
                        </SectionCard>
                    </div>

                    {/* İzin / Devamsızlık paneli — TIKLANABILIR kartlar */}
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* İzin Durumu — clickable */}
                            <button
                                onClick={() => setLeaveModalOpen(true)}
                                className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">İzin Durumu</h4>
                                    <span className="text-[9px] font-bold text-violet-500 group-hover:text-violet-700 flex items-center gap-0.5">
                                        Detay <ChevronRight size={10} />
                                    </span>
                                </div>
                                <KPIProgressBar
                                    label="Kullanılan İzin"
                                    value={summary.leave_used || 0}
                                    max={summary.leave_total || 14}
                                    suffix={` / ${summary.leave_total || 0} gün`}
                                    color="#8b5cf6"
                                />
                                <p className="text-[10px] text-slate-400">
                                    Kalan: <strong className="text-slate-600">{Math.max(0, (summary.leave_total || 0) - (summary.leave_used || 0))} gün</strong>
                                </p>
                            </button>

                            {/* Devamsızlık — clickable */}
                            <button
                                onClick={() => setAbsenceModalOpen(true)}
                                className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 hover:border-red-300 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Devamsızlık</h4>
                                    <span className="text-[9px] font-bold text-red-500 group-hover:text-red-700 flex items-center gap-0.5">
                                        Liste <ChevronRight size={10} />
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-red-500">
                                    {summary.absence_days || 0}<span className="text-sm text-slate-400 ml-1">gün</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Bu dönemdeki tüm devamsız günler</p>
                            </button>

                            {/* En Erken Giriş — sade, tıklanmaz */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Erken Giriş</h4>
                                <div className="text-2xl font-black text-emerald-600">{summary.earliest_check_in?.time || '—'}</div>
                                <p className="text-[10px] text-slate-400">{summary.earliest_check_in?.date || ''}</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Day detail drawer */}
            <DayDetailDrawer
                open={dayDrawerOpen}
                onClose={() => setDayDrawerOpen(false)}
                day={selectedDay}
                employeeName={selectedEmpName}
                calendarStatus={selectedDay?.calendarStatus}
                entryExit={selectedDay?.date ? entryExitMap.get(selectedDay.date) : null}
            />

            {/* Leave timeline modal */}
            <LeaveTimelineModal
                open={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
                employeeId={selectedId}
                employeeName={selectedEmpName}
                leaveUsed={summary?.leave_used}
                leaveTotal={summary?.leave_total}
            />

            {/* Absence list modal */}
            <AbsenceListModal
                open={absenceModalOpen}
                onClose={() => setAbsenceModalOpen(false)}
                calendarData={calendarData}
                employeeName={selectedEmpName}
                dailyHours={dailyHoursRaw}
            />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════
// MAIN — PerformanceTab
// ════════════════════════════════════════════════════════════════════

export default function PerformanceTab() {
    const { employees, startDate, endDate } = useAnalytics();
    const [mode, setMode] = useState('team'); // 'team' | 'personal'
    const [selectedId, setSelectedId] = useState(null);

    const handleSelectPerson = useCallback((id) => {
        setSelectedId(id);
        setMode('personal');
    }, []);

    const handleBack = useCallback(() => {
        setMode('team');
    }, []);

    // Auto-select first employee when entering personal mode without selection
    useEffect(() => {
        if (mode === 'personal' && !selectedId && employees.length > 0) {
            // setState'i microtask'a ertele — react-hooks/set-state-in-effect uyumlu
            Promise.resolve().then(() => setSelectedId(employees[0].id));
        }
    }, [mode, selectedId, employees]);

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* Header — Mode toggle */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-600" />
                        Mesai Analizi
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {mode === 'team'
                            ? 'Normal mesai, fazla mesai (OT) ve eksik mesai dağılımı'
                            : 'Seçili çalışanın detaylı mesai verileri'}
                    </p>
                </div>
                <Segmented
                    value={mode}
                    onChange={setMode}
                    size="middle"
                    options={[
                        {
                            value: 'team',
                            label: <span className="flex items-center gap-1.5 px-1 font-bold"><Users size={12} /> Ekip Geneli</span>,
                        },
                        {
                            value: 'personal',
                            label: <span className="flex items-center gap-1.5 px-1 font-bold"><User size={12} /> Kişisel Detay</span>,
                        },
                    ]}
                />
            </div>

            {mode === 'team' ? (
                <TeamOverviewMode onSelectPerson={handleSelectPerson} />
            ) : (
                <PersonalDetailMode
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
