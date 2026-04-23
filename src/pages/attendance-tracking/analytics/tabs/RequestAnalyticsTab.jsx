import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileText, TrendingUp, PieChart as PieChartIcon, Users, AlertCircle,
    CheckCircle2, Clock, XCircle, Calendar, ArrowRight, BarChart3, Hourglass
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area,
} from 'recharts';

const TYPE_COLORS = { leave: '#3B82F6', overtime: '#F59E0B', meal: '#10B981', cardless: '#8B5CF6', health_report: '#EC4899' };
const TYPE_LABELS = { leave: 'İzin', overtime: 'Ek Mesai', meal: 'Yemek', cardless: 'Kartsız Giriş', health_report: 'Sağlık Raporu' };
const STATUS_COLORS = { approved: '#10B981', rejected: '#EF4444', pending: '#F59E0B', cancelled: '#94A3B8' };
const STATUS_LABELS = { APPROVED: 'Onaylı', REJECTED: 'Reddedildi', PENDING: 'Bekleyen', CANCELLED: 'İptal' };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function RequestAnalyticsTab() {
    const { queryParams } = useAnalytics();
    const [mode, setMode] = useState('personal');
    const [personalData, setPersonalData] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            if (mode === 'team') {
                const [overviewRes, compRes] = await Promise.allSettled([
                    api.get('/request-analytics/team-overview/', { params: { range: 6 } }),
                    api.get('/request-analytics/comprehensive/', { params: { range: 6 } }),
                ]);
                const overview = overviewRes.status === 'fulfilled' ? overviewRes.value.data : {};
                const comp = compRes.status === 'fulfilled' ? compRes.value.data : {};
                setTeamData({ ...overview, ...comp });
            } else {
                const res = await api.get('/request-analytics/', { params: { range: 6 } });
                setPersonalData(res.data);
            }
        } catch {
            setError(true);
        }
        setLoading(false);
    }, [mode]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const data = mode === 'team' ? teamData : personalData;

    // Type distribution
    const typeDistData = useMemo(() => {
        if (!data) return [];
        if (data.type_distribution) {
            return data.type_distribution.filter(d => d.count > 0).map(d => ({
                name: d.type || d.name, value: d.count, color: d.color || TYPE_COLORS[d.key] || '#94A3B8',
            }));
        }
        if (data.by_type) {
            return Object.entries(data.by_type).map(([key, val]) => ({
                name: TYPE_LABELS[key] || key, value: val?.total || (typeof val === 'number' ? val : 0), color: TYPE_COLORS[key] || '#94A3B8',
            })).filter(d => d.value > 0);
        }
        return [];
    }, [data]);

    // Status distribution
    const statusDistData = useMemo(() => {
        if (!data) return [];
        if (data.status_distribution) {
            return data.status_distribution.filter(d => d.count > 0).map(d => ({
                name: d.status || d.label, value: d.count, color: d.color || '#94A3B8',
            }));
        }
        const items = [];
        if (data.approved_count) items.push({ name: 'Onaylı', value: data.approved_count, color: STATUS_COLORS.approved });
        if (data.rejected_count) items.push({ name: 'Reddedildi', value: data.rejected_count, color: STATUS_COLORS.rejected });
        if (data.pending_count) items.push({ name: 'Bekleyen', value: data.pending_count, color: STATUS_COLORS.pending });
        return items;
    }, [data]);

    // Monthly trend
    const trendData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        const TR_MONTHS = { Jan: 'Oca', Feb: 'Şub', Mar: 'Mar', Apr: 'Nis', May: 'May', Jun: 'Haz', Jul: 'Tem', Aug: 'Ağu', Sep: 'Eyl', Oct: 'Eki', Nov: 'Kas', Dec: 'Ara' };
        return data.monthly_trend.map(m => ({
            name: (m.label || '').replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, match => TR_MONTHS[match] || match),
            izin: m.leave || 0,
            ek_mesai: m.overtime || 0,
            yemek: m.meal || 0,
            kartsız: m.cardless || 0,
            toplam: m.total || 0,
        }));
    }, [data]);

    // Employee breakdown (team mode)
    const employeeBreakdown = useMemo(() => {
        if (!data?.by_employee) return [];
        return (Array.isArray(data.by_employee) ? data.by_employee : [])
            .sort((a, b) => (b.total || 0) - (a.total || 0))
            .slice(0, 20);
    }, [data]);

    // Leave type breakdown
    const leaveTypeData = useMemo(() => {
        if (!data?.leave_type_breakdown) return [];
        return data.leave_type_breakdown
            .filter(d => d.count > 0)
            .map((d, i) => ({
                name: d.type || d.leave_type || d.name,
                value: d.count,
                color: ['#3B82F6', '#6366f1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'][i % 7],
            }));
    }, [data]);

    // Approval speed / bottleneck
    const avgDecisionHours = data?.avg_decision_hours || data?.avg_approval_time_hours;

    if (loading) return <LoadingSkeleton rows={4} />;
    if (error) return <ErrorState message="Talep analiz verisi yüklenemedi" onRetry={fetchData} />;

    const totalRequests = data?.total_requests || data?.total_received || 0;
    const approvalRate = data?.approval_rate || 0;
    const pendingCount = data?.pending_count || data?.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 w-fit shadow-sm">
                {[{ key: 'personal', label: 'Kişisel Taleplerim', icon: FileText }, { key: 'team', label: 'Ekip Talepleri', icon: Users }].map(m => (
                    <button key={m.key} onClick={() => setMode(m.key)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === m.key ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <m.icon size={15} /> {m.label}
                    </button>
                ))}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Toplam Talep" value={totalRequests} icon={FileText} gradient="slate" />
                <KPICard title="Onay Oranı" value={`${approvalRate}`} suffix="%" icon={CheckCircle2} gradient="emerald"
                    info={METRIC_EXPLANATIONS.approval_rate} />
                <KPICard title="Bekleyen" value={pendingCount} icon={Hourglass} gradient="amber" />
                <KPICard title="Reddedilen" value={data?.rejected_count || 0} icon={XCircle} gradient="red" />
                <KPICard title={avgDecisionHours != null ? 'Ort. Karar Süresi' : 'OT Saati'}
                    value={avgDecisionHours != null ? avgDecisionHours : (data?.total_overtime_hours || 0)}
                    suffix={avgDecisionHours != null ? 'saat' : 'saat'}
                    icon={Clock} gradient="blue"
                    info={avgDecisionHours != null ? METRIC_EXPLANATIONS.decision_time : METRIC_EXPLANATIONS.overtime} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Type distribution */}
                <SectionCard title="Talep Türü Dağılımı" icon={PieChartIcon} iconGradient="from-indigo-500 to-indigo-600" collapsible={false}>
                    {typeDistData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeDistData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                                            {typeDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {typeDistData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="Tür dağılımı yok" />}
                </SectionCard>

                {/* Status distribution */}
                <SectionCard title="Durum Dağılımı" icon={CheckCircle2} iconGradient="from-emerald-500 to-emerald-600" collapsible={false}>
                    {statusDistData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusDistData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                                            {statusDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {statusDistData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="Durum dağılımı yok" />}
                </SectionCard>

                {/* Leave type breakdown */}
                <SectionCard title="İzin Türü Kırılımı" icon={Calendar} iconGradient="from-blue-500 to-blue-600" collapsible={false}>
                    {leaveTypeData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={leaveTypeData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                                            {leaveTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {leaveTypeData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}`}
                                        value={totalRequests > 0 ? Math.round(d.value / totalRequests * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="İzin türü kırılımı yok" />}
                </SectionCard>
            </div>

            {/* Monthly trend */}
            <SectionCard title="Aylık Talep Trendi" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600"
                subtitle="Talep türleri bazında aylık dağılım ve toplam çizgisi">
                {trendData.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Bar dataKey="izin" name="İzin" fill={TYPE_COLORS.leave} radius={[3, 3, 0, 0]} stackId="a" />
                                <Bar dataKey="ek_mesai" name="Ek Mesai" fill={TYPE_COLORS.overtime} radius={[3, 3, 0, 0]} stackId="a" />
                                <Bar dataKey="yemek" name="Yemek" fill={TYPE_COLORS.meal} radius={[3, 3, 0, 0]} stackId="a" />
                                <Bar dataKey="kartsız" name="Kartsız" fill={TYPE_COLORS.cardless} radius={[3, 3, 0, 0]} stackId="a" />
                                <Line type="monotone" dataKey="toplam" name="Toplam" stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Trend verisi yok" />}
            </SectionCard>

            {/* Approval process insight */}
            {avgDecisionHours != null && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ort. Karar Süresi</p>
                            <p className="text-2xl font-black text-slate-800">{avgDecisionHours}<span className="text-sm text-slate-400 ml-1">saat</span></p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onay Oranı</p>
                            <p className="text-2xl font-black text-emerald-600">{approvalRate}%</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white">
                            <Hourglass size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bekleyen Talep</p>
                            <p className="text-2xl font-black text-amber-600">{pendingCount}<span className="text-sm text-slate-400 ml-1">adet</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee breakdown (team mode) */}
            {mode === 'team' && employeeBreakdown.length > 0 && (
                <SectionCard title="Çalışan Bazlı Talep Dağılımı" icon={Users} iconGradient="from-blue-500 to-blue-600"
                    subtitle="En çok talep oluşturan çalışanlar">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">#</th>
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Çalışan</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Toplam</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">İzin</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">OT</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Onaylı</th>
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold w-32">Oran</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeBreakdown.map((emp, i) => {
                                    const total = emp.total || 1;
                                    const approvedPct = Math.round((emp.approved || 0) / total * 100);
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2.5 px-4 text-slate-300 font-bold">{i + 1}</td>
                                            <td className="py-2.5 px-4 font-bold text-slate-700">{emp.name || emp.employee_name}</td>
                                            <td className="py-2.5 px-4 text-center font-black text-slate-800">{emp.total || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-blue-600 font-bold">{emp.leave || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-amber-600 font-bold">{emp.overtime || 0}</td>
                                            <td className="py-2.5 px-4 text-center tabular-nums text-emerald-600 font-bold">{emp.approved || 0}</td>
                                            <td className="py-2.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${approvedPct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold tabular-nums w-8 text-right">{approvedPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
