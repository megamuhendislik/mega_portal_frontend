import React, { useState, useEffect } from 'react';
import {
    BarChart3, Clock, CheckCircle2, XCircle, AlertCircle, Users,
    TrendingUp, ArrowDownLeft, Timer, User
} from 'lucide-react';
import api from '../../services/api';

const IncomingAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/request-analytics/incoming/');
                setData(res.data);
            } catch (err) {
                console.error('Incoming analytics error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
            </div>
            <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-16 text-slate-400">
            <ArrowDownLeft size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Gelen talep verisi oluşturulamadı.</p>
        </div>
    );

    const maxTrend = Math.max(...(data.monthly_trend || []).map(m => m.total), 1);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Toplam Gelen</p>
                    <h3 className="text-2xl font-black">{data.total_received}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><ArrowDownLeft size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Onaylanan</p>
                    <h3 className="text-2xl font-black">{data.approved_count}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><CheckCircle2 size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Reddedilen</p>
                    <h3 className="text-2xl font-black">{data.rejected_count}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><XCircle size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Bekleyen</p>
                    <h3 className="text-2xl font-black">{data.pending_count}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><AlertCircle size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Ort. Karar Süresi</p>
                    <h3 className="text-2xl font-black">{data.avg_decision_hours ?? '\u2014'}<span className="text-sm ml-1 font-bold opacity-80">saat</span></h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Timer size={56} /></div>
                </div>
            </div>

            {/* Onay Oranı + Tür Dağılımı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Onay Oranı */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">Onay Oranı</h4>
                    <div className="flex items-center gap-6">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                                    strokeDasharray={`${data.approval_rate} ${100 - data.approval_rate}`} strokeDashoffset="0" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-slate-800">{data.approval_rate}%</span>
                            </div>
                        </div>
                        <div className="space-y-2 flex-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Onaylanan</span>
                                <span className="font-bold text-emerald-600">{data.approved_count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Reddedilen</span>
                                <span className="font-bold text-red-600">{data.rejected_count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Bekleyen</span>
                                <span className="font-bold text-amber-600">{data.pending_count}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tür Dağılımı */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">Tür Dağılımı</h4>
                    <div className="space-y-3">
                        {[
                            { key: 'leave', label: 'İzin', color: 'blue' },
                            { key: 'overtime', label: 'Fazla Mesai', color: 'amber' },
                            { key: 'cardless', label: 'Kartsız Giriş', color: 'purple' },
                        ].map(({ key, label, color }) => {
                            const t = data.by_type?.[key] || {};
                            const total = t.total || 0;
                            const maxTotal = Math.max(...Object.values(data.by_type || {}).map(v => v?.total || 0), 1);
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="w-24 text-sm font-medium text-slate-600">{label}</span>
                                    <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                                        <div className={`h-full bg-${color}-400 rounded-lg flex items-center justify-end pr-2`}
                                            style={{ width: `${Math.max((total / maxTotal) * 100, 5)}%` }}>
                                            <span className="text-[10px] font-bold text-white">{total}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 w-16 text-right">
                                        {t.approved || 0} onay
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Aylik Trend */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" /> Aylık Gelen Talep Trendi
                </h4>
                <p className="text-xs text-slate-400 mb-5">Son 6 ayda size gelen talep sayıları</p>
                <div className="flex items-end gap-3 h-48">
                    {(data.monthly_trend || []).map((m, i) => {
                        const barHeight = m.total > 0 ? (m.total / maxTrend) * 100 : 2;
                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {m.total} talep ({m.approved || 0} onay)
                                </div>
                                <div className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse" style={{ height: `${barHeight}%`, minHeight: '4px' }}>
                                    {(m.leave || 0) > 0 && <div className="w-full bg-blue-400" style={{ height: `${(m.leave / m.total) * 100}%` }} />}
                                    {(m.overtime || 0) > 0 && <div className="w-full bg-amber-400" style={{ height: `${(m.overtime / m.total) * 100}%` }} />}
                                    {(m.cardless || 0) > 0 && <div className="w-full bg-purple-400" style={{ height: `${(m.cardless / m.total) * 100}%` }} />}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{m.label?.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* En Cok Talep Edenler */}
            {(data.top_requesters || []).length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-purple-500" /> En Çok Talep Eden Çalışanlar
                    </h4>
                    <div className="space-y-3">
                        {data.top_requesters.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-xl px-2 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(r.name || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-700 truncate">{r.name}</p>
                                    <p className="text-[11px] text-slate-400">{r.department}</p>
                                </div>
                                <span className="text-lg font-black text-slate-800">{r.count}</span>
                                <span className="text-xs text-slate-400">talep</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncomingAnalytics;
