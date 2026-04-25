import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Calendar, Users, Sparkles,
    SortAsc, SortDesc, Filter as FilterIcon,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell, LabelList,
} from 'recharts';

/**
 * TenureDetailModal — Editoryal dashboard tasarımı.
 *
 * Aesthetic:
 *  - Hero typography (display 5xl-6xl rakamlar)
 *  - Subtle gradient hero bg (indigo soft)
 *  - Stacked horizontal bar — tek görünümde tüm bantlar
 *  - Asimetrik grid: filter sidebar + ana içerik
 *  - Tabular-nums her yerde, refined spacing
 *  - Smooth transitions, hover detayları
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
    if (yrs === 0) return `${m} ay`;
    if (m === 0) return `${yrs} yıl`;
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

// Personel adı kısa
function shortName(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function TenureDetailModal({ open, onClose, data }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('months_desc');
    const [bandFilter, setBandFilter] = useState('all');

    const allEmployees = useMemo(() => data?.all_employees || [], [data]);

    const filtered = useMemo(() => {
        let list = [...allEmployees];
        if (search) {
            const q = search.toLowerCase().replace(/[ışçöüğ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g' })[c] || c);
            list = list.filter((e) => {
                const n = String(e.name || '').toLowerCase().replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
                const d = String(e.department || '').toLowerCase().replace(/[ışçöüğ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g' })[c] || c);
                return n.includes(q) || d.includes(q);
            });
        }
        if (bandFilter !== 'all') {
            list = list.filter((e) => getBand(e.months || 0) === bandFilter);
        }
        list.sort((a, b) => {
            if (sortBy === 'months_asc') return (a.months || 0) - (b.months || 0);
            if (sortBy === 'months_desc') return (b.months || 0) - (a.months || 0);
            if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
            if (sortBy === 'department') return String(a.department || '').localeCompare(String(b.department || ''), 'tr');
            return 0;
        });
        return list;
    }, [allEmployees, search, bandFilter, sortBy]);

    const chartData = useMemo(() => filtered.map((e) => ({
        name: shortName(e.name),
        fullName: e.name,
        department: e.department,
        months: e.months || 0,
        band: getBand(e.months || 0),
        color: BAND_COLORS[getBand(e.months || 0)],
    })), [filtered]);

    const bandCounts = useMemo(() => {
        const counts = { '<1yr': 0, '1-5yr': 0, '5-10yr': 0, '10yr+': 0 };
        allEmployees.forEach((e) => { counts[getBand(e.months || 0)]++; });
        return counts;
    }, [allEmployees]);

    const totalCount = allEmployees.length;
    const avgYears = ((data?.avg_months || 0) / 12);
    const medianYears = ((data?.median_months || 0) / 12);

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
            render: (v, row) => {
                const band = getBand(row.months || 0);
                return (
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        >
                            {initials(v)}
                        </div>
                        <span className="font-semibold text-slate-700">{v}</span>
                    </div>
                );
            },
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            sorter: (a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'tr'),
            render: (v) => <span className="text-slate-500 text-xs">{v || '—'}</span>,
        },
        {
            title: 'İşe Başlama',
            dataIndex: 'hired_date',
            sorter: (a, b) => String(a.hired_date || '').localeCompare(String(b.hired_date || '')),
            render: (v) => <span className="text-slate-500 tabular-nums text-xs">{v || '—'}</span>,
        },
        {
            title: <span className="font-semibold">Kıdem</span>,
            dataIndex: 'months',
            sorter: (a, b) => (a.months || 0) - (b.months || 0),
            defaultSortOrder: 'descend',
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-slate-800 text-sm">
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
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
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

    const stackedSegments = ['<1yr', '1-5yr', '5-10yr', '10yr+'].map((band) => {
        const count = bandCounts[band] || 0;
        const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return { band, count, pct };
    }).filter((s) => s.count > 0);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="95%"
            style={{ top: 20, maxWidth: 1500 }}
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 24 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            {/* Custom header */}
            <div className="relative px-8 pt-7 pb-6 border-b border-slate-200/60 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/30">
                <div className="absolute top-5 right-5 z-10">
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={16} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100/80">
                        <Calendar size={14} className="text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
                        İşgücü Analizi
                    </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1">
                    Kıdem Dağılımı
                </h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                    Tüm bağlı PRIMARY çalışanların işe başlama tarihlerine göre kıdem analizi.
                    Her bant farklı bir aşamayı temsil eder — yeni katılanlardan uzun soluklulara.
                </p>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Users size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Çalışan</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tight">{totalCount}</span>
                                <span className="text-sm text-slate-400 font-semibold">kişi</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-cyan-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Ortalama Kıdem</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {avgYears.toFixed(1)}
                                </span>
                                <span className="text-sm text-slate-400 font-semibold">yıl</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-50 blur-2xl opacity-60" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <SortAsc size={14} className="text-amber-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Medyan Kıdem</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {medianYears.toFixed(1)}
                                </span>
                                <span className="text-sm text-slate-400 font-semibold">yıl</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stacked Distribution Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Bant Dağılımı</span>
                            <span className="text-[10px] text-slate-400">— bantı tıklayarak filtrele</span>
                        </div>
                        {bandFilter !== 'all' && (
                            <button
                                onClick={() => setBandFilter('all')}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <CloseIcon size={11} />
                                Filtreyi Kaldır
                            </button>
                        )}
                    </div>
                    {/* Stacked bar */}
                    <div className="flex items-stretch h-12 rounded-xl overflow-hidden border border-slate-200">
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
                                    className={`relative group transition-all hover:scale-y-110 origin-bottom flex items-center justify-center min-w-[40px] ${isActive ? 'ring-2 ring-offset-2 ring-slate-700' : ''}`}
                                    title={`${BAND_LABELS[s.band]}: ${s.count} kişi (${s.pct.toFixed(0)}%)`}
                                >
                                    <span className="text-xs font-black text-white drop-shadow tabular-nums">
                                        {s.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Labels */}
                    <div className="flex items-stretch mt-2">
                        {stackedSegments.map((s) => (
                            <div key={s.band} style={{ width: `${s.pct}%` }} className="text-center min-w-[40px]">
                                <div className="text-[10px] font-bold text-slate-700">{BAND_LABELS[s.band]}</div>
                                <div className="text-[9px] text-slate-400">{BAND_DESCRIPTIONS[s.band]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter section */}
                <div className="flex items-center gap-3 flex-wrap p-4 rounded-2xl bg-slate-50/60 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                        <FilterIcon size={12} /> Filtre
                    </div>
                    <Input
                        placeholder="Ad veya departman ara..."
                        prefix={<SearchIcon size={13} className="text-slate-400" />}
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
                            { value: 'months_desc', label: <span className="flex items-center gap-1"><SortDesc size={11} /> Kıdem</span> },
                            { value: 'months_asc', label: <span className="flex items-center gap-1"><SortAsc size={11} /> Kıdem</span> },
                            { value: 'name', label: 'Ad' },
                            { value: 'department', label: 'Dept' },
                        ]}
                    />
                    <span className="ml-auto text-[11px] text-slate-500">
                        Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {totalCount}
                    </span>
                </div>

                {/* Per-employee chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çalışan Bazlı Kıdem</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Her bar tek bir kişi · renk bantını gösterir</div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                            {Object.entries(BAND_COLORS).map(([band, color]) => (
                                <span key={band} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-slate-600 font-medium">{BAND_LABELS[band]}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    {chartData.length > 0 ? (
                        <div style={{ height: Math.max(360, Math.min(chartData.length * 18, 720)) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 8, right: 80, left: 130, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v) => `${(v / 12).toFixed(1)}y`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }}
                                        width={130}
                                        interval={0}
                                    />
                                    <RTooltip
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs min-w-[200px]">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div
                                                            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                                            style={{ backgroundColor: d.color }}
                                                        >
                                                            {initials(d.fullName)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{d.fullName}</div>
                                                            <div className="text-[10px] text-slate-500">{d.department || '—'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                        <span className="text-slate-600">Kıdem:</span>
                                                        <span className="font-black text-slate-900 tabular-nums">{formatTenureLong(d.months)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-slate-600">Bant:</span>
                                                        <span
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                                                            style={{ backgroundColor: `${d.color}20`, color: d.color }}
                                                        >
                                                            {BAND_LABELS[d.band]}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="months" radius={[0, 6, 6, 0]} barSize={12}>
                                        <LabelList
                                            dataKey="months"
                                            position="right"
                                            formatter={(v) => formatTenure(v)}
                                            style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                                        />
                                        {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="py-12">
                            <Empty description="Filtre sonucu yok" />
                        </div>
                    )}
                </div>

                {/* Employee table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 pt-4 pb-2 border-b border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Detaylı Liste</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Sıralanabilir kolonlar · tüm çalışanlar tek sayfada</div>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey={(r) => r.employee_id || r.name}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </Modal>
    );
}
