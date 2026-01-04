import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertTriangle, Activity } from 'lucide-react';

const MonthlyPerformanceSummary = ({ logs, startDate, endDate }) => {

    const stats = useMemo(() => {
        let totalWorkedSec = 0;
        let totalOvertimeSec = 0;
        let totalMissingSec = 0;
        let lateCount = 0;
        let workDays = 0;

        logs.forEach(log => {
            const worked = log.normal_seconds || 0;
            const ot = log.overtime_seconds || 0;
            const missing = log.missing_seconds || 0;

            totalWorkedSec += worked;
            totalOvertimeSec += ot;
            totalMissingSec += missing;

            if (log.late_seconds > 0) lateCount++;
            if (worked > 0) workDays++;
        });

        // Calculate Efficiency 
        // Efficiency = Worked / (Worked + Missing) * 100
        const totalExpected = totalWorkedSec + totalMissingSec;
        let efficiency = 100;
        if (totalExpected > 0) {
            efficiency = (totalWorkedSec / totalExpected) * 100;
        }

        return {
            totalHours: (totalWorkedSec / 3600).toFixed(1),
            totalOvertimeHours: (totalOvertimeSec / 3600).toFixed(1),
            totalMissingHours: (totalMissingSec / 3600).toFixed(1),
            lateCount,
            workDays,
            efficiency: efficiency.toFixed(1)
        };
    }, [logs]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-8 items-center justify-between">

            <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-slate-800">Aylık Performans Özeti</h3>
                <p className="text-sm text-slate-500">
                    Seçili tarih aralığındaki genel performans verileriniz.
                </p>

                <div className="flex items-center gap-4 mt-4">
                    <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="block text-xs text-blue-500 font-bold uppercase tracking-wider">Verimlilik</span>
                        <span className="text-2xl font-black text-blue-700">%{stats.efficiency}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-500"><TrendingUp size={20} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Mesai (Saat)</p>
                        <p className="text-lg font-bold text-slate-800">{stats.totalOvertimeHours}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500"><AlertTriangle size={20} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Geç Kalma</p>
                        <p className="text-lg font-bold text-slate-800">{stats.lateCount} <span className="text-xs font-normal text-slate-400">kez</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Clock size={20} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Toplam Çalışma</p>
                        <p className="text-lg font-bold text-slate-800">{stats.totalHours} <span className="text-xs font-normal text-slate-400">saat</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-500"><Activity size={20} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">İş Günü</p>
                        <p className="text-lg font-bold text-slate-800">{stats.workDays} <span className="text-xs font-normal text-slate-400">gün</span></p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MonthlyPerformanceSummary;
