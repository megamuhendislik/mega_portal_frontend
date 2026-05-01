import React from 'react';
import { Gauge } from 'lucide-react';
import SectionCard from './SectionCard';

/**
 * GaugeCluster — N tane circular progress gauge yan yana.
 * Her gauge: degeri, etiketi, hedef cizgisi (opsiyonel), renk.
 *
 * Props:
 *   gauges: [{ key, label, value, max, color, target?, suffix='%', subtitle?, icon? }]
 *   columns: 2/3/4
 */
export default function GaugeCluster({
    gauges = [],
    columns = 4,
    title = 'Performans Göstergeleri',
    subtitle,
    collapsible = false,
}) {
    const colCls = columns === 2 ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3 ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

    return (
        <SectionCard
            title={title}
            subtitle={subtitle}
            icon={Gauge}
            iconGradient="from-cyan-500 to-blue-600"
            collapsible={collapsible}
        >
            <div className={`grid ${colCls} gap-4`}>
                {gauges.map((g) => (
                    <GaugeItem key={g.key} {...g} />
                ))}
            </div>
        </SectionCard>
    );
}

function GaugeItem({ label, value, max = 100, color = '#6366f1', target, suffix = '%', subtitle, icon: Icon, size = 110, strokeWidth = 9, accent }) {
    const safeMax = Math.max(1, max);
    const safeVal = Math.min(safeMax, Math.max(0, Number(value) || 0));
    const pct = safeVal / safeMax;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct);
    const targetPct = target != null ? Math.min(safeMax, Math.max(0, target)) / safeMax : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">{label}</div>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90 transform">
                    <defs>
                        <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                            <stop offset="100%" stopColor={color} stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke={`url(#grad-${label})`}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                    {targetPct != null && (
                        <line
                            x1={size / 2 + Math.cos(targetPct * 2 * Math.PI - Math.PI / 2) * (radius - strokeWidth / 2 - 2)}
                            y1={size / 2 + Math.sin(targetPct * 2 * Math.PI - Math.PI / 2) * (radius - strokeWidth / 2 - 2)}
                            x2={size / 2 + Math.cos(targetPct * 2 * Math.PI - Math.PI / 2) * (radius + strokeWidth / 2 + 2)}
                            y2={size / 2 + Math.sin(targetPct * 2 * Math.PI - Math.PI / 2) * (radius + strokeWidth / 2 + 2)}
                            stroke="#475569"
                            strokeWidth={2}
                            strokeLinecap="round"
                            transform={`rotate(0 ${size / 2} ${size / 2})`}
                        />
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {Icon && <Icon size={14} style={{ color }} className="mb-0.5" />}
                    <span className="text-[22px] font-black tabular-nums leading-none" style={{ color }}>
                        {suffix === '%' ? `%${Math.round(safeVal)}` : Math.round(safeVal)}
                    </span>
                    {suffix && suffix !== '%' && (
                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">{suffix}</span>
                    )}
                </div>
            </div>
            {subtitle && (
                <div className="text-[10px] text-slate-500 mt-2 text-center font-medium">{subtitle}</div>
            )}
            {accent && (
                <div className="text-[10px] font-bold mt-1 text-center" style={{ color }}>{accent}</div>
            )}
        </div>
    );
}
