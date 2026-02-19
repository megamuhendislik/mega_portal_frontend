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
    const [showPotential, setShowPotential] = useState(false);

    const allMyRequests = useMemo(() => {
        const items = [];
        requests.forEach(r => items.push({
            ...r,
            _type: 'LEAVE',
            type: 'LEAVE',
            _sortDate: r.start_date || r.created_at,
            leave_type_name: requestTypes.find(t => t.id === r.request_type)?.name,
        }));
        overtimeRequests.forEach(r => items.push({
            ...r,
            _type: 'OVERTIME',
            type: 'OVERTIME',
            _sortDate: r.date || r.created_at,
            onResubmit: () => handleResubmitOvertime(r),
        }));
        mealRequests.forEach(r => items.push({ ...r, _type: 'MEAL', type: 'MEAL', _sortDate: r.date || r.created_at }));
        cardlessEntryRequests.forEach(r => items.push({ ...r, _type: 'CARDLESS_ENTRY', type: 'CARDLESS_ENTRY', _sortDate: r.date || r.created_at }));
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

    const counts = useMemo(() => {
        // Exclude POTENTIAL from all counts — they are auto-detected, not actual requests
        const actual = allMyRequests.filter(r => r.status !== 'POTENTIAL');
        return {
            all: actual.length,
            leave: actual.filter(r => r._type === 'LEAVE').length,
            overtime: actual.filter(r => r._type === 'OVERTIME').length,
            meal: actual.filter(r => r._type === 'MEAL').length,
            cardless: actual.filter(r => r._type === 'CARDLESS_ENTRY').length,
            pending: actual.filter(r => r.status === 'PENDING').length,
            approved: actual.filter(r => r.status === 'APPROVED').length,
            rejected: actual.filter(r => r.status === 'REJECTED').length,
        };
    }, [allMyRequests]);

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

    if (loading || fetching) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 bg-slate-100 rounded-3xl" />
                <div className="h-72 bg-slate-100 rounded-3xl" />
            </div>
        </div>
    );

    if (!data) return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <PieChart size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Analiz verisi oluşturulamadı veya henüz veri yok.</p>
        </div>
    );

    const maxTrendTotal = Math.max(...data.monthly_trend.map(x => x.total), 1);
    const maxTrendOtHours = Math.max(...data.monthly_trend.map(x => x.overtime_hours || 0), 1);
    const statusLabels = { APPROVED: 'Onaylandı', REJECTED: 'Reddedildi', PENDING: 'Bekliyor' };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header: Employee Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">
                            {data.employee?.name || 'Talep Analizi'}
                        </h3>
                        <p className="text-xs text-slate-500">{data.employee?.department || 'Talep istatistiklerini görüntüle'}</p>
                    </div>
                </div>
                <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 outline-none min-w-[180px]"
                >
                    <option value="">Kendim</option>
                    {subordinates.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
            </div>

            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Toplam Talep</p>
                    <h3 className="text-3xl font-black">{data.total_requests}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Layers size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Onay Oranı</p>
                    <h3 className="text-3xl font-black">{data.approval_rate || 0}%</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><CheckCircle2 size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Fazla Mesai</p>
                    <h3 className="text-3xl font-black">{data.total_overtime_hours || 0}<span className="text-base ml-1 font-bold opacity-80">saat</span></h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Clock size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">İzin Günleri</p>
                    <h3 className="text-3xl font-black">{data.total_leave_days || 0}<span className="text-base ml-1 font-bold opacity-80">gün</span></h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><Calendar size={56} /></div>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">Bekleyen</p>
                    <h3 className="text-3xl font-black">{data.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0}</h3>
                    <div className="absolute -right-3 -bottom-3 opacity-10"><AlertCircle size={56} /></div>
                </div>
            </div>

            {/* Type Breakdown Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { key: 'leave', label: 'İzin', icon: <FileText size={18} />, color: 'blue' },
                    { key: 'overtime', label: 'Fazla Mesai', icon: <Clock size={18} />, color: 'amber' },
                    { key: 'meal', label: 'Yemek', icon: <Utensils size={18} />, color: 'emerald' },
                    { key: 'cardless', label: 'Kartsız Giriş', icon: <CreditCard size={18} />, color: 'purple' },
                ].map(({ key, label, icon, color }) => {
                    const s = data.summary?.[key] || {};
                    const total = s.total || 0;
                    const approved = s.approved || 0;
                    const rejected = s.rejected || 0;
                    const pending = s.pending || 0;
                    const pctApproved = total > 0 ? Math.round(approved / total * 100) : 0;
                    return (
                        <div key={key} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-50 text-${color}-600`}>
                                    {icon}
                                </div>
                                <span className="text-sm font-bold text-slate-700">{label}</span>
                                <span className="ml-auto text-xl font-black text-slate-800">{total}</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                {approved > 0 && <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${(approved / total) * 100}%` }} />}
                                {pending > 0 && <div className="h-full bg-amber-400" style={{ width: `${(pending / total) * 100}%` }} />}
                                {rejected > 0 && <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${(rejected / total) * 100}%` }} />}
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[11px] font-medium">
                                <span className="text-emerald-600">{approved} onay</span>
                                <span className="text-amber-600">{pending} bekleyen</span>
                                <span className="text-red-500">{rejected} red</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend — Stacked Bar */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" /> Aylık Talep Trendi
                    </h4>
                    <p className="text-xs text-slate-400 mb-5">Son 6 ayın talep dağılımı</p>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-4 text-[11px] font-medium">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-400 rounded" /> İzin</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded" /> Mesai</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-400 rounded" /> Yemek</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-400 rounded" /> Kartsız</span>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {data.monthly_trend.map((m, i) => {
                            const total = m.total || 0;
                            const barHeight = total > 0 ? (total / maxTrendTotal) * 100 : 2;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {total} talep
                                    </div>
                                    {/* Stacked bar */}
                                    <div className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse" style={{ height: `${barHeight}%`, minHeight: '4px' }}>
                                        {(m.leave || 0) > 0 && <div className="w-full bg-blue-400" style={{ height: `${(m.leave / total) * 100}%` }} />}
                                        {(m.overtime || 0) > 0 && <div className="w-full bg-amber-400" style={{ height: `${(m.overtime / total) * 100}%` }} />}
                                        {(m.meal || 0) > 0 && <div className="w-full bg-emerald-400" style={{ height: `${(m.meal / total) * 100}%` }} />}
                                        {(m.cardless || 0) > 0 && <div className="w-full bg-purple-400" style={{ height: `${(m.cardless / total) * 100}%` }} />}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700 truncate w-full text-center transition-colors">
                                        {m.label?.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Overtime Hours Trend */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" /> Aylık Fazla Mesai Saatleri
                    </h4>
                    <p className="text-xs text-slate-400 mb-5">Onaylanan fazla mesai saatleri (son 6 ay)</p>
                    <div className="flex items-end gap-3 h-48">
                        {data.monthly_trend.map((m, i) => {
                            const hours = m.overtime_hours || 0;
                            const barHeight = hours > 0 ? (hours / maxTrendOtHours) * 100 : 2;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {hours} saat
                                    </div>
                                    <div
                                        className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all duration-500 group-hover:from-amber-600 group-hover:to-amber-400"
                                        style={{ height: `${barHeight}%`, minHeight: '4px' }}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700 truncate w-full text-center transition-colors">
                                        {m.label?.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Type Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <PieChart size={18} className="text-blue-500" /> İzin Türü Dağılımı
                    </h4>
                    <p className="text-xs text-slate-400 mb-5">Onaylanan izinlerin türlere göre dağılımı</p>
                    {(data.leave_type_breakdown || []).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Onaylanan izin kaydı yok</div>
                    ) : (
                        <div className="space-y-3">
                            {data.leave_type_breakdown.map((lt, i) => {
                                const maxDays = Math.max(...data.leave_type_breakdown.map(x => x.days), 1);
                                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-sky-500', 'bg-violet-500'];
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-28 sm:w-36 text-sm font-medium text-slate-700 truncate" title={lt.name}>{lt.name}</div>
                                        <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                                            <div
                                                className={`h-full ${colors[i % colors.length]} rounded-lg transition-all duration-700 flex items-center justify-end pr-2`}
                                                style={{ width: `${Math.max((lt.days / maxDays) * 100, 8)}%` }}
                                            >
                                                <span className="text-[11px] font-bold text-white">{lt.days} gün</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 w-12 text-right">{lt.count} kez</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Status Distribution + Recent */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Briefcase size={18} className="text-purple-500" /> Durum Dağılımı
                    </h4>
                    <p className="text-xs text-slate-400 mb-5">Tüm taleplerin durumlarına göre dağılımı</p>
                    {/* Donut-like visual */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                {(() => {
                                    const total = data.total_requests || 1;
                                    const approved = data.status_distribution?.find(s => s.status === 'Onaylanan')?.count || 0;
                                    const rejected = data.status_distribution?.find(s => s.status === 'Reddedilen')?.count || 0;
                                    const pending = data.status_distribution?.find(s => s.status === 'Bekleyen')?.count || 0;
                                    const approvedPct = (approved / total) * 100;
                                    const rejectedPct = (rejected / total) * 100;
                                    const pendingPct = (pending / total) * 100;
                                    return (
                                        <>
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                                                strokeDasharray={`${approvedPct} ${100 - approvedPct}`} strokeDashoffset="0" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3"
                                                strokeDasharray={`${pendingPct} ${100 - pendingPct}`} strokeDashoffset={`${-approvedPct}`} />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3"
                                                strokeDasharray={`${rejectedPct} ${100 - rejectedPct}`} strokeDashoffset={`${-(approvedPct + pendingPct)}`} />
                                        </>
                                    );
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-slate-800">{data.total_requests}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Toplam</span>
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
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Clock size={18} className="text-purple-500" /> Son Aktiviteler
                </h4>
                <p className="text-xs text-slate-400 mb-4">En son oluşturulan talepler</p>
                {(data.recent_requests || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Henüz talep kaydı yok</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {data.recent_requests.map((req, i) => (
                            <div key={i} className="flex items-center gap-4 py-3 hover:bg-slate-50/50 rounded-xl transition-colors px-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm
                                    ${req.type === 'LEAVE' ? 'bg-blue-500' : req.type === 'OVERTIME' ? 'bg-amber-500' : req.type === 'CARDLESS_ENTRY' ? 'bg-purple-500' : 'bg-emerald-500'}
                                `}>
                                    {req.type === 'LEAVE' ? <FileText size={16} /> : req.type === 'OVERTIME' ? <Clock size={16} /> : req.type === 'CARDLESS_ENTRY' ? <CreditCard size={16} /> : <Utensils size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-700 truncate">{req.type_label}</p>
                                    <p className="text-xs text-slate-400 truncate">{req.summary}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1
                                        ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                                    `}>
                                        {req.status === 'APPROVED' ? <CheckCircle2 size={10} /> : req.status === 'REJECTED' ? <XCircle size={10} /> : <Clock size={10} />}
                                        {statusLabels[req.status] || req.status}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(req.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
            let payload = {};
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
                payload = { action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
                payload = { action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/approve/`;
                payload = { acting_as_substitute_for: req.principal_id };
            }
            if (!url) return;

            await api.post(url, payload);
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
            let payload = {};
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
                payload = { action: 'reject', reason, acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
                payload = { action: 'reject', reason, acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/reject/`;
                payload = { reason, acting_as_substitute_for: req.principal_id };
            }
            if (!url) return;

            await api.post(url, payload);
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
