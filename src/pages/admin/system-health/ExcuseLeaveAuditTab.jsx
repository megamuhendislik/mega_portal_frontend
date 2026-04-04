import React, { useState, useCallback } from 'react';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ShieldCheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    WrenchScrewdriverIcon,
    ArrowDownTrayIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
};

export default function ExcuseLeaveAuditTab() {
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [dateFrom, setDateFrom] = useState(() => getIstanbulDateOffset(-90));
    const [dateTo, setDateTo] = useState(() => getIstanbulToday());
    const [employeeId, setEmployeeId] = useState('');

    const runAudit = useCallback(async (mode = 'scan') => {
        if (mode === 'fix') {
            const fixableCount = results?.issues?.filter(i => i.fixable).length || 0;
            if (!window.confirm(
                `DİKKAT: ${fixableCount} sorun otomatik düzeltilecek.\n\nDevam etmek istiyor musunuz?`
            )) return;
            setFixing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const body = {
                mode,
                categories: ['excuse_leave_integrity'],
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) body.employee_id = Number(employeeId);
            const res = await api.post('/system/health-check/data-integrity-audit/', body);
            const cat = res.data?.categories?.excuse_leave_integrity;
            setResults(cat || { count: 0, issues: [], fixed: 0, severity: 'HIGH' });
        } catch (err) {
            setError(err.response?.data?.error || 'Denetim çalıştırılamadı');
        } finally {
            setLoading(false);
            setFixing(false);
        }
    }, [dateFrom, dateTo, employeeId, results]);

    const downloadTxt = useCallback(async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            if (employeeId) params.set('employee_id', employeeId);
            const res = await api.get(`/system/health-check/data-integrity-audit-export/?${params.toString()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            a.download = `Mazeret_Izni_Denetim_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.response?.data?.error || 'TXT rapor indirilemedi');
        } finally {
            setExporting(false);
        }
    }, [dateFrom, dateTo, employeeId]);

    const issuesByType = results ? {
        daily_limit: results.issues?.filter(i => i.description?.includes('4.5 saat') && !i.description?.includes('Kümülatif')) || [],
        cumulative: results.issues?.filter(i => i.description?.includes('Kümülatif')) || [],
        missing_time: results.issues?.filter(i => i.description?.includes('saat bilgisi eksik')) || [],
        quota: results.issues?.filter(i => i.description?.includes('kota aşımı')) || [],
        mismatch: results.issues?.filter(i => i.description?.includes('tutarsızlığı')) || [],
    } : null;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-orange-500" />
                            Mazeret İzni Bütünlük Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Günlük 4.5 saat limiti, yıllık kota aşımı, saat tutarsızlığı ve eksik saat bilgisi kontrolü.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => runAudit('scan')}
                            disabled={loading || fixing}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
                            {loading ? 'Taranıyor...' : 'Tara'}
                        </button>
                        <button
                            onClick={() => runAudit('fix')}
                            disabled={loading || fixing || !results || results.count === 0}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {fixing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <WrenchScrewdriverIcon className="w-4 h-4" />}
                            Düzelt
                        </button>
                        <button
                            onClick={downloadTxt}
                            disabled={exporting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {exporting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
                            {exporting ? 'İndiriliyor...' : 'TXT İndir'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-500">Başlangıç:</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-500">Bitiş:</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-500">Çalışan ID:</label>
                        <input type="number" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Tümü" className="px-2 py-1 text-xs border border-gray-300 rounded-lg w-20" />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <SummaryCard label="Toplam Sorun" value={results.count} color={results.count > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'} />
                        <SummaryCard label="Günlük Limit İhlali" value={issuesByType.daily_limit.length} color="bg-red-50 border-red-200 text-red-700" />
                        <SummaryCard label="Kota Aşımı" value={issuesByType.quota.length} color="bg-amber-50 border-amber-200 text-amber-700" />
                        <SummaryCard label="Saat Tutarsızlığı" value={issuesByType.mismatch.length} color="bg-blue-50 border-blue-200 text-blue-700" />
                        <SummaryCard label="Düzeltilen" value={results.fixed || 0} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
                    </div>

                    {/* No issues */}
                    {results.count === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <p className="text-green-700 font-bold">Sorun bulunamadı</p>
                            <p className="text-green-600 text-xs mt-1">Mazeret izni kayıtları tutarlı.</p>
                        </div>
                    )}

                    {/* Issue Sections */}
                    {issuesByType.daily_limit.length > 0 && (
                        <IssueSection
                            title="Günlük 4.5 Saat Limiti İhlali"
                            severity="HIGH"
                            issues={issuesByType.daily_limit}
                        />
                    )}
                    {issuesByType.cumulative.length > 0 && (
                        <IssueSection
                            title="Kümülatif Günlük Limit Aşımı"
                            severity="HIGH"
                            issues={issuesByType.cumulative}
                        />
                    )}
                    {issuesByType.missing_time.length > 0 && (
                        <IssueSection
                            title="Saat Bilgisi Eksik"
                            severity="MEDIUM"
                            issues={issuesByType.missing_time}
                        />
                    )}
                    {issuesByType.quota.length > 0 && (
                        <IssueSection
                            title="Yıllık Kota Aşımı"
                            severity="HIGH"
                            issues={issuesByType.quota}
                        />
                    )}
                    {issuesByType.mismatch.length > 0 && (
                        <IssueSection
                            title="Saat Tutarsızlığı (Kayıtlı vs Hesaplanan)"
                            severity="MEDIUM"
                            issues={issuesByType.mismatch}
                        />
                    )}
                </div>
            )}

            {/* Initial State */}
            {!results && !loading && !error && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                    <ShieldCheckIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">Mazeret izni verilerini denetlemek için "Tara" butonuna tıklayın.</p>
                    <p className="text-xs mt-1">Günlük 4.5 saat limiti, yıllık kota ve saat tutarlılığı kontrol edilir.</p>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div className={`rounded-xl border p-3 ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-[10px] font-medium mt-0.5">{label}</div>
        </div>
    );
}

function IssueSection({ title, severity, issues }) {
    const [expanded, setExpanded] = useState(true);
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors}`}>
                        {severity === 'HIGH' ? 'Yüksek' : severity === 'MEDIUM' ? 'Orta' : 'Düşük'}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{title}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{issues.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {expanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {issues.map((issue, idx) => (
                        <div key={issue.id || idx} className="px-4 py-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-gray-700">{issue.employee_name}</span>
                                        <span className="text-[10px] text-gray-400">#{issue.employee_id}</span>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{issue.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{issue.description}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        → {issue.fixable ? '✅ Otomatik düzeltilebilir' : '⚠️ Manuel inceleme'}: {issue.fix_action}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
