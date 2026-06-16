import React, { useState, useEffect } from 'react';
import { Modal, InputNumber, Button, message } from 'antd';
import api from '../../../services/api';

const MONTH_NAMES = [
    '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const extractErr = (e) => {
    const d = e.response?.data;
    if (!d) return e.message;
    if (typeof d === 'string') return d;
    return d.error || d.detail || (Array.isArray(d) ? d.join(', ') : JSON.stringify(d));
};

// Başlangıç (t=0) ay verisi — kart verisi olmayan bir ay için tek bir NET
// girdi/çıktı bakiyesi (saat, +/-) girer. Bu değer devire taşınır ve mutabakatla
// uyumludur. Düzenle modunda mevcut değer (initialBalanceSeconds/3600) ön doldurulur.
export default function InitialBalanceModal({ isOpen, onClose, data, onSaveSuccess }) {
    const [hours, setHours] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEdit = data?.initialBalanceSeconds != null;

    useEffect(() => {
        if (isOpen) {
            setHours(
                data?.initialBalanceSeconds != null
                    ? Math.round((data.initialBalanceSeconds / 3600) * 100) / 100
                    : null
            );
            setLoading(false);
        }
    }, [isOpen, data?.initialBalanceSeconds]);

    if (!data) return null;

    const empName = `${data.employee.first_name} ${data.employee.last_name}`;
    const periodLabel = `${MONTH_NAMES[data.month] || data.month} ${data.year}`;

    const handleSubmit = async () => {
        if (hours == null || Number.isNaN(hours)) {
            message.warning('Lütfen net bakiyeyi (saat) girin.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/system-data/set_initial_balance/', {
                employee_id: data.employee.id,
                year: data.year,
                month: data.month,
                net_seconds: Math.round(hours * 3600),
            });
            message.success(
                `Başlangıç verisi kaydedildi — net ${((res.data?.initial_balance_seconds ?? Math.round(hours * 3600)) / 3600).toFixed(1)} sa.`
            );
            onSaveSuccess?.();
            onClose();
        } catch (e) {
            message.error('Hata: ' + extractErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={460}
            destroyOnClose
            centered
            title={
                <span>
                    Başlangıç (t=0) Verisi —{' '}
                    <span className="font-normal text-slate-500">
                        {empName} · {periodLabel}
                    </span>
                </span>
            }
        >
            <div className="pt-2">
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    Kart verisi olmayan ay için bu ayın net girdi/çıktısı (saat, +/-).
                    Devire taşınır.
                </p>

                <div className="mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Net Bakiye (saat)
                </div>
                <InputNumber
                    value={hours}
                    onChange={setHours}
                    step={0.5}
                    precision={2}
                    placeholder="Örn: 12.5 veya -8"
                    className="w-full"
                    size="large"
                    autoFocus
                />
                <div className="mt-1.5 text-[11px] text-slate-400">
                    Artı (+) fazla çalışma, eksi (-) eksik çalışma anlamına gelir.
                </div>

                <div className="flex justify-end gap-3 mt-5">
                    <Button onClick={onClose}>İptal</Button>
                    <Button type="primary" loading={loading} onClick={handleSubmit}>
                        {isEdit ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
