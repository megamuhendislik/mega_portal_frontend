import React, { useState, useCallback, useEffect } from 'react';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import ModalOverlay from '../../../components/ui/ModalOverlay';
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
    ArrowDownTrayIcon,
    NoSymbolIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Constants ──────────────────────────────────────────────────────────────

// Son oturumda eklenen / düzeltilen audit kategorileri. Tarama sonrası bu
// kategorilerin güncel sayıları "Son Düzeltmeler" panelinde gösterilir;
// bu sayede deploy sonrası fix'in etkili olup olmadığı tek bakışta görünür.
const RECENT_FIXES = [
    {
        id: 'fix-1-external-duty',
        title: 'Dış Görev Edit (LR#484 Bahar)',
        commit: '6b1944c',
        date: '2026-05-16',
        category: 'external_duty_consistency',
        summary: 'partial_update date_segments zorunlu kılındı; eski 4 kayıt manuel inceleme bekliyor.',
    },
    {
        id: 'fix-2-notif-gap',
        title: 'Bildirim Boşluğu (LR title false positive)',
        commit: 'ccd7ff2',
        date: '2026-05-16',
        category: 'notification_gap',
        summary: 'Audit "Yeni İzin Talebi" başlığını da tanıyor; 31 sahte LR flag\'i kalkmalı.',
    },
    {
        id: 'fix-3-zero-segment',
        title: 'OT Sıfır-Süre Segment (Füsun #439095)',
        commit: '9428481',
        date: '2026-05-16',
        category: 'ot_overlap',
        summary: 'claim_potential 0-süre segment artık 1440dk ghost POTENTIAL üretmiyor.',
    },
    {
        id: 'fix-4-duration-mismatch',
        title: 'Duration Mismatch Multi-Segment',
        commit: '87ea9d8',
        date: '2026-05-16',
        category: 'duration_mismatch',
        summary: 'Audit segments toplamını kullanıyor; Hacı/Yusuf/Taylan 5 false positive temizlenir.',
    },
    {
        id: 'fix-5-ot-card-tolerance',
        title: 'OT-Card Tolerance Bölgesi',
        commit: 'c7e4053',
        date: '2026-05-16',
        category: 'ot_card_verification',
        summary: 'Tolerance (±5dk) kaynaklı 30dk farklar artık flag edilmiyor; ~10 false positive temizlenir.',
    },
    {
        id: 'fix-6-duty-lunch',
        title: 'Dış Görev Lunch Deduction (Bug 7)',
        commit: '7c86abf',
        date: '2026-05-16',
        category: 'external_duty_consistency',
        summary: 'Tam gün dış görevde 10sa yerine 9sa normal mesai. Lunch artık düşülür. Audit fix mode auto-recalc çağırır → mevcut yanlış kayıtlar otomatik onarılır.',
    },
    {
        id: 'fix-7-ghost-split',
        title: 'Ghost Split Kayıtları (Füsun gap)',
        commit: '6cf13e3',
        date: '2026-05-17',
        category: 'ghost_split_records',
        summary: 'SPLIT kayıtları gerçek kart event ile karşılaştırılır. Çalışan dışardayken oluşturulan ghost OT kayıtları (Füsun #578084 gibi) tespit edilir + Düzelt ile silinir, recalc tetiklenir.',
    },
];

const CATEGORY_LABELS = {
    ot_overlap: 'Fazla Mesai Çakışması',
    attendance_recalc: 'Mesai Yeniden Hesaplama',
    orphan_requests: 'Sahipsiz Talepler',
    duration_mismatch: 'Süre Uyumsuzluğu',
    status_anomaly: 'Durum Anomalisi',
    missing_attendance: 'Eksik Mesai Kaydı',
    fiscal_integrity: 'Mali Dönem Bütünlüğü',
    timezone_diagnostics: 'Saat Dilimi Tanılama',
    leave_ot_conflict: 'İzin-Fazla Mesai Konflikti',
    multiple_primary_managers: 'Çoklu Birincil Yönetici',
    notification_gap: 'Eksik Bildirim',
    ot_card_verification: 'Fazla Mesai-Kart Doğrulama',
    leave_credit_mismatch: 'İzin Kredi Uyumsuzluğu',
    excuse_leave_integrity: 'Mazeret İzni Bütünlüğü',
    external_duty_consistency: 'Dış Görev Tutarlılığı',
    ghost_split_records: 'Hayali Bölme Kayıtları',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
};

const SEVERITY_LABELS = {
    HIGH: 'Yüksek',
    MEDIUM: 'Orta',
    LOW: 'Düşük',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDateFrom() {
    return getIstanbulDateOffset(-90);
}

function getDefaultDateTo() {
    return getIstanbulToday();
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
                    Düzeltildi
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
                {fixable ? 'Düzelt. (fix mod)' : 'Manuel İnceleme'}
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
    if (!log) return null;
    if (log.error) {
        return <div className="text-red-600 text-xs p-3">Hata: {log.error}</div>;
    }
    const { day_rules, gate_events, attendance_records, ot_requests, analysis } = log;
    return (
        <div className="space-y-1">
            <Section title="Analiz Sonucu">
                {(analysis || []).map((a, i) => (
                    <div key={i} className={`py-1 ${a.startsWith('⚠') ? 'text-red-700 font-bold' : a.startsWith('✓') ? 'text-green-700' : 'text-gray-800'}`}>{a}</div>
                ))}
            </Section>

            <Section title="Gün Kuralları">
                {day_rules && Object.entries(day_rules).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            </Section>

            <Section title={`Kapı Geçiş Kayıtları (${log.gate_event_count || 0})`}>
                {gate_events && gate_events.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead><tr className="border-b bg-gray-50">
                                <th className="text-left py-1 px-2 font-bold">ID</th>
                                <th className="text-left py-1 px-2 font-bold">UTC</th>
                                <th className="text-left py-1 px-2 font-bold">Istanbul</th>
                                <th className="text-left py-1 px-2 font-bold">Yön</th>
                                <th className="text-left py-1 px-2 font-bold">Kapı</th>
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
                ) : <span className="text-gray-400">Kayıt yok</span>}
            </Section>

            <Section title={`Mesai Kayıtları (${log.attendance_count || 0})`}>
                {attendance_records && attendance_records.length > 0 ? attendance_records.map((att, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50/50">
                        <div className="font-bold text-gray-700 mb-1">Attendance #{att.att_id} — {att.status} ({att.source})</div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <KV k="Giriş (UTC)" v={att.check_in_utc} />
                            <KV k="Giriş (Istanbul)" v={att.check_in_istanbul} />
                            <KV k="Çıkış (UTC)" v={att.check_out_utc} />
                            <KV k="Çıkış (Istanbul)" v={att.check_out_istanbul} />
                            <KV k="Ham süre" v={`${att.raw_minutes} dk`} />
                            <KV k="Öğle düşüşü" v={`${att.lunch_overlap_minutes} dk`} />
                            <KV k="Düzeltilmiş ham" v={`${att.adjusted_raw_minutes} dk`} />
                            <KV k="Kayıtlı toplam" v={`${att.total_minutes} dk`} warn={Math.abs(att.adjusted_raw_minutes - att.total_minutes) > 35} />
                            <KV k="Normal" v={`${att.normal_minutes} dk`} />
                            <KV k="Fazla mesai" v={`${att.overtime_minutes} dk`} />
                            <KV k="Mola" v={att.break_seconds != null ? `${Math.round(att.break_seconds/60)} dk` : '-'} />
                            <KV k="Potansiyel mola" v={att.potential_break_seconds != null ? `${Math.round(att.potential_break_seconds/60)} dk` : '-'} />
                            <KV k="Kilitli" v={att.is_locked ? 'Evet' : 'Hayır'} />
                            <KV k="Oluşturulma" v={att.created_at} />
                        </div>
                    </div>
                )) : <span className="text-gray-400">Kayıt yok</span>}
            </Section>

            <Section title={`Fazla Mesai Talepleri (${log.ot_count || 0})`}>
                {ot_requests && ot_requests.length > 0 ? ot_requests.map((ot, i) => (
                    <div key={i} className={`border rounded-lg p-3 mb-2 ${
                        ot.status === 'POTENTIAL' ? 'border-amber-300 bg-amber-50/50' :
                        ot.status === 'PENDING' ? 'border-blue-300 bg-blue-50/50' :
                        ot.status === 'APPROVED' ? 'border-green-300 bg-green-50/50' :
                        'border-gray-200 bg-gray-50/50'
                    }`}>
                        <div className="font-bold text-gray-700 mb-1">
                            Fazla Mesai #{ot.ot_id} — {ot.status} ({ot.source_type})
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <KV k="Başlangıç" v={ot.start_time} />
                            <KV k="Bitiş" v={ot.end_time} />
                            <KV k="Ham aralık" v={`${ot.raw_span_minutes} dk`} />
                            <KV k="Kayıtlı süre" v={`${ot.duration_minutes} dk`} />
                            <KV k="Aralık-Süre farkı" v={`${ot.span_vs_duration_diff_min} dk`} warn={ot.span_vs_duration_diff_min > 5} />
                            <KV k="Sebep" v={ot.reason} />
                            <KV k="Manuel" v={ot.is_manual ? 'Evet' : 'Hayır'} />
                            <KV k="Atama ID" v={ot.assignment_id} />
                            <KV k="Attendance ID" v={ot.attendance_id} />
                            <KV k="Onaylayan" v={ot.target_approver} />
                            <KV k="Onayıcı Yönetici" v={ot.approval_manager} />
                            <KV k="Onay Tarihi" v={ot.approval_date} />
                            <KV k="Oluşturulma" v={ot.created_at} />
                            <KV k="Güncelleme" v={ot.updated_at} />
                            {ot.segments && ot.segments.length > 0 && (
                                <div className="col-span-2">
                                    <span className="text-gray-500 font-medium">Segmentler: </span>
                                    <span className="font-mono">{ot.segments.map(s => `${s.start}-${s.end}`).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )) : <span className="text-gray-400">Kayıt yok</span>}
            </Section>
        </div>
    );
};

// ─── Detail Log Modal (single or bulk) ──────────────────────────────────────

const DetailLogModal = ({ data, logs, onClose }) => {
    const [activeTab, setActiveTab] = useState(0);

    const isBulk = Array.isArray(logs) && logs.length > 0;
    const items = isBulk ? logs : (data ? [data] : []);

    if (items.length === 0) return null;

    const current = items[activeTab] || items[0];

    return (
        <ModalOverlay open={true} onClose={onClose}>
            <div
                className="bg-gray-50 shadow-2xl w-full max-w-5xl mx-4 my-6 rounded-2xl flex flex-col overflow-hidden max-h-[calc(100vh-3rem)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <DocumentMagnifyingGlassIcon className="w-4 h-4 text-indigo-600" />
                            {isBulk ? `Toplu Detay Logu (${items.length} kayıt)` : 'Detay Logu'}
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
                                const hasWarning = (item.analysis || []).some(a => typeof a === 'string' && a.startsWith('⚠'));
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
        </ModalOverlay>
    );
};

// ─── Fix Report Modal ────────────────────────────────────────────────────────

const FixReportModal = ({ results, onClose }) => {
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

    return (
        <ModalOverlay open={true} onClose={onClose}>
            <div
                className="bg-gray-50 shadow-2xl w-full max-w-4xl mx-4 my-6 rounded-2xl flex flex-col overflow-hidden max-h-[calc(100vh-3rem)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />
                            Düzeltme Raporu
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {totalIssues} sorun bulundu, {totalFixed} düzeltildi
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
                            <span className="text-xs text-gray-600">Düzeltilen: <strong>{totalFixed}</strong></span>
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
                            <p className="text-sm text-gray-500">Düzeltme yapılmadı (tüm sorunlar manuel inceleme gerektiriyor)</p>
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
        </ModalOverlay>
    );
};

// ─── Category Card ──────────────────────────────────────────────────────────

const RecentFixesPanel = ({ results, onQuickVerify, loading }) => {
    const categories = results?.categories || null;
    // Sadece RECENT_FIXES'tan en az birinin tarandığını "hasResults" sayalım,
    // tam tarama veya hızlı doğrulama farketmez.
    const verifiedCats = categories ? RECENT_FIXES.filter(f => categories[f.category]) : [];
    const hasResults = verifiedCats.length > 0;

    const statusFor = (cat) => {
        if (!categories) return { tone: 'idle', label: 'Bekliyor', count: null };
        const data = categories[cat];
        if (!data) return { tone: 'idle', label: 'Taranmadı', count: null };
        if (data.error) return { tone: 'error', label: 'Hata', count: null };
        const c = data.count ?? 0;
        if (c === 0) return { tone: 'ok', label: 'Temiz', count: 0 };
        return { tone: 'warn', label: `${c} sorun`, count: c };
    };

    const TONES = {
        idle:  'bg-slate-50 border-slate-200 text-slate-500',
        ok:    'bg-emerald-50 border-emerald-200 text-emerald-700',
        warn:  'bg-amber-50 border-amber-200 text-amber-800',
        error: 'bg-red-50 border-red-200 text-red-700',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-emerald-600" />
                        Son Düzeltmeler (2026-05-16)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Bu oturumda kök nedeni düzeltilen 5 bug. Hızlı Doğrulama yalnızca bu 5 kategoriyi tarar (~5-10 sn).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onQuickVerify}
                    disabled={loading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                    {loading ? (
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                    )}
                    {loading ? 'Taraniyor...' : (hasResults ? 'Yeniden Doğrula' : 'Hızlı Doğrula')}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {RECENT_FIXES.map(fix => {
                    const st = statusFor(fix.category);
                    return (
                        <div key={fix.id} className={`border rounded-lg p-3 ${TONES[st.tone]}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold leading-tight">{fix.title}</span>
                                <span className="text-[10px] font-mono opacity-70 shrink-0">{fix.commit}</span>
                            </div>
                            <p className="text-[11px] opacity-80 leading-snug">{fix.summary}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                                <span className="text-[10px] uppercase tracking-wider opacity-70">
                                    {CATEGORY_LABELS[fix.category] || fix.category}
                                </span>
                                <span className="text-xs font-bold flex items-center gap-1">
                                    {st.tone === 'ok' && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                    {st.tone === 'warn' && <ExclamationTriangleIcon className="w-3.5 h-3.5" />}
                                    {st.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const IgnoreModal = ({ data, onClose, onSubmit, submitting }) => {
    const [reason, setReason] = useState('');
    if (!data) return null;
    const { issue, category } = data;
    const label = CATEGORY_LABELS[category] || category;
    return (
        <ModalOverlay onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-100 rounded-xl">
                        <NoSymbolIcon className="w-5 h-5 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Kaydı Yoksay</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                    <div className="text-xs text-gray-500">Kategori</div>
                    <div className="text-sm font-bold text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500 mt-2">Kayıt</div>
                    <div className="text-sm text-gray-700">
                        {issue.employee_name} — {issue.date || '-'} — ID: {issue.id}
                    </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                    Bu kayıt bir daha denetimde gösterilmeyecek. Sebep yaz (opsiyonel):
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Örn: Yönetici tarafından onaylandı, yanlış pozitif, vb."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onSubmit(reason)}
                        disabled={submitting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <NoSymbolIcon className="w-4 h-4" />}
                        Yoksay
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};

const IgnoredPanel = ({ items, loading, onUnignore, unignoreLoadingId }) => {
    const [expanded, setExpanded] = useState(false);
    if (loading) {
        return (
            <div className="rounded-2xl bg-white border border-gray-200 p-4 mb-4">
                <div className="text-xs text-gray-400">Yoksayılanlar yükleniyor…</div>
            </div>
        );
    }
    if (!items || items.length === 0) {
        return null;
    }
    return (
        <div className="rounded-2xl bg-white border border-rose-200 p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <NoSymbolIcon className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-gray-800">
                        Yoksayılan Kayıtlar ({items.length})
                    </h3>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                    {expanded ? 'Gizle' : 'Detayları Aç'}
                </button>
            </div>
            {expanded && (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Kategori</th>
                                <th className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Kayıt ID</th>
                                <th className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Sebep</th>
                                <th className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Kim</th>
                                <th className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Ne Zaman</th>
                                <th className="text-right py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-b border-gray-100 hover:bg-rose-50/30">
                                    <td className="py-2 px-2 text-gray-700">
                                        {CATEGORY_LABELS[it.category] || it.category}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-gray-600">#{it.record_id}</td>
                                    <td className="py-2 px-2 text-gray-700">
                                        {it.reason || <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="py-2 px-2 text-gray-600">
                                        {it.ignored_by || it.ignored_by_username || '-'}
                                    </td>
                                    <td className="py-2 px-2 text-gray-500 font-mono text-[10px]">
                                        {it.ignored_at ? new Date(it.ignored_at).toLocaleString('tr-TR') : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <button
                                            onClick={() => onUnignore(it.id)}
                                            disabled={unignoreLoadingId === it.id}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg disabled:opacity-50 transition-colors"
                                        >
                                            {unignoreLoadingId === it.id ? '...' : 'Geri Al'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const CategoryCard = ({ categoryKey, categoryData, auditMode, onDetailLog, onFixCategory, fixLoading, onIgnore }) => {
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
                            {fixed} düzeltildi
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
                    {categoryData?.error && (
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
                                            Çalışan
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Tarih
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '320px'}}>
                                            Sorun Detayı
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '180px'}}>
                                            Düzeltme İşlemi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">
                                            Kayıt ID
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-12">
                                            Log
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">
                                            Yoksay
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
                                            <td className="py-2.5 px-2">
                                                {issue.id ? (
                                                    <button
                                                        onClick={() => onIgnore?.(categoryKey, issue)}
                                                        className="p-1 hover:bg-rose-100 rounded-lg transition-colors"
                                                        title="Bu kaydı bir daha gösterme (Yoksay)"
                                                    >
                                                        <NoSymbolIcon className="w-4 h-4 text-rose-500" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-300">—</span>
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
                                Bu Kategoriyi Düzelt
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

    // Yoksay (AuditIgnore)
    const [ignoreList, setIgnoreList] = useState([]);
    const [ignoreLoading, setIgnoreLoading] = useState(false);
    const [ignoreModalData, setIgnoreModalData] = useState(null);  // {category, issue}
    const [ignoreSubmitting, setIgnoreSubmitting] = useState(false);
    const [unignoreLoadingId, setUnignoreLoadingId] = useState(null);

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

    // ─── Yoksay handlers ────────────────────────────────────────────────────
    const fetchIgnoreList = useCallback(async () => {
        setIgnoreLoading(true);
        try {
            const res = await api.get('/system/health-check/audit-ignore/');
            setIgnoreList(res.data?.items || []);
        } catch {
            // sessiz fail — panel görünmez
        } finally {
            setIgnoreLoading(false);
        }
    }, []);

    useEffect(() => { fetchIgnoreList(); }, [fetchIgnoreList]);

    const openIgnoreModal = (category, issue) => {
        setIgnoreModalData({ category, issue });
    };

    const submitIgnore = async (reason) => {
        if (!ignoreModalData) return;
        const { category, issue } = ignoreModalData;
        setIgnoreSubmitting(true);
        try {
            await api.post('/system/health-check/audit-ignore/', {
                category,
                record_id: issue.id,
                reason: reason || '',
            });
            setIgnoreModalData(null);
            await fetchIgnoreList();
            // Mevcut sonuçlardan da görsel olarak çıkar (yeni tarama beklemeden)
            setResults(prev => {
                if (!prev?.categories?.[category]) return prev;
                const oldIssues = prev.categories[category].issues || [];
                const newIssues = oldIssues.filter(i => i.id !== issue.id);
                return {
                    ...prev,
                    categories: {
                        ...prev.categories,
                        [category]: {
                            ...prev.categories[category],
                            issues: newIssues,
                            count: newIssues.length,
                            ignored_count: (prev.categories[category].ignored_count || 0) + 1,
                        },
                    },
                };
            });
        } catch (err) {
            alert(err.response?.data?.error || 'Yoksayma başarısız');
        } finally {
            setIgnoreSubmitting(false);
        }
    };

    const handleUnignore = async (ignoreId) => {
        setUnignoreLoadingId(ignoreId);
        try {
            await api.delete('/system/health-check/audit-ignore/', { data: { id: ignoreId } });
            await fetchIgnoreList();
        } catch (err) {
            alert(err.response?.data?.error || 'Geri alma başarısız');
        } finally {
            setUnignoreLoadingId(null);
        }
    };

    const runAudit = async (mode) => {
        if (mode === 'fix') {
            const fixableCount = results
                ? Object.values(results.categories || {}).reduce(
                    (s, c) => s + (c.issues || []).filter(i => i.fixable).length, 0
                ) : 0;
            if (!window.confirm(
                `DİKKAT: Bu işlem veritabanındaki verileri değiştirecektir.\n\n` +
                `${fixableCount > 0 ? fixableCount + ' sorun otomatik düzeltilecek.' : 'Düzeltme modu çalıştırılacak.'}\n\n` +
                `Devam etmek istiyor musunuz?`
            )) return;
        }

        if (selectedCategories.length === 0) {
            setError('En az bir kategori seçmelisiniz.');
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
            // Audit 16 kategori taradığı için 30sn default timeout aşılabilir;
            // backend gunicorn timeout 1800sn, axios'ta 30 dakika ver.
            const res = await api.post('/system/health-check/data-integrity-audit/', body, {
                timeout: 1800000,
            });
            setResults(res.data);
            if (mode === 'fix') {
                setFixReport(res.data);
            }
        } catch (err) {
            const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
            setError(
                err.response?.data?.error
                || err.response?.data?.detail
                || (isTimeout ? 'Denetim çok uzun sürdü (timeout). Daha kısa tarih aralığı veya tek kategori seçip tekrar deneyin.' : 'Denetim çalıştırılamadı')
            );
        } finally {
            setLoading(false);
        }
    };

    // Son Düzeltmeler paneli — yalnızca 5 fix kategorisini tarar (hızlı).
    // Mevcut sonuçlarla merge eder ki kullanıcı önce tam tarama yapmış olsa
    // bile fix kategorileri taze sayıyla güncellensin.
    const runQuickVerify = async () => {
        const categories = RECENT_FIXES.map(f => f.category);
        setLoading(true);
        setError(null);
        try {
            const body = {
                mode: 'scan',
                categories,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) body.employee_id = Number(employeeId);
            const res = await api.post('/system/health-check/data-integrity-audit/', body, {
                timeout: 1800000,
            });
            setResults(prev => {
                if (!prev) return res.data;
                return {
                    ...prev,
                    categories: { ...(prev.categories || {}), ...(res.data?.categories || {}) },
                };
            });
        } catch (err) {
            const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
            setError(
                err.response?.data?.error
                || err.response?.data?.detail
                || (isTimeout ? 'Hızlı doğrulama zaman aşımına uğradı.' : 'Hızlı doğrulama çalıştırılamadı')
            );
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
            setError(err.response?.data?.error || 'Detay logu alınamadı');
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
            setError('Loglanacak sorun bulunamadı.');
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
            setError(err.response?.data?.error || 'Toplu detay logu alınamadı');
        } finally {
            setLoadingDetail(false);
        }
    }, [results]);

    const fixCategory = useCallback(async (categoryKey) => {
        const catData = results?.categories?.[categoryKey];
        const fixableCount = (catData?.issues || []).filter(i => i.fixable).length;
        if (!window.confirm(
            `"${CATEGORY_LABELS[categoryKey] || categoryKey}" kategorisindeki ` +
            `${fixableCount} sorun düzeltilecek.\n\nDevam?`
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
            const res = await api.post('/system/health-check/data-integrity-audit/', body, {
                timeout: 1800000,
            });
            setFixReport(res.data);
            // Re-scan to refresh results
            const scanBody = {
                mode: 'scan',
                categories: selectedCategories,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) scanBody.employee_id = Number(employeeId);
            const scanRes = await api.post('/system/health-check/data-integrity-audit/', scanBody, {
                timeout: 1800000,
            });
            setResults(scanRes.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Düzeltme başarısız');
        } finally {
            setFixLoading(false);
        }
    }, [results, dateFrom, dateTo, employeeId, selectedCategories]);

    const closeModal = useCallback(() => {
        setDetailLog(null);
        setBulkLogs(null);
    }, []);

    const [exporting, setExporting] = useState(false);
    const downloadTxtReport = useCallback(async () => {
        setExporting(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            if (employeeId) params.set('employee_id', employeeId);
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('access_token');
            const resp = await fetch(`${baseURL}/system/health-check/data-integrity-audit-export/?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            a.download = `Veri_Butunlugu_Raporu_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        } catch (err) {
            setError(`TXT rapor indirilemedi: ${err.message || err}`);
        } finally {
            setExporting(false);
        }
    }, [dateFrom, dateTo, employeeId]);

    const totalFixed = results
        ? Object.values(results.categories || {}).reduce((sum, cat) => sum + (cat.fixed || 0), 0)
        : 0;

    const categoriesWithIssues = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count > 0 && !cat.info_only)
        : [];

    const categoriesInfoOnly = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count > 0 && cat.info_only)
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
                            Veri Bütünlüğü Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Veritabanındaki tutarsızlıkları, çakışmaları ve anomalileri tespit eder. Düzeltme modu ile otomatik onarım yapılabilir.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Çalışan ID (opsiyonel)</label>
                        <input
                            type="number"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Boş = Tümü"
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
                            Düzelt
                        </button>
                        <button
                            onClick={downloadTxtReport}
                            disabled={exporting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {exporting ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-4 h-4" />
                            )}
                            {exporting ? 'İndiriliyor...' : 'TXT İndir'}
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
                            Tümünü Seç
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

            {/* Son Düzeltmeler — 2026-05-16 oturumu */}
            <RecentFixesPanel results={results} onQuickVerify={runQuickVerify} loading={loading} />

            {/* Yoksayılan Kayıtlar */}
            <IgnoredPanel
                items={ignoreList}
                loading={ignoreLoading}
                onUnignore={handleUnignore}
                unignoreLoadingId={unignoreLoadingId}
            />

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
                            label="Otomatik Düzelt."
                            value={results.summary?.fixable || 0}
                            color="bg-amber-50 border-amber-100 text-amber-700"
                            sub="fix modu ile düzeltilir"
                        />
                        <StatCard
                            label="Manuel İnceleme"
                            value={results.summary?.manual_review || 0}
                            color="bg-slate-50 border-slate-100 text-slate-700"
                            sub={results.summary?.info_only ? `+ ${results.summary.info_only} bilgilendirme` : 'elle kontrol gerekir'}
                        />
                        <StatCard
                            label="Düzeltilen"
                            value={totalFixed}
                            color={totalFixed > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}
                            sub={results.mode === 'fix' ? 'bu çalıştırmada' : 'tarama modu'}
                        />
                        <StatCard
                            label="Geçen Süre"
                            value={`${(results.elapsed_seconds || 0).toFixed(2)}s`}
                            color="bg-blue-50 border-blue-100 text-blue-700"
                            sub={results.summary?.date_range ? `${results.summary.date_range.start} ~ ${results.summary.date_range.end}` : ''}
                        />
                        <StatCard
                            label="Mod"
                            value={results.mode === 'fix' ? 'Düzeltme' : 'Tarama'}
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
                                    <CategoryCard key={key} categoryKey={key} categoryData={data} auditMode={results.mode} onDetailLog={fetchDetailLog} onFixCategory={fixCategory} fixLoading={fixLoading} onIgnore={openIgnoreModal} />
                                ))}
                        </div>
                    )}

                    {/* Info-only Categories (diagnostics, not counted as issues) */}
                    {categoriesInfoOnly.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                <DocumentMagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                                Bilgilendirme ({categoriesInfoOnly.reduce((s, [, c]) => s + c.count, 0)} kayıt — sorun sayılmaz)
                            </h3>
                            {categoriesInfoOnly
                                .sort(
                                    (a, b) =>
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a[1].severity] || 3) -
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b[1].severity] || 3)
                                )
                                .map(([key, data]) => (
                                    <CategoryCard key={key} categoryKey={key} categoryData={data} auditMode={results.mode} onDetailLog={fetchDetailLog} onFixCategory={fixCategory} fixLoading={fixLoading} onIgnore={openIgnoreModal} />
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
                            <h3 className="text-sm font-bold text-green-700">Sorun Bulunamadı</h3>
                            <p className="text-xs text-green-600 mt-1">
                                Taranan tüm kategorilerde veri bütünlüğü sağlanmış.
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

            {/* Yoksay Modal */}
            <IgnoreModal
                data={ignoreModalData}
                onClose={() => setIgnoreModalData(null)}
                onSubmit={submitIgnore}
                submitting={ignoreSubmitting}
            />

            {/* Loading overlay */}
            <ModalOverlay open={loadingDetail} onClose={() => {}} closeOnOverlayClick={false} closeOnEsc={false}>
                <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-indigo-600" />
                    <span className="text-sm font-bold text-gray-700">Detay logu yükleniyor...</span>
                </div>
            </ModalOverlay>

            {/* Empty state */}
            {!results && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ShieldCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Denetim Başlatılmadı</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        "Tara" butonuna tıklayarak veri bütünlüğü denetimini başlatın. Sorunları otomatik onarmak için "Düzelt" kullanın.
                    </p>
                </div>
            )}
        </div>
    );
}
