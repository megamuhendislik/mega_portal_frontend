import React from 'react';
import { Clock, TrendingUp, LogIn, LogOut, Coffee, Timer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const DailySummaryCard = ({ summary, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
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

    // Remaining Work Text
    const remainingHours = Math.floor(summary.remaining_work / 3600);
    const remainingMinutes = Math.ceil((summary.remaining_work % 3600) / 60);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 transition-all hover:shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-base">Bugün Özeti</h3>
                        <p className="text-xs text-slate-500 font-medium capitalize">
                            {format(new Date(summary.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                        </p>
                    </div>
                </div>

                {summary.is_working ? (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide">Ofiste</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide">Ofis Dışı</span>
                    </div>
                )}
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* 1. Kalan Mesai Widget */}
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3 border border-indigo-100 flex flex-col justify-between relative overflow-hidden group">
                    {/* Decorative bg circle */}
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-100/50 rounded-full blur-xl group-hover:bg-indigo-200/50 transition-all"></div>

                    <div className="flex justify-between items-start z-10">
                        <div>
                            <p className="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wider">Kalan Süre</p>
                            {summary.remaining_work > 0 ? (
                                <h4 className="text-xl font-black text-indigo-900 mt-1">
                                    {remainingHours}<span className="text-xs font-bold text-indigo-400 ml-0.5">sa</span> {remainingMinutes}<span className="text-xs font-bold text-indigo-400 ml-0.5">dk</span>
                                </h4>
                            ) : (
                                <h4 className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1">
                                    Tamamlandı <CheckCircle size={16} />
                                </h4>
                            )}
                        </div>
                        <div className="text-indigo-400">
                            <Timer size={18} />
                        </div>
                    </div>

                    <div className="mt-3 z-10">
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">İlerleme</span>
                            <span className="text-[10px] font-bold text-indigo-600">%{progress.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Giriş/Çıkış Widget */}
                <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-lg border border-emerald-50/50">
                        <div className="flex items-center gap-2">
                            <LogIn size={14} className="text-emerald-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Giriş</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-700">{formatTime(summary.first_check_in)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-rose-50/50 rounded-lg border border-rose-50/50">
                        <div className="flex items-center gap-2">
                            <LogOut size={14} className="text-rose-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Çıkış</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-700">{formatTime(summary.last_check_out)}</span>
                    </div>
                </div>

                {/* 3. Mola Widget */}
                <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between shadow-sm hover:border-amber-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mola</p>
                            <h4 className="text-lg font-bold text-slate-700 mt-0.5">
                                {Math.floor(summary.break_used / 60)} <span className="text-xs font-medium text-slate-400">/ {Math.floor((summary.break_used + summary.remaining_break) / 60)} dk</span>
                            </h4>
                        </div>
                        <div className="text-amber-500 bg-amber-50 p-1.5 rounded-lg">
                            <Coffee size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${summary.remaining_break < 0 ? 'bg-rose-500' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, (summary.break_used / Math.max(1, summary.break_used + summary.remaining_break)) * 100)}%` }}
                            ></div>
                        </div>
                        {summary.remaining_break < 0 && (
                            <p className="text-[10px] text-rose-500 font-bold mt-1 text-right">+{Math.abs(Math.floor(summary.remaining_break / 60))}dk aşıldı</p>
                        )}
                    </div>
                </div>

                {/* 4. Fazla Mesai / Durum Widget */}
                <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between shadow-sm hover:border-emerald-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fazla Mesai</p>
                            <h4 className={`text-lg font-bold mt-0.5 ${summary.current_overtime > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {Math.floor(summary.current_overtime / 60)} <span className="text-xs font-medium text-slate-400">dk</span>
                            </h4>
                        </div>
                        <div className={`p-1.5 rounded-lg ${summary.current_overtime > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            <TrendingUp size={16} />
                        </div>
                    </div>

                    {summary.current_overtime > 0 ? (
                        <div className="mt-auto pt-2 flex items-center gap-1.5">
                            <AlertCircle size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">Onay Sürecinde</span>
                        </div>
                    ) : (
                        <div className="mt-auto pt-2">
                            <span className="text-[10px] font-medium text-slate-400 block leading-tight">İlave çalışma saati bulunmuyor.</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

// Helper component for formatting checks
const CheckCircle = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default DailySummaryCard;
