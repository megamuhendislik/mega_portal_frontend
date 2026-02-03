import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertTriangle, Briefcase, MinusCircle, CheckCircle, Scale, Zap } from 'lucide-react';

const MonthlyPerformanceSummary = ({ logs, periodSummary }) => {

    const stats = useMemo(() => {
        if (periodSummary) {
            const targetSec = periodSummary.target_seconds || 0;
            const realizedSec = periodSummary.completed_seconds || 0; // Normal work
            const overtimeSec = periodSummary.overtime_seconds || 0;
            const missingSec = periodSummary.missing_seconds || 0;
            const remainingSec = periodSummary.remaining_seconds || 0;
            const netWorkSec = periodSummary.net_work_seconds || 0; // Normal + OT

            const breakSec = periodSummary.total_break_seconds || 0;
            const lateSec = periodSummary.total_late_seconds || 0;

            // Percentages for Normal Work Breakdown (Target Base)
            let pCompleted = 0;
            let pMissing = 0;
            let pRemaining = 0;

            if (targetSec > 0) {
                pCompleted = Math.min(100, (realizedSec / targetSec) * 100);
                pMissing = Math.min(100, (missingSec / targetSec) * 100);
                pRemaining = (remainingSec / targetSec) * 100;
            }

            // --- NET SURPLUS LOGIC ---
            // Formula: max(0, (Normal + OT) - Target)
            const surplusSec = Math.max(0, netWorkSec - targetSec);
            const isSurplus = surplusSec > 0;

            // Bar 2: Total Progress (Normal + OT)
            // If Net Work > Target, bar is full (100%) + Overtime indicator
            const pTotal = targetSec > 0 ? Math.min(100, (netWorkSec / targetSec) * 100) : 0;


            let lateCount = 0;
            logs.forEach(log => {
                if ((log.late_seconds || 0) > 0) lateCount++;
            });

            return {
                targetHours: (targetSec / 3600).toFixed(1),
                completedHours: (realizedSec / 3600).toFixed(1),
                missingHours: (missingSec / 3600).toFixed(1),
                remainingHours: (remainingSec / 3600).toFixed(1),

                overtimeHours: (overtimeSec / 3600).toFixed(1),
                netWorkHours: (netWorkSec / 3600).toFixed(1),

                surplusHours: (surplusSec / 3600).toFixed(1),
                isSurplus,

                breakHours: (breakSec / 3600).toFixed(1),
                lateMinutes: Math.floor(lateSec / 60),

                pCompleted,
                pMissing,
                pRemaining,
                pTotal, // For Bar 2
                lateCount,

                cumulative: periodSummary.cumulative ? {
                    carryOver: periodSummary.cumulative.carry_over_seconds, // Raw seconds (Intra-year) -> Maybe confusing if used directly
                    carryOverHours: (periodSummary.cumulative.carry_over_seconds / 3600).toFixed(1),

                    prevYearBalance: (periodSummary.cumulative.previous_year_balance_seconds / 3600).toFixed(1),
                    totalNetBalance: (periodSummary.cumulative.total_net_balance_seconds / 3600).toFixed(1),

                    ytdTargetHours: (periodSummary.cumulative.ytd_target_seconds / 3600).toFixed(1),
                    ytdCompletedHours: (periodSummary.cumulative.ytd_completed_seconds / 3600).toFixed(1),
                    ytdNetBalanceHours: (periodSummary.cumulative.ytd_net_balance_seconds / 3600).toFixed(1),

                    ytdTarget: periodSummary.cumulative.ytd_target_seconds,
                    ytdCompleted: periodSummary.cumulative.ytd_completed_seconds,
                    breakdown: periodSummary.cumulative.breakdown || [], // PASSING THE DATA


                    // Visualization Helper
                    progressPercent: periodSummary.cumulative.ytd_target_seconds > 0
                        ? (periodSummary.cumulative.ytd_completed_seconds / periodSummary.cumulative.ytd_target_seconds) * 100
                        : 0
                } : null,

                annualLeave: {
                    entitlement: periodSummary.annual_leave_entitlement || 0,
                    used: periodSummary.annual_leave_used || 0,
                    limit: periodSummary.annual_leave_limit || 0,
                    remaining: periodSummary.annual_leave_remaining || 0,
                    daysToRenewal: periodSummary.days_to_next_accrual
                }
            };
        }
        return null;
    }, [logs, periodSummary]);

    if (!stats) return <div className="p-4 text-center text-slate-400">Veri hesaplanıyor...</div>;

    return (
        <div className="space-y-6">

            {/* Header / Target Overview */}
            <div className="flex items-end justify-between px-2">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg">Normal Mesai Hedefi</h4>
                    <p className="text-sm text-slate-500">Planlanan dönem mesaisinin gerçekleşme durumu.</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black text-slate-800">{stats.targetHours}</span>
                    <span className="text-sm text-slate-400 font-bold ml-1">saat</span>
                </div>
            </div>

            {/* DUAL BAR LAYOUT */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-8">

                {/* 1. Normal Work Bar */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase text-slate-500">1. Normal Mesai Dağılımı</span>
                        <div className="flex gap-3 text-[10px] font-bold uppercase">
                            <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600"></span>Tamamlanan</span>
                            <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Eksik</span>
                            <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span>Kalan</span>
                        </div>
                    </div>
                    <div className="h-4 w-full bg-slate-200 rounded-full flex overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${stats.pCompleted}%` }} title={`Tamamlanan: ${stats.completedHours} sa`} />
                        <div className="bg-rose-500 h-full transition-all duration-1000 relative" style={{ width: `${stats.pMissing}%` }} title={`Eksik: ${stats.missingHours} sa`}>
                            <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                        </div>
                        <div className="bg-slate-300 h-full transition-all duration-1000" style={{ width: `${stats.pRemaining}%` }} title={`Kalan: ${stats.remainingHours} sa`} />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mt-2 px-1">
                        <span>{stats.completedHours} sa</span>
                        <span className="text-rose-600">{stats.missingHours > 0 ? `-${stats.missingHours} sa` : ''}</span>
                        <span className="text-slate-400">{stats.remainingHours} sa</span>
                    </div>
                </div>

                {/* 2. Total Work (Net) Bar */}
                <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                            2. Mesai Dahil Gerçekleşen
                            {stats.isSurplus && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">HEDEF AŞILDI</span>}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">{stats.netWorkHours} / {stats.targetHours} sa</span>
                    </div>
                    <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden">
                        {/* Base Progress */}
                        <div
                            className={`h-full transition-all duration-1000 ${stats.isSurplus ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${stats.pTotal}%` }}
                        />
                        {/* If surplus, maybe a glow or marker? For now color change handles it */}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Normal çalışma ve fazla mesai toplamının hedefe oranı.
                    </p>
                </div>
            </div>

            {/* 3. Cumulative / YTD Bar (NEW) */}
            {/* 3. Cumulative / YTD Bar (NEW) */}
            {stats.cumulative && (
                <div className="pt-4 border-t border-slate-200">
                    {/* 3. YILLIK KÜMÜLATİF PERFORMANS DASHBOARD */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">2026 Yıllık Performans Özeti</h3>
                                <p className="text-xs text-slate-400 font-medium">Yılbaşından bugüne kümülatif durum ve aylık dağılım.</p>
                            </div>
                            {/* Legend */}
                            <div className="flex gap-3 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Fazla</div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Eksik</div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300"></span>Nötr</div>
                            </div>
                        </div>

                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {/* 1. Devreden (Carry Over) */}
                            <div className={`p-4 rounded-xl border ${parseFloat(stats.cumulative.prevYearBalance) < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'} flex flex-col justify-between`}>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">2025'TEN DEVREDEN</div>
                                <div className="flex items-end gap-1">
                                    <span className={`text-2xl font-black ${parseFloat(stats.cumulative.prevYearBalance) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {parseFloat(stats.cumulative.prevYearBalance) < 0 ? '' : '+'}{stats.cumulative.prevYearBalance}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 mb-1">sa</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">{parseFloat(stats.cumulative.prevYearBalance) < 0 ? 'Önceki yıldan borç' : 'Önceki yıldan fazla mesai'}</p>
                            </div>

                            {/* 2. YTD Target */}
                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Yıllık Hedef (YTD)</div>
                                <div className="flex items-end gap-1">
                                    <span className="text-2xl font-black text-slate-700">{stats.cumulative.ytdTargetHours}</span>
                                    <span className="text-xs font-bold text-slate-400 mb-1">sa</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">Bugüne kadar olması gereken</p>
                            </div>

                            {/* 3. YTD Completed */}
                            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col justify-between">
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Yıllık Gerçekleşen</div>
                                <div className="flex items-end gap-1">
                                    <span className="text-2xl font-black text-indigo-600">{stats.cumulative.ytdCompletedHours}</span>
                                    <span className="text-xs font-bold text-slate-400 mb-1">sa</span>
                                </div>
                                <div className="w-full bg-white rounded-full h-1.5 mt-2 overflow-hidden border border-indigo-100">
                                    <div className="bg-indigo-500 h-full" style={{ width: `${stats.cumulative.progressPercent}%` }}></div>
                                </div>
                            </div>

                            {/* 4. YTD Net Balance (Big Result) */}
                            <div className={`p-4 rounded-xl border ${parseFloat(stats.cumulative.totalNetBalance) >= 0 ? 'bg-emerald-100 border-emerald-200' : 'bg-rose-100 border-rose-200'} flex flex-col justify-between relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Scale size={48} />
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Toplam Yıllık Bakiye</div>
                                <div className="flex items-end gap-1 relative z-10">
                                    <span className={`text-3xl font-black ${parseFloat(stats.cumulative.totalNetBalance) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {parseFloat(stats.cumulative.totalNetBalance) > 0 ? '+' : ''}{stats.cumulative.totalNetBalance}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500/70 mb-1">sa</span>
                                </div>
                                <p className="text-[9px] font-bold opacity-60 mt-1 relative z-10">
                                    {parseFloat(stats.cumulative.totalNetBalance) >= 0 ? 'Hedefin üzerindesiniz' : 'Hedefin gerisindesiniz'}
                                </p>
                            </div>
                        </div>

                        {/* Monthly Breakdown Tube */}
                        {stats.cumulative.breakdown && stats.cumulative.breakdown.length > 0 ? (
                            <div>
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Aylık Performans Dağılımı</span>
                                    <span className="text-[9px] font-medium text-slate-400">Detay için ayların üzerine gelin</span>
                                </div>

                                <div className="flex w-full h-20 rounded-xl overflow-visible border border-slate-200 bg-slate-50 shadow-inner items-end">
                                    {stats.cumulative.breakdown.map((m, idx) => {
                                        const currentMonthIdx = new Date().getMonth();
                                        const isCurrentMonth = idx === currentMonthIdx;
                                        const isFuture = idx > currentMonthIdx;
                                        const isPast = idx < currentMonthIdx;

                                        const target = m.target;
                                        const completed = m.completed;
                                        const balance = m.balance;

                                        // Percentages
                                        const pctCompleted = Math.min(100, (completed / target) * 100);
                                        let pctOvertime = 0;
                                        if (completed > target) {
                                            pctOvertime = ((completed - target) / target) * 100;
                                        }

                                        // Colors
                                        let containerBg = 'bg-slate-100'; // Default Neutral (Remaining)
                                        if (isPast && balance < 0) containerBg = 'bg-rose-100'; // Past Deficit = Red
                                        if (completed >= target) containerBg = 'bg-blue-50'; // Target Met Base

                                        const balanceHours = (balance / 3600).toFixed(1);

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex-1 h-full ${containerBg} border-r border-white/50 last:border-r-0 relative group transition-all duration-300 hover:z-20 hover:shadow-xl first:rounded-l-xl last:rounded-r-xl`}
                                            >
                                                {/* Normal Work Bar (Blue) */}
                                                <div
                                                    className="absolute bottom-0 left-0 w-full bg-blue-400 transition-all duration-1000 border-t border-blue-300/50"
                                                    style={{ height: `${pctCompleted}%` }}
                                                ></div>

                                                {/* Overtime Bar (Green - Pops out on top) */}
                                                {pctOvertime > 0 && (
                                                    <div
                                                        className="absolute w-full bg-emerald-400 transition-all duration-1000 border-t border-emerald-300 shadow-sm"
                                                        style={{
                                                            bottom: '100%',
                                                            height: `${Math.min(pctOvertime, 50)}%`, // Cap visual height to avoid breaking layout too much
                                                            maxHeight: '30px'
                                                        }}
                                                    >
                                                        {/* Overtime Label */}
                                                        <span className="absolute -top-4 inset-x-0 text-center text-[9px] font-black text-emerald-600">
                                                            +{balanceHours}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Label Inside */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-1">
                                                    <span className="text-[9px] font-bold text-slate-500/80 mb-0.5">{m.month}</span>

                                                    {/* Status Text */}
                                                    {isCurrentMonth ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-black text-slate-400">Kalan</span>
                                                            <span className="text-[10px] font-black text-slate-600">{((Math.abs(balance) - (m.missing || 0)) / 3600).toFixed(0)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[10px] font-black ${balance >= 0 ? 'text-white drop-shadow-md' : 'text-rose-600'}`}>
                                                            {balance !== 0 ? (balance > 0 ? '' : balanceHours) : '-'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* HOVER TOOLTIP */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] rounded-xl py-3 px-4 pointer-events-none shadow-2xl ring-4 ring-black/5 transform origin-bottom scale-90 group-hover:scale-100 z-50">
                                                    <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-2">
                                                        <span className="font-bold text-sm text-slate-200">{m.month}. Ay {isCurrentMonth ? '(Güncel)' : ''}</span>
                                                        {isCurrentMonth ? (
                                                            <span className="text-xs font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">DEVAM EDİYOR</span>
                                                        ) : (
                                                            <span className={`text-xs font-black px-1.5 py-0.5 rounded ${balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {balance >= 0 ? 'FAZLA' : 'EKSİK'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Hedef (Aylık):</span>
                                                            <span className="font-mono">{(target / 3600).toFixed(1)} sa</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Tamamlanan (Normal):</span>
                                                            <span className="font-mono font-bold text-blue-400">
                                                                {((Math.min(completed, target)) / 3600).toFixed(1)} sa
                                                            </span>
                                                        </div>
                                                        {balance > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-emerald-400 font-bold">Ek Mesai:</span>
                                                                <span className="font-mono font-bold text-white">{(balance / 3600).toFixed(1)} sa</span>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between pt-2 border-t border-slate-700/50 mt-1">
                                                            <span className={balance >= 0 ? 'text-emerald-400 font-bold' : (isCurrentMonth ? 'text-slate-400 font-bold' : 'text-rose-400 font-bold')}>
                                                                {isCurrentMonth && balance < 0 ? 'Kalan Süre:' : 'Net Fark:'}
                                                            </span>
                                                            <span className={`font-mono font-black text-lg ${balance >= 0 ? 'text-emerald-400' : (isCurrentMonth ? 'text-slate-300' : 'text-rose-400')}`}>
                                                                {balance > 0 ? '+' : ''}{balanceHours}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Fill empty months */}
                                    {[...Array(12 - stats.cumulative.breakdown.length)].map((_, i) => (
                                        <div key={`empty-${i}`} className="flex-1 bg-slate-50 border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center opacity-40">
                                            <span className="text-[10px] text-slate-300 font-bold">{stats.cumulative.breakdown.length + i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-center text-xs text-slate-400 py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="mb-2 opacity-50"><Briefcase size={24} className="mx-auto" /></div>
                                Henüz yıllık veri oluşmadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Stats Grid with Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                {/* Net Surplus Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${stats.isSurplus ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${stats.isSurplus ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            <Scale size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-500">Aylık Net Fazla Mesai</span>
                    </div>
                    <div>
                        <span className={`text-2xl font-black ${stats.isSurplus ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {stats.isSurplus ? `+${stats.surplusHours}` : '0.0'}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1">sa</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Normal + Ek Mesai - Hedef</p>
                </div>

                {/* Total Overtime Card (Raw) */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                            <Zap size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-500">Toplam Ek Mesai</span>
                    </div>
                    <div>
                        <span className="text-2xl font-black text-slate-800">{stats.overtimeHours}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">sa</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Brüt gerçekleşen ek mesai</p>
                </div>
            </div>

        </div >
    );
};

export default MonthlyPerformanceSummary;
