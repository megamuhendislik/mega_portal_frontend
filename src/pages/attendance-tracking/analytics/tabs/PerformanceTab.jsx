import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Clock, AlarmClock, Coffee, TrendingUp, Calendar, Award, Target, BarChart3 } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area, AreaChart, ComposedChart, Legend, ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                        {typeof p.value === 'number' ? (p.value % 1 !== 0 ? `${Math.floor(p.value)}:${String(Math.round((p.value % 1) * 60)).padStart(2, '0')}` : p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function PerformanceTab() {
    const { employees, queryParams } = useAnalytics();
    const [selectedId, setSelectedId] = useState(null);
    const [personalData, setPersonalData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedId && employees.length > 0) setSelectedId(employees[0].id);
    }, [employees, selectedId]);

    const fetchPersonal = useCallback(async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const res = await api.get('/attendance-analytics/', { params: { ...queryParams, employee_id: selectedId } });
            setPersonalData(res.data);
        } catch { setPersonalData(null); }
        setLoading(false);
    }, [selectedId, queryParams]);

    useEffect(() => { fetchPersonal(); }, [fetchPersonal]);

    // Parse daily hours
    const dailyHours = useMemo(() => {
        if (!personalData?.daily_hours) return [];
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        return personalData.daily_hours.map(d => {
            const dt = new Date(d.date + 'T00:00:00');
            const dayName = dayNames[dt.getDay()];
            return {
                date: `${d.date?.slice(8)}/${d.date?.slice(5, 7)}`,
                dayLabel: `${dayName} ${d.date?.slice(8)}`,
                normal: Math.round((d.worked - (d.ot || 0)) * 10) / 10,
                ot: Math.round((d.ot || 0) * 10) / 10,
                hedef: d.target || 8,
                status: d.status,
            };
        });
    }, [personalData]);

    // Parse entry/exit for area chart
    const entryExitData = useMemo(() => {
        if (!personalData?.entry_exit) return [];
        return personalData.entry_exit.map(d => {
            const parseTime = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h + m / 60; };
            return {
                date: `${d.date?.slice(8)}/${d.date?.slice(5, 7)}`,
                giriş: parseTime(d.first_check_in),
                çıkış: parseTime(d.last_check_out),
            };
        });
    }, [personalData]);

    // Weekly pattern
    const weeklyPattern = useMemo(() => {
        if (!personalData?.weekly_pattern) return [];
        const dayNames = { MON: 'Pazartesi', TUE: 'Salı', WED: 'Çarşamba', THU: 'Perşembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
        return Object.entries(personalData.weekly_pattern).map(([k, v]) => ({
            day: dayNames[k] || k,
            saat: v,
            fill: v >= 8 ? '#10b981' : v >= 6 ? '#6366f1' : v >= 4 ? '#f59e0b' : '#ef4444',
        }));
    }, [personalData]);

    // Calendar data
    const calendarData = useMemo(() => personalData?.calendar || [], [personalData]);
    const statusColors = { full: 'bg-emerald-400', partial: 'bg-amber-400', absent: 'bg-red-400', off: 'bg-slate-200', future: 'bg-slate-100' };

    const kpi = personalData?.kpi;
    const summary = personalData?.summary;
    const selectedEmp = employees.find(e => e.id === selectedId);

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Employee selector */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-4 flex-wrap shadow-sm">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white">
                    <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <select
                        value={selectedId || ''}
                        onChange={e => setSelectedId(parseInt(e.target.value))}
                        className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    >
                        <option value="">Kişi seçin...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.full_name} {e.department_name ? `— ${e.department_name}` : ''}</option>)}
                    </select>
                </div>
                {selectedEmp && (
                    <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">{selectedEmp.department_name || selectedEmp.title || ''}</span>
                )}
            </div>

            {loading ? <LoadingSkeleton rows={4} /> : !personalData ? <EmptyState message="Bir kişi seçin" /> : (
                <>
                    {/* KPI row */}
                    {kpi && (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <KPICard title="Çalışma" value={kpi.total_worked_hours} suffix="saat" icon={Clock}
                                gradient="indigo" delta={kpi.vs_prev?.worked} info={METRIC_EXPLANATIONS.worked_hours} />
                            <KPICard title="Verimlilik" value={`${kpi.efficiency_pct}`} suffix="%" icon={Target}
                                gradient="emerald" delta={kpi.vs_prev?.efficiency} info={METRIC_EXPLANATIONS.efficiency} />
                            <KPICard title="Ek Mesai" value={kpi.overtime_hours} suffix="saat" icon={TrendingUp}
                                gradient="amber" delta={kpi.vs_prev?.ot} info={METRIC_EXPLANATIONS.overtime} />
                            <KPICard title="Kayıp" value={kpi.missing_hours} suffix="saat" icon={BarChart3}
                                gradient="red" delta={kpi.vs_prev?.missing} info={METRIC_EXPLANATIONS.missing_hours} />
                            <KPICard title="Ort. Mola" value={kpi.avg_break_minutes} suffix="dk" icon={Coffee}
                                gradient="cyan" info={METRIC_EXPLANATIONS.break_minutes} />
                        </div>
                    )}

                    {/* Summary info row */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Ort. Giriş', value: summary.avg_check_in || '—', icon: AlarmClock, color: 'emerald' },
                                { label: 'Ort. Çıkış', value: summary.avg_check_out || '—', icon: AlarmClock, color: 'indigo' },
                                { label: 'Dakiklik', value: `${summary.punctuality_pct || 0}%`, icon: Award, color: 'amber', sub: `${summary.punctual_days}/${summary.total_working_days} gün` },
                                { label: 'Yemek Oranı', value: `${summary.meal_orders || 0}/${summary.meal_working_days || 0}`, icon: Coffee, color: 'cyan' },
                            ].map((item, i) => (
                                <KPICard key={i} mini title={item.label} value={item.value} icon={item.icon} gradient={item.color} />
                            ))}
                        </div>
                    )}

                    {/* Daily hours chart */}
                    <SectionCard title="Günlük Çalışma Saatleri" icon={Clock} iconGradient="from-indigo-500 to-indigo-600"
                        subtitle="Normal ve ek mesai saatleri — hedef çizgisi ile">
                        {dailyHours.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dailyHours} barGap={0} barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="dayLabel" tick={{ fontSize: 9, fontWeight: 600 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} unit="h" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: 'Hedef 8h', position: 'right', style: { fontSize: 9, fill: '#ef4444' } }} />
                                        <Bar dataKey="normal" name="Normal" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="ot" name="Ek Mesai" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Günlük veri yok" />}
                    </SectionCard>

                    {/* Entry-exit time trend */}
                    <SectionCard title="Giriş — Çıkış Saatleri Trendi" icon={AlarmClock} iconGradient="from-cyan-500 to-blue-600"
                        subtitle="Gün bazlı ilk giriş ve son çıkış zaman çizgisi">
                        {entryExitData.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={entryExitData}>
                                        <defs>
                                            <linearGradient id="gradEntry" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradExit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 600 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 10 }} domain={[6, 22]}
                                            tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <ReferenceLine y={9} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
                                            label={{ value: '09:00', position: 'left', style: { fontSize: 9, fill: '#94a3b8' } }} />
                                        <Area type="monotone" dataKey="giriş" name="Giriş" stroke="#10b981" strokeWidth={2.5}
                                            fill="url(#gradEntry)" dot={{ r: 2.5, fill: '#10b981' }} activeDot={{ r: 5 }} />
                                        <Area type="monotone" dataKey="çıkış" name="Çıkış" stroke="#6366f1" strokeWidth={2.5}
                                            fill="url(#gradExit)" dot={{ r: 2.5, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Giriş/çıkış verisi yok" />}
                    </SectionCard>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Weekly pattern */}
                        <SectionCard title="Haftalık Çalışma Örüntüsü" icon={TrendingUp} iconGradient="from-violet-500 to-purple-600"
                            subtitle="Ortalama gün bazlı çalışma saatleri">
                            {weeklyPattern.length > 0 ? (
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyPattern} barSize={32}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} />
                                            <YAxis tick={{ fontSize: 10 }} domain={[0, 12]} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1} />
                                            <Bar dataKey="saat" name="Ort. Saat" radius={[8, 8, 0, 0]}>
                                                {weeklyPattern.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <EmptyState message="Haftalık veri yok" />}
                        </SectionCard>

                        {/* Calendar heatmap */}
                        <SectionCard title="Devam Takvimi" icon={Calendar} iconGradient="from-blue-500 to-blue-600"
                            subtitle="Günlük devam durumu haritası">
                            {calendarData.length > 0 ? (
                                <div>
                                    <div className="grid grid-cols-7 gap-1.5 mb-3">
                                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                                            <div key={d} className="text-[9px] font-bold text-slate-400 text-center uppercase">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {/* Pad start with empty cells */}
                                        {(() => {
                                            const firstDate = new Date(calendarData[0]?.date + 'T00:00:00');
                                            const dow = (firstDate.getDay() + 6) % 7; // Mon=0
                                            return Array.from({ length: dow }, (_, i) => <div key={`pad-${i}`} className="w-full aspect-square" />);
                                        })()}
                                        {calendarData.map((d, i) => (
                                            <div key={i}
                                                className={`w-full aspect-square rounded-md ${statusColors[d.status] || 'bg-slate-100'} transition-all hover:scale-110 cursor-pointer relative group`}
                                                title={`${d.date}: ${d.status}`}>
                                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {d.date?.slice(8)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 mt-3 text-[9px] font-bold text-slate-400">
                                        {Object.entries({ full: 'Tam', partial: 'Kısmi', absent: 'Devamsız', off: 'Tatil' }).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1">
                                                <div className={`w-3 h-3 rounded ${statusColors[k]}`} />
                                                {v}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : <EmptyState message="Takvim verisi yok" />}
                        </SectionCard>
                    </div>

                    {/* Leave & absence summary */}
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">İzin Durumu</h4>
                                <KPIProgressBar label="Kullanılan İzin" value={summary.leave_used || 0} max={summary.leave_total || 14} suffix={` / ${summary.leave_total || 0} gün`} color="#8b5cf6" />
                                <p className="text-[10px] text-slate-400">Kalan: <strong className="text-slate-600">{(summary.leave_total || 0) - (summary.leave_used || 0)} gün</strong></p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Devamsızlık</h4>
                                <div className="text-3xl font-black text-red-500">{summary.absence_days || 0}<span className="text-sm text-slate-400 ml-1">gün</span></div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Erken Giriş</h4>
                                <div className="text-2xl font-black text-emerald-600">{summary.earliest_check_in?.time || '—'}</div>
                                <p className="text-[10px] text-slate-400">{summary.earliest_check_in?.date || ''}</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
