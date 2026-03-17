import React from 'react';
import { Calendar, CreditCard, PenLine, HeartPulse, Stethoscope, Briefcase, Timer, Scissors, Settings } from 'lucide-react';
import { LeaveBadge } from '../pages/attendance-tracking/AttendanceComponents';

const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
};

const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'Europe/Istanbul' });
};

// --- RecordTypeBadge ---
const RECORD_TYPE_CONFIG = {
    card:           { icon: CreditCard, label: 'Kart',      bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-600',   dot: 'bg-slate-400'   },
    manual:         { icon: PenLine,    label: 'Manuel',     bg: 'bg-blue-50',    border: 'border-blue-200',  text: 'text-blue-600',    dot: 'bg-blue-500'    },
    health_report:  { icon: HeartPulse, label: 'S. Raporu',  bg: 'bg-red-50',     border: 'border-red-200',   text: 'text-red-600',     dot: 'bg-red-500'     },
    hospital_visit: { icon: Stethoscope,label: 'Hastane',    bg: 'bg-purple-50',  border: 'border-purple-200',text: 'text-purple-600',  dot: 'bg-purple-500'  },
    external_duty:  { icon: Briefcase,  label: 'Dış Görev',  bg: 'bg-violet-50',  border: 'border-violet-200',text: 'text-violet-600',  dot: 'bg-violet-500'  },
    overtime:       { icon: Timer,      label: 'Ek Mesai',   bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-600',dot: 'bg-emerald-500' },
    split:          { icon: Scissors,   label: 'Bölme',      bg: 'bg-gray-50',    border: 'border-gray-200',  text: 'text-gray-500',    dot: 'bg-gray-400'    },
    system:         { icon: Settings,   label: 'Sistem',     bg: 'bg-gray-50',    border: 'border-gray-200',  text: 'text-gray-500',    dot: 'bg-gray-400'    },
};

const OT_SOURCE_CONFIG = {
    INTENDED:  { label: 'Planlı',    bg: 'bg-cyan-50',   border: 'border-cyan-200',  text: 'text-cyan-700'  },
    POTENTIAL: { label: 'Algılanan', bg: 'bg-purple-50', border: 'border-purple-200',text: 'text-purple-700'},
    MANUAL:    { label: 'Manuel',    bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
};

const RecordTypeBadge = ({ log }) => {
    const type = log.record_type || 'card';
    const cfg = RECORD_TYPE_CONFIG[type] || RECORD_TYPE_CONFIG.card;
    const Icon = cfg.icon;
    const otSrc = log.ot_source_type ? OT_SOURCE_CONFIG[log.ot_source_type] : null;

    return (
        <div className="flex flex-col items-start gap-0.5">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <Icon size={11} strokeWidth={2.5} />
                <span className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                    {log.record_type_label || cfg.label}
                </span>
            </div>
            {otSrc && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0 rounded-full border ${otSrc.bg} ${otSrc.border} ${otSrc.text} ml-1`}>
                    <span className="text-[8px] font-bold uppercase tracking-wide">{otSrc.label}</span>
                </div>
            )}
            {log.related_leave_type_name && type !== 'overtime' && (
                <span className="text-[8px] text-slate-500 font-medium ml-1 leading-tight">{log.related_leave_type_name}</span>
            )}
        </div>
    );
};

// --- Mobile RecordTypeBadge (compact, for Durum column) ---
const RecordTypeBadgeMobile = ({ log }) => {
    const type = log.record_type || 'card';
    const cfg = RECORD_TYPE_CONFIG[type] || RECORD_TYPE_CONFIG.card;
    const Icon = cfg.icon;

    return (
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            <Icon size={9} strokeWidth={2.5} />
            <span className="text-[8px] font-bold uppercase tracking-wide whitespace-nowrap">
                {log.record_type_label || cfg.label}
            </span>
        </div>
    );
};

const getStatusBadge = (log) => {
    // OT Status override: show OvertimeRequest status when available
    if (log.ot_status) {
        const otStyles = {
            'POTENTIAL': 'bg-purple-50 border-purple-200 text-purple-600',
            'PENDING': 'bg-amber-50 border-amber-100 text-amber-600',
            'APPROVED': 'bg-emerald-50 border-emerald-100 text-emerald-600',
            'REJECTED': 'bg-rose-50 border-rose-100 text-rose-600',
            'CANCELLED': 'bg-gray-50 border-gray-100 text-gray-500',
        };
        const otDots = {
            'POTENTIAL': 'bg-purple-500',
            'PENDING': 'bg-amber-500',
            'APPROVED': 'bg-emerald-500',
            'REJECTED': 'bg-rose-500',
            'CANCELLED': 'bg-gray-400',
        };
        const otLabels = {
            'POTENTIAL': 'Potansiyel Mesai',
            'PENDING': 'Onay Bekliyor',
            'APPROVED': 'Onaylandı',
            'REJECTED': 'Reddedildi',
            'CANCELLED': 'Geri Çekildi',
        };

        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${otStyles[log.ot_status] || 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${otDots[log.ot_status] || 'bg-gray-400'} shadow-sm`}></span>
                <span className="text-[10px] font-bold uppercase tracking-wide">{otLabels[log.ot_status] || log.ot_status}</span>
            </div>
        );
    }

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

/**
 * Saatlik izin/görev coverage'ı ile attendance kaydının zaman aralığının
 * çakışıp çakışmadığını kontrol eder.
 * Tam gün coverage → her zaman true.
 * Saatlik coverage → kayıt check_in/check_out ile saat çakışması gerekir.
 */
const doesCoverageOverlap = (coverage, log) => {
    if (!coverage) return false;
    // Tam gün → her zaman göster
    if (!coverage.is_hourly) return true;
    // Saatlik ama saat bilgisi yoksa fallback olarak göster
    if (!coverage.start_time || !coverage.end_time) return true;
    // Kayıt saatleri yoksa göster (güvenli fallback)
    if (!log.check_in && !log.check_out) return true;

    // HH:MM → dakika çevrimi
    const toMin = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    };
    const covStart = toMin(coverage.start_time);
    const covEnd = toMin(coverage.end_time);

    // Kayıt check_in/check_out'tan saat çıkar
    const getHHMM = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
    };
    const logStart = getHHMM(log.check_in);
    const logEnd = getHHMM(log.check_out);

    // En az bir ucu varsa çakışma kontrolü yap
    if (logStart !== null && logEnd !== null) {
        // İki aralık çakışır mı: [logStart, logEnd] ∩ [covStart, covEnd]
        return logStart < covEnd && logEnd > covStart;
    }
    // Sadece check_in var → check_in coverage aralığında mı
    if (logStart !== null) return logStart >= covStart && logStart < covEnd;
    // Sadece check_out var → check_out coverage aralığında mı
    if (logEnd !== null) return logEnd > covStart && logEnd <= covEnd;

    return true; // fallback
};

const AttendanceLogTable = ({ logs, leaveCoverageMap = {} }) => {
    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                            <th className="p-2 pl-3 md:p-3 md:pl-5 lg:p-5 lg:pl-8">Tarih</th>
                            <th className="p-2 md:p-3 lg:p-5 hidden md:table-cell">Tür</th>
                            <th className="p-2 md:p-3 lg:p-5">Giriş</th>
                            <th className="p-2 md:p-3 lg:p-5">Çıkış</th>
                            <th className="p-2 md:p-3 lg:p-5">Süre</th>
                            <th className="p-2 md:p-3 lg:p-5">Beklenen</th>
                            <th className="p-2 md:p-3 lg:p-5">Mola</th>
                            <th className="p-2 md:p-3 lg:p-5">Durum</th>
                            <th className="p-2 md:p-3 lg:p-5 pr-3 md:pr-5 lg:pr-8 text-right">Detay</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/50">
                        {[...logs].sort((a, b) => {
                            const dateA = a.work_date || '';
                            const dateB = b.work_date || '';
                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                            const timeA = a.check_in || '';
                            const timeB = b.check_in || '';
                            return timeA.localeCompare(timeB);
                        }).map((log) => (
                            <tr key={log.id} className="group hover:bg-slate-50/80 transition-colors duration-200 cursor-default">
                                <td className="p-2 pl-3 md:p-3 md:pl-5 lg:p-5 lg:pl-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-white group-hover:text-indigo-500 group-hover:shadow-md transition-all duration-300">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                                                {formatDate(log.work_date).split(' ').slice(0, 3).join(' ')}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                {formatDate(log.work_date).split(' ').pop()}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                {/* Tür sütunu — desktop only */}
                                <td className="p-2 md:p-3 lg:p-5 hidden md:table-cell">
                                    <RecordTypeBadge log={log} />
                                </td>
                                <td className="p-2 md:p-3 lg:p-5 font-mono text-xs sm:text-sm text-slate-600 font-semibold">{formatTime(log.check_in)}</td>
                                <td className="p-2 md:p-3 lg:p-5 font-mono text-xs sm:text-sm text-slate-600 font-semibold">{formatTime(log.check_out)}</td>
                                <td className="p-2 md:p-3 lg:p-5">
                                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                                        {log.total_minutes ? `${Math.floor(log.total_minutes / 60)}s ${log.total_minutes % 60}dk` : '-'}
                                    </span>
                                </td>
                                <td className="p-2 md:p-3 lg:p-5 text-slate-400 font-medium text-xs">
                                    {log.normal_minutes || log.missing_minutes ?
                                        `${Math.floor(((log.normal_minutes || 0) + (log.missing_minutes || 0)) / 60)}s ${((log.normal_minutes || 0) + (log.missing_minutes || 0)) % 60}dk`
                                        : '-'
                                    }
                                </td>
                                <td className="p-2 md:p-3 lg:p-5">
                                    {log.break_minutes > 0 ? (
                                        <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-lg">
                                            {log.break_minutes} dk
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-2 md:p-3 lg:p-5">
                                    <div className="flex flex-col items-start gap-1">
                                        {/* Mobile: record type badge (hidden on desktop) */}
                                        <div className="md:hidden">
                                            <RecordTypeBadgeMobile log={log} />
                                        </div>
                                        {leaveCoverageMap[log.work_date] && doesCoverageOverlap(leaveCoverageMap[log.work_date], log) && (
                                            <LeaveBadge leave={{ is_on_leave: true, ...leaveCoverageMap[log.work_date] }} size="sm" />
                                        )}
                                        {/* Tam gün izin/rapor varsa attendance status badge gösterme — izin zaten onaylı */}
                                        {!(leaveCoverageMap[log.work_date] && !leaveCoverageMap[log.work_date].is_hourly) && getStatusBadge(log)}
                                        {log.overtime_minutes > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 pl-1">
                                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                                +{log.overtime_minutes} dk Fazla
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2 md:p-3 lg:p-5 pr-3 md:pr-5 lg:pr-8 text-right">
                                    {log.note && (
                                        <div className="group/note relative inline-block">
                                            {log.note.includes('eşik altı') ? (
                                                <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center cursor-help border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors">
                                                    <span className="text-xs font-bold">!</span>
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center cursor-help border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors">
                                                    <span className="text-xs font-bold font-serif">i</span>
                                                </div>
                                            )}
                                            <div className={`absolute right-full top-1/2 -translate-y-1/2 mr-2 w-56 p-3 ${log.note.includes('eşik altı') ? 'bg-amber-700' : 'bg-slate-800'} text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl`}>
                                                {log.note}
                                                <div className={`absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent ${log.note.includes('eşik altı') ? 'border-l-amber-700' : 'border-l-slate-800'}`}></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="9" className="p-12 text-center text-slate-400">
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
