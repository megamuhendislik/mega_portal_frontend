import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, Spin, Empty, Popconfirm, Alert, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../../../services/api';
import { toIstanbulParts, formatIstanbulDate } from '../../../utils/dateUtils';

// ── Durum etiketleri (HealthReports/SpecialLeaves ile aynı sözleşme) ──────
const STATUS_TAG = {
    PENDING: { color: 'gold', label: 'Onay Bekliyor' },
    APPROVED: { color: 'green', label: 'Onaylandı' },
    REJECTED: { color: 'red', label: 'Reddedildi' },
    CANCELLED: { color: 'default', label: 'İptal Edildi' },
    CANCELED: { color: 'default', label: 'İptal Edildi' },
    ESCALATED: { color: 'blue', label: 'Yükseltildi' },
};

function StatusTag({ status }) {
    const cfg = STATUS_TAG[status] || { color: 'default', label: status || '-' };
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

// ── kind → görünüm rengi ──────────────────────────────────────────────────
const KIND_TAG = {
    LEAVE: { color: 'blue', label: 'İzin' },
    HEALTH: { color: 'red', label: 'Sağlık' },
    SPECIAL: { color: 'purple', label: 'Özel İzin' },
};

const SPECIAL_TYPE_LABEL = {
    PATERNITY: 'Babalık İzni',
    BEREAVEMENT: 'Ölüm İzni',
    UNPAID: 'Ücretsiz İzin',
    MARRIAGE: 'Evlilik İzni',
};

const HEALTH_TYPE_LABEL = {
    HEALTH_REPORT: 'Sağlık Raporu',
    HOSPITAL_VISIT: 'Hastane Ziyareti',
};

// ── Bir kaydın [start,end] aralığı görünen takvim ayıyla kesişiyor mu? ─────
function overlapsMonth(startDate, endDate, monthStart, monthEnd) {
    if (!startDate || !endDate) return false;
    return startDate <= monthEnd && endDate >= monthStart;
}

/**
 * Veri Yönetimi v2 — Çok-günlü Kayıtlar sekmesi.
 *
 * Seçili personelin aralık (range) kayıtlarını listeler:
 *   - LEAVE   : LeaveRequest (yıllık/mazeret/doğum günü/şirket dışı görev)
 *   - HEALTH  : HealthReport (sağlık raporu / hastane ziyareti)
 *   - SPECIAL : SpecialLeave (babalık/ölüm/ücretsiz/evlilik)
 *
 * Silme işlemleri anında API çağrısı yapmaz; useStagedOps kuyruğuna
 * DELETE op olarak eklenir ve "Önizle & Kaydet" ile uygulanır (geri alınabilir).
 *
 * props:
 *   employee          — seçili personel ({ id, ... })
 *   currentMonth      — görünen ay (Date) — listeyi bu aya kesişenlerle daraltır
 *   onStageOp(op)     — useStagedOps.addOp (op._label gömülü gelir)
 *   pendingDeleteIds  — (opsiyonel) zaten kuyruğa alınmış DELETE target_pk seti
 */
export default function MultiDayRecordsTab({ employee, currentMonth, onStageOp, pendingDeleteIds }) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    // Bu sekmede bu oturumda kuyruğa eklenenler (çift staging'i önle)
    const [localStaged, setLocalStaged] = useState(() => new Set());

    const employeeId = employee?.id;

    // Veriyi getirip birleştir; setState yalnızca async devamlarda yapılır
    // (effect içinde senkron setState → cascading render uyarısından kaçınılır).
    const loadRecords = useCallback(async (isCancelled) => {
        const safeSet = (fn) => { if (!isCancelled || !isCancelled()) fn(); };
        if (!employeeId) {
            safeSet(() => setRows([]));
            return;
        }
        safeSet(() => setLoading(true));
        try {
            const [leaveRes, healthRes, specialRes] = await Promise.allSettled([
                // LeaveRequest: pagination_class = None → düz dizi döner
                api.get('/leave-requests/', { params: { employee: employeeId } }),
                // HealthReport: sayfalı → { results, count }
                api.get('/health-reports/', { params: { employee: employeeId, page_size: 500 } }),
                // SpecialLeave: sayfalı → { results, count }
                api.get('/special-leaves/', { params: { employee: employeeId, page_size: 500 } }),
            ]);

            {
                const unified = [];

                // ── LEAVE (+ EXTERNAL_DUTY) ───────────────────────────
                if (leaveRes.status === 'fulfilled') {
                    const data = Array.isArray(leaveRes.value.data)
                        ? leaveRes.value.data
                        : (leaveRes.value.data?.results || []);
                    for (const r of data) {
                        const category = r.request_type_detail?.category || '';
                        const isDuty = category === 'EXTERNAL_DUTY';
                        const typeLabel = isDuty
                            ? 'Şirket Dışı Görev'
                            : (r.request_type_detail?.name || 'İzin');
                        const detailBits = [];
                        if (r.reason) detailBits.push(r.reason);
                        if (r.destination) detailBits.push(r.destination);
                        unified.push({
                            kind: 'LEAVE',
                            id: r.id,
                            typeLabel,
                            start_date: r.start_date,
                            end_date: r.end_date,
                            status: r.status,
                            detail: detailBits.join(' — '),
                        });
                    }
                }

                // ── HEALTH ────────────────────────────────────────────
                if (healthRes.status === 'fulfilled') {
                    const data = Array.isArray(healthRes.value.data)
                        ? healthRes.value.data
                        : (healthRes.value.data?.results || []);
                    for (const r of data) {
                        unified.push({
                            kind: 'HEALTH',
                            id: r.id,
                            typeLabel: HEALTH_TYPE_LABEL[r.report_type] || 'Sağlık Raporu',
                            start_date: r.start_date,
                            end_date: r.end_date,
                            status: r.status,
                            detail: r.description || '',
                        });
                    }
                }

                // ── SPECIAL ───────────────────────────────────────────
                if (specialRes.status === 'fulfilled') {
                    const data = Array.isArray(specialRes.value.data)
                        ? specialRes.value.data
                        : (specialRes.value.data?.results || []);
                    for (const r of data) {
                        unified.push({
                            kind: 'SPECIAL',
                            id: r.id,
                            typeLabel: SPECIAL_TYPE_LABEL[r.leave_type] || (r.leave_type || 'Özel İzin'),
                            start_date: r.start_date,
                            end_date: r.end_date,
                            status: r.status,
                            detail: r.reason || r.description || '',
                        });
                    }
                }

                // ── Görünen aya kesişenlere daralt ────────────────────
                const parts = toIstanbulParts(currentMonth);
                let filtered = unified;
                if (parts) {
                    const mm = String(parts.month).padStart(2, '0');
                    const monthStart = `${parts.year}-${mm}-01`;
                    // Ayın son günü: bir sonraki ayın 0. günü
                    const lastDay = new Date(parts.year, parts.month, 0).getDate();
                    const monthEnd = `${parts.year}-${mm}-${String(lastDay).padStart(2, '0')}`;
                    filtered = unified.filter((r) =>
                        overlapsMonth(r.start_date, r.end_date, monthStart, monthEnd)
                    );
                }

                // Başlangıç tarihine göre sırala (yeni → eski)
                filtered.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
                safeSet(() => {
                    setRows(filtered);
                    // Personel/ay değişiminde lokal staged seti sıfırla
                    setLocalStaged(new Set());
                });
            }
        } finally {
            safeSet(() => setLoading(false));
        }
    }, [employeeId, currentMonth]);

    useEffect(() => {
        let cancelled = false;
        loadRecords(() => cancelled);
        return () => { cancelled = true; };
    }, [loadRecords]);

    // ── Bir kayıt için DELETE op'u kuyruğa al ─────────────────────────────
    const stageDelete = (row) => {
        const op = {
            record_type: row.kind, // 'LEAVE' | 'HEALTH' | 'SPECIAL'
            op_type: 'DELETE',
            target_pk: row.id,
            payload: { start_date: row.start_date, end_date: row.end_date },
            _label: `− ${KIND_TAG[row.kind]?.label || row.kind} ${row.start_date}..${row.end_date} sil`,
        };
        onStageOp?.(op);
        setLocalStaged((prev) => {
            const next = new Set(prev);
            next.add(`${row.kind}:${row.id}`);
            return next;
        });
    };

    const isStaged = (row) => {
        if (localStaged.has(`${row.kind}:${row.id}`)) return true;
        // pendingDeleteIds: dışarıdan gelen target_pk seti (record_type ayrımı yoksa pk eşleşmesi)
        if (pendingDeleteIds && pendingDeleteIds.has) {
            return pendingDeleteIds.has(row.id);
        }
        return false;
    };

    const columns = [
        {
            title: 'Tür',
            dataIndex: 'kind',
            key: 'kind',
            width: 110,
            render: (kind) => {
                const cfg = KIND_TAG[kind] || { color: 'default', label: kind };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: 'Tür/Detay',
            key: 'typeDetail',
            render: (_, row) => (
                <div>
                    <div className="font-medium text-slate-700">{row.typeLabel}</div>
                    {row.detail && (
                        <Tooltip title={row.detail}>
                            <div className="text-xs text-slate-400 truncate max-w-[240px]">{row.detail}</div>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Başlangıç',
            dataIndex: 'start_date',
            key: 'start_date',
            width: 120,
            render: (d) => (d ? formatIstanbulDate(d) : '-'),
        },
        {
            title: 'Bitiş',
            dataIndex: 'end_date',
            key: 'end_date',
            width: 120,
            render: (d) => (d ? formatIstanbulDate(d) : '-'),
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: 'İşlem',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, row) => {
                const staged = isStaged(row);
                if (staged) {
                    return <Tag color="orange">Silme kuyruğunda</Tag>;
                }
                return (
                    <Popconfirm
                        title="Silme kuyruğuna eklensin mi?"
                        description="Kayıt 'Önizle & Kaydet' ile silinecek (geri alınabilir)."
                        okText="Ekle"
                        cancelText="Vazgeç"
                        onConfirm={() => stageDelete(row)}
                    >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            Sil
                        </Button>
                    </Popconfirm>
                );
            },
        },
    ];

    if (!employeeId) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-12">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-slate-400">Personel seçin</span>}
                />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                className="mb-3"
                message="Silme işlemleri 'Önizle & Kaydet' (alttaki aksiyon barı) ile uygulanır ve geri alınabilir."
            />
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Spin tip="Yükleniyor..." />
                    </div>
                ) : rows.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span className="text-slate-400">
                                Bu ayda çok-günlü kayıt (izin/görev/sağlık/özel) bulunamadı
                            </span>
                        }
                    />
                ) : (
                    <Table
                        rowKey={(row) => `${row.kind}-${row.id}`}
                        dataSource={rows}
                        columns={columns}
                        size="small"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                )}
            </div>
        </div>
    );
}
