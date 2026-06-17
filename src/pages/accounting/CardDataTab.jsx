import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Empty, message, Select, Tag, Alert } from 'antd';
import { CreditCard, ClipboardList, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { DirectionTag } from './accountingTags';
import {
    fmtDate, fmtDateTime, fmtTime, fmtHourMin, emptyStateText,
} from './accountingFormat';

const ATT_SOURCE_COLORS = {
    CARD: 'blue',
    ADMIN_ENTRY: 'gold',
    CARDLESS: 'purple',
    AUTO_SPLIT: 'cyan',
};

/**
 * Kart Verileri sekmesi — /accounting/card-data/
 * Çalışan seçici (zorunlu önerilir) + iki tablo:
 *   - Ham Kart Olayları (raw_events)
 *   - İşlenmiş Puantaj (attendance)
 *
 * Props: params, ready, active, externalEmployeeId, onConsumeExternal
 *   - externalEmployeeId: roster/diğer sekmelerden gelen önceden seçili çalışan
 */
export default function CardDataTab({
    params, ready, active, externalEmployeeId, onConsumeExternal,
}) {
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [selectedEmpId, setSelectedEmpId] = useState(null);
    const [data, setData] = useState(null); // { raw_events, attendance, warning }
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Çalışan listesi (seçici için) — bir kez yükle
    useEffect(() => {
        if (!active || employees.length) return;
        const fetchEmployees = async () => {
            setEmpLoading(true);
            try {
                // M-4: page_size=500 — kurum çalışan sayısı bunun altında olduğundan
                // tek sayfa yeterli. Personel sayısı 500'ü aşarsa seçicide eksik
                // görünür; o noktada server-side aramalı (showSearch + onSearch) bir
                // çalışan picker'a geçilmeli.
                const res = await api.get('/employees/', {
                    params: { page_size: 500, include_inactive: 1 },
                });
                setEmployees(res.data.results || res.data || []);
            } catch (err) {
                console.error('Çalışan listesi yüklenemedi:', err);
            } finally {
                setEmpLoading(false);
            }
        };
        fetchEmployees();
    }, [active, employees.length]);

    // Dışarıdan gelen seçili çalışanı uygula (örn. başka sekmeden geçiş)
    useEffect(() => {
        if (externalEmployeeId) {
            setSelectedEmpId(externalEmployeeId);
            onConsumeExternal?.();
        }
    }, [externalEmployeeId, onConsumeExternal]);

    const fetchCardData = useCallback(async () => {
        if (!ready) return;
        setLoading(true);
        setLoaded(false); // başarısız refetch stale "kayıt yok" göstermesin
        try {
            const reqParams = { ...params };
            if (selectedEmpId) reqParams.employee_id = selectedEmpId;
            const res = await api.get('/accounting/card-data/', { params: reqParams });
            setData({
                raw_events: res.data.raw_events || [],
                attendance: res.data.attendance || [],
                warning: res.data.warning || null,
            });
            setLoaded(true);
        } catch (err) {
            console.error('Kart verisi yüklenemedi:', err);
            message.error('Kart verisi yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [params, ready, selectedEmpId]);

    useEffect(() => {
        if (active && ready) fetchCardData();
    }, [active, ready, fetchCardData]);

    const empOptions = useMemo(() => employees.map((e) => ({
        value: e.id,
        label: `${e.first_name || ''} ${e.last_name || ''}`.trim()
            + (e.employee_code ? ` · ${e.employee_code}` : '')
            + (e.is_active === false ? ' (ayrıldı)' : ''),
    })), [employees]);

    const rawColumns = [
        {
            title: 'Çalışan',
            key: 'emp',
            ellipsis: true,
            render: (_, r) => (
                <span>
                    {r.employee_name}
                    {r.employee_code ? <span className="text-slate-400"> · {r.employee_code}</span> : null}
                </span>
            ),
        },
        {
            title: 'Zaman Damgası',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 170,
            render: (v) => <span className="tabular-nums">{fmtDateTime(v)}</span>,
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Yön',
            dataIndex: 'direction',
            key: 'direction',
            width: 90,
            align: 'center',
            render: (v) => <DirectionTag direction={v} />,
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            ellipsis: true,
            render: (v) => v || '—',
        },
        {
            title: 'Olay ID',
            dataIndex: 'event_id',
            key: 'event_id',
            width: 160,
            ellipsis: true,
            responsive: ['lg'],
            render: (v) => v ? <span className="text-xs text-slate-400 tabular-nums">{v}</span> : '—',
        },
    ];

    const attColumns = [
        {
            title: 'Çalışan',
            key: 'emp',
            ellipsis: true,
            render: (_, r) => (
                <span>
                    {r.employee_name}
                    {r.employee_code ? <span className="text-slate-400"> · {r.employee_code}</span> : null}
                </span>
            ),
        },
        {
            title: 'Tarih',
            dataIndex: 'work_date',
            key: 'work_date',
            width: 120,
            render: (v) => <span className="tabular-nums">{fmtDate(v)}</span>,
            sorter: (a, b) => (a.work_date || '').localeCompare(b.work_date || ''),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Giriş',
            dataIndex: 'check_in',
            key: 'check_in',
            width: 90,
            align: 'center',
            render: (v) => <span className="tabular-nums">{fmtTime(v)}</span>,
        },
        {
            title: 'Çıkış',
            dataIndex: 'check_out',
            key: 'check_out',
            width: 90,
            align: 'center',
            render: (v) => <span className="tabular-nums">{fmtTime(v)}</span>,
        },
        {
            title: 'Normal',
            dataIndex: 'normal_seconds',
            key: 'normal_seconds',
            width: 90,
            align: 'right',
            render: (v) => <span className="tabular-nums">{fmtHourMin(v)}</span>,
        },
        {
            title: 'Fazla',
            dataIndex: 'overtime_seconds',
            key: 'overtime_seconds',
            width: 90,
            align: 'right',
            render: (v) => <span className="tabular-nums text-amber-600">{fmtHourMin(v)}</span>,
        },
        {
            title: 'Eksik',
            dataIndex: 'missing_seconds',
            key: 'missing_seconds',
            width: 90,
            align: 'right',
            responsive: ['md'],
            render: (v) => <span className="tabular-nums text-red-600">{fmtHourMin(v)}</span>,
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            ellipsis: true,
            render: (v, r) => r.status_display || v || '—',
        },
        {
            title: 'Kaynak',
            dataIndex: 'source',
            key: 'source',
            width: 110,
            align: 'center',
            responsive: ['lg'],
            render: (v, r) => v ? <Tag color={ATT_SOURCE_COLORS[v] || 'default'}>{r.source_display || v}</Tag> : '—',
        },
    ];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Çalışan seçici */}
            <div className="glass-card p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Çalışan Seçimi (önerilir)
                </label>
                <Select
                    showSearch
                    allowClear
                    loading={empLoading}
                    value={selectedEmpId}
                    onChange={setSelectedEmpId}
                    placeholder="Çalışan seçin — seçim yapılmazsa son 50 kayıt gösterilir"
                    optionFilterProp="label"
                    options={empOptions}
                    className="w-full md:w-[420px]"
                />
                {data?.warning && (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<AlertTriangle size={16} />}
                        className="mt-3"
                        message="Çalışan seçilmedi"
                        description={data.warning}
                    />
                )}
            </div>

            {/* Ham Kart Olayları */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <CreditCard size={18} className="text-blue-500" />
                    <h3 className="font-bold text-slate-700">Ham Kart Olayları</h3>
                    {data?.raw_events ? (
                        <span className="text-xs text-slate-400">({data.raw_events.length})</span>
                    ) : null}
                </div>
                <Table
                    dataSource={data?.raw_events || []}
                    columns={rawColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 700 }}
                    pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
                    locale={{
                        emptyText: (
                            <Empty
                                description={emptyStateText(ready, loaded, 'Ham kart olayı yok')}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ),
                    }}
                />
            </div>

            {/* İşlenmiş Puantaj */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <ClipboardList size={18} className="text-emerald-500" />
                    <h3 className="font-bold text-slate-700">İşlenmiş Puantaj</h3>
                    {data?.attendance ? (
                        <span className="text-xs text-slate-400">({data.attendance.length})</span>
                    ) : null}
                </div>
                <Table
                    dataSource={data?.attendance || []}
                    columns={attColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 880 }}
                    pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
                    locale={{
                        emptyText: (
                            <Empty
                                description={emptyStateText(ready, loaded, 'Puantaj kaydı yok')}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ),
                    }}
                />
            </div>
        </div>
    );
}
