import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Database, Calculator, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const AttendanceDebugger = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [debugData, setDebugData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employees/');
            setEmployees(res.data.results || res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const runDebug = async () => {
        if (!selectedEmp) return;
        setLoading(true);
        setDebugData(null);
        try {
            const res = await api.post('/attendance/debug_stats/', {
                employee_id: selectedEmp,
                month: month,
                year: year
            });
            setDebugData(res.data);
        } catch (err) {
            console.error(err);
            alert('Debug failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatSeconds = (sec) => (sec / 3600).toFixed(2) + ' sa';

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Database className="text-emerald-400" />
                    Attendance Debugger
                </h1>
                <p className="text-slate-400 mt-2">
                    Inspect raw database records vs. live calculations to diagnose "NaN" or incorrect values.
                </p>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee</label>
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-medium w-64"
                        value={selectedEmp}
                        onChange={(e) => setSelectedEmp(e.target.value)}
                    >
                        <option value="">Select Employee...</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Period</label>
                    <div className="flex gap-2">
                        <input
                            type="number" value={month} onChange={(e) => setMonth(e.target.value)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-center font-bold"
                            min="1" max="12"
                        />
                        <input
                            type="number" value={year} onChange={(e) => setYear(e.target.value)}
                            className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-center font-bold"
                        />
                    </div>
                </div>
                <button
                    onClick={runDebug}
                    disabled={loading || !selectedEmp}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <RefreshCw className="animate-spin" /> : <Search size={18} />}
                    Analyze Records
                </button>
            </div>

            {/* Results */}
            {debugData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    {/* Error Banner */}
                    {debugData.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold">Debug Error</h3>
                                <p className="text-sm">{debugData.details}</p>
                                <pre className="text-xs bg-red-100 p-2 mt-2 rounded overflow-auto max-h-32">
                                    {debugData.trace}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* High Level Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <Database size={16} /> Database Summary
                            </h3>
                            {!debugData.db_summary || debugData.db_summary === "NO_RECORD" ? (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg font-bold flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    No Monthly Summary Found in DB!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Target</span>
                                        <span className="font-mono font-bold">{formatSeconds(debugData.db_summary?.target_seconds || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Completed</span>
                                        <span className="font-mono font-bold text-emerald-600">{formatSeconds(debugData.db_summary?.completed_seconds || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Missing</span>
                                        <span className="font-mono font-bold text-red-500">{formatSeconds(debugData.db_summary?.missing_seconds || 0)}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 text-right">
                                        Last Updated: {debugData.db_summary?.updated_at ? new Date(debugData.db_summary.updated_at).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <Calculator size={16} /> Live Calculation
                            </h3>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-500">Calculated Period Target</span>
                                <span className="font-mono font-bold text-blue-600">{formatSeconds(debugData.live_calc?.target_seconds || 0)}</span>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
                                <strong>Comparison:</strong> If DB Target ({debugData.db_summary && debugData.db_summary !== "NO_RECORD" ? formatSeconds(debugData.db_summary.target_seconds || 0) : 'N/A'}) differs from Live Target ({formatSeconds(debugData.live_calc?.target_seconds || 0)}), you need to run "Recalculate All".
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <CheckCircle size={16} /> Configuration
                            </h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex justify-between"><span className="text-slate-500">Schedule:</span> <span className="font-bold">{debugData.schedule || 'Unknown'}</span></li>
                                <li className="flex justify-between"><span className="text-slate-500">Period:</span> <span className="font-mono text-xs">{debugData.period || 'Unknown'}</span></li>
                                <li className="flex justify-between"><span className="text-slate-500">Leaves:</span> <span className="font-bold">{(debugData.leaves || []).length} Found</span></li>
                            </ul>
                        </div>
                    </div>

                    {/* Raw Logs Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                            Raw Daily Logs (DB)
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Total Sec</th>
                                        <th className="px-4 py-3 text-emerald-600">Normal</th>
                                        <th className="px-4 py-3 text-blue-600">Overtime</th>
                                        <th className="px-4 py-3 text-red-500">Missing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!debugData.raw_logs || debugData.raw_logs.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400">No logs found for this period.</td></tr>
                                    ) : (
                                        debugData.raw_logs.map((log, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono">{log.work_date}</td>
                                                <td className="px-4 py-3 font-bold">{log.total_seconds}</td>
                                                <td className="px-4 py-3 text-emerald-600">{log.normal_seconds}</td>
                                                <td className="px-4 py-3 text-blue-600">{log.overtime_seconds}</td>
                                                <td className="px-4 py-3 text-red-500">{log.missing_seconds}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Raw JSON Dump */}
                    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-800 text-slate-400 text-xs font-mono border-b border-slate-700">
                            RAW JSON RESPONSE
                        </div>
                        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-96">
                            {JSON.stringify(debugData, null, 2)}
                        </pre>
                    </div>

                </div>
            )}
        </div>
    );
};

export default AttendanceDebugger;
