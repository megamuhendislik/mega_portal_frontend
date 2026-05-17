import React, { useMemo, useCallback } from 'react';
import { Tag } from 'antd';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

// Top-level — render içinde tanımlanmamalı (state reset olur, lint hatası verir)
function PeriodTooltip({ active, payload, unit, pctChange, delta, isImprovement }) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {p.label}
            </div>
            <div className="text-base font-black tabular-nums text-slate-800 mt-0.5">
                {p.value.toFixed(unit === '%' ? 1 : 2)}<span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
            </div>
            {p.period === 'curr' && pctChange !== null && (
                <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                    Önceki döneme göre:{' '}
                    <span className={`font-bold ${
                        isImprovement === null ? 'text-slate-700'
                            : isImprovement ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{unit} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * PeriodComparisonChart — Önceki dönem vs Mevcut dönem karşılaştırma görseli.
 *
 * Özellikler:
 *  - 2 bar (Önceki gri, Mevcut renk-kodlu)
 *  - Delta % rozeti (sağ üst köşede, renkli)
 *  - Trend ok ikonu (▲ / ▼ / =)
 *  - "Önceki" değer üstüne ReferenceLine (mevcut bu sınırın üstünde mi altında mı görsel olarak net)
 *  - Tooltip'te raw + delta
 *  - betterIsHigher prop ile semantic: artış iyi mi kötü mü? → mevcut bar rengi belirler
 *
 * Props:
 *  - title: string
 *  - icon: ReactComponent (lucide)
 *  - prevLabel: string (default "Önceki Dönem")
 *  - currLabel: string (default "Mevcut Dönem")
 *  - prev: number
 *  - curr: number
 *  - unit: 'sa' | 'gün' | '%' | ''
 *  - betterIsHigher: true|false|null (null = neutral, gri)
 *  - extraStats?: [{label, value, accent}] alt grid'de gösterilecek
 */
export default function PeriodComparisonChart({
    title,
    icon: Icon,
    iconColor = 'text-indigo-600',
    prevLabel = 'Önceki Dönem',
    currLabel = 'Mevcut Dönem',
    prev = 0,
    curr = 0,
    unit = 'sa',
    betterIsHigher = null,
    extraStats = [],
    height = 220,
}) {
    const data = useMemo(() => ([
        { label: prevLabel, value: Number(prev) || 0, period: 'prev' },
        { label: currLabel, value: Number(curr) || 0, period: 'curr' },
    ]), [prev, curr, prevLabel, currLabel]);

    // Delta hesabı
    const delta = (Number(curr) || 0) - (Number(prev) || 0);
    const pctChange = (Number(prev) || 0) !== 0
        ? (delta / Math.abs(Number(prev))) * 100
        : null;

    // Mevcut bar rengi — semantic
    const isImprovement = useMemo(() => {
        if (delta === 0 || betterIsHigher === null) return null;
        return betterIsHigher ? delta > 0 : delta < 0;
    }, [delta, betterIsHigher]);

    const currColor = isImprovement === null ? '#6366f1'
        : isImprovement ? '#10b981'    // yeşil (iyi)
        : '#dc2626';                    // kırmızı (kötü)

    const deltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
    const DeltaIcon = deltaIcon;
    const deltaColor = isImprovement === null ? 'default'
        : isImprovement ? 'green' : 'red';

    const renderTooltip = useCallback(
        (props) => <PeriodTooltip {...props} unit={unit} pctChange={pctChange} delta={delta} isImprovement={isImprovement} />,
        [unit, pctChange, delta, isImprovement],
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    {Icon && <Icon size={13} className={iconColor} />}
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        {title}
                    </span>
                </div>
                {pctChange !== null ? (
                    <Tag color={deltaColor} className="!m-0 !flex items-center gap-1 text-[11px] font-bold">
                        <DeltaIcon size={11} />
                        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{unit}
                        <span className="opacity-70">
                            ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)
                        </span>
                    </Tag>
                ) : (
                    <Tag color="default" className="!m-0 text-[10px]">
                        karşılaştırma için Önceki = 0
                    </Tag>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <RTooltip content={renderTooltip} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    {/* Önceki seviye için referans çizgisi — mevcut'un fark görsel olarak okunsun */}
                    {prev > 0 && (
                        <ReferenceLine
                            y={prev}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeOpacity={0.6}
                            label={{
                                value: `Önceki: ${Number(prev).toFixed(1)}${unit}`,
                                position: 'right',
                                fill: '#64748b',
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />
                    )}
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {data.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={entry.period === 'curr' ? currColor : '#94a3b8'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Alt grid — sayısal özet */}
            <div className={`grid ${extraStats.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mt-3`}>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Önceki</p>
                    <p className="text-base font-black tabular-nums text-slate-800">
                        {Number(prev).toFixed(unit === '%' ? 1 : 2)}<span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
                    </p>
                </div>
                <div
                    className="rounded-lg p-2 text-center"
                    style={{ background: `${currColor}1a` }}
                >
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: currColor }}>
                        Mevcut
                    </p>
                    <p className="text-base font-black tabular-nums" style={{ color: currColor }}>
                        {Number(curr).toFixed(unit === '%' ? 1 : 2)}<span className="text-[10px] ml-0.5 opacity-70">{unit}</span>
                    </p>
                </div>
                {extraStats.map((s, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2 text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                        <p className={`text-base font-black tabular-nums ${s.accent || 'text-slate-800'}`}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
