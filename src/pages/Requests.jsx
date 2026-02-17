import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus, Filter, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Clock, Calendar, Utensils,
    CheckCircle2, XCircle, AlertCircle, Users, CreditCard, ChevronRight, ChevronDown, User,
    BarChart3, PieChart, TrendingUp, FileText, Briefcase, ArrowRight, Layers, GitBranch, MoreHorizontal,
    ArrowRightLeft, Shield
} from 'lucide-react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import RequestListTable from '../components/RequestListTable';
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
    const [showPotential, setShowPotential] = useState(true);

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
            if (!showPotential && r.status === 'POTENTIAL') return false;
            return true;
        });
    }, [allMyRequests, typeFilter, statusFilter, showPotential]);

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

                    <div className="h-8 w-px bg-slate-200 mx-1 self-center hidden sm:block"></div>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50 hover:text-slate-700 transition-colors select-none">
                        <input
                            type="checkbox"
                            checked={showPotential}
                            onChange={(e) => setShowPotential(e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        Potansiyel Talepler
                    </label>
                </div>
            </div>

            {/* Request Grid replaced by List Table */}
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <RequestListTable
                        requests={filtered}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEditOvertimeClick}
                        onDelete={handleDeleteRequest}
                        showEmployeeColumn={false}
                    />
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
    // Basic Filters
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, POTENTIAL, APPROVED, REJECTED
    const [employeeFilter, setEmployeeFilter] = useState('ALL');

    // Fetch history on mount to allow full list view
    useEffect(() => {
        fetchTeamHistory();
    }, []);

    const allRequests = useMemo(() => {
        // Normalize Incoming Requests (Pending / Potential)
        const incoming = incomingRequests.map(r => ({
            ...r,
            employee_name: r.employee_detail?.full_name || r.employee?.name || r.employee?.first_name + ' ' + r.employee?.last_name,
            employee_department: r.employee_detail?.department_name || r.employee?.department?.name || '',
            employee_avatar: r.employee_detail?.avatar || r.employee?.avatar,
            start_date: r.start_date || r.date || r.created_at,
            // Ensure type is consistent
            type: r.type || (r.leave_type_name ? 'LEAVE' : 'UNKNOWN'),
            // Normalize status for table compatibility if needed
        }));

        // Normalize History Requests (Approved / Rejected)
        const history = teamHistoryRequests.map(r => ({
            ...r,
            employee_name: r.employee_detail?.full_name || r.employee?.first_name + ' ' + r.employee?.last_name,
            employee_department: r.employee_detail?.department_name || '',
            employee_avatar: r.employee_detail?.avatar,
            start_date: r.start_date || r.date || r.created_at,
            type: r.type || (r.leave_type_name ? 'LEAVE' : 'UNKNOWN'),
        }));

        // Combine and dedup by ID just in case
        const combined = [...incoming];
        const incomingIds = new Set(incoming.map(i => i.id));
        history.forEach(h => {
            if (!incomingIds.has(h.id)) combined.push(h);
        });

        return combined.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    }, [incomingRequests, teamHistoryRequests]);

    const filteredRequests = useMemo(() => {
        return allRequests.filter(req => {
            // Search
            if (searchText) {
                const searchLower = searchText.toLowerCase();
                const nameMatch = req.employee_name?.toLowerCase().includes(searchLower);
                if (!nameMatch) return false;
            }

            // Employee Filter
            if (employeeFilter !== 'ALL' && req.employee?.id !== parseInt(employeeFilter)) return false;

            // Type Filter
            if (typeFilter !== 'ALL' && req.type !== typeFilter) return false;

            // Status Filter
            // Status Filter
            if (statusFilter === 'ALL') {
                if (req.status === 'POTENTIAL') return false; // Hide potential by default
            } else if (statusFilter === 'POTENTIAL') {
                if (req.status !== 'POTENTIAL') return false;
            } else if (statusFilter !== 'ALL' && req.status !== statusFilter) {
                return false;
            }

            return true;
        });
    }, [allRequests, searchText, employeeFilter, typeFilter, statusFilter]);

    const counts = useMemo(() => ({
        all: allRequests.length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
        potential: allRequests.filter(r => r.status === 'POTENTIAL').length,
        approved: allRequests.filter(r => r.status === 'APPROVED').length,
        rejected: allRequests.filter(r => r.status === 'REJECTED').length,
    }), [allRequests]);

    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">

                {/* Left: Search & Employee Select */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="İsim ile ara..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <select
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="ALL">Tüm Ekip</option>
                        {subordinates.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.first_name} {sub.last_name}</option>
                        ))}
                    </select>
                </div>

                {/* Right: Type & Status Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['ALL', 'LEAVE', 'OVERTIME', 'MEAL', 'CARDLESS_ENTRY'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {t === 'ALL' ? 'Tümü' : t === 'LEAVE' ? 'İzin' : t === 'OVERTIME' ? 'Mesai' : t === 'MEAL' ? 'Yemek' : 'Kartsız'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    <div className="flex gap-2">
                        <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Hepsi" color="slate" />
                        <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Bekleyen" count={counts.pending} color="amber" />
                        <FilterChip active={statusFilter === 'POTENTIAL'} onClick={() => setStatusFilter('POTENTIAL')} label="Potansiyel" count={counts.potential} color="purple" icon={<AlertCircle size={14} />} />
                        <FilterChip active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} label="Onaylı" count={counts.approved} color="emerald" />
                        <FilterChip active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} label="Red" count={counts.rejected} color="red" />
                    </div>
                </div>
            </div>

            {/* List Table */}
            <RequestListTable
                requests={filteredRequests}
                onViewDetails={handleViewDetails}
                onApprove={handleApprove}
                onReject={handleReject}
            />
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
            } catch (err) {
                console.error("Analytics error:", err);
                setData(null);
            } finally {
                setFetching(false);
            }
        };
        fetchAnalytics();
    }, [selectedEmployee]);

    if (loading || fetching) return <div className="space-y-6 animate-pulse"><div className="h-64 bg-slate-100 rounded-3xl" /></div>;

    if (!data) return <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <PieChart size={48} className="mb-4 opacity-20" />
        <p>Analiz verisi oluşturulamadı veya henüz veri yok.</p>
    </div>;

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

// =========== SECTION: Substitute Requests ===========
const SubstituteRequestsSection = ({
    substituteData, loading, handleSubstituteApprove, handleSubstituteReject, handleViewDetails
}) => {
    const [typeFilter, setTypeFilter] = useState('ALL');

    const allRequests = useMemo(() => {
        if (!substituteData) return [];
        const items = [];
        (substituteData.leave_requests || []).forEach(r => items.push({
            ...r,
            _type: 'LEAVE',
            type: 'LEAVE',
            _sortDate: r.start_date || r.created_at,
            _isSubstitute: true,
        }));
        (substituteData.overtime_requests || []).forEach(r => items.push({
            ...r,
            _type: 'OVERTIME',
            type: 'OVERTIME',
            _sortDate: r.date || r.created_at,
            _isSubstitute: true,
        }));
        items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
        return items;
    }, [substituteData]);

    const filtered = useMemo(() => {
        if (typeFilter === 'ALL') return allRequests;
        return allRequests.filter(r => r._type === typeFilter);
    }, [allRequests, typeFilter]);

    const authorities = substituteData?.authorities || [];

    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    return (
        <div className="space-y-6">
            {/* Active Authorities Info */}
            {authorities.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600" />
                        Aktif Vekalet Yetkileri
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {authorities.map(auth => (
                            <div key={auth.id} className="bg-white rounded-xl px-4 py-2 border border-blue-100 shadow-sm flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                    {(auth.principal_name || '?')[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{auth.principal_name}</p>
                                    <p className="text-[10px] text-slate-500">
                                        {new Date(auth.valid_from).toLocaleDateString('tr-TR')} — {new Date(auth.valid_to).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 items-center">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['ALL', 'LEAVE', 'OVERTIME'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                                typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t === 'ALL' ? 'Tümü' : t === 'LEAVE' ? 'İzin' : 'Mesai'}
                        </button>
                    ))}
                </div>
                <span className="text-sm text-slate-500 ml-2">
                    {allRequests.length} bekleyen talep
                </span>
            </div>

            {/* Request List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <ArrowRightLeft size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Bekleyen Vekalet Talebi Yok</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                        Vekil olarak onaylayabileceğiniz bekleyen talep bulunmamaktadır.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(req => {
                        const principal = authorities.find(a => a.principal === req.principal_id);
                        return (
                            <div
                                key={`${req.type}-${req.id}`}
                                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                            req.type === 'LEAVE' ? 'bg-blue-500' : 'bg-amber-500'
                                        }`}>
                                            {req.type === 'LEAVE' ? <Calendar size={20} /> : <Clock size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-800">{req.employee_name}</h4>
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                                                    <ArrowRightLeft size={10} />
                                                    Vekalet
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                                    req.type === 'LEAVE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {req.type === 'LEAVE' ? 'İzin' : 'Fazla Mesai'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {req.type === 'LEAVE' ? (
                                                    <>
                                                        {req.request_type} — {new Date(req.start_date).toLocaleDateString('tr-TR')} → {new Date(req.end_date).toLocaleDateString('tr-TR')}
                                                        {req.total_days && <span className="ml-2 font-bold text-slate-700">({req.total_days} gün)</span>}
                                                    </>
                                                ) : (
                                                    <>
                                                        {new Date(req.date).toLocaleDateString('tr-TR')}
                                                        {req.duration_minutes > 0 && <span className="ml-2 font-bold text-slate-700">({req.duration_minutes} dk)</span>}
                                                    </>
                                                )}
                                            </div>
                                            {req.reason && (
                                                <p className="text-xs text-slate-400 mt-1 truncate max-w-md">{req.reason}</p>
                                            )}
                                            {principal && (
                                                <p className="text-xs text-purple-600 mt-1 font-medium">
                                                    {principal.principal_name} adına vekil olarak
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleSubstituteApprove(req)}
                                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 size={16} />
                                            Onayla
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Red gerekçesi giriniz:');
                                                if (reason) handleSubstituteReject(req, reason);
                                            }}
                                            className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-50 transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <XCircle size={16} />
                                            Reddet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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

    // Substitute Data
    const [substituteData, setSubstituteData] = useState(null);
    const [substituteLoading, setSubstituteLoading] = useState(false);

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [subordinateIds, setSubordinateIds] = useState(new Set());
    const [directSubordinateIds, setDirectSubordinateIds] = useState(new Set());
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);

    const [createModalInitialData, setCreateModalInitialData] = useState(null);

    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME') || subordinates.length > 0;

    useSmartPolling(() => {
        if (!loading && !showCreateModal && !showEditOvertimeModal) fetchData();
    }, 30000);

    useEffect(() => {
        fetchData();
        fetchMe();
        fetchSubstituteRequests();
    }, []);

    useEffect(() => {
        if (isManager) fetchSubordinates();
    }, [isManager]); // Fetch when permission detected

    // Calculate Direct Subordinates
    useEffect(() => {
        if (subordinates.length > 0 && currentUserEmployeeId) {
            const directIds = new Set(
                subordinates.filter(sub => {
                    // Check reports_to (direct ID on model)
                    if (sub.reports_to === currentUserEmployeeId) return true;
                    // Check primary_managers list (from serializer)
                    if (sub.primary_managers && sub.primary_managers.some(m => m.id === currentUserEmployeeId)) return true;
                    return false;
                }).map(s => s.id)
            );
            setDirectSubordinateIds(directIds);
        }
    }, [subordinates, currentUserEmployeeId]);


    const fetchMe = async () => {
        try {
            const res = await api.get('/employees/me/');
            setCurrentUserEmployeeId(res.data.id);
        } catch (e) { console.error("Error fetching me:", e); }
    };

    const fetchSubordinates = async () => {
        try {
            const res = await api.get('/employees/subordinates/');
            setSubordinates(res.data);
            setSubordinateIds(new Set(res.data.map(e => e.id)));
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        // setLoading(true); // Don't full reset loading on poll, only on mount? 
        // Logic handled by caller or rely on smart polling not causing flicker.
        try {
            const calls = [
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
            ];

            // Try fetching team requests (soft fail)
            const teamCalls = [
                api.get('/team-requests/').catch(() => ({ data: [] })),
                api.get('/leave/requests/team_history/').catch(() => ({ data: { results: [] } }))
            ];

            const [
                myRequestsRes, leaveTypesRes, overtimeRes, mealRes, cardlessRes
            ] = await Promise.all(calls);

            // Separate await for team to not block my requests? No, Promise.all is fine.
            // Actually, let's just add them to Promise.all but handle individually?
            // Simplified:

            const [incomingRes, historyRes] = await Promise.all(teamCalls);

            setRequests(myRequestsRes.data.results || myRequestsRes.data);
            setRequestTypes(leaveTypesRes.data.results || leaveTypesRes.data);
            setOvertimeRequests(overtimeRes.data.results || overtimeRes.data);
            setMealRequests(mealRes.data.results || mealRes.data);
            setCardlessEntryRequests(cardlessRes.data.results || cardlessRes.data);

            setIncomingRequests(incomingRes.data || []);
            setTeamHistoryRequests(historyRes.data.results || historyRes.data || []);

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchTeamHistory = async () => {
        try {
            const res = await api.get('/leave/requests/team_history/');
            setTeamHistoryRequests(res.data.results || res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSubstituteRequests = async () => {
        setSubstituteLoading(true);
        try {
            const res = await api.get('/substitute-authority/pending_requests/');
            setSubstituteData(res.data);
        } catch (e) {
            // Not a substitute — ignore silently
            setSubstituteData(null);
        } finally {
            setSubstituteLoading(false);
        }
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

    const handleSubstituteApprove = async (req) => {
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            if (!url) return;

            await api.post(url, {
                action: 'approve',
                notes: 'Vekil olarak onaylandı',
                acting_as_substitute_for: req.principal_id
            });
            fetchData();
            fetchSubstituteRequests();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleSubstituteReject = async (req, reason) => {
        if (!reason) return;
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            if (!url) return;

            await api.post(url, {
                action: 'reject',
                reason,
                acting_as_substitute_for: req.principal_id
            });
            fetchData();
            fetchSubstituteRequests();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
        }
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

    // --- Filtering Logic for New Tabs ---
    const getDirectRequests = () => {
        // Incoming: check 'level' field
        const directIncoming = incomingRequests.filter(r => r.level === 'direct');
        // History: check 'employee.id' against directSubordinateIds
        const directHistory = teamHistoryRequests.filter(r => r.employee && (r.employee.id === undefined ? directSubordinateIds.has(r.employee) : directSubordinateIds.has(r.employee.id)));
        return { incoming: directIncoming, history: directHistory };
    };

    const getIndirectRequests = () => {
        // Incoming: check 'level' field
        const indirectIncoming = incomingRequests.filter(r => r.level === 'indirect');
        // History: check 'employee.id' NOT in directSubordinateIds
        const indirectHistory = teamHistoryRequests.filter(r => r.employee && (r.employee.id === undefined ? !directSubordinateIds.has(r.employee) : !directSubordinateIds.has(r.employee.id)));
        return { incoming: indirectIncoming, history: indirectHistory };
    };

    const directData = getDirectRequests();
    const indirectData = getIndirectRequests();
    const substituteRequestCount = (substituteData?.leave_requests?.length || 0) + (substituteData?.overtime_requests?.length || 0);
    const hasSubstitute = substituteData && (substituteData.authorities?.length > 0 || substituteRequestCount > 0);

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
                    <>
                        <TabButton
                            active={activeTab === 'direct_requests'}
                            onClick={() => setActiveTab('direct_requests')}
                            icon={<User size={18} />}
                            badge={directData.incoming.length}
                        >
                            Doğrudan Talepler
                        </TabButton>

                        <TabButton
                            active={activeTab === 'team_requests'}
                            onClick={() => setActiveTab('team_requests')}
                            icon={<Users size={18} />}
                            badge={indirectData.incoming.length}
                        >
                            Ekip Talepleri
                        </TabButton>
                    </>
                )}

                {hasSubstitute && (
                    <TabButton
                        active={activeTab === 'substitute_requests'}
                        onClick={() => setActiveTab('substitute_requests')}
                        icon={<ArrowRightLeft size={18} />}
                        badge={substituteRequestCount}
                    >
                        Vekalet Talepleri
                    </TabButton>
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
                {activeTab === 'direct_requests' && (
                    <TeamRequestsSection
                        incomingRequests={directData.incoming}
                        teamHistoryRequests={directData.history}
                        subordinates={subordinates}
                        loading={loading}
                        getStatusBadge={getStatusBadge}
                        handleApprove={handleApprove}
                        handleReject={handleReject}
                        handleViewDetails={handleViewDetails}
                        fetchTeamHistory={fetchTeamHistory}
                    />
                )}
                {activeTab === 'team_requests' && (
                    <TeamRequestsSection
                        incomingRequests={indirectData.incoming}
                        teamHistoryRequests={indirectData.history}
                        subordinates={subordinates}
                        loading={loading}
                        getStatusBadge={getStatusBadge}
                        handleApprove={handleApprove}
                        handleReject={handleReject}
                        handleViewDetails={handleViewDetails}
                        fetchTeamHistory={fetchTeamHistory}
                    />
                )}
                {activeTab === 'substitute_requests' && (
                    <SubstituteRequestsSection
                        substituteData={substituteData}
                        loading={substituteLoading}
                        handleSubstituteApprove={handleSubstituteApprove}
                        handleSubstituteReject={handleSubstituteReject}
                        handleViewDetails={handleViewDetails}
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
