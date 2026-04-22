import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, suffix, icon: Icon, gradient = 'from-slate-700 to-slate-900', delta, deltaSuffix = '%', subtitle, className = '' }) {
    const isPositive = delta > 0;
    const isNegative = delta < 0;

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} text-white p-5 rounded-2xl shadow-lg ${className}`}>
            <div className="relative z-10">
                <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <div className="flex items-baseline gap-1.5">
                    <h3 className="text-2xl font-black tabular-nums">{value}</h3>
                    {suffix && <span className="text-sm font-bold text-white/70">{suffix}</span>}
                </div>
                {delta != null && delta !== undefined && (
                    <div className={`flex items-center gap-1 mt-1.5 text-xs font-bold ${isPositive ? 'text-emerald-300' : isNegative ? 'text-red-300' : 'text-white/50'}`}>
                        {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : null}
                        <span>{isPositive ? '+' : ''}{delta}{deltaSuffix}</span>
                        <span className="text-white/40 font-medium ml-0.5">önceki dönem</span>
                    </div>
                )}
                {subtitle && <p className="text-white/50 text-[11px] mt-1">{subtitle}</p>}
            </div>
            {Icon && (
                <div className="absolute -right-3 -bottom-3 opacity-10">
                    <Icon size={56} />
                </div>
            )}
        </div>
    );
}
