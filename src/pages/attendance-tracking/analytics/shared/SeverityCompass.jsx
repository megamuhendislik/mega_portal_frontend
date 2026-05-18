import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Compass } from 'lucide-react';

/**
 * SeverityCompass — Öngörü severity dağılımı için 4-quadrant pusula görseli.
 *
 * Severity → cardinal direction (öncelik sırası):
 *   Kuzey (12:00) — Aksiyon (alert)        — en kritik
 *   Doğu  (3:00)  — Uyarı (warning)
 *   Güney (6:00)  — Bilgi (info)
 *   Batı  (9:00)  — Pozitif (positive)
 *
 * Tıklanabilir — onSegmentClick(key) ile filter trigger.
 * Aktif segment: glow + pulse + bold stroke.
 *
 * Props:
 *  - counts: { alert, warning, info, positive }
 *  - activeKey: string | null
 *  - onSegmentClick: (key | null) => void  (aynı segmenti tekrar tıklarsa null gelir)
 *  - title?: string
 *  - subtitle?: string
 */

const SEGMENTS = [
    {
        key: 'alert',
        label: 'Aksiyon',
        direction: 'K',
        directionLabel: 'Kuzey',
        icon: AlertCircle,
        color: '#dc2626',
        colorDark: '#991b1b',
        colorLight: '#fecaca',
        gradient: 'from-red-50 to-red-100',
        textColor: 'text-red-700',
        ringColor: 'ring-red-400',
        priority: 1,
        startAngle: -45,
        endAngle: 45,
        midAngle: 0,
        description: 'Acil müdahale gereken',
    },
    {
        key: 'warning',
        label: 'Uyarı',
        direction: 'D',
        directionLabel: 'Doğu',
        icon: AlertTriangle,
        color: '#d97706',
        colorDark: '#92400e',
        colorLight: '#fde68a',
        gradient: 'from-amber-50 to-amber-100',
        textColor: 'text-amber-700',
        ringColor: 'ring-amber-400',
        priority: 2,
        startAngle: 45,
        endAngle: 135,
        midAngle: 90,
        description: 'İzlenmesi gereken',
    },
    {
        key: 'info',
        label: 'Bilgi',
        direction: 'G',
        directionLabel: 'Güney',
        icon: Info,
        color: '#2563eb',
        colorDark: '#1e3a8a',
        colorLight: '#bfdbfe',
        gradient: 'from-blue-50 to-blue-100',
        textColor: 'text-blue-700',
        ringColor: 'ring-blue-400',
        priority: 3,
        startAngle: 135,
        endAngle: 225,
        midAngle: 180,
        description: 'Genel bilgi',
    },
    {
        key: 'positive',
        label: 'Pozitif',
        direction: 'B',
        directionLabel: 'Batı',
        icon: CheckCircle2,
        color: '#059669',
        colorDark: '#065f46',
        colorLight: '#a7f3d0',
        gradient: 'from-emerald-50 to-emerald-100',
        textColor: 'text-emerald-700',
        ringColor: 'ring-emerald-400',
        priority: 4,
        startAngle: 225,
        endAngle: 315,
        midAngle: 270,
        description: 'Olumlu bulgu',
    },
];

// Polar → Cartesian (SVG'nin tepeden başlaması için 90° offset)
function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

// Halka segmenti SVG path
function ringSegmentPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
    const startOuter = polar(cx, cy, rOuter, startAngle);
    const endOuter = polar(cx, cy, rOuter, endAngle);
    const startInner = polar(cx, cy, rInner, startAngle);
    const endInner = polar(cx, cy, rInner, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
        'Z',
    ].join(' ');
}

export default function SeverityCompass({
    counts = {},
    activeKey = null,
    onSegmentClick,
    title = 'Öngörü Pusulası',
    subtitle,
    size = 320,
}) {
    const total = useMemo(
        () => SEGMENTS.reduce((sum, s) => sum + (counts[s.key] || 0), 0),
        [counts],
    );

    // Eğer hiç içgörü yoksa daha hafif görünüm
    const hasAny = total > 0;

    // SVG geometry
    const cx = 200;
    const cy = 200;
    const rOuter = 180;
    const rInner = 90;
    const rDirectionMarker = 195;  // K/D/G/B etiket konumu
    const rIconMid = (rOuter + rInner) / 2;

    const handleClick = (key) => {
        if (!onSegmentClick) return;
        // Aynı segment tekrar tıklanırsa null (filter kapat)
        onSegmentClick(key === activeKey ? null : key);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-white p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50">
                        <Compass size={16} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800">{title}</h3>
                        {subtitle && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                {activeKey && (
                    <button
                        type="button"
                        onClick={() => onSegmentClick && onSegmentClick(null)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Filtreyi kaldır ✕
                    </button>
                )}
            </div>

            {/* Compass body */}
            <div className="flex items-center justify-center">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg
                        viewBox="0 0 400 400"
                        className="w-full h-full drop-shadow-md"
                    >
                        {/* Background ring (cream) */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={rOuter + 8}
                            fill="#fafaf9"
                            stroke="#e7e5e4"
                            strokeWidth="1"
                        />

                        {/* 4 Segments */}
                        {SEGMENTS.map((seg) => {
                            const isActive = activeKey === seg.key;
                            const isDim = activeKey && !isActive;
                            const path = ringSegmentPath(cx, cy, rOuter, rInner, seg.startAngle, seg.endAngle);
                            return (
                                <g key={seg.key}>
                                    <defs>
                                        <linearGradient
                                            id={`grad-${seg.key}`}
                                            x1="0%" y1="0%" x2="100%" y2="100%"
                                        >
                                            <stop offset="0%" stopColor={seg.color} stopOpacity={isDim ? 0.25 : (isActive ? 1 : 0.85)} />
                                            <stop offset="100%" stopColor={seg.colorDark} stopOpacity={isDim ? 0.2 : (isActive ? 1 : 0.75)} />
                                        </linearGradient>
                                    </defs>
                                    {/* Active glow ring (outer) */}
                                    {isActive && (
                                        <path
                                            d={ringSegmentPath(cx, cy, rOuter + 6, rOuter - 2, seg.startAngle, seg.endAngle)}
                                            fill={seg.color}
                                            opacity="0.35"
                                            style={{ filter: 'blur(2px)' }}
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values="0.2;0.5;0.2"
                                                dur="2s"
                                                repeatCount="indefinite"
                                            />
                                        </path>
                                    )}
                                    {/* Segment */}
                                    <path
                                        d={path}
                                        fill={`url(#grad-${seg.key})`}
                                        stroke={isActive ? seg.colorDark : 'white'}
                                        strokeWidth={isActive ? '3' : '2'}
                                        className="cursor-pointer transition-all"
                                        style={{ filter: isActive ? `drop-shadow(0 0 10px ${seg.color}55)` : 'none' }}
                                        onClick={() => handleClick(seg.key)}
                                    >
                                        <title>{seg.label} — {seg.description}</title>
                                    </path>
                                </g>
                            );
                        })}

                        {/* Cardinal direction text + count icons */}
                        {SEGMENTS.map((seg) => {
                            const value = counts[seg.key] || 0;
                            const isActive = activeKey === seg.key;
                            const isDim = activeKey && !isActive;
                            const mid = polar(cx, cy, rIconMid, seg.midAngle);
                            const dirPos = polar(cx, cy, rDirectionMarker, seg.midAngle);
                            return (
                                <g key={`txt-${seg.key}`} className="pointer-events-none">
                                    {/* Count (big number) — segmentin ortasında */}
                                    <text
                                        x={mid.x}
                                        y={mid.y - 8}
                                        textAnchor="middle"
                                        fontSize="34"
                                        fontWeight="900"
                                        fill={isDim ? '#cbd5e1' : 'white'}
                                        style={{
                                            paintOrder: 'stroke',
                                            stroke: isDim ? 'none' : seg.colorDark,
                                            strokeWidth: '0.5',
                                        }}
                                    >
                                        {value}
                                    </text>
                                    {/* Label */}
                                    <text
                                        x={mid.x}
                                        y={mid.y + 14}
                                        textAnchor="middle"
                                        fontSize="13"
                                        fontWeight="800"
                                        fill={isDim ? '#cbd5e1' : 'white'}
                                        opacity={isDim ? 0.7 : 1}
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                                    >
                                        {seg.label.toUpperCase()}
                                    </text>
                                    {/* Cardinal marker (K/D/G/B) outside ring */}
                                    <circle
                                        cx={dirPos.x}
                                        cy={dirPos.y}
                                        r="12"
                                        fill="white"
                                        stroke={isActive ? seg.colorDark : '#94a3b8'}
                                        strokeWidth={isActive ? '2' : '1'}
                                    />
                                    <text
                                        x={dirPos.x}
                                        y={dirPos.y + 4}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="900"
                                        fill={isActive ? seg.colorDark : '#475569'}
                                    >
                                        {seg.direction}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Center hub */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={rInner - 4}
                            fill="white"
                            stroke="#e2e8f0"
                            strokeWidth="2"
                        />
                        {/* Inner ring decoration */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={rInner - 14}
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                        {/* Center total */}
                        <text
                            x={cx}
                            y={cy - 4}
                            textAnchor="middle"
                            fontSize="42"
                            fontWeight="900"
                            fill={hasAny ? '#1e293b' : '#cbd5e1'}
                        >
                            {total}
                        </text>
                        <text
                            x={cx}
                            y={cy + 22}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="#64748b"
                            letterSpacing="2"
                        >
                            ÖNGÖRÜ
                        </text>

                        {/* Compass needle (sadece dekorasyon) */}
                        <g className="pointer-events-none" opacity="0.6">
                            <line
                                x1={cx}
                                y1={cy - rInner + 12}
                                x2={cx}
                                y2={cy - rInner + 4}
                                stroke="#dc2626"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </g>
                    </svg>
                </div>
            </div>

            {/* Priority order legend (alt) */}
            <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">
                    Önem Sırası
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SEGMENTS.map((seg) => {
                        const value = counts[seg.key] || 0;
                        const isActive = activeKey === seg.key;
                        const Icon = seg.icon;
                        return (
                            <button
                                key={seg.key}
                                type="button"
                                onClick={() => handleClick(seg.key)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                                    isActive
                                        ? `bg-gradient-to-br ${seg.gradient} ring-2 ${seg.ringColor} shadow-sm`
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-white flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${seg.color}, ${seg.colorDark})` }}
                                >
                                    <Icon size={12} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? seg.textColor : 'text-slate-600'}`}>
                                        {seg.priority}. {seg.label}
                                    </div>
                                    <div className="text-[9px] text-slate-400 truncate">
                                        {seg.description}
                                    </div>
                                </div>
                                <span className={`text-base font-black tabular-nums ${isActive ? seg.textColor : 'text-slate-700'}`}>
                                    {value}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
