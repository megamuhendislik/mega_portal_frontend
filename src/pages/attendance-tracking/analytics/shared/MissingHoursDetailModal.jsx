import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, TrendingDown, AlertCircle,
    SortAsc, SortDesc, Filter as FilterIcon, Building2,
} from 'lucide-react';
import api from '../../../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Recharts custom tooltip — Türkçe biçim
function MiniTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 shadow-md">
            <div className="text-[11px] font-bold text-slate-700">{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} className="text-[11px] tabular-nums" style={{ color: p.color }}>
                    {p.name}: <strong>{p.value} sa</strong>
                </div>
            ))}
        </div>
    );
}

// Sparkline mini chart (sayfa içi inline)
function Sparkline({ data, color = '#ef4444' }) {
    if (!data?.length) return <span className="text-slate-300 text-[10px]">—</span>;
    return (
        <div className="w-24 h-8 inline-block align-middle">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line type="monotone" dataKey="hours" stroke={color} strokeWidth={1.5} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function MissingHoursDetailModal({ open, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('current_desc');
    const [selectedDepts, setSelectedDepts] = useState([]);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get('/attendance-analytics/workforce/missing-hours-detail/')
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err.message || 'Veri alınamadı');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open]);

    const employees = useMemo(() => data?.employees || [], [data]);
    const byDepartment = useMemo(() => data?.by_department || [], [data]);
    const summary = data?.summary || {};

    const departmentList = useMemo(() => {
        const map = new Map();
        employees.forEach((e) => {
            const d = e.department || '—';
            map.set(d, (map.get(d) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    const showDeptFilter = departmentList.length > 1;

    const filtered = useMemo(() => {
        let list = [...employees];
        if (showDeptFilter && selectedDepts.length > 0) {
            const set = new Set(selectedDepts);
            list = list.filter((e) => set.has(e.department || '—'));
        }
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((e) => tr(e.name).includes(q) || tr(e.department).includes(q));
        }
        list.sort((a, b) => {
            switch (sortBy) {
                case 'current_desc': return (b.current_period_missing || 0) - (a.current_period_missing || 0);
                case 'current_asc': return (a.current_period_missing || 0) - (b.current_period_missing || 0);
                case 'six_month_desc': return (b.six_month_total || 0) - (a.six_month_total || 0);
                case 'delta_desc': return (b.delta_pct || 0) - (a.delta_pct || 0);
                case 'name': return String(a.name).localeCompare(String(b.name), 'tr');
                case 'department':
                    return String(a.department).localeCompare(String(b.department), 'tr')
                        || ((b.current_period_missing || 0) - (a.current_period_missing || 0));
                default: return 0;
            }
        });
        return list;
    }, [employees, search, sortBy, selectedDepts, showDeptFilter]);

    const toggleDept = (dept) => {
        setSelectedDepts((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
    };

    const deptChartData = useMemo(() => {
        return byDepartment.slice(0, 10).map((d) => ({
            name: d.department || '—',
            toplam: Math.round(d.total_missing || 0),
            ortalama: Math.round((d.avg_per_employee || 0) * 10) / 10,
        }));
    }, [byDepartment]);

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name).localeCompare(String(b.name), 'tr'),
            render: (v) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 bg-red-500">
                        {initials(v)}
                    </div>
                    <span className="font-semibold text-slate-700 text-[13px]">{v}</span>
                </div>
            ),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            render: (v) => <span className="text-slate-500 text-[12px]">{v || '—'}</span>,
        },
        {
            title: <span className="font-semibold text-[12px] text-red-700">Bu Dönem</span>,
            dataIndex: 'current_period_missing',
            align: 'right',
            sorter: (a, b) => (a.current_period_missing || 0) - (b.current_period_missing || 0),
            defaultSortOrder: 'descend',
            render: (v) => <span className="font-bold tabular-nums text-red-800 text-[13px]">{Math.round(v || 0)} sa</span>,
        },
        {
            title: <span className="font-semibold text-[12px] text-slate-500">Geçen Dönem</span>,
            dataIndex: 'prev_period_missing',
            align: 'right',
            sorter: (a, b) => (a.prev_period_missing || 0) - (b.prev_period_missing || 0),
            render: (v) => <span className="tabular-nums text-slate-500 text-[12px]">{Math.round(v || 0)} sa</span>,
        },
        {
            title: <span className="text-[12px]">Δ</span>,
            dataIndex: 'delta_pct',
            align: 'right',
            sorter: (a, b) => (a.delta_pct || 0) - (b.delta_pct || 0),
            render: (v) => {
                if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
                const cls = v > 10 ? 'text-red-700 bg-red-50' : v < -10 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50';
                return (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${cls}`}>
                        {v > 0 ? '+' : ''}{v}%
                    </span>
                );
            },
        },
        {
            title: <span className="text-[12px]">6 Ay Toplam</span>,
            dataIndex: 'six_month_total',
            align: 'right',
            sorter: (a, b) => (a.six_month_total || 0) - (b.six_month_total || 0),
            render: (v) => <span className="tabular-nums text-slate-700 text-[12px]">{Math.round(v || 0)} sa</span>,
        },
        {
            title: 'Trend (6 ay)',
            dataIndex: 'monthly_trend',
            align: 'center',
            render: (v) => <Sparkline data={v} />,
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92%"
            style={{ top: 24, maxWidth: 1500 }}
            styles={{
                body: { padding: 0, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-red-50/40 via-white to-orange-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-red-100/80">
                        <TrendingDown size={12} className="text-red-700" />
                    </div>
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-[0.2em]">
                        Eksik Saat Trendi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    Eksik Saat Detayı
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    Kişi bazlı ve departman bazlı eksik saat dağılımı, son 6 ayın trendi.
                </p>
            </div>

            <div className="px-7 py-5 space-y-5">
                {loading && (
                    <div className="text-center py-10 text-slate-500">Yükleniyor...</div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                        Hata: {error}
                    </div>
                )}
                {!loading && !error && data && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <AlertCircle size={11} className="text-red-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Eksik</span>
                                </div>
                                <div className="text-3xl font-black text-red-800 tabular-nums">{Math.round(summary.total_missing || 0)}<span className="text-base text-slate-400 ml-1">sa</span></div>
                            </div>
                            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Etkilenen Çalışan</div>
                                <div className="text-3xl font-black text-orange-800 tabular-nums">{summary.employees_affected || 0}<span className="text-base text-slate-400 ml-1">kişi</span></div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">En Yüksek</div>
                                <div className="text-base font-black text-slate-800 truncate">{summary.top_offender_name || '—'}</div>
                            </div>
                        </div>

                        {deptChartData.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 size={13} className="text-red-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Departman Bazlı Toplam Eksik</span>
                                </div>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={deptChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} angle={-15} textAnchor="end" height={50} />
                                            <YAxis tick={{ fontSize: 10 }} unit="sa" />
                                            <RTooltip content={<MiniTooltip />} />
                                            <Bar dataKey="toplam" name="Toplam Eksik" radius={[4, 4, 0, 0]}>
                                                {deptChartData.map((d, i) => (
                                                    <Cell key={i} fill={d.toplam > 100 ? '#ef4444' : d.toplam > 50 ? '#f97316' : '#fbbf24'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {showDeptFilter && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Building2 size={13} className="text-red-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Departman Filtresi</span>
                                    {selectedDepts.length > 0 && (
                                        <button onClick={() => setSelectedDepts([])}
                                            className="ml-auto text-[10px] font-semibold text-red-600 hover:text-red-800 flex items-center gap-1"
                                        >
                                            <CloseIcon size={10} /> Tümünü Sıfırla
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {departmentList.map((d) => {
                                        const isActive = selectedDepts.length === 0 || selectedDepts.includes(d.name);
                                        return (
                                            <button key={d.name} onClick={() => toggleDept(d.name)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${isActive
                                                    ? 'bg-red-50 border-red-200 text-red-700'
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

                        <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                                <FilterIcon size={11} /> Filtre
                            </div>
                            <Input
                                placeholder="Çalışan veya departman ara..."
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
                                    { value: 'current_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Bu Dönem</span> },
                                    { value: 'current_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Bu Dönem</span> },
                                    { value: 'six_month_desc', label: <span className="text-[11px]">6 Ay</span> },
                                    { value: 'delta_desc', label: <span className="text-[11px]">Artış</span> },
                                    { value: 'name', label: <span className="text-[11px]">Ad</span> },
                                    { value: 'department', label: <span className="text-[11px]">Dept</span> },
                                ]}
                            />
                            <span className="ml-auto text-[10px] text-slate-500">
                                Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {employees.length}
                            </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {filtered.length === 0 ? (
                                <div className="py-10">
                                    <Empty description={
                                        (search || selectedDepts.length > 0)
                                            ? "Eşleşen çalışan yok"
                                            : "Eksik saat kaydı yok"
                                    } />
                                </div>
                            ) : (
                                <Table
                                    columns={columns}
                                    dataSource={filtered}
                                    rowKey={(r) => r.employee_id}
                                    pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 200] }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
