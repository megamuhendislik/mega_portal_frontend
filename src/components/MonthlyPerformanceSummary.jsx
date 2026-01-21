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

                annualLeave: {
                    entitlement: periodSummary.annual_leave_entitlement || 0,
                    used: periodSummary.annual_leave_used || 0,
                    limit: periodSummary.annual_leave_limit || 0,
                    remaining: periodSummary.annual_leave_remaining || 0
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
        </div>
    );
};

export default MonthlyPerformanceSummary;
