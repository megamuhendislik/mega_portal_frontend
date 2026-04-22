import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Clock, AlarmClock, Coffee, TrendingUp } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

export default function PerformanceTab() {
    const { employees, queryParams } = useAnalytics();
    const [selectedId, setSelectedId] = useState(null);
    const [personalData, setPersonalData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Auto-select first employee if none selected
    useEffect(() => {
        if (!selectedId && employees.length > 0) {
            setSelectedId(employees[0].id);
        }
    }, [employees, selectedId]);

    // Fetch personal analytics
    const fetchPersonal = useCallback(async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const res = await api.get('/attendance-analytics/', {
                params: { ...queryParams, employee_id: selectedId },
            });
            setPersonalData(res.data);
        } catch (err) {
            console.error('Performance fetch error:', err);
            setPersonalData(null);
        }
        setLoading(false);
    }, [selectedId, queryParams]);

    useEffect(() => { fetchPersonal(); }, [fetchPersonal]);

    const dailyHours = useMemo(() => {
        if (!personalData?.daily_hours) return [];
        return personalData.daily_hours.map(d => ({
            date: d.date?.slice(5) || '',
            worked: d.worked || 0,
            target: d.target || 8,
            ot: d.ot || 0,
        }));
    }, [personalData]);

    const entryExitData = useMemo(() => {
        if (!personalData?.entry_exit) return [];
        return personalData.entry_exit.map(d => {
            const parseTime = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h + m / 60; };
            return {
                date: d.date?.slice(5) || '',
                giriş: parseTime(d.first_check_in),
                çıkış: parseTime(d.last_check_out),
            };
        });
    }, [personalData]);

    const weeklyPattern = useMemo(() => {
        if (!personalData?.weekly_pattern) return [];
        const dayNames = { MON: 'Pzt', TUE: 'Sal', WED: 'Çar', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz' };
        return Object.entries(personalData.weekly_pattern).map(([k, v]) => ({
            day: dayNames[k] || k,
            saat: v,
        }));
    }, [personalData]);

    const kpi = personalData?.kpi;
    const summary = personalData?.summary;
    const selectedEmp = employees.find(e => e.id === selectedId);

    return (
        <div className="space-y-5">
            {/* Employee selector */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <User size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-slate-700">Kişi:</span>
                    <select
                        value={selectedId || ''}
                        onChange={e => setSelectedId(parseInt(e.target.value))}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 min-w-[200px]"
                    >
                        <option value="">Seçiniz...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.full_name}</option>)}
                    </select>
                    {selectedEmp && (
                        <span className="text-xs text-slate-400">{selectedEmp.department_name || ''}</span>
                    )}
                </div>
            </div>

            {loading ? <LoadingSkeleton rows={3} /> : !personalData ? <EmptyState message="Kişi seçin" /> : (
                <>
                    {/* KPI row */}
                    {kpi && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { label: 'Çalışma', val: `${kpi.total_worked_hours}h`, color: 'text-indigo-600', bg: 'bg-indigo-50', delta: kpi.vs_prev?.worked },
                                { label: 'Verimlilik', val: `${kpi.efficiency_pct}%`, color: 'text-emerald-600', bg: 'bg-emerald-50', delta: kpi.vs_prev?.efficiency },
                                { label: 'Ek Mesai', val: `${kpi.overtime_hours}h`, color: 'text-amber-600', bg: 'bg-amber-50', delta: kpi.vs_prev?.ot },
                                { label: 'Kayıp', val: `${kpi.missing_hours}h`, color: 'text-red-600', bg: 'bg-red-50', delta: kpi.vs_prev?.missing },
                                { label: 'Ort. Mola', val: `${kpi.avg_break_minutes} dk`, color: 'text-orange-600', bg: 'bg-orange-50' },
                            ].map((item, i) => (
                                <div key={i} className={`${item.bg} rounded-2xl p-4 border border-slate-100`}>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                                    <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
                                    {item.delta != null && (
                                        <p className={`text-[10px] font-bold mt-0.5 ${item.delta > 0 ? 'text-emerald-500' : item.delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {item.delta > 0 ? '+' : ''}{item.delta}% vs önceki
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary row */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Ort. Giriş</p>
                                <p className="text-lg font-black text-slate-800">{summary.avg_check_in || '—'}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Ort. Çıkış</p>
                                <p className="text-lg font-black text-slate-800">{summary.avg_check_out || '—'}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Dakiklik</p>
                                <p className="text-lg font-black text-slate-800">{summary.punctuality_pct || 0}%</p>
                                <p className="text-[10px] text-slate-400">{summary.punctual_days}/{summary.total_working_days} gün</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Yemek / İş Günü</p>
                                <p className="text-lg font-black text-slate-800">{summary.meal_orders || 0}/{summary.meal_working_days || 0}</p>
                            </div>
                        </div>
                    )}

                    {/* Daily hours chart */}
                    <SectionCard title="Günlük Çalışma Saatleri" icon={Clock} iconGradient="from-indigo-500 to-indigo-600" subtitle="Hedef vs gerçekleşen çalışma süreleri">
                        {dailyHours.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyHours} barGap={0}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                        <Bar dataKey="worked" name="Normal" fill="#6366f1" radius={[3, 3, 0, 0]} stackId="a" />
                                        <Bar dataKey="ot" name="Ek Mesai" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" />
                                        <Line type="monotone" dataKey="target" name="Hedef" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Günlük veri yok" />}
                    </SectionCard>

                    {/* Entry-exit time trend */}
                    <SectionCard title="Giriş / Çıkış Saatleri" icon={AlarmClock} iconGradient="from-cyan-500 to-blue-600" subtitle="Gün bazlı ilk giriş ve son çıkış saatleri">
                        {entryExitData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={entryExitData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 10 }} domain={[6, 22]}
                                            tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`} />
                                        <Tooltip formatter={(val) => val ? `${Math.floor(val)}:${String(Math.round((val % 1) * 60)).padStart(2, '0')}` : '—'}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                        <Area type="monotone" dataKey="giriş" name="Giriş" stroke="#10b981" fill="#10b98120" dot={{ r: 2 }} />
                                        <Area type="monotone" dataKey="çıkış" name="Çıkış" stroke="#6366f1" fill="#6366f120" dot={{ r: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Giriş/çıkış verisi yok" />}
                    </SectionCard>

                    {/* Weekly pattern */}
                    <SectionCard title="Haftalık Örüntü" icon={TrendingUp} iconGradient="from-violet-500 to-purple-600" subtitle="Ortalama günlük çalışma süreleri">
                        {weeklyPattern.length > 0 ? (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyPattern}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 700 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                        <Bar dataKey="saat" name="Ort. Saat" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Haftalık veri yok" />}
                    </SectionCard>
                </>
            )}
        </div>
    );
}
