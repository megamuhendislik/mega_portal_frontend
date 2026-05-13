import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    UserIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const STATUS_COLORS = {
    POTENTIAL: 'bg-gray-100 text-gray-700 border-gray-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
    CANCELLED: 'bg-slate-200 text-slate-700 border-slate-300',
    BUNDLED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const ATT_STATUS_COLORS = {
    OPEN: 'bg-blue-50 text-blue-700',
    CALCULATED: 'bg-emerald-50 text-emerald-700',
    PENDING_MANAGER_APPROVAL: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    AUTO_APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-rose-50 text-rose-700',
    ABSENT: 'bg-slate-100 text-slate-600',
    HEALTH_REPORT: 'bg-pink-50 text-pink-700',
    HOSPITAL_VISIT: 'bg-pink-50 text-pink-700',
};

export default function PersonDayDiagnosticTab() {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const searchTimer = useRef(null);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!query || query.length < 2 || selectedEmployee?.full_name === query) {
            setSearchResults([]);
            return;
        }
        searchTimer.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get(
                    `/system/health-check/person-day-diagnostic-search/?q=${encodeURIComponent(query)}`,
                );
                setSearchResults(res.data?.results || []);
                setShowResults(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => searchTimer.current && clearTimeout(searchTimer.current);
    }, [query, selectedEmployee]);

    const selectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setQuery(emp.full_name);
        setSearchResults([]);
        setShowResults(false);
    };

    const handleScan = useCallback(async () => {
        if (!selectedEmployee || !workDate) {
            setError('Çalışan ve tarih seçilmeli.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await api.post(
                '/system/health-check/person-day-diagnostic/',
                { employee_id: selectedEmployee.id, work_date: workDate },
            );
            setResult(res.data);
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [selectedEmployee, workDate]);

    const downloadTxt = async () => {
        if (!selectedEmployee || !workDate) return;
        try {
            const params = new URLSearchParams({
                employee_id: String(selectedEmployee.id),
                work_date: workDate,
            });
            const res = await api.get(
                `/system/health-check/person-day-diagnostic-txt/?${params.toString()}`,
                { responseType: 'blob' },
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: 'text/plain;charset=utf-8' }),
            );
            const a = document.createElement('a');
            a.href = url;
            const safeName = (selectedEmployee.full_name || 'emp').replace(/\s+/g, '_');
            a.download = `kisi-gun-tanilama-${safeName}-${workDate}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e?.response?.data?.error || e.message));
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-1">
                    <MagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                    Kişi-Gün Tanılama
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Bir çalışan + tarih seç → Attendance, tüm OT statüleri (BUNDLED/CANCELLED dahil),
                    izinler, vardiya kuralları ve otomatik tanı raporu. TXT indirip paylaşabilirsin.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Çalışan autocomplete */}
                    <div className="md:col-span-2 relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5" /> Çalışan
                        </label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedEmployee(null);
                            }}
                            onFocus={() => setShowResults(searchResults.length > 0)}
                            placeholder="Ad, soyad veya kullanıcı adı..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        {searching && (
                            <span className="absolute right-2 top-8 text-xs text-slate-400">Aranıyor...</span>
                        )}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => selectEmployee(r)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-b-0"
                                    >
                                        <div className="font-medium text-slate-800">{r.full_name}</div>
                                        <div className="text-xs text-slate-500">
                                            {r.username} {r.department && `• ${r.department}`}
                                            {!r.is_active && <span className="ml-1 text-rose-600">[pasif]</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedEmployee && (
                            <div className="mt-1 text-xs text-emerald-700">
                                ✓ Seçildi: <strong>{selectedEmployee.full_name}</strong> (id={selectedEmployee.id})
                            </div>
                        )}
                    </div>

                    {/* Tarih */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5" /> Tarih
                        </label>
                        <input
                            type="date"
                            value={workDate}
                            onChange={(e) => setWorkDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={handleScan}
                        disabled={loading || !selectedEmployee || !workDate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Taranıyor...' : 'Tara'}
                    </button>
                    <button
                        type="button"
                        onClick={downloadTxt}
                        disabled={!result || !!result?.error}
                        className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                    </button>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
                        {error}
                    </div>
                )}
            </div>

            {result && !result.error && <ResultPanel data={result} />}
            {result?.error && (
                <div className="bg-rose-50 border border-rose-200 rounded p-4 text-sm text-rose-700">
                    {result.error}
                </div>
            )}
        </div>
    );
}

function ResultPanel({ data }) {
    const { employee, work_date, shift_rules, attendance_records, overtime_requests,
        overtime_assignments, leave_requests, summary, diagnosis } = data;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-slate-500">Çalışan:</span> <strong>{employee.full_name}</strong> <span className="text-xs text-slate-400">(id={employee.id})</span></div>
                    <div><span className="text-slate-500">Departman:</span> {employee.department || '-'}</div>
                    <div><span className="text-slate-500">Tarih:</span> <strong>{work_date}</strong></div>
                    <div><span className="text-slate-500">Vardiya:</span> {shift_rules.shift_start || '?'}–{shift_rules.shift_end || '?'}</div>
                    {shift_rules.is_off_day && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">İzin Günü</span>}
                </div>
            </div>

            {/* Diagnosis */}
            {diagnosis && diagnosis.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Otomatik Tanı</h4>
                    <ul className="space-y-1.5">
                        {diagnosis.map((d, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                                {d.startsWith('⚠') && <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                                {d.startsWith('✓') && <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                                {d.startsWith('ℹ') && <InformationCircleIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                                <span className="text-slate-700">{d.replace(/^[⚠✓ℹ]\s*/, '')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Summary */}
            <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Özet</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                    <StatBox label="Attendance" value={summary.attendance_count} />
                    <StatBox label="Takılı" value={summary.attendance_stuck_count} highlight={summary.attendance_stuck_count > 0} />
                    <StatBox label="POTENTIAL" value={summary.ot_status_counts.POTENTIAL} />
                    <StatBox label="PENDING" value={summary.ot_status_counts.PENDING} />
                    <StatBox label="APPROVED" value={summary.ot_status_counts.APPROVED} />
                    <StatBox label="BUNDLED" value={summary.ot_status_counts.BUNDLED} highlight={summary.ot_status_counts.BUNDLED > 0} />
                    <StatBox label="CANCELLED" value={summary.ot_status_counts.CANCELLED} />
                    <StatBox label="REJECTED" value={summary.ot_status_counts.REJECTED} />
                </div>
            </div>

            {/* Attendance */}
            <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Attendance Kayıtları ({attendance_records.length})
                </h4>
                {attendance_records.length === 0 ? (
                    <p className="text-xs text-slate-400">Kayıt yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">ID</th>
                                    <th className="px-2 py-1.5 text-left">Kaynak</th>
                                    <th className="px-2 py-1.5 text-left">Giriş</th>
                                    <th className="px-2 py-1.5 text-left">Çıkış</th>
                                    <th className="px-2 py-1.5 text-left">Status</th>
                                    <th className="px-2 py-1.5 text-center">is_OT</th>
                                    <th className="px-2 py-1.5 text-right">Çalışma</th>
                                    <th className="px-2 py-1.5 text-right">OT (calc)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendance_records.map((a) => {
                                    const stuck = a.is_overtime_record && a.status === 'PENDING_MANAGER_APPROVAL';
                                    return (
                                        <tr key={a.id} className={stuck ? 'bg-rose-50' : ''}>
                                            <td className="px-2 py-1.5 font-mono">#{a.id}</td>
                                            <td className="px-2 py-1.5">{a.source}</td>
                                            <td className="px-2 py-1.5">{a.check_in}</td>
                                            <td className="px-2 py-1.5">{a.check_out}</td>
                                            <td className="px-2 py-1.5">
                                                <span className={`px-1.5 py-0.5 rounded ${ATT_STATUS_COLORS[a.status] || 'bg-slate-100'}`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                {a.is_overtime_record ? (
                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${stuck ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>T</span>
                                                ) : (
                                                    <span className="text-slate-400">F</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1.5 text-right">{Math.round((a.total_seconds || 0) / 60)}dk</td>
                                            <td className="px-2 py-1.5 text-right">{Math.round((a.calculated_overtime_seconds || 0) / 60)}dk</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Overtime Requests */}
            <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Overtime Requests — TÜM Statüler ({overtime_requests.length})
                </h4>
                {overtime_requests.length === 0 ? (
                    <p className="text-xs text-slate-400">Kayıt yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">ID</th>
                                    <th className="px-2 py-1.5 text-left">Status</th>
                                    <th className="px-2 py-1.5 text-left">Saat</th>
                                    <th className="px-2 py-1.5 text-right">Süre</th>
                                    <th className="px-2 py-1.5 text-center">Manuel</th>
                                    <th className="px-2 py-1.5 text-left">Bundled→</th>
                                    <th className="px-2 py-1.5 text-left">Sebep</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {overtime_requests.map((o) => (
                                    <tr key={o.id} className={o.status === 'BUNDLED' ? 'bg-indigo-50' : ''}>
                                        <td className="px-2 py-1.5 font-mono">OT#{o.id}</td>
                                        <td className="px-2 py-1.5">
                                            <span className={`px-1.5 py-0.5 rounded border ${STATUS_COLORS[o.status] || 'bg-slate-100'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5">{o.start_time}–{o.end_time}</td>
                                        <td className="px-2 py-1.5 text-right">{Math.round((o.duration_seconds || 0) / 60)}dk</td>
                                        <td className="px-2 py-1.5 text-center">{o.is_manual ? 'T' : '-'}</td>
                                        <td className="px-2 py-1.5">{o.bundled_into_id ? <span className="font-mono">OT#{o.bundled_into_id}</span> : '-'}</td>
                                        <td className="px-2 py-1.5 text-slate-600 truncate max-w-xs" title={o.rejection_reason || o.reason}>
                                            {o.rejection_reason || o.reason || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assignments */}
            {overtime_assignments.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                        OT Atamaları ({overtime_assignments.length})
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">ID</th>
                                    <th className="px-2 py-1.5 text-left">Status</th>
                                    <th className="px-2 py-1.5 text-right">Max</th>
                                    <th className="px-2 py-1.5 text-left">Atayan</th>
                                    <th className="px-2 py-1.5 text-left">Görev</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {overtime_assignments.map((a) => (
                                    <tr key={a.id}>
                                        <td className="px-2 py-1.5 font-mono">ASG#{a.id}</td>
                                        <td className="px-2 py-1.5">{a.status}</td>
                                        <td className="px-2 py-1.5 text-right">{a.max_duration_hours}sa</td>
                                        <td className="px-2 py-1.5">{a.assigned_by}</td>
                                        <td className="px-2 py-1.5 text-slate-600">{a.task_description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Leaves */}
            {leave_requests.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                        İzin Talepleri ({leave_requests.length})
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">ID</th>
                                    <th className="px-2 py-1.5 text-left">Status</th>
                                    <th className="px-2 py-1.5 text-left">Tür</th>
                                    <th className="px-2 py-1.5 text-left">Aralık</th>
                                    <th className="px-2 py-1.5 text-left">Saat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leave_requests.map((lv) => (
                                    <tr key={lv.id}>
                                        <td className="px-2 py-1.5 font-mono">LV#{lv.id}</td>
                                        <td className="px-2 py-1.5">{lv.status}</td>
                                        <td className="px-2 py-1.5">{lv.request_type_name || lv.request_type}</td>
                                        <td className="px-2 py-1.5">{lv.start_date}→{lv.end_date}</td>
                                        <td className="px-2 py-1.5">
                                            {lv.is_full_day ? 'Tam gün' : `${lv.start_time}–${lv.end_time}`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, highlight = false }) {
    return (
        <div className={`p-2 rounded border ${highlight ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`text-lg font-bold ${highlight ? 'text-amber-700' : 'text-slate-700'}`}>{value}</div>
        </div>
    );
}
