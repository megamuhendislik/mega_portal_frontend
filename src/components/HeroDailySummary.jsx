import React from 'react';
import { Clock, Coffee, Briefcase, Zap, Timer, CheckCircle2 } from 'lucide-react';
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
    const workTarget = summary.daily_expected || 480; // Default 8h if missing
    const workPercent = Math.min(100, Math.round((totalWorkMinutes / workTarget) * 100));

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-amber-500 fill-amber-500" size={24} />
                    Bugünün Durumu
                </h2>
                {isWorking && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse border border-emerald-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Aktif Mesai
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Work Widget */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mesai</p>
                                    <h3 className="text-lg font-bold text-slate-800">Çalışma Süresi</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-black text-slate-800 tracking-tight">
                                    {Math.floor(totalWorkMinutes / 60)}
                                </span>
                                <span className="text-lg font-bold text-slate-500">s</span>
                                <span className="text-4xl font-black text-slate-800 tracking-tight ml-2">
                                    {totalWorkMinutes % 60}
                                </span>
                                <span className="text-lg font-bold text-slate-500">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400">
                                Hedef: {Math.floor(workTarget / 60)}s {workTarget % 60}dk
                            </p>
                        </div>

                        <div className="mt-6">
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${workPercent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs font-bold">
                                <span className="text-blue-600">%{workPercent} Tamamlandı</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Break Widget */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:border-amber-200 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30">
                                    <Coffee size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mola</p>
                                    <h3 className="text-lg font-bold text-slate-800">Kullanılan Mola</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-black text-slate-800 tracking-tight">
                                    {Math.floor(usedBreak / 60)}
                                </span>
                                <span className="text-lg font-bold text-slate-500">s</span>
                                <span className="text-4xl font-black text-slate-800 tracking-tight ml-2">
                                    {usedBreak % 60}
                                </span>
                                <span className="text-lg font-bold text-slate-500">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400">
                                Hak: {Math.floor(totalBreakAllowance / 60)}s {totalBreakAllowance % 60}dk
                            </p>
                        </div>

                        <div className="mt-6">
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                                        usedBreak > totalBreakAllowance ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(5, breakPercent))}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs font-bold">
                                <span className={usedBreak > totalBreakAllowance ? "text-red-500" : "text-amber-600"}>
                                    {usedBreak > totalBreakAllowance ? "Süre Aşıldı" : "Limit Dahilinde"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Overtime Widget */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30">
                                    <Timer size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ekstra</p>
                                    <h3 className="text-lg font-bold text-slate-800">Fazla Mesai</h3>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-black text-slate-800 tracking-tight">
                                    {overtime}
                                </span>
                                <span className="text-lg font-bold text-slate-500">dk</span>
                            </div>
                            <p className="text-sm font-medium text-slate-400">
                                Onay bekleyen veya onaylanmış
                            </p>
                        </div>

                        <div className="mt-6">
                            {overtime > 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-700">Mesai Tespit Edildi</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                    <Clock size={16} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500">Ek mesai yok</span>
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
