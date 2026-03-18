import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Clock, Calendar, XCircle, Users, Plus, Loader2, CheckCircle2,
    ChevronDown, ChevronRight, Zap, PenLine, FileText, Send, TrendingUp,
    ClipboardList, CalendarCheck, X, LayoutList, UserCheck,
    LogIn, LogOut, Coffee, Briefcase, Sun, Moon, Pencil, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateAssignmentModal from './overtime/CreateAssignmentModal';
import EditAssignmentModal from './overtime/EditAssignmentModal';
import { getIstanbulToday } from '../utils/dateUtils';
import ModalOverlay from './ui/ModalOverlay';

// ═══════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatDateTurkish(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES[d.getDay()]}`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0 dk';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} sa`;
    return `${m} dk`;
}

function isDatePast(dateStr) {
    return dateStr < getIstanbulToday();
}

function matchesDateRange(dateStr, from, to) {
    if (!dateStr) return true;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════

const Pill = ({ children, color = 'slate' }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        slate: 'bg-slate-100 text-slate-500 border-slate-200',
        sky: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${colors[color]}`}>
            {children}
        </span>
    );
};

const SourcePill = ({ type }) => {
    const map = { INTENDED: ['Planlı', 'blue'], POTENTIAL: ['Plansız', 'purple'], MANUAL: ['Manuel', 'amber'] };
    const [label, color] = map[type] || [type || '?', 'slate'];
    return <Pill color={color}>{label}</Pill>;
};

const StatusPill = ({ status }) => {
    const map = { PENDING: ['Bekliyor', 'amber'], APPROVED: ['Onaylandı', 'emerald'], REJECTED: ['Reddedildi', 'red'], CANCELLED: ['İptal', 'slate'] };
    const [label, color] = map[status] || [status, 'slate'];
    return <Pill color={color}>{label}</Pill>;
};

const AssignmentPill = ({ assignment }) => {
    const todayStr = getIstanbulToday();
    const past = assignment.date < todayStr;
    const isToday = assignment.date === todayStr;
    if (assignment.status === 'CLAIMED') return <Pill color="purple">Talep Edildi</Pill>;
    if (assignment.status === 'EXPIRED') return <Pill color="red">Süresi Doldu</Pill>;
    if (assignment.status === 'CANCELLED') return <Pill color="slate">İptal Edildi</Pill>;
    if (assignment.status === 'ASSIGNED') {
        if (past && assignment.actual_overtime_hours > 0) return <Pill color="amber">Talep Bekliyor</Pill>;
        if (past) return <Pill color="slate">Çalışma Yok</Pill>;
        if (isToday) return <Pill color="amber">Bugün</Pill>;
        return <Pill color="sky">Planlandı</Pill>;
    }
    return <Pill color="slate">{assignment.status}</Pill>;
};

const CountBadge = ({ count, color = 'slate' }) => {
    const colors = { slate: 'bg-slate-100 text-slate-600', blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${colors[color]}`}>{count}</span>;
};

const DateFilter = ({ from, to, onChange, className = '' }) => (
    <div className={`flex items-center gap-1.5 ${className}`}>
        <input type="date" value={from} onChange={e => onChange({ from: e.target.value, to })}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none w-[130px]" />
        <span className="text-slate-300 text-xs">—</span>
        <input type="date" value={to} onChange={e => onChange({ from, to: e.target.value })}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none w-[130px]" />
        {(from || to) && (
            <button onClick={() => onChange({ from: '', to: '' })} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X size={12} />
            </button>
        )}
    </div>
);

const EmptyState = ({ text }) => (
    <div className="py-12 text-center">
        <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
);

// ═══════════════════════════════════════════════════════════
// OVERTIME DETAIL CARD (rich info for claimable items)
// ═══════════════════════════════════════════════════════════

const OvertimeDetailCard = ({ item, type, onClaim, claimed }) => {
    const entries = item.entries || [];
    const isOffDay = item.is_off_day;
    const d = new Date(item.date + 'T00:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();

    return (
        <div className="rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-all overflow-hidden">
            <div className="flex">
                {/* Left: Date column */}
                <div className={`w-[72px] flex-shrink-0 flex flex-col items-center justify-center py-3 ${isOffDay ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <span className="text-[22px] font-black text-slate-800 leading-none">{dayNum}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5">{monthName} {year}</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${isOffDay ? 'text-amber-600' : 'text-slate-400'}`}>{dayName}</span>
                    {isOffDay && (
                        <span className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-100 text-amber-700">TATİL</span>
                    )}
                </div>

                {/* Right: Details */}
                <div className="flex-1 p-3 min-w-0">
                    {/* Vardiya bilgisi */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                        {item.shift_start_time && item.shift_end_time && !isOffDay && (
                            <span className="flex items-center gap-1">
                                <Briefcase size={11} className="text-slate-400" />
                                Vardiya: {item.shift_start_time} – {item.shift_end_time}
                            </span>
                        )}
                        {isOffDay && (
                            <span className="flex items-center gap-1 text-amber-600 font-bold">
                                <Sun size={11} /> Tatil / İzin Günü
                            </span>
                        )}
                    </div>

                    {/* Giriş/çıkış kayıtları */}
                    {entries.length > 0 && (
                        <div className="space-y-1 mb-2">
                            {entries.map((e, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    {entries.length > 1 && (
                                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">
                                            {idx + 1}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                        <LogIn size={10} /> {e.check_in || '—'}
                                    </span>
                                    <span className="text-slate-300">→</span>
                                    <span className="flex items-center gap-1 text-red-600 font-medium">
                                        <LogOut size={10} /> {e.check_out || '—'}
                                    </span>
                                    {e.total_seconds > 0 && (
                                        <span className="text-slate-400 ml-1">({formatDuration(e.total_seconds)})</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Segment bilgisi (V3 parçalı mesai) — skip zero-duration */}
                    {type === 'potential' && item.start_time && item.end_time && item.start_time !== item.end_time && item.actual_overtime_seconds > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-purple-700 mb-1.5">
                            <Clock size={10} />
                            <span className="font-bold">{item.start_time} – {item.end_time}</span>
                            {item.segments && item.segments.length > 1 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-extrabold">
                                    {item.segments.length} parça
                                </span>
                            )}
                        </div>
                    )}
                    {type === 'potential' && item.segments && item.segments.length > 1 && (
                        <div className="space-y-0.5 mb-1.5 ml-3 border-l-2 border-purple-100 pl-2">
                            {item.segments.map((seg, si) => (
                                <div key={si} className="text-[10px] text-purple-500 flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-purple-100 text-purple-600 text-[8px] font-extrabold flex items-center justify-center flex-shrink-0">
                                        {si + 1}
                                    </span>
                                    {seg.start} – {seg.end}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Özet satırı */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {type === 'intended' && (
                            <>
                                <span className="text-blue-600 font-medium">
                                    Max: <strong>{item.max_duration_hours} sa</strong>
                                </span>
                                <span className="text-slate-500">
                                    Gerçekleşen: <strong className={item.actual_overtime_hours > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                                        {item.actual_overtime_hours > 0 ? `${item.actual_overtime_hours} sa` : '—'}
                                    </strong>
                                </span>
                            </>
                        )}
                        {type === 'potential' && (
                            <span className="text-purple-700 font-medium">
                                Fazla Mesai: <strong>{item.actual_overtime_hours} sa</strong>
                            </span>
                        )}
                        {item.total_work_hours > 0 && (
                            <span className="text-slate-500">
                                Toplam: <strong className="text-slate-700">{item.total_work_hours} sa</strong>
                            </span>
                        )}
                        {item.total_break_seconds > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                                <Coffee size={10} /> {formatDuration(item.total_break_seconds)}
                            </span>
                        )}
                    </div>

                    {/* Atayan / task description */}
                    {item.manager_name && (
                        <div className="text-[11px] text-slate-400 mt-1">Atayan: {item.manager_name}</div>
                    )}
                    {item.task_description && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">{item.task_description}</div>
                    )}
                    {item.is_rejected && item.rejection_reason && (
                        <div className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <XCircle size={10} /> Ret sebebi: {item.rejection_reason}
                        </div>
                    )}
                </div>

                {/* Action */}
                <div className="flex flex-col items-end justify-center gap-1.5 px-3 flex-shrink-0">
                    {item.claim_status === 'APPROVED' ? (
                        <Pill color="emerald">Onaylandı</Pill>
                    ) : item.claim_status === 'PENDING' ? (
                        <Pill color="amber">Bekliyor</Pill>
                    ) : item.is_rejected ? (
                        <>
                            <Pill color="red">Reddedildi</Pill>
                            {isDatePast(item.date) && item.check_out_time && item.actual_overtime_hours > 0 && (
                                <button onClick={onClaim}
                                    className="px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700">
                                    <Send size={10} /> Tekrar Talep
                                </button>
                            )}
                        </>
                    ) : type === 'intended' && item.date > getIstanbulToday() ? (
                        <Pill color="sky">Planlandı</Pill>
                    ) : type === 'intended' && item.date === getIstanbulToday() && !item.check_out_time ? (
                        <div className="flex flex-col items-end gap-1">
                            <Pill color="amber">Bugün</Pill>
                            <span className="text-[9px] text-slate-400 text-right max-w-[100px]">Kartla çıkış yapınız</span>
                        </div>
                    ) : item.actual_overtime_hours > 0 && (item.check_out_time || isDatePast(item.date)) ? (
                        <button onClick={onClaim}
                            className={`px-3.5 py-1.5 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 ${
                                type === 'potential'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                            <Send size={11} /> Talep Et
                        </button>
                    ) : isDatePast(item.date) && !item.check_out_time ? (
                        <div className="flex flex-col items-end gap-1">
                            <Pill color="slate">Çalışma Yok</Pill>
                            <span className="text-[9px] text-slate-400 text-right max-w-[100px]">Giriş/çıkış kaydı yok</span>
                        </div>
                    ) : type === 'intended' && !item.can_claim ? (
                        <Pill color="blue">Atandı</Pill>
                    ) : (
                        <button onClick={onClaim}
                            className={`px-3.5 py-1.5 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 ${
                                type === 'potential'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                            <Send size={11} /> Talep Et
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// SECTION HEADER (lightweight, no gradient icon box)
// ═══════════════════════════════════════════════════════════

const SectionHeader = ({ icon, title, count, countColor, action, children }) => (
    <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                {icon && <span className="text-slate-400">{icon}</span>}
                <h3 className="font-bold text-slate-800 text-[15px] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
                {count !== undefined && <CountBadge count={count} color={countColor} />}
            </div>
            {action}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
);

// ═══════════════════════════════════════════════════════════
// TEAM GROUP ACCORDION
// ═══════════════════════════════════════════════════════════

const GroupAccordion = ({ name, count, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left">
                {open
                    ? <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
                    : <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                }
                <span className="font-bold text-sm text-slate-700 flex-1">{name}</span>
                <CountBadge count={count} color="emerald" />
            </button>
            {open && <div className="border-t border-slate-100 p-2 space-y-1">{children}</div>}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// REQUEST CARD (for "Tüm Ek Mesai Taleplerim")
// ═══════════════════════════════════════════════════════════

const RequestCard = ({ req }) => {
    const d = new Date(req.date + 'T00:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];
    const approverName = ['APPROVED', 'REJECTED'].includes(req.status)
        ? (req.approval_manager_name || req.target_approver_name)
        : req.target_approver_name;

    return (
        <div className="rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all overflow-hidden">
            <div className="flex">
                <div className="w-[72px] flex-shrink-0 flex flex-col items-center justify-center py-3 bg-slate-50">
                    <span className="text-[22px] font-black text-slate-800 leading-none">{dayNum}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5">{monthName}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{dayName}</span>
                </div>
                <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <SourcePill type={req.source_type} />
                        <StatusPill status={req.status} />
                        {req.start_time && req.end_time && (
                            <span className="text-xs text-slate-500 font-medium">
                                {req.start_time?.slice(0, 5)} – {req.end_time?.slice(0, 5)}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {req.duration_seconds > 0 && (
                            <span className="text-slate-500">
                                Süre: <strong className="text-slate-700">{formatDuration(req.duration_seconds)}</strong>
                            </span>
                        )}
                        {approverName && (
                            <span className="flex items-center gap-1 text-slate-400">
                                {req.status === 'APPROVED' && <CheckCircle2 size={10} className="text-emerald-500" />}
                                {req.status === 'PENDING' && <Clock size={10} className="text-amber-500" />}
                                {req.status === 'REJECTED' && <XCircle size={10} className="text-red-400" />}
                                {req.status === 'PENDING' ? 'Onay: ' : req.status === 'APPROVED' ? 'Onaylayan: ' : 'Reddeden: '}
                                <span className="font-bold text-slate-600">{approverName}</span>
                            </span>
                        )}
                    </div>
                    {req.reason && (
                        <div className="text-[11px] text-slate-400 mt-1 truncate max-w-sm">{req.reason}</div>
                    )}
                    {req.rejection_reason && req.status === 'REJECTED' && (
                        <div className="text-[11px] text-red-500 mt-0.5 flex items-center gap-1">
                            <XCircle size={10} /> Ret sebebi: {req.rejection_reason}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end justify-center px-3 flex-shrink-0">
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// ASSIGNMENT CARD (for "Oluşturduklarım" team tab)
// ═══════════════════════════════════════════════════════════

const AssignmentCard = ({ assignment, onCancel, onEdit }) => {
    const d = new Date(assignment.date + 'T00:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];

    return (
        <div className="rounded-xl border border-slate-100 bg-white hover:border-emerald-200 transition-all overflow-hidden">
            <div className="flex">
                <div className="w-[72px] flex-shrink-0 flex flex-col items-center justify-center py-3 bg-slate-50">
                    <span className="text-[22px] font-black text-slate-800 leading-none">{dayNum}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5">{monthName}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{dayName}</span>
                </div>
                <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-800">{assignment.employee_name}</span>
                        <AssignmentPill assignment={assignment} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>Maks <strong className="text-slate-700">{assignment.max_duration_hours} sa</strong></span>
                        {assignment.employee_department && (
                            <span className="flex items-center gap-1">
                                <Briefcase size={10} className="text-slate-400" />
                                {assignment.employee_department}
                            </span>
                        )}
                    </div>
                    {assignment.task_description && (
                        <div className="text-[11px] text-slate-400 mt-1 truncate max-w-sm">{assignment.task_description}</div>
                    )}
                </div>
                <div className="flex flex-col items-end justify-center px-3 flex-shrink-0 gap-1">
                    {assignment.status === 'ASSIGNED' && (
                        <>
                            {onEdit && (
                                <button onClick={() => onEdit(assignment)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                    <Pencil size={10} /> Düzenle
                                </button>
                            )}
                            <button onClick={() => onCancel(assignment)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                <XCircle size={10} /> İptal
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// TEAM ITEM CARD (for "Ekip Talepleri" accordion items)
// ═══════════════════════════════════════════════════════════

const TeamItemCard = ({ item, onCancel, onEdit }) => {
    const d = new Date(item.date + 'T00:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];

    return (
        <div className="rounded-lg border border-slate-50 bg-white hover:border-emerald-100 transition-all overflow-hidden">
            <div className="flex">
                <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center py-2 bg-slate-50/70">
                    <span className="text-lg font-black text-slate-800 leading-none">{dayNum}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-0.5">{monthName}</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">{dayName}</span>
                </div>
                <div className="flex-1 p-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-bold text-sm text-slate-800">{item.employee_name}</span>
                        {item._type === 'assignment'
                            ? <AssignmentPill assignment={item} />
                            : <><SourcePill type={item.source_type} /><StatusPill status={item.status} /></>
                        }
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {item._type === 'assignment' && (
                            <span>Maks <strong className="text-slate-700">{item.max_duration_hours} sa</strong></span>
                        )}
                        {item._type === 'request' && item.duration_seconds > 0 && (
                            <span>Süre: <strong className="text-slate-700">{formatDuration(item.duration_seconds)}</strong></span>
                        )}
                        {item.assigned_by_name && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                Oluşturan: <strong className="text-slate-600">{item.assigned_by_name}</strong>
                            </span>
                        )}
                    </div>
                    {(item.task_description || item.reason) && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">{item.task_description || item.reason}</div>
                    )}
                </div>
                {item._type === 'assignment' && item.status === 'ASSIGNED' && (
                    <div className="flex flex-col items-center px-2.5 gap-1">
                        {onEdit && (
                            <button onClick={() => onEdit(item)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                <Pencil size={10} /> Düzenle
                            </button>
                        )}
                        {onCancel && (
                            <button onClick={() => onCancel(item)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                <XCircle size={10} /> İptal
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// MODALS (kept as-is, they work well)
// ═══════════════════════════════════════════════════════════

const ClaimModal = ({ isOpen, title, subtitle, onClose, onSubmit, loading, managers = [], claimType }) => {
    const [reason, setReason] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState(null);
    const showManagerSelect = managers.length > 1;

    useEffect(() => {
        if (showManagerSelect) {
            const primary = managers.find(m => m.relationship_type === 'PRIMARY');
            setSelectedManagerId(primary ? primary.id : managers[0]?.id || null);
        }
    }, [managers, showManagerSelect]);

    return (
        <ModalOverlay open={isOpen} onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                {managers.length === 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            Yöneticiniz tanımlanmamış. İK ile iletişime geçin. Talep oluşturulamaz.
                        </p>
                    </div>
                )}
                {showManagerSelect && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Onay Yöneticisi</label>
                        <select
                            value={selectedManagerId || ''}
                            onChange={e => setSelectedManagerId(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                        >
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.relationship_type === 'PRIMARY' ? '⭐ ' : '🔹 '}
                                    {m.full_name}
                                    {m.relationship_type === 'PRIMARY' ? ' (Birincil)' : ' (İkincil)'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <textarea rows="3" value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Açıklama (opsiyonel)..." className="input-field resize-none" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
                    <button onClick={() => { onSubmit(reason, selectedManagerId); setReason(''); }} disabled={loading || managers.length === 0}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
                        {loading ? 'Gönderiliyor...' : 'Talep Et'}
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};

// CancelModal kaldırıldı — OT request iptal yapılamaz

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const AssignedOvertimeTab = () => {
    const { hasPermission } = useAuth();
    const isManager = hasPermission('APPROVAL_OVERTIME');

    // ── View state ──
    const [activeView, setActiveView] = useState('personal');
    const [teamSubTab, setTeamSubTab] = useState('created');

    // ── Data ──
    const [loading, setLoading] = useState(true);
    const [claimableData, setClaimableData] = useState({ intended: [], potential: [] });
    const [myRequests, setMyRequests] = useState([]);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [teamManagedAssignments, setTeamManagedAssignments] = useState([]);
    const [teamRequests, setTeamRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [managers, setManagers] = useState([]);

    // ── UI ──
    const [claimModal, setClaimModal] = useState({ open: false, type: null, target: null, title: '', subtitle: '' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, assignment: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualAssignment, setManualAssignment] = useState(null);
    const [manualMatchMode, setManualMatchMode] = useState('independent');

    // ── Manual entry ──
    const [manualForm, setManualForm] = useState({ date: '', start_time: '', end_time: '', reason: '' });
    const [manualError, setManualError] = useState('');
    const [manualSubmitting, setManualSubmitting] = useState(false);
    const [selectedManualManagerId, setSelectedManualManagerId] = useState(null);

    // ── Task 11: Segment selection for POTENTIAL claims ──
    const [selectedSegments, setSelectedSegments] = useState({});
    // ── Task 13: INTENDED + POTENTIAL segment selection ──
    const [selectedIntendedPotentials, setSelectedIntendedPotentials] = useState({});

    useEffect(() => {
        if (!manualForm.date) {
            setManualAssignment(null);
            setManualMatchMode('independent');
            return;
        }
        const checkAssignment = async () => {
            try {
                const match = claimableData.intended?.find(
                    a => a.date === manualForm.date && !a.claim_status
                );
                if (match) {
                    setManualAssignment(match);
                } else {
                    try {
                        const resp = await api.get('/overtime-assignments/', {
                            params: { employee: 'me', date: manualForm.date, status: 'ASSIGNED' }
                        });
                        const results = resp.data?.results || resp.data || [];
                        setManualAssignment(Array.isArray(results) ? results[0] || null : null);
                    } catch {
                        setManualAssignment(null);
                    }
                }
            } catch {
                setManualAssignment(null);
            }
        };
        checkAssignment();
    }, [manualForm.date, claimableData.intended]);

    // Auto-select manager for manual entry form
    useEffect(() => {
        if (managers.length === 1) {
            setSelectedManualManagerId(managers[0].id);
        } else if (managers.length > 1) {
            const primary = managers.find(m => m.relationship_type === 'PRIMARY');
            setSelectedManualManagerId(primary ? primary.id : managers[0]?.id);
        }
    }, [managers]);

    // ── Filters ──
    const [requestFilter, setRequestFilter] = useState({ status: 'ALL', source: 'ALL', date_from: '', date_to: '' });
    const [createdDateFilter, setCreatedDateFilter] = useState({ from: '', to: '' });
    const [teamGroupBy, setTeamGroupBy] = useState('manager');
    const [teamFilters, setTeamFilters] = useState({ person: 'ALL', date_from: '', date_to: '' });

    // ── Fetch ──
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const calls = [
                api.get('/overtime-assignments/claimable/'),
                api.get('/overtime-requests/'),
                api.get('/overtime-requests/my-managers/'),
            ];
            if (isManager) {
                calls.push(api.get('/overtime-assignments/team/'));
                calls.push(api.get('/employees/', { params: { page_size: 200 } }));
                calls.push(api.get('/overtime-assignments/team/', { params: { scope: 'managed' } }));
                calls.push(api.get('/overtime-requests/team/'));
            }
            const results = await Promise.allSettled(calls);
            if (results[0].status === 'fulfilled') setClaimableData(results[0].value.data);
            if (results[1].status === 'fulfilled') setMyRequests(results[1].value.data);
            if (results[2].status === 'fulfilled') setManagers(results[2].value.data || []);
            if (isManager && results[3]?.status === 'fulfilled') setTeamAssignments(results[3].value.data);
            if (isManager && results[4]?.status === 'fulfilled') {
                const d = results[4].value.data;
                setTeamMembers(Array.isArray(d) ? d : (d.results || []));
            }
            if (isManager && results[5]?.status === 'fulfilled') setTeamManagedAssignments(results[5].value.data);
            if (isManager && results[6]?.status === 'fulfilled') setTeamRequests(results[6].value.data);
        } catch (err) { console.error('fetchData error:', err); }
        setLoading(false);
    }, [isManager]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Handlers ──
    const handleClaim = async (reason, selectedManagerId) => {
        setActionLoading(true);
        try {
            const { type, target } = claimModal;
            if (type === 'INTENDED') {
                const intendedPayload = { reason: reason || undefined };
                if (selectedManagerId) intendedPayload.target_approver_id = selectedManagerId;
                // Task 13: Include selected potential segment IDs
                const potentialIds = selectedIntendedPotentials[target.assignment_id] || [];
                if (potentialIds.length > 0) {
                    intendedPayload.potential_ids = potentialIds;
                }
                await api.post(`/overtime-assignments/${target.assignment_id}/claim/`, intendedPayload);
            }
            else if (type === 'POTENTIAL') {
                const payload = {
                    ...(target.overtime_request_id ? { overtime_request_id: target.overtime_request_id } : { attendance_id: target.attendance_id }),
                    reason: reason || undefined,
                };
                if (selectedManagerId) payload.target_approver_id = selectedManagerId;
                await api.post('/overtime-requests/claim-potential/', payload);
            }
            setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' });
            fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Talep sırasında hata oluştu.'); }
        setActionLoading(false);
    };

    // handleCancel (OT request) kaldırıldı — kullanıcı iptal yapamaz

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setManualError('');
        if (!manualForm.date || !manualForm.start_time || !manualForm.end_time) { setManualError('Tüm alanları doldurunuz.'); return; }
        if (manualForm.end_time <= manualForm.start_time) { setManualError('Bitiş saati başlangıçtan büyük olmalı.'); return; }
        if (!manualForm.reason.trim()) { setManualError('Açıklama giriniz.'); return; }
        setManualSubmitting(true);
        try {
            const payload = {
                date: manualForm.date,
                start_time: manualForm.start_time,
                end_time: manualForm.end_time,
                reason: manualForm.reason.trim(),
            };
            if (manualMatchMode === 'match' && manualAssignment) {
                payload.assignment_id = manualAssignment.id;
            }
            if (selectedManualManagerId) {
                payload.target_approver_id = selectedManualManagerId;
            } else if (managers.length === 1) {
                payload.target_approver_id = managers[0].id;
            }
            await api.post('/overtime-requests/manual-entry/', payload);
            setManualForm({ date: '', start_time: '', end_time: '', reason: '' });
            setManualAssignment(null);
            setManualMatchMode('independent');
            setShowManualForm(false);
            fetchData();
        } catch (err) {
            setManualError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Hata oluştu.');
        }
        setManualSubmitting(false);
    };

    // ── Task 11: Claim grouped POTENTIAL segments ──
    const handleClaimPotentialGroup = async (groupKey, selectedIds) => {
        if (!selectedIds.length) return;
        setActionLoading(true);
        try {
            const payload = {
                overtime_request_ids: selectedIds,
                reason: 'Ek mesai talebi',
            };
            await api.post('/overtime-requests/claim-potential/', payload);
            fetchData();
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Talep oluşturulamadı';
            alert(errMsg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelAssignment = async (a) => {
        if (!window.confirm(`${a.employee_name} - ${formatDateTurkish(a.date)} atamasını iptal etmek istiyor musunuz?`)) return;
        try { await api.post(`/overtime-assignments/${a.id}/cancel/`); fetchData(); }
        catch (err) { alert(err.response?.data?.error || 'Hata oluştu.'); }
    };

    const handleEditAssignment = (assignment) => {
        setEditModal({ open: true, assignment });
    };

    // ── Computed ──
    // Tüm atanmış intended'ları göster (mesai henüz yapılmamış olsa bile atama görünmeli)
    const visibleIntended = useMemo(() => {
        return claimableData.intended;
    }, [claimableData.intended]);

    // ── Task 11: Group potentials by group_key ──
    const potentialGroups = useMemo(() => {
        const groups = {};
        for (const item of claimableData.potential || []) {
            const key = item.group_key || `standalone_${item.overtime_request_id}`;
            if (!groups[key]) {
                groups[key] = {
                    group_key: key,
                    date: item.date,
                    items: [],
                    totalSeconds: 0,
                };
            }
            groups[key].items.push(item);
            groups[key].totalSeconds += item.actual_overtime_seconds || 0;
        }
        return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
    }, [claimableData.potential]);

    // Initialize selectedSegments when potentialGroups changes
    useEffect(() => {
        const initial = {};
        for (const group of potentialGroups) {
            initial[group.group_key] = group.items.map(i => i.overtime_request_id);
        }
        setSelectedSegments(initial);
    }, [potentialGroups]);

    const pendingCount = myRequests.filter(r => r.status === 'PENDING').length;
    const approvedHours = Math.round(myRequests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.duration_seconds || 0), 0) / 3600 * 10) / 10;
    const thisMonthCount = myRequests.filter(r => {
        const [ry, rm] = r.date.split('-').map(Number);
        const [ny, nm] = getIstanbulToday().split('-').map(Number);
        return rm === nm && ry === ny;
    }).length;

    const filteredMyCreated = useMemo(() => {
        if (!createdDateFilter.from && !createdDateFilter.to) return teamAssignments;
        return teamAssignments.filter(a => matchesDateRange(a.date, createdDateFilter.from, createdDateFilter.to));
    }, [teamAssignments, createdDateFilter]);

    const teamCombined = useMemo(() => {
        const items = [];
        for (const a of teamManagedAssignments) {
            items.push({ ...a, _type: 'assignment', _key: `a-${a.id}`, employee_name: a.employee_name || '', manager_name: a.assigned_by_name || '' });
        }
        for (const r of teamRequests) {
            items.push({ ...r, _type: 'request', _key: `r-${r.id}`, employee_name: r.employee_name || '', manager_name: r.approval_manager_name || r.target_approver_name || '' });
        }
        return items;
    }, [teamManagedAssignments, teamRequests]);

    const filteredTeamCombined = useMemo(() => {
        return teamCombined.filter(item => {
            if (teamFilters.person !== 'ALL') {
                const key = teamGroupBy === 'manager' ? item.manager_name : item.employee_name;
                if (key !== teamFilters.person) return false;
            }
            return matchesDateRange(item.date, teamFilters.date_from, teamFilters.date_to);
        });
    }, [teamCombined, teamFilters, teamGroupBy]);

    const teamGroups = useMemo(() => {
        const map = {};
        for (const item of filteredTeamCombined) {
            const key = teamGroupBy === 'manager' ? (item.manager_name || 'Bilinmiyor') : (item.employee_name || 'Bilinmiyor');
            if (!map[key]) map[key] = [];
            map[key].push(item);
        }
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length).map(([name, items]) => ({ name, items }));
    }, [filteredTeamCombined, teamGroupBy]);

    const teamPersonOptions = useMemo(() => {
        const set = new Set();
        for (const item of teamCombined) {
            const key = teamGroupBy === 'manager' ? item.manager_name : item.employee_name;
            if (key) set.add(key);
        }
        return [...set].sort();
    }, [teamCombined, teamGroupBy]);

    const filteredRequests = useMemo(() => {
        return myRequests.filter(r => {
            if (r.status === 'POTENTIAL') return false;
            if (requestFilter.status !== 'ALL' && r.status !== requestFilter.status) return false;
            if (requestFilter.source !== 'ALL' && r.source_type !== requestFilter.source) return false;
            return matchesDateRange(r.date, requestFilter.date_from, requestFilter.date_to);
        });
    }, [myRequests, requestFilter]);

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="space-y-5">

            {/* ─── TAB BAR ─── */}
            <div className="flex items-center gap-1 border-b border-slate-200 -mt-1">
                <button
                    onClick={() => setActiveView('personal')}
                    className={`relative px-4 py-3 text-sm font-bold transition-colors ${
                        activeView === 'personal'
                            ? 'text-blue-600'
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <ClipboardList size={15} />
                        Ek Mesailerim
                    </span>
                    {activeView === 'personal' && (
                        <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-500 rounded-full" />
                    )}
                </button>
                {isManager && (
                    <button
                        onClick={() => setActiveView('team')}
                        className={`relative px-4 py-3 text-sm font-bold transition-colors ${
                            activeView === 'team'
                                ? 'text-emerald-600'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Users size={15} />
                            Ekibim
                            {(teamAssignments.length + teamCombined.length) > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                                    {teamAssignments.length + teamCombined.length}
                                </span>
                            )}
                        </span>
                        {activeView === 'team' && (
                            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
                        )}
                    </button>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PERSONAL VIEW                                         */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeView === 'personal' && (
                <div className="space-y-6 animate-fade-in">

                    {/* ─── Stats Row (compact) ─── */}
                    <div className="flex flex-wrap gap-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Clock size={14} className="text-amber-600" />
                            </div>
                            <div>
                                <div className="text-lg font-black text-slate-900 leading-none">{pendingCount}</div>
                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">Bekleyen</div>
                            </div>
                        </div>
                        <div className="w-px bg-slate-200 self-stretch" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <TrendingUp size={14} className="text-emerald-600" />
                            </div>
                            <div>
                                <div className="text-lg font-black text-slate-900 leading-none">{approvedHours} <span className="text-xs font-bold text-slate-400">sa</span></div>
                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">Onaylanan</div>
                            </div>
                        </div>
                        <div className="w-px bg-slate-200 self-stretch" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <FileText size={14} className="text-blue-600" />
                            </div>
                            <div>
                                <div className="text-lg font-black text-slate-900 leading-none">{thisMonthCount}</div>
                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">Bu Ay</div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Benden İstenen Planlı Mesailer (Task 13: INTENDED + POTENTIAL segment selection) ─── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                        <SectionHeader icon={<CalendarCheck size={16} />} title="Benden İstenen Planlı Mesailer" count={visibleIntended.length} countColor="blue" />
                        {visibleIntended.length === 0
                            ? <EmptyState text="Atanmış planlı ek mesai bulunmuyor." />
                            : (
                                <div className="space-y-2">
                                    {visibleIntended.map((item, i) => {
                                        const sameDatePotentials = (claimableData.potential || []).filter(
                                            p => p.date === item.date
                                        );
                                        const assignId = item.assignment_id;
                                        return (
                                            <div key={i}>
                                                <OvertimeDetailCard
                                                    item={item}
                                                    type="intended"
                                                    claimed={item.already_claimed}
                                                    onClaim={() => setClaimModal({
                                                        open: true, type: 'INTENDED', target: item,
                                                        title: 'Planlı Mesai Talep Et',
                                                        subtitle: `${formatDateTurkish(item.date)} — ${item.claimable_hours || item.actual_overtime_hours} saat`,
                                                    })}
                                                />
                                                {sameDatePotentials.length > 0 && !item.already_claimed && !item.claim_status && (
                                                    <div className="ml-[72px] mr-3 -mt-1 mb-1 border border-dashed border-purple-200 rounded-b-lg bg-purple-50/30 p-2.5">
                                                        <p className="text-[10px] font-bold text-purple-500 mb-1.5">Algılanan segmentleri dahil et:</p>
                                                        {sameDatePotentials.map(p => (
                                                            <label key={p.overtime_request_id} className="flex items-center gap-2 text-xs text-slate-600 py-0.5 cursor-pointer">
                                                                <input type="checkbox"
                                                                    checked={(selectedIntendedPotentials[assignId] || []).includes(p.overtime_request_id)}
                                                                    onChange={(e) => {
                                                                        setSelectedIntendedPotentials(prev => {
                                                                            const current = prev[assignId] || [];
                                                                            if (e.target.checked) {
                                                                                return { ...prev, [assignId]: [...current, p.overtime_request_id] };
                                                                            }
                                                                            return { ...prev, [assignId]: current.filter(id => id !== p.overtime_request_id) };
                                                                        });
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600"
                                                                />
                                                                <Clock size={10} className="text-purple-400" />
                                                                <span className="font-medium">{p.start_time} – {p.end_time}</span>
                                                                <span className="text-slate-400">({formatDuration(p.actual_overtime_seconds)})</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        }
                    </div>

                    {/* ─── Algılanan Plansız Mesailer (Task 11: Checkbox Segment Selection) ─── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                        <SectionHeader icon={<Zap size={16} />} title="Algılanan Plansız Mesailer" count={(claimableData.potential || []).length} countColor="blue" />
                        {potentialGroups.length === 0
                            ? <EmptyState text="Algılanan ek mesai segmenti yok" />
                            : potentialGroups.map((group) => {
                                const selected = selectedSegments[group.group_key] || [];
                                const selectedDuration = group.items
                                    .filter(i => selected.includes(i.overtime_request_id))
                                    .reduce((sum, i) => sum + (i.actual_overtime_seconds || 0), 0);
                                const isAboveThreshold = selectedDuration >= 1800;

                                const gd = new Date(group.date + 'T00:00:00');
                                const dayName = DAY_NAMES[gd.getDay()];
                                const dayNum = String(gd.getDate()).padStart(2, '0');
                                const monthName = MONTH_NAMES[gd.getMonth()];
                                const year = gd.getFullYear();

                                return (
                                    <div key={group.group_key} className="rounded-xl border border-slate-100 bg-white p-4 mb-3 hover:border-blue-200 transition-all">
                                        {/* Date header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-black text-slate-800">{dayNum}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-500">{monthName} {year}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{dayName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Segment checkboxes */}
                                        <div className="space-y-2 mb-3">
                                            {group.items.map((item) => {
                                                const checked = selected.includes(item.overtime_request_id);
                                                const otTypeLabel = item.ot_type === 'PRE_SHIFT' ? 'Vardiya Öncesi'
                                                    : item.ot_type === 'POST_SHIFT' ? 'Vardiya Sonrası'
                                                    : item.ot_type === 'OFF_DAY' ? 'Tatil Günü'
                                                    : 'Karma';
                                                const otTypeColor = item.ot_type === 'PRE_SHIFT' ? 'text-blue-700 bg-blue-50'
                                                    : item.ot_type === 'POST_SHIFT' ? 'text-purple-700 bg-purple-50'
                                                    : item.ot_type === 'OFF_DAY' ? 'text-amber-700 bg-amber-50'
                                                    : 'text-slate-700 bg-slate-50';

                                                const subSegments = item.segments || [];

                                                return (
                                                    <label key={item.overtime_request_id}
                                                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                                            checked ? 'bg-blue-50/70 border border-blue-200' : 'bg-slate-50/50 border border-transparent hover:bg-slate-100/70'
                                                        }`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                setSelectedSegments(prev => {
                                                                    const current = prev[group.group_key] || [];
                                                                    if (e.target.checked) {
                                                                        return { ...prev, [group.group_key]: [...current, item.overtime_request_id] };
                                                                    } else {
                                                                        return { ...prev, [group.group_key]: current.filter(id => id !== item.overtime_request_id) };
                                                                    }
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Clock size={12} className="text-slate-400 flex-shrink-0" />
                                                                <span className="text-sm font-semibold text-slate-700">
                                                                    {item.start_time} – {item.end_time}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    ({formatDuration(item.actual_overtime_seconds)})
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${otTypeColor}`}>
                                                                    {otTypeLabel}
                                                                </span>
                                                            </div>
                                                            {/* Alt segmentler (birden fazla giriş/çıkış) */}
                                                            {subSegments.length > 1 && (
                                                                <div className="mt-1.5 ml-4 space-y-0.5">
                                                                    {subSegments.map((seg, idx) => (
                                                                        <div key={idx} className="text-[11px] text-slate-400 flex items-center gap-1">
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                            {seg.start} – {seg.end}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Total + claim button */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span className="text-xs text-slate-500">
                                                Seçilen: <strong className="text-slate-700">{formatDuration(selectedDuration)}</strong>
                                                {selected.length > 0 && ` (${selected.length} segment)`}
                                            </span>
                                            <button
                                                disabled={selected.length === 0 || !isAboveThreshold || actionLoading}
                                                onClick={() => handleClaimPotentialGroup(group.group_key, selected)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    selected.length > 0 && isAboveThreshold
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                            >
                                                Talep Et {selected.length > 0 ? `(${selected.length})` : ''}
                                            </button>
                                        </div>
                                        {selected.length > 0 && !isAboveThreshold && (
                                            <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                                                <AlertTriangle size={10} />
                                                Toplam min. 30 dk olmali.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* ─── Manuel Ek Mesai ─── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => setShowManualForm(!showManualForm)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400"><PenLine size={16} /></span>
                                <h3 className="font-bold text-slate-800 text-[15px] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Manuel Ek Mesai Girişi</h3>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${showManualForm ? 'rotate-180' : ''}`} />
                        </button>
                        {showManualForm && (
                            <div className="border-t border-slate-100 p-4 sm:p-5">
                                <form onSubmit={handleManualSubmit} className="space-y-3">
                                    {manualError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{manualError}</div>}
                                    {manualAssignment && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                            <p className="text-sm text-blue-800 font-medium">
                                                Bu tarih için ek mesai ataması bulundu: <strong>{manualAssignment.task_description || 'Görev açıklaması yok'}</strong>
                                                {manualAssignment.max_duration_hours && ` (Maks. ${manualAssignment.max_duration_hours} saat)`}
                                            </p>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="matchMode" value="match"
                                                        checked={manualMatchMode === 'match'}
                                                        onChange={() => setManualMatchMode('match')}
                                                        className="accent-blue-600" />
                                                    <span className="text-xs font-bold text-blue-700">Atama ile eşleştir</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="matchMode" value="independent"
                                                        checked={manualMatchMode === 'independent'}
                                                        onChange={() => setManualMatchMode('independent')}
                                                        className="accent-slate-600" />
                                                    <span className="text-xs font-bold text-slate-600">Bağımsız talep</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                                            <input type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} className="input-field" required />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Başlangıç</label>
                                            <input type="time" value={manualForm.start_time} onChange={e => setManualForm({ ...manualForm, start_time: e.target.value })} className="input-field" required />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Bitiş</label>
                                            <input type="time" value={manualForm.end_time} onChange={e => setManualForm({ ...manualForm, end_time: e.target.value })} className="input-field" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Açıklama</label>
                                        <textarea rows="2" value={manualForm.reason} onChange={e => setManualForm({ ...manualForm, reason: e.target.value })}
                                            placeholder="Yapılan işin açıklaması..." className="input-field resize-none" required />
                                    </div>
                                    {/* Manager selection for manual OT */}
                                    {managers.length === 0 && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                            <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                                                <AlertTriangle size={14} />
                                                Yöneticiniz tanımlanmamış. İK ile iletişime geçin.
                                            </p>
                                        </div>
                                    )}
                                    {managers.length === 1 && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Onaya Gidecek Kişi</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                {managers[0].relationship_type === 'PRIMARY' ? '⭐ ' : '🔹 '}
                                                {managers[0].full_name}
                                            </p>
                                        </div>
                                    )}
                                    {managers.length > 1 && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                                Onay Yöneticisi <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={selectedManualManagerId || ''}
                                                onChange={e => setSelectedManualManagerId(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                                            >
                                                {managers.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.relationship_type === 'PRIMARY' ? '⭐ ' : '🔹 '}
                                                        {m.full_name}
                                                        {m.relationship_type === 'PRIMARY' ? ' (Birincil)' : ' (İkincil)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <button type="submit" disabled={manualSubmitting || managers.length === 0}
                                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2">
                                        {manualSubmitting ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                                        {manualSubmitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* ─── Tüm Taleplerim ─── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                        <SectionHeader icon={<ClipboardList size={16} />} title="Tüm Ek Mesai Taleplerim" count={filteredRequests.length}>
                            <select value={requestFilter.status} onChange={e => setRequestFilter(f => ({ ...f, status: e.target.value }))}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none">
                                <option value="ALL">Tüm Durumlar</option>
                                <option value="PENDING">Bekliyor</option>
                                <option value="APPROVED">Onaylandı</option>
                                <option value="REJECTED">Reddedildi</option>
                                <option value="CANCELLED">İptal Edildi</option>
                            </select>
                            <select value={requestFilter.source} onChange={e => setRequestFilter(f => ({ ...f, source: e.target.value }))}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none">
                                <option value="ALL">Tüm Kaynaklar</option>
                                <option value="INTENDED">Planlı</option>
                                <option value="POTENTIAL">Plansız</option>
                                <option value="MANUAL">Manuel</option>
                            </select>
                            <DateFilter from={requestFilter.date_from} to={requestFilter.date_to}
                                onChange={({ from, to }) => setRequestFilter(f => ({ ...f, date_from: from, date_to: to }))} />
                        </SectionHeader>

                        {filteredRequests.length === 0
                            ? <EmptyState text="Ek mesai talebiniz bulunmuyor." />
                            : (
                                <div className="space-y-2">
                                    {filteredRequests.map(req => (
                                        <RequestCard key={req.id} req={req} />
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* TEAM VIEW                                             */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeView === 'team' && isManager && (
                <div className="space-y-5 animate-fade-in">

                    {/* ─── Team Toolbar ─── */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button onClick={() => setTeamSubTab('created')}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${teamSubTab === 'created' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="flex items-center gap-1.5">
                                    <UserCheck size={13} />
                                    Oluşturduklarım
                                    <CountBadge count={filteredMyCreated.length} color={teamSubTab === 'created' ? 'emerald' : 'slate'} />
                                </span>
                            </button>
                            <button onClick={() => setTeamSubTab('all')}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${teamSubTab === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="flex items-center gap-1.5">
                                    <LayoutList size={13} />
                                    Ekip Talepleri
                                    <CountBadge count={filteredTeamCombined.length} color={teamSubTab === 'all' ? 'emerald' : 'slate'} />
                                </span>
                            </button>
                        </div>
                        <button onClick={() => setShowAssignModal(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5">
                            <Plus size={14} /> Yeni Atama
                        </button>
                    </div>

                    {/* ─── Sub: Oluşturduklarım ─── */}
                    {teamSubTab === 'created' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                            <SectionHeader title="Benim Oluşturduğum Atamalar" count={filteredMyCreated.length} countColor="emerald">
                                <DateFilter from={createdDateFilter.from} to={createdDateFilter.to} onChange={setCreatedDateFilter} />
                            </SectionHeader>

                            {filteredMyCreated.length === 0
                                ? <EmptyState text="Oluşturduğunuz atama bulunmuyor." />
                                : (
                                    <div className="space-y-2">
                                        {filteredMyCreated.map(a => (
                                            <AssignmentCard key={a.id} assignment={a} onCancel={handleCancelAssignment} onEdit={handleEditAssignment} />
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}

                    {/* ─── Sub: Ekibimin Talepleri ─── */}
                    {teamSubTab === 'all' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                            <SectionHeader title="Ekibimin Tüm Talepleri" count={filteredTeamCombined.length} countColor="emerald">
                                {/* Group toggle */}
                                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                                    <button onClick={() => { setTeamGroupBy('manager'); setTeamFilters(f => ({ ...f, person: 'ALL' })); }}
                                        className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${teamGroupBy === 'manager' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                        Yönetici
                                    </button>
                                    <button onClick={() => { setTeamGroupBy('employee'); setTeamFilters(f => ({ ...f, person: 'ALL' })); }}
                                        className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${teamGroupBy === 'employee' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                        Çalışan
                                    </button>
                                </div>
                                <select value={teamFilters.person} onChange={e => setTeamFilters(f => ({ ...f, person: e.target.value }))}
                                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-100 outline-none max-w-[160px]">
                                    <option value="ALL">{teamGroupBy === 'manager' ? 'Tüm Yöneticiler' : 'Tüm Çalışanlar'}</option>
                                    {teamPersonOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <DateFilter from={teamFilters.date_from} to={teamFilters.date_to}
                                    onChange={({ from, to }) => setTeamFilters(f => ({ ...f, date_from: from, date_to: to }))} />
                            </SectionHeader>

                            {teamGroups.length === 0
                                ? <EmptyState text="Ekibinizde kayıt bulunmuyor." />
                                : (
                                    <div className="space-y-2">
                                        {teamGroups.map(group => (
                                            <GroupAccordion key={group.name} name={group.name} count={group.items.length}>
                                                {group.items.map(item => (
                                                    <TeamItemCard key={item._key} item={item} onCancel={item._type === 'assignment' ? handleCancelAssignment : null} onEdit={handleEditAssignment} />
                                                ))}
                                            </GroupAccordion>
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}
                </div>
            )}

            {/* ═══ MODALS ═══ */}
            <ClaimModal isOpen={claimModal.open} title={claimModal.title} subtitle={claimModal.subtitle}
                onClose={() => setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' })}
                onSubmit={handleClaim} loading={actionLoading}
                managers={managers} claimType={claimModal.type} />
            {isManager && (
                <CreateAssignmentModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)}
                    onSuccess={fetchData} teamMembers={teamMembers} />
            )}
            <EditAssignmentModal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, assignment: null })}
                onSuccess={fetchData}
                assignment={editModal.assignment}
            />
        </div>
    );
};

export default AssignedOvertimeTab;
