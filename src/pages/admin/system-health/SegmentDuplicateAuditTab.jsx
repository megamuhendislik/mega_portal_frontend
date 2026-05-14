import React, { useState, useCallback } from 'react';
import {
    ArrowPathIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const STATUS_COLORS = {
    POTENTIAL: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
};

export default function SegmentDuplicateAuditTab() {
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
            const res = await api.post('/system/health-check/segment-duplicate-scan/', body);
            setScanResult(res.data);
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    const handleApply = useCallback(async () => {
        if (!scanResult || scanResult.duplicate_count === 0) return;
        if (!confirm(
            `${scanResult.duplicate_count} OT kaydının duplikat segmentleri dedup edilecek. ` +
            `duration_seconds dokunulmaz, toplam süre aynı kalır. Devam?`
        )) return;
        setLoading(true);
        setError('');
        try {
            const body = {};
            if (dateFrom) body.date_from = dateFrom;
            if (dateTo) body.date_to = dateTo;
            const res = await api.post('/system/health-check/segment-duplicate-apply/', body);
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
                `/system/health-check/segment-duplicate-txt/?${params.toString()}`,
                { responseType: 'blob' },
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: 'text/plain;charset=utf-8' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `segment-duplikat-${new Date().toISOString().slice(0, 10)}.txt`;
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
            {/* Header */}
            <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-1">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-purple-600" />
                    Segment Duplikat Tarayıcı
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    OvertimeRequest.segments JSON'unda duplikat (start,end) içeren kayıtları
                    bul (Mutlu OT#438984 senaryosu). Önleyici fix mevcut — bu tool historical
                    kayıtlar için. <strong>duration_seconds dokunulmaz, toplam süre aynı kalır.</strong>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleScan}
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 flex items-center gap-1"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Taranıyor...' : 'Tara (Dry-Run)'}
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={loading || !scanResult || scanResult.duplicate_count === 0}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-300 flex items-center gap-1"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            Uygula{scanResult ? ` (${scanResult.duplicate_count} kayıt)` : ''}
                        </button>
                        <button
                            type="button"
                            onClick={downloadTxt}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-300 flex items-center gap-1"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            TXT İndir
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Apply Result */}
            {applyResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> Uygulama Tamam
                    </h4>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                            <div className="text-xs text-emerald-600">Düzeltilen</div>
                            <div className="text-2xl font-bold text-emerald-700">{applyResult.fixed}</div>
                        </div>
                        <div>
                            <div className="text-xs text-emerald-600">Etkilenen Çalışan</div>
                            <div className="text-2xl font-bold text-emerald-700">{applyResult.affected_employees}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scan Result */}
            {scanResult && (
                <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-700">
                            Tarama Sonucu
                        </h4>
                        <div className="text-xs text-slate-500">
                            Taranan: <strong>{scanResult.scanned}</strong> | Duplikat:{' '}
                            <strong className={scanResult.duplicate_count > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                                {scanResult.duplicate_count}
                            </strong>
                            {' '}| {scanResult.date_from} → {scanResult.date_to}
                        </div>
                    </div>

                    {scanResult.duplicate_count === 0 ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-700 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" />
                            Duplikat segment içeren OT kaydı yok — sistem temiz.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left">OT ID</th>
                                        <th className="px-2 py-1.5 text-left">Çalışan</th>
                                        <th className="px-2 py-1.5 text-left">Departman</th>
                                        <th className="px-2 py-1.5 text-left">Tarih</th>
                                        <th className="px-2 py-1.5 text-left">Status</th>
                                        <th className="px-2 py-1.5 text-left">Saat</th>
                                        <th className="px-2 py-1.5 text-right">Ham</th>
                                        <th className="px-2 py-1.5 text-right">Unique</th>
                                        <th className="px-2 py-1.5 text-right">Duplikat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {scanResult.duplicate_records.map((r) => (
                                        <tr key={r.overtime_request_id}>
                                            <td className="px-2 py-1.5 font-mono">OT#{r.overtime_request_id}</td>
                                            <td className="px-2 py-1.5">{r.employee_name}</td>
                                            <td className="px-2 py-1.5 text-slate-500">{r.department || '-'}</td>
                                            <td className="px-2 py-1.5">{r.date}</td>
                                            <td className="px-2 py-1.5">
                                                <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[r.status] || 'bg-slate-100'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5">{r.start_time}–{r.end_time}</td>
                                            <td className="px-2 py-1.5 text-right font-mono">{r.raw_segments_count}</td>
                                            <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{r.unique_segments_count}</td>
                                            <td className="px-2 py-1.5 text-right font-mono text-amber-700 font-bold">{r.duplicate_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 flex gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                    <strong>Bilgi:</strong> Apply işlemi sadece <code>segments</code> JSON'unu temizler.
                    <code>duration_seconds</code> ve diğer alanlar dokunulmaz. Toplam Süre aynı kalır
                    (zaten union-of-intervals ile doğru hesaplanmıştı).
                </div>
            </div>
        </div>
    );
}
