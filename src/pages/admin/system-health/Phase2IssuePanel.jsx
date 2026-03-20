import React, { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Badge Components ──────────────────────────────────────────────
function MatchBadge({ match }) {
    const styles = {
        UYUMLU: 'bg-green-200 text-green-800',
        KISMEN: 'bg-amber-200 text-amber-800',
        UYUMSUZ: 'bg-red-200 text-red-800',
        KART_YOK: 'bg-gray-200 text-gray-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${styles[match] || 'bg-gray-200 text-gray-700'}`}>
            {match}
        </span>
    );
}

function TypeBadge({ type }) {
    const styles = {
        OT: 'bg-indigo-100 text-indigo-700 border-indigo-300',
        LEAVE: 'bg-teal-100 text-teal-700 border-teal-300',
        HEALTH_REPORT: 'bg-pink-100 text-pink-700 border-pink-300',
        CARDLESS: 'bg-orange-100 text-orange-700 border-orange-300',
    };
    return (
        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${styles[type] || 'bg-gray-100'}`}>
            {type}
        </span>
    );
}

// ─── Category Tabs ─────────────────────────────────────────────────
function CategoryTabs({ byMatch, active, onSelect }) {
    const tabs = [
        { key: 'ALL', label: 'Tumu', count: Object.values(byMatch).reduce((s, v) => s + v, 0),
          activeClass: 'bg-indigo-600 text-white border-indigo-600',
          inactiveClass: 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50' },
        { key: 'UYUMSUZ', label: 'Uyumsuz', count: byMatch.UYUMSUZ || 0,
          activeClass: 'bg-red-600 text-white border-red-600',
          inactiveClass: 'bg-white text-red-700 border-red-300 hover:bg-red-50' },
        { key: 'KART_YOK', label: 'Kart Yok', count: byMatch.KART_YOK || 0,
          activeClass: 'bg-gray-600 text-white border-gray-600',
          inactiveClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' },
        { key: 'KISMEN', label: 'Kismen', count: byMatch.KISMEN || 0,
          activeClass: 'bg-amber-600 text-white border-amber-600',
          inactiveClass: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50' },
    ];
    return (
        <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
                <button key={t.key} onClick={() => onSelect(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${active === t.key ? t.activeClass : t.inactiveClass}`}>
                    {t.label} ({t.count})
                </button>
            ))}
        </div>
    );
}

// ─── Card Sessions ─────────────────────────────────────────────────
function CardSessionList({ sessions }) {
    if (!sessions || sessions.length === 0) return null;
    return (
        <div className="mt-2">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">Kart Session'lari:</p>
            <div className="flex flex-wrap gap-1">
                {sessions.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono text-blue-700">
                        {s.start?.substring(11, 19) || '?'} - {s.end?.substring(11, 19) || '?'} ({s.duration_min}dk)
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Issue Card ────────────────────────────────────────────────────
function IssueCard({ issue, issueKey, selected, onToggle, expanded, onExpand, onAction, loading, result }) {
    const [confirmDuzelt, setConfirmDuzelt] = useState(false);
    const borderColor = {
        UYUMSUZ: 'border-l-red-500',
        KISMEN: 'border-l-amber-500',
        KART_YOK: 'border-l-gray-400',
    }[issue.match] || 'border-l-gray-300';

    const isDone = !!result;
    const cardSeconds = (issue.card_sessions || []).reduce((s, cs) => s + (cs.duration_min || 0) * 60, 0);

    return (
        <div className={`border border-gray-200 rounded-lg ${borderColor} border-l-4 ${isDone ? 'opacity-60' : ''} transition-all`}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => onExpand(issueKey)}>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => { e.stopPropagation(); onToggle(issueKey); }}
                    className="w-4 h-4 rounded border-gray-300"
                    onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-bold text-gray-800 min-w-[140px]">{issue.employee_name}</span>
                <span className="text-xs text-gray-500 font-mono min-w-[85px]">{issue.date}</span>
                <TypeBadge type={issue.type} />
                <MatchBadge match={issue.match} />
                <span className="text-xs text-gray-500">{issue.status}</span>
                <span className="text-xs text-gray-600 truncate flex-1" title={issue.detail}>{issue.detail}</span>
                {isDone && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${result.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {result.ok ? result.note : result.error}
                    </span>
                )}
                {expanded ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
            </div>

            {/* Expanded Detail */}
            {expanded && (
                <div className="px-4 pb-3 border-t border-gray-100 space-y-2">
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-semibold">Detay: </span>{issue.detail}
                    </div>
                    <div className="text-xs text-gray-500">
                        <span className="font-semibold">Kaynak: </span>{issue.source || '-'} |
                        <span className="font-semibold ml-2">ID: </span>#{issue.id} |
                        <span className="font-semibold ml-2">Durum: </span>{issue.status}
                    </div>
                    <CardSessionList sessions={issue.card_sessions} />

                    {/* Action Buttons */}
                    {!isDone && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                            <button
                                onClick={() => onAction(issueKey, issue, 'KABUL')}
                                disabled={loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                <CheckCircleIcon className="w-3.5 h-3.5" /> Kabul Et
                            </button>
                            {issue.type === 'OT' && (
                                <button
                                    onClick={() => onAction(issueKey, issue, 'RED')}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all"
                                >
                                    <XCircleIcon className="w-3.5 h-3.5" /> Iptal Et
                                </button>
                            )}
                            <button
                                onClick={() => onAction(issueKey, issue, 'INCELE')}
                                disabled={loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all"
                            >
                                <BellAlertIcon className="w-3.5 h-3.5" /> Yoneticiye Gonder
                            </button>
                            {issue.match === 'KISMEN' && issue.type === 'OT' && cardSeconds > 0 && (
                                <>
                                    {!confirmDuzelt ? (
                                        <button
                                            onClick={() => setConfirmDuzelt(true)}
                                            disabled={loading}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-300 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-all"
                                        >
                                            <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> Sure Duzelt ({Math.floor(cardSeconds / 60)}dk)
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded text-xs">
                                            <span className="font-bold text-amber-800">Sure {Math.floor(cardSeconds / 60)}dk olacak. Emin misiniz?</span>
                                            <button onClick={() => { onAction(issueKey, issue, 'SURE_DUZELT', cardSeconds); setConfirmDuzelt(false); }}
                                                className="px-2 py-0.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700">Evet</button>
                                            <button onClick={() => setConfirmDuzelt(false)}
                                                className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300">Hayir</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Action Result */}
                    {isDone && (
                        <div className={`flex items-center gap-2 p-2 rounded text-xs ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {result.ok ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                            <span className="font-bold">{result.ok ? result.note : `Hata: ${result.error}`}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────
export default function Phase2IssuePanel({ phase2 }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [actionResults, setActionResults] = useState(new Map());
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [apiError, setApiError] = useState(null);

    // Reset on new data
    useEffect(() => {
        setSelectedIds(new Set());
        setActionResults(new Map());
        setExpandedIds(new Set());
        setApiError(null);
    }, [phase2]);

    if (!phase2) return null;

    const issues = phase2.issues || [];
    const filtered = activeCategory === 'ALL'
        ? issues
        : issues.filter(i => i.match === activeCategory);

    const makeKey = (issue) => `${issue.type}-${issue.id}`;

    const toggleSelect = (key) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleExpand = (key) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const applyAction = async (key, issue, action, cardSeconds) => {
        setActionLoading(true);
        setApiError(null);
        try {
            const payload = { issue_id: issue.id, issue_type: issue.type, action };
            if (cardSeconds) payload.card_seconds = cardSeconds;
            const res = await api.post('/system/health-check/pdks-audit-action/', { actions: [payload] }, { timeout: 60000 });
            const r = res.data.results?.[0];
            if (r) {
                setActionResults(prev => new Map(prev).set(key, r));
            }
        } catch (e) {
            setApiError(e.response?.data?.error || e.message || 'API hatasi');
        } finally {
            setActionLoading(false);
        }
    };

    const bulkAccept = () => {
        const newResults = new Map(actionResults);
        filtered.forEach(issue => {
            const key = makeKey(issue);
            if (!newResults.has(key)) {
                newResults.set(key, { ok: true, note: 'Kabul edildi (toplu)' });
            }
        });
        setActionResults(newResults);
        setSelectedIds(new Set());
    };

    const bulkAction = async (action) => {
        if (selectedIds.size === 0) return;
        setActionLoading(true);
        setApiError(null);
        try {
            const actions = [];
            filtered.forEach(issue => {
                const key = makeKey(issue);
                if (selectedIds.has(key) && !actionResults.has(key)) {
                    const payload = { issue_id: issue.id, issue_type: issue.type, action };
                    actions.push(payload);
                }
            });
            if (actions.length === 0) return;
            const res = await api.post('/system/health-check/pdks-audit-action/', { actions }, { timeout: 120000 });
            const newResults = new Map(actionResults);
            for (const r of (res.data.results || [])) {
                const issue = issues.find(i => i.id === r.issue_id);
                if (issue) newResults.set(makeKey(issue), r);
            }
            setActionResults(newResults);
            setSelectedIds(new Set());
        } catch (e) {
            setApiError(e.response?.data?.error || e.message || 'API hatasi');
        } finally {
            setActionLoading(false);
        }
    };

    const selectAll = () => {
        const newSet = new Set(selectedIds);
        filtered.forEach(i => {
            const k = makeKey(i);
            if (!actionResults.has(k)) newSet.add(k);
        });
        setSelectedIds(newSet);
    };

    const deselectAll = () => setSelectedIds(new Set());
    const pendingCount = filtered.filter(i => !actionResults.has(makeKey(i))).length;
    const selectedCount = [...selectedIds].filter(k => !actionResults.has(k)).length;

    return (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-4">
            <h4 className="font-bold text-purple-800 text-sm">Faz 2: PDKS Dogrulama</h4>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<ClockIcon className="w-5 h-5 text-purple-500" />} label="Kontrol Noktasi" value={phase2.total_checks} />
                <StatCard icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />} label="PDKS Sorun" value={phase2.total_issues} color={phase2.total_issues > 0 ? 'amber' : 'green'} />
                <StatCard icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />} label="Islem Yapildi" value={actionResults.size} color="green" />
                <StatCard icon={<ClockIcon className="w-5 h-5 text-gray-400" />} label="Bekleyen" value={pendingCount} color={pendingCount > 0 ? 'gray' : 'green'} />
            </div>

            {/* Category Tabs */}
            <CategoryTabs byMatch={phase2.by_match || {}} active={activeCategory} onSelect={setActiveCategory} />

            {/* Bulk Actions */}
            <div className="flex items-center gap-3 flex-wrap p-3 bg-white rounded-lg border border-purple-100">
                <button onClick={selectAll} className="text-xs text-purple-600 font-bold hover:underline">Tumunu Sec</button>
                <button onClick={deselectAll} className="text-xs text-gray-500 font-bold hover:underline">Secimi Kaldir</button>
                <div className="w-px h-5 bg-gray-300" />
                <span className="text-xs text-gray-500">{selectedCount} secili</span>
                <div className="w-px h-5 bg-gray-300" />
                <button onClick={bulkAccept} disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Hepsini Kabul Et
                </button>
                <button onClick={() => bulkAction('INCELE')} disabled={actionLoading || selectedCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    <BellAlertIcon className="w-3.5 h-3.5" /> Secilenleri Incele Gonder ({selectedCount})
                </button>
                <button onClick={() => bulkAction('RED')} disabled={actionLoading || selectedCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                    <XCircleIcon className="w-3.5 h-3.5" /> Secilenleri Iptal Et ({selectedCount})
                </button>
            </div>

            {/* Error */}
            {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                    <XCircleIcon className="w-4 h-4 shrink-0" /> {apiError}
                </div>
            )}

            {/* Loading */}
            {actionLoading && (
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                    <span className="ml-2 text-xs text-gray-500">Islem yapiliyor...</span>
                </div>
            )}

            {/* Issue List */}
            <div className="max-h-[700px] overflow-y-auto space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Bu kategoride sorun bulunamadi.</div>
                ) : (
                    filtered.map(issue => {
                        const key = makeKey(issue);
                        return (
                            <IssueCard
                                key={key}
                                issue={issue}
                                issueKey={key}
                                selected={selectedIds.has(key)}
                                onToggle={toggleSelect}
                                expanded={expandedIds.has(key)}
                                onExpand={toggleExpand}
                                onAction={applyAction}
                                loading={actionLoading}
                                result={actionResults.get(key)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

// ─── Stat Card ──────────────────────────────────────────────────────
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
