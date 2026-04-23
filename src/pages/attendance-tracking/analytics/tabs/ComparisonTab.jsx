import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, GitCompare, Award, Target, Clock, AlarmClock, TrendingUp, Shield } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import PersonSelector from '../shared/PersonSelector';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import ChartTooltip from '../shared/ChartTooltip';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Cell,
} from 'recharts';

const PERSON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
const PERSON_BG = ['bg-indigo-50 text-indigo-700 border-indigo-200', 'bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-amber-50 text-amber-700 border-amber-200', 'bg-red-50 text-red-700 border-red-200'];

export default function ComparisonTab() {
    const { employees, queryParams, data: bulkData, departments } = useAnalytics();
    const [mode, setMode] = useState('person');
    const [selectedIds, setSelectedIds] = useState([]);
    const [compareData, setCompareData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchCompare = useCallback(async () => {
        if (selectedIds.length < 2) { setCompareData(null); return; }
        setLoading(true);
        try {
            const results = await Promise.all(
                selectedIds.map(id =>
                    api.get('/attendance-analytics/', { params: { ...queryParams, employee_id: id } })
                        .then(r => ({ id, data: r.data }))
                        .catch(() => ({ id, data: null }))
                )
            );
            setCompareData(results.filter(r => r.data));
        } catch { setCompareData(null); }
        setLoading(false);
    }, [selectedIds, queryParams]);

    useEffect(() => { if (mode === 'person') fetchCompare(); }, [fetchCompare, mode]);

    // Department comparison
    const [deptIds, setDeptIds] = useState([]);
    const [deptData, setDeptData] = useState(null);
    const [deptLoading, setDeptLoading] = useState(false);

    const fetchDeptCompare = useCallback(async () => {
        if (deptIds.length < 2) { setDeptData(null); return; }
        setDeptLoading(true);
        try {
            const res = await api.get('/attendance-analytics/team-overview/', {
                params: { ...queryParams, department_ids: deptIds.join(','), compare_departments: '1' },
            });
            setDeptData(res.data?.department_comparison || []);
        } catch { setDeptData(null); }
        setDeptLoading(false);
    }, [deptIds, queryParams]);

    useEffect(() => { if (mode === 'team') fetchDeptCompare(); }, [fetchDeptCompare, mode]);

    // Radar data
    const radarData = useMemo(() => {
        if (!compareData || compareData.length < 2) return [];
        const metrics = [
            { label: 'Verimlilik', extract: d => Math.min(d?.kpi?.efficiency_pct || 0, 100) },
            { label: 'Dakiklik', extract: d => d?.summary?.punctuality_pct || 0 },
            { label: 'Devam', extract: d => Math.max(0, 100 - (d?.summary?.absence_days || 0) * 10) },
            { label: 'Mola Uyumu', extract: d => Math.max(0, 100 - Math.abs((d?.kpi?.avg_break_minutes || 0) - 60) * 2) },
            { label: 'Çalışma Saati', extract: d => { const t = d?.kpi?.total_worked_hours || 0; const tgt = d?.kpi?.target_hours || 176; return Math.min(Math.round(t / tgt * 100), 100); } },
        ];
        return metrics.map(m => {
            const point = { metric: m.label };
            compareData.forEach((c, i) => {
                const emp = employees.find(e => e.id === c.id);
                const name = (emp?.name || emp?.full_name || `#${i + 1}`).split(' ').slice(0, 2).join(' ');
                point[name] = Math.round(m.extract(c.data));
            });
            return point;
        });
    }, [compareData, employees]);

    const radarKeys = useMemo(() => radarData.length > 0 ? Object.keys(radarData[0]).filter(k => k !== 'metric') : [], [radarData]);

    // Department bar data
    const deptBarData = useMemo(() => {
        if (!deptData) return [];
        return deptData.map(d => ({
            name: (d.department_name || '').length > 12 ? (d.department_name || '').slice(0, 12) + '…' : d.department_name || '',
            verimlilik: d.avg_efficiency_pct || 0,
            devam: d.attendance_rate_pct || 0,
            kişi: d.employee_count || 0,
        }));
    }, [deptData]);

    // Detail comparison rows
    const detailRows = [
        { label: 'Verimlilik', get: d => `${d?.kpi?.efficiency_pct || 0}%`, icon: Target },
        { label: 'Çalışma (saat)', get: d => d?.kpi?.total_worked_hours || 0, icon: Clock },
        { label: 'Hedef (saat)', get: d => d?.kpi?.target_hours || '—', icon: Target },
        { label: 'Ek Mesai (saat)', get: d => d?.kpi?.overtime_hours || 0, icon: TrendingUp },
        { label: 'Kayıp (saat)', get: d => d?.kpi?.missing_hours || 0, icon: Shield },
        { label: 'Dakiklik', get: d => `${d?.summary?.punctuality_pct || 0}%`, icon: Award },
        { label: 'Ort. Giriş', get: d => d?.summary?.avg_check_in || '—', icon: AlarmClock },
        { label: 'Ort. Çıkış', get: d => d?.summary?.avg_check_out || '—', icon: AlarmClock },
        { label: 'Ort. Mola (dk)', get: d => d?.kpi?.avg_break_minutes || 0 },
        { label: 'Devamsızlık', get: d => `${d?.summary?.absence_days || 0} gün` },
        { label: 'Yemek', get: d => `${d?.summary?.meal_orders || 0}/${d?.summary?.meal_working_days || 0}` },
    ];

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 w-fit shadow-sm">
                {[{ key: 'person', label: 'Kişi vs Kişi', icon: GitCompare }, { key: 'team', label: 'Ekip vs Ekip', icon: Users }].map(m => (
                    <button key={m.key} onClick={() => setMode(m.key)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === m.key ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <m.icon size={15} /> {m.label}
                    </button>
                ))}
            </div>

            {mode === 'person' ? (
                <>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                        <PersonSelector employees={employees.map(e => ({ ...e, name: e.name || e.full_name }))}
                            selected={selectedIds} onChange={setSelectedIds} max={4} label="Karşılaştırılacak kişileri seçin" />
                    </div>

                    {selectedIds.length < 2 ? (
                        <div className="text-center py-20">
                            <GitCompare size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-lg font-bold text-slate-400">En az 2 kişi seçin</p>
                            <p className="text-sm text-slate-300 mt-1">Karşılaştırma için yukarıdan kişileri ekleyin</p>
                        </div>
                    ) : loading ? <LoadingSkeleton rows={2} /> : radarData.length > 0 ? (
                        <>
                            {/* Radar */}
                            <SectionCard title="Performans Radar Karşılaştırması" icon={GitCompare}
                                iconGradient="from-indigo-500 to-purple-600" collapsible={false}>
                                <div className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                            <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0, 100]} />
                                            {radarKeys.map((key, i) => (
                                                <Radar key={key} name={key} dataKey={key}
                                                    stroke={PERSON_COLORS[i]} fill={PERSON_COLORS[i]}
                                                    fillOpacity={0.12} strokeWidth={2.5}
                                                    dot={{ r: 4, fill: PERSON_COLORS[i], strokeWidth: 0 }} />
                                            ))}
                                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                            <Tooltip content={<ChartTooltip />} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Detail table */}
                            <SectionCard title="Detaylı Karşılaştırma Tablosu" icon={Users} iconGradient="from-slate-600 to-slate-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100">
                                                <th className="text-left py-3 px-4 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Metrik</th>
                                                {compareData?.map((c, i) => {
                                                    const emp = employees.find(e => e.id === c.id);
                                                    return (
                                                        <th key={c.id} className="text-center py-3 px-4">
                                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${PERSON_BG[i]}`}>
                                                                {(emp?.name || emp?.full_name || '').split(' ').slice(0, 2).join(' ')}
                                                            </span>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailRows.map((row, ri) => (
                                                <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-2.5 px-4 font-medium text-slate-600 flex items-center gap-2">
                                                        {row.icon && <row.icon size={13} className="text-slate-300" />}
                                                        {row.label}
                                                    </td>
                                                    {compareData?.map((c, ci) => {
                                                        const val = row.get(c.data);
                                                        // Highlight best value
                                                        const allVals = compareData.map(x => {
                                                            const v = row.get(x.data);
                                                            return typeof v === 'number' ? v : parseFloat(v) || 0;
                                                        });
                                                        const isNumeric = typeof val === 'number' || (!isNaN(parseFloat(val)) && !String(val).includes(':'));
                                                        const isBest = isNumeric && !row.label.includes('Kayıp') && !row.label.includes('Devamsız') &&
                                                            parseFloat(val) === Math.max(...allVals);
                                                        return (
                                                            <td key={c.id} className={`py-2.5 px-4 text-center tabular-nums transition-colors ${isBest ? 'font-black text-emerald-600' : 'font-bold text-slate-800'}`}>
                                                                {val}
                                                                {isBest && <span className="ml-1 text-[8px]">🏆</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SectionCard>
                        </>
                    ) : <EmptyState message="Karşılaştırma verisi oluşturulamadı" />}
                </>
            ) : (
                /* Team vs Team */
                <>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Karşılaştırılacak Departmanları Seçin (min 2)</label>
                        <div className="flex flex-wrap gap-2">
                            {departments.map(d => {
                                const isSelected = deptIds.includes(d.id);
                                return (
                                    <button key={d.id}
                                        onClick={() => setDeptIds(prev => isSelected ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                        {d.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {deptIds.length < 2 ? (
                        <EmptyState icon={Users} message="Karşılaştırma için en az 2 departman seçin" />
                    ) : deptLoading ? <LoadingSkeleton rows={2} /> : deptBarData.length > 0 ? (
                        <>
                            <SectionCard title="Departman Performans Karşılaştırması" icon={Users}
                                iconGradient="from-cyan-500 to-blue-600" collapsible={false}>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={deptBarData} barGap={4} barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                            <Bar dataKey="verimlilik" name="Verimlilik %" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="devam" name="Devam %" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Detail table */}
                            <SectionCard title="Departman Detay Tablosu" icon={BarChart3} iconGradient="from-slate-600 to-slate-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100">
                                                {['Departman', 'Kişi', 'Verimlilik', 'Devam', 'Çalışma', 'Ek Mesai', 'Kayıp'].map(h => (
                                                    <th key={h} className="text-center py-3 px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider first:text-left">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(deptData || []).map((d, i) => (
                                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                    <td className="py-2.5 px-3 font-bold text-slate-700">{d.department_name}</td>
                                                    <td className="py-2.5 px-3 text-center tabular-nums">{d.employee_count}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.avg_efficiency_pct >= 90 ? 'bg-emerald-50 text-emerald-700' : d.avg_efficiency_pct >= 70 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                                                            {d.avg_efficiency_pct}%
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-bold tabular-nums">{d.attendance_rate_pct}%</td>
                                                    <td className="py-2.5 px-3 text-center tabular-nums">{d.total_worked_hours}h</td>
                                                    <td className="py-2.5 px-3 text-center tabular-nums text-amber-600 font-bold">{d.total_overtime_hours}h</td>
                                                    <td className="py-2.5 px-3 text-center tabular-nums text-red-500 font-bold">{d.total_missing_hours}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SectionCard>
                        </>
                    ) : <EmptyState message="Departman verisi yok" />}
                </>
            )}
        </div>
    );
}
