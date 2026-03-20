import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ReferenceLine
} from 'recharts';
import api from '../../services/api';
import { getIstanbulDay } from '../../utils/dateUtils';
import {
    TrendingUp, TrendingDown, Award, Clock, AlertTriangle, Users,
    Target, Zap, Minus, ChevronDown, ChevronUp, Shield,
    Palmtree, BarChart3, Activity, Calendar, CheckCircle, Star,
    UserCheck, ArrowRight, Flame, AlertCircle, Info, X, Briefcase, UtensilsCrossed,
    Eye, EyeOff, GitCompare
} from 'lucide-react';
import { formatMinutes } from './AttendanceComponents';
import ModalOverlay from '../../components/ui/ModalOverlay';

const DEPT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {formatter ? formatter(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   SECTION WRAPPER
   ═══════════════════════════════════════════════════ */
const AnalyticsCard = ({ title, subtitle, icon: Icon, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden ${className}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            {Icon && (
                <div className="p-2 bg-slate-50 rounded-xl">
                    <Icon size={16} className="text-slate-500" />
                </div>
            )}
            <div>
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* ═══════════════════════════════════════════════════
   PERSON DETAIL DRAWER
   ═══════════════════════════════════════════════════ */
const PersonDetailDrawer = ({ person, onClose, elapsedWorkDays, deptAvg, hierarchyData = [] }) => {
    const [otDetail, setOtDetail] = useState(null);
    const [dailyTrend, setDailyTrend] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [decisionData, setDecisionData] = useState(null);
    const [decisionLoading, setDecisionLoading] = useState(false);

    const isSecondary = person?.relationship_type === 'SECONDARY';

    useEffect(() => {
        if (!person?.employee_id) return;
        let cancelled = false;
        const fetchDetail = async () => {
            setDetailLoading(true);
            setOtDetail(null);
            setDailyTrend(null);
            try {
                const promises = [
                    api.get(`/overtime-assignments/employee-ot-detail/?employee_id=${person.employee_id}`),
                ];
                if (!isSecondary) {
                    promises.push(api.get(`/dashboard/employee-daily-trend/?employee_id=${person.employee_id}`));
                }
                const results = await Promise.allSettled(promises);
                if (cancelled) return;
                if (results[0].status === 'fulfilled') setOtDetail(results[0].value.data);
                if (!isSecondary && results[1]?.status === 'fulfilled') setDailyTrend(results[1].value.data);
            } catch (err) {
                console.error('PersonDetailDrawer fetch error:', err);
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        };
        fetchDetail();
        return () => { cancelled = true; };
    }, [person?.employee_id, isSecondary]);

    // Fetch manager decisions if person is a sub-manager (has children in hierarchy)
    useEffect(() => {
        if (!person?.employee_id || !hierarchyData || hierarchyData.length === 0) {
            setDecisionData(null);
            return;
        }
        const checkSubManager = (nodes) => {
            for (const n of nodes) {
                if (n.id === person.employee_id && n.children && n.children.length > 0) return true;
                if (n.children && checkSubManager(n.children)) return true;
            }
            return false;
        };
        if (!checkSubManager(hierarchyData)) { setDecisionData(null); return; }

        let cancelled = false;
        setDecisionLoading(true);
        api.get('/request-analytics/manager-decisions/', { params: { manager_id: person.employee_id } })
            .then(res => { if (!cancelled) setDecisionData(res.data); })
            .catch(() => { if (!cancelled) setDecisionData(null); })
            .finally(() => { if (!cancelled) setDecisionLoading(false); });
        return () => { cancelled = true; };
    }, [person?.employee_id, hierarchyData]);

    if (!person) return null;

    const completed = person.completed_minutes || person.total_worked || 0;
    const pastTarget = person.past_target_minutes || person.monthly_required || 0;
    const efficiency = person.efficiency || (pastTarget > 0 ? Math.round((completed / pastTarget) * 100) : 0);
    const totalWorked = person.total_worked || 0;
    const target = person.monthly_required || 0;
    const missing = person.total_missing || 0;
    const deviation = person.monthly_deviation || 0;
    const otTotal = person.total_overtime || 0;
    const dailyAvgNormal = elapsedWorkDays > 0 ? Math.round(completed / elapsedWorkDays) : 0;
    const dailyAvgTotal = elapsedWorkDays > 0 ? Math.round(totalWorked / elapsedWorkDays) : 0;

    // OT source
    const otIntended = person.ot_intended_minutes || 0;
    const otPotential = person.ot_potential_minutes || 0;
    const otManual = person.ot_manual_minutes || 0;
    const otSourceTotal = otIntended + otPotential + otManual;
    const otSources = [
        { name: 'Planlı', value: otIntended, count: person.ot_intended_count || 0, color: '#6366f1' },
        { name: 'Algılanan', value: otPotential, count: person.ot_potential_count || 0, color: '#f59e0b' },
        { name: 'Manuel', value: otManual, count: person.ot_manual_count || 0, color: '#8b5cf6' },
    ].filter(d => d.value > 0);

    // OT frequency
    const otDays = person.ot_total_count || 0;
    const otFreqPct = elapsedWorkDays > 0 ? Math.round((otDays / elapsedWorkDays) * 100) : 0;
    const otPerDay = otDays > 0 ? Math.round(otTotal / otDays) : 0;
    const otNormalRatio = totalWorked > 0 ? Math.round((otTotal / totalWorked) * 100) : 0;

    // Projected
    const remainingWorkDays = Math.max(0, 22 - elapsedWorkDays);
    const projected = elapsedWorkDays > 0 ? Math.round(deviation + (deviation / elapsedWorkDays) * remainingWorkDays) : 0;

    return (
        <ModalOverlay open onClose={onClose} className="!justify-end">
            <div
                className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right h-full"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                            {(person.employee_name || '').charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800">{person.employee_name}</h3>
                                {isSecondary && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600">
                                        İkincil
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">{person.department || '-'} · {person.job_title || '-'}</p>
                        </div>
                        {!isSecondary && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (person.attendance_rate || 100) >= 95 ? 'bg-emerald-100 text-emerald-700' :
                                (person.attendance_rate || 100) >= 85 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                Katılım %{Math.round(person.attendance_rate || 100)}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {detailLoading && (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                            <span className="ml-2 text-xs text-slate-400">Detaylı analiz yükleniyor...</span>
                        </div>
                    )}

                    {/* Çalışma Özeti — HIDE for SECONDARY */}
                    {!isSecondary && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Çalışma Özeti</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-indigo-50 rounded-xl p-3">
                                <p className="text-[10px] text-indigo-400 font-semibold">Normal Çalışma</p>
                                <p className="text-lg font-bold text-indigo-600">{formatMinutes(completed)}</p>
                                {otTotal > 0 && <p className="text-[10px] text-indigo-300">+{formatMinutes(otTotal)} Fazla Mesai</p>}
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-400 font-semibold">Hedef (bugünedek)</p>
                                <p className="text-lg font-bold text-slate-600">{formatMinutes(pastTarget)}</p>
                                <p className="text-[10px] text-slate-300">Ay: {formatMinutes(target)}</p>
                            </div>
                            <div className={`${efficiency >= 95 ? 'bg-emerald-50' : efficiency >= 80 ? 'bg-amber-50' : 'bg-red-50'} rounded-xl p-3`}>
                                <p className="text-[10px] text-slate-400 font-semibold">Verimlilik</p>
                                <p className={`text-lg font-bold ${efficiency >= 95 ? 'text-emerald-600' : efficiency >= 80 ? 'text-amber-600' : 'text-red-600'}`}>%{efficiency}</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3">
                                <p className="text-[10px] text-red-400 font-semibold">Kayıp</p>
                                <p className="text-lg font-bold text-red-600">{formatMinutes(missing)}</p>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Katılım Durumu — HIDE for SECONDARY */}
                    {!isSecondary && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Katılım Durumu</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className={`text-center p-3 rounded-xl ${(person.attendance_rate || 100) >= 95 ? 'bg-emerald-50' : (person.attendance_rate || 100) >= 85 ? 'bg-amber-50' : 'bg-red-50'}`}>
                                <p className="text-[10px] text-slate-400 font-semibold">Katılım Oranı</p>
                                <p className={`text-lg font-bold ${(person.attendance_rate || 100) >= 95 ? 'text-emerald-600' : (person.attendance_rate || 100) >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                                    %{Math.round(person.attendance_rate || 100)}
                                </p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 font-semibold">Devam Günleri</p>
                                <p className="text-lg font-bold text-slate-700">{person.attendance_days || 0}</p>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-xl">
                                <p className="text-[10px] text-red-400 font-semibold">Devamsız Günler</p>
                                <p className="text-lg font-bold text-red-600">{person.absent_days || 0}</p>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Günlük Ortalamalar — HIDE for SECONDARY */}
                    {!isSecondary && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Günlük Ortalamalar</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 font-semibold">Gnl. Normal</p>
                                <p className="text-sm font-bold text-indigo-600">{formatMinutes(dailyAvgNormal)}</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 font-semibold">Gnl. Toplam</p>
                                <p className="text-sm font-bold text-slate-700">{formatMinutes(dailyAvgTotal)}</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 font-semibold">İş Günü</p>
                                <p className="text-sm font-bold text-slate-700">{elapsedWorkDays}</p>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Ek Mesai Analizi */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ek Mesai Analizi</h4>
                        {otSources.length > 0 ? (
                            <>
                                {/* Mini pie as stacked bar */}
                                <div className="h-3 rounded-full overflow-hidden flex mb-3">
                                    {otSources.map((s, i) => (
                                        <div
                                            key={i}
                                            className="h-full transition-all duration-500"
                                            style={{
                                                width: `${otSourceTotal > 0 ? (s.value / otSourceTotal) * 100 : 0}%`,
                                                backgroundColor: s.color,
                                            }}
                                            title={`${s.name}: ${formatMinutes(s.value)}`}
                                        />
                                    ))}
                                </div>

                                {/* 3 stat cards */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {otSources.map((s, i) => (
                                        <div key={i} className="bg-slate-50 rounded-lg p-2 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                <span className="text-[10px] font-bold text-slate-500">{s.name}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700">{formatMinutes(s.value)}</p>
                                            <p className="text-[10px] text-slate-400">{s.count} adet · %{otSourceTotal > 0 ? Math.round((s.value / otSourceTotal) * 100) : 0}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* OT/Normal ratio */}
                                <div className="flex items-center justify-between text-[11px] mb-2">
                                    <span className="text-slate-400 font-semibold">Fazla Mesai / Normal Oranı</span>
                                    <span className="font-bold text-amber-600">%{otNormalRatio}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                                    <div
                                        className="h-full rounded-full bg-amber-500 transition-all"
                                        style={{ width: `${Math.min(100, otNormalRatio)}%` }}
                                    />
                                </div>

                                {/* OT frequency */}
                                <div className="bg-amber-50 rounded-xl p-3 text-xs">
                                    <span className="text-amber-700 font-semibold">
                                        Fazla Mesai Sıklığı: {elapsedWorkDays} iş gününün {otDays} günü FM (%{otFreqPct})
                                    </span>
                                    {otPerDay > 0 && (
                                        <span className="text-amber-500 ml-2">· Gün başı ort. {formatMinutes(otPerDay)}</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-[11px] text-slate-400 italic">Bu dönem onaylanmış ek mesai yok</p>
                        )}
                    </div>

                    {/* Hafta Sonu OT Analizi */}
                    {((person.ot_weekend_minutes || 0) > 0 || (person.ot_weekday_minutes || 0) > 0) && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hafta Sonu Fazla Mesai Analizi</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-amber-50 rounded-xl">
                                    <p className="text-[10px] text-amber-400 font-semibold">H.Sonu FM</p>
                                    <p className="text-sm font-bold text-amber-600">{formatMinutes(person.ot_weekend_minutes || 0)}</p>
                                    <p className="text-[10px] text-amber-300">{person.ot_weekend_count || 0} gün</p>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-xl">
                                    <p className="text-[10px] text-blue-400 font-semibold">H.İçi FM</p>
                                    <p className="text-sm font-bold text-blue-600">{formatMinutes(person.ot_weekday_minutes || 0)}</p>
                                    <p className="text-[10px] text-blue-300">{person.ot_weekday_count || 0} gün</p>
                                </div>
                                <div className="text-center p-3 bg-violet-50 rounded-xl">
                                    <p className="text-[10px] text-violet-400 font-semibold">H.Sonu Oranı</p>
                                    <p className="text-sm font-bold text-violet-600">
                                        %{((person.ot_weekend_minutes || 0) + (person.ot_weekday_minutes || 0)) > 0
                                            ? Math.round((person.ot_weekend_minutes || 0) / ((person.ot_weekend_minutes || 0) + (person.ot_weekday_minutes || 0)) * 100)
                                            : 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ SECONDARY-SPECIFIC: Aylık OT Trendi ═══ */}
                    {isSecondary && otDetail?.monthly_trend && otDetail.monthly_trend.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylık OT Trendi</h4>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={otDetail.monthly_trend}>
                                        <defs>
                                            <linearGradient id="amberGradDrawer" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v ? v.substring(0, 3) : ''} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatMinutes(v)} />
                                        <Tooltip content={<CustomTooltip formatter={v => formatMinutes(v)} />} />
                                        <Area type="monotone" dataKey="total_minutes" stroke="#f59e0b" fill="url(#amberGradDrawer)" name="Toplam OT" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            {otDetail.monthly_trend.length >= 2 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {otDetail.monthly_trend.slice(-3).map((m, i) => (
                                        <div key={i} className="text-center p-2 bg-slate-50 rounded-lg">
                                            <p className="text-[10px] text-slate-400 font-semibold">{m.month ? m.month.substring(0, 3) : '-'}</p>
                                            <p className="text-xs font-bold text-amber-600">{formatMinutes(m.total_minutes || 0)}</p>
                                            <p className="text-[10px] text-slate-300">
                                                <span className="text-emerald-500">{m.approved_count || 0} onay</span>
                                                {' / '}
                                                <span className="text-red-400">{m.rejected_count || 0} red</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ SECONDARY-SPECIFIC: Haftalık OT Dağılımı ═══ */}
                    {isSecondary && otDetail?.weekly_distribution && otDetail.weekly_distribution.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Haftalık OT Dağılımı</h4>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={otDetail.weekly_distribution}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="week_start" tick={{ fontSize: 9 }} tickFormatter={v => v ? v.substring(5) : ''} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatMinutes(v)} />
                                        <Tooltip content={<CustomTooltip formatter={v => formatMinutes(v)} />} />
                                        <Bar dataKey="weekday_minutes" stackId="a" fill="#6366f1" name="H.İçi" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="weekend_minutes" stackId="a" fill="#f59e0b" name="H.Sonu" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ═══ SECONDARY-SPECIFIC: Gün Bazlı OT Paterni ═══ */}
                    {isSecondary && otDetail?.day_of_week_pattern && otDetail.day_of_week_pattern.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gün Bazlı OT Paterni</h4>
                            {(() => {
                                const dayLabels = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
                                const maxMinutes = Math.max(...otDetail.day_of_week_pattern.map(d => d.total_minutes || 0), 1);
                                return (
                                    <div className="space-y-2">
                                        {otDetail.day_of_week_pattern.map((d, i) => {
                                            const pct = maxMinutes > 0 ? Math.round((d.total_minutes || 0) / maxMinutes * 100) : 0;
                                            const isWeekend = i >= 5;
                                            const isMax = (d.total_minutes || 0) === maxMinutes && maxMinutes > 0;
                                            return (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold w-8 ${isMax ? 'text-amber-600' : 'text-slate-500'}`}>
                                                        {dayLabels[i] || '-'}
                                                    </span>
                                                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${isWeekend ? 'bg-amber-400' : 'bg-indigo-400'} ${isMax ? 'ring-2 ring-amber-300' : ''}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 w-12 text-right">
                                                        {formatMinutes(d.total_minutes || 0)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ═══ SECONDARY-SPECIFIC: OT Talep İstatistikleri ═══ */}
                    {isSecondary && otDetail?.approval_stats && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">OT Talep İstatistikleri</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold">Toplam Talep</p>
                                    <p className="text-lg font-bold text-slate-700">{otDetail.approval_stats.total_requests || 0}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-emerald-400 font-semibold">Onay Oranı</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        %{otDetail.approval_stats.total_requests > 0
                                            ? Math.round((otDetail.approval_stats.approved_count || 0) / otDetail.approval_stats.total_requests * 100)
                                            : 0}
                                    </p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-amber-400 font-semibold">Ort. FM Süresi</p>
                                    <p className="text-lg font-bold text-amber-600">
                                        {formatMinutes(otDetail.approval_stats.avg_duration_minutes || 0)}
                                    </p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-blue-400 font-semibold">Ort. Onay Süresi</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        {otDetail.approval_stats.avg_approval_hours != null
                                            ? `${Math.round(otDetail.approval_stats.avg_approval_hours)} saat`
                                            : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ SECONDARY-SPECIFIC: Haftalık Limit Durumu ═══ */}
                    {isSecondary && otDetail?.current_week_status && (otDetail.current_week_status.limit_minutes || 0) > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Haftalık Limit Durumu</h4>
                            {(() => {
                                const used = otDetail.current_week_status.used_minutes || 0;
                                const limit = otDetail.current_week_status.limit_minutes || 1;
                                const pct = Math.min(100, Math.round((used / limit) * 100));
                                return (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-slate-500 font-semibold">
                                                {formatMinutes(used)} / {formatMinutes(limit)}
                                            </span>
                                            <span className={`text-xs font-bold ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                %{pct}
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Yemek Korelasyonu — HIDE for SECONDARY */}
                    {!isSecondary && (person.meal_ordered || 0) > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yemek Korelasyonu</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-cyan-50 rounded-xl">
                                    <p className="text-[10px] text-cyan-400 font-semibold">Toplam Yemek</p>
                                    <p className="text-sm font-bold text-cyan-600">{person.meal_ordered || 0} sipariş</p>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] text-slate-400 font-semibold">FM'de Yemek</p>
                                    <p className="text-sm font-bold text-slate-700">{person.ot_meal_overlap || 0}/{person.ot_days_total || 0} gün</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                    <p className="text-[10px] text-emerald-400 font-semibold">FM Yemek Oranı</p>
                                    <p className="text-sm font-bold text-emerald-600">
                                        %{(person.ot_days_total || 0) > 0 ? Math.round((person.ot_meal_overlap || 0) / person.ot_days_total * 100) : 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* İzin Durumu — HIDE for SECONDARY */}
                    {!isSecondary && (person.annual_leave_entitlement > 0 || person.annual_leave_used > 0) && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">İzin Durumu</h4>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="text-center p-2 bg-violet-50 rounded-lg">
                                    <p className="text-[10px] text-violet-400 font-semibold">Hak</p>
                                    <p className="text-sm font-bold text-violet-600">{person.annual_leave_entitlement ?? 0}</p>
                                </div>
                                <div className="text-center p-2 bg-slate-50 rounded-lg">
                                    <p className="text-[10px] text-slate-400 font-semibold">Kullanılan</p>
                                    <p className="text-sm font-bold text-slate-600">{person.annual_leave_used ?? 0}</p>
                                </div>
                                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                                    <p className="text-[10px] text-emerald-400 font-semibold">Kalan</p>
                                    <p className="text-sm font-bold text-emerald-600">{person.annual_leave_balance ?? 0}</p>
                                </div>
                                <div className="text-center p-2 bg-amber-50 rounded-lg">
                                    <p className="text-[10px] text-amber-400 font-semibold">Rezerv</p>
                                    <p className="text-sm font-bold text-amber-600">{person.annual_leave_reserved ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Net Bakiye — HIDE for SECONDARY */}
                    {!isSecondary && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Net Bakiye</h4>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-lg font-bold ${deviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {deviation >= 0 ? '+' : ''}{formatMinutes(Math.abs(deviation))}
                            </span>
                            <span className={`text-xs font-semibold ${projected >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                Tahmini: {projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(projected))}
                            </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${deviation >= 0 ? 'bg-emerald-500 ml-[50%]' : 'bg-red-500'}`}
                                style={{
                                    width: `${Math.min(50, Math.abs(deviation) / (target || 1) * 50)}%`,
                                    ...(deviation < 0 ? { marginLeft: `${50 - Math.min(50, Math.abs(deviation) / (target || 1) * 50)}%` } : {}),
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>-{formatMinutes(target)}</span>
                            <span>0</span>
                            <span>+{formatMinutes(target)}</span>
                        </div>
                    </div>
                    )}

                    {/* ═══ PRIMARY-SPECIFIC: Günlük Çalışma Trendi ═══ */}
                    {!isSecondary && dailyTrend && dailyTrend.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Günlük Çalışma Trendi</h4>
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend}>
                                        <defs>
                                            <linearGradient id="indigoGradDrawer" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="amberGradDrawer2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatMinutes(v)} />
                                        <Tooltip content={<CustomTooltip formatter={v => formatMinutes(v)} />} />
                                        <ReferenceLine y={480} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Hedef', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                                        <Area type="monotone" dataKey="worked_minutes" stroke="#6366f1" fill="url(#indigoGradDrawer)" name="Çalışma" />
                                        <Area type="monotone" dataKey="overtime_minutes" stroke="#f59e0b" fill="url(#amberGradDrawer2)" name="Fazla Mesai" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ═══ PRIMARY-SPECIFIC: Aylık OT Performans Trendi ═══ */}
                    {!isSecondary && otDetail?.monthly_trend && otDetail.monthly_trend.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylık OT Performans Trendi</h4>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={otDetail.monthly_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={v => v ? v.substring(0, 3) : ''} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatMinutes(v)} />
                                        <Tooltip content={<CustomTooltip formatter={v => formatMinutes(v)} />} />
                                        <Bar dataKey="intended_minutes" stackId="a" fill="#6366f1" name="Planlı" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="potential_minutes" stackId="a" fill="#f59e0b" name="Algılanan" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="manual_minutes" stackId="a" fill="#8b5cf6" name="Manuel" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] text-slate-500">Planlı</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-[10px] text-slate-500">Algılanan</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                    <span className="text-[10px] text-slate-500">Manuel</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ PRIMARY-SPECIFIC: Departman Karşılaştırması ═══ */}
                    {!isSecondary && deptAvg && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Departman Karşılaştırması</h4>
                            {(() => {
                                const personEfficiency = efficiency;
                                const personOTNormalPct = otNormalRatio;
                                const personAttendance = Math.round(person.attendance_rate || 100);
                                const personDailyNormal = dailyAvgNormal;
                                const metrics = [
                                    { label: 'Verimlilik', personVal: personEfficiency, deptVal: deptAvg.efficiency, unit: '%' },
                                    { label: 'FM Yoğunluğu', personVal: personOTNormalPct, deptVal: deptAvg.otNormalPct, unit: '%' },
                                    { label: 'Katılım', personVal: personAttendance, deptVal: deptAvg.attendanceRateAvg, unit: '%' },
                                    { label: 'Gnl. Normal', personVal: personDailyNormal, deptVal: deptAvg.dailyNormal, unit: 'dk' },
                                ];
                                return (
                                    <div className="space-y-3">
                                        {metrics.map((m, i) => {
                                            const diff = m.personVal - m.deptVal;
                                            const maxVal = Math.max(m.personVal, m.deptVal, 1);
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-slate-500">{m.label}</span>
                                                        <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {diff >= 0 ? '+' : ''}{diff}{m.unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-indigo-500 font-semibold w-10 text-right">{m.personVal}</span>
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                                            <div
                                                                className="absolute top-0 bottom-0 bg-indigo-400 rounded-full"
                                                                style={{ width: `${Math.round((m.personVal / maxVal) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-slate-400 font-semibold w-10 text-right">{m.deptVal}</span>
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                                            <div
                                                                className="absolute top-0 bottom-0 bg-slate-300 rounded-full"
                                                                style={{ width: `${Math.round((m.deptVal / maxVal) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                                <span className="text-[9px] text-slate-400">Kisi</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                <span className="text-[9px] text-slate-400">Dept. Ort.</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ═══ PRIMARY-SPECIFIC: Risk Değerlendirmesi ═══ */}
                    {!isSecondary && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Risk Değerlendirmesi</h4>
                            {(() => {
                                const missingRisk = Math.min(33, Math.round((missing / Math.max(pastTarget, 1)) * 100));
                                const attendanceRisk = Math.min(33, Math.round((100 - (person.attendance_rate || 100)) * 3.3));
                                const otRisk = Math.min(33, Math.round(otNormalRatio * 0.33));
                                const totalRisk = missingRisk + attendanceRisk + otRisk;

                                const riskFactors = [
                                    { label: 'Kayıp Zamanı', score: missingRisk, max: 33 },
                                    { label: 'Devamsızlık', score: attendanceRisk, max: 33 },
                                    { label: 'FM Yoğunluğu', score: otRisk, max: 33 },
                                ];

                                return (
                                    <div className={`p-3 rounded-xl ${totalRisk >= 61 ? 'bg-red-50' : totalRisk >= 31 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={16} className={totalRisk >= 61 ? 'text-red-500' : totalRisk >= 31 ? 'text-amber-500' : 'text-emerald-500'} />
                                                <span className={`text-sm font-bold ${totalRisk >= 61 ? 'text-red-700' : totalRisk >= 31 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                    Risk Skoru: {totalRisk}/100
                                                </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                totalRisk >= 61 ? 'bg-red-100 text-red-700' : totalRisk >= 31 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {totalRisk >= 61 ? 'Yüksek' : totalRisk >= 31 ? 'Orta' : 'Düşük'}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {riskFactors.map((f, i) => (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[10px] text-slate-500 font-semibold">{f.label}</span>
                                                        <span className="text-[10px] font-bold text-slate-600">{f.score}/{f.max}</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                f.score >= 22 ? 'bg-red-400' : f.score >= 11 ? 'bg-amber-400' : 'bg-emerald-400'
                                                            }`}
                                                            style={{ width: `${Math.round((f.score / f.max) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── Yönetici Karar Analizi ── */}
                    {decisionLoading && (
                        <div className="text-center py-4 text-sm text-slate-400">Karar analizi yükleniyor...</div>
                    )}
                    {decisionData && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Shield size={14} className="text-purple-600" />
                                Karar Analizi
                            </h4>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-purple-700">{decisionData.summary?.total_decisions || 0}</div>
                                    <div className="text-xs text-purple-500">Toplam Karar</div>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-emerald-700">%{decisionData.summary?.approval_rate || 0}</div>
                                    <div className="text-xs text-emerald-500">Onay Oranı</div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-blue-700">{decisionData.summary?.avg_response_hours || 0}s</div>
                                    <div className="text-xs text-blue-500">Ort. Yanıt Süresi</div>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-amber-700">{decisionData.summary?.pending || 0}</div>
                                    <div className="text-xs text-amber-500">Bekleyen</div>
                                </div>
                            </div>

                            {/* Type Distribution Pie */}
                            <div>
                                <h5 className="text-xs font-semibold text-slate-600 mb-2">Talep Türü Dağılımı</h5>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Ek Mesai', value: decisionData.by_type?.overtime?.total || 0 },
                                                { name: 'İzin', value: decisionData.by_type?.leave?.total || 0 },
                                                { name: 'Kartsız', value: decisionData.by_type?.cardless?.total || 0 },
                                                { name: 'Rapor', value: decisionData.by_type?.health_report?.total || 0 },
                                            ].filter(d => d.value > 0)}
                                            cx="50%" cy="50%"
                                            innerRadius={40} outerRadius={70}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((c, i) => (
                                                <Cell key={i} fill={c} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Monthly Trend */}
                            {decisionData.monthly_trend && decisionData.monthly_trend.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-600 mb-2">Aylık Karar Trendi</h5>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={decisionData.monthly_trend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip />
                                            <Bar dataKey="approved" name="Onay" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                                            <Bar dataKey="rejected" name="Red" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Rejection Reasons */}
                            {decisionData.rejection_reasons && decisionData.rejection_reasons.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-600 mb-2">En Sık Red Nedenleri</h5>
                                    <div className="space-y-1.5">
                                        {decisionData.rejection_reasons.slice(0, 3).map((r, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="flex-1 bg-red-50 rounded-full h-5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-red-400 rounded-full flex items-center pl-2"
                                                        style={{ width: `${Math.max(20, r.count / (decisionData.rejection_reasons[0]?.count || 1) * 100)}%` }}
                                                    >
                                                        <span className="text-[10px] text-white font-medium truncate">{r.reason}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-red-600 w-6 text-right">{r.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Employee Breakdown */}
                            {decisionData.employees && decisionData.employees.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-600 mb-2">Çalışan Bazlı Kararlar</h5>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="px-2 py-1.5 text-left text-slate-600">Çalışan</th>
                                                <th className="px-2 py-1.5 text-center text-slate-600">Toplam</th>
                                                <th className="px-2 py-1.5 text-center text-emerald-600">Onay</th>
                                                <th className="px-2 py-1.5 text-center text-red-600">Red</th>
                                                <th className="px-2 py-1.5 text-center text-slate-600">Oran</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {decisionData.employees.slice(0, 10).map(emp => (
                                                <tr key={emp.employee_id} className="border-b border-slate-50">
                                                    <td className="px-2 py-1.5 font-medium text-slate-700">{emp.name}</td>
                                                    <td className="px-2 py-1.5 text-center">{emp.total}</td>
                                                    <td className="px-2 py-1.5 text-center text-emerald-600 font-semibold">{emp.approved}</td>
                                                    <td className="px-2 py-1.5 text-center text-red-600 font-semibold">{emp.rejected}</td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${emp.approval_rate >= 80 ? 'bg-emerald-100 text-emerald-700' : emp.approval_rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                            %{emp.approval_rate}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
};

/* ═══════════════════════════════════════════════════
   COMPARISON DRAWER
   ═══════════════════════════════════════════════════ */
const ComparisonDrawer = ({ persons, onClose }) => {
    if (!persons || persons.length < 2) return null;

    const maxOT = Math.max(...persons.map(p => (p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0)), 1);
    const maxMissing = Math.max(...persons.map(p => p.total_missing || 0), 1);

    const radarData = [
        { axis: 'Verimlilik', ...Object.fromEntries(persons.map((p, i) => [`p${i}`, p.efficiency || 0])) },
        { axis: 'Katılım', ...Object.fromEntries(persons.map((p, i) => [`p${i}`, p.attendance_rate || 0])) },
        { axis: 'FM Yoğunluğu', ...Object.fromEntries(persons.map((p, i) => [`p${i}`, Math.min(100, Math.round(((p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0)) / maxOT * 100))])) },
        { axis: 'Düşük Eksik', ...Object.fromEntries(persons.map((p, i) => [`p${i}`, maxMissing > 0 ? Math.round(100 - (p.total_missing || 0) / maxMissing * 100) : 100])) },
        { axis: 'İzin Dengesi', ...Object.fromEntries(persons.map((p, i) => [`p${i}`, Math.min(100, Math.max(0, 100 - (p.annual_leave_used || 0) * 5))])) },
    ];

    const kpiMetrics = [
        { label: 'Çalışma (dk)', key: 'total_worked' },
        { label: 'Hedef (dk)', key: 'monthly_required' },
        { label: 'Verimlilik %', key: 'efficiency' },
        { label: 'Kayıp (dk)', key: 'total_missing' },
        { label: 'FM Toplam (dk)', getValue: p => (p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0) },
        { label: 'Katılım %', key: 'attendance_rate' },
    ];

    const barData = persons.map((p, i) => ({
        name: (p.employee_name || '').split(' ')[0] || `Kişi ${i+1}`,
        'Çalışma': Math.round((p.total_worked || 0) / 60),
        'Kayıp': Math.round((p.total_missing || 0) / 60),
        'FM': Math.round(((p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0)) / 60),
    }));

    return (
        <ModalOverlay open onClose={onClose} className="!justify-end">
            <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right h-full">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <GitCompare size={18} className="text-indigo-600" />
                        Kıyaslama ({persons.length} kişi)
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Bar Chart */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Metrik Karşılaştırma (saat)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Çalışma" fill="#6366f1" radius={[4,4,0,0]} />
                                <Bar dataKey="Kayıp" fill="#ef4444" radius={[4,4,0,0]} />
                                <Bar dataKey="FM" fill="#f59e0b" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar Chart */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Radar Profili</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                {persons.map((p, i) => (
                                    <Radar
                                        key={p.employee_id}
                                        name={(p.employee_name || '').split(' ')[0] || `Kişi ${i+1}`}
                                        dataKey={`p${i}`}
                                        stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fillOpacity={0.15}
                                    />
                                ))}
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* KPI Table */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">KPI Karşılaştırma</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Metrik</th>
                                        {persons.map((p, i) => (
                                            <th key={p.employee_id} className="px-3 py-2 text-center font-semibold" style={{ color: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                                                {(p.employee_name || '').split(' ')[0]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {kpiMetrics.map(metric => {
                                        const values = persons.map(p => metric.getValue ? metric.getValue(p) : (p[metric.key] || 0));
                                        const maxVal = Math.max(...values);
                                        const minVal = Math.min(...values);
                                        return (
                                            <tr key={metric.label} className="border-b border-slate-100">
                                                <td className="px-3 py-2 font-medium text-slate-700">{metric.label}</td>
                                                {values.map((val, i) => (
                                                    <td key={i} className={`px-3 py-2 text-center font-semibold ${val === maxVal && maxVal !== minVal ? 'bg-emerald-50 text-emerald-700' : val === minVal && maxVal !== minVal ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                                                        {typeof val === 'number' ? Math.round(val) : val}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};

/* ═══════════════════════════════════════════════════
   MINI KPI CARD
   ═══════════════════════════════════════════════════ */
const KpiCard = ({ label, value, subValue, icon: Icon, color, trend }) => {
    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', iconBg: 'bg-indigo-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', iconBg: 'bg-amber-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', iconBg: 'bg-red-100' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', iconBg: 'bg-violet-100' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconBg: 'bg-slate-100' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', iconBg: 'bg-cyan-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconBg: 'bg-blue-100' },
    };
    const c = colorMap[color] || colorMap.slate;

    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-4 transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 ${c.iconBg} rounded-lg`}>
                    <Icon size={14} className={c.text} />
                </div>
                {trend !== undefined && trend !== null && (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {trend > 0 ? <TrendingUp size={10} /> : trend < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                        {trend !== 0 ? `${Math.abs(trend)}%` : '—'}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold ${c.text} tabular-nums mt-0.5`}>{value}</p>
            {subValue && <p className="text-[10px] text-slate-400 mt-0.5">{subValue}</p>}
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════ */
const TeamAnalyticsDashboard = ({ stats = [], year, month, departmentId, relationshipType, hierarchyData = [] }) => {
    const isSecondaryMode = relationshipType === 'SECONDARY';
    const [dailyTrend, setDailyTrend] = useState([]);
    const [trendLoading, setTrendLoading] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [expandedRisk, setExpandedRisk] = useState(null);
    const [activeRole, setActiveRole] = useState('all');
    const [detailPerson, setDetailPerson] = useState(null);
    const [comparisonIds, setComparisonIds] = useState(new Set());
    const [showComparison, setShowComparison] = useState(false);
    const [activeSubTeam, setActiveSubTeam] = useState(null);
    const [hiddenIds, setHiddenIds] = useState(new Set());

    // ── DEPARTMENT TAB SYSTEM ──
    const deptList = useMemo(() => {
        const depts = [...new Set(stats.filter(s => s.department && s.department !== '-').map(s => s.department))];
        return depts.sort((a, b) => a.localeCompare(b, 'tr'));
    }, [stats]);

    const [activeTab, setActiveTab] = useState('all');

    const scopedStats = useMemo(() => {
        if (activeTab === 'all') return stats;
        return stats.filter(s => s.department === activeTab);
    }, [stats, activeTab]);

    // Reset filters when department changes
    useEffect(() => {
        setActiveRole('all');
        setComparisonIds(new Set());
        setShowComparison(false);
        setActiveSubTeam(null);
        setHiddenIds(new Set());
    }, [activeTab]);

    // ── ROLE FILTER ──
    const roleList = useMemo(() => {
        const roles = [...new Set(scopedStats.filter(s => s.job_title && s.job_title !== '-').map(s => s.job_title))];
        return roles.sort((a, b) => a.localeCompare(b, 'tr'));
    }, [scopedStats]);

    const filteredStats = useMemo(() => {
        let result = scopedStats;
        if (activeRole !== 'all') result = result.filter(s => s.job_title === activeRole);
        if (activeSubTeam) result = result.filter(s => activeSubTeam.memberIds.includes(s.employee_id));
        return result;
    }, [scopedStats, activeRole, activeSubTeam]);

    const visibleStats = useMemo(() => {
        return filteredStats.filter(s => !hiddenIds.has(s.employee_id));
    }, [filteredStats, hiddenIds]);

    const subTeams = useMemo(() => {
        if (!hierarchyData || hierarchyData.length === 0) return [];
        return hierarchyData
            .filter(node => node.children && node.children.length > 0)
            .map(node => {
                const memberIds = new Set();
                const flatten = (n) => { memberIds.add(n.id); if (n.children) n.children.forEach(flatten); };
                node.children.forEach(flatten);
                const mIds = [...memberIds];
                const teamStats = stats.filter(s => mIds.includes(s.employee_id));
                return {
                    managerId: node.id,
                    managerName: node.name,
                    title: node.title,
                    memberIds: mIds,
                    stats: teamStats,
                };
            });
    }, [hierarchyData, stats]);

    // ── FETCH DAILY TREND ──
    useEffect(() => {
        if (!stats || stats.length === 0) return;
        const fetchTrend = async () => {
            setTrendLoading(true);
            try {
                const params = {};
                if (year) params.year = year;
                if (month) params.month = month;
                if (departmentId) params.department_id = departmentId;
                const res = await api.get('/dashboard/team_analytics/', { params });
                setDailyTrend(res.data?.daily_trend || []);
            } catch (err) {
                console.error('Daily trend fetch error:', err);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchTrend();
    }, [year, month, departmentId, stats.length]);

    // ── COMPUTED ANALYTICS DATA ──
    const analytics = useMemo(() => {
        if (!visibleStats || visibleStats.length === 0) return null;

        // Split stats: PRIMARY for work/leave/attendance, ALL for OT/meal
        const primaryStats = visibleStats.filter(s => s.relationship_type !== 'SECONDARY');
        const allStats = visibleStats; // Includes SECONDARY employees
        const primaryCount = primaryStats.length;
        const allCount = allStats.length;
        const count = allCount; // Total count for display

        // Totals — work/leave/attendance from PRIMARY only
        const totalWorked = primaryStats.reduce((a, c) => a + (c.total_worked || 0), 0);
        const totalCompleted = primaryStats.reduce((a, c) => a + (c.completed_minutes || c.total_worked || 0), 0); // Normal work (no OT)
        // OT: Use approved OT requests (intended+potential+manual) as primary source,
        // fallback to MWS total_overtime if request data unavailable — ALL employees
        const totalOTFromRequests = allStats.reduce((a, c) => a + (c.ot_intended_minutes || 0) + (c.ot_potential_minutes || 0) + (c.ot_manual_minutes || 0), 0);
        const totalOTFromMWS = allStats.reduce((a, c) => a + (c.total_overtime || 0), 0);
        const totalOT = totalOTFromRequests > 0 ? totalOTFromRequests : totalOTFromMWS;
        const totalMissing = primaryStats.reduce((a, c) => a + (c.total_missing || 0), 0);
        const totalRequired = primaryStats.reduce((a, c) => a + (c.monthly_required || 0), 0);
        const totalPastTarget = primaryStats.reduce((a, c) => a + (c.past_target_minutes || c.monthly_required || 0), 0);

        // Work days from backend (accurate fiscal period days) with fallback
        const _sample = primaryStats[0] || allStats[0] || {};
        const elapsedWorkDays = Math.max(1, _sample.elapsed_work_days || Math.round(getIstanbulDay() * 5 / 7));
        const totalWorkDaysInMonth = _sample.total_work_days || 22;
        const remainingWorkDays = Math.max(0, _sample.remaining_work_days ?? (totalWorkDaysInMonth - elapsedWorkDays));

        // Averages — work metrics use primaryCount, OT uses allCount
        const avgWorked = primaryCount > 0 ? Math.round(totalWorked / primaryCount) : 0;
        const avgOT = allCount > 0 ? Math.round(totalOT / allCount) : 0;
        const avgMissing = primaryCount > 0 ? Math.round(totalMissing / primaryCount) : 0;
        const avgRequired = primaryCount > 0 ? Math.round(totalRequired / primaryCount) : 0;

        // EFFICIENCY: completed (normal work) vs past_target (pro-rated to today) — PRIMARY only
        const efficiency = totalPastTarget > 0 ? Math.round((totalCompleted / totalPastTarget) * 100) : 0;

        // Daily average missing per person — PRIMARY only
        const dailyAvgMissing = primaryCount > 0 ? Math.round(totalMissing / primaryCount / elapsedWorkDays) : 0;

        // Projected end-of-month balance — PRIMARY only
        const avgDeviation = primaryCount > 0 ? Math.round(primaryStats.reduce((a, c) => a + (c.monthly_deviation || 0), 0) / primaryCount) : 0;
        const dailyAvgDeviation = elapsedWorkDays > 0 ? avgDeviation / elapsedWorkDays : 0;
        const projectedBalance = Math.round(avgDeviation + dailyAvgDeviation * remainingWorkDays);

        // Balance distribution: completed vs past_target (deviation-based) — PRIMARY only
        const totalDeviation = primaryStats.reduce((a, c) => a + (c.monthly_deviation || 0), 0);
        const positiveBalance = primaryStats.filter(s => (s.monthly_deviation || 0) > 0).length;
        const negativeBalance = primaryStats.filter(s => (s.monthly_deviation || 0) < 0).length;
        const zeroBalance = primaryCount - positiveBalance - negativeBalance;

        // Department breakdown (for "Tum Ekibim" tab)
        // Work/leave/attendance from PRIMARY, OT from ALL
        const deptMap = {};
        primaryStats.forEach(s => {
            const dept = s.department || 'Bilinmiyor';
            if (!deptMap[dept]) deptMap[dept] = { name: dept, count: 0, primaryCount: 0, worked: 0, completed: 0, ot: 0, missing: 0, required: 0, pastTarget: 0, deviation: 0, positiveBalance: 0, attendanceRateSum: 0, weekendOT: 0, weekdayOT: 0, leaveUsed: 0, leaveTotal: 0 };
            deptMap[dept].count++;
            deptMap[dept].primaryCount++;
            deptMap[dept].worked += (s.total_worked || 0);
            deptMap[dept].completed += (s.completed_minutes || s.total_worked || 0);
            deptMap[dept].missing += (s.total_missing || 0);
            deptMap[dept].required += (s.monthly_required || 0);
            deptMap[dept].pastTarget += (s.past_target_minutes || s.monthly_required || 0);
            deptMap[dept].deviation += (s.monthly_deviation || 0);
            deptMap[dept].attendanceRateSum += (s.attendance_rate || 100);
            deptMap[dept].leaveUsed += (s.annual_leave_used || 0);
            deptMap[dept].leaveTotal += ((s.annual_leave_entitlement || 0) > 0 ? (s.annual_leave_entitlement || 0) : 0);
            if ((s.monthly_deviation || 0) > 0) deptMap[dept].positiveBalance++;
        });
        // Add OT from ALL employees (including SECONDARY)
        allStats.forEach(s => {
            const dept = s.department || 'Bilinmiyor';
            if (!deptMap[dept]) deptMap[dept] = { name: dept, count: 0, primaryCount: 0, worked: 0, completed: 0, ot: 0, missing: 0, required: 0, pastTarget: 0, deviation: 0, positiveBalance: 0, attendanceRateSum: 0, weekendOT: 0, weekdayOT: 0, leaveUsed: 0, leaveTotal: 0 };
            // Only count SECONDARY employees in total count (not double-counting PRIMARY)
            if (s.relationship_type === 'SECONDARY') deptMap[dept].count++;
            // OT: use approved OT requests (intended+potential+manual) for accuracy
            const _empOT = (s.ot_intended_minutes || 0) + (s.ot_potential_minutes || 0) + (s.ot_manual_minutes || 0);
            deptMap[dept].ot += _empOT > 0 ? _empOT : (s.total_overtime || 0);
            deptMap[dept].weekendOT += (s.ot_weekend_minutes || 0);
            deptMap[dept].weekdayOT += (s.ot_weekday_minutes || 0);
        });
        const departments = Object.values(deptMap).sort((a, b) => b.count - a.count);

        // Per-person computed fields — ALL employees for ranking table (uses filteredStats, not visibleStats, so hidden people appear dimmed)
        const ranked = [...filteredStats].map(s => {
            const isSecondary = s.relationship_type === 'SECONDARY';
            const pCompleted = s.completed_minutes || s.total_worked || 0;
            const pPastTarget = s.past_target_minutes || s.monthly_required || 0;
            return {
                ...s,
                efficiency: isSecondary ? null : (pPastTarget > 0 ? Math.round((pCompleted / pPastTarget) * 100) : 0),
                dailyMissing: isSecondary ? null : Math.round((s.total_missing || 0) / elapsedWorkDays),
                projected: isSecondary ? null : (elapsedWorkDays > 0 ? Math.round((s.monthly_deviation || 0) + ((s.monthly_deviation || 0) / elapsedWorkDays) * remainingWorkDays) : 0),
            };
        }).sort((a, b) => {
            // SECONDARY employees go to the bottom
            const aIsSecondary = a.relationship_type === 'SECONDARY';
            const bIsSecondary = b.relationship_type === 'SECONDARY';
            if (aIsSecondary !== bIsSecondary) return aIsSecondary ? 1 : -1;
            return (a.total_missing || 0) - (b.total_missing || 0);
        });

        // Performance chart data (top 20) — PRIMARY only (work metrics)
        const performanceData = [...primaryStats]
            .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'))
            .slice(0, 20)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                fullName: s.employee_name,
                worked: s.total_worked || 0,
                overtime: ((s.ot_intended_minutes || 0) + (s.ot_potential_minutes || 0) + (s.ot_manual_minutes || 0)) || (s.total_overtime || 0),
                missing: s.total_missing || 0,
                target: s.monthly_required || 0,
            }));

        // OT vs Missing comparison (use approved OT requests) — ALL for OT, PRIMARY for missing side
        const _getPersonOT = (s) => ((s.ot_intended_minutes || 0) + (s.ot_potential_minutes || 0) + (s.ot_manual_minutes || 0)) || (s.total_overtime || 0);
        const comparisonData = [...allStats]
            .filter(s => _getPersonOT(s) > 0 || (s.relationship_type !== 'SECONDARY' && (s.total_missing || 0) > 0))
            .sort((a, b) => _getPersonOT(b) - _getPersonOT(a))
            .slice(0, 15)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                'Fazla Mesai': _getPersonOT(s),
                'Eksik Zaman': s.relationship_type === 'SECONDARY' ? 0 : -(s.total_missing || 0),
            }));

        // Work distribution pie — PRIMARY for work/missing
        const workDistribution = [
            { name: 'Normal Mesai', value: Math.max(0, totalWorked - totalOT), color: '#6366f1' },
            { name: 'Fazla Mesai', value: totalOT, color: '#f59e0b' },
            { name: 'Kayıp Zaman', value: totalMissing, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Balance distribution — PRIMARY only
        const balanceDist = [
            { name: 'Pozitif', value: positiveBalance, color: '#10b981' },
            { name: 'Sıfır', value: zeroBalance, color: '#94a3b8' },
            { name: 'Negatif', value: negativeBalance, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Spotlight — PRIMARY for work/missing/efficiency, ALL for OT
        const primaryRanked = ranked.filter(s => s.relationship_type !== 'SECONDARY');
        const leastMissing = primaryRanked[0];
        const mostMissing = primaryRanked[primaryRanked.length - 1];
        const mostOT = [...allStats].sort((a, b) => (b.total_overtime || 0) - (a.total_overtime || 0))[0];
        const mostEfficient = [...primaryRanked].sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))[0];

        // Leave data — PRIMARY only (SECONDARY has null leave fields)
        const leaveData = primaryStats
            .filter(s => s.annual_leave_entitlement > 0 || s.annual_leave_used > 0)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                fullName: s.employee_name,
                entitlement: s.annual_leave_entitlement || 0,
                used: s.annual_leave_used || 0,
                remaining: s.annual_leave_balance || 0,
                reserved: s.annual_leave_reserved || 0,
            }))
            .sort((a, b) => a.remaining - b.remaining);

        // Risk detection — OT risk from ALL, missing/balance from PRIMARY
        const highOTRisk = allStats.filter(s => _getPersonOT(s) > 900); // > 15 saat
        const highMissingRisk = primaryStats.filter(s => (s.monthly_required || 0) > 0 && (s.total_missing || 0) > (s.monthly_required * 0.2));
        const criticalBalanceRisk = primaryStats.filter(s => (s.monthly_deviation || 0) < -600); // < -10 saat

        // Radar data for departments (only for "Tum Ekibim")
        const radarData = departments.length > 1 ? (() => {
            const axes = ['Verimlilik', 'FM Yoğunluğu', 'Eksik Düşükl.', 'Katılım', 'Pozitif Bakiye'];
            return axes.map(axis => {
                const row = { axis };
                departments.slice(0, 6).forEach(dept => {
                    const dEff = dept.pastTarget > 0 ? (dept.completed / dept.pastTarget) * 100 : 0;
                    const dOT = dept.pastTarget > 0 ? (dept.ot / dept.pastTarget) * 100 : 0;
                    const dMiss = dept.pastTarget > 0 ? 100 - (dept.missing / dept.pastTarget) * 100 : 100;
                    const dAttRate = dept.count > 0 ? (dept.attendanceRateSum / dept.count) : 100;
                    const dPosBal = dept.count > 0 ? (dept.positiveBalance / dept.count) * 100 : 0;

                    let val = 0;
                    if (axis === 'Verimlilik') val = Math.min(100, dEff);
                    else if (axis === 'FM Yoğunluğu') val = Math.min(100, dOT * 5);
                    else if (axis === 'Eksik Düşükl.') val = Math.max(0, dMiss);
                    else if (axis === 'Katılım') val = Math.min(100, dAttRate);
                    else if (axis === 'Pozitif Bakiye') val = dPosBal;

                    row[dept.name] = Math.round(val);
                });
                return row;
            });
        })() : [];

        // OT Source Breakdown (monthly approved by source type) — ALL employees
        const totalOTIntendedMin = allStats.reduce((a, c) => a + (c.ot_intended_minutes || 0), 0);
        const totalOTPotentialMin = allStats.reduce((a, c) => a + (c.ot_potential_minutes || 0), 0);
        const totalOTManualMin = allStats.reduce((a, c) => a + (c.ot_manual_minutes || 0), 0);
        const totalOTIntendedCount = allStats.reduce((a, c) => a + (c.ot_intended_count || 0), 0);
        const totalOTPotentialCount = allStats.reduce((a, c) => a + (c.ot_potential_count || 0), 0);
        const totalOTManualCount = allStats.reduce((a, c) => a + (c.ot_manual_count || 0), 0);
        const totalOTSourceMin = totalOTIntendedMin + totalOTPotentialMin + totalOTManualMin;

        const otSourceDistribution = [
            { name: 'Planlı', value: totalOTIntendedMin, count: totalOTIntendedCount, color: '#6366f1' },
            { name: 'Algılanan', value: totalOTPotentialMin, count: totalOTPotentialCount, color: '#f59e0b' },
            { name: 'Manuel', value: totalOTManualMin, count: totalOTManualCount, color: '#8b5cf6' },
        ].filter(d => d.value > 0);

        const otNormalRatio = totalWorked > 0 ? Math.round((totalOT / totalWorked) * 100) : 0;

        // --- NEW ANALYTICS v3.0 ---
        // Katılım oranı (departman ortalaması) — PRIMARY only
        const avgAttendanceRate = primaryCount > 0
            ? Math.round(primaryStats.reduce((s, p) => s + (p.attendance_rate || 100), 0) / primaryCount)
            : 100;
        const totalAttendanceDays = primaryStats.reduce((s, p) => s + (p.attendance_days || 0), 0);
        const totalAbsentDays = primaryStats.reduce((s, p) => s + (p.absent_days || 0), 0);

        // Günlük ortalama normal mesai (dk) — PRIMARY only
        const dailyAvgNormalMin = elapsedWorkDays > 0 && primaryCount > 0
            ? Math.round(totalCompleted / primaryCount / elapsedWorkDays)
            : 0;

        // OT/Normal oranı (%) — OT from ALL, completed from PRIMARY
        const otNormalPercent = totalCompleted > 0
            ? Math.round(totalOT / totalCompleted * 100)
            : 0;

        // Hafta sonu OT toplamları — ALL employees
        const totalWeekendOTMin = allStats.reduce((s, p) => s + (p.ot_weekend_minutes || 0), 0);
        const totalWeekdayOTMin = allStats.reduce((s, p) => s + (p.ot_weekday_minutes || 0), 0);
        const weekendOTRatio = (totalWeekendOTMin + totalWeekdayOTMin) > 0
            ? Math.round(totalWeekendOTMin / (totalWeekendOTMin + totalWeekdayOTMin) * 100)
            : 0;

        // Yemek & OT-yemek korelasyonu — ALL employees
        const totalMealOrdered = allStats.reduce((s, p) => s + (p.meal_ordered || 0), 0);
        const totalOTMealOverlap = allStats.reduce((s, p) => s + (p.ot_meal_overlap || 0), 0);
        const totalOTDays = allStats.reduce((s, p) => s + (p.ot_days_total || 0), 0);
        const otMealRate = totalOTDays > 0 ? Math.round(totalOTMealOverlap / totalOTDays * 100) : 0;

        // İzin kullanım oranı — PRIMARY only
        const totalLeaveUsed = primaryStats.reduce((s, p) => s + (p.annual_leave_used || 0), 0);
        const totalLeaveRemaining = primaryStats.reduce((s, p) => s + (p.annual_leave_balance || 0), 0);
        const avgLeaveUsage = primaryCount > 0
            ? Math.round(primaryStats.reduce((s, p) => {
                const total = p.annual_leave_entitlement || 0;
                return s + (total > 0 ? (p.annual_leave_used || 0) / total * 100 : 0);
            }, 0) / primaryCount)
            : 0;

        // Weekend OT top 10 for chart — ALL employees
        const weekendOTData = [...allStats]
            .filter(s => (s.ot_weekend_minutes || 0) > 0 || (s.ot_weekday_minutes || 0) > 0)
            .sort((a, b) => ((b.ot_weekend_minutes || 0) + (b.ot_weekday_minutes || 0)) - ((a.ot_weekend_minutes || 0) + (a.ot_weekday_minutes || 0)))
            .slice(0, 10)
            .map(s => ({
                name: (s.employee_name || '').split(' ').slice(0, 2).join(' '),
                'H.İçi FM': s.ot_weekday_minutes || 0,
                'H.Sonu FM': s.ot_weekend_minutes || 0,
            }));

        // Leave usage by department — uses PRIMARY data from departments
        const leaveByDept = departments
            .filter(d => d.leaveTotal > 0)
            .map(d => ({
                name: d.name,
                usage: d.leaveTotal > 0 ? Math.round(d.leaveUsed / d.leaveTotal * 100) : 0,
            }))
            .sort((a, b) => b.usage - a.usage);

        return {
            count, primaryCount, allCount,
            totalWorked, totalCompleted, totalOT, totalMissing, totalRequired, totalPastTarget,
            avgWorked, avgOT, avgMissing, avgRequired, efficiency,
            dailyAvgMissing, projectedBalance, avgDeviation, totalDeviation, elapsedWorkDays, totalWorkDaysInMonth, remainingWorkDays,
            positiveBalance, negativeBalance, zeroBalance,
            departments, ranked, performanceData, comparisonData,
            workDistribution, balanceDist,
            leastMissing, mostMissing, mostOT, mostEfficient,
            leaveData,
            highOTRisk, highMissingRisk, criticalBalanceRisk,
            radarData,
            totalOTIntendedMin, totalOTPotentialMin, totalOTManualMin,
            totalOTIntendedCount, totalOTPotentialCount, totalOTManualCount,
            totalOTSourceMin, otSourceDistribution, otNormalRatio,
            // v3.0 new fields
            avgAttendanceRate, totalAttendanceDays, totalAbsentDays,
            dailyAvgNormalMin, otNormalPercent,
            totalWeekendOTMin, totalWeekdayOTMin, weekendOTRatio,
            totalMealOrdered, totalOTMealOverlap, totalOTDays, otMealRate,
            totalLeaveUsed, totalLeaveRemaining, avgLeaveUsage,
            weekendOTData, leaveByDept,
        };
    }, [visibleStats, filteredStats]);

    // ── HEATMAP COMPUTATION ──
    const heatmapData = useMemo(() => {
        if (!dailyTrend || dailyTrend.length === 0) return [];
        const weeks = {};
        dailyTrend.forEach(d => {
            const date = new Date(d.date || `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
            if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends
            const weekNum = Math.ceil(d.day / 7);
            if (!weeks[weekNum]) weeks[weekNum] = {};
            weeks[weekNum][dayOfWeek] = { worked: d.avg_worked, absent: d.absent, day: d.day };
        });
        return Object.entries(weeks).map(([week, days]) => ({ week: parseInt(week), days }));
    }, [dailyTrend, year, month]);

    // ── SORT HANDLER FOR BENCHMARKING TABLE ──
    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('desc');
        }
    };

    // ── SORTED DEPARTMENTS ──
    const sortedDepartments = useMemo(() => {
        if (!analytics?.departments) return [];
        const depts = [...analytics.departments].map(dept => {
            const dEff = dept.pastTarget > 0 ? Math.round((dept.completed / dept.pastTarget) * 100) : 0;
            const avgWorkedDept = dept.count > 0 ? Math.round(dept.worked / dept.count) : 0;
            const avgOTDept = dept.count > 0 ? Math.round(dept.ot / dept.count) : 0;
            const avgMissingDept = dept.count > 0 ? Math.round(dept.missing / dept.count) : 0;
            const dailyMissingDept = dept.count > 0 && analytics.elapsedWorkDays > 0 ? Math.round(dept.missing / dept.count / analytics.elapsedWorkDays) : 0;
            const projectedDept = dept.count > 0 && analytics.elapsedWorkDays > 0
                ? Math.round((dept.deviation / dept.count) + ((dept.deviation / dept.count / analytics.elapsedWorkDays) * analytics.remainingWorkDays))
                : 0;
            const attendanceRateAvg = dept.count > 0 ? Math.round(dept.attendanceRateSum / dept.count) : 100;
            const dailyNormalDept = dept.count > 0 && analytics.elapsedWorkDays > 0 ? Math.round(dept.completed / dept.count / analytics.elapsedWorkDays) : 0;
            const otNormalPctDept = dept.completed > 0 ? Math.round(dept.ot / dept.completed * 100) : 0;
            return { ...dept, efficiency: dEff, avgWorked: avgWorkedDept, avgOT: avgOTDept, avgMissing: avgMissingDept, dailyMissing: dailyMissingDept, projected: projectedDept, attendanceRateAvg, dailyNormalDept, otNormalPctDept };
        });
        if (sortColumn) {
            depts.sort((a, b) => {
                const aVal = a[sortColumn] ?? 0;
                const bVal = b[sortColumn] ?? 0;
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }
        return depts;
    }, [analytics, sortColumn, sortDirection]);

    // ── EMPTY STATE ──
    if (!analytics || stats.length === 0) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="text-center">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Analiz verileri yüklenemedi</p>
                    <p className="text-xs mt-1">Ekip üyelerinizin mesai verileri bulunamadı.</p>
                </div>
            </div>
        );
    }

    const showDeptComparison = activeTab === 'all' && analytics.departments.length > 1;
    const dayNames = { 1: 'Pzt', 2: 'Sal', 3: 'Car', 4: 'Per', 5: 'Cum' };

    // Heatmap color helper
    const getHeatColor = (minutes) => {
        if (!minutes || minutes <= 0) return 'bg-slate-100 text-slate-400';
        if (minutes >= 480) return 'bg-emerald-500 text-white';
        if (minutes >= 420) return 'bg-emerald-300 text-emerald-900';
        if (minutes >= 360) return 'bg-amber-300 text-amber-900';
        if (minutes >= 240) return 'bg-amber-200 text-amber-800';
        return 'bg-red-200 text-red-800';
    };

    // Efficiency badge helper
    const getEfficiencyBadge = (eff) => {
        if (eff >= 100) return { label: 'Mükemmel', cls: 'bg-emerald-100 text-emerald-700' };
        if (eff >= 95) return { label: 'İyi', cls: 'bg-blue-100 text-blue-700' };
        if (eff >= 85) return { label: 'Normal', cls: 'bg-amber-100 text-amber-700' };
        return { label: 'Düşük', cls: 'bg-red-100 text-red-700' };
    };

    return (
        <div className="space-y-5 animate-in fade-in">

            {/* ═══════ PERSON DETAIL DRAWER ═══════ */}
            {detailPerson && (
                <PersonDetailDrawer
                    person={detailPerson}
                    onClose={() => setDetailPerson(null)}
                    elapsedWorkDays={analytics?.elapsedWorkDays || 1}
                    deptAvg={(() => {
                        const dept = analytics?.departments?.find(d => d.name === detailPerson?.department);
                        if (!dept) return null;
                        const count = dept.primaryCount || dept.count || 1;
                        return {
                            efficiency: dept.pastTarget > 0 ? Math.round((dept.completed / dept.pastTarget) * 100) : 0,
                            otNormalPct: dept.completed > 0 ? Math.round(dept.ot / dept.completed * 100) : 0,
                            attendanceRateAvg: Math.round((dept.attendanceRateSum || 0) / count),
                            dailyNormal: (analytics?.elapsedWorkDays || 1) > 0 ? Math.round(dept.completed / count / analytics.elapsedWorkDays) : 0,
                        };
                    })()}
                    hierarchyData={hierarchyData}
                />
            )}

            {/* ═══════ COMPARISON DRAWER ═══════ */}
            {showComparison && comparisonIds.size >= 2 && (
                <ComparisonDrawer
                    persons={filteredStats.filter(s => comparisonIds.has(s.employee_id))}
                    onClose={() => setShowComparison(false)}
                />
            )}

            {/* ═══════ DEPARTMENT TAB BAR ═══════ */}
            {deptList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'all'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Users size={12} className="inline mr-1.5 -mt-0.5" />
                        Tüm Ekibim
                    </button>
                    {deptList.map((dept, i) => (
                        <button
                            key={dept}
                            onClick={() => setActiveTab(dept)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                activeTab === dept
                                    ? 'text-white shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            style={activeTab === dept ? { backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length], boxShadow: `0 4px 12px ${DEPT_COLORS[i % DEPT_COLORS.length]}40` } : {}}
                        >
                            {dept}
                            <span className="ml-1.5 opacity-70">
                                ({stats.filter(s => s.department === dept).length})
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ═══════ SUB-TEAM CARDS ═══════ */}
            {subTeams.length > 0 && !isSecondaryMode && (
                <div className="space-y-3">
                    {activeSubTeam && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                            <Users size={14} className="text-indigo-600" />
                            <span className="font-semibold text-indigo-700">{activeSubTeam.managerName}&apos;in Ekibi</span>
                            <span className="text-indigo-500">({activeSubTeam.memberIds.length} kişi)</span>
                            <button
                                onClick={() => setActiveSubTeam(null)}
                                className="ml-auto px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-100 rounded transition"
                            >
                                Temizle
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subTeams.map((team, i) => {
                            const avgEff = team.stats.length > 0
                                ? Math.round(team.stats.reduce((s, p) => s + (p.total_worked || 0), 0) / Math.max(1, team.stats.reduce((s, p) => s + (p.monthly_required || 0), 0)) * 100)
                                : 0;
                            const avgOT = team.stats.length > 0
                                ? Math.round(team.stats.reduce((s, p) => s + (p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0), 0) / team.stats.length / 60)
                                : 0;
                            const avgMissing = team.stats.length > 0
                                ? Math.round(team.stats.reduce((s, p) => s + (p.total_missing || 0), 0) / team.stats.length / 60)
                                : 0;
                            const isActive = activeSubTeam?.managerId === team.managerId;
                            return (
                                <button
                                    key={team.managerId}
                                    onClick={() => setActiveSubTeam(isActive ? null : team)}
                                    className={`text-left p-4 rounded-xl border-l-4 transition-all ${isActive ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 border border-slate-200/80'}`}
                                    style={{ borderLeftColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-slate-800">{team.managerName}</span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{team.memberIds.length} kişi</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{team.title}</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-xs text-slate-400">Verimlilik</div>
                                            <div className="text-sm font-bold text-indigo-600">%{avgEff}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Ort. FM</div>
                                            <div className="text-sm font-bold text-amber-600">{avgOT}s</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Ort. Kayıp</div>
                                            <div className="text-sm font-bold text-red-600">{avgMissing}s</div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-team comparison bar chart */}
                    {subTeams.length >= 2 && (
                        <div className="bg-white rounded-xl p-4 border border-slate-200/80">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Alt Ekip Karşılaştırma</h4>
                            <ResponsiveContainer width="100%" height={Math.max(150, subTeams.length * 40)}>
                                <BarChart data={subTeams.map(t => ({
                                    name: (t.managerName || '').split(' ')[0],
                                    Verimlilik: t.stats.length > 0 ? Math.round(t.stats.reduce((s, p) => s + (p.total_worked || 0), 0) / Math.max(1, t.stats.reduce((s, p) => s + (p.monthly_required || 0), 0)) * 100) : 0,
                                    'FM (s)': t.stats.length > 0 ? Math.round(t.stats.reduce((s, p) => s + (p.ot_intended_minutes || 0) + (p.ot_potential_minutes || 0) + (p.ot_manual_minutes || 0), 0) / t.stats.length / 60) : 0,
                                }))} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Verimlilik" fill="#6366f1" radius={[0,4,4,0]} />
                                    <Bar dataKey="FM (s)" fill="#f59e0b" radius={[0,4,4,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ ROLE FILTER BAR ═══════ */}
            {roleList.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Briefcase size={12} className="text-slate-400 mr-1" />
                    <button
                        onClick={() => setActiveRole('all')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            activeRole === 'all'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        Tümünü ({scopedStats.length})
                    </button>
                    {roleList.map(role => {
                        const roleCount = scopedStats.filter(s => s.job_title === role).length;
                        return (
                            <button
                                key={role}
                                onClick={() => setActiveRole(role)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    activeRole === role
                                        ? 'bg-slate-700 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                {role} ({roleCount})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ═══════ SECTION 1: KPI Cards ═══════ */}
            <div className={`grid gap-3 ${isSecondaryMode ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8'}`}>
                {!isSecondaryMode && (
                    <KpiCard
                        label="Ekip Verimi"
                        value={`%${analytics.efficiency}`}
                        subValue={`${analytics.elapsedWorkDays}/${analytics.totalWorkDaysInMonth || 22} iş günü`}
                        icon={Target}
                        color={analytics.efficiency >= 95 ? 'emerald' : analytics.efficiency >= 80 ? 'amber' : 'red'}
                    />
                )}
                {!isSecondaryMode && (
                    <KpiCard
                        label="Ort. Çalışma"
                        value={formatMinutes(analytics.avgWorked)}
                        subValue={`${analytics.count} kişi toplam`}
                        icon={Clock}
                        color="indigo"
                    />
                )}
                {isSecondaryMode && (
                    <KpiCard
                        label="Kişi Sayısı"
                        value={analytics.count}
                        subValue="İkincil ekip üyesi"
                        icon={Users}
                        color="amber"
                    />
                )}
                <KpiCard
                    label="Ort. Fazla Mesai"
                    value={formatMinutes(analytics.avgOT)}
                    subValue={`Toplam: ${formatMinutes(analytics.totalOT)}`}
                    icon={Zap}
                    color="amber"
                />
                {!isSecondaryMode && (
                    <KpiCard
                        label="Ort. Kayıp"
                        value={formatMinutes(analytics.avgMissing)}
                        subValue={`Toplam: ${formatMinutes(analytics.totalMissing)}`}
                        icon={AlertTriangle}
                        color={analytics.avgMissing > 60 ? 'red' : 'slate'}
                    />
                )}
                {!isSecondaryMode && (
                    <KpiCard
                        label="Gnl. Ort. Normal"
                        value={formatMinutes(analytics.dailyAvgNormalMin)}
                        subValue={`FM/Normal: %${analytics.otNormalPercent}`}
                        icon={Clock}
                        color="blue"
                    />
                )}
                {!isSecondaryMode && (
                    <KpiCard
                        label="Tahmini Ay Sonu"
                        value={formatMinutes(Math.abs(analytics.projectedBalance))}
                        subValue={analytics.projectedBalance >= 0 ? 'Pozitif projeksiyon' : 'Negatif projeksiyon'}
                        icon={Calendar}
                        color={analytics.projectedBalance >= 0 ? 'emerald' : 'red'}
                    />
                )}
                {!isSecondaryMode && (
                    <KpiCard
                        label="Katılım Oranı"
                        value={`%${analytics.avgAttendanceRate}`}
                        subValue={`${analytics.totalAttendanceDays} devam / ${analytics.totalAbsentDays} devamsız`}
                        icon={CheckCircle}
                        color={analytics.avgAttendanceRate >= 95 ? 'emerald' : analytics.avgAttendanceRate >= 85 ? 'amber' : 'red'}
                    />
                )}
                {!isSecondaryMode && (
                    <KpiCard
                        label="Bakiye Durumu"
                        value={`${analytics.positiveBalance}P / ${analytics.negativeBalance}N`}
                        subValue={`Ort: ${analytics.avgDeviation >= 0 ? '+' : ''}${formatMinutes(Math.abs(analytics.avgDeviation))}`}
                        icon={TrendingUp}
                        color={analytics.positiveBalance >= analytics.negativeBalance ? 'emerald' : 'red'}
                    />
                )}
            </div>

            {/* ═══════ SECTION 2: Department Benchmarking Table (only "Tum Ekibim" + multiple depts) ═══════ */}
            {!isSecondaryMode && showDeptComparison && (
                <AnalyticsCard
                    title="Departman Kıyaslama Tablosu"
                    subtitle="Departmanlar arası performans karşılaştırması"
                    icon={BarChart3}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {[
                                        { key: 'name', label: 'Departman', align: 'left' },
                                        { key: 'count', label: 'Kişi' },
                                        { key: 'efficiency', label: 'Verim %' },
                                        { key: 'avgWorked', label: 'Ort. Çalışma' },
                                        { key: 'avgOT', label: 'Ort. FM' },
                                        { key: 'avgMissing', label: 'Ort. Eksik' },
                                        { key: 'dailyMissing', label: 'Günlük Ort. Eksik' },
                                        { key: 'projected', label: 'Tahmini Bakiye' },
                                        { key: 'dailyNormalDept', label: 'Gnl.Normal' },
                                        { key: 'otNormalPctDept', label: 'FM/Normal%' },
                                        { key: 'attendanceRateAvg', label: 'Katılım%' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className={`px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors ${col.align === 'left' ? 'text-left' : 'text-right'}`}
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                {sortColumn === col.key && (
                                                    sortDirection === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                                )}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDepartments.map((dept, i) => {
                                    const teamAvgEff = analytics.efficiency;
                                    const teamAvgWorked = analytics.avgWorked;
                                    const teamAvgOT = analytics.avgOT;
                                    const teamAvgMissing = analytics.avgMissing;
                                    const cellColor = (val, avg, invert = false) => {
                                        if (val === avg) return '';
                                        const isGood = invert ? val < avg : val > avg;
                                        return isGood ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-600 bg-red-50/50';
                                    };
                                    return (
                                        <tr
                                            key={dept.name}
                                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                            onClick={() => setActiveTab(dept.name)}
                                        >
                                            <td className="px-3 py-2.5 font-bold text-slate-700">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                                                    {dept.name}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">{dept.count}</td>
                                            <td className={`px-3 py-2.5 text-right font-bold rounded ${cellColor(dept.efficiency, teamAvgEff)}`}>
                                                %{dept.efficiency}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgWorked, teamAvgWorked)}`}>
                                                {formatMinutes(dept.avgWorked)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgOT, teamAvgOT)}`}>
                                                {formatMinutes(dept.avgOT)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold rounded ${cellColor(dept.avgMissing, teamAvgMissing, true)}`}>
                                                {formatMinutes(dept.avgMissing)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">
                                                {formatMinutes(dept.dailyMissing)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-bold rounded ${dept.projected >= 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-600 bg-red-50/50'}`}>
                                                {dept.projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(dept.projected))}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600">
                                                {formatMinutes(dept.dailyNormalDept)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-amber-600">
                                                %{dept.otNormalPctDept}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-bold rounded ${dept.attendanceRateAvg >= 95 ? 'text-emerald-600 bg-emerald-50/50' : dept.attendanceRateAvg >= 85 ? 'text-amber-600 bg-amber-50/50' : 'text-red-600 bg-red-50/50'}`}>
                                                %{dept.attendanceRateAvg}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Team average footer */}
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                                    <td className="px-3 py-2.5 font-bold text-slate-800">Ekip Ortalaması</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{analytics.count}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-indigo-600">%{analytics.efficiency}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgWorked)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgOT)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.avgMissing)}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatMinutes(analytics.dailyAvgMissing)}</td>
                                    <td className={`px-3 py-2.5 text-right font-bold ${analytics.projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {analytics.projectedBalance >= 0 ? '+' : ''}{formatMinutes(Math.abs(analytics.projectedBalance))}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                        {formatMinutes(analytics.dailyAvgNormalMin)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-amber-600">
                                        %{analytics.otNormalPercent}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                        %{analytics.avgAttendanceRate}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 3: Department Radar Chart (only "Tum Ekibim" + multiple depts) ═══════ */}
            {!isSecondaryMode && showDeptComparison && analytics.radarData.length > 0 && (
                <AnalyticsCard
                    title="Departman Kıyaslama Radarı"
                    subtitle="5 eksende departman performans karşılaştırması"
                    icon={Activity}
                >
                    <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analytics.radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis
                                    dataKey="axis"
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                                    tickCount={5}
                                />
                                {analytics.departments.slice(0, 6).map((dept, i) => (
                                    <Radar
                                        key={dept.name}
                                        name={dept.name}
                                        dataKey={dept.name}
                                        stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                                        fillOpacity={0.1}
                                        strokeWidth={2}
                                    />
                                ))}
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 4: Daily Trend + Projection ═══════ */}
            {dailyTrend.length > 0 && (
                <AnalyticsCard
                    title="Günlük Trend ve Projeksiyon"
                    subtitle="Gün bazlı ortalama çalışma, fazla mesai ve hedef çizgisi (dakika)"
                    icon={Activity}
                >
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={dailyTrend}
                                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="gradWorkedV2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradOTV2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Math.round(v / 60)}s`}
                                />
                                {/* Daily target reference line */}
                                {!isSecondaryMode && analytics.avgRequired > 0 && analytics.elapsedWorkDays > 0 && (
                                    <ReferenceLine
                                        y={Math.round(analytics.avgRequired / analytics.elapsedWorkDays)}
                                        stroke="#10b981"
                                        strokeDasharray="8 4"
                                        strokeWidth={1.5}
                                        label={{
                                            value: 'Günlük Hedef',
                                            position: 'insideTopRight',
                                            fill: '#10b981',
                                            fontSize: 10,
                                            fontWeight: 600,
                                        }}
                                    />
                                )}
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                {!isSecondaryMode && (
                                    <Area
                                        type="monotone"
                                        dataKey="avg_worked"
                                        name="Ort. Çalışma"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill="url(#gradWorkedV2)"
                                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="avg_overtime"
                                    name="Ort. Fazla Mesai"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fill="url(#gradOTV2)"
                                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Absent count mini row */}
                    {!isSecondaryMode && dailyTrend.some(d => d.absent > 0) && (
                        <div className="flex items-center gap-2 mt-2 px-1">
                            <span className="text-[10px] font-semibold text-slate-400">Devamsızlık:</span>
                            <div className="flex gap-1 flex-wrap">
                                {dailyTrend.filter(d => d.absent > 0).map(d => (
                                    <span key={d.day} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-bold tabular-nums">
                                        {d.day}. gün: {d.absent}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 5: Weekly Heatmap ═══════ */}
            {!isSecondaryMode && heatmapData.length > 0 && (
                <AnalyticsCard
                    title="Haftalık Çalışma Deseni"
                    subtitle="Hafta içi gün bazlı ortalama çalışma yoğunluğu"
                    icon={Calendar}
                >
                    <div className="space-y-2">
                        {/* Header row */}
                        <div className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                            <div className="text-[10px] font-bold text-slate-400" />
                            {[1, 2, 3, 4, 5].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-slate-500">{dayNames[d]}</div>
                            ))}
                        </div>
                        {/* Week rows */}
                        {heatmapData.map(weekData => (
                            <div key={weekData.week} className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                                <div className="text-[10px] font-bold text-slate-400 flex items-center">Hafta {weekData.week}</div>
                                {[1, 2, 3, 4, 5].map(d => {
                                    const cell = weekData.days[d];
                                    if (!cell) return <div key={d} className="h-12 rounded-lg bg-slate-50 border border-slate-100" />;
                                    return (
                                        <div
                                            key={d}
                                            className={`h-12 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 ${getHeatColor(cell.worked)}`}
                                            title={`${cell.day}. gün: ${formatMinutes(cell.worked)} çalışma${cell.absent > 0 ? `, ${cell.absent} devamsız` : ''}`}
                                        >
                                            <span className="text-xs font-bold">{cell.worked > 0 ? formatMinutes(cell.worked) : '-'}</span>
                                            {cell.absent > 0 && (
                                                <span className="text-[8px] font-semibold opacity-80">{cell.absent} yok</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {/* Legend */}
                        <div className="flex items-center gap-3 mt-3 justify-end">
                            <span className="text-[9px] text-slate-400 font-semibold">Yoğunluk:</span>
                            {[
                                { label: '<4s', cls: 'bg-red-200' },
                                { label: '4-6s', cls: 'bg-amber-200' },
                                { label: '6-7s', cls: 'bg-amber-300' },
                                { label: '7-8s', cls: 'bg-emerald-300' },
                                { label: '8s+', cls: 'bg-emerald-500' },
                            ].map((l, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className={`w-3 h-3 rounded ${l.cls}`} />
                                    <span className="text-[9px] text-slate-500">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 6: Per-Person Performance Bar ═══════ */}
            {!isSecondaryMode && <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <AnalyticsCard
                    title="Kişi Bazlı Performans"
                    subtitle={`Aylık çalışma süreleri (${analytics.performanceData.length} kişi)`}
                    icon={BarChart3}
                    className="lg:col-span-2"
                >
                    <div className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.performanceData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Math.round(v / 60)}s`}
                                />
                                <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="worked" name="Çalışma" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="overtime" name="Fazla Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="missing" name="Kayıp" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>

                {/* ═══════ SECTION 7: Time Distribution Pies ═══════ */}
                <div className="space-y-5">
                    <AnalyticsCard
                        title="Zaman Dağılımı"
                        subtitle="Ekip toplamı"
                        icon={Activity}
                    >
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.workDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={38}
                                        outerRadius={60}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {analytics.workDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v) => formatMinutes(v)}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                            {analytics.workDistribution.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    {d.name}: {formatMinutes(d.value)}
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    <AnalyticsCard
                        title="Bakiye Dağılımı"
                        subtitle="Pozitif / Negatif oranı"
                        icon={TrendingUp}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-5 rounded-full overflow-hidden bg-slate-100 flex">
                                {analytics.balanceDist.map((d, i) => (
                                    <div
                                        key={i}
                                        className="h-full transition-all duration-700"
                                        style={{
                                            width: `${(d.value / (analytics.primaryCount || analytics.count)) * 100}%`,
                                            backgroundColor: d.color,
                                        }}
                                        title={`${d.name}: ${d.value} kişi`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between mt-2">
                            {analytics.balanceDist.map((d, i) => (
                                <span key={i} className="text-[10px] font-bold" style={{ color: d.color }}>
                                    {d.name}: {d.value}
                                </span>
                            ))}
                        </div>
                    </AnalyticsCard>
                </div>
            </div>}

            {/* ═══════ SECTION 8: OT vs Missing + OT Source Pie ═══════ */}
            {(analytics.comparisonData.length > 0 || analytics.otSourceDistribution.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* OT vs Missing Diverging Chart (2/3) */}
                    {analytics.comparisonData.length > 0 && (
                        <AnalyticsCard
                            title="Fazla Mesai ve Kayıp Karşılaştırması"
                            subtitle="Kişi bazlı fazla mesai vs eksik zaman"
                            icon={Zap}
                            className="lg:col-span-2"
                        >
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={analytics.comparisonData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        barCategoryGap="25%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => formatMinutes(Math.abs(v))}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={80}
                                        />
                                        <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(Math.abs(v))} />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                            iconType="circle"
                                            iconSize={8}
                                        />
                                        <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                                        <Bar dataKey="Fazla Mesai" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="Eksik Zaman" fill="#ef4444" radius={[4, 0, 0, 4]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </AnalyticsCard>
                    )}

                    {/* OT Source Distribution Donut (1/3) */}
                    {analytics.otSourceDistribution.length > 0 && (
                        <AnalyticsCard
                            title="Fazla Mesai Kaynak Dağılımı"
                            subtitle="Onaylanmış ek mesai kaynakları"
                            icon={Activity}
                        >
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analytics.otSourceDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {analytics.otSourceDistribution.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomTooltip formatter={(v) => formatMinutes(v)} />}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 mt-2">
                                {analytics.otSourceDistribution.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className="font-semibold text-slate-600">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">{d.count} adet</span>
                                            <span className="font-bold text-slate-700">{formatMinutes(d.value)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-semibold">Fazla Mesai / Normal Oranı</span>
                                    <span className="font-bold text-amber-600">%{analytics.otNormalRatio}</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                                        style={{ width: `${Math.min(100, analytics.otNormalRatio)}%` }}
                                    />
                                </div>
                            </div>
                        </AnalyticsCard>
                    )}
                </div>
            )}

            {/* ═══════ SECTION 8.5: Weekend OT + Meal Correlation ═══════ */}
            {analytics.weekendOTData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <AnalyticsCard
                        title="Hafta Sonu vs Hafta İçi Fazla Mesai"
                        subtitle="En çok fazla mesai yapan 10 kişi (hafta içi / hafta sonu)"
                        icon={Calendar}
                        className="lg:col-span-2"
                    >
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={analytics.weekendOTData}
                                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickLine={false}
                                        interval={0}
                                        angle={-35}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${Math.round(v / 60)}s`}
                                    />
                                    <Tooltip content={<CustomTooltip formatter={(v) => formatMinutes(v)} />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Bar dataKey="H.İçi FM" name="Hafta İçi FM" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="H.Sonu FM" name="Hafta Sonu FM" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalyticsCard>

                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-[10px] text-blue-400 font-semibold uppercase">Hafta İçi FM</p>
                            <p className="text-lg font-bold text-blue-600">{formatMinutes(analytics.totalWeekdayOTMin)}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-[10px] text-amber-400 font-semibold uppercase">Hafta Sonu FM</p>
                            <p className="text-lg font-bold text-amber-600">{formatMinutes(analytics.totalWeekendOTMin)}</p>
                        </div>
                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                            <p className="text-[10px] text-violet-400 font-semibold uppercase">H.Sonu / Toplam</p>
                            <p className="text-lg font-bold text-violet-600">%{analytics.weekendOTRatio}</p>
                        </div>
                        <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                            <p className="text-[10px] text-cyan-400 font-semibold uppercase flex items-center gap-1">
                                <UtensilsCrossed size={10} />
                                FM'de Yemek
                            </p>
                            <p className="text-lg font-bold text-cyan-600">%{analytics.otMealRate}</p>
                            <p className="text-[10px] text-cyan-400">{analytics.totalOTMealOverlap}/{analytics.totalOTDays} gün</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 9: Performance Ranking Table ═══════ */}
            <AnalyticsCard
                title={isSecondaryMode ? "Ek Mesai Sıralaması" : "Performans Sıralaması"}
                subtitle={isSecondaryMode
                    ? `Ek mesai süresine göre sıralama (${analytics.ranked.length} kişi)`
                    : `Eksik süreye göre sıralama — en az eksik en üstte (${analytics.ranked.length} kişi)`}
                icon={Award}
            >
                {comparisonIds.size >= 2 && (
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => setShowComparison(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                        >
                            <GitCompare size={14} />
                            Kıyasla ({comparisonIds.size} kişi)
                        </button>
                        <button
                            onClick={() => setComparisonIds(new Set())}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                            Seçimi Temizle
                        </button>
                    </div>
                )}
                {hiddenIds.size > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <EyeOff size={12} />
                            {hiddenIds.size} kişi gizlendi
                        </span>
                        <button
                            onClick={() => setHiddenIds(new Set())}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            Tümünü Göster
                        </button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-2 py-2.5 w-8"></th>
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Çalışan</th>
                                <th className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Departman</th>
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Çalışma</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Hedef</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Verim %</th>}
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">F. Mesai</th>
                                <th className="px-3 py-2.5 text-right font-bold text-indigo-400 uppercase tracking-wider">Planlı</th>
                                <th className="px-3 py-2.5 text-right font-bold text-amber-400 uppercase tracking-wider">Algılanan</th>
                                <th className="px-3 py-2.5 text-right font-bold text-violet-400 uppercase tracking-wider">Manuel</th>
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Kayıp</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Gnl. Eksik</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Net Bakiye</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Tahmini</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">İzin</th>}
                                {!isSecondaryMode && <th className="px-3 py-2.5 text-right font-bold text-emerald-400 uppercase tracking-wider">Katılım%</th>}
                                <th className="px-3 py-2.5 text-right font-bold text-amber-400 uppercase tracking-wider">H.Sonu FM</th>
                                <th className="px-3 py-2.5 text-right font-bold text-cyan-400 uppercase tracking-wider">Yemek/FM</th>
                                <th className="px-2 py-2.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.ranked.map((person, idx) => {
                                const isSecondary = person.relationship_type === 'SECONDARY';
                                const balance = person.monthly_deviation || 0;
                                const effBadge = isSecondary ? { cls: 'bg-slate-100 text-slate-400' } : getEfficiencyBadge(person.efficiency);
                                return (
                                    <tr key={person.employee_id || idx} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${hiddenIds.has(person.employee_id) ? 'opacity-40' : ''}`} onClick={() => setDetailPerson(person)}>
                                        <td className="px-2 py-2">
                                            <input
                                                type="checkbox"
                                                checked={comparisonIds.has(person.employee_id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    setComparisonIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(person.employee_id)) {
                                                            next.delete(person.employee_id);
                                                        } else if (next.size < 5) {
                                                            next.add(person.employee_id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2 font-bold text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700">{person.employee_name}</span>
                                                {isSecondary && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600">
                                                        İkincil
                                                    </span>
                                                )}
                                            </div>
                                            {person.job_title && (
                                                <span className="text-[10px] text-slate-400">{person.job_title}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">{person.department || '-'}</td>
                                        {!isSecondaryMode && <td className="px-3 py-2 text-right font-semibold text-indigo-600 tabular-nums">{isSecondary ? <span className="text-slate-300">&mdash;</span> : formatMinutes(person.total_worked || 0)}</td>}
                                        {!isSecondaryMode && <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{isSecondary ? <span className="text-slate-300">&mdash;</span> : formatMinutes(person.monthly_required || 0)}</td>}
                                        {!isSecondaryMode && (
                                            <td className="px-3 py-2 text-right">
                                                {isSecondary ? <span className="text-slate-300">&mdash;</span> : (
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${effBadge.cls}`}>
                                                        %{person.efficiency}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-2 text-right font-semibold text-amber-600 tabular-nums">{(() => { const _pOT = ((person.ot_intended_minutes || 0) + (person.ot_potential_minutes || 0) + (person.ot_manual_minutes || 0)) || (person.total_overtime || 0); return _pOT > 0 ? formatMinutes(_pOT) : <span className="text-slate-300">&mdash;</span>; })()}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-indigo-500 tabular-nums">{(person.ot_intended_minutes || 0) > 0 ? formatMinutes(person.ot_intended_minutes) : <span className="text-slate-300">&mdash;</span>}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-amber-500 tabular-nums">{(person.ot_potential_minutes || 0) > 0 ? formatMinutes(person.ot_potential_minutes) : <span className="text-slate-300">&mdash;</span>}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-violet-500 tabular-nums">{(person.ot_manual_minutes || 0) > 0 ? formatMinutes(person.ot_manual_minutes) : <span className="text-slate-300">&mdash;</span>}</td>
                                        {!isSecondaryMode && (
                                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${isSecondary ? 'text-slate-300' : (person.total_missing || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {isSecondary ? <span>&mdash;</span> : (person.total_missing || 0) > 0 ? formatMinutes(person.total_missing) : <span className="text-emerald-500">0</span>}
                                            </td>
                                        )}
                                        {!isSecondaryMode && <td className="px-3 py-2 text-right font-semibold text-slate-600 tabular-nums">{isSecondary ? <span className="text-slate-300">&mdash;</span> : formatMinutes(person.dailyMissing)}</td>}
                                        {!isSecondaryMode && (
                                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${isSecondary ? 'text-slate-300' : (person.monthly_deviation || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isSecondary ? <span>&mdash;</span> : <>{(person.monthly_deviation || 0) >= 0 ? '+' : ''}{formatMinutes(Math.abs(person.monthly_deviation || 0))}</>}
                                            </td>
                                        )}
                                        {!isSecondaryMode && (
                                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${isSecondary ? 'text-slate-300' : person.projected >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isSecondary ? <span>&mdash;</span> : <>{person.projected >= 0 ? '+' : ''}{formatMinutes(Math.abs(person.projected))}</>}
                                            </td>
                                        )}
                                        {!isSecondaryMode && (
                                            <td className="px-3 py-2 text-right font-semibold text-violet-600 tabular-nums">
                                                {isSecondary ? <span className="text-slate-300">&mdash;</span> : person.annual_leave_balance != null ? `${person.annual_leave_balance}g` : '-'}
                                            </td>
                                        )}
                                        {!isSecondaryMode && (
                                            <td className="px-3 py-2 text-right">
                                                {isSecondary ? <span className="text-slate-300">&mdash;</span> : (
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        (person.attendance_rate || 100) >= 95 ? 'bg-emerald-100 text-emerald-700' :
                                                        (person.attendance_rate || 100) >= 85 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        %{Math.round(person.attendance_rate || 100)}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-2 text-right font-semibold text-amber-600 tabular-nums">
                                            {(person.ot_weekend_minutes || 0) > 0 ? formatMinutes(person.ot_weekend_minutes) : <span className="text-slate-300">&mdash;</span>}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-cyan-600 tabular-nums">
                                            {(person.ot_days_total || 0) > 0 ? `%${Math.round((person.ot_meal_overlap || 0) / person.ot_days_total * 100)}` : <span className="text-slate-300">&mdash;</span>}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHiddenIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(person.employee_id)) {
                                                            next.delete(person.employee_id);
                                                        } else {
                                                            next.add(person.employee_id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className="p-1 rounded hover:bg-slate-100 transition"
                                                title={hiddenIds.has(person.employee_id) ? 'Göster' : 'Gizle'}
                                            >
                                                {hiddenIds.has(person.employee_id)
                                                    ? <EyeOff size={14} className="text-slate-400" />
                                                    : <Eye size={14} className="text-slate-300 hover:text-slate-500" />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>

            {/* ═══════ SECTION 10: Risk Panel ═══════ */}
            {!isSecondaryMode && (analytics.highOTRisk.length > 0 || analytics.highMissingRisk.length > 0 || analytics.criticalBalanceRisk.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* High OT Risk */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'ot' ? null : 'ot')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                    <Flame size={14} className="text-amber-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-amber-800">Yüksek Fazla Mesai</p>
                                    <p className="text-[10px] text-amber-600">&gt;15 saat fazla mesai</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                                    {analytics.highOTRisk.length}
                                </span>
                                {expandedRisk === 'ot' ? <ChevronUp size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'ot' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.highOTRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-amber-900">{s.employee_name}</span>
                                        <span className="font-bold text-amber-700">{formatMinutes(s.total_overtime || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* High Missing Risk */}
                    <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'missing' ? null : 'missing')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-100 rounded-lg">
                                    <AlertCircle size={14} className="text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-red-800">Yüksek Eksik Zaman</p>
                                    <p className="text-[10px] text-red-600">&gt;%20 hedef kaybı</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                                    {analytics.highMissingRisk.length}
                                </span>
                                {expandedRisk === 'missing' ? <ChevronUp size={14} className="text-red-600" /> : <ChevronDown size={14} className="text-red-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'missing' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.highMissingRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-red-900">{s.employee_name}</span>
                                        <span className="font-bold text-red-700">{formatMinutes(s.total_missing || 0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Critical Balance Risk */}
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl overflow-hidden">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-violet-100/50 transition-colors"
                            onClick={() => setExpandedRisk(expandedRisk === 'balance' ? null : 'balance')}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-100 rounded-lg">
                                    <Shield size={14} className="text-violet-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-violet-800">Kritik Bakiye</p>
                                    <p className="text-[10px] text-violet-600">&lt;-10 saat bakiye</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded-full text-xs font-bold">
                                    {analytics.criticalBalanceRisk.length}
                                </span>
                                {expandedRisk === 'balance' ? <ChevronUp size={14} className="text-violet-600" /> : <ChevronDown size={14} className="text-violet-600" />}
                            </div>
                        </button>
                        {expandedRisk === 'balance' && (
                            <div className="px-4 pb-3 space-y-1.5">
                                {analytics.criticalBalanceRisk.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white/60 rounded-lg">
                                        <span className="font-semibold text-violet-900">{s.employee_name}</span>
                                        <span className="font-bold text-violet-700">-{formatMinutes(Math.abs(s.monthly_deviation || 0))}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 11: Leave Balance ═══════ */}
            {!isSecondaryMode && analytics.leaveData.length > 0 && (
                <AnalyticsCard
                    title="İzin Bakiyesi"
                    subtitle="Yıllık izin hakları ve kullanım durumu"
                    icon={Palmtree}
                >
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analytics.leaveData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit=" gün"
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    formatter={(v) => `${v} gün`}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="used" name="Kullanılan" stackId="leave" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reserved" name="Planlanan" stackId="leave" fill="#a5b4fc" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="remaining" name="Kalan" stackId="leave" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 11.5: Leave Usage Rates ═══════ */}
            {!isSecondaryMode && analytics.leaveByDept.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AnalyticsCard
                        title="Departman Bazlı İzin Kullanım Oranı"
                        subtitle="Her departmanın yıllık izin kullanım yüzdesi"
                        icon={Palmtree}
                    >
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={analytics.leaveByDept}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                    barCategoryGap="30%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit="%"
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={80}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                                        formatter={(v) => `%${v}`}
                                    />
                                    <Bar dataKey="usage" name="Kullanım %" radius={[0, 4, 4, 0]}>
                                        {analytics.leaveByDept.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={entry.usage <= 50 ? '#10b981' : entry.usage <= 80 ? '#f59e0b' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalyticsCard>

                    <div className="space-y-3">
                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-5">
                            <p className="text-[10px] text-violet-400 font-semibold uppercase">Ort. Kullanım</p>
                            <p className="text-2xl font-bold text-violet-600">%{analytics.avgLeaveUsage}</p>
                            <p className="text-[10px] text-violet-400 mt-1">Ekip geneli ortalama izin kullanım oranı</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                            <p className="text-[10px] text-indigo-400 font-semibold uppercase">Toplam Kullanılan</p>
                            <p className="text-2xl font-bold text-indigo-600">{analytics.totalLeaveUsed} gün</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                            <p className="text-[10px] text-emerald-400 font-semibold uppercase">Kalan Bakiye</p>
                            <p className="text-2xl font-bold text-emerald-600">{analytics.totalLeaveRemaining} gün</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 12: Spotlight Cards ═══════ */}
            {!isSecondaryMode && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Least Missing */}
                {analytics.leastMissing && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <Award size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Az Eksik</p>
                            <p className="text-lg font-bold truncate">{analytics.leastMissing.employee_name}</p>
                            <p className="text-emerald-200 text-xs mt-0.5">{analytics.leastMissing.department || '-'}</p>
                            <div className="mt-3 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-emerald-200">Eksik:</span>
                                    <span className="text-xl font-black tabular-nums">
                                        {(analytics.leastMissing.total_missing || 0) > 0 ? formatMinutes(analytics.leastMissing.total_missing) : '0'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-200 text-[10px]">
                                    <span>Verimlilik: %{analytics.leastMissing.efficiency || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Most OT */}
                {analytics.mostOT && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <Zap size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-amber-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Çok Fazla Mesai</p>
                            <p className="text-lg font-bold truncate">{analytics.mostOT.employee_name}</p>
                            <p className="text-amber-200 text-xs mt-0.5">{analytics.mostOT.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    {formatMinutes(analytics.mostOT.total_overtime || 0)}
                                </span>
                                <Zap size={16} className="text-amber-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Most Missing */}
                {analytics.mostMissing && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-red-500 to-rose-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <AlertTriangle size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-red-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Çok Eksik</p>
                            <p className="text-lg font-bold truncate">{analytics.mostMissing.employee_name}</p>
                            <p className="text-red-200 text-xs mt-0.5">{analytics.mostMissing.department || '-'}</p>
                            <div className="mt-3 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-red-200">Eksik:</span>
                                    <span className="text-xl font-black tabular-nums">
                                        {formatMinutes(analytics.mostMissing.total_missing || 0)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-red-200 text-[10px]">
                                    <span>Verimlilik: %{analytics.mostMissing.efficiency || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Most Efficient */}
                {analytics.mostEfficient && (
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                        <div className="absolute top-3 right-3 opacity-20">
                            <Star size={48} />
                        </div>
                        <div className="relative">
                            <p className="text-violet-100 text-[10px] font-bold uppercase tracking-wider mb-1">En Verimli</p>
                            <p className="text-lg font-bold truncate">{analytics.mostEfficient.employee_name}</p>
                            <p className="text-violet-200 text-xs mt-0.5">{analytics.mostEfficient.department || '-'}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-2xl font-black tabular-nums">
                                    %{analytics.mostEfficient.efficiency}
                                </span>
                                <Star size={16} className="text-violet-200" />
                            </div>
                        </div>
                    </div>
                )}
            </div>}

            {/* ═══════ SECTION 13: Department Mini Cards (only "Tum Ekibim" + multiple depts) ═══════ */}
            {!isSecondaryMode && showDeptComparison && (
                <AnalyticsCard
                    title="Departman Özeti"
                    subtitle="Her departmanın kompakt özet kartı (tıkla: o departmana geç)"
                    icon={Users}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {analytics.departments.map((dept, i) => {
                            const dEff = dept.pastTarget > 0 ? Math.round((dept.completed / dept.pastTarget) * 100) : 0;
                            const dAvgWorked = dept.count > 0 ? Math.round(dept.worked / dept.count) : 0;
                            const dAvgOT = dept.count > 0 ? Math.round(dept.ot / dept.count) : 0;
                            const dAvgMissing = dept.count > 0 ? Math.round(dept.missing / dept.count) : 0;
                            const dAvgDeviation = dept.count > 0 ? Math.round(dept.deviation / dept.count) : 0;
                            return (
                                <button
                                    key={dept.name}
                                    className="text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all hover:shadow-sm group"
                                    onClick={() => setActiveTab(dept.name)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                                            <span className="text-xs font-bold text-slate-800">{dept.name}</span>
                                            <span className="text-[10px] text-slate-400">{dept.count} kişi</span>
                                        </div>
                                        <ArrowRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Verim</span>
                                            <span className={`font-bold ${dEff >= 95 ? 'text-emerald-600' : dEff >= 80 ? 'text-amber-600' : 'text-red-600'}`}>%{dEff}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Ort. Mesai</span>
                                            <span className="font-bold text-indigo-600">{formatMinutes(dAvgWorked)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-red-400 font-semibold">Ort. Eksik</span>
                                            <span className={`font-bold ${dAvgMissing > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatMinutes(dAvgMissing)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Ort. F.M.</span>
                                            <span className="font-bold text-amber-600">{dAvgOT > 0 ? formatMinutes(dAvgOT) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between col-span-2 pt-1 border-t border-slate-200/50">
                                            <span className="text-slate-400">Net Bakiye</span>
                                            <span className={`font-bold ${dAvgDeviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {dAvgDeviation >= 0 ? '+' : ''}{formatMinutes(Math.abs(dAvgDeviation))}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </AnalyticsCard>
            )}

            {/* ═══════ SECTION 14: Individual Performance Cards ═══════ */}
            {!isSecondaryMode && <AnalyticsCard
                title="Bireysel Performans Kartları"
                subtitle={`Eksik süreye göre sıralama (${analytics.ranked.length} kişi)`}
                icon={UserCheck}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {analytics.ranked.map((person, idx) => {
                        const _isSecondary = person.relationship_type === 'SECONDARY';
                        const missing = person.total_missing || 0;
                        const deviation = person.monthly_deviation || 0;
                        const effBadge = _isSecondary ? { cls: 'bg-blue-100 text-blue-600' } : getEfficiencyBadge(person.efficiency);
                        const missingLevel = _isSecondary ? 'none' : missing === 0 ? 'none' : missing < 60 ? 'low' : missing < 300 ? 'medium' : 'high';
                        const borderCls = {
                            none: 'border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30',
                            low: 'border-blue-200/60 bg-gradient-to-br from-white to-blue-50/30',
                            medium: 'border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30',
                            high: 'border-red-200/60 bg-gradient-to-br from-white to-red-50/30',
                        }[missingLevel];
                        const personOTTotal = (person.ot_intended_minutes || 0) + (person.ot_potential_minutes || 0) + (person.ot_manual_minutes || 0);
                        const personCompleted = person.completed_minutes || person.total_worked || 0;
                        const personOTNormalRatio = personCompleted > 0 ? Math.round(((person.total_overtime || 0) / personCompleted) * 100) : 0;
                        return (
                            <div
                                key={person.employee_id || idx}
                                className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${_isSecondary ? 'border-blue-200/60 bg-gradient-to-br from-white to-blue-50/30' : borderCls}`}
                                onClick={() => setDetailPerson(person)}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-300 tabular-nums w-5">#{idx + 1}</span>
                                            <p className="text-xs font-bold text-slate-800 truncate">{person.employee_name}</p>
                                            {_isSecondary && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600 flex-shrink-0">
                                                    İkincil
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate ml-5">{person.department || '-'} · {person.job_title || '-'}</p>
                                    </div>
                                    {!_isSecondary && (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ml-2 ${effBadge.cls}`}>
                                            %{person.efficiency}
                                        </span>
                                    )}
                                </div>

                                {/* Badges Row */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {/* Attendance Rate Badge — HIDE for SECONDARY */}
                                    {!_isSecondary && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        (person.attendance_rate || 100) >= 95 ? 'bg-emerald-100 text-emerald-700' :
                                        (person.attendance_rate || 100) >= 85 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        Katılım %{Math.round(person.attendance_rate || 100)}
                                    </span>
                                    )}
                                    {/* Weekend OT Badge */}
                                    {(person.ot_weekend_minutes || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                                            H.Sonu {formatMinutes(person.ot_weekend_minutes)}
                                        </span>
                                    )}
                                    {/* OT Source Badges */}
                                    {(person.ot_intended_minutes || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                                            Planlı {formatMinutes(person.ot_intended_minutes)}
                                        </span>
                                    )}
                                    {(person.ot_potential_minutes || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600">
                                            Algılanan {formatMinutes(person.ot_potential_minutes)}
                                        </span>
                                    )}
                                    {(person.ot_manual_minutes || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700">
                                            Manuel {formatMinutes(person.ot_manual_minutes)}
                                        </span>
                                    )}
                                    {/* OT Meal Rate Badge */}
                                    {(person.ot_days_total || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-100 text-cyan-700">
                                            Yemek/FM %{Math.round((person.ot_meal_overlap || 0) / person.ot_days_total * 100)}
                                        </span>
                                    )}
                                </div>

                                {/* Metrics grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Çalışma</span>
                                        <span className="font-bold text-indigo-600 tabular-nums">{_isSecondary ? '—' : formatMinutes(person.total_worked || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">F. Mesai</span>
                                        <span className="font-bold text-amber-600 tabular-nums">{(person.total_overtime || 0) > 0 ? formatMinutes(person.total_overtime) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-red-400 font-semibold">Kayıp</span>
                                        <span className={`font-bold tabular-nums ${_isSecondary ? 'text-slate-300' : missing > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{_isSecondary ? '—' : missing > 0 ? formatMinutes(missing) : '0'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">FM/Normal</span>
                                        <span className="font-bold text-amber-500 tabular-nums">{_isSecondary ? '—' : `%${personOTNormalRatio}`}</span>
                                    </div>
                                </div>

                                {/* Net Bakiye bar + value — HIDE for SECONDARY */}
                                {!_isSecondary && (
                                <div className="pt-2 border-t border-slate-100/80">
                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                        <span className="text-slate-400 font-semibold">Net Bakiye</span>
                                        <span className={`font-bold tabular-nums ${deviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {deviation >= 0 ? '+' : ''}{formatMinutes(Math.abs(deviation))}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${deviation >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(100, Math.abs(person.efficiency || 0))}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                                            %{person.efficiency}
                                        </span>
                                    </div>
                                </div>
                                )}

                                {/* Leave info — HIDE for SECONDARY */}
                                {!_isSecondary && (person.annual_leave_entitlement > 0 || person.annual_leave_used > 0) && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <Palmtree size={10} />
                                            İzin
                                        </span>
                                        <span className="font-bold text-violet-600">
                                            {person.annual_leave_balance ?? 0}/{person.annual_leave_entitlement ?? 0} gün
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </AnalyticsCard>}

            {/* ═══════ SECTION 15: Summary Footer Band ═══════ */}
            <div className="bg-slate-800 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">{isSecondaryMode ? 'İkincil Ekip Özet' : 'Özet'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Çalışan</p>
                        <p className="text-sm font-bold text-white tabular-nums">{analytics.count}</p>
                    </div>
                    {!isSecondaryMode && (
                        <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-semibold">Toplam Çalışma</p>
                            <p className="text-sm font-bold text-indigo-400 tabular-nums">{formatMinutes(analytics.totalWorked)}</p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Toplam FM</p>
                        <p className="text-sm font-bold text-amber-400 tabular-nums">{formatMinutes(analytics.totalOT)}</p>
                    </div>
                    {!isSecondaryMode && (
                        <>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-semibold">Toplam Eksik</p>
                                <p className="text-sm font-bold text-red-400 tabular-nums">{formatMinutes(analytics.totalMissing)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-semibold">Ort. Eksik/Kişi</p>
                                <p className="text-sm font-bold text-red-400 tabular-nums">{formatMinutes(analytics.avgMissing)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-semibold">Ort. Verim</p>
                                <p className={`text-sm font-bold tabular-nums ${analytics.efficiency >= 95 ? 'text-emerald-400' : analytics.efficiency >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                                    %{analytics.efficiency}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-semibold">Ort. Net Bakiye</p>
                                <p className={`text-sm font-bold tabular-nums ${analytics.avgDeviation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {analytics.avgDeviation >= 0 ? '+' : ''}{formatMinutes(Math.abs(analytics.avgDeviation))}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
};

export default TeamAnalyticsDashboard;
