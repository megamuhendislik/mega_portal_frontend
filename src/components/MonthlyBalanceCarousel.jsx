import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Clock, Zap } from 'lucide-react';

const MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const SHORT = ['', 'OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];

export default function MonthlyBalanceCarousel({ periodSummary }) {
    if (!periodSummary?.cumulative?.breakdown) return null;

    const breakdown = periodSummary.cumulative.breakdown || [];
    const systemStart = periodSummary.cumulative?.system_start_fiscal_month || 1;
    const currentFiscalMonth = periodSummary.fiscal_month || new Date().getMonth() + 1;

    // Sistem başlangıcından itibaren ayları filtrele
    const months = useMemo(() =>
        breakdown.filter(b => b.month >= systemStart),
        [breakdown, systemStart]
    );

    if (months.length === 0) return null;

    // Başlangıç pozisyonu: cari ayı ortala
    const [startIdx, setStartIdx] = useState(() => {
        const curIdx = months.findIndex(b => b.month === currentFiscalMonth);
        if (curIdx === -1) return 0;
        return Math.max(0, Math.min(curIdx - 1, months.length - 3));
    });

    const canGoLeft = startIdx > 0;
    const canGoRight = startIdx < months.length - 3;
    const visibleSlice = months.slice(startIdx, startIdx + 3);

    const fmtHours = (sec) => {
        if (sec == null) return null;
        const h = (Math.abs(sec) / 3600).toFixed(1);
        return sec >= 0 ? `+${h}` : `-${h}`;
    };

    return (
        <div className="mt-5 px-2 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-indigo-400"></div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Aylık Bakiye</h4>
                </div>
                <div className="flex items-center gap-0.5">
                    {/* Dot indicators */}
                    <div className="flex items-center gap-1 mr-2">
                        {months.map((m, i) => (
                            <div
                                key={m.month}
                                className={`rounded-full transition-all duration-300 ${
                                    m.month === currentFiscalMonth
                                        ? 'w-2 h-2 bg-indigo-400'
                                        : i >= startIdx && i < startIdx + 3
                                            ? 'w-1.5 h-1.5 bg-slate-300'
                                            : 'w-1 h-1 bg-slate-200'
                                }`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => setStartIdx(p => Math.max(0, p - 1))}
                        disabled={!canGoLeft}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                    >
                        <ChevronLeft size={14} className="text-slate-500" />
                    </button>
                    <button
                        onClick={() => setStartIdx(p => Math.min(months.length - 3, p + 1))}
                        disabled={!canGoRight}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                    >
                        <ChevronRight size={14} className="text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Cards Grid — always 3 columns */}
            <div className="grid grid-cols-3 gap-2.5">
                {visibleSlice.map((md) => {
                    const m = md.month;
                    const isCurrent = m === currentFiscalMonth;
                    const isFuture = m > currentFiscalMonth;
                    const isPast = m < currentFiscalMonth;

                    const targetSec = md.target || 0;
                    const completedSec = md.completed || 0;
                    const targetH = (targetSec / 3600).toFixed(1);
                    const completedH = (completedSec / 3600).toFixed(1);

                    // Bakiye: cari ay past_target_balance, geçmiş ay balance, gelecek null
                    let balanceSec = null;
                    if (isPast) balanceSec = md.balance || 0;
                    else if (isCurrent) balanceSec = md.past_target_balance ?? md.balance ?? 0;

                    const isPositive = balanceSec != null && balanceSec >= 0;
                    const balanceH = balanceSec != null ? fmtHours(balanceSec) : null;

                    // İlerleme yüzdesi
                    const pct = isFuture ? 0 : targetSec > 0 ? Math.min(100, (completedSec / targetSec) * 100) : 0;

                    // Renk paleti
                    const accent = isFuture
                        ? { border: 'border-slate-200', bar: 'bg-slate-200', barTrack: 'bg-slate-100', text: 'text-slate-400' }
                        : isCurrent
                            ? { border: 'border-indigo-200', bar: 'bg-indigo-500', barTrack: 'bg-indigo-100', text: 'text-indigo-600' }
                            : isPositive
                                ? { border: 'border-emerald-200', bar: 'bg-emerald-500', barTrack: 'bg-emerald-100', text: 'text-emerald-600' }
                                : { border: 'border-rose-200', bar: 'bg-rose-400', barTrack: 'bg-rose-100', text: 'text-rose-600' };

                    return (
                        <div
                            key={m}
                            className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${accent.border} ${
                                isCurrent
                                    ? 'bg-white shadow-md ring-1 ring-indigo-100'
                                    : isFuture
                                        ? 'bg-slate-50/80'
                                        : 'bg-white shadow-sm hover:shadow-md'
                            }`}
                        >
                            {/* Top accent line */}
                            <div className={`h-1 ${accent.bar}`} />

                            <div className="p-3.5">
                                {/* Month header */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-sm font-bold tracking-tight ${isCurrent ? 'text-indigo-700' : isFuture ? 'text-slate-400' : 'text-slate-700'}`}>
                                        {MONTHS[m]}
                                    </span>
                                    {isCurrent && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full ring-1 ring-indigo-100">
                                            <Zap size={8} className="fill-indigo-500" />
                                            AKTİF
                                        </span>
                                    )}
                                    {isPast && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            isPositive
                                                ? 'bg-emerald-50 text-emerald-500'
                                                : 'bg-rose-50 text-rose-500'
                                        }`}>
                                            {isPositive ? '✓' : '!'}
                                        </span>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className={`h-1.5 rounded-full ${accent.barTrack} mb-3 overflow-hidden`}>
                                    <div
                                        className={`h-full rounded-full ${accent.bar} transition-all duration-700 ease-out`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                {/* Stats */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Target size={11} className="text-slate-400" />
                                            <span className="text-[11px] text-slate-500 font-medium">Hedef</span>
                                        </div>
                                        <span className="text-[12px] font-semibold text-slate-600 font-mono tabular-nums">
                                            {targetH}<span className="text-slate-300 ml-0.5 text-[10px]">sa</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={11} className={isFuture ? 'text-slate-300' : 'text-slate-400'} />
                                            <span className={`text-[11px] font-medium ${isFuture ? 'text-slate-300' : 'text-slate-500'}`}>Çalışılan</span>
                                        </div>
                                        <span className={`text-[12px] font-semibold font-mono tabular-nums ${isFuture ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {isFuture ? '—' : <>{completedH}<span className="text-slate-300 ml-0.5 text-[10px]">sa</span></>}
                                        </span>
                                    </div>

                                    {/* Balance — bottom section with accent background */}
                                    <div className={`-mx-3.5 -mb-3.5 mt-1 px-3.5 py-2.5 rounded-b-xl ${
                                        isFuture
                                            ? 'bg-slate-50'
                                            : isPositive
                                                ? 'bg-emerald-50/60'
                                                : 'bg-rose-50/60'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                                isFuture ? 'text-slate-300' : accent.text
                                            }`}>
                                                Bakiye
                                            </span>
                                            {balanceSec != null ? (
                                                <div className="flex items-center gap-1">
                                                    {isPositive
                                                        ? <TrendingUp size={13} className="text-emerald-500" />
                                                        : <TrendingDown size={13} className="text-rose-500" />
                                                    }
                                                    <span className={`text-sm font-black font-mono tabular-nums tracking-tight ${
                                                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {balanceH}<span className="text-[10px] font-bold ml-0.5 opacity-60">sa</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-semibold text-slate-300 font-mono">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
