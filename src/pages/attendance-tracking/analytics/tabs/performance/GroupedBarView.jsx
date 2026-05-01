import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts';
import { Segmented, Empty } from 'antd';
import SectionCard from '../../shared/SectionCard';
import { Building2 } from 'lucide-react';
import ChartTooltip from '../../shared/ChartTooltip';
import { levelColor, intensityColor } from './helpers';

const METRIC_OPTIONS = [
    { key: 'avg_normal_completion_pct', label: 'N.Doluluk', unit: '%', color: levelColor, ref: 80, sortDesc: true },
    { key: 'avg_total_completion_pct', label: 'T.Doluluk', unit: '%', color: (v) => (v >= 100 ? '#7c3aed' : levelColor(v)), ref: 100, sortDesc: true },
    { key: 'avg_ot_to_target_pct', label: 'FM/Y', unit: '%', color: intensityColor, ref: null, sortDesc: true },
    { key: 'avg_missing_to_target_pct', label: 'Eksik/Y', unit: '%', color: intensityColor, ref: null, sortDesc: true },
    { key: 'total_ot_hours', label: 'FM Saat', unit: 'sa', color: () => '#f59e0b', ref: null, sortDesc: true },
    { key: 'total_missing_hours', label: 'Eksik Saat', unit: 'sa', color: () => '#ef4444', ref: null, sortDesc: true },
];

/**
 * Departman / Pozisyon / Custom gruplari icin tek-metrik bar chart.
 * Kullanici metrik secebilir, cubuga tikla -> drill-down.
 */
export default function GroupedBarView({ groups, onSelectGroup, title, icon: Icon = Building2 }) {
    const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].key);
    const m = METRIC_OPTIONS.find((o) => o.key === metricKey) || METRIC_OPTIONS[0];

    const chartData = useMemo(() => {
        return [...groups]
            .map((g) => ({
                name: g.group_name || '—',
                group_id: g.group_id,
                value: g[m.key] || 0,
                employee_count: g.employee_count,
            }))
            .sort((a, b) => (m.sortDesc ? b.value - a.value : a.value - b.value));
    }, [groups, m.key, m.sortDesc]);

    if (groups.length === 0) {
        return (
            <SectionCard title={title || 'Gruplama'} icon={Icon} iconGradient="from-violet-500 to-purple-600" collapsible={false}>
                <Empty description="Veri yok" />
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title={title || 'Gruplama'}
            icon={Icon}
            iconGradient="from-violet-500 to-purple-600"
            subtitle={`${groups.length} grup · Çubuğa tıkla → kişiler`}
            collapsible={false}
        >
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                <Segmented
                    size="small"
                    value={metricKey}
                    onChange={setMetricKey}
                    options={METRIC_OPTIONS.map((o) => ({
                        value: o.key,
                        label: <span className="text-[10px] font-bold">{o.label}</span>,
                    }))}
                />
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} unit={m.unit} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} width={100} />
                        <Tooltip content={<ChartTooltip unit={m.unit} />} cursor={{ fill: '#f1f5f9' }} />
                        {m.ref != null && (
                            <ReferenceLine x={m.ref} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} />
                        )}
                        <Bar
                            dataKey="value"
                            name={m.label}
                            radius={[0, 6, 6, 0]}
                            cursor="pointer"
                            onClick={(d) => d?.group_id != null && onSelectGroup?.(d.group_id)}
                        >
                            {chartData.map((d, i) => (
                                <Cell key={i} fill={m.color(d.value || 0)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
                Çubuğa tıkla → o grubun kişileri tablo halinde açılır
            </p>
        </SectionCard>
    );
}
