import React, { useState, useEffect } from 'react';
import { Drawer, Tag, Button, Table, Empty } from 'antd';
import {
    Building2, Briefcase, FileDown, Loader2, CalendarCheck, Clock,
    ClipboardList, CreditCard,
} from 'lucide-react';
import api from '../../services/api';
import { RequestStatusTag, DirectionTag } from './accountingTags';
import {
    fmtDate, fmtDateTime, fmtTime, fmtRange, fmtDurationFromMinutes, fmtHourMin,
} from './accountingFormat';

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Section = ({ icon: Icon, title, count, children }) => (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <Icon size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
            {count != null ? <span className="text-[11px] text-slate-400">({count})</span> : null}
        </div>
        <div className="p-2">{children}</div>
    </div>
);

const emptyNode = (
    <Empty description="Kayıt yok" image={Empty.PRESENTED_IMAGE_SIMPLE} className="my-2" />
);

const compactTable = (dataSource, columns, rowKey = 'id') => (
    <Table
        dataSource={dataSource}
        columns={columns}
        rowKey={rowKey}
        size="small"
        pagination={dataSource.length > 8 ? { pageSize: 8, simple: true } : false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: emptyNode }}
    />
);

/**
 * Kişi detayı drawer'ı — /accounting/person/<id>/
 * Props:
 *   - open, onClose
 *   - employeeId
 *   - params: dönem parametreleri
 *   - onExportPerson(employeeId): kişi TXT indir
 *   - exportingPerson: indirme yükleme durumu
 *   - onViewCardData(employeeId): kişiyi Kart Verileri sekmesine taşı
 */
export default function PersonDrawer({
    open, onClose, employeeId, params, onExportPerson, exportingPerson, onViewCardData,
}) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!open || !employeeId) {
            // setState'i efekt gövdesinde senkron çağırma — bir sonraki tick'e ertele
            Promise.resolve().then(() => { if (!cancelled) setDetail(null); });
            return () => { cancelled = true; };
        }
        Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
        api.get(`/accounting/person/${employeeId}/`, { params })
            .then((res) => { if (!cancelled) setDetail(res.data); })
            .catch((err) => {
                if (!cancelled) console.error('Kişi detayı alınamadı:', err);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, employeeId, params]);

    const emp = detail?.employee;
    const live = detail?.live_status;

    const leaveCols = [
        { title: 'Tür', dataIndex: 'request_type_name', key: 't', render: (v) => v || '—' },
        { title: 'Aralık', key: 'r', render: (_, r) => <span className="tabular-nums">{fmtRange(r.start_date, r.end_date)}</span> },
        { title: 'Gün', dataIndex: 'total_days', key: 'd', align: 'right', render: (v) => (v == null ? '—' : v) },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} /> },
    ];

    const otCols = [
        { title: 'Tarih', dataIndex: 'date', key: 'd', render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Saat', key: 't', render: (_, r) => <span className="tabular-nums">{fmtTime(r.start_time)}–{fmtTime(r.end_time)}</span> },
        { title: 'Süre', dataIndex: 'duration_minutes', key: 'dur', align: 'right', render: (v, r) => fmtDurationFromMinutes(v != null ? v : (r.duration_seconds != null ? r.duration_seconds / 60 : null)) },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} /> },
    ];

    const attCols = [
        { title: 'Tarih', dataIndex: 'work_date', key: 'd', render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Giriş', dataIndex: 'check_in', key: 'i', render: (v) => <span className="tabular-nums">{fmtTime(v)}</span> },
        { title: 'Çıkış', dataIndex: 'check_out', key: 'o', render: (v) => <span className="tabular-nums">{fmtTime(v)}</span> },
        { title: 'Normal', dataIndex: 'normal_seconds', key: 'n', align: 'right', render: (v) => <span className="tabular-nums">{fmtHourMin(v)}</span> },
        { title: 'Fazla', dataIndex: 'overtime_seconds', key: 'ot', align: 'right', render: (v) => <span className="tabular-nums text-amber-600">{fmtHourMin(v)}</span> },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => r.status_display || v || '—' },
    ];

    const rawCols = [
        { title: 'Zaman', dataIndex: 'timestamp', key: 't', render: (v) => <span className="tabular-nums">{fmtDateTime(v)}</span> },
        { title: 'Yön', dataIndex: 'direction', key: 'd', align: 'center', render: (v) => <DirectionTag direction={v} /> },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v) => v || '—' },
    ];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={560}
            destroyOnClose
            closable={false}
            styles={{ body: { padding: 0 }, header: { display: 'none' } }}
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/40 to-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm flex-shrink-0 bg-blue-500">
                        {initials(emp?.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-black text-slate-900 leading-tight truncate">
                                {emp?.name || (loading ? 'Yükleniyor…' : '—')}
                            </h2>
                            {emp?.employee_code ? (
                                <span className="text-xs text-slate-400 tabular-nums">{emp.employee_code}</span>
                            ) : null}
                            {live?.label ? (
                                <Tag color={live.color || 'default'} className="!ml-auto">{live.label}</Tag>
                            ) : null}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><Building2 size={12} /> {emp?.department || '—'}</span>
                            <span className="flex items-center gap-1"><Briefcase size={12} /> {emp?.job_title || '—'}</span>
                        </p>
                    </div>
                </div>
                {live && (live.check_in || live.manager_name || live.duration) ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {live.check_in ? (
                            <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                                <span className="text-slate-400">Giriş: </span>
                                <span className="font-semibold text-slate-700 tabular-nums">{fmtTime(live.check_in)}</span>
                            </div>
                        ) : null}
                        {live.duration ? (
                            <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                                <span className="text-slate-400">Süre: </span>
                                <span className="font-semibold text-slate-700">{live.unit_detailed || live.duration}</span>
                            </div>
                        ) : null}
                        {live.manager_name ? (
                            <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5 col-span-2">
                                <span className="text-slate-400">Yönetici: </span>
                                <span className="font-semibold text-slate-700">{live.manager_name}</span>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3 pb-24">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Yükleniyor…</div>
                ) : detail ? (
                    <>
                        <Section icon={CalendarCheck} title="İzinler" count={detail.leaves?.length}>
                            {detail.leaves?.length ? compactTable(detail.leaves, leaveCols) : emptyNode}
                        </Section>
                        <Section icon={Clock} title="Mesailer" count={detail.overtime?.length}>
                            {detail.overtime?.length ? compactTable(detail.overtime, otCols) : emptyNode}
                        </Section>
                        <Section icon={ClipboardList} title="Günlük Puantaj" count={detail.attendance?.length}>
                            {detail.attendance?.length ? compactTable(detail.attendance, attCols) : emptyNode}
                        </Section>
                        <Section icon={CreditCard} title="Ham Kart Olayları" count={detail.raw_events?.length}>
                            {detail.raw_events?.length ? compactTable(detail.raw_events, rawCols) : emptyNode}
                        </Section>
                    </>
                ) : (
                    <div className="text-center py-10 text-slate-400 text-sm">Kayıt bulunamadı.</div>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-5 py-3 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between gap-2">
                <Button onClick={onClose} size="middle">Kapat</Button>
                <div className="flex items-center gap-2">
                    <Button
                        size="middle"
                        disabled={!emp}
                        icon={<CreditCard size={14} />}
                        onClick={() => onViewCardData?.(employeeId)}
                    >
                        Kart Verilerini Gör
                    </Button>
                    <Button
                        type="primary"
                        size="middle"
                        disabled={!emp || exportingPerson}
                        icon={exportingPerson ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                        onClick={() => onExportPerson?.(employeeId)}
                    >
                        Kişi TXT İndir
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
