import React from 'react';
import { Calendar } from 'lucide-react';

const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
};

const getStatusBadge = (log) => {
    const status = log.status;

    // Custom Check: Normal Mesai (Approved/Calculated but no overtime)
    if (['APPROVED', 'AUTO_APPROVED', 'CALCULATED'].includes(status) && (!log.overtime_minutes || log.overtime_minutes <= 0)) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span className="text-[10px] font-bold uppercase tracking-wide">Normal</span>
            </div>
        );
    }

    const styles = {
        'OPEN': 'bg-blue-50 border-blue-100 text-blue-600',
        'PENDING_MANAGER_APPROVAL': 'bg-amber-50 border-amber-100 text-amber-600',
        'APPROVED': 'bg-emerald-50 border-emerald-100 text-emerald-600',
        'REJECTED': 'bg-rose-50 border-rose-100 text-rose-600',
        'AUTO_APPROVED': 'bg-emerald-50 border-emerald-100 text-emerald-600',
        'CALCULATED': 'bg-slate-50 border-slate-200 text-slate-500'
    };

    const dots = {
        'OPEN': 'bg-blue-500',
        'PENDING_MANAGER_APPROVAL': 'bg-amber-500',
        'APPROVED': 'bg-emerald-500',
        'REJECTED': 'bg-rose-500',
        'AUTO_APPROVED': 'bg-emerald-500',
        'CALCULATED': 'bg-slate-400'
    };

    const labels = {
        'OPEN': 'Çıkış Bekliyor',
        'PENDING_MANAGER_APPROVAL': 'Onay Bekliyor',
        'APPROVED': 'Onaylandı',
        'REJECTED': 'Reddedildi',
        'AUTO_APPROVED': 'Otomatik',
        'CALCULATED': 'Kapandı'
    };

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-50 border-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || 'bg-gray-400'} shadow-sm`}></span>
            <span className="text-[10px] font-bold uppercase tracking-wide">{labels[status] || status}</span>
        </div>
    );
};

const AttendanceLogTable = ({ logs }) => {
    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                            <th className="p-5 pl-8">Tarih</th>
                            <th className="p-5">Giriş</th>
                            <th className="p-5">Çıkış</th>
                            <th className="p-5">Süre</th>
                            <th className="p-5">Beklenen</th>
                            <th className="p-5">Mola</th>
                            <th className="p-5">Durum</th>
                            <th className="p-5 pr-8 text-right">Detay</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/50">
                        {logs.map((log) => (
                            <tr key={log.id} className="group hover:bg-slate-50/80 transition-colors duration-200 cursor-default">
                                <td className="p-5 pl-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-white group-hover:text-indigo-500 group-hover:shadow-md transition-all duration-300">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                                                {formatDate(log.work_date).split(' ').slice(0, 3).join(' ')}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                {formatDate(log.work_date).split(' ').pop()}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 font-mono text-sm text-slate-600 font-semibold">{formatTime(log.check_in)}</td>
                                <td className="p-5 font-mono text-sm text-slate-600 font-semibold">{formatTime(log.check_out)}</td>
                                <td className="p-5">
                                    <span className="font-bold text-slate-800 text-sm">
                                        {log.total_minutes ? `${Math.floor(log.total_minutes / 60)}s ${log.total_minutes % 60}dk` : '-'}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-400 font-medium text-xs">
                                    {log.normal_minutes || log.missing_minutes ?
                                        `${Math.floor(((log.normal_minutes || 0) + (log.missing_minutes || 0)) / 60)}s ${((log.normal_minutes || 0) + (log.missing_minutes || 0)) % 60}dk`
                                        : '-'
                                    }
                                </td>
                                <td className="p-5">
                                    {log.break_minutes > 0 ? (
                                        <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-lg">
                                            {log.break_minutes} dk
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-5">
                                    <div className="flex flex-col items-start gap-1">
                                        {getStatusBadge(log)}
                                        {log.overtime_minutes > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 pl-1">
                                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                                +{log.overtime_minutes} dk Fazla
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-5 pr-8 text-right">
                                    {log.note && (
                                        <div className="group/note relative inline-block">
                                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center cursor-help border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors">
                                                <span className="text-xs font-bold font-serif">i</span>
                                            </div>
                                            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-56 p-3 bg-slate-800 text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                                {log.note}
                                                <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-800"></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="8" className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-3 opacity-50">
                                        <Calendar size={32} />
                                        <span className="text-sm font-medium">Bu aralıkta gösterilecek kayıt bulunamadı.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceLogTable;
