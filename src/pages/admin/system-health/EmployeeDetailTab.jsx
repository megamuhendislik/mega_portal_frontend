import React, { useState, useEffect, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    UserIcon,
    ClockIcon,
    CreditCardIcon,
    DocumentTextIcon,
    CalendarDaysIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';

// Saniye → "Xsa Ydk" (yuvarlama yok, truncate)
function fmtS(s) {
    if (s === null || s === undefined) return '-';
    s = Math.round(s); // sadece saniye hassasiyetinde
    const neg = s < 0;
    const abs = Math.abs(s);
    const hours = Math.floor(abs / 3600);
    const mins = Math.floor((abs % 3600) / 60);
    const sign = neg ? '-' : '';
    if (hours > 0 && mins > 0) return `${sign}${hours}sa ${mins}dk`;
    if (hours > 0) return `${sign}${hours}sa`;
    if (mins > 0) return `${sign}${mins}dk`;
    return '0dk';
}

function fmtTime(dt) {
    if (!dt) return '-';
    return dt.length > 11 ? dt.substring(11, 16) : dt.substring(0, 5);
}

const STATUS_COLORS = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    POTENTIAL: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    OPEN: 'bg-cyan-100 text-cyan-700',
    CALCULATED: 'bg-indigo-100 text-indigo-700',
    AUTO_APPROVED: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
};

const SRC_COLORS = {
    CARD: 'bg-blue-100 text-blue-700',
    SPLIT: 'bg-orange-100 text-orange-700',
    AUTO_SPLIT: 'bg-amber-100 text-amber-700',
    DUTY: 'bg-green-100 text-green-700',
    MANUAL: 'bg-purple-100 text-purple-700',
    MANUAL_OT: 'bg-pink-100 text-pink-700',
    HEALTH_REPORT: 'bg-rose-100 text-rose-700',
    HOSPITAL_VISIT: 'bg-red-100 text-red-700',
    SYSTEM: 'bg-slate-100 text-slate-700',
    SPECIAL_LEAVE: 'bg-teal-100 text-teal-700',
};

export default function EmployeeDetailTab() {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [startDate, setStartDate] = useState(getIstanbulDateOffset(-30));
    const [endDate, setEndDate] = useState(getIstanbulToday());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState(new Set(['attendance', 'monthly']));

    // Load employees for dropdown
    useEffect(() => {
        api.get('/employees/', { params: { page_size: 500 } })
            .then(res => {
                const list = (res.data.results || res.data || [])
                    .filter(e => e.is_active !== false)
                    .map(e => ({ id: e.id, name: e.full_name || `${e.first_name} ${e.last_name}`, dept: e.department_name || '-' }))
                    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                setEmployees(list);
            })
            .catch(() => {});
    }, []);

    const filtered = searchTerm.length > 0
        ? employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(e.id) === searchTerm)
        : employees;

    const fetchData = useCallback(async () => {
        if (!selectedEmp) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await api.get('/system/health-check/data-inspection/', {
                params: {
                    employee_id: selectedEmp.id,
                    start_date: startDate,
                    end_date: endDate,
                    page_size: 1,
                },
                timeout: 60000,
            });
            const empData = res.data.employees?.[0];
            if (!empData) {
                setError('Calisan verisi bulunamadi.');
                return;
            }
            setData({ ...empData, date_range: res.data.date_range });
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setLoading(false);
        }
    }, [selectedEmp, startDate, endDate]);

    const toggleSection = (key) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const selectEmployee = (emp) => {
        setSelectedEmp(emp);
        setSearchTerm(emp.name);
        setShowDropdown(false);
    };

    // Group attendance by date
    const attendanceByDate = {};
    if (data?.attendance) {
        for (const att of data.attendance) {
            if (!attendanceByDate[att.work_date]) attendanceByDate[att.work_date] = [];
            attendanceByDate[att.work_date].push(att);
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <UserIcon className="w-6 h-6 text-indigo-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Calisan Detay Goruntuleyici</h3>
                    <p className="text-xs text-gray-500">
                        Secilen calisanin tum kart girisleri, devam kayitlari, talepleri ve aylik hesaplarini tek ekranda goruntule.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                {/* Employee Search */}
                <div className="relative flex-1 min-w-[220px]">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Calisan</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Isim veya ID ile ara..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                    {showDropdown && filtered.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filtered.slice(0, 30).map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => selectEmployee(emp)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between ${
                                        selectedEmp?.id === emp.id ? 'bg-indigo-100 font-bold' : ''
                                    }`}
                                >
                                    <span>{emp.name}</span>
                                    <span className="text-xs text-gray-400">{emp.dept} (#{emp.id})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Baslangic</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bitis</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300" />
                </div>
                <button
                    onClick={fetchData}
                    disabled={!selectedEmp || loading}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                        !selectedEmp || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    }`}
                >
                    {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                    {loading ? 'Yukleniyor...' : 'Sorgula'}
                </button>
            </div>

            {/* Click outside to close dropdown */}
            {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            )}

            {data && !loading && (
                <div className="space-y-4">
                    {/* Employee Info */}
                    <div className="flex flex-wrap gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
                        <div><span className="font-bold text-indigo-800">{data.name}</span></div>
                        <div className="text-gray-600">Departman: <span className="font-medium">{data.department}</span></div>
                        <div className="text-gray-600">Pozisyon: <span className="font-medium">{data.job_position}</span></div>
                        <div className="text-gray-600">Takvim: <span className="font-medium">{data.fiscal_calendar || '-'}</span></div>
                        <div className="text-gray-600">Tarih: <span className="font-medium">{data.date_range?.from} — {data.date_range?.to}</span></div>
                    </div>

                    {/* Summary counts */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <CountBadge label="Devam" count={data.attendance_count} color="blue" />
                        <CountBadge label="Kart" count={data.gate_event_count} color="cyan" />
                        <CountBadge label="Ek Mesai" count={data.overtime_request_count} color="amber" />
                        <CountBadge label="Izin" count={data.leave_request_count} color="green" />
                        <CountBadge label="Rapor" count={data.health_report_count} color="red" />
                        <CountBadge label="Yemek" count={data.meal_request_count} color="orange" />
                        <CountBadge label="Kartsiz" count={data.cardless_request_count} color="purple" />
                    </div>

                    {/* Leave Breakdown */}
                    {data.leave_breakdown && Object.keys(data.leave_breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-bold text-gray-500">Izin Dagilimi:</span>
                            {Object.entries(data.leave_breakdown).map(([type, info]) => (
                                <span key={type} className="px-2 py-1 bg-green-50 border border-green-200 rounded text-[11px] text-green-800 font-medium">
                                    {type}: {info.count} talep ({info.days} gun)
                                </span>
                            ))}
                        </div>
                    )}

                    {/* ═══ Attendance Records (grouped by date) ═══ */}
                    <SectionToggle title="Devam Kayitlari (Gunluk)" icon={<ClockIcon className="w-5 h-5" />}
                        count={data.attendance_count} sectionKey="attendance"
                        expanded={expandedSections} toggle={toggleSection}>
                        <div className="space-y-3">
                            {Object.entries(attendanceByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, recs]) => (
                                <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
                                        {date} ({recs.length} kayit)
                                    </div>
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-left text-gray-500">
                                                <th className="py-1 px-2">ID</th>
                                                <th className="py-1 px-2">Giris</th>
                                                <th className="py-1 px-2">Cikis</th>
                                                <th className="py-1 px-2">Kaynak</th>
                                                <th className="py-1 px-2">Durum</th>
                                                <th className="py-1 px-2 text-right">Normal</th>
                                                <th className="py-1 px-2 text-right">Mesai</th>
                                                <th className="py-1 px-2 text-right">Eksik</th>
                                                <th className="py-1 px-2 text-right">Mola</th>
                                                <th className="py-1 px-2">Not</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recs.map(att => (
                                                <tr key={att.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="py-1 px-2 font-mono text-gray-400">#{att.id}</td>
                                                    <td className="py-1 px-2 font-mono">{fmtTime(att.check_in)}</td>
                                                    <td className="py-1 px-2 font-mono">{fmtTime(att.check_out)}</td>
                                                    <td className="py-1 px-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${SRC_COLORS[att.source] || 'bg-gray-100 text-gray-700'}`}>
                                                            {att.source}
                                                        </span>
                                                    </td>
                                                    <td className="py-1 px-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[att.status] || 'bg-gray-100 text-gray-700'}`}>
                                                            {att.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-1 px-2 text-right font-mono">{fmtS(att.normal_s)}</td>
                                                    <td className="py-1 px-2 text-right font-mono">{fmtS(att.ot_s)}</td>
                                                    <td className="py-1 px-2 text-right font-mono text-red-600">{att.missing_s > 0 ? fmtS(att.missing_s) : '-'}</td>
                                                    <td className="py-1 px-2 text-right font-mono">{att.break_s > 0 ? fmtS(att.break_s) : '-'}</td>
                                                    <td className="py-1 px-2 text-gray-400 max-w-[120px] truncate">{att.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </SectionToggle>

                    {/* ═══ Gate Events ═══ */}
                    <SectionToggle title="Kart Girisleri (Ham Veri)" icon={<CreditCardIcon className="w-5 h-5" />}
                        count={data.gate_event_count} sectionKey="gate"
                        expanded={expandedSections} toggle={toggleSection}>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-gray-500">
                                    <th className="py-1 px-2">Zaman</th>
                                    <th className="py-1 px-2">Yon</th>
                                    <th className="py-1 px-2">Durum</th>
                                    <th className="py-1 px-2">Event ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.gate_events?.map(ge => (
                                    <tr key={ge.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-1 px-2 font-mono">{ge.event_time}</td>
                                        <td className="py-1 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                ge.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>{ge.direction}</span>
                                        </td>
                                        <td className="py-1 px-2 text-gray-500">{ge.status}</td>
                                        <td className="py-1 px-2 font-mono text-gray-400">{ge.event_id}</td>
                                    </tr>
                                ))}
                                {(!data.gate_events || data.gate_events.length === 0) && (
                                    <tr><td colSpan={4} className="py-4 text-center text-gray-400 italic">Kart verisi yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </SectionToggle>

                    {/* ═══ OT Requests ═══ */}
                    <SectionToggle title="Ek Mesai Talepleri" icon={<DocumentTextIcon className="w-5 h-5" />}
                        count={data.overtime_request_count} sectionKey="ot"
                        expanded={expandedSections} toggle={toggleSection}>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-gray-500">
                                    <th className="py-1 px-2">ID</th>
                                    <th className="py-1 px-2">Tarih</th>
                                    <th className="py-1 px-2">Baslangic</th>
                                    <th className="py-1 px-2">Bitis</th>
                                    <th className="py-1 px-2 text-right">Sure</th>
                                    <th className="py-1 px-2">Durum</th>
                                    <th className="py-1 px-2">Kaynak</th>
                                    <th className="py-1 px-2">Olusturma</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.overtime_requests?.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-1 px-2 font-mono text-gray-400">#{r.id}</td>
                                        <td className="py-1 px-2 font-medium">{r.date}</td>
                                        <td className="py-1 px-2 font-mono">{r.start_time?.slice(0, 5) || '-'}</td>
                                        <td className="py-1 px-2 font-mono">{r.end_time?.slice(0, 5) || '-'}</td>
                                        <td className="py-1 px-2 text-right font-mono">{fmtS(r.duration_s)}</td>
                                        <td className="py-1 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                                        </td>
                                        <td className="py-1 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                r.source === 'POTENTIAL' ? 'bg-blue-100 text-blue-700' :
                                                r.source === 'MANUAL' ? 'bg-purple-100 text-purple-700' :
                                                r.source === 'ADMIN_ENTRY' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{r.source === 'ADMIN_ENTRY' ? 'Admin Girişi' : r.source}</span>
                                        </td>
                                        <td className="py-1 px-2 text-gray-400">{r.created_at}</td>
                                    </tr>
                                ))}
                                {(!data.overtime_requests || data.overtime_requests.length === 0) && (
                                    <tr><td colSpan={8} className="py-4 text-center text-gray-400 italic">Ek mesai talebi yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </SectionToggle>

                    {/* ═══ Leave Requests ═══ */}
                    <SectionToggle title="Izin Talepleri" icon={<CalendarDaysIcon className="w-5 h-5" />}
                        count={data.leave_request_count} sectionKey="leave"
                        expanded={expandedSections} toggle={toggleSection}>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-gray-500">
                                    <th className="py-1 px-2">ID</th>
                                    <th className="py-1 px-2">Tur</th>
                                    <th className="py-1 px-2">Baslangic</th>
                                    <th className="py-1 px-2">Bitis</th>
                                    <th className="py-1 px-2 text-right">Gun</th>
                                    <th className="py-1 px-2">Durum</th>
                                    <th className="py-1 px-2">Olusturma</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.leave_requests?.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-1 px-2 font-mono text-gray-400">#{r.id}</td>
                                        <td className="py-1 px-2 font-medium">{r.type}</td>
                                        <td className="py-1 px-2">{r.start_date}</td>
                                        <td className="py-1 px-2">{r.end_date}</td>
                                        <td className="py-1 px-2 text-right font-mono">{r.total_days}</td>
                                        <td className="py-1 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                                        </td>
                                        <td className="py-1 px-2 text-gray-400">{r.created_at}</td>
                                    </tr>
                                ))}
                                {(!data.leave_requests || data.leave_requests.length === 0) && (
                                    <tr><td colSpan={7} className="py-4 text-center text-gray-400 italic">Izin talebi yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </SectionToggle>

                    {/* ═══ Health Reports ═══ */}
                    {data.health_report_count > 0 && (
                        <SectionToggle title="Saglik Raporlari & Hastane Ziyaretleri" icon={<DocumentTextIcon className="w-5 h-5" />}
                            count={data.health_report_count} sectionKey="health_reports"
                            expanded={expandedSections} toggle={toggleSection}>
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-gray-500">
                                        <th className="py-1 px-2">ID</th>
                                        <th className="py-1 px-2">Tur</th>
                                        <th className="py-1 px-2">Baslangic</th>
                                        <th className="py-1 px-2">Bitis</th>
                                        <th className="py-1 px-2">Saat</th>
                                        <th className="py-1 px-2">Durum</th>
                                        <th className="py-1 px-2">Olusturma</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.health_reports?.map(r => (
                                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-1 px-2 font-mono text-gray-400">#{r.id}</td>
                                            <td className="py-1 px-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    r.report_type === 'HOSPITAL_VISIT' ? 'bg-red-100 text-red-700' : 'bg-rose-100 text-rose-700'
                                                }`}>{r.report_type === 'HOSPITAL_VISIT' ? 'Hastane Ziyareti' : 'Saglik Raporu'}</span>
                                            </td>
                                            <td className="py-1 px-2">{r.start_date}</td>
                                            <td className="py-1 px-2">{r.end_date}</td>
                                            <td className="py-1 px-2 font-mono">
                                                {r.is_full_day ? 'Tam gun' : `${r.start_time || '-'}-${r.end_time || '-'}`}
                                            </td>
                                            <td className="py-1 px-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                                            </td>
                                            <td className="py-1 px-2 text-gray-400">{r.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SectionToggle>
                    )}

                    {/* ═══ Cardless + Meal (compact) ═══ */}
                    {(data.cardless_request_count > 0 || data.meal_request_count > 0) && (
                        <SectionToggle title="Kartsiz Giris & Yemek" icon={<CreditCardIcon className="w-5 h-5" />}
                            count={(data.cardless_request_count || 0) + (data.meal_request_count || 0)} sectionKey="other"
                            expanded={expandedSections} toggle={toggleSection}>
                            <div className="space-y-3">
                                {data.cardless_requests?.length > 0 && (
                                    <div>
                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Kartsiz Giris ({data.cardless_request_count})</h6>
                                        {data.cardless_requests.map(r => (
                                            <div key={r.id} className="flex items-center gap-2 text-[11px] py-0.5">
                                                <span className="font-mono text-gray-400">#{r.id}</span>
                                                <span className="font-medium">{r.date}</span>
                                                <span className="font-mono">{r.check_in_time?.slice(0, 5) || '-'}-{r.check_out_time?.slice(0, 5) || '-'}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                                                <span className="text-gray-400 truncate max-w-[150px]">{r.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {data.meal_requests?.length > 0 && (
                                    <div>
                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Yemek ({data.meal_request_count})</h6>
                                        {data.meal_requests.map(r => (
                                            <div key={r.id} className="flex items-center gap-2 text-[11px] py-0.5">
                                                <span className="font-mono text-gray-400">#{r.id}</span>
                                                <span className="font-medium">{r.date}</span>
                                                <span>{r.meal_type}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </SectionToggle>
                    )}

                    {/* ═══ Monthly Summary ═══ */}
                    <SectionToggle title="Aylik Ozet (Kumulatif)" icon={<CalendarDaysIcon className="w-5 h-5" />}
                        count={data.monthly_summaries?.length || 0} sectionKey="monthly"
                        expanded={expandedSections} toggle={toggleSection}>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-gray-500">
                                    <th className="py-1 px-2">Donem</th>
                                    <th className="py-1 px-2 text-right">Hedef</th>
                                    <th className="py-1 px-2 text-right">Tamamlanan</th>
                                    <th className="py-1 px-2 text-right">Izin (sa)</th>
                                    <th className="py-1 px-2 text-right">Rapor (sa)</th>
                                    <th className="py-1 px-2 text-right">Eksik</th>
                                    <th className="py-1 px-2 text-right">Kalan</th>
                                    <th className="py-1 px-2 text-right">Mesai</th>
                                    <th className="py-1 px-2 text-right">Toplam Is</th>
                                    <th className="py-1 px-2 text-right">Net Bakiye</th>
                                    <th className="py-1 px-2 text-right">Kumulatif</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.monthly_summaries?.map((ms, i) => {
                                    const check = (ms.completed_s || 0) + (ms.missing_s || 0) + (ms.leave_s || 0) + (ms.health_report_s || 0) + (ms.remaining_s || 0);
                                    const balanced = ms.target_s > 0 ? Math.abs(check - ms.target_s) < 60 : true;
                                    return (
                                        <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${!balanced ? 'bg-red-50' : ''}`}>
                                            <td className="py-1 px-2 font-bold">{ms.year}-{String(ms.month).padStart(2, '0')}</td>
                                            <td className="py-1 px-2 text-right font-mono font-bold">{fmtS(ms.target_s)}</td>
                                            <td className="py-1 px-2 text-right font-mono">{fmtS(ms.completed_s)}</td>
                                            <td className="py-1 px-2 text-right font-mono text-teal-700">
                                                {ms.leave_s > 0 ? fmtS(ms.leave_s) : '-'}
                                                {ms.leave_days > 0 && <span className="text-[9px] text-gray-400 ml-1">({ms.leave_days}g)</span>}
                                            </td>
                                            <td className="py-1 px-2 text-right font-mono text-rose-600">
                                                {ms.health_report_s > 0 ? fmtS(ms.health_report_s) : '-'}
                                                {ms.health_report_days > 0 && <span className="text-[9px] text-gray-400 ml-1">({ms.health_report_days}g)</span>}
                                            </td>
                                            <td className="py-1 px-2 text-right font-mono text-red-600">{ms.missing_s > 0 ? fmtS(ms.missing_s) : '-'}</td>
                                            <td className="py-1 px-2 text-right font-mono text-gray-400">{ms.remaining_s > 0 ? fmtS(ms.remaining_s) : '-'}</td>
                                            <td className="py-1 px-2 text-right font-mono text-amber-700">{ms.overtime_s > 0 ? fmtS(ms.overtime_s) : '-'}</td>
                                            <td className="py-1 px-2 text-right font-mono">{fmtS(ms.total_work_s)}</td>
                                            <td className={`py-1 px-2 text-right font-mono font-bold ${ms.net_balance_s >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                {ms.net_balance_s > 0 ? '+' : ''}{fmtS(ms.net_balance_s)}
                                            </td>
                                            <td className={`py-1 px-2 text-right font-mono ${ms.cumulative_s >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {ms.cumulative_s > 0 ? '+' : ''}{fmtS(ms.cumulative_s)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!data.monthly_summaries || data.monthly_summaries.length === 0) && (
                                    <tr><td colSpan={11} className="py-4 text-center text-gray-400 italic">Aylik ozet yok</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-gray-500">
                            Denge: Hedef = Tamamlanan + Izin + Rapor + Eksik + Kalan. Satir kirmizi ise denge tutmuyor.
                        </div>
                    </SectionToggle>

                    {/* ═══ OT Assignments ═══ */}
                    {data.overtime_assignment_count > 0 && (
                        <SectionToggle title="Ek Mesai Atamalari" icon={<DocumentTextIcon className="w-5 h-5" />}
                            count={data.overtime_assignment_count} sectionKey="assignments"
                            expanded={expandedSections} toggle={toggleSection}>
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-gray-500">
                                        <th className="py-1 px-2">Tarih</th>
                                        <th className="py-1 px-2">Maks Saat</th>
                                        <th className="py-1 px-2">Durum</th>
                                        <th className="py-1 px-2">Atayan</th>
                                        <th className="py-1 px-2">Talep Var</th>
                                        <th className="py-1 px-2">Gorev</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.overtime_assignments?.map(a => (
                                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-1 px-2 font-medium">{a.date}</td>
                                            <td className="py-1 px-2 font-mono">{a.max_hours}sa</td>
                                            <td className="py-1 px-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[a.status] || ''}`}>{a.status}</span>
                                            </td>
                                            <td className="py-1 px-2">{a.assigned_by}</td>
                                            <td className="py-1 px-2">{a.has_claim ? 'Evet' : 'Hayir'}</td>
                                            <td className="py-1 px-2 text-gray-400 truncate max-w-[150px]">{a.task_description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SectionToggle>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────

function CountBadge({ label, count, color }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        red: 'bg-red-50 border-red-200 text-red-700',
    };
    return (
        <div className={`px-3 py-2 rounded-lg border text-center ${colors[color] || colors.blue}`}>
            <div className="text-xl font-bold">{count || 0}</div>
            <div className="text-[10px] font-medium">{label}</div>
        </div>
    );
}

function SectionToggle({ title, icon, count, sectionKey, expanded, toggle, children }) {
    const isOpen = expanded.has(sectionKey);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    {icon}
                    {title}
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">{count}</span>
                </div>
                {isOpen ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
            </button>
            {isOpen && <div className="p-3 border-t border-gray-100 overflow-x-auto">{children}</div>}
        </div>
    );
}
