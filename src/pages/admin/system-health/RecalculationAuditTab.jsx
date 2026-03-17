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

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtSeconds(s) {
    if (!s || s <= 0) return '0 dk';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} sa`;
    return `${m} dk`;
}

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
                        Kart verilerini kullanarak tum gunleri yeniden hesaplar ve mevcut kayitlarla karsilastirir.
                        Denetim modunda veri degismez, duzeltme modunda tum farkliliklar kalici olarak duzeltilir.
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
                        onClick={runAudit}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            isProcessing ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                        }`}
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {loading ? 'Tarama yapiliyor...' : 'Denetimi Baslat'}
                    </button>
                    <button
                        onClick={runFix}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            isProcessing ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 active:scale-95'
                        }`}
                    >
                        <WrenchScrewdriverIcon className="w-4 h-4" />
                        {fixing ? 'Duzeltiliyor...' : 'Tum Farkliliklari Duzelt'}
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
                                                a.type === 'REJECTED_BUT_OT_EXISTS' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {a.type === 'MULTI_REQUEST' ? 'Coklu Talep' :
                                                 a.type === 'REJECTED_BUT_OT_EXISTS' ? 'Reddedilmis OT' :
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
                                                                    <span className="text-gray-500">{r.source_type || '-'}</span>
                                                                    <span className="font-mono text-gray-600">
                                                                        {r.start_time?.slice(0,5) || '-'} - {r.end_time?.slice(0,5) || '-'}
                                                                    </span>
                                                                    <span className="text-gray-400">{fmtSeconds(r.duration_seconds)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
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
