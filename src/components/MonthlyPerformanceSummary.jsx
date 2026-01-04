import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertTriangle, Coffee, Briefcase } from 'lucide-react';

const MonthlyPerformanceSummary = ({ logs, periodSummary }) => {

    const stats = useMemo(() => {
        // If Period Summary from Backend is available, use it for "Target" and "Realized"
        // This ensures 26th-25th logic matches exact backend calc
        if (periodSummary) {
            const targetSec = periodSummary.target_seconds || 0;
            const realizedSec = periodSummary.realized_normal_seconds || 0;
            const overtimeSec = periodSummary.realized_overtime_seconds || 0;
            const missingSec = periodSummary.total_missing_seconds || 0;
            const breakSec = periodSummary.total_break_seconds || 0;

            let progressPercent = 0;
            if (targetSec > 0) {
                // Correct logic: Progress = Realized / Target
                progressPercent = Math.min(100, (realizedSec / targetSec) * 100);
            }

            // Calculate other simple metrics from logs since backend summary might not have 'lateCount' or 'workDays' yet
            // Or we can rely on logs for these specific counters
            let lateCount = 0;
            let workDays = 0;
            logs.forEach(log => {
                if (log.late_seconds > 0) lateCount++;
                if ((log.normal_seconds || 0) > 0) workDays++;
            });

            return {
                totalHours: (realizedSec / 3600).toFixed(1),
                totalOvertimeHours: (overtimeSec / 3600).toFixed(1),
                totalMissingHours: (Math.max(0, targetSec - realizedSec) / 3600).toFixed(1), // Remaining to Target
                totalBreakHours: (breakSec / 3600).toFixed(1),
                totalExpectedHours: (targetSec / 3600).toFixed(1),
                progressPercent,
                lateCount,
                workDays
            };
        }

        // Fallback to local calculation (Old Logic)
        let totalWorkedSec = 0;
        let totalOvertimeSec = 0;
        let totalMissingSec = 0;
        let totalBreakSec = 0;
        let lateCount = 0;
        let workDays = 0;

        logs.forEach(log => {
            const worked = log.normal_seconds || 0;
            const ot = log.overtime_seconds || 0;
            const missing = log.missing_seconds || 0;
            const brk = log.break_seconds || 0;

            totalWorkedSec += worked;
            totalOvertimeSec += ot;
            totalMissingSec += missing;
            totalBreakSec += brk;

            if (log.late_seconds > 0) lateCount++;
            if (worked > 0) workDays++;
        });

        // Progress Calculation
        const totalExpected = totalWorkedSec + totalMissingSec;
        let progressPercent = 0;
        if (totalExpected > 0) {
            progressPercent = Math.min(100, (totalWorkedSec / totalExpected) * 100);
        }

        return {
            totalHours: (totalWorkedSec / 3600).toFixed(1),
            totalOvertimeHours: (totalOvertimeSec / 3600).toFixed(1),
            totalMissingHours: (totalMissingSec / 3600).toFixed(1),
            totalBreakHours: (totalBreakSec / 3600).toFixed(1),
            totalExpectedHours: (totalExpected / 3600).toFixed(1),
            progressPercent,
            lateCount,
            workDays
        };
    }, [logs]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Progress Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-lg mb-1 opacity-90">Çalışma Dönem Hedefi</h3>
                    <p className="text-indigo-100 text-sm mb-6">Bu dönem tamamlanması gereken planlı mesai.</p>

                    <div className="mb-2 flex justify-between items-end">
                        <span className="text-4xl font-black">{stats.totalHours}</span>
                        <span className="text-lg opacity-80 font-medium mb-1">/ {stats.totalExpectedHours} sa</span>
                    </div>

                    <div className="w-full bg-black/20 rounded-full h-3 mb-2">
                        <div
                            className="bg-emerald-400 h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                            style={{ width: `${stats.progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                    <div>
                        <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Doldurulacak</p>
                        <p className="font-bold text-lg">{stats.totalMissingHours} sa</p>
                    </div>
                    <div>
                        <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider">İlerleme</p>
                        <p className="font-bold text-lg">%{stats.progressPercent.toFixed(0)}</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">

                {/* Overtime */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Toplam Ek Mesai</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalOvertimeHours} <span className="text-sm text-slate-400 font-normal">saat</span></p>
                    </div>
                </div>

                {/* Work Days */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Çalışılan Gün</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.workDays} <span className="text-sm text-slate-400 font-normal">gün</span></p>
                    </div>
                </div>

                {/* Breaks */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Coffee size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Toplam Mola</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalBreakHours} <span className="text-sm text-slate-400 font-normal">saat</span></p>
                    </div>
                </div>

                {/* Lates */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Geç Kalma</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.lateCount} <span className="text-sm text-slate-400 font-normal">kez</span></p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MonthlyPerformanceSummary;
