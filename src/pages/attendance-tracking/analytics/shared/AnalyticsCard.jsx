import React from 'react';

export default function AnalyticsCard({ title, subtitle, icon: Icon, iconGradient = 'from-indigo-500 to-violet-600', children, className = '', actions }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center text-white shrink-0`}>
                            <Icon size={16} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
