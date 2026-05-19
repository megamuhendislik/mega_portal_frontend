import React, { useState, useMemo } from 'react';
import {
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    WrenchScrewdriverIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const CATEGORY_LABELS = {
    ot_overlap: 'OT Çakışma',
    attendance_recalc: 'Attendance Recalc',
    orphan_requests: 'Yetim Talepler',
    duration_mismatch: 'Süre Uyumsuzluğu',
    status_anomaly: 'Status Anomalisi',
    missing_attendance: 'Eksik Attendance',
    fiscal_integrity: 'Mali Bütünlük',
    timezone_diagnostics: 'Timezone',
    leave_ot_conflict: 'İzin/OT Çakışma',
    multiple_primary_managers: 'Çoklu PRIMARY',
    notification_gap: 'Bildirim Boşluğu',
    ot_card_verification: 'OT-Kart Doğrulama',
    leave_credit_mismatch: 'İzin Bakiye',
    excuse_leave_integrity: 'Mazeret Bütünlük',
    manual_ot_integrity: 'Manuel OT',
    external_duty_consistency: 'Dış Görev',
    ghost_split_records: 'Hayalî Split',
    duty_lunch_deduction: 'DUTY Öğle Düşümü',
};

const SEVERITY_STYLES = {
    HIGH: 'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
    LOW: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function IntegrityFindingsPanel({ findings, dateFrom, dateTo, employeeId }) {
    const [expanded, setExpanded] = useState({});
    const [busyKey, setBusyKey] = useState(null);
    const [localCategories, setLocalCategories] = useState(() => findings?.categories || {});

    // findings prop değişirse local state sync
    React.useEffect(() => {
        setLocalCategories(findings?.categories || {});
    }, [findings]);

    const visibleCategories = useMemo(() => {
        return Object.entries(localCategories)
            .filter((entry) => {
                const cat = entry[1];
                return (cat?.count || 0) > 0 || (cat?.issues?.length || 0) > 0;
            })
            .sort((entryA, entryB) => {
                const a = entryA[1];
                const b = entryB[1];
                const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                const sa = order[a?.severity] ?? 3;
                const sb = order[b?.severity] ?? 3;
                if (sa !== sb) return sa - sb;
                return (b?.count || 0) - (a?.count || 0);
            });
    }, [localCategories]);

    const totalIssues = useMemo(() => {
        return visibleCategories.reduce((s, entry) => s + (entry[1]?.count || 0), 0);
    }, [visibleCategories]);

    const removeIssueLocally = (category, issueId) => {
        setLocalCategories(prev => {
            const cat = prev[category];
            if (!cat) return prev;
            const newIssues = (cat.issues || []).filter(i => i.id !== issueId);
            return {
                ...prev,
                [category]: { ...cat, issues: newIssues, count: newIssues.length },
            };
        });
    };

    const handleFixCategory = async (category) => {
        const cat = localCategories[category];
        const fixableCount = (cat?.issues || []).filter(i => i.fixable).length;
        if (fixableCount === 0) {
            alert('Bu kategoride otomatik düzeltilebilir bulgu yok (manuel inceleme).');
            return;
        }
        if (!window.confirm(
            `Kategori toplu düzeltme:\n\n` +
            `${CATEGORY_LABELS[category] || category}\n` +
            `${fixableCount} bulgu otomatik düzeltilecek.\n\n` +
            `Devam edilsin mi?`
        )) return;

        const key = `${category}:CAT:fix`;
        setBusyKey(key);
        try {
            const body = {
                mode: 'fix',
                categories: [category],
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) body.employee_id = Number(employeeId);
            const res = await api.post('/system/health-check/data-integrity-audit/', body, {
                timeout: 600000,
            });
            // Düzeltmeden sonra yeni scan sonucunu local state'e işle
            const newCat = res.data?.categories?.[category];
            if (newCat) {
                setLocalCategories(prev => ({ ...prev, [category]: newCat }));
            } else {
                // Backend sonucu yoksa kategoriyi temizle (varsayım: hepsi fix edildi)
                setLocalCategories(prev => ({
                    ...prev,
                    [category]: { ...(prev[category] || {}), issues: [], count: 0 },
                }));
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Düzeltme başarısız');
        } finally {
            setBusyKey(null);
        }
    };

    const handleIgnore = async (category, issue) => {
        const reason = window.prompt(`Yoksay sebebi (opsiyonel):\n\nKayıt: ${issue.description?.slice(0, 200) || `#${issue.id}`}`);
        if (reason === null) return; // Cancel

        const key = `${category}:${issue.id}:ignore`;
        setBusyKey(key);
        try {
            await api.post('/system/health-check/audit-ignore/', {
                category, record_id: issue.id, reason: reason || '',
            });
            removeIssueLocally(category, issue.id);
        } catch (err) {
            alert(err.response?.data?.error || 'Yoksayma başarısız');
        } finally {
            setBusyKey(null);
        }
    };

    if (!findings || visibleCategories.length === 0) {
        return (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                <div>
                    <h4 className="text-sm font-bold text-emerald-900">Veri Bütünlüğü Temiz</h4>
                    <p className="text-xs text-emerald-700">
                        Ek tarama tamamlandı, herhangi bir bulgu yok.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 border-t-2 border-amber-200 pt-6 space-y-4">
            <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-6 h-6 text-amber-600" />
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800">
                        Veri Bütünlüğü Bulguları (Ek Tarama)
                    </h4>
                    <p className="text-[11px] text-gray-500">
                        TYR pipeline'ı dışında {totalIssues} bulgu — Düzelt veya Yoksay ile yönet
                    </p>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    {totalIssues} bulgu
                </span>
            </div>

            <div className="space-y-2">
                {visibleCategories.map(([catKey, cat]) => {
                    const isOpen = expanded[catKey];
                    const label = CATEGORY_LABELS[catKey] || catKey;
                    const sev = cat?.severity || 'LOW';
                    const issues = cat?.issues || [];
                    const fixableCount = issues.filter(i => i.fixable).length;
                    const fixCatBusy = busyKey === `${catKey}:CAT:fix`;
                    return (
                        <div key={catKey} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                                <button
                                    onClick={() => setExpanded(p => ({ ...p, [catKey]: !p[catKey] }))}
                                    className="flex items-center gap-2 flex-1 text-left hover:bg-gray-100 -mx-2 -my-1 px-2 py-1 rounded"
                                >
                                    {isOpen
                                        ? <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                        : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                                    <span className="text-sm font-semibold text-gray-800">
                                        {label}
                                    </span>
                                </button>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${SEVERITY_STYLES[sev]}`}>
                                    {sev}
                                </span>
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                                    {cat?.count || 0}
                                </span>
                                {fixableCount > 0 && (
                                    <button
                                        onClick={() => handleFixCategory(catKey)}
                                        disabled={fixCatBusy}
                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
                                        title="Bu kategorideki tüm otomatik düzeltilebilir bulguları onaylı toplu düzelt"
                                    >
                                        <WrenchScrewdriverIcon className="w-3 h-3" />
                                        {fixCatBusy ? '...' : `Düzelt (${fixableCount})`}
                                    </button>
                                )}
                            </div>

                            {isOpen && issues.length > 0 && (
                                <div className="divide-y divide-gray-100">
                                    {issues.slice(0, 50).map((issue) => {
                                        const ignoreKey = `${catKey}:${issue.id}:ignore`;
                                        const ignoreBusy = busyKey === ignoreKey;
                                        return (
                                            <div key={issue.id} className="px-4 py-3 hover:bg-amber-50">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-mono text-gray-500">
                                                                #{issue.id}
                                                            </span>
                                                            {issue.employee_name && (
                                                                <span className="text-xs font-semibold text-gray-700">
                                                                    {issue.employee_name}
                                                                </span>
                                                            )}
                                                            {issue.date && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {issue.date}
                                                                </span>
                                                            )}
                                                            {issue.fixable && (
                                                                <span className="text-[10px] text-emerald-600 font-semibold">
                                                                    OTO-FIX
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 leading-relaxed">
                                                            {issue.description}
                                                        </p>
                                                        {issue.fix_action && (
                                                            <p className="text-[11px] text-emerald-700 mt-1 italic">
                                                                → {issue.fix_action}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => handleIgnore(catKey, issue)}
                                                            disabled={ignoreBusy || fixCatBusy}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-gray-200 text-gray-700 text-[11px] font-semibold rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <EyeSlashIcon className="w-3 h-3" />
                                                            {ignoreBusy ? '...' : 'Yoksay'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {issues.length > 50 && (
                                        <div className="px-4 py-2 text-[11px] text-gray-500 text-center bg-gray-50">
                                            +{issues.length - 50} daha fazla bulgu (ilk 50 gösteriliyor)
                                        </div>
                                    )}
                                </div>
                            )}

                            {isOpen && issues.length === 0 && (
                                <div className="px-4 py-3 text-xs text-gray-400 italic">
                                    Detay bulgu yok (count sadece sayım)
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
