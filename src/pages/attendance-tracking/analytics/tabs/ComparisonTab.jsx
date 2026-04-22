import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, GitCompare } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import PersonSelector from '../shared/PersonSelector';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PERSON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function ComparisonTab() {
    const { employees, queryParams, data: bulkData } = useAnalytics();
    const [mode, setMode] = useState('person'); // 'person' | 'team'
    const [selectedIds, setSelectedIds] = useState([]);
    const [compareData, setCompareData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch comparison data for selected employees
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

    // Radar data for person comparison
    const radarData = useMemo(() => {
        if (!compareData || compareData.length < 2) return [];
        const metrics = [
            { key: 'efficiency', label: 'Verimlilik', extract: d => d?.kpi?.efficiency_pct || 0 },
            { key: 'punctuality', label: 'Dakiklik', extract: d => d?.summary?.punctuality_pct || 0 },
            { key: 'overtime', label: 'Ek Mesai', extract: d => Math.min((d?.kpi?.overtime_hours || 0) * 3, 100) },
            { key: 'attendance', label: 'Devam', extract: d => 100 - (d?.summary?.absence_days || 0) * 5 },
            { key: 'break', label: 'Mola Uyumu', extract: d => Math.max(0, 100 - Math.abs((d?.kpi?.avg_break_minutes || 0) - 60) * 2) },
        ];
        return metrics.map(m => {
            const point = { metric: m.label };
            compareData.forEach((c, i) => {
                const emp = employees.find(e => e.id === c.id);
                const name = (emp?.name || emp?.full_name || `Kişi ${i + 1}`).split(' ')[0];
                point[name] = Math.round(m.extract(c.data));
            });
            return point;
        });
    }, [compareData, employees]);

    // Bar data for team comparison
    const teamBarData = useMemo(() => {
        const overview = bulkData?.team_overview;
        if (!overview?.department_breakdown) return [];
        return overview.department_breakdown.map(d => ({
            name: d.name || d.department || '',
            verimlilik: d.efficiency_pct || 0,
            'ek mesai': Math.round((d.overtime_hours || 0) * 10) / 10,
            kayıp: Math.round((d.missing_hours || 0) * 10) / 10,
        }));
    }, [bulkData]);

    const radarKeys = useMemo(() => {
        if (!radarData.length) return [];
        return Object.keys(radarData[0]).filter(k => k !== 'metric');
    }, [radarData]);

    return (
        <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 w-fit">
                <button onClick={() => setMode('person')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'person' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <GitCompare size={14} /> Kişi vs Kişi
                </button>
                <button onClick={() => setMode('team')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'team' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Users size={14} /> Ekip vs Ekip
                </button>
            </div>

            {mode === 'person' ? (
                <>
                    {/* Person selector */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
                        <PersonSelector
                            employees={employees.map(e => ({ ...e, name: e.name || e.full_name }))}
                            selected={selectedIds}
                            onChange={setSelectedIds}
                            max={4}
                            label="Karşılaştırılacak kişileri seçin"
                        />
                    </div>

                    {selectedIds.length < 2 ? (
                        <EmptyState icon={GitCompare} message="Karşılaştırma için en az 2 kişi seçin" />
                    ) : loading ? (
                        <LoadingSkeleton rows={2} />
                    ) : radarData.length > 0 ? (
                        <>
                            {/* Radar chart */}
                            <SectionCard title="Performans Karşılaştırması" icon={GitCompare}
                                iconGradient="from-indigo-500 to-purple-600" subtitle="Çoklu metrik radar analizi" collapsible={false}>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 700 }} />
                                            <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                                            {radarKeys.map((key, i) => (
                                                <Radar key={key} name={key} dataKey={key}
                                                    stroke={PERSON_COLORS[i]} fill={PERSON_COLORS[i]}
                                                    fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                                            ))}
                                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Detail table */}
                            <SectionCard title="Detaylı Karşılaştırma" icon={Users} iconGradient="from-slate-500 to-slate-700" collapsible>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left py-2 px-3 text-slate-400 text-[10px] uppercase font-bold">Metrik</th>
                                                {compareData?.map((c, i) => {
                                                    const emp = employees.find(e => e.id === c.id);
                                                    return <th key={c.id} className="text-center py-2 px-3 text-[10px] uppercase font-bold" style={{ color: PERSON_COLORS[i] }}>
                                                        {(emp?.name || emp?.full_name || '').split(' ').slice(0, 2).join(' ')}
                                                    </th>;
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { label: 'Verimlilik', get: d => `${d?.kpi?.efficiency_pct || 0}%` },
                                                { label: 'Çalışma (saat)', get: d => d?.kpi?.total_worked_hours || 0 },
                                                { label: 'Ek Mesai (saat)', get: d => d?.kpi?.overtime_hours || 0 },
                                                { label: 'Kayıp (saat)', get: d => d?.kpi?.missing_hours || 0 },
                                                { label: 'Dakiklik', get: d => `${d?.summary?.punctuality_pct || 0}%` },
                                                { label: 'Ort. Giriş', get: d => d?.summary?.avg_check_in || '—' },
                                                { label: 'Ort. Çıkış', get: d => d?.summary?.avg_check_out || '—' },
                                                { label: 'Ort. Mola (dk)', get: d => d?.kpi?.avg_break_minutes || 0 },
                                                { label: 'Yemek', get: d => d?.summary?.meal_orders || 0 },
                                            ].map((row, ri) => (
                                                <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                    <td className="py-2 px-3 font-medium text-slate-600">{row.label}</td>
                                                    {compareData?.map(c => (
                                                        <td key={c.id} className="py-2 px-3 text-center font-bold text-slate-800 tabular-nums">{row.get(c.data)}</td>
                                                    ))}
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
                <SectionCard title="Departman Karşılaştırması" icon={Users} iconGradient="from-cyan-500 to-blue-600"
                    subtitle="Departman bazlı performans kıyaslaması" collapsible={false}>
                    {teamBarData.length > 0 ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamBarData} layout="vertical" barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="verimlilik" name="Verimlilik %" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="ek mesai" name="Ek Mesai (saat)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="kayıp" name="Kayıp (saat)" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Departman verisi yok" />}
                </SectionCard>
            )}
        </div>
    );
}
