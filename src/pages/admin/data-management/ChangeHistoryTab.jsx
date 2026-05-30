import React, { useState, useEffect, useCallback } from 'react';
import { Collapse, Tag, Button, Spin, Empty, Modal, message } from 'antd';
import { LockOutlined, RollbackOutlined, UndoOutlined } from '@ant-design/icons';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../../../services/api';

// ── Hata mesajı çıkar (PreviewModal/PersonelTab ile aynı desen) ───────
function extractErr(err) {
    const d = err.response?.data;
    if (d == null) return err.message;
    if (typeof d === 'string') return d;
    return d.detail || d.error || (Array.isArray(d) ? d.join(', ') : JSON.stringify(d));
}

// ── ISO tarihi tr-TR formatla ─────────────────────────────────────────
function fmtDate(iso) {
    if (!iso) return '';
    try {
        return format(parseISO(iso), 'd MMM yyyy HH:mm', { locale: tr });
    } catch {
        try {
            return new Date(iso).toLocaleString('tr-TR');
        } catch {
            return String(iso);
        }
    }
}

// ── Changeset status → Tag ────────────────────────────────────────────
function StatusTag({ status }) {
    if (status === 'APPLIED') return <Tag color="green">Uygulandı</Tag>;
    if (status === 'PARTIALLY_REVERTED') return <Tag color="orange">Kısmen Geri Alındı</Tag>;
    if (status === 'REVERTED') return <Tag>Geri Alındı</Tag>;
    return <Tag>{status}</Tag>;
}

/**
 * Veri Yönetimi v2 — Kişi bazlı "Değişiklik Geçmişi" + geri alma.
 *
 * props:
 *   employeeId — seçili personel id'si
 *   onReverted() — başarılı geri alma sonrası takvim/bakiye yenileme callback'i
 */
export default function ChangeHistoryTab({ employeeId, onReverted }) {
    const [loading, setLoading] = useState(false);
    const [changesets, setChangesets] = useState([]);
    const [busyId, setBusyId] = useState(null); // 'cs-<id>' veya 'op-<id>' — işlem devam ederken

    const fetchHistory = useCallback(() => {
        if (!employeeId) {
            setChangesets([]);
            return;
        }
        setLoading(true);
        api.get('/system-data/change_history/', { params: { employee_id: employeeId } })
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                setChangesets(data);
            })
            .catch((e) => {
                message.error('Değişiklik geçmişi yüklenemedi: ' + extractErr(e));
                setChangesets([]);
            })
            .finally(() => setLoading(false));
    }, [employeeId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // ── Ortak revert akışı (çakışma → force onayı) ────────────────────
    const doRevert = useCallback(
        async (url, baseBody, busyKey) => {
            const fire = async (force) => {
                setBusyId(busyKey);
                try {
                    await api.post(url, { ...baseBody, force });
                    message.success('Geri alındı.');
                    fetchHistory();
                    onReverted?.();
                    return true;
                } catch (e) {
                    // HTTP 400 → çakışma: force=true ile yeniden dene onayı
                    if (e.response?.status === 400 && !force) {
                        const msg = extractErr(e);
                        Modal.confirm({
                            title: 'Çakışma var',
                            icon: <RollbackOutlined />,
                            content: (
                                <div>
                                    <p>{msg}</p>
                                    <p className="mt-2 font-medium">Yine de geri al?</p>
                                </div>
                            ),
                            okText: 'Yine de Geri Al',
                            okButtonProps: { danger: true },
                            cancelText: 'Vazgeç',
                            onOk: () => fire(true),
                        });
                    } else {
                        message.error('Geri alma hatası: ' + extractErr(e));
                    }
                    return false;
                } finally {
                    setBusyId((cur) => (cur === busyKey ? null : cur));
                }
            };
            await fire(false);
        },
        [fetchHistory, onReverted]
    );

    const handleRevertChangeset = (cs) => {
        Modal.confirm({
            title: `#${cs.id} paketini geri al?`,
            icon: <UndoOutlined />,
            content: 'Bu paketteki tüm işlemler geri alınacak. Devam edilsin mi?',
            okText: 'Geri Al',
            okButtonProps: { danger: true },
            cancelText: 'Vazgeç',
            onOk: () =>
                doRevert(
                    '/system-data/revert_changeset/',
                    { changeset_id: cs.id, reason: '' },
                    `cs-${cs.id}`
                ),
        });
    };

    const handleRevertOperation = (op) => {
        Modal.confirm({
            title: 'İşlemi geri al?',
            icon: <UndoOutlined />,
            content: (
                <div>
                    <p>Şu işlem geri alınacak:</p>
                    <p className="mt-1 font-medium">{op.summary || `${op.record_type} ${op.op_type}`}</p>
                </div>
            ),
            okText: 'Geri Al',
            okButtonProps: { danger: true },
            cancelText: 'Vazgeç',
            onOk: () =>
                doRevert(
                    '/system-data/revert_operation/',
                    { operation_id: op.id, reason: '' },
                    `op-${op.id}`
                ),
        });
    };

    // ── Render ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="py-16 flex justify-center">
                <Spin tip="Değişiklik geçmişi yükleniyor…" />
            </div>
        );
    }

    if (!changesets.length) {
        return (
            <div className="py-12">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-slate-400">Bu personel için kayıtlı değişiklik bulunmuyor</span>}
                />
            </div>
        );
    }

    const items = changesets.map((cs) => {
        const csReverted = cs.status === 'REVERTED';
        const csBusy = busyId === `cs-${cs.id}`;
        const ops = cs.operations || [];

        return {
            key: String(cs.id),
            label: (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700">#{cs.id}</span>
                    <span className="text-xs text-slate-500">{fmtDate(cs.created_at)}</span>
                    {cs.created_by && (
                        <span className="text-xs text-slate-500">— {cs.created_by}</span>
                    )}
                    <StatusTag status={cs.status} />
                    {cs.touched_locked_period && (
                        <Tag color="gold" icon={<LockOutlined />}>Kilitli Dönem</Tag>
                    )}
                    {cs.is_revert && <Tag color="purple">Geri Alma</Tag>}
                    {cs.reason && (
                        <span className="text-xs text-slate-400 italic truncate max-w-[260px]">
                            “{cs.reason}”
                        </span>
                    )}
                </div>
            ),
            extra: (
                <Button
                    size="small"
                    danger
                    icon={<UndoOutlined />}
                    loading={csBusy}
                    disabled={csReverted}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRevertChangeset(cs);
                    }}
                >
                    Geri Al
                </Button>
            ),
            children: (
                <div className="space-y-2">
                    {ops.length === 0 ? (
                        <div className="text-sm text-slate-400">Bu pakette işlem yok.</div>
                    ) : (
                        ops.map((op) => {
                            const opReverted = op.is_reverted || csReverted;
                            const opBusy = busyId === `op-${op.id}`;
                            return (
                                <div
                                    key={op.id}
                                    className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                                >
                                    <div className="min-w-0 flex items-center gap-2">
                                        <span
                                            className={`text-sm ${opReverted ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                        >
                                            {op.summary || `${op.record_type} ${op.op_type}`}
                                        </span>
                                        {op.is_reverted && <Tag color="default">geri alındı</Tag>}
                                    </div>
                                    <Button
                                        type="link"
                                        size="small"
                                        danger
                                        loading={opBusy}
                                        disabled={opReverted}
                                        onClick={() => handleRevertOperation(op)}
                                    >
                                        geri al
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            ),
        };
    });

    return (
        <Collapse
            items={items}
            defaultActiveKey={items.length ? [items[0].key] : []}
            className="bg-white"
        />
    );
}
