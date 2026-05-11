import React, { useState, useCallback } from 'react';
import {
    HeartIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import ModalOverlay from '../../../components/ui/ModalOverlay';

/**
 * Sistem Sağlığı > Yanlış İptal Kurtarma sekmesi (Stage 71).
 *
 * Bug context: 2026-05-12 öncesi nightly_unified_audit duplicate-detection
 * aynı gün non-overlap HOSPITAL_VISIT kayıtlarını yanlışlıkla CANCELLED
 * yapıyordu. Bu sekme bu kayıtları tespit edip PENDING'e geri çekmek için
 * kullanılır.
 */
export default function FalseCancelledHRRestoreTab() {
    const [daysBack, setDaysBack] = useState(30);
    const [employeeCode, setEmployeeCode] = useState('');
    const [scanLoading, setScanLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [candidates, setCandidates] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);  // { ids, label }

    const runScan = useCallback(async () => {
        setScanLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const body = { days_back: Number(daysBack) || 30 };
            if (employeeCode.trim()) body.employee_code = employeeCode.trim();
            const resp = await api.post(
                '/system/health-check/false-cancelled-hr-scan/',
                body,
            );
            setCandidates(resp.data.candidates || []);
            setSelectedIds(new Set());
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Tarama başarısız';
            setError(msg);
            setCandidates(null);
        } finally {
            setScanLoading(false);
        }
    }, [daysBack, employeeCode]);

    const downloadTxt = useCallback(async () => {
        setExportLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('days_back', String(Number(daysBack) || 30));
            if (employeeCode.trim()) params.set('employee_code', employeeCode.trim());
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('access_token');
            const resp = await fetch(
                `${baseURL}/system/health-check/false-cancelled-hr-export/?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            a.download = `Yanlis_Iptal_Saglik_Raporu_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        } catch (err) {
            setError(`TXT rapor indirilemedi: ${err.message || err}`);
        } finally {
            setExportLoading(false);
        }
    }, [daysBack, employeeCode]);

    const runRestore = useCallback(async (ids) => {
        setRestoreLoading(true);
        setError(null);
        setSuccessMsg(null);
        setConfirmModal(null);
        try {
            const resp = await api.post(
                '/system/health-check/false-cancelled-hr-restore/',
                { ids },
            );
            setSuccessMsg(`${resp.data.restored} kayıt PENDING'e geri yüklendi.`);
            // Re-scan to refresh the list
            await runScan();
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Geri yükleme başarısız';
            setError(msg);
        } finally {
            setRestoreLoading(false);
        }
    }, [runScan]);

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (!candidates) return;
        if (selectedIds.size === candidates.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(candidates.map((c) => c.id)));
        }
    };

    const openRestoreSelected = () => {
        if (selectedIds.size === 0) return;
        setConfirmModal({
            ids: Array.from(selectedIds),
            label: `Seçili ${selectedIds.size} kayıt`,
        });
    };

    const openRestoreAll = () => {
        if (!candidates || candidates.length === 0) return;
        setConfirmModal({
            ids: candidates.map((c) => c.id),
            label: `Tüm ${candidates.length} aday`,
        });
    };

    const formatTime = (t) => (t ? t.slice(0, 5) : '—');
    const formatType = (t) =>
        t === 'HOSPITAL_VISIT' ? 'Hastane Ziyareti' : 'Sağlık Raporu';
    const formatDetection = (d) =>
        d === 'fingerprint'
            ? 'Sistem imzası'
            : 'Gece tarayıcı penceresi (02:00–03:00)';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <HeartIcon className="w-5 h-5 text-rose-600" />
                            Yanlış İptal Sağlık Raporu / Hastane Ziyareti Kurtarma
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                            Stage 71 öncesi gece tarayıcı bug'ı yüzünden aynı gün ayrı
                            zaman dilimlerinde girilmiş hastane ziyaretleri yanlışlıkla
                            iptal ediliyordu. Bu sekme o kayıtları tespit edip onay
                            akışına geri çeker.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Gün (geriye)
                        </label>
                        <input
                            type="number"
                            value={daysBack}
                            min={1}
                            max={365}
                            onChange={(e) => setDaysBack(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Çalışan kodu (opsiyonel)
                        </label>
                        <input
                            type="text"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                            placeholder="Boş = Tümü"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runScan}
                            disabled={scanLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {scanLoading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            )}
                            {scanLoading ? 'Taranıyor...' : 'Tara'}
                        </button>
                        <button
                            onClick={downloadTxt}
                            disabled={exportLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {exportLoading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-4 h-4" />
                            )}
                            {exportLoading ? 'İndiriliyor...' : 'TXT İndir'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error / Success */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-800">{error}</div>
                </div>
            )}
            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm text-emerald-800">{successMsg}</div>
                </div>
            )}

            {/* Results */}
            {candidates !== null && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                        <div className="text-sm font-bold text-gray-800">
                            {candidates.length} aday bulundu
                        </div>
                        {candidates.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openRestoreSelected}
                                    disabled={selectedIds.size === 0 || restoreLoading}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                    Seçilileri Geri Yükle ({selectedIds.size})
                                </button>
                                <button
                                    onClick={openRestoreAll}
                                    disabled={restoreLoading}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                    Tümünü Geri Yükle
                                </button>
                            </div>
                        )}
                    </div>

                    {candidates.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            <CheckCircleIcon className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            Geri yüklenmeye uygun aday bulunamadı. Sistem temiz.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    candidates.length > 0
                                                    && selectedIds.size === candidates.length
                                                }
                                                onChange={toggleSelectAll}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="px-3 py-2 text-left">HR#</th>
                                        <th className="px-3 py-2 text-left">Çalışan</th>
                                        <th className="px-3 py-2 text-left">Departman</th>
                                        <th className="px-3 py-2 text-left">Tarih</th>
                                        <th className="px-3 py-2 text-left">Tür</th>
                                        <th className="px-3 py-2 text-left">Zaman</th>
                                        <th className="px-3 py-2 text-left">İptal Anı</th>
                                        <th className="px-3 py-2 text-left">Tespit Yöntemi</th>
                                        <th className="px-3 py-2 text-left">Sibling'ler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((c) => (
                                        <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(c.id)}
                                                    onChange={() => toggleSelect(c.id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-700">
                                                {c.id}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-800">
                                                    {c.employee_name}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    {c.employee_code}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                                {c.department || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">{c.start_date}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    c.report_type === 'HOSPITAL_VISIT'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {formatType(c.report_type)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                                {c.is_full_day
                                                    ? <span className="text-gray-400">Tam gün</span>
                                                    : `${formatTime(c.start_time)} – ${formatTime(c.end_time)}`
                                                }
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 text-[10px]">
                                                {c.cancelled_at || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 text-[10px]">
                                                {formatDetection(c.detection_reason)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-500 text-[10px] font-mono">
                                                {c.sibling_ids?.join(', ') || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal && (
                <ModalOverlay onClose={() => setConfirmModal(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-md">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-7 h-7 text-amber-600 flex-shrink-0" />
                            <div>
                                <h3 className="text-base font-bold text-gray-800">
                                    Geri yüklemeyi onayla
                                </h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    {confirmModal.label} <strong>PENDING</strong> durumuna
                                    döndürülecek. Kayıtlar yeniden muhasebe onay listesinde
                                    görünecek.
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Bu işlem geri alınamaz şekilde durumu değiştirir,
                                    ama onay aşaması manuel olarak ilerler.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={() => runRestore(confirmModal.ids)}
                                disabled={restoreLoading}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {restoreLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                                Geri Yükle
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}
