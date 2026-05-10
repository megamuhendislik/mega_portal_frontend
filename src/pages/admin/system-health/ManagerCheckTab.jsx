import React, { useEffect, useMemo, useState } from 'react';
import {
    UserGroupIcon,
    IdentificationIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const PAGE_SIZE = 50;

const STATUS_META = {
    OK: { label: '✅ OK', color: 'bg-emerald-100 text-emerald-800' },
    NO_PRIMARY: { label: '⚠ PRIMARY yok', color: 'bg-amber-100 text-amber-800' },
    NO_MANAGER_AT_ALL: { label: '🔴 Hiç yönetici yok', color: 'bg-rose-100 text-rose-800' },
};

export default function ManagerCheckTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [detailEmpId, setDetailEmpId] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true); setError(null);
        try {
            const r = await api.get('/system/health-check/manager-check/');
            setData(r.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const fetchDetail = async (empId) => {
        setDetailEmpId(empId);
        setDetailLoading(true);
        setDetailData(null);
        try {
            const r = await api.get(`/system/health-check/manager-check/${empId}/detail/`);
            setDetailData(r.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const downloadTxt = async () => {
        try {
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const resp = await fetch(`${baseURL}/system/health-check/manager-check/txt/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            a.download = `manager_check_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        } catch (e) {
            setError(`TXT rapor indirilemedi: ${e.message || e}`);
        }
    };

    // Departman listesi (unique)
    const departments = useMemo(() => {
        if (!data?.rows) return [];
        const set = new Set(data.rows.map(r => r.department).filter(Boolean));
        return Array.from(set).sort();
    }, [data]);

    const filtered = useMemo(() => {
        if (!data?.rows) return [];
        return data.rows.filter(r => {
            if (filterStatus !== 'all' && r.status !== filterStatus) return false;
            if (filterDept !== 'all' && r.department !== filterDept) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!(r.employee_name || '').toLowerCase().includes(q) &&
                    !(r.department || '').toLowerCase().includes(q) &&
                    !(r.effective_approver_name || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [data, filterStatus, filterDept, search]);

    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (loading && !data) return <div className="p-6 text-center text-gray-500"><ArrowPathIcon className="w-8 h-8 mx-auto animate-spin" />Yükleniyor…</div>;
    if (error) return <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>;
    if (!data) return null;

    const { summary } = data;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <IdentificationIcon className="w-6 h-6 text-indigo-600" />
                        Yönetici Check
                    </h2>
                    <p className="text-sm text-gray-500">Tüm aktif çalışanların yönetici durumunu denetle. Tıklayınca detay drill-down açılır.</p>
                </div>
                <button onClick={fetchData} disabled={loading}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1">
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Toplam" value={summary.total} color="gray" onClick={() => { setFilterStatus('all'); setPage(1); }} />
                <StatCard label="OK" value={summary.ok} color="emerald" onClick={() => { setFilterStatus('OK'); setPage(1); }} />
                <StatCard label="PRIMARY yok" value={summary.no_primary} color="amber" onClick={() => { setFilterStatus('NO_PRIMARY'); setPage(1); }} />
                <StatCard label="Hiç yönetici yok" value={summary.no_manager_at_all} color="rose" onClick={() => { setFilterStatus('NO_MANAGER_AT_ALL'); setPage(1); }} />
            </div>

            {/* Filtreler */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                    {[['all', 'Hepsi'], ['OK', 'OK'], ['NO_PRIMARY', 'PRIMARY yok'], ['NO_MANAGER_AT_ALL', 'Hiç yok']].map(([k, lbl]) => (
                        <button key={k} onClick={() => { setFilterStatus(k); setPage(1); }}
                            className={`px-3 py-1 rounded text-xs font-medium ${filterStatus === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                            {lbl}
                        </button>
                    ))}
                </div>
                <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}
                    className="px-2 py-1 border rounded text-sm">
                    <option value="all">Tüm departmanlar</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex-1 min-w-[200px] flex items-center gap-1 px-2 py-1 border rounded">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Çalışan / departman / approver ara…"
                        className="flex-1 outline-none text-sm" />
                </div>
            </div>

            {/* Tablo */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">Çalışan</th>
                                <th className="px-3 py-2 text-left">Departman</th>
                                <th className="px-3 py-2 text-left">Pozisyon</th>
                                <th className="px-3 py-2 text-center">PRIMARY</th>
                                <th className="px-3 py-2 text-center">SECONDARY</th>
                                <th className="px-3 py-2 text-left">Effective Approver</th>
                                <th className="px-3 py-2 text-left">reports_to</th>
                                <th className="px-3 py-2 text-left">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map(r => {
                                const meta = STATUS_META[r.status] || STATUS_META.OK;
                                return (
                                    <tr key={r.employee_id}
                                        onClick={() => fetchDetail(r.employee_id)}
                                        className="hover:bg-indigo-50 cursor-pointer">
                                        <td className="px-3 py-2 font-medium text-indigo-700">{r.employee_name}</td>
                                        <td className="px-3 py-2 text-gray-600">{r.department || '—'}</td>
                                        <td className="px-3 py-2 text-gray-600">{r.job_position || '—'}</td>
                                        <td className="px-3 py-2 text-center">
                                            {r.primary_count === 0
                                                ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold">0</span>
                                                : r.primary_count}
                                        </td>
                                        <td className="px-3 py-2 text-center">{r.secondary_count}</td>
                                        <td className="px-3 py-2">
                                            {r.effective_approver_name
                                                ? r.effective_approver_name
                                                : <span className="text-gray-400 italic">(yok)</span>}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{r.reports_to_name || '—'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${meta.color}`}>{meta.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {pageRows.length === 0 && (
                                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Sonuç yok</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-2 flex items-center justify-between text-xs border-t bg-gray-50">
                        <span>{filtered.length} kayıt</span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)}
                                className="px-2 py-1 border rounded disabled:opacity-30">Önceki</button>
                            <span className="px-2 py-1">{page} / {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
                                className="px-2 py-1 border rounded disabled:opacity-30">Sonraki</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-3 flex items-center gap-2 shadow-lg">
                <button onClick={downloadTxt}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1">
                    <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                </button>
                <div className="flex-1" />
                <button onClick={fetchData} disabled={loading}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1 disabled:opacity-50">
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
                </button>
            </div>

            {/* Drill-down panel */}
            {detailEmpId && (
                <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setDetailEmpId(null); setDetailData(null); }}>
                    <div onClick={e => e.stopPropagation()}
                        className="absolute right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl overflow-y-auto p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                Yönetici Detayı
                            </h3>
                            <button onClick={() => { setDetailEmpId(null); setDetailData(null); }}
                                className="p-1 hover:bg-gray-100 rounded">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {detailLoading && <div className="text-center py-8 text-gray-500"><ArrowPathIcon className="w-6 h-6 mx-auto animate-spin" />Yükleniyor…</div>}
                        {detailData && (
                            <div className="space-y-4 text-sm">
                                <div className="bg-indigo-50 p-3 rounded">
                                    <div className="font-bold text-indigo-900">{detailData.employee.name}</div>
                                    <div className="text-xs text-indigo-700">{detailData.employee.department || '—'} · {detailData.employee.job_position || '—'}</div>
                                </div>
                                {detailData.warnings?.length > 0 && (
                                    <div className="bg-rose-50 border border-rose-200 rounded p-3">
                                        {detailData.warnings.map((w, i) => (
                                            <div key={i} className="text-rose-800 text-xs">⚠ {w.msg}</div>
                                        ))}
                                    </div>
                                )}
                                <Section title={`PRIMARY (${detailData.primary_managers?.length || 0})`} items={detailData.primary_managers}
                                    render={m => <span>{m.name} <span className="text-xs text-gray-500">· {m.department || '—'}</span> <span className="text-xs text-gray-400">{m.assigned_date}</span></span>} />
                                <Section title={`SECONDARY (${detailData.secondary_managers?.length || 0})`} items={detailData.secondary_managers}
                                    render={m => <span>{m.name} <span className="text-xs text-gray-500">· {m.department || '—'}</span> {m.auto_managed && <span className="text-[10px] px-1 bg-amber-100 text-amber-800 rounded ml-1">auto</span>}</span>} />
                                {detailData.reports_to && (
                                    <Section title="reports_to (legacy)" items={[detailData.reports_to]}
                                        render={m => <span>{m.name} <span className="text-xs text-gray-500">· {m.department || '—'}</span></span>} />
                                )}
                                <Section title="Departman Zinciri" items={detailData.department_chain}
                                    render={d => <span>{d.name} {d.manager ? <span className="text-xs text-gray-600">→ {d.manager.name}</span> : <span className="text-xs text-gray-400 italic">(manager yok)</span>}</span>} />
                                <div>
                                    <div className="font-semibold text-gray-700 mb-1">Effective Approver (ApproverService)</div>
                                    {detailData.effective_approver
                                        ? <div className="bg-emerald-50 p-2 rounded text-sm">{detailData.effective_approver.name} <span className="text-xs text-gray-500">· {detailData.effective_approver.department || '—'}</span></div>
                                        : <div className="text-gray-400 italic text-sm">Hiçbir katmanda yetkili yönetici bulunamadı</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, items, render }) {
    return (
        <div>
            <div className="font-semibold text-gray-700 mb-1">{title}</div>
            {(!items || items.length === 0)
                ? <div className="text-gray-400 italic text-xs">— yok</div>
                : <ul className="space-y-1">{items.map((it, i) => <li key={i} className="bg-gray-50 p-2 rounded text-sm">{render(it)}</li>)}</ul>}
        </div>
    );
}

function StatCard({ label, value, color, onClick }) {
    const COLORS = {
        gray: 'bg-gray-50 text-gray-700 border-gray-200',
        emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        amber: 'bg-amber-50 text-amber-800 border-amber-200',
        rose: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    return (
        <button onClick={onClick}
            className={`p-3 rounded-xl border text-left transition hover:shadow ${COLORS[color]}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </button>
    );
}
