import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    WrenchScrewdriverIcon,
    ShieldExclamationIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// --- Helpers ---

function fmtSec(s) {
    if (s === null || s === undefined) return '-';
    const sign = s < 0 ? '-' : '';
    const abs = Math.abs(s);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${sign}${h}:${m.toString().padStart(2, '0')}`;
}

function fmtSecReadable(s) {
    if (s === null || s === undefined) return '-';
    const sign = s < 0 ? '-' : '';
    const abs = Math.abs(s);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    if (h > 0 && m > 0) return `${sign}${h} sa ${m} dk`;
    if (h > 0) return `${sign}${h} sa`;
    return `${sign}${m} dk`;
}

// --- Main Component ---

export default function MonthlyAuditTab() {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [expandedDays, setExpandedDays] = useState(new Set());
    const [filterMismatch, setFilterMismatch] = useState(false);
    const [filterAnomaly, setFilterAnomaly] = useState(false);
    const [autoFix, setAutoFix] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    useEffect(() => {
        api.get('/employees/', { params: { page_size: 500 } }).then(r => {
            const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
            setEmployees(list.map(e => ({
                id: e.id,
                name: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                department: e.department_name || e.department?.name || '',
            })));
        }).catch(() => {});
    }, []);

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const runAudit = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        setResult(null);
        setError(null);
        setExpandedDays(new Set());
        try {
            const resp = await api.post('/system/health-check/monthly-audit/', {
                employee_id: selectedEmployee.id, year, month, auto_fix: autoFix
            }, { timeout: 180000 });
            setResult(resp.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Denetim basarisiz.');
        } finally {
            setLoading(false);
        }
    };

    const runBulkAudit = async () => {
        setBulkLoading(true);
        setBulkResult(null);
        setError(null);
        try {
            const resp = await api.post('/system/health-check/monthly-audit-bulk/', {
                year, month, auto_fix: autoFix
            }, { timeout: 600000 });
            setBulkResult(resp.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Toplu denetim başarısız.');
        } finally {
            setBulkLoading(false);
        }
    };

    const downloadTxt = () => {
        const log = bulkMode ? bulkResult?.text_log : result?.text_log;
        if (!log) return;
        const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fname = bulkMode
            ? `bulk_audit_${year}_${String(month).padStart(2, '0')}.txt`
            : `audit_${result.employee_id}_${year}_${String(month).padStart(2, '0')}.txt`;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleDay = (date) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const expandAll = () => {
        if (!result?.daily_logs) return;
        setExpandedDays(new Set(result.daily_logs.map(d => d.date)));
    };
    const collapseAll = () => setExpandedDays(new Set());

    const displayDays = result?.daily_logs
        ? result.daily_logs.filter(d => {
            if (filterMismatch && !d.has_mismatch) return false;
            if (filterAnomaly && (!d.anomalies || d.anomalies.length === 0)) return false;
            return true;
        })
        : [];

    // --- Summary Card ---

    const SummaryCard = ({ title, data, compareData, color }) => {
        const fields = [
            { key: 'target_seconds', label: 'Hedef' },
            { key: 'expected_target', label: 'Hedef (Vardiyalardan)' },
            { key: 'completed_seconds', label: 'Tamamlanan' },
            { key: 'overtime_seconds', label: 'Fazla Mesai (Onayli)' },
            { key: 'calculated_ot_seconds', label: 'Fazla Mesai (Hesaplanan)' },
            { key: 'missing_seconds', label: 'Eksik' },
            { key: 'total_work_seconds', label: 'Toplam Calisma' },
            { key: 'net_balance_seconds', label: 'Net Bakiye' },
            { key: 'leave_days', label: 'Izin Gunu' },
            { key: 'leave_seconds', label: 'Izin Suresi' },
            { key: 'health_report_days', label: 'Rapor Gunu' },
            { key: 'health_report_seconds', label: 'Rapor Suresi' },
            { key: 'hospital_visit_count', label: 'Hastane Ziyareti' },
            { key: 'special_leave_days', label: 'Ozel Izin Gunu' },
            { key: 'total_break_seconds', label: 'Toplam Mola' },
            { key: 'worked_days', label: 'Calisan Gun' },
            { key: 'absent_days', label: 'Devamsiz Gun' },
            { key: 'off_days', label: 'Tatil Gun' },
            { key: 'ghost_days', label: 'Kayitsiz Gun' },
        ];

        const colorMap = {
            blue: { border: 'border-blue-200', bg: 'bg-blue-50/50', title: 'text-blue-800' },
            emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', title: 'text-emerald-800' },
            amber: { border: 'border-amber-200', bg: 'bg-amber-50/50', title: 'text-amber-800' },
        };
        const c = colorMap[color] || colorMap.blue;

        if (data?.error) {
            return (
                <div className={`rounded-xl border p-5 ${c.border} ${c.bg}`}>
                    <h4 className={`font-bold text-sm mb-3 ${c.title}`}>{title}</h4>
                    <p className="text-sm text-red-600">{data.error}</p>
                </div>
            );
        }

        return (
            <div className={`rounded-xl border p-5 ${c.border} ${c.bg}`}>
                <h4 className={`font-bold text-sm mb-3 ${c.title}`}>{title}</h4>
                <div className="space-y-1.5">
                    {fields.map(f => {
                        if (data?.[f.key] === undefined) return null;
                        const val = data[f.key];
                        const compareVal = compareData?.[f.key];
                        const isSec = f.key.includes('seconds');
                        const hasMismatch = compareVal !== undefined && isSec && Math.abs((val || 0) - (compareVal || 0)) > 60;
                        return (
                            <div
                                key={f.key}
                                className={`flex justify-between text-xs py-1 px-2 rounded ${hasMismatch ? 'bg-red-100 text-red-800 font-semibold' : ''}`}
                            >
                                <span className="text-gray-600">{f.label}</span>
                                <span className="font-mono font-medium">
                                    {isSec ? fmtSecReadable(val) : val}
                                    {isSec && <span className="text-gray-400 ml-1">({val}s)</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- Render ---

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="w-6 h-6 text-indigo-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Aylik Hesap Denetimi</h3>
                    <p className="text-xs text-gray-500">
                        Kapsamli butunluk kontrolu: ghost day tespiti, anomali tarama, hedef dengesi
                    </p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => { setBulkMode(false); setBulkResult(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!bulkMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Tekli Denetim
                </button>
                <button
                    onClick={() => { setBulkMode(true); setResult(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${bulkMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Tüm Çalışanlar
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                {/* Employee Search — only in single mode */}
                {!bulkMode && <div className="relative flex-1 min-w-[240px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Calisan</label>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={selectedEmployee ? selectedEmployee.name : searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setSelectedEmployee(null);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Calisan ara..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        {selectedEmployee && (
                            <button
                                onClick={() => { setSelectedEmployee(null); setSearchTerm(''); }}
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    {showDropdown && !selectedEmployee && searchTerm.length >= 1 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredEmployees.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-400">Sonuc bulunamadi</div>
                            ) : (
                                filteredEmployees.slice(0, 20).map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedEmployee(emp);
                                            setSearchTerm('');
                                            setShowDropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm transition-colors"
                                    >
                                        <span className="font-medium text-gray-800">{emp.name}</span>
                                        {emp.department && (
                                            <span className="ml-2 text-xs text-gray-400">({emp.department})</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>}

                {/* Year */}
                <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Yil</label>
                    <input
                        type="number"
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value) || 2026)}
                        min={2024}
                        max={2030}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>

                {/* Month */}
                <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ay</label>
                    <select
                        value={month}
                        onChange={e => setMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <option key={m} value={m}>
                                {['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'][m-1]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Auto-fix toggle */}
                <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={autoFix}
                            onChange={e => setAutoFix(e.target.checked)}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <WrenchScrewdriverIcon className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">Otomatik Duzelt</span>
                    </label>
                </div>

                {/* Run Button */}
                <button
                    onClick={bulkMode ? runBulkAudit : runAudit}
                    disabled={bulkMode ? (bulkLoading) : (!selectedEmployee || loading)}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    {(bulkMode ? bulkLoading : loading) ? (
                        <>
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {bulkMode ? 'Tüm çalışanlar denetleniyor...' : 'Denetleniyor...'}
                        </>
                    ) : (
                        <>
                            <MagnifyingGlassIcon className="w-4 h-4" />
                            {bulkMode ? 'Tümünü Denetle' : 'Denetle'}
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Bulk Results */}
            {bulkMode && bulkResult && (
                <div className="space-y-4">
                    {/* Bulk Summary */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="font-semibold text-gray-800">
                                {bulkResult.period}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span>{bulkResult.total_employees} çalışan</span>
                            <span className="text-gray-400">|</span>
                            {bulkResult.issues_count > 0 ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                    {bulkResult.issues_count} sorunlu
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                                    Tümü temiz
                                </span>
                            )}
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                                {bulkResult.clean_count} temiz
                            </span>
                            {bulkResult.total_ghost_days > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                                    {bulkResult.total_ghost_days} kayıtsız gün
                                </span>
                            )}
                            {bulkResult.total_fixed_days > 0 && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                    {bulkResult.total_fixed_days} düzeltildi
                                </span>
                            )}
                            <button onClick={downloadTxt} className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 flex items-center gap-1">
                                <DocumentArrowDownIcon className="w-3 h-3" /> TXT İndir
                            </button>
                        </div>
                    </div>

                    {/* Bulk Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600">
                                    <th className="px-3 py-2 text-left font-medium">Çalışan</th>
                                    <th className="px-3 py-2 text-left font-medium">Departman</th>
                                    <th className="px-3 py-2 text-center font-medium">Anomali</th>
                                    <th className="px-3 py-2 text-center font-medium">Ghost</th>
                                    <th className="px-3 py-2 text-center font-medium">Denge</th>
                                    <th className="px-3 py-2 text-right font-medium">DB Hedef</th>
                                    <th className="px-3 py-2 text-right font-medium">DB Tamamlanan</th>
                                    <th className="px-3 py-2 text-right font-medium">DB Eksik</th>
                                    <th className="px-3 py-2 text-right font-medium">Hesap Tamamlanan</th>
                                    <th className="px-3 py-2 text-right font-medium">Hesap Eksik</th>
                                    <th className="px-3 py-2 text-center font-medium">İzin</th>
                                    <th className="px-3 py-2 text-center font-medium">Rapor</th>
                                    <th className="px-3 py-2 text-center font-medium">Detay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulkResult.results
                                    .sort((a, b) => b.anomaly_count - a.anomaly_count)
                                    .map(emp => {
                                    const bgClass = emp.anomaly_count > 0
                                        ? (emp.anomalies?.some(a => a.severity === 'CRITICAL') ? 'bg-red-50' : 'bg-orange-50')
                                        : '';
                                    return (
                                        <tr key={emp.employee_id} className={`border-b border-gray-100 hover:bg-gray-50 ${bgClass}`}>
                                            <td className="px-3 py-2 font-medium text-gray-800">{emp.employee_name}</td>
                                            <td className="px-3 py-2 text-gray-500">{emp.department}</td>
                                            <td className="px-3 py-2 text-center">
                                                {emp.anomaly_count > 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">{emp.anomaly_count}</span>
                                                ) : (
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {emp.ghost_days > 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full font-bold">{emp.ghost_days}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {emp.balance_ok ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />
                                                ) : (
                                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">{fmtSec(emp.db_target)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{fmtSec(emp.db_completed)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{fmtSec(emp.db_missing)}</td>
                                            <td className={`px-3 py-2 text-right font-mono ${Math.abs(emp.db_completed - emp.calc_completed) > 300 ? 'text-red-600 font-bold' : ''}`}>
                                                {fmtSec(emp.calc_completed)}
                                            </td>
                                            <td className={`px-3 py-2 text-right font-mono ${Math.abs(emp.db_missing - emp.calc_missing) > 300 ? 'text-red-600 font-bold' : ''}`}>
                                                {fmtSec(emp.calc_missing)}
                                            </td>
                                            <td className="px-3 py-2 text-center">{emp.leave_days || '-'}</td>
                                            <td className="px-3 py-2 text-center">{emp.health_report_days || '-'}</td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    onClick={() => {
                                                        setBulkMode(false);
                                                        setSelectedEmployee({ id: emp.employee_id, name: emp.employee_name, department: emp.department });
                                                    }}
                                                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium hover:bg-indigo-200"
                                                >
                                                    Detay
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Anomaly details for problematic employees */}
                    {bulkResult.results.filter(r => r.has_issues).length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <h4 className="text-sm font-bold text-red-800 mb-3">Anomali Detayları</h4>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {bulkResult.results.filter(r => r.has_issues).map(emp => (
                                    <div key={emp.employee_id} className="p-3 bg-white rounded-lg border border-red-100">
                                        <div className="font-medium text-sm text-gray-800 mb-1">{emp.employee_name} <span className="text-gray-400 text-xs">({emp.department})</span></div>
                                        {emp.anomalies.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs mt-1">
                                                <span className={`px-1.5 py-0.5 rounded font-bold ${
                                                    a.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                                    a.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                                    'bg-yellow-200 text-yellow-800'
                                                }`}>{a.type}</span>
                                                {a.date && <span className="text-gray-500">{a.date}</span>}
                                                <span className="text-gray-700">{a.message}</span>
                                            </div>
                                        ))}
                                        {emp.ghost_day_dates?.length > 0 && (
                                            <div className="mt-1 text-[11px] text-red-600">
                                                Kayıtsız günler: {emp.ghost_day_dates.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Single Employee Results */}
            {!bulkMode && result && !result.error && (
                <div className="space-y-6">
                    {/* Top Info Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-sm text-gray-700">
                            <span className="font-semibold">{result.employee}</span>
                            {result.department && (
                                <>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-500">{result.department}</span>
                                </>
                            )}
                            <span className="mx-2 text-gray-300">|</span>
                            <span>{result.period}</span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span>{result.total_days} gun</span>
                            {result.auto_fix && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                    Otomatik Duzeltme AKTIF
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={downloadTxt}
                                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {/* Anomaly Summary Badges */}
                    {result.anomaly_counts && result.anomaly_counts.total > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldExclamationIcon className="w-5 h-5 text-red-600" />
                                <span className="font-bold text-red-800 text-sm">
                                    Anomali Ozeti ({result.anomaly_counts.total} toplam)
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {result.anomaly_counts.critical > 0 && (
                                    <div className="px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                                        <span className="text-xs font-bold text-red-800">
                                            {result.anomaly_counts.critical} KRITIK
                                        </span>
                                    </div>
                                )}
                                {result.anomaly_counts.high > 0 && (
                                    <div className="px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg">
                                        <span className="text-xs font-bold text-orange-800">
                                            {result.anomaly_counts.high} YUKSEK
                                        </span>
                                    </div>
                                )}
                                {result.anomaly_counts.medium > 0 && (
                                    <div className="px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                                        <span className="text-xs font-bold text-yellow-800">
                                            {result.anomaly_counts.medium} ORTA
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ghost Days Banner */}
                    {result.ghost_days && result.ghost_days.length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-300 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <ExclamationCircleIcon className="w-5 h-5 text-red-700" />
                                <span className="font-bold text-red-800 text-sm">
                                    Kayitsiz Gunler ({result.ghost_days.length})
                                </span>
                            </div>
                            <p className="text-xs text-red-700 mb-2">
                                Asagidaki is gunlerinde hicbir Attendance kaydi yok. Bu gunler hedef hesabinda eksik olusturuyor.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {result.ghost_days.map(d => (
                                    <span key={d} className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-mono font-medium">
                                        {d}
                                    </span>
                                ))}
                            </div>
                            {result.fixed_days && result.fixed_days.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                    <span className="text-xs text-green-700 font-medium">
                                        Duzeltilen: {result.fixed_days.join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Integrity Checks */}
                    {result.integrity_checks && result.integrity_checks.length > 0 && (
                        <div className="p-4 bg-white border border-gray-200 rounded-xl">
                            <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                                <ShieldExclamationIcon className="w-4 h-4 text-indigo-600" />
                                Butunluk Kontrolleri
                            </h4>
                            <div className="space-y-2">
                                {result.integrity_checks.map((ic, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                                            ic.status === 'PASS'
                                                ? 'bg-green-50 border border-green-200'
                                                : 'bg-red-50 border border-red-200'
                                        }`}
                                    >
                                        {ic.status === 'PASS' ? (
                                            <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div>
                                            <span className={`font-semibold ${ic.status === 'PASS' ? 'text-green-800' : 'text-red-800'}`}>
                                                [{ic.check}]
                                            </span>
                                            <span className={`ml-2 ${ic.status === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>
                                                {ic.message}
                                            </span>
                                            {ic.diff !== undefined && ic.diff !== 0 && (
                                                <span className="ml-2 font-mono text-red-600">
                                                    (fark: {fmtSecReadable(ic.diff)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Legacy Mismatch Banner (backward compat) */}
                    {(!result.integrity_checks || result.integrity_checks.length === 0) && (
                        result.mismatches && result.mismatches.length > 0 ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-red-800 text-sm">
                                        Ozet Uyusmazliklari ({result.mismatches.length})
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {result.mismatches.map((m, i) => (
                                        <div key={i} className="text-xs text-red-700 font-mono pl-7">{m}</div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                <span className="text-green-800 text-sm font-medium">
                                    Ozet karsilastirmasi uyumlu - uyusmazlik bulunamadi.
                                </span>
                            </div>
                        )
                    )}

                    {/* Summary Cards */}
                    <div className={`grid grid-cols-1 ${result.summary_after_fix ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                        <SummaryCard
                            title="DB Durumu (MonthlyWorkSummary)"
                            data={result.summary_db}
                            compareData={result.summary_recalculated}
                            color="blue"
                        />
                        <SummaryCard
                            title="Hesaplanan (Recalculated)"
                            data={result.summary_recalculated}
                            compareData={result.summary_db}
                            color="emerald"
                        />
                        {result.summary_after_fix && (
                            <SummaryCard
                                title="Duzeltme Sonrasi"
                                data={result.summary_after_fix}
                                compareData={result.summary_db}
                                color="amber"
                            />
                        )}
                    </div>

                    {/* Daily Detail Controls */}
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-gray-800 text-sm">Gunluk Detay</h4>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterAnomaly}
                                    onChange={e => { setFilterAnomaly(e.target.checked); if (e.target.checked) setFilterMismatch(false); }}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                Sadece anomaliler
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterMismatch}
                                    onChange={e => { setFilterMismatch(e.target.checked); if (e.target.checked) setFilterAnomaly(false); }}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Sadece uyusmazliklar
                            </label>
                            <button onClick={expandAll} className="text-xs text-indigo-600 hover:text-indigo-800">Tumu Ac</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={collapseAll} className="text-xs text-indigo-600 hover:text-indigo-800">Tumu Kapat</button>
                        </div>
                    </div>

                    {/* Daily Table */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-8"></th>
                                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Tarih</th>
                                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Gun</th>
                                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Vardiya</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">DB Normal</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">DB OT</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">DB Eksik</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">CALC Normal</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">CALC OT</th>
                                    <th className="text-right px-3 py-2.5 font-semibold text-gray-600">CALC Eksik</th>
                                    <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Durum</th>
                                    <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Bilgi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayDays.map(day => {
                                    const isExpanded = expandedDays.has(day.date);
                                    const db = day.db || {};
                                    const rc = day.recalculated || {};
                                    const hasErr = rc.error;
                                    const dayAnomalies = day.anomalies || [];
                                    const hasCritical = dayAnomalies.some(a => a.severity === 'CRITICAL');
                                    const hasHigh = dayAnomalies.some(a => a.severity === 'HIGH');
                                    const hasMedium = dayAnomalies.some(a => a.severity === 'MEDIUM');

                                    let rowBg = 'hover:bg-gray-50';
                                    if (hasCritical) rowBg = 'bg-red-50 hover:bg-red-100';
                                    else if (hasHigh) rowBg = 'bg-orange-50 hover:bg-orange-100';
                                    else if (hasMedium) rowBg = 'bg-yellow-50 hover:bg-yellow-100';
                                    else if (day.is_off_day) rowBg = 'bg-gray-50 hover:bg-gray-100';
                                    else if (day.was_fixed) rowBg = 'bg-green-50 hover:bg-green-100';

                                    return (
                                        <React.Fragment key={day.date}>
                                            <tr
                                                className={`border-b border-gray-100 cursor-pointer transition-colors ${rowBg}`}
                                                onClick={() => toggleDay(day.date)}
                                            >
                                                <td className="px-3 py-2">
                                                    {isExpanded
                                                        ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" />
                                                        : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    }
                                                </td>
                                                <td className="px-3 py-2 font-mono font-medium text-gray-800">{day.date}</td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {day.weekday}
                                                    {day.is_off_day && (
                                                        <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">
                                                            TATIL
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500">{day.shift || '-'}</td>
                                                <td className="text-right px-3 py-2 font-mono">{fmtSec(db.normal_seconds)}</td>
                                                <td className="text-right px-3 py-2 font-mono">{fmtSec(db.ot_seconds)}</td>
                                                <td className="text-right px-3 py-2 font-mono">{fmtSec(db.missing_seconds)}</td>
                                                <td className={`text-right px-3 py-2 font-mono ${hasErr ? 'text-red-500' : ''}`}>
                                                    {hasErr ? 'ERR' : fmtSec(rc.normal_seconds)}
                                                </td>
                                                <td className={`text-right px-3 py-2 font-mono ${hasErr ? 'text-red-500' : ''}`}>
                                                    {hasErr ? '-' : fmtSec(rc.ot_seconds)}
                                                </td>
                                                <td className={`text-right px-3 py-2 font-mono ${hasErr ? 'text-red-500' : ''}`}>
                                                    {hasErr ? '-' : fmtSec(rc.missing_seconds)}
                                                </td>
                                                <td className="text-center px-3 py-2">
                                                    <StatusBadge status={db.status} />
                                                </td>
                                                <td className="text-center px-3 py-2">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                        {/* Anomaly badges */}
                                                        {dayAnomalies.map((a, i) => (
                                                            <AnomalyBadge key={i} type={a.type} severity={a.severity} />
                                                        ))}
                                                        {day.was_fixed && (
                                                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium"
                                                                title="Duzeltildi">
                                                                FIX
                                                            </span>
                                                        )}
                                                        {day.approved_ot && (
                                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium"
                                                                title={`${day.approved_ot.count} OT`}>
                                                                OT
                                                            </span>
                                                        )}
                                                        {day.leave && (
                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                                                Izin
                                                            </span>
                                                        )}
                                                        {day.health_report && (
                                                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium">
                                                                Rapor
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Detail */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={12} className="bg-gray-50/70 px-6 py-3 border-b border-gray-200">
                                                        <DayDetail day={day} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {displayDays.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="text-center py-8 text-gray-400 text-sm">
                                            {(filterMismatch || filterAnomaly) ? 'Filtre kriterine uyan gun bulunamadi.' : 'Veri yok.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Error result */}
            {result?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {result.error}
                </div>
            )}
        </div>
    );
}

// --- Sub-components ---

function AnomalyBadge({ type, severity }) {
    const severityColors = {
        CRITICAL: 'bg-red-200 text-red-800 border-red-300',
        HIGH: 'bg-orange-200 text-orange-800 border-orange-300',
        MEDIUM: 'bg-yellow-200 text-yellow-800 border-yellow-300',
    };
    const typeLabels = {
        GHOST_DAY: 'KAYIT YOK',
        CALC_MISMATCH: 'FARK',
        STALE_OPEN: 'ACIK',
        OVERFLOW: 'TASMA',
        UNCLAIMED_OT: 'OT?',
    };
    return (
        <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityColors[severity] || 'bg-gray-200 text-gray-700'}`}
            title={`${severity}: ${type}`}
        >
            {typeLabels[type] || type}
        </span>
    );
}

function StatusBadge({ status }) {
    if (!status) return <span className="text-gray-300">-</span>;
    const colors = {
        OPEN: 'bg-yellow-100 text-yellow-800',
        CALCULATED: 'bg-blue-100 text-blue-800',
        APPROVED: 'bg-green-100 text-green-800',
        AUTO_APPROVED: 'bg-green-100 text-green-800',
        PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-800',
        REJECTED: 'bg-red-100 text-red-800',
        ABSENT: 'bg-gray-200 text-gray-700',
        ON_LEAVE: 'bg-sky-100 text-sky-800',
        HEALTH_REPORT: 'bg-pink-100 text-pink-800',
        HOSPITAL_VISIT: 'bg-rose-100 text-rose-800',
    };
    const short = {
        OPEN: 'ACIK',
        CALCULATED: 'HESAP',
        APPROVED: 'ONAY',
        AUTO_APPROVED: 'OTO',
        PENDING_MANAGER_APPROVAL: 'BEKLE',
        REJECTED: 'RED',
        ABSENT: 'YOK',
        ON_LEAVE: 'IZIN',
        HEALTH_REPORT: 'RAPOR',
        HOSPITAL_VISIT: 'HAST',
    };
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
            {short[status] || status}
        </span>
    );
}

function DayDetail({ day }) {
    const db = day.db || {};
    const rc = day.recalculated || {};

    return (
        <div className="space-y-3 text-xs">
            {/* Anomaly Alerts */}
            {day.anomalies && day.anomalies.length > 0 && (
                <div className="space-y-1">
                    {day.anomalies.map((a, i) => {
                        const bgMap = {
                            CRITICAL: 'bg-red-100 border-red-200 text-red-800',
                            HIGH: 'bg-orange-100 border-orange-200 text-orange-800',
                            MEDIUM: 'bg-yellow-100 border-yellow-200 text-yellow-800',
                        };
                        return (
                            <div key={i} className={`p-2 border rounded-lg ${bgMap[a.severity] || 'bg-gray-100 border-gray-200'}`}>
                                <span className="font-bold">[{a.severity}] {a.type}:</span>{' '}
                                <span>{a.message}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Mismatch Alert (legacy compat) */}
            {day.has_mismatch && day.mismatch_fields && day.mismatch_fields.length > 0 && !day.anomalies?.some(a => a.type === 'CALC_MISMATCH') && (
                <div className="p-2 bg-red-100 border border-red-200 rounded-lg">
                    <span className="font-semibold text-red-800">Uyusmazliklar: </span>
                    {day.mismatch_fields.map((f, i) => (
                        <span key={i} className="font-mono text-red-700">
                            {i > 0 && ', '}{f}
                        </span>
                    ))}
                </div>
            )}

            {/* Fixed indicator */}
            {day.was_fixed && (
                <div className="p-2 bg-green-100 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-800">Bu gun icin ABSENT kaydi olusturuldu (duzeltme)</span>
                </div>
            )}

            {/* Shift info */}
            {day.shift_seconds > 0 && (
                <div className="text-gray-500">
                    Vardiya suresi: {fmtSec(day.shift_seconds)} ({day.shift_seconds}s)
                </div>
            )}

            {/* DB Records */}
            {db.records && db.records.length > 0 && (
                <div>
                    <h5 className="font-semibold text-gray-700 mb-1">DB Kayitlari ({db.records.length})</h5>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-blue-50">
                                    <th className="text-left px-2 py-1 font-medium text-blue-700">ID</th>
                                    <th className="text-left px-2 py-1 font-medium text-blue-700">Giris</th>
                                    <th className="text-left px-2 py-1 font-medium text-blue-700">Cikis</th>
                                    <th className="text-right px-2 py-1 font-medium text-blue-700">Normal</th>
                                    <th className="text-right px-2 py-1 font-medium text-blue-700">OT</th>
                                    <th className="text-right px-2 py-1 font-medium text-blue-700">Eksik</th>
                                    <th className="text-right px-2 py-1 font-medium text-blue-700">Mola</th>
                                    <th className="text-left px-2 py-1 font-medium text-blue-700">Kaynak</th>
                                    <th className="text-left px-2 py-1 font-medium text-blue-700">Durum</th>
                                    <th className="text-center px-2 py-1 font-medium text-blue-700">OT Kayit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {db.records.map(rec => (
                                    <tr key={rec.id} className={`border-b border-blue-100 ${rec.is_overtime_record ? 'bg-purple-50' : ''}`}>
                                        <td className="px-2 py-1 font-mono text-gray-500">#{rec.id}</td>
                                        <td className="px-2 py-1 font-mono">{rec.check_in || '-'}</td>
                                        <td className="px-2 py-1 font-mono">{rec.check_out || '-'}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.normal_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.ot_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.missing_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.break_seconds)}</td>
                                        <td className="px-2 py-1">
                                            <span className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">{rec.source || '-'}</span>
                                        </td>
                                        <td className="px-2 py-1"><StatusBadge status={rec.status} /></td>
                                        <td className="text-center px-2 py-1">
                                            {rec.is_overtime_record && (
                                                <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">OT</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recalculated Records */}
            {rc.records && rc.records.length > 0 && (
                <div>
                    <h5 className="font-semibold text-gray-700 mb-1">Hesaplanan Kayitlar ({rc.records.length})</h5>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-emerald-50">
                                    <th className="text-left px-2 py-1 font-medium text-emerald-700">ID</th>
                                    <th className="text-left px-2 py-1 font-medium text-emerald-700">Giris</th>
                                    <th className="text-left px-2 py-1 font-medium text-emerald-700">Cikis</th>
                                    <th className="text-right px-2 py-1 font-medium text-emerald-700">Normal</th>
                                    <th className="text-right px-2 py-1 font-medium text-emerald-700">OT</th>
                                    <th className="text-right px-2 py-1 font-medium text-emerald-700">Eksik</th>
                                    <th className="text-right px-2 py-1 font-medium text-emerald-700">Mola</th>
                                    <th className="text-left px-2 py-1 font-medium text-emerald-700">Kaynak</th>
                                    <th className="text-left px-2 py-1 font-medium text-emerald-700">Durum</th>
                                    <th className="text-center px-2 py-1 font-medium text-emerald-700">OT Kayit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rc.records.map(rec => (
                                    <tr key={rec.id} className={`border-b border-emerald-100 ${rec.is_overtime_record ? 'bg-purple-50' : ''}`}>
                                        <td className="px-2 py-1 font-mono text-gray-500">#{rec.id}</td>
                                        <td className="px-2 py-1 font-mono">{rec.check_in || '-'}</td>
                                        <td className="px-2 py-1 font-mono">{rec.check_out || '-'}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.normal_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.ot_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.missing_seconds)}</td>
                                        <td className="text-right px-2 py-1 font-mono">{fmtSec(rec.break_seconds)}</td>
                                        <td className="px-2 py-1">
                                            <span className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">{rec.source || '-'}</span>
                                        </td>
                                        <td className="px-2 py-1"><StatusBadge status={rec.status} /></td>
                                        <td className="text-center px-2 py-1">
                                            {rec.is_overtime_record && (
                                                <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">OT</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recalc Error */}
            {rc.error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    Hesaplama hatasi: {rc.error}
                </div>
            )}

            {/* Approved OT */}
            {day.approved_ot && (
                <div>
                    <h5 className="font-semibold text-gray-700 mb-1">Onayli Ek Mesai ({day.approved_ot.count})</h5>
                    <div className="flex flex-wrap gap-2">
                        {day.approved_ot.items.map((item, i) => (
                            <div key={i} className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-[11px]">
                                <span className="font-mono">{item.start}-{item.end}</span>
                                <span className="mx-1 text-gray-400">|</span>
                                <span className="font-medium">{fmtSec(item.seconds)}</span>
                                <span className="mx-1 text-gray-400">|</span>
                                <span className="text-purple-600">{item.source}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leave */}
            {day.leave && (
                <div className="flex flex-wrap gap-2">
                    {day.leave.map((lv, i) => (
                        <span key={i} className="px-2 py-1 bg-sky-50 border border-sky-200 rounded text-[11px]">
                            Izin: {lv.type} ({lv.start} - {lv.end})
                        </span>
                    ))}
                </div>
            )}

            {/* Health Report */}
            {day.health_report && (
                <div className="flex flex-wrap gap-2">
                    {day.health_report.map((hr, i) => (
                        <span key={i} className="px-2 py-1 bg-pink-50 border border-pink-200 rounded text-[11px]">
                            Rapor: {hr.type} ({hr.start} - {hr.end})
                        </span>
                    ))}
                </div>
            )}

            {/* Debug Logs */}
            {day.debug_logs && day.debug_logs.length > 0 && (
                <details className="mt-2">
                    <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-700">
                        Debug Loglari ({day.debug_logs.length})
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-900 text-green-400 rounded text-[10px] max-h-48 overflow-auto font-mono">
                        {day.debug_logs.join('\n')}
                    </pre>
                </details>
            )}
        </div>
    );
}
