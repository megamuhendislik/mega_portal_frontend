import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertTriangle, Coffee, Briefcase, MinusCircle, CheckCircle, ArrowRight } from 'lucide-react';

const MonthlyPerformanceSummary = ({ logs, periodSummary }) => {

    const stats = useMemo(() => {
        if (periodSummary) {
            const targetSec = periodSummary.target_seconds || 0;
            const realizedSec = periodSummary.completed_seconds || 0; // Normal work
            const overtimeSec = periodSummary.overtime_seconds || 0;
            const missingSec = periodSummary.missing_seconds || 0;
            const remainingSec = periodSummary.remaining_seconds || 0;
            const netWorkSec = periodSummary.net_work_seconds || 0; // Normal + OT
            const netBalanceSec = periodSummary.net_balance_seconds || 0;

            const breakSec = periodSummary.total_break_seconds || 0;
            const lateSec = periodSummary.total_late_seconds || 0;

            // Percentages for Normal Work Breakdown (Target Base)
            let pCompleted = 0;
            let pMissing = 0;
            let pRemaining = 0;

            if (targetSec > 0) {
                pCompleted = Math.min(100, (realizedSec / targetSec) * 100);
                pMissing = Math.min(100, (missingSec / targetSec) * 100);
                // Ensure remaining fills the rest cleanly
                // pRemaining = 100 - pCompleted - pMissing; 
                // Better to derive from seconds to be precise visual
                pRemaining = (remainingSec / targetSec) * 100;
            }

            // Calculation for Net Progress
            // If Net Work > Target, we are > 100%
            const netPercent = targetSec > 0 ? (netWorkSec / targetSec) * 100 : 0;
            const isNetPositive = netBalanceSec >= 0;

            let lateCount = 0;
            let workDays = 0;
            logs.forEach(log => {
                // If backend sends late_seconds, we can count days with >0 late
                if ((log.late_seconds || 0) > 0) lateCount++;
                if ((log.normal_seconds || 0) > 0) workDays++;
            });

            return {
                targetHours: (targetSec / 3600).toFixed(1),
                completedHours: (realizedSec / 3600).toFixed(1),
                missingHours: (missingSec / 3600).toFixed(1),
                remainingHours: (remainingSec / 3600).toFixed(1),

                overtimeHours: (overtimeSec / 3600).toFixed(1),
                netWorkHours: (netWorkSec / 3600).toFixed(1),
                netBalanceHours: (Math.abs(netBalanceSec) / 3600).toFixed(1),
                isNetPositive,

                breakHours: (breakSec / 3600).toFixed(1),
                lateMinutes: Math.floor(lateSec / 60),

                pCompleted,
                pMissing,
                pRemaining,
                netPercent,
                workDays,
                lateCount
            };
        }
        return null;
    }, [logs, periodSummary]);

    if (!stats) return <div className="p-4 text-center text-slate-400">Veri hesaplanıyor...</div>;

    return (
        <div className="space-y-8">
            {/* 1. Main Breakdown: 3-Part Bar for Normal Work */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">Normal Mesai Hedefi</h4>
                        <p className="text-sm text-slate-500">Planlanan dönem mesaisinin gerçekleşme durumu.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black text-slate-800">{stats.targetHours}</span>
                        <span className="text-sm text-slate-400 font-bold ml-1">saat</span>
                    </div>
                </div>

                {/* Multi-Segment Progress Bar */}
                <div className="h-4 w-full bg-slate-200 rounded-full flex overflow-hidden mb-4">
                    {/* Completed (Blue) */}
                    <div
                        className="bg-blue-600 h-full transition-all duration-1000"
                        style={{ width: `${stats.pCompleted}%` }}
                        title={`Tamamlanan: ${stats.completedHours} sa`}
                    />
                    {/* Missing (Red/Orange) */}
                    <div
                        className="bg-rose-500 h-full transition-all duration-1000 relative"
                        style={{ width: `${stats.pMissing}%` }}
                        title={`Eksik: ${stats.missingHours} sa`}
                    >
                        {/* Stripe pattern for 'Missing' to indicate 'lost' */}
                        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                    </div>
                    {/* Remaining (Gray/Light Blue) */}
                    <div
                        className="bg-slate-300 h-full transition-all duration-1000"
                        style={{ width: `${stats.pRemaining}%` }}
                        title={`Kalan: ${stats.remainingHours} sa`}
                    />
                </div>

                {/* Legend / Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Tamamlanan</span>
                        </div>
                        <p className="text-xl font-bold text-slate-800">{stats.completedHours} <span className="text-xs font-normal text-slate-400">sa</span></p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Eksik/Yapılmayan</span>
                        </div>
                        <p className="text-xl font-bold text-rose-600">{stats.missingHours} <span className="text-xs font-normal text-slate-400">sa</span></p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm opacity-70">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Kalan Hedef</span>
                        </div>
                        <p className="text-xl font-bold text-slate-700">{stats.remainingHours} <span className="text-xs font-normal text-slate-400">sa</span></p>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Net Status Card (Target vs Realized) */}
                <div className={`md:col-span-2 p-5 rounded-2xl border flex items-center justify-between ${stats.isNetPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div>
                        <h4 className={`font-bold text-sm uppercase tracking-wide mb-1 ${stats.isNetPositive ? 'text-emerald-700' : 'text-blue-700'}`}>Aylık Gerçekleşen (Net)</h4>
                        <p className={`text-xs mb-3 ${stats.isNetPositive ? 'text-emerald-600' : 'text-blue-600'}`}>Hedeflenen vs Yapılan (Mesai Dahil)</p>

                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${stats.isNetPositive ? 'text-emerald-800' : 'text-slate-800'}`}>
                                {stats.netWorkHours}
                            </span>
                            <span className="text-sm font-bold text-slate-400">
                                / {stats.targetHours} sa
                            </span>
                        </div>

                        {/* Progress Bar for Net Work */}
                        <div className="mt-3 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${stats.isNetPositive ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(100, stats.netPercent)}%` }}
                            ></div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                            {stats.isNetPositive ? (
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <TrendingUp size={14} />
                                    +{stats.netBalanceHours} sa Fazla Mesai
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {/* We show it as negative explicitly if there is a deficit */}
                                    {/* If netBalanceHours is 0 (balanced), handles nicely */}
                                    -{stats.netBalanceHours} sa Eksik (Devamsızlık)
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`hidden md:flex p-4 rounded-full ${stats.isNetPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {stats.isNetPositive ? <CheckCircle size={32} /> : <Clock size={32} />}
                    </div>
                </div>

                {/* Overtime Info */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Briefcase size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Toplam Ek Mesai</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.overtimeHours} <span className="text-sm font-normal text-slate-400">sa</span></p>
                </div>

                {/* Late Info */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Geç Kalma</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{stats.lateMinutes} <span className="text-sm font-normal text-slate-400">dk</span></p>
                        <p className="text-xs text-slate-400 mt-1">{stats.lateCount} kez tekrarlandı</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MonthlyPerformanceSummary;
