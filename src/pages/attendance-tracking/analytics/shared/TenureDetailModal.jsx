import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Calendar, Users, Sparkles,
    SortAsc, SortDesc, Filter as FilterIcon, Building2, Layers,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell, LabelList,
} from 'recharts';

/**
 * TenureDetailModal — Editoryal dashboard, refined typography.
 *
 * Yeni özellikler (kullanıcı talebi):
 *  - Daha küçük/refined typography (text-2xl başlıklar, text-3xl hero rakamlar)
 *  - Departman filtreleme (sadece 2+ farklı dept varsa görünür)
 *  - "Birleşik" / "Gruplu" görünüm toggle (gruplu modda her dept ayrı section)
 */

const BAND_COLORS = {
    '<1yr': '#94a3b8',
    '1-5yr': '#6366f1',
    '5-10yr': '#10b981',
    '10yr+': '#f59e0b',
};

const BAND_LABELS = {
    '<1yr': '< 1 yıl',
    '1-5yr': '1-5 yıl',
    '5-10yr': '5-10 yıl',
    '10yr+': '10+ yıl',
};

const BAND_DESCRIPTIONS = {
    '<1yr': 'Yeni katılan',
    '1-5yr': 'Aktif çekirdek',
    '5-10yr': 'Deneyimli',
    '10yr+': 'Uzun soluklu',
};

function getBand(months) {
    if (months < 12) return '<1yr';
    if (months < 60) return '1-5yr';
    if (months < 120) return '5-10yr';
    return '10yr+';
}

function formatTenure(months) {
    const yrs = Math.floor(months / 12);
    const m = months % 12;
    if (yrs === 0) return `${m}a`;
    if (m === 0) return `${yrs}y`;
    return `${yrs}y ${m}a`;
}

function formatTenureLong(months) {
    const yrs = Math.floor(months / 12);
    const m = months % 12;
    if (yrs === 0) return `${m} ay`;
    if (m === 0) return `${yrs} yıl`;
    return `${yrs} yıl ${m} ay`;
}

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortName(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Bir liste için ortalama / medyan ay
function computeStats(list) {
    if (!list.length) return { avg: 0, median: 0 };
    const months = list.map((e) => e.months || 0);
    const avg = months.reduce((a, b) => a + b, 0) / months.length;
    const sorted = [...months].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { avg, median };
}

export default function TenureDetailModal({ open, onClose, data }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('months_desc');
    const [bandFilter, setBandFilter] = useState('all');
    const [selectedDepts, setSelectedDepts] = useState([]); // boş = tümü
    const [viewMode, setViewMode] = useState('combined'); // 'combined' | 'grouped'

    const allEmployees = useMemo(() => data?.all_employees || [], [data]);

    // Departman çeşitliliği — selectedDepts başlangıç değeri için
    const departmentList = useMemo(() => {
        const map = new Map();
        allEmployees.forEach((e) => {
            const dept = e.department || '—';
            map.set(dept, (map.get(dept) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [allEmployees]);

    const showDeptFilter = departmentList.length > 1;

    // Initial selection: tümü
    React.useEffect(() => {
        if (selectedDepts.length === 0 && departmentList.length > 0) {
            // Tümünü seçili tut (boş = tümü, ama görsel için listeyi de tutuyoruz)
            // Kullanıcı tıkladığında değişir
        }
    }, [departmentList, selectedDepts.length]);

    // Filtreli liste — search + band + dept
    const filtered = useMemo(() => {
        let list = [...allEmployees];

        // Department filter
        if (showDeptFilter && selectedDepts.length > 0) {
            const set = new Set(selectedDepts);
            list = list.filter((e) => set.has(e.department || '—'));
        }

        // Search
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((e) => tr(e.name).includes(q) || tr(e.department).includes(q));
        }

        // Band filter
        if (bandFilter !== 'all') {
            list = list.filter((e) => getBand(e.months || 0) === bandFilter);
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'months_asc') return (a.months || 0) - (b.months || 0);
            if (sortBy === 'months_desc') return (b.months || 0) - (a.months || 0);
            if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
            if (sortBy === 'department') return String(a.department || '').localeCompare(String(b.department || ''), 'tr');
            return 0;
        });
        return list;
    }, [allEmployees, search, bandFilter, sortBy, selectedDepts, showDeptFilter]);

    // Chart datası — combined mode için
    const chartData = useMemo(() => filtered.map((e) => ({
        name: shortName(e.name),
        fullName: e.name,
        department: e.department,
        months: e.months || 0,
        band: getBand(e.months || 0),
        color: BAND_COLORS[getBand(e.months || 0)],
    })), [filtered]);

    // Grouped data — viewMode='grouped' için, dept başına liste
    const groupedData = useMemo(() => {
        const groups = new Map();
        filtered.forEach((e) => {
            const dept = e.department || '—';
            if (!groups.has(dept)) groups.set(dept, []);
            groups.get(dept).push(e);
        });
        return Array.from(groups.entries())
            .map(([dept, emps]) => ({
                dept,
                count: emps.length,
                stats: computeStats(emps),
                employees: emps,
                chart: emps.map((e) => ({
                    name: shortName(e.name),
                    fullName: e.name,
                    department: e.department,
                    months: e.months || 0,
                    band: getBand(e.months || 0),
                    color: BAND_COLORS[getBand(e.months || 0)],
                })),
            }))
            .sort((a, b) => b.count - a.count);
    }, [filtered]);

    // Bant sayıları — overall
    const bandCounts = useMemo(() => {
        const counts = { '<1yr': 0, '1-5yr': 0, '5-10yr': 0, '10yr+': 0 };
        const sourceList = (showDeptFilter && selectedDepts.length > 0)
            ? allEmployees.filter((e) => selectedDepts.includes(e.department || '—'))
            : allEmployees;
        sourceList.forEach((e) => { counts[getBand(e.months || 0)]++; });
        return counts;
    }, [allEmployees, selectedDepts, showDeptFilter]);

    const totalCount = useMemo(() => {
        if (showDeptFilter && selectedDepts.length > 0) {
            return allEmployees.filter((e) => selectedDepts.includes(e.department || '—')).length;
        }
        return allEmployees.length;
    }, [allEmployees, selectedDepts, showDeptFilter]);

    const overallStats = useMemo(() => {
        const sourceList = (showDeptFilter && selectedDepts.length > 0)
            ? allEmployees.filter((e) => selectedDepts.includes(e.department || '—'))
            : allEmployees;
        return computeStats(sourceList);
    }, [allEmployees, selectedDepts, showDeptFilter]);

    const avgYears = overallStats.avg / 12;
    const medianYears = overallStats.median / 12;

    const stackedSegments = ['<1yr', '1-5yr', '5-10yr', '10yr+'].map((band) => {
        const count = bandCounts[band] || 0;
        const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return { band, count, pct };
    }).filter((s) => s.count > 0);

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
            render: (v, row) => {
                const band = getBand(row.months || 0);
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        >
                            {initials(v)}
                        </div>
                        <span className="font-semibold text-slate-700 text-[13px]">{v}</span>
                    </div>
                );
            },
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            sorter: (a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'tr'),
            render: (v) => <span className="text-slate-500 text-[12px]">{v || '—'}</span>,
        },
        {
            title: 'İşe Başlama',
            dataIndex: 'hired_date',
            sorter: (a, b) => String(a.hired_date || '').localeCompare(String(b.hired_date || '')),
            render: (v) => <span className="text-slate-500 tabular-nums text-[12px]">{v || '—'}</span>,
        },
        {
            title: <span className="font-semibold text-[12px]">Kıdem</span>,
            dataIndex: 'months',
            sorter: (a, b) => (a.months || 0) - (b.months || 0),
            defaultSortOrder: 'descend',
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-slate-800 text-[13px]">
                    {formatTenureLong(v || 0)}
                </span>
            ),
        },
        {
            title: 'Bant',
            dataIndex: 'months',
            key: 'band',
            align: 'center',
            render: (v) => {
                const band = getBand(v || 0);
                return (
                    <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                        style={{
                            backgroundColor: `${BAND_COLORS[band]}1a`,
                            color: BAND_COLORS[band],
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BAND_COLORS[band] }} />
                        {BAND_LABELS[band]}
                    </span>
                );
            },
        },
    ];

    // Departmanın tıklama handler'ı (toggle)
    const toggleDept = (dept) => {
        setSelectedDepts((prev) => {
            if (prev.includes(dept)) {
                return prev.filter((d) => d !== dept);
            }
            return [...prev, dept];
        });
    };

    // Custom Y-axis tick: çalışan adı + departman alt satırda
    const renderYAxisTick = (props, dataMap, showDept) => {
        const { x, y, payload } = props;
        const item = dataMap[payload.value];
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={-6}
                    y={showDept ? -3 : 0}
                    dy={showDept ? 0 : 4}
                    textAnchor="end"
                    fill="#475569"
                    fontSize={9}
                    fontWeight={600}
                >
                    {payload.value}
                </text>
                {showDept && item?.department && (
                    <text
                        x={-6}
                        y={9}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize={8}
                        fontStyle="italic"
                    >
                        {String(item.department).length > 18 ? String(item.department).slice(0, 17) + '…' : item.department}
                    </text>
                )}
            </g>
        );
    };

    // Single chart renderer
    // - combinedShowDept: combined modda dept Y-axis'te gözüksün mü (>1 dept varsa true)
    const renderChart = (data, { showDept = false } = {}) => {
        if (!data || data.length === 0) {
            return (
                <div className="py-10">
                    <Empty description="Filtre sonucu yok" />
                </div>
            );
        }
        // Hızlı lookup için map
        const dataMap = data.reduce((acc, d) => { acc[d.name] = d; return acc; }, {});
        const yAxisWidth = showDept ? 160 : 110;
        const rowHeight = showDept ? 22 : 16;
        const height = Math.max(280, Math.min(data.length * rowHeight, 720));
        return (
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 4, right: 70, left: yAxisWidth, bottom: 4 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            tickFormatter={(v) => `${(v / 12).toFixed(1)}y`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={yAxisWidth}
                            interval={0}
                            tick={(props) => renderYAxisTick(props, dataMap, showDept)}
                        />
                        <RTooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl text-xs min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                                style={{ backgroundColor: d.color }}
                                            >
                                                {initials(d.fullName)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[12px]">{d.fullName}</div>
                                                <div className="text-[10px] text-slate-500">{d.department || '—'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                            <span className="text-slate-600 text-[11px]">Kıdem:</span>
                                            <span className="font-black text-slate-900 tabular-nums text-[11px]">{formatTenureLong(d.months)}</span>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        <Bar dataKey="months" radius={[0, 5, 5, 0]} barSize={10}>
                            <LabelList
                                dataKey="months"
                                position="right"
                                formatter={(v) => formatTenure(v)}
                                style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                            />
                            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92%"
            style={{ top: 24, maxWidth: 1400 }}
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            {/* Header */}
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-indigo-100/80">
                        <Calendar size={12} className="text-indigo-600" />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
                        İşgücü Analizi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    Kıdem Dağılımı
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    Tüm bağlı PRIMARY çalışanların işe başlama tarihlerine göre kıdem analizi.
                </p>
            </div>

            <div className="px-7 py-5 space-y-5">
                {/* Departman Filtresi (sadece 2+ dept varsa) */}
                {showDeptFilter && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Building2 size={13} className="text-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                Departman Filtresi
                            </span>
                            <span className="text-[10px] text-slate-400">
                                · {departmentList.length} farklı departman
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                                {selectedDepts.length > 0 && (
                                    <button
                                        onClick={() => setSelectedDepts([])}
                                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <CloseIcon size={10} />
                                        Tümünü Sıfırla
                                    </button>
                                )}
                                <Segmented
                                    value={viewMode}
                                    onChange={setViewMode}
                                    size="small"
                                    options={[
                                        { value: 'combined', label: <span className="flex items-center gap-1 px-1"><Layers size={10} /> Birleşik</span> },
                                        { value: 'grouped', label: <span className="flex items-center gap-1 px-1"><Building2 size={10} /> Gruplu</span> },
                                    ]}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {departmentList.map((d) => {
                                const isActive = selectedDepts.length === 0 || selectedDepts.includes(d.name);
                                return (
                                    <button
                                        key={d.name}
                                        onClick={() => toggleDept(d.name)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${isActive
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        {d.name}
                                        <span className="ml-1.5 text-[9px] tabular-nums opacity-70">({d.count})</span>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedDepts.length > 0 && (
                            <div className="mt-2 text-[10px] text-slate-400">
                                Tıklayarak departman seç (hiçbiri seçili değilken hepsi gösterilir)
                            </div>
                        )}
                    </div>
                )}

                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Users size={11} className="text-indigo-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Çalışan</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{totalCount}</span>
                                <span className="text-[11px] text-slate-400 font-semibold">kişi</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-cyan-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={11} className="text-emerald-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Ortalama Kıdem</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {avgYears.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">yıl</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <SortAsc size={11} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Medyan Kıdem</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {medianYears.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">yıl</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stacked Distribution Bar */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Bant Dağılımı</span>
                            <span className="text-[9px] text-slate-400">— bantı tıklayarak filtrele</span>
                        </div>
                        {bandFilter !== 'all' && (
                            <button
                                onClick={() => setBandFilter('all')}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <CloseIcon size={10} />
                                Filtreyi Kaldır
                            </button>
                        )}
                    </div>
                    <div className="flex items-stretch h-10 rounded-lg overflow-hidden border border-slate-200">
                        {stackedSegments.map((s) => {
                            const isActive = bandFilter === s.band;
                            const isDimmed = bandFilter !== 'all' && !isActive;
                            return (
                                <button
                                    key={s.band}
                                    onClick={() => setBandFilter(isActive ? 'all' : s.band)}
                                    style={{
                                        width: `${s.pct}%`,
                                        backgroundColor: BAND_COLORS[s.band],
                                        opacity: isDimmed ? 0.3 : 1,
                                    }}
                                    className={`relative group transition-all hover:scale-y-105 origin-bottom flex items-center justify-center min-w-[36px] ${isActive ? 'ring-2 ring-offset-1 ring-slate-700' : ''}`}
                                    title={`${BAND_LABELS[s.band]}: ${s.count} kişi (${s.pct.toFixed(0)}%)`}
                                >
                                    <span className="text-[11px] font-black text-white drop-shadow tabular-nums">
                                        {s.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-stretch mt-1.5">
                        {stackedSegments.map((s) => (
                            <div key={s.band} style={{ width: `${s.pct}%` }} className="text-center min-w-[36px]">
                                <div className="text-[9px] font-bold text-slate-700">{BAND_LABELS[s.band]}</div>
                                <div className="text-[8px] text-slate-400">{BAND_DESCRIPTIONS[s.band]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter section */}
                <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                        <FilterIcon size={11} /> Filtre
                    </div>
                    <Input
                        placeholder="Ad veya departman ara..."
                        prefix={<SearchIcon size={12} className="text-slate-400" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                        allowClear
                        size="small"
                    />
                    <Segmented
                        value={sortBy}
                        onChange={setSortBy}
                        size="small"
                        options={[
                            { value: 'months_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Kıdem</span> },
                            { value: 'months_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Kıdem</span> },
                            { value: 'name', label: <span className="text-[11px]">Ad</span> },
                            { value: 'department', label: <span className="text-[11px]">Dept</span> },
                        ]}
                    />
                    <span className="ml-auto text-[10px] text-slate-500">
                        Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {totalCount}
                    </span>
                </div>

                {/* Main content: combined OR grouped */}
                {viewMode === 'grouped' && showDeptFilter ? (
                    <div className="space-y-4">
                        {groupedData.length === 0 ? (
                            <div className="py-10 rounded-xl border border-slate-200 bg-white">
                                <Empty description="Filtre sonucu yok" />
                            </div>
                        ) : (
                            groupedData.map((g) => (
                                <div key={g.dept} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center gap-3 flex-wrap">
                                        <div className="p-1.5 rounded-md bg-indigo-100/60">
                                            <Building2 size={12} className="text-indigo-600" />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800">{g.dept}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
                                            {g.count} kişi
                                        </span>
                                        <span className="ml-auto text-[10px] text-slate-500">
                                            Ort: <span className="font-bold tabular-nums text-slate-700">{(g.stats.avg / 12).toFixed(1)}y</span>
                                            <span className="mx-1.5 text-slate-300">·</span>
                                            Medyan: <span className="font-bold tabular-nums text-slate-700">{(g.stats.median / 12).toFixed(1)}y</span>
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        {renderChart(g.chart, { showDept: false })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* Combined chart */
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                            <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çalışan Bazlı Kıdem</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Her bar tek bir kişi · renk bantını gösterir</div>
                            </div>
                            <div className="flex items-center gap-2.5 text-[9px]">
                                {Object.entries(BAND_COLORS).map(([band, color]) => (
                                    <span key={band} className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-slate-600 font-medium">{BAND_LABELS[band]}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                        {renderChart(chartData, { showDept: showDeptFilter })}
                    </div>
                )}

                {/* Employee table */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 pt-3 pb-2 border-b border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Detaylı Liste</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Sıralanabilir kolonlar · tüm çalışanlar tek sayfada</div>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey={(r) => r.employee_id || r.name}
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </Modal>
    );
}
