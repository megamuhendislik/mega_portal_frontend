import React, { useState, useEffect } from 'react';
import {
    ArrowUpRight, ArrowDownRight, X, LogIn, LogOut,
    ChevronDown, ChevronRight as ChevronRightIcon,
    CalendarCheck, AlertTriangle, Palmtree, HeartPulse, Hospital, Briefcase
} from 'lucide-react';
import { format, startOfDay, addHours } from 'date-fns';
import api from '../../services/api';
import ModalOverlay from '../../components/ui/ModalOverlay';
import WeeklyOtDetailDrawer from '../../components/WeeklyOtDetailDrawer';
import { getIstanbulNow, formatIstanbulTime } from '../../utils/dateUtils';

export const formatMinutes = (minutes) => {
    if (!minutes) return '0:00';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
};

/** Decimal saat → "H:MM" formatı (örn: 15.5 → "15:30") */
export const formatDecimalHours = (decimalHours) => {
    if (!decimalHours || decimalHours === 0) return '0:00';
    const abs = Math.abs(decimalHours);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = decimalHours < 0 ? '-' : '';
    return `${sign}${hours}:${String(mins).padStart(2, '0')}`;
};

const round2 = (v) => Math.round((v || 0) * 100) / 100;

const Dash = () => <span className="text-slate-200 select-none">—</span>;

/* ─────────────────────────────────────────────
   LeaveBadge — İzin etiketi + hover tooltip
   ───────────────────────────────────────────── */
const LEAVE_BADGE_CONFIG = {
    leave: {
        icon: Palmtree,
        bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200',
        tooltipBg: 'bg-orange-700', headerColor: 'text-orange-200',
    },
    health_report: {
        icon: HeartPulse,
        bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200',
        tooltipBg: 'bg-red-800', headerColor: 'text-red-200',
    },
    hospital_visit: {
        icon: Hospital,
        bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200',
        tooltipBg: 'bg-purple-800', headerColor: 'text-purple-200',
    },
    external_duty: {
        icon: Briefcase,
        bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200',
        tooltipBg: 'bg-violet-800', headerColor: 'text-violet-200',
    },
};

const formatLeaveDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
};

export const LeaveBadge = ({ leave, size = 'sm' }) => {
    if (!leave?.is_on_leave) return null;
    const configKey = leave.type === 'external_duty'
        ? 'external_duty'
        : leave.type === 'health_report' && leave.type_code === 'HOSPITAL_VISIT'
            ? 'hospital_visit'
            : leave.type === 'health_report' ? 'health_report' : 'leave';
    const cfg = LEAVE_BADGE_CONFIG[configKey];
    const Icon = cfg.icon;
    const isSmall = size === 'sm';

    return (
        <span className={`group/leave relative inline-flex items-center gap-1 ${isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'} rounded-full font-bold ${cfg.bg} ${cfg.text} border ${cfg.border} shrink-0 cursor-default`}>
            <Icon size={isSmall ? 11 : 13} />
            {leave.type_name}
            <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/leave:block w-64 p-3 ${cfg.tooltipBg} text-white text-[11px] font-medium rounded-lg shadow-xl z-50 pointer-events-none`}>
                <span className={`block font-bold ${cfg.headerColor} mb-1.5`}>{leave.type_name}</span>
                <span className="block">
                    Tarih: {formatLeaveDate(leave.start_date)}
                    {leave.start_date !== leave.end_date && ` – ${formatLeaveDate(leave.end_date)}`}
                </span>
                {leave.is_hourly && leave.start_time && leave.end_time && (
                    <span className="block mt-0.5">Saat: {leave.start_time} – {leave.end_time}</span>
                )}
                {leave.total_days > 0 && (
                    <span className="block mt-0.5">Süre: {leave.total_days} gün</span>
                )}
                {leave.reason && (
                    <span className="block mt-0.5">Neden: {leave.reason.length > 60 ? leave.reason.slice(0, 60) + '…' : leave.reason}</span>
                )}
                {leave.approved_by_name && (
                    <span className="block mt-1">Onaylayan: {leave.approved_by_name}</span>
                )}
                {leave.approved_at && (
                    <span className="block mt-0.5">Onay: {new Date(leave.approved_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                )}
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-current" />
            </span>
        </span>
    );
};

/* ─────────────────────────────────────────────
   EmployeeAttendanceRow
   ───────────────────────────────────────────── */
export const EmployeeAttendanceRow = ({
    s, name, id,
    depth = 0,
    isManager = false,
    nodeStats = null,
    isExpanded = false,
    onToggle = null,
    hierarchySort = false,
    onEmployeeClick,
}) => {

    return (
        <>
        <tr className={`transition-colors border-b border-slate-100/80 hover:bg-slate-50/60 ${isManager ? 'bg-slate-50/30' : ''}`}>
            {/* Personel */}
            <td className="py-3.5 pl-5 pr-3">
                <div className="flex items-center gap-3" style={hierarchySort ? { paddingLeft: `${depth * 24}px` } : undefined}>
                    {hierarchySort && isManager && onToggle && (
                        <button
                            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}
                            onClick={onToggle}
                        >
                            {isExpanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronRightIcon size={13} strokeWidth={2.5} />}
                        </button>
                    )}
                    <div className="relative shrink-0">
                        <div className={`rounded-full flex items-center justify-center font-bold border ${isManager ? 'w-9 h-9 text-xs bg-indigo-50 text-indigo-600 border-indigo-200' : 'w-8 h-8 text-[11px] bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {(name || '?').charAt(0)}
                        </div>
                        {s.is_online !== null && s.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className="font-semibold text-slate-800 text-sm truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => onEmployeeClick(id)}
                            >
                                {name}
                            </span>
                            {s.relationship_type === 'SECONDARY' && (
                                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-amber-100 text-amber-700">İkincil</span>
                            )}
                            {isManager && nodeStats && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 font-semibold shrink-0 tabular-nums">
                                    {nodeStats.count} kişi
                                </span>
                            )}
                            {s.today_ot_assignment?.has_assignment && (
                                <span className="group/ot relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 shrink-0 cursor-default">
                                    <CalendarCheck size={11} />
                                    Ek Mesai
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/ot:block w-56 p-2.5 bg-slate-800 text-white text-[11px] font-medium rounded-lg shadow-xl z-50 pointer-events-none">
                                        <span className="block font-bold text-orange-300 mb-1">Ek Mesai Ataması</span>
                                        {s.today_ot_assignment.assigned_by_name && (
                                            <span className="block">Atayan: {s.today_ot_assignment.assigned_by_name}</span>
                                        )}
                                        {s.today_ot_assignment.task_description && (
                                            <span className="block mt-0.5">Görev: {s.today_ot_assignment.task_description}</span>
                                        )}
                                        {s.today_ot_assignment.max_hours > 0 && (
                                            <span className="block mt-0.5">Maks: {formatDecimalHours(s.today_ot_assignment.max_hours)}</span>
                                        )}
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
                                    </span>
                                </span>
                            )}
                            {s.today_leave?.is_on_leave && (
                                <LeaveBadge leave={s.today_leave} />
                            )}
                            {s.today_duty?.is_on_duty && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                                    Şirket Dışı Çalışma
                                </span>
                            )}
                        </div>
                        {s.weekly_ot_limit_hours > 0 && (() => {
                            const used = round2(s.weekly_ot_used_seconds / 3600);
                            const limit = s.weekly_ot_limit_hours;
                            const remaining = round2(limit - used);
                            const ratio = used / (limit || 1);
                            const cls = ratio >= 1
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : ratio > 0.9
                                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                                    : ratio > 0.7
                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                            const label = ratio >= 1 ? 'LİMİT DOLDU' : ratio > 0.9 ? 'KRİTİK' : ratio > 0.7 ? 'DİKKAT' : '';
                            return used > 0 ? (
                                <span
                                    className={`inline-flex items-center gap-1 mt-0.5 text-[9px] px-1.5 py-0.5 rounded border ${cls}`}
                                    title={`Haftalık limit: ${formatDecimalHours(limit)}, Kullanılan: ${formatDecimalHours(used)}, Kalan: ${formatDecimalHours(remaining)}`}
                                >
                                    {ratio > 0.7 && <AlertTriangle size={10} />}
                                    Haftalık: {formatDecimalHours(used)}/{formatDecimalHours(limit)} {label && <b>&mdash; {label}</b>}
                                </span>
                            ) : null;
                        })()}
                    </div>
                </div>
            </td>

            {/* Durum */}
            <td className="py-3.5 px-3">
                {s.is_online !== null ? (
                    s.is_online ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ofiste
                        </span>
                    ) : (
                        <span className="text-[11px] text-slate-400">Dışarıda</span>
                    )
                ) : (
                    <span className="text-xs text-slate-300">—</span>
                )}
            </td>

            {/* Bugün: Normal */}
            <td className="py-3.5 px-3 text-center">
                <span className="text-xs font-semibold text-slate-700 tabular-nums">{s.today_normal !== null && s.today_normal !== undefined ? formatMinutes(s.today_normal) : '—'}</span>
            </td>

            {/* Bugün: F.Mesai (3 kategori) */}
            <td className="py-3.5 px-2 text-center">
                {(s.today_overtime || 0) > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                        {(s.today_ot_approved || 0) > 0 && <span className="text-[10px] font-bold text-emerald-600 tabular-nums">{formatMinutes(s.today_ot_approved)}</span>}
                        {(s.today_ot_pending || 0) > 0 && <span className="text-[10px] font-bold text-amber-500 tabular-nums">{formatMinutes(s.today_ot_pending)}</span>}
                        {(s.today_ot_potential || 0) > 0 && !(s.today_ot_pending || 0) && !(s.today_ot_approved || 0) && <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{formatMinutes(s.today_ot_potential)}</span>}
                        {!(s.today_ot_approved || s.today_ot_pending || s.today_ot_potential) && <span className="text-xs font-bold text-amber-600 tabular-nums">+{formatMinutes(s.today_overtime)}</span>}
                    </div>
                ) : <Dash />}
            </td>

            {/* Bugün: Mola */}
            <td className="py-3.5 px-3 text-center">
                {s.today_break !== null && s.today_break !== undefined
                    ? ((s.today_break || 0) > 0
                        ? <span className="text-xs text-slate-500 tabular-nums">{formatMinutes(s.today_break)}</span>
                        : <Dash />)
                    : <span className="text-xs text-slate-300">—</span>}
            </td>

            {/* Aylık: Çalışma */}
            <td className="py-3.5 px-3 text-center">
                <span className="text-xs font-semibold text-slate-600 tabular-nums">{s.total_worked !== null && s.total_worked !== undefined ? formatMinutes(s.total_worked || 0) : '—'}</span>
            </td>

            {/* Aylık: F.Mesai */}
            <td className="py-3.5 px-3 text-center">
                {(s.total_overtime || 0) > 0
                    ? <span className="text-xs font-bold text-amber-600 tabular-nums">+{formatMinutes(s.total_overtime)}</span>
                    : <Dash />}
            </td>

            {/* Aylık: Net Durum */}
            <td className="py-3.5 px-3 text-center">
                {s.monthly_deviation !== null && s.monthly_deviation !== undefined ? (() => {
                    const dev = s.monthly_deviation || 0;
                    const potentialOt = s.ot_potential_minutes || 0;
                    const devWithPotential = dev + potentialOt;

                    const renderNetBadge = (val, label) => {
                        if (val < 0) return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                <ArrowDownRight size={10} />
                                {formatMinutes(Math.abs(val))} Eksik
                            </span>
                        );
                        if (val > 0) return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                <ArrowUpRight size={10} />
                                {formatMinutes(val)} Fazla
                            </span>
                        );
                        return <span className="text-[10px] text-slate-400 font-medium">Dengede</span>;
                    };

                    return (
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Pot. Hariç</span>
                                {renderNetBadge(dev)}
                            </div>
                            {potentialOt > 0 && (
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Pot. Dahil</span>
                                    {renderNetBadge(devWithPotential)}
                                </div>
                            )}
                        </div>
                    );
                })() : (
                    <span className="text-xs text-slate-300">—</span>
                )}
            </td>

        </tr>

        </>
    );
};

/* ─────────────────────────────────────────────
   HierarchyGroupRow
   ───────────────────────────────────────────── */
export const HierarchyGroupRow = ({
    node,
    depth = 0,
    isExpanded = false,
    onToggle,
    nodeStats,
    elapsedWeeks = 1,
}) => {
    const memberCount = node.children ? node.children.length : 0;
    const cnt = nodeStats.count || 1;
    const weeks = elapsedWeeks || 1;
    const weeklyAvg = {
        worked: Math.round(nodeStats.total_worked / cnt / weeks),
        target: Math.round(nodeStats.past_target_minutes / cnt / weeks),
        missing: Math.round(nodeStats.total_missing / cnt / weeks),
        overtime: Math.round(nodeStats.total_overtime / cnt / weeks),
    };

    return (
        <tr className="border-b border-slate-200/80 bg-slate-50/60">
            <td className="py-2.5 pl-5 pr-3">
                <div
                    className="flex items-center gap-3 cursor-pointer select-none group"
                    onClick={onToggle}
                    style={{ paddingLeft: `${depth * 24}px` }}
                >
                    <span className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200/80 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                        {isExpanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronRightIcon size={13} strokeWidth={2.5} />}
                    </span>
                    <span className="font-bold text-[13px] text-slate-700">{node.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-500 font-semibold border border-slate-200 tabular-nums">
                        {memberCount} kişi
                    </span>
                </div>
            </td>
            <td className="py-2.5 px-3">
                {nodeStats.onlineCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {nodeStats.onlineCount}
                    </span>
                )}
            </td>
            <td colSpan={3} className="py-2.5 px-3 text-center" />
            <td className="py-2.5 px-3 text-center">
                {weeklyAvg.worked > 0 && (
                    <span className="text-[11px] tabular-nums">
                        <span className="text-slate-500 font-semibold">{formatMinutes(weeklyAvg.worked)}</span>
                        <span className="text-slate-300 mx-0.5">/</span>
                        <span className="text-slate-400">{formatMinutes(weeklyAvg.target)}</span>
                        <span className="text-[9px] text-slate-300 ml-0.5">/hft</span>
                    </span>
                )}
            </td>
            <td className="py-2.5 px-3 text-center">
                {weeklyAvg.overtime > 0 && <span className="text-[11px] text-amber-500 font-semibold tabular-nums">ort. {formatMinutes(weeklyAvg.overtime)}/hft</span>}
            </td>
            <td className="py-2.5 px-3 text-center">
                {weeklyAvg.missing > 0 ? (
                    <span className="text-[11px] text-red-400 font-semibold">ort. {formatMinutes(weeklyAvg.missing)}/hft eksik</span>
                ) : weeklyAvg.overtime > 0 ? (
                    <span className="text-[11px] text-emerald-400 font-semibold">ort. {formatMinutes(weeklyAvg.overtime)}/hft fazla</span>
                ) : null}
            </td>
        </tr>
    );
};

/* ─────────────────────────────────────────────
   EmployeeDetailModal
   ───────────────────────────────────────────── */
export const EmployeeDetailModal = ({ employee, onClose }) => {
    const [weeklyOtData, setWeeklyOtData] = useState(null);
    const [weeklyOtDrawerOpen, setWeeklyOtDrawerOpen] = useState(false);

    useEffect(() => {
        if (employee?.employee_id) {
            api.get(`/overtime-requests/weekly-ot-status/?employee_id=${employee.employee_id}`)
                .then(res => setWeeklyOtData(res.data))
                .catch(() => setWeeklyOtData(null));
        } else {
            setWeeklyOtData(null);
        }
    }, [employee?.employee_id]);

    if (!employee) return null;

    return (
        <>
        <ModalOverlay open={!!employee} onClose={onClose}>
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                            {(employee.employee_name || '?').charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800">{employee.employee_name}</h3>
                                {employee.relationship_type === 'SECONDARY' && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">İkincil</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{employee.department}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Stats — hidden for SECONDARY employees */}
                    {employee?.relationship_type !== 'SECONDARY' && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Normal', value: formatMinutes(employee.today_normal || 0), color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
                            { label: 'Eksik', value: `-${formatMinutes(employee.today_missing || 0)}`, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                            { label: 'Mola', value: formatMinutes(employee.today_break || 0), color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`${bg} border rounded-xl p-3 text-center`}>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                                <div className={`text-lg font-bold ${color} tabular-nums`}>{value}</div>
                            </div>
                        ))}
                    </div>
                    )}
                    {/* OT Breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Onaylı Mesai</div>
                            <div className="text-base font-bold text-emerald-700 tabular-nums">{formatMinutes(employee.today_ot_approved || 0)}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                            <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Bekleyen</div>
                            <div className="text-base font-bold text-amber-700 tabular-nums">{formatMinutes(employee.today_ot_pending || 0)}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                {(employee.today_ot_pending || 0) > 0 ? 'Talep Edildi' : 'Potansiyel'}
                            </div>
                            <div className="text-base font-bold text-slate-600 tabular-nums">
                                {(employee.today_ot_pending || 0) > 0 || (employee.today_ot_approved || 0) > 0
                                    ? '—'
                                    : formatMinutes(employee.today_ot_potential || 0)}
                            </div>
                        </div>
                    </div>

                    {/* Weekly OT Limit */}
                    {weeklyOtData && !weeklyOtData.is_unlimited && (
                        <div
                            className="p-3 rounded-xl border border-slate-100 bg-slate-50"
                            onClick={() => setWeeklyOtDrawerOpen(true)}
                            style={{ cursor: 'pointer' }}
                            title="Detay için tıklayın"
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Haftalık Ek Mesai (Pzt-Paz)</span>
                                <span className={`text-[10px] font-bold ${
                                    weeklyOtData.is_over_limit ? 'text-red-600' :
                                    (weeklyOtData.used_hours / (weeklyOtData.limit_hours || 1)) > 0.7 ? 'text-amber-600' :
                                    'text-emerald-600'
                                }`}>
                                    {formatDecimalHours(weeklyOtData.used_hours)}/{formatDecimalHours(weeklyOtData.limit_hours)}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        weeklyOtData.is_over_limit ? 'bg-red-500' :
                                        (weeklyOtData.used_hours / (weeklyOtData.limit_hours || 1)) > 0.7 ? 'bg-amber-400' :
                                        'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (weeklyOtData.used_hours / (weeklyOtData.limit_hours || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Timeline — hidden for SECONDARY employees */}
                    {employee?.relationship_type !== 'SECONDARY' && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Zaman Çizelgesi</h4>
                        <div className="relative w-full h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            {(() => {
                                if (!employee.today_check_in) return <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Giriş Yok</div>;

                                const startMin = 420;
                                const totalRange = 900;
                                const getMin = (iso) => {
                                    if (!iso) return null;
                                    const d = new Date(iso);
                                    return d.getHours() * 60 + d.getMinutes();
                                };
                                const inMin = getMin(employee.today_check_in);
                                const outMin = getMin(employee.today_check_out) || (employee.is_online ? (() => { const _n = getIstanbulNow(); return _n.getHours() * 60 + _n.getMinutes(); })() : inMin + 60);
                                const barStart = Math.max(0, ((inMin - startMin) / totalRange) * 100);
                                const barWidth = Math.min(100 - barStart, Math.max(1, ((outMin - inMin) / totalRange) * 100));

                                return (
                                    <>
                                        {[0, 25, 50, 75, 100].map(p => (
                                            <div key={p} className="absolute top-0 bottom-0 border-l border-slate-200/60" style={{ left: `${p}%` }}>
                                                <span className="absolute top-0.5 left-1 text-[9px] text-slate-400 tabular-nums">
                                                    {format(addHours(startOfDay(new Date()), 7 + (p / 100) * 15), 'HH:mm')}
                                                </span>
                                            </div>
                                        ))}
                                        <div
                                            className={`absolute top-3 bottom-3 rounded flex items-center justify-center px-3 text-[10px] font-bold text-white whitespace-nowrap ${employee.is_online ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                            style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                                        >
                                            {formatIstanbulTime(employee.today_check_in)} – {employee.today_check_out ? formatIstanbulTime(employee.today_check_out) : 'Şimdi'}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    )}

                    {/* Giriş / Çıkış — hidden for SECONDARY employees */}
                    {employee?.relationship_type !== 'SECONDARY' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <LogIn size={15} />
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Giriş</div>
                                <div className="text-sm font-bold text-slate-700 tabular-nums">
                                    {employee.today_check_in ? new Date(employee.today_check_in).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' }) : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <LogOut size={15} />
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Çıkış</div>
                                <div className="text-sm font-bold text-slate-700 tabular-nums">
                                    {employee.today_check_out
                                        ? new Date(employee.today_check_out).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' })
                                        : employee.is_online
                                            ? <span className="text-emerald-500">Devam ediyor</span>
                                            : '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </ModalOverlay>

        <WeeklyOtDetailDrawer
            open={weeklyOtDrawerOpen}
            onClose={() => setWeeklyOtDrawerOpen(false)}
            employeeId={employee?.employee_id}
            employeeName={employee?.employee_name}
        />
        </>
    );
};
