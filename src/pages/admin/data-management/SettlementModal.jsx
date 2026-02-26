import React, { useState, useEffect } from 'react';
import { Modal, Radio, Input, Button, message } from 'antd';
import api from '../../../services/api';

const MONTH_NAMES = [
    '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function SettlementModal({ isOpen, onClose, data, onSaveSuccess }) {
    const [mode, setMode] = useState('settle'); // 'settle' | 'real_reset'
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMode('settle');
            setLoading(false);
            setConfirmText('');
        }
    }, [isOpen]);

    const handleAction = async () => {
        if (mode === 'real_reset' && confirmText !== 'ONAYLA') {
            message.warning('Onaylamak için "ONAYLA" yazın.');
            return;
        }
        setLoading(true);
        try {
            const endpoint = mode === 'settle'
                ? '/system-data/settle_balance/'
                : '/system-data/real_reset/';
            const res = await api.post(endpoint, {
                employee_id: data.employee.id,
                year: data.year,
                month: data.month,
            });
            message.success(res.data.message || 'İşlem başarılı.');
            onSaveSuccess?.();
            onClose();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
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

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={520}
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
                        Net Bakiye
                    </div>
                    <div className="text-2xl font-bold mt-1">
                        {isSurplus ? '+' : isDeficit ? '-' : ''}
                        {absHours} saat
                        <span className="text-sm font-normal ml-2 opacity-60">
                            ({absMinutes} dk)
                        </span>
                    </div>
                </div>
            </div>

            {/* Options */}
            <div className="px-6 py-5 space-y-3">
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
                                Mutabakat (Sıfırla)
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Bakiyeyi sıfırlar ve bir sonraki aya devretmesini engeller.
                                {isSurplus && ' Artı bakiye için ödeme yapıldığını,'}
                                {isDeficit && ' Eksi bakiye için maaştan düşüldüğünü,'}
                                {' '}muhasebe elle takip eder. Mesai kayıtları değişmez.
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

            {/* Actions */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-lg">
                <Button onClick={onClose}>İptal</Button>
                <Button
                    type="primary"
                    danger={mode === 'real_reset'}
                    loading={loading}
                    disabled={mode === 'real_reset' && confirmText !== 'ONAYLA'}
                    onClick={handleAction}
                >
                    {mode === 'real_reset' ? 'Gerçek Sıfırla' : 'Mutabakat Yap'}
                </Button>
            </div>
        </Modal>
    );
}
