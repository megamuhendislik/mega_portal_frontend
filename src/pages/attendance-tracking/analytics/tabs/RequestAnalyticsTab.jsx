import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, TrendingUp, PieChart as PieChartIcon, Users, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../shared/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const TYPE_COLORS = { leave: '#3B82F6', overtime: '#F59E0B', meal: '#10B981', cardless: '#8B5CF6', health_report: '#EC4899' };
const TYPE_LABELS = { leave: 'İzin', overtime: 'Ek Mesai', meal: 'Yemek', cardless: 'Kartsız Giriş', health_report: 'Sağlık Raporu' };
const STATUS_COLORS = { approved: '#10B981', rejected: '#EF4444', pending: '#F59E0B', cancelled: '#94A3B8' };

const TR_MONTHS = { Jan: 'Oca', Feb: 'Şub', Mar: 'Mar', Apr: 'Nis', May: 'May', Jun: 'Haz', Jul: 'Tem', Aug: 'Ağu', Sep: 'Eyl', Oct: 'Eki', Nov: 'Kas', Dec: 'Ara' };

export default function RequestAnalyticsTab() {
    const { queryParams } = useAnalytics();
    const [mode, setMode] = useState('personal'); // 'personal' | 'team'
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [range] = useState(6);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const endpoint = mode === 'team'
                ? '/request-analytics/team-overview/'
                : '/request-analytics/';
            const res = await api.get(endpoint, { params: { range } });
            setData(res.data);
        } catch (err) {
            console.error('Request analytics error:', err);
            setError(true);
            setData(null);
        }
        setLoading(false);
    }, [mode, range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Type distribution
    const typeDistData = useMemo(() => {
        if (!data?.type_distribution && !data?.by_type) return [];
        if (data.type_distribution) {
            return data.type_distribution.filter(d => d.count > 0).map(d => ({
                name: d.type || d.name, value: d.count, color: d.color || '#94A3B8',
            }));
        }
        // team format: by_type: { leave: { total, approved }, ... }
        return Object.entries(data.by_type || {}).map(([key, val]) => ({
            name: TYPE_LABELS[key] || key, value: val?.total || 0, color: TYPE_COLORS[key] || '#94A3B8',
        })).filter(d => d.value > 0);
    }, [data]);

    // Status distribution
    const statusDistData = useMemo(() => {
        if (data?.status_distribution) {
            return data.status_distribution.filter(d => d.count > 0).map(d => ({
                name: d.status, value: d.count, color: d.color || '#94A3B8',
            }));
        }
        // Build from team data
        const items = [];
        if (data?.approved_count) items.push({ name: 'Onaylanan', value: data.approved_count, color: STATUS_COLORS.approved });
        if (data?.rejected_count) items.push({ name: 'Reddedilen', value: data.rejected_count, color: STATUS_COLORS.rejected });
        if (data?.pending_count) items.push({ name: 'Bekleyen', value: data.pending_count, color: STATUS_COLORS.pending });
        return items;
    }, [data]);

    // Monthly trend
    const trendData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        return data.monthly_trend.map(m => ({
            name: (m.label || '').replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, (match) => TR_MONTHS[match] || match),
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
            .slice(0, 15);
    }, [data]);

    if (loading) return <LoadingSkeleton rows={3} />;
    if (error) return <ErrorState message="Talep analiz verisi yüklenemedi" onRetry={fetchData} />;

    const totalRequests = data?.total_requests || data?.total_received || 0;
    const approvalRate = data?.approval_rate || 0;

    return (
        <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 w-fit">
                <button onClick={() => setMode('personal')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'personal' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                    <FileText size={14} /> Kişisel
                </button>
                <button onClick={() => setMode('team')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'team' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                    <Users size={14} /> Ekip
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard title="Toplam Talep" value={totalRequests} icon={FileText} gradient="from-slate-700 to-slate-900" />
                <KPICard title="Onay Oranı" value={`${approvalRate}%`} icon={CheckCircle2} gradient="from-emerald-500 to-emerald-600" />
                <KPICard title="Bekleyen"
                    value={data?.pending_count || data?.status_distribution?.find(s => s.status === 'Bekleyen' || s.status === 'PENDING')?.count || 0}
                    icon={AlertCircle} gradient="from-amber-500 to-amber-600" />
                <KPICard title={mode === 'team' ? 'Ort. Karar Süresi' : 'Ek Mesai Saati'}
                    value={mode === 'team' ? (data?.avg_decision_hours ?? '—') : (data?.total_overtime_hours || 0)}
                    suffix={mode === 'team' ? 'saat' : 'saat'}
                    icon={Clock} gradient="from-blue-500 to-blue-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Type distribution pie */}
                <SectionCard title="Tür Dağılımı" icon={PieChartIcon} iconGradient="from-indigo-500 to-indigo-600" collapsible={false}>
                    {typeDistData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={typeDistData} cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                                        dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                                        {typeDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Tür dağılımı verisi yok" />}
                </SectionCard>

                {/* Status distribution pie */}
                <SectionCard title="Durum Dağılımı" icon={CheckCircle2} iconGradient="from-emerald-500 to-emerald-600" collapsible={false}>
                    {statusDistData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusDistData} cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                                        dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                                        {statusDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Durum dağılımı verisi yok" />}
                </SectionCard>
            </div>

            {/* Monthly trend */}
            <SectionCard title="Aylık Trend" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600" subtitle="Talep türleri bazında aylık dağılım">
                {trendData.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="izin" name="İzin" fill={TYPE_COLORS.leave} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="ek_mesai" name="Ek Mesai" fill={TYPE_COLORS.overtime} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="yemek" name="Yemek" fill={TYPE_COLORS.meal} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="kartsız" name="Kartsız" fill={TYPE_COLORS.cardless} radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Trend verisi yok" />}
            </SectionCard>

            {/* Employee breakdown (team mode) */}
            {mode === 'team' && employeeBreakdown.length > 0 && (
                <SectionCard title="Çalışan Bazlı Dağılım" icon={Users} iconGradient="from-blue-500 to-blue-600">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Çalışan</th>
                                    <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Toplam</th>
                                    <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">İzin</th>
                                    <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">OT</th>
                                    <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Onaylı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeBreakdown.map((emp, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="py-2 px-3 font-medium text-slate-700">{emp.name || emp.employee_name}</td>
                                        <td className="py-2 px-3 text-center font-black text-slate-800">{emp.total || 0}</td>
                                        <td className="py-2 px-3 text-center tabular-nums text-blue-600 font-bold">{emp.leave || 0}</td>
                                        <td className="py-2 px-3 text-center tabular-nums text-amber-600 font-bold">{emp.overtime || 0}</td>
                                        <td className="py-2 px-3 text-center tabular-nums text-emerald-600 font-bold">{emp.approved || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
