import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Tooltip, Progress, Empty, Button } from 'antd';
import {
    Users, Calendar, Coins, Hourglass, UserCheck, Clock,
    TrendingDown, AlertCircle, Award, ChevronRight, Maximize2,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import TenureDetailModal from './TenureDetailModal';
import SpanDetailModal from './SpanDetailModal';
import LeaveBalanceDetailModal from './LeaveBalanceDetailModal';

/**
 * WorkforcePanel — Tier 1 6 KPI'yi tek ekranda gösterir.
 *
 * Backend: GET /api/attendance-analytics/workforce/
 *
 * KPI'lar:
 *  1. Kıdem Dağılımı     (tenure)
 *  2. Span of Control    (yönetici yükü)
 *  3. İzin Bakiye Yükü   (leave liability)
 *  4. Onay Süresi        (approval_delays)
 *  5. Vekalet Kullanım   (delegation)
 *  6. Eksik Saat Trendi  (missing_hours)
 */

const TENURE_COLORS = { '<1yr': '#94a3b8', '1-5yr': '#6366f1', '5-10yr': '#10b981', '10yr+': '#f59e0b' };
const APPROVAL_COLORS = { '<24h': '#10b981', '24-48h': '#6366f1', '48-72h': '#f59e0b', '72h-1w': '#f97316', '>1w': '#ef4444' };

export default function WorkforcePanel() {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tenureModalOpen, setTenureModalOpen] = useState(false);
    const [spanModalOpen, setSpanModalOpen] = useState(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);

    useEffect(() => {
        if (!queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get('/attendance-analytics/workforce/', { params: queryParams, timeout: 30000 })
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch((err) => {
                if (!cancelled) setError(err?.response?.data?.error || err?.message);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [queryParams]);

    if (loading) return null; // Sessiz yükleme - opsiyonel widget
    if (error || !data) return null;

    const { tenure, span_of_control, leave_liability, approval_delays, delegation, missing_hours } = data;

    // Tenure pie data
    const tenureData = Object.entries(tenure?.distribution || {}).map(([k, v]) => ({
        name: k, value: v, color: TENURE_COLORS[k],
    })).filter((d) => d.value > 0);

    // Span hierarchical data — top 5 managers with direct/indirect breakdown
    const spanData = (span_of_control?.managers || []).slice(0, 5).map((m) => ({
        name: m.name?.split(' ')[0] || m.name,
        direct: m.direct_count || 0,
        indirect: m.indirect_count || 0,
        total: m.total_managed || 0,
    }));

    // Approval bar data
    const approvalData = Object.entries(approval_delays?.buckets || {}).map(([k, v]) => ({
        name: k, value: v, color: APPROVAL_COLORS[k],
    }));

    // Missing hours line data
    const missingTrend = (missing_hours?.monthly || []).map((m) => ({
        ay: m.month?.slice(5) || m.month,
        saat: m.missing_hours,
        kişi: m.employees_affected,
    }));

    return (
        <div className="space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <Award size={18} className="text-violet-600" />
                <h2 className="text-lg font-bold text-slate-800">İşgücü Metrikleri</h2>
                <Tag color="purple" className="ml-1">6 KPI</Tag>
            </div>

            {/* Grid 1: Tenure + Span + Liability */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Tenure */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={16} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-800">Kıdem Dağılımı</h3>
                        <Tag color="default" className="ml-auto text-[10px]">
                            {tenure?.total || 0} çalışan
                        </Tag>
                        <Tooltip title="Genişlet — her çalışanı ayrı bar olarak gör + tam liste">
                            <Button
                                type="text"
                                size="small"
                                icon={<Maximize2 size={13} />}
                                onClick={() => setTenureModalOpen(true)}
                                disabled={!tenure?.all_employees?.length}
                                className="text-slate-400 hover:text-indigo-600"
                            />
                        </Tooltip>
                    </div>
                    {tenureData.length > 0 ? (
                        <>
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={tenureData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                        <RTooltip content={<ChartTooltip unit=" kişi" />} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 700, fill: '#1e293b' }}>
                                            {tenureData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                                <span>Ort. <span className="font-bold text-slate-700">{Math.round((tenure?.avg_months || 0) / 12 * 10) / 10}</span> yıl</span>
                                <span>Medyan <span className="font-bold text-slate-700">{Math.round((tenure?.median_months || 0) / 12 * 10) / 10}</span> yıl</span>
                            </div>
                        </>
                    ) : <Empty description="Veri yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </div>

                {/* Span of Control — Hiyerarşik */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <UserCheck size={16} className="text-emerald-600" />
                        <h3 className="font-bold text-slate-800">Yönetici Yükü</h3>
                        {span_of_control?.overloaded_count > 0 && (
                            <Tag color="red" className="text-[10px]">
                                {span_of_control.overloaded_count} aşırı yüklü
                            </Tag>
                        )}
                        <Tooltip title="Genişlet — alt ağaç + tam liste">
                            <Button
                                type="text"
                                size="small"
                                icon={<Maximize2 size={13} />}
                                onClick={() => setSpanModalOpen(true)}
                                className="ml-auto text-slate-400 hover:text-emerald-600"
                            />
                        </Tooltip>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-slate-50 rounded-lg p-2">
                            <div className="text-xl font-black text-slate-800 tabular-nums">{span_of_control?.total_managers || 0}</div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Yönetici</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2">
                            <div className="text-xl font-black text-emerald-700 tabular-nums">{span_of_control?.avg_total_managed || 0}</div>
                            <div className="text-[9px] text-emerald-600 uppercase tracking-wider">Ort. Toplam</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2">
                            <div className="text-xl font-black text-amber-700 tabular-nums">{span_of_control?.max_total_managed || 0}</div>
                            <div className="text-[9px] text-amber-600 uppercase tracking-wider">Maks.</div>
                        </div>
                    </div>
                    {spanData.length > 0 && (
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spanData} layout="vertical" barSize={14}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 9 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={50} />
                                    <RTooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const d = payload[0]?.payload || {};
                                            return (
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
                                                    <div className="font-bold text-slate-800 mb-1">{d.name}</div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-indigo-600">Direkt:</span>
                                                        <span className="font-bold tabular-nums">{d.direct} kişi</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-amber-600">Dolaylı:</span>
                                                        <span className="font-bold tabular-nums">{d.indirect} kişi</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-slate-100">
                                                        <span className="text-slate-700 font-semibold">Toplam:</span>
                                                        <span className="font-black tabular-nums">{d.total} kişi</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="direct" stackId="span" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="indirect" stackId="span" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Leave Balance */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Coins size={16} className="text-amber-700" />
                        <h3 className="font-bold text-slate-800">İzin Bakiyesi</h3>
                        <Tooltip title="Genişlet — kişi bazlı detay">
                            <Button
                                type="text"
                                size="small"
                                icon={<Maximize2 size={13} />}
                                onClick={() => setLeaveModalOpen(true)}
                                className="ml-auto text-slate-400 hover:text-amber-600"
                            />
                        </Tooltip>
                    </div>
                    <div className="text-3xl font-black text-amber-800 tabular-nums mb-2">
                        {leave_liability?.total_days_remaining || 0}
                        <span className="text-lg text-slate-500"> gün</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-3">
                        <span className="font-bold">{leave_liability?.total_employees_with_balance || 0} çalışan</span>'da birikmiş
                        (ort. <span className="font-bold">{leave_liability?.avg_days_per_employee || 0} gün</span>/kişi)
                    </div>
                    {leave_liability?.expiring_soon?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                            <div className="text-[10px] font-bold text-red-700 uppercase mb-1">
                                ⚠ 30 gün içinde expire
                            </div>
                            {leave_liability.expiring_soon.slice(0, 3).map((e) => (
                                <div key={e.employee_id} className="flex items-center justify-between text-[11px] text-slate-700">
                                    <span className="truncate">{e.name}</span>
                                    <span className="font-bold tabular-nums text-red-600">
                                        {e.days_remaining}g · {e.days_until_expiry}gün kaldı
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Grid 2: Approval + Delegation + Missing Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Approval Delay */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Hourglass size={16} className="text-blue-600" />
                        <h3 className="font-bold text-slate-800">Onay Süresi</h3>
                        <Tag color="blue" className="ml-auto">
                            {approval_delays?.total_decided || 0} karar
                        </Tag>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                        <div>
                            <div className="text-lg font-black text-slate-800 tabular-nums">{approval_delays?.avg_hours || 0}</div>
                            <div className="text-[9px] text-slate-500">ORT (sa)</div>
                        </div>
                        <div>
                            <div className="text-lg font-black text-indigo-700 tabular-nums">{approval_delays?.median_hours || 0}</div>
                            <div className="text-[9px] text-slate-500">MEDYAN</div>
                        </div>
                        <div>
                            <div className="text-lg font-black text-red-700 tabular-nums">{approval_delays?.p95_hours || 0}</div>
                            <div className="text-[9px] text-slate-500">P95</div>
                        </div>
                    </div>
                    {approvalData.some(d => d.value > 0) && (
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={approvalData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 9 }} />
                                    <RTooltip content={<ChartTooltip unit=" karar" />} />
                                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                                        {approvalData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Delegation */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={16} className="text-violet-600" />
                        <h3 className="font-bold text-slate-800">Vekalet Kullanım</h3>
                        <Tag color="purple" className="ml-auto">
                            {delegation?.active_count || 0} aktif
                        </Tag>
                    </div>
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Vekil tutan</span>
                            <span className="font-bold tabular-nums">{delegation?.total_principals || 0} kişi</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Vekil olan</span>
                            <span className="font-bold tabular-nums">{delegation?.total_substitutes || 0} kişi</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Ortalama süre</span>
                            <span className="font-bold tabular-nums">{delegation?.avg_duration_days || 0} gün</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Uzun vadeli (&gt;30g)</span>
                            <span className={`font-bold tabular-nums ${delegation?.long_term_count > 5 ? 'text-orange-600' : 'text-slate-700'}`}>
                                {delegation?.long_term_count || 0} adet
                            </span>
                        </div>
                    </div>
                    {delegation?.expiring_soon?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <div className="text-[10px] font-bold text-amber-700 uppercase mb-1">
                                ⏳ 7 gün içinde bitiyor
                            </div>
                            {delegation.expiring_soon.slice(0, 2).map((e, i) => (
                                <div key={i} className="text-[11px] text-slate-700 flex items-center gap-1">
                                    <span className="truncate flex-1">{e.principal} → {e.substitute}</span>
                                    <span className="font-bold text-amber-700 tabular-nums">{e.days_left}g</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Missing Hours Trend */}
                <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/30 to-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingDown size={16} className="text-red-600" />
                        <h3 className="font-bold text-slate-800">Eksik Saat Trendi</h3>
                    </div>
                    <div className="text-3xl font-black text-red-700 tabular-nums mb-1">
                        {missing_hours?.cumulative_hours || 0}<span className="text-lg text-slate-500"> sa</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-3">
                        Toplam eksik saat (kümülatif)
                    </div>
                    {missingTrend.length > 0 && (
                        <div className="h-24 mb-3">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={missingTrend}>
                                    <defs>
                                        <linearGradient id="missingGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="ay" tick={{ fontSize: 9 }} />
                                    <RTooltip content={<ChartTooltip unit=" sa" />} />
                                    <Area type="monotone" dataKey="saat" stroke="#ef4444" fill="url(#missingGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {missing_hours?.top_5_employees?.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">En Yüksek 5 Eksik</div>
                            {missing_hours.top_5_employees.slice(0, 3).map((e) => (
                                <div key={e.employee_id} className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-700 truncate">{e.name}</span>
                                    <span className="font-bold text-red-600 tabular-nums">{e.missing_hours}sa</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tenure detail modal — genişletilmiş görünüm */}
            <TenureDetailModal
                open={tenureModalOpen}
                onClose={() => setTenureModalOpen(false)}
                data={tenure}
            />

            {/* Span of Control detail modal */}
            <SpanDetailModal
                open={spanModalOpen}
                onClose={() => setSpanModalOpen(false)}
                data={span_of_control}
            />

            {/* Leave Balance detail modal — kişi bazlı yıllık + mazeret detay */}
            <LeaveBalanceDetailModal
                open={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
            />
        </div>
    );
}
