import React from 'react';
import { Clock, Coffee, Briefcase, Timer, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const HeroDailySummary = ({ summary, loading }) => {
    console.log("HeroDailySummary Render:", { summary, loading });

    if (loading || !summary) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-3xl p-6 h-48 border border-slate-100 shadow-sm"></div>
                ))}
            </div>
        );
    }

    // Correct Backend Field Mapping
    const totalWorkMinutes = summary.total_worked || 0;
    const workTarget = (summary.daily_expected !== undefined && summary.daily_expected !== null) ? summary.daily_expected : 480;
    const workPercent = workTarget > 0 ? Math.min(100, Math.round((totalWorkMinutes / workTarget) * 100)) : 0;

    const usedBreak = summary.break_used || 0;
    const breakTarget = 60; // Standard 1 hour, or calculate if needed
    // Backend separates allowance, but usually 60 mins is standard. 
    // We can assume 60 or use `remaining_break` + `break_used` if available?
    // Let's stick to 60 or 45 based on common rules, or just show Used.
    // The backend `remaining_break` is mapped. So Total = Used + Remaining.
    const totalBreakAllowance = (summary.remaining_break || 0) + usedBreak || 60;
    const breakPercent = Math.min(100, Math.round((usedBreak / totalBreakAllowance) * 100));

    const overtime = summary.current_overtime || 0;
    const isWorking = summary.is_working || false;

    return (

        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 flex items-center gap-2">
                    Bugünün Durumu
                </h2>
                {isWorking && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                        Aktif Mesai
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Work Widget */}
                <div className="glass-card p-6 group hover:border-blue-200/60">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110 opacity-80"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Performans</p>
                                    <h3 className="text-lg font-bold text-slate-700">Çalışma Süresi</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-3">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor(totalWorkMinutes / 60)}
                                </span>
                                <span className="text-base font-bold text-slate-400 uppercase">sa</span>
                                <span className="text-4xl font-black text-slate-800 tracking-tighter ml-2">
                                    {totalWorkMinutes % 60}
                                </span>
                                <span className="text-base font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100/50">
                                Hedef: {Math.floor(workTarget / 60)}s {workTarget % 60}dk
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.4)] relative"
                                    style={{ width: `${workPercent}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30"></div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-3 text-xs font-bold tracking-wide">
                                <span className="text-blue-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    %{workPercent} Tamamlandı
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Break Widget */}
                <div className="glass-card p-6 group hover:border-amber-200/60">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-50 to-orange-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110 opacity-80"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                                    <Coffee size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dinlenme</p>
                                    <h3 className="text-lg font-bold text-slate-700">Mola Kullanımı</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-3">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">
                                    {Math.floor(usedBreak / 60)}
                                </span>
                                <span className="text-base font-bold text-slate-400 uppercase">sa</span>
                                <span className="text-4xl font-black text-slate-800 tracking-tighter ml-2">
                                    {usedBreak % 60}
                                </span>
                                <span className="text-base font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100/50">
                                Hak: {Math.floor(totalBreakAllowance / 60)}s {totalBreakAllowance % 60}dk
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative",
                                        usedBreak > totalBreakAllowance
                                            ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                            : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(5, breakPercent))}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30"></div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-3 text-xs font-bold tracking-wide">
                                <span className={clsx("flex items-center gap-1", usedBreak > totalBreakAllowance ? "text-red-500" : "text-amber-600")}>
                                    <span className={clsx("w-1.5 h-1.5 rounded-full", usedBreak > totalBreakAllowance ? "bg-red-500" : "bg-amber-500")}></span>
                                    {usedBreak > totalBreakAllowance ? "Limit Aşıldı" : "Limit Dahilinde"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Overtime Widget */}
                <div className="glass-card p-6 group hover:border-emerald-200/60">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110 opacity-80"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                                    <Timer size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ekstra</p>
                                    <h3 className="text-lg font-bold text-slate-700">Fazla Mesai</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-3">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">
                                    {overtime}
                                </span>
                                <span className="text-base font-bold text-slate-400 uppercase">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400/80 leading-relaxed">
                                Onaylanmış veya bekleyen ek çalışma süresi
                            </p>
                        </div>

                        <div className="mt-8">
                            {overtime > 0 ? (
                                <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-700 tracking-wide">Mesai Tespit Edildi</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/50 backdrop-blur-sm opacity-70">
                                    <Clock size={16} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 tracking-wide">Ek mesai kaydı yok</span>
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
