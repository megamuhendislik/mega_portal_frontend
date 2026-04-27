import React, { useEffect, useMemo, useState } from 'react';
import { Table, Empty, Input, Tag } from 'antd';
import {
    Search as SearchIcon, Briefcase, Calendar as CalendarIcon, AlertCircle,
    Building2, Clock, User as UserIcon,
} from 'lucide-react';
import api from '../../../../services/api';

/**
 * PendingRequestsTable — Bekleyen (filtrelenebilir) talepler tablosu.
 *
 * Props:
 *  - typeFilter: '' | 'leave' | 'overtime' | 'cardless'
 *  - statusFilter: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
 *  - onRowClick: (request) => void  — drawer aç
 *  - monthFilter?: 'YYYY-MM' veya null  — trend bar tıklamasından
 */

const TYPE_CONFIG = {
    LEAVE: { label: 'İzin', color: '#3B82F6', bg: '#dbeafe', border: '#93c5fd', icon: CalendarIcon },
    OVERTIME: { label: 'Ek Mesai', color: '#B45309', bg: '#fef3c7', border: '#fcd34d', icon: Briefcase },
    CARDLESS: { label: 'Kartsız Giriş', color: '#6D28D9', bg: '#ede9fe', border: '#c4b5fd', icon: AlertCircle },
};

const BUCKET_COLORS = {
    '<24h': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    '24-48h': { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
    '48-72h': { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' },
    '>72h': { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
    '>1w': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtAge(hours) {
    if (hours == null) return '—';
    if (hours < 1) return '< 1s';
    if (hours < 24) return `${Math.round(hours)}s`;
    const days = Math.floor(hours / 24);
    return `${days}g ${Math.round(hours - days * 24)}s`;
}

function TypeBadge({ type }) {
    const c = TYPE_CONFIG[type] || TYPE_CONFIG.LEAVE;
    const Icon = c.icon;
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
            style={{ background: c.bg, color: c.color, borderColor: c.border }}
        >
            <Icon size={11} /> {c.label}
        </span>
    );
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

export default function PendingRequestsTable({
    typeFilter = '',
    statusFilter = 'PENDING',
    onRowClick,
    monthFilter = null,
}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        const params = {};
        if (typeFilter) params.type = typeFilter;
        if (statusFilter) params.status = statusFilter;
        api.get('/attendance-analytics/requests-pending-list/', { params })
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.detail || err?.message || 'Liste yüklenemedi');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [typeFilter, statusFilter]);

    const requests = useMemo(() => data?.requests || [], [data]);

    const filtered = useMemo(() => {
        let list = [...requests];

        // Month filter (created_at YYYY-MM eşleşmesi)
        if (monthFilter) {
            list = list.filter((r) => {
                if (!r.created_at) return false;
                const m = r.created_at.slice(0, 7);
                return m === monthFilter;
            });
        }

        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((r) =>
                tr(r.employee_name).includes(q)
                || tr(r.department).includes(q)
                || tr(r.target_approver_name).includes(q)
                || tr(r.reason).includes(q)
                || tr(r.id).includes(q),
            );
        }

        return list;
    }, [requests, search, monthFilter]);

    const columns = [
        {
            title: 'Tip',
            dataIndex: 'type',
            width: 130,
            sorter: (a, b) => String(a.type).localeCompare(String(b.type)),
            render: (v) => <TypeBadge type={v} />,
        },
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
            sorter: (a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'tr'),
            render: (v) => (
                <span className="inline-flex items-center gap-1 text-slate-500 text-[12px]">
                    <Building2 size={11} /> {v || '—'}
                </span>
            ),
        },
        {
            title: 'Tarih',
            dataIndex: 'date_or_range',
            render: (v) => (
                <span className="text-[12px] text-slate-700 tabular-nums">{v || '—'}</span>
            ),
        },
        {
            title: 'Süre',
            dataIndex: 'duration_or_days',
            align: 'center',
            width: 80,
            render: (v) => (
                <span className="text-[12px] font-bold text-slate-700 tabular-nums">{v || '—'}</span>
            ),
        },
        {
            title: 'Onaylayacak',
            dataIndex: 'target_approver_name',
            render: (v) => (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate-600">
                    <UserIcon size={11} /> {v || '—'}
                </span>
            ),
        },
        {
            title: 'Bekleme',
            dataIndex: 'age_hours',
            align: 'center',
            sorter: (a, b) => (a.age_hours || 0) - (b.age_hours || 0),
            defaultSortOrder: 'descend',
            render: (v, row) => (
                <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[11px] tabular-nums font-semibold text-slate-700">{fmtAge(v)}</span>
                    <BucketBadge bucket={row.age_bucket} />
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <Input
                    placeholder="Çalışan / departman / onaylayan / sebep ara..."
                    prefix={<SearchIcon size={12} className="text-slate-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    size="small"
                    className="max-w-sm"
                />
                {monthFilter && (
                    <Tag color="blue" className="!text-[10px] !font-bold">
                        <Clock size={10} className="inline mr-1" /> Ay: {monthFilter}
                    </Tag>
                )}
                <span className="ml-auto text-[10px] text-slate-500">
                    Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span>
                    {requests.length !== filtered.length && (
                        <> / {requests.length}</>
                    )}
                </span>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                    Hata: {error}
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {!loading && filtered.length === 0 ? (
                    <div className="py-10">
                        <Empty description={
                            search || monthFilter
                                ? 'Eşleşen talep yok'
                                : 'Bu filtrelerde bekleyen talep bulunamadı'
                        } />
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            pageSize,
                            onShowSizeChange: (_, size) => setPageSize(size),
                            showSizeChanger: true,
                            pageSizeOptions: [25, 50, 100],
                            size: 'small',
                        }}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        onRow={(row) => ({
                            onClick: () => onRowClick && onRowClick(row),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </div>
        </div>
    );
}
