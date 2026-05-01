import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import SectionCard from './SectionCard';

/**
 * SeverityPyramid — kritik/uyari/bilgi/pozitif hiyerarsisinde
 * trapezoid katman piramit. Her katmanin genisligi count ile orantili.
 * Tikla -> filtre.
 *
 * Props:
 *   levels: [{ key, label, count, color, gradient? }]  (ust=kritik, alt=positif)
 *   activeKey: string | null
 *   onLevelClick(key)
 */
export default function SeverityPyramid({
    levels = [],
    activeKey,
    onLevelClick,
    title = 'Önem Piramidi',
    subtitle,
    height = 280,
    collapsible = false,
}) {
    const total = useMemo(() => levels.reduce((s, l) => s + (l.count || 0), 0), [levels]);
    const maxCount = useMemo(() => Math.max(1, ...levels.map((l) => l.count || 0)), [levels]);

    if (total === 0) {
        return (
            <SectionCard title={title} icon={TrendingUp} iconGradient="from-amber-500 to-orange-600" collapsible={collapsible}>
                <div className="py-8 text-center text-slate-400 text-sm">Içgörü yok</div>
            </SectionCard>
        );
    }

    const layerHeight = height / Math.max(1, levels.length);
    // Her katmanin genisligi = (count/maxCount) * 100% — minimum 25%, maks 100%
    const widthFor = (count) => {
        const frac = (count || 0) / maxCount;
        return 25 + frac * 75;
    };

    return (
        <SectionCard
            title={title}
            subtitle={subtitle || `${total} içgörü · katmana tıkla → filtrele`}
            icon={TrendingUp}
            iconGradient="from-amber-500 to-orange-600"
            collapsible={collapsible}
        >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-center">
                {/* Pyramid SVG */}
                <div className="flex flex-col items-center justify-center" style={{ height }}>
                    {levels.map((l, idx) => {
                        const w = widthFor(l.count);
                        const isActive = activeKey === l.key;
                        return (
                            <button
                                key={l.key}
                                onClick={() => onLevelClick?.(l.key)}
                                className="relative transition-all hover:scale-[1.03] focus:outline-none"
                                style={{
                                    height: layerHeight,
                                    width: `${w}%`,
                                    minWidth: 80,
                                    background: l.gradient || `linear-gradient(135deg, ${l.color}, ${l.color}dd)`,
                                    clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
                                    marginBottom: 1,
                                    opacity: !activeKey || isActive ? 1 : 0.4,
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isActive ? `0 8px 20px -4px ${l.color}99` : 'none',
                                }}
                            >
                                <div className="flex items-center justify-between h-full px-6">
                                    <span className="text-white font-black text-sm drop-shadow tracking-wide">
                                        {l.label}
                                    </span>
                                    <span className="text-white font-black text-2xl tabular-nums drop-shadow">
                                        {l.count || 0}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Legend + breakdown */}
                <div className="space-y-2">
                    {levels.map((l) => {
                        const pct = total > 0 ? Math.round(((l.count || 0) / total) * 100) : 0;
                        const isActive = activeKey === l.key;
                        return (
                            <button
                                key={l.key}
                                onClick={() => onLevelClick?.(l.key)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                                    isActive
                                        ? 'border-slate-700 bg-slate-50 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                                <div className="flex-1">
                                    <div className="text-[12px] font-bold text-slate-800">{l.label}</div>
                                    <div className="text-[10px] text-slate-500">
                                        <b className="tabular-nums" style={{ color: l.color }}>{l.count || 0}</b> içgörü
                                        {' · '}{pct}% pay
                                    </div>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 tabular-nums">{pct}%</div>
                            </button>
                        );
                    })}
                    {activeKey && (
                        <button
                            onClick={() => onLevelClick?.(null)}
                            className="w-full text-center text-[10px] font-bold text-rose-600 hover:text-rose-800 mt-2 py-1.5 rounded-lg hover:bg-rose-50"
                        >
                            Filtreyi Temizle
                        </button>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}
