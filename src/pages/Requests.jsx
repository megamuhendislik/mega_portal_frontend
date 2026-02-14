import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus, Filter, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Clock, Calendar, Utensils,
    CheckCircle2, XCircle, AlertCircle, Users, CreditCard, ChevronRight, ChevronDown, User,
    BarChart3, PieChart, TrendingUp, FileText, Briefcase, ArrowRight, Layers, GitBranch, MoreHorizontal
} from 'lucide-react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestDetailModal from '../components/RequestDetailModal';

import useSmartPolling from '../hooks/useSmartPolling';
import { useAuth } from '../context/AuthContext';

// =========== PREMIUM UI COMPONENTS ===========

const TabButton = ({ active, onClick, children, badge, icon }) => (
    <button
        onClick={onClick}
        className={`relative px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 outline-none
            ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
        `}
    >
        {icon && <span className={active ? 'text-blue-500' : 'text-slate-400'}>{icon}</span>}
        {children}
        {badge > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold
                ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {badge}
            </span>
        )}
        {active && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
        )}
    </button>
);

const FilterChip = ({ active, onClick, label, icon, count, color = 'blue' }) => {
    const activeClass = `bg-${color}-50 text-${color}-700 ring-1 ring-${color}-200 shadow-sm`;
    const inactiveClass = "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50";

    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-200 outline-none ${active ? activeClass : inactiveClass}`}
        >
            {icon && <span className={active ? `text-${color}-600` : 'text-slate-400'}>{icon}</span>}
            {label}
            {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/60' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                </span>
            )}
        </button>
    );
};

const StatCard = ({ label, value, icon, color, trend }) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10 text-opacity-100`}>
                <div className={color.replace('bg-', 'text-').replace('/10', '')}>{icon}</div>
            </div>
        </div>
        {trend && (
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp size={12} />
                <span>{trend}</span>
            </div>
        )}
    </div>
);

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

    return (
        <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="İzin" value={counts.leave} icon={<Calendar size={20} />} color="bg-blue-500" />
                <StatCard label="Fazla Mesai" value={counts.overtime} icon={<Clock size={20} />} color="bg-amber-500" />
                <StatCard label="Yemek" value={counts.meal} icon={<Utensils size={20} />} color="bg-emerald-500" />
                <StatCard label="Kartsız Giriş" value={counts.cardless} icon={<CreditCard size={20} />} color="bg-purple-500" />
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} label="Tümü" count={counts.all} color="slate" />
                    <FilterChip active={typeFilter === 'LEAVE'} onClick={() => setTypeFilter('LEAVE')} label="İzin" icon={<Calendar size={14} />} count={counts.leave} color="blue" />
                    <FilterChip active={typeFilter === 'OVERTIME'} onClick={() => setTypeFilter('OVERTIME')} label="Mesai" icon={<Clock size={14} />} count={counts.overtime} color="amber" />
                    <FilterChip active={typeFilter === 'MEAL'} onClick={() => setTypeFilter('MEAL')} label="Yemek" icon={<Utensils size={14} />} count={counts.meal} color="emerald" />
                    <FilterChip active={typeFilter === 'CARDLESS_ENTRY'} onClick={() => setTypeFilter('CARDLESS_ENTRY')} label="Kartsız" icon={<CreditCard size={14} />} count={counts.cardless} color="purple" />
                </div>

                <div className="flex gap-2">
                    <div className="h-8 w-px bg-slate-200 mx-1 self-center hidden sm:block"></div>
                    <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Tümü" color="slate" />
                    <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Bekleyen" count={counts.pending} color="amber" />
                    <FilterChip active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} label="Onaylı" count={counts.approved} color="emerald" />
                    <FilterChip active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} label="Red" count={counts.rejected} color="red" />
                </div>
            </div>

            {/* Request Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                        <Search size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Talep Bulunamadı</h3>
                    <p className="text-slate-500 max-w-sm mt-2 text-sm leading-relaxed">Seçili kriterlere uygun herhangi bir talep kaydı bulunmamaktadır. Yeni bir talep oluşturarak başlayabilirsiniz.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-8 px-6 py-3 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Yeni Talep Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
    const [expandedGroups, setExpandedGroups] = useState({});

    // Group indirect requests
    const directRequests = useMemo(() => incomingRequests.filter(r => r.level === 'direct'), [incomingRequests]);
    const indirectRequests = useMemo(() => incomingRequests.filter(r => r.level === 'indirect'), [incomingRequests]);

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

    useEffect(() => {
        if (subTab === 'history') fetchTeamHistory();
    }, [subTab]);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    const renderEmptyState = (title, desc, icon) => (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-slate-500 mt-2 text-sm max-w-xs">{desc}</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Sub Navigation */}
            <div className="flex justify-center">
                <div className="bg-slate-100/50 p-1 rounded-xl inline-flex">
                    {[
                        { id: 'direct', label: 'Bana Gelenler', count: directRequests.length },
                        { id: 'indirect', label: 'Alt Kademe', count: indirectRequests.length },
                        { id: 'history', label: 'Geçmiş', count: 0 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                                  ${subTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                              `}
                        >
                            {tab.label}
                            {tab.count > 0 && tab.id !== 'history' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${subTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Direct Requests */}
            {subTab === 'direct' && (
                directRequests.length === 0 ? renderEmptyState('Bekleyen Talep Yok', 'Şu an onayınızı bekleyen doğrudan bir talep bulunmuyor.', <CheckCircle2 size={32} className="text-emerald-500" />) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                        {directRequests.map(req => (
                            <RequestCard
                                key={req.uniqueId || req.id}
                                request={{
                                    ...req,
                                    leave_type_name: req.request_type_detail?.name || req.details?.type_name,
                                    employee_name: req.employee_detail?.full_name || req.employee?.name
                                }}
                                type={req.type}
                                isIncoming={true}
                                statusBadge={getStatusBadge}
                                onApprove={(id, notes) => handleApprove(req, notes)}
                                onReject={(id, reason) => handleReject(req, reason)}
                                onViewDetails={handleViewDetails}
                            />
                        ))}
                    </div>
                )
            )}

            {/* Indirect Requests */}
            {subTab === 'indirect' && (
                Object.keys(groupedIndirect).length === 0 ? renderEmptyState('Alt Kademe Temiz', 'Alt ekiplerinizde bekleyen talep bulunmuyor.', <GitBranch size={32} className="text-blue-500" />) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        {Object.entries(groupedIndirect).map(([key, group]) => {
                            const isExpanded = expandedGroups[key] !== false;
                            return (
                                <div key={key} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <button
                                        onClick={() => toggleGroup(key)}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                                <User size={18} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-bold text-slate-800">{group.label}</h4>
                                                <p className="text-xs text-slate-500 font-medium">{group.requests.length} Bekleyen Talep</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                {group.requests.slice(0, 3).map((r, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                        {r.employee?.name?.charAt(0)}
                                                    </div>
                                                ))}
                                                {group.requests.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        +{group.requests.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/30 border-t border-slate-50">
                                            {group.requests.map(req => (
                                                <RequestCard
                                                    key={req.id}
                                                    request={{ ...req, employee_name: req.employee?.name }}
                                                    type={req.type}
                                                    isIncoming={true}
                                                    statusBadge={getStatusBadge}
                                                    onViewDetails={handleViewDetails}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* History */}
            {subTab === 'history' && (
                teamHistoryRequests.length === 0 ? renderEmptyState('Geçmiş Kayıt Yok', 'Henüz geçmişe dönük bir talep kaydı bulunmamaktadır.', <FileText size={32} className="text-slate-400" />) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                        {teamHistoryRequests.map(req => (
                            <RequestCard
                                key={req.id}
                                request={{
                                    ...req,
                                    leave_type_name: req.request_type_detail?.name,
                                    employee_name: req.employee_detail?.full_name
                                }}
                                type={req.type} // Fix styling for history items
                                isIncoming={true}
                                statusBadge={getStatusBadge}
                                onViewDetails={handleViewDetails}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

// =========== SECTION: Analytics ===========
const RequestAnalyticsSection = ({ subordinates, loading }) => {
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
            } finally {
                setFetching(false);
            }
        };
        fetchAnalytics();
    }, [selectedEmployee]);

    if (loading || fetching || !data) return <div className="space-y-6 animate-pulse"><div className="h-64 bg-slate-100 rounded-3xl" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User size={20} /></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Çalışan Analizi</h3>
                        <p className="text-xs text-slate-500">Talep istatistiklerini görüntüle</p>
                    </div>
                </div>
                <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                    <option value="">Kendim</option>
                    {subordinates.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam', val: data.total_requests, color: 'bg-slate-800' },
                    { label: 'Bekleyen', val: data.status_distribution.find(s => s.status === 'Bekleyen')?.count || 0, color: 'bg-amber-500' },
                    { label: 'Onaylanan', val: data.status_distribution.find(s => s.status === 'Onaylanan')?.count || 0, color: 'bg-emerald-500' },
                    { label: 'Reddedilen', val: data.status_distribution.find(s => s.status === 'Reddedilen')?.count || 0, color: 'bg-red-500' },
                ].map((k, i) => (
                    <div key={i} className={`${k.color} text-white p-5 rounded-2xl shadow-lg shadow-${k.color.replace('bg-', '')}/20 relative overflow-hidden`}>
                        <p className="opacity-80 text-xs font-bold uppercase tracking-wider mb-1">{k.label}</p>
                        <h3 className="text-3xl font-bold">{k.val}</h3>
                        <div className="absolute -right-4 -bottom-4 opacity-10 scale-150"><BarChart3 size={64} /></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Aylık Trend</h4>
                    <div className="flex items-end gap-3 h-48 pt-4">
                        {data.monthly_trend.map((m, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                                <div className="w-full bg-blue-50 rounded-t-xl relative h-full overflow-hidden transition-all duration-500 group-hover:bg-blue-100">
                                    <div
                                        className="absolute bottom-0 w-full bg-blue-500 rounded-t-xl transition-all duration-700"
                                        style={{ height: `${Math.min((m.total / Math.max(...data.monthly_trend.map(x => x.total), 1)) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 truncate w-full text-center">{m.label.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent List */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={18} className="text-purple-500" /> Son Aktiviteler</h4>
                    <div className="space-y-4">
                        {data.recent_requests.slice(0, 5).map((req, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0
                                        ${req.type === 'LEAVE' ? 'bg-blue-500' : req.type === 'OVERTIME' ? 'bg-amber-500' : 'bg-purple-500'}
                                    `}>
                                    {req.type_label[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-700 truncate">{req.type_label}</p>
                                    <p className="text-xs text-slate-400 truncate">{req.summary}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold
                                         ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                                    `}>
                                    {req.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// =========== MAIN PAGE ===========
const Requests = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('my_requests');
    const [loading, setLoading] = useState(true);

    // Data States
    const [requests, setRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);

    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME');

    useSmartPolling(() => {
        if (!loading && !showCreateModal && !showEditOvertimeModal) fetchData();
    }, 30000);

    useEffect(() => {
        fetchData();
        if (isManager) fetchSubordinates();
    }, []);

    const fetchSubordinates = async () => {
        try {
            const res = await api.get('/employees/subordinates/');
            setSubordinates(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        try {
            const calls = [
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
            ];
            if (isManager) calls.push(api.get('/team-requests/'));

            const results = await Promise.all(calls);
            setRequests(results[0].data.results || results[0].data);
            setRequestTypes(results[1].data.results || results[1].data);
            setOvertimeRequests(results[2].data.results || results[2].data);
            setMealRequests(results[3].data.results || results[3].data);
            setCardlessEntryRequests(results[4].data.results || results[4].data);
            if (results[5]) setIncomingRequests(results[5].data || []);

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchTeamHistory = async () => {
        try {
            const res = await api.get('/leave/requests/team_history/');
            setTeamHistoryRequests(res.data.results || res.data);
        } catch (e) { console.error(e); }
    };

    // --- Handlers (Simplified for brevity, logic same as before) ---
    const handleCreateSuccess = () => fetchData();
    const handleViewDetails = (r, t) => { setSelectedRequest(r); setSelectedRequestType(t); setShowDetailModal(true); };
    const handleEditOvertimeClick = (r) => { setEditOvertimeForm({ id: r.id, start_time: r.start_time, end_time: r.end_time, reason: r.reason }); setShowEditOvertimeModal(true); };
    const handleResubmitOvertime = (r) => { setCreateModalInitialData({ type: 'OVERTIME', data: r }); setShowCreateModal(true); };

    // CRUD Handlers
    const handleDeleteRequest = async (r, t) => {
        if (!window.confirm('Emin misiniz?')) return;
        try {
            if (t === 'LEAVE') await api.delete(`/leave/requests/${r.id}/`);
            else if (t === 'OVERTIME') await api.delete(`/overtime-requests/${r.id}/`);
            else if (t === 'MEAL') await api.delete(`/meal-requests/${r.id}/`);
            else if (t === 'CARDLESS_ENTRY') await api.delete(`/cardless-entry-requests/${r.id}/`);
            fetchData();
        } catch (e) { alert('Hata oluştu'); }
    };

    const handleApprove = async (req, notes) => {
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/approve/`;
            if (url) { await api.post(url, { action: 'approve', notes: notes || 'Onaylandı' }); fetchData(); }
        } catch (e) { alert('İşlem başarısız'); }
    };

    const handleReject = async (req, reason) => {
        if (!reason) return;
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/reject/`;
            if (url) { await api.post(url, { action: 'reject', reason }); fetchData(); }
        } catch (e) { alert('İşlem başarısız'); }
    };

    const handleEditOvertimeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/overtime-requests/${editOvertimeForm.id}/`, editOvertimeForm);
            setShowEditOvertimeModal(false);
            fetchData();
        } catch (e) { alert('Hata'); }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 size={12} /> Onay</span>;
            case 'REJECTED': return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 gap-1"><XCircle size={12} /> Red</span>;
            case 'PENDING': return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 gap-1"><Clock size={12} /> Bekliyor</span>;
            default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-bold">{status}</span>;
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taleplerim</h1>
                    <p className="text-slate-500 font-medium">Bütün izin, mesai ve diğer taleplerinizi tek yerden yönetin.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group bg-slate-900 hover:bg-black text-white px-7 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Yeni Talep Oluştur
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                <TabButton active={activeTab === 'my_requests'} onClick={() => setActiveTab('my_requests')} icon={<Layers size={18} />}>Taleplerim</TabButton>
                {isManager && (
                    <TabButton active={activeTab === 'team_requests'} onClick={() => setActiveTab('team_requests')} icon={<Users size={18} />} badge={incomingRequests.filter(r => r.level === 'direct').length}>Ekip Talepleri</TabButton>
                )}
                <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<PieChart size={18} />}>Analiz</TabButton>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
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
                    <RequestAnalyticsSection subordinates={subordinates} loading={loading} />
                )}
            </div>

            {/* Modals & Overlays */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
            />
            {showEditOvertimeModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">Mesai Düzenle</h3>
                        <form onSubmit={handleEditOvertimeSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="time" required value={editOvertimeForm.start_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, start_time: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" />
                                <input type="time" required value={editOvertimeForm.end_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, end_time: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" />
                            </div>
                            <textarea required rows="3" value={editOvertimeForm.reason} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, reason: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none resize-none" placeholder="Açıklama" />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowEditOvertimeModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">İptal</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={fetchData}
            />
        </div>
    );
};

export default Requests;
