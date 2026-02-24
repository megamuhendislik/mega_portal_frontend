import React, { useState } from 'react';
import {
    Clock, Activity, Plus, Loader2, CheckCircle,
    ArrowUpRight, ArrowDownRight, X, LogIn, LogOut,
    ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import moment from 'moment';
import api from '../../services/api';

/**
 * Formats a number of minutes into Turkish hours+minutes string.
 * e.g. 135 -> "2s 15dk"
 */
export const formatMinutes = (minutes) => {
    if (!minutes) return '0s 0dk';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    return `${hours}s ${mins}dk`;
};

/**
 * EmployeeAttendanceRow
 *
 * Renders a single <tr> for an employee in the attendance table.
 *
 * Props:
 *   s              - Stats object for the employee (today_normal, today_overtime, etc.)
 *   name           - Employee display name
 *   title          - Job title / department label shown below name
 *   id             - Employee ID (used for key and click handler)
 *   depth          - Hierarchy indentation depth (default 0)
 *   isManager      - Whether this employee has subordinates
 *   nodeStats      - Aggregated stats for subordinates (shown as badge)
 *   isExpanded     - Whether the subordinate tree is expanded
 *   onToggle       - Callback to toggle expand/collapse
 *   hierarchySort  - Whether hierarchy mode is active (controls indentation)
 *   onEmployeeClick - Callback when employee name is clicked (navigates)
 *   onDetailClick   - Callback when the detail (Activity) button is clicked
 */
export const EmployeeAttendanceRow = ({
    s,
    name,
    title,
    id,
    depth = 0,
    isManager = false,
    nodeStats = null,
    isExpanded = false,
    onToggle = null,
    hierarchySort = false,
    onEmployeeClick,
    onDetailClick,
}) => {
    return (
        <tr className={`hover:bg-slate-50/80 transition-all group border-b border-slate-50 ${isManager ? 'bg-slate-50/50' : ''}`}>
            {/* Personel */}
            <td className="py-3 pl-6 pr-3">
                <div className="flex items-center gap-3" style={hierarchySort ? { paddingLeft: `${depth * 20}px` } : undefined}>
                    {hierarchySort && isManager && onToggle && (
                        <div className="cursor-pointer p-1 rounded-md transition-colors bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500" onClick={onToggle}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                        </div>
                    )}
                    <div className="relative shrink-0">
                        <div className={`rounded-full flex items-center justify-center text-xs font-bold border shadow-sm ${isManager ? 'w-9 h-9 bg-indigo-50 text-indigo-600 border-indigo-100' : 'w-8 h-8 bg-white text-slate-600 border-slate-100'}`}>
                            {(name || '?').charAt(0)}
                        </div>
                        {s.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></span>
                        )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-sm truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors" onClick={() => onEmployeeClick(id)}>{name}</span>
                            {isManager && nodeStats && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 font-semibold shrink-0">{nodeStats.count} Kişi</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium truncate">{title}</span>
                    </div>
                </div>
            </td>
            {/* Durum */}
            <td className="py-3 px-3">
                {s.is_online ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Ofiste</span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400">Dışarıda</span>
                )}
            </td>
            {/* Normal */}
            <td className="py-3 px-3 text-center">
                <span className="text-xs font-bold text-slate-700 font-mono">{formatMinutes(s.today_normal)}</span>
            </td>
            {/* F.Mesai */}
            <td className="py-3 px-3 text-center">
                {(s.today_overtime || 0) > 0 ? (
                    <span className="text-xs font-bold text-amber-600 font-mono">+{formatMinutes(s.today_overtime)}</span>
                ) : <span className="text-slate-300">-</span>}
            </td>
            {/* Mola */}
            <td className="py-3 px-3 text-center">
                {(s.today_break || 0) > 0 ? (
                    <span className="text-xs font-medium text-slate-500 font-mono">{formatMinutes(s.today_break)}</span>
                ) : <span className="text-slate-300">-</span>}
            </td>
            {/* AYLIK: Çalışma */}
            <td className="py-3 px-3 text-center">
                <span className="text-xs font-semibold text-slate-600 font-mono">{formatMinutes(s.total_worked || 0)}</span>
            </td>
            {/* AYLIK: F.Mesai */}
            <td className="py-3 px-3 text-center">
                {(s.total_overtime || 0) > 0 ? (
                    <span className="text-xs font-bold text-amber-600 font-mono">+{formatMinutes(s.total_overtime)}</span>
                ) : <span className="text-slate-300">-</span>}
            </td>
            {/* AYLIK: Net Durum */}
            <td className="py-3 px-3 text-center">
                {(() => {
                    const missing = s.total_missing || 0;
                    const overtime = s.total_overtime || 0;
                    if (missing > 0) {
                        return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                <ArrowDownRight size={11} />
                                {formatMinutes(missing)} Eksik
                            </span>
                        );
                    }
                    if (overtime > 0) {
                        return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                <ArrowUpRight size={11} />
                                {formatMinutes(overtime)} Fazla
                            </span>
                        );
                    }
                    return <span className="text-slate-300 text-xs">{'\u2014'}</span>;
                })()}
            </td>
            {/* Actions */}
            <td className="py-3 px-3 text-center">
                <button className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-md transition-colors" onClick={() => onDetailClick(s)}>
                    <Activity size={14} />
                </button>
            </td>
        </tr>
    );
};

/**
 * HierarchyGroupRow
 *
 * Renders a <tr> for a role/department group header in hierarchy mode.
 *
 * Props:
 *   node       - The GROUP node from hierarchy data
 *   depth      - Indentation depth
 *   isExpanded - Whether the group's children are visible
 *   onToggle   - Callback to toggle expand/collapse
 *   nodeStats  - Aggregated stats for all members in the group
 */
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
        <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
            <td className="p-3 pl-6">
                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onToggle} style={{ paddingLeft: `${depth * 20}px` }}>
                    <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                    </div>
                    <span className="font-bold text-sm text-slate-700">{node.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">{memberCount} Kişi</span>
                </div>
            </td>
            <td className="p-3">
                {nodeStats.onlineCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {nodeStats.onlineCount} Ofiste
                    </span>
                )}
            </td>
            <td colSpan={3} className="p-3 text-center"></td>
            <td className="p-3 text-center">
                {avg.total_worked > 0 && <span className="text-xs font-mono font-semibold text-slate-500">ort. {formatMinutes(avg.total_worked)}</span>}
            </td>
            <td className="p-3 text-center">
                {avg.total_overtime > 0 && <span className="text-xs font-mono font-semibold text-amber-500">ort. +{formatMinutes(avg.total_overtime)}</span>}
            </td>
            <td className="p-3 text-center">
                {avg.total_missing > 0 ? (
                    <span className="text-xs font-semibold text-red-400">ort. {formatMinutes(avg.total_missing)} Eksik</span>
                ) : avg.total_overtime > 0 ? (
                    <span className="text-xs font-semibold text-emerald-400">ort. {formatMinutes(avg.total_overtime)} Fazla</span>
                ) : <span className="text-slate-300">{'\u2014'}</span>}
            </td>
            <td className="p-3"></td>
        </tr>
    );
};

/**
 * EmployeeDetailModal
 *
 * Full-screen overlay modal showing daily attendance details for a selected employee,
 * including stats grid, timeline visualization, and check-in/check-out times.
 *
 * Props:
 *   employee - The selected employee stats object (null/undefined to hide)
 *   onClose  - Callback to dismiss the modal
 */
export const EmployeeDetailModal = ({ employee, onClose }) => {
    const [showOtForm, setShowOtForm] = useState(false);
    const [otDate, setOtDate] = useState(moment().format('YYYY-MM-DD'));
    const [otStart, setOtStart] = useState('18:00');
    const [otEnd, setOtEnd] = useState('20:00');
    const [otReason, setOtReason] = useState('');
    const [otLoading, setOtLoading] = useState(false);
    const [otSuccess, setOtSuccess] = useState(false);
    const [otError, setOtError] = useState('');

    if (!employee) return null;

    const handleCreateOvertime = async () => {
        if (!otDate || !otStart || !otEnd) {
            setOtError('Tarih ve saat alanları zorunludur.');
            return;
        }
        setOtLoading(true);
        setOtError('');
        try {
            await api.post('/overtime-requests/create-for-employee/', {
                employee_id: employee.employee_id,
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                            {(employee.employee_name || '?').charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{employee.employee_name}</h3>
                            <p className="text-sm text-slate-500 font-medium">{employee.department}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Daily Details */}
                <div className="p-6 space-y-6">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Normal</div>
                            <div className="text-2xl font-bold text-blue-700">{formatMinutes(employee.today_normal || 0)}</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Fazla</div>
                            <div className="text-2xl font-bold text-amber-700">+{formatMinutes(employee.today_overtime || 0)}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Eksik</div>
                            <div className="text-2xl font-bold text-red-700">-{formatMinutes(employee.today_missing || 0)}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mola</div>
                            <div className="text-2xl font-bold text-slate-700">{formatMinutes(employee.today_break || 0)}</div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            Zaman Çizelgesi
                        </h4>
                        <div className="relative w-full h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                            {(() => {
                                if (!employee.today_check_in) return <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">Giriş Yok</div>;

                                const startMin = 420; // 07:00
                                const totalRange = 900; // 15 hours
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
                                        {[0, 20, 40, 60, 80, 100].map(p => (
                                            <div key={p} className="absolute top-0 bottom-0 border-l border-slate-200/50" style={{ left: `${p}%` }}>
                                                <span className="absolute top-1 left-1 text-[10px] text-slate-400 font-mono">
                                                    {moment().startOf('day').add(7 + (p / 100) * 15, 'hours').format('HH:mm')}
                                                </span>
                                            </div>
                                        ))}
                                        <div
                                            className={`absolute top-4 bottom-4 rounded-md shadow-sm flex items-center justify-center px-4 text-xs font-bold text-white whitespace-nowrap transition-all duration-500 ${employee.is_online ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-slate-400'}`}
                                            style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                                        >
                                            {moment(employee.today_check_in).format('HH:mm')} - {employee.today_check_out ? moment(employee.today_check_out).format('HH:mm') : 'Şimdi'}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Additional Details (Times) */}
                    <div className="flex items-center justify-between text-sm p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><LogIn size={16} /></div>
                            <div>
                                <div className="text-xs text-slate-400 font-semibold">Giriş Saati</div>
                                <div className="font-bold text-slate-700 font-mono">{employee.today_check_in ? moment(employee.today_check_in).format('HH:mm:ss') : '-'}</div>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <div className="text-xs text-slate-400 font-semibold">Çıkış Saati</div>
                                <div className="font-bold text-slate-700 font-mono">{employee.today_check_out ? moment(employee.today_check_out).format('HH:mm:ss') : (employee.is_online ? <span className="text-emerald-500 animate-pulse">Ofiste</span> : '-')}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><LogOut size={16} /></div>
                        </div>
                    </div>

                    {/* Fazla Mesai Oluştur */}
                    {!showOtForm ? (
                        <button
                            onClick={() => setShowOtForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl border border-amber-200 transition-colors"
                        >
                            <Plus size={18} />
                            Fazla Mesai Talebi Oluştur
                        </button>
                    ) : (
                        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                <Clock size={16} />
                                Fazla Mesai Talebi — {employee.employee_name}
                            </h4>

                            {otSuccess ? (
                                <div className="flex items-center gap-2 text-emerald-600 font-semibold py-4 justify-center">
                                    <CheckCircle size={20} />
                                    Talep başarıyla oluşturuldu!
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tarih</label>
                                            <input
                                                type="date"
                                                value={otDate}
                                                onChange={e => setOtDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Başlangıç</label>
                                            <input
                                                type="time"
                                                value={otStart}
                                                onChange={e => setOtStart(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Bitiş</label>
                                            <input
                                                type="time"
                                                value={otEnd}
                                                onChange={e => setOtEnd(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Gerekçe (opsiyonel)</label>
                                        <input
                                            type="text"
                                            value={otReason}
                                            onChange={e => setOtReason(e.target.value)}
                                            placeholder="Fazla mesai gerekçesi..."
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                                        />
                                    </div>
                                    {otError && (
                                        <p className="text-xs text-red-600 font-medium">{otError}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateOvertime}
                                            disabled={otLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-lg transition-colors text-sm"
                                        >
                                            {otLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            {otLoading ? 'Oluşturuluyor...' : 'Talebi Oluştur'}
                                        </button>
                                        <button
                                            onClick={() => { setShowOtForm(false); setOtError(''); }}
                                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Vazgeç
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
