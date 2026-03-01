import React, { useState, useCallback } from 'react';
import api from '../../../services/api';
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    UserCircleIcon,
    ClockIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
    OPEN: 'bg-blue-100 text-blue-700',
    CALCULATED: 'bg-cyan-100 text-cyan-700',
    PENDING_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    AUTO_APPROVED: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    POTENTIAL: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    CLAIMED: 'bg-indigo-100 text-indigo-700',
    EXPIRED: 'bg-gray-100 text-gray-400',
};

function StatusBadge({ status }) {
    const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

function formatH(val) {
    if (val === null || val === undefined) return '-';
    return val.toFixed(1);
}

function CollapsibleSection({ title, count, icon: Icon, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                    <span className="font-medium text-sm text-gray-700">{title}</span>
                    <span className="text-xs text-gray-400">({count})</span>
                </div>
                {open ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
            </button>
            {open && <div className="p-3">{children}</div>}
        </div>
    );
}

function AttendanceTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-left">Giriş</th>
                        <th className="px-2 py-1 text-left">Çıkış</th>
                        <th className="px-2 py-1 text-left">Kaynak</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                        <th className="px-2 py-1 text-right">Toplam</th>
                        <th className="px-2 py-1 text-right">Normal</th>
                        <th className="px-2 py-1 text-right">Mesai(O)</th>
                        <th className="px-2 py-1 text-right">Mesai(H)</th>
                        <th className="px-2 py-1 text-right">Eksik</th>
                        <th className="px-2 py-1 text-right">Mola</th>
                        <th className="px-2 py-1 text-right">P.Mola</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.work_date}</td>
                            <td className="px-2 py-1 font-mono">{r.check_in ? r.check_in.split(' ')[1] : <span className="text-red-400">-</span>}</td>
                            <td className="px-2 py-1 font-mono">{r.check_out ? r.check_out.split(' ')[1] : <span className="text-red-400">-</span>}</td>
                            <td className="px-2 py-1">{r.source}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                            <td className="px-2 py-1 text-right font-mono">{formatH(r.total_h)}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatH(r.normal_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-green-600">{formatH(r.ot_approved_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-orange-500">{formatH(r.ot_calculated_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-red-500">{formatH(r.missing_h)}</td>
                            <td className="px-2 py-1 text-right">{r.break_min}dk</td>
                            <td className="px-2 py-1 text-right">{r.potential_break_min}dk</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GateEventsTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Zaman</th>
                        <th className="px-2 py-1 text-left">Yön</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                        <th className="px-2 py-1 text-left">Event ID</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.event_time}</td>
                            <td className="px-2 py-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${r.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {r.direction}
                                </span>
                            </td>
                            <td className="px-2 py-1">{r.status || '-'}</td>
                            <td className="px-2 py-1 font-mono text-gray-400">{r.event_id || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function OvertimeTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-left">Başlangıç</th>
                        <th className="px-2 py-1 text-left">Bitiş</th>
                        <th className="px-2 py-1 text-right">Saat</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                        <th className="px-2 py-1 text-left">Kaynak</th>
                        <th className="px-2 py-1 text-left">Sebep</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.date}</td>
                            <td className="px-2 py-1 font-mono">{r.start_time || '-'}</td>
                            <td className="px-2 py-1 font-mono">{r.end_time || '-'}</td>
                            <td className="px-2 py-1 text-right font-mono">{r.hours}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                            <td className="px-2 py-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    r.source === 'INTENDED' ? 'bg-blue-100 text-blue-700' :
                                    r.source === 'POTENTIAL' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-100 text-orange-700'
                                }`}>{r.source}</span>
                            </td>
                            <td className="px-2 py-1 text-gray-500 truncate max-w-[200px]">{r.reason || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AssignmentsTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-right">Maks Saat</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                        <th className="px-2 py-1 text-left">Atayan</th>
                        <th className="px-2 py-1 text-left">Açıklama</th>
                        <th className="px-2 py-1 text-center">Talep</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.date}</td>
                            <td className="px-2 py-1 text-right font-mono">{r.max_hours}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                            <td className="px-2 py-1">{r.assigned_by}</td>
                            <td className="px-2 py-1 text-gray-500 truncate max-w-[200px]">{r.task_description || '-'}</td>
                            <td className="px-2 py-1 text-center">{r.has_claim ? '✓' : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function LeaveTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tür</th>
                        <th className="px-2 py-1 text-left">Kategori</th>
                        <th className="px-2 py-1 text-left">Başlangıç</th>
                        <th className="px-2 py-1 text-left">Bitiş</th>
                        <th className="px-2 py-1 text-right">Gün</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1">{r.type}</td>
                            <td className="px-2 py-1 text-gray-500">{r.category}</td>
                            <td className="px-2 py-1 font-mono">{r.start_date}</td>
                            <td className="px-2 py-1 font-mono">{r.end_date}</td>
                            <td className="px-2 py-1 text-right">{r.total_days}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MealTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-left">Tür</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.date}</td>
                            <td className="px-2 py-1">{r.meal_type}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CardlessTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-left">Giriş</th>
                        <th className="px-2 py-1 text-left">Çıkış</th>
                        <th className="px-2 py-1 text-left">Durum</th>
                        <th className="px-2 py-1 text-left">Sebep</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-mono">{r.date}</td>
                            <td className="px-2 py-1 font-mono">{r.check_in_time || '-'}</td>
                            <td className="px-2 py-1 font-mono">{r.check_out_time || '-'}</td>
                            <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                            <td className="px-2 py-1 text-gray-500 truncate max-w-[200px]">{r.reason || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MonthlySummaryTable({ records }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500">
                        <th className="px-2 py-1 text-left">Ay</th>
                        <th className="px-2 py-1 text-right">Hedef</th>
                        <th className="px-2 py-1 text-right">Tamamlanan</th>
                        <th className="px-2 py-1 text-right">Mesai</th>
                        <th className="px-2 py-1 text-right">Eksik</th>
                        <th className="px-2 py-1 text-right">Toplam</th>
                        <th className="px-2 py-1 text-right">Bakiye</th>
                        <th className="px-2 py-1 text-right">Kümülatif</th>
                        <th className="px-2 py-1 text-right">İzin</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => (
                        <tr key={`${r.year}-${r.month}`} className="border-t border-gray-100 hover:bg-blue-50/30">
                            <td className="px-2 py-1 font-medium">{months[r.month]} {r.year}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatH(r.target_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-green-600">{formatH(r.completed_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-blue-600">{formatH(r.overtime_h)}</td>
                            <td className="px-2 py-1 text-right font-mono text-red-500">{formatH(r.missing_h)}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatH(r.total_work_h)}</td>
                            <td className={`px-2 py-1 text-right font-mono ${r.net_balance_h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {r.net_balance_h >= 0 ? '+' : ''}{formatH(r.net_balance_h)}
                            </td>
                            <td className={`px-2 py-1 text-right font-mono ${r.cumulative_h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {r.cumulative_h >= 0 ? '+' : ''}{formatH(r.cumulative_h)}
                            </td>
                            <td className="px-2 py-1 text-right">{r.leave_days}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function EmployeeCard({ emp }) {
    const [expanded, setExpanded] = useState(false);
    const totalRecords = (emp.attendance_count || 0) + (emp.overtime_request_count || 0) +
        (emp.leave_request_count || 0) + (emp.meal_request_count || 0) +
        (emp.cardless_request_count || 0) + (emp.overtime_assignment_count || 0) +
        (emp.gate_event_count || 0);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition"
            >
                <div className="flex items-center gap-3">
                    <UserCircleIcon className="w-8 h-8 text-gray-300" />
                    <div className="text-left">
                        <div className="font-medium text-sm text-gray-800">{emp.name}</div>
                        <div className="text-xs text-gray-500">
                            {emp.employee_code} | {emp.department} | {emp.job_position}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs">
                        {emp.attendance_count > 0 && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{emp.attendance_count} devam</span>}
                        {emp.gate_event_count > 0 && <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-600 rounded">{emp.gate_event_count} geçiş</span>}
                        {emp.overtime_request_count > 0 && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{emp.overtime_request_count} mesai</span>}
                        {emp.overtime_assignment_count > 0 && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{emp.overtime_assignment_count} atama</span>}
                        {emp.leave_request_count > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{emp.leave_request_count} izin</span>}
                        {emp.meal_request_count > 0 && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">{emp.meal_request_count} yemek</span>}
                        {emp.cardless_request_count > 0 && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{emp.cardless_request_count} kartsız</span>}
                        {totalRecords === 0 && <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded">Kayıt yok</span>}
                    </div>
                    {expanded ? <ChevronDownIcon className="w-5 h-5 text-gray-400" /> : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="p-4 bg-gray-50/50 space-y-3 border-t border-gray-100">
                    {/* Meta bilgiler */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                        <span>İşe Giriş: <b>{emp.hired_date || '-'}</b></span>
                        <span>Mali Takvim: <b>{emp.fiscal_calendar || '-'}</b></span>
                        <span>Aktif: <b>{emp.is_active ? 'Evet' : 'Hayır'}</b></span>
                    </div>

                    <CollapsibleSection title="Devam Kayıtları (Attendance)" count={emp.attendance_count} icon={ClockIcon} defaultOpen={true}>
                        <AttendanceTable records={emp.attendance} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Kapı Geçiş Kayıtları (Gate Events)" count={emp.gate_event_count} icon={ClockIcon}>
                        <GateEventsTable records={emp.gate_events} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Ek Mesai Talepleri" count={emp.overtime_request_count} icon={DocumentTextIcon}>
                        <OvertimeTable records={emp.overtime_requests} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Mesai Atamaları" count={emp.overtime_assignment_count} icon={DocumentTextIcon}>
                        <AssignmentsTable records={emp.overtime_assignments} />
                    </CollapsibleSection>

                    <CollapsibleSection title="İzin Talepleri" count={emp.leave_request_count} icon={DocumentTextIcon}>
                        <LeaveTable records={emp.leave_requests} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Yemek Talepleri" count={emp.meal_request_count} icon={DocumentTextIcon}>
                        <MealTable records={emp.meal_requests} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Kartsız Giriş Talepleri" count={emp.cardless_request_count} icon={DocumentTextIcon}>
                        <CardlessTable records={emp.cardless_requests} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Aylık Özet (Bu Yıl)" count={emp.monthly_summaries?.length || 0} icon={ClockIcon}>
                        <MonthlySummaryTable records={emp.monthly_summaries} />
                    </CollapsibleSection>
                </div>
            )}
        </div>
    );
}

function PaginationControls({ pagination, onPageChange, loading }) {
    if (!pagination || pagination.total_pages <= 1) return null;
    const { page, total_pages, total_employees, page_size } = pagination;
    const start = (page - 1) * page_size + 1;
    const end = Math.min(page * page_size, total_employees);

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(total_pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs text-gray-500">
                {start}–{end} / {total_employees} çalışan (Sayfa {page}/{total_pages})
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1 || loading}
                    className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    ««
                </button>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    «
                </button>
                {startPage > 1 && <span className="text-xs text-gray-400 px-1">...</span>}
                {pages.map(p => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        disabled={loading}
                        className={`px-2.5 py-1 text-xs rounded border ${
                            p === page
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-200 hover:bg-gray-50'
                        } disabled:cursor-not-allowed`}
                    >
                        {p}
                    </button>
                ))}
                {endPage < total_pages && <span className="text-xs text-gray-400 px-1">...</span>}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === total_pages || loading}
                    className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    »
                </button>
                <button
                    onClick={() => onPageChange(total_pages)}
                    disabled={page === total_pages || loading}
                    className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    »»
                </button>
            </div>
        </div>
    );
}

export default function DataInspectionTab() {
    const [data, setData] = useState(null);
    const [globalStats, setGlobalStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(30);
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [searchText, setSearchText] = useState('');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchPage = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = { days, page, page_size: 10 };
            if (employeeFilter) params.employee_id = employeeFilter;
            if (includeInactive) params.include_inactive = 'true';
            const res = await api.get('/system/health-check/data-inspection/', { params });
            setData(res.data);
            setCurrentPage(page);
            // Global stats sadece ilk sayfada gelir
            if (res.data.global_stats) {
                setGlobalStats(res.data.global_stats);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [days, employeeFilter, includeInactive]);

    const handleScan = useCallback(() => {
        setGlobalStats(null);
        setCurrentPage(1);
        fetchPage(1);
    }, [fetchPage]);

    const handlePageChange = useCallback((page) => {
        fetchPage(page);
    }, [fetchPage]);

    const filteredEmployees = data?.employees?.filter(emp => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return emp.name.toLowerCase().includes(q) ||
            (emp.employee_code || '').toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q);
    }) || [];

    return (
        <div className="space-y-4">
            {/* Header & Controls */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <MagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                            Kapsamlı Veri İnceleme
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Tüm çalışanların devam kayıtları, giriş/çıkış saatleri, ek mesai talepleri, izinler ve tüm veritabanı kayıtlarını inceleyin.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 ml-auto">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Son N gün</label>
                            <select
                                value={days}
                                onChange={e => setDays(Number(e.target.value))}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                            >
                                <option value={7}>7 gün</option>
                                <option value={14}>14 gün</option>
                                <option value={30}>30 gün</option>
                                <option value={60}>60 gün</option>
                                <option value={90}>90 gün</option>
                                <option value={180}>180 gün</option>
                                <option value={365}>365 gün</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Çalışan ID</label>
                            <input
                                type="text"
                                value={employeeFilter}
                                onChange={e => setEmployeeFilter(e.target.value)}
                                placeholder="Boş = Tümü"
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeInactive}
                                onChange={e => setIncludeInactive(e.target.checked)}
                                className="rounded"
                            />
                            Pasifler dahil
                        </label>
                        <button
                            onClick={handleScan}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                            {loading ? 'Taranıyor...' : 'Tara'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            {data && (
                <>
                    {/* Global Stats */}
                    {globalStats && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Genel İstatistikler ({data.date_range?.from} → {data.date_range?.to})</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                                {[
                                    { label: 'Çalışan', value: data.total_employees_scanned, color: 'indigo' },
                                    { label: 'Devam', value: globalStats.total_attendance_records, color: 'blue' },
                                    { label: 'Geçiş', value: globalStats.total_gate_events, color: 'cyan' },
                                    { label: 'Ek Mesai', value: globalStats.total_ot_requests, color: 'orange' },
                                    { label: 'İzin', value: globalStats.total_leave_requests, color: 'green' },
                                    { label: 'Yemek', value: globalStats.total_meal_requests, color: 'yellow' },
                                    { label: 'Kartsız', value: globalStats.total_cardless_requests, color: 'purple' },
                                ].map(s => {
                                    const diBgMap = { blue: 'bg-blue-50', cyan: 'bg-cyan-50', orange: 'bg-orange-50', green: 'bg-green-50', yellow: 'bg-yellow-50', purple: 'bg-purple-50' };
                                    const diTextMap = { blue: 'text-blue-700', cyan: 'text-cyan-700', orange: 'text-orange-700', green: 'text-green-700', yellow: 'text-yellow-700', purple: 'text-purple-700' };
                                    const diSubMap = { blue: 'text-blue-600', cyan: 'text-cyan-600', orange: 'text-orange-600', green: 'text-green-600', yellow: 'text-yellow-600', purple: 'text-purple-600' };
                                    return (
                                    <div key={s.label} className={`${diBgMap[s.color] || 'bg-gray-50'} rounded-lg p-3 text-center`}>
                                        <div className={`text-2xl font-bold ${diTextMap[s.color] || 'text-gray-700'}`}>{s.value || 0}</div>
                                        <div className={`text-xs ${diSubMap[s.color] || 'text-gray-600'}`}>{s.label}</div>
                                    </div>
                                );})}
                            </div>

                            {globalStats.ot_status_distribution && Object.keys(globalStats.ot_status_distribution).length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="text-xs text-gray-500">EK Mesai Durumları:</span>
                                    {Object.entries(globalStats.ot_status_distribution).map(([status, count]) => (
                                        <span key={status} className="flex items-center gap-1">
                                            <StatusBadge status={status} />
                                            <span className="text-xs text-gray-600 font-mono">{count}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination top */}
                    <PaginationControls pagination={data.pagination} onPageChange={handlePageChange} loading={loading} />

                    {/* Search */}
                    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder="Çalışan ara (isim, sicil no, departman)..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                            {filteredEmployees.length} / {data.employees?.length || 0} çalışan gösteriliyor
                            {data.pagination && ` (Sayfa ${data.pagination.page}/${data.pagination.total_pages})`}
                        </div>
                    </div>

                    {/* Employee Cards */}
                    <div className="space-y-2">
                        {filteredEmployees.map(emp => (
                            <EmployeeCard key={emp.id} emp={emp} />
                        ))}
                    </div>

                    {/* Pagination bottom */}
                    <PaginationControls pagination={data.pagination} onPageChange={handlePageChange} loading={loading} />
                </>
            )}

            {!data && !loading && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Taramayı başlatmak için "Tara" butonuna tıklayın.</p>
                    <p className="text-xs text-gray-400 mt-1">Tüm çalışanların devam kayıtları, giriş/çıkış saatleri ve talepleri listelenecektir.</p>
                </div>
            )}
        </div>
    );
}
