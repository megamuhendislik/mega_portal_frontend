import React, { useState } from 'react';
import {
    Clock, Activity, Loader2, CheckCircle, AlertCircle, Send,
    ArrowUpRight, ArrowDownRight, X, LogIn, LogOut,
    ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import moment from 'moment';
import api from '../../services/api';

export const formatMinutes = (minutes) => {
    if (!minutes) return '0s 0dk';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    return `${hours}s ${mins}dk`;
};

/* ─────────────────────────────────────────────
   EmployeeAttendanceRow
   ───────────────────────────────────────────── */
export const EmployeeAttendanceRow = ({
    s, name, title, id,
    depth = 0,
    isManager = false,
    nodeStats = null,
    isExpanded = false,
    onToggle = null,
    hierarchySort = false,
    onEmployeeClick,
    onDetailClick,
}) => {
    const [showOtForm, setShowOtForm] = useState(false);
    const [otDate, setOtDate] = useState(moment().format('YYYY-MM-DD'));
    const [otStart, setOtStart] = useState('18:00');
    const [otEnd, setOtEnd] = useState('20:00');
    const [otReason, setOtReason] = useState('');
    const [otLoading, setOtLoading] = useState(false);
    const [otSuccess, setOtSuccess] = useState(false);
    const [otError, setOtError] = useState('');

    const handleCreateOvertime = async () => {
        if (!otDate || !otStart || !otEnd) {
            setOtError('Tarih ve saat alanları zorunludur.');
            return;
        }
        setOtLoading(true);
        setOtError('');
        try {
            await api.post('/overtime-requests/create-for-employee/', {
                employee_id: s.employee_id,
                date: otDate,
                start_time: otStart,
                end_time: otEnd,
                reason: otReason || 'Yönetici tarafından oluşturuldu'
            });
            setOtSuccess(true);
            setTimeout(() => {
                setShowOtForm(false);
                setOtSuccess(false);
                setOtDate(moment().format('YYYY-MM-DD'));
                setOtStart('18:00');
                setOtEnd('20:00');
                setOtReason('');
            }, 1500);
        } catch (err) {
            setOtError(err.response?.data?.error || 'Talep oluşturulamadı.');
        } finally {
            setOtLoading(false);
        }
    };

    const Dash = () => <span className="text-slate-200 select-none">—</span>;

    return (
        <>
        <tr className={`transition-colors border-b border-slate-100/80 ${showOtForm ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'} ${isManager ? 'bg-slate-50/30' : ''}`}>
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
                        {s.is_online && (
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
                            {isManager && nodeStats && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 font-semibold shrink-0 tabular-nums">
                                    {nodeStats.count} kişi
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block">{title}</span>
                    </div>
                </div>
            </td>

            {/* Durum */}
            <td className="py-3.5 px-3">
                {s.is_online ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ofiste
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-400">Dışarıda</span>
                )}
            </td>

            {/* Bugün: Normal */}
            <td className="py-3.5 px-3 text-center">
                <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatMinutes(s.today_normal)}</span>
            </td>

            {/* Bugün: F.Mesai */}
            <td className="py-3.5 px-3 text-center">
                {(s.today_overtime || 0) > 0
                    ? <span className="text-xs font-bold text-amber-600 tabular-nums">+{formatMinutes(s.today_overtime)}</span>
                    : <Dash />}
            </td>

            {/* Bugün: Mola */}
            <td className="py-3.5 px-3 text-center">
                {(s.today_break || 0) > 0
                    ? <span className="text-xs text-slate-500 tabular-nums">{formatMinutes(s.today_break)}</span>
                    : <Dash />}
            </td>

            {/* Aylık: Çalışma */}
            <td className="py-3.5 px-3 text-center">
                <span className="text-xs font-semibold text-slate-600 tabular-nums">{formatMinutes(s.total_worked || 0)}</span>
            </td>

            {/* Aylık: F.Mesai */}
            <td className="py-3.5 px-3 text-center">
                {(s.total_overtime || 0) > 0
                    ? <span className="text-xs font-bold text-amber-600 tabular-nums">+{formatMinutes(s.total_overtime)}</span>
                    : <Dash />}
            </td>

            {/* Aylık: Net Durum */}
            <td className="py-3.5 px-3 text-center">
                {(() => {
                    const missing = s.total_missing || 0;
                    const overtime = s.total_overtime || 0;
                    if (missing > 0) {
                        return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                <ArrowDownRight size={10} />
                                {formatMinutes(missing)} Eksik
                            </span>
                        );
                    }
                    if (overtime > 0) {
                        return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                <ArrowUpRight size={10} />
                                {formatMinutes(overtime)} Fazla
                            </span>
                        );
                    }
                    return <Dash />;
                })()}
            </td>

            {/* İşlemler */}
            <td className="py-3.5 px-4">
                <div className="flex items-center justify-end gap-2">
                    <button
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                            showOtForm
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80'
                        }`}
                        onClick={() => setShowOtForm(!showOtForm)}
                    >
                        <Clock size={12} />
                        Ek Mesai İsteği
                    </button>
                    <button
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        onClick={() => onDetailClick(s)}
                        title="Günlük Detay"
                    >
                        <Activity size={15} />
                    </button>
                </div>
            </td>
        </tr>

        {/* ── Ek Mesai İsteği Formu ── */}
        {showOtForm && (
            <tr className="border-b border-amber-200/50">
                <td colSpan={9} className="p-0">
                    <div className="mx-4 my-3 rounded-xl bg-white border border-amber-200/70 shadow-sm overflow-hidden">
                        {otSuccess ? (
                            <div className="flex items-center gap-2.5 text-emerald-600 font-semibold py-5 justify-center text-sm">
                                <CheckCircle size={20} />
                                Ek mesai isteği başarıyla oluşturuldu!
                            </div>
                        ) : (
                            <div className="p-4">
                                {/* Başlık */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Clock size={14} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">Ek Mesai İsteği Oluştur</h4>
                                            <p className="text-[11px] text-slate-400">{name} için ek mesai talebi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowOtForm(false); setOtError(''); }}
                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-[1fr_auto_auto_2fr_auto] gap-3 items-end">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tarih</label>
                                        <input
                                            type="date"
                                            value={otDate}
                                            min={moment().format('YYYY-MM-DD')}
                                            onChange={e => setOtDate(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-slate-50/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Başlangıç</label>
                                        <input
                                            type="time"
                                            value={otStart}
                                            onChange={e => setOtStart(e.target.value)}
                                            className="w-[7rem] h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-slate-50/50 tabular-nums"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bitiş</label>
                                        <input
                                            type="time"
                                            value={otEnd}
                                            onChange={e => setOtEnd(e.target.value)}
                                            className="w-[7rem] h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-slate-50/50 tabular-nums"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gerekçe <span className="normal-case text-slate-400">(opsiyonel)</span></label>
                                        <input
                                            type="text"
                                            value={otReason}
                                            onChange={e => setOtReason(e.target.value)}
                                            placeholder="Ek mesai gerekçesini yazın..."
                                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-slate-50/50 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateOvertime}
                                        disabled={otLoading}
                                        className="h-9 inline-flex items-center gap-2 px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        {otLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {otLoading ? 'Gönderiliyor...' : 'Gönder'}
                                    </button>
                                </div>

                                {/* Hata */}
                                {otError && (
                                    <div className="flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-100 mt-3">
                                        <AlertCircle size={13} className="shrink-0" />
                                        {otError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        )}
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
}) => {
    const memberCount = node.children ? node.children.length : 0;
    const cnt = nodeStats.count || 1;
    const avg = {
        total_worked: Math.round(nodeStats.total_worked / cnt),
        total_overtime: Math.round(nodeStats.total_overtime / cnt),
        total_missing: Math.round(nodeStats.total_missing / cnt),
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
                {avg.total_worked > 0 && <span className="text-[11px] text-slate-400 tabular-nums">ort. {formatMinutes(avg.total_worked)}</span>}
            </td>
            <td className="py-2.5 px-3 text-center">
                {avg.total_overtime > 0 && <span className="text-[11px] text-amber-500 font-semibold tabular-nums">+{formatMinutes(avg.total_overtime)}</span>}
            </td>
            <td className="py-2.5 px-3 text-center">
                {avg.total_missing > 0 ? (
                    <span className="text-[11px] text-red-400 font-semibold">{formatMinutes(avg.total_missing)} eksik</span>
                ) : avg.total_overtime > 0 ? (
                    <span className="text-[11px] text-emerald-400 font-semibold">{formatMinutes(avg.total_overtime)} fazla</span>
                ) : null}
            </td>
            <td className="py-2.5 px-3" />
        </tr>
    );
};

/* ─────────────────────────────────────────────
   EmployeeDetailModal
   ───────────────────────────────────────────── */
export const EmployeeDetailModal = ({ employee, onClose }) => {
    if (!employee) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                            {(employee.employee_name || '?').charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">{employee.employee_name}</h3>
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
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Normal', value: formatMinutes(employee.today_normal || 0), color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
                            { label: 'Ek Mesai', value: `+${formatMinutes(employee.today_overtime || 0)}`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                            { label: 'Eksik', value: `-${formatMinutes(employee.today_missing || 0)}`, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                            { label: 'Mola', value: formatMinutes(employee.today_break || 0), color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`${bg} border rounded-xl p-3 text-center`}>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                                <div className={`text-lg font-bold ${color} tabular-nums`}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Zaman Çizelgesi</h4>
                        <div className="relative w-full h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            {(() => {
                                if (!employee.today_check_in) return <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Giriş Yok</div>;

                                const startMin = 420;
                                const totalRange = 900;
                                const getMin = (iso) => {
                                    if (!iso) return null;
                                    const d = moment(iso);
                                    return d.hours() * 60 + d.minutes();
                                };
                                const inMin = getMin(employee.today_check_in);
                                const outMin = getMin(employee.today_check_out) || (employee.is_online ? moment().hours() * 60 + moment().minutes() : inMin + 60);
                                const barStart = Math.max(0, ((inMin - startMin) / totalRange) * 100);
                                const barWidth = Math.min(100 - barStart, Math.max(1, ((outMin - inMin) / totalRange) * 100));

                                return (
                                    <>
                                        {[0, 25, 50, 75, 100].map(p => (
                                            <div key={p} className="absolute top-0 bottom-0 border-l border-slate-200/60" style={{ left: `${p}%` }}>
                                                <span className="absolute top-0.5 left-1 text-[9px] text-slate-400 tabular-nums">
                                                    {moment().startOf('day').add(7 + (p / 100) * 15, 'hours').format('HH:mm')}
                                                </span>
                                            </div>
                                        ))}
                                        <div
                                            className={`absolute top-3 bottom-3 rounded flex items-center justify-center px-3 text-[10px] font-bold text-white whitespace-nowrap ${employee.is_online ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                            style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                                        >
                                            {moment(employee.today_check_in).format('HH:mm')} – {employee.today_check_out ? moment(employee.today_check_out).format('HH:mm') : 'Şimdi'}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Giriş / Çıkış */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <LogIn size={15} />
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Giriş</div>
                                <div className="text-sm font-bold text-slate-700 tabular-nums">
                                    {employee.today_check_in ? moment(employee.today_check_in).format('HH:mm:ss') : '—'}
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
                                        ? moment(employee.today_check_out).format('HH:mm:ss')
                                        : employee.is_online
                                            ? <span className="text-emerald-500">Devam ediyor</span>
                                            : '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
