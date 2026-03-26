import React from 'react';
import {
    ChevronDown, ChevronRight, Clock, FileText, Utensils, Briefcase,
    CreditCard, CheckCircle2, XCircle, AlertCircle, User, ArrowRight,
    Check, X, Eye, Edit2, Trash2, HeartPulse, Stethoscope, Shield, CalendarHeart
} from 'lucide-react';
import RequestImpactPanel from './RequestImpactPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

const formatTime = (timeString) => {
    if (!timeString) return '';
    return String(timeString).substring(0, 5);
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

// Extract time info from date_segments when start_time/end_time are null (External Duty)
const getSegmentTimes = (req) => {
    const segs = req.date_segments || req.duty_work_info?.date_segments;
    if (!Array.isArray(segs) || segs.length === 0) return null;
    if (segs.length === 1) {
        const s = segs[0];
        if (s.start_time && s.end_time) return { start: s.start_time, end: s.end_time };
    }
    // Multi-day: calculate total minutes across all segments
    let totalMin = 0;
    let allHaveTimes = true;
    for (const s of segs) {
        if (!s.start_time || !s.end_time) { allHaveTimes = false; break; }
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        totalMin += diff;
    }
    if (allHaveTimes) return { totalMinutes: totalMin, segmentCount: segs.length };
    return null;
};

const getTypeIcon = (type) => {
    switch (type) {
        case 'LEAVE': return <FileText size={16} className="text-blue-600" />;
        case 'EXTERNAL_DUTY': return <Briefcase size={16} className="text-indigo-600" />;
        case 'OVERTIME': return <Clock size={16} className="text-amber-600" />;
        case 'MEAL': return <Utensils size={16} className="text-emerald-600" />;
        case 'CARDLESS_ENTRY': return <CreditCard size={16} className="text-purple-600" />;
        case 'HEALTH_REPORT': return <HeartPulse size={16} className="text-red-600" />;
        case 'HOSPITAL_VISIT': return <Stethoscope size={16} className="text-rose-600" />;
        case 'SPECIAL_LEAVE': return <CalendarHeart size={16} className="text-indigo-600" />;
        default: return <FileText size={16} className="text-slate-500" />;
    }
};

const getTypeLabel = (req) => {
    // Check _type first (set by MyRequestsTab), then type (set by all_team endpoint)
    const effectiveType = req._type || req.type;
    if (effectiveType === 'EXTERNAL_DUTY') return req.leave_type_name || 'Dış Görev';
    if (req.type === 'LEAVE') return req.leave_type_name || 'İzin';
    if (req.type === 'OVERTIME') return 'Fazla Mesai';
    if (req.type === 'MEAL') return 'Yemek';
    if (req.type === 'CARDLESS_ENTRY') return 'Kartsız Giriş';
    if (req.type === 'HEALTH_REPORT') return 'Sağlık Raporu';
    if (req.type === 'HOSPITAL_VISIT') return 'Hastane Ziyareti';
    if (req.type === 'SPECIAL_LEAVE') return req.leave_type_name || 'Özel İzin';
    return 'Talep';
};

const typeBgLookup = {
    LEAVE: 'bg-blue-50',
    EXTERNAL_DUTY: 'bg-indigo-50',
    OVERTIME: 'bg-amber-50',
    MEAL: 'bg-emerald-50',
    CARDLESS_ENTRY: 'bg-purple-50',
    HEALTH_REPORT: 'bg-red-50',
    HOSPITAL_VISIT: 'bg-rose-50',
    SPECIAL_LEAVE: 'bg-indigo-50',
};

// ─── Status badge config (static Tailwind classes) ────────────────────────
const statusConfig = {
    APPROVED: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Onaylandı',
        icon: <CheckCircle2 size={12} />,
    },
    ORDERED: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Sipariş Edildi',
        icon: <CheckCircle2 size={12} />,
    },
    REJECTED: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Reddedildi',
        icon: <XCircle size={12} />,
    },
    CANCELLED: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: 'İptal',
        icon: <XCircle size={12} />,
    },
    CANCELED: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: 'İptal',
        icon: <XCircle size={12} />,
    },
    PENDING: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        label: 'Bekliyor',
        icon: <Clock size={12} />,
    },
    POTENTIAL: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'Potansiyel',
        icon: <AlertCircle size={12} />,
    },
    DELIVERED: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'Teslim Edildi',
        icon: <CheckCircle2 size={12} />,
    },
};

const getStatusBadge = (status) => {
    const cfg = statusConfig[status] || statusConfig.PENDING;
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

// ─── Time Range Renderer ──────────────────────────────────────────────────
const TimeRange = ({ req }) => {
    if (req.type === 'OVERTIME' && req.start_time && req.end_time) {
        return (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                <Clock size={10} />
                {formatTime(req.start_time)} - {formatTime(req.end_time)}
            </span>
        );
    }
    if (req.type === 'CARDLESS_ENTRY') {
        const cin = formatTime(req.check_in_time);
        const cout = formatTime(req.check_out_time);
        if (cin || cout) {
            return (
                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    {cin || '--:--'} - {cout || '--:--'}
                </span>
            );
        }
    }
    if (req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT') {
        if (req.start_time && req.end_time) {
            return (
                <span className="text-xs font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <Clock size={10} />
                    {formatTime(req.start_time)} - {formatTime(req.end_time)}
                </span>
            );
        }
        return <span className="text-xs text-slate-400">Tam gün</span>;
    }
    if (req.type === 'LEAVE') {
        if (req.start_time && req.end_time) {
            return (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {formatTime(req.start_time)} - {formatTime(req.end_time)}
                </span>
            );
        }
        // Fallback: check date_segments for External Duty partial-day entries
        const segTimes = getSegmentTimes(req);
        if (segTimes?.start && segTimes?.end) {
            return (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {formatTime(segTimes.start)} - {formatTime(segTimes.end)}
                </span>
            );
        }
        if (segTimes?.segmentCount > 1) {
            return (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {segTimes.segmentCount} gün <span className="text-blue-400 font-normal">(parçalı)</span>
                </span>
            );
        }
        const days = req.total_days || 1;
        const totalH = days * 9;
        return (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                {totalH} saat <span className="text-blue-400 font-normal">(Tam gün{days > 1 ? ` × ${days}` : ''})</span>
            </span>
        );
    }
    if (req.type === 'SPECIAL_LEAVE') {
        const days = req.total_days || 1;
        return (
            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                {days} gün
            </span>
        );
    }
    if (req.type === 'MEAL') {
        return <span className="text-xs text-slate-300">&mdash;</span>;
    }
    return <span className="text-xs text-slate-300">&mdash;</span>;
};

// ─── Duration Renderer ────────────────────────────────────────────────────
const DurationCell = ({ req }) => {
    if (req.type === 'OVERTIME') {
        if (req.total_hours != null) {
            return <span className="text-xs font-bold text-amber-700">{req.total_hours} Saat</span>;
        }
        if (req.start_time && req.end_time) {
            return <span className="text-xs font-bold text-amber-700">{calculateDuration(req.start_time, req.end_time)}</span>;
        }
        return <span className="text-xs text-slate-400">-</span>;
    }
    if (req.type === 'LEAVE') {
        if (req.start_time && req.end_time) {
            return <span className="text-xs font-bold text-blue-700">{calculateDuration(req.start_time, req.end_time)}</span>;
        }
        // Fallback: check date_segments for External Duty partial-day entries
        const segTimes = getSegmentTimes(req);
        if (segTimes?.start && segTimes?.end) {
            return <span className="text-xs font-bold text-blue-700">{calculateDuration(segTimes.start, segTimes.end)}</span>;
        }
        if (segTimes?.totalMinutes > 0) {
            const th = Math.floor(segTimes.totalMinutes / 60);
            const tm = segTimes.totalMinutes % 60;
            const lbl = tm > 0 ? `${th}s ${tm}dk` : `${th} Saat`;
            return <span className="text-xs font-bold text-blue-700">{lbl}</span>;
        }
        const days = req.total_days || 1;
        const hours = days * 9;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const label = m > 0 ? `${h}s ${m}dk` : `${h} Saat`;
        const isFullDay = days >= 1;
        return <span className="text-xs font-bold text-blue-700">{label} {isFullDay && <span className="text-blue-400 font-normal">(Tam gün{days > 1 ? ` × ${days}` : ''})</span>}</span>;
    }
    if (req.type === 'CARDLESS_ENTRY' && req.check_in_time && req.check_out_time) {
        return <span className="text-xs font-bold text-purple-700">{calculateDuration(req.check_in_time, req.check_out_time)}</span>;
    }
    if ((req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT') && req.start_time && req.end_time) {
        return <span className="text-xs font-bold text-pink-700">{calculateDuration(req.start_time, req.end_time)}</span>;
    }
    if ((req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT') && !req.start_time) {
        return <span className="text-xs font-bold text-red-600">Tam Gün</span>;
    }
    if (req.type === 'SPECIAL_LEAVE') {
        const days = req.total_days || 1;
        return <span className="text-xs font-bold text-indigo-700">{days} Gün</span>;
    }
    return <span className="text-xs text-slate-400">-</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────
const ExpandableRequestRow = ({
    req,
    isExpanded,
    onToggle,
    onViewDetails,
    onViewDetail,
    onApprove,
    onReject,
    onEdit,
    onDelete,
    claimPotentialRenderer,
    showEmployeeColumn = true,
    mode = 'incoming',
}) => {
    if (!req) return null;

    const isPotential = req.status === 'POTENTIAL';
    const isPending = req.status === 'PENDING';
    const colCount = 7 + (showEmployeeColumn ? 1 : 0) + (mode === 'incoming' ? 1 : 0);
    const isHealthType = req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT';
    const isSpecialLeave = req.type === 'SPECIAL_LEAVE';
    const isReadOnlyType = isHealthType || isSpecialLeave || req.type === 'MEAL';

    return (
        <>
            {/* Main row */}
            <tr
                onClick={() => onToggle && onToggle()}
                className={`transition-all duration-200 group cursor-pointer border-b border-slate-50 ${
                    isPotential
                        ? 'bg-slate-50/50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-slate-50'
                        : isExpanded
                            ? 'bg-blue-50/30 border-b-0'
                            : 'hover:bg-slate-50/80'
                }`}
            >
                {/* Expand toggle */}
                <td className="w-8 pl-3 pr-0 py-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        isExpanded ? 'bg-blue-100 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                        {isExpanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />
                        }
                    </div>
                </td>

                {/* Talep Eden */}
                {showEmployeeColumn && (
                    <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200 shrink-0">
                                {req.employee_avatar ? (
                                    <img src={req.employee_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <User size={14} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate max-w-[140px]">
                                    {req.employee_name || 'Bilinmiyor'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                                    {req.employee_department || '-'}
                                </div>
                            </div>
                        </div>
                    </td>
                )}

                {/* Tur */}
                <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            typeBgLookup[req._type || req.type] || 'bg-slate-50'
                        }`}>
                            {getTypeIcon(req._type || req.type)}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                            {getTypeLabel(req)}
                        </span>
                        {req.leave_type_code === 'BIRTHDAY_LEAVE' && (
                            <span className="ml-1 px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold">
                                🎂
                            </span>
                        )}
                    </div>
                </td>

                {/* Tarih */}
                <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 text-sm">
                            {formatDate(req.start_date || req.date)}
                        </span>
                        {req.end_date && req.end_date !== req.start_date && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                <ArrowRight size={8} />
                                {formatDate(req.end_date)}
                            </span>
                        )}
                    </div>
                </td>

                {/* Saat Araligi */}
                <td className="px-3 py-3">
                    <TimeRange req={req} />
                </td>

                {/* Sure */}
                <td className="px-3 py-3">
                    <DurationCell req={req} />
                </td>

                {/* Durum + Onaylayan */}
                <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                        {getStatusBadge(req.status)}
                        {mode === 'personal' && req.status === 'PENDING' && (
                            isHealthType ? (
                                <span className="text-[10px] text-blue-600 font-medium">
                                    ↗ Muhasebe onayı bekliyor
                                </span>
                            ) : req.target_approver_name ? (
                                <span className="text-[10px] text-blue-600 font-medium truncate max-w-[140px]" title={req.target_approver_name}>
                                    ↗ {req.target_approver_name}
                                </span>
                            ) : null
                        )}
                        {mode === 'personal' && req.status === 'APPROVED' && req.approved_by_name && (
                            <span className="text-[10px] text-emerald-600 font-medium truncate max-w-[140px]" title={req.approved_by_name}>
                                ✓ {req.approved_by_name}
                            </span>
                        )}
                        {mode === 'personal' && req.status === 'REJECTED' && req.approved_by_name && (
                            <span className="text-[10px] text-red-600 font-medium truncate max-w-[140px]" title={req.approved_by_name}>
                                ✗ {req.approved_by_name}
                            </span>
                        )}
                    </div>
                </td>

                {/* Talep Edilen — only in incoming mode */}
                {mode === 'incoming' && (
                    <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                            {isHealthType ? (
                                <span className="text-xs font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded">
                                    Muhasebe
                                </span>
                            ) : req.target_approver_name ? (
                                <span className="text-xs font-medium text-slate-600 truncate max-w-[130px]" title={req.target_approver_name}>
                                    {req.target_approver_name}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-300">&mdash;</span>
                            )}
                        </div>
                    </td>
                )}

                {/* Islemler */}
                <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        {onViewDetails && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onViewDetails(req, req.type); }}
                                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                title="Detaylar"
                            >
                                <Eye size={14} />
                            </button>
                        )}

                        {/* Claim Potential */}
                        {claimPotentialRenderer && claimPotentialRenderer(req)}

                        {/* Incoming mode: Approve / Reject (only if actionable) */}
                        {mode === 'incoming' && isPending && onApprove && !isReadOnlyType && req.is_actionable !== false && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onApprove(req, 'Hızlı Onay'); }}
                                className="w-7 h-7 flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                                title="Onayla"
                            >
                                <Check size={14} />
                            </button>
                        )}
                        {mode === 'incoming' && isPending && onReject && !isReadOnlyType && req.is_actionable !== false && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Expand row to show reject reason input
                                    if (!isExpanded && onToggle) onToggle();
                                }}
                                className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                                title="Reddet"
                            >
                                <X size={14} />
                            </button>
                        )}

                        {/* Sağlık raporu / yemek / özel izin: bilgi badge */}
                        {mode === 'incoming' && isReadOnlyType && (
                            <span className={`px-2 py-1 border rounded-lg text-[10px] font-bold whitespace-nowrap ${
                                isSpecialLeave
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                                {req.type === 'MEAL' ? 'Bilgi amaçlı' : 'Muhasebe onayı'}
                            </span>
                        )}

                        {/* Non-actionable (another manager's request): view-only badge */}
                        {mode === 'incoming' && isPending && !isReadOnlyType && req.is_actionable === false && (
                            <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                Goruntuleme
                            </span>
                        )}

                        {/* Karar Değiştir: APPROVED/REJECTED + can_override */}
                        {mode === 'incoming' && !isPending && req.can_override && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onViewDetail) onViewDetail(req);
                                }}
                                className="px-2 py-1 flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-100 transition-colors text-[10px] font-bold whitespace-nowrap"
                                title="Karar Değiştir"
                            >
                                <Shield size={12} /> Değiştir
                            </button>
                        )}

                        {/* Personal mode: Edit / Delete */}
                        {mode === 'personal' && (isPending || isPotential) && onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(req); }}
                                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                title="Düzenle"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        {mode === 'personal' && (isPending || isPotential) && onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(req); }}
                                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                                title="Sil / İptal"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {/* Expanded detail row */}
            {isExpanded && (
                <tr className="bg-blue-50/20 border-b border-slate-100">
                    <td colSpan={colCount} className="p-0">
                        <div className="border-t border-blue-100/50">
                            <RequestImpactPanel
                                req={req}
                                mode={mode}
                                onApprove={isReadOnlyType || req.is_actionable === false ? null : onApprove}
                                onReject={isReadOnlyType || req.is_actionable === false ? null : onReject}
                            />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default ExpandableRequestRow;
