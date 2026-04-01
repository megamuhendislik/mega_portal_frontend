import React, { useState } from 'react';
import {
    Clock, Calendar, FileText, Utensils, CreditCard,
    ArrowRight, LogIn, LogOut, Check, X,
    Info, AlertTriangle, Shield
} from 'lucide-react';

// ─── Static Tailwind color lookup (avoids dynamic class purging) ──────────
const sectionColors = {
    slate: {
        border: 'border-slate-200',
        bg: 'bg-slate-50/50',
        title: 'text-slate-700',
        iconBg: 'bg-slate-100',
    },
    blue: {
        border: 'border-blue-200',
        bg: 'bg-blue-50/50',
        title: 'text-blue-700',
        iconBg: 'bg-blue-100',
    },
    amber: {
        border: 'border-amber-200',
        bg: 'bg-amber-50/50',
        title: 'text-amber-700',
        iconBg: 'bg-amber-100',
    },
    emerald: {
        border: 'border-emerald-200',
        bg: 'bg-emerald-50/50',
        title: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
    },
    purple: {
        border: 'border-purple-200',
        bg: 'bg-purple-50/50',
        title: 'text-purple-700',
        iconBg: 'bg-purple-100',
    },
    red: {
        border: 'border-red-200',
        bg: 'bg-red-50/50',
        title: 'text-red-700',
        iconBg: 'bg-red-100',
    },
    orange: {
        border: 'border-orange-200',
        bg: 'bg-orange-50/50',
        title: 'text-orange-700',
        iconBg: 'bg-orange-100',
    },
};

const progressBarColors = {
    emerald: { bg: 'bg-emerald-100', fill: 'bg-emerald-500', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-100', fill: 'bg-blue-500', text: 'text-blue-700' },
    amber: { bg: 'bg-amber-100', fill: 'bg-amber-500', text: 'text-amber-700' },
    red: { bg: 'bg-red-100', fill: 'bg-red-500', text: 'text-red-700' },
    purple: { bg: 'bg-purple-100', fill: 'bg-purple-500', text: 'text-purple-700' },
};

// ─── Sub-components ───────────────────────────────────────────────────────
const Section = ({ title, icon, children, color = 'slate' }) => {
    const c = sectionColors[color] || sectionColors.slate;
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-3`}>
            <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md ${c.iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <h4 className={`text-sm font-bold ${c.title}`}>{title}</h4>
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, highlight, warning }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start justify-between gap-2 text-sm">
            <span className="text-slate-500 font-medium shrink-0">{label}</span>
            <span className={`text-right font-bold ${
                warning ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-slate-800'
            }`}>
                {value}
            </span>
        </div>
    );
};

const ImpactItem = ({ text, positive, negative }) => (
    <div className="flex items-start gap-2 text-sm">
        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
            positive ? 'bg-emerald-500' : negative ? 'bg-red-500' : 'bg-blue-500'
        }`} />
        <span className={`${negative ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
            {text}
        </span>
    </div>
);

const ProgressBar = ({ value, max, label, color = 'blue' }) => {
    const c = progressBarColors[color] || progressBarColors.blue;
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const overLimit = value > max;

    return (
        <div className="space-y-1">
            {label && (
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{label}</span>
                    <span className={`font-bold ${overLimit ? 'text-red-600' : c.text}`}>
                        {typeof value === 'number' ? value.toFixed(1) : value} / {max}
                    </span>
                </div>
            )}
            <div className={`h-2 rounded-full ${c.bg} overflow-hidden`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        overLimit ? 'bg-red-500' : c.fill
                    }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const formatTime = (t) => {
    if (!t) return '';
    return String(t).substring(0, 5);
};

const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
};

const calcDurationFromSeconds = (sec) => {
    if (!sec && sec !== 0) return null;
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours} saat ${mins} dakika`;
    if (hours > 0) return `${hours} saat`;
    if (mins > 0) return `${mins} dakika`;
    return '0 dakika';
};

const calcDurationFromMinutes = (min) => {
    if (!min && min !== 0) return null;
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    if (hours > 0 && mins > 0) return `${hours} saat ${mins} dakika`;
    if (hours > 0) return `${hours} saat`;
    if (mins > 0) return `${mins} dakika`;
    return '0 dakika';
};

const calcDurationFromTimes = (start, end) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let totalMins = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMins < 0) totalMins += 24 * 60;
    return calcDurationFromMinutes(totalMins);
};

const getSourceLabel = (source) => {
    switch (source) {
        case 'INTENDED': return 'Planlı (Atanmış)';
        case 'POTENTIAL': return 'Algılanan (Otomatik)';
        case 'MANUAL': return 'Manuel Giriş';
        default: return source || '-';
    }
};

const isAnnualLeave = (req) => {
    const typeName = (req.leave_type_name || '').toLowerCase();
    const code = req.request_type_detail?.code || '';
    return typeName.includes('yillik') || typeName.includes('yıllık') || code === 'ANNUAL_LEAVE';
};

const isExcuseLeave = (req) => {
    const typeName = (req.leave_type_name || '').toLowerCase();
    const code = req.request_type_detail?.code || '';
    return typeName.includes('mazeret') || code === 'EXCUSE_LEAVE';
};

// ─── Approval Info Section (replaces "Onaylanınca Ne Olur?") ─────────────
const ApprovalInfoSection = ({ req }) => {
    const statusLabels = {
        PENDING: 'Beklemede', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi',
        CANCELLED: 'İptal Edildi', POTENTIAL: 'Potansiyel', ORDERED: 'Sipariş Verildi',
        DELIVERED: 'Teslim Edildi', ESCALATED: 'Yönlendirildi',
    };
    const statusColors = {
        APPROVED: 'text-emerald-700 bg-emerald-50', REJECTED: 'text-red-700 bg-red-50',
        PENDING: 'text-amber-700 bg-amber-50', CANCELLED: 'text-slate-500 bg-slate-50',
        ESCALATED: 'text-purple-700 bg-purple-50',
    };

    const approverName = req.target_approver_name
        || req.target_approver_detail?.full_name
        || req.target_approver_detail?.first_name
        || null;
    const approvedByName = req.approved_by_name
        || req.approval_manager_name
        || req.approved_by_detail?.full_name
        || null;
    const approvedAt = req.approved_at || req.approval_date || null;
    const escalatedTo = req.escalated_to_detail?.full_name || req.escalated_to_detail?.first_name || null;

    return (
        <Section title="Onay Bilgisi" icon={<Info size={14} className="text-blue-600" />} color="blue">
            <InfoRow label="Durum" value={
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[req.status] || 'text-slate-600 bg-slate-50'}`}>
                    {statusLabels[req.status] || req.status}
                </span>
            } />
            <InfoRow label="Oluşturulma" value={formatDateTime(req.created_at)} />
            {approverName && <InfoRow label="Gönderildiği Kişi" value={approverName} />}

            {approvedByName && (
                <InfoRow label={req.status === 'REJECTED' ? 'Reddeden' : 'Onaylayan'} value={approvedByName} />
            )}
            {approvedAt && (
                <InfoRow label={req.status === 'REJECTED' ? 'Red Tarihi' : 'Onay Tarihi'} value={formatDateTime(approvedAt)} />
            )}

            {req.rejection_reason && (
                <div className="mt-1.5 flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 font-medium">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span><strong>Red Sebebi:</strong> {req.rejection_reason}</span>
                </div>
            )}

            {escalatedTo && (
                <>
                    <InfoRow label="Yönlendirildi" value={escalatedTo} />
                    {req.escalated_at && <InfoRow label="Yönlendirme Tarihi" value={formatDateTime(req.escalated_at)} />}
                    {req.escalation_reason && <InfoRow label="Yönlendirme Sebebi" value={req.escalation_reason} />}
                </>
            )}

            {req.last_decision_level && req.last_decision_level !== 'DIRECT' && (
                <div className="mt-1.5 flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-700 font-medium">
                    <Shield size={12} />
                    <span><strong>Müdahale:</strong> {
                        req.last_decision_level === 'ADMIN' ? 'Admin tarafından işlem yapıldı'
                        : req.last_decision_level === 'SUBSTITUTE' ? 'Vekil tarafından işlem yapıldı'
                        : req.last_decision_level === 'ESCALATED' ? 'Üst yöneticiye yönlendirildi'
                        : req.last_decision_level
                    }</span>
                </div>
            )}

            {req.updated_at && req.created_at && req.updated_at !== req.created_at && (
                <InfoRow label="Son Güncelleme" value={formatDateTime(req.updated_at)} />
            )}
        </Section>
    );
};

// ─── Overtime Panel ───────────────────────────────────────────────────────
const OvertimePanel = ({ req, mode }) => {
    const duration = calcDurationFromSeconds(req.duration_seconds)
        || calcDurationFromMinutes(req.duration_minutes)
        || calcDurationFromTimes(req.start_time, req.end_time);

    const stats = req.employee_monthly_stats || {};
    const currentOtMins = stats.ot_total_approved_minutes || 0;
    const currentOtHours = (currentOtMins / 60).toFixed(1);

    // Calculate new OT to add
    let addMinutes = 0;
    if (req.duration_seconds) addMinutes = Math.floor(req.duration_seconds / 60);
    else if (req.duration_minutes) addMinutes = req.duration_minutes;
    else if (req.start_time && req.end_time) {
        const [sh, sm] = req.start_time.split(':').map(Number);
        const [eh, em] = req.end_time.split(':').map(Number);
        addMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (addMinutes < 0) addMinutes += 24 * 60;
    }
    const addHours = (addMinutes / 60).toFixed(1);
    const newOtHours = ((currentOtMins + addMinutes) / 60).toFixed(1);

    const currentApprovedCount = stats.ot_requests_approved || 0;
    const weeklyOtLimit = 30; // default

    return (
        <>
            <Section title="Kapsam" icon={<Clock size={14} className="text-amber-600" />} color="amber">
                <InfoRow label="Talep Edilen Aralık" value={
                    req.start_time && req.end_time
                        ? `${formatTime(req.start_time)} → ${formatTime(req.end_time)}`
                        : '-'
                } />
                <InfoRow label="Süre" value={duration || '-'} highlight />
                <InfoRow label="Kaynak" value={getSourceLabel(req.source_type)} />
                {req.reason && <InfoRow label="Sebep" value={req.reason} />}

                {/* Attendance logs */}
                {req.attendance_logs && req.attendance_logs.length > 0 && (
                    <div className="pt-2 border-t border-amber-100">
                        <p className="text-xs font-bold text-slate-500 mb-1.5">Gerçek Giriş/Çıkış</p>
                        <div className="flex flex-wrap gap-2">
                            {req.attendance_logs.map((log, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-medium text-slate-700">
                                    <LogIn size={10} className="text-emerald-500" />
                                    {log.check_in || '--:--'}
                                    <ArrowRight size={10} className="text-slate-300" />
                                    <LogOut size={10} className="text-red-400" />
                                    {log.check_out || '--:--'}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </Section>

            <ApprovalInfoSection req={req} />
        </>
    );
};

// ─── Leave Panel ──────────────────────────────────────────────────────────
const LeavePanel = ({ req, mode }) => {
    const balance = req.employee_annual_leave_balance || {};
    const totalDays = req.total_days || 0;
    const totalHours = req.start_time && req.end_time
        ? (() => { const [sh,sm] = req.start_time.split(':').map(Number); const [eh,em] = req.end_time.split(':').map(Number); let m = (eh*60+em)-(sh*60+sm); if(m<0) m+=1440; return (m/60).toFixed(1); })()
        : (totalDays * 9).toFixed(1);
    const isFullDay = !req.start_time || !req.end_time;

    return (
        <>
            <Section title="Kapsam" icon={<Calendar size={14} className="text-blue-600" />} color="blue">
                <InfoRow label="İzin Türü" value={req.leave_type_name || req.request_type_detail?.name || '-'} />
                <InfoRow label="Tarih Aralığı" value={
                    req.start_date && req.end_date && req.start_date !== req.end_date
                        ? `${formatDate(req.start_date)} → ${formatDate(req.end_date)}`
                        : formatDate(req.start_date || req.date)
                } />
                {req.start_time && req.end_time && (
                    <InfoRow label="Saat" value={`${formatTime(req.start_time)} → ${formatTime(req.end_time)}`} />
                )}
                <InfoRow label="Toplam" value={`${totalHours} saat${isFullDay ? ' (Tam gün)' : ''}`} highlight />
                {req.reason && <InfoRow label="Sebep" value={req.reason} />}
            </Section>

            <ApprovalInfoSection req={req} />
        </>
    );
};

// ─── Cardless Entry Panel ─────────────────────────────────────────────────
const CardlessEntryPanel = ({ req, mode }) => {
    const workDuration = calcDurationFromTimes(req.check_in_time, req.check_out_time);

    return (
        <>
            <Section title="Kapsam" icon={<CreditCard size={14} className="text-purple-600" />} color="purple">
                <InfoRow label="Tarih" value={formatDate(req.date || req.start_date)} />
                <InfoRow label="Giriş Saati" value={formatTime(req.check_in_time) || '-'} />
                <InfoRow label="Çıkış Saati" value={formatTime(req.check_out_time) || '-'} />
                {req.reason && <InfoRow label="Sebep" value={req.reason} />}
            </Section>

            <ApprovalInfoSection req={req} />
        </>
    );
};

// ─── Meal Panel ───────────────────────────────────────────────────────────
const MealPanel = ({ req, mode }) => (
    <>
        <Section title="Kapsam" icon={<Utensils size={14} className="text-emerald-600" />} color="emerald">
            <InfoRow label="Tarih" value={formatDate(req.date || req.start_date)} />
            {(req.reason || req.description) && (
                <InfoRow label="Açıklama" value={req.reason || req.description} />
            )}
        </Section>

        <ApprovalInfoSection req={req} />
    </>
);

// ─── Main Component ───────────────────────────────────────────────────────
const RequestImpactPanel = ({ req, mode = 'incoming', onApprove, onReject }) => {
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    if (!req) return null;

    const handleRejectSubmit = () => {
        if (rejectReason.trim() && onReject) {
            onReject(req, rejectReason.trim());
            setRejectMode(false);
            setRejectReason('');
        }
    };

    const handleRejectKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleRejectSubmit();
        }
        if (e.key === 'Escape') {
            setRejectMode(false);
            setRejectReason('');
        }
    };

    const renderTypePanel = () => {
        switch (req._type || req.type) {
            case 'OVERTIME':
                return <OvertimePanel req={req} mode={mode} />;
            case 'LEAVE':
                return <LeavePanel req={req} mode={mode} />;
            case 'CARDLESS_ENTRY':
                return <CardlessEntryPanel req={req} mode={mode} />;
            case 'MEAL':
                return <MealPanel req={req} mode={mode} />;
            case 'EXTERNAL_DUTY': {
                const dwi = req.duty_work_info;
                const totalOtMin = dwi?.total_ot_minutes || 0;
                const segments = req.date_segments || [];
                const isPendingDuty = req.status === 'PENDING';

                // Calculate total minutes from segments
                let segTotalMin = 0;
                if (segments.length > 0) {
                    for (const s of segments) {
                        if (s.start_time && s.end_time) {
                            const [sh, sm] = s.start_time.split(':').map(Number);
                            const [eh, em] = s.end_time.split(':').map(Number);
                            let diff = (eh * 60 + em) - (sh * 60 + sm);
                            if (diff < 0) diff += 24 * 60;
                            segTotalMin += diff;
                        }
                    }
                }

                return (
                    <>
                        <Section title="Dış Görev Detayı" icon={<FileText size={14} className="text-indigo-600" />} color="blue">
                            <InfoRow label="Tarih" value={`${formatDate(req.start_date)} — ${formatDate(req.end_date)}`} />
                            {req.leave_type_name && <InfoRow label="Görev Türü" value={req.leave_type_name} />}
                            {req.reason && <InfoRow label="Açıklama" value={req.reason} />}

                            {/* Approved: show actual work info */}
                            {dwi && (dwi.total_work_minutes > 0 || totalOtMin > 0) && (
                                <>
                                    <InfoRow label="Normal Mesai" value={dwi.total_work_minutes > 0 ? `${Math.floor(dwi.total_work_minutes / 60)}s ${dwi.total_work_minutes % 60}dk` : '-'} />
                                    <InfoRow label="Ek Mesai" value={totalOtMin > 0 ? `${Math.floor(totalOtMin / 60)}s ${totalOtMin % 60}dk` : '-'} />
                                </>
                            )}

                            {/* Pending: show day-by-day segments */}
                            {isPendingDuty && segments.length > 0 && (
                                <div className="mt-2">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Gün Bazlı Çalışma</span>
                                    <div className="space-y-1">
                                        {segments.map((seg, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-blue-100">
                                                <span className="text-slate-600 font-medium">
                                                    {seg.date ? new Date(seg.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Europe/Istanbul' }) : '-'}
                                                </span>
                                                <span className="text-blue-700 font-bold">
                                                    {seg.start_time || '--:--'} - {seg.end_time || '--:--'}
                                                </span>
                                                {seg.start_time && seg.end_time && (() => {
                                                    const [sh, sm] = seg.start_time.split(':').map(Number);
                                                    const [eh, em] = seg.end_time.split(':').map(Number);
                                                    let diff = (eh * 60 + em) - (sh * 60 + sm);
                                                    if (diff < 0) diff += 24 * 60;
                                                    const h = Math.floor(diff / 60);
                                                    const m = diff % 60;
                                                    return <span className="text-slate-400 text-[10px]">{h > 0 ? `${h}s ` : ''}{m > 0 ? `${m}dk` : ''}</span>;
                                                })()}
                                            </div>
                                        ))}
                                        {segTotalMin > 0 && (
                                            <div className="flex items-center justify-between text-xs bg-blue-50 p-2 rounded-lg border border-blue-200 font-bold">
                                                <span className="text-blue-700">Toplam</span>
                                                <span className="text-blue-800">{Math.floor(segTotalMin / 60)}s {segTotalMin % 60 > 0 ? `${segTotalMin % 60}dk` : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pending without segments: show global times */}
                            {isPendingDuty && segments.length === 0 && req.start_time && req.end_time && (
                                <InfoRow label="Çalışma Saatleri" value={`${String(req.start_time).substring(0, 5)} - ${String(req.end_time).substring(0, 5)}`} />
                            )}
                        </Section>
                        <div className="md:col-span-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                            <p className="font-bold mb-1">Onay Bilgilendirme</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Onaylandığında çalışanın mesai kaydına işlenecektir</li>
                                <li>Öğle molası düşülmez, tüm görev süresi çalışma sayılır</li>
                                <li>Mesai hedefini aşan süre otomatik onaylı ek mesai olarak kaydedilecektir</li>
                                {totalOtMin > 0 && <li>Bu talep <strong>{Math.floor(totalOtMin / 60)}s {totalOtMin % 60 > 0 ? ` ${totalOtMin % 60}dk` : ''}</strong> ek mesai içermektedir</li>}
                            </ul>
                        </div>
                    </>
                );
            }
            default:
                return (
                    <Section title="Talep Detayı" icon={<FileText size={14} className="text-slate-600" />} color="slate">
                        <InfoRow label="Tur" value={req.type || '-'} />
                        <InfoRow label="Tarih" value={formatDate(req.start_date || req.date)} />
                        {req.reason && <InfoRow label="Sebep" value={req.reason} />}
                    </Section>
                );
        }
    };

    const isPending = req.status === 'PENDING';
    const showActions = mode === 'incoming' && isPending && (onApprove || onReject);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4" onClick={(e) => e.stopPropagation()}>
            {renderTypePanel()}

            {/* Inline Approve / Reject */}
            {showActions && (
                <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
                    {!rejectMode ? (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onApprove) onApprove(req, 'Onaylandı');
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                <Check size={16} />
                                Onayla
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRejectMode(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl transition-colors"
                            >
                                <X size={16} />
                                Reddet
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                autoFocus
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                onKeyDown={handleRejectKeyDown}
                                placeholder="Reddetme sebebi..."
                                className="flex-1 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectSubmit();
                                }}
                                disabled={!rejectReason.trim()}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Gönder
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRejectMode(false);
                                    setRejectReason('');
                                }}
                                className="px-3 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-bold rounded-xl transition-colors"
                            >
                                Vazgeç
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RequestImpactPanel;
