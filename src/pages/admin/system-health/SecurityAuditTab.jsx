import React, { useState } from 'react';
import api from '../../../services/api';
import {
    ShieldCheckIcon,
    PlayCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

export default function SecurityAuditTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [groupFilter, setGroupFilter] = useState('ALL');

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/system/health-check/run-security-audit/');
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    // Get unique groups for filter
    const groups = data?.results ? [...new Set(data.results.map(r => r.group))] : [];
    const filteredResults = data?.results?.filter(r =>
        groupFilter === 'ALL' || r.group === groupFilter
    ) || [];

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
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header + Run Button */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
                            Güvenlik Denetim Testleri
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Tüm API endpoint'lerinin RBAC (yetki kontrolü) uyumunu test eder.
                        </p>
                    </div>
                    <button
                        onClick={runAudit}
                        disabled={loading}
                        className={`px-6 py-3 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                            ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}
                        `}
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                        {loading ? 'Test Ediliyor...' : 'Tüm Testleri Çalıştır'}
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
                    {/* Total card */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-bold text-gray-800">{data.summary.total}</div>
                        <div className="text-xs text-gray-500 font-medium mt-1">Toplam Test</div>
                    </div>
                    {/* Passed card */}
                    <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 text-center">
                        <div className="text-3xl font-bold text-green-700">{data.summary.passed}</div>
                        <div className="text-xs text-green-600 font-medium mt-1">Başarılı</div>
                    </div>
                    {/* Failed card */}
                    <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 text-center">
                        <div className="text-3xl font-bold text-red-700">{data.summary.failed}</div>
                        <div className="text-xs text-red-600 font-medium mt-1">Başarısız</div>
                    </div>
                    {/* Expected Fail card */}
                    <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100 text-center">
                        <div className="text-3xl font-bold text-amber-700">{data.summary.expected_fail}</div>
                        <div className="text-xs text-amber-600 font-medium mt-1">Beklenen Hata</div>
                    </div>
                </div>
            )}

            {/* Group Filters + Results Table */}
            {data?.results && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Group Filter Bar */}
                    <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto">
                        <button
                            onClick={() => setGroupFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                groupFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Tümü ({data.results.length})
                        </button>
                        {groups.map(g => (
                            <button
                                key={g}
                                onClick={() => setGroupFilter(g)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                    groupFilter === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {g} ({data.results.filter(r => r.group === g).length})
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 w-[80px]">Test ID</th>
                                    <th className="px-4 py-3">Grup</th>
                                    <th className="px-4 py-3">Açıklama</th>
                                    <th className="px-4 py-3 w-[120px]">Durum</th>
                                    <th className="px-4 py-3">Detay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredResults.map((r, i) => (
                                    <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{r.id}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{r.group}</td>
                                        <td className="px-4 py-3 text-gray-800">{r.desc}</td>
                                        <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{r.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Console Logs */}
            {data?.logs && data.logs.length > 0 && (
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# ./security_audit.py</span>
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
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!data && !loading && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <ShieldCheckIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium">Henüz test çalıştırılmadı</h4>
                    <p className="text-gray-300 text-sm mt-1">Yukarıdaki butona tıklayarak güvenlik testlerini başlatın.</p>
                </div>
            )}
        </div>
    );
}
