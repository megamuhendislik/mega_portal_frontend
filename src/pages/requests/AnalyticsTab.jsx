import React, { useState, useEffect } from 'react';
import {
    PieChart, BarChart3, Users, ArrowDownLeft,
    Clock, Calendar, CheckCircle2, XCircle, AlertCircle,
    TrendingUp, Layers, FileText, Utensils, CreditCard, Briefcase
} from 'lucide-react';
import api from '../../services/api';
import IncomingAnalytics from './IncomingAnalytics';
import TeamOvertimeAnalytics from '../../components/TeamOvertimeAnalytics';

// ===== PersonalAnalytics (moved from Requests.jsx) =====
const PersonalAnalytics = ({ subordinates, loading: parentLoading }) => {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [data, setData] = useState(null);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setFetching(true);
            try {
                const params = selectedEmployee ? { employee_id: selectedEmployee } : {};
                const res = await api.get('/request-analytics/', { params });
                setData(res.data);
            } catch (err) {
                console.error("Analytics error:", err);
                setData(null);
            } finally {
                setFetching(false);
            }
        };
        fetchAnalytics();
    }, [selectedEmployee]);

    if (parentLoading || fetching) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
            </div>
        </div>
    );

    if (!data) return (
        <div className="text-center py-16 text-slate-400">
            <PieChart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Analiz verisi oluşturulamadı.</p>
        </div>
    );

    const statusLabels = { APPROVED: 'Onaylandı', REJECTED: 'Reddedildi', PENDING: 'Bekliyor', ORDERED: 'Sipariş Edildi', CANCELLED: 'İptal' };
    const maxTrendTotal = Math.max(...data.monthly_trend.map(x => x.total), 1);
    const maxTrendOtHours = Math.max(...data.monthly_trend.map(x => x.overtime_hours || 0), 1);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{data.employee?.name || 'Talep Analizi'}</h3>
                        <p className="text-xs text-slate-500">{data.employee?.department || ''}</p>
                    </div>
                </div>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 outline-none min-w-[180px]">
                    <option value="">Kendim</option>
                    {subordinates.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Toplam Talep</p>
                    <h3 className="text-2xl font-black">{data.total_requests}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Layers size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Onay Oranı</p>
                    <h3 className="text-2xl font-black">{data.approval_rate || 0}%</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><CheckCircle2 size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Fazla Mesai</p>
                    <h3 className="text-2xl font-black">{data.total_overtime_hours || 0}<span className="text-sm ml-1 font-bold opacity-80">saat</span></h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Clock size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">İzin Günleri</p>
                    <h3 className="text-2xl font-black">{data.total_leave_days || 0}<span className="text-sm ml-1 font-bold opacity-80">gün</span></h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Calendar size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Bekleyen</p>
                    <h3 className="text-2xl font-black">{data.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><AlertCircle size={56} /></div>
                </div>
            </div>

            {/* Type breakdown cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { key: 'leave', label: 'İzin', icon: <FileText size={18} />, bg: 'bg-blue-50', text: 'text-blue-600' },
                    { key: 'overtime', label: 'Fazla Mesai', icon: <Clock size={18} />, bg: 'bg-amber-50', text: 'text-amber-600' },
                    { key: 'meal', label: 'Yemek', icon: <Utensils size={18} />, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                    { key: 'cardless', label: 'Kartsız Giriş', icon: <CreditCard size={18} />, bg: 'bg-purple-50', text: 'text-purple-600' },
                ].map(({ key, label, icon, bg, text }) => {
                    const s = data.summary?.[key] || {};
                    const total = s.total || 0;
                    const approved = s.approved || 0;
                    const rejected = s.rejected || 0;
                    const pending = s.pending || 0;
                    return (
                        <div key={key} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${text}`}>{icon}</div>
                                <span className="text-sm font-bold text-slate-700">{label}</span>
                                <span className="ml-auto text-xl font-black text-slate-800">{total}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                {approved > 0 && <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${(approved / total) * 100}%` }} />}
                                {pending > 0 && <div className="h-full bg-amber-400" style={{ width: `${(pending / total) * 100}%` }} />}
                                {rejected > 0 && <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${(rejected / total) * 100}%` }} />}
                            </div>
                            <div className="flex justify-between mt-2 text-[11px] font-medium">
                                <span className="text-emerald-600">{approved} onay</span>
                                <span className="text-amber-600">{pending} bekleyen</span>
                                <span className="text-red-500">{rejected} red</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Monthly trends + charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" /> Aylık Talep Trendi
                    </h4>
                    <p className="text-xs text-slate-400 mb-5">Son 6 ayın talep dağılımı</p>
                    <div className="flex flex-wrap gap-4 mb-4 text-[11px] font-medium">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-400 rounded" /> İzin</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded" /> Mesai</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-400 rounded" /> Yemek</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-400 rounded" /> Kartsız</span>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {data.monthly_trend.map((m, i) => {
                            const total = m.total || 0;
                            const barH = total > 0 ? (total / maxTrendTotal) * 100 : 2;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">{total} talep</div>
                                    <div className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse" style={{ height: `${barH}%`, minHeight: '4px' }}>
                                        {(m.leave || 0) > 0 && <div className="w-full bg-blue-400" style={{ height: `${(m.leave / total) * 100}%` }} />}
                                        {(m.overtime || 0) > 0 && <div className="w-full bg-amber-400" style={{ height: `${(m.overtime / total) * 100}%` }} />}
                                        {(m.meal || 0) > 0 && <div className="w-full bg-emerald-400" style={{ height: `${(m.meal / total) * 100}%` }} />}
                                        {(m.cardless || 0) > 0 && <div className="w-full bg-purple-400" style={{ height: `${(m.cardless / total) * 100}%` }} />}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{m.label?.split(' ')[0]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Durum Dağılımı */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Briefcase size={18} className="text-purple-500" /> Durum Dağılımı
                    </h4>
                    <div className="flex items-center gap-6 mt-4">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                {(() => {
                                    const total = data.total_requests || 1;
                                    const approved = data.status_distribution?.find(s => s.status === 'Onaylanan')?.count || 0;
                                    const rejected = data.status_distribution?.find(s => s.status === 'Reddedilen')?.count || 0;
                                    const pending = data.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0;
                                    const aPct = (approved / total) * 100;
                                    const rPct = (rejected / total) * 100;
                                    const pPct = (pending / total) * 100;
                                    return (
                                        <>
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${aPct} ${100-aPct}`} strokeDashoffset="0" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${pPct} ${100-pPct}`} strokeDashoffset={`${-aPct}`} />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${rPct} ${100-rPct}`} strokeDashoffset={`${-(aPct+pPct)}`} />
                                        </>
                                    );
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-slate-800">{data.total_requests}</span>
                                <span className="text-[10px] text-slate-400">Toplam</span>
                            </div>
                        </div>
                        <div className="space-y-2 flex-1">
                            {(data.status_distribution || []).map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                        <span className="text-sm font-medium text-slate-600">{s.status}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-800">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-purple-500" /> Son Aktiviteler
                </h4>
                {(data.recent_requests || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Henüz talep yok</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {data.recent_requests.map((req, i) => (
                            <div key={i} className="flex items-center gap-4 py-3 hover:bg-slate-50/50 rounded-xl px-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm
                                    ${req.type === 'LEAVE' ? 'bg-blue-500' : req.type === 'OVERTIME' ? 'bg-amber-500' : req.type === 'CARDLESS_ENTRY' ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                                    {req.type === 'LEAVE' ? <FileText size={16} /> : req.type === 'OVERTIME' ? <Clock size={16} /> : req.type === 'CARDLESS_ENTRY' ? <CreditCard size={16} /> : <Utensils size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-700 truncate">{req.type_label}</p>
                                    <p className="text-xs text-slate-400 truncate">{req.summary}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1
                                        ${['APPROVED','ORDERED'].includes(req.status) ? 'bg-emerald-100 text-emerald-700' : ['REJECTED','CANCELLED'].includes(req.status) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {statusLabels[req.status] || req.status}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(req.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ===== TeamAnalytics (wraps TeamOvertimeAnalytics + team-overview data) =====
const TeamAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/request-analytics/team-overview/');
                setData(res.data);
            } catch (err) {
                console.error('Team overview error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Team Request Overview KPIs */}
            {data && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Ekip Talepleri</p>
                            <h3 className="text-2xl font-black">{data.total_requests}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Onay Oranı</p>
                            <h3 className="text-2xl font-black">{data.approval_rate}%</h3>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Mesai Saatleri</p>
                            <h3 className="text-2xl font-black">{data.overtime_hours}<span className="text-sm ml-1 opacity-80">s</span></h3>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">İzin Günleri</p>
                            <h3 className="text-2xl font-black">{data.leave_days}<span className="text-sm ml-1 opacity-80">g</span></h3>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Ekip Üyeleri</p>
                            <h3 className="text-2xl font-black">{data.managed_count}</h3>
                        </div>
                    </div>

                    {/* Per-employee breakdown table */}
                    {(data.by_employee || []).length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-4">Çalışan Bazlı Talep Dağılımı</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                                            <th className="py-3 px-2">Çalışan</th>
                                            <th className="py-3 px-2 text-center">İzin</th>
                                            <th className="py-3 px-2 text-center">Mesai</th>
                                            <th className="py-3 px-2 text-center">Yemek</th>
                                            <th className="py-3 px-2 text-center">Kartsız</th>
                                            <th className="py-3 px-2 text-center">Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_employee.filter(e => e.total > 0).map((emp, i) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="py-3 px-2">
                                                    <div className="font-bold text-slate-700">{emp.name}</div>
                                                    <div className="text-[11px] text-slate-400">{emp.department} · {emp.position}</div>
                                                </td>
                                                <td className="py-3 px-2 text-center font-bold text-blue-600">{emp.leave || 0}</td>
                                                <td className="py-3 px-2 text-center font-bold text-amber-600">{emp.overtime || 0}</td>
                                                <td className="py-3 px-2 text-center font-bold text-emerald-600">{emp.meal || 0}</td>
                                                <td className="py-3 px-2 text-center font-bold text-purple-600">{emp.cardless || 0}</td>
                                                <td className="py-3 px-2 text-center font-black text-slate-800">{emp.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Existing TeamOvertimeAnalytics component */}
            <TeamOvertimeAnalytics />
        </div>
    );
};

// ===== Main AnalyticsTab =====
const AnalyticsTab = ({ subordinates, loading, isManager }) => {
    const [activeSubTab, setActiveSubTab] = useState('personal');

    return (
        <div className="space-y-0 animate-in fade-in">
            {/* Sub-tab bar */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setActiveSubTab('personal')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        activeSubTab === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <PieChart size={16} /> Kendi Taleplerim
                </button>
                {isManager && (
                    <>
                        <button
                            onClick={() => setActiveSubTab('incoming')}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                activeSubTab === 'incoming' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <ArrowDownLeft size={16} /> Gelen Talepler
                        </button>
                        <button
                            onClick={() => setActiveSubTab('team')}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                activeSubTab === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Users size={16} /> Ekip Analizi
                        </button>
                    </>
                )}
            </div>

            {activeSubTab === 'personal' && <PersonalAnalytics subordinates={subordinates} loading={loading} />}
            {activeSubTab === 'incoming' && isManager && <IncomingAnalytics />}
            {activeSubTab === 'team' && isManager && <TeamAnalytics />}
        </div>
    );
};

export default AnalyticsTab;
