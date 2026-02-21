import React, { useState } from 'react';
import {
    ArrowUpDown, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
    FileText, Utensils, CreditCard, ChevronRight, User, MoreHorizontal,
    Check, X, Eye, Edit2, Trash2
} from 'lucide-react';

const RequestListTable = ({ requests, onViewDetails, onApprove, onReject, onEdit, onDelete, showEmployeeColumn = true }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    };

    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return '';
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        if (mins === 0) return `${hours} Saat`;
        return `${hours}s ${mins}dk`;
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'LEAVE': return <FileText size={16} className="text-blue-600" />;
            case 'OVERTIME': return <Clock size={16} className="text-amber-600" />;
            case 'MEAL': return <Utensils size={16} className="text-emerald-600" />;
            case 'CARDLESS_ENTRY': return <CreditCard size={16} className="text-purple-600" />;
            default: return <FileText size={16} className="text-slate-500" />;
        }
    };

    const getTypeLabel = (req) => {
        if (req.type === 'LEAVE') return req.leave_type_name || 'İzin';
        if (req.type === 'OVERTIME') return 'Fazla Mesai';
        if (req.type === 'MEAL') return 'Yemek';
        if (req.type === 'CARDLESS_ENTRY') return 'Kartsız Giriş';
        return 'Talep';
    };

    const getStatusBadge = (status) => {
        const styles = {
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'PENDING': 'bg-amber-100 text-amber-700',
            'POTENTIAL': 'bg-purple-100 text-purple-700',
            'CANCELED': 'bg-slate-100 text-slate-700',
        };
        const labels = {
            'APPROVED': 'Onaylandı',
            'REJECTED': 'Reddedildi',
            'PENDING': 'Bekliyor',
            'POTENTIAL': 'Potansiyel',
            'CANCELED': 'İptal',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${styles[status] || styles['PENDING']}`}>
                {status === 'APPROVED' && <CheckCircle2 size={12} />}
                {status === 'REJECTED' && <XCircle size={12} />}
                {status === 'PENDING' && <Clock size={12} />}
                {status === 'POTENTIAL' && <AlertCircle size={12} />}
                {labels[status] || status}
            </span>
        );
    };

    // Sorting Logic
    const sortedRequests = [...requests].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let valA, valB;
        if (sortConfig.key === 'date') {
            valA = new Date(a.start_date || a.date || a.created_at);
            valB = new Date(b.start_date || b.date || b.created_at);
        } else if (sortConfig.key === 'employee') {
            valA = a.employee_name || '';
            valB = b.employee_name || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const openRejectModal = (req) => {
        setSelectedRequest(req);
        setRejectReason('');
        setShowRejectModal(true);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                            {showEmployeeColumn && (
                                <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('employee')}>
                                    <div className="flex items-center gap-1">Çalışan <ArrowUpDown size={12} /></div>
                                </th>
                            )}
                            <th className="p-4 font-bold">Talep Türü</th>
                            <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-1">Tarih <ArrowUpDown size={12} /></div>
                            </th>
                            <th className="p-4 font-bold">Detay / Süre</th>
                            <th className="p-4 font-bold">Durum</th>
                            <th className="p-4 font-bold text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sortedRequests.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                            <FileText size={24} className="opacity-50" />
                                        </div>
                                        <p>Gösterilecek talep bulunamadı.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedRequests.map((req) => (
                                <tr
                                    key={req.id}
                                    onClick={() => onViewDetails && onViewDetails(req, req.type)}
                                    className={`transition-colors group cursor-pointer border-b border-transparent ${req.status === 'POTENTIAL'
                                            ? 'bg-slate-50/50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-slate-50'
                                            : 'hover:bg-slate-50/80'
                                        }`}
                                >
                                    {/* Employee */}
                                    {showEmployeeColumn && (
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                    {req.employee_avatar ? (
                                                        <img src={req.employee_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <User size={16} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{req.employee_name || 'Bilinmiyor'}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">{req.employee_department || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                    )}

                                    {/* Type */}
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center 
                                                ${req.type === 'LEAVE' ? 'bg-blue-50' :
                                                    req.type === 'OVERTIME' ? 'bg-amber-50' :
                                                        req.type === 'MEAL' ? 'bg-emerald-50' : 'bg-purple-50'}`}>
                                                {getTypeIcon(req.type)}
                                            </div>
                                            <div className="text-sm font-medium text-slate-700">
                                                {getTypeLabel(req)}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Date & Time */}
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-slate-800">
                                                {formatDate(req.start_date || req.date)}
                                            </span>
                                            {(req.end_date && req.end_date !== req.start_date) && (
                                                <span className="text-xs text-slate-400 font-medium">
                                                    ➜ {formatDate(req.end_date)}
                                                </span>
                                            )}
                                            {req.type === 'OVERTIME' && (req.start_time || req.end_time) && (
                                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit mt-0.5">
                                                    <Clock size={10} />
                                                    {formatTime(req.start_time)} - {formatTime(req.end_time)}
                                                </span>
                                            )}
                                            {req.type === 'CARDLESS_ENTRY' && (
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    {req.check_in_time && (
                                                        <span className="text-xs font-medium text-emerald-700">
                                                            Giriş: {formatTime(req.check_in_time)}
                                                        </span>
                                                    )}
                                                    {req.check_out_time && (
                                                        <span className="text-xs font-medium text-red-600">
                                                            Çıkış: {formatTime(req.check_out_time)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Detail / Duration */}
                                    <td className="p-4">
                                        <div className="max-w-[280px] space-y-1">
                                            {/* Type-specific badges */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {req.type === 'LEAVE' && (
                                                    <>
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded">
                                                            {req.total_days} Gün
                                                        </span>
                                                        {req.leave_type_name && (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                                {req.leave_type_name}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {req.type === 'OVERTIME' && (
                                                    <>
                                                        {req.total_hours != null && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded">
                                                                {req.total_hours} Saat
                                                            </span>
                                                        )}
                                                        {!req.total_hours && req.start_time && req.end_time && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded">
                                                                {calculateDuration(req.start_time, req.end_time)}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {req.type === 'CARDLESS_ENTRY' && req.check_in_time && req.check_out_time && (
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded">
                                                        {calculateDuration(req.check_in_time, req.check_out_time)}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Reason */}
                                            {(req.reason || req.description) && (
                                                <p className="text-sm text-slate-600 line-clamp-2 leading-snug" title={req.reason || req.description}>
                                                    {req.reason || req.description}
                                                </p>
                                            )}
                                            {/* Target Approver (PENDING durumda) */}
                                            {req.status === 'PENDING' && (req.target_approver_name || req.target_approver_detail?.full_name || req.approver_target?.name) && (
                                                <p className="text-[11px] text-blue-500 font-medium">
                                                    Onaya giden: {req.target_approver_name || req.target_approver_detail?.full_name || req.approver_target?.name}
                                                </p>
                                            )}
                                            {/* Approved by */}
                                            {req.approved_by_name && req.status === 'APPROVED' && (
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    Onaylayan: {req.approved_by_name}
                                                </p>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="p-4">
                                        {getStatusBadge(req.status)}
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewDetails(req, req.type); }}
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                                title="Detaylar"
                                            >
                                                <Eye size={16} />
                                            </button>

                                            {/* Owner Actions */}
                                            {onEdit && (req.status === 'PENDING' || req.status === 'POTENTIAL') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEdit(req); }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {onDelete && (req.status === 'PENDING' || req.status === 'POTENTIAL') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(req); }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                                                    title="Sil / İptal"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}

                                            {/* Manager Actions */}
                                            {(req.status === 'PENDING' || req.status === 'POTENTIAL') && onApprove && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onApprove(req.id, 'Hızlı Onay'); }}
                                                        className="w-8 h-8 flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                                                        title="Onayla"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openRejectModal(req); }}
                                                        className="w-8 h-8 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                                                        title="Reddet"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-900">Reddetme Sebebi</h3>
                        <textarea
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-sm min-h-[100px]"
                            placeholder="Lütfen bir sebep belirtiniz..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => {
                                    if (rejectReason.trim()) {
                                        onReject(selectedRequest.id, rejectReason);
                                        setShowRejectModal(false);
                                    } else {
                                        alert('Lütfen bir sebep giriniz.');
                                    }
                                }}
                                className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                            >
                                Reddet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestListTable;
