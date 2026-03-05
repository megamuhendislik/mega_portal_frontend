import React, { useState } from 'react';
import { Drawer } from 'antd';
import api from '../../../services/api';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ChevronDownIcon,
    ChevronRightIcon,
    ClockIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Constants & Helpers — CardDiagnostics
// ---------------------------------------------------------------------------
const FLAG_LABELS = {
    NO_ATTENDANCE: { label: 'Kart var → Attendance yok', color: 'bg-red-100 text-red-700 border-red-200' },
    NO_GATE_EVENT: { label: 'Attendance var → Kart yok', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    MANUAL_ENTRY: { label: 'Manuel giriş', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

function getFlagInfo(flag) {
    if (FLAG_LABELS[flag]) return FLAG_LABELS[flag];
    if (flag.startsWith('TIME_DIFF_')) {
        const sec = flag.replace('TIME_DIFF_', '').replace('s', '');
        return { label: `Saat farkı: ${sec}sn`, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
    if (flag.startsWith('GATE_ISSUES_')) {
        const cnt = flag.replace('GATE_ISSUES_', '');
        return { label: `${cnt} sorunlu kart olayı`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: flag, color: 'bg-gray-100 text-gray-600 border-gray-200' };
}

function fmtSec(s) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}sa ${m}dk`;
}

// ---------------------------------------------------------------------------
// Constants & Helpers — AttendanceForensic
// ---------------------------------------------------------------------------
const SEVERITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const SEVERITY_DOT = {
    critical: 'bg-red-500',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    success: 'bg-emerald-400',
    info: 'bg-blue-400',
};

const TYPE_LABELS = {
    ATTENDANCE_CREATED: 'Kayıt Oluşturma',
    ATTENDANCE_UPDATED: 'Kayıt Güncelleme',
    GATE_EVENT: 'Kart Okuyucu',
    SERVICE_LOG: 'Servis Log',
    REQUEST_LEAVE: 'İzin Talebi',
    REQUEST_CARDLESS: 'Kartsız Giriş',
};

function formatSeconds(s) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(Math.abs(s) / 3600);
    const m = Math.floor((Math.abs(s) % 3600) / 60);
    return `${s < 0 ? '-' : ''}${h}sa ${m}dk`;
}

function formatTime(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return isoStr;
    }
}

// ---------------------------------------------------------------------------
// Constants & Helpers — DataInspection
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Sub-components — CollapsibleSection
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Sub-components — Data Tables (from DataInspectionTab)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Forensic Attendance Table (with delete buttons)
// ---------------------------------------------------------------------------
function ForensicAttendanceTable({ records, deleteLoading, onDelete }) {
    if (!records?.length) return <p className="text-xs text-gray-400 italic">Kayıt yok</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Tarih</th>
                        <th className="p-2 text-left">Durum</th>
                        <th className="p-2 text-left">Kaynak</th>
                        <th className="p-2 text-left">Giriş</th>
                        <th className="p-2 text-left">Çıkış</th>
                        <th className="p-2 text-right">Normal</th>
                        <th className="p-2 text-right">Mesai</th>
                        <th className="p-2 text-right">Eksik</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {records.map(att => (
                        <tr key={att.id} className={`hover:bg-gray-50 ${att.source === 'SYSTEM' ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-2 font-mono font-bold">#{att.id}</td>
                            <td className="p-2 font-mono">{att.work_date}</td>
                            <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    att.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                    att.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                    att.status === 'AUTO_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>{att.status}</span>
                            </td>
                            <td className="p-2">
                                <span className={`font-bold ${att.source === 'SYSTEM' ? 'text-amber-600' : att.source === 'CARD' ? 'text-emerald-600' : 'text-gray-600'}`}>
                                    {att.source}
                                </span>
                            </td>
                            <td className="p-2 font-mono">{att.check_in ? formatTime(att.check_in) : '-'}</td>
                            <td className="p-2 font-mono">{att.check_out ? formatTime(att.check_out) : '-'}</td>
                            <td className="p-2 text-right font-mono">{formatSeconds(att.normal_seconds)}</td>
                            <td className="p-2 text-right font-mono">{formatSeconds(att.overtime_seconds)}</td>
                            <td className="p-2 text-right font-mono text-red-600">{formatSeconds(att.missing_seconds)}</td>
                            <td className="p-2 text-right font-mono font-bold">{formatSeconds(att.total_seconds)}</td>
                            <td className="p-2">
                                <button
                                    onClick={() => onDelete(att.id)}
                                    disabled={deleteLoading === att.id}
                                    className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded hover:bg-red-200 disabled:opacity-50"
                                >
                                    {deleteLoading === att.id ? '...' : 'Sil'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function UnifiedRecordCheckTab() {
    const today = getIstanbulToday();
    const weekAgo = getIstanbulDateOffset(-7);

    // List state
    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(today);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [forensicData, setForensicData] = useState(null);
    const [inspectionData, setInspectionData] = useState(null);
    const [expandedTimeline, setExpandedTimeline] = useState({});
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [drawerTab, setDrawerTab] = useState('overview');

    // -----------------------------------------------------------------------
    // Fetch list (card diagnostics)
    // -----------------------------------------------------------------------
    const fetchList = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(
                `/system/health-check/card-diagnostics/?start_date=${startDate}&end_date=${endDate}`,
                { timeout: 120000 }
            );
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Veri yüklenirken hata oluştu');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Open detail drawer
    // -----------------------------------------------------------------------
    const openDetail = async (row) => {
        setSelectedEmp(row);
        setDrawerOpen(true);
        setDetailLoading(true);
        setForensicData(null);
        setInspectionData(null);
        setExpandedTimeline({});
        setDrawerTab('overview');

        const empId = row.employee?.id;

        try {
            const [forensicRes, inspectionRes] = await Promise.allSettled([
                api.get('/system/health-check/attendance-forensic/', {
                    params: { employee_id: empId, start_date: startDate, end_date: endDate },
                    timeout: 60000,
                }),
                api.get('/system/health-check/data-inspection/', {
                    params: { employee_id: empId, start_date: startDate, end_date: endDate },
                    timeout: 60000,
                }),
            ]);

            if (forensicRes.status === 'fulfilled') {
                setForensicData(forensicRes.value.data);
            }
            if (inspectionRes.status === 'fulfilled') {
                const insData = inspectionRes.value.data;
                // inspection returns {employees: [{...}]} — extract the single employee
                const emp = insData.employees?.[0] || insData;
                setInspectionData(emp);
            }
        } catch {
            // silently fail, partial data is ok
        } finally {
            setDetailLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Delete attendance record
    // -----------------------------------------------------------------------
    const handleDelete = async (attId) => {
        if (!window.confirm(`Attendance #${attId} kaydı kalıcı olarak silinecek. Emin misiniz?`)) return;
        setDeleteLoading(attId);
        try {
            await api.post('/system/health-check/delete-attendance-record/', { attendance_id: attId });
            // Refresh detail data
            if (selectedEmp) {
                openDetail(selectedEmp);
            }
        } catch (err) {
            alert('Silme hatası: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeleteLoading(null);
        }
    };

    // -----------------------------------------------------------------------
    // Close drawer
    // -----------------------------------------------------------------------
    const closeDrawer = () => {
        setDrawerOpen(false);
        setSelectedEmp(null);
        setForensicData(null);
        setInspectionData(null);
        setExpandedTimeline({});
        setDrawerTab('overview');
        setDeleteLoading(null);
    };

    // -----------------------------------------------------------------------
    // Toggle timeline item
    // -----------------------------------------------------------------------
    const toggleTimeline = (idx) => {
        setExpandedTimeline(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // -----------------------------------------------------------------------
    // Filtered results
    // -----------------------------------------------------------------------
    const filtered = data?.results?.filter(r => {
        if (filter === 'mismatch' && r.flags.length === 0) return false;
        if (filter === 'clean' && r.flags.length > 0) return false;
        if (search) {
            const s = search.toLowerCase();
            return (
                r.employee.name.toLowerCase().includes(s) ||
                r.employee.employee_code.toLowerCase().includes(s) ||
                r.employee.department.toLowerCase().includes(s)
            );
        }
        return true;
    }) || [];

    // Drawer tab helper counts
    const anomalyCount = forensicData?.anomalies?.length || 0;
    const timelineCount = forensicData?.timeline?.length || 0;
    const attCount = inspectionData?.attendance?.length || forensicData?.attendance_records?.length || 0;
    const gateCount = inspectionData?.gate_events?.length || 0;
    const otCount = inspectionData?.overtime_requests?.length || 0;
    const assignCount = inspectionData?.overtime_assignments?.length || 0;
    const leaveCount = inspectionData?.leave_requests?.length || 0;
    const mealCount = inspectionData?.meal_requests?.length || 0;
    const cardlessCount = inspectionData?.cardless_requests?.length || 0;

    // -----------------------------------------------------------------------
    // Drawer tab definitions
    // -----------------------------------------------------------------------
    const drawerTabs = [
        { id: 'overview', label: 'Genel' },
        { id: 'anomalies', label: `Anomaliler (${anomalyCount})` },
        { id: 'timeline', label: `Zaman Çizelgesi` },
        { id: 'attendance', label: `Devam (${attCount})` },
        { id: 'gates', label: `Geçiş (${gateCount})` },
        { id: 'overtime', label: `Ek Mesai (${otCount})` },
        { id: 'assignments', label: `Atamalar (${assignCount})` },
        { id: 'leave', label: `İzin (${leaveCount})` },
        { id: 'meal', label: `Yemek (${mealCount})` },
        { id: 'cardless', label: `Kartsız (${cardlessCount})` },
        { id: 'monthly', label: 'Aylık Özet' },
    ];

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="space-y-6">
            {/* 1. HEADER */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Birleşik Kayıt Kontrolü</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Kart hareketleri, devam kayıtları ve tüm talepleri karşılaştırın. Çalışanı seçerek detaylı inceleme yapın.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>
                    <button
                        onClick={fetchList}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Taranıyor...' : 'Tara'}
                    </button>
                </div>
            </div>

            {/* 2. ERROR */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
            )}

            {data && (
                <>
                    {/* 3. KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Çalışan', value: data.summary.total_employees, color: 'text-gray-800' },
                            { label: 'Kart Olayı', value: data.summary.total_gate_events, color: 'text-blue-600' },
                            { label: 'Giriş (IN)', value: data.summary.gate_in_count, color: 'text-emerald-600' },
                            { label: 'Çıkış (OUT)', value: data.summary.gate_out_count, color: 'text-rose-600' },
                            { label: 'Attendance', value: data.summary.total_attendance_records, color: 'text-indigo-600' },
                            { label: 'Uyuşmazlık', value: data.summary.mismatch_count, color: data.summary.mismatch_count > 0 ? 'text-red-600' : 'text-green-600' },
                            { label: 'Tarih Aralığı', value: `${data.summary.day_count || 1} gün`, color: 'text-gray-500', isText: true },
                        ].map((c, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</div>
                                <div className={`text-xl font-bold ${c.color}`}>
                                    {c.isText ? c.value : (c.value ?? 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 4. FILTER BAR */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            {[
                                { id: 'all', label: `Tümü (${data.results.length})` },
                                { id: 'mismatch', label: `Uyuşmazlık (${data.summary.mismatch_count})` },
                                { id: 'clean', label: `Temiz (${data.results.length - data.summary.mismatch_count})` },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                        filter === f.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="İsim, sicil no veya departman ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <span className="text-xs text-gray-400">{filtered.length} sonuç</span>
                    </div>

                    {/* 5. EMPLOYEE LIST */}
                    <div className="space-y-3">
                        {filtered.map((row, idx) => (
                            <div
                                key={idx}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                                    row.flags.length > 0 ? 'border-amber-300' : 'border-gray-200'
                                }`}
                            >
                                <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {row.employee.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">{row.employee.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">{row.employee.employee_code}</span>
                                            {row.employee.department && (
                                                <span className="text-gray-400 text-xs ml-2">{row.employee.department}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {row.flags.map((f, fi) => {
                                            const info = getFlagInfo(f);
                                            return (
                                                <span key={fi} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${info.color}`}>
                                                    {info.label}
                                                </span>
                                            );
                                        })}
                                        {row.flags.length === 0 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                Uyumlu
                                            </span>
                                        )}
                                        {row.flag_details && Object.keys(row.flag_details).length > 1 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200">
                                                {Object.keys(row.flag_details).length} gün detayı
                                            </span>
                                        )}
                                        <button
                                            onClick={() => openDetail(row)}
                                            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition"
                                        >
                                            Detay &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && data.results.length > 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Filtreye uyan sonuç bulunamadı</div>
                        )}
                        {data.results.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Bu tarih aralığı için kayıt bulunamadı</div>
                        )}
                    </div>
                </>
            )}

            {/* 6. DETAIL DRAWER */}
            <Drawer
                title={selectedEmp?.employee?.name ? `${selectedEmp.employee.name} — Detay` : 'Detay'}
                open={drawerOpen}
                onClose={closeDrawer}
                width={780}
                destroyOnClose
            >
                {detailLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <span className="text-sm text-gray-500">Veriler yükleniyor...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Drawer tab buttons */}
                        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
                            {drawerTabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setDrawerTab(t.id)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                        drawerTab === t.id
                                            ? 'bg-white text-blue-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* ============ OVERVIEW TAB ============ */}
                        {drawerTab === 'overview' && (
                            <div className="space-y-4">
                                {/* Employee Info + Day Rules */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {forensicData?.employee && (
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3">Personel Bilgisi</h3>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between"><span className="text-gray-500">Ad</span><span className="font-bold">{forensicData.employee.name}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Sicil</span><span className="font-mono">{forensicData.employee.employee_code || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Superuser</span>
                                                    <span className={`font-bold ${forensicData.employee.is_superuser ? 'text-red-600' : 'text-gray-600'}`}>
                                                        {forensicData.employee.is_superuser ? 'EVET' : 'Hayır'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between"><span className="text-gray-500">Departman</span><span>{forensicData.employee.department || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">FiscalCalendar</span><span>{forensicData.employee.fiscal_calendar?.name || 'YOK'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">WorkSchedule</span><span>{forensicData.employee.work_schedule?.name || 'YOK'}</span></div>
                                            </div>
                                        </div>
                                    )}

                                    {forensicData?.day_rules && (
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3">Vardiya Kuralları ({forensicData.day_rules?.date || '-'})</h3>
                                            {forensicData.day_rules?.error ? (
                                                <div className="text-red-500 text-xs">{forensicData.day_rules.error}</div>
                                            ) : (
                                                <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between"><span className="text-gray-500">Vardiya</span><span className="font-mono font-bold">{forensicData.day_rules.shift_start} — {forensicData.day_rules.shift_end}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Yemek</span><span className="font-mono">{forensicData.day_rules.lunch_start} — {forensicData.day_rules.lunch_end}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Tatil Günü</span>
                                                        <span className={forensicData.day_rules.is_off_day ? 'font-bold text-emerald-600' : ''}>{forensicData.day_rules.is_off_day ? 'EVET' : 'Hayır'}</span>
                                                    </div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Mola Hakkı</span><span>{forensicData.day_rules.daily_break_allowance} dk</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Kaynak</span><span className="font-mono text-indigo-600">{forensicData.day_rules.source}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Forensic Counts */}
                                {forensicData?.counts && (
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { label: 'Attendance', count: forensicData.counts.attendance, color: 'indigo' },
                                            { label: 'Gate Events', count: forensicData.counts.gate_events, color: 'emerald' },
                                            { label: 'Servis Logları', count: forensicData.counts.service_logs, color: 'blue' },
                                            { label: 'Talepler', count: forensicData.counts.related_requests, color: 'violet' },
                                            { label: 'Anomaliler', count: forensicData.counts.anomalies, color: forensicData.counts.anomalies > 0 ? 'red' : 'gray' },
                                        ].map(c => {
                                            const borderMap = { indigo: 'border-indigo-100', emerald: 'border-emerald-100', blue: 'border-blue-100', violet: 'border-violet-100', red: 'border-red-100', gray: 'border-gray-100' };
                                            const textMap = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', blue: 'text-blue-600', violet: 'text-violet-600', red: 'text-red-600', gray: 'text-gray-600' };
                                            return (
                                                <div key={c.label} className={`bg-white rounded-xl border p-4 text-center ${borderMap[c.color] || 'border-gray-100'}`}>
                                                    <div className={`text-2xl font-black ${textMap[c.color] || 'text-gray-600'}`}>{c.count}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {!forensicData && !inspectionData && (
                                    <div className="text-center py-8 text-gray-400 text-sm">Detay verisi yüklenemedi.</div>
                                )}
                            </div>
                        )}

                        {/* ============ ANOMALIES TAB ============ */}
                        {drawerTab === 'anomalies' && (
                            <div className="space-y-3">
                                {anomalyCount === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">Anomali tespit edilmedi.</div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                            <h3 className="text-sm font-bold text-red-800">
                                                {anomalyCount} Anomali Tespit Edildi
                                            </h3>
                                        </div>
                                        {forensicData.anomalies.map((a, i) => (
                                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.warning}`}>
                                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_DOT[a.severity]}`}></span>
                                                <div className="flex-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{a.type}</span>
                                                    <p className="text-xs font-medium mt-0.5">{a.message}</p>
                                                </div>
                                                {a.attendance_id && (
                                                    <button
                                                        onClick={() => handleDelete(a.attendance_id)}
                                                        disabled={deleteLoading === a.attendance_id}
                                                        className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex-shrink-0"
                                                    >
                                                        {deleteLoading === a.attendance_id ? '...' : 'Sil'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ============ TIMELINE TAB ============ */}
                        {drawerTab === 'timeline' && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Kronolojik Zaman Çizelgesi</h3>
                                {!forensicData?.timeline?.length ? (
                                    <div className="text-center text-gray-400 py-8 text-sm">Bu dönemde zaman çizelgesi kaydı bulunamadı.</div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                                        <div className="space-y-1">
                                            {forensicData.timeline.map((event, idx) => (
                                                <div key={idx} className="relative pl-10">
                                                    <div className={`absolute left-3 top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${SEVERITY_DOT[event.severity] || 'bg-gray-300'}`}></div>
                                                    <button
                                                        onClick={() => toggleTimeline(idx)}
                                                        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${SEVERITY_COLORS[event.severity] || 'bg-gray-50 border-gray-200'}`}
                                                    >
                                                        <div className="flex items-center gap-2 justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 flex-shrink-0">
                                                                    {TYPE_LABELS[event.type] || event.type}
                                                                </span>
                                                                <span className="text-xs font-medium truncate">{event.summary}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">{formatTime(event.time)}</span>
                                                        </div>
                                                    </button>
                                                    {expandedTimeline[idx] && event.details && (
                                                        <div className="ml-2 mt-1 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-[11px] font-mono overflow-auto max-h-48">
                                                            <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ============ ATTENDANCE TAB ============ */}
                        {drawerTab === 'attendance' && (
                            <div className="space-y-4">
                                {/* Forensic detailed attendance with delete */}
                                {forensicData?.attendance_records?.length > 0 && (
                                    <CollapsibleSection
                                        title="Detaylı Attendance Kayıtları (Forensic)"
                                        count={forensicData.attendance_records.length}
                                        icon={ClockIcon}
                                        defaultOpen={true}
                                    >
                                        <ForensicAttendanceTable
                                            records={forensicData.attendance_records}
                                            deleteLoading={deleteLoading}
                                            onDelete={handleDelete}
                                        />
                                    </CollapsibleSection>
                                )}
                                {/* Inspection summary attendance */}
                                {inspectionData?.attendance?.length > 0 && (
                                    <CollapsibleSection
                                        title="Özet Devam Kayıtları"
                                        count={inspectionData.attendance.length}
                                        icon={ClockIcon}
                                        defaultOpen={!forensicData?.attendance_records?.length}
                                    >
                                        <AttendanceTable records={inspectionData.attendance} />
                                    </CollapsibleSection>
                                )}
                                {!forensicData?.attendance_records?.length && !inspectionData?.attendance?.length && (
                                    <p className="text-xs text-gray-400 italic text-center py-8">Devam kaydı bulunamadı.</p>
                                )}
                            </div>
                        )}

                        {/* ============ GATES TAB ============ */}
                        {drawerTab === 'gates' && (
                            <CollapsibleSection
                                title="Kapı Geçiş Kayıtları (Gate Events)"
                                count={gateCount}
                                icon={ClockIcon}
                                defaultOpen={true}
                            >
                                <GateEventsTable records={inspectionData?.gate_events} />
                            </CollapsibleSection>
                        )}

                        {/* ============ OVERTIME TAB ============ */}
                        {drawerTab === 'overtime' && (
                            <CollapsibleSection
                                title="Ek Mesai Talepleri"
                                count={otCount}
                                icon={DocumentTextIcon}
                                defaultOpen={true}
                            >
                                <OvertimeTable records={inspectionData?.overtime_requests} />
                            </CollapsibleSection>
                        )}

                        {/* ============ ASSIGNMENTS TAB ============ */}
                        {drawerTab === 'assignments' && (
                            <CollapsibleSection
                                title="Mesai Atamaları"
                                count={assignCount}
                                icon={DocumentTextIcon}
                                defaultOpen={true}
                            >
                                <AssignmentsTable records={inspectionData?.overtime_assignments} />
                            </CollapsibleSection>
                        )}

                        {/* ============ LEAVE TAB ============ */}
                        {drawerTab === 'leave' && (
                            <CollapsibleSection
                                title="İzin Talepleri"
                                count={leaveCount}
                                icon={DocumentTextIcon}
                                defaultOpen={true}
                            >
                                <LeaveTable records={inspectionData?.leave_requests} />
                            </CollapsibleSection>
                        )}

                        {/* ============ MEAL TAB ============ */}
                        {drawerTab === 'meal' && (
                            <CollapsibleSection
                                title="Yemek Talepleri"
                                count={mealCount}
                                icon={DocumentTextIcon}
                                defaultOpen={true}
                            >
                                <MealTable records={inspectionData?.meal_requests} />
                            </CollapsibleSection>
                        )}

                        {/* ============ CARDLESS TAB ============ */}
                        {drawerTab === 'cardless' && (
                            <CollapsibleSection
                                title="Kartsız Giriş Talepleri"
                                count={cardlessCount}
                                icon={DocumentTextIcon}
                                defaultOpen={true}
                            >
                                <CardlessTable records={inspectionData?.cardless_requests} />
                            </CollapsibleSection>
                        )}

                        {/* ============ MONTHLY SUMMARY TAB ============ */}
                        {drawerTab === 'monthly' && (
                            <CollapsibleSection
                                title="Aylık Özet (Bu Yıl)"
                                count={inspectionData?.monthly_summaries?.length || 0}
                                icon={ClockIcon}
                                defaultOpen={true}
                            >
                                <MonthlySummaryTable records={inspectionData?.monthly_summaries} />
                            </CollapsibleSection>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
