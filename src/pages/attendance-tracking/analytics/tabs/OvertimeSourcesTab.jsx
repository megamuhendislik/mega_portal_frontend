import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tag, Input, Switch, Segmented, Tooltip as AntTooltip } from 'antd';
import { Clock, CheckCircle2, Hourglass, AlertTriangle, PieChart as PieIcon, BarChart3, Users, ChevronRight, FileSignature, ShieldCheck } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import ScopeBanner from '../shared/ScopeBanner';
import { LoadingSkeleton, EmptyState, ErrorState } from '../shared/EmptyState';
import { fmtSaDk, fmtSaDkSec } from '../../../../utils/dateUtils';
import {
    SOURCE_KEYS, SOURCE_META, weekLabel, toWeeklyChartRows, filterEmployees, sourceTotalsForPie, signedSummary,
    approvalStageTag, approverLines,
} from './overtimeSourcesUtils';

const STATUS_TAG = {
    APPROVED: { color: 'green', text: 'Onaylı' },
    PENDING: { color: 'gold', text: 'Bekliyor' },
};

const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '-');
const fmtDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function WeeklyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    return (
        <div className="rounded-lg border border-white/20 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-xl" role="tooltip">
            <div className="mb-2 border-b border-white/10 pb-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                {label}{row.partial ? ' (dönem dışı günler dahil)' : ''}
            </div>
            {payload.filter(p => p.value > 0).map(p => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                    <span className="text-white/80">{SOURCE_META[p.dataKey]?.label}</span>
                    <span className="ml-auto pl-4 font-semibold tabular-nums">{fmtSaDk(p.value)}</span>
                </div>
            ))}
            <div className="mt-1.5 flex border-t border-white/10 pt-1.5">
                <span className="text-white/70">Toplam</span>
                <span className="ml-auto font-semibold tabular-nums">{fmtSaDk(row.total)}</span>
            </div>
        </div>
    );
}

function SourceBar({ bySource, total }) {
    if (!total) return <span className="text-slate-300">-</span>;
    return (
        <div className="flex h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-100">
            {SOURCE_KEYS.map(key => {
                const s = bySource?.[key];
                const secs = (s?.approved_seconds || 0) + (s?.pending_seconds || 0);
                if (!secs) return null;
                return (
                    <AntTooltip key={key} title={`${SOURCE_META[key].label}: ${fmtSaDkSec(secs)}`}>
                        <div style={{ width: `${(secs / total) * 100}%`, background: SOURCE_META[key].color }} />
                    </AntTooltip>
                );
            })}
        </div>
    );
}

function WeekStrip({ weeks }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {weeks.map(w => {
                const over = w.over_limit;
                const pct = w.usage_pct;
                return (
                    <div key={w.week_start}
                        className={`rounded-lg border px-3 py-2 text-xs ${over ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                        <div className="font-semibold text-slate-600">{weekLabel(w.week_start, w.week_end)}</div>
                        <div className={`mt-0.5 font-bold tabular-nums ${over ? 'text-red-600' : 'text-slate-800'}`}>
                            {fmtSaDkSec(w.counted_seconds)}
                            <span className="font-normal text-slate-400"> / {w.limit_seconds ? fmtSaDkSec(w.limit_seconds) : 'sınırsız'}</span>
                        </div>
                        {pct != null && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                        )}
                        {w.exempt_seconds > 0 && (
                            <div className="mt-1 text-[10px] text-slate-500">+{fmtSaDkSec(w.exempt_seconds)} dış görev</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function RequestRows({ rows }) {
    if (!rows.length) return <p className="py-3 text-sm text-slate-400">Bu dönemde fazla mesai yok.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">Tarih</th>
                        <th className="py-2 pr-3">Saat</th>
                        <th className="py-2 pr-3 text-right">Süre</th>
                        <th className="py-2 pr-3">Kaynak</th>
                        <th className="py-2 pr-3">Belge</th>
                        <th className="py-2 pr-3">Talep eden</th>
                        <th className="py-2 pr-3">Onaylayan</th>
                        <th className="py-2">Sınır</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const st = approvalStageTag(r) || STATUS_TAG[r.status] || { color: 'default', text: r.status };
                        const twoStage = approverLines(r);
                        return (
                            <tr key={r.id ?? `att-${r.date}-${i}`} className="border-b border-slate-100 align-top">
                                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{fmtDate(r.date)}</td>
                                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{r.start_time ? `${r.start_time}-${r.end_time}` : '-'}</td>
                                <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmtSaDkSec(r.duration_seconds)}</td>
                                <td className="py-2 pr-3 whitespace-nowrap">
                                    <Tag color={SOURCE_META[r.source]?.color} className="!mr-1 !text-[10px]">{SOURCE_META[r.source]?.short}</Tag>
                                    <Tag color={st.color} className="!text-[10px]">{st.text}</Tag>
                                </td>
                                <td className="py-2 pr-3 min-w-[220px]">
                                    <div className="font-medium text-slate-700">{signedSummary(r)}</div>
                                    {r.signed?.description && <div className="text-slate-400">{r.signed.description}</div>}
                                </td>
                                <td className="py-2 pr-3 whitespace-nowrap">{r.requested_by || '-'}</td>
                                <td className="py-2 pr-3 whitespace-nowrap">
                                    {twoStage ? (
                                        <>
                                            {twoStage.map(line => (
                                                <div key={line.label}>
                                                    <span className="text-slate-400">{line.label}: </span>{line.value}
                                                    {line.at && <span className="text-slate-400">, {fmtDateTime(line.at)}</span>}
                                                </div>
                                            ))}
                                        </>
                                    ) : r.status === 'APPROVED' ? (
                                        <>
                                            <div>{r.approved_by || (r.source === 'DUTY' ? 'Görev onayıyla' : r.source === 'ATTENDANCE_ONLY' ? '-' : 'Otomatik')}</div>
                                            {r.approved_at && <div className="text-slate-400">{fmtDateTime(r.approved_at)}</div>}
                                            {r.overridden_by && <div className="text-amber-600">Karar değiştiren: {r.overridden_by}</div>}
                                        </>
                                    ) : (
                                        <span className="text-amber-600">Bekliyor{r.target_approver ? ` (${r.target_approver})` : ''}</span>
                                    )}
                                </td>
                                <td className="py-2 whitespace-nowrap">
                                    <span className="text-slate-500">{r.limit_exempt ? 'Muaf' : 'Sayılır'}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function OvertimeSourcesTab() {
    const { queryParams, startDate, endDate } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(() => new Set());
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('ALL');
    const [onlyWithOt, setOnlyWithOt] = useState(true);
    const [overLimitOnly, setOverLimitOnly] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);
    const retry = useCallback(() => setReloadKey(k => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        // react-hooks/set-state-in-effect: setState microtask'ta
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get('/attendance-analytics/overtime-sources/', { params: queryParams, timeout: 60000 })
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch((err) => {
                if (!cancelled) setError(err?.response?.data?.error || 'Ek mesai analizi yüklenemedi.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [queryParams, reloadKey]);

    const weeklyRows = useMemo(() => toWeeklyChartRows(data?.summary?.weekly), [data]);
    const pie = useMemo(() => sourceTotalsForPie(data?.summary?.by_source), [data]);
    const employees = useMemo(() => filterEmployees(data?.employees, {
        onlyWithOt, overLimitOnly, search, source: source === 'ALL' ? null : source,
    }), [data, onlyWithOt, overLimitOnly, search, source]);

    const toggle = (id) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    if (loading && !data) return <LoadingSkeleton rows={4} />;
    if (error && !data) return <ErrorState message={error} onRetry={retry} />;
    if (!data) return <EmptyState message="Veri bulunamadı" />;

    const s = data.summary || {};
    const pieTotal = pie.reduce((a, d) => a + d.seconds, 0);

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <ScopeBanner startDate={startDate} endDate={endDate} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <KPICard title="Onaylı Fazla Mesai" value={fmtSaDkSec(s.approved_seconds)} icon={CheckCircle2} gradient="emerald"
                    subtitle={`${s.employees_with_ot || 0} kişi`} />
                <KPICard title="Onay Bekleyen" value={fmtSaDkSec(s.pending_seconds)} icon={Hourglass} gradient="amber" />
                <KPICard title="Talep Edilmemiş" value={fmtSaDkSec(s.potential_seconds)} icon={Clock} gradient="slate" />
                <KPICard title="Sınırı Dolan Hafta" value={s.over_limit_employee_weeks || 0} suffix="hafta" icon={AlertTriangle}
                    gradient={s.over_limit_employee_weeks ? 'red' : 'indigo'} />
                <KPICard title="Sistem Yöneticisinde" value={fmtSaDkSec(s.admin_pending_seconds)} icon={ShieldCheck}
                    gradient={s.admin_pending_seconds ? 'violet' : 'slate'} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <SectionCard title="Kaynak Dağılımı" icon={PieIcon}
                    iconGradient="from-amber-500 to-orange-600">
                    {pie.length === 0 ? <EmptyState icon={PieIcon} message="Bu dönemde fazla mesai yok" /> : (
                        <>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pie} dataKey="hours" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                                            {pie.map(d => (
                                                <Cell key={d.key} fill={d.color} className="cursor-pointer" onClick={() => setSource(source === d.key ? 'ALL' : d.key)} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [fmtSaDk(v), n]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <ul className="mt-2 space-y-1.5 text-xs">
                                {pie.map(d => {
                                    const b = s.by_source?.[d.key] || {};
                                    return (
                                        <li key={d.key} className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                                            <span className="text-slate-600">{d.name}</span>
                                            <span className="ml-auto font-semibold tabular-nums text-slate-800">{fmtSaDkSec(d.seconds)}</span>
                                            <span className="w-10 text-right tabular-nums text-slate-400">%{pieTotal ? Math.round(d.seconds * 100 / pieTotal) : 0}</span>
                                            <span className="w-14 text-right text-slate-400">{b.count || 0} kayıt</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </SectionCard>

                <div className="lg:col-span-2">
                    <SectionCard title="Haftalık Fazla Mesai" icon={BarChart3}>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyRows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="sa" />
                                    <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                                    <Legend formatter={(key) => SOURCE_META[key]?.label || key} wrapperStyle={{ fontSize: 11 }} />
                                    {SOURCE_KEYS.map(key => (
                                        <Bar key={key} dataKey={key} stackId="ot" fill={SOURCE_META[key].color} maxBarSize={48} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </SectionCard>
                </div>
            </div>

            <SectionCard title="Kişi Bazlı Ek Mesai" icon={Users}
                iconGradient="from-indigo-500 to-violet-600" collapsible={false}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Input.Search allowClear placeholder="Çalışan / departman ara" value={search}
                        onChange={e => setSearch(e.target.value)} className="!w-60" size="small" />
                    <Segmented size="small" value={source} onChange={setSource}
                        options={[{ label: 'Tümü', value: 'ALL' }, ...SOURCE_KEYS.map(k => ({ label: SOURCE_META[k].short, value: k }))]} />
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Switch size="small" checked={onlyWithOt} onChange={setOnlyWithOt} /> Fazla mesaisi olanlar
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Switch size="small" checked={overLimitOnly} onChange={setOverLimitOnly} /> Sınırı dolanlar
                    </label>
                    <span className="ml-auto text-xs text-slate-400">{employees.length} çalışan</span>
                </div>

                {employees.length === 0 ? <EmptyState icon={FileSignature} message="Filtreye uyan çalışan yok" /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                                    <th className="w-6 py-2" />
                                    <th className="py-2 pr-3">Çalışan</th>
                                    <th className="py-2 pr-3 text-right">Onaylı</th>
                                    <th className="py-2 pr-3 text-right">Bekleyen</th>
                                    <th className="py-2 pr-3 min-w-[120px]">Kaynak dağılımı</th>
                                    <th className="py-2 pr-3 text-right">En yoğun hafta</th>
                                    <th className="py-2 text-right">Sınırı dolan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(e => {
                                    const open = expanded.has(e.employee_id);
                                    const limit = e.limit_hours ? e.limit_hours * 3600 : null;
                                    return (
                                        <React.Fragment key={e.employee_id}>
                                            <tr className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => toggle(e.employee_id)}>
                                                <td className="py-2"><ChevronRight size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} /></td>
                                                <td className="py-2 pr-3">
                                                    <div className="font-semibold text-slate-800">{e.name}</div>
                                                    <div className="text-[11px] text-slate-400">{e.department || '-'}</div>
                                                </td>
                                                <td className="py-2 pr-3 text-right font-semibold tabular-nums text-emerald-700">{fmtSaDkSec(e.approved_seconds)}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums text-amber-600">{e.pending_seconds ? fmtSaDkSec(e.pending_seconds) : '-'}</td>
                                                <td className="py-2 pr-3"><SourceBar bySource={e.by_source} total={e.total_seconds} /></td>
                                                <td className="py-2 pr-3 text-right tabular-nums">
                                                    {fmtSaDkSec(e.max_week_counted_seconds)}
                                                    <span className="text-slate-400"> / {limit ? fmtSaDkSec(limit) : 'sınırsız'}</span>
                                                </td>
                                                <td className="py-2 text-right">
                                                    {e.over_limit_weeks ? <Tag color="red">{e.over_limit_weeks} hafta</Tag> : <span className="text-slate-300">-</span>}
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr className="bg-slate-50/60">
                                                    <td />
                                                    <td colSpan={6} className="space-y-3 py-3 pr-3">
                                                        <WeekStrip weeks={e.weeks} />
                                                        <RequestRows rows={e.requests} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
