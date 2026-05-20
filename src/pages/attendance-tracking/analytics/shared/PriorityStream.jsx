import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * PriorityStream — Modern severity dağılım görseli (2026-05-21 Stage 67).
 *
 * SeverityCompass'ın yerine geçer. Pusula metaforu yerine yatay severity bantları.
 *
 * Her bant:
 *   - Sol: severity ikonu + label
 *   - Orta: animated progress bar (max'a göre orantı) + count
 *   - Sağ: en yüksek öneme sahip ilk 1-2 öngörünün başlığı peek
 *
 * Tıklanır — filter trigger.
 *
 * Props:
 *  - counts: { alert, warning, info, positive }
 *  - insights: array — peek için ilk insight başlıklarını çekmek
 *  - activeKey: string | null
 *  - onSegmentClick: (key|null) => void
 *  - timeFrameLabel?: string — başlık için "Bu Ay", "Son 90 Gün" vb.
 */

const SEGMENTS = [
    {
        key: 'alert',
        label: 'Aksiyon',
        icon: AlertCircle,
        accent: '#dc2626',
        bg: 'bg-red-50',
        bar: 'bg-gradient-to-r from-red-500 to-red-600',
        ring: 'ring-red-400',
        text: 'text-red-700',
        emoji: '🔥',
        description: 'Acil müdahale',
    },
    {
        key: 'warning',
        label: 'Uyarı',
        icon: AlertTriangle,
        accent: '#d97706',
        bg: 'bg-amber-50',
        bar: 'bg-gradient-to-r from-amber-400 to-amber-500',
        ring: 'ring-amber-400',
        text: 'text-amber-700',
        emoji: '⚠️',
        description: 'İzlemeye değer',
    },
    {
        key: 'info',
        label: 'Bilgi',
        icon: Info,
        accent: '#2563eb',
        bg: 'bg-blue-50',
        bar: 'bg-gradient-to-r from-blue-400 to-blue-500',
        ring: 'ring-blue-400',
        text: 'text-blue-700',
        emoji: 'ℹ️',
        description: 'Bilgi amaçlı',
    },
    {
        key: 'positive',
        label: 'Pozitif',
        icon: CheckCircle2,
        accent: '#059669',
        bg: 'bg-emerald-50',
        bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
        ring: 'ring-emerald-400',
        text: 'text-emerald-700',
        emoji: '✨',
        description: 'İyi haber',
    },
];

export default function PriorityStream({
    counts = {},
    insights = [],
    activeKey = null,
    onSegmentClick,
    timeFrameLabel,
}) {
    const total = useMemo(
        () => SEGMENTS.reduce((sum, s) => sum + (counts[s.key] || 0), 0),
        [counts],
    );

    const maxCount = useMemo(
        () => Math.max(...SEGMENTS.map((s) => counts[s.key] || 0), 1),
        [counts],
    );

    // Severity → ilk insight title peek
    const peekMap = useMemo(() => {
        const map = {};
        SEGMENTS.forEach((s) => {
            map[s.key] = insights
                .filter((i) => i.severity === s.key)
                .slice(0, 2)
                .map((i) => i.title);
        });
        return map;
    }, [insights]);

    const handleClick = (key) => {
        if (!onSegmentClick) return;
        onSegmentClick(key === activeKey ? null : key);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Öncelik Akışı
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {timeFrameLabel ? `${timeFrameLabel} · ` : ''}
                        {total} öngörü tespit edildi · banta tıklayarak filtrele
                    </p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800 tabular-nums">{total}</span>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">öngörü</span>
                </div>
            </div>

            {/* Stream rows */}
            <div className="space-y-2">
                {SEGMENTS.map((seg) => {
                    const value = counts[seg.key] || 0;
                    const ratio = maxCount > 0 ? value / maxCount : 0;
                    const isActive = activeKey === seg.key;
                    const isDim = activeKey && !isActive;
                    const Icon = seg.icon;
                    const peek = peekMap[seg.key];

                    return (
                        <button
                            key={seg.key}
                            type="button"
                            onClick={() => handleClick(seg.key)}
                            className={`group w-full text-left rounded-xl border transition-all duration-300 ${
                                isActive
                                    ? `${seg.bg} border-transparent ring-2 ${seg.ring} shadow-md`
                                    : isDim
                                        ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                            aria-pressed={isActive}
                        >
                            <div className="flex items-center gap-3 p-3">
                                {/* Icon */}
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 text-white shadow-sm transition-transform group-hover:scale-105`}
                                    style={{
                                        background: `linear-gradient(135deg, ${seg.accent}, ${seg.accent}dd)`,
                                    }}
                                >
                                    <Icon size={18} />
                                </div>

                                {/* Label + bar + peek */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-sm font-bold ${isActive ? seg.text : 'text-slate-800'}`}>
                                                {seg.label}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                                {seg.description}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-xl font-black tabular-nums ${isActive ? seg.text : 'text-slate-700'}`}>
                                                {value}
                                            </span>
                                            <ArrowRight
                                                size={14}
                                                className={`transition-transform ${isActive ? 'translate-x-0.5 ' + seg.text : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${seg.bar} rounded-full transition-all duration-700 ease-out`}
                                            style={{
                                                width: value > 0 ? `${Math.max(8, ratio * 100)}%` : '0%',
                                            }}
                                        />
                                    </div>

                                    {/* Peek titles */}
                                    {peek && peek.length > 0 && value > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {peek.map((t, idx) => (
                                                <span
                                                    key={`${seg.key}-${idx}`}
                                                    className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                                        isActive
                                                            ? 'bg-white/80 text-slate-700'
                                                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            {value > peek.length && (
                                                <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 italic">
                                                    +{value - peek.length} daha
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer hint */}
            {total === 0 && (
                <div className="mt-4 text-center text-[11px] text-slate-400 italic">
                    Bu zaman dilimi için henüz öngörü tespit edilmedi.
                </div>
            )}
        </div>
    );
}
