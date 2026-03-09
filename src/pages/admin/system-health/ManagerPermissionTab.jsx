import React, { useState, useRef, useEffect } from 'react';
import api from '../../../services/api';
import {
    ShieldCheckIcon,
    PlayCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

const SCENARIO_DEFS = [
    { num: 1, id: 'MGR-01', group: 'PRIMARY', desc: 'PRIMARY yönetici izin talebini onaylar' },
    { num: 2, id: 'MGR-02', group: 'PRIMARY', desc: 'PRIMARY yönetici Fazla Mesai talebini onaylar' },
    { num: 3, id: 'MGR-03', group: 'PRIMARY', desc: 'PRIMARY yönetici kartsız giriş onaylar' },
    { num: 4, id: 'MGR-04', group: 'SECONDARY_BLOCK', desc: 'SECONDARY izin onayı engellenir (403)' },
    { num: 5, id: 'MGR-05', group: 'SECONDARY_BLOCK', desc: 'SECONDARY izin reddi engellenir (403)' },
    { num: 6, id: 'MGR-06', group: 'SECONDARY_BLOCK', desc: 'SECONDARY kartsız giriş onayı engellenir (403)' },
    { num: 7, id: 'MGR-07', group: 'SECONDARY_BLOCK', desc: 'SECONDARY kartsız giriş reddi engellenir (403)' },
    { num: 8, id: 'MGR-08', group: 'SECONDARY_OT', desc: 'SECONDARY Fazla Mesai ataması yapabilir' },
    { num: 9, id: 'MGR-09', group: 'SECONDARY_OT', desc: 'SECONDARY Fazla Mesai ataması → bildirim oluşur' },
    { num: 10, id: 'MGR-10', group: 'CHECK_IN_GUARD', desc: 'Check-in yok → Fazla Mesai iptal edilebilir' },
    { num: 11, id: 'MGR-11', group: 'CHECK_IN_GUARD', desc: 'Check-in var → Fazla Mesai iptal engellenir (400)' },
    { num: 12, id: 'MGR-12', group: 'CHECK_IN_GUARD', desc: 'Check-in var → Fazla Mesai override engellenir (400)' },
    { num: 13, id: 'MGR-13', group: 'HIERARCHY', desc: 'my-managers endpoint çalışır' },
    { num: 14, id: 'MGR-14', group: 'TRANSFER', desc: 'SECONDARY deaktif → yeni SECONDARY\'ye devir' },
    { num: 15, id: 'MGR-15', group: 'TRANSFER', desc: 'SECONDARY deaktif + yeni yok → PRIMARY fallback' },
];

const GROUP_FILTERS = [
    { key: 'ALL', label: 'Tümü' },
    { key: 'PRIMARY', label: 'PRIMARY' },
    { key: 'SECONDARY_BLOCK', label: 'SECONDARY Engel' },
    { key: 'SECONDARY_OT', label: 'SECONDARY Fazla Mesai' },
    { key: 'CHECK_IN_GUARD', label: 'Check-in Guard' },
    { key: 'HIERARCHY', label: 'Hiyerarşi' },
    { key: 'TRANSFER', label: 'Devir' },
];

const GROUP_BADGE_COLORS = {
    PRIMARY: 'bg-blue-100 text-blue-800 border-blue-200',
    SECONDARY_BLOCK: 'bg-red-100 text-red-800 border-red-200',
    SECONDARY_OT: 'bg-green-100 text-green-800 border-green-200',
    CHECK_IN_GUARD: 'bg-amber-100 text-amber-800 border-amber-200',
    HIERARCHY: 'bg-purple-100 text-purple-800 border-purple-200',
    TRANSFER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export default function ManagerPermissionTab() {
    const [loading, setLoading] = useState(false);
    const [scenarioLoading, setScenarioLoading] = useState(null);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [groupFilter, setGroupFilter] = useState('ALL');
    const logEndRef = useRef(null);

    // Auto-scroll logs to bottom
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [data?.logs]);

    const runAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/system/health-check/run-manager-permission-test/', { scenario: 'all' });
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const runSingle = async (num) => {
        setScenarioLoading(num);
        setError(null);
        try {
            const res = await api.post('/system/health-check/run-manager-permission-test/', { scenario: num });
            const newResult = res.data.results[0];
            setData(prev => {
                if (!prev) return res.data;
                const updatedResults = [...prev.results];
                const idx = updatedResults.findIndex(r => r.id === newResult.id);
                if (idx >= 0) updatedResults[idx] = newResult;
                else updatedResults.push(newResult);
                const newLogs = [...prev.logs, ...res.data.logs];
                return {
                    results: updatedResults,
                    logs: newLogs,
                    summary: {
                        total: updatedResults.length,
                        passed: updatedResults.filter(r => r.status === 'PASS').length,
                        failed: updatedResults.filter(r => r.status === 'FAIL').length,
                        expected_fail: updatedResults.filter(r => r.status === 'EXPECTED_FAIL').length,
                    }
                };
            });
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setScenarioLoading(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PASS': return (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> PASS
                </span>
            );
            case 'FAIL': return (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-200 flex items-center gap-1">
                    <XCircleIcon className="w-3.5 h-3.5" /> FAIL
                </span>
            );
            case 'EXPECTED_FAIL': return (
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold border border-amber-200 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" /> BEKLENEN
                </span>
            );
            default: return (
                <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                    &mdash;
                </span>
            );
        }
    };

    const getGroupBadge = (group) => {
        const colors = GROUP_BADGE_COLORS[group] || 'bg-gray-100 text-gray-700 border-gray-200';
        return (
            <span className={`${colors} px-2 py-0.5 rounded text-xs font-bold border`}>
                {group}
            </span>
        );
    };

    // Build display rows: merge SCENARIO_DEFS with actual results
    const getDisplayRows = () => {
        return SCENARIO_DEFS.map(def => {
            const result = data?.results?.find(r => r.id === def.id);
            return {
                ...def,
                status: result?.status || null,
                details: result?.details || null,
            };
        });
    };

    const displayRows = getDisplayRows();
    const filteredRows = displayRows.filter(r =>
        groupFilter === 'ALL' || r.group === groupFilter
    );

    const getGroupCount = (group) => {
        if (group === 'ALL') return SCENARIO_DEFS.length;
        return SCENARIO_DEFS.filter(s => s.group === group).length;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header + Run Button */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                            Yönetici Yetki Testleri
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            PRIMARY/SECONDARY yönetici yetki kısıtlamalarını, check-in guard ve devir mekanizmalarını test eder.
                        </p>
                    </div>
                    <button
                        onClick={runAll}
                        disabled={loading}
                        className={`px-6 py-3 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                            ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'}
                        `}
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                        {loading ? 'Test Ediliyor...' : 'Tümünü Çalıştır'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        Hata: {error}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            {data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-bold text-blue-700">{data.summary.total}</div>
                        <div className="text-xs text-gray-500 font-medium mt-1">Toplam</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 text-center">
                        <div className="text-3xl font-bold text-green-700">{data.summary.passed}</div>
                        <div className="text-xs text-green-600 font-medium mt-1">Başarılı</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100 text-center">
                        <div className="text-3xl font-bold text-amber-700">{data.summary.expected_fail}</div>
                        <div className="text-xs text-amber-600 font-medium mt-1">Beklenen Hata</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 text-center">
                        <div className="text-3xl font-bold text-red-700">{data.summary.failed}</div>
                        <div className="text-xs text-red-600 font-medium mt-1">Başarısız</div>
                    </div>
                </div>
            )}

            {/* Group Filters + Scenario Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Group Filter Bar */}
                <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto">
                    {GROUP_FILTERS.map(gf => (
                        <button
                            key={gf.key}
                            onClick={() => setGroupFilter(gf.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                groupFilter === gf.key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {gf.label} ({getGroupCount(gf.key)})
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-[50px]">#</th>
                                <th className="px-4 py-3 w-[90px]">ID</th>
                                <th className="px-4 py-3">Açıklama</th>
                                <th className="px-4 py-3 w-[160px]">Grup</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                                <th className="px-4 py-3 w-[110px]">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRows.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{row.num}</td>
                                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{row.id}</td>
                                    <td className="px-4 py-3 text-gray-800">{row.desc}</td>
                                    <td className="px-4 py-3">{getGroupBadge(row.group)}</td>
                                    <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => runSingle(row.num)}
                                            disabled={loading || scenarioLoading !== null}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                                                scenarioLoading === row.num
                                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                    : loading || scenarioLoading !== null
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            }`}
                                        >
                                            {scenarioLoading === row.num
                                                ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                : <PlayCircleIcon className="w-3.5 h-3.5" />
                                            }
                                            Çalıştır
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Console Logs */}
            {data?.logs && data.logs.length > 0 && (
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# ./manager_permission_test.py</span>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
                        {data.logs.map((log, i) => (
                            <div key={i} className={`
                                ${typeof log === 'object' && log.message?.includes('\u274C') ? 'text-red-400' : ''}
                                ${typeof log === 'object' && log.message?.includes('\u26A0') ? 'text-yellow-400' : ''}
                                ${typeof log === 'object' && log.message?.includes('\u2550\u2550\u2550') ? 'text-cyan-400 font-bold' : ''}
                            `}>
                                {typeof log === 'object'
                                    ? `[${log.time}] ${log.message}${log.details ? ' (' + log.details + ')' : ''}`
                                    : log
                                }
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!data && !loading && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <ShieldCheckIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium">Henüz test çalıştırılmadı</h4>
                    <p className="text-gray-300 text-sm mt-1">Yukarıdaki butona tıklayarak yönetici yetki testlerini başlatın.</p>
                </div>
            )}
        </div>
    );
}
