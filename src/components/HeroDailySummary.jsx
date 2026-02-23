import React from 'react';
import { Clock, Coffee, Briefcase, Timer, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const HeroDailySummary = ({ summary, loading }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-3xl p-6 h-48 border border-slate-100 shadow-sm"></div>
                ))}
            </div>
        );
    }

    // Default to empty object if summary is missing (e.g. API error or not deployed yet)
    const safeSummary = summary || {};

    // Correct Backend Field Mapping (Now Seconds)
    const totalWorkSeconds = safeSummary.total_worked || 0;
    const workTargetSeconds = (safeSummary.daily_expected !== undefined && safeSummary.daily_expected !== null) ? safeSummary.daily_expected : 0;
    const workPercent = workTargetSeconds > 0 ? Math.min(100, Math.round((totalWorkSeconds / workTargetSeconds) * 100)) : 0;

    const usedBreakSeconds = safeSummary.break_used || 0;
    const totalBreakAllowanceSeconds = safeSummary.break_allowance || ((safeSummary.remaining_break || 0) + usedBreakSeconds);
    const breakPercent = totalBreakAllowanceSeconds > 0
        ? Math.min(100, Math.round((usedBreakSeconds / totalBreakAllowanceSeconds) * 100))
        : 0;

    const overtimeSeconds = safeSummary.current_overtime || 0;
    const isWorking = safeSummary.is_working || false;

    return (

        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                    Bugünün Durumu
                </h2>
                {isWorking && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                        Aktif Mesai
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Work Widget - Blue/Indigo Theme */}
                <div className="relative overflow-hidden bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-indigo-500/5 group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                    {/* Background Decor */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:rotate-6 transition-all duration-300">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">PUANTAJ</p>
                                    <h3 className="text-base font-bold text-slate-700">Çalışma Süresi</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor(totalWorkSeconds / 3600)}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase mr-2">sa</span>
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor((totalWorkSeconds % 3600) / 60)}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 pl-1">
                                Hedef: <span className="text-slate-600">{Math.floor(workTargetSeconds / 3600)}s {Math.floor((workTargetSeconds % 3600) / 60)}dk</span>
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] relative"
                                    style={{ width: `${workPercent}%`, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50"></div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-3 text-[10px] font-bold tracking-wide uppercase">
                                <span className="text-indigo-600">%{workPercent} Tamamlandı</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Break Widget - Amber/Orange Theme */}
                <div className="relative overflow-hidden bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-amber-500/5 group transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1">
                    {/* Background Decor */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 group-hover:rotate-6 transition-all duration-300">
                                    <Coffee size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">DİNLENME</p>
                                    <h3 className="text-base font-bold text-slate-700">Mola Kullanımı</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor(usedBreakSeconds / 3600)}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase mr-2">sa</span>
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor((usedBreakSeconds % 3600) / 60)}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 pl-1">
                                Hak: <span className="text-slate-600">{Math.floor(totalBreakAllowanceSeconds / 3600)}s {Math.floor((totalBreakAllowanceSeconds % 3600) / 60)}dk</span>
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full rounded-full shadow-sm relative",
                                        usedBreakSeconds > totalBreakAllowanceSeconds
                                            ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                            : "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(5, breakPercent))}%`, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50"></div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-3 text-[10px] font-bold tracking-wide uppercase">
                                <span className={clsx(usedBreakSeconds > totalBreakAllowanceSeconds ? "text-red-500" : "text-amber-600")}>
                                    {usedBreakSeconds > totalBreakAllowanceSeconds ? "LİMİT AŞILDI" : "LİMİT DAHİLİNDE"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Overtime Widget - Emerald/Teal Theme */}
                <div className="relative overflow-hidden bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-emerald-500/5 group transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
                    {/* Background Decor */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:rotate-6 transition-all duration-300">
                                    <Timer size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">EKSTRA</p>
                                    <h3 className="text-base font-bold text-slate-700">Fazla Mesai</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor(overtimeSeconds / 60)}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 pl-1">
                                Onaylanan veya bekleyen
                            </p>
                        </div>

                        <div className="mt-8">
                            {overtimeSeconds > 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100/50">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Mesai Tespit Edildi</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100/50 opacity-60">
                                    <Clock size={14} className="text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Kayıt Yok</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default HeroDailySummary;
