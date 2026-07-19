import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { Cpu, RefreshCw, ChevronDown, ChevronRight, Activity, Monitor } from 'lucide-react';

const eventBadge = {
    LOGIN: 'bg-blue-100 text-blue-700',
    HEARTBEAT: 'bg-green-100 text-green-700',
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString('tr-TR') : '-');

const TelemetryTab = ({ programId }) => {
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);

    const fetchTelemetry = useCallback(async () => {
        if (!programId) return;
        setLoading(true);
        try {
            const res = await api.get(`/external-programs/${programId}/telemetry/`);
            setRows(res.data.results || []);
            setCount(res.data.count || 0);
        } catch (err) {
            console.error('Telemetry fetch error:', err);
            setRows([]);
        }
        setLoading(false);
    }, [programId]);

    useEffect(() => {
        fetchTelemetry();
        setExpanded(null);
    }, [fetchTelemetry]);

    if (loading) {
        return <div className="text-center py-8 text-slate-400">Yükleniyor...</div>;
    }

    if (rows.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <Cpu size={32} className="mx-auto mb-2 opacity-50" />
                <p>Henüz telemetri kaydı yok</p>
                <p className="text-xs mt-1">İstemciler giriş yapıp periyodik ping attıkça burada görünür.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Activity size={16} className="text-slate-400" />
                    Son {rows.length} kayıt gösteriliyor{count > rows.length ? ` (toplam ${count})` : ''}
                </p>
                <button
                    onClick={fetchTelemetry}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <RefreshCw size={14} /> Yenile
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                            <th className="px-3 py-2 text-left w-6"></th>
                            <th className="px-3 py-2 text-left">Zaman</th>
                            <th className="px-3 py-2 text-left">Tür</th>
                            <th className="px-3 py-2 text-left">Kullanıcı</th>
                            <th className="px-3 py-2 text-left">Cihaz</th>
                            <th className="px-3 py-2 text-left">IP</th>
                            <th className="px-3 py-2 text-left">İşletim Sistemi</th>
                            <th className="px-3 py-2 text-left">CPU</th>
                            <th className="px-3 py-2 text-left">RAM</th>
                            <th className="px-3 py-2 text-left">Sürüm</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map(row => {
                            const isOpen = expanded === row.id;
                            const progs = row.extra?.installed_programs || [];
                            const procs = row.extra?.processes || [];
                            return (
                                <React.Fragment key={row.id}>
                                    <tr
                                        className="hover:bg-slate-50 cursor-pointer"
                                        onClick={() => setExpanded(isOpen ? null : row.id)}
                                    >
                                        <td className="px-3 py-2 text-slate-400">
                                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventBadge[row.event_type] || 'bg-slate-100'}`}>
                                                {row.event_type === 'LOGIN' ? 'Giriş' : 'Ping'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-700">{row.user_name || '-'}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.hostname || '-'}</td>
                                        <td className="px-3 py-2 text-xs font-mono text-slate-600">{row.ip_address || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{`${row.os_name || ''} ${row.os_version || ''}`.trim() || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{row.cpu_model || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{row.ram_mb ? `${(row.ram_mb / 1024).toFixed(1)} GB` : '-'}</td>
                                        <td className="px-3 py-2 text-xs font-mono text-slate-600">{row.app_version || '-'}</td>
                                    </tr>
                                    {isOpen && (
                                        <tr className="bg-slate-50/60">
                                            <td colSpan={10} className="px-6 py-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                                                    <Detail label="HWID" value={row.hwid} mono />
                                                    <Detail label="MAC Adresi" value={row.mac_address} mono />
                                                    <Detail label="OS Kullanıcısı" value={row.os_username} />
                                                    <Detail label="Mimari" value={row.architecture} />
                                                    <Detail label="Disk Seri No" value={row.disk_serial} mono />
                                                    <Detail label="Ekran Çözünürlüğü" value={row.screen_resolution} />
                                                    <Detail label="Saat Dilimi" value={row.timezone} />
                                                </div>
                                                {progs.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                                            <Monitor size={12} /> Yüklü Programlar ({progs.length})
                                                        </p>
                                                        <p className="text-xs text-slate-600 leading-relaxed">{progs.join(', ')}</p>
                                                    </div>
                                                )}
                                                {procs.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs font-medium text-slate-500 mb-1">Çalışan İşlemler ({procs.length})</p>
                                                        <p className="text-xs text-slate-600 leading-relaxed">{procs.join(', ')}</p>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Detail = ({ label, value, mono = false }) => (
    <div className="flex gap-2">
        <span className="text-slate-400 min-w-[110px]">{label}:</span>
        <span className={`text-slate-700 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
);

export default TelemetryTab;
