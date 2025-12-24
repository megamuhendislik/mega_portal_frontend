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

const getStatusBadge = (status) => {
    const styles = {
        'OPEN': 'bg-blue-100 text-blue-700',
        'PENDING_MANAGER_APPROVAL': 'bg-yellow-100 text-yellow-700',
        'APPROVED': 'bg-emerald-100 text-emerald-700',
        'REJECTED': 'bg-red-100 text-red-700',
        'AUTO_APPROVED': 'bg-emerald-50 text-emerald-600'
    };

    const labels = {
        'OPEN': 'Çıkış Bekliyor',
        'PENDING_MANAGER_APPROVAL': 'Onay Bekliyor',
        'APPROVED': 'Onaylandı',
        'REJECTED': 'Reddedildi',
        'AUTO_APPROVED': 'Otomatik Onay'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {labels[status] || status}
        </span>
    );
};

const AttendanceLogTable = ({ logs }) => {
    return (
        <div className="card overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <th className="p-4">Tarih</th>
                            <th className="p-4">Giriş</th>
                            <th className="p-4">Çıkış</th>
                            <th className="p-4">Süre (Dk)</th>
                            <th className="p-4">Beklenen</th>
                            <th className="p-4">Mola (Dk)</th>
                            <th className="p-4">Normal / Fazla</th>
                            <th className="p-4">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                                <td className="p-4 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        {formatDate(log.work_date)}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-600">{formatTime(log.check_in)}</td>
                                <td className="p-4 font-mono text-slate-600">{formatTime(log.check_out)}</td>
                                <td className="p-4 font-bold text-slate-800">
                                    {log.total_minutes ? `${Math.floor(log.total_minutes / 60)}s ${log.total_minutes % 60}dk` : '-'}
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs">
                                    {log.normal_minutes || log.missing_minutes ?
                                        `${Math.floor(((log.normal_minutes || 0) + (log.missing_minutes || 0)) / 60)}s ${((log.normal_minutes || 0) + (log.missing_minutes || 0)) % 60}dk`
                                        : '-'
                                    }
                                </td>
                                <td className="p-4 text-slate-600">
                                    {log.break_minutes > 0 ? (
                                        <span className="text-emerald-600 font-medium">+{log.break_minutes} dk</span>
                                    ) : '-'}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col text-xs">
                                        <span className="text-slate-600">Normal: {log.normal_minutes || 0} dk</span>
                                        {log.overtime_minutes > 0 && (
                                            <span className="text-emerald-600 font-bold">Fazla: {log.overtime_minutes} dk</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    {getStatusBadge(log.status)}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-slate-400">
                                    Henüz kayıt bulunmamaktadır.
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
