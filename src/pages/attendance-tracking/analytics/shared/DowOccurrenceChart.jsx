import React, { useMemo, useCallback } from 'react';
import { Tag } from 'antd';
import { Calendar } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

function DowTooltip({ active, payload, avgPerOcc }) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {p.day} {p.isHeaviest && <span className="text-rose-500">★ en yoğun</span>}
            </div>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
                <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Gün başına:</span>
                    <span className="font-black tabular-nums text-slate-800">
                        {p.per_occurrence.toFixed(2)}sa
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Toplam:</span>
                    <span className="font-bold tabular-nums text-slate-700">
                        {p.total.toFixed(1)}sa
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Tekrar:</span>
                    <span className="font-bold tabular-nums text-slate-700">
                        {p.occurrences}×
                    </span>
                </div>
            </div>
            {avgPerOcc > 0 && (
                <div className="text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                    Ortalama: {avgPerOcc.toFixed(2)}sa/gün
                </div>
            )}
        </div>
    );
}

/**
 * DowOccurrenceChart — Gün-bazlı OT yoğunluğu (per-occurrence normalize).
 *
 * KRİTİK: Frontend artık `per_occurrence` (saat/gün) gösterir — `total hours`
 * değil. Aksi halde "5 Pazartesi vs 4 Cuma" gibi takvim biası görsel olarak
 * gerçeği yansıtmaz. Backend bunu zaten `dow_distribution[].per_occurrence`
 * alanında veriyor.
 *
 * Tooltip'te 3 değer gösterilir:
 *  - per_occurrence: gün başına ortalama saat
 *  - total: dönem içi toplam
 *  - occurrences: bu DOW kaç kez geçti
 *
 * Vurgulanan bar = heaviest day (kırmızı/turuncu), diğerleri amber.
 *
 * Props:
 *  - dowDistribution: backend evidence.dow_distribution
 *      [{day, hours, occurrences, per_occurrence}, ...]
 *  - heaviestDay: backend evidence.heaviest_day
 *  - height: number (default 220)
 */
export default function DowOccurrenceChart({
    dowDistribution = [],
    heaviestDay = null,
    height = 220,
}) {
    const data = useMemo(
        () => dowDistribution.map((d) => ({
            day: d.day,
            per_occurrence: Number(d.per_occurrence) || 0,
            total: Number(d.hours) || 0,
            occurrences: d.occurrences || 0,
            isHeaviest: d.day === heaviestDay,
        })),
        [dowDistribution, heaviestDay],
    );

    // Ortalama per-occurrence (sıfır olmayan)
    const avgPerOcc = useMemo(() => {
        const nonZero = data.filter((d) => d.per_occurrence > 0);
        if (nonZero.length === 0) return 0;
        return nonZero.reduce((s, d) => s + d.per_occurrence, 0) / nonZero.length;
    }, [data]);

    const renderTooltip = useCallback(
        (props) => <DowTooltip {...props} avgPerOcc={avgPerOcc} />,
        [avgPerOcc],
    );

    if (data.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                Bu dönemde hiç OT yok.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        Gün başına Ortalama OT (per-occurrence normalize)
                    </span>
                </div>
                {heaviestDay && (
                    <Tag color="orange" className="!m-0 text-[10px]">
                        En yoğun gün: {heaviestDay}
                    </Tag>
                )}
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        label={{
                            value: 'sa/gün',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 10,
                            style: { fontSize: 10, fill: '#64748b' },
                        }}
                    />
                    <RTooltip content={renderTooltip} cursor={{ fill: 'rgba(245,158,11,0.05)' }} />
                    {avgPerOcc > 0 && (
                        <ReferenceLine
                            y={avgPerOcc}
                            stroke="#64748b"
                            strokeDasharray="4 4"
                            strokeOpacity={0.7}
                            label={{
                                value: `Ort. ${avgPerOcc.toFixed(2)}sa/gün`,
                                position: 'right',
                                fill: '#475569',
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />
                    )}
                    <Bar dataKey="per_occurrence" radius={[6, 6, 0, 0]}>
                        {data.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={entry.isHeaviest ? '#dc2626' : '#f59e0b'}
                                fillOpacity={entry.isHeaviest ? 1 : 0.85}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Detay tablo */}
            <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="text-slate-400 uppercase">
                            <th className="text-left font-bold py-1">Gün</th>
                            <th className="text-right font-bold py-1">Tekrar</th>
                            <th className="text-right font-bold py-1">Toplam</th>
                            <th className="text-right font-bold py-1">Gün başına</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((d) => (
                            <tr
                                key={d.day}
                                className={`border-t border-slate-100 ${d.isHeaviest ? 'bg-rose-50/40' : ''}`}
                            >
                                <td className={`py-1 font-semibold ${d.isHeaviest ? 'text-rose-700' : 'text-slate-700'}`}>
                                    {d.day} {d.isHeaviest && <span className="text-rose-500">★</span>}
                                </td>
                                <td className="py-1 text-right tabular-nums text-slate-600">{d.occurrences}×</td>
                                <td className="py-1 text-right tabular-nums text-slate-600">{d.total.toFixed(1)}sa</td>
                                <td className={`py-1 text-right tabular-nums font-bold ${d.isHeaviest ? 'text-rose-700' : 'text-slate-800'}`}>
                                    {d.per_occurrence.toFixed(2)}sa
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
