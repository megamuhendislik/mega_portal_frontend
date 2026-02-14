import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus, Filter, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Clock, Calendar, Utensils,
    CheckCircle2, XCircle, AlertCircle, Users, CreditCard, ChevronRight, ChevronDown, User,
    BarChart3, PieChart, TrendingUp, FileText, Briefcase, ArrowRight, Layers, GitBranch
} from 'lucide-react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestDetailModal from '../components/RequestDetailModal';

import useSmartPolling from '../hooks/useSmartPolling';
import { useAuth } from '../context/AuthContext';

// =========== SECTION: My Requests ===========
const MyRequestsSection = ({
    requests, overtimeRequests, mealRequests, cardlessEntryRequests, requestTypes,
    loading, getStatusBadge, handleDeleteRequest, handleEditOvertimeClick,
    handleResubmitOvertime, handleViewDetails, setShowCreateModal
}) => {
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const allMyRequests = useMemo(() => {
        const items = [];
        requests.forEach(r => items.push({
            ...r,
            _type: 'LEAVE',
            _sortDate: r.start_date || r.created_at,
            leave_type_name: requestTypes.find(t => t.id === r.request_type)?.name,
        }));
        overtimeRequests.forEach(r => items.push({
            ...r,
            _type: 'OVERTIME',
            _sortDate: r.date || r.created_at,
            onResubmit: () => handleResubmitOvertime(r),
        }));
        mealRequests.forEach(r => items.push({ ...r, _type: 'MEAL', _sortDate: r.date || r.created_at }));
        cardlessEntryRequests.forEach(r => items.push({ ...r, _type: 'CARDLESS_ENTRY', _sortDate: r.date || r.created_at }));
        items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
        return items;
    }, [requests, overtimeRequests, mealRequests, cardlessEntryRequests, requestTypes]);

    const filtered = useMemo(() => {
        return allMyRequests.filter(r => {
            if (typeFilter !== 'ALL' && r._type !== typeFilter) return false;
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            return true;
        });
    }, [allMyRequests, typeFilter, statusFilter]);

    const counts = useMemo(() => ({
        all: allMyRequests.length,
        leave: allMyRequests.filter(r => r._type === 'LEAVE').length,
        overtime: allMyRequests.filter(r => r._type === 'OVERTIME').length,
        meal: allMyRequests.filter(r => r._type === 'MEAL').length,
        cardless: allMyRequests.filter(r => r._type === 'CARDLESS_ENTRY').length,
        pending: allMyRequests.filter(r => r.status === 'PENDING').length,
        approved: allMyRequests.filter(r => r.status === 'APPROVED').length,
        rejected: allMyRequests.filter(r => r.status === 'REJECTED').length,
    }), [allMyRequests]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl"></div>)}
            </div>
        );
    }

    const typeChips = [
        { id: 'ALL', label: 'Tümü', count: counts.all, color: 'slate' },
        { id: 'LEAVE', label: 'İzin', count: counts.leave, color: 'blue', icon: <Calendar size={14} /> },
        { id: 'OVERTIME', label: 'Fazla Mesai', count: counts.overtime, color: 'amber', icon: <Clock size={14} /> },
        { id: 'MEAL', label: 'Yemek', count: counts.meal, color: 'emerald', icon: <Utensils size={14} /> },
        { id: 'CARDLESS_ENTRY', label: 'Kartsız Giriş', count: counts.cardless, color: 'purple', icon: <CreditCard size={14} /> },
    ];

    const statusChips = [
        { id: 'ALL', label: 'Tümü' },
        { id: 'PENDING', label: 'Bekleyen', count: counts.pending, color: 'amber' },
        { id: 'APPROVED', label: 'Onaylanan', count: counts.approved, color: 'emerald' },
        { id: 'REJECTED', label: 'Reddedilen', count: counts.rejected, color: 'red' },
    ];

    return (
        <div className="space-y-6">
            {/* Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'İzin', count: counts.leave, icon: <Calendar size={20} />, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Fazla Mesai', count: counts.overtime, icon: <Clock size={20} />, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Yemek', count: counts.meal, icon: <Utensils size={20} />, color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Kartsız Giriş', count: counts.cardless, icon: <CreditCard size={20} />, color: 'purple', bg: 'bg-purple-50', border: 'border-purple-100' },
                ].map((card, i) => (
                    <div key={i} className={`${card.bg} border ${card.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-all`}>
                        <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-${card.color}-500`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">{card.label}</p>
                            <p className="text-xl font-bold text-slate-800">{card.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Tür:</span>
                {typeChips.map(chip => (
                    <button
                        key={chip.id}
                        onClick={() => setTypeFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border
                            ${typeFilter === chip.id
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {chip.icon}
                        {chip.label}
                        {chip.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${typeFilter === chip.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {chip.count}
                            </span>
                        )}
                    </button>
                ))}

                <div className="w-px h-5 bg-slate-200 mx-2" />

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Durum:</span>
                {statusChips.map(chip => (
                    <button
                        key={chip.id}
                        onClick={() => setStatusFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                            ${statusFilter === chip.id
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {chip.label}
                        {chip.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === chip.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {chip.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Request Cards */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                        <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Talep Bulunamadı</h3>
                    <p className="text-slate-500 max-w-xs mt-1 text-sm">Seçili filtrelere uygun talep bulunmuyor.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 hover:underline"
                    >
                        <Plus size={14} /> Yeni Talep Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
                    {filtered.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={`${req._type}-${req.id}`}
                            request={req}
                            type={req._type}
                            statusBadge={getStatusBadge}
                            onEdit={req._type === 'OVERTIME' && req.status === 'PENDING' ? handleEditOvertimeClick : undefined}
                            onDelete={['POTENTIAL', 'PENDING'].includes(req.status)
                                ? (r) => handleDeleteRequest(r, req._type)
                                : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// =========== SECTION: Team Requests ===========
const TeamRequestsSection = ({
    incomingRequests, teamHistoryRequests, subordinates, loading,
    getStatusBadge, handleApprove, handleReject, handleViewDetails, fetchTeamHistory
}) => {
    const [subTab, setSubTab] = useState('direct');
    const [selectedApprover, setSelectedApprover] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        if (subTab === 'history') {
            fetchTeamHistory();
        }
    }, [subTab]);

    const directRequests = useMemo(() => incomingRequests.filter(r => r.level === 'direct'), [incomingRequests]);
    const indirectRequests = useMemo(() => incomingRequests.filter(r => r.level === 'indirect'), [incomingRequests]);

    // Group indirect requests by approver_target
    const groupedIndirect = useMemo(() => {
        const groups = {};
        indirectRequests.forEach(r => {
            const approver = r.approver_target;
            const key = approver ? approver.id : 'unknown';
            const label = approver ? approver.name : 'Bilinmiyor';
            if (!groups[key]) groups[key] = { label, requests: [] };
            groups[key].requests.push(r);
        });
        return groups;
    }, [indirectRequests]);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl"></div>)}
            </div>
        );
    }

    const subTabs = [
        { id: 'direct', label: 'Bana Gelenler', badge: directRequests.length, icon: <ArrowDownLeft size={15} /> },
        { id: 'indirect', label: 'Alt Kademe', badge: indirectRequests.length, icon: <GitBranch size={15} /> },
        { id: 'history', label: 'Geçmiş', icon: <FileText size={15} /> },
    ];

    const renderRequestCard = (req, showActions = false) => (
        <RequestCard
            onViewDetails={handleViewDetails}
            key={req.uniqueId || `${req.type}-${req.id}`}
            request={{
                ...req,
                leave_type_name: req.request_type_detail?.name || req.details?.type_name,
                employee_name: req.employee_detail?.full_name || req.employee?.name || req.employee_name
            }}
            type={req.type}
            isIncoming={true}
            statusBadge={getStatusBadge}
            onApprove={showActions ? (id, notes) => handleApprove(req, notes) : undefined}
            onReject={showActions ? (id, reason) => handleReject(req, reason) : undefined}
        />
    );

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex p-1 bg-slate-100/80 rounded-xl w-fit">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                            ${subTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.badge > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                ${subTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Direct Requests */}
            {subTab === 'direct' && (
                <div className="space-y-4">
                    {directRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle2 size={28} className="text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Tüm Talepler İşlendi</h3>
                            <p className="text-slate-500 mt-1 text-sm">Doğrudan size gelen bekleyen talep bulunmuyor.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                                    Onay Bekleyen ({directRequests.length})
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
                                {directRequests.map(req => renderRequestCard(req, true))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Indirect / Hierarchical Requests */}
            {subTab === 'indirect' && (
                <div className="space-y-4">
                    {Object.keys(groupedIndirect).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <GitBranch size={28} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Alt Kademe Talebi Yok</h3>
                            <p className="text-slate-500 mt-1 text-sm">Alt yöneticilerinize gelen bekleyen talep bulunmuyor.</p>
                        </div>
                    ) : (
                        Object.entries(groupedIndirect).map(([key, group]) => {
                            const isExpanded = expandedGroups[key] !== false; // default expanded
                            return (
                                <div key={key} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => toggleGroup(key)}
                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                                                <User size={16} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-sm font-bold text-slate-800">{group.label}</h4>
                                                <p className="text-xs text-slate-500">Onay bekleyen: {group.requests.length} talep</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                                                {group.requests.length}
                                            </span>
                                            {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                            {group.requests.map(req => renderRequestCard(req, false))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* History */}
            {subTab === 'history' && (
                <div className="space-y-4">
                    {teamHistoryRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <FileText size={28} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Geçmiş Kayıt Yok</h3>
                            <p className="text-slate-500 mt-1 text-sm">Ekibinize ait herhangi bir geçmiş talep kaydı bulunamadı.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
                            {teamHistoryRequests.map(req => (
                                <RequestCard
                                    onViewDetails={handleViewDetails}
                                    key={req.id}
                                    request={{
                                        ...req,
                                        leave_type_name: req.request_type_detail?.name,
                                        employee_name: req.employee_detail?.full_name
                                    }}
                                    isIncoming={true}
                                    statusBadge={getStatusBadge}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// =========== SECTION: Request Analytics ===========
const RequestAnalyticsSection = ({ subordinates, loading: parentLoading }) => {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [selectedEmployee]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = selectedEmployee ? { employee_id: selectedEmployee } : {};
            const res = await api.get('/request-analytics/', { params });
            setData(res.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || parentLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
                </div>
                <div className="h-64 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    if (!data) return null;

    const maxTrend = Math.max(...data.monthly_trend.map(m => m.total), 1);
    const totalDist = data.type_distribution.reduce((acc, d) => acc + d.count, 0) || 1;

    return (
        <div className="space-y-6">
            {/* Employee Selector */}
            {subordinates.length > 0 && (
                <div className="flex items-center gap-3">
                    <User size={16} className="text-slate-400" />
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[220px] shadow-sm"
                    >
                        <option value="">Kendim</option>
                        {subordinates.map(sub => (
                            <option key={sub.id} value={sub.id}>
                                {sub.first_name} {sub.last_name}
                            </option>
                        ))}
                    </select>
                    {data.employee && selectedEmployee && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                            {data.employee.department}
                        </span>
                    )}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Toplam Talep', value: data.total_requests, icon: <Layers size={18} />, color: 'bg-slate-800', text: 'text-white' },
                    { label: 'Bekleyen', value: data.status_distribution.find(s => s.status === 'Bekleyen')?.count || 0, icon: <Clock size={18} />, color: 'bg-amber-50 border border-amber-100', text: 'text-amber-700' },
                    { label: 'Onaylanan', value: data.status_distribution.find(s => s.status === 'Onaylanan')?.count || 0, icon: <CheckCircle2 size={18} />, color: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700' },
                    { label: 'Reddedilen', value: data.status_distribution.find(s => s.status === 'Reddedilen')?.count || 0, icon: <XCircle size={18} />, color: 'bg-red-50 border border-red-100', text: 'text-red-700' },
                ].map((kpi, i) => (
                    <div key={i} className={`${kpi.color} rounded-2xl p-4 ${kpi.text}`}>
                        <div className="flex items-center gap-2 mb-1 opacity-80">{kpi.icon}<span className="text-xs font-medium">{kpi.label}</span></div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Type Distribution */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <PieChart size={15} className="text-blue-500" /> Talep Türü Dağılımı
                    </h3>
                    <div className="space-y-3">
                        {data.type_distribution.map((item, i) => {
                            const pct = totalDist > 0 ? Math.round((item.count / totalDist) * 100) : 0;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-medium text-slate-700 w-28">{item.type}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 w-10 text-right">{item.count}</span>
                                    <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={15} className="text-emerald-500" /> Aylık Talep Trendi
                    </h3>
                    <div className="flex items-end gap-2 h-40">
                        {data.monthly_trend.map((month, i) => {
                            const height = maxTrend > 0 ? Math.max((month.total / maxTrend) * 100, 4) : 4;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-slate-600">{month.total}</span>
                                    <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: '120px' }}>
                                        <div
                                            className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-700"
                                            style={{ height: `${height}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{month.label.split(' ')[0]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Requests Table */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText size={15} className="text-purple-500" /> Son Talepler
                </h3>
                {data.recent_requests.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Henüz talep bulunamadı.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tür</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Özet</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_requests.map((req, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold
                                                ${req.type === 'LEAVE' ? 'bg-blue-100 text-blue-700' :
                                                    req.type === 'OVERTIME' ? 'bg-amber-100 text-amber-700' :
                                                        req.type === 'CARDLESS_ENTRY' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {req.type_label}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 font-medium">{req.date}</td>
                                        <td className="py-2.5 px-3 text-slate-700">{req.summary}</td>
                                        <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold
                                                ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {req.status === 'APPROVED' ? 'Onaylandı' : req.status === 'REJECTED' ? 'Reddedildi' : 'Bekliyor'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


// =========== MAIN COMPONENT ===========
const Requests = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('my_requests');
    const [loading, setLoading] = useState(true);

    const [requests, setRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);

    const [subordinates, setSubordinates] = useState([]);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);

    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME') || hasPermission('APPROVAL_CARDLESS_ENTRY') || hasPermission('APPROVAL_EXTERNAL_TASK');

    useEffect(() => {
        if (isManager) {
            fetchSubordinates();
        }
    }, [isManager]);

    const fetchSubordinates = async () => {
        try {
            const res = await api.get('/employees/subordinates/');
            setSubordinates(res.data);
        } catch (error) {
            console.error('Error fetching subordinates:', error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useSmartPolling(() => {
        if (!loading && !showCreateModal && !showEditOvertimeModal) {
            fetchData();
        }
    }, 30000);

    const fetchData = async () => {
        try {
            const calls = [
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
            ];
            if (isManager) {
                calls.push(api.get('/team-requests/'));
            }

            const results = await Promise.all(calls);
            setRequests(results[0].data.results || results[0].data);
            setRequestTypes(results[1].data.results || results[1].data);
            setOvertimeRequests(results[2].data.results || results[2].data);
            setMealRequests(results[3].data.results || results[3].data);
            setCardlessEntryRequests(results[4].data.results || results[4].data);
            if (results[5]) {
                setIncomingRequests(results[5].data || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamHistory = async () => {
        try {
            const res = await api.get('/leave/requests/team_history/');
            setTeamHistoryRequests(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching team history:', error);
        }
    };

    // --- Handlers ---
    const handleCreateSuccess = () => { fetchData(); };

    const handleEditOvertimeClick = (req) => {
        setEditOvertimeForm({ id: req.id, start_time: req.start_time, end_time: req.end_time, reason: req.reason });
        setShowEditOvertimeModal(true);
    };

    const handleResubmitOvertime = (req) => {
        setCreateModalInitialData({ type: 'OVERTIME', data: req });
        setShowCreateModal(true);
    };

    const handleViewDetails = (request, type) => {
        setSelectedRequest(request);
        setSelectedRequestType(type);
        setShowDetailModal(true);
    };

    const handleEditOvertimeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/overtime-requests/${editOvertimeForm.id}/`, {
                start_time: editOvertimeForm.start_time,
                end_time: editOvertimeForm.end_time,
                reason: editOvertimeForm.reason
            });
            setShowEditOvertimeModal(false);
            fetchData();
        } catch (error) {
            console.error('Error updating overtime request:', error);
            alert('Güncelleme sırasında hata oluştu.');
        }
    };

    const handleDeleteRequest = async (req, type) => {
        if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
        try {
            if (type === 'LEAVE') await api.delete(`/leave/requests/${req.id}/`);
            else if (type === 'OVERTIME') await api.delete(`/overtime-requests/${req.id}/`);
            else if (type === 'MEAL') await api.delete(`/meal-requests/${req.id}/`);
            else if (type === 'CARDLESS_ENTRY') await api.delete(`/cardless-entry-requests/${req.id}/`);
            fetchData();
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Silme işlemi başarısız oldu.');
        }
    };

    const handleApprove = async (req, notes = '') => {
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/approve/`;

            if (url) {
                await api.post(url, { action: 'approve', notes: notes || 'Onaylandı' });
                fetchData();
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Onaylama işlemi başarısız oldu.');
        }
    };

    const handleReject = async (req, reason) => {
        if (reason === null) return;
        if (!reason) { alert('Red sebebi girmelisiniz.'); return; }

        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/reject/`;

            if (url) {
                await api.post(url, { action: 'reject', reason });
                fetchData();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Reddetme işlemi başarısız oldu.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1"><CheckCircle2 size={12} /> Onaylandı</span>;
            case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200 gap-1"><XCircle size={12} /> Reddedildi</span>;
            case 'PENDING': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 gap-1"><Clock size={12} /> Bekliyor</span>;
            case 'POTENTIAL': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 gap-1"><AlertCircle size={12} /> Taslak</span>;
            case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 gap-1"><XCircle size={12} /> İptal Edildi</span>;
            case 'DELIVERED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 gap-1"><CheckCircle2 size={12} /> Teslim Edildi</span>;
            default: return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
        }
    };

    const pendingCount = incomingRequests.filter(r => r.level === 'direct').length;

    const mainTabs = [
        { id: 'my_requests', label: 'Taleplerim', icon: <FileText size={16} />, show: true },
        { id: 'team_requests', label: 'Ekip Talepleri', icon: <Users size={16} />, badge: pendingCount, show: isManager },
        { id: 'analytics', label: 'Talep Analizi', icon: <BarChart3 size={16} />, show: true },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Talepler</h1>
                    <p className="text-slate-500 mt-1">İzin, mesai, yemek ve kartsız giriş taleplerinizi yönetin.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Yeni Talep
                </button>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-4 z-30 backdrop-blur-xl bg-white/80">
                <div className="flex p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
                    {mainTabs.filter(t => t.show).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold animate-pulse
                                    ${activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-red-500 text-white'}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
                {activeTab === 'my_requests' && (
                    <MyRequestsSection
                        requests={requests}
                        overtimeRequests={overtimeRequests}
                        mealRequests={mealRequests}
                        cardlessEntryRequests={cardlessEntryRequests}
                        requestTypes={requestTypes}
                        loading={loading}
                        getStatusBadge={getStatusBadge}
                        handleDeleteRequest={handleDeleteRequest}
                        handleEditOvertimeClick={handleEditOvertimeClick}
                        handleResubmitOvertime={handleResubmitOvertime}
                        handleViewDetails={handleViewDetails}
                        setShowCreateModal={setShowCreateModal}
                    />
                )}

                {activeTab === 'team_requests' && (
                    <TeamRequestsSection
                        incomingRequests={incomingRequests}
                        teamHistoryRequests={teamHistoryRequests}
                        subordinates={subordinates}
                        loading={loading}
                        getStatusBadge={getStatusBadge}
                        handleApprove={handleApprove}
                        handleReject={handleReject}
                        handleViewDetails={handleViewDetails}
                        fetchTeamHistory={fetchTeamHistory}
                    />
                )}

                {activeTab === 'analytics' && (
                    <RequestAnalyticsSection
                        subordinates={subordinates}
                        loading={loading}
                    />
                )}
            </div>

            {/* Modals */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
            />

            {/* Edit Overtime Modal */}
            {showEditOvertimeModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Mesai Talebini Düzenle</h3>
                            <button onClick={() => setShowEditOvertimeModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleEditOvertimeSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Saati</label>
                                    <input required type="time" value={editOvertimeForm.start_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, start_time: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Saati</label>
                                    <input required type="time" value={editOvertimeForm.end_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, end_time: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea required rows="3" value={editOvertimeForm.reason} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, reason: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowEditOvertimeModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Request Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                    setSelectedRequestType(null);
                }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={fetchData}
            />
        </div>
    );
};

export default Requests;
