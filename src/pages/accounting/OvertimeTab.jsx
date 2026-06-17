import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Empty, message, Tag, Tooltip } from 'antd';
import api from '../../services/api';
import { RequestStatusTag } from './accountingTags';
import { fmtDate, fmtTime, fmtDurationFromMinutes } from './accountingFormat';

const SOURCE_LABELS = {
    POTENTIAL: { label: 'Algılanan', color: 'cyan' },
    MANUAL: { label: 'Manuel', color: 'gold' },
    INTENDED: { label: 'Planlı', color: 'geekblue' },
    ASSIGNED: { label: 'Atanan', color: 'geekblue' },
};

/**
 * Mesailer sekmesi — /accounting/overtime/
 * Props: params, ready, search, active, onSelectEmployee
 */
export default function OvertimeTab({ params, ready, search, active, onSelectEmployee }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const fetchOvertime = useCallback(async () => {
        if (!ready) return;
        setLoading(true);
        try {
            const res = await api.get('/accounting/overtime/', {
                params: { ...params, q: search || undefined },
            });
            setRows(res.data.results || []);
            setLoaded(true);
        } catch (err) {
            console.error('Mesailer yüklenemedi:', err);
            message.error('Fazla mesai kayıtları yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [params, ready, search]);

    useEffect(() => {
        if (active && ready) fetchOvertime();
    }, [active, ready, fetchOvertime]);

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLocaleLowerCase('tr');
        if (!q) return rows;
        return rows.filter((r) =>
            `${r.employee_name || ''} ${r.employee_code || ''} ${r.department || ''}`
                .toLocaleLowerCase('tr')
                .includes(q)
        );
    }, [rows, search]);

    const statusFilters = useMemo(() => {
        const map = new Map();
        rows.forEach((r) => { if (r.status) map.set(r.status, r.status_display || r.status); });
        return [...map.entries()].map(([value, text]) => ({ value, text }));
    }, [rows]);

    const columns = [
        {
            title: 'Çalışan',
            key: 'employee',
            ellipsis: true,
            render: (_, r) => (
                <button
                    onClick={() => onSelectEmployee?.(r.employee_id)}
                    className="text-left text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                    {r.employee_name}
                    {r.employee_code ? <span className="text-slate-400 font-normal"> · {r.employee_code}</span> : null}
                </button>
            ),
        },
        {
            title: 'Tarih',
            dataIndex: 'date',
            key: 'date',
            width: 120,
            render: (v) => <span className="tabular-nums">{fmtDate(v)}</span>,
            sorter: (a, b) => (a.date || '').localeCompare(b.date || ''),
        },
        {
            title: 'Saat Aralığı',
            key: 'time',
            width: 140,
            render: (_, r) => (
                <span className="tabular-nums">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</span>
            ),
        },
        {
            title: 'Süre',
            dataIndex: 'duration_minutes',
            key: 'duration',
            width: 110,
            align: 'right',
            render: (v, r) => fmtDurationFromMinutes(v != null ? v : (r.duration_seconds != null ? r.duration_seconds / 60 : null)),
            sorter: (a, b) => (Number(a.duration_seconds) || 0) - (Number(b.duration_seconds) || 0),
        },
        {
            title: 'Kaynak',
            dataIndex: 'source_type',
            key: 'source_type',
            width: 110,
            align: 'center',
            render: (v, r) => {
                if (r.is_manual && (!v || v === 'MANUAL')) {
                    return <Tag color="gold">Manuel</Tag>;
                }
                const cfg = SOURCE_LABELS[v];
                return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : (v ? <Tag>{v}</Tag> : '—');
            },
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            align: 'center',
            render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} />,
            filters: statusFilters,
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Onaylayan',
            dataIndex: 'approval_manager_name',
            key: 'approval_manager_name',
            width: 150,
            ellipsis: true,
            responsive: ['lg'],
            render: (v, r) => {
                if (!v) return <span className="text-slate-400">—</span>;
                return r.approval_date ? <Tooltip title={fmtDate(r.approval_date)}>{v}</Tooltip> : v;
            },
        },
    ];

    return (
        <div className="glass-card p-0 overflow-hidden animate-fade-in">
            <Table
                dataSource={filtered}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="middle"
                scroll={{ x: 880 }}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} mesai`,
                }}
                locale={{
                    emptyText: (
                        <Empty
                            description={loaded ? 'Fazla mesai kaydı bulunamadı' : 'Yükleniyor…'}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ),
                }}
            />
        </div>
    );
}
