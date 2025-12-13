import React from 'react';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, MoreVertical, Edit2, Trash2, Check, X, User } from 'lucide-react';

const RequestCard = ({ request, type, statusBadge, onEdit, onDelete, onApprove, onReject }) => {
    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    };

    const getIcon = () => {
        switch (type) {
            case 'LEAVE': return <FileText className="text-blue-600" size={24} />;
            case 'OVERTIME': return <Clock className="text-amber-600" size={24} />;
            case 'MEAL': return <div className="text-2xl">🍽️</div>;
            default: return <FileText className="text-slate-500" size={24} />;
        }
    };

    const getTitle = () => {
        if (type === 'LEAVE') return request.leave_type_name || 'İzin Talebi';
        if (type === 'OVERTIME') return 'Fazla Mesai';
        if (type === 'MEAL') return 'Yemek Talebi';
        return 'Talep';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500';
            case 'REJECTED': return 'bg-red-500';
            case 'PENDING': return 'bg-amber-500';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className="group bg-white rounded-2xl p-0 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
            {/* Top Status Line */}
            <div className={`h-1.5 w-full ${getStatusColor(request.status)}`} />

            <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm
                            ${type === 'LEAVE' ? 'bg-blue-50' :
                                type === 'OVERTIME' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                            {getIcon()}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg leading-tight">{getTitle()}</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {new Date(request.created_at).toLocaleDateString('tr-TR')}
                            </p>
                        </div>
                    </div>
                    {statusBadge(request.status)}
                </div>

                {/* Employee Info (For Incoming Requests) */}
                {request.employee_name && (
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <User size={16} className="text-slate-400" />
                        {request.employee_name}
                    </div>
                )}

                {/* Details */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                        <Calendar size={16} className="text-slate-400 shrink-0" />
                        {type === 'LEAVE' && (
                            <span className="font-medium">{formatDate(request.start_date)} - {formatDate(request.end_date)} <span className="text-slate-400 font-normal">({request.total_days} Gün)</span></span>
                        )}
                        {type === 'OVERTIME' && (
                            <span className="font-medium">{formatDate(request.date)} <span className="text-slate-400 mx-1">•</span> {formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
                        )}
                        {type === 'MEAL' && (
                            <span className="font-medium">{formatDate(request.date)}</span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 leading-relaxed min-h-[3rem]">
                        {type === 'MEAL' ? request.description : request.reason || <span className="text-slate-400 italic">Açıklama belirtilmemiş.</span>}
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end gap-2">
                    {/* Owner Actions */}
                    {request.status === 'PENDING' && !onApprove && (onEdit || onDelete) && (
                        <>
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(request)}
                                    className="px-3 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
                                >
                                    <Edit2 size={14} />
                                    Düzenle
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(request)}
                                    className="px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    İptal
                                </button>
                            )}
                        </>
                    )}

                    {/* Manager Actions (Incoming Requests) */}
                    {onApprove && onReject && request.status === 'PENDING' && (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => onReject(request)}
                                className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <X size={16} />
                                Reddet
                            </button>
                            <button
                                onClick={() => onApprove(request)}
                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <Check size={16} />
                                Onayla
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestCard;
