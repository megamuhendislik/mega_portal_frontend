import React from 'react';
import { PieChart, Briefcase, Calendar, Star, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

const MonthlyPerformanceWidget = ({ summary, loading }) => {
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

    // Data Extraction (Handling backend V2 response format with fallbacks)
    const completed = (summary.completed_seconds || 0) / 3600;
    const missing = (summary.missing_seconds || 0) / 3600;
    const remaining = (summary.remaining_seconds || 0) / 3600;
    const target = (summary.target_seconds || 0) / 3600;
    const overtime = (summary.overtime_seconds || summary.total_overtime_seconds || 0) / 3600;
    const netBalance = (summary.net_balance_seconds || 0) / 3600;

    const isPositiveBalance = netBalance >= 0;

    // Percentages for Bar
    const totalCalc = Math.max(target, completed + missing + remaining); // Safe denominator
    // Explicitly check for > 0 to prevent NaN if all values are 0
    const pCompleted = totalCalc > 0.001 ? (completed / totalCalc) * 100 : 0;
    const pMissing = totalCalc > 0.001 ? (missing / totalCalc) * 100 : 0;
    const pRemaining = totalCalc > 0.001 ? (remaining / totalCalc) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col justify-between group hover:border-blue-200 transition-all cursor-default relative overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bu Ay</p>
                        <h3 className="text-lg font-bold text-slate-800">Aylık Performans</h3>
                    </div>
                </div>

                {/* Net Balance Badge */}
                <div className={clsx(
                    "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm",
                    isPositiveBalance ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                )}>
                    {isPositiveBalance ? <TrendingUp size={14} /> : <AlertCircle size={14} />}
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold opacity-70 leading-none mb-0.5">Net Mesai</p>
                        <p className="text-sm font-black leading-none">{isPositiveBalance ? '+' : ''}{netBalance.toFixed(1)} sa</p>
                    </div>
                </div>
            </div>

            {/* Main Progress Bar Section */}
            <div className="mb-8 z-10 relative">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{completed.toFixed(1)}</span>
                        <span className="text-sm font-bold text-slate-400 ml-1">/ {target.toFixed(0)} sa</span>
                    </div>
                </div>

                {/* Stacked Bar */}
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                        className="h-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-500 relative group/segment"
                        style={{ width: `${pCompleted}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/segment:opacity-100 transition-opacity"></div>
                    </div>
                    <div
                        className="h-full bg-red-400 hover:bg-red-300 transition-all duration-500 relative group/segment"
                        style={{ width: `${pMissing}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/segment:opacity-100 transition-opacity"></div>
                    </div>
                    <div
                        className="h-full bg-slate-200 hover:bg-slate-300 transition-all duration-500 relative group/segment"
                        style={{ width: `${pRemaining}%` }}
                    ></div>
                </div>

                {/* Legend */}
                <div className="flex justify-between mt-3 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Tamamlanan</p>
                            <p className="text-xs font-bold text-emerald-600">{completed.toFixed(1)} sa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Eksik</p>
                            <p className="text-xs font-bold text-red-500">{missing.toFixed(1)} sa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Kalan</p>
                            <p className="text-xs font-bold text-slate-500">{remaining.toFixed(1)} sa</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-auto z-10 relative">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Toplam Mesai</p>
                        <p className="text-lg font-bold text-blue-600">{overtime.toFixed(1)} sa</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Clock size={16} />
                    </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">İzinli Gün</p>
                        <p className="text-lg font-bold text-slate-700">{summary.leave_days || 0} gün</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Star size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlyPerformanceWidget;
