import React, { useMemo } from 'react';
import { quadrantOf, QUADRANT_META, levelColor } from './helpers';

/**
 * Risk Haritasi'nin ismi-sayilan grid versiyonu.
 * 5x5 hucreli (X: Eksik/Y, Y: FM/Y) — her hucredeki kisi sayisi balon
 * boyutu + ortalama N.Doluluk renk yogunlugu olarak gosterilir.
 *
 * Kullanim: ScatterMatrix view_mode='heatmap' iken render edilir.
 * Hucreye tikla -> o hucredeki kisileri drill et.
 */
export default function HeatmapGridView({ points, onCellClick }) {
    // 5 X bin (eksik/y: 0-100, her 20%) x 5 Y bin (FM/Y: 0-50, her 10%)
    const X_BINS = 5;
    const Y_BINS = 5;
    const X_MAX = 100;
    const Y_MAX = 50;

    const grid = useMemo(() => {
        const cells = Array.from({ length: Y_BINS }, () =>
            Array.from({ length: X_BINS }, () => ({
                count: 0,
                sumNormal: 0,
                ids: [],
                items: [],
            }))
        );
        points.forEach((p) => {
            const xi = Math.min(X_BINS - 1, Math.floor((p.x / X_MAX) * X_BINS));
            const yi = Math.min(Y_BINS - 1, Math.floor((p.y / Y_MAX) * Y_BINS));
            const yIndex = Y_BINS - 1 - yi; // yukari = yuksek FM
            cells[yIndex][xi].count += 1;
            cells[yIndex][xi].sumNormal += (p.normal_completion || 0);
            cells[yIndex][xi].ids.push(p.id);
            cells[yIndex][xi].items.push(p);
        });
        return cells;
    }, [points]);

    const maxCount = useMemo(() => {
        let m = 0;
        grid.forEach((row) => row.forEach((c) => { if (c.count > m) m = c.count; }));
        return Math.max(1, m);
    }, [grid]);

    const totalPeople = points.length;

    return (
        <div className="bg-white rounded-lg p-4">
            <div className="grid grid-cols-[40px_1fr] gap-x-1 mb-1">
                <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end pr-1">FM/Y</div>
                <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: X_BINS }).map((_, i) => (
                        <div key={i} className="text-center text-[9px] text-slate-400 font-bold">
                            {Math.round(((i + 1) / X_BINS) * X_MAX)}%
                        </div>
                    ))}
                </div>
            </div>
            {grid.map((row, rIdx) => {
                const yLow = (Y_BINS - 1 - rIdx) * (Y_MAX / Y_BINS);
                const yHigh = (Y_BINS - rIdx) * (Y_MAX / Y_BINS);
                return (
                    <div key={rIdx} className="grid grid-cols-[40px_1fr] gap-x-1 mb-1">
                        <div className="text-[9px] text-slate-500 font-bold flex items-center justify-end pr-1 tabular-nums">
                            {Math.round(yLow)}-{Math.round(yHigh)}
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                            {row.map((cell, cIdx) => {
                                if (cell.count === 0) {
                                    return (
                                        <div
                                            key={cIdx}
                                            className="aspect-square rounded-md bg-slate-50 border border-slate-100"
                                        />
                                    );
                                }
                                const xMid = ((cIdx + 0.5) / X_BINS) * X_MAX;
                                const yMid = ((Y_BINS - 0.5 - rIdx) / Y_BINS) * Y_MAX;
                                const quad = quadrantOf(xMid, yMid);
                                const m = QUADRANT_META[quad];
                                const intensity = cell.count / maxCount;
                                const avgNormal = cell.sumNormal / cell.count;
                                const fontSize = Math.min(20, Math.max(14, 12 + intensity * 8));
                                return (
                                    <button
                                        key={cIdx}
                                        onClick={() => onCellClick?.({
                                            quadrant: quad,
                                            employees: cell.items,
                                            avgNormal,
                                        })}
                                        className="aspect-square rounded-md flex flex-col items-center justify-center transition-all hover:ring-2 hover:ring-slate-400 hover:scale-105 cursor-pointer relative overflow-hidden group"
                                        style={{
                                            backgroundColor: m.color,
                                            opacity: 0.25 + intensity * 0.6,
                                        }}
                                        title={`${cell.count} kişi · Avg N.Dol: ${Math.round(avgNormal)}% · ${m.label}`}
                                    >
                                        <span
                                            className="font-black text-white tabular-nums leading-none drop-shadow"
                                            style={{ fontSize }}
                                        >
                                            {cell.count}
                                        </span>
                                        <span
                                            className="text-[9px] font-bold text-white/90 tabular-nums drop-shadow mt-0.5"
                                            style={{ color: levelColor(avgNormal) === '#10b981' ? '#fff' : '#fff' }}
                                        >
                                            {Math.round(avgNormal)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <div className="grid grid-cols-[40px_1fr] gap-x-1 mt-1">
                <div></div>
                <div className="text-center text-[10px] text-slate-500 font-bold">
                    Eksik / Yükümlülük (%) →
                </div>
            </div>
            <div className="flex items-center justify-between mt-3 px-2">
                <div className="text-[10px] text-slate-500">
                    Toplam: <b>{totalPeople}</b> kişi · Hücreye tıkla → drill-down
                </div>
                <div className="flex items-center gap-2">
                    {Object.entries(QUADRANT_META).map(([k, m]) => (
                        <div key={k} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                            <span className="text-[9px] text-slate-500 font-bold">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
