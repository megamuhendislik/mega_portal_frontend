import React from 'react';
import { Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';

function fmtDecHours(h) {
    if (!h || h === 0) return '0 dk';
    const abs = Math.abs(h);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = h < 0 ? '-' : '';
    if (hours === 0) return `${sign}${mins} dk`;
    if (mins === 0) return `${sign}${hours} saat`;
    return `${sign}${hours} saat ${mins} dk`;
}


const WeeklyPerformanceWidget = ({ summary, loading }) => {
    // Expect summary = { 
    //   total_worked_seconds: 180000, 
    //   target_seconds: 190000, 
    //   overtime_seconds: 3600, 
    //   days_worked: 4 
    // }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse h-full">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="h-24 bg-slate-100 rounded-lg mb-4"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
            </div>
        );
    }

    if (!summary) return null;

    const totalWorked = (summary.completed_seconds || 0) / 3600;
    const target = (summary.target_seconds || 0) / 3600;
    const overtime = (summary.overtime_seconds || 0) / 3600;

    // Progress % - Safeguard against division by zero
    const progress = target > 0 ? Math.min(100, (totalWorked / target) * 100) : 0;
    const remaining = Math.max(0, target - totalWorked);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col justify-between group hover:border-violet-200 transition-all cursor-default">

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bu Hafta</p>
                        <h3 className="text-lg font-bold text-slate-800">Haftalık Durum</h3>
                    </div>
                </div>
                {remaining === 0 ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase">
                        Tamamlandı
                    </span>
                ) : (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">
                        Devam Ediyor
                    </span>
                )}
            </div>

            {/* Main Stat */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        {fmtDecHours(totalWorked)}
                    </h2>
                    <span className="text-sm font-bold text-slate-400">/ {fmtDecHours(target)}</span>
                </div>

                {/* Progress Bar */}
                <div className="relative pt-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase">
                        <span>İlerleme %{progress.toFixed(0)}</span>
                        <span>{remaining > 0 ? `${fmtDecHours(remaining)} kaldı` : 'Hedef Aşıldı'}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${remaining === 0 ? 'bg-emerald-500' : 'bg-violet-600'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ek Mesai</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{fmtDecHours(overtime)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={14} className="text-rose-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Geç Kalma</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{Math.floor((summary.total_late_seconds || 0) / 60)} <span className="text-xs text-slate-400 font-normal">dk</span></p>
                </div>
            </div>
        </div>
    );
};

export default WeeklyPerformanceWidget;
