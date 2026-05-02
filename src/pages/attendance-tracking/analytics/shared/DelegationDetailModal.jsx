import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Input, Table, Empty, Segmented, Tag } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Users, Calendar,
    SortAsc, SortDesc, Filter as FilterIcon, Building2, AlertTriangle,
} from 'lucide-react';
import api from '../../../../services/api';

const STATUS_COLORS = {
    'Aktif': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    'Yakında biter': { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' },
    'Süresi geçmiş': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso + 'T00:00:00');
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    } catch {
        return '—';
    }
}

export default function DelegationDetailModal({ open, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('days_remaining_asc');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get('/attendance-analytics/workforce/delegation-detail/')
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err.message || 'Veri alınamadı');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open]);

    const delegations = useMemo(() => data?.delegations || [], [data]);
    const summary = data?.summary || {};

    const filtered = useMemo(() => {
        let list = [...delegations];
        if (statusFilter !== 'ALL') {
            list = list.filter((d) => d.status === statusFilter);
        }
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((d) =>
                tr(d.principal_name).includes(q)
                || tr(d.substitute_name).includes(q)
                || tr(d.principal_dept).includes(q)
                || tr(d.substitute_dept).includes(q)
            );
        }
        list.sort((a, b) => {
            switch (sortBy) {
                case 'days_remaining_asc': return (a.days_remaining ?? 999) - (b.days_remaining ?? 999);
                case 'days_remaining_desc': return (b.days_remaining ?? -1) - (a.days_remaining ?? -1);
                case 'duration_desc': return (b.days_total ?? 0) - (a.days_total ?? 0);
                case 'principal': return String(a.principal_name).localeCompare(String(b.principal_name), 'tr');
                case 'substitute': return String(a.substitute_name).localeCompare(String(b.substitute_name), 'tr');
                case 'valid_from_desc': return new Date(b.valid_from || 0) - new Date(a.valid_from || 0);
                default: return 0;
            }
        });
        return list;
    }, [delegations, search, sortBy, statusFilter]);

    const columns = [
        {
            title: 'Vekil Tutan',
            dataIndex: 'principal_name',
            sorter: (a, b) => String(a.principal_name).localeCompare(String(b.principal_name), 'tr'),
            render: (v, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 bg-violet-500">
                        {initials(v)}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700 text-[13px]">{v}</div>
                        <div className="text-[10px] text-slate-400">{row.principal_dept || '—'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Vekil Olan',
            dataIndex: 'substitute_name',
            sorter: (a, b) => String(a.substitute_name).localeCompare(String(b.substitute_name), 'tr'),
            render: (v, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 bg-indigo-500">
                        {initials(v)}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700 text-[13px]">{v}</div>
                        <div className="text-[10px] text-slate-400">{row.substitute_dept || '—'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Başlangıç',
            dataIndex: 'valid_from',
            sorter: (a, b) => new Date(a.valid_from || 0) - new Date(b.valid_from || 0),
            render: (v) => <span className="text-slate-500 text-[11px] tabular-nums">{fmtDate(v)}</span>,
        },
        {
            title: 'Bitiş',
            dataIndex: 'valid_to',
            sorter: (a, b) => new Date(a.valid_to || 0) - new Date(b.valid_to || 0),
            render: (v) => <span className="text-slate-500 text-[11px] tabular-nums">{fmtDate(v)}</span>,
        },
        {
            title: <span className="text-[12px]">Toplam Süre</span>,
            dataIndex: 'days_total',
            align: 'right',
            sorter: (a, b) => (a.days_total ?? 0) - (b.days_total ?? 0),
            render: (v) => <span className="tabular-nums text-slate-700 text-[12px]">{v ?? '—'} g</span>,
        },
        {
            title: <span className="text-[12px]">Kalan</span>,
            dataIndex: 'days_remaining',
            align: 'right',
            sorter: (a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999),
            defaultSortOrder: 'ascend',
            render: (v) => {
                if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
                const cls = v <= 7 ? 'text-red-700' : v <= 30 ? 'text-amber-700' : 'text-emerald-700';
                return <span className={`font-bold tabular-nums text-[13px] ${cls}`}>{v} g</span>;
            },
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            align: 'center',
            render: (v) => {
                const c = STATUS_COLORS[v] || STATUS_COLORS['Aktif'];
                return (
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ background: c.bg, color: c.text, borderColor: c.border }}
                    >
                        {v}
                    </span>
                );
            },
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
                body: { padding: 0, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-violet-100/80">
                        <Users size={12} className="text-violet-700" />
                    </div>
                    <span className="text-[9px] font-bold text-violet-600 uppercase tracking-[0.2em]">
                        Vekalet Kullanım
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    Vekalet Detayı
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    Aktif ve yakında biten vekalet kayıtları. Vekil tutan, vekil olan, süre ve durum.
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
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Aktif Vekalet</div>
                                <div className="text-3xl font-black text-emerald-800 tabular-nums">{summary.active_count || 0}</div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">7 Günde Biten</div>
                                <div className="text-3xl font-black text-amber-800 tabular-nums">{summary.expiring_in_7days || 0}</div>
                            </div>
                            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">30 Günde Biten</div>
                                <div className="text-3xl font-black text-orange-800 tabular-nums">{summary.expiring_in_30days || 0}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Ort. Süre</div>
                                <div className="text-3xl font-black text-slate-800 tabular-nums">{summary.avg_duration_days || 0}<span className="text-base text-slate-400 ml-1">gün</span></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                                <FilterIcon size={11} /> Filtre
                            </div>
                            <Input
                                placeholder="Vekil tutan / vekil olan / departman ara..."
                                prefix={<SearchIcon size={12} className="text-slate-400" />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-xs"
                                allowClear
                                size="small"
                            />
                            <Segmented
                                value={statusFilter}
                                onChange={setStatusFilter}
                                size="small"
                                options={[
                                    { value: 'ALL', label: <span className="text-[11px]">Tümü</span> },
                                    { value: 'Aktif', label: <span className="text-[11px]">Aktif</span> },
                                    { value: 'Yakında biter', label: <span className="text-[11px]">Biter</span> },
                                    { value: 'Süresi geçmiş', label: <span className="text-[11px]">Geçmiş</span> },
                                ]}
                            />
                            <Segmented
                                value={sortBy}
                                onChange={setSortBy}
                                size="small"
                                options={[
                                    { value: 'days_remaining_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Kalan</span> },
                                    { value: 'days_remaining_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Kalan</span> },
                                    { value: 'duration_desc', label: <span className="text-[11px]">Süre</span> },
                                    { value: 'valid_from_desc', label: <span className="text-[11px]">Yeni</span> },
                                    { value: 'principal', label: <span className="text-[11px]">Vekil tutan</span> },
                                    { value: 'substitute', label: <span className="text-[11px]">Vekil olan</span> },
                                ]}
                            />
                            <span className="ml-auto text-[10px] text-slate-500">
                                Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {delegations.length}
                            </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {filtered.length === 0 ? (
                                <div className="py-10">
                                    <Empty description={
                                        (search || statusFilter !== 'ALL')
                                            ? "Eşleşen vekalet kaydı yok"
                                            : "Aktif vekalet yok"
                                    } />
                                </div>
                            ) : (
                                <Table
                                    columns={columns}
                                    dataSource={filtered}
                                    rowKey={(r) => r.id}
                                    pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [25, 50, 100] }}
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
