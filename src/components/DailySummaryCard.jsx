import React from 'react';
import { Clock, TrendingUp, LogIn, LogOut, Coffee, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const DailySummaryCard = ({ summary, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="h-20 bg-slate-100 rounded-lg"></div>
                    <div className="h-20 bg-slate-100 rounded-lg"></div>
                    <div className="h-20 bg-slate-100 rounded-lg"></div>
                    <div className="h-20 bg-slate-100 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!summary) return null;

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        return format(new Date(isoString), 'HH:mm');
    };

    // Calculate Progress
    const progress = summary.daily_expected > 0
        ? Math.min(100, (summary.total_worked / summary.daily_expected) * 100)
        : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Bugün Özeti</h3>
                        <p className="text-sm text-slate-500 font-medium capitalize">
                            {format(new Date(summary.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                        </p>
                    </div>
                </div>

                {summary.is_working && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide">Ofiste</span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Kalan Mesai / Progress */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between group hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kalan Mesai</p>
                            <h4 className="text-2xl font-black text-slate-800 mt-1">
                                {Math.floor(summary.remaining_work / 60)}<span className="text-sm font-bold text-slate-400 ml-0.5">sa</span> {summary.remaining_work % 60}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                            </h4>
                        </div>
                        <div className="bg-slate-200 p-1.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                            <Timer size={18} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-2">
                        <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] font-bold text-slate-400">Hedef: {(summary.daily_expected / 60).toFixed(1)} sa</span>
                        <span className="text-[10px] font-bold text-indigo-600">%{progress.toFixed(0)}</span>
                    </div>
                </div>

                {/* 2. Giriş / Çıkış */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center gap-3 hover:bg-slate-50 transition-colors group">
                    {/* Entry */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                <LogIn size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Giriş</span>
                        </div>
                        <span className="font-bold text-slate-800 font-mono text-sm leading-none bg-white px-2 py-1 rounded border border-slate-100">
                            {formatTime(summary.first_check_in)}
                        </span>
                    </div>
                    <div className="h-px bg-slate-100 w-full"></div>
                    {/* Exit */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                                <LogOut size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Çıkış</span>
                        </div>
                        <span className="font-bold text-slate-800 font-mono text-sm leading-none bg-white px-2 py-1 rounded border border-slate-100">
                            {formatTime(summary.last_check_out)}
                        </span>
                    </div>
                </div>

                {/* 3. Mola */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mola Hakkı</p>
                            <h4 className="text-xl font-bold text-slate-800 mt-1">
                                {Math.floor(summary.remaining_break / 60)} <span className="text-sm font-medium text-slate-400">dk</span>
                            </h4>
                        </div>
                        <div className="bg-slate-200 p-1.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-amber-500 transition-colors">
                            <Coffee size={18} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>Kullanılan: {Math.floor(summary.break_used / 60)} dk</span>
                        </div>
                        <div className="w-full bg-slate-200/50 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${summary.remaining_break < 0 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, (summary.break_used / Math.max(1, summary.break_used + summary.remaining_break)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 4. Ek Mesai */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ek Mesai</p>
                            <h4 className={`text-xl font-bold mt-1 ${summary.current_overtime > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {Math.floor(summary.current_overtime / 60)} <span className="text-sm font-medium text-slate-400">dk</span>
                            </h4>
                        </div>
                        <div className="bg-slate-200 p-1.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    {summary.current_overtime > 0 ? (
                        <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                            Onay Bekliyor
                        </div>
                    ) : (
                        <div className="mt-2 text-[10px] font-bold text-slate-400">
                            Ekstra çalışma yok
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DailySummaryCard;
