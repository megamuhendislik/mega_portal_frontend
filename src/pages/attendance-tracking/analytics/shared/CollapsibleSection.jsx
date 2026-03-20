import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ title, subtitle, icon: Icon, iconGradient = 'from-indigo-500 to-violet-600', badge, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center text-white shrink-0`}>
                            <Icon size={18} />
                        </div>
                    )}
                    <div className="text-left">
                        <h3 className="font-bold text-base text-slate-800">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                    </div>
                    {badge != null && (
                        <span className="ml-2 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-5 pb-5 space-y-5">{children}</div>
            </div>
        </div>
    );
}
