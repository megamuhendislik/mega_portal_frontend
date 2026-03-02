import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ShieldCheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    ClockIcon,
    DocumentMagnifyingGlassIcon,
    XMarkIcon,
    QueueListIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
    ot_overlap: 'OT Cakismasi',
    attendance_recalc: 'Mesai Yeniden Hesaplama',
    orphan_requests: 'Sahipsiz Talepler',
    duration_mismatch: 'Sure Uyumsuzlugu',
    status_anomaly: 'Durum Anomalisi',
    missing_attendance: 'Eksik Mesai Kaydi',
    fiscal_integrity: 'Mali Donem Butunlugu',
    timezone_diagnostics: 'Saat Dilimi Tanilama',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
};

const SEVERITY_LABELS = {
    HIGH: 'Yuksek',
    MEDIUM: 'Orta',
    LOW: 'Dusuk',
};

function useBodyScrollLock(active) {
    useEffect(() => {
        if (!active) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [active]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDateFrom() {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
}

function getDefaultDateTo() {
    return new Date().toISOString().split('T')[0];
}

const SeverityBadge = ({ severity }) => {
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    const label = SEVERITY_LABELS[severity] || severity;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors}`}>
            {label}
        </span>
    );
};

const StatCard = ({ label, value, color, sub }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        {sub && <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>}
    </div>
);

const ActionBadge = ({ fixAction, fixable, mode }) => {
    if (mode === 'fix' && fixable) {
        return (
            <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                    Duzeltildi
                </span>
                {fixAction && (
                    <div className="text-[10px] text-green-600 mt-0.5">{fixAction}</div>
                )}
            </div>
        );
    }
    return (
        <div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                fixable
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
                {fixable ? 'Duzelt. (fix mod)' : 'Manuel Inceleme'}
            </span>
            {fixAction && (
                <div className="text-[10px] text-gray-400 mt-0.5">{fixAction}</div>
            )}
        </div>
    );
};

// ─── Shared Log Renderers ───────────────────────────────────────────────────

const Section = ({ title, children }) => (
    <div className="mb-4">
        <h4 className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-t-lg border border-gray-200">{title}</h4>
        <div className="border border-t-0 border-gray-200 rounded-b-lg p-3 bg-white text-xs">{children}</div>
    </div>
);

const KV = ({ k, v, warn }) => (
    <div className="flex gap-2 py-0.5">
        <span className="text-gray-500 font-medium min-w-[140px]">{k}:</span>
        <span className={warn ? 'text-red-600 font-bold' : 'text-gray-800 font-mono'}>{String(v ?? '-')}</span>
    </div>
);

const LogContent = ({ log }) => {
    if (log.error) {
        return <div className="text-red-600 text-xs p-3">Hata: {log.error}</div>;
    }
    const { day_rules, gate_events, attendance_records, ot_requests, analysis } = log;
    return (
        <div className="space-y-1">
            <Section title="Analiz Sonucu">
                {(analysis || []).map((a, i) => (
                    <div key={i} className={`py-1 ${a.startsWith('\u26A0') ? 'text-red-700 font-bold' : a.startsWith('\u2713') ? 'text-green-700' : 'text-gray-800'}`}>{a}</div>
                ))}
            </Section>

            <Section title="Gun Kurallari">
                {day_rules && Object.entries(day_rules).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            </Section>

            <Section title={`Kapi Gecis Kayitlari (${log.gate_event_count || 0})`}>
                {gate_events && gate_events.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead><tr className="border-b bg-gray-50">
                                <th className="text-left py-1 px-2 font-bold">ID</th>
                                <th className="text-left py-1 px-2 font-bold">UTC</th>
                                <th className="text-left py-1 px-2 font-bold">Istanbul</th>
                                <th className="text-left py-1 px-2 font-bold">Yon</th>
                                <th className="text-left py-1 px-2 font-bold">Kapi</th>
                            </tr></thead>
                            <tbody>{gate_events.map((ge, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="py-1 px-2 font-mono">{ge.id || ge.event_id}</td>
                                    <td className="py-1 px-2 font-mono">{ge.timestamp_utc}</td>
                                    <td className="py-1 px-2 font-mono font-bold">{ge.timestamp_istanbul}</td>
                                    <td className="py-1 px-2">{ge.direction}</td>
                                    <td className="py-1 px-2">{ge.gate_name}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : <span className="text-gray-400">Kayit yok</span>}
            </Section>

            <Section title={`Mesai Kayitlari (${log.attendance_count || 0})`}>
                {attendance_records && attendance_records.length > 0 ? attendance_records.map((att, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50/50">
                        <div className="font-bold text-gray-700 mb-1">Attendance #{att.att_id} — {att.status} ({att.source})</div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <KV k="Giris (UTC)" v={att.check_in_utc} />
                            <KV k="Giris (Istanbul)" v={att.check_in_istanbul} />
                            <KV k="Cikis (UTC)" v={att.check_out_utc} />
                            <KV k="Cikis (Istanbul)" v={att.check_out_istanbul} />
                            <KV k="Ham sure" v={`${att.raw_minutes} dk`} />
                            <KV k="Ogle dususu" v={`${att.lunch_overlap_minutes} dk`} />
                            <KV k="Duzeltilmis ham" v={`${att.adjusted_raw_minutes} dk`} />
                            <KV k="Kayitli toplam" v={`${att.total_minutes} dk`} warn={Math.abs(att.adjusted_raw_minutes - att.total_minutes) > 35} />
                            <KV k="Normal" v={`${att.normal_minutes} dk`} />
                            <KV k="Fazla mesai" v={`${att.overtime_minutes} dk`} />
                            <KV k="Mola" v={att.break_seconds != null ? `${Math.round(att.break_seconds/60)} dk` : '-'} />
                            <KV k="Potansiyel mola" v={att.potential_break_seconds != null ? `${Math.round(att.potential_break_seconds/60)} dk` : '-'} />
                            <KV k="Kilitli" v={att.is_locked ? 'Evet' : 'Hayir'} />
                            <KV k="Olusturulma" v={att.created_at} />
                        </div>
                    </div>
                )) : <span className="text-gray-400">Kayit yok</span>}
            </Section>

            <Section title={`Ek Mesai Talepleri (${log.ot_count || 0})`}>
                {ot_requests && ot_requests.length > 0 ? ot_requests.map((ot, i) => (
                    <div key={i} className={`border rounded-lg p-3 mb-2 ${
                        ot.status === 'POTENTIAL' ? 'border-amber-300 bg-amber-50/50' :
                        ot.status === 'PENDING' ? 'border-blue-300 bg-blue-50/50' :
                        ot.status === 'APPROVED' ? 'border-green-300 bg-green-50/50' :
                        'border-gray-200 bg-gray-50/50'
                    }`}>
                        <div className="font-bold text-gray-700 mb-1">
                            OT #{ot.ot_id} — {ot.status} ({ot.source_type})
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <KV k="Baslangic" v={ot.start_time} />
                            <KV k="Bitis" v={ot.end_time} />
                            <KV k="Ham aralik" v={`${ot.raw_span_minutes} dk`} />
                            <KV k="Kayitli sure" v={`${ot.duration_minutes} dk`} />
                            <KV k="Aralik-Sure farki" v={`${ot.span_vs_duration_diff_min} dk`} warn={ot.span_vs_duration_diff_min > 5} />
                            <KV k="Sebep" v={ot.reason} />
                            <KV k="Manuel" v={ot.is_manual ? 'Evet' : 'Hayir'} />
                            <KV k="Atama ID" v={ot.assignment_id} />
                            <KV k="Attendance ID" v={ot.attendance_id} />
                            <KV k="Onaylayan" v={ot.target_approver} />
                            <KV k="Onayci Yonetici" v={ot.approval_manager} />
                            <KV k="Onay Tarihi" v={ot.approval_date} />
                            <KV k="Olusturulma" v={ot.created_at} />
                            <KV k="Guncelleme" v={ot.updated_at} />
                            {ot.segments && ot.segments.length > 0 && (
                                <div className="col-span-2">
                                    <span className="text-gray-500 font-medium">Segmentler: </span>
                                    <span className="font-mono">{ot.segments.map(s => `${s.start}-${s.end}`).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )) : <span className="text-gray-400">Kayit yok</span>}
            </Section>
        </div>
    );
};

// ─── Detail Log Modal (single or bulk) ──────────────────────────────────────

const DetailLogModal = ({ data, logs, onClose }) => {
    const [activeTab, setActiveTab] = useState(0);
    useBodyScrollLock(true);

    const isBulk = Array.isArray(logs) && logs.length > 0;
    const items = isBulk ? logs : (data ? [data] : []);

    if (items.length === 0) return null;

    const current = items[activeTab] || items[0];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-gray-50 shadow-2xl w-full max-w-5xl mx-4 my-6 rounded-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <DocumentMagnifyingGlassIcon className="w-4 h-4 text-indigo-600" />
                            {isBulk ? `Toplu Detay Logu (${items.length} kayit)` : 'Detay Logu'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {current.employee_name} (ID: {current.employee_id}) — {current.date}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs (bulk mode) */}
                {isBulk && items.length > 1 && (
                    <div className="border-b border-gray-200 bg-white px-5 py-2 shrink-0 overflow-x-auto">
                        <div className="flex gap-1.5">
                            {items.map((item, i) => {
                                const hasWarning = (item.analysis || []).some(a => typeof a === 'string' && a.startsWith('\u26A0'));
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTab(i)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                            activeTab === i
                                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {hasWarning && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                                        <span>{item.employee_name}</span>
                                        <span className="text-[10px] opacity-60">{item.date}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    <LogContent log={current} />
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Fix Report Modal ────────────────────────────────────────────────────────

const FixReportModal = ({ results, onClose }) => {
    useBodyScrollLock(true);

    if (!results || results.mode !== 'fix') return null;

    const actionLog = results.action_log || [];
    const totalFixed = Object.values(results.categories || {}).reduce((s, c) => s + (c.fixed || 0), 0);
    const totalIssues = results.total_issues || 0;

    // Group actions by category
    const grouped = {};
    for (const entry of actionLog) {
        const cat = entry.category || 'diger';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(entry);
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-gray-50 shadow-2xl w-full max-w-4xl mx-4 my-6 rounded-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />
                            Duzeltme Raporu
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {totalIssues} sorun bulundu, {totalFixed} duzeltildi
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Summary Bar */}
                <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs text-gray-600">Sorun: <strong>{totalIssues}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-gray-600">Duzeltilen: <strong>{totalFixed}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-gray-600">Manuel: <strong>{totalIssues - totalFixed}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600">{results.elapsed_seconds}s</span>
                        </div>
                    </div>
                </div>

                {/* Action Log */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    {actionLog.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Duzeltme yapilmadi (tum sorunlar manuel inceleme gerektiriyor)</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(grouped).map(([cat, actions]) => (
                                <div key={cat}>
                                    <h4 className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-t-lg border border-gray-200 flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">
                                            {actions.length}
                                        </span>
                                        {CATEGORY_LABELS[cat] || cat}
                                    </h4>
                                    <div className="border border-t-0 border-gray-200 rounded-b-lg bg-white divide-y divide-gray-100">
                                        {actions.map((a, i) => (
                                            <div key={i} className="px-3 py-2 text-xs flex items-start gap-3">
                                                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[9px] font-bold">
                                                    ✓
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-800">{a.detail}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                                                        <span>{a.employee_name}</span>
                                                        <span className="font-mono">{a.date}</span>
                                                        <span className="font-mono text-gray-300">{a.target}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Category Card ──────────────────────────────────────────────────────────

const CategoryCard = ({ categoryKey, categoryData, auditMode, onDetailLog, onFixCategory, fixLoading }) => {
    const [expanded, setExpanded] = useState(false);
    const label = CATEGORY_LABELS[categoryKey] || categoryKey;
    const { severity, count, fixed, issues } = categoryData;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <SeverityBadge severity={severity} />
                    <span className="text-sm font-bold text-gray-800">{label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {count} sorun
                    </span>
                    {fixed > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                            {fixed} duzeltildi
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                )}
            </button>
            {expanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    {categoryData.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-700">
                            <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                            Hata: {categoryData.error}
                        </div>
                    )}
                    {issues && issues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-8">
                                            #
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Calisan
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Tarih
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '320px'}}>
                                            Sorun Detayi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '180px'}}>
                                            Duzeltme Islemi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">
                                            Kayit ID
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-12">
                                            Log
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map((issue, idx) => (
                                        <tr
                                            key={idx}
                                            className={`border-b border-gray-100 hover:bg-blue-50/30 ${
                                                issue.fixable === false ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">
                                                    {issue.employee_name}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    ID: {issue.employee_id}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {issue.date || '-'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700">
                                                <div className="text-xs leading-relaxed">
                                                    {issue.description || issue.detail || '-'}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <ActionBadge
                                                    fixAction={issue.fix_action}
                                                    fixable={issue.fixable}
                                                    mode={auditMode}
                                                />
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {issue.id || '-'}
                                            </td>
                                            <td className="py-2.5 px-2">
                                                {issue.employee_id && issue.date && (
                                                    <button
                                                        onClick={() => onDetailLog?.(issue.employee_id, issue.date)}
                                                        className="p-1 hover:bg-indigo-100 rounded-lg transition-colors"
                                                        title="Detay Logu"
                                                    >
                                                        <DocumentMagnifyingGlassIcon className="w-4 h-4 text-indigo-500" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">Bu kategoride sorun yok.</p>
                    )}
                    {auditMode !== 'fix' && categoryData.issues?.some(i => i.fixable) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => onFixCategory?.(categoryKey)}
                                disabled={fixLoading}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                            >
                                {fixLoading ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                )}
                                Bu Kategoriyi Duzelt
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DataIntegrityAuditTab() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [detailLog, setDetailLog] = useState(null);    // single log
    const [bulkLogs, setBulkLogs] = useState(null);      // array of logs
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [fixReport, setFixReport] = useState(null);
    const [fixLoading, setFixLoading] = useState(false);

    // Filters
    const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
    const [dateTo, setDateTo] = useState(getDefaultDateTo);
    const [employeeId, setEmployeeId] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORIES]);

    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const selectAllCategories = () => setSelectedCategories([...ALL_CATEGORIES]);
    const clearAllCategories = () => setSelectedCategories([]);

    const runAudit = async (mode) => {
        if (mode === 'fix') {
            const fixableCount = results
                ? Object.values(results.categories || {}).reduce(
                    (s, c) => s + (c.issues || []).filter(i => i.fixable).length, 0
                ) : 0;
            if (!window.confirm(
                `DIKKAT: Bu islem veritabanindaki verileri degistirecektir.\n\n` +
                `${fixableCount > 0 ? fixableCount + ' sorun otomatik duzeltilecek.' : 'Duzeltme modu calistirilacak.'}\n\n` +
                `Devam etmek istiyor musunuz?`
            )) return;
        }

        if (selectedCategories.length === 0) {
            setError('En az bir kategori secmelisiniz.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const body = {
                mode,
                categories: selectedCategories,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) {
                body.employee_id = Number(employeeId);
            }
            const res = await api.post('/system/health-check/data-integrity-audit/', body);
            setResults(res.data);
            if (mode === 'fix') {
                setFixReport(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Denetim calistirilamadi');
        } finally {
            setLoading(false);
        }
    };

    // Single log fetch
    const fetchDetailLog = useCallback(async (empId, date) => {
        setLoadingDetail(true);
        try {
            const res = await api.post('/system/health-check/data-integrity-detail-log/', {
                employee_id: empId,
                date: date,
            });
            setDetailLog(res.data);
            setBulkLogs(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Detay logu alinamadi');
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    // Bulk log fetch — all issues at once
    const fetchAllLogs = useCallback(async () => {
        if (!results) return;
        const allIssues = [];
        for (const [, catData] of Object.entries(results.categories || {})) {
            if (catData.issues) {
                for (const issue of catData.issues) {
                    if (issue.employee_id && issue.date) {
                        allIssues.push({ employee_id: issue.employee_id, date: issue.date });
                    }
                }
            }
        }
        if (allIssues.length === 0) {
            setError('Loglanacak sorun bulunamadi.');
            return;
        }
        setLoadingDetail(true);
        try {
            const res = await api.post('/system/health-check/data-integrity-detail-log/', {
                items: allIssues,
            });
            setBulkLogs(res.data.logs || []);
            setDetailLog(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Toplu detay logu alinamadi');
        } finally {
            setLoadingDetail(false);
        }
    }, [results]);

    const fixCategory = useCallback(async (categoryKey) => {
        const catData = results?.categories?.[categoryKey];
        const fixableCount = (catData?.issues || []).filter(i => i.fixable).length;
        if (!window.confirm(
            `"${CATEGORY_LABELS[categoryKey] || categoryKey}" kategorisindeki ` +
            `${fixableCount} sorun duzeltilecek.\n\nDevam?`
        )) return;

        setFixLoading(true);
        setError(null);
        try {
            const body = {
                mode: 'fix',
                categories: [categoryKey],
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) body.employee_id = Number(employeeId);
            const res = await api.post('/system/health-check/data-integrity-audit/', body);
            setFixReport(res.data);
            // Re-scan to refresh results
            const scanBody = {
                mode: 'scan',
                categories: selectedCategories,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) scanBody.employee_id = Number(employeeId);
            const scanRes = await api.post('/system/health-check/data-integrity-audit/', scanBody);
            setResults(scanRes.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Duzeltme basarisiz');
        } finally {
            setFixLoading(false);
        }
    }, [results, dateFrom, dateTo, employeeId, selectedCategories]);

    const closeModal = useCallback(() => {
        setDetailLog(null);
        setBulkLogs(null);
    }, []);

    const totalFixed = results
        ? Object.values(results.categories || {}).reduce((sum, cat) => sum + (cat.fixed || 0), 0)
        : 0;

    const categoriesWithIssues = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count > 0)
        : [];

    const categoriesClean = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count === 0)
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                            Veri Butunlugu Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Veritabanindaki tutarsizliklari, cakismalari ve anomalileri tespit eder. Duzeltme modu ile otomatik onarim yapilabilir.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Baslangic</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitis</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Calisan ID (opsiyonel)</label>
                        <input
                            type="number"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Bos = Tumu"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => runAudit('scan')}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            )}
                            {loading ? 'Taraniyor...' : 'Tara'}
                        </button>
                        <button
                            onClick={() => runAudit('fix')}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <WrenchScrewdriverIcon className="w-4 h-4" />
                            )}
                            Duzelt
                        </button>
                    </div>
                </div>

                {/* Category Selection */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">Kategoriler:</span>
                        <button
                            onClick={selectAllCategories}
                            className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                            Tumunu Sec
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            onClick={clearAllCategories}
                            className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                            Temizle
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_CATEGORIES.map((cat) => (
                            <label
                                key={cat}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                                    selectedCategories.includes(cat)
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-500'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => toggleCategory(cat)}
                                    className="w-3 h-3 text-indigo-600 rounded"
                                />
                                {CATEGORY_LABELS[cat]}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Results */}
            {results && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <StatCard
                            label="Toplam Sorun"
                            value={results.total_issues || 0}
                            color={
                                results.total_issues > 0
                                    ? 'bg-red-50 border-red-100 text-red-700'
                                    : 'bg-green-50 border-green-100 text-green-700'
                            }
                            sub={results.total_issues > 0 ? `${categoriesWithIssues.length} kategoride` : 'Temiz'}
                        />
                        <StatCard
                            label="Otomatik Duzelt."
                            value={results.summary?.fixable || 0}
                            color="bg-amber-50 border-amber-100 text-amber-700"
                            sub="fix modu ile duzeltilir"
                        />
                        <StatCard
                            label="Manuel Inceleme"
                            value={results.summary?.manual_review || 0}
                            color="bg-slate-50 border-slate-100 text-slate-700"
                            sub="elle kontrol gerekir"
                        />
                        <StatCard
                            label="Duzeltilen"
                            value={totalFixed}
                            color={totalFixed > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}
                            sub={results.mode === 'fix' ? 'bu calistirmada' : 'tarama modu'}
                        />
                        <StatCard
                            label="Gecen Sure"
                            value={`${(results.elapsed_seconds || 0).toFixed(2)}s`}
                            color="bg-blue-50 border-blue-100 text-blue-700"
                            sub={results.summary?.date_range ? `${results.summary.date_range.start} ~ ${results.summary.date_range.end}` : ''}
                        />
                        <StatCard
                            label="Mod"
                            value={results.mode === 'fix' ? 'Duzeltme' : 'Tarama'}
                            color={
                                results.mode === 'fix'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            }
                            sub={`${Object.keys(results.categories || {}).length} kategori tarandi`}
                        />
                    </div>

                    {/* Categories with Issues */}
                    {categoriesWithIssues.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                                    Sorun Bulunan Kategoriler ({categoriesWithIssues.length})
                                </h3>
                                <button
                                    onClick={fetchAllLogs}
                                    disabled={loadingDetail}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                                >
                                    {loadingDetail ? (
                                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <QueueListIcon className="w-3.5 h-3.5" />
                                    )}
                                    Tum Loglari Goster
                                </button>
                            </div>
                            {categoriesWithIssues
                                .sort(
                                    (a, b) =>
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a[1].severity] || 3) -
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b[1].severity] || 3)
                                )
                                .map(([key, data]) => (
                                    <CategoryCard key={key} categoryKey={key} categoryData={data} auditMode={results.mode} onDetailLog={fetchDetailLog} onFixCategory={fixCategory} fixLoading={fixLoading} />
                                ))}
                        </div>
                    )}

                    {/* Clean Categories */}
                    {categoriesClean.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                Temiz Kategoriler ({categoriesClean.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {categoriesClean.map(([key]) => (
                                    <span
                                        key={key}
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                                    >
                                        {CATEGORY_LABELS[key] || key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All clean */}
                    {results.total_issues === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-green-700">Sorun Bulunamadi</h3>
                            <p className="text-xs text-green-600 mt-1">
                                Taranan tum kategorilerde veri butunlugu saglanmis.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Detail Log Modal (single or bulk) */}
            {(detailLog || bulkLogs) && (
                <DetailLogModal data={detailLog} logs={bulkLogs} onClose={closeModal} />
            )}

            {fixReport && (
                <FixReportModal results={fixReport} onClose={() => setFixReport(null)} />
            )}

            {/* Loading overlay */}
            {loadingDetail && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
                        <ArrowPathIcon className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-sm font-bold text-gray-700">Detay logu yukleniyor...</span>
                    </div>
                </div>,
                document.body
            )}

            {/* Empty state */}
            {!results && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ShieldCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Denetim Baslatilmadi</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        "Tara" butonuna tiklayarak veri butunlugu denetimini baslatin. Sorunlari otomatik onarmak icin "Duzelt" kullanin.
                    </p>
                </div>
            )}
        </div>
    );
}
