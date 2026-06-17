import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Empty, message, Tooltip } from 'antd';
import api from '../../services/api';
import { RequestStatusTag } from './accountingTags';
import { fmtRange, fmtDate, emptyStateText } from './accountingFormat';

/**
 * İzinler sekmesi — /accounting/leaves/
 * Props: params, ready, search, active, onSelectEmployee
 *
 * Not: leaves TÜM dönem verisini tek seferde döner (backend pagination yok),
 * bu yüzden fetch yalnız dönem değişiminde olur; arama tamamen client-side.
 */
export default function LeavesTab({ params, ready, search, active, onSelectEmployee }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const fetchLeaves = useCallback(async () => {
        if (!ready) return;
        setLoading(true);
        setLoaded(false); // başarısız refetch stale "Kayıt bulunamadı" göstermesin
        try {
            const res = await api.get('/accounting/leaves/', {
                params: { ...params },
            });
            setRows(res.data.results || []);
            setLoaded(true);
        } catch (err) {
            console.error('İzinler yüklenemedi:', err);
            message.error('İzin kayıtları yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [params, ready]);

    // Aktif olduğunda + dönem parametresi değişiminde çek (arama tetiklemez)
    useEffect(() => {
        if (active && ready) fetchLeaves();
    }, [active, ready, fetchLeaves]);

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLocaleLowerCase('tr');
        if (!q) return rows;
        return rows.filter((r) =>
            `${r.employee_name || ''} ${r.employee_code || ''} ${r.department || ''} ${r.request_type_name || ''}`
                .toLocaleLowerCase('tr')
                .includes(q)
        );
    }, [rows, search]);

    // Durum / tür filtre seçeneklerini mevcut veriden türet
    const statusFilters = useMemo(() => {
        const map = new Map();
        rows.forEach((r) => { if (r.status) map.set(r.status, r.status_display || r.status); });
        return [...map.entries()].map(([value, text]) => ({ value, text }));
    }, [rows]);

    const typeFilters = useMemo(() => {
        const map = new Map();
        rows.forEach((r) => { if (r.request_type_code) map.set(r.request_type_code, r.request_type_name || r.request_type_code); });
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
            title: 'Tür',
            dataIndex: 'request_type_name',
            key: 'request_type_name',
            width: 160,
            ellipsis: true,
            render: (v) => v || '—',
            filters: typeFilters,
            onFilter: (value, record) => record.request_type_code === value,
        },
        {
            title: 'Tarih Aralığı',
            key: 'range',
            width: 200,
            render: (_, r) => {
                const range = fmtRange(r.start_date, r.end_date);
                const times = r.start_time || r.end_time
                    ? ` (${r.start_time || ''}${r.end_time ? ' – ' + r.end_time : ''})`
                    : '';
                return <span className="tabular-nums">{range}{times}</span>;
            },
        },
        {
            title: 'Gün',
            dataIndex: 'total_days',
            key: 'total_days',
            width: 80,
            align: 'right',
            render: (v) => (v == null ? '—' : Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })),
            sorter: (a, b) => (Number(a.total_days) || 0) - (Number(b.total_days) || 0),
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
            dataIndex: 'approved_by_name',
            key: 'approved_by_name',
            width: 150,
            ellipsis: true,
            responsive: ['lg'],
            render: (v, r) => {
                if (!v) return <span className="text-slate-400">—</span>;
                return r.approved_at ? (
                    <Tooltip title={fmtDate(r.approved_at)}>{v}</Tooltip>
                ) : v;
            },
        },
        {
            title: 'Sebep',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            responsive: ['xl'],
            render: (v, r) => {
                const text = r.status === 'REJECTED' && r.rejection_reason
                    ? `Red: ${r.rejection_reason}`
                    : v;
                return text ? <Tooltip title={text}><span className="text-slate-500">{text}</span></Tooltip> : <span className="text-slate-400">—</span>;
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
                scroll={{ x: 900 }}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} izin`,
                }}
                locale={{
                    emptyText: (
                        <Empty
                            description={emptyStateText(ready, loaded, 'İzin kaydı bulunamadı')}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ),
                }}
            />
        </div>
    );
}
