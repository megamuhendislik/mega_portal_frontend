import React from 'react';
import { Calendar, Clock, FileText, CheckCircle2, XCircle, Edit2, Trash2, Check, X, User, CheckCircle, CreditCard } from 'lucide-react';

const RequestCard = ({ request, type, statusBadge, onEdit, onDelete, onApprove, onReject, isIncoming }) => {
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
            case 'CARDLESS_ENTRY': return <CreditCard className="text-purple-600" size={24} />;
            default: return <FileText className="text-slate-500" size={24} />;
        }
    };

    const getTitle = () => {
        if (isIncoming) return request.leave_type_name || (type === 'CARDLESS_ENTRY' ? 'Kartsız Giriş' : 'İzin Talebi');
        if (type === 'LEAVE') return request.leave_type_name || 'İzin Talebi';
        if (type === 'OVERTIME') return 'Fazla Mesai';
        if (type === 'MEAL') return 'Yemek Talebi';
        if (type === 'CARDLESS_ENTRY') return 'Kartsız Giriş';
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

    const statusColor = {
        bg: request.status === 'APPROVED' ? 'bg-emerald-50' : request.status === 'REJECTED' ? 'bg-red-50' : 'bg-amber-50',
        text: request.status === 'APPROVED' ? 'text-emerald-600' : request.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
    };

    // Allow action if it's incoming AND (Pending OR Rejected)
    const canAction = isIncoming && (request.status === 'PENDING' || request.status === 'REJECTED');

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
            {/* Top Status Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${getStatusColor(request.status)}`} />

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${type === 'LEAVE' ? 'bg-blue-50' : type === 'OVERTIME' ? 'bg-amber-50' : type === 'CARDLESS_ENTRY' ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                        {getIcon()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-800 text-lg leading-tight truncate pr-2">{getTitle()}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            {new Date(request.created_at).toLocaleDateString('tr-TR')}
                        </p>
                    </div>
                </div>
                {statusBadge && statusBadge(request.status)}
            </div>

            {/* Employee Info (For Incoming Requests) */}
            {request.employee_name && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <User size={16} className="text-slate-400 shrink-0" />
                        <span className="truncate">{request.employee_name}</span>
                    </div>

                    {/* Annual Leave Balance Info (Only for Incoming Leave Requests) */}
                    {isIncoming && type === 'LEAVE' && request.employee_annual_leave_balance && (
                        <div className="bg-blue-50/50 rounded-xl p-2.5 border border-blue-100 text-xs text-slate-600">
                            <h5 className="font-bold text-blue-700 mb-1.5 flex items-center gap-1.5">
                                <FileText size={12} />
                                İzin Bakiyesi
                            </h5>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white/60 p-1 rounded">
                                    <span className="block text-[10px] text-slate-400 font-bold">Kalan</span>
                                    <span className="font-black text-slate-700 text-sm">{request.employee_annual_leave_balance.remaining}</span>
                                </div>
                                <div className="bg-white/60 p-1 rounded">
                                    <span className="block text-[10px] text-slate-400 font-bold">Talep</span>
                                    <span className="font-black text-indigo-600 text-sm">{request.total_days}</span>
                                </div>
                                <div className="bg-white/60 p-1 rounded">
                                    <span className="block text-[10px] text-slate-400 font-bold">Sonuç</span>
                                    <span className={`font-black text-sm ${(request.employee_annual_leave_balance.remaining - request.total_days) < 0 ? 'text-rose-600' : 'text-emerald-600'
                                        }`}>
                                        {request.employee_annual_leave_balance.remaining - request.total_days}
                                    </span>
                                </div>
                            </div>
                            {request.employee_annual_leave_balance.last_leave_date && (
                                <div className="mt-2 text-[10px] text-center text-slate-500 bg-white/40 p-1 rounded">
                                    Son İzin Bitiş: <span className="font-bold text-slate-700">{formatDate(request.employee_annual_leave_balance.last_leave_date)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}


            {/* Details */}
            <div className="space-y-3 mb-4 flex-1">
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
                    {type === 'CARDLESS_ENTRY' && (
                        <span className="font-medium">{formatDate(request.date)} <span className="text-slate-400 mx-1">•</span> {formatTime(request.check_in_time)} - {formatTime(request.check_out_time)}</span>
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
                {!isIncoming && (
                    <>
                        {request.status === 'PENDING' && (
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
                        {/* Resubmit for Rejected Requests */}
                        {request.status === 'REJECTED' && (request.onResubmit || onEdit) && (
                            <button
                                onClick={() => (request.onResubmit ? request.onResubmit(request) : onEdit(request))} // Reuse onEdit for simplicity if onResubmit passed via parent prop
                                className="px-3 py-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-sm font-bold flex items-center gap-1.5 border border-amber-200"
                            >
                                <Edit2 size={14} />
                                Tekrar Talep Et
                            </button>
                        )}
                    </>
                )}

                {/* Manager Actions (Incoming Requests) */}
                {canAction && onApprove && onReject && (
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={() => onReject(request.id, prompt('Red sebebi:'))}
                            className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            Reddet
                        </button>
                        <button
                            onClick={() => onApprove(request.id)}
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <Check size={16} />
                            {request.status === 'REJECTED' ? 'Tekrar Onayla' : 'Onayla'}
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default RequestCard;
