import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const HEALTH_BADGE = {
    OK: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
    CRITICAL: 'bg-red-100 text-red-700 border-red-300',
};

const SOURCE_COLORS = {
    CARD_READER: 'bg-blue-500',
    MANUAL: 'bg-amber-500',
    SYSTEM: 'bg-slate-500',
    SPLIT: 'bg-purple-500',
    AUTO_SPLIT: 'bg-indigo-500',
    HEALTH_REPORT: 'bg-red-500',
    HOSPITAL_VISIT: 'bg-rose-500',
    DUTY: 'bg-teal-500',
    CARDLESS: 'bg-cyan-500',
};

const STATUS_COLORS = {
    OPEN: 'bg-blue-100 text-blue-700',
    CALCULATED: 'bg-emerald-100 text-emerald-700',
    PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    AUTO_APPROVED: 'bg-teal-100 text-teal-700',
    ABSENT: 'bg-slate-100 text-slate-700',
};

export default function ServiceHealthTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEmp, setExpandedEmp] = useState(null);
    const [gateLogDate, setGateLogDate] = useState(new Date().toISOString().slice(0, 10));

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/attendance-health/');
            setData(res.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message || 'Veri alinamadi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-slate-600">Analiz yapiliyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                Hata: {error}
            </div>
        );
    }

    if (!data) return null;

    const totalSources = Object.values(data.by_source || {}).reduce((a, b) => a + b, 0) || 1;
    const totalStatuses = Object.values(data.by_status || {}).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800">Servis Sagligi - Attendance Analizi</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${HEALTH_BADGE[data.health_status] || HEALTH_BADGE.OK}`}>
                        {data.health_status}
                    </span>
                    <span className="text-sm text-slate-500">{data.date}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {loading ? 'Yukleniyor...' : 'Yenile'}
                    </button>
                    {data.health_status === 'CRITICAL' && (
                        <>
                            <button
                                onClick={async () => {
                                    if (!confirm('Duplikat AUTO_SPLIT kayıtları temizlenecek. Devam?')) return;
                                    try {
                                        const dryRes = await api.post('/system/health-check/cleanup-duplicate-splits/', { dry_run: true });
                                        const dryData = dryRes.data;
                                        if (dryData.duplicate_groups === 0 && dryData.orphan_splits === 0) {
                                            alert('Temizlenecek duplikat bulunamadı.');
                                            return;
                                        }
                                        if (!confirm(`${dryData.total_duplicates_deleted} duplikat + ${dryData.orphan_splits} yetim kayıt silinecek. Onaylıyor musunuz?`)) return;
                                        await api.post('/system/health-check/cleanup-duplicate-splits/', { dry_run: false });
                                        alert('Temizlik tamamlandı!');
                                        fetchData();
                                    } catch (e) {
                                        alert('Hata: ' + (e.response?.data?.error || e.message));
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold"
                            >
                                Duplikat Temizle
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const dryRes = await api.post('/system/health-check/nuke-and-recalc-today/', { dry_run: true });
                                        const d = dryRes.data;
                                        if (!confirm(
                                            `BUGÜN TEMİZLE + YENİDEN HESAPLA\n\n` +
                                            `${d.split_records_to_delete} SPLIT/AUTO_SPLIT kayıt silinecek\n` +
                                            `${d.spammed_notes_to_clean} spamlanmış note temizlenecek\n` +
                                            `Tüm aktif çalışanlar yeniden hesaplanacak\n\n` +
                                            `Devam edilsin mi?`
                                        )) return;
                                        const res = await api.post('/system/health-check/nuke-and-recalc-today/', { dry_run: false });
                                        alert(res.data.message);
                                        fetchData();
                                    } catch (e) {
                                        alert('Hata: ' + (e.response?.data?.error || e.message));
                                    }
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold"
                            >
                                Bugunu Temizle + Recalc
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Gate Event Log Download */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-600">Gate Event Log:</span>
                <input
                    type="date"
                    value={gateLogDate}
                    onChange={(e) => setGateLogDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                    onClick={async () => {
                        try {
                            const res = await api.get(`/system/health-check/gate-event-log/?date=${gateLogDate}&format=txt`, {
                                responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `gate_event_log_${gateLogDate}.txt`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                        } catch (err) {
                            console.error('Gate log download failed', err);
                        }
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                >
                    Gate Log Indir (TXT)
                </button>
            </div>

            {/* Issues */}
            {data.issues?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-2">Tespit Edilen Sorunlar</h3>
                    <ul className="space-y-1">
                        {data.issues.map((issue, i) => (
                            <li key={i} className="text-red-700 text-sm flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">&#9679;</span>
                                {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Toplam Kayit" value={data.total_records} color="blue" />
                <KpiCard label="Benzersiz Calisan" value={data.unique_employees} color="emerald" />
                <KpiCard label="Ort. Kayit/Calisan" value={data.avg_per_employee} color={data.avg_per_employee > 5 ? 'red' : data.avg_per_employee > 3 ? 'amber' : 'emerald'} />
                <KpiCard label="Normal Kayit" value={data.normal_records} color="slate" />
                <KpiCard label="OT Kayit" value={data.ot_records} color="purple" />
                <KpiCard label="Son 1 Saat" value={data.recent_hour_count} color={data.recent_hour_count > 100 ? 'red' : 'blue'} />
            </div>

            {/* NULL records */}
            {(data.null_checkin > 0 || data.null_checkout > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-800 mb-1">Eksik Veri</h3>
                    <div className="flex gap-6 text-sm text-amber-700">
                        <span>NULL check_in: <strong>{data.null_checkin}</strong></span>
                        <span>NULL check_out: <strong>{data.null_checkout}</strong></span>
                    </div>
                </div>
            )}

            {/* Source & Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* By Source */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Kaynak Dagilimi (Source)</h3>
                    <div className="space-y-2">
                        {Object.entries(data.by_source || {}).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                            <div key={source}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">{source || '(bos)'}</span>
                                    <span className="font-medium">{count} ({Math.round(count / totalSources * 100)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${SOURCE_COLORS[source] || 'bg-slate-400'}`}
                                        style={{ width: `${Math.round(count / totalSources * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Status */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Durum Dagilimi (Status)</h3>
                    <div className="space-y-2">
                        {Object.entries(data.by_status || {}).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
                            <div key={st}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">{st || '(bos)'}</span>
                                    <span className="font-medium">{count} ({Math.round(count / totalStatuses * 100)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-blue-500"
                                        style={{ width: `${Math.round(count / totalStatuses * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Duplicates */}
            {data.potential_duplicates?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-3">Duplikat Kayitlar ({data.potential_duplicates.length} grup)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-red-700 border-b border-red-200">
                                    <th className="py-2 pr-4">Calisan</th>
                                    <th className="py-2 pr-4">Check-in</th>
                                    <th className="py-2">Tekrar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.potential_duplicates.map((d, i) => (
                                    <tr key={i} className="border-b border-red-100">
                                        <td className="py-2 pr-4">{d.employee_name} (#{d.employee_id})</td>
                                        <td className="py-2 pr-4 font-mono text-xs">{d.check_in ? new Date(d.check_in).toLocaleTimeString('tr-TR') : 'NULL'}</td>
                                        <td className="py-2 font-bold text-red-700">{d.count}x</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Employees Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-700 mb-3">En Cok Kayit - Top 20 Calisan</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-200">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Calisan</th>
                                <th className="py-2 pr-4">ID</th>
                                <th className="py-2 pr-4">Kayit Sayisi</th>
                                <th className="py-2">Detay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.top_employees || []).map((emp, i) => (
                                <React.Fragment key={emp.emp_id}>
                                    <tr className={`border-b border-slate-100 ${emp.cnt > 5 ? 'bg-red-50' : emp.cnt > 3 ? 'bg-amber-50' : ''}`}>
                                        <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                                        <td className="py-2 pr-4 font-medium">{emp.full_name}</td>
                                        <td className="py-2 pr-4 text-slate-500">#{emp.emp_id}</td>
                                        <td className="py-2 pr-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${emp.cnt > 5 ? 'bg-red-100 text-red-700' : emp.cnt > 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {emp.cnt}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            <button
                                                onClick={() => setExpandedEmp(expandedEmp === emp.emp_id ? null : emp.emp_id)}
                                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                                            >
                                                {expandedEmp === emp.emp_id ? 'Gizle' : 'Goster'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedEmp === emp.emp_id && emp.records && (
                                        <tr>
                                            <td colSpan={5} className="p-0">
                                                <div className="bg-slate-50 p-3 border-b border-slate-200">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="text-slate-500">
                                                                <th className="py-1 pr-2 text-left">ID</th>
                                                                <th className="py-1 pr-2 text-left">Source</th>
                                                                <th className="py-1 pr-2 text-left">Status</th>
                                                                <th className="py-1 pr-2 text-left">Check-in</th>
                                                                <th className="py-1 pr-2 text-left">Check-out</th>
                                                                <th className="py-1 pr-2 text-left">OT?</th>
                                                                <th className="py-1 text-left">Olusturulma</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {emp.records.map((r) => (
                                                                <tr key={r.id} className="border-b border-slate-100">
                                                                    <td className="py-1 pr-2 font-mono">{r.id}</td>
                                                                    <td className="py-1 pr-2">
                                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${SOURCE_COLORS[r.source] ? 'text-white' : 'bg-slate-200 text-slate-700'}`}
                                                                            style={SOURCE_COLORS[r.source] ? { backgroundColor: SOURCE_COLORS[r.source]?.replace('bg-', '') } : {}}>
                                                                            {r.source || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1 pr-2">
                                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                                                                            {r.status || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1 pr-2 font-mono">{r.check_in ? new Date(r.check_in).toLocaleTimeString('tr-TR') : '-'}</td>
                                                                    <td className="py-1 pr-2 font-mono">{r.check_out ? new Date(r.check_out).toLocaleTimeString('tr-TR') : '-'}</td>
                                                                    <td className="py-1 pr-2">{r.is_overtime_record ? 'Evet' : 'Hayir'}</td>
                                                                    <td className="py-1 font-mono">{r.created_at ? new Date(r.created_at).toLocaleTimeString('tr-TR') : '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, color }) {
    const colorMap = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        slate: 'bg-slate-50 border-slate-200 text-slate-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs mt-1 opacity-75">{label}</div>
        </div>
    );
}
