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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-blue-600" />
                        Bugün Özeti
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {new Date(summary.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {summary.is_working && (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        Şu An Çalışıyor
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Remaining Work */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Kalan Mesai</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-bold text-slate-800">
                            {Math.floor(summary.remaining_work / 60)}s {summary.remaining_work % 60}dk
                        </h4>
                        <span className="text-xs text-slate-400 mb-1">
                            / {Math.floor(summary.daily_expected / 60)}s {summary.daily_expected % 60}dk
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (summary.total_worked / summary.daily_expected) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Remaining Break */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Kalan Mola Hakkı</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-bold text-slate-800">
                            {summary.remaining_break} dk
                        </h4>
                        <span className="text-xs text-slate-400 mb-1">
                            Kullanılan: {summary.break_used} dk
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${summary.remaining_break < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (summary.break_used / (summary.break_used + summary.remaining_break || 30)) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Overtime */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Ek Mesai</p>
                    <div className="flex items-end justify-between">
                        <h4 className={`text-2xl font-bold ${summary.current_overtime > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {summary.current_overtime} dk
                        </h4>
                        {summary.current_overtime > 0 && (
                            <TrendingUp size={16} className="text-amber-500 mb-1" />
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        {summary.current_overtime > 0 ? 'Normal mesai tamamlandı.' : 'Henüz ek mesai yok.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DailySummaryCard;
