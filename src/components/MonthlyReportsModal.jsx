import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Spin, Empty, Tag, message } from 'antd';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';

/**
 * Saniye → "±Xs Ydk" (örn: 9000 → "+2s 30dk", -4500 → "-1s 15dk").
 * İşaret net_balance_seconds'tan gelir: fazla (+) / eksik (-).
 */
const fmt = (sec) => {
    const s = Number(sec) || 0;
    const sign = s < 0 ? '-' : '+';
    const totalMin = Math.round(Math.abs(s) / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${sign}${h}s ${m}dk`;
};

/**
 * Çalışanın kendi aylık mesai raporlarını listeleyen ve kapanmış dönemler
 * için Excel/PDF indirmesine izin veren self-servis pop-up.
 */
const MonthlyReportsModal = ({ open, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    // İndirme durumu anahtarı: `${year}-${month}-${format}` (aynı anda tek indirme)
    const [downloading, setDownloading] = useState(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance/my-monthly-history/', {
                params: { months: 12 },
            });
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Aylık geçmiş alınamadı:', e);
            setError('Aylık rapor listesi yüklenemedi.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) fetchHistory();
    }, [open, fetchHistory]);

    const downloadReport = async (row, format) => {
        if (downloading) return;
        const key = `${row.year}-${row.month}-${format}`;
        setDownloading(key);
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const action = format === 'excel' ? 'my-export-excel' : 'my-export-pdf';
        try {
            const response = await api.get(`/monthly-reports/${action}/`, {
                params: { year: row.year, month: row.month },
                responseType: 'blob',
                timeout: 180000,
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Mesai_Raporum_${row.year}_${row.month}.${ext}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Rapor indirilemedi:', err);
            let msg = 'Rapor indirilemedi.';
            const status = err?.response?.status;
            if (status === 400) {
                msg = 'Bu ay henüz kapanmadı.';
            } else if (err?.code === 'ECONNABORTED') {
                msg = 'Rapor hazırlanması çok uzun sürdü. Lütfen tekrar deneyin.';
            } else {
                // Backend hata gövdesi blob olarak gelir — gerçek mesajı okumayı dene
                const data = err?.response?.data;
                if (data instanceof Blob) {
                    try {
                        const j = JSON.parse(await data.text());
                        if (j?.error) msg = j.error;
                    } catch {
                        /* JSON değilse genel mesaj kalır */
                    }
                } else if (data?.error) {
                    msg = data.error;
                }
            }
            message.error(msg);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title="Aylık Raporlarım"
            width={640}
            destroyOnClose
        >
            {loading ? (
                <div className="flex justify-center items-center py-16">
                    <Spin />
                </div>
            ) : error ? (
                <div className="py-10">
                    <Empty description={error} />
                </div>
            ) : rows.length === 0 ? (
                <div className="py-10">
                    <Empty description="Görüntülenecek dönem bulunamadı." />
                </div>
            ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {rows.map((row) => {
                        const surplus = !!row.is_surplus;
                        const excelKey = `${row.year}-${row.month}-excel`;
                        const pdfKey = `${row.year}-${row.month}-pdf`;
                        return (
                            <div
                                key={`${row.year}-${row.month}`}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-800 truncate">{row.label}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className={`text-sm font-bold ${surplus ? 'text-emerald-600' : 'text-rose-600'}`}
                                        >
                                            {fmt(row.net_balance_seconds)}
                                        </span>
                                        <Tag color={surplus ? 'green' : 'red'} className="!m-0">
                                            {surplus ? 'Fazla' : 'Eksik'}
                                        </Tag>
                                    </div>
                                </div>
                                {row.is_closed ? (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => downloadReport(row, 'excel')}
                                            disabled={!!downloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {downloading === excelKey ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <FileSpreadsheet size={14} />
                                            )}
                                            Excel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadReport(row, 'pdf')}
                                            disabled={!!downloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {downloading === pdfKey ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <FileText size={14} />
                                            )}
                                            PDF
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-slate-400 italic shrink-0">
                                        Açık — devam ediyor
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
};

export default MonthlyReportsModal;
