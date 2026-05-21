import React, { useMemo, useState } from 'react';
import {
    AlertCircle, AlertTriangle, Info, CheckCircle2,
    AlertOctagon, Sparkles,
} from 'lucide-react';

/**
 * InsightRadar — Pusula/radar tarzı öngörü görseli (2026-05-21 Stage 67b).
 *
 * Layout:
 *   - 4 sektör (kuadrant), severity'e göre renkli:
 *       Aksiyon (alert)   → üst-sağ (kuzey-doğu, 315°-45°)
 *       Uyarı   (warning) → alt-sağ (güney-doğu, 45°-135°)
 *       Bilgi   (info)    → alt-sol (güney-batı, 135°-225°)
 *       Pozitif (positive)→ üst-sol (kuzey-batı, 225°-315°)
 *   - Konsantrik halkalar: 0, 2.5, 5, 7.5, 10 skor referansı
 *   - Her insight bir "nokta" — yüksek priority_score merkeze yakın
 *   - Nokta büyüklüğü etkilenen kişi sayısına göre (4-14px)
 *   - Tıklayınca filter trigger (severity'e göre)
 *
 * Props:
 *   - insights: array — her insight'da priority_score, severity, affected_count, title, code
 *   - activeKey: string|null
 *   - onSegmentClick: (key|null) => void
 *   - onInsightClick: (insight) => void  — opsiyonel; bir noktaya tıklanınca detay
 *   - timeFrameLabel?: string
 */

const SECTORS = [
    {
        key: 'alert',
        label: 'Aksiyon',
        icon: AlertCircle,
        accent: '#dc2626',
        soft: '#fecaca',
        bg: '#fef2f2',
        textColor: 'text-red-700',
        // Açı aralığı: kuzey-doğu (SVG, 12:00 = -90°, saat yönünde +)
        // Convention: clockwise from 12 o'clock — biz K-D-G-B okuyacağız
        startAngle: 0,
        endAngle: 90,
        anchorAngle: 45,  // sektör ortası — başlık yerleştirme
    },
    {
        key: 'warning',
        label: 'Uyarı',
        icon: AlertTriangle,
        accent: '#d97706',
        soft: '#fde68a',
        bg: '#fffbeb',
        textColor: 'text-amber-700',
        startAngle: 90,
        endAngle: 180,
        anchorAngle: 135,
    },
    {
        key: 'info',
        label: 'Bilgi',
        icon: Info,
        accent: '#2563eb',
        soft: '#bfdbfe',
        bg: '#eff6ff',
        textColor: 'text-blue-700',
        startAngle: 180,
        endAngle: 270,
        anchorAngle: 225,
    },
    {
        key: 'positive',
        label: 'Pozitif',
        icon: CheckCircle2,
        accent: '#059669',
        soft: '#a7f3d0',
        bg: '#ecfdf5',
        textColor: 'text-emerald-700',
        startAngle: 270,
        endAngle: 360,
        anchorAngle: 315,
    },
];

// Polar (12:00 = 0°, saat yönü) → Cartesian
function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

// Pasta dilimi SVG path
function sectorPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
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

// Belirli bir insight için sektör içinde nokta konumu hesapla
function computeDotPosition(insight, sector, cx, cy, rMax, rMin, indexInSector, totalInSector) {
    // Distance from center: yüksek skor = dış kenara yakın
    // score 0 → rMin (merkeze yakın), score 10 → rMax (kenara yakın)
    const score = Math.max(0, Math.min(10, insight.priority_score || 0));
    const ratio = score / 10;  // 0 → 1
    const radius = rMin + (rMax - rMin) * ratio;

    // Açı: sektör içinde eşit dağıtım — overlap'i azaltmak için
    const arcSpan = sector.endAngle - sector.startAngle;
    // n öğe için açıyı bölümle: jitter ile asimetrik konumlama
    const offset = totalInSector === 1
        ? arcSpan / 2
        : (arcSpan * 0.15) + (arcSpan * 0.7 * (indexInSector / Math.max(1, totalInSector - 1)));
    const angle = sector.startAngle + offset;

    return { ...polar(cx, cy, radius, angle), radius, angle };
}

// Noktanın yarıçapı — affected_count'a göre
function dotSize(affectedCount) {
    if (!affectedCount || affectedCount <= 0) return 5;
    if (affectedCount >= 20) return 14;
    if (affectedCount >= 10) return 11;
    if (affectedCount >= 5) return 9;
    return 7;
}

export default function InsightRadar({
    insights = [],
    activeKey = null,
    onSegmentClick,
    onInsightClick,
    timeFrameLabel,
}) {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    const VIEW = 480;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const rOuter = 200;
    const rInner = 28;  // küçük center hub

    // Insights → sektör gruplaması
    const sectorInsights = useMemo(() => {
        const grouped = { alert: [], warning: [], info: [], positive: [] };
        insights.forEach((ins) => {
            const key = ins.severity || 'info';
            if (grouped[key]) grouped[key].push(ins);
        });
        // Her sektörü skora göre desc sırala (yüksek skor en başta)
        Object.keys(grouped).forEach((k) => {
            grouped[k].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        });
        return grouped;
    }, [insights]);

    // Tüm dotları hesapla (render için tek geçişte)
    const dots = useMemo(() => {
        const result = [];
        SECTORS.forEach((sector) => {
            const list = sectorInsights[sector.key] || [];
            list.forEach((ins, idx) => {
                const pos = computeDotPosition(
                    ins, sector, cx, cy, rOuter - 18, rInner + 18,
                    idx, list.length,
                );
                result.push({
                    ...pos,
                    insight: ins,
                    sector,
                    dotR: dotSize(ins.affected_count),
                });
            });
        });
        return result;
    }, [sectorInsights, cx, cy, rOuter]);

    const totalCount = insights.length;
    const topInsight = useMemo(
        () => insights.reduce(
            (top, ins) => (!top || (ins.priority_score || 0) > (top.priority_score || 0)) ? ins : top,
            null,
        ),
        [insights],
    );

    const handleSectorClick = (key) => {
        if (!onSegmentClick) return;
        onSegmentClick(key === activeKey ? null : key);
    };

    const handleDotClick = (e, insight) => {
        e.stopPropagation();
        if (onInsightClick && insight?.code) {
            onInsightClick(insight);
        } else if (onSegmentClick) {
            // Default: severity'e göre filtre
            onSegmentClick(insight.severity === activeKey ? null : insight.severity);
        }
    };

    // Score reference rings: içerden dışarı 2.5, 5, 7.5, 10
    const refScores = [2.5, 5, 7.5, 10];

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-500" />
                        Öngörü Pusulası
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {timeFrameLabel ? `${timeFrameLabel} · ` : ''}
                        {totalCount} öngörü · dış kenara çıkan = yüksek önem (0-10)
                    </p>
                </div>
                {topInsight && (
                    <div className="text-right">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            En kritik
                        </div>
                        <div className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                            {topInsight.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Skor: <span className="font-black tabular-nums" style={{ color: SECTORS.find((s) => s.key === topInsight.severity)?.accent }}>
                                {topInsight.priority_score?.toFixed(1)}
                            </span>
                            <span className="text-slate-300"> / 10</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Radar SVG */}
            <div className="flex items-center justify-center">
                <div className="relative" style={{ width: '100%', maxWidth: VIEW }}>
                    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-auto">
                        {/* 4 sektör arkaplan */}
                        {SECTORS.map((sector) => {
                            const isActive = activeKey === sector.key;
                            const isDim = activeKey && !isActive;
                            const path = sectorPath(cx, cy, rOuter, rInner, sector.startAngle, sector.endAngle);
                            return (
                                <g key={sector.key}>
                                    <defs>
                                        <radialGradient id={`grad-${sector.key}`} cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor={sector.accent} stopOpacity={isDim ? 0.04 : (isActive ? 0.20 : 0.10)} />
                                            <stop offset="100%" stopColor={sector.accent} stopOpacity={isDim ? 0.02 : (isActive ? 0.10 : 0.04)} />
                                        </radialGradient>
                                    </defs>
                                    <path
                                        d={path}
                                        fill={`url(#grad-${sector.key})`}
                                        stroke={sector.accent}
                                        strokeOpacity={isDim ? 0.15 : (isActive ? 0.6 : 0.30)}
                                        strokeWidth={isActive ? 2 : 1}
                                        className="cursor-pointer transition-all"
                                        onClick={() => handleSectorClick(sector.key)}
                                    >
                                        <title>{sector.label} sektörü — tıklayarak filtrele</title>
                                    </path>
                                </g>
                            );
                        })}

                        {/* Konsantrik ring'ler (score referansı) */}
                        {refScores.map((s) => {
                            const r = rInner + 18 + (rOuter - 18 - (rInner + 18)) * (s / 10);
                            return (
                                <g key={`ring-${s}`} className="pointer-events-none">
                                    <circle
                                        cx={cx} cy={cy} r={r}
                                        fill="none"
                                        stroke="#cbd5e1"
                                        strokeWidth="0.5"
                                        strokeDasharray="2 3"
                                        opacity="0.6"
                                    />
                                    <text
                                        x={cx + 2}
                                        y={cy - r - 2}
                                        fontSize="8"
                                        fill="#94a3b8"
                                        fontWeight="600"
                                    >
                                        {s}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Sektör başlıkları (köşelerde) */}
                        {SECTORS.map((sector) => {
                            const value = (sectorInsights[sector.key] || []).length;
                            const isActive = activeKey === sector.key;
                            const isDim = activeKey && !isActive;
                            const labelPos = polar(cx, cy, rOuter + 28, sector.anchorAngle);
                            return (
                                <g
                                    key={`label-${sector.key}`}
                                    className="cursor-pointer"
                                    onClick={() => handleSectorClick(sector.key)}
                                >
                                    <rect
                                        x={labelPos.x - 36}
                                        y={labelPos.y - 14}
                                        width="72"
                                        height="28"
                                        rx="14"
                                        fill={isActive ? sector.accent : 'white'}
                                        stroke={sector.accent}
                                        strokeWidth={isActive ? 0 : 1.5}
                                        opacity={isDim ? 0.4 : 1}
                                        style={{
                                            filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none',
                                        }}
                                    />
                                    <text
                                        x={labelPos.x - 18}
                                        y={labelPos.y + 4}
                                        fontSize="11"
                                        fontWeight="800"
                                        fill={isActive ? 'white' : sector.accent}
                                        opacity={isDim ? 0.5 : 1}
                                    >
                                        {sector.label}
                                    </text>
                                    <circle
                                        cx={labelPos.x + 18}
                                        cy={labelPos.y}
                                        r="9"
                                        fill={isActive ? 'white' : sector.soft}
                                    />
                                    <text
                                        x={labelPos.x + 18}
                                        y={labelPos.y + 3}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fontWeight="900"
                                        fill={sector.accent}
                                    >
                                        {value}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Center hub */}
                        <circle
                            cx={cx} cy={cy} r={rInner}
                            fill="white"
                            stroke="#e2e8f0"
                            strokeWidth="1.5"
                            className="pointer-events-none"
                        />
                        <text
                            x={cx} y={cy - 2}
                            textAnchor="middle"
                            fontSize="18"
                            fontWeight="900"
                            fill="#1e293b"
                            className="pointer-events-none tabular-nums"
                        >
                            {totalCount}
                        </text>
                        <text
                            x={cx} y={cy + 10}
                            textAnchor="middle"
                            fontSize="7"
                            fontWeight="700"
                            fill="#64748b"
                            letterSpacing="1"
                            className="pointer-events-none"
                        >
                            ÖNGÖRÜ
                        </text>

                        {/* Dots — her insight bir nokta */}
                        {dots.map((d, idx) => {
                            const isHovered = hoveredIdx === idx;
                            const isDim = activeKey && d.insight.severity !== activeKey;
                            return (
                                <g
                                    key={`dot-${idx}`}
                                    onMouseEnter={() => setHoveredIdx(idx)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                    onClick={(e) => handleDotClick(e, d.insight)}
                                    className="cursor-pointer"
                                    opacity={isDim ? 0.25 : 1}
                                    style={{ transition: 'opacity 200ms' }}
                                >
                                    {/* Glow */}
                                    {isHovered && (
                                        <circle
                                            cx={d.x} cy={d.y}
                                            r={d.dotR + 6}
                                            fill={d.sector.accent}
                                            opacity="0.25"
                                            style={{ filter: 'blur(3px)' }}
                                        />
                                    )}
                                    <circle
                                        cx={d.x} cy={d.y}
                                        r={d.dotR}
                                        fill={d.sector.accent}
                                        stroke="white"
                                        strokeWidth={isHovered ? 2.5 : 1.5}
                                        style={{
                                            transition: 'all 200ms',
                                            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                            transformOrigin: `${d.x}px ${d.y}px`,
                                            filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                                        }}
                                    >
                                        <title>
                                            {d.insight.title} — Skor: {d.insight.priority_score?.toFixed(1)}/10
                                            {d.insight.affected_count > 0 ? ` · ${d.insight.affected_count} kişi` : ''}
                                        </title>
                                    </circle>
                                    {/* Skor merkez yakınsa içeride göster */}
                                    {d.dotR >= 9 && (
                                        <text
                                            x={d.x} y={d.y + 3}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fontWeight="900"
                                            fill="white"
                                            className="pointer-events-none tabular-nums"
                                        >
                                            {Math.round(d.insight.priority_score || 0)}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Hover tooltip — sabit bir bölgede */}
                        {hoveredIdx != null && dots[hoveredIdx] && (
                            <g className="pointer-events-none">
                                <rect
                                    x={cx - 120}
                                    y={VIEW - 50}
                                    width="240"
                                    height="36"
                                    rx="8"
                                    fill="white"
                                    stroke={dots[hoveredIdx].sector.accent}
                                    strokeWidth="1.5"
                                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                                />
                                <text
                                    x={cx}
                                    y={VIEW - 33}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="700"
                                    fill="#1e293b"
                                >
                                    {(dots[hoveredIdx].insight.title || '').length > 30
                                        ? (dots[hoveredIdx].insight.title || '').slice(0, 30) + '…'
                                        : dots[hoveredIdx].insight.title}
                                </text>
                                <text
                                    x={cx}
                                    y={VIEW - 20}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill={dots[hoveredIdx].sector.accent}
                                >
                                    Skor: {dots[hoveredIdx].insight.priority_score?.toFixed(1)} / 10
                                    {dots[hoveredIdx].insight.affected_count > 0
                                        ? ` · ${dots[hoveredIdx].insight.affected_count} kişi etkileniyor`
                                        : ''}
                                </text>
                            </g>
                        )}
                    </svg>
                </div>
            </div>

            {/* Boş durum */}
            {totalCount === 0 && (
                <div className="mt-3 text-center text-[11px] text-slate-400 italic">
                    <AlertOctagon size={14} className="inline mr-1 -mt-0.5" />
                    Bu zaman dilimi için tespit edilen öngörü yok.
                </div>
            )}

            {/* Legend — sektör renkleri + skor bandı */}
            {totalCount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                        {SECTORS.map((s) => (
                            <div key={s.key} className="flex items-center gap-1.5">
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ background: s.accent }}
                                />
                                <span className="text-[10px] font-semibold text-slate-600">{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span>Merkez</span>
                        <span className="inline-block h-1.5 w-12 rounded-full bg-gradient-to-r from-slate-200 to-slate-500"></span>
                        <span className="font-bold">Kenar (yüksek önem)</span>
                    </div>
                </div>
            )}
        </div>
    );
}
