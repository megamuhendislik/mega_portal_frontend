import React, { useEffect, useMemo, useState } from 'react';
import {
    UserGroupIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    PlayIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const PAGE_SIZE = 50;

export default function SecondaryManagerCheckerTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const [filterType, setFilterType] = useState('all'); // all | auto | manual
    const [filterBoardId, setFilterBoardId] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [matrixOpen, setMatrixOpen] = useState(false);

    const [dryRunResult, setDryRunResult] = useState(null);
    const [confirmCountdown, setConfirmCountdown] = useState(0);
    const [cleanupRunning, setCleanupRunning] = useState(false);

    const fetchData = async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.get('/system/health-check/secondary-manager-analysis/');
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (confirmCountdown > 0) {
            const t = setTimeout(() => setConfirmCountdown(confirmCountdown - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [confirmCountdown]);

    const filteredRows = useMemo(() => {
        if (!data?.rows) return [];
        return data.rows.filter(r => {
            if (filterType === 'auto' && !r.auto_managed) return false;
            if (filterType === 'manual' && r.auto_managed) return false;
            if (filterBoardId !== 'all' && r.manager_id !== Number(filterBoardId)) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!r.employee_name.toLowerCase().includes(q) &&
                    !r.manager_name.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [data, filterType, filterBoardId, search]);

    const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

    const runDryRun = async (action, targetId = null) => {
        try {
            const res = await api.post('/system/health-check/secondary-manager-cleanup/', {
                action, target_id: targetId, dry_run: true,
            });
            setDryRunResult({ ...res.data, _action: action, _target_id: targetId });
            setConfirmCountdown(3);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        }
    };

    const executeCleanup = async () => {
        if (!dryRunResult) return;
        setCleanupRunning(true);
        try {
            await api.post('/system/health-check/secondary-manager-cleanup/', {
                action: dryRunResult._action,
                target_id: dryRunResult._target_id,
                dry_run: false,
            });
            setDryRunResult(null);
            await fetchData();
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setCleanupRunning(false);
        }
    };

    const downloadTxt = async () => {
        try {
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const resp = await fetch(`${baseURL}/system/health-check/secondary-manager-analysis/txt/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            a.download = `secondary_manager_analysis_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        } catch (e) {
            setError(`TXT rapor indirilemedi: ${e.message || e}`);
        }
    };

    if (loading && !data) return <div className="p-6 text-center text-gray-500"><ArrowPathIcon className="w-8 h-8 mx-auto animate-spin" />Yükleniyor…</div>;
    if (error) return <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>;
    if (!data) return null;

    const { summary, board_members, warnings } = data;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserGroupIcon className="w-6 h-6 text-indigo-600" />
                        İkincil Yönetici Checker
                    </h2>
                    <p className="text-sm text-gray-500">BOARD auto-SECONDARY ilişkilerini görüntüle, dry-run analiz yap, hedefli temizle.</p>
                </div>
                <button onClick={fetchData} disabled={loading}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1">
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Toplam SECONDARY" value={summary.total} color="gray" onClick={() => setFilterType('all')} />
                <StatCard label="Auto-Managed" value={summary.auto} color="amber" onClick={() => setFilterType('auto')} />
                <StatCard label="Manuel" value={summary.manual} color="emerald" onClick={() => setFilterType('manual')} />
                <StatCard label="BOARD Üyesi" value={summary.board_members} color="indigo" />
            </div>

            {/* Warning banner */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                    <strong>Uyarı:</strong> BOARD auto-SECONDARY otomatik sync hâlâ aktif. Burada sildiğin auto kayıtlar,
                    sisteme yeni çalışan eklendiğinde / aktive edildiğinde geri eklenir. Kalıcı çözüm için signal'i
                    kapatmak ayrı bir görev. Analytics scope için <code className="px-1 bg-amber-100 rounded">SYSTEM_FULL_ACCESS</code> izni
                    zaten bypass sağlıyor — bu SECONDARY ilişkisi artık fonksiyonel olarak gereksiz.
                </div>
            </div>

            {/* BOARD × Çalışan Matrisi */}
            <div className="bg-white rounded-xl border border-gray-100">
                <button onClick={() => setMatrixOpen(!matrixOpen)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
                    <span className="font-semibold text-sm flex items-center gap-2">
                        {matrixOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        BOARD Üyesi × Subordinate Matrisi ({board_members.length})
                    </span>
                </button>
                {matrixOpen && (
                    <div className="p-3 border-t border-gray-100 space-y-2">
                        {board_members.map(bm => (
                            <div key={bm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                    <span className="font-medium">{bm.name}</span>
                                    <span className="ml-2 text-xs text-gray-500">id={bm.id}</span>
                                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                                        {bm.subordinate_count} auto SECONDARY
                                    </span>
                                </div>
                                <button onClick={() => runDryRun('board_member', bm.id)}
                                    className="text-xs px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded">
                                    Sadece bunu temizle…
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Filtreler */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                    {['all', 'auto', 'manual'].map(t => (
                        <button key={t} onClick={() => { setFilterType(t); setPage(1); }}
                            className={`px-3 py-1 rounded text-xs font-medium ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                            {t === 'all' ? 'Hepsi' : t === 'auto' ? 'Auto' : 'Manuel'}
                        </button>
                    ))}
                </div>
                <select value={filterBoardId} onChange={e => { setFilterBoardId(e.target.value); setPage(1); }}
                    className="px-2 py-1 border rounded text-sm">
                    <option value="all">Tüm BOARD üyeleri</option>
                    {board_members.map(bm => <option key={bm.id} value={bm.id}>{bm.name}</option>)}
                </select>
                <div className="flex-1 min-w-[200px] flex items-center gap-1 px-2 py-1 border rounded">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Çalışan veya yönetici ara…"
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
                                <th className="px-3 py-2 text-left">Yönetici</th>
                                <th className="px-3 py-2 text-center">Auto?</th>
                                <th className="px-3 py-2 text-left">Created</th>
                                <th className="px-3 py-2 text-left">Kaynak</th>
                                <th className="px-3 py-2 text-left">Çakışma</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">{r.employee_name}</td>
                                    <td className="px-3 py-2 text-gray-600">{r.department || '—'}</td>
                                    <td className="px-3 py-2">{r.manager_name}</td>
                                    <td className="px-3 py-2 text-center">
                                        {r.auto_managed
                                            ? <CheckCircleIcon className="w-4 h-4 text-amber-500 inline" />
                                            : <XCircleIcon className="w-4 h-4 text-gray-300 inline" />}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                        {r.created_at ? new Date(r.created_at).toLocaleDateString('tr-TR') : '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                        {r.is_board_manager
                                            ? <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">BOARD</span>
                                            : <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">Manual</span>}
                                    </td>
                                    <td className="px-3 py-2">
                                        {r.conflict
                                            ? <span className="text-rose-600 text-xs">⚠ {r.conflict}</span>
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                            {pageRows.length === 0 && (
                                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Kayıt yok</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-2 flex items-center justify-between text-xs border-t bg-gray-50">
                        <span>{filteredRows.length} kayıt</span>
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

            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <h3 className="font-semibold text-rose-800 text-sm mb-2">⚠ Çakışma Uyarıları ({warnings.length})</h3>
                    <ul className="text-xs space-y-1">
                        {warnings.slice(0, 10).map((w, i) => <li key={i} className="text-rose-700">{w.msg}</li>)}
                    </ul>
                </div>
            )}

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-3 flex items-center gap-2 shadow-lg">
                <button onClick={downloadTxt}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1">
                    <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                </button>
                <div className="flex-1" />
                <button onClick={() => runDryRun('all_auto')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1">
                    <PlayIcon className="w-4 h-4" /> Dry-Run: Tümünü Sil
                </button>
            </div>

            {/* Dry-Run Modal */}
            {dryRunResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                            Dry-Run Sonucu
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="bg-gray-50 p-3 rounded">
                                <div><strong>Aksiyon:</strong> {dryRunResult._action}</div>
                                {dryRunResult._target_id && <div><strong>Hedef ID:</strong> {dryRunResult._target_id}</div>}
                                <div><strong className="text-rose-700">Silinecek:</strong> {dryRunResult.would_delete} kayıt</div>
                                <div><strong>Korunacak (manuel):</strong> {dryRunResult.would_remain_manual}</div>
                            </div>
                            {Object.keys(dryRunResult.by_board_breakdown || {}).length > 0 && (
                                <div>
                                    <strong>BOARD Üyesi Bazında:</strong>
                                    <ul className="mt-1 text-xs space-y-1">
                                        {Object.entries(dryRunResult.by_board_breakdown).map(([id, c]) => {
                                            const bm = board_members.find(b => b.id === Number(id));
                                            return <li key={id}>{bm?.name || `id=${id}`}: <strong>{c}</strong> kayıt</li>;
                                        })}
                                    </ul>
                                </div>
                            )}
                            {dryRunResult.affected_employees_sample?.length > 0 && (
                                <div>
                                    <strong>Etkilenen Çalışan Örneği (ilk 50):</strong>
                                    <div className="mt-1 max-h-32 overflow-y-auto text-xs bg-gray-50 p-2 rounded">
                                        {dryRunResult.affected_employees_sample.map(e => e.name).join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setDryRunResult(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm">İptal</button>
                            <button onClick={executeCleanup}
                                disabled={confirmCountdown > 0 || cleanupRunning}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-sm disabled:opacity-40 flex items-center gap-1">
                                <TrashIcon className="w-4 h-4" />
                                {confirmCountdown > 0
                                    ? `Onaylıyorum, Şimdi Sil (${confirmCountdown})`
                                    : cleanupRunning ? 'Siliniyor…' : 'Onaylıyorum, Şimdi Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color, onClick }) {
    const COLORS = {
        gray: 'bg-gray-50 text-gray-700 border-gray-200',
        amber: 'bg-amber-50 text-amber-800 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    };
    return (
        <button onClick={onClick}
            className={`p-3 rounded-xl border text-left transition hover:shadow ${COLORS[color]} ${!onClick && 'cursor-default'}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </button>
    );
}
