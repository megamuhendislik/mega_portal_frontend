import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Input, Table, Empty, Segmented, Tag } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Hourglass, Clock,
    SortAsc, SortDesc, Filter as FilterIcon, Building2, CheckCircle2, XCircle,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

const BUCKET_COLORS = {
    '<24h': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    '24-48h': { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
    '48-72h': { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' },
    '72h-1w': { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
    '>1w': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

const TYPE_COLORS = {
    OVERTIME: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    LEAVE: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
};

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    } catch {
        return '—';
    }
}

function BucketBadge({ bucket }) {
    const c = BUCKET_COLORS[bucket] || BUCKET_COLORS['<24h'];
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
        >
            {bucket}
        </span>
    );
}

export default function ApprovalDelayDetailModal({ open, onClose }) {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('hours_desc');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [bucketFilter, setBucketFilter] = useState('ALL');
    const [selectedDepts, setSelectedDepts] = useState([]);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get('/attendance-analytics/approval-delays-detail/', { params: queryParams })
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err.message || 'Veri alınamadı');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, queryParams]);

    const decisions = useMemo(() => data?.decisions || [], [data]);
    const summary = data?.summary || {};
    const buckets = summary.buckets || {};

    const departmentList = useMemo(() => {
        const map = new Map();
        decisions.forEach((d) => {
            const dept = d.department || '—';
            map.set(dept, (map.get(dept) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [decisions]);

    const showDeptFilter = departmentList.length > 1;

    const filtered = useMemo(() => {
        let list = [...decisions];
        if (typeFilter !== 'ALL') {
            list = list.filter((d) => d.request_type === typeFilter);
        }
        if (bucketFilter !== 'ALL') {
            list = list.filter((d) => d.bucket === bucketFilter);
        }
        if (showDeptFilter && selectedDepts.length > 0) {
            const set = new Set(selectedDepts);
            list = list.filter((d) => set.has(d.department || '—'));
        }
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((d) =>
                tr(d.employee_name).includes(q)
                || tr(d.department).includes(q)
                || tr(d.decided_by).includes(q)
                || tr(d.subtype).includes(q)
            );
        }
        list.sort((a, b) => {
            switch (sortBy) {
                case 'hours_desc': return b.hours - a.hours;
                case 'hours_asc': return a.hours - b.hours;
                case 'created_desc':
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                case 'decided_desc':
                    return new Date(b.decided_at || 0) - new Date(a.decided_at || 0);
                case 'name': return String(a.employee_name).localeCompare(String(b.employee_name), 'tr');
                case 'department':
                    return String(a.department).localeCompare(String(b.department), 'tr')
                        || (b.hours - a.hours);
                default: return 0;
            }
        });
        return list;
    }, [decisions, search, sortBy, typeFilter, bucketFilter, selectedDepts, showDeptFilter]);

    const toggleDept = (dept) => {
        setSelectedDepts((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
    };

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'employee_name',
            sorter: (a, b) => String(a.employee_name).localeCompare(String(b.employee_name), 'tr'),
            render: (v) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 bg-slate-500">
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
            title: 'Talep Türü',
            dataIndex: 'request_type',
            render: (_, row) => {
                const c = TYPE_COLORS[row.request_type] || TYPE_COLORS.LEAVE;
                return (
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ background: c.bg, color: c.text, borderColor: c.border }}
                    >
                        {row.request_type_display}
                    </span>
                );
            },
        },
        {
            title: 'Alt Tür',
            dataIndex: 'subtype',
            render: (v) => <span className="text-slate-500 text-[11px]">{v || '—'}</span>,
        },
        {
            title: 'Açılış',
            dataIndex: 'created_at',
            sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
            render: (v) => <span className="text-slate-500 text-[11px] tabular-nums">{fmtDateTime(v)}</span>,
        },
        {
            title: 'Karar',
            dataIndex: 'decided_at',
            sorter: (a, b) => new Date(a.decided_at || 0) - new Date(b.decided_at || 0),
            render: (v) => <span className="text-slate-500 text-[11px] tabular-nums">{fmtDateTime(v)}</span>,
        },
        {
            title: <span className="font-semibold text-[12px] text-blue-700">Süre (sa)</span>,
            dataIndex: 'hours',
            align: 'right',
            sorter: (a, b) => a.hours - b.hours,
            defaultSortOrder: 'descend',
            render: (v) => (
                <span className="font-bold tabular-nums text-blue-800 text-[13px]">{v}</span>
            ),
        },
        {
            title: 'Bant',
            dataIndex: 'bucket',
            align: 'center',
            render: (v) => <BucketBadge bucket={v} />,
        },
        {
            title: 'Sonuç',
            dataIndex: 'decision',
            align: 'center',
            render: (v) => (
                v === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                        <CheckCircle2 size={12} /> Onay
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 text-[11px] font-bold">
                        <XCircle size={12} /> Red
                    </span>
                )
            ),
        },
        {
            title: 'Onaylayan',
            dataIndex: 'decided_by',
            render: (v) => <span className="text-slate-600 text-[12px]">{v || '—'}</span>,
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
                body: { padding: 0, background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-blue-100/80">
                        <Hourglass size={12} className="text-blue-700" />
                    </div>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em]">
                        Onay Süresi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    Onay Süresi Detayı
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    Seçili dönemde sonuçlanan ek mesai ve izin taleplerinin onay süreleri.
                    Karar bazlı satırlar, bant dağılımı ve onaylayan bilgileri.
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Karar</span>
                                </div>
                                <div className="text-3xl font-black text-slate-800 tabular-nums">{summary.total || 0}</div>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Clock size={11} className="text-blue-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Ortalama</span>
                                </div>
                                <div className="text-3xl font-black text-blue-800 tabular-nums">{summary.avg_hours || 0}<span className="text-base text-slate-400 ml-1">sa</span></div>
                            </div>
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Medyan</span>
                                </div>
                                <div className="text-3xl font-black text-indigo-800 tabular-nums">{summary.median_hours || 0}<span className="text-base text-slate-400 ml-1">sa</span></div>
                            </div>
                            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">P95</span>
                                </div>
                                <div className="text-3xl font-black text-red-800 tabular-nums">{summary.p95_hours || 0}<span className="text-base text-slate-400 ml-1">sa</span></div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Bant Dağılımı</span>
                                {bucketFilter !== 'ALL' && (
                                    <button onClick={() => setBucketFilter('ALL')}
                                        className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <CloseIcon size={10} /> Filtreyi Kaldır
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {['<24h', '24-48h', '48-72h', '72h-1w', '>1w'].map((b) => {
                                    const c = BUCKET_COLORS[b];
                                    const isActive = bucketFilter === 'ALL' || bucketFilter === b;
                                    return (
                                        <button
                                            key={b}
                                            onClick={() => setBucketFilter(bucketFilter === b ? 'ALL' : b)}
                                            className={`rounded-lg p-2.5 border-2 text-left transition-all ${
                                                isActive ? '' : 'opacity-50'
                                            } ${bucketFilter === b ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm'}`}
                                            style={{
                                                background: c.bg,
                                                borderColor: bucketFilter === b ? c.text : c.border,
                                            }}
                                        >
                                            <div
                                                className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                                                style={{ color: c.text }}
                                            >
                                                {b}
                                            </div>
                                            <div
                                                className="text-2xl font-black tabular-nums"
                                                style={{ color: c.text }}
                                            >
                                                {buckets[b] || 0}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {showDeptFilter && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Building2 size={13} className="text-blue-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Departman Filtresi</span>
                                    {selectedDepts.length > 0 && (
                                        <button onClick={() => setSelectedDepts([])}
                                            className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
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
                                placeholder="Çalışan / departman / onaylayan / alt tür ara..."
                                prefix={<SearchIcon size={12} className="text-slate-400" />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-xs"
                                allowClear
                                size="small"
                            />
                            <Segmented
                                value={typeFilter}
                                onChange={setTypeFilter}
                                size="small"
                                options={[
                                    { value: 'ALL', label: <span className="text-[11px]">Tümü</span> },
                                    { value: 'OVERTIME', label: <span className="text-[11px]">Ek Mesai</span> },
                                    { value: 'LEAVE', label: <span className="text-[11px]">İzin</span> },
                                ]}
                            />
                            <Segmented
                                value={sortBy}
                                onChange={setSortBy}
                                size="small"
                                options={[
                                    { value: 'hours_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Süre</span> },
                                    { value: 'hours_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Süre</span> },
                                    { value: 'created_desc', label: <span className="text-[11px]">Açılış</span> },
                                    { value: 'decided_desc', label: <span className="text-[11px]">Karar</span> },
                                    { value: 'name', label: <span className="text-[11px]">Ad</span> },
                                    { value: 'department', label: <span className="text-[11px]">Dept</span> },
                                ]}
                            />
                            <span className="ml-auto text-[10px] text-slate-500">
                                Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {decisions.length}
                            </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {filtered.length === 0 ? (
                                <div className="py-10">
                                    <Empty description={
                                        (search || selectedDepts.length > 0 || typeFilter !== 'ALL' || bucketFilter !== 'ALL')
                                            ? "Eşleşen karar yok"
                                            : "Bu dönemde sonuçlanmış talep yok"
                                    } />
                                </div>
                            ) : (
                                <Table
                                    columns={columns}
                                    dataSource={filtered}
                                    rowKey={(r) => r.request_id}
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
