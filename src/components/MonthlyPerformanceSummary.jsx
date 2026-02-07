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
                    carryOver: periodSummary.cumulative.carry_over_seconds,
                    carryOverHours: (periodSummary.cumulative.carry_over_seconds / 3600).toFixed(1),

                    prevYearBalance: (periodSummary.cumulative.previous_year_balance_seconds / 3600).toFixed(1),

                    // Added for "From Previous Month" View (Total History until Start of Month)
                    prevMonthCarryOver: ((periodSummary.cumulative.previous_year_balance_seconds + periodSummary.cumulative.carry_over_seconds) / 3600).toFixed(1),

                    totalNetBalance: (periodSummary.cumulative.total_net_balance_seconds / 3600).toFixed(1),

                    ytdTargetHours: (periodSummary.cumulative.ytd_target_seconds / 3600).toFixed(1),
                    ytdCompletedHours: (periodSummary.cumulative.ytd_completed_seconds / 3600).toFixed(1),
                    ytdNetBalanceHours: (periodSummary.cumulative.ytd_net_balance_seconds / 3600).toFixed(1),

                    ytdTarget: periodSummary.cumulative.ytd_target_seconds,
                    ytdCompleted: periodSummary.cumulative.ytd_completed_seconds,

                    // PASSING THE DATA form WITH CUMULATIVE CALCULATION
                    breakdown: (periodSummary.cumulative.breakdown || []).reduce((acc, month, idx) => {
                        const prevBalance = idx === 0
                            ? (periodSummary.cumulative.previous_year_balance_seconds || 0)
                            : acc[idx - 1].cumulativeBalanceRaw;

                        const currentCumulative = prevBalance + (month.balance || 0);

                        acc.push({
                            ...month,
                            cumulativeBalanceRaw: currentCumulative,
                            cumulativeBalance: (currentCumulative / 3600).toFixed(1) // Store for UI
                        });
                        return acc;
                    }, []) || [],


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
        <div className="space-y-8">

            {/* Header / Target Overview */}
            <div className="flex items-end justify-between px-2">
                <div>
                    <h4 className="font-bold text-slate-800 text-lg tracking-tight">Normal Mesai Hedefi</h4>
                    <p className="text-sm text-slate-500 font-medium">Planlanan dönem mesaisinin gerçekleşme durumu.</p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.targetHours}</span>
                    <span className="text-sm text-slate-400 font-bold ml-1 uppercase">saat</span>
                </div>
            </div>

            {/* DUAL BAR LAYOUT */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200 space-y-10 border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -mr-10 -mt-20 z-0 pointer-events-none opacity-50"></div>

                {/* 1. Normal Work Bar */}
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Normal Mesai Dağılımı</span>
                        <div className="flex gap-4 text-[10px] font-black uppercase tracking-wide">
                            <span className="flex items-center gap-1.5 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>Tamamlanan</span>
                            <span className="flex items-center gap-1.5 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>Eksik</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span>Kalan</span>
                        </div>
                    </div>
                    <div className="h-5 w-full bg-slate-100 rounded-full flex overflow-hidden shadow-inner border border-slate-100">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ width: `${stats.pCompleted}%` }} title={`Tamamlanan: ${stats.completedHours} sa`} />
                        <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full transition-all duration-1000 relative shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ width: `${stats.pMissing}%` }} title={`Eksik: ${stats.missingHours} sa`}>
                            <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-50"></div>
                        </div>
                        <div className="bg-slate-200 h-full transition-all duration-1000" style={{ width: `${stats.pRemaining}%` }} title={`Kalan: ${stats.remainingHours} sa`} />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mt-2 px-1">
                        <span className="text-blue-700">{stats.completedHours} sa</span>
                        <span className="text-rose-600">{stats.missingHours > 0 ? `-${stats.missingHours} sa` : ''}</span>
                        <span className="text-slate-400">{stats.remainingHours} sa</span>
                    </div>
                </div>

                {/* 2. Total Work (Net) Bar */}
                <div className="relative z-10 pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2 tracking-wider">
                            Toplam Efor (Mesai Dahil)
                            {stats.isSurplus && <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-black shadow-sm border border-emerald-100">HEDEF AŞILDI</span>}
                        </span>
                        <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-2 py-1 rounded-lg">{stats.netWorkHours} / {stats.targetHours} sa</span>
                    </div>
                    <div className="relative h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-100">
                        <div
                            className={`h-full transition-all duration-1000 ${stats.isSurplus ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-indigo-400 to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
                            style={{ width: `${stats.pTotal}%` }}
                        />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 mt-2">
                        Normal çalışma süresi ve fazla mesailerin toplamının hedefe oranı.
                    </p>
                </div>
            </div>

            {/* 3. Cumulative / YTD Bar */}
            {stats.cumulative && (
                <div>
                    {/* 3. YILLIK KÜMÜLATİF PERFORMANS DASHBOARD */}
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-200 p-8 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                    2026 Yıllık Performans
                                </h3>
                                <p className="text-xs text-slate-400 font-medium pl-3.5 mt-1">Yılbaşından bugüne kümülatif durum.</p>
                            </div>
                        </div>

                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 relative z-10">
                            {/* 1. Devreden (Carry Over) -> Modified to "Previous Month" context */}
                            <div className={`p-5 rounded-2xl border ${parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'} hover:shadow-lg transition-shadow duration-300`}>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">BİR ÖNCEKİ AYDAN DEVREDEN</div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-3xl font-black tracking-tighter ${parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? '' : '+'}{stats.cumulative.prevMonthCarryOver}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">sa</span>
                                </div>
                            </div>

                            {/* 2. YTD Target */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow duration-300 shadow-sm">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">YILLIK HEDEF</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-700 tracking-tighter">{stats.cumulative.ytdTargetHours}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">sa</span>
                                </div>
                            </div>

                            {/* 3. YTD Completed */}
                            <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:shadow-lg transition-shadow duration-300 group">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">YILLIK GERÇEKLEŞEN</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-indigo-600 tracking-tighter group-hover:scale-105 transition-transform">{stats.cumulative.ytdCompletedHours}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">sa</span>
                                </div>
                                <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3 overflow-hidden">
                                    <div className="bg-indigo-500 h-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${stats.cumulative.progressPercent}%` }}></div>
                                </div>
                            </div>

                            {/* 4. YTD Net Balance (Big Result) */}
                            <div className={`p-5 rounded-2xl border ${parseFloat(stats.cumulative.totalNetBalance) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-emerald-500/20 shadow-xl' : 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-500 text-white shadow-rose-500/20 shadow-xl'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                                <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <Scale size={64} />
                                </div>
                                <div className="text-[10px] uppercase font-bold text-white/80 mb-2 tracking-widest relative z-10">TOPLAM BAKİYE</div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-4xl font-black tracking-tighter">
                                        {parseFloat(stats.cumulative.totalNetBalance) > 0 ? '+' : ''}{stats.cumulative.totalNetBalance}
                                    </span>
                                    <span className="text-xs font-bold text-white/70 uppercase">sa</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Monthly Breakdown (Chart + Table) */}
                        {stats.cumulative.breakdown && stats.cumulative.breakdown.length > 0 ? (
                            <div className="relative z-10">

                                {/* A. Chart (Tube) */}
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-3 px-1">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">AYLIK PERFORMANS GRAFİĞİ</span>
                                    </div>

                                    <div className="flex w-full h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/50 shadow-inner items-end">
                                        {stats.cumulative.breakdown.map((m, idx) => {
                                            const currentMonthIdx = new Date().getMonth();
                                            const isCurrentMonth = idx === currentMonthIdx;
                                            const isPast = idx < currentMonthIdx;

                                            const target = m.target;
                                            const completed = m.completed;
                                            const balance = m.balance;

                                            // Percentages
                                            let pctCompleted = 0;
                                            let pctOvertime = 0;
                                            let pctMissing = 0;

                                            if (target > 0) {
                                                pctCompleted = Math.min(100, (completed / target) * 100);
                                                if (completed > target) {
                                                    pctOvertime = ((completed - target) / target) * 100;
                                                } else {
                                                    // Calculate Missing % relative to Target
                                                    pctMissing = ((target - completed) / target) * 100;
                                                }
                                            } else if (completed > 0) {
                                                pctCompleted = 100;
                                                pctOvertime = 20;
                                            }

                                            // Colors
                                            let containerBg = 'bg-transparent';
                                            // if (isPast && balance < 0) containerBg = 'bg-rose-50/30'; // Handled by Missing Bar now
                                            if (completed >= target && target > 0) containerBg = 'bg-emerald-50/30';

                                            const balanceHours = (balance / 3600).toFixed(1);
                                            // Cumulative from reduced breakdown
                                            const cumulativeHours = m.cumulativeBalance ? (m.cumulativeBalance / 3600).toFixed(1) : '0.0';
                                            const isCumulativePos = m.cumulativeBalance >= 0;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex-1 h-full ${containerBg} border-r border-slate-200/50 last:border-r-0 relative group transition-all duration-300 hover:bg-white hover:shadow-xl hover:z-20 hover:-translate-y-1`}
                                                >
                                                    {/* Normal Work Bar (Indigo) */}
                                                    <div
                                                        className="absolute bottom-0 left-0 w-full bg-indigo-500 transition-all duration-1000 group-hover:bg-indigo-600"
                                                        style={{ height: `${pctCompleted}%` }}
                                                    ></div>

                                                    {/* Missing Bar (Rose Striped) - Only for Past/Current */}
                                                    {(isPast || isCurrentMonth) && pctMissing > 0 && (
                                                        <div
                                                            className="absolute left-0 w-full bg-rose-400/20"
                                                            style={{
                                                                bottom: `${pctCompleted}%`,
                                                                height: `${pctMissing}%`,
                                                                backgroundImage: 'linear-gradient(45deg, rgba(244, 63, 94, 0.1) 25%, transparent 25%, transparent 50%, rgba(244, 63, 94, 0.1) 50%, rgba(244, 63, 94, 0.1) 75%, transparent 75%, transparent)',
                                                                backgroundSize: '4px 4px'
                                                            }}
                                                        ></div>
                                                    )}

                                                    {/* Overtime Bar (Emerald) */}
                                                    {pctOvertime > 0 && (
                                                        <div
                                                            className="absolute w-full bg-emerald-400 transition-all duration-1000 shadow-sm group-hover:bg-emerald-500"
                                                            style={{
                                                                bottom: '100%',
                                                                height: `${Math.min(pctOvertime, 50)}%`,
                                                                maxHeight: '40px'
                                                            }}
                                                        >
                                                            <span className="absolute -top-5 inset-x-0 text-center text-[10px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                +{balanceHours}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Label Inside */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-1">
                                                        <span className="text-[10px] font-bold text-slate-500/80 mb-0.5 mix-blend-multiply">{m.month}</span>

                                                        {isCurrentMonth ? (
                                                            <div className="flex flex-col items-center mt-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mb-0.5"></div>
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[10px] font-black drop-shadow-sm ${balance >= 0 ? 'text-white' : 'text-rose-600/90'}`}>
                                                                {balance !== 0 ? (balance > 0 ? '' : balanceHours) : '-'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Tooltip */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-60 bg-slate-900/95 backdrop-blur-md text-white text-[10px] rounded-xl py-4 px-5 pointer-events-none shadow-2xl ring-1 ring-white/10 transform origin-bottom scale-95 group-hover:scale-100 z-50">
                                                        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                                                            <span className="font-bold text-sm text-white">{m.month}. Ay {isCurrentMonth ? '(Güncel)' : ''}</span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balance >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                {balance >= 0 ? 'FAZLA' : 'EKSİK'}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Hedef:</span>
                                                                <span className="font-mono text-slate-200">{(target / 3600).toFixed(1)} sa</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Gerçekleşen:</span>
                                                                <span className="font-mono font-bold text-indigo-400">{((Math.min(completed, target)) / 3600).toFixed(1)} sa</span>
                                                            </div>
                                                            {balance > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-emerald-400 font-bold">Ek Mesai:</span>
                                                                    <span className="font-mono font-bold text-white">{(balance / 3600).toFixed(1)} sa</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between pt-3 border-t border-white/10 mt-2">
                                                                <span className={balance >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>Net Fark:</span>
                                                                <span className={`font-mono font-black text-lg ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {balance > 0 ? '+' : ''}{balanceHours}
                                                                </span>
                                                            </div>

                                                            {/* Cumulative Balance Section in Tooltip */}
                                                            {(isPast || isCurrentMonth) && (
                                                                <div className="flex justify-between pt-2 mt-2 border-t border-white/5 bg-white/5 -mx-5 px-5 py-2 -mb-4 rounded-b-xl">
                                                                    <span className="text-slate-300 font-bold">Kümülatif Bakiye:</span>
                                                                    <span className={`font-mono font-black ${isCumulativePos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {isCumulativePos ? '+' : ''}{cumulativeHours} sa
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-900/95"></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* B. Table (Detail) */}
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-slate-200"></div>
                                        AYLIK DETAYLI KIRILIM
                                        <div className="flex-1 h-[1px] bg-slate-200"></div>
                                    </h4>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                    <th className="px-6 py-4">Ay</th>
                                                    <th className="px-4 py-4 text-center">Hedef</th>
                                                    <th className="px-4 py-4 text-center">Normal Çalışma</th>
                                                    <th className="px-4 py-4 text-center text-rose-500">Eksik</th>
                                                    <th className="px-4 py-4 text-center text-emerald-500">Ek Mesai</th>
                                                    <th className="px-4 py-4 text-right">Net Bakiye</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {stats.cumulative.breakdown
                                                    .filter(m => {
                                                        const currentMonth = new Date().getMonth() + 1;
                                                        return m.month <= currentMonth;
                                                    })
                                                    .map((m, idx) => {
                                                        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                                                        const targetH = (m.target / 3600).toFixed(1);
                                                        const completedH = (m.completed / 3600).toFixed(1);
                                                        const missingH = (m.missing / 3600).toFixed(1);
                                                        const overtimeH = (m.overtime ? m.overtime / 3600 : 0).toFixed(1);
                                                        const balanceH = (m.balance / 3600).toFixed(1);
                                                        // Cumulative Balance Logic
                                                        const cumulativeBalanceH = (m.cumulativeBalance / 3600).toFixed(1);
                                                        const isCumulativePositive = m.cumulativeBalance >= 0;

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${isCumulativePositive ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                                                    {monthNames[m.month - 1]}
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-mono text-slate-500">{targetH} <span className="text-[10px] text-slate-300">sa</span></td>
                                                                <td className="px-4 py-4 text-center font-mono font-bold text-slate-700">{completedH} <span className="text-[10px] text-slate-400">sa</span></td>
                                                                <td className="px-4 py-4 text-center font-mono font-medium text-rose-500">
                                                                    {parseFloat(missingH) > 0 ? `-${missingH}` : '-'}
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-mono font-bold text-emerald-500">
                                                                    {parseFloat(overtimeH) > 0 ? `+${overtimeH}` : '-'}
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-tight ${isCumulativePositive ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}`}>
                                                                        {isCumulativePositive && parseFloat(cumulativeBalanceH) > 0 ? '+' : ''}{cumulativeBalanceH} sa
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-center text-xs text-slate-400 py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <div className="mb-3 opacity-50"><Briefcase size={32} className="mx-auto text-slate-300" /></div>
                                Henüz yıllık veri oluşmadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Stats Grid with Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Net Surplus Card */}
                <div className={`p-6 rounded-[2rem] border flex flex-col justify-between transition-all hover:shadow-xl ${stats.isSurplus ? 'bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-50' : 'bg-white border-slate-200 shadow-lg shadow-slate-200'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-xl ${stats.isSurplus ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-slate-500'}`}>
                            <Scale size={20} />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ayın Bakiyesi</span>
                    </div>
                    <div>
                        <span className={`text-4xl font-black tracking-tighter ${stats.isSurplus ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {stats.isSurplus ? `+${stats.surplusHours}` : '0.0'}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1 uppercase">sa</span>
                    </div>
                </div>

                {/* Total Overtime Card (Raw) */}
                <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-lg shadow-indigo-100 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/10 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                            <Zap size={20} />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Toplam Ek Mesai</span>
                    </div>
                    <div>
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.overtimeHours}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1 uppercase">sa</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MonthlyPerformanceSummary;
