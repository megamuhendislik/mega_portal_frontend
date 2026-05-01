import React, { useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';
import SectionCard from './SectionCard';

const PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16',
];

/**
 * RadarMetric — N entity'nin (kisi/dept/sirket) M metrigi uzerinde
 * radar karsilastirmasi.
 *
 * Props:
 *   entities: [{ id, name, color?, metrics: { metricKey: number } }]
 *   metrics: [{ key, label, max=100, unit='%' }]
 *   title, subtitle, height (default 360)
 */
export default function RadarMetric({
    entities = [],
    metrics = [],
    title = 'Radar Karşılaştırma',
    subtitle,
    height = 360,
    collapsible = true,
    defaultOpen = true,
}) {
    const data = useMemo(() => {
        return metrics.map((m) => {
            const row = { metric: m.label, fullMark: m.max || 100 };
            entities.forEach((e) => {
                const v = e.metrics?.[m.key];
                row[e.name] = v == null ? 0 : Math.min(m.max || 100, v);
            });
            return row;
        });
    }, [entities, metrics]);

    if (entities.length === 0 || metrics.length === 0) {
        return (
            <SectionCard title={title} icon={RadarIcon} iconGradient="from-violet-500 to-fuchsia-600" collapsible={collapsible} defaultOpen={defaultOpen}>
                <div className="py-8 text-center text-slate-400 text-sm">Karşılaştırma için varlık seçin</div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title={title}
            subtitle={subtitle || `${entities.length} varlık · ${metrics.length} metrik`}
            icon={RadarIcon}
            iconGradient="from-violet-500 to-fuchsia-600"
            collapsible={collapsible}
            defaultOpen={defaultOpen}
        >
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data} outerRadius="78%">
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 'auto']}
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                return (
                                    <div className="rounded-lg bg-white shadow-xl border border-slate-200 px-3 py-2 text-xs">
                                        <div className="font-bold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">
                                            {label}
                                        </div>
                                        {payload.map((p, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px]">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                <span className="font-medium text-slate-600">{p.name}:</span>
                                                <span className="font-black tabular-nums" style={{ color: p.color }}>
                                                    {Math.round(p.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }}
                        />
                        <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                        />
                        {entities.map((e, i) => {
                            const color = e.color || PALETTE[i % PALETTE.length];
                            return (
                                <Radar
                                    key={e.id || e.name}
                                    name={e.name}
                                    dataKey={e.name}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.18}
                                    strokeWidth={2}
                                    dot={{ r: 3, strokeWidth: 1.5, fill: color }}
                                />
                            );
                        })}
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </SectionCard>
    );
}
