import React, { useState, useEffect } from 'react';
import api from '../services/api';
ServerStackIcon,
    CpuChipIcon,
    ArrowPathIcon // Added
} from '@heroicons/react/24/outline';

const ResourceMonitor = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get('/system/health-check/get_system_resources/');
                setData(res.data);
                setError(null);
            } catch (err) {
                setError("Veri alınamadı veya psutil yüklü değil.");
            } finally {
                setLoading(false);
            }
        };
        load();

        // Auto refresh every 5s
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [refreshKey]);

    if (loading && !data) return <div className="p-4 text-center text-slate-500">Yükleniyor...</div>;
    if (error) return <div className="p-4 text-center text-red-500 font-bold">{error}</div>;
    if (!data) return null;

    const memPercent = data.memory.percent;
    const cpuPercent = data.cpu.percent;

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Canlı Kaynak Kullanımı</h2>
                <button onClick={() => setRefreshKey(k => k + 1)} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                    <ArrowPathIcon className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} /> Yenile
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPU Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPU Kullanımı</div>
                            <div className="text-3xl font-black text-slate-800 mt-1">%{cpuPercent}</div>
                            <div className="text-xs text-slate-400 mt-1">{data.cpu.count} Çekirdek</div>
                        </div>
                        <div className={`p-3 rounded-lg ${cpuPercent > 80 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <CpuChipIcon className="w-6 h-6" />
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${cpuPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${cpuPercent}%` }}></div>
                    </div>
                </div>

                {/* RAM Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">RAM Kullanımı</div>
                            <div className="text-3xl font-black text-slate-800 mt-1">%{memPercent}</div>
                            <div className="text-xs text-slate-400 mt-1">{data.memory.used_mb} MB / {data.memory.total_mb} MB</div>
                        </div>
                        <div className={`p-3 rounded-lg ${memPercent > 80 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <ServerStackIcon className="w-6 h-6" />
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${memPercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${memPercent}%` }}></div>
                    </div>
                </div>

                {/* Attendance Loop Stats */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">PUANTAJ DÖNGÜSÜ</div>
                            {data.attendance_loop ? (
                                <>
                                    <div className="text-3xl font-black text-slate-800 mt-1">
                                        {data.attendance_loop.processed_employees} / {data.attendance_loop.total_employees}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Hız: {data.attendance_loop.employees_per_second} kişi/sn | Süre: {data.attendance_loop.duration_seconds}s
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-400 mt-2">Veri bekleniyor...</div>
                            )}
                        </div>
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <ArrowPathIcon className={`w-6 h-6 ${data.attendance_loop && data.attendance_loop.active ? 'animate-spin' : ''}`} />
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${data.attendance_loop ? Math.min(100, (data.attendance_loop.processed_employees / (data.attendance_loop.total_employees || 1)) * 100) : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Process Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-700">En Çok RAM Tüketen İşlemler (Top 20)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3">PID</th>
                                <th className="px-5 py-3">İşlem Adı</th>
                                <th className="px-5 py-3 text-right">RAM (MB)</th>
                                <th className="px-5 py-3 text-right">CPU %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.processes.map((proc, i) => (
                                <tr key={proc.pid} className="hover:bg-blue-50/10">
                                    <td className="px-5 py-2 font-mono text-slate-500">{proc.pid}</td>
                                    <td className="px-5 py-2 font-bold text-slate-700">{proc.name}</td>
                                    <td className="px-5 py-2 text-right font-mono text-blue-600 font-bold">{proc.memory_mb} MB</td>
                                    <td className="px-5 py-2 text-right font-mono text-slate-500">{proc.cpu}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResourceMonitor;
