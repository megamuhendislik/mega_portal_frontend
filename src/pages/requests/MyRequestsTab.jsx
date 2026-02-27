import React, { useState, useMemo } from 'react';
import {
    Search, Calendar, Clock, Utensils, CreditCard, Plus,
    CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import RequestListTable from '../../components/RequestListTable';

const FilterChip = ({ active, onClick, label, icon, count, color = 'blue' }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-200 outline-none ${
            active
                ? `bg-${color}-50 text-${color}-700 ring-1 ring-${color}-200 shadow-sm`
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
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

const StatCard = ({ label, value, icon, color }) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
                <div className={color.replace('bg-', 'text-').replace('/10', '')}>{icon}</div>
            </div>
        </div>
    </div>
);

const MyRequestsTab = ({
    requests, overtimeRequests, mealRequests, cardlessEntryRequests, requestTypes,
    loading, handleDeleteRequest, handleEditOvertimeClick,
    handleResubmitOvertime, handleViewDetails, setShowCreateModal, currentUserInfo
}) => {
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showPotential, setShowPotential] = useState(false);

    const allMyRequests = useMemo(() => {
        const items = [];
        const myInfo = { employee_name: currentUserInfo?.name || '', employee_department: currentUserInfo?.department || '' };
        requests.forEach(r => items.push({
            ...r, ...myInfo, _type: 'LEAVE', type: 'LEAVE',
            _sortDate: r.start_date || r.created_at,
            leave_type_name: requestTypes.find(t => t.id === r.request_type)?.name,
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        overtimeRequests.forEach(r => items.push({
            ...r, ...myInfo, _type: 'OVERTIME', type: 'OVERTIME',
            _sortDate: r.date || r.created_at,
            onResubmit: () => handleResubmitOvertime(r),
            target_approver_name: r.target_approver_name || null,
        }));
        mealRequests.forEach(r => items.push({ ...r, ...myInfo, _type: 'MEAL', type: 'MEAL', _sortDate: r.date || r.created_at }));
        cardlessEntryRequests.forEach(r => items.push({
            ...r, ...myInfo, _type: 'CARDLESS_ENTRY', type: 'CARDLESS_ENTRY',
            _sortDate: r.date || r.created_at,
            target_approver_name: r.target_approver_name || null,
        }));
        items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
        return items;
    }, [requests, overtimeRequests, mealRequests, cardlessEntryRequests, requestTypes, currentUserInfo]);

    const filtered = useMemo(() => {
        return allMyRequests.filter(r => {
            if (typeFilter !== 'ALL' && r._type !== typeFilter) return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELLED': 'REJECTED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (!showPotential && r.status === 'POTENTIAL') return false;
            return true;
        });
    }, [allMyRequests, typeFilter, statusFilter, showPotential]);

    const counts = useMemo(() => {
        const actual = allMyRequests.filter(r => r.status !== 'POTENTIAL');
        return {
            all: actual.length,
            leave: actual.filter(r => r._type === 'LEAVE').length,
            overtime: actual.filter(r => r._type === 'OVERTIME').length,
            meal: actual.filter(r => r._type === 'MEAL').length,
            cardless: actual.filter(r => r._type === 'CARDLESS_ENTRY').length,
            pending: actual.filter(r => r.status === 'PENDING').length,
            approved: actual.filter(r => ['APPROVED', 'ORDERED'].includes(r.status)).length,
            rejected: actual.filter(r => ['REJECTED', 'CANCELLED'].includes(r.status)).length,
        };
    }, [allMyRequests]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="İzin" value={counts.leave} icon={<Calendar size={20} />} color="bg-blue-500" />
                <StatCard label="Fazla Mesai" value={counts.overtime} icon={<Clock size={20} />} color="bg-amber-500" />
                <StatCard label="Yemek" value={counts.meal} icon={<Utensils size={20} />} color="bg-emerald-500" />
                <StatCard label="Kartsız Giriş" value={counts.cardless} icon={<CreditCard size={20} />} color="bg-purple-500" />
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} label="Tümü" count={counts.all} color="slate" />
                    <FilterChip active={typeFilter === 'LEAVE'} onClick={() => setTypeFilter('LEAVE')} label="İzin" icon={<Calendar size={14} />} count={counts.leave} color="blue" />
                    <FilterChip active={typeFilter === 'OVERTIME'} onClick={() => setTypeFilter('OVERTIME')} label="Mesai" icon={<Clock size={14} />} count={counts.overtime} color="amber" />
                    <FilterChip active={typeFilter === 'MEAL'} onClick={() => setTypeFilter('MEAL')} label="Yemek" icon={<Utensils size={14} />} count={counts.meal} color="emerald" />
                    <FilterChip active={typeFilter === 'CARDLESS_ENTRY'} onClick={() => setTypeFilter('CARDLESS_ENTRY')} label="Kartsız" icon={<CreditCard size={14} />} count={counts.cardless} color="purple" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Tümü" color="slate" />
                    <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Bekleyen" count={counts.pending} color="amber" />
                    <FilterChip active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} label="Onaylı" count={counts.approved} color="emerald" />
                    <FilterChip active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} label="Red" count={counts.rejected} color="red" />
                    <div className="h-8 w-px bg-slate-200 mx-1 self-center hidden sm:block" />
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input type="checkbox" checked={showPotential} onChange={(e) => setShowPotential(e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        Potansiyel
                    </label>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                        <Search size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Talep Bulunamadı</h3>
                    <p className="text-slate-500 max-w-sm mt-2 text-sm">Seçili kriterlere uygun talep yok.</p>
                    <button onClick={() => setShowCreateModal(true)} className="mt-8 px-6 py-3 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2">
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
                    />
                </div>
            )}
        </div>
    );
};

export default MyRequestsTab;
