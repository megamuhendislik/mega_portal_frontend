import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Select, Table, Empty, message, Spin, Tag, Button, Tooltip, Card, Statistic,
} from 'antd';
import {
    CalendarCheck, Plane, Clock, Utensils, CreditCard, ClipboardList,
    Layers, Wallet, FileDown, Loader2, UserSearch,
} from 'lucide-react';
import api from '../../services/api';
import {
    RequestStatusTag, DirectionTag, MealStatusTag, CardlessStatusTag,
} from './accountingTags';
import {
    fmtDate, fmtDateTime, fmtTime, fmtRange,
    fmtDurationFromMinutes, fmtHourMin,
} from './accountingFormat';
import {
    renderLeaveDetail, renderOvertimeDetail, renderMealDetail,
    renderCardlessDetail, renderAttendanceDetail,
} from './accountingDetail';

// =========== Bölüm tanımları (tür göster/gizle çipleri ile aynı) ===========
const SECTION_DEFS = [
    { key: 'leaves', label: 'İzinler', icon: CalendarCheck },
    { key: 'external_duty', label: 'Dış Görev', icon: Plane },
    { key: 'overtime', label: 'Fazla Mesai', icon: Clock },
    { key: 'meal_requests', label: 'Yemek', icon: Utensils },
    { key: 'cardless_requests', label: 'Kartsız Giriş', icon: CreditCard },
    { key: 'attendance', label: 'Günlük Puantaj', icon: ClipboardList },
    { key: 'raw_events', label: 'Ham Kart', icon: Layers },
    { key: 'entitlement', label: 'İzin Bakiyesi', icon: Wallet },
];

// Tablo sıralayıcıları — ISO tarih string'leri leksikografik = kronolojik sıralanır
const byDate = (k) => (a, b) => String(a[k] || '').localeCompare(String(b[k] || ''));
const byNum = (k) => (a, b) => (Number(a[k]) || 0) - (Number(b[k]) || 0);

// Bölüm başlığı (ikon + başlık + sayı rozeti + opsiyonel sağ aksiyon)
const SectionHeader = ({ icon: Icon, title, count, extra }) => (
    <div className="flex items-center gap-2 mb-3">
        <Icon size={17} className="text-blue-500" />
        <span className="text-sm font-bold text-slate-700">{title}</span>
        {count != null ? (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">
                {count}
            </span>
        ) : null}
        {extra ? <div className="ml-auto">{extra}</div> : null}
    </div>
);

// Tür-içi durum filtresi (client-side) — duruma göre seçilebilir çipler
const StatusFilterBar = ({ rows, value, onChange, statusKey = 'status', displayKey = 'status_display' }) => {
    const options = useMemo(() => {
        const map = new Map();
        (rows || []).forEach((r) => {
            const s = r[statusKey];
            if (s) map.set(s, r[displayKey] || s);
        });
        return [...map.entries()].map(([v, t]) => ({ value: v, text: t }));
    }, [rows, statusKey, displayKey]);

    if (options.length <= 1) return null;
    return (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Tag.CheckableTag checked={!value} onChange={() => onChange(null)}>
                Tümü
            </Tag.CheckableTag>
            {options.map((o) => (
                <Tag.CheckableTag
                    key={o.value}
                    checked={value === o.value}
                    onChange={() => onChange(value === o.value ? null : o.value)}
                >
                    {o.text}
                </Tag.CheckableTag>
            ))}
        </div>
    );
};

// Ortak expand-tablo sarmalayıcı (satıra tıkla → detay)
const DetailTable = ({ dataSource, columns, expandRender, rowKey = 'id', emptyText = 'Kayıt yok' }) => (
    <Table
        dataSource={dataSource}
        columns={columns}
        rowKey={rowKey}
        size="small"
        scroll={{ x: 'max-content' }}
        expandable={{
            expandedRowRender: (record) => expandRender(record),
            expandRowByClick: true,
        }}
        pagination={dataSource.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
        locale={{ emptyText: <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
    />
);

/**
 * Çalışan Detayı sekmesi — kişi seç + aralık → tüm türler ayrı/filtrelenebilir/expand.
 * Props:
 *   - params: dönem/aralık parametreleri (AccountingPeriodBar'dan)
 *   - ready: parametreler hazır mı
 *   - active: sekme aktif mi (lazy fetch)
 *   - onExportPerson(employeeId): kişi TXT indir (AccountingPanel'den)
 *   - exportingPerson: indirme yükleme durumu
 */
export default function EmployeeDetailTab({ params, ready, active, onExportPerson, exportingPerson }) {
    // Çalışan listesi (seçici opsiyonları)
    const [employees, setEmployees] = useState([]);
    const [rosterLoaded, setRosterLoaded] = useState(false);
    const [selectedEmpId, setSelectedEmpId] = useState(null);

    // Kişi detayı
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);

    // Tür göster/gizle çipleri (varsayılan: hepsi açık)
    const [visibleTypes, setVisibleTypes] = useState(() => new Set(SECTION_DEFS.map((s) => s.key)));

    // Tür-içi durum filtreleri (bölüm-key → status değeri | null)
    const [statusFilters, setStatusFilters] = useState({});

    // Ham Kart bölümü yön filtresi (null | 'IN' | 'OUT')
    const [rawDir, setRawDir] = useState(null);

    // Roster'ı bir kez (sekme ilk aktif olunca) çek — çalışan seçici beslemesi
    const fetchRoster = useCallback(async () => {
        if (!ready) return;
        try {
            const res = await api.get('/accounting/roster/', {
                params: { ...params, include_inactive: true },
            });
            const rows = res.data.results || res.data || [];
            setEmployees(rows);
            setRosterLoaded(true);
        } catch (err) {
            console.error('Çalışan listesi yüklenemedi:', err);
            message.error('Çalışan listesi yüklenemedi.');
        }
    }, [params, ready]);

    useEffect(() => {
        if (active && ready) fetchRoster();
    }, [active, ready, fetchRoster]);

    // Seçili kişi + dönem değişiminde kişi detayını çek
    const fetchPerson = useCallback(async () => {
        if (!ready || !selectedEmpId) return;
        setLoading(true);
        try {
            const res = await api.get(`/accounting/person/${selectedEmpId}/`, { params });
            setDetail(res.data);
            setStatusFilters({}); // yeni kişi → filtreleri sıfırla
            setRawDir(null);
        } catch (err) {
            console.error('Kişi detayı alınamadı:', err);
            message.error('Kişi detayı yüklenemedi.');
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [selectedEmpId, params, ready]);

    useEffect(() => {
        if (active && ready && selectedEmpId) fetchPerson();
    }, [active, ready, selectedEmpId, fetchPerson]);

    // Çalışan seçici opsiyonları (ad/kod/departman ile aranabilir)
    const empOptions = useMemo(() => employees.map((e) => {
        const code = e.employee_code ? ` · ${e.employee_code}` : '';
        const dept = e.department ? ` — ${e.department}` : '';
        return {
            value: e.employee_id,
            label: `${e.name || '—'}${code}${dept}`,
            searchText: `${e.name || ''} ${e.employee_code || ''} ${e.department || ''}`
                .toLocaleLowerCase('tr'),
        };
    }), [employees]);

    const toggleType = useCallback((key) => {
        setVisibleTypes((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    const setStatusFilter = useCallback((sectionKey, value) => {
        setStatusFilters((prev) => ({ ...prev, [sectionKey]: value }));
    }, []);

    // Bir bölümün satırlarını seçili durum filtresine göre süz
    const applyStatusFilter = useCallback((sectionKey, rows) => {
        const f = statusFilters[sectionKey];
        if (!f) return rows || [];
        return (rows || []).filter((r) => r.status === f);
    }, [statusFilters]);

    // ---- Sütun tanımları ----
    const leaveCols = useMemo(() => [
        { title: 'Tür', dataIndex: 'request_type_name', key: 't', render: (v) => v || '—' },
        { title: 'Aralık', key: 'r', sorter: byDate('start_date'), render: (_, r) => <span className="tabular-nums">{fmtRange(r.start_date, r.end_date)}</span> },
        { title: 'Gün', dataIndex: 'total_days', key: 'd', align: 'right', sorter: byNum('total_days'), render: (v) => (v == null ? '—' : v) },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} /> },
        { title: 'Onaylayan', dataIndex: 'approved_by_name', key: 'a', responsive: ['md'], render: (v) => v || <span className="text-slate-400">—</span> },
    ], []);

    const dutyCols = useMemo(() => [
        { title: 'Aralık', key: 'r', sorter: byDate('start_date'), render: (_, r) => <span className="tabular-nums">{fmtRange(r.start_date, r.end_date)}</span> },
        { title: 'İl', dataIndex: 'duty_city', key: 'c', render: (v) => v || '—' },
        { title: 'Firma', dataIndex: 'duty_company', key: 'f', responsive: ['md'], render: (v) => v || '—' },
        { title: 'Gün', dataIndex: 'total_days', key: 'd', align: 'right', sorter: byNum('total_days'), render: (v) => (v == null ? '—' : v) },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} /> },
    ], []);

    const otCols = useMemo(() => [
        { title: 'Tarih', dataIndex: 'date', key: 'd', sorter: byDate('date'), render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Saat', key: 't', render: (_, r) => <span className="tabular-nums">{fmtTime(r.start_time)}–{fmtTime(r.end_time)}</span> },
        { title: 'Süre', dataIndex: 'duration_minutes', key: 'dur', align: 'right', sorter: byNum('duration_seconds'), render: (v, r) => fmtDurationFromMinutes(v != null ? v : (r.duration_seconds != null ? r.duration_seconds / 60 : null)) },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <RequestStatusTag status={v} statusDisplay={r.status_display} /> },
    ], []);

    const mealCols = useMemo(() => [
        { title: 'Tarih', dataIndex: 'date', key: 'd', sorter: byDate('date'), render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Açıklama', dataIndex: 'description', key: 'desc', ellipsis: true, render: (v) => v || '—' },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <MealStatusTag status={v} statusDisplay={r.status_display} /> },
    ], []);

    const cardlessCols = useMemo(() => [
        { title: 'Tarih', dataIndex: 'date', key: 'd', sorter: byDate('date'), render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Giriş/Çıkış', key: 't', render: (_, r) => <span className="tabular-nums">{fmtTime(r.check_in_time)}–{fmtTime(r.check_out_time)}</span> },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => <CardlessStatusTag status={v} statusDisplay={r.status_display} /> },
    ], []);

    const attCols = useMemo(() => [
        { title: 'Tarih', dataIndex: 'work_date', key: 'd', sorter: byDate('work_date'), render: (v) => <span className="tabular-nums">{fmtDate(v)}</span> },
        { title: 'Giriş', dataIndex: 'check_in', key: 'i', render: (v) => <span className="tabular-nums">{fmtTime(v)}</span> },
        { title: 'Çıkış', dataIndex: 'check_out', key: 'o', render: (v) => <span className="tabular-nums">{fmtTime(v)}</span> },
        { title: 'Normal', dataIndex: 'normal_seconds', key: 'n', align: 'right', sorter: byNum('normal_seconds'), render: (v) => <span className="tabular-nums">{fmtHourMin(v)}</span> },
        { title: 'Fazla', dataIndex: 'overtime_seconds', key: 'ot', align: 'right', sorter: byNum('overtime_seconds'), render: (v) => <span className="tabular-nums text-amber-600">{fmtHourMin(v)}</span> },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v, r) => r.status_display || v || '—' },
    ], []);

    const rawCols = useMemo(() => [
        { title: 'Zaman', dataIndex: 'timestamp', key: 't', sorter: byDate('timestamp'), render: (v) => <span className="tabular-nums">{fmtDateTime(v)}</span> },
        { title: 'Yön', dataIndex: 'direction', key: 'd', align: 'center', render: (v) => <DirectionTag direction={v} /> },
        { title: 'Durum', dataIndex: 'status', key: 's', render: (v) => v || '—' },
    ], []);

    // İzin bakiyesi yıl tabloları sütunları
    const annualYearCols = useMemo(() => [
        { title: 'Yıl', dataIndex: 'year', key: 'y' },
        { title: 'Hak Edilen', dataIndex: 'days_entitled', key: 'e', align: 'right', render: (v) => (v == null ? '—' : v) },
        { title: 'Kullanılan', dataIndex: 'days_used', key: 'u', align: 'right', render: (v) => (v == null ? '—' : v) },
        { title: 'Kalan', dataIndex: 'remaining', key: 'r', align: 'right', render: (v) => <strong>{v == null ? '—' : v}</strong> },
        { title: 'Devir', dataIndex: 'is_transferred', key: 't', align: 'center', render: (v) => (v ? <Tag color="blue">Devir</Tag> : '—') },
        { title: 'Son Kullanma', dataIndex: 'expiry_date', key: 'x', render: (v) => fmtDate(v) },
    ], []);

    const excuseCols = useMemo(() => [
        { title: 'Yıl', dataIndex: 'year', key: 'y' },
        { title: 'Hak (saat)', dataIndex: 'hours_entitled', key: 'e', align: 'right', render: (v) => (v == null ? '—' : v) },
        { title: 'Kullanılan (saat)', dataIndex: 'hours_used', key: 'u', align: 'right', render: (v) => (v == null ? '—' : v) },
        { title: 'Kalan (saat)', dataIndex: 'remaining_hours', key: 'r', align: 'right', render: (v) => <strong>{v == null ? '—' : v}</strong> },
    ], []);

    const birthdayCols = useMemo(() => [
        { title: 'Yıl', dataIndex: 'year', key: 'y' },
        { title: 'Kullanıldı', dataIndex: 'is_used', key: 'u', align: 'center', render: (v) => (v ? <Tag color="green">Evet</Tag> : <Tag>Hayır</Tag>) },
        { title: 'Kullanım Tarihi', dataIndex: 'used_date', key: 'd', render: (v) => fmtDate(v) },
    ], []);

    // İzin bakiyesi bölümü (özet kartlar + 3 yıl-bazlı tablo)
    const renderEntitlement = (ent) => {
        if (!ent) return <Empty description="Bakiye bilgisi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card size="small"><Statistic title="Yıllık Bakiye" value={ent.annual_balance ?? 0} suffix="gün" /></Card>
                    <Card size="small"><Statistic title="Avans Limiti" value={ent.advance_limit ?? 0} suffix="gün" /></Card>
                    <Card size="small"><Statistic title="Avans Kullanılan" value={ent.advance_used ?? 0} suffix="gün" /></Card>
                    <Card size="small"><Statistic title="Bu Yıl Tamamlanan" value={ent.completed_this_year ?? 0} suffix="gün" /></Card>
                </div>
                {ent.advance_granted_at ? (
                    <div className="text-xs text-slate-500">
                        Avans tanım tarihi: <strong>{fmtDate(ent.advance_granted_at)}</strong>
                        {ent.completed_total != null ? <> · Toplam tamamlanan: <strong>{ent.completed_total} gün</strong></> : null}
                    </div>
                ) : null}

                <div>
                    <div className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Yıllık İzin (yıl bazlı)</div>
                    <Table
                        dataSource={ent.annual_years || []}
                        columns={annualYearCols}
                        rowKey="year"
                        size="small"
                        pagination={false}
                        locale={{ emptyText: <Empty description="Kayıt yok" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                </div>

                {ent.excuse?.length ? (
                    <div>
                        <div className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Mazeret İzni</div>
                        <Table dataSource={ent.excuse} columns={excuseCols} rowKey="year" size="small" pagination={false} />
                    </div>
                ) : null}

                {ent.birthday?.length ? (
                    <div>
                        <div className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Doğum Günü İzni</div>
                        <Table dataSource={ent.birthday} columns={birthdayCols} rowKey="year" size="small" pagination={false} />
                    </div>
                ) : null}
            </div>
        );
    };

    // Veri bölümü kartı (durum filtreli + expand tablo)
    const renderDataSection = (def, rows, columns, expandRender, withStatusFilter = true) => {
        const filtered = applyStatusFilter(def.key, rows);
        return (
            <div className="glass-card p-4">
                <SectionHeader icon={def.icon} title={def.label} count={(rows || []).length} />
                {withStatusFilter ? (
                    <StatusFilterBar
                        rows={rows}
                        value={statusFilters[def.key] || null}
                        onChange={(v) => setStatusFilter(def.key, v)}
                    />
                ) : null}
                <DetailTable
                    dataSource={filtered}
                    columns={columns}
                    expandRender={expandRender}
                    emptyText="Bu dönemde kayıt yok"
                />
            </div>
        );
    };

    const emp = detail?.employee;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Üst: çalışan seçici + TXT indir */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Çalışan</label>
                        <Select
                            showSearch
                            placeholder={rosterLoaded ? 'Çalışan seçin…' : 'Çalışanlar yükleniyor…'}
                            value={selectedEmpId || undefined}
                            onChange={setSelectedEmpId}
                            options={empOptions}
                            filterOption={(input, option) =>
                                (option?.searchText || '').includes((input || '').toLocaleLowerCase('tr'))}
                            allowClear
                            size="large"
                            className="w-full max-w-xl"
                            notFoundContent={rosterLoaded ? 'Çalışan bulunamadı' : 'Yükleniyor…'}
                            suffixIcon={<UserSearch size={16} />}
                        />
                    </div>
                    <Tooltip title={!selectedEmpId ? 'Önce çalışan seçin' : ''}>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!selectedEmpId || exportingPerson}
                            icon={exportingPerson ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                            onClick={() => onExportPerson?.(selectedEmpId)}
                        >
                            Kişi TXT İndir
                        </Button>
                    </Tooltip>
                </div>

                {/* Tür göster/gizle çipleri */}
                {selectedEmpId ? (
                    <div className="flex items-center gap-1.5 flex-wrap mt-4">
                        <span className="text-xs text-slate-500 mr-1">Bölümler:</span>
                        {SECTION_DEFS.map((s) => (
                            <Tag.CheckableTag
                                key={s.key}
                                checked={visibleTypes.has(s.key)}
                                onChange={() => toggleType(s.key)}
                            >
                                {s.label}
                            </Tag.CheckableTag>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* İçerik */}
            {!ready ? (
                <div className="glass-card p-10 text-center text-slate-400 text-sm">Lütfen önce bir dönem seçin.</div>
            ) : !selectedEmpId ? (
                <div className="glass-card p-10">
                    <Empty
                        description="Detayları görmek için yukarıdan bir çalışan seçin."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </div>
            ) : loading ? (
                <div className="glass-card p-12 text-center"><Spin tip="Kişi detayı yükleniyor…"><div className="h-12" /></Spin></div>
            ) : !detail ? (
                <div className="glass-card p-10">
                    <Empty description="Kayıt bulunamadı." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Kişi özeti */}
                    {emp ? (
                        <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
                            <span className="text-lg font-black text-slate-900">{emp.name || '—'}</span>
                            {emp.employee_code ? <span className="text-xs text-slate-400 tabular-nums">{emp.employee_code}</span> : null}
                            {emp.department ? <Tag color="default">{emp.department}</Tag> : null}
                            {emp.job_title ? <span className="text-xs text-slate-500">{emp.job_title}</span> : null}
                            {detail.live_status?.label ? (
                                <Tag color={detail.live_status.color || 'default'} className="!ml-auto">{detail.live_status.label}</Tag>
                            ) : null}
                        </div>
                    ) : null}

                    {visibleTypes.has('leaves') && renderDataSection(SECTION_DEFS[0], detail.leaves, leaveCols, renderLeaveDetail)}
                    {visibleTypes.has('external_duty') && renderDataSection(SECTION_DEFS[1], detail.external_duty, dutyCols, renderLeaveDetail)}
                    {visibleTypes.has('overtime') && renderDataSection(SECTION_DEFS[2], detail.overtime, otCols, renderOvertimeDetail)}
                    {visibleTypes.has('meal_requests') && renderDataSection(SECTION_DEFS[3], detail.meal_requests, mealCols, renderMealDetail)}
                    {visibleTypes.has('cardless_requests') && renderDataSection(SECTION_DEFS[4], detail.cardless_requests, cardlessCols, renderCardlessDetail)}
                    {visibleTypes.has('attendance') && renderDataSection(SECTION_DEFS[5], detail.attendance, attCols, renderAttendanceDetail)}
                    {visibleTypes.has('raw_events') && (() => {
                        const rawAll = detail.raw_events || [];
                        const rawRows = rawDir ? rawAll.filter((r) => r.direction === rawDir) : rawAll;
                        return (
                            <div className="glass-card p-4">
                                <SectionHeader icon={Layers} title="Ham Kart Olayları" count={rawAll.length} />
                                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                    <Tag.CheckableTag checked={!rawDir} onChange={() => setRawDir(null)}>Tümü</Tag.CheckableTag>
                                    <Tag.CheckableTag checked={rawDir === 'IN'} onChange={() => setRawDir(rawDir === 'IN' ? null : 'IN')}>Giriş</Tag.CheckableTag>
                                    <Tag.CheckableTag checked={rawDir === 'OUT'} onChange={() => setRawDir(rawDir === 'OUT' ? null : 'OUT')}>Çıkış</Tag.CheckableTag>
                                </div>
                                <Table
                                    dataSource={rawRows}
                                    columns={rawCols}
                                    rowKey={(r) => r.id ?? `${r.timestamp}-${r.direction}`}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                    pagination={rawRows.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                                    locale={{ emptyText: <Empty description="Bu dönemde kayıt yok" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                />
                            </div>
                        );
                    })()}
                    {visibleTypes.has('entitlement') && (
                        <div className="glass-card p-4">
                            <SectionHeader icon={Wallet} title="İzin Bakiyesi" />
                            {renderEntitlement(detail.entitlement)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
