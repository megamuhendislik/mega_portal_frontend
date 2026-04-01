import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';

const STATUS_COLORS = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    POTENTIAL: 'bg-purple-100 text-purple-700',
};

const TYPE_COLORS = {
    LEAVE: 'bg-blue-100 text-blue-700',
    EXTERNAL_DUTY: 'bg-indigo-100 text-indigo-700',
    OVERTIME: 'bg-amber-100 text-amber-700',
    CARDLESS_ENTRY: 'bg-purple-100 text-purple-700',
    MEAL: 'bg-emerald-100 text-emerald-700',
    HEALTH_REPORT: 'bg-red-100 text-red-700',
    HOSPITAL_VISIT: 'bg-rose-100 text-rose-700',
    SPECIAL_LEAVE: 'bg-indigo-100 text-indigo-700',
};

export default function RequestHealthTab() {
    const [allTeamData, setAllTeamData] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showOrphans, setShowOrphans] = useState(false);
    const [diagnosticResult, setDiagnosticResult] = useState(null);
    const [diagLoading, setDiagLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamRes, leaveRes] = await Promise.allSettled([
                api.get('/team-requests/all_team/'),
                api.get('/leave/requests/', { params: { page_size: 9999 } }),
            ]);
            if (teamRes.status === 'fulfilled') setAllTeamData(teamRes.value.data || []);
            if (leaveRes.status === 'fulfilled') {
                const d = leaveRes.value.data;
                setLeaveRequests(d?.results || d || []);
            }
        } catch (e) {
            console.error('RequestHealthTab fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Stats
    const stats = useMemo(() => {
        const byType = {};
        const byStatus = {};
        const externalDuty = { total: 0, pending: 0, approved: 0, rejected: 0 };

        allTeamData.forEach(r => {
            byType[r.type] = (byType[r.type] || 0) + 1;
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            if (r.type === 'EXTERNAL_DUTY') {
                externalDuty.total++;
                if (r.status === 'PENDING') externalDuty.pending++;
                if (r.status === 'APPROVED') externalDuty.approved++;
                if (r.status === 'REJECTED') externalDuty.rejected++;
            }
        });

        return { byType, byStatus, externalDuty, total: allTeamData.length };
    }, [allTeamData]);

    // Filtered data
    const filtered = useMemo(() => {
        return allTeamData.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (searchId && !String(r.request_id || r.id).includes(searchId)) return false;
            if (searchName) {
                const s = searchName.toLowerCase();
                if (!r.employee_name?.toLowerCase().includes(s)) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
    }, [allTeamData, typeFilter, statusFilter, searchId, searchName]);

    // Orphan check: leave requests in DB but not in all_team
    const orphanRequests = useMemo(() => {
        const teamIds = new Set(allTeamData.filter(r => r.type === 'LEAVE' || r.type === 'EXTERNAL_DUTY').map(r => r.request_id || r.id));
        return leaveRequests.filter(lr => !teamIds.has(lr.id));
    }, [allTeamData, leaveRequests]);

    // Diagnostic: check specific request
    const runDiagnostic = async (reqId) => {
        if (!reqId) return;
        setDiagLoading(true);
        setDiagnosticResult(null);
        try {
            // Check in all_team data
            const inAllTeam = allTeamData.find(r => (r.request_id || r.id) === parseInt(reqId));

            // Check in leave requests
            let fromApi = null;
            try {
                const res = await api.get(`/leave/requests/${reqId}/`);
                fromApi = res.data;
            } catch (e) {
                if (e.response?.status === 404) fromApi = { error: 'NOT_FOUND' };
                else fromApi = { error: e.message };
            }

            // Check attendance records for this request
            let attendanceRecords = [];
            try {
                const empId = fromApi?.employee || fromApi?.employee_detail?.id || inAllTeam?.employee_id;
                if (empId && fromApi?.start_date) {
                    const attRes = await api.get('/attendance/', {
                        params: { employee_id: empId, start_date: fromApi.start_date, end_date: fromApi.end_date || fromApi.start_date }
                    });
                    attendanceRecords = attRes.data?.results || attRes.data || [];
                }
            } catch { }

            setDiagnosticResult({
                requestId: reqId,
                inAllTeam: inAllTeam || null,
                fromApi: fromApi,
                attendanceRecords,
                checks: {
                    existsInDb: fromApi && !fromApi.error,
                    existsInAllTeam: !!inAllTeam,
                    hasCorrectType: inAllTeam?.type || 'N/A',
                    status: fromApi?.status || inAllTeam?.status || 'UNKNOWN',
                    canOverride: inAllTeam?.can_override ?? 'N/A',
                    hasAttendance: attendanceRecords.length > 0,
                    attendanceCount: attendanceRecords.length,
                    employeeName: fromApi?.employee_detail?.full_name || inAllTeam?.employee_name || 'Bilinmiyor',
                    startDate: fromApi?.start_date || inAllTeam?.start_date || '-',
                    endDate: fromApi?.end_date || inAllTeam?.end_date || '-',
                    requestType: fromApi?.request_type_detail?.name || inAllTeam?.leave_type_name || '-',
                    category: fromApi?.request_type_detail?.category || inAllTeam?.request_type_category || '-',
                },
            });
        } catch (e) {
            setDiagnosticResult({ error: e.message });
        } finally {
            setDiagLoading(false);
        }
    };

    const types = [...new Set(allTeamData.map(r => r.type))].sort();
    const statuses = [...new Set(allTeamData.map(r => r.status))].sort();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Talep Sağlığı & Kontrolü</h2>
                <button onClick={fetchData} disabled={loading}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50">
                    {loading ? 'Yükleniyor...' : 'Yenile'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-2xl font-black text-slate-800">{stats.total}</div>
                    <div className="text-xs text-slate-500 font-bold">Toplam Talep</div>
                </div>
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300"
                        onClick={() => setTypeFilter(type)}>
                        <div className="text-2xl font-black text-slate-800">{count}</div>
                        <div className="text-xs font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${TYPE_COLORS[type] || 'bg-slate-100 text-slate-700'}`}>{type}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* External Duty Focus */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
                <h3 className="text-sm font-bold text-indigo-800 mb-2">Dış Görev (EXTERNAL_DUTY) Özet</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                    <div><div className="text-xl font-black text-indigo-700">{stats.externalDuty.total}</div><div className="text-[10px] text-slate-500">Toplam</div></div>
                    <div><div className="text-xl font-black text-amber-600">{stats.externalDuty.pending}</div><div className="text-[10px] text-slate-500">Bekleyen</div></div>
                    <div><div className="text-xl font-black text-emerald-600">{stats.externalDuty.approved}</div><div className="text-[10px] text-slate-500">Onaylı</div></div>
                    <div><div className="text-xl font-black text-red-600">{stats.externalDuty.rejected}</div><div className="text-[10px] text-slate-500">Reddedilen</div></div>
                </div>
            </div>

            {/* Diagnostic Tool */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Talep Teşhis Aracı</h3>
                <div className="flex gap-2 mb-3">
                    <input
                        type="number" placeholder="Talep ID girin (ör: 350)"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        onKeyDown={e => e.key === 'Enter' && runDiagnostic(e.target.value)}
                    />
                    <button onClick={() => {
                        const input = document.querySelector('input[type="number"]');
                        runDiagnostic(input?.value);
                    }} disabled={diagLoading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {diagLoading ? 'Kontrol...' : 'Kontrol Et'}
                    </button>
                </div>

                {diagnosticResult && !diagnosticResult.error && (
                    <div className="space-y-3">
                        <div className="text-sm font-bold text-slate-700">
                            Talep #{diagnosticResult.requestId} — {diagnosticResult.checks.employeeName}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                                { label: 'DB\'de var mı?', value: diagnosticResult.checks.existsInDb, ok: true },
                                { label: 'all_team\'de var mı?', value: diagnosticResult.checks.existsInAllTeam, ok: true },
                                { label: 'Tip', value: diagnosticResult.checks.hasCorrectType },
                                { label: 'Kategori', value: diagnosticResult.checks.category },
                                { label: 'Durum', value: diagnosticResult.checks.status },
                                { label: 'Karar Değiştir?', value: String(diagnosticResult.checks.canOverride) },
                                { label: 'Attendance var mı?', value: diagnosticResult.checks.hasAttendance, ok: true },
                                { label: 'Attendance sayısı', value: diagnosticResult.checks.attendanceCount },
                                { label: 'Talep Türü', value: diagnosticResult.checks.requestType },
                                { label: 'Başlangıç', value: diagnosticResult.checks.startDate },
                                { label: 'Bitiş', value: diagnosticResult.checks.endDate },
                            ].map((item, i) => (
                                <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                                    item.ok !== undefined
                                        ? (item.value ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')
                                        : 'bg-slate-50 border-slate-200'
                                }`}>
                                    <div className="text-slate-500 font-bold">{item.label}</div>
                                    <div className={`font-black ${
                                        item.ok !== undefined ? (item.value ? 'text-emerald-700' : 'text-red-700') : 'text-slate-800'
                                    }`}>
                                        {item.ok !== undefined ? (item.value ? 'EVET' : 'HAYIR') : String(item.value)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Raw data */}
                        <details className="mt-2">
                            <summary className="text-xs text-slate-500 cursor-pointer font-bold">Ham Veri (all_team)</summary>
                            <pre className="mt-1 p-2 bg-slate-100 rounded text-[10px] overflow-x-auto max-h-48">
                                {JSON.stringify(diagnosticResult.inAllTeam, null, 2)}
                            </pre>
                        </details>
                        <details>
                            <summary className="text-xs text-slate-500 cursor-pointer font-bold">Ham Veri (API)</summary>
                            <pre className="mt-1 p-2 bg-slate-100 rounded text-[10px] overflow-x-auto max-h-48">
                                {JSON.stringify(diagnosticResult.fromApi, null, 2)}
                            </pre>
                        </details>
                        {diagnosticResult.attendanceRecords.length > 0 && (
                            <details>
                                <summary className="text-xs text-slate-500 cursor-pointer font-bold">Attendance Kayıtları ({diagnosticResult.attendanceRecords.length})</summary>
                                <pre className="mt-1 p-2 bg-slate-100 rounded text-[10px] overflow-x-auto max-h-48">
                                    {JSON.stringify(diagnosticResult.attendanceRecords, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                )}
                {diagnosticResult?.error && (
                    <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">{diagnosticResult.error}</div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <input placeholder="ID ara..." value={searchId} onChange={e => setSearchId(e.target.value)}
                    className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs" />
                <input placeholder="İsim ara..." value={searchName} onChange={e => setSearchName(e.target.value)}
                    className="w-40 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs" />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold">
                    <option value="ALL">Tüm Tipler</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold">
                    <option value="ALL">Tüm Durumlar</option>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={showOrphans} onChange={e => setShowOrphans(e.target.checked)} className="rounded" />
                    Yetim Talepler ({orphanRequests.length})
                </label>
                <span className="text-xs text-slate-400 ml-auto">{filtered.length} / {stats.total} talep</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 font-bold text-slate-500">ID</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Tip</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Çalışan</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Tarih</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Saat</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Durum</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Onaylayan</th>
                                <th className="px-3 py-2 font-bold text-slate-500">Override</th>
                                <th className="px-3 py-2 font-bold text-slate-500">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(showOrphans ? orphanRequests.map(r => ({ ...r, _orphan: true, request_id: r.id })) : filtered).slice(0, 200).map(r => {
                                const id = r.request_id || r.id;
                                const type = r.type || r.request_type_detail?.category || 'UNKNOWN';
                                return (
                                    <tr key={`${type}-${id}`} className={`hover:bg-slate-50 ${r._orphan ? 'bg-red-50' : ''}`}>
                                        <td className="px-3 py-2 font-mono font-bold text-slate-700">{id}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_COLORS[type] || 'bg-slate-100 text-slate-600'}`}>
                                                {type}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-700 max-w-[150px] truncate">
                                            {r.employee_name || r.employee_detail?.full_name || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">{r.start_date || r.date || '-'}</td>
                                        <td className="px-3 py-2 text-slate-600">
                                            {r.start_time && r.end_time ? `${r.start_time}-${r.end_time}` : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">
                                            {r.approved_by_name || r.target_approver_name || '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {r.can_override === true && <span className="text-emerald-600 font-bold">Evet</span>}
                                            {r.can_override === false && <span className="text-slate-400">Hayır</span>}
                                            {r.can_override == null && <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => runDiagnostic(id)}
                                                className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100">
                                                Teşhis
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Durum Dağılımı</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                        <button key={status} onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                statusFilter === status ? 'ring-2 ring-blue-400' : ''
                            } ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
                            {status}: {count}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
