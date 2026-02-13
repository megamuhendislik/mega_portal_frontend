import React, { useState } from 'react';
import { Calendar, Clock, FileText, CheckCircle2, XCircle, Edit2, Trash2, Check, X, User, CheckCircle, CreditCard } from 'lucide-react';

const RequestCard = ({ request, type, statusBadge, onEdit, onDelete, onApprove, onReject, isIncoming, onViewDetails }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
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
        <div
            onClick={() => onViewDetails && onViewDetails(request, type)}
            className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden flex flex-col h-full cursor-pointer"
        >
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

                    {/* Monthly Work Stats (For Incoming Overtime Requests) */}
                    {isIncoming && type === 'OVERTIME' && request.employee_monthly_stats && (() => {
                        const s = request.employee_monthly_stats;
                        return (
                            <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 text-xs text-slate-600 space-y-2">
                                <h5 className="font-bold text-amber-700 mb-1.5 flex items-center gap-1.5">
                                    <Clock size={12} />
                                    Aylık Mesai Özeti
                                </h5>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="bg-white/60 p-1.5 rounded">
                                        <span className="block text-[10px] text-slate-400 font-bold">Hedef</span>
                                        <span className="font-black text-slate-700 text-sm">{s.target_hours}s</span>
                                    </div>
                                    <div className="bg-white/60 p-1.5 rounded">
                                        <span className="block text-[10px] text-slate-400 font-bold">Tamamlanan</span>
                                        <span className="font-black text-emerald-600 text-sm">{s.completed_hours}s</span>
                                    </div>
                                    <div className="bg-white/60 p-1.5 rounded">
                                        <span className="block text-[10px] text-slate-400 font-bold">Eksik</span>
                                        <span className={`font-black text-sm ${s.missing_hours > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{s.missing_hours}s</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-center">
                                    <div className="bg-white/60 p-1.5 rounded">
                                        <span className="block text-[10px] text-slate-400 font-bold">Fazla Mesai</span>
                                        <span className="font-black text-amber-600 text-sm">{s.overtime_hours}s</span>
                                    </div>
                                    <div className="bg-white/60 p-1.5 rounded">
                                        <span className="block text-[10px] text-slate-400 font-bold">Net Bakiye</span>
                                        <span className={`font-black text-sm ${s.is_surplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {s.net_balance_hours > 0 ? '+' : ''}{s.net_balance_hours}s
                                        </span>
                                    </div>
                                </div>
                                {/* OT Request Counts */}
                                <div className="bg-white/60 rounded p-1.5 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-bold">Bu Ay Onaylanan EK Mesai:</span>
                                    <span className="text-xs font-black text-amber-700">{s.ot_requests_approved} talep • {s.ot_total_approved_minutes} dk</span>
                                </div>
                                {(s.ot_requests_pending > 0 || s.ot_requests_rejected > 0) && (
                                    <div className="flex gap-2 text-[10px]">
                                        {s.ot_requests_pending > 0 && (
                                            <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10} /> {s.ot_requests_pending} Askıda</span>
                                        )}
                                        {s.ot_requests_rejected > 0 && (
                                            <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"><XCircle size={10} /> {s.ot_requests_rejected} Reddedilmiş</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Meal Order Info (For Incoming Overtime Requests) */}
            {isIncoming && type === 'OVERTIME' && request.employee_meal_info && (
                <div className="bg-orange-50/50 rounded-xl p-2.5 border border-orange-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                                <span className="text-sm">🍽️</span>
                            </div>
                            <span className="font-medium text-slate-700 truncate">{request.employee_meal_info.description}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 ${request.employee_meal_info.is_ordered
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                            {request.employee_meal_info.is_ordered ? 'Sipariş Verildi' : 'Bekliyor'}
                        </span>
                    </div>
                    {request.employee_meal_info.order_note && (
                        <p className="text-[10px] text-slate-500 mt-1 pl-8 italic">{request.employee_meal_info.order_note}</p>
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

                {/* Rejection Reason Display */}
                {request.status === 'REJECTED' && request.rejection_reason && (
                    <div className="bg-red-50 rounded-xl p-3 border border-red-200 text-sm">
                        <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                            <XCircle size={14} />
                            Red Sebebi
                        </div>
                        <p className="text-red-600 text-sm leading-relaxed">{request.rejection_reason}</p>
                    </div>
                )}
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
                            onClick={(e) => { e.stopPropagation(); setShowRejectModal(true); }}
                            className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            Reddet
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onApprove(request.id); }}
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <Check size={16} />
                            {request.status === 'REJECTED' ? 'Tekrar Onayla' : 'Onayla'}
                        </button>
                    </div>
                )}
            </div>

            {/* Reject Reason Modal */}
            {showRejectModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={(e) => { e.stopPropagation(); setShowRejectModal(false); setRejectReason(''); }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <XCircle size={20} className="text-red-500" />
                                Talebi Reddet
                            </h3>
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                            Bu talebi reddetmek istediğinize emin misiniz? Lütfen bir sebep belirtiniz.
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Red Sebebi <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows="3"
                                autoFocus
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                                placeholder="Talebin reddedilme sebebini yazınız..."
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition font-medium text-sm"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => {
                                    if (!rejectReason.trim()) {
                                        alert('Red sebebi girmelisiniz.');
                                        return;
                                    }
                                    onReject(request.id, rejectReason.trim());
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold text-sm shadow-lg shadow-red-500/20"
                            >
                                Reddet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default RequestCard;
