import React from 'react';
import { Clock, Coffee, Briefcase, Zap, Timer } from 'lucide-react';
import clsx from 'clsx';

const HeroDailySummary = ({ summary, loading }) => {
    if (loading || !summary) {
        return (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 w-full animate-pulse h-64">
                <div className="h-8 bg-slate-100 rounded-lg w-1/3 mb-10"></div>
                <div className="space-y-8">
                    <div className="h-4 bg-slate-50 rounded w-full"></div>
                    <div className="h-4 bg-slate-50 rounded w-full"></div>
                </div>
            </div>
        );
    }

    // Calculations
    const totalWorkMinutes = summary.total_inside_duration_minutes || 0;
    const workTarget = 540; // 9 hours * 60 minutes
    const workPercent = Math.min(100, Math.round((totalWorkMinutes / workTarget) * 100));

    const usedBreak = summary.total_break_duration_minutes || 0;
    const breakTarget = 60; // 1 hour
    const breakPercent = Math.min(100, Math.round((usedBreak / breakTarget) * 100));

    const overtime = summary.overtime_minutes || 0;

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 w-full relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Zap className="text-amber-500 fill-amber-500" size={24} />
                            Bugünün Özeti
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Bugünkü mesai durumu ve mola kullanımları.</p>
                    </div>
                    {summary.is_active && (
                        <div className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse border border-emerald-200">
                            Aktif Mesai
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Work Progress */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                <Briefcase size={18} className="text-blue-500" />
                                <span>Mesai Durumu</span>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-slate-800 tabular-nums">
                                    {Math.floor(totalWorkMinutes / 60)}<span className="text-base font-medium text-slate-400">s</span> {totalWorkMinutes % 60}<span className="text-base font-medium text-slate-400">dk</span>
                                </div>
                                <div className="text-xs text-slate-400 font-medium">/ 09s 00dk Hedef</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                            {/* Striped Pattern Overlay */}
                            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>

                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out relative shadow-sm"
                                style={{ width: `${workPercent}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                            </div>
                        </div>

                        {/* Helper Text */}
                        <div className="flex justify-between text-xs font-semibold text-slate-400 mt-1">
                            <span>%{workPercent} Tamamlandı</span>
                            <span>{Math.max(0, workTarget - totalWorkMinutes)}dk Kaldı</span>
                        </div>
                    </div>

                    {/* Break Progress */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                <Coffee size={18} className="text-amber-500" />
                                <span>Mola Kullanımı</span>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-slate-800 tabular-nums">
                                    {Math.floor(usedBreak / 60)}<span className="text-base font-medium text-slate-400">s</span> {usedBreak % 60}<span className="text-base font-medium text-slate-400">dk</span>
                                </div>
                                <div className="text-xs text-slate-400 font-medium">/ 01s 00dk Hak</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                            <div
                                className={clsx(
                                    "h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm",
                                    usedBreak > breakTarget ? "bg-gradient-to-r from-red-400 to-red-600" : "bg-gradient-to-r from-amber-400 to-orange-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(5, breakPercent))}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                            </div>
                        </div>

                        {/* Helper Text */}
                        <div className="flex justify-between text-xs font-semibold text-slate-400 mt-1">
                            <span className={usedBreak > breakTarget ? "text-red-500" : ""}>
                                {usedBreak > breakTarget ? "Süre Aşıldı" : `Kalan: ${breakTarget - usedBreak}dk`}
                            </span>
                            {overtime > 0 && (
                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <Timer size={10} /> +{overtime}dk Ek Mesai
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroDailySummary;
