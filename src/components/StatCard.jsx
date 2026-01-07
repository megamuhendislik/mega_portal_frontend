import React from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const StatCard = ({
    icon: Icon,
    title,
    value,
    subValue,
    subLabel,
    trend = 'neutral',  // 'up', 'down', 'neutral'
    color = 'indigo',   // 'indigo', 'emerald', 'amber', 'rose', 'blue'
    className
}) => {

    const colorStyles = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', iconBg: 'bg-indigo-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', iconBg: 'bg-amber-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', iconBg: 'bg-rose-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconBg: 'bg-blue-100' },
    };

    const currentStyle = colorStyles[color] || colorStyles.indigo;

    return (
        <div className={clsx("bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all duration-300", className)}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{value}</h3>
                </div>
                <div className={clsx("p-3 rounded-xl transition-colors", currentStyle.bg, currentStyle.text)}>
                    {Icon && <Icon size={24} />}
                </div>
            </div>

            {(subValue || subLabel) && (
                <div className="flex items-center gap-2 mt-2">
                    {subValue && (
                        <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", currentStyle.bg, currentStyle.text)}>
                            {trend === 'up' && <ArrowUpRight size={12} />}
                            {trend === 'down' && <ArrowDownRight size={12} />}
                            {trend === 'neutral' && <Minus size={12} />}
                            {subValue}
                        </span>
                    )}
                    {subLabel && (
                        <span className="text-[11px] text-slate-400 font-medium">
                            {subLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Decoration Element */}
            <div className={clsx("absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none", currentStyle.bg.replace('bg-', 'bg-current-'))} />
        </div>
    );
};

export default StatCard;
