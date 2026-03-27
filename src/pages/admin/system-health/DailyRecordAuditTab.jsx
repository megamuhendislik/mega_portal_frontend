import React, { useState } from 'react';
import api from '../../../services/api';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    CreditCardIcon,
    DocumentTextIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function DailyRecordAuditTab() {
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [allEmployees, setAllEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [recoveryMessage, setRecoveryMessage] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Load all employees once
    useState(() => {
        api.get('/employees/', { params: { page_size: 500 } })
            .then(res => {
                const list = (res.data.results || res.data || [])
                    .filter(e => e.is_active !== false)
                    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'tr'));
                setAllEmployees(list);
            })
            .catch(() => {})
            .finally(() => setEmployeesLoading(false));
    });

    const handleSearchChange = (val) => {
        setEmployeeSearch(val);
        setSelectedEmployee(null);
        if (val.length < 2) {
            setFilteredEmployees([]);
            setShowDropdown(false);
            return;
        }
        const q = val.toLowerCase();
        const matched = allEmployees.filter(e =>
            (e.full_name || '').toLowerCase().includes(q) ||
            (e.registration_number || '').toLowerCase().includes(q)
        ).slice(0, 10);
        setFilteredEmployees(matched);
        setShowDropdown(true);
    };

    const selectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setEmployeeSearch(emp.full_name || `${emp.first_name} ${emp.last_name}`);
        setShowDropdown(false);
    };

    const handleQuery = async () => {
        if (!selectedEmployee || !date) {
            setError('Calisan ve tarih secimi zorunludur.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        setRecoveryMessage(null);
        try {
            const res = await api.get(`/system/health-check/daily-record-audit/?employee_id=${selectedEmployee.id}&date=${date}`);
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadTxt = () => {
        if (!result?.text_report) return;
        const blob = new Blob([result.text_report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kayit_denetim_${selectedEmployee?.id}_${date}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRecovery = () => {
        setRecoveryMessage('GateEventLog recovery endpoint henuz backend tarafinda eklenmedi. Bu ozellik yakin zamanda aktif edilecektir.');
    };

    const formatSeconds = (s) => {
        if (s == null) return '-';
        const h = Math.floor(Math.abs(s) / 3600);
        const m = Math.floor((Math.abs(s) % 3600) / 60);
        return `${s < 0 ? '-' : ''}${h}sa ${m}dk`;
    };

    const sourceColor = (source) => {
        const colors = {
            'CARD': 'bg-blue-100 text-blue-800',
            'MANUAL': 'bg-yellow-100 text-yellow-800',
            'HEALTH_REPORT': 'bg-purple-100 text-purple-800',
            'HOSPITAL_VISIT': 'bg-pink-100 text-pink-800',
            'SPLIT': 'bg-gray-100 text-gray-800',
            'AUTO_SPLIT': 'bg-gray-100 text-gray-600',
            'SYSTEM': 'bg-slate-100 text-slate-800',
            'DUTY': 'bg-green-100 text-green-800',
            'MANUAL_OT': 'bg-orange-100 text-orange-800',
        };
        return colors[source] || 'bg-gray-100 text-gray-600';
    };

    const statusColor = (status) => {
        const colors = {
            'APPROVED': 'text-green-700 bg-green-50',
            'REJECTED': 'text-red-700 bg-red-50',
            'PENDING': 'text-yellow-700 bg-yellow-50',
            'CANCELLED': 'text-gray-500 bg-gray-50',
            'POTENTIAL': 'text-blue-700 bg-blue-50',
            'OPEN': 'text-orange-700 bg-orange-50',
            'CALCULATED': 'text-indigo-700 bg-indigo-50',
            'AUTO_APPROVED': 'text-green-600 bg-green-50',
            'ABSENT': 'text-red-600 bg-red-50',
            'HEALTH_REPORT': 'text-purple-700 bg-purple-50',
            'PRESENT': 'text-green-700 bg-green-50',
            'PENDING_MANAGER_APPROVAL': 'text-amber-700 bg-amber-50',
        };
        return colors[status] || 'text-gray-600 bg-gray-50';
    };

    const hasMissingCardDiagnosis = result?.diagnosis?.some(
        d => d.includes('kart') || d.includes('KART') || d.includes('gate') || d.includes('GATE') || d.includes('KRiTiK')
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                    Gunluk Kayit Denetimi (Forensic Audit)
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Bir calisanin belirli bir gundeki tum veritabani kayitlarini goruntuleyin.
                    Kart verisi, attendance, saglik raporu, ek mesai, izin ve kartsiz giris kayitlari tek ekranda.
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    {/* Employee Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Calisan</label>
                        <input
                            type="text"
                            value={employeeSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Isim veya sicil no ile arayin..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {employeesLoading && <div className="absolute right-3 top-9 text-xs text-gray-400">Yükleniyor...</div>}
                        {showDropdown && filteredEmployees.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => selectEmployee(emp)}
                                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm border-b border-gray-50 last:border-0"
                                    >
                                        <span className="font-medium">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</span>
                                        {emp.department_name && <span className="text-gray-400 ml-2">({emp.department_name})</span>}
                                        {emp.registration_number && <span className="text-gray-400 ml-2">#{emp.registration_number}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedEmployee && (
                            <div className="mt-1 text-xs text-green-600">
                                Secili: {selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`} (ID: {selectedEmployee.id})
                            </div>
                        )}
                    </div>

                    {/* Date */}
                    <div className="min-w-[180px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Query Button */}
                    <button
                        onClick={handleQuery}
                        disabled={loading || !selectedEmployee || !date}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        Sorgula
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Action Bar */}
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <h3 className="text-sm font-bold text-gray-600">
                            Sonuclar: {result.employee?.full_name} — {new Date(result.date).toLocaleDateString('tr-TR')}
                        </h3>
                        <div className="flex items-center gap-2">
                            {hasMissingCardDiagnosis && (
                                <button
                                    onClick={handleRecovery}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center gap-2"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    GateEventLog'dan Recovery
                                </button>
                            )}
                            <button
                                onClick={downloadTxt}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {recoveryMessage && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                            {recoveryMessage}
                        </div>
                    )}

                    {/* Diagnosis */}
                    {result.diagnosis?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                Teshis
                            </h4>
                            <div className="space-y-2">
                                {result.diagnosis.map((d, i) => (
                                    <div key={i} className={`p-3 rounded-lg text-sm ${
                                        d.includes('KRiTiK') || d.includes('KRITIK') ? 'bg-red-50 border border-red-200 text-red-800' :
                                        d.includes('ANOMALI') ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                                        d.includes('COZUM') || d.includes('INFO') ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                                        'bg-gray-50 border border-gray-200 text-gray-700'
                                    }`}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {result.diagnosis?.length === 0 && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-800 text-sm flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                            Anomali tespit edilmedi.
                        </div>
                    )}

                    {/* Day Rules */}
                    {result.day_rules && !result.day_rules.error && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-indigo-500" />
                                Vardiya Kurallari
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Vardiya:</span>{' '}
                                    <span className="font-medium">{result.day_rules.shift_start} - {result.day_rules.shift_end}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Ogle:</span>{' '}
                                    <span className="font-medium">{result.day_rules.lunch_start} - {result.day_rules.lunch_end}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Tatil:</span>{' '}
                                    <span className="font-medium">{result.day_rules.is_off_day ? 'Evet' : 'Hayir'}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Tolerans:</span>{' '}
                                    <span className="font-medium">{result.day_rules.tolerance_minutes}dk / Min OT: {result.day_rules.minimum_overtime_minutes}dk</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gate Events */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <CreditCardIcon className="w-5 h-5 text-blue-500" />
                            Kart Okuyucu Verileri ({result.gate_event_count ?? result.gate_events?.length ?? 0} kayit)
                        </h4>
                        {result.gate_events?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-2 font-medium text-gray-600">Saat</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Yon</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Event ID</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {result.gate_events.map((ge, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-2 font-mono">{ge.timestamp}</td>
                                                <td className="p-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        ge.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {ge.direction === 'IN' ? 'GIRIS' : 'CIKIS'}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-gray-500 font-mono text-xs">{ge.event_id}</td>
                                                <td className="p-2 text-gray-500">{ge.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Bu tarihte kart okuyucu verisi yok.</p>
                        )}
                    </div>

                    {/* Attendance Records */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-emerald-500" />
                            Attendance Kayitlari ({result.attendance_count ?? result.attendance_records?.length ?? 0} kayit)
                        </h4>
                        {result.attendance_records?.length > 0 ? (
                            <div className="space-y-3">
                                {result.attendance_records.map((att, i) => (
                                    <div key={i} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-200 transition-colors">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs text-gray-400">ID:{att.id}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sourceColor(att.source)}`}>{att.source}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(att.status)}`}>{att.status}</span>
                                            {att.is_overtime_record && <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">OT Record</span>}
                                            {att.related_health_report_id && <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">HR#{att.related_health_report_id}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <div><span className="text-gray-500">Giris:</span> <span className="font-mono font-medium">{att.check_in || '-'}</span></div>
                                            <div><span className="text-gray-500">Cikis:</span> <span className="font-mono font-medium">{att.check_out || '-'}</span></div>
                                            <div><span className="text-gray-500">Normal:</span> <span className="font-medium">{formatSeconds(att.normal_seconds)}</span></div>
                                            <div><span className="text-gray-500">Fazla Mesai:</span> <span className="font-medium">{formatSeconds(att.calculated_overtime_seconds)}</span></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-1">
                                            <div><span className="text-gray-500">Eksik:</span> <span className="font-medium text-red-600">{formatSeconds(att.missing_seconds)}</span></div>
                                            <div><span className="text-gray-500">Toplam:</span> <span className="font-medium">{formatSeconds(att.total_seconds)}</span></div>
                                            <div><span className="text-gray-500">Mola:</span> <span className="font-medium">{formatSeconds(att.break_seconds)}</span></div>
                                            {att.parent_attendance_id && <div><span className="text-gray-500">Parent ID:</span> <span className="font-medium">{att.parent_attendance_id}</span></div>}
                                        </div>
                                        {att.note && <div className="mt-1 text-xs text-gray-500 italic">Not: {att.note}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Bu tarihte attendance kaydi yok.</p>
                        )}
                    </div>

                    {/* Health Reports */}
                    {result.health_reports?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Saglik Raporlari ({result.health_reports.length})</h4>
                            {result.health_reports.map((hr, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400">ID:{hr.id}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(hr.status)}`}>{hr.status}</span>
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{hr.report_type}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500">Tarih:</span> {hr.start_date} — {hr.end_date}
                                        {hr.rejection_reason && <div className="text-red-600 mt-1">Red sebebi: {hr.rejection_reason}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Overtime Requests */}
                    {result.overtime_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Ek Mesai Talepleri ({result.overtime_requests.length})</h4>
                            {result.overtime_requests.map((ot, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{ot.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(ot.status)}`}>{ot.status}</span>
                                    <span className="text-sm">{ot.start_time} - {ot.end_time}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ot.source_type}</span>
                                    {ot.duration_minutes && <span className="text-sm text-gray-500">{ot.duration_minutes}dk</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leave Requests */}
                    {result.leave_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Izin Talepleri ({result.leave_requests.length})</h4>
                            {result.leave_requests.map((lr, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{lr.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(lr.status)}`}>{lr.status}</span>
                                    <span className="text-sm">{lr.request_type}</span>
                                    <span className="text-sm text-gray-500">{lr.start_date} — {lr.end_date}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cardless Entries */}
                    {result.cardless_entries?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Kartsiz Giris Talepleri ({result.cardless_entries.length})</h4>
                            {result.cardless_entries.map((ce, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{ce.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(ce.status)}`}>{ce.status}</span>
                                    <span className="text-sm">{ce.check_in} - {ce.check_out}</span>
                                    {ce.reason && <span className="text-sm text-gray-500">{ce.reason}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Meal Requests */}
                    {result.meal_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Yemek Talepleri ({result.meal_requests.length})</h4>
                            {result.meal_requests.map((m, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{m.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(m.status)}`}>{m.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
