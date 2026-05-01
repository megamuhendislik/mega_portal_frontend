import React, { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import SectionCard from './SectionCard';
import { Empty } from 'antd';

/**
 * StripPlot — bir metrigin tum entity'ler uzerindeki dagilimini
 * yatay strip olarak gosterir. Her satir bir metrik, her nokta bir kisi.
 * Z-score buyuk noktalar (anomali) renkli.
 *
 * Props:
 *   metrics: [{ key, label, unit='', invert=false }]
 *   data: [{ entity_id, name, department, metrics: { metricKey: { value, zscore } } }]
 *   onPointClick(entity_id, metricKey)
 *   thresholdZ (default 1.5)
 */
export default function StripPlot({
    metrics = [],
    data = [],
    onPointClick,
    thresholdZ = 1.5,
    title = 'Anomali Strip Grafiği',
    subtitle,
    collapsible = true,
    defaultOpen = true,
}) {
    const [hoveredId, setHoveredId] = useState(null);

    // Her metrik icin min/max hesapla — pozisyonlama icin
    const stats = useMemo(() => {
        const out = {};
        metrics.forEach((m) => {
            const vals = data.map((d) => d.metrics?.[m.key]?.value).filter((v) => v != null);
            if (vals.length === 0) {
                out[m.key] = { min: 0, max: 1 };
                return;
            }
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            out[m.key] = { min, max: max === min ? min + 1 : max };
        });
        return out;
    }, [data, metrics]);

    if (data.length === 0 || metrics.length === 0) {
        return (
            <SectionCard title={title} icon={Activity} iconGradient="from-rose-500 to-orange-600" collapsible={collapsible} defaultOpen={defaultOpen}>
                <Empty description="Veri yok" />
            </SectionCard>
        );
    }

    const colorForZ = (z) => {
        const abs = Math.abs(z || 0);
        if (abs >= 2.5) return '#dc2626';   // critical
        if (abs >= thresholdZ) return '#f59e0b'; // warn
        return '#94a3b8';                     // normal
    };

    return (
        <SectionCard
            title={title}
            subtitle={subtitle || `${data.length} kişi · ${metrics.length} metrik · |z| ≥ ${thresholdZ} renkli`}
            icon={Activity}
            iconGradient="from-rose-500 to-orange-600"
            collapsible={collapsible}
            defaultOpen={defaultOpen}
        >
            <div className="space-y-4">
                {metrics.map((m) => {
                    const { min, max } = stats[m.key];
                    return (
                        <div key={m.key}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-700">{m.label}</span>
                                <span className="text-[10px] text-slate-400 tabular-nums">
                                    {Math.round(min)}{m.unit || ''} … {Math.round(max)}{m.unit || ''}
                                </span>
                            </div>
                            <div className="relative h-7 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 rounded-md border border-slate-200">
                                {/* Median cizgi */}
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300" />
                                {data.map((d) => {
                                    const cell = d.metrics?.[m.key];
                                    if (!cell || cell.value == null) return null;
                                    const norm = (cell.value - min) / (max - min);
                                    const left = `${Math.min(98, Math.max(2, norm * 100))}%`;
                                    const z = cell.zscore || 0;
                                    const isAnomaly = Math.abs(z) >= thresholdZ;
                                    const radius = isAnomaly ? 7 : 4;
                                    const isHovered = hoveredId === d.entity_id;
                                    return (
                                        <button
                                            key={d.entity_id}
                                            onMouseEnter={() => setHoveredId(d.entity_id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            onClick={() => onPointClick?.(d.entity_id, m.key)}
                                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all"
                                            style={{
                                                left,
                                                zIndex: isAnomaly ? 5 : (isHovered ? 8 : 1),
                                            }}
                                            title={`${d.name}: ${Math.round(cell.value)}${m.unit || ''} (z=${(z || 0).toFixed(2)})`}
                                        >
                                            <div
                                                className="rounded-full border-2 border-white shadow"
                                                style={{
                                                    width: radius * 2,
                                                    height: radius * 2,
                                                    backgroundColor: colorForZ(z),
                                                    opacity: isHovered ? 1 : 0.7,
                                                    transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-end gap-4 mt-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-[9px] text-slate-500 font-bold">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[9px] text-slate-500 font-bold">|z| ≥ {thresholdZ}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-[9px] text-slate-500 font-bold">|z| ≥ 2.5</span>
                </div>
            </div>
        </SectionCard>
    );
}
