import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Tag, Empty, Segmented } from 'antd';
import { Search as SearchIcon, X as CloseIcon, Calendar, Users } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import ChartTooltip from './ChartTooltip';

/**
 * TenureDetailModal — Kıdem dağılımı genişletilmiş görünüm.
 * Her çalışanı ayrı ayrı bar olarak gösterir + alt kısımda detaylı tablo.
 *
 * Props:
 *  - open, onClose
 *  - data: { all_employees: [{ employee_id, name, department, hired_date, months }],
 *            distribution, total, avg_months, median_months }
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

function getBand(months) {
    if (months < 12) return '<1yr';
    if (months < 60) return '1-5yr';
    if (months < 120) return '5-10yr';
    return '10yr+';
}

function formatMonths(months) {
    const yrs = Math.floor(months / 12);
    const m = months % 12;
    if (yrs === 0) return `${m} ay`;
    if (m === 0) return `${yrs} yıl`;
    return `${yrs} yıl ${m} ay`;
}

export default function TenureDetailModal({ open, onClose, data }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('months_asc'); // 'months_asc' | 'months_desc' | 'name' | 'department'
    const [bandFilter, setBandFilter] = useState('all');

    const allEmployees = data?.all_employees || [];

    // Apply search + band filter + sort
    const filtered = useMemo(() => {
        let list = [...allEmployees];
        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((e) =>
                String(e.name || '').toLowerCase().includes(q) ||
                String(e.department || '').toLowerCase().includes(q)
            );
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
    }, [allEmployees, search, bandFilter, sortBy]);

    // Chart data — bar per employee, color by band
    const chartData = useMemo(() => filtered.map((e) => ({
        name: (e.name || '').split(' ').slice(0, 2).join(' '),
        fullName: e.name,
        department: e.department,
        months: e.months || 0,
        band: getBand(e.months || 0),
        color: BAND_COLORS[getBand(e.months || 0)],
    })), [filtered]);

    // Histogram data — count per band among filtered
    const bandCounts = useMemo(() => {
        const counts = { '<1yr': 0, '1-5yr': 0, '5-10yr': 0, '10yr+': 0 };
        filtered.forEach((e) => { counts[getBand(e.months || 0)]++; });
        return counts;
    }, [filtered]);

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
            render: (v) => <span className="font-semibold text-slate-700">{v}</span>,
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
            render: (v) => v || '—',
        },
        {
            title: 'Kıdem',
            dataIndex: 'months',
            sorter: (a, b) => (a.months || 0) - (b.months || 0),
            defaultSortOrder: 'descend',
            align: 'right',
            render: (v) => (
                <span className="font-bold tabular-nums text-slate-800">{formatMonths(v || 0)}</span>
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
                    <Tag color="default" style={{ backgroundColor: BAND_COLORS[band], color: 'white', border: 'none' }}>
                        {BAND_LABELS[band]}
                    </Tag>
                );
            },
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="95%"
            style={{ top: 20, maxWidth: 1400 }}
            closeIcon={<CloseIcon size={16} />}
            destroyOnClose
            title={
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    <span className="text-lg font-semibold">Kıdem Dağılımı — Detaylı Görünüm</span>
                    <Tag color="blue" className="ml-2">{filtered.length} / {allEmployees.length} çalışan</Tag>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Top stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {Object.entries(bandCounts).map(([band, count]) => (
                        <div
                            key={band}
                            className={`rounded-xl border p-3 cursor-pointer transition-all ${bandFilter === band ? 'ring-2 ring-indigo-300' : ''}`}
                            style={{ backgroundColor: `${BAND_COLORS[band]}15`, borderColor: BAND_COLORS[band] }}
                            onClick={() => setBandFilter(bandFilter === band ? 'all' : band)}
                        >
                            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BAND_COLORS[band] }}>
                                {BAND_LABELS[band]}
                            </div>
                            <div className="text-2xl font-black tabular-nums text-slate-800">{count}</div>
                            <div className="text-[9px] text-slate-500">çalışan</div>
                        </div>
                    ))}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ortalama</div>
                        <div className="text-2xl font-black tabular-nums text-slate-800">
                            {Math.round((data?.avg_months || 0) / 12 * 10) / 10}
                        </div>
                        <div className="text-[9px] text-slate-500">yıl</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medyan</div>
                        <div className="text-2xl font-black tabular-nums text-slate-800">
                            {Math.round((data?.median_months || 0) / 12 * 10) / 10}
                        </div>
                        <div className="text-[9px] text-slate-500">yıl</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Input
                        placeholder="Ad veya departman ara..."
                        prefix={<SearchIcon size={14} className="text-slate-400" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                        allowClear
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Sırala:</span>
                    <Segmented
                        value={sortBy}
                        onChange={setSortBy}
                        size="small"
                        options={[
                            { value: 'months_asc', label: 'Kıdem ↑' },
                            { value: 'months_desc', label: 'Kıdem ↓' },
                            { value: 'name', label: 'Ad' },
                            { value: 'department', label: 'Dept' },
                        ]}
                    />
                    {bandFilter !== 'all' && (
                        <Tag color="blue" closable onClose={() => setBandFilter('all')}>
                            Bant: {BAND_LABELS[bandFilter]}
                        </Tag>
                    )}
                </div>

                {/* Per-employee bar chart */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-indigo-600" />
                            <span className="text-sm font-semibold text-slate-700">
                                Çalışan Bazlı Kıdem (her bar = 1 kişi)
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                            {Object.entries(BAND_COLORS).map(([band, color]) => (
                                <span key={band} className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                    <span className="text-slate-600">{BAND_LABELS[band]}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    {chartData.length > 0 ? (
                        <div style={{ height: Math.max(320, Math.min(chartData.length * 14, 600)) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 8, right: 60, left: 100, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => `${Math.round(v / 12 * 10) / 10}y`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 10, fontWeight: 600 }}
                                        width={100}
                                        interval={0}
                                    />
                                    <RTooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
                                                    <div className="font-bold text-slate-800">{d.fullName}</div>
                                                    <div className="text-slate-500">{d.department || '—'}</div>
                                                    <div className="mt-1 text-slate-700">
                                                        <span className="font-bold">{formatMonths(d.months)}</span>
                                                        <Tag
                                                            color="default"
                                                            style={{ backgroundColor: d.color, color: 'white', border: 'none', marginLeft: 6 }}
                                                        >
                                                            {BAND_LABELS[d.band]}
                                                        </Tag>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="months" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="months" position="right" formatter={(v) => `${Math.round(v / 12 * 10) / 10}y`} style={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                        {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <Empty description="Filtre sonucu yok" />
                    )}
                </div>

                {/* Employee table */}
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey={(r) => r.employee_id || r.name}
                        pagination={filtered.length > 25 ? { pageSize: 25, showSizeChanger: false } : false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </Modal>
    );
}
