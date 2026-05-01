import React, { useMemo, useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import SectionCard from './SectionCard';

/**
 * WaffleChart — 10x10 grid (100 hücre = 100%). Her segment kendi
 * payı kadar hücre kaplar, renkli. Hover -> hücreler highlight.
 *
 * Props:
 *   segments: [{ key, label, value, color }]   (value: birim sayim/saat)
 *   total: toplam (segments toplamiyla denk gelmeli, aksi halde otomatik hesap)
 *   unit: 'sa' | 'kişi' | '%' vs.
 */
export default function WaffleChart({
    segments = [],
    unit = '',
    title = 'Pay Dağılımı',
    subtitle,
    collapsible = false,
    cellSize = 22,
}) {
    const [hovered, setHovered] = useState(null);

    const total = useMemo(() => segments.reduce((s, x) => s + (x.value || 0), 0), [segments]);

    // Her segment icin hucre sayisi (toplam 100)
    const cells = useMemo(() => {
        if (total === 0) return [];
        const out = [];
        let allocated = 0;
        const sorted = [...segments].sort((a, b) => (b.value || 0) - (a.value || 0));
        sorted.forEach((seg, idx) => {
            const isLast = idx === sorted.length - 1;
            const count = isLast
                ? Math.max(0, 100 - allocated)
                : Math.round(((seg.value || 0) / total) * 100);
            allocated += count;
            for (let i = 0; i < count; i++) {
                out.push({ segment: seg, idx });
            }
        });
        return out.slice(0, 100);
    }, [segments, total]);

    if (total === 0) {
        return (
            <SectionCard title={title} icon={Grid3x3} iconGradient="from-emerald-500 to-cyan-600" collapsible={collapsible}>
                <div className="py-8 text-center text-slate-400 text-sm">Veri yok</div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title={title}
            subtitle={subtitle || `Toplam: ${Math.round(total)}${unit} · 1 hücre = %1`}
            icon={Grid3x3}
            iconGradient="from-emerald-500 to-cyan-600"
            collapsible={collapsible}
        >
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
                {/* 10x10 grid */}
                <div className="flex justify-center">
                    <div
                        className="grid gap-[3px]"
                        style={{
                            gridTemplateColumns: `repeat(10, ${cellSize}px)`,
                            gridTemplateRows: `repeat(10, ${cellSize}px)`,
                        }}
                    >
                        {Array.from({ length: 100 }).map((_, i) => {
                            const cell = cells[i];
                            if (!cell) {
                                return <div key={i} className="rounded-sm bg-slate-100" />;
                            }
                            const isHovered = hovered === cell.segment.key;
                            const isDimmed = hovered != null && !isHovered;
                            return (
                                <div
                                    key={i}
                                    className="rounded-sm transition-all cursor-pointer"
                                    style={{
                                        backgroundColor: cell.segment.color,
                                        opacity: isDimmed ? 0.18 : isHovered ? 1 : 0.85,
                                        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: isHovered ? `0 0 6px ${cell.segment.color}` : 'none',
                                    }}
                                    onMouseEnter={() => setHovered(cell.segment.key)}
                                    onMouseLeave={() => setHovered(null)}
                                    title={`${cell.segment.label}: ${Math.round(cell.segment.value)}${unit}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 self-center">
                    {[...segments].sort((a, b) => (b.value || 0) - (a.value || 0)).map((s) => {
                        const pct = total > 0 ? Math.round(((s.value || 0) / total) * 100) : 0;
                        const isHovered = hovered === s.key;
                        const isDimmed = hovered != null && !isHovered;
                        return (
                            <div
                                key={s.key}
                                onMouseEnter={() => setHovered(s.key)}
                                onMouseLeave={() => setHovered(null)}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                    isHovered ? 'border-slate-700 bg-slate-50 shadow-sm' :
                                    isDimmed ? 'border-slate-100 opacity-50' :
                                    'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: s.color }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-bold text-slate-800 truncate">{s.label}</div>
                                    <div className="text-[10px] text-slate-500 tabular-nums">
                                        {Math.round(s.value)}{unit}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-[14px] font-black tabular-nums" style={{ color: s.color }}>
                                        {pct}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </SectionCard>
    );
}
