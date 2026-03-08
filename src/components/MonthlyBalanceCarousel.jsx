import { useState, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

const TURKISH_MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function MonthlyBalanceCarousel({ periodSummary }) {
    if (!periodSummary?.cumulative?.breakdown) return null;

    const breakdown = periodSummary.cumulative.breakdown || [];
    const currentFiscalMonth = periodSummary.fiscal_month || new Date().getMonth() + 1;

    const currentIdx = breakdown.findIndex(b => b.month === currentFiscalMonth);
    if (currentIdx === -1) return null;

    const [offset, setOffset] = useState(0);
    const containerRef = useRef(null);

    const minOffset = -Math.min(2, currentIdx);
    const maxOffset = Math.min(2, breakdown.length - 1 - currentIdx);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        if (e.deltaX > 30 || e.deltaY > 30) {
            setOffset(prev => Math.min(prev + 1, maxOffset));
        } else if (e.deltaX < -30 || e.deltaY < -30) {
            setOffset(prev => Math.max(prev - 1, minOffset));
        }
    }, [minOffset, maxOffset]);

    const goLeft = () => setOffset(prev => Math.max(prev - 1, minOffset));
    const goRight = () => setOffset(prev => Math.min(prev + 1, maxOffset));

    const centerIdx = currentIdx + offset;
    const visibleIndices = [centerIdx - 1, centerIdx, centerIdx + 1].filter(
        i => i >= 0 && i < breakdown.length
    );

    const formatHours = (seconds) => {
        if (seconds == null || seconds === 0) return '0.0';
        const h = (Math.abs(seconds) / 3600).toFixed(1);
        return seconds >= 0 ? `+${h}` : `-${h}`;
    };

    const renderCard = (monthData) => {
        if (!monthData) return null;
        const m = monthData.month;
        const isCurrent = m === currentFiscalMonth;
        const isFuture = m > currentFiscalMonth;
        const isPast = m < currentFiscalMonth;

        const targetHours = ((monthData.target || 0) / 3600).toFixed(1);
        const completedHours = isFuture ? null : ((monthData.completed || 0) / 3600).toFixed(1);

        let balanceSeconds = null;
        if (isPast) {
            balanceSeconds = monthData.balance || 0;
        } else if (isCurrent) {
            balanceSeconds = monthData.past_target_balance ?? monthData.balance ?? 0;
        }

        const balanceHours = balanceSeconds != null ? formatHours(balanceSeconds) : null;
        const isPositive = balanceSeconds != null && balanceSeconds >= 0;

        return (
            <div
                key={m}
                className={`flex-shrink-0 w-1/3 px-1.5 transition-all duration-300 ${
                    isCurrent ? 'scale-[1.02]' : 'opacity-75'
                }`}
            >
                <div className={`rounded-2xl border p-4 ${
                    isCurrent
                        ? 'bg-white border-blue-200 shadow-lg ring-2 ring-blue-100'
                        : isFuture
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} className={isCurrent ? 'text-blue-500' : 'text-slate-400'} />
                            <span className={`text-sm font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-600'}`}>
                                {TURKISH_MONTHS[m]}
                            </span>
                        </div>
                        {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                GÜNCEL
                            </span>
                        )}
                        {isFuture && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                YAKLAŞAN
                            </span>
                        )}
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Hedef</span>
                        <span className="text-sm font-semibold text-slate-700">{targetHours} sa</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Çalışılan</span>
                        <span className={`text-sm font-semibold ${isFuture ? 'text-slate-300' : 'text-slate-700'}`}>
                            {completedHours != null ? `${completedHours} sa` : '—'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-slate-500">Bakiye</span>
                        <div className="flex items-center gap-1">
                            {balanceSeconds != null ? (
                                <>
                                    {isPositive ? (
                                        <TrendingUp size={14} className="text-emerald-500" />
                                    ) : (
                                        <TrendingDown size={14} className="text-rose-500" />
                                    )}
                                    <span className={`text-sm font-bold ${
                                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {balanceHours} sa
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Minus size={14} className="text-slate-300" />
                                    <span className="text-sm font-semibold text-slate-300">—</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aylık Bakiye</h4>
                <div className="flex gap-1">
                    <button
                        onClick={goLeft}
                        disabled={offset <= minOffset}
                        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={16} className="text-slate-500" />
                    </button>
                    <button
                        onClick={goRight}
                        disabled={offset >= maxOffset}
                        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={16} className="text-slate-500" />
                    </button>
                </div>
            </div>
            <div
                ref={containerRef}
                onWheel={handleWheel}
                className="flex overflow-hidden"
            >
                {visibleIndices.map(i => renderCard(breakdown[i]))}
            </div>
        </div>
    );
}
