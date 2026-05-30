import React, { useState } from 'react';
import { Modal, Table, Alert, Input, Tag, Button } from 'antd';

// Saniye → "Xsa Ydk" (negatif destekli)
function fmtSecs(s) {
    if (s == null) return '0dk';
    const neg = s < 0;
    let v = Math.abs(Math.round(s));
    const h = Math.floor(v / 3600);
    const m = Math.round((v % 3600) / 60);
    let out = '';
    if (h) out += `${h}sa `;
    out += `${m}dk`;
    return (neg ? '-' : '') + out.trim();
}

// before → after; renk: yukarı iyi mi? (Eksik için ters)
function Pair({ before, after, betterWhenUp = true }) {
    const b = before || 0;
    const a = after || 0;
    const delta = a - b;
    let color = '#64748b';
    if (delta !== 0) {
        const up = delta > 0;
        const good = betterWhenUp ? up : !up;
        color = good ? '#16a34a' : '#dc2626';
    }
    return (
        <span style={{ whiteSpace: 'nowrap' }}>
            <span style={{ color: '#94a3b8' }}>{fmtSecs(b)}</span>
            <span style={{ margin: '0 4px' }}>→</span>
            <span style={{ color, fontWeight: 600 }}>{fmtSecs(a)}</span>
        </span>
    );
}

const WARNING_LABELS = {
    locked_period: 'Bu değişiklik KİLİTLİ bir mali döneme dokunuyor.',
    weekly_ot_exceeded: 'Haftalık ek mesai limiti aşılıyor.',
    overlap: 'Aynı güne çakışan kayıt(lar) var.',
};

/**
 * Veri Yönetimi v2 — Kaydet öncesi etki önizlemesi (before→after) +
 * kilitli dönem ONAYLA onayı.
 *
 * props:
 *   open, loading (preview fetch), applying (apply POST),
 *   data: preview_changeset yanıtı,
 *   onApply({ reason, forceOverride }), onCancel()
 */
export default function PreviewModal({ open, loading, applying, data, onApply, onCancel }) {
    const warnings = data?.warnings || [];
    const lockedTouched = warnings.includes('locked_period');

    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [wasOpen, setWasOpen] = useState(false);

    // Modal kapalı→açık geçişinde onay alanlarını sıfırla (render sırasında
    // state ayarlama — React'in önerdiği desen, useEffect yerine).
    if (open && !wasOpen) {
        setWasOpen(true);
        setConfirmText('');
        setReason('');
    } else if (!open && wasOpen) {
        setWasOpen(false);
    }

    const lockConfirmed = !lockedTouched || (confirmText.trim() === 'ONAYLA' && reason.trim().length > 0);
    const canApply = !loading && !applying && !!data && lockConfirmed;

    const rows = (data?.balance_diff || []).map((d, i) => ({
        key: i,
        monthLabel: Array.isArray(d.month) ? `${d.month[1]}/${d.month[0]}` : String(d.month),
        ...d,
    }));

    const columns = [
        { title: 'Ay', dataIndex: 'monthLabel', key: 'monthLabel', width: 90 },
        {
            title: 'Net', key: 'net',
            render: (_, r) => <Pair before={r.net_before} after={r.net_after} />,
        },
        {
            title: 'Kümülatif', key: 'cum',
            render: (_, r) => <Pair before={r.cumulative_before} after={r.cumulative_after} />,
        },
        {
            title: 'Tamamlanan', key: 'completed',
            render: (_, r) => <Pair before={r.completed_before} after={r.completed_after} />,
        },
        {
            title: 'Eksik', key: 'missing',
            render: (_, r) => <Pair before={r.missing_before} after={r.missing_after} betterWhenUp={false} />,
        },
    ];

    const affectedDates = data?.affected_dates || [];

    return (
        <Modal
            open={open}
            title="Değişiklik Önizlemesi (Kaydet öncesi)"
            onCancel={onCancel}
            width={760}
            maskClosable={false}
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={applying}>
                    Vazgeç
                </Button>,
                <Button
                    key="apply"
                    type="primary"
                    className="!bg-green-600 !border-green-600 hover:!bg-green-700"
                    loading={applying}
                    disabled={!canApply}
                    onClick={() => onApply({ reason: reason.trim(), forceOverride: lockedTouched })}
                >
                    Kaydet
                </Button>,
            ]}
        >
            {loading ? (
                <div className="py-8 text-center text-slate-500">Önizleme hesaplanıyor…</div>
            ) : !data ? (
                <div className="py-8 text-center text-slate-400">Veri yok.</div>
            ) : (
                <div className="space-y-3">
                    {warnings.map((w) => (
                        <Alert
                            key={w}
                            type="warning"
                            showIcon
                            message={WARNING_LABELS[w] || w}
                        />
                    ))}

                    <div className="text-xs text-slate-500">
                        Etkilenen gün sayısı: <b>{affectedDates.length}</b>
                        {affectedDates.length > 0 && (
                            <span className="ml-2">
                                {affectedDates.slice(0, 12).map((d) => (
                                    <Tag key={d} className="!mr-1 !mb-1">{d}</Tag>
                                ))}
                                {affectedDates.length > 12 && <span>+{affectedDates.length - 12}…</span>}
                            </span>
                        )}
                    </div>

                    {rows.length > 0 ? (
                        <Table
                            size="small"
                            columns={columns}
                            dataSource={rows}
                            pagination={false}
                            bordered
                        />
                    ) : (
                        <div className="text-sm text-slate-400 py-2">
                            Bu değişiklik aylık bakiyeyi etkilemiyor (ör. sadece yemek/hak ediş).
                        </div>
                    )}

                    {lockedTouched && (
                        <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
                            <div className="text-sm font-semibold text-amber-800">
                                Kilitli döneme yazmak için onay gerekli
                            </div>
                            <div>
                                <span className="text-xs text-slate-600">Onaylamak için <b>ONAYLA</b> yazın:</span>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="ONAYLA"
                                    status={confirmText && confirmText.trim() !== 'ONAYLA' ? 'error' : ''}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <span className="text-xs text-slate-600">Sebep (zorunlu):</span>
                                <Input.TextArea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={2}
                                    placeholder="Bu kilitli döneme neden müdahale ediliyor?"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
