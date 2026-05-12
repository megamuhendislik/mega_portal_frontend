import React, { useState, useCallback } from 'react';
import {
    ArrowPathIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

export default function StuckAttendanceRecoveryTab() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [applyResult, setApplyResult] = useState(null);

    const handleScan = useCallback(async () => {
        setLoading(true);
        setError('');
        setApplyResult(null);
        try {
            const body = {};
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            const res = await api.post('/system/health-check/stuck-attendance-scan/', body);
            setScanResult(res.data);
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    const handleApply = useCallback(async () => {
        if (!scanResult || scanResult.stuck_count === 0) return;
        if (!confirm(`${scanResult.stuck_count} takılı Attendance reset edilecek + ${scanResult.stuck_count} gün için recalc tetiklenecek. Devam?`)) return;
        setLoading(true);
        setError('');
        try {
            const body = {};
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            const res = await api.post('/system/health-check/stuck-attendance-apply/', body);
            setApplyResult(res.data);
            setScanResult(res.data.scan_result);
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, scanResult]);

    const downloadTxt = async () => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            const res = await api.get(
                `/system/health-check/stuck-attendance-txt/?${params.toString()}`,
                { responseType: 'blob' },
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: 'text/plain;charset=utf-8' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `takili-attendance-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e?.response?.data?.error || e.message));
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
                    Takılı Attendance Kurtarma
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    CANCELLED OT'ya takılı kalmış Attendance kayıtlarını (is_overtime_record=True
                    ama aktif OT yok) tespit edip reset eder. Reset sonrası ilgili gün için
                    recalc tetiklenir → POTENTIAL temiz yeniden yaratılır → kullanıcı tekrar
                    talep edebilir.
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                        <input type="date" value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                        <input type="date" value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={handleScan} disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                        <ArrowPathIcon className="w-4 h-4" />
                        {loading ? 'Taranıyor...' : 'Tara (Dry-Run)'}
                    </button>
                    {scanResult && scanResult.stuck_count > 0 && (
                        <button onClick={handleApply} disabled={loading}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-4 h-4" />
                            {loading ? 'Uygulanıyor...' : `Uygula (${scanResult.stuck_count} kayıt)`}
                        </button>
                    )}
                    {scanResult && (
                        <button onClick={downloadTxt}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                    {error}
                </div>
            )}

            {applyResult && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-lg flex items-start gap-3">
                    <CheckCircleIcon className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-bold">Apply Tamamlandı</div>
                        <div className="text-sm mt-1">
                            {applyResult.fixed} Attendance reset edildi · {applyResult.recalculated_days} gün recalc · {applyResult.affected_employees} çalışan etkilendi
                        </div>
                    </div>
                </div>
            )}

            {scanResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600 flex items-center justify-between">
                        <div>
                            Taranan: <span className="font-bold">{scanResult.scanned}</span> | Takılı:{' '}
                            <span className={`font-bold ${scanResult.stuck_count > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                {scanResult.stuck_count}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500">
                            {scanResult.date_from} → {scanResult.date_to}
                        </div>
                    </div>
                    {scanResult.stuck_count === 0 ? (
                        <div className="p-8 text-center text-emerald-700 flex items-center justify-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" />
                            Takılı kayıt yok — sistem temiz
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-3 py-2">Att ID</th>
                                        <th className="px-3 py-2">Çalışan</th>
                                        <th className="px-3 py-2">Departman</th>
                                        <th className="px-3 py-2">Tarih</th>
                                        <th className="px-3 py-2">Kaynak</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Cancelled OT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scanResult.stuck_records.map((r) => (
                                        <tr key={r.attendance_id} className="border-b hover:bg-gray-50">
                                            <td className="px-3 py-2 font-mono text-xs">#{r.attendance_id}</td>
                                            <td className="px-3 py-2">{r.employee_name}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{r.department || '—'}</td>
                                            <td className="px-3 py-2 text-xs">{r.work_date}</td>
                                            <td className="px-3 py-2 text-xs">{r.source || '—'}</td>
                                            <td className="px-3 py-2 text-xs">{r.status || '—'}</td>
                                            <td className="px-3 py-2 text-xs">
                                                {r.cancelled_ot_id ? (
                                                    <span className="text-amber-700">#{r.cancelled_ot_id}</span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
