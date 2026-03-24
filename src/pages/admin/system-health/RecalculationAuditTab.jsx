import React, { useState } from 'react';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentArrowDownIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    XCircleIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Phase2IssuePanel from './Phase2IssuePanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtSeconds(s) {
    if (!s || s <= 0) return '0 dk';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} sa`;
    return `${m} dk`;
}

const ROOT_CAUSE_COLORS = {
    STALE_CALC: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Eski Hesaplama' },
    TOLERANCE_DIFF: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Tolerans Farki' },
    BREAK_DIFF: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Mola Farki' },
    SPLIT_CHANGE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Kayit Bolme' },
    OT_THRESHOLD: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'OT Esik' },
    DEFICIT_FILL: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Eksik Tamamlama' },
    STATUS_DRIFT: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Durum Farki' },
    RECORD_COUNT: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Kayit Sayisi' },
    HOSPITAL_VISIT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Hastane Ziyareti' },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RecalculationAuditTab() {
    const [startDate, setStartDate] = useState(getIstanbulDateOffset(-30));
    const [endDate, setEndDate] = useState(getIstanbulToday());
    const [employeeId, setEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showLog, setShowLog] = useState(false);
    const [expandedMismatches, setExpandedMismatches] = useState(new Set());

    // Unified audit state
    const [uniLoading, setUniLoading] = useState(false);
    const [uniFixing, setUniFixing] = useState(false);
    const [uniResult, setUniResult] = useState(null);
    const [uniError, setUniError] = useState(null);
    const [uniLogText, setUniLogText] = useState(null);
    const [uniLogLoading, setUniLogLoading] = useState(false);
    const [showUniLog, setShowUniLog] = useState(false);

    // Full recalculation state
    const [frcLoading, setFrcLoading] = useState(false);
    const [frcResult, setFrcResult] = useState(null);
    const [frcError, setFrcError] = useState(null);
    const [frcExpandedEmps, setFrcExpandedEmps] = useState(new Set());
    const [frcExpandedDays, setFrcExpandedDays] = useState(new Set());
    const [showAllDays, setShowAllDays] = useState(false);

    const fetchUnifiedLogText = async () => {
        if (uniLogText) { setShowUniLog(!showUniLog); return; }
        setUniLogLoading(true);
        try {
            const body = { date_from: startDate, date_to: endDate, download: true };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, {
                responseType: 'text',
                timeout: 300000,
            });
            setUniLogText(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
            setShowUniLog(true);
        } catch (e) {
            alert('Log yuklenemedi: ' + (e.message || 'Bilinmeyen hata'));
        } finally {
            setUniLogLoading(false);
        }
    };

    const downloadUnifiedLog = async () => {
        try {
            const body = { date_from: startDate, date_to: endDate, download: true };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, {
                responseType: 'blob',
                timeout: 300000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `birlesik_denetim_${startDate}_${endDate}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Log indirme hatasi: ' + (e.message || 'Bilinmeyen hata'));
        }
    };

    // ── Full Recalculation ──────────────────────────────────────────
    const runFullRecalculation = async (mode = 'dry_run') => {
        if (mode === 'apply' && !window.confirm(
            'DIKKAT: Tum degisiklikler kalici olarak uygulanacak!\n\n' +
            'Dry-run raporundaki tum split duzeltmeleri, normal mesai yeniden hesaplamalari,\n' +
            'OT ayarlamalari ve aylik ozet guncellemeleri veritabanina yazilacak.\n\n' +
            'Bu islem geri alinamaz. Devam etmek istiyor musunuz?'
        )) return;

        setFrcLoading(true);
        setFrcError(null);
        setFrcResult(null);
        setFrcExpandedEmps(new Set());
        setFrcExpandedDays(new Set());
        try {
            const body = { date_from: startDate, date_to: endDate, mode, show_all_days: showAllDays };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/full-recalculation/', body, { timeout: 600000 });
            setFrcResult(res.data);
        } catch (e) {
            setFrcError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setFrcLoading(false);
        }
    };

    const downloadFrcLog = async () => {
        try {
            const body = { date_from: startDate, date_to: endDate, mode: 'dry_run', download: true, show_all_days: showAllDays };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/full-recalculation/', body, {
                responseType: 'blob',
                timeout: 600000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `tam_yeniden_hesaplama_${startDate}_${endDate}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Log indirme hatasi: ' + (e.message || 'Bilinmeyen hata'));
        }
    };

    const toggleFrcEmp = (id) => {
        setFrcExpandedEmps(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleFrcDay = (key) => {
        setFrcExpandedDays(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const runUnifiedAudit = async (fix = false) => {
        if (fix && !window.confirm(
            'Kesin Hatalari Duzelt\n\n' +
            'Sadece kesin hesaplama hatalarini duzeltir:\n' +
            '- Split yanlis noktada bolunmus -> dogru noktada yeniden bol\n' +
            '- Fragment/duplikat talepler -> birlestir\n' +
            '- Izin cift sayim -> recalculate\n' +
            '- Aylik ozetler -> cascade guncelle\n\n' +
            'PDKS uyumsuzluklarina (saha/evden calisma) DOKUNMAZ.\n' +
            'Devam etmek istiyor musunuz?'
        )) return;

        fix ? setUniFixing(true) : setUniLoading(true);
        setUniError(null);
        setUniResult(null);
        setUniLogText(null);
        setShowUniLog(false);
        try {
            const body = { date_from: startDate, date_to: endDate, fix };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, { timeout: 300000 });
            setUniResult(res.data);
        } catch (e) {
            setUniError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setUniLoading(false);
            setUniFixing(false);
        }
    };

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-audit/', body, { timeout: 300000 });
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setLoading(false);
        }
    };

    const runFix = async () => {
        if (!window.confirm(
            'DİKKAT: Bu işlem tüm farklılıkları kalıcı olarak düzeltecektir.\n\n' +
            'Tüm günler yeniden hesaplanacak ve sonuçlar veritabanına kaydedilecek.\n' +
            'Aylık özetler de güncellenecektir.\n\n' +
            'Devam etmek istiyor musunuz?'
        )) return;

        setFixing(true);
        setError(null);
        setResult(null);
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-fix/', body, { timeout: 300000 });
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setFixing(false);
        }
    };

    const downloadLog = async () => {
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
                download: true,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-audit/', body, {
                responseType: 'blob',
                timeout: 300000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `recalculation_audit_${startDate}_${endDate}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Log indirme hatasi: ' + (e.message || 'Bilinmeyen hata'));
        }
    };

    const toggleMismatch = (idx) => {
        setExpandedMismatches(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const isFixMode = result?.mode === 'fix';
    const isProcessing = loading || fixing;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ArrowPathIcon className="w-6 h-6 text-indigo-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Hesaplama Denetimi</h3>
                    <p className="text-xs text-gray-500">
                        Talep analizi, PDKS kart dogrulama ve hesaplama butunlugu — tek butonla tum denetim.
                        Sonuclar icinden tek tek veya toplu duzeltme yapilabilir.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Baslangic Tarihi</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bitis Tarihi</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Calisan ID (opsiyonel)</label>
                    <input
                        type="number"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Tumu"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-28 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => runUnifiedAudit(false)}
                        disabled={isProcessing || uniLoading || uniFixing || frcLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            uniLoading || uniFixing ? 'bg-gray-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                        }`}
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {uniLoading ? 'Tarama...' : uniFixing ? 'Duzeltiliyor...' : 'Hesaplama Denetimi'}
                    </button>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={showAllDays} onChange={e => setShowAllDays(e.target.checked)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        Tum Gunler
                    </label>
                    <button
                        onClick={() => runFullRecalculation('dry_run')}
                        disabled={isProcessing || uniLoading || uniFixing || frcLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            frcLoading ? 'bg-gray-400 cursor-wait' : 'bg-violet-600 hover:bg-violet-700 active:scale-95'
                        }`}
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        {frcLoading ? 'Hesaplaniyor...' : 'Tam Yeniden Hesaplama'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {isProcessing && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        {fixing ? (
                            <WrenchScrewdriverIcon className="w-8 h-8 text-red-500 animate-pulse" />
                        ) : (
                            <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                        )}
                        <p className="text-sm text-gray-500 font-medium">
                            {fixing ? 'Tum gunler yeniden hesaplaniyor ve duzeltiliyor...' : 'Tum gunler yeniden hesaplaniyor (dry-run)...'}
                        </p>
                        <p className="text-xs text-gray-400">Bu islem birkac dakika surebilir.</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !isProcessing && (
                <div className="space-y-6">
                    {/* Mode Banner */}
                    {isFixMode && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold">Duzeltme tamamlandi!</span>
                                {' '}{result.summary?.fixed_days || 0} gun duzeltildi, aylik ozetler guncellendi.
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <SummaryCard
                            icon={<CheckCircleIcon className="w-6 h-6 text-green-600" />}
                            label="Eslesen Gunler"
                            value={result.summary?.matching_days || 0}
                            color="green"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-600" />}
                            label="Uyusmayan Gunler"
                            value={result.summary?.mismatching_days || 0}
                            color="red"
                        />
                        {isFixMode && (
                            <SummaryCard
                                icon={<WrenchScrewdriverIcon className="w-6 h-6 text-emerald-600" />}
                                label="Duzeltilen"
                                value={result.summary?.fixed_days || 0}
                                color="green"
                            />
                        )}
                        <SummaryCard
                            icon={<XCircleIcon className="w-6 h-6 text-amber-600" />}
                            label="Hatali Gunler"
                            value={result.summary?.error_days || 0}
                            color="amber"
                        />
                        <SummaryCard
                            icon={<ClockIcon className="w-6 h-6 text-gray-500" />}
                            label="Kayitsiz Gunler"
                            value={result.summary?.no_record_days || 0}
                            color="gray"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-6 h-6 text-purple-600" />}
                            label="Anomaliler"
                            value={result.summary?.anomaly_count || 0}
                            color="purple"
                        />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span>
                            Toplam {result.total_days_processed} gun islendi | Sure: {result.elapsed_seconds}s | Mod: {isFixMode ? 'DUZELTME' : 'DENETIM'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowLog(!showLog)}
                                className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
                            >
                                {showLog ? 'Logu Gizle' : 'Detayli Logu Goster'}
                            </button>
                            <button
                                onClick={downloadLog}
                                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {/* Anomalies */}
                    {result.anomalies?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                Anomaliler ({result.anomalies.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {result.anomalies.map((a, i) => (
                                    <div key={i} className="p-3 border border-purple-200 bg-purple-50 rounded-lg text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                a.type === 'MULTI_REQUEST' ? 'bg-red-100 text-red-700' :
                                                a.type === 'REJECTED_BUT_APPROVED_OT' ? 'bg-red-100 text-red-700' :
                                                a.type === 'APPROVED_BUT_NO_OT' ? 'bg-red-100 text-red-700' :
                                                a.type === 'OT_DURATION_MISMATCH' ? (a.severity === 'INFO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700') :
                                                a.type === 'MONTHLY_SUMMARY_MISMATCH' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {a.type === 'MULTI_REQUEST' ? 'Coklu Talep' :
                                                 a.type === 'REJECTED_BUT_APPROVED_OT' ? 'RED AMA OT Var' :
                                                 a.type === 'APPROVED_BUT_NO_OT' ? 'Onayli AMA OT Yok' :
                                                 a.type === 'OT_DURATION_MISMATCH' ? (a.severity === 'INFO' ? 'OT Kaplama (Beklenen)' : 'OT Sure Uyumsuz') :
                                                 a.type === 'MONTHLY_SUMMARY_MISMATCH' ? 'Aylik Ozet' :
                                                 a.type === 'NEGATIVE_MISSING' ? 'Negatif Eksik' :
                                                 a.type === 'EXTREME_MISSING' ? 'Asiri Eksik' : a.type}
                                            </span>
                                            <span className="font-bold text-gray-700">{a.employee_name}</span>
                                            <span className="text-gray-500">{a.date}</span>
                                        </div>
                                        <p className="text-gray-600">{a.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Summary Mismatches */}
                    {result.monthly_summary_mismatches?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                Aylik Ozet Uyusmazliklari ({result.monthly_summary_mismatches.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {result.monthly_summary_mismatches.map((m, i) => (
                                    <div key={i} className="p-3 border border-orange-200 bg-orange-50 rounded-lg text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                                Aylik Ozet
                                            </span>
                                            <span className="font-bold text-gray-700">{m.employee_name}</span>
                                            <span className="text-gray-500">{m.date}</span>
                                        </div>
                                        <p className="text-gray-600">{m.detail}</p>
                                        {m.diffs?.length > 0 && (
                                            <div className="mt-2 space-y-0.5">
                                                {m.diffs.map((d, j) => (
                                                    <div key={j} className="flex items-center gap-2 text-[11px]">
                                                        <span className="font-mono text-gray-500 w-40">{d.field}</span>
                                                        <span className="text-gray-600">{fmtSeconds(d.stored)}</span>
                                                        <span className="text-gray-400">&rarr;</span>
                                                        <span className="font-bold text-orange-700">{fmtSeconds(d.fresh)}</span>
                                                        <span className={`text-[10px] font-bold ${d.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ({d.diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(d.diff))})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mismatches */}
                    {result.mismatches?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                {isFixMode ? 'Duzeltilen Gunler' : 'Uyusmayan Gunler'} ({result.mismatches.length})
                            </h4>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {result.mismatches.map((m, i) => (
                                    <div key={i} className={`border rounded-lg overflow-hidden ${
                                        m.fixed ? 'border-green-200' : 'border-red-200'
                                    }`}>
                                        <button
                                            onClick={() => toggleMismatch(i)}
                                            className={`w-full flex items-center justify-between p-3 transition-colors text-left ${
                                                m.fixed ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-xs">
                                                {m.fixed && <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />}
                                                <span className={`font-bold ${m.fixed ? 'text-green-800' : 'text-red-800'}`}>{m.date}</span>
                                                <span className="text-gray-700">{m.employee_name}</span>
                                                <span className="text-gray-400">({m.diffs?.length || 0} fark)</span>
                                                {m.root_cause && ROOT_CAUSE_COLORS[m.root_cause] && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ROOT_CAUSE_COLORS[m.root_cause].bg} ${ROOT_CAUSE_COLORS[m.root_cause].text}`}>
                                                        {ROOT_CAUSE_COLORS[m.root_cause].label}
                                                    </span>
                                                )}
                                                {m.fixed && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">DUZELTILDI</span>}
                                            </div>
                                            {expandedMismatches.has(i) ?
                                                <ChevronUpIcon className="w-4 h-4 text-gray-400" /> :
                                                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                            }
                                        </button>
                                        {expandedMismatches.has(i) && (
                                            <div className="p-3 border-t border-red-100 space-y-3">
                                                {/* Diffs */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Farklar</h5>
                                                    <div className="space-y-1">
                                                        {m.diffs?.map((d, j) => (
                                                            <div key={j} className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono text-gray-500 w-44">{d.field}</span>
                                                                {d.field === 'status' || d.field === 'record_count' ? (
                                                                    <span className="text-red-600 font-bold">{d.diff_formatted}</span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-gray-600">{fmtSeconds(d.before)}</span>
                                                                        <span className="text-gray-400">&rarr;</span>
                                                                        <span className="font-bold text-red-700">{fmtSeconds(d.after)}</span>
                                                                        <span className={`text-[10px] font-bold ${d.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            ({d.diff > 0 ? '+' : ''}{d.diff_formatted})
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Before/After Table */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <SnapshotBlock title="Onceki Degerler" data={m.before} color="gray" />
                                                    <SnapshotBlock title={m.fixed ? 'Duzeltilmis Degerler' : 'Yeniden Hesaplanan'} data={m.after} color={m.fixed ? 'green' : 'red'} />
                                                </div>

                                                {/* Requests */}
                                                {m.requests?.length > 0 && (
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                            Ek Mesai Talepleri ({m.requests.length})
                                                        </h5>
                                                        <div className="space-y-1">
                                                            {m.requests.map((r, k) => (
                                                                <div key={k} className="flex items-center gap-2 text-[11px]">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                        r.status === 'POTENTIAL' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {r.status}
                                                                    </span>
                                                                    <span className="text-gray-500">{r.assignment_source || '-'}</span>
                                                                    <span className="font-mono text-gray-600">
                                                                        {r.start_time?.slice(0,5) || '-'} - {r.end_time?.slice(0,5) || '-'}
                                                                    </span>
                                                                    <span className="text-gray-400">{fmtSeconds(r.duration_seconds)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Simulation Logs */}
                                                {m.simulation_logs?.length > 0 && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Simulasyon Logu ({m.simulation_logs.length} satir)
                                                        </summary>
                                                        <pre className="mt-1 p-2 bg-gray-900 text-green-400 text-[10px] rounded max-h-48 overflow-y-auto font-mono leading-relaxed">
                                                            {m.simulation_logs.join('\n')}
                                                        </pre>
                                                    </details>
                                                )}

                                                {/* Day Rules */}
                                                {m.day_rules && !m.day_rules.error && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Gun Kurallari
                                                        </summary>
                                                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-600 bg-gray-50 p-2 rounded">
                                                            <span>Vardiya: {m.day_rules.shift_start} - {m.day_rules.shift_end}</span>
                                                            <span>Ogle: {m.day_rules.lunch_start} - {m.day_rules.lunch_end}</span>
                                                            <span>Tolerans: {m.day_rules.tolerance_minutes} dk</span>
                                                            <span>Servis Tol: {m.day_rules.service_tolerance_minutes} dk</span>
                                                            <span>Min OT: {m.day_rules.minimum_overtime_minutes} dk</span>
                                                            <span>Mola Ind: {m.day_rules.daily_break_allowance} dk</span>
                                                            <span>Hedef: {m.day_rules.target_formatted || '-'}</span>
                                                            <span>{m.day_rules.is_off_day ? 'TATIL' : 'Is gunu'}</span>
                                                        </div>
                                                    </details>
                                                )}

                                                {/* Leave/Cardless/Meal Requests */}
                                                {(m.leave_requests?.length > 0 || m.cardless_requests?.length > 0 || m.meal_requests?.length > 0) && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Diger Talepler
                                                        </summary>
                                                        <div className="mt-1 space-y-1 text-[11px]">
                                                            {m.leave_requests?.map((r, k) => (
                                                                <div key={`l${k}`} className="flex items-center gap-2">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>{r.status}</span>
                                                                    <span className="text-gray-700">{r.request_type__name || 'Izin'}</span>
                                                                    <span className="text-gray-500">{r.start_date} - {r.end_date}</span>
                                                                </div>
                                                            ))}
                                                            {m.cardless_requests?.map((r, k) => (
                                                                <div key={`c${k}`} className="flex items-center gap-2">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>{r.status}</span>
                                                                    <span className="text-gray-700">Kartsiz Giris</span>
                                                                    <span className="font-mono text-gray-500">
                                                                        {String(r.check_in_time || '-').slice(0,5)} - {String(r.check_out_time || '-').slice(0,5)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Employee Summaries */}
                    {result.employee_summaries && Object.keys(result.employee_summaries).length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Calisan Bazli Ozet</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-left">
                                            <th className="py-2 px-2 font-bold text-gray-600">Calisan</th>
                                            <th className="py-2 px-2 font-bold text-green-600 text-right">Eslesen</th>
                                            <th className="py-2 px-2 font-bold text-red-600 text-right">Uyusmayan</th>
                                            {isFixMode && <th className="py-2 px-2 font-bold text-emerald-600 text-right">Duzeltilen</th>}
                                            <th className="py-2 px-2 font-bold text-amber-600 text-right">Hata</th>
                                            <th className="py-2 px-2 font-bold text-gray-600 text-right">Normal</th>
                                            <th className="py-2 px-2 font-bold text-indigo-600 text-right">Hesap. OT</th>
                                            <th className="py-2 px-2 font-bold text-purple-600 text-right">Onayli OT</th>
                                            <th className="py-2 px-2 font-bold text-orange-600 text-right">Eksik</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(result.employee_summaries)
                                            .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'tr'))
                                            .map(([empId, s]) => (
                                                <tr key={empId} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="py-1.5 px-2 font-medium text-gray-800">{s.name}</td>
                                                    <td className="py-1.5 px-2 text-right text-green-700 font-bold">{s.match_days}</td>
                                                    <td className="py-1.5 px-2 text-right text-red-700 font-bold">{s.mismatch_days}</td>
                                                    {isFixMode && <td className="py-1.5 px-2 text-right text-emerald-700 font-bold">{s.fixed_days || 0}</td>}
                                                    <td className="py-1.5 px-2 text-right text-amber-700 font-bold">{s.error_days}</td>
                                                    <td className="py-1.5 px-2 text-right text-gray-600">{fmtSeconds(s.completed_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-indigo-600">{fmtSeconds(s.calculated_ot_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-purple-600">{fmtSeconds(s.approved_ot_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-orange-600">{fmtSeconds(s.missing_seconds)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Full Log */}
                    {showLog && result.log_text && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Detayli Log</h4>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-[11px] leading-relaxed overflow-auto max-h-[600px] font-mono whitespace-pre-wrap">
                                {result.log_text}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ Birlesik Denetim Sonuclari ══════ */}
            {(uniLoading || uniFixing) && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">
                            {uniFixing ? 'Birlesik duzeltme yapiliyor (3 faz)...' : 'Birlesik denetim taramasi (3 faz)...'}
                        </p>
                        <p className="text-xs text-gray-400">Bu islem birkac dakika surebilir.</p>
                    </div>
                </div>
            )}

            {uniError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {uniError}
                </div>
            )}

            {uniResult && (
                <div className="space-y-6 mt-6 border-t-2 border-emerald-300 pt-6">
                    {/* Puan Sistemi */}
                    {uniResult.health_score && (
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white ${
                                    uniResult.health_score.overall_score >= 90 ? 'bg-green-500' :
                                    uniResult.health_score.overall_score >= 70 ? 'bg-amber-500' :
                                    'bg-red-500'
                                }`}>
                                    %{uniResult.health_score.overall_score}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-800">Hesaplama Sagligi</div>
                                    <div className="text-[10px] text-gray-500">{uniResult.date_range}</div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 flex-1">
                                {Object.entries(uniResult.health_score.categories || {}).map(([key, cat]) => (
                                    <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                            cat.score >= 90 ? 'bg-green-500' : cat.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}>
                                            {cat.score}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-gray-700">{cat.label}</div>
                                            <div className="text-[10px] text-gray-400">{cat.issues}/{cat.total} sorun</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Hesaplama Denetimi Sonuclari</h3>
                                <p className="text-xs text-gray-500">{uniResult.date_range} | Mod: {uniResult.mode}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {uniResult.mode === 'dry-run' && (
                                <button
                                    onClick={() => runUnifiedAudit(true)}
                                    disabled={uniFixing}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                                        uniFixing ? 'bg-gray-400 cursor-wait' : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                                    }`}
                                >
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    {uniFixing ? 'Duzeltiliyor...' : 'Kesin Hatalari Duzelt'}
                                </button>
                            )}
                            <button
                                onClick={fetchUnifiedLogText}
                                disabled={uniLogLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border transition-all ${
                                    showUniLog
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'text-indigo-700 bg-indigo-50 border-indigo-300 hover:bg-indigo-100'
                                } active:scale-95`}
                            >
                                <MagnifyingGlassIcon className="w-4 h-4" />
                                {uniLogLoading ? 'Yukleniyor...' : showUniLog ? 'Logu Gizle' : 'Detayli Logu Goster'}
                            </button>
                            <button
                                onClick={downloadUnifiedLog}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {/* Faz 1: Talep Analizi */}
                    {uniResult.phase1 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                            <h4 className="font-bold text-blue-800 text-sm">Faz 1: Talep Analizi</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <SummaryCard
                                    icon={<ClockIcon className="w-5 h-5 text-blue-500" />}
                                    label="Toplam Talep" value={uniResult.phase1.total} color="gray"
                                />
                                <SummaryCard
                                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                                    label="Sorunlu" value={uniResult.phase1.with_issues} color={uniResult.phase1.with_issues > 0 ? 'amber' : 'green'}
                                />
                                {uniResult.phase1.fixed !== undefined && (
                                    <SummaryCard
                                        icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                        label="Duzeltildi" value={uniResult.phase1.fixed} color="green"
                                    />
                                )}
                                {uniResult.phase1.failed !== undefined && uniResult.phase1.failed > 0 && (
                                    <SummaryCard
                                        icon={<XCircleIcon className="w-5 h-5 text-red-500" />}
                                        label="Basarisiz" value={uniResult.phase1.failed} color="red"
                                    />
                                )}
                            </div>
                            {/* Issue breakdown */}
                            {uniResult.phase1.issue_breakdown && Object.entries(uniResult.phase1.issue_breakdown).some(([,v]) => v > 0) && (
                                <div className="text-xs space-y-1">
                                    <p className="font-semibold text-gray-600">Sorun Dagilimi:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(uniResult.phase1.issue_breakdown).filter(([,v]) => v > 0).map(([code, count]) => (
                                            <span key={code} className="px-2 py-1 bg-white border border-blue-200 rounded text-blue-700 font-mono">
                                                {code}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Fix log */}
                            {uniResult.phase1.fix_log?.length > 0 && (
                                <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                                    <p className="font-semibold text-gray-600">Duzeltme Logu:</p>
                                    {uniResult.phase1.fix_log.map((log, i) => (
                                        <div key={i} className={`p-2 rounded ${log.fixed ? 'bg-green-50' : 'bg-red-50'} flex gap-2`}>
                                            {log.fixed ? <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                                            <span>{log.employee_name} {log.date} [{log.issue_code}] -- {log.detail}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Veri Butunlugu Fix Sonuclari */}
                    {uniResult.data_fixes && uniResult.data_fixes.fixes?.length > 0 && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                            <h4 className="font-bold text-orange-800 text-sm">Veri Butunlugu Duzeltmeleri ({uniResult.data_fixes.total})</h4>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {uniResult.data_fixes.fixes.map((fix, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 bg-white rounded border border-orange-100 text-xs">
                                        <WrenchScrewdriverIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                        <span>{fix}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Faz 2: PDKS Dogrulama — Interaktif Panel */}
                    {uniResult.phase2 && <Phase2IssuePanel phase2={uniResult.phase2} />}

                    {/* Faz 3: Butunluk Kontrolu */}
                    {uniResult.phase3 && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                            <h4 className="font-bold text-emerald-800 text-sm">Faz 3: Butunluk Kontrolu</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <SummaryCard
                                    icon={<ClockIcon className="w-5 h-5 text-emerald-500" />}
                                    label="Toplam Talep" value={uniResult.phase3.total} color="gray"
                                />
                                <SummaryCard
                                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                                    label="Kalan Sorunlu" value={uniResult.phase3.with_issues} color={uniResult.phase3.with_issues > 0 ? 'amber' : 'green'}
                                />
                                <SummaryCard
                                    icon={<WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />}
                                    label="Duzeltilebilir" value={uniResult.phase3.fixable_remaining} color={uniResult.phase3.fixable_remaining > 0 ? 'red' : 'green'}
                                />
                            </div>
                            {uniResult.phase3.fixable_remaining === 0 && uniResult.phase3.with_issues === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-bold">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Tum denetimler basarili - sorun bulunamadi!
                                </div>
                            )}
                        </div>
                    )}

                    {/* Detayli Log Paneli */}
                    {showUniLog && uniLogText && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Detayli Hesaplama Denetim Logu</h4>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-[11px] leading-relaxed overflow-auto max-h-[600px] font-mono whitespace-pre-wrap">
                                {uniLogText}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ Tam Yeniden Hesaplama ══════ */}
            {frcLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        <ArrowPathIcon className="w-8 h-8 text-violet-500 animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">
                            Tam yeniden hesaplama yapiliyor (split + normal + OT + aylik)...
                        </p>
                        <p className="text-xs text-gray-400">Bu islem birkac dakika surebilir.</p>
                    </div>
                </div>
            )}

            {frcError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {frcError}
                </div>
            )}

            {frcResult && !frcLoading && (
                <div className="space-y-6 mt-6 border-t-2 border-violet-300 pt-6">
                    {/* Header + Apply Button */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <ArrowPathIcon className="w-6 h-6 text-violet-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Tam Yeniden Hesaplama Raporu
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {frcResult.date_range} | Mod: {frcResult.mode === 'dry_run' ? 'SIMULASYON' : 'UYGULANDI'} | Sure: {frcResult.elapsed}s
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {frcResult.mode === 'dry_run' && frcResult.summary?.total_employees_changed > 0 && (
                                <button
                                    onClick={() => runFullRecalculation('apply')}
                                    disabled={frcLoading}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg"
                                >
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    Onayla ve Uygula
                                </button>
                            )}
                            <button
                                onClick={downloadFrcLog}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-violet-700 bg-violet-50 border border-violet-300 hover:bg-violet-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                        {frcResult.mode === 'apply' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-bold">
                                <CheckCircleIcon className="w-5 h-5" />
                                Degisiklikler basariyla uygulandi!
                            </div>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard
                            icon={<MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />}
                            label="Taranan Calisan"
                            value={frcResult.summary?.total_employees_scanned || 0}
                            color="gray"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-5 h-5 text-violet-500" />}
                            label="Degisen Calisan"
                            value={frcResult.summary?.total_employees_changed || 0}
                            color={frcResult.summary?.total_employees_changed > 0 ? 'purple' : 'green'}
                        />
                        <SummaryCard
                            icon={<ClockIcon className="w-5 h-5 text-amber-500" />}
                            label="Degisen Gun"
                            value={frcResult.summary?.total_days_changed || 0}
                            color={frcResult.summary?.total_days_changed > 0 ? 'amber' : 'green'}
                        />
                        <SummaryCard
                            icon={<WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />}
                            label="Split Duzeltme"
                            value={frcResult.summary?.split_fixes || 0}
                            color={frcResult.summary?.split_fixes > 0 ? 'red' : 'green'}
                        />
                        {(frcResult.summary?.ghost_days || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-600" />}
                                label="Kayitsiz Gun"
                                value={frcResult.summary.ghost_days}
                                color="red"
                            />
                        )}
                        {(frcResult.summary?.balance_mismatches || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />}
                                label="Hedef Denge Hatasi"
                                value={frcResult.summary.balance_mismatches}
                                color="amber"
                            />
                        )}
                        {(frcResult.summary?.total_employees_with_issues || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-rose-600" />}
                                label="Sorunlu Calisan"
                                value={frcResult.summary.total_employees_with_issues}
                                color="red"
                            />
                        )}
                    </div>

                    {/* Global Diff Summary */}
                    {(frcResult.summary?.normal_diff || frcResult.summary?.ot_diff || frcResult.summary?.missing_diff) ? (
                        <div className="flex flex-wrap gap-4 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm">
                            <span className="font-bold text-violet-800">Toplam Fark:</span>
                            {frcResult.summary.normal_diff !== 0 && (
                                <span className={frcResult.summary.normal_diff > 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Normal: {frcResult.summary.normal_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.normal_diff))}
                                </span>
                            )}
                            {frcResult.summary.ot_diff !== 0 && (
                                <span className={frcResult.summary.ot_diff > 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Mesai: {frcResult.summary.ot_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.ot_diff))}
                                </span>
                            )}
                            {frcResult.summary.missing_diff !== 0 && (
                                <span className={frcResult.summary.missing_diff < 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Eksik: {frcResult.summary.missing_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.missing_diff))}
                                </span>
                            )}
                        </div>
                    ) : null}

                    {/* No changes */}
                    {frcResult.summary?.total_employees_changed === 0 && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-bold">
                            <CheckCircleIcon className="w-5 h-5" />
                            Tum hesaplamalar dogru — degisiklik gerekmiyor!
                        </div>
                    )}

                    {/* Employee List */}
                    {frcResult.employees?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-800">
                                Degisen Calisanlar ({frcResult.employees.length})
                            </h4>
                            {frcResult.employees.map((emp) => (
                                <div key={emp.id} className="border border-violet-200 rounded-xl overflow-hidden">
                                    {/* Employee Header */}
                                    <button
                                        onClick={() => toggleFrcEmp(emp.id)}
                                        className="w-full flex items-center justify-between p-3 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="font-bold text-violet-800">{emp.name}</span>
                                            <span className="text-gray-500">{emp.dept}</span>
                                            <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded-full text-[10px] font-bold">
                                                {emp.cd} gun degisti
                                            </span>
                                        </div>
                                        {frcExpandedEmps.has(emp.id) ?
                                            <ChevronUpIcon className="w-4 h-4 text-gray-400" /> :
                                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                        }
                                    </button>

                                    {/* Employee Detail */}
                                    {frcExpandedEmps.has(emp.id) && (
                                        <div className="p-4 space-y-4 bg-white">
                                            {/* Days */}
                                            {emp.days?.map((day) => {
                                                const dayKey = `${emp.id}-${day.date}`;
                                                return (
                                                    <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
                                                        {/* Day Header */}
                                                        <button
                                                            onClick={() => toggleFrcDay(dayKey)}
                                                            className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-bold text-gray-800">{day.date}</span>
                                                                <span className="text-gray-500">{day.wd}</span>
                                                                {day.rules?.off && (
                                                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-bold">TATIL</span>
                                                                )}
                                                                {day.rules?.hol && (
                                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">{day.rules.hol}</span>
                                                                )}
                                                                <span className="text-gray-400">|</span>
                                                                {day.ch?.map((c, ci) => (
                                                                    <span key={ci} className="text-gray-600">{c}</span>
                                                                ))}
                                                            </div>
                                                            {frcExpandedDays.has(dayKey) ?
                                                                <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" /> :
                                                                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                                                            }
                                                        </button>

                                                        {/* Day Detail */}
                                                        {frcExpandedDays.has(dayKey) && (
                                                            <div className="p-3 space-y-3 border-t border-gray-100">
                                                                {/* Rules */}
                                                                <div className="flex flex-wrap gap-3 text-[11px] text-gray-600 bg-slate-50 p-2 rounded">
                                                                    <span>Vardiya: {day.rules?.shift || '-'}</span>
                                                                    <span>Ogle: {day.rules?.lunch || '-'}</span>
                                                                    <span>Tolerans: {day.rules?.tol || 0}dk</span>
                                                                    <span>Mola: {day.rules?.brk || 0}dk</span>
                                                                </div>

                                                                {/* Requests */}
                                                                {day.reqs?.length > 0 && (
                                                                    <div>
                                                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Talepler</h6>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {day.reqs.map((r, ri) => (
                                                                                <span key={ri} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                    r.st === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                                    r.st === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                                    r.st === 'POTENTIAL' ? 'bg-blue-100 text-blue-700' :
                                                                                    r.st === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                    [{r.st}] {r.tp}{r.nm ? ` ${r.nm}` : ''} {r.s}-{r.e}
                                                                                    {r.d ? ` (${fmtSeconds(r.d)})` : ''}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Before / After Tables */}
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <FrcRecordTable title="ONCE" data={day.before} color="gray" />
                                                                    <FrcRecordTable title="SONRA" data={day.after} color="violet" />
                                                                </div>

                                                                {/* Changes */}
                                                                {day.ch?.length > 0 && (
                                                                    <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                                                                        <h6 className="text-[10px] font-bold text-amber-700 uppercase mb-1">Degisiklikler</h6>
                                                                        {day.ch.map((c, ci) => (
                                                                            <div key={ci} className="text-[11px] text-amber-800 font-mono">{c}</div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Monthly Summary Diff */}
                                            {emp.mb && emp.ma && (
                                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                    <h6 className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Aylik Ozet Degisiklikleri</h6>
                                                    {Object.keys({ ...emp.mb, ...emp.ma }).sort().map((key) => {
                                                        const b = emp.mb[key];
                                                        const a = emp.ma[key];
                                                        if (!b && !a) return null;
                                                        return (
                                                            <div key={key} className="mb-2">
                                                                <div className="text-xs font-bold text-indigo-800 mb-1">{key}</div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                                                    <FrcMonthlyField label="Tamamlanan" before={b?.cmp} after={a?.cmp} />
                                                                    <FrcMonthlyField label="Mesai" before={b?.ot} after={a?.ot} />
                                                                    <FrcMonthlyField label="Eksik" before={b?.mis} after={a?.mis} />
                                                                    <FrcMonthlyField label="Net Bakiye" before={b?.nb} after={a?.nb} />
                                                                    <FrcMonthlyField label="Toplam Is" before={b?.tw} after={a?.tw} />
                                                                    <FrcMonthlyField label="Kumulatif" before={b?.cum} after={a?.cum} />
                                                                    <FrcMonthlyField label="Izin" before={b?.lv} after={a?.lv} />
                                                                    <FrcMonthlyField label="Rapor" before={b?.hr} after={a?.hr} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }) {
    const colors = {
        green: 'bg-green-50 border-green-200',
        red: 'bg-red-50 border-red-200',
        amber: 'bg-amber-50 border-amber-200',
        gray: 'bg-gray-50 border-gray-200',
        purple: 'bg-purple-50 border-purple-200',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color] || colors.gray} flex items-center gap-3`}>
            {icon}
            <div>
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-[10px] text-gray-500 font-medium">{label}</div>
            </div>
        </div>
    );
}

function SnapshotBlock({ title, data, color }) {
    if (!data) return null;
    const borderColor = color === 'red' ? 'border-red-200' : color === 'green' ? 'border-green-200' : 'border-gray-200';
    const bgColor = color === 'red' ? 'bg-red-50' : color === 'green' ? 'bg-green-50' : 'bg-gray-50';
    return (
        <div className={`p-2 border ${borderColor} ${bgColor} rounded-lg`}>
            <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">{title}</h6>
            <div className="space-y-0.5 text-[11px]">
                <Row label="Normal" value={fmtSeconds(data.normal_seconds)} />
                <Row label="Hesap. OT" value={fmtSeconds(data.calculated_overtime_seconds)} />
                <Row label="Onayli OT" value={fmtSeconds(data.overtime_seconds)} />
                <Row label="Eksik" value={fmtSeconds(data.missing_seconds)} />
                <Row label="Toplam" value={fmtSeconds(data.total_seconds)} />
                <Row label="Mola" value={fmtSeconds(data.break_seconds)} />
                <Row label="Pot. Mola" value={fmtSeconds(data.potential_break_seconds)} />
                <Row label="Hastane" value={fmtSeconds(data.hospital_visit_seconds)} />
                <Row label="Durum" value={data.status || '-'} />
                <Row label="Kayit" value={data.record_count || 0} />
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
        </div>
    );
}

// ─── Full Recalculation Sub-components ──────────────────────────────────────

const SRC_COLORS = {
    CARD: 'bg-blue-100 text-blue-700',
    SPLIT: 'bg-orange-100 text-orange-700',
    AUTO_SPLIT: 'bg-amber-100 text-amber-700',
    DUTY: 'bg-green-100 text-green-700',
    MANUAL: 'bg-purple-100 text-purple-700',
    MANUAL_OT: 'bg-pink-100 text-pink-700',
    HEALTH_REPORT: 'bg-rose-100 text-rose-700',
    HOSPITAL_VISIT: 'bg-red-100 text-red-700',
    SYSTEM: 'bg-slate-100 text-slate-700',
    SPECIAL_LEAVE: 'bg-teal-100 text-teal-700',
};

function FrcRecordTable({ title, data, color }) {
    if (!data) return null;
    const borderCls = color === 'violet' ? 'border-violet-200' : 'border-gray-200';
    const bgCls = color === 'violet' ? 'bg-violet-50' : 'bg-gray-50';
    const titleCls = color === 'violet' ? 'text-violet-700' : 'text-gray-600';

    return (
        <div className={`border ${borderCls} ${bgCls} rounded-lg overflow-hidden`}>
            <div className={`px-2 py-1 text-[10px] font-bold uppercase ${titleCls} border-b ${borderCls}`}>
                {title} ({data.rc || 0} kayit)
            </div>
            {data.recs?.length > 0 ? (
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className={`border-b ${borderCls} text-left text-gray-500`}>
                            <th className="py-0.5 px-1">Giris</th>
                            <th className="py-0.5 px-1">Cikis</th>
                            <th className="py-0.5 px-1">Kaynak</th>
                            <th className="py-0.5 px-1 text-right">Normal</th>
                            <th className="py-0.5 px-1 text-right">Mesai</th>
                            <th className="py-0.5 px-1 text-right">Eksik</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recs.map((r, i) => (
                            <tr key={i} className={`border-b border-gray-100 ${r.ot ? 'bg-amber-50/50' : ''}`}>
                                <td className="py-0.5 px-1 font-mono">{r.ci || '-'}</td>
                                <td className="py-0.5 px-1 font-mono">{r.co || '-'}</td>
                                <td className="py-0.5 px-1">
                                    <span className={`px-1 py-0 rounded text-[8px] font-bold ${SRC_COLORS[r.src] || 'bg-gray-100 text-gray-700'}`}>
                                        {r.src}
                                    </span>
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.ns)}</td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.os)}</td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.ms)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-2 text-[10px] text-gray-400 italic">Kayit yok</div>
            )}
            <div className={`px-2 py-1 border-t ${borderCls} text-[10px] font-bold flex justify-between`}>
                <span>Normal: {fmtSeconds(data.tn)}</span>
                <span>Mesai: {fmtSeconds(data.to)}</span>
                <span>Eksik: {fmtSeconds(data.tm)}</span>
            </div>
        </div>
    );
}

function FrcMonthlyField({ label, before, after }) {
    const diff = (after || 0) - (before || 0);
    if (before === after || (!before && !after)) return null;
    return (
        <div className="flex flex-col">
            <span className="text-gray-500 text-[9px]">{label}</span>
            <div className="flex items-center gap-1">
                <span className="text-gray-600">{fmtSeconds(before || 0)}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="font-bold text-indigo-700">{fmtSeconds(after || 0)}</span>
                {diff !== 0 && (
                    <span className={`text-[9px] font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(diff))})
                    </span>
                )}
            </div>
        </div>
    );
}
