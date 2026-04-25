import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, UserCheck, Users, Sparkles,
    SortAsc, SortDesc, Filter as FilterIcon, Building2, Layers,
    AlertTriangle,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, LabelList,
} from 'recharts';

/**
 * SpanDetailModal — Yönetici yükü genişletilmiş görünüm.
 * Pattern: TenureDetailModal ile aynı (band, dept paneller, filtre, search).
 *
 * Bantlar (hierarchical total_managed):
 *   critical (>=26) → kırmızı, "Aşırı Yük"
 *   high (11-25)    → turuncu, "Yoğun"
 *   normal (4-10)   → emerald, "Normal"
 *   light (1-3)     → slate, "Az Ekipli"
 */

const BAND_COLORS = {
    light: '#94a3b8',
    normal: '#10b981',
    high: '#f59e0b',
    critical: '#ef4444',
};

const BAND_LABELS = {
    light: 'Az Ekipli',
    normal: 'Normal',
    high: 'Yoğun',
    critical: 'Aşırı Yük',
};

const BAND_DESCRIPTIONS = {
    light: '1-3 kişi',
    normal: '4-10 kişi',
    high: '11-25 kişi',
    critical: '26+ kişi',
};

function getBand(total) {
    if (total >= 26) return 'critical';
    if (total >= 11) return 'high';
    if (total >= 4) return 'normal';
    return 'light';
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

function computeStats(list) {
    if (!list.length) return { avg: 0, median: 0 };
    const totals = list.map((m) => m.total_managed || 0);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const sorted = [...totals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { avg, median };
}

const DEPT_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

function deptColor(dept) {
    if (!dept) return DEPT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < dept.length; i++) {
        hash = (hash * 31 + dept.charCodeAt(i)) >>> 0;
    }
    return DEPT_PALETTE[hash % DEPT_PALETTE.length];
}

export default function SpanDetailModal({ open, onClose, data }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('total_desc');
    const [bandFilter, setBandFilter] = useState('all');
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [viewMode, setViewMode] = useState('combined');

    const allManagers = useMemo(() => data?.all_managers || [], [data]);

    const departmentList = useMemo(() => {
        const map = new Map();
        allManagers.forEach((m) => {
            const dept = m.department || '—';
            map.set(dept, (map.get(dept) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [allManagers]);

    const showDeptFilter = departmentList.length > 1;

    const filtered = useMemo(() => {
        let list = [...allManagers];

        if (showDeptFilter && selectedDepts.length > 0) {
            const set = new Set(selectedDepts);
            list = list.filter((m) => set.has(m.department || '—'));
        }

        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((m) => tr(m.name).includes(q) || tr(m.department).includes(q));
        }

        if (bandFilter !== 'all') {
            list = list.filter((m) => getBand(m.total_managed || 0) === bandFilter);
        }

        list.sort((a, b) => {
            if (sortBy === 'total_asc') return (a.total_managed || 0) - (b.total_managed || 0);
            if (sortBy === 'total_desc') return (b.total_managed || 0) - (a.total_managed || 0);
            if (sortBy === 'direct_desc') return (b.direct_count || 0) - (a.direct_count || 0);
            if (sortBy === 'indirect_desc') return (b.indirect_count || 0) - (a.indirect_count || 0);
            if (sortBy === 'depth_desc') return (b.depth || 0) - (a.depth || 0);
            if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
            if (sortBy === 'department') {
                const dCmp = String(a.department || '').localeCompare(String(b.department || ''), 'tr');
                if (dCmp !== 0) return dCmp;
                return (b.total_managed || 0) - (a.total_managed || 0);
            }
            return 0;
        });
        return list;
    }, [allManagers, search, bandFilter, sortBy, selectedDepts, showDeptFilter]);

    const chartData = useMemo(() => filtered.map((m) => ({
        name: shortName(m.name),
        fullName: m.name,
        department: m.department,
        direct: m.direct_count || 0,
        indirect: m.indirect_count || 0,
        total_managed: m.total_managed || 0,
        depth: m.depth || 0,
        secondary: m.secondary_count || 0,
        band: getBand(m.total_managed || 0),
        color: BAND_COLORS[getBand(m.total_managed || 0)],
    })), [filtered]);

    const groupedData = useMemo(() => {
        const groups = new Map();
        filtered.forEach((m) => {
            const dept = m.department || '—';
            if (!groups.has(dept)) groups.set(dept, []);
            groups.get(dept).push(m);
        });
        return Array.from(groups.entries())
            .map(([dept, managers]) => ({
                dept,
                count: managers.length,
                stats: computeStats(managers),
                managers,
                chart: managers.map((m) => ({
                    name: shortName(m.name),
                    fullName: m.name,
                    department: m.department,
                    direct: m.direct_count || 0,
                    indirect: m.indirect_count || 0,
                    total_managed: m.total_managed || 0,
                    depth: m.depth || 0,
                    secondary: m.secondary_count || 0,
                    band: getBand(m.total_managed || 0),
                    color: BAND_COLORS[getBand(m.total_managed || 0)],
                })),
            }))
            .sort((a, b) => b.count - a.count);
    }, [filtered]);

    const bandCounts = useMemo(() => {
        const counts = { light: 0, normal: 0, high: 0, critical: 0 };
        const sourceList = (showDeptFilter && selectedDepts.length > 0)
            ? allManagers.filter((m) => selectedDepts.includes(m.department || '—'))
            : allManagers;
        sourceList.forEach((m) => { counts[getBand(m.total_managed || 0)]++; });
        return counts;
    }, [allManagers, selectedDepts, showDeptFilter]);

    const totalCount = useMemo(() => {
        if (showDeptFilter && selectedDepts.length > 0) {
            return allManagers.filter((m) => selectedDepts.includes(m.department || '—')).length;
        }
        return allManagers.length;
    }, [allManagers, selectedDepts, showDeptFilter]);

    const overallStats = useMemo(() => {
        const sourceList = (showDeptFilter && selectedDepts.length > 0)
            ? allManagers.filter((m) => selectedDepts.includes(m.department || '—'))
            : allManagers;
        return computeStats(sourceList);
    }, [allManagers, selectedDepts, showDeptFilter]);

    const stackedSegments = ['light', 'normal', 'high', 'critical'].map((band) => {
        const count = bandCounts[band] || 0;
        const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return { band, count, pct };
    }).filter((s) => s.count > 0);

    const columns = [
        {
            title: 'Yönetici',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
            render: (v, row) => {
                const band = getBand(row.total_managed || 0);
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
            title: <span className="font-semibold text-[12px]">Direkt</span>,
            dataIndex: 'direct_count',
            sorter: (a, b) => (a.direct_count || 0) - (b.direct_count || 0),
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-indigo-700 text-[13px]">{v || 0}</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px]">Dolaylı</span>,
            dataIndex: 'indirect_count',
            sorter: (a, b) => (a.indirect_count || 0) - (b.indirect_count || 0),
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-amber-700 text-[13px]">{v || 0}</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px]">Toplam</span>,
            dataIndex: 'total_managed',
            sorter: (a, b) => (a.total_managed || 0) - (b.total_managed || 0),
            defaultSortOrder: 'descend',
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-slate-800 text-[13px]">{v || 0} kişi</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px]">Derinlik</span>,
            dataIndex: 'depth',
            sorter: (a, b) => (a.depth || 0) - (b.depth || 0),
            align: 'center',
            render: (v) => (
                <span className="tabular-nums text-slate-600 text-[12px]">{v || 0} sv</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px]">SEC</span>,
            dataIndex: 'secondary_count',
            sorter: (a, b) => (a.secondary_count || 0) - (b.secondary_count || 0),
            align: 'right',
            render: (v) => (
                <span className="tabular-nums text-amber-600 text-[11px] opacity-75">{v || 0}</span>
            ),
        },
        {
            title: 'Bant',
            dataIndex: 'total_managed',
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

    const toggleDept = (dept) => {
        setSelectedDepts((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
    };

    // Y-axis sade tick (sadece ad)
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

    // Bir tek dept grubu için bar chart
    const renderDeptGroupChart = (managers) => {
        const rowHeight = 24;
        const height = Math.max(80, managers.length * rowHeight + 16);
        return (
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={managers}
                        layout="vertical"
                        margin={{ top: 4, right: 50, left: 96, bottom: 4 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={96} interval={0} tick={renderSimpleYTick} />
                        <RTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} content={tooltipRenderer} />
                        <Bar dataKey="direct" stackId="span" fill="#6366f1" barSize={10} />
                        <Bar dataKey="indirect" stackId="span" fill="#f59e0b" barSize={10} radius={[0, 5, 5, 0]}>
                            <LabelList
                                dataKey="total_managed"
                                position="right"
                                formatter={(v) => `${v} kişi`}
                                style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Tooltip
    const tooltipRenderer = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        const m = payload[0].payload;
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl text-xs min-w-[240px]">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: m.color }}>
                        {initials(m.fullName)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-[12px]">{m.fullName}</div>
                        <div className="text-[10px] text-slate-500">{m.department || '—'}</div>
                    </div>
                </div>
                <div className="pt-1.5 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-600 text-[11px]">Direkt:</span>
                        <span className="font-bold text-indigo-700 tabular-nums text-[11px]">{m.direct} kişi</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-600 text-[11px]">Dolaylı:</span>
                        <span className="font-bold text-amber-700 tabular-nums text-[11px]">{m.indirect} kişi</span>
                    </div>
                    {m.secondary > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>SEC (sadece direkt):</span>
                            <span className="tabular-nums">{m.secondary}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-700 text-[11px] font-semibold">Toplam:</span>
                        <span className="font-black text-slate-900 tabular-nums text-[11px]">{m.total_managed} kişi · {m.depth} sv</span>
                    </div>
                </div>
            </div>
        );
    };

    // Dept paneller layoutu
    const renderDeptPanelsLayout = (data) => {
        if (!data || data.length === 0) {
            return <div className="py-10"><Empty description="Filtre sonucu yok" /></div>;
        }
        const groups = [];
        let current = null;
        data.forEach((d) => {
            if (!current || current.dept !== d.department) {
                current = { dept: d.department || '—', managers: [] };
                groups.push(current);
            }
            current.managers.push(d);
        });
        return (
            <div className="space-y-2">
                {groups.map((g) => {
                    const accent = deptColor(g.dept);
                    const stats = computeStats(g.managers);
                    return (
                        <div
                            key={g.dept}
                            className="flex items-stretch rounded-xl overflow-hidden border-2 shadow-sm"
                            style={{ borderColor: `${accent}40`, backgroundColor: `${accent}08` }}
                        >
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
                                            {g.managers.length} yönetici
                                        </span>
                                    </div>
                                    <div className="text-[10px] opacity-90 mt-1">
                                        Ort: <span className="font-bold tabular-nums">{stats.avg.toFixed(1)} kişi</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 p-2">
                                {renderDeptGroupChart(g.managers)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Standart chart
    const renderChart = (data) => {
        if (!data || data.length === 0) {
            return <div className="py-10"><Empty description="Filtre sonucu yok" /></div>;
        }
        const yAxisWidth = 110;
        const rowHeight = 16;
        const height = Math.max(280, Math.min(data.length * rowHeight, 720));
        return (
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: yAxisWidth, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={yAxisWidth} interval={0} tick={renderSimpleYTick} />
                        <RTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} content={tooltipRenderer} />
                        <Bar dataKey="direct" stackId="span" fill="#6366f1" barSize={10} />
                        <Bar dataKey="indirect" stackId="span" fill="#f59e0b" barSize={10} radius={[0, 5, 5, 0]}>
                            <LabelList
                                dataKey="total_managed"
                                position="right"
                                formatter={(v) => `${v}`}
                                style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Hiç yönetici yok — boş state
    if (allManagers.length === 0) {
        return (
            <Modal
                open={open}
                onCancel={onClose}
                footer={null}
                width={600}
                styles={{ content: { borderRadius: 20 } }}
                closeIcon={<CloseIcon size={16} />}
                destroyOnClose
            >
                <div className="text-center py-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                        <UserCheck size={28} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                        Yöneticisi olduğunuz yönetici yok
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Ana ekibinizdeki çalışanların hiçbiri başka bir kişinin yöneticisi değil.
                        Ekibinize yeni yöneticiler eklendikçe burada görünecek.
                    </p>
                </div>
            </Modal>
        );
    }

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
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-emerald-100/80">
                        <UserCheck size={12} className="text-emerald-600" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em]">
                        Yönetici Analizi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    Yönetici Yükü
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    Yöneticilik yapan PRIMARY alt çalışanlarınızın hiyerarşik ekip büyüklüğü.
                    Direkt + dolaylı (alt-yöneticilerin ekipleri) toplamı.
                </p>
            </div>

            <div className="px-7 py-5 space-y-5">
                {/* Departman filtresi */}
                {showDeptFilter && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Building2 size={13} className="text-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                Departman Filtresi
                            </span>
                            <span className="text-[10px] text-slate-400">· {departmentList.length} farklı departman</span>
                            <div className="ml-auto flex items-center gap-2">
                                {selectedDepts.length > 0 && (
                                    <button onClick={() => setSelectedDepts([])}
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
                                    <button key={d.name} onClick={() => toggleDept(d.name)}
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
                    </div>
                )}

                {/* Hero stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Users size={11} className="text-indigo-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Yönetici</span>
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
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Ort. Toplam Ekip</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {overallStats.avg.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">kişi</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle size={11} className="text-red-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Aşırı Yüklü</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {bandCounts.critical || 0}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">yönetici</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stacked Distribution */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Yük Dağılımı</span>
                            <span className="text-[9px] text-slate-400">— bantı tıklayarak filtrele</span>
                        </div>
                        {bandFilter !== 'all' && (
                            <button onClick={() => setBandFilter('all')}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <CloseIcon size={10} /> Filtreyi Kaldır
                            </button>
                        )}
                    </div>
                    <div className="flex items-stretch h-10 rounded-lg overflow-hidden border border-slate-200">
                        {stackedSegments.map((s) => {
                            const isActive = bandFilter === s.band;
                            const isDimmed = bandFilter !== 'all' && !isActive;
                            return (
                                <button key={s.band} onClick={() => setBandFilter(isActive ? 'all' : s.band)}
                                    style={{
                                        width: `${s.pct}%`,
                                        backgroundColor: BAND_COLORS[s.band],
                                        opacity: isDimmed ? 0.3 : 1,
                                    }}
                                    className={`relative group transition-all hover:scale-y-105 origin-bottom flex items-center justify-center min-w-[36px] ${isActive ? 'ring-2 ring-offset-1 ring-slate-700' : ''}`}
                                    title={`${BAND_LABELS[s.band]}: ${s.count} (${s.pct.toFixed(0)}%)`}
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

                {/* Filter bar */}
                <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                        <FilterIcon size={11} /> Filtre
                    </div>
                    <Input
                        placeholder="Yönetici veya departman ara..."
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
                            { value: 'total_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Toplam</span> },
                            { value: 'total_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Toplam</span> },
                            { value: 'direct_desc', label: <span className="text-[11px]">Direkt</span> },
                            { value: 'indirect_desc', label: <span className="text-[11px]">Dolaylı</span> },
                            { value: 'depth_desc', label: <span className="text-[11px]">Derinlik</span> },
                            { value: 'name', label: <span className="text-[11px]">Ad</span> },
                            { value: 'department', label: <span className="text-[11px]">Dept</span> },
                        ]}
                    />
                    <span className="ml-auto text-[10px] text-slate-500">
                        Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {totalCount}
                    </span>
                </div>

                {/* Main content */}
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
                                            {g.count} yönetici
                                        </span>
                                        <span className="ml-auto text-[10px] text-slate-500">
                                            Ort: <span className="font-bold tabular-nums text-slate-700">{g.stats.avg.toFixed(1)} kişi</span>
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
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                            <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Yönetici Bazlı Ekip Boyutu</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Her bar tek bir yönetici · renk yük bantını gösterir</div>
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

                {/* Table */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 pt-3 pb-2 border-b border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Detaylı Liste</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Sıralanabilir kolonlar · tüm yöneticiler tek sayfada</div>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey={(r) => r.manager_id || r.name}
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </Modal>
    );
}
