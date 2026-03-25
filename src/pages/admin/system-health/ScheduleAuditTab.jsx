import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

export default function ScheduleAuditTab() {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [allMode, setAllMode] = useState(false);

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
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const body = { year, month };
            if (allMode) {
                body.employee_id = 'ALL';
            } else if (selectedEmployee) {
                body.employee_id = selectedEmployee.id;
            } else {
                setError('Calisan secin veya Tum Calisanlar modunu aktif edin.');
                setLoading(false);
                return;
            }
            const resp = await api.post('/system/health-check/schedule-audit/', body, { timeout: 300000 });
            setResult(resp.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Denetim basarisiz.');
        } finally {
            setLoading(false);
        }
    };

    const downloadTxt = () => {
        if (!result?.text_log) return;
        const blob = new Blob([result.text_log], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `takvim_denetim_${year}_${String(month).padStart(2, '0')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="w-6 h-6 text-blue-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Takvim Denetim</h3>
                    <p className="text-xs text-gray-500">
                        Gun gun: get_day_rules (takvim kurallari) vs TargetService (hedef) karsilastirmasi
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                {/* Mode toggle */}
                <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={allMode} onChange={e => setAllMode(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="font-medium">Tum Calisanlar</span>
                    </label>
                </div>

                {/* Employee Search */}
                {!allMode && (
                    <div className="relative flex-1 min-w-[240px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Calisan</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input type="text"
                                value={selectedEmployee ? selectedEmployee.name : searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setSelectedEmployee(null); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Calisan ara..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            {selectedEmployee && (
                                <button onClick={() => { setSelectedEmployee(null); setSearchTerm(''); }}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">&times;</button>
                            )}
                        </div>
                        {showDropdown && !selectedEmployee && searchTerm.length >= 1 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredEmployees.slice(0, 20).map(emp => (
                                    <button key={emp.id}
                                        onClick={() => { setSelectedEmployee(emp); setSearchTerm(''); setShowDropdown(false); }}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">
                                        <span className="font-medium text-gray-800">{emp.name}</span>
                                        {emp.department && <span className="ml-2 text-xs text-gray-400">({emp.department})</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Year/Month */}
                <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Yil</label>
                    <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || 2026)}
                        min={2024} max={2030}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ay</label>
                    <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <option key={m} value={m}>
                                {['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'][m-1]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Run Button */}
                <button onClick={runAudit} disabled={loading}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {loading ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Denetleniyor...</>
                    ) : (
                        <><MagnifyingGlassIcon className="w-4 h-4" /> Denetle</>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" /> {error}
                </div>
            )}

            {/* Results */}
            {result && result.results && (
                <div className="space-y-6">
                    {/* TXT Download */}
                    <div className="flex justify-end">
                        <button onClick={downloadTxt}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 flex items-center gap-2">
                            <DocumentArrowDownIcon className="w-4 h-4" /> TXT Indir
                        </button>
                    </div>

                    {/* Per employee */}
                    {result.results.map(emp => (
                        <div key={emp.employee_id} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Header */}
                            <div className={`p-4 ${emp.mismatch_count > 0 ? 'bg-amber-50' : 'bg-green-50'} flex items-center justify-between`}>
                                <div>
                                    <span className="font-bold text-gray-800">{emp.employee_name}</span>
                                    <span className="ml-2 text-xs text-gray-500">{emp.department}</span>
                                    <div className="text-xs text-gray-500 mt-1">
                                        WS: {emp.work_schedule} | FC: {emp.fiscal_calendar}
                                    </div>
                                </div>
                                <div className="text-right text-xs">
                                    <div>Takvim: <span className="font-bold">{emp.total_rules_h}h</span></div>
                                    <div>Hedef: <span className="font-bold">{emp.total_target_h}h</span></div>
                                    {emp.mws_target_h && <div>MWS: <span className="font-bold">{emp.mws_target_h}h</span></div>}
                                    {emp.mismatch_count > 0 && (
                                        <div className="mt-1 px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-bold inline-block">
                                            {emp.mismatch_count} fark
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Day table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-600">
                                            <th className="px-3 py-2 text-left">Tarih</th>
                                            <th className="px-3 py-2 text-left">Gun</th>
                                            <th className="px-3 py-2 text-left">Vardiya</th>
                                            <th className="px-3 py-2 text-left">Ogle</th>
                                            <th className="px-3 py-2 text-center">Mola</th>
                                            <th className="px-3 py-2 text-right">Brut</th>
                                            <th className="px-3 py-2 text-right">Kural</th>
                                            <th className="px-3 py-2 text-right">Hedef</th>
                                            <th className="px-3 py-2 text-right">Fark</th>
                                            <th className="px-3 py-2 text-left">Not</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emp.days.map(day => {
                                            const bgClass = day.mismatch ? 'bg-amber-50' : day.is_off ? 'bg-gray-50' : '';
                                            return (
                                                <tr key={day.date} className={`border-b border-gray-100 ${bgClass}`}>
                                                    <td className="px-3 py-1.5 font-mono">{day.date}</td>
                                                    <td className="px-3 py-1.5">{day.weekday}</td>
                                                    <td className="px-3 py-1.5 font-mono text-gray-700">{day.shift || '-'}</td>
                                                    <td className="px-3 py-1.5 font-mono text-gray-500">{day.lunch_window || '-'}</td>
                                                    <td className="px-3 py-1.5 text-center">{day.break_allowance_min}dk</td>
                                                    <td className="px-3 py-1.5 text-right font-mono">{day.shift_gross_h}h</td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-bold">{day.net_rules_h}h</td>
                                                    <td className={`px-3 py-1.5 text-right font-mono font-bold ${day.mismatch ? 'text-red-600' : ''}`}>{day.target_h}h</td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-red-600">{day.diff_s ? `${day.diff_s}s` : ''}</td>
                                                    <td className="px-3 py-1.5 text-gray-500">
                                                        {day.holiday && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">{day.holiday}</span>}
                                                        {day.is_off && !day.holiday && <span className="text-gray-400">Tatil</span>}
                                                        {day.mismatch && <ExclamationTriangleIcon className="w-3 h-3 text-amber-500 inline ml-1" />}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
