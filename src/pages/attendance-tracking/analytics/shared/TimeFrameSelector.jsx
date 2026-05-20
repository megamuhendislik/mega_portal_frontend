import React from 'react';
import { CalendarDays, CalendarRange, CalendarClock, Calendar } from 'lucide-react';

/**
 * TimeFrameSelector — Insights tabı için zaman dilimi seçici (2026-05-21 Stage 67).
 *
 * Frontend'in seçtiği time_frame değeri backend insights endpoint'ine query
 * parametresi olarak gönderilir. Backend bu değere göre tarih aralığını
 * türetir (week/month/quarter/year).
 *
 * Frame tanımları:
 *  - week     : Bu Hafta (Pzt-Paz, takvim haftası)
 *  - month    : Bu Mali Ay (26-25)
 *  - quarter  : Son 90 Gün
 *  - year     : Bu Takvim Yılı (Ocak 1 - Aralık 31)
 *
 * Props:
 *  - value: string ('week' | 'month' | 'quarter' | 'year')
 *  - onChange: (frame) => void
 *  - period: {start, end} — seçilen frame'in çözümlenmiş hali (backend'den döner)
 */

const FRAMES = [
    {
        key: 'week',
        label: 'Bu Hafta',
        hint: 'Pzt-Paz',
        icon: CalendarDays,
        accent: 'from-blue-500 to-blue-600',
        ring: 'ring-blue-300',
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
    },
    {
        key: 'month',
        label: 'Bu Ay',
        hint: 'Mali ay',
        icon: Calendar,
        accent: 'from-indigo-500 to-indigo-600',
        ring: 'ring-indigo-300',
        text: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
    },
    {
        key: 'quarter',
        label: 'Son 90 Gün',
        hint: 'Çeyrek',
        icon: CalendarRange,
        accent: 'from-violet-500 to-violet-600',
        ring: 'ring-violet-300',
        text: 'text-violet-700',
        bg: 'bg-violet-50',
        border: 'border-violet-200',
    },
    {
        key: 'year',
        label: 'Bu Yıl',
        hint: 'Ocak-Aralık',
        icon: CalendarClock,
        accent: 'from-fuchsia-500 to-fuchsia-600',
        ring: 'ring-fuchsia-300',
        text: 'text-fuchsia-700',
        bg: 'bg-fuchsia-50',
        border: 'border-fuchsia-200',
    },
];

function fmtPeriod(period) {
    if (!period || !period.start) return null;
    try {
        const s = new Date(period.start).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        const e = new Date(period.end).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${s} → ${e}`;
    } catch {
        return null;
    }
}

export default function TimeFrameSelector({ value = 'month', onChange, period }) {
    const periodText = fmtPeriod(period);

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100">
                        <CalendarRange size={14} className="text-slate-600" />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Zaman Dilimi
                        </span>
                        {periodText && (
                            <span className="text-[11px] text-slate-700 font-mono">{periodText}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {FRAMES.map((f) => {
                        const isActive = value === f.key;
                        const Icon = f.icon;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => onChange && onChange(f.key)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 border transition-all ${
                                    isActive
                                        ? `${f.bg} ${f.border} ring-2 ${f.ring} ${f.text} shadow-sm`
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                                aria-pressed={isActive}
                            >
                                {isActive ? (
                                    <span
                                        className={`flex h-5 w-5 items-center justify-center rounded-md text-white bg-gradient-to-br ${f.accent}`}
                                    >
                                        <Icon size={11} />
                                    </span>
                                ) : (
                                    <Icon size={13} className="text-slate-400" />
                                )}
                                <span className="text-xs font-bold">{f.label}</span>
                                <span className={`text-[10px] hidden sm:inline ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                                    {f.hint}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
