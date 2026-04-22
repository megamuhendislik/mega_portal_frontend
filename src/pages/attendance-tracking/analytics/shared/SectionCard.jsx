import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SectionCard({ title, subtitle, icon: Icon, iconGradient = 'from-indigo-500 to-indigo-600', children, collapsible = true, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div
                className={`flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-slate-50/50 select-none' : ''} transition-colors`}
                onClick={collapsible ? () => setOpen(!open) : undefined}
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2 bg-gradient-to-br ${iconGradient} rounded-xl text-white`}>
                            <Icon size={16} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {collapsible && (
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                )}
            </div>
            {(!collapsible || open) && (
                <div className="px-5 pb-5 pt-1">{children}</div>
            )}
        </div>
    );
}
