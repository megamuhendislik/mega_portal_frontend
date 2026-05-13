import React, { useMemo } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts';
import { LayoutGrid } from 'lucide-react';
import SectionCard from './SectionCard';
import { addJitter, pruneLabelCollisions } from '../tabs/performance/helpers';

/**
 * Generic 4-quadrant risk haritasi (kompakt). Diger tablar tarafindan
 * kullanilmak uzere yazildi. PerformanceTab.ScatterMatrix daha gelismis.
 *
 * Props:
 *   data: [{ id, name, x, y, z?, color?, label? }]
 *   xLabel/yLabel: eksen baslıkları
 *   xMax/yMax: domain (default 100)
 *   thresholds: { x: number, y: number } — quadrant cizgileri
 *   quadrantLabels: { tl, tr, bl, br } — opsiyonel
 *   onPointClick(point)
 *   colorFn(point) -> hex (default mavi)
 *   sizeRange: [min, max] (default [40, 800])
 *   height: px (default 320)
 *   showLabels: boolean — top N nokta etiketi
 */
export default function RiskMatrixCard({
    title = 'Risk Haritası',
    subtitle,
    icon = LayoutGrid,
    iconGradient = 'from-purple-500 to-pink-600',
    data = [],
    xLabel = 'X', yLabel = 'Y',
    xMax = 100, yMax = 100,
    thresholds = { x: 50, y: 50 },
    quadrantLabels = {
        tl: { label: 'Sol-Üst', color: '#f59e0b', bg: '#fef3c7' },
        tr: { label: 'Sağ-Üst', color: '#ef4444', bg: '#fee2e2' },
        bl: { label: 'Sol-Alt', color: '#10b981', bg: '#d1fae5' },
        br: { label: 'Sağ-Alt', color: '#f97316', bg: '#fed7aa' },
    },
    onPointClick,
    colorFn,
    sizeRange = [30, 180],
    height = 360,
    showLabels = true,
    collapsible = true,
    defaultOpen = true,
}) {
    const points = useMemo(() => {
        return data.map((d) => {
            const x_raw = Math.min(xMax, Math.max(0, d.x || 0));
            const y_raw = Math.min(yMax, Math.max(0, d.y || 0));
            // Jitter — yiginlanmayi onler (deterministik)
            const jitterAmount = Math.max(xMax, yMax) * 0.02; // %2 of axis range
            const j = addJitter(x_raw, y_raw, d.id, jitterAmount);
            const isHighX = x_raw >= thresholds.x;
            const isHighY = y_raw >= thresholds.y;
            const quad = isHighY && !isHighX ? 'tl' : isHighY && isHighX ? 'tr' : !isHighY && !isHighX ? 'bl' : 'br';
            return { ...d, x: j.x, y: j.y, x_raw, y_raw, quad };
        });
    }, [data, xMax, yMax, thresholds]);

    // Adaptive yMax — veri 0-15'te sikismaz
    const adaptiveYMax = useMemo(() => {
        const ys = points.map((p) => p.y_raw || 0);
        if (ys.length === 0) return yMax;
        const sorted = [...ys].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const maxY = Math.max(...ys);
        const cap = Math.max(p95 * 1.4, maxY * 1.1, thresholds.y * 1.5);
        return Math.min(yMax, Math.ceil(cap / 5) * 5);
    }, [points, yMax, thresholds.y]);

    const counts = useMemo(() => {
        const c = { tl: 0, tr: 0, bl: 0, br: 0 };
        points.forEach((p) => { c[p.quad] = (c[p.quad] || 0) + 1; });
        return c;
    }, [points]);

    const labeledIds = useMemo(() => {
        if (!showLabels) return new Set();
        const sorted = [...points].sort((a, b) => {
            const aS = Math.abs(a.x_raw - thresholds.x) + Math.abs(a.y_raw - thresholds.y);
            const bS = Math.abs(b.x_raw - thresholds.x) + Math.abs(b.y_raw - thresholds.y);
            return bS - aS;
        });
        const candidates = new Set(sorted.slice(0, 6).map((p) => p.id));
        // Daha siki cakisma onleme
        const minX = xMax * 0.14;
        const minY = adaptiveYMax * 0.14;
        return pruneLabelCollisions(points, candidates, minX, minY);
    }, [points, showLabels, thresholds, xMax, adaptiveYMax]);

    const labeledIdsArray = useMemo(() => Array.from(labeledIds), [labeledIds]);
    const LABEL_OFFSETS = [
        { dx: 0,   dy: -24, anchor: 'middle' },
        { dx: 28,  dy: -14, anchor: 'start' },
        { dx: 28,  dy: 14,  anchor: 'start' },
        { dx: -28, dy: -14, anchor: 'end' },
        { dx: -28, dy: 14,  anchor: 'end' },
        { dx: 0,   dy: 24,  anchor: 'middle' },
    ];

    return (
        <SectionCard
            title={title}
            subtitle={subtitle || `${points.length} kayıt`}
            icon={icon}
            iconGradient={iconGradient}
            collapsible={collapsible}
            defaultOpen={defaultOpen}
        >
            {/* Quadrant ozet */}
            <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                    { k: 'bl', side: 'sol' }, { k: 'tl', side: 'sol' },
                    { k: 'br', side: 'sag' }, { k: 'tr', side: 'sag' },
                ].slice(0, 4).map(({ k }) => {
                    const m = quadrantLabels[k];
                    return (
                        <div
                            key={k}
                            className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md"
                            style={{ backgroundColor: m.bg }}
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                                <span className="text-[10px] font-bold text-slate-700 truncate">{m.label}</span>
                            </div>
                            <span className="text-[14px] font-black tabular-nums flex-shrink-0" style={{ color: m.color }}>
                                {counts[k]}
                            </span>
                        </div>
                    );
                })}
            </div>

            {points.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">Veri yok</div>
            ) : (
                <div style={{ height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 25, bottom: 35, left: 25 }}>
                            <ReferenceArea x1={0} x2={thresholds.x} y1={0} y2={thresholds.y} fill={quadrantLabels.bl.color} fillOpacity={0.08} />
                            <ReferenceArea x1={thresholds.x} x2={xMax} y1={0} y2={thresholds.y} fill={quadrantLabels.br.color} fillOpacity={0.08} />
                            <ReferenceArea x1={0} x2={thresholds.x} y1={thresholds.y} y2={adaptiveYMax} fill={quadrantLabels.tl.color} fillOpacity={0.08} />
                            <ReferenceArea x1={thresholds.x} x2={xMax} y1={thresholds.y} y2={adaptiveYMax} fill={quadrantLabels.tr.color} fillOpacity={0.08} />

                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                type="number" dataKey="x"
                                domain={[0, xMax]}
                                tick={{ fontSize: 10, fontWeight: 600 }}
                                label={{ value: xLabel, position: 'insideBottom', offset: -10, style: { fontSize: 11, fontWeight: 700, fill: '#475569' } }}
                            />
                            <YAxis
                                type="number" dataKey="y"
                                domain={[0, adaptiveYMax]}
                                tick={{ fontSize: 10, fontWeight: 600 }}
                                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fontWeight: 700, fill: '#475569' } }}
                            />
                            <ZAxis type="number" dataKey="z" range={sizeRange} />
                            <ReferenceLine x={thresholds.x} stroke="#475569" strokeDasharray="4 3" strokeWidth={1.5} />
                            <ReferenceLine y={thresholds.y} stroke="#475569" strokeDasharray="4 3" strokeWidth={1.5} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload[0]) return null;
                                    const p = payload[0].payload;
                                    return (
                                        <div className="rounded-lg bg-white shadow-xl border border-slate-200 px-3 py-2 text-xs">
                                            <div className="font-bold text-slate-800">{p.name || p.label}</div>
                                            <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
                                                {xLabel}: <b>{Math.round(p.x_raw ?? p.x)}</b>
                                                {' · '}
                                                {yLabel.split('/')[0]}: <b>{Math.round(p.y_raw ?? p.y)}</b>
                                            </div>
                                            {p.tooltipExtra && <div className="text-[10px] text-slate-600 mt-1">{p.tooltipExtra}</div>}
                                        </div>
                                    );
                                }}
                            />
                            <Scatter
                                data={points}
                                onClick={(d) => d && onPointClick?.(d)}
                                cursor={onPointClick ? 'pointer' : 'default'}
                            >
                                {points.map((p, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={p.color || (colorFn ? colorFn(p) : quadrantLabels[p.quad].color)}
                                        fillOpacity={0.85}
                                        stroke="#fff"
                                        strokeWidth={1}
                                    />
                                ))}
                                {showLabels && (
                                    <LabelList
                                        dataKey="label"
                                        content={({ x, y, width, height, value, index }) => {
                                            const p = points[index];
                                            if (!p || !labeledIds.has(p.id)) return null;
                                            // Recharts Scatter LabelList'inde (x, y) balonun sol-ust kosesi;
                                            // merkez = x + width/2, y + height/2.
                                            const cx = x + (width || 0) / 2;
                                            const cy = y + (height || 0) / 2;
                                            const labelIdx = labeledIdsArray.indexOf(p.id);
                                            const offset = LABEL_OFFSETS[labelIdx % LABEL_OFFSETS.length] || LABEL_OFFSETS[0];
                                            const lx = cx + offset.dx;
                                            const ly = cy + offset.dy;
                                            const display = value?.length > 12 ? `${value.slice(0, 10)}…` : value;
                                            const fillBg = p.color || (colorFn ? colorFn(p) : quadrantLabels[p.quad].color);
                                            const padX = 4, charW = 6.0, h = 13;
                                            const w = (display?.length || 0) * charW + padX * 2;
                                            const rectX = offset.anchor === 'start' ? lx - padX
                                                : offset.anchor === 'end' ? lx - w + padX
                                                : lx - w / 2;
                                            return (
                                                <g style={{ pointerEvents: 'none' }}>
                                                    <line x1={cx} y1={cy} x2={lx} y2={ly}
                                                        stroke={fillBg} strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
                                                    <rect x={rectX} y={ly - h / 2 - 1} width={w} height={h} rx={3}
                                                        fill="white" stroke={fillBg} strokeWidth={0.8} opacity={0.95} />
                                                    <text x={lx} y={ly + 3} fontSize={10} fontWeight={700}
                                                        fill="#1e293b" textAnchor={offset.anchor}>
                                                        {display}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                    />
                                )}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
        </SectionCard>
    );
}
