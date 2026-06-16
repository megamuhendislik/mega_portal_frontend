import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Radio, Input, Button, message, Table, Tag, Spin, Empty, Popconfirm } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const MONTH_NAMES = [
    '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

// Saniye → "X.Y saat" (devir/sıfırlanan gösterimi için, bakiye kartıyla aynı altyapı)
const fmtHours = (sec) => `${(Math.abs(sec || 0) / 3600).toFixed(1)} saat`;

export default function SettlementModal({ isOpen, onClose, data, onSaveSuccess }) {
    const [mode, setMode] = useState('settle'); // 'settle' | 'real_reset' | 'undo'
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    // Mutabakat geçmişi
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [undoingId, setUndoingId] = useState(null);

    const isSettled = data?.isSettled || (data?.compensated && data.compensated !== 0);

    // ── Mutabakat geçmişini yükle (employee + year) ──
    const fetchHistory = useCallback(() => {
        if (!data?.employee?.id) return;
        setHistoryLoading(true);
        api.get('/system-data/settlement_history/', {
            params: { employee_id: data.employee.id, year: data.year },
        })
            .then((res) => setHistory(res.data?.results || []))
            .catch(() => setHistory([]))
            .finally(() => setHistoryLoading(false));
    }, [data?.employee?.id, data?.year]);

    useEffect(() => {
        if (isOpen) {
            setMode(isSettled ? 'undo' : 'settle');
            setLoading(false);
            setConfirmText('');
            fetchHistory();
        }
    }, [isOpen, isSettled, fetchHistory]);

    const handleAction = async () => {
        if (mode === 'real_reset' && confirmText !== 'ONAYLA') {
            message.warning('Onaylamak için "ONAYLA" yazın.');
            return;
        }
        setLoading(true);
        try {
            let endpoint;
            if (mode === 'settle') endpoint = '/system-data/settle_balance/';
            else if (mode === 'undo') endpoint = '/system-data/undo_settle_balance/';
            else endpoint = '/system-data/real_reset/';

            const res = await api.post(endpoint, {
                employee_id: data.employee.id,
                year: data.year,
                month: data.month,
            });
            // settle_balance dönüşü settled_amount_seconds içerir — kullanıcıya gerçek
            // sıfırlanan toplam devri göster.
            if (mode === 'settle' && res.data?.settled_amount_seconds != null) {
                message.success(
                    `Mutabakat yapıldı — toplam ${fmtHours(res.data.settled_amount_seconds)} devir sıfırlandı.`
                );
            } else {
                message.success(res.data.message || 'İşlem başarılı.');
            }
            onSaveSuccess?.();
            onClose();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    // ── Geçmiş satırından mutabakat geri al ──
    const handleUndoFromHistory = async (row) => {
        setUndoingId(row.id);
        try {
            await api.post('/system-data/undo_settle_balance/', {
                employee_id: data.employee.id,
                year: row.year,
                month: row.month,
            });
            message.success('Mutabakat geri alındı.');
            fetchHistory();
            onSaveSuccess?.();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setUndoingId(null);
        }
    };

    if (!data) return null;

    const isSurplus = data.netBalance > 0;
    const isDeficit = data.netBalance < 0;
    const absHours = (Math.abs(data.netBalance) / 3600).toFixed(1);
    const absMinutes = Math.round(Math.abs(data.netBalance) / 60);
    const empName = `${data.employee.first_name} ${data.employee.last_name}`;
    const empDept = data.employee.department_name || data.employee.department?.name || '';
    const periodLabel = `${MONTH_NAMES[data.month] || data.month} ${data.year}`;

    // Sıfırlanacak TOPLAM birikmiş devir (kümülatif-bugüne-kadar):
    //   carry-into-M (önceki aylardan devir) + bu ayın neti = toplam kümülatif.
    //   PersonelTab bunu cumulative.total_net_balance_seconds ile gösterir; burada
    //   da aynı değeri (cumulativeToDate) kullanıyoruz. Yoksa carryOver+net'e düş.
    const cumulativeToDate =
        data.cumulativeToDate != null
            ? data.cumulativeToDate
            : (data.carryOver || 0) + (data.netBalance || 0);
    const cumulativeAbsHours = (Math.abs(cumulativeToDate) / 3600).toFixed(1);
    const cumulSurplus = cumulativeToDate > 0;
    const cumulDeficit = cumulativeToDate < 0;

    const historyColumns = [
        {
            title: 'Tarih',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (v) =>
                v
                    ? new Date(v).toLocaleDateString('tr-TR', {
                          timeZone: 'Europe/Istanbul',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                      })
                    : '-',
        },
        {
            title: 'Ay',
            key: 'period',
            render: (_, r) => `${MONTH_NAMES[r.month] || r.month} ${r.year}`,
        },
        {
            title: 'Sıfırlanan',
            dataIndex: 'settled_amount_seconds',
            key: 'settled',
            render: (v) => <span className="font-semibold">{fmtHours(v)}</span>,
        },
        {
            title: 'Kullanıcı',
            dataIndex: 'created_by',
            key: 'created_by',
            render: (v) => v || '-',
        },
        {
            title: 'Durum',
            key: 'status',
            render: (_, r) =>
                r.is_undone ? (
                    <Tag color="default">Geri alındı</Tag>
                ) : (
                    <Tag color="green">Aktif</Tag>
                ),
        },
        {
            title: '',
            key: 'action',
            render: (_, r) =>
                r.is_undone ? null : (
                    <Popconfirm
                        title="Bu mutabakatı geri almak istediğinize emin misiniz?"
                        onConfirm={() => handleUndoFromHistory(r)}
                        okText="Geri Al"
                        cancelText="Vazgeç"
                    >
                        <Button size="small" loading={undoingId === r.id}>
                            Geri Al
                        </Button>
                    </Popconfirm>
                ),
        },
    ];

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={620}
            destroyOnClose
            centered
            closable={false}
            className="settlement-modal"
            styles={{ body: { padding: 0 } }}
        >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">
                            Bakiye İşlemi
                        </div>
                        <h3 className="text-xl font-bold">{empName}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                            {empDept && (
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                                    {empDept}
                                </span>
                            )}
                            <span className="text-sm font-semibold text-blue-300">
                                {periodLabel}
                            </span>
                            {isSettled && (
                                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                                    &#10003; Mutabakat Yapılmış
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white text-2xl font-bold leading-none mt-1"
                    >
                        &times;
                    </button>
                </div>
            </div>

            {/* Balance Display */}
            <div className="px-6 pt-5">
                <div className="grid grid-cols-2 gap-3">
                    {/* Bu ayın neti */}
                    <div
                        className={`p-4 rounded-xl border ${
                            isSurplus
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : isDeficit
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                    >
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                            Bu Ay Net Bakiye
                        </div>
                        <div className="text-2xl font-bold mt-1">
                            {isSurplus ? '+' : isDeficit ? '-' : ''}
                            {absHours} saat
                            <span className="text-sm font-normal ml-2 opacity-60">
                                ({absMinutes} dk)
                            </span>
                        </div>
                    </div>

                    {/* Sıfırlanacak toplam birikmiş devir (kümülatif-bugüne-kadar) */}
                    <div
                        className={`p-4 rounded-xl border-2 ${
                            cumulSurplus
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : cumulDeficit
                                ? 'bg-red-50 border-red-300 text-red-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                    >
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                            Sıfırlanacak Toplam Devir
                        </div>
                        <div className="text-2xl font-black mt-1">
                            {cumulSurplus ? '+' : cumulDeficit ? '-' : ''}
                            {cumulativeAbsHours} saat
                        </div>
                    </div>
                </div>

                {/* Mutabakat etki açıklaması (kümülatif sıfırlama) */}
                {mode === 'settle' && (
                    <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                        <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                            Mutabakat Ne Yapar?
                        </div>
                        <p className="text-xs text-indigo-600 leading-relaxed">
                            Bu işlem <strong>{empName}</strong> için{' '}
                            <strong>{periodLabel}</strong> sonuna kadar birikmiş{' '}
                            <strong>toplam {cumulativeAbsHours} saat</strong> devri sıfırlar.
                            (Sadece bu ayın neti değil — önceki aylardan gelen devir dahil
                            tüm kümülatif bakiye.) <strong>Geri alınabilir.</strong>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                            <span className={`px-2 py-1 rounded ${cumulDeficit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                Şimdi: {cumulSurplus ? '+' : cumulDeficit ? '-' : ''}{cumulativeAbsHours} sa devir
                            </span>
                            <span className="text-indigo-400">&rarr;</span>
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">
                                Mutabakat sonrası: 0 sa devir
                            </span>
                        </div>
                    </div>
                )}

                {isSettled && mode === 'undo' && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                            Mutabakat Durumu
                        </div>
                        <p className="text-xs text-amber-700">
                            Bu ayın bakiyesi mutabakat ile sıfırlanmış. Geri alırsanız birikmiş
                            devir tekrar oluşur ve sonraki aylara devrolmaya başlar.
                        </p>
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="px-6 py-5 space-y-3">
                {/* Option: Undo Settlement (only if settled) */}
                {isSettled && (
                    <div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            mode === 'undo'
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setMode('undo')}
                    >
                        <div className="flex items-start gap-3">
                            <Radio checked={mode === 'undo'} />
                            <div>
                                <div className="font-bold text-slate-900">
                                    Mutabakat Geri Al
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Aktif mutabakatı iptal eder. Sıfırlanan toplam devir tekrar
                                    oluşur ve sonraki aylara devrolur. Kayıtlar değişmez.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Option 1: Mutabakat */}
                <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        mode === 'settle'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setMode('settle')}
                >
                    <div className="flex items-start gap-3">
                        <Radio checked={mode === 'settle'} />
                        <div>
                            <div className="font-bold text-slate-900">
                                {isSettled ? 'Mutabakat Yenile' : 'Mutabakat (Toplam Devri Sıfırla)'}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Bu aya kadar birikmiş <strong>toplam devri</strong> sıfırlar ve
                                sonraki aylara devretmesini engeller.
                                {cumulSurplus && ' Artı bakiye için ödeme yapıldığını,'}
                                {cumulDeficit && ' Eksi bakiye için maaştan düşüldüğünü,'}
                                {' '}muhasebe elle takip eder. Mesai kayıtları değişmez.
                                {isSettled && ' Sonraki bir geriye dönük değişiklikten doğan yeni bakiyeyi yeniden sıfırlamak için kullanın.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Option 2: Gerçek Sıfırla */}
                <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        mode === 'real_reset'
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setMode('real_reset')}
                >
                    <div className="flex items-start gap-3">
                        <Radio checked={mode === 'real_reset'} />
                        <div>
                            <div className="font-bold text-slate-900">
                                Gerçek Sıfırla
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Eksik saatleri mesai kaydı olarak doldurur. Çalışan o saatleri çalışmış gibi
                                görünür ve normal mesai tam olur.{' '}
                                <strong className="text-red-600">Bu işlem geri alınamaz.</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirm input for real reset */}
                {mode === 'real_reset' && (
                    <div className="ml-7 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 mb-2 font-semibold">
                            Onaylamak için &quot;ONAYLA&quot; yazın:
                        </p>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder="ONAYLA"
                            className="font-mono"
                            status={confirmText && confirmText !== 'ONAYLA' ? 'error' : ''}
                        />
                    </div>
                )}
            </div>

            {/* Mutabakat Geçmişi */}
            <div className="px-6 pb-2">
                <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <HistoryOutlined /> Mutabakat Geçmişi
                </div>
                {historyLoading ? (
                    <div className="text-center py-4"><Spin size="small" /></div>
                ) : history.length > 0 ? (
                    <Table
                        size="small"
                        columns={historyColumns}
                        dataSource={history}
                        rowKey="id"
                        pagination={false}
                        scroll={{ y: 200 }}
                    />
                ) : (
                    <Empty
                        description="Bu yıl için mutabakat kaydı yok"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="!my-2"
                    />
                )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-lg">
                <Button onClick={onClose}>İptal</Button>
                <Button
                    type="primary"
                    danger={mode === 'real_reset'}
                    loading={loading}
                    disabled={mode === 'real_reset' && confirmText !== 'ONAYLA'}
                    onClick={handleAction}
                    className={mode === 'undo' ? '!bg-amber-500 !border-amber-500 hover:!bg-amber-600' : ''}
                >
                    {mode === 'real_reset' ? 'Gerçek Sıfırla' : mode === 'undo' ? 'Mutabakat Geri Al' : 'Mutabakat Yap'}
                </Button>
            </div>
        </Modal>
    );
}
