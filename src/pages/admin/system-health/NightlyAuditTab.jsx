import React, { useState, useEffect } from 'react';
import {
    ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon,
    XCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon,
    MagnifyingGlassIcon, WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import api from '../../../services/api';

const ACTION_STYLES = {
    FIXED: { bg: 'bg-green-50 border-green-200', badge: 'bg-green-600 text-white', label: 'DUZELTILDI' },
    FIX_FAILED: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-600 text-white', label: 'BASARISIZ' },
    FOUND: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-600 text-white', label: 'BULUNDU' },
    ERROR: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-600 text-white', label: 'HATA' },
    SUMMARY: { bg: 'bg-indigo-50 border-indigo-200', badge: 'bg-indigo-600 text-white', label: 'OZET' },
};

const AUDIT_LABELS = {
    REQUEST_LIFECYCLE: 'Talep Analizi',
    SPLIT_CHECK: 'Split Dogrulama',
    PDKS_VALIDATION: 'PDKS Dogrulama',
    MONTHLY_CASCADE: 'Aylik Cascade',
    NIGHTLY_SUMMARY: 'Gece Ozet',
};

const LEVEL_STYLES = {
    WARNING: 'bg-amber-100 text-amber-800',
    ERROR: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-purple-100 text-purple-800',
};

export default function NightlyAuditTab() {
    const [dateFrom, setDateFrom] = useState(getIstanbulDateOffset(-7));
    const [dateTo, setDateTo] = useState(getIstanbulToday());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [expandedDates, setExpandedDates] = useState(new Set());
    const [expandedEntries, setExpandedEntries] = useState(new Set());

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/nightly-audit-logs/', {
                params: { date_from: dateFrom, date_to: dateTo },
                timeout: 30000,
            });
            setData(res.data);
            // Auto-expand first date
            const groups = res.data?.groups || [];
            if (groups.length > 0) setExpandedDates(new Set([groups[0].date]));
        } catch (e) {
            console.error('Nightly audit fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const toggleDate = (date) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            next.has(date) ? next.delete(date) : next.add(date);
            return next;
        });
    };

    const toggleEntry = (id) => {
        setExpandedEntries(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const stats = data?.stats || {};
    const groups = data?.groups || [];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ClockIcon className="w-6 h-6 text-indigo-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Gece Denetim Loglari</h3>
                    <p className="text-xs text-gray-500">
                        Her gece 02:00'de calisan otomatik denetim. Sorunlari bulur, duzeltir ve loglar.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Baslangic</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bitis</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300" />
                </div>
                <button onClick={fetchLogs} disabled={loading}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                        loading ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    }`}>
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    {loading ? 'Yukleniyor...' : 'Loglari Getir'}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<ClockIcon className="w-5 h-5 text-indigo-500" />}
                    label="Toplam Calistirma" value={stats.total_runs || 0} color="gray" />
                <StatCard icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                    label="Bulunan Sorun" value={stats.total_found || 0} color={stats.total_found > 0 ? 'amber' : 'green'} />
                <StatCard icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />}
                    label="Duzeltilen" value={stats.total_fixed || 0} color="green" />
                <StatCard icon={<XCircleIcon className="w-5 h-5 text-red-500" />}
                    label="Hata / Basarisiz" value={stats.total_errors || 0} color={stats.total_errors > 0 ? 'red' : 'green'} />
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="ml-3 text-sm text-gray-500">Loglar yukleniyor...</span>
                </div>
            )}

            {/* Empty State */}
            {!loading && groups.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Bu tarih araliginda gece denetim logu bulunamadi.</p>
                </div>
            )}

            {/* Date Groups */}
            {!loading && groups.map(group => {
                const isExpanded = expandedDates.has(group.date);
                const foundCount = (group.entries || []).filter(e => e.action === 'FOUND').length;
                const fixedCount = (group.entries || []).filter(e => e.action === 'FIXED').length;
                const errorCount = (group.entries || []).filter(e => e.action === 'ERROR' || e.action === 'FIX_FAILED').length;
                const summary = group.summary || {};

                return (
                    <div key={group.date} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Date Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all"
                            onClick={() => toggleDate(group.date)}>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-800">{group.date}</span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                                    {group.entry_count} log
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {foundCount > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                                        {foundCount} bulundu
                                    </span>
                                )}
                                {fixedCount > 0 && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
                                        {fixedCount} duzeltildi
                                    </span>
                                )}
                                {errorCount > 0 && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                        {errorCount} hata
                                    </span>
                                )}
                                {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="p-4 space-y-3">
                                {/* Night Summary */}
                                {Object.keys(summary).length > 0 && (
                                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                        <p className="text-xs font-bold text-indigo-700 mb-2">Gece Calistirma Ozeti</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <div className="p-2 bg-white rounded border">
                                                <span className="text-gray-500 block">Talep Sorun</span>
                                                <span className="font-bold">{summary.phase1_found || 0} bulundu / <span className="text-green-600">{summary.phase1_fixed || 0} fix</span></span>
                                            </div>
                                            <div className="p-2 bg-white rounded border">
                                                <span className="text-gray-500 block">Split Sorun</span>
                                                <span className="font-bold">{summary.split_found || 0} bulundu / <span className="text-green-600">{summary.split_fixed || 0} fix</span></span>
                                            </div>
                                            <div className="p-2 bg-white rounded border">
                                                <span className="text-gray-500 block">PDKS</span>
                                                <span className="font-bold">{summary.pdks_issues || 0} uyumsuzluk</span>
                                            </div>
                                            <div className="p-2 bg-white rounded border">
                                                <span className="text-gray-500 block">Aylik Cascade</span>
                                                <span className="font-bold">{summary.cascade_count || 0} guncelleme</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Log Entries */}
                                <div className="space-y-2">
                                    {(group.entries || []).filter(e => e.action !== 'SUMMARY').map((entry, idx) => {
                                        const actionStyle = ACTION_STYLES[entry.action] || ACTION_STYLES.FOUND;
                                        const levelStyle = LEVEL_STYLES[entry.level] || 'bg-gray-100 text-gray-700';
                                        const auditLabel = AUDIT_LABELS[entry.audit_type] || entry.audit_type || '-';
                                        const entryKey = `${group.date}-${idx}`;
                                        const isEntryExpanded = expandedEntries.has(entryKey);

                                        return (
                                            <div key={entryKey}
                                                className={`rounded-lg border ${actionStyle.bg} transition-all`}>
                                                {/* Entry Header */}
                                                <div className="flex items-start gap-2 p-3 cursor-pointer"
                                                    onClick={() => toggleEntry(entryKey)}>
                                                    <span className="text-[10px] text-gray-400 font-mono min-w-[45px] mt-0.5">{entry.time || '-'}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${actionStyle.badge}`}>{actionStyle.label}</span>
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700">{auditLabel}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${levelStyle}`}>{entry.level}</span>
                                                    {entry.employee_name && (
                                                        <span className="text-xs font-bold text-gray-800">{entry.employee_name}</span>
                                                    )}
                                                    {entry.issue_code && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">{entry.issue_code}</span>
                                                    )}
                                                    {entry.date && (
                                                        <span className="text-[10px] text-gray-500 font-mono">[{entry.date}]</span>
                                                    )}
                                                    <span className="text-xs text-gray-600 flex-1 truncate">
                                                        {(entry.message || '').replace(/\[Gece Denetim\]\s*/, '').replace(/\[Gece Autofix\]\s*/, '').substring(0, 100)}
                                                    </span>
                                                    {isEntryExpanded ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                                </div>

                                                {/* Entry Detail */}
                                                {isEntryExpanded && (
                                                    <div className="px-4 pb-3 border-t border-gray-100 space-y-2">
                                                        <div className="text-xs bg-white p-3 rounded border font-mono whitespace-pre-wrap text-gray-700">
                                                            {entry.message}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                                                            {entry.employee_name && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Calisan</span>
                                                                    <span className="font-bold">{entry.employee_name}</span>
                                                                </div>
                                                            )}
                                                            {entry.date && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Tarih</span>
                                                                    <span className="font-bold">{entry.date}</span>
                                                                </div>
                                                            )}
                                                            {entry.issue_code && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Sorun Kodu</span>
                                                                    <span className="font-bold">{entry.issue_code}</span>
                                                                </div>
                                                            )}
                                                            {entry.request_id && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Talep ID</span>
                                                                    <span className="font-bold">#{entry.request_id}</span>
                                                                </div>
                                                            )}
                                                            {entry.match && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Uyum</span>
                                                                    <span className="font-bold">{entry.match}</span>
                                                                </div>
                                                            )}
                                                            {entry.audit_type && (
                                                                <div className="p-1.5 bg-white rounded border">
                                                                    <span className="text-gray-400 block">Denetim Turu</span>
                                                                    <span className="font-bold">{auditLabel}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function StatCard({ icon, label, value, color = 'gray' }) {
    const colors = {
        green: 'bg-green-50 border-green-200',
        amber: 'bg-amber-50 border-amber-200',
        red: 'bg-red-50 border-red-200',
        gray: 'bg-gray-50 border-gray-200',
    };
    return (
        <div className={`p-3 rounded-xl border ${colors[color] || colors.gray} flex items-center gap-2`}>
            {icon}
            <div>
                <div className="text-xl font-bold text-gray-800">{value}</div>
                <div className="text-[10px] text-gray-500 font-medium">{label}</div>
            </div>
        </div>
    );
}
