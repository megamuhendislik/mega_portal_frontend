import React from 'react';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const RequestCard = ({ request, type, statusBadge, onEdit, onDelete }) => {
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
            case 'LEAVE': return <FileText className="text-blue-500" size={20} />;
            case 'OVERTIME': return <Clock className="text-amber-500" size={20} />;
            case 'MEAL': return <div className="text-emerald-500 font-bold text-lg">🍽️</div>;
            default: return <FileText className="text-slate-500" size={20} />;
        }
    };

    const getTitle = () => {
        if (type === 'LEAVE') return request.leave_type_name || 'İzin Talebi';
        if (type === 'OVERTIME') return 'Fazla Mesai';
        if (type === 'MEAL') return 'Yemek Talebi';
        return 'Talep';
    };

    return (
        <div className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
            {/* Status Stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 
                ${request.status === 'APPROVED' ? 'bg-emerald-500' :
                    request.status === 'REJECTED' ? 'bg-red-500' :
                        'bg-amber-500'}`}
            />

            <div className="flex justify-between items-start mb-3 pl-2">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${type === 'LEAVE' ? 'bg-blue-50' :
                            type === 'OVERTIME' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                        {getIcon()}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">{getTitle()}</h4>
                        <p className="text-xs text-slate-400">
                            {new Date(request.created_at).toLocaleDateString('tr-TR')}
                        </p>
                    </div>
                </div>
                <div>
                    {statusBadge(request.status)}
                </div>
            </div>

            <div className="pl-2 space-y-3">
                {/* Date / Time Info */}
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <Calendar size={14} className="text-slate-400" />
                    {type === 'LEAVE' && (
                        <span>{formatDate(request.start_date)} - {formatDate(request.end_date)} <span className="text-slate-400">({request.total_days} Gün)</span></span>
                    )}
                    {type === 'OVERTIME' && (
                        <span>{formatDate(request.date)} • {formatTime(request.start_time)} - {formatTime(request.end_time)} <span className="text-slate-400">({request.duration_minutes} dk)</span></span>
                    )}
                    {type === 'MEAL' && (
                        <span>{formatDate(request.date)}</span>
                    )}
                </div>

                {/* Description */}
                <div className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                    {type === 'MEAL' ? request.description : request.reason || <span className="text-slate-400 italic">Açıklama yok</span>}
                </div>

                {/* Actions (Only for Pending) */}
                {request.status === 'PENDING' && (onEdit || onDelete) && (
                    <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(request)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Düzenle"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(request)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="İptal Et"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestCard;
