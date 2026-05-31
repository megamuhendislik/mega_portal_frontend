import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

const GRADIENTS = {
    indigo: 'from-indigo-500 via-indigo-600 to-indigo-700',
    emerald: 'from-emerald-500 via-emerald-600 to-emerald-700',
    amber: 'from-amber-500 via-amber-600 to-orange-600',
    red: 'from-red-500 via-red-600 to-rose-700',
    blue: 'from-blue-500 via-blue-600 to-blue-700',
    violet: 'from-violet-500 via-violet-600 to-purple-700',
    slate: 'from-slate-700 via-slate-800 to-slate-900',
    cyan: 'from-cyan-500 via-cyan-600 to-teal-700',
};

export default function KPICard({
    title, value, suffix, icon: Icon,
    gradient = 'slate', delta, deltaSuffix = '%',
    subtitle, sparkline, className = '', mini = false,
    info, // { title, content } for InfoTooltip
    onClick, // optional click handler — adds cursor-pointer + hover ring
    invertColor = false, // true: artış KÖTÜ (örn. Eksik Mesai) → yeşil/kırmızı ters
}) {
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    // Renk semantiği: ok yönü gerçek işareti gösterir; renk 'iyi mi' sorusuna göre.
    // invertColor=true ise artış (delta>0) kötüdür → kırmızı.
    const isGood = invertColor ? isNegative : isPositive;
    const isBad = invertColor ? isPositive : isNegative;
    const grad = GRADIENTS[gradient] || gradient;
    const clickable = typeof onClick === 'function';
    const clickProps = clickable ? {
        onClick,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } },
    } : {};
    const clickClass = clickable ? 'cursor-pointer hover:ring-2 hover:ring-white/40' : '';

    if (mini) {
        return (
            <div
                {...clickProps}
                className={`bg-white rounded-xl border border-slate-200/80 p-3.5 flex items-center gap-3 group hover:shadow-md hover:border-slate-300/80 transition-all duration-300 ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-200' : ''} ${className}`}
            >
                {Icon && (
                    <div className={`p-2 bg-gradient-to-br ${grad} rounded-xl text-white shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon size={16} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate flex items-center gap-1">
                        {title}
                        {info && <InfoTooltip title={info.title}>{info.content}</InfoTooltip>}
                    </p>
                    <div className="flex items-baseline gap-1">
                        {/* Turkce yuzde formati: % onde gosterilir */}
                        {suffix === '%' && <span className="text-[11px] font-bold text-slate-400">%</span>}
                        <span className="text-lg font-black text-slate-800 tabular-nums">{value}</span>
                        {suffix && suffix !== '%' && <span className="text-[11px] font-bold text-slate-400">{suffix}</span>}
                    </div>
                </div>
                {delta != null && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isGood ? 'text-emerald-600 bg-emerald-50' : isBad ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'}`}>
                        {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : <Minus size={10} />}
                        {isPositive ? '+' : ''}{delta}{deltaSuffix}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            {...clickProps}
            className={`relative overflow-hidden bg-gradient-to-br ${grad} text-white p-5 rounded-2xl shadow-lg group hover:shadow-xl transition-all duration-300 ${clickClass} ${className}`}
        >
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        {title}
                        {info && <InfoTooltip title={info.title} className="[&_button]:text-white/30 [&_button:hover]:text-white/60">{info.content}</InfoTooltip>}
                    </p>
                    {Icon && (
                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm group-hover:bg-white/15 transition-colors">
                            <Icon size={14} className="text-white/80" />
                        </div>
                    )}
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                    {/* Turkce yuzde formati: % onde */}
                    {suffix === '%' && <span className="text-sm font-bold text-white/60">%</span>}
                    <h3 className="text-3xl font-black tabular-nums tracking-tight">{value}</h3>
                    {suffix && suffix !== '%' && <span className="text-sm font-bold text-white/60">{suffix}</span>}
                </div>

                {delta != null && delta !== undefined && (
                    <div className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-white/15 text-emerald-200' : isBad ? 'bg-white/15 text-red-200' : 'bg-white/10 text-white/50'}`}>
                        {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : <Minus size={10} />}
                        <span>{isPositive ? '+' : ''}{delta}{deltaSuffix}</span>
                        <span className="text-white/30 ml-0.5">önceki dönem</span>
                    </div>
                )}

                {subtitle && <p className="text-white/40 text-[10px] mt-1.5 font-medium">{subtitle}</p>}

                {/* Sparkline visualization */}
                {sparkline && sparkline.length > 0 && (
                    <div className="flex items-end gap-px mt-3 h-8">
                        {sparkline.map((v, i) => {
                            const max = Math.max(...sparkline, 1);
                            return <div key={i} className="flex-1 bg-white/20 rounded-sm transition-all hover:bg-white/30"
                                style={{ height: `${(v / max) * 100}%`, minHeight: '2px' }} />;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * A horizontal progress bar KPI used for inline stats.
 */
export function KPIProgressBar({ label, value, max = 100, suffix = '%', color = '#6366f1', info }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500 flex items-center gap-1">
                    {label}
                    {info && <InfoTooltip title={info.title}>{info.content}</InfoTooltip>}
                </span>
                <span className="font-black text-slate-700 tabular-nums">
                    {suffix === '%' ? `%${value}` : `${value}${suffix}`}
                </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

/**
 * A circle KPI gauge.
 */
export function KPIGauge({ value, max = 100, label, size = 80, strokeWidth = 6, color = '#6366f1' }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - pct);

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dashoffset}
                    className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-lg font-black text-slate-800 tabular-nums">{Math.round(value)}</span>
            </div>
            {label && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>}
        </div>
    );
}
