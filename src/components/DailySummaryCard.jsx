import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';

const DailySummaryCard = ({ summary, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                    <div className="h-24 bg-slate-100 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!summary) {
        return null; // Or some empty state
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-slate-600" />
                        Bugün Özeti
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {new Date(summary.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {summary.is_working && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-semibold">
                        Ofiste
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 flex-1">
                {/* Remaining Work */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-slate-600">Kalan Mesai</p>
                        <span className="text-xs text-slate-400 font-mono">
                            {Math.floor(summary.daily_expected / 60)}s {summary.daily_expected % 60}dk Hedef
                        </span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-bold text-slate-900 leading-none">
                            {Math.floor(summary.remaining_work / 60)}s {summary.remaining_work % 60}dk
                        </h4>
                        <div className="h-1.5 w-24 bg-slate-200 rounded-full ml-4">
                            <div
                                className="bg-slate-800 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (summary.total_worked / summary.daily_expected) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Remaining Break */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Mola Hakkı</p>
                        <h4 className="text-xl font-bold text-slate-800">
                            {summary.remaining_break} <span className="text-sm font-normal text-slate-400">dk</span>
                        </h4>
                        <div className="w-full bg-slate-200 rounded-full h-1 mt-3">
                            <div
                                className={`h-1 rounded-full ${summary.remaining_break < 0 ? 'bg-red-500' : 'bg-slate-500'}`}
                                style={{ width: `${Math.min(100, (summary.break_used / (summary.break_used + summary.remaining_break || 30)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Overtime */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Ek Mesai</p>
                        <h4 className={`text-xl font-bold ${summary.current_overtime > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {summary.current_overtime} <span className="text-sm font-normal text-slate-400">dk</span>
                        </h4>
                        {summary.current_overtime > 0 && (
                            <div className="mt-2 text-xs text-amber-600 font-medium flex items-center">
                                <TrendingUp size={12} className="mr-1" /> Artışta
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailySummaryCard;
