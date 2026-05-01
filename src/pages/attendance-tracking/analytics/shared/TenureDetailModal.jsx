import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Calendar, Users, Sparkles,
    SortAsc, SortDesc, Filter as FilterIcon, Building2, Layers,
    Briefcase, CheckCircle2, MinusCircle,
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

// Bir liste için yaş ortalaması / medyanı (age=null olanlar hariç)
function computeAgeStats(list) {
    const ages = list.map((e) => e.age).filter((a) => a !== null && a !== undefined);
    if (!ages.length) return { avg: 0, median: 0, count: 0 };
    const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
    const sorted = [...ages].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { avg, median, count: ages.length };
}

// Departman bazlı tutarlı renkler (hash bazlı)
const DEPT_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

function deptColor(dept) {
    if (!dept) return DEPT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < dept.length; i++) {
        hash = (hash * 31 + dept.charCodeAt(i)) >>> 0;
    }
    return DEPT_PALETTE[hash % DEPT_PALETTE.length];
}

// Include/exclude tabanlı facet filtre
function applyFacetFilter(list, key, selected, mode) {
    if (!selected || selected.length === 0) return list;
    const set = new Set(selected);
    if (mode === 'exclude') {
        return list.filter((e) => !set.has(e[key] || '—'));
    }
    return list.filter((e) => set.has(e[key] || '—'));
}

export default function TenureDetailModal({ open, onClose, data }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('months_desc');
    const [bandFilter, setBandFilter] = useState('all');
    const [selectedDepts, setSelectedDepts] = useState([]); // boş = tümü
    const [deptMode, setDeptMode] = useState('include'); // 'include' | 'exclude'
    const [selectedPositions, setSelectedPositions] = useState([]);
    const [positionMode, setPositionMode] = useState('include');
    const [viewMode, setViewMode] = useState('combined'); // 'combined' | 'grouped'

    const allEmployees = useMemo(() => data?.all_employees || [], [data]);

    // Departman çeşitliliği
    const departmentList = useMemo(() => {
        const map = new Map();
        allEmployees.forEach((e) => {
            const dept = e.department || '—';
            map.set(dept, (map.get(dept) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [allEmployees]);

    // Pozisyon çeşitliliği
    const positionList = useMemo(() => {
        const map = new Map();
        allEmployees.forEach((e) => {
            const pos = e.position || '—';
            map.set(pos, (map.get(pos) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [allEmployees]);

    const showDeptFilter = departmentList.length > 1;
    const showPositionFilter = positionList.length > 1;

    // Facet filtreleri uygulanmış kaynak liste — bant/total/stats hesabında kullanılır
    const facetFilteredEmployees = useMemo(() => {
        let list = allEmployees;
        if (showDeptFilter) list = applyFacetFilter(list, 'department', selectedDepts, deptMode);
        if (showPositionFilter) list = applyFacetFilter(list, 'position', selectedPositions, positionMode);
        return list;
    }, [allEmployees, selectedDepts, deptMode, selectedPositions, positionMode, showDeptFilter, showPositionFilter]);

    // Filtreli liste — facet + search + band
    const filtered = useMemo(() => {
        let list = [...facetFilteredEmployees];

        // Search
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((e) => tr(e.name).includes(q) || tr(e.department).includes(q) || tr(e.position).includes(q));
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
            if (sortBy === 'department') {
                const dCmp = String(a.department || '').localeCompare(String(b.department || ''), 'tr');
                if (dCmp !== 0) return dCmp;
                return (b.months || 0) - (a.months || 0);
            }
            if (sortBy === 'position') {
                const pCmp = String(a.position || '').localeCompare(String(b.position || ''), 'tr');
                if (pCmp !== 0) return pCmp;
                return (b.months || 0) - (a.months || 0);
            }
            return 0;
        });
        return list;
    }, [facetFilteredEmployees, search, bandFilter, sortBy]);

    // Chart datası — combined mode için
    const chartData = useMemo(() => filtered.map((e) => ({
        name: shortName(e.name),
        fullName: e.name,
        department: e.department,
        months: e.months || 0,
        age: e.age ?? null,
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
                    age: e.age ?? null,
                    band: getBand(e.months || 0),
                    color: BAND_COLORS[getBand(e.months || 0)],
                })),
            }))
            .sort((a, b) => b.count - a.count);
    }, [filtered]);

    // Bant sayıları — facet filtreli
    const bandCounts = useMemo(() => {
        const counts = { '<1yr': 0, '1-5yr': 0, '5-10yr': 0, '10yr+': 0 };
        facetFilteredEmployees.forEach((e) => { counts[getBand(e.months || 0)]++; });
        return counts;
    }, [facetFilteredEmployees]);

    const totalCount = facetFilteredEmployees.length;
    const overallStats = useMemo(() => computeStats(facetFilteredEmployees), [facetFilteredEmployees]);
    const ageStats = useMemo(() => computeAgeStats(facetFilteredEmployees), [facetFilteredEmployees]);

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
            title: 'Pozisyon',
            dataIndex: 'position',
            sorter: (a, b) => String(a.position || '').localeCompare(String(b.position || ''), 'tr'),
            render: (v) => (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                    <Briefcase size={9} className="text-slate-400" />
                    {v || '—'}
                </span>
            ),
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
            title: <span className="font-semibold text-[12px]">Yaş</span>,
            dataIndex: 'age',
            sorter: (a, b) => {
                const av = a.age == null ? -1 : a.age;
                const bv = b.age == null ? -1 : b.age;
                return av - bv;
            },
            align: 'right',
            render: (v, row) => {
                if (v == null) return <span className="text-slate-300 text-[12px]">—</span>;
                return (
                    <span className="font-bold tabular-nums text-rose-600 text-[13px]" title={row.birth_date ? `Doğum: ${row.birth_date}` : undefined}>
                        {v}
                    </span>
                );
            },
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

    const togglePosition = (pos) => {
        setSelectedPositions((prev) => {
            if (prev.includes(pos)) {
                return prev.filter((p) => p !== pos);
            }
            return [...prev, pos];
        });
    };

    // Reusable facet filter section (dept veya pozisyon)
    const renderFacetFilter = ({
        label, icon: Icon, items, selected, onToggle, mode, onModeChange, onReset, accentClass,
    }) => {
        const isExclude = mode === 'exclude';
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Icon size={13} className={accentClass} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        {label}
                    </span>
                    <span className="text-[10px] text-slate-400">· {items.length} farklı</span>
                    {selected.length > 0 && (
                        <span
                            className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${isExclude ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}
                        >
                            {isExclude ? `${selected.length} hariç` : `${selected.length} seçili`}
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {selected.length > 0 && (
                            <button
                                onClick={onReset}
                                className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                            >
                                <CloseIcon size={10} />
                                Temizle
                            </button>
                        )}
                        <Segmented
                            value={mode}
                            onChange={onModeChange}
                            size="small"
                            options={[
                                { value: 'include', label: <span className="flex items-center gap-1 px-1 text-[11px]"><CheckCircle2 size={10} /> Sadece</span> },
                                { value: 'exclude', label: <span className="flex items-center gap-1 px-1 text-[11px]"><MinusCircle size={10} /> Çıkar</span> },
                            ]}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {items.map((item) => {
                        const isSelected = selected.includes(item.name);
                        let cls;
                        if (isSelected && isExclude) {
                            cls = 'bg-rose-50 border-rose-300 text-rose-700 line-through';
                        } else if (isSelected) {
                            cls = 'bg-indigo-50 border-indigo-300 text-indigo-700';
                        } else if (selected.length > 0 && !isExclude) {
                            cls = 'bg-slate-50 border-slate-200 text-slate-500 opacity-50 hover:opacity-100';
                        } else {
                            cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                        }
                        return (
                            <button
                                key={item.name}
                                onClick={() => onToggle(item.name)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${cls}`}
                            >
                                {item.name}
                                <span className="ml-1.5 text-[9px] tabular-nums opacity-70">({item.count})</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                    {isExclude
                        ? 'Seçili olanlar listeden çıkarılır (gri = listede kalır, kırmızı = hariç)'
                        : (selected.length === 0
                            ? 'Tıklayarak seç (boşken hepsi gösterilir)'
                            : 'Sadece seçili olanlar gösterilir')}
                </div>
            </div>
        );
    };

    // Çalışan adı tek satır Y-axis tick (sadece adı; dept yan panelden gelir)
    const renderSimpleYTick = (props) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={-6} y={0} dy={4} textAnchor="end" fill="#475569" fontSize={10} fontWeight={600}>
                    {payload.value}
                </text>
            </g>
        );
    };

    // Bir tek dept grubu için bar chart (yan panel yok, sadece bars)
    const renderDeptGroupChart = (employees) => {
        const rowHeight = 24;
        const height = Math.max(80, employees.length * rowHeight + 16);
        return (
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={employees}
                        layout="vertical"
                        margin={{ top: 4, right: 60, left: 96, bottom: 4 }}
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
                            width={96}
                            interval={0}
                            tick={renderSimpleYTick}
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
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-slate-600 text-[11px]">Yaş:</span>
                                            <span className="font-black text-rose-600 tabular-nums text-[11px]">
                                                {d.age != null ? `${d.age} yaş` : '—'}
                                            </span>
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
                            {employees.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Yan-panel + chart layoutu: sortBy=department + 2+ dept varsa
    const renderDeptPanelsLayout = (data) => {
        if (!data || data.length === 0) {
            return <div className="py-10"><Empty description="Filtre sonucu yok" /></div>;
        }
        // Dept gruplarına böl
        const groups = [];
        let current = null;
        data.forEach((d) => {
            if (!current || current.dept !== d.department) {
                current = { dept: d.department || '—', employees: [] };
                groups.push(current);
            }
            current.employees.push(d);
        });
        return (
            <div className="space-y-2">
                {groups.map((g) => {
                    const accent = deptColor(g.dept);
                    const stats = computeStats(g.employees);
                    return (
                        <div
                            key={g.dept}
                            className="flex items-stretch rounded-xl overflow-hidden border-2 shadow-sm"
                            style={{
                                borderColor: `${accent}40`,
                                backgroundColor: `${accent}08`,
                            }}
                        >
                            {/* Sol: dept label panel */}
                            <div
                                className="w-36 flex-shrink-0 flex flex-col justify-center items-start px-3 py-3 text-white relative overflow-hidden"
                                style={{ backgroundColor: accent }}
                            >
                                <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                                <div className="relative">
                                    <div className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-80">Departman</div>
                                    <div className="text-[13px] font-black leading-tight mt-0.5 break-words">{g.dept}</div>
                                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                                        <span className="font-bold tabular-nums bg-white/20 px-1.5 py-0.5 rounded">
                                            {g.employees.length} kişi
                                        </span>
                                    </div>
                                    <div className="text-[10px] opacity-90 mt-1">
                                        Ort: <span className="font-bold tabular-nums">{(stats.avg / 12).toFixed(1)}y</span>
                                    </div>
                                </div>
                            </div>
                            {/* Sağ: chart */}
                            <div className="flex-1 min-w-0 p-2">
                                {renderDeptGroupChart(g.employees)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Single chart renderer (basit, dept ayrımı yok)
    // sortBy='department' + 2+ dept = renderDeptPanelsLayout kullanılır (üstte ayrı)
    const renderChart = (data) => {
        if (!data || data.length === 0) {
            return (
                <div className="py-10">
                    <Empty description="Filtre sonucu yok" />
                </div>
            );
        }
        const yAxisWidth = 110;
        const rowHeight = 16;
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
                            tick={renderSimpleYTick}
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
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-slate-600 text-[11px]">Yaş:</span>
                                            <span className="font-black text-rose-600 tabular-nums text-[11px]">
                                                {d.age != null ? `${d.age} yaş` : '—'}
                                            </span>
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
                {/* Görünüm modu (Birleşik / Gruplu) — dept filtresi varsa */}
                {showDeptFilter && (
                    <div className="flex items-center justify-end">
                        <Segmented
                            value={viewMode}
                            onChange={setViewMode}
                            size="small"
                            options={[
                                { value: 'combined', label: <span className="flex items-center gap-1 px-1"><Layers size={10} /> Birleşik Görünüm</span> },
                                { value: 'grouped', label: <span className="flex items-center gap-1 px-1"><Building2 size={10} /> Departmana Göre Grupla</span> },
                            ]}
                        />
                    </div>
                )}

                {/* Departman Filtresi */}
                {showDeptFilter && renderFacetFilter({
                    label: 'Departman Filtresi',
                    icon: Building2,
                    items: departmentList,
                    selected: selectedDepts,
                    onToggle: toggleDept,
                    mode: deptMode,
                    onModeChange: setDeptMode,
                    onReset: () => setSelectedDepts([]),
                    accentClass: 'text-indigo-600',
                })}

                {/* Pozisyon Filtresi (Mühendis vs.) */}
                {showPositionFilter && renderFacetFilter({
                    label: 'Pozisyon Filtresi',
                    icon: Briefcase,
                    items: positionList,
                    selected: selectedPositions,
                    onToggle: togglePosition,
                    mode: positionMode,
                    onModeChange: setPositionMode,
                    onReset: () => setSelectedPositions([]),
                    accentClass: 'text-emerald-600',
                })}

                {/* Hero Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Users size={11} className="text-rose-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Ortalama Yaş</span>
                            </div>
                            {ageStats.count > 0 ? (
                                <>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                                            {ageStats.avg.toFixed(1)}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-semibold">
                                            yaş · medyan {Math.round(ageStats.median)}
                                        </span>
                                    </div>
                                    {ageStats.count < totalCount && (
                                        <div className="text-[9px] text-slate-400 mt-0.5">
                                            {ageStats.count}/{totalCount} kişide doğum tarihi kayıtlı
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-[11px] text-slate-400 italic">Doğum tarihi yok</div>
                            )}
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
                        placeholder="Ad, departman veya pozisyon ara..."
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
                            { value: 'position', label: <span className="text-[11px]">Pozisyon</span> },
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
                                        {renderChart(g.chart)}
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
                        {(sortBy === 'department' && showDeptFilter && new Set(chartData.map((d) => d.department)).size > 1)
                            ? renderDeptPanelsLayout(chartData)
                            : renderChart(chartData)}
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
